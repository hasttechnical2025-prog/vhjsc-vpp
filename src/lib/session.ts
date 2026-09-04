import crypto from 'crypto'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Phiên đăng nhập dùng cookie httpOnly có ký HMAC-SHA256.
// Token: base64url(payload).signature — client không tự sửa được vai trò.

export type Role = 'admin' | 'hcns' | 'nguoi_de_nghi'

export type SessionUser = {
  id: string
  ho_ten: string
  role: Role
  phong_ban_id: string | null
}

type SessionPayload = SessionUser & { exp: number }

const COOKIE_NAME = 'vpp_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 ngày

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('Thiếu biến môi trường SESSION_SECRET')
  return secret
}

function sign(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url')
}

export function createSessionToken(user: SessionUser, maxAgeSeconds = MAX_AGE_SECONDS): string {
  const payload: SessionPayload = { ...user, exp: Date.now() + maxAgeSeconds * 1000 }
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${data}.${sign(data)}`
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [data, sig] = token.split('.')
  if (!data || !sig) return null
  const expected = sign(data)
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expected)
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as SessionPayload
    if (!payload.exp || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export async function setSessionCookie(user: SessionUser, maxAgeSeconds = MAX_AGE_SECONDS): Promise<void> {
  const store = await cookies()
  store.set(COOKIE_NAME, createSessionToken(user, maxAgeSeconds), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

// Đọc lại DB mỗi lần: tắt is_active là chặn được ngay cả khi gọi API trực tiếp.
export async function requireRole(...roles: Role[]): Promise<SessionPayload | null> {
  const session = await getSession()
  if (!session) return null
  if (roles.length > 0 && !roles.includes(session.role)) return null
  const { data } = await supabaseAdmin
    .from('vpp_nguoi_dung')
    .select('role, is_active')
    .eq('id', session.id)
    .single()
  if (!data || data.role !== session.role || data.is_active === false) return null
  return session
}
