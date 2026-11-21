// fitur/umum-mulai-app.js — Pengaturan awal tampilan saat app selesai dimuat: progress bar Foto/Video 0%, render riwayat dan karakter.
// Bagian dari js/10-main-app.js lama (baris 7422–7444). Isi tidak diubah.
// DIPINDAH ke akhir (dulu di tengah file) karena memanggil fungsi yang baru ada di bagian bawah (historyRender, vbUpdateProgress).
// Urutan di dalam blok ini TIDAK boleh diubah.
// INIT
// FIX A2: Progress bar init — set ke "Subjek Foto" (step 0/f0) dengan pct=0
// fSyncStepNums() tidak dipanggil saat init karena produkMode='' → default tampilan badge = 7-step
// yang benar, tapi ini hanya terjadi SETELAH user mulai isi — saat init badge tidak kelihatan
fUpdateProgress(0,'Subjek Foto');
if(typeof historyRender==='function')setTimeout(historyRender,50);
if(typeof vbUpdateProgress==='function')vbUpdateProgress(1,'Prompt Video AI');
if(typeof csRenderAll==='function')csRenderAll();
// FIX A6: progress di-set ke 0% saat init (sebelum user pilih subjek)
// fUpdateProgress(1,...) akan hitung pct=1/7=14% — kita override ke 0% karena f0 belum done
(function(){
  let fill=document.getElementById('f-progress-fill');
  if(fill)fill.style.width='0%';
})();
// FIX BUG#1 (Video): sama seperti FIX A6 di atas — vbUpdateProgress(1,...)
// akan hitung pct=1/5=20% padahal user belum isi apa-apa. Override ke 0%.
(function(){
  let vfill=document.getElementById('vb-progress-fill');
  if(vfill)vfill.style.width='0%';
})();
// Kosongkan container chip kamera yang ada chip statis di HTML
// f6-kamera-chips sudah dihapus bersama card f6

