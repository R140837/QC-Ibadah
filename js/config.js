// ===============================================
// KONFIGURASI SUPABASE
// ===============================================

// Project URL dari Supabase
const SUPABASE_URL = "https://wimralhkzedpzncakjkv.supabase.co";

// Publishable Key dari Supabase
// AMAN digunakan di frontend.
// JANGAN gunakan service_role / secret key.
const SUPABASE_KEY = "sb_publishable_8noy072M84sFIv5NANt7TA_lvCyrM-T";


// ===============================================
// LOGIN SISWA
// ===============================================
// Contoh:
// NIS: 262701364
// Login akan diubah menjadi:
// 262701364@qcalwildan.sch.id

const STUDENT_LOGIN_DOMAIN = "qcalwildan.sch.id";


// ===============================================
// SUPABASE CLIENT
// ===============================================

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
