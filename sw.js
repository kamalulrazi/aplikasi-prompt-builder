// Service worker — sekarang HANYA men-cache foto pratinjau panggung Prompt Foto AI
// (folder media/pst/). Semua yang lain tetap seperti sebelumnya: tidak di-cache,
// index.html selalu diambil terbaru (no-store).
//
// CARA GANTI FOTO:
// - Ganti 1-2 foto  -> beri nama file baru (mis. ch12-v2.webp) atau tambah ?v=2 di src.
//   Foto lain TIDAK diunduh ulang.
// - Ganti banyak foto sekaligus -> naikkan PST_CACHE jadi 'pst-media-v2'.
//   Cache lama otomatis dihapus saat activate, foto diunduh ulang sekali.
var PST_CACHE = 'pst-media-v1';

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        // Hapus HANYA cache foto versi lama. Cache lain tidak disentuh.
        if (k.indexOf('pst-media-') === 0 && k !== PST_CACHE) {
          return caches.delete(k);
        }
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  var url = new URL(req.url);

  // ── Foto pratinjau Prompt Foto AI: cache dulu, kalau belum ada baru unduh ──
  // Ditaruh PALING ATAS, sebelum aturan "/media/ dibiarkan ke browser" di bawah.
  // Foto bukan video, tidak pakai Range, jadi aman di-cache penuh.
  if (req.method === 'GET' &&
      url.origin === self.location.origin &&
      url.pathname.indexOf('/media/pst/') !== -1 &&
      !req.headers.has('range')) {
    event.respondWith(
      caches.open(PST_CACHE).then(function (cache) {
        return cache.match(req).then(function (hit) {
          if (hit) return hit;
          return fetch(req).then(function (res) {
            // simpan hanya kalau sukses (hindari menyimpan 404)
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          });
        });
      })
    );
    return;
  }

  // BARU (Okt 2026): video/foto pratinjau sekarang file terpisah di folder
  // media/. Video dimuat browser pakai request Range (potongan byte), jadi
  // dibiarkan ditangani browser sendiri (tanpa respondWith) supaya cache
  // HTTP-nya jalan normal dan video tidak diunduh ulang setiap kali.
  if (url.origin === self.location.origin &&
      url.pathname.indexOf('/media/') !== -1) {
    return;
  }
  if (req.headers.has('range') ||
      req.destination === 'video' ||
      req.destination === 'audio') {
    return;
  }

  // FIX (audit refresh, "app masih versi lama setelah refresh"): untuk
  // dokumen HTML utama (index.html — SATU-SATUNYA file app ini, semua
  // CSS/JS inline di dalamnya), fetch dipaksa cache:'no-store' supaya
  // SELALU ambil byte terbaru dari server.
  var isDocument = req.mode === 'navigate' ||
                   req.destination === 'document';
  if (isDocument) {
    event.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }
  // Selain dokumen utama (font CDN, GSI, Firebase SDK, dst.): pass-through
  // apa adanya, supaya tidak mengganggu koneksi long-lived/stream Firestore dkk.
  event.respondWith(fetch(req));
});
