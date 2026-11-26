import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useState } from 'react'
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppHeader } from '@/components/app-header'
import { C, MONO } from '@/constants/theme'
import { TabBar, formatDuration } from '@/src/components/witness-ui'

// UI only. Recording, playback, permissions and file handling live in the audio module
// and are wired in through props.

const METER_BARS = 24

export type RecordStatus = 'idle' | 'recording' | 'captured' | 'permission-denied'

export type RecordScreenProps = {
  status?: RecordStatus
  /** Elapsed recording time, or total length once captured. */
  durationMillis?: number
  /** Current input level, 0..1. */
  level?: number
  /** Disables the record button while the recorder is starting/stopping. */
  busy?: boolean
  isPlaying?: boolean
  /** Playback position once captured. */
  playbackMillis?: number
  /** Running SHA-256 of the audio stream while recording (hex). */
  streamHash?: string
  /** Live transcript text while recording. */
  transcript?: string
  transcriptLabel?: string
  /** Small tag next to the transcript label, e.g. model/language. */
  transcriptTag?: string
  deviceLabel?: string
  networkLabel?: string
  walletLabel?: string
  onStartRecording?: () => void
  onStopRecording?: () => void
  onTogglePlayback?: () => void
  /** Hand the captured file to sealing untouched — never re-encode or trim it. */
  onSeal?: (options: { locationEnabled: boolean }) => void
  /** Called after the user confirms deletion. */
  onDelete?: () => void
  onOpenSettings?: () => void
  onOpenRecordings?: () => void
}

export function RecordScreen({
  status = 'idle',
  durationMillis = 0,
  level = 0,
  busy = false,
  isPlaying = false,
  playbackMillis = 0,
  streamHash,
  transcript,
  transcriptLabel = 'ELEVENLABS LIVE TRANSCRIPT',
  transcriptTag,
  deviceLabel = 'Seeker Genesis',
  networkLabel = 'Solana Devnet',
  walletLabel = 'Not connected',
  onStartRecording,
  onStopRecording,
  onTogglePlayback,
  onSeal,
  onDelete,
  onOpenSettings = () => void Linking.openSettings(),
  onOpenRecordings,
}: RecordScreenProps) {
  const [locationEnabled, setLocationEnabled] = useState(false)
  const [levels, setLevels] = useState<number[]>(() => Array(METER_BARS).fill(0))
  const [lastSampleAt, setLastSampleAt] = useState(-1)

  const isRecording = status === 'recording'
  const captured = status === 'captured'

  // Rolling meter history: one sample per duration tick while recording.
  if (isRecording && durationMillis !== lastSampleAt) {
    setLastSampleAt(durationMillis)
    setLevels((prev) => [...prev.slice(1), Math.min(1, Math.max(0, level))])
  }
  if (status === 'idle' && lastSampleAt !== -1) {
    setLastSampleAt(-1)
    setLevels(Array(METER_BARS).fill(0))
  }

  function handleDelete() {
    Alert.alert('Delete recording?', 'This recording has not been sealed and will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ])
  }

  const statusHeadline = isRecording
    ? 'RECORDING IN PROGRESS'
    : captured
      ? 'RECORDING CAPTURED'
      : 'FORENSIC AUDIO READY'
  const timerMillis = captured && (isPlaying || playbackMillis > 0) ? playbackMillis : durationMillis

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <AppHeader walletLabel={walletLabel} />

        {isRecording ? (
          /* Live recording status */
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.recBadge}>
                <View style={styles.recDot} />
                <Text style={styles.recBadgeText}>RECORDING</Text>
              </View>
              <Text style={styles.cardValueSecondary}>{locationEnabled ? 'Location Stamped' : 'Location Hidden'}</Text>
            </View>
            <Text style={styles.hashText} numberOfLines={1}>
              STREAM SHA-256: {streamHash ? `${streamHash.slice(0, 16)}...` : 'computing...'}
            </Text>
          </View>
        ) : (
          /* Hardware status */
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.eyebrow}>HARDWARE STATUS</Text>
              <View style={styles.teeBadge}>
                <Text style={styles.teeBadgeText}>TEE SECURE</Text>
              </View>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardValuePrimary}>{deviceLabel}</Text>
              <Text style={styles.cardValueSecondary}>{networkLabel}</Text>
            </View>
          </View>
        )}

        {status === 'permission-denied' ? (
          <View style={styles.centerStage}>
            <View style={styles.permissionCard}>
              <MaterialCommunityIcons name="microphone-off" size={28} color={C.red} />
              <Text style={styles.eyebrow}>MICROPHONE ACCESS REQUIRED</Text>
              <Text style={styles.permissionText}>
                Witness needs microphone access to capture audio. Enable it in your device settings.
              </Text>
              <Pressable
                onPress={onOpenSettings}
                style={({ pressed }) => [styles.primaryButton, styles.settingsButton, pressed && styles.pressed]}
              >
                <Text style={styles.primaryButtonText}>Open Settings</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {isRecording ? (
              /* Live recording stage */
              <View style={styles.recordingStage}>
                <View style={styles.timerBlock}>
                  <Text style={styles.timerText}>{formatDuration(timerMillis)}</Text>
                  <Text style={styles.statusEyebrow}>LIVE ACOUSTIC SPECTRUM</Text>
                </View>

                <View style={styles.spectrumCard}>
                  {levels.map((level, i) => (
                    <View key={i} style={[styles.spectrumBar, { height: 12 + level * 68 }]} />
                  ))}
                </View>

                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    <Text style={styles.eyebrow}>{transcriptLabel}</Text>
                    {transcriptTag ? <Text style={styles.transcriptTag}>{transcriptTag}</Text> : null}
                  </View>
                  <Text style={[styles.transcriptText, !transcript && styles.transcriptPlaceholder]} numberOfLines={3}>
                    {transcript ? `"${transcript}"` : 'Listening...'}
                  </Text>
                </View>
              </View>
            ) : (
              /* Timer */
              <View style={styles.centerStage}>
                <Text style={styles.statusEyebrow}>{statusHeadline}</Text>
                <Text style={styles.timerText}>{formatDuration(timerMillis)}</Text>
                <Text style={styles.formatSubtitle}>44.1 kHz AAC • SHA-256 Real-Time</Text>

                {captured ? (
                  <Pressable
                    onPress={onTogglePlayback}
                    style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
                  >
                    <MaterialCommunityIcons name={isPlaying ? 'pause' : 'play'} size={20} color={C.text} />
                    <Text style={styles.playButtonText}>{isPlaying ? 'Pause' : 'Play back'}</Text>
                  </Pressable>
                ) : null}
              </View>
            )}

            {/* Controls */}
            <View style={styles.bottomControls}>
              {isRecording ? null : (
                <Pressable
                  disabled={isRecording || captured}
                  onPress={() => setLocationEnabled((prev) => !prev)}
                  style={({ pressed }) => [
                    styles.locationCard,
                    (isRecording || captured) && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={locationEnabled ? 'map-marker-check-outline' : 'map-marker-outline'}
                    size={24}
                    color={C.emerald}
                  />
                  <View style={styles.locationTextGroup}>
                    <Text style={styles.eyebrow}>GPS LOCATION STAMP</Text>
                    <Text style={styles.locationTitle}>
                      {locationEnabled ? 'Location Stamp Enabled' : 'Location Stamp Disabled'}
                    </Text>
                  </View>
                  <Text style={[styles.locationStateText, locationEnabled && styles.locationStateTextActive]}>
                    {locationEnabled ? 'ON' : 'OFF'}
                  </Text>
                </Pressable>
              )}

              {captured ? (
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={handleDelete}
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={C.textSoft} />
                    <Text style={styles.secondaryButtonText}>Delete</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onSeal?.({ locationEnabled })}
                    style={({ pressed }) => [styles.primaryButton, styles.sealButton, pressed && styles.pressed]}
                  >
                    <MaterialCommunityIcons name="seal-variant" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Seal</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  disabled={busy}
                  onPress={isRecording ? onStopRecording : onStartRecording}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    isRecording && styles.stopButton,
                    busy && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {isRecording ? (
                    <MaterialCommunityIcons name="stop-circle-outline" size={24} color={C.onEmerald} />
                  ) : (
                    <View style={styles.recordIcon} />
                  )}
                  <Text style={[styles.primaryButtonText, isRecording && styles.stopButtonText]}>
                    {isRecording ? 'Stop & Seal' : 'Start Recording'}
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}

        <TabBar active="record" onRecordings={onOpenRecordings} disabled={isRecording} />
      </View>
    </SafeAreaView>
  )
}

export default RecordScreen

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 16,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: C.muted,
    fontSize: 12,
    fontFamily: MONO,
    letterSpacing: 1.4,
  },
  teeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  teeBadgeText: {
    color: C.emerald,
    fontSize: 12,
    fontFamily: MONO,
    letterSpacing: 1,
  },
  cardValuePrimary: {
    color: C.text,
    fontSize: 15,
    fontWeight: '500',
  },
  cardValueSecondary: {
    color: C.textSoft,
    fontSize: 14,
    fontFamily: MONO,
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  statusEyebrow: {
    color: C.muted,
    fontSize: 13,
    fontFamily: MONO,
    letterSpacing: 2,
  },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(229, 83, 75, 0.16)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.red,
  },
  recBadgeText: {
    color: C.red,
    fontSize: 12,
    fontFamily: MONO,
    letterSpacing: 1,
  },
  hashText: {
    color: C.text,
    fontSize: 13,
    fontFamily: MONO,
  },
  recordingStage: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  timerBlock: {
    alignItems: 'center',
    gap: 8,
  },
  spectrumCard: {
    height: 120,
    backgroundColor: C.surface,
    borderRadius: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
  },
  spectrumBar: {
    flex: 1,
    maxWidth: 12,
    borderRadius: 6,
    backgroundColor: C.red,
  },
  transcriptTag: {
    color: C.emerald,
    fontSize: 12,
    fontFamily: MONO,
  },
  transcriptText: {
    color: C.text,
    fontSize: 15,
    lineHeight: 22,
  },
  transcriptPlaceholder: {
    color: C.muted,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 60,
    fontWeight: '600',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
    fontFamily: MONO,
  },
  formatSubtitle: {
    color: C.textSoft,
    fontSize: 13,
    fontFamily: MONO,
  },
  playButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  playButtonText: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
  },
  permissionCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 20,
    gap: 14,
    alignItems: 'center',
  },
  permissionText: {
    color: C.textSoft,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  bottomControls: {
    gap: 14,
  },
  locationCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  locationTextGroup: {
    gap: 4,
    flex: 1,
  },
  locationTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
  },
  locationStateText: {
    color: C.muted,
    fontSize: 13,
    fontFamily: MONO,
    letterSpacing: 1,
  },
  locationStateTextActive: {
    color: C.emerald,
  },
  primaryButton: {
    height: 60,
    borderRadius: 30,
    backgroundColor: C.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  settingsButton: {
    alignSelf: 'stretch',
    marginTop: 4,
  },
  stopButton: {
    backgroundColor: C.sealGreen,
  },
  stopButtonText: {
    color: C.onEmerald,
  },
  recordIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: C.textSoft,
    fontSize: 17,
    fontWeight: '600',
  },
  sealButton: {
    flex: 2,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
})
