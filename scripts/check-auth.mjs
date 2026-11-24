/**
 * Browser checks for docs sign-in, against the static export in ./out with the platform faked.
 *
 *   pnpm check:auth             ./out built with NEXT_PUBLIC_OP_API_URL=https://api.example.test
 *                               and NEXT_PUBLIC_OP_APP_URL=https://app.example.test
 *   pnpm check:auth --public    ./out built with neither
 *   pnpm check:auth --local     ./out built with NEXT_PUBLIC_OP_API_URL and NEXT_PUBLIC_OP_SITE_URL both
 *                               http://localhost:5199 (local docs), and the app URL above
 *   pnpm check:auth <name>...   only scenarios whose name contains one of these
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const PORT = 5199;
const SITE = `http://localhost:${PORT}`;
const PUBLIC = process.argv.includes('--public');
const LOCAL = process.argv.includes('--local');
// Local docs calls the platform through its own origin.
const API = LOCAL ? SITE : 'https://api.example.test';
const APP = 'https://app.example.test';
const OUT = path.resolve('out');
const ONLY = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
};

async function fileFor(url) {
  const pathname = decodeURIComponent(new URL(url, SITE).pathname);
  for (const candidate of [pathname, path.join(pathname, 'index.html'), `${pathname}.html`]) {
    const file = path.join(OUT, candidate);
    if (!file.startsWith(OUT)) return null;
    try {
      if ((await stat(file)).isFile()) return file;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const file = await fileFor(req.url ?? '/');
  if (!file) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
});

const CORS = {
  'access-control-allow-origin': SITE,
  'access-control-allow-credentials': 'true',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE',
  'cache-control': 'private, no-store',
};

/** The platform: whose session the browser holds, and which calls fail or wait. */
async function fakePlatform(page, overrides) {
  const state = {
    userId: 7,
    username: 'ada@example.test',
    expiresIn: 900,
    down: new Set(),
    rejects: new Set(),
    held: new Map(),
    calls: [],
    minted: 0,
    ...overrides,
  };
  const json = (status, body) => ({
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  function answer(call, request) {
    if (state.rejects.has(call)) return json(401, { detail: 'Not authenticated' });
    switch (call) {
      case 'GET /api/v1/auth/session':
        return json(200, state.userId ? { authenticated: true, user_id: state.userId } : { authenticated: false });
      case 'POST /api/v1/auth/docs/session':
        if (!state.userId) return json(401, { authenticated: false });
        state.minted += 1;
        return json(200, {
          access_token: `token-${state.userId}-${state.minted}`,
          token_type: 'bearer',
          expires_in: state.expiresIn,
          user_id: state.userId,
        });
      case 'POST /api/v1/auth/docs/logout':
        state.userId = null;
        return { status: 204, headers: CORS };
      case 'GET /api/v1/users/me':
        return json(200, { id: state.userId, username: state.username });
      case 'POST /api/v1/auth/handoff/exchange': {
        const { code, code_verifier, redirect_uri } = request.postDataJSON();
        const challenge = createHash('sha256').update(code_verifier).digest('base64url');
        if (
          state.exchangeFails ||
          code !== 'code-1' ||
          challenge !== state.challenge ||
          redirect_uri !== `${SITE}/auth/callback`
        ) {
          return json(400, { detail: 'Invalid handoff code' });
        }
        state.userId = 7;
        return json(200, { access_token: 'local-token', token_type: 'bearer', expires_in: 900, csrf: 'c' });
      }
      default:
        return json(200, { answer: 'platform-answered', call });
    }
  }

  await page.route(`${API}/api/v1/**`, async (route) => {
    const request = route.request();
    const call = `${request.method()} ${new URL(request.url()).pathname}`;
    state.calls.push({ call, authorization: (await request.allHeaders()).authorization ?? null });
    // The platform answers when the request arrives; a held call only delays the reply.
    const reply = state.down.has(call) ? null : answer(call, request);
    await state.held.get(call);
    return reply ? route.fulfill(reply) : route.abort('connectionrefused');
  });
  await page.route(`${APP}/**`, (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/auth/docs' && url.searchParams.has('code_challenge')) {
      state.authDocs = url;
      state.challenge = url.searchParams.get('code_challenge');
      // Playwright doesn't route a redirect's target, so a held handoff lands on a real page.
      if (state.holdHandoff) return route.fulfill({ status: 302, headers: { location: `${SITE}/` } });
      const back = new URL(url.searchParams.get('return_to'));
      back.searchParams.set('code', 'code-1');
      back.searchParams.set('state', state.tamperState ? 'not-it' : url.searchParams.get('state'));
      return route.fulfill({ status: 302, headers: { location: back.href } });
    }
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>the app</p>' });
  });
  return state;
}

const header = (page) => page.locator('#nd-subnav');
const loginButton = (page) => header(page).getByRole('button', { name: 'Log in', exact: true });
const accountButton = (page) => header(page).getByRole('button', { name: /^Account: / });
const count = (state, call) => state.calls.filter((entry) => entry.call === call).length;

async function signedInAs(page, username) {
  await header(page).getByRole('button', { name: `Account: ${username}` }).waitFor();
}

async function until(predicate, what, timeout = 5_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`timed out waiting for ${what}`);
}

/** Delay the reply to every `call` until the returned function runs. */
function hold(state, call) {
  let release;
  state.held.set(call, new Promise((resolve) => (release = resolve)));
  return () => {
    state.held.delete(call);
    release();
  };
}

async function focus(page) {
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
}

const scenarios = [];

/** `public` and `local` scenarios run against those exports; `clock` installs Playwright's clock. */
function scenario(name, options, run) {
  scenarios.push({ name, ...options, run });
}

async function run() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  const browser = await chromium.launch(
    process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : // CI has no system Chrome; PLAYWRIGHT_CHANNEL=chromium uses Playwright's own build.
        process.env.PLAYWRIGHT_CHANNEL === 'chromium'
        ? {}
        : { channel: 'chrome' },
  );
  let ran = 0;
  let failures = 0;
  for (const s of scenarios) {
    if (Boolean(s.public) !== PUBLIC || Boolean(s.local) !== LOCAL) continue;
    if (ONLY.length && !ONLY.some((name) => s.name.includes(name))) continue;
    ran += 1;
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    context.setDefaultTimeout(5_000);
    await context.addInitScript(() => {
      window.__csp = [];
      document.addEventListener('securitypolicyviolation', (event) =>
        window.__csp.push(`${event.violatedDirective} ${event.blockedURI}`),
      );
    });
    const page = await context.newPage();
    try {
      if (s.clock) await page.clock.install();
      const state = await fakePlatform(page, s.platform);
      await s.run(page, state);
      assert.deepEqual(await page.evaluate(() => window.__csp ?? []), [], 'CSP violations');
      console.log(`  ok    ${s.name}`);
    } catch (error) {
      failures += 1;
      console.log(`  FAIL  ${s.name}\n        ${String(error?.message ?? error).split('\n')[0]}`);
    }
    await context.close();
  }
  await browser.close();
  server.close();
  console.log(failures ? `${failures} of ${ran} failed` : `${ran} passed`);
  process.exit(failures ? 1 : 0);
}

scenario('public build: no sign-in UI and no platform calls', { public: true }, async (page, state) => {
  for (const url of ['/', '/references/rest-api/fold/']) {
    await page.goto(`${SITE}${url}`, { waitUntil: 'networkidle' });
    assert.equal(await loginButton(page).count(), 0, `Log in on ${url}`);
    assert.equal(await accountButton(page).count(), 0, `account menu on ${url}`);
  }
  assert.deepEqual(state.calls, []);
});

scenario('signed out: Log in shows and nothing is minted', { platform: { userId: null } }, async (page, state) => {
  await page.goto(`${SITE}/`, { waitUntil: 'networkidle' });
  await loginButton(page).waitFor();
  assert.deepEqual(
    state.calls.map((entry) => entry.call),
    ['GET /api/v1/auth/session'],
  );
});

scenario('signed in: no click, and the token stays in memory', {}, async (page, state) => {
  await page.goto(`${SITE}/`, { waitUntil: 'networkidle' });
  await signedInAs(page, 'ada@example.test');
  assert.deepEqual(
    state.calls.map((entry) => entry.call),
    ['GET /api/v1/auth/session', 'POST /api/v1/auth/docs/session', 'GET /api/v1/users/me'],
  );
  assert.equal(state.calls[2].authorization, 'Bearer token-7-1');
  const exposed = await page.evaluate(() =>
    [
      JSON.stringify({ ...localStorage }),
      JSON.stringify({ ...sessionStorage }),
      document.cookie,
      document.documentElement.outerHTML,
    ].join('\n'),
  );
  assert.ok(!exposed.includes('token-7'), 'the access token reached storage, cookies or the DOM');
});

scenario('Log in goes to the app with this page as return_to', { platform: { userId: null } }, async (page) => {
  const here = `${SITE}/overview/?tab=2#start`;
  await page.goto(here, { waitUntil: 'networkidle' });
  await loginButton(page).click();
  await page.waitForURL(`${APP}/auth/docs**`);
  assert.equal(new URL(page.url()).searchParams.get('return_to'), here);
});

scenario('renews the access token a minute before it expires', { clock: true, platform: { expiresIn: 120 } }, async (page, state) => {
  await page.goto(`${SITE}/`, { waitUntil: 'networkidle' });
  await signedInAs(page, 'ada@example.test');
  assert.equal(state.minted, 1);
  // The clock also runs in real time, and sign-in took some of it.
  await page.clock.fastForward(55_000);
  assert.equal(state.minted, 1, 'renewed too early');
  await page.clock.fastForward(7_000);
  await until(() => state.minted === 2, 'a second docs session call');
});

scenario('a visible tab makes no session checks of its own', { clock: true }, async (page, state) => {
  await page.goto(`${SITE}/`, { waitUntil: 'networkidle' });
  await signedInAs(page, 'ada@example.test');
  const before = count(state, 'GET /api/v1/auth/session');
  await page.clock.fastForward(300_000);
  assert.equal(count(state, 'GET /api/v1/auth/session'), before);
});

scenario('a session ended elsewhere signs docs out on the next focus', {}, async (page, state) => {
  await page.goto(`${SITE}/`, { waitUntil: 'networkidle' });
  await signedInAs(page, 'ada@example.test');
  state.userId = null;
  await focus(page);
  await loginButton(page).waitFor();
  assert.equal(await accountButton(page).count(), 0);
  assert.equal(count(state, 'POST /api/v1/auth/docs/logout'), 0, 'passive detection called logout');
});

scenario('an unreachable platform keeps the session and says so', {}, async (page, state) => {
  await page.goto(`${SITE}/`, { waitUntil: 'networkidle' });
  await signedInAs(page, 'ada@example.test');
  state.down.add('GET /api/v1/auth/session');
  await focus(page);
  await page.getByText("Can't reach OpenProtein").waitFor();
  await signedInAs(page, 'ada@example.test');
  state.down.delete('GET /api/v1/auth/session');
  await focus(page);
  await page.getByText("Can't reach OpenProtein").waitFor({ state: 'detached' });
});

scenario('focus, reconnect, a bfcache restore and a tab return each run a check', {}, async (page) => {
  await page.goto(`${SITE}/`, { waitUntil: 'networkidle' });
  await signedInAs(page, 'ada@example.test');
  const events = [
    () => window.dispatchEvent(new Event('focus')),
    () => window.dispatchEvent(new Event('online')),
    () => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
    () => document.dispatchEvent(new Event('visibilitychange')),
  ];
  for (const fire of events) {
    const answered = page.waitForResponse(`${API}/api/v1/auth/session`);
    await page.evaluate(fire);
    await answered;
    await page.waitForTimeout(100);
  }
});

async function sendFromPlayground(page) {
  await page.locator('button', { hasText: 'List fold models' }).first().click();
  await page.getByRole('button', { name: 'Send', exact: true }).first().click();
}

scenario('the playground sends the token to the API it came from', {}, async (page, state) => {
  await page.goto(`${SITE}/references/rest-api/fold/`, { waitUntil: 'networkidle' });
  await signedInAs(page, 'ada@example.test');
  await sendFromPlayground(page);
  await page.getByText('platform-answered').waitFor();
  const sent = state.calls.filter((entry) => entry.call === 'GET /api/v1/fold/models');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].authorization, 'Bearer token-7-1');
  assert.equal(await page.locator('[data-type="authorization"]').count(), 0, 'an auth input rendered');
});

scenario('a 401 from Send signs docs out when the session has ended', {}, async (page, state) => {
  await page.goto(`${SITE}/references/rest-api/fold/`, { waitUntil: 'networkidle' });
  await signedInAs(page, 'ada@example.test');
  state.userId = null;
  state.rejects.add('GET /api/v1/fold/models');
  await sendFromPlayground(page);
  await loginButton(page).waitFor();
  assert.equal(count(state, 'POST /api/v1/auth/docs/logout'), 0, 'passive detection called logout');
});

scenario('a 401 from Send renews the token when the session still stands', {}, async (page, state) => {
  await page.goto(`${SITE}/references/rest-api/fold/`, { waitUntil: 'networkidle' });
  await signedInAs(page, 'ada@example.test');
  const before = count(state, 'GET /api/v1/auth/session');
  state.rejects.add('GET /api/v1/fold/models');
  await sendFromPlayground(page);
  await until(() => count(state, 'GET /api/v1/auth/session') > before, 'a check after the 401');
  state.rejects.delete('GET /api/v1/fold/models');
  await page.waitForTimeout(100);
  await page.getByRole('button', { name: 'Send', exact: true }).first().click();
  await page.getByText('platform-answered').waitFor();
  const sent = state.calls.filter((entry) => entry.call === 'GET /api/v1/fold/models');
  assert.deepEqual(
    sent.map((entry) => entry.authorization),
    ['Bearer token-7-1', 'Bearer token-7-2'],
  );
  await signedInAs(page, 'ada@example.test');
});

scenario('the playground refuses to send while signed out', { platform: { userId: null } }, async (page, state) => {
  await page.goto(`${SITE}/references/rest-api/fold/`, { waitUntil: 'networkidle' });
  await loginButton(page).waitFor();
  await sendFromPlayground(page);
  await page.getByText('Log in to run requests against the API.').waitFor();
  assert.equal(count(state, 'GET /api/v1/fold/models'), 0);
});

scenario('the playground pauses while the platform is unreachable', {}, async (page, state) => {
  await page.goto(`${SITE}/references/rest-api/fold/`, { waitUntil: 'networkidle' });
  await signedInAs(page, 'ada@example.test');
  state.down.add('GET /api/v1/auth/session');
  await focus(page);
  await page.getByText("Can't reach OpenProtein").first().waitFor();
  await sendFromPlayground(page);
  await page.getByText('Requests resume once it answers.').waitFor();
  assert.equal(count(state, 'GET /api/v1/fold/models'), 0);
});

scenario('public build: no playground', { public: true }, async (page) => {
  await page.goto(`${SITE}/references/rest-api/fold/`, { waitUntil: 'networkidle' });
  await page.locator('button', { hasText: 'List fold models' }).first().click();
  await page.waitForTimeout(500);
  assert.equal(await page.getByRole('button', { name: 'Send', exact: true }).count(), 0);
});

scenario('an account change hides the old account and drops its playground results', {}, async (page, state) => {
  await page.goto(`${SITE}/references/rest-api/fold/`, { waitUntil: 'networkidle' });
  await signedInAs(page, 'ada@example.test');
  await sendFromPlayground(page);
  await page.getByText('platform-answered').waitFor();
  state.userId = 8;
  state.username = 'grace@example.test';
  await focus(page);
  await signedInAs(page, 'grace@example.test');
  assert.equal(await page.getByText('platform-answered').count(), 0, "the old account's result survived");
  assert.equal(await header(page).getByRole('button', { name: 'Account: ada@example.test' }).count(), 0);
});

scenario('a resumed tab sends nothing until its check completes', {}, async (page, state) => {
  await page.goto(`${SITE}/references/rest-api/fold/`, { waitUntil: 'networkidle' });
  await signedInAs(page, 'ada@example.test');
  const release = hold(state, 'GET /api/v1/auth/session');
  const before = count(state, 'GET /api/v1/auth/session');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await until(() => count(state, 'GET /api/v1/auth/session') > before, 'the resume check');
  await sendFromPlayground(page);
  await page.getByText('Checking your session').waitFor();
  assert.equal(count(state, 'GET /api/v1/fold/models'), 0);
  const answered = page.waitForResponse(`${API}/api/v1/auth/session`);
  release();
  await answered;
  await page.waitForTimeout(100);
  await page.getByRole('button', { name: 'Send', exact: true }).first().click();
  await until(() => count(state, 'GET /api/v1/fold/models') === 1, 'the request after the check');
});

scenario('Log out ends the session, then the app finishes logging out', {}, async (page, state) => {
  const here = `${SITE}/overview/?tab=2`;
  await page.goto(here, { waitUntil: 'networkidle' });
  await signedInAs(page, 'ada@example.test');
  await accountButton(page).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await page.waitForURL(`${APP}/auth/signed-out**`);
  assert.equal(new URL(page.url()).searchParams.get('return_to'), here);
  assert.equal(count(state, 'POST /api/v1/auth/docs/logout'), 1);
});

scenario('a failed sign-out says so, holds across a reload, and Retry finishes it', {}, async (page, state) => {
  await page.goto(`${SITE}/overview/`, { waitUntil: 'networkidle' });
  await signedInAs(page, 'ada@example.test');
  state.down.add('POST /api/v1/auth/docs/logout');
  await accountButton(page).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await page.getByText('Log out incomplete').waitFor();
  assert.equal(await accountButton(page).count(), 0);
  const minted = state.minted;
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('Log out incomplete').waitFor();
  assert.equal(state.minted, minted, 'signed back in automatically');
  assert.equal(await accountButton(page).count(), 0);
  state.down.delete('POST /api/v1/auth/docs/logout');
  await page.getByRole('button', { name: 'Retry' }).click();
  await page.waitForURL(`${APP}/auth/signed-out**`);
});

scenario('notebook HTML outputs keep their tables and lose their scripts', {}, async (page) => {
  await page.goto(`${SITE}/tutorials/predict/plm/zero-shot-fitness/`, { waitUntil: 'networkidle' });
  const outputs = page.locator('.nb-html');
  assert.ok((await outputs.count()) > 0, 'no HTML outputs on the page');
  assert.ok((await outputs.locator('tr').count()) > 0, 'the DataFrame lost its rows');
  assert.equal(await outputs.locator('script, button, [onclick]').count(), 0);
});

scenario('every page carries a CSP that pins its inline scripts', {}, async (page) => {
  for (const url of ['/', '/overview/', '/references/rest-api/fold/', '/tutorials/predict/plm/zero-shot-fitness/']) {
    await page.goto(`${SITE}${url}`, { waitUntil: 'networkidle' });
    const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    assert.match(policy ?? '', /^script-src 'self' 'sha256-/, `no CSP on ${url}`);
  }
});

scenario('an injected inline handler does not run', {}, async (page) => {
  await page.goto(`${SITE}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.innerHTML = '<img src="/missing.png" onerror="window.__ran = true">';
    document.body.append(probe);
  });
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => window.__ran ?? false), false);
  // The blocked handler is the one violation this scenario expects.
  await page.evaluate(() => (window.__csp = []));
});

scenario('a check in flight when sign-out fails does not sign back in', {}, async (page, state) => {
  await page.goto(`${SITE}/references/rest-api/fold/`, { waitUntil: 'networkidle' });
  await signedInAs(page, 'ada@example.test');
  const release = hold(state, 'GET /api/v1/auth/session');
  const before = count(state, 'GET /api/v1/auth/session');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await until(() => count(state, 'GET /api/v1/auth/session') > before, 'the focus check');
  state.down.add('POST /api/v1/auth/docs/logout');
  await accountButton(page).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await page.getByText('Log out incomplete').waitFor();
  const minted = state.minted;
  release();
  await page.waitForTimeout(800);
  assert.equal(state.minted, minted, 'minted after the failed sign-out');
  assert.equal(await accountButton(page).count(), 0, 'the account menu came back');
  await page.getByText('Log out incomplete').waitFor();
  await sendFromPlayground(page);
  await page.getByText('Log in to run requests against the API.').waitFor();
  assert.equal(count(state, 'GET /api/v1/fold/models'), 0);
});

scenario('a renewal in flight when a check says signed out does not sign back in', { clock: true, platform: { expiresIn: 120 } }, async (page, state) => {
  await page.goto(`${SITE}/`, { waitUntil: 'networkidle' });
  await signedInAs(page, 'ada@example.test');
  const release = hold(state, 'POST /api/v1/auth/docs/session');
  await page.clock.fastForward(62_000);
  await until(() => count(state, 'POST /api/v1/auth/docs/session') === 2, 'the renewal');
  state.userId = null;
  await focus(page);
  await loginButton(page).waitFor();
  release();
  await page.waitForTimeout(800);
  assert.equal(await accountButton(page).count(), 0, 'the stale renewal signed docs back in');
  await loginButton(page).waitFor();
});

scenario('blocked storage keeps the page working, and a failed sign-out still holds', {}, async (page, state) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', {
      get() {
        throw new DOMException('Access is denied for this document.', 'SecurityError');
      },
    });
  });
  await page.goto(`${SITE}/overview/`, { waitUntil: 'networkidle' });
  await signedInAs(page, 'ada@example.test');
  state.down.add('POST /api/v1/auth/docs/logout');
  await accountButton(page).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await page.getByText('Log out incomplete').waitFor();
  assert.deepEqual(errors, []);
});

scenario('the playground ignores a server URL another build stored', {}, async (page, state) => {
  const elsewhere = [];
  await page.addInitScript(() =>
    localStorage.setItem(
      'fumadocs-openapi-server-url',
      JSON.stringify({ name: 'other', url: 'https://other.example.test', variables: {} }),
    ),
  );
  await page.route('https://other.example.test/**', (route) => {
    elsewhere.push(route.request().url());
    return route.abort('connectionrefused');
  });
  await page.goto(`${SITE}/references/rest-api/fold/`, { waitUntil: 'networkidle' });
  await signedInAs(page, 'ada@example.test');
  await sendFromPlayground(page);
  await until(() => count(state, 'GET /api/v1/fold/models') === 1, 'the request to the API');
  assert.deepEqual(elsewhere, []);
});

scenario('local: docs stays public until Log in', { local: true, platform: { userId: null } }, async (page, state) => {
  await page.goto(`${SITE}/overview/`, { waitUntil: 'networkidle' });
  await loginButton(page).waitFor();
  assert.equal(state.authDocs, undefined);
  assert.equal(count(state, 'POST /api/v1/auth/docs/session'), 0);
});

scenario('local: Log in sends a PKCE challenge and state to the app', { local: true, platform: { userId: null, holdHandoff: true } }, async (page, state) => {
  await page.goto(`${SITE}/overview/`, { waitUntil: 'networkidle' });
  await loginButton(page).click();
  await page.waitForURL(`${SITE}/`);
  assert.equal(state.authDocs.searchParams.get('return_to'), `${SITE}/auth/callback`);
  assert.match(state.challenge, /^[A-Za-z0-9_-]{43}$/);
  const stored = JSON.parse(await page.evaluate(() => sessionStorage.getItem('op-docs-handoff')));
  assert.equal(createHash('sha256').update(stored.verifier).digest('base64url'), state.challenge);
  assert.equal(stored.state, state.authDocs.searchParams.get('state'));
  assert.equal(stored.returnTo, `${SITE}/overview/`);
});

scenario('local: the session and sign-out go through this origin', { local: true }, async (page, state) => {
  await page.goto(`${SITE}/overview/`, { waitUntil: 'networkidle' });
  await signedInAs(page, 'ada@example.test');
  await accountButton(page).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await page.waitForURL((url) => url.origin === APP && url.pathname === '/auth/signed-out');
  assert.equal(new URL(page.url()).searchParams.get('return_to'), `${SITE}/overview/`);
  assert.equal(count(state, 'POST /api/v1/auth/docs/logout'), 1);
});

scenario('local: the callback spends the code and returns to the page, signed in', { local: true, platform: { userId: null } }, async (page, state) => {
  await page.goto(`${SITE}/overview/?tab=1#overview`, { waitUntil: 'networkidle' });
  await loginButton(page).click();
  await page.waitForURL((url) => url.pathname === '/overview/' && url.search === '?tab=1');
  await signedInAs(page, 'ada@example.test');
  assert.equal(await page.evaluate(() => location.hash), '#overview');
  assert.equal(count(state, 'POST /api/v1/auth/handoff/exchange'), 1);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('op-docs-handoff')), null);
});

scenario('local: a callback whose state does not match spends nothing', { local: true, platform: { userId: null, tamperState: true } }, async (page, state) => {
  await page.goto(`${SITE}/overview/`, { waitUntil: 'networkidle' });
  await loginButton(page).click();
  await page.getByRole('heading', { name: 'Login failed' }).waitFor();
  assert.equal(count(state, 'POST /api/v1/auth/handoff/exchange'), 0);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('op-docs-handoff')), null);
  await loginButton(page).waitFor();
});

scenario('local: a failed exchange leaves docs public, and Try again hands off again', { local: true, platform: { userId: null, exchangeFails: true } }, async (page, state) => {
  await page.goto(`${SITE}/overview/`, { waitUntil: 'networkidle' });
  await loginButton(page).click();
  await page.getByRole('heading', { name: 'Login failed' }).waitFor();
  assert.equal(count(state, 'POST /api/v1/auth/handoff/exchange'), 1);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('op-docs-handoff')), null);
  await loginButton(page).waitFor();
  state.exchangeFails = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.waitForURL((url) => url.pathname === '/overview/');
  await signedInAs(page, 'ada@example.test');
});

await run();
