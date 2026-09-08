'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Đọc file .xlsx (Họ tên · Email · Phòng ban), gửi lên import. Header linh hoạt.
type Field = 'ho_ten' | 'email' | 'phong_ban'
const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim()
const HMAP: Record<string, Field> = {}
;['ho ten', 'ten', 'ho va ten', 'ten nhan vien', 'ho ten nhan vien'].forEach((k) => (HMAP[k] = 'ho_ten'))
;['email', 'thu dien tu', 'e-mail'].forEach((k) => (HMAP[k] = 'email'))
;['phong ban', 'phong', 'bo phan', 'don vi'].forEach((k) => (HMAP[k] = 'phong_ban'))

async function bocFile(file: File) {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const out: { ho_ten?: string; email?: string; phong_ban?: string }[] = []
  for (const name of wb.SheetNames) {
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, defval: '' })
    let h = -1
    for (let i = 0; i < Math.min(aoa.length, 10); i++) {
      if ((aoa[i] || []).some((c) => HMAP[boDau(String(c))] === 'email')) { h = i; break }
    }
    if (h < 0) continue
    const col: (Field | undefined)[] = (aoa[h] as unknown[]).map((c) => HMAP[boDau(String(c))])
    for (let r = h + 1; r < aoa.length; r++) {
      const row = aoa[r] || []
      const rec: { ho_ten?: string; email?: string; phong_ban?: string } = {}
      for (let c = 0; c < col.length; c++) if (col[c]) rec[col[c]!] = String(row[c] ?? '').trim()
      if (rec.email) out.push(rec)
    }
  }
  return out
}

export default function NhapUser() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [kq, setKq] = useState('')

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr(''); setKq(''); setBusy(true)
    try {
      const rows = await bocFile(file)
      if (rows.length === 0) { setErr('Không đọc được dòng nào. File cần cột Email + Họ tên.'); return }
      const res = await fetch('/api/admin/nguoi-dung/nhap', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }),
      })
      const d = await res.json()
      if (!res.ok) { setErr(d.error || 'Import thất bại'); return }
      let m = `Đã thêm ${d.them} · cập nhật ${d.capNhat} · bỏ qua (super-admin) ${d.boQua} · lỗi ${d.loi}.`
      if (d.khongKhopPhong?.length) m += ` ⚠ Phòng ban chưa khớp: ${d.khongKhopPhong.join(', ')} (user vẫn tạo, để trống phòng).`
      setKq(m); router.refresh()
    } catch { setErr('Lỗi đọc file hoặc kết nối') } finally { setBusy(false); e.target.value = '' }
  }

  return (
    <div className="inline-flex flex-col items-end">
      <label className="inline-flex items-center gap-2 border border-border rounded-lg px-4 py-1.5 text-sm font-medium cursor-pointer hover:border-accent">
        <input type="file" accept=".xlsx" onChange={onFile} className="hidden" disabled={busy} />
        {busy ? 'Đang nhập…' : '⬆ Nhập từ Excel'}
      </label>
      {err && <div className="text-xs text-danger mt-1 max-w-xs text-right">{err}</div>}
      {kq && <div className="text-xs text-ok mt-1 max-w-md text-right">{kq}</div>}
    </div>
  )
}
