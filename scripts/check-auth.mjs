/**
 * The login / logout round trip: the header must swap between the Log in button and the
 * account avatar with no page reload, and the session cookie must stay httpOnly.
 *
 * Needs real platform credentials, so it is opt-in:
 *   OP_TEST_USER=... OP_TEST_PASS=... pnpm check:auth
 */
import { chromium } from 'playwright';

const B = process.env.BASE ?? 'http://localhost:5001';
const USER = process.env.OP_TEST_USER;
const PASS = process.env.OP_TEST_PASS;

if (!USER || !PASS) {
  console.log('skipped: set OP_TEST_USER and OP_TEST_PASS to run the auth round trip');
  process.exit(0);
}

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

let fails = 0;
const check = (ok, label, extra = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' — ' + extra : ''}`);
};

const state = () =>
  page.evaluate(() => {
    const avatar = document.querySelector('#nd-subnav button[aria-label^="Account:"]');
    const login = [...document.querySelectorAll('#nd-subnav a')].find(
      (a) => a.textContent.trim() === 'Log in',
    );
    const r = avatar?.getBoundingClientRect();
    const cs = avatar ? getComputedStyle(avatar) : null;
    return {
      avatar: Boolean(avatar),
      loginButton: Boolean(login),
      label: avatar?.getAttribute('aria-label') ?? null,
      text: avatar?.textContent?.trim() ?? null,
      w: r ? Math.round(r.width) : null,
      h: r ? Math.round(r.height) : null,
      bg: cs?.backgroundColor ?? cs?.background ?? null,
      radius: cs?.borderRadius ?? null,
      svgs: avatar ? avatar.querySelectorAll('svg').length : null,
    };
  });

// 1. signed out
await page.goto(B + '/', { waitUntil: 'networkidle' });
let s = await state();
check(s.loginButton && !s.avatar, 'signed out: Log in button, no avatar', JSON.stringify(s));

// 2. log in
await page.goto(B + '/login', { waitUntil: 'networkidle' });
await page.fill('#op-username', USER);
await page.fill('#op-password', PASS);
await Promise.all([page.waitForURL(B + '/'), page.click('button[type="submit"]')]);
await page.waitForTimeout(1200);

// 3. header updated with NO reload
s = await state();
check(s.avatar && !s.loginButton, 'after login (no reload): avatar replaced Log in', JSON.stringify(s));
check(s.svgs === 0, 'avatar has no chevron', `svgs=${s.svgs}`);
check(s.w === 34 && s.h === 34, 'avatar is 34x34', `${s.w}x${s.h}`);
check(/^rgb\(34,\s*94,\s*219\)$/.test(s.bg ?? ''), 'avatar background is primary-1 #225EDB', s.bg);
check((s.radius ?? '').startsWith('50%') || parseFloat(s.radius) >= 17, 'avatar is a circle', s.radius);

// 4. dropdown contents
await page.click('#nd-subnav button[aria-label^="Account:"]');
await page.waitForTimeout(300);
const menu = await page.evaluate(() => {
  const m = document.querySelector('[role="menu"][aria-label="Account"]');
  return {
    open: Boolean(m),
    items: [...(m?.querySelectorAll('[role="menuitem"]') ?? [])].map((e) => e.textContent.trim()),
    text: m?.innerText ?? '',
  };
});
console.log('     menu:', JSON.stringify(menu));
check(menu.open, 'dropdown opens');
check(menu.items.length === 1 && menu.items[0] === 'Sign out', 'only Sign out remains', JSON.stringify(menu.items));
for (const gone of ['Workspace dashboard', 'API keys', 'Usage & billing']) {
  check(!menu.text.includes(gone), `removed: ${gone}`);
}
check(menu.text.includes('Signed in as'), 'shows who is signed in');

// 5. session cookie hygiene
const cookies = await ctx.cookies();
const sess = cookies.find((c) => c.name === 'op_docs_session');
check(Boolean(sess?.httpOnly), 'op_docs_session is httpOnly', JSON.stringify(sess && { httpOnly: sess.httpOnly, path: sess.path, sameSite: sess.sameSite }));
const refresh = cookies.find((c) => c.name === 'op_refresh');
console.log('     op_refresh:', refresh ? JSON.stringify({ path: refresh.path, httpOnly: refresh.httpOnly }) : 'absent');
const leaked = await page.evaluate(() => document.documentElement.innerHTML.includes('Bearer '));
check(!leaked, 'no bearer token in the DOM');

// 6. log out, again with NO reload
await page.click('[role="menu"] [role="menuitem"]');
await page.waitForTimeout(1500);
s = await state();
check(!s.avatar && s.loginButton, 'after logout (no reload): Log in button returned', JSON.stringify(s));
const after = await ctx.cookies();
check(!after.some((c) => c.name === 'op_docs_session' && c.value), 'session cookie cleared');

check(errors.length === 0, 'no console errors', errors.slice(0, 2).join(' | '));

await browser.close();
console.log(fails ? `\n${fails} failure(s)` : '\nall auth checks passed');
process.exit(fails ? 1 : 0);
