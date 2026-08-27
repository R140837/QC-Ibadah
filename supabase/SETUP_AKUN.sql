-- ===========================================================
-- SETUP AKUN
-- ===========================================================
-- 1. Buat akun lebih dulu di Supabase:
--    Authentication > Users > Add user
--
-- 2. Salin UUID user tersebut.
--
-- 3. Jalankan contoh INSERT berikut di SQL Editor.
--
-- PENTING:
-- email siswa dapat dibuat seperti NIS@qc.local
-- contoh: 262707001@qc.local
-- sehingga di halaman login siswa cukup mengetik 262707001.

-- CONTOH KELAS:
-- insert into public.classes(name,level,program,academic_year)
-- values ('7 AE','SMP','AE','2026/2027')
-- returning id;

-- CONTOH ADMIN:
-- insert into public.profiles(id,full_name,role)
-- values ('UUID-AUTH-ADMIN','NAMA ADMIN','admin');

-- CONTOH WALAS:
-- insert into public.profiles(id,full_name,role,class_id)
-- values ('UUID-AUTH-WALAS','NAMA WALAS','walas','UUID-KELAS');

-- CONTOH SISWA:
-- insert into public.students(nis,full_name,class_id,tic)
-- values ('262707001','AHMAD FULAN','UUID-KELAS','AE')
-- returning id;
--
-- lalu:
-- insert into public.profiles(id,full_name,role,class_id,student_id)
-- values ('UUID-AUTH-SISWA','AHMAD FULAN','student','UUID-KELAS','UUID-STUDENT');
