# Installation into the current Year 3 Study OS

1. Copy the `AI` folder from this package into the project root.
2. Keep the existing `CORE/`, `UI/`, `MODULES/`, `DATA/`, and `package.json` unchanged for now.
3. The current Electron `CORE/main.js` uses CommonJS and this AI subsystem is also CommonJS, so it is compatible with the current foundation.
4. Set `OPENROUTER_API_KEY` in the Windows environment before testing.
5. Do not add the API key to source files.
6. The next integration step is wiring `CORE/preload.js` and `CORE/ipcHandlers.js` to `AIManager`; this package intentionally keeps that integration separate so the existing working window is not disturbed.
