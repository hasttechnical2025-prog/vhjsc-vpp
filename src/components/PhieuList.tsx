'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatThang, formatTien, formatDate } from '@/lib/format'
import ConfirmDialog from './ConfirmDialog'

type TT = 'cho_duyet' | 'da_duyet' | 'tu_choi'

type Row = {
  id: string
  phong_ban_id: string | null
  phong_ban_ten: string
  nguoi_de_nghi_ten: string
  thang: string
  tong_tien: number
  trang_thai: TT
  nguoi_duyet_ten: string | null
  thoi_diem_duyet: string | null
  ly_do_tu_choi: string | null
  thoi_gian_can: string | null
  ke_hoach_su_dung: string | null
  tieu_de: string | null
  created_at: string
}

type Dong = {
  san_pham_id: number | null
  ten_hang: string | null
  ten_tay: string | null
  dvt: string | null
  so_luong: number
  ghi_chu: string | null
}

const BADGE: Record<TT, string> = {
  cho_duyet: 'bg-warn/10 text-warn',
  da_duyet: 'bg-ok/10 text-ok',
  tu_choi: 'bg-danger/10 text-danger',
}
const NHAN: Record<TT, string> = { cho_duyet: 'Chờ duyệt', da_duyet: 'Đã duyệt', tu_choi: 'Từ chối' }

export default function PhieuList({
  phieu,
  phongBan,
  canAll,
}: {
  phieu: Row[]
  phongBan: { id: string; ten: string }[]
  canAll: boolean
}) {
  const router = useRouter()
  const [thang, setThang] = useState('')
  const [pb, setPb] = useState('')
  const [tt, setTt] = useState<'' | TT>('')
  const [err, setErr] = useState('')
  const [moId, setMoId] = useState<string | null>(null)
  const [dongCache, setDongCache] = useState<Record<string, Dong[]>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [tuChoiId, setTuChoiId] = useState<string | null>(null)
  const [lyDo, setLyDo] = useState('')
  const [busy, setBusy] = useState(false)
  const [xacNhan, setXacNhan] = useState<{ message: string; onOk: () => void } | null>(null)

  const loc = useMemo(
    () =>
      phieu.filter(
        (p) => (!thang || p.thang === thang) && (!pb || p.phong_ban_id === pb) && (!tt || p.trang_thai === tt),
      ),
    [phieu, thang, pb, tt],
  )

  async function toggle(p: Row) {
    setErr('')
    setTuChoiId(null)
    if (moId === p.id) {
      setMoId(null)
      return
    }
    setMoId(p.id)
    if (!dongCache[p.id]) {
      setLoadingId(p.id)
      try {
        const r = await fetch(`/api/phieu/${p.id}`)
        const d = await r.json()
        if (r.ok) setDongCache((c) => ({ ...c, [p.id]: d.dong || [] }))
      } catch {
        /* bỏ qua */
      } finally {
        setLoadingId(null)
      }
    }
  }

  async function duyet(p: Row) {
    setErr('')
    setBusy(true)
    try {
      const r = await fetch(`/api/phieu/${p.id}/duyet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duyet' }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setErr(d.error || 'Duyệt thất bại')
        return
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function guiTuChoi(p: Row) {
    if (!lyDo.trim()) {
      setErr('Nhập lý do từ chối')
      return
    }
    setBusy(true)
    try {
      const r = await fetch(`/api/phieu/${p.id}/duyet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tu_choi', ly_do: lyDo }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setErr(d.error || 'Từ chối thất bại')
        return
      }
      setTuChoiId(null)
      setLyDo('')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  function xoa(p: Row) {
    setXacNhan({
      message: `Xoá phiếu tháng ${formatThang(p.thang)}${p.phong_ban_ten ? ` · ${p.phong_ban_ten}` : ''}? Không khôi phục được.`,
      onOk: async () => {
        const r = await fetch(`/api/phieu/${p.id}`, { method: 'DELETE' })
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          setErr(d.error || 'Xoá thất bại')
          return
        }
        router.refresh()
      },
    })
  }

  const inp = 'border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent bg-surface'

  return (
    <div>
      {/* Bộ lọc */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <div className="text-xs text-muted mb-1">Tháng</div>
          <input type="month" value={thang} onChange={(e) => setThang(e.target.value)} className={inp} />
        </div>
        {canAll && (
          <div>
            <div className="text-xs text-muted mb-1">Phòng ban</div>
            <select value={pb} onChange={(e) => setPb(e.target.value)} className={inp}>
              <option value="">— Tất cả phòng —</option>
              {phongBan.map((p) => (
                <option key={p.id} value={p.id}>{p.ten}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <div className="text-xs text-muted mb-1">Trạng thái</div>
          <select value={tt} onChange={(e) => setTt(e.target.value as '' | TT)} className={inp}>
            <option value="">— Tất cả —</option>
            <option value="cho_duyet">Chờ duyệt</option>
            <option value="da_duyet">Đã duyệt</option>
            <option value="tu_choi">Từ chối</option>
          </select>
        </div>
        {(thang || pb || tt) && (
          <button onClick={() => { setThang(''); setPb(''); setTt('') }} className="text-sm text-muted hover:text-accent-600 pb-1.5">
            Xoá lọc
          </button>
        )}
        <div className="text-sm text-muted pb-1.5 ml-auto">{loc.length} phiếu</div>
      </div>

      {err && <div className="text-sm text-danger mb-3">{err}</div>}

      <div className="space-y-2">
        {loc.map((p) => {
          const mo = moId === p.id
          const dong = dongCache[p.id]
          return (
            <div key={p.id} className={`card overflow-hidden ${mo ? 'border-accent' : ''}`}>
              {/* Dòng tóm tắt (bấm để xả) */}
              <button
                onClick={() => toggle(p)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent-50/40"
              >
                <span className={`transition-transform text-muted ${mo ? 'rotate-90' : ''}`}>▸</span>
                <span className="w-16 shrink-0 font-medium">{formatThang(p.thang)}</span>
                <span className="flex-1 min-w-0 truncate">{p.phong_ban_ten || '—'}</span>
                <span className="w-40 shrink-0 truncate text-muted hidden sm:block">{p.nguoi_de_nghi_ten}</span>
                <span className="w-24 shrink-0 text-right text-muted hidden md:block">{formatTien(p.tong_tien)}</span>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${BADGE[p.trang_thai]}`}>
                  {NHAN[p.trang_thai]}
                </span>
              </button>

              {/* Panel xả ra */}
              {mo && (
                <div className="border-t border-border px-4 py-3 bg-accent-50/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm mb-3">
                    <div><span className="text-muted">Người đề nghị: </span>{p.nguoi_de_nghi_ten}</div>
                    <div><span className="text-muted">Ngày lập: </span>{formatDate(p.created_at)}</div>
                    <div><span className="text-muted">Thời gian cần: </span>{p.thoi_gian_can || '—'}</div>
                    <div><span className="text-muted">Kế hoạch: </span>{p.ke_hoach_su_dung || '—'}</div>
                  </div>

                  {p.trang_thai === 'tu_choi' && p.ly_do_tu_choi && (
                    <div className="text-sm text-danger mb-3">
                      <b>Bị từ chối</b>{p.nguoi_duyet_ten ? ` bởi ${p.nguoi_duyet_ten}` : ''}: {p.ly_do_tu_choi}
                    </div>
                  )}
                  {p.trang_thai === 'da_duyet' && (
                    <div className="text-sm text-ok mb-3">
                      Đã duyệt{p.nguoi_duyet_ten ? ` bởi ${p.nguoi_duyet_ten}` : ''}
                      {p.thoi_diem_duyet ? ` · ${formatDate(p.thoi_diem_duyet)}` : ''}
                    </div>
                  )}

                  {/* Danh sách VPP */}
                  {loadingId === p.id ? (
                    <div className="text-sm text-muted py-3">Đang tải danh sách…</div>
                  ) : dong && dong.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border border-border">
                        <thead className="bg-accent-50">
                          <tr>
                            <th className="border border-border px-2 py-1 w-10">TT</th>
                            <th className="border border-border px-2 py-1 text-left">Tên TTB/VPP</th>
                            <th className="border border-border px-2 py-1 w-20">ĐVT</th>
                            <th className="border border-border px-2 py-1 w-20">Số lượng</th>
                            <th className="border border-border px-2 py-1 text-left">Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dong.map((d, i) => (
                            <tr key={i}>
                              <td className="border border-border px-2 py-1 text-center">{i + 1}</td>
                              <td className="border border-border px-2 py-1">{d.ten_hang || d.ten_tay || ''}</td>
                              <td className="border border-border px-2 py-1 text-center">{d.dvt || ''}</td>
                              <td className="border border-border px-2 py-1 text-center">{d.so_luong}</td>
                              <td className="border border-border px-2 py-1">{d.ghi_chu || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-muted py-2">Không có mặt hàng.</div>
                  )}

                  {/* Nhập lý do từ chối */}
                  {tuChoiId === p.id && (
                    <div className="mt-3">
                      <textarea
                        value={lyDo}
                        onChange={(e) => setLyDo(e.target.value)}
                        rows={2}
                        placeholder="Lý do từ chối (phòng ban sẽ thấy để sửa lại)"
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-danger"
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => guiTuChoi(p)} disabled={busy} className="bg-danger text-white rounded-lg px-4 py-1.5 text-sm font-medium disabled:opacity-60">
                          Xác nhận từ chối
                        </button>
                        <button onClick={() => { setTuChoiId(null); setLyDo('') }} className="text-sm text-muted hover:text-foreground px-2">Huỷ</button>
                      </div>
                    </div>
                  )}

                  {/* Thao tác */}
                  {tuChoiId !== p.id && (
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {canAll && (
                        <>
                          <button onClick={() => duyet(p)} disabled={busy} className="bg-ok text-white rounded-lg px-4 py-1.5 text-sm font-medium disabled:opacity-60">
                            ✓ Duyệt
                          </button>
                          <button onClick={() => { setTuChoiId(p.id); setLyDo(''); setErr('') }} className="border border-danger text-danger rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-danger/5">
                            ✕ Từ chối
                          </button>
                          <span className="w-px h-5 bg-border mx-1" />
                        </>
                      )}
                      <a href={`/api/phieu/${p.id}/pdf`} target="_blank" rel="noreferrer" className="border border-border rounded-lg px-4 py-1.5 text-sm hover:border-accent">
                        Xem PDF
                      </a>
                      {(canAll || p.trang_thai !== 'da_duyet') ? (
                        <>
                          <Link href={`/phieu/${p.id}/sua`} className="border border-border rounded-lg px-4 py-1.5 text-sm hover:border-accent">
                            Sửa
                          </Link>
                          <button onClick={() => xoa(p)} className="text-danger text-sm hover:underline ml-1">Xoá</button>
                        </>
                      ) : (
                        <span className="text-xs text-muted">Phiếu đã duyệt — không thể sửa/xoá</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {loc.length === 0 && (
          <div className="card px-3 py-10 text-center text-muted">
            {phieu.length === 0 ? (
              <>Chưa có phiếu nào. <Link href="/dang-ky" className="text-accent-600">Lập phiếu đầu tiên</Link>.</>
            ) : (
              'Không có phiếu khớp bộ lọc.'
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!xacNhan}
        message={xacNhan?.message || ''}
        onConfirm={() => {
          const f = xacNhan?.onOk
          setXacNhan(null)
          f?.()
        }}
        onClose={() => setXacNhan(null)}
      />
    </div>
  )
}
