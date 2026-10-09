// A1 Dashboard (FR11)
import React, { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api';
import { useSession } from '../../session';
import { useLoad, useAction, useWide } from '../../hooks';
import { Screen, Header, Card, Row, T, Btn, Pill, Note, Field, Section, Stat, Async, Chip, Chips, IconBtn, LangButton } from '../../ui';
import { C, F, lkr } from '../../theme';

export default function Dashboard({ navigation }) {
  const { signOut } = useSession();
  const wide = useWide();
  const [days, setDays] = useState(7);
  const st = useLoad(async () => {
    const [stats, notes] = await Promise.all([api.get('/admin/stats?days=' + days), api.get('/admin/notes')]);
    return { stats, notes };
  }, [days]);
  const [note, setNote] = useState('');
  const { busy, error, run } = useAction();
  const addNote = () => run(async () => { await api.post('/admin/notes', { body: note }); setNote(''); st.reload(); });
  const delNote = (id) => run(async () => { await api.del('/admin/notes/' + id); st.reload(); });

  return (
    <Screen onRefresh={st.reload} refreshing={st.loading && st.data !== null}>
      <Header title="Dashboard" back={false} right={<Row><LangButton /><IconBtn name="log-out" label="Sign out" onPress={() => signOut()} testID="signout" /></Row>} />
      <Chips>{[7, 30].map((d) => <Chip key={d} label={`${d} days`} on={days === d} onPress={() => setDays(d)} testID={'range-' + d} />)}</Chips>
      <Async state={st}>{({ stats: s, notes }) => {
        const mx = Math.max(1, ...s.series.map((x) => x.bookings));
        return (
          <>
            {wide ? (
              <Row><Stat k="Bookings" v={s.bookings} /><Stat k="Cancellations" v={s.cancellations} /><Stat k="Open complaints" v={s.openComplaints} /><Stat k="Active providers" v={s.activeProviders} /><Stat k="Payments (LKR)" v={Number(s.payments).toLocaleString('en-US')} small /></Row>
            ) : (
              <>
                <Row><Stat k="Bookings" v={s.bookings} /><Stat k="Cancellations" v={s.cancellations} /></Row>
                <Row><Stat k="Open complaints" v={s.openComplaints} /><Stat k="Active providers" v={s.activeProviders} /></Row>
                <Stat k="Payments completed" v={lkr(s.payments)} small />
              </>
            )}
            <Section title="Bookings per day" hint={`last ${s.days} days`}>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: s.days > 7 ? 1 : 6, height: 120, paddingTop: 16 }}>
                  {s.series.map((x) => (
                    <View key={x.date} style={{ flex: 1, height: `${Math.max(4, (x.bookings / mx) * 100)}%`, backgroundColor: C.brand, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} accessibilityLabel={`${x.date}: ${x.bookings} bookings`} />
                  ))}
                </View>
                <Row style={{ justifyContent: 'space-between' }}><T small muted>{s.series[0].date.slice(5)}</T><T small muted>{s.series[s.series.length - 1].date.slice(5)}</T></Row>
              </Card>
            </Section>
            <Section title="Needs attention">
              <Card onPress={() => navigation.navigate('Verification')} label="Providers waiting for verification">
                <Row style={{ alignItems: 'center', gap: 8 }}><Pill tone="warn">{s.pendingApplications}</Pill><T b style={{ flex: 1 }}>provider{s.pendingApplications === 1 ? '' : 's'} waiting for verification</T></Row>
              </Card>
              <Card onPress={() => navigation.navigate('Complaints')} label="Open complaints">
                <Row style={{ alignItems: 'center', gap: 8 }}><Pill tone="bad">{s.openComplaints}</Pill><T b style={{ flex: 1 }}>open complaint{s.openComplaints === 1 ? '' : 's'}</T></Row>
              </Card>
            </Section>
            <Section title="Provider ratings watchlist">
              <Card>
                {s.watchlist.map((w, i) => (
                  <View key={w.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: i === s.watchlist.length - 1 ? 0 : 1, borderBottomColor: C.line, gap: 8 }}>
                    <View style={{ flex: 1 }}><T b>{w.name}</T><T small muted>{w.trade} · {w.cancelled} of {w.total} cancelled</T></View>
                    <T b>{w.rating}</T>
                    <Pill tone={w.flag === 'Review' ? 'warn' : 'good'}>{w.flag}</Pill>
                  </View>
                ))}
              </Card>
            </Section>
            <Section title="Admin notes">
              <Row style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}><Field value={note} onChangeText={setNote} placeholder="Add a note for the team" testID="note-input" /></View>
                <Btn label="Add" onPress={addNote} busy={busy} disabled={note.trim().length < 2} style={{ minWidth: 92 }} testID="note-add" />
              </Row>
              {error ? <Note tone="bad" icon="alert-triangle">{error}</Note> : null}
              {notes.map((n) => (
                <Card key={n.id}><Row style={{ alignItems: 'center', gap: 8 }}><View style={{ flex: 1 }}><T>{n.body}</T><T small muted>{n.createdAt}</T></View><IconBtn name="trash-2" label="Delete note" onPress={() => delNote(n.id)} /></Row></Card>
              ))}
            </Section>
          </>
        );
      }}</Async>
    </Screen>
  );
}
