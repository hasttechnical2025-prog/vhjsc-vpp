import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
// Fallback non-rỗng để `next build` không ném "supabaseKey is required" khi scope build
// thiếu env. Runtime vẫn cần key THẬT — placeholder không gọi mạng được.
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key'

// Client dùng ở phía SERVER (API routes / server components). KHÔNG import vào client component.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Supabase giới hạn ~1000 dòng/request. Helper lặp .range() để lấy TOÀN BỘ dòng.
export async function selectAll<T = unknown>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1)
    if (error) {
      const e = error as { code?: string; message?: string }
      if (e.code === 'PGRST103' || /range not satisfiable/i.test(e.message || '')) break
      throw error
    }
    const batch = data || []
    all.push(...batch)
    if (batch.length < pageSize) break
    if (all.length >= 100000) break
  }
  return all
}
