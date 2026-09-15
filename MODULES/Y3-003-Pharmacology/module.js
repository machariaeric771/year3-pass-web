(() => {
"use strict";

const MODULE_ID = "Y3-003-Pharmacology";
const STORAGE_KEY = "year3_pharmacology_state";

/* ============================================================
   PHARMACOLOGY AI COMMAND LAYER
   STEP 1 — COMMAND PARSER
   ============================================================ */

const pharmacologyAICommandLayer = (() => {

    "use strict";


    /* ---------------------------------------------------------
       MODULE ID
       --------------------------------------------------------- */

    const MODULE =
        "Y3-003-Pharmacology";


    /* ---------------------------------------------------------
       SUPPORTED COMMANDS
       --------------------------------------------------------- */

    const ACTIONS = Object.freeze({

        ADD_FLASHCARD: "add_flashcard",
        EDIT_FLASHCARD: "edit_flashcard",
        DELETE_FLASHCARD: "delete_flashcard",

        ADD_QUESTION: "add_question",
        EDIT_QUESTION: "edit_question",
        DELETE_QUESTION: "delete_question",

        ADD_HIGH_YIELD: "add_high_yield",
        EDIT_HIGH_YIELD: "edit_high_yield",
        DELETE_HIGH_YIELD: "delete_high_yield"

    });


    /* ---------------------------------------------------------
       TARGETS
       --------------------------------------------------------- */

    const TARGETS = Object.freeze({

        FLASHCARDS: "flashcards",
        QUESTIONS: "questions",
        HIGH_YIELD: "high_yield"

    });


    /* ---------------------------------------------------------
       CREATE COMMAND
       --------------------------------------------------------- */

    function createCommand(
        action,
        target,
        data = {}
    ) {

        return {

            type: "module_action",

            module:
                MODULE,

            action:
                String(action || ""),

            target:
                String(target || ""),

            data:
                data && typeof data === "object"
                    ? data
                    : {},

            createdAt:
                new Date().toISOString()

        };

    }


    /* ---------------------------------------------------------
       CHECK WHETHER A VALUE IS A VALID COMMAND
       --------------------------------------------------------- */

    function isCommand(
        value
    ) {

        if (
            !value ||
            typeof value !== "object"
        ) {
            return false;
        }


        return (
            value.type === "module_action" &&
            value.module === MODULE &&
            typeof value.action === "string" &&
            typeof value.target === "string"
        );

    }


    /* ---------------------------------------------------------
       NORMALIZE COMMAND
       --------------------------------------------------------- */

    function normalizeCommand(
        command
    ) {

        if (
            !command ||
            typeof command !== "object"
        ) {
            return null;
        }


        const normalized =
            createCommand(
                command.action,
                command.target,
                command.data
            );


        if (!normalized.action) {
            return null;
        }


        if (!normalized.target) {
            return null;
        }


        return normalized;

    }


    /* ---------------------------------------------------------
       PARSE AI JSON
       --------------------------------------------------------- */

    function parseJSON(text) {
    if (typeof text !== "string") {
        return null;
    }

    const cleaned =
        text
            .trim()
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

    if (!cleaned) {
        return null;
    }

    try {
        const parsed = JSON.parse(cleaned);

        /* ----------------------------------------------------
           FORMAT 1
           Standard module command format
           ---------------------------------------------------- */

        if (isCommand(parsed)) {
            return normalizeCommand(parsed);
        }



        /* ----------------------------------------------------
           FORMAT 2
           Current AI flashcard format
           ---------------------------------------------------- */

        if (
            parsed &&
            parsed.module_id === MODULE &&
            parsed.action === "add_flashcards" &&
            Array.isArray(parsed.content)
        ) {

            return createCommand(
                "add_flashcard",
                "flashcards",
                {
                    cards: parsed.content
                }
            );
        }

        if (
    parsed &&
    parsed.module_id === MODULE &&
    parsed.action === "add_high_yield" &&
    Array.isArray(parsed.content)
) {

    return createCommand(
        "add_high_yield",
        "high_yield",
        {
            items:
                parsed.content
        }
    );
}

       /* ----------------------------------------------------
   FORMAT 3
   Current AI edit-flashcards format
   ---------------------------------------------------- */

if (
    parsed &&
    parsed.module_id === MODULE &&
    parsed.action === "edit_flashcards" &&
    Array.isArray(parsed.content)
) {

    return createCommand(
        "edit_flashcard",
        "flashcards",
        {
            cards: parsed.content
        }
    );
}

/* ----------------------------------------------------
   FORMAT — ADD HIGH-YIELD
   ---------------------------------------------------- */

if (
    parsed &&
    parsed.module_id === MODULE &&
    parsed.action === "add_high_yield" &&
    Array.isArray(parsed.content)
) {

    return createCommand(
        "add_high_yield",
        "high_yield",
        {
            items: parsed.content
        }
    );
}


/* ----------------------------------------------------
   FORMAT — EDIT HIGH-YIELD
   ---------------------------------------------------- */

if (
    parsed &&
    parsed.module_id === MODULE &&
    parsed.action === "edit_high_yield" &&
    Array.isArray(parsed.content)
) {

    return createCommand(
        "edit_high_yield",
        "high_yield",
        {
            items: parsed.content
        }
    );
}


/* ----------------------------------------------------
   FORMAT — DELETE HIGH-YIELD
   ---------------------------------------------------- */

if (
    parsed &&
    parsed.module_id === MODULE &&
    parsed.action === "delete_high_yield" &&
    Array.isArray(parsed.content)
) {

    return createCommand(
        "delete_high_yield",
        "high_yield",
        {
            items: parsed.content
        }
    );
}

        return null;

    } catch (error) {

        console.error(
            "[PHARMACOLOGY AI COMMAND PARSER]",
            error
        );

        return null;
    }
}


    /* ---------------------------------------------------------
       EXTRACT COMMAND FROM AI RESPONSE
       --------------------------------------------------------- */

    function parse(
        response
    ) {

        if (!response) {
            return null;
        }


        /*
         * The AI may eventually return:
         *
         * {
         *   "type": "module_action",
         *   "module": "Y3-003-Pharmacology",
         *   "action": "add_flashcard",
         *   "target": "flashcards",
         *   "data": {...}
         * }
         */


        if (
            typeof response === "object"
        ) {

            if (
                response.type ===
                    "module_action"
            ) {

                return normalizeCommand(
                    response
                );

            }


            if (
                typeof response.text ===
                    "string"
            ) {

                return parseJSON(
                    response.text
                );

            }


            if (
                typeof response.content ===
                    "string"
            ) {

                return parseJSON(
                    response.content
                );

            }

        }


        if (
            typeof response === "string"
        ) {

            return parseJSON(
                response
            );

        }


        return null;

    }


    /* ---------------------------------------------------------
       BUILD AI COMMAND INSTRUCTION
       --------------------------------------------------------- */

    function getSystemInstruction() {

        return `
You are the Pharmacology AI controller for
Year 3 Study OS.

You are operating ONLY inside:

Y3-003-Pharmacology

You must not modify or access content belonging to
Anatomy, Pathology, Microbiology, or any other module.

When the user asks you to MODIFY Pharmacology content,
return ONLY valid JSON using this structure:

{
  "type": "module_action",
  "module": "Y3-003-Pharmacology",
  "action": "ACTION",
  "target": "TARGET",
  "data": {}
}

Supported targets:

- flashcards
- questions
- high_yield

Supported actions:

- add_flashcard
- edit_flashcard
- delete_flashcard

- add_question
- edit_question
- delete_question

- add_high_yield
- edit_high_yield
- delete_high_yield

Do not execute the modification yourself.

Do not return Markdown when returning a command.

Do not invent a different module ID.

For ordinary study questions that do not request
a modification, answer normally.
        `.trim();

    }


    /* ---------------------------------------------------------
       PUBLIC API
       --------------------------------------------------------- */

    return Object.freeze({

        MODULE,

        ACTIONS,

        TARGETS,

        createCommand,

        isCommand,

        normalizeCommand,

        parseJSON,

        parse,

        getSystemInstruction

    });

})();

/* ============================================================
   PHARMACOLOGY AI COMMAND TEST BRIDGE
   ============================================================ */

window.pharmacologyAICommandLayer =
    pharmacologyAICommandLayer;

    /* ============================================================
   PHARMACOLOGY AI COMMAND EXECUTOR
   STEP 3 — FLASHCARDS
   ============================================================ */

function executePharmacologyAICommand(command) {

    if (
        !command ||
        command.type !== "module_action" ||
        command.module !== "Y3-003-Pharmacology"
    ) {
        return {
            success: false,
            message: "Invalid Pharmacology AI command."
        };
    }

    if (
    ![
        "flashcards",
        "high_yield"
    ].includes(command.target)
) {
    return {
        success: false,
        message:
            "This Pharmacology AI target is not supported yet."
    };
}

if (
    command.target === "flashcards" &&
    ![
        "add_flashcard",
        "edit_flashcard"
    ].includes(command.action)
) {
    return {
        success: false,
        message:
            "This AI flashcard command is not supported yet."
    };
}

if (
    command.target === "high_yield" &&
    command.action !== "add_high_yield"
) {
    return {
        success: false,
        message:
            "This AI High-Yield command is not supported yet."
    };
}

const data = command.data || {};

    /* ============================================================
   AI HIGH-YIELD — ADD
   ============================================================ */

if (
    command.action === "add_high_yield" &&
    command.target === "high_yield"
) {

    if (
        !Array.isArray(
            pharmacologyState.highYieldItems
        )
    ) {
        pharmacologyState.highYieldItems = [];
    }

    let items = [];

    if (Array.isArray(data.items)) {

        items = data.items;

    } else if (
        data.name ||
        data.topic ||
        data.title
    ) {

        items = [data];

    }

    if (!items.length) {

        return {
            success: false,
            message:
                "The AI did not provide any High-Yield Areas."
        };
    }

    const addedItems = [];

    items.forEach((item, index) => {

        const name =
            String(
                item?.name ||
                item?.topic ||
                item?.title ||
                ""
            ).trim();

        if (!name) {
            return;
        }

        /*
         * Prevent duplicate High-Yield Areas.
         */

        const alreadyExists =
            pharmacologyState.highYieldItems.some(
                existing =>
                    String(
                        existing?.name || ""
                    ).trim().toLowerCase() ===
                    name.toLowerCase()
            );

        if (alreadyExists) {
            return;
        }

        const newItem = {

            id:
                `ai-hy-${Date.now()}-${index}-${Math.random()
                    .toString(36)
                    .slice(2,8)}`,

            name,

            aiGenerated: true,

            createdAt:
                new Date().toISOString()

        };

        pharmacologyState.highYieldItems.push(
            newItem
        );

        addedItems.push(newItem);

    });

    if (!addedItems.length) {

        return {
            success: false,
            message:
                "No new High-Yield Areas were added. They may already exist."
        };
    }

    saveState();

    renderHighYield();

    console.log(
        "[PHARMACOLOGY AI] High-Yield Areas added:",
        addedItems
    );

    return {

        success: true,

        action:
            "add_high_yield",

        target:
            "high_yield",

        count:
            addedItems.length,

        items:
            addedItems,

        message:
            `${addedItems.length} High-Yield Area${
                addedItems.length === 1
                    ? ""
                    : "s"
            } added successfully.`

    };
}

    /* ---------------------------------------------------------
   STEP 4 — EDIT FLASHCARD
   --------------------------------------------------------- */

if (command.action === "edit_flashcard") {

    const existingCards = flashcards;

    if (!Array.isArray(existingCards)) {
        return {
            success: false,
            message:
                "The Pharmacology flashcard collection could not be found."
        };
    }

    const requestedId =
        String(
            data.id ||
            data.cardId ||
            ""
        ).trim();

    const requestedFront =
        String(
            data.currentFront ||
            data.oldFront ||
            ""
        ).trim();

    let cardIndex = -1;

    /* -----------------------------------------------------
       Find by exact ID first
       ----------------------------------------------------- */

    if (requestedId) {

        cardIndex =
            existingCards.findIndex(
                card =>
                    String(card?.id || "") ===
                    requestedId
            );
    }

    /* -----------------------------------------------------
       If no ID was supplied, find by current front
       ----------------------------------------------------- */

    if (
        cardIndex === -1 &&
        requestedFront
    ) {

        cardIndex =
            existingCards.findIndex(
                card =>
                    String(
                        card?.front || ""
                    ).trim() ===
                    requestedFront
            );
    }

    if (cardIndex === -1) {

        return {
            success: false,
            message:
                "The flashcard to edit could not be found."
        };
    }

    const card =
        existingCards[cardIndex];

    /* -----------------------------------------------------
       Only replace fields that were actually supplied
       ----------------------------------------------------- */

    if (
        data.front !== undefined &&
        String(data.front).trim()
    ) {
        card.front =
            String(data.front).trim();
    }

    if (
        data.back !== undefined &&
        String(data.back).trim()
    ) {
        card.back =
            String(data.back).trim();
    }

    if (
        data.topic !== undefined &&
        String(data.topic).trim()
    ) {
        card.topic =
            String(data.topic).trim();
    }

    if (
        data.difficulty !== undefined &&
        String(data.difficulty).trim()
    ) {
        card.difficulty =
            String(data.difficulty).trim();
    }

    card.updatedAt =
        new Date().toISOString();

    card.aiModified = true;

    saveState();

    renderFlashcards();

    console.log(
        "[PHARMACOLOGY AI] Flashcard edited:",
        card
    );

    return {
        success: true,

        action:
            "edit_flashcard",

        target:
            "flashcards",

        count:
            1,

        card,

        message:
            "Flashcard edited successfully."
    };
}

    let cards = [];

    if (Array.isArray(data.cards)) {
        cards = data.cards;
    } else if (
        data.front ||
        data.back ||
        data.question ||
        data.answer
    ) {
        cards = [data];
    }

    if (!cards.length) {
        return {
            success: false,
            message: "The AI did not provide any flashcards."
        };
    }

    const now = Date.now();
    const addedCards = [];

    cards.forEach((card, index) => {

        const front = String(
            card?.front ??
            card?.question ??
            ""
        ).trim();

        const back = String(
            card?.back ??
            card?.answer ??
            ""
        ).trim();

        if (!front || !back) {
            return;
        }

        const newCard = {
            id:
                `ai-flashcard-${now}-${index}-${Math.random()
                    .toString(36)
                    .slice(2, 8)}`,

            front,

            back,

            topic:
                String(
                    card?.topic ||
                    pharmacologyState.currentTopic ||
                    "AI Generated"
                ).trim(),

            difficulty:
                String(
                    card?.difficulty ||
                    "medium"
                ).trim(),

            aiGenerated: true,

            createdAt:
                new Date().toISOString()
        };

        flashcards.push(newCard);

        addedCards.push(newCard);
    });

    if (!addedCards.length) {
        return {
            success: false,
            message:
                "The AI command contained no valid flashcards."
        };
    }

    pharmacologyState.flashcardState.index =
        flashcards.length - addedCards.length;

    pharmacologyState.flashcardState.revealed =
        false;

    saveState();

    renderFlashcards();

    return {
        success: true,

        action:
            "add_flashcard",

        target:
            "flashcards",

        count:
            addedCards.length,

        cards:
            addedCards,

        message:
            `${addedCards.length} flashcard${
                addedCards.length === 1
                    ? ""
                    : "s"
            } added successfully.`
    };
}

const studyAreas = [
 {id:"general",name:"General Pharmacology",topics:["Pharmacokinetics","Pharmacodynamics","Drug Absorption","Drug Distribution","Drug Metabolism","Drug Excretion","Bioavailability","First-Pass Effect","Volume of Distribution","Clearance","Half-Life","Loading Dose","Maintenance Dose","Therapeutic Drug Monitoring","Drug Receptors","Agonists","Antagonists","Partial Agonists","Dose-Response Relationships","Therapeutic Index","Drug Interactions","Adverse Drug Reactions","Pharmacogenetics","Routes of Administration","Drug Development and Clinical Trials"]},
 {id:"autonomic",name:"Autonomic Pharmacology",topics:["Cholinergic Receptors","Muscarinic Agonists","Muscarinic Antagonists","Nicotinic Drugs","Acetylcholinesterase Inhibitors","Organophosphates","Adrenergic Receptors","Alpha Agonists","Alpha Blockers","Beta Agonists","Beta Blockers","Sympatholytic Drugs","Sympathomimetic Drugs","Neuromuscular Blocking Drugs"]},
 {id:"cardiovascular",name:"Cardiovascular Pharmacology",topics:["Antihypertensive Drugs","ACE Inhibitors","ARBs","Calcium Channel Blockers","Beta Blockers","Diuretics","Vasodilators","Antianginal Drugs","Nitrates","Antiarrhythmic Drugs","Drugs for Heart Failure","Cardiac Glycosides","Lipid-Lowering Drugs","Anticoagulants","Antiplatelet Drugs","Thrombolytic Drugs"]},
 {id:"respiratory",name:"Respiratory Pharmacology",topics:["Bronchodilators","Beta-2 Agonists","Antimuscarinic Bronchodilators","Methylxanthines","Corticosteroids","Leukotriene Modifiers","Mast Cell Stabilizers","Drugs for Asthma","Drugs for COPD","Antitussives","Expectorants","Mucolytics"]},
 {id:"gastrointestinal",name:"Gastrointestinal Pharmacology",topics:["Proton Pump Inhibitors","H2 Receptor Antagonists","Antacids","Mucosal Protective Drugs","Anti-Helicobacter Therapy","Antiemetics","Prokinetic Drugs","Laxatives","Antidiarrhoeal Drugs","Antispasmodics","Drugs for Inflammatory Bowel Disease"]},
 {id:"cns",name:"Central Nervous System Pharmacology",topics:["Sedative-Hypnotics","Benzodiazepines","Barbiturates","Antidepressants","SSRIs","SNRIs","Tricyclic Antidepressants","MAO Inhibitors","Antipsychotics","Antiepileptic Drugs","Drugs for Parkinson Disease","Drugs for Alzheimer Disease","Opioid Analgesics","Non-Opioid Analgesics","General Anaesthetics","Local Anaesthetics","Drugs for Migraine"]},
 {id:"endocrine",name:"Endocrine Pharmacology",topics:["Insulin","Oral Antidiabetic Drugs","GLP-1 Related Therapies","Thyroid Drugs","Antithyroid Drugs","Corticosteroids","Mineralocorticoids","Sex Hormones","Oral Contraceptives","Drugs Affecting Bone","Bisphosphonates","Drugs Affecting Pituitary Hormones"]},
 {id:"renal",name:"Renal Pharmacology",topics:["Loop Diuretics","Thiazide Diuretics","Potassium-Sparing Diuretics","Osmotic Diuretics","Carbonic Anhydrase Inhibitors","Diuretic Combinations","Drugs Affecting Renal Blood Flow","Drugs Affecting Acid-Base Balance"]},
 {id:"antimicrobial",name:"Antimicrobial Pharmacology",topics:["Principles of Antimicrobial Therapy","Penicillins","Cephalosporins","Carbapenems","Monobactams","Macrolides","Tetracyclines","Aminoglycosides","Fluoroquinolones","Sulfonamides","Trimethoprim","Glycopeptides","Oxazolidinones","Lincosamides","Rifamycins","Antimycobacterial Drugs","Antifungal Drugs","Antiviral Drugs","Antiprotozoal Drugs","Anthelmintic Drugs","Antimicrobial Resistance"]},
 {id:"anticancer",name:"Anticancer Pharmacology",topics:["Principles of Cancer Chemotherapy","Alkylating Agents","Antimetabolites","Antitumour Antibiotics","Microtubule Inhibitors","Topoisomerase Inhibitors","Hormonal Anticancer Therapy","Targeted Therapy","Immunotherapy","Major Toxicities of Cancer Drugs","Supportive Drugs in Cancer Therapy"]},
 {id:"blood",name:"Drugs Affecting Blood",topics:["Anticoagulants","Heparins","Warfarin","Direct Oral Anticoagulants","Antiplatelet Drugs","Thrombolytics","Antifibrinolytics","Haematinics","Iron","Vitamin B12","Folate","Erythropoiesis-Stimulating Drugs"]},
 {id:"reproductive",name:"Reproductive Pharmacology",topics:["Oestrogens","Progestins","Combined Oral Contraceptives","Progestin-Only Contraceptives","Emergency Contraception","Fertility Drugs","Androgens","Antiandrogens","Drugs Affecting Uterine Contraction","Tocolytics","Drugs Used in Labour"]},
 {id:"inflammatory",name:"Anti-inflammatory and Immunomodulatory Drugs",topics:["NSAIDs","COX Inhibitors","Paracetamol","Corticosteroids","DMARDs","Methotrexate","Biologic Therapies","Immunosuppressants","Drugs for Gout"]},
 {id:"toxicology",name:"Toxicology",topics:["Principles of Poisoning","Drug Overdose","Common Toxic Syndromes","Antidotes","Organophosphate Poisoning","Paracetamol Toxicity","Opioid Toxicity","Benzodiazepine Toxicity","Salicylate Toxicity","Toxic Alcohols","General Principles of Poison Management"]},
 {id:"clinical",name:"Clinical Pharmacology",topics:["Rational Prescribing","Prescription Writing","Drug Selection","Dose Selection","Drug Monitoring","Adherence","Medication Safety","Drug Interactions","Adverse Drug Reactions","Special Populations","Pregnancy and Lactation","Paediatric Pharmacology","Geriatric Pharmacology","Renal Impairment","Hepatic Impairment"]}
];

const classInfo = {
 "Beta Blockers":{mechanism:"Competitive blockade of β-adrenergic receptors, reducing sympathetic effects. Non-selective agents block β1 and β2; cardioselective agents preferentially block β1 at usual doses.",effects:["Reduced heart rate and contractility","Reduced renin release","Slower AV nodal conduction"],uses:["Hypertension","Angina","Selected arrhythmias","Heart failure with selected evidence-based agents","Migraine prevention"],adverse:["Bradycardia","Hypotension","AV block","Fatigue","Bronchospasm with non-selective agents"],contra:["Marked bradycardia","High-grade heart block without pacing","Caution in asthma/COPD with non-selective agents"],interactions:["Additive bradycardia with other AV-node-slowing drugs","May mask adrenergic symptoms of hypoglycaemia"]},
 "ACE Inhibitors":{mechanism:"Inhibit angiotensin-converting enzyme, decreasing angiotensin II formation and aldosterone signalling; they also reduce bradykinin breakdown.",effects:["Vasodilation","Reduced sodium/water retention","Reduced afterload and preload"],uses:["Hypertension","Heart failure","Renal protection in selected proteinuric disease"],adverse:["Cough","Hyperkalaemia","Hypotension","Rise in creatinine after initiation","Angioedema"],contra:["Pregnancy","Previous ACE-inhibitor angioedema","Significant bilateral renal artery stenosis"],interactions:["Potassium-raising drugs","NSAIDs may worsen renal function in susceptible patients","Other RAAS blockers increase adverse effects"]},
 "ARBs":{mechanism:"Block angiotensin II AT1 receptors, reducing vasoconstriction and aldosterone-mediated effects.",effects:["Vasodilation","Reduced aldosterone activity","Reduced blood pressure"],uses:["Hypertension","Heart failure in selected patients","Proteinuric kidney disease"],adverse:["Hyperkalaemia","Hypotension","Renal function deterioration"],contra:["Pregnancy"],interactions:["Potassium-raising drugs","Other RAAS blockade"]},
 "Calcium Channel Blockers":{mechanism:"Block L-type calcium channels. Dihydropyridines act predominantly on vascular smooth muscle; non-dihydropyridines also depress cardiac conduction and contractility.",effects:["Arteriolar vasodilation","Reduced myocardial/AV nodal activity with verapamil and diltiazem"],uses:["Hypertension","Angina","Selected arrhythmias"],adverse:["Ankle oedema","Flushing","Headache","Constipation with verapamil","Bradycardia with non-dihydropyridines"],contra:["Selected conduction disorders or severe bradycardia for non-dihydropyridines"],interactions:["β-blockers can increase bradycardia/AV block with non-dihydropyridines"]},
 "Loop Diuretics":{mechanism:"Inhibit the Na+/K+/2Cl− cotransporter in the thick ascending limb, producing powerful natriuresis.",effects:["Marked diuresis","Reduced extracellular fluid volume","Increased urinary calcium and magnesium"],uses:["Pulmonary oedema","Heart failure fluid overload","Significant oedema"],adverse:["Hypokalaemia","Hyponatraemia","Hypomagnesaemia","Volume depletion","Ototoxicity at high exposure"],contra:["Severe volume depletion; use caution with electrolyte abnormalities"],interactions:["Other ototoxic drugs","NSAIDs may blunt diuretic effect"]},
 "Thiazide Diuretics":{mechanism:"Inhibit the Na+/Cl− cotransporter in the distal convoluted tubule.",effects:["Moderate natriuresis","Reduced urinary calcium excretion","Reduced plasma volume initially"],uses:["Hypertension","Mild oedema","Prevention of calcium stones in selected patients"],adverse:["Hyponatraemia","Hypokalaemia","Hyperuricaemia","Hyperglycaemia"],contra:["Significant electrolyte depletion; caution in severe renal impairment"],interactions:["Lithium levels can rise","NSAIDs may reduce diuretic effect"]},
 "Opioid Analgesics":{mechanism:"Activate opioid receptors, particularly μ receptors, reducing neurotransmitter release and altering pain transmission and perception.",effects:["Analgesia","Sedation","Respiratory depression","Reduced gastrointestinal motility"],uses:["Moderate-to-severe pain","Selected acute and palliative settings"],adverse:["Respiratory depression","Constipation","Nausea","Sedation","Tolerance and dependence"],contra:["Significant respiratory depression"],interactions:["Additive CNS/respiratory depression with sedatives and alcohol"]},
 "NSAIDs":{mechanism:"Inhibit cyclooxygenase enzymes, reducing prostaglandin synthesis. Selectivity for COX-2 varies among agents.",effects:["Analgesic","Antipyretic","Anti-inflammatory"],uses:["Pain","Inflammatory disorders","Dysmenorrhoea"],adverse:["Gastrointestinal irritation/ulceration","Renal impairment","Fluid retention","Bronchospasm in susceptible patients","Increased cardiovascular risk varies by drug"],contra:["Active significant GI bleeding/ulcer disease; severe renal impairment; certain cardiovascular contexts"],interactions:["Anticoagulants increase bleeding risk","ACE inhibitor/diuretic combinations can increase renal risk"]},
 "Penicillins":{mechanism:"β-lactam antibiotics that inhibit bacterial cell-wall peptidoglycan cross-linking by binding penicillin-binding proteins.",effects:["Bactericidal activity against susceptible organisms"],uses:["Susceptible respiratory, skin, urinary and other bacterial infections depending on agent"],adverse:["Hypersensitivity reactions","Diarrhoea","C. difficile-associated disease"],contra:["Serious immediate β-lactam allergy to the relevant agent"],interactions:["Some agents may alter anticoagulant response or methotrexate handling"]},
 "Macrolides":{mechanism:"Bind the bacterial 50S ribosomal subunit and inhibit protein synthesis.",effects:["Usually bacteriostatic at conventional concentrations; activity depends on organism and exposure"],uses:["Selected respiratory and atypical bacterial infections"],adverse:["GI upset","QT prolongation with susceptible agents","Cholestatic reactions with some agents"],contra:["Significant QT-risk situations for susceptible agents"],interactions:["Some macrolides inhibit CYP3A4; interaction burden varies by agent"]},
 "Benzodiazepines":{mechanism:"Enhance GABA-A receptor activity by increasing the frequency of chloride-channel opening in response to GABA.",effects:["Anxiolysis","Sedation","Anticonvulsant activity","Muscle relaxation"],uses:["Anxiety","Acute seizures","Procedural sedation","Alcohol withdrawal"],adverse:["Sedation","Ataxia","Respiratory depression especially with other depressants","Dependence"],contra:["Severe respiratory insufficiency requires caution"],interactions:["Opioids and other CNS depressants increase respiratory/CNS depression"]},
 "SSRIs":{mechanism:"Inhibit the serotonin transporter, reducing serotonin reuptake into presynaptic neurons.",effects:["Enhanced serotonergic signalling over time"],uses:["Depression","Anxiety disorders","OCD and related conditions"],adverse:["GI symptoms","Sexual dysfunction","Insomnia or somnolence","Hyponatraemia","Serotonin syndrome"],contra:["MAOI coadministration is contraindicated because of serotonin toxicity risk"],interactions:["MAOIs and other serotonergic drugs increase serotonin-toxicity risk"]},
 "Anticoagulants":{mechanism:"Reduce coagulation pathway activity to limit fibrin formation; mechanisms differ by class.",effects:["Reduced thrombin/fibrin generation"],uses:["Prevention and treatment of thromboembolism"],adverse:["Bleeding"],contra:["Active major bleeding and selected high-risk situations"],interactions:["Many agents increase bleeding risk; specific interactions depend on anticoagulant"]},
 "Antiplatelet Drugs":{mechanism:"Reduce platelet activation or aggregation through pathways including COX-1, P2Y12 and GPIIb/IIIa.",effects:["Reduced platelet aggregation"],uses:["Arterial thrombosis prevention, including selected coronary and cerebrovascular settings"],adverse:["Bleeding","GI effects with aspirin"],contra:["Active major bleeding"],interactions:["Additive bleeding with anticoagulants and other antiplatelets"]},
 "Corticosteroids":{mechanism:"Bind intracellular glucocorticoid receptors and alter transcription of numerous inflammatory and metabolic genes.",effects:["Broad anti-inflammatory and immunosuppressive actions"],uses:["Inflammatory, allergic, autoimmune and endocrine replacement contexts"],adverse:["Hyperglycaemia","Infection risk","Osteoporosis","Adrenal suppression","Mood changes"],contra:["Context-dependent; systemic infection risk requires careful assessment"],interactions:["Additive immunosuppression with other agents"]},
 "Insulin":{mechanism:"Activates the insulin receptor tyrosine kinase, promoting glucose uptake and storage while suppressing hepatic glucose output.",effects:["Lowers plasma glucose","Promotes anabolic storage","Shifts potassium into cells"],uses:["Type 1 diabetes","Selected type 2 diabetes regimens","DKA and other acute indications"],adverse:["Hypoglycaemia","Weight gain","Hypokalaemia"],contra:["No absolute class-wide contraindication; dosing must match glucose needs"]},
 "Proton Pump Inhibitors":{mechanism:"Irreversibly inhibit the gastric H+/K+-ATPase in parietal cells after activation in acidic canaliculi.",effects:["Marked suppression of gastric acid secretion"],uses:["Peptic ulcer disease","GERD","Part of H. pylori eradication regimens"],adverse:["Headache","GI symptoms; long-term use is associated with selected nutritional/infectious risks"],contra:["Agent-specific hypersensitivity"],interactions:["Absorption and metabolism interactions vary by PPI"]},
 "Local Anaesthetics":{mechanism:"Block voltage-gated sodium channels, preventing action-potential initiation and propagation in excitable tissues.",effects:["Reversible loss of sensation in the administered region"],uses:["Local/regional anaesthesia"],adverse:["CNS toxicity","Cardiovascular toxicity at excessive systemic exposure","Allergy is uncommon and often related to formulation components"],contra:["Agent/site-specific"],interactions:["Additive toxicity with other sodium-channel blockers"]},
 "Paracetamol":{mechanism:"Produces analgesic and antipyretic effects through predominantly central mechanisms; its precise mechanism is multifactorial.",effects:["Analgesia","Antipyresis with little peripheral anti-inflammatory activity"],uses:["Pain","Fever"],adverse:["Usually well tolerated at therapeutic doses; hepatotoxicity can occur in overdose"],contra:["Severe hepatic disease requires careful use"],interactions:["Chronic use can interact with anticoagulant control in some patients; overdose risk increases with duplicate combination products"]}
};

const drugSeeds = [
 ["propranolol","Propranolol","Beta Blockers","Non-selective beta blocker","Blocks β1/β2 receptors.","Hypertension; angina; selected arrhythmias; migraine prevention."],
 ["atenolol","Atenolol","Beta Blockers","β1-selective beta blocker","Preferentially blocks β1 receptors.","Hypertension; angina; selected tachyarrhythmias."],
 ["metoprolol","Metoprolol","Beta Blockers","β1-selective beta blocker","Preferential β1 blockade.","Hypertension; angina; selected heart failure and arrhythmia indications."],
 ["captopril","Captopril","ACE Inhibitors","ACE inhibitor","Inhibits ACE and reduces angiotensin II formation.","Hypertension; heart failure; selected proteinuric renal disease."],
 ["enalapril","Enalapril","ACE Inhibitors","ACE inhibitor","Prodrug converted to enalaprilat, an ACE inhibitor.","Hypertension; heart failure."],
 ["losartan","Losartan","ARBs","AT1 receptor blocker","Blocks angiotensin II AT1 receptors.","Hypertension; selected heart failure; proteinuric renal disease."],
 ["amlodipine","Amlodipine","Calcium Channel Blockers","Dihydropyridine","Blocks L-type calcium channels predominantly in vascular smooth muscle.","Hypertension; angina."],
 ["verapamil","Verapamil","Calcium Channel Blockers","Non-dihydropyridine","Blocks L-type calcium channels with prominent cardiac effects.","Selected supraventricular arrhythmias; angina; hypertension."],
 ["furosemide","Furosemide","Loop Diuretics","Loop diuretic","Inhibits Na+/K+/2Cl− cotransport in the thick ascending limb.","Pulmonary oedema; heart failure fluid overload; oedema."],
 ["hydrochlorothiazide","Hydrochlorothiazide","Thiazide Diuretics","Thiazide","Inhibits Na+/Cl− cotransport in distal convoluted tubule.","Hypertension; mild oedema."],
 ["salbutamol","Salbutamol","Beta-2 Agonists","Short-acting β2 agonist","Stimulates β2 receptors causing bronchial smooth-muscle relaxation.","Relief of bronchospasm in asthma/COPD."],
 ["ipratropium","Ipratropium","Antimuscarinic Bronchodilators","Short-acting antimuscarinic","Blocks muscarinic receptors in airways.","COPD; adjunct in acute bronchospasm."],
 ["omeprazole","Omeprazole","Proton Pump Inhibitors","PPI","Irreversibly inhibits gastric H+/K+-ATPase.","GERD; peptic ulcer disease; H. pylori regimens."],
 ["ondansetron","Ondansetron","Antiemetics","5-HT3 antagonist","Blocks 5-HT3 receptors involved in emesis signalling.","Nausea and vomiting, including selected postoperative/chemotherapy settings."],
 ["morphine","Morphine","Opioid Analgesics","μ-opioid agonist","Activates opioid receptors, especially μ receptors.","Moderate-to-severe pain; selected palliative indications."],
 ["diazepam","Diazepam","Benzodiazepines","Longer-acting benzodiazepine","Enhances GABA-A receptor activity.","Anxiety; seizures; muscle spasm; alcohol withdrawal."],
 ["fluoxetine","Fluoxetine","SSRIs","SSRI","Inhibits serotonin reuptake.","Depression; anxiety disorders; OCD and related indications."],
 ["warfarin","Warfarin","Anticoagulants","Vitamin K antagonist","Reduces synthesis of vitamin K-dependent clotting factors.","Prevention/treatment of selected thromboembolic disorders."],
 ["heparin","Heparin","Heparins","Unfractionated heparin","Potentiates antithrombin activity, inhibiting thrombin and factor Xa.","Rapid anticoagulation; treatment/prevention of thrombosis."],
 ["aspirin","Aspirin","Antiplatelet Drugs","COX-1 inhibitor","Irreversibly acetylates platelet COX-1, reducing thromboxane A2.","Secondary prevention of selected arterial thrombotic events."],
 ["amoxicillin","Amoxicillin","Penicillins","Aminopenicillin","Inhibits bacterial cell-wall synthesis via PBPs.","Susceptible bacterial infections including selected respiratory infections."],
 ["azithromycin","Azithromycin","Macrolides","Macrolide","Binds 50S ribosomal subunit and inhibits bacterial protein synthesis.","Selected respiratory and atypical bacterial infections."],
 ["doxycycline","Doxycycline","Tetracyclines","Tetracycline","Binds 30S ribosomal subunit and inhibits protein synthesis.","Selected bacterial infections including atypical organisms."],
 ["ciprofloxacin","Ciprofloxacin","Fluoroquinolones","Fluoroquinolone","Inhibits bacterial DNA gyrase and topoisomerase IV.","Selected susceptible bacterial infections."],
 ["vancomycin","Vancomycin","Glycopeptides","Glycopeptide","Inhibits bacterial cell-wall synthesis by binding D-Ala-D-Ala termini.","Serious susceptible Gram-positive infections; oral therapy for C. difficile infection."],
 ["rifampicin","Rifampicin","Rifamycins","Rifamycin","Inhibits bacterial DNA-dependent RNA polymerase.","Tuberculosis and selected other susceptible infections."],
 ["fluconazole","Fluconazole","Antifungal Drugs","Triazole antifungal","Inhibits fungal ergosterol synthesis via CYP-dependent 14α-demethylase inhibition.","Selected Candida and other susceptible fungal infections."],
 ["acyclovir","Acyclovir","Antiviral Drugs","Anti-herpes nucleoside analogue","After activation, inhibits viral DNA polymerase and terminates DNA synthesis.","HSV and VZV infections."],
 ["metformin","Metformin","Oral Antidiabetic Drugs","Biguanide","Reduces hepatic glucose production and improves insulin sensitivity.","Type 2 diabetes; commonly first-line pharmacotherapy when appropriate."],
 ["insulin","Insulin","Insulin","Peptide hormone","Activates insulin receptor tyrosine kinase.","Type 1 diabetes; selected type 2 regimens; DKA."],
 ["prednisolone","Prednisolone","Corticosteroids","Glucocorticoid","Activates intracellular glucocorticoid receptors and changes gene transcription.","Inflammatory and immune-mediated conditions."],
 ["methotrexate","Methotrexate","DMARDs","Folate antagonist","Inhibits dihydrofolate reductase at high doses and affects folate-dependent pathways; low-dose immunomodulatory actions are clinically important.","Selected inflammatory disease; malignancy regimens."],
 ["paracetamol","Paracetamol","Non-Opioid Analgesics","Analgesic/antipyretic","Predominantly central analgesic and antipyretic actions.","Pain and fever."],
 ["lidocaine","Lidocaine","Local Anaesthetics","Amide local anaesthetic","Blocks voltage-gated sodium channels.","Local and regional anaesthesia; selected antiarrhythmic use."],
 ["levothyroxine","Levothyroxine","Thyroid Drugs","Thyroid hormone replacement","Synthetic T4 converted peripherally to active T3.","Hypothyroidism."],
 ["carbimazole","Carbimazole","Antithyroid Drugs","Thionamide prodrug","Converted to methimazole, reducing thyroid hormone synthesis.","Hyperthyroidism."],
 ["alendronate","Alendronate","Bisphosphonates","Bisphosphonate","Inhibits osteoclast-mediated bone resorption.","Osteoporosis and selected bone disorders."],
 ["oxytocin","Oxytocin","Drugs Affecting Uterine Contraction","Uterotonic peptide","Activates uterine oxytocin receptors and increases coordinated uterine contraction.","Induction/augmentation of labour; prevention/treatment of postpartum haemorrhage."],
 ["naloxone","Naloxone","Antidotes","Opioid receptor antagonist","Competitively antagonizes opioid receptors, reversing opioid effects.","Opioid toxicity with respiratory/CNS depression."]
];

const drugs = [];
const used = new Set();

drugSeeds.forEach(s => {
  if(used.has(s[0])) return;
  used.add(s[0]);

  const ci = classInfo[s[2]] || {};

  drugs.push({
    id:s[0],
    genericName:s[1],
    class:s[2],
    subclass:s[3],
    category:studyAreas.find(a=>a.topics.some(t=>t===s[2]))?.name || "Pharmacology",
    mechanism:s[4],
    pharmacologicalEffects:ci.effects||["Expected class-related pharmacological effect based on the stated mechanism."],
    indications:s[5].split(";").map(x=>x.trim()),
    contraindications:ci.contra||["Check patient-specific contraindications and product information."],
    adverseEffects:ci.adverse||["Adverse effects vary by agent, dose and patient factors."],
    interactions:ci.interactions||["Review concurrent medicines for pharmacodynamic and pharmacokinetic interactions."],
    pharmacokinetics:{
      absorption:"Agent-specific; route and formulation influence exposure.",
      distribution:"Depends on protein binding, lipophilicity and tissue distribution.",
      metabolism:"Agent-specific hepatic and/or extrahepatic metabolism.",
      excretion:"Agent-specific; renal and/or biliary elimination may contribute."
    },
    monitoring:["Clinical response","Relevant laboratory or physiological monitoring when indicated"],
    importantClinicalPoints:["Use the lowest effective dose appropriate to the clinical objective.","Consider patient-specific contraindications, interactions and organ function."],
    highYield:["propranolol","captopril","furosemide","morphine","warfarin","heparin","amoxicillin","azithromycin","metformin","insulin","paracetamol","naloxone"].includes(s[0]),
    relatedDrugs:[],
    relatedTopics:[s[2],s[3]]
  });
});

function fillRelated(){
  drugs.forEach(d=>{
    d.relatedDrugs=drugs
      .filter(x=>x.class===d.class&&x.id!==d.id)
      .slice(0,5)
      .map(x=>x.id);
  });
}

fillRelated();

const drugClasses = Object.keys(classInfo).map(name=>({
  id:name.toLowerCase().replace(/[^a-z0-9]+/g,"-"),
  name,
  ...classInfo[name]
}));

const topics = studyAreas.flatMap(a=>a.topics.map(t=>({
  id:t.toLowerCase().replace(/[^a-z0-9]+/g,"-"),
  name:t,
  areaId:a.id,
  areaName:a.name
})));

const DEFAULT_HIGH_YIELD_ITEMS = [
  "Pharmacokinetics",
  "Pharmacodynamics",
  "Drug Receptors",
  "Adverse Drug Reactions",
  "Drug Interactions",
  "Beta Blockers",
  "Antihypertensive Drugs",
  "Antiarrhythmic Drugs",
  "Drugs for Heart Failure",
  "Diuretics",
  "Anticoagulants",
  "Antiplatelet Drugs",
  "Antimicrobial Pharmacology",
  "Antiepileptic Drugs",
  "Antidepressants",
  "Antipsychotics",
  "Diabetes Drugs",
  "Corticosteroids",
  "NSAIDs",
  "Anticancer Drugs",
  "Toxicology"
];

let highYieldItems = [];

const flashcards = [
 {id:"fc1",front:"What is the mechanism of action of ACE inhibitors?",back:"They inhibit angiotensin-converting enzyme, reducing angiotensin II formation and aldosterone signalling; bradykinin breakdown is also reduced.",topic:"ACE Inhibitors",difficulty:"medium"},
 {id:"fc2",front:"What is the major dose-related toxicity of opioid analgesics to remember?",back:"Respiratory depression, especially when combined with other CNS/respiratory depressants.",topic:"Opioid Analgesics",difficulty:"easy"},
 {id:"fc3",front:"Why can non-selective beta blockers worsen bronchospasm?",back:"β2 blockade can oppose sympathetic bronchodilation in airway smooth muscle.",topic:"Beta Blockers",difficulty:"medium"},
 {id:"fc4",front:"What is the key mechanism of loop diuretics?",back:"Block the Na+/K+/2Cl− cotransporter in the thick ascending limb of the loop of Henle.",topic:"Loop Diuretics",difficulty:"easy"},
 {id:"fc5",front:"What is the core mechanism of SSRIs?",back:"Inhibit the serotonin transporter and reduce serotonin reuptake into presynaptic neurons.",topic:"SSRIs",difficulty:"easy"},
 {id:"fc6",front:"What does warfarin inhibit functionally?",back:"Vitamin K-dependent synthesis of clotting factors is reduced, decreasing functional factors II, VII, IX and X and proteins C/S.",topic:"Warfarin",difficulty:"medium"},
 {id:"fc7",front:"What is the antidote used to reverse opioid toxicity?",back:"Naloxone, an opioid receptor antagonist that can rapidly reverse opioid-induced respiratory depression.",topic:"Opioid Toxicity",difficulty:"easy"},
 {id:"fc8",front:"What is the key danger of paracetamol overdose?",back:"Potential severe hepatic injury due to toxic metabolite accumulation when normal detoxification pathways are overwhelmed.",topic:"Paracetamol Toxicity",difficulty:"easy"}
];

const questions = [
 {id:"q1",question:"A patient taking propranolol develops wheezing. Which pharmacological action best explains this adverse effect?",options:["β2 receptor blockade","α1 receptor blockade","Muscarinic receptor stimulation","Dopamine receptor blockade"],correctAnswer:0,explanation:"Propranolol is non-selective and blocks β2 receptors, which can reduce β2-mediated bronchodilation.",topic:"Beta Blockers",drug:"propranolol",difficulty:"easy",highYield:true},
 {id:"q2",question:"Which effect is most characteristic of ACE inhibition?",options:["Increased angiotensin II formation","Reduced bradykinin breakdown","Increased aldosterone secretion","Direct β1 receptor blockade"],correctAnswer:1,explanation:"ACE inhibition reduces angiotensin II formation and also reduces bradykinin breakdown, contributing to cough and angioedema.",topic:"ACE Inhibitors",drug:"captopril",difficulty:"easy",highYield:true},
 {id:"q3",question:"Which nephron transporter is inhibited by furosemide?",options:["Na+/Cl− cotransporter in DCT","Na+/K+/2Cl− cotransporter","ENaC","Na+/H+ exchanger"],correctAnswer:1,explanation:"Loop diuretics inhibit the Na+/K+/2Cl− cotransporter in the thick ascending limb.",topic:"Loop Diuretics",drug:"furosemide",difficulty:"easy",highYield:true},
 {id:"q4",question:"Which adverse effect is particularly important with opioid analgesics?",options:["Severe bronchial dilation","Respiratory depression","Marked hypercoagulation","Hyperthyroidism"],correctAnswer:1,explanation:"Opioids can cause dose-related respiratory depression, with risk increased by other CNS depressants.",topic:"Opioid Analgesics",drug:"morphine",difficulty:"easy",highYield:true},
 {id:"q5",question:"A patient receiving an SSRI is prescribed an MAOI without an appropriate washout. What is the major concern?",options:["Serotonin toxicity","Severe hypocalcaemia","Acute iron deficiency","Ototoxicity"],correctAnswer:0,explanation:"Combining serotonergic antidepressants with MAO inhibition can produce potentially serious serotonin toxicity.",topic:"SSRIs",drug:"fluoxetine",difficulty:"medium",highYield:true},
 {id:"q6",question:"Which drug class irreversibly inhibits platelet COX-1 at usual antiplatelet doses?",options:["SSRIs","Aspirin","ACE inhibitors","Benzodiazepines"],correctAnswer:1,explanation:"Aspirin irreversibly acetylates platelet COX-1, reducing thromboxane A2 formation for the life of the platelet.",topic:"Antiplatelet Drugs",drug:"aspirin",difficulty:"easy",highYield:true},
 {id:"q7",question:"Which antibiotic class inhibits bacterial protein synthesis by binding the 50S ribosomal subunit?",options:["Macrolides","Fluoroquinolones","Penicillins","Glycopeptides"],correctAnswer:0,explanation:"Macrolides bind the 50S ribosomal subunit and inhibit bacterial protein synthesis.",topic:"Macrolides",drug:"azithromycin",difficulty:"easy",highYield:true},
 {id:"q8",question:"What is the principal action of insulin on plasma glucose?",options:["Raises hepatic glucose output","Lowers plasma glucose","Blocks glucose uptake into muscle","Inhibits all protein synthesis"],correctAnswer:1,explanation:"Insulin promotes glucose uptake and storage while suppressing hepatic glucose production.",topic:"Insulin",drug:"insulin",difficulty:"easy",highYield:true},
 {id:"q9",question:"Which toxicity is a key concern after a significant paracetamol overdose?",options:["Severe hepatic injury","Permanent β2 blockade","Profound anticoagulation","Ototoxicity as the defining toxicity"],correctAnswer:0,explanation:"Paracetamol overdose can cause severe hepatic injury when toxic metabolite formation exceeds detoxification capacity.",topic:"Paracetamol Toxicity",drug:"paracetamol",difficulty:"easy",highYield:true},
 {id:"q10",question:"What does naloxone do in opioid toxicity?",options:["Activates μ receptors","Antagonizes opioid receptors","Inhibits acetylcholinesterase","Activates GABA-A receptors"],correctAnswer:1,explanation:"Naloxone competitively antagonizes opioid receptors and reverses opioid-induced CNS and respiratory depression.",topic:"Opioid Toxicity",drug:"naloxone",difficulty:"easy",highYield:true},
 {id:"q11",question:"Which drug is a β2-selective bronchodilator used for rapid relief of bronchospasm?",options:["Salbutamol","Warfarin","Omeprazole","Aspirin"],correctAnswer:0,explanation:"Salbutamol is a short-acting β2 agonist that relaxes bronchial smooth muscle.",topic:"Beta-2 Agonists",drug:"salbutamol",difficulty:"easy",highYield:true},
 {id:"q12",question:"Which parameter is directly required in the classic loading-dose relationship?",options:["Clearance only","Volume of distribution","Half-life only","Urine pH only"],correctAnswer:1,explanation:"Loading dose is classically based on target concentration × volume of distribution ÷ bioavailability.",topic:"Loading Dose",drug:null,difficulty:"medium",highYield:true}
];

const pharmacologyState = {
 currentView:"dashboard",
 currentArea:null,
 currentTopic:null,
 currentDrugClass:null,
 currentDrug:null,
 currentSection:"overview",

 studiedTopics:[],
 studiedDrugs:[],
 studiedClasses:[],

 bookmarks:[],
 difficultItems:[],

 recentTopics:[],
recentDrugs:[],

highYieldItems:[],

questionState:{
   index:0,
   selected:null,
   checked:false,
   attempted:0,
   correct:0,
   incorrect:0
 },

 flashcardState:{
   index:0,
   revealed:false,
   known:[],
   difficult:[]
 },

 work:[],

 theme:"dark"
};

const $ = id => document.getElementById(id);

const esc = s => String(s ?? "").replace(
  /[&<>"']/g,
  c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[c])
);

const uniqPush = (arr,v,max=8) => {
  const a = arr.filter(x=>x!==v);
  a.unshift(v);
  return a.slice(0,max);
};

function safeState(raw){
  if(!raw || typeof raw!=="object") return;

  const a=[
  "studiedTopics",
  "studiedDrugs",
  "studiedClasses",
  "bookmarks",
  "difficultItems",
  "recentTopics",
  "recentDrugs",
  "work",
  "highYieldItems",
]

  a.forEach(k=>{
    if(!Array.isArray(raw[k])) raw[k]=[];
  });

  if(
  raw.highYieldItems.length === 0 &&
  Array.isArray(highYieldItems) &&
  highYieldItems.length > 0
){

  raw.highYieldItems =
    highYieldItems.map(item => ({

      id:
        `hy-${String(item)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g,"-")
          .replace(/^-|-$/g,"")}`,

      name:
        String(item),

      aiGenerated:
        false,

      createdAt:
        new Date().toISOString()

    }));

}

  if(!raw.questionState || typeof raw.questionState!=="object"){
    raw.questionState={
      index:0,
      selected:null,
      checked:false,
      attempted:0,
      correct:0,
      incorrect:0
    };
  }

  if(!raw.flashcardState || typeof raw.flashcardState!=="object"){
    raw.flashcardState={
      index:0,
      revealed:false,
      known:[],
      difficult:[]
    };
  }

  if(!["dark","light"].includes(raw.theme)){
    raw.theme="dark";
  }

  Object.assign(pharmacologyState,raw);
}

function loadPharmacologyState(){
  try{
    const raw=JSON.parse(
      localStorage.getItem(STORAGE_KEY)||"null"
    );
    safeState(raw);
  }catch(e){
    /* offline storage may be unavailable */
  }
}

function savePharmacologyState(){
  try{
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(pharmacologyState)
    );
  }catch(e){
    /* graceful failure */
  }
}

const saveState=savePharmacologyState;
const loadState=loadPharmacologyState;

/* ============================================================
   SHARED AI RESPONSE FORMATTER
   Must be module-scope so My Work can use it.
   ============================================================ */

function formatPharmacologyAIResponse(text) {

    const raw = String(text || "");

    if (!raw.trim()) {
        return "";
    }

    const escapeHTML = (value) =>
        String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    const escaped = escapeHTML(raw);

    return escaped
        .replace(
            /```([\s\S]*?)```/g,
            (_, code) =>
                `<pre class="pharmacology-ai-code"><code>${code.trim()}</code></pre>`
        )
        .replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        )
        .replace(
            /^### (.*)$/gm,
            "<h4>$1</h4>"
        )
        .replace(
            /^## (.*)$/gm,
            "<h3>$1</h3>"
        )
        .replace(
            /^# (.*)$/gm,
            "<h2>$1</h2>"
        )
        .replace(
            /^[-•] (.*)$/gm,
            "<li>$1</li>"
        )
        .replace(
            /(<li>.*<\/li>)/gs,
            "<ul>$1</ul>"
        )
        .replace(
            /\n{2,}/g,
            "</p><p>"
        )
        .replace(
            /\n/g,
            "<br>"
        );
}
/* ============================================================
   MY WORK
   File-style personal workspace for Pharmacology.

   Supports:
   - Notes
   - Saved AI answers
   - Open/read
   - Edit
   - Rename
   - Delete
   - Persistent localStorage storage
   ============================================================ */

let currentWorkItemId = null;

let latestAIContent = "";


/* ============================================================
   ID
   ============================================================ */

function createWorkId(){

    return (
        "pharm-work-" +
        Date.now().toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .slice(2,8)
    );
}


/* ============================================================
   GET WORK ITEM
   ============================================================ */

function getWorkItem(id){

    return (
        pharmacologyState.work.find(
            item =>
                item &&
                item.id === id
        ) || null
    );
}


/* ============================================================
   NORMALIZE WORK ITEM
   ============================================================ */

function normalizeWorkItem(item){

    if(
        !item ||
        typeof item !== "object"
    ){

        return null;
    }

    return {

        id:
            String(
                item.id ||
                createWorkId()
            ),

        type:
            item.type === "ai"
                ? "ai"
                : "note",

        title:
            String(
                item.title ||
                (
                    item.type === "ai"
                        ? "Pharmacology AI Answer"
                        : "Untitled Note"
                )
            ).trim() ||
            "Untitled",

        content:
            String(
                item.content || ""
            ),

        topic:
            String(
                item.topic || ""
            ),

        drug:
            String(
                item.drug || ""
            ),

        drugClass:
            String(
                item.drugClass || ""
            ),

        section:
            String(
                item.section ||
                "overview"
            ),

        createdAt:
            item.createdAt ||
            new Date().toISOString(),

        updatedAt:
            item.updatedAt ||
            item.createdAt ||
            new Date().toISOString()
    };
}


/* ============================================================
   SAVE WORK ITEM
   ============================================================ */

function saveWorkItem(data = {}){

    if(
        !Array.isArray(
            pharmacologyState.work
        )
    ){

        pharmacologyState.work = [];
    }

    const workId =
        data.id ||
        createWorkId();

    const now =
        new Date().toISOString();

    const existing =
        getWorkItem(workId);

    const item = {

        id:
            workId,

        type:
            data.type === "ai"
                ? "ai"
                : "note",

        title:
            String(
                data.title ||
                (
                    data.type === "ai"
                        ? "Pharmacology AI Answer"
                        : "Untitled Note"
                )
            ).trim() ||
            "Untitled",

        content:
            String(
                data.content || ""
            ),

        topic:
            String(
                data.topic ??
                existing?.topic ??
                pharmacologyState.currentTopic ??
                ""
            ),

        drug:
            String(
                data.drug ??
                existing?.drug ??
                pharmacologyState.currentDrug ??
                ""
            ),

        drugClass:
            String(
                data.drugClass ??
                existing?.drugClass ??
                pharmacologyState.currentDrugClass ??
                ""
            ),

        section:
            String(
                data.section ??
                existing?.section ??
                pharmacologyState.currentSection ??
                "overview"
            ),

        createdAt:
            existing?.createdAt ||
            data.createdAt ||
            now,

        updatedAt:
            now
    };


    const index =
        pharmacologyState.work.findIndex(
            existingItem =>
                existingItem.id === workId
        );


    if(index >= 0){

        pharmacologyState.work[index] =
            item;

    }else{

        pharmacologyState.work.unshift(
            item
        );
    }


    saveState();

    renderWork();

    return item;
}


/* ============================================================
   DELETE
   ============================================================ */

function deleteWorkItem(id){

    const item =
        getWorkItem(id);

    if(!item){

        return;
    }


    pharmacologyState.work =
        pharmacologyState.work.filter(
            work =>
                work.id !== id
        );


    if(
        currentWorkItemId === id
    ){

        currentWorkItemId = null;
    }


    saveState();

    renderWork();
}


/* ============================================================
   RENAME
   ============================================================ */

function openWorkTitleDialog(item) {
    if (!item || !item.id) {
        console.error("[PHARMACOLOGY WORK] Cannot rename: invalid item.", item);
        return;
    }

    const oldDialog =
        document.getElementById(
            "pharmacology-work-title-dialog"
        );

    if (oldDialog) {
        oldDialog.remove();
    }

    const dialog =
        document.createElement("div");

    dialog.id =
        "pharmacology-work-title-dialog";

    dialog.className =
        "pharmacology-work-dialog-overlay";

    dialog.innerHTML = `
        <form
            id="pharmacology-work-title-form"
            class="pharmacology-work-dialog"
            novalidate
        >

            <div class="pharmacology-work-dialog-header">

                <div>
                    <h3>
                        Rename file
                    </h3>

                    <p>
                        Enter a new name for this file.
                    </p>
                </div>

                <button
                    type="button"
                    class="pharmacology-work-dialog-close"
                    id="pharmacology-work-title-dialog-close"
                    aria-label="Close"
                >
                    ×
                </button>

            </div>

            <div class="pharmacology-work-dialog-body">

                <label
                    for="pharmacology-work-title-input"
                >
                    File name
                </label>

                <input
                    type="text"
                    id="pharmacology-work-title-input"
                    class="pharmacology-work-dialog-input"
                    autocomplete="off"
                    spellcheck="false"
                    maxlength="200"
                />

                <div
                    id="pharmacology-work-title-error"
                    class="pharmacology-work-title-error"
                    hidden
                >
                    Please enter a file name.
                </div>

            </div>

            <div class="pharmacology-work-dialog-actions">

                <button
                    type="button"
                    id="pharmacology-work-title-cancel"
                    class="pharmacology-work-editor-button"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    id="pharmacology-work-title-save"
                    class="pharmacology-work-editor-button primary"
                >
                    Save
                </button>

            </div>

        </form>
    `;

    document.body.appendChild(dialog);


    /* =========================================================
       ELEMENTS
       ========================================================= */

    const form =
        document.getElementById(
            "pharmacology-work-title-form"
        );

    const input =
        document.getElementById(
            "pharmacology-work-title-input"
        );

    const saveButton =
        document.getElementById(
            "pharmacology-work-title-save"
        );

    const cancelButton =
        document.getElementById(
            "pharmacology-work-title-cancel"
        );

    const closeButton =
        document.getElementById(
            "pharmacology-work-title-dialog-close"
        );

    const errorMessage =
        document.getElementById(
            "pharmacology-work-title-error"
        );


    /* =========================================================
       SET CURRENT VALUE
       ========================================================= */

    if (input) {
        input.value =
            String(item.title || "");
    }


    /* =========================================================
       CLOSE
       ========================================================= */

    function closeDialog() {
        if (dialog && dialog.parentNode) {
            dialog.remove();
        }
    }


    /* =========================================================
       SAVE RENAME
       ========================================================= */

    function saveRename(event) {

        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        console.log(
            "[PHARMACOLOGY WORK] Rename save clicked."
        );

        if (!input) {
            console.error(
                "[PHARMACOLOGY WORK] Rename input not found."
            );
            return;
        }

        const newTitle =
            String(input.value || "").trim();


        /* -----------------------------------------------------
           VALIDATION
           ----------------------------------------------------- */

        if (!newTitle) {

            if (errorMessage) {
                errorMessage.hidden = false;
            }

            input.classList.add(
                "pharmacology-work-input-error"
            );

            input.focus();

            return;
        }


        input.classList.remove(
            "pharmacology-work-input-error"
        );

        if (errorMessage) {
            errorMessage.hidden = true;
        }


        /* -----------------------------------------------------
           FIND THE REAL ITEM IN STATE
           ----------------------------------------------------- */

        const workItems =
            Array.isArray(
                pharmacologyState.work
            )
                ? pharmacologyState.work
                : [];

        const stateItem =
            workItems.find(
                workItem =>
                    workItem &&
                    workItem.id === item.id
            );


        if (!stateItem) {

            console.error(
                "[PHARMACOLOGY WORK] Could not find work item:",
                item.id
            );

            return;
        }


        /* -----------------------------------------------------
           UPDATE
           ----------------------------------------------------- */

        stateItem.title =
            newTitle;

        stateItem.updatedAt =
            new Date().toISOString();


        /* -----------------------------------------------------
           SAVE STATE
           ----------------------------------------------------- */

        try {

            saveState();

            console.log(
                "[PHARMACOLOGY WORK] Rename saved:",
                stateItem.id,
                stateItem.title
            );

        } catch (error) {

            console.error(
                "[PHARMACOLOGY WORK] Failed to save renamed file:",
                error
            );

            return;
        }


        /* -----------------------------------------------------
           CLOSE + REFRESH
           ----------------------------------------------------- */

        closeDialog();

        currentWorkItemId =
            stateItem.id;

        renderWorkEditor();
    }


    /* =========================================================
       FORM SUBMIT
       ========================================================= */

    if (form) {

        form.addEventListener(
            "submit",
            saveRename
        );

    }


    /* =========================================================
       CANCEL
       ========================================================= */

    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                closeDialog();

            }
        );

    }


    /* =========================================================
       CLOSE BUTTON
       ========================================================= */

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                closeDialog();

            }
        );

    }


    /* =========================================================
       CLICK OUTSIDE
       ========================================================= */

    dialog.addEventListener(
        "click",
        function (event) {

            if (
                event.target === dialog
            ) {
                closeDialog();
            }

        }
    );


    /* =========================================================
       KEYBOARD
       ========================================================= */

    if (input) {

        input.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape"
                ) {

                    event.preventDefault();

                    closeDialog();

                }

            }
        );

    }


    /* =========================================================
       FOCUS
       ========================================================= */

    setTimeout(
        function () {

            if (input) {

                input.focus();
                input.select();

            }

        },
        50
    );
}


/* ============================================================
   EDIT
   ============================================================ */

function editWorkItem(id){

    const item =
        getWorkItem(id);

    if(!item){

        return;
    }


    currentWorkItemId =
        id;

    renderWorkEditor();
}


/* ============================================================
   DATE
   ============================================================ */

function formatWorkDate(value){

    if(!value){

        return "";
    }

    const date =
        new Date(value);

    if(
        Number.isNaN(
            date.getTime()
        )
    ){

        return "";
    }


    return date.toLocaleDateString(
        undefined,
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );
}


/* ============================================================
   ESCAPE HTML
   ============================================================ */

function escapeWorkHTML(value){

    return String(
        value ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );
}


/* ============================================================
   CONTENT FORMATTER
   ============================================================ */

function formatWorkContent(text) {

    const source = String(text || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .trim();

    if (!source) {
        return `
            <div class="pharmacology-work-document-empty">
                This document is empty.
            </div>
        `;
    }

    const escapeHTML = (value) => {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };


    /* =========================================================
       INLINE MARKDOWN
       ========================================================= */

    const inline = (value) => {

        let result =
            escapeHTML(value);

        /* Inline code */
        result = result.replace(
            /`([^`]+)`/g,
            "<code>$1</code>"
        );

        /* Bold */
        result = result.replace(
            /\*\*(.+?)\*\*/g,
            "<strong>$1</strong>"
        );

        result = result.replace(
            /__(.+?)__/g,
            "<strong>$1</strong>"
        );

        /* Italic */
        result = result.replace(
            /(^|[^\*])\*([^*\n]+)\*(?!\*)/g,
            "$1<em>$2</em>"
        );

        result = result.replace(
            /(^|[^\w])_([^_\n]+)_(?!\w)/g,
            "$1<em>$2</em>"
        );

        /* Links */
        result = result.replace(
            /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
        );

        return result;
    };


    /* =========================================================
       TABLE HELPERS
       ========================================================= */

    const isTableRow = (line) => {

        const trimmed =
            String(line || "").trim();

        return (
            trimmed.startsWith("|") &&
            trimmed.endsWith("|") &&
            trimmed.split("|").length >= 3
        );
    };


    const isTableSeparator = (line) => {

        if (!isTableRow(line)) {
            return false;
        }

        const cells =
            line
                .trim()
                .replace(/^\|/, "")
                .replace(/\|$/, "")
                .split("|")
                .map(cell =>
                    cell.trim()
                );

        return (
            cells.length > 0 &&
            cells.every(cell =>
                /^:?-{3,}:?$/.test(cell)
            )
        );
    };


    const parseTableRow = (line) => {

        let value =
            String(line || "").trim();

        if (value.startsWith("|")) {
            value = value.slice(1);
        }

        if (value.endsWith("|")) {
            value =
                value.slice(0, -1);
        }

        return value
            .split("|")
            .map(cell =>
                cell.trim()
            );
    };


    const getTableAlignment = (separator) => {

        if (/^:-+$/.test(separator)) {
            return "left";
        }

        if (/^-+:$/.test(separator)) {
            return "right";
        }

        if (/^:-+:$/.test(separator)) {
            return "center";
        }

        return "left";
    };


    const renderTable = (tableLines) => {

        if (!tableLines.length) {
            return "";
        }

        const header =
            parseTableRow(
                tableLines[0]
            );

        if (
            tableLines.length < 2 ||
            !isTableSeparator(tableLines[1])
        ) {
            return "";
        }

        const separator =
            parseTableRow(
                tableLines[1]
            );

        const body =
            tableLines
                .slice(2)
                .map(parseTableRow);

        const columnCount =
            Math.max(
                header.length,
                ...body.map(row =>
                    row.length
                )
            );

        const normalizedHeader =
            Array.from(
                { length: columnCount },
                (_, index) =>
                    header[index] || ""
            );

        const normalizedSeparator =
            Array.from(
                { length: columnCount },
                (_, index) =>
                    separator[index] || "---"
            );

        let html = `
            <div class="pharmacology-work-table-wrap">
                <table class="pharmacology-work-table">

                    <thead>
                        <tr>
        `;

        normalizedHeader.forEach(
            (cell, index) => {

                const alignment =
                    getTableAlignment(
                        normalizedSeparator[index]
                    );

                html += `
                    <th
                        style="text-align:${alignment}"
                    >
                        ${inline(cell)}
                    </th>
                `;
            }
        );

        html += `
                        </tr>
                    </thead>
                    <tbody>
        `;

        body.forEach(row => {

            html += "<tr>";

            for (
                let index = 0;
                index < columnCount;
                index++
            ) {

                const value =
                    row[index] || "";

                const alignment =
                    getTableAlignment(
                        normalizedSeparator[index]
                    );

                html += `
                    <td
                        style="text-align:${alignment}"
                    >
                        ${inline(value)}
                    </td>
                `;
            }

            html += "</tr>";
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        return html;
    };


    /* =========================================================
       MAIN PARSER
       ========================================================= */

    const lines =
        source.split("\n");

    let html = "";

    let paragraph = [];

    let inBulletList = false;

    let inNumberList = false;

    let inCodeBlock = false;

    let codeLines = [];


    const flushParagraph = () => {

        if (!paragraph.length) {
            return;
        }

        const content =
            paragraph
                .map(line =>
                    inline(line)
                )
                .join("<br>");

        html += `
            <p class="pharmacology-work-document-paragraph">
                ${content}
            </p>
        `;

        paragraph = [];
    };


    const closeLists = () => {

        if (inBulletList) {

            html += "</ul>";

            inBulletList = false;
        }

        if (inNumberList) {

            html += "</ol>";

            inNumberList = false;
        }
    };


    /* =========================================================
       LINE-BY-LINE PARSING
       ========================================================= */

    for (
        let i = 0;
        i < lines.length;
        i++
    ) {

        const rawLine =
            lines[i];

        const line =
            rawLine.trim();


        /* -----------------------------------------------------
           CODE BLOCK
           ----------------------------------------------------- */

        if (/^```/.test(line)) {

            flushParagraph();

            closeLists();

            if (!inCodeBlock) {

                inCodeBlock = true;

                codeLines = [];

            } else {

                html += `
                    <pre class="pharmacology-work-document-code"><code>${escapeHTML(
                        codeLines.join("\n")
                    )}</code></pre>
                `;

                inCodeBlock = false;

                codeLines = [];
            }

            continue;
        }


        if (inCodeBlock) {

            codeLines.push(
                rawLine
            );

            continue;
        }


        /* -----------------------------------------------------
           TABLE
           ----------------------------------------------------- */

        if (
            isTableRow(line) &&
            i + 1 < lines.length &&
            isTableSeparator(
                lines[i + 1].trim()
            )
        ) {

            flushParagraph();

            closeLists();

            const tableLines = [
                line,
                lines[i + 1].trim()
            ];

            i += 2;

            while (
                i < lines.length &&
                isTableRow(
                    lines[i].trim()
                )
            ) {

                tableLines.push(
                    lines[i].trim()
                );

                i++;
            }

            i--;

            html +=
                renderTable(
                    tableLines
                );

            continue;
        }


        /* -----------------------------------------------------
           EMPTY LINE
           ----------------------------------------------------- */

        if (!line) {

            flushParagraph();

            closeLists();

            continue;
        }


        /* -----------------------------------------------------
           HORIZONTAL RULE
           ----------------------------------------------------- */

        if (
            /^(-{3,}|\*{3,}|_{3,})$/.test(
                line
            )
        ) {

            flushParagraph();

            closeLists();

            html += `
                <hr class="pharmacology-work-document-rule">
            `;

            continue;
        }


        /* -----------------------------------------------------
           H1
           ----------------------------------------------------- */

        if (/^#\s+/.test(line)) {

            flushParagraph();

            closeLists();

            html += `
                <h1 class="pharmacology-work-document-h1">
                    ${inline(
                        line.replace(
                            /^#\s+/,
                            ""
                        )
                    )}
                </h1>
            `;

            continue;
        }


        /* -----------------------------------------------------
           H2
           ----------------------------------------------------- */

        if (/^##\s+/.test(line)) {

            flushParagraph();

            closeLists();

            html += `
                <h2 class="pharmacology-work-document-h2">
                    ${inline(
                        line.replace(
                            /^##\s+/,
                            ""
                        )
                    )}
                </h2>
            `;

            continue;
        }


        /* -----------------------------------------------------
           H3
           ----------------------------------------------------- */

        if (/^###\s+/.test(line)) {

            flushParagraph();

            closeLists();

            html += `
                <h3 class="pharmacology-work-document-h3">
                    ${inline(
                        line.replace(
                            /^###\s+/,
                            ""
                        )
                    )}
                </h3>
            `;

            continue;
        }


        /* -----------------------------------------------------
           H4
           ----------------------------------------------------- */

        if (/^####\s+/.test(line)) {

            flushParagraph();

            closeLists();

            html += `
                <h4 class="pharmacology-work-document-h4">
                    ${inline(
                        line.replace(
                            /^####\s+/,
                            ""
                        )
                    )}
                </h4>
            `;

            continue;
        }


        /* -----------------------------------------------------
           BULLET LIST
           ----------------------------------------------------- */

        const bulletMatch =
            line.match(
                /^[-*+]\s+(.+)$/
            );

        if (bulletMatch) {

            flushParagraph();

            if (inNumberList) {

                html += "</ol>";

                inNumberList = false;
            }

            if (!inBulletList) {

                html += `
                    <ul class="pharmacology-work-document-list">
                `;

                inBulletList = true;
            }

            html += `
                <li>
                    ${inline(
                        bulletMatch[1]
                    )}
                </li>
            `;

            continue;
        }


        /* -----------------------------------------------------
           NUMBERED LIST
           ----------------------------------------------------- */

        const numberMatch =
            line.match(
                /^\d+\.\s+(.+)$/
            );

        if (numberMatch) {

            flushParagraph();

            if (inBulletList) {

                html += "</ul>";

                inBulletList = false;
            }

            if (!inNumberList) {

                html += `
                    <ol class="pharmacology-work-document-list">
                `;

                inNumberList = true;
            }

            html += `
                <li>
                    ${inline(
                        numberMatch[1]
                    )}
                </li>
            `;

            continue;
        }


        /* -----------------------------------------------------
           BLOCKQUOTE
           ----------------------------------------------------- */

        if (/^>\s?/.test(line)) {

            flushParagraph();

            closeLists();

            html += `
                <blockquote class="pharmacology-work-document-quote">
                    ${inline(
                        line.replace(
                            /^>\s?/,
                            ""
                        )
                    )}
                </blockquote>
            `;

            continue;
        }


        /* -----------------------------------------------------
           NORMAL TEXT
           ----------------------------------------------------- */

        closeLists();

        paragraph.push(
            rawLine
        );
    }


    /* =========================================================
       FINALIZE
       ========================================================= */

    if (inCodeBlock) {

        html += `
            <pre class="pharmacology-work-document-code"><code>${escapeHTML(
                codeLines.join("\n")
            )}</code></pre>
        `;
    }

    flushParagraph();

    closeLists();

    return html;
}

/* ============================================================
   PHARMACOLOGY AI COMMAND EXECUTOR
   STEP 3A — ADD FLASHCARD
   ============================================================ */

function executePharmacologyAICommand(command) {

    if (
        !command ||
        command.type !== "module_action" ||
        command.module !== "Y3-003-Pharmacology"
    ) {
        return {
            success: false,
            message: "Invalid Pharmacology AI command."
        };
    }

    if (
    command.target !== "flashcards" ||
    ![
        "add_flashcard",
        "edit_flashcard"
    ].includes(command.action)
) {
    return {
        success: false,
        message:
            "This Pharmacology AI flashcard command is not supported yet."
    };
}

    if (
        command.target !==
        pharmacologyAICommandLayer.TARGETS.FLASHCARDS
    ) {
        return {
            success: false,
            message:
                "The command target is not supported yet."
        };
    }

    const data = command.data || {};

    let cards = [];

    if (Array.isArray(data.cards)) {
        cards = data.cards;
    } else if (
        data.front ||
        data.question
    ) {
        cards = [data];
    }

    if (!cards.length) {
        return {
            success: false,
            message:
                "The AI did not provide any flashcards."
        };
    }

    const existingCards = flashcards;

if (!Array.isArray(existingCards)) {
    return {
        success: false,
        message:
            "The Pharmacology flashcard collection could not be found."
    };
}

    const now = Date.now();

    const newCards =
        cards
            .map((card, index) => {

                const front =
                    String(
                        card?.front ??
                        card?.question ??
                        ""
                    ).trim();

                const back =
                    String(
                        card?.back ??
                        card?.answer ??
                        ""
                    ).trim();

                if (!front || !back) {
                    return null;
                }

                return {
                    id:
                        `ai-fc-${now}-${index}-${Math.random()
                            .toString(36)
                            .slice(2, 8)}`,

                    front,

                    back,

                    topic:
                        String(
                            card?.topic ||
                            pharmacologyState.currentTopic ||
                            "AI Generated"
                        ).trim(),

                    difficulty:
                        String(
                            card?.difficulty ||
                            "medium"
                        ).trim(),

                    aiGenerated: true,

                    createdAt:
                        new Date().toISOString()
                };

            })
            .filter(Boolean);

    if (!newCards.length) {
        return {
            success: false,
            message:
                "No valid flashcards were found in the AI command."
        };
    }

    existingCards.push(
        ...newCards
    );

    saveState();

    console.log(
        "[PHARMACOLOGY AI] Flashcards added:",
        newCards
    );

    return {
        success: true,

        action:
            "add_flashcard",

        target:
            "flashcards",

        count:
            newCards.length,

        cards:
            newCards,

        message:
            `${newCards.length} flashcard${
                newCards.length === 1
                    ? ""
                    : "s"
            } added successfully.`
    };
}
/* ============================================================
   WORK META
   ============================================================ */

function getWorkTypeLabel(item){

    return item.type === "ai"
        ? "AI Answer"
        : "Note";
}


function getWorkIcon(item){

    return item.type === "ai"
        ? "✦"
        : "▤";
}


function getWorkContext(item){

    const parts = [];

    if(item.topic){

        parts.push(
            item.topic
        );
    }

    if(item.drug){

        parts.push(
            item.drug
        );
    }

    if(item.drugClass){

        parts.push(
            item.drugClass
        );
    }


    return parts.join(
        " · "
    );
}


/* ============================================================
   RENDER MY WORK
   ============================================================ */

function renderWork(){

    const container =
        $("pharmacology-work-list");

    if(!container){

        return;
    }


    if(
        currentWorkItemId
    ){

        renderWorkEditor();

        return;
    }


    if(
        !Array.isArray(
            pharmacologyState.work
        )
    ){

        pharmacologyState.work = [];
    }


    /* --------------------------------------------------------
       EMPTY STATE
       -------------------------------------------------------- */

    if(
        pharmacologyState.work.length === 0
    ){

        container.innerHTML = `

            <div class="pharmacology-work-empty">

                <div class="pharmacology-work-empty-icon">
                    ▤
                </div>

                <h3>
                    No saved work yet
                </h3>

                <p>
                    Your saved AI answers and Pharmacology
                    notes will appear here as files.
                </p>

                <button
                    type="button"
                    class="pharmacology-btn primary"
                    id="pharmacology-work-empty-new-note"
                >
                    + New Note
                </button>

            </div>
        `;


        const newButton =
            $(
                "pharmacology-work-empty-new-note"
            );

        if(newButton){

            newButton.addEventListener(
                "click",
                createNewPharmacologyNote
            );
        }


        return;
    }


    /* --------------------------------------------------------
       SORT
       -------------------------------------------------------- */

    const items =
        pharmacologyState.work
            .map(
                normalizeWorkItem
            )
            .filter(Boolean)
            .sort(
                (
                    a,
                    b
                ) =>
                    new Date(
                        b.updatedAt
                    ) -
                    new Date(
                        a.updatedAt
                    )
            );


    /* --------------------------------------------------------
       FILE LIST
       -------------------------------------------------------- */

    container.innerHTML = `

        <div class="pharmacology-work-files">

            ${items.map(item => {

                const title =
                    escapeWorkHTML(
                        item.title
                    );

                const context =
                    escapeWorkHTML(
                        getWorkContext(
                            item
                        )
                    );

                const type =
                    getWorkTypeLabel(
                        item
                    );

                const icon =
                    getWorkIcon(
                        item
                    );

                return `

                    <div
                        class="pharmacology-work-file"
                        data-work-id="${escapeWorkHTML(item.id)}"
                        tabindex="0"
                        role="button"
                    >

                        <div
                            class="pharmacology-work-file-icon
                            ${item.type === "ai"
                                ? "is-ai"
                                : "is-note"}"
                        >
                            ${icon}
                        </div>

                        <div class="pharmacology-work-file-main">

                            <div class="pharmacology-work-file-title">
                                ${title}
                            </div>

                            <div class="pharmacology-work-file-meta">

                                <span>
                                    ${type}
                                </span>

                                <span>
                                    ${formatWorkDate(
                                        item.updatedAt
                                    )}
                                </span>

                                ${
                                    context
                                        ? `<span>${context}</span>`
                                        : ""
                                }

                            </div>

                        </div>

                        <div
                            class="pharmacology-work-file-actions"
                        >

                            <button
                                type="button"
                                class="pharmacology-work-file-action"
                                data-work-action="rename"
                                data-work-id="${escapeWorkHTML(item.id)}"
                                title="Rename"
                            >
                                Rename
                            </button>

                            <button
                                type="button"
                                class="pharmacology-work-file-action"
                                data-work-action="delete"
                                data-work-id="${escapeWorkHTML(item.id)}"
                                title="Delete"
                            >
                                Delete
                            </button>

                        </div>

                    </div>
                `;
            }).join("")}

        </div>
    `;


    /* --------------------------------------------------------
       OPEN FILE
       -------------------------------------------------------- */

    container
        .querySelectorAll(
            ".pharmacology-work-file"
        )
        .forEach(
            file => {

                file.addEventListener(
                    "click",
                    event => {

                        if(
                            event.target.closest(
                                "[data-work-action]"
                            )
                        ){

                            return;
                        }


                        const id =
                            file.dataset.workId;

                        if(id){

                            currentWorkItemId =
                                id;

                            renderWorkEditor();
                        }
                    }
                );


                file.addEventListener(
                    "keydown",
                    event => {

                        if(
                            event.key !==
                            "Enter" &&
                            event.key !==
                            " "
                        ){

                            return;
                        }


                        if(
                            event.target.closest(
                                "[data-work-action]"
                            )
                        ){

                            return;
                        }


                        event.preventDefault();


                        const id =
                            file.dataset.workId;

                        if(id){

                            currentWorkItemId =
                                id;

                            renderWorkEditor();
                        }
                    }
                );
            }
        );


    /* --------------------------------------------------------
       FILE ACTIONS
       -------------------------------------------------------- */

    container
        .querySelectorAll(
            "[data-work-action]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();


                        const id =
                            button.dataset.workId;

                        const action =
                            button.dataset.workAction;


                        if(
                            action === "rename"
                        ){

                            renameWorkItem(
                                id
                            );

                            return;
                        }


                        if(
                            action === "delete"
                        ){

                            openWorkDeleteDialog(
                                id
                            );
                        }
                    }
                );
            }
        );
}


/* ============================================================
   OPEN WORK EDITOR
   ============================================================ */

function renderWorkEditor() {

    const container =
        $("pharmacology-work-list");

    if (!container) {
        return;
    }

    const item =
        getWorkItem(currentWorkItemId);

    if (!item) {
        currentWorkItemId = null;
        renderWork();
        return;
    }

    const context =
        getWorkContext(item);

    container.innerHTML = `
        <div class="pharmacology-work-editor">

            <div class="pharmacology-work-editor-toolbar">

                <div class="pharmacology-work-editor-toolbar-left">

                    <button
                        type="button"
                        class="pharmacology-work-editor-button"
                        id="pharmacology-work-back"
                    >
                        ← Back
                    </button>

                    <div class="pharmacology-work-editor-file-info">

                        <div class="pharmacology-work-editor-icon">
                            ${getWorkIcon(item)}
                        </div>

                        <div>
                            <div class="pharmacology-work-editor-title">
                                ${escapeWorkHTML(item.title)}
                            </div>

                            <div class="pharmacology-work-editor-meta">
                                ${escapeWorkHTML(
                                    getWorkTypeLabel(item)
                                )}
                                ${context ? " · " + escapeWorkHTML(context) : ""}
                            </div>
                        </div>

                    </div>

                </div>

                <div class="pharmacology-work-editor-toolbar-right">

                    <button
                        type="button"
                        class="pharmacology-work-editor-button"
                        id="pharmacology-work-rename"
                    >
                        Rename
                    </button>

                    <button
                        type="button"
                        class="pharmacology-work-editor-button danger"
                        id="pharmacology-work-delete"
                    >
                        Delete
                    </button>

                    <button
                        type="button"
                        class="pharmacology-work-editor-button primary"
                        id="pharmacology-work-edit"
                    >
                        Edit
                    </button>

                </div>

            </div>


            <div
                class="pharmacology-work-editor-body"
                id="pharmacology-work-editor-body"
            >

                <article
                    id="pharmacology-work-editor-content"
                    class="pharmacology-work-document"
                >
                    ${formatWorkContent(item.content)}
                </article>

            </div>

        </div>
    `;


    /* ---------------------------------------------------------
       BACK
       --------------------------------------------------------- */

    const backButton =
        $("pharmacology-work-back");

    if (backButton) {

        backButton.addEventListener(
            "click",
            () => {

                currentWorkItemId = null;

                renderWork();

            }
        );

    }


    /* ---------------------------------------------------------
       RENAME
       --------------------------------------------------------- */

    function renderWorkEditor() {
    const container = document.getElementById(
        "pharmacology-work-list"
    );

    if (!container) {
        return;
    }

    const item = getWorkItem(currentWorkItemId);

    if (!item) {
        currentWorkItemId = null;
        renderWork();
        return;
    }

    const safeItem = normalizeWorkItem(item);

    container.innerHTML = `
        <div class="pharmacology-work-editor">

            <!-- =====================================================
                 EDITOR HEADER
                 ===================================================== -->

            <div class="pharmacology-work-editor-header">

                <div class="pharmacology-work-editor-heading">

                    <div class="pharmacology-work-editor-title-wrap">

                        <div class="pharmacology-work-editor-icon">
                            ${getWorkIcon(safeItem)}
                        </div>

                        <div>

                            <h1
                                id="pharmacology-work-editor-title"
                                class="pharmacology-work-editor-title"
                            >
                                ${escapeWorkHTML(
                                    safeItem.title || "Untitled"
                                )}
                            </h1>

                            <div class="pharmacology-work-editor-meta">
                                ${getWorkTypeLabel(safeItem)}
                                ${safeItem.updatedAt
                                    ? ` · Updated ${formatWorkDate(
                                        safeItem.updatedAt
                                    )}`
                                    : ""}
                            </div>

                        </div>

                    </div>

                </div>


                <!-- =================================================
                     TOOLBAR
                     ================================================= -->

                <div class="pharmacology-work-editor-toolbar">

                    <button
                        id="pharmacology-work-back"
                        type="button"
                        class="pharmacology-btn"
                    >
                        ← Back
                    </button>

                    <button
                        id="pharmacology-work-rename"
                        type="button"
                        class="pharmacology-btn"
                    >
                        Rename
                    </button>

                    <button
                        id="pharmacology-work-delete"
                        type="button"
                        class="pharmacology-btn"
                    >
                        Delete
                    </button>

                    <button
                        id="pharmacology-work-edit"
                        type="button"
                        class="pharmacology-btn primary"
                    >
                        Edit
                    </button>

                </div>

            </div>


            <!-- =====================================================
                 DOCUMENT BODY
                 ===================================================== -->

            <div
                class="pharmacology-work-editor-body"
                id="pharmacology-work-editor-body"
            >

                <article
                    id="pharmacology-work-editor-content"
                    class="pharmacology-work-document"
                >
                    ${formatWorkContent(
                        safeItem.content || ""
                    )}
                </article>

            </div>

        </div>
    `;


    /* =============================================================
       BACK
       ============================================================= */

    const backButton = document.getElementById(
        "pharmacology-work-back"
    );

    if (backButton) {

        backButton.onclick = function (event) {

            event.preventDefault();
            event.stopPropagation();

            currentWorkItemId = null;

            renderWork();
        };
    }


    /* =============================================================
       RENAME
       ============================================================= */

    const renameButton = document.getElementById(
        "pharmacology-work-rename"
    );

    if (renameButton) {

        renameButton.onclick = function (event) {

            event.preventDefault();
            event.stopPropagation();

            const currentItem =
                getWorkItem(currentWorkItemId);

            if (!currentItem) {
                return;
            }

            const titleElement =
                document.getElementById(
                    "pharmacology-work-editor-title"
                );

            if (!titleElement) {
                return;
            }


            /* ---------------------------------------------
               Create inline title input
               --------------------------------------------- */

            const input =
                document.createElement("input");

            input.type = "text";

            input.id =
                "pharmacology-work-inline-title";

            input.className =
                "pharmacology-work-inline-title-input";

            input.value =
                String(
                    currentItem.title ||
                    "Untitled"
                );

            input.maxLength = 200;

            input.autocomplete = "off";

            input.spellcheck = false;


            titleElement.replaceWith(input);

            input.focus();

            input.select();


            let finished = false;


            /* ---------------------------------------------
               Save title
               --------------------------------------------- */

            function saveInlineTitle() {

                if (finished) {
                    return;
                }

                const newTitle =
                    input.value.trim();


                if (!newTitle) {

                    input.focus();

                    return;
                }


                if (
                    !Array.isArray(
                        pharmacologyState.work
                    )
                ) {
                    return;
                }


                const index =
                    pharmacologyState.work.findIndex(
                        workItem =>
                            workItem &&
                            String(workItem.id) ===
                                String(
                                    currentWorkItemId
                                )
                    );


                if (index === -1) {

                    console.error(
                        "[PHARMACOLOGY WORK] Rename target not found:",
                        currentWorkItemId
                    );

                    return;
                }


                pharmacologyState.work[index].title =
                    newTitle;

                pharmacologyState.work[index].updatedAt =
                    new Date().toISOString();


                saveState();

                finished = true;


                renderWorkEditor();
            }


            /* ---------------------------------------------
               Cancel title editing
               --------------------------------------------- */

            function cancelInlineTitle() {

                if (finished) {
                    return;
                }

                finished = true;

                renderWorkEditor();
            }


            /* ---------------------------------------------
               Keyboard controls
               --------------------------------------------- */

            input.addEventListener(
                "keydown",
                function (event) {

                    if (event.key === "Enter") {

                        event.preventDefault();

                        saveInlineTitle();

                        return;
                    }


                    if (event.key === "Escape") {

                        event.preventDefault();

                        cancelInlineTitle();

                        return;
                    }
                }
            );


            /* ---------------------------------------------
               Save when leaving input
               --------------------------------------------- */

            input.addEventListener(
                "blur",
                function () {

                    if (!finished) {
                        saveInlineTitle();
                    }

                }
            );
        };
    }


    /* =============================================================
       DELETE
       ============================================================= */

    const deleteButton = document.getElementById(
        "pharmacology-work-delete"
    );

    if (deleteButton) {

        deleteButton.onclick = function (event) {

            event.preventDefault();
            event.stopPropagation();


            const id =
                currentWorkItemId;


            if (
                !id ||
                !Array.isArray(
                    pharmacologyState.work
                )
            ) {
                return;
            }


            const index =
                pharmacologyState.work.findIndex(
                    workItem =>
                        workItem &&
                        String(workItem.id) ===
                            String(id)
                );


            if (index === -1) {

                console.error(
                    "[PHARMACOLOGY WORK] Delete target not found:",
                    id
                );

                return;
            }


            const itemToDelete =
                pharmacologyState.work[index];


            /* ---------------------------------------------
               Confirmation
               --------------------------------------------- */

            const confirmed =
                window.confirm(
                    `Delete "${itemToDelete.title || "Untitled"}"?\n\nThis cannot be undone.`
                );


            if (!confirmed) {
                return;
            }


            /* ---------------------------------------------
               Remove item
               --------------------------------------------- */

            pharmacologyState.work.splice(
                index,
                1
            );


            /* ---------------------------------------------
               Persist
               --------------------------------------------- */

            saveState();


            /* ---------------------------------------------
               Clear current document
               --------------------------------------------- */

            currentWorkItemId = null;


            /* ---------------------------------------------
               Return to My Work
               --------------------------------------------- */

            renderWork();
        };
    }


    /* =============================================================
       EDIT DOCUMENT
       ============================================================= */

    const editButton = document.getElementById(
        "pharmacology-work-edit"
    );

    if (editButton) {

        editButton.onclick = function (event) {

            event.preventDefault();
            event.stopPropagation();


            const currentItem =
                getWorkItem(currentWorkItemId);


            if (!currentItem) {
                return;
            }


            const editorBody =
                document.getElementById(
                    "pharmacology-work-editor-body"
                );


            if (!editorBody) {
                return;
            }


            editorBody.innerHTML = `

                <div class="pharmacology-work-editing">

                    <textarea
                        id="pharmacology-work-edit-textarea"
                        class="pharmacology-work-edit-textarea"
                        spellcheck="true"
                    >${escapeWorkHTML(
                        currentItem.content || ""
                    )}</textarea>


                    <div
                        class="pharmacology-work-edit-actions"
                    >

                        <button
                            id="pharmacology-work-cancel-edit"
                            type="button"
                            class="pharmacology-btn"
                        >
                            Cancel
                        </button>

                        <button
                            id="pharmacology-work-save-edit"
                            type="button"
                            class="pharmacology-btn primary"
                        >
                            Save Changes
                        </button>

                    </div>

                </div>
            `;


            const textarea =
                document.getElementById(
                    "pharmacology-work-edit-textarea"
                );


            if (textarea) {

                textarea.focus();

                textarea.setSelectionRange(
                    textarea.value.length,
                    textarea.value.length
                );
            }


            /* ---------------------------------------------
               Cancel editing
               --------------------------------------------- */

            const cancelButton =
                document.getElementById(
                    "pharmacology-work-cancel-edit"
                );


            if (cancelButton) {

                cancelButton.onclick =
                    function (event) {

                        event.preventDefault();
                        event.stopPropagation();

                        renderWorkEditor();
                    };
            }


            /* ---------------------------------------------
               Save editing
               --------------------------------------------- */

            const saveButton =
                document.getElementById(
                    "pharmacology-work-save-edit"
                );


            if (saveButton) {

                saveButton.onclick =
                    function (event) {

                        event.preventDefault();
                        event.stopPropagation();


                        const latestItem =
                            getWorkItem(
                                currentWorkItemId
                            );


                        if (!latestItem) {
                            return;
                        }


                        if (!textarea) {
                            return;
                        }


                        const newContent =
                            textarea.value;


                        if (
                            Array.isArray(
                                pharmacologyState.work
                            )
                        ) {

                            const index =
                                pharmacologyState.work.findIndex(
                                    workItem =>
                                        workItem &&
                                        String(
                                            workItem.id
                                        ) ===
                                            String(
                                                currentWorkItemId
                                            )
                                );


                            if (index !== -1) {

                                pharmacologyState
                                    .work[index]
                                    .content =
                                        newContent;

                                pharmacologyState
                                    .work[index]
                                    .updatedAt =
                                        new Date()
                                            .toISOString();


                                saveState();


                                renderWorkEditor();
                            }
                        }
                    };
            }
        };
    }
}
}


/* ============================================================
   TITLE DIALOG
   ============================================================ */

function openWorkTitleDialog(
    item,
    onSave
){

    const overlay =
        document.createElement(
            "div"
        );

    overlay.className =
        "pharmacology-work-dialog";


    overlay.innerHTML = `

        <div
            class="pharmacology-work-dialog-backdrop"
        ></div>

        <div
            class="pharmacology-work-dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pharmacology-work-dialog-title"
        >

            <div class="pharmacology-work-dialog-header">

                <div>

                    <h3
                        id="pharmacology-work-dialog-title"
                    >
                        Rename file
                    </h3>

                    <p>
                        Choose a new title for this Pharmacology file.
                    </p>

                </div>

                <button
                    type="button"
                    class="pharmacology-work-dialog-close"
                    aria-label="Close"
                >
                    ×
                </button>

            </div>


            <div class="pharmacology-work-dialog-body">

                <label>
                    File title
                </label>

                <input
                    type="text"
                    class="pharmacology-work-dialog-input"
                    value="${escapeWorkHTML(item.title)}"
                    maxlength="160"
                    autocomplete="off"
                >

            </div>


            <div class="pharmacology-work-dialog-actions">

                <button
                    type="button"
                    class="pharmacology-btn pharmacology-work-dialog-cancel"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    class="pharmacology-btn primary pharmacology-work-dialog-save"
                >
                    Save Title
                </button>

            </div>

        </div>
    `;


    document.body.appendChild(
        overlay
    );


    const input =
        overlay.querySelector(
            ".pharmacology-work-dialog-input"
        );


    const close =
        () => {

            overlay.remove();
        };


    const save =
        () => {

            const value =
                String(
                    input.value || ""
                ).trim();


            if(!value){

                input.focus();

                return;
            }


            onSave(
                value
            );

            close();
        };


    overlay
        .querySelector(
            ".pharmacology-work-dialog-close"
        )
        .addEventListener(
            "click",
            close
        );


    overlay
        .querySelector(
            ".pharmacology-work-dialog-backdrop"
        )
        .addEventListener(
            "click",
            close
        );


    overlay
        .querySelector(
            ".pharmacology-work-dialog-cancel"
        )
        .addEventListener(
            "click",
            close
        );


    overlay
        .querySelector(
            ".pharmacology-work-dialog-save"
        )
        .addEventListener(
            "click",
            save
        );


    input.addEventListener(
        "keydown",
        event => {

            if(
                event.key ===
                "Enter"
            ){

                event.preventDefault();

                save();
            }


            if(
                event.key ===
                "Escape"
            ){

                event.preventDefault();

                close();
            }
        }
    );


    requestAnimationFrame(
        () => {

            input.focus();

            input.select();
        }
    );
}


/* ============================================================
   DELETE DIALOG
   ============================================================ */

function openWorkDeleteDialog(id){

    const item =
        getWorkItem(id);

    if(!item){

        return;
    }


    const overlay =
        document.createElement(
            "div"
        );

    overlay.className =
        "pharmacology-work-dialog";


    overlay.innerHTML = `

        <div
            class="pharmacology-work-dialog-backdrop"
        ></div>

        <div
            class="pharmacology-work-dialog-card"
            role="dialog"
            aria-modal="true"
        >

            <div class="pharmacology-work-dialog-header">

                <div>

                    <h3>
                        Delete file?
                    </h3>

                    <p>
                        This will remove the saved work from My Work.
                    </p>

                </div>

                <button
                    type="button"
                    class="pharmacology-work-dialog-close"
                    aria-label="Close"
                >
                    ×
                </button>

            </div>


            <div class="pharmacology-work-dialog-body">

                <div class="pharmacology-work-delete-preview">

                    <span class="pharmacology-work-delete-icon">
                        ${getWorkIcon(item)}
                    </span>

                    <strong>
                        ${escapeWorkHTML(item.title)}
                    </strong>

                </div>

            </div>


            <div class="pharmacology-work-dialog-actions">

                <button
                    type="button"
                    class="pharmacology-btn pharmacology-work-dialog-cancel"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    class="pharmacology-btn danger pharmacology-work-dialog-confirm-delete"
                >
                    Delete
                </button>

            </div>

        </div>
    `;


    document.body.appendChild(
        overlay
    );


    const close =
        () => {

            overlay.remove();
        };


    overlay
        .querySelector(
            ".pharmacology-work-dialog-close"
        )
        .addEventListener(
            "click",
            close
        );


    overlay
        .querySelector(
            ".pharmacology-work-dialog-backdrop"
        )
        .addEventListener(
            "click",
            close
        );


    overlay
        .querySelector(
            ".pharmacology-work-dialog-cancel"
        )
        .addEventListener(
            "click",
            close
        );


    overlay
        .querySelector(
            ".pharmacology-work-dialog-confirm-delete"
        )
        .addEventListener(
            "click",
            () => {

                deleteWorkItem(
                    id
                );

                close();
            }
        );
}


/* ============================================================
   NEW NOTE
   ============================================================ */

function createNewPharmacologyNote(){

    const overlay =
        document.createElement(
            "div"
        );

    overlay.className =
        "pharmacology-work-dialog";


    overlay.innerHTML = `

        <div
            class="pharmacology-work-dialog-backdrop"
        ></div>

        <div
            class="pharmacology-work-dialog-card
                   pharmacology-work-dialog-large"
            role="dialog"
            aria-modal="true"
        >

            <div class="pharmacology-work-dialog-header">

                <div>

                    <h3>
                        New Pharmacology Note
                    </h3>

                    <p>
                        Create a personal note in My Work.
                    </p>

                </div>

                <button
                    type="button"
                    class="pharmacology-work-dialog-close"
                    aria-label="Close"
                >
                    ×
                </button>

            </div>


            <div class="pharmacology-work-dialog-body">

                <label>
                    Title
                </label>

                <input
                    type="text"
                    class="pharmacology-work-dialog-input"
                    id="pharmacology-new-note-title"
                    placeholder="Note title..."
                    maxlength="160"
                >


                <label>
                    Note
                </label>

                <textarea
                    class="pharmacology-work-dialog-textarea"
                    id="pharmacology-new-note-content"
                    rows="12"
                    placeholder="Write your Pharmacology note..."
                ></textarea>

            </div>


            <div class="pharmacology-work-dialog-actions">

                <button
                    type="button"
                    class="pharmacology-btn pharmacology-work-dialog-cancel"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    class="pharmacology-btn primary pharmacology-work-dialog-save"
                >
                    Save Note
                </button>

            </div>

        </div>
    `;


    document.body.appendChild(
        overlay
    );


    const title =
        overlay.querySelector(
            "#pharmacology-new-note-title"
        );

    const content =
        overlay.querySelector(
            "#pharmacology-new-note-content"
        );


    const close =
        () => {

            overlay.remove();
        };


    const save =
        () => {

            const noteTitle =
                String(
                    title.value || ""
                ).trim();


            const noteContent =
                String(
                    content.value || ""
                ).trim();


            if(!noteContent){

                content.focus();

                return;
            }


            saveWorkItem({

                type:
                    "note",

                title:
                    noteTitle ||
                    "Pharmacology Note",

                content:
                    noteContent

            });


            close();
        };


    overlay
        .querySelector(
            ".pharmacology-work-dialog-close"
        )
        .addEventListener(
            "click",
            close
        );


    overlay
        .querySelector(
            ".pharmacology-work-dialog-backdrop"
        )
        .addEventListener(
            "click",
            close
        );


    overlay
        .querySelector(
            ".pharmacology-work-dialog-cancel"
        )
        .addEventListener(
            "click",
            close
        );


    overlay
        .querySelector(
            ".pharmacology-work-dialog-save"
        )
        .addEventListener(
            "click",
            save
        );


    content.addEventListener(
        "keydown",
        event => {

            if(
                event.ctrlKey &&
                event.key === "Enter"
            ){

                event.preventDefault();

                save();
            }


            if(
                event.key === "Escape"
            ){

                event.preventDefault();

                close();
            }
        }
    );


    requestAnimationFrame(
        () => {

            title.focus();
        }
    );
}


/* ============================================================
   SAVE CURRENT AI ANSWER
   ============================================================ */

function saveAIWork(){

    const content =
        String(
            latestAIContent || ""
        ).trim();


    if(!content){

        const status =
            $("pharmacology-ai-status");

        if(status){

            status.textContent =
                "There is no AI answer to save yet.";
        }

        return;
    }


    const title =
        pharmacologyState.currentTopic
            ? `AI — ${pharmacologyState.currentTopic}`
            : pharmacologyState.currentDrug
                ? `AI — ${pharmacologyState.currentDrug}`
                : pharmacologyState.currentDrugClass
                    ? `AI — ${pharmacologyState.currentDrugClass}`
                    : "Pharmacology AI Answer";


    saveWorkItem({

        type:
            "ai",

        title:
            title,

        content:
            content

    });


    const status =
        $("pharmacology-ai-status");

    if(status){

        status.textContent =
            "AI answer saved to My Work.";
    }
}


/* ============================================================
   MY WORK INITIALIZATION
   ============================================================ */

function setupMyWork(){

    const newButton =
        $("pharmacology-new-note");


    if(newButton){

        newButton.addEventListener(
            "click",
            createNewPharmacologyNote
        );
    }


    renderWork();
}

/* ============================================================
   THEME
   ============================================================ */

function setTheme(){
  $("pharmacology-module").dataset.theme=pharmacologyState.theme;
  $("pharmacology-theme-button").textContent=
    pharmacologyState.theme==="dark"?"☼":"☾";
}

/* ============================================================
   PHARMACOLOGY MAIN NAVIGATION
   ============================================================ */

function showView(name) {
    const viewName = String(name || "").trim();

    if (!viewName) {
        return;
    }

    console.log(
        "[PHARMACOLOGY NAV] Switching to:",
        viewName
    );

    /* --------------------------------------------------------
       Hide every Pharmacology main view
       -------------------------------------------------------- */

    document
        .querySelectorAll(".pharmacology-view")
        .forEach(view => {
            view.classList.remove("active");
            view.hidden = true;
        });

    /* --------------------------------------------------------
       Find requested view
       -------------------------------------------------------- */

    const targetView =
        document.getElementById(
            `pharmacology-${viewName}-view`
        );

    if (!targetView) {
        console.error(
            "[PHARMACOLOGY NAV] View not found:",
            `pharmacology-${viewName}-view`
        );

        return;
    }

    /* --------------------------------------------------------
       Show requested view
       -------------------------------------------------------- */

    targetView.hidden = false;
    targetView.classList.add("active");

    /* --------------------------------------------------------
       Update active navigation button
       -------------------------------------------------------- */

    document
        .querySelectorAll(
            "#pharmacology-navigation button"
        )
        .forEach(button => {

            const buttonView =
                button.getAttribute("data-nav");

            button.classList.toggle(
                "active",
                buttonView === viewName
            );
        });

    /* --------------------------------------------------------
       Update module state
       -------------------------------------------------------- */

    pharmacologyState.currentView =
        viewName;

    saveState();

    /* --------------------------------------------------------
       Documents
       -------------------------------------------------------- */

    if (viewName === "documents") {

        console.log(
            "[PHARMACOLOGY NAV] Documents view opened."
        );

        if (
            typeof loadPharmacologyDocuments ===
            "function"
        ) {
            loadPharmacologyDocuments();
        } else {
            console.error(
                "[PHARMACOLOGY NAV] loadPharmacologyDocuments() is missing."
            );
        }
    }

    /* --------------------------------------------------------
       Scroll to top
       -------------------------------------------------------- */

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* ============================================================
   BIND MAIN NAVIGATION
   ============================================================ */

function setupPharmacologyNavigation() {

    const navigation =
        document.getElementById(
            "pharmacology-navigation"
        );

    if (!navigation) {
        console.error(
            "[PHARMACOLOGY NAV] Navigation container not found."
        );

        return;
    }

    const buttons =
        navigation.querySelectorAll(
            "button[data-nav]"
        );

    console.log(
        "[PHARMACOLOGY NAV] Buttons found:",
        buttons.length
    );

    buttons.forEach(button => {

        /* Prevent duplicate listeners if this function
           is accidentally called more than once. */

        if (
            button.dataset.pharmacologyNavBound ===
            "true"
        ) {
            return;
        }

        button.dataset.pharmacologyNavBound =
            "true";

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();
                event.stopPropagation();

                const view =
                    button.getAttribute(
                        "data-nav"
                    );

                console.log(
                    "[PHARMACOLOGY NAV] Button clicked:",
                    view
                );

                if (!view) {
                    console.error(
                        "[PHARMACOLOGY NAV] Button has no data-nav:",
                        button
                    );

                    return;
                }

                showView(view);
            }
        );
    });
}

function renderStatistics(){
  const topicCount=topics.length;
  const drugCount=drugs.length;
  const classCount=drugClasses.length;
  const attempt=pharmacologyState.questionState.attempted||0;
  const qTotal=questions.length;

  const topicPct=topicCount
    ? Math.round(
        pharmacologyState.studiedTopics.length/
        topicCount*100
      )
    : 0;

  const drugPct=drugCount
    ? Math.round(
        pharmacologyState.studiedDrugs.length/
        drugCount*100
      )
    : 0;

  const qPct=qTotal
    ? Math.round(attempt/qTotal*100)
    : 0;

  const overall=Math.round(
    (topicPct+drugPct+qPct)/3
  );

  $("pharmacology-statistics").innerHTML=[
    ["Drug Classes",classCount,"structured classes"],
    ["Drugs",drugCount,"drug records"],
    ["Topics Studied",
      pharmacologyState.studiedTopics.length,
      `${topicPct}% topic coverage`
    ],
    ["Questions",
      attempt,
      `${pharmacologyState.questionState.correct||0} correct`
    ],
    ["Overall Progress",
      `${overall}%`,
      `${pharmacologyState.questionState.correct||0}/${attempt||0} accuracy tracked`
    ]
  ].map(x=>`
    <div class="pharmacology-stat">
      <span>${x[0]}</span>
      <strong>${x[1]}</strong>
      <small>${x[2]}</small>
      ${
        x[0]==="Overall Progress"
        ? `<div class="pharmacology-progress" style="margin-top:10px">
             <i style="width:${overall}%"></i>
           </div>`
        : ""
      }
    </div>
  `).join("");
}

function renderStudyAreas(){
  $("pharmacology-study-areas").innerHTML=
    studyAreas.map((a,i)=>`
      <article
        class="pharmacology-study-area"
        data-area="${esc(a.id)}"
      >
        <div class="pharmacology-area-number">
          ${String(i+1).padStart(2,"0")}
        </div>

        <h3>${esc(a.name)}</h3>

        <p>
          ${a.topics.length} topics ·
          ${
            drugs.filter(
              d=>d.relatedTopics.includes(a.name)||
                 a.topics.includes(d.class)
            ).length
          } linked drug records
        </p>
      </article>
    `).join("");
}

function renderHighYield(){

  const items =
    Array.isArray(pharmacologyState.highYieldItems) &&
    pharmacologyState.highYieldItems.length
      ? pharmacologyState.highYieldItems
      : highYieldItems.map(item => ({
          id:
            `hy-${String(item)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g,"-")
              .replace(/^-|-$/g,"")}`,
          name: String(item),
          aiGenerated: false
        }));

  $("pharmacology-high-yield").innerHTML=
    items
      .slice(0,12)
      .map(x=>`
  <button
    class="pharmacology-chip high"
    data-topic-name="${esc(x.name)}"
  >
    ★ ${esc(x.name)}
  </button>
`)
      .join("");

  $("pharmacology-high-yield-list").innerHTML=
  items
    .map(x=>{

      const topicName =
        String(x.name || "").trim();

      const t =
        topics.find(
          z => z.name === topicName
        );

      return `
        <div
          class="pharmacology-topic"
          data-topic-name="${esc(topicName)}"
        >
          <h4>★ ${esc(topicName)}</h4>
          >
            <h4>★ ${esc(x)}</h4>
            <small>
              ${t?esc(t.areaName):"High-yield review item"}
            </small>
          </div>
        `;
      })
      .join("");
}

function itemHtml(type,id,title,meta){
  return `
    <div class="pharmacology-list-item">
      <div>
        <h4>${esc(title)}</h4>
        <p>${esc(meta)}</p>
      </div>

      <button
        class="pharmacology-btn subtle"
        data-open-type="${type}"
        data-open-id="${esc(id)}"
      >
        Open
      </button>
    </div>
  `;
}

function renderRecent(){
  const rows=[];

  pharmacologyState.recentDrugs
    .slice(0,4)
    .forEach(id=>{
      const d=drugs.find(x=>x.id===id);

      if(d){
        rows.push(
          itemHtml(
            "drug",
            d.id,
            d.genericName,
            d.class
          )
        );
      }
    });

  pharmacologyState.recentTopics
    .slice(0,4)
    .forEach(id=>{
      const t=topics.find(x=>x.id===id);

      if(t && rows.length<8){
        rows.push(
          itemHtml(
            "topic",
            t.id,
            t.name,
            t.areaName
          )
        );
      }
    });

  $("pharmacology-recent").innerHTML=
    rows.join("") ||
    `<div class="pharmacology-empty">
      No recent activity yet. Open a topic or drug to build your review history.
    </div>`;
}

function renderDifficultItems(){
  const rows=
    pharmacologyState.difficultItems
      .slice(0,8)
      .map(key=>{
        let d=drugs.find(x=>x.id===key);

        if(d){
          return itemHtml(
            "drug",
            d.id,
            d.genericName,
            `Difficult · ${d.class}`
          );
        }

        let t=topics.find(x=>x.id===key);

        if(t){
          return itemHtml(
            "topic",
            t.id,
            t.name,
            `Difficult · ${t.areaName}`
          );
        }

        let c=drugClasses.find(x=>x.id===key);

        if(c){
          return itemHtml(
            "class",
            c.id,
            c.name,
            "Difficult class"
          );
        }

        return "";
      })
      .join("");

  $("pharmacology-difficult").innerHTML=
    rows ||
    `<div class="pharmacology-empty">
      Nothing marked difficult. Mark high-friction items for focused review.
    </div>`;
}

function renderDashboard(){
  renderStatistics();
  renderStudyAreas();
  renderHighYield();
  renderRecent();
  renderDifficultItems();
}

function markRecent(kind,id){
  if(kind==="drug"){
    pharmacologyState.recentDrugs=
      uniqPush(
        pharmacologyState.recentDrugs,
        id
      );
  }

  if(kind==="topic"){
    pharmacologyState.recentTopics=
      uniqPush(
        pharmacologyState.recentTopics,
        id
      );
  }

  saveState();
}

function isBookmarked(key){
  return pharmacologyState.bookmarks.includes(key);
}

function isDifficult(key){
  return pharmacologyState.difficultItems.includes(key);
}

function updateWorkspaceActions(key){
  $("pharmacology-bookmark-button").textContent=
    isBookmarked(key)
      ?"★ Bookmarked"
      :"☆ Bookmark";

  $("pharmacology-difficult-button").textContent=
    isDifficult(key)
      ?"✓ Difficult"
      :"Mark difficult";

  let studied=
    key.startsWith("drug:")
      ?pharmacologyState.studiedDrugs.includes(
        key.slice(5)
      )
      :key.startsWith("topic:")
      ?pharmacologyState.studiedTopics.includes(
        key.slice(6)
      )
      :pharmacologyState.studiedClasses.includes(
        key.slice(6)
      );

  $("pharmacology-studied-button").textContent=
    studied
      ?"✓ Studied"
      :"Mark studied";
}

function openStudyArea(id){
  const a=studyAreas.find(x=>x.id===id);

  if(!a) return;

  pharmacologyState.currentArea=id;
  pharmacologyState.currentTopic=null;

  showView("workspace");

  $("pharmacology-workspace-content").innerHTML=`
    <div class="pharmacology-workspace-top">
      <div>
        <h2>${esc(a.name)}</h2>

        <div class="pharmacology-meta">
          <span>${a.topics.length} topics</span>
          <span>Study area</span>
        </div>
      </div>
    </div>

    <div class="pharmacology-panel">
      <h3>Topics</h3>

      <div class="pharmacology-topic-grid">
        ${
          a.topics.map(t=>{
            const x=topics.find(z=>z.name===t);

            return `
              <div
                class="pharmacology-topic"
                data-topic-id="${x?.id||""}"
              >
                <h4>${esc(t)}</h4>

                <small>
                  ${
                    pharmacologyState.studiedTopics.includes(x?.id)
                      ?"✓ Studied"
                      :"Open topic"
                  }
                </small>
              </div>
            `;
          }).join("")
        }
      </div>
    </div>
  `;

  pharmacologyState.currentView="workspace";

  $("pharmacology-bookmark-button").style.display="none";
  $("pharmacology-difficult-button").style.display="none";
  $("pharmacology-studied-button").style.display="none";

  $("pharmacology-back-button").dataset.back="dashboard";
}

function openTopic(id){
  const t=topics.find(x=>x.id===id);

  if(!t) return;

  pharmacologyState.currentTopic=id;
  pharmacologyState.currentArea=t.areaId;

  markRecent("topic",id);

  showView("workspace");

  $("pharmacology-bookmark-button").style.display="";
  $("pharmacology-difficult-button").style.display="";
  $("pharmacology-studied-button").style.display="";

  $("pharmacology-back-button").dataset.back="area";

  renderTopicWorkspace(t);

  updateWorkspaceActions(`topic:${id}`);
}

function renderTopicWorkspace(t){
  const related=
    drugs
      .filter(
        d=>d.relatedTopics.includes(t.name)||
           d.class===t.name
      )
      .slice(0,8);

  $("pharmacology-workspace-content").innerHTML=`
    <div class="pharmacology-workspace-top">
      <div>
        <h2>${esc(t.name)}</h2>

        <div class="pharmacology-meta">
          <span>${esc(t.areaName)}</span>
          <span>Topic</span>
          ${
            highYieldItems.includes(t.name)
              ?'<span class="high">★ High-Yield</span>'
              :""
          }
        </div>
      </div>
    </div>

    <div class="pharmacology-panel">
      <h3>Study focus</h3>

      <p>
        Review the core pharmacological principles,
        clinical applications, adverse effects,
        contraindications and interactions associated with
        <b>${esc(t.name)}</b>.
      </p>

      <div class="pharmacology-callout">
        <b>Exam lens:</b>
        Link mechanism to pharmacological effect,
        then to clinical use and the characteristic
        adverse-effect/contraindication pattern.
      </div>

      <h3>Linked drug records</h3>

      ${
        related.length
          ?`
            <div class="pharmacology-drug-grid">
              ${related.map(d=>drugCard(d)).join("")}
            </div>
          `
          :`
            <div class="pharmacology-empty">
              No dedicated drug records are linked to this topic yet.
            </div>
          `
      }
    </div>
  `;
}

function drugCard(d){
  return `
    <article
      class="pharmacology-drug-card"
      data-drug-id="${esc(d.id)}"
    >
      <div class="pharmacology-meta">
        <span>${esc(d.class)}</span>
        ${d.highYield?'<span class="high">★</span>':""}
      </div>

      <h4>${esc(d.genericName)}</h4>
      <p>${esc(d.subclass)}</p>
      <small>${esc(d.mechanism)}</small>
    </article>
  `;
}

function openDrugClass(id){
  const c=drugClasses.find(x=>x.id===id);

  if(!c) return;

  pharmacologyState.currentDrugClass=id;

  showView("workspace");

  $("pharmacology-bookmark-button").style.display="";
  $("pharmacology-difficult-button").style.display="";
  $("pharmacology-studied-button").style.display="";

  $("pharmacology-back-button").dataset.back="dashboard";

  renderDrugClassWorkspace(c);

  updateWorkspaceActions(`class:${id}`);
}

function renderDrugClassWorkspace(c){
  const ds=drugs.filter(d=>d.class===c.name);

  $("pharmacology-workspace-content").innerHTML=`
    <div class="pharmacology-workspace-top">
      <div>
        <h2>${esc(c.name)}</h2>

        <div class="pharmacology-meta">
          <span>Drug class</span>
          <span>${ds.length} representative records</span>
        </div>
      </div>
    </div>

    <div class="pharmacology-panel">
      <h3>Mechanism</h3>
      <p>${esc(c.mechanism)}</p>

      <div class="pharmacology-two-col">
        <div>
          <h4>Major effects</h4>
          ${bullets(c.effects)}

          <h4>Clinical uses</h4>
          ${bullets(c.uses)}

          <h4>Major adverse effects</h4>
          ${bullets(c.adverse)}
        </div>

        <div>
          <h4>Contraindications / cautions</h4>
          ${bullets(c.contra)}

          <h4>Important interactions</h4>
          ${bullets(c.interactions)}
        </div>
      </div>

      <h3>Representative drugs</h3>

      <div class="pharmacology-drug-grid">
        ${
          ds.length
            ?ds.map(drugCard).join("")
            :`
              <div class="pharmacology-empty">
                No representative drug records yet.
              </div>
            `
        }
      </div>
    </div>
  `;
}

function bullets(a){
  return `
    <ul class="pharmacology-bullets">
      ${(a||[]).map(x=>`<li>${esc(x)}</li>`).join("")}
    </ul>
  `;
}

const drugSections=[
  "overview",
  "mechanism",
  "effects",
  "uses",
  "adverse",
  "contra",
  "interactions",
  "pharmacokinetics",
  "monitoring",
  "clinical",
  "questions"
];

function openDrug(id,section="overview"){
  const d=drugs.find(x=>x.id===id);

  if(!d) return;

  pharmacologyState.currentDrug=id;

  markRecent("drug",id);

  showView("workspace");

  $("pharmacology-back-button").dataset.back="previous";

  $("pharmacology-bookmark-button").style.display="";
  $("pharmacology-difficult-button").style.display="";
  $("pharmacology-studied-button").style.display="";

  renderDrugWorkspace(d,section);

  updateWorkspaceActions(`drug:${id}`);
}

function renderDrugWorkspace(d,section){
  pharmacologyState.currentSection=section;

  const labels={
    overview:"OVERVIEW",
    mechanism:"MECHANISM",
    effects:"PHARMACOLOGICAL EFFECTS",
    uses:"USES",
    adverse:"ADVERSE EFFECTS",
    contra:"CONTRAINDICATIONS",
    interactions:"INTERACTIONS",
    pharmacokinetics:"PHARMACOKINETICS",
    monitoring:"MONITORING",
    clinical:"CLINICAL PEARLS",
    questions:"QUESTIONS"
  };

  const content={
    overview:`
      <h3>Clinical overview</h3>

      <p>${esc(d.mechanism)}</p>

      <div class="pharmacology-two-col">
        <div>
          <h4>Uses</h4>
          ${bullets(d.indications)}

          <h4>Key adverse effects</h4>
          ${bullets(d.adverseEffects)}
        </div>

        <div>
          <h4>Contraindications</h4>
          ${bullets(d.contraindications)}

          <h4>Monitoring</h4>
          ${bullets(d.monitoring)}
        </div>
      </div>
    `,

    mechanism:`
      <h3>Mechanism</h3>

      <p>${esc(d.mechanism)}</p>

      <div class="pharmacology-callout">
        <b>Mechanism → effect:</b>
        The therapeutic and adverse-effect profile should be
        understood as consequences of the drug's target
        and downstream physiology.
      </div>
    `,

    effects:`
      <h3>Pharmacological effects</h3>
      ${bullets(d.pharmacologicalEffects)}
    `,

    uses:`
      <h3>Clinical uses</h3>
      ${bullets(d.indications)}
    `,

    adverse:`
      <h3>Adverse effects</h3>
      ${bullets(d.adverseEffects)}
    `,

    contra:`
      <h3>Contraindications</h3>
      ${bullets(d.contraindications)}
    `,

    interactions:`
      <h3>Interactions</h3>
      ${bullets(d.interactions)}
    `,

    pharmacokinetics:`
      <h3>Pharmacokinetics</h3>

      <div class="pharmacology-two-col">
        <div>
          <h4>Absorption</h4>
          <p>${esc(d.pharmacokinetics.absorption)}</p>

          <h4>Distribution</h4>
          <p>${esc(d.pharmacokinetics.distribution)}</p>
        </div>

        <div>
          <h4>Metabolism</h4>
          <p>${esc(d.pharmacokinetics.metabolism)}</p>

          <h4>Excretion</h4>
          <p>${esc(d.pharmacokinetics.excretion)}</p>
        </div>
      </div>
    `,

    monitoring:`
      <h3>Monitoring</h3>
      ${bullets(d.monitoring)}
    `,

    clinical:`
      <h3>Clinical pearls</h3>
      ${bullets(d.importantClinicalPoints)}

      <div class="pharmacology-callout warn">
        <b>High-yield:</b>
        ${
          d.highYield
            ?"This drug is flagged for priority revision."
            :"Use the mechanism and class profile to build your own high-yield associations."
        }
      </div>
    `,

    questions:`
      <h3>Questions linked to ${esc(d.genericName)}</h3>

      ${
        questions.filter(q=>q.drug===d.id).length
          ?questions
            .filter(q=>q.drug===d.id)
            .map(q=>`
              <div class="pharmacology-list-item">
                <div>
                  <h4>${esc(q.question)}</h4>
                  <p>${esc(q.topic)} · ${esc(q.difficulty)}</p>
                </div>

                <button
                  class="pharmacology-btn"
                  data-question-id="${q.id}"
                >
                  Practice
                </button>
              </div>
            `).join("")
          :`
            <div class="pharmacology-empty">
              No dedicated questions for this drug yet.
              Use the full question bank for related-class practice.
            </div>
          `
      }
    `
  };

  $("pharmacology-workspace-content").innerHTML=`
    <div class="pharmacology-workspace-top">
      <div>
        <h2>${esc(d.genericName)}</h2>

        <div class="pharmacology-meta">
          <span>${esc(d.class)}</span>
          <span>${esc(d.subclass)}</span>

          ${
            d.highYield
              ?'<span class="high">★ HIGH-YIELD</span>'
              :""
          }
        </div>
      </div>
    </div>

    <div class="pharmacology-workspace-nav">
      ${
        drugSections.map(x=>`
          <button
            class="${x===section?"active":""}"
            data-drug-section="${x}"
          >
            ${labels[x]}
          </button>
        `).join("")
      }
    </div>

    <div class="pharmacology-panel">
      ${content[section]}
    </div>
  `;
}





function toggleBookmark(){
  const key=
    pharmacologyState.currentDrug
      ?`drug:${pharmacologyState.currentDrug}`
      :pharmacologyState.currentTopic
      ?`topic:${pharmacologyState.currentTopic}`
      :pharmacologyState.currentDrugClass
      ?`class:${pharmacologyState.currentDrugClass}`
      :null;

  if(!key) return;

  pharmacologyState.bookmarks=
    pharmacologyState.bookmarks.includes(key)
      ?pharmacologyState.bookmarks.filter(x=>x!==key)
      :uniqPush(
        pharmacologyState.bookmarks,
        key,
        100
      );

  saveState();

  updateWorkspaceActions(key);
  renderDashboard();
}

function toggleDifficult(){
  const key=
    pharmacologyState.currentDrug
      ?`drug:${pharmacologyState.currentDrug}`
      :pharmacologyState.currentTopic
      ?`topic:${pharmacologyState.currentTopic}`
      :pharmacologyState.currentDrugClass
      ?`class:${pharmacologyState.currentDrugClass}`
      :null;

  if(!key) return;

  pharmacologyState.difficultItems=
    pharmacologyState.difficultItems.includes(key)
      ?pharmacologyState.difficultItems.filter(x=>x!==key)
      :uniqPush(
        pharmacologyState.difficultItems,
        key,
        100
      );

  saveState();

  updateWorkspaceActions(key);
  renderDashboard();
}

function markStudied(){
  let key,arr;

  if(pharmacologyState.currentDrug){
    key=pharmacologyState.currentDrug;
    arr=pharmacologyState.studiedDrugs;
  }else if(pharmacologyState.currentTopic){
    key=pharmacologyState.currentTopic;
    arr=pharmacologyState.studiedTopics;
  }else if(pharmacologyState.currentDrugClass){
    key=pharmacologyState.currentDrugClass;
    arr=pharmacologyState.studiedClasses;
  }else{
    return;
  }

  if(arr.includes(key)){
    arr.splice(arr.indexOf(key),1);
  }else{
    arr.push(key);
  }

  saveState();

  updateWorkspaceActions(
    `${
      pharmacologyState.currentDrug
        ?"drug"
        :pharmacologyState.currentTopic
        ?"topic"
        :"class"
    }:${key}`
  );

  renderDashboard();
}

function handlePharmacologySearch(e){
  const q=e.target.value.trim().toLowerCase();
  const box=$("pharmacology-search-results");

  if(!q){
    box.classList.remove("open");
    box.innerHTML="";
    return;
  }

  const results=[];

  drugClasses
    .filter(
      c=>
        c.name.toLowerCase().includes(q)||
        c.mechanism.toLowerCase().includes(q)
    )
    .slice(0,5)
    .forEach(c=>{
      results.push({
        type:"class",
        id:c.id,
        title:c.name,
        meta:"Drug class"
      });
    });

  drugs
    .filter(d=>
      [
        d.genericName,
        d.class,
        d.subclass,
        d.mechanism,
        ...d.indications,
        ...d.adverseEffects,
        ...d.contraindications,
        ...d.interactions
      ]
      .join(" ")
      .toLowerCase()
      .includes(q)
    )
    .slice(0,10)
    .forEach(d=>{
      results.push({
        type:"drug",
        id:d.id,
        title:d.genericName,
        meta:`${d.class} · ${d.subclass}`
      });
    });

  topics
    .filter(t=>
      [t.name,t.areaName]
        .join(" ")
        .toLowerCase()
        .includes(q)
    )
    .slice(0,8)
    .forEach(t=>{
      results.push({
        type:"topic",
        id:t.id,
        title:t.name,
        meta:t.areaName
      });
    });

  box.innerHTML=
    results.length
      ?results.map(r=>`
        <div
          class="pharmacology-search-result"
          data-search-type="${r.type}"
          data-search-id="${esc(r.id)}"
        >
          <strong>${esc(r.title)}</strong>
          <span>${esc(r.meta)}</span>
        </div>
      `).join("")
      :`
        <div
          class="pharmacology-empty"
          style="border:0"
        >
          No matching pharmacology records.
          <br>
          <small>
            Try a drug name, class, mechanism,
            adverse effect or topic.
          </small>
        </div>
      `;

  box.classList.add("open");
}

function renderQuestions(){
  const s=pharmacologyState.questionState;
  const q=questions[s.index%questions.length];

  $("pharmacology-question-area").innerHTML=`
    <div class="pharmacology-question-card">
      <div class="pharmacology-question-top">
        <span>
          Question ${(s.index%questions.length)+1}
          / ${questions.length}
        </span>

        <span>
          Attempted ${s.attempted} ·
          Accuracy ${
            s.attempted
              ?Math.round(s.correct/s.attempted*100)
              :0
          }%
        </span>
      </div>

      <h3>${esc(q.question)}</h3>

      <div class="pharmacology-options">
        ${
          q.options.map((o,i)=>`
            <button
              class="
                pharmacology-option
                ${s.selected===i?"selected":""}
                ${
                  s.checked&&i===q.correctAnswer
                    ?"correct"
                    :""
                }
                ${
                  s.checked&&
                  s.selected===i&&
                  i!==q.correctAnswer
                    ?"incorrect"
                    :""
                }
              "
              data-answer-index="${i}"
            >
              ${String.fromCharCode(65+i)}.
              ${esc(o)}
            </button>
          `).join("")
        }
      </div>

      ${
        s.checked
          ?`
            <div class="pharmacology-explanation">
              <b>
                ${
                  s.selected===q.correctAnswer
                    ?"Correct"
                    :"Review this one"
                }
              </b>
              <br>
              ${esc(q.explanation)}
            </div>
          `
          :""
      }

      <div
        class="pharmacology-head-actions"
        style="margin-top:18px"
      >
        <button
          id="pharmacology-submit-question"
          class="pharmacology-btn primary"
        >
          ${s.checked?"Next question":"Check answer"}
        </button>

        <button
          id="pharmacology-question-difficult"
          class="pharmacology-btn"
        >
          Mark difficult
        </button>
      </div>

      <div
        class="pharmacology-meta"
        style="margin-top:16px"
      >
        <span>${esc(q.topic)}</span>
        <span>${esc(q.difficulty)}</span>

        ${
          q.highYield
            ?'<span class="high">★ High-Yield</span>'
            :""
        }
      </div>
    </div>
  `;
}

function chooseAnswer(i){
  if(pharmacologyState.questionState.checked) return;

  pharmacologyState.questionState.selected=i;

  renderQuestions();
}

function submitQuestion(){
  const s=pharmacologyState.questionState;
  const q=questions[s.index%questions.length];

  if(!s.checked){
    if(s.selected===null) return;

    s.checked=true;
    s.attempted++;

    if(s.selected===q.correctAnswer){
      s.correct++;
    }else{
      s.incorrect++;

      if(
        !pharmacologyState.difficultItems
          .includes(`question:${q.id}`)
      ){
        pharmacologyState.difficultItems.unshift(
          `question:${q.id}`
        );
      }
    }

    saveState();
    renderQuestions();
  }else{
    s.index=(s.index+1)%questions.length;
    s.selected=null;
    s.checked=false;

    saveState();
    renderQuestions();
  }

  renderDashboard();
}

function resetQuestions(){
  pharmacologyState.questionState={
    index:0,
    selected:null,
    checked:false,
    attempted:0,
    correct:0,
    incorrect:0
  };

  saveState();
  renderQuestions();
  renderDashboard();
}

function renderFlashcards(){
  const s=pharmacologyState.flashcardState;
  const c=flashcards[s.index%flashcards.length];

  $("pharmacology-flashcard").innerHTML=`
    <div
      class="pharmacology-flashcard"
      id="pharmacology-flashcard-card"
    >
      <div>
        ${
          s.revealed
            ?`<p>${esc(c.back)}</p>`
            :`
              <strong>${esc(c.front)}</strong>
              <p>Tap to reveal</p>
            `
        }

        <div class="pharmacology-meta">
          <span>${esc(c.topic)}</span>
          <span>${esc(c.difficulty)}</span>
        </div>
      </div>
    </div>

    <div class="pharmacology-flash-controls">
      <button
        class="pharmacology-btn"
        id="pharmacology-flash-prev"
      >
        ← Previous
      </button>

      <button
        class="pharmacology-btn"
        id="pharmacology-flash-known"
      >
        ✓ Known
      </button>

      <button
        class="pharmacology-btn"
        id="pharmacology-flash-difficult"
      >
        ⚑ Difficult
      </button>

      <button
        class="pharmacology-btn primary"
        id="pharmacology-flash-next"
      >
        Next →
      </button>
    </div>
  `;
}

function renderCalculators(){
  $("pharmacology-calculator").innerHTML=`
    <div class="pharmacology-calc">
      <h3>Loading Dose</h3>

      <p>
        LD = Target concentration × Vd ÷ Bioavailability
      </p>

      <div class="pharmacology-field">
        <label>Target concentration</label>
        <input
          id="pharmacology-ld-target"
          type="number"
          step="any"
        >
      </div>

      <div class="pharmacology-field">
        <label>Volume of distribution</label>
        <input
          id="pharmacology-ld-vd"
          type="number"
          step="any"
        >
      </div>

      <div class="pharmacology-field">
        <label>Bioavailability (F, decimal)</label>
        <input
          id="pharmacology-ld-f"
          type="number"
          step="any"
          min="0.0001"
          max="1"
          value="1"
        >
      </div>

      <button
        class="pharmacology-btn primary"
        data-calc="loading"
      >
        Calculate
      </button>

      <div
        id="pharmacology-ld-result"
        class="pharmacology-result"
      >
        Enter compatible units.
      </div>
    </div>

    <div class="pharmacology-calc">
      <h3>Maintenance Dose Rate</h3>

      <p>
        MD rate = Target concentration × Clearance ÷ Bioavailability
      </p>

      <div class="pharmacology-field">
        <label>Target concentration</label>
        <input
          id="pharmacology-md-target"
          type="number"
          step="any"
        >
      </div>

      <div class="pharmacology-field">
        <label>Clearance</label>
        <input
          id="pharmacology-md-cl"
          type="number"
          step="any"
        >
      </div>

      <div class="pharmacology-field">
        <label>Bioavailability (F, decimal)</label>
        <input
          id="pharmacology-md-f"
          type="number"
          step="any"
          min="0.0001"
          max="1"
          value="1"
        >
      </div>

      <button
        class="pharmacology-btn primary"
        data-calc="maintenance"
      >
        Calculate
      </button>

      <div
        id="pharmacology-md-result"
        class="pharmacology-result"
      >
        Enter compatible units.
      </div>
    </div>

    <div class="pharmacology-calc">
      <h3>Half-Life</h3>

      <p>
        For first-order elimination:
        t½ = 0.693 × Vd ÷ Clearance
      </p>

      <div class="pharmacology-field">
        <label>Volume of distribution</label>
        <input
          id="pharmacology-hl-vd"
          type="number"
          step="any"
        >
      </div>

      <div class="pharmacology-field">
        <label>Clearance</label>
        <input
          id="pharmacology-hl-cl"
          type="number"
          step="any"
        >
      </div>

      <button
        class="pharmacology-btn primary"
        data-calc="half"
      >
        Calculate
      </button>

      <div
        id="pharmacology-hl-result"
        class="pharmacology-result"
      >
        Enter compatible units.
      </div>
    </div>

    <div class="pharmacology-calc">
      <h3>Infusion Rate</h3>

      <p>
        Rate = Dose required ÷ Infusion time
      </p>

      <div class="pharmacology-field">
        <label>Total dose</label>
        <input
          id="pharmacology-ir-dose"
          type="number"
          step="any"
        >
      </div>

      <div class="pharmacology-field">
        <label>Infusion time</label>
        <input
          id="pharmacology-ir-time"
          type="number"
          step="any"
        >
      </div>

      <button
        class="pharmacology-btn primary"
        data-calc="infusion"
      >
        Calculate
      </button>

      <div
        id="pharmacology-ir-result"
        class="pharmacology-result"
      >
        Enter compatible units.
      </div>
    </div>
  `;
}

function num(id){
  const v=Number($(id)?.value);

  return Number.isFinite(v)&&v>0
    ?v
    :null;
}

function calc(kind){
  let r=null;

  const err=
    "Enter valid positive values and keep units compatible.";

  if(kind==="loading"){
    const a=num("pharmacology-ld-target");
    const b=num("pharmacology-ld-vd");
    const f=num("pharmacology-ld-f");

    if(a&&b&&f&&f<=1){
      r=a*b/f;
    }

    setCalc(
      "pharmacology-ld-result",
      r,
      "calculated dose"
    );
  }

  if(kind==="maintenance"){
    const a=num("pharmacology-md-target");
    const b=num("pharmacology-md-cl");
    const f=num("pharmacology-md-f");

    if(a&&b&&f&&f<=1){
      r=a*b/f;
    }

    setCalc(
      "pharmacology-md-result",
      r,
      "maintenance dose rate"
    );
  }

  if(kind==="half"){
    const a=num("pharmacology-hl-vd");
    const b=num("pharmacology-hl-cl");

    if(a&&b){
      r=.693*a/b;
    }

    setCalc(
      "pharmacology-hl-result",
      r,
      "half-life"
    );
  }

  if(kind==="infusion"){
    const a=num("pharmacology-ir-dose");
    const b=num("pharmacology-ir-time");

    if(a&&b){
      r=a/b;
    }

    setCalc(
      "pharmacology-ir-result",
      r,
      "infusion rate"
    );
  }
}

function setCalc(id,value,label){
  const el=$(id);

  if(value===null){
    el.textContent=err;
    el.classList.add("error");
  }else{
    el.textContent=
      `${label}: ${Number(value.toPrecision(6))}
       (derived from the units you entered)`;

    el.classList.remove("error");
  }
}

function renderPrescription(){
  const fields=[
    ["patient","Patient identifier placeholder"],
    ["drug","Drug"],
    ["strength","Strength"],
    ["dose","Dose"],
    ["route","Route"],
    ["frequency","Frequency"],
    ["duration","Duration"],
    ["quantity","Quantity"],
    ["instructions","Instructions"]
  ];

  $("pharmacology-prescription").innerHTML=`
    <div class="pharmacology-calc">
      ${
        fields.map(([id,l])=>`
          <div class="pharmacology-field">
            <label>${l}</label>

            ${
              id==="instructions"
                ?`
                  <textarea
                    id="pharmacology-rx-${id}"
                    rows="3"
                  ></textarea>
                `
                :`
                  <input
                    id="pharmacology-rx-${id}"
                    type="text"
                  >
                `
            }
          </div>
        `).join("")
      }
    </div>

    <div
      class="pharmacology-prescription-preview"
      id="pharmacology-prescription-preview"
    >
      <h3>Educational prescription preview</h3>

      <div id="pharmacology-rx-preview-body"></div>

      <p style="font-size:11px;color:#667">
        Educational practice only — not a valid clinical prescription.
      </p>
    </div>
  `;

  document
    .querySelectorAll(
      "#pharmacology-prescription input,#pharmacology-prescription textarea"
    )
    .forEach(x=>
      x.addEventListener(
        "input",
        updatePrescriptionPreview
      )
    );

  updatePrescriptionPreview();
}

function updatePrescriptionPreview(){
  const g=id=>
    esc($(id)?.value||"—");

  $("pharmacology-rx-preview-body").innerHTML=`
    <div class="pharmacology-rx-line">
      <b>Patient:</b>
      ${g("pharmacology-rx-patient")}
    </div>

    <div class="pharmacology-rx-line">
      <b>Drug:</b>
      ${g("pharmacology-rx-drug")}
      ${g("pharmacology-rx-strength")}
    </div>

    <div class="pharmacology-rx-line">
      <b>Dose:</b>
      ${g("pharmacology-rx-dose")}
      ·
      <b>Route:</b>
      ${g("pharmacology-rx-route")}
    </div>

    <div class="pharmacology-rx-line">
      <b>Frequency:</b>
      ${g("pharmacology-rx-frequency")}
      ·
      <b>Duration:</b>
      ${g("pharmacology-rx-duration")}
    </div>

    <div class="pharmacology-rx-line">
      <b>Quantity:</b>
      ${g("pharmacology-rx-quantity")}
    </div>

    <div class="pharmacology-rx-line">
      <b>Instructions:</b>
      ${g("pharmacology-rx-instructions")}
    </div>
  `;
}

function renderComparison(){
  const options=
    drugs.map(d=>`
      <option value="${d.id}">
        ${esc(d.genericName)}
        —
        ${esc(d.class)}
      </option>
    `).join("");

  $("pharmacology-modal").innerHTML=`
    <div class="pharmacology-modal-card">

      <div class="pharmacology-modal-head">
        <div>
          <h2>Drug comparison</h2>

          <p style="color:var(--p-muted)">
            Compare two drug records side-by-side.
          </p>
        </div>

        <button
          id="pharmacology-compare-close"
          class="pharmacology-icon-btn"
        >
          ×
        </button>
      </div>

      <div class="pharmacology-compare-grid">
        <div class="pharmacology-field">
          <label>Drug 1</label>

          <select id="pharmacology-compare-a">
            ${options}
          </select>
        </div>

        <div class="pharmacology-field">
          <label>Drug 2</label>

          <select id="pharmacology-compare-b">
            ${options}
          </select>
        </div>
      </div>

      <div
        id="pharmacology-comparison"
        style="margin-top:16px"
      ></div>
    </div>
  `;

  $("pharmacology-compare-b").selectedIndex=
    Math.min(1,drugs.length-1);

  updateComparison();

  $("pharmacology-modal").classList.add("open");
}

function updateComparison(){
  const a=drugs.find(
    d=>d.id===$("pharmacology-compare-a").value
  );

  const b=drugs.find(
    d=>d.id===$("pharmacology-compare-b").value
  );

  if(!a||!b) return;

  const rows=[
    ["Drug",a.genericName,b.genericName],
    ["Class",a.class,b.class],
    ["Mechanism",a.mechanism,b.mechanism],
    ["Main uses",
      a.indications.join("; "),
      b.indications.join("; ")
    ],
    ["Major adverse effects",
      a.adverseEffects.join("; "),
      b.adverseEffects.join("; ")
    ],
    ["Contraindications",
      a.contraindications.join("; "),
      b.contraindications.join("; ")
    ],
    ["Pharmacokinetics",
      `${a.pharmacokinetics.absorption}
       ${a.pharmacokinetics.metabolism}`,
      `${b.pharmacokinetics.absorption}
       ${b.pharmacokinetics.metabolism}`
    ],
    ["Clinical differences",
      `${a.subclass}.
       ${a.importantClinicalPoints[0]||""}`,
      `${b.subclass}.
       ${b.importantClinicalPoints[0]||""}`
    ]
  ];

  $("pharmacology-comparison").innerHTML=`
    <div class="pharmacology-compare-grid">
      ${
        rows.map(r=>`
          <div class="pharmacology-compare-cell">
            <b>${esc(r[0])}</b>

            <div>
              <strong>${esc(r[1])}</strong>
              <br>
              <span style="color:var(--p-muted)">
                ${esc(r[2])}
              </span>
            </div>
          </div>
        `).join("")
      }
    </div>
  `;
}

function renderBookmarks(){
  const out=
    pharmacologyState.bookmarks
      .map(k=>{
        const [type,id]=k.split(":");

        if(type==="drug"){
          const d=drugs.find(x=>x.id===id);

          return d
            ?itemHtml(
              "drug",
              d.id,
              d.genericName,
              `Drug · ${d.class}`
            )
            :"";
        }

        if(type==="topic"){
          const t=topics.find(x=>x.id===id);

          return t
            ?itemHtml(
              "topic",
              t.id,
              t.name,
              `Topic · ${t.areaName}`
            )
            :"";
        }

        const c=drugClasses.find(x=>x.id===id);

        return c
          ?itemHtml(
            "class",
            c.id,
            c.name,
            "Drug class"
          )
          :"";
      })
      .join("");

  $("pharmacology-bookmarks-list").innerHTML=
    out ||
    `<div class="pharmacology-empty">
      No bookmarks yet.
    </div>`;
}

function back(){
  const b=$("pharmacology-back-button").dataset.back;

  if(
    b==="area" &&
    pharmacologyState.currentArea
  ){
    return openStudyArea(
      pharmacologyState.currentArea
    );
  }

  if(
    b==="previous" &&
    pharmacologyState.currentDrugClass
  ){
    return openDrugClass(
      pharmacologyState.currentDrugClass
    );
  }

  showView("dashboard");

  $("pharmacology-bookmark-button").style.display="";
  $("pharmacology-difficult-button").style.display="";
  $("pharmacology-studied-button").style.display="";
}

function initPharmacologyModule(){
  loadPharmacologyState();

  setTheme();

  renderDashboard();
  renderQuestions();
  renderFlashcards();
  renderCalculators();
  renderPrescription();
  renderBookmarks();
  setupMyWork();
  

  $("pharmacology-search").addEventListener(
    "input",
    handlePharmacologySearch
  );

  $("pharmacology-search").addEventListener(
    "keydown",
    e=>{
      if(e.key==="Escape"){
        $("pharmacology-search").value="";
        $("pharmacology-search-results")
          .classList.remove("open");
      }
    }
  );

  $("pharmacology-theme-button").addEventListener(
    "click",
    ()=>{
      pharmacologyState.theme=
        pharmacologyState.theme==="dark"
          ?"light"
          :"dark";

      setTheme();
      saveState();
    }
  );

  $("pharmacology-back-button")
    .addEventListener("click",back);

  $("pharmacology-bookmark-button")
    .addEventListener("click",toggleBookmark);

  $("pharmacology-difficult-button")
    .addEventListener("click",toggleDifficult);

  $("pharmacology-studied-button")
    .addEventListener("click",markStudied);

  $("pharmacology-random-drug")
    .addEventListener(
      "click",
      ()=>{
        openDrug(
          drugs[
            Math.floor(
              Math.random()*drugs.length
            )
          ].id
        );
      }
    );

  $("pharmacology-random-question")
    .addEventListener(
      "click",
      ()=>{
        showView("questions");
        renderQuestions();
      }
    );

  $("pharmacology-question-reset")
    .addEventListener(
      "click",
      resetQuestions
    );

  $("pharmacology-compare-header")
    .addEventListener(
      "click",
      renderComparison
    );

  document.addEventListener(
    "click",
    e=>{
      const nav=e.target.closest("[data-nav]");

      if(nav){
        showView(nav.dataset.nav);

        if(nav.dataset.nav==="high-yield"){
          renderHighYield();
        }

        if(nav.dataset.nav==="questions"){
          renderQuestions();
        }

        if(nav.dataset.nav==="flashcards"){
          renderFlashcards();
        }

        if(nav.dataset.nav==="calculators"){
          renderCalculators();
        }

        if(nav.dataset.nav==="prescription"){
          renderPrescription();
        }

        if(nav.dataset.nav==="bookmarks"){
          renderBookmarks();
        }

        return;
      }

      if(!e.target.closest(".pharmacology-search-wrap")){
        $("pharmacology-search-results")
          .classList.remove("open");
      }

      const sr=e.target.closest(
        ".pharmacology-search-result"
      );

      if(sr){
        const t=sr.dataset.searchType;
        const id=sr.dataset.searchId;

        $("pharmacology-search").value="";
        $("pharmacology-search-results")
          .classList.remove("open");

        if(t==="drug"){
          openDrug(id);
        }else if(t==="topic"){
          openTopic(id);
        }else{
          openDrugClass(id);
        }

        return;
      }

      const area=e.target.closest("[data-area]");

      if(area){
        openStudyArea(area.dataset.area);
        return;
      }

      const topic=e.target.closest(
        "[data-topic-id]"
      );

      if(topic){
        openTopic(topic.dataset.topicId);
        return;
      }

      const topicName=e.target.closest(
        "[data-topic-name]"
      );

      if(topicName){
        const t=topics.find(
          x=>x.name===topicName.dataset.topicName
        );

        if(t){
          openTopic(t.id);
        }

        return;
      }

      const drug=e.target.closest(
        "[data-drug-id]"
      );

      if(drug){
        openDrug(drug.dataset.drugId);
        return;
      }

      const op=e.target.closest(
        "[data-open-type]"
      );

      if(op){
        if(op.dataset.openType==="drug"){
          openDrug(op.dataset.openId);
        }else if(
          op.dataset.openType==="topic"
        ){
          openTopic(op.dataset.openId);
        }else{
          openDrugClass(op.dataset.openId);
        }

        return;
      }

      const section=e.target.closest(
        "[data-drug-section]"
      );

      if(
        section &&
        pharmacologyState.currentDrug
      ){
        openDrug(
          pharmacologyState.currentDrug,
          section.dataset.drugSection
        );
      }

      const qid=e.target.closest(
        "[data-question-id]"
      );

      if(qid){
        const idx=questions.findIndex(
          q=>q.id===qid.dataset.questionId
        );

        if(idx>=0){
          pharmacologyState.questionState.index=idx;
          pharmacologyState.questionState.selected=null;
          pharmacologyState.questionState.checked=false;

          showView("questions");
          renderQuestions();
        }

        return;
      }

      const ans=e.target.closest(
        "[data-answer-index]"
      );

      if(ans){
        chooseAnswer(
          Number(ans.dataset.answerIndex)
        );

        return;
      }

      if(
        e.target.id===
        "pharmacology-submit-question"
      ){
        submitQuestion();
      }

      if(
        e.target.id===
        "pharmacology-question-difficult"
      ){
        const q=
          questions[
            pharmacologyState.questionState.index%
            questions.length
          ];

        const k=`question:${q.id}`;

        pharmacologyState.difficultItems=
          pharmacologyState.difficultItems.includes(k)
            ?pharmacologyState.difficultItems
              .filter(x=>x!==k)
            :uniqPush(
              pharmacologyState.difficultItems,
              k,
              100
            );

        saveState();
        renderDashboard();
      }

      if(
        e.target.closest(
          "#pharmacology-flashcard-card"
        )
      ){
        pharmacologyState.flashcardState.revealed=
          !pharmacologyState.flashcardState.revealed;

        renderFlashcards();
      }

      if(
        e.target.id===
        "pharmacology-flash-next"
      ){
        pharmacologyState.flashcardState.index=
          (
            pharmacologyState.flashcardState.index+1
          )%flashcards.length;

        pharmacologyState.flashcardState.revealed=false;

        renderFlashcards();
      }

      if(
        e.target.id===
        "pharmacology-flash-prev"
      ){
        pharmacologyState.flashcardState.index=
          (
            pharmacologyState.flashcardState.index-1+
            flashcards.length
          )%flashcards.length;

        pharmacologyState.flashcardState.revealed=false;

        renderFlashcards();
      }

      if(
        e.target.id===
        "pharmacology-flash-known"
      ){
        const c=
          flashcards[
            pharmacologyState.flashcardState.index%
            flashcards.length
          ];

        pharmacologyState.flashcardState.known=
          uniqPush(
            pharmacologyState.flashcardState.known,
            c.id,
            100
          );

        saveState();

        pharmacologyState.flashcardState.index=
          (
            pharmacologyState.flashcardState.index+1
          )%flashcards.length;

        pharmacologyState.flashcardState.revealed=false;

        renderFlashcards();
      }

      if(
        e.target.id===
        "pharmacology-flash-difficult"
      ){
        const c=
          flashcards[
            pharmacologyState.flashcardState.index%
            flashcards.length
          ];

        pharmacologyState.flashcardState.difficult=
          uniqPush(
            pharmacologyState.flashcardState.difficult,
            c.id,
            100
          );

        pharmacologyState.difficultItems=
          uniqPush(
            pharmacologyState.difficultItems,
            `flashcard:${c.id}`,
            100
          );

        saveState();
        renderDashboard();
      }

      const calcBtn=e.target.closest(
        "[data-calc]"
      );

      if(calcBtn){
        calc(calcBtn.dataset.calc);
      }

      if(
        e.target.id===
        "pharmacology-compare-close"
      ){
        $("pharmacology-modal")
          .classList.remove("open");
      }
    }
  );

  const modal=document.createElement("div");

  modal.id="pharmacology-modal";
  modal.className="pharmacology-modal";

  document.body.appendChild(modal);

  document.addEventListener(
    "change",
    e=>{
      if(
        e.target.id==="pharmacology-compare-a"||
        e.target.id==="pharmacology-compare-b"
      ){
        updateComparison();
      }
    }
  );

  document
    .querySelectorAll("[data-nav-action]")
    .forEach(x=>
      x.addEventListener(
        "click",
        ()=>showView(x.dataset.navAction)
      )
    );
setupPharmacologyAIUI();
}

window.initPharmacologyModule=
  initPharmacologyModule;

window.pharmacologyState=
  pharmacologyState;

window.savePharmacologyState=
  savePharmacologyState;

window.loadPharmacologyState=
  loadPharmacologyState;

if(document.readyState==="loading"){
  document.addEventListener(
    "DOMContentLoaded",
    initPharmacologyModule
  );
}else{
  initPharmacologyModule();
}

window.initPharmacologyModule =
    initPharmacologyModule;

window.pharmacologyState =
    pharmacologyState;

window.savePharmacologyState =
    savePharmacologyState;

window.loadPharmacologyState =
    loadPharmacologyState;

    /* ============================================================
   PHARMACOLOGY AI UI
   Connects the existing AI interface to this module.
   Does NOT create another AI engine.
   ============================================================ */

function setupPharmacologyAIUI() {
    const trigger = document.getElementById("pharmacology-ai-trigger");
    const panel = document.getElementById("pharmacology-ai-panel");
    const closeButton = document.getElementById("pharmacology-ai-close");
    const clearButton = document.getElementById("pharmacology-ai-clear");
    const sendButton = document.getElementById("pharmacology-ai-send");
    const input = document.getElementById("pharmacology-ai-input");
    const messages = document.getElementById("pharmacology-ai-messages");
    const empty = document.getElementById("pharmacology-ai-empty");
    const status = document.getElementById("pharmacology-ai-status");
    

    if (!trigger || !panel) {
        console.warn(
            "[PHARMACOLOGY] AI UI elements not found."
        );
        return;
    }

    function openAI() {
        panel.classList.add("active");

        updatePharmacologyAIContext();

        setTimeout(() => {
            if (input) {
                input.focus();
            }
        }, 50);

        panel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function closeAI() {
        panel.classList.remove("active");
    }

    function updatePharmacologyAIContext() {
        const moduleEl =
            document.getElementById(
                "pharmacology-ai-context-module"
            );

        const areaEl =
            document.getElementById(
                "pharmacology-ai-context-area"
            );

        const topicEl =
            document.getElementById(
                "pharmacology-ai-context-topic"
            );

        const drugEl =
            document.getElementById(
                "pharmacology-ai-context-drug"
            );

        const classEl =
            document.getElementById(
                "pharmacology-ai-context-class"
            );

        const sectionEl =
            document.getElementById(
                "pharmacology-ai-context-section"
            );

        if (moduleEl) {
            moduleEl.textContent =
                "Pharmacology";
        }

        if (areaEl) {
            areaEl.textContent =
                pharmacologyState.currentArea || "—";
        }

        if (topicEl) {
            topicEl.textContent =
                pharmacologyState.currentTopic || "—";
        }

        if (drugEl) {
            drugEl.textContent =
                pharmacologyState.currentDrug || "—";
        }

        if (classEl) {
            classEl.textContent =
                pharmacologyState.currentDrugClass || "—";
        }

        if (sectionEl) {
            sectionEl.textContent =
                pharmacologyState.currentSection ||
                "Overview";
        }
    }

    function formatPharmacologyAIResponse(text) {
    if (!text) return "";

    let source = String(text).replace(/\r\n/g, "\n");

    /*
     * ------------------------------------------------------------
     * ESCAPE HTML
     * ------------------------------------------------------------
     */
    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /*
     * ------------------------------------------------------------
     * INLINE MARKDOWN
     * ------------------------------------------------------------
     */
    function formatInline(value) {
        let s = escapeHTML(value);

        // Inline code
        s = s.replace(
            /`([^`\n]+)`/g,
            "<code>$1</code>"
        );

        // Bold
        s = s.replace(
            /\*\*(.+?)\*\*/g,
            "<strong>$1</strong>"
        );

        // Italic
        s = s.replace(
            /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
            "<em>$1</em>"
        );

        return s;
    }

    /*
     * ------------------------------------------------------------
     * MARKDOWN TABLE
     * ------------------------------------------------------------
     */
    function isTableSeparator(line) {
        const cells = line
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map(cell => cell.trim());

        if (cells.length < 2) return false;

        return cells.every(cell =>
            /^:?-{3,}:?$/.test(cell)
        );
    }

    function parseTableRow(line) {
        return line
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map(cell => cell.trim());
    }

    function renderTable(lines) {
        if (lines.length < 2) return null;

        const header = parseTableRow(lines[0]);

        // Find the separator row.
        const separatorIndex = lines.findIndex(
            (line, index) =>
                index > 0 && isTableSeparator(line)
        );

        if (separatorIndex !== 1) {
            return null;
        }

        const bodyLines = lines.slice(2);

        let html = `
<div class="pharmacology-ai-table-wrap">
<table class="pharmacology-ai-table">
<thead>
<tr>
`;

        header.forEach(cell => {
            html += `<th>${formatInline(cell)}</th>`;
        });

        html += `
</tr>
</thead>
<tbody>
`;

        bodyLines.forEach(line => {
            if (!line.trim()) return;

            const cells = parseTableRow(line);

            html += "<tr>";

            header.forEach((_, index) => {
                const cell = cells[index] ?? "";
                html += `<td>${formatInline(cell)}</td>`;
            });

            html += "</tr>";
        });

        html += `
</tbody>
</table>
</div>
`;

        return html;
    }

    /*
     * ------------------------------------------------------------
     * PROCESS BLOCKS
     * ------------------------------------------------------------
     *
     * We process the response line-by-line so tables remain intact.
     */
    const lines = source.split("\n");
    const output = [];

    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        /*
         * TABLE DETECTION
         *
         * A Markdown table must have:
         *
         * Header
         * |---|---|
         *
         * This prevents normal text containing | characters
         * from accidentally becoming a table.
         */
        if (
            i + 1 < lines.length &&
            line.includes("|") &&
            isTableSeparator(lines[i + 1])
        ) {
            const tableLines = [line, lines[i + 1]];

            i += 2;

            while (
                i < lines.length &&
                lines[i].trim() !== "" &&
                lines[i].includes("|")
            ) {
                tableLines.push(lines[i]);
                i++;
            }

            const tableHTML = renderTable(tableLines);

            if (tableHTML) {
                output.push(tableHTML);
                continue;
            }
        }

        /*
         * CODE BLOCK
         */
        if (/^\s*```/.test(line)) {
            const codeLines = [];
            i++;

            while (
                i < lines.length &&
                !/^\s*```/.test(lines[i])
            ) {
                codeLines.push(lines[i]);
                i++;
            }

            if (
                i < lines.length &&
                /^\s*```/.test(lines[i])
            ) {
                i++;
            }

            output.push(
                `<pre><code>${escapeHTML(
                    codeLines.join("\n")
                )}</code></pre>`
            );

            continue;
        }

        /*
         * EMPTY LINE
         */
        if (!line.trim()) {
            output.push("");
            i++;
            continue;
        }

        /*
         * HEADINGS
         */
        if (/^###\s+/.test(line)) {
            output.push(
                `<h4>${formatInline(
                    line.replace(/^###\s+/, "")
                )}</h4>`
            );

            i++;
            continue;
        }

        if (/^##\s+/.test(line)) {
            output.push(
                `<h3>${formatInline(
                    line.replace(/^##\s+/, "")
                )}</h3>`
            );

            i++;
            continue;
        }

        if (/^#\s+/.test(line)) {
            output.push(
                `<h2>${formatInline(
                    line.replace(/^#\s+/, "")
                )}</h2>`
            );

            i++;
            continue;
        }

        /*
         * HORIZONTAL RULE
         */
        if (/^\s*---+\s*$/.test(line)) {
            output.push("<hr>");
            i++;
            continue;
        }

        /*
         * BULLET LIST
         */
        if (/^\s*[-*+]\s+/.test(line)) {
            const items = [];

            while (
                i < lines.length &&
                /^\s*[-*+]\s+/.test(lines[i])
            ) {
                items.push(
                    `<li>${formatInline(
                        lines[i].replace(
                            /^\s*[-*+]\s+/,
                            ""
                        )
                    )}</li>`
                );

                i++;
            }

            output.push(
                `<ul>${items.join("")}</ul>`
            );

            continue;
        }

        /*
         * NUMBERED LIST
         */
        if (/^\s*\d+\.\s+/.test(line)) {
            const items = [];

            while (
                i < lines.length &&
                /^\s*\d+\.\s+/.test(lines[i])
            ) {
                items.push(
                    `<li>${formatInline(
                        lines[i].replace(
                            /^\s*\d+\.\s+/,
                            ""
                        )
                    )}</li>`
                );

                i++;
            }

            output.push(
                `<ol>${items.join("")}</ol>`
            );

            continue;
        }

        /*
         * NORMAL PARAGRAPH
         *
         * Collect consecutive normal lines into one paragraph.
         */
        const paragraphLines = [line];
        i++;

        while (
            i < lines.length &&
            lines[i].trim() !== "" &&
            !/^###\s+/.test(lines[i]) &&
            !/^##\s+/.test(lines[i]) &&
            !/^#\s+/.test(lines[i]) &&
            !/^\s*[-*+]\s+/.test(lines[i]) &&
            !/^\s*\d+\.\s+/.test(lines[i]) &&
            !/^\s*```/.test(lines[i]) &&
            !/^\s*---+\s*$/.test(lines[i]) &&
            !(
                i + 1 < lines.length &&
                lines[i].includes("|") &&
                isTableSeparator(lines[i + 1])
            )
        ) {
            paragraphLines.push(lines[i]);
            i++;
        }

        output.push(
            `<p>${paragraphLines
                .map(formatInline)
                .join("<br>")}</p>`
        );
    }

    return output
        .filter(block => block !== "")
        .join("");
}


    function addMessage(role, text) {
        if (!messages) {
            return;
        }

        if (empty) {
            empty.style.display = "none";
        }

        const wrapper =
            document.createElement("div");

        wrapper.className =
            `pharmacology-ai-message ${role}`;

        const roleLabel =
            document.createElement("div");

        roleLabel.className =
            "pharmacology-ai-message-role";

        roleLabel.textContent =
            role === "user"
                ? "YOU"
                : "PHARMACOLOGY AI";

        const content =
            document.createElement("div");

        content.className =
            "pharmacology-ai-message-content";

        content.innerHTML =
    formatPharmacologyAIResponse(text);

        wrapper.appendChild(roleLabel);
        wrapper.appendChild(content);

        messages.appendChild(wrapper);

        messages.scrollTop =
            messages.scrollHeight;

        return content;
    }

    function setStatus(text) {
        if (status) {
            status.textContent = text;
        }
    }

    async function sendMessage(message) {
    const text = String(message || "").trim();

    if (!text) {
        return;
    }

    addMessage("user", text);

    if (input) {
        input.value = "";
    }

    if (sendButton) {
        sendButton.disabled = true;
    }

    setStatus("AI is thinking...");

    const loading = addMessage(
        "assistant",
        "Thinking..."
    );

    try {
        if (
            !window.year3 ||
            !window.year3.ai ||
            typeof window.year3.ai.ask !== "function"
        ) {
            throw new Error(
                "Year 3 Study OS AI is not available."
            );
        }

        const pharmacologyContext =
            typeof getPharmacologyAIContext === "function"
                ? getPharmacologyAIContext()
                : "";

        const response =
    await window.year3.ai.ask({
        task: "assistant",
        message: text,
        sessionId:
            "Y3-003-Pharmacology",

        context: {
            moduleId:
                "Y3-003-Pharmacology",

            subject:
                "Pharmacology",

            topic:
                pharmacologyState.currentTopic || "",

            drug:
                pharmacologyState.currentDrug || "",

            drugClass:
                pharmacologyState.currentDrugClass || "",

            section:
                pharmacologyState.currentSection ||
                "overview",

            content:
                `${pharmacologyContext}

IMPORTANT:
If the user's request is a modification request such as
"add", "create", "edit", or "delete" Pharmacology flashcards,
questions, or high-yield content, you MUST return the
module_action JSON command instead of explaining what you
would do.

For add_high_yield, use this structure:

{
  "type": "module_action",
  "module": "Y3-003-Pharmacology",
  "action": "add_high_yield",
  "target": "high_yield",
  "data": {
    "items": [
      {
        "name": "New High-Yield Topic"
      }
    ]
  }
}

You may provide multiple items inside "items".

Do not add a High-Yield Area if it already exists.

If the user asks an ordinary study question, answer normally.`,

            userInstruction:
                text
        },

        options: {
            temperature: 0.2,
            maxTokens: 2048
        }
    });

const answer =
    response?.text ||
    response?.content ||
    response?.message ||
    "The AI returned an empty response.";

    /* ---------------------------------------------------------
   PHARMACOLOGY AI COMMAND DETECTION
   STEP 2 — DETECT ONLY
   --------------------------------------------------------- */

/* ---------------------------------------------------------
   PHARMACOLOGY AI COMMAND EXECUTION
   STEP 3 — ADD FLASHCARD
   --------------------------------------------------------- */

const pharmacologyCommand =
    pharmacologyAICommandLayer.parse(
        response
    );

    console.log(
    "[PHARMACOLOGY AI NORMALIZED COMMAND]",
    pharmacologyCommand
);

if (pharmacologyCommand) {

    console.log(
        "[PHARMACOLOGY AI COMMAND DETECTED]",
        pharmacologyCommand
    );

    const commandResult =
        executePharmacologyAICommand(
            pharmacologyCommand
        );

    console.log(
        "[PHARMACOLOGY AI COMMAND RESULT]",
        commandResult
    );

    if (commandResult.success) {

        setStatus(
            commandResult.message
        );

        if (loading) {
            loading.textContent =
                commandResult.message;
        }

    } else {

        setStatus(
            commandResult.message ||
            "The AI command could not be executed."
        );

        if (loading) {
            loading.textContent =
                commandResult.message ||
                "The AI command could not be executed.";
        }
    }

    return;
}

latestAIContent = String(answer).trim();

        if (loading) {
    loading.innerHTML =
        formatPharmacologyAIResponse(
            latestAIContent
        );
}

        setStatus(
            "Pharmacology AI response received."
        );

    } catch (error) {
        console.error(
            "[PHARMACOLOGY AI]",
            error
        );

        if (loading) {
            loading.textContent =
                "The AI connection is not available.";
        }

        setStatus(
            error?.message ||
            "AI connection unavailable."
        );

    } finally {
        if (sendButton) {
            sendButton.disabled = false;
        }
    }
}

    trigger.addEventListener(
        "click",
        openAI
    );

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            closeAI
        );
    }

    if (clearButton) {
        clearButton.addEventListener(
            "click",
            () => {
                if (messages) {
                    messages.innerHTML = "";

                    if (empty) {
                        empty.style.display =
                            "flex";
                        messages.appendChild(empty);
                    }
                }

                setStatus(
                    "Pharmacology AI conversation cleared."
                );
            }
        );
    }

    if (sendButton) {
        sendButton.addEventListener(
            "click",
            () => {
                sendMessage(
                    input?.value
                );
            }
        );
    }
    const saveWorkButton =
    document.getElementById(
        "pharmacology-ai-save-work"
    );

if(saveWorkButton){

    saveWorkButton.addEventListener(
        "click",
        saveAIWork
    );
}

    if (input) {
        input.addEventListener(
            "keydown",
            event => {
                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {
                    event.preventDefault();

                    sendMessage(
                        input.value
                    );
                }
            }
        );
    }

    document
        .querySelectorAll(
            "[data-pharmacology-ai-action]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const action =
                        button.dataset
                            .pharmacologyAiAction;

                    const topic =
                        pharmacologyState.currentTopic ||
                        pharmacologyState.currentDrug ||
                        pharmacologyState.currentDrugClass ||
                        "the current Pharmacology topic";

                    const prompts = {
                        explain:
                            `Explain ${topic} clearly at Year 3 medical student level, focusing on mechanism, important pharmacology and clinical relevance.`,

                        summarize:
                            `Give me a high-yield examination summary of ${topic}.`,

                        mcq:
                            `Generate 5 challenging Year 3 medical MCQs on ${topic}. Give the answers and brief explanations.`,

                        flashcards:
                            `Create high-yield Pharmacology flashcards for ${topic}.`,

                        clinical:
                            `Give me the most important clinical pearls I should know about ${topic}.`,

                        note:
                            `Create a concise revision note for ${topic} that I can save in my Pharmacology notes.`
                    };

                    const prompt =
                        prompts[action];

                    if (prompt) {
                        openAI();
                        sendMessage(prompt);
                    }
                }
            );
        });

    /*
     * Keep context synchronized whenever the module
     * changes topic/drug/section.
     */
    window.addEventListener(
        "pharmacology-context-changed",
        updatePharmacologyAIContext
    );

    console.log(
        "[PHARMACOLOGY] AI UI initialized."
    );
}

function getPharmacologyAIContext() {
    const parts = [];

    if (pharmacologyState.currentArea) {
        parts.push(
            `Current study area: ${pharmacologyState.currentArea}`
        );
    }

    if (pharmacologyState.currentTopic) {
        parts.push(
            `Current topic: ${pharmacologyState.currentTopic}`
        );
    }

    if (pharmacologyState.currentDrugClass) {
        parts.push(
            `Current drug class: ${pharmacologyState.currentDrugClass}`
        );
    }

    if (pharmacologyState.currentDrug) {
        parts.push(
            `Current drug: ${pharmacologyState.currentDrug}`
        );
    }

    if (pharmacologyState.currentSection) {
        parts.push(
            `Current section: ${pharmacologyState.currentSection}`
        );
    }

    return parts.join("\n");
}


/* ============================================================
   PHARMACOLOGY DOCUMENT LIBRARY
   PDF IMPORT + DOCUMENT LIST
   ============================================================ */

const pharmacologyDocumentUI = (() => {

    "use strict";

    const API =
        window.year3 &&
        window.year3.pharmacologyDocuments;

    let documents = [];

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function formatFileSize(bytes) {

        const size = Number(bytes) || 0;

        if (size < 1024) {
            return `${size} B`;
        }

        if (size < 1024 * 1024) {
            return `${(size / 1024).toFixed(1)} KB`;
        }

        if (size < 1024 * 1024 * 1024) {
            return `${(size / (1024 * 1024)).toFixed(1)} MB`;
        }

        return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }


    function formatDate(value) {

        if (!value) {
            return "Unknown date";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Unknown date";
        }

        return date.toLocaleDateString(
            undefined,
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        );
    }


    function ensureStyles() {

        if (
            document.getElementById(
                "pharmacology-document-library-styles"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "pharmacology-document-library-styles";

        style.textContent = `

            .pharmacology-document-library {
                padding: 8px;
            }

            .pharmacology-document-empty {
                padding: 42px 20px;
                text-align: center;
                color: #6b7280;
            }

            .pharmacology-document-empty-icon {
                font-size: 30px;
                margin-bottom: 10px;
            }

            .pharmacology-document-empty-title {
                margin: 0 0 5px;
                color: #374151;
                font-size: 14px;
                font-weight: 600;
            }

            .pharmacology-document-empty-text {
                margin: 0;
                font-size: 13px;
            }

            .pharmacology-document-row {
                display: flex;
                align-items: center;
                gap: 14px;
                width: 100%;
                padding: 14px;
                border: 0;
                border-bottom: 1px solid #f0f1f3;
                background: #ffffff;
                text-align: left;
                cursor: pointer;
                transition:
                    background 0.12s ease;
            }

            .pharmacology-document-row:last-child {
                border-bottom: 0;
            }

            .pharmacology-document-row:hover {
                background: #f8fafc;
            }

            .pharmacology-document-icon {
                width: 42px;
                height: 42px;
                flex: 0 0 42px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid #fecaca;
                border-radius: 9px;
                background: #fff7f7;
                color: #b91c1c;
                font-size: 12px;
                font-weight: 800;
            }

            .pharmacology-document-main {
                min-width: 0;
                flex: 1;
            }

            .pharmacology-document-name {
                margin: 0;
                color: #111827;
                font-size: 14px;
                font-weight: 600;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .pharmacology-document-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 5px;
                color: #6b7280;
                font-size: 12px;
            }

            .pharmacology-document-arrow {
                color: #9ca3af;
                font-size: 18px;
            }

            .pharmacology-document-status {
                padding: 4px 8px;
                border-radius: 999px;
                background: #f3f4f6;
                color: #6b7280;
                font-size: 11px;
                font-weight: 600;
            }

        `;

        document.head.appendChild(style);
    }


    /*
     * Documents is a normal first-class Pharmacology
     * view. It lives inside the existing
     * #pharmacology-documents-view section, using the
     * existing #pharmacology-document-upload button and
     * #pharmacology-document-library container that are
     * already part of the Pharmacology markup.
     *
     * This module must NOT create its own panel, its own
     * header, or its own upload button, and must NOT
     * append anything to <main> or <body> directly — doing
     * so is what previously caused the Documents UI to
     * render as a persistent overlay instead of behaving
     * like every other Pharmacology view.
     */

    function bindUploadButton() {

        const button =
            document.getElementById(
                "pharmacology-document-upload"
            );

        if (
            button &&
            !button.dataset.pharmacologyDocumentsBound
        ) {

            button.addEventListener(
                "click",
                importPdf
            );

            button.dataset.pharmacologyDocumentsBound =
                "true";

        }
    }


    function render() {

        const body =
            document.getElementById(
                "pharmacology-document-library"
            );

        if (!body) {
            return;
        }

        ensureStyles();

        if (!documents.length) {

            body.innerHTML = `

                <div class="pharmacology-document-empty">

                    <div
                        class="pharmacology-document-empty-icon"
                    >
                        PDF
                    </div>

                    <p
                        class="pharmacology-document-empty-title"
                    >
                        No documents imported
                    </p>

                    <p
                        class="pharmacology-document-empty-text"
                    >
                        Import a Pharmacology PDF to add it
                        to your local document library.
                    </p>

                </div>

            `;

            return;
        }


        body.innerHTML =
            documents.map(
                documentData => {

                    const name =
                        documentData.title ||
                        documentData.originalFileName ||
                        "Untitled document";

                    const size =
                        formatFileSize(
                            documentData.fileSize
                        );

                    const date =
                        formatDate(
                            documentData.importedAt
                        );

                    const status =
                        documentData.status ||
                        "Imported";

                    return `

                        <button
                            type="button"
                            class="pharmacology-document-row"
                            data-document-id="${escapeHTML(
                                documentData.id
                            )}"
                        >

                            <div
                                class="pharmacology-document-icon"
                            >
                                PDF
                            </div>

                            <div
                                class="pharmacology-document-main"
                            >

                                <p
                                    class="pharmacology-document-name"
                                    title="${escapeHTML(name)}"
                                >
                                    ${escapeHTML(name)}
                                </p>

                                <div
                                    class="pharmacology-document-meta"
                                >

                                    <span>
                                        ${escapeHTML(size)}
                                    </span>

                                    <span>
                                        ${escapeHTML(date)}
                                    </span>

                                    <span
                                        class="pharmacology-document-status"
                                    >
                                        ${escapeHTML(status)}
                                    </span>

                                </div>

                            </div>

                            <div
                                class="pharmacology-document-arrow"
                            >
                                ›
                            </div>

                        </button>

                    `;

                }
            ).join("");


        body
            .querySelectorAll(
                ".pharmacology-document-row"
            )
            .forEach(row => {

                row.addEventListener(
                    "click",
                    () => {

                        const documentId =
                            row.dataset.documentId;

                        openDocument(
                            documentId
                        );

                    }
                );

            });

    }


    async function load() {

        if (
            !API ||
            typeof API.list !== "function"
        ) {

            console.error(
                "[PHARMACOLOGY DOCUMENTS] " +
                "Document API unavailable."
            );

            return;

        }


        try {

            const result =
                await API.list();

            if (
                result &&
                Array.isArray(
                    result.documents
                )
            ) {

                documents =
                    result.documents;

            } else {

                documents = [];

            }

            render();

            console.log(
                "[PHARMACOLOGY DOCUMENTS] " +
                "Loaded:",
                documents
            );

        } catch (error) {

            console.error(
                "[PHARMACOLOGY DOCUMENTS] " +
                "Failed to load documents:",
                error
            );

        }

    }


    async function importPdf() {

        if (
            !API ||
            typeof API.importPdf !== "function"
        ) {

            console.error(
                "[PHARMACOLOGY DOCUMENTS] " +
                "Import API unavailable."
            );

            return;

        }


        const button =
            document.getElementById(
                "pharmacology-document-upload"
            );

        if (button) {
            button.disabled = true;
            button.textContent = "Importing…";
        }


        try {

            const result =
                await API.importPdf();


            if (
                result &&
                result.canceled
            ) {

                return;
            }


            if (
                !result ||
                !result.success
            ) {

                console.error(
                    "[PHARMACOLOGY DOCUMENTS] " +
                    "Import failed:",
                    result
                );

                return;

            }


            console.log(
                "[PHARMACOLOGY DOCUMENTS] " +
                "Imported:",
                result.document
            );


            await load();


        } catch (error) {

            console.error(
                "[PHARMACOLOGY DOCUMENTS] " +
                "Import error:",
                error
            );

        } finally {

            if (button) {

                button.disabled = false;
                button.textContent = "+ Upload PDF";

            }

        }

    }


    async function openDocument(documentId) {

    if (
        !API ||
        typeof API.get !== "function"
    ) {

        console.error(
            "[PHARMACOLOGY DOCUMENTS] Get document API unavailable."
        );

        return;
    }


    try {

        const result =
            await API.get(
                documentId
            );


        if (
            !result ||
            !result.success ||
            !result.document
        ) {

            console.error(
                "[PHARMACOLOGY DOCUMENTS] Document could not be opened:",
                result
            );

            return;
        }


        const documentData =
            result.document;


        window.pharmacologySelectedDocument =
            documentData;


        console.log(
            "[PHARMACOLOGY DOCUMENTS] Opening PDF:",
            documentData
        );


        if (
            !window.pharmacologyPdfViewer ||
            typeof window.pharmacologyPdfViewer.open !==
                "function"
        ) {

            console.error(
                "[PHARMACOLOGY DOCUMENTS] PDF viewer is unavailable."
            );

            return;

        }


        await window.pharmacologyPdfViewer.open(
            documentData
        );


    } catch (error) {

        console.error(
            "[PHARMACOLOGY DOCUMENTS] Open error:",
            error
        );

    }

}


    


    function init() {

        if (!window.year3) {

            console.warn(
                "[PHARMACOLOGY DOCUMENTS] " +
                "window.year3 is unavailable."
            );

            return;

        }

        /*
         * Only wire the existing upload button.
         * Do NOT fetch/render documents here — the
         * Documents view is not necessarily visible yet.
         * Loading happens when the Documents nav item is
         * actually selected (see loadPharmacologyDocuments
         * below, called from showView()).
         */

        bindUploadButton();

        console.log(
            "[PHARMACOLOGY DOCUMENTS] " +
            "UI initialized."
        );

    }


    return Object.freeze({

        init,
        load,
        importPdf,
        openDocument,
        getDocuments: () =>
            [...documents]

    });

})();


window.pharmacologyDocumentUI =
    pharmacologyDocumentUI;


/*
 * Called by showView("documents") — the single
 * authoritative Pharmacology navigation function — every
 * time the Documents nav item is selected. This keeps
 * Documents on the same lifecycle as every other
 * Pharmacology view: showView() decides what is visible,
 * this function only refreshes the data shown inside the
 * already-visible #pharmacology-document-library.
 */
function loadPharmacologyDocuments() {

    if (!window.pharmacologyDocumentUI) {

        console.error(
            "[PHARMACOLOGY DOCUMENTS] " +
            "pharmacologyDocumentUI is unavailable."
        );

        return;

    }

    if (
        typeof window.pharmacologyDocumentUI.init ===
        "function"
    ) {
        window.pharmacologyDocumentUI.init();
    }

    if (
        typeof window.pharmacologyDocumentUI.load ===
        "function"
    ) {
        window.pharmacologyDocumentUI.load();
    }
}


/* ============================================================
   INITIALIZE PHARMACOLOGY DOCUMENT LIBRARY
   ============================================================ */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        () => pharmacologyDocumentUI.init(),
        { once: true }
    );

} else {

    pharmacologyDocumentUI.init();

}
})();