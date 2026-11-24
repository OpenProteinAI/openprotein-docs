import assert from 'node:assert/strict';
import test from 'node:test';
import { LIVE_SPEC_PATHS, prepareLiveSpec } from '../lib/live-openapi.ts';

const servers = [{ url: 'https://api.example.test' }];
const spec = {
  openapi: '3.1.0',
  info: { title: 'API', version: '1' },
  servers: [{ url: 'https://api.openprotein.ai' }],
  paths: {
    '/api/v1/models': { get: { responses: {} } },
    '/api/v1/models/{type}/{id}/{path}': {
      servers: [{ url: 'https://other.example' }],
      post: {
        servers: [{ url: 'https://api.openprotein.ai' }],
        requestBody: { $ref: '#/components/requestBodies/Inference' },
        responses: { 202: { $ref: '#/components/responses/Job' } },
      },
    },
    '/api/v1/models-other': { get: { responses: {} } },
    '/api/v1/assaydata': { get: { responses: {} } },
  },
  components: {
    requestBodies: { Inference: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Params' } } } } },
    responses: { Job: { description: 'Job', content: { 'application/json': { schema: { $ref: '#/components/schemas/Job' } } } } },
    schemas: {
      Params: { type: 'object', properties: { sequences: { type: 'array', items: { type: 'string' } } } },
      Job: { type: 'object', properties: { job_id: { type: 'string' } } },
    },
    securitySchemes: { HTTPBearer: { type: 'http', scheme: 'bearer' } },
  },
};

test('live source URLs distinguish Prompt and Models', () => {
  assert.equal(LIVE_SPEC_PATHS.prompt, '/api/v1/prompt/openapi.json');
  assert.equal(LIVE_SPEC_PATHS.models, '/openapi.json');
});

test('Models selects only its exact prefix and preserves referenced components', () => {
  const live = prepareLiveSpec('models', spec, servers);
  assert.deepEqual(Object.keys(live.paths), ['/api/v1/models', '/api/v1/models/{type}/{id}/{path}']);
  assert.deepEqual(live.components, spec.components);
});

test('Prompt retains system-prompt UUID paths', () => {
  const prompt = { ...spec, paths: { '/api/v1/prompt/example-uuid': { post: { responses: {} } } } };
  assert.deepEqual(prepareLiveSpec('prompt', prompt, servers).paths, prompt.paths);
});

test('server choices are pinned without mutating the fetched document', () => {
  const before = structuredClone(spec);
  const live = prepareLiveSpec('models', spec, servers);
  assert.deepEqual(live.servers, servers);
  const path = live.paths['/api/v1/models/{type}/{id}/{path}'];
  assert.equal(path.servers, undefined);
  assert.equal(path.post.servers, undefined);
  assert.deepEqual(spec, before);
});

for (const [name, value] of [
  ['null', null],
  ['array', []],
  ['missing fields', {}],
  ['invalid OpenAPI version type', { openapi: 3, paths: spec.paths }],
  ['paths array', { openapi: '3.1.0', paths: [] }],
  ['empty paths', { openapi: '3.1.0', paths: {} }],
  ['null path item', { ...spec, paths: { '/api/v1/models': null } }],
  ['boolean operation', { ...spec, paths: { '/api/v1/models': { get: true } } }],
  ['string operation', { ...spec, paths: { '/api/v1/models': { get: 'x' } } }],
  ['array operation', { ...spec, paths: { '/api/v1/models': { get: [] } } }],
  ['null operation', { ...spec, paths: { '/api/v1/models': { get: null } } }],
]) {
  test(`invalid documents preserve the fallback: ${name}`, () => {
    assert.equal(prepareLiveSpec('models', value, servers), null);
  });
}

test('referenced path items and operations preserve the fallback', () => {
  const components = {
    ...spec.components,
    pathItems: { Override: { servers: [{ url: 'https://api.openprotein.ai' }], get: { responses: {} } } },
  };
  for (const item of [
    { $ref: '#/components/pathItems/Override', get: { responses: {} } },
    { get: { $ref: '#/components/pathItems/Override/get' } },
  ]) {
    assert.equal(prepareLiveSpec('models', { ...spec, components, paths: { '/api/v1/models': item } }, servers), null);
  }
});

test('a main API document with no Models routes preserves the fallback', () => {
  assert.equal(prepareLiveSpec('models', { ...spec, paths: { '/api/v1/jobs': {} } }, servers), null);
});
