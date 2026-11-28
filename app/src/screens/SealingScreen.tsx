import { MaterialCommunityIcons } from '@expo/vector-icons'
import Clipboard from '@react-native-clipboard/clipboard'
import { type ComponentProps, type ReactNode, useEffect, useState } from 'react'
import { ActivityIndicator, Animated, Easing, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppHeader, C, HashText, MONO, TabBar, formatDurationOrDash } from '@/src/components/witness-ui'

// UI only. The register_recording flow (hash, wallet approval, tx) drives this screen through props.
// If writing to chain fails the recording is never deleted — it stays "Pending" and can be retried.

export type SealStep = 'hashing' | 'awaiting-approval' | 'writing' | 'sealed'

export type SealingScreenProps = {
  /** Current step. When `error` is set, this is the step that failed. */
  step: SealStep
  error?: string
  /** SHA-256 of the m4a file (hex). Available from 'awaiting-approval' onwards. */
  hash?: string
  durationMillis?: number
  locationEnabled?: boolean
  transcript?: string
  /** Slot / block the record landed in. */
  slot?: number
  /** Solana Explorer URL of the transaction. */
  explorerUrl?: string
  /** Public link others can use to verify the recording. Falls back to explorerUrl. */
  verificationUrl?: string
  walletLabel?: string
  networkLabel?: string
  /** Shown instead of the approval card when the wallet can't pay for the seal (e.g. "Get devnet SOL"). */
  funding?: ReactNode
  onApprove?: () => void
  onRetry?: () => void
  onNewRecording?: () => void
  onOpenRecord?: () => void
  onOpenRecordings?: () => void
}

const STEPS: { key: SealStep; label: string; doneLabel: string }[] = [
  { key: 'hashing', label: 'Computing hash', doneLabel: 'Hash computed' },
  { key: 'awaiting-approval', label: 'Waiting for wallet approval', doneLabel: 'Approved in wallet' },
  { key: 'writing', label: 'Writing to chain', doneLabel: 'Written to chain' },
  { key: 'sealed', label: 'Sealed', doneLabel: 'Sealed' },
]

export function SealingScreen({
  step,
  error,
  hash,
  durationMillis = 0,
  locationEnabled = false,
  transcript,
  slot,
  explorerUrl,
  verificationUrl,
  walletLabel = 'Not connected',
  networkLabel = 'Solana Devnet',
  funding,
  onApprove,
  onRetry,
  onNewRecording,
  onOpenRecord,
  onOpenRecordings,
}: SealingScreenProps) {
  const sealed = step === 'sealed' && !error
  const busy = !error && (step === 'hashing' || step === 'writing')

  // Fingerprint scan → "Approved" → hand off to the wallet. Resets whenever the step changes.
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle')
  const [scanStep, setScanStep] = useState(step)
  if (scanStep !== step) {
    setScanStep(step)
    setScanPhase('idle')
  }

  function handleApprove() {
    if (scanPhase !== 'idle') return
    setScanPhase('scanning')
    setTimeout(() => setScanPhase('approved'), 1600)
    setTimeout(() => onApprove?.(), 2300)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <AppHeader walletLabel={walletLabel} />

        <View style={styles.content}>
          {sealed ? (
            <SealedView
              hash={hash}
              durationMillis={durationMillis}
              locationEnabled={locationEnabled}
              transcript={transcript}
              slot={slot}
            />
          ) : (
            <ProgressView
              step={step}
              error={error}
              hash={hash}
              walletLabel={walletLabel}
              networkLabel={networkLabel}
              scanPhase={scanPhase}
              funding={funding}
            />
          )}
        </View>

        <View style={styles.actions}>
          {sealed ? (
            <SealedActions
              hash={hash}
              explorerUrl={explorerUrl}
              verificationUrl={verificationUrl ?? explorerUrl}
              onNewRecording={onNewRecording}
            />
          ) : error ? (
            <>
              <PrimaryButton icon="refresh" label="Try Again" onPress={onRetry} />
              <SecondaryButton icon="folder-star-outline" label="Keep as Pending" onPress={onOpenRecordings} />
            </>
          ) : step === 'awaiting-approval' && funding ? (
            <PrimaryButton icon="fingerprint" label="Get devnet SOL first" disabled />
          ) : step === 'awaiting-approval' ? (
            <PrimaryButton
              icon={scanPhase === 'approved' ? 'check-circle-outline' : 'fingerprint'}
              label={scanPhase === 'idle' ? 'Approve in Wallet' : scanPhase === 'scanning' ? 'Scanning...' : 'Approved'}
              onPress={handleApprove}
              disabled={scanPhase !== 'idle'}
              dim={false}
            />
          ) : (
            <PrimaryButton
              icon="progress-clock"
              label={step === 'hashing' ? 'Computing hash...' : 'Writing to chain...'}
              disabled
              loading={busy}
            />
          )}
        </View>

        <TabBar active="record" onRecord={onOpenRecord} onRecordings={onOpenRecordings} disabled={busy} />
      </View>
    </SafeAreaView>
  )
}

export default SealingScreen

/* ---------- In progress / error ---------- */

function ProgressView({
  step,
  error,
  hash,
  walletLabel,
  networkLabel,
  scanPhase,
  funding,
}: {
  step: SealStep
  error?: string
  hash?: string
  walletLabel: string
  networkLabel: string
  scanPhase: ScanPhase
  funding?: ReactNode
}) {
  const current = STEPS.findIndex((s) => s.key === step)

  return (
    <>
      {/* Hash card */}
      <View style={[styles.card, styles.hashCard]}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>SHA-256 DIGEST</Text>
          {hash ? (
            <Text style={styles.hashShort} numberOfLines={1}>
              <Text style={styles.hashHead}>{hash.slice(0, 8)}</Text>
              {`…${hash.slice(-8)}`}
            </Text>
          ) : (
            <Text style={styles.mutedMono}>computing...</Text>
          )}
        </View>
        {hash ? <Pill label="COMPUTED" tone="green" /> : <ActivityIndicator size="small" color={C.emerald} />}
      </View>

      {/* Steps timeline */}
      <View>
        {STEPS.map((st, i) => {
          const state: StepState = i < current ? 'done' : i === current ? (error ? 'failed' : 'active') : 'todo'
          const next: StepState | null =
            i === STEPS.length - 1
              ? null
              : i + 1 < current
                ? 'done'
                : i + 1 === current
                  ? error
                    ? 'failed'
                    : 'active'
                  : 'todo'
          return (
            <View key={st.key}>
              <View
                style={[
                  styles.stepRow,
                  state === 'done' && styles.stepRowDone,
                  state === 'active' && styles.stepRowActive,
                  state === 'failed' && styles.stepRowFailed,
                ]}
              >
                <StepIcon state={state} isLast={st.key === 'sealed'} />
                <Text
                  style={[
                    styles.stepText,
                    state === 'done' && styles.stepTextDone,
                    state === 'active' && styles.stepTextActive,
                    state === 'failed' && styles.stepTextFailed,
                  ]}
                  numberOfLines={1}
                >
                  {i + 1}. {state === 'done' ? st.doneLabel : st.label}
                </Text>
                {state === 'active' ? (
                  <MaterialCommunityIcons name="dots-horizontal" size={22} color={C.textSoft} />
                ) : null}
              </View>
              {next ? <StepConnector from={state} to={next} /> : null}
            </View>
          )
        })}
      </View>

      {error ? (
        /* Error + pending notice */
        <View style={[styles.card, styles.errorCard]}>
          <View style={styles.cardRow}>
            <Text style={[styles.errorTitle, styles.flex]}>Sealing failed</Text>
            <Pill label="PENDING" tone="amber" />
          </View>
          <Text style={styles.errorText} numberOfLines={3}>
            {error}
          </Text>
          {funding ? null : (
            <Text style={styles.mutedText}>
              Your recording is safe on this device and stays Pending until it is sealed. Nothing was deleted.
            </Text>
          )}
        </View>
      ) : null}

      {funding && (error || step === 'awaiting-approval') ? (
        funding
      ) : !error && step === 'awaiting-approval' ? (
        /* Wallet approval card */
        <View style={[styles.card, styles.approvalCard]}>
          <View style={styles.halo}>
            <FingerprintScanner phase={scanPhase} />
          </View>
          <Text style={[styles.approvalTitle, scanPhase === 'approved' && styles.approvalTitleDone]}>
            {scanPhase === 'idle'
              ? 'Wallet Approval'
              : scanPhase === 'scanning'
                ? 'Scanning fingerprint...'
                : 'Approved'}
          </Text>
          <Text style={styles.approvalSub}>
            Wallet: {walletLabel} • {networkLabel}
          </Text>
        </View>
      ) : null}
    </>
  )
}

type StepState = 'done' | 'active' | 'failed' | 'todo'

function StepIcon({ state, isLast }: { state: StepState; isLast: boolean }) {
  return (
    <View style={styles.stepIcon}>
      {state === 'done' ? (
        <MaterialCommunityIcons name="check-circle-outline" size={24} color={C.emerald} />
      ) : state === 'active' ? (
        <ActivityIndicator size="small" color={C.textSoft} />
      ) : state === 'failed' ? (
        <MaterialCommunityIcons name="alert-circle-outline" size={24} color={C.red} />
      ) : (
        <MaterialCommunityIcons name={isLast ? 'lock-outline' : 'circle-outline'} size={22} color={C.muted} />
      )}
    </View>
  )
}

/** Vertical line between two step icons: green once done, dotted for steps still ahead. */
function StepConnector({ from, to }: { from: StepState; to: StepState }) {
  if (from === 'todo' || to === 'todo') {
    return (
      <View style={styles.connector}>
        {[0, 1, 2].map((k) => (
          <View key={k} style={styles.connectorDot} />
        ))}
      </View>
    )
  }
  return (
    <View style={styles.connector}>
      <View style={[styles.connectorLine, from === 'done' && styles.connectorLineDone]} />
    </View>
  )
}

/* ---------- Sealed ---------- */

function SealedView({
  hash,
  durationMillis,
  locationEnabled,
  transcript,
  slot,
}: {
  hash?: string
  durationMillis: number
  locationEnabled: boolean
  transcript?: string
  slot?: number
}) {
  return (
    <>
      <View style={styles.successBanner}>
        <View style={styles.successIcon}>
          <MaterialCommunityIcons name="check-decagram-outline" size={28} color={C.onEmerald} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.successTitle}>Evidence Sealed On-Chain</Text>
          <Text style={styles.successSub}>
            {slot !== undefined ? `Slot #${slot.toLocaleString('en-US')} • ` : ''}Immutable
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.eyebrow}>LOCATION</Text>
          <Text style={styles.valueMono}>{locationEnabled ? 'Location not recorded' : 'Location Hidden'}</Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.eyebrow}>DURATION</Text>
          <Text style={styles.valueMono}>{formatDurationOrDash(durationMillis)}</Text>
        </View>
        <Text style={[styles.eyebrow, styles.spaced]}>SHA-256 EVIDENCE DIGEST</Text>
        {hash ? <HashText hash={hash} style={styles.hashSmall} /> : null}
      </View>

      {transcript ? (
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.eyebrow}>ELEVENLABS AI TRANSCRIPT</Text>
            <Pill label="NOT ON CHAIN" tone="green" />
          </View>
          <Text style={styles.bodyText} numberOfLines={3}>
            &quot;{transcript}&quot;
          </Text>
        </View>
      ) : null}
    </>
  )
}

function SealedActions({
  hash,
  explorerUrl,
  verificationUrl,
  onNewRecording,
}: {
  hash?: string
  explorerUrl?: string
  verificationUrl?: string
  onNewRecording?: () => void
}) {
  const [copied, setCopied] = useState(false)

  function copyLink() {
    if (!verificationUrl) {
      return
    }
    Clipboard.setString(verificationUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function share() {
    const lines = ['File sealed on Solana with Witness.']
    if (hash) lines.push(`SHA-256: ${hash}`)
    if (verificationUrl) lines.push(`Verify: ${verificationUrl}`)
    void Share.share({ message: lines.join('\n') })
  }

  return (
    <>
      <PrimaryButton
        icon={copied ? 'check' : 'content-copy'}
        label={copied ? 'Link Copied' : 'Copy Verification Link'}
        onPress={copyLink}
        disabled={!verificationUrl}
      />
      <View style={styles.actionRow}>
        <View style={styles.flex}>
          <SecondaryButton icon="share-variant" label="Share" onPress={share} />
        </View>
        <View style={styles.flex}>
          <SecondaryButton
            icon="open-in-new"
            label="Explorer"
            onPress={explorerUrl ? () => void Linking.openURL(explorerUrl) : undefined}
            disabled={!explorerUrl}
          />
        </View>
      </View>
      <SecondaryButton icon="plus-circle-outline" label="New Evidence Recording" onPress={onNewRecording} />
    </>
  )
}

/* ---------- Fingerprint scanner ---------- */

type ScanPhase = 'idle' | 'scanning' | 'approved'

const RING = 88

function FingerprintScanner({ phase }: { phase: ScanPhase }) {
  const [scan] = useState(() => new Animated.Value(0))
  const [pulse] = useState(() => new Animated.Value(0))
  const [pop] = useState(() => new Animated.Value(0))

  useEffect(() => {
    if (phase === 'idle') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      )
      loop.start()
      return () => loop.stop()
    }
    if (phase === 'scanning') {
      scan.setValue(0)
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scan, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scan, {
            toValue: 0,
            duration: 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      )
      loop.start()
      return () => loop.stop()
    }
    pop.setValue(0)
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start()
  }, [phase, scan, pulse, pop])

  const approved = phase === 'approved'

  return (
    <Animated.View
      style={[
        styles.fingerprintRing,
        approved && styles.fingerprintRingDone,
        phase === 'idle' && {
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
        },
        approved && { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] },
      ]}
    >
      <MaterialCommunityIcons
        name={approved ? 'check-bold' : 'fingerprint'}
        size={approved ? 44 : 48}
        color={approved ? C.onEmerald : C.emerald}
      />
      {phase === 'scanning' ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.scanLine,
            { transform: [{ translateY: scan.interpolate({ inputRange: [0, 1], outputRange: [-28, 28] }) }] },
          ]}
        />
      ) : null}
    </Animated.View>
  )
}

/* ---------- Bits ---------- */

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

function PrimaryButton({
  icon,
  label,
  onPress,
  disabled,
  loading,
  dim = true,
}: {
  icon: IconName
  label: string
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
  /** Fade the button when disabled. */
  dim?: boolean
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, disabled && dim && styles.disabled, pressed && styles.pressed]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={C.onEmerald} />
      ) : (
        <MaterialCommunityIcons name={icon} size={22} color={C.onEmerald} />
      )}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  )
}

function SecondaryButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName
  label: string
  onPress?: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryButton, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={C.text} />
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  )
}

function Pill({ label, tone }: { label: string; tone: 'green' | 'amber' }) {
  return (
    <View style={[styles.pill, tone === 'amber' ? styles.pillAmber : styles.pillGreen]}>
      <Text style={[styles.pillText, { color: tone === 'amber' ? C.amber : C.emerald }]}>{label}</Text>
    </View>
  )
}

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
    gap: 10,
  },
  content: {
    flex: 1,
    gap: 10,
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
  errorText: {
    color: C.text,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 14,
    gap: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  eyebrow: {
    color: C.muted,
    fontSize: 12,
    fontFamily: MONO,
    letterSpacing: 1.4,
  },
  spaced: {
    marginTop: 6,
  },
  valueMono: {
    color: C.text,
    fontSize: 14,
    fontFamily: MONO,
  },
  mutedMono: {
    color: C.muted,
    fontSize: 14,
    fontFamily: MONO,
  },
  bodyText: {
    color: C.text,
    fontSize: 15,
    lineHeight: 22,
  },
  mutedText: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillGreen: {
    backgroundColor: C.emeraldSoft,
  },
  pillAmber: {
    backgroundColor: C.amberSoft,
  },
  pillText: {
    fontSize: 12,
    fontFamily: MONO,
    letterSpacing: 1,
  },
  steps: {
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    height: 44,
  },
  stepRowDone: {
    borderColor: 'rgba(52, 211, 153, 0.7)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    shadowColor: C.emerald,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  stepRowActive: {
    backgroundColor: C.surfaceRaised,
    borderColor: '#2A3A52',
  },
  stepIcon: {
    width: 26,
    alignItems: 'center',
  },
  connector: {
    height: 10,
    width: 26,
    marginLeft: 15,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  connectorLine: {
    width: 2,
    height: '100%',
    backgroundColor: C.border,
  },
  connectorLineDone: {
    backgroundColor: C.emerald,
  },
  connectorDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: C.muted,
  },
  hashCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  hashShort: {
    color: C.text,
    fontSize: 15,
    fontFamily: MONO,
    marginTop: 4,
  },
  hashHead: {
    color: C.emerald,
    fontWeight: '700',
  },
  hashSmall: {
    fontSize: 13,
    lineHeight: 19,
  },
  halo: {
    width: RING + 28,
    height: RING + 28,
    borderRadius: (RING + 28) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepRowFailed: {
    backgroundColor: C.redSoft,
    borderColor: 'rgba(229, 83, 75, 0.5)',
  },
  stepText: {
    color: C.muted,
    fontSize: 15,
    flex: 1,
    opacity: 0.8,
  },
  stepTextDone: {
    color: C.emerald,
    opacity: 1,
  },
  stepTextActive: {
    color: C.text,
    fontWeight: '700',
    opacity: 1,
  },
  stepTextFailed: {
    color: C.red,
    fontWeight: '700',
    opacity: 1,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: 'rgba(229, 83, 75, 0.4)',
  },
  errorTitle: {
    color: C.red,
    fontSize: 16,
    fontWeight: '700',
  },
  approvalCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  fingerprintRing: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    overflow: 'hidden',
    backgroundColor: C.emeraldSoft,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fingerprintRingDone: {
    backgroundColor: C.sealGreen,
    borderColor: C.sealGreen,
  },
  scanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: RING / 2 - 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.emerald,
    shadowColor: C.emerald,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  approvalTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
  },
  approvalTitleDone: {
    color: C.emerald,
  },
  approvalSub: {
    color: C.textSoft,
    fontSize: 13,
    fontFamily: MONO,
    textAlign: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    borderRadius: 20,
    padding: 14,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.sealGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: C.emerald,
    fontSize: 17,
    fontWeight: '700',
  },
  successSub: {
    color: C.textSoft,
    fontSize: 13,
    fontFamily: MONO,
    marginTop: 4,
  },
  actions: {
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: C.sealGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: {
    color: C.onEmerald,
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: C.surfaceRaised,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButtonText: {
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
})
