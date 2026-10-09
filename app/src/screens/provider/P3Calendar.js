// P3 Availability calendar (FR4, FR6, NFR5). Shows four weeks, one week at a time. A slot can be blocked for one date only or every week.
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { api } from '../../api';
import { useLoad, useAction, useToast } from '../../hooks';
import { Screen, Header, T, Note, Async, Toast, Row, Chip, Text } from '../../ui';
import { C, F } from '../../theme';
import { useLang } from '../../i18n';

// The calendar cells are narrow, so Sinhala and Tamil use one short word instead of the full label.
const SHORT_LABEL = {
  si: { Free: 'නිදහස්', Blocked: 'අවහිර', Request: 'ඉල්ලීම', Booked: 'වෙන්', 'Every wk': 'සති' },
  ta: { Free: 'காலி', Blocked: 'தடை', Request: 'கோரல்', Booked: 'பதிவு', 'Every wk': 'வாரம்' }
};

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dowOf = (d) => (d.getDay() === 0 ? 7 : d.getDay());
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar() {
  const st = useLoad(() => api.get('/provider/blocks'));
  const { error, run } = useAction();
  const toast = useToast();
  const { lang } = useLang();
  const [week, setWeek] = useState(0);        // 0 to 3: which 7 days are shown
  const [mode, setMode] = useState('date');   // 'date' = this date only, 'week' = every week
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + week * 7 + i); return { date: iso(d), dow: dowOf(d), short: SHORT[d.getDay()], num: d.getDate(), month: d.toLocaleDateString('en-GB', { month: 'short' }) }; });

  const tap = (cell, d, slot) => {
    if (cell.kind === 'booked' || cell.kind === 'request') { toast.show('This slot has a booking. Open Requests to change it.'); return; }
    run(async () => {
      if (cell.kind === 'blocked' && cell.type === 'date') { await api.del('/provider/date-blocks/' + cell.id); toast.show('Slot is free again on ' + d.short + ' ' + d.num + ' ' + d.month + '.'); }
      else if (cell.kind === 'blocked') { await api.del('/provider/blocks/' + cell.id); toast.show('Slot is free again every ' + d.short + '.'); }
      else if (mode === 'date') { await api.post('/provider/date-blocks', { date: d.date, slot }); toast.show('Blocked on ' + d.short + ' ' + d.num + ' ' + d.month + ' only. Customers cannot book it.'); }
      else { await api.post('/provider/blocks', { dow: d.dow, slot }); toast.show('Blocked every ' + d.short + '. Customers cannot book it.'); }
      st.reload();
    });
  };

  return (
    <>
      <Screen onRefresh={st.reload} refreshing={st.loading && st.data !== null}>
        <Header title="Availability" back={false} />
        <T small muted>Tap a free slot to block it. Customers only see the free slots.</T>
        <Row gap={8}>
          <Chip label="This date only" on={mode === 'date'} onPress={() => setMode('date')} testID="block-date" />
          <Chip label="Every week" on={mode === 'week'} onPress={() => setMode('week')} testID="block-week" />
        </Row>
        <Async state={st}>{({ blocks, dateBlocks, booked, slotLabels }) => {
          const cellFor = (d, slot) => {
            const bk = booked.find((x) => x.date === d.date && x.slot === slot);
            if (bk) return { kind: bk.status === 'accepted' ? 'booked' : 'request', label: bk.status === 'accepted' ? 'Booked' : 'Request' };
            const one = dateBlocks.find((x) => x.date === d.date && x.slot === slot);
            if (one) return { kind: 'blocked', type: 'date', label: 'Blocked', id: one.id };
            const bl = blocks.find((x) => x.dow === d.dow && x.slot === slot);
            if (bl) return { kind: 'blocked', type: 'week', label: 'Every wk', id: bl.id };
            return { kind: 'free', label: 'Free' };
          };
          const STYLE = {
            free: { bg: C.goodBg, fg: C.good, bd: 'transparent' }, blocked: { bg: C.bg, fg: C.muted, bd: C.line },
            booked: { bg: C.brand, fg: '#fff', bd: C.brand }, request: { bg: C.warnBg, fg: C.warn, bd: C.warn }
          };
          return (
            <>
              <Row gap={8} style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Chip label="Earlier week" icon="chevron-left" on={false} onPress={() => setWeek(Math.max(0, week - 1))} testID="week-earlier" />
                <T small b muted>{days[0].num} {days[0].month} to {days[6].num} {days[6].month}</T>
                <Chip label="Later week" icon="chevron-right" on={false} onPress={() => setWeek(Math.min(3, week + 1))} testID="week-later" />
              </Row>
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
                          <Text plain style={{ fontFamily: F.uiB, fontSize: 9.5, color: k.fg, ...(lang === 'en' ? {} : { fontFamily: undefined, fontWeight: '700' }) }} numberOfLines={1}>{(SHORT_LABEL[lang] || {})[c.label] || c.label}</Text>
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
              <Note icon="check">A slot that is booked or blocked cannot be booked by another customer. Use "This date only" for a one-off absence and "Every week" for a regular day off.</Note>
            </>
          );
        }}</Async>
        {error ? <Note tone="bad" icon="alert-triangle">{error}</Note> : null}
      </Screen>
      <Toast msg={toast.msg} />
    </>
  );
}
