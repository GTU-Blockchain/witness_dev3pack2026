'use client'
// 4: Ses dosyasının GERÇEK dalga formu (Web Audio ile çizilir). Sadece görsel bağlam —
// ✅/❌ kararı dalga formundan değil, hash eşleşmesinden gelir. Sahte "kesinti" göstergesi yok.
import { useEffect, useRef, useState } from 'react'

const BUCKETS = 52
// Ses çözme dosyanın tamamını belleğe alır (ve çözülmüş PCM bundan da büyüktür). Hash parça parça
// hesaplansa bile dalga formu büyük dosyada sekmeyi çökertebilir; bu yüzden üstünde çizilmez.
// Doğrulama sonucunu etkilemez (✅/❌ hash'ten gelir). Bkz. web/README.md → Büyük dosyalar.
const MAX_WAVEFORM_BYTES = 64 * 1024 * 1024

function fmtDur(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Ses baytlarını çöz, kova başına tepe genliği çıkar (0–1). */
async function peaksFromFile(file: File): Promise<{ peaks: number[]; dur: string }> {
  const AC: typeof AudioContext =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AC()
  try {
    const buf = await file.arrayBuffer()
    const audio = await ctx.decodeAudioData(buf)
    const data = audio.getChannelData(0)
    const size = Math.floor(data.length / BUCKETS) || 1
    const peaks: number[] = []
    for (let i = 0; i < BUCKETS; i++) {
      let max = 0
      for (let j = 0; j < size; j++) {
        const v = Math.abs(data[i * size + j] || 0)
        if (v > max) max = v
      }
      peaks.push(max)
    }
    const mx = Math.max(...peaks, 0.01)
    return { peaks: peaks.map((p) => Math.max(0.04, p / mx)), dur: fmtDur(audio.duration) }
  } finally {
    void ctx.close()
  }
}

function draw(canvas: HTMLCanvasElement, peaks: number[], color: string) {
  const dpr = window.devicePixelRatio || 1
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (!w || !h) return
  canvas.width = w * dpr
  canvas.height = h * dpr
  const c = canvas.getContext('2d')
  if (!c) return
  c.scale(dpr, dpr)
  c.clearRect(0, 0, w, h)
  c.fillStyle = color
  const n = peaks.length
  const gap = 3
  const bw = Math.max(1, (w - (n - 1) * gap) / n)
  for (let i = 0; i < n; i++) {
    const bh = Math.max(3, peaks[i] * (h - 4))
    const x = i * (bw + gap)
    const y = (h - bh) / 2
    const r = Math.min(bw / 2, bh / 2, 3)
    c.beginPath()
    if (c.roundRect) c.roundRect(x, y, bw, bh, r)
    else c.rect(x, y, bw, bh)
    c.fill()
  }
}

/** Sadece ses dosyaları için dalga formu gösterir; çözülemezse hiçbir şey çizmez.
 *  colorVar: temaya göre çözülen CSS değişkeni adı (ör. "--ok-ink"). */
export function WaveForm({ file, colorVar }: { file: File; colorVar: string }) {
  const [state, setState] = useState<{ peaks: number[]; dur: string } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    if (!file.type.startsWith('audio') || file.size > MAX_WAVEFORM_BYTES) return
    peaksFromFile(file)
      .then((r) => !cancelled && setState(r))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [file])

  useEffect(() => {
    if (state && canvasRef.current) {
      const color = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim() || '#16a34a'
      draw(canvasRef.current, state.peaks, color)
    }
  }, [state, colorVar])

  if (!state) return null
  return (
    <div className="wave">
      <div className="wmeta">
        <span className="wname">{file.name}</span>
        <span className="wdur">{state.dur}</span>
      </div>
      <canvas ref={canvasRef} />
    </div>
  )
}
