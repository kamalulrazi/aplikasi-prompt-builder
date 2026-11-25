# PETA FITUR — mau ubah apa → file mana

> **Untuk AI:** baca bagian 1–3 dulu. Jangan menebak file dari namanya, karena beberapa nama menyesatkan (lihat bagian 3). Kalau perubahan menyentuh fitur baru atau file baru, **perbarui peta ini** (bagian 7).
> **Untuk user:** cari fiturmu di bagian 1, lalu kirim file yang disebut. Kalau ragu, kirim file ini dan sebutkan fiturnya. Atau kirim seluruh repo (GitHub → Code → Download ZIP).

Terakhir diperbarui: 25 Nov 2026 · Jumlah file di `fitur/`: 68 (67 dimuat `index.html`, 1 tidak dimuat).

---

## 1. Mau ubah apa → kirim file mana

Satu fitur sering menyentuh beberapa file: logika di `fitur/`, tampilan (tombol, teks, susunan layar) di `index.html`, gaya (warna, ukuran) di `app.css`.

| Mau ubah | File utama | Cek juga |
|---|---|---|
| **Teks yang masuk ke prompt Video per kartu** (Hook / Cerita / CTA) | `video-revisi-skrip.js` (`_vbBuildFlowText`) | `video-edit-karakter.js` (teks pilihannya), `video-builder-inti.js` |
| **Tombol "Tulisan Estetik"** dan kalimatnya | `video-edit-karakter.js` (`VB_AESTHETIC_TEXT`, `VB_AESTHETIC_TEXT_SHORT`) | `video-revisi-skrip.js` (yang memilih kalimat per kartu) |
| **Pilihan kamera, hook, teks overlay Hook** | `video-builder-inti.js` (`VB_CAM_*`, `VB_HOOK_OVERLAY`) | `video-gerak-kamera-dan-visual-hook.js` (hanya tab) |
| **Wizard Prompt Video** (langkah, dialog, 2 suara, kecepatan bicara) | `video-builder-inti.js` (±240 KB) | `index.html` |
| **Prompt sistem untuk AI penulis skrip** (mode 1 produk) | `video-prompt-sistem-dan-perbaikan-skrip.js` | `video-sapaan-dan-perapian-teks.js` |
| **Prompt sistem mode 2 suara** | `video-builder-inti.js` (`_vbBuildDuaSystemPrompt`) | — |
| **Contoh skrip referensi bawaan** | `video-contoh-skrip-referensi.js` (kecil, ±10 KB) | — |
| **Skrip referensi milik user** ("Simpan skrip") | `video-skrip-referensi-milik-user.js` | `index.html` bila tombol berubah |
| **Kurung `( )` di kolom skrip** | `video-isian-kurung.js` | `video-sapaan-dan-perapian-teks.js` (hitungan kata) |
| **Mode Bulk** (banyak produk) | `video-bulk-ai.js` + `video-bulk-hasil-akordeon.js` + `video-atur-mode-produk.js` | — |
| **Revisi skrip** Video | `video-revisi-skrip.js` | — |
| **Kirim ke AI, streaming, cadangan model** | `video-streaming-ai.js` | `ai-model-dan-koneksi.js` |
| **Layar tunggu saat Generate** | `generate-layar-tunggu.js` | `video-efek-ketik.js` |
| **Langkah/pilihan Prompt Foto AI** | `foto-wizard-langkah.js` + `foto-susun-prompt.js` | `index.html` bila ada chip/kartu baru |
| **Isi hasil prompt Foto (JSON)** | `foto-susun-prompt.js` | — |
| **Mode "Outfit saja" (Foto Referensi cuma Outfit atau Outfit + Lokasi, tanpa Wajah): Pose 1 opsi tanpa wajah** | `foto-wizard-langkah.js` (`fIsOutfitOnly`, `F_POSE_OUTFIT_ONLY`, `fSyncPoseOutfitOnly`, gerbang di `fKonfirmRef`) | `foto-susun-prompt.js` (buang kata "face" di `output_quality`, teks `ignore_completely` outfit) |
| **Karakter Sheet** | `karakter-sheet.js` | — |
| **Tampilan Riwayat** | `riwayat-tab.js` | `riwayat-halaman-tersimpan.js` |
| **Harga, paket, kuota, pembayaran** | `akun-paket-kuota-bayar.js` | — |
| **Pilihan model AI** | `ai-model-dan-koneksi.js` | — |
| **Login** | `akun-login-firebase.js` atau `akun-login-google.js` | — |
| **Outfit Studio** | `outfit-studio.html` (±900 KB) | `outfit-studio-pembuka.js`, `outfit-studio-album-drive.js` |
| **Tur panduan pertama kali** | `panduan-tur-pertama-kali.js` | — |
| **Warna, ukuran, gaya** | `app.css` | `index.html` |
| **Teks atau tombol di layar** | `index.html` | file fiturnya bila tombol harus melakukan hal baru |

## 2. Cari lewat nama fungsi atau konstanta

Sudah diperiksa lokasinya. Pakai ini kalau kamu tahu nama kodenya tapi tidak tahu filenya.

| Nama | Ada di |
|---|---|
| `_vbBuildFlowText` | `video-revisi-skrip.js` |
| `VB_AESTHETIC_TEXT`, `VB_AESTHETIC_TEXT_SHORT` | didefinisikan di `video-edit-karakter.js`, dipakai di `video-revisi-skrip.js` |
| `_vbBuildDuaJson`, `_vbBuildDuaSystemPrompt`, `_vbOverlaySentence`, `_vbHookOverlayText` | `video-builder-inti.js` |
| `VB_CAM_MOVES`, `VB_CAM_HOOKS`, `VB_HOOK_OVERLAY`, `VB_REF_MODE_TEXT`, `vbCamConfirm` | `video-builder-inti.js` |
| `_vbBuildSingleModeSystemPrompt`, `_vbDeal`, `VB_SHORTFIX_SYSTEM` | `video-prompt-sistem-dan-perbaikan-skrip.js` |
| `_vbRefOpts`, `_vbPickReferenceOption`, `VB_REFERENCE_OPTIONS_16` | `video-contoh-skrip-referensi.js` |
| `pbUserRefOpts` | `video-skrip-referensi-milik-user.js` |
| `_vbCharVal`, `vbCharSet` | `video-edit-karakter.js` |
| `_vbGenerateWithFallback` | `video-streaming-ai.js` |
| `_vbCallBulkBatch`, `vbGenerateBulkAI` | `video-bulk-ai.js` (`vbGenerateBulkAI` juga ditimpa di `video-atur-mode-produk.js`) |
| `vbReset`, `vbResetNow` | `video-mirror-selfie.js` |
| `showCard`, `fResetFrom` | `foto-wizard-langkah.js` (`showCard` ditimpa di `foto-pov-tangan-lewati-sudut-kamera.js`) |
| `fIsOutfitOnly`, `fSyncPoseOutfitOnly`, `F_POSE_OUTFIT_ONLY` | `foto-wizard-langkah.js` (dipakai juga oleh `foto-susun-prompt.js`) |
| `fRenderSummary` | `foto-ringkasan.js` (ditimpa di `foto-pov-tangan-lewati-sudut-kamera.js`) |
| `csOpenModal` | `karakter-sheet.js` |
| `historyAdd`, `pbSaveCurrentPage` | `riwayat-halaman-tersimpan.js` |
| `_scriptRe`, `pbOpenSavedPage` | `riwayat-tab.js` |
| `pbGetTier`, `pbGetQuota` | `akun-paket-kuota-bayar.js` |
| `PB_AI_MODELS` | `ai-model-dan-koneksi.js` |
| `osOpen` | `outfit-studio-pembuka.js` |
| `switchPage` | `umum-alat-bantu.js` (juga ditimpa di 3 file lain) |
| `pbReplayTour` | `panduan-tur-pertama-kali.js` |

Kalau namanya tidak ada di sini, cari teksnya di seluruh `fitur/` (di GitHub: tekan `/`).

## 3. Jebakan yang pernah bikin salah file

- **Nama file menyesatkan.** `video-mirror-selfie.js` kini hanya berisi reset wizard Video (mode Mirror Selfie sudah dihapus). `video-gerak-kamera-dan-visual-hook.js` hanya mengatur perpindahan tab, bukan isi pilihannya. `video-contoh-skrip-referensi.js` sudah kecil, karena contoh bawaan lama dihapus.
- **Teks prompt Video tidak ada di `video-builder-inti.js`.** Penempelan teks ke prompt tiap kartu ada di `video-revisi-skrip.js`, walau namanya "revisi".
- **Fungsi yang ditimpa file lain.** Kalau satu fungsi ada di dua file, yang menang adalah yang dimuat belakangan (urutan `<script>` di `index.html`). Pasangan yang diketahui: `showCard`, `fRenderSummary`, `fSummaryEdit`, `fGenerate`, `fBack9`, `fActiveSteps`, `fKonfirmRef` (Foto: asal di `foto-wizard-langkah.js`/`foto-ringkasan.js`, ditimpa `foto-pov-tangan-lewati-sudut-kamera.js` dan `foto-timeline-lipat-ringkasan.js`); `vbPickRefMode`, `vbGenerateBulkAI`, `_vbRunBulkGenerate`, `vbBulkResumeAI`, `vbResetNow`, `_vbCharSnap`, `pbOpenSavedPage`, `pbSaveCurrentPage` (Video/Riwayat: ditimpa `video-atur-mode-produk.js`); `vbResetNow`, `vbUpdateProgress`, `vbSyncStep6Mode3` (ditimpa `video-builder-alur-percabangan.js`). **Kalau mengubah fungsi di daftar ini, ubah versi yang menang, atau kirim kedua file.**
- **Urutan `<script>` jangan diubah.** Urutan baris di `index.html` = urutan jalan. `umum-mulai-app.js` sengaja paling akhir, `umum-boot-reload.js` paling awal. Urutan di `app.css` juga menentukan gaya mana yang menang.
- **Mode "Outfit saja" melewati gerbang "Wajib Karakter Sheet".** Gerbang itu ada di `fKonfirmRef` (`foto-wizard-langkah.js`) dan sekarang mengecualikan `fIsOutfitOnly()`. `fKonfirmRef` juga ditimpa file lain (lihat daftar di atas): kalau gerbang itu disalin ulang di versi yang menang, mode ini kembali terblokir.
- **`outfit-studio-album-awan.js` tidak dimuat.** Sudah digantikan `outfit-studio-album-drive.js`.
- File yang baris pertamanya memuat "dulu js/NN-…" adalah tambalan lama yang menimpa kode di file lain. Kalau fitur yang diubah menyentuhnya, kirim sekalian.

## 4. Daftar lengkap per fitur

Ukuran perkiraan, dihitung saat peta ini ditulis. File besar (≥100 KB): `foto-wizard-langkah.js`, `video-builder-inti.js`, `panduan-tur-pertama-kali.js`, `video-revisi-skrip.js`, `riwayat-tab.js`. Kirim satu per satu, jangan semua sekaligus.

### Prompt Foto AI (menu Foto)

| File | Isi | Kata kunci (nama fungsi / konstanta) | Ukuran |
|---|---|---|---|
| `fitur/foto-ikon-bulat-lanjutan.js` | Ikon bulat pada pilihan chip | `labelOf`, `apply` | 2 KB |
| `fitur/foto-konflik-dan-cahaya.js` | Pendeteksi konflik AI (dinonaktifkan), urutan/hint Cahaya sesuai lokasi | `fRunAIConflictCheck`, `fApplyCahayaContext` | 6 KB |
| `fitur/foto-mode-produk-saja-pov.js` | Mode "Produk saja · POV" | `POV_CAMERA`, `isOnlyProduk` | 21 KB |
| `fitur/foto-panggung-pratinjau.js` | Panggung pratinjau (backdrop, cahaya) | `pvw`, `pvo` | 19 KB |
| `fitur/foto-pov-tangan-lewati-sudut-kamera.js` | "Dipegang tangan (POV)" melewati Sudut Kamera (tambalan, menimpa `showCard` dkk) | `povOn`, `poseOn`, `fActiveSteps`, `fBack9` | 6 KB |
| `fitur/foto-preload-pratinjau.js` | Unduh foto pratinjau di latar belakang | `run`, `start` | 2 KB |
| `fitur/foto-refresh-penghitung-referensi.js` | Menyegarkan penghitung foto referensi | — | <1 KB |
| `fitur/foto-ringkasan-dan-panel-live.js` | Strip langkah, ringkasan, dan panel Prompt live (tambalan) | `_fDoGenerate`, `fResetNow` | 18 KB |
| `fitur/foto-ringkasan.js` | Ringkasan Visual sebelum Generate | `fRenderSummary`, `fSummaryEdit`, `fRestoreStepUI` | 31 KB |
| `fitur/foto-susun-prompt.js` | Menyusun hasil prompt Foto (JSON), impor prompt lama, penyesuaian kualitas output (termasuk mode Outfit saja: tanpa kata "face") | `_fIdentityRuleText`, `_fPoseAngleDesc`, `_fAdaptQuality`, `_F_POSE_DETAIL` | 83 KB |
| `fitur/foto-thumbnail-ilustrasi.js` | Ilustrasi thumbnail pilihan chip | `setTh`, `LOCICO`, `HLDICO`, `LITICO` | 21 KB |
| `fitur/foto-timeline-lipat-ringkasan.js` | Lipat alur step jadi ringkasan setelah Generate (menimpa `fGenerate`) | `info`, `set`, `sync` | 2 KB |
| `fitur/foto-timeline-step.js` | Garis waktu step (centang, opsional) | `act`, `sync` | 2 KB |
| `fitur/foto-tunggu-generate.js` | Tampilan menunggu saat step dibuka/generate | `stepOpen`, `init` | 1 KB |
| `fitur/foto-wizard-langkah.js` | Wizard Prompt Foto: kartu langkah f1–f9, buka/tutup/reset step, `showCard`; mode Outfit saja (Pose 1 opsi tanpa wajah) | `showCard`, `fResetFrom`, `FTYPE`, `F_MAX_REFS`, `STEP_PAUSE_STACK`, `fIsOutfitOnly`, `fSyncPoseOutfitOnly`, `F_POSE_OUTFIT_ONLY` | 186 KB |

### Prompt Video AI (menu Video)

| File | Isi | Kata kunci (nama fungsi / konstanta) | Ukuran |
|---|---|---|---|
| `fitur/video-atur-mode-produk.js` | Sheet Atur Mode Produk: mode per produk, antrean grup (tambalan besar, menimpa 8 fungsi) | `vbGenerateBulkAI`, `vbPickRefMode`, `_vbRunBulkGenerate`, `vbBulkResumeAI` | 43 KB |
| `fitur/video-builder-alur-percabangan.js` | Alur bercabang Mode Referensi → Jenis Kelamin & Usia → Cara Bikin Skrip (tambalan) | `forkDone`, `vbUpdateProgress` | 8 KB |
| `fitur/video-builder-inti.js` | Wizard Prompt Video: referensi + dialog, mode 2 suara, kecepatan bicara, Bulk, teks pilihan kamera/hook, overlay Hook | `_vbBuildDuaJson`, `_vbBuildDuaSystemPrompt`, `_vbOverlaySentence`, `_vbHookOverlayText`, `VB_REF_MODE_TEXT`, `VB_CAM_MOVES`, `VB_CAM_HOOKS`, `VB_CAM_OPTS`, `VB_HOOK_OVERLAY`, `vbPickRefMode`, `vbCamConfirm`, `vbManualRenderGroups` | 241 KB |
| `fitur/video-builder-progres-dan-tombol-bawah.js` | Progres bertahap, chip ringkasan, tombol aksi menempel di bawah | `navH`, `sync` | 6 KB |
| `fitur/video-bulk-ai.js` | Mode Bulk AI: generate banyak produk sekaligus | `_vbCallBulkBatch`, `_vbHardEnforceCta`, `VB_MAX_PRODUK_PER_CALL` | 80 KB |
| `fitur/video-bulk-hasil-akordeon.js` | Tampilan hasil Bulk (akordeon per produk) | `vbAccToggle`, `VB_ACC_OPEN` | 21 KB |
| `fitur/video-contoh-skrip-referensi.js` | Daftar contoh skrip referensi bawaan (kini 12 skrip 16 detik) + cara memilihnya ke prompt | `VB_REFERENCE_OPTIONS_16`, `VB_REFERENCE_HEAD`, `_vbRefOpts`, `_vbPickReferenceOption` | 11 KB |
| `fitur/video-edit-karakter.js` | Edit karakter di prompt (ikon pensil): panel opsi per produk, tombol Tulisan Estetik | `_vbCharVal`, `vbCharSet`, `vbCharToggleAesthetic`, `VB_AESTHETIC_TEXT`, `VB_AESTHETIC_TEXT_SHORT`, `VBC_META` | 62 KB |
| `fitur/video-efek-ketik.js` | Efek mengetik (typewriter) pada kotak skrip | `_vbRevealScriptBox`, `_vbTypeBoostFor` | 29 KB |
| `fitur/video-gerak-kamera-dan-visual-hook.js` | Tab Pergerakan Kamera dan Visual Hook (hanya perpindahan tab) | `vbCamTab`, `vbCamDots` | 5 KB |
| `fitur/video-info-produk-dan-penonton.js` | Tab Info Produk dan Penonton | `vbInfoTab`, `vbInfoNext` | 6 KB |
| `fitur/video-isian-kurung.js` | Teks dalam tanda kurung di kolom skrip disembunyikan tapi tetap dibaca prompt | `textarea vb-bulk-script-N`, `el.__cues` | 4 KB |
| `fitur/video-mirror-selfie.js` | **Kini hanya** reset wizard Video (`vbReset`, `vbResetNow`). Mode Mirror Selfie sudah dihapus, nama file dipertahankan | `vbReset`, `vbResetNow` | 12 KB |
| `fitur/video-pemakaian-ai.js` | Catatan pemakaian dan biaya AI Video (token, harian/bulanan) | `PB_USAGE_KEY`, `_vbSaveUsageLog` | 59 KB |
| `fitur/video-prompt-sistem-dan-perbaikan-skrip.js` | Prompt sistem mode 1 produk, perbaikan dan cek otomatis skrip (kata kurang/lebih) | `_vbBuildSingleModeSystemPrompt`, `_vbDeal`, `_vbWcNoParen`, `VB_SHORTFIX_SYSTEM`, `VB_TARGETED_FIX_*` | 53 KB |
| `fitur/video-revisi-skrip.js` | **Penyusun teks prompt video per kartu (Hook/Cerita/CTA)** + Revisi Skrip mode 1 produk | `_vbBuildFlowText`, `vbRevisiSingleAI`, `vbUndoSingleRevisi` | 117 KB |
| `fitur/video-sapaan-dan-perapian-teks.js` | Hitung biaya model, sapaan, pembersih teks, batas jumlah kata | `_vbCalcUsd`, `_VB_FORBIDDEN_PATTERNS`, `VB_FIX_WORDS_BY_LOGAT`, `USD_TO_IDR` | 29 KB |
| `fitur/video-skrip-referensi-milik-user.js` | Skrip referensi milik user: tombol "Simpan skrip" di kartu CTA, tab Akun, mode campur bawaan | `pbUserRefOpts`, `pb_user_scripts_v1`, `pb_ref_source_v1` | 15 KB |
| `fitur/video-streaming-ai.js` | Kirim ke AI dengan streaming real-time, ulang otomatis, cadangan model | `_vbGenerateWithFallback`, `_vbStreamClaudeJSONWithRetry`, `VB_GEN_FALLBACK_*` | 40 KB |
| `fitur/video-tombol-konfirmasi-menempel.js` | Tombol konfirmasi menempel di kartu | `run`, `sch` | 2 KB |
| `fitur/video-usia-geser-angka.js` | Pilihan usia: geser trek ⇄ isi angka | `v2RangePaint` | 1 KB |
| `fitur/video-usia-skala.js` | Pilihan usia berbentuk skala | `build`, `sync` | 2 KB |

### Riwayat dan Halaman Tersimpan

| File | Isi | Kata kunci (nama fungsi / konstanta) | Ukuran |
|---|---|---|---|
| `fitur/riwayat-halaman-tersimpan.js` | Riwayat prompt terakhir (45 terbaru) dan Halaman Tersimpan | `historyAdd`, `HISTORY_KEY`, `PB_SAVED_KEY`, `pbSaveCurrentPage` | 34 KB |
| `fitur/riwayat-tab.js` | Tab Riwayat: tampilan, riwayat otomatis Foto & Video, Lihat Ringkasan, perbaikan riwayat Video | `_scriptRe`, `pbRwCard`, `PB_AUTO_FOTO_KEY`, `pbOpenSavedPage` | 106 KB |

### Karakter Sheet

| File | Isi | Kata kunci (nama fungsi / konstanta) | Ukuran |
|---|---|---|---|
| `fitur/karakter-sheet.js` | Popup Karakter Sheet (dipakai Foto dan Video) | `csOpenModal`, `csCloseModal`, `CS_TOTAL_PAGES` | 35 KB |

### Panduan dan tur

| File | Isi | Kata kunci (nama fungsi / konstanta) | Ukuran |
|---|---|---|---|
| `fitur/panduan-tur-pertama-kali.js` | Tur panduan pengguna pertama kali (Prompt Foto dan Video) | `pbReplayTour`, `pbHideOverlay`, `PB_IMG_G1…` | 159 KB |
| `fitur/panduan-video-tur-besar.js` | Video tur di jendela lebih besar | `pbVzOpen`, `pbVzClose` | 4 KB |

### Outfit Studio

| File | Isi | Kata kunci (nama fungsi / konstanta) | Ukuran |
|---|---|---|---|
| `fitur/outfit-studio-album-awan.js` | Album Outfit Studio versi Firestore. **Tidak dimuat `index.html`** (digantikan versi Drive) | `osCloud`, `panahAlbum` | 2 KB |
| `fitur/outfit-studio-album-drive.js` | Album Outfit Studio disimpan di Google Drive akun login (menggantikan versi Firestore). Token Drive ±1 jam: diperbarui otomatis sebelum habis, `connect()` dari ketukan, `why` = alasan belum siap | `osCloud`, `OS_DRIVE_CLIENT_ID`, `appDataFolder`, `needsAuth`, `refresh` | 9 KB |
| `fitur/outfit-studio-jembatan-foto.js` | Jembatan Outfit Studio ⇄ Prompt Foto AI | `ensureStrip`, `modeLabel` | 3 KB |
| `fitur/outfit-studio-pembuka.js` | Membuka/menutup Outfit Studio (memuat `outfit-studio.html`); saat dibuka meminta izin Drive bila perlu | `osOpen`, `osClose`, `osAiVision` | 4 KB |

### Akun, paket, kuota, login

| File | Isi | Kata kunci (nama fungsi / konstanta) | Ukuran |
|---|---|---|---|
| `fitur/akun-avatar-cepat.js` | Nama dan foto profil cepat tampil | — | <1 KB |
| `fitur/akun-gerbang-login-dan-dialog.js` | Dialog konfirmasi bermerek dan gerbang login | `showConfirm` | 3 KB |
| `fitur/akun-login-firebase.js` | Login dan akun (Firebase), sinkron cloud | `_docRef`, `_setSyncStatus`, `_blobColl` | 69 KB |
| `fitur/akun-login-google.js` | Login dengan Google | `pbDecodeJwt`, `pbShowApp`, `_pbDoLogout` | 13 KB |
| `fitur/akun-paket-kuota-bayar.js` | Paket (tier), kuota harian, upgrade dan pembayaran, enkripsi API key | `pbGetTier`, `pbGetQuota`, `pbTodayStr` | 27 KB |
| `fitur/akun-statistik-admin.js` | Statistik biaya dan cache (hanya admin) | `_check` | <1 KB |

### Model AI dan layar tunggu Generate

| File | Isi | Kata kunci (nama fungsi / konstanta) | Ukuran |
|---|---|---|---|
| `fitur/ai-model-dan-koneksi.js` | Pilihan model AI dan koneksi ke server AI (token, admin) | `PB_AI_MODELS`, `PB_OAI_PROVIDERS`, `PB_DEFAULT_USER_MODEL`, `PB_ADMIN_EMAILS` | 24 KB |
| `fitur/generate-layar-tunggu.js` | Layar tunggu saat Generate: animasi, kotak skrip real-time, pengaman generate | `_vbGuardGenerating`, `_vbHeartbeat`, `vaiDoneCard` | 65 KB |

### Umum (dipakai semua fitur)

| File | Isi | Kata kunci (nama fungsi / konstanta) | Ukuran |
|---|---|---|---|
| `fitur/umum-aksesibilitas-keyboard.js` | Chip dan kartu bisa difokus dan ditekan lewat keyboard | `patchAll` | 2 KB |
| `fitur/umum-alat-bantu.js` | Pintasan keyboard, urungkan chip, klik cepat chip, simpan teks "isi sendiri", `switchPage` | `switchPage`, `fJumpStep`, `CHIP_UNDO_STACK`, `openApiKeyModal` | 24 KB |
| `fitur/umum-boot-reload.js` | Deteksi refresh sungguhan (paling awal) | — | 3 KB |
| `fitur/umum-dock-bawah.js` | Posisi dock tombol di bawah layar | `sync` | 1 KB |
| `fitur/umum-draft-otomatis.js` | Simpan draf isian otomatis dan urungkan | `captureVars`, `restoreVars`, `captureDom` | 44 KB |
| `fitur/umum-keyboard-dan-viewport.js` | Sesuaikan tampilan saat keyboard HP muncul | `setOpen`, `isTextField` | 2 KB |
| `fitur/umum-kunci-zoom.js` | Kunci zoom layar | — | 3 KB |
| `fitur/umum-mulai-app.js` | Pengaturan awal saat app selesai dimuat (**sengaja jalan paling akhir**) | — | 2 KB |
| `fitur/umum-pemulihan-tampilan-terakhir.js` | Pulihkan tampilan terakhir setelah app dimatikan Android | `snap`, `restore`, `saveAll` | 7 KB |
| `fitur/umum-scroll-dan-service-worker.js` | Matikan auto-scroll tertentu dan daftarkan service worker `sw.js` | — | 3 KB |
| `fitur/umum-splash-logo.js` | Layar pembuka (splash) dan logo | — | 5 KB |
| `fitur/umum-tarik-untuk-refresh.js` | Tarik layar ke bawah untuk refresh | `triggerRefresh`, `renderPull` | 16 KB |
| `fitur/umum-tema-dan-paket-awal.js` | Tema warna dan paket diterapkan dini supaya tidak berkedip | `apply` | 3 KB |
| `fitur/umum-tombol-lanjut-kecil.js` | Gaya tombol "Lanjut" lebih kecil | `run`, `sched` | 2 KB |

## 5. File di luar `fitur/`

| File | Isi |
|---|---|
| `index.html` | Kerangka halaman: semua tombol, teks, susunan layar, plus daftar `<script>`. **Urutan baris `<script>` = urutan jalan, jangan diurutkan ulang.** |
| `app.css` | Seluruh gaya tampilan. Urutan di dalamnya menentukan mana yang menang, jangan diurutkan ulang. |
| `outfit-studio.html` | Isi Outfit Studio (±900 KB), dimuat lewat `fetch()` lalu dipasang ke iframe. |
| `sw.js`, `manifest.json`, ikon | Service worker (hanya cache foto pratinjau `media/chN.webp`), pengaturan PWA, ikon. |
| `media/` | Foto dan video pratinjau/tur. Isi `media/index.html` adalah salinan lama, **bukan** file yang dipakai app. |
| `admin.html` | Halaman admin. |
| `beranda.html`, `faq.html`, `kontak.html`, `privacy.html`, `refund-policy.html`, `syarat-ketentuan.html`, `hapus-akun.html` | Halaman statis (landing, FAQ, kebijakan). |
| `README.md` | Ringkasan struktur dan riwayat pemecahan file. |

## 6. Catatan

- Bagian besar (mis. `video-builder-inti.js`) akan dipecah lebih halus kalau nanti terasa terlalu besar untuk dikirim.
- Antrean peleburan tambalan ada di `README.md`.

## 7. Cara memperbarui peta ini (WAJIB bagi AI yang mengubah repo)

Perbarui peta **di jawaban yang sama** dengan perubahan kodenya. Jangan ditunda.

1. **Fitur atau file baru:** tambah satu baris di tabel bagian 4 (kolom: file, isi, kata kunci, ukuran). Kalau fiturnya sering diminta, tambah juga di bagian 1. Kalau file baru dimuat `index.html`, tambahkan `<script>` di posisi yang benar dan sebut posisi itu di kolom Isi bila penting.
2. **File diganti nama, dipecah, atau dihapus:** ubah atau hapus barisnya di bagian 1, 2, 3, dan 4. Cari nama lama di seluruh peta supaya tidak ada sisa.
3. **Fungsi pindah file atau ditimpa file lain:** perbarui bagian 2 dan 3.
4. **Isi file berubah jauh** (mis. data besar dihapus, fitur dibuang, nama sudah tidak cocok): perbaiki kolom Isi dan Ukuran, lalu tulis di bagian 3 kalau namanya jadi menyesatkan.
5. **Kata kunci:** tulis nama fungsi atau konstanta yang benar-benar ada di file. Cek dengan pencarian, jangan dari ingatan.
6. **Cek akhir:** semua file di `fitur/` harus muncul tepat satu kali di bagian 4, dan tidak ada nama file di peta yang tidak ada di folder.
7. Ganti tanggal "Terakhir diperbarui" dan jumlah file di atas, lalu tambah satu baris di bagian 8.
8. Kalau ukuran peta jadi terlalu panjang, ringkas kolom Isi, jangan hapus fiturnya.

Kalau user bilang "peta belum diperbarui", kerjakan langkah di atas lebih dulu sebelum menjawab hal lain.

## 8. Riwayat perubahan peta

- **24 Nov 2026** — Ditulis ulang: tambah kolom kata kunci, tabel cari-lewat-nama-fungsi, bagian jebakan dan fungsi yang ditimpa, serta aturan pembaruan. Tambah 3 file yang belum tercatat (`video-isian-kurung.js`, `outfit-studio-album-drive.js`, `outfit-studio-album-awan.js`). Koreksi deskripsi `video-mirror-selfie.js` (kini hanya reset), `video-contoh-skrip-referensi.js` (kini ±10 KB) dan ukuran file lain.
- **25 Nov 2026** — Sinkron album Outfit Studio: tombol Hubungkan + status alasan di `outfit-studio.html` (blok v18.40, coba ulang otomatis), pembaruan token Drive lebih awal di `outfit-studio-album-drive.js`, izin Drive diminta saat `osOpen` di `outfit-studio-pembuka.js`.
- **25 Nov 2026** — Fitur baru mode "Outfit saja" (Outfit atau Outfit + Lokasi tanpa Wajah Karakter): Pose hanya 1 opsi "Outfit Check (tanpa wajah)". Tambah `fIsOutfitOnly`, `fSyncPoseOutfitOnly`, `F_POSE_OUTFIT_ONLY` di `foto-wizard-langkah.js`; gerbang Karakter Sheet di `fKonfirmRef` dikecualikan; `foto-susun-prompt.js` membuang kata "face" dari `output_quality` dan teks outfit yang merujuk Karakter Sheet. Ukuran dua file diperbarui.
