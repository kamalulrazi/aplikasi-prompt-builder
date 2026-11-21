// fitur/umum-tarik-untuk-refresh.js — (dulu js/14-pull-to-refresh.js) dipindah dari <script> di index.html lama (baris 37362). Isi tidak diubah.
// ════════════════════════════════════════════════════════════════════
// PULL-TO-REFRESH CUSTOM (permintaan user)
// Native pull-to-refresh browser sengaja dimatikan lewat CSS
// overscroll-behavior-y:none di #app-shell (biar app kelihatan native,
// bukan halaman web biasa — lihat komentar di CSS html,body). Jadi
// gesture "swipe ke bawah dari puncak halaman" diimplementasi ulang
// manual di sini:
//   - #app-shell ikut turun sedikit mengikuti jari (efek "ketarik")
//   - logo P branding (sama seperti loading generate/splash) pecah lalu
//     menyatu PERSIS mengikuti progres tarikan — bukan spinner generik
//   - getar kecil (navigator.vibrate) begitu ambang refresh tercapai
//   - setelah jari dilepas & ambang tercapai: getar konfirmasi lebih
//     kuat, logo lanjut animasi pecah-menyatu loop, lalu location.reload()
//     beneran dipanggil (app ini SUDAH punya logic isReloadNavigation()
//     di script lain buat bedain reload sengaja vs buka app baru).
// ════════════════════════════════════════════════════════════════════
(function(){
  var appShell = document.getElementById('app-shell');
  var indicator = document.getElementById('ptr-indicator');
  var backLayer = document.getElementById('ptr-p-back');
  var frontLayer = document.getElementById('ptr-p-front');
  if(!appShell || !indicator || !backLayer || !frontLayer) return;

  // FIX (refresh terlalu sensitif): dulu THRESHOLD 58 + RESISTANCE 0.5 = cukup geser jari
  // ~116px sudah refresh, dan refresh menghapus draft wizard. Sekarang jari harus menarik
  // ~225px (90 / 0.4), SECARA SENGAJA (bukan lemparan cepat), dan tidak tepat setelah scroll.
  var THRESHOLD = 90;   // px tarikan sampai logo menyatu penuh & refresh "bersenjata"
  var MAX_PULL  = 120;  // px maksimum #app-shell boleh ikut turun (biar tidak berlebihan)
  var RESISTANCE = 0.4; // makin kecil = makin "berat"/pelan responnya terhadap jari
  var MIN_PULL_MS = 450;     // tarikan harus berlangsung minimal segini lama (flick cepat = scroll biasa, bukan refresh)
  var SCROLL_SETTLE_MS = 400; // jangan mulai tarikan sesaat setelah scroll/momentum berhenti
  var pullT0 = 0, lastScrollAt = 0;
  appShell.addEventListener('scroll', function(){ lastScrollAt = Date.now(); }, {passive:true, capture:true});

  // Titik pisah awal logo P — SAMA persis dengan .p-layer-back/.p-layer-front
  // di CSS (state "pecah" default sebelum di-merge), supaya progres 0 pas
  // baru mulai tarik terlihat identik dengan logo diam sehari-hari.
  var BACK_FROM  = {x:165,  y:-185, r:10};
  var FRONT_FROM = {x:-135, y:168,  r:-9};

  var startY = 0, startX = 0, pulling = false, currentPull = 0, armed = false, refreshing = false;
  var pullTarget = null;
  var axisLocked = false; // true = sudah dipastikan ini gesture vertikal, bukan swipe horizontal
  var settleTimer = null;

  function canStartPull(target){
    if(refreshing) return false;
    if(appShell.scrollTop > 0) return false;
    // FIX: baru saja scroll (momentum / scroll balik ke atas) -> jangan dianggap awal tarikan refresh
    if(Date.now() - lastScrollAt < SCROLL_SETTLE_MS) return false;
    // Jangan ganggu drag teks di textarea/input/elemen contenteditable
    if(target && target.closest && target.closest('textarea, input, [contenteditable="true"]')) return false;
    // FIX BUG "modal ikut kena": #apikey-modal-overlay & #cs-modal ada di
    // dalam #app-shell dan punya scroll sendiri — kalau salah satu lagi
    // terbuka, gesture di dalamnya (termasuk scroll balik ke atas) tidak
    // boleh ikut menarik #app-shell di belakangnya.
    var apikeyModal = document.getElementById('apikey-modal-overlay');
    var csModal = document.getElementById('cs-modal');
    if(apikeyModal && apikeyModal.style.display !== 'none') return false;
    if(csModal && csModal.style.display !== 'none') return false;
    var osOv = document.getElementById('os-overlay'); // Outfit Studio layar penuh: gesture di dalamnya tidak boleh menarik app di belakangnya
    if(osOv && osOv.classList.contains('show')) return false;
    // FIX: #outfit-random-modal juga ada di dalam #app-shell (position:fixed) — tanpa
    // cek ini, tarik ke bawah saat modal Outfit terbuka ikut menarik seluruh app.
    var outfitModal = document.getElementById('outfit-random-modal');
    if(outfitModal && outfitModal.style.display !== 'none') return false;
    // Elemen (atau leluhurnya) yang scroll-nya sendiri sedang tidak di
    // puncak — biarkan itu yang menangani gesture-nya sendiri.
    if(target && target.closest){
      var scroller = target.closest('[style*="overflow-y"], .preview-slots');
      if(scroller && scroller !== appShell && scroller.scrollTop > 0) return false;
    }
    // FIX (refresh padahal belum mentok atas): container scroll yang overflow-nya
    // diatur lewat stylesheet (mis. #foto.pfa-open = layar penuh wizard Foto)
    // tidak ketangkap selector inline di atas. Cek SEMUA leluhur lewat computed style.
    if(ptrScrolledAncestor(target)) return false;
    return true;
  }

  // True kalau ada elemen scrollable (selain #app-shell) di antara target dan
  // #app-shell yang posisinya BELUM di puncak — gesture itu milik scroll-nya sendiri.
  function ptrScrolledAncestor(el){
    while(el && el !== appShell && el !== document.body && el.nodeType === 1){
      if(el.scrollTop > 0){
        var oy = '';
        try{ oy = getComputedStyle(el).overflowY; }catch(e){}
        if(oy === 'auto' || oy === 'scroll' || oy === 'overlay') return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  function vibrate(ms){
    try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(e){}
  }

  function renderPull(pull){
    var p = Math.max(0, Math.min(pull / THRESHOLD, 1)); // progres 0→1
    var ease = 1 - p;
    if(document.documentElement.classList.contains('pb-premium')){
      // PREMIUM: logo P digambar garis mengikuti tarikan jari (bukan pecah↔menyatu)
      var fo = Math.round(Math.max(0, Math.min(1, (p - 0.55) / 0.45)) * 1000) / 1000;
      [backLayer, frontLayer].forEach(function(l){ l.style.strokeDashoffset = ease; l.style.fillOpacity = fo; l.style.strokeOpacity = 1 - fo; });
    } else {
    backLayer.style.transform = 'translate('+(BACK_FROM.x*ease)+'px,'+(BACK_FROM.y*ease)+'px) rotate('+(BACK_FROM.r*ease)+'deg)';
    frontLayer.style.transform = 'translate('+(FRONT_FROM.x*ease)+'px,'+(FRONT_FROM.y*ease)+'px) rotate('+(FRONT_FROM.r*ease)+'deg)';
    backLayer.style.opacity = 0.4 + 0.6*p;
    }
    indicator.style.opacity = Math.min(pull / 20, 1);
    appShell.style.transform = 'translateY('+pull+'px)';

    if(p >= 1 && !armed){
      armed = true;
      vibrate(10); // tick halus: "lepas sekarang buat refresh"
    } else if(p < 1 && armed){
      armed = false;
    }
  }

  function resetPull(animate){
    pulling = false; currentPull = 0; armed = false;
    if(settleTimer) clearTimeout(settleTimer);
    if(animate){ appShell.classList.add('ptr-settling'); indicator.classList.add('ptr-fade'); }
    appShell.style.transform = 'translateY(0px)';
    indicator.style.opacity = '0';
    indicator.classList.remove('looping');
    // FIX: posisi keping logo baru dibersihkan SETELAH fade selesai (bukan langsung),
    // supaya logo tidak "pecah" mendadak selagi indikator masih memudar.
    settleTimer = setTimeout(function(){
      appShell.classList.remove('ptr-settling');
      indicator.classList.remove('ptr-fade');
      backLayer.style.transform = ''; frontLayer.style.transform = ''; backLayer.style.opacity = '';
      [backLayer, frontLayer].forEach(function(l){ l.style.strokeDashoffset = ''; l.style.fillOpacity = ''; l.style.strokeOpacity = ''; });
      if(!pulling && !refreshing) appShell.style.transform = '';
    }, 380);
  }

  function triggerRefresh(){
    refreshing = true;
    vibrate([12,30,12]); // getar konfirmasi — beda pola dari tick biasa
    appShell.classList.add('ptr-settling');
    appShell.style.transform = 'translateY(52px)';
    backLayer.style.transform = ''; frontLayer.style.transform = '';
    backLayer.style.opacity = '1';
    indicator.style.opacity = '1';
    indicator.classList.add('looping'); // lanjut animasi pecah↔menyatu (pLoopBack/pLoopFront)
    // Sudah lewat konfirmasi custom di onTouchEnd (kalau memang ada progres
    // yang perlu dikonfirmasi) — tandai ini SUPAYA dialog bawaan browser
    // (beforeunload, lihat IIFE undo/redo di atas) tidak nongol LAGI dobel
    // pas location.reload() beneran dipanggil.
    window._pbSkipUnloadWarn = true;
    // R1: niat "mulai bersih" yang eksplisit (user sudah konfirmasi / tidak ada progres); dibaca & dibuang saat boot berikutnya.
    try{ if(window.pbMarkFreshStart) window.pbMarkFreshStart(); }catch(e){}
    setTimeout(function(){ location.reload(); }, 550);
    // Jaring pengaman: kalau reload benar-benar macet/gagal, pulihkan app supaya
    // PTR tidak mati total. FIX: sebelumnya 3 detik — di jaringan lambat, reload
    // belum selesai tapi app sudah "dipulihkan" (isian yang diketik setelahnya
    // hilang begitu reload akhirnya jalan, dan _pbSkipUnloadWarn sudah false lagi).
    // Reload di sini tidak bisa dibatalkan user (flag skip aktif), jadi waktu
    // tunggunya dibuat jauh lebih longgar.
    setTimeout(function(){
      refreshing = false;
      window._pbSkipUnloadWarn = false;
      try{ localStorage.removeItem('pb_fresh_start_v1'); }catch(e){}   // R1: reload tidak jadi -> buang penanda
      resetPull(true);
    }, 15000);
  }

  appShell.addEventListener('touchstart', function(e){
    if(e.touches.length !== 1){
      // FIX: jari kedua menyentuh di tengah tarikan (mis. telapak tangan/pinch) —
      // sebelumnya tarikan jalan terus pakai jari pertama, lalu saat salah satu jari
      // diangkat dianggap "lepas" dan bisa memicu refresh tidak sengaja. Batalkan.
      if(pulling){ if(currentPull > 0) resetPull(true); else pulling = false; }
      return;
    }
    // FIX: selama animasi kembali (ptr-settling, ~350ms) jangan mulai tarikan baru —
    // sebelumnya class dicopot mendadak sehingga app-shell "teleport" ke posisi 0.
    if(appShell.classList.contains('ptr-settling')) { pulling = false; return; }
    if(!canStartPull(e.target)) { pulling = false; return; }
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
    pullTarget = e.target;
    pulling = true;
    axisLocked = false;
    pullT0 = 0;
    appShell.classList.remove('ptr-settling');
  }, {passive:true});

  appShell.addEventListener('touchmove', function(e){
    if(!pulling || refreshing) return;
    var deltaY = e.touches[0].clientY - startY;
    var deltaX = e.touches[0].clientX - startX;
    // FIX BUG "tidak ada pengecekan sumbu": kunci dulu sumbu gesture-nya
    // begitu ada gerakan yang jelas — kalau gerakan mendatar (mis. geser
    // .preview-slots yang overflow-x:auto) lebih besar dari gerakan turun,
    // ini SWIPE HORIZONTAL, bukan tarikan refresh. Batalkan & jangan pernah
    // preventDefault gesture ini, biar scroll horizontal browser tetap jalan
    // normal — cukup dicek sekali per gesture (axisLocked) biar tidak
    // "flip-flop" kalau jari geser diagonal.
    if(!axisLocked){
      if(Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return; // gerakan masih terlalu kecil buat ditentukan arahnya
      axisLocked = true;
      if(Math.abs(deltaX) >= Math.abs(deltaY)){ pulling = false; return; }
    }
    if(deltaY <= 0){
      // FIX: jangan matikan gesture (pulling=false) — kalau jari turun lagi di
      // gesture yang sama, tarikan bisa lanjut. Cukup kembalikan visual ke 0.
      if(currentPull > 0){ currentPull = 0; renderPull(0); }
      return; // bukan menarik ke bawah (atau lagi scroll konten) — biarkan scroll normal
    }
    if(appShell.scrollTop > 0 || ptrScrolledAncestor(pullTarget)){ // sempat ke-scroll di tengah gesture — batalkan
      if(currentPull > 0) resetPull(true);
      return;
    }
    if(e.cancelable) e.preventDefault(); // FIX: hindari warning "Ignored attempt to cancel a touchmove" di Chrome
    if(!pullT0) pullT0 = Date.now();
    currentPull = Math.min(deltaY * RESISTANCE, MAX_PULL);
    renderPull(currentPull);
  }, {passive:false});

  // FITUR BARU (permintaan user, Sept 2026): kalau ambang tarikan tercapai
  // TAPI user lagi mengisi sesuatu (builder Foto ATAU Video, step apapun —
  // dicek lewat pbHasUnsavedProgress() di IIFE undo/redo di atas, termasuk
  // proses bulk video yang masih menggantung), jangan langsung reload.
  // Tampilkan konfirmasi dulu: kalau user pilih "OK"/setuju, BARU lanjut
  // refresh (dan seperti sudah dijelaskan di komentar isReloadNavigation di
  // atas, itu artinya mulai lagi dari Step 1 kosong — draft ikut terhapus,
  // sengaja, tanpa pengecualian). Kalau user batal, animasi tarikan
  // dikembalikan seperti semula dan TIDAK ada reload sama sekali. Kalau
  // tidak ada progres apa-apa (masih Step 1 kosong/baru buka app), refresh
  // tetap langsung jalan tanpa tanya-tanya — tidak ada apa-apa yang bisa
  // hilang jadi tidak perlu diganggu konfirmasi.
  function onTouchEnd(){
    if(!pulling) return;
    pulling = false;
    if(refreshing) return;
    if(currentPull <= 0){
      // FIX: tap biasa / tidak ada tarikan — JANGAN panggil resetPull. Sebelumnya tiap
      // tap di puncak halaman memasang transform:translateY(0px) selama 380ms yang
      // membuat #app-shell jadi containing block untuk elemen position:fixed di
      // dalamnya (modal yang dibuka lewat tap itu sempat kedip/loncat).
      if(appShell.style.transform){ appShell.classList.remove('ptr-settling'); appShell.style.transform = ''; }
      return;
    }
    // FIX: tarikan terlalu cepat (flick) tidak dihitung sebagai niat refresh
    if(currentPull >= THRESHOLD && (Date.now() - pullT0) < MIN_PULL_MS){
      resetPull(true);
      return;
    }
    if(currentPull >= THRESHOLD){
      // FITUR BARU (permintaan user): kalau tur panduan lagi berjalan
      // (belum Selesai/Lewati), prioritaskan pertanyaan soal TUR ini
      // dibanding pertanyaan progres wizard biasa — soalnya kalau user
      // setuju refresh di sini, tur memang akan di-reset dari awal (sama
      // seperti reload lain), jadi itu yang paling relevan buat dikasih
      // tahu ke user. Kalau user pilih "Batal", refresh dibatalkan TOTAL
      // (tidak ada reload sama sekali) — tur lanjut jalan persis di step
      // yang lagi ditampilkan sekarang, tidak ke-apa-apain.
      var tourAktif=false;
      try{
        tourAktif = pbTourIsRunning();
      }catch(err){}
      if(tourAktif){
        // Setuju → reload; setelah reload tur otomatis mulai dari Langkah 1
        // (tanpa dialog kedua, lihat pbAutoStartTourOnLoad).
        pbAskConfirm('Tindakan ini akan memulai tur dari awal. Lanjutkan?', 'Ya, Mulai Ulang',
          function(){
            triggerRefresh();
          },
          function(){ resetPull(true); });
        return;
      }
      var adaProgres = (typeof window.pbHasUnsavedProgress==='function') && window.pbHasUnsavedProgress();
      // FIX: proses generate yang sedang berjalan juga dianggap "progres" — guard
      // beforeunload-nya mati karena _pbSkipUnloadWarn, jadi PTR harus bertanya sendiri.
      try{
        if(!adaProgres && typeof _vbGuardGenerating==='function') adaProgres = !!_vbGuardGenerating();
      }catch(err){}
      if(adaProgres){
        pbAskConfirm('Kamu masih mengisi proses ini. Refresh akan menghapus isian yang belum di-generate dan wizard mulai lagi dari Step 1. Lanjutkan refresh?', 'Ya, Refresh',
          function(){ triggerRefresh(); },
          function(){ resetPull(true); });
        return;
      }
      triggerRefresh();
    }
    else resetPull(true);
  }
  appShell.addEventListener('touchend', onTouchEnd, {passive:true});
  // FIX (audit refresh): touchcancel BUKAN touchend. Ini dipicu sistem
  // (tarik notification shade, telepon masuk, dsb) di luar kendali user,
  // jadi tidak boleh memicu reload atau dialog konfirmasi — cukup batalkan
  // gestur pull secara diam-diam seperti gagal biasa.
  appShell.addEventListener('touchcancel', function(){
    if(!pulling) return;
    pulling = false;
    if(refreshing) return;
    resetPull(true);
  }, {passive:true});
})();
