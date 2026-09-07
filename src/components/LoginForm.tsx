'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginForm({ logoUrl, brandText }: { logoUrl: string | null; brandText: string }) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function dangNhap() {
    setErr('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || 'Đăng nhập thất bại')
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setErr('Lỗi kết nối, thử lại')
    } finally {
      setLoading(false)
    }
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
          <div className="text-sm text-muted mt-1">Đăng ký Văn phòng phẩm</div>
        </div>

        <label className="block text-sm font-medium mb-1">Tài khoản</label>
        <input
          className="w-full border border-border rounded-lg px-3 py-2 mb-4 outline-none focus:border-accent"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />

        <label className="block text-sm font-medium mb-1">Mật khẩu</label>
        <input
          type="password"
          className="w-full border border-border rounded-lg px-3 py-2 mb-4 outline-none focus:border-accent"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) dangNhap()
          }}
        />

        {err && <div className="text-sm text-danger mb-3">{err}</div>}

        <button
          onClick={dangNhap}
          disabled={loading}
          className="w-full bg-accent hover:bg-accent-600 text-white rounded-lg py-2 font-medium disabled:opacity-60"
        >
          {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </div>
    </div>
  )
}
