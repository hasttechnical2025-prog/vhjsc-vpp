'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatThang, formatTien, formatDate } from '@/lib/format'
import ConfirmDialog from './ConfirmDialog'

type Row = {
  id: string
  phong_ban_id: string | null
  phong_ban_ten: string
  nguoi_de_nghi_ten: string
  thang: string
  tong_tien: number
  created_at: string
}

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
  const [err, setErr] = useState('')
  const [xacNhan, setXacNhan] = useState<{ message: string; onOk: () => void } | null>(null)

  const loc = useMemo(
    () => phieu.filter((p) => (!thang || p.thang === thang) && (!pb || p.phong_ban_id === pb)),
    [phieu, thang, pb],
  )

  function xoa(p: Row) {
    setErr('')
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
        {(thang || pb) && (
          <button
            onClick={() => {
              setThang('')
              setPb('')
            }}
            className="text-sm text-muted hover:text-accent-600 pb-1.5"
          >
            Xoá lọc
          </button>
        )}
        <div className="text-sm text-muted pb-1.5 ml-auto">{loc.length} phiếu</div>
      </div>

      {err && <div className="text-sm text-danger mb-3">{err}</div>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-accent-50 text-accent-600">
            <tr className="text-left">
              <th className="px-3 py-2 font-semibold">Tháng</th>
              <th className="px-3 py-2 font-semibold">Phòng ban</th>
              <th className="px-3 py-2 font-semibold">Người đề nghị</th>
              <th className="px-3 py-2 font-semibold">Ngày lập</th>
              <th className="px-3 py-2 font-semibold text-right">Tạm tính</th>
              <th className="px-3 py-2 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loc.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-accent-50/40">
                <td className="px-3 py-2">{formatThang(p.thang)}</td>
                <td className="px-3 py-2">{p.phong_ban_ten || '—'}</td>
                <td className="px-3 py-2">{p.nguoi_de_nghi_ten}</td>
                <td className="px-3 py-2">{formatDate(p.created_at)}</td>
                <td className="px-3 py-2 text-right">{formatTien(p.tong_tien)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Link href={`/phieu/${p.id}`} className="text-accent-600 hover:underline">Xem</Link>
                  <a href={`/api/phieu/${p.id}/pdf`} target="_blank" rel="noreferrer" className="text-accent-600 hover:underline ml-3">PDF</a>
                  <Link href={`/phieu/${p.id}/sua`} className="text-accent-600 hover:underline ml-3">Sửa</Link>
                  <button onClick={() => xoa(p)} className="text-danger hover:underline ml-3">Xoá</button>
                </td>
              </tr>
            ))}
            {loc.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  {phieu.length === 0 ? (
                    <>Chưa có phiếu nào. <Link href="/dang-ky" className="text-accent-600">Lập phiếu đầu tiên</Link>.</>
                  ) : (
                    'Không có phiếu khớp bộ lọc.'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
