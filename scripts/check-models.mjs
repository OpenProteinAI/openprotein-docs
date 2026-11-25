/**
 * Drives /models in Chrome: the page frame, the base model sidebar, search, sort, filters, the card
 * chips, the hover tools, tooltips, URL state and history, /models.md, and the phone layout.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5002';
const URL_ = `${BASE}/models`;

const browser = await chromium.launch(
  process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : process.env.PLAYWRIGHT_CHANNEL === 'chromium' ? {} : { channel: 'chrome' },
);
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
// A build with sign-in asks the platform who is signed in. Answer "nobody", so the page
// renders signed out and the console stays clean.
await page.route(/\/api\/v1\/auth\/session$/, (route) =>
  route.fulfill({
    status: 200,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': new URL(BASE).origin,
      'access-control-allow-credentials': 'true',
    },
    body: '{"authenticated":false}',
  }),
);

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  FAIL ${msg}`);
};
const check = (ok, msg) => (ok ? console.log(`  ok   ${msg}`) : fail(msg));

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));

const cardIds = () => page.locator('.om-card').evaluateAll((cards) => cards.map((c) => c.id));
const cardNames = () => page.locator('.om-card-name').allTextContents();
const countText = () => page.locator('.om-count').textContent();
const sortedNames = (names) => [...names].sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1));
const settle = (ms = 300) => page.waitForTimeout(ms);

console.log('/models');
await page.goto(URL_, { waitUntil: 'networkidle' });

// ---- catalogue and sidebar
const ids = await cardIds();
check(ids.length > 0, `renders ${ids.length} cards`);
check((await countText()) === String(ids.length), 'title count matches the cards');

// ---- page frame: a section landing page, so no breadcrumb; no TOC rail; the page actions in the header
check(((await page.locator('#nd-page > :first-child').getAttribute('class')) ?? '').includes('op-models'), 'no breadcrumb above the title');
check((await page.locator('#nd-toc').count()) === 0, 'no TOC rail');
const header = page.locator('.om-title-row');
check((await header.locator('button', { hasText: 'Markdown' }).count()) === 1, 'the Markdown menu sits in the header');
await header.locator('button', { hasText: 'Markdown' }).click();
const viewMd = await page.locator('[data-radix-popper-content-wrapper] a', { hasText: 'View as Markdown' }).getAttribute('href');
check(viewMd?.endsWith('/models.md'), 'the Markdown menu points at /models.md');
await page.keyboard.press('Escape');
const markdown = await (await page.request.get(`${URL_}.md`)).text();
const firstName = (await cardNames())[0];
check(markdown.startsWith('# Models') && markdown.includes(`## ${firstName}`), '/models.md serves the catalogue');

// ---- sidebar: the overview, then one entry per base model, every card's page among them
// The page tree's entries sit straight in the viewport's div, after MobileNav's wrapper.
const sidebar = page.locator('#nd-sidebar [data-radix-scroll-area-viewport] > div');
const first = sidebar.locator(':scope > a').first();
check((await first.textContent())?.trim() === 'Overview' && (await first.getAttribute('data-active')) === 'true', 'sidebar opens on an active "Overview"');
const families = await page.locator('.om-card').evaluateAll((cards) => [
  ...new Set(cards.map((c) => [...c.querySelectorAll('.om-info-label')].find((l) => l.textContent === 'Family')?.nextElementSibling?.textContent)),
]);
const entries = await sidebar.locator(':scope > a[href*="/models/"]').evaluateAll((as) => as.map((a) => new URL(a.href).pathname));
// A card links to its version's page, `/models/<model>` or one under it.
const cardPages = await page
  .locator('a.om-card-name')
  .evaluateAll((as) => [...new Set(as.map((a) => new URL(a.href).pathname.split('/').slice(0, 3).join('/')))]);
check(
  JSON.stringify(entries) === JSON.stringify(cardPages),
  `one sidebar entry per base model, in the catalogue's order (${entries.length} entries, ${cardPages.length} on the cards)`,
);
check(
  (await sidebar.locator(':scope > div:not(:has([data-mobile-nav])), :scope > a[href*="#"]').count()) === 0,
  'no model entries or folders',
);

// ---- search
const search = page.locator('.om-search-input');
await search.fill('esm');
await settle();
const found = await page.locator('.om-card').evaluateAll((cards) => cards.map((c) => c.textContent.toLowerCase()));
check(found.length > 0 && found.length < ids.length, `search narrows to ${found.length}`);
check((await countText()) === `${found.length} of ${ids.length}`, 'count reads "N of M" while searching');
check((await page.locator('.om-card mark.om-hl').count()) > 0, 'search marks its matches');
await page.locator('.om-search-actions button[aria-label="Clear search"]').click();
await settle();
check((await cardIds()).length === ids.length, 'clear brings every card back');

// ---- sort: its own group after the filters, Sort then its order, each marked while off its default
const sortBtn = page.locator('.om-tools > .om-btn-group .om-dropdown-btn');
const orderBtn = page.locator('.om-tools > .om-btn-group .om-order-btn');
const facetBtn = (text) => page.locator('.om-facet-btns > button.om-dropdown-btn', { hasText: text });
const filterBtn = facetBtn('Outputs');
const clearAll = page.locator('.om-filter-dropdown .om-clear-all');
// Marked: flagged, and wearing the app's bar under its icon — a button without one has no bar.
const marked = (btn) =>
  btn.evaluate((el) => {
    const bar = getComputedStyle(el.querySelector('.op-btn__content'), '::after').content !== 'none';
    return el.dataset.highlighted === 'true' && bar === !!el.querySelector('.om-dropdown-icon');
  });
const orderMarked = async () => (await orderBtn.getAttribute('data-highlighted')) === 'true';
check(!(await marked(sortBtn)) && !(await marked(filterBtn)) && !(await orderMarked()), 'no button is marked at the defaults');
check((await sortBtn.textContent())?.trim() === 'Sort: Relevance', 'the sort button names its pick');
check((await page.locator('.om-tools > .om-btn-group > .op-btn').count()) === 2, 'Sort and its order join in a group');
await sortBtn.click();
await page.locator('.om-dropdown label', { hasText: 'Name' }).click();
await settle();
let names = await cardNames();
check(JSON.stringify(names) === JSON.stringify(sortedNames(names)), 'sort by name, ascending');
check((await page.locator('.om-dropdown [role="radiogroup"]').count()) === 1, 'the menu holds only Sort by');
await page.keyboard.press('Escape');
await orderBtn.click();
await settle();
names = await cardNames();
check(JSON.stringify(names) === JSON.stringify(sortedNames(names).reverse()), 'sort by name, descending');
check(/sort=name/.test(page.url()) && /order=desc/.test(page.url()), 'sort lands in the URL');
check((await sortBtn.textContent())?.trim() === 'Sort: Name', 'the sort button names the new pick');
check((await orderBtn.getAttribute('aria-label')) === 'Descending', 'the order button names its direction to a reader');
check((await marked(sortBtn)) && (await orderMarked()), 'and both are marked once sorted');
await page.goto(URL_, { waitUntil: 'networkidle' });

// ---- filter dropdowns: a button per facet
const facets = await page.locator('.om-facet-btns > button.om-dropdown-btn').allTextContents();
check(JSON.stringify(facets.map((text) => text.trim())) === JSON.stringify(['Family', 'Outputs', 'Inputs']), 'a filter button per facet');
const pills = await page.locator('.om-facet-btns > button.om-dropdown-btn, .om-tools .om-btn-group > .op-btn').evaluateAll((btns) => {
  const box = getComputedStyle(document.querySelector('.om-search-input')).borderTopLeftRadius;
  const facetBtns = btns.filter((btn) => btn.parentElement.classList.contains('om-facet-btns'));
  return {
    apart: facetBtns.slice(1).every((btn, i) => btn.getBoundingClientRect().left - facetBtns[i].getBoundingClientRect().right > 4),
    corners: [btns[0], btns.at(-2)].every((btn) => getComputedStyle(btn).borderTopLeftRadius === box),
    icons: btns.some((btn) => !!btn.querySelector('.om-dropdown-icon')),
  };
});
check(pills.apart && pills.corners, 'the facets are separate buttons with the search box\'s corners');
check(!pills.icons, 'no filter icon on them');
check((await page.locator('.om-facet-btns button[aria-label="Clear filters"]').count()) === 0, 'no clear-filters button');
await filterBtn.click();
check((await page.locator('.om-filter-dropdown .om-filter-section-header').count()) === 0, 'its menu has no section title, the button names it');
const option = page.locator('.om-filter-dropdown label', { hasText: /^Structures$/ });
await option.click();
await settle();
await page.keyboard.press('Escape');
let shown = await cardIds();
check(shown.length > 0 && shown.length < ids.length, `method filter narrows to ${shown.length}`);
const withChip = await page.locator('.om-card').evaluateAll((cards) =>
  cards.every((c) => [...c.querySelectorAll('.om-method-chip')].some((chip) => chip.textContent === 'Structures')),
);
check(withChip, 'every filtered card offers the method');
check((await filterBtn.locator('.om-count-badge').textContent()) === '1', 'the button counts its pick');
check(/method=structures/.test(page.url()), 'filter lands in the URL');
check(await marked(filterBtn) && !(await marked(sortBtn)), 'the filter button is marked, the sort back at default is not');
await filterBtn.click();
await clearAll.click();
await settle();
await page.keyboard.press('Escape');
check((await cardIds()).length === ids.length && !(await marked(filterBtn)), 'its "Clear all" lifts the filter and its mark');

// ---- Base only: the app's switch before Family, every version or one per base model
const baseOnly = page.locator('.om-facet-btns:not(.is--measure) > .om-switch-row');
const baseSwitch = baseOnly.locator('input[role="switch"]');
check(
  await page.evaluate(() => {
    const row = document.querySelector('.om-facet-btns:not(.is--measure)');
    return row.firstElementChild?.classList.contains('om-switch-row') && row.children[1]?.textContent.trim() === 'Family';
  }),
  'the Base only switch sits before Family',
);
check((await baseOnly.textContent())?.trim() === 'Base only', 'it is labelled Base only');
check(!(await baseSwitch.isChecked()), 'showing all models by default');
const familyBtn = facetBtn('Family');
await familyBtn.click();
check((await page.locator('.om-filter-dropdown .om-filter-extra-section').count()) === 0, 'the Family menu does not hold it');
await page.keyboard.press('Escape');
await baseOnly.click();
await settle();
const baseIds = await cardIds();
check(await baseSwitch.isChecked(), 'a click on its label turns it on');
check(baseIds.length > 0 && baseIds.length < ids.length, `Base only narrows to ${baseIds.length}`);
check((await countText()) === `${baseIds.length} of ${ids.length}`, 'and counts against every model');
check(/versions=base/.test(page.url()), 'it lands in the URL');
check((await familyBtn.locator('.om-count-badge').count()) === 0, 'it is no Family filter');
await baseSwitch.focus();
await page.keyboard.press('Space');
await settle();
check((await cardIds()).length === ids.length && !/versions=/.test(page.url()), 'Space turns it off, every model again');

// ---- input type sits beside the methods; multichain is its first chip
const io = await page.locator('.om-card').evaluateAll((cards) =>
  cards.map((c) => {
    const methods = c.querySelector('.om-card-methods').getBoundingClientRect();
    const types = c.querySelector('.om-card-input-types').getBoundingClientRect();
    const labels = [...c.querySelectorAll('.om-info-label')].map((l) => l.textContent);
    const chips = [...c.querySelectorAll('.om-card-input-types .om-chip')].map((chip) => chip.textContent.trim());
    return { beside: types.left > methods.right, below: types.top >= methods.bottom, labels, chips };
  }),
);
check(io.every((card) => card.beside || card.below), 'input type is beside the methods, or under them');
check(io.some((card) => card.beside) && io.some((card) => card.below), 'both happen across the catalogue');
check(io.every((card) => !card.labels.includes('Inputs')), 'no Inputs row in the details');
check(io.every((card) => !card.labels.includes('Multichain')), 'no Multichain row in the details');
const multichain = io.filter((card) => card.chips.includes('Multichain'));
check(multichain.length > 0 && multichain.length < io.length, `${multichain.length} models are multichain`);
check(multichain.every((card) => card.chips[0] === 'Multichain'), 'Multichain leads their input types');
await page.locator('.om-card-input-types .om-chip', { hasText: /^Multichain$/ }).first().click();
await settle();
check(
  (await cardIds()).length === multichain.length && /input_type=multichain/.test(page.url()),
  'its chip filters to the multichain models',
);
await facetBtn('Inputs').click();
check(
  (await page.locator('.om-filter-dropdown .om-checkbox').first().textContent())?.trim() === 'Multichain',
  'and leads the Inputs menu, picked',
);
await page.keyboard.press('Escape');
await page.locator('.om-card-input-types .om-chip', { hasText: /^Multichain$/ }).first().click();
await settle();
check((await cardIds()).length === ids.length, 'a second click lifts it');
const details = await page.locator('.om-card .om-info-rows').evaluateAll((lists) =>
  lists.map((list) => {
    const items = [...list.querySelectorAll(':scope > .om-info-item')].map((item) => ({
      own: item.classList.contains('is--own-line'),
      top: item.getBoundingClientRect().top,
      cut: item.lastElementChild.scrollWidth > item.lastElementChild.clientWidth,
    }));
    const paired = items.filter((item) => !item.own);
    return { paired: paired.length < 2 || paired[0].top === paired[1].top, cut: items.some((item) => item.cut) };
  }),
);
check(details.every((list) => list.paired), 'the details pair two rows a line');
check(details.every((list) => !list.cut), 'no detail value is cut; one that would be gets a line of its own');
const methodTexts = await page.locator('.om-card').evaluateAll((cards) =>
  cards.map((c) => [...c.querySelectorAll('.om-method-chip')].map((chip) => chip.textContent)),
);
check(methodTexts.every((texts) => new Set(texts).size === texts.length), 'one method chip per output');

// ---- card chips toggle the same filter
const methodChip = page.locator('.om-method-chip', { hasText: 'Embeddings' }).first();
await methodChip.click();
await settle();
shown = await cardIds();
check(shown.length < ids.length && (await methodChip.getAttribute('aria-pressed')) === 'true', 'a method chip filters and reads as selected');
await page.locator('.om-method-chip', { hasText: 'Embeddings' }).first().click();
await settle();
check((await cardIds()).length === ids.length, 'a second click lifts it');

// ---- hover reveals the tools
const withTools = page.locator('.om-card.has--hover-tools').first();
await withTools.hover();
await settle(1200);
const tools = await withTools.evaluate((card) => {
  const panel = card.querySelector('.om-card-tools');
  return {
    visible: getComputedStyle(panel).visibility === 'visible',
    height: panel.getBoundingClientRect().height,
    hrefs: [...panel.querySelectorAll('a.om-tool-link')].map((a) => a.href),
  };
});
check(tools.visible && tools.height > 20, `hover reveals the Tools (${Math.round(tools.height)}px)`);
check(tools.hrefs.length > 0 && tools.hrefs.every((href) => /^https?:\/\//.test(href)), 'tools link into the web app');
await page.mouse.move(5, 500, { steps: 10 });

// ---- a cut description unfolds with the tools, and neither way moves another card
const unfold = await page.evaluate(async () => {
  const cards = [...document.querySelectorAll('.om-card')];
  const index = cards.findIndex((c) => {
    const d = c.querySelector('.om-card-description');
    return d && d.scrollHeight - d.clientHeight > 4;
  });
  return index;
});
if (unfold >= 0) {
  const target = page.locator('.om-card').nth(unfold);
  await target.scrollIntoViewIfNeeded();
  const others = () =>
    page.evaluate((skip) => [...document.querySelectorAll('.om-card')].filter((_, i) => i !== skip).map((c) => Math.round(c.getBoundingClientRect().top)).join(), unfold);
  const at = await others();
  const tb = await target.boundingBox();
  await page.mouse.move(tb.x + 60, tb.y + 40, { steps: 4 });
  await settle(1000);
  const full = await target.locator('.om-card-description').evaluate((d) => d.scrollHeight - d.clientHeight <= 1);
  const during = await others();
  await page.mouse.move(5, 500, { steps: 2 });
  const leaving = [];
  for (let i = 0; i < 8; i++) {
    leaving.push(await others());
    await settle(30);
  }
  check(full, 'hover unfolds the whole description');
  check(during === at && leaving.every((tops) => tops === at), 'unfolding and folding move no other card');
}

// ---- tooltips: a method's can be entered, past the chips under it; the rest close as the pointer leaves
const chip = page.locator('.om-method-chip').first();
await chip.hover();
await settle(400);
check((await page.locator('.op-tooltip .om-method-tip').count()) > 0, 'a method chip explains itself on hover');
check(!!(await chip.getAttribute('aria-describedby')), 'the open tooltip describes its chip');
const methodTip = page.locator('.om-tooltip.is--interactive');
// The card unfolds under the pointer and carries the chip, and its tooltip, down with it.
await settle(1000);
const chipBox = await chip.boundingBox();
const tipBox = await methodTip.boundingBox();
await page.mouse.move(chipBox.x + chipBox.width / 2, chipBox.y + chipBox.height / 2);
await page.mouse.move(tipBox.x + 30, tipBox.y + 20, { steps: 12 });
await settle(400);
check((await methodTip.count()) === 1, 'a method tooltip stays open as the pointer moves into it');
const tipTitle = await methodTip.locator('.om-method-tip-title').boundingBox();
await page.mouse.move(tipTitle.x + 1, tipTitle.y + tipTitle.height / 2);
await page.mouse.down();
await page.mouse.move(tipTitle.x + tipTitle.width - 1, tipTitle.y + tipTitle.height / 2, { steps: 6 });
await page.mouse.up();
check((await page.evaluate(() => window.getSelection().toString())).length > 0, 'its text can be selected');
await page.evaluate(() => window.getSelection().removeAllRanges());
await page.mouse.click(tipBox.x + tipBox.width - 8, tipBox.y + 8);
await settle();
check(new URL(page.url()).pathname === '/models' && !new URL(page.url()).search, 'a click inside neither opens the card nor filters');
await page.mouse.move(5, 500, { steps: 10 });
await settle(400);
check((await methodTip.count()) === 0, 'it closes as the pointer leaves');

await orderBtn.hover();
await settle(400);
const orderTip = await page.locator('.op-tooltip').boundingBox();
const orderTipCentre = { x: orderTip.x + orderTip.width / 2, y: orderTip.y + orderTip.height / 2 };
check(
  !(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('[data-radix-popper-content-wrapper]'), orderTipCentre)),
  'a click on any other tooltip passes through it',
);
await page.mouse.move(orderTipCentre.x, orderTipCentre.y, { steps: 10 });
await settle(400);
check((await page.locator('.op-tooltip').count()) === 0, 'and it closes once the pointer leaves, even onto it');

await page.locator('.om-card-description').first().hover();
await settle(400);
check((await page.locator('.op-tooltip').count()) === 0, 'a description has no tooltip');
await page.mouse.move(5, 500, { steps: 10 });

// The chip clicks above left it focused; focus() on a focused element fires nothing.
await chip.blur();
await chip.focus();
await settle(400);
check((await page.locator('.op-tooltip .om-method-tip').count()) > 0, 'keyboard focus opens a tooltip too');
await chip.blur();

// ---- a ?family= link filters the page in place; Overview and history undo it
const familyName = families.find((f) => f !== 'Other');
await facetBtn('Family').click();
await page.locator('.om-filter-dropdown .om-checkbox', { hasText: new RegExp(`^${familyName}$`) }).click();
await settle();
const familyId = new URL(page.url()).searchParams.get('family');
await page.keyboard.press('Escape');
await page.goto(`${URL_}?family=${encodeURIComponent(familyId)}`, { waitUntil: 'networkidle' });
await settle(600);
const inFamily = await page.locator('.om-card').evaluateAll((cards, name) =>
  cards.every((c) => [...c.querySelectorAll('.om-info-label')].find((l) => l.textContent === 'Family')?.nextElementSibling?.textContent === name),
  familyName,
);
shown = await cardIds();
check(shown.length > 0 && shown.length < ids.length && inFamily, `?family=${familyId} narrows to its ${shown.length} models`);
check((await facetBtn('Family').locator('.om-count-badge').textContent()) === '1', 'and its Family button counts it');

await first.click();
await settle(600);
check((await cardIds()).length === ids.length && !new URL(page.url()).search, '"Overview" clears it');
await page.goBack();
await settle(600);
check((await cardIds()).length === shown.length, 'back restores the family');

// ---- a base model entry opens its page
await page.goto(URL_, { waitUntil: 'networkidle' });
await sidebar.locator(':scope > a[href*="/models/"]').filter({ hasText: /^PoET$/ }).click();
await page.waitForURL(/\/models\/poet$/);
await settle(600);
check((await page.locator('h1.om-title').textContent())?.trim() === 'PoET', '"PoET" opens /models/poet');

// ---- a card opens its base model's page on that version: by its name, or anywhere on the card
await page.goto(URL_, { waitUntil: 'networkidle' });
const pick = page.locator('.om-card').filter({ has: page.locator('.om-card-name', { hasText: /^ESM1v-2$/ }) }).first();
await pick.locator('.om-card-description').click();
await page.waitForURL(/\/models\/esm1\/esm1v-2$/);
await settle(600);
check(
  (await page.locator('.om-version-card.is--selected').getAttribute('data-model-id')) === 'esm1v_t33_650M_UR90S_2',
  'a click on a card opens its version\'s page',
);
await page.goto(URL_, { waitUntil: 'networkidle' });
await page.locator('a.om-card-name', { hasText: 'ESM2 (8M)' }).click();
await page.waitForURL(/\/models\/esm2\/8m$/);
await settle(600);
check(
  (await page.locator('.om-version-card.is--selected').getAttribute('data-model-id')) === 'esm2_t6_8M_UR50D',
  'its name is a link to the same place, a version among several',
);
await page.goto(URL_, { waitUntil: 'networkidle' });
await page.locator('.om-method-chip', { hasText: 'Embeddings' }).first().click();
await settle();
check(new URL(page.url()).pathname === '/models', 'its chips still filter instead');

// ---- hash and URL state on load
const last = ids.at(-1);
await page.goto(`${URL_}#${encodeURIComponent(last)}`, { waitUntil: 'networkidle' });
await settle(900);
check(await page.evaluate((id) => document.getElementById(id)?.classList.contains('is--targeted'), last), 'a #hash on load marks its card');

await page.goto(`${URL_}?sort=name&order=desc`, { waitUntil: 'networkidle' });
await settle();
names = await cardNames();
check(JSON.stringify(names) === JSON.stringify(sortedNames(names).reverse()), 'a shared link restores its sort');

// ---- two columns: the box and every pill share a row, and the cards fill the grid
await page.setViewportSize({ width: 1337, height: 900 });
await page.goto(URL_, { waitUntil: 'networkidle' });
await settle(400);
const twoCol = await page.evaluate(() => {
  const box = (el) => el.getBoundingClientRect();
  const grid = box(document.querySelector('.om-grid'));
  const cards = [...document.querySelectorAll('.om-card')].slice(0, 2).map(box);
  return {
    sameRow: Math.abs(box(document.querySelector('.om-tools')).top - box(document.querySelector('.om-toolbar .om-search')).top) < 2,
    pills: document.querySelectorAll('.om-facet-btns:not(.is--measure) > button').length,
    flush: cards.length === 2 && Math.abs(cards[1].right - grid.right) < 1 && cards[0].top === cards[1].top,
  };
});
check(twoCol.sameRow && twoCol.pills > 1, 'at 1337px the box and the pills share a row');
check(twoCol.flush, 'at 1337px two cards fill the grid');

// ---- phone
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(URL_, { waitUntil: 'networkidle' });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check(overflow <= 0, 'no sideways scroll at 390px');
const phoneFacets = await page.locator('.om-facet-btns > button.om-dropdown-btn').allTextContents();
check(JSON.stringify(phoneFacets.map((text) => text.trim())) === JSON.stringify(['Filters']), 'the facets merge into one Filters button');
await facetBtn('Filters').click();
const merged = page.locator('.om-filter-dropdown.is--sections');
check(
  JSON.stringify(await merged.locator('.om-filter-section-header .om-menu-title').allTextContents()) ===
    JSON.stringify(['Show', 'Family', 'Outputs', 'Inputs']),
  'its menu holds every facet, Show atop Family',
);
await merged.locator('.om-checkbox', { hasText: /^Structures$/ }).click();
await settle();
check((await facetBtn('Filters').locator('.om-count-badge').textContent()) === '1', 'Filters counts its picks');
check(/models? match/.test(await merged.locator('.om-filter-footer-count').textContent()), 'its footer counts the matches');
const menuBox = await merged.boundingBox();
check(menuBox.x >= 0 && menuBox.x + menuBox.width <= 390, 'the menu fits the phone');
await merged.locator('.om-filter-footer .op-btn--primary').click();
await settle();
check((await merged.count()) === 0, 'Done closes it');

check(!errors.length, `no console errors${errors.length ? `:\n    ${errors.join('\n    ')}` : ''}`);

await browser.close();
if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nall checks passed');
