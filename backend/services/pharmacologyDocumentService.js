'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MODULE_ID = 'Y3-003-Pharmacology';

let DATA_ROOT = null;
let DOCUMENTS_ROOT = null;
let INDEX_FILE = null;

function ensureDirectory(directory) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, {
            recursive: true
        });
    }
}

function initialize(dataRoot) {

    DATA_ROOT = dataRoot;

    DOCUMENTS_ROOT = path.join(
        DATA_ROOT,
        'modules',
        MODULE_ID,
        'documents'
    );

    INDEX_FILE = path.join(
        DOCUMENTS_ROOT,
        'documents.json'
    );

    ensureDirectory(DOCUMENTS_ROOT);

    if (!fs.existsSync(INDEX_FILE)) {
        writeJson(INDEX_FILE, {
            version: 1,
            moduleId: MODULE_ID,
            documents: []
        });
    }

    console.log(
        '[PHARMACOLOGY DOCUMENTS] Initialized:',
        DOCUMENTS_ROOT
    );
}

function readJson(filePath, fallback = null) {

    try {

        if (!fs.existsSync(filePath)) {
            return fallback;
        }

        const raw =
            fs.readFileSync(
                filePath,
                'utf8'
            );

        return JSON.parse(raw);

    } catch (error) {

        console.error(
            '[PHARMACOLOGY DOCUMENTS] JSON read error:',
            error
        );

        return fallback;
    }
}

function writeJson(filePath, data) {

    ensureDirectory(
        path.dirname(filePath)
    );

    const temporaryFile =
        `${filePath}.tmp`;

    fs.writeFileSync(
        temporaryFile,
        JSON.stringify(
            data,
            null,
            2
        ),
        'utf8'
    );

    fs.renameSync(
        temporaryFile,
        filePath
    );
}

function getIndex() {

    const index =
        readJson(
            INDEX_FILE,
            {
                version: 1,
                moduleId: MODULE_ID,
                documents: []
            }
        );

    if (
        !index ||
        !Array.isArray(index.documents)
    ) {

        return {
            version: 1,
            moduleId: MODULE_ID,
            documents: []
        };
    }

    return index;
}

function saveIndex(index) {

    writeJson(
        INDEX_FILE,
        index
    );
}

function createDocumentId() {

    return [
        'pharm',
        Date.now().toString(36),
        crypto
            .randomBytes(6)
            .toString('hex')
    ].join('-');
}

function sanitizeFileName(name) {

    return String(name || 'document')
        .replace(
            /[^a-zA-Z0-9._-]/g,
            '_'
        )
        .replace(
            /_+/g,
            '_'
        )
        .replace(
            /^_+|_+$/g,
            ''
        );
}

function getDocumentFilePath(documentId) {

    return path.join(
        DOCUMENTS_ROOT,
        `${documentId}.json`
    );
}

function validatePdf(filePath) {

    if (
        typeof filePath !== 'string' ||
        !filePath.trim()
    ) {

        return {
            valid: false,
            message: 'No PDF file was selected.'
        };
    }

    const extension =
        path.extname(
            filePath
        ).toLowerCase();

    if (extension !== '.pdf') {

        return {
            valid: false,
            message: 'Only PDF documents are supported.'
        };
    }

    if (!fs.existsSync(filePath)) {

        return {
            valid: false,
            message: 'The selected PDF does not exist.'
        };
    }

    let stats;

    try {

        stats =
            fs.statSync(
                filePath
            );

    } catch (error) {

        return {
            valid: false,
            message: 'The selected PDF could not be read.'
        };
    }

    if (!stats.isFile()) {

        return {
            valid: false,
            message: 'The selected path is not a file.'
        };
    }

    if (stats.size <= 0) {

        return {
            valid: false,
            message: 'The selected PDF is empty.'
        };
    }

    return {
        valid: true,
        size: stats.size
    };
}

function importPdf(filePath) {

    const validation =
        validatePdf(
            filePath
        );

    if (!validation.valid) {

        return {
            success: false,
            message: validation.message
        };
    }

    try {

        const originalFileName =
            path.basename(
                filePath
            );

        const fileBuffer =
            fs.readFileSync(
                filePath
            );

        const base64 =
            fileBuffer.toString(
                'base64'
            );

        const documentId =
            createDocumentId();

        const now =
            new Date().toISOString();

        const documentFileName =
            `${documentId}.json`;

        const documentPath =
            getDocumentFilePath(
                documentId
            );

        /*
         * ======================================================
         * SELF-CONTAINED DOCUMENT PACKAGE
         * ======================================================
         *
         * The PDF itself is preserved as Base64.
         *
         * This means the JSON file contains the complete
         * original PDF and no longer depends on the original
         * location on the user's computer.
         */

        const documentPackage = {

            version: 1,

            id: documentId,

            moduleId: MODULE_ID,

            type: 'pharmacology-document',

            representation: 'json-pdf',

            title:
                path.basename(
                    originalFileName,
                    path.extname(
                        originalFileName
                    )
                ),

            originalFileName,

            originalExtension: '.pdf',

            mimeType: 'application/pdf',

            fileSize: fileBuffer.length,

            importedAt: now,

            updatedAt: now,

            status: 'ready',

            source: {

                originalPath: filePath,

                importedFrom: 'local-file'

            },

            pdf: {

                encoding: 'base64',

                data: base64

            },

            pages: [],

            pageCount: 0,

            viewer: {

                type: 'internal-pdf-viewer',

                ready: false

            }

        };

        /*
         * Save the complete document package.
         */

        writeJson(
            documentPath,
            documentPackage
        );

        /*
         * Update lightweight library index.
         */

        const index =
            getIndex();

        const indexEntry = {

            id: documentId,

            moduleId: MODULE_ID,

            title:
                documentPackage.title,

            originalFileName,

            originalFileType: 'pdf',

            mimeType: 'application/pdf',

            fileSize: fileBuffer.length,

            importedAt: now,

            updatedAt: now,

            status: 'ready',

            representation: 'json-pdf',

            storage: {

                file: documentFileName,

                representation: 'json',

                contains: 'base64-pdf'

            },

            pageCount: 0

        };

        index.documents.push(
            indexEntry
        );

        saveIndex(
            index
        );

        console.log(
            '[PHARMACOLOGY DOCUMENTS] PDF stored:',
            documentId
        );

        return {

            success: true,

            message:
                'PDF imported and stored as JSON.',

            document:
                indexEntry

        };

    } catch (error) {

        console.error(
            '[PHARMACOLOGY DOCUMENTS] Import error:',
            error
        );

        return {

            success: false,

            message:
                'The PDF could not be imported.',

            error:
                error.message

        };
    }
}

function listDocuments() {

    const index = getIndex();

    const validDocuments = [];
    const invalidDocuments = [];

    for (const document of index.documents) {

        if (
            !document ||
            typeof document.id !== 'string' ||
            !document.id.trim()
        ) {
            continue;
        }

        const documentPath =
            getDocumentFilePath(
                document.id
            );

        if (
            fs.existsSync(
                documentPath
            )
        ) {

            validDocuments.push(
                document
            );

        } else {

            invalidDocuments.push(
                document
            );

            console.warn(
                '[PHARMACOLOGY DOCUMENTS] Removing stale index entry:',
                document.id
            );
        }
    }

    /*
     * Automatically clean stale entries from
     * documents.json.
     */
    if (
        invalidDocuments.length > 0
    ) {

        index.documents =
            validDocuments;

        saveIndex(
            index
        );
    }

    return validDocuments
        .slice()
        .sort(
            (a, b) =>
                new Date(
                    b.importedAt
                ) -
                new Date(
                    a.importedAt
                )
        );
}


function getDocument(documentId) {

    if (
        typeof documentId !== 'string' ||
        !documentId.trim()
    ) {

        console.warn(
            '[PHARMACOLOGY DOCUMENTS] Invalid document ID:',
            documentId
        );

        return null;
    }

    const normalizedId =
        documentId.trim();

    const documentPath =
        getDocumentFilePath(
            normalizedId
        );

    console.log(
        '[PHARMACOLOGY DOCUMENTS] Opening:',
        normalizedId
    );

    console.log(
        '[PHARMACOLOGY DOCUMENTS] Path:',
        documentPath
    );

    if (
        !fs.existsSync(
            documentPath
        )
    ) {

        console.warn(
            '[PHARMACOLOGY DOCUMENTS] Document JSON not found:',
            normalizedId
        );

        return null;
    }

    const document =
        readJson(
            documentPath,
            null
        );

    if (!document) {

        console.warn(
            '[PHARMACOLOGY DOCUMENTS] Document JSON could not be parsed:',
            normalizedId
        );

        return null;
    }

    if (
        document.moduleId !== MODULE_ID
    ) {

        console.warn(
            '[PHARMACOLOGY DOCUMENTS] Module mismatch:',
            document.moduleId
        );

        return null;
    }

    if (
        !document.pdf ||
        document.pdf.encoding !== 'base64' ||
        typeof document.pdf.data !== 'string' ||
        !document.pdf.data.length
    ) {

        console.warn(
            '[PHARMACOLOGY DOCUMENTS] Document has no embedded PDF data:',
            normalizedId
        );

        return null;
    }

    console.log(
        '[PHARMACOLOGY DOCUMENTS] Document opened successfully:',
        normalizedId
    );

    return document;
}

function deleteDocument(documentId) {

    const documentPath =
        getDocumentFilePath(
            documentId
        );

    if (
        fs.existsSync(
            documentPath
        )
    ) {

        fs.unlinkSync(
            documentPath
        );
    }

    const index =
        getIndex();

    const before =
        index.documents.length;

    index.documents =
        index.documents.filter(
            document =>
                document.id !==
                documentId
        );

    if (
        index.documents.length !==
        before
    ) {

        saveIndex(
            index
        );

        return {
            success: true
        };
    }

    return {
        success: false,
        message: 'Document not found.'
    };
}

function getStorageInfo() {

    return {

        moduleId: MODULE_ID,

        documentsRoot:
            DOCUMENTS_ROOT,

        indexFile:
            INDEX_FILE,

        initialized:
            Boolean(DOCUMENTS_ROOT)

    };
}

module.exports = {

    initialize,

    importPdf,

    listDocuments,

    getDocument,

    deleteDocument,

    getStorageInfo

};