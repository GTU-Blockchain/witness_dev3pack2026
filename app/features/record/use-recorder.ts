import { useState } from 'react'
import {
  AudioQuality,
  IOSOutputFormat,
  RecordingOptions,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio'
import { File } from 'expo-file-system'
import type { RecordStatus } from '@/src/screens/RecordScreen'

// Ortak kural (docs/TEKNIK_DOKUMAN.md): m4a (AAC), mono, 44.1 kHz.
// Kaydedilen dosya sonradan asla yeniden kodlanmaz / kırpılmaz; mühürleme bu ham dosyayı hash'ler.
const RECORDING_OPTIONS: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 128000,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: { outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.MAX },
  web: { mimeType: 'audio/mp4', bitsPerSecond: 128000 },
}

// Kayıt sırasındaki dalga göstergesi için SÜS amaçlı seviye (0..1). Gerçek sese bağlı değil:
// birkaç farklı hızda dalga + tik başına değişen "gürültü" ile konuşmaya benzer, sürekli
// değişen bir desen üretir. Saf fonksiyon (aynı zamana aynı değer), render'da güvenle çağrılır.
// 0..1 arası sözde rastgele sayı; aynı girdiye hep aynı sonucu verir.
function pseudoRandom(n: number): number {
  return Math.abs(Math.sin(n * 12.9898 + 78.233) * 43758.5453) % 1
}

function decorativeLevel(millis: number): number {
  const t = millis / 1000
  const tick = Math.floor(millis / 100)

  // Konuşma gibi ~1.2-2 sn'lik "cümleler": her birinin kendi yüksekliği var,
  // bazıları fısıltı gibi alçak, bazıları bağırır gibi yüksek; arada kısa sessizlikler.
  const phrase = Math.floor(t / 1.5)
  const phraseLoudness = 0.25 + 0.75 * pseudoRandom(phrase)
  const isPause = pseudoRandom(phrase + 1000) < 0.18

  const noise = pseudoRandom(tick) // hece başına titreşim
  if (isPause) return 0.05 + 0.08 * noise

  const syllable = 0.7 + 0.3 * Math.sin(t * 7.3 + phrase) // cümle içindeki hızlı inip kalkma
  const raw = phraseLoudness * syllable * (0.4 + 0.9 * noise)
  return Math.min(1, Math.max(0.06, Math.pow(raw, 0.7))) // üs < 1: tepeler daha belirgin
}

/** Kayıt ekranının ses mantığı: izin, kaydet / durdur, dinle, sil. */
export function useRecorder() {
  const recorder = useAudioRecorder(RECORDING_OPTIONS)
  const recorderState = useAudioRecorderState(recorder, 100)

  const [status, setStatus] = useState<RecordStatus>('idle')
  const [busy, setBusy] = useState(false)
  const [uri, setUri] = useState<string | null>(null)
  const [capturedMillis, setCapturedMillis] = useState(0)

  const player = useAudioPlayer(uri)
  const playerStatus = useAudioPlayerStatus(player)

  async function start() {
    if (busy) return
    setBusy(true)
    try {
      const permission = await requestRecordingPermissionsAsync()
      if (!permission.granted) {
        setStatus('permission-denied')
        return
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      await recorder.prepareToRecordAsync()
      recorder.record()
      setStatus('recording')
    } finally {
      setBusy(false)
    }
  }

  async function stop() {
    if (busy) return
    setBusy(true)
    try {
      const millis = recorderState.durationMillis
      await recorder.stop()
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
      setCapturedMillis(millis)
      setUri(recorder.uri)
      setStatus('captured')
    } finally {
      setBusy(false)
    }
  }

  function togglePlayback() {
    if (playerStatus.playing) {
      player.pause()
      return
    }
    if (playerStatus.didJustFinish || playerStatus.currentTime >= playerStatus.duration) {
      void player.seekTo(0)
    }
    player.play()
  }

  function discard() {
    player.pause()
    if (uri) {
      try {
        new File(uri).delete()
      } catch {
        // Dosya zaten yoksa sorun değil.
      }
    }
    setUri(null)
    setCapturedMillis(0)
    setStatus('idle')
  }

  /** Kaydı mühürlemeye devreder: dosyayı SİLMEDEN ekranı başa döndürür. */
  function handOff(): { uri: string; durationMillis: number } | null {
    if (!uri) return null
    player.pause()
    const result = { uri, durationMillis: capturedMillis }
    setUri(null)
    setCapturedMillis(0)
    setStatus('idle')
    return result
  }

  return {
    status,
    busy,
    uri,
    durationMillis: status === 'recording' ? recorderState.durationMillis : capturedMillis,
    level: status === 'recording' ? decorativeLevel(recorderState.durationMillis) : 0,
    isPlaying: playerStatus.playing,
    playbackMillis: Math.round(playerStatus.currentTime * 1000),
    start,
    stop,
    togglePlayback,
    discard,
    handOff,
  }
}
