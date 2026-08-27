-- ===========================================================
-- QC IBADAH & AKHLAK - DATABASE SCHEMA V1
-- Jalankan di Supabase > SQL Editor
-- ===========================================================

create extension if not exists "pgcrypto";

-- ---------- ENUM ----------
do $$ begin
  create type public.user_role as enum ('admin','walas','student');
exception
  when duplicate_object then null;
end $$;

-- ---------- TABLES ----------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  level text,
  program text,
  academic_year text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  nis text not null unique,
  nisn text,
  full_name text not null,
  class_id uuid references public.classes(id) on delete set null,
  tic text,
  parent_name text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null,
  class_id uuid references public.classes(id) on delete set null,
  student_id uuid unique references public.students(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.qc_indicators (
  id uuid primary key default gen_random_uuid(),
  sort_order integer not null unique,
  category text not null check (category in ('IBADAH WAJIB','IBADAH SUNNAH','ADAB & AKHLAK')),
  name text not null,
  description text,
  active boolean not null default true
);

create table if not exists public.qc_daily (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  qc_date date not null,
  indicator_id uuid not null references public.qc_indicators(id) on delete cascade,
  status boolean not null default false,
  input_by uuid not null references auth.users(id),
  input_role public.user_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id,qc_date,indicator_id)
);

create index if not exists idx_students_class_id on public.students(class_id);
create index if not exists idx_profiles_class_id on public.profiles(class_id);
create index if not exists idx_qc_daily_student_date on public.qc_daily(student_id,qc_date);
create index if not exists idx_qc_daily_input_by on public.qc_daily(input_by);

-- ---------- UPDATED_AT ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_qc_daily_updated_at on public.qc_daily;
create trigger trg_qc_daily_updated_at
before update on public.qc_daily
for each row execute function public.set_updated_at();

-- ---------- HELPER FUNCTIONS FOR RLS ----------
create or replace function public.current_role()
returns public.user_role
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_class_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select class_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_student_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select student_id from public.profiles where id = auth.uid()
$$;

revoke all on function public.current_role() from public;
revoke all on function public.current_class_id() from public;
revoke all on function public.current_student_id() from public;
grant execute on function public.current_role() to authenticated;
grant execute on function public.current_class_id() to authenticated;
grant execute on function public.current_student_id() to authenticated;

-- ---------- RLS ----------
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.profiles enable row level security;
alter table public.qc_indicators enable row level security;
alter table public.qc_daily enable row level security;

-- Recreate policies safely
drop policy if exists "classes_select" on public.classes;
drop policy if exists "classes_admin_insert" on public.classes;
drop policy if exists "classes_admin_update" on public.classes;
drop policy if exists "classes_admin_delete" on public.classes;

create policy "classes_select" on public.classes
for select to authenticated
using (true);

create policy "classes_admin_insert" on public.classes
for insert to authenticated
with check (public.current_role() = 'admin');

create policy "classes_admin_update" on public.classes
for update to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create policy "classes_admin_delete" on public.classes
for delete to authenticated
using (public.current_role() = 'admin');

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_admin_insert" on public.profiles;
drop policy if exists "profiles_admin_update" on public.profiles;

create policy "profiles_select" on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.current_role() = 'admin'
  or (
    public.current_role() = 'walas'
    and class_id = public.current_class_id()
  )
);

create policy "profiles_admin_insert" on public.profiles
for insert to authenticated
with check (public.current_role() = 'admin');

create policy "profiles_admin_update" on public.profiles
for update to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "students_select" on public.students;
drop policy if exists "students_admin_insert" on public.students;
drop policy if exists "students_admin_update" on public.students;
drop policy if exists "students_admin_delete" on public.students;

create policy "students_select" on public.students
for select to authenticated
using (
  public.current_role() = 'admin'
  or (public.current_role() = 'walas' and class_id = public.current_class_id())
  or (public.current_role() = 'student' and id = public.current_student_id())
);

create policy "students_admin_insert" on public.students
for insert to authenticated
with check (public.current_role() = 'admin');

create policy "students_admin_update" on public.students
for update to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create policy "students_admin_delete" on public.students
for delete to authenticated
using (public.current_role() = 'admin');

drop policy if exists "indicators_select" on public.qc_indicators;
drop policy if exists "indicators_admin_insert" on public.qc_indicators;
drop policy if exists "indicators_admin_update" on public.qc_indicators;
drop policy if exists "indicators_admin_delete" on public.qc_indicators;

create policy "indicators_select" on public.qc_indicators
for select to authenticated
using (true);

create policy "indicators_admin_insert" on public.qc_indicators
for insert to authenticated
with check (public.current_role() = 'admin');

create policy "indicators_admin_update" on public.qc_indicators
for update to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create policy "indicators_admin_delete" on public.qc_indicators
for delete to authenticated
using (public.current_role() = 'admin');

drop policy if exists "qc_select" on public.qc_daily;
drop policy if exists "qc_insert" on public.qc_daily;
drop policy if exists "qc_update" on public.qc_daily;
drop policy if exists "qc_delete_admin" on public.qc_daily;

create policy "qc_select" on public.qc_daily
for select to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role() = 'student'
    and student_id = public.current_student_id()
  )
  or (
    public.current_role() = 'walas'
    and exists (
      select 1 from public.students s
      where s.id = qc_daily.student_id
        and s.class_id = public.current_class_id()
    )
  )
);

create policy "qc_insert" on public.qc_daily
for insert to authenticated
with check (
  input_by = auth.uid()
  and input_role = public.current_role()
  and (
    public.current_role() = 'admin'
    or (
      public.current_role() = 'student'
      and student_id = public.current_student_id()
    )
    or (
      public.current_role() = 'walas'
      and exists (
        select 1 from public.students s
        where s.id = qc_daily.student_id
          and s.class_id = public.current_class_id()
      )
    )
  )
);

create policy "qc_update" on public.qc_daily
for update to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role() = 'student'
    and student_id = public.current_student_id()
  )
  or (
    public.current_role() = 'walas'
    and exists (
      select 1 from public.students s
      where s.id = qc_daily.student_id
        and s.class_id = public.current_class_id()
    )
  )
)
with check (
  input_by = auth.uid()
  and input_role = public.current_role()
);

create policy "qc_delete_admin" on public.qc_daily
for delete to authenticated
using (public.current_role() = 'admin');

-- ---------- GRANTS ----------
revoke all on table public.classes, public.students, public.profiles, public.qc_indicators, public.qc_daily from anon;
grant select, insert, update, delete on table public.classes, public.students, public.profiles, public.qc_indicators, public.qc_daily to authenticated;

-- ---------- 34 DEFAULT INDICATORS ----------
insert into public.qc_indicators(sort_order,category,name) values
(1,'IBADAH WAJIB','Sholat Subuh'),
(2,'IBADAH WAJIB','Sholat Dzuhur'),
(3,'IBADAH WAJIB','Sholat Ashar'),
(4,'IBADAH WAJIB','Sholat Maghrib'),
(5,'IBADAH WAJIB','Sholat Isya'),
(6,'IBADAH SUNNAH','Sholat Witir'),
(7,'IBADAH SUNNAH','Sholat Qiyamul Lail'),
(8,'IBADAH SUNNAH','Sholat Dhuha'),
(9,'IBADAH SUNNAH','Sholat Sunnah Qabliyah Subuh'),
(10,'IBADAH SUNNAH','Sholat Sunnah Sebelum dan Sesudah Dzuhur'),
(11,'IBADAH SUNNAH','Sholat Sunnah Setelah Maghrib'),
(12,'IBADAH SUNNAH','Sholat Sunnah Setelah Isya'),
(13,'IBADAH SUNNAH','Membaca Dzikir setelah Sholat'),
(14,'IBADAH SUNNAH','Membaca Dzikir Pagi dan Petang'),
(15,'IBADAH SUNNAH','Wudhu dan dzikir sebelum tidur'),
(16,'IBADAH SUNNAH','Membaca Al-Qur''an'),
(17,'IBADAH SUNNAH','Bersedekah'),
(18,'IBADAH SUNNAH','Menjaga wudhu'),
(19,'ADAB & AKHLAK','Tidur lebih cepat / tidak begadang'),
(20,'ADAB & AKHLAK','Selalu mengucapkan salam'),
(21,'ADAB & AKHLAK','Berwajah ramah dengan memberi senyum'),
(22,'ADAB & AKHLAK','Cium tangan orang tua dan mendoakannya saat akan pergi/pulang'),
(23,'ADAB & AKHLAK','Patuh terhadap orang tua dan guru'),
(24,'ADAB & AKHLAK','Tidak memandang orang tua, guru, dan orang lain dengan pandangan tajam'),
(25,'ADAB & AKHLAK','Tidak meninggikan suara kepada orang tua dan guru'),
(26,'ADAB & AKHLAK','Mendoakan orang tua dan seluruh kaum muslimin'),
(27,'ADAB & AKHLAK','Selalu berdoa dalam mengawali kegiatan/aktivitas'),
(28,'ADAB & AKHLAK','Berkata jujur'),
(29,'ADAB & AKHLAK','Menjaga kebersihan diri dan lingkungan'),
(30,'ADAB & AKHLAK','Menjaga adab makan dan minum'),
(31,'ADAB & AKHLAK','Menjaga lisan dari perkataan buruk'),
(32,'ADAB & AKHLAK','Menghormati yang lebih tua dan menyayangi yang lebih muda'),
(33,'ADAB & AKHLAK','Disiplin dan bertanggung jawab'),
(34,'ADAB & AKHLAK','Membantu pekerjaan rumah')
on conflict (sort_order) do nothing;
