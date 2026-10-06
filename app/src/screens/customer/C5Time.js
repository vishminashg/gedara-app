// C5 Pick a time and confirm (FR3, FR4, FR13, NFR5). Step 2 of 2, also used to change the time of an existing booking.
import React, { useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import { api } from '../../api';
import { useLoad, useAction } from '../../hooks';
import { Screen, Header, Chip, Chips, Btn, Row, T, Section, Card, KV, Radio, Note, Async } from '../../ui';
import { C, F, R } from '../../theme';

export default function Time({ navigation, route }) {
  const { flow, editBookingId } = route.params;
  const editing = !!editBookingId;
  const [day, setDay] = useState(null);
  const [slot, setSlot] = useState(null);
  const [pay, setPay] = useState('Cash');
  const { busy, error, setError, run } = useAction();
  const st = useLoad(() => api.get(`/providers/${flow.providerId}/slots`), [flow.providerId]);

  const chosen = st.data && day !== null ? st.data[day] : null;
  const label = chosen && slot !== null ? `${chosen.label} ${chosen.slots[slot].label}` : 'Not chosen';

  const send = () => run(async () => {
    const date = chosen.date;
    if (editing) {
      await api.patch('/bookings/' + editBookingId, { date, slot });
      navigation.navigate('Booking', { id: editBookingId, toast: 'New time saved. The provider will confirm it again.' });
      return;
    }
    const id = flow.draftId;
    await api.patch('/bookings/' + id, { pay, date, slot });
    try { await api.post(`/bookings/${id}/submit`); }
    catch (e) { st.reload(); setSlot(null); throw e; }
    navigation.reset({ index: 1, routes: [{ name: 'Tabs' }, { name: 'Booking', params: { id, toast: 'Request sent. You will be told when it is accepted.' } }] });
  });

  return (
    <Screen footer={<>
      <Btn label={editing ? 'Save new time' : 'Send request'} onPress={send} busy={busy} disabled={slot === null || day === null} testID="send-request" />
      {slot === null || day === null ? <T small muted style={{ textAlign: 'center' }}>Pick a time to send your request</T> : null}
    </>}>
      <Header title={editing ? 'Change time' : 'Pick a time'} />
      {!editing ? <T small b muted>Step 2 of 2</T> : null}
      <Async state={st}>{(grid) => (
        <>
          <Chips>{grid.map((d, i) => <Chip key={d.date} label={d.label} on={day === i} onPress={() => { setDay(i); setSlot(null); setError(''); }} testID={'day-' + i} />)}</Chips>
          {day === null ? <T small muted>Choose a day to see free times.</T> : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {grid[day].slots.map((s) => (
                <SlotBtn key={s.slot} s={s} on={slot === s.slot && s.free} onPress={() => { setSlot(s.slot); setError(''); }} />
              ))}
            </View>
          )}
        </>
      )}</Async>
      {!editing ? (
        <>
          <Section title="Pay after the job">
            <Row>{['Cash', 'Card'].map((m) => <Radio key={m} label={m} on={pay === m} onPress={() => setPay(m)} style={{ flex: 1 }} />)}</Row>
            <T small muted>Card payments are processed securely. Nothing is charged now.</T>
          </Section>
          <Card>
            <T small muted>{flow.providerName.split(' ')[0]} confirms the final price before any work starts. If an inspection is needed, you will be told first.</T>
            <KV k="Job" v={flow.job || '-'} /><KV k="Photos" v={String(flow.photos || 0)} /><KV k="When" v={label} last />
          </Card>
        </>
      ) : <Note icon="info">Changing the time sends the request back to the provider to confirm.</Note>}
      {error ? <Note tone="bad" icon="alert-triangle">{error}</Note> : null}
    </Screen>
  );
}

function SlotBtn({ s, on, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={s.label + (s.free ? '' : ', booked')} accessibilityState={{ disabled: !s.free, selected: !!on }}
      disabled={!s.free} onPress={onPress} testID={'slot-' + s.slot}
      style={{ width: '48%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, minHeight: 48, borderRadius: R.s, borderWidth: on ? 2 : 1, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.infoBg : s.free ? C.card : C.bg }}>
      <Text style={{ fontFamily: s.free ? F.uiB : F.ui, color: s.free ? C.text : C.muted, textDecorationLine: s.free ? 'none' : 'line-through' }}>{s.label}</Text>
      {!s.free ? <Text style={{ fontFamily: F.uiSB, fontSize: 11.5, color: C.muted }}>Booked</Text> : null}
    </Pressable>
  );
}
