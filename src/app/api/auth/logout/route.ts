import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase-ssr'

export const runtime = 'nodejs'

export async function POST() {
  await clearSessionCookie() // cookie phiên của app
  try {
    const supabase = await supabaseServer()
    await supabase.auth.signOut() // dọn cả phiên Supabase Auth (Google)
  } catch {
    /* bỏ qua nếu không có phiên Supabase */
  }
  return NextResponse.json({ ok: true })
}
