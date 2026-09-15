/* ============================================================
   YEAR 3 STUDY OS
   PHARMACOLOGY PDF VIEWER
   PDF.js 6.3.289
   Electron + file://
   MAIN-THREAD / FAKE-WORKER ARCHITECTURE
   ============================================================ */

console.log(
    "[PDF VIEWER] pdfViewer.js HAS LOADED"
);

(() => {

    "use strict";

    /* ============================================================
   PDF.JS 6.x COMPATIBILITY SHIMS
   Electron / Chromium compatibility
   ============================================================ */

(function installPdfJsCompatibilityShims() {

    "use strict";

    /*
     * PDF.js 6.x uses Uint8Array.prototype.toHex().
     *
     * Some Chromium/V8 versions used by Electron do not
     * provide it natively.
     *
     * PDF.js calls this while calculating the PDF fingerprint.
     */

    if (
        typeof Uint8Array.prototype.toHex !==
        "function"
    ) {

        Object.defineProperty(
            Uint8Array.prototype,
            "toHex",
            {
                configurable: true,
                enumerable: false,
                writable: true,

                value: function toHex() {

                    let result = "";

                    for (
                        let i = 0;
                        i < this.length;
                        i++
                    ) {

                        result +=
                            this[i]
                                .toString(16)
                                .padStart(
                                    2,
                                    "0"
                                );

                    }

                    return result;

                }
            }
        );


        console.log(
            "[PDF VIEWER] Installed Uint8Array.prototype.toHex compatibility shim."
        );

    } else {

        console.log(
            "[PDF VIEWER] Native Uint8Array.prototype.toHex is available."
        );

    }

})();

/* ============================================================
   MAP.getOrInsertComputed COMPATIBILITY SHIM
   ============================================================ */

(function installMapCompatibilityShim() {

    "use strict";

    if (
        typeof Map.prototype.getOrInsertComputed !==
        "function"
    ) {

        Object.defineProperty(
            Map.prototype,
            "getOrInsertComputed",
            {
                configurable: true,
                enumerable: false,
                writable: true,

                value: function getOrInsertComputed(
                    key,
                    callback
                ) {

                    if (
                        typeof callback !==
                        "function"
                    ) {

                        throw new TypeError(
                            "callback must be a function"
                        );

                    }


                    if (
                        this.has(key)
                    ) {

                        return this.get(key);

                    }


                    const value =
                        callback(key);


                    this.set(
                        key,
                        value
                    );


                    return value;

                }

            }
        );


        console.log(
            "[PDF VIEWER] Installed Map.prototype.getOrInsertComputed compatibility shim."
        );

    } else {

        console.log(
            "[PDF VIEWER] Native Map.prototype.getOrInsertComputed is available."
        );

    }

})();

    /* =========================================================
       CONFIGURATION
       ========================================================= */

    const PDFJS_PATH =
        "../../node_modules/pdfjs-dist/build/pdf.mjs";

    const PDFJS_WORKER_PATH =
        "../../node_modules/pdfjs-dist/build/pdf.worker.mjs";

    const MIN_SCALE =
        0.5;

    const MAX_SCALE =
        3.0;

    const DEFAULT_SCALE =
        1.0;


    /* =========================================================
       STATE
       ========================================================= */

    let pdfjsLib = null;

    let pdfjsWorkerModule = null;

    let pdfDocument = null;

    let currentDocument = null;

    let currentPage = 1;

    let totalPages = 0;

    let currentScale =
        DEFAULT_SCALE;

    let viewerOverlay = null;

    let pagesContainer = null;

    let pageIndicator = null;

    let zoomIndicator = null;

    let loadingIndicator = null;

    let initialized = false;

    let pdfJsLoadingPromise = null;

    let renderingToken = 0;

    let keyboardBound = false;


    /* =========================================================
       BASIC UTILITIES
       ========================================================= */

    function escapeHTML(value) {

        return String(
            value ?? ""
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );

    }


    function base64ToUint8Array(base64) {

        if (
            typeof base64 !== "string" ||
            !base64.length
        ) {

            throw new Error(
                "PDF data is empty."
            );

        }


        try {

            const binaryString =
                atob(base64);

            const length =
                binaryString.length;

            const bytes =
                new Uint8Array(
                    length
                );


            for (
                let i = 0;
                i < length;
                i++
            ) {

                bytes[i] =
                    binaryString.charCodeAt(
                        i
                    );

            }


            return bytes;

        } catch (error) {

            throw new Error(
                `Invalid Base64 PDF data: ${
                    error?.message ||
                    String(error)
                }`
            );

        }

    }


    /* =========================================================
       PDF.JS FAKE WORKER INITIALIZATION
       ========================================================= */

    async function initializePdfJs() {

        if (pdfjsLib) {

            return pdfjsLib;

        }


        if (pdfJsLoadingPromise) {

            return pdfJsLoadingPromise;

        }


        pdfJsLoadingPromise =
            (async () => {

                console.log(
                    "[PHARMACOLOGY PDF VIEWER] Loading PDF.js..."
                );

                


                /*
                 * -------------------------------------------------
                 * LOAD PDF.JS DISPLAY LAYER
                 * -------------------------------------------------
                 */

                const lib =
                    await import(
                        PDFJS_PATH
                    );


                pdfjsLib =
                    lib;


                console.log(
                    "[PHARMACOLOGY PDF VIEWER] PDF.js loaded:",
                    pdfjsLib.version
                );


                /*
                 * -------------------------------------------------
                 * VERIFY VERSION
                 * -------------------------------------------------
                 */

                if (
                    pdfjsLib.version !==
                    "6.3.289"
                ) {

                    console.warn(
                        "[PHARMACOLOGY PDF VIEWER] Expected PDF.js 6.3.289 but loaded:",
                        pdfjsLib.version
                    );

                }


                /*
                 * -------------------------------------------------
                 * LOAD PDF.JS WORKER MODULE INTO MAIN THREAD
                 * -------------------------------------------------
                 *
                 * IMPORTANT:
                 *
                 * We are NOT creating:
                 *
                 *     new Worker(...)
                 *
                 * We are NOT creating:
                 *
                 *     Blob(...)
                 *
                 * We are NOT setting:
                 *
                 *     GlobalWorkerOptions.workerPort
                 *
                 *
                 * Instead PDF.js 6.x supports a main-thread
                 * WorkerMessageHandler.
                 *
                 * PDFWorker internally detects:
                 *
                 *     globalThis.pdfjsWorker.WorkerMessageHandler
                 *
                 * and creates its own LoopbackPort.
                 *
                 * This is PDF.js's native fake-worker architecture.
                 */

                console.log(
                    "[PHARMACOLOGY PDF VIEWER] Loading PDF.js worker module for fake-worker mode..."
                );


                pdfjsWorkerModule =
                    await import(
                        PDFJS_WORKER_PATH
                    );


                if (
                    !pdfjsWorkerModule
                ) {

                    throw new Error(
                        "PDF.js worker module could not be imported."
                    );

                }


                if (
                    typeof
                        pdfjsWorkerModule.WorkerMessageHandler !==
                    "function"
                ) {

                    throw new Error(
                        "PDF.js WorkerMessageHandler was not found."
                    );

                }


                console.log(
                    "[PHARMACOLOGY PDF VIEWER] WorkerMessageHandler loaded successfully."
                );


                /*
                 * -------------------------------------------------
                 * REGISTER WORKER HANDLER
                 * -------------------------------------------------
                 *
                 * PDF.js's PDFWorker implementation checks:
                 *
                 * globalThis.pdfjsWorker?.WorkerMessageHandler
                 *
                 * before attempting to create a real Web Worker.
                 */

                globalThis.pdfjsWorker =
                    pdfjsWorkerModule;


                /*
                 * -------------------------------------------------
                 * CRITICAL:
                 *
                 * DO NOT GIVE PDF.JS A workerPort.
                 *
                 * A workerPort belongs to an actual Worker or
                 * compatible MessagePort.
                 *
                 * Supplying our own Worker was the source of the
                 * previous CSP/file:// problems.
                 */

                pdfjsLib
                    .GlobalWorkerOptions
                    .workerPort =
                    null;


                /*
                 * workerSrc is retained as a fallback only.
                 *
                 * Because globalThis.pdfjsWorker is already
                 * populated, PDF.js should use that handler for
                 * fake-worker mode.
                 */

                pdfjsLib
                    .GlobalWorkerOptions
                    .workerSrc =
                    PDFJS_WORKER_PATH;


                console.log(
                    "[PHARMACOLOGY PDF VIEWER] PDF.js fake-worker configured."
                );


                console.log(
                    "[PHARMACOLOGY PDF VIEWER] Main-thread WorkerMessageHandler:",
                    Boolean(
                        globalThis
                            .pdfjsWorker
                            ?.WorkerMessageHandler
                    )
                );


                return pdfjsLib;

            })();


        try {

            return await pdfJsLoadingPromise;

        } catch (error) {

            pdfJsLoadingPromise =
                null;

            pdfjsLib =
                null;

            pdfjsWorkerModule =
                null;

            try {

                if (
                    globalThis.pdfjsWorker
                ) {

                    delete globalThis.pdfjsWorker;

                }

            } catch (_) {
                /* ignore cleanup failure */
            }


            throw error;

        }

    }


    /* =========================================================
       STYLES
       ========================================================= */

    function ensureStyles() {

        if (
            document.getElementById(
                "pharmacology-pdf-viewer-styles"
            )
        ) {

            return;

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "pharmacology-pdf-viewer-styles";


        style.textContent = `

            .pharmacology-pdf-overlay {

                position: fixed;

                inset: 0;

                z-index: 999999;

                display: flex;

                flex-direction: column;

                background: #f3f4f6;

                color: #111827;

                font-family:
                    Inter,
                    -apple-system,
                    BlinkMacSystemFont,
                    "Segoe UI",
                    sans-serif;

            }


            .pharmacology-pdf-toolbar {

                flex:
                    0 0 auto;

                height: 58px;

                display: flex;

                align-items: center;

                gap: 8px;

                padding:
                    0 14px;

                background:
                    #ffffff;

                border-bottom:
                    1px solid #d1d5db;

            }


            .pharmacology-pdf-title {

                flex: 1;

                min-width: 0;

                font-size: 14px;

                font-weight: 600;

                overflow: hidden;

                text-overflow: ellipsis;

                white-space: nowrap;

                padding:
                    0 12px;

            }


            .pharmacology-pdf-button {

                width: 34px;

                height: 34px;

                display: inline-flex;

                align-items: center;

                justify-content: center;

                border:
                    1px solid #d1d5db;

                background:
                    #ffffff;

                color:
                    #111827;

                border-radius:
                    6px;

                cursor:
                    pointer;

                font-size:
                    16px;

                line-height:
                    1;

                transition:
                    background 120ms ease,
                    border-color 120ms ease;

            }


            .pharmacology-pdf-button:hover {

                background:
                    #f3f4f6;

                border-color:
                    #9ca3af;

            }


            .pharmacology-pdf-button:disabled {

                opacity:
                    0.45;

                cursor:
                    default;

            }


            .pharmacology-pdf-page-info {

                min-width:
                    90px;

                text-align:
                    center;

                font-size:
                    13px;

                color:
                    #4b5563;

            }


            .pharmacology-pdf-zoom {

                min-width:
                    65px;

                text-align:
                    center;

                font-size:
                    13px;

                color:
                    #4b5563;

            }


            .pharmacology-pdf-scroll {

                flex:
                    1;

                overflow:
                    auto;

                padding:
                    28px;

                background:
                    #e5e7eb;

            }


            .pharmacology-pdf-pages {

                display:
                    flex;

                flex-direction:
                    column;

                align-items:
                    center;

                gap:
                    24px;

                min-height:
                    100%;

            }


            .pharmacology-pdf-page {

                position:
                    relative;

                background:
                    #ffffff;

                box-shadow:
                    0 1px 4px
                    rgba(
                        0,
                        0,
                        0,
                        0.18
                    );

            }


            .pharmacology-pdf-page canvas {

                display:
                    block;

            }


            .pharmacology-pdf-loading {

                position:
                    absolute;

                inset:
                    58px 0 0 0;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                background:
                    rgba(
                        243,
                        244,
                        246,
                        0.94
                    );

                z-index:
                    5;

                font-size:
                    14px;

                color:
                    #374151;

            }


            .pharmacology-pdf-error {

                max-width:
                    700px;

                margin:
                    80px auto;

                padding:
                    24px;

                background:
                    #ffffff;

                border:
                    1px solid #d1d5db;

                border-radius:
                    8px;

                line-height:
                    1.6;

            }


            .pharmacology-pdf-error h3 {

                margin:
                    0 0 10px;

                font-size:
                    17px;

            }


            .pharmacology-pdf-error p {

                margin:
                    6px 0;

                color:
                    #4b5563;

            }

        `;


        document.head.appendChild(
            style
        );

    }


    /* =========================================================
       CREATE VIEWER
       ========================================================= */

    function createViewer() {

        if (
            viewerOverlay
        ) {

            return;

        }


        ensureStyles();


        viewerOverlay =
            document.createElement(
                "div"
            );


        viewerOverlay.className =
            "pharmacology-pdf-overlay";

            viewerOverlay.style.display = "none";


        viewerOverlay.innerHTML = `

            <div
                class="pharmacology-pdf-toolbar"
            >

                <button
                    class="pharmacology-pdf-button"
                    id="pharmacology-pdf-close"
                    title="Close"
                    aria-label="Close"
                >
                    ×
                </button>


                <div
                    class="pharmacology-pdf-title"
                    id="pharmacology-pdf-title"
                >
                    PDF Document
                </div>


                <button
                    class="pharmacology-pdf-button"
                    id="pharmacology-pdf-prev"
                    title="Previous page"
                    aria-label="Previous page"
                >
                    ‹
                </button>


                <div
                    class="pharmacology-pdf-page-info"
                    id="pharmacology-pdf-page-info"
                >
                    0 / 0
                </div>


                <button
                    class="pharmacology-pdf-button"
                    id="pharmacology-pdf-next"
                    title="Next page"
                    aria-label="Next page"
                >
                    ›
                </button>


                <button
                    class="pharmacology-pdf-button"
                    id="pharmacology-pdf-zoom-out"
                    title="Zoom out"
                    aria-label="Zoom out"
                >
                    −
                </button>


                <div
                    class="pharmacology-pdf-zoom"
                    id="pharmacology-pdf-zoom"
                >
                    100%
                </div>


                <button
                    class="pharmacology-pdf-button"
                    id="pharmacology-pdf-zoom-in"
                    title="Zoom in"
                    aria-label="Zoom in"
                >
                    +
                </button>


                <button
                    class="pharmacology-pdf-button"
                    id="pharmacology-pdf-fit"
                    title="Fit width"
                    aria-label="Fit width"
                >
                    ↔
                </button>

            </div>


            <div
                class="pharmacology-pdf-scroll"
                id="pharmacology-pdf-scroll"
            >

                <div
                    class="pharmacology-pdf-pages"
                    id="pharmacology-pdf-pages"
                ></div>

            </div>


            <div
                class="pharmacology-pdf-loading"
                id="pharmacology-pdf-loading"
                style="display:none;"
            >
                Loading PDF...
            </div>

        `;


        document.body.appendChild(
            viewerOverlay
        );


        pagesContainer =
            viewerOverlay.querySelector(
                "#pharmacology-pdf-pages"
            );


        pageIndicator =
            viewerOverlay.querySelector(
                "#pharmacology-pdf-page-info"
            );


        zoomIndicator =
            viewerOverlay.querySelector(
                "#pharmacology-pdf-zoom"
            );


        loadingIndicator =
            viewerOverlay.querySelector(
                "#pharmacology-pdf-loading"
            );


        bindViewerEvents();


        updateUI();

    }


    /* =========================================================
       VIEWER EVENTS
       ========================================================= */

    function bindViewerEvents() {

        if (
            !viewerOverlay
        ) {

            return;

        }


        const closeButton =
            viewerOverlay.querySelector(
                "#pharmacology-pdf-close"
            );


        const previousButton =
            viewerOverlay.querySelector(
                "#pharmacology-pdf-prev"
            );


        const nextButton =
            viewerOverlay.querySelector(
                "#pharmacology-pdf-next"
            );


        const zoomOutButton =
            viewerOverlay.querySelector(
                "#pharmacology-pdf-zoom-out"
            );


        const zoomInButton =
            viewerOverlay.querySelector(
                "#pharmacology-pdf-zoom-in"
            );


        const fitButton =
            viewerOverlay.querySelector(
                "#pharmacology-pdf-fit"
            );


        closeButton?.addEventListener(
            "click",
            close
        );


        previousButton?.addEventListener(
            "click",
            () => {

                goToPage(
                    currentPage - 1
                );

            }
        );


        nextButton?.addEventListener(
            "click",
            () => {

                goToPage(
                    currentPage + 1
                );

            }
        );


        zoomOutButton?.addEventListener(
            "click",
            () => {

                setZoom(
                    currentScale - 0.1
                );

            }
        );


        zoomInButton?.addEventListener(
            "click",
            () => {

                setZoom(
                    currentScale + 0.1
                );

            }
        );


        fitButton?.addEventListener(
            "click",
            fitWidth
        );


        if (
            !keyboardBound
        ) {

            document.addEventListener(
                "keydown",
                handleKeyboard
            );

            keyboardBound =
                true;

        }

    }


    function handleKeyboard(event) {

        if (
            !viewerOverlay
        ) {

            return;

        }


        if (
            viewerOverlay.style.display ===
            "none"
        ) {

            return;

        }


        if (
            event.key ===
            "Escape"
        ) {

            close();

            return;

        }


        if (
            event.key ===
            "ArrowLeft"
        ) {

            goToPage(
                currentPage - 1
            );

            return;

        }


        if (
            event.key ===
            "ArrowRight"
        ) {

            goToPage(
                currentPage + 1
            );

        }

    }


    /* =========================================================
       UI STATE
       ========================================================= */

    function updateUI() {

        if (
            !viewerOverlay
        ) {

            return;

        }


        if (
            pageIndicator
        ) {

            pageIndicator.textContent =
                `${currentPage} / ${totalPages}`;

        }


        if (
            zoomIndicator
        ) {

            zoomIndicator.textContent =
                `${Math.round(
                    currentScale * 100
                )}%`;

        }


        const previousButton =
            viewerOverlay.querySelector(
                "#pharmacology-pdf-prev"
            );


        const nextButton =
            viewerOverlay.querySelector(
                "#pharmacology-pdf-next"
            );


        if (
            previousButton
        ) {

            previousButton.disabled =
                currentPage <= 1;

        }


        if (
            nextButton
        ) {

            nextButton.disabled =
                currentPage >= totalPages;

        }

    }


    /* =========================================================
       OPEN DOCUMENT
       ========================================================= */

    async function open(
        documentData
    ) {

        console.log(
            "[PHARMACOLOGY PDF VIEWER] Open requested:",
            documentData
        );


        if (
            !documentData ||
            !documentData.pdf
        ) {

            throw new Error(
                "Invalid Pharmacology document."
            );

        }


        if (
            documentData.pdf.encoding !==
            "base64"
        ) {

            throw new Error(
                "Unsupported PDF storage format."
            );

        }


        if (
            typeof documentData.pdf.data !==
            "string" ||
            !documentData.pdf.data.length
        ) {

            throw new Error(
                "The document contains no PDF data."
            );

        }


        createViewer();


        viewerOverlay.style.display =
            "flex";


        currentDocument =
            documentData;


        currentPage =
            1;


        totalPages =
            0;


        currentScale =
            DEFAULT_SCALE;


        renderingToken++;


        const title =
            viewerOverlay.querySelector(
                "#pharmacology-pdf-title"
            );


        if (
            title
        ) {

            title.textContent =
                documentData.title ||
                documentData.originalFileName ||
                "PDF Document";

        }


        if (
            pagesContainer
        ) {

            pagesContainer.innerHTML =
                "";

        }


        updateUI();


        showLoading(
            true,
            "Loading PDF..."
        );


        try {

            /*
             * -------------------------------------------------
             * INITIALIZE PDF.JS
             * -------------------------------------------------
             */

            const lib =
                await initializePdfJs();


            /*
             * -------------------------------------------------
             * CONVERT BASE64 TO BINARY
             * -------------------------------------------------
             */

            const bytes =
                base64ToUint8Array(
                    documentData.pdf.data
                );


            console.log(
                "[PHARMACOLOGY PDF VIEWER] PDF bytes:",
                bytes.length
            );


            if (
                bytes.length < 5
            ) {

                throw new Error(
                    "PDF data is unexpectedly small."
                );

            }


            /*
             * -------------------------------------------------
             * PDF HEADER CHECK
             * -------------------------------------------------
             */

            const header =
                String.fromCharCode(
                    bytes[0],
                    bytes[1],
                    bytes[2],
                    bytes[3],
                    bytes[4]
                );


            console.log(
                "[PHARMACOLOGY PDF VIEWER] PDF header:",
                header
            );


            if (
                header !==
                "%PDF-"
            ) {

                throw new Error(
                    "The stored data does not contain a valid PDF header."
                );

            }


            /*
             * -------------------------------------------------
             * LOAD PDF
             * -------------------------------------------------
             *
             * IMPORTANT:
             *
             * No workerPort is supplied.
             *
             * PDF.js detects:
             *
             * globalThis.pdfjsWorker.WorkerMessageHandler
             *
             * and creates its own fake worker.
             *
             * useWasm:false is intentional for this Electron
             * file:// implementation because it avoids additional
             * WASM resource resolution.
             */

            console.log(
                "[PHARMACOLOGY PDF VIEWER] Starting PDF.js document loading..."
            );


            const loadingTask =
                lib.getDocument({

                    data:
                        bytes,

                    useWorkerFetch:
                        false,

                    useWasm:
                        false,

                    isEvalSupported:
                        true

                });


            /*
             * Progress reporting.
             */

            loadingTask.onProgress =
                progress => {

                    if (
                        !progress
                    ) {

                        return;

                    }


                    const loaded =
                        Number(
                            progress.loaded ||
                            0
                        );


                    const total =
                        Number(
                            progress.total ||
                            0
                        );


                    if (
                        total > 0
                    ) {

                        const percent =
                            Math.min(
                                100,
                                Math.round(
                                    (
                                        loaded /
                                        total
                                    ) *
                                    100
                                )
                            );


                        showLoading(
                            true,
                            `Loading PDF... ${percent}%`
                        );

                    }

                };


            /*
             * Wait for PDF.js to complete the
             * worker/fake-worker handshake and
             * parse the PDF.
             */

            pdfDocument =
                await loadingTask.promise;


            totalPages =
                pdfDocument.numPages;


            console.log(
                "[PHARMACOLOGY PDF VIEWER] PDF loaded:",
                totalPages,
                "pages"
            );


            if (
                !totalPages ||
                totalPages < 1
            ) {

                throw new Error(
                    "PDF.js loaded the document but found no pages."
                );

            }


            updateUI();


            /*
             * -------------------------------------------------
             * RENDER ALL PAGES
             * -------------------------------------------------
             */

            await renderAllPages();


            showLoading(
                false
            );


            console.log(
                "[PHARMACOLOGY PDF VIEWER] PDF opened successfully."
            );

        } catch (error) {

            console.error(
                "[PHARMACOLOGY PDF VIEWER] Failed to open PDF:",
                error
            );


            console.error(
                "[PHARMACOLOGY PDF VIEWER] Error name:",
                error?.name
            );


            console.error(
                "[PHARMACOLOGY PDF VIEWER] Error message:",
                error?.message
            );


            console.error(
                "[PHARMACOLOGY PDF VIEWER] Error stack:",
                error?.stack
            );


            showError(
                error
            );

        }

    }


    /* =========================================================
       RENDER ALL PAGES
       ========================================================= */

    async function renderAllPages() {

        if (
            !pdfDocument ||
            !pagesContainer
        ) {

            return;

        }


        const token =
            ++renderingToken;


        pagesContainer.innerHTML =
            "";


        for (
            let pageNumber = 1;
            pageNumber <= totalPages;
            pageNumber++
        ) {

            if (
                token !== renderingToken
            ) {

                return;

            }


            showLoading(
                true,
                `Rendering page ${pageNumber} of ${totalPages}...`
            );


            await renderPage(
                pageNumber,
                token
            );

        }


        updateUI();

    }


    /* =========================================================
       RENDER ONE PAGE
       ========================================================= */

    async function renderPage(
        pageNumber,
        token
    ) {

        if (
            !pdfDocument
        ) {

            return;

        }


        if (
            token !== renderingToken
        ) {

            return;

        }


        const page =
            await pdfDocument.getPage(
                pageNumber
            );


        if (
            token !== renderingToken
        ) {

            return;

        }


        const viewport =
            page.getViewport({

                scale:
                    currentScale

            });


        const pageWrapper =
            document.createElement(
                "div"
            );


        pageWrapper.className =
            "pharmacology-pdf-page";


        pageWrapper.dataset.page =
            String(
                pageNumber
            );


        const canvas =
            document.createElement(
                "canvas"
            );


        const context =
            canvas.getContext(
                "2d",
                {
                    alpha:
                        false
                }
            );


        if (
            !context
        ) {

            throw new Error(
                "Could not create PDF rendering canvas."
            );

        }


        const deviceScale =
            Math.max(
                1,
                window.devicePixelRatio ||
                1
            );


        canvas.width =
            Math.floor(
                viewport.width *
                deviceScale
            );


        canvas.height =
            Math.floor(
                viewport.height *
                deviceScale
            );


        canvas.style.width =
            `${viewport.width}px`;


        canvas.style.height =
            `${viewport.height}px`;


        pageWrapper.appendChild(
            canvas
        );


        pagesContainer.appendChild(
            pageWrapper
        );


        const renderContext = {

            canvasContext:
                context,

            viewport:

                viewport,

            transform:

                deviceScale !== 1

                    ? [

                        deviceScale,

                        0,

                        0,

                        deviceScale,

                        0,

                        0

                    ]

                    : null

        };


        await page
            .render(
                renderContext
            )
            .promise;


        /*
         * Cleanup page resources once
         * rendering is complete.
         */

        try {

            page.cleanup();

        } catch (_) {
            /* cleanup is optional */
        }

    }


    /* =========================================================
       PAGE NAVIGATION
       ========================================================= */

    function goToPage(
        pageNumber
    ) {

        if (
            !pdfDocument ||
            !pagesContainer ||
            totalPages <= 0
        ) {

            return;

        }


        const safePage =
            Math.max(
                1,
                Math.min(
                    totalPages,
                    Number(
                        pageNumber
                    ) || 1
                )
            );


        currentPage =
            safePage;


        const target =
            pagesContainer.querySelector(
                `[data-page="${safePage}"]`
            );


        if (
            target
        ) {

            target.scrollIntoView({

                behavior:
                    "smooth",

                block:
                    "start"

            });

        }


        updateUI();

    }


    /* =========================================================
       ZOOM
       ========================================================= */

    async function setZoom(
        scale
    ) {

        const safeScale =
            Math.max(
                MIN_SCALE,
                Math.min(
                    MAX_SCALE,
                    Number(
                        scale
                    ) || DEFAULT_SCALE
                )
            );


        currentScale =
            safeScale;


        if (
            !pdfDocument
        ) {

            updateUI();

            return;

        }


        showLoading(
            true,
            "Updating zoom..."
        );


        try {

            await renderAllPages();

        } catch (error) {

            console.error(
                "[PHARMACOLOGY PDF VIEWER] Zoom rendering failed:",
                error
            );


            showError(
                error
            );

        } finally {

            if (
                viewerOverlay &&
                pagesContainer &&
                pagesContainer.querySelector(
                    ".pharmacology-pdf-page"
                )
            ) {

                showLoading(
                    false
                );

            }

        }


        updateUI();

    }


    /* =========================================================
       FIT WIDTH
       ========================================================= */

    async function fitWidth() {

        if (
            !pdfDocument ||
            !pagesContainer ||
            !viewerOverlay
        ) {

            return;

        }


        const scrollContainer =
            viewerOverlay.querySelector(
                "#pharmacology-pdf-scroll"
            );


        if (
            !scrollContainer
        ) {

            return;

        }


        try {

            const page =
                await pdfDocument.getPage(
                    1
                );


            const unscaledViewport =
                page.getViewport({

                    scale:
                        1

                });


            const availableWidth =
                Math.max(
                    100,
                    scrollContainer.clientWidth -
                    56
                );


            const calculatedScale =
                availableWidth /
                unscaledViewport.width;


            await setZoom(
                Math.max(
                    MIN_SCALE,
                    Math.min(
                        MAX_SCALE,
                        calculatedScale
                    )
                )
            );

        } catch (error) {

            console.error(
                "[PHARMACOLOGY PDF VIEWER] Fit-width failed:",
                error
            );

        }

    }


    /* =========================================================
       LOADING INDICATOR
       ========================================================= */

    function showLoading(
        visible,
        message
    ) {

        if (
            !loadingIndicator
        ) {

            return;

        }


        loadingIndicator.style.display =
            visible
                ? "flex"
                : "none";


        if (
            message
        ) {

            loadingIndicator.textContent =
                message;

        }

    }


    /* =========================================================
       ERROR DISPLAY
       ========================================================= */

    function showError(
        error
    ) {

        if (
            !pagesContainer
        ) {

            return;

        }


        const message =
            error?.message ||
            String(
                error
            );


        const errorName =
            error?.name
                ? String(
                    error.name
                )
                : "";


        pagesContainer.innerHTML = `

            <div
                class="pharmacology-pdf-error"
            >

                <h3>
                    Unable to open PDF
                </h3>


                <p>
                    The document was retrieved successfully,
                    but PDF.js could not render it.
                </p>


                ${
                    errorName
                        ? `
                            <p>
                                <strong>
                                    ${escapeHTML(
                                        errorName
                                    )}
                                </strong>
                            </p>
                          `
                        : ""
                }


                <p>
                    ${escapeHTML(
                        message
                    )}
                </p>

            </div>

        `;


        showLoading(
            false
        );

    }


    /* =========================================================
       CLOSE
       ========================================================= */

    async function close() {

        console.log(
            "[PHARMACOLOGY PDF VIEWER] Closing viewer."
        );


        renderingToken++;


        if (
            pdfDocument
        ) {

            try {

                await pdfDocument.destroy();

            } catch (error) {

                console.warn(
                    "[PHARMACOLOGY PDF VIEWER] PDF destroy warning:",
                    error
                );

            }

        }


        pdfDocument =
            null;


        currentDocument =
            null;


        totalPages =
            0;


        currentPage =
            1;


        currentScale =
            DEFAULT_SCALE;


        if (
            pagesContainer
        ) {

            pagesContainer.innerHTML =
                "";

        }


        if (
            viewerOverlay
        ) {

            viewerOverlay.style.display =
                "none";

        }


        updateUI();

    }


    /* =========================================================
       INITIALIZATION
       ========================================================= */

    function init() {

        if (
            initialized
        ) {

            return;

        }


        initialized =
            true;


        ensureStyles();


        console.log(
            "[PHARMACOLOGY PDF VIEWER] Initialized."
        );

    }


    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.pharmacologyPdfViewer = {

        init,

        open,

        close,


        isOpen() {

            return Boolean(

                viewerOverlay &&

                viewerOverlay.style.display !==
                    "none"

            );

        },


        getCurrentDocument() {

            return currentDocument;

        },


        getCurrentPage() {

            return currentPage;

        },


        getTotalPages() {

            return totalPages;

        },


        getZoom() {

            return currentScale;

        },


        getPdfJsVersion() {

            return (
                pdfjsLib?.version ||
                null
            );

        },


        isFakeWorkerReady() {

            return Boolean(

                globalThis
                    .pdfjsWorker
                    ?.WorkerMessageHandler

            );

        }

    };


    /* =========================================================
       START
       ========================================================= */

    init();


})();