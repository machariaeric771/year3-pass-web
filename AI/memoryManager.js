'use strict';

class MemoryManager {
  constructor(limit = 20) { this.limit = limit; this.sessions = new Map(); }
  get(sessionId = 'default') { return [...(this.sessions.get(sessionId) || [])]; }
  add(sessionId = 'default', message) {
    const history = this.sessions.get(sessionId) || [];
    history.push(message);
    this.sessions.set(sessionId, history.slice(-this.limit));
  }
  clear(sessionId = 'default') { this.sessions.delete(sessionId); }
}
module.exports = MemoryManager;
