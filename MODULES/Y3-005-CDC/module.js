(() => {
    'use strict';

    /*
     * ============================================================
     * YEAR 3 STUDY OS
     * Y3-005-CDC
     *
     * Standalone CDC Resource Center
     *
     * IMPORTANT:
     * This module is independent from Y3-004-Microbiology.
     * It communicates only through optional global bridges.
     * ============================================================
     */

    const MODULE_ID = 'Y3-005-CDC';
    const MODULE_NAME = 'CDC Resource Center';
    const FEATURE_ID = 'CDC';

    const STORAGE = {
        bookmarks: 'year3_cdc_bookmarks',
        history: 'year3_cdc_history',
        cache: 'year3_cdc_cache',
        notes: 'year3_cdc_notes',
        flashcards: 'year3_cdc_flashcards',
        questions: 'year3_cdc_questions',
        searches: 'year3_cdc_recent_searches',
        progress: 'year3_cdc_progress',
        lastSync: 'year3_cdc_last_sync',
        spotter: 'year3_cdc_spotter'
    };

    const CDC_URLS = {
        home: 'https://www.cdc.gov/',
        dpdx: 'https://www.cdc.gov/dpdx/',
        laboratory: 'https://www.cdc.gov/laboratory/',
        phil: 'https://phil.cdc.gov/'
    };

    const state = {
        initialized: false,
        root: null,
        currentView: 'dashboard',
        currentItem: null,
        currentSearchResults: [],
        searchTimer: null,
        abortController: null,

        bookmarks: [],
        history: [],
        cache: [],
        notes: [],
        flashcards: [],
        questions: [],
        searches: [],
        progress: {
            resourcesViewed: 0,
            dpdxViewed: 0,
            imagesReviewed: 0,
            spotterSessions: 0,
            searches: 0,
            aiQuestions: 0
        },
        spotterDraft: {
            organism: '',
            category: '',
            specimen: '',
            stain: '',
            medium: '',
            test: '',
            morphology: '',
            clinicalSignificance: '',
            diagnosticClues: '',
            commonConfusions: '',
            difficulty: 'Medium',
            source: '',
            sourceUrl: '',
            rights: 'Unknown',
            attribution: ''
        },
        lastSync: null
    };

    let root = null;

    /* ============================================================
       DOM HELPERS
       ============================================================ */

    function $(selector, parent = root) {
        if (!parent) {
            return null;
        }

        return parent.querySelector(selector);
    }

    function $all(selector, parent = root) {
        if (!parent) {
            return [];
        }

        return Array.from(
            parent.querySelectorAll(selector)
        );
    }

    function getRoot() {
        return document.getElementById(
            'cdcResourceCenter'
        );
    }

    /* ============================================================
       TEXT / SECURITY HELPERS
       ============================================================ */

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function normalizeText(value) {
        return String(value ?? '')
            .trim()
            .toLowerCase();
    }

    function truncate(value, length = 180) {
        const text = String(value ?? '');

        if (text.length <= length) {
            return text;
        }

        return `${text.slice(0, length - 1)}…`;
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function safeJsonParse(value, fallback) {
        try {
            const parsed = JSON.parse(value);

            return parsed ?? fallback;
        } catch {
            return fallback;
        }
    }

    /* ============================================================
       STORAGE
       ============================================================ */

    function readStorage(key, fallback) {
        try {
            const raw = localStorage.getItem(key);

            if (!raw) {
                return fallback;
            }

            return safeJsonParse(
                raw,
                fallback
            );

        } catch (error) {
            console.warn(
                '[CDC] Could not read localStorage:',
                key,
                error
            );

            return fallback;
        }
    }

    function writeStorage(key, value) {
        try {
            localStorage.setItem(
                key,
                JSON.stringify(value)
            );

            return true;

        } catch (error) {
            console.warn(
                '[CDC] Could not write localStorage:',
                key,
                error
            );

            return false;
        }
    }

    function removeStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn(
                '[CDC] Could not remove localStorage:',
                key,
                error
            );
        }
    }

    function loadState() {

        state.bookmarks =
            readStorage(
                STORAGE.bookmarks,
                []
            );

        state.history =
            readStorage(
                STORAGE.history,
                []
            );

        state.cache =
            readStorage(
                STORAGE.cache,
                []
            );

        state.notes =
            readStorage(
                STORAGE.notes,
                []
            );

        state.flashcards =
            readStorage(
                STORAGE.flashcards,
                []
            );

        state.questions =
            readStorage(
                STORAGE.questions,
                []
            );

        state.searches =
            readStorage(
                STORAGE.searches,
                []
            );

        state.progress =
            readStorage(
                STORAGE.progress,
                state.progress
            );

        state.lastSync =
            readStorage(
                STORAGE.lastSync,
                null
            );

        if (!state.progress || typeof state.progress !== 'object') {
            state.progress = {
                resourcesViewed: 0,
                dpdxViewed: 0,
                imagesReviewed: 0,
                spotterSessions: 0,
                searches: 0,
                aiQuestions: 0
            };
        }

        state.spotterDraft =
            readStorage(
                STORAGE.spotter,
                state.spotterDraft
            );
    }

    /* ============================================================
       PERSISTENCE
       ============================================================ */

    function persistState() {
        writeStorage(
            STORAGE.bookmarks,
            state.bookmarks
        );

        writeStorage(
            STORAGE.history,
            state.history
        );

        writeStorage(
            STORAGE.cache,
            state.cache
        );

        writeStorage(
            STORAGE.notes,
            state.notes
        );

        writeStorage(
            STORAGE.flashcards,
            state.flashcards
        );

        writeStorage(
            STORAGE.questions,
            state.questions
        );

        writeStorage(
            STORAGE.searches,
            state.searches
        );

        writeStorage(
            STORAGE.progress,
            state.progress
        );

        writeStorage(
            STORAGE.lastSync,
            state.lastSync
        );

        writeStorage(
            STORAGE.spotter,
            state.spotterDraft
        );
    }

    /* ============================================================
       CATEGORY DATA
       ============================================================ */

    const CATEGORIES = [
        {
            id: 'bacteriology',
            title: 'Bacteriology',
            icon: '🧫',
            description:
                'Bacterial diseases, organisms and laboratory identification.'
        },
        {
            id: 'virology',
            title: 'Virology',
            icon: '🧬',
            description:
                'Viral diseases, diagnostic resources and laboratory information.'
        },
        {
            id: 'mycology',
            title: 'Mycology',
            icon: '🍄',
            description:
                'Fungal diseases, morphology and laboratory identification.'
        },
        {
            id: 'parasitology',
            title: 'DPDx Parasitology',
            icon: '🔬',
            description:
                'Parasite identification, specimens, cases and quizzes.'
        },
        {
            id: 'laboratory',
            title: 'Laboratory',
            icon: '🧪',
            description:
                'CDC laboratory diagnostics and testing resources.'
        },
        {
            id: 'procedures',
            title: 'Procedures',
            icon: '📋',
            description:
                'Diagnostic procedures and laboratory workflows.'
        },
        {
            id: 'algorithms',
            title: 'Algorithms',
            icon: '🔀',
            description:
                'Diagnostic decision pathways and algorithms.'
        },
        {
            id: 'images',
            title: 'Image Library',
            icon: '🖼️',
            description:
                'CDC image resources with source and rights tracking.'
        }
    ];

    const HIGH_YIELD = [
        {
            title: 'Gram-positive cocci',
            description:
                'Review morphology, catalase/coagulase interpretation and common clinical associations.',
            query:
                'Gram positive cocci catalase coagulase CDC'
        },
        {
            title: 'Gram-negative bacilli',
            description:
                'Review specimen selection, culture characteristics and identification pathways.',
            query:
                'Gram negative bacilli laboratory diagnosis CDC'
        },
        {
            title: 'Acid-fast organisms',
            description:
                'Focus on acid-fast staining and laboratory interpretation.',
            query:
                'acid fast bacilli laboratory diagnosis CDC'
        },
        {
            title: 'Parasitology identification',
            description:
                'Use DPDx resources for parasite morphology and diagnostic examination.',
            query:
                'DPDx parasite identification'
        },
        {
            title: 'Clinical specimens',
            description:
                'Connect specimen type to diagnostic testing and organism identification.',
            query:
                'clinical specimen microbiology diagnosis CDC'
        },
        {
            title: 'Laboratory algorithms',
            description:
                'Practice structured diagnostic reasoning.',
            query:
                'CDC diagnostic laboratory algorithm'
        }
    ];

    const CATEGORY_RESOURCES = {
        bacteriology: [
            {
                title: 'Bacterial Disease Resources',
                description:
                    'CDC bacterial disease and laboratory resources.',
                type: 'category',
                category: 'bacteriology',
                sourceUrl: 'https://www.cdc.gov/bacterial-infections/'
            },
            {
                title: 'Bacterial Laboratory Identification',
                description:
                    'Use CDC resources to support laboratory identification and interpretation.',
                type: 'study-path',
                category: 'bacteriology'
            },
            {
                title: 'Gram-positive Identification Path',
                description:
                    'Study morphology, stains, biochemical testing and clinical clues.',
                type: 'study-path',
                category: 'bacteriology'
            },
            {
                title: 'Gram-negative Identification Path',
                description:
                    'Study morphology, culture and biochemical identification.',
                type: 'study-path',
                category: 'bacteriology'
            }
        ],

        virology: [
            {
                title: 'Viral Disease Resources',
                description:
                    'CDC viral disease information and laboratory resources.',
                type: 'category',
                category: 'virology',
                sourceUrl: 'https://www.cdc.gov/viral-infections/'
            },
            {
                title: 'Viral Diagnostics',
                description:
                    'Review specimen selection, testing and interpretation.',
                type: 'study-path',
                category: 'virology'
            },
            {
                title: 'Molecular Detection',
                description:
                    'Review molecular diagnostic concepts in context.',
                type: 'study-path',
                category: 'virology'
            }
        ],

        mycology: [
            {
                title: 'Fungal Disease Resources',
                description:
                    'CDC fungal disease resources and diagnostic information.',
                type: 'category',
                category: 'mycology',
                sourceUrl: 'https://www.cdc.gov/fungal/'
            },
            {
                title: 'Yeast Identification',
                description:
                    'Review morphology and laboratory identification concepts.',
                type: 'study-path',
                category: 'mycology'
            },
            {
                title: 'Mould Identification',
                description:
                    'Review hyaline and dematiaceous mould identification.',
                type: 'study-path',
                category: 'mycology'
            }
        ],

        parasitology: [
            {
                title: 'CDC DPDx',
                description:
                    'CDC parasitology diagnostic resource.',
                type: 'dpdx',
                category: 'parasitology',
                provider: 'CDC DPDx',
                sourceUrl: CDC_URLS.dpdx
            },
            {
                title: 'Parasite Identification',
                description:
                    'Use DPDx resources for parasite morphology and laboratory diagnosis.',
                type: 'study-path',
                category: 'parasitology',
                sourceUrl: CDC_URLS.dpdx
            },
            {
                title: 'Specimen Processing',
                description:
                    'Study diagnostic specimen processing and examination.',
                type: 'study-path',
                category: 'parasitology',
                sourceUrl: CDC_URLS.dpdx
            },
            {
                title: 'DPDx Cases and Quizzes',
                description:
                    'Use CDC DPDx educational cases and quizzes.',
                type: 'quiz',
                category: 'parasitology',
                sourceUrl: CDC_URLS.dpdx
            }
        ],

        laboratory: [
            {
                title: 'CDC Laboratory Resources',
                description:
                    'Laboratory science and diagnostic resources.',
                type: 'laboratory',
                category: 'laboratory',
                sourceUrl: CDC_URLS.laboratory
            },
            {
                title: 'Specimen → Diagnosis',
                description:
                    'Connect specimen type, testing and likely diagnosis.',
                type: 'workflow',
                category: 'laboratory'
            },
            {
                title: 'Diagnostic Testing',
                description:
                    'Review diagnostic methods and interpretation.',
                type: 'workflow',
                category: 'laboratory'
            }
        ],

        procedures: [
            {
                title: 'Laboratory Procedures',
                description:
                    'Diagnostic procedure study collection.',
                type: 'procedure',
                category: 'procedures'
            },
            {
                title: 'Specimen Collection',
                description:
                    'Review principles of appropriate specimen collection.',
                type: 'procedure',
                category: 'procedures'
            },
            {
                title: 'Microscopy',
                description:
                    'Microscopy-oriented diagnostic study path.',
                type: 'procedure',
                category: 'procedures'
            },
            {
                title: 'Culture',
                description:
                    'Culture-oriented laboratory study path.',
                type: 'procedure',
                category: 'procedures'
            }
        ],

        algorithms: [
            {
                title: 'Laboratory Diagnostic Algorithm',
                description:
                    'Structured approach to laboratory diagnosis.',
                type: 'algorithm',
                category: 'algorithms'
            },
            {
                title: 'Specimen-Based Algorithm',
                description:
                    'Start with specimen and work toward diagnostic testing.',
                type: 'algorithm',
                category: 'algorithms'
            },
            {
                title: 'Organism Identification Algorithm',
                description:
                    'Combine morphology, staining, culture and biochemical tests.',
                type: 'algorithm',
                category: 'algorithms'
            }
        ]
    };

    /* ============================================================
       URL SECURITY
       ============================================================ */

    function safeExternal(raw) {

        if (!raw) {
            return false;
        }

        try {
            const url = new URL(
                String(raw)
            );

            if (url.protocol !== 'https:') {
                return false;
            }

            /*
             * CDC resources are restricted to CDC-owned hosts.
             */

            return (
                /(^|\.)cdc\.gov$/i.test(
                    url.hostname
                )
            );

        } catch {
            return false;
        }
    }

    function safeUrl(raw) {

        if (!raw) {
            return '';
        }

        try {
            const url = new URL(
                String(raw)
            );

            if (
                url.protocol !== 'https:' &&
                url.protocol !== 'http:'
            ) {
                return '';
            }

            return url.href;

        } catch {
            return '';
        }
    }

    /* ============================================================
       OPEN EXTERNAL
       ============================================================ */

    async function openExternal(url) {

        if (!safeExternal(url)) {

            showModal(
                'Blocked External Resource',
                `
                    <div class="cdc-notice cdc-notice-warning">
                        This module only opens validated CDC HTTPS resources.
                    </div>
                `
            );

            return false;
        }

        try {

            if (
                window.year3 &&
                typeof window.year3.openExternal === 'function'
            ) {

                await window.year3.openExternal(
                    url
                );

                return true;
            }

        } catch (error) {

            console.warn(
                '[CDC] year3.openExternal failed:',
                error
            );
        }

        try {

            if (
                window.api &&
                typeof window.api.openExternal === 'function'
            ) {

                await window.api.openExternal(
                    url
                );

                return true;
            }

        } catch (error) {

            console.warn(
                '[CDC] api.openExternal failed:',
                error
            );
        }

        /*
         * Last renderer fallback.
         */

        try {

            window.open(
                url,
                '_blank',
                'noopener,noreferrer'
            );

            return true;

        } catch (error) {

            console.error(
                '[CDC] Could not open external resource:',
                error
            );

            return false;
        }
    }

    /* ============================================================
       ONLINE STATUS
       ============================================================ */

    function updateOnlineStatus() {

        const online =
            navigator.onLine !== false;

        const status =
            $('#cdcOnlineStatus');

        const text =
            status?.querySelector(
                '.cdc-status-text'
            );

        const notice =
            $('#cdcOfflineNotice');

        if (status) {

            status.classList.toggle(
                'offline',
                !online
            );
        }

        if (text) {

            text.textContent =
                online
                    ? 'Online'
                    : 'Offline';
        }

        if (notice) {

            notice.classList.toggle(
                'show',
                !online
            );
        }
    }

    /* ============================================================
       MODAL
       ============================================================ */

    function showModal(
        title,
        body
    ) {

        const modal =
            $('#cdcModal');

        const titleNode =
            $('#cdcModalTitle');

        const bodyNode =
            $('#cdcModalBody');

        if (!modal || !titleNode || !bodyNode) {
            return;
        }

        titleNode.textContent =
            title || 'CDC Resource';

        bodyNode.innerHTML =
            body || '';

        modal.classList.add(
            'open'
        );

        modal.setAttribute(
            'aria-hidden',
            'false'
        );
    }

    function closeModal() {

        const modal =
            $('#cdcModal');

        if (!modal) {
            return;
        }

        modal.classList.remove(
            'open'
        );

        modal.setAttribute(
            'aria-hidden',
            'true'
        );
    }

    /* ============================================================
       PROGRESS
       ============================================================ */

    function saveProgress() {

        writeStorage(
            STORAGE.progress,
            state.progress
        );

        updateKpis();
    }

    function updateKpis() {

        const mapping = {
            '#cdcKpiResources':
                state.progress.resourcesViewed,

            '#cdcKpiDpdx':
                state.progress.dpdxViewed,

            '#cdcKpiImages':
                state.progress.imagesReviewed,

            '#cdcKpiSpotter':
                state.progress.spotterSessions
        };

        Object.entries(mapping)
            .forEach(([selector, value]) => {

                const node = $(selector);

                if (node) {
                    node.textContent =
                        String(value || 0);
                }
            });
    }

    function recordResourceView(item) {

        state.progress.resourcesViewed++;

        if (
            item &&
            (
                item.type === 'dpdx' ||
                item.category === 'parasitology' ||
                /dpdx/i.test(
                    item.title || ''
                )
            )
        ) {

            state.progress.dpdxViewed++;
        }

        state.history = [
            {
                ...item,
                viewedAt: nowIso()
            },
            ...state.history.filter(
                existing =>
                    existing.id !== item.id
            )
        ].slice(0, 100);

        writeStorage(
            STORAGE.history,
            state.history
        );

        saveProgress();
    }

    /* ============================================================
       RESOURCE ID
       ============================================================ */

    function getItemId(item) {

        if (!item) {
            return '';
        }

        if (item.id) {
            return String(item.id);
        }

        const source =
            item.sourceUrl ||
            item.url ||
            '';

        return [
            item.type || 'resource',
            item.category || '',
            item.title || '',
            source
        ]
            .join('|')
            .toLowerCase();
    }

    function normalizeItem(item = {}) {

        return {
            id:
                getItemId(item),

            title:
                item.title ||
                item.name ||
                'Untitled CDC Resource',

            description:
                item.description ||
                item.summary ||
                '',

            type:
                item.type ||
                'resource',

            category:
                item.category ||
                '',

            subcategory:
                item.subcategory ||
                '',

            organism:
                item.organism ||
                '',

            specimen:
                item.specimen ||
                '',

            stain:
                item.stain ||
                '',

            medium:
                item.medium ||
                '',

            test:
                item.test ||
                '',

            morphology:
                item.morphology ||
                '',

            clinicalSignificance:
                item.clinicalSignificance ||
                '',

            diagnosticClues:
                item.diagnosticClues ||
                '',

            commonConfusions:
                item.commonConfusions ||
                '',

            difficulty:
                item.difficulty ||
                'Medium',

            provider:
                item.provider ||
                'CDC',

            provenance:
                item.provenance ||
                null,

            rights:
                item.rights ||
                item.license ||
                'Unknown',

            attribution:
                item.attribution ||
                '',

            sourceUrl:
                item.sourceUrl ||
                item.url ||
                '',

            imageUrl:
                item.imageUrl ||
                item.image ||
                '',

            updatedAt:
                item.updatedAt ||
                null
        };
    }

    /* ============================================================
       BOOKMARKS
       ============================================================ */

    function isBookmarked(item) {

        const id =
            getItemId(item);

        return state.bookmarks.some(
            existing =>
                existing.id === id
        );
    }

    function toggleBookmark(item) {

        const normalized =
            normalizeItem(item);

        const index =
            state.bookmarks.findIndex(
                existing =>
                    existing.id === normalized.id
            );

        if (index >= 0) {

            state.bookmarks.splice(
                index,
                1
            );

        } else {

            state.bookmarks.unshift(
                normalized
            );
        }

        writeStorage(
            STORAGE.bookmarks,
            state.bookmarks
        );

        renderBookmarks();
    }

    /* ============================================================
       RESOURCE DETAIL
       ============================================================ */

    function resourceFacts(item) {

        const facts = [];

        const add =
            (label, value) => {

                if (value) {

                    facts.push(`
                        <div class="cdc-resource-fact">
                            <div class="cdc-resource-fact-label">
                                ${escapeHtml(label)}
                            </div>

                            <div class="cdc-resource-fact-value">
                                ${escapeHtml(value)}
                            </div>
                        </div>
                    `);
                }
            };

        add('Category', item.category);
        add('Subcategory', item.subcategory);
        add('Organism', item.organism);
        add('Specimen', item.specimen);
        add('Stain', item.stain);
        add('Medium', item.medium);
        add('Test', item.test);
        add('Difficulty', item.difficulty);
        add('Provider', item.provider);
        add('Rights', item.rights);

        return facts.join('');
    }

    function openItem(item) {

        if (!item) {
            return;
        }

        const normalized =
            normalizeItem(item);

        state.currentItem =
            normalized;

        recordResourceView(
            normalized
        );

        const bookmarked =
            isBookmarked(
                normalized
            );

        const sourceLink =
            safeExternal(
                normalized.sourceUrl
            )
                ? `
                    <button
                        type="button"
                        class="cdc-btn cdc-btn-primary"
                        data-resource-action="open-source"
                    >
                        Open Original CDC Resource ↗
                    </button>
                `
                : '';

        const body = `

            <div>

                <h2 class="cdc-resource-title">
                    ${escapeHtml(normalized.title)}
                </h2>

                <div class="cdc-chip-row">

                    <span class="cdc-chip cdc-chip-primary">
                        ${escapeHtml(
                            normalized.provider || 'CDC'
                        )}
                    </span>

                    ${
                        normalized.category
                            ? `
                                <span class="cdc-chip">
                                    ${escapeHtml(
                                        normalized.category
                                    )}
                                </span>
                            `
                            : ''
                    }

                    <span class="cdc-chip">
                        Rights: ${escapeHtml(
                            normalized.rights || 'Unknown'
                        )}
                    </span>

                </div>

                <p class="cdc-resource-description">
                    ${escapeHtml(
                        normalized.description ||
                        'No description is currently available.'
                    )}
                </p>

                ${
                    resourceFacts(normalized)
                        ? `
                            <div class="cdc-resource-facts">
                                ${resourceFacts(normalized)}
                            </div>
                        `
                        : ''
                }

                ${
                    normalized.clinicalSignificance
                        ? `
                            <div class="cdc-section" style="margin-top:15px;">
                                <strong>
                                    Clinical significance
                                </strong>

                                <p class="cdc-card-text">
                                    ${escapeHtml(
                                        normalized.clinicalSignificance
                                    )}
                                </p>
                            </div>
                        `
                        : ''
                }

                ${
                    normalized.diagnosticClues
                        ? `
                            <div class="cdc-section">
                                <strong>
                                    Diagnostic clues
                                </strong>

                                <p class="cdc-card-text">
                                    ${escapeHtml(
                                        normalized.diagnosticClues
                                    )}
                                </p>
                            </div>
                        `
                        : ''
                }

                ${
                    normalized.commonConfusions
                        ? `
                            <div class="cdc-section">
                                <strong>
                                    Common confusions
                                </strong>

                                <p class="cdc-card-text">
                                    ${escapeHtml(
                                        normalized.commonConfusions
                                    )}
                                </p>
                            </div>
                        `
                        : ''
                }

                ${
                    normalized.attribution
                        ? `
                            <div class="cdc-notice" style="margin-top:15px;">
                                <strong>Attribution:</strong>
                                ${escapeHtml(
                                    normalized.attribution
                                )}
                            </div>
                        `
                        : ''
                }

                <div class="cdc-card-actions">

                    <button
                        type="button"
                        class="cdc-btn"
                        data-resource-action="bookmark"
                    >
                        ${bookmarked
                            ? '★ Remove Bookmark'
                            : '☆ Bookmark'}
                    </button>

                    <button
                        type="button"
                        class="cdc-btn"
                        data-resource-action="spotter"
                    >
                        Add to Spotter
                    </button>

                    <button
                        type="button"
                        class="cdc-btn"
                        data-resource-action="note"
                    >
                        Create Note
                    </button>

                    <button
                        type="button"
                        class="cdc-btn"
                        data-resource-action="flashcard"
                    >
                        Create Flashcard
                    </button>

                    <button
                        type="button"
                        class="cdc-btn"
                        data-resource-action="question"
                    >
                        Create Question
                    </button>

                    <button
                        type="button"
                        class="cdc-btn"
                        data-resource-action="ask-ai"
                    >
                        Ask AI
                    </button>

                    ${sourceLink}

                </div>

            </div>
        `;

        showModal(
            normalized.title,
            body
        );
    }

    /* ============================================================
       RENDER DASHBOARD
       ============================================================ */

    function renderCategoryGrid() {

        const target =
            $('#cdcCategoryGrid');

        if (!target) {
            return;
        }

        target.innerHTML =
            CATEGORIES
                .map(category => `

                    <article
                        class="cdc-card cdc-card-clickable"
                        data-category-card="${escapeHtml(
                            category.id
                        )}"
                    >

                        <div class="cdc-card-icon">
                            ${category.icon}
                        </div>

                        <h3 class="cdc-card-title">
                            ${escapeHtml(
                                category.title
                            )}
                        </h3>

                        <p class="cdc-card-text">
                            ${escapeHtml(
                                category.description
                            )}
                        </p>

                    </article>

                `)
                .join('');
    }

    function renderRecent() {

        const target =
            $('#cdcRecentList');

        if (!target) {
            return;
        }

        if (!state.history.length) {

            target.innerHTML =
                emptyHtml(
                    '↺',
                    'No recent resources',
                    'Resources you open will appear here.'
                );

            return;
        }

        target.innerHTML =
            state.history
                .slice(0, 8)
                .map(item =>
                    listItemHtml(
                        item,
                        'Open',
                        'history-open'
                    )
                )
                .join('');
    }

    function renderHighYieldDashboard() {

        const target =
            $('#cdcHighYieldList');

        if (!target) {
            return;
        }

        target.innerHTML =
            HIGH_YIELD
                .slice(0, 5)
                .map(item => `

                    <div class="cdc-list-item">

                        <div class="cdc-list-main">

                            <p class="cdc-list-title">
                                ${escapeHtml(
                                    item.title
                                )}
                            </p>

                            <div class="cdc-list-meta">
                                ${escapeHtml(
                                    item.description
                                )}
                            </div>

                        </div>

                        <div class="cdc-list-actions">

                            <button
                                type="button"
                                class="cdc-btn cdc-btn-small"
                                data-high-yield-query="${escapeHtml(
                                    item.query
                                )}"
                            >
                                Study
                            </button>

                        </div>

                    </div>

                `)
                .join('');
    }

    function renderDashboard() {

        updateKpis();
        renderCategoryGrid();
        renderRecent();
        renderHighYieldDashboard();
    }

    /* ============================================================
       GENERIC RENDER HELPERS
       ============================================================ */

    function emptyHtml(
        icon,
        title,
        text
    ) {

        return `

            <div class="cdc-empty">

                <div class="cdc-empty-icon">
                    ${escapeHtml(icon)}
                </div>

                <div class="cdc-empty-title">
                    ${escapeHtml(title)}
                </div>

                <div class="cdc-empty-text">
                    ${escapeHtml(text)}
                </div>

            </div>
        `;
    }

    function listItemHtml(
        item,
        actionLabel = 'Open',
        action = 'open-item'
    ) {

        return `

            <div class="cdc-list-item">

                <div class="cdc-list-main">

                    <p class="cdc-list-title">
                        ${escapeHtml(
                            item.title ||
                            'Untitled'
                        )}
                    </p>

                    <div class="cdc-list-meta">
                        ${escapeHtml(
                            truncate(
                                item.description ||
                                item.category ||
                                '',
                                150
                            )
                        )}
                    </div>

                    <div class="cdc-chip-row">

                        ${
                            item.category
                                ? `
                                    <span class="cdc-chip">
                                        ${escapeHtml(
                                            item.category
                                        )}
                                    </span>
                                `
                                : ''
                        }

                        ${
                            item.rights
                                ? `
                                    <span class="cdc-chip">
                                        Rights:
                                        ${escapeHtml(
                                            item.rights
                                        )}
                                    </span>
                                `
                                : ''
                        }

                    </div>

                </div>

                <div class="cdc-list-actions">

                    <button
                        type="button"
                        class="cdc-btn cdc-btn-small"
                        data-item-action="${escapeHtml(
                            action
                        )}"
                        data-item-id="${escapeHtml(
                            getItemId(item)
                        )}"
                    >
                        ${escapeHtml(
                            actionLabel
                        )}
                    </button>

                </div>

            </div>
        `;
    }

    function cardHtml(item) {

        return `

            <article
                class="cdc-card cdc-card-clickable"
                data-item-id="${escapeHtml(
                    getItemId(item)
                )}"
            >

                <div class="cdc-card-icon">
                    ${iconForItem(item)}
                </div>

                <h3 class="cdc-card-title">
                    ${escapeHtml(
                        item.title
                    )}
                </h3>

                <p class="cdc-card-text">
                    ${escapeHtml(
                        item.description
                    )}
                </p>

                <div class="cdc-chip-row">

                    ${
                        item.category
                            ? `
                                <span class="cdc-chip">
                                    ${escapeHtml(
                                        item.category
                                    )}
                                </span>
                            `
                            : ''
                    }

                    ${
                        item.type
                            ? `
                                <span class="cdc-chip">
                                    ${escapeHtml(
                                        item.type
                                    )}
                                </span>
                            `
                            : ''
                    }

                </div>

            </article>
        `;
    }

    function iconForItem(item) {

        if (!item) {
            return '📄';
        }

        if (
            item.type === 'dpdx' ||
            item.category === 'parasitology'
        ) {
            return '🔬';
        }

        if (item.type === 'image') {
            return '🖼️';
        }

        if (item.type === 'procedure') {
            return '🧪';
        }

        if (item.type === 'algorithm') {
            return '🔀';
        }

        if (item.type === 'quiz') {
            return '❓';
        }

        if (item.type === 'case') {
            return '🩺';
        }

        return '📚';
    }

    /* ============================================================
       CATEGORY VIEWS
       ============================================================ */

    function renderCategoryView(
        category
    ) {

        const resources =
            CATEGORY_RESOURCES[
                category
            ] || [];

        const target =
            $(`#cdc${capitalize(category)}Content`);

        if (!target) {
            return;
        }

        if (!resources.length) {

            target.innerHTML =
                emptyHtml(
                    '📚',
                    'No resources loaded',
                    'Search the CDC resource center to populate this area.'
                );

            return;
        }

        target.innerHTML =
            resources
                .map(
                    resource =>
                        cardHtml(
                            normalizeItem(
                                resource
                            )
                        )
                )
                .join('');
    }

    function capitalize(value) {

        return String(value || '')
            .charAt(0)
            .toUpperCase() +
            String(value || '').slice(1);
    }

    function renderAllCategoryViews() {

        [
            'bacteriology',
            'virology',
            'mycology',
            'parasitology',
            'laboratory'
        ]
            .forEach(
                renderCategoryView
            );

        renderProcedureView();
        renderAlgorithmView();
        renderCasesView();
        renderQuizzesView();
    }

    function renderProcedureView() {

        const target =
            $('#cdcProceduresContent');

        if (!target) {
            return;
        }

        const resources =
            CATEGORY_RESOURCES.procedures
                .map(normalizeItem);

        target.innerHTML =
            resources
                .map(
                    item =>
                        listItemHtml(
                            item,
                            'Open',
                            'open-item'
                        )
                )
                .join('');
    }

    function renderAlgorithmView() {

        const target =
            $('#cdcAlgorithmsContent');

        if (!target) {
            return;
        }

        const resources =
            CATEGORY_RESOURCES.algorithms
                .map(normalizeItem);

        target.innerHTML =
            resources
                .map(
                    item =>
                        listItemHtml(
                            item,
                            'Study',
                            'open-item'
                        )
                )
                .join('');
    }

    function renderCasesView() {

        const target =
            $('#cdcCasesContent');

        if (!target) {
            return;
        }

        const cases = [
            {
                title: 'CDC Case Study Workspace',
                description:
                    'Use CDC case material to practise clinical and laboratory reasoning.',
                type: 'case',
                category: 'cases',
                sourceUrl: CDC_URLS.home
            },
            {
                title: 'Laboratory Unknown',
                description:
                    'Build an unknown from specimen, stain, culture and biochemical clues.',
                type: 'case',
                category: 'cases'
            },
            {
                title: 'Parasitology Case',
                description:
                    'Use DPDx resources to identify a parasite from laboratory findings.',
                type: 'case',
                category: 'parasitology',
                sourceUrl: CDC_URLS.dpdx
            }
        ];

        target.innerHTML =
            cases
                .map(
                    item =>
                        cardHtml(
                            normalizeItem(item)
                        )
                )
                .join('');
    }

    function renderQuizzesView() {

        const target =
            $('#cdcQuizzesContent');

        if (!target) {
            return;
        }

        const quizzes = [
            {
                title: 'Organism Identification Quiz',
                description:
                    'Practise identifying organisms from laboratory clues.',
                type: 'quiz',
                category: 'bacteriology'
            },
            {
                title: 'Specimen → Diagnosis Quiz',
                description:
                    'Choose appropriate diagnostic pathways based on specimen and findings.',
                type: 'quiz',
                category: 'laboratory'
            },
            {
                title: 'DPDx Parasitology Quiz',
                description:
                    'Use the CDC DPDx educational resources for parasitology practice.',
                type: 'quiz',
                category: 'parasitology',
                sourceUrl: CDC_URLS.dpdx
            }
        ];

        target.innerHTML =
            quizzes
                .map(
                    item =>
                        cardHtml(
                            normalizeItem(item)
                        )
                )
                .join('');
    }

    /* ============================================================
       SEARCH
       ============================================================ */

    async function runSearch(
        query,
        type = ''
    ) {

        const cleaned =
            String(query || '')
                .trim();

        if (!cleaned) {
            return;
        }

        state.progress.searches++;

        state.searches = [
            cleaned,
            ...state.searches.filter(
                value =>
                    normalizeText(value) !==
                    normalizeText(cleaned)
            )
        ].slice(0, 25);

        writeStorage(
            STORAGE.searches,
            state.searches
        );

        saveProgress();

        navigate(
            'search'
        );

        renderSearchLoading(
            cleaned
        );

        /*
         * First preference:
         * existing Year 3 CDC bridge.
         */

        const api =
            window.year3 &&
            window.year3.cdc;

        if (
            api &&
            typeof api.search === 'function'
        ) {

            try {

                const response =
                    await api.search({
                        query: cleaned,
                        type
                    });

                const results =
                    extractSearchResults(
                        response
                    );

                if (results.length) {

                    state.currentSearchResults =
                        results
                            .map(normalizeItem);

                    cacheItems(
                        state.currentSearchResults
                    );

                    renderSearchResults(
                        cleaned,
                        state.currentSearchResults
                    );

                    return;
                }

            } catch (error) {

                console.warn(
                    '[CDC] Parent CDC search failed:',
                    error
                );
            }
        }

        /*
         * Second preference:
         * local cached resources.
         */

        const localResults =
            localSearch(
                cleaned,
                type
            );

        state.currentSearchResults =
            localResults;

        renderSearchResults(
            cleaned,
            localResults
        );
    }

    function extractSearchResults(response) {

        if (Array.isArray(response)) {
            return response;
        }

        if (!response) {
            return [];
        }

        if (Array.isArray(response.results)) {
            return response.results;
        }

        if (Array.isArray(response.items)) {
            return response.items;
        }

        if (
            response.data &&
            Array.isArray(response.data.results)
        ) {
            return response.data.results;
        }

        if (
            response.data &&
            Array.isArray(response.data.items)
        ) {
            return response.data.items;
        }

        return [];
    }

    function localSearch(
        query,
        type
    ) {

        const normalizedQuery =
            normalizeText(
                query
            );

        const pool = [
            ...state.cache,
            ...Object.values(
                CATEGORY_RESOURCES
            ).flat(),
            ...HIGH_YIELD.map(
                item => ({
                    ...item,
                    type: 'high-yield'
                })
            )
        ]
            .map(normalizeItem);

        const unique =
            new Map();

        pool.forEach(item => {

            const haystack =
                normalizeText(
                    [
                        item.title,
                        item.description,
                        item.category,
                        item.subcategory,
                        item.organism,
                        item.specimen,
                        item.stain,
                        item.medium,
                        item.test,
                        item.morphology,
                        item.clinicalSignificance,
                        item.diagnosticClues
                    ].join(' ')
                );

            if (
                haystack.includes(
                    normalizedQuery
                ) &&
                (
                    !type ||
                    item.type === type
                )
            ) {

                unique.set(
                    item.id,
                    item
                );
            }
        });

        return Array.from(
            unique.values()
        ).slice(0, 100);
    }

    function cacheItems(items) {

        if (!Array.isArray(items)) {
            return;
        }

        const map =
            new Map(
                state.cache.map(
                    item => [
                        getItemId(item),
                        item
                    ]
                )
            );

        items.forEach(item => {

            const normalized =
                normalizeItem(item);

            map.set(
                normalized.id,
                normalized
            );
        });

        state.cache =
            Array.from(
                map.values()
            ).slice(0, 500);

        writeStorage(
            STORAGE.cache,
            state.cache
        );
    }

    function renderSearchLoading(query) {

        const summary =
            $('#cdcSearchSummary');

        const results =
            $('#cdcSearchResults');

        if (summary) {

            summary.textContent =
                `Searching CDC resources for “${query}”…`;
        }

        if (results) {

            results.innerHTML = `

                <div class="cdc-empty">

                    <div class="cdc-spinner"></div>

                    <div class="cdc-empty-title">
                        Searching
                    </div>

                    <div class="cdc-empty-text">
                        Checking available CDC integrations and local cache.
                    </div>

                </div>
            `;
        }
    }

    function renderSearchResults(
        query,
        results
    ) {

        const summary =
            $('#cdcSearchSummary');

        const target =
            $('#cdcSearchResults');

        if (summary) {

            summary.textContent =
                `${results.length} result${
                    results.length === 1 ? '' : 's'
                } for “${query}”.`;
        }

        if (!target) {
            return;
        }

        if (!results.length) {

            target.innerHTML =
                emptyHtml(
                    '⌕',
                    'No local results found',
                    'Try a broader search or use the Open CDC button to search CDC directly.'
                );

            return;
        }

        target.innerHTML =
            results
                .map(
                    item =>
                        listItemHtml(
                            item,
                            'Open',
                            'open-item'
                        )
                )
                .join('');
    }

    /* ============================================================
       IMAGES
       ============================================================ */

    function renderImages(
        items = state.cache
    ) {

        const target =
            $('#cdcImageGrid');

        if (!target) {
            return;
        }

        const images =
            items
                .map(normalizeItem)
                .filter(
                    item =>
                        item.type === 'image' ||
                        item.imageUrl
                )
                .slice(0, 100);

        if (!images.length) {

            target.innerHTML =
                emptyHtml(
                    '🖼️',
                    'No cached CDC images',
                    'Images can be added through a supported CDC image integration. Remote images are not embedded automatically when the parent application CSP blocks external image hosts.'
                );

            return;
        }

        target.innerHTML =
            images
                .map(item => {

                    const imageUrl =
                        safeUrl(
                            item.imageUrl
                        );

                    const visual =
                        imageUrl
                            ? `
                                <img
                                    class="cdc-image"
                                    src="${escapeHtml(
                                        imageUrl
                                    )}"
                                    alt="${escapeHtml(
                                        item.title
                                    )}"
                                    loading="lazy"
                                >
                            `
                            : `
                                <div class="cdc-image-placeholder">
                                    Image available from original source
                                </div>
                            `;

                    return `

                        <article class="cdc-image-card">

                            ${visual}

                            <div class="cdc-image-meta">

                                <div class="cdc-card-title">
                                    ${escapeHtml(
                                        item.title
                                    )}
                                </div>

                                <div class="cdc-chip-row">

                                    <span class="cdc-chip">
                                        ${escapeHtml(
                                            item.rights || 'Unknown rights'
                                        )}
                                    </span>

                                </div>

                                <div class="cdc-card-actions">

                                    <button
                                        type="button"
                                        class="cdc-btn cdc-btn-small"
                                        data-item-id="${escapeHtml(
                                            item.id
                                        )}"
                                        data-item-action="open-item"
                                    >
                                        Open
                                    </button>

                                </div>

                            </div>

                        </article>
                    `;
                })
                .join('');
    }

    /* ============================================================
       BOOKMARKS
       ============================================================ */

    function renderBookmarks() {

        const body =
            state.bookmarks.length

                ? `
                    <div class="cdc-list">
                        ${
                            state.bookmarks
                                .map(
                                    item =>
                                        listItemHtml(
                                            item,
                                            'Open',
                                            'open-item'
                                        )
                                )
                                .join('')
                        }
                    </div>
                `

                : emptyHtml(
                    '★',
                    'No bookmarks',
                    'Bookmark CDC resources to build your personal study collection.'
                );

        showModal(
            'CDC Bookmarks',
            body
        );
    }

    /* ============================================================
       HISTORY
       ============================================================ */

    function renderHistory() {

        const body =
            state.history.length

                ? `
                    <div class="cdc-list">
                        ${
                            state.history
                                .map(
                                    item =>
                                        listItemHtml(
                                            item,
                                            'Open',
                                            'open-item'
                                        )
                                )
                                .join('')
                        }
                    </div>
                `

                : emptyHtml(
                    '↺',
                    'No history',
                    'Your recently opened CDC resources will appear here.'
                );

        showModal(
            'CDC History',
            body
        );
    }

    /* ============================================================
       FIND ITEM
       ============================================================ */

    function findItemById(id) {

        const sources = [
            state.currentSearchResults,
            state.cache,
            state.bookmarks,
            state.history,
            ...Object.values(
                CATEGORY_RESOURCES
            ).flat()
        ];

        for (const item of sources) {

            if (
                getItemId(item) ===
                String(id)
            ) {

                return normalizeItem(
                    item
                );
            }
        }

        return null;
    }

    /* ============================================================
       SPOTTER
       ============================================================ */

    function renderSpotter() {

        const target =
            $('#cdcSpotterContent');

        if (!target) {
            return;
        }

        const d =
            state.spotterDraft;

        target.innerHTML = `

            <div class="cdc-two">

                <div>

                    <form
                        id="cdcSpotterForm"
                        class="cdc-form"
                    >

                        <div class="cdc-form-row">

                            <div class="cdc-field">

                                <label>
                                    Organism
                                </label>

                                <input
                                    name="organism"
                                    value="${escapeHtml(
                                        d.organism
                                    )}"
                                    placeholder="e.g. Staphylococcus aureus"
                                >

                            </div>

                            <div class="cdc-field">

                                <label>
                                    Category
                                </label>

                                <select name="category">

                                    <option value="">
                                        Select
                                    </option>

                                    ${
                                        [
                                            'Bacteriology',
                                            'Virology',
                                            'Mycology',
                                            'Parasitology'
                                        ]
                                            .map(
                                                option => `
                                                    <option
                                                        ${
                                                            d.category === option
                                                                ? 'selected'
                                                                : ''
                                                        }
                                                    >
                                                        ${option}
                                                    </option>
                                                `
                                            )
                                            .join('')
                                    }

                                </select>

                            </div>

                        </div>

                        <div class="cdc-form-row">

                            <div class="cdc-field">

                                <label>
                                    Specimen
                                </label>

                                <input
                                    name="specimen"
                                    value="${escapeHtml(
                                        d.specimen
                                    )}"
                                    placeholder="Blood, urine, stool..."
                                >

                            </div>

                            <div class="cdc-field">

                                <label>
                                    Stain
                                </label>

                                <input
                                    name="stain"
                                    value="${escapeHtml(
                                        d.stain
                                    )}"
                                    placeholder="Gram, ZN, Giemsa..."
                                >

                            </div>

                        </div>

                        <div class="cdc-form-row">

                            <div class="cdc-field">

                                <label>
                                    Culture medium
                                </label>

                                <input
                                    name="medium"
                                    value="${escapeHtml(
                                        d.medium
                                    )}"
                                    placeholder="Blood agar, MacConkey..."
                                >

                            </div>

                            <div class="cdc-field">

                                <label>
                                    Biochemical test
                                </label>

                                <input
                                    name="test"
                                    value="${escapeHtml(
                                        d.test
                                    )}"
                                    placeholder="Catalase, oxidase..."
                                >

                            </div>

                        </div>

                        <div class="cdc-field">

                            <label>
                                Morphology
                            </label>

                            <textarea
                                name="morphology"
                                placeholder="Shape, arrangement, colony morphology..."
                            >${escapeHtml(
                                d.morphology
                            )}</textarea>

                        </div>

                        <div class="cdc-field">

                            <label>
                                Diagnostic clues
                            </label>

                            <textarea
                                name="diagnosticClues"
                                placeholder="Key laboratory clues..."
                            >${escapeHtml(
                                d.diagnosticClues
                            )}</textarea>

                        </div>

                        <div class="cdc-field">

                            <label>
                                Clinical significance
                            </label>

                            <textarea
                                name="clinicalSignificance"
                                placeholder="Clinical associations..."
                            >${escapeHtml(
                                d.clinicalSignificance
                            )}</textarea>

                        </div>

                        <div class="cdc-form-row">

                            <div class="cdc-field">

                                <label>
                                    Difficulty
                                </label>

                                <select name="difficulty">

                                    ${
                                        [
                                            'Easy',
                                            'Medium',
                                            'Hard',
                                            'Expert'
                                        ]
                                            .map(
                                                option => `
                                                    <option
                                                        ${
                                                            d.difficulty === option
                                                                ? 'selected'
                                                                : ''
                                                        }
                                                    >
                                                        ${option}
                                                    </option>
                                                `
                                            )
                                            .join('')
                                    }

                                </select>

                            </div>

                            <div class="cdc-field">

                                <label>
                                    Rights
                                </label>

                                <select name="rights">

                                    ${
                                        [
                                            'Public Domain',
                                            'Copyrighted',
                                            'Restricted',
                                            'Unknown',
                                            'Needs Verification'
                                        ]
                                            .map(
                                                option => `
                                                    <option
                                                        ${
                                                            d.rights === option
                                                                ? 'selected'
                                                                : ''
                                                        }
                                                    >
                                                        ${option}
                                                    </option>
                                                `
                                            )
                                            .join('')
                                    }

                                </select>

                            </div>

                        </div>

                        <div class="cdc-card-actions">

                            <button
                                type="submit"
                                class="cdc-btn cdc-btn-primary"
                            >
                                Save Spotter
                            </button>

                            <button
                                type="button"
                                class="cdc-btn"
                                data-action="spotter-practice"
                            >
                                Practice
                            </button>

                            <button
                                type="button"
                                class="cdc-btn"
                                data-action="spotter-ai"
                            >
                                Ask AI
                            </button>

                        </div>

                    </form>

                </div>

                <div>

                    <div class="cdc-section">

                        <div class="cdc-section-head">

                            <div>
                                <h3 class="cdc-section-title">
                                    Spotter Metadata
                                </h3>
                            </div>

                        </div>

                        <div
                            id="cdcSpotterPreview"
                        ></div>

                    </div>

                    <div class="cdc-notice">
                        <strong>Provenance:</strong>
                        CDC Spotter entries should retain the original
                        CDC provider, source URL and applicable rights information.
                    </div>

                </div>

            </div>
        `;

        renderSpotterPreview();
    }

    function collectSpotterForm() {

        const form =
            $('#cdcSpotterForm');

        if (!form) {
            return;
        }

        const data =
            new FormData(form);

        const fields = [
            'organism',
            'category',
            'specimen',
            'stain',
            'medium',
            'test',
            'morphology',
            'clinicalSignificance',
            'diagnosticClues',
            'commonConfusions',
            'difficulty',
            'source',
            'sourceUrl',
            'rights',
            'attribution'
        ];

        fields.forEach(
            field => {

                if (
                    data.has(field)
                ) {

                    state.spotterDraft[field] =
                        String(
                            data.get(field) || ''
                        );
                }
            }
        );

        writeStorage(
            STORAGE.spotter,
            state.spotterDraft
        );
    }

    function renderSpotterPreview() {

        const target =
            $('#cdcSpotterPreview');

        if (!target) {
            return;
        }

        const d =
            state.spotterDraft;

        const entries = [
            ['Organism', d.organism],
            ['Category', d.category],
            ['Specimen', d.specimen],
            ['Stain', d.stain],
            ['Medium', d.medium],
            ['Test', d.test],
            ['Difficulty', d.difficulty],
            ['Rights', d.rights]
        ];

        target.innerHTML = `

            <div class="cdc-list">

                ${
                    entries
                        .map(
                            ([label, value]) => `

                                <div class="cdc-list-item">

                                    <div class="cdc-list-main">

                                        <div class="cdc-list-title">
                                            ${escapeHtml(
                                                label
                                            )}
                                        </div>

                                        <div class="cdc-list-meta">
                                            ${escapeHtml(
                                                value || 'Not provided'
                                            )}
                                        </div>

                                    </div>

                                </div>
                            `
                        )
                        .join('')
                }

            </div>

            ${
                d.diagnosticClues
                    ? `
                        <div class="cdc-notice" style="margin-top:12px;">
                            <strong>Diagnostic clues:</strong><br>
                            ${escapeHtml(
                                d.diagnosticClues
                            )}
                        </div>
                    `
                    : ''
            }

        `;
    }

    function addCurrentResourceToSpotter() {

        const item =
            state.currentItem;

        if (!item) {
            return;
        }

        state.spotterDraft = {
            ...state.spotterDraft,

            organism:
                item.organism ||
                state.spotterDraft.organism,

            category:
                item.category ||
                state.spotterDraft.category,

            specimen:
                item.specimen ||
                state.spotterDraft.specimen,

            stain:
                item.stain ||
                state.spotterDraft.stain,

            medium:
                item.medium ||
                state.spotterDraft.medium,

            test:
                item.test ||
                state.spotterDraft.test,

            morphology:
                item.morphology ||
                state.spotterDraft.morphology,

            clinicalSignificance:
                item.clinicalSignificance ||
                state.spotterDraft.clinicalSignificance,

            diagnosticClues:
                item.diagnosticClues ||
                state.spotterDraft.diagnosticClues,

            commonConfusions:
                item.commonConfusions ||
                state.spotterDraft.commonConfusions,

            source:
                item.provider ||
                'CDC',

            sourceUrl:
                item.sourceUrl ||
                '',

            rights:
                item.rights ||
                'Unknown',

            attribution:
                item.attribution ||
                ''
        };

        writeStorage(
            STORAGE.spotter,
            state.spotterDraft
        );

        closeModal();

        navigate(
            'spotter'
        );

        renderSpotter();
    }

    function startSpotterPractice() {

        state.progress.spotterSessions++;

        saveProgress();

        const d =
            state.spotterDraft;

        if (!d.organism) {

            showModal(
                'Spotter Practice',
                `
                    <div class="cdc-notice">
                        Add an organism or diagnostic clues before starting practice.
                    </div>
                `
            );

            return;
        }

        showModal(
            'Spotter Practice',
            `

                <div>

                    <div class="cdc-chip-row">

                        <span class="cdc-chip cdc-chip-primary">
                            ${escapeHtml(
                                d.category || 'Microbiology'
                            )}
                        </span>

                        <span class="cdc-chip">
                            ${escapeHtml(
                                d.difficulty || 'Medium'
                            )}
                        </span>

                    </div>

                    <h3 style="margin:14px 0 6px;">
                        Identify the organism
                    </h3>

                    <p class="cdc-card-text">
                        Review the available laboratory clues
                        and determine the most likely identification.
                    </p>

                    ${
                        d.specimen
                            ? `
                                <div class="cdc-list-item" style="margin-top:12px;">
                                    <div class="cdc-list-main">
                                        <div class="cdc-list-title">
                                            Specimen
                                        </div>
                                        <div class="cdc-list-meta">
                                            ${escapeHtml(
                                                d.specimen
                                            )}
                                        </div>
                                    </div>
                                </div>
                            `
                            : ''
                    }

                    ${
                        d.stain
                            ? `
                                <div class="cdc-list-item">
                                    <div class="cdc-list-main">
                                        <div class="cdc-list-title">
                                            Stain
                                        </div>
                                        <div class="cdc-list-meta">
                                            ${escapeHtml(
                                                d.stain
                                            )}
                                        </div>
                                    </div>
                                </div>
                            `
                            : ''
                    }

                    ${
                        d.test
                            ? `
                                <div class="cdc-list-item">
                                    <div class="cdc-list-main">
                                        <div class="cdc-list-title">
                                            Test
                                        </div>
                                        <div class="cdc-list-meta">
                                            ${escapeHtml(
                                                d.test
                                            )}
                                        </div>
                                    </div>
                                </div>
                            `
                            : ''
                    }

                    <button
                        type="button"
                        class="cdc-btn cdc-btn-primary"
                        style="margin-top:14px;"
                        data-action="spotter-reveal"
                    >
                        Reveal Answer
                    </button>

                </div>
            `
        );
    }

    function revealSpotterAnswer() {

        const d =
            state.spotterDraft;

        showModal(
            'Spotter Answer',
            `

                <div class="cdc-notice">

                    <strong>
                        Most likely organism:
                    </strong>

                    <div style="margin-top:6px;font-size:18px;">
                        ${escapeHtml(
                            d.organism || 'Not specified'
                        )}
                    </div>

                </div>

                ${
                    d.diagnosticClues
                        ? `
                            <div class="cdc-section" style="margin-top:12px;">
                                <strong>
                                    Diagnostic clues
                                </strong>

                                <p class="cdc-card-text">
                                    ${escapeHtml(
                                        d.diagnosticClues
                                    )}
                                </p>
                            </div>
                        `
                        : ''
                }

            `
        );
    }

    /* ============================================================
       NOTES
       ============================================================ */

    function renderNotes() {

        const target =
            $('#cdcNotesList');

        if (!target) {
            return;
        }

        if (!state.notes.length) {

            target.innerHTML =
                emptyHtml(
                    '📝',
                    'No notes',
                    'Create your first CDC study note.'
                );

            return;
        }

        target.innerHTML =
            state.notes
                .map(
                    note => `

                        <div class="cdc-list-item">

                            <div class="cdc-list-main">

                                <div class="cdc-list-title">
                                    ${escapeHtml(
                                        note.title
                                    )}
                                </div>

                                <div class="cdc-list-meta">
                                    ${escapeHtml(
                                        truncate(
                                            note.body,
                                            180
                                        )
                                    )}
                                </div>

                            </div>

                            <div class="cdc-list-actions">

                                <button
                                    type="button"
                                    class="cdc-btn cdc-btn-small"
                                    data-note-id="${escapeHtml(
                                        note.id
                                    )}"
                                    data-action="delete-note"
                                >
                                    Delete
                                </button>

                            </div>

                        </div>
                    `
                )
                .join('');
    }

    function saveNote() {

        const title =
            $('#cdcNoteTitle')?.value.trim();

        const body =
            $('#cdcNoteBody')?.value.trim();

        if (!title && !body) {

            showModal(
                'Note',
                `
                    <div class="cdc-notice cdc-notice-warning">
                        Enter a title or note content.
                    </div>
                `
            );

            return;
        }

        const note = {
            id:
                `cdc-note-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 8)}`,

            title:
                title || 'CDC Study Note',

            body:
                body || '',

            resource:
                state.currentItem
                    ? {
                        id:
                            state.currentItem.id,
                        title:
                            state.currentItem.title
                    }
                    : null,

            createdAt:
                nowIso()
        };

        state.notes.unshift(
            note
        );

        writeStorage(
            STORAGE.notes,
            state.notes
        );

        const titleInput =
            $('#cdcNoteTitle');

        const bodyInput =
            $('#cdcNoteBody');

        if (titleInput) {
            titleInput.value = '';
        }

        if (bodyInput) {
            bodyInput.value = '';
        }

        renderNotes();
    }

    function deleteNote(id) {

        state.notes =
            state.notes.filter(
                note =>
                    String(note.id) !==
                    String(id)
            );

        writeStorage(
            STORAGE.notes,
            state.notes
        );

        renderNotes();
    }

    /* ============================================================
       FLASHCARDS
       ============================================================ */

    function renderFlashcards() {

        const target =
            $('#cdcFlashcardsContent');

        if (!target) {
            return;
        }

        target.innerHTML = `

            <div class="cdc-two">

                <div>

                    <div class="cdc-notice">
                        Create flashcards from the current CDC resource
                        or enter your own prompt.
                    </div>

                    <div
                        class="cdc-card"
                        style="margin-top:12px;"
                    >

                        <div class="cdc-field">

                            <label>
                                Front
                            </label>

                            <input
                                id="cdcFlashcardFront"
                                type="text"
                                placeholder="Question / prompt"
                            >

                        </div>

                        <div
                            class="cdc-field"
                            style="margin-top:10px;"
                        >

                            <label>
                                Back
                            </label>

                            <textarea
                                id="cdcFlashcardBack"
                                placeholder="Answer / explanation"
                            ></textarea>

                        </div>

                        <button
                            type="button"
                            class="cdc-btn cdc-btn-primary"
                            style="margin-top:10px;"
                            data-action="save-flashcard"
                        >
                            Save Flashcard
                        </button>

                    </div>

                </div>

                <div>

                    <div class="cdc-list">

                        ${
                            state.flashcards.length
                                ? state.flashcards
                                    .map(
                                        card => `

                                            <div class="cdc-list-item">

                                                <div class="cdc-list-main">

                                                    <div class="cdc-list-title">
                                                        ${escapeHtml(
                                                            card.front
                                                        )}
                                                    </div>

                                                    <div class="cdc-list-meta">
                                                        ${escapeHtml(
                                                            truncate(
                                                                card.back,
                                                                180
                                                            )
                                                        )}
                                                    </div>

                                                </div>

                                            </div>
                                        `
                                    )
                                    .join('')
                                : emptyHtml(
                                    '▣',
                                    'No flashcards',
                                    'Your CDC flashcards will appear here.'
                                )
                        }

                    </div>

                </div>

            </div>
        `;
    }

    function saveFlashcard() {

        const front =
            $('#cdcFlashcardFront')
                ?.value
                .trim();

        const back =
            $('#cdcFlashcardBack')
                ?.value
                .trim();

        if (!front || !back) {
            return;
        }

        const card = {
            id:
                `cdc-card-${Date.now()}`,

            front,
            back,

            resource:
                state.currentItem
                    ? {
                        id:
                            state.currentItem.id,
                        title:
                            state.currentItem.title
                    }
                    : null,

            createdAt:
                nowIso()
        };

        state.flashcards.unshift(
            card
        );

        writeStorage(
            STORAGE.flashcards,
            state.flashcards
        );

        renderFlashcards();
    }

    function createFlashcardFromCurrent() {

        const item =
            state.currentItem;

        if (!item) {
            return;
        }

        closeModal();

        navigate(
            'flashcards'
        );

        renderFlashcards();

        const front =
            $('#cdcFlashcardFront');

        const back =
            $('#cdcFlashcardBack');

        if (front) {

            front.value =
                `What is important about ${item.title}?`;
        }

        if (back) {

            back.value =
                item.description ||
                item.diagnosticClues ||
                '';
        }
    }

    /* ============================================================
       QUESTIONS
       ============================================================ */

    function renderQuestions() {

        const target =
            $('#cdcQuestionsContent');

        if (!target) {
            return;
        }

        target.innerHTML = `

            <div class="cdc-two">

                <div>

                    <div class="cdc-card">

                        <div class="cdc-card-title">
                            Create Question
                        </div>

                        <div
                            class="cdc-field"
                            style="margin-top:10px;"
                        >

                            <label>
                                Question
                            </label>

                            <textarea
                                id="cdcQuestionText"
                                placeholder="Write an exam-style question..."
                            ></textarea>

                        </div>

                        <div
                            class="cdc-field"
                            style="margin-top:10px;"
                        >

                            <label>
                                Answer
                            </label>

                            <textarea
                                id="cdcQuestionAnswer"
                                placeholder="Correct answer / explanation..."
                            ></textarea>

                        </div>

                        <button
                            type="button"
                            class="cdc-btn cdc-btn-primary"
                            style="margin-top:10px;"
                            data-action="save-question"
                        >
                            Save Question
                        </button>

                    </div>

                </div>

                <div>

                    <div class="cdc-list">

                        ${
                            state.questions.length
                                ? state.questions
                                    .map(
                                        question => `

                                            <div class="cdc-list-item">

                                                <div class="cdc-list-main">

                                                    <div class="cdc-list-title">
                                                        ${escapeHtml(
                                                            question.question
                                                        )}
                                                    </div>

                                                    <div class="cdc-list-meta">
                                                        ${escapeHtml(
                                                            truncate(
                                                                question.answer,
                                                                180
                                                            )
                                                        )}
                                                    </div>

                                                </div>

                                            </div>
                                        `
                                    )
                                    .join('')
                                : emptyHtml(
                                    '?',
                                    'No questions',
                                    'Your CDC questions will appear here.'
                                )
                        }

                    </div>

                </div>

            </div>
        `;
    }

    function saveQuestion() {

        const question =
            $('#cdcQuestionText')
                ?.value
                .trim();

        const answer =
            $('#cdcQuestionAnswer')
                ?.value
                .trim();

        if (!question || !answer) {
            return;
        }

        state.questions.unshift({
            id:
                `cdc-question-${Date.now()}`,

            question,
            answer,

            resource:
                state.currentItem
                    ? {
                        id:
                            state.currentItem.id,
                        title:
                            state.currentItem.title
                    }
                    : null,

            createdAt:
                nowIso()
        });

        writeStorage(
            STORAGE.questions,
            state.questions
        );

        renderQuestions();
    }

    function createQuestionFromCurrent() {

        const item =
            state.currentItem;

        if (!item) {
            return;
        }

        closeModal();

        navigate(
            'questions'
        );

        renderQuestions();

        const question =
            $('#cdcQuestionText');

        const answer =
            $('#cdcQuestionAnswer');

        if (question) {

            question.value =
                `A patient has a laboratory finding related to ${item.title}. What is the most appropriate interpretation?`;
        }

        if (answer) {

            answer.value =
                item.diagnosticClues ||
                item.description ||
                '';
        }
    }

    /* ============================================================
       AI
       ============================================================ */

    async function askAI(
        question,
        item = state.currentItem
    ) {

        const cleaned =
            String(question || '')
                .trim();

        if (!cleaned) {
            return;
        }

        state.progress.aiQuestions++;

        saveProgress();

        const ai =
            window.year3 &&
            window.year3.ai;

        if (
            !ai ||
            typeof ai.ask !== 'function'
        ) {

            showModal(
                'CDC AI',
                `
                    <div class="cdc-notice cdc-notice-warning">
                        The Year 3 AI bridge is not currently available.
                        The CDC module itself is functioning, but no AI provider
                        has been exposed to this renderer.
                    </div>
                `
            );

            return;
        }

        const normalized =
            item
                ? normalizeItem(item)
                : null;

        const payload = {

            moduleId:
                MODULE_ID,

            source:
                MODULE_NAME,

            task:
                'medical_study_assistance',

            question:
                cleaned,

            context: {

                title:
                    normalized?.title || '',

                type:
                    normalized?.type || '',

                description:
                    normalized?.description || '',

                category:
                    normalized?.category || '',

                subcategory:
                    normalized?.subcategory || '',

                organism:
                    normalized?.organism || '',

                specimen:
                    normalized?.specimen || '',

                stain:
                    normalized?.stain || '',

                medium:
                    normalized?.medium || '',

                test:
                    normalized?.test || '',

                morphology:
                    normalized?.morphology || '',

                clinicalSignificance:
                    normalized?.clinicalSignificance || '',

                diagnosticClues:
                    normalized?.diagnosticClues || '',

                commonConfusions:
                    normalized?.commonConfusions || '',

                provider:
                    normalized?.provider || 'CDC',

                provenance:
                    normalized?.provenance || null,

                rights:
                    normalized?.rights || 'Unknown',

                attribution:
                    normalized?.attribution || '',

                sourceUrl:
                    normalized?.sourceUrl || ''
            },

            instructions: [

                'Provide medically educational information.',

                'Do not fabricate CDC-specific content.',

                'Distinguish general medical knowledge from CDC-specific information.',

                'If the supplied CDC source context does not support a claim, say so.',

                'Preserve source and rights information.',

                'Do not imply CDC endorsement of generated interpretations.',

                'Prefer structured explanations suitable for a medical student.',

                'Highlight important laboratory clues when relevant.',

                'State uncertainty where appropriate.'
            ]
        };

        showModal(
            'CDC AI',
            `
                <div class="cdc-empty">

                    <div class="cdc-spinner"></div>

                    <div class="cdc-empty-title">
                        Asking Year 3 AI
                    </div>

                    <div class="cdc-empty-text">
                        Processing your CDC study question…
                    </div>

                </div>
            `
        );

        try {

            const response =
                await ai.ask(
                    payload
                );

            const text =
                extractAIText(
                    response
                );

            showModal(
                'CDC AI Response',
                `

                    <div class="cdc-notice">
                        <strong>
                            Source context:
                        </strong>

                        ${
                            normalized
                                ? escapeHtml(
                                    normalized.title
                                )
                                : 'CDC Resource Center'
                        }
                    </div>

                    <div
                        class="cdc-section"
                        style="margin-top:12px;"
                    >

                        <div
                            style="
                                white-space:pre-wrap;
                                line-height:1.7;
                                font-size:13px;
                            "
                        >
                            ${escapeHtml(
                                text ||
                                'The AI returned no readable response.'
                            )}
                        </div>

                    </div>

                `
            );

        } catch (error) {

            console.error(
                '[CDC] AI request failed:',
                error
            );

            showModal(
                'CDC AI Error',
                `
                    <div class="cdc-notice cdc-notice-warning">
                        The AI request could not be completed.
                    </div>

                    <div class="cdc-card" style="margin-top:12px;">
                        ${escapeHtml(
                            error?.message ||
                            'Unknown AI error.'
                        )}
                    </div>
                `
            );
        }
    }

    function extractAIText(response) {

        if (typeof response === 'string') {
            return response;
        }

        if (!response) {
            return '';
        }

        const candidates = [
            response.answer,
            response.response,
            response.text,
            response.content,
            response.message,
            response.output
        ];

        for (const candidate of candidates) {

            if (
                typeof candidate === 'string' &&
                candidate.trim()
            ) {

                return candidate;
            }
        }

        if (
            response.data &&
            typeof response.data === 'object'
        ) {

            return extractAIText(
                response.data
            );
        }

        return '';
    }

    function askAIFromCurrent() {

        const item =
            state.currentItem;

        closeModal();

        navigate(
            'ai'
        );

        const question =
            $('#cdcAiQuestion');

        if (question && item) {

            question.value =
                `Explain the important microbiology and diagnostic points for ${item.title}.`;
        }

        const output =
            $('#cdcAiOutput');

        if (output) {

            output.innerHTML = '';
        }
    }

    /* ============================================================
       KNOWLEDGE GRAPH
       ============================================================ */

    function renderKnowledge() {

        const target =
            $('#cdcKnowledgeContent');

        if (!target) {
            return;
        }

        const item =
            state.currentItem;

        if (!item) {

            target.innerHTML = `

                <div class="cdc-notice">
                    Open a CDC resource first to build a knowledge graph context.
                </div>

                <div class="cdc-grid" style="margin-top:12px;">

                    <div class="cdc-card">
                        <div class="cdc-card-icon">🦠</div>
                        <div class="cdc-card-title">
                            Organism
                        </div>
                        <div class="cdc-card-text">
                            Links organism identity to disease and laboratory findings.
                        </div>
                    </div>

                    <div class="cdc-card">
                        <div class="cdc-card-icon">🧪</div>
                        <div class="cdc-card-title">
                            Test
                        </div>
                        <div class="cdc-card-text">
                            Links diagnostic tests to organisms and specimens.
                        </div>
                    </div>

                    <div class="cdc-card">
                        <div class="cdc-card-icon">🧫</div>
                        <div class="cdc-card-title">
                            Specimen
                        </div>
                        <div class="cdc-card-text">
                            Links specimen selection to diagnostic pathways.
                        </div>
                    </div>

                    <div class="cdc-card">
                        <div class="cdc-card-icon">🩺</div>
                        <div class="cdc-card-title">
                            Disease
                        </div>
                        <div class="cdc-card-text">
                            Connects CDC resources to clinical context.
                        </div>
                    </div>

                </div>
            `;

            return;
        }

        const nodes = [
            {
                label: 'Resource',
                value: item.title
            },
            {
                label: 'Organism',
                value: item.organism
            },
            {
                label: 'Specimen',
                value: item.specimen
            },
            {
                label: 'Stain',
                value: item.stain
            },
            {
                label: 'Test',
                value: item.test
            },
            {
                label: 'Category',
                value: item.category
            }
        ].filter(
            node => node.value
        );

        target.innerHTML = `

            <div class="cdc-notice">
                Current CDC context:
                <strong>
                    ${escapeHtml(
                        item.title
                    )}
                </strong>
            </div>

            <div class="cdc-grid" style="margin-top:12px;">

                ${
                    nodes
                        .map(
                            node => `

                                <div class="cdc-card">

                                    <div class="cdc-card-icon">
                                        🔗
                                    </div>

                                    <div class="cdc-card-title">
                                        ${escapeHtml(
                                            node.label
                                        )}
                                    </div>

                                    <div class="cdc-card-text">
                                        ${escapeHtml(
                                            node.value
                                        )}
                                    </div>

                                </div>
                            `
                        )
                        .join('')
                }

            </div>

            <div class="cdc-card-actions" style="margin-top:14px;">

                <button
                    type="button"
                    class="cdc-btn"
                    data-action="graph-export"
                >
                    Send to Knowledge Graph
                </button>

            </div>
        `;
    }

    function sendToKnowledgeGraph() {

        const item =
            state.currentItem;

        if (!item) {
            return;
        }

        const graph =
            window.year3 &&
            window.year3.knowledgeGraph;

        if (
            graph &&
            typeof graph.addEntity === 'function'
        ) {

            try {

                graph.addEntity({
                    moduleId:
                        MODULE_ID,

                    source:
                        'CDC',

                    entity:
                        normalizeItem(item)
                });

                showModal(
                    'Knowledge Graph',
                    `
                        <div class="cdc-notice cdc-notice-success">
                            CDC resource sent to the available Knowledge Graph integration.
                        </div>
                    `
                );

                return;

            } catch (error) {

                console.warn(
                    '[CDC] Knowledge graph integration failed:',
                    error
                );
            }
        }

        showModal(
            'Knowledge Graph',
            `
                <div class="cdc-notice cdc-notice-warning">
                    No compatible Knowledge Graph bridge is currently exposed.
                    The CDC resource context is ready for integration.
                </div>
            `
        );
    }

    /* ============================================================
       PROGRESS VIEW
       ============================================================ */

    function renderProgress() {

        const target =
            $('#cdcProgressContent');

        if (!target) {
            return;
        }

        const values = [
            {
                title: 'Resources viewed',
                value:
                    state.progress.resourcesViewed,
                goal: 25
            },
            {
                title: 'DPDx resources',
                value:
                    state.progress.dpdxViewed,
                goal: 10
            },
            {
                title: 'Images reviewed',
                value:
                    state.progress.imagesReviewed,
                goal: 20
            },
            {
                title: 'Spotter sessions',
                value:
                    state.progress.spotterSessions,
                goal: 10
            }
        ];

        target.innerHTML = `

            <div class="cdc-grid">

                ${
                    values
                        .map(
                            entry => {

                                const percent =
                                    Math.min(
                                        100,
                                        Math.round(
                                            (
                                                entry.value /
                                                entry.goal
                                            ) *
                                            100
                                        )
                                    );

                                return `

                                    <div class="cdc-card">

                                        <div class="cdc-card-title">
                                            ${escapeHtml(
                                                entry.title
                                            )}
                                        </div>

                                        <div
                                            style="
                                                margin-top:9px;
                                                font-size:24px;
                                                font-weight:850;
                                            "
                                        >
                                            ${entry.value}
                                        </div>

                                        <div
                                            class="cdc-progress"
                                            style="margin-top:10px;"
                                        >
                                            <span
                                                style="
                                                    width:${percent}%;
                                                "
                                            ></span>
                                        </div>

                                        <div
                                            class="cdc-card-text"
                                        >
                                            ${percent}% of starter goal
                                        </div>

                                    </div>
                                `;
                            }
                        )
                        .join('')
                }

            </div>
        `;
    }

    /* ============================================================
       HIGH YIELD
       ============================================================ */

    function renderHighYield() {

        const target =
            $('#cdcHighYieldContent');

        if (!target) {
            return;
        }

        target.innerHTML =
            HIGH_YIELD
                .map(
                    item => `

                        <article class="cdc-card">

                            <div class="cdc-card-icon">
                                ⚡
                            </div>

                            <h3 class="cdc-card-title">
                                ${escapeHtml(
                                    item.title
                                )}
                            </h3>

                            <p class="cdc-card-text">
                                ${escapeHtml(
                                    item.description
                                )}
                            </p>

                            <div class="cdc-card-actions">

                                <button
                                    type="button"
                                    class="cdc-btn cdc-btn-primary cdc-btn-small"
                                    data-high-yield-query="${escapeHtml(
                                        item.query
                                    )}"
                                >
                                    Search CDC
                                </button>

                                <button
                                    type="button"
                                    class="cdc-btn cdc-btn-small"
                                    data-high-yield-ai="${escapeHtml(
                                        item.title
                                    )}"
                                >
                                    Ask AI
                                </button>

                            </div>

                        </article>
                    `
                )
                .join('');
    }

    /* ============================================================
       SPECIMEN → DIAGNOSIS
       ============================================================ */

    function renderSpecimenDefault() {

        const target =
            $('#cdcSpecimenOutput');

        if (!target) {
            return;
        }

        target.innerHTML =
            emptyHtml(
                '🧪',
                'Awaiting specimen',
                'Select a specimen and enter diagnostic clues to build a study pathway.'
            );
    }

    function analyzeSpecimen() {

        const specimen =
            $('#cdcSpecimenType')
                ?.value
                .trim();

        const stain =
            $('#cdcStain')
                ?.value
                .trim();

        const clues =
            $('#cdcClinicalClues')
                ?.value
                .trim();

        const target =
            $('#cdcSpecimenOutput');

        if (!target) {
            return;
        }

        const query =
            [
                specimen,
                stain,
                clues
            ]
                .filter(Boolean)
                .join(' ');

        const suggestions = [];

        if (specimen) {

            suggestions.push(
                `Start with appropriate ${specimen.toLowerCase()} handling and diagnostic testing.`
            );
        }

        if (stain) {

            suggestions.push(
                `Interpret the ${stain} result together with morphology and specimen source.`
            );
        }

        if (clues) {

            suggestions.push(
                'Use the clinical and laboratory clues to narrow the differential before confirming identification.'
            );
        }

        if (!suggestions.length) {

            target.innerHTML =
                emptyHtml(
                    '🧪',
                    'More information needed',
                    'Enter at least a specimen or diagnostic clue.'
                );

            return;
        }

        target.innerHTML = `

            <div class="cdc-notice">
                This is a study workflow, not an automatic clinical diagnosis.
            </div>

            <div
                class="cdc-list"
                style="margin-top:12px;"
            >

                ${
                    suggestions
                        .map(
                            suggestion => `

                                <div class="cdc-list-item">

                                    <div class="cdc-list-main">

                                        <div class="cdc-list-title">
                                            Diagnostic step
                                        </div>

                                        <div class="cdc-list-meta">
                                            ${escapeHtml(
                                                suggestion
                                            )}
                                        </div>

                                    </div>

                                </div>
                            `
                        )
                        .join('')
                }

            </div>

            <div class="cdc-card-actions">

                <button
                    type="button"
                    class="cdc-btn cdc-btn-primary"
                    data-specimen-ai="${escapeHtml(
                        query
                    )}"
                >
                    Ask AI About Pathway
                </button>

                <button
                    type="button"
                    class="cdc-btn"
                    data-specimen-search="${escapeHtml(
                        query
                    )}"
                >
                    Search CDC
                </button>

            </div>
        `;
    }

    /* ============================================================
       CACHE / SYNC
       ============================================================ */

    function renderCacheStatus() {

        const target =
            $('#cdcCacheStatus');

        if (!target) {
            return;
        }

        const size =
            state.cache.length;

        const lastSync =
            state.lastSync
                ? new Date(
                    state.lastSync
                ).toLocaleString()
                : 'Never';

        target.innerHTML = `

            <div class="cdc-list">

                <div class="cdc-list-item">

                    <div class="cdc-list-main">

                        <div class="cdc-list-title">
                            Cached resources
                        </div>

                        <div class="cdc-list-meta">
                            ${size}
                        </div>

                    </div>

                </div>

                <div class="cdc-list-item">

                    <div class="cdc-list-main">

                        <div class="cdc-list-title">
                            Last synchronization
                        </div>

                        <div class="cdc-list-meta">
                            ${escapeHtml(
                                lastSync
                            )}
                        </div>

                    </div>

                </div>

            </div>
        `;
    }

    async function syncCDC() {

        const target =
            $('#cdcSyncStatus');

        if (target) {

            target.innerHTML = `
                <div class="cdc-notice">
                    Synchronizing available CDC resource metadata…
                </div>
            `;
        }

        const api =
            window.year3 &&
            window.year3.cdc;

        if (
            api &&
            typeof api.sync === 'function'
        ) {

            try {

                const result =
                    await api.sync();

                const results =
                    extractSearchResults(
                        result
                    );

                if (results.length) {

                    cacheItems(
                        results
                    );
                }

                state.lastSync =
                    nowIso();

                writeStorage(
                    STORAGE.lastSync,
                    state.lastSync
                );

                renderCacheStatus();

                if (target) {

                    target.innerHTML = `
                        <div class="cdc-notice">
                            Synchronization completed.
                        </div>
                    `;
                }

                return;

            } catch (error) {

                console.warn(
                    '[CDC] Parent sync failed:',
                    error
                );
            }
        }

        /*
         * Even without a parent sync service,
         * we can refresh the local catalog.
         */

        const localCatalog =
            Object.values(
                CATEGORY_RESOURCES
            )
                .flat()
                .map(normalizeItem);

        cacheItems(
            localCatalog
        );

        state.lastSync =
            nowIso();

        writeStorage(
            STORAGE.lastSync,
            state.lastSync
        );

        renderCacheStatus();

        if (target) {

            target.innerHTML = `
                <div class="cdc-notice">
                    Local CDC catalog refreshed.
                    No external CDC synchronization bridge is currently available.
                </div>
            `;
        }
    }

    function clearCache() {

        state.cache = [];

        removeStorage(
            STORAGE.cache
        );

        state.lastSync = null;

        removeStorage(
            STORAGE.lastSync
        );

        renderCacheStatus();

        showModal(
            'CDC Cache',
            `
                <div class="cdc-notice">
                    Local CDC cache has been cleared.
                </div>
            `
        );
    }

    /* ============================================================
       GLOBAL MICROBIOLOGY SEARCH
       ============================================================ */

    async function globalMicrobiologySearch(
        query
    ) {

        const microbiology =
            window.year3 &&
            window.year3.microbiology;

        if (
            microbiology &&
            typeof microbiology.search === 'function'
        ) {

            try {

                return await microbiology.search(
                    query
                );

            } catch (error) {

                console.warn(
                    '[CDC] Microbiology search failed:',
                    error
                );
            }
        }

        return null;
    }

    /* ============================================================
       NAVIGATION
       ============================================================ */

    function navigate(
        view
    ) {

        if (!root) {
            return;
        }

        const validViews =
            $all(
                '[data-view]'
            )
                .map(
                    node =>
                        node.dataset.view
                );

        if (
            !validViews.includes(view)
        ) {

            view = 'dashboard';
        }

        state.currentView =
            view;

        $all(
            '.cdc-view'
        )
            .forEach(
                node => {

                    node.classList.toggle(
                        'active',
                        node.dataset.view === view
                    );
                }
            );

        $all(
            '[data-view-target]'
        )
            .forEach(
                button => {

                    button.classList.toggle(
                        'active',
                        button.dataset.viewTarget === view
                    );
                }
            );

        if (view === 'dashboard') {
            renderDashboard();
        }

        if (
            [
                'bacteriology',
                'virology',
                'mycology',
                'parasitology',
                'laboratory'
            ].includes(view)
        ) {

            renderCategoryView(
                view
            );
        }

        if (view === 'procedures') {
            renderProcedureView();
        }

        if (view === 'algorithms') {
            renderAlgorithmView();
        }

        if (view === 'images') {
            renderImages();
        }

        if (view === 'cases') {
            renderCasesView();
        }

        if (view === 'quizzes') {
            renderQuizzesView();
        }

        if (view === 'spotter') {
            renderSpotter();
        }

        if (view === 'notes') {
            renderNotes();
        }

        if (view === 'flashcards') {
            renderFlashcards();
        }

        if (view === 'questions') {
            renderQuestions();
        }

        if (view === 'knowledge') {
            renderKnowledge();
        }

        if (view === 'progress') {
            renderProgress();
        }

        if (view === 'high-yield') {
            renderHighYield();
        }

        if (view === 'specimen') {
            renderSpecimenDefault();
        }

        if (view === 'offline') {
            renderCacheStatus();
        }
    }

    /* ============================================================
       EVENT DELEGATION
       ============================================================ */

    function handleClick(
        event
    ) {

        const target =
            event.target.closest(
                'button, [data-category-card], [data-item-id]'
            );

        if (!target || !root.contains(target)) {
            return;
        }

        /* Navigation */

        const viewTarget =
            target.dataset.viewTarget;

        if (viewTarget) {

            navigate(
                viewTarget
            );

            return;
        }

        /* Category */

        const category =
            target.dataset.categoryCard;

        if (category) {

            navigate(
                category
            );

            return;
        }

        /* General actions */

        const action =
            target.dataset.action;

        if (action) {

            handleAction(
                action,
                target
            );

            return;
        }

        /* Item actions */

        const itemAction =
            target.dataset.itemAction;

        if (itemAction) {

            const item =
                findItemById(
                    target.dataset.itemId
                );

            if (
                itemAction === 'open-item' &&
                item
            ) {

                openItem(
                    item
                );
            }

            return;
        }

        /* Item card */

        if (
            target.dataset.itemId &&
            target.classList.contains(
                'cdc-card-clickable'
            )
        ) {

            const item =
                findItemById(
                    target.dataset.itemId
                );

            if (item) {
                openItem(item);
            }

            return;
        }

        /* High yield */

        if (
            target.dataset.highYieldQuery
        ) {

            runSearch(
                target.dataset.highYieldQuery
            );

            return;
        }

        if (
            target.dataset.highYieldAi
        ) {

            navigate(
                'ai'
            );

            const input =
                $('#cdcAiQuestion');

            if (input) {

                input.value =
                    `Teach me the high-yield microbiology points for ${target.dataset.highYieldAi}.`;
            }

            return;
        }

        /* Specimen */

        if (
            target.dataset.specimenAi
        ) {

            askAI(
                `Help me interpret this specimen-to-diagnosis study pathway: ${target.dataset.specimenAi}`
            );

            return;
        }

        if (
            target.dataset.specimenSearch
        ) {

            runSearch(
                target.dataset.specimenSearch
            );

            return;
        }

        /* Notes */

        if (
            target.dataset.noteId &&
            action === 'delete-note'
        ) {

            deleteNote(
                target.dataset.noteId
            );
        }
    }

    function handleAction(
        action,
        target
    ) {

        switch (action) {

            case 'bookmarks':
                renderBookmarks();
                break;

            case 'history':
                renderHistory();
                break;

            case 'sync':
                syncCDC();
                break;

            case 'clear-cache':
                clearCache();
                break;

            case 'open-cdc':
                openExternal(
                    CDC_URLS.home
                );
                break;

            case 'open-dpdx':
                openExternal(
                    CDC_URLS.dpdx
                );
                break;

            case 'search':
                submitSearch();
                break;

            case 'close-modal':
                closeModal();
                break;

            case 'spotter-practice':
                startSpotterPractice();
                break;

            case 'spotter-reveal':
                revealSpotterAnswer();
                break;

            case 'spotter-ai':
                askAI(
                    buildSpotterAIQuestion()
                );
                break;

            case 'save-flashcard':
                saveFlashcard();
                break;

            case 'save-question':
                saveQuestion();
                break;

            case 'graph-export':
                sendToKnowledgeGraph();
                break;

            default:
                break;
        }

        /*
         * Resource modal actions.
         */

        const resourceAction =
            target.dataset.resourceAction;

        if (resourceAction) {

            handleResourceAction(
                resourceAction
            );
        }
    }

    function handleResourceAction(
        action
    ) {

        const item =
            state.currentItem;

        if (!item) {
            return;
        }

        switch (action) {

            case 'bookmark':

                toggleBookmark(
                    item
                );

                openItem(
                    item
                );

                break;

            case 'spotter':

                addCurrentResourceToSpotter();

                break;

            case 'note':

                closeModal();

                navigate(
                    'notes'
                );

                renderNotes();

                if (
                    $('#cdcNoteTitle')
                ) {

                    $('#cdcNoteTitle').value =
                        item.title;
                }

                break;

            case 'flashcard':

                createFlashcardFromCurrent();

                break;

            case 'question':

                createQuestionFromCurrent();

                break;

            case 'ask-ai':

                askAIFromCurrent();

                break;

            case 'open-source':

                if (
                    safeExternal(
                        item.sourceUrl
                    )
                ) {

                    openExternal(
                        item.sourceUrl
                    );
                }

                break;

            default:
                break;
        }
    }

    function buildSpotterAIQuestion() {

        const d =
            state.spotterDraft;

        return `
Analyze this microbiology spotter study case:

Organism: ${d.organism || 'unknown'}
Category: ${d.category || 'unknown'}
Specimen: ${d.specimen || 'unknown'}
Stain: ${d.stain || 'not provided'}
Culture medium: ${d.medium || 'not provided'}
Biochemical test: ${d.test || 'not provided'}
Morphology: ${d.morphology || 'not provided'}
Diagnostic clues: ${d.diagnosticClues || 'not provided'}
Clinical significance: ${d.clinicalSignificance || 'not provided'}

Explain the key identification clues, important differentials,
and what a medical student should remember for an examination.
        `.trim();
    }

    /* ============================================================
       FORM EVENTS
       ============================================================ */

    function handleSubmit(
        event
    ) {

        const form =
            event.target;

        if (!form) {
            return;
        }

        if (
            form.id ===
            'cdcNoteForm'
        ) {

            event.preventDefault();

            saveNote();

            return;
        }

        if (
            form.id ===
            'cdcAiForm'
        ) {

            event.preventDefault();

            const question =
                $('#cdcAiQuestion')
                    ?.value
                    .trim();

            if (question) {

                askAI(
                    question
                );
            }

            return;
        }

        if (
            form.id ===
            'cdcSpecimenForm'
        ) {

            event.preventDefault();

            analyzeSpecimen();

            return;
        }

        if (
            form.id ===
            'cdcSpotterForm'
        ) {

            event.preventDefault();

            collectSpotterForm();

            renderSpotterPreview();

            return;
        }
    }

    function submitSearch() {

        const input =
            $('#cdcSearchInput');

        if (!input) {
            return;
        }

        const query =
            input.value.trim();

        if (!query) {
            return;
        }

        runSearch(
            query
        );
    }

    function handleKeydown(
        event
    ) {

        if (
            event.key === 'Enter' &&
            event.target.matches(
                '#cdcSearchInput'
            )
        ) {

            event.preventDefault();

            submitSearch();
        }

        if (
            event.key === 'Escape'
        ) {

            closeModal();
        }
    }

    /* ============================================================
       RESOURCE / IMAGE HOOKS
       ============================================================ */

    async function loadRemoteImagesIfAvailable() {

        const api =
            window.year3 &&
            window.year3.cdc;

        if (
            api &&
            typeof api.getImages === 'function'
        ) {

            try {

                const response =
                    await api.getImages();

                const images =
                    extractSearchResults(
                        response
                    )
                        .map(
                            item => ({
                                ...item,
                                type:
                                    item.type ||
                                    'image'
                            })
                        )
                        .map(normalizeItem);

                if (images.length) {

                    cacheItems(
                        images
                    );

                    renderImages(
                        images
                    );
                }

            } catch (error) {

                console.warn(
                    '[CDC] getImages failed:',
                    error
                );
            }
        }
    }

    /* ============================================================
       INITIAL RENDER
       ============================================================ */

    function initialRender() {

        renderDashboard();

        renderAllCategoryViews();

        renderSpotter();

        renderNotes();

        renderFlashcards();

        renderQuestions();

        renderKnowledge();

        renderProgress();

        renderHighYield();

        renderSpecimenDefault();

        renderCacheStatus();

        updateOnlineStatus();

        loadRemoteImagesIfAvailable();
    }

    /* ============================================================
       EVENT LISTENERS
       ============================================================ */

    function bindEvents() {

        if (!root) {
            return;
        }

        root.addEventListener(
            'click',
            handleClick
        );

        root.addEventListener(
            'submit',
            handleSubmit
        );

        root.addEventListener(
            'keydown',
            handleKeydown
        );

        window.addEventListener(
            'online',
            updateOnlineStatus
        );

        window.addEventListener(
            'offline',
            updateOnlineStatus
        );

        /*
         * Debounced search.
         */

        const searchInput =
            $('#cdcSearchInput');

        if (searchInput) {

            searchInput.addEventListener(
                'input',
                () => {

                    clearTimeout(
                        state.searchTimer
                    );

                    const query =
                        searchInput.value.trim();

                    if (
                        query.length < 3
                    ) {
                        return;
                    }

                    state.searchTimer =
                        setTimeout(
                            () => {

                                /*
                                 * Do not automatically navigate
                                 * for every keystroke.
                                 *
                                 * Only prepare the search.
                                 */

                            },
                            350
                        );
                }
            );
        }

        const modal =
            $('#cdcModal');

        if (modal) {

            modal.addEventListener(
                'click',
                event => {

                    if (
                        event.target === modal
                    ) {

                        closeModal();
                    }
                }
            );
        }
    }

    /* ============================================================
       DESTROY
       ============================================================ */

    function destroy() {

        if (!state.initialized) {
            return;
        }

        clearTimeout(
            state.searchTimer
        );

        if (
            state.abortController
        ) {

            try {
                state.abortController.abort();
            } catch {
                /* ignore */
            }
        }

        /*
         * Remove only listeners registered by this module.
         *
         * Since this module's root is removed during module
         * navigation, root listeners naturally disappear with it.
         */

        root = null;

        state.root = null;

        state.initialized = false;
    }

    /* ============================================================
       INIT
       ============================================================ */

    function init() {

        /*
         * Parent module manager can re-initialize modules.
         * Prevent duplicate initialization.
         */

        if (state.initialized) {

            const existingRoot =
                getRoot();

            if (existingRoot) {
                return;
            }

            state.initialized =
                false;
        }

        root =
            getRoot();

        if (!root) {

            console.warn(
                '[CDC] Root element #cdcResourceCenter not found.'
            );

            return;
        }

        state.root =
            root;

        state.initialized =
            true;

        loadState();

        bindEvents();

        initialRender();

        console.info(
            `[CDC] ${MODULE_ID} initialized.`
        );
    }

    /* ============================================================
       PUBLIC API
       ============================================================ */

    window.CDCModule = {

        init,

        destroy,

        search:
            (
                query,
                type = ''
            ) =>
                runSearch(
                    query,
                    type
                ),

        openResource:
            openItem,

        askAI,

        getState:
            () => ({
                moduleId:
                    MODULE_ID,

                moduleName:
                    MODULE_NAME,

                featureId:
                    FEATURE_ID,

                currentView:
                    state.currentView,

                currentItem:
                    state.currentItem,

                bookmarks:
                    [...state.bookmarks],

                history:
                    [...state.history],

                cacheSize:
                    state.cache.length,

                notes:
                    [...state.notes],

                flashcards:
                    [...state.flashcards],

                questions:
                    [...state.questions],

                progress:
                    {
                        ...state.progress
                    },

                lastSync:
                    state.lastSync
            })
    };

    /* ============================================================
       AUTO INITIALIZATION
       ============================================================ */

    if (
        document.readyState ===
        'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            init,
            {
                once: true
            }
        );

    } else {

        init();
    }

})();