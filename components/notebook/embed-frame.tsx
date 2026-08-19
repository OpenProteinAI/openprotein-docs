'use client';

// The only client island: RosettaFold3's viewer is 3.1 MB of Mol* + WebGL, so a click gates it.
import { useState } from 'react';

/** Recovered documents are ASCII HTML around a base64 payload, so one char is one byte. */
function formatSize(bytes: number): string {
  const mb = bytes / 1_048_576;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function EmbedFrame({
  label,
  src,
  bytes,
}: {
  label: string;
  src: string;
  bytes: number;
}) {
  const [live, setLive] = useState(false);

  return (
    <div className="overflow-hidden rounded-md border border-fd-border bg-fd-card">
      <div className="flex items-center justify-between gap-3 border-b border-fd-border px-3 py-1.5">
        <span className="truncate text-xs text-fd-muted-foreground">{label}</span>
        <span className="shrink-0 font-mono text-xs text-fd-muted-foreground">
          {formatSize(bytes)}
        </span>
      </div>
      {live ? (
        // src, not srcDoc: a prop would serialise the whole document into the RSC payload.
        // No allow-same-origin: the document pulls Mol* from a CDN and must not reach our origin.
        <iframe
          src={src}
          sandbox="allow-scripts"
          title={label}
          className="block aspect-[5/4] w-full border-0 bg-white"
        />
      ) : (
        <div className="flex h-32 items-center justify-center bg-fd-muted">
          <button
            type="button"
            onClick={() => setLive(true)}
            className="rounded-md border border-fd-border bg-fd-card px-3 py-1.5 text-sm text-fd-foreground transition-colors hover:border-fd-primary hover:text-fd-primary"
          >
            Load 3D viewer
          </button>
        </div>
      )}
    </div>
  );
}
