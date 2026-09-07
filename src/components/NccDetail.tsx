'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { NccRow, NccDanhGiaRow, NccTepRow } from '@/lib/types'
import { TIEU_CHI, tinhDiemTong, xepLoai, NHAN_XEP_LOAI, NHAN_DE_XUAT, MAU_XEP_LOAI, type XepLoai } from '@/lib/ncc'
import { formatDate, isoToDmy, dmyToIso } from '@/lib/format'
import DateField from './DateField'
import ConfirmDialog from './ConfirmDialog'

const HOA_DON: Record<string, string> = { co: 'Có hóa đơn', khong: 'Không hóa đơn', ca_hai: 'Cả hai' }

type HoSo = {
  ten: string; ma_so_thue: string; dia_chi: string; so_dien_thoai: string; email: string
  nguoi_lien_he: string; nhom_chi_phi: string; loai_chi_phi: string; co_hoa_don: string
  tan_suat_thanh_toan: string; ngay_den_han: string; hop_dong_mo_ta: string
  hop_dong_het_han: string; trang_thai: string; ghi_chu: string
}

function tuNcc(n: NccRow): HoSo {
  return {
    ten: n.ten, ma_so_thue: n.ma_so_thue || '', dia_chi: n.dia_chi || '', so_dien_thoai: n.so_dien_thoai || '',
    email: n.email || '', nguoi_lien_he: n.nguoi_lien_he || '', nhom_chi_phi: n.nhom_chi_phi || '',
    loai_chi_phi: n.loai_chi_phi || '', co_hoa_don: n.co_hoa_don || '', tan_suat_thanh_toan: n.tan_suat_thanh_toan || '',
    ngay_den_han: n.ngay_den_han || '', hop_dong_mo_ta: n.hop_dong_mo_ta || '',
    hop_dong_het_han: isoToDmy(n.hop_dong_het_han), trang_thai: n.trang_thai || 'dang_dung', ghi_chu: n.ghi_chu || '',
  }
}

export default function NccDetail({ ncc, danhGia, tep }: { ncc: NccRow; danhGia: NccDanhGiaRow[]; tep: NccTepRow[] }) {
  const router = useRouter()
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [xacNhan, setXacNhan] = useState<{ message: string; onOk: () => void } | null>(null)

  // ---- Hồ sơ ----
  const [sua, setSua] = useState(false)
  const [ho, setHo] = useState<HoSo>(tuNcc(ncc))

  function fail(e: string) { setMsg(''); setErr(e) }
  function done(m: string) { setErr(''); setMsg(m); router.refresh() }

  async function luuHoSo() {
    if (!ho.ten.trim()) return fail('Tên không được để trống')
    setBusy(true); setErr(''); setMsg('')
    try {
      const body: Record<string, unknown> = { ...ho, id: ncc.id, hop_dong_het_han: dmyToIso(ho.hop_dong_het_han) || null }
      const r = await fetch('/api/ncc', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { fail(d.error || 'Lưu thất bại'); return }
      setSua(false); done('Đã lưu hồ sơ')
    } finally { setBusy(false) }
  }

  function xoaNcc() {
    setXacNhan({
      message: `Xoá nhà cung cấp "${ncc.ten}"? Mọi đánh giá & tệp đính kèm cũng bị xoá. Không khôi phục được.`,
      onOk: async () => {
        const r = await fetch('/api/ncc', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ncc.id }) })
        if (!r.ok) { const d = await r.json().catch(() => ({})); fail(d.error || 'Xoá thất bại'); return }
        router.push('/ncc')
      },
    })
  }

  // ---- Đánh giá ----
  const namNay = new Date().getFullYear()
  const [dg, setDg] = useState({
    ky: `Năm ${namNay}`,
    diem_chat_luong: 3, diem_gia: 3, diem_tien_do: 3, diem_ho_tro: 3, diem_chung_tu: 3,
    nhan_xet: '', de_xuat: 'tiep_tuc',
  })
  const diemTong = useMemo(() => tinhDiemTong(dg), [dg])
  const xl = xepLoai(diemTong)

  async function luuDanhGia() {
    if (!dg.ky.trim()) return fail('Nhập kỳ đánh giá')
    setBusy(true); setErr(''); setMsg('')
    try {
      const r = await fetch(`/api/ncc/${ncc.id}/danh-gia`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dg) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { fail(d.error || 'Lưu đánh giá thất bại'); return }
      done(`Đã lưu đánh giá — xếp loại ${d.xep_loai} (${Number(d.diem_tong).toFixed(2)})`)
    } finally { setBusy(false) }
  }

  function xoaDanhGia(id: string, ky: string) {
    setXacNhan({
      message: `Xoá đánh giá kỳ "${ky}"?`,
      onOk: async () => {
        const r = await fetch(`/api/ncc/${ncc.id}/danh-gia`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ danh_gia_id: id }) })
        if (!r.ok) { const d = await r.json().catch(() => ({})); fail(d.error || 'Xoá thất bại'); return }
        done('Đã xoá đánh giá')
      },
    })
  }

  // ---- Tệp ----
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  async function taiTep(file: File) {
    setUploading(true); setErr(''); setMsg('')
    try {
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch(`/api/ncc/${ncc.id}/tep`, { method: 'POST', body: fd })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { fail(d.error || 'Tải lên thất bại'); return }
      done('Đã đính kèm tệp')
    } finally { setUploading(false) }
  }
  function xoaTep(id: string, ten: string) {
    setXacNhan({
      message: `Xoá tệp "${ten}"?`,
      onOk: async () => {
        const r = await fetch(`/api/ncc/${ncc.id}/tep`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tep_id: id }) })
        if (!r.ok) { const d = await r.json().catch(() => ({})); fail(d.error || 'Xoá thất bại'); return }
        done('Đã xoá tệp')
      },
    })
  }

  const inp = 'border border-border rounded px-2 py-1.5 text-sm outline-none focus:border-accent w-full bg-surface'
  const lb = 'text-xs text-muted'

  return (
    <div className="mt-2">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold">{ncc.ten}</h1>
        <div className="flex items-center gap-2 shrink-0">
          {!sua && <button onClick={() => { setHo(tuNcc(ncc)); setSua(true); setErr(''); setMsg('') }} className="border border-border rounded-lg px-4 py-2 text-sm font-medium hover:border-accent">Sửa hồ sơ</button>}
          <button onClick={xoaNcc} className="text-danger text-sm hover:underline px-2">Xoá</button>
        </div>
      </div>

      {(err || msg) && <div className={`text-sm mb-3 ${err ? 'text-danger' : 'text-ok'}`}>{err || msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* HỒ SƠ */}
        <div className="card p-4">
          <div className="font-semibold mb-3">Hồ sơ nhà cung cấp</div>
          {sua ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className={lb}>Tên NCC *<input className={inp} value={ho.ten} onChange={(e) => setHo({ ...ho, ten: e.target.value })} /></label>
              <label className={lb}>Mã số thuế<input className={inp} value={ho.ma_so_thue} onChange={(e) => setHo({ ...ho, ma_so_thue: e.target.value })} /></label>
              <label className={lb + ' sm:col-span-2'}>Địa chỉ<input className={inp} value={ho.dia_chi} onChange={(e) => setHo({ ...ho, dia_chi: e.target.value })} /></label>
              <label className={lb}>Điện thoại<input className={inp} value={ho.so_dien_thoai} onChange={(e) => setHo({ ...ho, so_dien_thoai: e.target.value })} /></label>
              <label className={lb}>Email<input className={inp} value={ho.email} onChange={(e) => setHo({ ...ho, email: e.target.value })} /></label>
              <label className={lb}>Người liên hệ<input className={inp} value={ho.nguoi_lien_he} onChange={(e) => setHo({ ...ho, nguoi_lien_he: e.target.value })} /></label>
              <label className={lb}>Nhóm chi phí<input className={inp} value={ho.nhom_chi_phi} onChange={(e) => setHo({ ...ho, nhom_chi_phi: e.target.value })} /></label>
              <label className={lb + ' sm:col-span-2'}>Loại chi phí / dịch vụ<input className={inp} value={ho.loai_chi_phi} onChange={(e) => setHo({ ...ho, loai_chi_phi: e.target.value })} /></label>
              <label className={lb}>Hóa đơn
                <select className={inp} value={ho.co_hoa_don} onChange={(e) => setHo({ ...ho, co_hoa_don: e.target.value })}>
                  <option value="">—</option><option value="co">Có hóa đơn</option><option value="khong">Không hóa đơn</option><option value="ca_hai">Cả hai</option>
                </select>
              </label>
              <label className={lb}>Tần suất thanh toán<input className={inp} value={ho.tan_suat_thanh_toan} onChange={(e) => setHo({ ...ho, tan_suat_thanh_toan: e.target.value })} /></label>
              <label className={lb}>Ngày đến hạn TT (mô tả)<input className={inp} placeholder="VD: Mùng 8 hàng tháng" value={ho.ngay_den_han} onChange={(e) => setHo({ ...ho, ngay_den_han: e.target.value })} /></label>
              <label className={lb}>Hợp đồng hết hạn<DateField value={ho.hop_dong_het_han} onChange={(v) => setHo({ ...ho, hop_dong_het_han: v })} /></label>
              <label className={lb + ' sm:col-span-2'}>Hợp đồng (mô tả)<input className={inp} value={ho.hop_dong_mo_ta} onChange={(e) => setHo({ ...ho, hop_dong_mo_ta: e.target.value })} /></label>
              <label className={lb}>Trạng thái
                <select className={inp} value={ho.trang_thai} onChange={(e) => setHo({ ...ho, trang_thai: e.target.value })}>
                  <option value="dang_dung">Đang dùng</option><option value="ngung">Ngừng</option>
                </select>
              </label>
              <label className={lb + ' sm:col-span-2'}>Ghi chú<textarea className={inp} rows={2} value={ho.ghi_chu} onChange={(e) => setHo({ ...ho, ghi_chu: e.target.value })} /></label>
              <div className="sm:col-span-2 flex gap-2 pt-1">
                <button onClick={luuHoSo} disabled={busy} className="bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium disabled:opacity-60">Lưu hồ sơ</button>
                <button onClick={() => setSua(false)} className="text-muted hover:text-foreground text-sm px-2">Huỷ</button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <Hang nhan="Mã số thuế" gt={ncc.ma_so_thue} />
              <Hang nhan="Điện thoại" gt={ncc.so_dien_thoai} />
              <Hang nhan="Địa chỉ" gt={ncc.dia_chi} full />
              <Hang nhan="Email" gt={ncc.email} />
              <Hang nhan="Người liên hệ" gt={ncc.nguoi_lien_he} />
              <Hang nhan="Nhóm chi phí" gt={ncc.nhom_chi_phi} />
              <Hang nhan="Loại chi phí" gt={ncc.loai_chi_phi} full />
              <Hang nhan="Hóa đơn" gt={ncc.co_hoa_don ? HOA_DON[ncc.co_hoa_don] : null} />
              <Hang nhan="Tần suất TT" gt={ncc.tan_suat_thanh_toan} />
              <Hang nhan="Đến hạn TT" gt={ncc.ngay_den_han} />
              <Hang nhan="HĐ hết hạn" gt={ncc.hop_dong_het_han ? formatDate(ncc.hop_dong_het_han) : null} />
              <Hang nhan="Hợp đồng" gt={ncc.hop_dong_mo_ta} full />
              <Hang nhan="Trạng thái" gt={ncc.trang_thai === 'dang_dung' ? 'Đang dùng' : 'Ngừng'} />
              <Hang nhan="Ghi chú" gt={ncc.ghi_chu} full />
            </dl>
          )}

          {/* Tệp đính kèm */}
          <div className="mt-5 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-sm">Tệp đính kèm ({tep.length})</div>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) taiTep(f); e.target.value = '' }} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="text-sm text-accent-600 hover:underline disabled:opacity-60">
                {uploading ? 'Đang tải…' : '+ Đính kèm hợp đồng/hồ sơ'}
              </button>
            </div>
            {tep.length === 0 ? (
              <div className="text-sm text-muted">Chưa có tệp.</div>
            ) : (
              <ul className="text-sm space-y-1">
                {tep.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <a href={t.url} target="_blank" rel="noreferrer" className="text-accent-600 hover:underline truncate">📎 {t.ten_tep}</a>
                    <span className="text-muted text-xs">{formatDate(t.created_at)}</span>
                    <button onClick={() => xoaTep(t.id, t.ten_tep)} className="text-danger text-xs hover:underline ml-auto">Xoá</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ĐÁNH GIÁ */}
        <div className="space-y-4">
          <div className="card p-4">
            <div className="font-semibold mb-3">Chấm đánh giá</div>
            <label className={lb}>Kỳ đánh giá<input className={inp} value={dg.ky} onChange={(e) => setDg({ ...dg, ky: e.target.value })} /></label>
            <div className="space-y-2 mt-2">
              {TIEU_CHI.map((t) => (
                <div key={t.key}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span>{t.nhan} <span className="text-muted">({Math.round(t.trong_so * 100)}%)</span></span>
                    <span className="font-medium tabular-nums">{(dg as unknown as Record<string, number>)[t.key]}/5</span>
                  </div>
                  <input type="range" min={1} max={5} step={1} value={(dg as unknown as Record<string, number>)[t.key]}
                    onChange={(e) => setDg({ ...dg, [t.key]: Number(e.target.value) })} className="w-full accent-accent" />
                </div>
              ))}
            </div>
            <label className={lb + ' block mt-2'}>Nhận xét<textarea className={inp} rows={2} value={dg.nhan_xet} onChange={(e) => setDg({ ...dg, nhan_xet: e.target.value })} /></label>
            <label className={lb + ' block mt-2'}>Đề xuất
              <select className={inp} value={dg.de_xuat} onChange={(e) => setDg({ ...dg, de_xuat: e.target.value })}>
                {Object.entries(NHAN_DE_XUAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <div className="flex items-center justify-between mt-3 p-2 rounded-lg bg-accent-50/60">
              <span className="text-sm">Điểm tổng: <b className="tabular-nums">{diemTong.toFixed(2)}</b>/5</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MAU_XEP_LOAI[xl]}`}>{NHAN_XEP_LOAI[xl]}</span>
            </div>
            <button onClick={luuDanhGia} disabled={busy} className="mt-3 w-full bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">Lưu đánh giá kỳ này</button>
          </div>

          <div className="card p-4">
            <div className="font-semibold mb-3">Lịch sử đánh giá ({danhGia.length})</div>
            {danhGia.length === 0 ? (
              <div className="text-sm text-muted">Chưa có đánh giá nào.</div>
            ) : (
              <div className="space-y-2">
                {danhGia.map((d) => (
                  <div key={d.id} className="border border-border rounded-lg p-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <b>{d.ky}</b>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MAU_XEP_LOAI[(d.xep_loai || 'C') as XepLoai]}`}>
                        {d.xep_loai} · {d.diem_tong?.toFixed(2)}
                      </span>
                    </div>
                    {d.nhan_xet && <div className="text-muted mt-1">{d.nhan_xet}</div>}
                    <div className="flex items-center justify-between mt-1 text-xs text-muted">
                      <span>{d.de_xuat ? NHAN_DE_XUAT[d.de_xuat] : ''}{d.nguoi_cham_ten ? ` · ${d.nguoi_cham_ten}` : ''} · {formatDate(d.created_at)}</span>
                      <button onClick={() => xoaDanhGia(d.id, d.ky)} className="text-danger hover:underline">Xoá</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!xacNhan}
        message={xacNhan?.message || ''}
        onConfirm={() => { const f = xacNhan?.onOk; setXacNhan(null); f?.() }}
        onClose={() => setXacNhan(null)}
      />
    </div>
  )
}

function Hang({ nhan, gt, full }: { nhan: string; gt: string | null | undefined; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <span className="text-muted">{nhan}: </span>
      {gt ? <span>{gt}</span> : <span className="text-muted">—</span>}
    </div>
  )
}
