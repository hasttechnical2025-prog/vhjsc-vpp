'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatTien, formatThang, thangHienTai } from '@/lib/format'
import type { SanPham } from '@/lib/types'
import DateField from './DateField'

type Dong = {
  key: string
  san_pham_id: number | null
  ten: string
  ten_tay: string | null
  dvt: string | null
  don_gia: number | null
  anh: string | null
  bien_the: string[] | null // các màu có thể chọn (null = không có biến thể)
  so_luong: number // dùng khi KHÔNG có biến thể
  mauSL: Record<string, number> // dùng khi CÓ biến thể: { Xanh: 5, Đỏ: 3 }
  ghi_chu: string
  showGhiChu: boolean
}

type InitDong = {
  san_pham_id: number | null
  ten_hang: string | null
  ten_tay: string | null
  dvt: string | null
  don_gia: number | null
  so_luong: number
  mau: string | null
  ghi_chu: string | null
}
export type PhieuBanDau = {
  thang: string
  tieu_de: string | null
  thoi_gian_can: string | null
  ke_hoach_su_dung: string | null
  dong: InitDong[]
}

let seq = 0
const newKey = () => `k${Date.now()}_${seq++}`

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center border border-border rounded-md shrink-0">
      <button
        onClick={() => onChange(value - 1)}
        className="w-7 h-7 text-muted hover:text-accent-600 leading-none"
        aria-label="Giảm"
      >
        −
      </button>
      <input
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
          onChange(isNaN(n) ? 0 : n)
        }}
        className="w-9 h-7 text-center text-sm outline-none border-x border-border"
      />
      <button
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 text-muted hover:text-accent-600 leading-none"
        aria-label="Tăng"
      >
        +
      </button>
    </div>
  )
}

export default function LapPhieu({
  sanPham,
  nguoiDeNghi,
  phongBanTen,
  phieuId,
  initial,
}: {
  sanPham: SanPham[]
  nguoiDeNghi: string
  phongBanTen: string
  phieuId?: string
  initial?: PhieuBanDau
}) {
  const router = useRouter()
  const laSua = !!phieuId
  const thangMacDinh = thangHienTai()
  const tieuDeMacDinh = (t: string) =>
    `Mua sắm văn phòng phẩm, tài sản, thiết bị tháng ${formatThang(t)}${phongBanTen ? ` cho ${phongBanTen}` : ''}`
  const [thang, setThang] = useState(initial?.thang || thangMacDinh)
  const [tieuDe, setTieuDe] = useState(initial?.tieu_de ?? tieuDeMacDinh(initial?.thang || thangMacDinh))
  const [tieuDeTuChinh, setTieuDeTuChinh] = useState(!!initial?.tieu_de)
  const [thoiGianCan, setThoiGianCan] = useState(initial?.thoi_gian_can || '')
  const [keHoachSuDung, setKeHoachSuDung] = useState(
    initial?.ke_hoach_su_dung ?? '1 tháng (hoặc tới khi dùng hết)',
  )
  const [moTT, setMoTT] = useState(false) // mở/thu gọn khối thông tin chung

  // Đổi tháng -> tự cập nhật tháng/năm trong Nội dung đề nghị (nếu người dùng chưa tự sửa)
  function doiThang(t: string) {
    setThang(t)
    if (!tieuDeTuChinh) setTieuDe(tieuDeMacDinh(t))
  }
  function doiTieuDe(v: string) {
    setTieuDe(v)
    setTieuDeTuChinh(v.trim() !== tieuDeMacDinh(thang).trim())
  }
  const [dong, setDong] = useState<Dong[]>(() => {
    if (!initial) return []
    const spMap = new Map(sanPham.map((s) => [s.id, s]))
    const lines: Dong[] = []
    const bienTheLine = new Map<number, Dong>() // gộp các dòng cùng SP (nhiều màu) về 1
    for (const d of initial.dong) {
      const sp = d.san_pham_id != null ? spMap.get(d.san_pham_id) : undefined
      const bt = sp?.bien_the || null
      if (d.san_pham_id != null && bt && bt.length && d.mau) {
        let line = bienTheLine.get(d.san_pham_id)
        if (!line) {
          line = {
            key: newKey(), san_pham_id: d.san_pham_id, ten: d.ten_hang || sp?.ten || '',
            ten_tay: null, dvt: d.dvt, don_gia: d.don_gia, anh: sp?.anh_url ?? null,
            bien_the: bt, so_luong: 0, mauSL: {}, ghi_chu: d.ghi_chu || '', showGhiChu: false,
          }
          bienTheLine.set(d.san_pham_id, line)
          lines.push(line)
        }
        line.mauSL[d.mau] = (line.mauSL[d.mau] || 0) + d.so_luong
      } else {
        lines.push({
          key: newKey(), san_pham_id: d.san_pham_id, ten: d.ten_hang || d.ten_tay || '',
          ten_tay: d.san_pham_id ? null : d.ten_tay || '', dvt: d.dvt, don_gia: d.don_gia,
          anh: d.san_pham_id ? spMap.get(d.san_pham_id)?.anh_url ?? null : null,
          bien_the: null, so_luong: d.so_luong, mauSL: {}, ghi_chu: d.ghi_chu || '', showGhiChu: false,
        })
      }
    }
    return lines
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // Tự cuộn danh sách phiếu tới mặt hàng vừa thêm (chỉ khi SỐ dòng tăng — thêm mới,
  // không cuộn khi chỉ chỉnh số lượng). Bỏ qua lần dựng lại ban đầu.
  const listRef = useRef<HTMLDivElement>(null)
  const soDongTruoc = useRef(dong.length)
  useEffect(() => {
    if (dong.length > soDongTruoc.current) {
      const el = listRef.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
    soDongTruoc.current = dong.length
  }, [dong.length])

  const nhomList = useMemo(() => Array.from(new Set(sanPham.map((s) => s.nhom_hang))), [sanPham])
  const [nhom, setNhom] = useState<string>(nhomList[0] || '')
  const [tuKhoa, setTuKhoa] = useState('')

  const danhSachHienThi = useMemo(() => {
    const kw = tuKhoa.trim().toLowerCase()
    return sanPham.filter((s) => (kw ? s.ten.toLowerCase().includes(kw) : s.nhom_hang === nhom))
  }, [sanPham, nhom, tuKhoa])

  const dongTheoSp = useMemo(() => {
    const m = new Map<number, Dong>()
    for (const d of dong) if (d.san_pham_id != null) m.set(d.san_pham_id, d)
    return m
  }, [dong])

  function capNhat(key: string, patch: Partial<Dong>) {
    setDong((d) => d.map((x) => (x.key === key ? { ...x, ...patch } : x)))
  }
  function xoa(key: string) {
    setDong((d) => d.filter((x) => x.key !== key))
  }
  function datSoLuong(key: string, n: number) {
    if (n <= 0) return xoa(key)
    capNhat(key, { so_luong: n })
  }
  // Nhập số lượng theo màu (SP có biến thể)
  function datMau(key: string, mau: string, n: number) {
    setDong((d) =>
      d.map((x) => {
        if (x.key !== key) return x
        const m = { ...x.mauSL }
        if (n <= 0) delete m[mau]
        else m[mau] = n
        return { ...x, mauSL: m }
      }),
    )
  }
  const tongSL = (d: Dong) =>
    d.bien_the && d.bien_the.length ? Object.values(d.mauSL).reduce((a, b) => a + (b || 0), 0) : d.so_luong

  function taoDong(sp: SanPham, n: number): Dong {
    return {
      key: newKey(), san_pham_id: sp.id, ten: sp.ten, ten_tay: null, dvt: sp.dvt,
      don_gia: sp.don_gia, anh: sp.anh_url, bien_the: sp.bien_the || null,
      so_luong: n, mauSL: {}, ghi_chu: '', showGhiChu: false,
    }
  }
  // SP KHÔNG biến thể: thêm/chỉnh số lượng từ thẻ trái (stepper)
  function datSoLuongSp(sp: SanPham, n: number) {
    const cur = dongTheoSp.get(sp.id)
    if (cur) {
      if (n <= 0) xoa(cur.key)
      else capNhat(cur.key, { so_luong: n })
      return
    }
    if (n <= 0) return
    setMoTT(false)
    setDong((d) => [...d, taoDong(sp, n)])
  }
  // SP CÓ biến thể: thêm/bỏ (số lượng nhập theo màu ở giỏ)
  function toggleSpBienThe(sp: SanPham) {
    const cur = dongTheoSp.get(sp.id)
    if (cur) return xoa(cur.key)
    setMoTT(false)
    setDong((d) => [...d, taoDong(sp, 0)])
  }

  function themMucKhac() {
    setMoTT(false)
    setDong((d) => [
      ...d,
      {
        key: newKey(), san_pham_id: null, ten: '', ten_tay: '', dvt: '', don_gia: null,
        anh: null, bien_the: null, so_luong: 1, mauSL: {}, ghi_chu: '', showGhiChu: false,
      },
    ])
  }

  const tongTien = dong.reduce((s, d) => s + (d.don_gia || 0) * tongSL(d), 0)
  const soMatHang = dong.length

  async function luuPhieu() {
    setErr('')
    // Dòng hợp lệ: mục khác phải có tên; SP biến thể phải có ít nhất 1 màu > 0
    const hople = dong.filter((d) => {
      if (!d.san_pham_id) return !!(d.ten_tay || '').trim()
      if (d.bien_the && d.bien_the.length) return tongSL(d) > 0
      return true
    })
    if (hople.length === 0) {
      setErr('Chưa có mặt hàng nào (hoặc SP nhiều màu chưa nhập số lượng)')
      return
    }
    // Mở rộng dòng biến thể thành nhiều dòng theo màu
    const dongGui: Record<string, unknown>[] = []
    let stt = 0
    for (const d of hople) {
      if (d.san_pham_id && d.bien_the && d.bien_the.length) {
        for (const [mau, sl] of Object.entries(d.mauSL)) {
          if (!sl || sl <= 0) continue
          dongGui.push({
            san_pham_id: d.san_pham_id, ten_hang: d.ten, ten_tay: null, dvt: d.dvt,
            don_gia: d.don_gia, so_luong: sl, mau, ghi_chu: d.ghi_chu, thu_tu: stt++,
          })
        }
      } else {
        dongGui.push({
          san_pham_id: d.san_pham_id,
          ten_hang: d.san_pham_id ? d.ten : (d.ten_tay || '').trim(),
          ten_tay: d.san_pham_id ? null : (d.ten_tay || '').trim(),
          dvt: d.dvt, don_gia: d.don_gia, so_luong: d.so_luong, mau: null, ghi_chu: d.ghi_chu, thu_tu: stt++,
        })
      }
    }
    setSaving(true)
    try {
      const res = await fetch(phieuId ? `/api/phieu/${phieuId}` : '/api/phieu', {
        method: phieuId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thang,
          tieu_de: tieuDe,
          thoi_gian_can: thoiGianCan,
          ke_hoach_su_dung: keHoachSuDung,
          dong: dongGui,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || 'Lưu phiếu thất bại')
        return
      }
      router.push(`/vpp/phieu/${phieuId || data.id}`)
      router.refresh()
    } catch {
      setErr('Lỗi kết nối')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
      {/* CỘT TRÁI: danh mục */}
      <div>
        <h1 className="text-xl font-bold mb-3">{laSua ? 'Sửa phiếu đề xuất' : 'Lập phiếu đề xuất VPP'}</h1>
        <input
          placeholder="Tìm sản phẩm theo tên…"
          value={tuKhoa}
          onChange={(e) => setTuKhoa(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 mb-3 outline-none focus:border-accent bg-surface"
        />
        {!tuKhoa && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {nhomList.map((n) => (
              <button
                key={n}
                onClick={() => setNhom(n)}
                className={`px-2.5 py-1 rounded-full text-xs border ${
                  n === nhom
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface border-border text-foreground/70 hover:border-accent'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {danhSachHienThi.map((sp) => {
            const cur = dongTheoSp.get(sp.id)
            return (
              <div key={sp.id} className="card p-2.5 flex flex-col">
                <div className="aspect-square bg-white rounded-md border border-border mb-2 overflow-hidden flex items-center justify-center">
                  {sp.anh_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sp.anh_url} alt={sp.ten} className="max-h-full max-w-full object-contain" loading="lazy" />
                  ) : (
                    <span className="text-xs text-muted">Không ảnh</span>
                  )}
                </div>
                <div className="text-xs font-medium leading-snug line-clamp-2 min-h-[2.2em]">{sp.ten}</div>
                <div className="text-[11px] text-muted mt-0.5">
                  <span className="text-accent-600/70">MH {sp.id}</span> · {sp.quy_cach} · {sp.dvt}
                  {sp.bien_the && sp.bien_the.length ? <span className="text-warn"> · nhiều màu</span> : null}
                </div>
                <div className="text-sm font-semibold text-accent-600 mt-0.5 mb-2">{formatTien(sp.don_gia)}</div>
                {sp.bien_the && sp.bien_the.length ? (
                  <button
                    onClick={() => toggleSpBienThe(sp)}
                    className={`mt-auto rounded-md py-1 text-xs font-medium ${cur ? 'bg-accent-50 text-accent-600' : 'bg-accent text-white hover:bg-accent-600'}`}
                  >
                    {cur ? '✓ Đã thêm' : '+ Thêm (chọn màu)'}
                  </button>
                ) : cur ? (
                  <div className="mt-auto flex justify-center">
                    <Stepper value={cur.so_luong} onChange={(n) => datSoLuongSp(sp, n)} />
                  </div>
                ) : (
                  <button
                    onClick={() => datSoLuongSp(sp, 1)}
                    className="mt-auto rounded-md py-1 text-xs font-medium bg-accent text-white hover:bg-accent-600"
                  >
                    + Thêm
                  </button>
                )}
              </div>
            )
          })}
          {danhSachHienThi.length === 0 && (
            <div className="col-span-full text-sm text-muted py-8 text-center">Không có sản phẩm phù hợp</div>
          )}
        </div>
      </div>

      {/* CỘT PHẢI: giỏ hàng / phiếu */}
      <div className="lg:sticky lg:top-[108px] self-start">
        <div className="card p-4 lg:flex lg:flex-col lg:max-h-[calc(100vh_-_124px)]">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <span className="font-semibold">Phiếu đề xuất</span>
            <span className="text-sm text-accent-600 font-medium">{soMatHang} mặt hàng</span>
          </div>

          {/* Thông tin chung của phiếu — thu gọn để chừa chỗ cho danh sách hàng */}
          <div className="border border-border rounded-xl mb-3 bg-white shrink-0">
            <button
              type="button"
              onClick={() => setMoTT(!moTT)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
            >
              <div className="min-w-0">
                <div className="text-[11px] text-muted">Thông tin chung của phiếu</div>
                {!moTT && (
                  <div className="text-xs truncate text-foreground/80">
                    Tháng {formatThang(thang)}
                    {thoiGianCan ? ` · Cần ${thoiGianCan}` : ''}
                    {keHoachSuDung ? ` · ${keHoachSuDung}` : ''}
                  </div>
                )}
              </div>
              <span className="text-xs text-accent-600 shrink-0">{moTT ? 'Thu gọn ▲' : 'Sửa ▼'}</span>
            </button>

            {moTT && (
              <div className="px-3 pb-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[11px] text-muted mb-0.5">Tháng</div>
                    <input
                      type="month"
                      value={thang}
                      onChange={(e) => doiThang(e.target.value)}
                      className="w-full border border-border rounded-md px-2 py-1 text-sm outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] text-muted mb-0.5">Người đề nghị</div>
                    <div className="text-sm py-1 truncate" title={nguoiDeNghi}>{nguoiDeNghi}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted mb-0.5">Thời gian cần</div>
                    <DateField value={thoiGianCan} onChange={setThoiGianCan} className="w-full" />
                  </div>
                  <div>
                    <div className="text-[11px] text-muted mb-0.5">Kế hoạch sử dụng</div>
                    <input
                      value={keHoachSuDung}
                      onChange={(e) => setKeHoachSuDung(e.target.value)}
                      placeholder="VD: 1 tháng"
                      className="w-full border border-border rounded-md px-2 py-1 text-sm outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-[11px] text-muted mb-0.5">Nội dung đề nghị</div>
                  <textarea
                    value={tieuDe}
                    onChange={(e) => doiTieuDe(e.target.value)}
                    rows={2}
                    className="w-full border border-border rounded-md px-2 py-1 text-sm outline-none focus:border-accent"
                  />
                </div>
                <div className="text-[11px] text-muted mt-1.5">Thời gian cần / Kế hoạch dùng chung cho cả phiếu</div>
              </div>
            )}
          </div>

          {/* Danh sách mặt hàng — cuộn trong; trên desktop chiếm hết chỗ còn lại để nút Lưu luôn hiện */}
          <div ref={listRef} className="overflow-auto -mx-1 px-1 max-h-[44vh] lg:max-h-none lg:flex-1 lg:min-h-0">
            {dong.length === 0 && (
              <div className="text-sm text-muted text-center py-6">Chưa có mặt hàng nào. Chọn từ danh mục bên trái.</div>
            )}
            {dong.map((d) => (
              <div key={d.key} className="border-t border-border py-2 first:border-t-0">
                <div className="flex gap-2.5">
                  {/* Ảnh */}
                  {d.san_pham_id ? (
                    <div className="w-10 h-10 rounded-md border border-border bg-white overflow-hidden flex items-center justify-center shrink-0">
                      {d.anh ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.anh} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
                      ) : (
                        <span className="text-[10px] text-muted">—</span>
                      )}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-md border border-dashed border-border flex items-center justify-center shrink-0 text-muted">
                      ✎
                    </div>
                  )}

                  {/* Nội dung */}
                  <div className="flex-1 min-w-0">
                    {/* Tên + nút xoá */}
                    <div className="flex items-start justify-between gap-2">
                      {d.san_pham_id ? (
                        <div className="text-sm font-medium leading-snug line-clamp-2" title={d.ten}>{d.ten}</div>
                      ) : (
                        <input
                          placeholder="Tên mặt hàng (mục khác)"
                          value={d.ten_tay || ''}
                          onChange={(e) => capNhat(d.key, { ten_tay: e.target.value })}
                          className="flex-1 border border-border rounded px-2 py-1 text-sm outline-none focus:border-accent"
                        />
                      )}
                      <button
                        onClick={() => xoa(d.key)}
                        className="text-muted hover:text-danger shrink-0 leading-none"
                        aria-label="Xoá"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Thông tin: mã hàng · ĐVT · đơn giá · ghi chú */}
                    <div className="text-xs text-muted mt-0.5 flex items-center flex-wrap gap-x-1.5">
                      {d.san_pham_id ? (
                        <>
                          <span className="text-accent-600/80">MH {d.san_pham_id}</span>
                          <span>·</span>
                          <span>{d.dvt}</span>
                          <span>·</span>
                          <span>{formatTien(d.don_gia)}đ</span>
                        </>
                      ) : (
                        <input
                          placeholder="ĐVT"
                          value={d.dvt || ''}
                          onChange={(e) => capNhat(d.key, { dvt: e.target.value })}
                          className="w-20 border border-border rounded px-1.5 py-0.5 text-xs outline-none focus:border-accent"
                        />
                      )}
                      {!d.showGhiChu && (
                        <>
                          <span>·</span>
                          <button onClick={() => capNhat(d.key, { showGhiChu: true })} className="hover:text-accent-600">
                            {d.ghi_chu ? '✎ ghi chú' : '＋ ghi chú'}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Số lượng + thành tiền */}
                    {d.bien_the && d.bien_the.length ? (
                      <div className="mt-1.5">
                        <div className="text-[11px] text-muted mb-1">Số lượng theo màu:</div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          {d.bien_the.map((mau) => (
                            <label key={mau} className="flex items-center gap-1 text-xs">
                              <span className="text-foreground/80">{mau}</span>
                              <input
                                inputMode="numeric"
                                value={d.mauSL[mau] || ''}
                                onChange={(e) => datMau(d.key, mau, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                                placeholder="0"
                                className="w-11 border border-border rounded px-1 py-0.5 text-center outline-none focus:border-accent"
                              />
                            </label>
                          ))}
                          <span className="ml-auto text-sm font-semibold text-foreground">
                            {d.don_gia ? formatTien(d.don_gia * tongSL(d)) + 'đ' : '—'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-1.5 gap-2">
                        <Stepper value={d.so_luong} onChange={(n) => datSoLuong(d.key, n)} />
                        <span className="text-sm font-semibold text-foreground">
                          {d.don_gia ? formatTien(d.don_gia * d.so_luong) + 'đ' : '—'}
                        </span>
                      </div>
                    )}

                    {/* Ghi chú (mở) */}
                    {d.showGhiChu && (
                      <div className="mt-1.5">
                        <input
                          placeholder="Ghi chú cho mặt hàng này"
                          value={d.ghi_chu}
                          onChange={(e) => capNhat(d.key, { ghi_chu: e.target.value })}
                          className="w-full border border-border rounded px-2 py-1 text-sm outline-none focus:border-accent"
                          autoFocus
                        />
                        <button
                          onClick={() => capNhat(d.key, { showGhiChu: false })}
                          className="text-xs text-muted hover:text-accent-600 mt-1"
                        >
                          Thu gọn ghi chú
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={themMucKhac}
            className="w-full mt-3 border border-dashed border-border rounded-lg py-1.5 text-sm text-muted hover:border-accent hover:text-accent-600 shrink-0"
          >
            + Thêm mục khác (gõ tay)
          </button>

          {err && <div className="text-sm text-danger mt-3 shrink-0">{err}</div>}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border shrink-0">
            <div className="text-xs text-muted">
              Tạm tính (tham khảo)
              <div className="text-lg font-semibold text-foreground">{formatTien(tongTien)} đ</div>
            </div>
            <button
              onClick={luuPhieu}
              disabled={saving}
              className="bg-accent hover:bg-accent-600 text-white rounded-lg px-6 py-2.5 font-medium disabled:opacity-60"
            >
              {saving ? 'Đang lưu…' : laSua ? 'Lưu thay đổi' : 'Lưu phiếu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
