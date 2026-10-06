import fs from 'node:fs';
import { openDb } from './db.js';
import { seed } from './seed.js';
import { createApp } from './app.js';

const file = process.env.DB_FILE || new URL('../gedara.db', import.meta.url).pathname;
const fresh = !fs.existsSync(file);
const db = openDb(file);
if (fresh) { seed(db); console.log('Created and seeded a new database.'); }

const port = Number(process.env.PORT || 4000);
createApp(db).listen(port, '0.0.0.0', () => console.log(`Gedara API listening on http://0.0.0.0:${port}`));
