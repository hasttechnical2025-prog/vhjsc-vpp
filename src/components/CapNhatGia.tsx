'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatTien } from '@/lib/format'

type FileRow = {
  nhom_hang: string
  ten: string
  xuat_xu: string | null
  quy_cach: string | null
  dvt: string | null
  don_gia: number | null
}
type GiaDoi = { id: number; nhom_hang: string; ten: string; gia_cu: number | null; gia_moi: number | null }
type KhongCon = { id: number; nhom_hang: string; ten: string; gia_cu: number | null }
type Diff = {
  tong_dong_file: number
  giaDoi: GiaDoi[]
  khongDoi: number
  spMoi: FileRow[]
  khongCon: KhongCon[]
  moHo: { ten: string; nhom_hang: string; so_trung: number }[]
}

// Đọc file xlsx trên trình duyệt -> bóc dòng sản phẩm (cột A..F như file báo giá).
async function bocFile(file: File): Promise<FileRow[]> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const rows: FileRow[] = []
  for (const name of wb.SheetNames) {
    if (/danh m[uụ]c/i.test(name)) continue
    const ws = wb.Sheets[name]
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '' })
    for (const r of aoa) {
      const ten = String((r[1] ?? '')).trim()
      const giaRaw = String((r[5] ?? '')).replace(/[^\d.]/g, '')
      if (!ten || !/^\d{3,}$/.test(giaRaw.replace(/\./g, ''))) continue
      rows.push({
        nhom_hang: name,
        ten,
        xuat_xu: String(r[2] ?? '').trim() || null,
        quy_cach: String(r[3] ?? '').trim() || null,
        dvt: String(r[4] ?? '').trim() || null,
        don_gia: Number(giaRaw.replace(/\./g, '')) || null,
      })
    }
  }
  return rows
}

export default function CapNhatGia() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [diff, setDiff] = useState<Diff | null>(null)
  const [ketQua, setKetQua] = useState<string>('')

  // lựa chọn áp dụng
  const [chonGia, setChonGia] = useState<Set<number>>(new Set())
  const [chonMoi, setChonMoi] = useState<Set<number>>(new Set())
  const [chonAn, setChonAn] = useState<Set<number>>(new Set())

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr('')
    setKetQua('')
    setDiff(null)
    setLoading(true)
    try {
      const rows = await bocFile(file)
      if (rows.length === 0) {
        setErr('Không bóc được dòng sản phẩm nào từ file. Kiểm tra đúng file báo giá.')
        return
      }
      const res = await fetch('/api/admin/gia/doi-chieu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || 'Đối chiếu thất bại')
        return
      }
      setDiff(data)
      setChonGia(new Set(data.giaDoi.map((_: GiaDoi, i: number) => i)))
      setChonMoi(new Set(data.spMoi.map((_: FileRow, i: number) => i)))
      setChonAn(new Set()) // ẩn: mặc định KHÔNG tick
    } catch {
      setErr('Lỗi đọc file hoặc kết nối')
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  function toggle(set: Set<number>, setter: (s: Set<number>) => void, i: number) {
    const n = new Set(set)
    if (n.has(i)) n.delete(i)
    else n.add(i)
    setter(n)
  }

  async function apDung() {
    if (!diff) return
    setErr('')
    setLoading(true)
    try {
      const capNhatGia = diff.giaDoi.filter((_, i) => chonGia.has(i)).map((g) => ({ id: g.id, gia_moi: g.gia_moi }))
      const themMoi = diff.spMoi.filter((_, i) => chonMoi.has(i))
      const anSp = diff.khongCon.filter((_, i) => chonAn.has(i)).map((k) => k.id)
      const res = await fetch('/api/admin/gia/ap-dung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capNhatGia, themMoi, anSp }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || 'Áp dụng thất bại')
        return
      }
      setKetQua(`Đã cập nhật giá ${data.soCapNhat} · thêm mới ${data.soThem} · ẩn ${data.soAn} sản phẩm.`)
      setDiff(null)
      router.refresh()
    } catch {
      setErr('Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <label className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-2 text-sm font-medium cursor-pointer">
        <input type="file" accept=".xlsx" onChange={onFile} className="hidden" disabled={loading} />
        {loading ? 'Đang xử lý…' : 'Chọn file báo giá (.xlsx)'}
      </label>

      {err && <div className="text-sm text-danger mt-3">{err}</div>}
      {ketQua && <div className="text-sm text-ok mt-3 card p-3 border-l-4" style={{ borderLeftColor: 'var(--ok)' }}>{ketQua}</div>}

      {diff && (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-3">
              <div className="text-2xl font-bold text-warn">{diff.giaDoi.length}</div>
              <div className="text-xs text-muted">Giá thay đổi</div>
            </div>
            <div className="card p-3">
              <div className="text-2xl font-bold text-ok">{diff.spMoi.length}</div>
              <div className="text-xs text-muted">Sản phẩm mới</div>
            </div>
            <div className="card p-3">
              <div className="text-2xl font-bold text-danger">{diff.khongCon.length}</div>
              <div className="text-xs text-muted">Không còn (gợi ý ẩn)</div>
            </div>
            <div className="card p-3">
              <div className="text-2xl font-bold text-muted">{diff.khongDoi}</div>
              <div className="text-xs text-muted">Giá giữ nguyên</div>
            </div>
          </div>

          {diff.moHo.length > 0 && (
            <div className="text-sm text-warn">
              ⚠ {diff.moHo.length} tên trùng nhiều mã trong danh mục — bỏ qua tự động, cần đối chiếu tay.
            </div>
          )}

          {/* Giá thay đổi */}
          {diff.giaDoi.length > 0 && (
            <Section title={`Giá thay đổi (${diff.giaDoi.length})`}>
              {diff.giaDoi.map((g, i) => (
                <Row key={g.id} checked={chonGia.has(i)} onToggle={() => toggle(chonGia, setChonGia, i)}>
                  <span className="text-muted w-12 shrink-0">MH {g.id}</span>
                  <span className="flex-1 truncate" title={g.ten}>{g.ten}</span>
                  <span className="text-muted line-through">{formatTien(g.gia_cu)}</span>
                  <span className="text-warn font-semibold w-20 text-right">{formatTien(g.gia_moi)}</span>
                </Row>
              ))}
            </Section>
          )}

          {/* Sản phẩm mới */}
          {diff.spMoi.length > 0 && (
            <Section title={`Sản phẩm mới (${diff.spMoi.length})`}>
              {diff.spMoi.map((s, i) => (
                <Row key={i} checked={chonMoi.has(i)} onToggle={() => toggle(chonMoi, setChonMoi, i)}>
                  <span className="text-muted w-24 shrink-0 truncate" title={s.nhom_hang}>{s.nhom_hang}</span>
                  <span className="flex-1 truncate" title={s.ten}>{s.ten}</span>
                  <span className="text-ok font-semibold w-20 text-right">{formatTien(s.don_gia)}</span>
                </Row>
              ))}
            </Section>
          )}

          {/* Không còn */}
          {diff.khongCon.length > 0 && (
            <Section title={`Không còn trong file mới (${diff.khongCon.length}) — tick để ẩn`}>
              {diff.khongCon.map((k, i) => (
                <Row key={k.id} checked={chonAn.has(i)} onToggle={() => toggle(chonAn, setChonAn, i)}>
                  <span className="text-muted w-12 shrink-0">MH {k.id}</span>
                  <span className="text-muted w-24 shrink-0 truncate" title={k.nhom_hang}>{k.nhom_hang}</span>
                  <span className="flex-1 truncate" title={k.ten}>{k.ten}</span>
                </Row>
              ))}
            </Section>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={apDung}
              disabled={loading}
              className="bg-accent hover:bg-accent-600 text-white rounded-lg px-6 py-2.5 font-medium disabled:opacity-60"
            >
              {loading ? 'Đang áp dụng…' : 'Áp dụng thay đổi đã chọn'}
            </button>
            <button onClick={() => setDiff(null)} className="text-sm text-muted hover:text-danger">
              Huỷ
            </button>
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
      <div className="divide-y divide-border max-h-72 overflow-auto">{children}</div>
    </div>
  )
}

function Row({
  checked,
  onToggle,
  children,
}: {
  checked: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <label className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-accent-50/40">
      <input type="checkbox" checked={checked} onChange={onToggle} className="shrink-0" />
      {children}
    </label>
  )
}
