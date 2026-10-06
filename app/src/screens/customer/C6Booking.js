// C6 Booking status (FR7, FR8, NFR5)
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { api } from '../../api';
import { useLoad, useAction, useToast } from '../../hooks';
import { Screen, Header, Card, Row, T, Btn, Pill, Note, KV, Avatar, Async, Sheet, Radio, Icon, Toast } from '../../ui';
import { C, lkr } from '../../theme';

const STEPS = (b) => [
  ['Request sent', 'Sent to ' + b.provider.split(' ')[0]],
  ['Provider accepts', 'Usually within 15 minutes'],
  ['Job done', b.when || ''],
  ['Rate your job', 'Helps other customers']
];
const POSITION = { pending: 1, accepted: 2, completed: 3 };
const REASONS = ['Found someone else', 'Need a different time', 'Problem solved'];

export default function Booking({ navigation, route }) {
  const { id, toast: initialToast } = route.params;
  const st = useLoad(() => api.get('/bookings/' + id), [id]);
  const { busy, error, run } = useAction();
  const [sheet, setSheet] = React.useState(false);
  const toast = useToast();
  useEffect(() => { if (initialToast) toast.show(initialToast); }, [initialToast]);

  const cancel = () => run(async () => {
    const b = await api.post(`/bookings/${id}/cancel`);
    st.setData(b); setSheet(false); toast.show('Request cancelled. Your slot was released.');
  });

  return (
    <>
      <Screen onRefresh={st.reload} refreshing={st.loading && st.data !== null}>
        <Header title="Your booking" />
        <Async state={st}>{(b) => {
          const closed = ['cancelled', 'declined'].includes(b.status);
          if (closed) return (
            <Card style={{ alignItems: 'center', paddingVertical: 26 }}>
              <T b>{b.status === 'cancelled' ? 'Request cancelled' : 'Request declined'}</T>
              <T small muted style={{ textAlign: 'center' }}>{b.status === 'cancelled' ? 'Your slot was released.' : `${b.provider.split(' ')[0]} could not take this job. You can choose another provider.`}</T>
              <Btn small kind="secondary" label="Find a provider" onPress={() => navigation.navigate('Tabs', { screen: 'Home' })} />
            </Card>
          );
          const ix = POSITION[b.status];
          return (
            <>
              <Card>
                <Row style={{ alignItems: 'flex-start', gap: 12 }}>
                  <Avatar name={b.provider} id={b.providerId} />
                  <View style={{ flex: 1, gap: 2 }}><T b style={{ fontSize: 15 }}>{b.provider}</T><T small muted>{b.problem || b.job}</T></View>
                </Row>
                <Pill tone={b.status === 'pending' ? 'warn' : 'good'}>{b.status === 'pending' ? 'Waiting for provider' : b.status === 'accepted' ? 'Accepted' : 'Completed'}</Pill>
              </Card>
              {b.status === 'accepted' && b.quote ? <Note icon="check">{b.provider.split(' ')[0]} accepted and confirmed the price: {lkr(b.quote)}.</Note> : null}
              {b.status === 'accepted' && !b.quote ? <Note icon="check">{b.provider.split(' ')[0]} accepted your request.</Note> : null}
              {b.status === 'completed' && b.price ? <Note icon="check">Job finished. Final price: {lkr(b.price)}.</Note> : null}
              <View>
                {STEPS(b).map((s, i) => (
                  <View key={s[0]} style={{ flexDirection: 'row', gap: 12, paddingBottom: 12 }}>
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: i < ix ? C.good : i === ix ? C.brand : C.line, backgroundColor: i < ix ? C.good : C.card, alignItems: 'center', justifyContent: 'center' }}>
                        {i < ix ? <Icon name="check" size={13} color="#fff" /> : null}
                      </View>
                      {i < 3 ? <View style={{ flex: 1, width: 2, backgroundColor: C.line, marginTop: 2 }} /> : null}
                    </View>
                    <View style={{ flex: 1 }}><T b style={i === ix ? { color: C.brand } : undefined}>{s[0]}</T><T small muted>{s[1]}</T></View>
                  </View>
                ))}
              </View>
              <Card>
                <KV k="When" v={b.when || 'Not set'} />
                <KV k="Address" v={b.address} />
                <KV k="Pay" v={b.pay} />
                <KV k="Provider phone" last vNode={b.providerPhone ? <T b style={{ flex: 1, textAlign: 'right' }}>{b.providerPhone}</T>
                  : <Row style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}><Icon name="lock" size={12} color={C.muted} /><T small b>Shown after acceptance</T></Row>} />
              </Card>
              {error ? <Note tone="bad" icon="alert-triangle">{error}</Note> : null}
              {b.status === 'completed' ? (
                <>
                  {b.review ? <Note icon="check">You rated this job {b.review.rating} stars. Thank you.</Note>
                    : <Btn label="Rate this job" onPress={() => navigation.navigate('Rate', { bookingId: b.id, tab: 'rate' })} testID="rate-job" />}
                  <Btn kind="secondary" label="Report a problem" icon="flag" onPress={() => navigation.navigate('Rate', { bookingId: b.id, tab: 'report' })} />
                </>
              ) : (
                <>
                  <Row>
                    <Btn small kind="secondary" icon="message-square" label="Message" onPress={() => navigation.navigate('Chat', { bookingId: b.id, title: b.provider })} testID="message" />
                    <Btn small kind="secondary" icon="clock" label="Change time" onPress={() => navigation.navigate('Time', { editBookingId: b.id, flow: { providerId: b.providerId, providerName: b.provider } })} testID="change-time" />
                  </Row>
                  {b.status === 'accepted' ? <Btn kind="secondary" icon="flag" label="Report a problem" onPress={() => navigation.navigate('Rate', { bookingId: b.id, tab: 'report' })} /> : null}
                  <Btn kind="danger" label="Cancel request" onPress={() => setSheet(true)} testID="cancel" />
                </>
              )}
            </>
          );
        }}</Async>
      </Screen>
      {sheet ? (
        <Sheet title="Cancel this request?" onClose={() => setSheet(false)}>
          <T small muted>The slot is released for other customers.</T>
          {REASONS.map((r) => <Radio key={r} label={r} onPress={cancel} />)}
          <Btn kind="secondary" label="Keep request" onPress={() => setSheet(false)} />
        </Sheet>
      ) : null}
      <Toast msg={toast.msg} />
    </>
  );
}
