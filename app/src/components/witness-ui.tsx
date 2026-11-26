import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'

// Shared look for the Witness screens (Record, Sealing, Recordings).

export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })

export const C = {
  bg: '#0B0F17',
  surface: '#121926',
  surfaceRaised: '#182234',
  border: '#1E293B',
  text: '#F8FAFC',
  textSoft: '#CBD5E1',
  muted: '#94A3B8',
  emerald: '#34D399',
  emeraldSoft: 'rgba(16, 185, 129, 0.14)',
  sealGreen: '#52B788',
  onEmerald: '#0B1F14',
  red: '#E5534B',
  redSoft: 'rgba(229, 83, 75, 0.16)',
  amber: '#F5B544',
  amberSoft: 'rgba(245, 181, 68, 0.14)',
}

export function formatDuration(durationMillis: number): string {
  const totalTenths = Math.floor(Math.max(0, durationMillis) / 100)
  const tenths = totalTenths % 10
  const totalSeconds = Math.floor(totalTenths / 10)
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`
}

export function AppHeader({ walletLabel }: { walletLabel: string }) {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <MaterialCommunityIcons name="shield-check-outline" size={20} color={C.emerald} />
          </View>
          <Text style={styles.brandTitle}>Witness</Text>
        </View>
        <View style={styles.walletPill}>
          <View style={styles.emeraldDot} />
          <Text style={styles.walletText}>{walletLabel}</Text>
        </View>
      </View>
      <View style={styles.divider} />
    </View>
  )
}

export type TabKey = 'record' | 'recordings'

export function TabBar({
  active,
  onRecord,
  onRecordings,
  disabled = false,
}: {
  active: TabKey
  onRecord?: () => void
  onRecordings?: () => void
  /** Blocks switching tabs (e.g. while recording). */
  disabled?: boolean
}) {
  const tabs = [
    { key: 'record' as const, label: 'Record', icon: 'microphone-outline' as const, onPress: onRecord },
    { key: 'recordings' as const, label: 'My Recordings', icon: 'folder-star-outline' as const, onPress: onRecordings },
  ]
  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = tab.key === active
        return (
          <Pressable
            key={tab.key}
            disabled={disabled || !tab.onPress}
            onPress={tab.onPress}
            style={({ pressed }) => [styles.tab, isActive && styles.tabActive, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name={tab.icon} size={20} color={isActive ? C.text : C.muted} />
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Full hash in monospace with the first 8 characters highlighted. */
export function HashText({ hash, style }: { hash: string; style?: object }) {
  return (
    <Text style={[styles.hash, style]}>
      <Text style={styles.hashHead}>{hash.slice(0, 8)}</Text>
      {hash.slice(8)}
    </Text>
  )
}

const styles = StyleSheet.create({
  headerWrap: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    color: C.text,
    fontSize: 22,
    fontWeight: '600',
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  emeraldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.emerald,
  },
  walletText: {
    color: C.textSoft,
    fontSize: 13,
    fontFamily: MONO,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 28,
    padding: 6,
    gap: 6,
  },
  tab: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tabActive: {
    backgroundColor: C.surfaceRaised,
  },
  tabText: {
    color: C.muted,
    fontSize: 15,
    fontWeight: '500',
  },
  tabTextActive: {
    color: C.text,
  },
  hash: {
    color: C.text,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: MONO,
  },
  hashHead: {
    color: C.emerald,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
})
