// C4 Describe the job (FR3, FR5, NFR2, NFR3). Step 1 of 2.
import React, { useState } from 'react';
import { View, Pressable, Image } from 'react-native';
import { pickPhoto } from '../../photos';
import { api } from '../../api';
import { useAction } from '../../hooks';
import { Screen, Header, Field, Chip, Chips, Btn, Row, T, Avatar, Note, Icon, Photo } from '../../ui';
import { C, TRADES, lkr } from '../../theme';

const CHIPS = {
  plumbing: ['Leaking tap', 'Blocked drain', 'Low water pressure'],
  electrical: ['Socket not working', 'Fan installation', 'Power keeps tripping'],
  cleaning: ['Apartment clean', 'Kitchen deep clean', 'Move-out clean']
};

export default function Describe({ navigation, route }) {
  const { flow } = route.params;
  const [job, setJob] = useState(flow.job || '');
  const [problem, setProblem] = useState(flow.problem || '');
  const [photos, setPhotos] = useState([]);
  const [address, setAddress] = useState(flow.address || '');
  const [phone, setPhone] = useState(flow.phone || '');
  const [errs, setErrs] = useState({});
  const [photoErr, setPhotoErr] = useState('');
  const [draftId, setDraftId] = useState(flow.draftId);
  const { busy, error, run } = useAction();

  const addPhoto = async () => {
    setPhotoErr('');
    try { const p = await pickPhoto(); if (p) setPhotos((o) => [...o, p].slice(0, 3)); }
    catch (e) { setPhotoErr(e.message); }
  };
  const next = async () => {
    const e = {};
    if (problem.trim().length < 5) e.problem = 'Describe the problem so the provider can prepare.';
    if (!address.trim()) e.address = 'Add the address for the visit.';
    if (phone.trim().length < 7) e.phone = 'Add a contact number the provider can call after accepting.';
    setErrs(e);
    if (Object.keys(e).length) return;
    const fields = { job: (job || problem).trim().slice(0, 60), problem: problem.trim(), photos: photos.length || flow.photos || 0, address: address.trim(), phone: phone.trim() };
    // The request is saved as a draft here (Create), and updated if the customer comes back and edits it (Update).
    const id = await run(async () => {
      if (draftId) { await api.patch('/bookings/' + draftId, fields); return draftId; }
      const b = await api.post('/bookings', { providerId: flow.providerId, ...fields });
      setDraftId(b.id);
      return b.id;
    });
    if (id) navigation.navigate('Time', { flow: { ...flow, ...fields, draftId: id } });
  };

  return (
    <Screen footer={<><Btn label="Next: pick a time" onPress={next} busy={busy} testID="to-time" />{error ? <Note tone="bad" icon="alert-triangle">{error}</Note> : null}</>}>
      <Header title="Describe the job" />
      <T small b muted>Step 1 of 2</T>
      <Row style={{ alignItems: 'center', gap: 10 }}>
        <Avatar name={flow.providerName} id={flow.providerId} size={38} />
        <View style={{ flex: 1 }}><T b>{flow.providerName}</T><T small muted>{TRADES[flow.trade].n}{flow.priceFrom ? `, from ${lkr(flow.priceFrom)}` : ''}</T></View>
      </Row>
      <View style={{ gap: 8 }}>
        <T b style={{ fontSize: 13 }}>What is the problem?</T>
        <Chips>{CHIPS[flow.trade].map((c) => <Chip key={c} label={c} on={job === c} onPress={() => { setJob(c); if (!problem.trim()) setProblem(c); setErrs({ ...errs, problem: undefined }); }} />)}</Chips>
        <Field value={problem} onChangeText={(v) => { setProblem(v); if (errs.problem) setErrs({ ...errs, problem: undefined }); }} multiline placeholder={`Tell ${flow.providerName.split(' ')[0]} what is happening and where`} error={errs.problem} testID="problem" />
      </View>
      <View style={{ gap: 8 }}>
        <T b style={{ fontSize: 13 }}>Photos <T small muted>(helps with a more accurate price)</T></T>
        <Row>
          {photos.map((p, i) => (
            <Pressable key={p.uri} accessibilityLabel={`Photo ${i + 1}, tap to remove`} onPress={() => setPhotos(photos.filter((x) => x !== p))} style={{ flex: 1 }}>
              <Image source={{ uri: p.uri }} style={{ height: 74, borderRadius: 8, backgroundColor: C.ph2 }} />
            </Pressable>
          ))}
          {photos.length < 3 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Add photo" testID="add-photo" onPress={addPhoto}
              style={{ flex: 1, minHeight: 74, borderRadius: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: C.line, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: C.card }}>
              <Icon name="plus" size={22} color={C.brand} /><T small b style={{ color: C.brand }}>Add photo</T>
            </Pressable>
          ) : null}
          {Array.from({ length: Math.max(0, 2 - photos.length) }).map((_, i) => <View key={i} style={{ flex: 1 }} />)}
        </Row>
        {photos.length ? <T small muted>Tap a photo to remove it.</T> : null}
        {photoErr ? <Note tone="warn" icon="alert-triangle">{photoErr}</Note> : null}
      </View>
      <Field label="Address" value={address} onChangeText={(v) => { setAddress(v); if (errs.address) setErrs({ ...errs, address: undefined }); }} error={errs.address} hint="The provider sees your full address only after accepting." testID="address" />
      <Field label="Contact number" value={phone} onChangeText={(v) => { setPhone(v); if (errs.phone) setErrs({ ...errs, phone: undefined }); }} keyboardType="phone-pad" error={errs.phone} hint="Kept private until the provider accepts." testID="phone" />
    </Screen>
  );
}
