// C9 Rate or report a problem (FR10, NFR4, NFR6)
import React, { useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import { api } from '../../api';
import { useLoad, useAction } from '../../hooks';
import { Screen, Header, Seg, Card, Row, T, Btn, Pill, Note, Field, Chip, Chips, Radio, Avatar, Async } from '../../ui';
import { C } from '../../theme';

const TAGS = ['On time', 'Fair price', 'Clean work', 'Clear communication'];
const REASONS = [['Provider did not show up', 'No-show'], ['Price changed after the job', 'Price changed'], ['Poor quality work', 'Poor quality'], ['Safety or fraud concern', 'Safety concern']];

export default function Rate({ navigation, route }) {
  const { bookingId } = route.params;
  const [tab, setTab] = useState(route.params.tab || 'rate');
  const st = useLoad(() => api.get('/bookings/' + bookingId), [bookingId]);
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState([]);
  const [body, setBody] = useState('');
  const [reason, setReason] = useState(null);
  const [detail, setDetail] = useState('');
  const [detailErr, setDetailErr] = useState('');
  const [done, setDone] = useState(null);
  const { busy, error, setError, run } = useAction();

  const submitRate = () => run(async () => {
    await api.post('/reviews', { bookingId, rating: stars, tags, body });
    setDone({ kind: 'rate' });
  });
  const submitReport = () => {
    if (detail.trim().length < 5) { setDetailErr('Tell us briefly what happened.'); return; }
    setDetailErr('');
    return run(async () => {
      const r = await api.post('/complaints', { bookingId, type: reason, detail: detail.trim() });
      setDone({ kind: 'report', ...r });
    });
  };

  return (
    <Screen>
      <Header title={tab === 'rate' ? 'Rate your job' : 'Report a problem'} />
      <Async state={st}>{(b) => done ? (
        <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
          <Pill tone="good" icon="check">{done.kind === 'rate' ? 'Review sent' : 'Report sent'}</Pill>
          <T b>{done.kind === 'rate' ? 'Thank you for rating' : `Case ${done.ref} opened`}</T>
          <T small muted style={{ textAlign: 'center' }}>{done.kind === 'rate' ? 'Your review helps other customers choose.' : done.next}</T>
          <Btn small kind="secondary" label="Done" onPress={() => navigation.goBack()} testID="done" />
        </Card>
      ) : (
        <>
          <Row style={{ alignItems: 'center', gap: 10 }}>
            <Avatar name={b.provider} id={b.providerId} size={38} />
            <View style={{ flex: 1 }}><T b>{b.provider}</T><T small muted>{b.status === 'completed' ? 'Completed job' : 'Accepted job'}</T></View>
          </Row>
          <Seg options={[['rate', 'Rate'], ['report', 'Report a problem']]} value={tab} onChange={(t) => { setTab(t); setError(''); }} />
          {tab === 'rate' ? (
            b.review ? <Note icon="check">You already rated this job {b.review.rating} stars.</Note> :
            b.status !== 'completed' ? <Note tone="warn" icon="clock">You can rate this job once the provider marks it finished.</Note> : (
              <>
                <Note icon="check">Only completed bookings can be reviewed, so reviews stay genuine.</Note>
                <View style={{ gap: 4 }}>
                  <T b style={{ fontSize: 13 }}>How was the job?</T>
                  <Row gap={2}>{[1, 2, 3, 4, 5].map((i) => (
                    <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${i} star${i > 1 ? 's' : ''}`} accessibilityState={{ selected: stars >= i }} testID={'star-' + i}
                      onPress={() => setStars(i)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 32, color: stars >= i ? C.star : '#788583' }}>★</Text>
                    </Pressable>))}</Row>
                </View>
                <Chips>{TAGS.map((t) => <Chip key={t} label={t} on={tags.includes(t)} onPress={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])} />)}</Chips>
                <Field label="Comment (optional)" value={body} onChangeText={setBody} multiline placeholder="What would help the next customer?" />
                {error ? <Note tone="bad" icon="alert-triangle">{error}</Note> : null}
                <Btn label="Submit review" onPress={submitRate} busy={busy} disabled={!stars} testID="submit-review" />
              </>
            )
          ) : (
            <>
              <View style={{ gap: 8 }}>
                <T b style={{ fontSize: 13 }}>What went wrong?</T>
                {REASONS.map(([label, type]) => <Radio key={type} label={label} on={reason === type} onPress={() => setReason(type)} />)}
              </View>
              <Field label="Details" value={detail} onChangeText={setDetail} multiline placeholder="Tell us what happened" error={detailErr} testID="report-detail" />
              {error ? <Note tone="bad" icon="alert-triangle">{error}</Note> : null}
              <Btn label="Send report" onPress={submitReport} busy={busy} disabled={!reason} testID="submit-report" />
              <T small muted>Serious reports go to an administrator who reviews both sides.</T>
            </>
          )}
        </>
      )}</Async>
    </Screen>
  );
}
