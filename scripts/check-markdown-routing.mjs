import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NextRequest } from 'next/server.js';

const root = fileURLToPath(new URL('..', import.meta.url));
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'next/server') return nextResolve('next/server.js', context);
    if (specifier.startsWith('@/')) return nextResolve(pathToFileURL(`${root}${specifier.slice(2)}.ts`).href, context);
    return nextResolve(specifier, context);
  },
});
const { default: proxy } = await import('../proxy.server.ts');
const request = (path) => new NextRequest('http://localhost:5002' + path);

test('public markdown rewrites once and preserves query', () => {
  for (const path of ['/references/python-api/jobs.md', '/quickstart.md', '/mdx/quickstart.md']) {
    const response = proxy(request(path + '?format=raw'));
    assert.equal(response.headers.get('x-middleware-rewrite'), 'http://localhost:5002/md' + path + '?format=raw');
  }
});

test('internal markdown paths pass through without another rewrite', () => {
  for (const path of ['/md/references/python-api/jobs.md', '/md/quickstart.md']) {
    const response = proxy(request(path + '?format=raw'));
    assert.equal(response.headers.get('x-middleware-rewrite'), null);
    assert.equal(response.headers.get('x-middleware-next'), '1');
  }
});

test('root and ordinary routes pass through', () => {
  for (const path of ['/', '/.md', '/quickstart', '/md', '/mdx']) {
    const response = proxy(request(path));
    assert.equal(response.headers.get('x-middleware-rewrite'), null);
    assert.equal(response.headers.get('x-middleware-next'), '1');
  }
});

test('legacy redirects and gone responses remain intact', () => {
  for (const [old, dest] of [['/python-api/installation.html', '/quickstart'], ['/rest-api/predictor.html', '/references/rest-api/predictor']]) {
    const response = proxy(request(old + '?x=1'));
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), 'http://localhost:5002' + dest + '?x=1');
  }
  for (const path of ['/searchindex.js', '/objects.inv']) assert.equal(proxy(request(path)).status, 404);
});

test('development api proxy rewrites without an upstream request', () => {
  const prevNode = process.env.NODE_ENV;
  const prevProxy = process.env.OP_SERVER_PROXY;
  try {
    process.env.NODE_ENV = 'development';
    process.env.OP_SERVER_PROXY = 'http://127.0.0.1:41000';
    const response = proxy(request('/api/v1/jobs?x=1'));
    assert.equal(response.headers.get('x-middleware-rewrite'), 'http://127.0.0.1:41000/api/v1/jobs?x=1');
    assert.equal(response.headers.get('x-middleware-request-origin'), 'http://localhost:5002');
  } finally {
    if (prevNode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = prevNode;
    if (prevProxy === undefined) delete process.env.OP_SERVER_PROXY; else process.env.OP_SERVER_PROXY = prevProxy;
  }
});
