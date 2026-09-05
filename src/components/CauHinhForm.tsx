'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CauHinhForm({
  brandText,
  logoUrl,
}: {
  brandText: string
  logoUrl: string | null
}) {
  const router = useRouter()
  const [brand, setBrand] = useState(brandText)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  async function luuBrand() {
    setErr(''); setMsg(''); setSaving(true)
    try {
      const res = await fetch('/api/admin/cau-hinh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_text: brand }),
      })
      const d = await res.json()
      if (!res.ok) { setErr(d.error || 'Lưu thất bại'); return }
      setMsg('Đã lưu chữ thương hiệu.')
      router.refresh()
    } catch { setErr('Lỗi kết nối') } finally { setSaving(false) }
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr(''); setMsg(''); setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/cau-hinh/logo', { method: 'POST', body: fd })
      const d = await res.json()
      if (!res.ok) { setErr(d.error || 'Upload thất bại'); return }
      setMsg('Đã cập nhật logo.')
      router.refresh()
    } catch { setErr('Lỗi kết nối') } finally { setUploading(false); e.target.value = '' }
  }

  async function xoaLogo() {
    setErr(''); setMsg(''); setUploading(true)
    try {
      const res = await fetch('/api/admin/cau-hinh/logo', { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); setErr(d.error || 'Xoá thất bại'); return }
      setMsg('Đã xoá logo.')
      router.refresh()
    } catch { setErr('Lỗi kết nối') } finally { setUploading(false) }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="card p-4">
        <div className="font-semibold mb-3">Logo công ty</div>
        <div className="flex items-center gap-4 mb-3">
          <div className="w-20 h-20 rounded-lg border border-border bg-white flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-muted">Chưa có</span>
            )}
          </div>
          <div className="text-sm text-muted">PNG / JPG / SVG / WEBP, tối đa 3MB.</div>
        </div>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-2 text-sm font-medium cursor-pointer">
            <input type="file" accept="image/*" onChange={uploadLogo} className="hidden" disabled={uploading} />
            {uploading ? 'Đang tải…' : 'Tải logo lên'}
          </label>
          {logoUrl && (
            <button onClick={xoaLogo} disabled={uploading} className="text-sm text-danger hover:underline">
              Xoá logo
            </button>
          )}
        </div>
      </div>

      <div className="card p-4">
        <div className="font-semibold mb-3">Chữ thương hiệu</div>
        <input
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="VHJSC · VPP"
          className="w-full border border-border rounded-lg px-3 py-2 outline-none focus:border-accent"
        />
        <button
          onClick={luuBrand}
          disabled={saving}
          className="mt-3 bg-accent hover:bg-accent-600 text-white rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-60"
        >
          {saving ? 'Đang lưu…' : 'Lưu chữ thương hiệu'}
        </button>
      </div>

      {msg && <div className="text-sm text-ok">{msg}</div>}
      {err && <div className="text-sm text-danger">{err}</div>}
    </div>
  )
}
