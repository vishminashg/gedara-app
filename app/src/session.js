import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setToken, onSessionExpired } from './api';

const KEY = 'gedara.session';
const Ctx = createContext(null);
export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');

  const signOut = useCallback(async (msg = '') => {
    setToken(null); setUser(null); setNotice(msg);
    try { await AsyncStorage.removeItem(KEY); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    onSessionExpired(() => signOut('Your session ended. Please sign in again.'));
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const s = JSON.parse(raw);
          setToken(s.token);
          const me = await api.get('/me');
          setUser({ ...me, token: s.token });
        }
      } catch { setToken(null); }
      setReady(true);
    })();
  }, [signOut]);

  const signIn = useCallback(async (payload) => {
    setToken(payload.token);
    setUser({ ...payload.user, token: payload.token });
    setNotice('');
    try { await AsyncStorage.setItem(KEY, JSON.stringify({ token: payload.token })); } catch { /* ignore */ }
  }, []);

  return <Ctx.Provider value={{ user, ready, notice, signIn, signOut, setUser }}>{children}</Ctx.Provider>;
}
