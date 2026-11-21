// fitur/umum-kunci-zoom.js — (dulu js/07-kunci-zoom.js) dipindah dari <script> di index.html lama (baris 5680). Isi tidak diubah.
  // KUNCI ZOOM (lapis tambahan): blokir gesture pinch-zoom di iOS Safari,
  // blokir double-tap-to-zoom, dan blokir Ctrl+Scroll / Ctrl+Plus/Minus zoom
  // di laptop (Windows/Mac). Viewport meta + CSS touch-action di atas udah
  // nutup sebagian besar kasus; ini buat jaga-jaga di browser yang bandel.
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('gesturechange', function (e) { e.preventDefault(); });

  let _lastTouchEnd = 0;
  document.addEventListener('touchend', function (e) {
    // FIX BUG PENTING (akar masalah "klik cepat masih kehitung 1 klik" pada
    // fitur double-click-untuk-konfirmasi di chip/kartu pilihan): guard ini
    // awalnya MEMBLOKIR TOTAL tap kedua kalau jaraknya ≤300ms dari tap
    // sebelumnya, DI MANA PUN di halaman — preventDefault() pada 'touchend'
    // membuat browser TIDAK PERNAH mensintesis event 'click' untuk tap itu
    // sama sekali. Ini bentrok langsung dengan fitur double-click cepat di
    // chip (lihat listener 'click' + "_fastPickLastEl" di script utama),
    // karena tap kedua yang seharusnya jadi "klik ke-2" malah dibunuh duluan
    // di sini sebelum sempat sampai ke JS manapun.
    // Sekarang elemen pilihan (chip/subjek-card/dst.) DIKECUALIKAN dari
    // guard ini — mereka sudah aman dari gesture zoom lewat CSS
    // touch-action:manipulation yang dipasang khusus untuk elemen itu, jadi
    // guard tambahan di sini jadi redundan (malah merugikan) untuk mereka.
    // Di luar elemen-elemen itu (scroll area, teks, dsb.), guard anti-zoom
    // yang asli tetap jalan seperti biasa.
    if(e.target&&e.target.closest&&e.target.closest('.chip,.subjek-card,.ftype-btn,.catcard,.vstyle-card,.produk-choice,.suara-card,#vmotion-chips .pb-fk,#v4-box .pb-fk,#vcam-chips .pb-fk,#vcam-hook-chips .pb-fk'))return;
    // FIX (HP Redmi: ikon kamera/upload foto "tidak terjadi apa-apa"): tap pada elemen
    // yang bisa diklik (tombol, ikon upload ber-onclick, label, input, link) JANGAN
    // pernah dibatalkan — preventDefault di sini membuat browser tidak membuat event
    // 'click', jadi picker foto tidak terbuka kalau tap jatuh <300ms setelah sentuhan
    // sebelumnya (mis. habis scroll / habis tutup keyboard). Zoom tetap terkunci lewat
    // touch-action:pan-x pan-y di html/body, jadi guard ini aman dikecualikan di sini.
    if(e.target&&e.target.closest&&e.target.closest('button,a,label,input,select,textarea,summary,[onclick],[role="button"]'))return;
    let now = Date.now();
    if (now - _lastTouchEnd <= 300) e.preventDefault();
    _lastTouchEnd = now;
  }, { passive: false });

  document.addEventListener('wheel', function (e) {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) {
      e.preventDefault();
    }
  });
