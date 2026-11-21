// fitur/video-revisi-skrip.js — Video — Revisi Skrip untuk mode 1 produk.
// Bagian dari js/10-main-app.js lama (baris 22474–24449). Isi tidak diubah.
// ============================================================
// REVISI SCRIPT — MODE 1 PRODUK (AI/manual, BUKAN Bulk). Buka/tutup
// panel masukan bebas (+ opsi ganti foto/keunggulan/target audience),
// kirim ke AI supaya ketiga script (Hook/Story/CTA) digenerate ulang
// mengikuti masukan itu, dan sediakan tombol undo 1 langkah kalau
// hasil revisi ternyata tidak sesuai harapan.
// ============================================================

// Backup 1 langkah (script sebelum revisi TERAKHIR) — dipakai vbUndoSingleRevisi().
// null = tidak ada yang bisa di-undo (belum pernah revisi / sudah di-undo).
let VB_SINGLE_REVISI_BACKUP=null;

function vbToggleSingleRevisiPanel(){
  let panel=document.getElementById('vb-single-revisi-panel');
  if(!panel)return;
  if(!panel.classList.contains('hidden')){
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');
  // Setiap dibuka, sinkronkan field target audience & foto di panel dengan
  // kondisi TERKINI — supaya kalau user sudah pernah ganti foto/target lewat
  // panel ini di revisi sebelumnya, field-nya tidak balik ke kosong/basi.
  let targetEl=document.getElementById('vb-single-revisi-target');
  if(targetEl&&!targetEl.value){
    let current=(document.getElementById('vb-bulk-target')||{}).value||(typeof VB!=='undefined'&&VB.bulkTargetAudience)||'';
    targetEl.value=current.trim();
  }
  _vbSyncProdukFotoPreviews();
  setTimeout(function(){
    let ta=document.getElementById('vb-single-revisi-note');
    if(ta)ta.focus();
  },50);
}

// Upload/hapus foto referensi dari PANEL REVISI mode single. Menulis ke state
// global yang sama (VB.produkFotoBase64/Mime) yang dipakai step awal, lalu
// menyamakan tampilan di SEMUA tempat yang menampilkan foto ini (step 5 yang
// sudah tersembunyi + panel revisi ini sendiri) lewat _vbSyncProdukFotoPreviews().
async function vbSingleRevisiFotoUpload(input){
  let file=input.files&&input.files[0];
  if(!file)return;
  try{
    let res=await _vbCompressImageFile(file);
    VB.produkFotoBase64=res.base64;
    VB.produkFotoMime=res.mime;
    _vbSyncProdukFotoPreviews();
  }catch(e){
    console.warn('[vbSingleRevisiFotoUpload]',e);
    showToast('Gagal memproses foto: '+e.message,'error');
  }finally{
    input.value='';
  }
}
function vbSingleRevisiFotoRemove(){
  VB.produkFotoBase64='';VB.produkFotoMime='';
  _vbSyncProdukFotoPreviews();
}
function _vbSyncProdukFotoPreviews(){
  let has=!!VB.produkFotoBase64;
  let src=has?('data:'+(VB.produkFotoMime||'image/jpeg')+';base64,'+VB.produkFotoBase64):'';
  ['vb-produk-foto','vb-single-revisi-foto'].forEach(function(prefix){
    let img=document.getElementById(prefix+'-img'); if(img)img.src=src;
    let empty=document.getElementById(prefix+'-empty'); if(empty)empty.classList.toggle('hidden',has);
    let preview=document.getElementById(prefix+'-preview'); if(preview)preview.classList.toggle('hidden',!has);
  });
  _vbRenderProdukFotoMulti();
}

async function vbRevisiSingleAI(){
  if(_vbGuardGenerating()){showToast('Tunggu proses sebelumnya selesai dulu.','error');return;}
  // FITUR BARU (permintaan user, Sept 2026): revisi mode single juga
  // dibatasi MAKSIMAL 1x — kalau VB_SINGLE_REVISI_BACKUP sudah keisi artinya
  // jatah revisi sudah kepakai & belum di-undo. Sama seperti bulk, ini
  // defense in depth di samping tombol yang sudah di-disable/relabel di
  // bagian akhir fungsi ini.
  if(VB_SINGLE_REVISI_BACKUP){
    showToast('Sudah dipakai jatah revisinya (maks 1x). Klik "Kembali ke Versi Sebelumnya" dulu kalau mau revisi ulang.','error');
    return;
  }
  let noteEl=document.getElementById('vb-single-revisi-note');
  let note=noteEl?noteEl.value.trim():'';
  if(!note){
    showToast('Tulis dulu masukan revisinya, misal "lebih santai kayak ngomong ke teman" atau "lebih heboh"','error');
    if(noteEl)noteEl.focus();
    return;
  }
  // Nama produk: prioritaskan yang sudah tersimpan di kartu (VB_BULK_ITEMS,
  // diisi dari produkNamaForHistory saat generate awal) — ini benar untuk
  // SEMUA jalur (AI, manual biasa, maupun manual mode "khusus produk" yang
  // ambil nama dari field berbeda). Fallback ke field #vb-produk-nama kalau
  // karena suatu hal kartu belum sempat menyimpannya.
  let produkNama=(VB_BULK_ITEMS[0]&&VB_BULK_ITEMS[0].produk)||'';
  if(!produkNama){
    let fallbackEl=document.getElementById('vb-produk-nama');
    produkNama=fallbackEl?fallbackEl.value.trim():'';
  }
  if(!produkNama){
    showToast('Nama produk tidak ditemukan — generate script dari awal dulu ya.','error');
    return;
  }
  let keunggulanEl=document.getElementById('vb-single-revisi-keunggulan');
  let keunggulan=keunggulanEl?keunggulanEl.value.trim():'';
  // Target audience SEKARANG WAJIB diisi eksplisit lewat field di panel ini
  // (bukan disamarkan diam-diam jadi "audiens umum" seperti sebelumnya) —
  // panel sudah otomatis mengisi field ini dari step awal saat dibuka
  // (lihat vbToggleSingleRevisiPanel), jadi biasanya user tinggal lanjut,
  // TAPI kalau memang kosong (mis. mode Manual yang tidak mewajibkannya),
  // user diminta mengisi sendiri di sini supaya hasil revisi tetap tepat
  // sasaran dan bukan tebakan diam-diam dari sistem.
  let targetEl=document.getElementById('vb-single-revisi-target');
  let targetAudience=targetEl?targetEl.value.trim():'';
  if(!targetAudience){
    showToast('Isi dulu Target Audience di panel revisi ini ya','error');
    if(targetEl)targetEl.focus();
    return;
  }

  // FIX (audit — sisa jalur API-key lama, sama seperti di vbGenerateBulkAI):
  // blok "if(!VAI.apiKey){...openApiKeyModal()}" yang sebelumnya ada di sini
  // dihapus karena tidak pernah bisa jalan — lihat catatan lengkap di
  // vbGenerateBulkAI.
  let dlCheck=dlCheckBeforeCall();
  if(!dlCheck.ok){showToast(dlCheck.message,'error');return;}

  let submitBtn=document.getElementById('vb-single-revisi-submit');
  let originalText=submitBtn?submitBtn.textContent:'';
  let revisiSucceeded=false; // dipakai finally di bawah buat memutuskan tombol direset atau dikunci
  VAI._isGenerating=true;VAI._lastGenTime=Date.now();
  _vbAcquireWakeLock();
  if(submitBtn){submitBtn.disabled=true;submitBtn.innerHTML='<svg class="icon"><use href="#ic-clock"></use></svg> Memproses...';}
  try{
    // Simpan kondisi SEBELUM ditimpa hasil revisi — supaya bisa dikembalikan
    // lewat tombol "Kembali ke Versi Sebelumnya" kalau hasilnya tidak sesuai.
    VB_SINGLE_REVISI_BACKUP={
      produk:produkNama,
      scripts:[0,1,2].map(function(i){return VB_BULK_ITEMS[i]?VB_BULK_ITEMS[i].script:'';})
    };
    // FIX HEMAT BIAYA (permintaan user, Sept 2026): cacheSystem=false —
    // sama alasan seperti vbRevisiProdukAI: revisi cuma boleh 1x sebelum
    // di-undo, jadi cache_control di sini cuma bakal kena cache_creation
    // (+25%) tanpa pernah sempat kena cache_read (diskon 90%). Dicabut.
    _vbStartUsageSession('Revisi Script (Single) — '+produkNama,1); // SESI BARU (permintaan user): tiap revisi jadi baris tersendiri di panel statistik.
    let arr=await _vbCallBulkBatch([{nama:produkNama,keunggulan:keunggulan,fotoBase64:VB.produkFotoBase64||'',fotoMime:VB.produkFotoMime||''}],targetAudience,_vbNoteWithOldScript(note,VB_SINGLE_REVISI_BACKUP.scripts),function(waitMs,attempt,status){
      if(!submitBtn)return;
      let alasan=_vbWaitReasonLabel(status);
      if(status==='thinking'){submitBtn.innerHTML='<svg class="icon"><use href="#ic-clock"></use></svg> 🤔 '+alasan+'...';return;}
      let detik=Math.ceil(waitMs/1000);
      submitBtn.innerHTML='<svg class="icon"><use href="#ic-clock"></use></svg> ⏳ '+alasan+' (~'+detik+'dtk)...';
    },undefined,undefined,false,undefined,true); // param terakhir = fixShort: AI memperpendek bagian yang kelebihan kata (bukan dipotong kode); potong lokal hanya cadangan terakhir (permintaan user, 12 Okt 2026)
    dlIncrement();
    if(!arr||!arr[0])throw new Error('Hasil belum berhasil dibuat, coba lagi.');
    let p=arr[0];
    if(!p.produk)p.produk=produkNama;
    // audit Okt 2026 (v11.85): hasil API sudah diterima & kuota terpotong → dari sini revisi dianggap berhasil, apa pun yang terjadi
    // di animasi/riwayat. Dulu error di animasi masuk ke catch yang MENGHAPUS backup (padahal skrip lama sudah mulai tertimpa).
    revisiSucceeded=true;
    let undoBtn=document.getElementById('vb-single-revisi-undo-btn');
    if(undoBtn)undoBtn.classList.remove('hidden');
    try{
      // Reuse fungsi yang sama persis dipakai revisi 1 produk di mode Bulk —
      // prodIdx=0 karena mode single cuma punya 1 "produk" (3 kartu: idx 0/1/2).
      await _vbAnimateProductCards(0,p);
    }catch(eAnim){
      console.warn('[vbRevisiSingleAI] animasi kartu gagal, hasil ditulis langsung:',eAnim);
      try{_vbApplyProductCardsInstant(0,p);}catch(_e){}
    }
    try{
      vbToggleSingleRevisiPanel();
      if(noteEl)noteEl.value='';
      _vbBuildCombinedHistoryEntry(_vbPer()+' script (revisi)'+(produkNama?' — '+produkNama:''));
    }catch(ePost){console.warn('[vbRevisiSingleAI] langkah penutup gagal (non-fatal):',ePost);}
    showToast('Script berhasil direvisi! (jatah revisi sudah kepakai — klik "Kembali ke Versi Sebelumnya" kalau mau ulang)','success');
  }catch(err){
    console.error('vbRevisiSingleAI error:',err);
    if(!revisiSucceeded)VB_SINGLE_REVISI_BACKUP=null; // gagal SEBELUM ada yang ditimpa — tidak ada perubahan yang perlu di-undo
    showToast('Gagal revisi: '+err.message,'error');
  }finally{
    VAI._isGenerating=false;
    _vbReleaseWakeLock();
    if(submitBtn){
      if(revisiSucceeded){
        // Revisi sukses & jatah sudah kepakai — tombol dikunci permanen
        // (relabel, bukan "Memproses..." lagi) sampai user klik Undo.
        submitBtn.disabled=true;
        submitBtn.textContent='Sudah direvisi 1x — undo dulu utk revisi lagi';
      }else{
        submitBtn.disabled=false;
        submitBtn.textContent=originalText;
      }
    }
  }
}

// Kembalikan 3 kartu ke kondisi SEBELUM revisi AI terakhir (undo 1 langkah,
// bukan riwayat penuh — cukup buat kasus "ternyata versi lama lebih bagus").
function vbUndoSingleRevisi(){
  if(!VB_SINGLE_REVISI_BACKUP){showToast('Tidak ada revisi untuk dibatalkan.','error');return;}
  let backup=VB_SINGLE_REVISI_BACKUP;
  backup.scripts.forEach(function(scriptText,i){
    let ta=document.getElementById('vb-bulk-script-'+i);
    if(ta)ta.value=scriptText;
    if(VB_BULK_ITEMS[i]){VB_BULK_ITEMS[i].script=scriptText;VB_BULK_ITEMS[i].produk=backup.produk||VB_BULK_ITEMS[i].produk;}
    vbBulkUpdateJson(i);
  });
  VB_SINGLE_REVISI_BACKUP=null;
  let undoBtn=document.getElementById('vb-single-revisi-undo-btn');
  if(undoBtn)undoBtn.classList.add('hidden');
  // FITUR BARU (permintaan user, Sept 2026): buka kunci tombol submit revisi
  // lagi — jatah revisi (maks 1x) kembali tersedia setelah di-undo.
  let submitBtn=document.getElementById('vb-single-revisi-submit');
  if(submitBtn){submitBtn.disabled=false;submitBtn.textContent='Revisi Sekarang';}
  _vbBuildCombinedHistoryEntry(_vbPer()+' script (kembali ke versi sebelum revisi)'+(backup.produk?' — '+backup.produk:''));
  showToast('Dikembalikan ke versi sebelum revisi.','success');
}

// FIX (permintaan user): dulu fungsi ini motong paksa skrip hasil AI ke
// maksimal N kata sesuai rentang nada bicara yang dipilih. Sekarang
// dimatikan — skrip dari AI dipakai APA ADANYA (utuh, tidak dipotong).
// Nama fungsi & pemanggilnya dibiarkan sama supaya tidak perlu ubah kode
// lain; cukup di sini saja logicnya dinonaktifkan.
function _vbTruncate25Words(text){
  return text||'';
}

// Dipanggil tiap user ngetik di textarea script bulk — update JSON-nya realtime.
// FIX (permintaan user): dulu di sini ada pemotongan paksa kalau jumlah kata
// lewat batas atas rentang nada bicara — sekarang dihapus, user bebas isi/edit
// skrip sepanjang apa pun. Counter kata di bawah tetap tampil, cuma sebagai
// info (bukan pembatas lagi).
function vbBulkUpdateJson(i){
  let range=vbGetWordRange();
  let ta=document.getElementById('vb-bulk-script-'+i);
  let jsonBox=document.getElementById('vb-bulk-json-'+i);
  let wcLabel=document.getElementById('vb-bulk-wc-'+i);
  if(!ta||!jsonBox)return;
  try{_vbDuaSync(i);}catch(_eDs){} // Percakapan 2 Suara: samakan 4 baris berlabel dengan isi textarea
  let words=new Array(_vbWcNoParen(ta.value)); // kata dalam kurung tidak dihitung
  if(VB_BULK_ITEMS[i])VB_BULK_ITEMS[i].script=ta.value;
  let produkForItem=VB_BULK_ITEMS[i]?VB_BULK_ITEMS[i].produk:'';
  jsonBox.textContent=_vbBuildFlowText(ta.value,produkForItem,_vbTampilText(i),_vbLokasiText(i),_vbFotoCountVal(i),i);
  if(wcLabel){wcLabel.textContent=words.length+'/'+range.min+'-'+range.max+' kata';wcLabel.style.color=(words.length>=range.min&&words.length<=range.max)?'var(--green)':'var(--muted2)';}
  _vbAccRefresh(Math.floor(i/3));
}

// CATATAN (Sept 2026): vbGenerate3Manual() (tombol "Buat 3 JSON dari Script
// Ini") DIHAPUS — digantikan vbManualLiveInit() yang langsung merender kartu
// kosong siap-ketik begitu chip "Tulis Manual Sendiri" dipilih. Lihat
// definisi vbManualLiveInit() di dekat vbSelectScriptMode().

// Notifikasi "Prompt Video Siap" (lihat komentar HTML-nya) — dipanggil
// begitu 3 script dari mode "Kami Bantu Isi" (1 produk) selesai lengkap
// tampil di kartu hasil.
function vbShowScriptReadyNotif(){
  // (Nov 2026) Tampilan lama "Prompt vidio Ai udah siap" diganti video panduan Video AI.
  vbTourVidShow();
}
function vbCloseScriptReadyNotif(){
  let el=document.getElementById('vb-scriptready-overlay');
  if(el)el.classList.remove('show');
}
// FITUR BARU (permintaan user, diubah): "Mengerti" di notifikasi "Prompt
// Video Siap" TIDAK LAGI langsung lompat ke kolom Video AI. Sekarang cuma
// menutup notifikasinya dan mengembalikan user ke kolom skrip (Hook/Story/
// CTA) yang sudah siap di baliknya, lalu memberi kartu Hook denyutan
// kuning supaya user tahu harus klik "Salin" di situ dulu. Lanjut ke
// kolom Video AI (18 foto) baru terjadi lewat vbHookCopyLanjutClick(),
// dipicu tombol "Lanjut →" baru yang muncul di bawah kartu skrip SETELAH
// user benar-benar klik "Salin" di kartu Hook (lihat copyBtn.onclick di
// _vbBuildEditableCard).
function vbScriptReadyNext(){
  vbCloseScriptReadyNotif();
  pbTourWaitingHookCopy=true;
  let hookCopyBtn=document.getElementById('vb-bulk-copy-0');
  if(hookCopyBtn) hookCopyBtn.classList.add('vb-pulse-yellow');
  // FITUR DIREVISI (permintaan user): tadinya cuma kotak teks skrip
  // (vb-ta-wrap-0) yang diberi denyutan emas halus/lambat. Sekarang
  // dipindah ke SELURUH kartu Hook (vb-card-0) — jadi kotak skrip DAN
  // kotak prompt/JSON di bawahnya sama-sama kena denyutan, biar user makin
  // yakin KARTU mana yang isinya baru disalin, bukan cuma sebagian kotaknya.
  let hookCard=document.getElementById('vb-card-0');
  if(hookCard) hookCard.classList.add('vb-box-pulse-gold');
  // FITUR BARU (permintaan user): kunci tombol Salin di SEMUA kartu lain
  // (Cerita Produk/CTA, idx>=1) selama nunggu Hook disalin, biar user tidak
  // salah pencet. Dicari lewat pola id vb-bulk-copy-N, bukan angka tetap,
  // supaya tetap aman kalau suatu saat ada >3 kartu (mis. mode bulk).
  document.querySelectorAll('[id^="vb-bulk-copy-"]').forEach(function(btn){
    if(btn.id!=='vb-bulk-copy-0'){
      btn.classList.add('vb-copy-locked');
      // (Nov 2026) Salin Story & Salin CTA disembunyikan total sampai gilirannya.
      btn.classList.add('vb-tour-copy-hide');
    }
  });
  // FITUR BARU (permintaan user): begitu skrip sudah selesai ditampilkan
  // di kolom skrip, kunci juga SEMUA tombol lain di kolom itu (Tampilan,
  // Lokasi, "Buat Prompt Video Baru", dst) — satu-satunya yang tetap aktif
  // cuma tombol Salin di kartu Hook. Dan KHUSUS 2 tombol ini, bukan cuma
  // dikunci tapi disembunyikan total sampai Hook disalin: "Revisi Script
  // dengan AI" (single & per-produk Bulk) dan "Ubah Suara Karakter/Target
  // Audience" (Bulk) — supaya user difokuskan salin Hook dulu, tidak
  // kegoda mengubah-ubah skrip duluan.
  pbLockScriptAreaExtras();
}
// Kunci semua tombol di kolom skrip (selain Salin kartu Hook), dan
// sembunyikan total tombol Revisi + Ubah Suara Karakter/Target Audience.
// Dipanggil dari vbScriptReadyNext() di atas. Pasangan pembukanya:
// pbUnlockScriptAreaExtras() (dipanggil begitu Hook benar-benar disalin,
// lihat copyBtn.onclick di _vbBuildEditableCard, dan juga dari
// pbHideOverlay() sebagai jaga-jaga kalau tur di-skip di tengah jalan).
function pbLockScriptAreaExtras(exceptBtnId){
  // FIX (bug "saat menunggu Salin kartu 1/2, tombol lain tidak dikunci"):
  // dulu id tombol yang dikecualikan ('vb-bulk-copy-0') ditulis mati di
  // sini, jadi fungsi ini cuma pernah dipakai buat tahap tunggu-Hook.
  // Sekarang bisa dipanggil dengan tombol lain yang mau dikecualikan
  // (mis. 'vb-bulk-copy-1' saat menunggu Salin kartu Cerita Produk) —
  // default tetap 'vb-bulk-copy-0' kalau parameter tidak diisi, supaya
  // semua pemanggil lama tidak perlu diubah.
  if(!exceptBtnId) exceptBtnId='vb-bulk-copy-0';
  let wrap=document.getElementById('vb-multi-output');
  if(!wrap) return;
  wrap.querySelectorAll('button').forEach(function(btn){
    if(btn.id===exceptBtnId) return; // satu-satunya yang tetap aktif
    btn.classList.add('vb-copy-locked');
  });
  // Sembunyikan total (bukan cuma dikunci) — mode single & Bulk sekaligus,
  // supaya tetap aman kalau suatu saat mode Bulk ikut dipakai di tengah tur.
  ['vb-single-revisi-btn','vb-single-revisi-undo-btn'].forEach(function(id){
    let el=document.getElementById(id);
    if(el) el.classList.add('pb-tour-hidden-extra');
  });
  wrap.querySelectorAll('[id^="vb-revisi-btn-"],[id^="vb-char-btn-"]').forEach(function(el){
    el.classList.add('pb-tour-hidden-extra');
  });
}
// Buka kembali semua yang dikunci/disembunyikan pbLockScriptAreaExtras().
function pbUnlockScriptAreaExtras(){
  let wrap=document.getElementById('vb-multi-output');
  if(wrap) wrap.querySelectorAll('.vb-copy-locked').forEach(function(el){el.classList.remove('vb-copy-locked');});
  document.querySelectorAll('.pb-tour-hidden-extra').forEach(function(el){el.classList.remove('pb-tour-hidden-extra');});
}
// FITUR BARU (permintaan user, direvisi): notifikasi begitu user benar-benar
// klik "Salin" di kartu Hook. SEBELUMNYA dipakai toast hijau otomatis-hilang
// (5 detik) — tapi keluhan user: warnanya hijau dan keburu hilang sebelum
// sempat klik "Lanjut". Sekarang dipindah jadi kartu overlay PERSISTEN,
// gaya sama seperti notifikasi "Prompt Video Siap" (vb-scriptready-overlay)
// — tidak otomatis hilang, baru tertutup saat user klik "Mengerti" (lihat
// markup #vb-hookcopied-overlay & vbCloseHookCopiedNotif() di bawah).
function vbShowHookCopiedNotif(){
  let el=document.getElementById('vb-hookcopied-overlay');
  if(el) el.classList.add('show');
}
function vbCloseHookCopiedNotif(){
  let el=document.getElementById('vb-hookcopied-overlay');
  if(el) el.classList.remove('show');
}
// FITUR BARU (permintaan user): dipicu tombol "Lanjut →" baru di bawah
// kartu-kartu skrip (#vb-tour-hookcopy-actions) — INI yang sekarang
// menjalankan alur lama vbScriptReadyNext() (naikkan bar progres ke titik
// "Video AI", tutup sesi tur, lalu buka kolom "Panduan Video AI"/18 foto).
function vbHookCopyLanjutClick(){
  let hcActions=document.getElementById('vb-tour-hookcopy-actions');
  if(hcActions) hcActions.classList.add('hidden');
  pbTourProgressShow(4);
  // FITUR BARU (permintaan user): prompt video sudah beneran kelar di sini
  // (sama seperti fCopy() untuk prompt Foto) — badge "sedang membuat
  // prompt" untuk video sudah tidak relevan lagi, dilepas sekarang.
  let vbProcessBadge=document.getElementById('vb-tour-process-badge');
  if(vbProcessBadge) vbProcessBadge.style.display='none';
  setTimeout(function(){
    // BUGFIX (dilaporkan user): pbEndTour() ini HARUS dipanggil SEBELUM
    // vbShowVideoGuide(), bukan sesudahnya. pbEndTour() -> pbHideOverlay()
    // punya baris "jaga-jaga" yang menutup paksa #vb-videoguide-overlay
    // (untuk kasus tur dibatalkan di tengah jalan). Kalau vbShowVideoGuide()
    // dipanggil DULU lalu pbEndTour() sesudahnya (urutan lama), overlay yang
    // baru saja dibuka langsung ditutup lagi di tick yang sama — akibatnya
    // kolom "Panduan Video AI" (kosong) kelihatan seperti tidak pernah
    // muncul sama sekali.
    if(typeof pbTourWaitingVideoGuideEnd!=='undefined' && pbTourWaitingVideoGuideEnd){
      pbTourWaitingVideoGuideEnd=false;
      pbEndTour();
    }
    vbShowVideoGuide();
  },250);
}
// ── KOLOM BARU "PANDUAN VIDEO AI" — array item disiapkan dari sekarang
// (pola sama seperti PB_STEP6EXT_ITEMS: {title,body,img,alt}), SENGAJA
// MASIH KOSONG — isinya (foto & tampilan tambahan) menyusul dikirim user.
// Selama masih kosong, vbRenderVideoGuide() menampilkan kartu kosong siap
// pakai (judul & isi blank, tombol langsung menutup kartu).
const PB_IMG_V1='media/v1.jpg';
const PB_IMG_V2='media/v2.jpg';
const PB_IMG_V3='media/v3.jpg';
const PB_IMG_V4='media/v4.jpg';
const PB_IMG_V5='media/v5.jpg';
const PB_IMG_V6='media/v6.jpg';
const PB_IMG_V7='media/v7.jpg';
const PB_IMG_V8='media/v8.jpg';
const PB_IMG_V9='media/v9.jpg';
const PB_IMG_V10='media/v10.jpg';
const PB_IMG_V11='media/v11.jpg';
const PB_IMG_V12='media/v12.jpg';
const PB_IMG_V13='media/v13.jpg';
const PB_IMG_V14='media/v14.jpg';
const PB_IMG_V15='media/v15.jpg';
const PB_IMG_V16='media/v16.jpg';
const PB_IMG_V17='media/v17.jpg';
const PB_IMG_V18='media/v18.jpg';
// FITUR DIREVISI BESAR (permintaan user, Sept 2026): urutan & isi 18 langkah
// lama diganti total jadi 17 entri. Langkah "9. Atur sesuai contoh" DIHAPUS
// (isinya digabung ke langkah 8, jadi daftar centang di bawah gambar lewat
// field afterBody). Dua langkah lain ("Klik tombol kirim (panah)" &
// "Tempel & cek lagi") diganti jadi entri {waitCopy:N} — bukan kartu teks
// biasa, tapi PEMICU balik ke tampilan kartu skrip/prompt asli (Cerita
// Produk = idx 1, CTA = idx 2) supaya user langsung klik Salin di situ;
// begitu disalin, tur otomatis lanjut ke entri berikutnya. Lihat
// vbRenderVideoGuide() & vbVideoGuideWaitCardCopy() untuk cara kerja
// {waitCopy:N}, dan field opsional `afterBody` untuk teks/daftar yang
// dirender DI BAWAH gambar (bukan sebelum, seperti `body`).
var PB_STEPVIDEOAI_ITEMS=[
  {
    title:'Bikin project baru',
    body:'<p style="margin-top:0;">Sekarang buka Google Flow dan klik (+ Baru) untuk membuat project baru.</p>',
    img:PB_IMG_V1,
    alt:'Google Flow, klik + Baru untuk membuat project baru'
  },
  {
    title:'Klik tanda (+)',
    body:'<p style="margin-top:0;">Klik tanda (+) supaya muncul tombol Upload.</p><p style="margin-top:8px;font-size:var(--fs-xs2);opacity:0.85;">Tujuan: di sini kita mau upload bahan dulu, yaitu "Foto AI", untuk dijadikan animasi.</p>',
    img:PB_IMG_V2,
    alt:'Klik tanda plus supaya tombol Upload muncul'
  },
  {
    title:'Klik tombol Upload',
    body:'<p style="margin-top:0;">Udah muncul nih tombol Upload, langsung klik aja dan upload Foto AI.</p>',
    img:PB_IMG_V3,
    alt:'Klik tombol Upload lalu pilih Foto AI'
  },
  {
    title:'Klik tanda (+) lagi',
    body:'<p style="margin-top:0;">Setelah ter-upload, klik lagi tanda (+).</p><p style="margin-top:8px;font-size:var(--fs-xs2);opacity:0.85;">Tujuannya: kita taruh Foto AI ke tempat pembuatan.</p>',
    img:PB_IMG_V4,
    alt:'Setelah ter-upload, klik lagi tanda plus'
  },
  {
    title:'Pilih foto AI',
    body:'<p style="margin-top:0;">Klik foto AI kalau tampilannya sudah seperti ini, nanti bakalan langsung ada di tempat pembuatan dengan tampilan kotak kecil.</p>',
    img:PB_IMG_V5,
    alt:'Klik foto AI, langsung masuk ke tempat pembuatan'
  },
  {
    title:'Cek fotonya sudah ter-upload',
    body:'<p style="margin-top:0;">Pastikan foto yang dipilih sudah muncul sebagai kotak kecil bahan, seperti pada contoh di bawah.</p>',
    img:PB_IMG_V6,
    alt:'Foto sudah ter-upload sebagai kotak kecil bahan'
  },
  {
    title:'Klik tombol Gambar',
    body:'<p style="margin-top:0;">Sekarang klik (Gambar 🖼 x1).</p><p style="margin-top:8px;font-size:var(--fs-xs2);opacity:0.85;">Tujuannya: kita akan edit sedikit, karena sekarang kita mau bikin fotonya jadi video, bukan jadi gambar lagi.</p>',
    img:PB_IMG_V7,
    alt:'Klik tombol Gambar x1 untuk ganti mode'
  },
  {
    title:'Atur pengaturan Video',
    body:'<p style="margin-top:0;">Pastikan setting sesuai dengan tampilan di bawah ya,</p>',
    img:PB_IMG_V8,
    alt:'Atur mode Video, 9:16, x1, 8 detik, Omni 1.1 Flash',
    afterBody:'<ul style="margin:10px 0 0;padding-left:20px;font-size:var(--fs-xs2);color:var(--muted);line-height:1.65;">'
      +'<li style="margin-bottom:4px;">Klik Video: karena kita bikin video.</li>'
      +'<li style="margin-bottom:4px;">Klik 9:16: cocok dengan rasio tampilan TikTok.</li>'
      +'<li style="margin-bottom:4px;">Klik x1: supaya pembuatannya cukup 1 kali.</li>'
      +'<li style="margin-bottom:4px;">Klik 8 dtk: supaya hasil videonya 8 detik dan sesuai dengan skrip/dialog yang udah kita buat.</li>'
      +'<li>Klik Omni 1.1 Flash: karena ini model tercanggih Google saat ini.</li>'
      +'</ul>'
  },
  {
    title:'Prompt sudah tersalin',
    body:'<p style="margin-top:0;">Udah salin prompt-nya, tinggal tempel aja di sana (tanda panah itu).</p>',
    img:PB_IMG_V10,
    alt:'Tempel prompt Hook di kolom Apa yang ingin Anda buat'
  },
  {
    title:'Klik tombol kirim',
    body:'<p style="margin-top:0;">Kalau udah, langsung klik yang telah aku tanda itu ya.</p><p style="margin-top:8px;font-size:var(--fs-xs2);opacity:0.85;">Tujuan: untuk langsung bikin videonya.</p>',
    img:PB_IMG_V11,
    alt:'Klik tombol panah untuk generate video'
  },
  {
    title:'Salin bagian Story',
    body:'<p style="margin-top:0;">Sekarang salin prompt pada bagian story. Untuk membuat video kedua.</p>'
  },
  { waitCopy:1 },
  {
    title:'Tempel lagi ke kolom',
    body:'<p style="margin-top:0;">Ulangi lagi sampai tampilannya seperti di bawah dan langsung tempel lagi prompt yang udah kita salin.</p>',
    img:PB_IMG_V13,
    alt:'Tempel prompt Cerita Produk di kolom',
    afterBody:'<p style="margin-top:8px;font-size:var(--fs-xs2);opacity:0.85;">Artinya: kita lagi bikin video ke-2, sambungan dari video pertama.</p>'
  },
  {
    title:'Klik tombol kirim',
    body:'<p style="margin-top:0;">Setelah itu langsung klik yang udah kutandai untuk bikin.</p>',
    img:PB_IMG_V14,
    alt:'Klik tombol panah untuk generate video kedua'
  },
  {
    title:'Salin bagian CTA',
    body:'<p style="margin-top:0;">Sekarang salin prompt pada bagian cta. Untuk membuat video terakhir.</p>'
  },
  { waitCopy:2 },
  {
    title:'Tempel lagi ke kolom',
    body:'<p style="margin-top:0;">Ulangi lagi ya kak seperti sebelumnya dan tempel lagi prompt-nya.</p>',
    img:PB_IMG_V16,
    alt:'Tempel prompt CTA di kolom',
    afterBody:'<p style="margin-top:8px;font-size:var(--fs-xs2);opacity:0.85;">Artinya: sekarang lagi bikin video ke-3/terakhir.</p>'
  },
  {
    title:'Klik tombol kirim',
    body:'<p style="margin-top:0;">Klik lagi yang aku tandai untuk langsung bikin.</p>',
    img:PB_IMG_V17,
    alt:'Klik tombol panah untuk generate video ketiga'
  },
  {
    title:'Selesai! 🎊',
    body:'<p style="margin-top:0;">🎊 Selamat 🎊. Udah berhasil bikin 3 video AI sekaligus. Kalau nanti muncul error, tenang aja, bikin ulang aja — kalau dalam percobaan 3× masih gagal, itu artinya server dari pihak Google lagi overload dan di sini kita nggak bisa ngapa-ngapain. Tinggal tunggu aja server Google normal lagi dan kita bikin lagi.</p>',
    img:PB_IMG_V18,
    alt:'Video sedang diproses hingga selesai'
  }
];
var pbVideoGuideIndex=0;
// GUARD (ditemukan saat audit teliti, Sept 2026): mencegah animasi
// "menyusut ke ikon Panduan" di vbVideoGuideFinish() jalan DUA KALI
// bertumpuk kalau user sempat tap tombol "Selesai" 2x sangat cepat sebelum
// kartunya sempat mengecil/transparan (overlay masih class="show" selama
// ~600ms animasi berjalan, jadi tombolnya masih "kelihatan" bisa ditekan
// lagi sesaat) — tanpa guard ini, panggilan kedua akan mengukur ulang
// posisi kartu yang SEDANG bertransisi & bikin animasinya patah-patah.
var _vbVideoGuideFinishing=false;
function vbShowVideoGuide(){
  pbVideoGuideIndex=0;
  vbRenderVideoGuide();
  let el=document.getElementById('vb-videoguide-overlay');
  if(el) el.classList.add('show');
}
// PERMINTAAN USER: seluruh langkah 1-20 panduan Video AI (PB_STEPVIDEOAI_ITEMS,
// termasuk entri {waitCopy:N}) diganti SATU video panduan (PB_VID_VIDEO_AI).
// Tombolnya langsung "Selesai" (animasi menyusut ke tab Panduan, lihat
// vbVideoGuideFinish). Versi lama per-langkah dibiarkan di bawah sebagai
// referensi (vbRenderVideoGuideLegacy), tidak dipanggil lagi.
function vbRenderVideoGuide(){
  let titleEl=document.getElementById('vb-videoguide-title');
  let bodyEl=document.getElementById('vb-videoguide-body');
  let btn=document.getElementById('vb-videoguide-btn');
  let backBtn=document.getElementById('vb-videoguide-back-btn');
  if(backBtn) backBtn.style.display='none';
  if(titleEl){ titleEl.textContent='Yuk, bikin video AI-nya'; pbGlowTitle(titleEl); }
  if(bodyEl) bodyEl.innerHTML=pbVidPlayerHtml(PB_VID_VIDEO_AI);
  if(btn){ btn.textContent='Selesai'; btn.onclick=vbVideoGuideFinish; }
}
function vbRenderVideoGuideLegacy(){
  let item=PB_STEPVIDEOAI_ITEMS[pbVideoGuideIndex];
  // FITUR BARU (permintaan user): entri {waitCopy:N} bukan kartu teks biasa —
  // begitu ketemu, langsung tutup overlay panduan & pindah ke tampilan kartu
  // skrip/prompt asli supaya user klik Salin di kartu ke-N (Cerita
  // Produk=1/CTA=2). Tur otomatis lanjut sendiri begitu disalin (lihat
  // vbVideoGuideWaitCardCopy() & copyBtn.onclick di _vbBuildEditableCard).
  if(item&&item.waitCopy!=null){
    vbVideoGuideWaitCardCopy(item.waitCopy);
    return;
  }
  let titleEl=document.getElementById('vb-videoguide-title');
  let bodyEl=document.getElementById('vb-videoguide-body');
  let btn=document.getElementById('vb-videoguide-btn');
  // FITUR BARU (permintaan user): tombol "← Kembali" di samping "Lanjut →".
  // Tampil HANYA kalau langkah SEBELUMNYA (index-1) adalah kartu teks biasa
  // (bukan entri {waitCopy:N}) — mundur melewati titik "tunggu Salin" tidak
  // didukung (lihat komentar panjang di CSS .vb-scriptready-actions) supaya
  // status kunci/denyutan tombol Salin kartu tidak jadi tidak sinkron.
  // Otomatis tersembunyi juga di langkah pertama (pbVideoGuideIndex===0).
  let backBtn=document.getElementById('vb-videoguide-back-btn');
  if(backBtn){
    let prevItem=pbVideoGuideIndex>0?PB_STEPVIDEOAI_ITEMS[pbVideoGuideIndex-1]:null;
    let canGoBack=!!(prevItem && prevItem.waitCopy==null);
    backBtn.style.display=canGoBack?'':'none';
  }
  if(item){
    let isLast=(pbVideoGuideIndex===PB_STEPVIDEOAI_ITEMS.length-1);
    // FITUR BARU (permintaan user): nomor langkah yang ditampilkan ("N.")
    // dihitung dari entri yang BENAR-BENAR tampil ke user saja (skip entri
    // {waitCopy:...} yang tidak pernah dirender sebagai kartu teks) — biar
    // urutannya tetap 1,2,3,... rapi, tidak ada lompatan angka.
    let visibleNum=0;
    for(let i=0;i<=pbVideoGuideIndex;i++){
      if(!PB_STEPVIDEOAI_ITEMS[i].waitCopy) visibleNum++;
    }
    if(titleEl) titleEl.textContent=visibleNum+'. '+item.title;
    // FITUR BARU (permintaan user): field opsional `afterBody` dirender
    // SETELAH gambar (bukan sebelum, seperti `body`) — dipakai untuk daftar
    // pengaturan atau catatan "Artinya: ..." yang memang harus tampil di
    // bawah foto contohnya.
    if(bodyEl) bodyEl.innerHTML=item.body+(item.img?pbFrameShot(item.img,item.alt||''):'')+(item.afterBody||'');
    if(btn){ btn.textContent=isLast?'Selesai':'Lanjut →'; btn.onclick=isLast?vbVideoGuideFinish:vbVideoGuideNext; }
  } else {
    // Belum ada isinya sama sekali — kartu kosong siap dipakai.
    if(titleEl) titleEl.textContent='';
    if(bodyEl) bodyEl.innerHTML='';
    if(btn){ btn.textContent='Lanjut →'; btn.onclick=vbVideoGuideFinish; }
  }
}
function vbVideoGuidePrev(){
  // Pasangan vbVideoGuideNext() — mundur 1 langkah. Dibatasi supaya tidak
  // bisa mundur ke entri {waitCopy:N} atau ke sebelum langkah pertama (lihat
  // penjelasan lengkap di komentar CSS .vb-scriptready-actions & toggle
  // tombolnya di vbRenderVideoGuide — tombol ini memang sudah disembunyikan
  // duluan kalau kondisinya begini, pengecekan di sini cuma jaga-jaga).
  if(pbVideoGuideIndex<=0) return;
  let prevItem=PB_STEPVIDEOAI_ITEMS[pbVideoGuideIndex-1];
  if(!prevItem||prevItem.waitCopy!=null) return;
  pbVideoGuideIndex--;
  vbRenderVideoGuide();
}
function vbVideoGuideNext(){
  if(pbVideoGuideIndex<PB_STEPVIDEOAI_ITEMS.length-1){
    pbVideoGuideIndex++;
    vbRenderVideoGuide();
  } else {
    vbVideoGuideFinish();
  }
}
function vbVideoGuideFinish(){
  if(typeof pbStep2bVidStop==='function') pbStep2bVidStop();
  let el=document.getElementById('vb-videoguide-overlay');
  let card=document.getElementById('vb-videoguide-card');
  let navEl=document.querySelector('.nav');
  let panduanBtn=document.getElementById('ntab-panduan');
  // FITUR BARU (permintaan user): begitu user klik "Selesai" di langkah
  // TERAKHIR tur, sebelum benar-benar ditutup, kartu panduan ini
  // dianimasikan "menyusut" & terbang menuju ikon tab "Panduan" di nav
  // bawah (tempat tombol "Lihat Tur Panduan Lagi" berada) — supaya user
  // tahu nanti kalau butuh tur lagi, tinggal buka tab itu. Nav bawah
  // MEMANG disembunyikan selama tur (pb-tour-navhide, lihat pbStartTour),
  // jadi di sini ditampilkan dulu SEBELUM animasi dimulai supaya posisi
  // ikon tujuannya sudah ada di layar & bisa diukur (getBoundingClientRect).
  // Kalau kartu/tombol tujuan/overlay tidak ketemu (mis. dipanggil dari
  // jalur lain di luar tampilan normal), langsung fallback ke penutupan
  // biasa TANPA animasi — supaya fungsi ini tetap aman dipanggil dari
  // mana saja seperti sebelumnya.
  if(navEl) navEl.classList.remove('pb-tour-navhide');
  if(_vbVideoGuideFinishing) return; // sudah dalam proses animasi/penutupan — abaikan panggilan tumpang tindih
  if(card && panduanBtn && el && el.classList.contains('show')){
    _vbVideoGuideFinishing=true;
    // FIX: backdrop gelap+blur overlay ini z-index-nya JAUH lebih tinggi
    // dari nav bawah (10001 vs 100) — kalau tidak diangkat sementara, nav
    // yang baru ditampilkan di atas TETAP ketutup gelap/buram di belakang
    // backdrop, jadi ikon tujuannya tidak akan kelihatan sama sekali
    // selama animasi berjalan. Diangkat sementara ke atas overlay di sini,
    // dikembalikan lagi ke normal begitu animasi & cleanup selesai.
    if(navEl) navEl.style.zIndex='10002';
    let cardRect=card.getBoundingClientRect();
    let targetRect=panduanBtn.getBoundingClientRect();
    let cx=cardRect.left+cardRect.width/2, cy=cardRect.top+cardRect.height/2;
    let tx=targetRect.left+targetRect.width/2, ty=targetRect.top+targetRect.height/2;
    let dx=tx-cx, dy=ty-cy;
    let scale=Math.max(0.06,targetRect.width/cardRect.width);
    card.style.transition='transform 0.55s cubic-bezier(.3,.9,.4,1), opacity 0.5s ease 0.05s';
    card.style.transformOrigin='center center';
    void card.offsetWidth; // paksa reflow dulu supaya transisi di bawah ini kepakai, bukan langsung loncat
    card.style.transform='translate('+dx+'px,'+dy+'px) scale('+scale+')';
    card.style.opacity='0';
    // Begitu "sampai", ikon Panduan dikasih kilau sebentar biar kelihatan
    // jelas itu tujuannya — dilepas lagi otomatis setelah ~1.2 detik.
    setTimeout(function(){
      panduanBtn.classList.add('pb-tour-finish-pulse');
      setTimeout(function(){panduanBtn.classList.remove('pb-tour-finish-pulse');},1200);
    },500);
    setTimeout(function(){
      // Reset gaya kartu SEBELUM overlay ditutup total, supaya kalau tur
      // dipakai lagi nanti (replay), kartu tidak kebawa transform/opacity
      // sisa animasi kali ini.
      card.style.transition='';card.style.transform='';card.style.opacity='';
      if(navEl) navEl.style.zIndex='';
      _vbVideoGuideFinishing=false;
      _vbVideoGuideFinishCleanup();
    },600);
    return;
  }
  _vbVideoGuideFinishCleanup();
}
// Bagian penutupan SEBENARNYA tur (dipisah dari vbVideoGuideFinish supaya
// bisa dipanggil BAIK langsung MAUPUN setelah animasi "menyusut" di atas
// selesai) — isinya sama persis seperti vbVideoGuideFinish() versi lama.
function _vbVideoGuideFinishCleanup(){
  if(typeof pbStep2bVidStop==='function') pbStep2bVidStop();
  let el=document.getElementById('vb-videoguide-overlay');
  if(el) el.classList.remove('show');
  // Ini titik akhir SEBENARNYA seluruh tur (tahap terakhir "Video AI") —
  // sekarang nav bawah boleh muncul lagi (permintaan user).
  // v6.44: satu-satunya titik "tur SELESAI" selain tombol Lewati. Dicek lewat
  // tahap bar bintang (4 = Video AI, hanya benar saat tur sedang jalan) supaya
  // membuka Panduan Video AI di luar tur tidak ikut menandai apa-apa.
  let _wasRealTourEnd=(PB_TOUR_STAR_STAGE===4);
  if(PB_TOUR_STAR_STAGE===4 && typeof pbMarkTourDone==='function') pbMarkTourDone();
  PB_TOUR_STAR_STAGE=-1;
  let navEl=document.querySelector('.nav');
  if(navEl) navEl.classList.remove('pb-tour-navhide');
  document.body.classList.remove('pb-tour-single-produk');
  document.body.classList.remove('pb-tour-active');
  // FITUR BARU (permintaan user): tur benar-benar selesai → arahkan user ke
  // tab Panduan, denyutkan tombol "Lihat Tur Panduan Lagi", lalu restart
  // otomatis app supaya keluar total dari mode tur.
  if(_wasRealTourEnd) pbTourExitToPanduan();
}
// ── AKHIR TUR → PANDUAN → RESTART OTOMATIS (permintaan user) ─────────────
// Urutan: (1) bar bintang & sisa mode tur dilepas, (2) pindah ke tab
// Panduan, (3) tombol "Lihat Tur Panduan Lagi" berdenyut, (4) setelah
// PB_TOUR_EXIT_RELOAD_MS app di-reload otomatis. Setelah reload: draft
// wizard dibuang (isReloadNavigation), tur tidak mulai lagi (pb_tour_done
// sudah tersimpan; kalau belum sempat sync ke cloud, flag __dirty_ menjaga
// supaya tidak ditimpa), dan tab Panduan dipulihkan lewat
// 'pb_last_active_page_v1' (ditulis switchPage) — jadi user tetap di Panduan.
// Ubah durasi denyut/restart cukup lewat konstanta di bawah ini.
var PB_TOUR_EXIT_RELOAD_MS=4000;
var _pbTourExitTimer=null;
function pbTourExitCancelReload(){
  if(_pbTourExitTimer){ clearTimeout(_pbTourExitTimer); _pbTourExitTimer=null; }
  var b=document.getElementById('pb-tour-replay-btn');
  if(b) b.classList.remove('pb-replay-pulse');
}
function pbTourExitToPanduan(){
  if(_pbTourExitTimer) return; // sudah terjadwal — abaikan panggilan ganda
  try{ if(typeof pbTourProgressHide==='function') pbTourProgressHide(); }catch(e){}
  try{ if(typeof pbClearSavedTourStep==='function') pbClearSavedTourStep(); }catch(e){}
  ['pb-tour-active','pb-tour-single-produk','pb-tour-blur-context','pb-tour-final-blur','pb-tour-result-simple']
    .forEach(function(c){ document.body.classList.remove(c); });
  var navEl=document.querySelector('.nav');
  if(navEl) navEl.classList.remove('pb-tour-navhide');
  var tabBtn=document.getElementById('ntab-panduan');
  try{ if(tabBtn && typeof switchPage==='function') switchPage('panduan',tabBtn); }catch(e){}
  var replayBtn=document.getElementById('pb-tour-replay-btn');
  if(replayBtn){
    replayBtn.classList.add('pb-replay-pulse');
    // Kalau user menekan tombolnya sendiri sebelum restart, batalkan restart
    // (kalau tidak, reload akan menghancurkan tur yang baru dimulai).
    replayBtn.addEventListener('pointerdown',pbTourExitCancelReload,{once:true});
  }
  _pbTourExitTimer=setTimeout(function(){
    _pbTourExitTimer=null;
    // Jaga-jaga: jangan restart kalau ternyata tur sudah dimulai lagi.
    try{
      if(PB_TOUR_STAR_STAGE>=0) return;
      if(typeof pbTourIsRunning==='function' && pbTourIsRunning()) return;
    }catch(e){}
    // Restart yang disengaja: lewati dialog "yakin keluar?" bawaan browser.
    window._pbSkipUnloadWarn=true;
    try{ if(window.pbMarkFreshStart) window.pbMarkFreshStart(); }catch(e){}   // R1: restart tur = mulai bersih yang disengaja
    try{ location.reload(); }catch(e){ window._pbSkipUnloadWarn=false; try{ localStorage.removeItem('pb_fresh_start_v1'); }catch(x){} return; }
    // Jaring pengaman: kalau reload batal/gagal, kembalikan pengaman refresh.
    setTimeout(function(){ window._pbSkipUnloadWarn=false; },3000);
  },PB_TOUR_EXIT_RELOAD_MS);
}
// FITUR BARU (permintaan user): dipicu oleh entri {waitCopy:N} di
// PB_STEPVIDEOAI_ITEMS — tutup overlay panduan Video AI, lalu beri
// perlakuan sama seperti dulu diberikan ke Hook (vbScriptReadyNext()):
// tombol Salin kartu ke-N berdenyut kuning cepat, SELURUH kartunya
// berdenyut emas lambat (vb-card-N), dan tombol Salin kartu LAIN dikunci
// dulu. Pasangannya (buka kunci + lanjut tur) ada di copyBtn.onclick,
// _vbBuildEditableCard.
function vbVideoGuideWaitCardCopy(cardIdx){
  let el=document.getElementById('vb-videoguide-overlay');
  if(el) el.classList.remove('show');
  if(cardIdx===1) pbTourWaitingProdukCopy=true;
  else if(cardIdx===2) pbTourWaitingCtaCopy=true;
  let copyBtn=document.getElementById('vb-bulk-copy-'+cardIdx);
  if(copyBtn) copyBtn.classList.add('vb-pulse-yellow');
  vbAccEnsureOpen(Math.floor(cardIdx/3));
  let card=document.getElementById('vb-card-'+cardIdx);
  if(card) card.classList.add('vb-box-pulse-gold');
  // FIX (bug "setelah waitCopy, kartu tidak di-scroll ke layar"): overlay
  // ditutup dan tombol Salin mulai berdenyut, tapi halaman tidak dipindah
  // ke kartu itu — di HP, kartu Cerita Produk/CTA bisa ada di bawah layar
  // jadi user tidak melihat tombol yang harus ditekan. Scroll otomatis ke
  // kartunya begitu overlay ditutup.
  if(card) card.scrollIntoView({behavior:'smooth',block:'center'});
  // FIX (bug "saat menunggu Salin kartu 1/2, tombol lain tidak dikunci"):
  // sebelumnya di sini cuma tombol Salin kartu LAIN yang dikunci lewat
  // querySelectorAll manual di bawah — berbeda dengan tahap Hook yang
  // pakai pbLockScriptAreaExtras() dan ikut mengunci tombol Revisi,
  // Tampilan, Lokasi, dan "Buat Prompt Video Baru". Kalau user menekan
  // salah satu dari tombol itu selagi menunggu Salin kartu 1/2, kartu
  // bisa dirender ulang, denyutan hilang, dan pbTourWaitingProdukCopy/
  // pbTourWaitingCtaCopy jadi tidak sinkron dengan tampilan. Sekarang
  // pakai fungsi yang sama, dengan tombol Salin kartu ini yang dikecualikan.
  pbLockScriptAreaExtras('vb-bulk-copy-'+cardIdx);
}
// FITUR BARU (permintaan user): pasangan vbVideoGuideWaitCardCopy() — begitu
// kartu target selesai disalin, lepas semua denyutan/kunci lalu LANJUTKAN
// tur video guide (bukan reset ke langkah 1) ke entri berikutnya.
function vbVideoGuideResumeAfterCopy(){
  if(pbVideoGuideIndex<PB_STEPVIDEOAI_ITEMS.length-1) pbVideoGuideIndex++;
  vbRenderVideoGuide();
  let el=document.getElementById('vb-videoguide-overlay');
  if(el) el.classList.add('show');
}

// ══ (Nov 2026) VIDEO PANDUAN VIDEO AI DI AWAL TAHAP SALIN + IKON + AKHIRI TUR ══
// Alur baru: skrip siap -> video panduan tampil (menggantikan tampilan "Prompt vidio
// Ai udah siap") -> "Mengerti" -> video menyusut ke ikon (#vb-vid-fab) -> Salin Hook
// -> muncul Salin Story -> muncul Salin CTA -> muncul tombol "Akhiri tur" (kanan bawah)
// -> dialog "Kamu akan mengakhiri panduannya." (Ya / Tidak).
var vbTourVidState={seen:false,time:0,busy:false};
function vbTourVidEls(){
  return {el:document.getElementById('vb-videoguide-overlay'),card:document.getElementById('vb-videoguide-card'),fab:document.getElementById('vb-vid-fab'),body:document.getElementById('vb-videoguide-body')};
}
function vbTourVidRenderOnce(){
  let E=vbTourVidEls();
  let titleEl=document.getElementById('vb-videoguide-title');
  let btn=document.getElementById('vb-videoguide-btn');
  let backBtn=document.getElementById('vb-videoguide-back-btn');
  if(backBtn) backBtn.style.display='none';
  if(titleEl){ titleEl.textContent='Yuk, bikin video AI-nya'; pbGlowTitle(titleEl); }
  // Elemen <video> dipertahankan selama tur supaya detik terakhir tontonan tidak hilang.
  if(E.body && !E.body.querySelector('#pb-step2b-video')) E.body.innerHTML=pbVidPlayerHtml(PB_VID_VIDEO_AI);
  if(btn){ btn.textContent='Mengerti'; btn.onclick=vbTourVidMengerti; }
}
function vbTourVidShow(){
  let E=vbTourVidEls();
  if(!E.el) return;
  vbTourVidState.seen=false; vbTourVidState.time=0; vbTourVidState.busy=false;
  if(E.body) E.body.innerHTML='';
  vbTourVidRenderOnce();
  E.el.classList.remove('vb-vid-pop');
  E.el.classList.add('show');
}
function vbTourVidMengerti(){
  vbTourVidClose(function(){
    if(!vbTourVidState.seen){
      vbTourVidState.seen=true;
      vbScriptReadyNext();      // mulai tahap Salin Hook
      vbTourFocusCard(0);
    }
  });
}
// Kartu video menyusut & terbang ke ikon, lalu overlay ditutup.
function vbTourVidClose(cb){
  let E=vbTourVidEls();
  if(vbTourVidState.busy) return;
  if(!E.el||!E.card||!E.fab||!E.el.classList.contains('show')){ if(cb) cb(); return; }
  let v=document.getElementById('pb-step2b-video');
  if(v){ vbTourVidState.time=v.currentTime||0; try{ v.pause(); }catch(e){} }
  vbTourVidState.busy=true;
  E.fab.classList.add('show','vb-fab-fly');
  document.body.classList.add('vb-tour-fab-on');
  let cr=E.card.getBoundingClientRect(), fr=E.fab.getBoundingClientRect();
  let dx=(fr.left+fr.width/2)-(cr.left+cr.width/2), dy=(fr.top+fr.height/2)-(cr.top+cr.height/2);
  let sc=Math.max(0.06,fr.width/cr.width);
  E.card.style.transition='transform 0.55s cubic-bezier(.3,.9,.4,1), opacity 0.5s ease 0.05s';
  E.card.style.transformOrigin='center center';
  void E.card.offsetWidth;
  E.card.style.transform='translate('+dx+'px,'+dy+'px) scale('+sc+')';
  E.card.style.opacity='0';
  setTimeout(function(){
    // Tutup overlay DULU (memudar), baru gaya kartu dikembalikan — kalau dibalik,
    // kartu sempat "muncul lagi" sekilas di tengah layar saat overlay memudar.
    E.el.classList.remove('show');
    setTimeout(function(){
      E.card.style.transition='';E.card.style.transform='';E.card.style.opacity='';E.card.style.transformOrigin='';
      E.el.classList.remove('vb-vid-pop');
      E.fab.classList.remove('vb-fab-fly');
      vbTourVidState.busy=false;
      if(cb) cb();
    },320);
  },600);
}
// Klik ikon: video muncul lagi (kartu melayang) di detik terakhir tontonan.
function vbTourVidOpenFromFab(){
  let E=vbTourVidEls();
  if(!E.el||!E.card||!E.fab||vbTourVidState.busy||E.el.classList.contains('show')) return;
  vbTourVidRenderOnce();
  let v=document.getElementById('pb-step2b-video');
  if(v && Math.abs((v.currentTime||0)-vbTourVidState.time)>0.3){ try{ v.currentTime=vbTourVidState.time; }catch(e){} }
  vbTourVidState.busy=true;
  E.el.classList.add('vb-vid-pop');
  E.card.style.transition='none'; E.card.style.transform='none';
  let cr=E.card.getBoundingClientRect(), fr=E.fab.getBoundingClientRect();
  let dx=(fr.left+fr.width/2)-(cr.left+cr.width/2), dy=(fr.top+fr.height/2)-(cr.top+cr.height/2);
  let sc=Math.max(0.06,fr.width/cr.width);
  E.card.style.transformOrigin='center center';
  E.card.style.transform='translate('+dx+'px,'+dy+'px) scale('+sc+')';
  E.card.style.opacity='0';
  void E.card.offsetWidth;
  E.el.classList.add('show');
  E.card.style.transition='transform 0.5s cubic-bezier(.16,1,.3,1), opacity 0.35s ease';
  E.card.style.transform='none'; E.card.style.opacity='1';
  setTimeout(function(){
    E.card.style.transition='';E.card.style.transform='';E.card.style.opacity='';E.card.style.transformOrigin='';
    vbTourVidState.busy=false;
  },560);
}
// Klik di luar kartu video (hanya saat dibuka dari ikon) => menyusut lagi.
function vbVidPopBackdrop(e){
  let el=document.getElementById('vb-videoguide-overlay');
  if(el && e.target===el && el.classList.contains('vb-vid-pop')) vbTourVidClose();
}
function vbTourFocusCard(i){
  let card=document.getElementById('vb-card-'+i);
  if(card) card.scrollIntoView({behavior:'smooth',block:'center'});
}
// Memunculkan tombol Salin kartu ke-i (berdenyut) dan mengunci tombol lain.
function vbTourEnableCopy(i){
  if(typeof pbUnlockScriptAreaExtras==='function') pbUnlockScriptAreaExtras();
  let b=document.getElementById('vb-bulk-copy-'+i);
  if(b){ b.classList.remove('vb-tour-copy-hide'); b.classList.remove('vb-copy-locked'); b.classList.add('vb-pulse-yellow'); }
  let card=document.getElementById('vb-card-'+i);
  if(card) card.classList.add('vb-box-pulse-gold');
  if(typeof vbAccEnsureOpen==='function') vbAccEnsureOpen(Math.floor(i/3));
  pbLockScriptAreaExtras('vb-bulk-copy-'+i);
}
function vbTourAfterHookCopy(){
  let badge=document.getElementById('vb-tour-process-badge');
  if(badge) badge.style.display='none';
  if(_vb16()){vbTourAfterStoryCopy();return;} // 16 detik: tidak ada kartu Story, langsung ke CTA
  pbTourWaitingProdukCopy=true;
  vbTourEnableCopy(1);
}
function vbTourAfterStoryCopy(){
  pbTourWaitingCtaCopy=true;
  vbTourEnableCopy(2);
  vbTourFocusCard(2);
}
function vbTourAfterCtaCopy(){
  if(typeof pbUnlockScriptAreaExtras==='function') pbUnlockScriptAreaExtras();
  document.querySelectorAll('.vb-tour-copy-hide').forEach(function(el){el.classList.remove('vb-tour-copy-hide');});
  pbTourProgressShow(4); // tahap terakhir: Video AI
  let eb=document.getElementById('vb-tour-end-btn');
  if(eb) eb.classList.add('show');
  document.body.classList.add('vb-tour-fab-on');
}
function vbTourEndAsk(){
  if(document.getElementById('vb-tour-end-confirm')) return;
  let overlay=document.createElement('div');
  overlay.id='vb-tour-end-confirm';
  overlay.className='confirm-overlay pb-tour-notif';
  let box=document.createElement('div'); box.className='confirm-box';
  let p=document.createElement('p'); p.textContent='Kamu akan mengakhiri panduannya.';
  let btns=document.createElement('div'); btns.style.cssText='display:flex;gap:10px;';
  let yes=document.createElement('button'); yes.type='button'; yes.textContent='Ya'; yes.style.flex='1';
  let no=document.createElement('button'); no.type='button'; no.textContent='Tidak'; no.style.flex='1';
  no.style.setProperty('background','transparent','important');
  no.style.setProperty('color','var(--text)','important');
  no.style.setProperty('border','1px solid var(--border-hi)','important');
  no.style.setProperty('box-shadow','none','important');
  btns.appendChild(yes); btns.appendChild(no);
  box.appendChild(p); box.appendChild(btns);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  no.onclick=function(){ overlay.remove(); };
  yes.onclick=function(){ overlay.remove(); vbTourEndYes(); };
}
function vbTourEndYes(){
  vbTourVidReset();
  if(typeof PB_TOUR_STAR_STAGE!=='undefined' && PB_TOUR_STAR_STAGE!==4) pbTourProgressShow(4);
  if(typeof pbTourWaitingVideoGuideEnd!=='undefined') pbTourWaitingVideoGuideEnd=false;
  pbEndTour();
  _vbVideoGuideFinishCleanup(); // menandai tur selesai + kembali ke tab Panduan
}
// Bersihkan ikon, tombol Akhiri tur, dan video (dipanggil saat tur berakhir/di-skip).
function vbTourVidReset(){
  vbTourVidState.seen=false; vbTourVidState.time=0; vbTourVidState.busy=false;
  let fab=document.getElementById('vb-vid-fab');
  if(fab) fab.classList.remove('show','vb-fab-fly');
  let eb=document.getElementById('vb-tour-end-btn');
  if(eb) eb.classList.remove('show');
  document.body.classList.remove('vb-tour-fab-on');
  let dlg=document.getElementById('vb-tour-end-confirm');
  if(dlg) dlg.remove();
  let el=document.getElementById('vb-videoguide-overlay');
  if(el){ el.classList.remove('show'); el.classList.remove('vb-vid-pop'); }
  let card=document.getElementById('vb-videoguide-card');
  if(card){ card.style.transition='';card.style.transform='';card.style.opacity=''; }
  let body=document.getElementById('vb-videoguide-body');
  if(body && body.querySelector('#pb-step2b-video')){ try{ pbStep2bVidStop(); }catch(e){} body.innerHTML=''; }
}
var pbTourWaitingProdukCopy=false;
var pbTourWaitingCtaCopy=false;

// ── Render 3 kartu JSON (dipakai jalur AI maupun manual) ──
// ── Kartu kompak & bisa diedit — dipakai bareng oleh jalur AI single,
// manual, maupun bulk. Textarea script + counter kata + preview JSON
// yang update REALTIME setiap ketikan, tanpa perlu generate ulang. ──
// skipInitialFill: kalau true, textarea/preview JSON/counter kata dibangun
// dalam kondisi KOSONG dulu (biar bisa diketik pelan-pelan lewat
// _vbTypewriterSequentialRun sesudahnya) — tapi VB_BULK_ITEMS[idx].script
// tetap disimpan lengkap sejak awal supaya Riwayat/fitur lain yang baca
// dari situ tidak ikut kepotong cuma karena animasinya belum selesai.
function _vbBuildEditableCard(idx,label,initialScript,produkNamaForHistory,skipInitialFill,manualEmpty){
  // Durasi 16 detik: slot 0 = "Hook + Story" (kartu pertama), slot 1 (Story) disembunyikan & kosong, slot 2 = CTA bernomor 2.
  if(_vb16()&&typeof idx==='number'){
    if(idx%3===0)label='<span class="step-num-inline">1</span> Hook + Story <span style="font-weight:400;opacity:.75;">· masalah + solusi</span>';
    else if(idx%3===2)label='<span class="step-num-inline">2</span> CTA Keranjang <span style="font-weight:400;opacity:.75;">· ajakan</span>';
  }
  // FIX BUG#19 (ditemukan saat audit lanjutan): kalau _vbFixWordCountIfNeeded
  // gagal menepatkan jumlah kata jadi PERSIS 25 setelah 2x percobaan (AI tetap
  // ngasih 27/30 kata dkk), teks itu dikembalikan APA ADANYA — lalu baris di
  // bawah ini (_vbTruncate25Words) diam-diam MEMOTONG di kata ke-25 tanpa
  // tanda apa pun. Masalahnya label penghitung kata di bawah cuma mengecek
  // hasil AKHIR (yang sudah pasti 25 setelah dipotong) dan mewarnainya HIJAU
  // — sama persis seperti skrip yang memang natural pas 25 kata dari AI.
  // Akibatnya user tidak sadar skrip yang dia lihat itu KALIMAT TERPOTONG
  // (bisa kehilangan kata penutup CTA dkk) karena tampilannya identik dengan
  // skrip yang valid. Sekarang dideteksi dulu apakah teks ASLI (sebelum
  // dipotong) lebih dari 25 kata — kalau iya, beri tanda visual berbeda
  // (oranye + catatan) supaya user tahu perlu dicek/diedit manual.
  //
  // FIX LANJUTAN (laporan user): tambalan di atas CUMA menangani kasus AI
  // KELEBIHAN kata (>25, lalu dipotong). Kasus AI KEKURANGAN kata (mis. tetap
  // 23 kata setelah 2x percobaan gagal PAS 25) TIDAK kena tambalan itu sama
  // sekali — _wasAutoTruncated tetap false karena syaratnya cuma _origWc>25,
  // jadi label counter tampil abu-abu polos "23/25 kata" TANPA peringatan
  // apa pun, padahal sama-sama hasil kegagalan _vbFixWordCountIfNeeded.
  // Sekarang kedua arah (kelebihan MAUPUN kekurangan kata) sama-sama ditandai
  // oranye dengan pesan yang sesuai arahnya.
  let _cardRange=vbGetWordRange();
  let _origWc=_vbWcNoParen(initialScript||'');
  let _wasAutoTruncated=_origWc>_cardRange.max;
  let _wasStillShort=_origWc>0&&_origWc<_cardRange.min;
  initialScript=_vbTruncate25Words(initialScript);
  VB_BULK_ITEMS[idx]={produk:produkNamaForHistory||'',roleLabel:label,script:initialScript};

  // displayScript = apa yang tampil di textarea/JSON/counter SAAT kartu
  // pertama dibangun. Kosong kalau mau dianimasikan ketik, penuh kalau tidak.
  let displayScript=skipInitialFill?'':initialScript;
  let jsonText=_vbBuildFlowText(displayScript,produkNamaForHistory,_vbTampilText(idx),_vbLokasiText(idx),_vbFotoCountVal(idx),idx);
  let card=document.createElement('div');
  card.id='vb-card-'+idx;
  card.style.cssText='background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-xs);overflow:hidden;';

  let head=document.createElement('div');
  head.style.cssText='background:var(--surface3);padding:5px 9px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px;border-bottom:1px solid var(--border);';
  head.innerHTML='<div style="font-size:var(--fs-2xs);font-weight:600;color:var(--muted);">'+label+'</div>';
  let copyBtn=document.createElement('button');
  copyBtn.id='vb-bulk-copy-'+idx;
  copyBtn.className='copy-btn';copyBtn.style.cssText='font-size:var(--fs-2xs);padding:3px 8px;flex-shrink:0;';
  // FIX BUG (ditemukan saat audit mendalam khusus builder video): sebelumnya
  // textContent tombol ini di-set string KOSONG ('') dan tidak pernah diisi
  // label/icon apapun di kondisi default — tombol Copy tiap kartu Hook/
  // Story/CTA jadi pil kosong tanpa tulisan sama sekali (cuma sekilas
  // muncul ikon centang 1.2 detik SETELAH diklik, lalu balik kosong lagi).
  // User tidak akan tahu ada tombol salin di situ kecuali coba-coba klik.
  // Sekarang diberi label teks "Salin" sebagai kondisi default yang selalu
  // kelihatan, dan dikembalikan ke label yang SAMA (bukan string kosong)
  // setelah animasi centang selesai.
  const VB_COPY_BTN_LABEL='Salin';
  copyBtn.textContent=VB_COPY_BTN_LABEL;
  let doneLabel=document.createElement('span');
  doneLabel.className='hidden vb-done-lbl';
  doneLabel.style.cssText='font-size:var(--fs-2xs);color:var(--green);font-weight:500;margin-left:5px;';
  doneLabel.innerHTML='<svg class="icon"><use href="#ic-check"></use></svg> sudah';
  copyBtn.onclick=(function(ii,b,dl){return function(){
    // Jalur Tulis Manual: Nama Produk wajib diisi sebelum prompt boleh disalin.
    let _mn=document.getElementById('vb-manual-nama-'+Math.floor(ii/3));
    if(_mn&&!_mn.value.trim()){showToast('Isi nama produk dulu sebelum menyalin','error');_mn.style.borderColor='var(--red)';try{_mn.focus();}catch(e){}return;}
    let txt=document.getElementById('vb-bulk-json-'+ii).textContent;
    _copyTextRobust(txt,function(){
      b.innerHTML='<svg class="icon"><use href="#ic-check"></use></svg>';
      setTimeout(function(){b.textContent=VB_COPY_BTN_LABEL;},1200);
      dl.classList.remove('hidden');
      // FITUR LAMA (dipindah, Sept 2026): notifikasi "Prompt Video Siap"
      // dulu dipicu di sini, persis pas klik Salin PERTAMA selama sesi tur
      // "silent" (pbTourVideoScriptActive). Sekarang triggernya sudah
      // dipindah ke vbGenerate3AI() — muncul otomatis begitu script selesai
      // digenerate saat tur aktif, tidak perlu nunggu klik Salin lagi.
      // Klik Salin di sini (tur maupun mode biasa) sekarang murni cuma
      // menyalin teksnya, tidak memicu apa-apa lagi.
      // FITUR BARU (permintaan user): begitu user klik "Mengerti" di
      // notifikasi "Prompt Video Siap", kartu Hook (idx 0) diberi denyutan
      // kuning (lihat vbScriptReadyNext) supaya user tahu harus klik
      // "Salin" di situ dulu. Persis saat itu diklik (dan CUMA kartu Hook),
      // hentikan denyutannya, kasih notifikasi penjelasan, lalu tampilkan
      // tombol "Lanjut →" baru di bawah kartu-kartu skrip (lihat
      // #vb-tour-hookcopy-actions & vbHookCopyLanjutClick()).
      if(ii===0 && typeof pbTourWaitingHookCopy!=='undefined' && pbTourWaitingHookCopy){
        pbTourWaitingHookCopy=false;
        b.classList.remove('vb-pulse-yellow');
        // FITUR BARU (permintaan user): lepas denyutan emas di seluruh
        // kartu Hook (vb-card-0, pasangan dari vbScriptReadyNext()) & buka
        // kunci tombol Salin kartu lain, persis saat Hook benar-benar
        // sudah disalin.
        let hookCard=document.getElementById('vb-card-0');
        if(hookCard) hookCard.classList.remove('vb-box-pulse-gold');
        document.querySelectorAll('.vb-copy-locked').forEach(function(el){el.classList.remove('vb-copy-locked');});
        // PERMINTAAN USER: tombol Revisi & Ubah Suara Karakter/Target
        // Audience yang disembunyikan pbLockScriptAreaExtras() ditampilkan
        // lagi persis begitu Hook benar-benar sudah disalin.
        if(typeof pbUnlockScriptAreaExtras==='function') pbUnlockScriptAreaExtras();
        vbShowHookCopiedNotif();
        // (Nov 2026) Tombol Salin Story muncul setelah Hook disalin.
        vbTourAfterHookCopy();
      }
      // FITUR BARU (permintaan user): pasangan vbVideoGuideWaitCardCopy(1/2)
      // di panduan Video AI — begitu kartu Cerita Produk (ii===1) atau CTA
      // (ii===2) selesai disalin PERSIS saat tur sedang menunggunya, lepas
      // denyutan/kunci lalu langsung lanjutkan panduan Video AI ke langkah
      // berikutnya, tanpa perlu klik apa pun lagi.
      if(ii===1 && typeof pbTourWaitingProdukCopy!=='undefined' && pbTourWaitingProdukCopy){
        pbTourWaitingProdukCopy=false;
        b.classList.remove('vb-pulse-yellow');
        let produkCard=document.getElementById('vb-card-1');
        if(produkCard) produkCard.classList.remove('vb-box-pulse-gold');
        // FIX (bug "saat menunggu Salin kartu 1/2, tombol lain tidak
        // dikunci"): karena vbVideoGuideWaitCardCopy() sekarang juga
        // memanggil pbLockScriptAreaExtras() (yang ikut MENYEMBUNYIKAN
        // tombol Revisi/Ubah Suara, bukan cuma mengunci), pembukanya juga
        // harus lewat pbUnlockScriptAreaExtras() — bukan cuma menghapus
        // class vb-copy-locked — supaya tombol yang disembunyikan tadi
        // muncul lagi begitu kartu Cerita Produk selesai disalin.
        if(typeof pbUnlockScriptAreaExtras==='function') pbUnlockScriptAreaExtras();
        else document.querySelectorAll('.vb-copy-locked').forEach(function(el){el.classList.remove('vb-copy-locked');});
        vbTourAfterStoryCopy();
      }
      if(ii===2 && typeof pbTourWaitingCtaCopy!=='undefined' && pbTourWaitingCtaCopy){
        pbTourWaitingCtaCopy=false;
        b.classList.remove('vb-pulse-yellow');
        let ctaCard=document.getElementById('vb-card-2');
        if(ctaCard) ctaCard.classList.remove('vb-box-pulse-gold');
        // FIX (sama seperti di atas untuk kartu Cerita Produk).
        if(typeof pbUnlockScriptAreaExtras==='function') pbUnlockScriptAreaExtras();
        else document.querySelectorAll('.vb-copy-locked').forEach(function(el){el.classList.remove('vb-copy-locked');});
        vbTourAfterCtaCopy();
      }
    },function(){showToast('Gagal salin — coba tap & tahan teksnya lalu Copy','error');});
  };})(idx,copyBtn,doneLabel);
  let copyWrap=document.createElement('div');
  // FIX: label Tampilan/Lokasi yang panjang (mis. "Digantung di Hanger & Dipegang") bikin baris tombol
  // lebih lebar dari kartu, lalu tombol Salin terpotong oleh overflow:hidden. Sekarang header & baris
  // tombol boleh turun baris (wrap) supaya Salin SELALU kelihatan.
  copyWrap.style.cssText='display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:5px;min-width:0;max-width:100%;margin-left:auto;';
  // FITUR BARU: tombol "Tampilan" — khusus Mode 3 (VB.refMode==='kp', foto
  // karakter + foto produk terpisah) — biar user bisa tentukan PER KARTU
  // (Hook/Story/CTA beda-beda boleh) apakah produknya digantung di hanger &
  // dipegang (cocok utk outfit) atau diperlihatkan langsung ke kamera. Tidak
  // muncul di mode lain karena tanpa foto produk terpisah, instruksi ini
  // tidak relevan (tidak ada apa-apa yang perlu "ditampilkan").
  if(VB.refMode==='kp'){
    let tampilBtn=document.createElement('button');
    tampilBtn.id='vb-tampil-btn-'+idx;
    tampilBtn.className='copy-btn';
    tampilBtn.style.cssText='font-size:var(--fs-2xs);padding:3px 8px;flex-shrink:1;max-width:100%;text-align:left;';
    tampilBtn.innerHTML='<svg class="icon" style="width:12px;height:12px;"><use href="#ic-camera"></use></svg> Tampilan';
    tampilBtn.onclick=(function(ii){return function(){vbToggleTampilPanel(ii);};})(idx);
    copyWrap.appendChild(tampilBtn);

    // FITUR BARU: tombol "Lokasi" — bagian dari "Atur Detail" per kartu,
    // khusus Mode 3 juga, biar user bisa timpa Lokasi PER KARTU (Hook/Story/
    // CTA boleh beda-beda), bukan cuma 1 lokasi buat semua kartu & semua
    // produk dari step "Lokasi" di awal (VB.mode3Lokasi). Lihat vbPickLokasiCard.
    let lokasiBtn=document.createElement('button');
    lokasiBtn.id='vb-lokasi-btn-'+idx;
    lokasiBtn.className='copy-btn';
    lokasiBtn.style.cssText='font-size:var(--fs-2xs);padding:3px 8px;flex-shrink:1;max-width:100%;text-align:left;';
    lokasiBtn.textContent=(VB_CARD_LOKASI[idx]?VB_CARD_LOKASI[idx].label:'Lokasi');
    lokasiBtn.onclick=(function(ii){return function(){vbToggleLokasiPanel(ii);};})(idx);
    copyWrap.appendChild(lokasiBtn);
  }
  if(typeof idx==='number'&&idx%3===2&&typeof pbSaveScriptFromCard==='function'){
     let svBtn=document.createElement('button');
     svBtn.type='button';svBtn.id='vb-save-script-'+idx;svBtn.className='copy-btn';
     svBtn.style.cssText='font-size:var(--fs-2xs);padding:3px 8px;flex-shrink:0;';
     svBtn.textContent='Simpan skrip';
     svBtn.title='Simpan skrip produk ini ke tab Akun sebagai contoh referensi';
     svBtn.onclick=(function(ii){return function(){pbSaveScriptFromCard(ii);};})(idx);
     copyWrap.appendChild(svBtn);
   }
   copyWrap.appendChild(copyBtn);
  copyWrap.appendChild(doneLabel);
  head.appendChild(copyWrap);

  let body=document.createElement('div');
  body.style.cssText='padding:7px 9px;';

  // Panel pilihan "Cara Tampil Produk" — tersembunyi default, dibuka lewat
  // tombol "Tampilan" di atas. Isi diisi ulang oleh vbToggleTampilPanel()
  // supaya highlight chip yang aktif selalu sinkron dengan VB_CARD_TAMPIL.
  let tampilPanel=null;
  if(VB.refMode==='kp'){
    tampilPanel=document.createElement('div');
    tampilPanel.id='vb-tampil-panel-'+idx;
    tampilPanel.className='hidden';
    tampilPanel.style.cssText='display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;padding:8px;background:var(--surface);border:1px solid var(--border-hi);border-radius:var(--radius-xs);';
    body.appendChild(tampilPanel);
  }

  // Panel "Atur Detail" (Lokasi) — sama pola-nya seperti panel Tampilan di
  // atas, tersembunyi default, dibuka lewat tombol "Lokasi". Isi diisi ulang
  // oleh vbToggleLokasiPanel() supaya highlight & isi kotak custom selalu
  // sinkron dengan VB_CARD_LOKASI.
  let lokasiPanel=null;
  if(VB.refMode==='kp'){
    lokasiPanel=document.createElement('div');
    lokasiPanel.id='vb-lokasi-panel-'+idx;
    lokasiPanel.className='hidden';
    lokasiPanel.style.cssText='display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;padding:8px;background:var(--surface);border:1px solid var(--border-hi);border-radius:var(--radius-xs);';
    body.appendChild(lokasiPanel);
  }

  // Wrapper posisi-relatif buat textarea skrip — dipakai supaya badge logo P
  // kecil (lihat di bawah) bisa ditempel di pojok kartu, dan supaya blur
  // (.vb-ta-loading di CSS) cuma kena teksnya, bukan seisi kartu.
  let taWrap=document.createElement('div');
  taWrap.className='vb-ta-wrap';
  taWrap.id='vb-ta-wrap-'+idx;
  // Stempel durasi/mode saat kartu dibuat, supaya "Simpan skrip" tidak salah label kalau durasi diganti sesudahnya.
  try{taWrap.dataset.refMode=_vbIsDua()?'dua':(_vb16()?'16':'24');}catch(e){}

  let ta=document.createElement('textarea');
  ta.id='vb-bulk-script-'+idx;
  ta.value=displayScript;
  ta.rows=4;
  ta.className='inp';
  ta.style.cssText='width:100%;box-sizing:border-box;font-size:var(--fs-base);line-height:1.7;resize:vertical;margin-bottom:5px;padding:10px 12px;';
  if(manualEmpty)ta.placeholder=VB_MANUAL_PLACEHOLDERS[idx]||'';
  ta.oninput=(function(ii){return function(){vbBulkUpdateJson(ii);};})(idx);
  // audit Okt 2026 (v11.85): handler blur yang dulu memanggil _vbSanitizeForbiddenPhrases dihapus — fungsi itu sudah no-op sejak v11.37,
  // jadi ketikan manual memang tidak disaring (komentar lama di sini menyesatkan).
  taWrap.appendChild(ta);
  if(_vbIsDua()){try{_vbDuaAttachRows(ta,taWrap,idx);}catch(eDr){console.warn('[_vbBuildEditableCard] baris dialog 2 suara dilewati:',eDr);}}

  // FITUR BARU (permintaan user): selama kartu ini MASIH KOSONG/BELUM
  // SELESAI diketik (baru dibangun kosong sambil nunggu AI, ATAU lagi
  // dalam proses animasi ketik kata-per-kata), teksnya diblur dulu dan
  // muncul logo P kecil yang terus pecah-menyatu di pojok kanan atas
  // kartu — pakai SVG & animasi (@keyframes pLoopBack/pLoopFront) YANG
  // SAMA PERSIS dengan logo P di tombol Generate, cuma diperkecil jadi
  // badge bulat mini. Elemen badge-nya SELALU dibuat (biar bisa dipakai
  // ulang kalau kartu ini di-loading-kan lagi nanti, mis. saat revisi),
  // tapi cuma KELIHATAN kalau wrapper punya class "vb-ta-loading" (lihat
  // CSS). Class itu sendiri diatur oleh _vbCardSetLoading(idx,bool), yang
  // dipanggil dari mesin typewriter (_vbTypewriterSetTarget /
  // _vbTypewriterSequentialRun) tiap kali kartu ini mulai/selesai diketik.
  let loadingBadge=document.createElement('div');
  loadingBadge.className='vb-ta-loading-badge';
  loadingBadge.id='vb-ta-badge-'+idx;
  loadingBadge.innerHTML='<svg viewBox="0 0 642 635" xmlns="http://www.w3.org/2000/svg">'
    +'<defs><linearGradient id="vbTaPGrad'+idx+'" x1="0" y1="0" x2="1" y2="1">'
      +'<stop offset="0%" stop-color="#F0D9A0"/><stop offset="100%" stop-color="#B8965F"/>'
    +'</linearGradient></defs>'
    +'<path class="p-layer p-layer-back" pathLength="1" fill="url(#vbTaPGrad'+idx+')" d="M146,92 L162,109 L179,119 L194,124 L206,126 L346,127 L373,134 L395,146 L386,133 L365,114 L343,102 L318,94 L306,92 Z M349,92 L361,96 L383,109 L401,126 L407,134 L417,154 L420,168 L431,184 L439,201 L444,219 L445,231 L481,231 L479,213 L470,183 L460,163 L443,140 L426,124 L402,108 L381,99 Z M253,195 L267,188 L293,183 L335,183 L345,185 L362,193 L375,205 L382,216 L387,229 L396,208 L399,184 L398,177 L379,162 L355,152 L331,149 L312,153 L285,166 L271,176 Z M291,150 L271,154 L251,161 L237,168 L216,182 L192,207 L182,223 L174,243 L169,271 L169,553 L203,534 L203,268 L208,239 L217,216 L233,192 L261,166 L277,156 Z M481,253 L445,253 L441,277 L435,293 L419,317 L403,333 L387,344 L370,352 L345,358 L279,359 L279,394 L325,394 L364,390 L391,381 L419,365 L447,339 L465,312 L477,281 Z"/>'
    +'<path class="p-layer p-layer-front" pathLength="1" fill="url(#vbTaPGrad'+idx+')" d="M415,201 L407,228 L397,245 L386,256 L383,267 L377,277 L360,293 L339,301 L259,302 L258,210 L243,224 L236,234 L227,254 L224,271 L224,519 L233,513 L249,497 L258,485 L258,337 L345,335 L364,330 L378,323 L393,312 L402,303 L413,287 L418,276 L423,257 L423,227 Z"/>'
    +'</svg>';
  taWrap.appendChild(loadingBadge);

  // Kartu dianggap "masih loading" di awal kalau displayScript KOSONG —
  // ini mencakup kartu Live yang sengaja dibangun kosong sambil nunggu AI
  // (_vbRenderMultiOutputLive) MAUPUN kartu animate=true yang isinya sudah
  // ada di memori tapi sengaja ditunda tampilnya buat diketik pelan-pelan
  // (skipInitialFill). Kartu dari mode manual (isi sudah pasti tidak
  // kosong sejak awal, sudah divalidasi wajib) TIDAK pernah kena kondisi
  // ini, jadi aman tanpa perlu parameter tambahan.
  // manualEmpty: kartu kosong punya user (baru pilih "Tulis Manual Sendiri",
  // belum ngetik apa-apa) — BUKAN kartu yang lagi nunggu AI, jadi TIDAK
  // diberi efek blur+badge loading walau displayScript kosong.
  if(!displayScript&&!manualEmpty)taWrap.classList.add('vb-ta-loading');

  let wcLabel=document.createElement('div');
  wcLabel.id='vb-bulk-wc-'+idx;
  let wc0=_vbWcNoParen(displayScript);
  // 21 Okt 2026 (permintaan user): pemberitahuan teks di kartu skrip dihapus (hasil awal di luar rentang, cek klaim).
  // Sekarang hanya warna angka: oranye = hasil awal AI di luar rentang, hijau = dalam rentang, abu-abu = di luar rentang (setelah diedit).
  let _wcFlag=(!skipInitialFill&&(_wasAutoTruncated||_wasStillShort));
  wcLabel.textContent=wc0+'/'+_cardRange.min+'-'+_cardRange.max+' kata';
  wcLabel.style.cssText='font-size:var(--fs-2xs);color:'+(_wcFlag?'#e0a05c':((wc0>=_cardRange.min&&wc0<=_cardRange.max)?'var(--green)':'var(--muted2)'))+';margin-bottom:4px;';

  let jsonBox=document.createElement('pre');
  jsonBox.id='vb-bulk-json-'+idx;
  jsonBox.textContent=jsonText;
  jsonBox.style.cssText='font-family:"JetBrains Mono",monospace;font-size:var(--fs-2xs);line-height:1.55;color:var(--muted);background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-2xs);padding:6px 8px;max-height:70px;overflow-y:auto;white-space:pre-wrap;word-break:break-word;margin:0;';

  body.appendChild(taWrap);
  body.appendChild(wcLabel);
  body.appendChild(jsonBox);
  card.appendChild(head);
  card.appendChild(body);
  // Isi awal panel tampilan (kalau ada) — dibangun sekali di sini, lalu
  // vbToggleTampilPanel() hanya menampilkan/menyembunyikan + refresh highlight.
  if(tampilPanel)_vbFillTampilPanel(idx,tampilPanel);
  if(lokasiPanel)_vbFillLokasiPanel(idx,lokasiPanel);

  // FIX BUG#13 (ditemukan saat audit mendalam — ini AKAR MASALAH Bug#10 yang
  // belum sempat tuntas di sesi audit sebelumnya karena kehabisan limit):
  // historyAdd() SEBELUMNYA dipanggil DI SINI, di dalam _vbBuildEditableCard,
  // yang berarti setiap SATU KARTU script memicu SATU entri Riwayat sendiri.
  // Fungsi ini dipakai bareng oleh 3 jalur: manual (3 kartu), AI single
  // (3 kartu), DAN bulk (sampai 30 produk x 3 kartu = 90 kartu sekaligus).
  // Karena HISTORY_MAX cuma 5 (lihat historyAdd), SATU sesi generate bulk
  // dengan lebih dari 1-2 produk saja sudah cukup untuk menimpa/menghapus
  // SEMUA entri Riwayat lama (termasuk Riwayat Foto) tanpa peringatan apapun
  // — reproducible: generate bulk 3 produk (9 kartu) → buka tab Riwayat →
  // riwayat foto/video sebelumnya sudah lenyap, cuma sisa 5 entri TERAKHIR
  // dari bulk barusan (dan itu pun cuma 5 dari 9 makanya subset sepotong).
  // FIX: _vbBuildEditableCard TIDAK LAGI menyentuh Riwayat sama sekali —
  // cuma bertugas membangun 1 kartu UI. Pencatatan Riwayat dipindah ke titik
  // "generate selesai" di tiap pemanggil (vbGenerate3Manual, vbGenerate3AI,
  // _vbRenderBulkOutput) via _vbBuildCombinedHistoryEntry(), SATU entri
  // gabungan per sesi generate (bukan per kartu) — sesuai niat awal fix
  // Bug#10 yang sempat kepotong limit.
  if(_vb16()&&typeof idx==='number'&&idx%3===1){card.style.display='none';card.setAttribute('data-vb16-skip','1');} // 16 detik: slot Story tidak dipakai
  return card;
}

// Isi/refresh konten panel "Cara Tampil Produk" untuk kartu ke-idx — dipanggil
// sekali saat kartu dibangun (isi awal) dan tiap kali dibuka lewat tombol
// "Tampilan" (biar highlight chip yang aktif selalu sinkron).
function _vbFillTampilPanel(idx,panelEl){
  panelEl.innerHTML='';
  let current=VB_CARD_TAMPIL[idx];
  VB_TAMPIL_PRODUK_OPTS.forEach(function(opt){
    let chip=document.createElement('div');
    chip.className='chip'+(current&&current.key===opt[0]?' sel':'');
    chip.style.cssText='font-size:var(--fs-2xs);padding:6px 10px;';
    chip.textContent=opt[1];
    chip.onclick=(function(ii,o){return function(){vbPickTampilProduk(ii,o[0],o[1],o[2]);};})(idx,opt);
    panelEl.appendChild(chip);
  });
  let clearChip=document.createElement('div');
  clearChip.className='chip'+(current?'':' sel');
  clearChip.style.cssText='font-size:var(--fs-2xs);padding:6px 10px;color:var(--muted);';
  clearChip.textContent='Tidak ditentukan';
  clearChip.onclick=(function(ii){return function(){vbPickTampilProduk(ii,'','','');};})(idx);
  panelEl.appendChild(clearChip);
  // Catatan: "Jumlah Foto Produk" DULU ada di sini (per kartu). Sekarang
  // dipindah jadi per PRODUK — lihat _vbBuildProductFotoCountRow, ditampilkan
  // di atas kartu Hook, bukan di panel Tampilan per-kartu ini lagi.
}

// Buka/tutup panel "Cara Tampil Produk" milik kartu ke-idx.
function vbToggleTampilPanel(idx){
  let panel=document.getElementById('vb-tampil-panel-'+idx);
  if(!panel)return;
  let willOpen=panel.classList.contains('hidden');
  panel.classList.toggle('hidden');
  if(willOpen)_vbFillTampilPanel(idx,panel); // refresh highlight tiap dibuka
}

// User pilih (atau hapus, kalau key kosong) opsi tampilan produk untuk kartu
// ke-idx — langsung terisi ke JSON di bawahnya, PERSIS seperti kalau user
// ngetik manual di textarea (lewat vbBulkUpdateJson yang sama).
function vbPickTampilProduk(idx,key,label,text){
  if(key){VB_CARD_TAMPIL[idx]={key:key,label:label,text:text};}
  else{delete VB_CARD_TAMPIL[idx];}
  let btn=document.getElementById('vb-tampil-btn-'+idx);
  if(btn)btn.innerHTML='<svg class="icon" style="width:12px;height:12px;"><use href="#ic-camera"></use></svg> '+(key?label:'Tampilan');
  let panel=document.getElementById('vb-tampil-panel-'+idx);
  if(panel){_vbFillTampilPanel(idx,panel);panel.classList.add('hidden');}
  vbBulkUpdateJson(idx); // rebuild JSON kartu ini — sama seperti oninput textarea
}

// Isi/refresh konten panel "Atur Detail" (Lokasi) untuk kartu ke-idx — sama
// pola-nya seperti _vbFillTampilPanel di atas, ditambah 1 baris "isi sendiri"
// (lokasi custom bebas ketik, beda dari Cara Tampil Produk yang cuma preset).
function _vbFillLokasiPanel(idx,panelEl){
  panelEl.innerHTML='';
  let current=VB_CARD_LOKASI[idx];
  VB_LOKASI_OPTS.forEach(function(opt){
    let chip=document.createElement('div');
    chip.className='chip'+(current&&current.key===opt[0]?' sel':'');
    chip.style.cssText='font-size:var(--fs-2xs);padding:6px 10px;';
    chip.textContent=opt[1];
    chip.onclick=(function(ii,o){return function(){vbPickLokasiCard(ii,o[0],o[1]);};})(idx,opt);
    panelEl.appendChild(chip);
  });
  let clearChip=document.createElement('div');
  clearChip.className='chip'+((!current)?' sel':'');
  clearChip.style.cssText='font-size:var(--fs-2xs);padding:6px 10px;color:var(--muted);';
  clearChip.textContent='Tidak ditentukan';
  clearChip.onclick=(function(ii){return function(){vbPickLokasiCard(ii,'','');};})(idx);
  panelEl.appendChild(clearChip);

  let customRow=document.createElement('div');
  customRow.style.cssText='display:flex;gap:6px;width:100%;margin-top:6px;';
  let customInput=document.createElement('input');
  customInput.className='inp';
  customInput.id='vb-lokasi-custom-'+idx;
  customInput.maxLength=120;
  customInput.placeholder='Isi sendiri, contoh: rooftop malam hari';
  customInput.style.cssText='flex:1;font-size:var(--fs-2xs);padding:6px 8px;';
  if(current&&current.key==='custom')customInput.value=current.label;
  // Tanpa tombol "Pakai" (permintaan user): teks yang diketik LANGSUNG terpakai,
  // dan klik opsi di atas menggantikan/mengosongkan teks ini (lihat
  // vbLokasiCardInput & vbPickLokasiCard).
  customInput.oninput=(function(ii){return function(){vbLokasiCardInput(ii);};})(idx);
  customInput.onkeydown=(function(ii){return function(e){
    if(e.key==='Enter'){e.preventDefault();let pn=document.getElementById('vb-lokasi-panel-'+ii);if(pn)pn.classList.add('hidden');}
  };})(idx);
  customRow.appendChild(customInput);
  panelEl.appendChild(customRow);
}

// Ketik di kolom "Isi sendiri" → lokasi kartu langsung berubah ke teks itu
// (panel TIDAK dibangun ulang supaya kursor/keyboard tidak hilang saat mengetik).
function vbLokasiCardInput(idx){
  let inp=document.getElementById('vb-lokasi-custom-'+idx);
  let v=inp?inp.value.trim():'';
  if(v){VB_CARD_LOKASI[idx]={key:'custom',label:v,text:v};}
  else{delete VB_CARD_LOKASI[idx];}
  let btn=document.getElementById('vb-lokasi-btn-'+idx);
  if(btn)btn.textContent=v?v:'Lokasi';
  let panel=document.getElementById('vb-lokasi-panel-'+idx);
  if(panel){
    panel.querySelectorAll('.chip').forEach(function(c){
      c.classList.toggle('sel',!v&&c.textContent==='Tidak ditentukan');
    });
  }
  vbBulkUpdateJson(idx);
}
// Buka/tutup panel "Atur Detail" (Lokasi) milik kartu ke-idx.
function vbToggleLokasiPanel(idx){
  let panel=document.getElementById('vb-lokasi-panel-'+idx);
  if(!panel)return;
  let willOpen=panel.classList.contains('hidden');
  panel.classList.toggle('hidden');
  if(willOpen)_vbFillLokasiPanel(idx,panel); // refresh highlight tiap dibuka
}

// User pilih (atau hapus, kalau key kosong) lokasi override untuk kartu
// ke-idx — langsung terisi ke JSON di bawahnya lewat _vbBuildFlowText
// (menggantikan VB.mode3Lokasi khusus buat kartu ini), sama seperti kalau
// user ngetik manual di textarea.
function vbPickLokasiCard(idx,key,label){
  if(key){VB_CARD_LOKASI[idx]={key:key,label:label,text:label};}
  else{delete VB_CARD_LOKASI[idx];}
  let btn=document.getElementById('vb-lokasi-btn-'+idx);
  if(btn)btn.textContent=key?label:'Lokasi';
  let panel=document.getElementById('vb-lokasi-panel-'+idx);
  if(panel){_vbFillLokasiPanel(idx,panel);panel.classList.add('hidden');}
  vbBulkUpdateJson(idx); // rebuild JSON kartu ini — sama seperti oninput textarea
}

// Satu entri Riwayat GABUNGAN untuk 1 sesi generate (dipanggil sekali per
// generate/regenerate-all, bukan per kartu) — dulu mengambil isi dari
// VB_BULK_ITEMS untuk dibangun jadi teks gabungan lalu disimpan ke
// historyAdd(...).
// FIX INEFISIENSI (audit lanjutan, Sept 2026): historyAdd(...) auto-save
// prompt sudah DIMATIKAN dari awal (lihat catatan di fGenerate(), fitur
// digantikan "Halaman Tersimpan" manual) — TAPI baris pembangun
// `blocks=VB_BULK_ITEMS.map(...)` (yang manggil _vbBuildFlowText +
// regex trim per kartu) tidak ikut dihapus waktu itu, jadi tiap generate/
// revisi (dipanggil di 11 titik: generate manual, AI single, bulk sampai
// 30 produk, revisi, undo revisi, update metadata) tetap membangun ulang
// teks lengkap semua kartu HANYA UNTUK DIBUANG — kerja CPU sia-sia di
// jalur paling sering dipakai, paling terasa saat bulk 30 produk (90
// kartu dibangun ulang percuma tiap generate). Sekarang fungsi ini
// benar-benar no-op selama historyAdd masih mati — dipertahankan sebagai
// fungsi kosong (bukan dihapus) supaya 11 call-site di atas tidak perlu
// diubah satu-satu. Kalau nanti fitur auto-history diaktifkan lagi,
// bangun ulang `blocks` di sini dan panggil historyAdd(...) dengan
// sessionLabel yang sudah dikirim oleh semua pemanggil.
function _vbBuildCombinedHistoryEntry(sessionLabel){
  if(!VB_BULK_ITEMS||VB_BULK_ITEMS.length===0)return;
  // Riwayat OTOMATIS Video (terpisah dari pb_history_v1 milik admin) — lihat pbAutoVideoRecord.
  try{ if(typeof pbAutoVideoRecord==='function')pbAutoVideoRecord(sessionLabel); }catch(_e){}
  // Riwayat skrip (dibaca halaman admin): 1 entri = 1 produk berisi HOOK + STORY + CTA.
  // Hanya HISTORY_MAX (45) produk terakhir yang disimpan. Entri ditandai skrip:1 supaya
  // tidak muncul di daftar Riwayat lama di aplikasi (lihat _historyRenderInto).
  // FITUR BARU (permintaan user, Okt 2026): selain teks skrip mentah (field `text`,
  // dipakai untuk tampilan preview yang ringkas & mudah dibaca di admin), tiap bagian
  // juga disimpan versi PROMPT LENGKAPNYA (field `full`) — persis isi kotak
  // vb-bulk-json-N, yaitu teks yang sama yang disalin kalau user sendiri klik tombol
  // "Salin" di kartu Hook/Story/CTA (lihat copyBtn.onclick di _vbBuildEditableCard).
  // Supaya tombol salin di admin.html bisa menyalin prompt siap-pakai, bukan cuma skrip.
  try{
    let byP={},order=[];
    VB_BULK_ITEMS.forEach(function(it,i){
      if(_vb16()&&i%3===1)return; // 16 detik: slot Story tidak dipakai
      let p=Math.floor(i/3),el=document.getElementById('vb-bulk-script-'+i);
      let t=String((el&&typeof el.value==='string'?el.value:it.script)||'').trim();
      let k=String(it.role||'').toUpperCase();
      if(k!=='HOOK'&&k!=='STORY'&&k!=='CTA')k=['HOOK','STORY','CTA'][i%3];
      if(!byP[p]){byP[p]={nama:'',parts:[],full:[]};order.push(p);}
      if(it.produk)byP[p].nama=it.produk;
      if(t)byP[p].parts.push(k+': '+t);
      let jsonEl=document.getElementById('vb-bulk-json-'+i);
      let fullTxt=jsonEl?String(jsonEl.textContent||'').trim():'';
      if(fullTxt)byP[p].full.push(k+': '+fullTxt);
    });
    let now=Date.now(),add=[],names={};
    order.forEach(function(p){
      let o=byP[p];if(!o.parts.length)return;
      let label=o.nama||sessionLabel||'Skrip';names[label]=1;
      add.push({type:'video',skrip:1,label:label,text:o.parts.join('\n\n'),full:o.full.join('\n\n'),ts:now+p});
    });
    if(!add.length)return;
    add.reverse(); // produk terakhir paling atas
    // revisi/undo produk yang sama dalam 30 menit menimpa entri lama, bukan menambah baru
    let arr=historyGet().filter(function(h){return !(h&&h.skrip&&names[h.label]&&Math.abs(now-h.ts)<1800000);});
    arr=add.concat(arr).slice(0,HISTORY_MAX);
    localStorage.setItem(HISTORY_KEY,JSON.stringify(arr));
    if(typeof pbCloudQueue==='function')pbCloudQueue(HISTORY_KEY);
  }catch(e){}
}

// Bangun 3 kartu KOSONG (Hook/Story/CTA) di #vb-multi-output SEBELUM AI
// mulai jawab, khusus buat mode single AI (vbGenerate3AI). Struktur &
// id-nya sama persis dengan _vbRenderMultiOutput (vb-bulk-script-0/1/2,
// vb-bulk-json-0/1/2, dst) supaya vbBulkUpdateJson() & fungsi lain yang
// sudah ada bisa langsung dipakai tanpa perubahan. Nanti setelah AI
// selesai jawab, _vbRenderMultiOutput() yang sesungguhnya dipanggil lagi
// untuk merender versi FINAL (sudah disaring sanitizer + fix kata),
// jadi kartu live ini otomatis "diganti" bersih di akhir.
function _vbRenderMultiOutputLive(produkNamaForHistory){
  VB_BULK_ITEMS=[];
  VB_CARD_TAMPIL={};
  VB_CARD_LOKASI={};
  VB_PRODUCT_FOTOCOUNT={};
  VB_HOOK_OVERLAY={};
  VB_CHAR_OVR={};
  if(VB_SINGLE_OVERLAY)VB_HOOK_OVERLAY[0]=VB_SINGLE_OVERLAY;
  _vbTypewriterReset(); // sesi baru — buang target lama biar ga nyangkut ke kartu baru
  let multiWrap=document.getElementById('vb-multi-output');
  multiWrap.innerHTML='';
  multiWrap.style.display='flex';
  VB_3SCRIPT_ROLES.forEach(function(roleInfo,i){
    let card=_vbBuildEditableCard(i,roleInfo.label,'',produkNamaForHistory);
    multiWrap.appendChild(card);
  });
}

// Daftarkan teks terbaru kartu ke-idx sebagai TARGET typewriter (bukan
// langsung di-set ke textarea) — lihat _vbTypewriterSetTarget di atas
// untuk kenapa ini yang bikin efeknya mengalir pelan, bukan loncat
// sekaligus tiap ada potongan besar dari Gemini.
function _vbLiveUpdateCard(idx,text){
  _vbTypewriterSetTarget('vb-bulk-script-'+idx,text,function(){vbBulkUpdateJson(idx);});
}

// animate=true: kartu dibangun KOSONG dulu, lalu diketik pelan-pelan
// berurutan (Hook selesai penuh → baru Story → baru CTA) lewat
// _vbTypewriterSequentialRun. Dipakai khusus jalur "dibantu AI" (vbGenerate3AI)
// supaya skrip yang baru dikasih AI kelihatan seperti diketik, bukan
// langsung muncul sekaligus. Return Promise yang resolve setelah animasi
// (kalau ada) selesai — caller BOLEH await ini sebelum melakukan hal lain
// yang menyentuh textarea yang sama (mis. proses rapikan jumlah kata),
// supaya tidak nabrak/mengganggu animasi yang masih berjalan.
function _vbRenderMultiOutput(scripts,produkNamaForHistory,animate,manualMode){
  VB_BULK_ITEMS=[];
  VB_CARD_TAMPIL={};
  VB_CARD_LOKASI={};
  VB_PRODUCT_FOTOCOUNT={};
  VB_HOOK_OVERLAY={};
  VB_CHAR_OVR={}; // render sesi baru — pengaturan pensil lama dibuang (sama seperti state per-kartu lainnya)
  // Jalur manual bukan bagian dari mode single AI — lepas sinkronisasi kolom Isi.
  if(manualMode)VB_SINGLE_OVERLAY=null;
  else if(VB_SINGLE_OVERLAY)VB_HOOK_OVERLAY[0]=VB_SINGLE_OVERLAY;
  VB_SINGLE_REVISI_BACKUP=null; // sesi generate baru — backup revisi lama sudah tidak relevan
  _vbTypewriterSequentialReset(); // buang animasi sequential sesi lama kalau masih jalan
  let multiWrap=document.getElementById('vb-multi-output');
  multiWrap.innerHTML='';
  multiWrap.style.display='flex';

  // FITUR BARU: mode 1-produk (manual/AI, bukan bulk) menyimpan foto produk
  // di VB.produkFotoBase64 (lihat vbHandleProdukFotoUpload). Kalau foto ini
  // ada, tampilkan sekali di atas ketiga kartu Hook/Story/CTA sebagai
  // thumbnail kecil — biar user masih lihat foto yang jadi acuan script,
  // tanpa menghabiskan tempat di layar kecil.
  if(VB.produkFotoBase64){
    let fotoRow=document.createElement('div');
    fotoRow.style.cssText='display:flex;align-items:center;gap:7px;padding:2px 2px 2px 4px;';
    fotoRow.innerHTML='<img class="vbfoto-img" src="data:'+(VB.produkFotoMime||'image/jpeg')+';base64,'+VB.produkFotoBase64+'" alt="Foto referensi produk" title="Foto referensi produk — tap untuk perbesar" style="width:28px;height:28px;border-radius:var(--radius-2xs);object-fit:cover;border:1px solid var(--border-hi);flex-shrink:0;" />'
      +'<span style="font-size:var(--fs-2xs);color:var(--muted);">Foto referensi produk</span>';
    multiWrap.appendChild(fotoRow);
  }

  // FITUR BARU: "Atur Detail" → Teks Overlay Hook (permintaan user) — tampil
  // di SEMUA mode referensi foto (1/2/3), diletakkan di atas kartu Hook,
  // sebelum baris "Jumlah Foto Produk" (yang cuma khusus Mode 3) di bawah.

  // FITUR BARU: "Jumlah Foto Produk" per PRODUK (mode single = selalu
  // prodIdx 0), khusus Mode 3 — lihat _vbBuildProductFotoCountRow. Diletakkan
  // di atas kartu Hook (sebelum loop kartu Hook/Story/CTA di bawah).
  if(VB.refMode==='kp'){
    multiWrap.appendChild(_vbBuildProductFotoCountRow(0));
  }

  let typeItems=[];
  scripts.forEach(function(scriptText,i){
    // manualMode: kartu tetap dibangun walau scriptText masih kosong (user
    // baru pilih "Tulis Manual Sendiri", belum ngetik) — jalur lain (AI/
    // bulk) tetap skip kalau kosong seperti semula.
    if(!scriptText&&!manualMode)return;
    let roleInfo=VB_3SCRIPT_ROLES[i]||{label:'Script '+(i+1)};
    let card=_vbBuildEditableCard(i,roleInfo.label,scriptText,produkNamaForHistory,!!animate,!!manualMode);
    multiWrap.appendChild(card);
    if(animate){
      let finalScript=VB_BULK_ITEMS[i]?VB_BULK_ITEMS[i].script:scriptText;
      typeItems.push({taId:'vb-bulk-script-'+i,text:finalScript,onTick:(function(ii){return function(){vbBulkUpdateJson(ii);};})(i)});
    }
  });

  // FITUR BARU: tombol + panel "Revisi Script dengan AI" — khusus mode
  // 1 produk (AI/manual). User kasih masukan bebas (mis. "lebih santai
  // kayak ngobrol ke teman", "lebih heboh", "variasikan lagi") dan ketiga
  // script (Hook/Story/CTA) digenerate ulang bareng oleh AI mengikuti
  // masukan itu — nama produk, suara karakter, & target audience yang
  // sudah diisi sebelumnya tetap dipakai apa adanya. Tidak ditampilkan di
  // mode Bulk karena Bulk sudah punya panel revisi sendiri per-produk
  // (lihat vbRevisiProdukAI/_vbRenderBulkOutput).
  let revisiRow=document.createElement('div');
  revisiRow.style.cssText='display:flex;gap:6px;';
  let revisiBtn=document.createElement('button');
  revisiBtn.className='copy-btn';
  revisiBtn.id='vb-single-revisi-btn';
  revisiBtn.style.cssText='font-size:var(--fs-xs2);padding:8px 10px;flex:1;text-align:center;';
  revisiBtn.innerHTML='<svg class="icon"><use href="#ic-refresh"></use></svg> Revisi Script';
  revisiBtn.onclick=vbToggleSingleRevisiPanel;
  revisiRow.appendChild(revisiBtn);
  revisiRow.appendChild(_vbCharMakeBtn(0,true));

  // Tombol undo — tersembunyi sampai revisi pertama berhasil (lihat
  // vbRevisiSingleAI), dipakai buat kembali 1 langkah ke versi sebelumnya.
  let undoBtn=document.createElement('button');
  undoBtn.className='reset-btn hidden';
  undoBtn.id='vb-single-revisi-undo-btn';
  undoBtn.style.cssText='font-size:var(--fs-xs2);padding:8px 10px;flex:1;text-align:center;';
  undoBtn.innerHTML='Kembali ke Versi Sebelumnya';
  undoBtn.onclick=vbUndoSingleRevisi;
  revisiRow.appendChild(undoBtn);
  multiWrap.appendChild(revisiRow);

  let revisiPanel=document.createElement('div');
  revisiPanel.id='vb-single-revisi-panel';
  revisiPanel.className='hidden';
  revisiPanel.style.cssText='padding:9px;background:var(--surface2);border:1px solid var(--border-hi);border-radius:var(--radius-xs);display:flex;flex-direction:column;gap:6px;';
  let _hasFoto=!!VB.produkFotoBase64;
  revisiPanel.innerHTML='<div style="font-size:var(--fs-2xs);color:var(--muted);">Tulis apa yang mau diubah dari ketiga script di atas (Hook/Story/CTA sekaligus direvisi bareng). Foto, keunggulan, dan target audience bisa diubah juga kalau perlu.</div>'
    +'<textarea class="inp textarea-base" id="vb-single-revisi-note" rows="2" maxlength="300" placeholder="Contoh: variasikan lagi, atau buat lebih santai kayak lagi ngobrol ke teman, atau lebih heboh"></textarea>'
    +'<div style="display:flex;align-items:center;gap:8px;">'
    +'<input type="file" accept="image/*" id="vb-single-revisi-foto-input" style="position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none;" onchange="vbSingleRevisiFotoUpload(this)" />'
    +'<div id="vb-single-revisi-foto-empty" onclick="document.getElementById(\'vb-single-revisi-foto-input\').click()" style="'+(_hasFoto?'display:none;':'')+'width:40px;height:40px;flex-shrink:0;border:1.5px dashed var(--border-hi);border-radius:var(--radius-xs);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:11px;cursor:pointer;text-align:center;">+Foto</div>'
    +'<div id="vb-single-revisi-foto-preview" class="'+(_hasFoto?'':'hidden')+'" style="position:relative;width:40px;height:40px;flex-shrink:0;">'
    +'<img id="vb-single-revisi-foto-img" class="vbfoto-img" src="'+(_hasFoto?('data:'+(VB.produkFotoMime||'image/jpeg')+';base64,'+VB.produkFotoBase64):'')+'" style="width:40px;height:40px;border-radius:var(--radius-xs);object-fit:cover;border:1px solid var(--border-hi);display:block;" />'
    +'<button type="button" onclick="vbSingleRevisiFotoRemove()" style="position:absolute;top:-6px;right:-6px;width:16px;height:16px;border-radius:50%;background:var(--bg);border:1px solid var(--border-hi);color:var(--muted);font-size:11px;line-height:1;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;"><svg class="icon"><use href="#ic-close"></use></svg></button>'
    +'</div>'
    +'<span style="font-size:var(--fs-2xs);color:var(--muted);flex:1;">Foto referensi produk (opsional)</span>'
    +'</div>'
    +'<input class="inp" id="vb-single-revisi-keunggulan" maxlength="150" placeholder="Keunggulan produk (opsional)" style="font-size:var(--fs-xs2);padding:6px 8px;" />'
    +'<input class="inp" id="vb-single-revisi-target" maxlength="120" placeholder="Target audience *wajib" style="font-size:var(--fs-xs2);padding:6px 8px;" />'
    +'<div style="display:flex;gap:8px;">'
    +'<button class="btn sm" id="vb-single-revisi-submit" style="flex:1;" onclick="vbRevisiSingleAI()">Revisi Sekarang</button>'
    +'<button class="reset-btn sm" style="flex:1;" onclick="vbToggleSingleRevisiPanel()">Batal</button>'
    +'</div>';
  multiWrap.appendChild(revisiPanel);
  multiWrap.appendChild(_vbCharMakePanel(0,VB_CHAR_PANEL_STYLE_SINGLE));

  let resetBtn=document.createElement('button');
  resetBtn.className='reset-btn';
  resetBtn.innerHTML='<svg class="icon"><use href="#ic-refresh"></use></svg> Buat Prompt Video Baru';
  resetBtn.onclick=vbReset;
  multiWrap.appendChild(resetBtn);

  if(animate&&typeItems.length>0)return _vbTypewriterSequentialRun(typeItems);
  return Promise.resolve();
}

// FIX BUG#12 (ditemukan saat audit mendalam khusus builder video): _vbEsc()
// sebelumnya CUMA meng-escape backslash & tanda kutip ganda, padahal semua
// field script di sini berasal dari <textarea> (vb-script-hook/story/cta di
// mode manual, dan textarea per-kartu di mode bulk vb-bulk-script-N) yang
// SECARA NATIF mengizinkan newline (Enter atau paste multi-baris). Begitu
// user menekan Enter di dalam kotak script lalu ngetik lagi, karakter
// newline mentah itu ikut disisipkan apa adanya ke dalam nilai JSON tanpa
// di-escape — hasilnya JSON.parse GAGAL TOTAL ("Bad control character in
// string literal") karena JSON tidak mengizinkan karakter kontrol mentah
// (newline/tab/dll) di dalam string literal, wajib ditulis \n / \t / \uXXXX.
// Reproducible: buka script manapun (manual/bulk), tekan Enter di tengah
// kalimat, lalu salin JSON di bawahnya ke validator JSON manapun → error.
// Sekarang semua karakter kontrol (termasuk newline, tab, carriage return)
// di-escape sesuai spesifikasi JSON supaya keluaran SELALU JSON yang valid,
// apa pun isi teks yang diketik/ditempel user.
function _vbEsc(s){
  return String(s||'')
    .replace(/\\/g,'\\\\')
    .replace(/"/g,'\\"')
    .replace(/\n/g,'\\n')
    .replace(/\r/g,'\\r')
    .replace(/\t/g,'\\t')
    .replace(/[\u0000-\u001F]/g,function(ch){return '\\u'+ch.charCodeAt(0).toString(16).padStart(4,'0');});
}
// TERJEMAH PRESET KE INGGRIS (permintaan user, Okt 2026): hasil prompt builder
// video sekarang berbahasa Inggris (kecuali isi script yang diucapkan, tetap
// Indonesia). Nilai preset di UI/state/Riwayat sengaja TIDAK diubah (label chip
// tetap Indonesia, data lama tetap terbaca) — diterjemahkan di sini saat prompt
// dibangun. Teks yang diketik user sendiri (tidak ada di kamus) dipakai apa adanya.
const VB_ACCENT_VIDEO_MAP={
  'neutral standard accent':'neutral standard Indonesian accent, clear even standard cadence at a moderate pace, neutral stress, no regional lilt',
  'casual Jakarta accent':'casual Jakarta accent, fast bright clipped tempo, quick light lift on particles like sih, dong and deh, stress on intensifiers like banget, short phrases, no drawn-out vowels',
  'light Javanese accent':'Javanese accent, unhurried tempo, gliding phrases ending in a falling tone, final vowels slightly lengthened, even stress',
  'light Sundanese accent':'Sundanese accent, lively sing-song lilt, melody rising then falling, particles like teh, atuh, mah and pisan lightly drawn out, playful, even stress',
  'light Medan accent':'Medan accent of a native Medan speaker, brisk, direct and punchy rhythm, short clipped phrases, firm falling endings, strong stress on emphasis words like kali and lah, assertive and straight to the point',
  'light Malaysian accent':'Malaysian accent, relaxed sing-song Malay cadence, smooth even rhythm, less clipped than Jakarta slang, lah and je at phrase ends carry a light lift, easy to understand'
};
// BARIS DELIVERY (v17.7): gaya khas aksen yang dipilih user + aturan prioritas alunan. Ikut ke prompt video (dulu hanya ke AI penulis skrip).
function _vbAccentDelivery(a){
  a=String(a==null?'':a).trim();
  if(!a)return '';
  var out=[];
  var sk=(typeof VB!=='undefined'&&VB&&VB.accentStyleFor===a)?VB.accentStyle:'';
  if(sk&&typeof VB_AKSEN_STYLE!=='undefined')(VB_AKSEN_STYLE[a]||[]).forEach(function(it){if(it[0]===sk)out.push(String(it[2]).replace(/^Delivery:\s*/,'').replace(/[\".\s]+$/,'').replace(/"/g,"'"));});
  out.push('the melody and rhythm follow the accent; the tone changes only energy and volume');
  return out.join('; ');
}

// TONE per gaya bicara x aksen (v17.9): isi tone: di prompt video sekarang menyesuaikan Nada Bicara DAN Aksen (emosi, energi, volume; alunan tetap dari accent:).
// Nada/aksen tulis-sendiri atau kombinasi tak dikenal -> pakai nilai lama (_vbEn).
var VB_TONE_MATRIX={
 "bercanda": {
  "neutral standard accent": "playful and cheerful, light teasing energy, smiling voice, medium volume",
  "casual Jakarta accent": "upbeat playful energy, quick teasing banter, laughing smile in the voice, medium-loud",
  "light Javanese accent": "relaxed playful guyonan, easy teasing, smiling voice, medium volume, punchline dropped lightly",
  "light Sundanese accent": "cheerful giggly humor, playful teasing, smiling voice, medium volume, punchline dropped with a grin",
  "light Medan accent": "blunt deadpan humor, loud-mouthed friendly teasing, punchline said straight, medium-loud",
  "light Malaysian accent": "dry selamba humor, relaxed teasing, punchline dropped casually, medium volume"
 },
 "gaul": {
  "neutral standard accent": "casual trendy energy, relaxed and confident, medium volume",
  "casual Jakarta accent": "high-energy trendy hangout vibe, confident and quick, medium-loud",
  "light Javanese accent": "relaxed easygoing street-smart vibe, confident, medium volume",
  "light Sundanese accent": "laid-back confident vibe, light and breezy, medium volume",
  "light Medan accent": "bold easygoing street vibe, confident and direct, loud and open",
  "light Malaysian accent": "chill relaxed vibe, casual and confident, medium volume"
 },
 "toxic": {
  "neutral standard accent": "blunt sarcastic attitude, sharp put-downs, loud and snappy",
  "casual Jakarta accent": "fast loud roasting attitude, sharp sarcastic bite, snappy",
  "light Javanese accent": "sharp snapping scolds, loud and sarcastic",
  "light Sundanese accent": "sharp sarcastic scolds, loud and snappy, the sting lands on the last words",
  "light Medan accent": "loud-mouthed blunt put-downs, aggressive teasing straight to the face, very loud and forceful",
  "light Malaysian accent": "sharp sarcastic scolds, blunt but not screaming, medium-loud"
 },
 "ramah": {
  "neutral standard accent": "upbeat and clear, chatty and energetic, medium volume",
  "casual Jakarta accent": "upbeat and chatty, quick and lively, medium volume",
  "light Javanese accent": "easygoing and lively, straightforward, medium volume",
  "light Sundanese accent": "lively and cheerful, playful lilt, medium volume",
  "light Medan accent": "firm and familiar, direct, medium-loud",
  "light Malaysian accent": "easygoing and lively, casual and direct, medium volume"
 }
};
function _vbToneFor(pitch,accent){
  var p=String(pitch==null?'':pitch).trim(),a=String(accent==null?'':accent).trim();
  var k=(p==='bercanda'||p==='joking')?'bercanda':(p==='gaul'||p==='casual slang')?'gaul':(p==='toxic'||p==='snarky')?'toxic':(p==='ramah')?'ramah':'';
  var row=k?VB_TONE_MATRIX[k]:null;
  var hit=row?row[a||'neutral standard accent']:'';
  return hit||_vbEn(pitch);
}
// Mode 2 Suara: ganti "aksen anak Jakarta" bawaan dengan aksen yang dipilih (Jakarta/kosong = tidak berubah).
function _vbDuaAccentSwap(str,idx){
  var a=String(_vbCharVal(idx,'accent')||'').trim();
  if(!a||a==='casual Jakarta accent')return str;
  var en=VB_ACCENT_VIDEO_MAP[a]||(a);
  var dl=_vbAccentDelivery(a);
  var _rp='accent: '+en+(dl?'; '+dl:'');return str.replace(/aksen anak Jakarta( \(gaya gaul:[^)]*\))?/,function(){return _rp;});
}
const VB_EN_MAP={
  'ruang tamu mewah':'luxurious living room',
  'kamar tidur estetik':'aesthetic bedroom',
  'dapur minimalis modern':'modern minimalist kitchen',
  'dapur minimalis':'modern minimalist kitchen',
  'taman outdoor rumah':'outdoor home garden',
  'taman outdoor':'outdoor home garden',
  'cafe estetik':'aesthetic cafe',
  'cahaya ruangan natural':'natural indoor lighting',
  'golden hour sore hari':'golden hour, late afternoon',
  'cahaya lampu hangat malam hari':'warm lamp lighting at night',
  'cahaya jendela pagi hari':'soft morning window light',
  'bercanda':'super cheerful',
  'gaul':'super slangy',
  'toxic':'shouting and snapping',
  'ramah':'warm and friendly',
  'produk (outfit) digantung di hanger lalu dipegang oleh karakter menghadap kamera, belum dikenakan.':'The product (outfit) is hung on a hanger and held by the character facing the camera, not worn yet.',
  'produk diperlihatkan langsung ke arah kamera oleh karakter, dipegang dengan jelas terlihat.':'The character shows the product directly to the camera, holding it so it is clearly visible.'
};
function _vbEn(v){
  if(typeof v!=='string')return v;
  var k=v.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(VB_EN_MAP,k)?VB_EN_MAP[k]:v;
}
// PERMINTAAN USER (18 Nov 2026): di semua mode video yang memakai nama produk, frasa ini ditempel tepat setelah nama produk
// (contoh: "tas yang terlihat didalam foto referensi"). Hanya dipasang kalau nama produk terisi.
const VB_PRODUK_REF_SUFFIX=' which is visible in the reference photo'; // mode berbahasa Inggris
const VB_PRODUK_REF_SUFFIX_ID=' yang terlihat didalam foto referensi'; // mode Percakapan 2 Suara (JSON berbahasa Indonesia)
function _vbBuildFlowText(scriptText,produkOverride,tampilOverride,lokasiOverride,fotoCountOverride,idx){
  if(_vbIsDua())return _vbBuildDuaJson(scriptText,produkOverride,idx);
  let _acVal=_vbCharVal(idx,'accent');
  let accentFull=VB_ACCENT_VIDEO_MAP[_acVal]||(_acVal);
  let _dl=_vbAccentDelivery(_acVal);
  let instructionText;
  if(VB.refMode==='kp'){
    // Nama produk buat teks referensi diambil per-konteks (field AI/manual/bulk
    // yang relevan saat generate), bukan ditanya lagi di step 1. produkOverride
    // (dikirim tiap pemanggil — beda-beda per kartu di jalur bulk) dipakai
    // duluan; VB.mode3Produk (diisi di vbGenerate3AI/vbGenerate3Manual, lihat
    // FIX BUG#21) jadi jaring pengaman kalau produkOverride kebetulan kosong
    // (mis. field "produk" hasil AI gagal terisi); 'produk tersebut' generik
    // baru dipakai kalau keduanya sama-sama tidak ada.
    let _pfrRaw=String(produkOverride||VB.mode3Produk||'').replace(/["`\r\n]+/g,' ').replace(/\s+/g,' ').trim();
    let produkForRefPlain=_pfrRaw||'the item shown in those photos';
    let produkForRef=_pfrRaw?(_pfrRaw+VB_PRODUK_REF_SUFFIX):produkForRefPlain; // audit Okt 2026 (v11.85): bersihkan kutip & baris baru, sama seperti mode lain
    // FITUR BARU: "Atur Detail" → Lokasi per kartu (tombol "Lokasi" di kartu
    // Hook/Story/CTA, khusus Mode 3 — lihat _vbBuildEditableCard, vbPickLokasiCard
    // & VB_LOKASI_OPTS). Kalau user sudah pilih lokasi khusus untuk kartu ini,
    // pakai itu MENGGANTIKAN VB.mode3Lokasi (lokasi default 1 sesi dari step 1)
    // — supaya tiap script (bukan cuma tiap produk) bisa punya lokasi beda.
    let lokasiForCard=_vbEn(lokasiOverride||VB.mode3Lokasi);
    // FITUR BARU: dulu selalu "foto referensi 2 adalah produk" (1 foto produk
    // saja). Sekarang user bisa upload 2-5 foto produk (lihat panel kamera di
    // samping Nama Produk, state di VB.produkFotoBase64+VB.produkFotoExtra) —
    // nomor foto referensi produk di teks JSON menyesuaikan jumlah foto yang
    // benar-benar diisi, foto referensi 1 tetap selalu karakter.
    // FITUR BARU: kalau user pilih "Jumlah Foto Produk" khusus untuk produk
    // ini (baris di atas kartu Hook, lihat VB_PRODUCT_FOTOCOUNT/
    // _vbFotoCountVal), angka itu dipakai DULUAN — menggantikan
    // vbProdukFotoCount() (jumlah foto yang BENAR-BENAR diupload) khusus
    // untuk produk ini. Produk lain yang belum diisi tetap ikut jumlah foto
    // asli yang diupload, seperti sebelumnya.
    let produkFotoTotal=Math.max(1,fotoCountOverride||vbProdukFotoCount());
    let produkRefNums=[];
    for(let n=2;n<=1+produkFotoTotal;n++)produkRefNums.push(n);
    let produkRefLabel=produkRefNums.join(',');
    let jumlahFotoTotal=1+produkFotoTotal;
    let _plRef=produkRefNums.length>1;
    instructionText='Reference photo 1 is the character (keep the face and outfit exactly the same), '+(_plRef?'reference photos ':'reference photo ')+produkRefLabel+(_plRef?' are the product, namely ':' is the product, namely ')+produkForRef+' (take only the product itself and ignore any other elements in '+(_plRef?'those photos':'that photo')+'; focus on the product so it matches 100% without exception). Use all '+jumlahFotoTotal+' photos to create a video. Location: '+lokasiForCard+'. Lighting: '+_vbEn(VB.mode3Lighting)+'. Never create or show anything that is not shown in the attached reference photos (for example, opening '+produkForRefPlain+' to reveal its contents if the contents are never visible in the photos). ';
    // FITUR BARU: "Cara Tampil Produk" per kartu (tombol kecil di kartu
    // Hook/Story/CTA, khusus Mode 3 — lihat _vbBuildEditableCard &
    // VB_TAMPIL_PRODUK_OPTS) — kalau user sudah pilih salah satu opsi untuk
    // kartu ini, sisipkan instruksinya di sini supaya ikut ke JSON yang
    // disalin, sama seperti kalau user ketik manual.
    if(tampilOverride)instructionText+=_vbEn(tampilOverride)+' ';
  }else{
    instructionText=VB_REF_MODE_TEXT[VB.refMode]||VB_REF_MODE_TEXT.satu;
    // Nama Produk (yang diisi user) otomatis masuk ke prompt di SEMUA jalur (Kami Bantu Isi, Tulis Manual, Bulk)
    // untuk Start Frame / Frame Asset / Percobaan. Hanya namanya, tanpa detail produk lain. Di Tulis Manual wajib diisi.
    {
      let _pn=String(produkOverride||'').replace(/["\r\n]+/g,' ').replace(/\s+/g,' ').trim();
      if(_pn)instructionText=instructionText.replace(/\s+$/,'')+' The product being promoted is '+_pn+VB_PRODUK_REF_SUFFIX+'.';
    }
  }
  // FIX (menyusul fitur "isi sendiri" Jenis Kelamin): dulu kalau VB.gender
  // bukan persis 'male'/'female', prefix-nya jadi string kosong — nilai
  // custom yang diketik user hilang dari output. Sekarang nilai custom
  // (apa pun isinya) tetap dipakai apa adanya sebagai prefix.
  // FITUR BARU: Motion Karakter (opsional) — ditempel di antara instruksi foto
  // referensi dan blok "dialogue:". Kosong = output sama persis seperti sebelumnya.
  let motionTxt=(VB.refMode==='aset')?'':String(vbMotionText(_vbCharVal(idx,'motion'))||'').replace(/[.\s]+$/,'').trim(); // Frame Asset = tanpa karakter, Pembawaan tidak dipakai
  if(motionTxt){
    // Kalimat pengaman (3 Okt 2026): gerakan tetap natural & selaras ucapan; wajah/produk tidak berubah.
    // Mode 'aset' (foto tanpa wajah) tidak diberi klausa wajah.
    let _mSafe='Movements stay natural and smooth, in sync with the speech';
    if(VB.refMode==='kp')_mSafe+='; the face stays identical to reference photo 1 and the product stays clearly visible';
    else if(VB.refMode==='satu')_mSafe+='; the face stays consistent';
    if(VB.refMode==='percobaan')_mSafe='Movements stay natural and smooth, in sync with the narration';
    instructionText=instructionText.replace(/\s+$/,'')+' Character demeanor: '+motionTxt+'. '+_mSafe+'. ';
  }else if(VB.refMode!=='aset'){
    // Permintaan user (21 Okt 2026): step Pembawaan sudah tidak ada di wizard. Kalau user tidak mengubahnya lewat ikon pensil,
    // isinya otomatis mengikuti skrip.
    // Permintaan user (15 Nov 2026): Character demeanor HANYA muncul kalau dipilih sendiri lewat ikon pensil. Tidak ada teks otomatis.
    // Mode Percobaan: kalimat gerakan selalu ada walau Pembawaan tidak diisi.
    if(VB.refMode==='percobaan')instructionText=instructionText.replace(/\s+$/,'')+' Movements stay natural and smooth, in sync with the narration. '; // 18 Nov 2026: tambah spasi (dulu menempel: "...tas.Movements")
  }
  let _cg=_vbCharVal(idx,'gender');
  let genderPrefix=_cg==='male'?'Male, ':_cg==='female'?'Female, ':(_cg?_cg+', ':'');
  let ageFull=genderPrefix+_vbCharVal(idx,'age');
  // FORMAT OUTPUT (permintaan user, menggantikan format JSON lama): bukan JSON valid,
  // "instruction:...dialogue:voice_character:age:...,pitch:...,accent:...,script:"...""
  // — tidak perlu escaping JSON karena tidak ada JSON.parse yang membaca
  // hasil fungsi ini di bagian lain app (hanya ditampilkan & disalin).
  // FIX (Sept 2026, audit builder video): (1) tanda kutip ganda di dalam isi
  // script dulu tidak di-escape, jadi `script:"Halo "asli" lho"` — kutip
  // pembuka/penutup tabrakan dengan kutip di dalam, membingungkan model video
  // DAN merusak penggantian script:"..." saat menyalin dari Riwayat. Kutip
  // ganda di dalam script sekarang diganti kutip tunggal. (2) Spasi sebelum
  // "dialogue:" dulu cuma ada kalau instruksi berakhir dengan spasi (Raw Asset
  // / ada motion) — Start Frame & Frame Asset tanpa motion jadi menempel
  // ("...sepanjang video.dialogue:"). Sekarang selalu tepat 1 spasi.
  let safeScript=String(scriptText==null?'':scriptText).replace(/"/g,"'");
  let flowText=instructionText.replace(/\s+$/,'')+' dialogue:voice_character:age:'+ageFull+',tone:'+_vbToneFor(_vbCharVal(idx,'pitch'),_acVal)+',accent:'+accentFull+(_dl?',delivery:'+_dl:'')+',script:"'+safeScript+'"';
  if(VB.refMode==='percobaan'||VB.refMode==='aset'){
    // Mode Percobaan & Frame Asset: blok suara narator off-screen (bukan format "dialogue:" di mode lain).
    // Isi script tetap Indonesia; sisanya Inggris. Akhiran 'narration script: "..."' dipakai
    // regex penyalinan Riwayat (lihat _scriptRe) — jangan diubah tanpa menyesuaikan regex itu.
    flowText=instructionText.replace(/\s+$/,'')+' Off-screen voice (narrator), gender and age: '+ageFull+', tone: '+_vbToneFor(_vbCharVal(idx,'pitch'),_acVal)+', accent: '+accentFull+(_dl?', delivery: '+_dl:'')+', narration script: "'+safeScript+'"';
  }
  // GANTI TOTAL (permintaan user, Sept 2026): kalimat overlay Hook lama
  // ("Tulis :"X" muncul pada detik 0 sampai detik 2 (2 detik) lalu
  // menghilang, dengan ukuran teks 10px.") DIHAPUS, diganti kalimat baru di
  // bawah — sekarang eksplisit nentuin POSISI (pojok kanan paling bawah,
  // sebelumnya tidak disebutkan sama sekali) dan ukurannya digambarkan
  // "kecil banget" (bukan cuma angka px) — ditambahkan PALING AKHIR prompt
  // (setelah bagian dialogue/script), HANYA untuk kartu Hook (idx%3===0 —
  // kartu pertama tiap produk, Story/CTA tidak pernah kena). idx dikirim
  // SAMA oleh semua pemanggil _vbBuildFlowText (index flat kartu, konsisten
  // hook=0,story=1,cta=2 per produk di SEMUA mode: single AI, single
  // manual, bulk AI, DAN bulk manual — lihat VB_3SCRIPT_ROLES & baris
  // _vbBuildHookOverlayRow yang sekarang juga dipasang di vbManualRenderGroups,
  // sebelumnya bolong di situ). Kosong kalau user belum isi apa-apa di panel
  // "Atur Detail" (lihat _vbBuildHookOverlayRow).
  // FITUR BARU (permintaan user, Okt 2026): khusus Raw Asset, tambah camera_movement
  // sesuai kartu — Hook (idx%3===0), Story (1), CTA (2). Ditaruh tepat setelah blok
  // dialogue/script, SEBELUM kalimat overlay Hook & larangan icon CTA (tetap paling akhir).
  // VISUAL HOOK (permintaan user, Okt 2026): HANYA kartu Hook (idx%3===0), cuma 1-3 detik pertama.
  // Ditaruh sebelum camera_movement; kalau keduanya dipilih, camera_movement kartu Hook
  // dilanjutkan "setelah visual hook" supaya dua instruksi gerak tidak bertabrakan.
  let _hasVisHook=false;
  // Nilai efektif per produk: override dari panel pensil kalau ada, kalau tidak ya pilihan wizard.
  let _cHook=_vbCharVal(idx,'camHook'), _cMove=_vbCharVal(idx,'camMove');
  if(_vbHasCam()&&typeof idx==='number'&&idx%3===0&&_cHook&&(VB_CAM_HOOKS[_cHook]||_vbCamIsCustom(_cHook))){
    let _hookTxt=_vbCamIsCustom(_cHook)?_vbCamCustomText(_cHook).replace(/[.\s]+$/,''):VB_CAM_HOOKS[_cHook];
    flowText+=' visual_hook: during the first 3 seconds only, '+_hookTxt+'. After that the shot continues naturally.';
    _hasVisHook=true;
  }else if(_vbHasCam()&&typeof idx==='number'&&idx%3===0){
    // Permintaan user (21 Okt 2026): step Visual Hook sudah tidak ada di wizard. Kalau tidak diubah lewat ikon pensil,
    // isinya otomatis mengikuti skrip. Kunci tetap "visual_hook:" (dipakai regex Salin/Riwayat). Hanya kartu Hook.
    // Permintaan user (15 Nov 2026): visual_hook HANYA muncul kalau dipilih sendiri lewat ikon pensil. Tidak ada teks otomatis.
  }
  if(_vbHasCam()&&_cMove&&typeof idx==='number'&&(VB_CAM_MOVES[_cMove]||_vbCamIsCustom(_cMove))){
    // Isi sendiri: teks user dipakai apa adanya di kartu Hook, Story, dan CTA.
    let _camVal=_vbCamIsCustom(_cMove)?_vbCamCustomText(_cMove):VB_CAM_MOVES[_cMove][idx%3];
    // Kalau kartu Hook punya visual hook, gerakan kamera yang jalan SETELAH hook memakai versi tenang (Story),
    // supaya dua gerakan tidak bertabrakan. Frame Asset: transisi foto 1 -> foto 2 sudah dikerjakan oleh
    // visual hook, jadi setelahnya kamera cukup tenang di komposisi foto 2.
    if(_hasVisHook&&idx%3===0&&!_vbCamIsCustom(_cMove)){
      _camVal=VB_CAM_MOVES[_cMove][1];
    }
    if(_camVal)flowText+=' camera_movement: '+((_hasVisHook&&idx%3===0)?'after the visual hook, ':'')+_camVal;
  }
  let isHookCard=(typeof idx==='number')&&(idx%3===0);
  if(isHookCard){
    let overlayTxt=_vbHookOverlayText(idx);
    if(overlayTxt){
      // Mode Percobaan: instruksi dasarnya melarang teks ("No text, no subtitles"), padahal overlay
      // Hook adalah teks. Larangan dilonggarkan supaya tidak saling bertentangan.
      if(VB.refMode==='percobaan'||VB.refMode==='aset')flowText=flowText.replace('No text, no subtitles, no extra logos','No subtitles, no extra logos, no text other than the small overlay described at the end');
      flowText+=_vbOverlaySentence(overlayTxt);
    }
  }
  // FITUR BARU (permintaan user): khusus mode Raw Asset (VB.refMode==='kp')
  // DAN khusus kartu CTA (idx%3===2 — kartu ketiga tiap produk, hook=0/
  // story=1/cta=2 seperti komentar di atas), tambahkan instruksi ini PALING
  // AKHIR prompt supaya AI video tidak memunculkan icon apapun pas bagian CTA.
  let isCtaCard=(typeof idx==='number')&&(idx%3===2);
  if((VB.refMode==='kp'||VB.refMode==='satu'||VB.refMode==='aset'||VB.refMode==='percobaan')&&isCtaCard){
    // Okt 2026 (permintaan user): larangan ini kini juga dipasang di Start Frame (satu), Frame Asset (aset) & Percobaan,
    // bukan cuma Raw Asset (kp), dan diperluas: tidak ada keranjang fisik + tidak ada ikon/elemen tampilan belanja.
    // Awal kalimat "Make sure no icon" JANGAN diubah (dipakai regex tombol Salin per kartu).
    flowText+='. Make sure no icon of any kind appears during the CTA. The keranjang bawah mentioned in the narration is only a checkout button on the shopping platform, so do not show any physical basket, shopping cart, shopping bag, or basket-like object, and '+(VB.refMode==='aset'?'a hand':'the character')+' must not hold, point at, or reach for one. Also do not show any shopping cart icon, basket icon, shopping bag icon, buy button, or any e-commerce interface element anywhere in the frame, as an overlay, sticker, graphic, or animation.';
  }
  // PERMINTAAN USER (19 Nov 2026): "Tulisan Estetik" (ikon pensil, grup Visual). Kalau dinyalakan, kalimat VB_AESTHETIC_TEXT ditempel di SEMUA kartu (Hook/Cerita/CTA) produk itu,
  // sebelum ambient (ambient & kalimat POV Produk tetap paling akhir). Default mati: tanpa klik di pensil, tidak ada teks otomatis.
  if(typeof idx==='number'&&VB.refMode!=='dua'&&_vbCharVal(idx,'aesthetic')){
    // Frame Asset & Percobaan: teks dasarnya melarang teks sama sekali — dilonggarkan supaya tidak bertabrakan (sama seperti overlay Hook di atas).
    if(VB.refMode==='percobaan'||VB.refMode==='aset'){
      flowText=flowText.replace('No text, no subtitles, no extra logos','No subtitles, no extra logos, no text other than the aesthetic text overlays described below')
        .replace('no text other than the small overlay described at the end','no text other than the small overlay and the aesthetic text overlays described below');
    }
    let _aeT=flowText.replace(/\s+$/,'');
    flowText=_aeT+(/[.!?]$/.test(_aeT)?' ':'. ')+VB_AESTHETIC_TEXT;
  }
  // PERMINTAAN USER (1 Nov 2026): kalimat ambient ditempel PALING AKHIR prompt (setelah overlay Hook / larangan icon CTA)
  // khusus Start Frame (satu), Raw Asset (kp), dan uiui jalur "Pakai Dialog / Skrip" (refMode 'aset'). Semua kartu Hook/Story/CTA.
  if(VB.refMode==='satu'||VB.refMode==='kp'||VB.refMode==='aset'){
    flowText=flowText.replace(/\s+$/,'')+' ambient: suara karakter seperti direkam dari HP biasa, ada suara ruangan atau angin yang tipis, santai dan tidak terlalu sempurna seperti rekaman studio.';
  }
  // PERMINTAAN USER (18 Nov 2026): khusus POV Produk · Pakai Skrip (refMode 'aset'), kalimat ini ditempel PALING AKHIR prompt (setelah ambient), semua kartu Hook/Story/CTA.
  if(VB.refMode==='aset'){
    flowText=flowText.replace(/\s+$/,'')+' Do not change scenes. Only gently shake the product according to the script, but never show the back of the product if its front is visible, and vice versa.';
  }
  return flowText;
}

