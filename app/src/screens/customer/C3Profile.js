// C3 Provider profile (FR2, FR3, FR4, NFR4)
import React from 'react';
import { View } from 'react-native';
import { api } from '../../api';
import { useSession } from '../../session';
import { useLoad, useAction } from '../../hooks';
import { Screen, Header, IconBtn, Card, Row, T, H1, Section, KV, Note, Avatar, VerPill, Stars, Pill, Photo, Async, Btn, Icon } from '../../ui';
import { C, TRADES, lkr } from '../../theme';

export default function Profile({ navigation, route }) {
  const { id } = route.params;
  const { user } = useSession();
  const st = useLoad(async () => {
    const [p, grid] = await Promise.all([api.get('/providers/' + id), api.get(`/providers/${id}/slots`)]);
    return { p, grid };
  }, [id]);
  const fav = useAction();
  const toggleFav = (p) => fav.run(async () => {
    if (p.favourite) await api.del('/favourites/' + p.id); else await api.post('/favourites/' + p.id);
    st.setData({ ...st.data, p: { ...p, favourite: !p.favourite } });
  });
  const p = st.data?.p;

  const start = () => navigation.navigate('Describe', { flow: { providerId: p.id, providerName: p.name, trade: p.trade, priceFrom: p.priceFrom, job: '', problem: '', address: user.address || '', phone: user.phone || '' } });

  return (
    <Screen onRefresh={st.reload} refreshing={st.loading && !!p}
      footer={p ? <Btn label={`Request booking from ${lkr(p.priceFrom)}`} onPress={start} disabled={!p.accepting} testID="request-booking" /> : null}>
      <Header title="Provider profile" right={p ? <IconBtn name="heart" label={p.favourite ? 'Remove from favourites' : 'Save to favourites'} onPress={() => toggleFav(p)} testID="fav" /> : null} />
      <Async state={st}>{({ p, grid }) => (
        <>
          <Row style={{ alignItems: 'flex-start', gap: 12 }}>
            <Avatar name={p.name} id={p.id} size={64} />
            <View style={{ flex: 1, gap: 3 }}>
              <H1 style={{ fontSize: 20 }}>{p.name}</H1>
              <VerPill verified={p.verified} />
              <T small><Stars value={p.rating} /> <T small b>{p.rating.toFixed(1)}</T> <T small muted>({p.reviewCount} reviews)</T></T>
              <T small muted>{TRADES[p.trade].n} · {p.years} years · {p.area}</T>
            </View>
          </Row>
          {p.favourite ? <Pill tone="info" icon="heart">Saved to your favourites</Pill> : null}
          {fav.error ? <Note tone="bad" icon="alert-triangle">{fav.error}</Note> : null}
          {!p.accepting ? <Note tone="warn" icon="clock">{p.name.split(' ')[0]} is not taking new jobs right now.</Note> : null}
          {p.bio ? <T>{p.bio}</T> : null}
          <Section title="Verification">
            <Card>
              {p.verified ? (
                <>
                  <KV k="Identity (NIC)" v="Checked" /><KV k="Certificate or licence" v="Checked" /><KV k="Phone number" v="Checked" last />
                </>
              ) : <Note tone="warn" icon="alert-triangle">Documents are still being reviewed. You can send a request, but we suggest a verified provider.</Note>}
            </Card>
          </Section>
          <Section title="Price estimates" hint="Provider confirms the final price">
            <Card>
              {p.estimates.map((e, i) => <KV key={e.job} k={e.job} v={`${lkr(e.min)} to ${Number(e.max).toLocaleString('en-US')}`} last={i === p.estimates.length - 1} />)}
              <T small muted>Complex jobs may need an inspection first. You will see the price before work starts.</T>
            </Card>
          </Section>
          {p.work.length ? (
            <Section title="Past work"><Row>{p.work.map((w, i) => <Photo key={w} label={w} tone={i + 1} icon={TRADES[p.trade].i} />)}</Row></Section>
          ) : null}
          <Section title="Availability" hint={`Next free: ${p.nextFree ? p.nextFree.label : 'none this week'}`}>
            <Card>
              {grid.slice(0, 2).map((day, i) => (
                <KV key={day.date} k={day.label} last={i === 1}
                  v={day.slots.filter((s) => s.free).map((s) => s.label.replace(':00', '')).join(', ') || 'Fully booked'} />
              ))}
            </Card>
          </Section>
          <Section title="Reviews" hint="From completed bookings">
            {p.reviews.length ? p.reviews.map((r) => (
              <Card key={r.id}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Row style={{ alignItems: 'center', flexShrink: 1 }}><T b>{r.customer}</T><Pill icon="check">Verified booking</Pill></Row>
                  <Stars value={r.rating} />
                </Row>
                {r.body ? <T small>{r.body}</T> : null}
                {r.tags.length ? <T small muted>{r.tags.join(' · ')}</T> : null}
                <T small muted>{r.created_at?.slice(0, 10)}</T>
              </Card>
            )) : <T small muted>No written reviews yet.</T>}
          </Section>
        </>
      )}</Async>
    </Screen>
  );
}
