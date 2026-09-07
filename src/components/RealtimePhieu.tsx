'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

// Nghe tín hiệu 'phieu' (broadcast) → làm mới dữ liệu server mà không cần bấm F5.
// Có gộp (debounce) để nhiều thay đổi liên tiếp chỉ refresh 1 lần.
// Fallback: nếu realtime không kết nối được, vẫn tự làm mới mỗi 45s.
export default function RealtimePhieu() {
  const router = useRouter()
  const hen = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const lamMoi = () => {
      if (hen.current) clearTimeout(hen.current)
      hen.current = setTimeout(() => router.refresh(), 400)
    }

    const sb = getSupabaseBrowser()
    const ch = sb
      ? sb.channel('phieu').on('broadcast', { event: 'thay_doi' }, lamMoi).subscribe()
      : null

    const poll = setInterval(() => router.refresh(), 45_000)

    return () => {
      if (hen.current) clearTimeout(hen.current)
      clearInterval(poll)
      if (ch && sb) sb.removeChannel(ch)
    }
  }, [router])

  return null
}
