'use strict';

/*
 * ============================================================
 * YEAR 3 STUDY OS
 * GENERIC OPENAI-COMPATIBLE PROVIDER CLIENT
 *
 * Used by:
 *   - Groq
 *   - Mistral
 *   - Other OpenAI-compatible providers
 *
 * IMPORTANT:
 *   - Gemini has its own dedicated client.
 *   - OpenRouter has its existing dedicated client.
 *   - Do not put Gemini-specific logic here.
 * ============================================================
 */

class OpenAICompatibleClient {

    constructor(options = {}) {

        this.provider =
            String(
                options.provider ||
                ''
            )
            .trim()
            .toLowerCase();

        this.apiKey =
            options.apiKey ||
            this.resolveApiKey(
                this.provider
            ) ||
            '';

        this.baseUrl =
            options.baseUrl ||
            this.resolveBaseUrl(
                this.provider
            ) ||
            '';

        this.timeout =
            Number.isFinite(
                Number(options.timeout)
            )
                ? Number(options.timeout)
                : 60000;

        this.defaultHeaders =
            options.headers &&
            typeof options.headers === 'object'
                ? {
                    ...options.headers
                }
                : {};
    }


    /*
     * ========================================================
     * API KEY RESOLUTION
     * ========================================================
     */

    resolveApiKey(provider) {

        const keys = {

            groq:
                process.env.GROQ_API_KEY,

            mistral:
                process.env.MISTRAL_API_KEY,

            openrouter:
                process.env.OPENROUTER_API_KEY
        };

        return keys[provider] || '';
    }


    /*
     * ========================================================
     * BASE URL RESOLUTION
     * ========================================================
     */

    resolveBaseUrl(provider) {

        const urls = {

            groq:
                'https://api.groq.com/openai/v1',

            mistral:
                'https://api.mistral.ai/v1',

            openrouter:
                'https://openrouter.ai/api/v1'
        };

        return urls[provider] || '';
    }


    /*
     * ========================================================
     * CONFIGURATION
     * ========================================================
     */

    isConfigured() {

        return Boolean(
            this.apiKey &&
            this.baseUrl
        );
    }


    /*
     * ========================================================
     * PROVIDER INFORMATION
     * ========================================================
     */

    getProvider() {

        return this.provider;
    }


    getBaseUrl() {

        return this.baseUrl;
    }


    /*
     * ========================================================
     * URL BUILDER
     * ========================================================
     */

    buildChatCompletionsUrl() {

        return (
            this.baseUrl.replace(/\/+$/, '') +
            '/chat/completions'
        );
    }


    /*
     * ========================================================
     * TIMEOUT
     * ========================================================
     */

    createTimeoutSignal() {

        if (
            typeof AbortSignal !== 'undefined' &&
            typeof AbortSignal.timeout === 'function'
        ) {

            return AbortSignal.timeout(
                this.timeout
            );
        }

        const controller =
            new AbortController();

        setTimeout(
            () => controller.abort(),
            this.timeout
        );

        return controller.signal;
    }


    /*
     * ========================================================
     * MESSAGE NORMALIZATION
     * ========================================================
     */

    normalizeMessages(messages) {

        if (!Array.isArray(messages)) {
            return [];
        }

        return messages
            .filter(Boolean)
            .map(message => {

                const role =
                    String(
                        message?.role ||
                        'user'
                    )
                    .trim()
                    .toLowerCase();

                let content =
                    message?.content;

                /*
                 * Normal string content.
                 */

                if (
                    typeof content === 'string'
                ) {

                    return {
                        role,
                        content
                    };
                }

                /*
                 * Empty content.
                 */

                if (
                    content === null ||
                    content === undefined
                ) {

                    return {
                        role,
                        content: ''
                    };
                }

                /*
                 * Preserve structured content
                 * for compatible providers.
                 */

                return {
                    role,
                    content
                };

            })
            .filter(
                message =>
                    message.content !== ''
            );
    }


    /*
     * ========================================================
     * REQUEST BODY
     * ========================================================
     */

    buildRequestBody({

        model,

        messages = [],

        temperature = 0.2,

        maxTokens = 2048,

        responseFormat,

        topP,

        stop,

        stream = false

    } = {}) {

        if (!model) {

            throw new Error(
                `${this.provider || 'Provider'} model is required.`
            );
        }

        const normalizedMessages =
            this.normalizeMessages(
                messages
            );

        const body = {

            model,

            messages:
                normalizedMessages,

            temperature,

            stream
        };


        /*
         * ====================================================
         * TOKEN LIMIT
         *
         * Groq's current API documents
         * max_completion_tokens for chat completions.
         *
         * Other OpenAI-compatible providers can continue
         * using max_tokens.
         * ====================================================
         */

        if (
            this.provider === 'groq'
        ) {

            body.max_completion_tokens =
                maxTokens;

        } else {

            body.max_tokens =
                maxTokens;
        }


        /*
         * ====================================================
         * GROQ GPT-OSS
         *
         * GPT-OSS can return reasoning separately.
         * We explicitly request that reasoning not be included
         * so the normal assistant content is available to the
         * generic client.
         *
         * This does NOT expose or store reasoning.
         * ====================================================
         */

        if (
            this.provider === 'groq' &&
            this.isGPTOSSModel(model)
        ) {

            body.include_reasoning = false;
        }


        /*
         * ====================================================
         * OPTIONAL TOP-P
         * ====================================================
         */

        if (
            Number.isFinite(
                Number(topP)
            )
        ) {

            body.top_p =
                Number(topP);
        }


        /*
         * ====================================================
         * OPTIONAL STOP
         * ====================================================
         */

        if (
            Array.isArray(stop) &&
            stop.length > 0
        ) {

            body.stop = stop;
        }


        /*
         * ====================================================
         * JSON RESPONSE REQUEST
         *
         * Only add this when explicitly requested.
         *
         * This prevents incompatibilities with providers
         * that do not support structured output parameters
         * for a particular model.
         * ====================================================
         */

        if (
            responseFormat &&
            typeof responseFormat === 'object'
        ) {

            if (
                responseFormat.type
            ) {

                body.response_format =
                    responseFormat;
            }
        }


        return body;
    }


    /*
     * ========================================================
     * GPT-OSS MODEL DETECTION
     * ========================================================
     */

    isGPTOSSModel(model) {

        const normalized =
            String(
                model || ''
            )
            .trim()
            .toLowerCase();

        return (
            normalized.includes('gpt-oss-20b') ||
            normalized.includes('gpt-oss-120b')
        );
    }


    /*
     * ========================================================
     * ERROR CREATION
     * ========================================================
     */

    createProviderError(
        message,
        response,
        raw
    ) {

        const error =
            new Error(
                message ||
                `${this.provider || 'Provider'} request failed.`
            );

        error.provider =
            this.provider;

        error.status =
            response?.status ??
            null;

        error.statusCode =
            response?.status ??
            null;

        error.httpStatus =
            response?.status ??
            null;

        error.raw =
            raw || null;


        /*
         * Preserve Retry-After when available.
         */

        if (
            response?.headers &&
            typeof response.headers.get === 'function'
        ) {

            const retryAfter =
                response.headers.get(
                    'retry-after'
                );

            if (retryAfter) {

                error.retryAfter =
                    retryAfter;
            }
        }

        return error;
    }


    /*
     * ========================================================
     * RESPONSE TEXT EXTRACTION
     * ========================================================
     */

    extractText(raw) {

        /*
         * ====================================================
         * STANDARD OPENAI RESPONSE
         *
         * choices[0].message.content
         * ====================================================
         */

        const message =
            raw
                ?.choices?.[0]
                ?.message;


        const standardText =
            message?.content;


        if (
            typeof standardText === 'string' &&
            standardText.trim()
        ) {

            return standardText;
        }


        /*
         * ====================================================
         * CONTENT ARRAY
         *
         * Some compatible APIs may return:
         *
         * message.content = [
         *   { type: "text", text: "..." }
         * ]
         * ====================================================
         */

        if (
            Array.isArray(
                standardText
            )
        ) {

            const combined =
                standardText
                    .map(part => {

                        if (
                            typeof part === 'string'
                        ) {

                            return part;
                        }

                        if (
                            typeof part?.text === 'string'
                        ) {

                            return part.text;
                        }

                        if (
                            typeof part?.content === 'string'
                        ) {

                            return part.content;
                        }

                        return '';
                    })
                    .join('');

            if (
                combined.trim()
            ) {

                return combined;
            }
        }


        /*
         * ====================================================
         * CHOICE TEXT
         *
         * Defensive compatibility.
         * ====================================================
         */

        const choiceText =
            raw
                ?.choices?.[0]
                ?.text;

        if (
            typeof choiceText === 'string' &&
            choiceText.trim()
        ) {

            return choiceText;
        }


        /*
         * ====================================================
         * PROVIDER-SPECIFIC OUTPUT TEXT
         *
         * Some APIs expose output_text directly.
         * ====================================================
         */

        if (
            typeof raw?.output_text === 'string' &&
            raw.output_text.trim()
        ) {

            return raw.output_text;
        }


        /*
         * ====================================================
         * GENERIC MESSAGE TEXT
         * ====================================================
         */

        if (
            typeof message?.text === 'string' &&
            message.text.trim()
        ) {

            return message.text;
        }


        /*
         * ====================================================
         * DO NOT RETURN reasoning AS assistant content.
         *
         * GPT-OSS reasoning is not the final answer.
         * ====================================================
         */

        return '';
    }


    /*
     * ========================================================
     * COMPLETE
     * ========================================================
     */

    async complete({

        model,

        messages = [],

        temperature = 0.2,

        maxTokens = 2048,

        responseFormat,

        topP,

        stop

    } = {}) {

        /*
         * ====================================================
         * CONFIGURATION VALIDATION
         * ====================================================
         */

        if (
            !this.apiKey
        ) {

            throw new Error(
                `${this.provider || 'Provider'} API key is not configured.`
            );
        }


        if (
            !this.baseUrl
        ) {

            throw new Error(
                `${this.provider || 'Provider'} base URL is not configured.`
            );
        }


        if (!model) {

            throw new Error(
                `${this.provider || 'Provider'} model is required.`
            );
        }


        /*
         * ====================================================
         * REQUEST BODY
         * ====================================================
         */

        const body =
            this.buildRequestBody({

                model,

                messages,

                temperature,

                maxTokens,

                responseFormat,

                topP,

                stop,

                stream: false
            });


        /*
         * ====================================================
         * REQUEST
         * ====================================================
         */

        let response;

        try {

            response =
                await fetch(
                    this.buildChatCompletionsUrl(),
                    {

                        method: 'POST',

                        headers: {

                            'Content-Type':
                                'application/json',

                            'Authorization':
                                `Bearer ${this.apiKey}`,

                            ...this.defaultHeaders
                        },

                        body:
                            JSON.stringify(body),

                        signal:
                            this.createTimeoutSignal()
                    }
                );

        }
        catch (error) {

            /*
             * Preserve AbortError so HealthManager
             * can classify it as a timeout.
             */

            if (
                error?.name ===
                'AbortError'
            ) {

                const timeoutError =
                    new Error(
                        `${this.provider} request timed out.`
                    );

                timeoutError.name =
                    'AbortError';

                timeoutError.code =
                    'ETIMEDOUT';

                timeoutError.provider =
                    this.provider;

                throw timeoutError;
            }


            /*
             * Network failure.
             */

            error.provider =
                this.provider;

            throw error;
        }


        /*
         * ====================================================
         * RESPONSE BODY
         * ====================================================
         */

        const raw =
            await response
                .json()
                .catch(
                    () => ({})
                );


        /*
         * ====================================================
         * HTTP ERROR
         * ====================================================
         */

        if (
            !response.ok
        ) {

            const message =
                raw?.error?.message ||

                raw?.message ||

                raw?.detail ||

                `${this.provider} request failed (${response.status}).`;

            throw this.createProviderError(
                message,
                response,
                raw
            );
        }


        /*
         * ====================================================
         * EXTRACT FINAL ASSISTANT TEXT
         * ====================================================
         */

        const text =
            this.extractText(raw);


        /*
         * ====================================================
         * EMPTY RESPONSE
         *
         * Include enough diagnostic information to determine
         * what the provider actually returned without exposing
         * the API key.
         * ====================================================
         */

        if (
            !text ||
            !text.trim()
        ) {

            const emptyError =
                this.createProviderError(
                    `${this.provider} returned an empty response.`,
                    response,
                    raw
                );

            emptyError.responseShape = {
                hasChoices:
                    Array.isArray(raw?.choices),

                choiceCount:
                    Array.isArray(raw?.choices)
                        ? raw.choices.length
                        : 0,

                hasMessage:
                    Boolean(
                        raw?.choices?.[0]?.message
                    ),

                messageContentType:
                    raw?.choices?.[0]?.message
                        ? typeof raw.choices[0].message.content
                        : null,

                hasOutputText:
                    typeof raw?.output_text === 'string',

                finishReason:
                    raw?.choices?.[0]?.finish_reason ??
                    null
            };

            throw emptyError;
        }


        /*
         * ====================================================
         * SUCCESS
         * ====================================================
         */

        return {

            text,

            content:
                text,

            model,

            provider:
                this.provider,

            raw
        };
    }


    /*
     * ========================================================
     * HEALTH / CONFIGURATION TEST
     *
     * This does NOT make an API request.
     *
     * It only reports whether the provider has enough
     * configuration to attempt one.
     * ========================================================
     */

    getStatus() {

        return {

            provider:
                this.provider,

            configured:
                this.isConfigured(),

            hasApiKey:
                Boolean(this.apiKey),

            baseUrl:
                this.baseUrl || null
        };
    }
}


/*
 * ============================================================
 * EXPORT
 * ============================================================
 */

module.exports =
    OpenAICompatibleClient;


