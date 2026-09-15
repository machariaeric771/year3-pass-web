'use strict';

/*
 * ============================================================
 * YEAR 3 STUDY OS
 * AUTOMATIC ROUTER REGISTRY
 * ============================================================
 *
 * The two automatic choices are deliberately separated from
 * the ordinary model registry.
 *
 * AUTOMATIC
 *
 * 1. OpenRouter Auto Router
 *    openrouter/auto
 *
 * 2. OpenRouter Free Models Router
 *    openrouter/free
 *
 * These are routing endpoints rather than individual models.
 * ============================================================
 */

const ROUTERS = [

    {
        id: 'openrouter/auto',

        name: 'Auto Router',

        provider: 'OpenRouter',

        type: 'automatic',

        free: false,

        enabled: true,

        description:
            'Automatically selects a suitable OpenRouter model for the request.',

        capabilities: [
            'automatic-routing',
            'general',
            'reasoning',
            'multimodal',
            'long-context'
        ]
    },


    {
        id: 'openrouter/free',

        name: 'Free Models Router',

        provider: 'OpenRouter',

        type: 'automatic',

        free: true,

        enabled: true,

        description:
            'Automatically selects an available free OpenRouter model.',

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

function listRouters() {

    return ROUTERS.filter(
        router =>
            router.enabled
    );
}


function getRouter(routerId) {

    return ROUTERS.find(
        router =>
            router.id === routerId
    ) || null;
}


function hasRouter(routerId) {

    return Boolean(
        getRouter(routerId)
    );
}


// ============================================================
// ROUTER TYPES
// ============================================================

function listFreeRouters() {

    return ROUTERS.filter(
        router =>
            router.enabled &&
            router.free
    );
}


function listPaidRouters() {

    return ROUTERS.filter(
        router =>
            router.enabled &&
            !router.free
    );
}


// ============================================================
// DEFAULTS
// ============================================================

function getDefaultRouter() {

    return (
        getRouter(
            'openrouter/auto'
        ) ||
        listRouters()[0] ||
        null
    );
}


function getDefaultFreeRouter() {

    return (
        getRouter(
            'openrouter/free'
        ) ||
        listFreeRouters()[0] ||
        null
    );
}


// ============================================================
// ROUTER RESOLUTION
// ============================================================

function resolveRouter(routerId) {

    if (!routerId) {

        return getDefaultRouter();
    }


    const router =
        getRouter(routerId);


    if (!router) {

        throw new Error(
            `Unknown AI router: ${routerId}`
        );
    }


    if (!router.enabled) {

        throw new Error(
            `AI router is disabled: ${routerId}`
        );
    }


    return router;
}


// ============================================================
// CHECKS
// ============================================================

function isRouter(modelId) {

    return hasRouter(
        modelId
    );
}


function isAutomatic(modelId) {

    const router =
        getRouter(modelId);

    return Boolean(
        router &&
        router.type === 'automatic'
    );
}


module.exports = {

    ROUTERS,

    listRouters,

    getRouter,

    hasRouter,

    listFreeRouters,

    listPaidRouters,

    getDefaultRouter,

    getDefaultFreeRouter,

    resolveRouter,

    isRouter,

    isAutomatic
};