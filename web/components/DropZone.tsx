'use client'
// 4: Sürükle bırak alanı
import { useRef, useState } from 'react'

export function DropZone({ onFile, disabled }: { onFile: (file: File) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  return (
    <div
      role="button"
      tabIndex={0}
      className={`drop-zone${over ? ' is-over' : ''}${disabled ? ' is-disabled' : ''}`}
      onClick={() => !disabled && input.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !disabled && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file && !disabled) onFile(file)
      }}
    >
      <p className="drop-title">Ses dosyasını buraya bırakın ya da tıklayıp seçin</p>
      <p className="drop-note">Dosya bilgisayarınızdan çıkmaz. Parmak izi (SHA-256) tarayıcınızda hesaplanır.</p>
      <input
        ref={input}
        type="file"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
