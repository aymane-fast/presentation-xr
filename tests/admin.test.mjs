import test from 'node:test';
import assert from 'node:assert/strict';
import {GET, DELETE} from '../api/admin.mjs';

const url = 'https://example.com/api/admin';
const credential = 'test-password-only';

test('admin listing and deletion require authorization and validate the deletion scope', async t => {
  t.mock.method(globalThis, 'fetch', async () => assert.fail('Unexpected database request'));
  delete process.env.SUS_ADMIN_PASSWORD;
  assert.equal((await GET(new Request(url))).status, 503);
  process.env.SUS_ADMIN_PASSWORD = credential;
  assert.equal((await GET(new Request(url))).status, 401);
  assert.equal((await DELETE(new Request(url, {method:'DELETE'}))).status, 401);

  const send = body => DELETE(new Request(url, {
    method:'DELETE', headers:{Authorization:`Bearer ${credential}`, 'Content-Type':'application/json'},
    body:JSON.stringify(body)
  }));
  for (const body of [{ids:[]}, {ids:[0]}, {ids:['1']}, {confirmation:'SUPPRIMER'}]) {
    assert.equal((await send(body)).status, 400);
  }
});

test('admin paginates and deletes from the same table, including all rows when confirmed', async t => {
  process.env.SUS_ADMIN_PASSWORD = credential;
  process.env.SUPABASE_URL = 'https://sample-ref.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'test-key';
  const headers = {Authorization:`Bearer ${credential}`, 'Content-Type':'application/json'};
  let rows = Array.from({length:52}, (_, i) => ({id:52-i}));
  t.mock.method(globalThis, 'fetch', async (target, options) => {
    const upstream = new URL(target);
    assert.equal(upstream.pathname, '/rest/v1/sus_responses');
    const filter = upstream.searchParams.get('id');
    if (options.method === 'GET') {
      const matches = filter ? rows.filter(row => row.id < Number(filter.slice(3))) : rows;
      return Response.json(matches.slice(0, Number(upstream.searchParams.get('limit'))));
    }
    assert.equal(options.method, 'DELETE');
    const originalCount = rows.length;
    if (filter === 'not.is.null') rows = [];
    else {
      assert.equal(filter, 'in.(52,50)');
      rows = rows.filter(row => ![52,50].includes(row.id));
    }
    return new Response(null, {status:204, headers:{'Content-Range':`*/${originalCount-rows.length}`}});
  });
  const read = async (suffix = '') => (await GET(new Request(url + suffix, {headers}))).json();
  const remove = async body => (await DELETE(new Request(url, {
    method:'DELETE', headers, body:JSON.stringify(body)
  }))).json();
  const page = await read();
  assert.equal(page.responses.length, 50);
  assert.equal(page.nextBefore, 3);
  assert.deepEqual((await read('?before=3')).responses, [{id:2},{id:1}]);
  assert.deepEqual(await remove({ids:[52,50,52]}), {deleted:2});
  assert.equal((await read()).responses[0].id, 51);
  assert.deepEqual(await remove({confirmation:'SUPPRIMER TOUT'}), {deleted:50});
  assert.deepEqual(await read(), {responses:[], nextBefore:null});
});
