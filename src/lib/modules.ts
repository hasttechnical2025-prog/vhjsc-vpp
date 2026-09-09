// Sổ đăng ký MODULE dịch vụ. Thêm module mới = thêm 1 mục ở đây + code route của nó,
// KHÔNG phải sửa lại khung app (AppShell/hub tự đọc danh sách này).
// Gate quyền theo "capability" (xem src/lib/guard.ts): `capVao` = khả năng cần để
// vào module; `can` trên mỗi mục nav = khả năng cần để thấy mục đó.
export type ModuleNavItem = { href: string; label: string; can?: string }
export type ModuleVaiTro = { key: string; ten: string } // vai trò per-module (cho phân quyền cá nhân)
export type AppModule = {
  key: string
  ten: string
  icon: string // emoji
  mo_ta: string
  home: string // đường vào module
  prefixes: string[] // các path prefix thuộc module (để nhận diện module đang mở)
  capVao?: string // khả năng cần để thấy/vào module (bỏ trống = mọi user đăng nhập)
  nav: ModuleNavItem[] // menu con của module
  vaiTro?: ModuleVaiTro[] // bộ vai trò để cấp quyền cá nhân (super-admin có tất cả)
}

export const MODULES: AppModule[] = [
  {
    key: 'vpp',
    ten: 'Đăng ký VPP',
    icon: '🗂️',
    mo_ta: 'Đề xuất mua văn phòng phẩm, thiết bị theo mẫu BM01/QLTS/04-HCNS.',
    home: '/vpp',
    prefixes: ['/vpp'],
    capVao: 'vpp.vao',
    nav: [
      { href: '/vpp', label: 'Tổng quan', can: 'vpp.duyet' },
      { href: '/vpp/dang-ky', label: 'Lập phiếu' },
      { href: '/vpp/phieu', label: 'Danh sách phiếu' },
      { href: '/vpp/san-pham', label: 'Sửa mặt hàng', can: 'vpp.quan_ly' },
      { href: '/vpp/cap-nhat-gia', label: 'Cập nhật giá', can: 'vpp.quan_ly' },
      { href: '/vpp/thong-ke', label: 'Báo cáo', can: 'vpp.duyet' },
    ],
    vaiTro: [
      { key: 'nguoi_de_nghi', ten: 'Người đề nghị' },
      { key: 'duyet', ten: 'Người duyệt' },
      { key: 'quan_ly', ten: 'Quản lý VPP' },
    ],
  },
  {
    key: 'ncc',
    ten: 'Nhà cung cấp',
    icon: '🏭',
    mo_ta: 'Hồ sơ nhà cung cấp tập trung + đánh giá theo kỳ, nhắc hạn hợp đồng.',
    home: '/ncc',
    prefixes: ['/ncc'],
    capVao: 'ncc.vao',
    nav: [{ href: '/ncc', label: 'Danh sách NCC' }],
    vaiTro: [
      { key: 'xem', ten: 'Xem' },
      { key: 'quan_ly', ten: 'Quản lý' },
    ],
  },
  {
    key: 'quantri',
    ten: 'Quản trị hệ thống',
    icon: '⚙️',
    mo_ta: 'Người dùng, phòng ban, danh mục và cấu hình thương hiệu.',
    home: '/admin/nguoi-dung',
    prefixes: ['/admin'],
    capVao: 'quantri',
    nav: [
      { href: '/admin/nguoi-dung', label: 'Người dùng & Phòng ban' },
      { href: '/admin/danh-muc', label: 'Danh mục' },
      { href: '/admin/cau-hinh', label: 'Cấu hình hiển thị' },
    ],
    vaiTro: [{ key: 'quan_tri', ten: 'Quản trị' }],
  },
]

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
