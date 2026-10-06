import React from 'react';
import { View } from 'react-native';
import { api } from '../api';
import { useLoad, useAction } from '../hooks';
import { Screen, Header, Card, T, Btn, Async, Empty, Row, IconBtn } from '../ui';

export default function Notifications() {
  const st = useLoad(() => api.get('/notifications'));
  const { run } = useAction();
  const readAll = () => run(async () => { await api.post('/notifications/read-all'); st.reload(); });
  const remove = (id) => run(async () => { await api.del('/notifications/' + id); st.reload(); });
  return (
    <>
      <Screen onRefresh={st.reload} refreshing={st.loading && st.data !== null}>
        <Header title="Notifications" />
        <Async state={st}>{(d) => (
          <>
            {d.items.length ? <Btn small kind="secondary" label={d.unread ? `Mark ${d.unread} as read` : 'All caught up'} disabled={!d.unread} onPress={readAll} style={{ flex: 0, alignSelf: 'flex-start' }} /> : null}
            {d.items.length ? d.items.map((n) => (
              <Card key={n.id} style={!n.read && { borderColor: '#e9a23b' }}>
                <Row style={{ alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T b={!n.read}>{n.text}</T>
                    <T small muted>{n.created_at}</T>
                  </View>
                  <IconBtn name="x" label="Dismiss notification" onPress={() => remove(n.id)} />
                </Row>
              </Card>
            )) : <Empty title="No notifications" text="Updates about your bookings will appear here." />}
          </>
        )}</Async>
      </Screen>
    </>
  );
}
