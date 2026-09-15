'use strict';

/*
 * ============================================================
 * YEAR 3 PASS — Y3-013 LECTURE STUDIO
 * ============================================================
 *
 * Module files:
 *   module.js
 *   index.html
 *
 * Purpose:
 *   Long lecture notes / transcripts
 *        ↓
 *   Local chunking
 *        ↓
 *   Existing PASS AI Router
 *        ↓
 *   Structured lecture analysis
 *        ↓
 *   Global slide planning
 *        ↓
 *   Slide JSON
 *        ↓
 *   Preview / export
 *
 * IMPORTANT:
 * This module deliberately does NOT create another AI system.
 * It attempts to communicate with the existing PASS AI bridge.
 *
 * ============================================================
 */

(() => {

    const MODULE_ID = 'Y3-013-Lecture-Studio';
    const MODULE_NAME = 'Lecture Studio';
    const STORAGE_KEY = 'Y3_PASS_LECTURE_STUDIO_PROJECT';

    const state = {

        initialized: false,

        busy: false,

        cancelled: false,

        currentStage: 'idle',

        project: {
            id: null,

            title: 'Untitled Lecture',

            subject: 'Pharmacology',

            lectureType: 'Medical Lecture',

            detailLevel: 'Comprehensive',

            targetSlides: 'Auto',

            sourceText: '',

            analyses: [],

            slides: [],

            createdAt: null,

            updatedAt: null
        }

    };


    /* =========================================================
       BASIC UTILITIES
       ========================================================= */

    const $ = (id) => document.getElementById(id);


    function generateId(prefix = 'ls') {

        return (
            prefix +
            '_' +
            Date.now() +
            '_' +
            Math.random()
                .toString(36)
                .substring(2, 9)
        );
    }


    function escapeHtml(value) {

        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    function countWords(text) {

        if (!text || !String(text).trim()) {
            return 0;
        }

        return String(text)
            .trim()
            .split(/\s+/)
            .length;
    }


    function safeFilename(name) {

        return String(name || 'lecture')
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
            .replace(/\s+/g, '_')
            .slice(0, 100) || 'lecture';
    }


    function updateTimestamp() {

        state.project.updatedAt = new Date().toISOString();
    }


    /* =========================================================
       UI HELPERS
       ========================================================= */

    function setStatus(message, type = 'info') {

        const element = $('lsStatus');

        if (!element) {
            return;
        }

        element.textContent = message;

        element.dataset.type = type;
    }


    function setProgress(percent, message) {

        const bar = $('lsProgressBar');

        const text = $('lsProgressText');

        const safePercent = Math.max(
            0,
            Math.min(100, Number(percent) || 0)
        );

        if (bar) {

            bar.style.width =
                safePercent + '%';
        }

        if (text) {

            text.textContent =
                message ||
                `${Math.round(safePercent)}%`;
        }
    }


    function updateStatistics() {

        const source =
            state.project.sourceText || '';

        const words =
            countWords(source);

        const characters =
            source.length;

        const slides =
            Array.isArray(state.project.slides)
                ? state.project.slides.length
                : 0;


        if ($('wordCount')) {

            $('wordCount').textContent =
                words.toLocaleString();
        }


        if ($('charCount')) {

            $('charCount').textContent =
                characters.toLocaleString();
        }


        if ($('slideCount')) {

            $('slideCount').textContent =
                slides.toLocaleString();
        }


        if ($('sourceSize')) {

            $('sourceSize').textContent =
                words
                    ? `${words.toLocaleString()} words`
                    : 'No source';
        }
    }


    /* =========================================================
       PROJECT MANAGEMENT
       ========================================================= */

    function createEmptyProject() {

        return {

            id: generateId('project'),

            title: 'Untitled Lecture',

            subject: 'Pharmacology',

            lectureType: 'Medical Lecture',

            detailLevel: 'Comprehensive',

            targetSlides: 'Auto',

            sourceText: '',

            analyses: [],

            slides: [],

            createdAt: new Date().toISOString(),

            updatedAt: new Date().toISOString()
        };
    }


    function syncFormToProject() {

        if ($('lectureTitle')) {

            state.project.title =
                $('lectureTitle').value.trim() ||
                'Untitled Lecture';
        }


        if ($('subject')) {

            state.project.subject =
                $('subject').value;
        }


        if ($('lectureType')) {

            state.project.lectureType =
                $('lectureType').value;
        }


        if ($('detail')) {

            state.project.detailLevel =
                $('detail').value;
        }


        if ($('targetSlides')) {

            state.project.targetSlides =
                $('targetSlides').value;
        }


        if ($('sourceText')) {

            state.project.sourceText =
                $('sourceText').value;
        }


        updateTimestamp();
    }


    function loadProjectIntoForm() {

        if ($('lectureTitle')) {

            $('lectureTitle').value =
                state.project.title || '';
        }


        if ($('subject')) {

            $('subject').value =
                state.project.subject ||
                'Pharmacology';
        }


        if ($('lectureType')) {

            $('lectureType').value =
                state.project.lectureType ||
                'Medical Lecture';
        }


        if ($('detail')) {

            $('detail').value =
                state.project.detailLevel ||
                'Comprehensive';
        }


        if ($('targetSlides')) {

            $('targetSlides').value =
                state.project.targetSlides ||
                'Auto';
        }


        if ($('sourceText')) {

            $('sourceText').value =
                state.project.sourceText || '';
        }
    }


    function saveProject() {

        syncFormToProject();

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(state.project)
            );

        } catch (error) {

            console.warn(
                '[LECTURE STUDIO] Could not save project:',
                error
            );
        }

        updateStatistics();
    }


    function restoreProject() {

        try {

            const raw =
                localStorage.getItem(
                    STORAGE_KEY
                );

            if (!raw) {

                state.project =
                    createEmptyProject();

                return;
            }


            const saved =
                JSON.parse(raw);


            if (
                !saved ||
                typeof saved !== 'object'
            ) {

                state.project =
                    createEmptyProject();

                return;
            }


            state.project = {

                ...createEmptyProject(),

                ...saved,

                analyses:
                    Array.isArray(saved.analyses)
                        ? saved.analyses
                        : [],

                slides:
                    Array.isArray(saved.slides)
                        ? saved.slides
                        : []
            };


        } catch (error) {

            console.warn(
                '[LECTURE STUDIO] Project restoration failed:',
                error
            );

            state.project =
                createEmptyProject();
        }


        loadProjectIntoForm();

        updateStatistics();
    }


    function newProject() {

        if (
            state.project.sourceText ||
            state.project.slides.length
        ) {

            const confirmed =
                window.confirm(
                    'Start a new Lecture Studio project? The current unsaved project will be replaced.'
                );

            if (!confirmed) {
                return;
            }
        }


        state.project =
            createEmptyProject();


        loadProjectIntoForm();

        renderSlides();

        saveProject();


        setProgress(
            0,
            'Ready'
        );


        setStatus(
            'New Lecture Studio project created.',
            'success'
        );
    }


    /* =========================================================
       LARGE-TEXT PROCESSING
       ========================================================= */

    /*
     * The whole lecture does NOT need to be sent to the AI
     * in one request.
     *
     * We preserve paragraph boundaries wherever possible.
     */

    function splitIntoChunks(
        text,
        maxCharacters = 18000
    ) {

        const normalized =
            String(text || '')
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n')
                .trim();


        if (!normalized) {

            return [];
        }


        const paragraphs =
            normalized
                .split(/\n{2,}/)
                .map(
                    paragraph =>
                        paragraph.trim()
                )
                .filter(Boolean);


        const chunks = [];

        let current = '';


        for (
            const paragraph
            of paragraphs
        ) {

            if (!current) {

                current =
                    paragraph;

                continue;
            }


            const proposed =
                current +
                '\n\n' +
                paragraph;


            if (
                proposed.length <=
                maxCharacters
            ) {

                current =
                    proposed;

            } else {

                chunks.push(
                    current
                );

                current =
                    paragraph;
            }
        }


        if (current) {

            chunks.push(current);
        }


        /*
         * Handle an individual paragraph
         * that is itself larger than the
         * chunk limit.
         */

        const finalChunks = [];


        for (
            const chunk
            of chunks
        ) {

            if (
                chunk.length <=
                maxCharacters
            ) {

                finalChunks.push(
                    chunk
                );

                continue;
            }


            for (
                let index = 0;
                index < chunk.length;
                index += maxCharacters
            ) {

                finalChunks.push(
                    chunk.slice(
                        index,
                        index + maxCharacters
                    )
                );
            }
        }


        return finalChunks;
    }


    /* =========================================================
       AI BRIDGE
       ========================================================= */

    /*
     * Different versions of PASS may expose
     * different preload methods.
     *
     * We therefore try compatible bridges
     * instead of hard-coding one provider.
     *
     * The actual provider remains controlled
     * by the existing PASS AI router.
     */

    function normalizeAIResponse(result) {

        if (
            result === null ||
            result === undefined
        ) {

            return '';
        }


        if (
            typeof result ===
            'string'
        ) {

            return result;
        }


        if (
            typeof result.answer ===
            'string'
        ) {

            return result.answer;
        }


        if (
            typeof result.text ===
            'string'
        ) {

            return result.text;
        }


        if (
            typeof result.response ===
            'string'
        ) {

            return result.response;
        }


        if (
            typeof result.content ===
            'string'
        ) {

            return result.content;
        }


        if (
            result.message &&
            typeof result.message ===
            'string'
        ) {

            return result.message;
        }


        if (
            Array.isArray(result)
        ) {

            return result
                .map(normalizeAIResponse)
                .join('\n');
        }


        try {

            return JSON.stringify(
                result
            );

        } catch (_) {

            return String(result);
        }
    }


    async function callPASSAI(prompt, options = {}) {
    const text = String(prompt || '').trim();

    if (!text) {
        throw new Error('Lecture Studio generated an empty AI prompt.');
    }

    const context = {
        moduleId: MODULE_ID,
        moduleName: MODULE_NAME,
        subject: state.project?.subject || '',
        topic: state.project?.title || '',
        ...options.context
    };

    /*
     * ============================================================
     * PRIMARY PASS AI BRIDGE
     * ============================================================
     *
     * The Year 3 PASS Electron AI IPC expects:
     *
     *     { message: "..." }
     *
     * NOT:
     *
     *     { prompt: "..." }
     */

    const adapters = [
        {
            name: 'window.year3.ai.ask',
            available: () =>
                window.year3?.ai &&
                typeof window.year3.ai.ask === 'function',
            call: () =>
                window.year3.ai.ask({
                    message: text,
                    context
                })
        },

        {
            name: 'window.api.askAssistant',
            available: () =>
                window.api &&
                typeof window.api.askAssistant === 'function',
            call: () =>
                window.api.askAssistant({
                    question: text,
                    useOnlyUploaded: false,
                    context
                })
        },

        {
            name: 'window.api.generateNotes',
            available: () =>
                window.api &&
                typeof window.api.generateNotes === 'function',
            call: () =>
                window.api.generateNotes({
                    message: text,
                    prompt: text,
                    context
                })
        },

        {
            name: 'window.api.aiRequest',
            available: () =>
                window.api &&
                typeof window.api.aiRequest === 'function',
            call: () =>
                window.api.aiRequest({
                    message: text,
                    prompt: text,
                    context
                })
        }
    ];

    let lastError = null;

    for (const adapter of adapters) {
        if (!adapter.available()) {
            continue;
        }

        try {
            console.log(
                `[LECTURE STUDIO] Trying AI adapter: ${adapter.name}`
            );

            const result = await adapter.call();

            /*
             * Normalize every supported response format.
             */
            if (typeof result === 'string') {
                return result;
            }

            if (result?.text) {
                return String(result.text);
            }

            if (result?.response) {
                return String(result.response);
            }

            if (result?.content) {
                return String(result.content);
            }

            if (result?.answer) {
                return String(result.answer);
            }

            if (result?.message) {
                return String(result.message);
            }

            /*
             * Some AI bridges return:
             * { success: true, data: ... }
             */
            if (result?.data) {
                if (typeof result.data === 'string') {
                    return result.data;
                }

                if (result.data.text) {
                    return String(result.data.text);
                }

                if (result.data.response) {
                    return String(result.data.response);
                }

                if (result.data.content) {
                    return String(result.data.content);
                }
            }

            /*
             * Do not silently stringify an empty/undefined result.
             */
            if (result !== undefined && result !== null) {
                const serialized = JSON.stringify(result);

                if (serialized && serialized !== '{}') {
                    return serialized;
                }
            }

            throw new Error(
                `AI adapter "${adapter.name}" returned no usable response.`
            );

        } catch (error) {
            lastError = error;

            console.warn(
                `[LECTURE STUDIO] AI adapter "${adapter.name}" failed:`,
                error
            );
        }
    }

    throw lastError || new Error(
        'No compatible PASS AI bridge was found.'
    );
}


    /* =========================================================
       JSON PROCESSING
       ========================================================= */

    function cleanAIJSON(text) {

        let value =
            String(text || '')
                .trim();


        value =
            value
                .replace(
                    /^```json\s*/i,
                    ''
                )
                .replace(
                    /^```\s*/i,
                    ''
                )
                .replace(
                    /\s*```$/i,
                    ''
                )
                .trim();


        /*
         * Find the outermost JSON object
         * if the model added commentary.
         */

        const first =
            value.indexOf('{');

        const last =
            value.lastIndexOf('}');


        if (
            first >= 0 &&
            last > first
        ) {

            value =
                value.slice(
                    first,
                    last + 1
                );
        }


        return value;
    }


    function parseAIJSON(raw) {
    if (raw === null || raw === undefined) {
        throw new Error("AI returned an empty response.");
    }

    let text = String(raw).trim();

    // ---------------------------------------------------------
    // 1. Remove markdown code fences
    // ---------------------------------------------------------
    text = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    // ---------------------------------------------------------
    // 2. Extract the outermost JSON object/array
    // ---------------------------------------------------------
    const firstObject = text.indexOf("{");
    const firstArray = text.indexOf("[");

    let start = -1;

    if (firstObject === -1) {
        start = firstArray;
    } else if (firstArray === -1) {
        start = firstObject;
    } else {
        start = Math.min(firstObject, firstArray);
    }

    if (start === -1) {
        console.error("[LECTURE STUDIO] No JSON object or array found.");
        console.error("[LECTURE STUDIO] Raw AI response:", text);
        throw new Error("The AI did not return JSON.");
    }

    text = text.slice(start).trim();

    // ---------------------------------------------------------
    // 3. Clean common JSON problems
    // ---------------------------------------------------------
    text = text
        // Remove illegal control characters except tab/newline/carriage return
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        // Normalize smart quotes
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        // Remove trailing commas before } or ]
        .replace(/,\s*([}\]])/g, "$1");

    // ---------------------------------------------------------
    // 4. Try normal JSON first
    // ---------------------------------------------------------
    try {
        return JSON.parse(text);
    } catch (firstError) {
        console.warn(
            "[LECTURE STUDIO] Initial JSON parse failed. Attempting structural repair..."
        );
    }

    // ---------------------------------------------------------
    // 5. Structural repair
    //
    // This is important for your current error.
    //
    // If the AI stops after:
    //
    // "comparisons": [
    //   "...",
    //   "..."
    //
    // we automatically add:
    //
    // ]
    // }
    //
    // while respecting strings.
    // ---------------------------------------------------------
    function closeOpenJSONStructures(input) {
        const stack = [];

        let inString = false;
        let escaped = false;

        for (let i = 0; i < input.length; i++) {
            const char = input[i];

            if (inString) {
                if (escaped) {
                    escaped = false;
                    continue;
                }

                if (char === "\\") {
                    escaped = true;
                    continue;
                }

                if (char === '"') {
                    inString = false;
                }

                continue;
            }

            if (char === '"') {
                inString = true;
                continue;
            }

            if (char === "{") {
                stack.push("}");
            } else if (char === "[") {
                stack.push("]");
            } else if (char === "}" || char === "]") {
                if (stack.length && stack[stack.length - 1] === char) {
                    stack.pop();
                }
            }
        }

        let repaired = input;

        // -----------------------------------------------------
        // If the AI stopped inside a string, close the string.
        // -----------------------------------------------------
        if (inString) {
            if (escaped) {
                repaired += "\\";
            }

            repaired += '"';
        }

        // -----------------------------------------------------
        // Remove trailing comma before adding closing brackets.
        // -----------------------------------------------------
        repaired = repaired.replace(/,\s*$/, "");

        // -----------------------------------------------------
        // Close structures in reverse order.
        // -----------------------------------------------------
        while (stack.length) {
            repaired += stack.pop();
        }

        return repaired;
    }

    // ---------------------------------------------------------
    // 6. Repair truncated JSON
    // ---------------------------------------------------------
    let repaired = closeOpenJSONStructures(text);

    // Remove trailing commas again after structural repair.
    repaired = repaired.replace(/,\s*([}\]])/g, "$1");

    try {
        const result = JSON.parse(repaired);

        console.warn(
            "[LECTURE STUDIO] JSON successfully recovered by structural repair."
        );

        return result;
    } catch (repairError) {
        console.warn(
            "[LECTURE STUDIO] Structural repair failed. Attempting additional cleanup..."
        );
    }

    // ---------------------------------------------------------
    // 7. Additional conservative repairs
    // ---------------------------------------------------------
    let repaired2 = repaired;

    // Insert missing comma between a completed JSON value and
    // the next object/array/string where appropriate.
    repaired2 = repaired2.replace(
        /([}\]])\s*(["{[])/g,
        "$1,\n$2"
    );

    // Insert missing comma between adjacent quoted values.
    repaired2 = repaired2.replace(
        /("(?:\\.|[^"\\])*")\s*\n\s*("(?:\\.|[^"\\])*")/g,
        "$1,\n$2"
    );

    // Remove trailing commas again.
    repaired2 = repaired2.replace(/,\s*([}\]])/g, "$1");

    // Close anything that became open after the repairs.
    repaired2 = closeOpenJSONStructures(repaired2);

    try {
        const result = JSON.parse(repaired2);

        console.warn(
            "[LECTURE STUDIO] JSON successfully recovered after secondary repair."
        );

        return result;
    } catch (finalError) {
        console.error(
            "[LECTURE STUDIO] JSON parse failed after all repair attempts."
        );

        console.error(
            "[LECTURE STUDIO] Raw AI response:",
            text
        );

        console.error(
            "[LECTURE STUDIO] Repaired response:",
            repaired2
        );

        console.error(
            "[LECTURE STUDIO] Original parse error:",
            finalError
        );

        throw new Error(
            "The AI returned malformed or truncated JSON. " +
            "Lecture Studio attempted automatic repair but could not recover the response."
        );
    }
}


    /* =========================================================
       PROMPTS
       ========================================================= */

    function buildAnalysisPrompt(
        chunk,
        chunkNumber,
        totalChunks
    ) {

        return `
You are the content-analysis engine inside a Year 3 MBChB Lecture Studio.

Your job is to analyze the supplied lecture material accurately so another AI stage can convert it into teaching slides.

DO NOT invent information.

SUBJECT:
${state.project.subject}

LECTURE TYPE:
${state.project.lectureType}

DETAIL LEVEL:
${state.project.detailLevel}

SOURCE CHUNK:
${chunkNumber} of ${totalChunks}

Return ONLY valid JSON using exactly this general structure:

{
  "sectionTitle": "Best title for this section",
  "mainConcepts": [],
  "definitions": [],
  "classifications": [],
  "mechanisms": [],
  "pathogenesis": [],
  "clinicalFeatures": [],
  "investigations": [],
  "diagnosis": [],
  "management": [],
  "pharmacology": [],
  "adverseEffects": [],
  "contraindications": [],
  "interactions": [],
  "comparisons": [],
  "clinicalCorrelations": [],
  "highYield": [],
  "examPearls": [],
  "tables": [
    {
      "title": "",
      "columns": [],
      "rows": []
    }
  ],
  "sourceCoverage": ""
}

RULES:

1. Only populate categories supported by the supplied source.
2. Preserve important details.
3. Do not fabricate drug doses, diagnostic criteria, statistics, guidelines or facts.
4. Keep important distinctions.
5. Identify information particularly useful for Year 3 MBChB examinations.
6. If the source is a lecturer transcript, preserve the lecturer's teaching sequence where useful.
7. Do not summarize away clinically important details.

SOURCE MATERIAL:

${chunk}
`;
    }


    function buildDeckPrompt(
        analyses
    ) {

        const targetInstruction =
            state.project.targetSlides ===
            'Auto'
                ? `
Choose the appropriate number of slides.
Do not artificially compress a comprehensive lecture.
`
                : `
Aim for approximately
${state.project.targetSlides}
slides.
`;


        return `
You are a senior medical educator designing a Year 3 MBChB lecture.

Create a comprehensive teaching presentation from the structured source analysis below.

SUBJECT:
${state.project.subject}

LECTURE TYPE:
${state.project.lectureType}

DETAIL LEVEL:
${state.project.detailLevel}

${targetInstruction}

CORE REQUIREMENTS:

1. Teach from basic concepts toward clinical application.
2. Preserve important information.
3. Do not fabricate facts.
4. Do not turn long paragraphs into unreadable slides.
5. Use concise teaching bullets.
6. Use comparison tables when appropriate.
7. Use stepwise slides for mechanisms, pathways and processes.
8. Include learning objectives.
9. Include clinically relevant information where supported.
10. Include high-yield examination points.
11. Include important exceptions.
12. Avoid unnecessary repetition.
13. A comprehensive lecture may contain many slides.
14. Keep each slide focused on one main teaching purpose.
15. Do not put huge paragraphs on slides.
16. Do not remove important details merely to make the deck short.

Return ONLY valid JSON.

Use exactly this overall structure:

{
  "title": "Presentation title",
  "subtitle": "Short subtitle",
  "learningObjectives": [
    "objective"
  ],
  "slides": [
    {
      "type": "title",
      "title": "",
      "subtitle": "",
      "bullets": [],
      "steps": [],
      "table": null,
      "callout": "",
      "speakerNotes": ""
    }
  ]
}

Allowed slide types:

title
objectives
section
content
mechanism
comparison
table
clinical
high-yield
case
summary

SLIDE DESIGN RULES:

TITLE:
Introduce the lecture.

OBJECTIVES:
3–6 meaningful learning objectives.

SECTION:
Use for major transitions.

CONTENT:
Use for normal teaching concepts.

MECHANISM:
Use numbered steps when explaining mechanisms.

COMPARISON:
Use for differences between drugs, organisms, diseases, pathways or concepts.

TABLE:
Use structured rows and columns.

CLINICAL:
Connect science to clinical practice.

HIGH-YIELD:
Highlight genuinely important examination points.

CASE:
Use only if the supplied material supports a case.

SUMMARY:
Consolidate the most important material.

For bullets:
- Prefer 3–7 bullets.
- Avoid paragraphs.
- Each bullet should normally communicate one idea.
- Preserve necessary detail.

For speakerNotes:
Provide concise teaching guidance where useful.

SOURCE ANALYSIS:

${JSON.stringify(analyses)}
`;
    }


    /* =========================================================
       SOURCE ANALYSIS
       ========================================================= */

    async function analyzeLectureSource() {

        const source =
            state.project.sourceText.trim();


        if (!source) {

            throw new Error(
                'Paste your lecture notes or transcript first.'
            );
        }


        const chunks =
            splitIntoChunks(
                source,
                18000
            );


        if (!chunks.length) {

            throw new Error(
                'No usable source material was found.'
            );
        }


        const analyses = [];


        for (
            let index = 0;
            index < chunks.length;
            index++
        ) {

            if (state.cancelled) {

                throw new Error(
                    'Generation cancelled.'
                );
            }


            const percent =
                5 +
                Math.round(
                    (
                        index /
                        chunks.length
                    ) * 55
                );


            setProgress(
                percent,
                `Analyzing source ${index + 1} of ${chunks.length}`
            );


            setStatus(
                `Analyzing lecture section ${index + 1} of ${chunks.length}...`
            );


            const prompt =
                buildAnalysisPrompt(
                    chunks[index],
                    index + 1,
                    chunks.length
                );


            const response =
                await callPASSAI(
                    prompt,
                    {
                        stage:
                            'source-analysis',

                        chunk:
                            index + 1,

                        totalChunks:
                            chunks.length
                    }
                );


            const parsed =
                parseAIJSON(
                    response
                );


            if (parsed) {

                analyses.push(
                    parsed
                );

            } else {

                /*
                 * Do not throw away the AI response
                 * if JSON formatting failed.
                 */

                analyses.push({

                    sectionTitle:
                        `Source section ${index + 1}`,

                    mainConcepts: [
                        response
                    ],

                    sourceCoverage:
                        'AI response was retained because it was not returned as JSON.'
                });
            }
        }


        state.project.analyses =
            analyses;


        return analyses;
    }


    /* =========================================================
       SLIDE GENERATION
       ========================================================= */

    /* =========================================================
   SLIDE GENERATION
   ========================================================= */

/* =========================================================
   SLIDE GENERATION
   One AI request per slide.
   This prevents large JSON responses from being truncated.
   ========================================================= */

async function createSlideDeck(analyses) {

    if (state.cancelled) {
        throw new Error('Generation cancelled.');
    }

    const requestedSlides =
        Number(state.project.targetSlides);

    const totalSlides =
        Number.isFinite(requestedSlides) &&
        requestedSlides > 0
            ? requestedSlides
            : 20;


    const allSlides = [];


    let presentationTitle =
        state.project.title ||
        'Lecture Presentation';


    let presentationSubtitle = '';


    let learningObjectives = [];


    setProgress(
        68,
        `Preparing ${totalSlides} individual slides`
    );


    /*
     * Generate one slide at a time.
     */
    for (
        let slideIndex = 0;
        slideIndex < totalSlides;
        slideIndex++
    ) {

        if (state.cancelled) {
            throw new Error('Generation cancelled.');
        }


        const slideNumber =
            slideIndex + 1;


        const progress =
            68 +
            Math.round(
                (slideIndex / totalSlides) * 25
            );


        setProgress(
            progress,
            `Generating slide ${slideNumber} of ${totalSlides}`
        );


        setStatus(
            `Generating slide ${slideNumber} of ${totalSlides}...`
        );


        /*
         * Give this request only the relevant analysis section.
         */
        const analysisCount =
            analyses.length;


        const analysisIndex =
            Math.min(
                analysisCount - 1,
                Math.floor(
                    (slideIndex / totalSlides) *
                    analysisCount
                )
            );


        const relevantAnalysis =
            analyses[
                Math.max(
                    0,
                    analysisIndex
                )
            ];


        /*
         * Use the existing deck prompt as the base so we retain
         * the medical-education instructions already built into
         * Lecture Studio.
         */
        let prompt =
            buildDeckPrompt(
                [
                    relevantAnalysis
                ]
            );


        /*
         * Override the output requirement.
         */
        prompt += `

=========================================================
SINGLE-SLIDE GENERATION MODE
=========================================================

You are generating ONLY ONE slide for a larger lecture
presentation.

Current slide number: ${slideNumber}
Total presentation slides: ${totalSlides}

Generate ONLY slide ${slideNumber}.

DO NOT generate the complete presentation.

DO NOT generate multiple slides.

DO NOT return:
- title
- subtitle
- learningObjectives
- slides array
- markdown
- explanations
- commentary

Return ONLY ONE JSON OBJECT representing the slide.

Use EXACTLY this structure:

{
  "type": "content",
  "title": "Slide title",
  "subtitle": "Short subtitle",
  "bullets": [
    "Concise medically important point",
    "Concise medically important point",
    "Concise medically important point"
  ],
  "steps": [],
  "table": null,
  "callout": "",
  "speakerNotes": "Short teaching note."
}

=========================================================
CONTENT RULES
=========================================================

1. Produce exactly ONE slide.

2. Keep the response SHORT enough to avoid truncation.

3. Use 3-5 concise bullets where appropriate.

4. Do not put long paragraphs into bullets.

5. Keep speakerNotes to 1-2 concise sentences.

6. Use a table only when a table genuinely improves
   understanding.

7. Do not repeat material unnecessarily.

8. Maintain logical progression through the lecture.

9. Prioritize undergraduate medical examination relevance.

10. Preserve clinically important distinctions,
    mechanisms, investigations, treatment principles,
    adverse effects, contraindications and clinical
    correlations where relevant.

11. Return VALID JSON ONLY.

12. Do not use markdown code fences.

=========================================================
`;


        console.log(
            `[LECTURE STUDIO] Generating slide ${slideNumber}/${totalSlides}...`
        );


        let response;


        try {

            response =
                await callPASSAI(
                    prompt,
                    {
                        stage:
                            'single-slide-generation',

                        slide:
                            slideNumber,

                        totalSlides
                    }
                );

        } catch (error) {

            console.error(
                `[LECTURE STUDIO] Slide ${slideNumber} AI request failed:`,
                error
            );

            throw new Error(
                `Slide ${slideNumber} generation failed: ${error.message}`
            );
        }


        if (state.cancelled) {
            throw new Error('Generation cancelled.');
        }


        let parsed;


        try {

            parsed =
                parseAIJSON(
                    response
                );

        } catch (error) {

            console.error(
                `[LECTURE STUDIO] Slide ${slideNumber} JSON parsing failed:`,
                error
            );


            console.error(
                `[LECTURE STUDIO] Slide ${slideNumber} raw response:`,
                response
            );


            throw new Error(
                `Slide ${slideNumber} returned malformed JSON.`
            );
        }


        /*
         * Because we explicitly request ONE object,
         * the normal case is simply the parsed object.
         */
        let slide = null;


        if (
            parsed &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed)
        ) {

            /*
             * Normal response:
             *
             * {
             *   type: "...",
             *   title: "...",
             *   ...
             * }
             */
            if (
                parsed.title ||
                parsed.bullets ||
                parsed.steps ||
                parsed.callout ||
                parsed.table
            ) {

                slide =
                    parsed;
            }


            /*
             * Defensive support if the AI still wraps it.
             */
            else if (
                Array.isArray(
                    parsed.slides
                ) &&
                parsed.slides.length
            ) {

                slide =
                    parsed.slides[0];
            }
        }


        /*
         * Defensive support for an array response.
         */
        else if (
            Array.isArray(parsed) &&
            parsed.length
        ) {

            slide =
                parsed[0];
        }


        if (
            !slide ||
            typeof slide !== 'object'
        ) {

            console.error(
                `[LECTURE STUDIO] Slide ${slideNumber} unusable parsed response:`,
                parsed
            );


            console.error(
                `[LECTURE STUDIO] Slide ${slideNumber} raw response:`,
                response
            );


            throw new Error(
                `Slide ${slideNumber} returned no usable slide object.`
            );
        }


        /*
         * Give the slide a safe title if the AI omitted one.
         */
        if (
            !String(
                slide.title ||
                ''
            ).trim()
        ) {

            slide.title =
                `Lecture Slide ${slideNumber}`;
        }


        /*
         * Normalize immediately.
         */
        const normalizedSlide =
            normalizeSlide(
                slide
            );


        allSlides.push(
            normalizedSlide
        );


        /*
         * Save progressively.
         */
        state.project.slides =
            allSlides.slice();


        saveProject();


        console.log(
            `[LECTURE STUDIO] Slide ${slideNumber}/${totalSlides} accepted: ${normalizedSlide.title}`
        );


        setProgress(
            68 +
            Math.round(
                (slideNumber / totalSlides) * 25
            ),
            `Completed ${slideNumber} of ${totalSlides} slides`
        );
    }


    /*
     * Final validation.
     */
    if (
        !allSlides.length
    ) {

        throw new Error(
            'No slides were generated.'
        );
    }


    console.log(
        `[LECTURE STUDIO] Complete slide deck generated: ${allSlides.length} slides`
    );


    return {

        title:
            presentationTitle,

        subtitle:
            presentationSubtitle,

        learningObjectives:
            learningObjectives,

        slides:
            allSlides
    };
}

    /* =========================================================
       SLIDE NORMALIZATION
       ========================================================= */

    function normalizeSlide(
        slide,
        index
    ) {

        const source =
            slide &&
            typeof slide ===
                'object'
                ? slide
                : {};


        let table = null;


        if (
            source.table &&
            typeof source.table ===
                'object'
        ) {

            table = {

                columns:
                    Array.isArray(
                        source.table.columns
                    )
                        ? source.table.columns
                            .map(String)
                        : [],

                rows:
                    Array.isArray(
                        source.table.rows
                    )
                        ? source.table.rows
                        : []
            };
        }


        return {

            id:
                source.id ||
                generateId('slide'),

            type:
                source.type ||
                'content',

            title:
                source.title ||
                `Slide ${index + 1}`,

            subtitle:
                source.subtitle ||
                '',

            bullets:
                Array.isArray(
                    source.bullets
                )
                    ? source.bullets
                        .map(String)
                        .filter(Boolean)
                        .slice(0, 10)
                    : [],

            steps:
                Array.isArray(
                    source.steps
                )
                    ? source.steps
                        .map(String)
                        .filter(Boolean)
                        .slice(0, 10)
                    : [],

            table,

            callout:
                source.callout ||
                '',

            speakerNotes:
                source.speakerNotes ||
                ''
        };
    }


    function normalizeSlides(
        slides
    ) {

        return (
            Array.isArray(slides)
                ? slides
                : []
        )
            .map(
                normalizeSlide
            );
    }


    /* =========================================================
       MAIN GENERATION WORKFLOW
       ========================================================= */

    async function generatePresentation() {

        if (state.busy) {

            return;
        }


        syncFormToProject();


        const source =
            state.project.sourceText.trim();


        if (!source) {

            setStatus(
                'Paste your lecture material before generating.',
                'warning'
            );

            return;
        }


        const words =
            countWords(source);


        if (words < 30) {

            setStatus(
                'The source is too short. Paste the actual lecture notes or transcript.',
                'warning'
            );

            return;
        }


        state.busy = true;

        state.cancelled = false;

        state.currentStage =
            'preparing';


        if ($('generateBtn')) {

            $('generateBtn').disabled =
                true;
        }


        if ($('cancelBtn')) {

            $('cancelBtn').disabled =
                false;
        }


        try {

            setProgress(
                2,
                'Preparing lecture'
            );


            setStatus(
                `Preparing ${words.toLocaleString()} source words...`
            );


            /*
             * Stage 1:
             * Analyze the source.
             */

            state.currentStage =
                'analysis';


            const analyses =
                await analyzeLectureSource();


            /*
             * Stage 2:
             * Global deck planning.
             */

            state.currentStage =
                'slide-planning';


            const deck =
                await createSlideDeck(
                    analyses
                );


            /*
             * Stage 3:
             * Normalize and save.
             */

            setProgress(
                88,
                'Building slide preview'
            );


            setStatus(
                'Rendering the generated lecture...'
            );


            state.project.title =
                deck.title ||
                state.project.title;


            state.project.slides =
                normalizeSlides(
                    deck.slides
                );


            updateTimestamp();

            saveProject();

            renderSlides();


            setProgress(
                100,
                `${state.project.slides.length} slides generated`
            );


            setStatus(
                `Complete — generated ${state.project.slides.length} slides from ${words.toLocaleString()} source words.`,
                'success'
            );


            state.currentStage =
                'complete';


        } catch (error) {

            console.error(
                '[LECTURE STUDIO] Generation failed:',
                error
            );


            if (
                error &&
                error.message ===
                    'Generation cancelled.'
            ) {

                setStatus(
                    'Generation cancelled.',
                    'warning'
                );

            } else {

                setStatus(
                    error?.message ||
                    'Lecture generation failed.',
                    'error'
                );
            }


            setProgress(
                0,
                'Ready'
            );


        } finally {

            state.busy =
                false;


            if ($('generateBtn')) {

                $('generateBtn').disabled =
                    false;
            }


            if ($('cancelBtn')) {

                $('cancelBtn').disabled =
                    true;
            }
        }
    }


    function cancelGeneration() {

        if (!state.busy) {

            return;
        }


        state.cancelled =
            true;


        setStatus(
            'Cancelling after the current AI request finishes...',
            'warning'
        );
    }


    /* =========================================================
       SLIDE PREVIEW
       ========================================================= */

    function renderTable(
        table
    ) {

        if (
            !table ||
            !Array.isArray(
                table.columns
            ) ||
            !table.columns.length
        ) {

            return '';
        }


        const header =
            table.columns
                .map(
                    column =>
                        `<th>${escapeHtml(column)}</th>`
                )
                .join('');


        const rows =
            (Array.isArray(table.rows)
                ? table.rows
                : [])
                .map(
                    row => {

                        const cells =
                            Array.isArray(row)
                                ? row
                                : [row];


                        return `
                            <tr>
                                ${cells
                                    .map(
                                        cell =>
                                            `<td>${escapeHtml(cell)}</td>`
                                    )
                                    .join('')}
                            </tr>
                        `;
                    }
                )
                .join('');


        return `
            <div class="slide-table-wrap">

                <table>

                    <thead>

                        <tr>
                            ${header}
                        </tr>

                    </thead>

                    <tbody>
                        ${rows}
                    </tbody>

                </table>

            </div>
        `;
    }


    function renderSteps(
        steps
    ) {

        if (
            !Array.isArray(steps) ||
            !steps.length
        ) {

            return '';
        }


        return `
            <div class="steps">

                ${steps
                    .map(
                        (step, index) => `
                            <div class="step">

                                <span>
                                    ${index + 1}
                                </span>

                                <div>
                                    ${escapeHtml(step)}
                                </div>

                            </div>
                        `
                    )
                    .join('')}

            </div>
        `;
    }


    function renderBullets(
        bullets
    ) {

        if (
            !Array.isArray(bullets) ||
            !bullets.length
        ) {

            return '';
        }


        return `
            <ul>

                ${bullets
                    .map(
                        bullet =>
                            `<li>${escapeHtml(bullet)}</li>`
                    )
                    .join('')}

            </ul>
        `;
    }


    function renderCallout(
        callout
    ) {

        if (!callout) {

            return '';
        }


        return `
            <div class="callout">

                <strong>
                    HIGH-YIELD
                </strong>

                <span>
                    ${escapeHtml(callout)}
                </span>

            </div>
        `;
    }


    function renderSlides() {

        const container =
            $('slidesGrid');


        if (!container) {

            return;
        }


        container.innerHTML =
            '';


        if (
            !state.project.slides.length
        ) {

            container.innerHTML = `

                <div class="empty-slides">

                    <div class="empty-icon">
                        ✦
                    </div>

                    <h3>
                        No slides yet
                    </h3>

                    <p>
                        Paste a lecture and generate a presentation.
                    </p>

                </div>
            `;

            updateStatistics();

            return;
        }


        state.project.slides
            .forEach(
                (slide, index) => {

                    const card =
                        document.createElement(
                            'article'
                        );


                    const typeClass =
                        String(
                            slide.type ||
                            'content'
                        )
                            .toLowerCase()
                            .replace(
                                /[^a-z0-9-]/g,
                                '-'
                            );


                    card.className =
                        `slide-card slide-${typeClass}`;


                    card.dataset.index =
                        String(index);


                    card.innerHTML = `

                        <div class="slide-top">

                            <span class="slide-number">
                                ${String(index + 1).padStart(2, '0')}
                            </span>

                            <span class="slide-type">
                                ${escapeHtml(slide.type)}
                            </span>

                            <button
                                class="icon-btn delete-slide"
                                title="Delete slide"
                                type="button"
                            >
                                ×
                            </button>

                        </div>


                        <div class="slide-body">

                            <div class="slide-kicker">
                                ${escapeHtml(
                                    state.project.subject
                                )}
                            </div>

                            <h3>
                                ${escapeHtml(
                                    slide.title
                                )}
                            </h3>

                            ${
                                slide.subtitle
                                    ? `
                                        <p class="slide-subtitle">
                                            ${escapeHtml(
                                                slide.subtitle
                                            )}
                                        </p>
                                    `
                                    : ''
                            }

                            ${renderBullets(
                                slide.bullets
                            )}

                            ${renderSteps(
                                slide.steps
                            )}

                            ${renderTable(
                                slide.table
                            )}

                            ${renderCallout(
                                slide.callout
                            )}

                        </div>
                    `;


                    const deleteButton =
                        card.querySelector(
                            '.delete-slide'
                        );


                    if (deleteButton) {

                        deleteButton.addEventListener(
                            'click',
                            () => {

                                state.project.slides
                                    .splice(
                                        index,
                                        1
                                    );

                                saveProject();

                                renderSlides();
                            }
                        );
                    }


                    container.appendChild(
                        card
                    );
                }
            );


        updateStatistics();
    }


    /* =========================================================
       IMPORT
       ========================================================= */

    function importTextFile(
        file
    ) {

        if (!file) {

            return;
        }


        const reader =
            new FileReader();


        reader.onload =
            () => {

                const content =
                    String(
                        reader.result ||
                        ''
                    );


                if ($('sourceText')) {

                    $('sourceText').value =
                        content;
                }


                syncFormToProject();

                updateStatistics();

                saveProject();


                setStatus(
                    `Imported ${file.name}.`,
                    'success'
                );
            };


        reader.onerror =
            () => {

                setStatus(
                    'Could not read the selected file.',
                    'error'
                );
            };


        reader.readAsText(
            file
        );
    }


    /* =========================================================
       EXPORT — JSON
       ========================================================= */

    function exportProjectJSON() {

        syncFormToProject();


        const payload = {

            application:
                'Year 3 PASS — Lecture Studio',

            moduleId:
                MODULE_ID,

            exportedAt:
                new Date().toISOString(),

            project:
                state.project
        };


        const blob =
            new Blob(
                [
                    JSON.stringify(
                        payload,
                        null,
                        2
                    )
                ],
                {
                    type:
                        'application/json'
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const anchor =
            document.createElement(
                'a'
            );


        anchor.href =
            url;


        anchor.download =
            `${safeFilename(
                state.project.title
            )}.lecture-studio.json`;


        document.body.appendChild(
            anchor
        );


        anchor.click();


        anchor.remove();


        setTimeout(
            () =>
                URL.revokeObjectURL(
                    url
                ),
            1000
        );


        setStatus(
            'Lecture Studio project exported.',
            'success'
        );
    }


    /* =========================================================
       EXPORT — HTML SLIDES
       ========================================================= */

    function exportHTMLSlides() {

        syncFormToProject();


        if (
            !state.project.slides.length
        ) {

            setStatus(
                'Generate slides before exporting.',
                'warning'
            );

            return;
        }


        const slideHTML =
            state.project.slides
                .map(
                    (slide, index) => {

                        return `

                            <section class="slide">

                                <div class="slide-number">
                                    ${String(index + 1).padStart(2, '0')}
                                </div>

                                <div class="kicker">
                                    ${escapeHtml(
                                        state.project.subject
                                    )}
                                </div>

                                <h1>
                                    ${escapeHtml(
                                        slide.title
                                    )}
                                </h1>

                                ${
                                    slide.subtitle
                                        ? `
                                            <h2>
                                                ${escapeHtml(
                                                    slide.subtitle
                                                )}
                                            </h2>
                                        `
                                        : ''
                                }

                                ${renderBullets(
                                    slide.bullets
                                )}

                                ${renderSteps(
                                    slide.steps
                                )}

                                ${renderTable(
                                    slide.table
                                )}

                                ${renderCallout(
                                    slide.callout
                                )}

                            </section>
                        `;
                    }
                )
                .join('');


        const html = `

<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta name="viewport"
      content="width=device-width,initial-scale=1">

<title>
    ${escapeHtml(
        state.project.title
    )}
</title>


<style>

* {
    box-sizing: border-box;
}


body {

    margin: 0;

    background: #111827;

    font-family:
        Arial,
        Helvetica,
        sans-serif;

    color: #172033;
}


.slide {

    width: 13.333in;

    min-height: 7.5in;

    margin:
        0 auto 30px;

    padding:
        .7in .8in;

    background:
        white;

    position:
        relative;

    page-break-after:
        always;

    overflow:
        hidden;
}


.kicker {

    color:
        #2563eb;

    font-size:
        13px;

    font-weight:
        700;

    text-transform:
        uppercase;

    letter-spacing:
        .14em;

    margin-bottom:
        20px;
}


h1 {

    font-size:
        35px;

    line-height:
        1.15;

    margin:
        0 0 20px;
}


h2 {

    font-size:
        20px;

    color:
        #667085;

    font-weight:
        500;
}


ul {

    font-size:
        20px;

    line-height:
        1.5;

    padding-left:
        28px;
}


li {

    margin:
        9px 0;
}


.slide-number {

    position:
        absolute;

    right:
        .7in;

    top:
        .55in;

    color:
        #98a2b3;

    font-weight:
        700;

    font-size:
        13px;
}


.steps {

    display:
        grid;

    gap:
        12px;

    margin-top:
        15px;
}


.step {

    display:
        flex;

    gap:
        13px;

    font-size:
        19px;

    line-height:
        1.4;
}


.step span {

    display:
        grid;

    place-items:
        center;

    width:
        28px;

    height:
        28px;

    flex:
        0 0 auto;

    border-radius:
        50%;

    background:
        #2563eb;

    color:
        white;

    font-weight:
        700;

    font-size:
        13px;
}


table {

    width:
        100%;

    border-collapse:
        collapse;

    margin-top:
        15px;

    font-size:
        15px;
}


th,
td {

    border:
        1px solid #d0d5dd;

    padding:
        9px;

    text-align:
        left;

    vertical-align:
        top;
}


th {

    background:
        #f2f4f7;
}


.callout {

    margin-top:
        20px;

    padding:
        15px;

    border-left:
        5px solid #2563eb;

    background:
        #eff6ff;

    font-size:
        17px;

    line-height:
        1.45;
}


.callout strong {

    display:
        block;

    color:
        #1d4ed8;

    font-size:
        11px;

    margin-bottom:
        5px;

    letter-spacing:
        .1em;
}


@media print {

    body {

        background:
            white;
    }


    .slide {

        margin:
            0;
    }
}

</style>

</head>


<body>

${slideHTML}

</body>

</html>
`;


        const blob =
            new Blob(
                [html],
                {
                    type:
                        'text/html;charset=utf-8'
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const anchor =
            document.createElement(
                'a'
            );


        anchor.href =
            url;


        anchor.download =
            `${safeFilename(
                state.project.title
            )}.html`;


        document.body.appendChild(
            anchor
        );


        anchor.click();


        anchor.remove();


        setTimeout(
            () =>
                URL.revokeObjectURL(
                    url
                ),
            1000
        );


        setStatus(
            'HTML slide deck exported.',
            'success'
        );
    }


    /* =========================================================
       EXPORT — EXISTING PASS PPTX BRIDGE
       ========================================================= */

    async function exportPPTX() {
    syncFormToProject();

    if (!state.project.slides.length) {
        setStatus(
            'Generate slides before exporting.',
            'warning'
        );
        return;
    }

    if (
        !window.api ||
        typeof window.api.exportContent !== 'function'
    ) {
        console.error(
            '[LECTURE STUDIO] window.api.exportContent is not available.'
        );

        setStatus(
            'PPTX export service is not available.',
            'error'
        );

        return;
    }

    try {
        setStatus(
            'Creating PowerPoint presentation...'
        );

        console.log(
            '[LECTURE STUDIO] Sending PPTX export request:',
            {
                type: 'presentation',
                format: 'pptx',
                moduleId: MODULE_ID,
                title: state.project.title,
                subject: state.project.subject,
                slideCount:
                    state.project.slides.length
            }
        );

        const result =
            await window.api.exportContent({
                type: 'presentation',
                format: 'pptx',
                moduleId: MODULE_ID,
                title: state.project.title,
                subject: state.project.subject,
                slides: state.project.slides
            });

        console.log(
            '[LECTURE STUDIO] PPTX export response:',
            result
        );

        if (result?.canceled) {
            setStatus(
                'PPTX export cancelled.',
                'warning'
            );
            return;
        }

        const outputPath =
            result?.path ||
            result?.filePath ||
            result?.outputPath;

        if (!outputPath) {
            throw new Error(
                'The PPTX exporter returned no output file path.'
            );
        }

        if (
            !String(outputPath)
                .toLowerCase()
                .endsWith('.pptx')
        ) {
            throw new Error(
                `Exporter returned a non-PPTX file: ${outputPath}`
            );
        }

        setStatus(
            `PowerPoint created successfully: ${outputPath}`,
            'success'
        );

        console.log(
            '[LECTURE STUDIO] REAL PPTX CREATED:',
            outputPath
        );

    } catch (error) {
        console.error(
            '[LECTURE STUDIO] PPTX EXPORT FAILED:',
            error
        );

        setStatus(
            `PPTX export failed: ${
                error?.message ||
                'Unknown error'
            }`,
            'error'
        );
    }
}


    /* =========================================================
       SAMPLE CONTENT
       ========================================================= */

    function loadSample() {

        const sample = `PRAZIQUANTEL

OVERVIEW

Praziquantel is a broad-spectrum anthelmintic used mainly against trematodes and cestodes.

CLASSIFICATION

Praziquantel is a pyrazinoisoquinoline derivative.

SPECTRUM

It is active against many flukes and tapeworms. It is especially important in the treatment of schistosomiasis.

MECHANISM OF ACTION

Praziquantel increases the permeability of the parasite membrane to calcium ions. This produces an increase in intracellular calcium and causes sustained contraction and spastic paralysis of the parasite. The drug also causes damage to the parasite tegument, which contributes to immune-mediated elimination.

SCHISTOSOMIASIS

Praziquantel is the major treatment for schistosomiasis caused by Schistosoma mansoni, Schistosoma haematobium and Schistosoma japonicum.

OTHER TREMATODES

Praziquantel is active against several other trematode infections, including important intestinal, liver and lung flukes.

IMPORTANT EXCEPTION

Fasciola hepatica is an important exception. Praziquantel is not the preferred treatment for fascioliasis; triclabendazole is the important drug.

CESTODES

Praziquantel is active against several tapeworm infections including Taenia species and other susceptible cestodes.

PHARMACOKINETICS

Praziquantel is administered orally and is well absorbed. It undergoes extensive first-pass metabolism. CYP3A4 contributes importantly to its metabolism.

ADVERSE EFFECTS

Common adverse effects include dizziness, headache, drowsiness, fatigue, nausea, vomiting, abdominal discomfort and diarrhea. Some symptoms may result from the host inflammatory response to dying parasites.

CLINICAL PEARLS

The major examination association is praziquantel with schistosomiasis. Remember the important exception of Fasciola hepatica, for which triclabendazole is preferred.

FINAL SUMMARY

Praziquantel is a major drug for trematodes and cestodes. Its mechanism involves increased calcium permeability, paralysis and tegumental damage. It is particularly important in schistosomiasis.`;

        if ($('sourceText')) {

            $('sourceText').value =
                sample;
        }


        if ($('lectureTitle')) {

            $('lectureTitle').value =
                'Praziquantel';
        }


        if ($('subject')) {

            $('subject').value =
                'Pharmacology';
        }


        syncFormToProject();

        updateStatistics();

        saveProject();


        setStatus(
            'Sample Year 3 pharmacology lecture loaded.',
            'success'
        );
    }


    /* =========================================================
       EVENT BINDING
       ========================================================= */

    function bindEvents() {

        if ($('generateBtn')) {

            $('generateBtn')
                .addEventListener(
                    'click',
                    generatePresentation
                );
        }


        if ($('cancelBtn')) {

            $('cancelBtn')
                .addEventListener(
                    'click',
                    cancelGeneration
                );
        }


        if ($('newProjectBtn')) {

            $('newProjectBtn')
                .addEventListener(
                    'click',
                    newProject
                );
        }


        if ($('sampleBtn')) {

            $('sampleBtn')
                .addEventListener(
                    'click',
                    loadSample
                );
        }


        if ($('exportJsonBtn')) {

            $('exportJsonBtn')
                .addEventListener(
                    'click',
                    exportProjectJSON
                );
        }


        if ($('exportHtmlBtn')) {

            $('exportHtmlBtn')
                .addEventListener(
                    'click',
                    exportHTMLSlides
                );
        }


        if ($('exportPptxBtn')) {

            $('exportPptxBtn')
                .addEventListener(
                    'click',
                    exportPPTX
                );
        }


        if ($('importBtn')) {

            $('importBtn')
                .addEventListener(
                    'click',
                    () => {

                        if ($('fileInput')) {

                            $('fileInput').click();
                        }
                    }
                );
        }


        if ($('fileInput')) {

            $('fileInput')
                .addEventListener(
                    'change',
                    event => {

                        const file =
                            event.target
                                .files?.[0];


                        if (file) {

                            importTextFile(
                                file
                            );
                        }


                        event.target.value =
                            '';
                    }
                );
        }


        if ($('clearSourceBtn')) {

            $('clearSourceBtn')
                .addEventListener(
                    'click',
                    () => {

                        if (
                            !$('sourceText')
                        ) {

                            return;
                        }


                        if (
                            $('sourceText').value &&
                            !window.confirm(
                                'Clear all source material?'
                            )
                        ) {

                            return;
                        }


                        $('sourceText').value =
                            '';


                        syncFormToProject();

                        updateStatistics();

                        saveProject();


                        setStatus(
                            'Source material cleared.',
                            'success'
                        );
                    }
                );
        }


        /*
         * Autosave source material.
         */

        if ($('sourceText')) {

            $('sourceText')
                .addEventListener(
                    'input',
                    () => {

                        syncFormToProject();

                        updateStatistics();


                        clearTimeout(
                            window.__Y3LectureStudioSaveTimer
                        );


                        window.__Y3LectureStudioSaveTimer =
                            setTimeout(
                                saveProject,
                                500
                            );
                    }
                );
        }


        [
            'lectureTitle',
            'subject',
            'lectureType',
            'detail',
            'targetSlides'
        ]
            .forEach(
                id => {

                    if (!$(`${id}`)) {

                        return;
                    }


                    $(`${id}`)
                        .addEventListener(
                            'change',
                            () => {

                                syncFormToProject();

                                saveProject();
                            }
                        );
                }
            );


        /*
         * Drag-and-drop import.
         */

        const dropZone =
            $('dropZone');


        if (dropZone) {

            [
                'dragenter',
                'dragover'
            ]
                .forEach(
                    eventName => {

                        dropZone
                            .addEventListener(
                                eventName,
                                event => {

                                    event.preventDefault();

                                    event.stopPropagation();

                                    dropZone.classList.add(
                                        'dragging'
                                    );
                                }
                            );
                    }
                );


            [
                'dragleave',
                'drop'
            ]
                .forEach(
                    eventName => {

                        dropZone
                            .addEventListener(
                                eventName,
                                event => {

                                    event.preventDefault();

                                    event.stopPropagation();

                                    dropZone.classList.remove(
                                        'dragging'
                                    );
                                }
                            );
                    }
                );


            dropZone
                .addEventListener(
                    'drop',
                    event => {

                        const file =
                            event
                                .dataTransfer
                                .files?.[0];


                        if (file) {

                            importTextFile(
                                file
                            );
                        }
                    }
                );
        }


        /*
         * Ctrl + Enter = generate.
         */

        document.addEventListener(
            'keydown',
            event => {

                if (
                    (event.ctrlKey ||
                        event.metaKey) &&
                    event.key ===
                        'Enter'
                ) {

                    event.preventDefault();

                    generatePresentation();
                }
            }
        );
    }


    /* =========================================================
       MODULE LIFECYCLE
       ========================================================= */

    function initialize() {

        if (state.initialized) {

            return;
        }


        state.initialized =
            true;


        state.project =
            createEmptyProject();


        restoreProject();

        bindEvents();

        renderSlides();

        updateStatistics();


        setProgress(
            0,
            'Ready'
        );


        setStatus(
            'Ready — paste a complete lecture or transcript.'
        );


        console.log(
            `[${MODULE_ID}] Lecture Studio initialized.`
        );
    }


    function destroy() {

        clearTimeout(
            window.__Y3LectureStudioSaveTimer
        );


        state.busy =
            false;


        state.cancelled =
            true;


        state.initialized =
            false;


        console.log(
            `[${MODULE_ID}] Lecture Studio destroyed.`
        );
    }


    /* =========================================================
       PUBLIC MODULE API
       ========================================================= */

    window.Y3_013_LectureStudio = {

        id:
            MODULE_ID,

        name:
            MODULE_NAME,

        init:
            initialize,

        destroy,

        generate:
            generatePresentation,

        cancel:
            cancelGeneration,

        save:
            saveProject,

        exportJSON:
            exportProjectJSON,

        exportHTML:
            exportHTMLSlides,

        exportPPTX:
            exportPPTX,

        getState() {

            return JSON.parse(
                JSON.stringify(
                    state.project
                )
            );
        },

        getProject() {

            return state.project;
        }
    };


    /* =========================================================
       AUTO INITIALIZATION
       ========================================================= */

    if (
        document.readyState ===
        'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            initialize,
            {
                once: true
            }
        );

    } else {

        initialize();
    }

})();