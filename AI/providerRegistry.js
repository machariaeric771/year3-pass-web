'use strict';

/*
 * ============================================================
 * YEAR 3 STUDY OS
 * PROVIDER REGISTRY
 * ============================================================
 *
 * CENTRAL PROVIDER + MODEL REGISTRY
 *
 * Providers:
 *
 *     OpenRouter
 *     Google Gemini
 *     Groq
 *     Mistral
 *
 * Responsibilities:
 *
 * - Provider definitions
 * - Model definitions
 * - Primary models
 * - Fallback models
 * - Free models
 * - Paid models
 * - Model lookup
 * - Model validation
 * - Default model selection
 * - Provider chains
 *
 * IMPORTANT:
 *
 * This file does NOT make API requests.
 *
 * API communication remains in:
 *
 *     openrouter/openRouterClient.js
 *     providers/gemini.js
 *     providers/client.js
 *
 * ============================================================
 */


/* ============================================================
   PROVIDERS
   ============================================================ */

const PROVIDERS = Object.freeze({

    OPENROUTER:
        'openrouter',

    GEMINI:
        'gemini',

    GROQ:
        'groq',

    MISTRAL:
        'mistral'

});


/* ============================================================
   PROVIDER CONFIGURATION
   ============================================================ */

const PROVIDER_CONFIG = Object.freeze({

    openrouter: {

        id:
            'openrouter',

        name:
            'OpenRouter',

        enabled:
            true,

        primary:
            true,

        fallback:
            false,

        priority:
            1,

        baseUrl:
            'https://openrouter.ai/api/v1',

        apiKeyEnv:
            'OPENROUTER_API_KEY',

        client:
            'openrouter'

    },


    gemini: {

        id:
            'gemini',

        name:
            'Google Gemini',

        enabled:
            true,

        primary:
            false,

        fallback:
            true,

        priority:
            10,

        apiKeyEnv:
            'GEMINI_API_KEY',

        client:
            'gemini'

    },


    groq: {

        id:
            'groq',

        name:
            'Groq',

        enabled:
            true,

        primary:
            false,

        fallback:
            true,

        priority:
            20,

        baseUrl:
            'https://api.groq.com/openai/v1',

        apiKeyEnv:
            'GROQ_API_KEY',

        client:
            'openai-compatible'

    },
    mistral: {

        id:
            'mistral',

        name:
            'Mistral',

        enabled:
            true,

        primary:
            false,

        fallback:
            true,

        priority:
            40,

        baseUrl:
            'https://api.mistral.ai/v1',

        apiKeyEnv:
            'MISTRAL_API_KEY',

        client:
            'openai-compatible'

    }

});


/* ============================================================
   MODEL REGISTRY
   ============================================================
 *
 * category:
 *
 *     primary
 *     fallback
 *
 * free:
 *
 *     true / false
 *
 * priority:
 *
 *     Lower number = earlier in the chain
 *
 * ============================================================ */

const MODELS = Object.freeze([


    /* ========================================================
       OPENROUTER â€” PRIMARY
       ======================================================== */

    {

        key:
            'openrouter:openai/gpt-oss-120b',

        provider:
            'openrouter',

        providerName:
            'OpenRouter',

        id:
            'openai/gpt-oss-120b',

        name:
            'GPT-OSS 120B',

        category:
            'primary',

        enabled:
            true,

        free:
            true,

        priority:
            1,

        temporary:
            false,

        capabilities: [

            'assistant',

            'explain',

            'mcq',

            'flashcards',

            'essay',

            'spotter',

            'reasoning'

        ]

    },


    {

        key:
            'openrouter:openai/gpt-oss-20b',

        provider:
            'openrouter',

        providerName:
            'OpenRouter',

        id:
            'openai/gpt-oss-20b',

        name:
            'GPT-OSS 20B',

        category:
            'primary',

        enabled:
            true,

        free:
            true,

        priority:
            2,

        temporary:
            false,

        capabilities: [

            'assistant',

            'explain',

            'mcq',

            'flashcards',

            'essay',

            'spotter',

            'reasoning'

        ]

    },


    /* ========================================================
       GEMINI â€” FALLBACK
       ======================================================== */

    {

        key:
            'gemini:gemini-3.7-flash',

        provider:
            'gemini',

        providerName:
            'Google Gemini',

        id:
            'gemini-3.7-flash',

        name:
            'Gemini 3.7 Flash',

        category:
            'fallback',

        enabled:
            true,

        free:
            true,

        priority:
            10,

        temporary:
            false,

        capabilities: [

            'assistant',

            'explain',

            'mcq',

            'flashcards',

            'essay',

            'spotter'

        ]

    },


    {

        key:
            'gemini:gemini-3.5-flash-lite',

        provider:
            'gemini',

        providerName:
            'Google Gemini',

        id:
            'gemini-3.5-flash-lite',

        name:
            'Gemini 3.5 Flash-Lite',

        category:
            'fallback',

        enabled:
            true,

        free:
            true,

        priority:
            11,

        temporary:
            false,

        capabilities: [

            'assistant',

            'explain',

            'mcq',

            'flashcards',

            'essay',

            'spotter'

        ]

    },


    {

        key:
            'gemini:gemini-3.1-flash-lite',

        provider:
            'gemini',

        providerName:
            'Google Gemini',

        id:
            'gemini-3.1-flash-lite',

        name:
            'Gemini 3.1 Flash-Lite',

        category:
            'fallback',

        enabled:
            true,

        free:
            true,

        priority:
            12,

        temporary:
            false,

        capabilities: [

            'assistant',

            'explain',

            'mcq',

            'flashcards',

            'essay',

            'spotter'

        ]

    },


    /* ========================================================
       GROQ â€” FALLBACK
       ======================================================== */

    {

        key:
            'groq:openai/gpt-oss-120b',

        provider:
            'groq',

        providerName:
            'Groq',

        id:
            'openai/gpt-oss-120b',

        name:
            'GPT-OSS 120B â€” Groq',

        category:
            'fallback',

        enabled:
            true,

        free:
            true,

        priority:
            20,

        temporary:
            false,

        capabilities: [

            'assistant',

            'explain',

            'mcq',

            'flashcards',

            'essay',

            'spotter',

            'reasoning'

        ]

    },


    {

        key:
            'groq:openai/gpt-oss-20b',

        provider:
            'groq',

        providerName:
            'Groq',

        id:
            'openai/gpt-oss-20b',

        name:
            'GPT-OSS 20B â€” Groq',

        category:
            'fallback',

        enabled:
            true,

        free:
            true,

        priority:
            21,

        temporary:
            false,

        capabilities: [

            'assistant',

            'explain',

            'mcq',

            'flashcards',

            'essay',

            'spotter',

            'reasoning'

        ]

    },


    {

        key:
            'groq:llama-3.3-70b-versatile',

        provider:
            'groq',

        providerName:
            'Groq',

        id:
            'llama-3.3-70b-versatile',

        name:
            'Llama 3.3 70B Versatile â€” Groq',

        category:
            'fallback',

        enabled:
            true,

        free:
            true,

        priority:
            22,

        temporary:
            false,

        capabilities: [

            'assistant',

            'explain',

            'mcq',

            'flashcards',

            'essay',

            'spotter'

        ]

    },


    {

        key:
            'groq:llama-3.1-8b-instant',

        provider:
            'groq',

        providerName:
            'Groq',

        id:
            'llama-3.1-8b-instant',

        name:
            'Llama 3.1 8B Instant â€” Groq',

        category:
            'fallback',

        enabled:
            true,

        free:
            true,

        priority:
            23,

        temporary:
            false,

        capabilities: [

            'assistant',

            'explain',

            'mcq',

            'flashcards'

        ]

    },


    {

        key:
            'groq:qwen/qwen3.6-27b',

        provider:
            'groq',

        providerName:
            'Groq',

        id:
            'qwen/qwen3.6-27b',

        name:
            'Qwen 3.6 27B â€” Groq',

        category:
            'fallback',

        enabled:
            true,

        free:
            true,

        priority:
            24,

        temporary:
            false,

        capabilities: [

            'assistant',

            'explain',

            'mcq',

            'flashcards',

            'essay',

            'spotter',

            'reasoning'

        ]

    },


    /* ========================================================
       ======================================================== */

    {

        key:
            'mistral:mistral-small-latest',

        provider:
            'mistral',

        providerName:
            'Mistral',

        id:
            'mistral-small-latest',

        name:
            'Mistral Small',

        category:
            'fallback',

        enabled:
            true,

        free:
            false,

        priority:
            40,

        temporary:
            false,

        capabilities: [

            'assistant',

            'explain',

            'mcq',

            'flashcards',

            'essay',

            'spotter'

        ]

    },


    {

        key:
            'mistral:mistral-medium-latest',

        provider:
            'mistral',

        providerName:
            'Mistral',

        id:
            'mistral-medium-latest',

        name:
            'Mistral Medium',

        category:
            'fallback',

        enabled:
            true,

        free:
            false,

        priority:
            41,

        temporary:
            false,

        capabilities: [

            'assistant',

            'explain',

            'mcq',

            'flashcards',

            'essay',

            'spotter',

            'reasoning'

        ]

    },


    {

        key:
            'mistral:mistral-large-latest',

        provider:
            'mistral',

        providerName:
            'Mistral',

        id:
            'mistral-large-latest',

        name:
            'Mistral Large',

        category:
            'fallback',

        enabled:
            true,

        free:
            false,

        priority:
            42,

        temporary:
            false,

        capabilities: [

            'assistant',

            'explain',

            'mcq',

            'flashcards',

            'essay',

            'spotter',

            'reasoning'

        ]

    },


    {

        key:
            'mistral:ministral-14b-latest',

        provider:
            'mistral',

        providerName:
            'Mistral',

        id:
            'ministral-14b-latest',

        name:
            'Ministral 14B',

        category:
            'fallback',

        enabled:
            true,

        free:
            false,

        priority:
            43,

        temporary:
            false,

        capabilities: [

            'assistant',

            'explain',

            'mcq',

            'flashcards'

        ]

    },


    {

        key:
            'mistral:ministral-8b-latest',

        provider:
            'mistral',

        providerName:
            'Mistral',

        id:
            'ministral-8b-latest',

        name:
            'Ministral 8B',

        category:
            'fallback',

        enabled:
            true,

        free:
            false,

        priority:
            44,

        temporary:
            false,

        capabilities: [

            'assistant',

            'explain',

            'mcq',

            'flashcards'

        ]

    },


    {

        key:
            'mistral:ministral-3b-latest',

        provider:
            'mistral',

        providerName:
            'Mistral',

        id:
            'ministral-3b-latest',

        name:
            'Ministral 3B',

        category:
            'fallback',

        enabled:
            true,

        free:
            false,

        priority:
            45,

        temporary:
            false,

        capabilities: [

            'assistant',

            'explain',

            'mcq',

            'flashcards'

        ]

    }

]);


/* ============================================================
   HELPERS
   ============================================================ */

function cloneModel(model) {

    return {
        ...model,

        capabilities:
            Array.isArray(model.capabilities)
                ? [...model.capabilities]
                : []
    };
}


function cloneProvider(provider) {

    return {
        ...provider
    };
}


/* ============================================================
   PROVIDER METHODS
   ============================================================ */

function listProviders() {

    return Object.values(
        PROVIDER_CONFIG
    )
        .filter(
            provider =>
                provider.enabled
        )
        .sort(
            (a, b) =>
                (a.priority || 999) -
                (b.priority || 999)
        )
        .map(
            cloneProvider
        );
}


function getProvider(providerId) {

    const id =
        String(
            providerId || ''
        )
        .trim()
        .toLowerCase();

    const provider =
        PROVIDER_CONFIG[id];

    return provider
        ? cloneProvider(provider)
        : null;
}


function isProviderEnabled(providerId) {

    const id =
        String(
            providerId || ''
        )
        .trim()
        .toLowerCase();

    const provider =
        PROVIDER_CONFIG[id];

    return Boolean(
        provider &&
        provider.enabled
    );
}


/* ============================================================
   MODEL LISTING
   ============================================================ */

function listModels() {

    return MODELS
        .filter(
            model =>
                model.enabled &&
                isProviderEnabled(
                    model.provider
                )
        )
        .sort(
            (a, b) =>
                (a.priority || 999) -
                (b.priority || 999)
        )
        .map(
            cloneModel
        );
}


function listPrimaryModels() {

    return MODELS
        .filter(
            model =>
                model.enabled &&
                model.category === 'primary' &&
                isProviderEnabled(
                    model.provider
                )
        )
        .sort(
            (a, b) =>
                (a.priority || 999) -
                (b.priority || 999)
        )
        .map(
            cloneModel
        );
}


function listFallbackModels() {

    return MODELS
        .filter(
            model =>
                model.enabled &&
                model.category === 'fallback' &&
                isProviderEnabled(
                    model.provider
                )
        )
        .sort(
            (a, b) =>
                (a.priority || 999) -
                (b.priority || 999)
        )
        .map(
            cloneModel
        );
}


function listAutomaticModels() {

    return MODELS
        .filter(
            model =>
                model.enabled &&
                model.category === 'automatic'
        )
        .sort(
            (a, b) =>
                (a.priority || 999) -
                (b.priority || 999)
        )
        .map(
            cloneModel
        );
}


function listModelsByProvider(providerId) {

    const id =
        String(
            providerId || ''
        )
        .trim()
        .toLowerCase();

    return MODELS
        .filter(
            model =>
                model.enabled &&
                model.provider === id &&
                isProviderEnabled(id)
        )
        .sort(
            (a, b) =>
                (a.priority || 999) -
                (b.priority || 999)
        )
        .map(
            cloneModel
        );
}


function listFreeModels() {

    return MODELS
        .filter(
            model =>
                model.enabled &&
                model.free === true &&
                isProviderEnabled(
                    model.provider
                )
        )
        .sort(
            (a, b) =>
                (a.priority || 999) -
                (b.priority || 999)
        )
        .map(
            cloneModel
        );
}


function listPaidModels() {

    return MODELS
        .filter(
            model =>
                model.enabled &&
                model.free !== true &&
                isProviderEnabled(
                    model.provider
                )
        )
        .sort(
            (a, b) =>
                (a.priority || 999) -
                (b.priority || 999)
        )
        .map(
            cloneModel
        );
}


/* ============================================================
   MODEL LOOKUP
   ============================================================ */

function findModelByKey(key) {

    const model =
        MODELS.find(
            item =>
                item.key === key
        );

    return model
        ? cloneModel(model)
        : null;
}


function findModel(
    providerId,
    modelId
) {

    const provider =
        String(
            providerId || ''
        )
        .trim()
        .toLowerCase();

    const id =
        String(
            modelId || ''
        )
        .trim();

    const model =
        MODELS.find(
            item =>
                item.provider === provider &&
                item.id === id
        );

    return model
        ? cloneModel(model)
        : null;
}


function getModel(modelId) {

    const id =
        String(
            modelId || ''
        )
        .trim();

    const model =
        MODELS.find(
            item =>
                item.id === id
        );

    return model
        ? cloneModel(model)
        : null;
}


function hasModel(modelId) {

    return Boolean(
        getModel(modelId)
    );
}


function isEnabled(modelId) {

    const model =
        getModel(modelId);

    return Boolean(
        model &&
        model.enabled &&
        isProviderEnabled(
            model.provider
        )
    );
}


function isTemporary(modelId) {

    const model =
        getModel(modelId);

    return Boolean(
        model &&
        model.temporary
    );
}


/* ============================================================
   DEFAULT MODELS
   ============================================================ */

function getDefaultPrimary() {

    return (
        listPrimaryModels()[0] ||
        null
    );
}


function getDefaultFallback() {

    return (
        listFallbackModels()[0] ||
        null
    );
}


function getDefaultAutomatic() {

    return (
        listAutomaticModels()[0] ||
        null
    );
}


function getDefaultFree() {

    return (
        listFreeModels()[0] ||
        null
    );
}


/* ============================================================
   PROVIDER CHAINS
   ============================================================ */

function getPrimaryChain() {

    return listPrimaryModels();
}


function getFallbackChain() {

    return listFallbackModels();
}


function getProviderChain() {

    return [

        ...getPrimaryChain(),

        ...getFallbackChain()

    ];
}


function getProviderChainOrder() {

    const seen =
        new Set();

    const result =
        [];

    for (
        const model
        of getProviderChain()
    ) {

        if (
            seen.has(
                model.provider
            )
        ) {

            continue;
        }

        seen.add(
            model.provider
        );

        const provider =
            getProvider(
                model.provider
            );

        if (provider) {

            result.push(
                provider
            );
        }
    }

    return result;
}


/* ============================================================
   DEFAULT PROVIDER
   ============================================================ */

function getDefaultProvider() {

    return getProvider(
        PROVIDERS.OPENROUTER
    );
}


/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {

    PROVIDERS,

    MODELS,

    PROVIDER_CONFIG,

    listProviders,

    getProvider,

    isProviderEnabled,

    listModels,

    listPrimaryModels,

    listFallbackModels,

    listAutomaticModels,

    listModelsByProvider,

    listFreeModels,

    listPaidModels,

    findModel,

    findModelByKey,

    getModel,

    hasModel,

    isEnabled,

    isTemporary,

    getDefaultPrimary,

    getDefaultFallback,

    getDefaultAutomatic,

    getDefaultFree,

    getPrimaryChain,

    getFallbackChain,

    getProviderChain,

    getProviderChainOrder,

    getDefaultProvider

};


