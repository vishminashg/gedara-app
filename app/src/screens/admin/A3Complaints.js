// A3 Complaints (FR3, FR10, NFR3, NFR6). Phone: cards that expand. Wide window: case queue left, case panel right.
import React, { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api';
import { useLoad, useAction, useToast, useWide } from '../../hooks';
import { Screen, Header, Card, Row, T, Btn, Pill, Note, Field, Async, Empty, Chip, Chips, Radio, IconBtn, Toast } from '../../ui';
import { C } from '../../theme';

const SEV = { High: 'bad', Medium: 'warn', Low: 'mute' };
const STAT = { New: 'warn', 'In review': 'info', Resolved: 'good', Dismissed: 'mute' };

export default function Complaints() {
  const wide = useWide();
  const [filter, setFilter] = useState('All');
  const [sel, setSel] = useState(null);
  const [pick, setPick] = useState({});
  const [note, setNote] = useState('');
  const st = useLoad(() => api.get('/admin/complaints?status=' + encodeURIComponent(filter)), [filter]);
  const { busy, error, setError, run } = useAction();
  const toast = useToast();

  const replace = (c) => st.setData({ ...st.data, items: st.data.items.map((x) => (x.id === c.id ? c : x)) });
  const patch = (c, body, msg) => run(async () => { replace(await api.patch('/admin/complaints/' + c.id, body)); toast.show(msg); });
  const addNote = (c) => run(async () => { replace(await api.post(`/admin/complaints/${c.id}/notes`, { body: note })); setNote(''); });
  const delNote = (c, n) => run(async () => replace(await api.del(`/admin/complaints/${c.id}/notes/${n.id}`)));

  const Summary = ({ c }) => (
    <Row style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1 }}><T b style={{ fontSize: 15 }}>{c.ref}: {c.type}</T><T small muted>{c.customer} reported {c.provider}</T></View>
      <View style={{ gap: 4, alignItems: 'flex-end' }}><Pill tone={SEV[c.severity]}>{c.severity}</Pill><Pill tone={STAT[c.status]}>{c.status}</Pill></View>
    </Row>
  );

  const Detail = ({ c, outcomes }) => {
    const closed = ['Resolved', 'Dismissed'].includes(c.status);
    return (
      <>
        <Card style={{ shadowOpacity: 0 }}><T small>{c.detail}</T></Card>
        <View style={{ gap: 6 }}><T b style={{ fontSize: 13 }}>Evidence</T>
          <Chips>{c.evidence.map((e) => <Pill key={e} icon="file-text">{e}</Pill>)}</Chips></View>
        <View style={{ gap: 6 }}>
          <T b style={{ fontSize: 13 }}>Case notes</T>
          {c.notes.length ? c.notes.map((n) => (
            <Row key={n.id} style={{ alignItems: 'center', gap: 8, paddingVertical: 2 }}>
              <View style={{ flex: 1 }}><T small>{n.body}</T><T small muted style={{ fontSize: 11 }}>{n.admin} · {n.createdAt}</T></View>
              {!closed ? <IconBtn name="trash-2" label="Delete note" onPress={() => delNote(c, n)} /> : null}
            </Row>
          )) : <T small muted>No notes yet.</T>}
          {!closed ? (
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}><Field value={note} onChangeText={setNote} placeholder="Add a case note" testID="case-note" /></View>
              <Btn small label="Add" onPress={() => addNote(c)} disabled={note.trim().length < 2} busy={busy} style={{ flex: 0, minWidth: 92 }} testID="case-note-add" />
            </Row>
          ) : null}
        </View>
        {!closed ? (
          <>
            <View style={{ gap: 6 }}>
              <T b style={{ fontSize: 13 }}>Outcome</T>
              {outcomes.map((o) => <Radio key={o} label={o} on={pick[c.id] === o} onPress={() => setPick({ ...pick, [c.id]: o })} />)}
            </View>
            {error ? <Note tone="bad" icon="alert-triangle">{error}</Note> : null}
            <Row>
              <Btn small label="Mark resolved" onPress={() => patch(c, { status: 'Resolved', outcome: pick[c.id] }, 'Resolved. Both sides were notified.')} disabled={!pick[c.id]} busy={busy} testID={'resolve-' + c.ref} />
              <Btn small kind="secondary" label="Message both sides" onPress={() => patch(c, { status: 'In review' }, 'Both sides messaged. Case is in review.')} disabled={c.status === 'In review'} testID={'review-' + c.ref} />
            </Row>
            <Btn small kind="danger" label="Dismiss claim" onPress={() => patch(c, { status: 'Dismissed' }, 'Claim dismissed.')} />
          </>
        ) : <Note icon="check">{c.status}: {c.outcome || 'No action'}. Both sides were notified.</Note>}
      </>
    );
  };

  return (
    <>
      <Screen onRefresh={st.reload} refreshing={st.loading && st.data !== null}>
        <Header title="Complaints" back={false} />
        <Chips>{['All', 'New', 'In review', 'Resolved'].map((k) => <Chip key={k} label={k} on={filter === k} onPress={() => { setFilter(k); setSel(null); setError(''); }} testID={'cf-' + k} />)}</Chips>
        <Async state={st}>{({ items, outcomes }) => {
          if (!items.length) return <Empty title="No complaints here" text="Nothing matches this filter." />;
          const cur = items.find((c) => c.id === sel) || items[0];
          if (wide) return (
            <Row style={{ alignItems: 'flex-start', gap: 16 }}>
              <View style={{ flex: 1, gap: 8 }}>
                {items.map((c) => (
                  <Card key={c.id} onPress={() => { setSel(c.id); setError(''); }} label={`Case ${c.ref}`} style={c.id === cur.id ? { borderColor: C.brand, backgroundColor: C.infoBg } : undefined} testID={'case-' + c.ref}><Summary c={c} /></Card>
                ))}
              </View>
              <Card style={{ flex: 1.2 }}><Summary c={cur} /><Detail c={cur} outcomes={outcomes} /></Card>
            </Row>
          );
          return items.map((c) => {
            const open = c.id === cur.id;
            return (
              <Card key={c.id} onPress={!open ? () => { setSel(c.id); setError(''); } : undefined} label={`Case ${c.ref}`} testID={'case-' + c.ref}>
                <Summary c={c} />
                {open ? <Detail c={c} outcomes={outcomes} /> : null}
              </Card>
            );
          });
        }}</Async>
      </Screen>
      <Toast msg={toast.msg} />
    </>
  );
}
