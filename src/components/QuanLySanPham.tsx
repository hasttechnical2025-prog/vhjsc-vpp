'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SanPham } from '@/lib/types'
import { formatTien } from '@/lib/format'
import ConfirmDialog from './ConfirmDialog'

const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()

type EditState = { ten: string; nhom_hang: string; dvt: string; don_gia: string; bien_the: string }

export default function QuanLySanPham({ sanPham, nhomList }: { sanPham: SanPham[]; nhomList: string[] }) {
  const router = useRouter()
  const [tuKhoa, setTuKhoa] = useState('')
  const [nhom, setNhom] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [ed, setEd] = useState<EditState>({ ten: '', nhom_hang: '', dvt: '', don_gia: '', bien_the: '' })
  const [busy, setBusy] = useState(false)
  const [doiTenMo, setDoiTenMo] = useState(false)
  const [tenNhomMoi, setTenNhomMoi] = useState('')
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  // Ghi đè ảnh mới sau khi upload (không cần refresh cả trang để thấy)
  const [anhMoi, setAnhMoi] = useState<Record<number, string>>({})
  const [anhXoa, setAnhXoa] = useState<Set<number>>(new Set())
  const [xacNhanXoaAnh, setXacNhanXoaAnh] = useState<{ id: number; ten: string } | null>(null)
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const GIOI_HAN = 80
  const loc = useMemo(() => {
    const q = boDau(tuKhoa.trim())
    return sanPham.filter((s) => {
      if (nhom && s.nhom_hang !== nhom) return false
      if (!q) return true
      return boDau(s.ten).includes(q) || String(s.id) === tuKhoa.trim() || boDau(s.nhom_hang).includes(q)
    })
  }, [sanPham, tuKhoa, nhom])
  const hienThi = loc.slice(0, GIOI_HAN)

  function batDauSua(s: SanPham) {
    setErr(''); setMsg('')
    setEditId(s.id)
    setEd({
      ten: s.ten,
      nhom_hang: s.nhom_hang,
      dvt: s.dvt || '',
      don_gia: s.don_gia == null ? '' : String(s.don_gia),
      bien_the: (s.bien_the || []).join(', '),
    })
  }

  async function luu(id: number) {
    setBusy(true); setErr(''); setMsg('')
    try {
      const res = await fetch('/api/admin/san-pham', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          ten: ed.ten,
          nhom_hang: ed.nhom_hang,
          dvt: ed.dvt,
          don_gia: ed.don_gia === '' ? null : Number(ed.don_gia.replace(/[.\s]/g, '')),
          bien_the: ed.bien_the,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(d.error || 'Lưu thất bại'); return }
      setEditId(null); setMsg('Đã lưu mặt hàng'); router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function doiTenNhom() {
    const moi = tenNhomMoi.trim()
    if (!nhom || !moi || moi === nhom) { setDoiTenMo(false); return }
    setBusy(true); setErr(''); setMsg('')
    try {
      const res = await fetch('/api/admin/san-pham/nhom', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cu: nhom, moi }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(d.error || 'Đổi tên thất bại'); return }
      setDoiTenMo(false); setNhom(moi); setMsg(`Đã đổi tên nhóm cho ${d.count} mặt hàng`); router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function thayAnh(id: number, file: File) {
    setUploadingId(id); setErr(''); setMsg('')
    try {
      const fd = new FormData()
      fd.append('id', String(id))
      fd.append('file', file)
      const res = await fetch('/api/admin/san-pham/anh', { method: 'POST', body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(d.error || 'Đổi ảnh thất bại'); return }
      setAnhMoi((m) => ({ ...m, [id]: d.url }))
      setAnhXoa((s) => { const n = new Set(s); n.delete(id); return n }) // gỡ cờ "đã xoá" để ảnh mới hiện
      setMsg('Đã đổi ảnh')
    } finally {
      setUploadingId(null)
    }
  }

  async function xoaAnh(id: number) {
    setUploadingId(id); setErr(''); setMsg('')
    try {
      const res = await fetch('/api/admin/san-pham/anh', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(d.error || 'Xoá ảnh thất bại'); return }
      setAnhMoi((m) => { const n = { ...m }; delete n[id]; return n })
      setAnhXoa((s) => new Set(s).add(id))
      setMsg('Đã xoá ảnh (hiển thị “Không ảnh”)')
    } finally {
      setUploadingId(null)
    }
  }

  const inp = 'border border-border rounded px-2 py-1 text-sm outline-none focus:border-accent w-full'

  return (
    <div>
      {/* Bộ lọc */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex-1 min-w-[220px]">
          <div className="text-xs text-muted mb-1">Tìm (tên, mã, nhóm)</div>
          <input className={inp} placeholder="VD: bút bi, 116, giấy A4…" value={tuKhoa} onChange={(e) => setTuKhoa(e.target.value)} />
        </div>
        <div>
          <div className="text-xs text-muted mb-1">Nhóm hàng</div>
          <select className="border border-border rounded px-2 py-1 text-sm bg-surface" value={nhom} onChange={(e) => setNhom(e.target.value)}>
            <option value="">— Tất cả nhóm —</option>
            {nhomList.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        {nhom && !doiTenMo && (
          <button
            onClick={() => { setTenNhomMoi(nhom); setDoiTenMo(true); setErr(''); setMsg('') }}
            className="text-sm text-accent-600 hover:underline pb-1"
          >
            ✎ Đổi tên nhóm
          </button>
        )}
        <div className="text-sm text-muted pb-1 ml-auto">
          {loc.length.toLocaleString('vi-VN')} mặt hàng{loc.length > GIOI_HAN ? ` · hiện ${GIOI_HAN} đầu, hãy tìm để thu hẹp` : ''}
        </div>
      </div>

      {/* Đổi tên nhóm hàng đang chọn (áp dụng cho mọi mặt hàng trong nhóm) */}
      {nhom && doiTenMo && (
        <div className="card p-3 mb-4 bg-accent-50/40 flex flex-wrap items-end gap-2">
          <div>
            <div className="text-xs text-muted mb-1">Đổi tên nhóm “{nhom}” thành</div>
            <input
              className="border border-border rounded px-2 py-1 text-sm outline-none focus:border-accent w-72"
              value={tenNhomMoi}
              onChange={(e) => setTenNhomMoi(e.target.value)}
              autoFocus
            />
          </div>
          <button onClick={doiTenNhom} disabled={busy} className="bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium disabled:opacity-60">Lưu</button>
          <button onClick={() => setDoiTenMo(false)} className="text-muted hover:text-foreground text-sm px-2 py-1.5">Huỷ</button>
          <span className="text-xs text-muted ml-1">Áp dụng cho tất cả mặt hàng trong nhóm.</span>
        </div>
      )}

      {(err || msg) && <div className={`text-sm mb-3 ${err ? 'text-danger' : 'text-ok'}`}>{err || msg}</div>}

      <datalist id="dl-nhom">{nhomList.map((n) => <option key={n} value={n} />)}</datalist>

      <div className="space-y-2">
        {hienThi.map((s) => {
          const anh = anhXoa.has(s.id) ? null : (anhMoi[s.id] || s.anh_url)
          const dangSua = editId === s.id
          return (
            <div key={s.id} className={`card p-3 ${dangSua ? 'border-accent' : ''}`}>
              <div className="flex gap-3">
                {/* Ảnh + nút thay ảnh */}
                <div className="shrink-0 w-20">
                  <div className="w-20 h-20 rounded border border-border bg-accent-50/40 overflow-hidden flex items-center justify-center">
                    {anh ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={anh} alt={s.ten} className="w-full h-full object-contain" loading="lazy" />
                    ) : (
                      <span className="text-[11px] text-muted">Không ảnh</span>
                    )}
                  </div>
                  <input
                    ref={(el) => { fileRefs.current[s.id] = el }}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) thayAnh(s.id, f); e.target.value = '' }}
                  />
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <button
                      onClick={() => fileRefs.current[s.id]?.click()}
                      disabled={uploadingId === s.id}
                      className="text-xs text-accent-600 hover:underline disabled:opacity-60"
                    >
                      {uploadingId === s.id ? '…' : 'Thay'}
                    </button>
                    {anh && (
                      <button
                        onClick={() => setXacNhanXoaAnh({ id: s.id, ten: s.ten })}
                        disabled={uploadingId === s.id}
                        className="text-xs text-danger hover:underline disabled:opacity-60"
                      >
                        Xoá
                      </button>
                    )}
                  </div>
                </div>

                {/* Nội dung */}
                <div className="flex-1 min-w-0">
                  {dangSua ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="text-xs text-muted">Tên hàng
                        <input className={inp} value={ed.ten} onChange={(e) => setEd({ ...ed, ten: e.target.value })} />
                      </label>
                      <label className="text-xs text-muted">Nhóm hàng
                        <input className={inp} list="dl-nhom" value={ed.nhom_hang} onChange={(e) => setEd({ ...ed, nhom_hang: e.target.value })} />
                      </label>
                      <label className="text-xs text-muted">ĐVT
                        <input className={inp} value={ed.dvt} onChange={(e) => setEd({ ...ed, dvt: e.target.value })} />
                      </label>
                      <label className="text-xs text-muted">Đơn giá (đ)
                        <input className={inp} inputMode="numeric" value={ed.don_gia} onChange={(e) => setEd({ ...ed, don_gia: e.target.value })} />
                      </label>
                      <label className="text-xs text-muted sm:col-span-2">Danh sách màu (ngăn bằng dấu phẩy — để trống nếu không nhiều màu)
                        <input className={inp} placeholder="VD: Xanh, Đen, Đỏ" value={ed.bien_the} onChange={(e) => setEd({ ...ed, bien_the: e.target.value })} />
                      </label>
                      <div className="sm:col-span-2 flex gap-2 pt-1">
                        <button onClick={() => luu(s.id)} disabled={busy} className="bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium disabled:opacity-60">Lưu</button>
                        <button onClick={() => setEditId(null)} className="text-muted hover:text-foreground text-sm px-2">Huỷ</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{s.ten}</div>
                        <div className="text-xs text-muted mt-0.5">
                          Mã {s.id} · {s.nhom_hang} · ĐVT: {s.dvt || '—'}
                          {s.bien_the && s.bien_the.length > 0 && <> · Màu: {s.bien_the.join(', ')}</>}
                        </div>
                        <div className="text-sm mt-1">Đơn giá: <b className="text-accent-600">{s.don_gia == null ? '—' : formatTien(s.don_gia) + ' đ'}</b></div>
                      </div>
                      <button onClick={() => batDauSua(s)} className="shrink-0 text-accent-600 hover:underline text-sm">Sửa</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {loc.length === 0 && <div className="card px-3 py-10 text-center text-muted">Không tìm thấy mặt hàng khớp.</div>}
      </div>

      <ConfirmDialog
        open={!!xacNhanXoaAnh}
        message={xacNhanXoaAnh ? `Xoá ảnh của “${xacNhanXoaAnh.ten}”? Mặt hàng sẽ hiển thị “Không ảnh”. Có thể thêm lại bằng “Thay”.` : ''}
        onConfirm={() => { const id = xacNhanXoaAnh?.id; setXacNhanXoaAnh(null); if (id) xoaAnh(id) }}
        onClose={() => setXacNhanXoaAnh(null)}
      />
    </div>
  )
}
