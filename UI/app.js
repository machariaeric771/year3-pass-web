(() => {
    'use strict';

    /* =========================================================
     * YEAR 3 STUDY OS — MAIN APPLICATION
     * ========================================================= */

    const App = {

        /* =========================================================
         * APPLICATION STATE
         * ========================================================= */

        currentModule: 'dashboard',

        currentContext: {
            moduleId: 'dashboard',
            moduleName: 'Dashboard',
            subject: null,
            topic: null
        },

        sidebarCollapsed: false,

        /*
         * Tracks scripts currently belonging to the active
         * dynamically loaded module.
         */
        loadedModuleScripts: new Set(),

        /*
         * References to the actual injected script elements.
         */
        activeModuleScripts: [],

        /*
         * Prevents overlapping navigation operations from
         * replacing a newer module with an older request.
         */
        navigationSequence: 0,

        /*
         * Prevents App.init() from accidentally executing twice.
         */
        initialized: false,

        /*
         * Prevents duplicate global event binding.
         */
        globalEventsBound: false,

        /*
         * Prevents the dynamically generated module sidebar
         * entries from being inserted more than once.
         */
        sidebarModulesInjected: false,


        /* =========================================================
         * INITIALIZATION
         * ========================================================= */

        async init() {

            if (this.initialized) {
                console.warn(
                    '[YEAR3 STUDY OS] App.init() called more than once. Ignoring.'
                );
                return;
            }

            this.initialized = true;

            console.log(
                '[YEAR3 STUDY OS] Initializing application...'
            );

            try {

                this.bindGlobalEvents();

                this.initializeTheme();

                await this.loadSidebar();

                await this.restoreState();

                /*
                 * Restore the previously opened module.
                 */
                if (this.currentModule === 'dashboard') {

                    await this.openDashboard();

                } else if (this.currentModule === 'ai-test') {

                    await this.openAITest();

                } else {

                    await this.openModule(
                        this.currentModule
                    );
                }

                console.log(
                    '[YEAR3 STUDY OS] Application initialized.'
                );

            } catch (error) {

                console.error(
                    '[YEAR3 STUDY OS] Application initialization failed:',
                    error
                );

                this.currentModule =
                    'dashboard';

                try {

                    await this.openDashboard();

                } catch (dashboardError) {

                    console.error(
                        '[YEAR3 STUDY OS] Dashboard fallback failed:',
                        dashboardError
                    );
                }
            }
        },


        /* =========================================================
         * GLOBAL EVENTS
         * ========================================================= */

        bindGlobalEvents() {

            if (this.globalEventsBound) {
                return;
            }

            this.globalEventsBound = true;

            const toggle =
                document.getElementById(
                    'sidebar-toggle'
                );

            if (toggle) {

                toggle.addEventListener(
                    'click',
                    () => this.toggleSidebar()
                );
            }

            /*
             * GLOBAL MODULE NAVIGATION
             *
             * This is important for dynamically injected modules
             * such as Y3-005-CDC.
             *
             * Any element containing:
             *
             *     data-module-id="Y3-005-CDC"
             *
             * can now navigate through App.navigate().
             */
            document.addEventListener(
                'click',
                event => {

                    const target =
                        event.target.closest(
                            '[data-module-id]'
                        );

                    if (!target) {
                        return;
                    }

                    const moduleId =
                        target.dataset.moduleId;

                    if (!moduleId) {
                        return;
                    }

                    /*
                     * Ignore elements that explicitly opt out.
                     */
                    if (
                        target.dataset.moduleNavigation ===
                        'false'
                    ) {
                        return;
                    }

                    /*
                     * Only handle actual navigation elements.
                     */
                    if (
                        !(
                            target.matches('button') ||
                            target.matches('a') ||
                            target.matches('[role="button"]') ||
                            target.matches('.sidebar-module') ||
                            target.matches('.nav-item') ||
                            target.matches('.navigation-item')
                        )
                    ) {
                        return;
                    }

                    /*
                     * Stop default anchor navigation when a
                     * module ID is present.
                     */
                    if (
                        target.tagName === 'A'
                    ) {

                        event.preventDefault();
                    }

                    /*
                     * Prevent an existing sidebar handler from
                     * causing a second navigation.
                     *
                     * The Sidebar component may still receive
                     * the click through its own listener if it
                     * is attached earlier. App navigation remains
                     * protected by navigationSequence.
                     */
                    this.navigate(
                        moduleId
                    );
                }
            );
        },


        /* =========================================================
         * STUDY CONTEXT
         * ========================================================= */

        setStudyContext(moduleId, moduleName) {

            this.currentContext = {

                moduleId:
                    moduleId || 'dashboard',

                moduleName:
                    moduleName || 'Dashboard',

                subject:
                    this.getSubjectFromModule(
                        moduleId,
                        moduleName
                    ),

                topic: null
            };

            console.log(
                '[STUDY CONTEXT]',
                this.currentContext
            );
        },


        getSubjectFromModule(moduleId, moduleName) {

            const subjects = {

                'Y3-001-Notes':
                    'Notes',

                'Y3-002-Pathology':
                    'Pathology',

                'Y3-003-Pharmacology':
                    'Pharmacology',

                'Y3-004-Microbiology':
                    'Microbiology',

                'Y3-005-CDC':
                    'CDC',

                'Y3-006-Physiology':
                    'Physiology',

                'Y3-007-Neuroanatomy':
                    'Neuroanatomy',

                'Y3-008-Obstetrics-Gynaecology':
                    'Obstetrics & Gynaecology',

                'Y3-009-MCQ':
                    'MCQ',

                'Y3-010-Flashcards':
                    'Flashcards',

                'Y3-011-Spotter':
                    'Spotter',

                'Y3-012-Essay':
                    'Essay'
            };

            return (
                subjects[moduleId] ||
                moduleName ||
                null
            );
        },


        /* =========================================================
         * SIDEBAR
         * ========================================================= */

        async loadSidebar() {

            try {

                const navigation =
                    document.getElementById(
                        'main-navigation'
                    );

                /*
                 * First allow the existing Sidebar component
                 * to render exactly as it normally does.
                 */
                if (
                    window.Sidebar &&
                    typeof window.Sidebar.render ===
                    'function'
                ) {

                    if (navigation) {

                        window.Sidebar.render(
                            navigation,
                            this
                        );
                    }

                } else {

                    console.warn(
                        '[SIDEBAR] Sidebar component is unavailable.'
                    );
                }

                /*
                 * Now discover modules from the Module Manager
                 * and make sure they exist in the sidebar.
                 *
                 * This is what makes Y3-005-CDC appear without
                 * modifying Microbiology.
                 */
                await this.injectDiscoveredModulesIntoSidebar();

            } catch (error) {

                console.error(
                    '[SIDEBAR] Failed to load sidebar:',
                    error
                );
            }
        },


        /* =========================================================
         * DYNAMIC MODULE SIDEBAR INTEGRATION
         * ========================================================= */

        async injectDiscoveredModulesIntoSidebar() {

            const navigation =
                document.getElementById(
                    'main-navigation'
                );

            if (!navigation) {

                console.warn(
                    '[SIDEBAR] #main-navigation was not found.'
                );

                return;
            }

            /*
             * Get modules from the actual Electron module
             * manager through the preload bridge.
             */
            if (
                !window.year3 ||
                !window.year3.modules ||
                typeof window.year3.modules.list !==
                'function'
            ) {

                console.warn(
                    '[SIDEBAR] window.year3.modules.list() is unavailable.'
                );

                /*
                 * Even if module discovery is unavailable,
                 * explicitly ensure CDC exists.
                 */
                this.ensureCDCSidebarEntry(
                    navigation
                );

                return;
            }

            try {

                const modules =
                    await window.year3.modules.list();

                if (
                    !Array.isArray(modules)
                ) {

                    console.warn(
                        '[SIDEBAR] Module list did not return an array.'
                    );

                    this.ensureCDCSidebarEntry(
                        navigation
                    );

                    return;
                }

                console.log(
                    '[SIDEBAR] Discovered modules:',
                    modules.map(
                        module =>
                            module &&
                            module.id
                    )
                );

                /*
                 * Make sure every discovered module has a
                 * navigation entry.
                 *
                 * Existing sidebar entries are preserved.
                 */
                for (
                    const module
                    of modules
                ) {

                    if (
                        !module ||
                        !module.id ||
                        module.enabled === false
                    ) {
                        continue;
                    }

                    this.ensureSidebarModuleEntry(
                        navigation,
                        module
                    );
                }

                /*
                 * CDC is particularly important, so perform
                 * an explicit final verification.
                 */
                const cdcModule =
                    modules.find(
                        module =>
                            module &&
                            module.id ===
                            'Y3-005-CDC'
                    );

                if (cdcModule) {

                    console.log(
                        '[SIDEBAR] Y3-005-CDC discovered successfully.'
                    );

                } else {

                    console.warn(
                        '[SIDEBAR] Y3-005-CDC was not returned by ModuleManager.'
                    );

                    /*
                     * This does not fabricate the module. It only
                     * creates a navigation entry if the folder
                     * exists through the module API.
                     */
                    this.ensureCDCSidebarEntry(
                        navigation
                    );
                }

                this.sidebarModulesInjected =
                    true;

            } catch (error) {

                console.error(
                    '[SIDEBAR] Dynamic module discovery failed:',
                    error
                );

                this.ensureCDCSidebarEntry(
                    navigation
                );
            }
        },


        /* =========================================================
         * ENSURE SIDEBAR MODULE ENTRY
         * ========================================================= */

        ensureSidebarModuleEntry(
            navigation,
            module
        ) {

            if (
                !navigation ||
                !module ||
                !module.id
            ) {
                return null;
            }

            /*
             * Check whether the sidebar already contains
             * this module.
             */
            const existing =
                navigation.querySelector(
                    `[data-module-id="${CSS.escape(module.id)}"]`
                );

            if (existing) {

                /*
                 * Keep existing Sidebar styling/behavior.
                 */
                return existing;
            }

            /*
             * Find an existing navigation item that we can clone.
             *
             * This allows the CDC item to inherit the existing
             * sidebar's visual structure instead of introducing
             * a completely different design.
             */
            const template =
                navigation.querySelector(
                    '[data-module-id]'
                );

            let item;

            if (template) {

                item =
                    template.cloneNode(
                        true
                    );

                /*
                 * Remove duplicate IDs from cloned markup.
                 */
                item
                    .querySelectorAll('[id]')
                    .forEach(
                        element => {

                            element.removeAttribute(
                                'id'
                            );
                        }
                    );

            } else {

                /*
                 * Safe fallback if the sidebar has no module
                 * navigation items at all.
                 */
                item =
                    document.createElement(
                        'button'
                    );

                item.type =
                    'button';

                item.className =
                    'sidebar-module';

            }

            /*
             * Set module identity.
             */
            item.dataset.moduleId =
                module.id;

            item.dataset.moduleNavigation =
                'true';

            /*
             * Remove active states inherited from the template.
             */
            item.classList.remove(
                'active',
                'is-active'
            );

            /*
             * Try to update common text/icon elements.
             */
            const iconElement =
                item.querySelector(
                    '.sidebar-icon, ' +
                    '.nav-icon, ' +
                    '.module-icon, ' +
                    '[data-sidebar-icon]'
                );

            if (iconElement) {

                iconElement.textContent =
                    module.icon ||
                    '📚';

            }

            const textElement =
                item.querySelector(
                    '.sidebar-label, ' +
                    '.nav-label, ' +
                    '.sidebar-module-name, ' +
                    '.module-name, ' +
                    '[data-sidebar-label]'
                );

            if (textElement) {

                textElement.textContent =
                    module.name ||
                    module.id;

            } else {

                /*
                 * If the cloned item does not have an obvious
                 * label element, find a text-bearing span.
                 */
                const spans =
                    item.querySelectorAll(
                        'span'
                    );

                if (spans.length) {

                    const lastSpan =
                        spans[
                            spans.length - 1
                        ];

                    lastSpan.textContent =
                        module.name ||
                        module.id;

                } else if (
                    !item.textContent.trim()
                ) {

                    item.textContent =
                        `${module.icon || '📚'} ${
                            module.name ||
                            module.id
                        }`;
                }
            }

            /*
             * Accessibility.
             */
            item.setAttribute(
                'aria-label',
                module.name ||
                module.id
            );

            /*
             * If it is a button, ensure it is a real button.
             */
            if (
                item.tagName ===
                'BUTTON'
            ) {

                item.type =
                    'button';
            }

            /*
             * Add tooltip information.
             */
            if (
                module.description
            ) {

                item.title =
                    module.description;
            }

            /*
             * Insert at the end of the existing navigation.
             */
            navigation.appendChild(
                item
            );

            console.log(
                `[SIDEBAR] Added module: ${module.id}`
            );

            return item;
        },


        /* =========================================================
         * EXPLICIT CDC SIDEBAR FALLBACK
         * ========================================================= */

        ensureCDCSidebarEntry(
            navigation
        ) {

            if (!navigation) {
                return null;
            }

            const existing =
                navigation.querySelector(
                    '[data-module-id="Y3-005-CDC"]'
                );

            if (existing) {
                return existing;
            }

            /*
             * We only create this entry if the CDC module can
             * actually be verified through the module service.
             */
            if (
                !window.year3 ||
                !window.year3.modules ||
                typeof window.year3.modules.has !==
                'function'
            ) {

                console.warn(
                    '[SIDEBAR] Cannot verify Y3-005-CDC because module API is unavailable.'
                );

                return null;
            }

            try {

                /*
                 * IMPORTANT:
                 * Do not add a dead CDC button.
                 */
                const exists =
                    window.year3.modules.has(
                        'Y3-005-CDC'
                    );

                /*
                 * Support both synchronous and Promise-based
                 * implementations.
                 */
                if (
                    exists &&
                    typeof exists.then ===
                    'function'
                ) {

                    exists.then(
                        result => {

                            if (result) {

                                this.ensureSidebarModuleEntry(
                                    navigation,
                                    {
                                        id:
                                            'Y3-005-CDC',

                                        name:
                                            'CDC Resource Center',

                                        icon:
                                            '🦠',

                                        description:
                                            'CDC Resource Center'
                                    }
                                );
                            }
                        }
                    ).catch(
                        error => {

                            console.warn(
                                '[SIDEBAR] CDC existence check failed:',
                                error
                            );
                        }
                    );

                    return null;
                }

                if (exists) {

                    return this.ensureSidebarModuleEntry(
                        navigation,
                        {
                            id:
                                'Y3-005-CDC',

                            name:
                                'CDC Resource Center',

                            icon:
                                '🦠',

                            description:
                                'CDC Resource Center'
                        }
                    );
                }

            } catch (error) {

                console.warn(
                    '[SIDEBAR] CDC fallback failed:',
                    error
                );
            }

            return null;
        },


        toggleSidebar() {

            this.sidebarCollapsed =
                !this.sidebarCollapsed;

            document.body.classList.toggle(
                'sidebar-collapsed',
                this.sidebarCollapsed
            );

            this.savePreferences();
        },


        async savePreferences() {

            try {

                if (
                    !window.year3 ||
                    !window.year3.settings ||
                    typeof window.year3.settings.get !==
                    'function' ||
                    typeof window.year3.settings.save !==
                    'function'
                ) {
                    return;
                }

                const settings =
                    await window.year3.settings.get();

                const safeSettings =
                    settings || {};

                safeSettings.sidebarCollapsed =
                    this.sidebarCollapsed;

                await window.year3.settings.save(
                    safeSettings
                );

            } catch (error) {

                console.error(
                    '[SETTINGS] Could not save sidebar preference:',
                    error
                );
            }
        },


        /* =========================================================
         * STATE RESTORATION
         * ========================================================= */

        async restoreState() {

            try {

                if (
                    !window.year3 ||
                    !window.year3.state ||
                    !window.year3.settings
                ) {

                    console.warn(
                        '[STATE] Year3 state/settings API unavailable.'
                    );

                    return;
                }

                if (
                    typeof window.year3.state.get ===
                    'function'
                ) {

                    const state =
                        await window.year3.state.get();

                    if (
                        state &&
                        typeof state.lastModule ===
                        'string' &&
                        state.lastModule.trim()
                    ) {

                        this.currentModule =
                            state.lastModule.trim();
                    }
                }

                if (
                    typeof window.year3.settings.get ===
                    'function'
                ) {

                    const settings =
                        await window.year3.settings.get();

                    if (
                        settings &&
                        settings.sidebarCollapsed === true
                    ) {

                        this.sidebarCollapsed =
                            true;

                        document.body.classList.add(
                            'sidebar-collapsed'
                        );
                    }
                }

            } catch (error) {

                console.error(
                    '[STATE] Could not restore application state:',
                    error
                );

                this.currentModule =
                    'dashboard';

                this.setStudyContext(
                    'dashboard',
                    'Dashboard'
                );
            }
        },


        /* =========================================================
         * NAVIGATION
         * ========================================================= */

        async navigate(moduleId) {

            if (!moduleId) {
                return;
            }

            moduleId =
                String(moduleId).trim();

            if (!moduleId) {
                return;
            }

            console.log(
                `[NAVIGATION] Requested module: ${moduleId}`
            );

            if (moduleId === 'dashboard') {

                await this.openDashboard();

                return;
            }

            if (moduleId === 'ai-test') {

                await this.openAITest();

                return;
            }

            await this.openModule(
                moduleId
            );
        },


        /* =========================================================
         * DASHBOARD
         * ========================================================= */

        async openDashboard() {

            const navigationId =
                ++this.navigationSequence;

            try {

                await this.cleanupCurrentModule();

            } catch (error) {

                console.warn(
                    '[DASHBOARD] Module cleanup warning:',
                    error
                );
            }

            if (
                navigationId !==
                this.navigationSequence
            ) {
                return;
            }

            this.currentModule =
                'dashboard';

            this.setStudyContext(
                'dashboard',
                'Dashboard'
            );

            const content =
                document.getElementById(
                    'content'
                );

            const title =
                document.getElementById(
                    'page-title'
                );

            const breadcrumb =
                document.getElementById(
                    'page-breadcrumb'
                );

            if (!content) {

                console.error(
                    '[DASHBOARD] #content was not found.'
                );

                return;
            }

            if (title) {

                title.textContent =
                    'Dashboard';
            }

            if (breadcrumb) {

                breadcrumb.textContent =
                    'Year 3 Study OS / Dashboard';
            }

            if (
                window.Dashboard &&
                typeof window.Dashboard.render ===
                'function'
            ) {

                content.innerHTML =
                    window.Dashboard.render();

                if (
                    typeof window.Dashboard.init ===
                    'function'
                ) {

                    try {

                        await window.Dashboard.init(
                            this
                        );

                    } catch (error) {

                        console.error(
                            '[DASHBOARD] Dashboard initialization failed:',
                            error
                        );
                    }
                }

            } else {

                content.innerHTML = `
                    <section class="module-placeholder">

                        <div class="module-placeholder-icon">
                            📚
                        </div>

                        <h2>
                            Year 3 Study OS
                        </h2>

                        <p>
                            Dashboard is ready.
                        </p>

                    </section>
                `;
            }

            if (
                navigationId !==
                this.navigationSequence
            ) {
                return;
            }

            this.setActiveNavigation(
                'dashboard'
            );

            await this.persistCurrentModule();
        },


        /* =========================================================
         * AI TEST
         * ========================================================= */

        async openAITest() {

            const navigationId =
                ++this.navigationSequence;

            try {

                await this.cleanupCurrentModule();

            } catch (error) {

                console.warn(
                    '[AI TEST] Module cleanup warning:',
                    error
                );
            }

            if (
                navigationId !==
                this.navigationSequence
            ) {
                return;
            }

            this.currentModule =
                'ai-test';

            this.setStudyContext(
                'ai-test',
                'AI Test'
            );

            const content =
                document.getElementById(
                    'content'
                );

            const title =
                document.getElementById(
                    'page-title'
                );

            const breadcrumb =
                document.getElementById(
                    'page-breadcrumb'
                );

            if (!content) {
                return;
            }

            if (title) {

                title.textContent =
                    'AI Test';
            }

            if (breadcrumb) {

                breadcrumb.textContent =
                    'Year 3 Study OS / AI Test';
            }

            content.innerHTML = `
                <section class="module-placeholder">

                    <h2>
                        AI Connection Test
                    </h2>

                    <p>
                        Test the Year 3 Study OS AI system.
                    </p>

                    <textarea
                        id="ai-test-input"
                        style="
                            width:100%;
                            min-height:140px;
                            margin-top:20px;
                            padding:15px;
                            border-radius:10px;
                            border:1px solid #334155;
                            background:#0f172a;
                            color:white;
                            resize:vertical;
                            box-sizing:border-box;
                        "
                        placeholder="Ask the AI something..."
                    >Explain the difference between nephritic and nephrotic syndrome.</textarea>

                    <button
                        id="ai-test-send"
                        class="primary-button"
                        type="button"
                        style="margin-top:15px;"
                    >
                        Ask AI
                    </button>

                    <div
                        id="ai-test-status"
                        style="margin-top:20px;"
                    >
                        Ready.
                    </div>

                    <div
                        id="ai-test-response"
                        style="
                            margin-top:20px;
                            padding:20px;
                            border-radius:10px;
                            background:#111827;
                            color:white;
                            white-space:pre-wrap;
                            line-height:1.6;
                            overflow:auto;
                        "
                    ></div>

                </section>
            `;

            const sendButton =
                document.getElementById(
                    'ai-test-send'
                );

            const input =
                document.getElementById(
                    'ai-test-input'
                );

            const status =
                document.getElementById(
                    'ai-test-status'
                );

            const responseBox =
                document.getElementById(
                    'ai-test-response'
                );

            if (
                !sendButton ||
                !input ||
                !status ||
                !responseBox
            ) {

                console.error(
                    '[AI TEST] AI test elements could not be created.'
                );

                return;
            }

            sendButton.addEventListener(
                'click',
                async () => {

                    const message =
                        input.value.trim();

                    if (!message) {

                        status.textContent =
                            'Please enter a question.';

                        input.focus();

                        return;
                    }

                    sendButton.disabled =
                        true;

                    status.textContent =
                        'Sending request to AI...';

                    responseBox.textContent =
                        '';

                    try {

                        if (
                            !window.year3 ||
                            !window.year3.ai ||
                            typeof window.year3.ai.ask !==
                            'function'
                        ) {

                            throw new Error(
                                'Year3 AI API is unavailable.'
                            );
                        }

                        const result =
                            await window.year3.ai.ask({

                                task:
                                    'assistant',

                                message,

                                question:
                                    message,

                                prompt:
                                    message,

                                module:
                                    'AI Test',

                                moduleId:
                                    'ai-test',

                                moduleName:
                                    'AI Test',

                                subject:
                                    null,

                                sessionId:
                                    'ai-test',

                                options: {

                                    temperature:
                                        0.2,

                                    maxTokens:
                                        2048
                                }
                            });

                        let responseText = '';

                        if (
                            result &&
                            typeof result ===
                            'string'
                        ) {

                            responseText =
                                result;

                        } else if (
                            result &&
                            typeof result.text ===
                            'string'
                        ) {

                            responseText =
                                result.text;

                        } else if (
                            result &&
                            typeof result.response ===
                            'string'
                        ) {

                            responseText =
                                result.response;

                        } else if (
                            result &&
                            typeof result.content ===
                            'string'
                        ) {

                            responseText =
                                result.content;
                        }

                        responseText =
                            responseText.trim();

                        responseBox.textContent =
                            responseText ||
                            'The AI returned an empty response.';

                        status.textContent =
                            `AI response received${
                                result &&
                                result.model
                                    ? ` — ${result.model}`
                                    : ''
                            }`;

                    } catch (error) {

                        console.error(
                            '[AI TEST] AI request failed:',
                            error
                        );

                        status.textContent =
                            'AI request failed.';

                        responseBox.textContent =
                            error &&
                            error.message
                                ? error.message
                                : String(error);

                    } finally {

                        sendButton.disabled =
                            false;
                    }
                }
            );

            this.setActiveNavigation(
                'ai-test'
            );

            await this.persistCurrentModule();
        },


        /* =========================================================
         * MODULE CLEANUP
         * ========================================================= */

        async cleanupCurrentModule() {

            /*
             * IMPORTANT:
             * CDC is now an independent module.
             *
             * Its destroy() method is called here without touching
             * the Microbiology module.
             */
            const moduleNames = [

                'MicrobiologyModule',

                'PharmacologyModule',

                'AnatomyModule',

                'PathologyModule',

                'PhysiologyModule',

                'NeuroanatomyModule',

                'NotesModule',

                'MCQModule',

                'FlashcardsModule',

                'SpotterModule',

                'EssayModule',

                'CDCModule'
            ];

            for (
                const name
                of moduleNames
            ) {

                try {

                    const candidate =
                        window[name];

                    if (
                        candidate &&
                        typeof candidate.destroy ===
                        'function'
                    ) {

                        await candidate.destroy();

                        console.log(
                            `[MODULE] Cleanup completed: ${name}`
                        );
                    }

                } catch (error) {

                    console.warn(
                        `[MODULE] Cleanup failed for ${name}:`,
                        error
                    );
                }
            }

            /*
             * Generic lifecycle object.
             */
            try {

                if (
                    window.Year3Module &&
                    typeof window.Year3Module.destroy ===
                    'function'
                ) {

                    await window.Year3Module.destroy();

                }

            } catch (error) {

                console.warn(
                    '[MODULE] Generic cleanup failed:',
                    error
                );
            }

            /*
             * Remove dynamically injected module scripts.
             */
            this.removeModuleScripts();

            /*
             * Reset tracking.
             */
            this.loadedModuleScripts.clear();
        },


        /* =========================================================
         * REMOVE MODULE SCRIPTS
         * ========================================================= */

        removeModuleScripts() {

            const scripts =
                document.querySelectorAll(
                    'script[data-year3-module-script]'
                );

            scripts.forEach(
                script => {

                    try {

                        script.onload = null;
                        script.onerror = null;

                        script.remove();

                    } catch (error) {

                        console.warn(
                            '[MODULE] Could not remove module script:',
                            error
                        );
                    }
                }
            );

            this.activeModuleScripts = [];
        },


        /* =========================================================
         * MODULE LOADING
         * ========================================================= */

        async openModule(moduleId) {

            if (!moduleId) {
                return;
            }

            const content =
                document.getElementById(
                    'content'
                );

            const title =
                document.getElementById(
                    'page-title'
                );

            const breadcrumb =
                document.getElementById(
                    'page-breadcrumb'
                );

            if (!content) {

                console.error(
                    '[MODULE] #content was not found.'
                );

                return;
            }

            /*
             * Create a unique navigation token.
             */
            const navigationId =
                ++this.navigationSequence;

            /*
             * Clean up the previous module only if we are
             * actually switching modules.
             */
            if (
                this.currentModule !==
                moduleId
            ) {

                try {

                    await this.cleanupCurrentModule();

                } catch (error) {

                    console.warn(
                        '[MODULE] Previous module cleanup warning:',
                        error
                    );
                }
            }

            if (
                navigationId !==
                this.navigationSequence
            ) {

                return;
            }

            /*
             * Show loading state.
             */
            content.innerHTML = `
                <div class="loading-state">

                    <div class="loading-spinner"></div>

                    <p>
                        Loading module...
                    </p>

                </div>
            `;

            try {

                /*
                 * Validate module API.
                 */
                if (
                    !window.year3 ||
                    !window.year3.modules ||
                    typeof window.year3.modules.get !==
                    'function'
                ) {

                    throw new Error(
                        'Year3 module service is unavailable.'
                    );
                }

                /*
                 * Retrieve module definition.
                 */
                const module =
                    await window.year3.modules.get(
                        moduleId
                    );

                if (!module) {

                    throw new Error(
                        `Module "${moduleId}" was not returned by the module service.`
                    );
                }

                /*
                 * Check navigation after asynchronous
                 * module retrieval.
                 */
                if (
                    navigationId !==
                    this.navigationSequence
                ) {

                    return;
                }

                /*
                 * Set active module.
                 */
                this.currentModule =
                    moduleId;

                this.setStudyContext(
                    moduleId,
                    module.name
                );

                if (title) {

                    title.textContent =
                        module.name ||
                        moduleId;
                }

                if (breadcrumb) {

                    breadcrumb.textContent =
                        `Year 3 Study OS / ${
                            module.name ||
                            moduleId
                        }`;
                }

                /*
                 * Inject module HTML.
                 */
                if (
                    module.content &&
                    typeof module.content.html ===
                    'string' &&
                    module.content.html.trim()
                ) {

                    content.innerHTML =
                        module.content.html;

                } else {

                    content.innerHTML =
                        this.renderModuleFallback(
                            module
                        );
                }

                /*
                 * Load module JavaScript.
                 */
                if (
                    module.content &&
                    module.content.javascript
                ) {

                    await this.executeModuleScript(
                        moduleId,
                        navigationId
                    );
                }

                /*
                 * Check again after script loading.
                 */
                if (
                    navigationId !==
                    this.navigationSequence
                ) {

                    return;
                }

                if (
                    this.currentModule !==
                    moduleId
                ) {

                    return;
                }

                this.setActiveNavigation(
                    moduleId
                );

                await this.persistCurrentModule();

            } catch (error) {

                console.error(
                    `[MODULE] Failed to load ${moduleId}:`,
                    error
                );

                if (
                    navigationId !==
                    this.navigationSequence
                ) {

                    return;
                }

                content.innerHTML = `
                    <section class="error-state">

                        <div class="error-icon">
                            !
                        </div>

                        <h2>
                            Module unavailable
                        </h2>

                        <p>
                            The module
                            <strong>
                                ${this.escapeHtml(moduleId)}
                            </strong>
                            could not be loaded.
                        </p>

                        <p class="module-error-detail">
                            ${this.escapeHtml(
                                error &&
                                error.message
                                    ? error.message
                                    : String(error)
                            )}
                        </p>

                        <button
                            type="button"
                            class="primary-button"
                            data-retry-module="${this.escapeHtml(moduleId)}"
                        >
                            Try Again
                        </button>

                    </section>
                `;

                const retryButton =
                    content.querySelector(
                        '[data-retry-module]'
                    );

                if (retryButton) {

                    retryButton.addEventListener(
                        'click',
                        () => {

                            const retryId =
                                retryButton.dataset.retryModule;

                            this.openModule(
                                retryId
                            );
                        }
                    );
                }
            }
        },


        /* =========================================================
         * MODULE FALLBACK
         * ========================================================= */

        renderModuleFallback(module) {

            const icon =
                module &&
                module.icon
                    ? module.icon
                    : '📚';

            const name =
                module &&
                (
                    module.name ||
                    module.id
                )
                    ? (
                        module.name ||
                        module.id
                    )
                    : 'Module';

            const description =
                module &&
                module.description
                    ? module.description
                    : 'This module is ready to be built.';

            const id =
                module &&
                module.id
                    ? module.id
                    : '';

            return `
                <section class="module-placeholder">

                    <div class="module-placeholder-icon">
                        ${this.escapeHtml(icon)}
                    </div>

                    <h2>
                        ${this.escapeHtml(name)}
                    </h2>

                    <p>
                        ${this.escapeHtml(description)}
                    </p>

                    ${
                        id
                            ? `
                                <div class="module-badge">
                                    ${this.escapeHtml(id)}
                                </div>
                            `
                            : ''
                    }

                </section>
            `;
        },


        /* =========================================================
         * MODULE SCRIPT EXECUTION
         * ========================================================= */

        async executeModuleScript(
            moduleId,
            navigationId = this.navigationSequence
        ) {

            if (
                navigationId !==
                this.navigationSequence
            ) {

                return;
            }

            const scripts = [];

            /*
             * Only Pharmacology and Microbiology currently need
             * their PDF viewer before module.js.
             *
             * CDC does NOT use this viewer.
             */
            if (
                moduleId ===
                    'Y3-003-Pharmacology' ||
                moduleId ===
                    'Y3-004-Microbiology'
            ) {

                scripts.push(
                    `../MODULES/${encodeURIComponent(moduleId)}/pdfViewer.js`
                );
            }

            /*
             * Every module gets its own module.js.
             *
             * Therefore:
             *
             * Y3-005-CDC
             *
             * automatically loads:
             *
             * ../MODULES/Y3-005-CDC/module.js
             */
            scripts.push(
                `../MODULES/${encodeURIComponent(moduleId)}/module.js`
            );

            /*
             * Remove stale module scripts.
             */
            const staleScripts =
                Array.from(
                    document.querySelectorAll(
                        'script[data-year3-module-script]'
                    )
                );

            staleScripts.forEach(
                script => {

                    const source =
                        script.dataset.year3Source ||
                        '';

                    const belongsToCurrentModule =
                        source.includes(
                            encodeURIComponent(moduleId)
                        );

                    if (
                        !belongsToCurrentModule
                    ) {

                        try {

                            script.remove();

                        } catch (error) {

                            console.warn(
                                '[MODULE] Could not remove stale script:',
                                error
                            );
                        }
                    }
                }
            );

            this.loadedModuleScripts.clear();

            this.activeModuleScripts = [];

            /*
             * Load scripts sequentially.
             */
            for (
                const src
                of scripts
            ) {

                if (
                    navigationId !==
                    this.navigationSequence
                ) {

                    return;
                }

                await this.loadScript(
                    src,
                    moduleId,
                    navigationId
                );
            }

            /*
             * Pharmacology verification.
             */
            if (
                moduleId ===
                'Y3-003-Pharmacology'
            ) {

                if (
                    window.pharmacologyPdfViewer &&
                    typeof window.pharmacologyPdfViewer.open ===
                    'function'
                ) {

                    console.log(
                        '[PHARMACOLOGY PDF VIEWER] API verified successfully.'
                    );

                } else {

                    console.error(
                        '[PHARMACOLOGY PDF VIEWER] API was not registered after loading pdfViewer.js.'
                    );
                }
            }

            /*
             * Microbiology verification.
             */
            if (
                moduleId ===
                'Y3-004-Microbiology'
            ) {

                console.log(
                    '[MICROBIOLOGY] Module script loaded successfully.'
                );
            }

            /*
             * CDC verification.
             */
            if (
                moduleId ===
                'Y3-005-CDC'
            ) {

                if (
                    window.CDCModule &&
                    typeof window.CDCModule.init ===
                    'function'
                ) {

                    console.log(
                        '[CDC] Module script loaded and API detected successfully.'
                    );

                } else {

                    console.warn(
                        '[CDC] module.js loaded, but CDCModule API was not detected.'
                    );
                }
            }
        },


        /* =========================================================
         * SCRIPT LOADER
         * ========================================================= */

        loadScript(
            src,
            moduleId,
            navigationId
        ) {

            return new Promise(
                (resolve, reject) => {

                    if (
                        navigationId !==
                        this.navigationSequence
                    ) {

                        resolve();

                        return;
                    }

                    const normalizedSrc =
                        new URL(
                            src,
                            document.baseURI
                        ).href;

                    const existing =
                        Array.from(
                            document.querySelectorAll(
                                'script[data-year3-module-script]'
                            )
                        ).find(
                            script => {

                                const source =
                                    script.dataset.year3Source;

                                if (!source) {
                                    return false;
                                }

                                try {

                                    const existingAbsolute =
                                        new URL(
                                            source,
                                            document.baseURI
                                        ).href;

                                    return (
                                        script.dataset.year3ModuleScript ===
                                        moduleId &&
                                        existingAbsolute ===
                                        normalizedSrc
                                    );

                                } catch (error) {

                                    return (
                                        script.dataset.year3ModuleScript ===
                                        moduleId &&
                                        source ===
                                        src
                                    );
                                }
                            }
                        );

                    if (existing) {

                        console.log(
                            `[MODULE] Script already active: ${src}`
                        );

                        this.loadedModuleScripts.add(
                            src
                        );

                        resolve();

                        return;
                    }

                    const script =
                        document.createElement(
                            'script'
                        );

                    script.src =
                        src;

                    script.async =
                        false;

                    script.defer =
                        false;

                    script.dataset.year3ModuleScript =
                        moduleId;

                    script.dataset.year3Source =
                        src;

                    let settled =
                        false;

                    const cleanup =
                        () => {

                            script.onload =
                                null;

                            script.onerror =
                                null;
                        };

                    script.onload =
                        () => {

                            if (settled) {
                                return;
                            }

                            settled =
                                true;

                            cleanup();

                            this.loadedModuleScripts.add(
                                src
                            );

                            this.activeModuleScripts.push(
                                script
                            );

                            console.log(
                                `[MODULE] JavaScript loaded: ${src}`
                            );

                            resolve();
                        };

                    script.onerror =
                        error => {

                            if (settled) {
                                return;
                            }

                            settled =
                                true;

                            cleanup();

                            try {

                                script.remove();

                            } catch (removeError) {

                                console.warn(
                                    '[MODULE] Failed to remove broken script:',
                                    removeError
                                );
                            }

                            console.error(
                                `[MODULE] JavaScript failed to load: ${src}`,
                                error
                            );

                            reject(
                                new Error(
                                    `Failed to load module script: ${src}`
                                )
                            );
                        };

                    document.body.appendChild(
                        script
                    );
                }
            );
        },


        /* =========================================================
         * BACKWARDS-COMPATIBLE SCRIPT LOADER
         * ========================================================= */

        loadScriptOnce(
            src,
            moduleId,
            navigationId = this.navigationSequence
        ) {

            return this.loadScript(
                src,
                moduleId,
                navigationId
            );
        },


        /* =========================================================
         * ACTIVE NAVIGATION
         * ========================================================= */

        setActiveNavigation(moduleId) {

            document
                .querySelectorAll(
                    '[data-module-id]'
                )
                .forEach(
                    item => {

                        item.classList.toggle(
                            'active',
                            item.dataset.moduleId ===
                            moduleId
                        );

                        item.classList.toggle(
                            'is-active',
                            item.dataset.moduleId ===
                            moduleId
                        );
                    }
                );
        },


        /* =========================================================
         * STATE PERSISTENCE
         * ========================================================= */

        async persistCurrentModule() {

            try {

                if (
                    !window.year3 ||
                    !window.year3.state ||
                    typeof window.year3.state.save !==
                    'function'
                ) {

                    return;
                }

                await window.year3.state.save({

                    lastModule:
                        this.currentModule,

                    lastOpenedAt:
                        new Date().toISOString()
                });

            } catch (error) {

                console.error(
                    '[STATE] Could not save current module:',
                    error
                );
            }
        },


        /* =========================================================
         * THEME MANAGER
         * ========================================================= */

        initializeTheme() {

            let savedTheme =
                null;

            try {

                savedTheme =
                    localStorage.getItem(
                        'year3-study-os-theme'
                    );

            } catch (error) {

                console.warn(
                    '[THEME] Could not read saved theme.'
                );
            }

            const theme =
                savedTheme === 'dark'
                    ? 'dark'
                    : 'light';

            this.applyTheme(
                theme
            );

            const toggle =
                document.getElementById(
                    'theme-toggle'
                );

            if (!toggle) {
                return;
            }

            if (
                toggle.dataset.year3ThemeBound ===
                'true'
            ) {

                return;
            }

            toggle.dataset.year3ThemeBound =
                'true';

            toggle.addEventListener(
                'click',
                () => {

                    const currentTheme =
                        document.documentElement
                            .getAttribute(
                                'data-theme'
                            );

                    const nextTheme =
                        currentTheme === 'light'
                            ? 'dark'
                            : 'light';

                    this.applyTheme(
                        nextTheme
                    );
                }
            );
        },


        applyTheme(theme) {

            const safeTheme =
                theme === 'dark'
                    ? 'dark'
                    : 'light';

            document.documentElement
                .setAttribute(
                    'data-theme',
                    safeTheme
                );

            try {

                localStorage.setItem(
                    'year3-study-os-theme',
                    safeTheme
                );

            } catch (error) {

                console.warn(
                    '[THEME] Could not save theme.',
                    error
                );
            }

            const toggle =
                document.getElementById(
                    'theme-toggle'
                );

            if (!toggle) {
                return;
            }

            if (
                safeTheme ===
                'light'
            ) {

                toggle.textContent =
                    '🌙';

                toggle.title =
                    'Switch to dark theme';

                toggle.setAttribute(
                    'aria-label',
                    'Switch to dark theme'
                );

            } else {

                toggle.textContent =
                    '☀️';

                toggle.title =
                    'Switch to light theme';

                toggle.setAttribute(
                    'aria-label',
                    'Switch to light theme'
                );
            }
        },


        /* =========================================================
         * HTML ESCAPING
         * ========================================================= */

        escapeHtml(value) {

            return String(
                value ?? ''
            )
                .replaceAll(
                    '&',
                    '&amp;'
                )
                .replaceAll(
                    '<',
                    '&lt;'
                )
                .replaceAll(
                    '>',
                    '&gt;'
                )
                .replaceAll(
                    '"',
                    '&quot;'
                )
                .replaceAll(
                    "'",
                    '&#039;'
                );
        }
    };


    /* =============================================================
     * EXPOSE APPLICATION GLOBALLY
     * ============================================================= */

    window.Year3App =
        App;


    /* =============================================================
     * START APPLICATION
     * ============================================================= */

    if (
        document.readyState ===
        'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            () => {

                App.init()
                    .catch(
                        error => {

                            console.error(
                                '[YEAR3 STUDY OS] Application initialization failed:',
                                error
                            );
                        }
                    );
            },
            {
                once: true
            }
        );

    } else {

        App.init()
            .catch(
                error => {

                    console.error(
                        '[YEAR3 STUDY OS] Application initialization failed:',
                        error
                    );
                }
            );
    }

})();