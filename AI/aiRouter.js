'use strict';

/*
 * ============================================================
 * YEAR 3 STUDY OS
 * AI ROUTER
 * ============================================================
 *
 * CENTRAL AI ROUTING ENGINE
 *
 * PROVIDERS
 *
 *   OpenRouter
 *       ↓
 *   Gemini
 *       ↓
 *   Groq
 *       ↓
 *   Mistral
 *       ↓
 *   Local AI / future providers
 *
 *
 * IMPORTANT:
 *
 * - OpenRouter implementation remains unchanged.
 * - Gemini implementation remains unchanged.
 * - Groq uses the generic OpenAI-compatible client.
 * - Mistral uses the generic OpenAI-compatible client.
 *
 * Existing frontend interface remains unchanged:
 *
 * window.year3.ai.ask({
 *     task,
 *     message,
 *     sessionId,
 *     context,
 *     options
 * })
 *
 * ============================================================
 */

const {
    validateTask
} = require('./taskManager');


const {
    getPrompt
} = require('./promptManager');


const routerRegistry =
    require('./openrouter/routerRegistry');


/*
 * ------------------------------------------------------------
 * AI TASK POLICY
 * ------------------------------------------------------------
 *
 * Centralized generation settings for Year 3 Study OS.
 *
 * These are defaults only.
 *
 * Explicit values supplied through:
 *
 *     options.maxTokens
 *     options.reasoning
 *
 * always take precedence.
 *
 * This keeps task-specific behavior centralized while preserving
 * compatibility with existing modules and frontend requests.
 *
 * ------------------------------------------------------------
 */

const AI_TASK_POLICY = Object.freeze({

    assistant: Object.freeze({
        maxTokens: 1024,
        reasoning: Object.freeze({
            effort: 'low'
        })
    }),

    explain: Object.freeze({
        maxTokens: 2048,
        reasoning: Object.freeze({
            effort: 'low'
        })
    }),

    mcq: Object.freeze({
        maxTokens: 2048,
        reasoning: Object.freeze({
            effort: 'low'
        })
    }),

    flashcards: Object.freeze({
        maxTokens: 2048,
        reasoning: Object.freeze({
            effort: 'low'
        })
    }),

    essay: Object.freeze({
        maxTokens: 4096,
        reasoning: Object.freeze({
            effort: 'medium'
        })
    }),

    spotter: Object.freeze({
        maxTokens: 2048,
        reasoning: Object.freeze({
            effort: 'low'
        })
    })

});


/*
 * ------------------------------------------------------------
 * RESOLVE TASK OPTIONS
 * ------------------------------------------------------------
 *
 * Applies the centralized task policy while preserving explicit
 * caller overrides.
 *
 * Priority:
 *
 *     explicit options
 *          ↓
 *     task policy
 *          ↓
 *     assistant policy
 *
 * ------------------------------------------------------------
 */

function resolveTaskOptions(
    task,
    options = {}
) {

    const policy =
        AI_TASK_POLICY[task] ||
        AI_TASK_POLICY.assistant;


    return {

        ...options,

        maxTokens:
            options.maxTokens ??
            policy.maxTokens,

        reasoning:
            options.reasoning ??
            policy.reasoning

    };
}


/*
 * ------------------------------------------------------------
 * EXISTING PROVIDER CLIENTS
 * ------------------------------------------------------------
 *
 * DO NOT replace these.
 */

const OpenRouterClient =
    require('./openrouter/openRouterClient');


const GeminiClient =
    require('./providers/gemini');


/*
 * ------------------------------------------------------------
 * GENERIC OPENAI-COMPATIBLE CLIENT
 * ------------------------------------------------------------
 *
 * Used for:
 *
 *     Groq
 *     Mistral
 *
 * The client itself resolves the appropriate:
 *
 *     API key
 *     base URL
 *
 * from the provider name.
 */

const OpenAICompatibleClient =
    require('./providers/client');


class AIRouter {

    constructor({
        modelManager,
        client,
        fallbackManager,
        rateLimitManager,
        contextManager,
        memoryManager,
        responseManager
    }) {

        // -------------------------------------------------------
        // MODEL MANAGER
        // -------------------------------------------------------

        this.modelManager =
            modelManager;


        // -------------------------------------------------------
        // EXISTING OPENROUTER CLIENT
        // -------------------------------------------------------
        //
        // Preserve the injected working client.
        //

        this.client =
            client ||
            new OpenRouterClient();


        // -------------------------------------------------------
        // EXISTING GEMINI CLIENT
        // -------------------------------------------------------
        //
        // Gemini remains completely separate.
        //

        this.geminiClient =
            new GeminiClient();


        // -------------------------------------------------------
        // NEW PROVIDER CLIENTS
        // -------------------------------------------------------
        //
        // Groq and Mistral use the generic OpenAI-compatible
        // client.
        //

        this.providerClients = {

            groq:
                new OpenAICompatibleClient({
                    provider: 'groq'
                }),

            mistral:
                new OpenAICompatibleClient({
                    provider: 'mistral'
                })

        };


        // -------------------------------------------------------
        // FALLBACK SYSTEM
        // -------------------------------------------------------

        this.fallbackManager =
            fallbackManager;


        // -------------------------------------------------------
        // RATE LIMIT MANAGER
        // -------------------------------------------------------

        this.rateLimitManager =
            rateLimitManager;


        // -------------------------------------------------------
        // CONTEXT MANAGER
        // -------------------------------------------------------

        this.contextManager =
            contextManager;


        // -------------------------------------------------------
        // MEMORY MANAGER
        // -------------------------------------------------------

        this.memoryManager =
            memoryManager;


        // -------------------------------------------------------
        // RESPONSE MANAGER
        // -------------------------------------------------------

        this.responseManager =
            responseManager;
    }


    // ============================================================
    // MAIN ENTRY POINT
    // ============================================================

    async run({
        task = 'assistant',
        message,
        context = {},
        sessionId = 'default',
        options = {}
    } = {}) {

        /*
         * Validate the requested task.
         */

        validateTask(task);


        /*
         * Apply the centralized task policy.
         *
         * Explicit caller values always win.
         */

        options =
            resolveTaskOptions(
                task,
                options
            );


        if (!message) {

            throw new Error(
                'AI message is required.'
            );
        }


        // --------------------------------------------------------
        // BUILD SYSTEM PROMPT
        // --------------------------------------------------------

        const system =
            getPrompt(task);


        // --------------------------------------------------------
        // BUILD STUDY CONTEXT
        // --------------------------------------------------------

        const studyContext =
            this.contextManager.build(
                context
            );


        // --------------------------------------------------------
        // LOAD MEMORY
        // --------------------------------------------------------

        const history =
            this.memoryManager.get(
                sessionId
            );


        // --------------------------------------------------------
        // BUILD MESSAGES
        // --------------------------------------------------------

        const messages = [

            {
                role: 'system',
                content: system
            },

            ...history,

            ...(studyContext
                ? [
                    {
                        role: 'system',
                        content: studyContext
                    }
                ]
                : []),

            {
                role: 'user',
                content: message
            }

        ];


        // --------------------------------------------------------
        // RESOLVE ROUTING
        // --------------------------------------------------------

        const routing =
            this.resolveRouting(
                options
            );


        let result;


        // --------------------------------------------------------
        // AUTOMATIC OPENROUTER ROUTER
        // --------------------------------------------------------

        if (
            routing.type ===
            'router'
        ) {

            result =
                await this.executeAutomaticRouter(
                    routing.router,
                    messages,
                    options
                );
        }


        // --------------------------------------------------------
        // PROVIDER-AWARE RESILIENCE
        // --------------------------------------------------------

        else if (
            routing.type ===
            'provider'
        ) {

            result =
                await this.executeProviderChain(
                    messages,
                    options
                );
        }


        // --------------------------------------------------------
        // EXISTING MODEL/FALLBACK ROUTING
        // --------------------------------------------------------

        else {

            result =
                await this.executeModelChain(
                    routing,
                    messages,
                    options
                );
        }


        // --------------------------------------------------------
        // SAVE MEMORY
        // --------------------------------------------------------

        this.memoryManager.add(
            sessionId,
            {
                role: 'user',
                content: message
            }
        );


        this.memoryManager.add(
            sessionId,
            {
                role: 'assistant',
                content: result.text
            }
        );


        return result;
    }


    // ============================================================
    // ROUTING RESOLUTION
    // ============================================================

    resolveRouting(options = {}) {

        // --------------------------------------------------------
        // 1. EXPLICIT ROUTER
        // --------------------------------------------------------

        const routerId =
            options.routerId ||
            options.router;


        if (routerId) {

            const router =
                routerRegistry.resolveRouter(
                    routerId
                );


            return {

                type:
                    'router',

                router
            };
        }


        // --------------------------------------------------------
        // 2. EXPLICIT MODEL
        // --------------------------------------------------------

        const modelId =
            options.modelId ||
            options.model;


        if (modelId) {

            const model =
                this.modelManager.resolve(
                    modelId
                );


            if (
                this.modelManager.isAutomatic(
                    model.id
                )
            ) {

                const router =
                    routerRegistry.resolveRouter(
                        model.id
                    );


                return {

                    type:
                        'router',

                    router
                };
            }


            return {

                type:
                    'model',

                model
            };
        }


        // --------------------------------------------------------
        // 3. EXPLICIT MODE
        // --------------------------------------------------------

        const mode =
            String(
                options.mode ||
                ''
            )
            .trim()
            .toLowerCase();


        // --------------------------------------------------------
        // PROVIDER RESILIENCE MODE
        // --------------------------------------------------------

        if (
            mode === 'resilient' ||
            mode === 'providers' ||
            mode === 'provider'
        ) {

            return {

                type:
                    'provider'
            };
        }


        // --------------------------------------------------------
        // AUTO ROUTER
        // --------------------------------------------------------

        if (
            mode === 'auto'
        ) {

            return {

                type:
                    'router',

                router:
                    routerRegistry
                        .getDefaultRouter()
            };
        }


        // --------------------------------------------------------
        // FREE MODELS ROUTER
        // --------------------------------------------------------

        if (
            mode === 'free'
        ) {

            return {

                type:
                    'router',

                router:
                    routerRegistry
                        .getDefaultFreeRouter()
            };
        }


        // --------------------------------------------------------
        // FALLBACK ONLY
        // --------------------------------------------------------

        if (
            mode === 'fallback'
        ) {

            return {

                type:
                    'fallback'
            };
        }


        // --------------------------------------------------------
        // CUSTOM MODEL LIST
        // --------------------------------------------------------

        if (
            Array.isArray(
                options.models
            ) &&
            options.models.length > 0
        ) {

            return {

                type:
                    'custom',

                models:
                    options.models
            };
        }


        // --------------------------------------------------------
        // DEFAULT
        // --------------------------------------------------------
        //
        // Normal AI requests use the resilient provider chain.
        //

        return {

            type:
                'provider'
        };
    }


    // ============================================================
    // GET PROVIDER CLIENT
    // ============================================================
    //
    // Central provider → client resolver.
    //
    // ============================================================

    getProviderClient(
        providerId
    ) {

        const provider =
            String(
                providerId ||
                ''
            )
            .trim()
            .toLowerCase();


        // --------------------------------------------------------
        // OPENROUTER
        // --------------------------------------------------------

        if (
            provider ===
            'openrouter'
        ) {

            return this.client;
        }


        // --------------------------------------------------------
        // GEMINI
        // --------------------------------------------------------

        if (
            provider ===
            'gemini'
        ) {

            return this.geminiClient;
        }


        // --------------------------------------------------------
        // GROQ / MISTRAL
        // --------------------------------------------------------

        if (
            this.providerClients &&
            this.providerClients[provider]
        ) {

            return this.providerClients[
                provider
            ];
        }


        return null;
    }


    // ============================================================
    // PROVIDER CLIENT VALIDATION
    // ============================================================

    hasProviderClient(
        providerId
    ) {

        return Boolean(
            this.getProviderClient(
                providerId
            )
        );
    }


    // ============================================================
    // NORMALIZE PROVIDER RESPONSE
    // ============================================================
    //
    // OpenAI-compatible clients already return:
    //
    // {
    //     text,
    //     content,
    //     model,
    //     provider,
    //     raw
    // }
    //
    // OpenRouter / legacy clients may return the raw API shape.
    //
    // This helper safely supports both.
    //
    // ============================================================

    normalizeProviderResponse(response) {

        if (!response) {

            return {

                text: '',
                model: null,
                usage: null,
                raw: response || null

            };
        }


        // --------------------------------------------------------
        // ALREADY NORMALIZED RESPONSE
        // --------------------------------------------------------

        if (
            typeof response.text === 'string' &&
            (
                response.provider ||
                response.content !== undefined ||
                response.raw !== undefined
            )
        ) {

            return {

                text:
                    response.text,

                model:
                    response.model || null,

                usage:
                    response.usage || null,

                raw:
                    response.raw || response

            };
        }


        // --------------------------------------------------------
        // RAW API RESPONSE
        // --------------------------------------------------------

        return this.responseManager.normalize(
            response
        );
    }


    // ============================================================
    // PROVIDER-AWARE EXECUTION
    // ============================================================

    async executeProviderChain(
        messages,
        options = {}
    ) {

        let usedModel =
            null;


        const response =
            await this.fallbackManager
                .executeProviderChain(

                    async providerModel => {

                        if (
                            !providerModel ||
                            !providerModel.provider
                        ) {

                            throw new Error(
                                'Invalid provider model configuration.'
                            );
                        }


                        const provider =
                            String(
                                providerModel.provider
                            )
                            .trim()
                            .toLowerCase();


                        const client =
                            this.getProviderClient(
                                provider
                            );


                        if (!client) {

                            throw new Error(
                                `Provider client not yet connected: ${provider}`
                            );
                        }


                        usedModel =
                            providerModel;


                        // ------------------------------------------------
                        // RATE LIMIT
                        // ------------------------------------------------

                        await this.rateLimitManager.wait();


                        // ------------------------------------------------
                        // PROVIDER REQUEST
                        // ------------------------------------------------

                        return client.complete({

                            model:
                                providerModel.id,

                            messages,

                            temperature:
                                options.temperature ??
                                0.2,

                            maxTokens:
                                options.maxTokens,

                            reasoning:
                                options.reasoning,

                            responseFormat:
                                options.responseFormat

                        });

                    },

                    {

                        includePrimary:
                            options.includePrimary !==
                            false,

                        includeFallbacks:
                            options.includeFallbacks !==
                            false

                    }
                );


        // --------------------------------------------------------
        // NORMALIZE RESPONSE
        // --------------------------------------------------------

        const result =
            this.normalizeProviderResponse(
                response
            );


        // --------------------------------------------------------
        // ACTUAL MODEL
        // --------------------------------------------------------

        const actualResponseModel =
            response?.model ||
            usedModel?.id ||
            null;


        const actualModel =
            usedModel ||
            (
                actualResponseModel
                    ? this.modelManager.get(
                        actualResponseModel
                    )
                    : null
            );


        // --------------------------------------------------------
        // RETURN
        // --------------------------------------------------------

        return {

            ...result,

            model:
                actualResponseModel,

            modelName:
                actualModel?.name ||
                actualResponseModel ||
                'Unknown',

            modelCategory:
                actualModel?.category ||
                'provider',

            provider:
                actualModel?.provider ||
                response?.provider ||
                'unknown',

            providerName:
                actualModel?.providerName ||
                this.getProviderName(
                    actualModel?.provider ||
                    response?.provider
                ),

            free:
                Boolean(
                    actualModel?.free
                ),

            temporary:
                Boolean(
                    actualModel?.temporary
                )
        };
    }


    // ============================================================
    // PROVIDER NAME
    // ============================================================

    getProviderName(
        providerId
    ) {

        const provider =
            String(
                providerId ||
                ''
            )
            .trim()
            .toLowerCase();


        const names = {

            openrouter:
                'OpenRouter',

            gemini:
                'Google Gemini',

            groq:
                'Groq',

            mistral:
                'Mistral',

            local:
                'Local AI'
        };


        return (
            names[provider] ||
            'AI Provider'
        );
    }


    // ============================================================
    // AUTOMATIC OPENROUTER ROUTER
    // ============================================================

    async executeAutomaticRouter(
        router,
        messages,
        options = {}
    ) {

        if (!router) {

            throw new Error(
                'No automatic AI router is available.'
            );
        }


        if (!router.enabled) {

            throw new Error(
                `AI router is disabled: ${router.id}`
            );
        }


        await this.rateLimitManager.wait();


        const response =
            await this.client.complete({

                model:
                    router.id,

                messages,

                temperature:
                    options.temperature ??
                    0.2,

                maxTokens:
                    options.maxTokens,

                reasoning:
                    options.reasoning,

                responseFormat:
                    options.responseFormat
            });


        const result =
            this.normalizeProviderResponse(
                response
            );


        const actualModel =
            response?.model ||
            null;


        return {

            ...result,

            model:
                actualModel ||
                router.id,

            modelName:
                actualModel ||
                router.name,

            modelCategory:
                'automatic',

            router:
                router.id,

            routerName:
                router.name,

            provider:
                router.provider,

            providerName:
                this.getProviderName(
                    router.provider
                ),

            free:
                Boolean(
                    router.free
                ),

            temporary:
                false
        };
    }


    // ============================================================
    // EXISTING MODEL EXECUTION
    // ============================================================
    //
    // This path is now provider-aware too.
    //
    // This is important for explicit model selection.
    //
    // Example:
    //
    // options.model =
    //     "groq:openai/gpt-oss-120b"
    //
    // or:
    //
    // options.model =
    //     "mistral:mistral-small-latest"
    //
    // ============================================================

    async executeModelChain(
        routing,
        messages,
        options = {}
    ) {

        let models;


        // --------------------------------------------------------
        // PRIMARY
        // --------------------------------------------------------

        if (
            routing.type ===
            'primary'
        ) {

            models =
                this.fallbackManager
                    .getModelIds();
        }


        // --------------------------------------------------------
        // FALLBACK ONLY
        // --------------------------------------------------------

        else if (
            routing.type ===
            'fallback'
        ) {

            models =
                this.fallbackManager
                    .getFallbackChain()
                    .map(
                        model =>
                            model.id
                    );
        }


        // --------------------------------------------------------
        // EXPLICIT MODEL
        // --------------------------------------------------------

        else if (
            routing.type ===
            'model'
        ) {

            /*
             * Preserve the actual model object when available.
             *
             * This prevents duplicate IDs across providers from
             * being confused with each other.
             */

            models = [
                routing.model
            ];
        }


        // --------------------------------------------------------
        // CUSTOM
        // --------------------------------------------------------

        else if (
            routing.type ===
            'custom'
        ) {

            models =
                routing.models;
        }


        else {

            throw new Error(
                'Unknown AI routing type.'
            );
        }


        // --------------------------------------------------------
        // NORMALIZE MODEL OBJECTS
        // --------------------------------------------------------

        const normalizedModels =
            models
                .map(
                    model =>
                        typeof model === 'string'
                            ? this.modelManager.get(
                                model
                            )
                            : model
                )
                .filter(
                    Boolean
                );


        // --------------------------------------------------------
        // DISABLE FALLBACKS
        // --------------------------------------------------------

        let executionModels =
            normalizedModels;


        if (
            options.includeFallbacks ===
            false
        ) {

            if (
                routing.type ===
                'primary'
            ) {

                executionModels =
                    this.fallbackManager
                        .getPrimaryChain();
            }
        }


        if (
            !Array.isArray(
                executionModels
            ) ||
            executionModels.length === 0
        ) {

            throw new Error(
                'No AI models are available for execution.'
            );
        }


        let usedModel =
            null;


        // --------------------------------------------------------
        // EXECUTE
        // --------------------------------------------------------

        const response =
            await this.fallbackManager.execute(

                async (
                    modelId,
                    model
                ) => {

                    /*
                     * Some legacy fallback paths may only provide
                     * the model ID.
                     */

                    const resolvedModel =
                        model ||
                        this.modelManager.get(
                            modelId
                        );


                    if (!resolvedModel) {

                        throw new Error(
                            `AI model could not be resolved: ${modelId}`
                        );
                    }


                    usedModel =
                        resolvedModel;


                    const provider =
                        String(
                            resolvedModel.provider ||
                            'openrouter'
                        )
                        .trim()
                        .toLowerCase();


                    const client =
                        this.getProviderClient(
                            provider
                        );


                    if (!client) {

                        throw new Error(
                            `Provider client not yet connected: ${provider}`
                        );
                    }


                    await this.rateLimitManager.wait();


                    return client.complete({

                        model:
                            resolvedModel.id,

                        messages,

                        temperature:
                            options.temperature ??
                            0.2,

                        maxTokens:
                            options.maxTokens,

                        reasoning:
                            options.reasoning,

                        responseFormat:
                            options.responseFormat
                    });

                },

                {

                    models:
                        executionModels.map(
                            model =>
                                typeof model === 'string'
                                    ? model
                                    : this.modelManager.getModelKey
                                        ? this.modelManager.getModelKey(
                                            model
                                        )
                                        : model.id
                        ),

                    includeFallbacks:
                        options.includeFallbacks !==
                        false
                }
            );


        // --------------------------------------------------------
        // NORMALIZE
        // --------------------------------------------------------

        const result =
            this.responseManager.normalize(
                response
            );


        // --------------------------------------------------------
        // ACTUAL MODEL
        // --------------------------------------------------------

        const actualResponseModel =
            response?.model ||
            usedModel?.id ||
            null;


        const actualModel =
            usedModel ||
            (
                actualResponseModel
                    ? this.modelManager.get(
                        actualResponseModel
                    )
                    : null
            );


        // --------------------------------------------------------
        // RETURN
        // --------------------------------------------------------

        return {

            ...result,

            model:
                actualResponseModel ||
                null,

            modelName:
                actualModel?.name ||
                actualResponseModel ||
                'Unknown',

            modelCategory:
                actualModel?.category ||
                'unknown',

            provider:
                actualModel?.provider ||
                response?.provider ||
                null,

            providerName:
                actualModel?.providerName ||
                this.getProviderName(
                    actualModel?.provider ||
                    response?.provider
                ),

            free:
                Boolean(
                    actualModel?.free
                ),

            temporary:
                Boolean(
                    actualModel?.temporary
                )
        };
    }


    // ============================================================
    // PROVIDER STATUS
    // ============================================================

    getProviderStatus() {

        const result = {};


        /*
         * OpenRouter
         */

        result.openrouter = {

            provider:
                'openrouter',

            configured:
                Boolean(
                    this.client &&
                    typeof this.client.isConfigured ===
                    'function' &&
                    this.client.isConfigured()
                )
        };


        /*
         * Gemini
         */

        result.gemini = {

            provider:
                'gemini',

            configured:
                Boolean(
                    this.geminiClient &&
                    typeof this.geminiClient.isConfigured ===
                    'function' &&
                    this.geminiClient.isConfigured()
                )
        };


        /*
         * Generic providers
         */

        for (
            const provider
            of [
                'groq',
                'mistral'
            ]
        ) {

            const client =
                this.providerClients[
                    provider
                ];


            result[provider] = {

                provider,

                configured:
                    Boolean(
                        client &&
                        typeof client.isConfigured ===
                        'function' &&
                        client.isConfigured()
                    )
            };
        }


        return result;
    }


    // ============================================================
    // CLEAR MEMORY
    // ============================================================

    clearMemory(
        sessionId = 'default'
    ) {

        this.memoryManager.clear(
            sessionId
        );
    }

}


module.exports =
    AIRouter;