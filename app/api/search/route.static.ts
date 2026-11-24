import { searchApi } from '@/lib/search';

// No server to run a query on: ship the whole index as a file and search it in the browser.
export const dynamic = 'force-static';
export const revalidate = false;

export const GET = searchApi.staticGET;
