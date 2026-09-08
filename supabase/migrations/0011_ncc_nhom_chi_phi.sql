-- Danh mục "Nhóm chi phí" cho NCC (admin quản lý, có thứ tự để sắp xếp).
create table if not exists vhjscvpp_ncc_nhom (
  id         uuid primary key default gen_random_uuid(),
  ten        text not null unique,
  thu_tu     int not null default 0,
  created_at timestamptz not null default now()
);
alter table vhjscvpp_ncc_nhom enable row level security;

-- Seed danh sách hiện tại theo đúng thứ tự.
insert into vhjscvpp_ncc_nhom (ten, thu_tu) values
  ('Hành chính', 1),
  ('Lương, thưởng, phúc lợi', 2),
  ('Đào tạo', 3),
  ('Văn hóa DN', 4),
  ('Công nghệ thông tin', 5),
  ('Tuyển dụng', 6),
  ('Khác', 7)
on conflict (ten) do nothing;
