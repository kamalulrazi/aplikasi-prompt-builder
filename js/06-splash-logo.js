// js/06-splash-logo.js — dipindah dari <script> di index.html lama (baris 5592). Isi tidak diubah.
  (function(){
    var wrap = document.getElementById('splash-logo-wrap');
    var title = document.getElementById('splash-title');
    var ver = document.getElementById('splash-version');
    var screen = document.getElementById('splash-screen');
    if(!wrap || !screen) return;
    // FITUR BARU (permintaan user, Sept 2026): kalau ini REFRESH/RELOAD
    // (bukan buka aplikasi pertama kali / dari home screen), langsung
    // buang splash TANPA animasi apa pun — user maunya langsung nyambung
    // ke tab & step yang sedang dikerjakan (lihat logika restore tab +
    // draft-cleared-mulai-dari-Step-1 di window.load paling bawah file),
    // bukan disuguhi animasi logo P dulu tiap kali refresh.
    // FIX (bug lanjutan dari perbaikan PB_IS_TRUE_RELOAD, lihat IIFE
    // paling awal di <head>): sebelumnya di sini deteksi reload DIDUPLIKASI
    // pakai Performance API sendiri (bukan panggil isReloadNavigation())
    // karena fungsi itu didefinisikan jauh di bawah file dan belum
    // ke-parse di titik secepat ini. Itu sebabnya waktu Performance API
    // diganti sessionStorage di isReloadNavigation()/isReloadNavigationTour(),
    // salinan di sini KETINGGALAN — splash jadi bisa tidak sinkron dengan
    // draft (mis. splash kelewat padahal draft TETAP dipulihkan, atau
    // sebaliknya). Sekarang pakai window.PB_IS_TRUE_RELOAD langsung — itu
    // variabel biasa (bukan pemanggilan fungsi), jadi tidak ada masalah
    // urutan parse sama sekali, dan nilainya SELALU sama persis dengan
    // yang dipakai isReloadNavigation() di bawah. Fallback Performance API
    // lama tetap dipertahankan untuk kasus sessionStorage terblokir.
    var _isReloadNow = false;
    try{
      if(window.PB_IS_TRUE_RELOAD===true || window.PB_IS_TRUE_RELOAD===false){
        _isReloadNow = window.PB_IS_TRUE_RELOAD;
      } else {
        var _navEntries = performance.getEntriesByType && performance.getEntriesByType('navigation');
        if(_navEntries && _navEntries.length && _navEntries[0].type) _isReloadNow = (_navEntries[0].type === 'reload');
        else if(performance.navigation) _isReloadNow = (performance.navigation.type === 1); // fallback API lama
      }
    }catch(e){}
    if(_isReloadNow){
      screen.remove();
      return; // splash dilewat total, tidak ada animasi/timer apapun yang dijadwalkan
    }
    // Paksa reflow dulu supaya state "terpisah" ke-render sebelum merge dimulai
    void wrap.offsetWidth;
    setTimeout(function(){ wrap.classList.add('merged'); }, 300);
    setTimeout(function(){
      if(title) title.classList.add('show');
      if(ver) ver.classList.add('show');
    }, 1200);
    // Logo splash "terbang" & mengecil tepat ke posisi logo P di header —
    // supaya kesannya logo splash itu MENJADI logo header, bukan cuma
    // fade out lalu logo header muncul terpisah di tempat lain.
    // (headerIcon di-query DI SINI, bukan di atas — karena elemen <header>
    // letaknya di bawah blok splash ini di HTML, jadi kalau di-query di awal
    // script (sebelum browser sempat parse bagian bawah), hasilnya selalu
    // null dan animasi terbangnya nggak pernah jalan.)
    setTimeout(function(){
      try{
        var headerIcon = document.querySelector('.header-p-icon');
        if(headerIcon){
          var from = wrap.getBoundingClientRect();
          var to = headerIcon.getBoundingClientRect();
          if(from.width>0 && from.height>0 && to.width>0 && to.height>0){
            // Kotak splash persegi (1:1) tapi kotak logo header TIDAK persegi
            // (lebih tinggi dari lebar) — jadi skala X dan Y dihitung terpisah,
            // lalu dipakai yang TERKECIL supaya logo yang terbang tidak pernah
            // membesar melebihi target (aman, tidak menabrak teks di sebelahnya).
            var scaleX = to.width/from.width;
            var scaleY = to.height/from.height;
            var scale = Math.min(scaleX, scaleY);
            var dx = (to.left+to.width/2)-(from.left+from.width/2);
            var dy = (to.top+to.height/2)-(from.top+from.height/2);
            wrap.style.transition = 'transform 0.6s cubic-bezier(0.65,0,0.35,1)';
            wrap.style.transform = 'translate('+dx+'px,'+dy+'px) scale('+scale+')';
          }
        }
      }catch(err){
        // Kalau ada apa pun yang meleset di sini, jangan sampai memutus proses
        // lain — cukup lewati animasi terbangnya, splash tetap fade out normal.
      }
      if(title) title.classList.remove('show');
      if(ver) ver.classList.remove('show');
    }, 2300);
    setTimeout(function(){
      screen.classList.add('hide');
      setTimeout(function(){ screen.remove(); }, 550);
    }, 2900);
  })();
