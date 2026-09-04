-- VHJSC — Đăng ký Văn phòng phẩm. Migration khởi tạo.
-- Chạy trong Supabase SQL Editor (project VHJSC VPP).

create extension if not exists "pgcrypto";

-- Phòng ban ------------------------------------------------------------
create table if not exists vpp_phong_ban (
  id         uuid primary key default gen_random_uuid(),
  ten        text not null,
  ma         text,
  created_at timestamptz not null default now()
);

-- Người dùng ----------------------------------------------------------
create table if not exists vpp_nguoi_dung (
  id            uuid primary key default gen_random_uuid(),
  ho_ten        text not null,
  username      text not null unique,
  password_hash text not null,
  role          text not null default 'nguoi_de_nghi'
                check (role in ('admin','hcns','nguoi_de_nghi')),
  phong_ban_id  uuid references vpp_phong_ban(id) on delete set null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Danh mục sản phẩm (import 634 dòng từ file báo giá) -----------------
create table if not exists vpp_san_pham (
  id         bigint primary key,
  nhom_hang  text not null,
  ten        text not null,
  xuat_xu    text,
  quy_cach   text,
  dvt        text,
  don_gia    numeric,
  anh_url    text,
  dang_ban   boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_sp_nhom on vpp_san_pham (nhom_hang);

-- Phiếu đề xuất (mẫu BM01/QLTS/04-HCNS) -------------------------------
create table if not exists vpp_phieu (
  id                uuid primary key default gen_random_uuid(),
  phong_ban_id      uuid references vpp_phong_ban(id) on delete set null,
  phong_ban_ten     text not null default '',
  nguoi_de_nghi_id  uuid references vpp_nguoi_dung(id) on delete set null,
  nguoi_de_nghi_ten text not null default '',
  thang             text not null,             -- 'YYYY-MM'
  tieu_de           text,                      -- dòng "Đề nghị: Mua sắm ..."
  trang_thai        text not null default 'nhap'
                    check (trang_thai in ('nhap','hoan_tat')),
  ghi_chu           text,
  tong_tien         numeric not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_phieu_thang on vpp_phieu (thang);
create index if not exists idx_phieu_pb on vpp_phieu (phong_ban_id);

-- Dòng trong phiếu (snapshot ĐVT + đơn giá để không đổi theo báo giá) --
create table if not exists vpp_phieu_dong (
  id               uuid primary key default gen_random_uuid(),
  phieu_id         uuid not null references vpp_phieu(id) on delete cascade,
  san_pham_id      bigint references vpp_san_pham(id) on delete set null,
  ten_tay          text,                       -- dùng khi là "mục khác" gõ tay
  dvt              text,
  don_gia          numeric,
  so_luong         numeric not null default 1,
  thoi_gian_can    text,
  ke_hoach_su_dung text,
  ghi_chu          text,
  thu_tu           int not null default 0
);
create index if not exists idx_dong_phieu on vpp_phieu_dong (phieu_id);

-- Bảo mật: bật RLS, KHÔNG tạo policy => anon/authenticated không đọc trực tiếp được.
-- Toàn bộ truy cập đi qua server bằng service_role key (bypass RLS).
alter table vpp_phong_ban   enable row level security;
alter table vpp_nguoi_dung  enable row level security;
alter table vpp_san_pham    enable row level security;
alter table vpp_phieu       enable row level security;
alter table vpp_phieu_dong  enable row level security;
