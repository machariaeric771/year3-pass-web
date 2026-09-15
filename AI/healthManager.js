'use strict';

/*
 * ============================================================
 * YEAR 3 STUDY OS
 * AI HEALTH MANAGER
 * ============================================================
 *
 * PURPOSE
 *
 * Tracks the temporary health of every configured
 * provider/model combination.
 *
 * Example:
 *
 * OpenRouter → GPT-OSS 120B
 *      ↓ failure
 * cooldown
 *      ↓
 * OpenRouter → GPT-OSS 20B
 *      ↓ failure
 *      ↓
 * Gemini → 3.7 Flash
 *
 * IMPORTANT
 *
 * This manager:
 *
 * - does NOT store API keys
 * - does NOT modify provider configuration
 * - does NOT permanently disable models
 * - automatically recovers models after cooldown
 * - operates entirely in memory
 *
 * ============================================================
 */

class HealthManager {

    constructor(options = {}) {

        /*
         * ----------------------------------------------------
         * DEFAULT COOLDOWNS
         * ----------------------------------------------------
         */

        this.cooldowns = {

            rateLimit:
                Number(
                    options.rateLimitCooldown
                ) ||
                60 * 1000,

            quota:
                Number(
                    options.quotaCooldown
                ) ||
                60 * 1000,

            timeout:
                Number(
                    options.timeoutCooldown
                ) ||
                20 * 1000,

            network:
                Number(
                    options.networkCooldown
                ) ||
                20 * 1000,

            server:
                Number(
                    options.serverCooldown
                ) ||
                30 * 1000,

            auth:
                Number(
                    options.authCooldown
                ) ||
                10 * 60 * 1000,

            unknown:
                Number(
                    options.unknownCooldown
                ) ||
                30 * 1000
        };


        /*
         * ----------------------------------------------------
         * MAXIMUM COOLDOWN
         * ----------------------------------------------------
         *
         * Prevents accidental infinite cooldowns.
         */

        this.maxCooldown =
            Number(
                options.maxCooldown
            ) ||
            15 * 60 * 1000;


        /*
         * ----------------------------------------------------
         * HEALTH STATE
         * ----------------------------------------------------
         *
         * key:
         *
         * provider:model
         *
         */

        this.states =
            new Map();


        /*
         * ----------------------------------------------------
         * LAST SUCCESSFUL MODEL
         * ----------------------------------------------------
         */

        this.lastSuccessfulKey =
            null;
    }


    // ========================================================
    // KEY
    // ========================================================

    getKey(
        provider,
        modelId
    ) {

        return `${String(
            provider || 'unknown'
        ).trim().toLowerCase()}:${String(
            modelId || 'unknown'
        ).trim()}`;
    }


    // ========================================================
    // CREATE STATE
    // ========================================================

    createState(
        provider,
        modelId
    ) {

        const key =
            this.getKey(
                provider,
                modelId
            );


        if (
            !this.states.has(key)
        ) {

            this.states.set(
                key,
                {

                    key,

                    provider:
                        String(
                            provider ||
                            'unknown'
                        )
                        .trim()
                        .toLowerCase(),

                    modelId:
                        String(
                            modelId ||
                            ''
                        )
                        .trim(),

                    status:
                        'healthy',

                    failureType:
                        null,

                    consecutiveFailures:
                        0,

                    totalFailures:
                        0,

                    totalSuccesses:
                        0,

                    lastFailureAt:
                        null,

                    lastSuccessAt:
                        null,

                    cooldownUntil:
                        0,

                    lastError:
                        null

                }
            );
        }


        return this.states.get(
            key
        );
    }


    // ========================================================
    // ERROR CLASSIFICATION
    // ========================================================

    classifyError(
        error
    ) {

        if (!error) {

            return 'unknown';
        }


        const status =
            Number(
                error.status ||
                error.statusCode ||
                error.httpStatus ||
                error?.response?.status ||
                0
            );


        const code =
            String(
                error.code ||
                error?.cause?.code ||
                ''
            )
            .trim()
            .toLowerCase();


        const message =
            String(
                error.message ||
                error.error ||
                error?.response?.data?.error?.message ||
                ''
            )
            .trim()
            .toLowerCase();


        /*
         * ----------------------------------------------------
         * AUTHENTICATION / AUTHORIZATION
         * ----------------------------------------------------
         */

        if (
            status === 401 ||
            status === 403 ||
            code.includes('auth') ||
            code.includes('unauthorized') ||
            code.includes('forbidden') ||
            message.includes('api key') ||
            message.includes('authentication') ||
            message.includes('unauthorized') ||
            message.includes('forbidden') ||
            message.includes('invalid key') ||
            message.includes('invalid api')
        ) {

            return 'auth';
        }


        /*
         * ----------------------------------------------------
         * RATE LIMIT / QUOTA
         * ----------------------------------------------------
         */

        if (
            status === 429 ||
            code.includes('rate') ||
            code.includes('quota') ||
            code.includes('limit') ||
            message.includes('rate limit') ||
            message.includes('too many requests') ||
            message.includes('quota exceeded') ||
            message.includes('quota') ||
            message.includes('resource exhausted')
        ) {

            /*
             * Some providers return 429 for both
             * rate limiting and quota exhaustion.
             *
             * Treat both as temporary.
             */

            if (
                message.includes('quota') ||
                message.includes('resource exhausted')
            ) {

                return 'quota';
            }

            return 'rateLimit';
        }


        /*
         * ----------------------------------------------------
         * TIMEOUT
         * ----------------------------------------------------
         */

        if (
            code.includes('timeout') ||
            code === 'etimedout' ||
            message.includes('timeout') ||
            message.includes('timed out')
        ) {

            return 'timeout';
        }


        /*
         * ----------------------------------------------------
         * NETWORK
         * ----------------------------------------------------
         */

        if (
            code === 'enotfound' ||
            code === 'econnreset' ||
            code === 'econnrefused' ||
            code === 'enetunreach' ||
            code === 'eai_again' ||
            code.includes('network') ||
            message.includes('network error') ||
            message.includes('failed to fetch') ||
            message.includes('fetch failed') ||
            message.includes('connection reset') ||
            message.includes('connection refused')
        ) {

            return 'network';
        }


        /*
         * ----------------------------------------------------
         * SERVER
         * ----------------------------------------------------
         */

        if (
            status >= 500 &&
            status <= 599
        ) {

            return 'server';
        }


        /*
         * ----------------------------------------------------
         * UNKNOWN
         * ----------------------------------------------------
         */

        return 'unknown';
    }


    // ========================================================
    // COOLDOWN
    // ========================================================

    getCooldown(
        failureType,
        error
    ) {

        let cooldown =
            this.cooldowns[
                failureType
            ] ||
            this.cooldowns.unknown;


        /*
         * ----------------------------------------------------
         * RETRY-AFTER
         * ----------------------------------------------------
         *
         * Respect provider supplied retry information
         * when available.
         */

        const retryAfter =
            Number(
                error?.retryAfter ||
                error?.retryAfterMs ||
                error?.headers?.['retry-after'] ||
                0
            );


        if (
            retryAfter > 0
        ) {

            /*
             * If retry-after appears to be seconds,
             * convert it to milliseconds.
             */

            const retryAfterMs =
                retryAfter < 1000
                    ? retryAfter * 1000
                    : retryAfter;


            cooldown =
                Math.max(
                    cooldown,
                    retryAfterMs
                );
        }


        /*
         * ----------------------------------------------------
         * MAXIMUM
         * ----------------------------------------------------
         */

        cooldown =
            Math.min(
                cooldown,
                this.maxCooldown
            );


        return cooldown;
    }


    // ========================================================
    // AVAILABLE?
    // ========================================================

    isAvailable(
        provider,
        modelId
    ) {

        const state =
            this.createState(
                provider,
                modelId
            );


        const now =
            Date.now();


        /*
         * Cooldown expired.
         */

        if (
            state.cooldownUntil > 0 &&
            state.cooldownUntil <= now
        ) {

            state.status =
                'healthy';

            state.failureType =
                null;

            state.cooldownUntil =
                0;
        }


        return (
            state.cooldownUntil === 0
        );
    }


    // ========================================================
    // RECORD SUCCESS
    // ========================================================

    recordSuccess(
        provider,
        modelId
    ) {

        const state =
            this.createState(
                provider,
                modelId
            );


        state.status =
            'healthy';

        state.failureType =
            null;

        state.consecutiveFailures =
            0;

        state.totalSuccesses +=
            1;

        state.lastSuccessAt =
            new Date()
                .toISOString();

        state.cooldownUntil =
            0;

        state.lastError =
            null;


        this.lastSuccessfulKey =
            state.key;


        console.log(
            `[AI HEALTH] Healthy: ${state.key}`
        );


        return this.getStatus(
            provider,
            modelId
        );
    }


    // ========================================================
    // RECORD FAILURE
    // ========================================================

    recordFailure(
        provider,
        modelId,
        error
    ) {

        const state =
            this.createState(
                provider,
                modelId
            );


        const failureType =
            this.classifyError(
                error
            );


        const cooldown =
            this.getCooldown(
                failureType,
                error
            );


        state.status =
            'cooldown';

        state.failureType =
            failureType;

        state.consecutiveFailures +=
            1;

        state.totalFailures +=
            1;

        state.lastFailureAt =
            new Date()
                .toISOString();

        state.cooldownUntil =
            Date.now() +
            cooldown;

        state.lastError =
            String(
                error?.message ||
                error ||
                'Unknown error'
            );


        console.warn(

            `[AI HEALTH] Cooldown: ${state.key}`,

            `type=${failureType}`,

            `duration=${cooldown}ms`,

            `failures=${state.consecutiveFailures}`

        );


        return this.getStatus(
            provider,
            modelId
        );
    }


    // ========================================================
    // GET STATUS
    // ========================================================

    getStatus(
        provider,
        modelId
    ) {

        const state =
            this.createState(
                provider,
                modelId
            );


        /*
         * Refresh expired cooldown.
         */

        this.isAvailable(
            provider,
            modelId
        );


        const now =
            Date.now();


        const remaining =
            Math.max(
                0,
                state.cooldownUntil -
                now
            );


        return {

            key:
                state.key,

            provider:
                state.provider,

            modelId:
                state.modelId,

            status:
                state.cooldownUntil > now
                    ? 'cooldown'
                    : 'healthy',

            available:
                state.cooldownUntil <= now,

            failureType:
                state.failureType,

            consecutiveFailures:
                state.consecutiveFailures,

            totalFailures:
                state.totalFailures,

            totalSuccesses:
                state.totalSuccesses,

            lastFailureAt:
                state.lastFailureAt,

            lastSuccessAt:
                state.lastSuccessAt,

            cooldownUntil:
                state.cooldownUntil,

            cooldownRemaining:
                remaining,

            lastError:
                state.lastError

        };
    }


    // ========================================================
    // GET STATUS FOR MODEL
    // ========================================================

    getModelStatus(
        model
    ) {

        if (
            !model
        ) {

            return null;
        }


        return this.getStatus(
            model.provider ||
            'openrouter',
            model.id
        );
    }


    // ========================================================
    // GET ALL STATUS
    // ========================================================

    getAllStatus() {

        return Array
            .from(
                this.states.values()
            )
            .map(
                state =>
                    this.getStatus(
                        state.provider,
                        state.modelId
                    )
            );
    }


    // ========================================================
    // GET LAST SUCCESSFUL
    // ========================================================

    getLastSuccessful() {

        if (
            !this.lastSuccessfulKey
        ) {

            return null;
        }


        const state =
            this.states.get(
                this.lastSuccessfulKey
            );


        if (
            !state
        ) {

            return null;
        }


        return this.getStatus(
            state.provider,
            state.modelId
        );
    }


    // ========================================================
    // RESET ONE
    // ========================================================

    reset(
        provider,
        modelId
    ) {

        const key =
            this.getKey(
                provider,
                modelId
            );


        this.states.delete(
            key
        );


        if (
            this.lastSuccessfulKey ===
            key
        ) {

            this.lastSuccessfulKey =
                null;
        }


        return true;
    }


    // ========================================================
    // RESET ALL
    // ========================================================

    resetAll() {

        this.states.clear();

        this.lastSuccessfulKey =
            null;

        return true;
    }


    // ========================================================
    // PUBLIC SNAPSHOT
    // ========================================================

    getSnapshot() {

        return {

            lastSuccessful:
                this.getLastSuccessful(),

            models:
                this.getAllStatus(),

            timestamp:
                new Date()
                    .toISOString()

        };
    }
}


module.exports =
    HealthManager;