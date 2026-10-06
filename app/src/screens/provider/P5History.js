// P5 Job history and payments (FR6, FR13)
import React, { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api';
import { useLoad, useAction, useToast } from '../../hooks';
import { Screen, Header, Card, Row, T, Btn, Pill, Note, Field, Section, Stat, Async, Empty, Sheet, Toast } from '../../ui';
import { lkr } from '../../theme';

export default function History() {
  const st = useLoad(() => api.get('/provider/earnings'));
  const [sheet, setSheet] = useState(false);
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');
  const { busy, error, setError, run } = useAction();
  const toast = useToast();

  const request = (d) => {
    const n = Number(String(amount || d.available).replace(/[, ]/g, ''));
    if (!Number.isInteger(n) || n < 1) { setErr('Enter a whole amount in rupees.'); return; }
    setErr('');
    return run(async () => { await api.post('/provider/payouts', { amount: n }); setSheet(false); setAmount(''); toast.show('Payout requested.'); st.reload(); });
  };
  const cancel = (id) => run(async () => { await api.del('/provider/payouts/' + id); st.reload(); });

  return (
    <>
      <Screen onRefresh={st.reload} refreshing={st.loading && st.data !== null}>
        <Header title="Jobs and payments" back={false} />
        <Async state={st}>{(d) => (
          <>
            <Row><Stat k="Jobs completed" v={d.jobs.length} /><Stat k="Earned" v={lkr(d.earned)} small /></Row>
            <Card>
              <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <View><T small muted>Available for payout</T><T b style={{ fontSize: 18 }}>{lkr(d.available)}</T></View>
                <Btn small label="Request payout" onPress={() => { setError(''); setErr(''); setAmount(String(d.available)); setSheet(true); }} disabled={d.available < 1} style={{ flex: 0, minWidth: 150 }} testID="request-payout" />
              </Row>
            </Card>
            {d.payouts.length ? (
              <Section title="Payouts">
                {d.payouts.map((p) => (
                  <Card key={p.id}>
                    <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <View><T b>{lkr(p.amount)}</T><T small muted>{p.createdAt?.slice(0, 10)}</T></View>
                      <Row style={{ alignItems: 'center' }}><Pill tone={p.status === 'requested' ? 'warn' : 'good'}>{p.status === 'requested' ? 'Waiting' : p.status[0].toUpperCase() + p.status.slice(1)}</Pill>
                        {p.status === 'requested' ? <Btn small kind="secondary" label="Cancel" onPress={() => cancel(p.id)} style={{ flex: 0, minWidth: 88 }} /> : null}</Row>
                    </Row>
                  </Card>
                ))}
              </Section>
            ) : null}
            {error && !sheet ? <Note tone="bad" icon="alert-triangle">{error}</Note> : null}
            <Section title="History">
              {d.jobs.length ? d.jobs.map((j) => (
                <Card key={j.id} style={{ gap: 2 }}>
                  <Row style={{ justifyContent: 'space-between' }}><T b>{j.job}</T><T b>{lkr(j.price)}</T></Row>
                  <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}><T small muted>{j.customer} · {j.date}</T><Pill tone="good">{j.pay}</Pill></Row>
                </Card>
              )) : <Empty title="No finished jobs yet" text="Completed jobs and what you earned appear here." />}
            </Section>
          </>
        )}</Async>
      </Screen>
      {sheet && st.data ? (
        <Sheet title="Request a payout" onClose={() => setSheet(false)}>
          <T small muted>You can request up to {lkr(st.data.available)}.</T>
          <Field label="Amount (LKR)" value={amount} onChangeText={setAmount} keyboardType="number-pad" error={err} testID="payout-amount" />
          {error ? <Note tone="bad" icon="alert-triangle">{error}</Note> : null}
          <Btn label="Send request" onPress={() => request(st.data)} busy={busy} testID="payout-send" />
          <Btn kind="secondary" label="Cancel" onPress={() => setSheet(false)} />
        </Sheet>
      ) : null}
      <Toast msg={toast.msg} />
    </>
  );
}
