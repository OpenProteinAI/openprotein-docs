/**
 * Drives the base model pages in Chrome: every page against /models, the ESM2 page's sections,
 * the version cards and each version's own page, the server-rendered HTML, the search index, the
 * REST endpoints for the picked version, the citation, and the phone layout.
 *
 * With OP_TOKEN set to a platform access token, it also sends a real request: ESM2-8M
 * embeddings of one short sequence, then the job status and the result. --public: a build
 * without sign-in, so no playground.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5002';
const PUBLIC = process.argv.includes('--public');

const browser = await chromium.launch(
  process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : process.env.PLAYWRIGHT_CHANNEL === 'chromium' ? {} : { channel: 'chrome' },
);
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
// A build with sign-in asks the platform who is signed in. Answer "nobody" until the live
// section signs in with OP_TOKEN, by answering for the platform's session and mint endpoints.
let token = null;
const answer = (route, body) =>
  route.fulfill({
    status: 200,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': new URL(BASE).origin,
      'access-control-allow-credentials': 'true',
    },
    body: JSON.stringify(body),
  });
await page.route(/\/api\/v1\/auth\/session$/, (route) =>
  answer(route, token ? { authenticated: true, user_id: 1 } : { authenticated: false }),
);
await page.route(/\/api\/v1\/auth\/docs\/session$/, (route) =>
  answer(route, { access_token: token, expires_in: 900, user_id: 1 }),
);

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  FAIL ${msg}`);
};
const check = (ok, msg) => (ok ? console.log(`  ok   ${msg}`) : fail(msg));
const settle = (ms = 300) => page.waitForTimeout(ms);

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(`${page.url()}: ${m.text()}`));
page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));

/** Ids rendered more than once — anchors must be unique. */
const duplicateIds = () =>
  page.evaluate(() => {
    const seen = new Map();
    for (const el of document.querySelectorAll('[id]')) seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
    return [...seen].filter(([id, n]) => n > 1 && !/^radix-|^request-body$|^response-body$/.test(id)).map(([id]) => id);
  });

// ---- the catalogue says which models each page has: a card's name links to its page
await page.goto(`${BASE}/models`, { waitUntil: 'networkidle' });
const catalogue = await page.locator('.om-card').evaluateAll((cards) =>
  cards.map((c) => {
    const name = c.querySelector('a.om-card-name');
    // A card links to its version's page, under its base model's.
    const path = new URL(name.href).pathname;
    return { id: c.id, name: name.textContent, path, page: path.split('/').slice(0, 3).join('/') };
  }),
);
const links = await page
  .locator('#nd-sidebar [data-radix-scroll-area-viewport] > div > a[href*="/models/"]')
  .evaluateAll((as) =>
    as.map((a) => ({
      // The entry's name, less its version count.
      name: [...a.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join('').trim(),
      count: a.querySelector('.om-nav-versions')?.textContent ?? '',
      href: new URL(a.href).pathname,
    })),
  );
check(links.length > 0, `sidebar lists ${links.length} base models`);

console.log('/models/<model>');
for (const { name, count, href } of links) {
  await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle' });
  const versions = await page.locator('.om-version-card').evaluateAll((cards) => cards.map((c) => c.dataset.modelId));
  const expected = catalogue.filter((card) => card.page === href).map((card) => card.id);
  const title = (await page.locator('h1.om-title').textContent())?.trim();
  const picked = await page.locator('.om-version-card.is--selected').count();
  const heading = await page.locator('#model-versions').count();
  const details = await page.locator('.om-version-detail').count();
  // One version has no cards to pick from, nor their heading.
  const shown =
    expected.length > 1
      ? versions.length === expected.length && expected.every((id) => versions.includes(id)) && picked === 1 && heading === 1
      : versions.length === 0 && heading === 0;
  // The title is the picked version's name; the sidebar's, its base model's.
  const pickedId = expected.length > 1 ? await page.locator('.om-version-card.is--selected').getAttribute('data-model-id') : expected[0];
  const pickedName = catalogue.find((card) => card.id === pickedId)?.name;
  const dupes = await duplicateIds();
  const runs = await page
    .locator('.om-model-page [data-rest-api] h3')
    .evaluateAll((hs) => hs.filter((h) => h.innerText.trim().startsWith('POST')).length);
  check(
    title === pickedName && name && shown && details === 1 && !dupes.length && runs > 0 && count === (expected.length > 1 ? `${expected.length} versions` : ''),
    `${href}: ${name}, "${title}", ${expected.length} versions, ${runs} run endpoints${dupes.length ? `, duplicate ids ${dupes.join(' ')}` : ''}`,
  );
}

// ---- the ESM2 page, section by section
console.log('/models/esm2');
await page.goto(`${BASE}/models/esm2`, { waitUntil: 'networkidle' });
const crumbs = (await page.locator('#nd-page > div:first-child').innerText()).replace(/\s+/g, ' ');
check(/^Models ESM2$/.test(crumbs.trim()), `breadcrumb reads "Models > ESM2", no version count (${crumbs})`);
check(
  (await page.locator('#nd-sidebar a[data-active="true"]:visible').allTextContents()).join() === 'ESM25 versions',
  'the sidebar marks ESM2, its version count with it',
);
const toc = await page.locator('#nd-toc a').allTextContents();
check(
  ['Model versions', 'Endpoints', 'Citation'].every((t) => toc.includes(t)),
  `TOC lists the sections (${toc.join(', ')})`,
);
check(
  (await page.locator('.om-lead').textContent())?.startsWith('ESM2 masked protein language model') &&
    !(await page.locator('.om-lead').textContent())?.includes('parameters over'),
  'the lead is the paragraph the versions share',
);
check(
  (await page.locator('#nd-toc button', { hasText: 'Markdown' }).count()) === 1 &&
    (await page.locator('.om-model-page button', { hasText: 'Markdown' }).count()) === 0,
  'the Markdown menu sits in the TOC rail, not the body',
);
const md = await (await page.request.get(`${BASE}/models/esm2.md`)).text();
check(md.startsWith('# ESM2') && md.includes('## Model versions') && md.includes('### ESM2 (8M)'), '/models/esm2.md serves the page');

// ---- version cards: the default is picked, a click picks another and the details follow it
const cards = page.locator('.om-version-card');
const selected = () => page.locator('.om-version-card.is--selected').getAttribute('data-model-id');
const detail = page.locator('.om-version-detail');
check((await selected()) === 'esm2_t33_650M_UR50D', 'the base version, 650M, is picked by default');
check((await page.locator('h1.om-title').textContent()) === 'ESM2 (650M)', 'the title names the picked version');
check(
  (await cards.evaluateAll((as) => as.map((a) => a.dataset.modelId))).join() ===
    catalogue.filter((card) => card.page === '/models/esm2').map((card) => card.id).join() &&
    (await cards.allTextContents()).sort().join() === '150M,35M,3B,650M,8M',
  'the cards are named by version, in the API\'s order',
);
check(
  (await detail.locator('.om-detail-head > :not(.om-badge)').count()) === 0 &&
    (await detail.locator('.om-detail-description').textContent()) === '650M parameters over 33 layers.',
  'its details carry its own paragraph, no name line',
);
check(
  (await detail.locator('.om-info-label').allTextContents()).join() === 'Inputs,Family,Max length,Dimension' &&
    (await detail.locator('.om-method-chip').count()) > 0 &&
    (await detail.locator('a.om-tool-link').count()) > 0,
  'with its details rows, inference methods and tools',
);

check(
  (await cards.evaluateAll((as) => as.map((a) => `${a.textContent} ${new URL(a.href).pathname}`))).sort().join() ===
    '150M /models/esm2/150m,35M /models/esm2/35m,3B /models/esm2/3b,650M /models/esm2,8M /models/esm2/8m',
  'each card links to its version\'s page, the default to the base model\'s',
);

await cards.filter({ hasText: /^8M$/ }).click();
await page.waitForURL(/\/models\/esm2\/8m$/);
await settle();
check((await selected()) === 'esm2_t6_8M_UR50D', 'a click opens 8M\'s page, picked');
check(
  (await page.locator('#nd-page > div:first-child').innerText()).replace(/\s+/g, ' ').trim() === 'Models ESM2 8M' &&
    (await page.locator('#nd-sidebar a[data-active="true"]:visible').allTextContents()).join() === 'ESM25 versions',
  'its breadcrumb runs through ESM2, which the sidebar still marks',
);
check(
  (await detail.locator('.om-detail-description').textContent()) === '8M parameters over 6 layers.' &&
    (await page.locator('h1.om-title').textContent()) === 'ESM2 (8M)',
  'the details and the title follow the pick',
);

await page.goto(`${BASE}/models/esm2?version=esm2_t30_150M_UR50D`, { waitUntil: 'networkidle' });
await page.waitForURL(/\/models\/esm2\/150m$/).catch(() => {});
await settle();
check((await selected()) === 'esm2_t30_150M_UR50D', 'an old ?version= link moves to its version\'s page');

// ---- each version's page is rendered on the server, for crawlers
const served = await (await page.request.get(`${BASE}/models/esm2/8m`)).text();
check(
  /<title>ESM2 \(8M\)/.test(served) &&
    /<link rel="canonical" href="[^"]*\/models\/esm2\/8m\/?"/.test(served) &&
    /<h1[^>]*>ESM2 \(8M\)<\/h1>/.test(served) &&
    served.includes('8M parameters over 6 layers.'),
  'a version\'s page arrives with its title, canonical url, name and details',
);
check(
  served.includes('esm2_t6_8M_UR50D/batch/embeddings') && !served.includes('esm2_t33_650M_UR50D/batch'),
  'and with its own endpoints only',
);

// ---- the search box finds the model pages
const search = async (query) => {
  const response = await page.request.get(`${BASE}/api/search?query=${encodeURIComponent(query)}`);
  const hits = response.ok() ? await response.json().catch(() => null) : null;
  return Array.isArray(hits) ? [...new Set(hits.map((hit) => hit.url.split('#')[0]))] : null;
};
const found = await search('esm2 8m');
check(found?.[0] === '/models/esm2/8m' && found.includes('/models/esm2'), `search finds ESM2 (8M), then ESM2 (${found?.slice(0, 3)})`);
check((await search('esm2_t6_8M_UR50D'))?.includes('/models/esm2/8m'), 'and a version by its model id');
check((await search('models'))?.includes('/models'), 'and the catalogue');

// ---- endpoints: the picked version's operations, then the job status and result reads
const rows = () =>
  page.locator('.om-model-page [data-rest-api] h3').evaluateAll((hs) =>
    hs.map((h) => ({ id: h.id, text: h.innerText.replace(/\s+/g, ' ').trim() })),
  );
await page.goto(`${BASE}/models/poet-2`, { waitUntil: 'networkidle' });
let listed = await rows();
const runs = listed.filter((r) => r.text.startsWith('POST'));
check(
  runs.length > 0 && runs.every((r) => r.text.includes('/models/poet-2/')),
  `PoET-2's ${runs.length} run operations, and no other model's`,
);
check(runs.some((r) => r.text.endsWith('Scoring')) && runs.some((r) => r.text.endsWith('Generation')), 'run operations are named by what they do');
check(
  listed.some((r) => r.text.includes('/jobs/{job_id}')) && listed.some((r) => r.text.includes('/embeddings/{job_id}/scores')),
  '"Get results" has the job status and the result reads',
);
check(
  (await page.locator('.om-login-banner').count()) === (PUBLIC ? 1 : 0),
  PUBLIC ? 'a no-sign-in banner' : 'no log-in banner',
);
const html = await (await page.request.get(`${BASE}/models/poet-2`)).text();
check(!html.includes('esm2_t6_8M_UR50D/batch'), 'the page ships its own operations, not the whole spec');
check(!html.includes('Esm2T68MUR50DBatchEmbeddingsRequest'), 'and only the schemas they use');

await page.goto(`${BASE}/models/esm2`, { waitUntil: 'networkidle' });
await cards.filter({ hasText: /^8M$/ }).click();
await page.waitForURL(/\/models\/esm2\/8m$/);
await settle();
listed = await rows();
check(
  listed.filter((r) => r.text.startsWith('POST')).every((r) => r.text.includes('/models/esm2_t6_8M_UR50D/')),
  'picking 8M swaps in its own operations',
);

await page.locator('.om-model-page [data-rest-api] h3 button').first().click();
await settle(800);
check(
  PUBLIC ||
    (await page.locator('.om-model-page [data-rest-api] button[type="submit"]').first().isVisible()),
  'an opened endpoint has its playground',
);

// ---- the citation and the title row's paper and code follow the picked version
const doiRequests = [];
page.on('request', (request) => new URL(request.url()).hostname === 'doi.org' && doiRequests.push(request.url()));
await page.goto(`${BASE}/models/esm1`, { waitUntil: 'networkidle' });
const citation = async () => ({
  text: (await page.locator('.om-citation').innerText()).replace(/\s+/g, ' '),
  bibtex: await page
    .locator('.om-citation figure pre')
    .innerText({ timeout: 15_000 })
    .catch(() => ''),
  links: await page.locator('.om-title-row .om-model-links a').evaluateAll((as) => as.map((a) => a.href)),
});
check((await page.locator('.om-version-cards .om-model-links').count()) === 0, 'the version cards carry no links of their own');
const first = await citation();
const asked = doiRequests.length;
await cards.filter({ hasText: /^ESM1v-1$/ }).click();
await page.waitForURL(/\/models\/esm1\/esm1v-1$/);
await settle();
await page.waitForFunction((before) => document.querySelector('.om-citation figure')?.innerText !== before, first.bibtex, { timeout: 15_000 }).catch(() => {});
const second = await citation();
check(/Biological Structure/.test(first.text) && first.links.some((h) => h.includes('2016239118')), 'Citation shows the default version\'s title and paper');
check(/zero-shot/.test(second.text) && second.links.some((h) => h.includes('2021.07.09')), 'picking ESM1v-1 shows its own citation and paper');
check(
  /^@article\{\w+,\n {2}title=/.test(first.bibtex) && /^@article\{\w+,/.test(second.bibtex) && first.bibtex !== second.bibtex,
  'and its paper\'s BibTeX, one field per line',
);
check(asked === 1 && doiRequests.length === 2, `the browser asks doi.org per picked paper (${doiRequests.length})`);
check(second.links.some((h) => h.includes('github.com')), 'and its code link');

// ---- live: send, poll, read back (needs a platform token)
if (process.env.OP_TOKEN && !PUBLIC) {
  console.log('live request');
  token = process.env.OP_TOKEN;
  const SEQ = 'MKTAYIAKQRQISFVKSHFSRQ';
  await page.goto(`${BASE}/models/esm2?version=esm2_t6_8M_UR50D`, { waitUntil: 'networkidle' });

  const openCard = async (id) => {
    await page.locator(`[id="${id}"] button`).first().click();
    await settle(800);
    return page.locator(`[id="${id}-content"]`);
  };
  const fillPath = async (region, values) => {
    const inputs = region.locator('[data-type="path"] input');
    // Opens only if closed.
    if (!(await inputs.count())) {
      await region.locator('[data-type="path"] > button').click();
      await settle(400);
    }
    for (const input of await inputs.all()) {
      const label = await input.evaluate((el) => el.closest('fieldset')?.textContent ?? '');
      const key = Object.keys(values).find((k) => label.includes(k));
      if (key) await input.fill(values[key]);
    }
  };

  const run = await openCard('esm2-8m-batch-embeddings');
  await run.locator('[data-type="body"] > button').click().catch(() => {});
  await run.locator('button', { hasText: 'Open JSON Editor' }).click();
  await run.locator('textarea').first().fill(JSON.stringify({ sequences: [SEQ] }));
  await run.locator('button[type="submit"]').click();
  await settle(4000);
  const job = ((await run.innerText()).match(/"job_id":\s*"([0-9a-f-]+)"/) ?? [])[1];
  check(!!job, `Send starts a job (${job})`);

  if (job) {
    const status = await openCard('get-job-metadata-by-job-id');
    await fillPath(status, { job_id: job });
    let state = '';
    for (let i = 0; i < 30 && !['SUCCESS', 'FAILURE'].includes(state); i++) {
      await status.locator('button[type="submit"]').click();
      await settle(3000);
      state = ((await status.innerText()).match(/"status":\s*"(\w+)"/) ?? [])[1] ?? '';
    }
    check(state === 'SUCCESS', `the job status reads ${state}`);

    const result = await openCard('retrieve-vector-results');
    await fillPath(result, { job_id: job, sequence: SEQ });
    await result.locator('button[type="submit"]').click();
    await settle(3000);
    check(/200 Successful/.test(await result.innerText()), 'the result read answers 200');
  }
}

// ---- phone
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/models/esm2`, { waitUntil: 'networkidle' });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check(overflow <= 0, 'no sideways scroll at 390px');

check(!errors.length, `no console errors${errors.length ? `:\n    ${errors.join('\n    ')}` : ''}`);

await browser.close();
if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nall checks passed');
