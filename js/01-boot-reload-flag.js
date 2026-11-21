// js/01-boot-reload-flag.js — dipindah dari <script> di index.html lama (baris 51). Isi tidak diubah.
(function(){
  try{
    window.PB_IS_TRUE_RELOAD = (sessionStorage.getItem('pb_sess_alive_v1') === '1');
    sessionStorage.setItem('pb_sess_alive_v1', '1');
  }catch(e){
    // sessionStorage diblokir (mis. mode privat ketat) — biarkan null,
    // caller (isReloadNavigation/isReloadNavigationTour) fallback ke
    // metode Performance API lama kalau ini null/undefined.
    window.PB_IS_TRUE_RELOAD = null;
  }
})();
// R1 (audit "Tampilan Terakhir", 15 Nov 2026): "mulai bersih" HANYA terjadi kalau user memintanya
// EKSPLISIT (konfirmasi pull-to-refresh, logout, restart tur). Tombol-tombol itu memanggil
// window.pbMarkFreshStart() tepat sebelum location.reload() -> timestamp di localStorage
// 'pb_fresh_start_v1'. Di skrip PALING AWAL ini (sebelum restore draft & pemulihan tampilan) penanda
// dibaca SEKALI lalu dibuang; hasilnya window.PB_FRESH_START. Tanpa penanda (atau umur >= 60 dtk)
// app SELALU memulihkan draft/tampilan terakhir, apa pun nilai PB_IS_TRUE_RELOAD (sinyal itu tidak
// bisa membedakan tarik-refresh dari browser yang memuat ulang tab yang dibuang). PB_IS_TRUE_RELOAD
// kini hanya untuk hal kosmetik (splash, jeda tur). Key ini TIDAK masuk PB_SYNC_KEYS (tidak sinkron cloud).
window.pbMarkFreshStart = function(){
  try{ localStorage.setItem('pb_fresh_start_v1', String(Date.now())); }catch(e){}
};
(function(){
  window.PB_FRESH_START = false;
  try{
    var t = Number(localStorage.getItem('pb_fresh_start_v1') || 0);
    localStorage.removeItem('pb_fresh_start_v1');
    if(t && (Date.now() - t) < 60000){
      window.PB_FRESH_START = true;
      // snapshot tampilan lama dibuang di sini; draft wizard dibuang di handler load (clearDraft)
      localStorage.removeItem('pb_resume_ui_v1');
    }
  }catch(e){}
  // R5 (perbaikan bug 17 Nov 2026): reload SENGAJA lewat browser (F5, Ctrl+R, Ctrl+Shift+R, tombol reload)
  // dulu tidak lewat pbMarkFreshStart() sehingga app malah memulihkan prompt/step terakhir.
  // Pembeda yang andal: beforeunload HANYA terpicu kalau halaman sedang dipakai user (reload/tutup/navigasi),
  // sedangkan tab yang dibuang/di-kill OS saat di background TIDAK memicunya. Jadi:
  //   navigasi bertipe 'reload' + ada cap beforeunload <30 dtk  => user menekan reload => mulai bersih.
  //   tab dibuang lalu dibuka lagi (tanpa cap)                  => tetap pulihkan tampilan terakhir.
  // Set PB_RELOAD_IS_FRESH = false kalau mau reload juga memulihkan tampilan terakhir.
  window.PB_RELOAD_IS_FRESH = true;
  try{
    var _navT = null;
    try{ var _en = performance.getEntriesByType('navigation'); if(_en && _en.length) _navT = _en[0].type; }catch(e1){}
    var _bu = Number(sessionStorage.getItem('pb_bu_v1') || 0);
    sessionStorage.removeItem('pb_bu_v1');
    if(window.PB_RELOAD_IS_FRESH && !window.PB_FRESH_START && _navT === 'reload' && _bu && (Date.now() - _bu) < 30000){
      window.PB_FRESH_START = true;
      localStorage.removeItem('pb_resume_ui_v1');
    }
  }catch(e){}
  window.addEventListener('beforeunload', function(){
    try{ sessionStorage.setItem('pb_bu_v1', String(Date.now())); }catch(e){}
  });
  // kalau dialog "tinggalkan halaman?" dibatalkan user, cap dihapus saat halaman terlihat lagi
  document.addEventListener('visibilitychange', function(){
    if(!document.hidden){ try{ sessionStorage.removeItem('pb_bu_v1'); }catch(e){} }
  });
})();
