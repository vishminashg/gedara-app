import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
import { SessionProvider } from './src/session';
import { LangProvider } from './src/i18n';
import Root from './src/navigation';
import { Loading } from './src/ui';

export default function App() {
  const [loaded, fontError] = useFonts({ Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, BricolageGrotesque_700Bold });
  // If the fonts cannot load we still start the app with system fonts rather than a blank screen.
  if (!loaded && !fontError) return <Loading />;
  return (
    <SafeAreaProvider>
      <LangProvider>
        <SessionProvider>
          <StatusBar style="auto" />
          <Root />
        </SessionProvider>
      </LangProvider>
    </SafeAreaProvider>
  );
}
