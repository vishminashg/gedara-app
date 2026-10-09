// C7 Chat (FR7, NFR3): the Messages tab lists conversations, the thread screen is shared with providers.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, FlatList, Pressable, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../api';
import { useSession } from '../../session';
import { useT } from '../../i18n';
import { useLoad, useAction } from '../../hooks';
import { Screen, Header, BrandBar, Card, Row, T, Chip, Chips, Note, Avatar, Pill, Async, Empty, Btn, Icon, ErrorBox } from '../../ui';
import { C, F } from '../../theme';

export function Messages({ navigation }) {
  const st = useLoad(() => api.get('/bookings?tab=all'));
  return (
    <>
      <Screen onRefresh={st.reload} refreshing={st.loading && st.data !== null}>
        <Header title="Messages" back={false} />
        <Async state={st}>{(all) => {
          const list = all.filter((b) => !['draft', 'cancelled', 'declined'].includes(b.status));
          return list.length ? list.map((b) => (
            <Card key={b.id} onPress={() => navigation.navigate('Chat', { bookingId: b.id, title: b.provider })} label={`Chat with ${b.provider}`}>
              <Row style={{ alignItems: 'center', gap: 12 }}>
                <Avatar name={b.provider} id={b.providerId} />
                <View style={{ flex: 1 }}><T b>{b.provider}</T><T small muted numberOfLines={1}>{b.job || b.problem}</T></View>
                <Pill tone={b.status === 'pending' ? 'warn' : b.status === 'accepted' ? 'good' : 'mute'}>{b.status}</Pill>
              </Row>
            </Card>
          )) : <Empty title="No conversations yet" text="You can message a provider once you have sent a booking request." />;
        }}</Async>
      </Screen>
    </>
  );
}

const QUICK = { customer: ['I will be home after 3 pm', 'Is parking available?'], provider: ['I am on my way', 'Can you send a photo of the problem?'] };

/** Shared chat thread for customer and provider. Polls every 5 seconds while open. */
export function Chat({ route }) {
  const { bookingId, title } = route.params;
  const { user } = useSession();
  const t = useT();
  const [msgs, setMsgs] = useState(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const { busy, error: sendErr, run } = useAction();
  const list = useRef(null);

  const load = useCallback(async () => {
    try { setMsgs(await api.get(`/bookings/${bookingId}/messages`)); setError(''); } catch (e) { setError(e.message); }
  }, [bookingId]);
  useFocusEffect(useCallback(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]));
  useEffect(() => { if (msgs?.length) setTimeout(() => list.current?.scrollToEnd({ animated: false }), 50); }, [msgs?.length]);

  const send = (body) => {
    const msg = (body ?? text).trim();
    if (!msg) return;
    return run(async () => { await api.post(`/bookings/${bookingId}/messages`, { body: msg }); setText(''); await load(); });
  };
  const remove = (id) => run(async () => { await api.del('/messages/' + id); await load(); });
  const fmt = (s) => (s || '').slice(11, 16);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <Header title={title || 'Chat'} />
      <Note icon="lock">Phone numbers stay hidden until the provider accepts. Keep chatting here.</Note>
      {error && msgs === null ? <View style={{ padding: 16 }}><ErrorBox message={error} onRetry={load} /></View> : (
        <FlatList ref={list} data={msgs || []} keyExtractor={(m) => String(m.id)} contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
          ListEmptyComponent={<T small muted style={{ textAlign: 'center' }}>{msgs === null ? 'Loading...' : 'No messages yet. Say hello or ask about access and parking.'}</T>}
          renderItem={({ item: m }) => {
            const me = m.senderId === user.id;
            return (
              <View style={{ maxWidth: '78%', alignSelf: me ? 'flex-end' : 'flex-start', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: me ? C.brand : C.card, borderWidth: 1, borderColor: me ? C.brand : C.line }}>
                <T style={{ color: me ? '#fff' : C.text, fontSize: 14 }}>{m.body}</T>
                <T small style={{ color: me ? 'rgba(255,255,255,.75)' : C.muted, fontSize: 11 }}>{me ? 'You' : m.sender.split(' ')[0]} · {fmt(m.createdAt)}</T>
                {me ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={t('Delete message')} testID={'del-msg-' + m.id} onPress={() => remove(m.id)} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <T small b style={{ color: 'rgba(255,255,255,.9)', fontSize: 11.5 }}>Delete</T>
                  </Pressable>
                ) : null}
              </View>
            );
          }} />
      )}
      {sendErr ? <View style={{ paddingHorizontal: 16 }}><Note tone="bad" icon="alert-triangle">{sendErr}</Note></View> : null}
      <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
        <Chips>{QUICK[user.role === 'provider' ? 'provider' : 'customer'].map((q) => <Chip key={q} label={q} onPress={() => send(t(q))} />)}</Chips>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Row style={{ padding: 10, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.card, alignItems: 'center' }}>
          <TextInput value={text} onChangeText={setText} placeholder={t('Write a message')} accessibilityLabel={t('Message')} testID="chat-input" onSubmitEditing={() => send()}
            placeholderTextColor="#8a9896" style={{ flex: 1, minHeight: 44, borderWidth: 1, borderColor: C.line, borderRadius: 22, paddingHorizontal: 14, backgroundColor: C.bg, fontFamily: F.ui, fontSize: 14.5 }} />
          <Btn label="Send" icon="send" onPress={() => send()} busy={busy} disabled={!text.trim()} style={{ paddingHorizontal: 14, borderRadius: 22 }} testID="chat-send" />
        </Row>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
