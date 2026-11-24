import { mathStyleSheet } from '@/lib/mathjax';

export const dynamic = 'force-static';

/** MathJax's SVG CSS. */
export function GET() {
  return new Response(mathStyleSheet(), { headers: { 'content-type': 'text/css; charset=utf-8' } });
}
