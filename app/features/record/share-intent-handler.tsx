import { useEffect, useRef } from 'react'
import { router } from 'expo-router'
import { useShareIntentContext } from 'expo-share-intent'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { addSharedRecording } from '@/features/record/recordings-store'

// Rol 6 — "Paylaş → Witness ile mühürle".
// Başka uygulamadan (galeri, kamera, ses kaydedici, dosya) paylaşılan medya uygulamaya
// düşünce: dosyayı kalıcı klasöre kopyalayıp "pending" bir kayıt oluşturur ve /seal ekranına
// yönlendirir. Böylece normal kaydın gittiği kanıtlanmış hat (hash → MWA → register_recording
// → Supabase register + transkript) aynen çalışır; paylaşılan kayıt "My Recordings"te de görünür.
// Bağlı cüzdan yoksa önce /wallet'a gider; kayıt pending kalır, sonradan mühürlenebilir.
//
// _layout'ta ShareIntentProvider altında, her zaman mount olur (null render eder). Intent'i
// tüketir tüketmez resetShareIntent ile temizler, böylece /dev'deki eski kart tetiklenmez.

/** expo-share-intent Android'de düz bir dosya yolu verebilir; File URI'ye normalize et. */
function toFileUri(path: string): string {
  if (path.startsWith('file://') || path.startsWith('content://')) return path
  return `file://${path}`
}

export function ShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext()
  const { account } = useMobileWallet()
  // Aynı intent'i state güncellenene kadar iki kez işlememek için.
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
      // Dosya okunamadı/kopyalanamadı: intent'i temizle, kullanıcı tekrar deneyebilir.
      resetShareIntent()
    }
  }, [hasShareIntent, shareIntent, account, resetShareIntent])

  return null
}
