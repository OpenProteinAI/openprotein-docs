const DEFAULT_PROXY = 'https://dev.api.openprotein.ai';
const DEFAULT_ROOT = '/api/v1/';

/** Known platform origins, kept alongside whatever OP_SERVER_PROXY points at. */
const KNOWN_ORIGINS = ['https://dev.api.openprotein.ai', 'https://api.openprotein.ai'];

export const IS_PROD = process.env.NODE_ENV === 'production';

function parseProxy(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      `OP_SERVER_PROXY must be an absolute URL (e.g. ${DEFAULT_PROXY}); got ${JSON.stringify(raw)}`,
    );
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`OP_SERVER_PROXY must be http(s); got ${JSON.stringify(raw)}`);
  }
  return url;
}

function normaliseRoot(raw: string): string {
  const inner = raw.replace(/^\/+/, '').replace(/\/+$/, '');
  return inner ? `/${inner}/` : '/';
}

const RAW_PROXY = process.env.OP_SERVER_PROXY?.trim() || DEFAULT_PROXY;
const PROXY_URL = parseProxy(RAW_PROXY);

export const API_PROXY = RAW_PROXY.replace(/\/+$/, '');
export const API_ROOT = normaliseRoot(process.env.OP_SERVER_ROOT_API?.trim() || DEFAULT_ROOT);
export const API_ORIGIN = PROXY_URL.origin;

/** Derived, never hardcoded: a hardcoded list breaks the playground proxy off dev/prod. */
export const ALLOWED_API_ORIGINS: readonly string[] = [
  ...new Set([PROXY_URL.origin, ...KNOWN_ORIGINS]),
];

export function apiUrl(path: string): string {
  return `${API_PROXY}${API_ROOT}${path.replace(/^\/+/, '')}`;
}

export function isAllowedApiOrigin(origin: string): boolean {
  return ALLOWED_API_ORIGINS.includes(origin);
}
