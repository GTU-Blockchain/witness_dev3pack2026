import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import 'react-native-reanimated'
import { ShareIntentProvider } from 'expo-share-intent'
import { AppProviders } from '@/components/app-providers'

export default function RootLayout() {
  return (
    <ShareIntentProvider>
      <AppProviders>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="wallet" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </AppProviders>
    </ShareIntentProvider>
  )
}
