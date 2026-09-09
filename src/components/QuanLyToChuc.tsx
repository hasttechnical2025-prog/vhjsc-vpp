'use client'

import { Fragment, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PhongBanRow, NguoiDungRow } from '@/lib/types'
import ConfirmDialog from './ConfirmDialog'
import NhapUser from './NhapUser'

type Role = 'admin' | 'hcns' | 'nguoi_de_nghi'
const ROLE_LABEL: Record<Role, string> = { admin: 'Quản trị', hcns: 'HCNS', nguoi_de_nghi: 'Người đề nghị' }
type ModuleVaiTro = { key: string; ten: string; vaiTro: { key: string; ten: string }[] }

const boDauTxt = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
// Thứ tự sắp xếp theo vai trò: Quản trị (gồm super-admin) → HCNS → Người đề nghị.
const hangVaiTro = (u: NguoiDungRow) => (u.sieu_admin || u.role === 'admin' ? 0 : u.role === 'hcns' ? 1 : 2)
const tenRieng = (ht: string) => ht.trim().split(/\s+/).pop() || ht

async function api(method: string, url: string, body: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, data }
}

export default function QuanLyToChuc({
  phongBan,
  users,
  selfId,
  quyen,
  moduleVaiTro,
}: {
  phongBan: PhongBanRow[]
  users: NguoiDungRow[]
  selfId: string
  quyen: Record<string, Record<string, string>>
  moduleVaiTro: ModuleVaiTro[]
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

  // ---- Lọc & sắp xếp danh sách người dùng ----
  const [q, setQ] = useState('')
  const [fRole, setFRole] = useState('')
  const [fPb, setFPb] = useState('')
  const dsUser = useMemo(() => {
    const qn = boDauTxt(q.trim())
    const loc = users.filter((u) => {
      if (fRole) { const r = u.sieu_admin ? 'admin' : u.role; if (r !== fRole) return false }
      if (fPb === '__none') { if (u.phong_ban_id) return false } else if (fPb) { if (u.phong_ban_id !== fPb) return false }
      if (qn) {
        const pb = u.phong_ban_id ? pbMap.get(u.phong_ban_id) || '' : ''
        if (!boDauTxt(`${u.ho_ten} ${u.username} ${u.email || ''} ${pb}`).includes(qn)) return false
      }
      return true
    })
    return loc.sort((a, b) =>
      hangVaiTro(a) - hangVaiTro(b) ||
      tenRieng(a.ho_ten).localeCompare(tenRieng(b.ho_ten), 'vi') ||
      a.ho_ten.localeCompare(b.ho_ten, 'vi'),
    )
  }, [users, q, fRole, fPb, pbMap])

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

  // ---- Phân quyền cá nhân ----
  const [quyenUId, setQuyenUId] = useState<string | null>(null)
  const [qSieu, setQSieu] = useState(false)
  const [qMod, setQMod] = useState<Record<string, string>>({})
  function moQuyen(u: NguoiDungRow) {
    setQuyenUId(u.id); setQSieu(u.sieu_admin); setQMod({ ...(quyen[u.id] || {}) })
  }
  async function luuQuyen(id: string) {
    const { ok, data } = await api('POST', '/api/admin/nguoi-dung/quyen', { id, sieu_admin: qSieu, quyen: qMod })
    if (!ok) return fail(data.error || 'Lỗi')
    setQuyenUId(null); done('Đã cập nhật quyền')
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
        <div className="flex items-start justify-between mb-3 gap-2">
          <span className="font-semibold">Người dùng ({dsUser.length !== users.length ? `${dsUser.length}/${users.length}` : users.length})</span>
          <div className="flex items-start gap-2">
            <NhapUser />
            <button onClick={() => { setShowAdd(!showAdd); setNu(empty) }} className="bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium">
              {showAdd ? 'Đóng' : '+ Thêm người dùng'}
            </button>
          </div>
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

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input className={inp + ' flex-1 min-w-[180px]'} placeholder="Tìm tên, tài khoản, email, phòng ban…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className={inp} value={fRole} onChange={(e) => setFRole(e.target.value)}>
            <option value="">Tất cả vai trò</option>
            <option value="admin">Quản trị</option>
            <option value="hcns">HCNS</option>
            <option value="nguoi_de_nghi">Người đề nghị</option>
          </select>
          <select className={inp} value={fPb} onChange={(e) => setFPb(e.target.value)}>
            <option value="">Tất cả phòng ban</option>
            {phongBan.map((p) => <option key={p.id} value={p.id}>{p.ten}</option>)}
            <option value="__none">— Chưa có phòng —</option>
          </select>
          {(q || fRole || fPb) && (
            <button onClick={() => { setQ(''); setFRole(''); setFPb('') }} className="text-sm text-muted hover:text-accent-600">Xoá lọc</button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted text-left">
              <tr>
                <th className="py-1">Họ tên</th><th className="py-1">Tài khoản</th><th className="py-1">Vai trò</th>
                <th className="py-1">Phòng ban</th><th className="py-1">Trạng thái</th><th className="py-1 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {dsUser.map((u) => (
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
                  <Fragment key={u.id}>
                  <tr className="border-t border-border">
                    <td className="py-1.5">
                      {u.ho_ten}
                      {u.sieu_admin && <span title="Super-admin (mọi module)" className="ml-1 text-[10px] px-1 rounded bg-accent text-white align-middle">SA</span>}
                      {u.bao_ve && <span title="Tài khoản quản trị gốc được bảo vệ" className="ml-1">🔒</span>}
                      {u.id === selfId && <span className="text-[11px] text-muted"> (bạn)</span>}
                    </td>
                    <td className="py-1.5">
                      <div>{u.username}</div>
                      {u.email && <div className="text-[11px] text-muted">{u.email}</div>}
                    </td>
                    <td className="py-1.5">{u.sieu_admin ? 'Quản trị' : ROLE_LABEL[u.role]}</td>
                    <td className="py-1.5">{u.phong_ban_id ? pbMap.get(u.phong_ban_id) || '—' : '—'}</td>
                    <td className="py-1.5">{u.is_active ? <span className="text-ok">Hoạt động</span> : <span className="text-muted">Khoá</span>}</td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      <button onClick={() => (quyenUId === u.id ? setQuyenUId(null) : moQuyen(u))} disabled={!!busy} className="text-accent-600 hover:underline disabled:opacity-60">Quyền</button>
                      {u.bao_ve ? (
                        u.id === selfId ? (
                          <button onClick={() => batDauSuaU(u)} className="text-accent-600 hover:underline ml-3">Sửa</button>
                        ) : (
                          <span className="text-muted text-xs ml-3">Được bảo vệ</span>
                        )
                      ) : (
                        <>
                          <button onClick={() => batDauSuaU(u)} disabled={!!busy} className="text-accent-600 hover:underline ml-3 disabled:opacity-60">Sửa</button>
                          <button onClick={() => chay('toggle-' + u.id, () => toggleActive(u))} disabled={!!busy} className="text-warn hover:underline ml-3 disabled:opacity-60">{busy === 'toggle-' + u.id ? '…' : u.is_active ? 'Khoá' : 'Mở'}</button>
                          <button onClick={() => xoaU(u)} disabled={!!busy} className="text-danger hover:underline ml-3 disabled:opacity-60">Xoá</button>
                        </>
                      )}
                    </td>
                  </tr>
                  {quyenUId === u.id && (
                    <tr className="bg-accent-50/30 border-t border-border">
                      <td colSpan={6} className="py-3 px-2">
                        <div className="flex flex-wrap items-center gap-4">
                          <label className="flex items-center gap-1.5 text-sm font-medium">
                            <input type="checkbox" checked={qSieu} onChange={(e) => setQSieu(e.target.checked)} />
                            Super-admin <span className="text-xs text-muted">(toàn quyền mọi module)</span>
                          </label>
                          {!qSieu && moduleVaiTro.map((m) => (
                            <label key={m.key} className="text-sm flex items-center gap-1.5">
                              <span className="text-muted">{m.ten}:</span>
                              <select className={inp} value={qMod[m.key] || ''} onChange={(e) => setQMod((q) => ({ ...q, [m.key]: e.target.value }))}>
                                <option value="">— Không —</option>
                                {m.vaiTro.map((v) => <option key={v.key} value={v.key}>{v.ten}</option>)}
                              </select>
                            </label>
                          ))}
                          <div className="ml-auto flex items-center gap-2">
                            <button onClick={() => chay('luuQuyen', () => luuQuyen(u.id))} disabled={!!busy} className="bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium disabled:opacity-60">{busy === 'luuQuyen' ? 'Đang lưu…' : 'Lưu quyền'}</button>
                            <button onClick={() => setQuyenUId(null)} className="text-muted hover:text-foreground text-sm">Huỷ</button>
                          </div>
                        </div>
                        {qSieu && <div className="text-xs text-muted mt-2">Super-admin thấy & làm mọi thứ ở tất cả module — không cần cấp vai trò từng module.</div>}
                      </td>
                    </tr>
                  )}
                  </Fragment>
                )
              ))}
              {dsUser.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-center text-muted">Không có người dùng khớp bộ lọc.</td></tr>
              )}
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
