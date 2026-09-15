'use strict';

(() => {

    /* =========================================================
       YEAR 3 STUDY OS
       AI MODULE
       ========================================================= */

    const AIModule = {

        sessionId:
            `ai-session-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 9)}`,

        elements: {},

        studyContext: {},


        /* =====================================================
           INITIALIZATION
           ===================================================== */

        init() {

            console.log('[AI MODULE] Initializing...');

            this.cacheElements();
            this.bindEvents();
            this.loadStudyContext();
            this.checkAIStatus();

            console.log('[AI MODULE] Initialization complete');

        },


        /* =====================================================
           CACHE ELEMENTS
           ===================================================== */

        cacheElements() {

            this.elements.chat =
                document.getElementById('ai-chat');

            this.elements.input =
                document.getElementById('ai-input');

            this.elements.send =
                document.getElementById('ai-send-button') ||
                document.getElementById('ai-send');

            this.elements.clear =
                document.getElementById('ai-clear-button') ||
                document.getElementById('ai-clear');

            this.elements.status =
                document.getElementById('ai-status');

            this.elements.headerStatus =
                document.getElementById('ai-model-status');

            this.elements.moduleName =
                document.getElementById('ai-module-name');

            this.elements.subject =
                document.getElementById('ai-subject');

            this.elements.topic =
                document.getElementById('ai-topic');

        },


        /* =====================================================
           EVENT BINDING
           ===================================================== */

        bindEvents() {

            if (this.elements.send) {

                this.elements.send.addEventListener(
                    'click',
                    () => this.sendMessage()
                );

            }

            if (this.elements.input) {

                this.elements.input.addEventListener(
                    'keydown',
                    event => {

                        if (
                            event.key === 'Enter' &&
                            !event.shiftKey
                        ) {

                            event.preventDefault();

                            this.sendMessage();

                        }

                    }
                );

            }

            if (this.elements.clear) {

                this.elements.clear.addEventListener(
                    'click',
                    () => this.clearChat()
                );

            }

        },


        /* =====================================================
           STUDY CONTEXT
           ===================================================== */

        loadStudyContext() {

            const context =
                window.year3?.studyContext || {};

            this.studyContext = {

                moduleId:
                    context.moduleId ||
                    'Y3-000-AI',

                moduleName:
                    context.moduleName ||
                    'AI Study Assistant',

                subject:
                    context.subject ||
                    '',

                topic:
                    context.topic ||
                    ''

            };

            if (this.elements.moduleName) {

                this.elements.moduleName.textContent =
                    this.studyContext.moduleName;

            }

            if (this.elements.subject) {

                this.elements.subject.textContent =
                    this.studyContext.subject;

            }

            if (this.elements.topic) {

                this.elements.topic.textContent =
                    this.studyContext.topic;

            }

        },


        /* =====================================================
           AI STATUS
           ===================================================== */

        async checkAIStatus() {

            try {

                if (
                    !window.year3?.ai ||
                    typeof window.year3.ai.status !== 'function'
                ) {

                    this.setStatus(
                        'AI service unavailable'
                    );

                    this.updateHeaderStatus(
                        'AI unavailable',
                        false
                    );

                    return;

                }

                const status =
                    await window.year3.ai.status();

                console.log(
                    '[AI MODULE] AI status:',
                    status
                );

                const message =
                    status?.message ||
                    'AI ready';

                this.setStatus(message);

                this.updateHeaderStatus(
                    'AI ready',
                    true
                );

            } catch (error) {

                console.error(
                    '[AI MODULE] AI status error:',
                    error
                );

                this.setStatus(
                    'AI connection unavailable'
                );

                this.updateHeaderStatus(
                    'AI unavailable',
                    false
                );

            }

        },


        /* =====================================================
           HEADER STATUS
           ===================================================== */

        updateHeaderStatus(message, healthy = true) {

            const element =
                this.elements.headerStatus;

            if (!element) {
                return;
            }

            element.innerHTML = '';

            const dot =
                document.createElement('span');

            dot.className =
                healthy
                    ? 'ai-status-dot'
                    : 'ai-status-dot ai-status-dot-error';

            const text =
                document.createElement('span');

            text.textContent =
                message;

            element.appendChild(dot);
            element.appendChild(text);

        },


        /* =====================================================
           SEND MESSAGE
           ===================================================== */

        async sendMessage() {

            if (!this.elements.input) {
                return;
            }

            const message =
                this.elements.input.value.trim();

            if (!message) {
                return;
            }

            console.log(
                '[AI MODULE] Sending message:',
                message
            );

            this.addMessage(
                'user',
                message
            );

            this.elements.input.value = '';

            this.showLoading();

            this.setStatus(
                'AI is thinking...'
            );

            try {

                if (!this.studyContext) {
                    this.loadStudyContext();
                }

                const studyContext =
                    this.studyContext || {};

                /*
                 * IMPORTANT:
                 *
                 * We deliberately do not pass an unqualified
                 * model ID here.
                 *
                 * The selected provider-qualified model is
                 * maintained by the backend through setModel().
                 *
                 * Example:
                 *
                 * openrouter:openai/gpt-oss-120b
                 * groq:openai/gpt-oss-120b
                 * gemini:gemini-3.7-flash
                 * mistral:mistral-small-latest
                 */

                const result =
                    await window.year3.ai.ask({

                        task: 'assistant',

                        message: message,

                        sessionId:
                            this.sessionId,

                        context: {

                            moduleId:
                                studyContext.moduleId,

                            moduleName:
                                studyContext.moduleName,

                            subject:
                                studyContext.subject,

                            topic:
                                studyContext.topic

                        },

                        options: {

                            temperature: 0.2,

                            maxTokens: 2048,

                            /*
                             * Keep reasoning controlled so
                             * reasoning models do not consume
                             * the entire output budget.
                             */
                            reasoning: {
                                effort: 'low'
                            }

                        }

                    });

                console.log(
                    '[AI MODULE] AI response:',
                    result
                );

                this.hideLoading();

                let responseText = '';

                if (
                    typeof result === 'string'
                ) {

                    responseText = result;

                } else if (
                    typeof result?.text === 'string' &&
                    result.text.trim()
                ) {

                    responseText =
                        result.text;

                } else if (
                    typeof result?.content === 'string' &&
                    result.content.trim()
                ) {

                    responseText =
                        result.content;

                } else if (
                    typeof result?.response === 'string' &&
                    result.response.trim()
                ) {

                    responseText =
                        result.response;

                } else if (
                    typeof result?.message === 'string' &&
                    result.message.trim()
                ) {

                    responseText =
                        result.message;

                } else {

                    responseText =
                        'The AI returned an empty response.';

                }

                this.addMessage(
                    'assistant',
                    responseText
                );

                this.setStatus(
                    'AI ready'
                );

                /*
                 * If the backend reports the actual provider
                 * and model used, show it in the console.
                 */
                if (result?.provider || result?.model) {

                    console.log(
                        '[AI MODULE] Provider:',
                        result.provider
                    );

                    console.log(
                        '[AI MODULE] Model:',
                        result.model
                    );

                }

            } catch (error) {

                console.error(
                    '[AI MODULE] AI request failed:',
                    error
                );

                this.hideLoading();

                this.addMessage(
                    'assistant',
                    `AI request failed.\n\n${
                        error?.message ||
                        error
                    }`
                );

                this.setStatus(
                    'AI request failed'
                );

            }

        },


        /* =====================================================
           ADD MESSAGE
           ===================================================== */

        addMessage(role, content) {

            if (!this.elements.chat) {
                return;
            }

            const message =
                document.createElement('div');

            message.className =
                `ai-message ai-message-${role}`;

            const body =
                document.createElement('div');

            body.className =
                'ai-message-body';

            body.innerHTML =
                renderAIResponse(content);

            message.appendChild(body);

            this.elements.chat.appendChild(
                message
            );

            this.scrollToBottom();

        },


        /* =====================================================
           LOADING
           ===================================================== */

        showLoading() {

            if (!this.elements.chat) {
                return;
            }

            this.hideLoading();

            const loading =
                document.createElement('div');

            loading.id =
                'ai-loading-message';

            loading.className =
                'ai-message ai-message-assistant';

            const body =
                document.createElement('div');

            body.className =
                'ai-message-body';

            body.textContent =
                'Thinking...';

            loading.appendChild(body);

            this.elements.chat.appendChild(
                loading
            );

            this.scrollToBottom();

        },


        hideLoading() {

            const loading =
                document.getElementById(
                    'ai-loading-message'
                );

            if (loading) {
                loading.remove();
            }

        },


        /* =====================================================
           CLEAR CHAT
           ===================================================== */

        async clearChat() {

            if (!this.elements.chat) {
                return;
            }

            this.elements.chat.innerHTML = '';

            this.sessionId =
                `ai-session-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 9)}`;

            try {

                if (
                    window.year3?.ai &&
                    typeof window.year3.ai.clearMemory ===
                        'function'
                ) {

                    await window.year3.ai.clearMemory(
                        this.sessionId
                    );

                }

            } catch (error) {

                console.warn(
                    '[AI MODULE] Could not clear AI memory:',
                    error
                );

            }

            this.setStatus(
                'Chat cleared'
            );

        },


        /* =====================================================
           STATUS
           ===================================================== */

        setStatus(message) {

            if (this.elements.status) {

                this.elements.status.textContent =
                    message;

            }

        },


        /* =====================================================
           SCROLL
           ===================================================== */

        scrollToBottom() {

            if (!this.elements.chat) {
                return;
            }

            this.elements.chat.scrollTop =
                this.elements.chat.scrollHeight;

        }

    };


    /* =========================================================
       AI MODEL CONTROL
       ========================================================= */

    const AIModelControl = {

        models: [],

        currentModel: null,

        currentMode: 'primary',

        elements: {},

        loading: false,

        initialized: false,

        eventsBound: false,


        /* =====================================================
           INITIALIZATION
           ===================================================== */

        async init() {

            if (this.initialized) {

                console.log(
                    '[AI MODEL CONTROL] Already initialized. Skipping.'
                );

                return;

            }

            this.initialized = true;

            console.log(
                '[AI MODEL CONTROL] Initializing...'
            );

            this.cacheElements();

            console.log(
                '[AI MODEL CONTROL] Cached elements:',
                {
                    modelSelect:
                        !!this.elements.modelSelect,

                    modeSelect:
                        !!this.elements.modeSelect,

                    currentModel:
                        !!this.elements.currentModel,

                    currentMeta:
                        !!this.elements.currentMeta,

                    category:
                        !!this.elements.category,

                    provider:
                        !!this.elements.provider,

                    access:
                        !!this.elements.access,

                    description:
                        !!this.elements.description,

                    status:
                        !!this.elements.status
                }
            );

            this.showLoadingState();

            await this.loadSelectionState();

            await this.loadModels();

            this.bindEvents();

            this.updateUI();

            console.log(
                '[AI MODEL CONTROL] Initialization complete'
            );

        },


        /* =====================================================
           CACHE ELEMENTS
           ===================================================== */

        cacheElements() {

            this.elements.modelSelect =
                document.getElementById(
                    'aiModelSelect'
                );

            this.elements.modeSelect =
                document.getElementById(
                    'aiModeSelect'
                );

            this.elements.currentModel =
                document.getElementById(
                    'aiCurrentModelName'
                );

            this.elements.currentMeta =
                document.getElementById(
                    'aiCurrentModelMeta'
                );

            this.elements.category =
                document.getElementById(
                    'aiModelCategory'
                );

            this.elements.provider =
                document.getElementById(
                    'aiModelProvider'
                );

            this.elements.access =
                document.getElementById(
                    'aiModelAccess'
                );

            this.elements.description =
                document.getElementById(
                    'aiModelDescription'
                );

            this.elements.status =
                document.getElementById(
                    'aiModelStatus'
                );

        },


        /* =====================================================
           LOADING STATE
           ===================================================== */

        showLoadingState() {

            this.loading = true;

            if (this.elements.modelSelect) {

                this.elements.modelSelect.innerHTML = '';

                const option =
                    document.createElement('option');

                option.value = '';

                option.textContent =
                    'Loading models...';

                option.disabled = true;

                option.selected = true;

                this.elements.modelSelect.appendChild(
                    option
                );

                this.elements.modelSelect.disabled =
                    true;

            }

            if (this.elements.currentModel) {

                this.elements.currentModel.textContent =
                    'Loading models...';

            }

            if (this.elements.currentMeta) {

                this.elements.currentMeta.textContent =
                    'Loading model information...';

            }

            if (this.elements.category) {

                this.elements.category.textContent =
                    'Loading...';

            }

            if (this.elements.provider) {

                this.elements.provider.textContent =
                    'Loading...';

            }

            if (this.elements.access) {

                this.elements.access.textContent =
                    'Loading...';

            }

            if (this.elements.description) {

                this.elements.description.textContent =
                    'Loading available AI models...';

            }

            this.setStatus(
                'Loading AI models...'
            );

        },


        hideLoadingState() {

            this.loading = false;

            if (this.elements.modelSelect) {

                this.elements.modelSelect.disabled =
                    false;

            }

        },


        /* =====================================================
           MODEL KEY
           
           Provider-qualified model identity.
           
           Example:
           openrouter:openai/gpt-oss-120b
           groq:openai/gpt-oss-120b
           ===================================================== */

        getModelKey(model) {

            if (!model) {
                return '';
            }

            const provider =
                model.provider ||
                model.providerId ||
                model.providerName ||
                '';

            const id =
                model.id ||
                model.model ||
                model.modelId ||
                model.slug ||
                '';

            if (!id) {
                return '';
            }

            /*
             * If the backend already supplied a qualified key,
             * preserve it.
             */
            if (
                typeof id === 'string' &&
                id.includes(':') &&
                !provider
            ) {

                return id;

            }

            if (provider) {

                return `${String(provider).toLowerCase()}:${id}`;

            }

            return String(id);

        },


        /* =====================================================
           EXTRACT PROVIDER
           ===================================================== */

        getProvider(model) {

            if (!model) {
                return '';
            }

            if (model.provider) {

                return String(
                    model.provider
                );

            }

            if (model.providerId) {

                return String(
                    model.providerId
                );

            }

            /*
             * Try extracting from provider-qualified ID.
             */
            const id =
                model.id ||
                model.model ||
                model.modelId ||
                '';

            if (
                typeof id === 'string' &&
                id.includes(':')
            ) {

                return id.split(':')[0];

            }

            return '';

        },


        /* =====================================================
           EXTRACT RAW MODEL ID
           ===================================================== */

        getRawModelId(model) {

            if (!model) {
                return '';
            }

            const id =
                model.id ||
                model.model ||
                model.modelId ||
                model.slug ||
                '';

            if (
                typeof id === 'string' &&
                id.includes(':')
            ) {

                const separator =
                    id.indexOf(':');

                return id.substring(
                    separator + 1
                );

            }

            return String(id);

        },


        /* =====================================================
           NORMALIZE MODELS
           ===================================================== */

        normalizeModels(result) {

            const output = [];

            const seen =
                new Set();


            const addModel = model => {

                if (!model) {
                    return;
                }


                /* ---------------------------------------------
                   STRING MODEL
                   --------------------------------------------- */

                if (
                    typeof model === 'string'
                ) {

                    const id =
                        model.trim();

                    if (!id) {
                        return;
                    }

                    const key =
                        id;

                    if (!seen.has(key)) {

                        seen.add(key);

                        output.push({

                            id: id,

                            name: id,

                            key: key,

                            provider:
                                id.includes(':')
                                    ? id.split(':')[0]
                                    : '',

                            rawModelId:
                                id.includes(':')
                                    ? id.substring(
                                        id.indexOf(':') + 1
                                    )
                                    : id

                        });

                    }

                    return;

                }


                /* ---------------------------------------------
                   OBJECT MODEL
                   --------------------------------------------- */

                if (
                    typeof model !== 'object'
                ) {

                    return;

                }


                const id =
                    model.id ||
                    model.model ||
                    model.modelId ||
                    model.slug ||
                    null;


                if (!id) {
                    return;
                }


                const provider =
                    this.getProvider(model);


                const rawModelId =
                    this.getRawModelId(model);


                /*
                 * CRITICAL:
                 *
                 * Use provider + model ID for uniqueness.
                 *
                 * This prevents:
                 *
                 * openrouter:gpt-oss
                 * groq:gpt-oss
                 *
                 * from being merged.
                 */

                const key =
                    model.key ||
                    (
                        provider
                            ? `${provider.toLowerCase()}:${rawModelId}`
                            : String(id)
                    );


                const normalized = {

                    ...model,

                    id:
                        String(id),

                    key:
                        String(key),

                    provider:
                        provider ||
                        model.provider ||
                        '',

                    rawModelId:
                        rawModelId,

                    name:
                        model.name ||
                        model.label ||
                        model.displayName ||
                        rawModelId ||
                        String(id)

                };


                if (
                    !seen.has(
                        normalized.key
                    )
                ) {

                    seen.add(
                        normalized.key
                    );

                    output.push(
                        normalized
                    );

                }

            };


            const walk = value => {

                if (!value) {
                    return;
                }


                if (Array.isArray(value)) {

                    value.forEach(
                        item => walk(item)
                    );

                    return;

                }


                if (
                    typeof value !== 'object'
                ) {

                    return;

                }


                /*
                 * If this object itself looks like a model,
                 * add it.
                 */
                if (
                    value.id ||
                    value.model ||
                    value.modelId ||
                    value.slug
                ) {

                    addModel(value);

                }


                const knownKeys = [

                    'models',

                    'data',

                    'availableModels',

                    'primary',

                    'primaryModels',

                    'fallback',

                    'fallbackModels',

                    'automatic',

                    'automaticModels',

                    'free',

                    'freeModels',

                    'paid',

                    'paidModels',

                    'items',

                    'results'

                ];


                knownKeys.forEach(
                    key => {

                        if (
                            value[key] !==
                            undefined
                        ) {

                            walk(
                                value[key]
                            );

                        }

                    }
                );

            };


            walk(result);

            return output;

        },


        /* =====================================================
           LOAD MODELS
           ===================================================== */

        async loadModels() {

            this.setStatus(
                'Loading AI models...'
            );

            try {

                if (!window.year3?.ai) {

                    throw new Error(
                        'AI API is unavailable.'
                    );

                }


                let collected = [];


                /* =================================================
                   ALL MODELS
                   ================================================= */

                if (
                    typeof window.year3.ai.models ===
                    'function'
                ) {

                    try {

                        const result =
                            await window.year3.ai.models();

                        console.log(
                            '[AI MODEL CONTROL] ai.models() result:',
                            result
                        );

                        collected =
                            collected.concat(
                                this.normalizeModels(
                                    result
                                )
                            );

                    } catch (error) {

                        console.warn(
                            '[AI MODEL CONTROL] ai.models() failed:',
                            error
                        );

                    }

                }


                /* =================================================
                   AVAILABLE MODELS
                   ================================================= */

                if (
                    typeof window.year3.ai.availableModels ===
                    'function'
                ) {

                    try {

                        const result =
                            await window.year3.ai
                                .availableModels();

                        console.log(
                            '[AI MODEL CONTROL] availableModels() result:',
                            result
                        );

                        collected =
                            collected.concat(
                                this.normalizeModels(
                                    result
                                )
                            );

                    } catch (error) {

                        console.warn(
                            '[AI MODEL CONTROL] availableModels() failed:',
                            error
                        );

                    }

                }


                /* =================================================
                   PRIMARY MODELS
                   ================================================= */

                if (
                    typeof window.year3.ai.primaryModels ===
                    'function'
                ) {

                    try {

                        const result =
                            await window.year3.ai
                                .primaryModels();

                        console.log(
                            '[AI MODEL CONTROL] primaryModels() result:',
                            result
                        );

                        collected =
                            collected.concat(
                                this.normalizeModels(
                                    result
                                )
                            );

                    } catch (error) {

                        console.warn(
                            '[AI MODEL CONTROL] primaryModels() failed:',
                            error
                        );

                    }

                }


                /* =================================================
                   FALLBACK MODELS
                   ================================================= */

                if (
                    typeof window.year3.ai.fallbackModels ===
                    'function'
                ) {

                    try {

                        const result =
                            await window.year3.ai
                                .fallbackModels();

                        console.log(
                            '[AI MODEL CONTROL] fallbackModels() result:',
                            result
                        );

                        collected =
                            collected.concat(
                                this.normalizeModels(
                                    result
                                )
                            );

                    } catch (error) {

                        console.warn(
                            '[AI MODEL CONTROL] fallbackModels() failed:',
                            error
                        );

                    }

                }


                /* =================================================
                   AUTOMATIC MODELS
                   ================================================= */

                if (
                    typeof window.year3.ai.automaticModels ===
                    'function'
                ) {

                    try {

                        const result =
                            await window.year3.ai
                                .automaticModels();

                        console.log(
                            '[AI MODEL CONTROL] automaticModels() result:',
                            result
                        );

                        collected =
                            collected.concat(
                                this.normalizeModels(
                                    result
                                )
                            );

                    } catch (error) {

                        console.warn(
                            '[AI MODEL CONTROL] automaticModels() failed:',
                            error
                        );

                    }

                }


                /* =================================================
                   FREE MODELS
                   ================================================= */

                if (
                    typeof window.year3.ai.freeModels ===
                    'function'
                ) {

                    try {

                        const result =
                            await window.year3.ai
                                .freeModels();

                        console.log(
                            '[AI MODEL CONTROL] freeModels() result:',
                            result
                        );

                        collected =
                            collected.concat(
                                this.normalizeModels(
                                    result
                                )
                            );

                    } catch (error) {

                        console.warn(
                            '[AI MODEL CONTROL] freeModels() failed:',
                            error
                        );

                    }

                }


                /* =================================================
                   PAID MODELS
                   ================================================= */

                if (
                    typeof window.year3.ai.paidModels ===
                    'function'
                ) {

                    try {

                        const result =
                            await window.year3.ai
                                .paidModels();

                        console.log(
                            '[AI MODEL CONTROL] paidModels() result:',
                            result
                        );

                        collected =
                            collected.concat(
                                this.normalizeModels(
                                    result
                                )
                            );

                    } catch (error) {

                        console.warn(
                            '[AI MODEL CONTROL] paidModels() failed:',
                            error
                        );

                    }

                }


                /* =================================================
                   FINAL PROVIDER-AWARE DEDUPLICATION
                   ================================================= */

                const unique =
                    new Map();


                collected.forEach(
                    model => {

                        if (!model) {
                            return;
                        }

                        const key =
                            model.key ||
                            this.getModelKey(
                                model
                            );

                        if (
                            key &&
                            !unique.has(key)
                        ) {

                            unique.set(
                                key,
                                {
                                    ...model,
                                    key: key
                                }
                            );

                        }

                    }
                );


                this.models =
                    Array.from(
                        unique.values()
                    );


                /*
                 * Sort by provider, then name.
                 */
                this.models.sort(
                    (a, b) => {

                        const providerA =
                            String(
                                a.provider ||
                                ''
                            ).toLowerCase();

                        const providerB =
                            String(
                                b.provider ||
                                ''
                            ).toLowerCase();

                        if (
                            providerA <
                            providerB
                        ) {
                            return -1;
                        }

                        if (
                            providerA >
                            providerB
                        ) {
                            return 1;
                        }

                        return String(
                            a.name ||
                            a.id ||
                            ''
                        ).localeCompare(
                            String(
                                b.name ||
                                b.id ||
                                ''
                            )
                        );

                    }
                );


                console.log(
                    '[AI MODEL CONTROL] FINAL MODEL LIST:',
                    this.models
                );

                console.log(
                    '[AI MODEL CONTROL] FINAL MODEL COUNT:',
                    this.models.length
                );


                this.hideLoadingState();

                this.renderModels();

                this.updateUI();


                if (
                    this.models.length === 0
                ) {

                    this.setStatus(
                        'No AI models available'
                    );

                } else {

                    this.setStatus(
                        `${this.models.length} AI models loaded`
                    );

                }

            } catch (error) {

                console.error(
                    '[AI MODEL CONTROL] Model loading failed:',
                    error
                );

                this.models = [];

                this.hideLoadingState();

                this.renderModels();

                this.setStatus(
                    'Failed to load AI models'
                );

            }

        },


        /* =====================================================
           LOAD CURRENT SELECTION
           ===================================================== */

        async loadSelectionState() {

            try {

                /* =================================================
                   SELECTION STATE
                   ================================================= */

                if (
                    window.year3?.ai &&
                    typeof window.year3.ai
                        .getSelectionState ===
                        'function'
                ) {

                    const state =
                        await window.year3.ai
                            .getSelectionState();

                    console.log(
                        '[AI MODEL CONTROL] Selection state:',
                        state
                    );


                    if (state) {

                        this.currentModel =
                            state.model ||
                            state.activeModel ||
                            state.modelId ||
                            state.activeModelId ||
                            null;

                        this.currentMode =
                            state.mode ||
                            'primary';

                    }

                }


                /* =================================================
                   ACTIVE MODEL FALLBACK
                   ================================================= */

                if (
                    !this.currentModel &&
                    window.year3?.ai &&
                    typeof window.year3.ai
                        .getActiveModel ===
                    'function'
                ) {

                    this.currentModel =
                        await window.year3.ai
                            .getActiveModel();

                }


                /* =================================================
                   ACTIVE MODEL ID FALLBACK
                   ================================================= */

                if (
                    !this.currentModel &&
                    window.year3?.ai &&
                    typeof window.year3.ai
                        .getActiveModelId ===
                    'function'
                ) {

                    this.currentModel =
                        await window.year3.ai
                            .getActiveModelId();

                }


                /* =================================================
                   MODE
                   ================================================= */

                if (
                    window.year3?.ai &&
                    typeof window.year3.ai.getMode ===
                    'function'
                ) {

                    const mode =
                        await window.year3.ai
                            .getMode();

                    if (mode) {

                        this.currentMode =
                            mode;

                    }

                }

            } catch (error) {

                console.error(
                    '[AI MODEL CONTROL] Selection state error:',
                    error
                );

            }

        },


        /* =====================================================
           RESOLVE CURRENT MODEL
           ===================================================== */

        resolveCurrentModel() {

            if (!this.currentModel) {
                return null;
            }


            if (
                typeof this.currentModel ===
                'object'
            ) {

                /*
                 * If the object itself has a provider-qualified
                 * key, match it first.
                 */
                const objectKey =
                    this.getModelKey(
                        this.currentModel
                    );


                if (objectKey) {

                    const byKey =
                        this.models.find(
                            model =>
                                String(
                                    model.key ||
                                    this.getModelKey(
                                        model
                                    )
                                ) ===
                                String(objectKey)
                        );


                    if (byKey) {
                        return byKey;
                    }

                }


                const objectId =
                    this.currentModel.id ||
                    this.currentModel.model ||
                    this.currentModel.modelId ||
                    '';


                const objectProvider =
                    this.currentModel.provider ||
                    '';


                const matching =
                    this.models.find(
                        model => {

                            const modelId =
                                model.id ||
                                model.model ||
                                model.modelId ||
                                '';

                            const modelProvider =
                                model.provider ||
                                '';

                            return (
                                String(modelId) ===
                                String(objectId)
                            ) &&
                            (
                                !objectProvider ||
                                String(
                                    modelProvider
                                ).toLowerCase() ===
                                String(
                                    objectProvider
                                ).toLowerCase()
                            );

                        }
                    );


                return (
                    matching ||
                    this.currentModel
                );

            }


            const current =
                String(
                    this.currentModel
                );


            /*
             * Exact provider-qualified key.
             */
            const byKey =
                this.models.find(
                    model =>
                        String(
                            model.key ||
                            this.getModelKey(
                                model
                            )
                        ) ===
                        current
                );


            if (byKey) {
                return byKey;
            }


            /*
             * Exact model ID.
             */
            const byId =
                this.models.find(
                    model =>
                        String(
                            model.id ||
                            model.model ||
                            model.modelId ||
                            ''
                        ) ===
                        current
                );


            if (byId) {
                return byId;
            }


            /*
             * Backward compatibility:
             * backend may return only the raw model ID.
             *
             * If multiple providers have the same raw ID,
             * prefer the currently configured provider.
             */
            const rawMatches =
                this.models.filter(
                    model =>
                        String(
                            model.rawModelId ||
                            this.getRawModelId(
                                model
                            )
                        ) ===
                        current
                );


            if (
                rawMatches.length > 0
            ) {

                const preferred =
                    rawMatches.find(
                        model =>
                            String(
                                model.provider ||
                                ''
                            ).toLowerCase() ===
                            'openrouter'
                    );


                return (
                    preferred ||
                    rawMatches[0]
                );

            }


            return {

                id:
                    current,

                key:
                    current,

                name:
                    current

            };

        },


        /* =====================================================
           RENDER MODELS
           ===================================================== */

        renderModels() {

            const select =
                this.elements.modelSelect;


            if (!select) {

                console.error(
                    '[AI MODEL CONTROL] Model select element NOT FOUND.'
                );

                return;

            }


            console.log(
                '[AI MODEL CONTROL] Rendering models into dropdown...'
            );


            select.innerHTML = '';


            if (
                this.models.length === 0
            ) {

                const option =
                    document.createElement(
                        'option'
                    );

                option.value = '';

                option.textContent =
                    'No AI models available';

                option.disabled = true;

                option.selected = true;

                select.appendChild(
                    option
                );

                return;

            }


            /*
             * Group models by provider.
             */
            const groups =
                new Map();


            this.models.forEach(
                model => {

                    const provider =
                        model.provider ||
                        'Other';

                    const providerKey =
                        String(
                            provider
                        ).toLowerCase();

                    if (
                        !groups.has(
                            providerKey
                        )
                    ) {

                        groups.set(
                            providerKey,
                            {
                                name: provider,
                                models: []
                            }
                        );

                    }

                    groups.get(
                        providerKey
                    ).models.push(
                        model
                    );

                }
            );


            /*
             * Render provider groups.
             */
            groups.forEach(
                group => {

                    const optgroup =
                        document.createElement(
                            'optgroup'
                        );

                    optgroup.label =
                        this.formatProviderName(
                            group.name
                        );


                    group.models.forEach(
                        model => {

                            const option =
                                this.createOption(
                                    model
                                );

                            optgroup.appendChild(
                                option
                            );

                        }
                    );


                    select.appendChild(
                        optgroup
                    );

                }
            );


            /*
             * Select current model.
             */
            const current =
                this.resolveCurrentModel();


            if (current) {

                const currentKey =
                    current.key ||
                    this.getModelKey(
                        current
                    );


                if (currentKey) {

                    const exists =
                        Array.from(
                            select.options
                        ).some(
                            option =>
                                option.value ===
                                String(
                                    currentKey
                                )
                        );


                    if (exists) {

                        select.value =
                            String(
                                currentKey
                            );

                    } else {

                        select.selectedIndex =
                            0;

                    }

                } else {

                    select.selectedIndex =
                        0;

                }

            } else {

                /*
                 * If nothing was previously selected,
                 * select the first model and persist it.
                 */
                select.selectedIndex =
                    0;

            }


            console.log(
                '[AI MODEL CONTROL] Dropdown rendered:',
                select.options.length,
                'options'
            );

        },


        /* =====================================================
           CREATE OPTION
           ===================================================== */

        createOption(model) {

            const option =
                document.createElement(
                    'option'
                );


            const key =
                model.key ||
                this.getModelKey(
                    model
                );


            const modelName =
                model.name ||
                model.label ||
                model.displayName ||
                this.getRawModelId(
                    model
                ) ||
                'Unknown model';


            const provider =
                model.provider ||
                this.getProvider(
                    model
                );


            option.value =
                String(key);


            /*
             * Keep the visible name clean while showing
             * provider information where useful.
             */
            let label =
                String(
                    modelName
                );


            /*
             * Mark free models clearly.
             */
            if (
                model.free === true
            ) {

                label +=
                    ' · Free';

            }


            option.textContent =
                label;


            /*
             * Store useful information on the option.
             */
            option.dataset.modelId =
                this.getRawModelId(
                    model
                );

            option.dataset.provider =
                provider || '';

            option.dataset.modelKey =
                key || '';


            return option;

        },


        /* =====================================================
           FORMAT PROVIDER NAME
           ===================================================== */

        formatProviderName(provider) {

            const value =
                String(
                    provider ||
                    ''
                ).toLowerCase();


            const names = {

                openrouter:
                    'OpenRouter',

                gemini:
                    'Google Gemini',

                groq:
                    'Groq',

                mistral:
                    'Mistral'

            };


            return (
                names[value] ||
                String(
                    provider ||
                    'Other'
                )
            );

        },


        /* =====================================================
           BIND EVENTS
           ===================================================== */

        bindEvents() {

            if (this.eventsBound) {
                return;
            }

            this.eventsBound = true;


            if (
                this.elements.modelSelect
            ) {

                this.elements.modelSelect
                    .addEventListener(
                        'change',
                        async event => {

                            await this.selectModel(
                                event.target.value
                            );

                        }
                    );

            }


            if (
                this.elements.modeSelect
            ) {

                this.elements.modeSelect
                    .addEventListener(
                        'change',
                        async event => {

                            await this.selectMode(
                                event.target.value
                            );

                        }
                    );

            }

        },


        /* =====================================================
           SELECT MODEL
           ===================================================== */

        async selectModel(modelKey) {

            if (!modelKey) {
                return;
            }


            console.log(
                '[AI MODEL CONTROL] User selected model key:',
                modelKey
            );


            const previousModel =
                this.currentModel;


            try {

                this.setStatus(
                    'Switching AI model...'
                );


                if (
                    !window.year3?.ai ||
                    typeof window.year3.ai.setModel !==
                        'function'
                ) {

                    throw new Error(
                        'AI model selection API unavailable.'
                    );

                }


                /*
                 * Find the exact provider-qualified model.
                 */
                const found =
                    this.models.find(
                        model =>
                            String(
                                model.key ||
                                this.getModelKey(
                                    model
                                )
                            ) ===
                            String(modelKey)
                    );


                if (!found) {

                    throw new Error(
                        `Model not found: ${modelKey}`
                    );

                }


                const resolvedKey =
                    found.key ||
                    this.getModelKey(
                        found
                    );


                /*
                 * IMPORTANT:
                 *
                 * Send provider-qualified key to backend.
                 *
                 * This prevents:
                 *
                 * openrouter:gpt-oss-120b
                 *
                 * from being confused with:
                 *
                 * groq:gpt-oss-120b
                 */
                const result =
                    await window.year3.ai.setModel(
                        resolvedKey
                    );


                console.log(
                    '[AI MODEL CONTROL] setModel result:',
                    result
                );


                this.currentModel =
                    found;


                this.loading =
                    false;


                this.updateUI();


                if (
                    this.elements.modelSelect
                ) {

                    this.elements.modelSelect.disabled =
                        false;

                    this.elements.modelSelect.value =
                        String(
                            resolvedKey
                        );

                }


                this.setStatus(
                    `Using ${
                        found.name ||
                        found.rawModelId ||
                        found.id
                    }`
                );


                console.log(
                    '[AI MODEL CONTROL] Model successfully selected:',
                    found
                );


            } catch (error) {

                console.error(
                    '[AI MODEL CONTROL] Model selection failed:',
                    error
                );


                this.currentModel =
                    previousModel;


                this.loading =
                    false;


                this.updateUI();


                this.setStatus(
                    `Model selection failed: ${
                        error?.message ||
                        error
                    }`
                );

            }

        },


        /* =====================================================
           SELECT MODE
           ===================================================== */

        async selectMode(mode) {

            if (!mode) {
                return;
            }


            console.log(
                '[AI MODEL CONTROL] User selected mode:',
                mode
            );


            const previousMode =
                this.currentMode;


            try {

                this.setStatus(
                    'Switching AI mode...'
                );


                if (
                    !window.year3?.ai ||
                    typeof window.year3.ai.setMode !==
                        'function'
                ) {

                    throw new Error(
                        'AI mode selection API unavailable.'
                    );

                }


                const result =
                    await window.year3.ai.setMode(
                        mode
                    );


                console.log(
                    '[AI MODEL CONTROL] setMode result:',
                    result
                );


                this.currentMode =
                    mode;


                this.loading =
                    false;


                this.updateUI();


                this.setStatus(
                    `Mode: ${mode}`
                );


                console.log(
                    '[AI MODEL CONTROL] Mode successfully selected:',
                    mode
                );


            } catch (error) {

                console.error(
                    '[AI MODEL CONTROL] Mode selection failed:',
                    error
                );


                this.currentMode =
                    previousMode;


                this.loading =
                    false;


                this.updateUI();


                this.setStatus(
                    `Mode selection failed: ${
                        error?.message ||
                        error
                    }`
                );

            }

        },


        /* =====================================================
           REFRESH CURRENT MODEL
           ===================================================== */

        async refreshCurrentModel() {

            try {

                if (
                    window.year3?.ai &&
                    typeof window.year3.ai
                        .getActiveModel ===
                    'function'
                ) {

                    this.currentModel =
                        await window.year3.ai
                            .getActiveModel();

                }


                if (
                    window.year3?.ai &&
                    typeof window.year3.ai
                        .getMode ===
                    'function'
                ) {

                    this.currentMode =
                        await window.year3.ai
                            .getMode();

                }


                this.loading =
                    false;


                this.updateUI();

            } catch (error) {

                console.error(
                    '[AI MODEL CONTROL] Refresh failed:',
                    error
                );

            }

        },


        /* =====================================================
           GET CURRENT MODEL
           ===================================================== */

        getCurrentModel() {

            return this.resolveCurrentModel();

        },


        /* =====================================================
           UPDATE UI
           ===================================================== */

        updateUI() {

            if (this.loading) {
                return;
            }


            const model =
                this.getCurrentModel();


            /* =================================================
               CURRENT MODEL NAME
               ================================================= */

            if (
                this.elements.currentModel
            ) {

                this.elements.currentModel.textContent =
                    model?.name ||
                    model?.label ||
                    model?.displayName ||
                    model?.rawModelId ||
                    model?.id ||
                    'No model selected';

            }


            /* =================================================
               CURRENT MODEL META
               ================================================= */

            if (
                this.elements.currentMeta
            ) {

                const provider =
                    this.formatProviderName(
                        model?.provider ||
                        this.getProvider(
                            model
                        )
                    );

                const rawId =
                    model?.rawModelId ||
                    this.getRawModelId(
                        model
                    ) ||
                    model?.id ||
                    '';

                if (
                    provider &&
                    rawId
                ) {

                    this.elements.currentMeta.textContent =
                        `${provider} · ${rawId}`;

                } else if (
                    provider
                ) {

                    this.elements.currentMeta.textContent =
                        provider;

                } else {

                    this.elements.currentMeta.textContent =
                        rawId ||
                        'Model information unavailable';

                }

            }


            /* =================================================
               MODEL SELECT
               ================================================= */

            if (
                this.elements.modelSelect
            ) {

                const modelKey =
                    model?.key ||
                    this.getModelKey(
                        model
                    );


                if (modelKey) {

                    const exists =
                        Array.from(
                            this.elements
                                .modelSelect
                                .options
                        ).some(
                            option =>
                                option.value ===
                                String(
                                    modelKey
                                )
                        );


                    if (exists) {

                        this.elements
                            .modelSelect
                            .value =
                            String(
                                modelKey
                            );

                    }

                }

            }


            /* =================================================
               MODE
               ================================================= */

            if (
                this.elements.modeSelect
            ) {

                this.elements.modeSelect.value =
                    this.currentMode ||
                    'primary';

            }


            /* =================================================
               CATEGORY
               ================================================= */

            if (
                this.elements.category
            ) {

                this.elements.category.textContent =
                    model?.category ||
                    model?.type ||
                    '—';

            }


            /* =================================================
               PROVIDER
               ================================================= */

            if (
                this.elements.provider
            ) {

                this.elements.provider.textContent =
                    this.formatProviderName(
                        model?.provider ||
                        this.getProvider(
                            model
                        )
                    ) ||
                    '—';

            }


            /* =================================================
               ACCESS
               ================================================= */

            if (
                this.elements.access
            ) {

                if (
                    model?.free === true
                ) {

                    this.elements.access.textContent =
                        'Free';

                } else if (
                    model?.temporary === true
                ) {

                    this.elements.access.textContent =
                        'Temporary';

                } else if (
                    model?.paid === false
                ) {

                    this.elements.access.textContent =
                        'Free';

                } else {

                    this.elements.access.textContent =
                        'Paid';

                }

            }


            /* =================================================
               DESCRIPTION
               ================================================= */

            if (
                this.elements.description
            ) {

                let description =
                    model?.description ||
                    'Select the model used for this study session.';


                if (
                    model?.provider
                ) {

                    description =
                        `${description} Provider: ${
                            this.formatProviderName(
                                model.provider
                            )
                        }.`;

                }


                this.elements.description.textContent =
                    description;

            }


            this.updateModeUI();

        },


        /* =====================================================
           MODE UI
           ===================================================== */

        updateModeUI() {

            if (
                !this.elements.modeSelect
            ) {

                return;

            }


            this.elements.modeSelect.value =
                this.currentMode ||
                'primary';

        },


        /* =====================================================
           STATUS
           ===================================================== */

        setStatus(message) {

            if (
                this.elements.status
            ) {

                this.elements.status.textContent =
                    message;

            }

            console.log(
                '[AI MODEL CONTROL]',
                message
            );

        }

    };


    /* =========================================================
       AI RESPONSE RENDERER
       Converts AI Markdown into a polished study presentation
       ========================================================= */

    function renderAIResponse(markdown) {

        if (
            markdown === null ||
            markdown === undefined
        ) {

            return '';

        }


        const text =
            String(markdown)
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n');


        const lines =
            text.split('\n');


        let html = '';

        let i = 0;


        while (i < lines.length) {

            const line =
                lines[i];

            const trimmed =
                line.trim();


            /* -------------------------------------------------
               IGNORE EMPTY LINES
               ------------------------------------------------- */

            if (!trimmed) {

                i++;

                continue;

            }


            /* -------------------------------------------------
               HORIZONTAL RULES
               ------------------------------------------------- */

            if (
                /^\s*(---+|\*\*\*+|___+)\s*$/.test(line)
            ) {

                i++;

                continue;

            }


            /* -------------------------------------------------
               CODE BLOCK
               ------------------------------------------------- */

            if (
                trimmed.startsWith('```')
            ) {

                const language =
                    trimmed
                        .replace(/^```/, '')
                        .trim();

                const codeLines = [];

                i++;

                while (
                    i < lines.length &&
                    !lines[i]
                        .trim()
                        .startsWith('```')
                ) {

                    codeLines.push(
                        lines[i]
                    );

                    i++;

                }


                if (i < lines.length) {
                    i++;
                }


                html += `
                    <div class="ai-response-code">

                        ${
                            language
                                ? `
                                    <div class="ai-code-language">
                                        ${escapeHTML(language)}
                                    </div>
                                  `
                                : ''
                        }

                        <pre><code>${escapeHTML(
                            codeLines.join('\n')
                        )}</code></pre>

                    </div>
                `;

                continue;

            }


            /* -------------------------------------------------
               H1
               ------------------------------------------------- */

            if (
                /^#\s+/.test(trimmed)
            ) {

                const title =
                    trimmed.replace(
                        /^#\s+/,
                        ''
                    );


                html += `
                    <div class="ai-response-title-block">

                        <h1 class="ai-response-title">
                            ${renderAIInline(title)}
                        </h1>

                    </div>
                `;

                i++;

                continue;

            }


            /* -------------------------------------------------
               H2
               ------------------------------------------------- */

            if (
                /^##\s+/.test(trimmed)
            ) {

                const heading =
                    trimmed.replace(
                        /^##\s+/,
                        ''
                    );


                html += `
                    <div class="ai-response-section">

                        <h2 class="ai-response-heading">
                            ${renderAIInline(heading)}
                        </h2>

                    </div>
                `;

                i++;

                continue;

            }


            /* -------------------------------------------------
               H3
               ------------------------------------------------- */

            if (
                /^###\s+/.test(trimmed)
            ) {

                const heading =
                    trimmed.replace(
                        /^###\s+/,
                        ''
                    );


                html += `
                    <h3 class="ai-response-subheading">
                        ${renderAIInline(heading)}
                    </h3>
                `;

                i++;

                continue;

            }


            /* -------------------------------------------------
               MARKDOWN TABLE
               ------------------------------------------------- */

            if (
                line.includes('|') &&
                i + 1 < lines.length &&
                /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/
                    .test(lines[i + 1])
            ) {

                const header =
                    splitAIResponseTableRow(
                        lines[i]
                    );


                i += 2;

                const rows = [];


                while (
                    i < lines.length &&
                    lines[i].includes('|') &&
                    lines[i].trim() !== ''
                ) {

                    rows.push(
                        splitAIResponseTableRow(
                            lines[i]
                        )
                    );

                    i++;

                }


                html += `
                    <div class="ai-response-table-container">

                        <table class="ai-response-table">

                            <thead>
                                <tr>

                                    ${header
                                        .map(cell => `
                                            <th>
                                                ${renderAIInline(cell)}
                                            </th>
                                        `)
                                        .join('')}

                                </tr>
                            </thead>

                            <tbody>

                                ${rows
                                    .map(row => `
                                        <tr>

                                            ${row
                                                .map(cell => `
                                                    <td>
                                                        ${renderAIInline(cell)}
                                                    </td>
                                                `)
                                                .join('')}

                                        </tr>
                                    `)
                                    .join('')}

                            </tbody>

                        </table>

                    </div>
                `;

                continue;

            }


            /* -------------------------------------------------
               BLOCKQUOTE / CALLOUT
               ------------------------------------------------- */

            if (
                trimmed.startsWith('>')
            ) {

                const quoteLines = [];


                while (
                    i < lines.length &&
                    lines[i]
                        .trim()
                        .startsWith('>')
                ) {

                    quoteLines.push(
                        lines[i]
                            .trim()
                            .replace(
                                /^>\s?/,
                                ''
                            )
                    );

                    i++;

                }


                const quoteText =
                    quoteLines.join(' ');


                let type =
                    'info';


                const lower =
                    quoteText.toLowerCase();


                if (
                    lower.includes('exam') ||
                    lower.includes('high yield') ||
                    lower.includes('remember')
                ) {

                    type = 'exam';

                } else if (
                    lower.includes('warning') ||
                    lower.includes('important')
                ) {

                    type = 'warning';

                } else if (
                    lower.includes('trap') ||
                    lower.includes('pitfall')
                ) {

                    type = 'trap';

                }


                html += `
                    <div class="ai-response-callout ai-callout-${type}">

                        <span class="ai-callout-label">
                            ${getAICalloutTitle(type)}
                        </span>

                        <span class="ai-callout-content">
                            ${renderAIInline(quoteText)}
                        </span>

                    </div>
                `;

                continue;

            }


            /* -------------------------------------------------
               ORDERED LIST
               ------------------------------------------------- */

            if (
                /^\s*\d+\.\s+/.test(line)
            ) {

                const items = [];


                while (
                    i < lines.length &&
                    /^\s*\d+\.\s+/.test(lines[i])
                ) {

                    items.push(
                        lines[i].replace(
                            /^\s*\d+\.\s+/,
                            ''
                        )
                    );

                    i++;

                }


                html += `
                    <ol class="ai-response-list ai-response-ordered-list">

                        ${items
                            .map(item => `
                                <li>
                                    ${renderAIInline(item)}
                                </li>
                            `)
                            .join('')}

                    </ol>
                `;

                continue;

            }


            /* -------------------------------------------------
               UNORDERED LIST
               ------------------------------------------------- */

            if (
                /^\s*[-*+]\s+/.test(line)
            ) {

                const items = [];


                while (
                    i < lines.length &&
                    /^\s*[-*+]\s+/.test(lines[i])
                ) {

                    items.push(
                        lines[i].replace(
                            /^\s*[-*+]\s+/,
                            ''
                        )
                    );

                    i++;

                }


                html += `
                    <ul class="ai-response-list">

                        ${items
                            .map(item => `
                                <li>
                                    ${renderAIInline(item)}
                                </li>
                            `)
                            .join('')}

                    </ul>
                `;

                continue;

            }


            /* =================================================
               NORMAL PROSE
               ================================================= */

            const paragraphLines = [];


            while (i < lines.length) {

                const current =
                    lines[i];

                const currentTrimmed =
                    current.trim();


                if (!currentTrimmed) {

                    let nextIndex =
                        i + 1;


                    while (
                        nextIndex < lines.length &&
                        !lines[nextIndex].trim()
                    ) {

                        nextIndex++;

                    }


                    if (
                        nextIndex >= lines.length
                    ) {

                        i =
                            nextIndex;

                        break;

                    }


                    const next =
                        lines[nextIndex].trim();


                    if (
                        /^#{1,3}\s+/.test(next) ||
                        next.startsWith('>') ||
                        /^\s*[-*+]\s+/.test(
                            lines[nextIndex]
                        ) ||
                        /^\s*\d+\.\s+/.test(
                            lines[nextIndex]
                        ) ||
                        (
                            lines[nextIndex].includes('|') &&
                            nextIndex + 1 < lines.length &&
                            /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/
                                .test(
                                    lines[nextIndex + 1]
                                )
                        ) ||
                        next.startsWith('```')
                    ) {

                        i =
                            nextIndex;

                        break;

                    }


                    i =
                        nextIndex;

                    continue;

                }


                if (
                    /^#{1,3}\s+/.test(currentTrimmed) ||
                    currentTrimmed.startsWith('>') ||
                    /^\s*[-*+]\s+/.test(current) ||
                    /^\s*\d+\.\s+/.test(current) ||
                    currentTrimmed.startsWith('```')
                ) {

                    break;

                }


                if (
                    current.includes('|') &&
                    i + 1 < lines.length &&
                    /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/
                        .test(lines[i + 1])
                ) {

                    break;

                }


                paragraphLines.push(
                    currentTrimmed
                );

                i++;

            }


            if (
                paragraphLines.length > 0
            ) {

                html += `
                    <p class="ai-response-paragraph">
                        ${renderAIInline(
                            paragraphLines.join(' ')
                        )}
                    </p>
                `;

            }

        }


        return `
            <div class="ai-response">
                ${html}
            </div>
        `;

    }


    /* =========================================================
       INLINE MARKDOWN
       ========================================================= */

    function renderAIInline(text) {

        let value =
            escapeHTML(
                String(text)
            );


        /* Inline code */

        value =
            value.replace(
                /`([^`]+)`/g,
                '<code class="ai-inline-code">$1</code>'
            );


        /* Bold */

        value =
            value.replace(
                /\*\*(.+?)\*\*/g,
                '<strong>$1</strong>'
            );


        /* Italic */

        value =
            value.replace(
                /(?<!\*)\*([^*]+)\*(?!\*)/g,
                '<em>$1</em>'
            );


        /* Links */

        value =
            value.replace(
                /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
                '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
            );


        return value;

    }


    /* =========================================================
       TABLE ROW PARSER
       ========================================================= */

    function splitAIResponseTableRow(line) {

        let value =
            line.trim();


        if (
            value.startsWith('|')
        ) {

            value =
                value.substring(1);

        }


        if (
            value.endsWith('|')
        ) {

            value =
                value.substring(
                    0,
                    value.length - 1
                );

        }


        return value
            .split('|')
            .map(
                cell => cell.trim()
            );

    }


    /* =========================================================
       CALLOUT LABELS
       ========================================================= */

    function getAICalloutTitle(type) {

        if (
            type === 'exam'
        ) {

            return 'EXAM PEARL';

        }


        if (
            type === 'warning'
        ) {

            return 'IMPORTANT';

        }


        if (
            type === 'trap'
        ) {

            return 'COMMON TRAP';

        }


        return 'KEY POINT';

    }


    /* =========================================================
       HTML ESCAPE
       ========================================================= */

    function escapeHTML(value) {

        return String(value)

            .replace(
                /&/g,
                '&amp;'
            )

            .replace(
                /</g,
                '&lt;'
            )

            .replace(
                />/g,
                '&gt;'
            )

            .replace(
                /"/g,
                '&quot;'
            )

            .replace(
                /'/g,
                '&#039;'
            );

    }


    /* =========================================================
       EXPOSE GLOBALLY
       ========================================================= */

    window.AIModule =
        AIModule;

    window.AIModelControl =
        AIModelControl;


    /* =========================================================
       START
       ========================================================= */

    AIModule.init();

    AIModelControl.init();

})();