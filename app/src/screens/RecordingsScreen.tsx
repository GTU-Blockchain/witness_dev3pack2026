import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useState } from 'react'
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppHeader, C, HashText, MONO, TabBar, formatDuration } from '@/src/components/witness-ui'

// UI only. The recording store (local files + on-chain status) feeds this list through props.

export type RecordingItem = {
  id: string
  /** Unix ms. */
  recordedAt: number
  durationMillis: number
  /** 'pending' = saved locally but not sealed yet (or sealing failed). Never deleted automatically. */
  status: 'sealed' | 'pending'
  hash?: string
  transcript?: string
  locationEnabled?: boolean
  explorerUrl?: string
}

export type RecordingsScreenProps = {
  recordings: RecordingItem[]
  walletLabel?: string
  onSeal?: (id: string) => void
  onOpenRecord?: () => void
}

function formatDate(ms: number): string {
  const d = new Date(ms)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${date} • ${time}`
}

export function RecordingsScreen({
  recordings,
  walletLabel = 'Not connected',
  onSeal,
  onOpenRecord,
}: RecordingsScreenProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const pendingCount = recordings.filter((r) => r.status === 'pending').length

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <AppHeader walletLabel={walletLabel} />

        <View style={styles.titleRow}>
          <Text style={styles.title}>My Recordings</Text>
          <Text style={styles.count}>
            {recordings.length} total{pendingCount ? ` • ${pendingCount} pending` : ''}
          </Text>
        </View>

        <FlatList
          data={recordings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="folder-open-outline" size={40} color={C.muted} />
              <Text style={styles.emptyText}>No recordings yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <RecordingCard
              item={item}
              open={openId === item.id}
              onToggle={() => setOpenId((cur) => (cur === item.id ? null : item.id))}
              onSeal={onSeal ? () => onSeal(item.id) : undefined}
            />
          )}
        />

        <TabBar active="recordings" onRecord={onOpenRecord} />
      </View>
    </SafeAreaView>
  )
}

export default RecordingsScreen

function RecordingCard({
  item,
  open,
  onToggle,
  onSeal,
}: {
  item: RecordingItem
  open: boolean
  onToggle: () => void
  onSeal?: () => void
}) {
  const sealed = item.status === 'sealed'

  return (
    <View style={[styles.card, open && styles.cardOpen]}>
      <Pressable onPress={onToggle} style={({ pressed }) => [styles.cardHead, pressed && styles.pressed]}>
        <View style={[styles.iconBox, sealed ? styles.iconBoxSealed : styles.iconBoxPending]}>
          <MaterialCommunityIcons
            name={sealed ? 'check-decagram-outline' : 'clock-outline'}
            size={22}
            color={sealed ? C.emerald : C.amber}
          />
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{formatDate(item.recordedAt)}</Text>
          <Text style={styles.cardSub}>
            {formatDuration(item.durationMillis)}
            {item.hash ? ` • ${item.hash.slice(0, 8)}` : ''}
          </Text>
        </View>
        <View style={[styles.pill, sealed ? styles.pillGreen : styles.pillAmber]}>
          <Text style={[styles.pillText, { color: sealed ? C.emerald : C.amber }]}>
            {sealed ? 'SEALED' : 'PENDING'}
          </Text>
        </View>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={C.muted} />
      </Pressable>

      {open ? (
        <View style={styles.details}>
          <View style={styles.row}>
            <Text style={styles.eyebrow}>LOCATION</Text>
            <Text style={styles.valueMono}>{item.locationEnabled ? 'Location not recorded' : 'Location Hidden'}</Text>
          </View>

          {item.hash ? (
            <View style={styles.block}>
              <Text style={styles.eyebrow}>SHA-256</Text>
              <HashText hash={item.hash} style={styles.hashSmall} />
            </View>
          ) : null}

          <View style={styles.block}>
            <Text style={styles.eyebrow}>TRANSCRIPT</Text>
            <Text style={[styles.transcript, !item.transcript && styles.transcriptEmpty]}>
              {item.transcript ? `"${item.transcript}"` : 'No transcript available.'}
            </Text>
          </View>

          {sealed ? (
            item.explorerUrl ? (
              <Pressable
                onPress={() => void Linking.openURL(item.explorerUrl!)}
                style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
              >
                <MaterialCommunityIcons name="open-in-new" size={18} color={C.emerald} />
                <Text style={styles.linkText}>View on Solana Explorer</Text>
              </Pressable>
            ) : null
          ) : (
            <Pressable
              disabled={!onSeal}
              onPress={onSeal}
              style={({ pressed }) => [styles.sealButton, !onSeal && styles.disabled, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons name="seal-variant" size={20} color={C.onEmerald} />
              <Text style={styles.sealButtonText}>Seal Now</Text>
            </Pressable>
          )}
        </View>
      ) : null}
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
    gap: 16,
  },
  flex: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    color: C.text,
    fontSize: 20,
    fontWeight: '700',
  },
  count: {
    color: C.muted,
    fontSize: 12,
    fontFamily: MONO,
  },
  list: {
    gap: 12,
    paddingBottom: 4,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 60,
  },
  emptyText: {
    color: C.muted,
    fontSize: 15,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardOpen: {
    borderColor: C.border,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxSealed: {
    backgroundColor: C.emeraldSoft,
  },
  iconBoxPending: {
    backgroundColor: C.amberSoft,
  },
  cardTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
  },
  cardSub: {
    color: C.muted,
    fontSize: 12,
    fontFamily: MONO,
    marginTop: 3,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillGreen: {
    backgroundColor: C.emeraldSoft,
  },
  pillAmber: {
    backgroundColor: C.amberSoft,
  },
  pillText: {
    fontSize: 11,
    fontFamily: MONO,
    letterSpacing: 1,
  },
  details: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  block: {
    gap: 6,
  },
  eyebrow: {
    color: C.muted,
    fontSize: 12,
    fontFamily: MONO,
    letterSpacing: 1.4,
  },
  valueMono: {
    color: C.text,
    fontSize: 13,
    fontFamily: MONO,
  },
  hashSmall: {
    fontSize: 12,
    lineHeight: 18,
  },
  transcript: {
    color: C.text,
    fontSize: 15,
    lineHeight: 22,
  },
  transcriptEmpty: {
    color: C.muted,
    fontStyle: 'italic',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  linkText: {
    color: C.emerald,
    fontSize: 14,
    fontWeight: '600',
  },
  sealButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: C.sealGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sealButtonText: {
    color: C.onEmerald,
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
