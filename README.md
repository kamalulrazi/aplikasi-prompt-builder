# Prompt Builder — struktur file

| File | Isi |
|---|---|
| `index.html` | Markup + daftar `<script src>` / `<link>`. **Urutan `<script>` di sini = urutan jalan, jangan diurutkan ulang.** |
| `app.css` | Semua 41 blok `<style>` lama, urutan sama persis (urutan = prioritas cascade). |
| `outfit-studio.html` | Outfit Studio (dulu string `OS_HTML`). Dimuat lewat `fetch()` di `osOpen()` lalu dipasang ke iframe via `srcdoc`. |
| `js/NN-nama.js` | 43 skrip inline lama, satu file per `<script>`. Nomor = urutan jalan. Header tiap file menyebut asal barisnya di index.html lama. |

## Deploy
Unggah semua file ini ke folder yang sama dengan `manifest.json`, `sw.js`, ikon, dan `media/` (file-file itu tidak ikut di sini).

Kalau `sw.js` memakai daftar file untuk cache, tambahkan:

```js
[
  "./app.css",
  "./outfit-studio.html",
  "./js/01-boot-reload-flag.js",
  "./js/02-tier-tema-awal.js",
  "./js/03-autoscroll-off-sw.js",
  "./js/04-firebase-login.js",
  "./js/05-dialog-konfirmasi-gerbang.js",
  "./js/06-splash-logo.js",
  "./js/07-kunci-zoom.js",
  "./js/08-google-login.js",
  "./js/09-avatar-cepat.js",
  "./js/10-main-app.js",
  "./js/11-outfit-studio.js",
  "./js/12-onboarding-tur.js",
  "./js/13-draft-otomatis.js",
  "./js/14-pull-to-refresh.js",
  "./js/15-viewport-keyboard.js",
  "./js/16-statistik-admin.js",
  "./js/17-pbw.js",
  "./js/18-pb-fork.js",
  "./js/19-pb-c-age-scale.js",
  "./js/20-pb-v2-range.js",
  "./js/21-tl-foto.js",
  "./js/22-tl-fold.js",
  "./js/23-info-produk-audiens.js",
  "./js/24-gerak-kamera.js",
  "./js/25-pfa.js",
  "./js/26-pov-mode.js",
  "./js/27-pst-stage.js",
  "./js/28-thumb.js",
  "./js/29-pb-genwait.js",
  "./js/30-pb-dock.js",
  "./js/31-pb-cdock-video.js",
  "./js/32-pb-slimnav.js",
  "./js/33-foto-referensi-lokasi.js",
  "./js/34-pb-nochar.js",
  "./js/35-pb-poseref.js",
  "./js/36-pst-preload.js",
  "./js/37-video-tur-besar.js",
  "./js/38-pb-ikon-bulat-lanjutan.js",
  "./js/39-pemulihan-tampilan.js",
  "./js/40-os-pfa-bridge.js",
  "./js/41-pb-pmode.js",
  "./js/42-povhand-skip.js",
  "./js/43-pb-refscript.js"
]
```

## Langkah berikutnya
Lebur patch kecil (`js/17`–`js/43`, blok `pb-…` di `app.css`) ke kode aslinya, baru kurangi `!important`.
