(() => {
    'use strict';

    // ============================================================
    // YEAR 3 STUDY OS MODULE REGISTRY
    // ============================================================

    const MODULES = [

        // --------------------------------------------------------
        // MAIN
        // --------------------------------------------------------

        {
            id: 'dashboard',
            name: 'Dashboard',
            icon: '⌂',
            section: 'MAIN'
        },

        {
            id: 'Y3-000-AI',
            name: 'AI Study Assistant',
            icon: '🤖',
            section: 'MAIN'
        },


        // --------------------------------------------------------
        // STUDY
        // --------------------------------------------------------

        {
            id: 'Y3-001-Notes',
            name: 'Notes',
            icon: '📝',
            section: 'STUDY'
        },

        {
            id: 'Y3-002-Pathology',
            name: 'Pathology',
            icon: '🔬',
            section: 'STUDY'
        },

        {
            id: 'Y3-003-Pharmacology',
            name: 'Pharmacology',
            icon: '💊',
            section: 'STUDY'
        },

        {
            id: 'Y3-004-Microbiology',
            name: 'Microbiology',
            icon: '🦠',
            section: 'STUDY'
        },

        {
            id: 'Y3-006-Physiology',
            name: 'Physiology',
            icon: '⚙',
            section: 'STUDY'
        },

        {
            id: 'Y3-007-Neuroanatomy',
            name: 'Neuroanatomy',
            icon: '🧠',
            section: 'STUDY'
        },

        {
            id: 'Y3-008-Obstetrics-Gynaecology',
            name: 'Obstetrics & Gynaecology',
            icon: '👩‍⚕️',
            section: 'STUDY'
        },


        // --------------------------------------------------------
        // TOOLS
        // --------------------------------------------------------

        {
            id: 'Y3-009-MCQ',
            name: 'MCQ',
            icon: '❓',
            section: 'TOOLS'
        },

        {
            id: 'Y3-010-Flashcards',
            name: 'Flashcards',
            icon: '🗂',
            section: 'TOOLS'
        },

        {
            id: 'Y3-011-Spotter',
            name: 'Spotter',
            icon: '👁',
            section: 'TOOLS'
        },

        {
            id: 'Y3-012-Essay',
            name: 'Essay',
            icon: '📄',
            section: 'TOOLS'
        }

    ];


    // ============================================================
    // SECTION LABELS
    // ============================================================

    const SECTION_LABELS = {

        MAIN: 'MAIN',

        STUDY: 'STUDY',

        TOOLS: 'TOOLS'

    };


    // ============================================================
    // SIDEBAR
    // ============================================================

    const Sidebar = {

        render(container, app) {

            if (!container) {
                return;
            }

            container.innerHTML = '';

            let currentSection = null;


            // ====================================================
            // RENDER MODULES
            // ====================================================

            MODULES.forEach(module => {

                // ------------------------------------------------
                // Section heading
                // ------------------------------------------------

                if (
                    module.section !==
                    currentSection
                ) {

                    currentSection =
                        module.section;

                    const label =
                        document.createElement(
                            'div'
                        );

                    label.className =
                        'nav-section-label';

                    label.textContent =
                        SECTION_LABELS[
                            currentSection
                        ];

                    container.appendChild(
                        label
                    );
                }


                // ------------------------------------------------
                // Navigation button
                // ------------------------------------------------

                const button =
                    document.createElement(
                        'button'
                    );

                button.type = 'button';

                button.className =
                    'nav-item';

                button.dataset.moduleId =
                    module.id;


                // ------------------------------------------------
                // Button contents
                // ------------------------------------------------

                button.innerHTML = `

                    <span class="nav-icon">
                        ${module.icon}
                    </span>

                    <span class="nav-label">
                        ${module.name}
                    </span>

                `;


                // ------------------------------------------------
                // Navigation
                // ------------------------------------------------

                button.addEventListener(
                    'click',
                    () => {

                        app.navigate(
                            module.id
                        );

                    }
                );


                container.appendChild(
                    button
                );

            });


            // ====================================================
            // RESTORE ACTIVE MODULE
            // ====================================================

            app.setActiveNavigation(
                app.currentModule
            );

        }

    };


    // ============================================================
    // GLOBAL
    // ============================================================

    window.Sidebar = Sidebar;

})();