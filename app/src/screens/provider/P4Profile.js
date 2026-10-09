// P4 Profile and documents (FR9)
import React, { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api';
import { pickPhoto } from '../../photos';
import { useSession } from '../../session';
import { useLoad, useAction, useToast } from '../../hooks';
import { Screen, Header, Card, Row, T, Btn, Pill, Note, Field, KV, Section, Avatar, VerPill, Async, Sheet, Chip, Chips, Toast, LangPicker } from '../../ui';
import { C, TRADES } from '../../theme';

const DOC_TYPES = ['National ID', 'Trade certificate', 'Police report', 'Other'];
const TONE = { uploaded: ['warn', 'Under review'], accepted: ['good', 'Approved'], rejected: ['bad', 'Rejected'] };

export default function Profile() {
  const { signOut } = useSession();
  const st = useLoad(() => api.get('/provider/profile'));
  const [sheet, setSheet] = useState(null);
  const [type, setType] = useState('National ID');
  const [form, setForm] = useState(null);
  const [errs, setErrs] = useState({});
  const { busy, error, setError, run } = useAction();
  const toast = useToast();

  const upload = () => run(async () => {
    const f = await pickPhoto();
    if (!f) return;
    await api.post('/provider/documents', { type, filename: f.name.length < 3 ? 'document.jpg' : f.name.slice(0, 80) });
    setSheet(null); toast.show('Uploaded. An administrator will review it.'); st.reload();
  });
  const remove = (id) => run(async () => { await api.del('/provider/documents/' + id); st.reload(); });
  const openEdit = (p) => { setForm({ name: p.name, phone: p.phone || '', area: p.area, years: String(p.years), priceFrom: String(p.priceFrom), bio: p.bio || '' }); setErrs({}); setError(''); setSheet('edit'); };
  const save = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Enter your name.';
    if (form.area.trim().length < 2) e.area = 'Enter the area you cover.';
    if (!/^\d{1,2}$/.test(form.years)) e.years = 'Use a whole number of years.';
    if (!/^\d+$/.test(form.priceFrom)) e.priceFrom = 'Use whole rupees, e.g. 2500.';
    setErrs(e);
    if (Object.keys(e).length) return;
    return run(async () => {
      await api.patch('/provider/profile', { name: form.name.trim(), phone: form.phone.trim(), area: form.area.trim(), years: Number(form.years), priceFrom: Number(form.priceFrom), bio: form.bio.trim() });
      setSheet(null); toast.show('Profile saved.'); st.reload();
    });
  };
  const f = (k) => (v) => setForm((o) => ({ ...o, [k]: v }));

  return (
    <>
      <Screen onRefresh={st.reload} refreshing={st.loading && st.data !== null}>
        <Header title="Profile and documents" back={false} />
        <Async state={st}>{(p) => (
          <>
            <Row style={{ alignItems: 'center', gap: 12 }}>
              <Avatar name={p.name} id={1} size={60} />
              <View style={{ flex: 1, gap: 3 }}><T b style={{ fontSize: 18 }}>{p.name}</T><VerPill verified={p.verified} /><T small muted>{TRADES[p.trade].n} · {p.area}</T></View>
            </Row>
            <Card>
              <KV k="Years of experience" v={String(p.years)} /><KV k="Prices start from" v={'LKR ' + Number(p.priceFrom).toLocaleString('en-US')} />
              <KV k="Phone" v={p.phone || 'Not added'} last />
              {p.bio ? <T small muted>{p.bio}</T> : null}
              <Btn small kind="secondary" icon="edit-2" label="Edit profile" onPress={() => openEdit(p)} testID="edit-profile" />
            </Card>
            <Section title="Documents">
              <Card>
                {p.documents.length ? p.documents.map((d, i) => {
                  const [tone, label] = TONE[d.status];
                  return (
                    <View key={d.id} style={{ gap: 6, paddingVertical: 4 }}>
                      <Row style={{ justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <View style={{ flex: 1 }}><T b>{d.type}</T><T small muted numberOfLines={1}>{d.filename}</T></View>
                        <Pill tone={tone} icon={tone === 'good' ? 'check' : undefined}>{label}</Pill>
                      </Row>
                      {d.status === 'uploaded' ? <Btn small kind="secondary" label="Remove" onPress={() => remove(d.id)} style={{ flex: 0, alignSelf: 'flex-start' }} /> : null}
                    </View>
                  );
                }) : <T small muted>No documents yet. Upload your ID and trade certificate to get verified.</T>}
                <Btn small kind="secondary" icon="file-text" label="Upload a document" onPress={() => { setError(''); setSheet('upload'); }} testID="upload-doc" />
              </Card>
            </Section>
            {p.status === 'rejected' ? <Note tone="bad" icon="alert-triangle">Your application was not approved. Check your notifications for the reason, then upload new documents.</Note>
              : !p.verified ? <Note icon="shield">Your profile stays hidden from customers until an administrator approves your documents.</Note> : <Note icon="check">You are verified and visible to customers.</Note>}
            <Section title="Language"><LangPicker /></Section>
            <Btn kind="secondary" label="Sign out" onPress={() => signOut()} testID="signout" />
          </>
        )}</Async>
      </Screen>
      {sheet === 'upload' ? (
        <Sheet title="Upload a document" onClose={() => setSheet(null)}>
          <T small muted>Choose the document type, then pick a clear photo of it.</T>
          <Chips>{DOC_TYPES.map((t) => <Chip key={t} label={t} on={type === t} onPress={() => setType(t)} />)}</Chips>
          {error ? <Note tone="bad" icon="alert-triangle">{error}</Note> : null}
          <Btn icon="image" label="Choose photo" onPress={upload} busy={busy} testID="choose-doc" />
          <Btn kind="secondary" label="Cancel" onPress={() => setSheet(null)} />
        </Sheet>
      ) : null}
      {sheet === 'edit' && form ? (
        <Sheet title="Edit profile" onClose={() => setSheet(null)}>
          <Field label="Name" value={form.name} onChangeText={f('name')} error={errs.name} />
          <Field label="Phone" value={form.phone} onChangeText={f('phone')} keyboardType="phone-pad" />
          <Field label="Area you cover" value={form.area} onChangeText={f('area')} error={errs.area} />
          <Row><View style={{ flex: 1 }}><Field label="Years" value={form.years} onChangeText={f('years')} keyboardType="number-pad" error={errs.years} /></View>
            <View style={{ flex: 1 }}><Field label="Prices from (LKR)" value={form.priceFrom} onChangeText={f('priceFrom')} keyboardType="number-pad" error={errs.priceFrom} /></View></Row>
          <Field label="About you" value={form.bio} onChangeText={f('bio')} multiline />
          {error ? <Note tone="bad" icon="alert-triangle">{error}</Note> : null}
          <Btn label="Save profile" onPress={save} busy={busy} testID="save-profile" />
          <Btn kind="secondary" label="Cancel" onPress={() => setSheet(null)} />
        </Sheet>
      ) : null}
      <Toast msg={toast.msg} />
    </>
  );
}
