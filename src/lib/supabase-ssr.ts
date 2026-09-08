import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client phía SERVER (đọc/ghi cookie phiên Supabase Auth) — dùng cho route callback.
export async function supabaseServer() {
  const store = await cookies()
  return createServerClient(URL, ANON, {
    cookies: {
      getAll() {
        return store.getAll()
      },
      setAll(list) {
        try {
          for (const { name, value, options } of list) store.set(name, value, options)
        } catch {
          /* gọi từ nơi không set được cookie -> bỏ qua */
        }
      },
    },
  })
}
