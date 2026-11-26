import { MaterialCommunityIcons } from '@expo/vector-icons'
import { StyleSheet, Text, View } from 'react-native'
import { C, MONO } from '@/constants/theme'

// Template'teki ortak üst başlık: kalkan ikonu + "Witness" + (varsa) cüzdan hapı.
export function AppHeader({ walletLabel }: { walletLabel?: string }) {
  return (
    <>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <MaterialCommunityIcons name="shield-check-outline" size={20} color={C.emerald} />
          </View>
          <Text style={styles.brandTitle}>Witness</Text>
        </View>
        {walletLabel ? (
          <View style={styles.walletPill}>
            <View style={styles.emeraldDot} />
            <Text style={styles.walletText}>{walletLabel}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.divider} />
    </>
  )
}

const styles = StyleSheet.create({
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
    marginTop: -4,
  },
})
