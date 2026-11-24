import { listNotebooks } from '@/lib/notebook';

export const dynamic = 'force-static';

/** The notebooks a page can name, for the editor's notebook picker. */
export async function GET() {
  return Response.json(await listNotebooks());
}
