import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { payBill } from './citizenApi';

describe('citizenApi', () => {
  it('payBill returns ok:false on 401', async () => {
    const orig = global.fetch;
    global.fetch = async () => new Response(JSON.stringify({ status: 'error' }), { status: 401 });
    const r = await payBill('b1', 'tok');
    assert.equal(r.ok, false);
    assert.equal(r.status, 401);
    global.fetch = orig;
  });
});