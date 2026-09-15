'use strict';

/*
 * ============================================================
 * YEAR 3 STUDY OS
 * MODEL REGISTRY
 * ============================================================
 *
 * Central definition of the seven selected AI choices.
 *
 * PRIMARY
 *   1. Nemotron 3 Ultra
 *   2. Nemotron 3 Super
 *   3. MiniMax M2.7
 *
 * FALLBACK
 *   4. LFM2.5-2.6B
 *   5. Dots3-Note Preview
 *
 * AUTOMATIC
 *   6. OpenRouter Auto Router
 *   7. OpenRouter Free Models Router
 *
 * IMPORTANT:
 * This file contains metadata only.
 * API communication is handled by openRouterClient.js.
 * ============================================================
 */

const MODELS = [

    // ========================================================
    // PRIMARY MODELS
    // ========================================================

    {
        id: 'nvidia/nemotron-3-ultra-550b-a55b',

        name: 'Nemotron 3 Ultra',

        provider: 'NVIDIA',

        category: 'primary',

        priority: 1,

        free: false,

        enabled: true,

        temporary: false,

        capabilities: [
            'reasoning',
            'planning',
            'deep-research',
            'general',
            'long-context',
            'agentic'
        ]
    },

    {
        id: 'nvidia/nemotron-3-super-120b-a12b',

        name: 'Nemotron 3 Super',

        provider: 'NVIDIA',

        category: 'primary',

        priority: 2,

        free: false,

        enabled: true,

        temporary: false,

        capabilities: [
            'reasoning',
            'planning',
            'general',
            'long-context',
            'agentic'
        ]
    },

    {
        id: 'minimax/minimax-m2.7',

        name: 'MiniMax M2.7',

        provider: 'MiniMax',

        category: 'primary',

        priority: 3,

        free: false,

        enabled: true,

        temporary: false,

        capabilities: [
            'reasoning',
            'planning',
            'general',
            'coding',
            'agentic',
            'document-generation'
        ]
    },


    // ========================================================
    // FALLBACK MODELS
    // ========================================================

    {
        id: 'liquid/lfm-2.5-2.6b',

        name: 'LFM2.5-2.6B',

        provider: 'Liquid AI',

        category: 'fallback',

        priority: 1,

        free: false,

        enabled: true,

        temporary: false,

        capabilities: [
            'general',
            'fast-response'
        ]
    },

    {
        id: 'dots-studio/dots-3',

        name: 'Dots3-Note Preview',

        provider: 'Dots Studio',

        category: 'fallback',

        priority: 2,

        free: true,

        enabled: true,

        temporary: true,

        expiresAt: '2026-09-30',

        capabilities: [
            'reasoning',
            'general',
            'coding',
            'multimodal',
            'long-context'
        ]
    },


    // ========================================================
    // AUTOMATIC ROUTERS
    // ========================================================

    {
        id: 'openrouter/auto',

        name: 'Auto Router',

        provider: 'OpenRouter',

        category: 'automatic',

        priority: 1,

        free: false,

        enabled: true,

        temporary: false,

        router: true,

        capabilities: [
            'automatic-routing',
            'general',
            'reasoning',
            'multimodal'
        ]
    },

    {
        id: 'openrouter/free',

        name: 'Free Models Router',

        provider: 'OpenRouter',

        category: 'automatic',

        priority: 2,

        free: true,

        enabled: true,

        temporary: false,

        router: true,

        capabilities: [
            'automatic-routing',
            'free-inference',
            'general'
        ]
    }

];


// ============================================================
// BASIC ACCESS
// ============================================================

function listModels() {

    return MODELS.filter(
        model => model.enabled
    );
}


function getModel(modelId) {

    return MODELS.find(
        model => model.id === modelId
    ) || null;
}


function hasModel(modelId) {

    return Boolean(
        getModel(modelId)
    );
}


// ============================================================
// CATEGORY ACCESS
// ============================================================

function listByCategory(category) {

    return MODELS
        .filter(
            model =>
                model.enabled &&
                model.category === category
        )
        .sort(
            (a, b) =>
                a.priority - b.priority
        );
}


function listPrimaryModels() {

    return listByCategory('primary');
}


function listFallbackModels() {

    return listByCategory('fallback');
}


function listAutomaticModels() {

    return listByCategory('automatic');
}


// ============================================================
// FREE / PAID
// ============================================================

function listFreeModels() {

    return MODELS.filter(
        model =>
            model.enabled &&
            model.free
    );
}


function listPaidModels() {

    return MODELS.filter(
        model =>
            model.enabled &&
            !model.free
    );
}


// ============================================================
// DEFAULTS
// ============================================================

function getDefaultPrimary() {

    return listPrimaryModels()[0] || null;
}


function getDefaultFallback() {

    return listFallbackModels()[0] || null;
}


function getDefaultAutomatic() {

    return listAutomaticModels()[0] || null;
}


function getDefaultFree() {

    return (
        getModel('openrouter/free') ||
        listFreeModels()[0] ||
        null
    );
}


// ============================================================
// VALIDATION
// ============================================================

function isEnabled(modelId) {

    const model = getModel(modelId);

    return Boolean(
        model &&
        model.enabled
    );
}


function isTemporary(modelId) {

    const model = getModel(modelId);

    return Boolean(
        model &&
        model.temporary
    );
}


module.exports = {

    MODELS,

    listModels,

    listByCategory,

    listPrimaryModels,

    listFallbackModels,

    listAutomaticModels,

    listFreeModels,

    listPaidModels,

    getModel,

    hasModel,

    getDefaultPrimary,

    getDefaultFallback,

    getDefaultAutomatic,

    getDefaultFree,

    isEnabled,

    isTemporary
};