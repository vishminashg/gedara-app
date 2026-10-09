// Shared building blocks. Each one mirrors a component class from the Milestone 02 prototype.
import React from 'react';
import { View, Text as RNText, Pressable, TextInput, ScrollView, Modal, ActivityIndicator, StyleSheet, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { C, F, R, shadow, AVATAR, initials } from './theme';
import { useLang, translateNode, LANGS } from './i18n';

// Sinhala and Tamil are not in the Figtree / Bricolage fonts, so in those languages the phone's own font is used
// (same weights), with a taller line so tall letters and marks are not cut off.
const WEIGHT = { Figtree_500Medium: '500', Figtree_600SemiBold: '600', Figtree_700Bold: '700', BricolageGrotesque_700Bold: '700' };

/** Every piece of text in the app is drawn by this: it translates the text and adjusts the font for Sinhala and Tamil. */
export function Text({ style, children, plain, ...p }) {
  const { lang } = useLang();
  let st = style;
  if (plain) return <RNText {...p} style={st}>{children}</RNText>;   // brand name: never translated or restyled
  if (lang !== 'en') {
    const f = { ...(StyleSheet.flatten(style) || {}) };
    if (f.fontFamily && WEIGHT[f.fontFamily]) { f.fontWeight = WEIGHT[f.fontFamily]; delete f.fontFamily; }
    f.lineHeight = Math.round((typeof f.lineHeight === 'number' ? f.lineHeight * 1.18 : (f.fontSize || 14) * 1.5));
    st = f;
  }
  const out = translateNode(lang, children);
  // Spread so React does not ask for keys on the pieces of a sentence.
  return Array.isArray(out) ? React.createElement(RNText, { ...p, style: st }, ...out) : <RNText {...p} style={st}>{out}</RNText>;
}

export const Icon = ({ name, size = 18, color = 'currentColor' }) => <Feather name={name} size={size} color={color === 'currentColor' ? C.text : color} />;

export const T = ({ style, b, muted, small, children, ...p }) => (
  <Text {...p} style={[{ fontFamily: b ? F.uiB : F.ui, fontSize: small ? 12.5 : 14, color: muted ? C.muted : C.text, lineHeight: small ? 18 : 20 }, style]}>{children}</Text>
);
export const H1 = ({ children, style }) => <Text accessibilityRole="header" style={[{ fontFamily: F.head, fontSize: 24, lineHeight: 28, color: C.text }, style]}>{children}</Text>;
export const H3 = ({ children, style }) => <Text accessibilityRole="header" style={[{ fontFamily: F.uiB, fontSize: 14, color: C.text }, style]}>{children}</Text>;

/* ---------- layout ---------- */
export function Screen({ children, footer, scroll = true, onRefresh, refreshing = false, style }) {
  // A Header placed first is hoisted out of the scroll area so the back button never scrolls away.
  const kids = React.Children.toArray(children);
  const head = kids.length && kids[0].type === Header ? kids.shift() : null;
  const body = scroll
    ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.pad, { maxWidth: 1100, width: '100%', alignSelf: 'center' }, style]}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}>{kids}</ScrollView>
    : <View style={[{ flex: 1 }, style]}>{kids}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      {head}
      {body}
      {footer ? <View style={s.sticky}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function Header({ title, back = true, right }) {
  const nav = useNavigation();
  return (
    <View style={s.hdr}>
      {back && nav.canGoBack() ? <IconBtn name="chevron-left" label="Back" onPress={() => nav.goBack()} /> : null}
      <Text accessibilityRole="header" numberOfLines={1} style={s.hdrTitle}>{title}</Text>
      {right}
    </View>
  );
}

export function BrandBar({ title, right }) {
  return (
    <View style={s.brandbar}>
      <Text plain={title === 'Gedara'} style={s.logo}>{title}</Text>
      {right}
    </View>
  );
}

export const IconBtn = ({ name, label, onPress, dot, onBrand, testID }) => {
  const { t } = useLang();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t(label)} testID={testID} onPress={onPress}
      style={[s.iconbtn, onBrand && { backgroundColor: 'rgba(255,255,255,.14)', borderColor: 'transparent' }]}>
      <Feather name={name} size={18} color={onBrand ? '#fff' : C.text} />
      {dot ? <View style={s.dot} /> : null}
    </Pressable>
  );
};

export const Section = ({ title, hint, children }) => (
  <View style={{ gap: 8 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
      <H3>{title}</H3>
      {hint ? <T small muted style={{ flexShrink: 1, textAlign: 'right' }}>{hint}</T> : null}
    </View>
    {children}
  </View>
);

export const Card = ({ children, onPress, style, label, testID }) => {
  const { t } = useLang();
  const inner = [s.card, style];
  return onPress
    ? <Pressable accessibilityRole="button" accessibilityLabel={t(label)} testID={testID} onPress={onPress} style={({ pressed }) => [inner, pressed && { opacity: 0.85 }]}>{children}</Pressable>
    : <View style={inner} testID={testID}>{children}</View>;
};

export const Row = ({ children, style, gap = 8 }) => <View style={[{ flexDirection: 'row', gap }, style]}>{children}</View>;

export const KV = ({ k, v, last, vNode }) => (
  <View style={[s.kv, last && { borderBottomWidth: 0 }]}>
    <T muted style={{ flexShrink: 0, maxWidth: '45%' }}>{k}</T>
    {vNode || <T b style={{ flex: 1, textAlign: 'right' }}>{v}</T>}
  </View>
);

/* ---------- controls ---------- */
export function Btn({ label, onPress, kind = 'primary', icon, disabled, busy, small, testID, style }) {
  const { t } = useLang();
  const sec = kind === 'secondary', bad = kind === 'danger';
  const fg = sec ? C.brand : bad ? C.bad : C.onBrand;
  const off = disabled || busy;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t(label)} accessibilityState={{ disabled: !!off, busy: !!busy }} testID={testID}
      disabled={off} onPress={onPress}
      style={({ pressed }) => [s.btn, small && { paddingHorizontal: 12, flex: 1 },
        sec && { backgroundColor: 'transparent' }, bad && { backgroundColor: 'transparent', borderColor: C.bad },
        off && { opacity: 0.45 }, pressed && { opacity: 0.8 }, style]}>
      {busy ? <ActivityIndicator color={fg} /> : <>
        {icon ? <Feather name={icon} size={16} color={fg} /> : null}
        <Text style={{ fontFamily: F.uiB, color: fg, fontSize: small ? 13 : 14.5 }}>{label}</Text></>}
    </Pressable>
  );
}

export const Chip = ({ label, on, onPress, icon, testID, raw }) => {
  const { t } = useLang();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} accessibilityLabel={raw ? label : t(label)} testID={testID} onPress={onPress}
      style={[s.chip, on && { backgroundColor: C.brand, borderColor: C.brand }]}>
      {icon ? <Feather name={icon} size={14} color={on ? '#fff' : C.text} /> : null}
      <Text style={{ fontFamily: F.uiSB, fontSize: 13, color: on ? '#fff' : C.text }}>{label}</Text>
    </Pressable>
  );
};
export const Chips = ({ children }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{children}</View>;

const TONE = { good: [C.goodBg, C.good], warn: [C.warnBg, C.warn], bad: [C.badBg, C.bad], info: [C.infoBg, C.info], mute: [C.bg, C.muted] };
export const Pill = ({ tone = 'info', icon, children, style }) => (
  <View style={[s.pill, { backgroundColor: TONE[tone][0] }, tone === 'mute' && { borderWidth: 1, borderColor: C.line }, style]}>
    {icon ? <Feather name={icon} size={12} color={TONE[tone][1]} /> : null}
    <Text style={{ fontFamily: F.uiB, fontSize: 12, color: TONE[tone][1] }}>{children}</Text>
  </View>
);

export const Note = ({ tone = 'info', icon = 'info', children }) => (
  <View style={[s.note, { backgroundColor: TONE[tone][0] }]}>
    <Feather name={icon} size={18} color={TONE[tone][1]} style={{ marginTop: 1 }} />
    <Text style={{ flex: 1, fontFamily: F.uiSB, fontSize: 12.5, lineHeight: 18, color: TONE[tone][1] }}>{children}</Text>
  </View>
);

export function Field({ label, error, hint, multiline, style, inputRef, testID, placeholder, ...p }) {
  const { t } = useLang();
  return (
    <View style={{ gap: 4 }}>
      {label ? <Text style={{ fontFamily: F.uiB, fontSize: 13, color: C.text }}>{label}</Text> : null}
      <TextInput ref={inputRef} testID={testID} accessibilityLabel={t(label || placeholder)} multiline={multiline} placeholder={t(placeholder)}
        placeholderTextColor="#8a9896"
        style={[s.input, multiline && { minHeight: 84, textAlignVertical: 'top' }, error && { borderColor: C.bad }, style]} {...p} />
      {error ? <Text style={{ fontFamily: F.uiB, fontSize: 12.5, color: C.bad }} accessibilityLiveRegion="polite">{error}</Text> : null}
      {hint ? <Text style={{ fontFamily: F.ui, fontSize: 12.5, color: C.muted }}>{hint}</Text> : null}
    </View>
  );
}

export const Switch = ({ on, onChange, label }) => {
  const { t } = useLang();
  return (
    // The pressable area is 44 px high (WCAG 2.5.5 target size); the visible track stays 50 x 30.
    <Pressable accessibilityRole="switch" accessibilityLabel={t(label)} accessibilityState={{ checked: !!on }} onPress={() => onChange(!on)}
      style={{ minHeight: 44, minWidth: 50, justifyContent: 'center' }}>
      <View style={[s.switch, on && { backgroundColor: C.good }]}>
        <View style={[s.knob, on && { left: 23 }]} />
      </View>
    </Pressable>
  );
};

export const Seg = ({ options, value, onChange }) => {
  const { t } = useLang();
  return (
    <View style={s.seg}>
      {options.map(([k, label]) => (
        <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: value === k }} accessibilityLabel={t(label)} onPress={() => onChange(k)}
          style={[s.segBtn, value === k && { backgroundColor: C.brand }]}>
          <Text style={{ fontFamily: F.uiB, color: value === k ? '#fff' : C.muted }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
};

export const Radio = ({ label, on, onPress, style }) => {
  const { t } = useLang();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: !!on }} accessibilityLabel={t(label)} onPress={onPress}
      style={[s.radio, on && { borderColor: C.brand, backgroundColor: C.infoBg }, style]}>
      <View style={[s.radioDot, on && { borderColor: C.brand }]}>{on ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.brand }} /> : null}</View>
      <Text style={{ fontFamily: F.uiB, fontSize: 14, color: C.text, flexShrink: 1 }}>{label}</Text>
    </Pressable>
  );
};

export const Check = ({ label, on, onPress }) => {
  const { t } = useLang();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!on }} accessibilityLabel={t(label)} onPress={onPress} style={s.chk}>
      <View style={[s.box, on && { backgroundColor: C.good, borderColor: C.good }]}>{on ? <Feather name="check" size={13} color="#fff" /> : null}</View>
      <Text style={{ fontFamily: F.uiB, fontSize: 13.5, color: C.text, flex: 1 }}>{label}</Text>
    </Pressable>
  );
};

/* ---------- language ---------- */
/** English / සිංහල / தமிழ். Each name is written in its own script so a person can find their language without reading English. */
export function LangPicker() {
  const { lang, setLang } = useLang();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {LANGS.map(([k, name]) => <Chip key={k} raw label={name} on={lang === k} onPress={() => setLang(k)} testID={'lang-' + k} />)}
    </View>
  );
}

/** Globe button for the top bar. Opens a small sheet with the three languages. */
export function LangButton({ onBrand }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <IconBtn name="globe" label="Language" onBrand={onBrand} onPress={() => setOpen(true)} testID="lang-button" />
      {open ? (
        <Sheet title="Language" onClose={() => setOpen(false)}>
          <LangPicker />
          <Btn kind="secondary" label="Done" onPress={() => setOpen(false)} testID="lang-done" />
        </Sheet>
      ) : null}
    </>
  );
}

/* ---------- display ---------- */
export const Avatar = ({ name = '', id = 0, size = 46 }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: AVATAR[Number(id) % AVATAR.length], alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color: '#fff', fontFamily: F.uiB, fontSize: size / 3 }}>{initials(name)}</Text>
  </View>
);

export const Stars = ({ value = 0 }) => {
  const { t } = useLang();
  const r = Math.round(value);
  return <Text style={{ color: C.star, letterSpacing: 1 }} accessibilityLabel={t(`${value} out of 5 stars`)}>{'★'.repeat(r) + '☆'.repeat(5 - r)}</Text>;
};

export const VerPill = ({ verified }) => verified
  ? <Pill tone="good" icon="shield">Verified</Pill>
  : <Pill tone="warn" icon="alert-triangle">Not yet verified</Pill>;

export const Photo = ({ label, tone = 1, icon = 'camera', onPress }) => (
  <Pressable disabled={!onPress} onPress={onPress} accessibilityLabel={label}
    style={{ flex: 1, minHeight: 74, borderRadius: R.s, backgroundColor: [C.ph1, C.ph2, C.ph3][(tone - 1) % 3], alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6 }}>
    <Feather name={icon} size={22} color={C.brand} />
    <Text style={{ fontFamily: F.uiSB, fontSize: 11.5, color: C.brand, textAlign: 'center' }} numberOfLines={2}>{label}</Text>
  </Pressable>
);

export const Empty = ({ title, text, action }) => (
  <View style={[s.card, { alignItems: 'center', paddingVertical: 26 }]}>
    <T b>{title}</T>
    {text ? <T small muted style={{ textAlign: 'center' }}>{text}</T> : null}
    {action}
  </View>
);

export const Loading = () => {
  const { t } = useLang();
  return <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator size="large" color={C.brand} accessibilityLabel={t('Loading')} /></View>;
};

export const ErrorBox = ({ message, onRetry }) => (
  <View style={[s.card, { borderColor: C.bad }]} accessibilityLiveRegion="polite">
    <Row style={{ alignItems: 'center' }}><Feather name="alert-triangle" size={18} color={C.bad} /><T b style={{ color: C.bad, flex: 1 }}>Something went wrong</T></Row>
    <T small>{message}</T>
    {onRetry ? <Btn kind="secondary" small label="Try again" onPress={onRetry} /> : null}
  </View>
);

/** Shows loading, error and then the content, so every screen handles all three states the same way (Nielsen 1, 9). */
export const Async = ({ state, children, onRetry }) => {
  if (state.loading && state.data === null) return <Loading />;
  if (state.error && state.data === null) return <ErrorBox message={state.error} onRetry={onRetry || state.reload} />;
  return children(state.data);
};

export function Sheet({ title, onClose, children }) {
  const { t } = useLang();
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} visible>
      <Pressable style={s.sheetbg} onPress={onClose} accessibilityLabel={t('Close')}>
        <Pressable style={s.sheet} onPress={() => {}} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={{ fontFamily: F.uiB, fontSize: 16, color: C.text }}>{title}</Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export const Toast = ({ msg }) => msg ? (
  <View style={s.toast} pointerEvents="none" accessibilityLiveRegion="polite">
    <Feather name="check" size={16} color="#fff" /><Text style={{ color: '#fff', fontFamily: F.uiB, fontSize: 13, flex: 1 }}>{msg}</Text>
  </View>
) : null;

export const Stat = ({ k, v, small }) => (
  <View style={[s.card, { flex: 1, gap: 2 }]}>
    <T small muted>{k}</T>
    <Text style={{ fontFamily: F.head, fontSize: small ? 19 : 24, color: C.text }}>{v}</Text>
  </View>
);

const s = StyleSheet.create({
  pad: { padding: 16, paddingTop: 8, gap: 14, paddingBottom: 28 },
  sticky: { backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: C.line, gap: 6 },
  hdr: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  hdrTitle: { flex: 1, fontFamily: F.head, fontSize: 17, color: C.text },
  brandbar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.brand, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
  logo: { flex: 1, fontFamily: F.head, fontSize: 22, color: '#fff', letterSpacing: -0.4 },
  iconbtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 8, right: 9, width: 9, height: 9, borderRadius: 5, backgroundColor: C.accent, borderWidth: 2, borderColor: C.brand },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: R.m, padding: 12, gap: 8, ...shadow },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, paddingHorizontal: 16, borderRadius: R.s, borderWidth: 1, borderColor: C.brand, backgroundColor: C.brand },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, alignSelf: 'flex-start' },
  note: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: R.s },
  input: { minHeight: 44, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, borderRadius: R.s, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.ui, fontSize: 14.5, color: C.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) },
  switch: { width: 50, height: 30, borderRadius: 15, backgroundColor: C.line, justifyContent: 'center' },
  knob: { position: 'absolute', top: 3, left: 3, width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  seg: { flexDirection: 'row', borderWidth: 1, borderColor: C.line, borderRadius: R.s, overflow: 'hidden', backgroundColor: C.card },
  segBtn: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', padding: 9 },
  radio: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.line, borderRadius: R.s, backgroundColor: C.card },
  radioDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  chk: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: C.line, borderRadius: R.s, backgroundColor: C.card },
  box: { width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  sheetbg: { flex: 1, backgroundColor: 'rgba(10,20,20,.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 26, gap: 10, maxHeight: '80%' },
  toast: { position: 'absolute', left: 14, right: 14, top: 54, backgroundColor: '#10201f', borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center', zIndex: 50 }
});
