// Language support: English, Sinhala (සිංහල) and Tamil (தமிழ்).
//
// How it works: every piece of text in the app already goes through the shared building blocks in ui.js (T, Btn, Chip, Field ...).
// Those blocks call t() with the English text. t() looks it up in the Sinhala / Tamil list (src/lang/si.js, ta.js).
// Text that contains a changing value ("Booking for {0}") is matched with a pattern, and the value is translated on its own
// (so "Sat 17 Oct 9:00 am" becomes a Sinhala or Tamil date). Anything without a translation (a person's name, a message typed by
// a customer, the seeded sample bios) is shown unchanged, so the app never shows an empty or broken label.
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import si from './lang/si';
import ta from './lang/ta';

export const LANGS = [['en', 'English'], ['si', 'සිංහල'], ['ta', 'தமிழ்']];
const KEY = 'gedara.lang';

const AMPM = { si: { am: 'පෙ.ව.', pm: 'ප.ව.' }, ta: { am: 'முற்பகல்', pm: 'பிற்பகல்' } };
const RANGE = {
  si: (a, b, c, d) => `${a} ${b} සිට ${c} ${d} දක්වා`,
  ta: (a, b, c, d) => `${a} ${b} முதல் ${c} ${d} வரை`
};

/** Turns the dictionary into a fast exact-match table plus a list of patterns for text with {0}, {1} placeholders. */
function compile(map) {
  const exact = new Map();
  const pats = [];
  for (const [k, v] of Object.entries(map)) {
    if (/\{\d\}/.test(k)) {
      const idx = [];
      const src = k.split(/(\{\d\})/).map((part) => {
        const m = part.match(/^\{(\d)\}$/);
        if (m) { idx.push(Number(m[1])); return '(.+?)'; }
        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }).join('');
      pats.push({ re: new RegExp('^' + src + '$'), idx, tpl: v, weight: k.replace(/\{\d\}/g, '').length });
    } else exact.set(k, v);
  }
  pats.sort((x, y) => y.weight - x.weight);
  return { exact, pats };
}

const TABLES = { si: compile(si), ta: compile(ta) };

function convert(lang, table, s) {
  const lead = s.match(/^\s*/)[0];
  const core = s.trim();
  const tail = s.slice(lead.length + core.length);
  if (!core) return s;
  const hit = table.exact.get(core);
  if (hit !== undefined) return lead + hit + tail;

  for (const p of table.pats) {
    const m = core.match(p.re);
    if (!m) continue;
    const args = [];
    p.idx.forEach((n, j) => { args[n] = convert(lang, table, m[j + 1]); });
    return lead + p.tpl.replace(/\{(\d)\}/g, (_, n) => (args[n] === undefined ? '' : args[n])) + tail;
  }

  // "Sat 17 Oct 9:00 am · 2 photos": translate each part on its own.
  if (core.includes(' · ')) return lead + core.split(' · ').map((x) => convert(lang, table, x)).join(' · ') + tail;

  // Server validation messages arrive as "field: message". The field name is not useful to the person, so show the message only.
  const fm = core.match(/^[a-z][A-Za-z.]*: (.+)$/);
  if (fm && table.exact.has(fm[1])) return lead + table.exact.get(fm[1]) + tail;

  // "17 Oct to 23 Oct"
  const rg = core.match(/^(\d{1,2}) ([A-Za-z]{3,4}) to (\d{1,2}) ([A-Za-z]{3,4})$/);
  if (rg && RANGE[lang]) return lead + RANGE[lang](rg[1], convert(lang, table, rg[2]), rg[3], convert(lang, table, rg[4])) + tail;

  // Complaint reference: "C-1041: No-show"
  const cr = core.match(/^(C-\d+): (.+)$/);
  if (cr) return lead + cr[1] + ': ' + convert(lang, table, cr[2]) + tail;

  // Dates and times inside longer text: "Sat 17 Oct 9:00 am", "Tomorrow 2:00 pm".
  let out = core;
  out = out.replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Today|Tomorrow)\b(?= \d)/g, (w) => table.exact.get(w) || w);
  out = out.replace(/(\d{1,2} )(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\b/g, (m, d, mo) => d + (table.exact.get(mo === 'Sept' ? 'Sep' : mo) || mo));
  out = out.replace(/(\d{1,2}:\d\d) (am|pm)\b/g, (m, tm, ap) => (AMPM[lang] ? `${AMPM[lang][ap]} ${tm}` : m));
  return lead + out + tail;
}

const caches = { si: new Map(), ta: new Map() };

/** Translate one English string into the chosen language. Returns the text unchanged for English or when nothing matches. */
export function translate(lang, s) {
  if (lang === 'en' || typeof s !== 'string' || !s) return s;
  const cache = caches[lang];
  if (!cache) return s;
  let r = cache.get(s);
  if (r === undefined) {
    r = convert(lang, TABLES[lang], s);
    // Test hook: the browser tests switch this on to list any English text that reached the screen without a translation.
    if (r === s && typeof window !== 'undefined' && window.__gedaraMissing && /[A-Za-z]{3,}/.test(s)) window.__gedaraMissing.add(s.trim());
    if (cache.size > 4000) cache.clear();
    cache.set(s, r);
  }
  return r;
}

/** Translates text children. Several pieces such as "Booking ", {id} are joined first so patterns can match the whole sentence. */
export function translateNode(lang, node) {
  if (lang === 'en') return node;
  if (typeof node === 'string') return translate(lang, node);
  if (Array.isArray(node)) {
    if (node.length && node.every((x) => typeof x === 'string' || typeof x === 'number')) return translate(lang, node.join(''));
    return node.map((x) => (typeof x === 'string' ? translate(lang, x) : x));
  }
  return node;
}

const Ctx = createContext({ lang: 'en', setLang: () => {}, t: (s) => s });
export const useLang = () => useContext(Ctx);
/** t('English text') for strings built in code (placeholders, accessibility labels, text sent in chat). */
export const useT = () => useContext(Ctx).t;

export function LangProvider({ children }) {
  const [lang, setLangState] = useState('en');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(KEY);
        if (saved && LANGS.some(([k]) => k === saved)) setLangState(saved);
      } catch { /* storage unavailable: stay on English */ }
      setReady(true);
    })();
  }, []);
  const setLang = useCallback(async (l) => {
    setLangState(l);
    try { await AsyncStorage.setItem(KEY, l); } catch { /* ignore */ }
  }, []);
  const value = useMemo(() => ({ lang, setLang, t: (s) => translate(lang, s) }), [lang, setLang]);
  if (!ready) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
