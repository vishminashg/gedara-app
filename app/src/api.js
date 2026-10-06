// Thin fetch wrapper. Every screen talks to the server through here.
import { loadBase } from './config';

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const state = { base: null, token: null, onExpire: null };

export const setToken = (t) => { state.token = t; };
export const setBase = (b) => { state.base = b; };
export const onSessionExpired = (fn) => { state.onExpire = fn; };
export const getBase = () => state.base;

async function request(method, path, body) {
  if (!state.base) state.base = await loadBase();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  let res;
  try {
    res = await fetch(`${state.base}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctl.signal
    });
  } catch (e) {
    throw new ApiError(0, e.name === 'AbortError'
      ? 'The server took too long to answer. Check your connection and try again.'
      : 'Cannot reach the Gedara server. Check that it is running and that the address in Server settings is right.');
  } finally { clearTimeout(timer); }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    if (res.status === 401 && state.token && state.onExpire) state.onExpire();
    throw new ApiError(res.status, (data && data.error) || `Request failed (${res.status}).`);
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b = {}) => request('POST', p, b),
  patch: (p, b = {}) => request('PATCH', p, b),
  del: (p) => request('DELETE', p)
};

export const qs = (o) => {
  const e = Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false);
  return e.length ? '?' + e.map(([k, v]) => `${k}=${encodeURIComponent(v === true ? 1 : v)}`).join('&') : '';
};
