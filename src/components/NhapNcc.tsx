'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Field =
  | 'ten' | 'ma_so_thue' | 'dia_chi' | 'so_dien_thoai' | 'email' | 'nguoi_lien_he'
  | 'nhom_chi_phi' | 'loai_chi_phi' | 'co_hoa_don' | 'tan_suat_thanh_toan'
  | 'ngay_den_han' | 'hop_dong_mo_ta' | 'hop_dong_het_han' | 'ghi_chu'
type FileRow = Partial<Record<Field, string | null>>
type Trung = { existingId: string; existingTen: string; row: FileRow; boSung: Field[] }
type Diff = { tongDong: number; moi: FileRow[]; trung: Trung[]; trungKhongBoSung: number }

const NHAN: Record<Field, string> = {
  ten: 'Tên', ma_so_thue: 'MST', dia_chi: 'Địa chỉ', so_dien_thoai: 'Điện thoại', email: 'Email',
  nguoi_lien_he: 'Người liên hệ', nhom_chi_phi: 'Nhóm chi phí', loai_chi_phi: 'Loại chi phí',
  co_hoa_don: 'Hóa đơn', tan_suat_thanh_toan: 'Tần suất TT', ngay_den_han: 'Đến hạn',
  hop_dong_mo_ta: 'Hợp đồng', hop_dong_het_han: 'HĐ hết hạn', ghi_chu: 'Ghi chú',
}

// Header (đã bỏ dấu, thường) -> field
const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim()
const HEADER_MAP: Record<string, Field> = {}
const dangKy = (f: Field, keys: string[]) => keys.forEach((k) => (HEADER_MAP[k] = f))
dangKy('ten', ['ten ncc', 'ten nha cung cap', 'ten', 'nha cung cap', 'ncc'])
dangKy('ma_so_thue', ['mst', 'ma so thue', 'masothue', 'ma thue'])
dangKy('dia_chi', ['dia chi'])
dangKy('so_dien_thoai', ['sdt', 'so dien thoai', 'dien thoai', 'phone', 'so dt', 'dt'])
dangKy('email', ['email', 'thu dien tu'])
dangKy('nguoi_lien_he', ['nguoi lien he', 'lien he', 'nlh'])
dangKy('nhom_chi_phi', ['nhom chi phi', 'nhom', 'nhom cp'])
dangKy('loai_chi_phi', ['loai chi phi', 'loai', 'dich vu', 'hang hoa dich vu', 'san pham dich vu', 'loai cp'])
dangKy('co_hoa_don', ['co hoa don', 'hoa don', 'hd'])
dangKy('tan_suat_thanh_toan', ['tan suat thanh toan', 'tan suat'])
dangKy('ngay_den_han', ['ngay den han', 'den han', 'han thanh toan'])
dangKy('hop_dong_mo_ta', ['hop dong', 'hop dong mo ta', 'mo ta hop dong'])
dangKy('hop_dong_het_han', ['hop dong het han', 'ngay het han hop dong', 'het han hop dong', 'ngay het han', 'han hop dong'])
dangKy('ghi_chu', ['ghi chu', 'note'])

function toIso(v: unknown): string | null {
  if (v == null || v === '') return null
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10)
  const s = String(v).trim()
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return null
}
function chuanHoaDon(v: unknown): string | null {
  const s = boDau(String(v ?? ''))
  if (!s) return null
  if (s.includes('khong')) return 'khong'
  if (s.includes('ca hai') || s.includes('ca 2')) return 'ca_hai'
  if (s.includes('co') || s.includes('hoa don')) return 'co'
  return null
}

async function bocFile(file: File): Promise<FileRow[]> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
  const out: FileRow[] = []
  for (const name of wb.SheetNames) {
    const objs = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[name], { defval: '', raw: true })
    for (const o of objs) {
      const row: FileRow = {}
      for (const [k, v] of Object.entries(o)) {
        const f = HEADER_MAP[boDau(k)]
        if (!f || v == null || String(v).trim() === '') continue
        if (f === 'hop_dong_het_han') row[f] = toIso(v)
        else if (f === 'co_hoa_don') row[f] = chuanHoaDon(v)
        else row[f] = String(v).trim()
      }
      if (row.ten) out.push(row)
    }
  }
  return out
}

export default function NhapNcc() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [ketQua, setKetQua] = useState('')
  const [diff, setDiff] = useState<Diff | null>(null)
  const [chonMoi, setChonMoi] = useState<Set<number>>(new Set())
  const [chonTrung, setChonTrung] = useState<Set<number>>(new Set())

  async function taiMau() {
    const XLSX = await import('xlsx')
    const headers = ['Tên NCC', 'MST', 'Địa chỉ', 'Điện thoại', 'Email', 'Người liên hệ', 'Nhóm chi phí', 'Loại chi phí', 'Có hóa đơn', 'Tần suất thanh toán', 'Đến hạn', 'Hợp đồng', 'Hợp đồng hết hạn', 'Ghi chú']
    const vd = ['CÔNG TY TNHH ABC', '0100123456', 'Số 1 Hà Nội', '0901234567', 'abc@email.com', 'Nguyễn Văn A', 'Hành chính', 'Mua VPP', 'Có hóa đơn', 'Thanh toán theo tháng', 'Mùng 5 hàng tháng', 'HĐ 2026', '31/12/2026', '']
    const ws = XLSX.utils.aoa_to_sheet([headers, vd])
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'NCC')
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    const a = document.createElement('a'); a.href = url; a.download = 'mau-nhap-ncc.xlsx'; a.click(); URL.revokeObjectURL(url)
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr(''); setKetQua(''); setDiff(null); setLoading(true)
    try {
      const rows = await bocFile(file)
      if (rows.length === 0) { setErr('Không đọc được NCC nào. Kiểm tra file có cột "Tên NCC".'); return }
      const res = await fetch('/api/ncc/doi-chieu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || 'Đối chiếu thất bại'); return }
      setDiff(data)
      setChonMoi(new Set(data.moi.map((_: FileRow, i: number) => i)))
      setChonTrung(new Set(data.trung.map((_: Trung, i: number) => i)))
    } catch {
      setErr('Lỗi đọc file hoặc kết nối')
    } finally {
      setLoading(false); e.target.value = ''
    }
  }

  function toggle(set: Set<number>, setter: (s: Set<number>) => void, i: number) {
    const n = new Set(set); n.has(i) ? n.delete(i) : n.add(i); setter(n)
  }

  async function apDung() {
    if (!diff) return
    setErr(''); setLoading(true)
    try {
      const them = diff.moi.filter((_, i) => chonMoi.has(i))
      const capNhat = diff.trung.filter((_, i) => chonTrung.has(i)).map((t) => ({ id: t.existingId, row: t.row }))
      const res = await fetch('/api/ncc/ap-dung', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ them, capNhat }) })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || 'Áp dụng thất bại'); return }
      setKetQua(`Đã thêm ${data.soThem} NCC mới · bổ sung thông tin cho ${data.soCapNhat} NCC.`)
      setDiff(null); router.refresh()
    } catch {
      setErr('Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-2 text-sm font-medium cursor-pointer">
          <input type="file" accept=".xlsx" onChange={onFile} className="hidden" disabled={loading} />
          {loading ? 'Đang xử lý…' : 'Chọn file NCC (.xlsx)'}
        </label>
        <button onClick={taiMau} className="text-sm text-accent-600 hover:underline">⬇ Tải file mẫu</button>
      </div>

      {err && <div className="text-sm text-danger mt-3">{err}</div>}
      {ketQua && <div className="text-sm text-ok mt-3 card p-3">{ketQua}</div>}

      {diff && (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3"><div className="text-2xl font-bold text-ok">{diff.moi.length}</div><div className="text-xs text-muted">NCC mới</div></div>
            <div className="card p-3"><div className="text-2xl font-bold text-warn">{diff.trung.length}</div><div className="text-xs text-muted">Trùng — bổ sung được</div></div>
            <div className="card p-3"><div className="text-2xl font-bold text-muted">{diff.trungKhongBoSung}</div><div className="text-xs text-muted">Trùng — đã đủ</div></div>
          </div>

          {diff.moi.length > 0 && (
            <Section title={`NCC mới (${diff.moi.length}) — tick để thêm`}>
              {diff.moi.map((r, i) => (
                <Row key={i} checked={chonMoi.has(i)} onToggle={() => toggle(chonMoi, setChonMoi, i)}>
                  <span className="flex-1 truncate" title={r.ten || ''}>{r.ten}</span>
                  <span className="text-muted text-xs w-28 shrink-0 truncate">{r.ma_so_thue ? `MST ${r.ma_so_thue}` : (r.nhom_chi_phi || '')}</span>
                </Row>
              ))}
            </Section>
          )}

          {diff.trung.length > 0 && (
            <Section title={`Trùng — bổ sung ô còn thiếu (${diff.trung.length})`}>
              {diff.trung.map((t, i) => (
                <Row key={i} checked={chonTrung.has(i)} onToggle={() => toggle(chonTrung, setChonTrung, i)}>
                  <span className="flex-1 truncate" title={t.existingTen}>{t.existingTen}</span>
                  <span className="text-warn text-xs">+ {t.boSung.map((f) => NHAN[f]).join(', ')}</span>
                </Row>
              ))}
            </Section>
          )}

          <div className="flex items-center gap-3">
            <button onClick={apDung} disabled={loading} className="bg-accent hover:bg-accent-600 text-white rounded-lg px-6 py-2.5 font-medium disabled:opacity-60">
              {loading ? 'Đang áp dụng…' : 'Áp dụng'}
            </button>
            <button onClick={() => setDiff(null)} className="text-sm text-muted hover:text-danger">Huỷ</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="bg-accent-50 text-accent-600 px-3 py-2 text-sm font-semibold">{title}</div>
      <div className="divide-y divide-border max-h-80 overflow-auto">{children}</div>
    </div>
  )
}
function Row({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-accent-50/40">
      <input type="checkbox" checked={checked} onChange={onToggle} className="shrink-0" />
      {children}
    </label>
  )
}
