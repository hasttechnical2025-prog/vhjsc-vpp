'use client'

import { useEffect, useState } from 'react'

// Theo dõi bản build server; khi có deploy mới -> hiện thanh nhắc cập nhật.
export default function VersionWatcher({ current }: { current: string }) {
  const [coBanMoi, setCoBanMoi] = useState(false)

  useEffect(() => {
    if (!current || current === 'dev') return // local không nhắc
    let dung = false

    async function kiemTra() {
      try {
        const r = await fetch('/api/version', { cache: 'no-store' })
        if (!r.ok) return
        const d = await r.json()
        if (!dung && d?.version && d.version !== current) setCoBanMoi(true)
      } catch {
        /* mạng lỗi -> bỏ qua, lần sau kiểm lại */
      }
    }

    const id = setInterval(kiemTra, 60_000) // mỗi 60 giây
    const khiFocus = () => kiemTra() // quay lại tab -> kiểm ngay
    window.addEventListener('focus', khiFocus)
    kiemTra()

    return () => {
      dung = true
      clearInterval(id)
      window.removeEventListener('focus', khiFocus)
    }
  }, [current])

  if (!coBanMoi) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
      <div className="bg-accent text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
        <span className="flex-1 text-sm">
          <b>Đã có phiên bản mới</b> — bấm cập nhật để dùng tính năng mới nhất.
        </span>
        <button
          onClick={() => window.location.reload()}
          className="bg-white text-accent-600 rounded-lg px-4 py-1.5 text-sm font-semibold shrink-0 hover:bg-accent-50"
        >
          Cập nhật
        </button>
      </div>
    </div>
  )
}
