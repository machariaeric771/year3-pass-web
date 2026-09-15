'use strict';

/*
 * ============================================================
 * YEAR 3 STUDY OS
 * LOCAL PROVIDER ROUTING TEST
 * ============================================================
 *
 * IMPORTANT:
 * This test DOES NOT call any AI API.
 *
 * It only loads providerRegistry.js and prints the
 * registered provider/model execution order.
 *
 * ============================================================
 */

const providerRegistry =
    require('./providerRegistry');

console.log('');
console.log('============================================================');
console.log(' YEAR 3 STUDY OS — PROVIDER ROUTING TEST');
console.log('============================================================');
console.log('');


// ============================================================
// PROVIDERS
// ============================================================

console.log('REGISTERED PROVIDERS');
console.log('--------------------');

const providers =
    providerRegistry.listProviders();

if (!providers.length) {

    console.log('NO PROVIDERS REGISTERED.');

} else {

    providers.forEach(
        (provider, index) => {

            console.log(
                `${index + 1}. ${provider.name} (${provider.id})`
            );

            console.log(
                `   Enabled: ${provider.enabled}`
            );

            console.log(
                `   Primary: ${provider.primary}`
            );

            console.log(
                `   Fallback: ${provider.fallback}`
            );

            console.log('');
        }
    );
}


// ============================================================
// ALL MODELS
// ============================================================

console.log('REGISTERED MODELS');
console.log('-----------------');

const models =
    providerRegistry.listModels();

if (!models.length) {

    console.log('NO MODELS REGISTERED.');

} else {

    models.forEach(
        (model, index) => {

            console.log(
                `${index + 1}. ${model.name}`
            );

            console.log(
                `   Provider: ${model.provider}`
            );

            console.log(
                `   Model ID: ${model.id}`
            );

            console.log(
                `   Key: ${model.key}`
            );

            console.log(
                `   Category: ${model.category}`
            );

            console.log(
                `   Free: ${model.free}`
            );

            console.log(
                `   Priority: ${model.priority}`
            );

            console.log('');
        }
    );
}


// ============================================================
// PRIMARY CHAIN
// ============================================================

console.log('PRIMARY MODEL CHAIN');
console.log('-------------------');

const primaryModels =
    providerRegistry.listPrimaryModels();

primaryModels.forEach(
    (model, index) => {

        console.log(
            `${index + 1}. ${model.provider} → ${model.id}`
        );

    }
);

console.log('');


// ============================================================
// FALLBACK CHAIN
// ============================================================

console.log('FALLBACK MODEL CHAIN');
console.log('--------------------');

const fallbackModels =
    providerRegistry.listFallbackModels();

fallbackModels.forEach(
    (model, index) => {

        console.log(
            `${index + 1}. ${model.provider} → ${model.id}`
        );

    }
);

console.log('');


// ============================================================
// COMPLETE EXECUTION CHAIN
// ============================================================

console.log('COMPLETE EXECUTION CHAIN');
console.log('------------------------');

const chain =
    [

        ...primaryModels,

        ...fallbackModels

    ];

if (!chain.length) {

    console.log(
        'NO MODELS AVAILABLE.'
    );

} else {

    chain.forEach(
        (model, index) => {

            console.log(
                `${index + 1}. ${model.provider} → ${model.name}`
            );

        }
    );
}

console.log('');


// ============================================================
// PROVIDER ORDER
// ============================================================

console.log('PROVIDER ORDER');
console.log('--------------');

const providerOrder =
    providerRegistry
        .getProviderChainOrder();

providerOrder.forEach(
    (provider, index) => {

        console.log(
            `${index + 1}. ${provider.name}`
        );

    }
);

console.log('');


// ============================================================
// EXPECTED STRUCTURE
// ============================================================

console.log('EXPECTED ROUTING');
console.log('----------------');

console.log(
    '1. OpenRouter → GPT-OSS 120B'
);

console.log(
    '2. OpenRouter → GPT-OSS 20B'
);

console.log(
    '3. Gemini → Gemini 2.5 Flash'
);

console.log(
    '4. Gemini → Gemini 2.5 Flash-Lite'
);

console.log('');


// ============================================================
// FINAL RESULT
// ============================================================

const expected =
    [
        'openrouter:openai/gpt-oss-120b',
        'openrouter:openai/gpt-oss-20b',
        'gemini:gemini-2.5-flash',
        'gemini:gemini-2.5-flash-lite'
    ];

const actual =
    chain.map(
        model =>
            `${model.provider}:${model.id}`
    );

const passed =
    expected.length === actual.length &&
    expected.every(
        (value, index) =>
            value === actual[index]
    );

console.log('ROUTING TEST RESULT');
console.log('-------------------');

if (passed) {

    console.log(
        'PASS — Provider/model chain is correctly registered.'
    );

} else {

    console.log(
        'FAIL — Provider/model chain does not match expected order.'
    );

    console.log('');
    console.log('Expected:');
    console.log(expected);

    console.log('');
    console.log('Actual:');
    console.log(actual);
}

console.log('');

console.log('============================================================');
console.log(' TEST COMPLETE — NO AI REQUEST WAS SENT');
console.log('============================================================');
console.log('');