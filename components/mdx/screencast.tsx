import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Animated screen recordings: WebP when scripts/optimize-assets.mjs produced one, else the GIF. */
export function Screencast({
  src,
  alt,
  width,
  height,
  caption,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  caption?: string;
}) {
  const webp = src.replace(/\.gif$/i, '.webp');
  // A <source> pointing at a 404 does not fall back cleanly, so only emit it if the file is there.
  const hasWebp = webp !== src && existsSync(join(process.cwd(), 'public', webp));

  return (
    <figure className="my-6">
      {/* Not next/image: it cannot optimize either format, so it would only add a hop. */}
      <picture>
        {hasWebp ? <source srcSet={webp} type="image/webp" /> : null}
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          className="h-auto w-full max-w-full rounded-lg border border-fd-border"
        />
      </picture>
      {caption ? (
        <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
