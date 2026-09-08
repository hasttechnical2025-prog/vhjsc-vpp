'use client'

import { useState } from 'react'
import type { NccNhomRow } from '@/lib/types'
import ConfirmDialog from './ConfirmDialog'

// Trang "Danh mục": nơi tập trung các danh mục dropdown dùng chung cho các module.
// Hiện có: Nhóm chi phí (NCC). Thêm danh mục mới sau này = thêm 1 card tương tự.
async function api(method: string, url: string, body: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, data }
}

export default function QuanLyDanhMuc({ nccNhom }: { nccNhom: NccNhomRow[] }) {
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [xacNhan, setXacNhan] = useState<{ message: string; onOk: () => void } | null>(null)
  function fail(e: string) { setMsg(''); setErr(e) }
  function bao(m: string) { setErr(''); setMsg(m) }
  async function chay(key: string, fn: () => Promise<void>) {
    if (busy) return
    setBusy(key)
    try { await fn() } finally { setBusy(null) }
  }

  // ---- Nhóm chi phí NCC ----
  const [dsNhom, setDsNhom] = useState<NccNhomRow[]>(nccNhom)
  const [nhomTen, setNhomTen] = useState('')
  const [editNhomId, setEditNhomId] = useState<string | null>(null)
  const [eNhomTen, setENhomTen] = useState('')

  async function themNhom() {
    if (!nhomTen.trim()) return fail('Nhập tên nhóm chi phí')
    const { ok, data } = await api('POST', '/api/admin/ncc-nhom', { ten: nhomTen.trim() })
    if (!ok) return fail(data.error || 'Lỗi')
    if (data.nhom) setDsNhom((d) => [...d, data.nhom])
    setNhomTen(''); bao('Đã thêm nhóm chi phí')
  }
  async function luuNhom(id: string) {
    const ten = eNhomTen.trim()
    if (!ten) return fail('Tên nhóm không được trống')
    const { ok, data } = await api('PATCH', '/api/admin/ncc-nhom', { id, ten })
    if (!ok) return fail(data.error || 'Lỗi')
    setDsNhom((d) => d.map((x) => (x.id === id ? { ...x, ten } : x)))
    setEditNhomId(null); bao('Đã đổi tên nhóm')
  }
  function xoaNhom(n: NccNhomRow) {
    setXacNhan({
      message: `Xoá nhóm chi phí "${n.ten}"? (NCC đang thuộc nhóm này vẫn giữ tên nhóm cũ cho tới khi bạn đổi.)`,
      onOk: () => chay('xoaNhom', async () => {
        const { ok, data } = await api('DELETE', '/api/admin/ncc-nhom', { id: n.id })
        if (!ok) return fail(data.error || 'Lỗi')
        setDsNhom((d) => d.filter((x) => x.id !== n.id)); bao('Đã xoá nhóm chi phí')
      }),
    })
  }
  async function dichChuyen(idx: number, huong: -1 | 1) {
    const j = idx + huong
    if (j < 0 || j >= dsNhom.length) return
    const moi = dsNhom.slice()
    ;[moi[idx], moi[j]] = [moi[j], moi[idx]]
    setDsNhom(moi)
    const { ok, data } = await api('PATCH', '/api/admin/ncc-nhom', { ids: moi.map((n) => n.id) })
    if (!ok) { setDsNhom(dsNhom); return fail(data.error || 'Lỗi') }
    bao('Đã đổi thứ tự')
  }

  const inp = 'border border-border rounded px-2 py-1 text-sm outline-none focus:border-accent'

  return (
    <div className="space-y-6">
      {(err || msg) && <div className={`text-sm ${err ? 'text-danger' : 'text-ok'}`}>{err || msg}</div>}

      <div className="card p-4">
        <div className="font-semibold mb-1">Nhóm chi phí (Nhà cung cấp)</div>
        <div className="text-xs text-muted mb-3">Danh mục dùng cho ô “Nhóm chi phí” khi tạo/sửa NCC. Thứ tự ở đây cũng là thứ tự sắp xếp danh sách NCC.</div>
        <div className="space-y-1.5">
          {dsNhom.map((n, i) => (
            <div key={n.id} className="flex items-center gap-2 text-sm">
              <span className="w-6 text-muted text-xs text-right">{i + 1}.</span>
              {editNhomId === n.id ? (
                <>
                  <input className={inp + ' flex-1'} value={eNhomTen} onChange={(e) => setENhomTen(e.target.value)} autoFocus />
                  <button onClick={() => chay('luuNhom', () => luuNhom(n.id))} disabled={!!busy} className="text-accent-600 hover:underline disabled:opacity-60">{busy === 'luuNhom' ? 'Đang lưu…' : 'Lưu'}</button>
                  <button onClick={() => setEditNhomId(null)} className="text-muted hover:underline">Huỷ</button>
                </>
              ) : (
                <>
                  <span className="flex-1">{n.ten}</span>
                  <button onClick={() => chay('nhomLen' + i, () => dichChuyen(i, -1))} disabled={!!busy || i === 0} className="text-muted hover:text-accent-600 disabled:opacity-30" title="Lên">▲</button>
                  <button onClick={() => chay('nhomXuong' + i, () => dichChuyen(i, 1))} disabled={!!busy || i === dsNhom.length - 1} className="text-muted hover:text-accent-600 disabled:opacity-30" title="Xuống">▼</button>
                  <button onClick={() => { setEditNhomId(n.id); setENhomTen(n.ten) }} disabled={!!busy} className="text-accent-600 hover:underline disabled:opacity-60 ml-1">Sửa</button>
                  <button onClick={() => xoaNhom(n)} disabled={!!busy} className="text-danger hover:underline disabled:opacity-60">Xoá</button>
                </>
              )}
            </div>
          ))}
          {dsNhom.length === 0 && <div className="text-sm text-muted">Chưa có nhóm nào. Thêm bên dưới.</div>}
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
          <input className={inp + ' flex-1'} placeholder="Tên nhóm chi phí mới" value={nhomTen} onChange={(e) => setNhomTen(e.target.value)} />
          <button onClick={() => chay('themNhom', themNhom)} disabled={!!busy} className="bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium disabled:opacity-60">{busy === 'themNhom' ? 'Đang lưu…' : '+ Thêm nhóm'}</button>
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
