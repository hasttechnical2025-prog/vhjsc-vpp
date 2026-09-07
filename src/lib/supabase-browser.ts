import { createClient } from '@supabase/supabase-js'

// Client trình duyệt dùng khoá ANON — CHỈ dùng cho Realtime (nghe broadcast).
// Mọi truy vấn dữ liệu thật vẫn đi qua API server (service_role).
let _sb: ReturnType<typeof createClient> | null = null
export function getSupabaseBrowser() {
  if (_sb) return _sb
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return null
  _sb = createClient(url, anon, { auth: { persistSession: false }, realtime: { params: { eventsPerSecond: 2 } } })
  return _sb
}
