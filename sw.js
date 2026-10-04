// Service worker minimal — sekadar biar registrasi di index.html tidak
// gagal/warning. Tidak melakukan caching apa pun, jadi app selalu
// mengambil versi terbaru dari file (aman untuk pengembangan).
// Kalau nanti mau app bisa dipakai offline, ini bisa dikembangkan lagi
// untuk cache file www secara sederhana.

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  // BARU (Okt 2026): video/foto pratinjau sekarang file terpisah di folder
  // media/. Video dimuat browser pakai request Range (potongan byte), jadi
  // dibiarkan ditangani browser sendiri (tanpa respondWith) supaya cache
  // HTTP-nya jalan normal dan video tidak diunduh ulang setiap kali.
  var url = new URL(event.request.url);
  if (url.origin === self.location.origin &&
      url.pathname.indexOf('/media/') !== -1) {
    return;
  }
  if (event.request.headers.has('range') ||
      event.request.destination === 'video' ||
      event.request.destination === 'audio') {
    return;
  }

  // FIX (audit refresh, "app masih versi lama setelah refresh"): untuk
  // dokumen HTML utama (index.html — SATU-SATUNYA file app ini, semua
  // CSS/JS inline di dalamnya), fetch dipaksa cache:'no-store' supaya
  // SELALU ambil byte terbaru dari server, tidak pernah "puas" dengan
  // salinan di HTTP cache browser. Tanpa ini, pass-through polos di
  // bawah tetap tunduk ke aturan cache bawaan browser (Cache-Control/
  // ETag dari server) — kalau hosting tidak kirim header no-cache yang
  // benar, refresh/reload bisa saja mendapat index.html versi lama dari
  // cache tanpa benar-benar menanyakan ke server, padahal SW ini sendiri
  // sudah aktif dan sengaja tidak melakukan caching apa pun.
  var isDocument = event.request.mode === 'navigate' ||
                   event.request.destination === 'document';
  if (isDocument) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }
  // Selain dokumen utama (font CDN, GSI, Firebase SDK, dst.): pass-through
  // apa adanya seperti semula, tidak diubah sama sekali — supaya tidak
  // mengganggu koneksi long-lived/stream milik Firestore dkk.
  event.respondWith(fetch(event.request));
});
