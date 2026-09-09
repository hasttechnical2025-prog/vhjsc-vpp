import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/session'

export const runtime = 'nodejs'

export async function POST() {
  await clearSessionCookie() // cookie phiên của app
  return NextResponse.json({ ok: true })
}
