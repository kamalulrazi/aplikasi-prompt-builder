# PETA FITUR — file mana yang dikirim ke AI

Nama file di folder `fitur/` diawali nama fiturnya, jadi file dengan awalan sama selalu berdekatan.

**Cara pakai:** cari fiturmu di tabel *Contoh cepat* atau di daftar per fitur, lalu kirim file yang disebut. 
Kalau ragu, kirim file ini (`PETA-FITUR.md`) dan sebutkan fiturnya, nanti AI yang bilang file mana yang perlu dikirim. 
Atau kirim seluruh repo (GitHub → Code → Download ZIP).

> Satu fitur kadang menyentuh 2–3 file: logikanya di `fitur/`, tampilan (tombol, teks, susunan layar) di `index.html`, dan gaya (warna, ukuran) di `app.css`. Tabel di bawah menyebut semuanya.

## Contoh cepat

| Mau ubah | Kirim |
|---|---|
| **Opsi contoh skrip referensi** (data bawaan: opsi 1–25 dst.) | `fitur/video-contoh-skrip-referensi.js` (besar, ±570 KB karena isinya data) |
| **Skrip referensi milik user** (tombol "Simpan skrip" di kartu CTA) | `fitur/video-skrip-referensi-milik-user.js`, tambah `index.html` bila tombolnya berubah |
| Langkah/pilihan di **Prompt Foto AI** | `fitur/foto-wizard-langkah.js` + `fitur/foto-susun-prompt.js`, tambah `index.html` bila ada chip/kartu baru |
| Isi hasil prompt Foto (JSON) | `fitur/foto-susun-prompt.js` |
| **Karakter Sheet** | `fitur/karakter-sheet.js` |
| Wizard **Prompt Video AI** | `fitur/video-builder-inti.js` (+ `index.html`) |
| Mode **Bulk** (banyak produk) | `fitur/video-bulk-ai.js` + `fitur/video-bulk-hasil-akordeon.js` + `fitur/video-atur-mode-produk.js` |
| **Revisi skrip** Video | `fitur/video-revisi-skrip.js` |
| Tampilan **Riwayat** | `fitur/riwayat-tab.js` (+ `fitur/riwayat-halaman-tersimpan.js`) |
| **Harga, paket, kuota, pembayaran** | `fitur/akun-paket-kuota-bayar.js` |
| **Pilihan model AI** | `fitur/ai-model-dan-koneksi.js` |
| **Login** | `fitur/akun-login-firebase.js` atau `fitur/akun-login-google.js` |
| **Warna, ukuran, gaya** | `app.css` (+ `index.html`) |
| **Teks atau tombol** di layar | `index.html` (+ file fiturnya bila tombol harus melakukan hal baru) |
| **Outfit Studio** | `outfit-studio.html` (isi utama, ±870 KB) + `fitur/outfit-studio-pembuka.js` |
| **Tur panduan** pertama kali | `fitur/panduan-tur-pertama-kali.js` |

## Daftar lengkap per fitur

### Prompt Foto AI (menu Foto)

| File | Isi | Ukuran |
|---|---|---|
| `fitur/foto-ikon-bulat-lanjutan.js` | Foto — ikon bulat pada pilihan chip | 2 KB |
| `fitur/foto-konflik-dan-cahaya.js` | Foto — pendeteksi konflik AI (dinonaktifkan) dan urutan/hint Cahaya sesuai lokasi | 6 KB |
| `fitur/foto-mode-produk-saja-pov.js` | Foto — mode "Produk saja · POV" | 21 KB |
| `fitur/foto-panggung-pratinjau.js` | Foto — panggung pratinjau (backdrop, cahaya) | 19 KB |
| `fitur/foto-pov-tangan-lewati-sudut-kamera.js` | Foto — "Dipegang tangan (POV)" melewati Sudut Kamera | 3 KB |
| `fitur/foto-preload-pratinjau.js` | Foto — mengunduh foto pratinjau di latar belakang | 2 KB |
| `fitur/foto-refresh-penghitung-referensi.js` | Foto — menyegarkan penghitung foto referensi | 0 KB |
| `fitur/foto-ringkasan.js` | Foto — Ringkasan Visual sebelum Generate | 31 KB |
| `fitur/foto-ringkasan-dan-panel-live.js` | Foto — strip langkah, ringkasan, dan panel Prompt live | 18 KB |
| `fitur/foto-susun-prompt.js` | Prompt Foto AI — menyusun hasil prompt (JSON), impor prompt lama, penyesuaian kualitas output | 76 KB |
| `fitur/foto-thumbnail-ilustrasi.js` | Foto — ilustrasi thumbnail pilihan | 21 KB |
| `fitur/foto-timeline-lipat-ringkasan.js` | Foto — lipat alur step jadi ringkasan setelah Generate | 2 KB |
| `fitur/foto-timeline-step.js` | Foto — garis waktu step (centang, opsional) | 2 KB |
| `fitur/foto-tunggu-generate.js` | Foto — tampilan menunggu saat step dibuka/generate | 1 KB |
| `fitur/foto-wizard-langkah.js` | Prompt Foto AI — langkah-langkah wizard (kartu f1–f9): membuka, menutup, dan mereset step | 181 KB |

### Prompt Video AI (menu Video)

| File | Isi | Ukuran |
|---|---|---|
| `fitur/video-atur-mode-produk.js` | Video — sheet Atur Mode Produk (mode per produk, antrean grup) | 42 KB |
| `fitur/video-builder-alur-percabangan.js` | Video — alur bercabang Mode Referensi → Jenis Kelamin & Usia → Cara Bikin Skrip | 8 KB |
| `fitur/video-builder-inti.js` | Prompt Video AI — wizard utama (referensi + dialog), mode 2 suara, kecepatan bicara, mode Bulk | 263 KB |
| `fitur/video-builder-progres-dan-tombol-bawah.js` | Video — progres bertahap, chip ringkasan, tombol aksi menempel di bawah | 6 KB |
| `fitur/video-bulk-ai.js` | Video — mode Bulk AI: generate banyak produk sekaligus | 80 KB |
| `fitur/video-bulk-hasil-akordeon.js` | Video — tampilan hasil Bulk (akordeon per produk) | 20 KB |
| `fitur/video-contoh-skrip-referensi.js` | Video — DATA contoh skrip referensi (VB_REF_OPSI…, VB_REFERENCE_OPTIONS) dan cara memilihnya ke dalam prompt | 573 KB |
| `fitur/video-edit-karakter.js` | Prompt Video AI — edit karakter langsung di prompt (ikon pensil) | 61 KB |
| `fitur/video-efek-ketik.js` | Video — efek mengetik pada kotak skrip (typewriter) | 29 KB |
| `fitur/video-gerak-kamera-dan-visual-hook.js` | Video — tab Pergerakan Kamera dan Visual Hook | 5 KB |
| `fitur/video-info-produk-dan-penonton.js` | Video — tab Info Produk dan Penonton | 6 KB |
| `fitur/video-mirror-selfie.js` | Video — mode Mirror Selfie | 15 KB |
| `fitur/video-pemakaian-ai.js` | Catatan pemakaian dan biaya AI Video (token, harian/bulanan) | 58 KB |
| `fitur/video-prompt-sistem-dan-perbaikan-skrip.js` | Video — prompt sistem mode 1 produk, perbaikan dan cek otomatis skrip (kata kurang/lebih) | 53 KB |
| `fitur/video-revisi-skrip.js` | Video — Revisi Skrip untuk mode 1 produk | 117 KB |
| `fitur/video-sapaan-dan-perapian-teks.js` | Video — hitung biaya model, sapaan, pembersih teks, batas jumlah kata | 28 KB |
| `fitur/video-skrip-referensi-milik-user.js` | Video — skrip referensi milik user (simpan skrip dari kartu CTA) | 7 KB |
| `fitur/video-streaming-ai.js` | Video — pengiriman ke AI dengan streaming real-time, ulang otomatis, cadangan model | 40 KB |
| `fitur/video-tombol-konfirmasi-menempel.js` | Video — tombol konfirmasi menempel di kartu | 2 KB |
| `fitur/video-usia-geser-angka.js` | Video — pilihan usia: geser trek ⇄ isi angka | 1 KB |
| `fitur/video-usia-skala.js` | Video — pilihan usia berbentuk skala | 2 KB |

### Riwayat (menu Riwayat)

| File | Isi | Ukuran |
|---|---|---|
| `fitur/riwayat-halaman-tersimpan.js` | Riwayat prompt terakhir (45 terbaru) dan Halaman Tersimpan | 34 KB |
| `fitur/riwayat-tab.js` | Tab Riwayat: tampilan, riwayat otomatis Foto & Video, Lihat Ringkasan, perbaikan riwayat Video | 108 KB |

### Karakter Sheet

| File | Isi | Ukuran |
|---|---|---|
| `fitur/karakter-sheet.js` | Karakter Sheet — popup untuk membuat dan memakai karakter (dipakai Foto dan Video) | 35 KB |

### Panduan (menu Panduan, tur, video tur)

| File | Isi | Ukuran |
|---|---|---|
| `fitur/panduan-tur-pertama-kali.js` | Tur panduan untuk pengguna yang pertama kali membuka app (Prompt Foto) | 157 KB |
| `fitur/panduan-video-tur-besar.js` | Panduan — buka video tur di jendela lebih besar | 4 KB |

### Outfit Studio

| File | Isi | Ukuran |
|---|---|---|
| `fitur/outfit-studio-jembatan-foto.js` | Jembatan Outfit Studio ⇄ Prompt Foto AI | 3 KB |
| `fitur/outfit-studio-pembuka.js` | Membuka/menutup Outfit Studio (memuat outfit-studio.html) | 3 KB |

### Akun: login, paket, kuota, pembayaran, admin

| File | Isi | Ukuran |
|---|---|---|
| `fitur/akun-avatar-cepat.js` | Nama dan foto profil cepat tampil | 1 KB |
| `fitur/akun-gerbang-login-dan-dialog.js` | Dialog konfirmasi bermerek dan gerbang login | 3 KB |
| `fitur/akun-login-firebase.js` | Login dan akun (Firebase) | 69 KB |
| `fitur/akun-login-google.js` | Login dengan Google | 13 KB |
| `fitur/akun-paket-kuota-bayar.js` | Paket (tier), kuota harian, upgrade dan pembayaran, enkripsi penyimpanan API key | 27 KB |
| `fitur/akun-statistik-admin.js` | Statistik biaya dan cache (hanya tampil untuk admin) | 1 KB |

### Model AI dan koneksi

| File | Isi | Ukuran |
|---|---|---|
| `fitur/ai-model-dan-koneksi.js` | Pilihan model AI dan koneksi ke server AI (token, admin) | 24 KB |

### Layar tunggu saat Generate

| File | Isi | Ukuran |
|---|---|---|
| `fitur/generate-layar-tunggu.js` | Layar tunggu saat tombol Generate ditekan: animasi, kotak skrip real-time, pengaman generate | 65 KB |

### Umum (dipakai semua fitur)

| File | Isi | Ukuran |
|---|---|---|
| `fitur/umum-aksesibilitas-keyboard.js` | Chip dan kartu bisa difokus dan ditekan lewat keyboard | 2 KB |
| `fitur/umum-alat-bantu.js` | Alat bantu dipakai semua fitur: pintasan keyboard, urungkan pilihan chip, klik cepat pada chip, simpan teks "isi sendiri" | 23 KB |
| `fitur/umum-boot-reload.js` | Deteksi apakah halaman di-refresh sungguhan (paling awal) | 3 KB |
| `fitur/umum-dock-bawah.js` | Posisi dock tombol di bawah layar | 1 KB |
| `fitur/umum-draft-otomatis.js` | Menyimpan draf isian otomatis dan urungkan | 44 KB |
| `fitur/umum-keyboard-dan-viewport.js` | Menyesuaikan tampilan saat keyboard HP muncul | 2 KB |
| `fitur/umum-kunci-zoom.js` | Mengunci zoom layar | 3 KB |
| `fitur/umum-mulai-app.js` | Pengaturan awal tampilan saat app selesai dimuat: progress bar Foto/Video 0%, render riwayat dan karakter | 2 KB |
| `fitur/umum-pemulihan-tampilan-terakhir.js` | Pemulihan tampilan terakhir setelah app dimatikan Android | 6 KB |
| `fitur/umum-scroll-dan-service-worker.js` | Mematikan auto-scroll tertentu dan mendaftarkan service worker (sw.js) | 2 KB |
| `fitur/umum-splash-logo.js` | Layar pembuka (splash) dan logo | 5 KB |
| `fitur/umum-tarik-untuk-refresh.js` | Tarik layar ke bawah untuk refresh | 16 KB |
| `fitur/umum-tema-dan-paket-awal.js` | Tema warna dan paket yang diterapkan sedini mungkin supaya tidak berkedip | 3 KB |
| `fitur/umum-tombol-lanjut-kecil.js` | Gaya tombol "Lanjut" yang lebih kecil | 2 KB |

### File di luar `fitur/`

| File | Isi |
|---|---|
| `index.html` | Kerangka halaman: semua tombol, teks, dan susunan layar, ditambah daftar file yang dimuat. **Urutan baris `<script>` = urutan jalan, jangan diurutkan ulang.** |
| `app.css` | Seluruh gaya tampilan (warna, ukuran, animasi). Urutan di dalamnya menentukan mana yang menang, jangan diurutkan ulang. |
| `outfit-studio.html` | Isi Outfit Studio. |
| `sw.js`, `manifest.json`, ikon, `media/` | Service worker, pengaturan PWA, ikon, dan foto pratinjau. |

## Catatan

- File yang namanya mengandung kata *dulu js/NN-…* di baris pertamanya adalah "tambalan" lama yang menimpa kode di file lain. Kalau fitur yang diubah ada di daftarnya, kirim sekalian.
- `fitur/umum-mulai-app.js` berisi pengaturan awal tampilan yang sengaja dijalankan paling akhir.
- Bagian-bagian besar (misalnya `video-builder-inti.js` ±260 KB) akan dipecah lebih halus kalau nanti terasa terlalu besar untuk dikirim.
