'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const PptxGenJS = require('pptxgenjs');

/*
 * ================================================================
 * WEB MIGRATION NOTE
 * ================================================================
 * The original Electron file required 'electron' for ipcMain and
 * dialog. Web-Compat replaces ipcMain with a plain handler
 * registry (see backend/webCompat.js) so every handler body below
 * is UNCHANGED from the Electron source. dialog.showOpenDialog /
 * dialog.showSaveDialog calls (native OS pickers, which have no
 * web equivalent) have been replaced with browser-upload /
 * server-generated-temp-file equivalents at the 4 specific call
 * sites below — search for "WEB MIGRATION" to find them.
 * ================================================================
 */

const {
    ipcMain
} = require('../webCompat');

const AIManager =
    require('../../AI/aiManager');

const ModuleManager =
    require('./moduleManager');

const pharmacologyDocumentService =
    require('./pharmacologyDocumentService');


let aiManager = null;


// ================================================================
// PATHS
// ================================================================

const DATA_ROOT =
    path.join(
        __dirname,
        '..',
        '..',
        'DATA'
    );

const SYSTEM_DATA =
    path.join(
        DATA_ROOT,
        'system'
    );

const MODULE_DATA =
    path.join(
        DATA_ROOT,
        'modules'
    );


// ================================================================
// STORAGE HELPERS
// ================================================================

function ensureDirectory(directory) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(
            directory,
            {
                recursive: true
            }
        );
    }
}


function ensureStorage() {
    ensureDirectory(
        DATA_ROOT
    );

    ensureDirectory(
        SYSTEM_DATA
    );

    ensureDirectory(
        MODULE_DATA
    );
}


function readJson(
    filePath,
    fallback = {}
) {
    try {
        if (!fs.existsSync(filePath)) {
            return fallback;
        }

        const raw =
            fs.readFileSync(
                filePath,
                'utf8'
            );

        return JSON.parse(
            raw
        );

    } catch (error) {

        console.error(
            `[CORE] Could not read JSON file: ${filePath}`,
            error
        );

        return fallback;
    }
}


function writeJson(
    filePath,
    data
) {
    ensureDirectory(
        path.dirname(
            filePath
        )
    );

    fs.writeFileSync(
        filePath,
        JSON.stringify(
            data,
            null,
            2
        ),
        'utf8'
    );
}


// ================================================================
// AI MANAGER
// ================================================================

function initializeAI() {

    if (!aiManager) {

        aiManager =
            new AIManager();

        console.log(
            '[AI] AI Manager initialized'
        );
    }

    return aiManager;
}


// ================================================================
// MASTER MODULE FILE IMPORT HELPERS
// ================================================================

/*
 * Text files can safely be transferred through IPC as UTF-8.
 * Binary files such as PNG/JPG/WEBP/fonts are transferred as
 * Base64 so the renderer can reconstruct them later.
 */

const MASTER_TEXT_EXTENSIONS = new Set([
    '.html',
    '.htm',
    '.css',
    '.js',
    '.mjs',
    '.cjs',
    '.json',
    '.txt',
    '.md',
    '.xml',
    '.svg',
    '.map',
    '.webmanifest'
]);


function isMasterTextFile(filePath) {

    return MASTER_TEXT_EXTENSIONS.has(
        path.extname(
            filePath
        ).toLowerCase()
    );
}


function getMimeType(filePath) {

    const extension =
        path.extname(
            filePath
        ).toLowerCase();

    const mimeTypes = {

        '.html':
            'text/html',

        '.htm':
            'text/html',

        '.css':
            'text/css',

        '.js':
            'text/javascript',

        '.mjs':
            'text/javascript',

        '.cjs':
            'text/javascript',

        '.json':
            'application/json',

        '.txt':
            'text/plain',

        '.md':
            'text/markdown',

        '.xml':
            'application/xml',

        '.svg':
            'image/svg+xml',

        '.png':
            'image/png',

        '.jpg':
            'image/jpeg',

        '.jpeg':
            'image/jpeg',

        '.gif':
            'image/gif',

        '.webp':
            'image/webp',

        '.ico':
            'image/x-icon',

        '.bmp':
            'image/bmp',

        '.avif':
            'image/avif',

        '.woff':
            'font/woff',

        '.woff2':
            'font/woff2',

        '.ttf':
            'font/ttf',

        '.otf':
            'font/otf',

        '.eot':
            'application/vnd.ms-fontobject',

        '.mp3':
            'audio/mpeg',

        '.wav':
            'audio/wav',

        '.ogg':
            'audio/ogg',

        '.mp4':
            'video/mp4',

        '.webm':
            'video/webm'
    };

    return (
        mimeTypes[extension] ||
        'application/octet-stream'
    );
}


/*
 * Convert one file into a renderer-safe serializable object.
 *
 * Text:
 * {
 *   path,
 *   type: "text",
 *   mime,
 *   encoding: "utf8",
 *   data: "..."
 * }
 *
 * Binary:
 * {
 *   path,
 *   type: "binary",
 *   mime,
 *   encoding: "base64",
 *   data: "..."
 * }
 */

function serializeMasterFile(
    absolutePath,
    relativePath
) {

    const normalizedRelativePath =
        relativePath
            .split(path.sep)
            .join('/');

    const mime =
        getMimeType(
            absolutePath
        );

    if (
        isMasterTextFile(
            absolutePath
        )
    ) {

        return {

            path:
                normalizedRelativePath,

            type:
                'text',

            mime,

            encoding:
                'utf8',

            data:
                fs.readFileSync(
                    absolutePath,
                    'utf8'
                )
        };
    }

    return {

        path:
            normalizedRelativePath,

        type:
            'binary',

        mime,

        encoding:
            'base64',

        data:
            fs.readFileSync(
                absolutePath
            ).toString(
                'base64'
            )
    };
}


/*
 * Recursively collect all files belonging to an imported
 * mini-website.
 *
 * Directories such as node_modules and .git are intentionally
 * ignored because they should never be necessary for a small
 * educational HTML module and could make an import enormous.
 */

function collectMasterModuleFiles(
    rootDirectory
) {

    const files = [];

    const ignoredDirectories =
        new Set([
            'node_modules',
            '.git',
            '.github',
            '.vscode',
            '.idea',
            'dist',
            'build',
            'coverage'
        ]);


    function walk(
        currentDirectory
    ) {

        const entries =
            fs.readdirSync(
                currentDirectory,
                {
                    withFileTypes: true
                }
            );


        for (const entry of entries) {

            const absolutePath =
                path.join(
                    currentDirectory,
                    entry.name
                );


            if (
                entry.isDirectory()
            ) {

                if (
                    ignoredDirectories.has(
                        entry.name
                    )
                ) {
                    continue;
                }

                walk(
                    absolutePath
                );

                continue;
            }


            if (
                !entry.isFile()
            ) {
                continue;
            }


            const relativePath =
                path.relative(
                    rootDirectory,
                    absolutePath
                );


            files.push(
                serializeMasterFile(
                    absolutePath,
                    relativePath
                )
            );
        }
    }


    walk(
        rootDirectory
    );

    return files;
}


// ================================================================
// REGISTER IPC
// ================================================================

function registerIPCHandlers() {

    ensureStorage();
        console.log('[CORE] registerIPCHandlers() STARTED');

    pharmacologyDocumentService.initialize(
        DATA_ROOT
    );


    // ============================================================
    // STATE
    // ============================================================

    ipcMain.handle(
        'state:get',
        async () => {

            const file =
                path.join(
                    SYSTEM_DATA,
                    'appState.json'
                );

            return readJson(
                file,
                {
                    lastModule:
                        'dashboard'
                }
            );
        }
    );


    ipcMain.handle(
        'state:save',
        async (
            event,
            state
        ) => {

            const file =
                path.join(
                    SYSTEM_DATA,
                    'appState.json'
                );

            writeJson(
                file,
                state || {}
            );

            return {
                success: true
            };
        }
    );


    // ============================================================
    // SETTINGS
    // ============================================================

    ipcMain.handle(
        'settings:get',
        async () => {

            const file =
                path.join(
                    SYSTEM_DATA,
                    'settings.json'
                );

            return readJson(
                file,
                {
                    sidebarCollapsed:
                        false
                }
            );
        }
    );


    ipcMain.handle(
        'settings:save',
        async (
            event,
            settings
        ) => {

            const file =
                path.join(
                    SYSTEM_DATA,
                    'settings.json'
                );

            writeJson(
                file,
                settings || {}
            );

            return {
                success: true
            };
        }
    );


    // ============================================================
    // MODULES
    // ============================================================

    ipcMain.handle(
        'modules:get',
        async (
            event,
            moduleId
        ) => {

            try {

                return ModuleManager.get(
                    moduleId
                );

            } catch (error) {

                console.error(
                    `[MODULES] Could not load module: ${moduleId}`,
                    error
                );

                throw error;
            }
        }
    );


    ipcMain.handle(
        'modules:list',
        async () => {

            try {

                return ModuleManager.list();

            } catch (error) {

                console.error(
                    '[MODULES] Could not list modules:',
                    error
                );

                throw error;
            }
        }
    );


    // ============================================================
    // MASTER MODULE — IMPORT SINGLE HTML
    // ============================================================

    /*
     * Opens the native Electron file picker.
     *
     * This is used by:
     *
     * window.year3.masterModule.pickHtmlFile()
     *
     * in preload.js.
     */

    ipcMain.handle(
        'master-module:pick-html-file',
        /*
         * WEB MIGRATION: the native "openFile" dialog is replaced
         * by a browser <input type="file"> upload. The frontend
         * uploads the chosen file to POST /api/upload/html-file,
         * which saves it to a temp path and invokes this same
         * handler with that temp path as `filePath`, so everything
         * below this point is the original, unmodified logic.
         */
        async (event, filePath) => {

            try {

                if (!filePath) {

                    return {
                        success:
                            false,

                        canceled:
                            true
                    };
                }


                const html =
                    fs.readFileSync(
                        filePath,
                        'utf8'
                    );


                return {

                    success:
                        true,

                    canceled:
                        false,

                    fileName:
                        path.basename(
                            filePath
                        ),

                    html,

                    files: [
                        {
                            path:
                                path.basename(
                                    filePath
                                ),

                            type:
                                'text',

                            mime:
                                'text/html',

                            encoding:
                                'utf8',

                            data:
                                html
                        }
                    ],

                    entry:
                        path.basename(
                            filePath
                        )
                };


            } catch (error) {

                console.error(
                    '[MASTER MODULE] HTML import failed:',
                    error
                );

                return {

                    success:
                        false,

                    canceled:
                        false,

                    error:
                        error?.message ||
                        'Failed to import HTML file.'
                };
            }
        }
    );


    // ============================================================
    // MASTER MODULE — IMPORT FULL FOLDER / MINI WEBSITE
    // ============================================================

    /*
     * Opens a native directory picker and recursively imports
     * the entire mini-website.
     *
     * Example:
     *
     * MyModule/
     *   index.html
     *   css/
     *      style.css
     *   js/
     *      app.js
     *   images/
     *      diagram.png
     *
     * Everything is returned to the Master Module.
     */

    ipcMain.handle(
        'master-module:pick-folder',
        /*
         * WEB MIGRATION: the native "openDirectory" dialog is
         * replaced by a browser folder upload (<input type="file"
         * webkitdirectory>) via POST /api/upload/folder. The route
         * reconstructs the folder on a temp directory on disk
         * (preserving relative paths) and invokes this same
         * handler with that temp directory as `folderPath`, so
         * collectMasterModuleFiles() below runs unmodified.
         */
        async (event, folderPath) => {

            try {

                if (!folderPath) {

                    return {

                        success:
                            false,

                        canceled:
                            true
                    };
                }


                console.log(
                    '[MASTER MODULE] Importing folder:',
                    folderPath
                );


                const files =
                    collectMasterModuleFiles(
                        folderPath
                    );


                if (
                    !files.length
                ) {

                    return {

                        success:
                            false,

                        canceled:
                            false,

                        error:
                            'The selected folder contains no readable files.'
                    };
                }


                /*
                 * Prefer index.html at the root.
                 */

                let entry =
                    files.find(
                        file =>
                            file.path.toLowerCase() ===
                            'index.html'
                    );


                /*
                 * Also accept index.htm.
                 */

                if (!entry) {

                    entry =
                        files.find(
                            file =>
                                file.path.toLowerCase() ===
                                'index.htm'
                        );
                }


                /*
                 * If the root does not contain an index file,
                 * allow one inside a subdirectory.
                 */

                if (!entry) {

                    entry =
                        files.find(
                            file =>
                                /(^|\/)index\.html?$/i
                                    .test(
                                        file.path
                                    )
                        );
                }


                if (!entry) {

                    return {

                        success:
                            false,

                        canceled:
                            false,

                        error:
                            'No index.html or index.htm file was found in the selected module folder.'
                    };
                }


                console.log(
                    '[MASTER MODULE] Folder imported:',
                    files.length,
                    'files'
                );


                return {

                    success:
                        true,

                    canceled:
                        false,

                    folderName:
                        path.basename(
                            folderPath
                        ),

                    files,

                    entry:
                        entry.path
                };


            } catch (error) {

                console.error(
                    '[MASTER MODULE] Folder import failed:',
                    error
                );

                return {

                    success:
                        false,

                    canceled:
                        false,

                    error:
                        error?.message ||
                        'Failed to import module folder.'
                };
            }
        }
    );


    // ============================================================
    // AI CHAT
    // ============================================================

    ipcMain.handle(
        'ai:ask',
        async (
            event,
            params
        ) => {

            try {

                const manager =
                    initializeAI();

                return await manager.chat(
                    params
                );

            } catch (error) {

                console.error(
                    '[AI] Chat failed:',
                    error
                );

                throw error;
            }
        }
    );


    // ============================================================
    // AI STATUS
    // ============================================================

    ipcMain.handle(
        'ai:status',
        async () => {

            const manager =
                initializeAI();

            return manager.status();
        }
    );


    // ============================================================
    // AI MODELS — ALL
    // ============================================================

    ipcMain.handle(
        'ai:models',
        async () => {

            const manager =
                initializeAI();

            return manager.listModels();
        }
    );


    // ============================================================
    // AI MODEL CONTROL
    // ============================================================

    ipcMain.handle(
        'ai:getActiveModel',
        async () => {

            const manager =
                initializeAI();

            return manager.getActiveModel();
        }
    );


    ipcMain.handle(
        'ai:getActiveModelId',
        async () => {

            const manager =
                initializeAI();

            return manager.getActiveModelId();
        }
    );


    ipcMain.handle(
        'ai:setModel',
        async (
            event,
            modelId
        ) => {

            const manager =
                initializeAI();

            return manager.setModel(
                modelId
            );
        }
    );


    ipcMain.handle(
        'ai:resetModel',
        async () => {

            const manager =
                initializeAI();

            return manager.resetModel();
        }
    );


    // ============================================================
    // AI MODE CONTROL
    // ============================================================

    ipcMain.handle(
        'ai:getMode',
        async () => {

            const manager =
                initializeAI();

            return manager.getModelMode();
        }
    );


    ipcMain.handle(
        'ai:setMode',
        async (
            event,
            mode
        ) => {

            const manager =
                initializeAI();

            return manager.setModelMode(
                mode
            );
        }
    );


    ipcMain.handle(
        'ai:resetMode',
        async () => {

            const manager =
                initializeAI();

            return manager.resetModelMode();
        }
    );


    // ============================================================
    // COMPLETE MODEL SELECTION STATE
    // ============================================================

    ipcMain.handle(
        'ai:getSelectionState',
        async () => {

            const manager =
                initializeAI();

            return manager.getModelSelectionState();
        }
    );


    // ============================================================
    // MODEL INFORMATION
    // ============================================================

    ipcMain.handle(
        'ai:modelInfo',
        async (
            event,
            modelId
        ) => {

            const manager =
                initializeAI();

            return manager.getModelInfo(
                modelId
            );
        }
    );


    ipcMain.handle(
        'ai:allModelInfo',
        async () => {

            const manager =
                initializeAI();

            return manager.getAllModelInfo();
        }
    );


    // ============================================================
    // MODEL CATEGORIES
    // ============================================================

    ipcMain.handle(
        'ai:primaryModels',
        async () => {

            const manager =
                initializeAI();

            return manager.listPrimaryModels();
        }
    );


    ipcMain.handle(
        'ai:fallbackModels',
        async () => {

            const manager =
                initializeAI();

            return manager.listFallbackModels();
        }
    );


    ipcMain.handle(
        'ai:automaticModels',
        async () => {

            const manager =
                initializeAI();

            return manager.listAutomaticModels();
        }
    );


    ipcMain.handle(
        'ai:freeModels',
        async () => {

            const manager =
                initializeAI();

            return manager.listFreeModels();
        }
    );


    ipcMain.handle(
        'ai:paidModels',
        async () => {

            const manager =
                initializeAI();

            return manager.listPaidModels();
        }
    );


    // ============================================================
    // ROUTERS
    // ============================================================

    ipcMain.handle(
        'ai:routers',
        async () => {

            const manager =
                initializeAI();

            return manager.listRouters();
        }
    );


    ipcMain.handle(
        'ai:routerInfo',
        async (
            event,
            routerId
        ) => {

            const manager =
                initializeAI();

            return manager.getRouter(
                routerId
            );
        }
    );


    // ============================================================
    // AVAILABLE MODELS
    // ============================================================

    ipcMain.handle(
        'ai:availableModels',
        async () => {

            const manager =
                initializeAI();

            return manager.listAvailableModels();
        }
    );


    ipcMain.handle(
        'ai:availablePrimaryModels',
        async () => {

            const manager =
                initializeAI();

            return manager.listAvailablePrimaryModels();
        }
    );


    ipcMain.handle(
        'ai:availableFallbackModels',
        async () => {

            const manager =
                initializeAI();

            return manager.listAvailableFallbackModels();
        }
    );


    // ============================================================
    // MODEL VALIDATION
    // ============================================================

    ipcMain.handle(
        'ai:validateModel',
        async (
            event,
            modelId
        ) => {

            const manager =
                initializeAI();

            return manager.validateModel(
                modelId
            );
        }
    );


    // ============================================================
    // AI MEMORY
    // ============================================================

    ipcMain.handle(
        'ai:clearMemory',
        async (
            event,
            sessionId
        ) => {

            const manager =
                initializeAI();

            manager.clearMemory(
                sessionId ||
                'default'
            );

            return {
                success:
                    true
            };
        }
    );


    // ============================================================
    // PHARMACOLOGY DOCUMENTS — IMPORT
    // ============================================================

    ipcMain.handle(
        'pharmacology-documents:import-pdf',
        /*
         * WEB MIGRATION: the native "openFile" dialog is replaced
         * by a browser <input type="file" accept="application/pdf">
         * upload via POST /api/upload/pharmacology-pdf. The route
         * saves the upload to a temp path and invokes this same
         * handler with that temp path as `filePath`, so
         * pharmacologyDocumentService.importPdf() below is called
         * exactly as it was in the Electron version.
         */
        async (event, filePath) => {

            try {

                if (!filePath) {

                    return {

                        success:
                            false,

                        canceled:
                            true
                    };
                }


                return await pharmacologyDocumentService
                    .importPdf(
                        filePath
                    );


            } catch (error) {

                console.error(
                    '[PHARMACOLOGY DOCUMENTS] Import failed:',
                    error
                );

                return {

                    success:
                        false,

                    error:
                        error?.message ||
                        'Failed to import PDF.'
                };
            }
        }
    );


    // ============================================================
    // PHARMACOLOGY DOCUMENTS — LIST
    // ============================================================

    ipcMain.handle(
        'pharmacology-documents:list',
        async () => {

            try {

                const documents =
                    pharmacologyDocumentService
                        .listDocuments();

                return {

                    success:
                        true,

                    documents
                };

            } catch (error) {

                console.error(
                    '[PHARMACOLOGY DOCUMENTS] List failed:',
                    error
                );

                return {

                    success:
                        false,

                    documents:
                        [],

                    error:
                        error?.message ||
                        'Failed to load documents.'
                };
            }
        }
    );


    // ============================================================
    // PHARMACOLOGY DOCUMENTS — GET
    // ============================================================

    ipcMain.handle(
        'pharmacology-documents:get',
        async (
            event,
            documentId
        ) => {

            try {

                const document =
                    pharmacologyDocumentService
                        .getDocument(
                            documentId
                        );

                return {

                    success:
                        Boolean(
                            document
                        ),

                    document
                };

            } catch (error) {

                console.error(
                    '[PHARMACOLOGY DOCUMENTS] Get failed:',
                    error
                );

                return {

                    success:
                        false,

                    document:
                        null,

                    error:
                        error?.message ||
                        'Failed to load document.'
                };
            }
        }
    );


    // ============================================================
    // PHARMACOLOGY PDF.JS WORKER
    // ============================================================

    ipcMain.handle(
        'pharmacology-pdf:get-worker-source',
        async () => {

            try {

                const workerPath =
                    path.join(
                        __dirname,
                        '..',
                        'node_modules',
                        'pdfjs-dist',
                        'build',
                        'pdf.worker.mjs'
                    );


                console.log(
                    '[PHARMACOLOGY PDF] Reading PDF.js worker:',
                    workerPath
                );


                if (
                    !fs.existsSync(
                        workerPath
                    )
                ) {

                    throw new Error(
                        `PDF.js worker not found: ${workerPath}`
                    );
                }


                const workerSource =
                    fs.readFileSync(
                        workerPath,
                        'utf8'
                    );


                if (
                    !workerSource ||
                    !workerSource.trim()
                ) {

                    throw new Error(
                        'PDF.js worker source is empty.'
                    );
                }


                console.log(
                    '[PHARMACOLOGY PDF] Worker source loaded:',
                    workerSource.length,
                    'characters'
                );


                return {

                    success:
                        true,

                    source:
                        workerSource
                };


            } catch (error) {

                console.error(
                    '[PHARMACOLOGY PDF] Failed to load worker source:',
                    error
                );


                return {

                    success:
                        false,

                    source:
                        null,

                    error:
                        error?.message ||
                        'Failed to load PDF.js worker.'
                };
            }
        }
    );


    // ============================================================
    // POWERPOINT EXPORT
    // ============================================================

    ipcMain.handle(
        'export:content',
        async (
            event,
            payload = {}
        ) => {

            if (
                payload.type !==
                    'presentation' ||
                payload.format !==
                    'pptx'
            ) {

                throw new Error(
                    'Unsupported export request. Expected presentation/pptx.'
                );
            }


            const slides =
                Array.isArray(
                    payload.slides
                )
                    ? payload.slides
                    : [];


            if (
                !slides.length
            ) {

                throw new Error(
                    'Cannot export a presentation with no slides.'
                );
            }


            const title =
                String(
                    payload.title ||
                    'Year 3 PASS Presentation'
                )
                    .trim();


            const subject =
                String(
                    payload.subject ||
                    'Medical Education'
                )
                    .trim();


            const safeFilename =
                title
                    .replace(
                        /[<>:"/\\|?*\x00-\x1F]/g,
                        ''
                    )
                    .replace(
                        /\s+/g,
                        ' '
                    )
                    .trim()
                    .slice(
                        0,
                        150
                    ) ||
                'Year 3 PASS Presentation';


            /*
             * WEB MIGRATION: the native "save file" dialog has no
             * browser equivalent, so instead of asking the OS
             * where to save, we generate the .pptx into the
             * server's temp directory. The Express route for
             * POST /api/export/content then streams this file
             * back to the browser as a download (Content-
             * Disposition: attachment) and deletes the temp file
             * afterwards. Everything from here down — the actual
             * PptxGenJS slide-building logic — is unchanged from
             * the Electron source.
             */

            let outputPath =
                path.join(
                    os.tmpdir(),
                    `year3-export-${Date.now()}-${safeFilename}.pptx`
                );


            if (
                !outputPath
                    .toLowerCase()
                    .endsWith(
                        '.pptx'
                    )
            ) {

                outputPath +=
                    '.pptx';
            }


            console.log(
                '[PPTX EXPORT] Creating presentation:',
                outputPath
            );


            const pptx =
                new PptxGenJS();


            // 16:9 widescreen
            pptx.layout =
                'LAYOUT_WIDE';

            pptx.author =
                'Year 3 PASS';

            pptx.company =
                'Year 3 PASS';

            pptx.subject =
                subject;

            pptx.title =
                title;

            pptx.lang =
                'en-US';


            pptx.theme = {

                headFontFace:
                    'Aptos Display',

                bodyFontFace:
                    'Aptos',

                lang:
                    'en-US'
            };


            const SW =
                13.333;

            const SH =
                7.5;


            const COLORS = {

                navy:
                    '17365D',

                blue:
                    '2563EB',

                lightBlue:
                    'EAF2FF',

                text:
                    '172033',

                muted:
                    '64748B',

                white:
                    'FFFFFF',

                border:
                    'D7DEE8',

                panel:
                    'F8FAFC',

                green:
                    '16845B',

                greenLight:
                    'EAF7F1',

                orange:
                    'C56A13',

                orangeLight:
                    'FFF4E5',

                red:
                    'B42318',

                redLight:
                    'FEF0EF'
            };


            function cleanText(value) {

                if (
                    value === null ||
                    value === undefined
                ) {

                    return '';
                }

                return String(value)
                    .replace(
                        /\r\n/g,
                        '\n'
                    )
                    .replace(
                        /\r/g,
                        '\n'
                    )
                    .trim();
            }


            function asArray(value) {

                if (
                    Array.isArray(value)
                ) {

                    return value
                        .map(
                            cleanText
                        )
                        .filter(
                            Boolean
                        );
                }


                if (
                    value === null ||
                    value === undefined
                ) {

                    return [];
                }


                const text =
                    cleanText(
                        value
                    );


                if (!text) {
                    return [];
                }


                return text
                    .split(
                        /\n+/
                    )
                    .map(
                        cleanText
                    )
                    .filter(
                        Boolean
                    );
            }


            function addHeader(
                slide,
                slideData,
                slideNumber
            ) {

                slide.addText(

                    cleanText(
                        slideData.title
                    ) ||
                    `Slide ${slideNumber}`,

                    {

                        x:
                            0.65,

                        y:
                            0.42,

                        w:
                            11.9,

                        h:
                            0.55,

                        fontFace:
                            'Aptos Display',

                        fontSize:
                            25,

                        bold:
                            true,

                        color:
                            COLORS.navy,

                        margin:
                            0,

                        fit:
                            'shrink'
                    }
                );


                const subtitle =
                    cleanText(
                        slideData.subtitle
                    );


                if (subtitle) {

                    slide.addText(

                        subtitle,

                        {

                            x:
                                0.68,

                            y:
                                1.03,

                            w:
                                11.7,

                            h:
                                0.42,

                            fontSize:
                                11.5,

                            color:
                                COLORS.muted,

                            margin:
                                0,

                            fit:
                                'shrink'
                        }
                    );
                }


                slide.addShape(

                    pptx.ShapeType.line,

                    {

                        x:
                            0.65,

                        y:
                            1.48,

                        w:
                            12.0,

                        h:
                            0,

                        line: {

                            color:
                                COLORS.border,

                            pt:
                                1
                        }
                    }
                );
            }


            function addFooter(
                slide,
                slideNumber,
                totalSlides
            ) {

                slide.addText(

                    'Year 3 PASS • Lecture Studio',

                    {

                        x:
                            0.65,

                        y:
                            7.08,

                        w:
                            5.0,

                        h:
                            0.2,

                        fontSize:
                            8,

                        color:
                            COLORS.muted,

                        margin:
                            0
                    }
                );


                slide.addText(

                    `${slideNumber} / ${totalSlides}`,

                    {

                        x:
                            11.8,

                        y:
                            7.08,

                        w:
                            0.85,

                        h:
                            0.2,

                        fontSize:
                            8,

                        color:
                            COLORS.muted,

                        align:
                            'right',

                        margin:
                            0
                    }
                );
            }


            function addBullets(
                slide,
                bullets,
                x,
                y,
                w,
                h
            ) {

                const items =
                    asArray(
                        bullets
                    );


                if (
                    !items.length
                ) {

                    return;
                }


                const runs =
                    [];


                items.forEach(
                    (
                        item,
                        index
                    ) => {

                        runs.push({

                            text:
                                item,

                            options: {

                                bullet: {

                                    indent:
                                        16
                                },

                                hanging:
                                    4,

                                breakLine:
                                    index <
                                    items.length -
                                        1
                            }
                        });
                    }
                );


                slide.addText(

                    runs,

                    {

                        x,

                        y,

                        w,

                        h,

                        fontFace:
                            'Aptos',

                        fontSize:
                            18,

                        color:
                            COLORS.text,

                        breakLine:
                            false,

                        margin:
                            0.05,

                        paraSpaceAfterPt:
                            10,

                        valign:
                            'top',

                        fit:
                            'shrink'
                    }
                );
            }


            function addSteps(
                slide,
                steps,
                x,
                y,
                w
            ) {

                const items =
                    asArray(
                        steps
                    );


                if (
                    !items.length
                ) {

                    return;
                }


                const rowHeight =
                    Math.min(
                        0.72,
                        5.0 /
                            items.length
                    );


                items.forEach(
                    (
                        step,
                        index
                    ) => {

                        const yy =
                            y +
                            index *
                                rowHeight;


                        slide.addShape(

                            pptx.ShapeType.ellipse,

                            {

                                x,

                                y:
                                    yy +
                                    0.03,

                                w:
                                    0.42,

                                h:
                                    0.42,

                                fill: {

                                    color:
                                        COLORS.blue
                                },

                                line: {

                                    color:
                                        COLORS.blue
                                }
                            }
                        );


                        slide.addText(

                            String(
                                index + 1
                            ),

                            {

                                x,

                                y:
                                    yy +
                                    0.09,

                                w:
                                    0.42,

                                h:
                                    0.22,

                                fontSize:
                                    10,

                                bold:
                                    true,

                                color:
                                    COLORS.white,

                                align:
                                    'center',

                                margin:
                                    0
                            }
                        );


                        slide.addText(

                            step,

                            {

                                x:
                                    x +
                                    0.62,

                                y:
                                    yy,

                                w:
                                    w -
                                    0.62,

                                h:
                                    rowHeight -
                                    0.04,

                                fontSize:
                                    16,

                                color:
                                    COLORS.text,

                                margin:
                                    0,

                                valign:
                                    'mid',

                                fit:
                                    'shrink'
                            }
                        );
                    }
                );
            }


            function addTable(
                slide,
                tableData
            ) {

                if (
                    !Array.isArray(
                        tableData
                    ) ||
                    !tableData.length
                ) {

                    return false;
                }


                const rows =
                    tableData
                        .map(
                            row => {

                                if (
                                    Array.isArray(
                                        row
                                    )
                                ) {

                                    return row.map(
                                        cleanText
                                    );
                                }


                                if (
                                    row &&
                                    typeof row ===
                                        'object'
                                ) {

                                    return Object
                                        .values(
                                            row
                                        )
                                        .map(
                                            cleanText
                                        );
                                }


                                return [
                                    cleanText(
                                        row
                                    )
                                ];
                            }
                        )
                        .filter(
                            row =>
                                row.length
                        );


                if (
                    !rows.length
                ) {

                    return false;
                }


                const columnCount =
                    Math.max(
                        ...rows.map(
                            row =>
                                row.length
                        )
                    );


                const normalizedRows =
                    rows.map(
                        row => {

                            const copy =
                                [...row];

                            while (
                                copy.length <
                                columnCount
                            ) {

                                copy.push('');
                            }

                            return copy;
                        }
                    );


                slide.addTable(

                    normalizedRows,

                    {

                        x:
                            0.65,

                        y:
                            1.72,

                        w:
                            12.0,

                        h:
                            4.75,

                        fontFace:
                            'Aptos',

                        fontSize:
                            12,

                        color:
                            COLORS.text,

                        border: {

                            type:
                                'solid',

                            pt:
                                1,

                            color:
                                COLORS.border
                        },

                        fill:
                            COLORS.white,

                        margin:
                            0.08,

                        valign:
                            'mid',

                        autoFit:
                            false,

                        rowH:
                            0.55,

                        bold:
                            false,

                        breakLine:
                            false
                    }
                );


                return true;
            }


            function addCallout(
                slide,
                callout
            ) {

                const text =
                    cleanText(
                        callout
                    );


                if (!text) {
                    return;
                }


                let fill =
                    COLORS.lightBlue;

                let accent =
                    COLORS.blue;


                const lower =
                    text.toLowerCase();


                if (
                    lower.includes(
                        'warning'
                    ) ||
                    lower.includes(
                        'caution'
                    )
                ) {

                    fill =
                        COLORS.orangeLight;

                    accent =
                        COLORS.orange;
                }


                if (
                    lower.includes(
                        'important'
                    ) ||
                    lower.includes(
                        'key point'
                    ) ||
                    lower.includes(
                        'high yield'
                    )
                ) {

                    fill =
                        COLORS.greenLight;

                    accent =
                        COLORS.green;
                }


                slide.addShape(

                    pptx.ShapeType.roundRect,

                    {

                        x:
                            0.72,

                        y:
                            5.72,

                        w:
                            11.85,

                        h:
                            0.78,

                        rectRadius:
                            0.06,

                        fill: {

                            color:
                                fill
                        },

                        line: {

                            color:
                                accent,

                            pt:
                                1.2
                        }
                    }
                );


                slide.addShape(

                    pptx.ShapeType.rect,

                    {

                        x:
                            0.72,

                        y:
                            5.72,

                        w:
                            0.08,

                        h:
                            0.78,

                        fill: {

                            color:
                                accent
                        },

                        line: {

                            color:
                                accent,

                            transparency:
                                100
                        }
                    }
                );


                slide.addText(

                    text,

                    {

                        x:
                            1.0,

                        y:
                            5.88,

                        w:
                            11.15,

                        h:
                            0.42,

                        fontSize:
                            12.5,

                        bold:
                            true,

                        color:
                            COLORS.text,

                        margin:
                            0,

                        fit:
                            'shrink',

                        valign:
                            'mid'
                    }
                );
            }


            function addTitleSlide(
                slide,
                slideData
            ) {

                slide.background = {

                    color:
                        COLORS.panel
                };


                slide.addShape(

                    pptx.ShapeType.rect,

                    {

                        x:
                            0,

                        y:
                            0,

                        w:
                            SW,

                        h:
                            0.16,

                        fill: {

                            color:
                                COLORS.blue
                        },

                        line: {

                            color:
                                COLORS.blue,

                            transparency:
                                100
                        }
                    }
                );


                slide.addText(

                    title,

                    {

                        x:
                            0.9,

                        y:
                            1.55,

                        w:
                            11.5,

                        h:
                            1.15,

                        fontFace:
                            'Aptos Display',

                        fontSize:
                            34,

                        bold:
                            true,

                        color:
                            COLORS.navy,

                        align:
                            'center',

                        valign:
                            'mid',

                        margin:
                            0,

                        fit:
                            'shrink'
                    }
                );


                const subtitle =
                    cleanText(
                        slideData.subtitle
                    ) ||
                    subject;


                slide.addText(

                    subtitle,

                    {

                        x:
                            1.25,

                        y:
                            2.9,

                        w:
                            10.8,

                        h:
                            0.65,

                        fontSize:
                            19,

                        color:
                            COLORS.muted,

                        align:
                            'center',

                        margin:
                            0,

                        fit:
                            'shrink'
                    }
                );


                const bullets =
                    asArray(
                        slideData.bullets
                    );


                if (
                    bullets.length
                ) {

                    slide.addText(

                        bullets
                            .slice(
                                0,
                                5
                            )
                            .map(
                                item =>
                                    `• ${item}`
                            )
                            .join(
                                '\n'
                            ),

                        {

                            x:
                                2.0,

                            y:
                                4.0,

                            w:
                                9.3,

                            h:
                                1.5,

                            fontSize:
                                15,

                            color:
                                COLORS.text,

                            align:
                                'center',

                            breakLine:
                                false,

                            margin:
                                0.05,

                            fit:
                                'shrink'
                        }
                    );
                }


                slide.addText(

                    'Year 3 PASS • Lecture Studio',

                    {

                        x:
                            0.8,

                        y:
                            6.8,

                        w:
                            11.7,

                        h:
                            0.25,

                        fontSize:
                            9,

                        color:
                            COLORS.muted,

                        align:
                            'center',

                        margin:
                            0
                    }
                );
            }


            slides.forEach(
                (
                    slideData,
                    index
                ) => {

                    const slide =
                        pptx.addSlide();


                    const slideNumber =
                        index + 1;


                    const type =
                        cleanText(
                            slideData?.type
                        )
                            .toLowerCase();


                    if (
                        index === 0 &&
                        (
                            type ===
                                'title' ||
                            type ===
                                'cover'
                        )
                    ) {

                        addTitleSlide(
                            slide,
                            slideData
                        );

                        return;
                    }


                    slide.background = {

                        color:
                            COLORS.white
                    };


                    addHeader(
                        slide,
                        slideData || {},
                        slideNumber
                    );


                    const bullets =
                        asArray(
                            slideData?.bullets
                        );


                    const steps =
                        asArray(
                            slideData?.steps
                        );


                    const table =
                        slideData?.table;


                    const callout =
                        slideData?.callout;


                    if (
                        Array.isArray(
                            table
                        ) &&
                        table.length
                    ) {

                        addTable(
                            slide,
                            table
                        );

                    } else if (
                        steps.length
                    ) {

                        addSteps(
                            slide,
                            steps,
                            0.8,
                            1.78,
                            11.7
                        );


                        if (
                            bullets.length
                        ) {

                            addBullets(
                                slide,
                                bullets,
                                0.8,
                                5.05,
                                11.7,
                                0.6
                            );
                        }

                    } else if (
                        bullets.length
                    ) {

                        addBullets(
                            slide,
                            bullets,
                            0.82,
                            1.82,
                            11.65,
                            3.65
                        );
                    }


                    if (callout) {

                        addCallout(
                            slide,
                            callout
                        );
                    }


                    addFooter(
                        slide,
                        slideNumber,
                        slides.length
                    );


                    const notes =
                        cleanText(
                            slideData
                                ?.speakerNotes
                        );


                    if (
                        notes &&
                        typeof slide.addNotes ===
                            'function'
                    ) {

                        slide.addNotes(
                            notes
                        );
                    }
                }
            );


            await pptx.writeFile({

                fileName:
                    outputPath
            });


            if (
                !fs.existsSync(
                    outputPath
                )
            ) {

                throw new Error(
                    'PowerPoint generation completed, but the .pptx file was not found.'
                );
            }


            console.log(
                '[PPTX EXPORT] Successfully created:',
                outputPath
            );


            return {

                success:
                    true,

                canceled:
                    false,

                path:
                    outputPath,

                filePath:
                    outputPath,

                outputPath
            };
        }
    );


    // ============================================================
    // IPC READY
    // ============================================================

    console.log(
        '[CORE] IPC handlers registered'
    );
}


// ================================================================
// EXPORTS
// ================================================================

module.exports = {

    registerIPCHandlers,

    initializeAI
};