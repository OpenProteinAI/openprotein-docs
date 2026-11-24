/**
 * `pnpm dev`'s proxy to the platform API, against a fake upstream: /api/v1/* goes there with its
 * cookies and query, Origin is added when the browser sent none, and Set-Cookie comes back.
 *
 *   pnpm check:proxy
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { createRequire } from 'node:module';

const UPSTREAM = 5098;
const PORT = 5196;
const SITE = `http://localhost:${PORT}`;

const upstream = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    res.setHeader('set-cookie', [
      '__Host-op_refresh=r1; Path=/; Secure; HttpOnly; SameSite=Lax',
      '__Host-op_csrf=c1; Path=/; Secure; HttpOnly; SameSite=Lax',
    ]);
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        method: req.method,
        url: req.url,
        origin: req.headers.origin ?? null,
        cookie: req.headers.cookie ?? null,
        body,
      }),
    );
  });
});
await new Promise((resolve) => upstream.listen(UPSTREAM, '127.0.0.1', resolve));

// Next's own entry, so .env files can't move the port the checks call.
const next = createRequire(import.meta.url).resolve('next/dist/bin/next');
const dev = spawn(process.execPath, [next, 'dev', '--port', String(PORT)], {
  env: { ...process.env, OP_SERVER_PROXY: `http://127.0.0.1:${UPSTREAM}` },
  stdio: 'ignore',
  detached: true,
});

function request(method, path, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${SITE}${path}`, { method, headers }, (res) => {
      let text = '';
      res.on('data', (chunk) => (text += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

let failed = false;
try {
  for (let tries = 0; ; tries += 1) {
    const ready = await request('GET', '/').catch(() => null);
    if (ready?.status === 200) break;
    if (tries > 120) throw new Error('pnpm dev never answered');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const get = await request('GET', '/api/v1/auth/session?x=1', { cookie: '__Host-op_refresh=abc' });
  assert.equal(get.status, 200);
  assert.deepEqual(JSON.parse(get.text), {
    method: 'GET',
    url: '/api/v1/auth/session?x=1',
    origin: SITE,
    cookie: '__Host-op_refresh=abc',
    body: '',
  });
  assert.equal(get.headers['set-cookie']?.length, 2);
  console.log('  ok    a GET gets Origin added, keeps its cookie and query, and returns Set-Cookie');

  const body = JSON.stringify({ code: 'c' });
  const post = await request(
    'POST',
    '/api/v1/auth/handoff/exchange',
    { origin: SITE, 'content-type': 'application/json' },
    body,
  );
  assert.equal(JSON.parse(post.text).body, body);
  assert.equal(JSON.parse(post.text).origin, SITE);
  console.log('  ok    a POST keeps its body and Origin');

  const page = await request('GET', '/overview');
  assert.equal(page.status, 200);
  assert.match(page.headers['content-type'] ?? '', /text\/html/);
  console.log('  ok    pages are still served by Next');
} catch (error) {
  failed = true;
  console.log(`  FAIL  ${String(error?.message ?? error).split('\n')[0]}`);
} finally {
  try {
    process.kill(-dev.pid);
  } catch {
    // already gone
  }
  upstream.close();
}
process.exit(failed ? 1 : 0);
