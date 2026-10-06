// P2 Request details (FR3, FR5, FR6, NFR3)
import React, { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api';
import { useLoad, useAction } from '../../hooks';
import { Screen, Header, Card, Row, T, Btn, Pill, Note, Field, KV, Section, Photo, Async, Sheet, Radio, Icon, Toast } from '../../ui';
import { useToast } from '../../hooks';
import { C, lkr } from '../../theme';

const DECLINE = ['Not available at that time', 'Outside my area', 'Job too small or too big'];
// Suggest-another-time sends the customer a chat message with the proposed slots (no separate endpoint needed).
const slotOptions = () => {
  const out = [];
  const labels = ['9:00 am', '11:00 am', '2:00 pm', '4:00 pm'];
  for (let d = 1; d <= 3; d++) {
    const dt = new Date(); dt.setDate(dt.getDate() + d);
    const day = d === 1 ? 'Tomorrow' : dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    out.push(`${day} ${labels[d % 4]}`);
  }
  return out;
};

export default function Request({ navigation, route }) {
  const { id } = route.params;
  const st = useLoad(() => api.get('/provider/requests/' + id), [id]);
  const [sheet, setSheet] = useState(null);
  const [quote, setQuote] = useState(null);
  const [price, setPrice] = useState(null);
  const [quoteErr, setQuoteErr] = useState('');
  const { busy, error, run } = useAction();
  const toast = useToast();

  const num = (v) => Number(String(v).replace(/[, ]/g, ''));
  const accept = (r) => {
    const q = num(quote ?? r.quote ?? '');
    if (!q || q < 1) { setQuoteErr('Enter the estimate you will confirm, in LKR.'); return; }
    setQuoteErr('');
    return run(async () => { st.setData(await api.patch('/provider/requests/' + id, { status: 'accepted', quote: q })); toast.show('Accepted. The customer can now see your price.'); });
  };
  const decline = () => run(async () => { await api.patch('/provider/requests/' + id, { status: 'declined' }); setSheet(null); navigation.goBack(); });
  const complete = (r) => {
    const p = num(price ?? r.quote ?? '');
    if (!p) { setQuoteErr('Enter the final price you charged.'); return; }
    setQuoteErr('');
    return run(async () => { st.setData(await api.patch('/provider/requests/' + id, { status: 'completed', price: p })); setSheet(null); toast.show('Job recorded under History.'); });
  };
  const suggest = (t, r) => run(async () => {
    await api.post(`/bookings/${id}/messages`, { body: `Could we do ${t} instead? If that suits you, please change the time of your request.` });
    setSheet(null); toast.show('Suggestion sent in chat.');
  });

  const r = st.data;
  const open = r && ['accepted', 'completed'].includes(r.status);

  return (
    <>
      <Screen footer={r && r.status === 'pending' ? (
        <>
          <Btn label="Accept request" onPress={() => accept(r)} busy={busy} testID="accept" />
          <Row><Btn small kind="secondary" label="Suggest another time" onPress={() => setSheet('suggest')} /><Btn small kind="secondary" label="Decline" onPress={() => setSheet('decline')} testID="decline" /></Row>
        </>
      ) : r && r.status === 'accepted' ? <Btn label="Mark job complete" onPress={() => setSheet('complete')} testID="complete" /> : null}>
        <Header title="Request details" />
        <Async state={st}>{(r) => (
          <>
            <Card><T b style={{ fontSize: 16 }}>{r.job || 'Job request'}</T><Row style={{ alignItems: 'center', gap: 6, flexWrap: 'wrap' }}><T small muted>From {r.customer}</T><Pill tone="good" icon="check">Phone verified</Pill></Row></Card>
            <Card>
              <KV k="Preferred time" v={r.when} />
              <KV k="Area" v={r.area || '-'} />
              <KV k="Address" last={false} vNode={open ? <T b style={{ flex: 1, textAlign: 'right' }}>{r.address}</T> : <Locked />} />
              <KV k="Phone" last vNode={open ? <T b style={{ flex: 1, textAlign: 'right' }}>{r.phone}</T> : <Locked />} />
            </Card>
            <Section title="Problem"><Card><T>{r.problem || r.job}</T></Card></Section>
            <Section title="Photos" hint={String(r.photos)}>
              {r.photos ? <Row>{Array.from({ length: r.photos }).map((_, i) => <Photo key={i} label={`Photo ${i + 1}`} tone={2} />)}</Row> : <T small muted>No photos added</T>}
            </Section>
            <Section title="Your price">
              <Card>
                <Field label="Estimate you will confirm (LKR)" value={quote ?? (r.quote ? String(r.quote) : '')} onChangeText={setQuote} keyboardType="number-pad" editable={r.status === 'pending'} error={quoteErr} testID="quote" />
                {r.status === 'pending' ? <T small muted>The customer sees your price before work starts.</T> : r.price ? <T small b>Final price charged: {lkr(r.price)}</T> : null}
              </Card>
            </Section>
            {open ? <Btn kind="secondary" icon="message-square" label="Message customer" onPress={() => navigation.navigate('Chat', { bookingId: r.id, title: r.customer })} /> : null}
            {r.status === 'completed' ? <Note icon="check">Job completed and recorded under History.</Note> : null}
            {['declined', 'cancelled'].includes(r.status) ? <Note icon="info">This request is closed.</Note> : null}
            {error ? <Note tone="bad" icon="alert-triangle">{error}</Note> : null}
          </>
        )}</Async>
      </Screen>
      {sheet === 'decline' ? (
        <Sheet title="Decline this request" onClose={() => setSheet(null)}>
          {DECLINE.map((x) => <Radio key={x} label={x} onPress={decline} />)}
          <Btn kind="secondary" label="Cancel" onPress={() => setSheet(null)} />
        </Sheet>
      ) : null}
      {sheet === 'suggest' ? (
        <Sheet title="Suggest another time" onClose={() => setSheet(null)}>
          <T small muted>We send the customer a chat message with your suggestion.</T>
          {slotOptions().map((t) => <Radio key={t} label={t} onPress={() => suggest(t, r)} />)}
          <Btn kind="secondary" label="Cancel" onPress={() => setSheet(null)} />
        </Sheet>
      ) : null}
      {sheet === 'complete' && r ? (
        <Sheet title="Mark job complete" onClose={() => setSheet(null)}>
          <Field label="Final price charged (LKR)" value={price ?? (r.quote ? String(r.quote) : '')} onChangeText={setPrice} keyboardType="number-pad" error={quoteErr} testID="final-price" />
          <Btn label="Confirm and record" onPress={() => complete(r)} busy={busy} testID="confirm-complete" />
          <Btn kind="secondary" label="Cancel" onPress={() => setSheet(null)} />
        </Sheet>
      ) : null}
      <Toast msg={toast.msg} />
    </>
  );
}

const Locked = () => <Row style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}><Icon name="lock" size={12} color={C.muted} /><T small b>Shown after you accept</T></Row>;
