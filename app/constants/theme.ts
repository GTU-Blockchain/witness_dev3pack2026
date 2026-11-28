import { Platform } from 'react-native'

// Witness shared theme. Values come from the team's UI template (the palette in RecordScreen).
// Screens should take colors from here instead of defining their own.
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
  redSoft: 'rgba(229, 83, 75, 0.12)',
  amber: '#F5B544',
  amberSoft: 'rgba(245, 181, 68, 0.14)',
}

export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })
