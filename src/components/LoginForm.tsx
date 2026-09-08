'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseAuthBrowser } from '@/lib/supabase-auth-browser'

const LOI: Record<string, string> = {
  'chua-cap-quyen': 'Email này chưa được cấp quyền vào hệ thống. Vui lòng liên hệ quản trị viên.',
  oauth: 'Đăng nhập Google chưa thành công, vui lòng thử lại.',
}

export default function LoginForm({ logoUrl, brandText }: { logoUrl: string | null; brandText: string }) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [gLoading, setGLoading] = useState(false)
  const [moDuPhong, setMoDuPhong] = useState(false)

  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get('loi')
    if (k && LOI[k]) setErr(LOI[k])
  }, [])

  async function googleLogin() {
    setErr(''); setGLoading(true)
    try {
      const supabase = supabaseAuthBrowser()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/auth/callback' },
      })
      if (error) { setErr('Không mở được đăng nhập Google'); setGLoading(false) }
      // nếu OK sẽ tự chuyển sang Google
    } catch { setErr('Lỗi kết nối'); setGLoading(false) }
  }

  async function dangNhap() {
    setErr(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || 'Đăng nhập thất bại'); return }
      router.push('/'); router.refresh()
    } catch { setErr('Lỗi kết nối, thử lại') } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-sm p-7">
        <div className="text-center mb-6">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo" className="h-14 w-auto object-contain mx-auto mb-3" />
          ) : (
            <div className="text-xl font-bold text-accent-600">{brandText}</div>
          )}
          <div className="text-sm text-muted mt-1">Dịch vụ Hành chính</div>
        </div>

        {err && <div className="text-sm text-danger mb-4 text-center">{err}</div>}

        <button
          onClick={googleLogin}
          disabled={gLoading}
          className="w-full flex items-center justify-center gap-2 border border-border rounded-lg py-2.5 font-medium hover:border-accent disabled:opacity-60 bg-surface"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          {gLoading ? 'Đang chuyển…' : 'Đăng nhập bằng Google'}
        </button>

        <button onClick={() => setMoDuPhong((v) => !v)} className="w-full text-xs text-muted hover:text-accent-600 mt-3">
          {moDuPhong ? 'Ẩn đăng nhập bằng tài khoản' : 'Đăng nhập bằng tài khoản (dự phòng)'}
        </button>

        {moDuPhong && (
          <div className="mt-3 pt-3 border-t border-border">
            <label className="block text-sm font-medium mb-1">Tài khoản</label>
            <input className="w-full border border-border rounded-lg px-3 py-2 mb-3 outline-none focus:border-accent" value={username} onChange={(e) => setUsername(e.target.value)} />
            <label className="block text-sm font-medium mb-1">Mật khẩu</label>
            <input type="password" className="w-full border border-border rounded-lg px-3 py-2 mb-3 outline-none focus:border-accent" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) dangNhap() }} />
            <button onClick={dangNhap} disabled={loading} className="w-full bg-accent hover:bg-accent-600 text-white rounded-lg py-2 font-medium disabled:opacity-60">
              {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
