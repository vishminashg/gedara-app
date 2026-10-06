// P3 Availability calendar (FR4, FR6, NFR5). Shows the next 7 days; blocking a slot repeats weekly.
import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { api } from '../../api';
import { useLoad, useAction, useToast } from '../../hooks';
import { Screen, Header, T, Note, Async, Toast, Row } from '../../ui';
import { C, F } from '../../theme';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dowOf = (d) => (d.getDay() === 0 ? 7 : d.getDay());
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar() {
  const st = useLoad(() => api.get('/provider/blocks'));
  const { error, run } = useAction();
  const toast = useToast();
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return { date: iso(d), dow: dowOf(d), short: SHORT[d.getDay()], num: d.getDate() }; });

  const tap = (cell, d, slot) => {
    if (cell.kind === 'booked' || cell.kind === 'request') { toast.show('This slot has a booking. Open Requests to change it.'); return; }
    run(async () => {
      if (cell.kind === 'blocked') { await api.del('/provider/blocks/' + cell.id); toast.show('Slot is free again every ' + d.short + '.'); }
      else { await api.post('/provider/blocks', { dow: d.dow, slot }); toast.show('Blocked every ' + d.short + '. Customers cannot book it.'); }
      st.reload();
    });
  };

  return (
    <>
      <Screen onRefresh={st.reload} refreshing={st.loading && st.data !== null}>
        <Header title="Availability" back={false} />
        <T small muted>Tap a free slot to block it. Customers only see the free slots.</T>
        <Async state={st}>{({ blocks, booked, slotLabels }) => {
          const cellFor = (d, slot) => {
            const bk = booked.find((x) => x.date === d.date && x.slot === slot);
            if (bk) return { kind: bk.status === 'accepted' ? 'booked' : 'request', label: bk.status === 'accepted' ? 'Booked' : 'Request' };
            const bl = blocks.find((x) => x.dow === d.dow && x.slot === slot);
            if (bl) return { kind: 'blocked', label: 'Blocked', id: bl.id };
            return { kind: 'free', label: 'Free' };
          };
          const STYLE = {
            free: { bg: C.goodBg, fg: C.good, bd: 'transparent' }, blocked: { bg: C.bg, fg: C.muted, bd: C.line },
            booked: { bg: C.brand, fg: '#fff', bd: C.brand }, request: { bg: C.warnBg, fg: C.warn, bd: C.warn }
          };
          return (
            <>
              <View style={{ gap: 4 }}>
                <Row gap={2}><View style={{ width: 30 }} />{days.map((d) => <View key={d.date} style={{ flex: 1, alignItems: 'center' }}><T small b muted style={{ fontSize: 11 }}>{d.short}</T><T small muted style={{ fontSize: 11 }}>{d.num}</T></View>)}</Row>
                {slotLabels.map((label, slot) => (
                  <Row key={slot} gap={2} style={{ alignItems: 'center' }}>
                    <View style={{ width: 30 }}><T small b muted style={{ fontSize: 11 }}>{label.replace(':00', '').replace(' ', '')}</T></View>
                    {days.map((d) => {
                      const c = cellFor(d, slot); const k = STYLE[c.kind];
                      return (
                        <Pressable key={d.date} accessibilityRole="button" accessibilityLabel={`${d.short} ${d.num} ${label} ${c.label}`} testID={`cell-${d.date}-${slot}`}
                          onPress={() => tap(c, d, slot)}
                          style={{ flex: 1, minHeight: 50, borderRadius: 6, borderWidth: 1, borderColor: k.bd, backgroundColor: k.bg, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontFamily: F.uiB, fontSize: 9.5, color: k.fg }} numberOfLines={1}>{c.label}</Text>
                        </Pressable>
                      );
                    })}
                  </Row>
                ))}
              </View>
              <Row style={{ flexWrap: 'wrap', gap: 12 }}>
                {[['Free', C.goodBg], ['Blocked', C.bg], ['Request', C.warnBg], ['Booked', C.brand]].map(([l, c]) => (
                  <Row key={l} gap={4} style={{ alignItems: 'center' }}><View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c, borderWidth: 1, borderColor: C.line }} /><T small muted>{l}</T></Row>
                ))}
              </Row>
              <Note icon="check">A slot that is booked or blocked cannot be booked by another customer. Blocks repeat every week.</Note>
            </>
          );
        }}</Async>
        {error ? <Note tone="bad" icon="alert-triangle">{error}</Note> : null}
      </Screen>
      <Toast msg={toast.msg} />
    </>
  );
}
