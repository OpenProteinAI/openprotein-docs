// Custom next/image loader, required for `output: 'export'`: GitHub Pages has no runtime
// optimizer at /_next/image. Also prepends the Pages sub-path, which next/image does not.
export default function imageLoader({ src }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  return `${basePath}${src}`;
}
