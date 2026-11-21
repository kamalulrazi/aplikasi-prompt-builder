// js/03-autoscroll-off-sw.js — dipindah dari <script> di index.html lama (baris 187). Isi tidak diubah.
  // ── AUTO-SCROLL DIMATIKAN ATAS PERMINTAAN USER ─────────────────────
  // Sebelumnya tiap kali user mengisi satu field (lokasi, kamar, mood, dst),
  // halaman otomatis scroll ke section berikutnya lewat scrollIntoView().
  // Ini bikin pusing kalau dipakai terus-menerus. Daripada hapus satu-satu
  // ~44 titik pemanggilan scrollIntoView() yang tersebar di seluruh wizard
  // (berisiko ada yang kelewat / rusak), method bawaannya di-override di
  // sini secara global: dipanggil tetap "berhasil" tanpa error, tapi TIDAK
  // pernah benar-benar menggeser layar. Sebagai gantinya, elemen yang tadinya
  // jadi tujuan scroll diberi kilau/pulse halus sebentar (lihat class
  // .just-revealed di <style>) — jadi user tetap dapat sinyal "di sini fokus
  // berikutnya" tanpa layar ikut bergerak sendiri.
  Element.prototype.scrollIntoView = function () {
    this.classList.add('just-revealed');
    let el = this;
    setTimeout(function () { el.classList.remove('just-revealed'); }, 900);
  };

  // ── HABIT TRACKER DIHAPUS (permintaan user, Sept 2026) ──────────────
  // Fitur "Biasanya kamu: ..." (saran otomatis berdasar 50 generate
  // terakhir) sudah dicabut total dari aplikasi (fungsi habitRecord/
  // habitLoad/habitSave/habitInjectSuggest/habitShowSuggestsForStep, CSS
  // .habit-suggest*, dan key 'pb_habits_v1' di PB_SYNC_KEYS — semua sudah
  // dibuang). Baris di bawah ini cuma bersih-bersih SEKALI untuk perangkat
  // yang sudah lanjut sempat menyimpan data lama di localStorage sebelum
  // fitur ini dicabut, supaya tidak ada sisa data nganggur/ke-sync lagi.
  try{ localStorage.removeItem('pb_habits_v1'); }catch(e){}

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      // FIX (audit refresh, "app masih versi lama"): updateViaCache:'none'
      // supaya browser TIDAK pernah pakai HTTP cache saat cek apakah sw.js
      // ada versi baru — tanpa ini, pengecekan update sw.js sendiri bisa
      // "puas" dengan salinan lama kalau hosting tidak kirim header
      // no-cache yang benar, jadi versi baru app telat terdeteksi.
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(function () {
        // Diamkan kalau gagal register (mis. sw.js tidak tersedia di
        // lingkungan preview) — tidak perlu tampil sebagai warning.
      });
    });
  }
