const test = require('node:test');
const assert = require('node:assert/strict');
const { request } = require('../api-client.js');

test('network failures become recoverable results without exposing credentials', async () => {
  const result = await request('/api/sync', { method: 'POST' }, async () => {
    throw new Error('sensitive upstream exception');
  });
  assert.equal(result.response.ok, false);
  assert.equal(result.response.status, 0);
  assert.match(result.payload.detail, /connection/i);
  assert.doesNotMatch(result.payload.detail, /sensitive/);
});

test('retains request headers, status and JSON without replacing caller options', async () => {
  let seen;
  const result = await request('/api/example', { method: 'POST', headers: { 'X-Example': 'yes' } }, async (url, options) => {
    seen = { url, options };
    return { ok: false, status: 401, json: async () => ({ detail: 'Reconnect' }) };
  });
  assert.equal(seen.options.credentials, 'same-origin');
  assert.equal(seen.options.headers['Content-Type'], 'application/json');
  assert.equal(seen.options.headers['X-Example'], 'yes');
  assert.equal(result.response.status, 401);
  assert.equal(result.payload.detail, 'Reconnect');
});

test('invalid JSON remains a recoverable result', async () => {
  const result = await request('/api/sync', {}, async () => ({ ok: false, status: 502, json: async () => { throw new Error(); } }));
  assert.deepEqual(result.payload, {});
});
