'use strict';

class RateLimitManager {
  constructor({ minIntervalMs = 250 } = {}) { this.minIntervalMs = minIntervalMs; this.lastRequest = 0; }
  async wait() {
    const delay = Math.max(0, this.minIntervalMs - (Date.now() - this.lastRequest));
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    this.lastRequest = Date.now();
  }
}
module.exports = RateLimitManager;
