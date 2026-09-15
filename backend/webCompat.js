'use strict';

/*
 * ================================================================
 * WEB COMPAT LAYER
 * ================================================================
 *
 * PURPOSE
 *
 * backend/services/ipcHandlers.js is a near-verbatim copy of the
 * original Electron CORE/ipcHandlers.js. That file's ONLY
 * Electron dependency was:
 *
 *     const { ipcMain, dialog } = require('electron');
 *     ipcMain.handle(channel, handlerFn)
 *
 * `dialog` calls were replaced at their 4 call sites (native file/
 * folder pickers have no web equivalent — see the "WEB MIGRATION"
 * comments in ipcHandlers.js).
 *
 * `ipcMain.handle(channel, fn)` just needs somewhere to register
 * handlers so an HTTP route can look them up and call them later.
 * That's all this file does: a plain in-memory Map standing in
 * for Electron's IPC registry.
 * ================================================================
 */

const handlers = new Map();

const ipcMain = {

    handle(channel, fn) {

        if (handlers.has(channel)) {
            console.warn(
                `[webCompat] Handler for "${channel}" is being overwritten.`
            );
        }

        handlers.set(channel, fn);
    }
};

/*
 * Invoke a registered handler the same way Electron's
 * ipcRenderer.invoke(channel, arg) would have triggered it:
 * the handler receives a fake "event" object (unused by any
 * handler in this codebase) followed by the single argument.
 */
async function invoke(channel, arg) {

    const handler = handlers.get(channel);

    if (!handler) {
        const error = new Error(`No IPC handler registered for channel "${channel}"`);
        error.code = 'UNKNOWN_CHANNEL';
        throw error;
    }

    const fakeEvent = { sender: null };

    return handler(fakeEvent, arg);
}

function hasHandler(channel) {
    return handlers.has(channel);
}

function listChannels() {
    return [...handlers.keys()];
}

module.exports = {
    ipcMain,
    invoke,
    hasHandler,
    listChannels
};
