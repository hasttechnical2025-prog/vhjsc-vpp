'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatTien, formatThang, thangHienTai } from '@/lib/format'
import type { SanPham } from '@/lib/types'

type Dong = {
  key: string
  san_pham_id: number | null
  ten: string
  ten_tay: string | null
  dvt: string | null
  don_gia: number | null
  anh: string | null
  so_luong: number
  ghi_chu: string
  showGhiChu: boolean
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
}: {
  sanPham: SanPham[]
  nguoiDeNghi: string
  phongBanTen: string
}) {
  const router = useRouter()
  const thangMacDinh = thangHienTai()
  const [thang, setThang] = useState(thangMacDinh)
  const [tieuDe, setTieuDe] = useState(
    `Mua sắm văn phòng phẩm tháng ${formatThang(thangMacDinh)}${phongBanTen ? ` cho ${phongBanTen}` : ''}`,
  )
  const [thoiGianCan, setThoiGianCan] = useState(formatThang(thangMacDinh))
  const [keHoachSuDung, setKeHoachSuDung] = useState('')
  const [dong, setDong] = useState<Dong[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

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

  // Thêm / chỉnh số lượng SP catalog ngay từ thẻ bên trái
  function datSoLuongSp(sp: SanPham, n: number) {
    const cur = dongTheoSp.get(sp.id)
    if (cur) {
      if (n <= 0) xoa(cur.key)
      else capNhat(cur.key, { so_luong: n })
      return
    }
    if (n <= 0) return
    setDong((d) => [
      ...d,
      {
        key: newKey(),
        san_pham_id: sp.id,
        ten: sp.ten,
        ten_tay: null,
        dvt: sp.dvt,
        don_gia: sp.don_gia,
        anh: sp.anh_url,
        so_luong: n,
        ghi_chu: '',
        showGhiChu: false,
      },
    ])
  }

  function themMucKhac() {
    setDong((d) => [
      ...d,
      {
        key: newKey(),
        san_pham_id: null,
        ten: '',
        ten_tay: '',
        dvt: '',
        don_gia: null,
        anh: null,
        so_luong: 1,
        ghi_chu: '',
        showGhiChu: false,
      },
    ])
  }

  const tongTien = dong.reduce((s, d) => s + (d.don_gia || 0) * (d.so_luong || 0), 0)
  const soMatHang = dong.length

  async function luuPhieu() {
    setErr('')
    const hople = dong.filter((d) => (d.san_pham_id ? true : (d.ten_tay || '').trim()))
    if (hople.length === 0) {
      setErr('Chưa có mặt hàng nào trong phiếu')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/phieu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thang,
          tieu_de: tieuDe,
          thoi_gian_can: thoiGianCan,
          ke_hoach_su_dung: keHoachSuDung,
          dong: hople.map((d, i) => ({
            san_pham_id: d.san_pham_id,
            ten_tay: d.san_pham_id ? null : (d.ten_tay || '').trim(),
            dvt: d.dvt,
            don_gia: d.don_gia,
            so_luong: d.so_luong,
            ghi_chu: d.ghi_chu,
            thu_tu: i,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || 'Lưu phiếu thất bại')
        return
      }
      router.push(`/phieu/${data.id}`)
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
        <h1 className="text-xl font-bold mb-3">Lập phiếu đề xuất VPP</h1>
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
                  {sp.quy_cach} · {sp.dvt}
                </div>
                <div className="text-sm font-semibold text-accent-600 mt-0.5 mb-2">{formatTien(sp.don_gia)}</div>
                {cur ? (
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
      <div className="lg:sticky lg:top-4 self-start">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold">Phiếu đề xuất</span>
            <span className="text-sm text-accent-600 font-medium">{soMatHang} mặt hàng</span>
          </div>

          {/* Thông tin chung của phiếu */}
          <div className="border border-border rounded-xl p-3 mb-3 bg-white">
            <div className="text-[11px] text-muted mb-2">Thông tin chung của phiếu</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[11px] text-muted mb-0.5">Tháng</div>
                <input
                  type="month"
                  value={thang}
                  onChange={(e) => setThang(e.target.value)}
                  className="w-full border border-border rounded-md px-2 py-1 text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <div className="text-[11px] text-muted mb-0.5">Người đề nghị</div>
                <div className="text-sm py-1 truncate" title={nguoiDeNghi}>{nguoiDeNghi}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted mb-0.5">Thời gian cần</div>
                <input
                  value={thoiGianCan}
                  onChange={(e) => setThoiGianCan(e.target.value)}
                  className="w-full border border-border rounded-md px-2 py-1 text-sm outline-none focus:border-accent"
                />
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
                onChange={(e) => setTieuDe(e.target.value)}
                rows={2}
                className="w-full border border-border rounded-md px-2 py-1 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="text-[11px] text-muted mt-1.5">Thời gian cần / Kế hoạch dùng chung cho cả phiếu</div>
          </div>

          {/* Danh sách mặt hàng */}
          <div className="max-h-[44vh] overflow-auto -mx-1 px-1">
            {dong.length === 0 && (
              <div className="text-sm text-muted text-center py-6">Chưa có mặt hàng nào. Chọn từ danh mục bên trái.</div>
            )}
            {dong.map((d) => (
              <div key={d.key} className="border-t border-border py-2.5 first:border-t-0">
                <div className="flex items-center gap-2.5">
                  {d.san_pham_id ? (
                    <div className="w-11 h-11 rounded-md border border-border bg-white overflow-hidden flex items-center justify-center shrink-0">
                      {d.anh ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.anh} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
                      ) : (
                        <span className="text-[10px] text-muted">—</span>
                      )}
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-md border border-dashed border-border flex items-center justify-center shrink-0 text-muted text-xs">
                      ✎
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {d.san_pham_id ? (
                      <div className="text-sm leading-tight truncate" title={d.ten}>{d.ten}</div>
                    ) : (
                      <input
                        placeholder="Tên mặt hàng (mục khác)"
                        value={d.ten_tay || ''}
                        onChange={(e) => capNhat(d.key, { ten_tay: e.target.value })}
                        className="w-full border border-border rounded px-2 py-1 text-sm outline-none focus:border-accent"
                      />
                    )}
                    <div className="text-[12px] text-muted mt-0.5 flex items-center gap-1.5">
                      {d.san_pham_id ? (
                        <>
                          <span>{d.dvt}</span>
                          <span>·</span>
                          <span className="text-accent-600">{formatTien(d.don_gia)}</span>
                        </>
                      ) : (
                        <input
                          placeholder="ĐVT"
                          value={d.dvt || ''}
                          onChange={(e) => capNhat(d.key, { dvt: e.target.value })}
                          className="w-16 border border-border rounded px-1.5 py-0.5 text-xs outline-none focus:border-accent"
                        />
                      )}
                      <button
                        onClick={() => capNhat(d.key, { showGhiChu: !d.showGhiChu })}
                        className="text-muted hover:text-accent-600"
                      >
                        {d.showGhiChu ? '− ghi chú' : '＋ ghi chú'}
                      </button>
                    </div>
                  </div>

                  <Stepper value={d.so_luong} onChange={(n) => datSoLuong(d.key, n)} />

                  <div className="w-16 text-right text-sm font-medium shrink-0">
                    {d.don_gia ? formatTien(d.don_gia * d.so_luong) : '—'}
                  </div>

                  <button onClick={() => xoa(d.key)} className="text-danger w-6 shrink-0 text-base leading-none" aria-label="Xoá">
                    ✕
                  </button>
                </div>

                {d.showGhiChu && (
                  <input
                    placeholder="Ghi chú cho mặt hàng này"
                    value={d.ghi_chu}
                    onChange={(e) => capNhat(d.key, { ghi_chu: e.target.value })}
                    className="w-full border border-border rounded px-2 py-1 text-sm mt-2 outline-none focus:border-accent"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={themMucKhac}
            className="w-full mt-3 border border-dashed border-border rounded-lg py-1.5 text-sm text-muted hover:border-accent hover:text-accent-600"
          >
            + Thêm mục khác (gõ tay)
          </button>

          {err && <div className="text-sm text-danger mt-3">{err}</div>}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="text-xs text-muted">
              Tạm tính (tham khảo)
              <div className="text-lg font-semibold text-foreground">{formatTien(tongTien)} đ</div>
            </div>
            <button
              onClick={luuPhieu}
              disabled={saving}
              className="bg-accent hover:bg-accent-600 text-white rounded-lg px-6 py-2.5 font-medium disabled:opacity-60"
            >
              {saving ? 'Đang lưu…' : 'Lưu phiếu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
