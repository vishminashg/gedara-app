// C1 Home and search (FR1, FR12)
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { api } from '../../api';
import { useSession } from '../../session';
import { useLoad } from '../../hooks';
import { Screen, BrandBar, IconBtn, LangButton, Field, Btn, Section, Card, Row, T, H1, Note, Avatar, VerPill, Icon, Stars } from '../../ui';
import { C, TRADES, lkr } from '../../theme';

export default function Home({ navigation }) {
  const { user, signOut } = useSession();
  const [q, setQ] = useState('');
  const st = useLoad(async () => {
    const [past, favs, notes] = await Promise.all([api.get('/bookings?tab=past'), api.get('/favourites'), api.get('/notifications')]);
    return { last: past.find((b) => b.status === 'completed') || null, favs, unread: notes.unread };
  });
  const d = st.data;
  const search = () => navigation.navigate('Results', { q: q.trim() });

  const rebook = async (b) => {
    try {
      const draft = await api.post(`/bookings/${b.id}/rebook`);
      navigation.navigate('Describe', { flow: { providerId: draft.providerId, providerName: draft.provider, trade: draft.trade, priceFrom: null, draftId: draft.id, job: draft.job, problem: '', address: draft.address, phone: draft.phone } });
    } catch (e) { st.setData({ ...d, err: e.message }); }
  };

  return (
    <>
      <BrandBar title="Gedara" right={<Row><LangButton onBrand /><IconBtn onBrand name="bell" label="Notifications" dot={!!d?.unread} onPress={() => navigation.navigate('Notifications')} testID="bell" /></Row>} />
      <Screen onRefresh={st.reload} refreshing={st.loading && d !== null} style={{ paddingTop: 14 }}>
        <View style={{ gap: 4 }}>
          <H1>What needs fixing?</H1>
          <Row style={{ alignItems: 'center', gap: 4 }}><Icon name="map-pin" size={13} color={C.muted} /><T small muted>Dehiwala-Mount Lavinia</T></Row>
        </View>
        <Row>
          <View style={{ flex: 1 }}><Field value={q} onChangeText={setQ} placeholder="Try: leaking tap, fan, clean kitchen" onSubmitEditing={search} returnKeyType="search" testID="search-input" /></View>
          <Btn label="Search" icon="search" onPress={search} style={{ minWidth: 44, paddingHorizontal: 14 }} testID="search-go" />
        </Row>
        <Section title="Services">
          <Row>
            {Object.entries(TRADES).map(([k, v]) => (
              <Pressable key={k} accessibilityRole="button" accessibilityLabel={v.n} testID={'svc-' + k} onPress={() => navigation.navigate('Results', { svc: k })}
                style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.infoBg, alignItems: 'center', justifyContent: 'center' }}><Icon name={v.i} size={22} color={C.brand} /></View>
                <T b>{v.n}</T>
              </Pressable>
            ))}
          </Row>
        </Section>
        {d?.last ? (
          <Section title="Book again">
            <Card>
              <Row style={{ alignItems: 'flex-start', gap: 12 }}>
                <Avatar name={d.last.provider} id={d.last.providerId} />
                <View style={{ flex: 1, gap: 3 }}><T b style={{ fontSize: 15 }}>{d.last.provider}</T><T small muted>{d.last.job || 'Completed job'}{d.last.price ? ', ' + lkr(d.last.price) : ''}</T></View>
              </Row>
              <Btn kind="secondary" icon="rotate-ccw" label={`Book ${d.last.provider.split(' ')[0]} again`} onPress={() => rebook(d.last)} testID="rebook" />
            </Card>
          </Section>
        ) : null}
        {d?.favs?.length ? (
          <Section title="Your favourites">
            {d.favs.map((p) => (
              <Card key={p.id} onPress={() => navigation.navigate('Profile', { id: p.id })} label={p.name}>
                <Row style={{ alignItems: 'center', gap: 12 }}><Avatar name={p.name} id={p.id} size={40} />
                  <View style={{ flex: 1 }}><T b>{p.name}</T><T small muted>{TRADES[p.trade].n} · {p.area}</T></View><Stars value={p.rating} /></Row>
              </Card>
            ))}
          </Section>
        ) : null}
        {d?.err ? <Note tone="bad" icon="alert-triangle">{d.err}</Note> : null}
        {st.error && !d ? <Note tone="bad" icon="alert-triangle">{st.error}</Note> : null}
        <Note icon="shield">Every provider shows whether their ID and certificates were checked by our team.</Note>
        <Btn kind="secondary" small label={`Sign out (${user.name.split(' ')[0]})`} onPress={() => signOut()} style={{ flex: 0, alignSelf: 'flex-start' }} testID="signout" />
      </Screen>
    </>
  );
}
