'use client'
// 4: Sürükle bırak alanı. Dosya sadece tarayıcıda okunur; hiçbir yere yüklenmez.
import { useRef, useState } from 'react'

export function DropZone({ onFile, disabled }: { onFile: (file: File) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  return (
    <label
      className={`drop${over ? ' over' : ''}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !disabled && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file && !disabled) onFile(file)
      }}
    >
      <div className="ico">⤓</div>
      <div className="big">Dosyayı buraya bırak ya da tıklayıp seç</div>
      <div className="sub">Parmak izi (SHA-256) tarayıcınızda hesaplanır</div>
      <input
        ref={input}
        type="file"
        hidden
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
    </label>
  )
}
