import type { Role } from '@/lib/session'

// Sổ đăng ký MODULE dịch vụ. Thêm module mới = thêm 1 mục ở đây + code route của nó,
// KHÔNG phải sửa lại khung app (AppShell/hub tự đọc danh sách này).
export type ModuleNavItem = { href: string; label: string; roles?: Role[] }
export type AppModule = {
  key: string
  ten: string
  icon: string // emoji
  mo_ta: string
  home: string // đường vào module
  prefixes: string[] // các path prefix thuộc module (để nhận diện module đang mở)
  roles?: Role[] // vai trò thấy module trên hub (bỏ trống = mọi vai trò)
  nav: ModuleNavItem[] // menu con của module
}

export const MODULES: AppModule[] = [
  {
    key: 'vpp',
    ten: 'Đăng ký VPP',
    icon: '🗂️',
    mo_ta: 'Đề xuất mua văn phòng phẩm, thiết bị theo mẫu BM01/QLTS/04-HCNS.',
    home: '/vpp',
    prefixes: ['/vpp'],
    nav: [
      { href: '/vpp', label: 'Tổng quan', roles: ['admin', 'hcns'] },
      { href: '/vpp/dang-ky', label: 'Lập phiếu' },
      { href: '/vpp/phieu', label: 'Danh sách phiếu' },
      { href: '/vpp/san-pham', label: 'Sửa mặt hàng', roles: ['admin'] },
      { href: '/vpp/cap-nhat-gia', label: 'Cập nhật giá', roles: ['admin'] },
      { href: '/vpp/thong-ke', label: 'Báo cáo', roles: ['admin', 'hcns'] },
    ],
  },
  {
    key: 'ncc',
    ten: 'Nhà cung cấp',
    icon: '🏭',
    mo_ta: 'Hồ sơ nhà cung cấp tập trung + đánh giá theo kỳ, nhắc hạn hợp đồng.',
    home: '/ncc',
    prefixes: ['/ncc'],
    roles: ['admin', 'hcns'],
    nav: [{ href: '/ncc', label: 'Danh sách NCC' }],
  },
  {
    key: 'quantri',
    ten: 'Quản trị hệ thống',
    icon: '⚙️',
    mo_ta: 'Người dùng, phòng ban, danh mục và cấu hình thương hiệu.',
    home: '/admin/nguoi-dung',
    prefixes: ['/admin'],
    roles: ['admin'],
    nav: [
      { href: '/admin/nguoi-dung', label: 'Người dùng & Phòng ban' },
      { href: '/admin/danh-muc', label: 'Danh mục' },
      { href: '/admin/cau-hinh', label: 'Cấu hình hiển thị' },
    ],
  },
]

// Module mà user (theo vai trò) được thấy trên hub.
export function moduleChoVaiTro(role: Role): AppModule[] {
  return MODULES.filter((m) => !m.roles || m.roles.includes(role))
}

// Lọc menu con theo vai trò.
export function navChoVaiTro(m: AppModule, role: Role): ModuleNavItem[] {
  return m.nav.filter((n) => !n.roles || n.roles.includes(role))
}

// Module đang mở theo pathname: chọn prefix KHỚP DÀI NHẤT (để /admin/san-pham
// thuộc VPP chứ không nhầm sang /admin của Quản trị).
export function moduleTheoPath(path: string): AppModule | null {
  let best: AppModule | null = null
  let bestLen = -1
  for (const m of MODULES) {
    for (const p of m.prefixes) {
      if ((path === p || path.startsWith(p + '/')) && p.length > bestLen) {
        best = m
        bestLen = p.length
      }
    }
  }
  return best
}
