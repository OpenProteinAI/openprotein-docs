import fs from 'node:fs';
import path from 'node:path';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { ImageZoom } from 'fumadocs-ui/components/image-zoom';

type Align = 'left' | 'center' | 'right';

const FALLBACK: [number, number] = [1600, 900];
const RAW = /\.(svg|gif)$/i;
const BOX: Record<Align, string> = { left: 'me-auto', center: 'mx-auto', right: 'ms-auto' };
const dims = new Map<string, [number, number]>();

/** Server component so intrinsic size comes from the file header: no width/height props to author. */
function intrinsic(src: string): [number, number] {
  const hit = dims.get(src);
  if (hit) return hit;

  let size = FALLBACK;
  try {
    const fd = fs.openSync(path.join(process.cwd(), 'public', src), 'r');
    const head = Buffer.alloc(4096);
    const read = fs.readSync(fd, head, 0, 4096, 0);
    fs.closeSync(fd);
    size = measure(head.subarray(0, read)) ?? FALLBACK;
  } catch {
    // Missing or remote src keeps the fallback ratio; h-auto lets the browser correct it.
  }

  dims.set(src, size);
  return size;
}

function measure(b: Buffer): [number, number] | null {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) {
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  }
  if (b.length > 10 && b.toString('latin1', 0, 3) === 'GIF') {
    return [b.readUInt16LE(6), b.readUInt16LE(8)];
  }

  const tag = b.toString('utf8').match(/<svg[^>]*>/)?.[0];
  if (!tag) return null;

  const attr = (name: string) =>
    Number.parseFloat(tag.match(new RegExp(`\\s${name}="([\\d.]+)`))?.[1] ?? '');
  const [w, h] = [attr('width'), attr('height')];
  if (w > 0 && h > 0) return [w, h];

  const box = tag.match(/viewBox="\s*[-\d.]+[,\s]+[-\d.]+[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  return box ? [Number(box[1]), Number(box[2])] : null;
}

function length(width: number | string) {
  return typeof width === 'number' || /^\d+$/.test(width) ? `${width}px` : width;
}

export function Figure({
  src,
  alt = '',
  caption,
  width,
  align = 'center',
}: {
  src: string;
  alt?: string;
  caption?: ReactNode;
  width?: number | string;
  align?: Align;
}) {
  const [w, h] = intrinsic(src);

  return (
    <figure
      className={`not-prose my-6 ${BOX[align]}`}
      style={width ? { maxWidth: length(width) } : undefined}
    >
      <ImageZoom src={src}>
        <Image
          src={src}
          alt={alt}
          width={w}
          height={h}
          sizes="(max-width: 768px) 100vw, 800px"
          // The optimizer rejects svg and cannot re-encode an animated gif.
          unoptimized={RAW.test(src)}
          className="h-auto w-full rounded-lg"
        />
      </ImageZoom>
      {caption ? (
        <figcaption
          className={`mt-2 leading-relaxed text-fd-muted-foreground [&_a]:text-fd-primary [&_a]:underline [&_a]:underline-offset-2 ${align === 'center' ? 'text-center' : ''}`}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
