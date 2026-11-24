'use client';

import { Component, useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { OpenAPIPage } from '@/components/api-page';
import { AUTH } from '@/lib/auth/config';
import { withoutHiddenModels } from '@/lib/hidden-models';
import { LIVE_SPEC_PATHS, prepareLiveSpec, type LiveSpecId } from '@/lib/live-openapi';
import { listOperations } from '@/lib/openapi-endpoints';

type PageProps = ComponentProps<typeof OpenAPIPage>;

// NEXT_PUBLIC_OP_API_URL; without it the page keeps its committed spec.
const API_ORIGIN = AUTH.apiOrigin;

// The live spec's own API is its only server (as withAuthServer in lib/openapi.ts).
const LIVE_SERVERS = [{ url: API_ORIGIN }];

// Render-time safety net: a live document that passes the shape check can
// still disagree with the renderer on nested schemas. On error, remount the
// already-painted fallback (identical props, so it cannot throw the same way).
class LiveSpecBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Fetches the live spec at runtime so routes added since the last `update:restapi` show up.
 * Falls back to the prerendered props when the fetch fails, so the page still renders offline
 * and the static export still builds without network.
 */
export function LiveOpenAPIPage({ specId, fallback }: { specId: LiveSpecId; fallback: PageProps }) {
  const [live, setLive] = useState<PageProps | null>(null);

  useEffect(() => {
    if (!API_ORIGIN) return;
    let cancelled = false;
    fetch(`${API_ORIGIN}${LIVE_SPEC_PATHS[specId]}`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<unknown>;
      })
      .then((document: unknown) => {
        if (cancelled) return;
        const prepared = prepareLiveSpec(specId, document, LIVE_SERVERS);
        const spec = prepared && specId === 'models' ? withoutHiddenModels(prepared) : prepared;
        if (!spec) return;
        const operations = listOperations(spec);
        if (!operations.length) return;
        setLive({
          ...fallback,
          payload: { bundled: spec },
          operations,
        });
      })
      .catch(() => {
        // Keep the vendored fallback; the page stays usable.
      });
    return () => {
      cancelled = true;
    };
  }, [specId, fallback]);

  if (!live) return <OpenAPIPage {...fallback} />;
  return (
    <LiveSpecBoundary fallback={<OpenAPIPage {...fallback} />}>
      <p className="text-xs text-fd-muted-foreground">
        Live spec from {API_ORIGIN}{LIVE_SPEC_PATHS[specId]}
      </p>
      <OpenAPIPage {...live} />
    </LiveSpecBoundary>
  );
}
