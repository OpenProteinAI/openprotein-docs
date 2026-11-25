import assert from 'node:assert/strict';
import test from 'node:test';
import { formatBibtex, paperBibtex } from '../lib/model-bibtex.ts';

const BOLTZ =
  ' @article{Wohlwend_2024, title={Boltz-1 Democratizing Biomolecular Interaction Modeling}, ' +
  'DOI={10.1101/2024.11.19.624167}, publisher={openRxiv}, author={Wohlwend, Jeremy and Corso, Gabriele}, ' +
  'year={2024}, month=Nov }\n';

test('formatBibtex puts each field on its own line', () => {
  assert.equal(
    formatBibtex(BOLTZ),
    [
      '@article{Wohlwend_2024,',
      '  title={Boltz-1 Democratizing Biomolecular Interaction Modeling},',
      '  DOI={10.1101/2024.11.19.624167},',
      '  publisher={openRxiv},',
      '  author={Wohlwend, Jeremy and Corso, Gabriele},',
      '  year={2024},',
      '  month=Nov',
      '}',
    ].join('\n'),
  );
});

test('formatBibtex splits only at top-level commas', () => {
  assert.equal(
    formatBibtex('@inproceedings{Jr_2023, title={A {B, C} D}, note="x, y", author={M{\\"u}ller, A},}'),
    '@inproceedings{Jr_2023,\n  title={A {B, C} D},\n  note="x, y",\n  author={M{\\"u}ller, A}\n}',
  );
});

test('formatBibtex refuses anything but one entry', () => {
  for (const text of ['', '<html>DOI not found</html>', '@article{Key, title={Open', '@article{A, x=1} @article{B, y=2}']) {
    assert.equal(formatBibtex(text), null, text);
  }
});

test('paperBibtex asks doi.org once per DOI', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(BOLTZ));

  const [first, again] = await Promise.all([
    paperBibtex('https://www.doi.org/10.1/once'),
    paperBibtex('https://www.doi.org/10.1/once'),
  ]);

  assert.match(first, /^@article\{Wohlwend_2024,\n {2}title=/);
  assert.equal(again, first);
  assert.equal(await paperBibtex('https://www.doi.org/10.1/once'), first);
  assert.deepEqual(globalThis.fetch.mock.calls[0].arguments, [
    'https://doi.org/10.1/once',
    { headers: { Accept: 'application/x-bibtex' } },
  ]);
  assert.equal(globalThis.fetch.mock.callCount(), 1);
});

test('paperBibtex asks nothing for a link that is not a DOI', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(BOLTZ));

  assert.equal(await paperBibtex('https://openreview.net/forum?id=1p9hQTbjgo'), null);
  assert.equal(await paperBibtex(''), null);
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});

test('paperBibtex asks again after a failure', async (t) => {
  const answers = [new Response('', { status: 429 }), new TypeError('fetch failed'), new Response(BOLTZ)];
  t.mock.method(globalThis, 'fetch', async () => {
    const answer = answers.shift();
    if (answer instanceof Error) throw answer;
    return answer;
  });

  assert.equal(await paperBibtex('https://doi.org/10.1/flaky'), null);
  assert.equal(await paperBibtex('https://doi.org/10.1/flaky'), null);
  assert.match(await paperBibtex('https://doi.org/10.1/flaky'), /^@article\{Wohlwend_2024,/);
  assert.equal(globalThis.fetch.mock.callCount(), 3);
});

test('paperBibtex sends one request at a time', async (t) => {
  let inFlight = 0;
  let most = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    most = Math.max(most, ++inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight--;
    return new Response(BOLTZ);
  });

  await Promise.all(['a', 'b', 'c'].map((id) => paperBibtex(`https://doi.org/10.1/${id}`)));

  assert.equal(globalThis.fetch.mock.callCount(), 3);
  assert.equal(most, 1);
});
