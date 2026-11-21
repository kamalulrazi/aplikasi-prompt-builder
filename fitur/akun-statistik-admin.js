// fitur/akun-statistik-admin.js — (dulu js/16-statistik-admin.js) dipindah dari <script> di index.html lama (baris 37727). Isi tidak diubah.
/* Statistik Biaya & Cache (punyamu sendiri) hanya tampil untuk email admin.
   Statistik SEMUA user ada di admin.html. Ini cuma penyembunyi tampilan;
   keamanan data user lain ada di Firestore Rules. */
(function(){
  var PB_ADMIN_EMAILS = ['vid1hihu@gmail.com']; // harus sama dengan OWNER_EMAILS di admin.html
  function _check(){
    var wrap = document.getElementById('pb-stats-admin-only');
    if(!wrap) return;
    var ok = (typeof pbIsAdmin === 'function') ? pbIsAdmin() : false;
    wrap.style.display = ok ? 'block' : 'none';
    try{ if(typeof pbRenderAiModelPicker === 'function') pbRenderAiModelPicker(); }catch(e){}
    if(!ok){ var pnl = document.getElementById('pb-usage-panel'); if(pnl) pnl.classList.add('hidden'); }
  }
  document.addEventListener('DOMContentLoaded', _check);
  setInterval(_check, 3000);
  _check();
})();
