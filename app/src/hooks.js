import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/** Loads data when the screen is focused (so lists are fresh after going back) and exposes loading and error state. */
export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);
  const run = useCallback(async (quiet) => {
    if (!quiet) setLoading(true);
    try { const d = await fn(); if (alive.current) { setData(d); setError(''); } }
    catch (e) { if (alive.current) setError(e.message); }
    finally { if (alive.current) setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useFocusEffect(useCallback(() => { run(data !== null); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [run]));
  return { data, error, loading, reload: () => run(false), setData };
}

/** Runs an async action with a busy flag and an error message the screen can show. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = useCallback(async (fn) => {
    setBusy(true); setError('');
    try { return await fn(); }
    catch (e) { setError(e.message); return undefined; }
    finally { setBusy(false); }
  }, []);
  return { busy, error, setError, run };
}

export function useToast() {
  const [msg, setMsg] = useState('');
  const t = useRef();
  const show = useCallback((m) => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(''), 2600); }, []);
  useEffect(() => () => clearTimeout(t.current), []);
  return { msg, show };
}

/** True on a laptop-sized window. The admin console switches to the desktop layout from the prototype (sidebar, master and detail). */
export const useWide = () => useWindowDimensions().width >= 900;
