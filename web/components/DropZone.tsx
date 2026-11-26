'use client'
// 4: Sürükle bırak alanı. Dosya sadece tarayıcıda okunur; hiçbir yere yüklenmez.
import { useRef, useState } from 'react'

export function DropZone({ onFile, disabled }: { onFile: (file: File) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  return (
    <div
      role="button"
      tabIndex={0}
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
      style={{
        border: `2px dashed ${over ? '#2563eb' : '#bbb'}`,
        background: over ? '#eff6ff' : '#fafafa',
        borderRadius: 12,
        padding: '40px 16px',
        textAlign: 'center',
        cursor: disabled ? 'wait' : 'pointer',
      }}
    >
      <p style={{ margin: 0, fontSize: 18 }}>Ses dosyasını buraya bırakın ya da tıklayıp seçin</p>
      <p style={{ margin: '8px 0 0', color: '#666', fontSize: 14 }}>
        Dosya bilgisayarınızdan çıkmaz. Parmak izi (SHA-256) tarayıcınızda hesaplanır.
      </p>
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
