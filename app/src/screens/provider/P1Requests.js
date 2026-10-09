// P1 Requests (FR6, FR8)
import React from 'react';
import { View } from 'react-native';
import { api } from '../../api';
import { useLoad, useAction } from '../../hooks';
import { useSession } from '../../session';
import { BrandBar, IconBtn, LangButton, Screen, Card, Row, T, Stat, Switch, Section, Pill, Async, Empty, Icon, Note, Btn } from '../../ui';
import { C } from '../../theme';

const TONE = { pending: ['warn', 'New'], accepted: ['good', 'Accepted'], completed: ['mute', 'Done'], declined: ['mute', 'Declined'], cancelled: ['mute', 'Cancelled'] };

export default function Requests({ navigation }) {
  const { user } = useSession();
  const st = useLoad(async () => {
    const [r, n] = await Promise.all([api.get('/provider/requests'), api.get('/notifications')]);
    return { ...r, unread: n.unread };
  });
  const { error, run } = useAction();
  const toggle = (v) => run(async () => {
    await api.patch('/provider/me/accepting', { accepting: v });
    st.setData({ ...st.data, accepting: v });
  });

  return (
    <>
      <BrandBar title={`Hi, ${user.name.split(' ')[0]}`} right={<Row><LangButton onBrand /><IconBtn onBrand name="bell" label="Notifications" dot={!!st.data?.unread} onPress={() => navigation.navigate('Notifications')} /></Row>} />
      <Screen onRefresh={st.reload} refreshing={st.loading && st.data !== null} style={{ paddingTop: 14 }}>
        <Async state={st}>{(d) => (
          <>
            <Card>
              <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}><T b>Accepting new jobs</T><T small muted>{d.accepting ? 'Customers can request you' : 'Hidden from new requests'}</T></View>
                <Switch on={d.accepting} onChange={toggle} label="Accepting new jobs" />
              </Row>
            </Card>
            {error ? <Note tone="bad" icon="alert-triangle">{error}</Note> : null}
            <Row><Stat k="New requests" v={d.counts.pending} /><Stat k="Booked this week" v={d.counts.accepted} /></Row>
            <Section title="Requests" hint="Newest first">
              {d.items.length ? d.items.map((r) => {
                const [tone, label] = TONE[r.status];
                return (
                  <Card key={r.id} onPress={() => navigation.navigate('Request', { id: r.id })} label={r.job} testID={'req-' + r.id}>
                    <Row style={{ alignItems: 'center', gap: 8 }}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Row style={{ flexWrap: 'wrap', alignItems: 'center', gap: 6 }}><T b style={{ fontSize: 15 }}>{r.job || 'Job request'}</T><Pill tone={tone}>{label}</Pill></Row>
                        <T small>{r.customer}{r.area ? ' · ' + r.area : ''}</T>
                        <Row style={{ alignItems: 'center', gap: 4 }}><Icon name="clock" size={12} color={C.muted} /><T small muted>{r.when} · {r.photos} photo{r.photos === 1 ? '' : 's'}</T></Row>
                      </View>
                      <Icon name="chevron-right" size={16} color={C.muted} />
                    </Row>
                  </Card>
                );
              }) : <Empty title="No requests yet" text="New requests from customers appear here." />}
            </Section>
          </>
        )}</Async>
      </Screen>
    </>
  );
}
