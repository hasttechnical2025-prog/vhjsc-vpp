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
  so_luong: number
  thoi_gian_can: string
  ke_hoach_su_dung: string
  ghi_chu: string
}

let seq = 0
const newKey = () => `k${Date.now()}_${seq++}`

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
  const [ghiChu, setGhiChu] = useState('')
  const [dong, setDong] = useState<Dong[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // Bộ lọc danh mục
  const nhomList = useMemo(
    () => Array.from(new Set(sanPham.map((s) => s.nhom_hang))),
    [sanPham],
  )
  const [nhom, setNhom] = useState<string>(nhomList[0] || '')
  const [tuKhoa, setTuKhoa] = useState('')

  const danhSachHienThi = useMemo(() => {
    const kw = tuKhoa.trim().toLowerCase()
    return sanPham.filter((s) => {
      if (kw) return s.ten.toLowerCase().includes(kw)
      return s.nhom_hang === nhom
    })
  }, [sanPham, nhom, tuKhoa, nhomList])

  const daChon = useMemo(() => new Set(dong.map((d) => d.san_pham_id).filter(Boolean)), [dong])

  function themSanPham(sp: SanPham) {
    if (daChon.has(sp.id)) return
    setDong((d) => [
      ...d,
      {
        key: newKey(),
        san_pham_id: sp.id,
        ten: sp.ten,
        ten_tay: null,
        dvt: sp.dvt,
        don_gia: sp.don_gia,
        so_luong: 1,
        thoi_gian_can: '',
        ke_hoach_su_dung: '',
        ghi_chu: '',
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
        so_luong: 1,
        thoi_gian_can: '',
        ke_hoach_su_dung: '',
        ghi_chu: '',
      },
    ])
  }

  function capNhat(key: string, patch: Partial<Dong>) {
    setDong((d) => d.map((x) => (x.key === key ? { ...x, ...patch } : x)))
  }
  function xoa(key: string) {
    setDong((d) => d.filter((x) => x.key !== key))
  }

  const tongTien = dong.reduce((s, d) => s + (d.don_gia || 0) * (d.so_luong || 0), 0)

  async function luuPhieu() {
    setErr('')
    const hople = dong.filter((d) => (d.san_pham_id ? true : (d.ten_tay || '').trim()))
    if (hople.length === 0) {
      setErr('Chưa có dòng nào trong phiếu')
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
          ghi_chu: ghiChu,
          dong: hople.map((d, i) => ({
            san_pham_id: d.san_pham_id,
            ten_tay: d.san_pham_id ? null : (d.ten_tay || '').trim(),
            dvt: d.dvt,
            don_gia: d.don_gia,
            so_luong: d.so_luong,
            thoi_gian_can: d.thoi_gian_can,
            ke_hoach_su_dung: d.ke_hoach_su_dung,
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
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
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
            const added = daChon.has(sp.id)
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
                <div className="text-sm font-semibold text-accent-600 mt-0.5">{formatTien(sp.don_gia)}</div>
                <button
                  onClick={() => themSanPham(sp)}
                  disabled={added}
                  className={`mt-2 rounded-md py-1 text-xs font-medium ${
                    added ? 'bg-accent-50 text-accent-600' : 'bg-accent text-white hover:bg-accent-600'
                  }`}
                >
                  {added ? '✓ Đã thêm' : '+ Thêm'}
                </button>
              </div>
            )
          })}
          {danhSachHienThi.length === 0 && (
            <div className="col-span-full text-sm text-muted py-8 text-center">Không có sản phẩm phù hợp</div>
          )}
        </div>
      </div>

      {/* CỘT PHẢI: phiếu */}
      <div className="lg:sticky lg:top-4 self-start">
        <div className="card p-4">
          <div className="font-semibold mb-3">Phiếu đề xuất</div>

          <label className="block text-xs font-medium text-muted mb-1">Tháng</label>
          <input
            type="month"
            value={thang}
            onChange={(e) => setThang(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-1.5 mb-3 outline-none focus:border-accent bg-surface"
          />

          <label className="block text-xs font-medium text-muted mb-1">Nội dung đề nghị</label>
          <textarea
            value={tieuDe}
            onChange={(e) => setTieuDe(e.target.value)}
            rows={2}
            className="w-full border border-border rounded-lg px-3 py-1.5 mb-3 outline-none focus:border-accent bg-surface text-sm"
          />

          <div className="text-xs text-muted mb-2">
            Người đề nghị: <b className="text-foreground">{nguoiDeNghi}</b>
            {phongBanTen ? ` · ${phongBanTen}` : ''}
          </div>

          <div className="border-t border-border pt-3 space-y-3 max-h-[46vh] overflow-auto">
            {dong.length === 0 && <div className="text-sm text-muted text-center py-4">Chưa chọn sản phẩm nào</div>}
            {dong.map((d, i) => (
              <div key={d.key} className="border border-border rounded-lg p-2.5">
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted mt-1 w-4 shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    {d.san_pham_id ? (
                      <div className="text-sm font-medium leading-snug">{d.ten}</div>
                    ) : (
                      <input
                        placeholder="Tên mặt hàng (mục khác)"
                        value={d.ten_tay || ''}
                        onChange={(e) => capNhat(d.key, { ten_tay: e.target.value })}
                        className="w-full border border-border rounded px-2 py-1 text-sm outline-none focus:border-accent"
                      />
                    )}
                  </div>
                  <button onClick={() => xoa(d.key)} className="text-danger text-xs shrink-0">✕</button>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <div className="text-[10px] text-muted">Số lượng</div>
                    <input
                      type="number"
                      min={0}
                      value={d.so_luong}
                      onChange={(e) => capNhat(d.key, { so_luong: Number(e.target.value) })}
                      className="w-full border border-border rounded px-2 py-1 text-sm outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted">ĐVT</div>
                    <input
                      value={d.dvt || ''}
                      onChange={(e) => capNhat(d.key, { dvt: e.target.value })}
                      className="w-full border border-border rounded px-2 py-1 text-sm outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted">Thời gian cần</div>
                    <input
                      value={d.thoi_gian_can}
                      onChange={(e) => capNhat(d.key, { thoi_gian_can: e.target.value })}
                      className="w-full border border-border rounded px-2 py-1 text-sm outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted">Kế hoạch sử dụng</div>
                    <input
                      value={d.ke_hoach_su_dung}
                      onChange={(e) => capNhat(d.key, { ke_hoach_su_dung: e.target.value })}
                      className="w-full border border-border rounded px-2 py-1 text-sm outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <input
                  placeholder="Ghi chú"
                  value={d.ghi_chu}
                  onChange={(e) => capNhat(d.key, { ghi_chu: e.target.value })}
                  className="w-full border border-border rounded px-2 py-1 text-sm mt-2 outline-none focus:border-accent"
                />
                {d.don_gia ? (
                  <div className="text-[11px] text-muted mt-1 text-right">
                    Đơn giá {formatTien(d.don_gia)} · Thành tiền {formatTien(d.don_gia * d.so_luong)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <button
            onClick={themMucKhac}
            className="w-full mt-3 border border-dashed border-border rounded-lg py-1.5 text-sm text-muted hover:border-accent hover:text-accent-600"
          >
            + Thêm mục khác (gõ tay)
          </button>

          <div className="flex justify-between items-center mt-3 text-sm">
            <span className="text-muted">Tạm tính (tham khảo)</span>
            <span className="font-semibold text-accent-600">{formatTien(tongTien)} đ</span>
          </div>

          {err && <div className="text-sm text-danger mt-2">{err}</div>}

          <button
            onClick={luuPhieu}
            disabled={saving}
            className="w-full mt-3 bg-accent hover:bg-accent-600 text-white rounded-lg py-2.5 font-medium disabled:opacity-60"
          >
            {saving ? 'Đang lưu…' : 'Lưu phiếu'}
          </button>
        </div>
      </div>
    </div>
  )
}
