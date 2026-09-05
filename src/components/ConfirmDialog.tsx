'use client'

// Hộp thoại xác nhận riêng của app (KHÔNG dùng window.confirm của trình duyệt).
export default function ConfirmDialog({
  open,
  title = 'Xác nhận',
  message,
  confirmText = 'Xoá',
  danger = true,
  onConfirm,
  onClose,
}: {
  open: boolean
  title?: string
  message: string
  confirmText?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="card p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="font-semibold mb-1">{title}</div>
        <div className="text-sm text-foreground/80 mb-4">{message}</div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent-50">
            Huỷ
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-lg text-white ${danger ? 'bg-danger hover:opacity-90' : 'bg-accent hover:bg-accent-600'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
