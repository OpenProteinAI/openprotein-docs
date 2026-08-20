/** Builds specs/<id>.openapi.json for every rest-api page: vendored snapshots from a git ref, plus live service specs. */
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_DIR = path.join(ROOT, 'specs');

// The bot branch that resyncs the vendored *Spec.js files; track it rather than the stale copies in __old/.
const DEFAULT_REF = 'origin/spec-sync/openprotein-api';
const SNAPSHOT_DIR = 'source/_static/js';

const ORIGIN = {
  dev: 'https://dev.api.openprotein.ai',
  prod: 'https://api.openprotein.ai',
};

// The vendored specs declare no servers, so every request URL would resolve against the docs origin.
const SERVERS = [
  { url: ORIGIN.dev, description: 'Development' },
  { url: ORIGIN.prod, description: 'Production' },
];

// Fumadocs fetches tokenUrl verbatim without routing it through proxyUrl, so it must be our own login route.
const TOKEN_URL = '/api/auth/login';

const UNRESOLVED = 'UnresolvedExternalSchema';

const UNRESOLVED_SCHEMA = {
  title: 'Unresolved external schema',
  type: 'object',
  additionalProperties: true,
  description:
    'The upstream spec references this as an external file that is not bundled into the published document, so its shape is unknown.',
};

// Ported verbatim from __old/source/_static/js/getSwaggerJson.js.
const ALLOW = {
  assaydata: {
    paths: [
      '/api/v1/assaydata',
      '/api/v1/assaydata/metadata',
      '/api/v1/assaydata/{assay_id}',
      '/api/v1/assaydata/{assay_id}/sequences',
      '/api/v1/assaydata/{assay_id}/csv',
    ],
    schemas: [
      'AssayMetadata',
      'Body_create_assay_data_assaydata_post',
      'CriterionSchema',
      'DesignJob',
      'DesignJobResult',
      'DirectionEnum',
      'EmbedJob',
      'Embedding',
      'GeneticAlgorithmJobCreate',
      'HTTPExceptionResponse',
      'HTTPValidationError',
      'Job',
      'JobStatus',
      'JobType',
      'ModelCriterion',
      'NMutationsCriterion',
      'PredictJob',
      'PredictJobCreate',
      'PredictJobDetails',
      'PredictSingleSiteJob',
      'PredictSingleSiteJobCreate',
      'PredictSingleSiteJobDetails',
      'Prediction',
      'SubscoreMetadata',
      'TrainGraphPoint',
      'TrainJob',
      'TrainJobCreate',
      'ValidationError',
      'vault__schemas__workflow__predict__PredictJob__SequencePrediction',
      'vault__schemas__workflow__predict__PredictSingleSiteJob__SequencePrediction',
    ],
    tags: [
      {
        name: 'assaydata',
        description: 'Upload your dataset for use with /predictor and /design endpoints!',
      },
    ],
  },
  align: {
    paths: [
      '/api/v1/align/upload_prompt',
      '/api/v1/align/prompt',
      '/api/v1/align/msa',
      '/api/v1/align/metadata',
      '/api/v1/align/abnumber',
      '/api/v1/align/antibody_schema',
      '/api/v1/align/antibody/annotate',
      '/api/v1/align/clustalo',
      '/api/v1/align/mafft',
      '/api/v1/align/seed',
      '/api/v1/align/inputs',
    ],
    schemas: [
      'MSASamplingStrategy',
      'ValidationError',
      'HTTPExceptionResponse',
      'HTTPValidationError',
      'JobType',
      'JobStatus',
      'PromptJob',
      'AlignJob',
      'MSAType',
      'MSAMetadata',
      'InputsResponse',
      'MSAGeneratedMetaData',
      'MSASampledMetaData',
      'MSARawMetaData',
      'MSASeed',
      'Body_user_upload_prompt_align_upload_prompt_post',
      'Body_create_msa_job_align_msa_post',
      'Body_create_mafft_alignment_align_mafft_post',
      'Body_create_clustalo_alignment_align_clustalo_post',
      'Body_create_abnumber_alignment_align_abnumber_post',
      'AntibodyAnnotateRequest',
    ],
    tags: [
      { name: 'align data', description: 'Data, upload, and homology search' },
      { name: 'general msa', description: 'Multiple sequence aligners [General]' },
      { name: 'antibody msa', description: 'Multiple sequence aligners [Antibodies]' },
    ],
  },
  auth: {
    paths: ['/api/v1/jobs', '/api/v1/jobs/{job_id}', '/api/v1/auth/login'],
    schemas: [
      'HTTPExceptionResponse',
      'HTTPValidationError',
      'Job',
      'JobStatus',
      'JobType',
      'Token',
      'ValidationError',
      'securitySchemes',
      'JobMetadataUpdate',
    ],
    tags: [
      { name: 'auth', description: 'Login to authorize your API requests!' },
      { name: 'jobs', description: 'Track your submitted workflow jobs!' },
    ],
  },
};

const mainUrl = (origin) => `${origin}/openapi.json`;

const SPECS = [
  { id: 'fold', kind: 'snapshot', module: 'foldSpec' },
  { id: 'design', kind: 'snapshot', module: 'designSpec' },
  { id: 'predictor', kind: 'snapshot', module: 'predictorSpec' },
  // swaggerEmbeddings.js reads the vendored snapshot; the live doc.json is 403 on dev and prod.
  { id: 'embeddings', kind: 'snapshot', module: 'embeddingsSpec' },
  {
    id: 'prompt',
    kind: 'live',
    url: (origin) => `${origin}/api/v1/prompt/openapi.json`,
    // Seeded DB rows, not API surface: freezing dev's UUIDs would publish prod 404s.
    dropPaths: /^\/api\/v1\/prompt\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  },
  { id: 'assaydata', kind: 'live', url: mainUrl, allow: 'assaydata' },
  { id: 'align', kind: 'live', url: mainUrl, allow: 'align' },
  { id: 'auth', kind: 'live', url: mainUrl, allow: 'auth' },
  // /api/v1/models is not deployed yet, so parity with the current (empty) page means tolerating no paths.
  { id: 'models', kind: 'live', url: mainUrl, prefix: '/api/v1/models', allowEmpty: true },
];

const IDS = SPECS.map((s) => s.id);

function usage(message) {
  if (message) console.error(`sync-specs: ${message}`);
  console.error(
    'usage: node scripts/sync-specs.mjs [--env dev|prod] [--ref <git-ref>] [--only id,id] [--check]',
  );
  console.error(`ids: ${IDS.join(' ')}`);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { env: 'dev', ref: DEFAULT_REF, only: null, check: false };
  const take = (name, value, rest) => (value === undefined ? rest.shift() : value);
  const rest = [...argv];
  while (rest.length) {
    const [flag, inline] = rest.shift().split(/=(.*)/s);
    if (flag === '--check') opts.check = true;
    else if (flag === '--env') opts.env = take(flag, inline, rest);
    else if (flag === '--ref') opts.ref = take(flag, inline, rest);
    else if (flag === '--only')
      opts.only = (take(flag, inline, rest) ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    else if (flag === '--help' || flag === '-h') usage();
    else usage(`unknown argument ${flag}`);
  }
  if (!ORIGIN[opts.env]) usage(`--env must be dev or prod; got ${JSON.stringify(opts.env)}`);
  if (!opts.ref) usage('--ref needs a value');
  for (const id of opts.only ?? []) if (!IDS.includes(id)) usage(`--only: unknown id ${id}`);
  if (opts.only?.length === 0) usage('--only needs at least one id');
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const origin = ORIGIN[opts.env];

async function loadSnapshot(module, ref) {
  const file = `${SNAPSHOT_DIR}/${module}.js`;
  let raw;
  try {
    ({ stdout: raw } = await run('git', ['show', `${ref}:${file}`], {
      cwd: ROOT,
      maxBuffer: 1 << 28,
    }));
  } catch {
    throw new Error(`cannot read ${file} at ref ${ref} (git show ${ref}:${file})`);
  }
  const body = raw
    .replace(new RegExp(`^\\s*const\\s+${module}\\s*=\\s*`), '')
    .replace(/;?\s*export\s+default\s+\w+;?\s*$/, '');
  if (body === raw) throw new Error(`${file} is not a 'const ${module} = {...}' module`);
  // The snapshot is a JS object literal (unquoted keys, trailing commas), so JSON.parse cannot read it.
  const spec = new Function(`return (${body});`)();
  if (!spec || typeof spec !== 'object') throw new Error(`${file} did not evaluate to an object`);
  return { spec, source: `${module}.js@${ref}` };
}

async function loadLive(url) {
  let res;
  try {
    res = await fetch(url, { headers: { accept: 'application/json' } });
  } catch (error) {
    throw new Error(`fetch failed for ${url}: ${error.message}`);
  }
  if (!res.ok) throw new Error(`fetch failed for ${url}: HTTP ${res.status} ${res.statusText}`);
  let spec;
  try {
    spec = await res.json();
  } catch (error) {
    throw new Error(`${url} did not return JSON: ${error.message}`);
  }
  return { spec, source: url };
}

function eachRef(node, visit, at = '') {
  if (Array.isArray(node)) {
    node.forEach((item, i) => eachRef(item, visit, `${at}[${i}]`));
    return;
  }
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string') visit(value, at, node);
    else eachRef(value, visit, `${at}/${key}`);
  }
}

const schemaName = (ref) =>
  ref.startsWith('#/components/schemas/') ? ref.slice('#/components/schemas/'.length) : null;

function resolveRef(spec, ref) {
  const parts = ref.slice(1).split('/').filter(Boolean);
  let node = spec;
  for (const part of parts) {
    const key = part.replace(/~1/g, '/').replace(/~0/g, '~');
    if (!node || typeof node !== 'object' || !(key in node)) return undefined;
    node = node[key];
  }
  return node;
}

/** Grows the kept-schema set until every $ref resolves, rebuilding components.schemas in source order. */
function closeSchemas(spec, source, keep) {
  spec.components ??= {};
  const added = new Set();
  for (;;) {
    const schemas = {};
    for (const name of Object.keys(source)) if (keep.has(name)) schemas[name] = source[name];
    spec.components.schemas = schemas;
    const pending = new Set();
    eachRef(spec, (ref) => {
      const name = schemaName(ref);
      if (name && source[name] && !keep.has(name)) pending.add(name);
    });
    if (!pending.size) return added;
    for (const name of pending) {
      keep.add(name);
      added.add(name);
    }
  }
}

/** Applies a ported path/schema/tag allowlist, then pulls in schemas the kept paths still reference. */
function applyAllow(spec, allow, notes) {
  const source = spec.components?.schemas ?? {};
  const paths = {};
  for (const key of Object.keys(spec.paths ?? {})) {
    if (allow.paths.includes(key)) paths[key] = spec.paths[key];
  }
  const missingPaths = allow.paths.filter((p) => !paths[p]);
  if (missingPaths.length) notes.push(`allowlisted path gone upstream: ${missingPaths.join(', ')}`);

  const keep = new Set(allow.schemas.filter((name) => source[name]));
  const stale = allow.schemas.filter((name) => !source[name] && name !== 'securitySchemes');
  if (stale.length) notes.push(`allowlisted schema gone upstream: ${stale.join(', ')}`);

  spec.paths = paths;
  const added = closeSchemas(spec, source, keep);
  if (added.size)
    notes.push(
      `allowlist missed ${added.size} referenced schema(s), added: ${[...added].sort().join(', ')}`,
    );

  const used = new Set();
  eachRef(spec, (ref) => {
    const name = schemaName(ref);
    if (name) used.add(name);
  });
  const unused = [...keep].filter((name) => !used.has(name));
  if (unused.length) notes.push(`allowlisted but unreferenced: ${unused.sort().join(', ')}`);

  spec.tags = allow.tags;
}

/** Keeps only the paths under a prefix, the tags those paths use, and the schemas they reach. */
function applyPrefix(spec, prefix) {
  const paths = {};
  const used = new Set();
  for (const [key, item] of Object.entries(spec.paths ?? {})) {
    if (!key.startsWith(prefix)) continue;
    paths[key] = item;
    for (const op of Object.values(item)) for (const tag of op?.tags ?? []) used.add(tag);
  }
  spec.paths = paths;
  if (Array.isArray(spec.tags)) spec.tags = spec.tags.filter((tag) => used.has(tag.name));
  closeSchemas(spec, spec.components?.schemas ?? {}, new Set());
}

function patchServers(spec) {
  spec.servers = SERVERS;
}

function patchTokenUrl(spec, notes) {
  const schemes = Object.entries(spec.components?.securitySchemes ?? {});
  const rewritten = [];
  for (const [name, scheme] of schemes) {
    const flow = scheme?.flows?.password;
    if (!flow) continue;
    if (flow.tokenUrl !== TOKEN_URL) rewritten.push(`${name} (was ${flow.tokenUrl ?? 'unset'})`);
    flow.tokenUrl = TOKEN_URL;
  }
  return { schemes: schemes.map(([name]) => name), rewritten, notes };
}

/** Substitutes a permissive local schema for external $refs the upstream generator never bundled. */
function repairExternalRefs(spec, notes) {
  const repaired = [];
  eachRef(spec, (ref, at, node) => {
    if (ref.startsWith('#')) return;
    repaired.push({ ref, at });
    node.$ref = `#/components/schemas/${UNRESOLVED}`;
  });
  if (repaired.length) {
    spec.components ??= {};
    spec.components.schemas ??= {};
    spec.components.schemas[UNRESOLVED] = UNRESOLVED_SCHEMA;
    for (const { ref, at } of repaired)
      notes.push(`repaired dangling external $ref ${ref} at ${at || '/'}`);
  }
  return repaired;
}

/** Everything the fumadocs build would otherwise discover as a hard failure at render time. */
function validate(spec, entry) {
  const errors = [];
  if (!spec.info?.title) errors.push('info.title is missing or empty');
  if (!spec.openapi && !spec.swagger) errors.push('no openapi/swagger version');
  const pathCount = Object.keys(spec.paths ?? {}).length;
  if (pathCount === 0 && !entry.allowEmpty) errors.push('paths is empty');
  eachRef(spec, (ref, at) => {
    if (!ref.startsWith('#')) errors.push(`external $ref ${ref} at ${at || '/'}`);
    else if (resolveRef(spec, ref) === undefined)
      errors.push(`unresolvable $ref ${ref} at ${at || '/'}`);
  });
  const servers = (spec.servers ?? []).map((s) => s.url);
  if (servers.join(',') !== SERVERS.map((s) => s.url).join(','))
    errors.push(`servers not patched: ${JSON.stringify(servers)}`);
  return errors;
}

async function build(entry) {
  const notes = [];
  const loaded =
    entry.kind === 'snapshot'
      ? await loadSnapshot(entry.module, opts.ref)
      : await loadLive(entry.url(origin));
  const spec = loaded.spec;

  if (entry.allow) applyAllow(spec, ALLOW[entry.allow], notes);
  else if (entry.prefix) applyPrefix(spec, entry.prefix);

  if (entry.dropPaths) {
    const dropped = Object.keys(spec.paths ?? {}).filter((key) => entry.dropPaths.test(key));
    for (const key of dropped) delete spec.paths[key];
    if (dropped.length > 0) {
      notes.push(`dropped ${dropped.length} environment-specific path(s): ${dropped.join(', ')}`);
      if (Array.isArray(spec.tags)) {
        const used = new Set(
          Object.values(spec.paths).flatMap((item) =>
            Object.values(item).flatMap((op) => (op && typeof op === 'object' ? (op.tags ?? []) : [])),
          ),
        );
        spec.tags = spec.tags.filter((tag) => used.has(tag.name));
      }
    }
  }

  patchServers(spec);
  const auth = patchTokenUrl(spec, notes);
  const repaired = repairExternalRefs(spec, notes);
  const errors = validate(spec, entry);
  const json = `${JSON.stringify(spec, null, 1)}\n`;

  return {
    id: entry.id,
    source: loaded.source,
    json,
    notes,
    errors,
    repaired: repaired.length,
    schemes: auth.schemes,
    rewritten: auth.rewritten,
    paths: Object.keys(spec.paths ?? {}).length,
    schemas: Object.keys(spec.components?.schemas ?? {}).length,
    tags: (spec.tags ?? []).length,
    empty: Object.keys(spec.paths ?? {}).length === 0,
  };
}

const selected = SPECS.filter((s) => !opts.only || opts.only.includes(s.id));
const results = [];

for (const entry of selected) {
  try {
    results.push(await build(entry));
  } catch (error) {
    results.push({ id: entry.id, source: '-', errors: [error.message], notes: [] });
  }
}

const label = (r) => (r.errors.length ? 'FAIL' : r.notes.length || r.empty ? 'WARN' : 'ok');
const short = (source) => source.replace(`${origin}/`, '');

console.log(`ref ${opts.ref}  env ${opts.env} (${origin})  ${selected.length} specs\n`);

for (const r of results) {
  if (r.errors.length && r.json === undefined) {
    console.log(`${'FAIL'.padEnd(5)} ${r.id.padEnd(10)} ${r.errors[0]}`);
    continue;
  }
  const counts =
    `${String(r.paths).padStart(3)} paths ${String(r.schemas).padStart(3)} schemas ` +
    `${String(r.tags).padStart(2)} tags`;
  const bytes = `${String(Buffer.byteLength(r.json)).padStart(7)} B`;
  console.log(`${label(r).padEnd(5)} ${r.id.padEnd(10)} ${counts} ${bytes}  ${short(r.source)}`);
}

for (const r of results) {
  for (const note of r.notes) console.log(`\n  WARN  ${r.id}: ${note}`);
  if (r.empty) console.log(`\n  WARN  ${r.id}: no paths matched; the upstream service exposes none`);
  for (const error of r.errors) console.log(`\n  FAIL  ${r.id}: ${error}`);
}

const withAuth = results.filter((r) => r.schemes?.length);
console.log('');
for (const r of withAuth)
  console.log(
    `auth  ${r.id.padEnd(10)} securitySchemes ${r.schemes.join(', ')} - tokenUrl ` +
      (r.rewritten.length ? `rewritten for ${r.rewritten.join(', ')}` : `already ${TOKEN_URL}`),
  );
const noAuth = results.filter((r) => r.json && !r.schemes?.length).map((r) => r.id);
if (noAuth.length) console.log(`auth  (none)     no securitySchemes: ${noAuth.join(', ')}`);

const failed = results.filter((r) => r.errors.length);
if (failed.length) {
  console.error(`\nsync-specs FAILED: ${failed.length} of ${results.length} specs unusable.`);
  process.exit(1);
}

const outPath = (id) => path.join(OUT_DIR, `${id}.openapi.json`);
const current = async (id) => readFile(outPath(id), 'utf8').catch(() => null);

if (opts.check) {
  const drift = [];
  for (const r of results) {
    const on = await current(r.id);
    if (on === null) drift.push(`${r.id}: specs/${r.id}.openapi.json is missing`);
    else if (on !== r.json)
      drift.push(
        `${r.id}: specs/${r.id}.openapi.json is stale ` +
          `(${Buffer.byteLength(on)} B on disk, ${Buffer.byteLength(r.json)} B rebuilt)`,
      );
  }
  if (drift.length) {
    for (const d of drift) console.error(`\n  FAIL  ${d}`);
    console.error(`\n--check: ${drift.length} spec(s) out of date. Run node scripts/sync-specs.mjs`);
    process.exit(1);
  }
  console.log(`\n--check: all ${results.length} spec(s) match the committed output.`);
} else {
  await mkdir(OUT_DIR, { recursive: true });
  for (const r of results) await writeFile(outPath(r.id), r.json);
  const warned = results.filter((r) => r.notes.length || r.empty).length;
  console.log(`\nwrote ${results.length} spec(s) to specs/ (${warned} with warnings).`);
}
