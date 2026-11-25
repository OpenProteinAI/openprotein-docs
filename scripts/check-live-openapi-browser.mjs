import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import './load-env.mjs';

const BASE = process.env.BASE ?? 'http://localhost:5002';
const API = process.env.NEXT_PUBLIC_OP_API_URL;
if (!API) throw new Error('set NEXT_PUBLIC_OP_API_URL in .env: the API the server on BASE was built with');
const load = async (id) => JSON.parse(await readFile(new URL(`../specs/${id}.openapi.json`, import.meta.url), 'utf8'));
const models = await load('models');
const prompt = await load('prompt');
const ROWS = '[data-rest-api] :is(h3,h4,h5)[id]:not([id$="-endpoint"]):has(button[aria-expanded])';
const countOperations = (spec) => Object.values(spec.paths).reduce(
  (count, item) => count + ['get', 'post', 'put', 'patch', 'delete', 'head'].filter((method) => item[method]).length,
  0,
);

const liveModels = process.env.MAIN_OPENAPI_FILE
  ? JSON.parse(await readFile(process.env.MAIN_OPENAPI_FILE, 'utf8'))
  : structuredClone(models);
liveModels.servers = [{ url: 'https://api.openprotein.ai' }];
liveModels.paths['/api/v1/models/live-check'] = {
  servers: [{ url: 'https://other.example' }],
  get: {
    tags: ['models'],
    summary: 'Live models check',
    operationId: 'live_models_check',
    servers: [{ url: 'https://api.openprotein.ai' }],
    parameters: [{ name: 'live_limit', in: 'query', schema: { $ref: '#/components/schemas/LiveLimit' } }],
    responses: { 200: { description: 'OK' } },
  },
};
liveModels.paths['/api/v1/assaydata/live-check'] = {
  get: { tags: ['assaydata'], summary: 'Unrelated live check', responses: { 200: { description: 'OK' } } },
};
liveModels.components.schemas.LiveLimit = { type: 'integer', minimum: 1 };

const livePrompt = structuredClone(prompt);
livePrompt.paths['/api/v1/prompt/00000000-0000-0000-0000-000000000001'] = {
  post: { tags: ['prompt'], summary: 'Live prompt check', responses: { 202: { description: 'Job' } } },
};

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' },
);
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
let response = { json: liveModels };
const requests = [];
const errors = [];
const consoleErrors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
const assertToc = async () => {
  const { links, unresolved } = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    const links = [...document.querySelectorAll('#nd-toc a[href^="#"]')].map((link) =>
      decodeURIComponent(link.getAttribute('href').slice(1)),
    );
    return { links: links.length, unresolved: links.filter((id) => ids.filter((candidate) => candidate === id).length !== 1) };
  });
  assert.ok(links > 0, 'the page renders a TOC');
  assert.deepEqual(unresolved, [], 'static TOC entries must resolve in the rendered document');
};
await page.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.origin !== API && !url.hostname.endsWith('.openprotein.ai')) return route.continue();
  requests.push({ url: url.href, headers: route.request().headers() });
  const headers = {
    'access-control-allow-origin': new URL(BASE).origin,
    'access-control-allow-credentials': 'true',
  };
  if (url.pathname === '/api/v1/auth/session') {
    return route.fulfill({ headers, json: { authenticated: false } });
  }
  if (url.origin === API && url.pathname === '/api/v1/prompt/openapi.json') {
    return route.fulfill({ headers, json: livePrompt });
  }
  if (url.origin === API && url.pathname === '/openapi.json') {
    return route.fulfill({ headers, ...response });
  }
  return route.abort();
});

try {
  await page.goto(`${BASE}/references/rest-api/models`, { waitUntil: 'networkidle' });
  await page.getByText(`Live spec from ${API}/openapi.json`, { exact: true }).waitFor();
  assert.equal(await page.locator(ROWS).count(), countOperations(models) + 1);
  assert.equal(await page.getByText('Unrelated live check', { exact: true }).count(), 0);
  const row = page.locator(ROWS).filter({ hasText: 'Live models check' });
  await row.locator('button[aria-expanded]').click();
  await page.getByText('live_limit', { exact: true }).first().waitFor();
  const panel = page.locator(`[id="${await row.getAttribute('id')}-content"]`);
  assert.equal(await panel.getByText('https://api.openprotein.ai', { exact: true }).count(), 0);
  assert.equal(await panel.getByText('https://other.example', { exact: true }).count(), 0);
  assert.ok((await panel.innerText()).includes(API), 'authenticated build must pin the playground to the API origin');
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  await assertToc();
  console.log('ok live Models: new route, component reference, prefix selection, pinned playground, TOC anchors');

  await page.locator('a[href="/references/rest-api/prompt"]:visible').first().click();
  await page.getByText(`Live spec from ${API}/api/v1/prompt/openapi.json`, { exact: true }).waitFor();
  await page.getByText('Live prompt check', { exact: true }).waitFor();
  assert.equal(await page.getByText('Live models check', { exact: true }).count(), 0);
  assert.deepEqual(consoleErrors, []);
  await assertToc();
  console.log('ok client navigation to live Prompt: UUID route and fresh document');

  for (const [name, result] of [
    ['HTTP failure', { status: 503, body: 'unavailable' }],
    ['invalid JSON', { contentType: 'application/json', body: '{' }],
    ['invalid shape', { json: { error: 'not OpenAPI' } }],
    ['no Models routes', { json: { ...models, paths: { '/api/v1/assaydata': { get: { responses: {} } } } } }],
    ['no operations', { json: { ...models, paths: { '/api/v1/models': {} } } }],
    ['malformed operation', { json: { ...models, paths: { '/api/v1/models': { get: true } } } }],
    ['referenced path item', { json: {
      ...models,
      paths: { '/api/v1/models': { $ref: '#/components/pathItems/Override', get: { responses: {} } } },
      components: { ...models.components, pathItems: { Override: { servers: [{ url: 'https://api.openprotein.ai' }] } } },
    } }],
    ['render failure', { json: {
      ...models,
      paths: { '/api/v1/models': { get: { tags: [null], responses: {} } } },
    } }],
  ]) {
    response = result;
    await page.goto(`${BASE}/references/rest-api/models`, { waitUntil: 'networkidle' });
    assert.equal(await page.getByText(/^Live spec from /).count(), 0, name);
    assert.equal(await page.locator(ROWS).count(), countOperations(models), name);
    await assertToc();
    console.log(`ok static fallback: ${name}`);
  }
  assert.deepEqual(errors, []);
  assert.ok(requests.some(({ url }) => url === `${API}/openapi.json`));
  assert.ok(requests.some(({ url }) => url === `${API}/api/v1/prompt/openapi.json`));
  assert.ok(requests.every(({ headers }) => !headers.authorization), 'spec loads must not attach a bearer token');
} finally {
  await browser.close();
}
