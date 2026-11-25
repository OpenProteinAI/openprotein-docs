import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { anchorFindings, browserOptions, publishedSpecs, retirementsByPage, referenceTargetValid, currentPageAnchors } from './pyapi/check-contract.mjs';
import test from 'node:test';

const commit = 'a'.repeat(40);
const pin = { commit };
const document = (ref = commit) => ({ source: { ref }, entries: [
  { path: 'openprotein.A', page: 'one', members: [{ name: 'method' }] },
  { path: 'openprotein.Hidden', page: null, summary_only: true },
] });

for (const [name, env, want] of [
  ['system Chrome default', {}, { channel: 'chrome' }],
  ['bundled Chromium', { PLAYWRIGHT_CHANNEL: 'chromium' }, {}],
  ['explicit executable', { CHROME_PATH: '/browser' }, { executablePath: '/browser' }],
  ['executable wins over bundled', { CHROME_PATH: '/browser', PLAYWRIGHT_CHANNEL: 'chromium' }, { executablePath: '/browser' }],
]) test(name, () => assert.deepEqual(browserOptions(env), want));

test('published specs include only actual class and member anchors', () => {
  const universe = publishedSpecs([['openprotein.json', document()]], pin);
  assert.equal(universe.get('openprotein.A.method'), 'one');
  assert.equal(universe.get('openprotein.A'), 'one');
  assert.equal(universe.has('openprotein.Hidden'), false);
});

test('missing and mismatched input source refs fail', () => {
  for (const doc of [document('b'.repeat(40)), document(null), { entries: [] }]) assert.throws(() => publishedSpecs([['openprotein.json', doc]], pin), /source.ref/);
});

test('invalid immutable pin is rejected', () => assert.throws(() => publishedSpecs([], { commit: 'main' }), /pin/));

test('different publication pages cannot claim one path', () => {
  const second = { source: { ref: commit }, entries: [{ path: 'openprotein.A', page: 'two' }] };
  assert.throws(() => publishedSpecs([['one', document()], ['two', second]], pin), /openprotein.A/);
});

const historical = new Map([['old', new Set(['openprotein.Old', 'openprotein.Old.other'])]]);
const published = new Map([['openprotein.New', 'new']]);
const retirement = { page: 'old', anchor: 'openprotein.Old', reason: 'Public class renamed', replacement: { page: 'new', anchor: 'openprotein.New' } };
test('recorded replacement exempts exactly its historical pair', () => assert.deepEqual([...retirementsByPage(historical, published, [retirement]).get('old')], ['openprotein.Old']));
test('explicit removal without a replacement is allowed', () => {
  const { replacement, ...row } = retirement;
  assert.equal(retirementsByPage(historical, published, [{ ...row, removed: true }]).get('old').has(row.anchor), true);
});
test('a page move can name the same anchor on its new page', () => {
  const moved = new Map([['openprotein.Old', 'new']]);
  const row = { ...retirement, replacement: { page: 'new', anchor: 'openprotein.Old' } };
  assert.equal(retirementsByPage(historical, moved, [row]).get('old').size, 1);
});
const invalidRetirements = [
  ['unknown page', [{ ...retirement, page: 'absent' }], published], ['unknown anchor', [{ ...retirement, anchor: 'openprotein.Absent' }], published],
  ['wildcard anchor', [{ ...retirement, anchor: 'openprotein.Old.*' }], published], ['blank reason', [{ ...retirement, reason: ' ' }], published],
  ['duplicate record', [retirement, retirement], published], ['missing disposition', [{ page: 'old', anchor: retirement.anchor, reason: 'Removed' }], published],
  ['both dispositions', [{ ...retirement, removed: true }], published], ['false removal', [{ page: 'old', anchor: retirement.anchor, reason: 'Removed', removed: false }], published],
  ['missing replacement', [{ ...retirement, replacement: { page: 'new', anchor: 'openprotein.Absent' } }], published],
  ['wrong replacement page', [{ ...retirement, replacement: { page: 'old', anchor: 'openprotein.New' } }], published],
  ['stale exemption', [retirement], new Map([...published, ['openprotein.Old', 'old']])],
];
for (const [name, rows, universe] of invalidRetirements) test(`retirement rejects ${name}`, () => assert.throws(() => retirementsByPage(historical, universe, rows)));
test('retiring a class does not exempt its sibling member anchor', () => {
  const retired = retirementsByPage(historical, published, [retirement]).get('old');
  assert.deepEqual([...historical.get('old')].filter((id) => !retired.has(id)), ['openprotein.Old.other']);
});
test('anchor checks report missing, duplicate and hidden retired ids', () => assert.deepEqual(
  anchorFindings(['new', 'new', 'retired'], ['new', 'missing'], ['retired']),
  { missing: ['missing'], duplicated: ['new'], retiredPresent: ['retired'] },
));

for (const [name, bad, expected] of [
  ['unlisted publication page', doc => { doc.entries[0].page = 'unlisted'; }, /publication page.*unlisted/],
  ['bad pin', doc => { doc.source.ref = 'b'.repeat(40); }, /source.ref/],
]) test(`CLI rejects ${name} before browser launch`, () => {
  const root = mkdtempSync(join(tmpdir(), 'pyapi-preflight-'));
  try {
    mkdirSync(join(root, 'scripts/pyapi/golden'), { recursive: true }); mkdirSync(join(root, 'specs'));
    writeFileSync(join(root, 'scripts/pyapi/pages.json'), JSON.stringify({ pages: ['one', 'two'].map(page => ({ page })) }));
    writeFileSync(join(root, 'scripts/pyapi/sdk-pin.json'), JSON.stringify(pin));
    writeFileSync(join(root, 'scripts/pyapi/anchor-retirements.json'), '[]');
    writeFileSync(join(root, 'scripts/pyapi/deployed-anchors.json'), JSON.stringify({ docsCommit: commit, anchors: [] }));
    writeFileSync(join(root, 'scripts/pyapi/golden/one.json'), JSON.stringify({ classes: [], module_level: [] }));
    const doc = document(); bad(doc); writeFileSync(join(root, 'specs/openprotein.json'), JSON.stringify(doc));
    const cli = fileURLToPath(new URL('./check-pyapi.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [cli], { cwd: root, encoding: 'utf8', env: { ...process.env, CHROME_PATH: '/no/such/browser' } });
    assert.notEqual(result.status, 0); assert.match(result.stderr, expected); assert.doesNotMatch(result.stderr, /browserType.launch/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('branch source repository must match pin and immutable URL prefix', async () => {
  const { sourcePrefix } = await import('./pyapi/check-contract.mjs');
  const repo = 'https://github.com/OpenProteinAI/openprotein-python';
  const privatePin = { commit, repository: repo };
  const doc = document(); doc.source.repository = repo;
  assert.doesNotThrow(() => publishedSpecs([['private', doc]], privatePin));
  assert.equal(sourcePrefix(privatePin), `${repo}/blob/${commit}/`);
  assert.throws(() => publishedSpecs([['wrong', { ...doc, source: { ...doc.source, repository: 'https://github.com/other/repo' } }]], privatePin), /source.repository/);
  assert.throws(() => sourcePrefix({ ...privatePin, commit: 'release/v0.18.0' }), /immutable/);
  assert.throws(() => sourcePrefix({ ...privatePin, repository: 'https://github.com/other/repo/tree/main' }), /repository/);
});

test('external Button renders its title without changing link behavior', async () => {
  const { readFileSync } = await import('node:fs');
  const vm = await import('node:vm');
  const ts = await import('typescript');
  const React = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const jsx = await import('react/jsx-runtime');
  const source = readFileSync(new URL('../components/site/button.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  const require = (name) => {
    if (name === 'react/jsx-runtime') return jsx;
    if (name === 'next/link') return { default: () => null };
    if (name === '@/lib/cn') return { cn: (...parts) => parts.filter(Boolean).join(' ') };
    throw new Error(`Unexpected import ${name}`);
  };
  vm.runInNewContext(code, { module, exports: module.exports, require, Set });
  const html = renderToStaticMarkup(React.createElement(module.exports.Button, {
    external: true, href: 'https://example.com/tree/abc', title: 'version and SHA', variant: 'secondary', size: 'compact', children: 'SDK branch',
  }));
  assert.match(html, /<a [^>]*title="version and SHA"/);
  assert.match(html, /href="https:\/\/example.com\/tree\/abc"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /op-btn--secondary/);
  assert.match(html, />SDK branch</);
});

test('release bump repins annotated and legacy SDK_BRANCH declarations', async () => {
  const { readFileSync } = await import('node:fs');
  const vm = await import('node:vm');
  const source = readFileSync(new URL('./update-pyapi.mjs', import.meta.url), 'utf8');
  const start = source.indexOf("  let sdk = readFileSync(SDK, 'utf8');");
  const end = source.indexOf('  writeFileSync(SDK, sdk);', start);
  assert.ok(start >= 0 && end > start);
  for (const branch of ['SDK_BRANCH: str | None = "release/v0.18.0"', 'SDK_BRANCH = "release/v0.18.0"']) {
    const fixture = `REPO = "https://github.com/private/sdk"\nSDK_COMMIT = "old"\n${branch}\nSDK_TAG_OBJECT = None\n`;
    const repin = (text, pattern, replacement) => {
      assert.match(text, pattern);
      return text.replace(pattern, replacement);
    };
    const result = vm.runInNewContext(`${source.slice(start, end)}\nsdk`, {
      readFileSync: () => fixture, SDK: 'sdk.py', repin, commit: 'newcommit', tagObject: 'tagobject', REPO: 'OpenProteinAI/openprotein-python',
    });
    assert.match(result, /^SDK_BRANCH: str \| None = None$/m);
    assert.match(result, /^SDK_COMMIT = "newcommit"$/m);
    assert.match(result, /^SDK_TAG_OBJECT = "tagobject"$/m);
    assert.match(result, /^REPO = "https:\/\/github.com\/OpenProteinAI\/openprotein-python"$/m);
  }
});

test('same-version explicit release replaces a VCS pin, while released and default modes do not bump', async () => {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const vm = await import('node:vm');
  const source = readFileSync(new URL('./update-pyapi.mjs', import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '')
    .replace("const { createHash } = await import('node:crypto');", '')
    .replace("const { readdirSync, statSync } = await import('node:fs');", '');
  const sourceRequirements = [
    `# Source branch main at immutable commit ${'a'.repeat(40)}.`,
    'griffe==2.2.0',
    'openprotein-python @ git+${OP_SDK_GIT_URL}@' + 'a'.repeat(40),
    '',
  ].join('\n');
  const sdk = readFileSync(new URL('./pyapi/sdk.py', import.meta.url), 'utf8');
  const blob = Buffer.from('fixture SDK source');
  const blobSha = createHash('sha1').update(`blob ${blob.length}\0`).update(blob).digest('hex');
  const commit = 'b'.repeat(40);
  const version = '0.18.0';
  async function runFixture(requirements, args) {
    const files = new Map([['scripts/pyapi/requirements.txt', requirements], ['scripts/pyapi/sdk.py', sdk], ['/fake/openprotein/__init__.py', blob]]);
    const calls = { fetch: [], commands: [], writes: [] };
    const sandbox = {
      process: { argv: ['node', 'update', ...args], exit: (code) => { throw Object.assign(new Error('exit'), { exitCode: code }); } },
      console: { log: () => {}, error: () => {} },
      existsSync: () => true,
      readFileSync: (path, encoding) => encoding ? String(files.get(path)) : files.get(path),
      writeFileSync: (path, content) => { calls.writes.push(path); files.set(path, content); },
      readdirSync: () => ['__init__.py'], statSync: () => ({ isDirectory: () => false }), createHash,
      execFileSync: (cmd, argv) => {
        calls.commands.push([cmd, ...argv]);
        if (argv.includes('from importlib.metadata import version; print(version("openprotein-python"))')) return version;
        if (argv.includes("import sysconfig; print(sysconfig.get_paths()['purelib'])")) return '/fake';
        return '';
      },
      fetch: async (url) => {
        calls.fetch.push(url);
        const data = url.includes('/git/ref/tags/') ? { object: { type: 'commit', sha: commit } }
          : url.includes('/git/trees/') ? { truncated: false, tree: [{ type: 'blob', path: 'openprotein/__init__.py', sha: blobSha }] }
          : null;
        assert.ok(data, `unexpected fetch ${url}`);
        return { ok: true, json: async () => data };
      },
    };
    let exitCode = 0;
    try { await vm.runInNewContext(`(async () => {${source}\n})()`, sandbox); }
    catch (error) { if (!Number.isInteger(error.exitCode)) throw error; exitCode = error.exitCode; }
    return { calls, files, exitCode };
  }
  const moved = await runFixture(sourceRequirements, [version]);
  assert.equal(moved.exitCode, 0);
  assert.deepEqual(moved.calls.fetch, [
    `https://api.github.com/repos/OpenProteinAI/openprotein-python/git/ref/tags/v${version}`,
    `https://api.github.com/repos/OpenProteinAI/openprotein-python/git/trees/${commit}?recursive=1`,
  ]);
  assert.ok(moved.calls.commands.some(([cmd]) => cmd === 'pixi'));
  assert.match(moved.files.get('scripts/pyapi/requirements.txt'), /^openprotein-python==0\.18\.0$/m);
  assert.match(moved.files.get('scripts/pyapi/sdk.py'), /^SDK_BRANCH: str \| None = None$/m);
  assert.match(moved.files.get('scripts/pyapi/sdk.py'), /^REPO = "https:\/\/github.com\/OpenProteinAI\/openprotein-python"$/m);
  assert.match(moved.files.get('scripts/pyapi/sdk.py'), new RegExp(`^SDK_COMMIT = "${commit}"$`, 'm'));
  const releaseRequirements = '# openprotein-python 0.18.0 == commit old (tag v0.18.0).\ngriffe==2.2.0\nopenprotein-python==0.18.0\n';
  for (const [requirements, args] of [[releaseRequirements, [version]], [sourceRequirements, []], [sourceRequirements, ['--check']]]) {
    const unchanged = await runFixture(requirements, args);
    assert.equal(unchanged.exitCode, 0);
    assert.equal(unchanged.calls.fetch.length, 0);
    assert.equal(unchanged.calls.writes.length, 0);
    assert.equal(unchanged.calls.commands.some(([cmd]) => cmd === 'pixi'), false);
  }
  const rejected = await runFixture(sourceRequirements, ['--check', version]);
  assert.equal(rejected.exitCode, 1);
  assert.equal(rejected.calls.fetch.length, 0);
  assert.equal(rejected.calls.writes.length, 0);
  assert.equal(rejected.calls.commands.some(([cmd]) => cmd === 'pixi'), false);
});

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { historicalAnchors, referenceRetirements } from './pyapi/check-contract.mjs';

const deployed = (anchors = []) => ({ docsCommit: commit, anchors });
const goldenPages = () => new Map([
  ['one', new Set(['openprotein.Golden'])], ['two', new Set()], ['fold', new Set()],
]);
const postGolden = ['one', 'openprotein.PostGolden'];
const goldenPublication = new Map([['openprotein.Golden', 'one']]);
const removal = { page: 'one', anchor: postGolden[1], reason: 'Explicit approved removal', removed: true };

test('deployed history augments golden without mutating either input', () => {
  const golden = goldenPages();
  const baseline = deployed([postGolden]);
  const history = historicalAnchors(golden, baseline);
  assert.deepEqual([...history.get('one')], ['openprotein.Golden', 'openprotein.PostGolden']);
  assert.deepEqual([...golden.get('one')], ['openprotein.Golden']);
  assert.deepEqual(baseline, deployed([postGolden]));
  assert.throws(() => referenceRetirements(history, goldenPublication, []), /Missing historical anchor disposition: one#openprotein.PostGolden/);
});

test('a same-ID page move needs an exact old-page disposition', () => {
  const history = historicalAnchors(goldenPages(), deployed([postGolden]));
  const moved = new Map([...goldenPublication, [postGolden[1], 'two']]);
  assert.throws(() => referenceRetirements(history, moved, []), /one#openprotein.PostGolden/);
  const row = { page: 'one', anchor: postGolden[1], reason: 'Approved page move', replacement: { page: 'two', anchor: postGolden[1] } };
  const retired = referenceRetirements(history, moved, [row]);
  assert.deepEqual([...retired.get('one')], [postGolden[1]]);
  assert.deepEqual(anchorFindings([postGolden[1]], [], [...retired.get('one')]).retiredPresent, [postGolden[1]]);
  assert.deepEqual(anchorFindings([postGolden[1]], [postGolden[1]], []).retiredPresent, []);
});

test('exact removal and replacement pass without exempting golden', () => {
  const history = historicalAnchors(goldenPages(), deployed([postGolden]));
  assert.equal(referenceRetirements(history, goldenPublication, [removal]).get('one').size, 1);
  const target = new Map([...goldenPublication, ['openprotein.New', 'two']]);
  const { removed, ...row } = removal;
  assert.equal(referenceRetirements(history, target, [{ ...row, replacement: { page: 'two', anchor: 'openprotein.New' } }]).get('one').size, 1);
  assert.throws(() => referenceRetirements(history, new Map(), [removal]), /one#openprotein.Golden/);
});

for (const [name, fixture] of [
  ['null', null], ['array', []], ['extra key', { ...deployed(), extra: true }],
  ['missing provenance', { anchors: [] }], ['short commit', { ...deployed(), docsCommit: 'a'.repeat(39) }],
  ['nonhex commit', { ...deployed(), docsCommit: 'g'.repeat(40) }], ['nonstring commit', { ...deployed(), docsCommit: 40 }],
  ['nonarray rows', { ...deployed(), anchors: {} }], ['object row', deployed([{ page: 'one', id: postGolden[1] }])],
  ['long row', deployed([['one', postGolden[1], 'extra']])], ['short row', deployed([['one']])],
  ['nonstring row', deployed([['one', 1]])], ['unknown page', deployed([['unknown', postGolden[1]]])],
  ['duplicate pair', deployed([postGolden, postGolden])], ['nondotted id', deployed([['one', 'openprotein']])],
  ['wildcard', deployed([['one', 'openprotein.*']])], ['star suffix', deployed([['fold', 'openprotein.fold.BoltzAffinity.*kwargs']])],
  ['literal on wrong page', deployed([['one', 'openprotein.fold.BoltzAffinity.**kwargs']])],
  ['other double star', deployed([['fold', 'openprotein.fold.Other.**kwargs']])],
]) test(`deployed baseline rejects ${name}`, () => assert.throws(() => historicalAnchors(goldenPages(), fixture)));

test('the deployed kwargs literal is accepted only as an exact pair', () => {
  const id = 'openprotein.fold.BoltzAffinity.**kwargs';
  const history = historicalAnchors(goldenPages(), deployed([['fold', id]]));
  assert.equal(history.get('fold').has(id), true);
  assert.throws(() => referenceRetirements(history, goldenPublication, []), /BoltzAffinity\.\*\*kwargs/);
});

for (const [name, rows, current] of [
  ['stale', [removal], new Map([...goldenPublication, [postGolden[1], 'one']])],
  ['duplicate', [removal, removal], goldenPublication],
  ['unknown', [{ ...removal, anchor: 'openprotein.Unknown' }], goldenPublication],
  ['wildcard', [{ ...removal, anchor: 'openprotein.*' }], goldenPublication],
  ['wrong page', [{ page: 'one', anchor: postGolden[1], reason: 'Move', replacement: { page: 'one', anchor: 'openprotein.New' } }], new Map([...goldenPublication, ['openprotein.New', 'two']])],
]) test(`union preflight rejects ${name} disposition`, () => {
  assert.throws(() => referenceRetirements(historicalAnchors(goldenPages(), deployed([postGolden])), current, rows));
});

test('tracked deployed fixture has immutable provenance and complete normalized bytes', () => {
  const bytes = readFileSync(new URL('./pyapi/deployed-anchors.json', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '0d4fb8aa2cbe8515f83b068e886c3c50affc2aa5a28b8d54e048154f59da34fe');
  const baseline = JSON.parse(bytes);
  assert.equal(baseline.anchors.length, 1737);
  assert.equal(baseline.docsCommit, '196ac0f88ea40719563b1d659dd020bb45d15c47');
  const manifest = JSON.parse(readFileSync(new URL('./pyapi/pages.json', import.meta.url)));
  assert.doesNotThrow(() => historicalAnchors(new Map(manifest.pages.map(({ page }) => [page, new Set()])), baseline));
});

for (const moved of [false, true]) test(`actual checker rejects post-golden ${moved ? 'page move' : 'disappearance'} before launch`, () => {
  const root = mkdtempSync(join(tmpdir(), 'pyapi-history-preflight-'));
  try {
    mkdirSync(join(root, 'scripts/pyapi/golden'), { recursive: true });
    mkdirSync(join(root, 'specs'));
    writeFileSync(join(root, 'scripts/pyapi/pages.json'), JSON.stringify({ pages: ['one', 'two'].map(page => ({ page })) }));
    writeFileSync(join(root, 'scripts/pyapi/sdk-pin.json'), JSON.stringify(pin));
    writeFileSync(join(root, 'scripts/pyapi/anchor-retirements.json'), '[]');
    writeFileSync(join(root, 'scripts/pyapi/deployed-anchors.json'), JSON.stringify(deployed([postGolden])));
    for (const page of ['one', 'two']) {
      writeFileSync(join(root, `scripts/pyapi/golden/${page}.json`), JSON.stringify({ classes: [], module_level: [] }));
    }
    const doc = document();
    if (moved) doc.entries.push({ path: postGolden[1], page: 'two' });
    writeFileSync(join(root, 'specs/openprotein.json'), JSON.stringify(doc));
    const cli = fileURLToPath(new URL('./check-pyapi.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [cli], { cwd: root, encoding: 'utf8', env: { ...process.env, CHROME_PATH: '/no/such/browser' } });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Missing historical anchor disposition: one#openprotein.PostGolden/);
    assert.doesNotMatch(result.stderr, /browserType.launch/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});


import "./check-pyapi-consumers.mjs";


test('cross-page section links require one real unique heading; symbols always require publication', () => {
  const universe = new Map([['openprotein.A', 'one']]);
  const pages = ['one', 'two'];
  const headings = new Map([['two', new Map([['section', { headings: 1, ids: 1 }], ['duplicate', { headings: 2, ids: 2 }], ['collision', { headings: 1, ids: 2 }], ['openprotein.Retired', { headings: 1, ids: 1 }]])]]);
  assert.equal(referenceTargetValid('two', 'section', universe, pages, headings), true);
  assert.equal(referenceTargetValid('one', 'openprotein.A', universe, pages, headings), true);
  for (const [page, fragment] of [['one', 'section'], ['unknown', 'section'], ['two', 'missing'], ['two', 'duplicate'], ['two', 'collision'], ['two', 'openprotein.Retired'], ['two', 'openprotein.A']]) {
    assert.equal(referenceTargetValid(page, fragment, universe, pages, headings), false);
  }
});

test('new curated page has current anchors without fabricated golden history', () => {
  const universe = new Map([['openprotein.New', 'new'], ['openprotein.New.method', 'new']]);
  const { expected, checked, retired } = currentPageAnchors('new', new Map([['one', new Set()]]), new Map([['one', new Set()]]), universe);
  assert.deepEqual(expected, []);
  assert.deepEqual(checked, ['openprotein.New', 'openprotein.New.method']);
  assert.deepEqual(anchorFindings(['openprotein.New'], checked, retired).missing, ['openprotein.New.method']);
  assert.equal(referenceTargetValid('new', 'openprotein.New.method', universe, ['one', 'new'], new Map()), true);
  assert.equal(referenceTargetValid('unlisted', 'openprotein.New.method', universe, ['one', 'new'], new Map()), false);
  assert.equal(referenceTargetValid('new', 'openprotein.Unknown', universe, ['one', 'new'], new Map()), false);
});

test('historical count excludes retired anchors while current anchors remain checked', () => {
  const historical = new Map([['one', new Set(['openprotein.Old', 'openprotein.Kept'])]]);
  const retired = new Map([['one', new Set(['openprotein.Old'])]]);
  const universe = new Map([['openprotein.Kept', 'one'], ['openprotein.Current', 'one']]);
  assert.deepEqual(currentPageAnchors('one', historical, retired, universe), {
    expected: ['openprotein.Kept'], checked: ['openprotein.Kept', 'openprotein.Current'], retired: ['openprotein.Old'],
  });
});
