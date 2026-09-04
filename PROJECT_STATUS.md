# PROJECT_STATUS — VHJSC Đăng ký VPP

Cập nhật: 2026-09-04

## Hiện trạng: SCAFFOLD XONG, chờ key Supabase để seed + chạy thật

Đã dựng khung app đầy đủ, `next build` sạch, xuất PDF tiếng Việt đã kiểm chứng.
Chưa chạy được luồng có dữ liệu vì `.env.local` chưa có key thật.

## Đã có
- Next.js 16 App Router + Tailwind 4 (chỉ light, accent xanh).
- Auth cookie httpOnly + scrypt (`src/lib/session.ts`, `src/lib/password.ts`). Role: `admin | hcns | nguoi_de_nghi`.
- Migration `supabase/migrations/0001_init.sql`: 5 bảng (vhjscvpp_phong_ban, vhjscvpp_nguoi_dung, vhjscvpp_san_pham, vhjscvpp_phieu, vhjscvpp_phieu_dong) + RLS.
- Seed `scripts/seed.mjs`: bucket ảnh + upload 451 ảnh + import 634 SP + phòng ban PKD + tài khoản admin/pkd.
- UI: `/login`, `/` (KPI), `/dang-ky` (catalog có ảnh + mục khác), `/phieu`, `/phieu/[id]`, `/admin`.
- Xuất PDF BM01: `src/lib/pdf/bm01.ts` (pdfmake, font Roboto in-memory) qua `/api/phieu/[id]/pdf`.
- Dữ liệu nguồn: `seed-data/` (CSV commit; ảnh gitignore).

## Việc tiếp theo
1. Tạo project Supabase, chạy migration, điền `.env.local`, `npm run seed`.
2. Kết nối GitHub repo `hasttechnical2025-prog/vhjsc-vpp` với Vercel; set env (4 biến) trên Vercel.
3. Bổ sung: quản trị người dùng/phòng ban CRUD; bật/tắt & sửa giá sản phẩm; sửa/xoá phiếu; lọc danh sách phiếu theo tháng/phòng ban.
4. Cân nhắc: logo VHJSC thật trên PDF; nhiều phòng ban; nhập giá mới hàng tháng.

## Gotcha
- Thư mục nằm trong **Google Drive** → `node_modules`/`.next` bị Drive đồng bộ (chậm, cảnh báo "slow filesystem"). Nên tạm dừng sync khi dev hoặc chuyển ra ổ local.
- Ảnh SP để trên Supabase Storage (public); `next.config.ts` đã whitelist `*.supabase.co`.
- Preview trong Claude bám project của phiên hiện tại; chạy dev thủ công `npx next dev -p <port>` nếu cần xem.
