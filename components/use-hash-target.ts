'use client';

import { useEffect, useRef } from 'react';

/**
 * Run `onTarget` when the URL fragment names one of `ids` - on mount and on every later
 * navigation to it, so a TOC link or a copied link opens the section it points into.
 *
 * `popstate` as well as `hashchange`: no browser fires `hashchange` when the clicked
 * fragment already equals `location.hash`, so clicking the same TOC entry twice (with a
 * manual collapse in between) would otherwise be dead.
 */
export function useHashTarget(
  ids: string[],
  onTarget: (id: string) => void,
  /**
   * Also match a hash that is a dotted descendant of one of `ids` — so a group can open for
   * `openprotein.fold.FoldAPI.get_model` while only being told about `openprotein.fold.FoldAPI`.
   * Mirrors how fumadocs' own `anchorIdStartsWith` matches schema anchors.
   */
  options?: { descendants?: boolean },
): void {
  const descendants = options?.descendants ?? false;
  const latest = useRef({ ids, onTarget, descendants });
  latest.current = { ids, onTarget, descendants };

  // The array identity changes every render; its contents are what matter.
  const key = `${ids.join(',')}|${descendants}`;

  useEffect(() => {
    function check() {
      let hash: string;
      try {
        hash = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        // A malformed fragment such as `#%` makes decodeURIComponent throw, which would
        // otherwise break this effect for every consumer on the page.
        return;
      }
      if (!hash) return;
      const { ids, onTarget, descendants } = latest.current;
      const hit =
        ids.includes(hash) ||
        (descendants && ids.some((id) => hash.startsWith(`${id}.`)));
      if (hit) onTarget(hash);
    }

    check();
    window.addEventListener('hashchange', check);
    window.addEventListener('popstate', check);
    return () => {
      window.removeEventListener('hashchange', check);
      window.removeEventListener('popstate', check);
    };
  }, [key]);
}
