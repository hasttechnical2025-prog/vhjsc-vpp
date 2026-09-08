'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PhongBanRow, NguoiDungRow, NccNhomRow } from '@/lib/types'
import ConfirmDialog from './ConfirmDialog'

type Role = 'admin' | 'hcns' | 'nguoi_de_nghi'
const ROLE_LABEL: Record<Role, string> = { admin: 'Quản trị', hcns: 'HCNS', nguoi_de_nghi: 'Người đề nghị' }

async function api(method: string, url: string, body: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, data }
}

export default function QuanLyToChuc({
  phongBan,
  users,
  selfId,
  nccNhom,
}: {
  phongBan: PhongBanRow[]
  users: NguoiDungRow[]
  selfId: string
  nccNhom: NccNhomRow[]
}) {
  const router = useRouter()
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState<string | null>(null) // khoá hành động đang chạy
  const [xacNhan, setXacNhan] = useState<{ message: string; onOk: () => void } | null>(null)
  const pbMap = useMemo(() => new Map(phongBan.map((p) => [p.id, p.ten])), [phongBan])

  function done(m: string) { setErr(''); setMsg(m); router.refresh() }
  function fail(e: string) { setMsg(''); setErr(e) }
  // Chạy 1 hành động có hiển thị trạng thái bận (disable nút + đổi nhãn "Đang…").
  async function chay(key: string, fn: () => Promise<void>) {
    if (busy) return
    setBusy(key)
    try { await fn() } finally { setBusy(null) }
  }

  // ---- Phòng ban ----
  const [pbTen, setPbTen] = useState('')
  const [pbMa, setPbMa] = useState('')
  const [pbTbp, setPbTbp] = useState('')
  const [editPbId, setEditPbId] = useState<string | null>(null)
  const [ePbTen, setEPbTen] = useState('')
  const [ePbMa, setEPbMa] = useState('')
  const [ePbTbp, setEPbTbp] = useState('')

  async function themPB() {
    if (!pbTen.trim()) return fail('Nhập tên phòng ban')
    const { ok, data } = await api('POST', '/api/admin/phong-ban', { ten: pbTen, ma: pbMa, truong_bo_phan: pbTbp })
    if (!ok) return fail(data.error || 'Lỗi')
    setPbTen(''); setPbMa(''); setPbTbp(''); done('Đã thêm phòng ban')
  }
  function batDauSuaPB(p: PhongBanRow) {
    setEditPbId(p.id); setEPbTen(p.ten); setEPbMa(p.ma || ''); setEPbTbp(p.truong_bo_phan || '')
  }
  async function luuPB(id: string) {
    const { ok, data } = await api('PATCH', '/api/admin/phong-ban', { id, ten: ePbTen, ma: ePbMa, truong_bo_phan: ePbTbp })
    if (!ok) return fail(data.error || 'Lỗi')
    setEditPbId(null); done('Đã cập nhật phòng ban')
  }
  function xoaPB(p: PhongBanRow) {
    setXacNhan({
      message: `Xoá phòng ban "${p.ten}"? Tài khoản/phiếu thuộc phòng này sẽ được gỡ liên kết (không mất).`,
      onOk: () => chay('xoaPB', async () => {
        const { ok, data } = await api('DELETE', '/api/admin/phong-ban', { id: p.id })
        if (!ok) return fail(data.error || 'Lỗi')
        done('Đã xoá phòng ban')
      }),
    })
  }

  // ---- Người dùng ----
  const empty = { ho_ten: '', username: '', password: '', role: 'nguoi_de_nghi' as Role, phong_ban_id: '' }
  const [showAdd, setShowAdd] = useState(false)
  const [nu, setNu] = useState(empty)
  const [editUId, setEditUId] = useState<string | null>(null)
  const [eU, setEU] = useState<{ ho_ten: string; username: string; role: Role; phong_ban_id: string; password: string }>({
    ho_ten: '', username: '', role: 'nguoi_de_nghi', phong_ban_id: '', password: '',
  })

  async function themUser() {
    if (!nu.ho_ten.trim() || !nu.username.trim() || !nu.password) return fail('Nhập họ tên, tài khoản, mật khẩu')
    const { ok, data } = await api('POST', '/api/admin/nguoi-dung', nu)
    if (!ok) return fail(data.error || 'Lỗi')
    setNu(empty); setShowAdd(false); done('Đã tạo người dùng')
  }
  function batDauSuaU(u: NguoiDungRow) {
    setEditUId(u.id)
    setEU({ ho_ten: u.ho_ten, username: u.username, role: u.role, phong_ban_id: u.phong_ban_id || '', password: '' })
  }
  async function luuU(id: string) {
    const { ok, data } = await api('PATCH', '/api/admin/nguoi-dung', {
      id, ho_ten: eU.ho_ten, username: eU.username, role: eU.role, phong_ban_id: eU.phong_ban_id, password: eU.password || undefined,
    })
    if (!ok) return fail(data.error || 'Lỗi')
    setEditUId(null); done('Đã cập nhật người dùng')
  }
  async function toggleActive(u: NguoiDungRow) {
    const { ok, data } = await api('PATCH', '/api/admin/nguoi-dung', { id: u.id, is_active: !u.is_active })
    if (!ok) return fail(data.error || 'Lỗi')
    done(u.is_active ? 'Đã khoá tài khoản' : 'Đã mở tài khoản')
  }
  function xoaU(u: NguoiDungRow) {
    setXacNhan({
      message: `Xoá người dùng "${u.ho_ten}" (${u.username})?`,
      onOk: () => chay('xoaU', async () => {
        const { ok, data } = await api('DELETE', '/api/admin/nguoi-dung', { id: u.id })
        if (!ok) return fail(data.error || 'Lỗi')
        done('Đã xoá người dùng')
      }),
    })
  }

  // ---- Nhóm chi phí NCC (state cục bộ để thao tác tức thì) ----
  const [dsNhom, setDsNhom] = useState<NccNhomRow[]>(nccNhom)
  const [nhomTen, setNhomTen] = useState('')
  const [editNhomId, setEditNhomId] = useState<string | null>(null)
  const [eNhomTen, setENhomTen] = useState('')
  function bao(m: string) { setErr(''); setMsg(m) } // báo thành công KHÔNG tải lại trang

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
    setDsNhom(moi) // đổi ngay trên giao diện
    const { ok, data } = await api('PATCH', '/api/admin/ncc-nhom', { ids: moi.map((n) => n.id) })
    if (!ok) { setDsNhom(dsNhom); return fail(data.error || 'Lỗi') } // lỗi thì trả về như cũ
    bao('Đã đổi thứ tự')
  }

  const inp = 'border border-border rounded px-2 py-1 text-sm outline-none focus:border-accent'

  return (
    <div className="space-y-6">
      {(err || msg) && (
        <div className={`text-sm ${err ? 'text-danger' : 'text-ok'}`}>{err || msg}</div>
      )}

      {/* PHÒNG BAN */}
      <div className="card p-4">
        <div className="font-semibold mb-3">Phòng ban ({phongBan.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted text-left">
              <tr><th className="py-1">Tên phòng ban</th><th className="py-1 w-24">Mã</th><th className="py-1">Trưởng bộ phận</th><th className="py-1 w-32 text-right">Thao tác</th></tr>
            </thead>
            <tbody>
              {phongBan.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  {editPbId === p.id ? (
                    <>
                      <td className="py-1.5 pr-2"><input className={inp + ' w-full'} value={ePbTen} onChange={(e) => setEPbTen(e.target.value)} /></td>
                      <td className="py-1.5 pr-2"><input className={inp + ' w-full'} value={ePbMa} onChange={(e) => setEPbMa(e.target.value)} /></td>
                      <td className="py-1.5 pr-2"><input className={inp + ' w-full'} placeholder="Tên trưởng bộ phận" value={ePbTbp} onChange={(e) => setEPbTbp(e.target.value)} /></td>
                      <td className="py-1.5 text-right whitespace-nowrap">
                        <button onClick={() => chay('luuPB', () => luuPB(p.id))} disabled={!!busy} className="text-accent-600 hover:underline disabled:opacity-60">{busy === 'luuPB' ? 'Đang lưu…' : 'Lưu'}</button>
                        <button onClick={() => setEditPbId(null)} disabled={!!busy} className="text-muted hover:underline ml-3 disabled:opacity-60">Huỷ</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-1.5">{p.ten}</td>
                      <td className="py-1.5 text-muted">{p.ma || '—'}</td>
                      <td className="py-1.5">{p.truong_bo_phan || <span className="text-muted">—</span>}</td>
                      <td className="py-1.5 text-right whitespace-nowrap">
                        <button onClick={() => batDauSuaPB(p)} disabled={!!busy} className="text-accent-600 hover:underline disabled:opacity-60">Sửa</button>
                        <button onClick={() => xoaPB(p)} disabled={!!busy} className="text-danger hover:underline ml-3 disabled:opacity-60">Xoá</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
          <input className={inp} placeholder="Tên phòng ban mới" value={pbTen} onChange={(e) => setPbTen(e.target.value)} />
          <input className={inp + ' w-24'} placeholder="Mã (VD PKD)" value={pbMa} onChange={(e) => setPbMa(e.target.value)} />
          <input className={inp} placeholder="Trưởng bộ phận (ký PDF)" value={pbTbp} onChange={(e) => setPbTbp(e.target.value)} />
          <button onClick={() => chay('themPB', themPB)} disabled={!!busy} className="bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium disabled:opacity-60">{busy === 'themPB' ? 'Đang lưu…' : '+ Thêm phòng ban'}</button>
        </div>
      </div>

      {/* NGƯỜI DÙNG */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold">Người dùng ({users.length})</span>
          <button onClick={() => { setShowAdd(!showAdd); setNu(empty) }} className="bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium">
            {showAdd ? 'Đóng' : '+ Thêm người dùng'}
          </button>
        </div>

        {showAdd && (
          <div className="border border-border rounded-lg p-3 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-accent-50/40">
            <input className={inp} placeholder="Họ tên / Tên phòng" value={nu.ho_ten} onChange={(e) => setNu({ ...nu, ho_ten: e.target.value })} />
            <input className={inp} placeholder="Tài khoản đăng nhập" value={nu.username} onChange={(e) => setNu({ ...nu, username: e.target.value })} />
            <input className={inp} type="text" placeholder="Mật khẩu" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} />
            <select className={inp} value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value as Role })}>
              <option value="nguoi_de_nghi">Người đề nghị</option>
              <option value="hcns">HCNS</option>
              <option value="admin">Quản trị</option>
            </select>
            <select className={inp} value={nu.phong_ban_id} onChange={(e) => setNu({ ...nu, phong_ban_id: e.target.value })}>
              <option value="">— Không thuộc phòng —</option>
              {phongBan.map((p) => <option key={p.id} value={p.id}>{p.ten}</option>)}
            </select>
            <div><button onClick={() => chay('themUser', themUser)} disabled={!!busy} className="bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium w-full sm:w-auto disabled:opacity-60">{busy === 'themUser' ? 'Đang tạo…' : 'Tạo người dùng'}</button></div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted text-left">
              <tr>
                <th className="py-1">Họ tên</th><th className="py-1">Tài khoản</th><th className="py-1">Vai trò</th>
                <th className="py-1">Phòng ban</th><th className="py-1">Trạng thái</th><th className="py-1 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                editUId === u.id ? (
                  <tr key={u.id} className="border-t border-border bg-accent-50/40">
                    <td className="py-1.5 pr-2"><input className={inp + ' w-full'} value={eU.ho_ten} onChange={(e) => setEU({ ...eU, ho_ten: e.target.value })} /></td>
                    <td className="py-1.5 pr-2"><input className={inp + ' w-full'} value={eU.username} onChange={(e) => setEU({ ...eU, username: e.target.value })} /></td>
                    <td className="py-1.5 pr-2">
                      <select className={inp} value={eU.role} disabled={u.bao_ve} onChange={(e) => setEU({ ...eU, role: e.target.value as Role })}>
                        <option value="nguoi_de_nghi">Người đề nghị</option><option value="hcns">HCNS</option><option value="admin">Quản trị</option>
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <select className={inp} value={eU.phong_ban_id} onChange={(e) => setEU({ ...eU, phong_ban_id: e.target.value })}>
                        <option value="">— Không —</option>
                        {phongBan.map((p) => <option key={p.id} value={p.id}>{p.ten}</option>)}
                      </select>
                    </td>
                    <td className="py-1.5" colSpan={1}>
                      <input className={inp + ' w-full'} placeholder="Đặt lại MK (trống=giữ)" value={eU.password} onChange={(e) => setEU({ ...eU, password: e.target.value })} />
                    </td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      <button onClick={() => chay('luuU', () => luuU(u.id))} disabled={!!busy} className="text-accent-600 hover:underline disabled:opacity-60">{busy === 'luuU' ? 'Đang lưu…' : 'Lưu'}</button>
                      <button onClick={() => setEditUId(null)} disabled={!!busy} className="text-muted hover:underline ml-3 disabled:opacity-60">Huỷ</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={u.id} className="border-t border-border">
                    <td className="py-1.5">
                      {u.ho_ten}
                      {u.bao_ve && <span title="Tài khoản quản trị gốc được bảo vệ" className="ml-1">🔒</span>}
                      {u.id === selfId && <span className="text-[11px] text-muted"> (bạn)</span>}
                    </td>
                    <td className="py-1.5">{u.username}</td>
                    <td className="py-1.5">{ROLE_LABEL[u.role]}</td>
                    <td className="py-1.5">{u.phong_ban_id ? pbMap.get(u.phong_ban_id) || '—' : '—'}</td>
                    <td className="py-1.5">{u.is_active ? <span className="text-ok">Hoạt động</span> : <span className="text-muted">Khoá</span>}</td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      {u.bao_ve ? (
                        u.id === selfId ? (
                          <button onClick={() => batDauSuaU(u)} className="text-accent-600 hover:underline">Sửa</button>
                        ) : (
                          <span className="text-muted text-xs">Được bảo vệ</span>
                        )
                      ) : (
                        <>
                          <button onClick={() => batDauSuaU(u)} disabled={!!busy} className="text-accent-600 hover:underline disabled:opacity-60">Sửa</button>
                          <button onClick={() => chay('toggle-' + u.id, () => toggleActive(u))} disabled={!!busy} className="text-warn hover:underline ml-3 disabled:opacity-60">{busy === 'toggle-' + u.id ? '…' : u.is_active ? 'Khoá' : 'Mở'}</button>
                          <button onClick={() => xoaU(u)} disabled={!!busy} className="text-danger hover:underline ml-3 disabled:opacity-60">Xoá</button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NHÓM CHI PHÍ NCC */}
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
