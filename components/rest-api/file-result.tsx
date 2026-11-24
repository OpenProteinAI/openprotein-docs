'use client';

import { createContext, use, useEffect, useState } from 'react';
import { CircleCheck, Download } from 'lucide-react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { Custom, type ResultDisplayProps } from 'fumadocs-openapi/playground/client';
import { cn } from '@/lib/cn';

type FetchResponse = Extract<ResultDisplayProps['data'], { type: 'response' }>;

const EXTENSIONS: Record<string, string> = {
  'application/gzip': 'gz',
  'application/x-tar': 'tar',
  'application/zip': 'zip',
  'chemical/x-mmcif': 'cif',
  'chemical/x-pdb': 'pdb',
  'text/csv': 'csv',
  'text/x-fasta': 'fasta',
};

/** Text types saved, not shown. */
const TEXT_FILES = new Set(['text/csv', 'text/x-fasta']);

const NPY_MAGIC = [0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59];

const SIZE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;

interface Naming {
  idParam?: string;
  stem: string;
}

type Param = { in?: string; name?: string };

/** Names a file the server leaves unnamed. */
export const FileNaming = createContext<Naming>({ stem: 'response' });

export function fileNaming(
  operation: { summary?: string; operationId?: string; parameters?: object[] },
  pathItem: { parameters?: object[] },
): Naming {
  const params = [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])] as Param[];
  const name = operation.summary ?? operation.operationId ?? '';
  return {
    idParam: params.find((p) => p.in === 'path' && /(^|_)id$/.test(p.name ?? ''))?.name,
    stem: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'response',
  };
}

function mediaType(headers: Headers): string {
  return (headers.get('Content-Type') ?? 'text/plain').split(';')[0].trim().toLowerCase();
}

/** What fumadocs' panel shows as "Binary response body". */
function isBinary(type: string): boolean {
  if (type.startsWith('text/') || type.startsWith('image/')) return false;
  if (/[/+](json|xml)$/.test(type)) return false;
  return type !== 'application/javascript' && type !== 'application/x-javascript';
}

export function isFileResponse(data: ResultDisplayProps['data']): data is FetchResponse {
  if (data.type !== 'response' || data.status < 200 || data.status >= 300) return false;
  const type = mediaType(data.headers);
  return data.body.byteLength > 0 && (TEXT_FILES.has(type) || isBinary(type));
}

function extension(type: string, body: ArrayBuffer): string {
  const head = new Uint8Array(body, 0, Math.min(body.byteLength, NPY_MAGIC.length));
  if (NPY_MAGIC.every((byte, i) => head[i] === byte)) return 'npy';
  return EXTENSIONS[type] ?? 'bin';
}

function headerFileName(disposition: string | null): string | null {
  if (!disposition) return null;
  let name: string | undefined;
  const encoded = /filename\*\s*=\s*[^']*'[^']*'([^;]+)/i.exec(disposition)?.[1];
  if (encoded) {
    try {
      name = decodeURIComponent(encoded.trim());
    } catch {}
  }
  name ??= /filename\s*=\s*(?:"([^"]*)"|([^;]+))/i.exec(disposition)?.slice(1).find(Boolean);
  return name?.split(/[/\\]/).pop()?.trim() || null;
}

function formatSize(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < SIZE_UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  return new Intl.NumberFormat('en', {
    style: 'unit',
    unit: SIZE_UNITS[unit],
    unitDisplay: unit ? 'short' : 'long',
    maximumFractionDigits: 1,
  }).format(value);
}

/** fumadocs' result panel, body as a file. */
export function FileResult({
  data,
  reset,
  className,
  ...rest
}: Omit<ResultDisplayProps, 'data'> & { data: FetchResponse }) {
  const { idParam, stem } = use(FileNaming);
  const path = Custom.useController(['path']).value as Record<string, unknown> | undefined;
  // The id as sent, not as since edited.
  const [sent, setSent] = useState({ data, path });
  if (sent.data !== data) setSent({ data, path });
  const id = String((idParam && sent.path?.[idParam]) ?? '').replace(/[/\\]/g, '_').trim();
  const type = mediaType(data.headers);
  const name =
    headerFileName(data.headers.get('Content-Disposition')) ??
    `${id || stem}.${extension(type, data.body)}`;
  const [href, setHref] = useState<string>();

  useEffect(() => {
    const url = URL.createObjectURL(new Blob([data.body], { type }));
    setHref(url);
    return () => URL.revokeObjectURL(url);
  }, [data.body, type]);

  const button = buttonVariants({ size: 'sm', variant: 'outline' });

  return (
    <div
      {...rest}
      className={cn(
        'mt-2 flex flex-col gap-2 border-y bg-fd-secondary px-3 py-2 text-fd-secondary-foreground',
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <CircleCheck className="size-4 shrink-0 text-green-500" />
        <p className="text-sm font-medium text-nowrap">{data.status} Successful</p>
        <code className="ms-auto truncate text-xs text-fd-muted-foreground">{type}</code>
        <button type="button" className={button} onClick={reset}>
          Close
        </button>
      </div>
      <div className="flex items-center gap-2 rounded-lg border bg-fd-card p-2 text-fd-card-foreground">
        <span className="min-w-0 truncate">{name}</span>
        <span className="text-nowrap text-fd-muted-foreground">{formatSize(data.body.byteLength)}</span>
        <a href={href} download={name} className={cn(button, 'ms-auto shrink-0 gap-1.5')}>
          <Download className="size-3.5" />
          Download
        </a>
      </div>
    </div>
  );
}
