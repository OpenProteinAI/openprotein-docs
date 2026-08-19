import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// Mirrors the web app's env contract: VITE_APP_SERVER_PROXY / VITE_APP_SERVER_ROOT_API.
const apiProxy = process.env.OP_SERVER_PROXY ?? 'https://dev.api.openprotein.ai';
const apiRoot = process.env.OP_SERVER_ROOT_API ?? '/api/v1/';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,

  // Proxy the platform API through our own origin so its httpOnly refresh cookie is
  // first-party in dev. Authenticated playground calls go via /api/playground-proxy.
  async rewrites() {
    return [{ source: `${apiRoot}:path*`, destination: `${apiProxy}${apiRoot}:path*` }];
  },

  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default withMDX(config);
