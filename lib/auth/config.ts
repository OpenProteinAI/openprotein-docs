// Spelled out in full: Next inlines a NEXT_PUBLIC_ variable only where it is written literally.
const API_ORIGIN = (process.env.NEXT_PUBLIC_OP_API_URL ?? '').replace(/\/+$/, '');
const APP_URL = (process.env.NEXT_PUBLIC_OP_APP_URL ?? '').replace(/\/+$/, '');

/** Sign-in and the playground exist only in a build that names both the API and the app. */
export const AUTH = {
  enabled: Boolean(API_ORIGIN && APP_URL),
  apiOrigin: API_ORIGIN,
  apiUrl: `${API_ORIGIN}/api/v1`,
  appUrl: APP_URL,
} as const;
