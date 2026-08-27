# QC Ibadah & Akhlak — GitHub Pages + Supabase

Versi awal website QC dengan tiga role:

- **Admin**: melihat seluruh data, kelas, siswa, indikator, input dan rekap.
- **Wali Kelas**: hanya melihat siswa dan QC pada kelasnya.
- **Siswa**: hanya melihat dan mengisi QC miliknya sendiri.

## 1. Buat Project Supabase

1. Buat project baru di Supabase.
2. Buka **SQL Editor**.
3. Jalankan file `supabase/schema.sql`.
4. Buka **Project Settings > API**.
5. Salin Project URL dan Publishable/Anon Key.
6. Masukkan keduanya pada `js/config.js`.

JANGAN pernah menaruh `service_role` key di GitHub/website.

## 2. Buat Akun

Buka **Authentication > Users > Add user**.

### Admin
Contoh email: `admin@sekolah.sch.id`

Setelah akun dibuat, salin UUID lalu buat profile sesuai contoh di:
`supabase/SETUP_AKUN.sql`.

### Wali Kelas
Contoh email: `walas7ae@sekolah.sch.id`.
Profile harus memiliki `role = walas` dan `class_id` kelasnya.

### Siswa
Agar siswa cukup mengetik NIS pada login, buat email internal dengan pola:

`NIS@qc.local`

Contoh:
`262707001@qc.local`

Di halaman login siswa cukup mengetik:
`262707001`

## 3. Upload ke GitHub

Buat repository, misalnya:

`qc-ibadah`

Upload semua file/folder project ini ke branch `main`.

## 4. Aktifkan GitHub Pages

Di repository:

**Settings > Pages > Build and deployment > Deploy from a branch**

Pilih:
- Branch: `main`
- Folder: `/(root)`

Simpan.

Website akan tersedia pada pola:
`https://USERNAME.github.io/qc-ibadah/`

## Struktur

- `index.html` — login
- `app.html` — seluruh dashboard
- `css/style.css` — desain
- `js/config.js` — konfigurasi Supabase
- `js/login.js` — proses login
- `js/app.js` — dashboard Admin/Walas/Siswa dan QC
- `supabase/schema.sql` — database + RLS + 34 indikator
- `supabase/SETUP_AKUN.sql` — contoh pembuatan profile akun

## Keamanan

Website memakai Supabase Auth dan Row Level Security (RLS). Walas dibatasi ke `class_id` miliknya dan siswa dibatasi ke `student_id` miliknya.

Publishable/Anon Key boleh digunakan pada browser selama RLS dikonfigurasi dengan benar. Jangan memasukkan `service_role` key pada file frontend.

## Versi Selanjutnya

Yang belum dibuat pada V1:
- impor siswa massal Excel/CSV dari dashboard;
- pembuatan akun Auth massal dari Admin;
- laporan pekanan/bulanan PDF;
- dashboard grafik per kelas;
- status berbeda antara isian siswa dan verifikasi walas;
- reset password dari Admin.

Untuk fitur pembuatan akun massal secara aman, gunakan backend/Edge Function yang menyimpan `service_role` key hanya sebagai secret server-side.
