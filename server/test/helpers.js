process.env.HIDE_PAST_SLOTS = '0'; // tests use fixed seed data, so they must not depend on the time of day
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { openDb, isoDate } from '../src/db.js';
import { seed, DEMO_PASSWORD } from '../src/seed.js';
import { createApp } from '../src/app.js';

export { assert, isoDate };

/** Register a functional test case. Name format "TC-xx | requirements | title" is parsed for the report. */
export function tc(id, reqs, title, fn) {
  test(`${id} | ${reqs} | ${title}`, async () => {
    const db = openDb();
    const ids = seed(db);
    const app = createApp(db);
    const api = new Client(app);
    await fn({ db, ids, app, api });
  });
}

class Client {
  constructor(app) { this.app = app; this.token = null; }
  as(token) { const c = new Client(this.app); c.token = token; return c; }
  req(method, url, body) {
    let r = request(this.app)[method](url);
    if (this.token) r = r.set('Authorization', `Bearer ${this.token}`);
    return body === undefined ? r : r.send(body);
  }
  get(u) { return this.req('get', u); }
  post(u, b = {}) { return this.req('post', u, b); }
  patch(u, b = {}) { return this.req('patch', u, b); }
  delete(u) { return this.req('delete', u); }
  async login(email) {
    const r = await request(this.app).post('/api/auth/login').send({ email, password: DEMO_PASSWORD });
    assert.equal(r.status, 200);
    return this.as(r.body.token);
  }
  customer() { return this.login('dilani@gedara.lk'); }
  provider() { return this.login('nimal@gedara.lk'); }
  admin() { return this.login('ruwan@gedara.lk'); }
}
