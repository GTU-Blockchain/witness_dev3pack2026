import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { C, MONO } from '@/constants/theme'

export { C, MONO }
export { AppHeader } from '@/components/app-header'

// Shared pieces for the Witness screens (Record, Sealing, Recordings).
// Colors and the header come from the team theme (constants/theme, components/app-header).

export function formatDuration(durationMillis: number): string {
  const totalTenths = Math.floor(Math.max(0, durationMillis) / 100)
  const tenths = totalTenths % 10
  const totalSeconds = Math.floor(totalTenths / 10)
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`
}

/** Picked or shared files have no duration (stored as 0): show a dash instead of 00:00.0. */
export function formatDurationOrDash(durationMillis: number): string {
  return durationMillis > 0 ? formatDuration(durationMillis) : '—'
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
