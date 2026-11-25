import Script from 'next/script';
import { BASE_PATH } from '@/lib/base-path';

/** Google Analytics with no inline script, so the static CSP allows it by origin. */
export function Analytics({ gaId }: { gaId: string }) {
  return (
    <>
      <Script id="ga-init" src={`${BASE_PATH}/ga-init.js`} data-ga-id={gaId} />
      <Script id="ga" src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
    </>
  );
}
