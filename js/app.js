let CURRENT_USER = null;
let PROFILE = null;
let CURRENT_PAGE = "dashboard";

const content = document.getElementById("content");
const pageTitle = document.getElementById("pageTitle");

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  location.href = "index.html";
});

function esc(value="") {
  return String(value).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function fmtDate(dateStr) {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    weekday:"long", day:"2-digit", month:"long", year:"numeric"
  }).format(new Date(dateStr + "T00:00:00"));
}

function todayISO(){
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off*60000).toISOString().slice(0,10);
}

function badge(text, type="gray"){
  return `<span class="badge badge-${type}">${esc(text)}</span>`;
}

async function init() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    location.href = "index.html";
    return;
  }
  CURRENT_USER = user;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id,full_name,role,class_id,student_id,classes(name)")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    document.getElementById("loadingScreen").innerHTML =
      `<div class="card"><h3>Profil belum tersedia</h3><p class="muted">Akun Auth sudah ada, tetapi baris profile belum dibuat.</p></div>`;
    return;
  }

  PROFILE = data;
  document.getElementById("userName").textContent = PROFILE.full_name;
  document.getElementById("avatar").textContent = PROFILE.full_name?.charAt(0)?.toUpperCase() || "U";
  document.getElementById("roleLabel").textContent =
    PROFILE.role === "admin" ? "ADMINISTRATOR" :
    PROFILE.role === "walas" ? "WALI KELAS" : "SISWA";

  document.getElementById("userMeta").textContent =
    PROFILE.role === "admin" ? "Seluruh kelas" :
    PROFILE.classes?.name || "-";

  buildNav();
  document.getElementById("loadingScreen").classList.add("hidden");
  document.getElementById("appShell").classList.remove("hidden");
  await renderDashboard();
}

function buildNav(){
  const admin = [
    ["dashboard","Dashboard"],
    ["classes","Data Kelas"],
    ["students","Data Siswa"],
    ["indicators","Indikator QC"],
    ["qc","Input QC"],
    ["recap","Rekap QC"]
  ];
  const walas = [
    ["dashboard","Dashboard"],
    ["qc","Input QC"],
    ["recap","Rekap Kelas"]
  ];
  const student = [
    ["dashboard","Dashboard"],
    ["qc","Isi QC"],
    ["history","Riwayat"]
  ];

  const menu = PROFILE.role === "admin" ? admin : PROFILE.role === "walas" ? walas : student;
  const nav = document.getElementById("navMenu");
  nav.innerHTML = menu.map(([id,label]) =>
    `<button class="nav-btn ${id==="dashboard"?"active":""}" data-page="${id}">${label}</button>`
  ).join("");

  nav.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      nav.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      CURRENT_PAGE = btn.dataset.page;
      if (CURRENT_PAGE==="dashboard") await renderDashboard();
      if (CURRENT_PAGE==="classes") await renderClasses();
      if (CURRENT_PAGE==="students") await renderStudents();
      if (CURRENT_PAGE==="indicators") await renderIndicators();
      if (CURRENT_PAGE==="qc") await renderQC();
      if (CURRENT_PAGE==="recap") await renderRecap();
      if (CURRENT_PAGE==="history") await renderHistory();
    });
  });
}

async function renderDashboard(){
  pageTitle.textContent = "Dashboard";
  if (PROFILE.role === "student") return renderStudentDashboard();

  const classFilter = PROFILE.role === "walas" ? PROFILE.class_id : null;
  let studentsQ = supabaseClient.from("students").select("id",{count:"exact",head:true}).eq("active",true);
  if (classFilter) studentsQ = studentsQ.eq("class_id",classFilter);
  const studentsRes = await studentsQ;

  let dailyQ = supabaseClient.from("qc_daily").select("student_id").eq("qc_date",todayISO());
  if (classFilter) {
    const {data: ids} = await supabaseClient.from("students").select("id").eq("class_id",classFilter);
    const list = (ids||[]).map(x=>x.id);
    if (list.length) dailyQ = dailyQ.in("student_id",list);
  }
  const dailyRes = await dailyQ;
  const filledUnique = new Set((dailyRes.data||[]).map(x=>x.student_id)).size;
  const total = studentsRes.count || 0;
  const pct = total ? Math.round((filledUnique/total)*100) : 0;

  content.innerHTML = `
    <div class="grid grid-4">
      <div class="card"><div class="stat-label">Jumlah Siswa</div><div class="stat-value">${total}</div></div>
      <div class="card"><div class="stat-label">Sudah Mengisi Hari Ini</div><div class="stat-value">${filledUnique}</div></div>
      <div class="card"><div class="stat-label">Belum Mengisi</div><div class="stat-value">${Math.max(0,total-filledUnique)}</div></div>
      <div class="card"><div class="stat-label">Progress Hari Ini</div><div class="stat-value">${pct}%</div><div class="progress"><span style="width:${pct}%"></span></div></div>
    </div>
    <div class="card" style="margin-top:18px">
      <div class="section-head"><div><h3>QC Hari Ini</h3><p class="muted">${fmtDate(todayISO())}</p></div>${badge(PROFILE.role==="walas"?(PROFILE.classes?.name||"Kelas"):"Semua Kelas","green")}</div>
      <p class="muted">Gunakan menu <strong>Input QC</strong> untuk mengisi atau memverifikasi QC siswa.</p>
    </div>`;
}

async function renderStudentDashboard(){
  const sid = PROFILE.student_id;
  const {data: student} = await supabaseClient.from("students").select("nis,full_name,classes(name)").eq("id",sid).single();
  const {data: rows} = await supabaseClient.from("qc_daily").select("status").eq("student_id",sid).eq("qc_date",todayISO());
  const {count: totalInd} = await supabaseClient.from("qc_indicators").select("id",{count:"exact",head:true}).eq("active",true);
  const done = (rows||[]).filter(r=>r.status).length;
  const pct = totalInd ? Math.round((done/totalInd)*100) : 0;

  content.innerHTML = `
    <div class="card">
      <p class="eyebrow">ASSALAMU'ALAIKUM</p>
      <h2>${esc(student?.full_name||PROFILE.full_name)}</h2>
      <p class="muted">${esc(student?.classes?.name||"-")} · NIS ${esc(student?.nis||"-")}</p>
    </div>
    <div class="grid grid-2" style="margin-top:18px">
      <div class="card">
        <div class="stat-label">Progress Hari Ini</div>
        <div class="stat-value">${pct}%</div>
        <div class="progress"><span style="width:${pct}%"></span></div>
        <p class="muted">${done} dari ${totalInd||0} indikator tercatat.</p>
      </div>
      <div class="card">
        <div class="stat-label">Tanggal</div>
        <h3 style="margin-top:8px">${fmtDate(todayISO())}</h3>
        <button class="btn btn-primary" id="goQC">ISI QC HARI INI</button>
      </div>
    </div>`;
  document.getElementById("goQC").onclick = async () => {
    document.querySelector('[data-page="qc"]')?.click();
  };
}

async function renderClasses(){
  pageTitle.textContent = "Data Kelas";
  const {data,error} = await supabaseClient.from("classes").select("id,name,level,program,academic_year,active").order("name");
  if(error) return showError(error);
  content.innerHTML = `
    <div class="card">
      <div class="section-head"><h3>Daftar Kelas</h3><button class="btn btn-primary" id="addClass">+ Tambah Kelas</button></div>
      <div class="table-wrap"><table><thead><tr><th>Kelas</th><th>Jenjang</th><th>Program</th><th>Tahun Ajaran</th><th>Status</th></tr></thead>
      <tbody>${(data||[]).map(r=>`<tr><td><strong>${esc(r.name)}</strong></td><td>${esc(r.level||"-")}</td><td>${esc(r.program||"-")}</td><td>${esc(r.academic_year||"-")}</td><td>${r.active?badge("Aktif","green"):badge("Nonaktif","gray")}</td></tr>`).join("")}</tbody></table></div>
    </div>`;
  document.getElementById("addClass").onclick = addClassPrompt;
}

async function addClassPrompt(){
  const name = prompt("Nama kelas, contoh: 7 AE");
  if(!name) return;
  const level = prompt("Jenjang: SD / SMP / SMA","SMP") || "";
  const program = prompt("Program/TIC, contoh: AE") || "";
  const academic_year = prompt("Tahun Ajaran","2026/2027") || "";
  const {error} = await supabaseClient.from("classes").insert({name:name.toUpperCase(),level:level.toUpperCase(),program:program.toUpperCase(),academic_year});
  if(error) return alert(error.message);
  renderClasses();
}

async function renderStudents(){
  pageTitle.textContent = "Data Siswa";
  let q = supabaseClient.from("students").select("id,nis,full_name,tic,active,classes(name)").order("full_name");
  if(PROFILE.role==="walas") q=q.eq("class_id",PROFILE.class_id);
  const {data,error}=await q;
  if(error) return showError(error);
  content.innerHTML = `
    <div class="card">
      <div class="section-head"><div><h3>Daftar Siswa</h3><p class="muted">${data?.length||0} siswa</p></div></div>
      <div class="table-wrap"><table><thead><tr><th>NIS</th><th>Nama</th><th>Kelas</th><th>TIC</th><th>Status</th></tr></thead>
      <tbody>${(data||[]).map(s=>`<tr><td>${esc(s.nis)}</td><td><strong>${esc(s.full_name)}</strong></td><td>${esc(s.classes?.name||"-")}</td><td>${esc(s.tic||"-")}</td><td>${s.active?badge("Aktif","green"):badge("Nonaktif","gray")}</td></tr>`).join("")}</tbody></table></div>
    </div>`;
}

async function renderIndicators(){
  pageTitle.textContent = "Indikator QC";
  const {data,error}=await supabaseClient.from("qc_indicators").select("*").order("sort_order");
  if(error) return showError(error);
  content.innerHTML = `
    <div class="card">
      <div class="section-head"><div><h3>Indikator QC</h3><p class="muted">Urutan dan kategori indikator.</p></div></div>
      <div class="table-wrap"><table><thead><tr><th>No</th><th>Kategori</th><th>Indikator</th><th>Status</th></tr></thead>
      <tbody>${(data||[]).map(i=>`<tr><td>${i.sort_order}</td><td>${badge(i.category,i.category==="IBADAH WAJIB"?"green":i.category==="IBADAH SUNNAH"?"blue":"yellow")}</td><td>${esc(i.name)}</td><td>${i.active?badge("Aktif","green"):badge("Nonaktif","gray")}</td></tr>`).join("")}</tbody></table></div>
    </div>`;
}

async function renderQC(){
  pageTitle.textContent = PROFILE.role==="student" ? "Isi QC" : "Input QC";
  const {data: indicators,error} = await supabaseClient.from("qc_indicators").select("*").eq("active",true).order("sort_order");
  if(error) return showError(error);

  let studentOptions = "";
  if(PROFILE.role!=="student"){
    let q=supabaseClient.from("students").select("id,nis,full_name,classes(name)").eq("active",true).order("full_name");
    if(PROFILE.role==="walas") q=q.eq("class_id",PROFILE.class_id);
    const {data: students}=await q;
    studentOptions=(students||[]).map(s=>`<option value="${s.id}">${esc(s.full_name)} — ${esc(s.classes?.name||"")}</option>`).join("");
  }

  const groups = ["IBADAH WAJIB","IBADAH SUNNAH","ADAB & AKHLAK"];
  content.innerHTML = `
    <div class="card">
      <div class="toolbar">
        ${PROFILE.role==="student" ? "" : `<label>Pilih Siswa<select id="qcStudent"><option value="">-- Pilih siswa --</option>${studentOptions}</select></label>`}
        <label>Tanggal<input id="qcDate" type="date" value="${todayISO()}" ${PROFILE.role==="student"?"max='"+todayISO()+"'":""}></label>
        <button class="btn btn-secondary" id="selectAll">Pilih Semua</button>
        <button class="btn btn-secondary" id="loadExisting">Muat Data</button>
      </div>
      ${groups.map(g=>`
        <div class="indicator-section">
          <div class="section-head"><h3>${g}</h3>${badge(g,g==="IBADAH WAJIB"?"green":g==="IBADAH SUNNAH"?"blue":"yellow")}</div>
          <div class="indicator-list">
            ${indicators.filter(i=>i.category===g).map(i=>`
              <label class="indicator-item">
                <input type="checkbox" class="qc-check" value="${i.id}">
                <div><strong>${i.sort_order}. ${esc(i.name)}</strong><span>${esc(i.description||"")}</span></div>
              </label>`).join("")}
          </div>
        </div>`).join("")}
      <div class="action-row">
        <button class="btn btn-primary" id="saveQC">SIMPAN QC</button>
      </div>
    </div>`;

  document.getElementById("selectAll").onclick=()=>{
    const checks=[...document.querySelectorAll(".qc-check")];
    const shouldCheck=checks.some(c=>!c.checked);
    checks.forEach(c=>c.checked=shouldCheck);
    document.getElementById("selectAll").textContent=shouldCheck?"Batalkan Semua":"Pilih Semua";
  };
  document.getElementById("loadExisting").onclick=loadExistingQC;
  document.getElementById("saveQC").onclick=saveQC;
}

function chosenStudentId(){
  return PROFILE.role==="student" ? PROFILE.student_id : document.getElementById("qcStudent")?.value;
}

async function loadExistingQC(){
  const studentId=chosenStudentId();
  const date=document.getElementById("qcDate").value;
  if(!studentId) return alert("Pilih siswa terlebih dahulu.");
  const {data,error}=await supabaseClient.from("qc_daily").select("indicator_id,status").eq("student_id",studentId).eq("qc_date",date);
  if(error) return alert(error.message);
  const map=new Map((data||[]).map(r=>[r.indicator_id,r.status]));
  document.querySelectorAll(".qc-check").forEach(c=>c.checked=map.get(c.value)===true);
}

async function saveQC(){
  const studentId=chosenStudentId();
  const date=document.getElementById("qcDate").value;
  if(!studentId) return alert("Pilih siswa terlebih dahulu.");
  if(!date) return alert("Tanggal belum dipilih.");

  const rows=[...document.querySelectorAll(".qc-check")].map(c=>({
    student_id:studentId,
    qc_date:date,
    indicator_id:c.value,
    status:c.checked,
    input_by:CURRENT_USER.id,
    input_role:PROFILE.role
  }));

  const {error}=await supabaseClient.from("qc_daily").upsert(rows,{onConflict:"student_id,qc_date,indicator_id"});
  if(error) return alert("Gagal menyimpan: "+error.message);
  alert("QC berhasil disimpan.");
}

async function renderRecap(){
  pageTitle.textContent = PROFILE.role==="walas" ? "Rekap Kelas" : "Rekap QC";
  const date=todayISO();
  let q=supabaseClient.from("students").select("id,nis,full_name,classes(name)").eq("active",true).order("full_name");
  if(PROFILE.role==="walas") q=q.eq("class_id",PROFILE.class_id);
  const {data: students,error}=await q;
  if(error) return showError(error);

  const {count: totalInd}=await supabaseClient.from("qc_indicators").select("id",{count:"exact",head:true}).eq("active",true);
  const ids=(students||[]).map(s=>s.id);
  let daily=[];
  if(ids.length){
    const r=await supabaseClient.from("qc_daily").select("student_id,status").eq("qc_date",date).in("student_id",ids);
    daily=r.data||[];
  }
  const counts={};
  daily.forEach(r=>{if(r.status) counts[r.student_id]=(counts[r.student_id]||0)+1});
  content.innerHTML=`
    <div class="card">
      <div class="section-head"><div><h3>Rekap ${fmtDate(date)}</h3><p class="muted">Persentase berdasarkan indikator aktif.</p></div></div>
      <div class="table-wrap"><table><thead><tr><th>NIS</th><th>Nama</th><th>Kelas</th><th>Terisi</th><th>Progress</th></tr></thead>
      <tbody>${(students||[]).map(s=>{
        const done=counts[s.id]||0; const pct=totalInd?Math.round(done/totalInd*100):0;
        return `<tr><td>${esc(s.nis)}</td><td><strong>${esc(s.full_name)}</strong></td><td>${esc(s.classes?.name||"-")}</td><td>${done}/${totalInd||0}</td><td style="min-width:160px"><div class="progress"><span style="width:${pct}%"></span></div><small>${pct}%</small></td></tr>`
      }).join("")}</tbody></table></div>
    </div>`;
}

async function renderHistory(){
  pageTitle.textContent="Riwayat QC";
  const sid=PROFILE.student_id;
  const {data,error}=await supabaseClient.from("qc_daily").select("qc_date,status").eq("student_id",sid).order("qc_date",{ascending:false});
  if(error)return showError(error);
  const {count: totalInd}=await supabaseClient.from("qc_indicators").select("id",{count:"exact",head:true}).eq("active",true);
  const byDate={};
  (data||[]).forEach(r=>{
    if(!byDate[r.qc_date])byDate[r.qc_date]=0;
    if(r.status)byDate[r.qc_date]++;
  });
  content.innerHTML=`
    <div class="card">
      <h3>Riwayat Pengisian</h3>
      <div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Terisi</th><th>Progress</th></tr></thead>
      <tbody>${Object.entries(byDate).map(([d,n])=>{
        const pct=totalInd?Math.round(n/totalInd*100):0;
        return `<tr><td>${fmtDate(d)}</td><td>${n}/${totalInd||0}</td><td>${pct}%</td></tr>`
      }).join("")||`<tr><td colspan="3" class="empty">Belum ada riwayat.</td></tr>`}</tbody></table></div>
    </div>`;
}

function showError(error){
  content.innerHTML=`<div class="card"><h3>Terjadi kesalahan</h3><p class="muted">${esc(error.message||error)}</p></div>`;
}

init();
