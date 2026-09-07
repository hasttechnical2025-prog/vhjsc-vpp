'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatTien, dmyToIso } from '@/lib/format'
import DateField from './DateField'

type KetQua = {
  kpi: { tongTien: number; soPhieu: number; soPhong: number; soMatHang: number }
  tongHopMua: { ma: string; ten: string; mau: string; nhom: string; dvt: string; tong_sl: number; don_gia: number; thanh_tien: number }[]
  theoPhong: { phong: string; so_phieu: number; tong_tien: number }[]
  theoNhom: { nhom: string; thanh_tien: number; ty_le: number }[]
  topSanPham: { ten: string; tong_sl: number; thanh_tien: number }[]
  xuHuong: { thang: string; tong_tien: number }[]
}

// Thanh ngang: nhãn trái, thanh tỉ lệ theo max, giá trị phải.
function ThanhNgang({ nhan, giaTri, max, phu }: { nhan: string; giaTri: number; max: number; phu?: string }) {
  const pct = max > 0 ? Math.max(2, (giaTri / max) * 100) : 0
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="w-40 shrink-0 truncate" title={nhan}>{nhan}</div>
      <div className="flex-1 bg-accent-50 rounded h-4 overflow-hidden">
        <div className="h-full bg-accent rounded" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-28 shrink-0 text-right tabular-nums">{formatTien(giaTri)}{phu ? <span className="text-muted"> {phu}</span> : ''}</div>
    </div>
  )
}

function macDinhTu() {
  const d = new Date()
  return `01/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
function macDinhDen() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default function ThongKe({ phongBan }: { phongBan: { id: string; ten: string }[] }) {
  const [tu, setTu] = useState(macDinhTu())
  const [den, setDen] = useState(macDinhDen())
  const [pb, setPb] = useState('')
  const [data, setData] = useState<KetQua | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    const tuISO = dmyToIso(tu)
    const denISO = dmyToIso(den)
    if (tuISO) p.set('tu', tuISO)
    if (denISO) p.set('den', denISO)
    if (pb) p.set('pb', pb)
    return p.toString()
  }, [tu, den, pb])

  const tai = useCallback(async () => {
    setErr('')
    setLoading(true)
    try {
      const r = await fetch('/api/thong-ke?' + qs, { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) {
        setErr(d.error || 'Lỗi tải thống kê')
        return
      }
      setData(d)
    } catch {
      setErr('Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }, [qs])

  useEffect(() => {
    tai()
  }, [tai])

  const inp = 'border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent bg-surface'

  const kpiCards = data
    ? [
        { label: 'Tổng chi phí', value: `${formatTien(data.kpi.tongTien)} đ` },
        { label: 'Số phiếu', value: data.kpi.soPhieu.toLocaleString('vi-VN') },
        { label: 'Số phòng', value: data.kpi.soPhong.toLocaleString('vi-VN') },
        { label: 'Số mặt hàng', value: data.kpi.soMatHang.toLocaleString('vi-VN') },
      ]
    : []

  return (
    <div>
      {/* Bộ lọc */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <div className="text-xs text-muted mb-1">Từ ngày</div>
          <DateField value={tu} onChange={setTu} className="w-36" />
        </div>
        <div>
          <div className="text-xs text-muted mb-1">Đến ngày</div>
          <DateField value={den} onChange={setDen} className="w-36" />
        </div>
        <div>
          <div className="text-xs text-muted mb-1">Phòng ban</div>
          <select value={pb} onChange={(e) => setPb(e.target.value)} className={inp}>
            <option value="">— Tất cả phòng —</option>
            {phongBan.map((p) => (
              <option key={p.id} value={p.id}>{p.ten}</option>
            ))}
          </select>
        </div>
        <a
          href={'/api/thong-ke/excel?' + qs}
          className="ml-auto bg-ok text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          ⬇ Xuất Excel
        </a>
      </div>

      {err && <div className="text-sm text-danger mb-3">{err}</div>}
      {loading && <div className="text-sm text-muted mb-3">Đang tải…</div>}

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {kpiCards.map((c) => (
          <div key={c.label} className="card p-4">
            <div className="text-2xl font-bold text-accent-600">{c.value}</div>
            <div className="text-sm text-muted mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Tổng hợp mua sắm */}
          <div className="card overflow-hidden">
            <div className="px-4 py-2.5 font-semibold border-b border-border">Tổng hợp mua sắm ({data.tongHopMua.length})</div>
            <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-accent-50 text-accent-600 sticky top-0">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-semibold">Nhóm</th>
                    <th className="px-3 py-2 font-semibold w-12">Mã</th>
                    <th className="px-3 py-2 font-semibold">Tên</th>
                    <th className="px-3 py-2 font-semibold">ĐVT</th>
                    <th className="px-3 py-2 font-semibold text-right">Tổng SL</th>
                    <th className="px-3 py-2 font-semibold text-right">Đơn giá</th>
                    <th className="px-3 py-2 font-semibold text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tongHopMua.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5 text-muted">{r.nhom}</td>
                      <td className="px-3 py-1.5 text-muted">{r.ma || '—'}</td>
                      <td className="px-3 py-1.5">{r.ten}{r.mau ? <span className="text-muted"> ({r.mau})</span> : null}</td>
                      <td className="px-3 py-1.5">{r.dvt}</td>
                      <td className="px-3 py-1.5 text-right font-medium">{r.tong_sl.toLocaleString('vi-VN')}</td>
                      <td className="px-3 py-1.5 text-right">{formatTien(r.don_gia)}</td>
                      <td className="px-3 py-1.5 text-right">{formatTien(r.thanh_tien)}</td>
                    </tr>
                  ))}
                  {data.tongHopMua.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">Không có dữ liệu.</td></tr>
                  )}
                </tbody>
                {data.tongHopMua.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-border font-semibold bg-accent-50/40">
                      <td className="px-3 py-2" colSpan={6}>Tổng cộng</td>
                      <td className="px-3 py-2 text-right text-accent-600">{formatTien(data.kpi.tongTien)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Chi phí theo phòng */}
          <div className="card overflow-hidden self-start">
            <div className="px-4 py-2.5 font-semibold border-b border-border">Chi phí theo phòng ({data.theoPhong.length})</div>
            <table className="w-full text-sm">
              <thead className="bg-accent-50 text-accent-600">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold">Phòng ban</th>
                  <th className="px-3 py-2 font-semibold text-right">Phiếu</th>
                  <th className="px-3 py-2 font-semibold text-right">Tổng tiền</th>
                </tr>
              </thead>
              <tbody>
                {data.theoPhong.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-1.5">{r.phong}</td>
                    <td className="px-3 py-1.5 text-right text-muted">{r.so_phieu}</td>
                    <td className="px-3 py-1.5 text-right font-medium">{formatTien(r.tong_tien)}</td>
                  </tr>
                ))}
                {data.theoPhong.length === 0 && (
                  <tr><td colSpan={3} className="px-3 py-8 text-center text-muted">Không có dữ liệu.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && data.kpi.soPhieu > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Chi phí theo nhóm hàng (%) */}
          <div className="card p-4">
            <div className="font-semibold mb-3">Chi phí theo nhóm hàng</div>
            <div className="space-y-1.5">
              {data.theoNhom.map((n) => (
                <ThanhNgang key={n.nhom} nhan={n.nhom} giaTri={n.thanh_tien} max={data.theoNhom[0]?.thanh_tien || 0} phu={`· ${n.ty_le.toFixed(1)}%`} />
              ))}
              {data.theoNhom.length === 0 && <div className="text-sm text-muted py-4 text-center">Không có dữ liệu.</div>}
            </div>
          </div>

          {/* So sánh giữa các phòng */}
          <div className="card p-4">
            <div className="font-semibold mb-3">So sánh chi phí giữa các phòng</div>
            <div className="space-y-1.5">
              {data.theoPhong.map((p) => (
                <ThanhNgang key={p.phong} nhan={p.phong} giaTri={p.tong_tien} max={data.theoPhong[0]?.tong_tien || 0} phu={`· ${p.so_phieu} phiếu`} />
              ))}
              {data.theoPhong.length === 0 && <div className="text-sm text-muted py-4 text-center">Không có dữ liệu.</div>}
            </div>
          </div>

          {/* Top sản phẩm mua nhiều */}
          <div className="card p-4">
            <div className="font-semibold mb-3">Top 10 sản phẩm (theo thành tiền)</div>
            <div className="space-y-1.5">
              {data.topSanPham.map((s, i) => (
                <ThanhNgang key={i} nhan={`${i + 1}. ${s.ten}`} giaTri={s.thanh_tien} max={data.topSanPham[0]?.thanh_tien || 0} phu={`· SL ${s.tong_sl.toLocaleString('vi-VN')}`} />
              ))}
              {data.topSanPham.length === 0 && <div className="text-sm text-muted py-4 text-center">Không có dữ liệu.</div>}
            </div>
          </div>

          {/* Xu hướng theo tháng */}
          <div className="card p-4">
            <div className="font-semibold mb-3">Xu hướng chi phí theo tháng</div>
            {data.xuHuong.length > 0 ? (
              <div className="flex items-end gap-2 h-44 pt-2">
                {data.xuHuong.map((t) => {
                  const max = Math.max(...data.xuHuong.map((x) => x.tong_tien)) || 1
                  const h = Math.max(4, (t.tong_tien / max) * 140)
                  return (
                    <div key={t.thang} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
                      <div className="text-[10px] text-muted tabular-nums whitespace-nowrap">{formatTien(t.tong_tien)}</div>
                      <div className="w-full bg-accent rounded-t" style={{ height: `${h}px` }} title={`${t.thang}: ${formatTien(t.tong_tien)} đ`} />
                      <div className="text-[11px] text-muted whitespace-nowrap">{t.thang.slice(5)}/{t.thang.slice(2, 4)}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-muted py-4 text-center">Không có dữ liệu.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
