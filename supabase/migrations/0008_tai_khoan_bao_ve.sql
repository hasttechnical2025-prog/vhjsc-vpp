-- Tài khoản quản trị GỐC được bảo vệ: admin khác không thể khoá / xoá / hạ quyền,
-- và không thể đổi mật khẩu hộ (chỉ chính chủ tự đổi được). Cờ gắn theo TÀI KHOẢN
-- nên đổi username về sau vẫn giữ bảo vệ.
alter table vhjscvpp_nguoi_dung add column if not exists bao_ve boolean not null default false;

-- Đánh dấu tài khoản admin hiện có là tài khoản gốc được bảo vệ.
update vhjscvpp_nguoi_dung set bao_ve = true where username = 'admin';
