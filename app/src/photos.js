import * as ImagePicker from 'expo-image-picker';

/** Lets the user pick one photo. Returns { uri, name } or null; throws a readable message when permission is refused. */
export async function pickPhoto() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted && perm.canAskAgain === false) throw new Error('Photo access is switched off. Allow it in your phone settings to add photos.');
  if (!perm.granted && perm.status === 'denied') throw new Error('We need permission to open your photos.');
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, name: a.fileName || a.uri.split('/').pop() || 'photo.jpg' };
}
