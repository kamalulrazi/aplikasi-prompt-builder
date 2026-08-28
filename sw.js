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
  // Pass-through: langsung ambil dari network, tidak ada caching.
  event.respondWith(fetch(event.request));
});
