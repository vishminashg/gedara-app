// C8 My bookings (FR10, FR12, NFR6)
import React, { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api';
import { useLoad, useAction } from '../../hooks';
import { Screen, Header, Seg, Card, Row, T, Btn, Pill, Note, Avatar, Async, Empty } from '../../ui';
import { lkr } from '../../theme';

export default function Bookings({ navigation }) {
  const [tab, setTab] = useState('upcoming');
  const st = useLoad(async () => {
    const [list, cases] = await Promise.all([api.get('/bookings?tab=' + tab), api.get('/complaints')]);
    return { list, cases };
  }, [tab]);
  const { error, run } = useAction();

  const del = (b) => run(async () => { await api.del('/bookings/' + b.id); st.reload(); });
  const resume = (b) => navigation.navigate('Describe', { flow: { providerId: b.providerId, providerName: b.provider, trade: b.trade, priceFrom: null, draftId: b.id, job: b.job, problem: b.problem, photos: b.photos, address: b.address, phone: b.phone } });

  const rebook = (b) => run(async () => {
    const d = await api.post(`/bookings/${b.id}/rebook`);
    navigation.navigate('Describe', { flow: { providerId: d.providerId, providerName: d.provider, trade: d.trade, priceFrom: null, draftId: d.id, job: d.job, problem: '', address: d.address, phone: d.phone } });
  });

  return (
    <Screen onRefresh={st.reload} refreshing={st.loading && st.data !== null}>
      <Header title="My bookings" back={false} />
      <Seg options={[['upcoming', 'Upcoming'], ['past', 'Past']]} value={tab} onChange={setTab} />
      {error ? <Note tone="bad" icon="alert-triangle">{error}</Note> : null}
      <Async state={st}>{({ list, cases }) => list.length ? list.map((b) => {
        const open = ['draft', 'pending', 'accepted'].includes(b.status);
        const c = cases.find((x) => x.bookingId === b.id);
        return (
          <Card key={b.id} onPress={open && b.status !== 'draft' ? () => navigation.navigate('Booking', { id: b.id }) : undefined} label={b.provider} testID={'bk-' + b.id}>
            <Row style={{ alignItems: 'flex-start', gap: 12 }}>
              <Avatar name={b.provider} id={b.providerId} />
              <View style={{ flex: 1, gap: 2 }}>
                <T b style={{ fontSize: 15 }}>{b.provider}</T>
                <T small>{b.job || b.problem}</T>
                <T small muted>{b.when ? b.when : 'No time chosen'}{b.price ? ' · ' + lkr(b.price) : ''}</T>
              </View>
              <Pill tone={b.status === 'pending' ? 'warn' : b.status === 'accepted' || b.status === 'completed' ? 'good' : b.status === 'draft' ? 'info' : 'mute'}>
                {b.status === 'draft' ? 'Not sent' : b.status[0].toUpperCase() + b.status.slice(1)}
              </Pill>
            </Row>
            {c ? <Note tone="warn" icon="flag">Case {c.ref}: {c.status}. We reply within 24 hours.</Note> : null}
            {b.status === 'draft' ? (
              <Row>
                <Btn small kind="secondary" label="Continue" onPress={() => resume(b)} testID={'resume-' + b.id} />
                <Btn small kind="danger" label="Delete" onPress={() => del(b)} testID={'delete-' + b.id} />
              </Row>
            ) : null}
            {!open ? (
              <Row>
                {b.status === 'completed' ? <Btn small kind="secondary" label="Book again" onPress={() => rebook(b)} /> : null}
                {b.status === 'completed' && !b.review ? <Btn small kind="secondary" label="Rate" onPress={() => navigation.navigate('Rate', { bookingId: b.id, tab: 'rate' })} /> : null}
                {b.status === 'completed' ? <Btn small kind="secondary" label="Report" onPress={() => navigation.navigate('Rate', { bookingId: b.id, tab: 'report' })} /> : null}
                {['cancelled', 'declined'].includes(b.status) ? <Btn small kind="danger" label="Remove" onPress={() => del(b)} /> : null}
              </Row>
            ) : null}
          </Card>
        );
      }) : tab === 'upcoming'
        ? <Empty title="Nothing booked" text="Your upcoming jobs appear here." action={<Btn small kind="secondary" label="Find a provider" onPress={() => navigation.navigate('Home')} />} />
        : <Empty title="No past jobs yet" text="Finished jobs appear here so you can rate or rebook them." />}
      </Async>
    </Screen>
  );
}
