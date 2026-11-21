# Prompt Builder — struktur file

| File / folder | Isi |
|---|---|
| `index.html` | Markup + daftar `<script src>` / `<link>`. **Urutan `<script>` = urutan jalan, jangan diurutkan ulang.** |
| `app.css` | Semua blok `<style>` lama, urutan sama persis (urutan = prioritas cascade). |
| `outfit-studio.html` | Outfit Studio, dimuat lewat `fetch()` lalu dipasang ke iframe via `srcdoc`. |
| `fitur/*.js` | Kode JavaScript, satu file per fitur (nama diawali nama fitur). Lihat **PETA-FITUR.md**. |
| `PETA-FITUR.md` | Tabel "mau ubah apa → kirim file mana". |

## Riwayat
- Batch 0: satu file 4,2 MB dipecah jadi `index.html` + `app.css` + 43 skrip.
- Batch 1: `showCard()` (5 lapis patch) dilebur jadi satu fungsi.
- Batch 2: `10-main-app.js` (±25 ribu baris) dipecah per fitur jadi 25 file, file kecil diganti nama per fitur.
  Dua baris yang memakai fungsi dari bagian bawah file (blok INIT) dipindah ke `fitur/umum-mulai-app.js` yang jalan paling akhir.

## Antrean berikutnya
Melebur patch yang masih menimpa kode asli: `video-atur-mode-produk` (16 nama) · `panduan-tur-pertama-kali` (6) · `video-builder-progres-dan-tombol-bawah` (6) · `foto-pov-tangan-lewati-sudut-kamera` (5) · dan lainnya.
