'use strict';

/*
================================================================
YEAR 3 STUDY OS
Y3-014 — PHARMACOLOGY2000 MODULE
================================================================

Purpose:
- Provides a dedicated Pharmacology2000 learning hub.
- Does NOT copy or redistribute the site's underlying content.
- Opens the original Pharmacology2000 resources.
- Provides local bookmarks, notes, history and progress.
- Designed to work as a standalone Year 3 Study OS module.

Module ID:
    Y3-014-Pharmacology2000
================================================================
*/

(() => {

    const MODULE_ID = 'Y3-014-Pharmacology2000';

    const STORAGE_KEY =
        'Y3_PASS_PHARMACOLOGY2000_STATE';

    const SITE =
        'https://www.pharmacology2000.com/';

    const RESOURCES = [

        {
            id: 'home',
            category: 'Core',
            title: 'Pharmacology2000 Home',
            description:
                'Main Pharmacology2000 learning hub containing the available medical, nursing and anesthesia pharmacology resources.',
            url:
                'https://www.pharmacology2000.com/',
            tags: [
                'home',
                'pharmacology',
                'medical',
                'nursing',
                'anesthesia'
            ]
        },

        {
            id: 'intro-course',
            category: 'Course',
            title: 'Introduction to Medical Pharmacology',
            description:
                'The main introductory medical pharmacology course with chapter-based learning and practice material.',
            url:
                'https://www.pharmacology2000.com/learning2.htm',
            tags: [
                'course',
                'medical pharmacology',
                'chapters',
                'students',
                'basic pharmacology'
            ]
        },

        {
            id: 'infographics',
            category: 'Visual Learning',
            title: 'Pharmacology Infographics',
            description:
                'Visual pharmacology references organized around major pharmacology areas.',
            url:
                'https://pharmacology2000.com/Infographics_pharmacology_production/pharm-infographic-gallery.html',
            tags: [
                'infographics',
                'visual',
                'drug classes',
                'mechanisms',
                'revision'
            ]
        },

        {
            id: 'clinical-cases',
            category: 'Clinical',
            title: 'Clinical Cases',
            description:
                'Clinical pharmacology cases designed around real therapeutic decisions and competing clinical considerations.',
            url:
                'https://www.pharmacology2000.com/Clinical_case_production/cases-landing.html',
            tags: [
                'clinical cases',
                'clinical pharmacology',
                'therapy',
                'medicine',
                'case discussion'
            ]
        },

        {
            id: 'medical-reference',
            category: 'Reference',
            title: 'Medical Pharmacology',
            description:
                'Comprehensive medical pharmacology reference and question-bank section.',
            url:
                'https://www.pharmacology2000.com/learning2.htm',
            tags: [
                'reference',
                'medical pharmacology',
                'questions',
                'MCQ',
                'advanced'
            ]
        },

        {
            id: 'nursing',
            category: 'Additional',
            title: 'Nursing Pharmacology',
            description:
                'Pharmacology2000 nursing pharmacology resources.',
            url:
                SITE,
            tags: [
                'nursing',
                'pharmacology'
            ]
        },

        {
            id: 'anesthesia',
            category: 'Additional',
            title: 'Anesthesia Pharmacology',
            description:
                'Pharmacology2000 anesthesia-related pharmacology resources.',
            url:
                SITE,
            tags: [
                'anesthesia',
                'anaesthesia',
                'pharmacology'
            ]
        }

    ];


    // ============================================================
    // STATE
    // ============================================================

    const DEFAULT_STATE = {

        bookmarks: [],

        recent: [],

        notes: {},

        progress: {},

        lastResource: null,

        lastUpdated: null
    };


    let state = loadState();


    // ============================================================
    // UTILITIES
    // ============================================================

    function $(selector, root = document) {
        return root.querySelector(selector);
    }


    function $$(selector, root = document) {
        return Array.from(
            root.querySelectorAll(selector)
        );
    }


    function escapeHTML(value) {

        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    function loadState() {

        try {

            const saved =
                localStorage.getItem(STORAGE_KEY);

            if (!saved) {
                return {
                    ...DEFAULT_STATE
                };
            }

            const parsed =
                JSON.parse(saved);

            return {
                ...DEFAULT_STATE,
                ...parsed,

                bookmarks:
                    Array.isArray(parsed.bookmarks)
                        ? parsed.bookmarks
                        : [],

                recent:
                    Array.isArray(parsed.recent)
                        ? parsed.recent
                        : [],

                notes:
                    parsed.notes &&
                    typeof parsed.notes === 'object'
                        ? parsed.notes
                        : {},

                progress:
                    parsed.progress &&
                    typeof parsed.progress === 'object'
                        ? parsed.progress
                        : {}
            };

        } catch (error) {

            console.warn(
                '[PHARMACOLOGY2000] Could not load saved state:',
                error
            );

            return {
                ...DEFAULT_STATE
            };
        }
    }


    function saveState() {

        state.lastUpdated =
            new Date().toISOString();

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(state)
            );

        } catch (error) {

            console.warn(
                '[PHARMACOLOGY2000] Could not save state:',
                error
            );
        }
    }


    function findResource(id) {

        return RESOURCES.find(
            resource =>
                resource.id === id
        );
    }


    function isBookmarked(id) {

        return state.bookmarks.includes(id);
    }


    function toggleBookmark(id) {

        if (isBookmarked(id)) {

            state.bookmarks =
                state.bookmarks.filter(
                    item => item !== id
                );

        } else {

            state.bookmarks.push(id);
        }

        saveState();

        render();

        showToast(
            isBookmarked(id)
                ? 'Resource bookmarked'
                : 'Bookmark removed'
        );
    }


    function markOpened(id) {

        const resource =
            findResource(id);

        if (!resource) {
            return;
        }

        state.lastResource = id;

        state.recent =
            state.recent.filter(
                item => item !== id
            );

        state.recent.unshift(id);

        state.recent =
            state.recent.slice(0, 10);

        state.progress[id] = {
            ...(state.progress[id] || {}),
            opened: true,
            lastOpened:
                new Date().toISOString()
        };

        saveState();
    }


    function markCompleted(id) {

        state.progress[id] = {
            ...(state.progress[id] || {}),
            opened: true,
            completed: true,
            completedAt:
                new Date().toISOString()
        };

        saveState();

        render();

        showToast(
            'Marked as completed'
        );
    }


    function getProgressCount() {

        return Object.values(
            state.progress
        ).filter(
            item => item && item.completed
        ).length;
    }


    function getProgressPercent() {

        if (!RESOURCES.length) {
            return 0;
        }

        return Math.round(
            (
                getProgressCount() /
                RESOURCES.length
            ) * 100
        );
    }


    // ============================================================
    // EXTERNAL RESOURCE OPENING
    // ============================================================

    function openResource(id) {

        const resource =
            findResource(id);

        if (!resource) {
            return;
        }

        markOpened(id);

        /*
         * Use a new browser window/tab where Electron permits it.
         * The original Pharmacology2000 page remains the source.
         */

        try {

            const opened =
                window.open(
                    resource.url,
                    '_blank'
                );

            if (!opened) {

                window.location.href =
                    resource.url;
            }

        } catch (error) {

            console.error(
                '[PHARMACOLOGY2000] Failed to open resource:',
                error
            );

            window.location.href =
                resource.url;
        }
    }


    // ============================================================
    // SEARCH
    // ============================================================

    function searchResources(query) {

        const value =
            String(query || '')
                .trim()
                .toLowerCase();

        if (!value) {
            return RESOURCES;
        }

        return RESOURCES.filter(
            resource => {

                const haystack = [
                    resource.title,
                    resource.description,
                    resource.category,
                    ...(resource.tags || [])
                ]
                    .join(' ')
                    .toLowerCase();

                return haystack.includes(value);
            }
        );
    }


    // ============================================================
    // NOTES
    // ============================================================

    function saveNote(id, text) {

        state.notes[id] =
            String(text || '');

        saveState();

        showToast(
            'Study note saved'
        );
    }


    function getNote(id) {

        return state.notes[id] || '';
    }


    // ============================================================
    // TOAST
    // ============================================================

    function showToast(message) {

        const toast =
            $('#p2k-toast');

        if (!toast) {
            return;
        }

        toast.textContent =
            message;

        toast.classList.add(
            'show'
        );

        clearTimeout(
            showToast.timer
        );

        showToast.timer =
            setTimeout(() => {

                toast.classList.remove(
                    'show'
                );

            }, 2200);
    }


    // ============================================================
    // RESOURCE CARD
    // ============================================================

    function resourceCard(resource) {

        const bookmarked =
            isBookmarked(resource.id);

        const completed =
            !!state.progress?.[
                resource.id
            ]?.completed;

        return `
            <article
                class="resource-card"
                data-resource-id="${escapeHTML(resource.id)}"
                data-searchable="true"
            >

                <div class="resource-card-top">

                    <span class="resource-category">
                        ${escapeHTML(resource.category)}
                    </span>

                    <button
                        class="icon-button bookmark-button ${
                            bookmarked ? 'active' : ''
                        }"
                        data-action="bookmark"
                        data-id="${escapeHTML(resource.id)}"
                        title="${
                            bookmarked
                                ? 'Remove bookmark'
                                : 'Bookmark resource'
                        }"
                    >
                        ${bookmarked ? '★' : '☆'}
                    </button>

                </div>

                <div class="resource-icon">
                    ${resourceIcon(resource.category)}
                </div>

                <h3>
                    ${escapeHTML(resource.title)}
                </h3>

                <p>
                    ${escapeHTML(resource.description)}
                </p>

                <div class="resource-footer">

                    <button
                        class="primary-button"
                        data-action="open"
                        data-id="${escapeHTML(resource.id)}"
                    >
                        Open resource
                        <span>↗</span>
                    </button>

                    <button
                        class="secondary-button"
                        data-action="notes"
                        data-id="${escapeHTML(resource.id)}"
                    >
                        Notes
                    </button>

                </div>

                ${
                    completed
                        ? `
                            <div class="completed-label">
                                ✓ Completed
                            </div>
                        `
                        : ''
                }

            </article>
        `;
    }


    function resourceIcon(category) {

        switch (category) {

            case 'Course':
                return '📚';

            case 'Visual Learning':
                return '🧬';

            case 'Clinical':
                return '🏥';

            case 'Reference':
                return '📖';

            case 'Additional':
                return '🎓';

            default:
                return '💊';
        }
    }


    // ============================================================
    // MAIN RENDER
    // ============================================================

    function render() {

        const grid =
            $('#resource-grid');

        if (!grid) {
            return;
        }

        const search =
            $('#resource-search');

        const query =
            search
                ? search.value
                : '';

        const filtered =
            searchResources(query);

        grid.innerHTML =
            filtered.length
                ? filtered.map(
                    resourceCard
                ).join('')
                : `
                    <div class="empty-state">
                        <div class="empty-icon">🔎</div>
                        <h3>No resources found</h3>
                        <p>
                            Try another search term.
                        </p>
                    </div>
                `;

        updateDashboard();
        renderRecent();
        renderBookmarks();
    }


    // ============================================================
    // DASHBOARD
    // ============================================================

    function updateDashboard() {

        const progressCount =
            $('#progress-count');

        const progressPercent =
            $('#progress-percent');

        const bookmarkCount =
            $('#bookmark-count');

        const recentCount =
            $('#recent-count');

        const progressBar =
            $('#progress-bar');

        if (progressCount) {

            progressCount.textContent =
                `${getProgressCount()} / ${RESOURCES.length}`;
        }

        if (progressPercent) {

            progressPercent.textContent =
                `${getProgressPercent()}%`;
        }

        if (bookmarkCount) {

            bookmarkCount.textContent =
                state.bookmarks.length;
        }

        if (recentCount) {

            recentCount.textContent =
                state.recent.length;
        }

        if (progressBar) {

            progressBar.style.width =
                `${getProgressPercent()}%`;
        }
    }


    // ============================================================
    // RECENT
    // ============================================================

    function renderRecent() {

        const container =
            $('#recent-list');

        if (!container) {
            return;
        }

        const recentResources =
            state.recent
                .map(findResource)
                .filter(Boolean);

        if (!recentResources.length) {

            container.innerHTML = `
                <div class="mini-empty">
                    No recently opened resources.
                </div>
            `;

            return;
        }

        container.innerHTML =
            recentResources
                .map(resource => `
                    <button
                        class="recent-item"
                        data-action="open"
                        data-id="${escapeHTML(resource.id)}"
                    >
                        <span class="recent-item-icon">
                            ${resourceIcon(resource.category)}
                        </span>

                        <span class="recent-item-text">
                            <strong>
                                ${escapeHTML(resource.title)}
                            </strong>

                            <small>
                                ${escapeHTML(resource.category)}
                            </small>
                        </span>

                        <span class="recent-arrow">
                            →
                        </span>
                    </button>
                `)
                .join('');
    }


    // ============================================================
    // BOOKMARKS
    // ============================================================

    function renderBookmarks() {

        const container =
            $('#bookmark-list');

        if (!container) {
            return;
        }

        const bookmarkedResources =
            state.bookmarks
                .map(findResource)
                .filter(Boolean);

        if (!bookmarkedResources.length) {

            container.innerHTML = `
                <div class="mini-empty">
                    Your bookmarked resources will appear here.
                </div>
            `;

            return;
        }

        container.innerHTML =
            bookmarkedResources
                .map(resource => `
                    <button
                        class="bookmark-list-item"
                        data-action="open"
                        data-id="${escapeHTML(resource.id)}"
                    >
                        <span>
                            ★
                        </span>

                        <strong>
                            ${escapeHTML(resource.title)}
                        </strong>

                        <small>
                            ${escapeHTML(resource.category)}
                        </small>
                    </button>
                `)
                .join('');
    }


    // ============================================================
    // NOTES PANEL
    // ============================================================

    function openNotes(id) {

        const resource =
            findResource(id);

        if (!resource) {
            return;
        }

        const panel =
            $('#notes-modal');

        const title =
            $('#notes-modal-title');

        const textarea =
            $('#resource-notes');

        const resourceId =
            $('#notes-resource-id');

        if (!panel ||
            !title ||
            !textarea ||
            !resourceId) {
            return;
        }

        title.textContent =
            resource.title;

        textarea.value =
            getNote(id);

        resourceId.value =
            id;

        panel.classList.add(
            'open'
        );

        textarea.focus();
    }


    function closeNotes() {

        const panel =
            $('#notes-modal');

        if (panel) {

            panel.classList.remove(
                'open'
            );
        }
    }


    // ============================================================
    // EVENT HANDLING
    // ============================================================

    function bindEvents() {

        document.addEventListener(
            'click',
            event => {

                const target =
                    event.target.closest(
                        '[data-action]'
                    );

                if (!target) {
                    return;
                }

                const action =
                    target.dataset.action;

                const id =
                    target.dataset.id;

                if (action === 'open') {

                    openResource(id);
                    return;
                }

                if (action === 'bookmark') {

                    toggleBookmark(id);
                    return;
                }

                if (action === 'notes') {

                    openNotes(id);
                    return;
                }

                if (action === 'complete') {

                    markCompleted(id);
                    return;
                }

            }
        );


        const search =
            $('#resource-search');

        if (search) {

            search.addEventListener(
                'input',
                render
            );
        }


        const clearSearch =
            $('#clear-search');

        if (clearSearch) {

            clearSearch.addEventListener(
                'click',
                () => {

                    if (search) {
                        search.value = '';
                    }

                    render();
                }
            );
        }


        const notesClose =
            $('#notes-close');

        if (notesClose) {

            notesClose.addEventListener(
                'click',
                closeNotes
            );
        }


        const notesCancel =
            $('#notes-cancel');

        if (notesCancel) {

            notesCancel.addEventListener(
                'click',
                closeNotes
            );
        }


        const notesSave =
            $('#notes-save');

        if (notesSave) {

            notesSave.addEventListener(
                'click',
                () => {

                    const id =
                        $('#notes-resource-id')
                            ?.value;

                    const text =
                        $('#resource-notes')
                            ?.value || '';

                    if (id) {

                        saveNote(
                            id,
                            text
                        );

                        closeNotes();
                    }
                }
            );
        }


        const notesModal =
            $('#notes-modal');

        if (notesModal) {

            notesModal.addEventListener(
                'click',
                event => {

                    if (
                        event.target ===
                        notesModal
                    ) {

                        closeNotes();
                    }
                }
            );
        }


        const bookmarkNav =
            $('#show-bookmarks');

        if (bookmarkNav) {

            bookmarkNav.addEventListener(
                'click',
                () => {

                    const panel =
                        $('#bookmarks-panel');

                    panel?.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            );
        }


        const recentNav =
            $('#show-recent');

        if (recentNav) {

            recentNav.addEventListener(
                'click',
                () => {

                    const panel =
                        $('#recent-panel');

                    panel?.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            );
        }


        const resetButton =
            $('#reset-study-data');

        if (resetButton) {

            resetButton.addEventListener(
                'click',
                () => {

                    const confirmed =
                        window.confirm(
                            'Reset Pharmacology2000 bookmarks, notes, recent resources and progress?'
                        );

                    if (!confirmed) {
                        return;
                    }

                    state = {
                        ...DEFAULT_STATE
                    };

                    saveState();
                    render();

                    showToast(
                        'Study data reset'
                    );
                }
            );
        }


        const markAllButton =
            $('#mark-all-complete');

        if (markAllButton) {

            markAllButton.addEventListener(
                'click',
                () => {

                    RESOURCES.forEach(
                        resource => {

                            state.progress[
                                resource.id
                            ] = {

                                ...(state.progress[
                                    resource.id
                                ] || {}),

                                opened: true,
                                completed: true,
                                completedAt:
                                    new Date()
                                        .toISOString()
                            };
                        }
                    );

                    saveState();
                    render();

                    showToast(
                        'All resources marked completed'
                    );
                }
            );
        }

    }


    // ============================================================
    // MODULE INITIALIZATION
    // ============================================================

    function initialize() {

        console.log(
            '[PHARMACOLOGY2000] Initializing module:',
            MODULE_ID
        );

        bindEvents();
        render();

        console.log(
            '[PHARMACOLOGY2000] Module initialized successfully.'
        );
    }


    // ============================================================
    // PUBLIC MODULE API
    // ============================================================

    window.Y3_014_Pharmacology2000 = {

        id:
            MODULE_ID,

        resources:
            RESOURCES,

        openResource,

        toggleBookmark,

        markCompleted,

        saveNote,

        getState: () =>
            JSON.parse(
                JSON.stringify(state)
            ),

        reset: () => {

            state = {
                ...DEFAULT_STATE
            };

            saveState();
            render();
        }

    };


    // ============================================================
    // START
    // ============================================================

    if (
        document.readyState ===
        'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            initialize,
            {
                once: true
            }
        );

    } else {

        initialize();
    }

})();