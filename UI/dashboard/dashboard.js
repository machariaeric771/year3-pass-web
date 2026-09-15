(() => {
    'use strict';

    const Dashboard = {

        render() {
            return `
                <div class="dashboard">

                    <section class="welcome-panel">
                        <div>
                            <div class="eyebrow">
                                YEAR THREE MEDICAL STUDY SYSTEM
                            </div>

                            <h2>
                                Welcome to your
                                <span>Study OS.</span>
                            </h2>

                            <p>
                                One workspace for your Year 3
                                subjects, notes, questions,
                                flashcards, spotters and essays.
                            </p>
                        </div>

                        <div class="welcome-mark">
                            Y3
                        </div>
                    </section>

                    <section class="dashboard-grid">

                        <article
                            class="dashboard-card subject-card"
                            data-module="Y3-002-Pathology"
                        >
                            <div class="card-icon">🔬</div>
                            <div>
                                <h3>Pathology</h3>
                                <p>
                                    Build and review your
                                    pathology knowledge.
                                </p>
                            </div>
                        </article>

                        <article
                            class="dashboard-card subject-card"
                            data-module="Y3-003-Pharmacology"
                        >
                            <div class="card-icon">💊</div>
                            <div>
                                <h3>Pharmacology</h3>
                                <p>
                                    Drugs, mechanisms and
                                    therapeutic concepts.
                                </p>
                            </div>
                        </article>

                        <article
                            class="dashboard-card subject-card"
                            data-module="Y3-004-Microbiology"
                        >
                            <div class="card-icon">🦠</div>
                            <div>
                                <h3>Microbiology</h3>
                                <p>
                                    Organisms, infections and
                                    laboratory concepts.
                                </p>
                            </div>
                        </article><article
                            class="dashboard-card subject-card"
                            data-module="Y3-006-Physiology"
                        >
                            <div class="card-icon">⚙</div>
                            <div>
                                <h3>Physiology</h3>
                                <p>
                                    Mechanisms and normal
                                    human function.
                                </p>
                            </div>
                        </article>

                        <article
                            class="dashboard-card subject-card"
                            data-module="Y3-007-Neuroanatomy"
                        >
                            <div class="card-icon">🧠</div>
                            <div>
                                <h3>Neuroanatomy</h3>
                                <p>
                                    Nervous system structure
                                    and pathways.
                                </p>
                            </div>
                        </article>

                    </section>

                    <section class="tools-section">

                        <div class="section-heading">
                            <div>
                                <div class="eyebrow">
                                    STUDY TOOLS
                                </div>

                                <h2>Assessment & revision</h2>
                            </div>
                        </div>

                        <div class="tools-grid">

                            <button
                                class="tool-card"
                                data-module="Y3-009-MCQ"
                            >
                                <span>❓</span>
                                <strong>MCQ</strong>
                                <small>
                                    Questions & practice
                                </small>
                            </button>

                            <button
                                class="tool-card"
                                data-module="Y3-010-Flashcards"
                            >
                                <span>🗂</span>
                                <strong>Flashcards</strong>
                                <small>
                                    Active recall
                                </small>
                            </button>

                            <button
                                class="tool-card"
                                data-module="Y3-011-Spotter"
                            >
                                <span>👁</span>
                                <strong>Spotter</strong>
                                <small>
                                    Image identification
                                </small>
                            </button>

                            <button
                                class="tool-card"
                                data-module="Y3-012-Essay"
                            >
                                <span>📄</span>
                                <strong>Essay</strong>
                                <small>
                                    Structured answers
                                </small>
                            </button>

                        </div>

                    </section>

                    <section class="ai-preview">

                        <div class="ai-preview-icon">
                            AI
                        </div>

                        <div>
                            <div class="eyebrow">
                                AI ENGINE
                            </div>

                            <h2>
                                OpenRouter AI will connect here.
                            </h2>

                            <p>
                                The AI layer will be added after
                                the core application and module
                                system are stable.
                            </p>
                        </div>

                        <div class="coming-soon">
                            COMING NEXT
                        </div>

                    </section>

                </div>
            `;
        },

        init(app) {

            document
                .querySelectorAll(
                    '[data-module]'
                )
                .forEach(card => {

                    card.addEventListener(
                        'click',
                        () => {
                            app.navigate(
                                card.dataset.module
                            );
                        }
                    );
                });
        }
    };

    window.Dashboard = Dashboard;
})();
