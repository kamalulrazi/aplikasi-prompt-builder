// fitur/panduan-tur-pertama-kali.js — (dulu js/12-onboarding-tur.js) dipindah dari <script> di index.html lama (baris 33632). Isi tidak diubah.
// ============================================================
// ONBOARDING TOUR — Builder Prompt Foto
// ------------------------------------------------------------
// Tur spotlight ringan buat user pertama kali buka app. Nunjuk
// langsung ke elemen ASLI di tab Foto (bukan cuma teks di modal
// terpisah), supaya user paham posisi tiap bagian di app
// sungguhan, bukan cuma dijelasin di kotak abstrak.
//
// CARA KERJA (revisi — 8 langkah + placeholder, campuran modal & interaktif):
// - Langkah 1, 2 : modal murni di tengah layar, dilanjut manual
//   lewat tombol "Lanjut" tur.
// - Langkah 3 (install Google Flow, reveal bertahap no.1–6) : modal, lihat
//   pbGoStep3/pbRenderStep3.
// - Langkah 4 : modal, upload foto hasil Karakter Sheet dari Google
//   Flow lewat icon kamera (lihat pbGoStep4/pbStep4PhotoPicked).
//   Tombol "Lanjut" disembunyikan sampai fotonya beneran keupload.
// - Langkah 5 (Subjek Foto) & 6 (Foto Referensi) : mode INTERAKTIF.
//   Backdrop dibikin transparan + tidak menghalangi klik sama
//   sekali (lihat class .pb-passive/.pb-airy di <style>), jadi
//   kartu aslinya kelihatan FULL & bisa langsung di-tap user —
//   tombol "Lanjut" tur disembunyikan karena yang "melanjutkan"
//   di sini adalah aksi asli user di app (pilih Perempuan/
//   Laki-laki lalu konfirmasi, atau isi foto referensi lalu
//   tekan "Lanjut →" bawaan step itu). Tur baru pindah ke langkah
//   berikutnya begitu doneCard() beneran terpanggil untuk card
//   yang sedang ditunggu (lihat pbArmDoneWait / wrapper doneCard
//   di bawah).
// - Langkah 7 (Cara Tampil Produk) : dua fase. Fase pertama modal
//   biasa (tombol "Lanjut" tur) menjelaskan konsepnya; begitu
//   ditekan, baru dibuka spotlight interaktif ke card Produk
//   (sama seperti langkah 5/6) dan menunggu doneCard('f3').
// - Langkah 8 : modal biasa. Begitu tombol "Lanjut" ditekan, tur
//   BENERAN HILANG TOTAL (bukan cuma pindah step) supaya user
//   bebas mengisi sisa wizard (pose/lokasi/cahaya/dst) tanpa
//   diganggu. App di-poll tiap 400ms nunggu tombol Generate
//   Prompt (#f-gen-btn) muncul di layar.
// - Langkah 9 : begitu tombol Generate kelihatan, tur muncul lagi
//   nunjuk ke situ (mode blocking seperti tur versi lama), lalu
//   lanjut ke Langkah 10 nunjuk tombol Salin JSON.
// - Skip ("Lewati") bisa ditekan kapan saja di semua langkah dan
//   selalu langsung menutup tur total + membatalkan semua
//   penantian (doneCard/poll) yang masih aktif.
// - Selesai/skip → localStorage 'pb_tour_done'=1, tidak auto-jalan
//   lagi. Tombol di tab Panduan bisa manggil ulang manual kapan pun.
// ============================================================
// ── Gambar ilustrasi langkah 9 (dipakai step tur Google Flow) — di-base64
// supaya tetap 1 file HTML, tidak butuh folder asset terpisah. ──────────
const PB_IMG_G1='media/g1.jpg';
const PB_IMG_G2='media/g2.jpg';
const PB_IMG_G3='media/g3.jpg';
const PB_IMG_G4='media/g4.jpg';
const PB_IMG_G5='media/g5.jpg';
const PB_IMG_G6='media/g6.jpg';

const PB_TOUR_KEY='pb_tour_done';
// ── ATURAN TUR PANDUAN PEMULA (permintaan user, v6.44) ───────────────
// 1) Tur WAJIB muncul untuk akun Gmail yang belum pernah menyelesaikan /
//    melewati tur (termasuk Gmail yang baru pertama kali dipakai). Status
//    "sudah selesai" dicatat PER AKUN: isi PB_TOUR_KEY = 'v2:<email>'
//    (nilai lama '1' dianggap milik akun yang sedang login, lalu
//    di-stempel email-nya — lihat pbTourStampOwner). Jadi ganti Gmail di
//    HP/browser yang sama tetap memunculkan tur untuk Gmail barunya, dan
//    Gmail lama yang login di perangkat lain (data cloud sudah turun)
//    tidak dipaksa tur lagi.
// 2) Tur baru dianggap SELESAI di dua titik saja: tombol "Lewati"
//    (pbTourSkip) dan tombol "Selesai" terakhir Panduan Video AI
//    (vbVideoGuideFinish). pbEndTour() BUKAN penanda selesai — fungsi itu
//    juga dipakai sebagai transisi di tengah alur (pbTourFinishExt,
//    vbHookCopyLanjutClick, dst). Dulu pbEndTour() ikut menandai selesai,
//    akibatnya refresh setelah transisi itu membuat tur hilang & user
//    tiba-tiba masuk mode normal.
// 3) App di-refresh / ditutup di TENGAH tur → saat dibuka lagi tur mulai
//    dari Langkah 1 (bukan lanjut dari step terakhir, bukan hilang, dan
//    tanpa dialog tambahan) — lihat pbAutoStartTourOnLoad().
// 4) Selama status tur akun ini belum selesai, layar ditutup "tirai"
//    (html.pb-tour-curtain) dari awal load sampai tur mulai, supaya user
//    tidak sempat melihat mode normal di antara refresh dan Langkah 1.
// PB_TOUR_INPROGRESS_KEY = '1' begitu tur beneran mulai, dihapus saat
// tur selesai/di-skip. Dipakai peringatan refresh (beforeunload di
// laptop & pull-to-refresh di HP).
const PB_TOUR_INPROGRESS_KEY='pb_tour_in_progress';

// State penantian aksi nyata user (dipakai step interaktif) —
// diisi oleh pbArmDoneWait(), dibaca & dibersihkan oleh wrapper
// doneCard() di bawah.
let pbWaitDoneId=null, pbWaitDoneCb=null;
// Flag: true selama langkah 8 tur menunggu user beneran menekan tombol
// Salin JSON asli (#f-copy-btn) — dibaca & dibersihkan oleh wrapper
// fCopy() di bawah.
let pbWaitingCopyClick=false;
// Selector target yang lagi disorot sekarang (dipakai reposisi
// saat resize/scroll) — null berarti mode modal tengah.
let pbCurrentSelector=null;
// Timer polling nunggu tombol Generate muncul (langkah 6 → 7).
let pbGenPollTimer=null;
// Timer polling nunggu prompt/JSON hasil generate muncul (langkah 7 → 8).
let pbCopyPollTimer=null;
// Berapa banyak butir bernomor (no.1, no.2, dst) di Langkah 3 yang lagi
// ditampilkan sekarang — dipakai buat reveal bertahap (lihat pbRenderStep3).
let pbStep3Revealed=1;

const PB_IMG_G7='media/g7.jpg';
const PB_IMG_G8='media/g8.jpg';
const PB_IMG_G9='media/g9.jpg';
const PB_IMG_G10='media/g10.jpg';

const PB_IMG_S1='media/s1.jpg';
const PB_IMG_S2='media/s2.jpg';
const PB_IMG_S3='media/s3.jpg';
const PB_IMG_S4='media/s4.jpg';
const PB_IMG_S5='media/s5.jpg';
const PB_IMG_S6='media/s6.jpg';
const PB_IMG_S7='media/s7.jpg';
const PB_IMG_S8='media/s8.jpg';
const PB_IMG_S9='media/s9.jpg';
const PB_IMG_S10='media/s10.jpg';
const PB_IMG_FLOW_KARAKTERSHEET='media/flow-karaktersheet.jpg';
// FIX (tur: modal Karakter Sheet tidak muncul, yang tampil malah wizard
// Foto): markup #cs-modal ternyata ada DI DALAM halaman #panduan (ikut
// terbawa waktu tombol Karakter Sheet dipindah ke tab Panduan). Kelas
// .page yang tidak aktif = display:none, jadi modal position:fixed di
// dalamnya ikut tak terlihat setiap kali halaman aktif BUKAN Panduan —
// persis kondisi saat tur berjalan (tur memaksa tab Foto aktif). Modal
// dipindahkan ke <body> (sibling .app-shell, sama seperti nav & modal
// lain yang fixed) supaya tampil di halaman manapun.
(function(){
  function pbHoistCsModal(){
    var m=document.getElementById('cs-modal');
    if(m && m.parentNode!==document.body) document.body.appendChild(m);
  }
  pbHoistCsModal();
  document.addEventListener('DOMContentLoaded',pbHoistCsModal);
})();
// Isi thumbnail kecil di sisi kanan judul "Karakter Sheet" pada modal
// pembuat prompt (#cs-modal) — dieksekusi setelah dokumen selesai
// diparsing supaya elemen #cs-modal-ks-thumb sudah pasti ada.
document.addEventListener('DOMContentLoaded',function(){
  var t=document.getElementById('cs-modal-ks-thumb');
  if(t) t.src=PB_IMG_FLOW_KARAKTERSHEET;
});
const PB_IMG_FLOW_PRODUK='media/flow-produk.jpg';
const PB_IMG_FLOW_FOTOAI='media/flow-fotoai.jpg';
const PB_IMG_FLOW_VIDEOAI='media/flow-videoai.mp4';
// Video panduan Langkah 3 tur (cara cari & screenshot foto produk di TikTok).
// File-nya ada di folder media/ — tanpa suara, 1080x1920, ±17 detik.
const PB_VID_CARI_FOTO='media/cari-foto-produk-tiktok.mp4';
// Video panduan step "Foto AI" (cara bikin foto AI di Google Flow) — menggantikan
// butir 1-10 (PB_STEP6EXT_ITEMS). 1080x1920, tanpa suara, ±69 detik.
const PB_VID_FOTO_AI='media/foto-ai-google-flow.mp4';
// Video panduan tahap terakhir "Video AI" (upload Foto AI, atur Video, bikin 3 video
// Hook/Cerita Produk/CTA) — menggantikan seluruh PB_STEPVIDEOAI_ITEMS. 1080x1920, tanpa suara, ±100 detik.
const PB_VID_VIDEO_AI='media/video-ai-google-flow.mp4';
// Media pratinjau Start Frame di Mode Referensi Foto (Builder Prompt Video):
// video 288x288 (ada suara, tampil mute di thumbnail; suara dinyalakan lewat lightbox) + foto 288x288, hasil crop persegi dari file asli.
// Pakai window.* (bukan const) supaya aman diakses dari script lain yang
// dieksekusi lebih dulu (tidak kena TDZ).
window.PB_IMG_VBREF_VIDEO='media/vbref-video.mp4';
window.PB_IMG_VBREF_FOTO='media/vbref-foto.jpg';
// Media pratinjau Frame Asset (2 foto + video), persegi 288x288, hasil crop dari file asli.
window.PB_IMG_VBASET_VIDEO='media/vbaset-video.mp4';
window.PB_IMG_VBASET_FOTO2='media/vbaset-foto2.jpg';
window.PB_IMG_VBASET_FOTO1='media/vbaset-foto1.jpg';
// Media pratinjau Raw Asset (2 foto + video). Foto 1 = karakter sheet multi angle, Foto 2 = produk. Video diganti (Okt 2026) dengan video karakter promosi kulkas, file asli apa adanya (720x1280, 8 detik).
window.PB_IMG_VBKP_VIDEO='media/vbkp-video.mp4';
window.PB_IMG_VBKP_FOTO1='media/vbkp-foto1.jpg';
window.PB_IMG_VBKP_FOTO2='media/vbkp-foto2.jpg';
// Media pratinjau Mirror Selfie (1 foto + video), persegi 288x288.
window.PB_IMG_VBMS_VIDEO='media/vbms-video.mp4';
window.PB_IMG_VBMS_FOTO='media/vbms-foto.jpg';
// Media pratinjau mode tess (Okt 2026): VIDEO = hasil akhir (720x1280, 10 detik, ada suara) dipakai apa adanya tanpa kompres; FOTO = foto produk (tas hitam).
// Media pratinjau Fashion Editorial (18 Okt 2026): video saja, 720x1280, ada suara, dipakai apa adanya.
window.PB_IMG_VBFASHION_VIDEO='media/fashion-video.mp4';
// Media pratinjau uiui (Nov 2026): video 1 = Tanpa Skrip (unboxing POV), video 2 = Pakai Skrip (voice over). 720x1280, 8 detik, dipakai apa adanya.
window.PB_IMG_VBUI_TANPA='media/uiui-tanpa-skrip.mp4';
window.PB_IMG_VBUI_PAKAI='media/uiui-pakai-skrip.mp4';
window.PB_IMG_VBFASHION_FOTO='media/fashion-foto.jpg';
// Media pratinjau Percakapan 2 Suara (Nov 2026): VIDEO = hasil akhir (720x1280, 8 detik, ada suara), dipakai apa adanya. File: media/dua-video.mp4.
// Tiga foto tutorial: Foto AI (bantal alas kursi, karakter hijab), Foto Produk (bantal alas cokelat), Karakter Sheet (hijab pink).
// Kalau salah satu dikosongkan (''), lightbox menampilkan kotak kosong bergaris putus-putus.
window.PB_IMG_VBDUA_VIDEO='media/dua-video.mp4';
window.PB_IMG_VBDUA_KARAKTERSHEET='media/dua-karaktersheet.jpg';
window.PB_IMG_VBDUA_PRODUK='media/dua-produk.jpg';
window.PB_IMG_VBDUA_FOTOAI='media/dua-foto-ai.jpg';
window.PB_IMG_VBTESS_VIDEO='media/tess-video.mp4';
window.PB_IMG_VBTESS_FOTO='media/tess-foto.jpg';
// Video pratinjau Gaya "Dinamis" tess (17 Okt 2026) — dipasang ke pratinjau
// lewat vbTessPilihGaya(2)/vbTessSetPreviewVideo(), MENGGANTIKAN sementara
// video Gaya "Mewah" (PB_IMG_VBTESS_VIDEO) di atas selama Gaya itu dipilih.
// PENTING: file aslinya (Dynamic_product_video_generation_...mp4) harus
// diunggah manual ke folder media/ di server dengan nama persis di bawah ini
// — sama seperti semua file media/ lain di app ini, bukan di-embed ke HTML.
window.PB_IMG_VBTESS_VIDEO_DINAMIS='media/tess-video-dinamis.mp4';
// Video pratinjau Gaya "Estetik" tess (17 Okt 2026) — sama pola/aturannya
// dengan video Gaya Dinamis di atas: dipasang lewat vbTessPilihGaya(3), dan
// file aslinya wajib diunggah manual ke folder media/ di server dengan nama
// persis di bawah ini.
window.PB_IMG_VBTESS_VIDEO_ESTETIK='media/tess-video-estetik.mp4';
// Video pratinjau Gaya "UGC" tess (17 Okt 2026) — dipasang lewat vbTessPilihGaya(4).
// File asli wajib diunggah manual ke folder media/ di server dengan nama persis di bawah ini.
window.PB_IMG_VBTESS_VIDEO_UGC='media/tess-video-ugc.mp4';
// Media pratinjau Motion Control (Okt 2026): VIDEO = hasil akhir (Video AI, 1920x1080, 10 detik, ada suara, tanpa diperkecil),
// FOTO = Foto AI (file asli, tanpa kompres), REF = video referensi sumber gerakan (1024x576 asli, dipangkas 10 detik pertama),
// REFPOSTER = cuplikan video referensi (dipakai sebagai poster & gambar bahan di lightbox).
window.PB_IMG_VBIKUTI_VIDEO='media/vbikuti-video.mp4';
window.PB_IMG_VBIKUTI_FOTO='media/vbikuti-foto.jpg';
window.PB_IMG_VBIKUTI_REF='media/vbikuti-ref.mp4';
window.PB_IMG_VBIKUTI_REFPOSTER='media/vbikuti-refposter.jpg';

// Pemanasan media pratinjau Video Builder (Okt 2026). Sejak foto/video dipisah
// ke folder media/, tiap kali pindah mode (mis. Start Frame -> Frame Asset)
// browser baru mulai mengunduh video mode itu, jadi kotak videonya kosong
// sekitar 1 detik. Solusinya: begitu halaman Video Builder terlihat, video
// semua mode diunduh pelan-pelan di latar belakang (satu per satu), lalu
// alamat di window.PB_IMG_* diganti ke blob lokal di memori. Kode lain tidak
// perlu diubah karena selalu membaca window.PB_IMG_* saat dibutuhkan; kalau
// unduhan belum selesai/gagal, tetap jalan pakai alamat media/ biasa.
// Unduhan lewat cache HTTP browser, jadi pembukaan berikutnya hampir tanpa data.
// 25 Okt 2026: SIMPAN VIDEO PERMANEN DI BROWSER (Cache Storage). pbMediaGet(url) -> Promise<Blob>.
// Pertama kali: diunduh dari server lalu disimpan. Berikutnya (aplikasi ditutup lalu dibuka lagi): dibaca dari penyimpanan
// browser TANPA mengunduh video lagi. Setelah itu, di latar belakang, cuma 1 permintaan HEAD kecil (tanpa isi video) untuk
// mengecek apakah file di server diganti (etag / last-modified / ukuran berbeda); kalau diganti, video diunduh ulang & disimpan
// untuk pembukaan berikutnya. Butuh https (atau localhost); kalau tidak tersedia, jatuh ke unduhan biasa tiap sesi.
var PB_MEDIA_CACHE='pb-media-v1';
function pbMediaNet(url){
  return fetch(url).then(function(r){
    if(!r.ok)throw new Error('http '+r.status);
    if(/^text\//.test(r.headers.get('content-type')||''))throw new Error('bukan video');
    return r;
  });
}
function pbMediaRevalidate(cache,url,oldHeaders){
  setTimeout(function(){
    try{
      fetch(url,{method:'HEAD',cache:'no-cache'}).then(function(h){
        if(!h.ok)return;
        var changed=false,decided=false;
        ['content-length','last-modified','etag'].forEach(function(n){
          if(decided)return;
          var a=oldHeaders.get(n),b=h.headers.get(n);
          if(a&&b){decided=true;changed=(a!==b);}
        });
        if(changed)pbMediaNet(url).then(function(r){return cache.put(url,r);}).catch(function(){});
      }).catch(function(){});
    }catch(e){}
  },3000);
}
function pbMediaTyped(b){return (b&&!b.type)?new Blob([b],{type:'video/mp4'}):b;}
function pbMediaGet(url){
  var direct=function(){return pbMediaNet(url).then(function(r){return r.blob().then(pbMediaTyped);});};
  if(!(window.caches&&window.isSecureContext))return direct();
  return caches.open(PB_MEDIA_CACHE).then(function(cache){
    return cache.match(url).then(function(hit){
      if(hit){pbMediaRevalidate(cache,url,hit.headers);return hit.blob().then(pbMediaTyped);}
      return pbMediaNet(url).then(function(r){
        return cache.put(url,r.clone()).catch(function(){}).then(function(){return r.blob().then(pbMediaTyped);});
      });
    });
  }).catch(function(){return direct();});
}
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){} // minta browser jangan menghapus penyimpanan ini saat memori penuh
(function(){
  var VID_KEYS=['PB_IMG_VBASET_VIDEO','PB_IMG_VBMS_VIDEO','PB_IMG_VBTESS_VIDEO','PB_IMG_VBTESS_VIDEO_DINAMIS','PB_IMG_VBTESS_VIDEO_ESTETIK','PB_IMG_VBTESS_VIDEO_UGC','PB_IMG_VBKP_VIDEO','PB_IMG_VBREF_VIDEO','PB_IMG_VBIKUTI_VIDEO','PB_IMG_VBIKUTI_REF','PB_IMG_VBUI_TANPA','PB_IMG_VBUI_PAKAI','PB_IMG_VBDUA_VIDEO'];
  var PHOTO_KEYS=['PB_IMG_VBREF_FOTO','PB_IMG_VBASET_FOTO1','PB_IMG_VBASET_FOTO2','PB_IMG_VBMS_FOTO','PB_IMG_VBTESS_FOTO','PB_IMG_VBFASHION_FOTO','PB_IMG_VBKP_FOTO1','PB_IMG_VBKP_FOTO2','PB_IMG_VBIKUTI_FOTO','PB_IMG_VBIKUTI_REFPOSTER','PB_IMG_VBDUA_FOTOAI','PB_IMG_VBDUA_PRODUK','PB_IMG_VBDUA_KARAKTERSHEET'];
  var started=false;
  function warmPhotos(){
    PHOTO_KEYS.forEach(function(k){
      try{ var u=window[k]; if(u){ var im=new Image(); im.decoding='async'; im.src=u; } }catch(e){}
    });
  }
  function warmVideo(i){
    if(i>=VID_KEYS.length) return;
    var k=VID_KEYS[i], u=window[k];
    if(!u || String(u).indexOf('blob:')===0 || !window.fetch || !window.URL || !URL.createObjectURL){
      warmVideo(i+1); return;
    }
    (typeof pbMediaGet==='function'?pbMediaGet(u):fetch(u).then(function(r){ if(!r.ok) throw new Error('http '+r.status); return r.blob(); }))
      .then(function(b){ window[k]=URL.createObjectURL(b); })
      .catch(function(){})
      .then(function(){ setTimeout(function(){ warmVideo(i+1); },300); });
  }
  function start(){
    if(started) return; started=true;
    setTimeout(function(){ warmPhotos(); warmVideo(0); },800);
  }
  function init(){
    // 25 Okt 2026: mulai begitu aplikasi dibuka (tidak lagi menunggu halaman Video Builder terlihat). Dilewati kalau Data Saver / 2G.
    try{ var c=navigator.connection; if(c&&(c.saveData||/(^|-)2g$/.test(c.effectiveType||''))) return; }catch(e){}
    setTimeout(start,2500);
  }
  if(document.readyState==='complete') init();
  else window.addEventListener('load',init);
})();

// ── STATUS TUR PER AKUN (lihat "ATURAN TUR" di atas) ─────────────────
function pbTourCurrentEmail(){
  try{
    var u=JSON.parse(localStorage.getItem('pb_auth_user')||'null');
    return (u&&u.email)?String(u.email).toLowerCase():'';
  }catch(e){ return ''; }
}
// true kalau akun yang SEDANG login sudah menyelesaikan/melewati tur.
// Kalau storage error → dianggap sudah (jangan paksa tur di kondisi aneh).
function pbTourDoneForCurrentUser(){
  try{
    var v=localStorage.getItem(PB_TOUR_KEY);
    if(!v) return false;
    if(v.indexOf('v2:')===0){
      var cur=pbTourCurrentEmail();
      return !cur || v.slice(3)===cur;
    }
    return true; // '1' (nilai lama / hasil tarik cloud) = milik akun yang login
  }catch(e){ return true; }
}
// Nilai lama '1' → beri stempel email akun yang sedang login, supaya kalau
// nanti Gmail LAIN login di perangkat yang sama, tur muncul untuk Gmail itu.
function pbTourStampOwner(){
  try{
    var v=localStorage.getItem(PB_TOUR_KEY), cur=pbTourCurrentEmail();
    if(v && cur && v.indexOf('v2:')!==0) localStorage.setItem(PB_TOUR_KEY,'v2:'+cur);
  }catch(e){}
}
function pbShouldAutoStart(){
  return !pbTourDoneForCurrentUser();
}
// Sudah login TAPI tur akun ini belum selesai (= tur wajib untuk akun ini).
function pbTourIsPending(){
  return !!pbTourCurrentEmail() && !pbTourDoneForCurrentUser();
}
// Tur benar-benar sedang berjalan (sudah dimulai, belum Selesai/Lewati).
function pbTourIsRunning(){
  try{ return localStorage.getItem(PB_TOUR_INPROGRESS_KEY)==='1' && !pbTourDoneForCurrentUser(); }
  catch(e){ return false; }
}
// Dipanggil HANYA dari titik selesai sungguhan: pbTourSkip() & vbVideoGuideFinish().
function pbMarkTourDone(){
  try{
    var cur=pbTourCurrentEmail();
    localStorage.setItem(PB_TOUR_KEY, cur?('v2:'+cur):'1');
    localStorage.removeItem(PB_TOUR_INPROGRESS_KEY);
    if(typeof pbCloudQueue==='function')pbCloudQueue(PB_TOUR_KEY);
  }catch(e){}
}
// Ditandai '1' begitu tur beneran mulai (dipakai peringatan refresh).
function pbMarkTourInProgress(){
  try{ localStorage.setItem(PB_TOUR_INPROGRESS_KEY,'1'); }catch(e){}
}
// ── TIRAI TUR: layar solid (lihat CSS html.pb-tour-curtain) yang menutup
// app selama status tur belum diputuskan. Kunci pasangannya: script kecil di
// dekat login gate (untuk sesi tersimpan, dipasang SEBELUM layar pertama
// digambar) dan pbTourHoldCurtain() ini (untuk login baru). Ada jaring
// pengaman 10 detik supaya app tidak pernah nyangkut tertutup kalau ada
// yang gagal jalan.
function pbTourHoldCurtain(){
  document.documentElement.classList.add('pb-tour-curtain');
  setTimeout(pbTourReleaseCurtain,10000);
}
function pbTourReleaseCurtain(){
  document.documentElement.classList.remove('pb-tour-curtain');
}
// Jalankan cb sekali begitu ada akun yang login (langsung kalau sudah).
// Login baru ditandai gerbang login (#login-gate) berganti class 'hidden'.
function pbTourWhenLoggedIn(cb){
  var done=false, obs=null, iv=null;
  function fire(){
    if(done || !pbTourCurrentEmail()) return;
    done=true;
    try{ if(obs) obs.disconnect(); }catch(e){}
    clearInterval(iv);
    cb();
  }
  try{
    var g=document.getElementById('login-gate');
    if(g && window.MutationObserver){
      obs=new MutationObserver(fire);
      obs.observe(g,{attributes:true,attributeFilter:['class']});
    }
  }catch(e){}
  iv=setInterval(fire,500); // jaring pengaman kalau observer tidak jalan
  fire();
}

// ── Wrapper doneCard(): dipasang SEKALI di sini, membungkus fungsi
// doneCard asli (dipakai di seluruh wizard Foto & Video). Kalau lagi
// ada step tur yang menunggu id tertentu (pbWaitDoneId), begitu
// doneCard beneran terpanggil dengan id yang sama, tur lanjut
// otomatis ke step berikutnya. Di luar itu (dipakai user biasa tanpa
// tur aktif, atau id yang tidak cocok) perilaku doneCard TIDAK
// berubah sama sekali. ──────────────────────────────────────────
(function(){
  let _pbOrigDoneCard=doneCard;
  doneCard=function(id,ansId,text){
    // Return value doneCard asli (true = step ini barusan hasil EDIT, dipakai
    // vbAdvanceStep) WAJIB diteruskan — kalau tidak, wrapper ini menelannya
    // jadi undefined dan fix "step tertumpuk" tidak pernah aktif.
    let _pbDoneRet=_pbOrigDoneCard(id,ansId,text);
    if(pbWaitDoneId && id===pbWaitDoneId){
      let waitId=pbWaitDoneId;
      // Beberapa alur (mis. fKonfirmRef utk f1) MEMANGGIL doneCard(id) DULU
      // baru VALIDASI SETELAHNYA — kalau validasi gagal (mis. nama produk
      // belum diisi), kode aslinya me-revert card itu balik (buang class
      // 'done', munculkan lagi UI-nya) di baris-baris setelah doneCard()
      // dipanggil, tapi masih dalam pemanggilan fungsi yang sama (synchronous).
      // Makanya di sini TIDAK langsung lanjut ke step tur berikutnya — ditunda
      // dulu lewat setTimeout (menunggu sisa kode sinkron itu selesai jalan),
      // baru dicek apakah card-nya BENERAN masih 'done'. Kalau ternyata sudah
      // di-revert, jangan lanjut — biarkan wait tetap terpasang (pbWaitDoneId
      // TIDAK dibersihkan) supaya tur otomatis lanjut nanti begitu user
      // benar-benar menuntaskan validasi & doneCard(id) terpanggil ulang
      // dengan sukses. (Dilaporkan: tur sempat lanjut ke langkah 5 padahal
      // toast error "isi nama produk" masih muncul & card f1 masih terbuka.)
      setTimeout(function(){
        if(pbWaitDoneId!==waitId) return; // sudah dibersihkan/diganti step lain
        let el=document.getElementById(id);
        if(el && !el.classList.contains('done')) return; // divalidasi gagal, jangan lanjut
        let cb=pbWaitDoneCb;
        pbWaitDoneId=null;pbWaitDoneCb=null;
        if(cb) cb();
      },80);
    }
    return _pbDoneRet;
  };
})();
function pbArmDoneWait(id,cb){ pbWaitDoneId=id; pbWaitDoneCb=cb; }
function pbDisarmDoneWait(){ pbWaitDoneId=null; pbWaitDoneCb=null; }

// ── Wrapper fCopy(): dipasang sama seperti wrapper doneCard() di atas.
// Kalau langkah 9 tur lagi menunggu (pbWaitingCopyClick), begitu user
// beneran menekan tombol "Salin JSON" asli (#f-copy-btn, onclick="fCopy()"),
// tur otomatis SELESAI (panduan Google Flow sudah ditunjukkan lebih awal
// di langkah 3, jadi tidak perlu diulang lagi di sini). Di luar itu (user
// salin tanpa tur aktif) perilaku fCopy TIDAK berubah sama sekali. ────
(function(){
  let _pbOrigFCopy=fCopy;
  fCopy=function(){
    _pbOrigFCopy.apply(this,arguments);
    if(pbWaitingCopyClick){
      pbWaitingCopyClick=false;
      setTimeout(function(){ pbEndTour(); },250);
    }
    // FITUR BARU (permintaan user): badge "sedang membuat prompt" (kalau
    // masih kelihatan sejak Langkah 5) dilepas begitu user beneran
    // menekan "Salin JSON" — prompt-nya sudah jadi & sudah disalin, jadi
    // status "sedang membuat" ini sudah tidak relevan lagi.
    let f0ProcessBadge=document.getElementById('f0-tour-process-badge');
    if(f0ProcessBadge) f0ProcessBadge.style.display='none';
    // FITUR BARU (permintaan user): kalau hasil prompt yang baru disalin
    // ini datang dari generate selama sesi tur (pbTourAfterGenActive),
    // tampilkan notifikasi "simpan baik-baik prompt-nya" sesudah salin.
    if(typeof pbTourAfterGenActive!=='undefined' && pbTourAfterGenActive){
      pbTourAfterGenActive=false;
      setTimeout(function(){ pbShowSaveJsonNotif(); },300);
    }
  };
})();

function pbTourEl(sel){ return sel?document.querySelector(sel):null; }

// ── Paksa link tur (langkah 9 — Google Flow) kebuka di Chrome ASLI,
// bukan Custom Tab/overlay mini yang otomatis dipakai Android saat app
// ini dijalankan sebagai PWA (Add to Home Screen). Caranya lewat Android
// intent:// URI dengan package Chrome eksplisit. Di Android, ini
// mem-bypass overlay & langsung buka app Chrome penuh. Di iOS/desktop
// (bukan Android), fallback ke <a href> normal seperti biasa. ──────
function pbOpenInChrome(e,url){
  if(/Android/i.test(navigator.userAgent)){
    e.preventDefault();
    let scheme=url.indexOf('https')===0?'https':'http';
    let stripped=url.replace(/^https?:\/\//,'');
    // FIX (bug: link "Install Google Flow" tidak bisa dibuka): URI
    // intent:// sebelumnya TIDAK punya S.browser_fallback_url, jadi kalau
    // Android gagal me-resolve intent ini (mis. Chrome dinonaktifkan/
    // bukan default, atau app sedang jalan di dalam WebView/Custom Tab
    // yang menolak skema intent:// sama sekali — sering terjadi saat app
    // dibuka sebagai PWA ter-install), navigasinya jadi NO-OP DIAM-DIAM:
    // tidak ada error, tapi juga tidak terjadi apa-apa saat link ditekan.
    // Dua lapis perbaikan di bawah:
    //  1) S.browser_fallback_url di URI intent-nya sendiri — ini jalur
    //     resmi Android: kalau app dengan package yang diminta tidak bisa
    //     dibuka, sistem otomatis alihkan ke URL fallback ini.
    //  2) Timer jaga-jaga tambahan: beberapa WebView bahkan menolak MENTAH
    //     skema intent:// (bukan cuma gagal resolve app-nya), jadi baris
    //     (1) di atas juga tidak sempat jalan. Kalau setelah dicoba
    //     halaman ternyata TIDAK berpindah/hilang fokus (tab lain tidak
    //     kebuka, PWA masih di layar yang sama), kita paksa buka url biasa
    //     lewat window.open sebagai jaring pengaman terakhir.
    let fallback=encodeURIComponent(url);
    let intentUrl='intent://'+stripped+'#Intent;scheme='+scheme+';package=com.android.chrome;S.browser_fallback_url='+fallback+';end';
    let openedAt=Date.now();
    function clearFallback(){
      clearTimeout(fallbackTimer);
      document.removeEventListener('visibilitychange',onVis);
    }
    function onVis(){ if(document.hidden) clearFallback(); }
    var fallbackTimer=setTimeout(function(){
      if(!document.hidden && Date.now()-openedAt<1600){
        window.open(url,'_blank');
      }
      clearFallback();
    },900);
    document.addEventListener('visibilitychange',onVis);
    // FIX (permintaan user): dialog bawaan browser "Konfirmasi Navigasi /
    // Perubahan yang Anda lakukan mungkin tidak disimpan" muncul tiap link
    // Play Store ditekan, karena window.location.href=intent://... dianggap
    // browser sebagai navigasi keluar halaman (beforeunload, dipasang untuk
    // tur aktif). Ini bukan reload/tutup tab beneran — cuma buka app Chrome —
    // jadi peringatannya dilewati sebentar saja lalu dikembalikan seperti
    // semula supaya proteksi refresh (F5/pull-to-refresh) tetap jalan.
    var prevSkip=window._pbSkipUnloadWarn;
    window._pbSkipUnloadWarn=true;
    setTimeout(function(){ window._pbSkipUnloadWarn=prevSkip; },2500);
    try{
      window.location.href=intentUrl;
    }catch(err){
      clearFallback();
      window.open(url,'_blank');
    }
    return false;
  }
  return true; // non-Android: biarkan <a> jalan normal
}

// FIX (permintaan user): teks "Langkah n dari 10" dihapus total, diganti
// bar progres bintang (#pb-tour-progress, lihat pbTourProgressShow/Hide
// di bawah). Parameter n DIBIARKAN (banyak pemanggil lama masih mengirim
// nomor step) supaya tidak perlu mengubah semua call site — cukup tidak
// dipakai lagi di sini. Elemen eyebrow dikosongkan total supaya otomatis
// hilang lewat CSS ".pb-tour-eyebrow:empty".
function pbSetLabel(n){ document.getElementById('pb-tour-step-label').textContent=''; }

// ── BAR PROGRES BINTANG — lihat komentar panjang di CSS #pb-tour-progress
// & HTML-nya. idx: 0=Karakter Sheet, 1=Prompt (Foto AI), 2=Foto AI,
// 3=Prompt (Video AI), 4=Video AI. Titik sebelum idx ditandai "selesai"
// (pb-done, belah ketupat terisi warna aksen tapi tanpa glow), titik idx
// ditandai "aktif" (menyala terang + glow), titik sesudahnya dibiarkan
// redup default (tanpa class tambahan). ────────────────────────────────
var PB_TOUR_STAR_STAGE=-1;
// Ukur tinggi bar bintang → simpan ke --pb-tour-bar-h (dipakai CSS untuk
// mendorong app & kartu tur ke bawah bar). Dipanggil ulang tiap tinggi bar
// berubah (font Hanken Grotesk selesai dimuat, label "Karakter Sheet" turun baris,
// layar diputar), supaya app tidak pernah tertutup bar lagi.
function pbTourBarMeasure(){
  var el=document.getElementById('pb-tour-progress');
  if(!el||!el.classList.contains('show')) return;
  document.documentElement.style.setProperty('--pb-tour-bar-h',el.offsetHeight+'px');
}
var _pbTourBarWatched=false;
function pbTourBarWatch(el){
  if(_pbTourBarWatched) return;
  _pbTourBarWatched=true;
  try{
    if(window.ResizeObserver){ new ResizeObserver(pbTourBarMeasure).observe(el); }
  }catch(e){}
  window.addEventListener('resize',pbTourBarMeasure);
  window.addEventListener('orientationchange',pbTourBarMeasure);
  try{ if(document.fonts&&document.fonts.ready) document.fonts.ready.then(pbTourBarMeasure); }catch(e){}
}
function pbTourProgressShow(activeIdx){
  PB_TOUR_STAR_STAGE=activeIdx;
  let el=document.getElementById('pb-tour-progress');
  if(!el) return;
  // FITUR DIHAPUS (permintaan user, 6 Nov 2026): bar bintang paling atas
  // (Karakter Sheet → Prompt → Foto AI → Prompt → Video AI) sengaja TIDAK
  // lagi ditampilkan. class 'show' tidak dipasang lagi → #pb-tour-progress
  // tetap display:none (default CSS-nya di bawah #pb-tour-progress{...}).
  // class 'pb-tour-bar-on' juga tidak dipasang lagi di body, supaya app
  // TIDAK didorong ke bawah lagi buat ruang bar yang sudah tidak tampil
  // (lihat body.pb-tour-bar-on di CSS — itu yang dulu mendorong app turun
  // setinggi bar). Fungsi ini sendiri TETAP ADA (tidak dihapus) karena
  // masih dipanggil di banyak tempat sepanjang tur untuk hal lain di luar
  // bar ini: menandai 'pb-tour-active' & menyembunyikan nav bawah.
  document.body.classList.add('pb-tour-active');
  pbTourBarMeasure();
  requestAnimationFrame(pbTourBarMeasure);
  pbTourBarWatch(el);
  // FIX (permintaan user): selama tur masih jalan (bar bintang tampil),
  // nav bawah (Builder Prompt Foto/Video, Riwayat, Panduan) WAJIB tetap
  // tersembunyi — termasuk di rentang setelah pbEndTour() dipakai sebagai
  // transisi internal (mis. akhir wizard Foto → lanjut ke Foto AI).
  let _navEl=document.querySelector('.nav');
  if(_navEl) _navEl.classList.add('pb-tour-navhide');
  let nodes=el.querySelectorAll('.pb-tour-progress-node');
  nodes.forEach(function(node){
    let idx=parseInt(node.getAttribute('data-idx'),10);
    node.classList.toggle('active',idx===activeIdx);
    node.classList.toggle('pb-done',idx<activeIdx);
  });
}
// Cuma dipanggil saat tur BENERAN dimulai dari awal (pbStartTour) atau
// di-skip lewat tombol "Lewati" — SENGAJA TIDAK dipanggil dari pbEndTour()
// generik, karena pbEndTour() di app ini juga dipakai buat transisi
// internal di tengah alur (mis. pbStep7VideoDone(), pbTourFinishExt())
// yang TETAP butuh bar ini tampil lanjut ke step-step sesudahnya.
function pbTourProgressHide(){
  PB_TOUR_STAR_STAGE=-1;
  let el=document.getElementById('pb-tour-progress');
  if(el) el.classList.remove('show');
  document.body.classList.remove('pb-tour-bar-on');
  document.documentElement.style.setProperty('--pb-tour-bar-h','0px');
}
function pbGlowTitle(el){
  el=el||document.getElementById('pb-tour-title'); if(!el||!el.textContent) return;
  el.classList.remove('pb-glow','pb-glow-long'); void el.offsetWidth; // ulang animasi tiap tampil
  el.classList.add('pb-glow'); if(el.textContent.length>28) el.classList.add('pb-glow-long');
}
function pbSetText(title,desc){
  document.getElementById('pb-tour-title').classList.remove('pb-glow','pb-glow-long');
  if(typeof pbStep2bVidStop==='function') pbStep2bVidStop(); // video Langkah 3 jangan nyangkut jalan saat kartu ganti isi
  document.getElementById('pb-tour-title').textContent=title;
  document.getElementById('pb-tour-title').style.textAlign=''; // reset; kartu "Alur pembuatan" mengaturnya sendiri (rata tengah)
  // innerHTML (bukan textContent) supaya desc bisa berisi link <a> yang
  // beneran bisa diklik (dipakai langkah 9 — link Google Flow). Semua
  // teks desc di tur ini teks statis yang ditulis developer, bukan input
  // user, jadi aman dipakai sebagai HTML.
  document.getElementById('pb-tour-desc').innerHTML=desc;
}
// passive=true → backdrop transparan & tidak menghalangi klik (step
// interaktif); passive=false → backdrop gelap & blocking seperti tur
// versi lama (step modal / step penutup).
function pbSetPassive(passive){
  // FIX BUG "TUR TERCAMPUR" (dilaporkan user, screenshot: judul step
  // tur melayang transparan di atas layar app asli — header/progress
  // bar asli ikut kelihatan menimpa teks tur). AKAR MASALAHNYA: dulu
  // fungsi ini cuma toggle class 'pb-passive', TIDAK PERNAH memasang
  // class 'show' ke #pb-tour-backdrop. Beberapa langkah (pbGoStep5,
  // pbGoStep7VideoOpen, pbGoStep2bCamera) sengaja MELEPAS TOTAL class
  // 'show' backdrop (bukan cuma pasang 'pb-passive') supaya layar
  // wizard asli kelihatan penuh selama step interaktif. Begitu tur lanjut
  // ke step HALAMAN PENUH berikutnya lewat pbShowModal()→pbSetPassive(false),
  // backdrop TETAP tanpa 'show' (opacity 0) karena tidak ada yang
  // memasangnya lagi — kartu tur (#pb-tour-card, background:transparent)
  // pun tampil tembus pandang menimpa layar asli. Sekarang 'show' SELALU
  // dipasang di sini (dipanggil dari pbShowModal() & pbShowInteractive()
  // di setiap render step), jadi status backdrop tidak pernah lagi
  // bergantung ingat/lupa tiap fungsi pbGoStepN masing-masing.
  let bd=document.getElementById('pb-tour-backdrop');
  bd.classList.add('show');
  bd.classList.toggle('pb-passive',passive);
  document.getElementById('pb-tour-spot').classList.toggle('pb-airy',passive);
}

// Menyiapkan "cangkang" tampilan tur (blur/backdrop, sembunyikan nav
// bawah, pastikan tab Foto aktif, hentikan timer polling lama) — dipisah
// dari pbStartTour() supaya bisa dipakai ulang oleh pbResumeTourFromSavedStep()
// (resume ke step terakhir) TANPA ikut memanggil pbGoStep1().
function pbPrepTourUiShell(){
  let fotoBtn=document.querySelector('.nav .ntab');
  let fotoPage=document.getElementById('foto');
  if(fotoPage && !fotoPage.classList.contains('active') && fotoBtn){
    switchPage('foto',fotoBtn);
  }
  let shell=document.getElementById('app-shell');
  if(shell) shell.scrollTop=0;
  pbDisarmDoneWait();
  clearInterval(pbGenPollTimer);pbGenPollTimer=null;
  clearInterval(pbCopyPollTimer);pbCopyPollTimer=null;
  document.getElementById('pb-tour-backdrop').classList.add('show');
  document.body.classList.add('pb-tour-active');
  let navEl=document.querySelector('.nav');
  if(navEl) navEl.classList.add('pb-tour-navhide');
  return shell;
}

function pbStartTour(force){
  if(!force && !pbShouldAutoStart()) return;
  pbMarkTourInProgress();
  pbClearSavedTourStep();
  // FITUR BARU (permintaan user): pastikan bar progres bintang mulai dari
  // kondisi tersembunyi tiap kali tur benar-benar dimulai dari awal
  // (termasuk replay lewat "Lihat Tur Panduan Lagi") — baru dinyalakan
  // lagi begitu user mencapai titik Karakter Sheet (pbOpenCharacterSheetFromTour).
  pbTourProgressHide();
  document.body.classList.remove('pb-tour-single-produk');
  let shell=pbPrepTourUiShell();
  setTimeout(function(){ pbGoStep1(); },shell?120:0);
}

// FIX (tur ulang melompati Karakter Sheet): state tur — terutama 3 flag
// foto (produk / karakter sheet / foto AI) — SEBELUMNYA tidak pernah
// direset saat tur diulang. Padahal pbGoStep2Next() memilih langkah
// berikutnya dari flag itu: kalau produk & karakter sheet sudah "true"
// dari putaran tur pertama, tombol Lanjut di Langkah 2 langsung loncat
// ke pbGoStep5() (prompt Foto AI) dan modal Karakter Sheet tidak pernah
// dibuka. Fungsi ini mengembalikan semua state tur ke kondisi user baru.
// Namanya SENGAJA tanpa kata "Step"/"Render" supaya tidak ikut dibungkus
// sistem undo (lihat PB_UNDO_STEP_FN_REGEX).
function pbResetTourFlow(){
  pbProdukFotoUploaded=false; pbProdukFotoDataUrl=null;
  pbKsFotoUploaded=false;     pbKsFotoDataUrl=null;
  pbFotoAiUploaded=false;     pbFotoAiDataUrl=null;
  pbStep3Revealed=1;
  pbStep6ExtIndex=0;
  pbTourStep56Active=false; pbTourExtActive=false; pbTourAfterGenActive=false;
  pbTourF1Active=false;     pbTourOutfitHintShown=false;
}
// Dipanggil tombol "Lihat Tur Panduan Lagi" (tab Panduan). Tur butuh
// wizard Foto & Video yang bersih (kalau sisa isian tur/pekerjaan lama
// masih ada, kartu Subjek Foto sudah "selesai & tersembunyi" sehingga tur
// menunggu klik yang tidak pernah bisa terjadi), jadi ada konfirmasi dulu
// kalau memang ada isian yang akan terhapus.
function pbReplayTour(){
  function mulai(){
    pbResetTourFlow();
    if(typeof fResetNow==='function') fResetNow();
    if(typeof vbResetNow==='function') vbResetNow();
    pbStartTour(true);
  }
  let adaProgres=false;
  try{ adaProgres = typeof window.pbHasUnsavedProgress==='function' && !!window.pbHasUnsavedProgress(); }catch(e){}
  // Jaring pengaman: pbHasUnsavedProgress() baru true setelah snapshot undo
  // (debounce ~450ms) tercatat. Cek juga langsung ke UI — kalau ada kartu
  // wizard Foto/Video yang sudah selesai diisi, isian itu pasti akan
  // terhapus, jadi konfirmasi tetap harus muncul.
  try{ if(!adaProgres && document.querySelector('#foto .wcard.done, #video .wcard.done')) adaProgres=true; }catch(e){}
  if(adaProgres && typeof pbAskConfirm==='function'){
    pbAskConfirm('Tur akan mengosongkan isian Foto & Video yang sedang ada supaya bisa berjalan dari awal. Lanjutkan?','Ya, Mulai Tur',mulai,null);
  } else {
    mulai();
  }
}

// FITUR BARU (permintaan user): mencatat step tur mana yang TERAKHIR
// benar-benar ditampilkan, disimpan TERPISAH dari draft wizard (DRAFT_KEY)
// supaya tetap selamat walau draft wizard di-reset lewat clearDraft() saat
// reload sengaja (lihat isReloadNavigation() di script lain). Dipanggil di
// baris pertama tiap fungsi pbGoStepX utama tur (lihat masing-masing
// fungsinya) — BUKAN dipanggil dari sub-langkah yang cuma menunggu aksi
// user (klik Salin/Generate dll, state-nya memang sengaja tidak dilacak
// karena bergantung data sementara yang juga tidak ikut tersimpan, mis.
// foto yang baru diupload).
const PB_TOUR_STEP_KEY='pb_tour_last_step';
function pbSaveTourStepState(fnName){
  try{ localStorage.setItem(PB_TOUR_STEP_KEY, JSON.stringify({fn:fnName})); }catch(e){}
}
function pbClearSavedTourStep(){
  try{ localStorage.removeItem(PB_TOUR_STEP_KEY); }catch(e){}
}
// FIX BUG #4 (sisi desktop, ditemukan saat audit — belum sempat diperbaiki
// sebelumnya): step tur yang AMAN dilanjutkan lewat pbResumeTourFromSavedStep()
// KHUSUS di jalur reload beneran (F5/Ctrl+R di laptop, lihat pemanggilnya di
// pbAutoStartTourOnLoad). Step 1 & 2 cuma menampilkan kartu pembuka & ringkasan
// alur — Step 2 malah MEMBACA ULANG flag pbProdukFotoUploaded/pbKsFotoUploaded/
// pbFotoAiUploaded setiap kali dirender, jadi otomatis tetap benar walau
// flag-flag itu baru saja direset ke false. Step-step SETELAHNYA (2b dst)
// mengandaikan flag itu SUDAH true dari langkah sebelumnya (baru "boleh"
// tampil kalau user memang sudah sampai situ) — begitu wizard dipaksa reset,
// asumsi itu tidak valid lagi, dan overlay tur yang tetap nongol di step
// tsb bakal terasa nyasar karena tampilan di baliknya (kartu alur,
// thumbnail dll) sudah balik kosong/Step 1.
const PB_TOUR_STEPS_SAFE_POST_RELOAD={pbGoStep1:1,pbGoStep2:1};
// Lanjutkan tur persis dari step terakhir yang tercatat (dipakai saat app
// dibuka lagi setelah ditutup total, ATAU saat user memilih "Tidak" pada
// peringatan refresh-di-tengah-tur). Kalau tidak ada step tersimpan/fungsi
// step-nya sudah tidak ada, fallback aman: mulai dari awal.
// Parameter afterRealReload (opsional, default false/kosong): isi `true`
// KHUSUS kalau pemanggilnya tahu pasti wizard baru saja dipaksa reset oleh
// reload beneran (lihat isReloadNavigation() di script IIFE undo/redo —
// SELALU clearDraft() tanpa pengecualian tiap reload, dan jalan lebih dulu/
// lebih cepat [window.load+500ms] daripada confirm tur di sini yang baru
// muncul setelah jeda 3.7 detik+). Kalau true DAN step tersimpan bukan
// salah satu yang "aman" di atas, jangan paksa lanjut ke step lama itu —
// mulai ulang tur dari awal supaya tur & tampilan wizard selalu sinkron.
// Saat afterRealReload kosong (jalur app dibuka lagi, BUKAN reload), draft
// & flag foto memang berhasil dipulihkan utuh lewat tryRestoreDraft() —
// resume ke step manapun tetap aman di jalur itu, tidak perlu dibatasi.
// CATATAN v6.44: fungsi ini TIDAK DIPANGGIL LAGI. Sesuai aturan tur baru,
// refresh/buka ulang di tengah tur selalu mulai dari Langkah 1 (lihat
// pbAutoStartTourOnLoad). Dibiarkan ada supaya diff kecil & mudah dilacak.
function pbResumeTourFromSavedStep(afterRealReload){
  let saved=null;
  try{
    let raw=localStorage.getItem(PB_TOUR_STEP_KEY);
    if(raw) saved=JSON.parse(raw);
  }catch(e){}
  if(!saved || !saved.fn || typeof window[saved.fn]!=='function'){
    pbStartTour(true);
    return;
  }
  if(afterRealReload && !PB_TOUR_STEPS_SAFE_POST_RELOAD[saved.fn]){
    pbStartTour(true);
    return;
  }
  pbMarkTourInProgress();
  pbPrepTourUiShell();
  try{ window[saved.fn](); }
  catch(e){ pbStartTour(true); }
}

// Tombol "Lewati" — salah satu dari DUA jalan keluar tur (yang lain:
// vbVideoGuideFinish). Baru di sini tur ditandai selesai untuk akun ini.
function pbTourSkip(){
  pbTourProgressHide();
  pbMarkTourDone();
  pbEndTour();
}
// Menutup TAMPILAN tur (overlay/kartu). BUKAN penanda "tur selesai" — fungsi
// ini juga dipakai sebagai transisi di tengah alur (pbTourFinishExt,
// vbHookCopyLanjutClick, dst) saat tur sebenarnya masih berjalan. Penanda
// selesai ada di pbTourSkip() & vbVideoGuideFinish().
function pbEndTour(){
  pbClearSavedTourStep();
  pbHideOverlay(true);
  // Tur benar-benar selesai — tampilkan lagi nav Foto/Video/Riwayat/Panduan
  // yang disembunyikan sejak pbStartTour().
  // FIX (permintaan user): pbEndTour() juga dipanggil sebagai transisi
  // di TENGAH alur (akhir wizard Foto, Salin JSON, dst) padahal tur belum
  // selesai — bar bintang masih menunjukkan tahap aktif (PB_TOUR_STAR_STAGE
  // >= 0). Selama itu nav TETAP disembunyikan; baru dimunculkan kalau tur
  // di-skip (Lewati → bar disembunyikan dulu) atau panduan Video AI selesai
  // (lihat vbVideoGuideFinish()).
  let navEl=document.querySelector('.nav');
  if(navEl && PB_TOUR_STAR_STAGE<0) navEl.classList.remove('pb-tour-navhide');
  if(PB_TOUR_STAR_STAGE<0) document.body.classList.remove('pb-tour-single-produk');
  if(PB_TOUR_STAR_STAGE<0) document.body.classList.remove('pb-tour-active');
  // FITUR BARU (permintaan user): kalau tur di-skip PERSIS saat masih
  // menunggu klik Salin di kartu Hook (vb-pulse-yellow/vb-box-pulse-gold
  // & kunci kartu lain masih aktif — lihat vbScriptReadyNext()), semua
  // itu WAJIB dilepas di sini juga. Tanpa ini, kalau user skip di tengah,
  // tombol Salin kartu Cerita Produk/CTA bisa nyangkut terkunci selamanya.
  if(typeof pbTourWaitingHookCopy!=='undefined') pbTourWaitingHookCopy=false;
  let hookCopyBtn=document.getElementById('vb-bulk-copy-0');
  if(hookCopyBtn) hookCopyBtn.classList.remove('vb-pulse-yellow');
  let hookTaWrap=document.getElementById('vb-card-0');
  if(hookTaWrap) hookTaWrap.classList.remove('vb-box-pulse-gold');
  document.querySelectorAll('.vb-copy-locked').forEach(function(el){el.classList.remove('vb-copy-locked');});
  // (Nov 2026) Lepas juga tombol Salin Story/CTA yang disembunyikan + penanda tunggu-salinnya.
  document.querySelectorAll('.vb-tour-copy-hide,.vb-pulse-yellow').forEach(function(el){el.classList.remove('vb-tour-copy-hide','vb-pulse-yellow');});
  document.querySelectorAll('.vb-box-pulse-gold').forEach(function(el){el.classList.remove('vb-box-pulse-gold');});
  if(typeof pbTourWaitingProdukCopy!=='undefined') pbTourWaitingProdukCopy=false;
  if(typeof pbTourWaitingCtaCopy!=='undefined') pbTourWaitingCtaCopy=false;
  // Jaga-jaga juga (permintaan user): kalau tur di-skip persis waktu
  // tombol Revisi/Ubah Suara Karakter masih disembunyikan, tampilkan lagi.
  if(typeof pbUnlockScriptAreaExtras==='function') pbUnlockScriptAreaExtras();
}
// Cuma menyembunyikan tampilan tur (dipakai transisi antar-step,
// termasuk "hilang total" di langkah 6→7) TANPA menandai tur sudah
// selesai — dipisah dari pbEndTour() supaya bisa dipanggil ulang.
function pbHideOverlay(endingTour){
  if(typeof pbStep2bVidStop==='function') pbStep2bVidStop();
  pbTourHideBack();
  pbDisarmDoneWait();
  pbWaitingCopyClick=false;
  clearInterval(pbGenPollTimer);pbGenPollTimer=null;
  clearInterval(pbCopyPollTimer);pbCopyPollTimer=null;
  // FIX BUG PERFORMA (laporan user, Sept 2026 — lihat catatan lengkap di
  // pbShowModal/pbShowInteractive): lepas TOTAL listener 'resize'/'scroll'
  // yang dipasang tiap langkah tur begitu tur ditutup/disembunyikan —
  // sebelumnya listener ini tidak pernah dilepas sama sekali, jadi terus
  // aktif & memicu pbRepositionCurrent() di setiap scroll/resize SELAMA
  // SISA SESI walau tur sudah lama selesai (bikin app kerasa berat pas
  // scroll di wizard Foto/Video), dan berpotensi memunculkan lagi kotak
  // sorot tur (lewat pbPositionSpot(null)) walau seharusnya sudah tidak
  // tampil. pbShowModal/pbShowInteractive akan pasang lagi listener ini
  // sendiri kalau tur benar-benar dimulai/lanjut ke langkah berikutnya.
  window.removeEventListener('resize',pbRepositionCurrent);
  let _pbHideShell=document.getElementById('app-shell');
  if(_pbHideShell) _pbHideShell.removeEventListener('scroll',pbRepositionCurrent);
  // Jaga-jaga: kalau tur ditutup/di-skip persis waktu langkah 4 masih
  // aktif, pastikan chip yang tadi dikunci selalu kembali normal —
  // jangan sampai nyangkut terkunci walau tur sudah tidak tampil.
  pbUnlockChip('#ftb-outfit');
  pbUnlockChip('#ftb-objek');
  pbUnlockChip('#ftb-lokasi');
  pbUnlockChip('#ftb-pose');
  // Jaga-jaga: kalau tur ditutup/di-skip persis waktu step "kunci Mode
  // 2/3/4" (video) masih aktif, pastikan kuncinya, hint, & blur selalu
  // ikut lepas — jangan sampai nyangkut walau tur sudah tidak tampil.
  if(typeof pbTourVideoModeActive!=='undefined' && pbTourVideoModeActive){
    pbTourVideoModeActive=false;
    pbUnlockChip('#vb-mode-aset');
    pbUnlockChip('#vb-mode-kp');
    pbUnlockChip('#vb-mode-ikuti');
    pbUnlockChip('#vb-mode-mirrorselfie');
    pbUnlockChip('#vb-mode-percobaan');
    pbUnlockChip('#vb-mode-tess');
    pbUnlockChip('#vb-mode-fashion');
  pbUnlockChip('#vb-mode-uiui');
    let hintEl=document.getElementById('vb-tour-mode-hint');
    if(hintEl) hintEl.style.display='none';
    document.body.classList.remove('pb-tour-blur-context');
  }
  // Jaga-jaga: badge "sedang membuat prompt" video bisa saja masih
  // kelihatan kalau tur di-skip di tengah sesi Video (Mode Referensi Foto
  // s.d. Script) — pastikan selalu ikut dilepas juga di sini.
  let vbProcessBadgeSkip=document.getElementById('vb-tour-process-badge');
  if(vbProcessBadgeSkip) vbProcessBadgeSkip.style.display='none';
  // Jaga-jaga: kalau tur ditutup/di-skip persis waktu Langkah 5 atau 6
  // (versi sederhana f0/f1) masih aktif, pastikan tampilannya selalu
  // kembali normal — jangan sampai nyangkut buram/tersembunyi walau
  // tur sudah tidak tampil. Fungsi ini aman dipanggil kapan pun
  // (idempotent) walau langkah tersebut belum pernah dibuka.
  // FIX (dilaporkan user — kunci "Produk Saja" & teks tur Langkah 5
  // hilang begitu buka Karakter Sheet dari Langkah 3): pbHideOverlay()
  // ini TERNYATA juga dipanggil dari pbOpenCharacterSheetFromTour(),
  // yang bukan penutupan tur sungguhan — cuma transisi buka modal. Kalau
  // reset F0/F1 di bawah ini tetap jalan di situ, penguncian "Produk
  // Saja" & tampilan sederhana Langkah 5/6 yang sedang berjalan ikut
  // kehapus padahal sesi tur belum berakhir. Sekarang reset ini HANYA
  // jalan kalau pbHideOverlay() dipanggil dengan endingTour=true (dari
  // pbEndTour(), tur beneran ditutup/skip) — pemanggil lain (mis.
  // pbOpenCharacterSheetFromTour()) memanggil tanpa argumen ini supaya
  // status Langkah 5/6 tidak ikut ke-reset.
  // Lepas kunci halaman depan tur kalau tur ditutup/di-skip persis saat halaman itu tampil.
  if(endingTour){
    pbTourHomeNext=null;
    document.body.classList.remove('pb-tour-homelock','pb-tour-home-ks','pb-tour-home-pfa');
  }
  if(endingTour){
    if(typeof pbTourResetF0Ui==='function') pbTourResetF0Ui();
    if(typeof pbTourResetF1Ui==='function') pbTourResetF1Ui();
  }
  document.getElementById('pb-tour-backdrop').classList.remove('show','pb-passive');
  document.getElementById('pb-tour-spot').classList.remove('show','pb-airy');
  document.getElementById('pb-tour-card').classList.remove('show');
  // Jaga-jaga: kalau tur ditutup persis waktu notifikasi premium
  // Langkah 4 masih tampil, pastikan ikut hilang juga.
  let pnEl=document.getElementById('pb-premium-notif');
  if(pnEl) pnEl.classList.remove('show');
  if(typeof pbPnClearConfetti==='function') pbPnClearConfetti();
  // Jaga-jaga juga: kalau tur ditutup persis waktu lightbox preview
  // diagram Langkah 2 lagi kebuka.
  let lbEl=document.getElementById('pb-flow-lightbox');
  if(lbEl) lbEl.classList.remove('show');
  // Jaga-jaga: kalau tur ditutup/di-skip persis waktu blur/hide akhir
  // (pb-tour-final-blur / pb-tour-result-simple, dari pbTourFinishExt()/
  // fGenerate()) masih menyala, pastikan selalu dilepas juga.
  document.body.classList.remove('pb-tour-final-blur');
  document.body.classList.remove('pb-tour-result-simple');
  let pbSkipSummaryCardEl=document.getElementById('summary-card');
  if(pbSkipSummaryCardEl) pbSkipSummaryCardEl.classList.remove('pb-tour-opened');
  if(typeof pbTourAfterGenActive!=='undefined') pbTourAfterGenActive=false;
  // FIX (ditemukan saat audit): pbTourExtActive DULU tidak pernah direset
  // di sini. Kalau tur di-skip ("Lewati") persis di antara foto referensi
  // (f1) selesai dan step Mood/Tone (step 9) selesai, flag ini nyangkut
  // true SELAMANYA (untuk sisa sesi halaman itu) — akibatnya begitu user
  // yang SAMA nanti bikin prompt Foto/Video secara NORMAL (bukan tur) dan
  // sampai ke step Mood/Tone, fPickMood()/fPickMoodCustom() salah kira dia
  // masih di dalam tur lalu memanggil pbTourFinishExt() tanpa diminta —
  // tampilan Ringkasan/Generate tiba-tiba diburamkan & dipindah ke tengah
  // layar padahal bukan sesi tur. Direset di sini supaya skip di titik
  // manapun selalu membersihkan flag ini juga.
  if(typeof pbTourExtActive!=='undefined') pbTourExtActive=false;
  // Jaga-jaga: kalau tur ditutup/di-skip persis waktu sesi "silent" wizard
  // Video (pbTourVideoScriptActive — user lagi isi Jenis Kelamin/Usia/Nada
  // Bicara/Aksen/Script sendiri tanpa overlay tur, lihat pbStep7VideoDone)
  // masih aktif, pastikan toggle "Banyak produk sekaligus" yang tadi
  // disembunyikan selalu kelihatan lagi — jangan sampai nyangkut
  // tersembunyi walau tur sudah tidak berjalan.
  if(typeof pbTourVideoScriptActive!=='undefined' && pbTourVideoScriptActive){
    pbTourVideoScriptActive=false;
    let bulkLabel=document.getElementById('vb-bulk-toggle-label');
    if(bulkLabel) bulkLabel.classList.remove('hidden');
  }
  // Jaga-jaga juga: kalau tur ditutup/di-skip persis di rentang antara
  // klik "Salin" (notifikasi "Prompt Video Siap" muncul) dan kartu
  // "Panduan Video AI" ditampilkan, pastikan flag penantiannya ikut
  // direset DAN kedua overlay itu (kalau kebetulan masih kelihatan)
  // ditutup juga.
  if(typeof pbTourWaitingVideoGuideEnd!=='undefined') pbTourWaitingVideoGuideEnd=false;
  let srEl=document.getElementById('vb-scriptready-overlay');
  if(srEl) srEl.classList.remove('show');
  if(typeof pbStep2bVidStop==='function') pbStep2bVidStop();
  let vgEl=document.getElementById('vb-videoguide-overlay');
  if(vgEl) vgEl.classList.remove('show');
  if(typeof vbTourVidReset==='function') vbTourVidReset();
  window.removeEventListener('resize',pbRepositionCurrent);
  let shell=document.getElementById('app-shell');
  if(shell) shell.removeEventListener('scroll',pbRepositionCurrent);
}

// ── LANGKAH 1 — modal, sambutan ──────────────────────────────────
function pbGoStep1(){
  pbSaveTourStepState('pbGoStep1');
  pbShowModal(1,'Salam kenal','Aku akan pandu kamu membuat video AI dari 0, TANPA BASA-BASI.','Lanjut',pbGoStep2);
}
// ── LANGKAH 2 — modal, siapkan foto ──────────────────────────────
function pbGoStep2(){
  pbSaveTourStepState('pbGoStep2');
  let desc = '<div class="pb-flow-wrap">'
    +   '<div class="pb-flow-row">'
    +     '<div class="pb-flow-box pb-flow-hero">'
    +       '<div class="pb-flow-thumb" data-label="Video AI" data-explain="Untuk menghasilkan video AI dibutuhkan 1 bahan" data-sub1-src="'+PB_IMG_FLOW_FOTOAI+'" data-sub1-label="Foto AI" onclick="pbFlowLightboxOpen(this)"><video src="'+PB_IMG_FLOW_VIDEOAI+'" muted autoplay loop playsinline></video></div>'
    +       '<div class="pb-flow-label">🎬 Video AI</div>'
    +       '<div class="pb-flow-sub pb-flow-sub-ai">hasil akhirnya</div>'
    +     '</div>'
    +   '</div>'
    +   '<div class="pb-flow-arrow"><span class="ln"></span><span class="ic">↓</span><span class="tx">butuh 1 bahan</span></div>'
    +   '<div class="pb-flow-row">'
    +     '<div class="pb-flow-box">'
    +       '<div style="position:relative;display:inline-block;">'
    +         '<div class="pb-flow-thumb" id="pb-flow-fotoai-thumb" data-label="Foto AI" data-explain="Untuk menghasilkan foto AI dibutuhkan 2 bahan" data-sub1-src="'+PB_IMG_FLOW_KARAKTERSHEET+'" data-sub1-label="Foto Karakter Sheet" data-sub2-src="'+PB_IMG_FLOW_PRODUK+'" data-sub2-label="Foto Produk" onclick="pbFlowLightboxOpen(this)"><img src="'+(pbFotoAiUploaded?pbFotoAiDataUrl:PB_IMG_FLOW_FOTOAI)+'" alt="Foto AI"></div>'
    +         (pbFotoAiUploaded?'<div style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px var(--surface2);"><svg class="icon" style="width:12px;height:12px;color:#08080A;"><use href="#ic-check"></use></svg></div>':'')
    +       '</div>'
    +       '<div class="pb-flow-label">Foto AI</div>'
    +     '</div>'
    +   '</div>'
    +   '<div class="pb-flow-arrow"><span class="ln"></span><span class="ic">↓</span><span class="tx">butuh 2 bahan</span></div>'
    +   '<div class="pb-flow-row">'
    +     '<div class="pb-flow-box">'
    +       '<div style="position:relative;display:inline-block;">'
    +         '<div class="pb-flow-thumb" id="pb-flow-ks-thumb" data-label="Foto Karakter Sheet" onclick="pbFlowLightboxOpen(this)"><img src="'+(pbKsFotoUploaded?pbKsFotoDataUrl:PB_IMG_FLOW_KARAKTERSHEET)+'" alt="Foto karakter sheet"></div>'
    +         (pbKsFotoUploaded?'<div style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px var(--surface2);"><svg class="icon" style="width:12px;height:12px;color:#08080A;"><use href="#ic-check"></use></svg></div>':'')
    +       '</div>'
    +       '<div class="pb-flow-label">Foto Karakter Sheet</div>'
    +     '</div>'
    +     '<div class="pb-flow-box">'
    +       '<div style="position:relative;display:inline-block;">'
    +         '<div class="pb-flow-thumb" id="pb-flow-produk-thumb" data-label="Foto Produk" onclick="pbFlowLightboxOpen(this)"><img src="'+(pbProdukFotoUploaded?pbProdukFotoDataUrl:PB_IMG_FLOW_PRODUK)+'" alt="Foto produk"></div>'
    +         (pbProdukFotoUploaded?'<div style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px var(--surface2);"><svg class="icon" style="width:12px;height:12px;color:#08080A;"><use href="#ic-check"></use></svg></div>':'')
    +       '</div>'
    +       '<div class="pb-flow-label">Foto Produk</div>'
    +     '</div>'
    +   '</div>'
    + '</div>'
    + '<hr class="pb-flow-divider">'
    + '<p style="margin-top:0;">'+(pbFotoAiUploaded?'Yuk, sekarang kita bikin "prompt" untuk video AI.':(pbProdukFotoUploaded&&pbKsFotoUploaded?'2 bahan sudah ada. Saatnya bikin FOTO AI':(pbProdukFotoUploaded?'klik lanjut untuk membuat foto karakter sheet.':'Singkatnya, kita bikin dulu foto karakter AI memegang produk terus dari foto tersebut kita animasikan sebagai sebuah video promosi.')))+'</p>';
  // FITUR BARU (permintaan user): dulu tombol ini jadi 'Selesai' begitu
  // pbFotoAiUploaded true (langsung pbEndTour() dari pbGoStep2Next di bawah).
  // Sekarang SELALU 'Lanjut' — begitu Foto AI sudah lengkap, tur tidak
  // berhenti di sini, tapi lanjut ke langkah baru "bikin prompt video"
  // (lihat pbGoStep7VideoIntro).
  pbShowModal(2,'Alur pembuatan',desc,'Lanjut',pbGoStep2Next);
  // Judul rata tengah supaya sejajar dengan diagram alur (kotak-kotak di bawahnya rata tengah).
  (function(){var t=document.getElementById('pb-tour-title'); if(t) t.style.textAlign='center';})();
  // PERMINTAAN USER: tiap kali user BALIK ke kartu "Ringkasan alurnya
  // dulu, ya" (sesudah upload foto), tampilan pertamanya jangan mentok
  // di atas — geser sedikit ke bawah supaya foto yang barusan ter-upload
  // langsung kelihatan tanpa user perlu scroll sendiri.
  pbStep2ScrollToUploaded();
}
// Geser isi kartu Langkah 2 ke thumbnail foto TERAKHIR yang sudah
// di-upload. Urutannya ngikutin alur tur: Foto AI (paling akhir dibuat)
// → Karakter Sheet → Produk. Kalau belum ada satupun yang ter-upload
// (kunjungan pertama dari Langkah 1), kartu dibiarkan mulai dari atas
// seperti biasa.
function pbStep2ScrollToUploaded(){
  let card=document.getElementById('pb-tour-card');
  if(!card) return;
  let id = (typeof pbFotoAiUploaded!=='undefined' && pbFotoAiUploaded) ? 'pb-flow-fotoai-thumb'
         : ((typeof pbKsFotoUploaded!=='undefined' && pbKsFotoUploaded) ? 'pb-flow-ks-thumb'
         : ((typeof pbProdukFotoUploaded!=='undefined' && pbProdukFotoUploaded) ? 'pb-flow-produk-thumb'
         : null));
  if(!id) return;
  // Tunggu kartu benar-benar ke-render (pbShowModal baru saja mengganti
  // isinya & mereset scrollTop=0) baru hitung posisinya, kalau tidak
  // tinggi elemennya masih 0 dan hitungannya meleset.
  requestAnimationFrame(function(){
    setTimeout(function(){
      let el=document.getElementById(id);
      if(!el||!card) return;
      let cardRect=card.getBoundingClientRect();
      let elRect=el.getBoundingClientRect();
      // Taruh thumbnail-nya sekitar sepertiga dari atas area kartu —
      // jadi kotak di atasnya masih kelihatan sedikit (user tetap paham
      // ini bagian dari alur), tapi fotonya sendiri sudah pasti masuk layar.
      let target=card.scrollTop + (elRect.top-cardRect.top) - cardRect.height*0.32;
      let max=card.scrollHeight-card.clientHeight;
      if(target<0) target=0;
      if(target>max) target=max;
      if(target<=2) return;   // sudah kelihatan dari atas, tidak perlu digeser
      try{ card.scrollTo({top:target,behavior:'smooth'}); }
      catch(e){ card.scrollTop=target; }
    },180);
  });
}
// ── State: apakah foto produk sudah "disiapkan" lewat Langkah 3 baru
// (siapkan foto produk) di bawah ini. Begitu true, thumbnail Foto Produk
// di Langkah 2 diganti foto asli yang diupload user + centang hijau, dan
// tombol "Lanjut" di Langkah 2 melompati Langkah 3 (langsung ke Karakter
// Sheet) supaya user tidak diminta siapkan foto produk berkali-kali. ──
var pbProdukFotoUploaded=false;
var pbProdukFotoDataUrl=null;
// ── State: apakah foto Karakter Sheet hasil unduhan Google Flow sudah
// diupload lewat Langkah 4 (lihat pbStep4PhotoPicked). Begitu true,
// thumbnail Foto Karakter Sheet di Langkah 2 diganti foto asli yang
// diupload user + centang hijau, dan tombol "Lanjut" di Langkah 2 tidak
// lagi membuka ulang modal Karakter Sheet. ────────────────────────
var pbKsFotoUploaded=false;
var pbKsFotoDataUrl=null;
// Diklik dari tombol "Lanjut" di Langkah 2 — kalau foto produk belum
// disiapkan, buka Langkah 3 baru (siapkan foto produk) dulu; kalau foto
// produk sudah ada tapi foto Karakter Sheet belum, LANGSUNG buka modal
// Karakter Sheet asli (lewat pbOpenCharacterSheetFromTour, definisinya
// ada di bawah) — tidak lagi mampir ke modal tutorial "Ayuk,
// sekarang kita bakalan bikin foto karakter sheet AI" (fungsi lama
// pbGoStep3/pbRenderStep3 di bawah — sengaja DIBIARKAN masih ada sebagai
// referensi/kalau dibutuhkan lagi, tapi sudah tidak dipanggil dari alur
// utama manapun). Begitu prompt Karakter Sheet disalin & user tekan
// "Mengerti", tur lanjut ke Langkah 4 (lihat csCopyPrompt→csShowSavedNotif).
// Kalau KEDUA bahan (produk + karakter sheet) sudah lengkap, tur
// dilanjutkan ke Langkah 5 (versi sederhana dari step "Subjek Foto" f0
// asli) — lihat pbGoStep5() di bawah — supaya "prompt" Foto AI-nya
// BENERAN dibuat dulu lewat wizard.
// FIX (dilaporkan user): sebelumnya di sini LANGSUNG panggil pbGoStep6Ext()
// (tutorial "cara pakai Google Flow" yang butir ke-6-nya minta user
// nempel "prompt") padahal prompt Foto AI itu SENDIRI belum pernah
// dibuat — wizard f0/f1/step3-9/Generate/Salin JSON yang bikin prompt
// itu baru jalan BELAKANGAN lewat pbGoStep5(). Urutannya kebalik. Sekarang
// dibetulkan: begitu kedua bahan siap, tur masuk dulu ke wizard
// (pbGoStep5) untuk membuat & menyalin prompt-nya. Tutorial pbGoStep6Ext
// baru ditampilkan SETELAH prompt itu benar-benar disalin — dipanggil
// dari dalam pbShowSaveJsonNotif() (lihat komentar di sana).
function pbGoStep2Next(){
  pbSaveTourStepState('pbGoStep2Next');
  if(!pbProdukFotoUploaded){ pbGoStep2b(); }
  // PERMINTAAN USER: jangan langsung masuk. Bawa user dulu ke halaman depan (daftar fitur),
  // fitur lain dikunci, user harus menekan sendiri tombol yang menyala.
  else if(!pbKsFotoUploaded){ pbTourHomeLockShow('ks',pbOpenCharacterSheetFromTour); }
  else if(!pbFotoAiUploaded){ pbTourHomeLockShow('pfa',pbGoStep5); }
  else { pbGoStep7VideoIntro(); }
}
// FITUR BARU (permintaan user): sebelum modal Karakter Sheet kebuka dari
// tombol "Lanjut" di kartu ringkasan alur (Langkah 2), kasih denyutan
// singkat dulu di thumbnail "Foto Karakter Sheet" (#pb-flow-ks-thumb) —
// biar kelihatan seolah thumbnail itu yang "ditekan"/aktif sebelum
// pindah ke modalnya, bukan cuma tiba-tiba ganti tampilan. Kalau elemen
// thumbnail-nya entah kenapa tidak ketemu (mis. re-render tertunda),
// langsung lanjut buka modal tanpa nunggu — supaya tombol "Lanjut" tidak
// pernah kelihatan "diam"/tidak merespons. ─────────────────────────────
// ── PERMINTAAN USER: HALAMAN DEPAN TERKUNCI ─────────────────────────────
// Dipakai di 2 titik tur: sebelum Karakter Sheet ('ks') dan sebelum Prompt Foto AI ('pfa').
// Halaman depan tampil seperti di luar tur; hanya tombol yang dituju yang bisa ditekan.
// Begitu ditekan, kunci dilepas lalu fungsi lanjutan (next) dijalankan — yaitu isi langkah
// yang dulu langsung terbuka. Nama fungsi sengaja TANPA kata "Step"/"Render" supaya tidak
// ikut dibungkus sistem undo.
var pbTourHomeNext=null;
var pbTourHomeHadPfa=false;
function pbTourHomeLockShow(which,next){
  pbTourHomeNext=next;
  var b=document.body;
  pbTourHomeHadPfa=b.classList.contains('pb-tour-pfa');
  // Pastikan layar Prompt Foto AI & modal Karakter Sheet tertutup, jadi yang kelihatan halaman depan.
  try{ if(typeof window.pfaClose==='function') window.pfaClose(); }catch(e){}
  try{ var m=document.getElementById('cs-modal'); if(m && m.style.display!=='none' && typeof csCloseModal==='function') csCloseModal(); }catch(e){}
  // Tombol fitur disembunyikan oleh blur-context; harus dilepas supaya halaman depan kelihatan.
  b.classList.remove('pb-tour-blur-context');
  b.classList.remove('pb-tour-home-ks','pb-tour-home-pfa');
  b.classList.add('pb-tour-pfa','pb-tour-homelock','pb-tour-home-'+which);
  var shell=document.getElementById('app-shell'); if(shell) shell.scrollTop=0;
  pbTourProgressShow(which==='ks'?0:1);
  // PERMINTAAN USER: TIDAK ADA banner/pemberitahuan di halaman depan terkunci. Yang tampil cuma
  // bar bintang + tombol yang menyala (fitur lain tetap dikunci lewat CSS body.pb-tour-homelock).
  pbTourHideBack();
  pbCurrentSelector=null;
  pbSetPassive(true);
  pbSetLabel(0);
  var card=document.getElementById('pb-tour-card');
  if(card){ card.classList.remove('show'); card.classList.add('pb-docked'); }
  var nb=document.getElementById('pb-tour-next-btn'); if(nb) nb.style.display='none';
}
// Dipanggil saat user menekan tombol yang menyala di halaman depan terkunci.
function pbTourHomeTap(){
  var next=pbTourHomeNext; pbTourHomeNext=null;
  var b=document.body;
  var wasKs=b.classList.contains('pb-tour-home-ks');
  b.classList.remove('pb-tour-homelock','pb-tour-home-ks','pb-tour-home-pfa');
  // Untuk Karakter Sheet, kembalikan class seperti sebelum halaman depan ditampilkan.
  if(wasKs && !pbTourHomeHadPfa) b.classList.remove('pb-tour-pfa');
  pbHideOverlay();
  if(typeof next==='function') next();
}
// Tangkap ketukan di fase capture supaya onclick asli tombol (csOpenModal/pfaOpen) tidak jalan
// sendiri — yang membuka fitur adalah fungsi lanjutan lewat pbTourHomeTap().
document.addEventListener('click',function(ev){
  if(!pbTourHomeNext) return;
  var b=document.body;
  var sel=b.classList.contains('pb-tour-home-ks')?'#cs-entry-btn':(b.classList.contains('pb-tour-home-pfa')?'#pfa-entry-btn':'');
  if(!sel) return;
  var t=(ev.target&&ev.target.closest)?ev.target.closest(sel):null;
  if(!t) return;
  ev.stopPropagation(); ev.preventDefault();
  pbTourHomeTap();
},true);

function pbFlowKsThumbTapThenOpen(){
  let thumbEl=document.getElementById('pb-flow-ks-thumb');
  if(!thumbEl){ pbOpenCharacterSheetFromTour(); return; }
  thumbEl.classList.remove('pb-flow-thumb-tapped');
  void thumbEl.offsetWidth; // restart animasi kalau class-nya kebetulan masih nempel
  thumbEl.classList.add('pb-flow-thumb-tapped');
  setTimeout(function(){
    thumbEl.classList.remove('pb-flow-thumb-tapped');
    pbOpenCharacterSheetFromTour();
  },380);
}
// ── LANGKAH BARU — pengenalan: Foto AI sudah lengkap, sekarang bikin
// prompt VIDEO-nya dulu sebelum lanjut ke Google Flow/Veo. Modal biasa
// (bukan interaktif) — tombolnya "Buat", bukan "Lanjut"/"Selesai". ──
function pbGoStep7VideoIntro(){
  pbSaveTourStepState('pbGoStep7VideoIntro');
  // FITUR BARU (permintaan user): Foto AI sudah lengkap, bar progres
  // bintang lanjut menyala ke titik "Prompt" (Video AI) — titik ini
  // TETAP menyala terus selama sisa wizard Video (Jenis Kelamin, Usia,
  // Nada Bicara, Aksen, Script) sampai user sampai di notifikasi
  // "Prompt Video Siap" nanti (lihat vbScriptReadyNext()).
  pbTourProgressShow(3);
  // PERMINTAAN USER (5 Nov 2026): semua tulisan layar ini diganti jadi satu kalimat (judul), tanpa teks isi.
  pbShowModal(3,'Membuat video AI kita butuh prompt. Yuk buat.',
    '',
    'Buat',pbGoStep7VideoOpen);
}
// State: apakah step "kunci mode 2/3/4" ini lagi aktif — dipakai
// pbHideOverlay() supaya kalau tur ditutup/di-skip PERSIS di step ini,
// chip Mode 2/3/4 & hint-nya selalu ikut kebuka/kesembunyikan lagi
// (jangan sampai nyangkut walau tur sudah tidak tampil).
var pbTourVideoModeActive=false;
// FITUR BARU (permintaan user): dua flag baru untuk sesi tur "silent" di
// wizard Video sesudah Mode Referensi Foto dikonfirmasi (lihat
// pbStep7VideoDone). pbTourVideoScriptActive true selama user isi bebas
// Jenis Kelamin/Usia/Nada Bicara/Aksen/Script TANPA overlay tur kelihatan,
// sampai dia beneran menekan "Salin" di salah satu kartu Hook/Story/CTA.
// pbTourWaitingVideoGuideEnd true persis di rentang antara notifikasi
// "Prompt Video Siap" muncul (dari klik Salin tsb) sampai kartu "Panduan
// Video AI" (kosong) ditampilkan — dipakai wrapper vbScriptReadyNext() di
// bawah untuk tahu kapan harus benar-benar memanggil pbEndTour().
var pbTourVideoScriptActive=false;
var pbTourWaitingVideoGuideEnd=false;
// FITUR BARU (permintaan user): true selagi notifikasi "Prompt Video
// Siap" sudah ditutup ("Mengerti" diklik) TAPI user belum klik "Salin" di
// kartu Hook — lihat vbScriptReadyNext() & copyBtn.onclick di
// _vbBuildEditableCard.
var pbTourWaitingHookCopy=false;
// FITUR BARU (permintaan user — disamakan dengan pola proses pembuatan
// prompt Foto AI/pbGoStep5): step ini TIDAK PAKAI lagi kartu instruksi
// tur ("Langkah n dari 10") maupun kotak sorot (spotlight) kuning.
// Satu-satunya penanda "fokus di sini" adalah blur pada judul/deskripsi
// tab Video (lewat body.pb-tour-blur-context, class yang sama dipakai
// proses Foto AI) + teks hint abu-abu netral DI DALAM kartu Mode
// Referensi Foto sendiri (#vb-tour-mode-hint, pola sama seperti
// f1-tour-hint). Dipanggil dari tombol "Buat" di pbGoStep7VideoIntro().
function pbGoStep7VideoOpen(){
  pbSaveTourStepState('pbGoStep7VideoOpen');
  // FIX (dilaporkan user — tombol "Buat" kayak mati): overlay tur
  // (backdrop gelap + kartu "Langkah 3 dari 10") dulu tidak pernah
  // disembunyikan di sini, jadi walau tab Video di baliknya sudah
  // benar-benar pindah, layar tetap ketutup backdrop lama. Step ini kan
  // memang didesain TANPA kartu/spotlight (lihat komentar di atas), jadi
  // overlay-nya harus dilepas total dulu — sama seperti pola di pbGoStep5().
  window.removeEventListener('resize',pbRepositionCurrent);
  let shellEl=document.getElementById('app-shell');
  if(shellEl) shellEl.removeEventListener('scroll',pbRepositionCurrent);
  document.getElementById('pb-tour-backdrop').classList.remove('show','pb-passive');
  document.getElementById('pb-tour-spot').classList.remove('show','pb-airy');
  document.getElementById('pb-tour-card').classList.remove('show');
  let videoBtn=document.getElementById('ntab-video');
  if(videoBtn) switchPage('video',videoBtn);
  // PERMINTAAN USER (Sept 2026): dulu Start Frame langsung di-auto-klik lewat
  // vbPickRefMode('satu') di sini, jadi user belum apa-apa udah lihat chip-nya
  // kepilih (kuning) sendiri. Sekarang TIDAK di-auto-klik lagi — chip dipaksa
  // balik ke keadaan belum terpilih, biar user yang benar-benar tap sendiri.
  // VB.refMode default-nya sudah 'satu' (lihat deklarasi objek VB), jadi data
  // di baliknya tidak berubah — ini murni soal tampilan chip belum "nyala".
  document.getElementById('vb-mode-satu').classList.remove('sel');
  vbSyncModePreview(false);
  vbSyncDuaPreview(false);
  pbLockChip('#vb-mode-aset');
  pbLockChip('#vb-mode-kp');
  pbLockChip('#vb-mode-ikuti');
  pbLockChip('#vb-mode-mirrorselfie');
  pbLockChip('#vb-mode-percobaan');
  pbLockChip('#vb-mode-tess');
  pbLockChip('#vb-mode-fashion');
  pbLockChip('#vb-mode-uiui');
  document.body.classList.add('pb-tour-blur-context');
  let hint=document.getElementById('vb-tour-mode-hint');
  if(hint) hint.style.display='block';
  pbTourVideoModeActive=true;
  // FITUR BARU (permintaan user, disamakan dengan f0-tour-process-badge di
  // tab Foto): badge "sedang membuat prompt" untuk video ditampilkan di
  // sini, tetap kelihatan sepanjang sesi (Mode Referensi Foto s.d. Script)
  // sampai prompt video beneran kelar di vbHookCopyLanjutClick().
  let vbProcessBadge=document.getElementById('vb-tour-process-badge');
  if(vbProcessBadge) vbProcessBadge.style.display='flex';
  pbArmDoneWait('v1',pbStep7VideoDone);
}
// Dipanggil otomatis (lewat pbArmDoneWait) begitu user menekan tombol
// "Lanjut →" asli di kartu Mode Referensi Foto (vbConfirmRef→doneCard('v1')).
// Buka kunci Mode 2/3/4 lagi, sembunyikan hint & lepas blur.
// FITUR BARU (permintaan user): tur TIDAK langsung ditutup di sini lagi.
// Overlay/spotlight tur memang dilepas total (sama seperti Langkah 8 di
// alur Foto) — user isi sendiri Jenis Kelamin & Usia (v2), Nada Bicara
// (v3), Aksen (v4), sampai Script/Dialog (v5) TANPA ditunjuk-tunjuk lagi.
// Tapi sesi tur masih dianggap "aktif" (pbTourVideoScriptActive=true; nav
// bawah tetap tersembunyi) sampai 3 script Hook/Story/CTA selesai
// digenerate — begitu itu kelar, notifikasi "Prompt Video Siap" muncul
// OTOMATIS (lihat vbGenerate3AI(), sudah tidak perlu nunggu user klik
// "Salin" lagi — permintaan user, Sept 2026, biar kolom panduannya pasti
// muncul selama memang lagi tur, tidak tergantung aksi klik). Begitu user
// tekan "Lanjut" di notifikasi itu, kartu "Panduan Video AI" (masih
// kosong) muncul, dan tur BENERAN ditutup persis di situ (lihat
// vbGenerate3AI() & wrapper vbScriptReadyNext() di bawah).
// Selama pbTourVideoScriptActive true, toggle "Banyak produk sekaligus"
// di step Script/Dialog disembunyikan dulu biar pemula tidak bingung
// dengan mode bulk — otomatis kelihatan lagi begitu tur beneran selesai
// (atau kalau tur di-skip di tengah jalan, lihat pbHideOverlay()).
function pbStep7VideoDone(){
  pbTourVideoModeActive=false;
  pbUnlockChip('#vb-mode-aset');
  pbUnlockChip('#vb-mode-kp');
  pbUnlockChip('#vb-mode-ikuti');
  pbUnlockChip('#vb-mode-mirrorselfie');
  pbUnlockChip('#vb-mode-percobaan');
  pbUnlockChip('#vb-mode-tess');
  pbUnlockChip('#vb-mode-fashion');
  pbUnlockChip('#vb-mode-uiui');
  let hint=document.getElementById('vb-tour-mode-hint');
  if(hint) hint.style.display='none';
  document.body.classList.remove('pb-tour-blur-context');
  pbTourVideoScriptActive=true;
  let bulkLabel=document.getElementById('vb-bulk-toggle-label');
  if(bulkLabel) bulkLabel.classList.add('hidden');
  // FITUR BARU (permintaan user): jumlah produk dikunci 1 selama tur —
  // kotak pengaturannya disembunyikan lewat CSS (body.pb-tour-single-produk)
  // dan nilainya dipaksa balik ke 1 (jaga-jaga kalau sempat diubah sebelum
  // tur sampai di sini) untuk jalur "Kami Bantu Isi" & "Tulis Manual Sendiri".
  document.body.classList.add('pb-tour-single-produk');
  // Kalau jalur "Tulis Manual Sendiri" sempat terpilih sebelum tur sampai
  // sini, paksa balik ke "Kami Bantu Isi" (chip manual sekarang dikunci CSS).
  let _mm=document.getElementById('vb-mode-manual');
  if(_mm && _mm.classList.contains('sel')){ try{ vbSelectScriptMode('ai'); }catch(e){} }
  let _bc=document.getElementById('vb-bulk-count');
  if(_bc){ _bc.value='1'; try{ vbBulkSetCount(); }catch(e){} }
  let _mc=document.getElementById('vb-manual-count');
  if(_mc) _mc.value='1';
}
// ── LANGKAH 3 (BARU) — siapkan foto produk ───────────────────────
// Fase 1: thumbnail "Foto Produk" di kartu Langkah 2 sedikit membesar
// sesaat (efek "muncul dari situ"), lalu kartu tur berpindah ke Langkah 3
// yang berisi VIDEO panduan cara cari & screenshot produk di toko TikTok
// (PB_VID_CARI_FOTO) — bisa diputar/dijeda, mundur 5 dtk, maju 5 dtk, dan
// digeser lewat bar durasi. Di bawah video ada tulisan "Foto produk sudah
// siap?" lalu tombol "Udah".
// Fase 2 (pbGoStep2bCamera): tampilan fase 1 diganti total jadi cuma
// icon kamera untuk upload. Begitu foto dipilih, foto itu dipakai beneran
// (dibaca jadi data URL) buat mengganti thumbnail Foto Produk di Langkah 2,
// lalu tur otomatis balik ke Langkah 2 (lihat pbStep2bPhotoPicked). ──────
function pbGoStep2b(){
  pbSaveTourStepState('pbGoStep2b');
  let thumb=document.getElementById('pb-flow-produk-thumb');
  if(thumb){
    thumb.style.transition='transform .28s ease';
    thumb.style.transform='scale(1.14)';
  }
  setTimeout(function(){
    if(thumb) thumb.style.transform='';
    pbRenderStep2b();
  },thumb?260:0);
}
// HTML player video panduan tur (putar/jeda, mundur/maju 5 dtk, bar durasi) —
// dipakai Langkah 3 (foto produk) dan step Foto AI. Hanya 1 player tampil
// sekaligus, jadi id elemennya sama.
function pbVidPlayerHtml(src){
  pbVidSeeking=false; // player baru: pastikan bar durasi tidak nyangkut "sedang digeser"
  let icBack='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5"/><path d="M4 3.8v4.2h4.2"/><text x="12" y="15.4" text-anchor="middle" font-size="8.5" font-weight="700" fill="currentColor" stroke="none" font-family="Hanken Grotesk,sans-serif">5</text></svg>';
  let icFwd='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5"/><path d="M20 3.8v4.2h-4.2"/><text x="12" y="15.4" text-anchor="middle" font-size="8.5" font-weight="700" fill="currentColor" stroke="none" font-family="Hanken Grotesk,sans-serif">5</text></svg>';
  let icPlay='<svg class="pb-vid-ic-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>';
  let icPause='<svg class="pb-vid-ic-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5.5" y="4" width="4.5" height="16" rx="1.2"/><rect x="14" y="4" width="4.5" height="16" rx="1.2"/></svg>';
  return '<div class="pb-vid-wrap" id="pb-step2b-wrap">'
    +   '<div class="pb-vid-frame" onclick="pbVzOpen(this)">'
    +     '<video id="pb-step2b-video" src="'+src+'#t=0.1" preload="metadata" playsinline disablepictureinpicture'
    +       ' onloadedmetadata="pbStep2bVidSync()" ontimeupdate="pbStep2bVidSync()" onplay="pbStep2bVidSync()" onpause="pbStep2bVidSync()" onended="pbStep2bVidSync()" onseeked="pbStep2bVidSync()"></video>'
    +     '<div class="pb-vid-big"><span>'+icPlay+'</span></div>'
    +     ''
    +   '</div>'
    +   '<div class="pb-vid-seekrow">'
    +     '<input type="range" id="pb-step2b-seek" min="0" max="1000" value="0" step="1" aria-label="Posisi video"'
    +       ' oninput="pbStep2bVidSeek(this.value)" onpointerdown="pbVidSeeking=true" onpointerup="pbVidSeeking=false" onpointercancel="pbVidSeeking=false" onchange="pbVidSeeking=false">'
    +     '<span class="pb-vid-time" id="pb-step2b-time">0:00 / 0:00</span>'
    +   '</div>'
    +   '<div class="pb-vid-ctrls">'
    +     '<button type="button" class="pb-vid-btn" onclick="pbStep2bVidSkip(-5)" aria-label="Mundur 5 detik">'+icBack+'</button>'
    +     '<button type="button" class="pb-vid-btn pb-vid-main" onclick="pbStep2bVidToggle()" aria-label="Putar atau jeda">'+icPlay+icPause+'</button>'
    +     '<button type="button" class="pb-vid-btn" onclick="pbStep2bVidSkip(5)" aria-label="Maju 5 detik">'+icFwd+'</button>'
    +   '</div>'
    + '</div>';
}
function pbRenderStep2b(){
  let desc = pbVidPlayerHtml(PB_VID_CARI_FOTO)
    + '<p style="margin:0;text-align:center;font-weight:500;color:var(--text);">Foto produk sudah siap?</p>'
    + '<div style="display:flex;justify-content:center;margin-top:12px;">'
    // v6.82: gaya tombol "Udah" disamakan dengan .btn
    + '<button type="button" onclick="pbGoStep2bCamera()" style="background:var(--surface3);color:var(--accent-text-on-dark);font-weight:500;font-size:var(--fs-sm);font-family:Hanken Grotesk,sans-serif;letter-spacing:-0.2px;text-shadow:0 1px 1.5px rgba(0,0,0,0.5),0 -1px 0 rgba(255,255,255,0.05);border:1px solid transparent;box-shadow:0 0 22px rgba(var(--pulse-rgb),0.16);border-radius:var(--radius);padding:11px 30px;cursor:pointer;">Udah</button>'
    + '</div>';
  pbShowModal(3,'Siapkan foto produk',desc,'Lanjut',pbGoStep2Next);
  pbGlowTitle();
  // Tombol "Lanjut" tur disembunyikan — di langkah ini user lanjut lewat
  // tombol "Udah" sendiri, bukan tombol bawaan tur.
  let nextBtn=document.getElementById('pb-tour-next-btn');
  if(nextBtn) nextBtn.style.display='none';
}
// ── Player video Langkah 3 (foto produk) ─────────────────────────
var pbVidSeeking=false;
function pbStep2bVid(){ return document.getElementById('pb-step2b-video'); }
function pbStep2bVidFmt(sec){
  sec=Math.max(0,Math.floor(sec||0));
  return Math.floor(sec/60)+':'+('0'+(sec%60)).slice(-2);
}
// Hentikan video kalau kartu tur pindah/ditutup (elemen yang sudah dilepas
// dari halaman kadang tetap jalan di sebagian browser).
function pbStep2bVidStop(){
  let v=pbStep2bVid();
  if(v){ try{ v.pause(); }catch(e){} }
}
function pbStep2bVidToggle(){
  let v=pbStep2bVid(); if(!v) return;
  if(v.paused||v.ended){
    if(v.ended){ try{ v.currentTime=0; }catch(e){} }
    let pr=v.play();
    if(pr&&pr.catch) pr.catch(function(){});
  } else { v.pause(); }
}
// Mundur (-5) / maju (+5) detik, dibatasi 0 s/d durasi video.
function pbStep2bVidSkip(delta){
  let v=pbStep2bVid(); if(!v) return;
  let dur=v.duration||0;
  let t=(v.currentTime||0)+delta;
  if(t<0) t=0;
  if(dur && t>dur) t=dur;
  try{ v.currentTime=t; }catch(e){}
  pbStep2bVidSync();
}
function pbStep2bVidSeek(val){
  let v=pbStep2bVid(); if(!v||!v.duration) return;
  try{ v.currentTime=(parseFloat(val)||0)/1000*v.duration; }catch(e){}
  let tEl=document.getElementById('pb-step2b-time');
  if(tEl) tEl.textContent=pbStep2bVidFmt(v.currentTime)+' / '+pbStep2bVidFmt(v.duration);
}
function pbStep2bVidSync(){
  let v=pbStep2bVid(); if(!v) return;
  let wrap=document.getElementById('pb-step2b-wrap');
  if(wrap) wrap.classList.toggle('playing',!v.paused&&!v.ended);
  let dur=v.duration||0;
  let seek=document.getElementById('pb-step2b-seek');
  if(seek && dur && !pbVidSeeking) seek.value=String(Math.round((v.currentTime/dur)*1000));
  let tEl=document.getElementById('pb-step2b-time');
  if(tEl) tEl.textContent=pbStep2bVidFmt(v.currentTime)+' / '+pbStep2bVidFmt(dur);
}
// Fase 2 Langkah 3 — ganti isi kartu total jadi cuma icon kamera (tampilan
// foto+teks+tombol "Udah?" fase 1 dilepas semua, sesuai permintaan).
function pbGoStep2bCamera(){
  pbSaveTourStepState('pbGoStep2bCamera');
  pbStep2bVidStop();
  let desc = '<input type="file" accept="image/*" id="pb-step2b-photo-input" style="position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none;" onchange="pbStep2bPhotoPicked(this)">'
    + '<div style="display:flex;justify-content:center;margin:18px 0 4px;">'
    + '<div onclick="document.getElementById(\'pb-step2b-photo-input\').click()" style="width:64px;height:64px;border-radius:50%;background:var(--surface2);border:1px solid var(--border-hi);display:flex;align-items:center;justify-content:center;cursor:pointer;">'
    + '<svg class="icon" style="width:28px;height:28px;color:var(--accent);"><use href="#ic-camera"></use></svg>'
    + '</div>'
    + '</div>';
  pbSetText('Upload foto produknya','Klik icon kamera untuk upload foto produk yang sudah di-screenshot.');
  document.getElementById('pb-tour-desc').innerHTML=desc;
  let nextBtn=document.getElementById('pb-tour-next-btn');
  if(nextBtn) nextBtn.style.display='none';
}
// Dipanggil begitu user pilih foto produk lewat icon kamera di atas. Beda
// dari upload Karakter Sheet (Langkah 4/5) yang filenya sengaja diabaikan,
// di sini fotonya BENERAN dipakai — dibaca jadi data URL supaya bisa
// ditampilkan menggantikan thumbnail Foto Produk di Langkah 2.
function pbStep2bPhotoPicked(input){
  let file=input.files&&input.files[0];
  if(!file)return;
  // FIX (lintas HP): input.value JANGAN dikosongkan sebelum file selesai dibaca — di sebagian
  // WebView/browser vendor Android itu membuat File jadi kosong/tak terbaca (gagal diam-diam).
  let reader=new FileReader();
  reader.onload=function(e){
    pbProdukFotoDataUrl=e.target.result;
    pbProdukFotoUploaded=true;
    pbGoStep2();
  };
  reader.onerror=reader.onabort=function(){showToast('Foto gagal dibaca. Coba pilih foto lagi ya.','error');};
  reader.onloadend=function(){try{input.value='';}catch(e){}};
  reader.readAsDataURL(file);
}
// ── Dipanggil dari csCopyPrompt() (lihat komentar di sana) untuk
// "membangunkan" ulang tampilan tur langsung di Langkah 3 — sama seperti
// pbStartTour() tapi tidak dari Langkah 1. AKTIF DI ALUR UTAMA: begitu
// user salin prompt Karakter Sheet & tekan "Mengerti", tur balik ke sini
// (buka butir no.2: install Google Flow), BUKAN langsung ke pbGoStep4(). ─
function pbBackToStep3(){
  pbDisarmDoneWait();
  clearInterval(pbGenPollTimer);pbGenPollTimer=null;
  clearInterval(pbCopyPollTimer);pbCopyPollTimer=null;
  document.getElementById('pb-tour-backdrop').classList.add('show');
  // Balik dari salin prompt Karakter Sheet → buka butir no.1 (install
  // Google Flow). Kalau entah kenapa udah lebih jauh dari itu, jangan
  // mundurin reveal-nya.
  if(pbStep3Revealed<1) pbStep3Revealed=1;
  pbRenderStep3();
}
// ── Klik teks "Karakter Sheet" di Langkah 3 tur → langsung tutup
// tur & buka modal Karakter Sheet asli (#cs-modal), supaya user bisa
// langsung coba bikin karakter sheet tanpa perlu keluar dulu cari
// tombolnya sendiri di halaman. ──────────────────────────────────
function pbOpenCharacterSheetFromTour(){
  // FITUR BARU (permintaan user): mulai dari sini bar progres bintang
  // ditampilkan pertama kali, menyala di titik "Karakter Sheet".
  pbTourProgressShow(0);
  pbHideOverlay();
  csOpenModal();
  // Tandai: modal ini dibuka dari tur, jadi csCopyPrompt() boleh membawa user
  // balik ke Langkah 3 sesudah salin. Harus SESUDAH csOpenModal() (yang
  // me-nol-kan penanda ini tiap modal dibuka).
  csFromTour=true;
  // Khusus dibuka dari Langkah 3 no.1: sembunyikan tombol "Tutup" biar
  // user gak sengaja nutup modal ini tanpa isi & salin prompt-nya —
  // satu-satunya jalan keluar dari sini adalah beneran salin prompt
  // (csCopyPrompt() → pbBackToStep3(), lihat komentar di sana). Tombol
  // ini otomatis kembali normal lagi kapan pun modal dibuka ulang lewat
  // csOpenModal() (dipakai di luar tur juga).
  let closeBtn=document.getElementById('cs-close-btn');
  if(closeBtn) closeBtn.style.display='none';
}
// ── LANGKAH 3 — modal, install & siapkan Google Flow ─────────────
// REVEAL BERTAHAP: butir no.1–6 di bawah ini TIDAK ditampilkan sekaligus.
// - no.1 tampil duluan (install Google Flow). Butir ini muncul begitu
//   user isi & salin prompt-nya di modal Karakter Sheet (dibuka langsung
//   dari Langkah 2), lewat pbBackToStep3().
// - no.2 s/d no.6 baru nongol satu-satu kalau user tekan tombol
//   "Sudah, lanjut" yang dipasang pbRenderStep3() di ujung butir
//   terakhir yang lagi tampil (lihat pbStep3RevealNext()).
// Isi tiap butir sengaja dipecah ke array PB_STEP3_ITEMS supaya
// pbRenderStep3() tinggal menyambung sejumlah pbStep3Revealed butir.
// (Butir lama "no.1 — tombol buka Karakter Sheet" sudah DIHAPUS dari
// array ini karena aksi buka Karakter Sheet sekarang sudah dilakukan
// lebih awal, langsung dari tombol "Lanjut" di Langkah 2 — lihat
// pbOpenCharacterSheetFromTour(). Nomor butir di bawah digeser mundur
// satu (yang dulu no.2 sekarang jadi no.1, dst).)
// FITUR BARU (permintaan user): struktur butir disamakan dengan
// PB_STEP6EXT_ITEMS (step "Foto AI") — objek {title, body, img, alt}
// supaya judul bernomor tampil terpisah lewat pbShowModal(), bukan
// ditulis manual di dalam teks body seperti sebelumnya.
var PB_VID_KS_FLOW='media/karakter-sheet-google-flow.mp4';
// PERMINTAAN USER: 6 butir tulisan+screenshot (install Google Flow s/d unduh hasil karakter sheet) DIGANTI 1 butir VIDEO panduan. Video memakai pemutar tur yang sama
// dengan video "foto produk" (pbVidPlayerHtml). Setelah "Lanjut" → pbGoStep4 (upload foto).
var PB_STEP3_ITEMS=[
  {
    title:'Ikutin step by step setiap langkah yang ada di vidio dibawah ini.',
    body:'',
    video:PB_VID_KS_FLOW,
    note:'Kalau sudah selesai dan fotonya sudah diunduh, klik "Lanjut".'
  }
];

// Dipanggil pertama kali masuk Langkah 3 (dari Langkah 2) — mulai dari
// no.1 doang, reveal-nya direset dari awal.
function pbGoStep3(){
  pbSaveTourStepState('pbGoStep3');
  pbStep3Revealed=1;
  pbRenderStep3();
}
// FITUR BARU (permintaan user): render SATU butir aktif (index
// pbStep3Revealed-1) — total mengganti kartu tur, bukan numpuk ke
// bawah. Judul bernomor ("1. ...", "2. ...") dirender lewat
// pbShowModal() persis seperti pbRenderStep6Ext() (step "Foto AI"),
// dan tombol "Kembali ke langkah sebelumnya" muncul begitu bukan
// butir pertama — sama persis pola & gaya tombolnya.
function pbRenderStep3(){
  let item=PB_STEP3_ITEMS[pbStep3Revealed-1];
  let isLast=(pbStep3Revealed>=PB_STEP3_ITEMS.length);
  let desc=item.body
    + (item.video?pbVidPlayerHtml(item.video):pbFrameShot(item.img,item.alt))
    + (item.note?('<p style="font-size:var(--fs-xs2);color:var(--muted);margin:10px 0 0;line-height:1.65;">'+item.note+'</p>'):'');
  pbShowModal(4,(PB_STEP3_ITEMS.length>1?pbStep3Revealed+'. ':'')+item.title,desc,'Lanjut',isLast?function(){pbStep2bVidStop();pbGoStep4();}:pbStep3RevealNext);
  pbGlowTitle();
  // PERMINTAAN USER: tombol "Kembali" dipasang di footer tur, di samping
  // "Lanjut" (bukan lagi tombol lebar penuh di bawah isi kartu). Muncul
  // begitu bukan butir pertama.
  if(pbStep3Revealed>1) pbTourShowBack(pbStep3RevealBack);
  // Kartu tur (#pb-tour-card) scroll sendiri kalau butirnya panjang
  // (overflow-y:auto) — begitu ganti butir, balikin ke atas dulu supaya
  // user tidak nyangkut di posisi scroll butir sebelumnya.
  let tourCard=document.getElementById('pb-tour-card');
  if(tourCard) tourCard.scrollTop=0;
}
// Tombol "Lanjut" per-halaman — pindah ke 1 butir berikutnya (no.2,
// no.3, dst), GANTI TOTAL tampilan butir sebelumnya.
function pbStep3RevealNext(){
  if(pbStep3Revealed<PB_STEP3_ITEMS.length) pbStep3Revealed++;
  pbRenderStep3();
}
// FITUR BARU (permintaan user): tombol "Kembali ke langkah
// sebelumnya" — mundur satu butir kalau user mau lihat lagi
// instruksi sebelumnya, sama seperti pbStep6ExtBack() di step
// "Foto AI".
function pbStep3RevealBack(){
  if(pbStep3Revealed>1) pbStep3Revealed--;
  pbRenderStep3();
}
// ── LANGKAH 6 (BARU) — panduan bikin FOTO AI di Google Flow setelah
// KEDUA bahan (Karakter Sheet + Produk) siap. Beda dari kartu Langkah 3
// (install Google Flow) yang butirnya numpuk ke bawah lewat scroll,
// di sini SETIAP butir gantiin total tampilan sebelumnya (bukan
// numpuk) begitu user klik "Lanjut", dan user BISA balik ke butir
// sebelumnya lewat tombol "Kembali" kalau ada yang belum dimengerti.
// Dipicu dari pbGoStep2Next() begitu kedua bahan sudah lengkap. ──────
var pbStep6ExtIndex=0;
var PB_STEP6EXT_ITEMS=[
  {
    title:'Ikutin setiap langkah dalam video di bawah untuk membuat foto AI.',
    body:'<p style="margin-top:0;">Sekarang kita akan bikin foto AI, karena udah punya 2 bahan beserta prompt-nya. Sekarang buka aplikasi Google Flow dan klik "+ Baru".</p>',
    img:PB_IMG_S1,
    alt:'Buka Google Flow lalu klik + Baru'
  },
  {
    title:'Klik tanda (+)',
    body:'<p style="margin-top:0;">Klik tanda (+) supaya tombol "Upload" muncul.</p>',
    img:PB_IMG_S2,
    alt:'Klik tanda plus di pojok kiri bawah'
  },
  {
    title:'Upload bahannya',
    body:'<p style="margin-top:0;">Klik tombol Upload, dan ambil foto bahannya (foto Karakter Sheet dan foto Produk).</p>',
    img:PB_IMG_S3,
    alt:'Klik tombol Upload lalu ambil foto bahan'
  },
  {
    title:'Klik tanda (+) lagi',
    body:'<p style="margin-top:0;">Ketika bahannya sudah ter-upload, klik tanda (+) yang ada di pojok kiri bawah.</p>',
    img:PB_IMG_S4,
    alt:'Klik tanda plus setelah bahan ter-upload'
  },
  {
    title:'Pilih bahannya sesuai urutan',
    body:'<p style="margin-top:0;">Pilih foto Karakter Sheet dulu, setelah itu baru pilih foto Produk. Pastikan urutannya sesuai.</p>',
    img:PB_IMG_S5,
    alt:'Pilih foto Karakter Sheet lalu foto Produk'
  },
  {
    title:'Cek urutan & tempel prompt',
    body:'<p style="margin-top:0;">Pastikan foto Karakter Sheet dan foto Produk sesuai dengan di bawah, yaitu muncul sebagai kotak kecil dan urutannya sesuai. Dan jangan lupa tempel "prompt" di bawahnya.</p>',
    img:PB_IMG_S6,
    alt:'Cek urutan kotak kecil bahan lalu tempel prompt'
  },
  {
    title:'Klik tombol Gambar',
    body:'<p style="margin-top:0;">Klik tombol (Gambar) untuk meng-edit.</p>',
    img:PB_IMG_S7,
    alt:'Klik tombol Gambar untuk mengedit pengaturan'
  },
  {
    title:'Atur sesuai contoh',
    body:'<p style="margin-top:0;">Sesuaikan aja seperti foto di bawah ini ya:</p>',
    img:PB_IMG_S8,
    alt:'Contoh pengaturan rasio, jumlah, dan model',
    note:'Boleh juga disesuaikan dengan selera.'
  },
  {
    title:'Klik tombol panah',
    body:'<p style="margin-top:0;">Klik tombol (panah kanan) untuk generate.</p>',
    img:PB_IMG_S9,
    alt:'Klik tombol panah kanan untuk generate'
  },
  {
    title:'Tunggu & unduh hasilnya',
    body:'<p style="margin-top:0;">Tunggu sampai selesai dan download 1 foto yang paling bagus.</p>',
    img:PB_IMG_S10,
    alt:'Pilih dan unduh 1 foto hasil generate'
  }
];
// FIX (dilaporkan user): DULU dipanggil dari pbGoStep2Next() begitu KEDUA
// bahan (produk + karakter sheet) sudah lengkap — tapi itu SALAH URUTAN
// karena butir ke-6 tutorial ini minta user nempel "prompt" Foto AI yang
// waktu itu belum pernah dibuat. SEKARANG dipanggil belakangan, dari
// dalam pbShowSaveJsonNotif() — persis setelah user benar-benar sudah
// menyalin prompt Foto AI hasil wizard (Salin JSON), jadi butir "tempel
// prompt di bawahnya" itu baru masuk akal.
function pbGoStep6Ext(){
  pbSaveTourStepState('pbGoStep6Ext');
  // FITUR BARU (permintaan user): prompt Foto AI sudah jadi & disalin,
  // bar progres bintang lanjut menyala ke titik "Foto AI".
  pbTourProgressShow(2);
  // PERMINTAAN USER: tutorial "Yuk, bikin foto AI-nya" tampil sebagai
  // HALAMAN PENUH, bukan kartu melayang di atas layar wizard. Selama
  // Langkah 5-6 (wizard) backdrop solid tur sengaja dilepas 'show'-nya
  // (lihat pbGoStep5), dan tidak ada yang memasangnya lagi sebelum ini —
  // makanya dulu kelihatan seperti overlay. Di sini backdrop-nya
  // dinyalakan lagi supaya latarnya solid penuh persis seperti
  // langkah-langkah tur lain.
  let bd=document.getElementById('pb-tour-backdrop');
  if(bd){ bd.classList.remove('pb-passive'); bd.classList.add('show'); }
  pbStep6ExtIndex=0;
  pbRenderStep6Ext();
}
// Render SATU butir aktif (index pbStep6ExtIndex) — total mengganti
// kartu tur, bukan numpuk ke bawah kayak Langkah 3. Tombol "Kembali"
// cuma muncul kalau bukan butir pertama.
function pbRenderStep6Ext(){
  // PERMINTAAN USER: butir 1-10 (PB_STEP6EXT_ITEMS, foto+teks per langkah)
  // diganti SATU video panduan (PB_VID_FOTO_AI). Array butir lama sengaja
  // dibiarkan sebagai referensi, tapi tidak dipakai lagi. "Lanjut" langsung
  // ke layar upload Foto AI (pbGoStep6ExtUpload).
  pbShowModal(6,'Ikutin setiap langkah dalam video di bawah untuk membuat foto AI.',pbVidPlayerHtml(PB_VID_FOTO_AI),'Lanjut',pbStep6ExtFinish);
  pbGlowTitle();
  let tourCard=document.getElementById('pb-tour-card');
  if(tourCard) tourCard.scrollTop=0;
}
// Tombol "Lanjut" — pindah ke butir berikutnya (GANTI tampilan total,
// bukan nambah di bawah butir sebelumnya).
function pbStep6ExtNext(){
  if(pbStep6ExtIndex<PB_STEP6EXT_ITEMS.length-1){
    pbStep6ExtIndex++;
    pbRenderStep6Ext();
  }
}
// Tombol "Kembali" — balik ke butir sebelumnya kalau ada yang belum
// dimengerti user.
function pbStep6ExtBack(){
  if(pbStep6ExtIndex>0){
    pbStep6ExtIndex--;
    pbRenderStep6Ext();
  }
}
// Butir terakhir (no.10) selesai — FIX (permintaan user): dulu di sini
// langsung tutup tur (pbEndTour()) tanpa minta user upload hasil Foto
// AI-nya sama sekali. Sekarang minta upload dulu (pola sama seperti
// Langkah 4 upload Karakter Sheet) — lihat pbGoStep6ExtUpload() di bawah.
// Tur BENERAN ditutup nanti kalau user klik "Lanjut" lagi di Langkah 2
// begitu Foto AI sudah lengkap (lihat pbGoStep2Next()).
function pbStep6ExtFinish(){
  pbGoStep6ExtUpload();
}
// ── Upload hasil Foto AI dari Google Flow — pola SAMA PERSIS seperti
// pbGoStep4() (upload Karakter Sheet): icon kamera → animasi logo P
// nyatu → kartu disembunyikan → notifikasi premium (pbStep6ExtShowSuccessNotif)
// muncul. Tap "Lanjut" pada notifikasi itu SENGAJA memakai ulang
// pbStep4NotifTap() yang sudah ada (bukan fungsi baru) — perilakunya
// persis yang dibutuhkan di sini juga: sembunyikan notif & balik ke
// Langkah 2 (pbGoStep2()), supaya thumbnail Foto AI di diagram Langkah 2
// sudah tergantikan foto asli + centang hijau.
function pbGoStep6ExtUpload(){
  pbSaveTourStepState('pbGoStep6ExtUpload');
  let desc = '<p style="margin-top:0;">Coba liat foto AI yang kamu buat...</p>'
    + '<input type="file" accept="image/*" id="pb-step6ext-photo-input" style="position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none;" onchange="pbStep6ExtPhotoPicked(this)">'
    + '<div style="display:flex;justify-content:center;margin:18px 0 4px;">'
    + '<div style="position:relative;width:64px;height:64px;">'
    + '<div onclick="document.getElementById(\'pb-step6ext-photo-input\').click()" id="pb-step6ext-photo-btn" style="position:absolute;inset:0;border-radius:50%;background:var(--surface2);border:1px solid var(--border-hi);display:flex;align-items:center;justify-content:center;cursor:pointer;">'
    + '<svg class="icon" style="width:28px;height:28px;color:var(--accent);"><use href="#ic-camera"></use></svg>'
    + '</div>'
    + '<div class="gen-logo-wrap hidden" id="pb-step6ext-logo-wrap" style="position:absolute;inset:0;width:auto;padding:0;">'
    + '<div class="gen-logo-box" style="width:64px;height:64px;">'
    + '<svg class="gen-logo-svg" viewBox="0 0 642 635" style="width:34px;height:34px;" xmlns="http://www.w3.org/2000/svg">'
    + '<defs><linearGradient id="pbStep6ExtPGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F0D9A0"/><stop offset="100%" stop-color="#B8965F"/></linearGradient></defs>'
    + '<path class="p-layer p-layer-back" pathLength="1" fill="url(#pbStep6ExtPGrad)" d="M146,92 L162,109 L179,119 L194,124 L206,126 L346,127 L373,134 L395,146 L386,133 L365,114 L343,102 L318,94 L306,92 Z M349,92 L361,96 L383,109 L401,126 L407,134 L417,154 L420,168 L431,184 L439,201 L444,219 L445,231 L481,231 L479,213 L470,183 L460,163 L443,140 L426,124 L402,108 L381,99 Z M253,195 L267,188 L293,183 L335,183 L345,185 L362,193 L375,205 L382,216 L387,229 L396,208 L399,184 L398,177 L379,162 L355,152 L331,149 L312,153 L285,166 L271,176 Z M291,150 L271,154 L251,161 L237,168 L216,182 L192,207 L182,223 L174,243 L169,271 L169,553 L203,534 L203,268 L208,239 L217,216 L233,192 L261,166 L277,156 Z M481,253 L445,253 L441,277 L435,293 L419,317 L403,333 L387,344 L370,352 L345,358 L279,359 L279,394 L325,394 L364,390 L391,381 L419,365 L447,339 L465,312 L477,281 Z"/>'
    + '<path class="p-layer p-layer-front" pathLength="1" fill="url(#pbStep6ExtPGrad)" d="M415,201 L407,228 L397,245 L386,256 L383,267 L377,277 L360,293 L339,301 L259,302 L258,210 L243,224 L236,234 L227,254 L224,271 L224,519 L233,513 L249,497 L258,485 L258,337 L345,335 L364,330 L378,323 L393,312 L402,303 L413,287 L418,276 L423,257 L423,227 Z"/>'
    + '</svg>'
    + '</div>'
    + '</div>'
    + '</div>';
  pbShowModal(6,'',desc,'Lanjut',pbGoStep2);
  let nextBtn=document.getElementById('pb-tour-next-btn');
  if(nextBtn) nextBtn.style.display='none';
}
// Dipanggil begitu user pilih foto hasil Foto AI dari galeri lewat icon
// kamera di atas. Sama seperti pbStep4PhotoPicked() — fotonya BENERAN
// dipakai (dibaca jadi data URL) buat menggantikan thumbnail "Foto AI"
// di Langkah 2.
function pbStep6ExtPhotoPicked(input){
  let file=input.files&&input.files[0];
  if(!file)return;
  let reader=new FileReader();
  reader.onload=function(e){
    pbFotoAiDataUrl=e.target.result;
    pbFotoAiUploaded=true;
  };
  reader.onerror=reader.onabort=function(){
    showToast('Foto gagal dibaca. Coba pilih foto lagi ya.','error');
    let cb=document.getElementById('pb-step6ext-photo-btn'); if(cb) cb.classList.remove('hidden');
  };
  reader.onloadend=function(){try{input.value='';}catch(e){}};
  reader.readAsDataURL(file);
  let camBtn=document.getElementById('pb-step6ext-photo-btn');
  if(camBtn) camBtn.classList.add('hidden');
  let logoWrap=document.getElementById('pb-step6ext-logo-wrap');
  if(logoWrap){
    logoWrap.classList.remove('hidden');
    logoWrap.classList.remove('merged');
    void logoWrap.offsetWidth;
    setTimeout(function(){ logoWrap.classList.add('merged'); },300);
  }
  setTimeout(function(){
    pbStep6ExtShowSuccessNotif();
  },1400);
}
// Sama persis pola & elemen dengan pbStep4ShowSuccessNotif() (cuma beda
// pesannya) — tombol CTA notifikasi ini SUDAH terpasang lewat HTML
// (onclick="pbStep4NotifTap()"), jadi tap-nya otomatis balik ke Langkah 2
// tanpa perlu fungsi tap baru.
function pbStep6ExtShowSuccessNotif(){
  document.getElementById('pb-tour-card').classList.remove('show');
  document.getElementById('pb-tour-backdrop').classList.remove('pb-passive');
  document.getElementById('pb-tour-backdrop').classList.add('show');
  document.getElementById('pb-tour-spot').classList.remove('show','pb-airy');
  window.removeEventListener('resize',pbRepositionCurrent);
  let shellEl=document.getElementById('app-shell');
  if(shellEl) shellEl.removeEventListener('scroll',pbRepositionCurrent);
  // PERMINTAAN USER: sama persis seperti notifikasi Karakter Sheet —
  // tampil meriah (confetti + medali centang + judul pujian), tanpa logo
  // P / tulisan "Prompt Builder" / jam "sekarang".
  pbPnShowCelebration(
    'Mantap, kak! 🎊',
    'Yeyyy Foto AI-nya jadi kak, simpan baik-baik karna ini yang bakal kita pakai buat bikin Video AI-nya nanti'
  );
}
// ── State: apakah foto hasil Foto AI (dari Google Flow, sesudah tutorial
// Langkah 6) sudah diupload lewat pbGoStep6ExtUpload() di atas. Begitu
// true, thumbnail "Foto AI" di Langkah 2 diganti foto asli + centang
// hijau, dan tombol "Lanjut" di Langkah 2 tidak lagi masuk ke wizard
// (pbGoStep5) lagi — melainkan menutup tur (lihat pbGoStep2Next()). ──
var pbFotoAiUploaded=false;
var pbFotoAiDataUrl=null;

// ── LANGKAH 4 — upload foto hasil Karakter Sheet dari Google Flow ──
function pbGoStep4(){
  pbSaveTourStepState('pbGoStep4');
  let desc = '<p style="margin-top:0;">Upload foto karakter sheet disini.</p>'
    + '<input type="file" accept="image/*" id="pb-step4-photo-input" style="position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none;" onchange="pbStep4PhotoPicked(this)">'
    // FIX (dilaporkan user — klik icon kamera gak ngapa-ngapain): sebelumnya
    // pakai <label for="..."> buat mancing klik ke input file tersembunyi.
    // Diganti pola yang sama kayak upload foto lain di app (lihat
    // #vb-produk-foto-empty dkk) — div biasa yang manggil .click() ke
    // input-nya langsung lewat onclick, jauh lebih konsisten & ke-uji.
    // Icon kamera & animasi logo P DITUMPUK di posisi yang sama (satu
    // wrapper relative, dua layer absolute) supaya kelihatan "gantian"
    // pas ditoggle lewat class hidden, bukan lompat posisi.
    + '<div style="display:flex;justify-content:center;margin:18px 0 4px;">'
    + '<div style="position:relative;width:64px;height:64px;">'
    + '<div onclick="document.getElementById(\'pb-step4-photo-input\').click()" id="pb-step4-photo-btn" style="position:absolute;inset:0;border-radius:50%;background:var(--surface2);border:1px solid var(--border-hi);display:flex;align-items:center;justify-content:center;cursor:pointer;">'
    + '<svg class="icon" style="width:28px;height:28px;color:var(--accent);"><use href="#ic-camera"></use></svg>'
    + '</div>'
    // Logo "P" branding (2 layer, sama persis kayak animasi loading
    // Generate & splash screen) — mulai disembunyikan (class hidden),
    // baru dimunculkan pbStep4PhotoPicked() gantiin icon kamera begitu
    // user pilih foto, lalu class "merged" bikin dia nyatu jadi utuh.
    + '<div class="gen-logo-wrap hidden" id="pb-step4-logo-wrap" style="position:absolute;inset:0;width:auto;padding:0;">'
    + '<div class="gen-logo-box" style="width:64px;height:64px;">'
    + '<svg class="gen-logo-svg" viewBox="0 0 642 635" style="width:34px;height:34px;" xmlns="http://www.w3.org/2000/svg">'
    + '<defs><linearGradient id="pbStep4PGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F0D9A0"/><stop offset="100%" stop-color="#B8965F"/></linearGradient></defs>'
    + '<path class="p-layer p-layer-back" pathLength="1" fill="url(#pbStep4PGrad)" d="M146,92 L162,109 L179,119 L194,124 L206,126 L346,127 L373,134 L395,146 L386,133 L365,114 L343,102 L318,94 L306,92 Z M349,92 L361,96 L383,109 L401,126 L407,134 L417,154 L420,168 L431,184 L439,201 L444,219 L445,231 L481,231 L479,213 L470,183 L460,163 L443,140 L426,124 L402,108 L381,99 Z M253,195 L267,188 L293,183 L335,183 L345,185 L362,193 L375,205 L382,216 L387,229 L396,208 L399,184 L398,177 L379,162 L355,152 L331,149 L312,153 L285,166 L271,176 Z M291,150 L271,154 L251,161 L237,168 L216,182 L192,207 L182,223 L174,243 L169,271 L169,553 L203,534 L203,268 L208,239 L217,216 L233,192 L261,166 L277,156 Z M481,253 L445,253 L441,277 L435,293 L419,317 L403,333 L387,344 L370,352 L345,358 L279,359 L279,394 L325,394 L364,390 L391,381 L419,365 L447,339 L465,312 L477,281 Z"/>'
    + '<path class="p-layer p-layer-front" pathLength="1" fill="url(#pbStep4PGrad)" d="M415,201 L407,228 L397,245 L386,256 L383,267 L377,277 L360,293 L339,301 L259,302 L258,210 L243,224 L236,234 L227,254 L224,271 L224,519 L233,513 L249,497 L258,485 L258,337 L345,335 L364,330 L378,323 L393,312 L402,303 L413,287 L418,276 L423,257 L423,227 Z"/>'
    + '</svg>'
    + '</div>'
    + '</div>'
    + '</div>'
    + '</div>';
  pbShowModal(4,'',desc,'Lanjut',pbGoStep5);
  let nextBtn=document.getElementById('pb-tour-next-btn');
  if(nextBtn) nextBtn.style.display='none';
}
// Dipanggil begitu user pilih file dari galeri lewat icon kamera di
// Langkah 4. Fotonya DIBACA jadi data URL (supaya bisa dipakai gantiin
// thumbnail "Foto Karakter Sheet" di Langkah 2 begitu user balik ke
// sana), sekaligus dipakai sebagai trigger buat urutan animasi: icon
// kamera hilang → logo P nongol dalam keadaan terpisah → nyatu (kesannya
// loading) → KARTU LANGKAH 4 DISEMBUNYIKAN → notifikasi premium
// bermerek muncul menggantikan tulisan pujian, lalu begitu tombol
// "Lanjut" di notifikasi ditekan, tur balik ke Langkah 2 (lihat
// pbStep4NotifTap()).
// FITUR BARU (permintaan user): sinkronkan thumbnail foto Karakter Sheet
// di pojok kanan-atas kartu "Subjek Foto" (#f0) — tampil begitu
// pbKsFotoUploaded true & pbKsFotoDataUrl terisi, disembunyikan lagi
// kalau belum/tidak ada datanya (mis. sebelum diupload, atau habis
// Undo). Dipanggil dari beberapa titik supaya selalu sinkron: begitu
// foto Langkah 4 selesai diupload, begitu tur pindah ke wizard f0
// (pbGoStep5), begitu tab "Foto" dibuka (switchPage), dan sekali lagi
// begitu state draft/sinkron selesai dipulihkan pas app baru dimuat.
function pbF0KsThumbSync(){
  let box=document.getElementById('f0-ks-thumb');
  let img=document.getElementById('f0-ks-thumb-img');
  if(!box||!img)return;
  if(typeof pbKsFotoUploaded!=='undefined' && pbKsFotoUploaded && pbKsFotoDataUrl){
    img.src=pbKsFotoDataUrl;
    box.style.display='block';
  }else{
    box.style.display='none';
    img.src='';
  }
}
function pbStep4PhotoPicked(input){
  let file=input.files&&input.files[0];
  if(!file)return;
  // FIX: pujian dulu muncul PERSIS 1,4 detik sesudah foto dipilih, tak peduli
  // fotonya sudah/gagal terbaca — foto gagal dibaca tetap dipuji padahal tur
  // menganggap fotonya belum ada (pbKsFotoUploaded=false), dan di HP lambat
  // pujian bisa muncul SEBELUM foto selesai dibaca. Sekarang pujian baru
  // muncul kalau animasi logo tuntas DAN foto sudah terbaca. Kalau gagal
  // dibaca: animasi dibatalkan, tombol kamera kembali, user pilih foto lagi.
  let animSelesai=false, fotoTerbaca=false, fotoGagal=false, beres=false;
  function tuntaskan(){
    if(beres)return;
    if(fotoGagal){
      beres=true;
      let lw=document.getElementById('pb-step4-logo-wrap');
      if(lw){lw.classList.add('hidden');lw.classList.remove('merged');}
      let cb=document.getElementById('pb-step4-photo-btn');
      if(cb)cb.classList.remove('hidden');
      showToast('Foto gagal dibaca. Coba pilih foto lagi ya.','error');
      return;
    }
    if(animSelesai&&fotoTerbaca){beres=true;pbStep4ShowSuccessNotif();}
  }
  let reader=new FileReader();
  reader.onload=function(e){
    pbKsFotoDataUrl=e.target.result;
    pbKsFotoUploaded=true;
    fotoTerbaca=true;
    try{pbF0KsThumbSync();}catch(err){}
    tuntaskan();
  };
  reader.onerror=reader.onabort=function(){fotoGagal=true;tuntaskan();};
  reader.onloadend=function(){try{input.value='';}catch(e){}};
  reader.readAsDataURL(file);
  let camBtn=document.getElementById('pb-step4-photo-btn');
  if(camBtn) camBtn.classList.add('hidden');
  let logoWrap=document.getElementById('pb-step4-logo-wrap');
  if(logoWrap){
    logoWrap.classList.remove('hidden');
    logoWrap.classList.remove('merged');
    // Paksa reflow dulu supaya state "terpisah" ke-render duluan,
    // baru class "merged" ditambahkan — sama seperti pola splash
    // screen & tombol Generate (lihat komentar di sana).
    void logoWrap.offsetWidth;
    setTimeout(function(){ logoWrap.classList.add('merged'); },300);
  }
  // Transisi p-layer 1.1s + jeda 300ms sebelum "merged" ditambahkan =
  // animasi beneran tuntas nyatu di ~1400ms — baru di situ (kalau foto juga
  // sudah terbaca) kartu Langkah 4 disembunyikan & notifikasi premium tampil.
  setTimeout(function(){ animSelesai=true; tuntaskan(); },1400);
}
// Menyembunyikan kartu tur Langkah 4 (beserta backdrop & spotlight-nya)
// lalu menampilkan notifikasi premium bermerek berisi tulisan pujian.
// Notifikasi TIDAK auto-hilang — cuma hilang & tur lanjut ke Langkah 5
// kalau user tap tombol CTA-nya (lihat pbStep4NotifTap).
function pbStep4ShowSuccessNotif(){
  // Sembunyikan kartu Langkah 4 & spotlight-nya — TANPA mengakhiri tur
  // (beda dari pbEndTour/pbHideOverlay yang juga melepas lock chip &
  // timer lain yang tidak relevan di sini).
  // FIX (dilaporkan user — background di belakang notifikasi jadi TIDAK
  // blur): sebelumnya #pb-tour-backdrop ikut dilepas 'show'-nya di sini,
  // padahal blur+gelapnya app justru datang dari situ. Backdrop-nya
  // WAJIB tetap 'show' selama notifikasi tampil — cuma card & spot saja
  // yang disembunyikan.
  document.getElementById('pb-tour-card').classList.remove('show');
  document.getElementById('pb-tour-backdrop').classList.remove('pb-passive');
  document.getElementById('pb-tour-backdrop').classList.add('show');
  document.getElementById('pb-tour-spot').classList.remove('show','pb-airy');
  // FIX BUG (dilaporkan user — kartu Langkah 4 balik muncul lagi
  // ketutupan/di-belakang notifikasi): pbShowModal() di pbGoStep4()
  // masih nempelin listener resize/scroll ke pbRepositionCurrent, yang
  // manggil pbPositionSpot(null) dan itu SELALU nge-add class 'show' ke
  // card & spot lagi. Di HP, nutup file-picker sesudah pilih foto sering
  // memicu event resize — jadi kartu balik nongol lagi persis sesudah
  // baris di atas menyembunyikannya. Listener-nya wajib dilepas di sini,
  // baru dipasang ulang lagi nanti pas pbGoStep5()/pbShowInteractive().
  window.removeEventListener('resize',pbRepositionCurrent);
  let shellEl=document.getElementById('app-shell');
  if(shellEl) shellEl.removeEventListener('scroll',pbRepositionCurrent);

  // PERMINTAAN USER: tampilannya sekarang meriah (confetti + medali
  // centang + judul pujian), bukan lagi kartu bermerek berlogo P.
  pbPnShowCelebration(
    'Keren banget, kak! 🎉',
    'Yeyyy fotonya bagus banget kak, simpan baik-baiknya karna kedepannya kita bakal pakek terus foto karakter sheet-nya'
  );
}
// ── Tampilan perayaan notifikasi pujian (permintaan user) ───────────────
// Satu pintu buat DUA tempat yang polanya sama: sesudah upload foto
// Karakter Sheet (Langkah 4) dan sesudah upload foto AI (Langkah 6).
// Isi judul + pesan di-set di sini, confetti-nya dibikin ulang tiap kali
// supaya animasinya selalu mulai dari awal, baru notifikasi ditampilkan.
function pbPnShowCelebration(title,msg){
  // PERMINTAAN USER: tidak mau ada layar perayaan lagi. Langsung lanjut
  // seperti user sudah menekan "Lanjut" di notifikasi (kembali ke Langkah 2).
  pbStep4NotifTap();
}
// Bikin butiran confetti (elemen <i>) dengan posisi, warna, kecepatan,
// putaran & jeda acak. Dibersihkan lagi lewat pbPnClearConfetti() begitu
// notifikasi ditutup, supaya tidak ada animasi yang jalan sia-sia di
// belakang layar.
function pbPnSpawnConfetti(){
  let box=document.getElementById('pb-pn-confetti');
  if(!box) return;
  box.innerHTML='';
  let colors=['#F0D9A0','#B8965F','#FFF6DF','#E8C77A','#8FD6A8','#7FB6F0','#E88FA8'];
  for(let i=0;i<48;i++){
    let p=document.createElement('i');
    p.style.left=(Math.random()*100).toFixed(2)+'%';
    p.style.background=colors[i%colors.length];
    p.style.setProperty('--dx',(Math.random()*180-90).toFixed(0)+'px');
    p.style.setProperty('--rot',(Math.random()*900-300).toFixed(0)+'deg');
    p.style.animationDuration=(2.6+Math.random()*2.4).toFixed(2)+'s';
    p.style.animationDelay=(Math.random()*1.3).toFixed(2)+'s';
    // Sebagian dibikin bulat kecil biar variasinya kelihatan alami
    if(i%3===0){ p.style.width='8px'; p.style.height='8px'; p.style.borderRadius='50%'; }
    box.appendChild(p);
  }
}
function pbPnClearConfetti(){
  let box=document.getElementById('pb-pn-confetti');
  if(box) box.innerHTML='';
}
// Dipanggil HANYA saat user tap tombol CTA "Lanjut" di notifikasi —
// menutup notifikasi lalu tur BALIK ke Langkah 2 (bukan lanjut ke
// Langkah 5) supaya user lihat foto Karakter Sheet yang baru diupload
// sudah menggantikan thumbnail-nya di diagram Langkah 2.
function pbStep4NotifTap(){
  let notif=document.getElementById('pb-premium-notif');
  if(notif) notif.classList.remove('show');
  // Hentikan hujan confetti-nya supaya tidak ada animasi yang terus
  // jalan di belakang layar sesudah notifikasi hilang.
  if(typeof pbPnClearConfetti==='function') pbPnClearConfetti();
  // Jaga-jaga: pastikan backdrop tur tetap "show" (harusnya memang sudah,
  // karena tidak lagi dilepas saat notifikasi tampil) supaya Langkah 2
  // dst normal seperti biasa.
  document.getElementById('pb-tour-backdrop').classList.add('show');
  pbGoStep2();
}
// ── LIGHTBOX diagram Langkah 2 — buka preview lebih besar saat salah
// satu kotak (karakter sheet/produk/foto AI/video AI) di-tap. `el` yang
// dikirim adalah elemen .pb-flow-thumb itu sendiri; src gambar/video &
// label diambil dari situ (bukan di-hardcode di HTML) supaya base64-nya
// nggak perlu diduplikat ke dalam atribut onclick.
// Kotak Video AI isinya <video>, 3 kotak lain isinya <img> — jadi cuma
// salah satu dari #pb-flow-lightbox-img / #pb-flow-lightbox-video yang
// ditampilin, tergantung mana yang ketemu di dalam elemen yang di-tap.
// ── TUTORIAL BAHAN (6 Nov 2026) — ikon video kecil di samping Foto AI / Karakter Sheet / Foto Produk
// pada lightbox Video AI mode Start Frame. Isi URL video di PB_TUTORIAL_VIDEOS kalau videonya sudah
// jadi (mis. fotoai:'media/tutorial-fotoai.mp4'). Selama masih kosong, ikon menampilkan "video segera hadir".
// Video tutorial disimpan di folder media/ (GitHub), sejajar dengan index.html.
window.PB_TUTORIAL_VIDEOS={startframe:'media/tutorial-startframe-v2-720p.mp4',fotoai:'media/tutorial-fotoai.mp4',karaktersheet:'media/tutorial-karaktersheet.mp4',produk:'media/tutorial-produk.mp4'};
window.PB_FLOW_EXTRA={startframe:{tut:'fotoai',mats:[
  {label:'Karakter Sheet',tut:'karaktersheet',side:'left',src:function(){return typeof PB_IMG_FLOW_KARAKTERSHEET!=='undefined'?PB_IMG_FLOW_KARAKTERSHEET:'';}},
  {label:'Foto Produk',tut:'produk',side:'right',src:function(){return typeof PB_IMG_FLOW_PRODUK!=='undefined'?PB_IMG_FLOW_PRODUK:'';}}
]}};
// Percakapan 2 Suara: resep sama dengan Start Frame, tapi foto-fotonya (slot PB_IMG_VBDUA_*) kosong dulu. Kunci tutorial dua_* belum ada di PB_TUTORIAL_VIDEOS -> tampil "video segera hadir".
window.PB_FLOW_EXTRA.dua={tut:'dua_fotoai',mats:[
  {label:'Karakter Sheet',tut:'dua_karaktersheet',side:'left',src:function(){return window.PB_IMG_VBDUA_KARAKTERSHEET||'';}},
  {label:'Foto Produk',tut:'dua_produk',side:'right',src:function(){return window.PB_IMG_VBDUA_PRODUK||'';}}
]};
function pbTutBtnHtml(key,name){
  return '<button type="button" class="pb-flow-tut" data-tut="'+key+'" aria-label="Tutorial '+(name||'')+'"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 1.2v9.6L10.6 6z"/></svg></button>';
}
function pbTutOpen(key,ariaLabel){
  let box=document.getElementById('pb-flow-sublightbox');
  let bi=document.getElementById('pb-flow-sublightbox-img');
  let bv=document.getElementById('pb-flow-sublightbox-video');
  let bl=document.getElementById('pb-flow-sublightbox-label');
  if(!box||!bl)return;
  try{let mv=document.getElementById('pb-flow-lightbox-video');if(mv&&!mv.paused){mv.pause();window._pbTutResumeMain=true;}}catch(e){}
  let src=(window.PB_TUTORIAL_VIDEOS||{})[key]||'';
  let nama=(ariaLabel||'Tutorial').replace(/^Tutorial\s*/,'');
  if(bi)bi.style.display='none';
  if(src&&bv){
    bv.onerror=function(){bv.style.display='none';bl.textContent='Tutorial '+nama+' — video tidak ditemukan. Pastikan folder media/ ada di samping index.html.';};
    bv.src=src;bv.controls=true;bv.muted=false;bv.currentTime=0;
    bv.onclick=function(e){e.stopPropagation();};
    bv.style.display='block';
    try{let pp=bv.play();if(pp&&pp.catch)pp.catch(function(){});}catch(e){}
    bl.textContent='Tutorial '+nama;
  }else{
    if(bv){try{bv.pause();}catch(e){} bv.removeAttribute('src');bv.style.display='none';}
    bl.textContent='Tutorial '+nama+' — video segera hadir';
  }
  box.classList.add('show');
}
// ── TUTORIAL START FRAME — tampilan "Resep" (opsi B). Dirender ke #pb-flow-lightbox-subwrap; kotak Video AI memakai media utama lightbox (dipindah ke bawah lewat CSS order).
function pbRecipeTile(src,label,tut,w){
  return '<div class="pb-flow-lightbox-subcol rc-item"><div class="rc-tile" style="--w:'+w+'px">'+(src?'<img class="pb-flow-lightbox-subimg" src="'+src+'" alt="'+label+'">':'<div class="rc-empty" role="img" aria-label="'+label+' (belum ada)"></div>')+(tut?pbTutBtnHtml(tut,label):'')+'</div><div class="pb-flow-lightbox-sublabel rc-cap">'+label+'</div></div>';
}
function pbRecipeHtml(ex,fotoSrc){
  fotoSrc=fotoSrc||'';
  let m=ex.mats.map(function(x){return pbRecipeTile(typeof x.src==='function'?x.src():x.src,x.label,x.tut,84);});
  return '<div class="rc-hd"><h2>Cara membuat Video AI</h2><p>Dua bahan jadi Foto AI, lalu jadi video.</p></div>'
    +'<div class="rc-pair">'+m.join('<span class="rc-plus">+</span>')+'</div>'
    +'<div class="rc-link"><i></i><span>digabung jadi</span><i></i></div>'
    +pbRecipeTile(fotoSrc,'Foto AI',ex.tut,100)
    +'<div class="rc-link"><i></i><span>diubah jadi video</span><i></i></div>';
}
(function(){
  let mw=document.querySelector('#pb-flow-lightbox .pb-flow-lightbox-media');
  if(!mw)return;
  mw.addEventListener('click',function(e){
    let tb=e.target.closest?e.target.closest('.pb-flow-tut'):null;
    if(tb){ e.stopPropagation(); pbTutOpen(tb.getAttribute('data-tut'),tb.getAttribute('aria-label')); }
  });
})();
function vbOpenStartFrameTutorial(){
  let vt=document.getElementById('vb-mode-preview-video-thumb');
  if(vt)pbFlowLightboxOpen(vt);
}
function pbFlowLightboxOpen(el){
  let rcKey=el.getAttribute('data-sub1-extra');
  let isRecipe=!!((rcKey==='startframe'||rcKey==='dua')&&window.PB_FLOW_EXTRA&&window.PB_FLOW_EXTRA[rcKey]);
  let rcBox=document.querySelector('#pb-flow-lightbox .pb-flow-lightbox-box');
  if(rcBox)rcBox.classList.toggle('recipe',isRecipe);
  document.querySelectorAll('#pb-flow-lightbox .pb-flow-lightbox-media .pb-flow-tut').forEach(function(b){b.remove();});
  let imgEl=document.getElementById('pb-flow-lightbox-img');
  let vidEl=document.getElementById('pb-flow-lightbox-video');
  let muteBtn=document.getElementById('pb-flow-lightbox-mute');
  let srcVideo=el.querySelector('video');
  let srcImg=el.querySelector('img');
  if(srcVideo){
    vidEl.src=srcVideo.getAttribute('src');
    vidEl.muted=true;                       // selalu mulai mute — biar autoplay-nya pasti jalan
    vidEl.currentTime=0;
    vidEl.play().catch(function(){});
    vidEl.style.display='block';
    imgEl.style.display='none';
    muteBtn.style.display='flex';
    muteBtn.textContent='🔇';
    let zb=document.getElementById('pb-flow-lightbox-zoom'); if(zb) zb.style.display='flex';
  }else if(srcImg){
    imgEl.src=srcImg.getAttribute('src');
    imgEl.style.display='block';
    vidEl.pause();
    vidEl.removeAttribute('src');
    vidEl.style.display='none';
    muteBtn.style.display='none';
    let zb2=document.getElementById('pb-flow-lightbox-zoom'); if(zb2) zb2.style.display='none';
  }else{
    return;
  }
  let lblEl=document.getElementById('pb-flow-lightbox-label');
  lblEl.textContent=el.getAttribute('data-label')||'';
  let tutKey=el.getAttribute('data-tut');
  if(tutKey&&isRecipe){
    lblEl.innerHTML='Video AI<small>hasil akhir</small>'; lblEl.classList.remove('has-tut');
    let mw=document.querySelector('#pb-flow-lightbox .pb-flow-lightbox-media');
    if(mw) mw.insertAdjacentHTML('beforeend',pbTutBtnHtml(tutKey,'Video AI'));
  }
  else if(tutKey){ lblEl.insertAdjacentHTML('beforeend',pbTutBtnHtml(tutKey,el.getAttribute('data-label')||'Video AI')); lblEl.classList.add('has-tut'); }
  else lblEl.classList.remove('has-tut');
  // Bahan tambahan — cuma ada di kotak Video AI & Foto AI (data-explain
  // di-set di HTML-nya). Kotak Karakter Sheet/Produk nggak punya
  // data-explain, jadi bagian ini otomatis disembunyikan buat mereka.
  let explainEl=document.getElementById('pb-flow-lightbox-explain');
  let subwrapEl=document.getElementById('pb-flow-lightbox-subwrap');
  let explain=el.getAttribute('data-explain');
  if(isRecipe){
    explainEl.textContent='Ketuk tombol putar di pojok gambar untuk melihat penjelasannya.';
    explainEl.style.display='block';
    subwrapEl.innerHTML=pbRecipeHtml(window.PB_FLOW_EXTRA[rcKey],el.getAttribute('data-sub1-src'));
    subwrapEl.style.display='flex';
  }else if(explain){
    explainEl.textContent=explain;
    explainEl.style.display='block';
    let subsHtml='';
    for(let i=1;i<=2;i++){
      let src=el.getAttribute('data-sub'+i+'-src');
      let label=el.getAttribute('data-sub'+i+'-label');
      if(!src)continue;
      // Kolom tambahan (mis. Start Frame: Foto AI -> Karakter Sheet + Foto Produk) dan ikon tutorial; lihat PB_FLOW_EXTRA.
      let exKey=el.getAttribute('data-sub'+i+'-extra');
      let ex=(exKey&&window.PB_FLOW_EXTRA)?window.PB_FLOW_EXTRA[exKey]:null;
      let mediaHtml=el.getAttribute('data-sub'+i+'-video')
          ? '<span class="pb-vz-host"><video class="pb-flow-lightbox-subimg" src="'+el.getAttribute('data-sub'+i+'-video')+'" poster="'+src+'" muted loop autoplay playsinline style="cursor:pointer" onclick="event.stopPropagation();pbVzOpen(this)"></video></span>'
          : '<img class="pb-flow-lightbox-subimg" src="'+src+'" alt="'+(label||'')+'">';
      if(ex&&ex.tut) mediaHtml='<div class="pb-flow-tutrow">'+mediaHtml+pbTutBtnHtml(ex.tut,label)+'</div>';
      let extraHtml='';
      if(ex&&ex.mats&&ex.mats.length){
        extraHtml='<div class="pb-flow-arrow"><span class="ln"></span><span class="ic">↓</span><span class="tx">butuh '+ex.mats.length+' bahan</span></div><div class="pb-flow-lightbox-subwrap2">';
        ex.mats.forEach(function(m){
          let ms=(typeof m.src==='function')?m.src():m.src;
          let btn=m.tut?pbTutBtnHtml(m.tut,m.label):'';
          let im='<img class="pb-flow-lightbox-subimg" src="'+(ms||'')+'" alt="'+m.label+'">';
          extraHtml+='<div class="pb-flow-lightbox-subcol"><div class="pb-flow-tutrow">'+(m.side==='left'?btn+im:im+btn)+'</div><div class="pb-flow-lightbox-sublabel">'+m.label+'</div></div>';
        });
        extraHtml+='</div>';
      }
      subsHtml+='<div class="pb-flow-lightbox-subcol">'
        +'<div class="pb-flow-arrow"><span class="ln"></span><span class="ic">↓</span></div>'
        +mediaHtml
        +'<div class="pb-flow-lightbox-sublabel">'+(label||'')+'</div>'
        +extraHtml
        +'</div>';
    }
    subwrapEl.innerHTML=subsHtml;
    subwrapEl.style.display='flex';
    // Bahan berupa video (mis. Video Referensi Motion Control) harus ikut bergerak, bukan beku.
    subwrapEl.querySelectorAll('video').forEach(function(v){ v.muted=true; try{ var pp=v.play(); if(pp&&pp.catch)pp.catch(function(){}); }catch(e){} });
  }else{
    explainEl.style.display='none';
    subwrapEl.style.display='none';
    subwrapEl.innerHTML='';
  }
  document.getElementById('pb-flow-lightbox').classList.add('show');
}
// Tombol speaker kecil di pojok video lightbox — "tap to unmute" ala
// IG/TikTok. WAJIB stopPropagation, soalnya tap di mana pun pada
// lightbox ini biasanya langsung nutup preview (lihat pbFlowLightboxClose).
function pbFlowLightboxToggleMute(e){
  e.stopPropagation();
  let vidEl=document.getElementById('pb-flow-lightbox-video');
  vidEl.muted=!vidEl.muted;
  document.getElementById('pb-flow-lightbox-mute').textContent=vidEl.muted?'🔇':'🔊';
}
// Tap foto/video bahan di dalam lightbox Video AI -> tampil besar (layer sendiri). Tap lagi untuk menutup, balik ke lightbox Video AI.
function pbFlowSubOpen(col){
  let box=document.getElementById('pb-flow-sublightbox');
  let bi=document.getElementById('pb-flow-sublightbox-img');
  let bv=document.getElementById('pb-flow-sublightbox-video');
  let bl=document.getElementById('pb-flow-sublightbox-label');
  if(!box||!col)return;
  let v=col.querySelector('video'),im=col.querySelector('img');
  let lab=col.querySelector('.pb-flow-lightbox-sublabel');
  if(v){
    bv.onerror=null;
    bv.src=v.getAttribute('src')||'';
    bv.muted=true;bv.currentTime=0;
    try{let pp=bv.play();if(pp&&pp.catch)pp.catch(function(){});}catch(e){}
    bv.style.display='block';bi.style.display='none';
  }else if(im){
    bi.src=im.getAttribute('src')||'';
    bi.style.display='block';
    try{bv.pause();}catch(e){}
    bv.removeAttribute('src');bv.style.display='none';
  }else return;
  bl.textContent=lab?lab.textContent:'';
  box.classList.add('show');
}
function pbFlowSubClose(){
  let box=document.getElementById('pb-flow-sublightbox');
  if(box)box.classList.remove('show');
  let bv=document.getElementById('pb-flow-sublightbox-video');
  if(bv){try{bv.pause();}catch(e){} bv.controls=false;bv.onclick=null;bv.onerror=null;}
  if(window._pbTutResumeMain){window._pbTutResumeMain=false;try{let mv=document.getElementById('pb-flow-lightbox-video');let lb=document.getElementById('pb-flow-lightbox');if(mv&&lb&&lb.classList.contains('show')&&mv.getAttribute('src')){let pp=mv.play();if(pp&&pp.catch)pp.catch(function(){});}}catch(e){}}
}
(function(){
  let sw=document.getElementById('pb-flow-lightbox-subwrap');
  if(!sw)return;
  sw.addEventListener('click',function(e){
    let tb=e.target.closest?e.target.closest('.pb-flow-tut'):null;
    if(tb){ e.stopPropagation(); pbTutOpen(tb.getAttribute('data-tut'),tb.getAttribute('aria-label')); return; }
    let col=e.target.closest?e.target.closest('.pb-flow-lightbox-subcol'):null;
    e.stopPropagation(); // jangan ikut menutup lightbox Video AI
    if(col)pbFlowSubOpen(col);
  });
})();
(function(){
  let lb=document.getElementById('pb-flow-lightbox-label');
  if(!lb)return;
  lb.addEventListener('click',function(e){
    let tb=e.target.closest?e.target.closest('.pb-flow-tut'):null;
    if(tb){ e.stopPropagation(); pbTutOpen(tb.getAttribute('data-tut'),tb.getAttribute('aria-label')); }
  });
})();
function pbFlowLightboxClose(){
  pbFlowSubClose();
  document.getElementById('pb-flow-lightbox').classList.remove('show');
  document.getElementById('pb-flow-lightbox-video').pause();
  let _sw=document.getElementById('pb-flow-lightbox-subwrap');
  if(_sw) _sw.querySelectorAll('video').forEach(function(v){ try{ v.pause(); }catch(e){} });
}
// ── LANGKAH 5+6 (DIGABUNG) — user pilih subjek foto (f0), lalu LANGSUNG
// lanjut isi foto referensi (f1), TANPA kartu instruksi tur & TANPA
// kotak sorot (spotlight) kuning di titik mana pun — dari sudut pandang
// user ini satu alur menerus (masih disebut "Langkah 5" secara internal,
// f1 TIDAK lagi punya kartu/label "Langkah 6" sendiri). Blur pada elemen
// lain di halaman (lewat body.pb-tour-blur-context) dipasang begitu masuk
// Tampilan kartu Subjek Foto SEKARANG disederhanakan selama tur: teks
// pertanyaan diganti versi spesifik karakter sheet, dan baris deskripsi
// kecil di tiap opsi (Perempuan/Laki-laki/Produk Saja) disembunyikan —
// direvert lagi di pbTourResetF0Ui(). "Produk Saja" TETAP dibekukan
// selama f0 (cuma Perempuan/Laki-laki yang relevan buat alur onboarding
// karakter sheet).
// FIX (dilaporkan user — "Produk Saja" & tampilan f1 balik ke normal
// begitu user tap "← Kembali" dari Foto Referensi lalu konfirmasi ulang
// Subjek Foto): dulu transisi f0→f1 di sini SEPENUHNYA bergantung pada
// pbArmDoneWait('f0',...) yang cuma "sekali pakai" — begitu doneCard('f0')
// pertama kali terpanggil (via fPickSubjek), wait itu langsung dikonsumsi
// & dibersihkan (lihat wrapper doneCard di atas). Kalau sesudahnya user
// pencet "← Kembali" (fBack1) dan konfirmasi ulang Subjek Foto yang sama
// (lihat fBack1 → _fSubjekAdvance), doneCard('f0') terpanggil LAGI tapi
// wait-nya sudah kosong — jadi pbTourResetF0Ui()/pbGoStep6() TIDAK
// terpanggil ulang. Akibatnya kunci "Produk Saja" (unlock-nya dulu ada di
// pbTourResetF0Ui) & penyederhanaan f1 (badge "+" Outfit, chip Objek,
// label "Karakter Sheet") jadi tidak konsisten begitu bolak-balik.
// Sekarang dipakai flag pbTourStep56Active yang menyala selama SELURUH
// sesi Langkah 5+6 (dimatikan di pbTourResetF1Ui, bukan pbTourResetF0Ui)
// — _fSubjekAdvance() mengecek flag ini & selalu memanggil ulang
// pbTourResetF0Ui()/pbGoStep6() langsung tiap kali subjek dikonfirmasi
// selama sesi tur ini berjalan, terlepas dari itu konfirmasi pertama
// ataupun hasil "← Kembali". pbArmDoneWait('f0',...) tidak dipakai lagi
// untuk transisi ini (supaya tidak terpanggil dobel).
var pbTourStep56Active=false;
// FITUR BARU (permintaan user): true selama sesi tur "diperpanjang" dari
// begitu foto referensi (f1) selesai sampai user menyelesaikan step 3–9
// (Cara Tampil Produk s.d. Mood & Tone). Blur latar (pb-tour-blur-context)
// tetap menyala selama flag ini true — lihat pbTourFinishExt().
var pbTourExtActive=false;
// FITUR BARU (permintaan user): true begitu tombol Generate ditekan
// SELAMA sesi tur (lihat fGenerate()) sampai user menekan "Mengerti"
// pada notifikasi "simpan baik-baik prompt-nya" yang muncul sesudah
// dia menekan "Salin JSON" — lihat pbShowSaveJsonNotif() & wrapper
// fCopy() di bawah. Selama flag ini true, area Ringkasan/Karakter
// Sheet/dll disembunyikan lewat class pb-tour-result-simple di body.
var pbTourAfterGenActive=false;
// Lepas layout Builder-di-dalam-tur begitu mode tur berakhir (selesai / di-skip).
(function(){
  function sync(){
    var b=document.body;
    if(!b) return;
    if(b.classList.contains('pb-tour-pfa') && !b.classList.contains('pb-tour-active')){
      b.classList.remove('pb-tour-pfa');
    }
  }
  try{
    new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
  }catch(e){}
})();
function pbGoStep5(){
  pbSaveTourStepState('pbGoStep5');
  // FITUR BARU (permintaan user): Karakter Sheet sudah lengkap, bar
  // progres bintang lanjut menyala ke titik "Prompt" (Foto AI).
  pbTourProgressShow(1);
  pbDisarmDoneWait();
  clearInterval(pbGenPollTimer);pbGenPollTimer=null;
  clearInterval(pbCopyPollTimer);pbCopyPollTimer=null;
  window.removeEventListener('resize',pbRepositionCurrent);
  let shellEl=document.getElementById('app-shell');
  if(shellEl) shellEl.removeEventListener('scroll',pbRepositionCurrent);
  document.getElementById('pb-tour-backdrop').classList.remove('show','pb-passive');
  document.getElementById('pb-tour-spot').classList.remove('show','pb-airy');
  document.getElementById('pb-tour-card').classList.remove('show');
  document.body.classList.add('pb-tour-blur-context');
  pbTourStep56Active=true;
  let f0=document.getElementById('f0');
  if(f0) f0.classList.add('pb-tour-f0-simple');
  let f0Desc=document.getElementById('f0-desc-text');
  // FIX (permintaan user): tambah 1 kalimat penjelas DI ATAS teks tanya
  // "Jenis kelamin..." yang sudah ada — supaya user paham KENAPA dia
  // ditanya-tanya begini (karena untuk bikin karakter memegang/memakai
  // produk, dibutuhkan "prompt", jadi harus diselesaikan dulu wizard-nya).
  // PERMINTAAN USER: tampilan Builder di dalam tur harus SAMA dengan di luar tur —
  // kalimat penjelas khusus tur, badge "Sedang membuat prompt", dan thumbnail
  // Karakter Sheet di kartu Subjek Foto dihapus. Teks kartu = teks biasa.
  if(f0Desc) f0Desc.textContent='Pilih jenis kelamin karakter sheet.';
  // FITUR BARU (permintaan user): badge status "sedang membuat prompt" di
  // pojok kiri atas layar (fixed, terpisah dari kartu f0) — biar pemula
  // ngerti kenapa mereka ditanya-tanya begini. Dipasang di sini (Langkah 5),
  // dilepas lagi di pbTourResetF0Ui() begitu subjek dipilih atau tur di-skip.
  let f0ProcessBadge=document.getElementById('f0-tour-process-badge');
  if(f0ProcessBadge) f0ProcessBadge.style.display='none';
  let f0KsThumb=document.getElementById('f0-ks-thumb');
  if(f0KsThumb) f0KsThumb.style.display='none';
  // PERMINTAAN USER: Builder di dalam tur memakai layout layar penuh yang
  // SAMA dengan Builder di luar tur (kelas pb-tour-pfa mengaktifkan semua
  // aturan CSS "luar tur" selama tur masih jalan; dilepas otomatis begitu
  // tur selesai/di-skip — lihat observer di bawah).
  document.body.classList.add('pb-tour-pfa');
  try{ if(typeof window.pfaOpen==='function') window.pfaOpen(); }catch(e){}
}
// Kembalikan chip "Produk Saja" + tampilan kartu Subjek Foto seperti
// semula (dipanggil begitu subjek dipilih & alur lanjut ke foto
// referensi, ATAU dari pbHideOverlay() kalau tur di-skip persis waktu f0
// masih aktif). Blur latar SENGAJA TIDAK dilepas di sini — tetap menyala
// sampai foto referensi (f1) juga selesai, lihat pbTourResetF1Ui().
function pbTourResetF0Ui(){
  // FIX (dilaporkan user): "Produk Saja" TIDAK lagi di-unlock di sini.
  // Dulu unlock terjadi begitu subjek dikonfirmasi & lanjut ke f1 —
  // padahal sesi tur (Langkah 5+6) masih berjalan sampai f1 juga selesai.
  // Kalau user sempat "← Kembali" ke Subjek Foto di tengah sesi itu, kartu
  // "Produk Saja" jadi kelihatan TIDAK dibekukan lagi (kunci sudah kepakai
  // di awal). Sekarang unlock-nya dipindah ke pbTourResetF1Ui() — jadi
  // "Produk Saja" tetap dibekukan SELAMA seluruh sesi Langkah 5+6, apa pun
  // berapa kali user maju-mundur di dalamnya, dan baru dilepas begitu sesi
  // itu benar-benar berakhir (foto referensi selesai ATAU tur di-skip).
  let f0=document.getElementById('f0');
  if(f0) f0.classList.remove('pb-tour-f0-simple');
  let f0Desc=document.getElementById('f0-desc-text');
  if(f0Desc) f0Desc.textContent='Pilih jenis kelamin karakter sheet.';
  // FITUR BARU (permintaan user): badge "sedang membuat prompt" TIDAK lagi
  // dilepas di sini begitu subjek dikonfirmasi & lanjut ke f1 — badge ini
  // sekarang PERMANEN selama seluruh sesi Langkah 5 (f0 s.d. f1 selesai),
  // sama seperti kunci "Produk Saja" di atas. Dilepasnya dipindah ke
  // pbTourResetF1Ui().
}
// ── LANJUTAN LANGKAH 5 — foto referensi & outfit (f1), VERSI SEDERHANA,
// masih bagian dari alur yang sama (TANPA kartu/label/spotlight
// terpisah). Dipanggil OTOMATIS begitu doneCard('f0') beneran terpanggil
// (user sudah pilih & konfirmasi subjek) — bukan lewat tombol tur.
// Sengaja disederhanakan SELAMA tur masih aktif di step ini: banner
// "Cek HP dulu" & chip "Objek" disembunyikan total (bukan cuma
// dikunci), chip "Wajah" berlabel "Karakter Sheet" & langsung
// ditambahkan otomatis begitu step ini terbuka (user tidak perlu klik
// sendiri), chip "Outfit" (foto) tetap dikunci, dan tanda "+" pada
// "Isi Outfit Karakter" dilepas. Direvert lagi di pbTourResetF1Ui().
// Begitu foto referensi selesai diisi & doneCard('f1') terpanggil, tur
// SELESAI (pbEndTour()) — belum ada langkah lanjutan (dulu Langkah
// 7–10) untuk sekarang.
var pbTourF1Active=false;
// Sudah ditampilkan notifikasi "Isi Outfit Karakter" untuk sesi tur
// yang sedang berjalan? Direset tiap kali masuk step ini (pbGoStep6),
// supaya cuma muncul SEKALI per sesi tur, persis begitu kedua bahan
// (Karakter Sheet & Produk) sudah ditap user sendiri.
var pbTourOutfitHintShown=false;
function pbGoStep6(){
  pbSaveTourStepState('pbGoStep6');
  pbTourF1Active=true;
  pbTourOutfitHintShown=false;
  let f1=document.getElementById('f1');
  if(f1) f1.classList.add('pb-tour-f1-simple');
  // FIX (dilaporkan user — banner "Cek HP dulu" masih kelihatan selama
  // tur): elemen ini punya inline style="display:flex...", jadi rule
  // CSS #f1.pb-tour-f1-simple #f1-cekhp-banner{display:none} tidak
  // pernah menang. Disembunyikan paksa lewat JS di sini.
  let cekhpBanner=document.getElementById('f1-cekhp-banner');
  if(cekhpBanner) cekhpBanner.style.display='none';
  let wajahLabel=document.getElementById('ftb-wajah-label');
  if(wajahLabel) wajahLabel.textContent='Karakter';
  let objekChip=document.getElementById('ftb-objek');
  if(objekChip) objekChip.style.display='none';
  // Chip "Outfit" (foto) tidak relevan di langkah ini — user isi outfit
  // lewat "Isi Outfit Karakter" (teks bebas), bukan lewat foto.
  pbLockChip('#ftb-outfit');
  // PERMINTAAN USER (5 Nov 2026): chip Lokasi ikut DIKUNCI selama tur di
  // langkah ini (sama seperti Outfit). Dilepas lagi di pbTourResetF1Ui()
  // & pbHideOverlay() lewat pbUnlockChip('#ftb-lokasi').
  pbLockChip('#ftb-lokasi');
  pbLockChip('#ftb-pose'); // tur pemula: Pose tidak relevan di langkah ini
  let outfitRandomBadge=document.getElementById('ftc-outfit_random');
  if(outfitRandomBadge) outfitRandomBadge.textContent='';
  let tourHint=document.getElementById('f1-tour-hint');
  if(tourHint) tourHint.style.display='block';
  // "Karakter Sheet" TIDAK lagi ditambahkan otomatis — user sendiri
  // yang harus tap chip-nya (juga chip Produk), masing-masing cuma
  // boleh 1x (lihat wrapper fAddRef di bawah).
  pbArmDoneWait('f1',function(){
    // FITUR BARU (permintaan user): dulu tur langsung berakhir (blur latar
    // dilepas & pbEndTour() dipanggil) persis begitu foto referensi (f1)
    // selesai. Sekarang sesi tur DILANJUTKAN (blur latar TETAP menyala)
    // sampai user juga menyelesaikan step 3–9 (Cara Tampil Produk s.d.
    // Mood & Tone) — lihat pbTourExtActive & pbTourFinishExt() di bawah.
    pbTourResetF1Ui(true);
    pbTourExtActive=true;
  });
}
// Notifikasi "Isi Outfit Karakter" (dulu pbShowOutfitHintNotif()) SUDAH
// DIHAPUS TOTAL (permintaan user) — dulu cuma tampil PERSIS SEKALI begitu
// user tap Karakter Sheet DAN Produk di step ini. Fungsinya sebelumnya
// sudah tidak dipanggil dari mana pun (lihat wrapper fAddRef di bawah),
// sekarang definisinya juga dilepas supaya tidak bisa ke-trigger lagi
// dari jalur manapun.
// FITUR BARU (permintaan user): notifikasi tengah layar yang muncul PERSIS
// SEKALI begitu user menekan "Salin JSON" pada hasil prompt yang di-generate
// selama sesi tur (lihat pbTourAfterGenActive & wrapper fCopy() di bawah).
// Mengingatkan user supaya menyimpan prompt yang baru disalin, karena akan
// dipakai di aplikasi Google Flow. Begitu "Mengerti" ditekan, area
// Ringkasan/Karakter Sheet/dll yang tadi disembunyikan (pb-tour-result-simple)
// dikembalikan normal. Pola sama seperti pbShowOutfitHintNotif() (1 tombol
// "Mengerti", bukan Ya/Batal).
// FIX (dilaporkan user): begitu "Mengerti" ditekan di sini, prompt Foto AI
// SUDAH BENERAN ada & sudah disalin — jadi ini titik yang tepat untuk
// lanjut menampilkan tutorial "cara pakai Google Flow" (pbGoStep6Ext,
// 10 butir, termasuk butir "tempel prompt di bawahnya"). Dulu tutorial
// itu ditampilkan lebih dulu (dari pbGoStep2Next()), SEBELUM prompt ini
// sempat dibuat — sekarang urutannya dibetulkan supaya sesuai konteks.
function pbShowSaveJsonNotif(){
  // PERMINTAAN USER (5 Nov 2026): layar "Simpan baik-baik prompt yang disalin" + tombol "Mengerti" DIHAPUS.
  // Begitu Salin JSON ditekan, langsung lanjut ke layar video "Bikin foto AI-nya" (pbGoStep6Ext).
  document.body.classList.remove('pb-tour-result-simple');
  setTimeout(function(){ pbGoStep6Ext(); },250);
}
// Kembalikan tampilan f1 seperti semula DAN lepas blur latar (yang
// dipasang sejak f0 tadi) — dipanggil begitu foto referensi selesai &
// tur berakhir, ATAU dari pbHideOverlay() kalau tur di-skip persis
// waktu f0/f1 masih aktif.
function pbTourResetF1Ui(keepBlur){
  if(!keepBlur) document.body.classList.remove('pb-tour-blur-context');
  // Sesi Langkah 5+6 sudah benar-benar berakhir di sini (foto referensi
  // selesai ATAU tur di-skip) — baru sekarang "Produk Saja" dilepas
  // kuncinya (lihat catatan di pbTourResetF0Ui) & flag sesi dimatikan.
  if(!keepBlur) pbTourStep56Active=false;
  pbTourF1Active=false;
  let f1=document.getElementById('f1');
  if(f1) f1.classList.remove('pb-tour-f1-simple');
  // FITUR BARU (permintaan user — REVISI): badge "sedang membuat prompt"
  // dulu dilepas persis di sini begitu Foto Referensi (f1) selesai. Sekarang
  // TIDAK — badge ini harus tetap kelihatan terus sepanjang sesi tur yang
  // diperpanjang (step 3–9, lihat pbTourExtActive) sampai user beneran
  // menekan "Salin JSON" (dilepas di wrapper fCopy() di bawah). Di sini
  // cuma dilepas kalau keepBlur FALSE, artinya sesi Langkah 5 berakhir
  // bukan karena lanjut ke step berikutnya tapi karena tur di-skip —
  // jaga-jaga supaya badge tidak nyangkut nampil kalau tur dibatalkan
  // di tengah jalan.
  if(!keepBlur){
    let f0ProcessBadge=document.getElementById('f0-tour-process-badge');
    if(f0ProcessBadge) f0ProcessBadge.style.display='none';
  }
  // Banner "Cek HP dulu", label "Wajah", dan chip "Objek" SEKARANG memang
  // disembunyikan/diubah permanen di luar tur juga (bukan cuma selama tur),
  // jadi TIDAK dikembalikan lagi di sini seperti sebelumnya.
  let tourHint=document.getElementById('f1-tour-hint');
  if(tourHint) tourHint.style.display='none';
  pbUnlockChip('#ftb-outfit');
  pbUnlockChip('#ftb-objek');
  pbUnlockChip('#ftb-lokasi');
  pbUnlockChip('#ftb-pose');
  let outfitRandomBadge=document.getElementById('ftc-outfit_random');
  if(outfitRandomBadge) outfitRandomBadge.textContent='+';
  let orDesc=document.getElementById('outfit-random-desc');
  if(orDesc) orDesc.textContent='Deskripsikan outfit yang kamu inginkan — kami yang buatkan.';
  let orFoot=document.getElementById('outfit-random-footnote');
  if(orFoot) orFoot.textContent='Semakin detail, hasil semakin akurat.';
}
// FITUR BARU (permintaan user): dipanggil begitu step 9 (Mood & Tone)
// dikonfirmasi SELAMA sesi tur diperpanjang (pbTourExtActive) masih
// berjalan — menutup sesi tur beneran (blur latar dilepas, nav
// dimunculkan lagi lewat pbEndTour()) lalu menampilkan blur akhir di atas
// Ringkasan/Karakter Sheet/Punya Prompt Lama/Generate Variasi dengan
// tombol "Generate Prompt Foto" dipindah ke tengah layar. Blur akhir ini
// baru dilepas lagi begitu user benar-benar menekan tombol Generate
// (lihat awal fGenerate()).
function pbTourFinishExt(){
  pbTourExtActive=false;
  document.body.classList.remove('pb-tour-blur-context');
  pbTourStep56Active=false;
  if(typeof pbEndTour==='function') pbEndTour();
  setTimeout(function(){
    // FITUR BARU (permintaan user): pastikan kartu Ringkasan mulai dalam
    // keadaan tertutup (belum di-tap) setiap kali sesi tur sampai di sini —
    // jaga-jaga kalau ada sisa class .pb-tour-opened dari sesi sebelumnya.
    let sCard=document.getElementById('summary-card');
    if(sCard) sCard.classList.remove('pb-tour-opened');
    document.body.classList.add('pb-tour-final-blur');
  },250);
}
// FITUR BARU (permintaan user): buka/tutup isi kartu Ringkasan (warning +
// daftar rows) — SEKARANG berlaku selalu, baik di dalam maupun di luar
// sesi tur (dulu cuma aktif selama body.pb-tour-final-blur). Lihat CSS
// .summary-card:not(.pb-tour-opened).
function pbToggleTourSummary(){
  let sCard=document.getElementById('summary-card');
  if(sCard) sCard.classList.toggle('pb-tour-opened');
}
function pbLockChip(sel){
  let el=document.querySelector(sel);
  if(el) el.classList.add('pb-locked');
}
function pbUnlockChip(sel){
  let el=document.querySelector(sel);
  if(el) el.classList.remove('pb-locked');
}
// ── Wrapper fAddRef(): SELAMA Langkah 6 tur (pb-tour-f1-simple) aktif —
// 1) Karakter Sheet & Produk masing-masing HANYA boleh ditambah 1x — ini
//    sekarang ditangani langsung di dalam fAddRef() itu sendiri (berlaku
//    di luar tur juga, diam-diam tanpa toast — lihat komentar "FITUR BARU"
//    di awal fAddRef()), jadi wrapper ini TIDAK perlu cek duplikat sendiri
//    lagi (dulu ada toast "cukup 1 foto aja ya" di sini, sekarang dihapus
//    supaya konsisten "tanpa pemberitahuan" seperti di luar tur).
// 2) Panel "atur detail" TIDAK dibuka otomatis lagi — tetap disembunyikan
//    sampai user sendiri yang tap tombolnya (sama seperti di luar tur).
// 3) Begitu Karakter Sheet DAN Produk sudah sama-sama ada (2 bahan
//    lengkap), munculkan notifikasi soal "Isi Outfit Karakter" sekali.
// Di luar tur, perilaku fAddRef TIDAK berubah sama sekali. ─────────────
(function(){
  let _pbOrigFAddRef=fAddRef;
  fAddRef=function(typeKey){
    let before=FS.refs.length;
    _pbOrigFAddRef.apply(this,arguments);
    if(pbTourF1Active && FS.refs.length>before){
      let hasWajah=FS.refs.some(function(r){return r.type==='wajah';});
      let hasProduk=FS.refs.some(function(r){return r.type==='produk';});
      if(hasWajah && hasProduk){
        // Notifikasi "Isi Outfit Karakter" dimatikan (permintaan user).
        // pbTourOutfitHintShown tetap di-set true supaya state tur konsisten,
        // meski notifikasinya sendiri tidak lagi ditampilkan.
        pbTourOutfitHintShown=true;
      }
    }
  };
})();
// tombol "Lanjut" tur yang manual) ───────────────────────────────
// ── HELPER (permintaan user: screenshot panduan kesannya "murahan") ──
// Bungkus <img> polos jadi kartu mini gaya browser-window (chrome bar
// titik tiga + shadow + caption) supaya konsisten sama gaya dark UI
// aplikasi, dan biar detail kecil di screenshot desktop tetap kebaca —
// tap gambarnya untuk zoom fullscreen (pbOpenShotZoom).
function pbFrameShot(src,alt){
  let safeAlt=(alt||'').replace(/'/g,"\\'");
  return '<div class="pb-shot">'
    + '<div class="pb-shot-chrome"><span></span><span></span><span></span></div>'
    + '<div class="pb-shot-imgwrap" onclick="pbOpenShotZoom(\''+safeAlt+'\',this)">'
    +   '<img src="'+src+'" alt="'+(alt||'')+'">'
    +   '<div class="pb-shot-zoomhint">⤢</div>'
    + '</div>'
    + (alt?('<div class="pb-shot-cap">'+alt+'</div>'):'')
    + '</div>';
}
function pbOpenShotZoom(alt,wrapEl){
  let img=wrapEl.querySelector('img');
  let lb=document.getElementById('pb-shot-lightbox');
  let lbImg=document.getElementById('pb-shot-lightbox-img');
  lbImg.src=img.src;
  lbImg.alt=alt||'';
  lb.classList.add('show');
}
function pbCloseShotZoom(){
  document.getElementById('pb-shot-lightbox').classList.remove('show');
}
// Tombol "Kembali" di footer tur (di samping "Lanjut"). Selalu disembunyikan
// dulu tiap halaman tur baru dirender (pbShowModal/pbShowInteractive) &
// saat tur ditutup (pbHideOverlay); halaman yang butuh (mis. butir 2+
// install Google Flow) menyalakannya lagi lewat pbTourShowBack().
function pbTourHideBack(){
  let b=document.getElementById('pb-tour-back-btn');
  if(b){b.style.display='none';b.onclick=null;}
}
function pbTourShowBack(onBack){
  let b=document.getElementById('pb-tour-back-btn');
  if(!b)return;
  b.style.display='';
  b.onclick=onBack;
}
function pbShowModal(n,title,desc,btnLabel,onNext){
  pbTourHideBack();
  pbCurrentSelector=null;
  pbSetPassive(false);
  pbSetLabel(n);
  pbSetText(title,desc);
  document.getElementById('pb-tour-card').classList.remove('pb-docked');
  document.getElementById('pb-tour-card').scrollTop=0; // halaman baru mulai dari atas
  let btn=document.getElementById('pb-tour-next-btn');
  btn.style.display='';
  btn.textContent=btnLabel||'Lanjut';
  btn.onclick=onNext;
  pbPositionSpot(null);
  // FIX BUG PERFORMA (laporan user, Sept 2026): sebelumnya baris di bawah
  // ini SELALU menambah listener BARU setiap kali fungsi ini dipanggil
  // (dipanggil di tiap langkah tur) TANPA pernah melepas yang lama —
  // tidak ada satupun removeEventListener untuk pbRepositionCurrent di
  // seluruh file. Efeknya: makin banyak langkah tur (apalagi kalau user
  // klik "Lihat Tur Panduan Lagi" berkali-kali), makin banyak listener
  // 'resize'/'scroll' yang nyangkut PERMANEN — dan #app-shell adalah
  // container scroll utama SELURUH wizard (termasuk Builder Foto), jadi
  // tiap scroll di situ memicu pbRepositionCurrent() berkali-kali
  // berturutan, bikin app kerasa berat/lag walau tur sudah lama selesai.
  // Sekarang listener lama dilepas dulu sebelum pasang yang baru, supaya
  // yang aktif maksimal cuma 1 pasang setiap saat.
  window.removeEventListener('resize',pbRepositionCurrent);
  window.addEventListener('resize',pbRepositionCurrent);
  let shell=document.getElementById('app-shell');
  if(shell){
    shell.removeEventListener('scroll',pbRepositionCurrent);
    shell.addEventListener('scroll',pbRepositionCurrent);
  }
}

// ── Helper generik: render step INTERAKTIF (nempel ke elemen asli,
// backdrop transparan+tidak blocking, TANPA tombol "Lanjut" tur —
// user melanjutkan lewat aksi asli di card tersebut) ─────────────
function pbShowInteractive(n,title,desc,selector){
  pbTourHideBack();
  pbCurrentSelector=selector;
  pbSetPassive(true);
  pbSetLabel(n);
  pbSetText(title,desc);
  document.getElementById('pb-tour-next-btn').style.display='none';
  let card=document.getElementById('pb-tour-card');
  card.classList.add('pb-docked');
  let el=pbTourEl(selector);
  if(el){
    // Ukur tinggi banner SETELAH class pb-docked & teks terpasang, baru
    // dipakai buat hitung offset scroll — supaya target tidak ketutupan
    // banner berapa pun tinggi banner-nya (title+desc pendek vs panjang).
    let bannerH=card.offsetHeight||90;
    pbScrollToTargetTop(el,bannerH+16);
  }
  setTimeout(function(){ pbPositionSpot(el); },el?320:0);
  // FIX BUG PERFORMA yang sama seperti di pbShowModal() — lihat catatan
  // lengkap di sana. Dedupe listener sebelum pasang ulang.
  window.removeEventListener('resize',pbRepositionCurrent);
  window.addEventListener('resize',pbRepositionCurrent);
  let shell=document.getElementById('app-shell');
  if(shell){
    shell.removeEventListener('scroll',pbRepositionCurrent);
    shell.addEventListener('scroll',pbRepositionCurrent);
  }
}

// Varian pbScrollToTarget() yang MENEPIKAN elemen ke bawah offset tertentu
// dari puncak viewport (bukan menengahkan). Dipakai step interaktif supaya
// bagian atas kartu target selalu ada persis di bawah banner tur yang
// docked di atas — jadi tidak ada perhitungan "muat di atas/bawah elemen"
// yang bisa gagal & menimpa field saat elemen lebih tinggi dari layar.
function pbScrollToTargetTop(el,offsetTop){
  let shell=document.getElementById('app-shell');
  let rect=el.getBoundingClientRect();
  let delta=rect.top-offsetTop;
  if(Math.abs(delta)<4) return;
  if(shell){
    shell.scrollTo({top:shell.scrollTop+delta,left:0,behavior:'smooth'});
  } else {
    window.scrollTo({top:window.scrollY+delta,left:0,behavior:'smooth'});
  }
}

// Scroll manual ke tengah viewport — TIDAK memakai targetEl.scrollIntoView()
// karena method itu SENGAJA dioverride jadi no-op di app ini (lihat script
// paling atas file: "AUTO-SCROLL DIMATIKAN ATAS PERMINTAAN USER"). Kalau tur
// ini ikut pakai scrollIntoView() biasa, target di bawah layar tidak akan
// pernah benar-benar tergeser ke pandangan — spotlight bakal nunjuk ke
// tempat yang tidak kelihatan user. Makanya di sini scroll dilakukan
// langsung lewat scrollTop/scrollTo pada container-nya (#app-shell), yang
// TIDAK ikut kena override tadi.
function pbScrollToTarget(el){
  let shell=document.getElementById('app-shell');
  let rect=el.getBoundingClientRect();
  let viewportH=shell?shell.clientHeight:window.innerHeight;
  let elCenter=rect.top+rect.height/2;
  let delta=elCenter-(viewportH/2);
  if(Math.abs(delta)<4) return; // sudah cukup di tengah, tidak perlu geser
  if(shell){
    shell.scrollTo({top:shell.scrollTop+delta,left:0,behavior:'smooth'});
  } else {
    window.scrollTo({top:window.scrollY+delta,left:0,behavior:'smooth'});
  }
}

function pbRepositionCurrent(){
  let el=pbTourEl(pbCurrentSelector);
  if(el && el.offsetParent===null) el=null;
  pbPositionSpot(el);
}

function pbPositionSpot(targetEl){
  if(document.body.classList.contains('pb-tour-homelock')) return; // halaman depan terkunci: tanpa banner
  let spot=document.getElementById('pb-tour-spot');
  let card=document.getElementById('pb-tour-card');
  let pad=6;
  if(!targetEl){
    // MODE HALAMAN: posisi & ukuran kartu diatur penuh oleh CSS
    // (#pb-tour-card = position:fixed;inset:0). Tidak ada lagi spotlight/dim,
    // dan tidak ada lagi posisi inline yang menimpa CSS.
    card.style.top='';card.style.left='';card.style.transform='';
    card.classList.add('show');
    return;
  }
  spot.classList.remove('center-mode');
  let r=targetEl.getBoundingClientRect();
  spot.style.top=(r.top-pad)+'px';
  spot.style.left=(r.left-pad)+'px';
  spot.style.width=(r.width+pad*2)+'px';
  spot.style.height=(r.height+pad*2)+'px';
  if(card.classList.contains('pb-docked')){
    // Posisi kartu sudah dikunci lewat CSS .pb-docked (banner tetap di
    // atas layar) — TIDAK dihitung ulang di sini, supaya tidak pernah
    // "nempel" ke elemen dan menimpa field di dalamnya (lihat komentar
    // panjang di definisi .pb-docked pada <style>).
    spot.classList.add('show');card.classList.add('show');
    return;
  }
  // Taruh kartu di bawah target kalau muat, kalau tidak taruh di atas.
  let cardW=card.offsetWidth||300;
  let vw=window.innerWidth,vh=window.innerHeight;
  let top;
  let spaceBelow=vh-(r.bottom+pad);
  let cardH=card.offsetHeight||160;
  if(spaceBelow>cardH+20){ top=r.bottom+pad+14; }
  else if(r.top-pad-14-cardH>10){ top=r.top-pad-14-cardH; }
  else { top=Math.max(10,vh-cardH-16); }
  let left=r.left+r.width/2-cardW/2;
  left=Math.max(10,Math.min(left,vw-cardW-10));
  card.style.transform='none';
  card.style.top=top+'px';
  card.style.left=left+'px';
  spot.classList.add('show');card.classList.add('show');
}

// True kalau load ini hasil refresh/reload (F5, pull-to-refresh) — bukan buka app baru.
// Prioritas: penanda sessionStorage PB_IS_TRUE_RELOAD (lihat IIFE paling
// awal di <head>, lebih reliable di HP/PWA) — fallback ke Performance API
// lama cuma kalau sessionStorage diblokir (null/undefined).
function isReloadNavigationTour(){
  try{
    if(window.PB_IS_TRUE_RELOAD===true || window.PB_IS_TRUE_RELOAD===false) return window.PB_IS_TRUE_RELOAD;
  }catch(e){}
  try{
    let entries = performance.getEntriesByType && performance.getEntriesByType('navigation');
    if(entries && entries.length && entries[0].type) return entries[0].type === 'reload';
    if(performance.navigation) return performance.navigation.type === 1;
  }catch(e){}
  return false;
}
// Auto-mulai tur untuk akun yang tur-nya belum selesai (aturan lengkap di
// "ATURAN TUR" dekat PB_TOUR_KEY). Ringkas:
// - Yang diputuskan bukan "app dibuka" tapi "akun ini sudah selesai tur atau
//   belum" — dan keputusan baru diambil SETELAH user login DAN data cloud
//   akunnya turun (supaya Gmail lama di perangkat baru tidak dipaksa tur, dan
//   Gmail baru tidak pernah terlewat).
// - Belum selesai → tur mulai dari Langkah 1. Ini berlaku sama untuk user
//   baru, user yang refresh di tengah tur, maupun user yang menutup total
//   lalu membuka app lagi. Tidak ada dialog & tidak ada "lanjut dari step
//   terakhir" (state layar tidak bisa dipulihkan dengan aman di tengah tur).
//   Peringatan SEBELUM refresh tetap ada (beforeunload & pull-to-refresh).
// - Draft wizard dibuang saat load kalau tur belum selesai (lihat undo/redo
//   di window.load), jadi layar di balik tur selalu bersih seperti user baru.
function pbAutoStartTourOnLoad(){
  pbTourStampOwner();
  if(!pbShouldAutoStart()){
    pbTourReleaseCurtain(); // akun ini sudah selesai/lewati tur → mode normal
    return;
  }
  // PILIHAN MODE (Profesional / Pemula) — hanya untuk user baru (tur akun ini
  // belum selesai). Kalau app di-refresh di TENGAH tur (pb_tour_in_progress
  // = '1'), pilihan tidak ditanya lagi: tur langsung mulai dari Langkah 1.
  var _sedangTur=false;
  try{ _sedangTur = localStorage.getItem(PB_TOUR_INPROGRESS_KEY)==='1'; }catch(e){}
  if(!_sedangTur){
    pbModeShowChooser();
    return;
  }
  pbStartTour(false);
  // Backdrop tur sudah menutup layar penuh; lepas tirai setelahnya (dijeda
  // sedikit supaya tidak ada kedipan saat backdrop masih fade-in).
  setTimeout(pbTourReleaseCurtain,700);
}
// ── LAYAR PILIHAN MODE (user baru) ───────────────────────────────────
// Profesional → tur ditandai selesai (pbMarkTourDone, ikut sinkron cloud)
//   lalu masuk tampilan biasa. Jadi akun ini tidak ditanya lagi, di
//   perangkat mana pun.
// Pemula → tur dimulai dari Langkah 1 seperti biasa.
function pbModeShowChooser(){
  var el=document.getElementById('pb-mode-chooser');
  if(!el) return;
  el.classList.add('show');
  pbTourReleaseCurtain(); // chooser (z-index lebih tinggi) sudah menutup layar
}
function pbModePick(mode){
  var el=document.getElementById('pb-mode-chooser');
  if(mode==='pro'){
    pbMarkTourDone();
    if(el) el.classList.remove('show');
    return;
  }
  // pemula: tur dulu dimulai (backdrop tur menutup layar), baru chooser dilepas
  pbStartTour(false);
  setTimeout(function(){ if(el) el.classList.remove('show'); },350);
}
// Tunggu data cloud akun yang login turun dulu (status "tur selesai" ikut
// disinkron lewat pb_tour_done), baru putuskan mulai tur atau tidak. Batas
// 4 detik sebagai jaring pengaman: kalau cloud gantung/gagal/offline, tur
// tetap diputuskan dari data lokal.
function pbWaitCloudThenAutoStartTour(){
  let sudah=false;
  function jalankan(){
    if(sudah) return;
    sudah=true;
    pbAutoStartTourOnLoad();
  }
  setTimeout(jalankan,4000); // jaring pengaman
  try{
    if(window.pbCloudReady && typeof window.pbCloudReady.then==='function'){
      window.pbCloudReady.then(jalankan);
    } else {
      jalankan();
    }
  }catch(e){ jalankan(); }
}
window.addEventListener('load',function(){
  // Reload/refresh: splash dilewati → tidak perlu jeda. Buka biasa: tunggu
  // splash (±3.45 detik) selesai dulu supaya tidak numpuk animasi logo.
  var jeda = isReloadNavigationTour() ? 0 : 3700;
  setTimeout(function(){
    // Belum login = gerbang login masih tampil → tunggu sampai ada akun
    // (tur TIDAK boleh mulai di belakang gerbang login).
    pbTourWhenLoggedIn(pbWaitCloudThenAutoStartTour);
  },jeda);
});
// Login baru (bukan sesi tersimpan) juga langsung ditutup tirai kalau tur
// akun itu belum selesai — sesi tersimpan sudah ditangani script awal di
// dekat login gate.
pbTourWhenLoggedIn(function(){ if(pbTourIsPending()) pbTourHoldCurtain(); });
