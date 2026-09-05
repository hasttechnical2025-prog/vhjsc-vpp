'use client'

import { isoToDmy, dmyToIso } from '@/lib/format'

// Ô chọn ngày luôn hiển thị DD/MM/YYYY (không theo locale trình duyệt).
// Giá trị vào/ra là chuỗi "DD/MM/YYYY". Dùng native <input type="date"> ẩn đè lên.
export default function DateField({
  value,
  onChange,
  placeholder = 'dd/mm/yyyy',
  className = '',
}: {
  value: string
  onChange: (dmy: string) => void
  placeholder?: string
  className?: string
}) {
  const iso = dmyToIso(value)
  return (
    <div
      className={`relative border border-border rounded-md px-2 py-1 text-sm bg-white focus-within:border-accent ${className}`}
    >
      <span className={value ? '' : 'text-muted'}>{value || placeholder}</span>
      <input
        type="date"
        value={iso}
        onChange={(e) => onChange(isoToDmy(e.target.value))}
        onClick={(e) => {
          // Ô ẩn opacity-0 nên click không tự bung lịch -> gọi showPicker thủ công
          const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void }
          try {
            el.showPicker?.()
          } catch {
            /* trình duyệt không hỗ trợ showPicker: bỏ qua, vẫn focus được */
          }
        }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label="Chọn ngày"
      />
    </div>
  )
}
