'use strict';

/*
 * ================================================================
 * YEAR 3 STUDY OS — WEB API CLIENT
 * ================================================================
 *
 * Replaces CORE/preload.js. Every module in /MODULES calls
 * window.year3.* and window.api.* exactly as it did in the
 * Electron app — this file rebuilds that same surface on top of
 * fetch() instead of ipcRenderer, so MODULE CODE ITSELF DID NOT
 * NEED TO CHANGE.
 *
 * Only 4 methods needed real behavioural changes, because their
 * Electron implementations opened native OS file dialogs, which
 * do not exist in a browser:
 *
 *   - masterModule.pickHtmlFile()
 *   - masterModule.pickFolder()
 *   - pharmacologyDocuments.importPdf()
 *   - api.exportContent()   (native save dialog -> browser download)
 *
 * Everything else is a 1:1 mechanical translation of
 * ipcRenderer.invoke(channel, arg) -> POST /api/invoke.
 * ================================================================
 */

(function () {

    // ------------------------------------------------------------
    // GENERIC INVOKE (mirrors ipcRenderer.invoke)
    // ------------------------------------------------------------

    async function invoke(channel, arg) {

        const response = await fetch('/api/invoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel, arg })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || `Request to "${channel}" failed.`);
        }

        return data.result;
    }

    // ------------------------------------------------------------
    // BROWSER FILE PICKER HELPERS
    // ------------------------------------------------------------

    function pickFile({ accept, directory = false, multiple = false } = {}) {

        return new Promise((resolve) => {

            const input = document.createElement('input');
            input.type = 'file';

            if (accept) input.accept = accept;
            if (directory) input.webkitdirectory = true;
            if (multiple) input.multiple = true;

            input.style.display = 'none';

            input.addEventListener('change', () => {
                resolve(input.files ? Array.from(input.files) : []);
                input.remove();
            });

            // If the user cancels, no 'change' event fires. Resolve
            // with an empty list on window focus-return as a
            // best-effort cancel signal.
            const onFocus = () => {
                window.removeEventListener('focus', onFocus);
                setTimeout(() => {
                    if (document.body.contains(input)) {
                        resolve([]);
                        input.remove();
                    }
                }, 300);
            };
            window.addEventListener('focus', onFocus);

            document.body.appendChild(input);
            input.click();
        });
    }

    async function uploadFile(url, fieldName, file) {

        const formData = new FormData();
        formData.append(fieldName, file);

        const response = await fetch(url, { method: 'POST', body: formData });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || 'Upload failed.');
        }

        return data;
    }

    async function uploadFolder(files) {

        const formData = new FormData();

        for (const file of files) {
            // webkitRelativePath preserves the folder structure
            // (e.g. "MyModule/css/style.css").
            formData.append('files', file, file.webkitRelativePath || file.name);
        }

        const response = await fetch('/api/upload/folder', { method: 'POST', body: formData });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || 'Folder upload failed.');
        }

        return data;
    }

    // ==============================================================
    // window.year3
    // ==============================================================

    window.year3 = {

        state: {
            get: () => invoke('state:get'),
            save: (state) => invoke('state:save', state)
        },

        settings: {
            get: () => invoke('settings:get'),
            save: (settings) => invoke('settings:save', settings)
        },

        modules: {
            get: (moduleId) => invoke('modules:get', moduleId),
            list: () => invoke('modules:list')
        },

        masterModule: {

            async pickHtmlFile() {
                const [file] = await pickFile({ accept: '.html,.htm' });
                if (!file) return { success: false, canceled: true };
                return uploadFile('/api/upload/html-file', 'file', file);
            },

            async pickFolder() {
                const files = await pickFile({ directory: true, multiple: true });
                if (!files.length) return { success: false, canceled: true };
                return uploadFolder(files);
            }
        },

        ai: {
            ask: (params) => invoke('ai:ask', params),
            status: () => invoke('ai:status'),
            models: () => invoke('ai:models'),
            getActiveModel: () => invoke('ai:getActiveModel'),
            getActiveModelId: () => invoke('ai:getActiveModelId'),
            setModel: (modelId) => invoke('ai:setModel', modelId),
            resetModel: () => invoke('ai:resetModel'),
            getMode: () => invoke('ai:getMode'),
            setMode: (mode) => invoke('ai:setMode', mode),
            resetMode: () => invoke('ai:resetMode'),
            getSelectionState: () => invoke('ai:getSelectionState'),
            modelInfo: (modelId) => invoke('ai:modelInfo', modelId),
            allModelInfo: () => invoke('ai:allModelInfo'),
            primaryModels: () => invoke('ai:primaryModels'),
            fallbackModels: () => invoke('ai:fallbackModels'),
            automaticModels: () => invoke('ai:automaticModels'),
            freeModels: () => invoke('ai:freeModels'),
            paidModels: () => invoke('ai:paidModels'),
            routers: () => invoke('ai:routers'),
            routerInfo: (routerId) => invoke('ai:routerInfo', routerId),
            availableModels: () => invoke('ai:availableModels'),
            availablePrimaryModels: () => invoke('ai:availablePrimaryModels'),
            availableFallbackModels: () => invoke('ai:availableFallbackModels'),
            validateModel: (modelId) => invoke('ai:validateModel', modelId),
            clearMemory: (sessionId) => invoke('ai:clearMemory', sessionId)
        },

        pharmacologyDocuments: {

            async importPdf() {
                const [file] = await pickFile({ accept: 'application/pdf' });
                if (!file) return { success: false, canceled: true };
                return uploadFile('/api/upload/pharmacology-pdf', 'file', file);
            },

            list: () => invoke('pharmacology-documents:list'),
            get: (documentId) => invoke('pharmacology-documents:get', documentId)
        },

        pharmacologyPdf: {
            getWorkerSource: () => invoke('pharmacology-pdf:get-worker-source')
        }
    };

    // ==============================================================
    // window.api  (used by Lecture Studio)
    // ==============================================================

    window.api = {

        async exportContent(payload) {

            const response = await fetch('/api/export/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                return {
                    success: false,
                    canceled: false,
                    error: data.error || 'Export failed.'
                };
            }

            // The server streams the .pptx file directly. Trigger a
            // normal browser download from the blob (this replaces
            // the native "Save As" dialog Electron used to show).
            const blob = await response.blob();

            const disposition = response.headers.get('Content-Disposition') || '';
            const match = /filename="?([^"]+)"?/.exec(disposition);
            const fileName = match ? match[1] : 'Year 3 PASS Presentation.pptx';

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);

            return {
                success: true,
                canceled: false,
                path: fileName,
                filePath: fileName,
                outputPath: fileName
            };
        }
    };

})();
