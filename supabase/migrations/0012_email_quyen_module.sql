-- Nền tảng đăng nhập Google + phân quyền per-cá-nhân × per-module.

-- 1) Email (định danh đăng nhập Google) + cờ super-admin.
alter table vhjscvpp_nguoi_dung add column if not exists email text;
create unique index if not exists idx_nd_email on vhjscvpp_nguoi_dung (lower(email)) where email is not null;
alter table vhjscvpp_nguoi_dung add column if not exists sieu_admin boolean not null default false;

-- 2) Quyền theo từng cá nhân × từng module (1 vai trò / module / user).
create table if not exists vhjscvpp_quyen (
  id            uuid primary key default gen_random_uuid(),
  nguoi_dung_id uuid not null references vhjscvpp_nguoi_dung(id) on delete cascade,
  module        text not null,   -- 'vpp' | 'ncc' | ...
  vai_tro       text not null,   -- vai trò trong module đó
  created_at    timestamptz not null default now(),
  unique (nguoi_dung_id, module)
);
create index if not exists idx_quyen_nd on vhjscvpp_quyen(nguoi_dung_id);
alter table vhjscvpp_quyen enable row level security;
