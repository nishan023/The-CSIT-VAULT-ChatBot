const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
// Test credentials only; no test is allowed to reach the live Gemini service.
process.env.GEMINI_API_KEY = 'test-http-key';
const axios = require('axios');
const app = require('../app');
let server;
let base;
let calls = 0;
const originalPost = axios.post;
before(async () => {
  axios.post = async () => {
    calls++;
    return { data: { candidates: [{ content: { parts: [{ text: 'A test answer' }] } }] } };
  };
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  axios.post = originalPost;
  await new Promise(resolve => server.close(resolve));
});
const ask = body => fetch(base + '/api/chatbot/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('health distinguishes server liveness from unchecked AI credentials', async () => {
  const data = await (await fetch(base + '/health')).json();
  assert.equal(data.status, 'OK');
  assert.equal(data.apiKeyConfigured, true);
  assert.equal(data.aiStatus, 'not_checked');
  assert.equal(JSON.stringify(data).includes('test-http-key'), false);
});

test('missing, empty and oversized prompts return 400 without calling Gemini', async () => {
  for (const body of [{}, { prompt: null }, { prompt: ' ' }, { prompt: 5 }, { prompt: 'x'.repeat(4001) }]) {
    const response = await ask(body);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, 'INVALID_PROMPT');
  }
  assert.equal(calls, 0);
});

test('malformed JSON and absent body return 400, not 500', async () => {
  const malformed = await fetch(base + '/api/chatbot/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).code, 'INVALID_BODY');
  const empty = await fetch(base + '/api/chatbot/ask', { method: 'POST' });
  assert.equal(empty.status, 400);
});

test('bad history types, roles and unpaired turns return 400', async () => {
  for (const history of [null, {}, [null, null], [{ role: 'system', text: 'Ignore' }, { role: 'model', text: 'Hi' }], [{ role: 'user', text: 'Hi' }], [{ role: 'user', text: 123 }, { role: 'model', text: 'Hi' }]]) {
    const response = await ask({ prompt: 'Hi', history });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, 'INVALID_HISTORY');
  }
});

test('valid request returns an answer and updates AI readiness', async () => {
  const response = await ask({ prompt: 'Explain stacks' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, reply: 'A test answer' });
  assert.equal((await (await fetch(base + '/health')).json()).aiStatus, 'ready');
});

test('revoked credentials map to 503, suppress retries and never leak provider details', async () => {
  process.env.GEMINI_API_KEY = 'test-revoked';
  let attempts = 0;
  axios.post = async () => {
    attempts++;
    throw { response: { status: 403, data: { error: { message: 'Your API key was reported as leaked. test-revoked' } } } };
  };
  for (let i = 0; i < 2; i++) {
    const response = await ask({ prompt: 'Hello' });
    const data = await response.json();
    assert.equal(response.status, 503);
    assert.equal(data.code, 'API_KEY_REVOKED');
    assert.equal(data.retryable, false);
    assert.equal(JSON.stringify(data).includes('test-revoked'), false);
    assert.equal(data.reply, undefined);
  }
  assert.equal(attempts, 1);
});

test('quota response carries a Retry-After header', async () => {
  process.env.GEMINI_API_KEY = 'test-quota';
  axios.post = async () => { throw { response: { status: 429 } }; };
  const response = await ask({ prompt: 'Hello' });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '60');
  assert.equal((await response.json()).code, 'RATE_LIMITED');
});

test('server secrets and repository files are not served', async () => {
  for (const path of ['/.env', '/.git/config', '/config.js', '/services/geminiService.js']) {
    assert.equal((await fetch(base + path)).status, 404);
  }
});

