const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const message = document.getElementById("loginMessage");
const btn = document.getElementById("loginBtn");

document.getElementById("togglePassword").addEventListener("click", (e) => {
  passwordInput.type = passwordInput.type === "password" ? "text" : "password";
  e.target.textContent = passwordInput.type === "password" ? "Lihat" : "Sembunyikan";
});

function normalizeLogin(value) {
  const clean = value.trim();
  if (!clean.includes("@")) return `${clean}@${STUDENT_LOGIN_DOMAIN}`;
  return clean.toLowerCase();
}

async function alreadyLoggedIn() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) location.href = "app.html";
}
alreadyLoggedIn();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  message.textContent = "";
  btn.disabled = true;
  btn.textContent = "MEMERIKSA...";

  const email = normalizeLogin(emailInput.value);
  const password = passwordInput.value;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    message.textContent = "Email/username atau password tidak sesuai.";
    btn.disabled = false;
    btn.textContent = "MASUK";
    return;
  }

  location.href = "app.html";
});
