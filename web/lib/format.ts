// 4: Görüntüleme yardımcıları. Zaman: zincirde Unix saniye, UI'da İstanbul saati.
import { SOLANA_CLUSTER } from './config'

export function shortAddress(addr: string): string {
  return addr.length > 10 ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : addr
}

const istanbul = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'Europe/Istanbul',
  dateStyle: 'long',
  timeStyle: 'medium',
})

export function formatIstanbul(unixSeconds: number): string {
  return `${istanbul.format(new Date(unixSeconds * 1000))} (İstanbul)`
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return m > 0 ? `${m} dk ${s} sn` : `${s} sn`
}

export function explorerAddress(addr: string): string {
  return `https://explorer.solana.com/address/${addr}?cluster=${SOLANA_CLUSTER}`
}

export function explorerTx(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=${SOLANA_CLUSTER}`
}
