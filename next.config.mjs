import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// Toggle between the server build and a static export for the GitHub Pages preview.
//   BUILD_TARGET=static -> `next build` writes ./out
//   unset (default)     -> `next build` writes ./.next, unchanged
const isStaticExport = process.env.BUILD_TARGET === 'static';

// Pages serves this repo from a sub-path; pages.yml passes configure-pages' base_path.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// fumadocs-mdx's own default list, spelled out so the static branch below can extend it.
const PAGE_EXTENSIONS = ['tsx', 'ts', 'jsx', 'js', 'mdx', 'md'];

// *.server.ts reads cookies() or Request, or is proxy.ts; *.static.ts is its export-only
// counterpart. Only one extension is registered per build, so only one file ever resolves.
const pageExtensions = isStaticExport
  ? [...PAGE_EXTENSIONS, 'static.ts']
  : [...PAGE_EXTENSIONS, 'server.ts', 'server.tsx'];

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  pageExtensions,
  output: isStaticExport ? 'export' : undefined,

  ...(isStaticExport
    ? {
        // Pages serves /about/index.html for /about/, so emit folder-style URLs. The custom
        // loader replaces the runtime optimizer and bakes basePath into every img src —
        // `unoptimized: true` would render src verbatim and drop the sub-path.
        trailingSlash: true,
        basePath,
        assetPrefix: basePath || undefined,
        images: { loader: 'custom', loaderFile: './image-loader.js' },
      }
    : {
        images: {
          formats: ['image/avif', 'image/webp'],
        },
      }),
};

export default withMDX(config);
