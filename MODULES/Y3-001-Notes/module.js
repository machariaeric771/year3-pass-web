(function () {
    'use strict';

    /* ============================================================
 * FORCE NOTES MODULE LIGHT THEME
 * ============================================================ */

function forceLightTheme() {
    const root = getRoot();

    if (!root) {
        return;
    }

    root.classList.remove(
        'dark',
        'dark-mode',
        'theme-dark'
    );

    root.classList.add(
        'light',
        'light-mode',
        'theme-light'
    );

    root.style.colorScheme = 'light';

    root.style.setProperty(
        'background-color',
        '#ffffff',
        'important'
    );

    root.style.setProperty(
        'color',
        '#1f2937',
        'important'
    );
}

    /*
     * ============================================================
     * YEAR 3 STUDY OS
     * Y3-001 — NOTES
     *
     * Compatible with:
     *   UI/app.js
     *   Y3-001-Notes/index.html
     *
     * IMPORTANT:
     *   app.js dynamically injects this module after inserting
     *   the Notes HTML into #content.
     * ============================================================
     */

    const MODULE_ID = 'Y3-001-Notes';
    const STORAGE_KEY = 'year3-study-os-notes-v3';

    let initialized = false;
    let destroyed = false;

    let controller = null;
    let saveTimer = null;
    let menu = null;

    let activeFilter = 'all';
    let activeSubject = '';
    let activeTag = '';

    let state = {
        notes: {}
    };
    let lastAIResponse = '';

    /* ============================================================
     * DOM
     * ============================================================ */

    function $(selector, root = document) {
        return root.querySelector(selector);
    }

    function $$(selector, root = document) {
        return Array.from(root.querySelectorAll(selector));
    }

    function getRoot() {
        return $('.notes-module-root');
    }

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function escapeSelector(value) {
        if (window.CSS && typeof CSS.escape === 'function') {
            return CSS.escape(String(value));
        }

        return String(value).replace(/["\\]/g, '\\$&');
    }

    function getCard(title) {
    if (!title) return null;

    const cards = document.querySelectorAll('.note-card');

    for (const card of cards) {
        if (card.dataset.title === String(title)) {
            return card;
        }
    }

    return null;
}

    /* ============================================================
     * STORAGE
     * ============================================================ */

    function loadState() {
        try {
            const raw =
                localStorage.getItem(STORAGE_KEY);

            if (!raw) {
                return {
                    notes: {}
                };
            }

            const parsed =
                JSON.parse(raw);

            if (
                !parsed ||
                typeof parsed !== 'object'
            ) {
                return {
                    notes: {}
                };
            }

            if (
                !parsed.notes ||
                typeof parsed.notes !== 'object'
            ) {
                parsed.notes = {};
            }

            return parsed;

        } catch (error) {
            console.warn(
                '[Notes] Failed to load notes:',
                error
            );

            return {
                notes: {}
            };
        }
    }

    function persist() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(state)
            );
        } catch (error) {
            console.warn(
                '[Notes] Failed to save notes:',
                error
            );

            toast(
                'Unable to save notes locally'
            );
        }
    }

    /* ============================================================
     * HELPERS
     * ============================================================ */

    function timestamp() {
        return Date.now();
    }

    function formattedDate() {
        return new Date().toLocaleString(
            'en-GB',
            {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }
        );
    }

    function stripHTML(html) {
        const div =
            document.createElement('div');

        div.innerHTML = html || '';

        return div.innerText || '';
    }

    function subjectClass(subject) {
        const classes = {
            Anatomy: 'anatomy',
            Physiology: 'physiology',
            Pharmacology: 'pharmacology',
            Microbiology: 'microbiology',
            Pathology: 'pathology',
            Neuroanatomy: 'neuroanatomy',
            'Obstetrics & Gynaecology': 'obgyn'
        };

        return classes[subject] || 'physiology';
    }

    /* ============================================================
     * TOAST
     * ============================================================ */

    function toast(message) {
        const element =
            $('#toast');

        if (!element) {
            return;
        }

        element.textContent =
            String(message);

        element.classList.add('show');

        clearTimeout(
            window.__Y3NotesToastTimer
        );

        window.__Y3NotesToastTimer =
            setTimeout(() => {
                element.classList.remove('show');
            }, 1800);
    }

    /* ============================================================
     * NOTE DATA
     * ============================================================ */

    function getNote(title) {
        if (!title) {
            return null;
        }

        if (!state.notes[title]) {
            const card =
                getCard(title);

            state.notes[title] = {
                subject:
                    card?.dataset.subject ||
                    'General',

                system:
                    card?.dataset.subject ||
                    'Study',

                tags:
                    card
                        ? $$('.tag-row span', card)
                            .map(el =>
                                el.textContent.trim()
                            )
                            .filter(Boolean)
                        : ['New'],

                favorite:
                    !!card?.querySelector(
                        '.favorite.active'
                    ),

                archived: false,

                content: `
                    <h1>
                        ${escapeHTML(title)}
                    </h1>

                    <p>
                        Start writing your note here.
                    </p>
                `,

                created: formattedDate(),
                createdAt: timestamp(),

                edited: 'Just now',
                editedAt: timestamp()
            };
        }

        return state.notes[title];
    }

    /* ============================================================
     * INITIAL SEED
     * ============================================================ */

    function seedExistingNotes() {
        $$('.note-card').forEach(card => {
            const title =
                card.dataset.title;

            if (!title) {
                return;
            }

            if (state.notes[title]) {
                return;
            }

            const subject =
                card.dataset.subject ||
                'General';

            const tags =
                $$('.tag-row span', card)
                    .map(el =>
                        el.textContent.trim()
                    )
                    .filter(Boolean);

            state.notes[title] = {
                subject,

                system:
                    subject === 'Pathology'
                        ? 'Renal System'
                        : subject === 'General'
                            ? 'Study'
                            : subject,

                tags,

                favorite:
                    !!card.querySelector(
                        '.favorite.active'
                    ),

                archived: false,

                content:
                    title ===
                    'Acute Kidney Injury'
                        ? getExistingEditorContent()
                        : `
                            <h1>
                                ${escapeHTML(title)}
                            </h1>

                            <p>
                                ${escapeHTML(
                                    card.querySelector(
                                        'p'
                                    )?.textContent ||
                                    'Start writing your note here.'
                                )}
                            </p>
                        `,

                created:
                    '05 Sep 2026',

                createdAt:
                    timestamp(),

                edited:
                    card.querySelector(
                        '.note-footer span'
                    )?.textContent ||
                    'Recently',

                editedAt:
                    timestamp()
            };
        });

        persist();
    }

    function renderStoredNotes() {

    const grid =
        $('#notesGrid');

    if (!grid) {
        console.warn(
            '[NOTES] Notes grid not found while rendering stored notes.'
        );
        return;
    }

    Object.entries(state.notes || {})
        .forEach(([title, note]) => {

            /*
             * Do not create duplicate cards.
             */
            if (getCard(title)) {
                return;
            }

            if (!note || typeof note !== 'object') {
                return;
            }

            const subject =
                note.subject ||
                'General';

            const tags =
                Array.isArray(note.tags)
                    ? note.tags
                    : [];

            const preview =
                stripHTML(
                    note.content ||
                    ''
                )
                .trim()
                .substring(
                    0,
                    180
                );

            const card =
                document.createElement(
                    'article'
                );

            card.className =
                'note-card';

            card.dataset.title =
                title;

            card.dataset.subject =
                subject;

            card.dataset.tags =
                tags.join(' ');

            card.dataset.recent =
                'false';

            card.innerHTML = `
                <div class="note-card-top">

                    <span class="subject-pill ${subjectClass(subject)}">
                        ${escapeHTML(subject)}
                    </span>

                    <button
                        class="star favorite ${note.favorite ? 'active' : ''}"
                        type="button"
                    >
                        ${note.favorite ? '★' : '☆'}
                    </button>

                </div>

                <h3>
                    ${escapeHTML(title)}
                </h3>

                <p>
                    ${escapeHTML(
                        preview ||
                        'Start writing your note...'
                    )}
                </p>

                <div class="tag-row">
                    ${tags
                        .map(tag =>
                            `<span>${escapeHTML(tag)}</span>`
                        )
                        .join('')}
                </div>

                <div class="note-footer">

                    <span>
                        ${escapeHTML(
                            note.edited ||
                            note.created ||
                            'Just now'
                        )}
                    </span>

                    <button
                        class="more"
                        type="button"
                    >
                        •••
                    </button>

                </div>
            `;

            grid.appendChild(card);

            bindNoteCard(card);
        });
}

    function getExistingEditorContent() {
        const body =
            $('#editorBody');

        if (body?.innerHTML?.trim()) {
            return body.innerHTML;
        }

        return `
            <div class="doc-kicker">
                PATHOLOGY · RENAL SYSTEM
            </div>

            <h1>
                Acute Kidney Injury
            </h1>

            <div class="medical-callout definition">
                <div class="callout-label">
                    <span class="callout-dot"></span>
                    DEFINITION
                </div>

                <p>
                    Acute kidney injury is an abrupt
                    reduction in kidney function.
                </p>
            </div>

            <h2>Key Clinical Points</h2>

            <ul>
                <li>Assess kidney function.</li>
                <li>Assess volume status.</li>
                <li>Identify reversible causes.</li>
            </ul>
        `;
    }

    /* ============================================================
     * SELECT NOTE
     * ============================================================ */

    function selectNote(title, showMessage = true) {
        if (destroyed) {
            return;
        }

        const card =
            getCard(title);

        if (!card) {
            toast(
                `Note "${title}" was not found`
            );
            return;
        }

        const note =
            getNote(title);

        if (!note) {
            return;
        }

        $$('.note-card').forEach(item => {
            item.classList.toggle(
                'selected',
                item === card
            );
        });

        $$('.recent-card').forEach(item => {
            item.classList.toggle(
                'selected-recent',
                item.dataset.note === title
            );
        });

        const titleElement =
            $('#editorTitle');

        const meta =
            $('#editorMeta');

        const body =
            $('#editorBody');

        const favorite =
            $('#editorFavorite');

        if (titleElement) {
            titleElement.textContent =
                title;
        }

        if (meta) {
            meta.innerHTML = `
                <span>
                    ${escapeHTML(note.subject)}
                </span>

                <i>•</i>

                <span>
                    ${escapeHTML(
                        note.system || 'Study'
                    )}
                </span>

                <i>•</i>

                <span class="saved">
                    ✓ Saved
                </span>
            `;
        }

        if (body) {
            body.innerHTML =
                note.content ||
                `
                    <h1>
                        ${escapeHTML(title)}
                    </h1>

                    <p>
                        Start writing your note here.
                    </p>
                `;
        }

        if (favorite) {
            favorite.textContent =
                note.favorite
                    ? '★'
                    : '☆';

            favorite.classList.toggle(
                'active',
                !!note.favorite
            );
        }

        updateContext(note);
        updateStats();

        if (showMessage) {
            toast(
                `Opened "${title}"`
            );
        }
    }

    /* ============================================================
     * SAVE
     * ============================================================ */

    function saveCurrentNote(showMessage = false) {
        const title =
            $('#editorTitle')
                ?.textContent
                ?.trim();

        const body =
            $('#editorBody');

        if (!title || !body) {
            return;
        }

        const note =
            getNote(title);

        if (!note) {
            return;
        }

        note.content =
            body.innerHTML;

        note.edited =
            'Just now';

        note.editedAt =
            timestamp();

        state.notes[title] =
            note;

        persist();

        const saved =
            $('.saved');

        if (saved) {
            saved.textContent =
                '✓ Saved';
        }

        updateStats();
        updateCard(title);

        if (showMessage) {
            toast('Note saved');
        }
    }

    function scheduleSave() {
        const saved =
            $('.saved');

        if (saved) {
            saved.textContent =
                '• Saving…';
        }

        clearTimeout(
            saveTimer
        );

        saveTimer =
            setTimeout(() => {
                if (!destroyed) {
                    saveCurrentNote(false);
                    toast('Note saved');
                }
            }, 650);
    }

    /* ============================================================
     * UPDATE CARD
     * ============================================================ */

    function updateCard(title) {
        const card =
            getCard(title);

        const note =
            getNote(title);

        if (!card || !note) {
            return;
        }

        const paragraph =
            $('p', card);

        if (paragraph) {
            const text =
                stripHTML(
                    note.content
                ).replace(
                    /\s+/g,
                    ' '
                ).trim();

            if (text) {
                paragraph.textContent =
                    text.length > 180
                        ? text.substring(0, 177) + '…'
                        : text;
            }
        }

        const footer =
            $('.note-footer span', card);

        if (footer) {
            footer.textContent =
                note.edited ||
                'Just now';
        }

        const star =
            $('.favorite', card);

        if (star) {
            star.textContent =
                note.favorite
                    ? '★'
                    : '☆';

            star.classList.toggle(
                'active',
                !!note.favorite
            );
        }
    }

    /* ============================================================
     * CONTEXT
     * ============================================================ */

    function updateContext(note) {
        const subject =
            $('#contextSubject');

        const system =
            $('#contextSystem');

        const tags =
            $('#contextTags');

        const created =
            $('#createdDate');

        const edited =
            $('#editedDate');

        if (subject) {
            subject.innerHTML = `
                <span class="subject-pill ${subjectClass(note.subject)}">
                    ${escapeHTML(note.subject)}
                </span>
            `;
        }

        if (system) {
            system.textContent =
                note.system ||
                'Study';
        }

        if (tags) {
            tags.innerHTML =
                (note.tags || [])
                    .map(tag =>
                        `<span>${escapeHTML(tag)}</span>`
                    )
                    .join('') +
                `
                    <button
                        id="addTag"
                        type="button"
                    >
                        ＋ Add tag
                    </button>
                `;
        }

        if (created) {
            created.textContent =
                note.created ||
                '05 Sep 2026';
        }

        if (edited) {
            edited.textContent =
                note.edited ||
                'Just now';
        }
    }

    /* ============================================================
     * STATS
     * ============================================================ */

    function updateStats() {
        const body =
            $('#editorBody');

        if (!body) {
            return;
        }

        const text =
            body.innerText
                .trim();

        const words =
            text
                ? text
                    .split(/\s+/)
                    .filter(Boolean)
                    .length
                : 0;

        const minutes =
            Math.max(
                1,
                Math.ceil(words / 210)
            );

        const wordCount =
            $('#wordCount');

        const readingTime =
            $('#readingTime');

        const stats =
            $('#editorStats');

        if (wordCount) {
            wordCount.textContent =
                words;
        }

        if (readingTime) {
            readingTime.textContent =
                `${minutes} min`;
        }

        if (stats) {
            stats.textContent =
                `${words} words · ~${minutes} min read`;
        }
    }

    /* ============================================================
     * FAVORITES
     * ============================================================ */

    function toggleFavorite(title) {
        const note =
            getNote(title);

        if (!note) {
            return;
        }

        note.favorite =
            !note.favorite;

        persist();

        updateCard(title);

        const currentTitle =
            $('#editorTitle')
                ?.textContent
                ?.trim();

        if (
            currentTitle === title
        ) {
            const button =
                $('#editorFavorite');

            if (button) {
                button.textContent =
                    note.favorite
                        ? '★'
                        : '☆';

                button.classList.toggle(
                    'active',
                    note.favorite
                );
            }

            updateContext(note);
        }

        filterNotes();

        toast(
            note.favorite
                ? 'Added to favorites'
                : 'Removed from favorites'
        );
    }

    /* ============================================================
 * CREATE NOTE
 * ============================================================ */

function createNote() {

    if (destroyed) {
        return;
    }

    const root = getRoot();

    if (!root) {
        console.error('[NOTES] Notes root not found.');
        return;
    }

    /*
     * Prevent multiple dialogs.
     */
    const existing =
        root.querySelector('.notes-create-dialog');

    if (existing) {
        existing.remove();
    }

    /*
     * Create dialog.
     */
    const overlay =
        document.createElement('div');

    overlay.className =
        'notes-create-dialog';

    overlay.innerHTML = `
        <div class="notes-dialog-backdrop"></div>

        <div
            class="notes-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notesCreateDialogTitle"
        >

            <div class="notes-dialog-header">

                <div>
                    <div
                        class="notes-dialog-title"
                        id="notesCreateDialogTitle"
                    >
                        New Note
                    </div>

                    <div class="notes-dialog-subtitle">
                        Create a new study note
                    </div>
                </div>

                <button
                    type="button"
                    class="notes-dialog-close"
                    data-dialog-action="cancel"
                    aria-label="Close"
                >
                    ×
                </button>

            </div>

            <div class="notes-dialog-body">

                <label
                    class="notes-dialog-label"
                    for="newNoteTitle"
                >
                    Note title
                </label>

                <input
                    type="text"
                    id="newNoteTitle"
                    class="notes-dialog-input"
                    placeholder="e.g. Acute Kidney Injury"
                    autocomplete="off"
                />

                <label
                    class="notes-dialog-label"
                    for="newNoteSubject"
                >
                    Subject
                </label>

                <input
                    type="text"
                    id="newNoteSubject"
                    class="notes-dialog-input"
                    placeholder="e.g. Pathology"
                    autocomplete="off"
                />

            </div>

            <div class="notes-dialog-footer">

                <button
                    type="button"
                    class="notes-dialog-button secondary"
                    data-dialog-action="cancel"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    class="notes-dialog-button primary"
                    data-dialog-action="create"
                >
                    Create Note
                </button>

            </div>

        </div>
    `;

    root.appendChild(overlay);

    const titleInput =
        overlay.querySelector('#newNoteTitle');

    const subjectInput =
        overlay.querySelector('#newNoteSubject');

    const createButton =
        overlay.querySelector(
            '[data-dialog-action="create"]'
        );

    /*
     * Close dialog.
     */
    function closeDialog() {

        overlay.remove();

        document.removeEventListener(
            'keydown',
            handleKeydown
        );
    }

    /*
     * Keyboard handling.
     */
    function handleKeydown(event) {

        if (event.key === 'Escape') {
            event.preventDefault();
            closeDialog();
            return;
        }

        if (
            event.key === 'Enter' &&
            document.activeElement === titleInput
        ) {
            event.preventDefault();
            submit();
        }
    }

    /*
     * Create the note.
     */
    function submit() {

        const title =
            titleInput?.value
                ?.trim();

        const subject =
            subjectInput?.value
                ?.trim() ||
            'General';

        /*
         * Validate title.
         */
        if (!title) {

            toast(
                'Enter a note title.'
            );

            titleInput?.focus();

            return;
        }

        /*
         * Prevent duplicate titles.
         */
        if (
            state.notes[title] ||
            getCard(title)
        ) {

            toast(
                'A note with this title already exists.'
            );

            titleInput?.focus();

            return;
        }

        const grid =
            $('#notesGrid');

        if (!grid) {

            console.error(
                '[NOTES] Notes grid not found.'
            );

            toast(
                'Unable to create note: notes grid not found.'
            );

            return;
        }

        /*
         * Create timestamps.
         */
        const now =
            timestamp();

        /*
         * Create the note state.
         */
        state.notes[title] = {

            title:

                title,

            subject:

                subject,

            system:

                subject,

            tags:

                [],

            favorite:

                false,

            archived:

                false,

            content:

                `<h1>${escapeHTML(title)}</h1><p><br></p>`,

            created:

                formattedDate(),

            createdAt:

                now,

            edited:

                'Just now',

            editedAt:

                now
        };

        /*
         * Create the visible note card.
         *
         * This is the same DOM structure used by
         * Quick Capture and Duplicate Note.
         */
        const card =
            document.createElement(
                'article'
            );

        card.className =
            'note-card';

        card.dataset.title =
            title;

        card.dataset.subject =
            subject;

        card.dataset.tags =
            '';

        card.dataset.recent =
            'true';

        card.innerHTML = `
            <div class="note-card-top">

                <span class="subject-pill ${subjectClass(subject)}">
                    ${escapeHTML(subject)}
                </span>

                <button
                    class="star favorite"
                    type="button"
                >
                    ☆
                </button>

            </div>

            <h3>
                ${escapeHTML(title)}
            </h3>

            <p>
                Start writing your note...
            </p>

            <div class="tag-row"></div>

            <div class="note-footer">

                <span>
                    Just now
                </span>

                <button
                    class="more"
                    type="button"
                >
                    •••
                </button>

            </div>
        `;

        /*
         * Put newest note at the top.
         */
        grid.prepend(card);

        /*
         * Persist BEFORE selecting.
         */
        persist();

        /*
         * Bind the new card to all normal note-card
         * interactions.
         */
        bindNoteCard(card);

        /*
         * Refresh the visible list.
         */
        filterNotes();

        /*
         * Close dialog.
         */
        closeDialog();

        /*
         * Open the newly created note in the editor.
         */
        requestAnimationFrame(() => {

            selectNote(
                title,
                false
            );

        });

        /*
         * Update statistics.
         */
        updateStats();

        /*
         * User feedback.
         */
        toast(
            `Note "${title}" created.`
        );
    }

    /*
     * Keyboard listener.
     *
     * Tied to controller.signal (same as every other
     * document/window-level listener in this module) so that
     * destroy() reliably removes it even if the user navigates
     * away while this dialog is still open. The explicit
     * removeEventListener() call in closeDialog() below still
     * runs for the normal close path; this is the safety net
     * for the abnormal one.
     */
    document.addEventListener(
        'keydown',
        handleKeydown,
        {
            signal:
                controller.signal
        }
    );

    /*
     * Cancel / close buttons.
     */
    overlay
        .querySelectorAll(
            '[data-dialog-action="cancel"]'
        )
        .forEach(button => {

            button.addEventListener(
                'click',
                event => {

                    event.preventDefault();

                    closeDialog();
                }
            );

        });

    /*
     * Create button.
     */
    createButton?.addEventListener(
        'click',
        event => {

            event.preventDefault();

            submit();
        }
    );

    /*
     * Clicking backdrop closes dialog.
     */
    overlay
        .querySelector(
            '.notes-dialog-backdrop'
        )
        ?.addEventListener(
            'click',
            closeDialog
        );

    /*
     * Focus title immediately.
     */
    requestAnimationFrame(() => {

        titleInput?.focus();

    });
}

    /* ============================================================
     * QUICK CAPTURE
     * ============================================================ */

    function quickCapture() {
        const entered =
            window.prompt(
                'Quick Capture — enter a concept, question or reminder:',
                ''
            );

        if (entered === null) {
            return;
        }

        const text =
            entered.trim();

        if (!text) {
            return;
        }

        let title =
            text.length > 45
                ? text.substring(0, 45).trim() + '…'
                : text;

        let counter = 2;
        const originalTitle =
            title;

        while (getCard(title)) {
            title =
                `${originalTitle} ${counter}`;
            counter++;
        }

        const grid =
            $('#notesGrid');

        if (!grid) {
            return;
        }

        const card =
            document.createElement(
                'article'
            );

        card.className =
            'note-card';

        card.dataset.title =
            title;

        card.dataset.subject =
            'General';

        card.dataset.tags =
            'Quick Capture';

        card.dataset.recent =
            'true';

        card.innerHTML = `
            <div class="note-card-top">
                <span class="subject-pill physiology">
                    General
                </span>

                <button
                    class="star favorite"
                    type="button"
                >
                    ☆
                </button>
            </div>

            <h3>
                ${escapeHTML(title)}
            </h3>

            <p>
                ${escapeHTML(text)}
            </p>

            <div class="tag-row">
                <span>
                    Quick Capture
                </span>
            </div>

            <div class="note-footer">
                <span>
                    Just now
                </span>

                <button
                    class="more"
                    type="button"
                >
                    •••
                </button>
            </div>
        `;

        grid.prepend(card);

        state.notes[title] = {
            subject: 'General',
            system: 'Study',
            tags: ['Quick Capture'],
            favorite: false,
            archived: false,

            content: `
                <div class="doc-kicker">
                    QUICK CAPTURE
                </div>

                <h1>
                    ${escapeHTML(title)}
                </h1>

                <p>
                    ${escapeHTML(text)}
                </p>
            `,

            created:
                formattedDate(),

            createdAt:
                timestamp(),

            edited:
                'Just now',

            editedAt:
                timestamp()
        };

        persist();

        bindNoteCard(card);

        selectNote(
            title,
            false
        );

        filterNotes();

        toast(
            'Quick capture saved'
        );
    }

    /* ============================================================
     * RENAME
     * ============================================================ */

    function renameNote(oldTitle) {
        const entered =
            window.prompt(
                'Rename note:',
                oldTitle
            );

        if (entered === null) {
            return;
        }

        const newTitle =
            entered.trim();

        if (
            !newTitle ||
            newTitle === oldTitle
        ) {
            return;
        }

        if (getCard(newTitle)) {
            toast(
                'A note with that title already exists'
            );
            return;
        }

        const note =
            state.notes[oldTitle];

        if (note) {
            state.notes[newTitle] =
                note;

            delete state.notes[
                oldTitle
            ];
        }

        const card =
            getCard(oldTitle);

        if (card) {
            card.dataset.title =
                newTitle;

            const heading =
                $('h3', card);

            if (heading) {
                heading.textContent =
                    newTitle;
            }
        }

        const editorTitle =
            $('#editorTitle');

        if (
            editorTitle &&
            editorTitle.textContent.trim() ===
                oldTitle
        ) {
            editorTitle.textContent =
                newTitle;
        }

        persist();

        toast(
            'Note renamed'
        );
    }

    /* ============================================================
     * DUPLICATE
     * ============================================================ */

    function duplicateNote(title) {
        const original =
            getNote(title);

        if (!original) {
            return;
        }

        let newTitle =
            `${title} Copy`;

        let number = 2;

        while (getCard(newTitle)) {
            newTitle =
                `${title} Copy ${number}`;
            number++;
        }

        const grid =
            $('#notesGrid');

        if (!grid) {
            return;
        }

        const card =
            document.createElement(
                'article'
            );

        card.className =
            'note-card';

        card.dataset.title =
            newTitle;

        card.dataset.subject =
            original.subject;

        card.dataset.tags =
            (original.tags || []).join(' ');

        card.dataset.recent =
            'true';

        card.innerHTML = `
            <div class="note-card-top">
                <span class="subject-pill ${subjectClass(original.subject)}">
                    ${escapeHTML(original.subject)}
                </span>

                <button
                    class="star favorite"
                    type="button"
                >
                    ☆
                </button>
            </div>

            <h3>
                ${escapeHTML(newTitle)}
            </h3>

            <p>
                ${escapeHTML(
                    stripHTML(
                        original.content
                    ).substring(
                        0,
                        180
                    )
                )}
            </p>

            <div class="tag-row">
                ${(original.tags || [])
                    .map(tag =>
                        `<span>${escapeHTML(tag)}</span>`
                    )
                    .join('')}
            </div>

            <div class="note-footer">
                <span>
                    Just now
                </span>

                <button
                    class="more"
                    type="button"
                >
                    •••
                </button>
            </div>
        `;

        grid.prepend(card);

        state.notes[newTitle] = {
            ...original,

            favorite: false,
            archived: false,

            created:
                formattedDate(),

            createdAt:
                timestamp(),

            edited:
                'Just now',

            editedAt:
                timestamp()
        };

        persist();

        bindNoteCard(card);

        selectNote(
            newTitle,
            false
        );

        filterNotes();

        toast(
            'Note duplicated'
        );
    }

    /* ============================================================
     * ARCHIVE
     * ============================================================ */

    function archiveNote(title) {
        const note =
            getNote(title);

        if (!note) {
            return;
        }

        note.archived =
            !note.archived;

        persist();

        filterNotes();

        toast(
            note.archived
                ? 'Note archived'
                : 'Note restored'
        );
    }

    /* ============================================================
     * DELETE
     * ============================================================ */

    function deleteNote(title) {
        const confirmed =
            window.confirm(
                `Delete "${title}"?`
            );

        if (!confirmed) {
            return;
        }

        delete state.notes[
            title
        ];

        getCard(title)?.remove();

        persist();

        const current =
            $('#editorTitle')
                ?.textContent
                ?.trim();

        if (current === title) {
            const replacement =
                $$('.note-card')
                    .find(card =>
                        card.style.display !==
                        'none'
                    );

            if (replacement) {
                selectNote(
                    replacement.dataset.title,
                    false
                );
            } else {
                $('#editorTitle').textContent =
                    'No note selected';

                $('#editorBody').innerHTML = `
                    <h1>
                        No note selected
                    </h1>

                    <p>
                        Create a new note to begin.
                    </p>
                `;
            }
        }

        filterNotes();

        toast(
            'Note deleted'
        );
    }

    /* ============================================================
     * TAGS
     * ============================================================ */

    function addTag() {
        const title =
            $('#editorTitle')
                ?.textContent
                ?.trim();

        if (!title) {
            return;
        }

        const note =
            getNote(title);

        if (!note) {
            return;
        }

        const entered =
            window.prompt(
                'Add tag:',
                'High Yield'
            );

        if (entered === null) {
            return;
        }

        const tag =
            entered.trim();

        if (!tag) {
            return;
        }

        note.tags =
            note.tags || [];

        const exists =
            note.tags.some(
                existing =>
                    existing.toLowerCase() ===
                    tag.toLowerCase()
            );

        if (exists) {
            toast(
                'That tag already exists'
            );
            return;
        }

        note.tags.push(tag);

        persist();

        updateContext(note);
        filterNotes();

        toast(
            'Tag added'
        );
    }

    /* ============================================================
     * FILTERS
     * ============================================================ */

    function matchesFilter(card) {
        const title =
            card.dataset.title;

        const note =
            getNote(title);

        if (!note) {
            return false;
        }

        const query =
            $('#noteSearch')
                ?.value
                ?.toLowerCase()
                ?.trim() || '';

        const searchable =
            [
                title,
                note.subject,
                note.system,
                ...(note.tags || []),
                stripHTML(
                    note.content || ''
                )
            ]
                .join(' ')
                .toLowerCase();

        if (
            query &&
            !searchable.includes(query)
        ) {
            return false;
        }

        if (
            activeSubject &&
            note.subject !==
                activeSubject
        ) {
            return false;
        }

        if (
            activeTag &&
            !(note.tags || []).some(
                tag =>
                    tag.toLowerCase() ===
                    activeTag.toLowerCase()
            )
        ) {
            return false;
        }

        if (
            activeFilter ===
                'favorites' &&
            !note.favorite
        ) {
            return false;
        }

        if (
            activeFilter ===
                'archived'
        ) {
            return !!note.archived;
        }

        if (
            note.archived &&
            activeFilter !==
                'archived'
        ) {
            return false;
        }

        if (
            activeFilter ===
                'recent' &&
            card.dataset.recent !==
                'true'
        ) {
            return false;
        }

        return true;
    }

    function filterNotes() {
        let visible = 0;

        $$('.note-card')
            .forEach(card => {
                const matches =
                    matchesFilter(
                        card
                    );

                card.style.display =
                    matches
                        ? ''
                        : 'none';

                if (matches) {
                    visible++;
                }
            });

        const count =
            $('#noteCount');

        if (count) {
            count.textContent =
                `${visible} note${visible === 1 ? '' : 's'}`;
        }

        const badge =
            $('.count-badge');

        if (badge) {
            badge.textContent =
                [
                    activeSubject,
                    activeTag,
                    activeFilter !==
                        'all'
                        ? activeFilter
                        : ''
                ]
                    .filter(Boolean)
                    .length;
        }
    }

    /* ============================================================
     * THREE-DOT MENU
     *
     * IMPORTANT:
     * This uses a fixed-position menu attached directly to body.
     * It therefore cannot be clipped by the Notes card/grid.
     * ============================================================ */

    function closeMenu() {
        if (menu) {
            menu.remove();
            menu = null;
        }
    }

    function showMenu(anchor, items) {
        closeMenu();

        if (!anchor) {
            return;
        }

        menu =
            document.createElement(
                'div'
            );

        menu.className =
            'notes-action-menu';

        menu.setAttribute(
            'role',
            'menu'
        );

        items.forEach(
            ([label, action]) => {
                const button =
                    document.createElement(
                        'button'
                    );

                button.type =
                    'button';

                button.textContent =
                    label;

                button.setAttribute(
                    'role',
                    'menuitem'
                );

                button.addEventListener(
                    'click',
                    event => {
                        event.preventDefault();
                        event.stopPropagation();

                        const fn =
                            action;

                        closeMenu();

                        try {
                            fn();
                        } catch (error) {
                            console.error(
                                '[Notes] Menu action failed:',
                                error
                            );

                            toast(
                                'Action could not be completed'
                            );
                        }
                    }
                );

                menu.appendChild(
                    button
                );
            }
        );

        document.body.appendChild(
            menu
        );

        /*
         * Fixed positioning means getBoundingClientRect()
         * coordinates are directly usable.
         */

        const rect =
            anchor.getBoundingClientRect();

        const menuWidth = 190;

        let left =
            rect.right -
            menuWidth;

        let top =
            rect.bottom + 6;

        if (
            left < 8
        ) {
            left = 8;
        }

        if (
            left + menuWidth >
            window.innerWidth - 8
        ) {
            left =
                window.innerWidth -
                menuWidth -
                8;
        }

        const height =
            menu.offsetHeight;

        if (
            top + height >
            window.innerHeight - 8
        ) {
            top =
                rect.top -
                height -
                6;
        }

        menu.style.position =
            'fixed';

        menu.style.left =
            `${left}px`;

        menu.style.top =
            `${Math.max(8, top)}px`;

        menu.style.zIndex =
            '2147483647';

        /*
         * Outside click.
         */

        setTimeout(() => {
            if (!controller) {
                return;
            }

            document.addEventListener(
                'pointerdown',
                handleOutsideMenu,
                {
                    signal:
                        controller.signal,
                    once: true
                }
            );
        }, 0);
    }

    function handleOutsideMenu(event) {
        if (
            menu &&
            !menu.contains(
                event.target
            )
        ) {
            closeMenu();
        }
    }

    /* ============================================================
     * CARD BINDING
     * ============================================================ */

    function bindNoteCard(card) {
        if (
            !card ||
            card.dataset.notesBound ===
                'true'
        ) {
            return;
        }

        card.dataset.notesBound =
            'true';

        /*
         * Card click.
         */

        card.addEventListener(
            'click',
            event => {
                const favorite =
                    event.target.closest(
                        '.favorite'
                    );

                const more =
                    event.target.closest(
                        '.more'
                    );

                /*
                 * Never allow the card click to interfere
                 * with the star or three-dot buttons.
                 */

                if (
                    favorite ||
                    more
                ) {
                    return;
                }

                selectNote(
                    card.dataset.title
                );
            },
            {
                signal:
                    controller.signal
            }
        );

        /*
         * Favorite.
         */

        const favorite =
            $('.favorite', card);

        if (favorite) {
            favorite.addEventListener(
                'click',
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    toggleFavorite(
                        card.dataset.title
                    );
                },
                {
                    signal:
                        controller.signal
                }
            );
        }

        /*
         * THREE DOTS.
         */

        const more =
            $('.more', card);

        if (more) {
            more.addEventListener(
                'click',
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    const title =
                        card.dataset.title;

                    showMenu(
                        more,
                        [
                            [
                                'Open note',
                                () =>
                                    selectNote(
                                        title
                                    )
                            ],
                            [
                                'Rename',
                                () =>
                                    renameNote(
                                        title
                                    )
                            ],
                            [
                                'Duplicate',
                                () =>
                                    duplicateNote(
                                        title
                                    )
                            ],
                            [
                                'Archive',
                                () =>
                                    archiveNote(
                                        title
                                    )
                            ],
                            [
                                'Export',
                                () =>
                                    exportNote(
                                        title
                                    )
                            ],
                            [
                                'Delete',
                                () =>
                                    deleteNote(
                                        title
                                    )
                            ]
                        ]
                    );
                },
                {
                    signal:
                        controller.signal
                }
            );
        }
    }

    function bindAllCards() {
        $$('.note-card')
            .forEach(
                bindNoteCard
            );
    }

    /* ============================================================
     * EXPORT
     * ============================================================ */

    function exportNote(title) {
        const note =
            getNote(title);

        if (!note) {
            return;
        }

        const data = {
            title,
            subject:
                note.subject,
            system:
                note.system,
            tags:
                note.tags || [],
            content:
                note.content || ''
        };

        const blob =
            new Blob(
                [
                    JSON.stringify(
                        data,
                        null,
                        2
                    )
                ],
                {
                    type:
                        'application/json'
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const link =
            document.createElement(
                'a'
            );

        link.href =
            url;

        link.download =
            title
                .replace(
                    /[^a-z0-9]+/gi,
                    '-'
                )
                .replace(
                    /^-|-$/g,
                    ''
                )
                .toLowerCase() +
            '.json';

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        setTimeout(
            () =>
                URL.revokeObjectURL(
                    url
                ),
            1000
        );

        toast(
            'Note exported'
        );
    }

    /* ============================================================
     * EDITOR-ONLY FULLSCREEN
     * ============================================================
     *
     * This is deliberately different from the previous version.
     *
     * Fullscreen means:
     *
     *   Notes sidebar       HIDDEN
     *   Recent/library      HIDDEN
     *   Context panel       HIDDEN
     *   Notes toolbar       HIDDEN
     *   Header              HIDDEN
     *   Editor              FULL WINDOW
     *
     * The selected note editor becomes the only visible content.
     * ============================================================ */

    function toggleFullscreen() {
    const moduleRoot = getRoot();
    const editor = $('.editor-panel');
    const button = $('#fullscreenBtn');

    if (!moduleRoot || !editor) {
        return;
    }

    const isFullscreen =
        moduleRoot.classList.contains(
            'notes-editor-fullscreen'
        );

    if (!isFullscreen) {

        /*
         * Enter full-screen note mode.
         */

        moduleRoot.classList.add(
            'notes-editor-fullscreen'
        );

        moduleRoot.dataset.editorFullscreen = 'true';

        document.body.classList.add(
            'notes-editor-active-fullscreen'
        );

        /*
         * Save the current note before entering.
         */

        saveCurrentNote(false);

        /*
         * Create the Back button if it does not already exist.
         */

        let backButton =
            $('.notes-fullscreen-back');

        if (!backButton) {
            backButton =
                document.createElement('button');

            backButton.type = 'button';
            backButton.className =
                'notes-fullscreen-back';

            backButton.innerHTML =
                '← <span>Back</span>';

            backButton.setAttribute(
                'aria-label',
                'Exit full screen'
            );

            backButton.addEventListener(
                'click',
                () => {
                    toggleFullscreen();
                },
                {
                    signal:
                        controller.signal
                }
            );

            moduleRoot.appendChild(
                backButton
            );
        }

        backButton.style.display =
            'inline-flex';

        /*
         * Update the fullscreen button.
         */

        if (button) {
            button.innerHTML =
                '⛶ <span>Exit full screen</span>';

            button.setAttribute(
                'aria-label',
                'Exit full screen'
            );
        }

        /*
         * Focus the note editor after the layout
         * has changed.
         */

        requestAnimationFrame(() => {
            $('#editorBody')?.focus();
        });

        toast(
            'Note full screen'
        );

    } else {

        /*
         * Exit full-screen note mode.
         */

        moduleRoot.classList.remove(
            'notes-editor-fullscreen'
        );

        moduleRoot.dataset.editorFullscreen =
            'false';

        document.body.classList.remove(
            'notes-editor-active-fullscreen'
        );

        /*
         * Hide the Back button.
         */

        const backButton =
            $('.notes-fullscreen-back');

        if (backButton) {
            backButton.style.display =
                'none';
        }

        /*
         * Restore the fullscreen button.
         */

        if (button) {
            button.innerHTML =
                '⛶ <span>Full screen</span>';

            button.setAttribute(
                'aria-label',
                'Full screen'
            );
        }

        toast(
            'Full screen closed'
        );
    }
}

    /* ============================================================
     * NOTES NAVIGATION COLLAPSE
     * ============================================================ */

    function toggleNotesNav() {
        const sidebar =
            $('.notes-sidebar');

        const button =
            $('#toggleNotesNav');

        if (
            !sidebar ||
            !button
        ) {
            return;
        }

        sidebar.classList.toggle(
            'collapsed'
        );

        const collapsed =
            sidebar.classList.contains(
                'collapsed'
            );

        button.textContent =
            collapsed
                ? '›'
                : '‹';

        button.title =
            collapsed
                ? 'Expand navigation'
                : 'Collapse navigation';

        button.setAttribute(
            'aria-label',
            button.title
        );
    }

    /* ============================================================
     * IMPORT
     * ============================================================ */

    function setupImport() {
        const button =
            $('#importBtn');

        const input =
            $('#importFile');

        if (
            !button ||
            !input
        ) {
            return;
        }

        button.addEventListener(
            'click',
            event => {
                event.preventDefault();
                input.click();
            },
            {
                signal:
                    controller.signal
            }
        );

        input.addEventListener(
            'change',
            async () => {
                const file =
                    input.files?.[0];

                if (!file) {
                    return;
                }

                try {
                    const text =
                        await file.text();

                    let title =
                        file.name.replace(
                            /\.[^.]+$/,
                            ''
                        );

                    let content;

                    if (
                        file.name
                            .toLowerCase()
                            .endsWith('.json')
                    ) {
                        const imported =
                            JSON.parse(
                                text
                            );

                        title =
                            imported.title ||
                            title;

                        content =
                            imported.content ||
                            `
                                <h1>
                                    ${escapeHTML(title)}
                                </h1>

                                <p>
                                    ${escapeHTML(
                                        imported.text ||
                                        ''
                                    )}
                                </p>
                            `;
                    } else {
                        content = `
                            <h1>
                                ${escapeHTML(title)}
                            </h1>

                            <p>
                                ${escapeHTML(
                                    text
                                ).replace(
                                    /\n/g,
                                    '<br>'
                                )}
                            </p>
                        `;
                    }

                    let finalTitle =
                        title;

                    let number = 2;

                    while (
                        getCard(finalTitle)
                    ) {
                        finalTitle =
                            `${title} (Imported ${number})`;

                        number++;
                    }

                    createImportedNote(
                        finalTitle,
                        content
                    );

                } catch (error) {
                    console.error(
                        '[Notes] Import error:',
                        error
                    );

                    toast(
                        'Could not import that file'
                    );
                }

                input.value = '';
            },
            {
                signal:
                    controller.signal
            }
        );
    }

    function createImportedNote(
        title,
        content
    ) {
        const grid =
            $('#notesGrid');

        if (!grid) {
            return;
        }

        const card =
            document.createElement(
                'article'
            );

        card.className =
            'note-card';

        card.dataset.title =
            title;

        card.dataset.subject =
            'General';

        card.dataset.tags =
            'Imported';

        card.dataset.recent =
            'true';

        card.innerHTML = `
            <div class="note-card-top">
                <span class="subject-pill physiology">
                    General
                </span>

                <button
                    class="star favorite"
                    type="button"
                >
                    ☆
                </button>
            </div>

            <h3>
                ${escapeHTML(title)}
            </h3>

            <p>
                Imported note.
            </p>

            <div class="tag-row">
                <span>
                    Imported
                </span>
            </div>

            <div class="note-footer">
                <span>
                    Just now
                </span>

                <button
                    class="more"
                    type="button"
                >
                    •••
                </button>
            </div>
        `;

        grid.prepend(card);

        state.notes[title] = {
            subject: 'General',
            system: 'Imported',
            tags: ['Imported'],
            favorite: false,
            archived: false,
            content,

            created:
                formattedDate(),

            createdAt:
                timestamp(),

            edited:
                'Just now',

            editedAt:
                timestamp()
        };

        persist();

        bindNoteCard(card);

        selectNote(
            title,
            false
        );

        filterNotes();

        toast(
            'Note imported'
        );
    }

    /* ============================================================
     * FILTER MENUS
     * ============================================================ */

    function setupFilters() {
        const filterButton =
            $('#filterBtn');

        if (filterButton) {
            filterButton.addEventListener(
                'click',
                event => {
                    event.preventDefault();

                    showMenu(
                        event.currentTarget,
                        [
                            [
                                'All notes',
                                () => {
                                    activeFilter =
                                        'all';

                                    activeSubject =
                                        '';

                                    activeTag =
                                        '';

                                    filterNotes();
                                }
                            ],
                            [
                                'Recent',
                                () => {
                                    activeFilter =
                                        'recent';

                                    activeSubject =
                                        '';

                                    activeTag =
                                        '';

                                    filterNotes();
                                }
                            ],
                            [
                                'Favorites',
                                () => {
                                    activeFilter =
                                        'favorites';

                                    activeSubject =
                                        '';

                                    activeTag =
                                        '';

                                    filterNotes();
                                }
                            ],
                            [
                                'Archived',
                                () => {
                                    activeFilter =
                                        'archived';

                                    activeSubject =
                                        '';

                                    activeTag =
                                        '';

                                    filterNotes();
                                }
                            ]
                        ]
                    );
                },
                {
                    signal:
                        controller.signal
                }
            );
        }

        const subjectButton =
            $('#subjectBtn');

        if (subjectButton) {
            subjectButton.addEventListener(
                'click',
                event => {
                    event.preventDefault();

                    showMenu(
                        event.currentTarget,
                        [
                            [
                                'All subjects',
                                () => {
                                    activeSubject =
                                        '';

                                    activeFilter =
                                        'all';

                                    filterNotes();
                                }
                            ],

                            ...[
                                'Anatomy',
                                'Physiology',
                                'Pharmacology',
                                'Microbiology',
                                'Pathology',
                                'Neuroanatomy',
                                'Obstetrics & Gynaecology'
                            ].map(
                                subject => [
                                    subject,
                                    () => {
                                        activeSubject =
                                            subject;

                                        activeFilter =
                                            'all';

                                        activeTag =
                                            '';

                                        filterNotes();
                                    }
                                ]
                            )
                        ]
                    );
                },
                {
                    signal:
                        controller.signal
                }
            );
        }

        const tagsButton =
            $('#tagsBtn');

        if (tagsButton) {
            tagsButton.addEventListener(
                'click',
                event => {
                    event.preventDefault();

                    showMenu(
                        event.currentTarget,
                        [
                            [
                                'All tags',
                                () => {
                                    activeTag =
                                        '';

                                    activeFilter =
                                        'all';

                                    filterNotes();
                                }
                            ],

                            ...[
                                'High Yield',
                                'Clinical',
                                'Exam',
                                'Mechanism',
                                'Drugs',
                                'Definitions',
                                'New',
                                'Imported',
                                'Quick Capture'
                            ].map(
                                tag => [
                                    tag,
                                    () => {
                                        activeTag =
                                            tag;

                                        activeFilter =
                                            'all';

                                        filterNotes();
                                    }
                                ]
                            )
                        ]
                    );
                },
                {
                    signal:
                        controller.signal
                }
            );
        }
    }

    /* ============================================================
     * SORT
     * ============================================================ */

    function sortCards(mode) {
        const grid =
            $('#notesGrid');

        if (!grid) {
            return;
        }

        const cards =
            Array.from(
                grid.children
            );

        cards.sort(
            (a, b) => {
                const aTitle =
                    a.dataset.title ||
                    '';

                const bTitle =
                    b.dataset.title ||
                    '';

                if (mode === 'az') {
                    return aTitle.localeCompare(
                        bTitle
                    );
                }

                if (mode === 'za') {
                    return bTitle.localeCompare(
                        aTitle
                    );
                }

                const aNote =
                    getNote(aTitle);

                const bNote =
                    getNote(bTitle);

                return (
                    (bNote?.editedAt || 0) -
                    (aNote?.editedAt || 0)
                );
            }
        );

        cards.forEach(card =>
            grid.appendChild(card)
        );

        toast(
            mode === 'az'
                ? 'Sorted A–Z'
                : mode === 'za'
                    ? 'Sorted Z–A'
                    : 'Sorted by recent edits'
        );
    }

    function setupSorting() {
        const sort =
            $('#sortBtn');

        if (sort) {
            sort.addEventListener(
                'click',
                event => {
                    showMenu(
                        event.currentTarget,
                        [
                            [
                                'Recently edited',
                                () =>
                                    sortCards(
                                        'recent'
                                    )
                            ],
                            [
                                'A–Z',
                                () =>
                                    sortCards(
                                        'az'
                                    )
                            ],
                            [
                                'Z–A',
                                () =>
                                    sortCards(
                                        'za'
                                    )
                            ]
                        ]
                    );
                },
                {
                    signal:
                        controller.signal
                }
            );
        }

        const compact =
            $('#sortCompact');

        if (compact) {
            compact.addEventListener(
                'click',
                event => {
                    showMenu(
                        event.currentTarget,
                        [
                            [
                                'Recently edited',
                                () =>
                                    sortCards(
                                        'recent'
                                    )
                            ],
                            [
                                'A–Z',
                                () =>
                                    sortCards(
                                        'az'
                                    )
                            ],
                            [
                                'Z–A',
                                () =>
                                    sortCards(
                                        'za'
                                    )
                            ]
                        ]
                    );
                },
                {
                    signal:
                        controller.signal
                }
            );
        }
    }

    /* ============================================================
     * SEARCH
     * ============================================================ */

    function setupSearch() {
        const search =
            $('#noteSearch');

        if (search) {
            search.addEventListener(
                'input',
                filterNotes,
                {
                    signal:
                        controller.signal
                }
            );
        }

        const searchButton =
            $('#searchBtn');

        if (searchButton) {
            searchButton.addEventListener(
                'click',
                () => {
                    search?.focus();
                },
                {
                    signal:
                        controller.signal
                }
            );
        }
    }

    /* ============================================================
     * EDITOR FORMATTING
     * ============================================================ */

    function executeCommand(
        command,
        value = null
    ) {
        const body =
            $('#editorBody');

        if (!body) {
            return;
        }

        body.focus();

        try {
            document.execCommand(
                command,
                false,
                value
            );
        } catch (error) {
            console.warn(
                '[Notes] Command failed:',
                command,
                error
            );
        }

        updateStats();
        scheduleSave();
    }

    function setupFormatting() {
    $$('.format-toolbar [data-command]')
        .forEach(button => {
            button.addEventListener(
                'click',
                event => {
                    event.preventDefault();

                    executeCommand(
                        button.dataset.command,
                        button.dataset.value ||
                            null
                    );
                },
                {
                    signal:
                        controller.signal
                }
            );
        });

    /*
     * =========================================================
     * TEXT COLOR
     * =========================================================
     *
     * Changes the color of the currently selected text.
     */
    $$('.text-color-option')
        .forEach(button => {
            button.addEventListener(
                'mousedown',
                event => {
                    /*
                     * Prevent the editor from losing its
                     * current text selection before the
                     * color is applied.
                     */
                    event.preventDefault();
                },
                {
                    signal:
                        controller.signal
                }
            );

            button.addEventListener(
                'click',
                event => {
                    event.preventDefault();

                    const color =
                        button.dataset.textColor;

                    if (!color) {
                        return;
                    }

                    const editor =
                        $('#editorBody');

                    if (!editor) {
                        return;
                    }

                    editor.focus();

                    document.execCommand(
                        'foreColor',
                        false,
                        color
                    );

                    /*
                     * Save the new HTML immediately so the
                     * color persists.
                     */
                    saveCurrentNote(false);
                },
                {
                    signal:
                        controller.signal
                }
            );
        });

    /*
     * =========================================================
     * FORMAT SELECT
     * =========================================================
     */

    const formatSelect =
        $('.format-select');

    if (formatSelect) {
        formatSelect.addEventListener(
            'click',
            event => {
                showMenu(
                    event.currentTarget,
                    [
                        [
                            'Paragraph',
                            () =>
                                executeCommand(
                                    'formatBlock',
                                    'p'
                                )
                        ],
                        [
                            'Heading 1',
                            () =>
                                executeCommand(
                                    'formatBlock',
                                    'h1'
                                )
                        ],
                        [
                            'Heading 2',
                            () =>
                                executeCommand(
                                    'formatBlock',
                                    'h2'
                                )
                        ],
                        [
                            'Heading 3',
                            () =>
                                executeCommand(
                                    'formatBlock',
                                    'h3'
                                )
                        ]
                    ]
                );
            },
            {
                signal:
                    controller.signal
            }
        );
    }

    /*
     * =========================================================
     * INSERT LINK
     * =========================================================
     */

    const link =
        $('#insertLinkBtn');

    if (link) {
        link.addEventListener(
            'click',
            () => {
                const url =
                    window.prompt(
                        'Enter URL:',
                        'https://'
                    );

                if (!url) {
                    return;
                }

                executeCommand(
                    'createLink',
                    url
                );
            },
            {
                signal:
                    controller.signal
            }
        );
    }

    /*
     * =========================================================
     * INSERT TABLE
     * =========================================================
     */

    const table =
        $('#insertTableBtn');

    if (table) {
        table.addEventListener(
            'click',
            () => {
                executeCommand(
                    'insertHTML',
                    `
                        <table>
                            <tbody>
                                <tr>
                                    <td>Heading</td>
                                    <td>Value</td>
                                </tr>
                                <tr>
                                    <td>Item</td>
                                    <td>Detail</td>
                                </tr>
                            </tbody>
                        </table>
                    `
                );
            },
            {
                signal:
                    controller.signal
            }
        );
    }

    /*
     * =========================================================
     * INSERT IMAGE
     * =========================================================
     */

    const image =
        $('#insertImageBtn');

    if (image) {
        image.addEventListener(
            'click',
            insertImage,
            {
                signal:
                    controller.signal
            }
        );
    }
}




    function exportCurrent() {

    const title =
        $('#editorTitle')
            ?.textContent
            ?.trim();

    const body =
        $('#editorBody');

    if (!title || !body) {

        toast(
            'No note is currently open.'
        );

        return;
    }

    if (
        !window.jspdf ||
        !window.jspdf.jsPDF
    ) {

        toast(
            'PDF export is unavailable.'
        );

        console.error(
            '[NOTES] jsPDF library is not loaded.'
        );

        return;
    }

    /*
     * Save the latest editor contents first.
     */
    saveCurrentNote(false);

    const {
        jsPDF
    } = window.jspdf;

    const pdf =
        new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

    const pageWidth =
        pdf.internal.pageSize.getWidth();

    const pageHeight =
        pdf.internal.pageSize.getHeight();

    const margin = 18;

    const contentWidth =
        pageWidth -
        (margin * 2);

    let y = margin;

    /*
     * Title.
     */
    pdf.setFont(
        'helvetica',
        'bold'
    );

    pdf.setFontSize(20);

    pdf.setTextColor(
        30,
        30,
        30
    );

    const titleLines =
        pdf.splitTextToSize(
            title,
            contentWidth
        );

    pdf.text(
        titleLines,
        margin,
        y
    );

    y +=
        titleLines.length *
        8;

    /*
     * Subject.
     */
    const note =
        state.notes[title];

    if (
        note?.subject
    ) {

        pdf.setFont(
            'helvetica',
            'normal'
        );

        pdf.setFontSize(10);

        pdf.setTextColor(
            100,
            100,
            100
        );

        pdf.text(
            `Subject: ${note.subject}`,
            margin,
            y
        );

        y += 8;
    }

    /*
     * Separator.
     */
    pdf.setDrawColor(
        210,
        210,
        210
    );

    pdf.line(
        margin,
        y,
        pageWidth - margin,
        y
    );

    y += 8;

    /*
     * Convert editor HTML to readable text.
     *
     * We preserve the major text structure.
     */
    const clone =
        body.cloneNode(true);

    clone
        .querySelectorAll(
            'script, style'
        )
        .forEach(
            element =>
                element.remove()
        );

    const blocks =
        Array.from(
            clone.querySelectorAll(
                'h1, h2, h3, h4, p, li, div'
            )
        )
        .filter(
            element =>
                element.textContent.trim()
        );

    /*
     * If no block elements exist,
     * fall back to plain text.
     */
    const elements =
        blocks.length
            ? blocks
            : [clone];

    elements.forEach(
        element => {

            let text =
                element.textContent
                    .replace(
                        /\s+/g,
                        ' '
                    )
                    .trim();

            if (!text) {
                return;
            }

            /*
             * Heading sizes.
             */
            let fontSize = 11;
            let fontStyle = 'normal';

            const tag =
                element.tagName
                    .toLowerCase();

            if (tag === 'h1') {

                fontSize = 17;
                fontStyle = 'bold';

                y += 3;

            } else if (
                tag === 'h2'
            ) {

                fontSize = 15;
                fontStyle = 'bold';

                y += 2;

            } else if (
                tag === 'h3'
            ) {

                fontSize = 13;
                fontStyle = 'bold';

                y += 2;

            } else if (
                tag === 'h4'
            ) {

                fontSize = 12;
                fontStyle = 'bold';
            }

            /*
             * List item.
             */
            if (tag === 'li') {
                text =
                    '• ' +
                    text;
            }

            pdf.setFont(
                'helvetica',
                fontStyle
            );

            pdf.setFontSize(
                fontSize
            );

            pdf.setTextColor(
                35,
                35,
                35
            );

            const lines =
                pdf.splitTextToSize(
                    text,
                    contentWidth
                );

            /*
             * New page if required.
             */
            const requiredHeight =
                lines.length *
                (fontSize * 0.42) +
                5;

            if (
                y + requiredHeight >
                pageHeight - margin
            ) {

                pdf.addPage();

                y = margin;
            }

            pdf.text(
                lines,
                margin,
                y
            );

            y +=
                lines.length *
                (fontSize * 0.42) +
                5;
        }
    );

    /*
     * Footer.
     */
    pdf.setFont(
        'helvetica',
        'normal'
    );

    pdf.setFontSize(8);

    pdf.setTextColor(
        120,
        120,
        120
    );

    pdf.text(
        'YEAR 3 STUDY OS',
        margin,
        pageHeight - 10
    );

    /*
     * Safe filename.
     */
    const filename =
        title
            .replace(
                /[<>:"/\\|?*]/g,
                ''
            )
            .replace(
                /\s+/g,
                '_'
            )
            .substring(
                0,
                100
            ) ||
        'note';

    pdf.save(
        `${filename}.pdf`
    );

    toast(
        'Note exported as PDF'
    );
}

    function insertImage() {
        const input =
            document.createElement(
                'input'
            );

        input.type =
            'file';

        input.accept =
            'image/*';

        input.addEventListener(
            'change',
            () => {
                const file =
                    input.files?.[0];

                if (!file) {
                    return;
                }

                const reader =
                    new FileReader();

                reader.onload =
                    () => {
                        executeCommand(
                            'insertHTML',
                            `
                                <img
                                    src="${reader.result}"
                                    alt="${escapeHTML(file.name)}"
                                    style="
                                        max-width:100%;
                                        height:auto;
                                        border-radius:8px;
                                        display:block;
                                        margin:12px 0;
                                    "
                                >
                            `
                        );

                        toast(
                            'Image inserted'
                        );
                    };

                reader.readAsDataURL(
                    file
                );
            }
        );

        input.click();
    }

    /* ============================================================
     * EDITOR CONTROLS
     * ============================================================ */

    function setupEditor() {
        const body =
            $('#editorBody');

        if (body) {
            body.addEventListener(
                'input',
                () => {
                    updateStats();
                    scheduleSave();
                },
                {
                    signal:
                        controller.signal
                }
            );
        }

        const favorite =
            $('#editorFavorite');

        if (favorite) {
            favorite.addEventListener(
                'click',
                () => {
                    const title =
                        $('#editorTitle')
                            ?.textContent
                            ?.trim();

                    if (title) {
                        toggleFavorite(
                            title
                        );
                    }
                },
                {
                    signal:
                        controller.signal
                }
            );
        }

        const close =
            $('#closeEditor');

        if (close) {
            close.addEventListener(
                'click',
                () => {
                    const panel =
                        $('.editor-panel');

                    if (!panel) {
                        return;
                    }

                    panel.classList.toggle(
                        'editor-closed'
                    );

                    const closed =
                        panel.classList.contains(
                            'editor-closed'
                        );

                    close.textContent =
                        closed
                            ? '↗'
                            : '×';

                    toast(
                        closed
                            ? 'Editor minimized'
                            : 'Editor reopened'
                    );
                },
                {
                    signal:
                        controller.signal
                }
            );
        }

        const more =
            $('#editorMore');

        if (more) {
            more.addEventListener(
                'click',
                event => {
                    const title =
                        $('#editorTitle')
                            ?.textContent
                            ?.trim();

                    if (!title) {
                        return;
                    }

                    showMenu(
                        event.currentTarget,
                        [
                            [
                                'Rename note',
                                () =>
                                    renameNote(
                                        title
                                    )
                            ],
                            [
                                'Duplicate note',
                                () =>
                                    duplicateNote(
                                        title
                                    )
                            ],
                            [
                                'Archive note',
                                () =>
                                    archiveNote(
                                        title
                                    )
                            ],
                            [
                                'Export note',
                                () =>
                                    exportNote(
                                        title
                                    )
                            ],
                            [
                                'Delete note',
                                () =>
                                    deleteNote(
                                        title
                                    )
                            ]
                        ]
                    );
                },
                {
                    signal:
                        controller.signal
                }
            );
        }

        const share =
            $('#shareBtn');

        if (share) {
            share.addEventListener(
                'click',
                async () => {
                    const title =
                        $('#editorTitle')
                            ?.textContent
                            ?.trim() ||
                        '';

                    const text =
                        title +
                        '\n\n' +
                        (
                            $('#editorBody')
                                ?.innerText ||
                            ''
                        );

                    try {
                        if (
                            navigator.clipboard &&
                            navigator.clipboard
                                .writeText
                        ) {
                            await navigator
                                .clipboard
                                .writeText(
                                    text
                                );

                            toast(
                                'Note copied to clipboard'
                            );
                        } else {
                            fallbackCopy(
                                text
                            );
                        }
                    } catch {
                        fallbackCopy(
                            text
                        );
                    }
                },
                {
                    signal:
                        controller.signal
                }
            );
        }
    }

    function fallbackCopy(text) {
        const area =
            document.createElement(
                'textarea'
            );

        area.value =
            text;

        area.style.position =
            'fixed';

        area.style.opacity =
            '0';

        document.body.appendChild(
            area
        );

        area.select();

        try {
            document.execCommand(
                'copy'
            );

            toast(
                'Note copied to clipboard'
            );
        } catch {
            toast(
                'Clipboard unavailable'
            );
        }

        area.remove();
    }

    /* ============================================================
     * RECENT / RELATED / VIEWS
     * ============================================================ */

    function setupRecent() {
        $$('.recent-card')
            .forEach(card => {
                card.addEventListener(
                    'click',
                    () => {
                        const title =
                            card.dataset.note;

                        if (title) {
                            selectNote(
                                title
                            );
                        }
                    },
                    {
                        signal:
                            controller.signal
                    }
                );
            });

        const recent =
            $('#viewRecent');

        if (recent) {
            recent.addEventListener(
                'click',
                () => {
                    activeFilter =
                        'recent';

                    activeSubject =
                        '';

                    activeTag =
                        '';

                    filterNotes();

                    toast(
                        'Showing recent notes'
                    );
                },
                {
                    signal:
                        controller.signal
                }
            );
        }
    }

    function setupViews() {
        $$('.view')
            .forEach(button => {
                button.addEventListener(
                    'click',
                    () => {
                        $$('.view')
                            .forEach(item =>
                                item.classList.remove(
                                    'active'
                                )
                            );

                        button.classList.add(
                            'active'
                        );

                        const grid =
                            $('.notes-grid');

                        if (grid) {
                            grid.classList.toggle(
                                'list-mode',
                                button.title ===
                                    'List'
                            );
                        }

                        toast(
                            button.title ===
                                'List'
                                ? 'List view'
                                : 'Grid view'
                        );
                    },
                    {
                        signal:
                            controller.signal
                    }
                );
            });
    }

    function setupRelated() {
        $$('.related-list button')
            .forEach(button => {
                button.addEventListener(
                    'click',
                    () => {
                        const title =
                            button.dataset.related;

                        if (
                            title &&
                            getCard(title)
                        ) {
                            selectNote(
                                title
                            );
                        } else {
                            toast(
                                'Related note is not available'
                            );
                        }
                    },
                    {
                        signal:
                            controller.signal
                    }
                );
            });

        const all =
            $('#relatedAll');

        if (all) {
            all.addEventListener(
                'click',
                () => {
                    activeFilter =
                        'all';

                    activeSubject =
                        '';

                    activeTag =
                        '';

                    filterNotes();

                    toast(
                        'Showing all notes'
                    );
                },
                {
                    signal:
                        controller.signal
                }
            );
        }
    }

    /* ============================================================
     * SIDEBAR FILTERS
     * ============================================================ */

    function setupSidebarFilters() {
        $$('.note-nav[data-filter]')
            .forEach(button => {
                button.addEventListener(
                    'click',
                    () => {
                        activeFilter =
                            button.dataset.filter ||
                            'all';

                        activeSubject =
                            '';

                        activeTag =
                            '';

                        $$('.note-nav')
                            .forEach(item =>
                                item.classList.remove(
                                    'active'
                                )
                            );

                        button.classList.add(
                            'active'
                        );

                        filterNotes();
                    },
                    {
                        signal:
                            controller.signal
                    }
                );
            });

        $$('.subject-filter')
            .forEach(button => {
                button.addEventListener(
                    'click',
                    () => {
                        activeSubject =
                            button.dataset.subject ||
                            '';

                        activeFilter =
                            'all';

                        activeTag =
                            '';

                        filterNotes();

                        toast(
                            `Subject: ${activeSubject}`
                        );
                    },
                    {
                        signal:
                            controller.signal
                    }
                );
            });

        $$('.tag-cloud button')
            .forEach(button => {
                button.addEventListener(
                    'click',
                    () => {
                        activeTag =
                            button.dataset.tag ||
                            '';

                        activeFilter =
                            'all';

                        activeSubject =
                            '';

                        filterNotes();

                        toast(
                            `Tag: ${activeTag}`
                        );
                    },
                    {
                        signal:
                            controller.signal
                    }
                );
            });
    }

    /* ============================================================
     * MAIN BUTTONS
     * ============================================================ */

    function setupMainButtons() {
        /*
         * ADD NOTE
         *
         * Use both click and pointerup protection.
         * The click listener is the actual action.
         */

        const newNote =
            $('#newNote');

        if (newNote) {
            newNote.type =
                'button';

            newNote.addEventListener(
                'click',
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    createNote();
                },
                {
                    signal:
                        controller.signal
                }
            );
        }

        const newNoteTop =
            $('#newNoteTop');

        if (newNoteTop) {
            newNoteTop.type =
                'button';

            newNoteTop.addEventListener(
                'click',
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    createNote();
                },
                {
                    signal:
                        controller.signal
                }
            );
        }

        const quick =
            $('#quickCapture');

        if (quick) {
            quick.type =
                'button';

            quick.addEventListener(
                'click',
                event => {
                    event.preventDefault();

                    quickCapture();
                },
                {
                    signal:
                        controller.signal
                }
            );
        }

        const toggle =
            $('#toggleNotesNav');

        if (toggle) {
            toggle.addEventListener(
                'click',
                event => {
                    event.preventDefault();

                    toggleNotesNav();
                },
                {
                    signal:
                        controller.signal
                }
            );
        }

        const fullscreen =
            $('#fullscreenBtn');

        if (fullscreen) {
            fullscreen.type =
                'button';

            fullscreen.addEventListener(
                'click',
                event => {
                    event.preventDefault();

                    toggleFullscreen();
                },
                {
                    signal:
                        controller.signal
                }
            );
        }
    }

    /* ============================================================
     * AI
     * ============================================================ */

    async function askNotesAI(instruction) {

    const title =
        $('#editorTitle')
            ?.textContent
            ?.trim();

    const note =
        title
            ? state.notes[title]
            : null;

    if (!note) {
        toast('Select a note first.');
        return null;
    }

    const content =
        String(note.content || '').trim();

    if (!content) {
        toast('The current note is empty.');
        return null;
    }

    if (
        !window.year3 ||
        !window.year3.ai ||
        typeof window.year3.ai.ask !== 'function'
    ) {
        console.error(
            '[NOTES AI] window.year3.ai.ask() is unavailable.',
            window.year3
        );

        toast('AI connection unavailable.');
        return null;
    }


    /*
     * ---------------------------------------------------------
     * BUILD AI PROMPT
     * ---------------------------------------------------------
     */

    const prompt = `
You are the AI study assistant inside Year 3 Study OS.

The user is a medical student.

CURRENT NOTE

Title:
${note.title || title || 'Untitled'}

Subject:
${note.subject || 'General Medicine'}

Tags:
${
    Array.isArray(note.tags)
        ? note.tags.join(', ')
        : String(note.tags || '')
}

NOTE CONTENT:
${content}


USER TASK:
${instruction}


RESPONSE REQUIREMENTS

Give a medically accurate response appropriate for
a Year 3 medical student.

Use the current note as context whenever relevant.

Preserve important medical terminology.

Do not unnecessarily repeat the entire note.

Do not use Markdown.

Do not use Markdown headings.

Do not use Markdown bold or italics.

Do not use code fences.

Do not use Markdown bullet syntax.

Do not add introductory phrases such as:
"Sure"
"Here is the answer"
"As an AI"
"Certainly"


STRICT STRUCTURED OUTPUT FORMAT

For explanations use:

SECTION: Section title
TEXT: Explanation
BULLET: Important point
BULLET: Important point


For essay questions use:

SECTION: Essay Questions
QUESTION: Question
TEXT: Answer


For multiple-choice questions use:

SECTION: Multiple Choice Questions
QUESTION: Question
OPTION: A. Option
OPTION: B. Option
OPTION: C. Option
OPTION: D. Option
ANSWER: B
EXPLANATION: Explanation


For flashcards use:

SECTION: Flashcards
FLASHCARD: Question
CARD_ANSWER: Answer


SEPARATION

Separate independent questions, answers, essay items,
MCQs, or flashcards with:

SEPARATOR


ABSOLUTE FORMATTING RULES

1. Every protocol marker MUST begin on its own line.

2. NEVER put two protocol markers on the same line.

3. NEVER write:

SECTION: X QUESTION: Y TEXT: Z

4. Instead write:

SECTION: X
QUESTION: Y
TEXT: Z

5. Every question must be completed before moving to
the next question.

6. Do not intentionally truncate an answer.

7. If the task contains multiple questions, answer all
questions requested by the user.

8. Keep explanations focused but complete.

9. Do not stop in the middle of a word or sentence.

10. Before finishing, verify that the final sentence is
complete.

11. Do not output protocol instructions themselves.

12. Do not output Markdown.

13. Do not add commentary outside the requested format.
`;


    /*
     * ---------------------------------------------------------
     * AI REQUEST
     * ---------------------------------------------------------
     *
     * Keep BOTH message and prompt because the central
     * AI bridge currently expects message, while other
     * parts of the application may still inspect prompt.
     */

    try {

        console.log(
            '[NOTES AI] Sending request...'
        );

        const response =
            await window.year3.ai.ask({

                message: prompt,

                prompt: prompt,

                module: 'Y3-001-Notes',

                subject:
                    note.subject ||
                    'Notes',

                topic:
                    note.title ||
                    title ||
                    'Current Note',

                content: content,

                /*
                 * Requested generation size.
                 *
                 * The central bridge may ignore this if it
                 * does not support the property. In that case
                 * the real limit must be changed in the
                 * backend/provider implementation.
                 */
                maxTokens: 6000,

                max_tokens: 6000,

                maxOutputTokens: 6000
            });


        /*
         * -----------------------------------------------------
         * VALIDATE RESPONSE
         * -----------------------------------------------------
         */

        if (!response) {
            throw new Error(
                'AI returned an empty response.'
            );
        }


        /*
         * -----------------------------------------------------
         * EXTRACT RESPONSE TEXT
         * -----------------------------------------------------
         */

        const answer =
            typeof response === 'string'
                ? response
                : response.answer ||
                  response.response ||
                  response.content ||
                  response.text ||
                  JSON.stringify(response);


        const finalAnswer =
            String(answer).trim();


        if (!finalAnswer) {
            throw new Error(
                'AI returned an empty response.'
            );
        }


        /*
         * -----------------------------------------------------
         * DEBUGGING
         * -----------------------------------------------------
         */

        console.log(
            '[NOTES AI] Response received:',
            finalAnswer
        );

        console.log(
            '[NOTES AI] Response length:',
            finalAnswer.length
        );


        return finalAnswer;


    } catch (error) {

        console.error(
            '[NOTES AI] Request failed:',
            error
        );

        toast(
            error?.message
                ? `AI error: ${error.message}`
                : 'AI request failed.'
        );

        return null;
    }
}


async function askCustomAIQuestion() {

    const questionEl = $('#aiQuestion');

    if (!questionEl) {
        return;
    }

    const question = questionEl.value.trim();

    if (!question) {
        toast('Enter a question first.');
        questionEl.focus();
        return;
    }

    const title =
        $('#editorTitle')
            ?.textContent
            ?.trim();

    const note =
        title
            ? state.notes[title]
            : null;

    if (!note) {
        toast('Select a note first.');
        return;
    }

    const responseContainer =
        $('#aiResponseContainer');

    const responseEl =
        $('#aiResponse');

    const statusEl =
        $('#aiResponseStatus');

    const askButton =
        $('#aiAskButton');

    if (!responseEl) {
        return;
    }

    /*
     * Get the actual note content.
     */
    const content =
        note.content ||
        '';

    /*
     * Show response area.
     */
    if (responseContainer) {
        responseContainer.style.display = 'block';
    }

    if (statusEl) {
        statusEl.textContent = 'Thinking...';
    }

    if (askButton) {
        askButton.disabled = true;
        askButton.textContent = 'Thinking...';
    }

    responseEl.textContent = '';

    try {

        const prompt = `
You are assisting with a medical study note for a Year 3 medical student.

CURRENT NOTE TITLE:
${title}

CURRENT NOTE SUBJECT:
${note.subject || 'General Medicine'}

CURRENT NOTE CONTENT:
${content}

USER QUESTION:
${question}

Instructions:

1. Answer the user's question accurately at a Year 3 medical-student level.
2. Use the current note as context whenever relevant.
3. Be clinically accurate, concise, and educational.
4. Do not use Markdown.
5. Do not use code fences.
6. Do not use Markdown headings, bold, italics, or Markdown bullet syntax.
7. Return the answer using ONLY the following plain-text protocol.

For a normal explanation:

SECTION: Section title
TEXT: Explanation
BULLET: Important point
BULLET: Important point

For essay questions:

SECTION: Essay Questions
QUESTION: Question text
TEXT: Answer guidance or explanation

For multiple-choice questions:

SECTION: Multiple Choice Questions
QUESTION: Question
OPTION: A. Option
OPTION: B. Option
OPTION: C. Option
OPTION: D. Option
ANSWER: B
EXPLANATION: Explanation

For flashcards:

SECTION: Flashcards
FLASHCARD: Question
CARD_ANSWER: Answer

Separate major items with:

SEPARATOR

IMPORTANT OUTPUT RULES:

- Every protocol marker MUST start on a new line.
- Never put two protocol markers on the same line.
- Always complete the current answer before stopping.
- Do not intentionally truncate an answer.
- Do not add introductory comments such as "Sure", "Here is the answer", or "As an AI".
- Do not include citations unless specifically requested.
- Keep the response focused on the user's question.
`;

        const answer =
            await askNotesAI(prompt);

        /*
         * The module may have been destroyed (navigation away
         * from Notes) while this request was in flight. Bail
         * out rather than writing a stale response into DOM
         * elements that — after a subsequent re-init — may now
         * belong to a completely different Notes instance/note.
         */
        if (destroyed) {
            return;
        }

        if (!answer) {

            if (statusEl) {
                statusEl.textContent = 'No response';
            }

            return;
        }

        /*
         * Preserve the original AI response for
         * the Save / Copy functionality.
         */
        lastAIResponse = String(answer);

        /*
         * Format the response for display.
         *
         * IMPORTANT:
         * cleanAIResponseForDisplay() must exist
         * elsewhere in module.js.
         */
        const formatted =
            cleanAIResponseForDisplay(
                String(answer)
            );

        responseEl.textContent =
            formatted;

        if (responseContainer) {
            responseContainer.style.display =
                'block';
        }

        if (statusEl) {
            statusEl.textContent =
                'Response ready';
        }

    } catch (error) {

        console.error(
            '[NOTES AI] Custom question failed:',
            error
        );

        responseEl.textContent =
            'Unable to generate a response.';

        if (statusEl) {
            statusEl.textContent =
                'Error';
        }

    } finally {

        if (askButton) {
            askButton.disabled = false;
            askButton.textContent =
                '✦ Ask AI';
        }
    }
}

function saveAIResponseToNote() {
    if (!lastAIResponse) {
        toast('There is no AI response to save.');
        return;
    }

    const body =
        $('#editorBody');

    if (!body) {
        toast('Note editor unavailable.');
        return;
    }

    const wrapper =
        document.createElement('div');

    wrapper.className =
        'saved-ai-section';

    /*
     * ---------------------------------------------------------
     * AI SECTION HEADER
     * ---------------------------------------------------------
     */

    const separator =
        document.createElement('hr');

    wrapper.appendChild(separator);

    const heading =
        document.createElement('h2');

    heading.textContent =
        'AI Response';

    wrapper.appendChild(heading);


    /*
     * ---------------------------------------------------------
     * PARSE STRUCTURED AI OUTPUT
     * ---------------------------------------------------------
     */

    const lines =
        lastAIResponse
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .split('\n');

    let currentList = null;
    let currentListType = null;

    let currentQuestion = null;
    let currentOptions = [];
    let currentAnswer = null;
    let currentExplanation = null;

    let currentFlashcard = null;
    let currentCardAnswer = null;


    function closeList() {

        if (currentList) {
            wrapper.appendChild(
                currentList
            );

            currentList = null;
            currentListType = null;
        }
    }


    function startList(type) {

        if (
            currentList &&
            currentListType === type
        ) {
            return;
        }

        closeList();

        currentList =
            document.createElement(
                type === 'ol'
                    ? 'ol'
                    : 'ul'
            );

        currentListType = type;
    }


    function addQuestionBlock() {

        if (!currentQuestion) {
            return;
        }

        closeList();

        const question =
            document.createElement('div');

        question.className =
            'ai-mcq-question';


        const questionTitle =
            document.createElement('strong');

        questionTitle.textContent =
            currentQuestion;

        question.appendChild(
            questionTitle
        );


        if (currentOptions.length) {

            const options =
                document.createElement('ol');

            currentOptions.forEach(
                optionText => {

                    const li =
                        document.createElement(
                            'li'
                        );

                    li.textContent =
                        optionText;

                    options.appendChild(li);
                }
            );

            question.appendChild(options);
        }


        if (currentAnswer) {

            const answer =
                document.createElement('p');

            const label =
                document.createElement('strong');

            label.textContent =
                'Correct answer: ';

            answer.appendChild(label);

            answer.appendChild(
                document.createTextNode(
                    currentAnswer
                )
            );

            question.appendChild(answer);
        }


        if (currentExplanation) {

            const explanation =
                document.createElement('p');

            const label =
                document.createElement('strong');

            label.textContent =
                'Explanation: ';

            explanation.appendChild(label);

            explanation.appendChild(
                document.createTextNode(
                    currentExplanation
                )
            );

            question.appendChild(
                explanation
            );
        }


        wrapper.appendChild(question);

        currentQuestion = null;
        currentOptions = [];
        currentAnswer = null;
        currentExplanation = null;
    }


    function addFlashcard() {

        if (!currentFlashcard) {
            return;
        }

        closeList();

        const card =
            document.createElement('div');

        card.className =
            'ai-flashcard';


        const question =
            document.createElement('p');

        const questionLabel =
            document.createElement('strong');

        questionLabel.textContent =
            'Question: ';

        question.appendChild(
            questionLabel
        );

        question.appendChild(
            document.createTextNode(
                currentFlashcard
            )
        );


        const answer =
            document.createElement('p');

        const answerLabel =
            document.createElement('strong');

        answerLabel.textContent =
            'Answer: ';

        answer.appendChild(
            answerLabel
        );

        answer.appendChild(
            document.createTextNode(
                currentCardAnswer || ''
            )
        );


        card.appendChild(question);
        card.appendChild(answer);

        wrapper.appendChild(card);

        currentFlashcard = null;
        currentCardAnswer = null;
    }


    /*
     * ---------------------------------------------------------
     * PROCESS EACH LINE
     * ---------------------------------------------------------
     */

    lines.forEach(rawLine => {

        let line =
            rawLine.trim();

        if (!line) {
            return;
        }


        /*
         * Remove accidental Markdown that the model
         * may still have produced.
         */

        line =
            line
                .replace(/^#{1,6}\s*/, '')
                .replace(/^\*\s+/, '')
                .replace(/^[-•]\s+/, '')
                .replace(/^\d+[.)]\s+/, '')
                .replace(/^>\s*/, '')
                .replace(/```/g, '');


        /*
         * SECTION
         */

        if (
            /^SECTION\s*:/i.test(line)
        ) {

            addQuestionBlock();
            addFlashcard();
            closeList();

            const content =
                line
                    .replace(
                        /^SECTION\s*:/i,
                        ''
                    )
                    .trim();

            if (content) {

                const h3 =
                    document.createElement('h3');

                h3.textContent =
                    content
                        .replace(
                            /^\*+|\*+$/g,
                            ''
                        );

                wrapper.appendChild(h3);
            }

            return;
        }


        /*
         * TEXT
         */

        if (
            /^TEXT\s*:/i.test(line)
        ) {

            addQuestionBlock();
            addFlashcard();
            closeList();

            const content =
                line
                    .replace(
                        /^TEXT\s*:/i,
                        ''
                    )
                    .trim();

            if (content) {

                const p =
                    document.createElement('p');

                p.textContent =
                    content;

                wrapper.appendChild(p);
            }

            return;
        }


        /*
         * BULLET
         */

        if (
            /^BULLET\s*:/i.test(line)
        ) {

            addQuestionBlock();
            addFlashcard();

            startList('ul');

            const content =
                line
                    .replace(
                        /^BULLET\s*:/i,
                        ''
                    )
                    .trim();

            const li =
                document.createElement('li');

            li.textContent =
                content;

            currentList.appendChild(li);

            return;
        }


        /*
         * NUMBER
         */

        if (
            /^NUMBER\s*:/i.test(line)
        ) {

            addQuestionBlock();
            addFlashcard();

            startList('ol');

            const content =
                line
                    .replace(
                        /^NUMBER\s*:/i,
                        ''
                    )
                    .trim();

            const li =
                document.createElement('li');

            li.textContent =
                content;

            currentList.appendChild(li);

            return;
        }


        /*
         * MCQ QUESTION
         */

        if (
            /^QUESTION\s*:/i.test(line)
        ) {

            addQuestionBlock();

            closeList();

            currentQuestion =
                line
                    .replace(
                        /^QUESTION\s*:/i,
                        ''
                    )
                    .trim();

            return;
        }


        /*
         * MCQ OPTION
         */

        if (
            /^OPTION\s*:/i.test(line)
        ) {

            closeList();

            const option =
                line
                    .replace(
                        /^OPTION\s*:/i,
                        ''
                    )
                    .trim();

            if (option) {
                currentOptions.push(option);
            }

            return;
        }


        /*
         * MCQ ANSWER
         */

        if (
            /^ANSWER\s*:/i.test(line)
        ) {

            currentAnswer =
                line
                    .replace(
                        /^ANSWER\s*:/i,
                        ''
                    )
                    .trim();

            return;
        }


        /*
         * MCQ EXPLANATION
         */

        if (
            /^EXPLANATION\s*:/i.test(line)
        ) {

            currentExplanation =
                line
                    .replace(
                        /^EXPLANATION\s*:/i,
                        ''
                    )
                    .trim();

            return;
        }


        /*
         * FLASHCARD QUESTION
         */

        if (
            /^FLASHCARD\s*:/i.test(line)
        ) {

            addQuestionBlock();
            addFlashcard();
            closeList();

            currentFlashcard =
                line
                    .replace(
                        /^FLASHCARD\s*:/i,
                        ''
                    )
                    .trim();

            return;
        }


        /*
         * FLASHCARD ANSWER
         */

        if (
            /^CARD_ANSWER\s*:/i.test(line)
        ) {

            currentCardAnswer =
                line
                    .replace(
                        /^CARD_ANSWER\s*:/i,
                        ''
                    )
                    .trim();

            return;
        }


        /*
         * SEPARATOR
         */

        if (
            /^SEPARATOR$/i.test(line)
        ) {

            addQuestionBlock();
            addFlashcard();
            closeList();

            const hr =
                document.createElement('hr');

            wrapper.appendChild(hr);

            return;
        }


        /*
         * FALLBACK TEXT
         *
         * If the AI ignores a marker, don't throw
         * the content away.
         */

        closeList();

        const p =
            document.createElement('p');

        p.textContent =
            line
                .replace(/\*\*/g, '')
                .replace(/\*/g, '')
                .replace(/`/g, '');

        wrapper.appendChild(p);
    });


    /*
     * Finish any pending content.
     */

    addQuestionBlock();
    addFlashcard();
    closeList();


    /*
     * ---------------------------------------------------------
     * APPEND TO NOTE
     * ---------------------------------------------------------
     */

    body.appendChild(wrapper);


    /*
     * Trigger normal note saving.
     */

    body.dispatchEvent(
        new Event(
            'input',
            {
                bubbles: true
            }
        )
    );

    saveCurrentNote(false);


    toast(
        'AI response saved to the bottom of the note.'
    );
}

function cleanAIResponseForDisplay(text) {

    if (!text) {
        return '';
    }

    let value = String(text);

    /*
     * ---------------------------------------------------------
     * 1. REMOVE CODE FENCES
     * ---------------------------------------------------------
     */

    value = value.replace(/```(?:text|markdown|md)?/gi, '');
    value = value.replace(/```/g, '');


    /*
     * ---------------------------------------------------------
     * 2. NORMALIZE LINE ENDINGS
     * ---------------------------------------------------------
     */

    value = value
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');


    /*
     * ---------------------------------------------------------
     * 3. NORMALIZE PROTOCOL MARKERS
     *
     * This is important because the AI sometimes returns:
     *
     * SECTION: X QUESTION: Y TEXT: Z
     *
     * instead of putting each marker on a new line.
     * ---------------------------------------------------------
     */

    const markers = [
        'SECTION:',
        'QUESTION:',
        'TEXT:',
        'NUMBER:',
        'BULLET:',
        'OPTION:',
        'ANSWER:',
        'EXPLANATION:',
        'FLASHCARD:',
        'CARD_ANSWER:',
        'SEPARATOR'
    ];

    for (const marker of markers) {

        const escaped =
            marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        value = value.replace(
            new RegExp(
                '\\s*' + escaped + '\\s*',
                'gi'
            ),
            '\n' + marker + ' '
        );
    }


    /*
     * ---------------------------------------------------------
     * 4. RECOGNIZE VISUAL SEPARATOR LINES
     * ---------------------------------------------------------
     */

    value = value.replace(
        /[─—\-]{8,}/g,
        '\nSEPARATOR\n'
    );


    /*
     * ---------------------------------------------------------
     * 5. REMOVE MARKDOWN FORMATTING
     * ---------------------------------------------------------
     */

    value = value.replace(
        /^#{1,6}\s+/gm,
        ''
    );

    value = value.replace(
        /\*\*(.*?)\*\*/g,
        '$1'
    );

    value = value.replace(
        /__(.*?)__/g,
        '$1'
    );

    value = value.replace(
        /\*([^*\n]+)\*/g,
        '$1'
    );

    value = value.replace(
        /_([^_\n]+)_/g,
        '$1'
    );

    value = value.replace(
        /`([^`\n]+)`/g,
        '$1'
    );


    /*
     * ---------------------------------------------------------
     * 6. NORMALIZE SPACING
     * ---------------------------------------------------------
     */

    value = value
        .replace(/[ \t]+/g, ' ')
        .replace(/\n[ \t]+/g, '\n')
        .trim();


    /*
     * ---------------------------------------------------------
     * 7. PARSE PROTOCOL
     * ---------------------------------------------------------
     */

    const lines =
        value
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);

    const output = [];


    for (const line of lines) {

        /*
         * SECTION
         */

        if (/^SECTION:/i.test(line)) {

            const content =
                line
                    .replace(/^SECTION:\s*/i, '')
                    .trim();

            if (content) {

                output.push('');
                output.push(content);
                output.push('');

            }

            continue;
        }


        /*
         * QUESTION
         */

        if (/^QUESTION:/i.test(line)) {

            const content =
                line
                    .replace(/^QUESTION:\s*/i, '')
                    .trim();

            if (content) {

                output.push('');
                output.push(content);

            }

            continue;
        }


        /*
         * TEXT
         */

        if (/^TEXT:/i.test(line)) {

            const content =
                line
                    .replace(/^TEXT:\s*/i, '')
                    .trim();

            if (content) {
                output.push(content);
            }

            continue;
        }


        /*
         * NUMBER
         */

        if (/^NUMBER:/i.test(line)) {

            const content =
                line
                    .replace(/^NUMBER:\s*/i, '')
                    .trim();

            if (content) {

                output.push('');
                output.push(content);

            }

            continue;
        }


        /*
         * BULLET
         */

        if (/^BULLET:/i.test(line)) {

            const content =
                line
                    .replace(/^BULLET:\s*/i, '')
                    .trim();

            if (content) {
                output.push(`• ${content}`);
            }

            continue;
        }


        /*
         * OPTION
         */

        if (/^OPTION:/i.test(line)) {

            const content =
                line
                    .replace(/^OPTION:\s*/i, '')
                    .trim();

            if (content) {
                output.push(`    ${content}`);
            }

            continue;
        }


        /*
         * ANSWER
         */

        if (/^ANSWER:/i.test(line)) {

            const content =
                line
                    .replace(/^ANSWER:\s*/i, '')
                    .trim();

            if (content) {
                output.push(`Answer: ${content}`);
            }

            continue;
        }


        /*
         * EXPLANATION
         */

        if (/^EXPLANATION:/i.test(line)) {

            const content =
                line
                    .replace(/^EXPLANATION:\s*/i, '')
                    .trim();

            if (content) {
                output.push(`Explanation: ${content}`);
            }

            continue;
        }


        /*
         * FLASHCARD
         */

        if (/^FLASHCARD:/i.test(line)) {

            const content =
                line
                    .replace(/^FLASHCARD:\s*/i, '')
                    .trim();

            if (content) {

                output.push('');
                output.push(content);

            }

            continue;
        }


        /*
         * CARD ANSWER
         */

        if (/^CARD_ANSWER:/i.test(line)) {

            const content =
                line
                    .replace(/^CARD_ANSWER:\s*/i, '')
                    .trim();

            if (content) {
                output.push(content);
            }

            continue;
        }


        /*
         * SEPARATOR
         */

        if (/^SEPARATOR$/i.test(line)) {

            output.push('');
            output.push('────────────────────────────────');
            output.push('');

            continue;
        }


        /*
         * NORMAL TEXT
         */

        output.push(line);
    }


    /*
     * ---------------------------------------------------------
     * 8. CLEAN EXCESSIVE BLANK LINES
     * ---------------------------------------------------------
     */

    return output
        .join('\n')
        .replace(/\n{4,}/g, '\n\n\n')
        .trim();
}

async function copyAIResponse() {
    if (!lastAIResponse) {
        toast('There is no AI response to copy.');
        return;
    }

    try {
        await navigator.clipboard.writeText(
            lastAIResponse
        );

        toast('AI response copied.');

    } catch (error) {

        console.error(
            '[NOTES AI] Copy failed:',
            error
        );

        toast('Could not copy the response.');
    }
}

  async function runAIAction(action) {
    const title =
        $('#editorTitle')
            ?.textContent
            ?.trim();

    const body =
        $('#editorBody');

    if (!title || !body) {
        toast('Select a note first');
        return;
    }

    const text =
        body.innerText.trim();

    if (!text) {
        toast('The note is empty');
        return;
    }

    let instruction = '';

    switch (action) {

        case 'Explain':

            instruction = `
Explain this medical note for a Year 3 medical student.

Focus on:
- difficult concepts
- mechanisms
- terminology
- clinical relevance
- high-yield examination points

Use concise structured study notes.
`;

            break;


        case 'Summarize':

            instruction = `
Create a high-yield summary of this medical note.

Keep:
- definitions
- essential facts
- mechanisms
- classifications
- clinical correlations
- examination-relevant points

Remove repetition and unnecessary wording.
`;

            break;


        case 'Generate MCQs':

            instruction = `
Generate 5 high-quality single-best-answer medical MCQs from this note.

Each question MUST use this structure:

QUESTION: The question
OPTION: A. First option
OPTION: B. Second option
OPTION: C. Third option
OPTION: D. Fourth option
ANSWER: Correct answer
EXPLANATION: Brief explanation
SEPARATOR

Do not use Markdown.
Do not use an essay introduction.
`;

            break;


        case 'Create Flashcards':

            instruction = `
Create concise medical flashcards from this note.

Each flashcard MUST use:

FLASHCARD: Question
CARD_ANSWER: Answer
SEPARATOR

Create approximately 8-15 useful flashcards.

Focus on:
- definitions
- mechanisms
- classifications
- clinical facts
- important relationships
- examination points

Do not use Markdown.
`;

            break;


        case 'Simplify':

            instruction = `
Simplify this medical note for a Year 3 medical student.

Preserve:
- important medical terminology
- essential facts
- mechanisms
- clinical relevance
- high-yield examination points

Use simple explanations and structured study-note content.

Do not write an essay.
`;

            break;


        default:

            instruction = `
Help me understand and revise this medical note.

Return concise structured study-note content.
`;
    }


    const formattingInstruction = `

CRITICAL OUTPUT FORMAT:

Return ONLY plain structured text.

DO NOT use Markdown.

DO NOT use:
# 
##
###
**
*
-
•
1.
2.
backticks
Markdown tables
code blocks

Use ONLY these markers:

SECTION: Heading
TEXT: Paragraph
BULLET: Bullet point
NUMBER: Numbered item
QUESTION: Question
OPTION: Answer option
ANSWER: Correct answer
EXPLANATION: Explanation
FLASHCARD: Question
CARD_ANSWER: Answer
SEPARATOR

Do not put Markdown characters before or around the content.

Do not write conversational filler.
Do not say "Sure", "Of course", "Here is", etc.
`;

    const fullInstruction =
        instruction +
        formattingInstruction;

    toast(
        `${action} — processing…`
    );

    try {

        const output =
            await askNotesAI(fullInstruction);

        /*
         * See the matching guard in askCustomAIQuestion(): if
         * Notes was destroyed while this request was pending,
         * do not write the result anywhere — it may otherwise
         * land in a different Notes instance's DOM after
         * re-init.
         */
        if (destroyed) {
            return;
        }

        if (!output) {
            return;
        }

        lastAIResponse = output;

        const responseContainer =
            $('#aiResponseContainer');

        const responseEl =
            $('#aiResponse');

        const statusEl =
            $('#aiResponseStatus');

        if (responseContainer) {
            responseContainer.style.display =
                'block';
        }

        if (responseEl) {
            responseEl.textContent = String(output)
    .replace(/```/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^[ \t]*[-•*][ \t]+/gm, '• ')
    .replace(/^[ \t]*[0-9]+[.)][ \t]+/gm, '')
    .trim();
        }

        if (statusEl) {
            statusEl.textContent =
                'Response ready';
        }

        toast(
            `${action} response ready`
        );

    } catch (error) {

        console.error(
            '[Notes AI]',
            error
        );

        toast(
            error?.message
                ? `AI error: ${error.message}`
                : 'AI request failed'
        );
    }
}

function setupAI() {
    const askButton = $('#askAi');
    const aiPanel = $('.ai-context');

    if (askButton) {
        askButton.addEventListener(
            'click',
            event => {
                event.preventDefault();
                event.stopPropagation();

                if (!aiPanel) {
                    console.error(
                        '[NOTES AI] .ai-context panel not found.'
                    );

                    toast('AI panel is unavailable.');
                    return;
                }

                const isOpen =
                    aiPanel.classList.contains('ai-context-open');

                if (isOpen) {
                    aiPanel.classList.remove('ai-context-open');

                    askButton.setAttribute(
                        'aria-expanded',
                        'false'
                    );

                    console.log(
                        '[NOTES AI] AI panel closed.'
                    );

                } else {
                    aiPanel.classList.add('ai-context-open');

                    askButton.setAttribute(
                        'aria-expanded',
                        'true'
                    );

                    console.log(
                        '[NOTES AI] AI panel opened.'
                    );
                }
            },
            {
                signal: controller.signal
            }
        );
    }

    /*
     * CUSTOM AI QUESTION
     */

    const customAskButton = $('#aiAskButton');

    if (customAskButton) {
        customAskButton.addEventListener(
            'click',
            async event => {
                event.preventDefault();
                event.stopPropagation();

                await askCustomAIQuestion();
            },
            {
                signal: controller.signal
            }
        );
    }

    /*
     * CTRL + ENTER / CMD + ENTER
     */

    const questionInput = $('#aiQuestion');

    if (questionInput) {
        questionInput.addEventListener(
            'keydown',
            async event => {

                if (
                    event.key === 'Enter' &&
                    (event.ctrlKey || event.metaKey)
                ) {
                    event.preventDefault();

                    await askCustomAIQuestion();
                }

            },
            {
                signal: controller.signal
            }
        );
    }

    /*
     * COPY AI RESPONSE
     */

    const copyButton = $('#aiCopyResponse');

    if (copyButton) {
        copyButton.addEventListener(
            'click',
            async event => {
                event.preventDefault();

                await copyAIResponse();
            },
            {
                signal: controller.signal
            }
        );
    }

    /*
     * SAVE AI RESPONSE TO NOTE
     */

    const saveResponseButton = $('#aiSaveResponse');

    if (saveResponseButton) {
        saveResponseButton.addEventListener(
            'click',
            event => {
                event.preventDefault();

                saveAIResponseToNote();
            },
            {
                signal: controller.signal
            }
        );
    }

    /*
     * QUICK AI ACTIONS
     */

    $$('[data-ai]').forEach(button => {
        button.addEventListener(
            'click',
            async event => {
                event.preventDefault();
                event.stopPropagation();

                const action =
                    button.dataset.ai ||
                    button.textContent.trim();

                await runAIAction(action);
            },
            {
                signal: controller.signal
            }
        );
    });

    console.log('[NOTES] AI UI initialized.');
}

    /* ============================================================
     * KEYBOARD
     * ============================================================ */

    function setupKeyboard() {
        document.addEventListener(
            'keydown',
            event => {
                if (
                    event.key ===
                    'Escape'
                ) {
                    closeMenu();

                    const moduleRoot =
                        getRoot();

                    if (
                        moduleRoot?.classList.contains(
                            'notes-editor-fullscreen'
                        )
                    ) {
                        toggleFullscreen();
                    }

                    return;
                }

                const target =
                    event.target;

                const editing =
                    target?.isContentEditable ||
                    [
                        'INPUT',
                        'TEXTAREA',
                        'SELECT'
                    ].includes(
                        target?.tagName
                    );

                if (
                    (event.ctrlKey ||
                        event.metaKey) &&
                    event.key.toLowerCase() ===
                        'f'
                ) {
                    event.preventDefault();

                    $('#noteSearch')?.focus();

                    return;
                }

                if (
                    (event.ctrlKey ||
                        event.metaKey) &&
                    event.key.toLowerCase() ===
                        'k'
                ) {
                    event.preventDefault();

                    $('#noteSearch')?.focus();

                    return;
                }

                if (editing) {
                    return;
                }

                if (
                    event.key.toLowerCase() ===
                    'n'
                ) {
                    event.preventDefault();

                    createNote();

                    return;
                }

                if (
                    event.key.toLowerCase() ===
                    'q'
                ) {
                    event.preventDefault();

                    quickCapture();
                }
            },
            {
                signal:
                    controller.signal
            }
        );
    }

    /* ============================================================
     * PRIMARY NAVIGATION
     * ============================================================ */

    function setupPrimaryNavigation() {
        $$('.primary-nav a[data-module]')
            .forEach(link => {
                link.addEventListener(
                    'click',
                    event => {
                        event.preventDefault();

                        const moduleId =
                            link.dataset.module;

                        if (!moduleId) {
                            return;
                        }

                        navigate(
                            moduleId
                        );
                    },
                    {
                        signal:
                            controller.signal
                    }
                );
            });
    }

    function navigate(moduleId) {
        /*
         * This is the actual global exposed by your current app.js.
         */

        const app =
            window.Year3App;

        if (!app) {
            toast(
                'Study OS navigation unavailable'
            );
            return;
        }

        try {
            if (
                typeof app.openModule ===
                'function'
            ) {
                app.openModule(
                    moduleId
                );

                return;
            }

            if (
                typeof app.navigate ===
                'function'
            ) {
                app.navigate(
                    moduleId
                );

                return;
            }

            if (
                typeof app.navigateToModule ===
                'function'
            ) {
                app.navigateToModule(
                    moduleId
                );

                return;
            }

            if (
                typeof app.loadModule ===
                'function'
            ) {
                app.loadModule(
                    moduleId
                );

                return;
            }

        } catch (error) {
            console.error(
                '[Notes] Navigation error:',
                error
            );
        }

        toast(
            `${moduleId} selected`
        );
    }

    /* ============================================================
     * INITIALIZE
     * ============================================================ */

    function init() {
        if (
            initialized
        ) {
            /*
             * Already initialized — calling init() again
             * without an intervening destroy() must be a
             * safe no-op, not a re-bind of every listener.
             */
            return;
        }

        const moduleRoot =
            getRoot();

        if (!moduleRoot) {
            console.warn(
                '[Y3-001-Notes] Root not found'
            );

            return;
        }

        initialized =
            true;

        /*
         * CRITICAL: `destroyed` is a transient flag that is
         * only meaningful *between* a destroy() call and the
         * next init() call (it exists purely so in-flight
         * async work and stray callbacks know to stop touching
         * the DOM/state). It must be cleared here on every
         * fresh init(), otherwise the module becomes
         * permanently inert after its first destroy() — every
         * destroyed-guarded function (selectNote, createNote,
         * scheduleSave, etc.) would silently no-op forever even
         * though init() ran again and logged success.
         */
        destroyed =
            false;

        controller =
            new AbortController();

        state =
    loadState();

seedExistingNotes();

renderStoredNotes();

/*
 * The parent app re-injects the Notes HTML fresh on every
 * navigation, which means any *pre-existing* note-card
 * elements (the static template cards) start out showing
 * their original hardcoded preview text/star/footer — even
 * if the persisted note underneath has since been edited,
 * favorited, or re-saved in a previous Notes session.
 * renderStoredNotes() only creates cards that are missing;
 * it does not resync cards that already exist. Do that here
 * so the grid always reflects the current persisted state.
 */
Object.keys(state.notes || {}).forEach(title => {
    if (getCard(title)) {
        updateCard(title);
    }
});

bindAllCards();

        setupMainButtons();
        setupImport();
        setupFilters();
        setupFormatting();
        setupEditor();
        setupRecent();
        setupViews();
        setupRelated();
        setupSidebarFilters();
        setupSorting();
        setupSearch();
        setupAI();
        setupKeyboard();
        setupPrimaryNavigation();

        /*
         * Add-tag is dynamically generated,
         * so delegate it through the root.
         */

        moduleRoot.addEventListener(
            'click',
            event => {
                if (
                    event.target.closest(
                        '#addTag'
                    )
                ) {
                    event.preventDefault();
                    event.stopPropagation();

                    addTag();
                }
            },
            {
                signal:
                    controller.signal
            }
        );

        filterNotes();

        const existingTitle =
            $('#editorTitle')
                ?.textContent
                ?.trim();

        if (
            existingTitle &&
            getCard(existingTitle)
        ) {
            selectNote(
                existingTitle,
                false
            );
        } else {
            const first =
                $('.note-card');

            if (first) {
                selectNote(
                    first.dataset.title,
                    false
                );
            }
        }

        console.info(
            '[Y3-001-Notes] initialized'
        );
    }

    /* ============================================================
     * DESTROY
     * ============================================================ */

    function destroy() {
        if (!initialized) {
            return;
        }

        destroyed =
            true;

        clearTimeout(
            saveTimer
        );

        saveTimer =
            null;

        clearTimeout(
            window.__Y3NotesToastTimer
        );

        try {
            saveCurrentNote(
                false
            );
        } catch {}

        closeMenu();

        const moduleRoot =
            getRoot();

        /*
         * If the "New Note" dialog was left open when the
         * user navigated away, remove it explicitly. Its
         * internal keydown listener is now also tied to
         * `controller.signal` (see createNote()), but this
         * guarantees the dialog DOM itself never lingers
         * even if the module root is retained by the parent
         * for any reason.
         */
        moduleRoot
            ?.querySelector('.notes-create-dialog')
            ?.remove();

        if (
            moduleRoot?.classList.contains(
                'notes-editor-fullscreen'
            )
        ) {
            moduleRoot.classList.remove(
                'notes-editor-fullscreen'
            );
        }

        document.body.classList.remove(
            'notes-editor-active-fullscreen'
        );

        if (controller) {
            try {
                controller.abort();
            } catch {}
        }

        controller =
            null;

        initialized =
            false;

        /*
         * IMPORTANT: do NOT delete window.Y3_001_Notes here.
         * init/destroy/selectNote/etc. are stable function
         * references defined once in this closure and are
         * already fully guarded by the initialized/destroyed
         * flags above, so the public API object itself can —
         * and must — stay valid across repeated
         * init() -> destroy() -> init() cycles. Deleting it
         * would break any parent code that calls
         * window.Y3_001_Notes.init() to bring Notes back.
         */

        console.info(
            '[Y3-001-Notes] destroyed'
        );
    }

    /* ============================================================
     * PUBLIC API
     * ============================================================ */

    window.Y3_001_Notes = {
        init,
        destroy,

        refresh:
            filterNotes,

        selectNote,

        createNote,

        quickCapture,

        save:
            () =>
                saveCurrentNote(
                    true
                ),

        exportCurrent
    };

    /* ============================================================
     * BOOT
     * ============================================================ */

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