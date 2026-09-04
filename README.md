# VHJSC — Đăng ký Văn phòng phẩm

Ứng dụng nội bộ để các phòng ban **lập phiếu đề xuất mua VPP** theo mẫu
**BM01/QLTS/04-HCNS** và **xuất PDF** để trình duyệt trên base.vn.

- **Next.js 16** (App Router, routing SSR — không PWA)
- **Supabase** (Postgres + Storage + auth tự viết bằng cookie httpOnly/scrypt)
- **Vercel** deploy · **pdfmake** xuất PDF (font Roboto có dấu tiếng Việt)

## Chạy local

```bash
npm install
cp .env.local.example .env.local   # điền key Supabase + SESSION_SECRET
npm run dev                        # http://localhost:3000
```

## Thiết lập Supabase (một lần)

1. Mở **SQL Editor** trên Supabase, chạy toàn bộ `supabase/migrations/0001_init.sql`.
2. Điền `.env.local` (URL + anon key + service_role key + SESSION_SECRET).
3. Chạy seed để tạo bucket ảnh, import 634 sản phẩm, tạo phòng ban + tài khoản:

```bash
npm run seed
```

Seed tạo sẵn:
- Bucket `vpp-images` (public) + 451 ảnh từ `seed-data/images/`
- 634 sản phẩm (`seed-data/vhjscvpp_san_pham.csv`)
- Phòng ban **Phòng kinh doanh** (mã PKD)
- Tài khoản **admin / admin123** và **pkd / pkd123** — *đổi mật khẩu ngay*

## Cấu trúc

| Đường dẫn | Vai trò |
|---|---|
| `/login` | Đăng nhập |
| `/` | Tổng quan (thẻ KPI) |
| `/dang-ky` | Lập phiếu: chọn từ danh mục (có ảnh) + thêm mục khác |
| `/phieu`, `/phieu/[id]` | Danh sách / chi tiết phiếu + **Xuất PDF** |
| `/admin` | Quản trị (người dùng, phòng ban, danh mục) |
| `/api/phieu/[id]/pdf` | Sinh PDF mẫu BM01 |

## Bảo mật

- Toàn bộ truy cập dữ liệu đi qua **service_role** ở server; các bảng bật **RLS** không policy nên client (anon) không đọc trực tiếp được.
- Mật khẩu băm **scrypt** có salt; phiên đăng nhập là cookie httpOnly ký HMAC.
- **Không commit** `.env.local`.
