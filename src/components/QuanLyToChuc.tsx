'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PhongBanRow, NguoiDungRow } from '@/lib/types'
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
}: {
  phongBan: PhongBanRow[]
  users: NguoiDungRow[]
  selfId: string
}) {
  const router = useRouter()
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [xacNhan, setXacNhan] = useState<{ message: string; onOk: () => void } | null>(null)
  const pbMap = useMemo(() => new Map(phongBan.map((p) => [p.id, p.ten])), [phongBan])

  function done(m: string) { setErr(''); setMsg(m); router.refresh() }
  function fail(e: string) { setMsg(''); setErr(e) }

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
      onOk: async () => {
        const { ok, data } = await api('DELETE', '/api/admin/phong-ban', { id: p.id })
        if (!ok) return fail(data.error || 'Lỗi')
        done('Đã xoá phòng ban')
      },
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
      onOk: async () => {
        const { ok, data } = await api('DELETE', '/api/admin/nguoi-dung', { id: u.id })
        if (!ok) return fail(data.error || 'Lỗi')
        done('Đã xoá người dùng')
      },
    })
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
                        <button onClick={() => luuPB(p.id)} className="text-accent-600 hover:underline">Lưu</button>
                        <button onClick={() => setEditPbId(null)} className="text-muted hover:underline ml-3">Huỷ</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-1.5">{p.ten}</td>
                      <td className="py-1.5 text-muted">{p.ma || '—'}</td>
                      <td className="py-1.5">{p.truong_bo_phan || <span className="text-muted">—</span>}</td>
                      <td className="py-1.5 text-right whitespace-nowrap">
                        <button onClick={() => batDauSuaPB(p)} className="text-accent-600 hover:underline">Sửa</button>
                        <button onClick={() => xoaPB(p)} className="text-danger hover:underline ml-3">Xoá</button>
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
          <button onClick={themPB} className="bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium">+ Thêm phòng ban</button>
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
            <div><button onClick={themUser} className="bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium w-full sm:w-auto">Tạo người dùng</button></div>
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
                      <select className={inp} value={eU.role} onChange={(e) => setEU({ ...eU, role: e.target.value as Role })}>
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
                      <button onClick={() => luuU(u.id)} className="text-accent-600 hover:underline">Lưu</button>
                      <button onClick={() => setEditUId(null)} className="text-muted hover:underline ml-3">Huỷ</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={u.id} className="border-t border-border">
                    <td className="py-1.5">{u.ho_ten}{u.id === selfId && <span className="text-[11px] text-muted"> (bạn)</span>}</td>
                    <td className="py-1.5">{u.username}</td>
                    <td className="py-1.5">{ROLE_LABEL[u.role]}</td>
                    <td className="py-1.5">{u.phong_ban_id ? pbMap.get(u.phong_ban_id) || '—' : '—'}</td>
                    <td className="py-1.5">{u.is_active ? <span className="text-ok">Hoạt động</span> : <span className="text-muted">Khoá</span>}</td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      <button onClick={() => batDauSuaU(u)} className="text-accent-600 hover:underline">Sửa</button>
                      <button onClick={() => toggleActive(u)} className="text-warn hover:underline ml-3">{u.is_active ? 'Khoá' : 'Mở'}</button>
                      <button onClick={() => xoaU(u)} className="text-danger hover:underline ml-3">Xoá</button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
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
