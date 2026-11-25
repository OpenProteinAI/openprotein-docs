/** The Pages sub-path. next/image and next/link apply it themselves; a raw <img> does not. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function withBase(path: string) {
  return path.startsWith('/') ? `${BASE_PATH}${path}` : path;
}
