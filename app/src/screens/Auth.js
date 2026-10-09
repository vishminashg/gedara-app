import React, { useState } from 'react';
import { View, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { api, setBase, getBase } from '../api';
import { defaultBase, loadBase, saveBase } from '../config';
import { useSession } from '../session';
import { useAction } from '../hooks';
import { Btn, Field, H1, T, Note, Chip, Chips, Seg, Card, Row, Icon, Text, LangPicker } from '../ui';
import { C, F, TRADES } from '../theme';

const DEMO = [['Customer', 'dilani@gedara.lk'], ['Provider', 'nimal@gedara.lk'], ['Admin', 'ruwan@gedara.lk']];

function Shell({ children }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
          <LangPicker />
          <View style={{ gap: 2, paddingTop: 8 }}>
            <Text plain style={{ fontFamily: F.head, fontSize: 34, color: C.brand, letterSpacing: -0.6 }}>Gedara</Text>
            <T muted>Home services in Dehiwala and Mount Lavinia: plumbing, electrical and cleaning.</T>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ServerSettings() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(getBase() || defaultBase());
  const [msg, setMsg] = useState('');
  React.useEffect(() => { loadBase().then(setUrl); }, []);
  const save = async () => {
    const b = await saveBase(url); setBase(b); setUrl(b); setMsg('Saved. Using ' + b);
  };
  return (
    <View style={{ gap: 8 }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityLabel="Server settings" style={{ minHeight: 44, justifyContent: 'center' }}>
        <T small b style={{ color: C.brand }}>{open ? 'Hide server settings' : 'Server settings'}</T>
      </Pressable>
      {open ? (
        <Card>
          <Field label="Server address" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false}
            hint="Example: http://192.168.1.20:4000. Use the address of the computer running the Gedara server." testID="server-url" />
          <Btn small kind="secondary" label="Save address" onPress={save} />
          {msg ? <T small muted>{msg}</T> : null}
        </Card>
      ) : null}
    </View>
  );
}

export function LoginScreen({ navigation }) {
  const { signIn, notice } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errs, setErrs] = useState({});
  const { busy, error, run } = useAction();

  const submit = async () => {
    const e = {};
    if (!email.trim()) e.email = 'Enter your email address.';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'That email address does not look right.';
    if (!password) e.password = 'Enter your password.';
    setErrs(e);
    if (Object.keys(e).length) return;
    const out = await run(() => api.post('/auth/login', { email: email.trim(), password }));
    if (out) await signIn(out);
  };

  return (
    <Shell>
      <H1>Sign in</H1>
      {notice ? <Note tone="warn" icon="info">{notice}</Note> : null}
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={errs.email} testID="login-email" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" error={errs.password} testID="login-password" onSubmitEditing={submit} />
      {error ? <Note tone="bad" icon="alert-triangle">{error}</Note> : null}
      <Btn label="Sign in" onPress={submit} busy={busy} testID="login-submit" />
      <Btn kind="secondary" label="Create an account" onPress={() => navigation.navigate('Register')} testID="go-register" />
      <Card>
        <T b>Demo accounts</T>
        <T small muted>For testing. Tap one to fill the form, then press Sign in. Password: gedara123</T>
        <Chips>{DEMO.map(([l, em]) => <Chip key={l} label={l} onPress={() => { setEmail(em); setPassword('gedara123'); setErrs({}); }} testID={'demo-' + l.toLowerCase()} />)}</Chips>
      </Card>
      <ServerSettings />
    </Shell>
  );
}

export function RegisterScreen({ navigation }) {
  const { signIn } = useSession();
  const [f, setF] = useState({ role: 'customer', name: '', email: '', phone: '', password: '', trade: 'plumbing', area: '' });
  const [errs, setErrs] = useState({});
  const { busy, error, run } = useAction();
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));

  const submit = async () => {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email address.';
    if (f.password.length < 6) e.password = 'Use at least 6 characters.';
    if (f.role === 'provider' && !f.area.trim()) e.area = 'Tell customers which area you cover.';
    setErrs(e);
    if (Object.keys(e).length) return;
    const body = { role: f.role, name: f.name.trim(), email: f.email.trim(), password: f.password, phone: f.phone.trim() || undefined };
    if (f.role === 'provider') { body.trade = f.trade; body.area = f.area.trim(); }
    const out = await run(() => api.post('/auth/register', body));
    if (out) await signIn(out);
  };

  return (
    <Shell>
      <H1>Create your account</H1>
      <Seg options={[['customer', 'I need a service'], ['provider', 'I offer a service']]} value={f.role} onChange={set('role')} />
      <Field label="Full name" value={f.name} onChangeText={set('name')} error={errs.name} testID="reg-name" />
      <Field label="Email" value={f.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" error={errs.email} testID="reg-email" />
      <Field label="Phone (optional)" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" hint="Kept private until a provider accepts your booking." />
      <Field label="Password" value={f.password} onChangeText={set('password')} secureTextEntry autoCapitalize="none" error={errs.password} hint="At least 6 characters." testID="reg-password" />
      {f.role === 'provider' ? (
        <>
          <View style={{ gap: 6 }}>
            <T b>Your trade</T>
            <Chips>{Object.entries(TRADES).map(([k, v]) => <Chip key={k} label={v.n} icon={v.i} on={f.trade === k} onPress={() => set('trade')(k)} />)}</Chips>
          </View>
          <Field label="Area you cover" value={f.area} onChangeText={set('area')} error={errs.area} placeholder="e.g. Dehiwala" />
          <Note tone="warn" icon="shield">You will not appear to customers until an administrator checks your documents.</Note>
        </>
      ) : null}
      {error ? <Note tone="bad" icon="alert-triangle">{error}</Note> : null}
      <Btn label="Create account" onPress={submit} busy={busy} testID="reg-submit" />
      <Btn kind="secondary" label="I already have an account" onPress={() => navigation.goBack()} />
    </Shell>
  );
}
