/**
 * `pnpm update:pyapi` — the whole Python API reference pipeline, in one command.
 *
 *   pnpm update:pyapi              re-sync everything at the pinned SDK, then verify
 *   pnpm update:pyapi latest       bump to the newest release on PyPI first
 *   pnpm update:pyapi 0.18.0       bump to a named version first
 *   pnpm update:pyapi --check      verify only, write nothing (CI, pre-commit)
 *   pnpm update:pyapi --accept-delta   also record the SDK drift `--delta` proposed
 *   pnpm update:pyapi:models        first fetch the Models API listings and rewrite the catalogue snapshot
 *   pnpm update:pyapi:models --report   fetch the listings, print drift against the snapshot, write nothing
 *
 * The Models sections of pages.json are derived from the committed snapshot by
 * scripts/pyapi/models_catalogue.py on every run (`--check` verifies them); only the two
 * `:models` forms touch the network.
 *
 * Everything mechanical is done here. The two steps that need a person are never done for
 * you — recording SDK drift as expected, and placing a new class on a page — because both
 * are judgements about what the docs should say. They come back as a worklist at the end.
 */
import './load-env.mjs';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const PY = '.venv-pyapi/bin/python';
const GEN = 'scripts/pyapi/generate.py';
const SEED = 'scripts/pyapi/seed_pages.py';
const CATALOGUE = 'scripts/pyapi/models_catalogue.py';
const REQS = 'scripts/pyapi/requirements.txt';
const SDK = 'scripts/pyapi/sdk.py';
const REPO = 'OpenProteinAI/openprotein-python';

const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const ACCEPT_DELTA = argv.includes('--accept-delta');
const MODELS = argv.includes('--models');
const REPORT = argv.includes('--report');
const target = argv.find((a) => !a.startsWith('--'));

let step = 0;
const stage = (name) => console.log(`\n[${++step}] ${name}`);
const die = (msg) => {
  console.error(`\nFAILED: ${msg}`);
  process.exit(1);
};

/** Run a command, streaming its output. Returns false instead of throwing when `soft`. */
function run(cmd, args, { soft = false, quiet = false } = {}) {
  try {
    const out = execFileSync(cmd, args, { encoding: 'utf8', stdio: quiet ? 'pipe' : 'inherit' });
    return quiet ? out : true;
  } catch (error) {
    if (soft) return false;
    die(`${cmd} ${args.join(' ')}`);
  }
}

/**
 * Rewrite one line of a pinned file. Dies when the pattern no longer matches: a silently
 * skipped substitution would leave the pin stale while the run still looked like a success,
 * and every [source] line number in specs/ depends on that pin being right.
 */
function repin(text, pattern, replacement, what) {
  if (!pattern.test(text)) die(`${what}: pattern no longer matches — update scripts/update-pyapi.mjs`);
  return text.replace(pattern, replacement);
}

const json = async (url) => {
  const r = await fetch(url, { headers: { 'user-agent': 'openprotein-docs' } });
  if (!r.ok) die(`${url} -> ${r.status}`);
  return r.json();
};

if (!existsSync(PY)) {
  die(`${PY} is missing. Create a fresh pinned interpreter; see README.md`);
}

if (REPORT && !MODELS) die('--report belongs to pnpm update:pyapi:models');
if (MODELS && (CHECK || target || ACCEPT_DELTA)) die('--models cannot be combined with --check, --accept-delta or an SDK version');

if (REPORT) {
  // exit 1: the snapshot has drifted. exit 2: the listings could not be fetched or used.
  process.exit(spawnSync(PY, [CATALOGUE, '--report'], { stdio: 'inherit' }).status ?? 2);
}

const installed = run(PY, ['-c', 'from importlib.metadata import version; print(version("openprotein-python"))'], { quiet: true }).trim();

// ---------------------------------------------------------------- 1. the SDK version
stage('SDK version');
let wanted = installed;
if (CHECK && target) die('--check cannot select or fetch an SDK version');
if (target === 'latest') {
  wanted = (await json('https://pypi.org/pypi/openprotein-python/json')).info.version;
  console.log(`  latest on PyPI: ${wanted}`);
} else if (target) {
  wanted = target;
}
console.log(`  installed: ${installed}   target: ${wanted}`);

const sourcePinned = Boolean(target) && /^openprotein-python\s+@\s+git\+/m.test(readFileSync(REQS, 'utf8'));
if (wanted !== installed || sourcePinned) {
  if (CHECK) die(`--check cannot bump ${installed} -> ${wanted}; run without --check`);

  // ------------------------------------------------------------- 2. pin the exact tree
  stage(`Pinning ${wanted} to its commit`);
  const ref = await json(`https://api.github.com/repos/${REPO}/git/ref/tags/v${wanted}`);
  if (!ref.object) die(`no tag v${wanted} in ${REPO}`);
  // An annotated tag is an object of its own; dereference it to the commit. `ref` is always
  // the COMMIT — a tag can be moved, and every [source] line number depends on one exact tree.
  const tagObject = ref.object.sha;
  const commit =
    ref.object.type === 'tag'
      ? (await json(`https://api.github.com/repos/${REPO}/git/tags/${tagObject}`)).object.sha
      : tagObject;
  console.log(`  v${wanted} -> tag ${tagObject.slice(0, 12)} -> commit ${commit.slice(0, 12)}`);

  let reqs = readFileSync(REQS, 'utf8');
  reqs = repin(reqs, /^openprotein-python(?:==| @ ).*$/m, `openprotein-python==${wanted}`, 'requirements pin');
  reqs = repin(reqs, /^# (?:Source branch|openprotein-python) .*$/m,
    `# openprotein-python ${wanted} == commit ${commit} (tag v${wanted}).`, 'requirements provenance comment');
  reqs = reqs.replace(/^# Git authentication.*\n/m, '');
  writeFileSync(REQS, reqs);

  stage('Rebuilding .venv-pyapi');
  run('pixi', ['run', 'venv']);

  // ------------------------------------------------------------- 3. prove wheel == commit
  stage('Proving the wheel is that exact tree');
  const site = run(PY, ['-c', "import sysconfig; print(sysconfig.get_paths()['purelib'])"], { quiet: true }).trim();
  const tree = await json(`https://api.github.com/repos/${REPO}/git/trees/${commit}?recursive=1`);
  if (tree.truncated) die('GitHub tree response is truncated');
  const remote = new Map(
    tree.tree.filter((e) => e.type === 'blob' && e.path.startsWith('openprotein/')).map((e) => [e.path, e.sha]),
  );
  const { createHash } = await import('node:crypto');
  const { readdirSync, statSync } = await import('node:fs');
  const walk = (dir, base) =>
    readdirSync(dir).flatMap((n) => {
      const p = `${dir}/${n}`;
      if (n === '__pycache__') return [];
      return statSync(p).isDirectory() ? walk(p, `${base}/${n}`) : [[`${base}/${n}`, p]];
    });
  const local = new Map(walk(`${site}/openprotein`, 'openprotein'));
  const bad = [];
  for (const [rel, path] of local) {
    const blob = readFileSync(path);
    const sha = createHash('sha1').update(`blob ${blob.length}\0`).update(blob).digest('hex');
    if (remote.get(rel) !== sha) bad.push(rel);
  }
  for (const rel of remote.keys()) if (!local.has(rel)) bad.push(`${rel} (absent from the wheel)`);
  if (bad.length) die(`the wheel differs from ${commit.slice(0, 12)}: ${bad.slice(0, 5).join(', ')}`);
  console.log(`  ${local.size}/${remote.size} files byte-identical to ${commit.slice(0, 12)}`);

  let sdk = readFileSync(SDK, 'utf8');
  sdk = repin(sdk, /^SDK_COMMIT = ".*"$/m, `SDK_COMMIT = "${commit}"`, 'SDK_COMMIT');
  sdk = repin(sdk, /^SDK_TAG_OBJECT = .*$/m, `SDK_TAG_OBJECT = "${tagObject}"`, 'SDK_TAG_OBJECT');
  sdk = repin(sdk, /^SDK_BRANCH(?:: str \| None)? = .*$/m, 'SDK_BRANCH: str | None = None', 'SDK_BRANCH');
  sdk = repin(sdk, /^REPO = ".*"$/m, `REPO = "https://github.com/${REPO}"`, 'REPO');
  writeFileSync(SDK, sdk);
  console.log(`  wrote ${REQS} and ${SDK}`);
}

// ------------------------------------------------------------------ 4. regenerate
if (MODELS) {
  stage('Fetching the Models API listings');
  run(PY, [CATALOGUE, '--refresh']);
}

if (CHECK) {
  stage('Verifying (writing nothing)');
  const fail = [];
  if (!run(PY, [CATALOGUE, '--check'], { soft: true })) fail.push('the Models sections or their derived fixtures are stale against the snapshot');
  if (!run(PY, [GEN, '--check'], { soft: true })) fail.push('specs/ is stale — run pnpm update:pyapi');
  if (!run(PY, [GEN, '--upstream', '--check'], { soft: true })) fail.push('UPSTREAM.md is stale');
  if (!run(PY, [GEN, '--verify-pin'], { soft: true })) fail.push('the installed SDK is not the pinned tree');
  if (!run(PY, [SEED, '--sync', '--check'], { soft: true })) fail.push('a page body is stale against pages.json');
  if (!run(PY, [GEN, '--delta'], { soft: true })) fail.push('sdk-delta.json does not match the SDK');
  if (!run(PY, [GEN, '--holes'], { soft: true })) fail.push('a page prints an SDK class nothing documents');
  run(PY, [GEN, '--diff']);
  if (fail.length) {
    console.error(`\n${fail.length} problem(s):`);
    for (const f of fail) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('\nup to date.');
  process.exit(0);
}

stage('Models sections from the committed snapshot');
run(PY, [CATALOGUE]);

stage('Generating specs/');
run(PY, [GEN]);

stage('Recapturing the [source] line-number pin');
run(PY, [GEN, '--write-pin']);

stage('SDK drift since golden/');
const deltaClean = run(PY, [GEN, '--delta', ...(ACCEPT_DELTA ? ['--write'] : [])], { soft: true });

stage('Rewriting page bodies from pages.json');
run(PY, [SEED, '--sync']);

stage('Upstream SDK defect report');
run(PY, [GEN, '--upstream']);

// ------------------------------------------------------------------ 5. verify + worklist
stage('Fidelity against the old Sphinx site');
run(PY, [GEN, '--diff']);

stage('Types printed but linked nowhere');
const holesClean = run(PY, [GEN, '--holes'], { soft: true });

console.log('\n' + '='.repeat(78));
const todo = [];
if (!deltaClean && !ACCEPT_DELTA) {
  todo.push(
    'Review the SDK drift printed above. Each line is either upstream change (record it with\n' +
      '    pnpm update:pyapi --accept-delta) or a generator regression (fix the generator).\n' +
      '    A REMOVED member is neither: it means a published deep link is now dead.',
  );
}
if (!holesClean) {
  todo.push(
    'Place the classes listed above in scripts/pyapi/pages.json — page, section, autodoc\n' +
      '    options — then re-run. Each one you add may print types of its own, so iterate.',
  );
}
if (todo.length) {
  console.log(`${todo.length} thing(s) need a decision:\n`);
  todo.forEach((t, i) => console.log(`  ${i + 1}. ${t}\n`));
  console.log('Everything mechanical is done and committed to the working tree.');
  process.exit(1);
}
console.log('Done — nothing left that needs a decision.');
console.log('Rendered pages are checked separately (they need a server):');
console.log('  pnpm build && pnpm start &   then   pnpm check:pyapi');
