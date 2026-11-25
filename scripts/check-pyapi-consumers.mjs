import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import vm from 'node:vm';
import ts from 'typescript';
import test from 'node:test';
import { historicalAnchors, publishedSpecs, referenceRetirements } from './pyapi/check-contract.mjs';

const loaded = new Map();
function load(file) {
  if (loaded.has(file)) return loaded.get(file);
  const source = readFileSync(file, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const require = (name) => {
    if (name === 'server-only') return {};
    if (name === 'react') return { cache: (fn) => fn };
    if (name === 'node:fs/promises') return fs;
    if (name === 'node:path') return path;
    if (name === 'node:util') return { isDeepStrictEqual };
    if (name === '@/lib/site') return { PY_API_URL: '/references/python-api' };
    if (name === '@/lib/python-doc') return { normaliseDocstring: (text) => text };
    if (name === '@/lib/python-api') return load('lib/python-api.ts');
    if (['@/lib/notebook', '@/lib/openapi', '@/lib/openapi-endpoints'].includes(name)) return new Proxy({}, { get: () => () => { throw new Error('Unexpected non-Python consumer'); } });
    throw new Error('Unexpected consumer import: ' + name);
  };
  vm.runInNewContext(code, { module, exports: module.exports, require, process, console, Map, Set });
  loaded.set(file, module.exports);
  return module.exports;
}
const records = JSON.parse(readFileSync('scripts/pyapi/anchor-retirements.json'));
const baseline = JSON.parse(readFileSync('scripts/pyapi/deployed-anchors.json'));
const historical = new Set(baseline.anchors.map(([, id]) => id));
const entries = readdirSync('specs').filter((p) => /^openprotein.*\.json$/.test(p)).flatMap((p) => JSON.parse(readFileSync('specs/' + p)).entries).filter((e) => e.page && !e.summary_only);
const published = new Map(entries.flatMap((e) => [[e.path, e.page], ...(e.members ?? []).map((m) => [e.path + '.' + m.name, e.page])]));

test('current release dispositions exactly match golden and deployed publication', () => {
  const golden = new Map(readdirSync('scripts/pyapi/golden').filter((f) => f.endsWith('.json')).map((f) => {
    const g = JSON.parse(readFileSync('scripts/pyapi/golden/' + f));
    return [f.slice(0, -5), new Set([...g.classes.map((c) => c.path), ...g.classes.flatMap((c) => c.members.map((m) => m.path)), ...g.module_level.map((m) => m.id)])];
  }));
  const documents = readdirSync('specs').filter((f) => /^openprotein.*\.json$/.test(f)).map((f) => [f, JSON.parse(readFileSync('specs/' + f))]);
  const pin = JSON.parse(readFileSync('scripts/pyapi/sdk-pin.json'));
  assert.doesNotThrow(() => referenceRetirements(historicalAnchors(golden, baseline), publishedSpecs(documents, pin), records));
});

test('canonical and retired future RST roles produce real target links', async () => {
  const { rewriteRstRoles } = load('lib/rst-roles.ts');
  for (const name of ['EmbeddingFuture', 'FitFuture', 'StructurePredictionFuture']) {
    const target = 'openprotein.jobs.' + name;
    assert.equal(published.get(target), 'jobs');
    const old = name === 'FitFuture' ? 'openprotein.models.future.FitFuture' : 'openprotein.models.' + name;
    for (const spelling of [old, target]) {
      const text = await rewriteRstRoles(':py:class:`' + spelling + '`');
      assert.ok(text.includes('](/references/python-api/jobs#' + target + ')'), text);
    }
  }
  assert.equal(await rewriteRstRoles(':py:class:`openprotein.NoSuchType`'), '`NoSuchType`');
});

test('Python search, Markdown and LLM text include every seeded class and member', async () => {
  const { pageText, generatedSearchText } = load('lib/page-text.ts');
  for (const name of ['models', 'jobs', 'data', 'predictor', 'clustering']) {
    const page = { path: `references/python-api/${name}.mdx`, url: `/references/python-api/${name}`, data: { pythonApi: true } };
    const markdown = await pageText(page);
    const search = await generatedSearchText(page);
    for (const [id, owner] of published) if (owner === name) {
      assert.ok(markdown.includes(id), `Markdown/LLM omission: ${id}`);
      const escaped = id.replace(/[\\`*_[\]<>#]/g, '\\$&');
      assert.ok(search.includes('[#' + escaped + ']'), `Search anchor omission: ${id}`);
    }
  }
});

test('specialized task result cards link only exact inherited contracts to Future', async () => {
  const { readPyEntry, sharedTaskMembers } = load('lib/python-api.ts');
  const { entry, document } = await readPyEntry('openprotein.jobs.EmbeddingFuture');
  const shared = sharedTaskMembers(entry, document);
  assert.equal(shared.size, 20);
  assert.equal(shared.get('status'), 'openprotein.jobs.Future.status');
  assert.equal(shared.get('outputs'), 'openprotein.jobs.Future.outputs');
  for (const name of ['get', 'get_item', 'stream', 'unit', 'units', 'wait']) {
    assert.equal(shared.has(name), false);
  }
  const changed = { ...entry, members: entry.members.map((member) =>
    member.name === 'status' ? { ...member, annotation: 'str' } : member,
  ) };
  assert.equal(sharedTaskMembers(changed, document).has('status'), false);
  assert.equal(sharedTaskMembers({ ...entry, section: 'Fitted-model results' }, document).size, 0);
});

test('Jobs Markdown preserves shared aliases and the specialized result types', async () => {
  const { pageText } = load('lib/page-text.ts');
  const markdown = await pageText({ path: 'references/python-api/jobs.mdx', data: { pythonApi: true } });
  const embedding = markdown.split('<a id="openprotein.jobs.EmbeddingFuture"></a>')[1]
    .split('<a id="openprotein.jobs.IndelScoreFuture"></a>')[0];
  assert.ok(embedding.includes('<a id="openprotein.jobs.EmbeddingFuture.status"></a>[`status`](#openprotein.jobs.Future.status)'));
  assert.doesNotMatch(embedding, /^#+ openprotein\.jobs\.EmbeddingFuture\.status\b/m);
  const wait = embedding.split('<a id="openprotein.jobs.EmbeddingFuture.wait"></a>')[1].split('**Shared Future members:**')[0];
  assert.match(wait, /`list\[np\.ndarray\]`/);
  assert.match(markdown, /^#+ openprotein\.jobs\.Future\.status\b/m);
});

test('published notebook roles never silently degrade after migration', async () => {
  const { rewriteRstRoles } = load('lib/rst-roles.ts');
  function walk(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(directory, e.name)) : [path.join(directory, e.name)]);
  }
  for (const file of walk('content/notebooks').filter((f) => f.endsWith('.ipynb'))) {
    const notebook = JSON.parse(readFileSync(file));
    for (const cell of notebook.cells) if (cell.cell_type === 'markdown') {
      const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
      const roles = source.match(/:(?:py:)?(?:class|meth|func|attr|obj|mod|exc|data):`[^`]+`/g) ?? [];
      for (const role of roles) {
        const target = (role.match(/<([^>]+)>/)?.[1] ?? role.split('`')[1]).replace(/^~/, '').trim();
        if (!historical.has(target)) continue;
        const rendered = await rewriteRstRoles(role);
        const row = records.find((r) => r.anchor === target);
        if (row?.removed && !published.has(target)) assert.ok(!rendered.includes(']('));
        else assert.ok(rendered.includes('](/references/python-api/'), `${file}: ${role}`);
      }
    }
  }
});

test('canonical clustering RST role resolves to its reference page', async () => {
  const { rewriteRstRoles } = load('lib/rst-roles.ts');
  const rendered = await rewriteRstRoles(':py:class:`openprotein.clustering.ClusteringAPI`');
  assert.ok(rendered.includes('](/references/python-api/clustering#openprotein.clustering.ClusteringAPI)'), rendered);
});


test('Python Markdown preserves contracts and summary links', async () => {
  const { pageText } = load('lib/page-text.ts');
  const page = (name) => ({ path: `references/python-api/${name}.mdx`, url: `/references/python-api/${name}`, data: { pythonApi: true } });
  const models = await pageText(page('models'));
  assert.match(models, /openprotein\.models\.ProteinLanguageModel\.embed\(sequences/);
  assert.match(models, /AssayDataset/);
  const jobs = await pageText(page('jobs'));
  assert.match(jobs, /list\[np\.ndarray\]/);
  assert.match(jobs, /list\[Any\]/);
  const index = await pageText(page('index'));
  assert.match(index, /\]\(\/references\/python-api\/models#openprotein\.models\.ModelsAPI\)/);
  assert.match(index, /openprotein\.models\.ModelsAPI/);
});

test('closed card summaries use concise source prose and curated empty-doc fallbacks', async () => {
  const { readPyEntry, pyEntrySummary } = load('lib/python-api.ts');
  const model = (await readPyEntry('openprotein.models.ProteinLanguageModel')).entry;
  const status = (await readPyEntry('openprotein.jobs.JobStatus')).entry;
  assert.match(pyEntrySummary(model), /protein language model/i);
  assert.match(pyEntrySummary(status), /status/i);
  assert.ok(!pyEntrySummary(model).includes('``'));
  for (const file of ['components/python-api/py-class.tsx', 'components/python-api/py-function.tsx']) {
    assert.match(readFileSync(file, 'utf8'), /summary=\{pyEntrySummary\(entry\)\}/);
  }
  const card = readFileSync('components/python-api/collapsible.tsx', 'utf8');
  assert.match(card, /useState\(false\)/);
  assert.match(card, /\{summary\}/);
  assert.match(card, /open \? '' : 'hidden'/);
});

test('Markdown overloads render clean signatures and selected enum values', async () => {
  const { unified } = await import('unified');
  const { default: remarkParse } = await import('remark-parse');
  const { pageText, codeSpan } = load('lib/page-text.ts');
  const { pyMemberValue } = load('lib/python-api.ts');
  const page = (name) => ({ path: `references/python-api/${name}.mdx`, url: `/references/python-api/${name}`, data: { pythonApi: true } });
  const models = await pageText(page('models'));
  const parser = unified().use(remarkParse);
  assert.equal(parser.parse(codeSpan('a`b')).children[0].children[0].value, 'a`b');
  assert.equal(pyMemberValue({ value: 'Field(description="required")', display_value: null }), null);
  assert.equal(pyMemberValue({ value: 'Field(default=None)', display_value: 'None' }), 'None');
  assert.equal(pyMemberValue({ value: "'rbf'" }), "'rbf'");
  const tree = parser.parse(models);
  const nodes = [];
  const walk = (n) => { nodes.push(n); for (const c of n.children ?? []) walk(c); };
  walk(tree);
  const plain = (n) => n.value ?? (n.children ?? []).map(plain).join('');
  assert.ok(nodes.some((n) => n.type === 'listItem' && plain(n).includes('GP(*, id: str)')));
  assert.ok(nodes.some((n) => n.type === 'link' && n.url === '/references/python-api/data#openprotein.data.Assay'));
  for (const [name, path, value] of [['jobs','JobStatus.CREATED',"'CREATED'"],['predictor','KernelType.RBF',"'rbf'"],['predictor','FeatureType.PLM',"'PLM'"]]) {
    const md = await pageText(page(name));
    assert.match(md, new RegExp(path.replaceAll('.', '\\.') + '[\\s\\S]{0,100}' + value));
  }
  assert.doesNotMatch(models, /= `Field\(/);
});

test('processed index expands each raw summary in its own Markdown section', async () => {
  const { unified } = await import('unified');
  const { default: remarkParse } = await import('remark-parse');
  const { pageText, generatedSearchText } = load('lib/page-text.ts');
  const raw = readFileSync('content/docs/references/python-api/index.mdx', 'utf8');
  const rawSummaries = [...raw.matchAll(/<PySummary\s+paths=\{\[([\s\S]*?)\]\}\s*\/>/g)];
  const expected = rawSummaries.map((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((v) => v[1]));
  let i = 0;
  const processed = raw.replace(/^---[\s\S]*?---\s*/, '').replace(/<PySummary\s+paths=\{\[[\s\S]*?\]\}\s*\/>/g, () => i++ === 3 ? '<PySummary />' : '<PySummary paths={["processed"]} />');
  const page = { path: 'references/python-api/index.mdx', url: '/references/python-api', data: { pythonApi: true, getText: async () => processed } };
  const text = await pageText(page);
  const parser = unified().use(remarkParse);
  function sections(md) {
    const map = []; let section;
    for (const n of parser.parse(md).children) {
      if (n.type === 'heading' && n.depth === 2) { section = { name: n.children.map((x) => x.value ?? '').join(''), paths: [] }; map.push(section); }
      if (section && n.type === 'list') for (const item of n.children) {
        const link = item.children?.[0]?.children?.find((x) => x.type === 'link');
        if (link?.url?.startsWith('/references/python-api/')) section.paths.push(link.url.split('#')[1]);
      }
    }
    return map;
  }
  const actual = sections(text);
  assert.deepEqual(actual.map((s) => s.paths), expected);
  assert.equal(actual[3].name, 'Models');
  assert.equal(actual[3].paths.length, 50);
  assert.deepEqual(actual[3].paths.slice(-2), ['openprotein.models.RFdiffusionFuture', 'openprotein.models.BoltzGenFuture']);
  assert.doesNotMatch(text, /<PySummary\b/);
  assert.deepEqual(actual.map((s) => s.name), sections(processed).map((s) => s.name));
  const search = await generatedSearchText(page);
  let cursor = 0;
  for (const dotted of expected.flat()) {
    cursor = search.indexOf(`#${dotted})`, cursor);
    assert.notEqual(cursor, -1, `search summary order: ${dotted}`);
    cursor += dotted.length;
  }
  for (const section of processed.split(/(?=^## )/m).slice(1)) {
    const prose = section.split('\n').find((line) => line && !line.startsWith('#') && !line.startsWith('<'));
    if (prose) assert.ok(text.includes(prose), prose);
  }
  assert.notDeepEqual(sections(text.replace('- [`openprotein.models.ModelsAPI`]', '- [`openprotein.models.ModelsAPI`]' + '\n\n## Wrong section\n')) .map((s) => s.paths), expected);
  assert.notDeepEqual(sections(text + '\n\n- [`openprotein.models.ModelsAPI`](/references/python-api/models#openprotein.models.ModelsAPI)\n').map((s) => s.paths), expected);
  assert.notDeepEqual(sections(processed).map((s) => s.paths), expected);
});

test('processed module expands groups and cards in place without touching fenced examples', async () => {
  const { unified } = await import('unified');
  const { default: remarkParse } = await import('remark-parse');
  const { pageText } = load('lib/page-text.ts');
  const raw = readFileSync('content/docs/references/python-api/data.mdx', 'utf8');
  const processed = raw.replace(/^---[\s\S]*?---\s*/, '')
    .replace(/<PyGroup\b[\s\S]*?>/g, '<PyGroup>')
    .replace(/<PyClass\b[^>]*\/>/g, '<PyClass />');
  const page = { path: 'references/python-api/data.mdx', url: '/references/python-api/data', data: { pythonApi: true, getText: async () => processed } };
  const text = await pageText(page);
  const tree = unified().use(remarkParse).parse(text);
  const headings = tree.children.filter((n) => n.type === 'heading').map((n) => [n.depth, n.children.map((c) => c.value ?? '').join('')]);
  assert.deepEqual(headings.filter(([depth]) => depth === 2).map(([, name]) => name), ['Interface', 'Classes', 'Referenced types', 'Alignments and sampled prompts']);
  assert.ok(headings.some(([depth, name]) => depth === 3 && name.startsWith('openprotein.data.DataAPI')));
  assert.equal(headings.filter(([, name]) => name.startsWith('openprotein.data.DataAPI(')).length, 1);
  assert.doesNotMatch(text, /<\/?Py(?:Group|Class|Function)\b/);
  assert.ok(text.indexOf('Types referenced by the interfaces above.') < text.indexOf('<a id="openprotein.data.MSAMetadata">'));
  assert.doesNotMatch(text, /session\.data\.(?:msa|prompts)\b|<a id="openprotein\.data\.(?:MSADataAPI|PromptsAPI)">/);
  await assert.rejects(pageText({ ...page, data: { ...page.data, getText: async () => processed.replace('<PyClass />', '') } }), /count mismatch/);
});

test('missing Python entries fail rendered Markdown but not search', async () => {
  const { pageText, generatedSearchText } = load('lib/page-text.ts');
  const dir = await fs.mkdtemp('content/docs/py-markdown-missing-');
  const file = path.join(dir, 'page.mdx');
  try {
    for (const kind of ['PyClass', 'PyFunction']) {
      await fs.writeFile(file, `<${kind} path="openprotein.NoSuchEntry" />`);
      const page = { path: path.relative('content/docs', file), url: '/test', data: { pythonApi: true, getText: async () => `<${kind} />` } };
      await assert.rejects(pageText(page));
      assert.equal(await generatedSearchText(page), '');
      await assert.rejects(pageText({ ...page, data: { pythonApi: true } }));
    }
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('molecule constructor Markdown parameter tables exclude private structure field', async () => {
  const { pageText } = load('lib/page-text.ts');
  const page = { path: 'references/python-api/molecules.mdx', url: '/references/python-api/molecules', data: { pythonApi: true } };
  const text = await pageText(page);
  for (const name of ['Ligand', 'DNA', 'RNA']) {
    const entry = entries.find((entry) => entry.path === `openprotein.molecules.${name}`);
    const section = text.split(`## openprotein.molecules.${name}(`)[1].split('## openprotein.')[0];
    assert.ok(entry.signature.includes('_structure_block'));
    assert.ok(!entry.display_signature.includes('_structure_block'));
    assert.doesNotMatch(section, /_structure_block|StructureCIFBlock/);
    for (const item of entry.parsed.find((item) => item.kind === 'parameters').items) assert.ok(section.includes('`' + item.name + '`'));
  }
});

test('fenced Python-looking components remain literal while real cards expand', async () => {
  const { unified } = await import('unified');
  const { default: remarkParse } = await import('remark-parse');
  const { pageText } = load('lib/page-text.ts');
  const dir = await fs.mkdtemp('content/docs/py-markdown-test-');
  const file = path.join(dir, 'page.mdx');
  const raw = '```md\n<PyGroup id="fake" title="Fake">\n<PyClass path="fake" />\n</PyGroup>\n<PySummary paths={["fake"]} />\n```\n\n<PyGroup id="real" title="Real">\n<PyFunction path="openprotein.connect" />\n</PyGroup>\n';
  try {
    await fs.writeFile(file, raw);
    const page = { path: path.relative('content/docs', file), url: '/test', data: { pythonApi: true, getText: async () => raw.replace('<PyFunction path="openprotein.connect" />', '<PyFunction />') } };
    const text = await pageText(page);
    const tree = unified().use(remarkParse).parse(text);
    assert.equal(tree.children[0].type, 'code');
    assert.equal(tree.children[0].value, raw.split('```')[1].replace(/^md\n/, '').trimEnd());
    assert.ok(tree.children.some((node) => node.type === 'heading' && node.depth === 2 && node.children[0].value === 'Real'));
    assert.ok(!text.includes('<PyFunction />'));
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('ordinary documents retain their processed text and empty Python fallback is safe', async () => {
  const { pageText } = load('lib/page-text.ts');
  const prose = '# Ordinary\n\nA paragraph.\n';
  assert.equal(await pageText({ path: 'ordinary.mdx', url: '/ordinary', data: { getText: async () => prose } }), prose.trim());
  assert.equal(await pageText({ path: 'missing-python.mdx', url: '/missing', data: { pythonApi: true } }), '');
});

test('nested level-3 groups nest in the TOC and in rendered Markdown, empty ones included', async () => {
  const { unified } = await import('unified');
  const { default: remarkParse } = await import('remark-parse');
  const { pageText } = load('lib/page-text.ts');
  const { pyToc } = load('lib/python-api.ts');
  const dir = await fs.mkdtemp('content/docs/py-nested-group-');
  const file = path.join(dir, 'page.mdx');
  const raw = [
    '## Models', '',
    '<PyGroup id="family" title="Family" level={3}', '  anchors={[', '    "openprotein.connect",', '  ]}', '>', '',
    '<PyFunction path="openprotein.connect" />', '', '</PyGroup>', '',
    '<PyGroup id="empty" title="Empty" level={3}', '  anchors={[]}', '>', '', 'Only a table.', '', '</PyGroup>', '',
    '<PyGroup id="flat" title="Flat"', '  anchors={[', '    "openprotein.connect",', '  ]}', '>', '',
    '<PyFunction path="openprotein.connect" />', '', '</PyGroup>', '',
  ].join('\n');
  try {
    await fs.writeFile(file, raw);
    const pagePath = path.relative('content/docs', file);
    const toc = await pyToc(pagePath, [{ title: 'Models', url: '#models', depth: 2 }]);
    assert.deepEqual(Array.from(toc, (item) => [item.url, item.depth]), [
      ['#models', 2], ['#family', 3], ['#openprotein.connect', 4], ['#empty', 3], ['#flat', 2], ['#openprotein.connect', 3],
    ]);
    const processed = raw.replace(/<PyGroup\b[\s\S]*?>/g, (tag) => tag.replace(/\s+/g, ' ').replace(/ anchors=\{\[[^\]]*\]\}/, '')).replace(/<PyFunction[^>]*\/>/g, '<PyFunction />');
    const text = await pageText({ path: pagePath, url: '/test', data: { pythonApi: true, getText: async () => processed } });
    const headings = unified().use(remarkParse).parse(text).children
      .filter((n) => n.type === 'heading')
      .map((n) => [n.depth, n.children.map((c) => c.value ?? '').join('').split('(')[0]]);
    assert.deepEqual(headings, [
      [2, 'Models'], [3, 'Family'], [4, 'openprotein.connect'], [3, 'Empty'], [2, 'Flat'], [3, 'openprotein.connect'],
    ]);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
