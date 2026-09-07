'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { NccRow } from '@/lib/types'
import { MAU_XEP_LOAI, type XepLoai } from '@/lib/ncc'
import { formatDate } from '@/lib/format'

export type DanhGiaMoiNhat = { ky: string; xep_loai: string | null; diem_tong: number | null }

const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()

function ngayConLai(iso: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso + 'T00:00:00')
  return Math.ceil((d.getTime() - Date.now()) / 86400_000)
}

export default function NccList({
  ncc,
  danhGia,
  nhomList,
}: {
  ncc: NccRow[]
  danhGia: Record<string, DanhGiaMoiNhat>
  nhomList: string[]
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [nhom, setNhom] = useState('')
  const [tt, setTt] = useState('')
  const [loai, setLoai] = useState('')
  const [err, setErr] = useState('')
  const [them, setThem] = useState(false)
  const empty = { ten: '', nhom_chi_phi: '', loai_chi_phi: '', so_dien_thoai: '', email: '' }
  const [nu, setNu] = useState(empty)
  const [busy, setBusy] = useState(false)

  const sapHetHan = useMemo(
    () =>
      ncc
        .filter((n) => n.trang_thai === 'dang_dung' && n.hop_dong_het_han)
        .map((n) => ({ n, con: ngayConLai(n.hop_dong_het_han) }))
        .filter((x) => x.con != null && x.con >= 0 && x.con <= 30)
        .sort((a, b) => (a.con || 0) - (b.con || 0)),
    [ncc],
  )

  const loc = useMemo(() => {
    const k = boDau(q.trim())
    return ncc.filter((n) => {
      if (nhom && n.nhom_chi_phi !== nhom) return false
      if (tt && n.trang_thai !== tt) return false
      if (loai && (danhGia[n.id]?.xep_loai || '') !== loai) return false
      if (!k) return true
      return boDau(n.ten).includes(k) || boDau(n.loai_chi_phi || '').includes(k) || boDau(n.dia_chi || '').includes(k)
    })
  }, [ncc, q, nhom, tt, loai, danhGia])

  async function themNcc() {
    if (!nu.ten.trim()) return setErr('Nhập tên nhà cung cấp')
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/ncc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nu) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(d.error || 'Lỗi'); return }
      router.push(`/ncc/${d.id}`)
    } finally {
      setBusy(false)
    }
  }

  const inp = 'border border-border rounded px-2 py-1 text-sm outline-none focus:border-accent bg-surface'

  return (
    <div>
      {sapHetHan.length > 0 && (
        <div className="card p-3 mb-4 border-warn/40 bg-warn/5">
          <div className="text-sm font-semibold text-warn mb-1">⏰ {sapHetHan.length} hợp đồng sắp hết hạn (trong 30 ngày)</div>
          <div className="text-sm space-y-0.5">
            {sapHetHan.map(({ n, con }) => (
              <div key={n.id}>
                <Link href={`/ncc/${n.id}`} className="text-accent-600 hover:underline">{n.ten}</Link>
                <span className="text-muted"> — hết hạn {formatDate(n.hop_dong_het_han)} (còn {con} ngày)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bộ lọc */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex-1 min-w-[200px]">
          <div className="text-xs text-muted mb-1">Tìm (tên, loại chi phí, địa chỉ)</div>
          <input className={inp + ' w-full'} value={q} onChange={(e) => setQ(e.target.value)} placeholder="VD: điện lực, vé máy bay…" />
        </div>
        <div>
          <div className="text-xs text-muted mb-1">Nhóm chi phí</div>
          <select className={inp} value={nhom} onChange={(e) => setNhom(e.target.value)}>
            <option value="">— Tất cả —</option>
            {nhomList.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs text-muted mb-1">Xếp loại</div>
          <select className={inp} value={loai} onChange={(e) => setLoai(e.target.value)}>
            <option value="">— Tất cả —</option>
            <option value="A">A — Tốt</option>
            <option value="B">B — Đạt</option>
            <option value="C">C — Cân nhắc thay</option>
          </select>
        </div>
        <div>
          <div className="text-xs text-muted mb-1">Trạng thái</div>
          <select className={inp} value={tt} onChange={(e) => setTt(e.target.value)}>
            <option value="">— Tất cả —</option>
            <option value="dang_dung">Đang dùng</option>
            <option value="ngung">Ngừng</option>
          </select>
        </div>
        <button onClick={() => { setThem(!them); setNu(empty); setErr('') }} className="bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium ml-auto">
          {them ? 'Đóng' : '+ Thêm NCC'}
        </button>
      </div>

      {err && <div className="text-sm text-danger mb-3">{err}</div>}

      {them && (
        <div className="card p-3 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-accent-50/40">
          <input className={inp} placeholder="Tên nhà cung cấp *" value={nu.ten} onChange={(e) => setNu({ ...nu, ten: e.target.value })} />
          <input className={inp} list="dl-nhom-cp" placeholder="Nhóm chi phí" value={nu.nhom_chi_phi} onChange={(e) => setNu({ ...nu, nhom_chi_phi: e.target.value })} />
          <input className={inp} placeholder="Loại chi phí / dịch vụ cung cấp" value={nu.loai_chi_phi} onChange={(e) => setNu({ ...nu, loai_chi_phi: e.target.value })} />
          <input className={inp} placeholder="Số điện thoại" value={nu.so_dien_thoai} onChange={(e) => setNu({ ...nu, so_dien_thoai: e.target.value })} />
          <input className={inp} placeholder="Email" value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} />
          <div><button onClick={themNcc} disabled={busy} className="bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium disabled:opacity-60">Tạo & mở hồ sơ</button></div>
          <datalist id="dl-nhom-cp">{nhomList.map((n) => <option key={n} value={n} />)}</datalist>
        </div>
      )}

      <div className="text-sm text-muted mb-2">{loc.length} nhà cung cấp</div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-accent-50 text-accent-600 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">Tên NCC</th>
                <th className="px-3 py-2 font-semibold">Nhóm chi phí</th>
                <th className="px-3 py-2 font-semibold">Loại chi phí</th>
                <th className="px-3 py-2 font-semibold">Điện thoại</th>
                <th className="px-3 py-2 font-semibold">Đánh giá</th>
                <th className="px-3 py-2 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loc.map((n) => {
                const dg = danhGia[n.id]
                return (
                  <tr key={n.id} className="border-t border-border hover:bg-accent-50/40 cursor-pointer" onClick={() => router.push(`/ncc/${n.id}`)}>
                    <td className="px-3 py-2">
                      <Link href={`/ncc/${n.id}`} className="text-accent-600 hover:underline font-medium" onClick={(e) => e.stopPropagation()}>{n.ten}</Link>
                    </td>
                    <td className="px-3 py-2 text-muted">{n.nhom_chi_phi || '—'}</td>
                    <td className="px-3 py-2 max-w-[240px] truncate" title={n.loai_chi_phi || ''}>{n.loai_chi_phi || '—'}</td>
                    <td className="px-3 py-2 text-muted whitespace-nowrap">{n.so_dien_thoai || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {dg?.xep_loai ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MAU_XEP_LOAI[dg.xep_loai as XepLoai]}`}>
                          {dg.xep_loai} · {dg.diem_tong?.toFixed(2)} <span className="opacity-70">({dg.ky})</span>
                        </span>
                      ) : (
                        <span className="text-muted text-xs">Chưa đánh giá</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {n.trang_thai === 'dang_dung' ? <span className="text-ok">Đang dùng</span> : <span className="text-muted">Ngừng</span>}
                    </td>
                  </tr>
                )
              })}
              {loc.length === 0 && <tr><td colSpan={6} className="px-3 py-10 text-center text-muted">Không có nhà cung cấp khớp bộ lọc.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
