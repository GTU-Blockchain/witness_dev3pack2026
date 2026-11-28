import { useEffect, useRef } from 'react'
import { router } from 'expo-router'
import { useShareIntentContext } from 'expo-share-intent'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { addSharedRecording } from '@/features/record/recordings-store'

// Role 6: "Share → Seal with Witness".
// When media shared from another app (gallery, camera, voice recorder, files) arrives, this copies the
// file to the persistent folder, creates a "pending" recording and routes to /seal. So the same proven
// pipeline as a recording (hash → MWA → register_recording → Supabase register + transcript) runs
// unchanged, and the shared item also shows up in "My Recordings".
// With no connected wallet it goes to /wallet first; the recording stays pending and can be sealed later.
//
// Always mounted under ShareIntentProvider in _layout (renders null). It clears the intent with
// resetShareIntent as soon as it's consumed, so the old card on /dev doesn't fire.

/** On Android expo-share-intent can give a plain file path; normalize it to a file URI. */
function toFileUri(path: string): string {
  if (path.startsWith('file://') || path.startsWith('content://')) return path
  return `file://${path}`
}

export function ShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext()
  const { account } = useMobileWallet()
  // So the same intent isn't handled twice before state updates.
  const busy = useRef(false)

  useEffect(() => {
    if (!hasShareIntent) {
      busy.current = false
      return
    }
    if (busy.current) return
    busy.current = true

    const file = shareIntent.files?.[0]
    if (!file) {
      resetShareIntent()
      return
    }

    try {
      const item = addSharedRecording(
        toFileUri(file.path),
        file.fileName,
        file.mimeType || 'application/octet-stream',
        file.duration ?? 0,
      )
      resetShareIntent()
      router.push(account ? { pathname: '/seal', params: { id: item.id } } : { pathname: '/wallet' })
    } catch {
      // Couldn't read/copy the file: clear the intent so the user can try again.
      resetShareIntent()
    }
  }, [hasShareIntent, shareIntent, account, resetShareIntent])

  return null
}
