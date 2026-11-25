// fitur/foto-wizard-langkah.js — Prompt Foto AI — langkah-langkah wizard (kartu f1–f9): membuka, menutup, dan mereset step.
// Bagian dari js/10-main-app.js lama (baris 481–3878). Isi tidak diubah.
// ════════════════════════════════════════════════════════════════════════
// showCard — membuka card step wizard Foto (f1–f9)
//
// DILEBUR dari 4 lapis patch yang dulu membungkus fungsi ini (js/27, 33, 34, 35).
// Urutan keputusan SAMA PERSIS dengan rantai lama, dari terluar ke terdalam:
//   [pembungkus terluar di js/42-povhand-skip.js — sengaja tetap di file itu]
//   1) Foto referensi "Pose"     -> f4 dilewati           (dulu js/35 pb-poseref)
//   2) Produk + Lokasi saja      -> chip f3 / step f4     (dulu js/34 pb-nochar)
//   3) Foto referensi "Lokasi"   -> f5 & f7 dilewati      (dulu js/33 foto-referensi-lokasi)
//   4) Isi asli + pbLokPose() setelah f5                   (dulu js/27 pst-stage + fungsi asli)
// PENTING: langkah 3 memanggil _showCardCore() — BUKAN showCard() — karena dulu ia
// memanggil lapisan di DALAMNYA (melewati langkah 1-2 dan js/42). Mengubahnya jadi
// showCard() bisa mengubah perilaku mode POV-tangan.
// ════════════════════════════════════════════════════════════════════════
function _scLokasiNo(){
  var l=fSortRefsForOrder(FS.refs.filter(function(r){return r.type!=='outfit_random';}));
  for(var i=0;i<l.length;i++){if(l[i].type==='lokasi')return i+1;}
  return 1;
}

function _scApplySkip(){
  var n=_scLokasiNo(),lbl='Dari foto lokasi';
  var lokDesc='the exact location shown in reference photo '+n+' — same architecture, props, background elements, colors, and atmosphere (the place only \u2014 ignore the camera angle, viewpoint, and framing of that photo, and ignore any person in it)';
  var cahDesc='taken entirely from reference photo '+n+', with the same light direction, color temperature, softness, contrast, and shadow behavior';
  FS.lokasi=lbl;FS.lokasiLabel=lbl;FS.lokasiDesc=lokDesc;
  FS.cahaya=lbl;FS.cahayaLabel=lbl;FS.cahayaDesc=cahDesc;
  try{_fCahaya={val:cahDesc,label:lbl};}catch(e){}
  doneCard('f5','fa5',lbl);
  doneCard('f7','fa7',lbl);
  if(typeof fSyncStepNums==='function')fSyncStepNums();
}

function _scPoseNo(){
  var l=fSortRefsForOrder(FS.refs.filter(function(r){return r.type!=='outfit_random';}));
  for(var i=0;i<l.length;i++){if(l[i].type==='pose')return i+1;}
  return 1;
}

function pbHoldChipSync(){
  var nc=false;try{nc=fIsNoChar();}catch(e){}
  /* Nov 2026 (permintaan user): opsi "Produk di hanger" disembunyikan di mode Produk + Lokasi (tanpa karakter), sama seperti "Dipakai ke karakter". */
  document.querySelectorAll('#f3 .chip[onclick*="fPickHold(\'hanger\'"]').forEach(function(c){c.style.display=nc?'none':'';});
  /* Nov 2026: "Dipakai ke karakter" juga disembunyikan di jalur buka-ulang (Ringkasan / Lompat ke step) — dulu hanya disembunyikan lewat showCard('f3'). */
  document.querySelectorAll('#f3 .chip[onclick*="fPickHold(\'dipakai\'"]').forEach(function(c){c.style.display=nc?'none':'';});
  document.querySelectorAll('#f3 .chip[onclick*="fPickHold(\'tangan\'"]').forEach(function(c){
    var tn=null,i;
    for(i=0;i<c.childNodes.length;i++){if(c.childNodes[i].nodeType===3&&c.childNodes[i].nodeValue.trim()){tn=c.childNodes[i];break;}}
    if(!tn){var t=c.querySelector('.text-title-sm');if(t&&t.firstChild&&t.firstChild.nodeType===3)tn=t.firstChild;}
    if(!tn)return;
    if(c.dataset.origTxt===undefined)c.dataset.origTxt=tn.nodeValue;
    var want=nc?'Dipegang tangan (POV)':c.dataset.origTxt;
    if(tn.nodeValue!==want)tn.nodeValue=want;
  });
}

function _showCardCore(id){
  let el=document.getElementById(id);
  if(!el){console.warn('showCard: elemen tidak ditemukan —',id);}
  else{
  // FIX BUG "STEP YANG DI-SKIP TIDAK BISA DIBUKA LAGI": showCard() dulu cuma
  // menghapus class hidden/pending, TIDAK PERNAH menghapus 'done'. Kalau card
  // ini sebelumnya ditandai done supaya di-skip (mis. F3 waktu foto produk
  // belum diupload), CSS ".wcard.done .wbody{display:none}" bikin isi card
  // tetap tersembunyi walau showCard(id) dipanggil buat menampilkan card ini
  // sebagai step aktif — layar jadi kelihatan kosong. Semua pemanggilan
  // showCard(id) di file ini bermaksud membuka card tersebut sebagai step
  // yang sedang aktif — kontradiktif dengan status 'done' — jadi aman & benar
  // untuk selalu melepas 'done' di sini juga.
  el.classList.remove('done');
  // Remove both hidden and pending states
  el.classList.remove('hidden','pending');
  // FIX KEDIPAN: card f1-f8 mulai dengan class "pending" (bukan "hidden"),
  // jadi animasi fadeUp yang dulu digantung di selector ":not(.hidden)"
  // TIDAK pernah restart saat pending dilepas (selector-nya sudah cocok
  // sejak awal render, cuma ketutup display:none!important dari .pending).
  // Solusinya: paksa restart animasi tiap kali card ini ditampilkan, lewat
  // toggle class + force reflow, apa pun state sebelumnya (hidden/pending).
  el.classList.remove('anim-in');
  void el.offsetWidth; // paksa reflow supaya animasi bisa direstart
  el.classList.add('anim-in');
  // Mark all subsequent foto cards as pending (dimmed)
  let allFotoCards=['f1','f2','f3','f4','f5','f7','f8'];
  let idx=allFotoCards.indexOf(id);
  if(idx>=0){
    for(let i=idx+1;i<allFotoCards.length;i++){
      let next=document.getElementById(allFotoCards[i]);
      if(next&&!next.classList.contains('done')){
        next.classList.remove('hidden');
        next.classList.add('pending');
      }
    }
  }
  setTimeout(()=>{
    el.scrollIntoView({behavior:'smooth',block:'nearest'});
  },150);
  }
  // [dulu js/27-pst-stage] setelah f5 dibuka, sinkronkan pose-lokasi di panggung pratinjau.
  if(id==='f5'&&window.pbLokPose)window.pbLokPose();
}

function showCard(id){
  // 1) foto referensi Pose
  if(id==='f4'&&fHasPoseRef()&&!fIsNoChar()){
    var n=_scPoseNo(),lbl='Dari foto pose';
    FS.pose=lbl;FS.poseLabel=lbl;
    FS.poseDesc='the exact body pose shown in reference photo '+n+' — same head tilt, gaze direction, hand and finger positions, arm and leg positions, posture, body lean, and facing direction, applied to the character';
    var c4=document.getElementById('f4');
    if(c4){c4.classList.add('done','hidden');c4.classList.remove('pending');}
    var a4=document.getElementById('fa4');if(a4)a4.textContent=lbl;
    if(typeof fSyncStepNums==='function')fSyncStepNums();
    if(typeof fUpdateProgress==='function')fUpdateProgress(5,'Lokasi');
    return showCard('f5');
  }
  // 2) mode Produk + Lokasi saja (tanpa karakter)
  if(id==='f3'){
    var nc=fIsNoChar();
    document.querySelectorAll('#f3 .chip[onclick*="fPickHold(\'dipakai\'"]').forEach(function(c){c.style.display=nc?'none':'';});
    /* sisa pilihan hanger (mis. dari sesi/draft lama) tidak boleh terbawa ke mode tanpa karakter */
    if((nc||FS.povProduk)&&FS.holdKey==='hanger'&&!FS.importActive){
      FS.holdKey='';FS.hold='';FS.holdLabel='';FS.povPlacement='';FS.povCamera='';
      document.querySelectorAll('#f3 .chip').forEach(function(c){c.classList.remove('sel');});
    }
    pbHoldChipSync();
  }
  if(id==='f4'&&fIsNoChar()){
    FS.pose='';FS.poseLabel='';FS.poseDesc='';
    var c4=document.getElementById('f4');
    if(c4){c4.classList.add('done','hidden');c4.classList.remove('pending');}
    var a4=document.getElementById('fa4');if(a4)a4.textContent='';
    if(typeof fSyncStepNums==='function')fSyncStepNums();
    if(typeof fUpdateProgress==='function')fUpdateProgress(5,'Lokasi');
    return showCard('f5');
  }
  // 3) foto referensi Lokasi
  if((id==='f5'||id==='f7')&&typeof fHasLokasiRef==='function'&&fHasLokasiRef()){
    _scApplySkip();
    var f8=document.getElementById('f8');
    if(f8&&!f8.classList.contains('done')){
      fUpdateProgress(8,'Sudut Kamera');
      return _showCardCore('f8');
    }
    /* FIX LAYAR KOSONG / USER TERJEBAK (dilaporkan user): saat user mengubah "Cara Tampil Produk" (atau step lain)
       di mode Foto Lokasi / Produk + Lokasi, Lokasi & Pencahayaan otomatis dilewati. Kalau Sudut Kamera (f8) sudah
       selesai, dulu fungsi ini langsung return tanpa menampilkan apa pun -> semua kartu 'done', header "Siap dibuat",
       tapi area Generate tetap tersembunyi. Sekarang lanjut ke step berikutnya yang belum selesai (Mood & Tone),
       dan kalau semuanya sudah terisi, tampilkan area Generate. */
    var f9=document.getElementById('f9');
    if(f9&&(!f9.classList.contains('done')||!FS.mood)){
      fUpdateProgress(9,'Mood & Tone');
      return _showCardCore('f9');
    }
    var _gaSk=document.getElementById('f-gen-area');
    if(_gaSk){
      _gaSk.classList.remove('hidden');
      fUpdateProgress(9,'<svg class="icon"><use href="#ic-check"></use></svg> Selesai!');
      if(typeof fRunAIConflictCheck==='function')fRunAIConflictCheck(true);
      setTimeout(function(){_gaSk.scrollIntoView({behavior:'smooth',block:'nearest'});},150);
    }
    return;
  }
  // 4) inti: isi asli showCard + hook pbLokPose
  return _showCardCore(id);
}

// ── PAUSE STEP AKTIF SAAT EDIT STEP LAIN ─────────────────────────────
// Permintaan user: kalau lagi di step yang belum selesai (mis. step 6,
// masih kebuka di layar) terus user buka step lain buat diubah (mis.
// step 3, lewat tap whead card 'done' atau lewat "Lompat ke step"),
// step 6 harus ketutup dulu selama step 3 diedit — begitu edit step 3
// beres, step 6 muncul lagi persis seperti sebelumnya. Dipakai LIFO
// (stack) per tab (foto/video) supaya edit bertingkat (buka step lain
// lagi saat masih edit step sebelumnya) tetap balik ke urutan yang benar.
let STEP_PAUSE_STACK={foto:[],video:[]};
function fPageIdForStepId(stepId){
  return String(stepId).charAt(0)==='v' ? 'video' : 'foto';
}
// Cari card yang lagi "aktif kebuka" (bukan done/hidden/pending/display:none)
// di tab yang sama, selain card target yang mau dibuka buat diedit.
function fFindActiveOpenCard(pageId,excludeId){
  let page=document.getElementById(pageId);
  if(!page)return null;
  let cards=page.querySelectorAll('.wcard');
  for(let i=0;i<cards.length;i++){
    let c=cards[i];
    if(c.id===excludeId)continue;
    if(c.classList.contains('done'))continue;
    if(c.classList.contains('hidden'))continue;
    if(c.classList.contains('pending'))continue;
    if(c.style.display==='none')continue;
    return c;
  }
  return null;
}
function fPauseActiveStepForEdit(targetId){
  let pageId=fPageIdForStepId(targetId);
  let active=fFindActiveOpenCard(pageId,targetId);
  if(active){
    active.classList.add('hidden');
    STEP_PAUSE_STACK[pageId].push(active.id);
  }
}
function fResumePausedStep(pageId){
  let stack=STEP_PAUSE_STACK[pageId];
  if(!stack||!stack.length)return;
  let pausedId=stack.pop();
  let el=document.getElementById(pausedId);
  if(el){
    el.classList.remove('hidden');
    el.classList.remove('anim-in');
    void el.offsetWidth; // paksa reflow supaya animasi bisa direstart
    el.classList.add('anim-in');
  }
}

function doneCard(id,ansId,text){
  // FIX RINGKASAN HILANG: kalau ada tombol "Selesai Edit — Kembali ke
  // Generate" nyangkut dari fSummaryEdit() (dipasang di step yang lagi
  // diedit), buang begitu step-nya beres lewat alur normal (chip/pick
  // biasa), bukan lewat tombol itu sendiri — biar nggak numpuk/nyisa.
  let _sedbAny=document.getElementById('summary-edit-done-btn');
  if(_sedbAny) _sedbAny.remove();

  let c=document.getElementById(id);
  // FIX BUG "STEP TERTUMPUK" (Video): catat apakah step ini barusan dibuka
  // ulang untuk DIEDIT (ditandai _doOpenEdit lewat data-reopened) — bukan
  // step yang diselesaikan dalam alur maju biasa. Dikembalikan sebagai return
  // value supaya pemanggil (vbConfirmRef, vbCheckV2Done, vbPick*Confirmed)
  // tahu kapan TIDAK boleh membuka step berikutnya lagi — lihat
  // vbAdvanceStep(). Flag langsung dibersihkan supaya tidak nyangkut.
  let _wasReopened=!!(c&&c.dataset&&c.dataset.reopened==='1');
  if(c&&c.dataset)delete c.dataset.reopened;
  if(c){
    c.classList.add('done');
    c.classList.remove('pending','hidden');
    // Store original step number
    let wnum=c.querySelector('.wnum');
    if(wnum&&!wnum._origText)wnum._origText=wnum.textContent;
    // Wire click-to-edit on whead (once only)
    let whead=c.querySelector('.whead');
    if(whead&&!whead._editWired){
      whead._editWired=true;
      function _doOpenEdit(){
        // Tutup dulu step aktif lain (yang masih kebuka/belum selesai)
        // di tab yang sama, sebelum step ini dibuka buat diedit.
        fPauseActiveStepForEdit(id);
        c.classList.remove('done');
        c.classList.remove('hidden','pending');
        // Tandai: card ini dibuka ulang untuk diedit (dibaca doneCard()).
        c.dataset.reopened='1';
        // Video: samakan header progress ("Step X dari 6" + nama step)
        // dengan step yang sedang diedit, bukan step terdepan yang tadi
        // ditinggalkan.
        if(typeof VB_STEP_META!=='undefined'&&VB_STEP_META[id]&&typeof vbUpdateProgress==='function'){
          vbUpdateProgress(VB_STEP_META[id][0],VB_STEP_META[id][1]);
        }
        // Buang sisa tombol konfirmasi kalau ada dari sesi sebelumnya
        let _oldCb=document.getElementById(id+'-confirmbar');
        if(_oldCb)_oldCb.remove();
        // Kembalikan kolom "isi sendiri" (beserta tombol "Konfirmasi →"
        // miliknya) kalau sempat disembunyikan supaya cuma 1 tombol
        // konfirmasi yang tampil
        fRestoreCustomBlock(c);
        // Restore step number
        if(wnum&&wnum._origText)wnum.textContent=wnum._origText;
        // Reset answer text
        let a2=document.getElementById(ansId);
        if(a2)a2.textContent='';
        // Isi ulang chip/kotak "tulis sendiri" dengan value yang sudah ada
        // (manual maupun hasil import) — supaya value lama TIDAK hilang
        // hanya karena card dibuka lagi untuk diubah.
        let cardNumFromId=parseInt(String(id).replace('f',''),10);
        if(!isNaN(cardNumFromId)&&typeof fRestoreStepUI==='function'){
          setTimeout(()=>fRestoreStepUI(cardNumFromId),50);
        }
        setTimeout(()=>c.scrollIntoView({behavior:'smooth',block:'nearest'}),80);
      }
      whead.addEventListener('click',function(){
        if(c.classList.contains('done')){
          // FIX BUG#4: kalau ini step Video V1-V5 dan output (vb-multi-output)
          // sudah ter-generate, edit ulang step ini akan bikin JSON yang
          // tampil di layar jadi basi (data lama) tanpa peringatan. Tanya
          // dulu, dan kalau user lanjut, bersihkan output lama supaya tidak
          // ke-copy salah.
          // FIX BUG#14 (ditemukan saat audit mendalam): regex sebelumnya cuma
          // /^v[1-4]$/ — melewatkan v5, padahal v5 (pilih mode Script: AI/
          // Manual/Bulk) justru step yang PALING langsung menghasilkan
          // vb-multi-output. Reproducible: generate 3 script/bulk sampai
          // selesai → klik header step v5 buat ganti mode (mis. dari Bulk ke
          // Manual) → kartu JSON lama TETAP nampil di layar tanpa peringatan
          // ATAU dibersihkan, jadi ada 2 sumber "hasil" yang tidak sinkron
          // sampai user generate ulang. Sekarang v5 ikut diperiksa sama
          // seperti v1-v4.
          let _isVideoStep=/^v(?:[1-5]|motion|cam|off)$/.test(id);
          let _mo=_isVideoStep?document.getElementById('vb-multi-output'):null;
          let _moHasContent=_mo&&_mo.style.display!=='none'&&_mo.innerHTML.trim()!=='';
          if(_moHasContent){
            showConfirm('Mengubah step ini akan menghapus script/JSON yang sudah dibuat, karena datanya sudah tidak sesuai lagi. Lanjutkan?',function(){
              _mo.style.display='none';
              _mo.innerHTML='';
              VB_BULK_ITEMS=[];
              VB_CARD_TAMPIL={};
              VB_CARD_LOKASI={};
              VB_PRODUCT_FOTOCOUNT={};
              VB_HOOK_OVERLAY={};
              VB_CHAR_OVR={};
              _doOpenEdit();
            },null,'Ya, Ubah & Hapus Hasil');
          }else{
            _doOpenEdit();
          }
        }
      });
    }
  }
  let a=document.getElementById(ansId);if(a)a.textContent=text;

  // SEMBUNYIKAN STEP YANG SUDAH SELESAI — sebelumnya baris ini cuma jalan
  // waktu mode import (FS.importActive), sekarang berlaku SELALU atas
  // permintaan user: begitu satu step selesai diisi, barisnya langsung
  // hilang total dari layar (bukan cuma collapse jadi baris ringkas kayak
  // sebelumnya) — cuma card yang lagi aktif yang kelihatan. Satu-satunya
  // jalan buat lihat/ubah step yang sudah lewat adalah lewat bottom sheet
  // "Lompat ke step" (tap progress bar di atas, lihat fOpenStepJump()),
  // yang manggil fSummaryEdit() untuk meng-un-hide sementara — begitu
  // selesai diedit (doneCard dipanggil lagi dari situ), otomatis
  // ke-hide lagi di sini seperti semula.
  if(c){
    c.classList.add('hidden');
  }

  // Step yang tadi ketutup sementara (karena user lagi edit step ini)
  // dimunculkan lagi sekarang, karena step ini sudah beres diedit.
  fResumePausedStep(fPageIdForStepId(id));
  return _wasReopened;
}

// ── KONFIRMASI SEBELUM LANJUT ────────────────────────────────────────
// Dulu: klik 1 chip (mis. pose "Berdiri") langsung lompat ke step
// berikutnya. Sekarang: klik chip cuma menandai pilihan (highlight),
// lalu muncul tombol "Konfirmasi & Lanjut →" — step baru pindah kalau
// tombol itu yang diklik. Dipakai generik di semua step berbasis chip
// (bukan step yang sudah punya tombol "Konfirmasi →" sendiri untuk
// input custom — itu sudah otomatis butuh klik terpisah).
function fShowConfirm(cardId, el, advanceFn){
  let card=document.getElementById(cardId);
  if(!card || typeof advanceFn!=='function'){ if(typeof advanceFn==='function')advanceFn(); return; }
  let old=document.getElementById(cardId+'-confirmbar');
  if(old)old.remove();
  let bar=document.createElement('div');
  bar.id=cardId+'-confirmbar';
  bar.style.cssText='margin-top:12px;';
  bar.innerHTML='<button class="btn sm"><svg class="icon"><use href="#ic-check"></use></svg> '+'Lanjut →'+'</button>';
  bar.querySelector('button').onclick=function(){
    let b=document.getElementById(cardId+'-confirmbar');
    if(b)b.remove();
    advanceFn();
  };
  // Taruh bar ini di PALING BAWAH card (setelah kolom "Atau isi sendiri"),
  // bukan langsung di bawah baris chip — supaya urutannya wajar: pilihan
  // chip di atas, kolom isi sendiri di tengah, dan cuma ada 1 tombol
  // konfirmasi di paling bawah sebagai penutup step ini.
  (card.querySelector('.wbody')||card).appendChild(bar);
  // SATU TOMBOL KONFIRMASI SAJA: kalau step ini punya kolom "isi sendiri"
  // dengan tombol "Konfirmasi →" sendiri, sembunyikan HANYA tombolnya
  // selama bar "Konfirmasi & Lanjut →" ini tampil — kolom input, label,
  // dan tombol "Simpan" tetap kelihatan supaya user masih bisa lihat/pakai
  // kolom isi sendiri, cuma tombol konfirmasi yang dobel yang disembunyikan.
  card.querySelectorAll('[data-role="mt12-confirm"]').forEach(function(btn){
    if(btn.style.display!=='none'){
      btn.dataset.hiddenByConfirm='1';
      btn.style.display='none';
    }
  });
  // Kalau step ini lagi dibuka dari mode "Edit" via Ringkasan, ada juga
  // tombol "Selesai Edit — Kembali ke Generate" yang selalu nempel di
  // bawah card itu. Begitu user pilih chip dan bar "Konfirmasi & Lanjut →"
  // muncul, sembunyikan dulu tombol "Selesai Edit" itu supaya tidak ada
  // 2 tombol hijau/emas yang keliatan sekaligus — cukup 1 tombol aktif
  // yang relevan dengan apa yang baru saja user lakukan. Pakai fungsi
  // terpusat (bukan hide manual di sini) supaya SEMUA titik yang bisa
  // memunculkan/menyembunyikan tombol ini selalu sepakat satu sama lain —
  // lihat komentar di fSyncCardEditDoneBtn kenapa ini penting.
  fSyncCardEditDoneBtn(cardId, true);
  setTimeout(()=>bar.scrollIntoView({behavior:'smooth',block:'nearest'}),50);
}

// SATU-SATUNYA SUMBER KEBENARAN untuk tombol "Selesai Edit — Kembali ke
// Generate": menyembunyikan/menampilkannya tergantung apakah step yang
// sedang diedit (cardId) itu punya tombol konfirmasi bawaannya sendiri
// yang sedang kelihatan. SEMUA titik di file ini yang bisa mengubah status
// tombol konfirmasi sebuah step (buka step buat edit, pilih chip, mulai
// ngetik di kolom "isi sendiri", dst.) HARUS memanggil fungsi ini di akhir
// — jangan set editBtn.style.display secara manual di tempat lain, supaya
// tidak ada lagi kondisi "2 tombol nempel bareng" yang selama ini berulang
// kali muncul lagi tiap kali ada 1 titik baru yang lupa disinkronkan.
//
// isNativeVisible boleh diisi manual (dipakai F1 foto referensi & F2 kotak
// nama produk, yang tombol bawaannya bukan pola chip+mt12-confirm standar).
// Kalau tidak diisi (undefined), fungsi ini AUTO-DETECT dengan mengecek 2
// hal yang berlaku generik untuk step manapun: (a) bar "Konfirmasi & Lanjut
// →" hasil fShowConfirm sedang tampil, atau (b) tombol "Konfirmasi →" milik
// kolom "isi sendiri" (data-role="mt12-confirm") sedang tampil. Ini yang
// dipakai step-step generik: f3 (cara pegang), f4 (pose), f5×2 (lokasi),
// f7 (cahaya), f8 (angle), f9 (mood).
function fSyncCardEditDoneBtn(cardId, isNativeVisible){
  let editBtn=document.getElementById('summary-edit-done-btn');
  if(!editBtn)return;
  let card=document.getElementById(cardId);
  if(!card||!card.contains(editBtn))return; // tombol ini lagi dipakai step lain
  if(isNativeVisible===undefined){
    // PENTING: cek offsetParent (bukan cuma btn.style.display sendiri).
    // Beberapa step (mis. f5 Lokasi) punya lebih dari satu kolom "isi
    // sendiri" yang disembunyikan lewat PANEL INDUKnya (mis.
    // #f5-produk-panel vs #f5-normal-panel, ditoggle display:none oleh
    // fToggleF1Panel) — bukan lewat style.display tombolnya sendiri.
    // btn.style.display cuma baca inline style ELEMEN ITU SENDIRI, jadi
    // tombol di dalam panel yang lagi disembunyikan tetap kebaca "visible"
    // walau sebenarnya tidak tampil sama sekali — bikin deteksi ini salah
    // dan tombol "Selesai Edit" jadi ikut disembunyikan padahal harusnya
    // muncul. offsetParent===null artinya elemen itu (atau salah satu
    // induknya) sedang display:none — cara paling andal utk cek "beneran
    // kelihatan di layar" tanpa peduli lewat elemen mana ia disembunyikan.
    let bar=document.getElementById(cardId+'-confirmbar');
    let barVisible=!!(bar && bar.getClientRects().length>0); // getClientRects (bukan offsetParent): bar Lanjut sekarang position:fixed -> offsetParent selalu null
    let mt12Visible=Array.from(card.querySelectorAll('[data-role="mt12-confirm"]')).some(function(btn){return btn.getClientRects().length>0;}); // getClientRects: tombol Lanjut "isi sendiri" kini position:fixed (dock) -> offsetParent selalu null
    isNativeVisible=barVisible||mt12Visible;
  }
  editBtn.style.display=isNativeVisible?'none':'';
}

// SATU TOMBOL KONFIRMASI SAJA (khusus F1 — Foto Referensi): step ini
// punya tombol "Selesai — Lanjut →" / "Selesai →" bawaannya sendiri
// (muncul begitu ada foto dipilih / slot produk diisi). Kalau step ini
// sedang dibuka dari mode "Edit" via Ringkasan, ada juga tombol generik
// "Selesai Edit — Kembali ke Generate" yang selalu nempel di bawah card.
// Fungsi ini menyembunyikan tombol generik itu SELAMA tombol asli step
// ini kelihatan (supaya user cuma lihat 1 tombol), dan memunculkannya
// lagi kalau tombol asli itu sempat hilang (mis. semua foto dihapus)
// supaya user tetap ada jalan keluar. Dipanggil tiap kali f1-confirm
// atau f1-produk-saja-lanjut berubah visibilitasnya.
function fSyncF1EditDoneBtn(){
  let confirm=document.getElementById('f1-confirm');
  let nativeVisible=!!(confirm&&!confirm.classList.contains('hidden'));
  fSyncCardEditDoneBtn('f1', nativeVisible);
}

// Kembalikan tombol "Konfirmasi →" kolom "isi sendiri" DAN tombol
// "Selesai Edit — Kembali ke Generate" yang sempat disembunyikan
// fShowConfirm (dipanggil saat card dibuka lagi untuk diedit, saat
// direset, atau saat user mulai mengetik di kolom "isi sendiri").
function fRestoreCustomBlock(card){
  if(!card)return;
  card.querySelectorAll('[data-role="mt12-confirm"]').forEach(function(btn){
    if(btn.dataset.hiddenByConfirm){
      // 'flex' (bukan ''): '' jatuh kembali ke CSS default display:none.
      let _in=btn.closest('.mt12')?btn.closest('.mt12').querySelector('input'):null;
      btn.style.display=(_in&&_in.value.trim().length>0)?'flex':'none';
      delete btn.dataset.hiddenByConfirm;
    }
  });
  // FIX BUG "2 TOMBOL DOBEL SAAT NGETIK DI ISI SENDIRI": sebelumnya baris
  // di bawah ini langsung "editDoneBtn.style.display=''" tanpa syarat —
  // begitu tombol "Konfirmasi →" kolom ini balik kelihatan (di atas), tombol
  // "Selesai Edit — Kembali ke Generate" IKUT balik kelihatan juga di saat
  // yang sama, padahal keduanya tidak boleh tampil bareng. Sekarang pakai
  // fSyncCardEditDoneBtn (auto-detect, tanpa parameter ke-2) supaya dia yang
  // memutuskan: karena tombol "Konfirmasi →" barusan kita tampilkan lagi di
  // atas, fungsi ini akan mendeteksinya dan MEMBIARKAN "Selesai Edit" tetap
  // tersembunyi — cuma 1 tombol yang relevan (Konfirmasi → punya kolom ini)
  // yang aktif selama user masih mengetik di kolom "isi sendiri".
  fSyncCardEditDoneBtn(card.id);
}

function showConfirm(msg,onOk,onCancel,okLabel){
  let overlay=document.createElement('div');
  overlay.className='confirm-overlay';
  let box=document.createElement('div');box.className='confirm-box';
  let h4=document.createElement('h4');h4.textContent='Yakin?';
  let p=document.createElement('p');
  // SECURITY: Pisahkan teks utama dan catatan tip — tidak pakai innerHTML
  let parts=msg.split('<br>');
  p.textContent=parts[0];
  if(parts[1]){
    let tip=document.createElement('span');
    tip.style.cssText='font-size:var(--fs-xs2);color:var(--accent);display:block;margin-top:6px;';
    tip.textContent=parts[1].replace(/<[^>]*>/g,''); // strip tag, ambil teks saja
    p.appendChild(tip);
  }
  let btns=document.createElement('div');btns.className='confirm-btns';
  let cancelBtn=document.createElement('button');cancelBtn.className='confirm-cancel';cancelBtn.textContent='Batal';
  let okBtn=document.createElement('button');okBtn.className='confirm-ok';okBtn.textContent=okLabel||'Ya, Lanjutkan';
  btns.appendChild(cancelBtn);btns.appendChild(okBtn);
  box.appendChild(h4);box.appendChild(p);box.appendChild(btns);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  okBtn.onclick=function(){overlay.remove();document.removeEventListener('keydown',_escHandler);if(onOk)onOk();};
  cancelBtn.onclick=function(){overlay.remove();document.removeEventListener('keydown',_escHandler);if(onCancel)onCancel();};
  // BUG 5 FIX: Tutup dialog dengan Escape — sebelumnya user harus klik Batal manual
  function _escHandler(e){if(e.key==='Escape'){overlay.remove();document.removeEventListener('keydown',_escHandler);if(onCancel)onCancel();}}
  document.addEventListener('keydown',_escHandler);
}

function copyText(text,btn){
  let orig=btn.textContent;
  function _onOk(){btn.innerHTML='<svg class="icon"><use href="#ic-check"></use></svg> Tersalin!';btn.style.background='rgba(76,175,125,0.2)';btn.style.color='var(--green)';setTimeout(()=>{btn.textContent=orig;btn.style.background='';btn.style.color='';},2000);}
  function _fallback(){
    // Fallback: textarea trick — bekerja di file://, HTTP, dan browser lama
    let ta=document.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(ta);ta.focus();ta.select();
    try{let ok=document.execCommand('copy');if(ok){_onOk();}else{showToast('Salin manual: '+text,'error');}}
    catch(e){showToast('Salin manual: '+text,'error');}
    document.body.removeChild(ta);
  }
  if(navigator.clipboard&&location.protocol!=='file:'){
    navigator.clipboard.writeText(text).then(_onOk).catch(_fallback);
  } else {
    // file:// protocol — Clipboard API diblokir browser, langsung pakai fallback
    _fallback();
  }
}


// ============================================================
// FOTO JS — REVAMPED
// ============================================================

// STATE
let FS={
  refs:[], refCounter:0,
  povProduk:false, holdLabel:'', povPlacement:'', povCamera:'',
  hasProdukFoto:false,
  subjek:'',
  produkMode:'',
  produkNama:'',
  holdKey:'', hold:'',
  pose:'', poseLabel:'',
  lokasi:'', lokasiLabel:'',
  kamera:'', cahaya:'', cahayaLabel:'',
  angle:'', angleLabel:'',
  mood:'', moodLabel:'',
  conflictLevel:0,
  shotOverrides:{}
};

// TYPE DEFINITIONS
const FTYPE={
  wajah:{
    icon:'',label:'Wajah Karakter',
    extract:'ambil wajah aja',
    ignore:'abaikan seluruh outfit yang dipakai'
  },
  outfit:{
    icon:'',label:'Outfit Lengkap',
    extract:'ambil seluruh outfit yang dipakai',
    ignore:'abaikan WAJAH orang di foto ini (wajah, rambut, warna kulit, bentuk tubuh) — wajah karakter HANYA dari foto Karakter Sheet. Ambil HANYA outfitnya'
  },
  atasan:{
    icon:'',label:'Baju Atasan',
    extract:'pakaian atasan saja — warna, potongan, panjang lengan, gaya kerah, tekstur bahan, motif, panjang baju, detail atau hiasan apapun',
    ignore:'pakaian bawahan, wajah, aksesori lain — ambil HANYA bagian atasan saja'
  },
  bawahan:{
    icon:'',label:'Baju Bawahan',
    extract:'pakaian bawahan saja — rok atau celana, panjang, warna, potongan, tekstur bahan, motif, detail bagian bawah',
    ignore:'atasan, wajah, aksesori — ambil HANYA bagian bawahan saja'
  },
  aksesori:{
    icon:'',label:'Aksesori',
    extract:'aksesori yang spesifik — tas, sepatu, hijab, perhiasan, ikat pinggang; material, warna, bentuk, tekstur, ukuran, semua detail yang membedakannya',
    ignore:'pakaian, wajah — ambil HANYA aksesori yang dimaksud saja'
  },
  produk:{
    icon:'',label:'Produk',
    extract:'produk utama secara detail lengkap — bentuk, warna, ukuran, tekstur, kemasan, semua fitur visual. Logo dan tulisan HANYA jika memang tercetak/tertempel langsung di produknya. Ini adalah produk HERO.',
    ignore:'background, benda-benda di sekitar, dan WAJAH atau orang apa pun di foto ini (jangan tiru wajahnya) — fokus HANYA pada produk utama saja. Abaikan logo, tulisan, watermark, atau teks apapun yang TIDAK berada langsung di/pada produk (misal: logo brand di latar, tulisan di kemasan lain, watermark foto)'
  },
  objek:{
    icon:'',label:'Hewan / Objek',
    extract:'hewan atau objek secara lengkap — bentuk, warna, tekstur, ekspresi (jika hewan), postur, semua detail unik yang membedakannya',
    ignore:'background, orang, benda lain — fokus HANYA pada hewan atau objek ini saja'
  },
  lokasi:{
    icon:'',label:'Lokasi',
    extract:'lokasi saja — arsitektur, properti, benda latar, warna, suasana, dan SELURUH pencahayaan (arah cahaya, suhu warna, kelembutan, kontras, perilaku bayangan)',
    ignore:'orang atau karakter apa pun di foto ini (termasuk WAJAH, rambut, kulit, dan pakaiannya) serta SUDUT KAMERA, ketinggian kamera, sudut pandang, dan framing foto ini — ambil HANYA tempat dan cahayanya'
  },
  pose:{
    icon:'',label:'Pose Referensi',
    extract:'pose tubuh DAN sudut kamera — posisi kepala, arah pandang, posisi tangan dan jari, posisi kaki, postur badan, kemiringan badan, arah hadap, serta sudut kamera, ketinggian kamera, dan sudut pandang foto ini',
    ignore:'WAJAH (wajah hanya dari foto Karakter Sheet), rambut, warna kulit, bentuk tubuh, pakaian, aksesori, latar belakang, pencahayaan, dan semua benda di foto — ambil HANYA pose dan sudut kameranya saja'
  },
  outfit_random:{
    icon:'',label:'Outfit Random',
    extract:'buat outfit lengkap berdasarkan deskripsi pengguna — semua pakaian, warna, tekstur, aksesori, detail styling',
    ignore:'tidak ada — AI akan generate outfit sesuai deskripsi yang diberikan'
  }
};

const FTYPE_FRIENDLY={
  wajah:{
    ambil:'Paras wajah, warna & tekstur kulit, bentuk mata, hidung, bibir',
    abaikan:'Baju, hijab, aksesori — hanya wajah',
    fokus_ph:'cth: 25 tahun'
  },
  outfit:{
    ambil:'Semua yang dipakai — baju, hijab, topi, kacamata, aksesori, sepatu',
    abaikan:'Wajah & identitas model di foto ini — wajah hanya dari Karakter Sheet, AI hanya ikuti outfitnya',
    fokus_ph:'cth: tambahkan aksesoris pada karakter, atau ubah hijab jadi lebih panjang'
  },
  atasan:{
    ambil:'Baju bagian atas — warna, potongan, detail lengan, kerah, bahan',
    abaikan:'Celana/rok, wajah, aksesori lain',
    fokus_ph:'cth: tunik dusty rose lengan panjang'
  },
  bawahan:{
    ambil:'Rok atau celana — panjang, warna, potongan, bahan',
    abaikan:'Atasan, wajah, aksesori lain',
    fokus_ph:'cth: rok plisket sage green panjang'
  },
  aksesori:{
    ambil:'Aksesori yang ditunjuk — tas, sepatu, hijab, perhiasan',
    abaikan:'Pakaian, wajah — fokus hanya ke aksesorinya',
    fokus_ph:'cth: tas tote denim biru, hijab pashmina cream'
  },
  produk:{
    ambil:'Produk utama — bentuk, warna, tekstur, kemasan. Logo/tulisan hanya jika ada di produknya langsung',
    abaikan:'Background, benda lain, wajah/orang di foto ini, logo/watermark yang bukan di produk',
    fokus_ph:'Contoh: Hijab Pashmina Dusty Rose Allia Collection, Mini Bag MRDIA-WHIP pink'
  },
  objek:{
    ambil:'Hewan atau objek — bentuk, warna, ekspresi (jika hewan)',
    abaikan:'Background dan item lain',
    fokus_ph:'cth: kucing putih berbulu lebat, buket mawar merah'
  },
  lokasi:{
    ambil:'Lokasi dan pencahayaannya — arsitektur, properti, warna, suasana, arah & warna cahaya',
    abaikan:'Orang/wajah di foto ini beserta pakaiannya, dan sudut kamera foto ini (sudut kamera dipilih terpisah)',
    fokus_ph:'cth: kamar mewah, cahaya jendela dari samping (boleh dikosongkan)'
  },
  pose:{
    ambil:'Pose tubuh + sudut kamera — posisi kepala, tangan, kaki, postur, arah hadap, tinggi & arah kamera',
    abaikan:'Wajah (hanya dari Karakter Sheet), baju, latar, cahaya, dan semua yang lain di foto',
    fokus_ph:'cth: pose berdiri menyamping, satu tangan di pinggang (boleh dikosongkan)'
  },
  outfit_random:{
    ambil:'Outfit lengkap sesuai deskripsi — warna, bahan, gaya, aksesori',
    abaikan:'Tidak ada — AI generate outfit dari deskripsi',
    fokus_ph:'cth: dress midi sage green floral, casual elegant'
  }
};


// OUTFIT RANDOM MODAL
function fOpenOutfitRandom(){
  // FITUR BARU (permintaan user): Outfit Random (versi "isi sendiri"/AI)
  // juga maksimal 1 kali — sama seperti Wajah/Produk/Objek. Kalau sudah
  // ada outfit_random, modal ini tidak usah dibuka lagi (diam-diam, tanpa
  // toast).
  if(FS.refs.some(function(r){return r.type==='outfit_random';})) return;
  let modal=document.getElementById('outfit-random-modal');
  if(!modal)return;
  document.getElementById('outfit-random-input').value='';
  modal.style.display='flex';
  // TOUR — Langkah 6: sementara tur masih menuntun user isi outfit
  // karakter, teks pembuka & footer modal ini diganti versi yang lebih
  // spesifik ke konteks "karakter sheet". Di luar tur (pbTourF1Active
  // false), teks aslinya dipakai seperti biasa. Lihat pbGoStep6() &
  // pbTourResetF1Ui().
  let descEl=document.getElementById('outfit-random-desc');
  let footEl=document.getElementById('outfit-random-footnote');
  if(pbTourF1Active){
    if(descEl) descEl.textContent='Sekarang isi aja setelan baju apa yang akan dipakai oleh karakter sheet.';
    if(footEl) footEl.textContent='Semakin detail semakin bagus.';
  } else {
    if(descEl) descEl.textContent='Deskripsikan outfit yang kamu inginkan — kami yang buatkan.';
    if(footEl) footEl.textContent='Semakin detail, hasil semakin akurat.';
  }
  setTimeout(()=>document.getElementById('outfit-random-input').focus(),100);
}
function fCloseOutfitRandom(){
  let modal=document.getElementById('outfit-random-modal');
  if(modal)modal.style.display='none';
}
function fConfirmOutfitRandom(){
  let desc=document.getElementById('outfit-random-input').value.trim();
  if(!desc){
    document.getElementById('outfit-random-input').style.borderColor='var(--red)';
    document.getElementById('outfit-random-input').focus();
    showToast('Isi deskripsi outfit dulu!','error');
    return;
  }
  document.getElementById('outfit-random-input').style.borderColor='';
  fCloseOutfitRandom();

  // Cek batas max refs
  if(FS.refs.length>=F_MAX_REFS){
    showToast('Maksimal '+F_MAX_REFS+' foto referensi — hapus salah satu dulu!','error');
    return;
  }

  FS.refCounter++;
  let id='fr'+FS.refCounter;
  let def=FTYPE['outfit_random'];
  // Simpan deskripsi user di field focus
  FS.refs.push({id,type:'outfit_random',focus:desc,extractCustom:def.extract,ignoreCustom:def.ignore});
  fSyncWajahOutfitDefault();
  fUpdateCounters();
  fRenderList();
  fRenderPreview();

  // FIX (mode impor): menambah Outfit Random setelah impor TIDAK boleh memicu reset Step 2-8
  // (fResetFrom(2) mengosongkan seluruh hasil impor). Cukup tambah ref + segarkan Ringkasan, sama seperti fAddRef().
  if(FS.importActive){
    _fSyncImportProdukState();
    if(typeof fRenderSummary==='function') fRenderSummary();
    showToast('Outfit random ditambahkan!','success');
    setTimeout(()=>{let el=document.getElementById('pc-'+id);if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});},150);
    return;
  }

  let f1=document.getElementById('f1');
  if(f1&&f1.classList.contains('done')){
    showConfirm('Menambah foto akan mereset semua pilihan setelah Foto Referensi. Lanjutkan?', function(){
      f1.classList.remove('done','hidden');
      let fa1=document.getElementById('fa1');if(fa1)fa1.textContent='';
      fResetFrom(2);
      showToast('Outfit random ditambah — ulangi dari Step 2 ya','error');
      setTimeout(()=>{let el=document.getElementById('pc-'+id);if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});},150);
    }, function(){
      FS.refs=FS.refs.filter(r=>r.id!==id);
      fSyncWajahOutfitDefault();
      fUpdateCounters();fRenderList();fRenderPreview();
    });
    return;
  }
  showToast('Outfit random ditambahkan!','success');
  setTimeout(()=>{let el=document.getElementById('pc-'+id);if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});},150);
}

// SINKRONISASI DEFAULT AMBIL/ABAIKAN UNTUK FOTO WAJAH (KARAKTER SHEET):
// Kalau user BELUM isi "Isi Outfit Karakter" (tidak ada ref bertipe
// outfit_random) DAN belum upload foto Outfit asli (tidak ada ref
// bertipe outfit), foto wajah TIDAK BOLEH cuma fokus wajah — otomatis
// diubah supaya AI ambil wajah SEKALIGUS outfit yang dipakai di foto
// tersebut (abaikan dikosongkan, karena tidak ada lagi yang perlu
// diabaikan). Begitu outfit sudah tercover oleh salah satu dari
// keduanya (ref outfit_random ATAU ref outfit), dikembalikan ke
// default aslinya (fokus wajah saja, abaikan outfit).
// r.autoSyncOutfit (default true, di-set false begitu user MENGEDIT
// manual textarea ambil/abaikan di kartu foto wajah — lihat fUpdateRef/
// fClearRefField) mencegah fungsi ini menimpa balik hasil edit manual.
function fSyncWajahOutfitDefault(){
  let hasOutfitRandom=FS.refs.some(function(r){return r.type==='outfit_random';});
  let hasOutfitFoto=FS.refs.some(function(r){return r.type==='outfit';});
  let outfitCovered=hasOutfitRandom||hasOutfitFoto;
  FS.refs.forEach(function(r){
    if(r.type!=='wajah'||r.autoSyncOutfit===false)return;
    if(outfitCovered){
      r.extractCustom=FTYPE.wajah.extract;
      r.ignoreCustom=FTYPE.wajah.ignore;
    } else {
      r.extractCustom='ambil semua wajah serta outfit yang dipakai';
      r.ignoreCustom='';
    }
  });
}

// ADD FOTO REF
let _fAddRefLastTimeByType={};
const F_MAX_REFS=8; // FIX #11: batas maksimum foto referensi agar prompt tidak melebihi context limit AI
function fAddRef(typeKey){
  // FITUR BARU (permintaan user): opsi Pose dikunci kalau belum ada foto Karakter (karakter sheet) —
  // tanpa karakter, pose tidak punya subjek yang bisa diberi pose itu.
  if(typeKey==='pose' && FS.importActive && !FS.refs.some(function(r){return r.type==='pose';})){
    showToast('Foto Pose belum bisa dipakai di prompt impor — buat prompt baru dari awal ya.','error');
    return;
  }
  if(typeKey==='pose' && !FS.refs.some(function(r){return r.type==='wajah';}) && !FS.refs.some(function(r){return r.type==='pose';})){
    showToast('Pilih Karakter dulu — Pose hanya bisa dipakai bersama karakter sheet.','error');
    return;
  }
  if(typeKey==='lokasi' && FS.importActive){
    showToast('Foto Lokasi belum bisa dipakai di prompt impor — buat prompt baru dari awal ya.','error');
    return;
  }
  // Debounce: cegah double-tap dalam 400ms — di-scope PER TIPE (bukan global),
  // supaya tap cepat ke tombol tipe foto yang BEDA (mis. Wajah lalu langsung Outfit)
  // tidak ikut ke-debounce dan diam-diam gagal ditambahkan.
  // PERMINTAAN USER (31 Okt 2026): debounce DIMATIKAN — klik 2x secepat apa pun
  // pada chip yang sama = tambah lalu langsung batal. Tidak ada risiko dobel
  // karena tiap tipe foto maksimal 1 (lihat pengecekan di bawah).

  // FITUR BARU (permintaan user): setiap tipe foto (Wajah/Outfit/Produk/
  // Objek) sekarang maksimal 1 kali — tidak ada lagi Wajah 2x, Produk 3x,
  // dst. Kalau tipe ini sudah ada di FS.refs, diam-diam tidak menambahkan
  // apa-apa (tanpa toast/pemberitahuan, karena aturannya memang sekarang
  // "cukup 1 doang" — bukan situasi error yang perlu dijelaskan ke user).
  // PERMINTAAN USER (31 Okt 2026): ketuk lagi chip yang SUDAH dipilih = batal.
  // Foto/kartu tipe itu dihapus lewat jalur yang sama dengan tombol silang (×)
  // (fRemoveRef — termasuk konfirmasi kalau Step 1 sudah selesai). Double-tap
  // kilat juga dihitung batal (tanpa debounce). Berlaku juga selama tur panduan aktif.
  let _fExistingRef=FS.refs.find(function(r){return r.type===typeKey;});
  if(_fExistingRef){
    // PERMINTAAN USER (5 Nov 2026): selama tur pun, ketuk lagi chip yang sudah
    // dipilih (termasuk double-tap cepat) = batal, sama seperti di luar tur.
    fRemoveRef(_fExistingRef.id);
    return;
  }

  // FIX #11: Cegah penambahan foto jika sudah mencapai batas maksimum
  if(FS.refs.length>=F_MAX_REFS){
    showToast('Maksimal '+F_MAX_REFS+' foto referensi — hapus salah satu dulu!','error');
    return;
  }

  FS.refCounter++;
  let id='fr'+FS.refCounter;
  let def=FTYPE[typeKey];
  FS.refs.push({id,type:typeKey,focus:'',extractCustom:def.extract,ignoreCustom:def.ignore,ukuran:'',autoSyncOutfit:true});
  if(typeKey==='produk') FS.hasProdukFoto=true;
  fSyncWajahOutfitDefault();
  fUpdateCounters();
  fRenderList();
  fRenderPreview();
  // FIX BUG KRITIS IMPORT — TAMBAH FOTO MENGHAPUS SELURUH PROMPT DIIMPOR:
  // Card 1 SELALU berstatus 'done' setelah impor (lihat fImportPrompt), jadi
  // tanpa pengecualian ini, nambah 1 foto saja memicu confirm "reset Step
  // 2-8" di bawah — dan kalau diiyakan, fResetFrom(2) mengosongkan TOTAL
  // Produk/Cara Tampil/Pose/Lokasi/Cahaya/Angle/Mood hasil impor (teks
  // lengkap dari JSON yang ditempel, bukan sekadar pilihan chip) — tidak ada
  // jalan balik selain paste ulang JSON dari nol. Logic reset itu memang
  // perlu untuk alur wizard manual (foto baru bisa bikin pose/lokasi lama
  // gak cocok lagi), tapi tidak relevan sama sekali untuk data hasil impor.
  // Untuk mode impor: cukup tambahkan foto & refresh Ringkasan, tanpa reset apa pun.
  if(FS.importActive){
    // FIX SINKRONISASI PRODUK PASCA-IMPOR: lihat komentar di
    // _fSyncImportProdukState() — kalau foto yang baru ditambah tipe
    // 'produk' dan sebelumnya belum ada mode produk aktif, foto ini
    // sekarang benar-benar dijadikan "hero product" (bukan cuma nampang
    // tanpa instruksi apa-apa di hasil generate).
    _fSyncImportProdukState();
    // FIX SINKRONISASI SUBJEK PASCA-IMPOR: jaga-jaga simetris — lihat
    // komentar di _fSyncImportSubjekState().
    if(typeof fRenderSummary==='function') fRenderSummary();
    setTimeout(()=>{let el=document.getElementById('pc-'+id);if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});},150);
    return;
  }
  // FIX: kalau step 1 sudah done, tampilkan konfirmasi dulu sebelum reset progress
  let f1=document.getElementById('f1');
  if(f1&&f1.classList.contains('done')){
    showConfirm('Menambah foto akan mereset semua pilihan setelah Foto Referensi. Lanjutkan?', function(){
      f1.classList.remove('done','hidden');
      let fa1=document.getElementById('fa1');if(fa1)fa1.textContent='';
      fResetFrom(2);
      showToast('Foto ditambah — ulangi dari Step 2 ya','error');
      setTimeout(()=>{let el=document.getElementById('pc-'+id);if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});},150);
    }, function(){
      // User cancel — hapus ref yang baru saja ditambah
      FS.refs=FS.refs.filter(r=>r.id!==id);
      fSyncWajahOutfitDefault();
      FS.hasProdukFoto=FS.refs.some(r=>r.type==='produk');
      fUpdateCounters();fRenderList();fRenderPreview();
    });
    return;
  }
  setTimeout(()=>{let el=document.getElementById('pc-'+id);if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});},150);
}

// FIX SINKRONISASI PRODUK PASCA-IMPOR: dipanggil setiap kali daftar foto
// referensi (FS.refs) berubah — tambah ATAU hapus — selagi mode import
// aktif. Sebelum fix ini, FS.produkMode/FS.produkNama/FS.hold/FS.holdKey/
// FS.importProductBlock cuma diisi SEKALI saat fImportPrompt() jalan dan
// TIDAK PERNAH disentuh lagi oleh fAddRef()/fRemoveRef() (yang di mode
// import sengaja cuma update FS.refs & FS.hasProdukFoto, tanpa reset step
// lain — lihat komentar "BUG KRITIS IMPORT" di fAddRef). Akibatnya:
//   - Hapus SATU-SATUNYA foto produk lewat Step 1 → FS.produkNama/hold/
//     importProductBlock tetap nyangkut dari JSON lama → hasil generate
//     tetap punya blok "product" + kalimat "Hero product: ..." padahal
//     reference_photos sudah tidak ada foto produknya sama sekali
//     (kontradiksi — AI disuruh tampilkan produk tanpa dikasih rupanya).
//   - Tambah foto produk baru (yang sebelumnya tidak ada/di-set "Tidak ada
//     produk") → FS.produkMode tidak pernah ikut ke-set, jadi foto produk
//     nyangkut sebagai reference_photos biasa tanpa pernah dijadikan "hero
//     product" di intro/placement — fotonya keupload tapi instruksinya
//     tidak pernah menyuruh AI menonjolkannya.
// Fungsi ini menyamakan sinkronisasi itu dengan cara yang SAMA seperti jalur
// manual (fPickProduk('tidak') utk kasus dihapus, fF2Next() utk kasus foto
// baru) — supaya state produk selalu cocok dengan foto yang benar-benar ada
// di FS.refs saat ini, bukan snapshot beku dari JSON pertama kali ditempel.
function _fSyncImportProdukState(){
  if(!FS.importActive) return;
  let produkRefsNow = FS.refs.filter(function(r){return r.type==='produk';});
  if(produkRefsNow.length===0){
    // Tidak ada foto produk lagi — hanya bersihkan kalau memang masih ada
    // sisa info produk lama (hindari toast/beban kerja percuma kalau
    // memang dari awal sudah tidak ada produk).
    if(FS.importProdukNoPhoto && FS.importProductBlock){
      // v11.58: produk dari JSON lama memang tanpa foto — jangan dihapus cuma karena user menambah/menghapus foto lain.
    } else if(FS.produkMode || FS.produkNama || FS.importProductBlock || FS.hold || FS.holdKey){
      FS.produkMode='tidak'; FS.produkNama=''; FS.holdKey=''; FS.hold=''; FS.conflictLevel=0;
      FS.importProductBlock=null;
      let b=document.getElementById('f3-conflict-banner');
      if(b){b.className='hidden';b.style.cssText='';b.innerHTML='';}
      // Sama seperti fPickProduk('tidak'): kembalikan ignore_completely foto
      // outfit ke default — instruksi "abaikan [nama produk lama]" yang
      // sempat disuntikkan ke foto outfit (lihat _fRunAIConflictCheck) jadi
      // tidak relevan lagi begitu produknya sendiri sudah dihapus.
      FS.refs.forEach(function(r){if(r.type==='outfit')r.ignoreCustom=FTYPE.outfit.ignore;});
      let c3=document.getElementById('f3');
      if(c3){c3.classList.add('done','hidden');c3.classList.remove('pending');}
      let fa3=document.getElementById('fa3'); if(fa3) fa3.innerHTML='';
      showToast('Foto produk dihapus — info "Cara Tampil Produk" ikut dikosongkan biar tidak nyangkut','error');
    }
  } else {
    FS.importProdukNoPhoto = false; // sekarang produknya punya foto sungguhan
    // Ada foto produk — kalau sebelumnya belum ada mode produk yang valid
    // (baru diset 'tidak', atau memang belum pernah diisi), aktifkan mode
    // 'foto' supaya foto ini beneran dijadikan "hero product", bukan cuma
    // nampang di reference_photos tanpa instruksi apa-apa.
    if(!FS.produkMode || FS.produkMode==='tidak'){
      FS.produkMode='foto';
    }
    // Nama produk selalu disinkron dari kartu foto produk yang ada sekarang
    // (field "focus" di kartu, sama seperti alur manual fF2Next) — supaya
    // kalau user tambah/ganti foto produk, namanya ikut kepakai di hasil
    // generate tanpa harus muter ke Step 2 dulu.
    let freshNames=produkRefsNow.map(function(r){return r.focus?r.focus.trim():'';}).filter(Boolean);
    if(freshNames.length) FS.produkNama=freshNames.join(', ');
  }
}

// FIX SINKRONISASI SUBJEK PASCA-IMPOR (kasus serupa #2 — sebelumnya cuma
// dikasih warning, sekarang di-auto-switch beneran): FS.importIsProdukSaja &
// FS.subjek sebelumnya CUMA ditentukan sekali saat fImportPrompt() jalan
// (dari ada/tidaknya "pose" di JSON lama), lalu dianggap tetap sepanjang
// sesi — padahal user bisa menghapus SEMUA foto karakter (wajah/outfit/
// atasan/bawahan/aksesori/outfit_random) dari Step 1 lewat fRemoveRef.
// Tanpa sync ini, _fBuildImportedPromptJSON tetap menulis "Character pose:
// ..." dan subjek manusia di JSON hasil generate walau tidak ada lagi satu
// pun foto karakter — kontradiksi sejenis dengan bug produk yang sudah
// diperbaiki di _fSyncImportProdukState(). Dipanggil dari fAddRef()/
// fRemoveRef() (mode import) setiap kali FS.refs berubah.

function fRemoveRef(id){
  // FIX BUG KRITIS IMPORT (sama seperti fAddRef di atas): hapus foto pun
  // memicu reset total Step 2-8 kalau Card 1 sudah 'done' — yang untuk
  // prompt hasil impor berarti menghapus seluruh teks Produk/Cara Tampil/
  // Pose/Lokasi/Cahaya/Angle/Mood yang diimpor. Untuk mode impor: hapus
  // foto-nya saja, tanpa reset apa pun.
  if(FS.importActive){
    FS.refs=FS.refs.filter(r=>r.id!==id);
    FS.hasProdukFoto=FS.refs.some(r=>r.type==='produk');
    fSyncWajahOutfitDefault();
    // FIX SINKRONISASI PRODUK PASCA-IMPOR: lihat komentar di
    // _fSyncImportProdukState() — tanpa ini, hapus foto produk lewat sini
    // tidak pernah membersihkan FS.produkNama/hold/importProductBlock.
    _fSyncImportProdukState();
    // FIX SINKRONISASI SUBJEK PASCA-IMPOR: lihat komentar di
    // _fSyncImportSubjekState() — tanpa ini, hapus foto karakter terakhir
    // tidak pernah mengubah prompt jadi mode Produk Saja walau sudah tidak
    // ada satu pun foto karakter yang tersisa.
    fUpdateCounters();fRenderList();fRenderPreview();
    if(typeof fRenderSummary==='function') fRenderSummary();
    return;
  }
  // FIX: kalau step 1 sudah done, tampilkan konfirmasi dulu sebelum hapus dan reset
  let f1=document.getElementById('f1');
  if(f1&&f1.classList.contains('done')){
    showConfirm('Menghapus foto akan mereset semua pilihan setelah Foto Referensi. Lanjutkan?', function(){
      FS.refs=FS.refs.filter(r=>r.id!==id);
      FS.hasProdukFoto=FS.refs.some(r=>r.type==='produk');
      fSyncWajahOutfitDefault();
      fUpdateCounters();fRenderList();fRenderPreview();
      f1.classList.remove('done','hidden');
      let fa1=document.getElementById('fa1');if(fa1)fa1.textContent='';
      fResetFrom(2);
      showToast('Foto dihapus — ulangi dari Step 2 ya','error');
    });
    return;
  }
  FS.refs=FS.refs.filter(r=>r.id!==id);
  FS.hasProdukFoto=FS.refs.some(r=>r.type==='produk');
  fSyncWajahOutfitDefault();
  fUpdateCounters();
  fRenderList();
  fRenderPreview();
}

// FITUR BARU (permintaan user): urutan tampil & urutan di JSON hasil
// generate WAJIB tetap 1) Wajah/Karakter, 2) Outfit (termasuk versi AI/
// outfit_random), 3) Produk/Objek — apa pun urutan asli user menap chip
// di Step 1 (mis. tap "Produk" duluan, baru "Wajah"). Dipakai bareng di
// fRenderList() (nomor F1/F2/F3 yang tampil) dan _fBuildPromptJSON()
// (urutan reference_photos di JSON) supaya keduanya selalu konsisten satu
// sama lain — tidak ada lagi kartu tampil F1=Produk padahal di JSON hasil
// generate fotonya jadi nomor 2. Array.sort JS stabil (ES2015+), jadi
// antar-foto dengan prioritas SAMA tetap sesuai urutan asli (walau sejak
// fitur "1 per tipe" di atas, kasus ini praktis sudah tidak akan terjadi).
function fRefOrderPriority(type){
  if(type==='wajah') return 0;
  if(type==='outfit'||type==='atasan'||type==='bawahan'||type==='aksesori'||type==='outfit_random') return 1;
  if(type==='pose') return 1.5; // foto pose tepat setelah karakter/outfit
  if(type==='lokasi') return 3; // foto lokasi selalu terakhir (karakter → outfit → produk → lokasi)
  return 2; // produk, objek, dan tipe lain
}
function fSortRefsForOrder(refs){
  return refs.slice().sort(function(a,b){
    return fRefOrderPriority(a.type)-fRefOrderPriority(b.type);
  });
}

// Sub-label default per tipe chip (yang butuh foto fisik)
const FCHIP_SUBLABEL={
  wajah:'Punya fotonya di galeri?',
  outfit:'Punya fotonya di galeri?',
  produk:'Punya fotonya di galeri?',
  objek:'Punya fotonya di galeri?',
  lokasi:'Punya fotonya di galeri?',
  pose:'Punya fotonya di galeri?'
};
// Foto Lokasi dilepas padahal step Lokasi/Pencahayaan sudah otomatis terisi "Dari foto lokasi" →
// kosongkan lagi supaya tidak ada sisa label basi di prompt.
function fSyncLokasiSkipState(){
  try{
    if(fHasLokasiRef())return;
    var AUTO='Dari foto lokasi';
    var autoL=(FS.lokasiLabel===AUTO), autoC=(FS.cahayaLabel===AUTO);
    if(!autoL&&!autoC)return;
    if(autoL){FS.lokasi='';FS.lokasiLabel='';FS.lokasiDesc='';}
    if(autoC){FS.cahaya='';FS.cahayaLabel='';FS.cahayaDesc='';try{_fCahaya=null;}catch(e){}}
    ['f5','f7'].forEach(function(id){
      var c=document.getElementById(id);
      if(c){c.classList.remove('done','hidden');c.classList.add('pending');}
      var a=document.getElementById('fa'+id.slice(1));if(a)a.textContent='';
    });
    var ga=document.getElementById('f-gen-area');if(ga)ga.classList.add('hidden');
    if(typeof fSyncStepNums==='function')fSyncStepNums();
  }catch(e){}
}
// FITUR BARU (permintaan user): foto Pose — kunci & sinkronisasi.
// Pose HANYA boleh ada kalau ada foto Karakter (wajah). Karakter dilepas => foto Pose ikut dilepas.
// Pose dilepas padahal step Pose sudah otomatis terisi "Dari foto pose" => kosongkan lagi.
function fHasPoseRef(){
  return !!(FS&&FS.refs&&FS.refs.some(function(r){return r.type==='pose';}));
}
function fSyncPoseState(){
  try{
    let hasChar=FS.refs.some(function(r){return r.type==='wajah';});
    if(!hasChar && FS.refs.some(function(r){return r.type==='pose';})){
      FS.refs=FS.refs.filter(function(r){return r.type!=='pose';});
    }
    if(!fHasPoseRef() && (FS.pose==='Dari foto pose' || String(FS.poseDesc||FS.pose||'').indexOf('the exact body pose shown in reference photo')===0)){
      FS.pose='';FS.poseLabel='';FS.poseDesc='';
      let c4=document.getElementById('f4');
      if(c4){c4.classList.remove('done','hidden');c4.classList.add('pending');}
      let a4=document.getElementById('fa4');if(a4)a4.textContent='';
      if(typeof fSyncStepNums==='function')fSyncStepNums();
    }
    let btn=document.getElementById('ftb-pose');
    if(btn)btn.classList.toggle('pose-locked',(!hasChar && !fHasPoseRef()) || (!!FS.importActive && !fHasPoseRef()));
  }catch(e){}
}
function fUpdateCounters(){
  fSyncLokasiSkipState();
  fSyncPoseState();
  fSyncPoseOutfitOnly();
  Object.keys(FTYPE).forEach(key=>{
    let count=FS.refs.filter(r=>r.type===key).length;
    let badge=document.getElementById('ftc-'+key);
    let btn=document.getElementById('ftb-'+key);
    let sub=document.getElementById('fts-'+key);
    if(badge){
      badge.textContent=count===0?'+':'✓';
    }
    if(btn)btn.classList.toggle('has',count>0);
    if(sub){
      sub.textContent=count===0?((key==='pose' && btn && btn.classList.contains('pose-locked'))?'Pilih karakter dulu':FCHIP_SUBLABEL[key]):'Sudah dipilih';
    }
  });
}

// fRenderPreview — preview bar dihapus di v8, fungsi ini dibiarkan kosong agar call site tidak error
function fRenderPreview(){ /* preview bar removed */ }

// PEMISAH FOTO REFERENSI (opsi A) — label "Pilih bahan foto" di atas kartu bahan + garis pemisah
// "Detail tiap foto" sebelum baris F1–F3. Angka & tampil/sembunyi disinkronkan otomatis lewat
// MutationObserver (isi daftar baris + status chip), jadi fRenderList/fUpdateCounters tidak diubah.
// Detail tiap foto: default cuma kartu Produk yang tampil; kartu lain (Wajah, Outfit, dst)
// disembunyikan sampai user klik panah di judul "Detail tiap foto".
function fToggleF1Details(force){
  let lst=document.getElementById('foto-ref-list');
  if(!lst)return;
  if(force===true)lst.classList.remove('f1-collapsed');
  else if(force===false)lst.classList.add('f1-collapsed');
  else lst.classList.toggle('f1-collapsed');
  fSyncF1Divider();
}
function fSyncF1Divider(){
  let nChips=0;
  document.querySelectorAll('#f1-type-chips .f1chip.has').forEach(c=>{if(c.style.display!=='none')nChips++;});
  let cEl=document.getElementById('f1-chips-count');
  if(cEl)cEl.textContent=nChips?nChips+' dipilih':'';
  let total=document.querySelectorAll('#foto-ref-list .f1-ref-row').length;
  let nFoto=0;
  document.querySelectorAll('#foto-ref-list .f1-ref-num').forEach(el=>{if(/^F/.test(el.textContent.trim()))nFoto++;});
  let d=document.getElementById('f1-divider');
  if(d)d.style.display=total?'flex':'none';
  if(d){
    let hasHidden=!!document.querySelector('#foto-ref-list .f1-ref-row:not([data-type="produk"])');
    d.classList.toggle('f1-has-hidden',hasHidden);
    let lst=document.getElementById('foto-ref-list');
    d.setAttribute('aria-expanded',(lst&&!lst.classList.contains('f1-collapsed'))?'true':'false');
  }
  let dEl=document.getElementById('f1-divider-count');
  if(dEl){dEl.textContent=nFoto;dEl.style.display=nFoto?'':'none';}
}
(function(){
  function init(){
    let chips=document.getElementById('f1-type-chips');
    let list=document.getElementById('foto-ref-list');
    if(!chips||!list||typeof MutationObserver==='undefined')return;
    let mo=new MutationObserver(fSyncF1Divider);
    mo.observe(list,{childList:true});
    mo.observe(chips,{attributes:true,attributeFilter:['class','style'],subtree:true});
    fSyncF1Divider();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

// STRIP FILM FOTO REFERENSI (v12.6) — bingkai F1/F2/F3 di atas pilihan bahan, mengikuti FS.refs.
// Pola sama dengan pemisah di atas: MutationObserver pada #foto-ref-list, jadi fAddRef/fRemoveRef/fRenderList tidak diubah.
// Ketuk bingkai = lompat ke baris detail fotonya; tombol × = fRemoveRef (konfirmasi reset tetap jalan seperti biasa).
var _F1S_ICON={pose:'ic-pose',lokasi:'ic-pin',wajah:'ic-face',outfit:'ic-outfit',produk:'ic-box',objek:'ic-search',outfit_random:'ic-shuffle'};
var _F1S_LABEL={pose:'Pose',lokasi:'Lokasi',wajah:'Wajah',outfit:'Outfit',produk:'Produk',objek:'Objek',outfit_random:'Outfit AI'};
function fStripSync(){
  try{
    let box=document.getElementById('f1-strip-frs');
    if(!box||typeof FS==='undefined'||!FS.refs)return;
    let refs=fSortRefsForOrder(FS.refs),n=0,h='',shown=0;
    refs.forEach(function(r){
      if(!FTYPE[r.type])return;
      let rnd=r.type==='outfit_random';
      if(!rnd)n++;
      shown++;
      let lab=_F1S_LABEL[r.type]||String(FTYPE[r.type].label||'Foto').split(' ')[0];
      h+='<div class="f1s-fr on" data-id="'+r.id+'" role="button" tabindex="0" aria-label="'+lab+', lihat detail">'
        +'<span class="f1s-n">'+(rnd?'AI':'F'+n)+'</span>'
        +'<button type="button" class="f1s-x" data-rm="'+r.id+'" aria-label="Lepas '+lab+'"><i><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg></i></button>'
        +'<svg class="icon"><use href="#'+(_F1S_ICON[r.type]||'ic-outfit')+'"></use></svg><b>'+lab+'</b></div>';
    });
    for(let i=shown;i<3;i++)h+='<div class="f1s-fr"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg><span>kosong</span></div>';
    if(box.dataset.sig===h)return;
    box.dataset.sig=h;
    box.innerHTML=h;
  }catch(e){}
}
(function(){
  function init(){
    let list=document.getElementById('foto-ref-list');
    let strip=document.getElementById('f1-strip');
    if(!list||!strip||typeof MutationObserver==='undefined')return;
    new MutationObserver(fStripSync).observe(list,{childList:true});
    strip.addEventListener('click',function(e){
      let x=e.target.closest('[data-rm]');
      if(x){e.stopPropagation();fRemoveRef(x.getAttribute('data-rm'));return;}
      let fr=e.target.closest('.f1s-fr.on');
      if(fr){let row=document.getElementById('pc-'+fr.getAttribute('data-id'));if(row&&row.getAttribute('data-type')!=='produk')fToggleF1Details(true);if(row)row.scrollIntoView({behavior:'smooth',block:'nearest'});}
    });
    strip.addEventListener('keydown',function(e){
      if(e.key!=='Enter'&&e.key!==' ')return;
      let fr=e.target.closest&&e.target.closest('.f1s-fr.on');
      if(fr&&e.target===fr){e.preventDefault();fr.click();}
    });
    fStripSync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

// RENDER FOTO CARD LIST
function fRenderList(){
  let list=document.getElementById('foto-ref-list');
  let empty=document.getElementById('f1-empty');
  let confirm=document.getElementById('f1-confirm');
  if(!list)return;
  if(FS.refs.length===0){
    list.innerHTML='';
    if(empty)empty.style.display='block';
    if(confirm)confirm.classList.add('hidden');
    fSyncF1EditDoneBtn();
    return;
  }
  if(empty)empty.style.display='none';
  if(confirm)confirm.classList.remove('hidden');

  let _num=0;
  list.innerHTML=fSortRefsForOrder(FS.refs).map(r=>{
    let def=FTYPE[r.type];
    if(!def)return'';
    let friendly=FTYPE_FRIENDLY[r.type];
    let isRandom=r.type==='outfit_random';
    if(!isRandom)_num++;
    let numStr=isRandom?'AI':('F'+_num);
    let isProdukType=r.type==='produk';
    let phText=isProdukType?'Nama produk *wajib':isRandom?r.focus||'Deskripsi outfit':friendly.fokus_ph;
    let hasDetail = !!(r.focus);
    let isWajahOutfit = (r.type==='wajah'||r.type==='outfit');
    // Wajah & outfit: klik kartu foto membuka panel "atur detail" yang berisi
    // Usia (wajah) / Arahan Tertentu (outfit) di ATAS, lalu AMBIL & ABAIKAN
    // di bawahnya — jadi bukan field tunggal lagi, tapi tetap TANPA tombol
    // "atur detail foto" terpisah dan TANPA chip elemen wajah (WAJAH_ELEMEN)
    // yang sudah dihapus sebelumnya. Satu klik pada kartu = buka semuanya.
    let isExpandable = !isProdukType && !isRandom && !isWajahOutfit;
    let isOutfitRandom = r.type === 'outfit_random';
    return `<div class="f1-ref-row${(hasDetail||isOutfitRandom)?' expanded':''}" id="pc-${r.id}" data-type="${r.type}" onclick="fCardClick(event,'${r.id}',${isExpandable})">
      <span class="f1-ref-num">${numStr}</span>
      <span class="f1-ref-type">${def.icon} ${def.label.split(' ')[0]}</span>
      ${isProdukType||isRandom?`
        <div class="f1-ref-input">
          <input class="inp" style="font-size:var(--fs-xs2);padding:5px 8px;" placeholder="${esc(phText)}" value="${esc(r.focus)}" oninput="fUpdateRef('${r.id}','focus',this.value)" onclick="event.stopPropagation()" />
          ${!isRandom?`<button class="f1-adv-toggle" aria-label="Atur detail" onclick="event.stopPropagation();fToggleAdv('${r.id}')"><span id="adv-icon-${r.id}">▾</span></button>
            <div id="adv-area-${r.id}" class="hidden" style="margin-top:8px;padding:8px;background:var(--bg);border-radius:var(--radius-xs);">
              <div style="font-size:var(--fs-2xs);font-weight:500;color:var(--green);margin-bottom:3px;"><svg class="icon"><use href="#ic-check"></use></svg> AMBIL</div>
              <textarea class="desc-ta" style="font-size:var(--fs-xs);min-height:44px;" oninput="fUpdateRef('${r.id}','extractCustom',this.value)" onclick="event.stopPropagation()">${esc(r.extractCustom)}</textarea>
              <div style="font-size:var(--fs-2xs);font-weight:500;color:var(--red);margin:6px 0 3px;"><svg class="icon"><use href="#ic-close"></use></svg> ABAIKAN</div>
              <textarea class="desc-ta red" style="font-size:var(--fs-xs);min-height:44px;" oninput="fUpdateRef('${r.id}','ignoreCustom',this.value)" onclick="event.stopPropagation()">${esc(r.ignoreCustom)}</textarea>
              ${isProdukType?`<div style="font-size:var(--fs-2xs);font-weight:500;color:var(--muted2);margin:6px 0 3px;">UKURAN PRODUK</div><input class="inp" style="font-size:var(--fs-xs);padding:4px 8px;" placeholder="cth: 110x50cm, XL, 250ml" value="${esc(r.ukuran||'')}" oninput="fUpdateRef('${r.id}','ukuran',this.value)" onclick="event.stopPropagation()" />`:''}${'\n'}
            </div>`:''}
        </div>
      `:isWajahOutfit?`
        <!-- Wajah & Outfit (permintaan user): tombol "atur detail" langsung
             kelihatan begitu foto ini ditambahkan di F1 (tidak perlu klik
             kartu dulu, beda dari tipe produk/lain yang tombolnya bernama
             "atur detail foto"). Baru setelah tombol INI diklik, ketiga
             bagian panelnya kelihatan: Usia/Arahan Tertentu di atas, lalu
             AMBIL, lalu ABAIKAN — persis pola adv-area/fToggleAdv yang
             sudah ada, cuma labelnya "atur detail" (param ke-2 fToggleAdv)
             dan isinya nambah field Usia/Arahan di baris paling atas.
             Tidak ada lagi field "nama" generik / chip elemen wajah
             (WAJAH_ELEMEN, sudah dihapus). r.focus = Usia/Arahan (tetap
             jadi obj.detail di JSON); r.extractCustom/ignoreCustom sudah
             prefilled default FTYPE.extract/.ignore sejak fAddRef, dipakai
             utk AMBIL/ABAIKAN. Produk & tipe lain (atasan/bawahan/aksesori/
             objek) TIDAK disentuh — tetap pakai panel lama di bawah. -->
        <div class="f1-ref-input">
          <button class="f1-adv-toggle" aria-label="Atur detail" onclick="event.stopPropagation();fToggleAdv('${r.id}','atur detail')"><span id="adv-icon-${r.id}">▾</span></button>
          <div id="adv-area-${r.id}" class="hidden" style="margin-top:8px;padding:8px;background:var(--bg);border-radius:var(--radius-xs);">
            <div style="font-size:var(--fs-2xs);font-weight:500;color:var(--muted2);margin-bottom:4px;">${r.type==='wajah'?'Usia (opsional)':'Arahan Tertentu (opsional)'}</div>
            ${r.type==='wajah'?`
            <input class="inp" style="font-size:var(--fs-xs2);padding:5px 8px;margin-bottom:8px;" placeholder="${esc(phText)}" value="${esc(r.focus)}" id="detail-input-${r.id}" oninput="fUpdateRef('${r.id}','focus',this.value)" onclick="event.stopPropagation()" />
            `:`
            <textarea class="desc-ta" style="font-size:var(--fs-xs2);min-height:44px;margin-bottom:8px;" placeholder="${esc(phText)}" id="detail-input-${r.id}" oninput="fUpdateRef('${r.id}','focus',this.value)" onclick="event.stopPropagation()">${esc(r.focus)}</textarea>
            `}
            <div style="font-size:var(--fs-2xs);font-weight:500;color:var(--green);margin-bottom:3px;"><svg class="icon"><use href="#ic-check"></use></svg> AMBIL</div>
            <textarea class="desc-ta" style="font-size:var(--fs-xs);min-height:44px;" oninput="fUpdateRef('${r.id}','extractCustom',this.value)" onclick="event.stopPropagation()">${esc(r.extractCustom)}</textarea>
            <div style="font-size:var(--fs-2xs);font-weight:500;color:var(--red);margin:6px 0 3px;"><svg class="icon"><use href="#ic-close"></use></svg> ABAIKAN</div>
            <textarea class="desc-ta red" style="font-size:var(--fs-xs);min-height:44px;" oninput="fUpdateRef('${r.id}','ignoreCustom',this.value)" onclick="event.stopPropagation()">${esc(r.ignoreCustom)}</textarea>
          </div>
        </div>
      `:`
        <div id="detail-expanded-${r.id}" class="f1-ref-input" style="${hasDetail?'':'display:none'}">
          <input class="inp" style="font-size:var(--fs-xs2);padding:5px 8px;" placeholder="${esc(phText)}" value="${esc(r.focus)}" id="detail-input-${r.id}" oninput="fUpdateRef('${r.id}','focus',this.value)" onclick="event.stopPropagation()" />
          <button class="f1-adv-toggle" aria-label="Atur detail" onclick="event.stopPropagation();fToggleAdv('${r.id}')"><span id="adv-icon-${r.id}">▾</span></button>
          <div id="adv-area-${r.id}" class="hidden" style="margin-top:8px;padding:8px;background:var(--bg);border-radius:var(--radius-xs);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;">
              <span style="font-size:var(--fs-2xs);font-weight:500;color:var(--green);"><svg class="icon"><use href="#ic-check"></use></svg> AMBIL</span>
              <button class="tap-target" onclick="event.stopPropagation();fClearRefField('${r.id}','extractCustom','extract-ta-${r.id}')" style="background:none;border:none;color:var(--muted);font-size:var(--fs-2xs);cursor:pointer;padding:2px 4px;">Hapus</button>
            </div>
            <textarea class="desc-ta" id="extract-ta-${r.id}" style="font-size:var(--fs-xs);min-height:44px;" oninput="fUpdateRef('${r.id}','extractCustom',this.value)" onclick="event.stopPropagation()">${esc(r.extractCustom)}</textarea>
            <div style="display:flex;align-items:center;justify-content:space-between;margin:6px 0 3px;">
              <span style="font-size:var(--fs-2xs);font-weight:500;color:var(--red);"><svg class="icon"><use href="#ic-close"></use></svg> ABAIKAN</span>
              <button class="tap-target" onclick="event.stopPropagation();fClearRefField('${r.id}','ignoreCustom','ignore-ta-${r.id}')" style="background:none;border:none;color:var(--muted);font-size:var(--fs-2xs);cursor:pointer;padding:2px 4px;">Hapus</button>
            </div>
            <textarea class="desc-ta red" id="ignore-ta-${r.id}" style="font-size:var(--fs-xs);min-height:44px;" oninput="fUpdateRef('${r.id}','ignoreCustom',this.value)" onclick="event.stopPropagation()">${esc(r.ignoreCustom)}</textarea>
          </div>
        </div>
      `}
      <button class="f1-ref-del tap-target" onclick="event.stopPropagation();fRemoveRef('${r.id}')">×</button>
    </div>`;
  }).join('');
  fSyncF1EditDoneBtn();
}

function fCardClick(e,id,isExpandable){
  if(!isExpandable)return;
  let card=document.getElementById('pc-'+id);
  let expanded=document.getElementById('detail-expanded-'+id);
  let advWrap=document.getElementById('adv-wrap-'+id);
  if(!expanded)return;
  // Kalau sudah expand, klik di luar input/button tidak lakukan apa-apa
  if(card.classList.contains('expanded'))return;
  // Expand
  card.classList.add('expanded');
  card.style.cursor='default';
  expanded.style.display='';
  if(advWrap)advWrap.style.display='';
  let inp=document.getElementById('detail-input-'+id);
  if(inp)setTimeout(()=>inp.focus(),50);
}

function fToggleAdv(id,label){
  label = label || 'atur detail';
  let area=document.getElementById('adv-area-'+id);
  let icon=document.getElementById('adv-icon-'+id);
  let text=document.getElementById('adv-text-'+id);
  if(!area)return;
  let hidden=area.classList.toggle('hidden');
  if(icon)icon.textContent=hidden?'▾':'▴';
  if(text)text.textContent=hidden?label:'sembunyikan';
}

function fUpdateRef(id,key,val){
  let r=FS.refs.find(x=>x.id===id);if(r)r[key]=val;
  // User mengedit manual field ambil/abaikan di kartu foto wajah — jangan
  // ditimpa lagi oleh fSyncWajahOutfitDefault() (lihat definisinya).
  if(r && r.type==='wajah' && (key==='extractCustom'||key==='ignoreCustom')) r.autoSyncOutfit=false;
  // FIX BUG TAMBAHAN (ditemukan saat verifikasi TC3): sebelumnya fUpdateRef
  // cuma menyimpan nilai ke ref-nya sendiri, tanpa pernah memicu
  // _fSyncImportProdukState() — padahal fungsi itulah yang menyalin
  // r.focus jadi FS.produkNama (dibaca baris "Produk" di Ringkasan).
  // Akibatnya: ketik nama produk baru di kartu foto Step 1 pasca-import
  // tidak langsung kelihatan di Ringkasan — baru ke-sync kalau user sempat
  // tambah/hapus foto lain, atau baru pas tombol Generate ditekan (yang
  // punya re-sync sendiri). Sekarang disinkron live tiap ketikan, khusus
  // untuk kartu bertipe 'produk' field 'focus' (nama produk), mode import.
  if(r && r.type==='produk' && key==='focus' && FS.importActive){
    _fSyncImportProdukState();
    if(typeof fRenderSummary==='function') fRenderSummary();
  }
}
function fClearRefField(id,key,taId){
  let r=FS.refs.find(x=>x.id===id);
  if(r){
    r[key]='';
    if(r.type==='wajah' && (key==='extractCustom'||key==='ignoreCustom')) r.autoSyncOutfit=false;
  }
  let ta=document.getElementById(taId);
  if(ta)ta.value='';
}


// STEP NAVIGATION HELPERS

// ─────────────────────────────────────────────────────────────────
// fSetState(patch) — single entry point untuk update FS.
// Semua perubahan state melewati satu titik ini sehingga:
//  • mudah ditambahkan logging / validasi / undo di masa depan
//  • jelas bahwa ini adalah perubahan state yang disengaja
// Contoh: fSetState({pose:'standing', lokasi:'cafe'})
// ─────────────────────────────────────────────────────────────────
function fSetState(patch){
  Object.assign(FS, patch);
  if(FS.subjek==='produk')FS.subjek='';
}

// ─────────────────────────────────────────────────────────────────
// fResetFrom(fromCard) — reset wizard foto dari card tertentu ke bawah.
// fromCard = nomor card: 0=f0(subjek), 1=f1(refs), 2=f2(produk), ...
//
// Sebelumnya fungsi ini hanya bisa mulai dari card 2 (f2). Sekarang
// diperluas ke 0 sehingga fBack1(), fPickSubjek(), fReset() tidak lagi
// perlu menduplikasi logika reset FS secara manual masing-masing.
//
// Panduan pemanggilan:
//   fResetFrom(0) → reset total termasuk subjek (untuk fReset / fBack1)
//   fResetFrom(1) → reset refs dan segalanya di bawah, subjek tetap
//   fResetFrom(2) → reset produk ke bawah, refs & subjek tetap
//   fResetFrom(n) → reset step n ke bawah, step 0..n-1 tetap
// ─────────────────────────────────────────────────────────────────
function fResetFrom(fromCard){
  // Buang juga sisa "step yang ketutup sementara karena lagi diedit" (lihat
  // STEP_PAUSE_STACK) — begitu reset terjadi (baik reset total maupun reset
  // sebagian dari fromCard ke atas), state di baliknya sudah tidak valid lagi.
  // Kalau tidak dibuang, entri lama itu bisa nyangkut dan salah muncul balik
  // (unhide keliru) di sesi edit berikutnya yang sama sekali tidak terkait.
  STEP_PAUSE_STACK.foto=[];
  // --- Hide & undone semua card dari fromCard ke f9 ---
  // FIX BUG "SUBJEK FOTO HILANG SELAMANYA SETELAH RESET": komentar lama di
  // sini bilang "f0 tidak pernah di-hide (selalu visible sebagai starting
  // point)" — itu BENAR untuk kondisi awal render halaman, TAPI begitu user
  // pilih & konfirmasi subjek, doneCard('f0',...) dipanggil, dan doneCard()
  // SELALU menambahkan class 'hidden' di akhir (lihat "SEMBUNYIKAN STEP YANG
  // SUDAH SELESAI" di doneCard) — jadi f0 pun ikut kena 'hidden' begitu
  // selesai diisi, sama seperti f1-f9. Sebelumnya baris di bawah cuma
  // melepas 'hidden' saat i>0 (supaya f0 tidak ikut ditandai 'pending' —
  // itu bagian yang tetap benar), tapi jadi ikut skip pelepasan 'hidden'-nya
  // juga — akibatnya f0 tetap ketutup display:none SELAMANYA setelah reset
  // (tombol "Buat Prompt Foto Baru"/"Buat Prompt Video Baru"), walau semua
  // step lain berhasil kembali ke awal. Sekarang 'hidden' selalu dilepas
  // untuk semua i (termasuk 0), 'pending' saja yang tetap khusus i>0.
  for(let i=fromCard;i<=9;i++){
    let el=document.getElementById('f'+i);
    if(el){el.classList.remove('done','hidden');if(i>0){el.classList.add('pending');}}
    let an=document.getElementById('fa'+i);
    if(an)an.textContent='';
    // Buang sisa tombol "Konfirmasi & Lanjut" kalau ada — step ini sedang direset
    let cb=document.getElementById('f'+i+'-confirmbar');
    if(cb)cb.remove();
    // Kembalikan kolom "isi sendiri" yang sempat disembunyikan supaya
    // cuma 1 tombol konfirmasi yang tampil pas step ini dibuka lagi
    fRestoreCustomBlock(el);
  }

  // --- Reset FS state bertahap sesuai fromCard ---

  // Reset AI conflict container
  let _cc=document.getElementById('ai-conflict-container');
  if(_cc){_cc.style.display='none';_cc.innerHTML='';}
  _aiConflictCache=null;_aiConflictState=null;

  if(fromCard<=0){
    // Step 0: subjek
    fSetState({subjek:''});
    document.querySelectorAll('.subjek-card').forEach(c=>c.classList.remove('sel'));
  }

  if(fromCard<=1){
    // Step 1: foto referensi
    fSetState({refs:[],refCounter:0,hasProdukFoto:false});
    fRenderPreview();
    fRenderList();
    // Bersihkan pose chips (berisi data subjek-spesifik)
    let f4chips=document.getElementById('f4-chips');
    if(f4chips){f4chips.innerHTML='';f4chips._posesData=[];}
    // Reset semua counter badge tipe foto — termasuk outfit_random
    ['wajah','outfit','atasan','bawahan','aksesori','produk','objek','lokasi','pose','outfit_random'].forEach(function(t){
      let el=document.getElementById('ftc-'+t);
      if(el){el.textContent='+';}
      let btn=document.getElementById('ftb-'+t);
      if(btn)btn.classList.remove('has');
    });
    if(typeof fSyncPoseState==='function')fSyncPoseState();
  }

  if(fromCard<=2){
    // Step 2: produk
    fSetState({produkMode:'',produkNama:''});
    document.querySelectorAll('.produk-choice').forEach(c=>c.classList.remove('sel'));
    let pb=document.getElementById('f2-produk-box');if(pb)pb.classList.add('hidden');
    let pi=document.getElementById('f2-produk-input');if(pi)pi.value='';
    fClearProdukError();
  }

  if(fromCard<=3){
    // Step 3: cara tampil produk
    fSetState({holdKey:'',hold:'',conflictLevel:0});
    let banner=document.getElementById('f3-conflict-banner');
    if(banner){banner.className='hidden';banner.style.cssText='';banner.innerHTML='';}
    FS.refs.forEach(function(r){if(r.type==='outfit')r.ignoreCustom=FTYPE.outfit.ignore;});
    document.querySelectorAll('#f3 .chip').forEach(c=>c.classList.remove('sel'));
    let f3c=document.getElementById('f3-custom');if(f3c)f3c.value='';
    let cnt=document.getElementById('f3-counter');if(cnt){cnt.textContent='0 / 300';cnt.className='inp-counter';}
  }

  if(fromCard<=4){
    // Step 4: pose
    fSetState({pose:'',poseLabel:'',poseDesc:''});
    document.querySelectorAll('#f4-chips .pose-card, #f4-chips .chip').forEach(c=>c.classList.remove('sel'));
    let f4c=document.getElementById('f4-custom');if(f4c)f4c.value='';
    let cnt=document.getElementById('f4-counter');if(cnt){cnt.textContent='0 / 300';cnt.className='inp-counter';}
  }

  if(fromCard<=5){
    // Step 5: lokasi
    fSetState({lokasi:'',lokasiLabel:'',lokasiDesc:'',kamera:''});
    document.querySelectorAll('#f5 .chip').forEach(c=>c.classList.remove('sel'));
    let f5c=document.getElementById('f5-custom');if(f5c)f5c.value='';
    let f5ck=document.getElementById('f5-custom-karakter');if(f5ck)f5ck.value='';{let _ckc=document.getElementById('f5-counter-karakter');if(_ckc){_ckc.textContent='0 / 300';_ckc.className='inp-counter';}}
    let cnt=document.getElementById('f5-counter');if(cnt){cnt.textContent='0 / 300';cnt.className='inp-counter';}
  }

  if(fromCard<=6){
    // F6 (Framing) sudah dihapus — reset kamera saja
    fSetState({kamera:''});
  }

  if(fromCard<=7){
    // Step 7: pencahayaan
    fSetState({cahaya:'',cahayaLabel:'',cahayaDesc:''});_fCahaya=null;
    document.querySelectorAll('#f7-cahaya-chips .chip, #f7-cahaya-chips-karakter .chip').forEach(c=>c.classList.remove('sel'));
    let f7c=document.getElementById('f7-custom');if(f7c)f7c.value='';
    let cnt=document.getElementById('f7-counter');if(cnt){cnt.textContent='0 / 300';cnt.className='inp-counter';}
  }

  if(fromCard<=8){
    // Step 8: camera angle
    fSetState({angle:'',angleLabel:'',angleDesc:''});_fAngle=null;
    document.querySelectorAll('#f8 .chip').forEach(c=>c.classList.remove('sel'));
    let f8c=document.getElementById('f8-custom');if(f8c)f8c.value='';
    let cnt8=document.getElementById('f8-counter');if(cnt8){cnt8.textContent='0 / 300';cnt8.className='inp-counter';}
  }

  if(fromCard<=9){
    // Step 9: mood
    fSetState({mood:'',moodLabel:''});
    document.querySelectorAll('#f9 .chip').forEach(c=>c.classList.remove('sel'));
    let f9c=document.getElementById('f9-custom');if(f9c)f9c.value='';
    let cnt9=document.getElementById('f9-counter');if(cnt9){cnt9.textContent='0 / 300';cnt9.className='inp-counter';}
  }

  // Sembunyikan area generate & output (selalu, karena state di bawah sudah tidak valid)
  let ga=document.getElementById('f-gen-area');if(ga)ga.classList.add('hidden');
  let ow=document.getElementById('f-json-output');if(ow)ow.style.display='none';
}

function fBackTo(curr,prev){
  // Sembunyikan dan undone SEMUA card dari curr ke atas (bukan hanya curr)
  // Ini mencegah dua card muncul sekaligus jika state tidak sinkron
  let allCards=['f0','f1','f2','f3','f4','f5','f7','f8','f9'];
  let currIdx=allCards.indexOf('f'+curr);
  if(currIdx>=0){
    for(let i=currIdx;i<allCards.length;i++){
      let el=document.getElementById(allCards[i]);
      if(el){el.classList.remove('done');el.classList.remove('hidden');el.classList.add('pending');}
    }
  }
  // Sync FS state sesuai card yang di-back
  let cardNum=parseInt(curr,10);
  if(!isNaN(cardNum)) fResetFrom(cardNum);
  // Buka previous card (undone agar bisa diedit lagi)
  let c=document.getElementById('f'+prev);
  if(c){c.classList.remove('done','hidden','pending');setTimeout(()=>c.scrollIntoView({behavior:'smooth',block:'nearest'}),100);}
}

// STEP 0: PILIH SUBJEK
const SUBJEK_LABELS={hijab:'Perempuan',pria:'Laki-laki'};

function fPickSubjek(val,el){
  if(val!=='hijab'&&val!=='pria')return;
  document.querySelectorAll('.subjek-card').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel');
  // FIX (permintaan user, Sept 2026): badge "Sedang membuat 'prompt' untuk
  // foto AI..." (#f0-tour-process-badge) sekarang juga tampil DI LUAR tur,
  // begitu user memilih salah satu kartu Subjek Foto — bukan cuma selama
  // tur (yang munculnya lewat pbGoStep5()). Aman dipanggil dua kali (tur
  // & di sini) karena cuma set display:flex, tidak saling bentrok.
  let f0ProcessBadgeOutsideTour=document.getElementById('f0-tour-process-badge');
  if(f0ProcessBadgeOutsideTour) f0ProcessBadgeOutsideTour.style.display='flex';
  if(window.pstPreview)pstPreview('f0','subjek',val);
  fShowConfirm('f0', el, function(){ _fSubjekAdvance(val); });
}

// Lanjutkan ke step 1 (Foto Referensi) setelah subjek dikonfirmasi — dipakai
// baik oleh pilihan baru (fPickSubjek) maupun oleh subjek yang DIPULIHKAN
// setelah user klik "← Kembali" dari step 1 (lihat fBack1 di bawah).
function _fSubjekAdvance(val){
  fSetState({subjek:val});
  fResetFrom(1);
  doneCard('f0','fa0',SUBJEK_LABELS[val]);
  fSyncStepNums();
  fToggleF1Panel();
  fUpdateProgress(1,'Foto Referensi');
  showCard('f1');
  // FIX (dilaporkan user): dulu transisi ke tampilan f1 versi tur
  // (Langkah 6) cuma jalan lewat pbArmDoneWait('f0',...) yang sekali
  // pakai — jadi tidak pernah terpanggil ulang kalau subjek dikonfirmasi
  // ulang setelah user pencet "← Kembali" (fBack1). Sekarang, selama
  // sesi Langkah 5+6 masih berjalan (pbTourStep56Active), setup tur f0→f1
  // ini SELALU dijalankan ulang di sini — baik untuk konfirmasi pertama
  // maupun konfirmasi ulang sesudah "← Kembali" — supaya tampilannya
  // selalu konsisten (badge "+" Outfit, chip Objek disembunyikan, label
  // "Karakter Sheet", dst.) dan tidak "berubah lagi" secara tidak terduga.
  if(pbTourStep56Active){
    pbTourResetF0Ui();
    pbGoStep6();
  }
}

// FIX (permintaan user): dulu fBack1() memanggil fResetFrom(0) yang
// menghapus TOTAL pilihan Subjek Foto (FS.subjek jadi kosong, highlight
// kartu Perempuan/Laki-laki/Produk Saja ikut lepas begitu user klik
// "← Kembali" dari step Foto Referensi) — pemula yang cuma mau lihat-lihat
// lagi jadi dipaksa pilih ulang dari nol, dan kalau sebelumnya sempat pilih
// "Produk Saja", tampilan panelnya bisa nyangkut/membingungkan karena tidak
// ada apa-apa yang di-highlight lagi. Sekarang: simpan pilihan sebelumnya
// DULU sebelum reset, lalu begitu f0 dibuka lagi, kartu yang tadi dipilih
// langsung di-highlight ulang + tombol "Konfirmasi & Lanjut" langsung
// tersedia (fShowConfirm) — user tinggal tap itu kalau memang tidak mau
// ganti pilihan, atau tap kartu lain kalau mau ganti (jalur fPickSubjek
// normal tetap jalan seperti biasa dan akan menimpa ini).
function fBack1(){
  let prevSubjek=FS.subjek;
  fResetFrom(0);
  let f0=document.getElementById('f0');
  if(f0)f0.classList.remove('done','hidden','pending');
  fUpdateProgress(0,'Subjek Foto');
  let selMap={hijab:'sk-hijab',pria:'sk-pria'};
  let selId=selMap[prevSubjek];
  let selEl=selId?document.getElementById(selId):null;
  // Jangan pulihkan kalau kartunya lagi dikunci (mis. "Produk Saja" selama
  // tur panduan) — biarkan f0 polos tanpa highlight, sama seperti sebelum
  // fix ini, daripada memaksa pilihan yang memang tidak boleh dipakai saat ini.
  if(selEl && !selEl.classList.contains('pb-locked')){
    selEl.classList.add('sel');
    let f0ProcessBadgeBack=document.getElementById('f0-tour-process-badge');
    if(f0ProcessBadgeBack) f0ProcessBadgeBack.style.display='flex';
    if(window.pstPreview)pstPreview('f0','subjek',prevSubjek);
    fShowConfirm('f0', selEl, function(){ _fSubjekAdvance(prevSubjek); });
  }
  // FIX (dilaporkan user): selama sesi tur Langkah 5+6 masih berjalan, klik
  // "← Kembali" dari f1 ke f0 dulu menampilkan deskripsi versi BIASA (teks
  // default Subjek Foto), bukan versi tur ("untuk membuat si karakter
  // memegang/memakai produk kita butuh prompt ..."). Penyebab: waktu subjek
  // dikonfirmasi, _fSubjekAdvance() memanggil pbTourResetF0Ui() yang
  // mengembalikan teks & tampilan f0 ke default, lalu fBack1() ini cuma
  // membuka kembali f0 tanpa memasang ulang versi tur-nya. Jalur lain yang
  // membuka ulang f0 (fRestoreStepUI(0)) sudah memanggil pbGoStep5() lagi —
  // sekarang jalur "← Kembali" ini disamakan.
  if(typeof pbTourStep56Active!=='undefined' && pbTourStep56Active && typeof pbGoStep5==='function'){
    pbGoStep5();
  }
  setTimeout(()=>f0&&f0.scrollIntoView({behavior:'smooth',block:'nearest'}),100);
}


// Placeholder kolom custom Lokasi (mode "Produk Saja" sudah dihapus, jadi cuma versi karakter).
function fToggleF1Panel(){
  let f5inp=document.getElementById('f5-custom');
  if(f5inp)f5inp.placeholder='Contoh: Taman Nasional Komodo, Pantai Ora Maluku...';
}

// Custom lokasi untuk mode karakter (panel normal)
function fPickLokasiCustomKarakter(){
  let inp=document.getElementById('f5-custom-karakter');
  if(!inp)return;
  let val=inp.value.trim();
  if(!val){showToast('Isi lokasi dulu!','error');return;}
  fPickLokasiCustomHandler(val); // label 'Custom' di-set oleh handler
}
// Handler bersama untuk custom lokasi
function fPickLokasiCustomHandler(val){
  FS.lokasi=val;
  FS.lokasiLabel='Custom';
  FS.lokasiDesc=val;
  doneCard('f5','fa5',val.substring(0,35)+(val.length>35?'…':''));
  if(FS.importActive){_fImportBackToSummary();return;} // FIX IMPOR: tidak cascade ke step lain
  // kamera tidak di-set di sini — user pilih di step framing
  // FIX EDIT MODE — cek f7+f8+f9 sudah done
  let _f7DoneLCH=document.getElementById('f7')?.classList.contains('done');
  let _f8DoneLCH=document.getElementById('f8')?.classList.contains('done');
  let _f9DoneLCH=document.getElementById('f9')?.classList.contains('done');
  if(_f7DoneLCH&&FS.cahaya&&_f8DoneLCH&&FS.angle&&_f9DoneLCH&&FS.mood){
    let _gaLCH=document.getElementById('f-gen-area');
    if(_gaLCH){_gaLCH.classList.remove('hidden');fRunAIConflictCheck(true);}
    setTimeout(()=>_gaLCH.scrollIntoView({behavior:'smooth',block:'nearest'}),150);
  } else {
    _fCahaya=null;FS.cahaya='';FS.cahayaLabel='';
    document.querySelectorAll('#f7-cahaya-chips .chip, #f7-cahaya-chips-karakter .chip').forEach(c=>c.classList.remove('sel'));
    let f7inp=document.getElementById('f7-custom');if(f7inp)f7inp.value='';
    _fAngle=null;FS.angle='';FS.angleLabel='';
    document.querySelectorAll('#f8-normal-panel .chip').forEach(c=>c.classList.remove('sel'));
    fSetState({mood:'',moodLabel:''});
    document.querySelectorAll('#f9 .chip').forEach(c=>c.classList.remove('sel'));
    fUpdateProgress(7,'Pencahayaan');
    showCard('f7');
    setTimeout(fApplyCahayaContext, 200);
  }
}

// STEP 1 KONFIRM
function fKonfirmRef(){
  // Hapus summary-edit-done-btn jika ada
  let _sedb=document.getElementById('summary-edit-done-btn');if(_sedb)_sedb.remove();
  if(!FS.subjek){showToast('Pilih subjek foto dulu di langkah pertama!','error');return;}
  if(FS.refs.length===0){showToast('Pilih minimal 1 foto dulu!','error');return;}
  // FIX (permintaan user): SELAMA versi sederhana tur step 1 aktif
  // (pbTourF1Active — chip "Wajah" berlabel "Karakter Sheet", lihat
  // pbGoStep6()), sebelumnya user bisa tap "Karakter Sheet" doang lalu
  // langsung "Selesai — Lanjut →" (validasi di atas cuma minta minimal 1
  // foto APAPUN). Sekarang, KHUSUS selama tur ini, wajib ada refs bertipe
  // 'wajah' (Karakter Sheet) DAN 'produk' sebelum boleh lanjut — supaya
  // user benar-benar mengisi kedua bahan yang diminta di hint ("Tap bahan
  // yang udah disiapkan, yaitu: karakter sheet dan produk."), bukan
  // cuma salah satu. Di luar sesi tur ini (wizard normal), aturan lama
  // (minimal 1 foto apapun) TETAP berlaku seperti biasa — supaya alur
  // normal (mis. subjek 'produk'/Produk Saja yang memang tidak butuh
  // Wajah) tidak ikut terkunci.
  if(typeof pbTourF1Active!=='undefined' && pbTourF1Active){
    let _hasKS=FS.refs.some(function(r){return r.type==='wajah';});
    let _hasProdukTour=FS.refs.some(function(r){return r.type==='produk';});
    // PERMINTAAN USER: di tur pun boleh lanjut cuma dengan "Produk" + "Lokasi"
    // (tanpa Karakter Sheet). Kalau Karakter Sheet dipakai, tetap wajib bareng Produk.
    let _noCharTour=(typeof fIsNoChar==='function') && fIsNoChar();
    if(!_hasProdukTour || (!_hasKS && !_noCharTour)){
      showToast('Tap "Produk" dan "Karakter Sheet" dulu, atau "Produk" + "Lokasi" saja ya!','error');
      return;
    }
  }

  // WAJIB KARAKTER SHEET: kalau subjek Perempuan/Laki-laki, user tidak boleh
  // lanjut hanya dengan foto Produk atau Outfit. Harus ada foto Karakter Sheet
  // (tipe 'wajah') dulu. Subjek 'produk' (Produk Saja) tidak kena aturan ini.
  // Mode import dilewati supaya prompt lama yang diimpor tidak ikut terkunci.
  if(FS.subjek && FS.subjek!=='produk' && !FS.importActive && !fIsNoChar() && !fIsOutfitOnly()){
    if(!FS.refs.some(function(r){return r.type==='wajah';})){
      showToast('Pilih "Karakter Sheet" dulu, atau pilih "Outfit" saja, atau "Produk" + "Lokasi" saja ya!','error');
      return;
    }
  }

  // FIX IMPORT: dalam mode import, Foto Referensi cuma field yang berdiri
  // sendiri diakses dari Ringkasan — bukan bagian dari alur wizard
  // f1→f2→f3→f4 yang saling nyambung. Jangan jalankan logic cascading
  // pindah ke step lain (itu punya wizard normal); cukup simpan & kembali
  // ke Ringkasan.
  if(FS.importActive){
    let typesImp=[...new Set(fSortRefsForOrder(FS.refs).map(r=>FTYPE[r.type]?FTYPE[r.type].label:r.type))];
    doneCard('f1','fa1', FS.refs.length+' foto ('+typesImp.join(', ')+')');
    let gaImp=document.getElementById('f-gen-area');
    if(gaImp){gaImp.classList.remove('hidden');fRunAIConflictCheck(true);}
    setTimeout(function(){if(gaImp)gaImp.scrollIntoView({behavior:'smooth',block:'nearest'});},150);
    return;
  }

  // Urutan label ini pun disamakan (Wajah/Outfit/Produk) supaya badge
  // ringkasan "2 foto (...)" tidak beda urutan dari nomor F1/F2/F3 di atasnya.
  let types=[...new Set(fSortRefsForOrder(FS.refs).map(r=>FTYPE[r.type].label))];
  let summary=FS.refs.length+' foto ('+types.join(', ')+')';
  doneCard('f1','fa1',summary);

  // ── MODE PRODUK SAJA: skip f2 (produk), f3 (cara tampil), f4 (pose) ──────
  if(FS.subjek==='produk'){
    // Ambil nama produk dari foto produk jika ada — wajib ada minimal 1
    let produkRefs=FS.refs.filter(r=>r.type==='produk');
    if(produkRefs.length===0){
      showToast('Tambahkan minimal 1 foto produk!','error');
      let c1=document.getElementById('f1');if(c1)c1.classList.remove('done','hidden');
      let a1=document.getElementById('fa1');if(a1)a1.textContent='';
      return;
    }
    let allNames=produkRefs.map(r=>r.focus?r.focus.trim():'').filter(n=>n);
    if(produkRefs.some(function(r){return !r.focus||!r.focus.trim();})){
      // Highlight input nama produk yang kosong
      let emptyRefs=produkRefs.filter(r=>!r.focus||!r.focus.trim());
      let firstScrollTarget=null;
      emptyRefs.forEach(function(ref){
        let cardEl=document.getElementById('pc-'+ref.id);
        if(cardEl){
          let inp=cardEl.querySelector('input.inp');
          if(inp){
            inp.style.borderColor='var(--red)';inp.style.boxShadow='0 0 0 2px rgba(224,92,92,0.2)';
            let errId='pc-err-'+ref.id;
            if(!document.getElementById(errId)){
              let errEl=document.createElement('div');errEl.id=errId;
              errEl.style.cssText='font-size:var(--fs-xs2);color:var(--red);margin-top:5px;font-weight:500;';
              errEl.textContent='Nama produk wajib diisi';
              inp.insertAdjacentElement('afterend',errEl);
            }
            inp.addEventListener('input',function(){inp.style.borderColor='';inp.style.boxShadow='';let e=document.getElementById(errId);if(e)e.remove();},{once:true});
            if(!firstScrollTarget)firstScrollTarget=inp;
          }
        }
      });
      if(firstScrollTarget){setTimeout(()=>firstScrollTarget.scrollIntoView({behavior:'smooth',block:'center'}),100);firstScrollTarget.focus();}
      showToast('Isi nama produk di semua foto produk dulu!','error');
      let c1=document.getElementById('f1');if(c1)c1.classList.remove('done','hidden');
      let a1=document.getElementById('fa1');if(a1)a1.textContent='';
      return;
    }
    // Set state produk saja
    FS.produkMode='foto';
    FS.produkNama=allNames.join(', ');
    FS.pose=''; // tidak ada pose karakter
    // Skip f2, f3, f4 — mark semua done otomatis
    doneCard('f2','fa2','Produk saja · '+FS.produkNama);
    // f3 dan f4 tidak ada step-nya di mode ini
    // FIX NOMOR STEP GANDA: F3 & F4 sama sekali tidak relevan di mode
    // "Produk Saja" (bukan cuma di-skip nilainya, tapi step-nya sendiri
    // tidak ada di alur ini — lihat fCardToStep/fTotalSteps untuk subjek
    // 'produk'). Sebelumnya cuma ditandai 'done' tapi tetap ditampilkan
    // sebagai bar kosong dengan badge angka statis (mis. "3") yang bentrok
    // sama badge step lain yang dihitung ulang otomatis (mis. Lokasi jadi
    // "3" juga). Sembunyikan total (bukan cuma bersihkan teksnya) supaya
    // tidak pernah muncul di daftar sama sekali & tidak ada nomor bentrok.
    let c3=document.getElementById('f3');if(c3){c3.classList.add('done','hidden');c3.classList.remove('pending');}
    let c4=document.getElementById('f4');if(c4){c4.classList.add('done','hidden');c4.classList.remove('pending');}
    fSyncStepNums();
    fUpdateProgress(5,'Lokasi');
    // Framing khusus produk saja — overhead/flat lay atau close-up produk
    FS.kamera='product placed on a clean surface or held up close to camera, filling majority of frame, no person visible, product sharp and detailed';
    // Reset f5, f7, f8 agar bersih
    FS.lokasi='';FS.cahaya='';FS.angle='';
    let f5c=document.getElementById('f5');if(f5c)f5c.classList.remove('done','hidden','pending');
    showCard('f5');
    return;
  }

  // ── MODE NORMAL (ada karakter): flow lama ────────────────────────────────
  fUpdateProgress(2,'Produk');
  if(FS.hasProdukFoto){
    let produkRefs=FS.refs.filter(r=>r.type==='produk');
    let allNames=produkRefs.map(r=>r.focus?r.focus.trim():'').filter(n=>n);
    let produkNama=allNames.join(', ');
    if(produkRefs.some(function(r){return !r.focus||!r.focus.trim();})){
      let emptyRefs=produkRefs.filter(r=>!r.focus||!r.focus.trim());
      let firstScrollTarget=null;
      emptyRefs.forEach(function(ref){
        let cardEl=document.getElementById('pc-'+ref.id);
        if(cardEl){
          let inp=cardEl.querySelector('input.inp');
          if(inp){
            inp.style.borderColor='var(--red)';inp.style.boxShadow='0 0 0 2px rgba(224,92,92,0.2)';
            let errId='pc-err-'+ref.id;
            if(!document.getElementById(errId)){
              let errEl=document.createElement('div');errEl.id=errId;
              errEl.style.cssText='font-size:var(--fs-xs2);color:var(--red);margin-top:5px;font-weight:500;';
              errEl.textContent='Nama produk wajib diisi sebelum lanjut';
              inp.insertAdjacentElement('afterend',errEl);
            }
            inp.addEventListener('input',function(){inp.style.borderColor='';inp.style.boxShadow='';let e=document.getElementById(errId);if(e)e.remove();},{once:true});
            if(!firstScrollTarget)firstScrollTarget=inp;
          }
        }
      });
      if(firstScrollTarget){setTimeout(()=>firstScrollTarget.scrollIntoView({behavior:'smooth',block:'center'}),100);firstScrollTarget.focus();}
      showToast('Isi nama produk di semua foto produk dulu!','error');
      let c1=document.getElementById('f1');if(c1)c1.classList.remove('done','hidden');
      let a1=document.getElementById('fa1');if(a1)a1.textContent='';
      return;
    }
    FS.produkMode='foto';FS.produkNama=produkNama;
    doneCard('f2','fa2','Dari foto produk · '+produkNama);
    fSyncStepNums();
    fUpdateProgress(3,'Cara Tampil');
    showCard('f3');
  } else {
    // Tidak ada foto produk — skip f2 & f3, set produkMode='tidak', langsung pose
    FS.produkMode='tidak';FS.produkNama='';FS.holdKey='';FS.hold='';
    // STEP 2 (PRODUK) DIHAPUS TOTAL DARI FLOW: sebelumnya di sini dipanggil
    // doneCard('f2','fa2','Tidak ada produk') — itu bikin f2 kecatat 'done'
    // sehingga nongol sebagai entri "Step 2: Tidak ada produk" di daftar
    // "Lompat ke Step" & Ringkasan, padahal Pose di bawah ini JUGA memakai
    // nomor slot 2 (lihat fUpdateProgress(2,'Pose')) — bikin dobel/bentrok
    // dan membingungkan. Sekarang f2 sengaja TIDAK PERNAH ditandai 'done'
    // sama sekali kalau user tidak upload foto produk, jadi tidak pernah
    // muncul di mana pun lagi. FS.produkMode di atas tetap otomatis 'tidak'.
    // FIX NOMOR STEP GANDA ("3" muncul dobel di F3 & Pose): F3 tidak
    // relevan sama sekali saat "tidak ada produk" — Pose otomatis jadi
    // step ke-3 (lihat fCardToStep). Sebelumnya F3 cuma ditandai 'done'
    // tapi tetap DITAMPILKAN sebagai bar dengan badge angka statis "3"
    // (dan kadang jawaban lama yang nyangkut/stale dari pilihan
    // sebelumnya), bentrok dengan badge Pose yang juga jadi "3". Sembunyikan
    // total (bukan cuma bersihkan teksnya) supaya F3 tidak pernah muncul
    // saat memang tidak relevan, dan nomor tidak pernah bentrok lagi.
    let fa3clr=document.getElementById('fa3');if(fa3clr)fa3clr.innerHTML='';
    let c3=document.getElementById('f3');if(c3){c3.classList.add('done','hidden');c3.classList.remove('pending');}
    fSyncStepNums();
    fUpdateProgress(4,'Pose');
    fBuildPoseChips();
    showCard('f4');
  }
}

// STEP 2: PRODUK (dihapus dari flow aktif)
function fPickProduk(val,el){
  document.querySelectorAll('.produk-choice').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel');
  if(val==='tidak'){
    // SATU TOMBOL KONFIRMASI SAJA: kalau sebelumnya user sempat pilih
    // "Ada produk" (box nama produk + tombol "Konfirmasi →"-nya kelihatan),
    // lalu ganti pikiran pilih "Tidak ada produk" — box itu harus langsung
    // disembunyikan SEKARANG (bukan nunggu bar "Konfirmasi & Lanjut →" ini
    // ditap), supaya tidak ada 2 tombol konfirmasi kelihatan bersamaan.
    let boxNow=document.getElementById('f2-produk-box');
    if(boxNow)boxNow.classList.add('hidden');
    fShowConfirm('f2', el, function(){
      FS.produkMode=val;
      let box=document.getElementById('f2-produk-box');
      box.classList.add('hidden');
      doneCard('f2','fa2','Tidak ada produk khusus');
      FS.produkNama='';
      FS.holdKey='';FS.hold='';FS.conflictLevel=0;
      let b=document.getElementById('f3-conflict-banner');
      if(b){b.className='hidden';b.style.cssText='';b.innerHTML='';}
      FS.refs.forEach(function(r){if(r.type==='outfit')r.ignoreCustom=FTYPE.outfit.ignore;});
      // FIX NOMOR STEP GANDA: sama seperti di fKonfirmRef() — F3 tidak
      // relevan saat "tidak ada produk", jadi sembunyikan total (bukan
      // cuma bersihkan teksnya) supaya badge angkanya (statis "3") tidak
      // pernah bentrok dengan badge Pose yang dihitung ulang otomatis.
      let fa3clrt=document.getElementById('fa3');if(fa3clrt)fa3clrt.innerHTML='';
      let c3t=document.getElementById('f3');if(c3t){c3t.classList.add('done','hidden');c3t.classList.remove('pending');}
      // Reset hanya step 4 (pose) karena step 3 di-skip — step 5,6,7 tetap
      FS.pose='';FS.poseLabel='';FS.poseDesc='';
      document.querySelectorAll('#f4-chips .pose-card, #f4-chips .chip').forEach(c=>c.classList.remove('sel'));
      fBuildPoseChips();
      // FIX EDIT MODE — bug: sebelum ini fungsi selalu paksa showCard('f4')
      // walau user datang dari tombol "Edit" di Ringkasan, jadi Ringkasan
      // (f-gen-area) yang sudah di-hide oleh fSummaryEdit() tidak pernah
      // dimunculkan lagi kecuali user menyelesaikan ulang seluruh wizard dari
      // step Pose. Sekarang: kalau step-step setelah Pose (f5 Lokasi) sudah
      // pernah selesai — berarti ini edit dari Ringkasan / hasil import, bukan
      // alur baru — langsung balik ke Ringkasan. Pose yang di-reset di atas
      // akan otomatis kelihatan sebagai "Pose belum dipilih" di Ringkasan,
      // jadi user tetap diingatkan untuk pilih ulang lewat tombol Edit di baris
      // Pose, tanpa Ringkasan hilang begitu saja.
      let _f5DoneT=document.getElementById('f5')?.classList.contains('done');
      if((_f5DoneT&&FS.lokasi)||FS.importActive){
        let _gaT=document.getElementById('f-gen-area');
        if(_gaT){_gaT.classList.remove('hidden');fRunAIConflictCheck(true);}
        setTimeout(()=>{if(_gaT)_gaT.scrollIntoView({behavior:'smooth',block:'nearest'});},150);
      } else {
        fUpdateProgress(4,'Pose');
        showCard('f4');
      }
    });
  } else {
    FS.produkMode=val;
    let box=document.getElementById('f2-produk-box');
    box.classList.remove('hidden');
    // SATU TOMBOL KONFIRMASI SAJA: kalau sebelumnya sempat pilih "Tidak ada
    // produk" (bar "Konfirmasi & Lanjut →" kelihatan) lalu ganti pikiran ke
    // "Ada produk" — buang bar itu sekarang, box nama produk (dengan tombol
    // "Konfirmasi →"-nya sendiri) yang jadi satu-satunya tombol aktif.
    let oldBar=document.getElementById('f2-confirmbar');
    if(oldBar)oldBar.remove();
    // FIX BUG TERSEMBUNYI (ditemukan saat audit menyeluruh): kalau user
    // SEBELUMNYA pernah pilih "pegang" dan sudah menyelesaikan F3 (Cara
    // Tampil Produk — done, ada isinya), lalu balik ke sini dan ganti pilih
    // "dipakai" — val di sini jadi 'dipakai', yang TIDAK butuh F3 sama
    // sekali. Tanpa fix ini, FS.holdKey/FS.hold dan class 'done' di F3
    // tetap nyangkut dari pilihan 'pegang' sebelumnya. Akibatnya:
    // 1) F3 tetap kelihatan (visible+stale) padahal sudah tidak relevan.
    // 2) fKonfirmProdukManual() salah kira F3 "sudah pernah beres" (karena
    //    _f3Done && FS.holdKey masih true dari sesi 'pegang' lama) dan
    //    langsung lompat ke Ringkasan tanpa validasi ulang, TANPA pernah
    //    memperbaiki nomor step/visibility F3 yang sudah salah itu.
    // Reset semua sisa state 'pegang' begitu user pilih opsi selain 'pegang'
    // di sini, supaya F3 langsung disembunyikan & bersih sebelum konfirmasi.
    if(val!=='pegang'){
      let f3ei=document.getElementById('f3');
      if(f3ei&&f3ei.classList.contains('done')){
        f3ei.classList.remove('done');
        f3ei.classList.add('hidden');
        let fa3ei=document.getElementById('fa3');if(fa3ei)fa3ei.innerHTML='';
        document.querySelectorAll('#f3 .chip').forEach(c=>c.classList.remove('sel'));
      }
      FS.holdKey='';FS.hold='';FS.conflictLevel=0;
      let bnrei=document.getElementById('f3-conflict-banner');
      if(bnrei){bnrei.className='hidden';bnrei.style.cssText='';bnrei.innerHTML='';}
      // FIX BUG TERSEMBUNYI #2 (audit step2/3): reset di atas tidak pernah
      // mengembalikan r.ignoreCustom foto Outfit ke default, padahal teks
      // "PENGECUALIAN: abaikan <nama produk lama>..." yang disuntik saat
      // mode 'pegang' aktif (lihat fPickHoldConfirmed/fPickHoldCustom) tetap
      // nyangkut walau user sudah pindah ke mode lain (mis. 'dipakai') yang
      // konteksnya beda total (outfit & produk yang dipakai seharusnya
      // saling melengkapi, bukan saling exclude). Cabang val==='tidak' di
      // atas sudah benar melakukan reset ini — disamakan di sini.
      FS.refs.forEach(function(r){if(r.type==='outfit')r.ignoreCustom=FTYPE.outfit.ignore;});
    }
    fSyncCardEditDoneBtn('f2', true);
  }
}

function fKonfirmProdukManual(){
  let input=document.getElementById('f2-produk-input');
  let val=input.value.trim();
  if(!val){
    input.style.borderColor='var(--red)';
    input.style.boxShadow='0 0 0 2px rgba(224,92,92,0.2)';
    document.getElementById('f2-produk-error').style.display='block';
    document.getElementById('f2-produk-hint').style.display='none';
    input.focus();
    return;
  }
  FS.produkNama=val;
  let label=FS.produkMode==='dipakai'?'Dipakai di badan':'Dipegang/ditunjuk';
  doneCard('f2','fa2',label+' · '+val);
  // FIX EDIT MODE
  let _f3Done = document.getElementById('f3')?.classList.contains('done');
  if(_f3Done && FS.holdKey){
    // Edit mode: f3 sudah selesai — langsung kembali ke gen-area
    // FIX BUG TERSEMBUNYI #1 (audit step2/3): sebelum ini, lompat langsung
    // ke Ringkasan TANPA pernah menghitung ulang ignoreCustom foto Outfit —
    // jadi kalau nama produk baru saja diganti di atas (FS.produkNama=val),
    // instruksi ignore yang dikirim ke JSON tetap menyebut nama produk LAMA
    // dari sesi Step 3 sebelumnya. Panggil helper di bawah untuk
    // menyegarkan ignoreCustom + banner Step 3 memakai FS.holdKey/FS.hold
    // yang sudah tersimpan tapi FS.produkNama yang sudah terbaru.
    fRefreshOutfitConflict();
    let _ga = document.getElementById('f-gen-area');
    if(_ga){ _ga.classList.remove('hidden');  fRunAIConflictCheck(true); }
    setTimeout(()=>_ga.scrollIntoView({behavior:'smooth',block:'nearest'}),150);
  } else {
    // Alur baru: reset f3 dan lanjut
    FS.holdKey='';FS.hold='';FS.conflictLevel=0;
    document.querySelectorAll('#f3 .chip').forEach(c=>c.classList.remove('sel'));
    if(FS.produkMode==='pegang'){
      fUpdateProgress(3,'Cara Pegang');
      showCard('f3');
    } else {
      // FIX NOMOR STEP GANDA (kasus serupa): kalau user sebelumnya sempat
      // pilih "pegang" (F3 terisi & jadi 'done'), lalu balik ke F2 dan
      // ganti ke "dipakai di badan" — F3 sudah tidak relevan untuk mode
      // ini juga. Sembunyikan supaya tidak nyangkut kelihatan dengan
      // jawaban/badge lama.
      let c3d=document.getElementById('f3');
      if(c3d&&c3d.classList.contains('done')){c3d.classList.add('hidden');let fa3d=document.getElementById('fa3');if(fa3d)fa3d.innerHTML='';}
      FS.pose='';FS.poseLabel='';FS.poseDesc='';
      document.querySelectorAll('#f4-chips .pose-card, #f4-chips .chip').forEach(c=>c.classList.remove('sel'));
      fUpdateProgress(4,'Pose');
      fBuildPoseChips();
      showCard('f4');
    }
  }
}

function fClearProdukError(){
  let input=document.getElementById('f2-produk-input');
  input.style.borderColor='';
  input.style.boxShadow='';
  document.getElementById('f2-produk-error').style.display='none';
  document.getElementById('f2-produk-hint').style.display='block';
}

// STEP 3: CARA TAMPIL PRODUK
const HOLD_MAP={
  dipakai:{val:'dipakai langsung oleh karakter',label:'Dipakai langsung'},
  hanger:{val:'sudah terpasang pada hanger',label:'Pakai hanger — ke kamera'},
  tangan:{val:'memperlihatkan produk ke kamera',label:'Dipegang — ke kamera'}
};

// Keyword deteksi konflik — level 1: pakaian & aksesori yang dipakai langsung
const F3_KEYWORDS_STRONG=[
  // Hijab & headwear
  'jilbab','hijab','kerudung','khimar','niqab','ciput','dalaman','pashmina','pasmina','scarf','veil','mukena','tudung','dupatta',
  // Pakaian atas
  'gamis','abaya','kaftan','tunik','tunic','blouse','baju','kemeja','kaos','dress','midi dress','maxi dress','mini dress',
  // Pakaian bawah & full body
  'rok','celana','legging','overall','jumpsuit','jumpskirt',
  // Layer / outer
  'cardigan','jaket','jacket','blazer','coat','outer','bolero','vest','rompi',
  // Headwear non-hijab
  'topi','cap','beanie','beret','bandana','scrunchie','headband',
  // Alas kaki
  'sepatu','sandal','sneaker','heels','boots','wedges','selop','flatshoes','flat shoes','mule',
  // Aksesori badan
  'kalung','gelang','cincin','anting','bros','brooch','belt','ikat pinggang','kacamata','sunglasses',
  // Inner / manset
  'manset','inner','undershirt','dalaman manset',
  // Busana daerah & formal
  'baju kurung','kebaya','batik','sarung','kain',
  // Sizing & generik yang sering dipakai sebagai nama produk
  'set','setelan','co-ord','coord',
  // FIX: Tambahan English fashion terms yang sering dipakai nama produk Indonesia
  'top','shirt','tee','polo','hoodie','sweater','sweatshirt','pants','skirt','shorts','trousers',
  'outerwear','kimono','poncho','cape','shawl','wrap','sarong','palazzo','culottes','flare',
  'slip dress','shirt dress','wrap dress','shift dress','bodycon','bodysuit','loungewear',
  'tracksuit','jogger','sweatpants','cargo','denim','jeans','chino','linen','crinkle','jersey',
  'ootd','outfit','attire','garment','clothing','apparel','fashion','wear','pakaian','busana'
];
// Keyword level 2: aksesori genggam/sandang
const F3_KEYWORDS_SOFT=[
  'tas','bag','tote','clutch','pouch','dompet','handbag','backpack','ransel','sling','tote bag',
  'crossbody','shoulder bag','mini bag','bucket bag','beltbag','belt bag','fanny pack',
  // FIX: Tambahan jenis tas bahasa Inggris yang sering ada di nama brand Indonesia
  'totebag','wristlet','wallet','purse','sachet','case','holder','strap','chain bag','hobo bag'
];

// FIX: deteksi "dipakai" yang tidak salah kena "tidak dipakai" / "pakaian" / "footwear".
function _fImpliesWorn(text){
  let t=String(text||'').toLowerCase();
  if(/\b(?:tidak|nggak|enggak|gak|ga|bukan|jangan|tanpa)\s+(?:di)?pakai(?:kan)?\b/.test(t)) return false;
  if(/\b(?:not|never|no)\s+(?:be\s+)?(?:worn|wear|wearing)\b/.test(t)) return false;
  return /\b(?:di)?pakai(?:kan)?\b/.test(t)||/\bworn\b/.test(t)||/\bwear(?:s|ing)?\b/.test(t);
}
function fDetectConflictLevel(produkNama){
  if(!produkNama) return 0;
  let lower=produkNama.toLowerCase();
  // FIX: buang kata umum yang cuma kebetulan memuat kata kunci (dinner->inner, address/dressing->dress, wheels->heels, sandalwood->sandal, router->outer)
  lower=lower.replace(/(?:^|[^a-z0-9])(?:dinner|address|dressing|wheels|sandalwood|router)[a-z]*/g,' ');
  // FIX A4: whole-word matching untuk keyword ≤4 karakter agar tidak false-positive pada nama brand
  // Contoh: "top" dalam "MRDIA-WHIP top" → match, tapi "topling" → tidak match
  function matchKeyword(text,kw){
    if(kw.length<=4){
      // Cek sebagai whole word (dikelilingi non-alfanumerik atau di tepi string)
      let re=new RegExp('(?:^|[^a-z0-9])'+kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:[^a-z0-9]|$)');
      return re.test(text);
    }
    return text.includes(kw);
  }
  for(let i=0;i<F3_KEYWORDS_STRONG.length;i++){if(matchKeyword(lower,F3_KEYWORDS_STRONG[i]))return 1;}
  for(let i=0;i<F3_KEYWORDS_SOFT.length;i++){if(matchKeyword(lower,F3_KEYWORDS_SOFT[i]))return 2;}
  return 0;
}

// FIX BUG POSE HANGER NYANGKUT: saat user edit "Cara Tampil Produk" dari
// Ringkasan (mis. Pakai hanger -> Dipakai langsung), cabang "edit mode" di
// fPickHoldConfirmed/fPickHoldCustom langsung balik ke Ringkasan TANPA
// menyentuh pose. Padahal teks pose hasil pilihan chip ikut berubah sesuai
// cara tampil (mis. "holding hanger toward camera, product on hanger...").
// Akibatnya prompt baru berisi placement "worn directly on the character"
// SEKALIGUS "Character pose: ... holding hanger ..." -> hasil foto masih
// ada hanger dipegang. Fungsi ini menyelaraskan pose dengan cara tampil baru:
// pose preset diganti ke padanannya (indeks sama: Berdiri/Duduk/Condong...),
// pose custom yang menyebut "hanger" dibuang & user diminta pilih ulang.
// Return true = pose aman/sudah disesuaikan; false = pose direset (pilih ulang).
function _fSyncPoseToHold(prevKey,newKey){
  if(typeof fHasPoseRef==='function'&&fHasPoseRef()) return true; // pose dari foto referensi, tidak terikat cara tampil
  let cur=String(FS.poseDesc||FS.pose||'').trim();
  if(!cur) return true;
  let all=POSES_WITH_PRODUK[FS.subjek||'hijab']||POSES_WITH_PRODUK.hijab;
  let newList=all[newKey]||all.dipakai;
  if(!newList) return true;
  if(newList.some(function(p){return String(p[0]).trim()===cur;})) return true;
  let keys=Object.keys(all);
  if(prevKey && all[prevKey]) keys=[prevKey].concat(keys.filter(function(k){return k!==prevKey;}));
  let hit=null;
  for(let ki=0;ki<keys.length&&!hit;ki++){
    let list=all[keys[ki]];
    for(let i=0;i<list.length;i++){
      if(String(list[i][0]).trim()===cur){hit={idx:i};break;}
    }
  }
  if(hit){
    let eq=newList[hit.idx];
    if(!eq) return false;
    FS.pose=eq[1]; FS.poseLabel=eq[1]; FS.poseDesc=eq[0];
    let fa4=document.getElementById('fa4'); if(fa4) fa4.textContent=eq[1];
    return true;
  }
  // pose custom / hasil impor: buang hanya kalau menyebut hanger padahal bukan mode hanger
  if(newKey!=='hanger' && /hanger/i.test(cur)) return false;
  return true;
}

// FIX IMPOR: setelah satu step diedit di mode impor, JANGAN lanjut membuka step berikutnya
// (Pose/Lokasi/Cahaya/dst). Cukup simpan lalu kembali ke Ringkasan + Generate.
function _fImportBackToSummary(){
  let ga=document.getElementById('f-gen-area');
  if(ga){ga.classList.remove('hidden');try{fRunAIConflictCheck(true);}catch(e){}}
  try{if(typeof fRenderSummary==='function')fRenderSummary();}catch(e){}
  setTimeout(function(){if(ga)ga.scrollIntoView({behavior:'smooth',block:'nearest'});},150);
}
function fPickHold(key,el,label){
  document.querySelectorAll('#f3 .chip').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel');
  if(window.pstPreview)pstPreview('f3','holdKey',key);
  fShowConfirm('f3', el, function(){ fPickHoldConfirmed(key,label); });
}
function fPickHoldConfirmed(key,label){
  let h=HOLD_MAP[key]||{val:key,label:label};
  if(key==='tangan' && typeof fIsNoChar==='function' && fIsNoChar()) h={val:'tangan memegang produk, sudut pandang POV (orang pertama)',label:'Dipegang tangan (POV)'};
  let _prevHoldKey=FS.holdKey;
  FS.hold=h.val; FS.holdKey=key;

  let banner=document.getElementById('f3-conflict-banner');
  let hasOutfitFoto=FS.refs.some(r=>r.type==='outfit');

  // FIX A8: selalu reset banner dulu di semua branch agar tidak ada banner sisa dari pilihan sebelumnya
  banner.className='hidden';
  banner.style.cssText='';
  banner.innerHTML='';
  FS.conflictLevel=0;
  // Reset ignore outfit ke default dulu
  FS.refs.forEach(function(r){if(r.type==='outfit')r.ignoreCustom=FTYPE.outfit.ignore;});

  // Deteksi konflik hanya saat user pilih "dipakai ke karakter"
  if(key==='dipakai' && hasOutfitFoto){
    let level=fDetectConflictLevel(FS.produkNama);
    if(level===1){
      // Strong warning — item fashion langsung
      banner.className='';
      banner.style.cssText='margin-top:14px;border-radius:var(--radius-md);padding:12px 14px;line-height:1.65;font-size:var(--fs-sm);background:rgba(255,255,255,0.05);border:1px solid var(--border);color:var(--text);';
      banner.innerHTML='<div style="font-size:var(--fs-sm);font-weight:600;color:var(--warning);margin-bottom:5px;">Potensi Konflik Terdeteksi</div>'
        +'Produk <strong style="color:var(--accent);">'+esc(FS.produkNama)+'</strong> kemungkinan sudah muncul di <strong>foto Outfit Lengkap</strong>. '
        +'Kami sudah mengatur prompt untuk memprioritaskan foto produk, namun hasilnya tidak 100% dijamin konsisten karena kedua foto tetap dibaca sekaligus.'
        +'<div style="margin-top:8px;font-size:var(--fs-xs2);color:var(--muted);">Tips: Pastikan foto produk menampilkan item dengan jelas, detail, dan tanpa gangguan visual lain.</div>';
      // Inject instruksi ignore ke foto outfit
      FS.refs.forEach(function(r){
        if(r.type==='outfit'){
          r.ignoreCustom='wajah model — ambil HANYA outfit dan semua yang dikenakan di tubuh. PENGECUALIAN: abaikan '+FS.produkNama+' yang ada di foto ini — item tersebut akan diambil dari foto referensi produk yang khusus.';
        }
      });
      FS.conflictLevel=1;
    } else if(level===2){
      // Soft info — tas/aksesori genggam
      banner.className='';
      banner.style.cssText='margin-top:14px;border-radius:var(--radius-md);padding:12px 14px;line-height:1.65;font-size:var(--fs-sm);background:var(--surface3);border:1px solid var(--border);color:var(--muted);';
      banner.innerHTML='<div style="font-size:var(--fs-sm);font-weight:600;color:var(--text);margin-bottom:5px;">Info</div>'
        +'Produk <strong style="color:var(--text);">'+esc(FS.produkNama)+'</strong> akan ditampilkan sebagai aksesori yang dibawa karakter. '
        +'Pastikan foto produk cukup jelas dan detail agar bisa direproduksi dengan akurat.';
      FS.conflictLevel=2;
    }
    // level===0: banner sudah di-clear di atas, tidak perlu lakukan apa-apa
  }
  // key !== 'dipakai': banner sudah di-clear dan ignore outfit sudah di-reset di atas

  doneCard('f3','fa3',h.label);
  if(FS.importActive){ // FIX IMPOR: tidak cascade ke step lain; tapi pose lama yang tidak cocok dengan cara tampil baru tetap dibuang
    if(FS.pose && !_fSyncPoseToHold(_prevHoldKey,key)){
      FS.pose='';FS.poseLabel='';FS.poseDesc='';
      let _fa4=document.getElementById('fa4');if(_fa4)_fa4.textContent='';
      showToast('Cara tampil berubah — pose lama dibuang, isi ulang lewat Edit di Ringkasan','info');
    }
    _fImportBackToSummary();return;
  }
  // FIX EDIT MODE
  let _f4Done = document.getElementById('f4')?.classList.contains('done');
  let _f5Done = document.getElementById('f5')?.classList.contains('done');
  if(_f4Done && FS.pose && _f5Done && FS.lokasi && !_fSyncPoseToHold(_prevHoldKey,key)){
    // Pose lama tidak cocok dengan cara tampil baru — reset & minta pilih ulang
    FS.pose='';FS.poseLabel='';FS.poseDesc='';
    document.querySelectorAll('#f4-chips .pose-card, #f4-chips .chip').forEach(c=>c.classList.remove('sel'));
    let f4cinpE=document.getElementById('f4-custom');if(f4cinpE)f4cinpE.value='';
    fUpdateProgress(4,'Pose');
    fBuildPoseChips();
    showCard('f4');
    showToast('Cara tampil berubah — pilih ulang pose ya','info');
  } else if(_f4Done && FS.pose && _f5Done && FS.lokasi){
    let _ga2 = document.getElementById('f-gen-area');
    if(_ga2){ _ga2.classList.remove('hidden');  fRunAIConflictCheck(true); }
    setTimeout(()=>_ga2.scrollIntoView({behavior:'smooth',block:'nearest'}),150);
  } else {
    FS.pose='';FS.poseLabel='';FS.poseDesc='';
    document.querySelectorAll('#f4-chips .pose-card, #f4-chips .chip').forEach(c=>c.classList.remove('sel'));
    let f4cinp=document.getElementById('f4-custom');if(f4cinp)f4cinp.value='';
    fUpdateProgress(4,'Pose');
    fBuildPoseChips();
    showCard('f4');
  }
}

function fPickHoldCustom(){
  let val=document.getElementById('f3-custom').value.trim();
  if(!val){showToast('Isi cara tampil produk dulu!','error');return;}
  document.querySelectorAll('#f3 .chip').forEach(c=>c.classList.remove('sel'));
  let _prevHoldKeyC=FS.holdKey;
  FS.hold=val;
  FS.holdKey='custom';
  // FIX: Jalankan conflict detection untuk input custom juga
  // Cek apakah teks custom mengandung kata kunci "dipakai/worn/wear"
  let banner=document.getElementById('f3-conflict-banner');
  let hasOutfitFoto=FS.refs.some(r=>r.type==='outfit');
  let customLower=val.toLowerCase();
  let impliesWorn=_fImpliesWorn(customLower);
  if(impliesWorn && hasOutfitFoto && FS.produkNama){
    let level=fDetectConflictLevel(FS.produkNama);
    if(level===1){
      banner.className='';
      banner.style.cssText='margin-top:14px;border-radius:var(--radius-md);padding:12px 14px;line-height:1.65;font-size:var(--fs-sm);background:rgba(255,255,255,0.05);border:1px solid var(--border);color:var(--text);';
      banner.innerHTML='<div style="font-size:var(--fs-sm);font-weight:600;color:var(--warning);margin-bottom:5px;">Potensi Konflik Terdeteksi</div>'
        +'Produk <strong style="color:var(--accent);">'+esc(FS.produkNama)+'</strong> kemungkinan sudah muncul di <strong>foto Outfit Lengkap</strong>. '
        +'Kami sudah mengatur prompt untuk memprioritaskan foto produk, namun hasilnya tidak 100% dijamin konsisten.'
        +'<div style="margin-top:8px;font-size:var(--fs-xs2);color:var(--muted);">Tips: Pastikan foto produk menampilkan item dengan jelas dan tanpa gangguan visual lain.</div>';
      FS.refs.forEach(function(r){
        if(r.type==='outfit'){
          r.ignoreCustom='wajah model — ambil HANYA outfit dan semua yang dikenakan di tubuh. PENGECUALIAN: abaikan '+FS.produkNama+' yang ada di foto ini — item tersebut akan diambil dari foto referensi produk yang khusus.';
        }
      });
      FS.conflictLevel=1;
    } else {
      banner.className='hidden';banner.style.cssText='';banner.innerHTML='';
      FS.conflictLevel=0;
    }
  } else {
    // Custom teks tidak menunjukkan "dipakai" — reset banner & ignore rule ke default
    banner.className='hidden';banner.style.cssText='';banner.innerHTML='';
    FS.conflictLevel=0;
    FS.refs.forEach(function(r){if(r.type==='outfit')r.ignoreCustom=FTYPE.outfit.ignore;});
  }
  doneCard('f3','fa3','Custom — '+val.substring(0,40)+(val.length>40?'…':''));
  if(FS.importActive){ // FIX IMPOR: tidak cascade ke step lain; tapi pose lama yang tidak cocok dengan cara tampil baru tetap dibuang
    if(FS.pose && !_fSyncPoseToHold(_prevHoldKeyC,'custom')){
      FS.pose='';FS.poseLabel='';FS.poseDesc='';
      let _fa4=document.getElementById('fa4');if(_fa4)_fa4.textContent='';
      showToast('Cara tampil berubah — pose lama dibuang, isi ulang lewat Edit di Ringkasan','info');
    }
    _fImportBackToSummary();return;
  }
  // FIX EDIT MODE
  let _f4DoneC = document.getElementById('f4')?.classList.contains('done');
  let _f5DoneC = document.getElementById('f5')?.classList.contains('done');
  if(_f4DoneC && FS.pose && _f5DoneC && FS.lokasi && !_fSyncPoseToHold(_prevHoldKeyC,'custom')){
    FS.pose='';FS.poseLabel='';FS.poseDesc='';
    document.querySelectorAll('#f4-chips .pose-card, #f4-chips .chip').forEach(c=>c.classList.remove('sel'));
    let f4cinpE2=document.getElementById('f4-custom');if(f4cinpE2)f4cinpE2.value='';
    fUpdateProgress(4,'Pose');
    fBuildPoseChips();
    showCard('f4');
    showToast('Cara tampil berubah — pilih ulang pose ya','info');
  } else if(_f4DoneC && FS.pose && _f5DoneC && FS.lokasi){
    let _ga3 = document.getElementById('f-gen-area');
    if(_ga3){ _ga3.classList.remove('hidden');  fRunAIConflictCheck(true); }
    setTimeout(()=>_ga3.scrollIntoView({behavior:'smooth',block:'nearest'}),150);
  } else {
    FS.pose='';FS.poseLabel='';FS.poseDesc='';
    document.querySelectorAll('#f4-chips .pose-card, #f4-chips .chip').forEach(c=>c.classList.remove('sel'));
    let f4custinp=document.getElementById('f4-custom');if(f4custinp)f4custinp.value='';
    fUpdateProgress(4,'Pose');
    fBuildPoseChips();
    showCard('f4');
  }
}

// FIX BUG TERSEMBUNYI #1 (audit step2/3): fPickHoldConfirmed/fPickHoldCustom
// menyuntik r.ignoreCustom (foto Outfit) dengan teks yang menyebut
// FS.produkNama secara eksplisit, tapi teks itu di-generate SEKALI SAJA saat
// Step 3 dikonfirmasi. Kalau user balik ke Step 2 lewat "Edit" di Ringkasan
// dan ganti nama produk saja (tanpa mengulang Step 3 — karena
// fKonfirmProdukManual sengaja skip Step 3 di edit-mode), ignoreCustom lama
// jadi basi/stale: masih menyebut nama produk LAMA, padahal Ringkasan &
// product.name sudah tampil nama BARU. Ini ikut kebawa ke ignore_completely
// di JSON final yang dikirim ke AI generator.
//
// Fungsi ini MENIRU PERSIS logika konflik yang sudah ada di
// fPickHoldConfirmed (untuk key!=='custom') dan fPickHoldCustom (untuk
// key==='custom') — sengaja diduplikasi, bukan me-refactor fungsi asli,
// supaya alur normal (pilih chip di Step 3 langsung) tidak tersentuh sama
// sekali dan risiko regresi nol. Dipanggil HANYA dari titik edit-mode di
// fKonfirmProdukManual, memakai FS.holdKey/FS.hold yang sudah tersimpan
// dari pilihan Step 3 sebelumnya + FS.produkNama yang sudah diperbarui.
function fRefreshOutfitConflict(){
  if(!FS.holdKey) return; // Step 3 belum pernah diisi — tidak ada apa-apa untuk direfresh
  let banner=document.getElementById('f3-conflict-banner');
  let hasOutfitFoto=FS.refs.some(r=>r.type==='outfit');

  // Reset dulu ke kondisi default/hidden (sama seperti awal fPickHoldConfirmed)
  if(banner){banner.className='hidden';banner.style.cssText='';banner.innerHTML='';}
  FS.conflictLevel=0;
  FS.refs.forEach(function(r){if(r.type==='outfit')r.ignoreCustom=FTYPE.outfit.ignore;});

  function injectIgnore(){
    FS.refs.forEach(function(r){
      if(r.type==='outfit'){
        r.ignoreCustom='wajah model — ambil HANYA outfit dan semua yang dikenakan di tubuh. PENGECUALIAN: abaikan '+FS.produkNama+' yang ada di foto ini — item tersebut akan diambil dari foto referensi produk yang khusus.';
      }
    });
  }
  function showBannerLevel1(desc1,desc2){
    if(!banner)return;
    banner.className='';
    banner.style.cssText='margin-top:14px;border-radius:var(--radius-md);padding:12px 14px;line-height:1.65;font-size:var(--fs-sm);background:rgba(255,255,255,0.05);border:1px solid var(--border);color:var(--text);';
    banner.innerHTML='<div style="font-size:var(--fs-sm);font-weight:600;color:var(--warning);margin-bottom:5px;">Potensi Konflik Terdeteksi</div>'
      +'Produk <strong style="color:var(--accent);">'+esc(FS.produkNama)+'</strong> kemungkinan sudah muncul di <strong>foto Outfit Lengkap</strong>. '
      +desc1+desc2;
  }

  if(FS.holdKey==='custom'){
    // Sama seperti fPickHoldCustom: cek FS.hold (teks custom) mengandung kata "dipakai/worn/wear/pakai"
    let customLower=(FS.hold||'').toLowerCase();
    let impliesWorn=_fImpliesWorn(customLower);
    if(impliesWorn && hasOutfitFoto && FS.produkNama){
      let level=fDetectConflictLevel(FS.produkNama);
      if(level===1){
        showBannerLevel1('Kami sudah mengatur prompt untuk memprioritaskan foto produk, namun hasilnya tidak 100% dijamin konsisten.','<div style="margin-top:8px;font-size:var(--fs-xs2);color:var(--muted);">Tips: Pastikan foto produk menampilkan item dengan jelas dan tanpa gangguan visual lain.</div>');
        injectIgnore();
        FS.conflictLevel=1;
      }
    }
  } else if(FS.holdKey==='dipakai' && hasOutfitFoto){
    // Sama seperti fPickHoldConfirmed: hanya key 'dipakai' yang dicek konflik
    let level=fDetectConflictLevel(FS.produkNama);
    if(level===1){
      showBannerLevel1('Kami sudah mengatur prompt untuk memprioritaskan foto produk, namun hasilnya tidak 100% dijamin konsisten karena kedua foto tetap dibaca sekaligus.','<div style="margin-top:8px;font-size:var(--fs-xs2);color:var(--muted);">Tips: Pastikan foto produk menampilkan item dengan jelas, detail, dan tanpa gangguan visual lain.</div>');
      injectIgnore();
      FS.conflictLevel=1;
    } else if(level===2){
      if(banner){
        banner.className='';
        banner.style.cssText='margin-top:14px;border-radius:var(--radius-md);padding:12px 14px;line-height:1.65;font-size:var(--fs-sm);background:var(--surface3);border:1px solid var(--border);color:var(--muted);';
        banner.innerHTML='<div style="font-size:var(--fs-sm);font-weight:600;color:var(--text);margin-bottom:5px;">Info</div>'
          +'Produk <strong style="color:var(--text);">'+esc(FS.produkNama)+'</strong> akan ditampilkan sebagai aksesori yang dibawa karakter. '
          +'Pastikan foto produk cukup jelas dan detail agar bisa direproduksi dengan akurat.';
      }
      FS.conflictLevel=2;
    }
  }
  // holdKey==='hanger' atau 'tangan': di kode asli memang tidak pernah ada
  // pengecekan konflik untuk key ini — dibiarkan sama (sudah direset ke
  // default+hidden di atas).
}

// STEP 4: POSE
// STEP 4: POSE — per subjek
const POSES_WITH_PRODUK={
  hijab:{
    dipakai:[
      ['berdiri dan produk dipakai oleh karakter','Berdiri'],
      ['duduk dan produk sudah dipakai oleh karakter','Duduk'],
      ['Berdiri sambil menjelaskan produk ke kamera','Berdiri menjelaskan'],
      ['Duduk sambil menjelaskan produk ke kamera','Duduk menjelaskan'],
      ['sudut selfie close-up, ponsel tidak terlihat di dalam frame','Selfie — pegang kamera'],
      ['selfie cermin sambil berdiri','Mirror Selfie Berdiri'],
    ],
    hanger:[
      ['berdiri dan memegang hanger ke arah kamera, produk di hanger menghadap lensa','Berdiri'],
      ['duduk dan memegang hanger terulur ke arah kamera, produk di hanger terlihat penuh','Duduk'],
      ['Berdiri sambil menjelaskan produk ke kamera','Berdiri menjelaskan'],
      ['Duduk sambil menjelaskan produk ke kamera','Duduk menjelaskan'],
      ['sudut selfie close-up, ponsel tidak terlihat di dalam frame','Selfie — pegang kamera'],
      ['selfie cermin sambil berdiri','Mirror Selfie Berdiri'],
    ],
    tangan:[
      ['berdiri dan memegang produk, produk menghadap lensa lurus','Berdiri'],
      ['duduk dan memegang produk terulur ke depan ke arah kamera','Duduk'],
      ['Berdiri sambil menjelaskan produk ke kamera','Berdiri menjelaskan'],
      ['Duduk sambil menjelaskan produk ke kamera','Duduk menjelaskan'],
      ['sudut selfie close-up, ponsel tidak terlihat di dalam frame','Selfie — pegang kamera'],
      ['selfie cermin sambil berdiri','Mirror Selfie Berdiri'],
    ],
    custom:[
      ['berdiri dan produk ditampilkan sesuai instruksi','Berdiri'],
      ['duduk dan produk ditampilkan sesuai instruksi','Duduk'],
      ['Berdiri sambil menjelaskan produk ke kamera','Berdiri menjelaskan'],
      ['Duduk sambil menjelaskan produk ke kamera','Duduk menjelaskan'],
      ['sudut selfie close-up, ponsel tidak terlihat di dalam frame','Selfie — pegang kamera'],
      ['selfie cermin sambil berdiri','Mirror Selfie Berdiri'],
    ],
  },
  pria:{
    dipakai:[
      ['berdiri dan produk dipakai oleh karakter','Berdiri'],
      ['duduk dan produk sudah dipakai oleh karakter','Duduk'],
      ['Berdiri sambil menjelaskan produk ke kamera','Berdiri menjelaskan'],
      ['Duduk sambil menjelaskan produk ke kamera','Duduk menjelaskan'],
      ['sudut selfie close-up, ponsel tidak terlihat di dalam frame','Selfie — pegang kamera'],
      ['selfie cermin sambil berdiri','Mirror Selfie Berdiri'],
    ],
    hanger:[
      ['berdiri dan memegang hanger ke arah kamera, produk di hanger menghadap lensa','Berdiri'],
      ['duduk dan memegang hanger terulur ke arah kamera, produk di hanger terlihat penuh','Duduk'],
      ['Berdiri sambil menjelaskan produk ke kamera','Berdiri menjelaskan'],
      ['Duduk sambil menjelaskan produk ke kamera','Duduk menjelaskan'],
      ['sudut selfie close-up, ponsel tidak terlihat di dalam frame','Selfie — pegang kamera'],
      ['selfie cermin sambil berdiri','Mirror Selfie Berdiri'],
    ],
    tangan:[
      ['berdiri dan memegang produk, produk menghadap lensa lurus','Berdiri'],
      ['duduk dan memegang produk terulur ke depan ke arah kamera','Duduk'],
      ['Berdiri sambil menjelaskan produk ke kamera','Berdiri menjelaskan'],
      ['Duduk sambil menjelaskan produk ke kamera','Duduk menjelaskan'],
      ['sudut selfie close-up, ponsel tidak terlihat di dalam frame','Selfie — pegang kamera'],
      ['selfie cermin sambil berdiri','Mirror Selfie Berdiri'],
    ],
    custom:[
      ['berdiri dan produk ditampilkan sesuai instruksi','Berdiri'],
      ['duduk dan produk ditampilkan sesuai instruksi','Duduk'],
      ['Berdiri sambil menjelaskan produk ke kamera','Berdiri menjelaskan'],
      ['Duduk sambil menjelaskan produk ke kamera','Duduk menjelaskan'],
      ['sudut selfie close-up, ponsel tidak terlihat di dalam frame','Selfie — pegang kamera'],
      ['selfie cermin sambil berdiri','Mirror Selfie Berdiri'],
    ],
  },
  anak:{
    dipakai:[
      ['Child standing naturally, product worn as part of outfit, playful candid smile, full body visible','Berdiri'],
      ['Child sitting playfully, product clearly worn, cheerful natural expression, candid lifestyle feel','Duduk'],
      ['Anak berdiri sambil menjelaskan produk ke kamera','Berdiri menjelaskan'],
      ['Anak duduk sambil menjelaskan produk ke kamera','Duduk menjelaskan'],
      ['sudut selfie close-up, ponsel tidak terlihat di dalam frame','Selfie — pegang kamera'],
      ['selfie cermin sambil berdiri','Mirror Selfie Berdiri'],
    ],
    hanger:[
      ['Child standing, holding hanger toward camera, bright cheerful smile, product on hanger clearly visible','Berdiri'],
      ['Child sitting, holding hanger extended toward camera, playful expression, product fully visible','Duduk'],
      ['Anak berdiri sambil menjelaskan produk ke kamera','Berdiri menjelaskan'],
      ['Anak duduk sambil menjelaskan produk ke kamera','Duduk menjelaskan'],
      ['sudut selfie close-up, ponsel tidak terlihat di dalam frame','Selfie — pegang kamera'],
      ['selfie cermin sambil berdiri','Mirror Selfie Berdiri'],
    ],
    tangan:[
      ['Child standing, holding product with both hands directed toward camera, product faces lens clearly, bright cheerful smile','Berdiri'],
      ['Child sitting, holding product extended toward camera, product sharp and visible, playful candid expression','Duduk'],
      ['Anak berdiri sambil menjelaskan produk ke kamera','Berdiri menjelaskan'],
      ['Anak duduk sambil menjelaskan produk ke kamera','Duduk menjelaskan'],
      ['sudut selfie close-up, ponsel tidak terlihat di dalam frame','Selfie — pegang kamera'],
      ['selfie cermin sambil berdiri','Mirror Selfie Berdiri'],
    ],
    custom:[
      ['Child standing naturally, product displayed as instructed, cheerful candid expression','Berdiri'],
      ['Child sitting playfully, product displayed as instructed, joyful unstaged feel','Duduk'],
      ['Anak berdiri sambil menjelaskan produk ke kamera','Berdiri menjelaskan'],
      ['Anak duduk sambil menjelaskan produk ke kamera','Duduk menjelaskan'],
      ['sudut selfie close-up, ponsel tidak terlihat di dalam frame','Selfie — pegang kamera'],
      ['selfie cermin sambil berdiri','Mirror Selfie Berdiri'],
    ],
  },
};

const POSES_NO_PRODUK={
  hijab:[
    ['berdiri','Berdiri'],
    ['duduk','Duduk'],
    ['Berdiri sambil menjelaskan outfit ke kamera','Berdiri menjelaskan'],
    ['Duduk sambil menjelaskan outfit ke kamera','Duduk menjelaskan'],
    ['sudut selfie close-up, ponsel tidak terlihat di dalam frame','Selfie — pegang kamera'],
    ['selfie cermin sambil berdiri','Mirror Selfie Berdiri'],
  ],
  pria:[
    ['berdiri','Berdiri'],
    ['duduk','Duduk'],
    ['Berdiri sambil menjelaskan outfit ke kamera','Berdiri menjelaskan'],
    ['Duduk sambil menjelaskan outfit ke kamera','Duduk menjelaskan'],
    ['sudut selfie close-up, ponsel tidak terlihat di dalam frame','Selfie — pegang kamera'],
    ['selfie cermin sambil berdiri','Mirror Selfie Berdiri'],
  ],
  anak:[
    ['Child standing naturally, hands at sides, bright innocent smile, looking at camera','Berdiri'],
    ['Child sitting playfully on floor, big cheerful smile, candid natural feel','Duduk'],
    ['Anak berdiri sambil menjelaskan outfit ke kamera','Berdiri menjelaskan'],
    ['Anak duduk sambil menjelaskan outfit ke kamera','Duduk menjelaskan'],
    ['sudut selfie close-up, ponsel tidak terlihat di dalam frame','Selfie — pegang kamera'],
    ['selfie cermin sambil berdiri','Mirror Selfie Berdiri'],
  ],
};

// STEP 6: FRAMING KAMERA — per subjek
const KAMERA_CHIPS={
  hijab:[
    {group:'Portrait / Close',chips:[
      {label:'Portrait Dada ke Atas',val:'close-up portrait from chest to head, face clearly visible, hijab styled neatly, subject fills the frame'},
      {label:'Medium Pinggang ke Atas',val:'medium close-up from waist to head, face and hijab clearly visible, outfit prominent'},
      {label:'Close-Up Bahu ke Atas',val:'tight close-up from shoulders to head, face and hijab detail clearly visible, natural expression'},
      {label:'3/4 Portrait Natural',val:'portrait with slight side angle, 3/4 view, face and hijab visible, natural candid feel'},
    ]},
    {group:'Full Body',chips:[
      {label:'Full Body Dekat Natural',val:'full body shot, subject close to camera, face and hijab clearly visible, natural friend-filmed feel'},
      {label:'Full Body Low Angle',val:'full body low angle, shot from slightly below, face, hijab and outfit both visible clearly'},
    ]},
    {group:'Produk Fokus',chips:[
      {label:'Produk di Depan — Wajah di Belakang',val:'medium shot with product prominently in foreground, face visible behind — product sharp and large'},
      {label:'Candid Handheld',val:'candid handheld close shot, natural micro-shake, friend-filmed feel, subject close'},
    ]},
  ],
  pria:[
    {group:'Portrait / Close',chips:[
      {label:'Portrait Dada ke Atas',val:'close-up portrait from chest to head, face clearly visible, strong masculine features, subject fills the frame'},
      {label:'Medium Pinggang ke Atas',val:'medium close-up from waist to head, face and upper body clearly visible, outfit prominent'},
      {label:'Close-Up Bahu ke Atas',val:'tight close-up from shoulders to head, face and expression clearly visible, natural confident look'},
      {label:'3/4 Portrait Natural',val:'portrait with slight side angle, 3/4 view, face and jaw visible, candid masculine feel'},
    ]},
    {group:'Full Body',chips:[
      {label:'Full Body Tegak Natural',val:'full body shot standing straight, face clearly visible, confident masculine posture, natural lighting'},
      {label:'Full Body Low Angle',val:'full body low angle, shot from slightly below, face and full outfit both visible, powerful feel'},
      {label:'Full Body Street Style',val:'full body candid walking shot, natural street style movement, relaxed masculine feel'},
    ]},
    {group:'Produk Fokus',chips:[
      {label:'Produk di Depan — Wajah di Belakang',val:'medium shot with product prominently in foreground, face visible behind — product sharp and large'},
      {label:'Candid Handheld',val:'candid handheld close shot, natural micro-shake, authentic friend-filmed feel, subject close'},
    ]},
  ],
  anak:[
    {group:'Portrait / Close',chips:[
      {label:'Portrait Dada ke Atas',val:'close-up portrait from chest to head, child face clearly visible, bright innocent expression, subject fills frame'},
      {label:'Medium Pinggang ke Atas',val:'medium close-up from waist to head, child face and outfit visible, playful expression'},
      {label:'Close-Up Wajah',val:'tight close-up of child face, big cheerful smile, eyes bright and expressive, natural candid'},
    ]},
    {group:'Full Body',chips:[
      {label:'Full Body Ceria',val:'full body shot of child, cheerful natural expression, outfit fully visible, candid playful feel'},
      {label:'Full Body Low Angle',val:'full body low angle from child eye level, face and outfit clearly visible, fun playful perspective'},
      {label:'Full Body Action',val:'full body candid action shot of child moving naturally, joyful energy, unstaged feel'},
    ]},
    {group:'Produk Fokus',chips:[
      {label:'Produk di Depan — Wajah di Belakang',val:'medium shot with product in foreground, child face visible behind — product sharp and prominent'},
      {label:'Candid Handheld',val:'candid handheld shot of child, natural micro-shake, authentic parent-filmed feel, child close to camera'},
    ]},
  ],
};

function fBuildPoseChips(){
  let hasProduk=FS.produkMode!=='tidak' && FS.refs.some(r=>r.type==='produk');
  let subjek=FS.subjek||'hijab';
  let poses;
  if(fIsOutfitOnly()){
    poses=[F_POSE_OUTFIT_ONLY];
  } else if(hasProduk){
    // Kalau holdKey terisi (dari step 3), pakai holdKey
    // Kalau holdKey kosong tapi produkMode='dipakai' (dari step 2, skip step 3), pakai 'dipakai'
    let key=FS.holdKey||(FS.produkMode==='dipakai'?'dipakai':'hanger');
    let subjekPoses=POSES_WITH_PRODUK[subjek]||POSES_WITH_PRODUK.hijab;
    poses=subjekPoses[key]||subjekPoses.dipakai;
  } else {
    poses=(POSES_NO_PRODUK[subjek]||POSES_NO_PRODUK.hijab);
  }
  let container=document.getElementById('f4-chips');
  if(!container)return;
  container.innerHTML=`<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:4px;">${poses.map((p,i)=>`<div class="chip" data-pose-idx="${i}" onclick="fPickPose(this)">${p[1]}</div>`).join('')}</div>`;
  // Store poses on the container itself instead of window global — avoids cross-tab race conditions
  container._posesData=poses;
}

function fPickPose(el){
  let container=document.getElementById('f4-chips');
  let poses=(container&&container._posesData)||[];
  let idx=parseInt(el.getAttribute('data-pose-idx'),10);
  if(isNaN(idx)||!poses[idx])return;
  document.querySelectorAll('#f4-chips .pose-card, #f4-chips .chip').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel');
  if(window.pstPreview)pstPreview('f4','pose',poses[idx][1]);
  fShowConfirm('f4', el, function(){
    FS.pose=poses[idx][1];
    FS.poseLabel=poses[idx][1];
    FS.poseDesc=poses[idx][0];
    doneCard('f4','fa4',poses[idx][1]);
  if(FS.importActive){_fImportBackToSummary();return;} // FIX IMPOR: tidak cascade ke step lain
    // FIX EDIT MODE
    let _f5DoneP=document.getElementById('f5')?.classList.contains('done');
    if(_f5DoneP&&FS.lokasi){
      let _gaP=document.getElementById('f-gen-area');
      if(_gaP){_gaP.classList.remove('hidden');fRunAIConflictCheck(true);}
      setTimeout(()=>_gaP.scrollIntoView({behavior:'smooth',block:'nearest'}),150);
    } else {
      FS.lokasi='';FS.lokasiLabel='';FS.kamera='';
      document.querySelectorAll('#f5 .chip').forEach(c=>c.classList.remove('sel'));
      let f5inp=document.getElementById('f5-custom');if(f5inp)f5inp.value='';
      let f5kp=document.getElementById('f5-custom-karakter');if(f5kp)f5kp.value='';{let _ckc=document.getElementById('f5-counter-karakter');if(_ckc){_ckc.textContent='0 / 300';_ckc.className='inp-counter';}}
      fUpdateProgress(5,'Lokasi');
      showCard('f5');
    }
  });
}

function fPickPoseCustom(){
  let val=document.getElementById('f4-custom').value.trim();
  if(!val){showToast('Isi pose dulu!','error');return;}
  FS.pose=val;
  FS.poseLabel='Custom';
  FS.poseDesc=val;
  doneCard('f4','fa4',val.substring(0,35)+(val.length>35?'…':''));
  if(FS.importActive){_fImportBackToSummary();return;} // FIX IMPOR: tidak cascade ke step lain
  // FIX EDIT MODE
  let _f5DonePC=document.getElementById('f5')?.classList.contains('done');
  if(_f5DonePC&&FS.lokasi){
    let _gaPC=document.getElementById('f-gen-area');
    if(_gaPC){_gaPC.classList.remove('hidden');fRunAIConflictCheck(true);}
    setTimeout(()=>_gaPC.scrollIntoView({behavior:'smooth',block:'nearest'}),150);
  } else {
    FS.lokasi='';FS.lokasiLabel='';FS.kamera='';
    document.querySelectorAll('#f5 .chip').forEach(c=>c.classList.remove('sel'));
    let f5cinp=document.getElementById('f5-custom');if(f5cinp)f5cinp.value='';
    let f5ck=document.getElementById('f5-custom-karakter');if(f5ck)f5ck.value='';{let _ckc=document.getElementById('f5-counter-karakter');if(_ckc){_ckc.textContent='0 / 300';_ckc.className='inp-counter';}}
    fUpdateProgress(5,'Lokasi');
    showCard('f5');
  }
}

function fBack2(){
  // fBackTo sudah panggil fResetFrom(2) — cukup reset UI step 2 saja
  FS.produkMode='';FS.produkNama='';
  document.querySelectorAll('.produk-choice').forEach(c=>c.classList.remove('sel'));
  let pb=document.getElementById('f2-produk-box');if(pb)pb.classList.add('hidden');
  let pi=document.getElementById('f2-produk-input');if(pi)pi.value='';
  fClearProdukError();
  fBackTo(2,1);
  fUpdateProgress(1,'Foto Referensi');
  // FIX (dilaporkan user): kalau sesi tur (Langkah 5+6, atau lanjutannya di
  // step 3-9) masih berjalan dan user pencet "← Kembali" dari sini balik ke
  // Foto Referensi, tampilan versi tur f1 (label "Karakter Sheet", kunci
  // Karakter Sheet & Produk masing-masing cuma boleh 1 foto, banner "Cek HP
  // dulu" tetap tersembunyi) harus dipasang ULANG di sini — sebelumnya cuma
  // dipasang sekali di pbGoStep6() awal, jadi begitu user balik ke f1 dari
  // step ini, tampilannya sudah balik ke versi normal (label "Wajah", boleh
  // nambah berkali-kali, banner "Cek HP dulu" muncul lagi).
  if(typeof pbTourStep56Active!=='undefined' && pbTourStep56Active && typeof pbGoStep6==='function') pbGoStep6();
}

function fBack3(){
  fBackTo(3,1);
  fUpdateProgress(1,'Foto Referensi');
  // Reset banner konflik (tidak di-handle fResetFrom)
  let b=document.getElementById('f3-conflict-banner');
  if(b){b.className='hidden';b.style.cssText='';b.innerHTML='';}
  let ga=document.getElementById('f-gen-area');if(ga)ga.classList.add('hidden');
  // FIX (sama seperti fBack2 di atas): pasang ulang tampilan versi tur f1
  // kalau sesi tur masih berjalan.
  if(typeof pbTourStep56Active!=='undefined' && pbTourStep56Active && typeof pbGoStep6==='function') pbGoStep6();
}

function fBack4(){
  let needsStep3=(FS.produkMode==='foto'||FS.produkMode==='pegang');
  if(needsStep3){
    fBackTo(4,3);
    fUpdateProgress(3,'Cara Tampil');
  } else {
    fBackTo(4,1);
    fUpdateProgress(1,'Foto Referensi');
    // FIX (audit kelas bug yang sama seperti fBack1/fBack2/fBack3): kalau di
    // step 1 user cuma pilih Karakter Sheet tanpa foto Produk, f2 & f3
    // dilewati (produkMode='tidak') dan "← Kembali" dari Pose langsung
    // balik ke f1 lewat cabang ini — dulu tampilan versi tur f1 tidak
    // dipasang ulang (label kembali "Wajah", banner "Cek HP dulu" muncul
    // lagi, chip Objek/Outfit kebuka) padahal sesi tur masih berjalan.
    if(typeof pbTourStep56Active!=='undefined' && pbTourStep56Active && typeof pbGoStep6==='function') pbGoStep6();
  }
  let ga=document.getElementById('f-gen-area');if(ga)ga.classList.add('hidden');
}

// STEP 5: LOKASI
let _fLokasiCustomLock=false;
function fPickLokasi(val,el,label){
  document.querySelectorAll('#f5 .chip').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel');
  if(window.pstPreview)pstPreview('f5','lokasi',label);
  fShowConfirm('f5', el, function(){
    FS.lokasi=label;
    FS.lokasiLabel=label;
    FS.lokasiDesc=val;
    doneCard('f5','fa5',label);
  if(FS.importActive){_fImportBackToSummary();return;} // FIX IMPOR: tidak cascade ke step lain
    // kamera tidak di-set di sini — user pilih di step framing
    // FIX EDIT MODE — cek f7+f8+f9 sudah done SEBELUM reset
    let _f7DoneL=document.getElementById('f7')?.classList.contains('done');
    let _f8DoneL=document.getElementById('f8')?.classList.contains('done');
    let _f9DoneL=document.getElementById('f9')?.classList.contains('done');
    if(_f7DoneL&&FS.cahaya&&_f8DoneL&&FS.angle&&_f9DoneL&&FS.mood){
      let _gaL=document.getElementById('f-gen-area');
      if(_gaL){_gaL.classList.remove('hidden');fRunAIConflictCheck(true);}
      setTimeout(()=>_gaL.scrollIntoView({behavior:'smooth',block:'nearest'}),150);
    } else {
      _fCahaya=null;FS.cahaya='';FS.cahayaLabel='';
      document.querySelectorAll('#f7-cahaya-chips .chip, #f7-cahaya-chips-karakter .chip').forEach(c=>c.classList.remove('sel'));
      let f7inp=document.getElementById('f7-custom');if(f7inp)f7inp.value='';
      _fAngle=null;FS.angle='';FS.angleLabel='';
      document.querySelectorAll('#f8 .chip').forEach(c=>c.classList.remove('sel'));
      fSetState({mood:'',moodLabel:''});
      document.querySelectorAll('#f9 .chip').forEach(c=>c.classList.remove('sel'));
      fUpdateProgress(7,'Pencahayaan');
      showCard('f7');
      setTimeout(fApplyCahayaContext, 200);
    }
  });
}
function fPickLokasiCustom(){
  if(_fLokasiCustomLock)return;
  let val=document.getElementById('f5-custom').value.trim();
  if(!val){showToast('Isi lokasi dulu!','error');return;}
  _fLokasiCustomLock=true;
  setTimeout(()=>{_fLokasiCustomLock=false;},600);
  fPickLokasiCustomHandler(val);
}
function fBack5(){
  if(FS.subjek==='produk'){
    // Mode produk saja: f5 → f1 (skip f2,f3,f4)
    fBackTo(5,1);
    fUpdateProgress(1,'Foto Referensi');
    // Restore state f1 agar bisa diedit ulang
    let c1=document.getElementById('f1');if(c1)c1.classList.remove('done');
    let a1=document.getElementById('fa1');if(a1)a1.textContent='';
    let c2=document.getElementById('f2');if(c2){c2.classList.remove('done','hidden');c2.classList.add('pending');}
  } else if(fIsNoChar()){
    // Produk + Lokasi saja: tidak ada step Pose, kembali ke Cara Tampil
    fBackTo(5,3);
    fUpdateProgress(3,'Cara Tampil');
  } else if(fHasPoseRef()){
    // Ada foto Pose: step Pose dilewati, kembali ke Cara Tampil (kalau ada produk) atau Foto Referensi
    if(FS.produkMode==='foto'||FS.produkMode==='pegang'){
      fBackTo(5,3);
      fUpdateProgress(3,'Cara Tampil');
    } else {
      fBackTo(5,1);
      fUpdateProgress(1,'Foto Referensi');
      let c1=document.getElementById('f1');if(c1)c1.classList.remove('done');
      let a1=document.getElementById('fa1');if(a1)a1.textContent='';
      let c2=document.getElementById('f2');if(c2){c2.classList.remove('done','hidden');c2.classList.add('pending');}
    }
  } else {
    fBackTo(5,4);
    fUpdateProgress(4,'Pose');
  }
  FS.lokasi='';FS.lokasiLabel='';FS.kamera='';
  document.querySelectorAll('#f5 .chip').forEach(c=>c.classList.remove('sel'));
  let f5c=document.getElementById('f5-custom');if(f5c)f5c.value='';
  let f5ck2=document.getElementById('f5-custom-karakter');if(f5ck2)f5ck2.value='';{let _ckc=document.getElementById('f5-counter-karakter');if(_ckc){_ckc.textContent='0 / 300';_ckc.className='inp-counter';}}
  let cnt=document.getElementById('f5-counter');if(cnt){cnt.textContent='0 / 300';cnt.className='inp-counter';}
  let ga=document.getElementById('f-gen-area');if(ga)ga.classList.add('hidden');
}

// STEP 6: FRAMING KAMERA
// _fKamera dihapus (framing hardcoded), _fCahaya dan _fAngle masih dipakai
let _fCahaya=null, _fAngle=null;

// fPickKamera, fPickKameraCustom, fBack6, _fKameraCustomLock — DIHAPUS (f6 tidak ada lagi)

// STEP 7: PENCAHAYAAN
let _fCahayaCustomLock=false;
function fPickCahaya(val,el,label){
  document.querySelectorAll('#f7-cahaya-chips .chip, #f7-cahaya-chips-karakter .chip').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel');
  if(window.pstPreview)pstPreview('f7','cahaya',label);
  fShowConfirm('f7', el, function(){
    _fCahaya={val,label};
    FS.cahaya=label;
    FS.cahayaLabel=label;
    FS.cahayaDesc=val;
    doneCard('f7','fa7',label);
  if(FS.importActive){_fImportBackToSummary();return;} // FIX IMPOR: tidak cascade ke step lain
    // FIX EDIT MODE — cek f8+f9 sudah done SEBELUM reset
    let _f8DoneCah=document.getElementById('f8')?.classList.contains('done');
    let _f9DoneCah=document.getElementById('f9')?.classList.contains('done');
    if(_f8DoneCah&&FS.angle&&_f9DoneCah&&FS.mood){
      let _gaCah=document.getElementById('f-gen-area');
      if(_gaCah){_gaCah.classList.remove('hidden');fRunAIConflictCheck(true);}
      setTimeout(()=>_gaCah.scrollIntoView({behavior:'smooth',block:'nearest'}),150);
    } else {
      _fAngle=null;FS.angle='';FS.angleLabel='';
      document.querySelectorAll('#f8 .chip').forEach(c=>c.classList.remove('sel'));
      let f8inp=document.getElementById('f8-custom');if(f8inp)f8inp.value='';
      fSetState({mood:'',moodLabel:''});
      document.querySelectorAll('#f9 .chip').forEach(c=>c.classList.remove('sel'));
      fUpdateProgress(8,'Sudut Kamera');
      showCard('f8');
    }
  });
}
function fPickCahayaCustom(){
  if(_fCahayaCustomLock)return;
  let val=document.getElementById('f7-custom').value.trim();
  if(!val){showToast('Isi kondisi cahaya dulu!','error');return;}
  _fCahayaCustomLock=true;
  setTimeout(()=>{_fCahayaCustomLock=false;},600);
  document.querySelectorAll('#f7-cahaya-chips .chip, #f7-cahaya-chips-karakter .chip').forEach(c=>c.classList.remove('sel'));
  _fCahaya={val,label:'Custom'};
  FS.cahaya=val;
  FS.cahayaLabel='Custom';
  FS.cahayaDesc=val;
  doneCard('f7','fa7',val.substring(0,35)+(val.length>35?'…':''));
  if(FS.importActive){_fImportBackToSummary();return;} // FIX IMPOR: tidak cascade ke step lain
  // FIX EDIT MODE — cek f8+f9 sudah done SEBELUM reset
  let _f8DoneCahC=document.getElementById('f8')?.classList.contains('done');
  let _f9DoneCahC=document.getElementById('f9')?.classList.contains('done');
  if(_f8DoneCahC&&FS.angle&&_f9DoneCahC&&FS.mood){
    let _gaCahC=document.getElementById('f-gen-area');
    if(_gaCahC){_gaCahC.classList.remove('hidden');fRunAIConflictCheck(true);}
    setTimeout(()=>_gaCahC.scrollIntoView({behavior:'smooth',block:'nearest'}),150);
  } else {
    _fAngle=null;FS.angle='';FS.angleLabel='';
    document.querySelectorAll('#f8 .chip').forEach(c=>c.classList.remove('sel'));
    let f8cinp=document.getElementById('f8-custom');if(f8cinp)f8cinp.value='';
    fSetState({mood:'',moodLabel:''});
    document.querySelectorAll('#f9 .chip').forEach(c=>c.classList.remove('sel'));
    fUpdateProgress(8,'Sudut Kamera');
    showCard('f8');
  }
}
function fBack7(){
  fBackTo(7,5);
  fUpdateProgress(5,'Lokasi');
  _fCahaya=null;
  FS.cahaya='';FS.cahayaLabel='';
  document.querySelectorAll('#f7-cahaya-chips .chip, #f7-cahaya-chips-karakter .chip').forEach(c=>c.classList.remove('sel'));
  let f7c=document.getElementById('f7-custom');if(f7c)f7c.value='';
  let cnt=document.getElementById('f7-counter');if(cnt){cnt.textContent='0 / 300';cnt.className='inp-counter';}
  _fAngle=null;FS.angle='';FS.angleLabel='';
  FS.mood='';FS.moodLabel='';
  document.querySelectorAll('#f9 .chip').forEach(c=>c.classList.remove('sel'));
  let ga=document.getElementById('f-gen-area');if(ga)ga.classList.add('hidden');
}

// STEP 8: CAMERA ANGLE
let _fAngleCustomLock=false;
function fPickAngle(val,el,label){
  document.querySelectorAll('#f8 .chip').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel');
  if(window.pstPreview)pstPreview('f8','angle',label);
  fShowConfirm('f8', el, function(){
    _fAngle={val,label};
    FS.angle=label;
    FS.angleLabel=label;
    FS.angleDesc=val;
    doneCard('f8','fa8',label);
  if(FS.importActive){_fImportBackToSummary();return;} // FIX IMPOR: tidak cascade ke step lain
    fSyncStepNums();
    // FIX EDIT MODE — cek apakah f9 sudah done
    let _f9Done=document.getElementById('f9')?.classList.contains('done');
    if(_f9Done&&FS.mood){
      let _ga=document.getElementById('f-gen-area');
      if(_ga){_ga.classList.remove('hidden');fRunAIConflictCheck(true);}
      setTimeout(()=>_ga.scrollIntoView({behavior:'smooth',block:'nearest'}),150);
    } else {
      fSetState({mood:'',moodLabel:''});
      document.querySelectorAll('#f9 .chip').forEach(c=>c.classList.remove('sel'));
      let f9c=document.getElementById('f9-custom');if(f9c)f9c.value='';
      let stepNum=fCardToStep(9);
      fUpdateProgress(9,'Mood & Tone');
      showCard('f9');
    }
  });
}
function fPickAngleCustom(){
  if(_fAngleCustomLock)return;
  let val=document.getElementById('f8-custom').value.trim();
  if(!val){showToast('Isi sudut kamera dulu!','error');return;}
  _fAngleCustomLock=true;
  setTimeout(()=>{_fAngleCustomLock=false;},600);
  document.querySelectorAll('#f8 .chip').forEach(c=>c.classList.remove('sel'));
  _fAngle={val,label:'Custom'};
  FS.angle=val;
  FS.angleLabel='Custom';
  FS.angleDesc=val;
  doneCard('f8','fa8',val.substring(0,35)+(val.length>35?'…':''));
  if(FS.importActive){_fImportBackToSummary();return;} // FIX IMPOR: tidak cascade ke step lain
  fSyncStepNums();
  // FIX EDIT MODE
  let _f9DoneC=document.getElementById('f9')?.classList.contains('done');
  if(_f9DoneC&&FS.mood){
    let _gaC=document.getElementById('f-gen-area');
    if(_gaC){_gaC.classList.remove('hidden');fRunAIConflictCheck(true);}
    setTimeout(()=>_gaC.scrollIntoView({behavior:'smooth',block:'nearest'}),150);
  } else {
    fSetState({mood:'',moodLabel:''});
    document.querySelectorAll('#f9 .chip').forEach(c=>c.classList.remove('sel'));
    let f9ci=document.getElementById('f9-custom');if(f9ci)f9ci.value='';
    fUpdateProgress(9,'Mood & Tone');
    showCard('f9');
  }
}
function fBack8(){
  // Ada foto Lokasi: step Pencahayaan dilewati, jadi "Kembali" langsung ke step sebelum Lokasi (Pose / Foto Referensi).
  if(fHasLokasiRef()){
    fBack5();
    _fAngle=null;
    FS.angle='';FS.angleLabel='';
    return;
  }
  fBackTo(8,7);
  fUpdateProgress(7,'Pencahayaan');
  _fAngle=null;
  FS.angle='';FS.angleLabel='';
  document.querySelectorAll('#f8 .chip').forEach(c=>c.classList.remove('sel'));
  let f8c=document.getElementById('f8-custom');if(f8c)f8c.value='';
  let cnt=document.getElementById('f8-counter');if(cnt){cnt.textContent='0 / 300';cnt.className='inp-counter';}
  FS.mood='';FS.moodLabel='';
  document.querySelectorAll('#f9 .chip').forEach(c=>c.classList.remove('sel'));
  let f9cb=document.getElementById('f9-custom');if(f9cb)f9cb.value='';
  let ga=document.getElementById('f-gen-area');if(ga)ga.classList.add('hidden');
}

// STEP 9: MOOD / TONE
let _fMoodCustomLock=false;
function fPickMood(val,el,label){
  document.querySelectorAll('#f9 .chip').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel');
  if(window.pstPreview)pstPreview('f9','mood',label);
  fShowConfirm('f9', el, function(){
    FS.mood=val;
    FS.moodLabel=label;
    doneCard('f9','fa9',label);
  if(FS.importActive){_fImportBackToSummary();return;} // FIX IMPOR: tidak cascade ke step lain
    fSyncStepNums();
    fUpdateProgress(9,'<svg class="icon"><use href="#ic-check"></use></svg> Selesai!');
    document.getElementById('f-gen-area').classList.remove('hidden');

    fRunAIConflictCheck(_aiConflictCache!==null);
    setTimeout(()=>document.getElementById('f-gen-area').scrollIntoView({behavior:'smooth',block:'nearest'}),200);
    if(typeof pbTourExtActive!=='undefined' && pbTourExtActive) pbTourFinishExt();
  });
}
function fPickMoodCustom(){
  if(_fMoodCustomLock)return;
  let val=document.getElementById('f9-custom').value.trim();
  if(!val){showToast('Isi mood/tone dulu!','error');return;}
  _fMoodCustomLock=true;
  setTimeout(()=>{_fMoodCustomLock=false;},600);
  document.querySelectorAll('#f9 .chip').forEach(c=>c.classList.remove('sel'));
  FS.mood=val;
  FS.moodLabel='Custom';
  doneCard('f9','fa9',val.substring(0,35)+(val.length>35?'…':''));
  if(FS.importActive){_fImportBackToSummary();return;} // FIX IMPOR: tidak cascade ke step lain
  fSyncStepNums();
  fUpdateProgress(9,'<svg class="icon"><use href="#ic-check"></use></svg> Selesai!');
  document.getElementById('f-gen-area').classList.remove('hidden');
  
  fRunAIConflictCheck(_aiConflictCache!==null);
  setTimeout(()=>document.getElementById('f-gen-area').scrollIntoView({behavior:'smooth',block:'nearest'}),200);
  if(typeof pbTourExtActive!=='undefined' && pbTourExtActive) pbTourFinishExt();
}
function fBack9(){
  fBackTo(9,8);
  fUpdateProgress(8,'Sudut Kamera');
  FS.mood='';FS.moodLabel='';
  document.querySelectorAll('#f9 .chip').forEach(c=>c.classList.remove('sel'));
  let f9c=document.getElementById('f9-custom');if(f9c)f9c.value='';
  let cnt9=document.getElementById('f9-counter');if(cnt9){cnt9.textContent='0 / 300';cnt9.className='inp-counter';}
  let fa9=document.getElementById('fa9');if(fa9)fa9.textContent='';
  let ga=document.getElementById('f-gen-area');if(ga)ga.classList.add('hidden');
}

// PROGRESS
// HELPER: konversi nomor card ke nomor step display yang benar
// Jalur 7-step (hasStep3): f4→4, f5→5, f7→6, f8→7 (f6/Framing dihapus)
// Jalur 6-step (!hasStep3): f4→3, f5→4, f7→5, f8→6 (f6/Framing dihapus)
// SUMBER KEBENARAN TUNGGAL urutan step tab Foto (dipakai header "Step X dari Y",
// badge nomor kartu, daftar "Lompat ke step" dan menu step desktop).
// Card f2 (Produk) & f6 (Framing) sudah dihapus dari alur, jadi nomor tidak
// boleh dihitung dari nomor card mentah (dulu f7 tampil "7" padahal step ke-6,
// total 9 padahal cuma 8). Urutan aktif:
//   Produk Saja       : Subjek, Foto Referensi, Lokasi, Cahaya, Sudut, Mood      (6)
//   Ada produk        : Subjek, Foto Referensi, Cara Tampil, Pose, Lokasi, ...   (8)
//   Tanpa produk      : Subjek, Foto Referensi, Pose, Lokasi, ...                (7)
const F_STEP_TITLES={f0:'Subjek',f1:'Foto Referensi',f3:'Cara Tampil',f4:'Pose',f5:'Lokasi',f7:'Pencahayaan',f8:'Sudut Kamera',f9:'Mood & Tone'};
// Foto referensi tipe "Lokasi" ada? Kalau ya, step Lokasi (f5) & Pencahayaan (f7) tidak dipakai —
// keduanya diambil dari foto lokasi itu sendiri.
// MODE "PRODUK + LOKASI SAJA" (permintaan user): kalau di Foto Referensi user cuma memilih Produk dan Lokasi
// (tanpa Karakter Sheet / Outfit / Aksesori), alur tetap boleh lanjut. Hasilnya diperlakukan seperti foto produk
// tanpa karakter: step Pose dilewati, prompt tidak menyebut karakter, dan Cara Tampil (mis. "di atas meja") dipakai.
// MODE "OUTFIT SAJA" (permintaan user): Foto Referensi cuma berisi Outfit (atau Outfit + Lokasi), TANPA Wajah Karakter
// dan TANPA Produk. Step Pose hanya punya 1 opsi: foto outfit-check tanpa wajah (frame dipotong di leher).
var F_POSE_OUTFIT_ONLY=['standing straight and relaxed, facing the camera directly, arms hanging naturally at the sides, feet slightly apart, casual outfit-check pose. Faceless framing: the camera frame is cropped at the neck so the head, face and hair are completely out of frame and not visible. Full outfit shown from neck down to the shoes, vertical portrait composition, subject centered, like a casual outfit check video still','Outfit Check (tanpa wajah)'];
function fIsOutfitOnly(){
  try{
    if(!FS||!FS.refs||FS.importActive||FS.subjek==='produk')return false;
    var hasOutfit=false;
    for(var i=0;i<FS.refs.length;i++){
      var t=FS.refs[i].type;
      if(t==='wajah'||t==='produk'||t==='pose'||t==='objek')return false;
      if(t==='outfit'||t==='atasan'||t==='bawahan'||t==='outfit_random')hasOutfit=true;
    }
    return hasOutfit;
  }catch(e){return false;}
}
// Menyinkronkan step Pose dengan mode Outfit Saja: 1 opsi, kolom "isi sendiri" disembunyikan,
// dan pose lama dari mode lain dikosongkan supaya tidak terbawa.
function fSyncPoseOutfitOnly(){
  try{
    if(!FS||FS.importActive)return;
    var on=fIsOutfitOnly();
    var cur=String(FS.poseDesc||'');
    var isOO=(cur===F_POSE_OUTFIT_ONLY[0]);
    var inp=document.getElementById('f4-custom');
    var wrap=inp&&inp.closest?inp.closest('.mt12'):null;
    if(wrap)wrap.style.display=on?'none':'';
    var cont=document.getElementById('f4-chips');
    var chipOO=!!(cont&&cont._posesData&&cont._posesData.length===1&&cont._posesData[0][0]===F_POSE_OUTFIT_ONLY[0]);
    var needReset=(!on&&isOO)||(on&&cur&&!isOO);
    if(needReset){
      FS.pose='';FS.poseLabel='';FS.poseDesc='';
      var c4=document.getElementById('f4');
      if(c4){c4.classList.remove('done','hidden');c4.classList.add('pending');}
      var a4=document.getElementById('fa4');if(a4)a4.textContent='';
      if(inp)inp.value='';
      if(typeof fSyncStepNums==='function')fSyncStepNums();
    }
    if(needReset||on!==chipOO){
      if(typeof fBuildPoseChips==='function')fBuildPoseChips();
    }
  }catch(e){}
}
function fIsNoChar(){
  try{
    if(!FS||FS.subjek==='produk'||!FS.refs)return false;
    // FIX IMPOR PRODUK+LOKASI: dulu mode impor selalu dianggap "ada karakter", jadi prompt lama yang
    // fotonya cuma Produk + Lokasi (tanpa pose) tetap dipaksa isi Pose. Sekarang prompt impor dianggap
    // tanpa karakter kalau JSON-nya memang tidak punya pose dan subject-nya kosong / "product only, no person".
    var _impProdOnly=false;
    if(FS.importActive){
      if(FS.pose||FS.poseDesc)return false;
      var _is=String(FS.importSubject||'').trim().toLowerCase();
      if(_is&&!/product only|no person/.test(_is))return false;
      // Prompt lama bekas mode "Produk Saja" (subject "product only, no person") yang fotonya cuma Produk, tanpa foto Lokasi, juga tanpa karakter.
      _impProdOnly=!!_is;
    }
    var hasP=false,hasL=false;
    for(var i=0;i<FS.refs.length;i++){
      var t=FS.refs[i].type;
      if(t==='produk')hasP=true;
      else if(t==='lokasi')hasL=true;
      else if(t==='wajah'||t==='outfit'||t==='atasan'||t==='bawahan'||t==='aksesori'||t==='outfit_random')return false;
    }
    return (hasP&&hasL)||_impProdOnly;
  }catch(e){return false;}
}
function fHasLokasiRef(){
  return !!(FS&&FS.refs&&FS.refs.some(function(r){return r.type==='lokasi';}));
}
function fActiveSteps(){
  let base;
  if(FS.subjek==='produk') base=['f0','f1','f5','f7','f8','f9'];
  else{
    let hasStep3=(FS.produkMode==='foto'||FS.produkMode==='pegang');
    base=hasStep3?['f0','f1','f3','f4','f5','f7','f8','f9']:['f0','f1','f4','f5','f7','f8','f9'];
  }
  if(fIsNoChar()||fHasPoseRef()) base=base.filter(function(id){return id!=='f4';});
  return fHasLokasiRef()?base.filter(function(id){return id!=='f5'&&id!=='f7';}):base;
}
function fTotalSteps(){
  return fActiveSteps().length;
}
// cardNum = nomor card (0=f0 Subjek, 1=f1 Foto Referensi, 3=f3, 4=f4, 5=f5, 7=f7, ...).
// Card yang tidak ada di alur aktif (mis. f2 yang sudah dihapus, atau f3 saat
// tanpa produk) dipetakan ke step berikutnya yang ada, jadi tidak pernah NaN.
function fCardToStep(cardNum){
  let steps=fActiveSteps();
  let idx=steps.indexOf('f'+cardNum);
  if(idx>=0) return idx+1;
  let after=steps.filter(function(id){return parseInt(id.slice(1),10)<cardNum;}).length;
  return Math.min(after+1,steps.length);
}

// FIX #6 (diperbaiki): nomor badge (f4-num dst) dan teks "Step X dari Y" di progress
// bar dulu dihitung oleh DUA fungsi terpisah (fSyncStepNums hardcode angkanya sendiri,
// fCardToStep menghitung dengan rumus) yang bisa saling melenceng — badge sempat
// menampilkan angka berbeda dari header "Step X dari Y" pada layar yang sama.
// Sekarang badge diturunkan LANGSUNG dari fCardToStep() supaya satu-satunya sumber
// kebenaran dan tidak bisa desync lagi.
function fSyncStepNums(){
  let f1num=document.getElementById('f1-num');
  let f3num=document.getElementById('f3-num');
  if(f1num)f1num.textContent=fCardToStep(1);
  if(f3num)f3num.textContent=fCardToStep(3);
  let f4num=document.getElementById('f4-num');
  let f5num=document.getElementById('f5-num');
  let f7num=document.getElementById('f7-num');
  let f8num=document.getElementById('f8-num');
  let f9num=document.getElementById('f9-num');
  if(f4num)f4num.textContent=fCardToStep(4);
  if(f5num)f5num.textContent=fCardToStep(5);
  if(f7num)f7num.textContent=fCardToStep(7);
  if(f8num)f8num.textContent=fCardToStep(8);
  if(f9num)f9num.textContent=fCardToStep(9);
  fSyncDesktopNav();
}

// Menu step desktop (#f-step-nav) dibangun ulang dari fActiveSteps() supaya
// selalu sama dengan header, badge kartu & daftar "Lompat ke step": tanpa
// produk tidak ada "Cara Tampil", mode Produk Saja tidak ada "Cara Tampil"/"Pose",
// dan nomornya berurutan tanpa lompatan.
function fSyncDesktopNav(){
  let nav=document.getElementById('f-step-nav');
  if(!nav) return;
  let steps=fActiveSteps();
  let sig=steps.join(',');
  if(nav.dataset.sig===sig) return;
  nav.dataset.sig=sig;
  nav.innerHTML='';
  steps.forEach(function(id,i){
    let a=document.createElement('a');
    a.textContent=(i+1)+' \u00b7 '+F_STEP_TITLES[id];
    a.onclick=function(){fJumpStep(id);};
    nav.appendChild(a);
  });
}

// ── STEP JUMP — pengganti fungsi bulatan nomor hijau yang dihapus dari
// tiap card summary. Tap progress bar di atas → buka daftar step yang
// sudah diisi di tab aktif → tap salah satu → card itu dibuka mode edit
// & layar meloncat ke situ. ──────────────────────────────────────────
function fOpenStepJump(pageId){
  let page=document.getElementById(pageId)||document.querySelector('.page.active');
  if(!page)return;
  let cards=Array.prototype.filter.call(page.querySelectorAll('.wcard.done'),function(c){
    // Step "Produk" (f2) sudah tidak dipakai — fungsinya sama dengan Foto Referensi.
    // Tidak ditampilkan di daftar Lompat ke step (tab foto).
    if(pageId==='foto' && c.id==='f2') return false;
    // Pergerakan Kamera cuma ada di Raw Asset.
    // Nov 2026: step Pergerakan Kamera sudah dihapus dari wizard (kamera lewat ikon pensil di kartu skrip) — jangan tampil di sini, termasuk dari draft lama.
    if(pageId==='video' && c.id==='vcam') return false;
    // FIX: kalau user cuma pilih Karakter Sheet + Outfit (tanpa foto produk),
    // f3 \"Cara Tampil Produk\" memang tidak relevan. Flow sengaja menandainya
    // 'done' (lihat cabang \"Tidak ada foto produk\" di fKonfirmRef) supaya
    // nomor step tidak bentrok — tapi karena berstatus 'done', dulu dia ikut
    // nongol di daftar \"Lompat ke step\" dengan jawaban kosong padahal tidak
    // ada produk yang dipilih. Step ini hanya relevan kalau ada produk
    // (produkMode 'foto'/'pegang', sama seperti syarat hasStep3 di
    // fTotalSteps/fCardToStep). CATATAN: jangan filter berdasarkan class
    // 'hidden' — doneCard() menyembunyikan SEMUA step yang selesai, jadi
    // seluruh daftar akan ikut kosong.
    if(pageId==='foto' && c.id==='f3' && typeof FS!=='undefined' && FS &&
       FS.produkMode!=='foto' && FS.produkMode!=='pegang') return false;
    // Mode \"Produk Saja\": tidak ada karakter, jadi Cara Tampil (f3) dan Pose
    // (f4) sama-sama tidak ada di alurnya (lihat fKonfirmRef & fCardToStep
    // untuk subjek 'produk'). Keduanya cuma ditandai 'done' supaya validasi
    // generate tidak memblokir — jangan sampai ikut tampil sebagai baris
    // kosong di daftar \"Lompat ke step\". Di mode ini produkMode selalu
    // 'foto', jadi filter f3 di atas TIDAK menangkapnya; harus dicek terpisah.
    if(pageId==='foto' && (c.id==='f3' || c.id==='f4') && typeof FS!=='undefined' && FS &&
       FS.subjek==='produk') return false;
    if(pageId==='foto' && c.id==='f4' && typeof fIsNoChar==='function' && fIsNoChar()) return false;
    if(pageId==='foto' && c.id==='f8' && ((typeof _fIsPovHandNoChar==='function' && _fIsPovHandNoChar()) || (typeof fHasPoseRef==='function' && fHasPoseRef() && !(typeof fIsNoChar==='function' && fIsNoChar())))) return false;
    if(pageId==='foto' && c.id==='f4' && typeof fHasPoseRef==='function' && fHasPoseRef()) return false;
    return true;
  });
  let list=document.getElementById('step-jump-list');
  if(!list)return;
  list.innerHTML='';
  if(cards.length===0){
    list.innerHTML='<div class="step-jump-empty">Belum ada step yang diisi.</div>';
  }else{
    cards.forEach(function(c,idx){
      let titleEl=c.querySelector('.wtitle');
      let ansEl=c.querySelector('.wanswer');
      let title=titleEl?titleEl.textContent.trim():'Step';
      let val=ansEl?ansEl.textContent.trim():'';
      let item=document.createElement('div');
      item.className='step-jump-item';
      // Video: pakai nomor step ASLI (VB_STEP_META), bukan urutan di daftar —
      // kalau ada step di tengah yang lagi dibuka untuk diedit, dia tidak
      // ikut terdaftar (bukan .done) dan nomor step sesudahnya jadi geser
      // (mis. "Nada Bicara" tampil 2 padahal step 3).
      let _num=(pageId==='video'&&typeof VB_STEP_META!=='undefined'&&VB_STEP_META[c.id])?VB_STEP_META[c.id][0]:(idx+1);
      item.innerHTML='<div class="step-jump-num">'+_num+'</div>'+
        '<div class="step-jump-info"><div class="sjtitle"></div><div class="sjval"></div></div>';
      item.querySelector('.sjtitle').textContent=title;
      item.querySelector('.sjval').textContent=val;
      item.addEventListener('click',function(){
        fCloseStepJump();
        // Tab Foto (id card 'f0'..'f9') sudah punya mekanisme edit yang
        // matang & teruji: fSummaryEdit() — itu yang dipakai tombol "Edit"
        // di Ringkasan (f-gen-area). Dia menangani hal-hal detil yang
        // whead.click() generik TIDAK tangani (mis. tombol "Selesai Edit —
        // Kembali ke Generate" biar user balik ke Ringkasan alih-alih
        // "kebawa" lanjut ke step-step berikutnya lagi, dan penyesuaian
        // khusus card Produk). Jadi diprioritaskan di sini kalau tersedia.
        // Tab Video belum punya fungsi setara, jadi fallback ke
        // whead.click() generik (jalan, cuma tanpa tombol "Selesai Edit").
        let m=/^f(\d+)$/.exec(c.id);
        if(pageId==='foto' && m && typeof fSummaryEdit==='function'){
          fSummaryEdit(parseInt(m[1],10));
        }else{
          let whead=c.querySelector('.whead');
          if(whead)whead.click();
        }
        setTimeout(function(){fScrollToCard(c);},80);
      });
      list.appendChild(item);
    });
  }
  document.getElementById('step-jump-overlay').classList.add('open');
}
function fCloseStepJump(){
  let ov=document.getElementById('step-jump-overlay');
  if(ov)ov.classList.remove('open');
}
// Scroll manual langsung ke .app-shell (container scroll asli app ini).
// SENGAJA tidak pakai el.scrollIntoView() di sini — method itu sudah
// di-override secara global jadi no-op (lihat <script> paling atas) demi
// mematikan auto-scroll otomatis. Tapi khusus aksi INI, user sendiri yang
// tap step di daftar, jadi scroll manual di sini justru yang diinginkan —
// makanya dihitung & dieksekusi manual pakai appShell.scrollTo(), bukan
// scrollIntoView(), supaya tidak ikut kena override itu.
function fScrollToCard(el){
  if(!el)return;
  let appShell=document.querySelector('.app-shell');
  if(!appShell)return;
  let rect=el.getBoundingClientRect();
  let shellRect=appShell.getBoundingClientRect();
  let offset=rect.top-shellRect.top+appShell.scrollTop-96;
  appShell.scrollTo({top:Math.max(0,offset),behavior:'smooth'});
}

function fUpdateProgress(cardNum,stepName){
  // FIX #6: Sync nomor badge DULU sebelum hitung progress,
  // sehingga fTotalSteps() & fCardToStep() sudah sesuai state terkini
  fSyncStepNums();
  let stepNum=fCardToStep(cardNum);
  let total=fTotalSteps();
  let pct=Math.round((stepNum/total)*100);
  let fill=document.getElementById('f-progress-fill');
  let label=document.getElementById('f-progress-label');
  let title=document.getElementById('f-progress-title');
  // PULSE PROGRESS: nyalakan kilau hanya kalau step-nya beneran ganti,
  // bukan tiap kali fUpdateProgress dipanggil ulang dengan angka yang sama.
  let wrap=fill&&fill.closest('.progress-wrap');
  if(wrap&&wrap.dataset.step!==String(stepNum)){
    wrap.dataset.step=String(stepNum);
    wrap.classList.remove('step-changed');
    void wrap.offsetWidth; // restart animasi kalau dipicu beruntun cepat
    wrap.classList.add('step-changed');
    setTimeout(()=>wrap.classList.remove('step-changed'),800);
  }
  if(fill)fill.style.width=pct+'%';
  if(label)label.innerHTML='Step <span>'+stepNum+'</span> dari <span>'+total+'</span>';
  if(title)title.innerHTML=stepName||'';
}

// GENERATE FOTO
function _fGenSig(){
  try{return [FS.subjek,FS.refs.map(function(r){return r.id+':'+(r.focus||'');}).join(','),FS.produkNama,FS.lokasi,FS.cahaya,FS.angle,FS.mood,FS.pose].join('|');}catch(e){return '';}
}
function fGenerate(){
  // FITUR BARU (permintaan user): lepas blur akhir tur (pbTourFinishExt())
  // begitu tombol Generate benar-benar ditekan. DULU ini langsung membuka
  // semuanya normal lagi — SEKARANG, kalau generate ini memang bagian dari
  // sesi tur (ditandai class pb-tour-final-blur masih menyala persis
  // sebelum baris ini), area Ringkasan/Karakter Sheet/Punya Prompt
  // Lama/Generate Variasi malah disembunyikan TOTAL (pb-tour-result-simple)
  // supaya user pemula cuma lihat hasil prompt-nya saja, tidak dibuat
  // bingung — lihat pbTourAfterGenActive & pbShowSaveJsonNotif() di bawah.
  // FIX IMPOR: sebutkan step mana yang masih kosong (dulu cuma "Lengkapi semua step dulu!" tanpa petunjuk).
  if(FS.importActive && !FS.povProduk){
    // FIX IMPOR + FOTO LOKASI: kalau user menambah foto Lokasi setelah impor, Lokasi & Cahaya otomatis diambil dari foto itu
    // (sama seperti alur manual), bukan dianggap "Belum terisi".
    if(typeof fHasLokasiRef==='function' && fHasLokasiRef() && (!FS.lokasi||!FS.cahaya)){
      let _lr=fSortRefsForOrder(FS.refs.filter(function(r){return r.type!=='outfit_random';})),_ln=1;
      for(let _i=0;_i<_lr.length;_i++){if(_lr[_i].type==='lokasi'){_ln=_i+1;break;}}
      if(!FS.lokasi){FS.lokasi=FS.lokasiLabel='Dari foto lokasi';FS.lokasiDesc='the exact location shown in reference photo '+_ln+' — same architecture, props, background elements, colors, and atmosphere (the place only \u2014 ignore the camera angle, viewpoint, and framing of that photo, and ignore any person in it)';}
      if(!FS.cahaya){FS.cahaya=FS.cahayaLabel='Dari foto lokasi';FS.cahayaDesc='taken entirely from reference photo '+_ln+', with the same light direction, color temperature, softness, contrast, and shadow behavior';}
    }
    let _gm=[];
    let _gNoPose=(FS.subjek==='produk'||(typeof fIsNoChar==='function'&&fIsNoChar()));
    if(!_gNoPose && !FS.pose && !FS.refs.some(function(r){return r.type==='outfit_random'&&r.focus;})) _gm.push('Pose');
    if(!FS.lokasi) _gm.push('Lokasi');
    if(!FS.cahaya) _gm.push('Cahaya');
    if(!FS.angle) _gm.push('Sudut Kamera');
    if(!FS.mood) _gm.push('Mood & Tone');
    if(_gm.length){showToast('Belum terisi: '+_gm.join(', ')+' — klik Edit di Ringkasan untuk mengisinya','error');return;}
  }
  if(FS.povProduk){
    // MODE PRODUK SAJA · POV (lihat blok script pov-js): step Pose & Sudut Kamera tidak dipakai.
    if(FS.refs.some(function(r){return r.type!=='produk';})){showToast('Foto referensi bukan produk saja — buka Foto Ref lalu tekan Lanjut dulu.','error');return;}
    if(!FS.lokasi||!FS.hold||!FS.mood||!FS.cahaya){showToast('Lengkapi semua step dulu!','error');return;}
  } else if(FS.subjek==='produk' || fIsNoChar()){
    if(!FS.lokasi||!FS.cahaya||!FS.angle||!FS.mood){showToast('Lengkapi semua step dulu!','error');return;}
  } else {
    let hasOutfitRandom=FS.refs.some(r=>r.type==='outfit_random'&&r.focus);
    if((!FS.pose&&!hasOutfitRandom)||!FS.lokasi||!FS.cahaya||!FS.angle||!FS.mood){showToast('Lengkapi semua step dulu!','error');return;}
  }
  // FIX IMPORT: FS.refs memang kosong saat mode import (foto referensinya
  // berupa teks dari JSON yang diimpor, tersimpan di FS.importRefPhotos,
  // bukan file foto asli) — jangan blok generate karena itu.
  if(!FS.importActive && FS.refs.length===0){showToast('Tambahkan minimal 1 foto referensi dulu!','error');return;}

  // FIX A1: Re-validasi bahwa pose yang tersimpan masih relevan dengan konteks saat ini.
  // Jika user back dan ganti produkMode/holdKey, FS.pose bisa berisi nilai lama yang tidak sesuai.
  // Cara paling aman: cek apakah f4 masih dalam state 'done'. Jika tidak (user back tapi belum pilih ulang), blok.
  let f4card=document.getElementById('f4');
  if(!FS.povProduk&&!(typeof fIsNoChar==='function'&&fIsNoChar())&&(!f4card||!f4card.classList.contains('done'))){
    showToast('Pilih pose terlebih dahulu (Step Pose belum diisi)!','error');
    return;
  }

  // Re-sync nama produk dari DOM kalau ada kartu foto tipe 'produk' di Step 1
  // (user mungkin edit input setelah step done).
  // FIX BUG TC5 — GENERATE TIDAK PERNAH DIBLOKIR PASCA-IMPOR: sebelumnya blok
  // ini digantung ke "FS.produkMode==='foto'". Tombol chip "Produk" di Step 1
  // (fAddRef('produk')) sebenarnya SELALU bisa dipakai kapan pun — baik di
  // alur manual maupun pasca-import — tanpa syarat produkMode harus 'foto'
  // dulu. Kalau produkMode kebetulan sudah 'pegang' (nilai default pasca-
  // import kalau JSON bawa product block sendiri, lihat fImportPrompt), foto
  // produk BARU yang ditambah lewat Step 1 dengan nama kosong sama sekali
  // tidak tercek di sini — Generate lolos begitu saja. Sekarang dicek
  // langsung berdasarkan ada/tidaknya kartu foto produk itu sendiri, tidak
  // peduli produkMode-nya apa.
  let produkRefs=FS.refs.filter(r=>r.type==='produk');
  if(produkRefs.length>0){
    // FIX: Cek apakah ada foto produk tapi nama belum diisi — arahkan ke Step 1 (foto ref), bukan Step 2
    let emptyProdukRefs=produkRefs.filter(r=>!r.focus||!r.focus.trim());
    if(emptyProdukRefs.length>0){
      showToast('Nama produk di foto '+emptyProdukRefs.map(function(r){let _o=fSortRefsForOrder(FS.refs).filter(function(x){return x.type!=='outfit_random';});return 'F'+(_o.findIndex(function(x){return x.id===r.id;})+1);}).join(', ')+' belum diisi — kembali ke Foto Referensi!','error');
      let genBtn=document.getElementById('f-gen-btn');
      if(genBtn){genBtn.disabled=false;genBtn.innerHTML='<svg class="icon"><use href="#ic-sparkle"></use></svg> Generate Prompt Foto';}
      return;
    }
    let freshNames=produkRefs.map(r=>r.focus?r.focus.trim():'').filter(n=>n);
    if(freshNames.length>0){
      // Step Produk (f2) sudah tidak bisa dibuka: nama produk sekarang HANYA diubah lewat
      // Foto Ref. Kalau namanya berubah, segarkan juga instruksi ignore foto Outfit
      // supaya tidak menyebut nama produk lama.
      let _newNama=freshNames.join(', ');
      let _namaBerubah=(_newNama!==FS.produkNama);
      FS.produkNama=_newNama;
      if(_namaBerubah && typeof fRefreshOutfitConflict==='function'){ try{ fRefreshOutfitConflict(); }catch(_e){} }
    }
  }
  // Re-validasi nama produk sebelum generate (safety net)
  if(FS.produkMode!=='tidak'&&FS.produkMode!==''&&!FS.produkNama){
    // FIX: Pesan disesuaikan — jika produkMode='foto' masalahnya di Step 1, selainnya di Step 2
    // Step 2 (Produk) sudah dihapus — nama produk diisi di kartu foto produk pada Step 1.
    let errStep='Foto Referensi (isi nama di kartu foto produk)';
    showToast('Nama produk belum diisi — ulangi dari '+errStep+'!','error');return;
  }
  // FIX: state tur baru diubah di sini, SETELAH semua validasi lolos.
  let pbWasTourFinalBlur=document.body.classList.contains('pb-tour-final-blur');
  document.body.classList.remove('pb-tour-final-blur');
  let pbSummaryCardEl=document.getElementById('summary-card');
  if(pbSummaryCardEl) pbSummaryCardEl.classList.remove('pb-tour-opened');
  if(pbWasTourFinalBlur){
    document.body.classList.add('pb-tour-result-simple');
    if(typeof pbTourAfterGenActive!=='undefined') pbTourAfterGenActive=true;
  }
  // Loading state pada tombol generate — animasi brand: logo "P" (dua layer
  // gold, meniru logo app) mulai terpisah, lalu menyatu jadi utuh persis
  // sebelum loading 2 detik selesai. Dipakai supaya user mengasosiasikan
  // jeda generate dengan branding aplikasi, bukan cuma spinner generik.
  let genBtn=document.getElementById('f-gen-btn');
  let genBtnOrigHTML=genBtn?genBtn.innerHTML:'';
  if(genBtn){
    genBtn.disabled=true;
    genBtn.classList.add('btn-loading');
    genBtn.innerHTML=
      '<div class="gen-logo-wrap" id="gen-logo-wrap">'+
        '<div class="gen-logo-box">'+
          '<svg class="gen-logo-svg" viewBox="0 0 642 635" xmlns="http://www.w3.org/2000/svg">'+
            '<defs>'+
              '<linearGradient id="genPGrad" x1="0" y1="0" x2="1" y2="1">'+
                '<stop offset="0%" stop-color="#F0D9A0"/>'+
                '<stop offset="100%" stop-color="#B8965F"/>'+
              '</linearGradient>'+
            '</defs>'+
            '<path class="p-layer p-layer-back" pathLength="1" fill="url(#genPGrad)" d="M146,92 L162,109 L179,119 L194,124 L206,126 L346,127 L373,134 L395,146 L386,133 L365,114 L343,102 L318,94 L306,92 Z M349,92 L361,96 L383,109 L401,126 L407,134 L417,154 L420,168 L431,184 L439,201 L444,219 L445,231 L481,231 L479,213 L470,183 L460,163 L443,140 L426,124 L402,108 L381,99 Z M253,195 L267,188 L293,183 L335,183 L345,185 L362,193 L375,205 L382,216 L387,229 L396,208 L399,184 L398,177 L379,162 L355,152 L331,149 L312,153 L285,166 L271,176 Z M291,150 L271,154 L251,161 L237,168 L216,182 L192,207 L182,223 L174,243 L169,271 L169,553 L203,534 L203,268 L208,239 L217,216 L233,192 L261,166 L277,156 Z M481,253 L445,253 L441,277 L435,293 L419,317 L403,333 L387,344 L370,352 L345,358 L279,359 L279,394 L325,394 L364,390 L391,381 L419,365 L447,339 L465,312 L477,281 Z"/>'+
            '<path class="p-layer p-layer-front" pathLength="1" fill="url(#genPGrad)" d="M415,201 L407,228 L397,245 L386,256 L383,267 L377,277 L360,293 L339,301 L259,302 L258,210 L243,224 L236,234 L227,254 L224,271 L224,519 L233,513 L249,497 L258,485 L258,337 L345,335 L364,330 L378,323 L393,312 L402,303 L413,287 L418,276 L423,257 L423,227 Z"/>'+
          '</svg>'+
        '</div>'+
        '<span class="gen-logo-label">Membuat Prompt...</span>'+
      '</div>';
    // Paksa reflow supaya state "terpisah" (dari CSS awal .p-layer-back/-front)
    // benar-benar ke-render dulu sebelum class "merged" ditambahkan.
    void genBtn.offsetWidth;
    setTimeout(function(){
      let w=document.getElementById('gen-logo-wrap');
      if(w)w.classList.add('merged');
    }, 650);
  }
  let _genSig=_fGenSig();
  setTimeout(function(){
    try{
      if(_fGenSig()!==_genSig){showToast('Pilihan berubah saat menunggu — tekan Generate lagi.','error');return;}
      _fDoGenerate();
    }catch(err){
      console.error('fGenerate error:',err);
      showToast('Terjadi kesalahan saat membuat prompt — coba lagi.','error');
    }finally{
      if(genBtn){genBtn.disabled=false;genBtn.classList.remove('btn-loading');genBtn.innerHTML=genBtnOrigHTML||'<svg class="icon"><use href="#ic-sparkle"></use></svg> Generate Prompt Foto';}
    }
  }, 2000);
}

function _fDoGenerate(){
  let built = _fBuildPromptJSON();
  document.getElementById('f-prompt-full').textContent = JSON.stringify(built.fullJson, null, 2);

  // ── Urutan foto — tampil langsung di label (ganti popup notifikasi lama) ──
  fBuildUploadNotice(built.realRefs, built.randomRefs);
  let _fol=document.getElementById('f-out-label'); if(_fol) _fol.innerHTML=_fBuildOutLabelBoxesHTML(built.realRefs);

  let wrap = document.getElementById('f-output-wrap');
  wrap.style.display = 'block'; let _jo=document.getElementById('f-json-output');if(_jo)_jo.style.display='block';
  let _mo=document.getElementById('f-multi-output'); if(_mo){_mo.style.display='none';_mo.innerHTML='';}
  let _ph=document.getElementById('f-preview-placeholder'); if(_ph)_ph.style.display='none';
  setTimeout(() => wrap.scrollIntoView({behavior:'smooth', block:'nearest'}), 100);
  showToast('Prompt berhasil dibuat!','success');

  // Simpan ke histori
  let fullText = document.getElementById('f-prompt-full') ? document.getElementById('f-prompt-full').textContent : '';
  // historyAdd(...) auto-save prompt DIMATIKAN — Riwayat sekarang isinya
  // "halaman tersimpan" manual lewat ikon simpan (lihat pbSaveCurrentPage),
  // bukan lagi teks prompt otomatis tiap generate.
  // Riwayat OTOMATIS Foto (terpisah dari halaman tersimpan manual) — lihat pbAutoFotoRecord.
  try{ if(typeof pbAutoFotoRecord==='function')pbAutoFotoRecord(fullText); }catch(_e){}
} // end _fDoGenerate

// ── Membangun 1 objek JSON prompt. `ov` (opsional) berisi override
// untuk fitur multi-shot: {label, poseOverride, placementOverride,
// kameraNote, forceProdukSaja, introExtra} — dipanggil tanpa argumen
// untuk generate normal (hasilnya identik seperti sebelumnya). ──────
