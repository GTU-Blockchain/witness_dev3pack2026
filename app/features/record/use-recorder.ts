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
  isMeteringEnabled: true,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: { outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.MAX },
  web: { mimeType: 'audio/mp4', bitsPerSecond: 128000 },
}

// Metering dB cinsinden gelir (~-60 sessiz, 0 en yüksek); ekran 0..1 bekliyor.
function meteringToLevel(db: number | undefined): number {
  if (db === undefined) return 0
  return Math.min(1, Math.max(0, (db + 60) / 60))
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

  return {
    status,
    busy,
    uri,
    durationMillis: status === 'recording' ? recorderState.durationMillis : capturedMillis,
    level: status === 'recording' ? meteringToLevel(recorderState.metering) : 0,
    isPlaying: playerStatus.playing,
    playbackMillis: Math.round(playerStatus.currentTime * 1000),
    start,
    stop,
    togglePlayback,
    discard,
  }
}
