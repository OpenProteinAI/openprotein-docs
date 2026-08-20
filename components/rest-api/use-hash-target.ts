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
export function useHashTarget(ids: string[], onTarget: (id: string) => void): void {
  const latest = useRef({ ids, onTarget });
  latest.current = { ids, onTarget };

  // The array identity changes every render; its contents are what matter.
  const key = ids.join(',');

  useEffect(() => {
    function check() {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (hash && latest.current.ids.includes(hash)) latest.current.onTarget(hash);
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
