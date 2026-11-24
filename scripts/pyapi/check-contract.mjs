export function browserOptions(env = process.env) {
  if (env.CHROME_PATH) return { executablePath: env.CHROME_PATH };
  return env.PLAYWRIGHT_CHANNEL === 'chromium' ? {} : { channel: 'chrome' };
}

export function retirementsByPage(historical, published, records) {
  if (!Array.isArray(records)) throw new Error('Anchor retirements must be an array');
  const result = new Map([...historical.keys()].map((page) => [page, new Set()]));
  for (const row of records) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Invalid retirement record');
    if (Object.keys(row).some((key) => !['page', 'anchor', 'reason', 'replacement', 'removed'].includes(key))) throw new Error('Unknown retirement field');
    if (!historical.get(row.page)?.has(row.anchor)) throw new Error(`${row.page}#${row.anchor}: not a historical anchor`);
    if (typeof row.reason !== 'string' || !row.reason.trim()) throw new Error('Retirement needs a reason');
    if (result.get(row.page).has(row.anchor)) throw new Error('Duplicate retirement');
    if (published.get(row.anchor) === row.page) throw new Error('Retirement is still published on its old page');
    const replacement = Object.hasOwn(row, 'replacement');
    const removed = Object.hasOwn(row, 'removed');
    if (replacement === removed) throw new Error('Retirement needs exactly one disposition');
    if (removed && row.removed !== true) throw new Error('Removal must be explicit true');
    if (replacement) {
      const target = row.replacement;
      if (!target || typeof target !== 'object' || Array.isArray(target)
          || Object.keys(target).some((key) => !['page', 'anchor'].includes(key))
          || typeof target.page !== 'string' || typeof target.anchor !== 'string'
          || published.get(target.anchor) !== target.page) throw new Error('Retirement replacement is not published on its named page');
    }
    result.get(row.page).add(row.anchor);
  }
  return result;
}

export function anchorFindings(ids, expected, retired) {
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return {
    missing: expected.filter((id) => !counts.has(id)),
    duplicated: expected.filter((id) => (counts.get(id) ?? 0) > 1),
    retiredPresent: retired.filter((id) => counts.has(id)),
  };
}

export function sourcePrefix(pin) {
  if (typeof pin.commit !== 'string' || !/^[a-f0-9]{40}$/.test(pin.commit)) throw new Error('Invalid immutable SDK pin commit');
  const repo = pin.repository ?? 'https://github.com/OpenProteinAI/openprotein-python';
  if (typeof repo !== 'string' || !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error('Invalid SDK repository');
  return `${repo}/blob/${pin.commit}/`;
}

export function publishedSpecs(documents, pin) {
  sourcePrefix(pin);
  const universe = new Map();
  const add = (path, page) => {
    if (universe.has(path) && universe.get(path) !== page) throw new Error(`${path}: ambiguous publication pages`);
    universe.set(path, page);
  };
  for (const [file, document] of documents) {
    if (document?.source?.ref !== pin.commit) throw new Error(`${file}: source.ref does not match SDK pin`);
    if (pin.repository && document?.source?.repository !== pin.repository) throw new Error(`${file}: source.repository does not match SDK pin`);
    if (!Array.isArray(document.entries)) throw new Error(`${file}: entries must be an array`);
    for (const entry of document.entries) {
      if (entry.summary_only || !entry.page) continue;
      if (typeof entry.path !== 'string' || typeof entry.page !== 'string') throw new Error(`${file}: invalid published entry`);
      add(entry.path, entry.page);
      for (const member of entry.members ?? []) {
        if (typeof member.name !== 'string') throw new Error(`${file}: invalid member name`);
        add(`${entry.path}.${member.name}`, entry.page);
      }
    }
  }
  return universe;
}

export function historicalAnchors(golden, baseline) {
  if (!baseline || typeof baseline !== 'object' || Array.isArray(baseline)
      || Object.keys(baseline).sort().join(',') !== 'anchors,docsCommit'
      || typeof baseline.docsCommit !== 'string' || !/^[a-f0-9]{40}$/.test(baseline.docsCommit)
      || !Array.isArray(baseline.anchors)) throw new Error('Invalid deployed anchor baseline');
  const historical = new Map([...golden].map(([page, ids]) => [page, new Set(ids)]));
  const pairs = new Set();
  for (const row of baseline.anchors) {
    if (!Array.isArray(row) || row.length !== 2 || row.some((value) => typeof value !== 'string')) {
      throw new Error('Invalid deployed anchor row');
    }
    const [page, id] = row;
    // This published literal is a docstring field, never a wildcard pattern.
    const kwargs = page === 'fold' && id === 'openprotein.fold.BoltzAffinity.**kwargs';
    if (!historical.has(page) || (!/^openprotein(?:\.[A-Za-z_][A-Za-z0-9_]*)+$/.test(id) && !kwargs)) {
      throw new Error(`Invalid deployed anchor pair: ${page}#${id}`);
    }
    const key = JSON.stringify(row);
    if (pairs.has(key)) throw new Error(`Duplicate deployed anchor pair: ${page}#${id}`);
    pairs.add(key);
    historical.get(page).add(id);
  }
  return historical;
}

export function referenceRetirements(historical, published, records) {
  const retired = retirementsByPage(historical, published, records);
  for (const [page, ids] of historical) {
    for (const id of ids) {
      if (published.get(id) !== page && !retired.get(page).has(id)) {
        throw new Error(`Missing historical anchor disposition: ${page}#${id}`);
      }
    }
  }
  return retired;
}

export function referenceTargetValid(target, fragment, universe, pages, headingCounts) {
  if (!pages.includes(target)) return false;
  if (fragment === 'openprotein' || fragment.startsWith('openprotein.')) return universe.get(fragment) === target;
  const counts = headingCounts.get(target)?.get(fragment);
  return counts?.headings === 1 && counts?.ids === 1;
}

export function currentPageAnchors(name, historical, retired, universe) {
  const retiredSet = retired.get(name) ?? new Set();
  const expected = [...(historical.get(name) ?? new Set())].filter((id) => !retiredSet.has(id));
  const published = [...universe].filter(([, owner]) => owner === name).map(([id]) => id);
  return { expected, checked: [...new Set([...expected, ...published])], retired: [...retiredSet] };
}
