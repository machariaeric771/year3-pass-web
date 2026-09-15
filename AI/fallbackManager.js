'use strict';

/*
 * ============================================================
 * YEAR 3 STUDY OS
 * PROVIDER-AWARE FALLBACK MANAGER
 * ============================================================
 *
 * HEALTH-AWARE EXECUTION
 *
 * OpenRouter
 *     ↓
 * GPT-OSS 120B
 *     ↓ failure → cooldown
 * GPT-OSS 20B
 *     ↓ failure → cooldown
 * Gemini 3.7 Flash
 *     ↓ failure → cooldown
 * Gemini 3.5 Flash-Lite
 *     ↓
 * Gemini 3.1 Flash-Lite
 *
 * ============================================================
 */

const providerRegistry =
    require('./providerRegistry');

const HealthManager =
    require('./healthManager');


class FallbackManager {

    constructor(
        modelManager,
        options = {}
    ) {

        this.modelManager =
            modelManager;


        /*
         * ----------------------------------------------------
         * AI HEALTH MANAGER
         * ----------------------------------------------------
         *
         * Optional injection is supported.
         *
         * This keeps the class compatible with the existing
         * constructor:
         *
         *     new FallbackManager(modelManager)
         *
         */

        this.healthManager =
            options.healthManager ||
            new HealthManager(
                options.health || {}
            );
    }


    // ========================================================
    // PROVIDER REGISTRY
    // ========================================================

    getProviderRegistry() {

        return providerRegistry;
    }


    // ========================================================
    // HEALTH MANAGER
    // ========================================================

    getHealthManager() {

        return this.healthManager;
    }


    // ========================================================
    // HEALTH STATUS
    // ========================================================

    getHealthStatus() {

        return this.healthManager
            .getSnapshot();
    }


    // ========================================================
    // EXISTING MODEL MANAGER CHAINS
    // ========================================================

    getPrimaryChain() {

        return this.modelManager
            .listPrimary()
            .filter(
                model =>
                    model &&
                    model.enabled
            );
    }


    getFallbackChain() {

        return this.modelManager
            .listFallback()
            .filter(
                model =>
                    model &&
                    model.enabled
            );
    }


    // ========================================================
    // PROVIDER PRIMARY CHAIN
    // ========================================================

    getProviderPrimaryChain() {

        return providerRegistry
            .listPrimaryModels()
            .filter(
                model =>
                    model &&
                    model.enabled
            )
            .sort(
                (a, b) =>
                    (a.priority || 999) -
                    (b.priority || 999)
            );
    }


    // ========================================================
    // PROVIDER FALLBACK CHAIN
    // ========================================================

    getProviderFallbackChain() {

        return providerRegistry
            .listFallbackModels()
            .filter(
                model =>
                    model &&
                    model.enabled
            )
            .sort(
                (a, b) =>
                    (a.priority || 999) -
                    (b.priority || 999)
            );
    }


    // ========================================================
    // COMPLETE PROVIDER CHAIN
    // ========================================================

    getProviderChain() {

        return [

            ...this.getProviderPrimaryChain(),

            ...this.getProviderFallbackChain()

        ];
    }


    // ========================================================
    // HEALTH FILTER
    // ========================================================
    //
    // Removes models that are currently cooling down.
    //
    // IMPORTANT:
    //
    // If EVERY model is cooling down, we return the complete
    // chain rather than dead-ending the AI system.
    //
    // This means:
    //
    // "prefer healthy models"
    //
    // rather than:
    //
    // "AI unavailable because every model is temporarily
    // marked unhealthy."
    //
    // ========================================================

    filterHealthyProviderChain(
        chain
    ) {

        if (
            !Array.isArray(chain) ||
            chain.length === 0
        ) {

            return [];
        }


        const healthy =
            chain.filter(
                model =>
                    this.healthManager
                        .isAvailable(
                            model.provider,
                            model.id
                        )
            );


        /*
         * ----------------------------------------------------
         * NORMAL CASE
         * ----------------------------------------------------
         */

        if (
            healthy.length > 0
        ) {

            return healthy;
        }


        /*
         * ----------------------------------------------------
         * ALL MODELS COOLING DOWN
         * ----------------------------------------------------
         *
         * Do not completely disable the AI system.
         *
         * Retry the original ordered chain.
         */

        console.warn(
            '[AI HEALTH] All configured models are currently in cooldown. Retrying the full chain.'
        );


        return chain;
    }


    // ========================================================
    // PROVIDER MODEL IDS
    // ========================================================

    getProviderModelIds() {

        return this.getProviderChain()
            .map(
                model =>
                    model.id
            );
    }


    // ========================================================
    // FIND PROVIDER MODEL BY KEY
    // ========================================================

    getProviderModelByKey(
        key
    ) {

        return providerRegistry
            .findModelByKey(
                key
            );
    }


    // ========================================================
    // FIND PROVIDER MODEL
    // ========================================================

    getProviderModel(
        providerId,
        modelId
    ) {

        return providerRegistry
            .findModel(
                providerId,
                modelId
            );
    }


    // ========================================================
    // FIND PROVIDER FOR MODEL
    // ========================================================

    getProviderForModel(
        providerId,
        modelId
    ) {

        const model =
            this.getProviderModel(
                providerId,
                modelId
            );


        return model
            ? model.provider
            : null;
    }


    // ========================================================
    // LEGACY COMPLETE MODEL CHAIN
    // ========================================================

    getChain(
        selectedModelId = null
    ) {

        const primary =
            this.getPrimaryChain();

        const fallback =
            this.getFallbackChain();


        if (
            selectedModelId
        ) {

            const selectedPrimaryIndex =
                primary.findIndex(
                    model =>
                        model.id ===
                        selectedModelId
                );


            if (
                selectedPrimaryIndex >= 0
            ) {

                return [

                    ...primary.slice(
                        selectedPrimaryIndex
                    ),

                    ...fallback

                ];
            }


            const selectedFallbackIndex =
                fallback.findIndex(
                    model =>
                        model.id ===
                        selectedModelId
                );


            if (
                selectedFallbackIndex >= 0
            ) {

                return fallback.slice(
                    selectedFallbackIndex
                );
            }
        }


        return [

            ...primary,

            ...fallback

        ];
    }


    // ========================================================
    // LEGACY MODEL IDS
    // ========================================================

    getModelIds(
        selectedModelId = null
    ) {

        return this.getChain(
            selectedModelId
        )
        .map(
            model =>
                model.id
        );
    }


    // ========================================================
    // LEGACY EXECUTION
    // ========================================================

    async execute(
        executor,
        {
            models = null,
            includeFallbacks = true,
            onFailure = null
        } = {}
    ) {

        let chain;


        if (
            Array.isArray(models) &&
            models.length > 0
        ) {

            chain =
                models
                    .map(
                        modelId =>
                            this.modelManager
                                .get(modelId)
                    )
                    .filter(
                        model =>
                            model &&
                            model.enabled
                    );

        } else {

            chain =
                includeFallbacks
                    ? this.getChain()
                    : this.getPrimaryChain();
        }


        if (
            !Array.isArray(chain) ||
            chain.length === 0
        ) {

            throw new Error(
                'No AI models are available for execution.'
            );
        }


        const errors = [];


        for (
            const model
            of chain
        ) {

            /*
             * ------------------------------------------------
             * HEALTH CHECK
             * ------------------------------------------------
             */

            if (
                !this.healthManager
                    .isAvailable(
                        model.provider ||
                        'openrouter',
                        model.id
                    )
            ) {

                console.log(

                    `[AI HEALTH] Skipping cooldown model: ${model.name}`

                );

                continue;
            }


            try {

                const response =
                    await executor(
                        model.id,
                        model
                    );


                /*
                 * --------------------------------------------
                 * SUCCESS
                 * --------------------------------------------
                 */

                this.healthManager
                    .recordSuccess(
                        model.provider ||
                        'openrouter',
                        model.id
                    );


                return response;

            } catch (error) {

                /*
                 * --------------------------------------------
                 * FAILURE
                 * --------------------------------------------
                 */

                this.healthManager
                    .recordFailure(
                        model.provider ||
                        'openrouter',
                        model.id,
                        error
                    );


                const failure = {

                    modelId:
                        model.id,

                    modelName:
                        model.name,

                    category:
                        model.category,

                    provider:
                        model.provider ||
                        'openrouter',

                    error:
                        error?.message ||
                        String(error)

                };


                errors.push(
                    failure
                );


                console.warn(

                    `[AI] Model failed: ${model.name}`,

                    `[${failure.provider}]`,

                    failure.error

                );


                if (
                    typeof onFailure ===
                    'function'
                ) {

                    try {

                        await onFailure(
                            failure
                        );

                    } catch (_) {

                        /*
                         * Callback failure must never
                         * interrupt fallback execution.
                         */

                    }
                }
            }
        }


        /*
         * ----------------------------------------------------
         * ALL HEALTHY MODELS FAILED OR WERE SKIPPED
         * ----------------------------------------------------
         */

        if (
            errors.length === 0
        ) {

            throw new Error(
                'All available AI models are currently in cooldown.'
            );
        }


        const finalError =
            new Error(
                'All configured AI models failed.'
            );


        finalError.code =
            'ALL_MODELS_FAILED';


        finalError.failures =
            errors;


        throw finalError;
    }


    // ========================================================
    // EXECUTE FROM SPECIFIC MODEL
    // ========================================================

    async executeFrom(
        modelId,
        executor,
        options = {}
    ) {

        const chain =
            this.getModelIds(
                modelId
            );


        return this.execute(

            executor,

            {
                ...options,

                models:
                    chain
            }
        );
    }


    // ========================================================
    // PROVIDER-AWARE EXECUTION
    // ========================================================

    async executeProviderChain(
        executor,
        {
            includePrimary = true,
            includeFallbacks = true,
            onFailure = null
        } = {}
    ) {

        let chain = [];


        /*
         * ----------------------------------------------------
         * PRIMARY
         * ----------------------------------------------------
         */

        if (
            includePrimary
        ) {

            chain.push(
                ...this.getProviderPrimaryChain()
            );
        }


        /*
         * ----------------------------------------------------
         * FALLBACK
         * ----------------------------------------------------
         */

        if (
            includeFallbacks
        ) {

            chain.push(
                ...this.getProviderFallbackChain()
            );
        }


        /*
         * ----------------------------------------------------
         * REMOVE DUPLICATES
         * ----------------------------------------------------
         */

        const seen =
            new Set();


        chain =
            chain.filter(
                model => {

                    const key =
                        model.key ||
                        `${model.provider}:${model.id}`;


                    if (
                        seen.has(key)
                    ) {

                        return false;
                    }


                    seen.add(
                        key
                    );


                    return true;
                }
            );


        /*
         * ----------------------------------------------------
         * VALIDATE
         * ----------------------------------------------------
         */

        if (
            chain.length === 0
        ) {

            throw new Error(
                'No provider AI models are available.'
            );
        }


        /*
         * ----------------------------------------------------
         * HEALTH FILTER
         * ----------------------------------------------------
         */

        chain =
            this.filterHealthyProviderChain(
                chain
            );


        const errors = [];


        /*
         * ----------------------------------------------------
         * PROVIDER EXECUTION
         * ----------------------------------------------------
         */

        for (
            const providerModel
            of chain
        ) {

            /*
             * ------------------------------------------------
             * HEALTH CHECK
             * ------------------------------------------------
             */

            if (
                !this.healthManager
                    .isAvailable(
                        providerModel.provider,
                        providerModel.id
                    )
            ) {

                console.log(

                    `[AI HEALTH] Skipping cooldown model: ${providerModel.provider}:${providerModel.id}`

                );

                continue;
            }


            try {

                if (
                    !providerModel.provider
                ) {

                    throw new Error(
                        'Provider is missing from model configuration.'
                    );
                }


                if (
                    !providerModel.id
                ) {

                    throw new Error(
                        'Model ID is missing from provider configuration.'
                    );
                }


                console.log(

                    `[AI] Trying ${providerModel.provider}`,

                    `→ ${providerModel.id}`

                );


                const response =
                    await executor(
                        providerModel
                    );


                /*
                 * --------------------------------------------
                 * SUCCESS
                 * --------------------------------------------
                 */

                this.healthManager
                    .recordSuccess(
                        providerModel.provider,
                        providerModel.id
                    );


                console.log(

                    `[AI] Success ${providerModel.provider}`,

                    `→ ${providerModel.id}`

                );


                return response;

            } catch (error) {

                /*
                 * --------------------------------------------
                 * RECORD HEALTH FAILURE
                 * --------------------------------------------
                 */

                this.healthManager
                    .recordFailure(
                        providerModel.provider,
                        providerModel.id,
                        error
                    );


                const failure = {

                    key:
                        providerModel.key ||
                        `${providerModel.provider}:${providerModel.id}`,

                    provider:
                        providerModel.provider,

                    providerName:
                        providerModel.providerName ||
                        providerModel.provider,

                    modelId:
                        providerModel.id,

                    modelName:
                        providerModel.name,

                    category:
                        providerModel.category,

                    error:
                        error?.message ||
                        String(error)

                };


                errors.push(
                    failure
                );


                console.warn(

                    `[AI] Provider failed: ${failure.provider}`,

                    `[${failure.modelId}]`,

                    failure.error

                );


                if (
                    typeof onFailure ===
                    'function'
                ) {

                    try {

                        await onFailure(
                            failure
                        );

                    } catch (_) {

                        /*
                         * Callback errors must never
                         * interrupt fallback execution.
                         */

                    }
                }
            }
        }


        /*
         * ----------------------------------------------------
         * ALL PROVIDERS FAILED
         * ----------------------------------------------------
         */

        if (
            errors.length === 0
        ) {

            throw new Error(
                'All AI providers are currently in cooldown.'
            );
        }


        const finalError =
            new Error(
                'All AI providers and models failed.'
            );


        finalError.code =
            'ALL_PROVIDERS_FAILED';


        finalError.failures =
            errors;


        throw finalError;
    }

}


module.exports =
    FallbackManager;