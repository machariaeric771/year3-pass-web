'use strict';

require('dotenv').config();

const GeminiClient = require('./providers/gemini');

const MODELS = [
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
];

async function testModel(client, model) {
    const started = Date.now();

    process.stdout.write(
        `\n[TEST] ${model}\n`
    );

    try {
        const response = await client.complete({
            model,
            messages: [
                {
                    role: 'user',
                    content:
                        'Reply with exactly: GEMINI MODEL TEST PASS'
                }
            ],
            temperature: 0,
            maxTokens: 30
        });

        const elapsed = Date.now() - started;

        console.log('  RESULT: PASS');
        console.log('  Response:', response.text);
        console.log('  Provider:', response.provider);
        console.log('  Model:', response.model);
        console.log('  Time:', `${elapsed} ms`);

        return {
            model,
            success: true,
            response: response.text,
            elapsed
        };

    } catch (error) {
        const elapsed = Date.now() - started;

        console.log('  RESULT: FAIL');
        console.log(
            '  Message:',
            error?.message || String(error)
        );
        console.log(
            '  Status:',
            error?.status || 'N/A'
        );
        console.log(
            '  Time:',
            `${elapsed} ms`
        );

        return {
            model,
            success: false,
            error: error?.message || String(error),
            status: error?.status || null,
            elapsed
        };
    }
}

async function main() {
    console.log('');
    console.log('============================================================');
    console.log(' YEAR 3 STUDY OS');
    console.log(' GEMINI MODEL AVAILABILITY TEST');
    console.log('============================================================');
    console.log('');

    const client = new GeminiClient();

    console.log(
        'Gemini API key configured:',
        client.isConfigured()
    );

    if (!client.isConfigured()) {
        console.error('');
        console.error(
            'FAIL — GEMINI_API_KEY is not available.'
        );
        console.error('');
        process.exit(1);
    }

    console.log('');
    console.log(
        `Models to test: ${MODELS.length}`
    );
    console.log('');
    console.log(
        'WARNING: This sends ONE real API request per model.'
    );
    console.log(
        'The test does not modify your application or provider registry.'
    );
    console.log('');

    const results = [];

    for (const model of MODELS) {
        const result = await testModel(client, model);
        results.push(result);
    }

    const passed = results.filter(
        result => result.success
    );

    const failed = results.filter(
        result => !result.success
    );

    console.log('');
    console.log('============================================================');
    console.log(' FINAL SUMMARY');
    console.log('============================================================');
    console.log('');

    console.log(
        `TOTAL TESTED : ${results.length}`
    );

    console.log(
        `PASSED       : ${passed.length}`
    );

    console.log(
        `FAILED       : ${failed.length}`
    );

    console.log('');

    console.log('WORKING MODELS');
    console.log('--------------');

    if (passed.length === 0) {
        console.log('None');
    } else {
        passed.forEach((result, index) => {
            console.log(
                `${index + 1}. ${result.model}`
            );
        });
    }

    console.log('');

    console.log('FAILED / UNAVAILABLE MODELS');
    console.log('---------------------------');

    if (failed.length === 0) {
        console.log('None');
    } else {
        failed.forEach((result, index) => {
            console.log(
                `${index + 1}. ${result.model}`
            );

            console.log(
                `   Status: ${result.status || 'N/A'}`
            );

            console.log(
                `   Error: ${result.error}`
            );
        });
    }

    console.log('');
    console.log('============================================================');
    console.log(' RECOMMENDED FALLBACK CANDIDATES');
    console.log('============================================================');
    console.log('');

    if (passed.length === 0) {
        console.log(
            'No working Gemini text models were detected.'
        );
    } else {
        passed.forEach((result, index) => {
            console.log(
                `${index + 1}. ${result.model}`
            );
        });
    }

    console.log('');
    console.log('============================================================');
    console.log(' GEMINI MODEL TEST COMPLETE');
    console.log('============================================================');
    console.log('');
}

main().catch(error => {
    console.error('');
    console.error('UNEXPECTED TEST ERROR');
    console.error(
        error?.message || String(error)
    );
    console.error('');
    process.exit(1);
});