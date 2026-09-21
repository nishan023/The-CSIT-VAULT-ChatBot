const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGeminiService } = require('../services/geminiService');

const ok = { data: { candidates: [{ content: { parts: [{ text: 'First' }, { text: 'Hidden', thought: true }, { text: 'Second' }] } }] } };
function upstream(status, message, details) {
  return { response: { status, data: { error: { message, details } } } };
}
function setup(handler, initial = {}) {
  const config = { apiKey: 'test-credential', model: 'gemini-3.6-flash', ...initial };
  const calls = [];
  const logs = [];
  const service = createGeminiService({
    getConfig: () => config,
    client: { post: async (...args) => { calls.push(args); return handler(...args); } },
    log: { error: value => logs.push(value), warn: value => logs.push(value) }
  });
  return { ...service, config, calls, logs };
}

test('uses the key header, sends history and combines visible response parts', async () => {
  const service = setup(() => ok);
  assert.deepEqual(service.getStatus(), { apiKeyConfigured: true, aiStatus: 'not_checked' });
  const reply = await service.getGeminiResponse('Next', [{ role: 'user', text: 'Hello' }, { role: 'model', text: 'Hi' }]);
  assert.equal(reply, 'First\nSecond');
  assert.equal(service.calls[0][0].includes('test-credential'), false);
  assert.equal(service.calls[0][2].headers['x-goog-api-key'], 'test-credential');
  assert.deepEqual(service.calls[0][1].contents.map(item => item.role), ['user', 'model', 'user']);
  assert.equal(service.getStatus().aiStatus, 'ready');
});

test('revoked key returns 503, is not retried, and recovers after key rotation', async () => {
  const service = setup(() => {
    if (service.config.apiKey === 'replacement') return ok;
    throw upstream(403, 'Your API key was reported as leaked. test-credential');
  });
  for (let i = 0; i < 3; i++) {
    await assert.rejects(service.getGeminiResponse('Hello'), error => error.code === 'API_KEY_REVOKED' && error.status === 503 && !error.retryable && !error.message.includes('test-credential'));
  }
  assert.equal(service.calls.length, 1);
  assert.equal(service.logs.length, 1);
  assert.equal(service.logs.join('').includes('test-credential'), false);
  assert.equal(service.getStatus().aiStatus, 'unavailable');
  service.config.apiKey = 'replacement';
  assert.equal(await service.getGeminiResponse('Hello'), 'First\nSecond');
  assert.equal(service.getStatus().aiStatus, 'ready');
});

for (const [name, error, code, status, retryable] of [
  ['invalid key', upstream(400, 'API key not valid'), 'API_KEY_INVALID', 503, false],
  ['invalid key reason', upstream(400, 'Invalid argument', [{ reason: 'API_KEY_INVALID' }]), 'API_KEY_INVALID', 503, false],
  ['permission denied', upstream(403, 'Permission denied'), 'API_KEY_INVALID', 503, false],
  ['quota', upstream(429, 'Quota exceeded'), 'RATE_LIMITED', 429, true],
  ['unknown model', upstream(404, 'Model not found'), 'MODEL_UNAVAILABLE', 503, false],
  ['timeout', { code: 'ECONNABORTED' }, 'AI_TIMEOUT', 504, true],
  ['network failure', { code: 'ENOTFOUND' }, 'AI_UNAVAILABLE', 503, true],
  ['provider outage', upstream(503, 'Unavailable'), 'AI_UNAVAILABLE', 503, true],
  ['bad provider request', upstream(400, 'Invalid request'), 'AI_REQUEST_FAILED', 502, false]
]) {
  test(name + ' has a safe, specific error without model retry loops', async () => {
    const service = setup(() => { throw error; });
    await assert.rejects(service.getGeminiResponse('Hello'), result => result.code === code && result.status === status && result.retryable === retryable);
    assert.equal(service.calls.length, 1);
  });
}

test('missing or placeholder key never reaches Google', async () => {
  for (const apiKey of ['', 'your_gemini_api_key_here']) {
    const service = setup(() => ok, { apiKey });
    await assert.rejects(service.getGeminiResponse('Hello'), { code: 'API_KEY_MISSING', status: 503 });
    assert.equal(service.calls.length, 0);
    assert.equal(service.getStatus().aiStatus, 'not_configured');
  }
});

test('empty and safety-blocked responses are not successful answers', async () => {
  const empty = setup(() => ({ data: {} }));
  await assert.rejects(empty.getGeminiResponse('Hello'), { code: 'EMPTY_RESPONSE', status: 502 });
  const blocked = setup(() => ({ data: { promptFeedback: { blockReason: 'SAFETY' } } }));
  await assert.rejects(blocked.getGeminiResponse('Hello'), { code: 'RESPONSE_BLOCKED', status: 422 });
});

test('transient failures can recover on a later explicit request', async () => {
  let attempts = 0;
  const service = setup(() => { if (!attempts++) throw upstream(503, 'Unavailable'); return ok; });
  await assert.rejects(service.getGeminiResponse('Hello'));
  assert.equal(service.getStatus().aiStatus, 'degraded');
  assert.equal(await service.getGeminiResponse('Hello'), 'First\nSecond');
});

