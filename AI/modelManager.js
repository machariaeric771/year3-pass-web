'use strict';

/*
 * ============================================================
 * YEAR 3 STUDY OS
 * MODEL MANAGER
 * ============================================================
 *
 * CENTRAL MODEL CONTROL LAYER
 *
 * Provider-aware model management.
 *
 * Providers:
 *
 *     OpenRouter
 *     Gemini
 *     Groq
 *     Mistral
 *
 * Responsibilities:
 *
 * - Provider registry access
 * - Active model
 * - Provider-aware model selection
 * - Primary models
 * - Fallback models
 * - Automatic routers
 * - Free models
 * - Paid models
 * - Model capability checks
 * - Model mode selection
 * - Model validation
 * - Model information
 *
 * This class DOES NOT make API requests.
 *
 * ============================================================
 */

const registry =
    require('./providerRegistry');

const routerRegistry =
    require('./openrouter/routerRegistry');


class ModelManager {

    constructor() {

        /*
         * ----------------------------------------------------
         * LOAD ENABLED MODELS
         * ----------------------------------------------------
         */

        this.models =
            registry.listModels();


        /*
         * ----------------------------------------------------
         * DEFAULT ACTIVE MODEL
         * ----------------------------------------------------
         */

        const defaultModel =
            registry.getDefaultPrimary();


        /*
         * IMPORTANT:
         *
         * Store the provider-qualified key internally.
         *
         * Example:
         *
         *     openrouter:openai/gpt-oss-120b
         *
         * This prevents collisions with:
         *
         *     groq:openai/gpt-oss-120b
         */

        this.activeModel =
            defaultModel
                ? this.getModelKey(
                    defaultModel
                )
                : null;


        /*
         * ----------------------------------------------------
         * DEFAULT MODE
         * ----------------------------------------------------
         */

        this.activeMode =
            'primary';
    }


    // ========================================================
    // MODEL KEY
    // ========================================================

    getModelKey(model) {

        if (!model) {
            return null;
        }


        if (
            model.provider &&
            model.id
        ) {

            return (
                `${model.provider}:${model.id}`
            );
        }


        return model.id || null;
    }


    // ========================================================
    // PARSE MODEL KEY
    // ========================================================

    parseModelKey(modelId) {

        const value =
            String(
                modelId || ''
            )
            .trim();


        if (!value) {

            return {

                provider:
                    null,

                id:
                    null
            };
        }


        /*
         * Provider-qualified form:
         *
         *     groq:openai/gpt-oss-120b
         */

        const separator =
            value.indexOf(':');


        if (
            separator > 0
        ) {

            return {

                provider:
                    value
                        .slice(
                            0,
                            separator
                        )
                        .trim()
                        .toLowerCase(),

                id:
                    value
                        .slice(
                            separator + 1
                        )
                        .trim()
            };
        }


        /*
         * Legacy/unqualified form:
         *
         *     openai/gpt-oss-120b
         */

        return {

            provider:
                null,

            id:
                value
        };
    }


    // ========================================================
    // ACTIVE MODEL
    // ========================================================

    getActive() {

        if (!this.activeModel) {

            return (
                registry.getDefaultPrimary()
            );
        }


        /*
         * First try provider-qualified lookup.
         */

        const qualified =
            this.findModel(
                this.activeModel
            );


        if (qualified) {

            return qualified;
        }


        /*
         * Safety fallback.
         */

        return (
            registry.getDefaultPrimary()
        );
    }


    getActiveId() {

        const model =
            this.getActive();


        return model
            ? model.id
            : null;
    }


    getActiveKey() {

        const model =
            this.getActive();


        return model
            ? this.getModelKey(
                model
            )
            : null;
    }


    getActiveProvider() {

        const model =
            this.getActive();


        return model
            ? model.provider
            : null;
    }


    // ========================================================
    // SET ACTIVE MODEL
    // ========================================================

    setActive(modelId) {

        const model =
            this.resolve(
                modelId
            );


        if (!model) {

            throw new Error(
                `Unknown AI model: ${modelId}`
            );
        }


        if (!model.enabled) {

            throw new Error(
                `AI model is disabled: ${modelId}`
            );
        }


        /*
         * Automatic routers are valid selections,
         * but are controlled through the router registry.
         */

        if (
            model.router ||
            this.isAutomatic(
                model.id
            )
        ) {

            if (
                !routerRegistry.hasRouter(
                    model.id
                )
            ) {

                throw new Error(
                    `Automatic AI router is not registered: ${model.id}`
                );
            }
        }


        this.activeModel =
            this.getModelKey(
                model
            );


        return model;
    }


    resetActive() {

        const defaultModel =
            registry.getDefaultPrimary();


        if (!defaultModel) {

            throw new Error(
                'No default primary AI model is available.'
            );
        }


        this.activeModel =
            this.getModelKey(
                defaultModel
            );


        return defaultModel;
    }


    // ========================================================
    // ACTIVE MODE
    // ========================================================

    getMode() {

        return this.activeMode;
    }


    setMode(mode) {

        const normalized =
            String(
                mode || ''
            )
            .trim()
            .toLowerCase();


        const allowedModes = [

            'primary',

            'fallback',

            'auto',

            'free'

        ];


        if (
            !allowedModes.includes(
                normalized
            )
        ) {

            throw new Error(
                `Unknown AI mode: ${mode}`
            );
        }


        this.activeMode =
            normalized;


        return this.activeMode;
    }


    resetMode() {

        this.activeMode =
            'primary';

        return this.activeMode;
    }


    // ========================================================
    // ALL MODELS
    // ========================================================

    list() {

        return registry.listModels();
    }


    listAll() {

        return registry.listModels();
    }


    count() {

        return this.list().length;
    }


    // ========================================================
    // PRIMARY MODELS
    // ========================================================

    listPrimary() {

        return registry.listPrimaryModels();
    }


    getPrimaryIds() {

        return this.listPrimary()
            .map(
                model =>
                    model.id
            );
    }


    getPrimaryKeys() {

        return this.listPrimary()
            .map(
                model =>
                    this.getModelKey(
                        model
                    )
            );
    }


    // ========================================================
    // FALLBACK MODELS
    // ========================================================

    listFallback() {

        return registry.listFallbackModels();
    }


    getFallbackIds() {

        return this.listFallback()
            .map(
                model =>
                    model.id
            );
    }


    getFallbackKeys() {

        return this.listFallback()
            .map(
                model =>
                    this.getModelKey(
                        model
                    )
            );
    }


    // ========================================================
    // AUTOMATIC ROUTERS
    // ========================================================

    listAutomatic() {

        return registry.listAutomaticModels();
    }


    getAutomaticIds() {

        return this.listAutomatic()
            .map(
                model =>
                    model.id
            );
    }


    getAutomaticKeys() {

        return this.listAutomatic()
            .map(
                model =>
                    this.getModelKey(
                        model
                    )
            );
    }


    // ========================================================
    // FREE MODELS
    // ========================================================

    listFree() {

        return registry.listFreeModels();
    }


    getFreeIds() {

        return this.listFree()
            .map(
                model =>
                    model.id
            );
    }


    getFreeKeys() {

        return this.listFree()
            .map(
                model =>
                    this.getModelKey(
                        model
                    )
            );
    }


    // ========================================================
    // PAID MODELS
    // ========================================================

    listPaid() {

        return registry.listPaidModels();
    }


    getPaidIds() {

        return this.listPaid()
            .map(
                model =>
                    model.id
            );
    }


    getPaidKeys() {

        return this.listPaid()
            .map(
                model =>
                    this.getModelKey(
                        model
                    )
            );
    }


    // ========================================================
    // LOOKUP
    // ========================================================

    /*
     * Find a model safely.
     *
     * Accepted:
     *
     *     groq:openai/gpt-oss-120b
     *
     *     openrouter:openai/gpt-oss-120b
     *
     *     openai/gpt-oss-120b
     *
     * The provider-qualified form is preferred.
     */

    findModel(modelId) {

        const parsed =
            this.parseModelKey(
                modelId
            );


        if (!parsed.id) {
            return null;
        }


        /*
         * Provider-qualified lookup.
         */

        if (
            parsed.provider
        ) {

            return registry.findModel(
                parsed.provider,
                parsed.id
            );
        }


        /*
         * Legacy ID-only lookup.
         *
         * Preserve compatibility.
         *
         * If more than one provider exposes the same
         * model ID, prefer the first model according
         * to registry priority.
         */

        const matches =
            this.list()
                .filter(
                    model =>
                        model.id ===
                        parsed.id
                );


        return (
            matches[0] ||
            null
        );
    }


    get(modelId) {

        return this.findModel(
            modelId
        );
    }


    exists(modelId) {

        return Boolean(
            this.findModel(
                modelId
            )
        );
    }


    hasModel(modelId) {

        return this.exists(
            modelId
        );
    }


    isEnabled(modelId) {

        const model =
            this.findModel(
                modelId
            );


        return Boolean(
            model &&
            model.enabled &&
            registry.isProviderEnabled(
                model.provider
            )
        );
    }


    isTemporary(modelId) {

        const model =
            this.findModel(
                modelId
            );


        return Boolean(
            model &&
            model.temporary
        );
    }


    // ========================================================
    // PROVIDER-SPECIFIC LOOKUP
    // ========================================================

    getProviderModels(
        providerId
    ) {

        return registry
            .listModelsByProvider(
                providerId
            );
    }


    getProviderModel(
        providerId,
        modelId
    ) {

        return registry.findModel(
            providerId,
            modelId
        );
    }


    // ========================================================
    // RESOLUTION
    // ========================================================

    resolve(modelId) {

        /*
         * Explicit model requested.
         */

        if (modelId) {

            const model =
                this.findModel(
                    modelId
                );


            if (
                model &&
                model.enabled
            ) {

                return model;
            }


            throw new Error(
                `Requested AI model is unavailable: ${modelId}`
            );
        }


        /*
         * No explicit model.
         *
         * Use active model.
         */

        return this.getActive();
    }


    // ========================================================
    // MODE RESOLUTION
    // ========================================================

    resolveMode(mode = null) {

        const selectedMode =
            String(
                mode ||
                this.activeMode ||
                'primary'
            )
            .trim()
            .toLowerCase();


        switch (
            selectedMode
        ) {

            case 'primary':

                return {

                    mode:
                        'primary',

                    models:
                        this.listPrimary(),

                    ids:
                        this.getPrimaryIds(),

                    keys:
                        this.getPrimaryKeys()
                };


            case 'fallback':

                return {

                    mode:
                        'fallback',

                    models:
                        this.listFallback(),

                    ids:
                        this.getFallbackIds(),

                    keys:
                        this.getFallbackKeys()
                };


            case 'auto': {

                const router =
                    routerRegistry
                        .getDefaultRouter();


                return {

                    mode:
                        'auto',

                    router,

                    models:
                        router
                            ? [router]
                            : [],

                    ids:
                        router
                            ? [router.id]
                            : []
                };
            }


            case 'free': {

                const router =
                    routerRegistry
                        .getDefaultFreeRouter();


                return {

                    mode:
                        'free',

                    router,

                    models:
                        router
                            ? [router]
                            : [],

                    ids:
                        router
                            ? [router.id]
                            : []
                };
            }


            default:

                throw new Error(
                    `Unknown AI model mode: ${mode}`
                );
        }
    }


    // ========================================================
    // MODEL CATEGORY CHECKS
    // ========================================================

    isPrimary(modelId) {

        const model =
            this.findModel(
                modelId
            );


        if (!model) {
            return false;
        }


        return (
            model.category ===
            'primary'
        );
    }


    isFallback(modelId) {

        const model =
            this.findModel(
                modelId
            );


        if (!model) {
            return false;
        }


        return (
            model.category ===
            'fallback'
        );
    }


    isAutomatic(modelId) {

        const model =
            this.findModel(
                modelId
            );


        return Boolean(
            model &&
            (
                model.category ===
                'automatic' ||

                model.router ===
                true
            )
        );
    }


    isFree(modelId) {

        const model =
            this.findModel(
                modelId
            );


        return Boolean(
            model &&
            model.free
        );
    }


    isPaid(modelId) {

        const model =
            this.findModel(
                modelId
            );


        return Boolean(
            model &&
            !model.free
        );
    }


    // ========================================================
    // CAPABILITY CHECKING
    // ========================================================

    hasCapability(
        modelId,
        capability
    ) {

        const model =
            this.findModel(
                modelId
            );


        if (!model) {
            return false;
        }


        if (
            !Array.isArray(
                model.capabilities
            )
        ) {

            return false;
        }


        return model.capabilities
            .includes(
                capability
            );
    }


    getCapabilities(modelId) {

        const model =
            this.findModel(
                modelId
            );


        if (!model) {
            return [];
        }


        return Array.isArray(
            model.capabilities
        )
            ? [
                ...model.capabilities
            ]
            : [];
    }


    // ========================================================
    // FIND MODELS BY CAPABILITY
    // ========================================================

    findByCapability(
        capability
    ) {

        return this.list()
            .filter(
                model =>
                    Array.isArray(
                        model.capabilities
                    ) &&
                    model.capabilities
                        .includes(
                            capability
                        )
            );
    }


    // ========================================================
    // FIND MODELS BY PROVIDER
    // ========================================================

    findByProvider(
        providerId
    ) {

        return registry
            .listModelsByProvider(
                providerId
            );
    }


    // ========================================================
    // MODEL INFORMATION
    // ========================================================

    getInfo(modelId) {

        const model =
            this.findModel(
                modelId
            );


        if (!model) {
            return null;
        }


        return {

            id:
                model.id,

            key:
                this.getModelKey(
                    model
                ),

            name:
                model.name,

            provider:
                model.provider,

            providerName:
                model.providerName ||
                model.provider,

            category:
                model.category,

            priority:
                model.priority,

            free:
                Boolean(
                    model.free
                ),

            enabled:
                Boolean(
                    model.enabled
                ),

            temporary:
                Boolean(
                    model.temporary
                ),

            expiresAt:
                model.expiresAt ||
                null,

            router:
                Boolean(
                    model.router
                ),

            capabilities:
                Array.isArray(
                    model.capabilities
                )
                    ? [
                        ...model.capabilities
                    ]
                    : []
        };
    }


    // ========================================================
    // LIST MODEL INFORMATION
    // ========================================================

    getAllInfo() {

        return this.list()
            .map(
                model =>
                    this.getInfo(
                        this.getModelKey(
                            model
                        )
                    )
            );
    }


    // ========================================================
    // ROUTER INFORMATION
    // ========================================================

    getRouter(routerId) {

        return routerRegistry.getRouter(
            routerId
        );
    }


    listRouters() {

        return routerRegistry.listRouters();
    }


    // ========================================================
    // SELECTION SUMMARY
    // ========================================================

    getSelectionState() {

        const active =
            this.getActive();


        return {

            activeModel:
                active
                    ? active.id
                    : null,

            activeModelKey:
                active
                    ? this.getModelKey(
                        active
                    )
                    : null,

            activeModelName:
                active
                    ? active.name
                    : null,

            activeProvider:
                active
                    ? active.provider
                    : null,

            activeMode:
                this.activeMode,

            primaryModels:
                this.getPrimaryIds(),

            primaryModelKeys:
                this.getPrimaryKeys(),

            fallbackModels:
                this.getFallbackIds(),

            fallbackModelKeys:
                this.getFallbackKeys(),

            automaticRouters:
                this.getAutomaticIds(),

            freeModels:
                this.getFreeIds(),

            paidModels:
                this.getPaidIds(),

            totalModels:
                this.count()
        };
    }


    // ========================================================
    // VALIDATION
    // ========================================================

    validate(modelId) {

        const model =
            this.findModel(
                modelId
            );


        if (!model) {

            return {

                valid:
                    false,

                reason:
                    'MODEL_NOT_FOUND'
            };
        }


        if (!model.enabled) {

            return {

                valid:
                    false,

                reason:
                    'MODEL_DISABLED'
            };
        }


        if (
            !registry.isProviderEnabled(
                model.provider
            )
        ) {

            return {

                valid:
                    false,

                reason:
                    'PROVIDER_DISABLED'
            };
        }


        return {

            valid:
                true,

            model,

            key:
                this.getModelKey(
                    model
                )
        };
    }


    // ========================================================
    // SAFE MODEL SELECTION
    // ========================================================

    trySetActive(modelId) {

        try {

            const model =
                this.setActive(
                    modelId
                );


            return {

                success:
                    true,

                model,

                key:
                    this.getModelKey(
                        model
                    )
            };

        }
        catch (error) {

            return {

                success:
                    false,

                error:
                    error?.message ||
                    String(error)
            };
        }
    }


    // ========================================================
    // TEMPORARY MODEL CHECK
    // ========================================================

    isExpired(modelId) {

        const model =
            this.findModel(
                modelId
            );


        if (!model) {
            return true;
        }


        if (!model.temporary) {
            return false;
        }


        if (!model.expiresAt) {
            return false;
        }


        const expiry =
            new Date(
                model.expiresAt +
                'T23:59:59'
            );


        return (
            Date.now() >
            expiry.getTime()
        );
    }


    // ========================================================
    // AVAILABLE MODEL CHECK
    // ========================================================

    isAvailable(modelId) {

        const model =
            this.findModel(
                modelId
            );


        if (!model) {
            return false;
        }


        if (!model.enabled) {
            return false;
        }


        if (
            !registry.isProviderEnabled(
                model.provider
            )
        ) {

            return false;
        }


        if (
            model.temporary &&
            this.isExpired(
                modelId
            )
        ) {

            return false;
        }


        return true;
    }


    // ========================================================
    // AVAILABLE MODELS
    // ========================================================

    listAvailable() {

        return this.list()
            .filter(
                model =>
                    this.isAvailable(
                        this.getModelKey(
                            model
                        )
                    )
            );
    }


    listAvailablePrimary() {

        return this.listPrimary()
            .filter(
                model =>
                    this.isAvailable(
                        this.getModelKey(
                            model
                        )
                    )
            );
    }


    listAvailableFallback() {

        return this.listFallback()
            .filter(
                model =>
                    this.isAvailable(
                        this.getModelKey(
                            model
                        )
                    )
            );
    }


    // ========================================================
    // MODEL PRIORITY
    // ========================================================

    sortByPriority(
        models = []
    ) {

        return [
            ...models
        ].sort(
            (a, b) =>
                (
                    a.priority ??
                    999
                ) -
                (
                    b.priority ??
                    999
                )
        );
    }


    // ========================================================
    // BEST MODEL FOR CAPABILITY
    // ========================================================

    getBestForCapability(
        capability
    ) {

        const matches =
            this.findByCapability(
                capability
            )
            .filter(
                model =>
                    this.isAvailable(
                        this.getModelKey(
                            model
                        )
                    )
            );


        const sorted =
            this.sortByPriority(
                matches
            );


        return (
            sorted[0] ||
            null
        );
    }


    // ========================================================
    // PROVIDER-AWARE MODEL RESOLUTION
    // ========================================================

    resolveProviderModel(
        providerId,
        modelId
    ) {

        const model =
            this.getProviderModel(
                providerId,
                modelId
            );


        if (!model) {

            throw new Error(
                `Model not found for provider ${providerId}: ${modelId}`
            );
        }


        if (!model.enabled) {

            throw new Error(
                `Model is disabled: ${providerId}:${modelId}`
            );
        }


        return model;
    }

        // ========================================================
    // PRIMARY EXECUTION CHAIN
    // ========================================================

    getPrimaryChain() {

        return this.listPrimary()
            .filter(
                model =>
                    this.isAvailable(
                        this.getModelKey(
                            model
                        )
                    )
            )
            .sort(
                (a, b) =>
                    (
                        a.priority ?? 999
                    ) -
                    (
                        b.priority ?? 999
                    )
            );
    }


    getPrimaryChainKeys() {

        return this.getPrimaryChain()
            .map(
                model =>
                    this.getModelKey(
                        model
                    )
            );
    }


    // ========================================================
    // FALLBACK EXECUTION CHAIN
    // ========================================================

    getFallbackChain() {

        return this.listFallback()
            .filter(
                model =>
                    this.isAvailable(
                        this.getModelKey(
                            model
                        )
                    )
            )
            .sort(
                (a, b) =>
                    (
                        a.priority ?? 999
                    ) -
                    (
                        b.priority ?? 999
                    )
            );
    }


    getFallbackChainKeys() {

        return this.getFallbackChain()
            .map(
                model =>
                    this.getModelKey(
                        model
                    )
            );
    }


    // ========================================================
    // PROVIDER CHAIN
    // ========================================================

    getProviderChain() {

        return [
            ...this.listPrimary(),
            ...this.listFallback()
        ];
    }


    getProviderChainKeys() {

        return this.getProviderChain()
            .map(
                model =>
                    this.getModelKey(
                        model
                    )
            );
    }


    getProviderChainByProvider() {

        const chain =
            this.getProviderChain();

        const grouped = {};


        for (
            const model
            of chain
        ) {

            const provider =
                model.provider;


            if (
                !grouped[provider]
            ) {

                grouped[provider] =
                    [];
            }


            grouped[provider]
                .push(
                    model
                );
        }


        return grouped;
    }

}


module.exports =
    ModelManager;
