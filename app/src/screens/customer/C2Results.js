// C2 Provider results (FR1, FR2, FR3, FR4)
import React, { useState } from 'react';
import { View } from 'react-native';
import { api, qs } from '../../api';
import { Pressable } from 'react-native';
import { Icon } from '../../ui';
import { C } from '../../theme';
import { useLoad } from '../../hooks';
import { Screen, Header, Chip, Chips, Card, Row, T, Avatar, VerPill, Stars, Async, Empty, Btn, KV, Note } from '../../ui';
import { TRADES, lkr } from '../../theme';

export default function Results({ navigation, route }) {
  const { q, svc } = route.params || {};
  const [ver, setVer] = useState(false);
  const [min, setMin] = useState(false);
  const [today, setToday] = useState(false);
  const st = useLoad(() => api.get('/providers' + qs({ q, svc, verified: ver, min: min ? 4.5 : null, today })), [q, svc, ver, min, today]);
  const title = q ? `Results for "${q}"` : TRADES[svc]?.n || 'Providers';
  const toggleFav = async (p) => {
    try {
      if (p.favourite) await api.del('/favourites/' + p.id); else await api.post('/favourites/' + p.id);
      st.setData(st.data.map((x) => (x.id === p.id ? { ...x, favourite: !x.favourite } : x)));
    } catch (e) { setFavErr(e.message); }
  };
  const [favErr, setFavErr] = useState('');
  const clear = () => { setVer(false); setMin(false); setToday(false); };

  return (
    <Screen onRefresh={st.reload} refreshing={st.loading && st.data !== null}>
      <Header title={title} />
      <Chips>
        <Chip label="Verified only" icon="shield" on={ver} onPress={() => setVer(!ver)} testID="f-ver" />
        <Chip label="4.5 and above" icon="star" on={min} onPress={() => setMin(!min)} testID="f-45" />
        <Chip label="Free today" icon="clock" on={today} onPress={() => setToday(!today)} testID="f-today" />
      </Chips>
      <Async state={st}>{(list) => (
        <>
          {favErr ? <Note tone="bad" icon="alert-triangle">{favErr}</Note> : null}
          <T small muted>{list.length} provider{list.length === 1 ? '' : 's'} near Dehiwala-Mount Lavinia</T>
          {list.length ? list.map((p) => (
            <Card key={p.id} onPress={() => navigation.navigate('Profile', { id: p.id })} label={`${p.name}, ${p.rating} stars`} testID={'prov-' + p.id}>
              <Row style={{ alignItems: 'flex-start', gap: 12 }}>
                <Avatar name={p.name} id={p.id} />
                <View style={{ flex: 1, gap: 3, paddingRight: 36 }}>
                  <Row style={{ flexWrap: 'wrap', alignItems: 'center', gap: 6 }}><T b style={{ fontSize: 15 }}>{p.name}</T><VerPill verified={p.verified} /></Row>
                  <T small><Stars value={p.rating} /> <T small b>{p.rating.toFixed(1)}</T> <T small muted>({p.reviewCount} reviews) · {p.years} years · {p.area}</T></T>
                </View>
              </Row>
              <Pressable accessibilityRole="button" accessibilityLabel={p.favourite ? `Remove ${p.name} from favourites` : `Save ${p.name} to favourites`} testID={'fav-' + p.id}
                onPress={() => toggleFav(p)} style={{ position: 'absolute', top: 2, right: 2, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="heart" size={20} color={p.favourite ? C.bad : C.muted} />
              </Pressable>
              <KV k={TRADES[p.trade].n} v={`From ${lkr(p.priceFrom)}`} />
              <KV k="Next free" v={p.nextFree ? p.nextFree.label : 'No free slots this week'} last />
            </Card>
          )) : <Empty title="No providers match" text="Try turning off a filter." action={<Btn small kind="secondary" label="Clear filters" onPress={clear} />} />}
        </>
      )}</Async>
    </Screen>
  );
}
