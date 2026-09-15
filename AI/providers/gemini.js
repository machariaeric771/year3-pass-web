'use strict';

/*
 * ============================================================
 * YEAR 3 STUDY OS
 * GEMINI PROVIDER CLIENT
 * ============================================================
 *
 * Google Gemini REST API client.
 *
 * The API key is read from:
 *
 *     GEMINI_API_KEY
 *
 * The key stays in the Electron main process.
 *
 * ============================================================
 */

const GEMINI_API_BASE =
    'https://generativelanguage.googleapis.com/v1beta/models';


class GeminiClient {

    constructor(options = {}) {

        this.apiKey =
            options.apiKey ||
            process.env.GEMINI_API_KEY ||
            '';

        this.baseUrl =
            options.baseUrl ||
            GEMINI_API_BASE;
    }


    // ========================================================
    // CONFIGURATION
    // ========================================================

    isConfigured() {

        return Boolean(
            String(
                this.apiKey || ''
            ).trim()
        );
    }


    // ========================================================
    // COMPLETE
    // ========================================================

    async complete({
        model,
        messages = [],
        temperature = 0.2,
        maxTokens = 2048,
        responseFormat
    } = {}) {

        if (!model) {

            throw new Error(
                'Gemini model is required.'
            );
        }


        if (!this.isConfigured()) {

            throw new Error(
                'Gemini API key is not configured.'
            );
        }


        /*
         * ----------------------------------------------------
         * CONVERT INTERNAL MESSAGE FORMAT
         * TO GEMINI CONTENT FORMAT
         * ----------------------------------------------------
         */

        const contents = [];

        let systemInstruction = '';


        for (
            const message
            of messages
        ) {

            const role =
                String(
                    message?.role || ''
                )
                .trim()
                .toLowerCase();

            const content =
                String(
                    message?.content || ''
                );


            if (!content) {
                continue;
            }


            /*
             * Gemini has a separate systemInstruction
             * field.
             */

            if (
                role === 'system'
            ) {

                systemInstruction +=
                    (
                        systemInstruction
                            ? '\n\n'
                            : ''
                    ) +
                    content;

                continue;
            }


            /*
             * OpenAI-style assistant role becomes
             * Gemini's "model" role.
             */

            const geminiRole =
                role === 'assistant'
                    ? 'model'
                    : 'user';


            contents.push({

                role:
                    geminiRole,

                parts: [

                    {
                        text:
                            content
                    }

                ]

            });
        }


        if (!contents.length) {

            throw new Error(
                'No Gemini-compatible messages were provided.'
            );
        }


        /*
         * ----------------------------------------------------
         * REQUEST BODY
         * ----------------------------------------------------
         */

        const body = {

            contents,

            generationConfig: {

                temperature,

                maxOutputTokens:
                    maxTokens

            }

        };


        /*
         * ----------------------------------------------------
         * SYSTEM INSTRUCTION
         * ----------------------------------------------------
         */

        if (
            systemInstruction
        ) {

            body.systemInstruction = {

                parts: [

                    {
                        text:
                            systemInstruction
                    }

                ]

            };
        }


        /*
         * ----------------------------------------------------
         * JSON RESPONSE FORMAT
         * ----------------------------------------------------
         */

        if (
            responseFormat &&
            (
                responseFormat.type ===
                'json_object'
                ||
                responseFormat.type ===
                'json'
            )
        ) {

            body.generationConfig.responseMimeType =
                'application/json';
        }


        /*
         * ----------------------------------------------------
         * REQUEST
         * ----------------------------------------------------
         */

        const url =
            `${this.baseUrl}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;


        const response =
            await fetch(
                url,
                {

                    method:
                        'POST',

                    headers: {

                        'Content-Type':
                            'application/json'

                    },

                    body:
                        JSON.stringify(body)

                }
            );


        /*
         * ----------------------------------------------------
         * ERROR HANDLING
         * ----------------------------------------------------
         */

        if (!response.ok) {

            let details = '';

            try {

                const errorBody =
                    await response.json();

                details =
                    errorBody?.error?.message ||
                    JSON.stringify(
                        errorBody
                    );

            } catch (_) {

                try {

                    details =
                        await response.text();

                } catch (_) {
                    details = '';
                }
            }


            throw new Error(

                `Gemini API request failed (${response.status})` +

                (
                    details
                        ? `: ${details}`
                        : ''
                )

            );
        }


        /*
         * ----------------------------------------------------
         * RESPONSE
         * ----------------------------------------------------
         */

        const data =
            await response.json();


        const candidates =
            Array.isArray(
                data?.candidates
            )
                ? data.candidates
                : [];


        const parts =
            candidates[0]
                ?.content
                ?.parts;


        const text =
            Array.isArray(parts)
                ? parts
                    .map(
                        part =>
                            part?.text || ''
                    )
                    .join('')
                    .trim()
                : '';


        if (!text) {

            throw new Error(
                'Gemini returned an empty response.'
            );
        }


        /*
         * Return a normalized-enough object for the
         * existing response manager.
         */

        return {

            text,

            model,

            provider:
                'gemini',

            raw:
                data

        };
    }
}


module.exports =
    GeminiClient;