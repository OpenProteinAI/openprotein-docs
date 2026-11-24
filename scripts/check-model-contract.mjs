/** Checks family names on cards, base model pages and the sidebar, and the method and version contracts. */
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// Node's type stripping preserves Next's `@/` imports.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith('@/')) return nextResolve(specifier, context);
    return nextResolve(pathToFileURL(`${ROOT}${specifier.slice(2)}.ts`).href, context);
  },
});

const { baseModelCards, buildModelCards, sortModelCards } = await import('../lib/model-cards.ts');
const { baseModelViews, modelSlug, versionDescription } = await import('../lib/base-models.ts');
const { isVersionsFolder, modelPageUrl, versionPageUrl, withModelsSection } = await import('../lib/models-tree.ts');

const model = (model_id, family_id, name = model_id) => ({
  model_id,
  family_id,
  name,
  is_system: true,
  description: { summary: `${name} summary` },
  dimension: -1,
  methods: [{ input: 'batch', output: 'embeddings', outputs: ['embeddings'] }],
  max_sequence_length: 1024,
});
const doc = (id, name, extra = {}) => ({ id, name, ...extra });

const models = [
  model('poet-2', 'poet', 'PoET 2'),
  model('esm1b', 'esm1', 'ESM1b'),
  model('esm2-650m', 'esm2', 'ESM2 650M'),
  model('esmc-300m', 'esmc', 'ESMC 300M'),
  model('esm-if1', 'esm-if', 'ESM-IF1'),
  model('esmfold', 'esmfold', 'ESMFold'),
  model('protseq', 'protseq', 'ProtSeq'),
  model('mystery', null, 'Mystery'),
];
const docs = [
  doc('poet', 'PoET', { summary: 'poet doc' }),
  doc('esm1', 'ESM1'),
  doc('esm2', 'ESM2'),
  doc('esmc', 'ESMC'),
  doc('esm-if', 'ESM-IF'),
  doc('esmfold', 'ESMFold'),
  doc('protseq', 'ProtSeq'),
  doc('rosettafold', 'RosettaFold'),
];

const cards = buildModelCards(models, docs);
const byId = Object.fromEntries(cards.map((card) => [card.id, card]));

const expected = {
  'poet-2': ['poet', 'PoET'],
  esm1b: ['esm1', 'ESM1'],
  'esm2-650m': ['esm2', 'ESM2'],
  'esmc-300m': ['esmc', 'ESMC'],
  'esm-if1': ['esm-if', 'ESM-IF'],
  esmfold: ['esmfold', 'ESMFold'],
  protseq: ['protseq', 'ProtSeq'],
  mystery: ['other', 'Other'],
};
for (const [id, [family, familyName]] of Object.entries(expected)) {
  assert.deepEqual([byId[id].family, byId[id].familyName], [family, familyName], id);
  assert.equal(byId[id].info.find((row) => row.label === 'Family').value, familyName, `${id} info row`);
}

assert.equal(buildModelCards([model('x', 'unknown-fam')], [])[0].familyName, 'unknown-fam');

// Base models: one page per `model`, in the order `/models` lists them.
const views = baseModelViews(
  [
    { ...model('poet', 'poet', 'PoET'), model: 'PoET' },
    { ...model('esm2-8m', 'esm2', 'ESM2 (8M)'), model: 'ESM2', variant: '8M', description: { summary: 'ESM2.\n\n8M.' } },
    { ...model('esm2-650m', 'esm2', 'ESM2 (650M)'), model: 'ESM2', variant: '650M', base: true, description: { summary: 'ESM2.\n\n650M.' } },
    { ...model('poet-2', 'poet', 'PoET-2'), model: 'PoET-2' },
    model('mystery', null, 'Mystery'),
    { ...model('x', 'unknown-fam', 'X'), model: 'X' },
  ],
  docs,
);
assert.deepEqual(
  views.map((view) => [view.id, view.name, view.versions.map((card) => card.id), view.defaultVersion]),
  [
    ['poet', 'PoET', ['poet'], 'poet'],
    ['esm2', 'ESM2', ['esm2-8m', 'esm2-650m'], 'esm2-650m'],
    ['poet-2', 'PoET-2', ['poet-2'], 'poet-2'],
    ['mystery', 'Mystery', ['mystery'], 'mystery'],
    ['x', 'X', ['x'], 'x'],
  ],
);
const esm2 = views.find((view) => view.id === 'esm2');
assert.equal(esm2.summary, 'ESM2.');
assert.deepEqual(esm2.versions.map((card) => [card.version, versionDescription(card)]), [['8M', '8M.'], ['650M', '650M.']]);
assert.deepEqual(['ESM2', 'Boltz-1', 'ESM-IF1', 'ProtT5-XL'].map(modelSlug), ['esm2', 'boltz-1', 'esm-if1', 'prott5-xl']);

// A version's page: the base model's for its default, else one under it by its label.
assert.deepEqual(esm2.versionSlugs, { 'esm2-8m': '8m', 'esm2-650m': '' });
assert.deepEqual(
  esm2.versions.map((card) => versionPageUrl(esm2, card.id)),
  ['/models/esm2/8m', '/models/esm2'],
);
// Labels that slug alike fall back to the model id.
const [twins] = baseModelViews([
  { ...model('a-1', 'f', 'A 1'), model: 'A', variant: 'v1', base: true },
  { ...model('a-2', 'f', 'A 2'), model: 'A', variant: 'V 2' },
  { ...model('a-3', 'f', 'A 3'), model: 'A', variant: 'v-2' },
]);
assert.deepEqual(twins.versionSlugs, { 'a-1': '', 'a-2': 'a-2', 'a-3': 'a-3' });

const sidebar = (docs, models) =>
  withModelsSection({ name: 'root', children: [] }, docs, models)
    .children.at(-1)
    .children.slice(1)
    .map((entry) => [entry.name, entry.url]);

assert.deepEqual(sidebar(docs, models), [
  ['PoET 2', modelPageUrl('poet-2')],
  ['ESM1b', modelPageUrl('esm1b')],
  ['ESM2 650M', modelPageUrl('esm2-650m')],
  ['ESMC 300M', modelPageUrl('esmc-300m')],
  ['ESM-IF1', modelPageUrl('esm-if1')],
  ['ESMFold', modelPageUrl('esmfold')],
  ['ProtSeq', modelPageUrl('protseq')],
  ['Mystery', modelPageUrl('mystery')],
]);
assert.equal(modelPageUrl('esm-if1'), '/models/esm-if1');

// A base model with versions is a folder of their pages, its own page the index.
const tree = withModelsSection({ name: 'root', children: [] }, docs, [
  { ...model('esm2-8m', 'esm2', 'ESM2 (8M)'), model: 'ESM2', variant: '8M' },
  { ...model('esm2-650m', 'esm2', 'ESM2 (650M)'), model: 'ESM2', variant: '650M', base: true },
]);
const folder = tree.children.at(-1).children[1];
assert.equal(isVersionsFolder(folder), true);
assert.deepEqual([folder.index.url, folder.children.map((page) => [page.name, page.url])], [
  '/models/esm2',
  [['8M', '/models/esm2/8m']],
]);

const pathModels = models.map((model) => ({
  ...model,
  methods: model.methods.map(({ input, output, ...method }) => ({
    ...method,
    path: `${input}/${output}`,
  })),
}));
const before = structuredClone(pathModels);
assert.deepEqual(buildModelCards(pathModels, docs), cards);
assert.deepEqual(pathModels, before);

const methods = [
  { path: 'single-site/scores', outputs: ['score', 'uncertainty'], default_output: 'score' },
  { path: 'indel/scores', outputs: ['score'], default_output: 'score' },
  { path: 'analysis/mutants/scores', outputs: ['score'], default_output: 'score' },
  { path: 'crossvalidate', outputs: ['predictions'], default_output: 'predictions' },
  { path: 'batch/structures', outputs: ['structures', 'confidence'], default_output: 'structures' },
];
const [pathCard] = buildModelCards([{ ...model('path-model', 'test'), methods, multichain: true }]);
// Split at the first slash, as the app's ModelApi does; actions aren't inference methods.
assert.deepEqual(pathCard.methods.map(({ path, input, output }) => ({ path, input, output })), [
  { path: 'single-site/scores', input: 'single-site', output: 'scores' },
  { path: 'indel/scores', input: 'indel', output: 'scores' },
  { path: 'analysis/mutants/scores', input: 'analysis', output: 'mutants/scores' },
  { path: 'batch/structures', input: 'batch', output: 'structures' },
]);
assert.deepEqual(pathCard.methodOutputs, ['scores', 'mutants/scores', 'structures']);
assert.deepEqual(
  pathCard.methodChips.map(({ output, methods }) => [output, methods.map((method) => method.path)]),
  [
    ['scores', ['single-site/scores', 'indel/scores']],
    ['mutants/scores', ['analysis/mutants/scores']],
    ['structures', ['batch/structures']],
  ],
);
assert.deepEqual(pathCard.methods[0].outputs, ['score', 'uncertainty']);
assert.equal(pathCard.methods[0].default_output, 'score');
assert.deepEqual(pathCard.tools.map(({ key }) => key), ['substitution_analysis', 'structure_prediction']);

// The structure tool requires batch/structures.
const { SITE } = await import('../lib/site.ts');
const structureMethod = { path: 'batch/structures', outputs: ['structures'] };
const legacyStructureMethod = { input: 'batch', output: 'structures', outputs: ['structures'] };
for (const method of [structureMethod, legacyStructureMethod]) {
  const [card] = buildModelCards([{ ...model('arbitrary /?', 'test'), tags: ['structure', 'fold'], methods: [method] }]);
  assert.deepEqual(card.tools, [{ key: 'structure_prediction', text: 'Structure prediction', href: `${SITE.appUrl}/fold?model=${encodeURIComponent('arbitrary /?')}` }]);
  assert.deepEqual(card.methodOutputs, ['structures']);
  assert.deepEqual(card.methodChips.map((chip) => chip.output), ['structures']);
}
for (const tags of [undefined, null, ['structure', 'fold']]) {
  const [card] = buildModelCards([{ ...model('predictor', 'test'), tags, methods: [structureMethod] }]);
  assert.deepEqual(card.tools, [{ key: 'structure_prediction', text: 'Structure prediction', href: `${SITE.appUrl}/fold?model=predictor` }]);
}
const [noStructures] = buildModelCards([{ ...model('tagged', 'test'), tags: ['structure'] }]);
assert.deepEqual(noStructures.tools.map(({ key }) => key), ['train', 'cluster', 'hit_selection']);
const [multiTool] = buildModelCards([{ ...model('multi', 'test'), tags: ['structure'], methods: [structureMethod, ...model('multi', 'test').methods, { path: 'batch/loglikelihood', outputs: ['loglikelihood'] }, { path: 'generate/sequences', outputs: ['sequences'] }] }]);
assert.deepEqual(multiTool.tools.map(({ key, href }) => [key, href]), [
  ['de_novo_design', `${SITE.appUrl}/generate?model=multi`],
  ['train', `${SITE.appUrl}/train?model=multi`],
  ['score_sequences', `${SITE.appUrl}/predict?model=multi`],
  ['substitution_analysis', `${SITE.appUrl}/substitutions?model=multi`],
  ['indel_analysis', `${SITE.appUrl}/indel?model=multi`],
  ['structure_prediction', `${SITE.appUrl}/fold?model=multi`],
  ['cluster', `${SITE.appUrl}/cluster?model=multi`],
  ['hit_selection', `${SITE.appUrl}/selection?model=multi`],
]);

// Input type is beside the methods, not a details row; multichain is one, first.
assert.deepEqual(pathCard.info.map((row) => [row.label, row.value]), [
  ['Family', 'test'],
  ['Max length', '1,024'],
]);
assert.deepEqual(pathCard.inputTypes, ['multichain', 'protein']);
assert.deepEqual(buildModelCards([{ ...model('x', 'x'), multichain: false }])[0].inputTypes, ['protein']);

// One card per base model: its `base` version, else its first.
const versioned = buildModelCards([
  { ...model('esm2-8m', 'esm2'), model: 'ESM2' },
  { ...model('esm2-650m', 'esm2'), model: 'ESM2', base: true },
  { ...model('esm1b', 'esm1'), model: 'ESM1' },
  { ...model('esm1v', 'esm1'), model: 'ESM1' },
  model('solo', 'solo'),
]);
assert.deepEqual(baseModelCards(versioned).map((card) => card.id).sort(), ['esm1b', 'esm2-650m', 'solo']);

// Relevance keeps the API's order; badges come from `badges`.
const listed = buildModelCards([
  { ...model('poet-2', 'poet', 'PoET-2'), badges: ['recommended', 'highlight'] },
  { ...model('esm2-650m', 'esm2', 'ESM2 (650M)'), model: 'ESM2', base: true, badges: ['highlight'] },
  { ...model('esm2-8m', 'esm2', 'ESM2 (8M)'), model: 'ESM2', badges: ['popular'] },
  { ...model('ablang2', 'ablang', 'AbLang2'), badges: ['new'], recommended: true },
]);
assert.deepEqual(
  listed.map((card) => [card.id, card.recommended, card.highlight, card.popular, card.isNew]),
  [
    ['poet-2', true, true, false, false],
    ['esm2-650m', false, true, false, false],
    ['esm2-8m', false, false, true, false],
    ['ablang2', false, false, false, true],
  ],
);
assert.deepEqual(sortModelCards(listed, 'relevant', 'asc').map((card) => card.id), listed.map((card) => card.id));
assert.deepEqual(sortModelCards(listed, 'relevant', 'desc').map((card) => card.id), ['ablang2', 'esm2-8m', 'esm2-650m', 'poet-2']);

// The sidebar follows the API's order, one entry per base model.
assert.deepEqual(
  baseModelViews([model('poet-2', 'poet', 'PoET-2'), model('protseq', 'protseq', 'ProtSeq'), model('poet', 'poet', 'PoET')], docs).map((view) => view.id),
  ['poet-2', 'protseq', 'poet'],
);

console.log('model contract: ok');
