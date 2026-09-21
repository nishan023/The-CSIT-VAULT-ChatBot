const { GoogleGenAI } = require('@google/genai');
const { createHash } = require('node:crypto');
const { getGeminiConfig } = require('../config');
const { logger } = require('../utils/logger');

const SYSTEM_INSTRUCTION = `You are The CSIT Vault AI Assistant, an educational guide for The CSIT Vault, created by Nishan Dhakal. Help BSc. CSIT students with TU curriculum topics, programming, algorithms, databases, networks, lab work and exam preparation.
Explain concepts clearly, use short sections and examples, and format code in fenced Markdown blocks with a language. Ask for the semester or syllabus version when needed. Do not invent official syllabus details, past questions, links or platform resources. You do not have access to a live library of platform documents. Encourage understanding and be honest about uncertainty.`;

class ChatServiceError extends Error {
  constructor(code, status, message, retryable = false) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

function configured(key) {
  return Boolean(key) && !/your_|placeholder|replace_me/i.test(key);
}

function classifyError(error) {
  const status = error.status || error.response?.status;
  const message = String(error.message || error.response?.data?.error?.message || '');

  if (/leaked|revoked/i.test(message)) {
    return new ChatServiceError('API_KEY_REVOKED', 503, 'The study assistant is temporarily unavailable. The site owner needs to update its AI connection.');
  }
  if (status === 401 || status === 403 || /API.?key|API_KEY_INVALID/i.test(message)) {
    return new ChatServiceError('API_KEY_INVALID', 503, 'The study assistant is temporarily unavailable. The site owner needs to check its AI connection.');
  }
  if (status === 429) {
    return new ChatServiceError('RATE_LIMITED', 429, 'The assistant has reached its usage limit. Please try again later.', true);
  }
  if (status === 404 || /not found|no longer available/i.test(message)) {
    return new ChatServiceError('MODEL_UNAVAILABLE', 503, 'The study assistant needs a model configuration update. Please try again later.');
  }
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ChatServiceError('AI_TIMEOUT', 504, 'The assistant took too long to respond. Please try again.', true);
  }
  if (status === 503 || /high demand|unavailable/i.test(message)) {
    return new ChatServiceError('AI_BUSY', 503, 'The AI model is experiencing high demand. Please try again in a moment.', true);
  }
  return new ChatServiceError('AI_REQUEST_FAILED', 502, 'The assistant could not process this question. Please rephrase it and try again.');
}

function createGeminiService({ getConfig = getGeminiConfig, log = logger } = {}) {
  let fingerprint;
  let blockedError;
  let state = 'not_checked';
  let aiClient = null;

  function readConfig() {
    const config = getConfig();
    const nextFingerprint = createHash('sha256').update(`${config.apiKey}:${config.model}`).digest('hex');
    if (nextFingerprint !== fingerprint) {
      fingerprint = nextFingerprint;
      blockedError = null;
      state = 'not_checked';
      aiClient = configured(config.apiKey) ? new GoogleGenAI({ apiKey: config.apiKey }) : null;
    }
    return config;
  }

  function getStatus() {
    const { apiKey } = readConfig();
    return { apiKeyConfigured: configured(apiKey), aiStatus: configured(apiKey) ? state : 'not_configured' };
  }

  async function getGeminiResponse(prompt, history = []) {
    const { apiKey, model } = readConfig();
    if (!configured(apiKey)) {
      throw new ChatServiceError('API_KEY_MISSING', 503, 'The study assistant is being set up. Please check back soon.');
    }
    if (blockedError) throw blockedError;
    if (!aiClient) {
      aiClient = new GoogleGenAI({ apiKey });
    }

    const contents = history.slice(-10).map(({ role, text }) => ({
      role: role === 'assistant' ? 'model' : 'user',
      parts: [{ text }]
    }));
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const modelsToTry = [model, 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest'].filter((m, i, arr) => m && arr.indexOf(m) === i);

    let lastError = null;
    for (const currentModel of modelsToTry) {
      try {
        const response = await aiClient.models.generateContent({
          model: currentModel,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            maxOutputTokens: 4096,
          }
        });

        const reply = response.text ? response.text.trim() : '';
        if (!reply) {
          throw new ChatServiceError('EMPTY_RESPONSE', 502, 'No answer came back. Please try rephrasing your question.', true);
        }

        state = 'ready';
        return reply;
      } catch (error) {
        lastError = error;
        const safeError = error instanceof ChatServiceError ? error : classifyError(error);
        if (['API_KEY_REVOKED', 'API_KEY_INVALID'].includes(safeError.code)) {
          blockedError = safeError;
          state = 'unavailable';
          log.error(`${safeError.code}: Check GEMINI_API_KEY in server environment.`);
          throw safeError;
        }
        // If it's a 404/503 for a specific model, try the next fallback model in the list
        log.warn(`Model ${currentModel} failed (${safeError.code}). Trying fallback if available...`);
      }
    }

    const safeError = classifyError(lastError);
    state = safeError.code === 'MODEL_UNAVAILABLE' ? 'unavailable' : 'degraded';
    log.warn(`All Gemini models failed: ${safeError.code}`);
    throw safeError;
  }

  return { getGeminiResponse, getStatus };
}

module.exports = { ...createGeminiService(), createGeminiService, ChatServiceError };
