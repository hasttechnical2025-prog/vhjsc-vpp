-- Cấu hình hiển thị do admin chỉnh (chữ thương hiệu, logo). Bảng key-value đơn giản.
create table if not exists vhjscvpp_cauhinh (
  key   text primary key,
  value text
);
alter table vhjscvpp_cauhinh enable row level security;

insert into vhjscvpp_cauhinh (key, value)
values ('brand_text', 'VHJSC · VPP')
on conflict (key) do nothing;
