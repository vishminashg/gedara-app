import { z } from 'zod';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const notFound = (what = 'Item') => new HttpError(404, `${what} not found.`);

/** Validate req.body (or any value) with a zod schema; throw a 400 with a readable message. */
export function parse(schema, value) {
  const r = schema.safeParse(value);
  if (!r.success) {
    const first = r.error.issues[0];
    const field = first.path.join('.') || 'input';
    throw new HttpError(400, `${field}: ${first.message}`);
  }
  return r.data;
}
export { z };

export const wrap = fn => (req, res, next) => {
  try { const out = fn(req, res, next); if (out !== undefined && !res.headersSent) res.json(out); }
  catch (e) { next(e); }
};
