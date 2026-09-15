'use strict';

require('dotenv').config();

const GeminiClient = require('./providers/gemini');

async function main() {
    console.log('');
    console.log('============================================================');
    console.log(' YEAR 3 STUDY OS — REAL GEMINI CONNECTION TEST');
    console.log('============================================================');
    console.log('');

    const client = new GeminiClient();

    console.log('Gemini API key configured:', client.isConfigured());

    if (!client.isConfigured()) {
        console.error('');
        console.error('FAIL — GEMINI_API_KEY is not available.');
        console.error('');
        process.exit(1);
    }

    console.log('Sending ONE real request to Gemini...');
    console.log('');

    try {
        const response = await client.complete({
            model: 'gemini-3.6-flash',
            messages: [
                {
                    role: 'user',
                    content:
                        'Reply with exactly: GEMINI CONNECTION SUCCESS'
                }
            ],
            temperature: 0,
            maxTokens: 50
        });

        console.log('------------------------------------------------------------');
        console.log('REAL GEMINI RESPONSE');
        console.log('------------------------------------------------------------');
        console.log(response.text);
        console.log('');

        console.log('------------------------------------------------------------');
        console.log('RESULT');
        console.log('------------------------------------------------------------');
        console.log('PASS — Gemini API request completed successfully.');
        console.log('Provider:', response.provider);
        console.log('Model:', response.model);
        console.log('');
        console.log('============================================================');
        console.log(' GEMINI TEST COMPLETE');
        console.log('============================================================');

    } catch (error) {
        console.error('');
        console.error('------------------------------------------------------------');
        console.error('GEMINI REQUEST FAILED');
        console.error('------------------------------------------------------------');
        console.error('Message:', error.message);
        console.error('Status:', error.status || 'N/A');
        console.error('Provider:', error.provider || 'N/A');
        console.error('');
        process.exit(1);
    }
}

main();