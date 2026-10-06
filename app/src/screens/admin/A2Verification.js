// A2 Provider verification (FR9, NFR4). Phone: cards that expand. Wide window: queue on the left, checklist panel on the right (as in the prototype).
import React, { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api';
import { useLoad, useAction, useToast, useWide } from '../../hooks';
import { Screen, Header, Card, Row, T, Btn, Pill, Note, Async, Empty, Seg, Check, Photo, Sheet, Radio, Toast } from '../../ui';
import { C, TRADES } from '../../theme';

const REJECT = ['Documents unclear', 'Certificate not valid', 'Identity could not be confirmed'];

export default function Verification() {
  const wide = useWide();
  const [status, setStatus] = useState('pending');
  const [sel, setSel] = useState(null);
  const [sheet, setSheet] = useState(false);
  const st = useLoad(() => api.get('/admin/applications?status=' + status), [status]);
  const { busy, error, setError, run } = useAction();
  const toast = useToast();

  const replace = (a) => st.setData(st.data.map((x) => (x.id === a.id ? a : x)));
  const tick = (a, i) => {
    const checks = a.checks.map((c, j) => (j === i ? (c ? 0 : 1) : c));
    replace({ ...a, checks });
    run(async () => replace(await api.patch(`/admin/applications/${a.id}/checks`, { checks })));
  };
  const approve = (a) => run(async () => { await api.post(`/admin/applications/${a.id}/approve`); toast.show(`${a.name} approved. Now shows a verified badge.`); setSel(null); st.reload(); });
  const reject = (a, reason) => run(async () => { await api.post(`/admin/applications/${a.id}/reject`, { reason }); setSheet(false); toast.show('Application rejected.'); setSel(null); st.reload(); });

  const Summary = ({ a }) => (
    <Row style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1 }}><T b style={{ fontSize: 15 }}>{a.name}</T><T small muted>{TRADES[a.trade].n} · {a.area} · applied {a.submittedAt?.slice(0, 10)}</T></View>
      <Pill tone={a.status === 'approved' ? 'good' : a.status === 'rejected' ? 'bad' : 'warn'}>{a.status[0].toUpperCase() + a.status.slice(1)}</Pill>
    </Row>
  );

  const Detail = ({ a }) => {
    const ok = a.checks.every(Boolean);
    return (
      <>
        <View style={{ gap: 6 }}>
          <T b style={{ fontSize: 13 }}>Documents</T>
          {a.documents.length
            ? <Row style={{ flexWrap: 'wrap' }}>{a.documents.map((d, i) => <View key={d.id} style={{ width: '31%' }}><Photo label={d.type} tone={i + 1} icon="file-text" /></View>)}</Row>
            : <T small muted>No documents uploaded yet.</T>}
        </View>
        {a.status === 'pending' ? (
          <>
            <View style={{ gap: 6 }}>
              <T b style={{ fontSize: 13 }}>Checks</T>
              {a.checkLabels.map((l, i) => <Check key={l} label={l} on={!!a.checks[i]} onPress={() => tick(a, i)} />)}
            </View>
            {!ok ? <T small muted>Tick all four checks to enable approval.</T> : null}
            {error ? <Note tone="bad" icon="alert-triangle">{error}</Note> : null}
            <Row>
              <Btn small label="Approve provider" onPress={() => approve(a)} disabled={!ok} busy={busy} testID={'approve-' + a.id} />
              <Btn small kind="secondary" label="Reject" onPress={() => setSheet(true)} testID={'reject-' + a.id} />
            </Row>
          </>
        ) : <Note icon="check">{a.status === 'approved' ? 'Approved. The provider shows a verified badge to customers.' : 'Decision recorded.'}</Note>}
        {sheet ? (
          <Sheet title="Reject this application" onClose={() => setSheet(false)}>
            {REJECT.map((r) => <Radio key={r} label={r} onPress={() => reject(a, r)} />)}
            <Btn kind="secondary" label="Cancel" onPress={() => setSheet(false)} />
          </Sheet>
        ) : null}
      </>
    );
  };

  return (
    <>
      <Screen onRefresh={st.reload} refreshing={st.loading && st.data !== null}>
        <Header title="Provider verification" back={false} />
        <Seg options={[['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']]} value={status} onChange={(s) => { setStatus(s); setSel(null); setError(''); }} />
        <Async state={st}>{(list) => {
          if (!list.length) return <Empty title={`No ${status} applications`} text="New provider applications appear here." />;
          const cur = list.find((a) => a.id === sel) || list[0];
          if (wide) return (
            <Row style={{ alignItems: 'flex-start', gap: 16 }}>
              <View style={{ flex: 1, gap: 8 }}>
                {list.map((a) => (
                  <Card key={a.id} onPress={() => { setSel(a.id); setError(''); }} label={a.name} style={a.id === cur.id ? { borderColor: C.brand, backgroundColor: C.infoBg } : undefined} testID={'app-' + a.id}><Summary a={a} /></Card>
                ))}
              </View>
              <Card style={{ flex: 1.2 }}><Summary a={cur} /><Detail a={cur} /></Card>
            </Row>
          );
          return list.map((a) => {
            const open = a.id === cur.id;
            return (
              <Card key={a.id} testID={'app-' + a.id}>
                <Summary a={a} />
                {open ? <Detail a={a} /> : <Btn small kind="secondary" label="Review" onPress={() => { setSel(a.id); setError(''); }} />}
              </Card>
            );
          });
        }}</Async>
      </Screen>
      <Toast msg={toast.msg} />
    </>
  );
}
