/*
 * ================================================================
 * YEAR 3 STUDY OS
 * Y3-004-Microbiology/module.js
 *
 * Renderer-only Microbiology learning module.
 *
 * IMPORTANT:
 * - Loaded by the Study OS module loader.
 * - index.html is injected into #content.
 * - Do NOT place another <html>, <head>, <body>, or CSP meta here.
 * - PDF files remain stored as Blobs in IndexedDB.
 * - PDF opening is delegated to pdfViewer.js through:
 *
 *      window.microbiologyPdfViewer
 *
 * ================================================================
 */

(() => {
    'use strict';

    /*
     * ------------------------------------------------------------
     * SINGLE INSTANCE GUARD
     * ------------------------------------------------------------
     *
     * app.js may reload module.js when navigating.
     * We deliberately keep ONE delegated document listener.
     */

    if (window.__Y3_004_MICROBIOLOGY_MODULE__) {
        console.log(
            '[MICROBIOLOGY] Existing module instance retained.'
        );
        return;
    }

    const MODULE = {
        id: 'Y3-004-Microbiology',
        version: '2.0.0'
    };

    window.__Y3_004_MICROBIOLOGY_MODULE__ = MODULE;

    /*
     * ------------------------------------------------------------
     * CONSTANTS
     * ------------------------------------------------------------
     */

    const APP = 'year3-study-os-microbiology';

    const DB_NAME = APP + '-pdfs';
    const DB_VERSION = 1;
    const STORE = 'pdfs';

    const STATE_KEY = APP + '-state-v1';

    /*
     * ------------------------------------------------------------
     * DOM HELPERS
     * ------------------------------------------------------------
     */

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    const $$ = (selector, root = document) =>
        Array.from(root.querySelectorAll(selector));

    const esc = value =>
        String(value ?? '').replace(
            /[&<>"']/g,
            char => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[char])
        );

    const uid = prefix =>
        `${prefix || 'id'}-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;

    const norm = value =>
        String(value ?? '').toLowerCase().trim();

    const today = () =>
        new Date().toISOString().slice(0, 10);

    /*
     * ------------------------------------------------------------
     * DATA
     * ------------------------------------------------------------
     */

    const organisms = [
        {
            id: 'staph-aureus',
            name: 'Staphylococcus aureus',
            group: 'Bacteriology',
            gram: 'Gram-positive',
            shape: 'Cocci',
            oxygen: 'Facultative anaerobe',
            diseases: [
                'Skin and soft-tissue infection',
                'Pneumonia',
                'Osteomyelitis',
                'Endocarditis',
                'Bacteremia'
            ],
            lab: 'Gram-positive cocci in clusters; catalase positive; coagulase positive; often beta-hemolytic; culture and susceptibility testing.',
            virulence: [
                'Protein A',
                'Coagulase',
                'Capsule/biofilm',
                'Cytolysins',
                'Superantigens'
            ],
            treatment: 'Guided by susceptibility. MSSA commonly receives an appropriate anti-staphylococcal beta-lactam; MRSA requires an MRSA-active option selected for the syndrome and susceptibility.',
            high: [
                'Think clusters',
                'Catalase positive',
                'Coagulase positive',
                'MRSA is an important resistance problem'
            ]
        },

        {
            id: 'strep-pyogenes',
            name: 'Streptococcus pyogenes',
            group: 'Bacteriology',
            gram: 'Gram-positive',
            shape: 'Cocci',
            oxygen: 'Facultative anaerobe',
            diseases: [
                'Pharyngitis',
                'Impetigo',
                'Cellulitis',
                'Necrotizing fasciitis',
                'Scarlet fever'
            ],
            lab: 'Gram-positive cocci in chains; catalase negative; beta-hemolytic; rapid antigen/PCR and culture can support diagnosis.',
            virulence: [
                'M protein',
                'Streptolysins',
                'Pyrogenic exotoxins',
                'Hyaluronic acid capsule'
            ],
            treatment: 'Penicillin-class therapy remains active against susceptible GAS; syndrome and current clinical guidance determine regimen.',
            high: [
                'Chains',
                'Beta-hemolytic',
                'M protein',
                'Can cause rheumatic fever and post-streptococcal glomerulonephritis'
            ]
        },

        {
            id: 's-pneumoniae',
            name: 'Streptococcus pneumoniae',
            group: 'Bacteriology',
            gram: 'Gram-positive',
            shape: 'Diplococci',
            oxygen: 'Facultative anaerobe',
            diseases: [
                'Pneumonia',
                'Meningitis',
                'Otitis media',
                'Sinusitis',
                'Bacteremia'
            ],
            lab: 'Lancet-shaped Gram-positive diplococci; alpha-hemolytic; optochin sensitivity and bile solubility are classic teaching tests.',
            virulence: [
                'Polysaccharide capsule',
                'Pneumolysin',
                'IgA protease'
            ],
            treatment: 'Depends on site, severity and resistance pattern; severe infection should follow current local/institutional guidance.',
            high: [
                'Lancet-shaped diplococci',
                'Alpha-hemolytic',
                'Encapsulated',
                'Major cause of meningitis and pneumonia'
            ]
        },

        {
            id: 'neisseria-meningitidis',
            name: 'Neisseria meningitidis',
            group: 'Bacteriology',
            gram: 'Gram-negative',
            shape: 'Diplococci',
            oxygen: 'Aerobic',
            diseases: [
                'Meningitis',
                'Meningococcemia'
            ],
            lab: 'Gram-negative diplococci, often intracellular in CSF; oxidase positive; culture/PCR and antigen methods may be used.',
            virulence: [
                'Polysaccharide capsule',
                'LOS endotoxin',
                'Pili',
                'IgA protease'
            ],
            treatment: 'Suspected invasive meningococcal disease requires urgent empiric therapy according to current protocols.',
            high: [
                'Gram-negative diplococci',
                'Capsule',
                'Meningitis plus septicemia',
                'Close-contact prophylaxis is important'
            ]
        },

        {
            id: 'e-coli',
            name: 'Escherichia coli',
            group: 'Bacteriology',
            gram: 'Gram-negative',
            shape: 'Rod',
            oxygen: 'Facultative anaerobe',
            diseases: [
                'UTI',
                'Sepsis',
                'Neonatal meningitis',
                'Diarrheal disease'
            ],
            lab: 'Gram-negative rod; lactose fermenter on MacConkey agar; indole commonly positive for typical E. coli; biochemical identification and susceptibility testing.',
            virulence: [
                'Fimbriae/adhesins',
                'Endotoxin',
                'Toxins',
                'Capsule in selected strains'
            ],
            treatment: 'Syndrome and susceptibility determine therapy; antimicrobial resistance is common in some lineages.',
            high: [
                'Lactose fermenter',
                'Common UTI pathogen',
                'Different pathotypes cause different diarrheal syndromes'
            ]
        },

        {
            id: 'klebsiella-pneumoniae',
            name: 'Klebsiella pneumoniae',
            group: 'Bacteriology',
            gram: 'Gram-negative',
            shape: 'Rod',
            oxygen: 'Facultative anaerobe',
            diseases: [
                'Pneumonia',
                'UTI',
                'Bacteremia',
                'Liver abscess'
            ],
            lab: 'Gram-negative rod, lactose fermenter, prominent capsule producing mucoid colonies; identification and susceptibility testing are essential.',
            virulence: [
                'Large capsule',
                'Siderophores',
                'Adhesins',
                'Hypervirulence factors in selected strains'
            ],
            treatment: 'Susceptibility-directed therapy; ESBL and carbapenemase production may substantially alter choices.',
            high: [
                'Mucoid colonies',
                'Prominent capsule',
                'ESBL/carbapenemase concern'
            ]
        },

        {
            id: 'pseudomonas-aeruginosa',
            name: 'Pseudomonas aeruginosa',
            group: 'Bacteriology',
            gram: 'Gram-negative',
            shape: 'Rod',
            oxygen: 'Aerobic',
            diseases: [
                'Hospital pneumonia',
                'Burn/wound infection',
                'Otitis externa',
                'UTI',
                'Bacteremia'
            ],
            lab: 'Oxidase-positive Gram-negative rod; non-lactose fermenter; can produce characteristic pigments; susceptibility testing is important.',
            virulence: [
                'Exotoxin A',
                'Elastases',
                'Biofilm',
                'Type III secretion'
            ],
            treatment: 'Requires an antipseudomonal option selected according to site, severity and susceptibility.',
            high: [
                'Non-lactose fermenter',
                'Oxidase positive',
                'Opportunistic pathogen',
                'Intrinsic and acquired resistance'
            ]
        },

        {
            id: 'salmonella-typhi',
            name: 'Salmonella enterica serovar Typhi',
            group: 'Bacteriology',
            gram: 'Gram-negative',
            shape: 'Rod',
            oxygen: 'Facultative anaerobe',
            diseases: [
                'Enteric fever'
            ],
            lab: 'Culture from an appropriate specimen is central; blood culture may be useful early. Identification and susceptibility testing are required.',
            virulence: [
                'Vi capsule',
                'Intracellular survival',
                'Type III secretion'
            ],
            treatment: 'Use current local antimicrobial guidance and susceptibility results because resistance patterns vary.',
            high: [
                'Human reservoir',
                'Enteric fever',
                'Fecal-oral transmission',
                'Chronic carriage can occur'
            ]
        },

        {
            id: 'vibrio-cholerae',
            name: 'Vibrio cholerae',
            group: 'Bacteriology',
            gram: 'Gram-negative',
            shape: 'Curved rod',
            oxygen: 'Facultative anaerobe',
            diseases: [
                'Cholera'
            ],
            lab: 'Curved Gram-negative rod; oxidase positive; stool culture on selective media or molecular testing can confirm.',
            virulence: [
                'Cholera toxin',
                'TCP pilus'
            ],
            treatment: 'Rapid rehydration is the cornerstone; antibiotics may shorten illness in selected severe cases according to guidance.',
            high: [
                'Profuse watery diarrhea',
                'Cholera toxin increases cAMP',
                'Unsafe water is a major transmission route'
            ]
        },

        {
            id: 'mycobacterium-tb',
            name: 'Mycobacterium tuberculosis',
            group: 'Bacteriology',
            gram: 'Acid-fast bacillus',
            shape: 'Rod',
            oxygen: 'Aerobic',
            diseases: [
                'Tuberculosis'
            ],
            lab: 'Acid-fast bacilli on appropriate staining; nucleic-acid amplification and culture are key diagnostic tools; drug susceptibility testing is essential.',
            virulence: [
                'Lipid-rich cell wall',
                'Intracellular survival',
                'Cord factor'
            ],
            treatment: 'Requires multidrug therapy using current national/international TB guidance and susceptibility information.',
            high: [
                'Acid-fast',
                'Slow-growing',
                'Granulomatous disease',
                'Airborne transmission'
            ]
        },

        {
            id: 'candida-albicans',
            name: 'Candida albicans',
            group: 'Mycology',
            gram: 'Fungus',
            shape: 'Yeast/pseudohyphae',
            oxygen: 'Facultative',
            diseases: [
                'Candidiasis',
                'Thrush',
                'Candidemia'
            ],
            lab: 'Budding yeast and pseudohyphae; germ-tube testing is a classic teaching method; culture/speciation and susceptibility may be needed.',
            virulence: [
                'Adhesion',
                'Biofilm',
                'Morphologic switching',
                'Hydrolytic enzymes'
            ],
            treatment: 'Depends on site and severity; systemic infection requires appropriate antifungal therapy and source control.',
            high: [
                'Normal flora can become pathogenic',
                'Pseudohyphae',
                'Biofilm',
                'Candidemia is clinically significant'
            ]
        },

        {
            id: 'plasmodium-falciparum',
            name: 'Plasmodium falciparum',
            group: 'Parasitology',
            gram: 'Parasite',
            shape: 'Protozoan',
            oxygen: 'Intracellular',
            diseases: [
                'Falciparum malaria'
            ],
            lab: 'Thick/thin blood films and validated antigen or molecular tests; species identification and parasite density are important.',
            virulence: [
                'Erythrocyte cytoadherence',
                'Antigenic variation',
                'Rapid multiplication'
            ],
            treatment: 'Antimalarial treatment depends on severity, geography and resistance patterns; severe malaria is an emergency.',
            high: [
                'Severe malaria risk',
                'Multiple infected RBC stages may be seen',
                'Travel/geography matters'
            ]
        },

        {
            id: 'hiv-1',
            name: 'Human immunodeficiency virus type 1',
            group: 'Virology',
            gram: 'Virus',
            shape: 'Enveloped retrovirus',
            oxygen: 'N/A',
            diseases: [
                'HIV infection',
                'AIDS'
            ],
            lab: 'Diagnosis uses validated antigen/antibody and/or nucleic-acid testing algorithms; viral load and CD4 count are used for management.',
            virulence: [
                'Reverse transcriptase',
                'Integrase',
                'Protease',
                'Envelope glycoproteins'
            ],
            treatment: 'Combination antiretroviral therapy is used; regimen selection should follow current guidelines and patient-specific factors.',
            high: [
                'Targets CD4-associated cells',
                'Reverse transcription',
                'Integration',
                'Chronic infection without effective treatment'
            ]
        },

        {
            id: 'influenza-a',
            name: 'Influenza A virus',
            group: 'Virology',
            gram: 'Virus',
            shape: 'Enveloped segmented RNA virus',
            oxygen: 'N/A',
            diseases: [
                'Influenza'
            ],
            lab: 'Molecular assays are commonly used; antigen tests may be available but vary in sensitivity.',
            virulence: [
                'Hemagglutinin',
                'Neuraminidase',
                'Segmented genome',
                'Antigenic drift/shift'
            ],
            treatment: 'Antiviral therapy is most useful when indicated by syndrome, timing and risk factors; follow current guidance.',
            high: [
                'Segmented genome',
                'Drift and shift',
                'Respiratory transmission'
            ]
        },

        {
            id: 'hbv',
            name: 'Hepatitis B virus',
            group: 'Virology',
            gram: 'Virus',
            shape: 'Enveloped DNA virus',
            oxygen: 'N/A',
            diseases: [
                'Acute hepatitis',
                'Chronic hepatitis',
                'Cirrhosis',
                'Hepatocellular carcinoma'
            ],
            lab: 'Serologic markers and HBV DNA are interpreted together to determine infection status and activity.',
            virulence: [
                'Surface antigen',
                'Reverse transcriptase',
                'cccDNA'
            ],
            treatment: 'Management depends on phase of infection and liver disease; prevention by vaccination is highly important.',
            high: [
                'Partially double-stranded DNA',
                'Reverse transcription',
                'Vaccination prevents infection'
            ]
        }
    ];

    const diseases = [
        {
            id: 'meningitis-bacterial',
            name: 'Acute bacterial meningitis',
            category: 'Clinical syndromes',
            summary: 'A medical emergency requiring rapid assessment, empiric treatment and microbiologic investigation.',
            organisms: [
                'Streptococcus pneumoniae',
                'Neisseria meningitidis',
                'Haemophilus influenzae'
            ],
            diagnosis: 'CSF analysis, Gram stain, culture and molecular testing where available.',
            high: [
                'Treat urgently when suspected',
                'Interpret CSF in clinical context',
                'Consider epidemiology and age/risk factors'
            ]
        },

        {
            id: 'uti',
            name: 'Urinary tract infection',
            category: 'Clinical syndromes',
            summary: 'Infection involving the urinary tract, commonly caused by enteric Gram-negative organisms.',
            organisms: [
                'Escherichia coli',
                'Klebsiella pneumoniae'
            ],
            diagnosis: 'Urinalysis plus culture when indicated, with susceptibility testing for significant isolates.',
            high: [
                'E. coli is common',
                'Local resistance matters',
                'Differentiate uncomplicated from complicated disease'
            ]
        },

        {
            id: 'tb',
            name: 'Tuberculosis',
            category: 'Bacterial disease',
            summary: 'Chronic infection caused by Mycobacterium tuberculosis complex.',
            organisms: [
                'Mycobacterium tuberculosis'
            ],
            diagnosis: 'Clinical assessment plus molecular testing, microscopy and culture as appropriate.',
            high: [
                'Airborne spread',
                'Drug resistance changes therapy',
                'Latent and active disease differ'
            ]
        },

        {
            id: 'malaria',
            name: 'Malaria',
            category: 'Parasitic disease',
            summary: 'Mosquito-borne infection caused by Plasmodium species.',
            organisms: [
                'Plasmodium falciparum'
            ],
            diagnosis: 'Blood film and validated rapid/molecular methods.',
            high: [
                'Falciparum can become severe rapidly',
                'Species and parasite density matter',
                'Exposure geography is key'
            ]
        },

        {
            id: 'cholera',
            name: 'Cholera',
            category: 'Bacterial disease',
            summary: 'Acute secretory diarrheal disease caused by toxigenic Vibrio cholerae.',
            organisms: [
                'Vibrio cholerae'
            ],
            diagnosis: 'Clinical syndrome plus stool testing when indicated, especially in outbreaks.',
            high: [
                'Rehydration is central',
                'Fecal-oral transmission',
                'Water and sanitation are major prevention measures'
            ]
        }
    ];

    const antibiotics = [
        {
            id: 'penicillins',
            name: 'Penicillins',
            class: 'Beta-lactam',
            mechanism: 'Inhibit bacterial cell-wall synthesis by binding penicillin-binding proteins.',
            uses: 'Many susceptible Gram-positive and Gram-negative infections depending on agent and resistance.',
            adverse: 'Hypersensitivity reactions and selected agent-specific adverse effects.',
            resistance: 'Beta-lactamases, altered PBPs, reduced permeability and efflux depending on organism.',
            high: 'Always distinguish spectrum and resistance patterns among individual penicillins.'
        },

        {
            id: 'cephalosporins',
            name: 'Cephalosporins',
            class: 'Beta-lactam',
            mechanism: 'Inhibit peptidoglycan cross-linking through PBPs.',
            uses: 'Broad range of infections depending on generation and agent.',
            adverse: 'Hypersensitivity, gastrointestinal effects and selected agent-specific toxicities.',
            resistance: 'Beta-lactamases, altered PBPs and permeability changes.',
            high: 'Generation is a rough guide; always check the specific drug and organism.'
        },

        {
            id: 'macrolides',
            name: 'Macrolides',
            class: 'Protein synthesis inhibitor',
            mechanism: 'Bind the 50S ribosomal subunit and inhibit protein synthesis.',
            uses: 'Selected respiratory and atypical infections and other susceptible infections.',
            adverse: 'GI effects, QT prolongation and drug interactions vary by agent.',
            resistance: 'Target-site modification, efflux and enzymatic mechanisms.',
            high: 'Think 50S; interactions and QT risk matter.'
        },

        {
            id: 'aminoglycosides',
            name: 'Aminoglycosides',
            class: 'Protein synthesis inhibitor',
            mechanism: 'Bind the 30S ribosomal subunit and cause misreading of mRNA.',
            uses: 'Serious infections caused by susceptible aerobic Gram-negative organisms and selected combination regimens.',
            adverse: 'Nephrotoxicity and ototoxicity are important class concerns.',
            resistance: 'Drug-modifying enzymes, altered targets and reduced uptake.',
            high: '30S; concentration-dependent activity; toxicity requires monitoring.'
        },

        {
            id: 'fluoroquinolones',
            name: 'Fluoroquinolones',
            class: 'DNA synthesis inhibitor',
            mechanism: 'Inhibit bacterial DNA gyrase and topoisomerase IV.',
            uses: 'Selected urinary, gastrointestinal and other infections depending on agent and guidance.',
            adverse: 'Tendon, CNS, QT and other class-specific adverse effects can occur.',
            resistance: 'Target mutations, efflux and reduced permeability.',
            high: 'DNA gyrase/topoisomerase IV; use judiciously.'
        },

        {
            id: 'vancomycin',
            name: 'Vancomycin',
            class: 'Glycopeptide',
            mechanism: 'Binds D-Ala-D-Ala and inhibits cell-wall synthesis.',
            uses: 'Serious susceptible Gram-positive infections; oral formulation has a specific role in C. difficile infection.',
            adverse: 'Infusion-related reactions and nephrotoxicity are important considerations.',
            resistance: 'Alteration of cell-wall precursor target, especially in enterococci.',
            high: 'Primarily Gram-positive coverage; route matters.'
        }
    ];

    const topics = [
        'General Microbiology',
        'Bacteriology',
        'Virology',
        'Mycology',
        'Parasitology',
        'Immunology',
        'Antimicrobials',
        'Microbial Genetics',
        'Sterilization & Disinfection',
        'Host–Pathogen Interaction',
        'Clinical Microbiology',
        'Antimicrobial Resistance'
    ];

    const vaccines = [
        {
            name: 'Hepatitis B vaccine',
            target: 'Hepatitis B virus',
            type: 'Recombinant subunit',
            facts: 'Prevents HBV infection and its long-term complications.'
        },

        {
            name: 'Pneumococcal vaccines',
            target: 'Streptococcus pneumoniae',
            type: 'Conjugate/polysaccharide formulations',
            facts: 'Protect against selected pneumococcal serotypes; recommendations vary by age and risk.'
        },

        {
            name: 'Meningococcal vaccines',
            target: 'Neisseria meningitidis',
            type: 'Conjugate and recombinant formulations',
            facts: 'Protection depends on vaccine formulation and serogroup.'
        },

        {
            name: 'Influenza vaccine',
            target: 'Influenza viruses',
            type: 'Inactivated/recombinant or live formulations depending on product',
            facts: 'Updated periodically because circulating strains change.'
        }
    ];

    const questions = [
        {
            q: 'Which organism is classically a coagulase-positive Gram-positive coccus?',
            opts: [
                'Staphylococcus aureus',
                'Streptococcus pyogenes',
                'Neisseria meningitidis',
                'E. coli'
            ],
            a: 0,
            e: 'S. aureus is a Gram-positive coccus in clusters and is classically coagulase positive.'
        },

        {
            q: 'Which organism is a Gram-negative diplococcus associated with meningitis?',
            opts: [
                'S. pneumoniae',
                'N. meningitidis',
                'S. aureus',
                'Klebsiella'
            ],
            a: 1,
            e: 'N. meningitidis is a Gram-negative diplococcus and an important cause of invasive meningococcal disease.'
        },

        {
            q: 'Which organism is classically a lactose fermenter on MacConkey agar?',
            opts: [
                'Pseudomonas aeruginosa',
                'E. coli',
                'Salmonella Typhi',
                'Vibrio cholerae'
            ],
            a: 1,
            e: 'Typical E. coli ferments lactose, producing characteristic colonies on MacConkey agar.'
        },

        {
            q: 'The capsule of Streptococcus pneumoniae is an important example of what?',
            opts: [
                'Endotoxin',
                'Virulence factor',
                'Ribosomal subunit',
                'Viral envelope'
            ],
            a: 1,
            e: 'The polysaccharide capsule is a major pneumococcal virulence factor.'
        },

        {
            q: 'Which Plasmodium species is most associated with severe malaria?',
            opts: [
                'P. falciparum',
                'P. vivax',
                'P. ovale',
                'P. malariae'
            ],
            a: 0,
            e: 'P. falciparum is the species most strongly associated with severe malaria.'
        },

        {
            q: 'Which antibiotic class binds the 50S ribosomal subunit?',
            opts: [
                'Aminoglycosides',
                'Macrolides',
                'Fluoroquinolones',
                'Glycopeptides'
            ],
            a: 1,
            e: 'Macrolides bind the 50S ribosomal subunit.'
        },

        {
            q: 'What is the key initial priority in severe cholera?',
            opts: [
                'Immediate antifungal therapy',
                'Rapid rehydration',
                'Surgery',
                'Antiviral therapy'
            ],
            a: 1,
            e: 'Rapid fluid and electrolyte replacement is the cornerstone of cholera management.'
        },

        {
            q: 'Mycobacterium tuberculosis is best described as:',
            opts: [
                'Acid-fast bacillus',
                'Gram-positive diplococcus',
                'Enveloped RNA virus',
                'Yeast'
            ],
            a: 0,
            e: 'M. tuberculosis has a lipid-rich cell wall and is classically identified as an acid-fast bacillus.'
        }
    ];

    const algorithms = {
        'Gram-positive cocci': [
            'Start with Gram stain',
            'Cocci in clusters → consider Staphylococcus',
            'Cocci in chains/pairs → consider Streptococcus/Enterococcus',
            'Use catalase to distinguish Staphylococcus (+) from Streptococcus/Enterococcus (−)',
            'Use coagulase, hemolysis and other validated identification methods'
        ],

        'Gram-negative rods': [
            'Assess lactose fermentation',
            'Lactose fermenter → consider Enterobacterales',
            'Non-lactose fermenter → consider Pseudomonas and others',
            'Add oxidase, biochemical identification and susceptibility testing',
            'Interpret with specimen/site and clinical context'
        ],

        'Meningitis': [
            'Recognize the syndrome urgently',
            'Obtain appropriate blood cultures when feasible',
            'CSF analysis when safe and indicated',
            'Gram stain/culture plus molecular testing where available',
            'Start empiric treatment according to age/risk/local guidance',
            'Narrow when organism and susceptibility are known'
        ],

        'UTI': [
            'Assess symptoms and severity',
            'Urinalysis when appropriate',
            'Culture selected patients/situations',
            'Identify organism',
            'Perform susceptibility testing when indicated',
            'Treat according to syndrome and current guidance'
        ]
    };

    const cases = [
        {
            title: 'Case: Fever, headache and neck stiffness',
            presentation: 'A young adult presents with acute fever, severe headache and neck stiffness.',
            history: 'Symptoms developed rapidly. No known immunodeficiency is provided.',
            exam: 'Ill-appearing with fever and meningeal irritation.',
            labs: 'CSF evaluation is requested with Gram stain, culture and molecular testing as appropriate.',
            question: 'Which laboratory finding would most strongly support meningococcal disease?',
            options: [
                'Gram-negative diplococci in CSF',
                'Budding yeast in CSF',
                'Acid-fast bacilli only',
                'Lactose-fermenting colonies'
            ],
            answer: 0,
            explanation: 'Neisseria meningitidis is a Gram-negative diplococcus and an important cause of acute bacterial meningitis.'
        }
    ];

    /*
     * ------------------------------------------------------------
     * STATE
     * ------------------------------------------------------------
     */

    let state = {
        version: 2,

        progress: {
            topics: 0,
            organisms: 0,
            questions: 0,
            correct: 0,
            exams: 0,
            streak: 0,
            byGroup: {}
        },

        studied: {},
        bookmarks: [],
        notes: [],
        flashcards: [],
        review: [],
        activity: [],
        knowledge: [],
        planner: [],

        settings: {
            theme: 'light'
        },

        exam: null,
        questionIndex: 0
    };

    let current = {
        organism: null,
        disease: null,
        question: null,
        case: null,
        spotter: null,
        flashcard: null,
        note: null,
        exam: null,
        aiMessages: []
    };

    let initialized = false;
    let bound = false;
    let destroyed = false;
    let examTimer = null;

    /*
     * ------------------------------------------------------------
     * STORAGE
     * ------------------------------------------------------------
     */

    function load() {
        try {
            const raw = localStorage.getItem(STATE_KEY);

            if (!raw) {
                return;
            }

            const stored = JSON.parse(raw);

            if (!stored || typeof stored !== 'object') {
                return;
            }

            state = Object.assign(state, stored);

            state.progress = Object.assign(
                {
                    topics: 0,
                    organisms: 0,
                    questions: 0,
                    correct: 0,
                    exams: 0,
                    streak: 0,
                    byGroup: {}
                },
                state.progress || {}
            );

            state.notes = Array.isArray(state.notes)
                ? state.notes
                : [];

            state.bookmarks = Array.isArray(state.bookmarks)
                ? state.bookmarks
                : [];

            state.review = Array.isArray(state.review)
                ? state.review
                : [];

            state.activity = Array.isArray(state.activity)
                ? state.activity
                : [];

            state.knowledge = Array.isArray(state.knowledge)
                ? state.knowledge
                : [];

            state.planner = Array.isArray(state.planner)
                ? state.planner
                : [];

        } catch (error) {
            console.warn(
                '[MICROBIOLOGY] State load failed:',
                error
            );
        }
    }

    function save() {
        try {
            localStorage.setItem(
                STATE_KEY,
                JSON.stringify(state)
            );
        } catch (error) {
            console.warn(
                '[MICROBIOLOGY] State save failed:',
                error
            );
        }

        renderStats();
    }

    /*
     * ------------------------------------------------------------
     * UI HELPERS
     * ------------------------------------------------------------
     */

    function setText(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value ?? '';
        }
    }

    function setValue(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.value = value ?? '';
        }
    }

    function toast(message, type = 'info') {
        const element = $('#microToast');

        if (!element) {
            return;
        }

        element.textContent = message;
        element.dataset.type = type;
        element.classList.add('show');

        clearTimeout(toast.timer);

        toast.timer = setTimeout(() => {
            element.classList.remove('show');
        }, 2600);
    }

    function loading(on, text = 'Loading…') {
        const element = $('#microLoading');

        if (!element) {
            return;
        }

        element.classList.toggle('show', !!on);

        const label = $('#microLoadingText');

        if (label) {
            label.textContent = text;
        }
    }

    /*
     * ------------------------------------------------------------
     * NAVIGATION
     * ------------------------------------------------------------
     */

    function showView(name) {
        if (destroyed) {
            return;
        }

        $$('.module-view').forEach(view => {
            view.classList.remove('active');
            view.classList.remove('is-active');
        });

        const view =
            $('#view-' + name) ||
            $('#' + name);

        if (view) {
            view.classList.add('active');
            view.classList.add('is-active');
        }

        $$('[data-section]').forEach(button => {
            button.classList.toggle(
                'active',
                button.dataset.section === name
            );

            button.classList.toggle(
                'is-active',
                button.dataset.section === name
            );
        });

        if (name === 'home') {
            renderDashboard();
        }

        if (
            name === 'learn' ||
            name === 'explore'
        ) {
            renderExplore();
        }

        if (name === 'practice') {
            renderPractice();
        }

        if (name === 'study') {
            renderStudy();
            renderNotes();
        }

        if (name === 'ai') {
            renderAI();
        }
    }

    /*
     * ------------------------------------------------------------
     * DASHBOARD
     * ------------------------------------------------------------
     */

    function renderStats() {
        const values = {
            statTopics: state.progress.topics || 0,

            statOrganisms:
                Object.keys(
                    state.studied || {}
                ).length,

            statQuestions:
                state.progress.questions || 0,

            statStreak:
                state.progress.streak || 0
        };

        Object.entries(values).forEach(
            ([id, value]) => {
                const element = $('#' + id);

                if (element) {
                    element.textContent = value;
                }
            }
        );
    }

    function logActivity(text) {
        state.activity.unshift({
            id: uid('activity'),
            text,
            date: new Date().toISOString()
        });

        state.activity =
            state.activity.slice(0, 30);

        save();
    }

    function renderDashboard() {
        renderStats();

        const continueList =
            $('#continueStudyList');

        if (continueList) {
            continueList.innerHTML =
                (state.review || [])
                    .slice(0, 5)
                    .map(item => `
                        <button
                            type="button"
                            class="micro-list-item"
                            data-action="review-item"
                            data-id="${esc(item.id)}"
                        >
                            <b>${esc(item.title || item.name || 'Review item')}</b>
                            <span>${esc(item.reason || 'Review')}</span>
                        </button>
                    `)
                    .join('') ||
                `
                    <div class="micro-empty">
                        Your review queue will appear here as you study.
                    </div>
                `;
        }

        const recent =
            $('#recentActivity');

        if (recent) {
            recent.innerHTML =
                (state.activity || [])
                    .slice(0, 8)
                    .map(item => `
                        <div class="micro-activity">
                            <span>${esc(item.text)}</span>
                            <small>
                                ${new Date(item.date).toLocaleDateString()}
                            </small>
                        </div>
                    `)
                    .join('') ||
                `
                    <div class="micro-empty">
                        No activity yet.
                    </div>
                `;
        }
    }

    /*
     * ------------------------------------------------------------
     * ORGANISMS
     * ------------------------------------------------------------
     */

    function renderOrganisms(list = organisms) {
        const grid = $('#organismGrid');

        if (!grid) {
            return;
        }

        grid.innerHTML =
            list.map(organism => `
                <article
                    class="micro-card organism-card"
                    data-organism="${esc(organism.id)}"
                >
                    <div class="micro-card-kicker">
                        ${esc(organism.group)}
                    </div>

                    <h3>${esc(organism.name)}</h3>

                    <p>
                        ${esc(organism.gram)}
                        ·
                        ${esc(organism.shape)}
                    </p>

                    <div class="micro-tags">
                        ${organism.diseases
                            .slice(0, 2)
                            .map(
                                disease =>
                                    `<span>${esc(disease)}</span>`
                            )
                            .join('')}
                    </div>

                    <button
                        type="button"
                        data-action="open-organism"
                        data-id="${esc(organism.id)}"
                    >
                        Open
                    </button>
                </article>
            `).join('') ||
            `
                <div class="micro-empty">
                    No organisms match the filters.
                </div>
            `;
    }

    function openOrganism(id) {
        const organism =
            organisms.find(item => item.id === id);

        if (!organism) {
            return;
        }

        current.organism = organism;

        state.studied[organism.id] = {
            last: Date.now(),
            name: organism.name
        };

        save();

        logActivity(
            'Studied ' + organism.name
        );

        const modal =
            $('#organismDetailModal');

        if (!modal) {
            return;
        }

        const content =
            $('#organismDetailContent');

        if (content) {
            content.innerHTML = `
                <div class="detail-head">
                    <span>${esc(organism.group)}</span>

                    <h2>${esc(organism.name)}</h2>

                    <p>
                        ${esc(organism.gram)}
                        ·
                        ${esc(organism.shape)}
                        ·
                        ${esc(organism.oxygen)}
                    </p>
                </div>

                <section>
                    <h3>Clinical diseases</h3>

                    <ul>
                        ${organism.diseases
                            .map(
                                item =>
                                    `<li>${esc(item)}</li>`
                            )
                            .join('')}
                    </ul>
                </section>

                <section>
                    <h3>Laboratory diagnosis</h3>
                    <p>${esc(organism.lab)}</p>
                </section>

                <section>
                    <h3>Virulence / pathogenic mechanisms</h3>

                    <ul>
                        ${organism.virulence
                            .map(
                                item =>
                                    `<li>${esc(item)}</li>`
                            )
                            .join('')}
                    </ul>
                </section>

                <section>
                    <h3>Treatment</h3>
                    <p>${esc(organism.treatment)}</p>
                </section>

                <section>
                    <h3>High-yield</h3>

                    <ul>
                        ${organism.high
                            .map(
                                item =>
                                    `<li>${esc(item)}</li>`
                            )
                            .join('')}
                    </ul>
                </section>

                <button
                    type="button"
                    data-action="bookmark-organism"
                    data-id="${esc(organism.id)}"
                >
                    ${
                        state.bookmarks.includes(organism.id)
                            ? 'Bookmarked'
                            : 'Bookmark'
                    }
                </button>
            `;
        }

        modal.classList.add('show');
        modal.classList.add('is-open');
        modal.removeAttribute('hidden');
        modal.setAttribute(
            'aria-hidden',
            'false'
        );
    }

    /*
     * ------------------------------------------------------------
     * DISEASES
     * ------------------------------------------------------------
     */

    function renderDiseases(list = diseases) {
        const grid = $('#diseaseGrid');

        if (!grid) {
            return;
        }

        grid.innerHTML =
            list.map(disease => `
                <article class="micro-card">
                    <div class="micro-card-kicker">
                        ${esc(disease.category)}
                    </div>

                    <h3>${esc(disease.name)}</h3>

                    <p>${esc(disease.summary)}</p>

                    <button
                        type="button"
                        data-action="open-disease"
                        data-id="${esc(disease.id)}"
                    >
                        Explore
                    </button>
                </article>
            `).join('') ||
            `
                <div class="micro-empty">
                    No diseases found.
                </div>
            `;
    }

    function openDisease(id) {
        const disease =
            diseases.find(item => item.id === id);

        if (!disease) {
            return;
        }

        current.disease = disease;

        const box = $('#diseaseDetail');

        if (!box) {
            return;
        }

        box.innerHTML = `
            <div class="micro-card detail">
                <h2>${esc(disease.name)}</h2>

                <p>${esc(disease.summary)}</p>

                <h3>Common organisms</h3>

                <ul>
                    ${disease.organisms
                        .map(
                            item =>
                                `<li>${esc(item)}</li>`
                        )
                        .join('')}
                </ul>

                <h3>Diagnosis</h3>

                <p>${esc(disease.diagnosis)}</p>

                <h3>High-yield</h3>

                <ul>
                    ${disease.high
                        .map(
                            item =>
                                `<li>${esc(item)}</li>`
                        )
                        .join('')}
                </ul>
            </div>
        `;

        box.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }

    /*
     * ------------------------------------------------------------
     * ANTIBIOTICS
     * ------------------------------------------------------------
     */

    function renderAntibiotics(
        list = antibiotics
    ) {
        const grid = $('#antibioticGrid');

        if (!grid) {
            return;
        }

        grid.innerHTML =
            list.map(antibiotic => `
                <article class="micro-card">
                    <div class="micro-card-kicker">
                        ${esc(antibiotic.class)}
                    </div>

                    <h3>${esc(antibiotic.name)}</h3>

                    <p>
                        ${esc(antibiotic.mechanism)}
                    </p>

                    <button
                        type="button"
                        data-action="open-antibiotic"
                        data-id="${esc(antibiotic.id)}"
                    >
                        Details
                    </button>
                </article>
            `).join('') ||
            `
                <div class="micro-empty">
                    No antibiotics found.
                </div>
            `;
    }

    function openAntibiotic(id) {
        const antibiotic =
            antibiotics.find(item => item.id === id);

        if (!antibiotic) {
            return;
        }

        const box =
            $('#antibioticDetail');

        if (!box) {
            return;
        }

        box.innerHTML = `
            <div class="micro-card detail">
                <h2>${esc(antibiotic.name)}</h2>

                <p>
                    <b>Class:</b>
                    ${esc(antibiotic.class)}
                </p>

                <p>
                    <b>Mechanism:</b>
                    ${esc(antibiotic.mechanism)}
                </p>

                <p>
                    <b>Uses:</b>
                    ${esc(antibiotic.uses)}
                </p>

                <p>
                    <b>Adverse effects:</b>
                    ${esc(antibiotic.adverse)}
                </p>

                <p>
                    <b>Resistance:</b>
                    ${esc(antibiotic.resistance)}
                </p>

                <p>
                    <b>High-yield:</b>
                    ${esc(antibiotic.high)}
                </p>
            </div>
        `;

        box.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }

    /*
     * ------------------------------------------------------------
     * VACCINES
     * ------------------------------------------------------------
     */

    function renderVaccines() {
        const grid = $('#vaccineGrid');

        if (!grid) {
            return;
        }

        grid.innerHTML =
            vaccines.map(vaccine => `
                <article class="micro-card">
                    <h3>${esc(vaccine.name)}</h3>

                    <p>
                        <b>Target:</b>
                        ${esc(vaccine.target)}
                    </p>

                    <p>
                        <b>Type:</b>
                        ${esc(vaccine.type)}
                    </p>

                    <p>
                        ${esc(vaccine.facts)}
                    </p>
                </article>
            `).join('');
    }

    /*
     * ------------------------------------------------------------
     * EXPLORE
     * ------------------------------------------------------------
     */

    function renderExplore() {
        renderOrganisms();
        renderDiseases();
        renderAntibiotics();
        renderVaccines();
    }

    /*
     * ------------------------------------------------------------
     * TOPICS
     * ------------------------------------------------------------
     */

    function renderTopics(category = '') {
        const grid = $('#topicGrid');

        if (!grid) {
            return;
        }

        const categoryNorm = norm(category);

        const filtered =
            categoryNorm
                ? topics.filter(topic =>
                    norm(topic).includes(categoryNorm)
                )
                : topics;

        grid.innerHTML =
            filtered.map(topic => `
                <article class="micro-card">
                    <div class="micro-card-kicker">
                        TOPIC
                    </div>

                    <h3>${esc(topic)}</h3>

                    <p>
                        Build knowledge through mechanisms,
                        clinical syndromes, diagnosis and
                        retrieval practice.
                    </p>

                    <button
                        type="button"
                        data-action="topic"
                        data-name="${esc(topic)}"
                    >
                        Study Topic
                    </button>
                </article>
            `).join('') ||
            `
                <div class="micro-empty">
                    No topics found.
                </div>
            `;
    }

    /*
     * ------------------------------------------------------------
     * PRACTICE
     * ------------------------------------------------------------
     */

    function renderPractice() {
        renderQuestion();
        renderFlashcard();
        renderSpotter();
        renderCase();
    }

    function renderQuestion() {
        const container =
            $('#questionContainer');

        if (!container) {
            return;
        }

        const question =
            current.question ||
            questions[
                Math.floor(
                    Math.random() *
                    questions.length
                )
            ];

        current.question = question;

        container.innerHTML = `
            <div class="question-card">

                <div class="micro-card-kicker">
                    MEDICAL MICROBIOLOGY
                </div>

                <h2>
                    ${esc(question.q)}
                </h2>

                <div class="question-options">
                    ${question.opts
                        .map(
                            (option, index) => `
                                <button
                                    type="button"
                                    class="question-option"
                                    data-action="answer-question"
                                    data-index="${index}"
                                >
                                    ${String.fromCharCode(
                                        65 + index
                                    )}.
                                    ${esc(option)}
                                </button>
                            `
                        )
                        .join('')}
                </div>

                <div id="questionFeedback"></div>

            </div>
        `;

        const explanation =
            $('#questionExplanation');

        if (explanation) {
            explanation.textContent = '';
        }
    }

    function answerQuestion(index) {
        const question =
            current.question;

        if (!question) {
            return;
        }

        const correct =
            Number(index) === question.a;

        state.progress.questions =
            (state.progress.questions || 0) + 1;

        if (correct) {
            state.progress.correct =
                (state.progress.correct || 0) + 1;

            toast(
                'Correct',
                'success'
            );
        } else {
            toast(
                'Review this concept',
                'error'
            );
        }

        const feedback =
            $('#questionFeedback');

        if (feedback) {
            feedback.innerHTML = `
                <div class="feedback ${
                    correct
                        ? 'correct'
                        : 'incorrect'
                }">

                    <b>
                        ${
                            correct
                                ? 'Correct'
                                : 'Not quite'
                        }
                    </b>

                    <p>
                        ${esc(question.e)}
                    </p>
                </div>
            `;
        }

        state.review.unshift({
            id: uid('question-review'),
            title: question.q,
            reason: correct
                ? 'Reinforce'
                : 'Incorrect',
            type: 'question',
            date: today()
        });

        state.review =
            state.review.slice(0, 100);

        save();
    }

    function nextQuestion() {
        current.question = null;
        renderQuestion();
    }

    /*
     * ------------------------------------------------------------
     * FLASHCARDS
     * ------------------------------------------------------------
     */

    function makeFlashcard() {
        const organism =
            organisms[
                Math.floor(
                    Math.random() *
                    organisms.length
                )
            ];

        current.flashcard = {
            front:
                'What is a high-yield fact about ' +
                organism.name +
                '?',

            back:
                organism.high.join(' • '),

            id: organism.id,

            flipped: false
        };

        renderFlashcard();
    }

    function renderFlashcard() {
        const flashcard =
            $('#flashcard');

        if (!flashcard) {
            return;
        }

        if (!current.flashcard) {
            makeFlashcard();
            return;
        }

        const item =
            current.flashcard;

        const front =
            $('#flashcardFront');

        const back =
            $('#flashcardBack');

        if (front) {
            front.innerHTML = `
                <span>Question</span>
                <strong>
                    ${esc(item.front)}
                </strong>
            `;
        }

        if (back) {
            back.innerHTML = `
                <span>Answer</span>
                <strong>
                    ${esc(item.back)}
                </strong>
            `;
        }

        flashcard.classList.toggle(
            'flipped',
            !!item.flipped
        );

        flashcard.classList.toggle(
            'is-flipped',
            !!item.flipped
        );
    }

    function flipCard() {
        if (!current.flashcard) {
            return;
        }

        current.flashcard.flipped =
            !current.flashcard.flipped;

        renderFlashcard();
    }

    function rateCard(rating) {
        if (!current.flashcard) {
            return;
        }

        state.flashcards.push({
            id: uid('flashcard'),
            organism:
                current.flashcard.id,
            rating,
            date: today()
        });

        save();

        toast(
            'Review recorded',
            'success'
        );

        makeFlashcard();
    }

    /*
     * ------------------------------------------------------------
     * SPOTTER
     * ------------------------------------------------------------
     */

    function renderSpotter() {
        const image =
            $('#spotterImage');

        const question =
            $('#spotterQuestion');

        if (!image && !question) {
            return;
        }

        const organism =
            organisms[
                Math.floor(
                    Math.random() *
                    organisms.length
                )
            ];

        current.spotter = organism;

        if (image) {
            image.removeAttribute('src');

            image.alt =
                'No specimen image supplied for ' +
                organism.name;
        }

        if (question) {
            question.textContent =
                'Identify the organism associated with this spotter clue: ' +
                organism.high[0];
        }

        setText(
            'spotterAnswer',
            ''
        );

        setText(
            'spotterScore',
            ''
        );
    }

    function revealSpotter() {
        if (!current.spotter) {
            return;
        }

        setText(
            'spotterAnswer',
            current.spotter.name
        );

        setText(
            'spotterScore',
            'Answer revealed — ' +
            current.spotter.name
        );
    }

    /*
     * ------------------------------------------------------------
     * CASE SIMULATOR
     * ------------------------------------------------------------
     */

    function renderCase() {
        const item = cases[0];

        if (!item) {
            return;
        }

        current.case = item;

        setText(
            'caseTitle',
            item.title
        );

        setText(
            'casePresentation',
            item.presentation
        );

        setText(
            'caseHistory',
            item.history
        );

        setText(
            'caseExamination',
            item.exam
        );

        setText(
            'caseLabs',
            item.labs
        );

        setText(
            'caseQuestion',
            item.question
        );

        const options =
            $('#caseOptions');

        if (options) {
            options.innerHTML =
                item.options
                    .map(
                        (option, index) => `
                            <button
                                type="button"
                                data-action="case-answer"
                                data-index="${index}"
                            >
                                ${esc(option)}
                            </button>
                        `
                    )
                    .join('');
        }

        setText(
            'caseExplanation',
            ''
        );
    }

    function caseAnswer(index) {
        const item =
            current.case;

        if (!item) {
            return;
        }

        const correct =
            Number(index) === item.answer;

        setText(
            'caseExplanation',
            (
                correct
                    ? 'Correct. '
                    : 'Review. '
            ) +
            item.explanation
        );

        toast(
            correct
                ? 'Correct'
                : 'Review the explanation',
            correct
                ? 'success'
                : 'error'
        );
    }

    /*
     * ------------------------------------------------------------
     * EXAM
     * ------------------------------------------------------------
     */

    function startExam() {
        const count =
            Math.max(
                1,
                Math.min(
                    questions.length,
                    Number(
                        $('#examQuestionCount')?.value
                    ) || 5
                )
            );

        current.exam = {
            items: [...questions]
                .sort(
                    () => Math.random() - 0.5
                )
                .slice(0, count),

            i: 0,

            answers: [],

            started: Date.now()
        };

        renderExam();

        toast(
            'Exam started',
            'success'
        );
    }

    function renderExam() {
        const exam =
            current.exam;

        if (!exam) {
            return;
        }

        const timeLimit =
            Number(
                $('#examTimeLimit')?.value
            ) || 10;

        const remaining =
            Math.max(
                0,
                timeLimit * 60 -
                Math.floor(
                    (Date.now() -
                        exam.started) /
                    1000
                )
            );

        setText(
            'examTimer',
            formatTime(remaining)
        );

        const question =
            exam.items[exam.i];

        if (!question) {
            finishExam();
            return;
        }

        const container =
            $('#examQuestion');

        if (!container) {
            return;
        }

        container.innerHTML = `
            <div class="question-card">

                <div class="micro-card-kicker">
                    EXAM MODE
                </div>

                <h2>
                    ${esc(question.q)}
                </h2>

                <div class="question-options">
                    ${question.opts
                        .map(
                            (option, index) => `
                                <button
                                    type="button"
                                    data-action="exam-answer"
                                    data-index="${index}"
                                >
                                    ${String.fromCharCode(
                                        65 + index
                                    )}.
                                    ${esc(option)}
                                </button>
                            `
                        )
                        .join('')}
                </div>

                <p>
                    Question
                    ${exam.i + 1}
                    of
                    ${exam.items.length}
                </p>

            </div>
        `;
    }

    function examAnswer(index) {
        if (!current.exam) {
            return;
        }

        current.exam.answers[
            current.exam.i
        ] = Number(index);

        if (
            current.exam.i <
            current.exam.items.length - 1
        ) {
            current.exam.i++;

            renderExam();
        } else {
            finishExam();
        }
    }

    function finishExam() {
        const exam =
            current.exam;

        if (!exam) {
            return;
        }

        const score =
            exam.items.reduce(
                (total, question, index) =>
                    total +
                    (
                        exam.answers[index] ===
                        question.a
                            ? 1
                            : 0
                    ),
                0
            );

        const results =
            $('#examResults');

        if (results) {
            results.innerHTML = `
                <div class="micro-card">
                    <h2>Exam complete</h2>

                    <p>
                        Score:
                        <b>
                            ${score}/${exam.items.length}
                        </b>
                    </p>

                    <p>
                        ${Math.round(
                            score /
                            exam.items.length *
                            100
                        )}%
                    </p>
                </div>
            `;
        }

        state.progress.exams =
            (state.progress.exams || 0) + 1;

        save();

        toast(
            'Exam completed',
            'success'
        );
    }

    function formatTime(seconds) {
        seconds =
            Math.max(
                0,
                seconds | 0
            );

        return (
            String(
                Math.floor(seconds / 60)
            ).padStart(2, '0') +
            ':' +
            String(
                seconds % 60
            ).padStart(2, '0')
        );
    }

    /*
     * ------------------------------------------------------------
     * STUDY
     * ------------------------------------------------------------
     */

    function renderStudy() {
        renderProgress();
        renderWeakAreas();
        renderReviewToday();
        renderPlanner();
        renderKnowledge();
        renderResources();
        renderAlgorithms();
        renderHighYield();
        renderTeachZero();
        renderNotes();
    }

    function renderProgress() {
        renderStats();

        const groups = {
            progressBacteriology:
                'Bacteriology',

            progressVirology:
                'Virology',

            progressMycology:
                'Mycology',

            progressParasitology:
                'Parasitology',

            progressImmunology:
                'Immunology',

            progressAntimicrobials:
                'Antimicrobials'
        };

        Object.entries(groups)
            .forEach(
                ([id, group]) => {
                    const total =
                        organisms.filter(
                            organism =>
                                organism.group === group
                        ).length;

                    const studied =
                        organisms.filter(
                            organism =>
                                organism.group === group &&
                                state.studied[
                                    organism.id
                                ]
                        ).length;

                    const percentage =
                        Math.round(
                            studied /
                            Math.max(
                                1,
                                total
                            ) *
                            100
                        );

                    setText(
                        id,
                        percentage + '%'
                    );
                }
            );
    }

    function renderWeakAreas() {
        const element =
            $('#weakAreasContent');

        if (!element) {
            return;
        }

        const incorrect =
            (state.review || [])
                .filter(
                    item =>
                        item.reason ===
                        'Incorrect'
                );

        element.innerHTML =
            incorrect.length
                ? incorrect
                    .slice(0, 10)
                    .map(
                        item => `
                            <div class="micro-list-item">
                                <b>
                                    ${esc(item.title)}
                                </b>
                                <span>
                                    Needs review
                                </span>
                            </div>
                        `
                    )
                    .join('')
                :
                `
                    <div class="micro-empty">
                        No weak areas detected yet.
                    </div>
                `;
    }

    function renderReviewToday() {
        const element =
            $('#reviewTodayContent');

        if (!element) {
            return;
        }

        element.innerHTML = `
            <div class="study-summary">
                <b>
                    ${state.review.length}
                </b>

                <span>
                    items in review queue
                </span>
            </div>

            ${
                state.review
                    .slice(0, 8)
                    .map(
                        item => `
                            <div class="micro-list-item">
                                <b>
                                    ${esc(item.title)}
                                </b>

                                <span>
                                    ${esc(
                                        item.reason ||
                                        'Review'
                                    )}
                                </span>
                            </div>
                        `
                    )
                    .join('') ||
                `
                    <div class="micro-empty">
                        Nothing due right now.
                    </div>
                `
            }
        `;
    }

    function renderKnowledge() {
        const element =
            $('#knowledgeBaseContent');

        if (!element) {
            return;
        }

        element.innerHTML =
            state.knowledge.length
                ? state.knowledge
                    .map(
                        item => `
                            <div class="micro-list-item">
                                <b>
                                    ${esc(item.title)}
                                </b>

                                <span>
                                    ${esc(item.text)}
                                </span>
                            </div>
                        `
                    )
                    .join('')
                :
                `
                    <div class="micro-empty">
                        Bookmark important concepts to
                        build your personal knowledge base.
                    </div>
                `;
    }

    function renderPlanner() {
        const element =
            $('#microStudyPlan');

        if (!element) {
            return;
        }

        element.innerHTML =
            state.planner
                .map(
                    item => `
                        <label class="planner-item">
                            <input
                                type="checkbox"
                                data-action="planner-check"
                                data-id="${esc(item.id)}"
                                ${item.done ? 'checked' : ''}
                            >

                            ${esc(item.text)}
                        </label>
                    `
                )
                .join('') ||
            `
                <div class="micro-empty">
                    No goals yet.
                </div>
            `;
    }

    function renderAlgorithms() {
        const element =
            $('#algorithmWorkspace');

        if (!element) {
            return;
        }

        const names =
            Object.keys(algorithms);

        const first =
            names[0];

        element.innerHTML = `
            <div class="algorithm-select">

                ${names
                    .map(
                        name => `
                            <button
                                type="button"
                                data-action="algorithm"
                                data-name="${esc(name)}"
                            >
                                ${esc(name)}
                            </button>
                        `
                    )
                    .join('')}

            </div>

            <div id="algorithmFlow">
                ${algorithms[first]
                    .map(
                        (step, index) => `
                            <div class="algorithm-step">
                                <span>
                                    ${index + 1}
                                </span>

                                ${esc(step)}
                            </div>
                        `
                    )
                    .join('')}
            </div>
        `;
    }

    function renderHighYield() {
        const element =
            $('#highYieldContent');

        if (!element) {
            return;
        }

        element.innerHTML =
            organisms
                .map(
                    organism => `
                        <article class="micro-card">

                            <div class="micro-card-kicker">
                                ${esc(organism.group)}
                            </div>

                            <h3>
                                ${esc(organism.name)}
                            </h3>

                            <ul>
                                ${organism.high
                                    .map(
                                        item =>
                                            `<li>${esc(item)}</li>`
                                    )
                                    .join('')}
                            </ul>

                        </article>
                    `
                )
                .join('');
    }

    function renderTeachZero() {
        const element =
            $('#teachContent');

        if (!element) {
            return;
        }

        const topic =
            $('#teachTopic')?.value ||
            topics[0];

        element.innerHTML = `
            <div class="lesson">

                <div class="micro-card-kicker">
                    FOUNDATION
                </div>

                <h2>
                    ${esc(topic)}
                </h2>

                <p>
                    Start with the definition,
                    classification, core mechanisms,
                    clinical relevance, laboratory
                    diagnosis and high-yield exam
                    associations.
                </p>

                <p>
                    <b>Learning method:</b>
                    concept → mechanism →
                    clinical syndrome → diagnosis →
                    treatment/prevention →
                    retrieval practice.
                </p>

            </div>
        `;
    }

    function renderResources() {
        const element =
            $('#resourceGrid');

        if (!element) {
            return;
        }

        element.innerHTML = `
            <article class="micro-card">

                <h3>
                    Microbiology Reference Library
                </h3>

                <p>
                    Add your own lecture PDFs,
                    guidelines and notes through
                    the Notes tools.
                </p>

                <button
                    type="button"
                    data-action="open-notes"
                >
                    Open Notes
                </button>

            </article>
        `;
    }

    /*
     * ------------------------------------------------------------
     * NOTES
     * ------------------------------------------------------------
     */

    function renderNotes() {
        const list =
            $('#notesList');

        if (!list) {
            return;
        }

        list.innerHTML =
            state.notes
                .map(
                    note => `
                        <button
                            type="button"
                            class="micro-list-item"
                            data-action="open-note"
                            data-id="${esc(note.id)}"
                        >
                            <b>
                                ${esc(
                                    note.title ||
                                    'Untitled note'
                                )}
                            </b>

                            <span>
                                ${esc(
                                    note.topic ||
                                    'Microbiology'
                                )}

                                ·

                                ${
                                    note.attachments?.length ||
                                    0
                                }
                                PDF(s)
                            </span>
                        </button>
                    `
                )
                .join('') ||
            `
                <div class="micro-empty">
                    No microbiology notes yet.
                </div>
            `;
    }

    function createNote() {
        const note = {
            id: uid('note'),
            title:
                'Untitled microbiology note',
            editor: '',
            tags: '',
            topic: 'Microbiology',
            attachments: [],
            created: Date.now(),
            updated: Date.now()
        };

        state.notes.unshift(note);

        save();

        renderNotes();

        openNote(note.id);
    }

    function openNote(id) {
        const note =
            state.notes.find(
                item => item.id === id
            );

        if (!note) {
            return;
        }

        current.note = note;

        setValue(
            'noteTitle',
            note.title
        );

        const editor =
            $('#noteEditor');

        if (editor) {
            editor.innerHTML =
                note.editor || '';
        }

        setValue(
            'noteTags',
            note.tags
        );

        setValue(
            'noteTopic',
            note.topic
        );

        renderNoteAttachments(note);

        showView('study');
    }

    function saveNote() {
        const note =
            current.note;

        if (!note) {
            toast(
                'Open or create a note first.',
                'error'
            );

            return;
        }

        note.title =
            $('#noteTitle')?.value ||
            'Untitled microbiology note';

        note.editor =
            $('#noteEditor')?.innerHTML ||
            '';

        note.tags =
            $('#noteTags')?.value ||
            '';

        note.topic =
            $('#noteTopic')?.value ||
            'Microbiology';

        note.updated =
            Date.now();

        save();

        renderNotes();

        toast(
            'Note saved',
            'success'
        );
    }

    function deleteNote() {
        const note =
            current.note;

        if (!note) {
            toast(
                'Open a note first.',
                'error'
            );

            return;
        }

        state.notes =
            state.notes.filter(
                item =>
                    item.id !== note.id
            );

        Promise.all(
            (note.attachments || [])
                .map(
                    attachment =>
                        deletePDF(
                            attachment.id
                        )
                )
        ).catch(console.warn);

        current.note = null;

        save();

        renderNotes();

        setValue(
            'noteTitle',
            ''
        );

        const editor =
            $('#noteEditor');

        if (editor) {
            editor.innerHTML = '';
        }

        renderNoteAttachments({
            attachments: []
        });

        toast(
            'Note deleted',
            'success'
        );
    }

    /*
     * ------------------------------------------------------------
     * INDEXEDDB PDF STORAGE
     * ------------------------------------------------------------
     */

    function db() {
        return new Promise(
            (resolve, reject) => {
                if (!window.indexedDB) {
                    reject(
                        new Error(
                            'IndexedDB is unavailable.'
                        )
                    );

                    return;
                }

                const request =
                    indexedDB.open(
                        DB_NAME,
                        DB_VERSION
                    );

                request.onupgradeneeded = () => {
                    const database =
                        request.result;

                    if (
                        !database.objectStoreNames.contains(
                            STORE
                        )
                    ) {
                        database.createObjectStore(
                            STORE,
                            {
                                keyPath: 'id'
                            }
                        );
                    }
                };

                request.onsuccess = () =>
                    resolve(
                        request.result
                    );

                request.onerror = () =>
                    reject(
                        request.error ||
                        new Error(
                            'Unable to open PDF database.'
                        )
                    );
            }
        );
    }

    async function putPDF(record) {
        const database =
            await db();

        return new Promise(
            (resolve, reject) => {
                const transaction =
                    database.transaction(
                        STORE,
                        'readwrite'
                    );

                transaction
                    .objectStore(STORE)
                    .put(record);

                transaction.oncomplete =
                    () => {
                        database.close();
                        resolve();
                    };

                transaction.onerror =
                    () => {
                        database.close();

                        reject(
                            transaction.error
                        );
                    };
            }
        );
    }

    async function getPDF(id) {
        const database =
            await db();

        return new Promise(
            (resolve, reject) => {
                const request =
                    database
                        .transaction(STORE)
                        .objectStore(STORE)
                        .get(id);

                request.onsuccess =
                    () => {
                        const result =
                            request.result;

                        database.close();

                        resolve(result);
                    };

                request.onerror =
                    () => {
                        database.close();

                        reject(
                            request.error
                        );
                    };
            }
        );
    }

    async function deletePDF(id) {
        const database =
            await db();

        return new Promise(
            (resolve, reject) => {
                const transaction =
                    database.transaction(
                        STORE,
                        'readwrite'
                    );

                transaction
                    .objectStore(STORE)
                    .delete(id);

                transaction.oncomplete =
                    () => {
                        database.close();
                        resolve();
                    };

                transaction.onerror =
                    () => {
                        database.close();

                        reject(
                            transaction.error
                        );
                    };
            }
        );
    }

    async function attachPDF(
        noteId,
        file
    ) {
        if (!file) {
            return;
        }

        if (
            file.type !==
                'application/pdf' &&
            !file.name
                .toLowerCase()
                .endsWith('.pdf')
        ) {
            toast(
                'Please select a PDF file.',
                'error'
            );

            return;
        }

        const id =
            uid('pdf');

        await putPDF({
            id,
            noteId,
            name: file.name,
            size: file.size,
            type:
                file.type ||
                'application/pdf',
            created: Date.now(),
            blob: file
        });

        const note =
            state.notes.find(
                item =>
                    item.id === noteId
            );

        if (!note) {
            return;
        }

        note.attachments =
            note.attachments || [];

        note.attachments.push({
            id,
            name: file.name,
            size: file.size
        });

        save();

        renderNotes();

        renderNoteAttachments(note);

        toast(
            'PDF stored with note',
            'success'
        );
    }

    /*
     * ------------------------------------------------------------
     * NEW PDF.JS VIEWER BRIDGE
     * ------------------------------------------------------------
     *
     * IMPORTANT:
     *
     * There is NO iframe here.
     *
     * pdfViewer.js is responsible for rendering the document.
     */

    async function openPDF(id) {
        try {
            const pdf =
                await getPDF(id);

            if (
                !pdf ||
                !pdf.blob
            ) {
                console.error(
                    '[MICROBIOLOGY PDF] PDF not found:',
                    id
                );

                toast(
                    'PDF could not be found.',
                    'error'
                );

                return;
            }

            if (
                !window.microbiologyPdfViewer ||
                typeof
                    window.microbiologyPdfViewer.open !==
                    'function'
            ) {
                console.error(
                    '[MICROBIOLOGY PDF] PDF viewer API is unavailable.'
                );

                toast(
                    'PDF viewer is unavailable.',
                    'error'
                );

                return;
            }

            console.log(
                '[MICROBIOLOGY PDF] Opening:',
                pdf.name,
                '| ID:',
                id,
                '| Size:',
                pdf.blob.size
            );

            await window
                .microbiologyPdfViewer
                .open(pdf);

        } catch (error) {
            console.error(
                '[MICROBIOLOGY PDF] Failed to open:',
                error
            );

            toast(
                error?.message ||
                'Unable to open PDF.',
                'error'
            );
        }
    }

    function closePDF() {
        if (
            window.microbiologyPdfViewer &&
            typeof
                window.microbiologyPdfViewer.close ===
                'function'
        ) {
            window.microbiologyPdfViewer.close();
        }
    }

    function renderNoteAttachments(note) {
        const element =
            $('#pdfList');

        if (!element) {
            return;
        }

        const attachments =
            note?.attachments || [];

        element.innerHTML =
            attachments
                .map(
                    attachment => `
                        <div class="micro-list-item">

                            <span>
                                ${esc(
                                    attachment.name
                                )}
                            </span>

                            <span>

                                <button
                                    type="button"
                                    data-action="open-pdf"
                                    data-id="${esc(
                                        attachment.id
                                    )}"
                                >
                                    Open
                                </button>

                                <button
                                    type="button"
                                    data-action="delete-pdf"
                                    data-id="${esc(
                                        attachment.id
                                    )}"
                                >
                                    Delete
                                </button>

                            </span>

                        </div>
                    `
                )
                .join('') ||
            `
                <div class="micro-empty">
                    No PDFs attached.
                </div>
            `;
    }

    function attachCurrentPDF() {
        if (!current.note) {
            toast(
                'Create or open a note first.',
                'error'
            );

            return;
        }

        const input =
            document.createElement(
                'input'
            );

        input.type = 'file';

        input.accept =
            'application/pdf,.pdf';

        input.onchange =
            async () => {
                const file =
                    input.files?.[0];

                if (!file) {
                    return;
                }

                try {
                    await attachPDF(
                        current.note.id,
                        file
                    );
                } catch (error) {
                    console.error(
                        '[MICROBIOLOGY PDF] Attach failed:',
                        error
                    );

                    toast(
                        'Failed to store PDF.',
                        'error'
                    );
                }
            };

        input.click();
    }

    /*
     * ------------------------------------------------------------
     * AI
     * ------------------------------------------------------------
     */

    function renderAI() {
        const container =
            $('#aiConversation');

        if (!container) {
            return;
        }

        if (
            !current.aiMessages.length
        ) {
            container.innerHTML = `
                <div class="micro-empty">
                    Ask a microbiology question to begin.
                </div>
            `;

            return;
        }

        container.innerHTML =
            current.aiMessages
                .map(
                    message => `
                        <div class="ai-msg ${esc(
                            message.role
                        )}">

                            <b>
                                ${
                                    message.role ===
                                    'user'
                                        ? 'You'
                                        : 'Microbiology AI'
                                }
                            </b>

                            <div class="ai-msg-content">
                                ${renderAIMarkdown(
                                    message.text
                                )}
                            </div>

                        </div>
                    `
                )
                .join('');

        container.scrollTop =
            container.scrollHeight;
    }

    function renderAIMarkdown(text) {
        let value =
            String(text || '');

        value = value.replace(
            /```([\s\S]*?)```/g,
            (_, code) =>
                `<pre><code>${esc(
                    code.trim()
                )}</code></pre>`
        );

        value = value.replace(
            /\*\*(.*?)\*\*/g,
            '<strong>$1</strong>'
        );

        value = value.replace(
            /`([^`]+)`/g,
            '<code>$1</code>'
        );

        value = value.replace(
            /^### (.*)$/gm,
            '<h4>$1</h4>'
        );

        value = value.replace(
            /^## (.*)$/gm,
            '<h3>$1</h3>'
        );

        value = value.replace(
            /^# (.*)$/gm,
            '<h2>$1</h2>'
        );

        value = value.replace(
            /^\s*[-*]\s+(.*)$/gm,
            '<li>$1</li>'
        );

        value = value.replace(
            /(<li>.*<\/li>)/gs,
            '<ul>$1</ul>'
        );

        value = value.replace(
            /\n{2,}/g,
            '</p><p>'
        );

        value =
            '<p>' +
            value +
            '</p>';

        value = value.replace(
            /<p>\s*<\/p>/g,
            ''
        );

        return value;
    }

    async function callAI(prompt) {
        const text =
            String(prompt || '')
                .trim();

        if (!text) {
            return '';
        }

        /*
         * --------------------------------------------------------
         * PRIMARY STUDY OS AI BRIDGE
         * --------------------------------------------------------
         *
         * Your preload exposes:
         *
         * window.year3.ai.ask(...)
         */

        if (
            window.year3 &&
            window.year3.ai &&
            typeof
                window.year3.ai.ask ===
                'function'
        ) {
            try {
                const response =
                    await window.year3.ai.ask({
                        prompt: text,

                        message: text,

                        module:
                            'Y3-004-Microbiology',

                        context: {
                            subject:
                                'Microbiology',

                            organism:
                                current.organism
                                    ?.name ||
                                null,

                            disease:
                                current.disease
                                    ?.name ||
                                null
                        }
                    });

                if (
                    typeof response ===
                    'string'
                ) {
                    return response;
                }

                if (
                    response &&
                    typeof response ===
                        'object'
                ) {
                    return (
                        response.text ||
                        response.response ||
                        response.content ||
                        response.answer ||
                        JSON.stringify(
                            response
                        )
                    );
                }
            } catch (error) {
                console.warn(
                    '[MICROBIOLOGY AI] Study OS AI bridge failed:',
                    error
                );
            }
        }

        /*
         * --------------------------------------------------------
         * COMPATIBILITY ADAPTERS
         * --------------------------------------------------------
         */

        const adapters = [
            window.microbiologyAI,
            window.studyOS?.ai,
            window.electronAPI?.ai,
            window.api?.ai,
            window.electronAPI?.askAI
        ];

        for (
            const adapter of adapters
        ) {
            try {
                if (
                    typeof adapter ===
                    'function'
                ) {
                    const response =
                        await adapter(
                            text,
                            {
                                module:
                                    'microbiology'
                            }
                        );

                    return typeof response ===
                        'string'
                        ? response
                        : response?.text ||
                          response?.response ||
                          response?.content ||
                          JSON.stringify(
                              response
                          );
                }

                if (
                    adapter &&
                    typeof adapter.ask ===
                        'function'
                ) {
                    const response =
                        await adapter.ask(
                            text,
                            {
                                module:
                                    'microbiology'
                            }
                        );

                    return typeof response ===
                        'string'
                        ? response
                        : response?.text ||
                          response?.response ||
                          response?.content ||
                          JSON.stringify(
                              response
                          );
                }

                if (
                    adapter &&
                    typeof adapter.chat ===
                        'function'
                ) {
                    const response =
                        await adapter.chat({
                            message: text,
                            context:
                                'medical microbiology'
                        });

                    return typeof response ===
                        'string'
                        ? response
                        : response?.text ||
                          response?.response ||
                          response?.content ||
                          JSON.stringify(
                              response
                          );
                }
            } catch (error) {
                console.warn(
                    '[MICROBIOLOGY AI adapter]',
                    error
                );
            }
        }

        return (
            'The Study OS AI bridge did not return a response.\n\n' +
            'Your question was: ' +
            text
        );
    }

    async function sendAI() {
        const input =
            $('#aiInput');

        if (!input) {
            return;
        }

        const text =
            input.value.trim();

        if (!text) {
            return;
        }

        current.aiMessages.push({
            role: 'user',
            text
        });

        input.value = '';

        renderAI();

        loading(
            true,
            'Microbiology AI is thinking…'
        );

        try {
            const answer =
                await callAI(text);

            current.aiMessages.push({
                role: 'assistant',
                text:
                    answer ||
                    'No AI response was returned.'
            });

        } catch (error) {
            current.aiMessages.push({
                role: 'assistant',
                text:
                    'The AI request failed: ' +
                    (error?.message ||
                        'Unknown error.')
            });
        }

        loading(false);

        renderAI();
    }

    function saveAI() {
        const last =
            [...current.aiMessages]
                .reverse()
                .find(
                    item =>
                        item.role ===
                        'assistant'
                );

        if (!last) {
            toast(
                'No AI response to save.',
                'error'
            );

            return;
        }

        const note = {
            id: uid('note'),
            title:
                'AI — ' +
                new Date().toLocaleString(),
            editor: last.text,
            tags:
                'AI,microbiology',
            topic:
                'Microbiology',
            attachments: [],
            created: Date.now(),
            updated: Date.now()
        };

        state.notes.push(note);

        save();

        renderNotes();

        toast(
            'AI response saved to Notes.',
            'success'
        );
    }

    async function copyAI() {
        const last =
            [...current.aiMessages]
                .reverse()
                .find(
                    item =>
                        item.role ===
                        'assistant'
                );

        if (!last) {
            return;
        }

        try {
            await navigator.clipboard.writeText(
                last.text
            );

            toast(
                'Copied',
                'success'
            );
        } catch (error) {
            console.warn(
                '[MICROBIOLOGY AI] Copy failed:',
                error
            );

            toast(
                'Copy failed.',
                'error'
            );
        }
    }

    /*
     * ------------------------------------------------------------
     * SEARCH
     * ------------------------------------------------------------
     */

    function renderSearchResults(query) {
        const box =
            $('#globalSearchResults');

        if (!box) {
            return;
        }

        const value =
            norm(query);

        if (!value) {
            box.innerHTML = '';
            return;
        }

        const results = [];

        organisms.forEach(
            organism => {
                const searchable =
                    organism.name +
                    ' ' +
                    organism.group +
                    ' ' +
                    organism.diseases.join(' ');

                if (
                    norm(searchable)
                        .includes(value)
                ) {
                    results.push({
                        type: 'Organism',
                        title:
                            organism.name,
                        id:
                            organism.id,
                        action:
                            'open-organism'
                    });
                }
            }
        );

        diseases.forEach(
            disease => {
                const searchable =
                    disease.name +
                    ' ' +
                    disease.summary +
                    ' ' +
                    disease.organisms.join(' ');

                if (
                    norm(searchable)
                        .includes(value)
                ) {
                    results.push({
                        type: 'Disease',
                        title:
                            disease.name,
                        id:
                            disease.id,
                        action:
                            'open-disease'
                    });
                }
            }
        );

        antibiotics.forEach(
            antibiotic => {
                const searchable =
                    antibiotic.name +
                    ' ' +
                    antibiotic.class +
                    ' ' +
                    antibiotic.mechanism;

                if (
                    norm(searchable)
                        .includes(value)
                ) {
                    results.push({
                        type: 'Antibiotic',
                        title:
                            antibiotic.name,
                        id:
                            antibiotic.id,
                        action:
                            'open-antibiotic'
                    });
                }
            }
        );

        topics.forEach(
            topic => {
                if (
                    norm(topic)
                        .includes(value)
                ) {
                    results.push({
                        type: 'Topic',
                        title:
                            topic,
                        id:
                            topic,
                        action:
                            'topic'
                    });
                }
            }
        );

        state.notes.forEach(
            note => {
                const searchable =
                    note.title +
                    ' ' +
                    note.editor +
                    ' ' +
                    note.tags;

                if (
                    norm(searchable)
                        .includes(value)
                ) {
                    results.push({
                        type: 'Note',
                        title:
                            note.title,
                        id:
                            note.id,
                        action:
                            'open-note'
                    });
                }
            }
        );

        box.innerHTML =
            results
                .slice(0, 20)
                .map(
                    result => `
                        <button
                            type="button"
                            class="search-result"
                            data-action="${esc(
                                result.action
                            )}"
                            data-id="${esc(
                                result.id
                            )}"
                            data-name="${esc(
                                result.title
                            )}"
                        >
                            <span>
                                ${esc(
                                    result.type
                                )}
                            </span>

                            <b>
                                ${esc(
                                    result.title
                                )}
                            </b>
                        </button>
                    `
                )
                .join('') ||
            `
                <div class="micro-empty">
                    No results.
                </div>
            `;
    }

    /*
     * ------------------------------------------------------------
     * COMPARISON
     * ------------------------------------------------------------
     */

    function compare() {
        const first =
            $('#comparisonOrganismA')
                ?.value;

        const second =
            $('#comparisonOrganismB')
                ?.value;

        const organismA =
            organisms.find(
                organism =>
                    organism.id ===
                    first
            );

        const organismB =
            organisms.find(
                organism =>
                    organism.id ===
                    second
            );

        const result =
            $('#comparisonResult');

        if (
            !result ||
            !organismA ||
            !organismB
        ) {
            return;
        }

        const rows = [
            ['Group', 'group'],
            ['Gram', 'gram'],
            ['Shape', 'shape'],
            ['Oxygen', 'oxygen'],
            ['Diseases', 'diseases'],
            ['Laboratory', 'lab'],
            ['Virulence', 'virulence']
        ];

        result.innerHTML = `
            <table class="comparison">

                <thead>
                    <tr>
                        <th>Feature</th>
                        <th>
                            ${esc(
                                organismA.name
                            )}
                        </th>
                        <th>
                            ${esc(
                                organismB.name
                            )}
                        </th>
                    </tr>
                </thead>

                <tbody>
                    ${rows
                        .map(
                            ([label, key]) => `
                                <tr>
                                    <th>
                                        ${esc(label)}
                                    </th>

                                    <td>
                                        ${esc(
                                            Array.isArray(
                                                organismA[key]
                                            )
                                                ? organismA[
                                                    key
                                                ].join(', ')
                                                : organismA[
                                                    key
                                                ]
                                        )}
                                    </td>

                                    <td>
                                        ${esc(
                                            Array.isArray(
                                                organismB[key]
                                            )
                                                ? organismB[
                                                    key
                                                ].join(', ')
                                                : organismB[
                                                    key
                                                ]
                                        )}
                                    </td>
                                </tr>
                            `
                        )
                        .join('')}
                </tbody>

            </table>
        `;
    }

    function setupComparison() {
        [
            'comparisonOrganismA',
            'comparisonOrganismB'
        ].forEach(id => {
            const select =
                $('#' + id);

            if (
                !select ||
                select.tagName !==
                    'SELECT'
            ) {
                return;
            }

            select.innerHTML = `
                <option value="">
                    Select organism
                </option>

                ${organisms
                    .map(
                        organism => `
                            <option
                                value="${esc(
                                    organism.id
                                )}"
                            >
                                ${esc(
                                    organism.name
                                )}
                            </option>
                        `
                    )
                    .join('')}
            `;
        });
    }

    /*
     * ------------------------------------------------------------
     * MODALS
     * ------------------------------------------------------------
     */

    function closeModal(selector) {
        const modal =
            $(selector);

        if (!modal) {
            return;
        }

        modal.classList.remove('show');
        modal.classList.remove('is-open');

        modal.setAttribute(
            'aria-hidden',
            'true'
        );
    }

    function closeSettings() {
        closeModal(
            '#settingsModal'
        );
    }

    function closeOrganismDetail() {
        closeModal(
            '#organismDetailModal'
        );
    }

    function closeUniversalModal() {
        closeModal(
            '#microModal'
        );
    }

    function openSettings() {
        const modal =
            $('#settingsModal');

        if (!modal) {
            return;
        }

        modal.classList.add('show');
        modal.classList.add('is-open');

        modal.removeAttribute(
            'hidden'
        );

        modal.setAttribute(
            'aria-hidden',
            'false'
        );
    }

    /*
     * ------------------------------------------------------------
     * DATA MANAGEMENT
     * ------------------------------------------------------------
     */

    function exportData() {
        const copy =
            JSON.parse(
                JSON.stringify(state)
            );

        delete copy.exam;

        const blob =
            new Blob(
                [
                    JSON.stringify(
                        copy,
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

        const link =
            document.createElement(
                'a'
            );

        link.href = url;

        link.download =
            'microbiology-study-data-' +
            today() +
            '.json';

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        URL.revokeObjectURL(
            url
        );

        toast(
            'Data exported',
            'success'
        );
    }

    function importData() {
        const input =
            document.createElement(
                'input'
            );

        input.type = 'file';

        input.accept =
            '.json,application/json';

        input.onchange = () => {
            const file =
                input.files?.[0];

            if (!file) {
                return;
            }

            const reader =
                new FileReader();

            reader.onload = () => {
                try {
                    const imported =
                        JSON.parse(
                            reader.result
                        );

                    if (
                        !imported ||
                        typeof imported !==
                            'object'
                    ) {
                        throw new Error(
                            'Invalid data'
                        );
                    }

                    state =
                        Object.assign(
                            state,
                            imported
                        );

                    save();

                    renderAll();

                    toast(
                        'Data imported',
                        'success'
                    );

                } catch (error) {
                    console.error(
                        '[MICROBIOLOGY] Import failed:',
                        error
                    );

                    toast(
                        'Invalid data file',
                        'error'
                    );
                }
            };

            reader.readAsText(
                file
            );
        };

        input.click();
    }

    function resetData() {
        if (
            !window.confirm(
                'Reset Microbiology study data?'
            )
        ) {
            return;
        }

        state = {
            version: 2,

            progress: {
                topics: 0,
                organisms: 0,
                questions: 0,
                correct: 0,
                exams: 0,
                streak: 0,
                byGroup: {}
            },

            studied: {},
            bookmarks: [],
            notes: [],
            flashcards: [],
            review: [],
            activity: [],
            knowledge: [],
            planner: [],

            settings: {
                theme: 'light'
            },

            exam: null,
            questionIndex: 0
        };

        current.note = null;

        save();

        renderAll();

        toast(
            'Microbiology data reset',
            'success'
        );
    }

    function applyTheme() {
        const theme =
            state.settings.theme ||
            'light';

        document.documentElement.dataset.theme =
            theme;

        document.body.classList.toggle(
            'dark-theme',
            theme === 'dark'
        );
    }

    /*
     * ------------------------------------------------------------
     * ACTION ROUTER
     * ------------------------------------------------------------
     *
     * This is intentionally based on the ORIGINAL working
     * Microbiology action system rather than the previous
     * replacement handleClick.
     */

    function action(
        actionName,
        element
    ) {
        const id =
            element?.dataset?.id;

        const name =
            element?.dataset?.name;

        switch (actionName) {

            case 'open-organism':
                openOrganism(id);
                break;

            case 'open-disease':
                openDisease(id);
                break;

            case 'open-antibiotic':
                openAntibiotic(id);
                break;

            case 'bookmark-organism': {

                if (
                    !state.bookmarks.includes(
                        id
                    )
                ) {
                    state.bookmarks.push(
                        id
                    );
                } else {
                    state.bookmarks =
                        state.bookmarks.filter(
                            item =>
                                item !== id
                        );
                }

                save();

                openOrganism(id);

                break;
            }

            case 'answer-question':
                answerQuestion(
                    element.dataset.index
                );
                break;

            case 'next-question':
                nextQuestion();
                break;

            case 'flip-card':
            case 'flip-flashcard':
                flipCard();
                break;

            case 'card-again':
            case 'flashcard-again':
                rateCard('again');
                break;

            case 'card-hard':
            case 'flashcard-hard':
                rateCard('hard');
                break;

            case 'card-good':
            case 'flashcard-good':
                rateCard('good');
                break;

            case 'card-easy':
            case 'flashcard-easy':
                rateCard('easy');
                break;

            case 'spotter-reveal':
            case 'reveal-spotter':
                revealSpotter();
                break;

            case 'spotter-next':
            case 'next-spotter':
                renderSpotter();
                break;

            case 'case-answer':
                caseAnswer(
                    element.dataset.index
                );
                break;

            case 'next-case':
                renderCase();
                break;

            case 'start-exam':
                startExam();
                break;

            case 'exam-answer':
                examAnswer(
                    element.dataset.index
                );
                break;

            case 'save-note':
            case 'save-micro-note':
                saveNote();
                break;

            case 'delete-note':
            case 'delete-micro-note':
                deleteNote();
                break;

            case 'open-note':
                openNote(id);
                break;

            case 'create-note':
            case 'create-micro-note':
                createNote();
                break;

            case 'attach-pdf':
            case 'attach-micro-pdf':
                attachCurrentPDF();
                break;

            case 'open-pdf':
                openPDF(id);
                break;

            case 'close-pdf':
                closePDF();
                break;

            case 'delete-pdf':

                deletePDF(id)
                    .then(() => {

                        if (
                            current.note
                        ) {
                            current.note.attachments =
                                (
                                    current.note.attachments ||
                                    []
                                ).filter(
                                    item =>
                                        item.id !==
                                        id
                                );

                            save();

                            renderNoteAttachments(
                                current.note
                            );

                            renderNotes();
                        }

                        toast(
                            'PDF deleted',
                            'success'
                        );

                    })
                    .catch(error => {

                        console.error(
                            '[MICROBIOLOGY PDF] Delete failed:',
                            error
                        );

                        toast(
                            'Failed to delete PDF.',
                            'error'
                        );
                    });

                break;

            case 'open-notes':
                showView('study');
                break;

            case 'send-ai':
                sendAI();
                break;

            case 'clear-ai':
                current.aiMessages = [];
                renderAI();
                break;

            case 'copy-ai':
                copyAI();
                break;

            case 'save-ai':
                saveAI();
                break;

            case 'algorithm': {

                const flow =
                    $('#algorithmFlow');

                if (flow) {
                    flow.innerHTML =
                        (
                            algorithms[
                                name
                            ] || []
                        )
                            .map(
                                (
                                    step,
                                    index
                                ) => `
                                    <div class="algorithm-step">
                                        <span>
                                            ${index + 1}
                                        </span>

                                        ${esc(step)}
                                    </div>
                                `
                            )
                            .join('');
                }

                break;
            }

            case 'planner-check': {

                const plannerItem =
                    state.planner.find(
                        item =>
                            item.id === id
                    );

                if (
                    plannerItem
                ) {
                    plannerItem.done =
                        !!element.checked;

                    save();
                }

                break;
            }

            case 'topic':

                if (name) {
                    state.progress.topics =
                        Math.max(
                            state.progress.topics || 0,
                            1
                        );

                    save();

                    toast(
                        'Topic selected: ' +
                        name,
                        'success'
                    );

                    showView(
                        'learn'
                    );
                }

                break;

            case 'review-item':
                toast(
                    'Review item selected'
                );
                break;

            case 'continue-study':
                showView(
                    'study'
                );
                break;

            case 'high-yield':
                showView(
                    'study'
                );
                break;

            case 'organisms':
                showView(
                    'explore'
                );
                break;

            case 'cases':
                showView(
                    'practice'
                );
                break;

            case 'questions':
                showView(
                    'practice'
                );
                break;

            case 'spotters':
                showView(
                    'practice'
                );
                break;

            case 'flashcards':
                showView(
                    'practice'
                );
                break;

            case 'laboratory':
                showView(
                    'practice'
                );
                break;

            case 'antibiotics':
                showView(
                    'explore'
                );
                break;

            default:
                console.debug(
                    '[MICROBIOLOGY] Unhandled action:',
                    actionName
                );
        }
    }

    /*
     * ------------------------------------------------------------
     * SINGLE DELEGATED CLICK HANDLER
     * ------------------------------------------------------------
     */

    function handleDocumentClick(event) {
        if (destroyed) {
            return;
        }

        /*
         * ACTION BUTTON
         */

        const actionElement =
            event.target.closest(
                '[data-action]'
            );

        if (
            actionElement &&
            document.body.contains(
                actionElement
            )
        ) {
            /*
             * Do NOT preventDefault for checkboxes.
             */

            if (
                actionElement.tagName !==
                    'INPUT' ||
                actionElement.type !==
                    'checkbox'
            ) {
                event.preventDefault();
            }

            event.stopPropagation();

            action(
                actionElement.dataset.action,
                actionElement
            );

            return;
        }

        /*
         * SECTION NAVIGATION
         */

        const navigationElement =
            event.target.closest(
                '[data-section]'
            );

        if (
            navigationElement &&
            document.body.contains(
                navigationElement
            )
        ) {
            event.preventDefault();

            showView(
                navigationElement.dataset.section
            );

            return;
        }
    }

    /*
     * ------------------------------------------------------------
     * BIND EVENTS
     * ------------------------------------------------------------
     */

    function bind() {
        if (bound) {
            return;
        }

        bound = true;

        document.addEventListener(
            'click',
            handleDocumentClick
        );

        /*
         * GLOBAL SEARCH
         */

        const globalSearch =
            $('#globalSearch');

        if (globalSearch) {
            globalSearch.addEventListener(
                'input',
                event =>
                    renderSearchResults(
                        event.target.value
                    )
            );
        }

        /*
         * ORGANISM SEARCH
         */

        const organismSearch =
            $('#organismSearch');

        if (organismSearch) {
            organismSearch.addEventListener(
                'input',
                event => {

                    const query =
                        norm(
                            event.target.value
                        );

                    const filtered =
                        organisms.filter(
                            organism =>
                                norm(
                                    organism.name +
                                    ' ' +
                                    organism.group +
                                    ' ' +
                                    organism.diseases.join(
                                        ' '
                                    )
                                ).includes(
                                    query
                                )
                        );

                    renderOrganisms(
                        filtered
                    );
                }
            );
        }

        /*
         * DISEASE SEARCH
         */

        const diseaseSearch =
            $('#diseaseSearch');

        if (diseaseSearch) {
            diseaseSearch.addEventListener(
                'input',
                event => {

                    const query =
                        norm(
                            event.target.value
                        );

                    renderDiseases(
                        diseases.filter(
                            disease =>
                                norm(
                                    disease.name +
                                    ' ' +
                                    disease.summary
                                ).includes(
                                    query
                                )
                        )
                    );
                }
            );
        }

        /*
         * ANTIBIOTIC SEARCH
         */

        const antibioticSearch =
            $('#antibioticSearch');

        if (antibioticSearch) {
            antibioticSearch.addEventListener(
                'input',
                event => {

                    const query =
                        norm(
                            event.target.value
                        );

                    renderAntibiotics(
                        antibiotics.filter(
                            antibiotic =>
                                norm(
                                    antibiotic.name +
                                    ' ' +
                                    antibiotic.class
                                ).includes(
                                    query
                                )
                        )
                    );
                }
            );
        }

        /*
         * ORGANISM FILTERS
         */

        [
            'organismGramFilter',
            'organismShapeFilter',
            'organismOxygenFilter',
            'organismClinicalFilter',
            'organismTaxonomyFilter'
        ].forEach(id => {

            const element =
                $('#' + id);

            if (!element) {
                return;
            }

            element.addEventListener(
                'change',
                applyOrganismFilters
            );
        });

        /*
         * COMPARISON
         */

        [
            'comparisonOrganismA',
            'comparisonOrganismB'
        ].forEach(id => {

            const element =
                $('#' + id);

            if (element) {
                element.addEventListener(
                    'change',
                    compare
                );
            }
        });

        /*
         * AI
         */

        $('#aiSend')?.addEventListener(
            'click',
            sendAI
        );

        $('#aiInput')?.addEventListener(
            'keydown',
            event => {

                if (
                    event.key ===
                        'Enter' &&
                    !event.shiftKey
                ) {
                    event.preventDefault();

                    sendAI();
                }
            }
        );

        $('#aiClear')?.addEventListener(
            'click',
            () => {
                current.aiMessages = [];
                renderAI();
            }
        );

        $('#aiCopy')?.addEventListener(
            'click',
            copyAI
        );

        $('#aiSave')?.addEventListener(
            'click',
            saveAI
        );

        /*
         * NOTES
         */

        $('#createMicroNote')
            ?.addEventListener(
                'click',
                createNote
            );

        $('#saveMicroNote')
            ?.addEventListener(
                'click',
                saveNote
            );

        $('#deleteMicroNote')
            ?.addEventListener(
                'click',
                deleteNote
            );

        $('#attachPdfButton')
            ?.addEventListener(
                'click',
                attachCurrentPDF
            );

        /*
         * MODALS
         */

        $('#closeOrganismDetail')
            ?.addEventListener(
                'click',
                closeOrganismDetail
            );

        $('#microModalClose')
            ?.addEventListener(
                'click',
                closeUniversalModal
            );

        /*
         * THEME
         */

        $('#themeToggle')
            ?.addEventListener(
                'click',
                () => {

                    state.settings.theme =
                        state.settings.theme ===
                            'dark'
                            ? 'light'
                            : 'dark';

                    applyTheme();

                    save();
                }
            );

        /*
         * SETTINGS
         */

        $('#settingsButton')
            ?.addEventListener(
                'click',
                openSettings
            );

        $('#exportMicrobiologyData')
            ?.addEventListener(
                'click',
                exportData
            );

        $('#importMicrobiologyData')
            ?.addEventListener(
                'click',
                importData
            );

        $('#resetMicrobiologyData')
            ?.addEventListener(
                'click',
                resetData
            );

        /*
         * CONTINUE STUDY
         */

        $('#continueStudyButton')
            ?.addEventListener(
                'click',
                () =>
                    showView(
                        'study'
                    )
            );

        /*
         * LEGACY DIRECT BUTTON IDS
         *
         * These are kept because some versions of
         * index.html use IDs rather than data-action.
         */

        $('#nextQuestion')
            ?.addEventListener(
                'click',
                nextQuestion
            );

        $('#spotterReveal')
            ?.addEventListener(
                'click',
                revealSpotter
            );

        $('#spotterNext')
            ?.addEventListener(
                'click',
                renderSpotter
            );

        $('#startExamButton')
            ?.addEventListener(
                'click',
                startExam
            );

        /*
         * AI QUICK PROMPTS
         */

        $$('[data-ai-prompt]')
            .forEach(
                button => {

                    button.addEventListener(
                        'click',
                        () => {

                            const input =
                                $('#aiInput');

                            if (input) {
                                input.value =
                                    button.dataset.aiPrompt ||
                                    button.textContent ||
                                    '';

                                input.focus();
                            }

                            showView(
                                'ai'
                            );
                        }
                    );
                }
            );
    }

    /*
     * ------------------------------------------------------------
     * ORGANISM FILTERING
     * ------------------------------------------------------------
     */

    function applyOrganismFilters() {
        const gram =
            norm(
                $('#organismGramFilter')
                    ?.value
            );

        const shape =
            norm(
                $('#organismShapeFilter')
                    ?.value
            );

        const oxygen =
            norm(
                $('#organismOxygenFilter')
                    ?.value
            );

        const clinical =
            norm(
                $('#organismClinicalFilter')
                    ?.value
            );

        const taxonomy =
            norm(
                $('#organismTaxonomyFilter')
                    ?.value
            );

        const filtered =
            organisms.filter(
                organism => {

                    if (
                        gram &&
                        norm(
                            organism.gram
                        ) !== gram
                    ) {
                        return false;
                    }

                    if (
                        shape &&
                        norm(
                            organism.shape
                        ) !== shape
                    ) {
                        return false;
                    }

                    if (
                        oxygen &&
                        norm(
                            organism.oxygen
                        ) !== oxygen
                    ) {
                        return false;
                    }

                    if (
                        taxonomy &&
                        norm(
                            organism.group
                        ) !== taxonomy
                    ) {
                        return false;
                    }

                    if (
                        clinical &&
                        !organism.diseases.some(
                            disease =>
                                norm(
                                    disease
                                ).includes(
                                    clinical
                                )
                        )
                    ) {
                        return false;
                    }

                    return true;
                }
            );

        renderOrganisms(
            filtered
        );
    }

    /*
     * ------------------------------------------------------------
     * RENDER EVERYTHING
     * ------------------------------------------------------------
     */

    function renderAll() {
        applyTheme();

        renderStats();

        renderDashboard();

        renderExplore();

        renderPractice();

        renderStudy();

        renderAI();

        setupComparison();
    }

    /*
     * ------------------------------------------------------------
     * LIFECYCLE
     * ------------------------------------------------------------
     */

    function destroy() {
        if (destroyed) {
            return;
        }

        destroyed = true;

        document.removeEventListener(
            'click',
            handleDocumentClick
        );

        bound = false;

        if (examTimer) {
            clearInterval(
                examTimer
            );

            examTimer = null;
        }

        try {
            closePDF();
        } catch (_) {}

        try {
            if (
                window.microbiologyPdfViewer &&
                typeof
                    window.microbiologyPdfViewer.destroy ===
                    'function'
            ) {
                window.microbiologyPdfViewer.destroy();
            }
        } catch (error) {
            console.warn(
                '[MICROBIOLOGY] PDF viewer cleanup failed:',
                error
            );
        }

        try {
            delete window
                .__Y3_004_MICROBIOLOGY_MODULE__;
        } catch (_) {
            window
                .__Y3_004_MICROBIOLOGY_MODULE__ =
                null;
        }

        console.log(
            '[MICROBIOLOGY] Module destroyed.'
        );
    }

    function init() {
        if (
            initialized ||
            destroyed
        ) {
            return;
        }

        initialized = true;

        load();

        bind();

        renderAll();

        showView('home');

        /*
         * Exam timer.
         */

        examTimer =
            setInterval(
                () => {

                    if (
                        current.exam
                    ) {
                        renderExam();
                    }

                },
                1000
            );

        /*
         * Public lifecycle API.
         */

        MODULE.destroy =
            destroy;

        MODULE.showView =
            showView;

        MODULE.openPDF =
            openPDF;

        MODULE.closePDF =
            closePDF;

        MODULE.state =
            state;

        MODULE.organisms =
            organisms;

        MODULE.diseases =
            diseases;

        MODULE.antibiotics =
            antibiotics;

        MODULE.notes =
            state.notes;

        console.info(
            '[MICROBIOLOGY] Module initialized'
        );
    }

    /*
     * ------------------------------------------------------------
     * START
     * ------------------------------------------------------------
     */

    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            init,
            { once: true }
        );
    } else {
        init();
    }

})();
