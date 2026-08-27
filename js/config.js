// =======================================================
// WAJIB DIISI
// Ambil dari Supabase > Project Settings > API.
// Gunakan Publishable/Anon key, JANGAN service_role key.
// =======================================================
const SUPABASE_URL = "https://GANTI-PROJECT.supabase.co";
const SUPABASE_KEY = "GANTI_DENGAN_SUPABASE_ANON_KEY";

// Domain internal untuk login siswa menggunakan NIS.
// Contoh NIS 262707001 akan dibaca sebagai:
// 262707001@qc.local
const STUDENT_LOGIN_DOMAIN = "qc.local";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
