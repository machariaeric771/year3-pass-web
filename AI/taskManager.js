'use strict';

const TASKS = new Set(['assistant', 'explain', 'mcq', 'flashcards', 'essay', 'spotter']);
function validateTask(task) { if (!TASKS.has(task)) throw new Error(`Unknown AI task: ${task}`); return task; }
function listTasks() { return [...TASKS]; }
module.exports = { validateTask, listTasks };
