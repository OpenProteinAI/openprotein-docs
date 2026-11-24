import { AUTH } from '@/lib/auth/config';

/** NEXT_PUBLIC_OP_API_URL's models; empty when the build names no API. */
export const MODELS_API_URL = AUTH.apiOrigin && `${AUTH.apiOrigin}/api/v1/models`;

/** A family as `GET /models/families` lists it: its name, and its place in the list. */
export interface ModelFamilyDoc {
  /** The `family_id` `/models` reports. */
  id: string;
  /** How the family is displayed: `PoET`, `ESM-IF`. */
  name: string;
}
