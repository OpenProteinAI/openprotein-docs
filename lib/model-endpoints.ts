// Which REST operations belong to a model, and what to call them. Pure, so the family page's
// client layout can label what the server picked; lib/model-api.ts does the picking.

/** A model's methods run at `/api/v1/models/<model id>/<method>`, the models spec's paths. */
const MODEL_PATH_PREFIX = '/api/v1/models/';

/** The order a version's methods are listed in, and their names; any other follows, named by its path. */
const RUN_LABELS: [string, string][] = [
  ['batch/loglikelihood', 'Scoring'],
  ['single-site/scores', 'Single-site scoring'],
  ['indel/scores', 'Indel scoring'],
  ['generate/sequences', 'Generation'],
  ['batch/embeddings', 'Embeddings'],
  ['batch/logits', 'Logits'],
  ['batch/attn', 'Attention'],
  ['batch/structures', 'Structure prediction'],
  ['generate/structures', 'Structure generation'],
];

export const JOB_STATUS_PATH = '/api/v1/jobs/{job_id}';

const SCORES = '/api/v1/embeddings/{job_id}/scores';
const GENERATED = '/api/v1/embeddings/{job_id}/generate';
const PER_SEQUENCE = '/api/v1/embeddings/{job_id}/{sequence}';
const STRUCTURE = '/api/v1/fold/{job_id}/{index}';
const DESIGNS = '/api/v1/design/{job_id}/results';

/** Where each method's job is read back from, once `GET /jobs/{job_id}` says it's done. */
export const RESULT_PATHS: Record<string, string[]> = {
  'batch/loglikelihood': [SCORES],
  'single-site/scores': [SCORES],
  'indel/scores': [SCORES],
  'generate/sequences': [GENERATED],
  'batch/embeddings': [PER_SEQUENCE],
  'batch/logits': [PER_SEQUENCE],
  'batch/attn': [PER_SEQUENCE],
  'batch/structures': [STRUCTURE],
  'generate/structures': [DESIGNS],
};

const RESULT_LABELS: Record<string, string> = {
  [JOB_STATUS_PATH]: 'Job status',
  [SCORES]: 'Scores',
  [GENERATED]: 'Generated sequences',
  [PER_SEQUENCE]: 'One sequence’s output',
  [STRUCTURE]: 'Predicted structure',
  [DESIGNS]: 'Generated structures',
};

/** `/api/v1/models/poet-2/single-site/scores` → `single-site/scores`, given `poet-2`. */
export function modelMethod(path: string, modelId: string): string | undefined {
  const prefix = `${MODEL_PATH_PREFIX}${modelId}/`;
  if (!path.startsWith(prefix)) return undefined;
  const method = path.slice(prefix.length);
  return method && !method.includes('{') ? method : undefined;
}

export function runOrder(method: string) {
  const at = RUN_LABELS.findIndex(([known]) => known === method);
  return at < 0 ? RUN_LABELS.length : at;
}

/** `single-site/scores` → `Single-site scores`. */
function runLabel(method: string) {
  const known = RUN_LABELS.find(([path]) => path === method)?.[1];
  if (known) return known;
  const words = method.replaceAll('/', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** What the family page calls an operation: its method, or the result it fetches. */
export function endpointLabel(path: string): string | undefined {
  if (RESULT_LABELS[path]) return RESULT_LABELS[path];
  if (!path.startsWith(MODEL_PATH_PREFIX)) return undefined;

  const method = path.slice(MODEL_PATH_PREFIX.length).split('/').slice(1).join('/');
  return method ? runLabel(method) : undefined;
}
