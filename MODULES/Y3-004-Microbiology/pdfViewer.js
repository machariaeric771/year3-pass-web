/* ============================================================
   YEAR 3 STUDY OS
   MICROBIOLOGY PDF VIEWER
   PDF.js 6.3.289
   Electron + file://
   MAIN-THREAD / FAKE-WORKER ARCHITECTURE

   Adapted from the working Pharmacology PDF viewer.

   Microbiology PDFs are stored in IndexedDB as:

   {
       id,
       noteId,
       name,
       size,
       type,
       created,
       blob: File | Blob
   }

   This viewer accepts that record directly.

   IMPORTANT:
   No iframe.
   No blob: iframe URL.
   No real Web Worker.
   PDF.js renders directly to canvas.
   ============================================================ */

console.log(
    "[MICROBIOLOGY PDF VIEWER] pdfViewer.js HAS LOADED"
);


(() => {

    "use strict";


    /* ============================================================
       PDF.JS 6.x COMPATIBILITY SHIMS
       ============================================================ */

    (function installPdfJsCompatibilityShims() {

        "use strict";


        /*
         * PDF.js 6.x may use Uint8Array.prototype.toHex().
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
                "[MICROBIOLOGY PDF VIEWER] Installed Uint8Array.prototype.toHex compatibility shim."
            );

        } else {

            console.log(
                "[MICROBIOLOGY PDF VIEWER] Native Uint8Array.prototype.toHex is available."
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

                    value:
                        function getOrInsertComputed(
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
                "[MICROBIOLOGY PDF VIEWER] Installed Map.prototype.getOrInsertComputed compatibility shim."
            );

        } else {

            console.log(
                "[MICROBIOLOGY PDF VIEWER] Native Map.prototype.getOrInsertComputed is available."
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
       UTILITIES
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


    /* =========================================================
       CONVERT STORED BLOB TO UINT8ARRAY
       ========================================================= */

    async function blobToUint8Array(blob) {

        if (
            !blob
        ) {

            throw new Error(
                "PDF Blob is missing."
            );

        }


        if (
            typeof blob.arrayBuffer !==
            "function"
        ) {

            throw new Error(
                "Stored PDF does not provide arrayBuffer()."
            );

        }


        const buffer =
            await blob.arrayBuffer();


        if (
            !buffer ||
            !buffer.byteLength
        ) {

            throw new Error(
                "Stored PDF contains no data."
            );

        }


        return new Uint8Array(
            buffer
        );

    }


    /* =========================================================
       PDF.JS FAKE WORKER INITIALIZATION
       ========================================================= */

    async function initializePdfJs() {

        if (
            pdfjsLib
        ) {

            return pdfjsLib;

        }


        if (
            pdfJsLoadingPromise
        ) {

            return pdfJsLoadingPromise;

        }


        pdfJsLoadingPromise =
            (async () => {

                console.log(
                    "[MICROBIOLOGY PDF VIEWER] Loading PDF.js..."
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
                    "[MICROBIOLOGY PDF VIEWER] PDF.js loaded:",
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
                        "[MICROBIOLOGY PDF VIEWER] Expected PDF.js 6.3.289 but loaded:",
                        pdfjsLib.version
                    );

                }


                /*
                 * -------------------------------------------------
                 * LOAD WORKER MODULE
                 * -------------------------------------------------
                 *
                 * We deliberately use PDF.js's main-thread
                 * fake-worker architecture.
                 *
                 * This avoids:
                 *
                 * - new Worker(...)
                 * - blob worker URLs
                 * - worker CSP problems
                 * - file:// worker restrictions
                 */

                console.log(
                    "[MICROBIOLOGY PDF VIEWER] Loading PDF.js worker module for fake-worker mode..."
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
                    "[MICROBIOLOGY PDF VIEWER] WorkerMessageHandler loaded successfully."
                );


                /*
                 * -------------------------------------------------
                 * REGISTER FAKE WORKER
                 * -------------------------------------------------
                 */

                globalThis.pdfjsWorker =
                    pdfjsWorkerModule;


                /*
                 * -------------------------------------------------
                 * IMPORTANT
                 *
                 * Do NOT create a real Worker.
                 *
                 * Do NOT assign a custom workerPort.
                 * -------------------------------------------------
                 */

                pdfjsLib
                    .GlobalWorkerOptions
                    .workerPort =
                    null;


                /*
                 * Retain workerSrc as fallback.
                 */

                pdfjsLib
                    .GlobalWorkerOptions
                    .workerSrc =
                    PDFJS_WORKER_PATH;


                console.log(
                    "[MICROBIOLOGY PDF VIEWER] PDF.js fake-worker configured."
                );


                console.log(
                    "[MICROBIOLOGY PDF VIEWER] Main-thread WorkerMessageHandler:",
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
                "microbiology-pdf-viewer-styles"
            )
        ) {

            return;

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "microbiology-pdf-viewer-styles";


        style.textContent = `

            .microbiology-pdf-overlay {

                position: fixed;

                inset: 0;

                z-index: 999999;

                display: flex;

                flex-direction: column;

                background: #e5e7eb;

                color: #111827;

                font-family:
                    Inter,
                    -apple-system,
                    BlinkMacSystemFont,
                    "Segoe UI",
                    sans-serif;

            }


            .microbiology-pdf-toolbar {

                flex:
                    0 0 auto;

                min-height:
                    58px;

                display:
                    flex;

                align-items:
                    center;

                gap:
                    8px;

                padding:
                    0 14px;

                background:
                    #ffffff;

                border-bottom:
                    1px solid #d1d5db;

                box-sizing:
                    border-box;

            }


            .microbiology-pdf-title {

                flex:
                    1;

                min-width:
                    0;

                font-size:
                    14px;

                font-weight:
                    600;

                overflow:
                    hidden;

                text-overflow:
                    ellipsis;

                white-space:
                    nowrap;

                padding:
                    0 12px;

            }


            .microbiology-pdf-button {

                width:
                    36px;

                height:
                    36px;

                flex:
                    0 0 36px;

                display:
                    inline-flex;

                align-items:
                    center;

                justify-content:
                    center;

                border:
                    1px solid #d1d5db;

                background:
                    #ffffff;

                color:
                    #111827;

                border-radius:
                    7px;

                cursor:
                    pointer;

                font-size:
                    17px;

                line-height:
                    1;

                transition:
                    background 120ms ease,
                    border-color 120ms ease,
                    transform 120ms ease;

            }


            .microbiology-pdf-button:hover {

                background:
                    #f3f4f6;

                border-color:
                    #9ca3af;

            }


            .microbiology-pdf-button:active {

                transform:
                    scale(0.96);

            }


            .microbiology-pdf-button:disabled {

                opacity:
                    0.45;

                cursor:
                    default;

                transform:
                    none;

            }


            .microbiology-pdf-page-info {

                min-width:
                    80px;

                text-align:
                    center;

                font-size:
                    13px;

                color:
                    #4b5563;

            }


            .microbiology-pdf-zoom {

                min-width:
                    62px;

                text-align:
                    center;

                font-size:
                    13px;

                color:
                    #4b5563;

            }


            .microbiology-pdf-scroll {

                flex:
                    1;

                min-height:
                    0;

                overflow:
                    auto;

                padding:
                    28px;

                box-sizing:
                    border-box;

                background:
                    #e5e7eb;

            }


            .microbiology-pdf-pages {

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

                box-sizing:
                    border-box;

            }


            .microbiology-pdf-page {

                position:
                    relative;

                background:
                    #ffffff;

                box-shadow:
                    0 2px 8px
                    rgba(
                        0,
                        0,
                        0,
                        0.18
                    );

                flex:
                    0 0 auto;

            }


            .microbiology-pdf-page canvas {

                display:
                    block;

                max-width:
                    none;

            }


            .microbiology-pdf-loading {

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

                pointer-events:
                    none;

            }


            .microbiology-pdf-error {

                width:
                    min(
                        700px,
                        calc(
                            100% - 40px
                        )
                    );

                margin:
                    80px auto;

                padding:
                    26px;

                background:
                    #ffffff;

                border:
                    1px solid #d1d5db;

                border-radius:
                    10px;

                line-height:
                    1.6;

                box-sizing:
                    border-box;

            }


            .microbiology-pdf-error h3 {

                margin:
                    0 0 10px;

                font-size:
                    18px;

            }


            .microbiology-pdf-error p {

                margin:
                    7px 0;

                color:
                    #4b5563;

            }


            @media (
                max-width: 800px
            ) {

                .microbiology-pdf-toolbar {

                    gap:
                        4px;

                    padding:
                        0 7px;

                }


                .microbiology-pdf-title {

                    padding:
                        0 5px;

                }


                .microbiology-pdf-page-info {

                    min-width:
                        65px;

                }


                .microbiology-pdf-zoom {

                    min-width:
                        50px;

                }


                .microbiology-pdf-scroll {

                    padding:
                        14px;

                }

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
            "microbiology-pdf-overlay";


        viewerOverlay.style.display =
            "none";


        viewerOverlay.innerHTML = `

            <div
                class="microbiology-pdf-toolbar"
            >

                <button
                    class="microbiology-pdf-button"
                    id="microbiology-pdf-close"
                    title="Close PDF"
                    aria-label="Close PDF"
                    type="button"
                >
                    ×
                </button>


                <div
                    class="microbiology-pdf-title"
                    id="microbiology-pdf-title"
                >
                    PDF Document
                </div>


                <button
                    class="microbiology-pdf-button"
                    id="microbiology-pdf-prev"
                    title="Previous page"
                    aria-label="Previous page"
                    type="button"
                >
                    ‹
                </button>


                <div
                    class="microbiology-pdf-page-info"
                    id="microbiology-pdf-page-info"
                >
                    0 / 0
                </div>


                <button
                    class="microbiology-pdf-button"
                    id="microbiology-pdf-next"
                    title="Next page"
                    aria-label="Next page"
                    type="button"
                >
                    ›
                </button>


                <button
                    class="microbiology-pdf-button"
                    id="microbiology-pdf-zoom-out"
                    title="Zoom out"
                    aria-label="Zoom out"
                    type="button"
                >
                    −
                </button>


                <div
                    class="microbiology-pdf-zoom"
                    id="microbiology-pdf-zoom"
                >
                    100%
                </div>


                <button
                    class="microbiology-pdf-button"
                    id="microbiology-pdf-zoom-in"
                    title="Zoom in"
                    aria-label="Zoom in"
                    type="button"
                >
                    +
                </button>


                <button
                    class="microbiology-pdf-button"
                    id="microbiology-pdf-fit"
                    title="Fit width"
                    aria-label="Fit width"
                    type="button"
                >
                    ↔
                </button>

            </div>


            <div
                class="microbiology-pdf-scroll"
                id="microbiology-pdf-scroll"
            >

                <div
                    class="microbiology-pdf-pages"
                    id="microbiology-pdf-pages"
                ></div>

            </div>


            <div
                class="microbiology-pdf-loading"
                id="microbiology-pdf-loading"
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
                "#microbiology-pdf-pages"
            );


        pageIndicator =
            viewerOverlay.querySelector(
                "#microbiology-pdf-page-info"
            );


        zoomIndicator =
            viewerOverlay.querySelector(
                "#microbiology-pdf-zoom"
            );


        loadingIndicator =
            viewerOverlay.querySelector(
                "#microbiology-pdf-loading"
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
                "#microbiology-pdf-close"
            );


        const previousButton =
            viewerOverlay.querySelector(
                "#microbiology-pdf-prev"
            );


        const nextButton =
            viewerOverlay.querySelector(
                "#microbiology-pdf-next"
            );


        const zoomOutButton =
            viewerOverlay.querySelector(
                "#microbiology-pdf-zoom-out"
            );


        const zoomInButton =
            viewerOverlay.querySelector(
                "#microbiology-pdf-zoom-in"
            );


        const fitButton =
            viewerOverlay.querySelector(
                "#microbiology-pdf-fit"
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


    /* =========================================================
       KEYBOARD
       ========================================================= */

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

            event.preventDefault();

            close();

            return;

        }


        if (
            event.key ===
            "ArrowLeft"
        ) {

            event.preventDefault();

            goToPage(
                currentPage - 1
            );

            return;

        }


        if (
            event.key ===
            "ArrowRight"
        ) {

            event.preventDefault();

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
                "#microbiology-pdf-prev"
            );


        const nextButton =
            viewerOverlay.querySelector(
                "#microbiology-pdf-next"
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
            "[MICROBIOLOGY PDF VIEWER] Open requested:",
            documentData?.name ||
            documentData?.id ||
            documentData
        );


        /*
         * -------------------------------------------------
         * VALIDATE RECORD
         * -------------------------------------------------
         */

        if (
            !documentData
        ) {

            throw new Error(
                "No Microbiology PDF document was supplied."
            );

        }


        if (
            !documentData.blob
        ) {

            throw new Error(
                "The Microbiology PDF record contains no Blob."
            );

        }


        createViewer();


        /*
         * -------------------------------------------------
         * SHOW VIEWER
         * -------------------------------------------------
         */

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


        /*
         * -------------------------------------------------
         * TITLE
         * -------------------------------------------------
         */

        const title =
            viewerOverlay.querySelector(
                "#microbiology-pdf-title"
            );


        if (
            title
        ) {

            title.textContent =
                documentData.name ||
                "PDF Document";

        }


        /*
         * -------------------------------------------------
         * CLEAR OLD PAGES
         * -------------------------------------------------
         */

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
             * CONVERT INDEXEDDB BLOB TO BYTES
             * -------------------------------------------------
             */

            const bytes =
                await blobToUint8Array(
                    documentData.blob
                );


            console.log(
                "[MICROBIOLOGY PDF VIEWER] PDF bytes:",
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
             * CHECK PDF HEADER
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
                "[MICROBIOLOGY PDF VIEWER] PDF header:",
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
             */

            console.log(
                "[MICROBIOLOGY PDF VIEWER] Starting PDF.js document loading..."
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
             * -------------------------------------------------
             * PROGRESS
             * -------------------------------------------------
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
             * -------------------------------------------------
             * WAIT FOR PDF.JS
             * -------------------------------------------------
             */

            pdfDocument =
                await loadingTask.promise;


            totalPages =
                pdfDocument.numPages;


            console.log(
                "[MICROBIOLOGY PDF VIEWER] PDF loaded:",
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
                "[MICROBIOLOGY PDF VIEWER] PDF opened successfully."
            );

        } catch (error) {

            console.error(
                "[MICROBIOLOGY PDF VIEWER] Failed to open PDF:",
                error
            );


            console.error(
                "[MICROBIOLOGY PDF VIEWER] Error name:",
                error?.name
            );


            console.error(
                "[MICROBIOLOGY PDF VIEWER] Error message:",
                error?.message
            );


            console.error(
                "[MICROBIOLOGY PDF VIEWER] Error stack:",
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
            "microbiology-pdf-page";


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


        /*
         * High-DPI rendering.
         */

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


        try {

            page.cleanup();

        } catch (_) {
            /* optional cleanup */
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
                "[MICROBIOLOGY PDF VIEWER] Zoom rendering failed:",
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
                    ".microbiology-pdf-page"
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
                "#microbiology-pdf-scroll"
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
                "[MICROBIOLOGY PDF VIEWER] Fit-width failed:",
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
                class="microbiology-pdf-error"
            >

                <h3>
                    Unable to open PDF
                </h3>


                <p>
                    The PDF was retrieved from
                    Microbiology storage, but PDF.js
                    could not render it.
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
            "[MICROBIOLOGY PDF VIEWER] Closing viewer."
        );


        /*
         * Cancel any rendering still in progress.
         */

        renderingToken++;


        /*
         * Destroy current PDF.js document.
         */

        if (
            pdfDocument
        ) {

            try {

                await pdfDocument.destroy();

            } catch (error) {

                console.warn(
                    "[MICROBIOLOGY PDF VIEWER] PDF destroy warning:",
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
       DESTROY
       ========================================================= */

    async function destroy() {

        console.log(
            "[MICROBIOLOGY PDF VIEWER] Destroying viewer."
        );


        renderingToken++;


        if (
            pdfDocument
        ) {

            try {

                await pdfDocument.destroy();

            } catch (_) {
                /* ignore */
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


        if (
            viewerOverlay
        ) {

            viewerOverlay.remove();

        }


        viewerOverlay =
            null;

        pagesContainer =
            null;

        pageIndicator =
            null;

        zoomIndicator =
            null;

        loadingIndicator =
            null;


        initialized =
            false;

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
            "[MICROBIOLOGY PDF VIEWER] Initialized."
        );

    }


    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.microbiologyPdfViewer = {

        init,

        open,

        close,

        destroy,


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