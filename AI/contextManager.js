'use strict';

class ContextManager {

    constructor({
        maxCharacters = 30000
    } = {}) {

        this.maxCharacters =
            maxCharacters;
    }

    build({
        moduleId,
        moduleName,
        subject,
        topic,
        content,
        userInstruction
    } = {}) {

        const parts = [];

        /*
         * MODULE
         * Identifies exactly which Year 3 module
         * the student is currently using.
         */

        if (moduleId) {

            parts.push(
                `Module ID: ${String(moduleId)}`
            );
        }

        if (moduleName) {

            parts.push(
                `Module: ${String(moduleName)}`
            );
        }

        /*
         * SUBJECT
         * Identifies the academic subject.
         */

        if (subject) {

            parts.push(
                `Subject: ${String(subject)}`
            );
        }

        /*
         * TOPIC
         * Identifies the specific topic currently
         * being studied.
         */

        if (topic) {

            parts.push(
                `Current topic: ${String(topic)}`
            );
        }

        /*
         * STUDY MATERIAL
         * This will later contain notes, PDFs,
         * extracted document text, etc.
         */

        if (content) {

            parts.push(
                `Study context:\n${String(content)}`
            );
        }

        /*
         * USER INSTRUCTION
         * Optional additional instruction supplied
         * by the module or student.
         */

        if (userInstruction) {

            parts.push(
                `Student request context:\n${String(userInstruction)}`
            );
        }

        /*
         * Keep the context within the configured
         * character limit.
         */

        return parts
            .join('\n\n')
            .slice(0, this.maxCharacters);
    }
}

module.exports = ContextManager;