'use strict';

const fs = require('fs');
const path = require('path');

/*
 * ============================================================
 * YEAR 3 STUDY OS — MODULE MANAGER
 * ============================================================
 *
 * Responsibilities:
 *
 * 1. Discover modules inside /MODULES
 * 2. Read each module's index.html
 * 3. Read optional module metadata
 * 4. Return module information to UI/app.js
 * 5. Provide a consistent interface for every module
 *
 * The renderer accesses this through:
 *
 *     window.year3.modules.get(moduleId)
 *
 * The actual filesystem work happens here in the
 * Electron main process.
 * ============================================================
 */

const MODULES_ROOT = path.join(
    __dirname,
    '..',
    '..',
    'MODULES'
);


/*
 * ============================================================
 * INTERNAL HELPERS
 * ============================================================
 */

function ensureModulesDirectory() {

    if (!fs.existsSync(MODULES_ROOT)) {

        fs.mkdirSync(
            MODULES_ROOT,
            {
                recursive: true
            }
        );

    }
}


function isSafeModuleId(moduleId) {

    if (
        typeof moduleId !== 'string' ||
        !moduleId.trim()
    ) {
        return false;
    }

    /*
     * Module IDs are deliberately restricted.
     *
     * This prevents paths such as:
     *
     * ../../something
     *
     * from escaping the MODULES directory.
     */

    return /^[A-Za-z0-9_-]+$/.test(
        moduleId
    );
}


function getModuleDirectory(moduleId) {

    if (!isSafeModuleId(moduleId)) {

        throw new Error(
            `Invalid module ID: ${moduleId}`
        );

    }

    const moduleDirectory =
        path.join(
            MODULES_ROOT,
            moduleId
        );

    const normalizedRoot =
        path.resolve(
            MODULES_ROOT
        );

    const normalizedDirectory =
        path.resolve(
            moduleDirectory
        );

    if (
        normalizedDirectory !==
            normalizedRoot &&
        !normalizedDirectory.startsWith(
            normalizedRoot + path.sep
        )
    ) {

        throw new Error(
            'Module path escaped MODULES directory.'
        );

    }

    return moduleDirectory;
}


function readModuleFile(
    moduleId,
    filename
) {

    const moduleDirectory =
        getModuleDirectory(
            moduleId
        );

    const filePath =
        path.join(
            moduleDirectory,
            filename
        );

    if (
        !fs.existsSync(
            filePath
        )
    ) {
        return null;
    }

    return fs.readFileSync(
        filePath,
        'utf8'
    );
}


/*
 * ============================================================
 * MODULE METADATA
 * ============================================================
 *
 * A module can optionally contain:
 *
 *     module.json
 *
 * Example:
 *
 * {
 *     "id": "Y3-001-Notes",
 *     "name": "Notes",
 *     "description": "Medical study notes",
 *     "icon": "📝"
 * }
 *
 * If module.json does not exist, sensible defaults are used.
 * ============================================================
 */

function readModuleMetadata(
    moduleId
) {

    const metadataText =
        readModuleFile(
            moduleId,
            'module.json'
        );

    if (!metadataText) {

        return {};

    }

    try {

        const metadata =
            JSON.parse(
                metadataText
            );

        if (
            !metadata ||
            typeof metadata !== 'object' ||
            Array.isArray(metadata)
        ) {

            console.warn(
                `[MODULE MANAGER] Invalid metadata object: ${moduleId}`
            );

            return {};

        }

        return metadata;

    } catch (error) {

        console.error(
            `[MODULE MANAGER] Could not parse module.json for ${moduleId}:`,
            error
        );

        return {};
    }
}


/*
 * ============================================================
 * BUILD MODULE INFORMATION
 * ============================================================
 */

function buildModule(
    moduleId
) {

    const moduleDirectory =
        getModuleDirectory(
            moduleId
        );

    if (
        !fs.existsSync(
            moduleDirectory
        )
    ) {

        throw new Error(
            `Module directory does not exist: ${moduleId}`
        );

    }

    const indexPath =
        path.join(
            moduleDirectory,
            'index.html'
        );

    if (
        !fs.existsSync(
            indexPath
        )
    ) {

        throw new Error(
            `Module index.html not found: ${moduleId}`
        );

    }

    const html =
        fs.readFileSync(
            indexPath,
            'utf8'
        );

    const javascript =
        readModuleFile(
            moduleId,
            'module.js'
        );

    const metadata =
        readModuleMetadata(
            moduleId
        );

    return {

        id:
            moduleId,

        name:
            metadata.name ||
            moduleId,

        description:
            metadata.description ||
            'Year 3 Study OS module.',

        icon:
            metadata.icon ||
            '📚',

        version:
            metadata.version ||
            '1.0.0',

        category:
            metadata.category ||
            'study',

        enabled:
            metadata.enabled !== false,

        path:
            moduleDirectory,

        files: {

            index:
                indexPath,

            javascript:
                javascript
                    ? path.join(
                        moduleDirectory,
                        'module.js'
                    )
                    : null,

            metadata:
                fs.existsSync(
                    path.join(
                        moduleDirectory,
                        'module.json'
                    )
                )
                    ? path.join(
                        moduleDirectory,
                        'module.json'
                    )
                    : null
        },

        content: {

            html,

            javascript
        }

    };
}


/*
 * ============================================================
 * DISCOVER MODULES
 * ============================================================
 */

function discoverModules() {

    ensureModulesDirectory();

    const entries =
        fs.readdirSync(
            MODULES_ROOT,
            {
                withFileTypes: true
            }
        );

    const modules = [];

    for (
        const entry of entries
    ) {

        if (
            !entry.isDirectory()
        ) {
            continue;
        }

        const moduleId =
            entry.name;

        /*
         * Ignore folders that do not follow
         * the Year 3 module naming convention.
         */

        if (
            !moduleId.startsWith(
                'Y3-'
            )
        ) {
            continue;
        }

        try {

            const module =
                buildModule(
                    moduleId
                );

            if (
                module.enabled
            ) {

                modules.push(
                    module
                );

            }

        } catch (error) {

            console.warn(
                `[MODULE MANAGER] Skipping ${moduleId}:`,
                error.message
            );

        }
    }

    /*
     * Keep module ordering predictable.
     *
     * Y3-001
     * Y3-002
     * Y3-003
     * ...
     */

    modules.sort(
        (a, b) =>
            a.id.localeCompare(
                b.id,
                undefined,
                {
                    numeric: true
                }
            )
    );

    return modules;
}


/*
 * ============================================================
 * GET SINGLE MODULE
 * ============================================================
 */

function getModule(
    moduleId
) {

    if (!moduleId) {

        throw new Error(
            'A module ID is required.'
        );

    }

    return buildModule(
        moduleId
    );
}


/*
 * ============================================================
 * CHECK MODULE
 * ============================================================
 */

function hasModule(
    moduleId
) {

    if (
        !isSafeModuleId(
            moduleId
        )
    ) {

        return false;

    }

    const moduleDirectory =
        getModuleDirectory(
            moduleId
        );

    const indexPath =
        path.join(
            moduleDirectory,
            'index.html'
        );

    return fs.existsSync(
        indexPath
    );
}


/*
 * ============================================================
 * PUBLIC MODULE MANAGER
 * ============================================================
 */

const ModuleManager = {

    /*
     * Return every valid Year 3 module.
     */

    list() {

        return discoverModules();

    },


    /*
     * Return one specific module.
     */

    get(
        moduleId
    ) {

        return getModule(
            moduleId
        );

    },


    /*
     * Check whether a module exists.
     */

    has(
        moduleId
    ) {

        return hasModule(
            moduleId
        );

    },


    /*
     * Return the filesystem location
     * used by the module system.
     */

    getModulesRoot() {

        return MODULES_ROOT;

    },


    /*
     * Refresh module discovery.
     *
     * Modules are read from disk each time,
     * so newly created modules are detected
     * without restarting the application.
     */

    refresh() {

        return discoverModules();

    }

};


/*
 * ============================================================
 * EXPORT
 * ============================================================
 */

module.exports =
    ModuleManager;