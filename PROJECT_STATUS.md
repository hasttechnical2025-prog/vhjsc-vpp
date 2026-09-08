# PROJECT_STATUS — Dịch vụ Hành chính VHJSC

Cập nhật: 2026-09-08

## Hiện trạng: ĐANG CHẠY (beta nội bộ), triển khai Vercel
App đã dựng đầy đủ và deploy. Đã chuyển thành **hub đa module**. VPP còn giai đoạn thử nghiệm/test nội bộ.

- Code: `D:\Claude Code\VHJSC VPP App` (đã rời Google Drive + sang ổ mới sau sự cố ổ hỏng 2026-09-08).
- Repo: `hasttechnical2025-prog/vhjsc-vpp` (branch `main`) → Vercel. Supabase `https://bkdupkjrafaprvdseued.supabase.co`, bucket `vhjscvpp-images`, prefix bảng `vhjscvpp_`.
- `.env.local`: URL sẵn; **user cần dán lại** `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` (chỉ cần khi chạy script). Build dùng `SESSION_SECRET=build-dummy`.

## Kiến trúc
- **Hub + module registry** `src/lib/modules.ts`: `vpp` (`/vpp`), `ncc` (`/ncc`), `quantri` (`/admin`). Trang chủ `/` = thẻ chọn module; header 2 hàng sticky, `ModuleNav.tsx` menu theo module. Thêm module = thêm mục trong registry + route riêng.
- Route VPP ở `/vpp/*`; API ở `/api/*`; `next.config.ts` redirect đường cũ → `/vpp/*`.
- Auth cookie `vpp_session` + scrypt (`src/lib/session.ts`, `password.ts`). Role `admin|hcns|nguoi_de_nghi`; tài khoản admin có cờ `bao_ve`.

## Module & chức năng đã có
- **Đăng ký VPP**: lập phiếu (giỏ hàng, biến thể màu theo SL từng màu, auto-scroll tới mặt hàng vừa thêm) · duyệt/từ chối (accordion) · khoá phiếu đã duyệt · xuất **PDF BM01** (pdfmake) · cập nhật giá từ xlsx (đối chiếu) · sửa mặt hàng + thay ảnh + đổi tên nhóm (admin) · thống kê + xuất Excel (theo phòng/nhóm %/top SP/xu hướng).
- **Nhà cung cấp (NCC)**: 43 NCC, hồ sơ + đánh giá theo kỳ (5 tiêu chí trọng số → A/B/C, lịch sử) + đính kèm tệp + banner/cron nhắc hạn hợp đồng (Telegram).
- **Quản trị**: CRUD người dùng/phòng ban (admin gốc được bảo vệ) + cấu hình logo/brand.
- **Nền tảng**: Telegram thông báo phiếu mới (cần env) · Realtime (Supabase broadcast) · banner phiên bản mới.

## Migration: đã chạy tới 0009 (`supabase/migrations/`)
DDL do user chạy trên Supabase SQL Editor. Bảng: phong_ban, nguoi_dung, san_pham (cột tên = `ten`), phieu, phieu_dong, cauhinh, ncc/ncc_danh_gia/ncc_tep.

## Việc treo / cân nhắc
1. User dán lại `.env.local` keys (nếu cần chạy script service_role).
2. Cấu hình Telegram env (`TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`) trên Vercel để bật thông báo/nhắc hạn.
3. Đặt Vercel function region = Supabase region (sin1) giảm trễ.
4. NCC phase 2: theo dõi chi tiêu theo NCC + nhắc đến hạn thanh toán tự động.
5. Module mới (Đăng ký Công tác, Xe…) — chờ user chốt ý tưởng.

## Gotcha
- Sau khi di chuyển route phải `rm -rf .next` rồi build (type cache đường cũ).
- Ảnh trên Supabase Storage (public); `next.config.ts` whitelist `*.supabase.co`.
- Danh sách dài → `selectAll()`. KHÔNG popup trình duyệt (dùng `ConfirmDialog`).
