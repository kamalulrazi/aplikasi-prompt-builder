// fitur/akun-gerbang-login-dan-dialog.js — (dulu js/05-dialog-konfirmasi-gerbang.js) dipindah dari <script> di index.html lama (baris 5419). Isi tidak diubah.
  // Dialog konfirmasi bermerek (pakai showConfirm milik app) menggantikan
  // confirm() bawaan Android/browser yang tampilannya tidak sesuai branding.
  // Fallback ke confirm() bawaan hanya kalau showConfirm belum tersedia.
  window.pbAskConfirm = function(msg, okLabel, onOk, onCancel){
    if(typeof showConfirm === 'function'){
      showConfirm(msg, onOk, onCancel, okLabel);
      try{
        var all = document.querySelectorAll('.confirm-overlay');
        var ov = all[all.length - 1];
        if(ov) ov.style.zIndex = '100001'; // di atas lapisan tur (z-index s/d 10050)
      }catch(e){}
    } else {
      if(confirm(msg)){ if(onOk) onOk(); } else if(onCancel){ onCancel(); }
    }
  };
  // FIX REFRESH: gerbang login sebelumnya baru disembunyikan di window.load
  // (pbInitLogin), jadi tiap refresh layar "Masuk dengan Google" sempat
  // KEDIP walau user sudah login. Kalau sesi tersimpan ada, sembunyikan
  // sekarang juga, sebelum browser sempat menggambar layar pertama.
  (function(){
    try{
      var u = JSON.parse(localStorage.getItem('pb_auth_user') || 'null');
      if(u && u.email){
        var g = document.getElementById('login-gate');
        if(g) g.classList.add('hidden');
        // Tirai tur (v6.44): kalau akun ini belum selesai tur, tutup layar
        // SEKARANG (sebelum paint pertama) — aturan sama dengan
        // pbTourIsPending() di script tur. Dilepas script tur begitu
        // keputusan diambil; jaring pengaman 10 detik kalau script itu gagal.
        try{
          var _tv = localStorage.getItem('pb_tour_done');
          if(false && (!_tv || (_tv.indexOf('v2:')===0 && _tv.slice(3)!==String(u.email).toLowerCase()))){ // tur dimatikan (22 Nov 2026): tirai tidak pernah dipasang
            document.documentElement.classList.add('pb-tour-curtain');
            setTimeout(function(){ document.documentElement.classList.remove('pb-tour-curtain'); },10000);
          }
        }catch(e){}
        // Nama/avatar di header juga diisi lebih awal (DOMContentLoaded),
        // supaya tidak "muncul telat" setelah window.load.
        document.addEventListener('DOMContentLoaded', function(){
          try{
            var nameEl = document.getElementById('pb-user-name');
            var avatarEl = document.getElementById('pb-user-avatar');
            var pill = document.getElementById('pb-user-pill');
            if(nameEl) nameEl.textContent = (u.name || u.email || '').split(' ')[0];
            if(avatarEl){
              if(u.picture){ avatarEl.src = u.picture; avatarEl.style.display = 'block'; }
              else{ avatarEl.style.display = 'none'; }
            }
            if(pill) pill.style.display = 'flex';
          }catch(e){}
        });
      }
    }catch(e){}
  })();
