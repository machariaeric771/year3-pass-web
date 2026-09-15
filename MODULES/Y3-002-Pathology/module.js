'use strict';

/* ============================================================
   YEAR 3 STUDY OS
   PATHOLOGY MODULE
   MODULE.JS
   ============================================================ */

const PathologyModule = (() => {

    /* ========================================================
       STORAGE
       ======================================================== */

    const STORAGE_KEY =
        'year3-study-os-pathology';

    const defaultState = {
        bookmarks: [],
        completedTopics: [],
        recentTopics: [],
        notes: [],
        progress: {},
        currentTopic: null
    };


    let state = loadState();


    function loadState() {

        try {

            const saved =
                localStorage.getItem(
                    STORAGE_KEY
                );

            if (!saved) {
                return {
                    ...defaultState
                };
            }

            const parsed =
                JSON.parse(saved);

            return {
                ...defaultState,
                ...parsed
            };

        } catch (error) {

            console.warn(
                '[PATHOLOGY] Could not load saved state:',
                error
            );

            return {
                ...defaultState
            };
        }
    }


    function saveState() {

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(state)
            );

        } catch (error) {

            console.warn(
                '[PATHOLOGY] Could not save state:',
                error
            );
        }
    }


    /* ========================================================
       PATHOLOGY SYSTEMS
       ======================================================== */

    const systems = [

        {
            id: 'general',
            name: 'General Pathology',
            icon: '🧬',
            description:
                'Core mechanisms of disease and tissue injury.',
            topics: [
                'Cellular Injury',
                'Inflammation',
                'Healing and Repair',
                'Hemodynamic Disorders',
                'Immunopathology',
                'Neoplasia'
            ]
        },

        {
            id: 'cardiovascular',
            name: 'Cardiovascular',
            icon: '❤️',
            description:
                'Diseases of the heart and blood vessels.',
            topics: [
                'Atherosclerosis',
                'Hypertension',
                'Ischaemic Heart Disease',
                'Myocardial Infarction',
                'Heart Failure',
                'Rheumatic Heart Disease',
                'Endocarditis'
            ]
        },

        {
            id: 'respiratory',
            name: 'Respiratory',
            icon: '🫁',
            description:
                'Diseases affecting the lungs and airways.',
            topics: [
                'Pneumonia',
                'Tuberculosis',
                'Asthma',
                'COPD',
                'Lung Cancer',
                'Pulmonary Embolism',
                'ARDS'
            ]
        },

        {
            id: 'gastrointestinal',
            name: 'Gastrointestinal',
            icon: '🩺',
            description:
                'Pathology of the gastrointestinal tract.',
            topics: [
                'Peptic Ulcer Disease',
                'Gastritis',
                'Inflammatory Bowel Disease',
                'Appendicitis',
                'Colorectal Cancer',
                'Intestinal Obstruction'
            ]
        },

        {
            id: 'hepatobiliary',
            name: 'Hepatobiliary',
            icon: '🫀',
            description:
                'Liver, gallbladder and biliary tract pathology.',
            topics: [
                'Hepatitis',
                'Cirrhosis',
                'Portal Hypertension',
                'Hepatocellular Carcinoma',
                'Cholecystitis',
                'Cholestasis'
            ]
        },

        {
            id: 'renal',
            name: 'Renal',
            icon: '🫘',
            description:
                'Diseases of the kidneys and urinary system.',
            topics: [
                'Glomerulonephritis',
                'Nephrotic Syndrome',
                'Nephritic Syndrome',
                'Acute Kidney Injury',
                'Chronic Kidney Disease',
                'Renal Cell Carcinoma'
            ]
        },

        {
            id: 'endocrine',
            name: 'Endocrine',
            icon: '⚗️',
            description:
                'Pathology of endocrine glands.',
            topics: [
                'Thyroiditis',
                'Graves Disease',
                'Thyroid Cancer',
                'Diabetes Mellitus',
                'Adrenal Disorders',
                'Pituitary Tumours'
            ]
        },

        {
            id: 'reproductive',
            name: 'Reproductive',
            icon: '⚕️',
            description:
                'Male and female reproductive pathology.',
            topics: [
                'Cervical Cancer',
                'Endometrial Pathology',
                'Ovarian Tumours',
                'Breast Pathology',
                'Prostate Cancer',
                'Testicular Tumours'
            ]
        },

        {
            id: 'cns',
            name: 'Central Nervous System',
            icon: '🧠',
            description:
                'Pathology of the brain, spinal cord and meninges.',
            topics: [
                'Meningitis',
                'Encephalitis',
                'Cerebrovascular Disease',
                'Brain Tumours',
                'Multiple Sclerosis',
                'Alzheimer Disease'
            ]
        },

        {
            id: 'musculoskeletal',
            name: 'Musculoskeletal',
            icon: '🦴',
            description:
                'Bone, joint and soft tissue pathology.',
            topics: [
                'Osteomyelitis',
                'Osteoporosis',
                'Osteoarthritis',
                'Rheumatoid Arthritis',
                'Bone Tumours',
                'Soft Tissue Tumours'
            ]
        },

        {
            id: 'skin',
            name: 'Skin',
            icon: '🔬',
            description:
                'Common inflammatory, infectious and neoplastic skin disease.',
            topics: [
                'Psoriasis',
                'Eczema',
                'Melanoma',
                'Basal Cell Carcinoma',
                'Squamous Cell Carcinoma',
                'Skin Infections'
            ]
        },

        {
            id: 'hematolymphoid',
            name: 'Hematolymphoid',
            icon: '🩸',
            description:
                'Diseases of blood, bone marrow and lymphoid tissues.',
            topics: [
                'Iron Deficiency Anaemia',
                'Megaloblastic Anaemia',
                'Leukaemias',
                'Lymphomas',
                'Multiple Myeloma',
                'Haemolytic Anaemia'
            ]
        }

    ];


    /* ========================================================
       HIGH-YIELD TOPICS
       ======================================================== */

    const highYieldTopics = [

        {
            id: 'cellular-injury',
            name: 'Cellular Injury',
            system: 'General Pathology'
        },

        {
            id: 'inflammation',
            name: 'Acute and Chronic Inflammation',
            system: 'General Pathology'
        },

        {
            id: 'hemodynamic-disorders',
            name: 'Haemodynamic Disorders',
            system: 'General Pathology'
        },

        {
            id: 'neoplasia',
            name: 'Neoplasia',
            system: 'General Pathology'
        },

        {
            id: 'atherosclerosis',
            name: 'Atherosclerosis',
            system: 'Cardiovascular'
        },

        {
            id: 'myocardial-infarction',
            name: 'Myocardial Infarction',
            system: 'Cardiovascular'
        },

        {
            id: 'pneumonia',
            name: 'Pneumonia',
            system: 'Respiratory'
        },

        {
            id: 'tuberculosis',
            name: 'Tuberculosis',
            system: 'Respiratory'
        },

        {
            id: 'peptic-ulcer',
            name: 'Peptic Ulcer Disease',
            system: 'Gastrointestinal'
        },

        {
            id: 'cirrhosis',
            name: 'Cirrhosis',
            system: 'Hepatobiliary'
        },

        {
            id: 'glomerulonephritis',
            name: 'Glomerulonephritis',
            system: 'Renal'
        },

        {
            id: 'diabetes',
            name: 'Diabetes Mellitus',
            system: 'Endocrine'
        },

        {
            id: 'breast-pathology',
            name: 'Breast Pathology',
            system: 'Reproductive'
        },

        {
            id: 'cerebrovascular',
            name: 'Cerebrovascular Disease',
            system: 'Central Nervous System'
        },

        {
            id: 'leukaemia',
            name: 'Leukaemias',
            system: 'Hematolymphoid'
        },

        {
            id: 'lymphoma',
            name: 'Lymphomas',
            system: 'Hematolymphoid'
        }

    ];


    /* ========================================================
       DOM HELPERS
       ======================================================== */

    function get(id) {
        return document.getElementById(id);
    }


    function createElement(
        tag,
        className,
        text
    ) {

        const element =
            document.createElement(tag);

        if (className) {
            element.className =
                className;
        }

        if (
            text !== undefined &&
            text !== null
        ) {
            element.textContent =
                text;
        }

        return element;
    }


    /* ========================================================
       SYSTEM RENDERING
       ======================================================== */

    function renderSystems(
        searchTerm = ''
    ) {

        const container =
            get('pathology-systems');

        const empty =
            get('pathology-search-empty');

        if (!container) {
            return;
        }

        container.innerHTML = '';

        const query =
            searchTerm
                .trim()
                .toLowerCase();


        const filtered =
            systems.filter(system => {

                if (!query) {
                    return true;
                }

                const systemText =
                    [
                        system.name,
                        system.description,
                        ...system.topics
                    ]
                        .join(' ')
                        .toLowerCase();

                return systemText.includes(
                    query
                );
            });


        filtered.forEach(
            system => {

                const card =
                    document.createElement(
                        'button'
                    );

                card.type =
                    'button';

                card.className =
                    'pathology-system-card';

                card.dataset.system =
                    system.id;


                const icon =
                    createElement(
                        'div',
                        'pathology-system-icon',
                        system.icon
                    );


                const name =
                    createElement(
                        'div',
                        'pathology-system-name',
                        system.name
                    );


                const description =
                    createElement(
                        'div',
                        'pathology-system-description',
                        system.description
                    );


                const count =
                    createElement(
                        'div',
                        'pathology-system-count',
                        `${system.topics.length} topics`
                    );


                card.appendChild(icon);

                card.appendChild(name);

                card.appendChild(
                    description
                );

                card.appendChild(count);


                card.addEventListener(
                    'click',
                    () => {

                        openSystem(
                            system.id
                        );

                    }
                );


                container.appendChild(
                    card
                );

            }
        );


        if (empty) {

            empty.classList.toggle(
                'visible',
                filtered.length === 0
            );

        }

    }


    /* ========================================================
       HIGH-YIELD RENDERING
       ======================================================== */

    function renderHighYield() {

        const container =
            get(
                'pathology-high-yield-list'
            );

        if (!container) {
            return;
        }

        container.innerHTML = '';


        highYieldTopics.forEach(
            topic => {

                const item =
                    document.createElement(
                        'div'
                    );

                item.className =
                    'pathology-topic';

                item.dataset.topic =
                    topic.id;


                const main =
                    createElement(
                        'div',
                        'pathology-topic-main'
                    );


                const name =
                    createElement(
                        'div',
                        'pathology-topic-name',
                        topic.name
                    );


                const system =
                    createElement(
                        'div',
                        'pathology-topic-system',
                        topic.system
                    );


                main.appendChild(name);

                main.appendChild(system);


                const status =
                    createElement(
                        'div',
                        'pathology-topic-status'
                    );


                const isComplete =
                    state.completedTopics
                        .includes(
                            topic.id
                        );


                status.textContent =
                    isComplete
                        ? '✓ Studied'
                        : 'Review';


                item.appendChild(main);

                item.appendChild(status);


                item.addEventListener(
                    'click',
                    () => {

                        openTopic(
                            topic.id,
                            topic.name,
                            topic.system
                        );

                    }
                );


                container.appendChild(
                    item
                );

            }
        );

    }


    /* ========================================================
       PROGRESS
       ======================================================== */

    function calculateSystemProgress(
        system
    ) {

        if (!system.topics.length) {
            return 0;
        }

        const completed =
            system.topics.filter(
                topic =>
                    state.completedTopics
                        .includes(
                            topic.toLowerCase()
                                .replace(
                                    /[^a-z0-9]+/g,
                                    '-'
                                )
                        )
            ).length;

        return Math.round(
            (
                completed /
                system.topics.length
            ) * 100
        );

    }


    function renderProgress() {

        const container =
            get(
                'pathology-progress-list'
            );

        if (!container) {
            return;
        }

        container.innerHTML = '';


        systems.slice(
            0,
            6
        ).forEach(
            system => {

                const progress =
                    calculateSystemProgress(
                        system
                    );


                const item =
                    createElement(
                        'div',
                        'pathology-progress-item'
                    );


                const top =
                    createElement(
                        'div',
                        'pathology-progress-top'
                    );


                const name =
                    createElement(
                        'div',
                        'pathology-progress-name',
                        system.name
                    );


                const value =
                    createElement(
                        'div',
                        'pathology-progress-value',
                        `${progress}%`
                    );


                top.appendChild(name);

                top.appendChild(value);


                const track =
                    createElement(
                        'div',
                        'pathology-progress-track'
                    );


                const fill =
                    createElement(
                        'div',
                        'pathology-progress-fill'
                    );


                fill.style.width =
                    `${progress}%`;


                track.appendChild(
                    fill
                );


                item.appendChild(top);

                item.appendChild(track);


                container.appendChild(
                    item
                );

            }
        );


        const totalTopics =
            systems.reduce(
                (
                    total,
                    system
                ) =>
                    total +
                    system.topics.length,
                0
            );


        const completedCount =
            state.completedTopics.length;


        const overall =
            totalTopics
                ? Math.round(
                    (
                        completedCount /
                        totalTopics
                    ) * 100
                )
                : 0;


        const progressValue =
            get(
                'pathology-progress-value'
            );


        if (progressValue) {

            progressValue.textContent =
                `${overall}%`;

        }


        const topicCount =
            get(
                'pathology-topic-count'
            );


        if (topicCount) {

            topicCount.textContent =
                totalTopics;

        }


        const noteCount =
            get(
                'pathology-note-count'
            );


        if (noteCount) {

            noteCount.textContent =
                state.notes.length;

        }

    }


    /* ========================================================
       RECENT TOPICS
       ======================================================== */

    function renderRecent() {

        const container =
            get(
                'pathology-recent'
            );

        if (!container) {
            return;
        }

        container.innerHTML = '';


        if (
            !state.recentTopics.length
        ) {

            const empty =
                createElement(
                    'div',
                    'pathology-recent-card'
                );


            const type =
                createElement(
                    'div',
                    'pathology-recent-type',
                    'Getting Started'
                );


            const title =
                createElement(
                    'div',
                    'pathology-recent-title',
                    'Start with General Pathology'
                );


            const meta =
                createElement(
                    'div',
                    'pathology-recent-meta',
                    'Build your foundation first'
                );


            empty.appendChild(type);

            empty.appendChild(title);

            empty.appendChild(meta);


            empty.addEventListener(
                'click',
                () => {

                    openSystem(
                        'general'
                    );

                }
            );


            container.appendChild(
                empty
            );

            return;
        }


        state.recentTopics
            .slice(0, 3)
            .forEach(
                topic => {

                    const card =
                        createElement(
                            'div',
                            'pathology-recent-card'
                        );


                    const type =
                        createElement(
                            'div',
                            'pathology-recent-type',
                            'Recent Topic'
                        );


                    const title =
                        createElement(
                            'div',
                            'pathology-recent-title',
                            topic.name
                        );


                    const meta =
                        createElement(
                            'div',
                            'pathology-recent-meta',
                            topic.system
                        );


                    card.appendChild(type);

                    card.appendChild(title);

                    card.appendChild(meta);


                    card.addEventListener(
                        'click',
                        () => {

                            openTopic(
                                topic.id,
                                topic.name,
                                topic.system
                            );

                        }
                    );


                    container.appendChild(
                        card
                    );

                }
            );

    }


    /* ========================================================
       OPEN SYSTEM
       ======================================================== */

    function openSystem(
        systemId
    ) {

        const system =
            systems.find(
                item =>
                    item.id ===
                    systemId
            );

        if (!system) {
            return;
        }


        const dashboard =
            get(
                'pathology-dashboard-view'
            );

        const workspace =
            get(
                'pathology-workspace'
            );

        if (
            !dashboard ||
            !workspace
        ) {
            return;
        }


        dashboard.classList.add(
            'hidden'
        );

        workspace.classList.add(
            'active'
        );


        const title =
            get(
                'pathology-workspace-title'
            );


        if (title) {

            title.textContent =
                system.name;

        }


        renderSystemWorkspace(
            system
        );


        window.scrollTo(
            {
                top: 0,
                behavior: 'smooth'
            }
        );

    }


    /* ========================================================
       OPEN TOPIC
       ======================================================== */

    function openTopic(
        topicId,
        topicName,
        systemName
    ) {

        state.currentTopic = {
            id: topicId,
            name: topicName,
            system: systemName
        };


        state.recentTopics =
            [
                state.currentTopic,
                ...state.recentTopics.filter(
                    topic =>
                        topic.id !==
                        topicId
                )
            ].slice(
                0,
                10
            );


        saveState();


        const dashboard =
            get(
                'pathology-dashboard-view'
            );

        const workspace =
            get(
                'pathology-workspace'
            );


        if (
            !dashboard ||
            !workspace
        ) {
            return;
        }


        dashboard.classList.add(
            'hidden'
        );

        workspace.classList.add(
            'active'
        );


        const title =
            get(
                'pathology-workspace-title'
            );


        if (title) {

            title.textContent =
                topicName;

        }


        renderTopicWorkspace(
            topicId,
            topicName,
            systemName
        );


        renderRecent();


        window.scrollTo(
            {
                top: 0,
                behavior: 'smooth'
            }
        );

    }


    /* ========================================================
       SYSTEM WORKSPACE
       ======================================================== */

    function renderSystemWorkspace(
        system
    ) {

        const content =
            get(
                'pathology-workspace-content'
            );

        if (!content) {
            return;
        }


        content.innerHTML = '';


        const heading =
            createElement(
                'div',
                'pathology-panel-heading'
            );


        const headingTitle =
            createElement(
                'h3',
                null,
                system.name
            );


        const headingLabel =
            createElement(
                'span',
                null,
                `${system.topics.length} TOPICS`
            );


        heading.appendChild(
            headingTitle
        );

        heading.appendChild(
            headingLabel
        );


        content.appendChild(
            heading
        );


        const list =
            createElement(
                'div',
                'pathology-topic-list'
            );


        system.topics.forEach(
            topic => {

                const topicId =
                    topic
                        .toLowerCase()
                        .replace(
                            /[^a-z0-9]+/g,
                            '-'
                        )
                        .replace(
                            /^-|-$/g,
                            ''
                        );


                const item =
                    createElement(
                        'div',
                        'pathology-topic'
                    );


                const main =
                    createElement(
                        'div',
                        'pathology-topic-main'
                    );


                const name =
                    createElement(
                        'div',
                        'pathology-topic-name',
                        topic
                    );


                const systemLabel =
                    createElement(
                        'div',
                        'pathology-topic-system',
                        system.name
                    );


                main.appendChild(name);

                main.appendChild(
                    systemLabel
                );


                const status =
                    createElement(
                        'div',
                        'pathology-topic-status',
                        state.completedTopics
                            .includes(
                                topicId
                            )
                            ? '✓ Studied'
                            : 'Open'
                    );


                item.appendChild(main);

                item.appendChild(status);


                item.addEventListener(
                    'click',
                    () => {

                        openTopic(
                            topicId,
                            topic,
                            system.name
                        );

                    }
                );


                list.appendChild(
                    item
                );

            }
        );


        content.appendChild(
            list
        );

    }


    /* ========================================================
       TOPIC WORKSPACE
       ======================================================== */

    function renderTopicWorkspace(
        topicId,
        topicName,
        systemName
    ) {

        const content =
            get(
                'pathology-workspace-content'
            );

        if (!content) {
            return;
        }


        content.innerHTML = '';


        const header =
            createElement(
                'div',
                'pathology-panel-heading'
            );


        const title =
            createElement(
                'h3',
                null,
                topicName
            );


        const label =
            createElement(
                'span',
                null,
                systemName
            );


        header.appendChild(title);

        header.appendChild(label);


        content.appendChild(
            header
        );


        const intro =
            createElement(
                'div',
                'pathology-content-placeholder'
            );


        intro.style.minHeight =
            '520px';


        const icon =
            createElement(
                'div',
                'pathology-content-placeholder-icon',
                '🧬'
            );


        const heading =
            createElement(
                'h3',
                null,
                topicName
            );


        const description =
            createElement(
                'p',
                null,
                'The full pathology study workspace will contain definition, etiology, pathogenesis, morphology, clinical features, investigations, complications, management, images, MCQs and flashcards.'
            );


        const openButton =
            document.createElement(
                'button'
            );


        openButton.type =
            'button';

        openButton.className =
            'pathology-button primary';

        openButton.textContent =
            'Mark as Studied';


        if (
            state.completedTopics
                .includes(
                    topicId
                )
        ) {

            openButton.textContent =
                '✓ Studied';

        }


        openButton.addEventListener(
            'click',
            () => {

                toggleCompleted(
                    topicId
                );

                openButton.textContent =
                    state.completedTopics
                        .includes(
                            topicId
                        )
                        ? '✓ Studied'
                        : 'Mark as Studied';

                renderProgress();

                renderHighYield();

            }
        );


        intro.appendChild(icon);

        intro.appendChild(heading);

        intro.appendChild(description);

        intro.appendChild(
            document.createElement(
                'br'
            )
        );

        intro.appendChild(
            openButton
        );


        content.appendChild(
            intro
        );

    }


    /* ========================================================
       COMPLETE / UNCOMPLETE TOPIC
       ======================================================== */

    function toggleCompleted(
        topicId
    ) {

        const index =
            state.completedTopics
                .indexOf(
                    topicId
                );


        if (index === -1) {

            state.completedTopics.push(
                topicId
            );

        } else {

            state.completedTopics.splice(
                index,
                1
            );

        }


        saveState();

    }


    /* ========================================================
       BOOKMARK
       ======================================================== */

    function updateBookmarkButton() {

        const button =
            get(
                'pathology-bookmark-button'
            );

        if (!button) {
            return;
        }


        const current =
            state.currentTopic;


        if (!current) {

            button.textContent =
                '☆ Bookmark';

            return;
        }


        const bookmarked =
            state.bookmarks
                .includes(
                    current.id
                );


        button.textContent =
            bookmarked
                ? '★ Bookmarked'
                : '☆ Bookmark';

    }


    function toggleBookmark() {

        const current =
            state.currentTopic;


        if (!current) {
            return;
        }


        const index =
            state.bookmarks
                .indexOf(
                    current.id
                );


        if (index === -1) {

            state.bookmarks.push(
                current.id
            );

        } else {

            state.bookmarks.splice(
                index,
                1
            );

        }


        saveState();

        updateBookmarkButton();

    }


    /* ========================================================
       SEARCH
       ======================================================== */

    function setupSearch() {

        const input =
            get(
                'pathology-search'
            );

        if (!input) {
            return;
        }


        input.addEventListener(
            'input',
            () => {

                renderSystems(
                    input.value
                );

            }
        );

    }


    /* ========================================================
       STUDY MODE BUTTONS
       ======================================================== */

    function setupStudyModes() {

        document
            .querySelectorAll(
                '[data-pathology-mode]'
            )
            .forEach(
                button => {

                    button.addEventListener(
                        'click',
                        () => {

                            const mode =
                                button.dataset
                                    .pathologyMode;


                            if (
                                mode ===
                                'topics'
                            ) {

                                openSystem(
                                    'general'
                                );

                                return;
                            }


                            if (
                                mode ===
                                'high-yield'
                            ) {

                                const first =
                                    highYieldTopics[0];

                                openTopic(
                                    first.id,
                                    first.name,
                                    first.system
                                );

                                return;
                            }


                            if (
                                mode ===
                                'mcq'
                            ) {

                                showComingSoon(
                                    'Pathology MCQs'
                                );

                                return;
                            }


                            if (
                                mode ===
                                'revision'
                            ) {

                                showComingSoon(
                                    'Revision Mode'
                                );

                            }

                        }
                    );

                }
            );

    }


    /* ========================================================
       WORKSPACE NAVIGATION
       ======================================================== */

    function setupWorkspaceNavigation() {

        const nav =
            get(
                'pathology-workspace-nav'
            );

        if (!nav) {
            return;
        }


        nav
            .querySelectorAll(
                'button'
            )
            .forEach(
                button => {

                    button.addEventListener(
                        'click',
                        () => {

                            nav
                                .querySelectorAll(
                                    'button'
                                )
                                .forEach(
                                    item =>
                                        item.classList
                                            .remove(
                                                'active'
                                            )
                                );


                            button.classList.add(
                                'active'
                            );


                            const section =
                                button.dataset
                                    .pathologySection;


                            if (
                                section ===
                                'overview'
                            ) {

                                return;
                            }


                            showComingSoon(
                                section
                            );

                        }
                    );

                }
            );

    }


    /* ========================================================
       BACK BUTTON
       ======================================================== */

    function setupBackButton() {

        const button =
            get(
                'pathology-back-button'
            );

        if (!button) {
            return;
        }


        button.addEventListener(
            'click',
            () => {

                const dashboard =
                    get(
                        'pathology-dashboard-view'
                    );

                const workspace =
                    get(
                        'pathology-workspace'
                    );


                if (dashboard) {

                    dashboard.classList.remove(
                        'hidden'
                    );

                }


                if (workspace) {

                    workspace.classList.remove(
                        'active'
                    );

                }


                state.currentTopic =
                    null;

                saveState();


                window.scrollTo(
                    {
                        top: 0,
                        behavior: 'smooth'
                    }
                );

            }
        );

    }


    /* ========================================================
       AI BUTTON
       ======================================================== */

    function setupAIButton() {

        const button =
            get(
                'pathology-ai-button'
            );

        if (!button) {
            return;
        }


        button.addEventListener(
            'click',
            () => {

                const current =
                    state.currentTopic;


                if (!current) {

                    showComingSoon(
                        'Pathology AI'
                    );

                    return;
                }


                try {

                    if (
                        window.parent &&
                        window.parent !==
                            window &&
                        typeof window.parent
                            .openAIForTopic ===
                            'function'
                    ) {

                        window.parent
                            .openAIForTopic(
                                current.name
                            );

                        return;

                    }

                } catch (error) {

                    console.warn(
                        '[PATHOLOGY] AI integration unavailable:',
                        error
                    );

                }


                showComingSoon(
                    `AI for ${current.name}`
                );

            }
        );

    }


    /* ========================================================
       COMING SOON
       ======================================================== */

    function showComingSoon(
        feature
    ) {

        const content =
            get(
                'pathology-workspace-content'
            );

        if (!content) {
            return;
        }


        content.innerHTML = '';


        const placeholder =
            createElement(
                'div',
                'pathology-content-placeholder'
            );


        const icon =
            createElement(
                'div',
                'pathology-content-placeholder-icon',
                '🚧'
            );


        const heading =
            createElement(
                'h3',
                null,
                feature
            );


        const description =
            createElement(
                'p',
                null,
                'This part of the Pathology module is planned for the next build stage.'
            );


        placeholder.appendChild(icon);

        placeholder.appendChild(heading);

        placeholder.appendChild(
            description
        );


        content.appendChild(
            placeholder
        );

    }


    /* ========================================================
       STATS
       ======================================================== */

    function updateQuestionCount() {

        const element =
            get(
                'pathology-question-count'
            );

        if (!element) {
            return;
        }


        /*
         * No question bank has been connected yet.
         * Keep the value honest instead of displaying
         * fabricated question numbers.
         */

        element.textContent =
            '0';

    }


    /* ========================================================
       BOOKMARK EVENTS
       ======================================================== */

    function setupBookmark() {

        const button =
            get(
                'pathology-bookmark-button'
            );

        if (!button) {
            return;
        }


        button.addEventListener(
            'click',
            toggleBookmark
        );

    }


    /* ========================================================
       INITIAL RENDER
       ======================================================== */

    function render() {

        renderSystems();

        renderHighYield();

        renderProgress();

        renderRecent();

        updateQuestionCount();

        updateBookmarkButton();

    }


    /* ========================================================
       INITIALIZE
       ======================================================== */

    function init() {

        const root =
            get(
                'pathology-module'
            );

        if (!root) {

            console.warn(
                '[PATHOLOGY] Root element not found.'
            );

            return;
        }


        if (
            root.dataset
                .pathologyInitialized ===
            'true'
        ) {

            return;

        }


        root.dataset
            .pathologyInitialized =
            'true';


        setupSearch();

        setupStudyModes();

        setupWorkspaceNavigation();

        setupBackButton();

        setupAIButton();

        setupBookmark();

        render();


        console.log(
            '[PATHOLOGY] Module initialized'
        );

    }


    /* ========================================================
       PUBLIC API
       ======================================================== */

    return {

        init,

        render,

        openSystem,

        openTopic,

        toggleBookmark,

        getState() {

            return {
                ...state
            };

        },

        getSystems() {

            return [
                ...systems
            ];

        },

        getHighYieldTopics() {

            return [
                ...highYieldTopics
            ];

        }

    };

})();


/* ============================================================
   START MODULE
   ============================================================ */

if (
    document.readyState ===
    'loading'
) {

    document.addEventListener(
        'DOMContentLoaded',
        () => {
            PathologyModule.init();
        },
        {
            once: true
        }
    );

} else {

    PathologyModule.init();

}