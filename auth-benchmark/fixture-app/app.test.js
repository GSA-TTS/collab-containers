'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { server, MAX_UPLOAD_BYTES } = require('./app');

let base;
let port;

test.before(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
  base = `http://127.0.0.1:${port}`;
});

test.after(() => new Promise(resolve => server.close(resolve)));

test('credential headers and cookie values are never reflected', async () => {
  const res = await fetch(`${base}/headers`, {
    headers: { Authorization: 'Bearer SECRET-TOKEN', Cookie: 'session=SECRET-COOKIE; theme=dark' },
  });
  const text = await res.text();
  assert.ok(!text.includes('SECRET-TOKEN'));
  assert.ok(!text.includes('SECRET-COOKIE'));
  const body = JSON.parse(text);
  assert.equal(body.authorization, 'present');
  assert.deepEqual(body.cookieNames, ['session', 'theme']);
  assert.equal(body.headers.authorization, '[redacted]');
});

test('forwarded identity headers remain visible for benchmarking', async () => {
  const res = await fetch(`${base}/headers`, { headers: { 'X-Forwarded-User': 'alice' } });
  assert.equal((await res.json()).forwardedUser, 'alice');
});

for (const target of ['https://evil.example/', '//evil.example', '/\\evil.example', 'javascript:alert(1)']) {
  test(`redirect rejects non-local target ${target}`, async () => {
    const res = await fetch(`${base}/redirect?to=${encodeURIComponent(target)}`, { redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/');
  });
}

test('redirect preserves local path with query (smoke-test fidelity)', async () => {
  const res = await fetch(`${base}/redirect?to=${encodeURIComponent('/api/ping?probe=1')}`, { redirect: 'manual' });
  assert.equal(res.headers.get('location'), '/api/ping?probe=1');
});

test('upload within limit is accepted', async () => {
  const res = await fetch(`${base}/upload`, { method: 'POST', body: Buffer.alloc(1024) });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).bytesReceived, 1024);
});

test('oversized upload is rejected with 413', async () => {
  const res = await fetch(`${base}/upload`, { method: 'POST', body: Buffer.alloc(MAX_UPLOAD_BYTES + 1) }).catch(e => e);
  // The server may close the socket early; either a 413 or a reset is acceptable, a 200 is not.
  if (res instanceof Error) return;
  assert.equal(res.status, 413);
});

test('aborted upload does not crash the process', async () => {
  await new Promise(resolve => {
    const socket = net.connect(port, '127.0.0.1', () => {
      socket.write('POST /upload HTTP/1.1\r\nHost: x\r\nContent-Length: 1000\r\n\r\nabc');
      socket.destroy();
      resolve();
    });
  });
  await new Promise(resolve => setTimeout(resolve, 200));
  const res = await fetch(`${base}/api/ping`);
  assert.equal(res.status, 200);
});
