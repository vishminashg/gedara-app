import express from 'express';
import cors from 'cors';
import { publicRoutes, accountRoutes, customerRoutes } from './routes-customer.js';
import { providerRoutes } from './routes-provider.js';
import { adminRoutes } from './routes-admin.js';
import { HttpError } from './http.js';
import { resetDb } from './seed.js';

export function createApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '200kb' }));
  // Test-only hook: lets the end-to-end suite start every test from the same seed data. Off unless explicitly enabled.
  if (process.env.ALLOW_TEST_RESET === '1') app.post('/api/test/reset', (req, res) => { resetDb(db); res.json({ ok: true }); });
  app.use('/api', publicRoutes(db));
  app.use('/api', accountRoutes(db));
  app.use('/api', customerRoutes(db));
  app.use('/api', providerRoutes(db));
  app.use('/api', adminRoutes(db));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
  });
  return app;
}
