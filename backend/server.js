'use strict';

/*
 * ================================================================
 * YEAR 3 PASS — WEB SERVER
 * ================================================================
 *
 * Replaces CORE/main.js. Where main.js created a BrowserWindow
 * and registered IPC handlers, this file starts an HTTP server,
 * serves the (unmodified) UI/ and MODULES/ folders as static
 * assets, and exposes the same handlers over a small HTTP API.
 * ================================================================
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const express = require('express');
const multer = require('multer');

require('dotenv').config({
    path: path.join(__dirname, '..', '.env')
});

const webCompat = require('./webCompat');
const { registerIPCHandlers } = require('./services/ipcHandlers');

const PROJECT_ROOT = path.join(__dirname, '..');
const UI_ROOT = path.join(PROJECT_ROOT, 'UI');
const MODULES_ROOT = path.join(PROJECT_ROOT, 'MODULES');

const PORT = process.env.PORT || 3000;

// ================================================================
// REGISTER ALL HANDLERS (equivalent of main.js calling
// registerIPCHandlers() before creating the window)
// ================================================================

registerIPCHandlers();

console.log(
    `[SERVER] ${webCompat.listChannels().length} handlers registered:`,
    webCompat.listChannels().join(', ')
);

// ================================================================
// APP
// ================================================================

const app = express();

app.use(express.json({ limit: '25mb' }));

// ----------------------------------------------------------------
// CONTENT SECURITY POLICY
// ----------------------------------------------------------------
// The original app.js/index.html already ships a CSP <meta> tag
// (default-src 'self'; frame-src 'self' blob: — needed so locally
// generated PDF blob URLs render inside the PDF viewer iframe).
// That meta tag is preserved unchanged in UI/index.html, so no
// server-side CSP header is required to reproduce main.js's
// behaviour here.
// ----------------------------------------------------------------

// ================================================================
// STATIC FRONTEND
// ================================================================
// UI/ and MODULES/ sit at the project root exactly as they did
// next to CORE/ in the Electron app. app.js loads module code via
// relative paths like "../MODULES/<id>/module.js" resolved against
// the currently-loaded document. Serving UI/ at /UI and MODULES/
// at /MODULES (siblings, exactly like on disk) means those
// relative paths keep working completely unmodified.
// ================================================================

app.use('/UI', express.static(UI_ROOT));
app.use('/MODULES', express.static(MODULES_ROOT));

app.get('/', (req, res) => {
    res.redirect('/UI/index.html');
});

// ================================================================
// GENERIC IPC-EQUIVALENT ENDPOINT
// ================================================================
// Every simple (non-file-picker, non-export) channel is invoked
// through this single endpoint. The frontend's api-client.js
// mirrors preload.js's method names exactly and posts here
// instead of calling ipcRenderer.invoke().
// ================================================================

app.post('/api/invoke', async (req, res) => {

    const { channel, arg } = req.body || {};

    if (!channel) {
        return res.status(400).json({ error: 'Missing "channel".' });
    }

    try {
        const result = await webCompat.invoke(channel, arg);
        res.json({ result });

    } catch (error) {
        console.error(`[API] ${channel} failed:`, error);
        res.status(
            error.code === 'UNKNOWN_CHANNEL' ? 404 : 500
        ).json({
            error: error.message || 'Request failed.'
        });
    }
});

// ================================================================
// FILE UPLOAD ENDPOINTS
// ================================================================
// These replace the 4 dialog.showOpenDialog / showSaveDialog call
// sites. Uploaded files are written to a per-request temp
// directory, then the SAME ipcHandlers.js handler that Electron
// used is invoked with the resulting path — so the business logic
// for reading/validating the file is completely unchanged.
// ================================================================

const TMP_ROOT = path.join(os.tmpdir(), 'year3-pass-uploads');
fs.mkdirSync(TMP_ROOT, { recursive: true });

function freshTmpDir() {
    const dir = path.join(TMP_ROOT, `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

// ---- single HTML file ------------------------------------------------

const htmlUpload = multer({ dest: TMP_ROOT });

app.post('/api/upload/html-file', htmlUpload.single('file'), async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    try {
        const result = await webCompat.invoke(
            'master-module:pick-html-file',
            req.file.path
        );
        res.json(result);

    } catch (error) {
        console.error('[UPLOAD] html-file failed:', error);
        res.status(500).json({ success: false, error: error.message });

    } finally {
        fs.unlink(req.file.path, () => {});
    }
});

// ---- pharmacology PDF --------------------------------------------------

const pdfUpload = multer({ dest: TMP_ROOT });

app.post('/api/upload/pharmacology-pdf', pdfUpload.single('file'), async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    try {
        const result = await webCompat.invoke(
            'pharmacology-documents:import-pdf',
            req.file.path
        );
        res.json(result);

    } catch (error) {
        console.error('[UPLOAD] pharmacology-pdf failed:', error);
        res.status(500).json({ success: false, error: error.message });

    } finally {
        fs.unlink(req.file.path, () => {});
    }
});

// ---- whole folder (Master Module import) --------------------------------
// The browser sends every file from a webkitdirectory <input>,
// each one appended with its relative path as the filename
// (e.g. formData.append('files', file, file.webkitRelativePath)).
// We reconstruct that folder structure inside a temp directory,
// then hand the temp directory to the unmodified
// 'master-module:pick-folder' handler.

const folderUpload = multer({
    storage: multer.diskStorage({
        destination(req, file, cb) {
            if (!req._year3TmpDir) {
                req._year3TmpDir = freshTmpDir();
            }
            const relativeDir = path.dirname(file.originalname);
            const fullDir = path.join(
                req._year3TmpDir,
                relativeDir === '.' ? '' : relativeDir
            );
            fs.mkdirSync(fullDir, { recursive: true });
            cb(null, fullDir);
        },
        filename(req, file, cb) {
            cb(null, path.basename(file.originalname));
        }
    })
});

app.post('/api/upload/folder', folderUpload.array('files', 500), async (req, res) => {

    const tmpDir = req._year3TmpDir;

    if (!tmpDir) {
        return res.status(400).json({ success: false, error: 'No files uploaded.' });
    }

    try {
        const result = await webCompat.invoke('master-module:pick-folder', tmpDir);
        res.json(result);

    } catch (error) {
        console.error('[UPLOAD] folder failed:', error);
        res.status(500).json({ success: false, error: error.message });

    } finally {
        fs.rm(tmpDir, { recursive: true, force: true }, () => {});
    }
});

// ================================================================
// EXPORT (Lecture Studio -> PPTX)
// ================================================================
// Replaces dialog.showSaveDialog: the handler now writes the
// .pptx into the OS temp directory (see the "WEB MIGRATION"
// comment in ipcHandlers.js) and this route streams that file
// back to the browser as a download, then deletes it.
// ================================================================

app.post('/api/export/content', async (req, res) => {

    try {
        const result = await webCompat.invoke('export:content', req.body);

        if (!result || result.success === false) {
            return res.status(400).json(result || { success: false });
        }

        const filePath = result.outputPath || result.path || result.filePath;

        res.download(filePath, path.basename(filePath), (err) => {
            fs.unlink(filePath, () => {});
            if (err) {
                console.error('[EXPORT] Download failed:', err);
            }
        });

    } catch (error) {
        console.error('[EXPORT] Failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ================================================================
// FALLBACK
// ================================================================

app.use((req, res) => {
    res.status(404).json({ error: 'Not found.' });
});

app.listen(PORT, () => {
    console.log(`[SERVER] Year 3 PASS web server running on port ${PORT}`);
    console.log(`[SERVER] Open http://localhost:${PORT}/`);
});
