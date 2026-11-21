// fitur/akun-login-google.js — (dulu js/08-google-login.js) dipindah dari <script> di index.html lama (baris 5742). Isi tidak diubah.
(function(){
  // ── GANTI INI dengan Client ID dari Google Cloud Console kamu sendiri.
  // Cara dapatnya:
  // 1) Buka console.cloud.google.com → buat project (atau pakai yang ada)
  // 2) APIs & Services → OAuth consent screen → isi info dasar app
  // 3) APIs & Services → Credentials → Create Credentials → OAuth client ID
  //    → Application type: "Web application"
  // 4) Di "Authorized JavaScript origins", tambahkan domain tempat app
  //    ini di-hosting (mis. https://namadomainkamu.com). Untuk testing
  //    lokal bisa tambahkan http://localhost:PORT juga.
  // 5) Copy "Client ID" yang muncul (formatnya: xxxxx.apps.googleusercontent.com)
  //    lalu paste ganti string di bawah ini.
  var GOOGLE_CLIENT_ID = "73740157914-lp3pegp6pg9jrnrpgfbsfv0eimuaetts.apps.googleusercontent.com";
  var STORAGE_KEY = 'pb_auth_user';

  function pbDecodeJwt(token){
    try{
      var base64Url = token.split('.')[1];
      var base64 = base64Url.replace(/-/g,'+').replace(/_/g,'/');
      var json = decodeURIComponent(atob(base64).split('').map(function(c){
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(json);
    }catch(e){ return null; }
  }

  function pbShowLoginError(msg){
    var el = document.getElementById('login-error');
    if(el){ el.textContent = msg; el.classList.remove('hidden'); }
  }

  function pbApplyUserToHeader(user){
    var pill = document.getElementById('pb-user-pill');
    var nameEl = document.getElementById('pb-user-name');
    var avatarEl = document.getElementById('pb-user-avatar');
    if(nameEl) nameEl.textContent = (user.name || user.email || '').split(' ')[0];
    if(avatarEl){
      if(user.picture){ avatarEl.src = user.picture; avatarEl.style.display = 'block'; }
      else{ avatarEl.style.display = 'none'; }
    }
    if(pill) pill.style.display = 'flex';
  }

  function pbShowApp(user){
    var gate = document.getElementById('login-gate');
    if(gate) gate.classList.add('hidden');
    // FIX (Sept 2026): pasang tier akun ini dari cache lokal SEKARANG juga
    // (sebelum jaringan) — kalau akun ini pernah dikonfirmasi premium di
    // perangkat ini, tema/tampilan premium langsung muncul begitu gerbang
    // login menutup. Hasil cloud yang menyusul tetap jadi penentu akhir.
    try{
      if(typeof window.pbTierCacheRestore === 'function' && window.pbTierCacheRestore(user && user.email)){
        try{ if(typeof dlRenderBar === 'function') dlRenderBar(); }catch(e){}
      }
    }catch(e){}
    pbApplyUserToHeader(user);
  }

  // ── JEMBATAN KE APP ANDROID (CAPACITOR) ──────────────────────────────
  // App ini dibungkus pakai Capacitor. Sisi native SUDAH PUNYA plugin
  // custom bernama "GoogleAuthNative" (lihat file GoogleAuthNativePlugin
  // .java, sudah didaftarkan di MainActivity) dengan 2 method: login()
  // dan logout(). Capacitor otomatis menyediakan object
  // window.Capacitor.Plugins.GoogleAuthNative kalau plugin itu terpasang
  // dan didaftarkan di MainActivity. Kalau object itu belum ada (misal
  // dibuka di browser biasa buat testing), kita fallback ke Google
  // Identity Services (GIS) — TAPI CATATAN PENTING (Sept 2026): GIS
  // TERBUKTI TIDAK JALAN kalau dijalankan di dalam WebView app ini
  // (Google memblokir flow OAuth berbasis browser dari embedded WebView
  // — bukan soal konfigurasi, ini batasan resmi Google), jadi login DI
  // DALAM APP wajib lewat jalur native/GoogleAuthNative ini, bukan GIS.
  function pbIsInsideNativeApp(){
    return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
  }
  function pbNativePlugin(){
    return (window.Capacitor && window.Capacitor.Plugins) ? window.Capacitor.Plugins.GoogleAuthNative : null;
  }

  // Dipanggil dari tombol "Masuk dengan Google" versi native.
  window.pbNativeLoginStart = function(){
    var plugin = pbNativePlugin();
    if(!plugin || typeof plugin.login !== 'function'){
      pbShowLoginError('Fitur login native belum terpasang di app ini.');
      return;
    }
    plugin.login().then(function(result){
      // FITUR SINKRON CLOUD: idToken dipakai buat login Firebase juga,
      // supaya data bisa disinkron antar perangkat. Plugin Kotlin yang
      // ada SEKARANG (GoogleAuthNativePlugin.java) BELUM mengirim
      // idToken di object result (cuma email/name/photoUrl) — jadi
      // login tetap jalan normal, cuma sinkron cloud-nya belum aktif
      // sampai field idToken ditambahkan di sisi Kotlin (ambil dari
      // account.getIdToken(), butuh .requestIdToken(WEB_CLIENT_ID) di
      // GoogleSignInOptions — sudah ada, tinggal tambah
      // ret.put("idToken", account.getIdToken()) di loginResult()).
      var _idTok = result && (result.idToken || (result.authentication && result.authentication.idToken));
      window.pbNativeLoginSuccess(result && result.email, result && result.name, result && result.photoUrl, _idTok);
    }).catch(function(err){
      window.pbNativeLoginError((err && err.message) || 'Login dibatalkan atau gagal.');
    });
  };

  // Dipanggil otomatis lewat Promise dari plugin di atas setelah user
  // sukses login Google secara native.
  window.pbNativeLoginSuccess = function(email, name, picture, idToken){
    if(!email){ pbShowLoginError('Login Google gagal, coba lagi.'); return; }
    var user = { email: email, name: name || email, picture: picture || '', ts: Date.now() };
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); }catch(e){}
    pbShowApp(user);
    if(typeof pbCloudInit === 'function') pbCloudInit(user, idToken);
  };

  // Dipanggil OLEH KOTLIN kalau user membatalkan/login gagal, supaya
  // error-nya kelihatan di layar (bukan cuma diam saja).
  window.pbNativeLoginError = function(msg){
    pbShowLoginError(msg || 'Login Google dibatalkan atau gagal.');
  };
  // ──────────────────────────────────────────────────────────────────

  // Dipanggil Google setelah user berhasil pilih akun & login.
  window.pbHandleCredentialResponse = function(response){
    var payload = pbDecodeJwt(response.credential);
    if(!payload || !payload.email){
      pbShowLoginError('Gagal membaca data akun Google. Coba lagi.');
      return;
    }
    var user = {
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture || '',
      ts: Date.now()
    };
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); }catch(e){}
    pbShowApp(user);
    // response.credential = idToken JWT dari Google — dipakai lagi buat
    // login Firebase supaya data user ini bisa disinkron antar perangkat.
    if(typeof pbCloudInit === 'function') pbCloudInit(user, response.credential);
  };

  // Tombol logout kecil di header (h-pill "pb-user-pill") manggil ini.
  window.pbLogout = function(){
    window.pbAskConfirm('Keluar dari akun ini?', 'Ya, Keluar', _pbDoLogout, null);
  };
  function _pbDoLogout(){
    try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
    window._pbLoggingOut=true;   // R4: hentikan semua simpan draft sejak konfirmasi logout
    try{ if(window.pbMarkFreshStart) window.pbMarkFreshStart(); }catch(e){}
    // R1/T11: logout WAJIB membersihkan draft & snapshot tampilan akun ini secara eksplisit (dulu ikut
    // terhapus hanya karena reload-nya terbaca "refresh sengaja"). Tanpa ini akun berikutnya di perangkat
    // yang sama bisa melihat isian/hasil akun lama. Dibersihkan lagi saat boot lewat PB_FRESH_START,
    // karena pagehide bisa menulis ulang snapshot tepat sebelum reload.
    try{
      localStorage.removeItem('pb_wizard_draft_v1');
      localStorage.removeItem('pb_resume_ui_v1');
    }catch(e){}
    // FIX BUG (Ringan #8): dialog "Leave site?" bawaan browser sebelumnya
    // sempat muncul di sini walau user sudah konfirmasi keluar lewat
    // confirm() di atas — beforeunload tidak tahu itu, cek pbHasUnsavedProgress
    // masih bisa true. Sama seperti triggerRefresh() di PTR, tandai dulu
    // supaya reload langsung jalan tanpa tanya-tanya lagi.
    window._pbSkipUnloadWarn = true;
    // Sisa key tur (in-progress + langkah terakhir) juga wajib ikut
    // dibersihkan di sini — kalau tidak, akun berikutnya yang login di
    // perangkat yang sama bisa kebawa status tur akun sebelumnya.
    try{
      localStorage.removeItem('pb_tour_in_progress');
      localStorage.removeItem('pb_tour_last_step');
    }catch(e){}
    try{ if(window.pbTierLog) window.pbTierLog('logout', 'tier lokal dibuang'); }catch(e){}
    try{ localStorage.removeItem('pb_tier_v1'); localStorage.removeItem('pb_tier_expiry_v1'); }catch(e){}
    // FIX (audit auth #1): kuota harian akun ini tidak boleh terwariskan ke akun berikutnya di perangkat ini.
    try{ localStorage.removeItem('pb_quota_v1'); }catch(e){}
    try{ localStorage.removeItem('pb_ai_model_v1'); }catch(e){}
    // FIX (audit auth #4): dorong dulu perubahan lokal yang belum ke-push (maks 4 dtk), baru signOut.
    var _pbSo = null;
    try{
      if(typeof pbCloudSignOut === 'function'){
        var _pbFl = (typeof pbCloudFlush === 'function')
          ? Promise.race([pbCloudFlush(), new Promise(function(r){ setTimeout(r, 4000); })]) : Promise.resolve();
        _pbSo = _pbFl.then(function(){ return pbCloudSignOut(); });
      }
    }catch(e){}
    if(pbIsInsideNativeApp()){
      var plugin = pbNativePlugin();
      try{ if(plugin && typeof plugin.logout === 'function') plugin.logout(); }catch(e){}
    } else {
      try{
        if(window.google && google.accounts && google.accounts.id){
          google.accounts.id.disableAutoSelect();
        }
      }catch(e){}
    }
    // FIX (Sept 2026): tunggu signOut Firebase kelar (maks 1,5 detik) baru
    // reload. Dulu reload langsung jalan, signOut() yang async bisa terpotong
    // dan sesi Firebase akun LAMA nyangkut di perangkat — akibatnya login
    // berikutnya (terutama tanpa idToken) bisa gagal sinkron & tier tidak
    // pernah ketarik.
    var _pbGone = false;
    function _pbGo(){ if(_pbGone) return; _pbGone = true; try{ if(window.pbMarkFreshStart) window.pbMarkFreshStart(); }catch(e){} location.reload(); }
    if(_pbSo && typeof _pbSo.then === 'function'){ _pbSo.then(_pbGo, _pbGo); setTimeout(_pbGo, 6000); }
    else _pbGo();
  }

  function pbInitLogin(){
    // Kalau sesi login sebelumnya masih ada di perangkat ini, langsung
    // buka app tanpa nyuruh login ulang.
    var saved = null;
    try{ saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }catch(e){}
    if(saved && saved.email){
      pbShowApp(saved);
      // Tidak ada idToken segar di sini (sesi lama) — pbCloudInit akan
      // coba pakai sesi Firebase Auth yang sudah persist sebelumnya.
      if(typeof pbCloudInit === 'function') pbCloudInit(saved, null);
      return;
    }

    // ── Jalur 1: di dalam app Android, TAPI HANYA kalau plugin native
    // GoogleAuthNative (GoogleAuthNativePlugin.java) benar-benar
    // terpasang & teregistrasi di MainActivity (dicek lewat
    // pbNativePlugin() + method login()-nya ada). GIS/web TERBUKTI
    // diblokir Google di dalam WebView Capacitor (bukan soal
    // konfigurasi origin — itu sudah dicek benar), jadi jalur native
    // ini WAJIB dipakai untuk login di dalam app. Kalau plugin belum
    // sempat terdaftar, jangan mentok di sini — lanjut ke Jalur 2 (GIS)
    // sebagai fallback supaya app tetap bisa dites di browser biasa. ──
    if(pbIsInsideNativeApp()){
      var _nativePlugin = pbNativePlugin();
      if(_nativePlugin && typeof _nativePlugin.login === 'function'){
        var nativeBtn = document.getElementById('login-btn-native');
        if(nativeBtn) nativeBtn.classList.remove('hidden');
        return;
      }
      // Plugin belum terpasang → sengaja TIDAK return di sini, lanjut ke
      // Jalur 2 (GIS) persis seperti kalau dibuka di browser biasa.
    }

    // ── Jalur 2: dibuka di browser biasa, ATAU di dalam app native yang
    // belum punya plugin GoogleAuthNative → pakai GIS (Google Identity
    // Services versi web) seperti biasa. ──
    if(GOOGLE_CLIENT_ID.indexOf('GANTI_DENGAN_CLIENT_ID_ANDA') === 0){
      pbShowLoginError('Login Google belum disetel — developer app ini perlu memasukkan Client ID dari Google Cloud Console terlebih dahulu.');
      return;
    }
    if(typeof google === 'undefined' || !google.accounts || !google.accounts.id){
      pbShowLoginError('Gagal memuat Google Sign-In. Periksa koneksi internet lalu muat ulang halaman.');
      return;
    }
    try{
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: window.pbHandleCredentialResponse,
        auto_select: true
      });
      google.accounts.id.renderButton(
        document.getElementById('g_id_signin_container'),
        { theme: 'filled_black', size: 'large', shape: 'pill', text: 'signin_with', width: 260 }
      );
      // Munculkan prompt One Tap juga kalau browser mendukung.
      google.accounts.id.prompt();
    }catch(e){
      pbShowLoginError('Terjadi kesalahan saat menyiapkan Google Sign-In.');
    }
  }

  // Skrip GIS dimuat async — tunggu window 'load' supaya object `google`
  // sudah pasti tersedia sebelum dipakai.
  if(document.readyState === 'complete'){ pbInitLogin(); }
  else{ window.addEventListener('load', pbInitLogin); }
})();
