'use strict';

const config = require('../config');

class OpenRouterClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || config.baseUrl;
    this.apiKey = options.apiKey || process.env[config.apiKeyEnv];
    this.timeoutMs = options.timeoutMs || config.timeoutMs;
    this.appName = options.appName || config.appName;
    this.httpReferer = options.httpReferer || config.httpReferer;
  }

  isConfigured() { return Boolean(this.apiKey); }

  async chat(payload = {}) {
    if (!this.apiKey) throw new Error('OPENROUTER_API_KEY is not configured.');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': this.appName
    };
    if (this.httpReferer) headers['HTTP-Referer'] = this.httpReferer;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!response.ok) {
        const message = data?.error?.message || `OpenRouter HTTP ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        error.data = data;
        throw error;
      }
      return data;
    } finally { clearTimeout(timer); }
  }

  async complete({ model, messages, temperature = 0.2, maxTokens = 2048, reasoning, responseFormat, ...rest }) {
    const payload = { model, messages, temperature, max_tokens: maxTokens, ...rest };
    if (reasoning) payload.reasoning = reasoning;
    if (responseFormat) payload.response_format = responseFormat;
    return this.chat(payload);
  }
}

module.exports = OpenRouterClient;
