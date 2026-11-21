// fitur/video-mirror-selfie.js — Video — mode Mirror Selfie.
// Bagian dari js/10-main-app.js lama (baris 24450–24679). Isi tidak diubah.
// ══════════════════════════════════════════════════════════════════
// MODE "MIRROR SELFIE" (revisi permintaan user, Sept 2026): tanpa form Nama
// Produk / foto produk / Gerakan-Pose. Begitu chip diklik LANGSUNG muncul 1
// prompt siap-salin (sama polanya dengan Mode 4). "Atur Detail" membuka kolom
// "Isi": kalau diisi, Prompt 1 otomatis ditambah kalimat "muncul tulisan kecil
// banget…" DAN muncul Prompt 2 = versi Original tanpa tambahan itu. Kolom
// dikosongkan lagi → Prompt 2 hilang, Prompt 1 balik ke versi dasar.
// Karakter tidak berbicara, jadi wizard V2-V5 dilewati.
// ══════════════════════════════════════════════════════════════════
const VB_MIRROR_ACTION_TEXT='The character is recording themselves with a phone held in their hand, mirror selfie style, with an elegant and graceful pose. They do not speak, only subtle gentle movements.';
function _vbMirrorBasePrompt(){
  return VB_REF_MODE_TEXT.satu+' '+VB_MIRROR_ACTION_TEXT;
}
function _vbMirrorOverlayValue(){
  let inp=document.getElementById('vb-mirrorselfie-overlay-input');
  return inp?inp.value.trim():'';
}
// Prompt 1 = dasar (+ kalimat overlay kalau kolom Isi terisi).
function _vbMirrorPrompt1(){
  let txt=_vbMirrorBasePrompt();
  let ov=_vbMirrorOverlayValue();
  if(ov)txt+=' '+_vbOverlaySentence(ov).replace(/^\.\s*/,'');
  return txt;
}
// Prompt 2 = versi Original, tanpa tambahan kalimat overlay.
function _vbMirrorPrompt2(){
  return _vbMirrorBasePrompt();
}
function _vbMirrorRefresh(){
  let hasOv=!!_vbMirrorOverlayValue();
  let p1=document.getElementById('vb-mirrorselfie-prompt-1');
  let p2=document.getElementById('vb-mirrorselfie-prompt-2');
  let l1=document.getElementById('vb-mirrorselfie-label-1');
  let card2=document.getElementById('vb-mirrorselfie-card-2');
  if(p1)p1.textContent=_vbMirrorPrompt1();
  if(p2)p2.textContent=_vbMirrorPrompt2();
  if(l1)l1.textContent=hasOv?'Prompt 1 — Mirror Selfie (+ tulisan kecil)':'Prompt — Mirror Selfie';
  if(card2)card2.classList.toggle('hidden',!hasOv);
}
function vbMirrorOverlayInput(){ _vbMirrorRefresh(); }
function vbCopyMirrorPrompt(n){
  let txt=(n===2)?_vbMirrorPrompt2():_vbMirrorPrompt1();
  _copyTextRobust(txt,function(){showToast('Prompt tersalin!','success');},function(){showToast('Gagal salin — coba tap & tahan teksnya lalu Copy','error');});
}
// Buka/tutup kolom "Isi" lewat tombol "Atur Detail".
function vbToggleMirrorOverlay(){
  let box=document.getElementById('vb-mirrorselfie-overlay-box');
  let btn=document.getElementById('vb-mirrorselfie-overlay-toggle');
  if(!box)return;
  let opening=box.classList.contains('hidden');
  box.classList.toggle('hidden');
  if(btn)btn.textContent=opening?'– Sembunyikan detail':'+ Atur Detail (opsional)';
  if(opening){let inp=document.getElementById('vb-mirrorselfie-overlay-input');if(inp)inp.focus();}
}

function vbReset(){
  showConfirm('Semua data video akan dihapus dan kamu mulai dari awal.',vbResetNow);
}
// Inti reset wizard Video TANPA dialog konfirmasi (dipakai vbReset() &
// pbReplayTour()).
function vbResetNow(){
  (function(){
    // Buang juga sisa "step yang ketutup sementara karena lagi diedit" —
    // sama seperti fResetFrom() di tab Foto, biar tidak ada entri nyangkut
    // yang salah unhide di sesi berikutnya.
    STEP_PAUSE_STACK.video=[];
    // FIX BUG (ditemukan saat audit): reset ini sebelumnya tidak menyertakan
    // hookType/hookTypeLabel, padahal keduanya ada di deklarasi awal VB (di
    // atas). Akibatnya setelah reset, VB.hookType/hookTypeLabel jadi
    // `undefined` alih-alih string kosong — bentuk objek jadi tidak
    // konsisten dengan state awal. Disamakan lagi di sini.
    VB={age:'',ageLabel:'',gender:'',genderLabel:'',pitch:'',pitchLabel:'',motion:'',accent:'',accentLabel:'',accentStyle:'',accentStyleLabel:'',accentStyleFor:'',script:'',refMode:'satu',mode3Produk:'',mode3Lokasi:'',mode3LokasiLabel:'',mode3Lighting:'',mode3LightingLabel:'',bulkTargetAudience:'',produkFotoBase64:'',produkFotoMime:'',produkFotoExtra:[],hookType:'',hookTypeLabel:''};
    VB_BULK_PRODUCTS=[];
    // FIX BUG "SEMUA STEP VIDEO HILANG SELAMANYA SETELAH RESET": sama persis
    // dengan bug fResetFrom() di tab Foto — doneCard() SELALU menambahkan
    // class 'hidden' begitu satu step (v1-v5) selesai diisi (lihat komentar
    // "SEMBUNYIKAN STEP YANG SUDAH SELESAI" di doneCard). Baris di bawah ini
    // sebelumnya tidak pernah melepas 'hidden' sama sekali — cuma urus
    // 'done'/'pending' — jadi begitu user klik "Buat Prompt Video Baru"
    // setelah minimal 1 step selesai, step itu (dan semua step v1-v5 yang
    // juga pernah selesai) tetap ketutup display:none SELAMANYA, walau
    // wizard sudah "direset" ke Step 1. Sekarang 'hidden' selalu dilepas.
    ['v1','v2','v3','v4','v5'].forEach(function(id,i){
      let c=document.getElementById(id);
      if(c&&c.dataset)delete c.dataset.reopened;
      if(c){c.classList.remove('done','hidden');if(i>0)c.classList.add('pending');else c.classList.remove('pending');}
      let ans=document.getElementById('va'+(i+1)); if(ans)ans.textContent='';
      let cb=document.getElementById(id+'-confirmbar'); if(cb)cb.remove();
    });
    // Step Durasi Video (id vdur, di luar daftar v1-v5): kembalikan ke kondisi awal. VB.durasi ikut kosong lewat reset VB.
    (function(){
      let dc=document.getElementById('vdur');
      if(dc){if(dc.dataset)delete dc.dataset.reopened;dc.classList.remove('done','hidden');dc.classList.add('pending');}
      let da=document.getElementById('vadur');if(da)da.textContent='';
      let dcb=document.getElementById('vdur-confirmbar');if(dcb)dcb.remove();
      document.querySelectorAll('#vb-dur-chips .chip').forEach(function(c){c.classList.remove('sel');});
      let dg=document.getElementById('vb-dur-go');if(dg)dg.disabled=true;
    })();
    document.querySelectorAll('#vb-gender-chips .chip').forEach(c=>c.classList.remove('sel'));
    // FIX BUG#11: vbReset() sebelumnya cuma bersihin class 'sel' di chip Gender,
    // padahal VB.age/pitch/accent juga ikut dikosongkan di atas. Chip Usia
    // (#vb-age-chips), Nada Bicara (di dalam #v3), dan Aksen (di dalam #v4)
    // tidak pernah disentuh, jadi chip lama tetap kelihatan ke-highlight
    // walau datanya sudah kosong. Tambahkan pembersihan untuk ketiganya.
    document.querySelectorAll('#vb-age-chips .chip').forEach(c=>c.classList.remove('sel'));
    try{vbPitchPlate('');}catch(eP){} // Nada Bicara (pelat geser)
    try{vbAksenPlate('');}catch(eAp){} // Aksen (pelat geser + contoh ucapan)
    document.querySelectorAll('#v4 .chips .chip').forEach(c=>c.classList.remove('sel'));
    try{VB_AKSEN_STYLE_PENDING='';vbRenderAksenStyleChips('');}catch(eAs){} // chip "Gaya khas aksen" ikut disembunyikan
    // Step 4 Motion Karakter (id vmotion, di luar daftar v1-v5 di atas): reset kartu,
    // pilihan chip, kolom isi sendiri, & counter-nya. VB.motion sudah '' lewat reset VB.
    (function(){
      let mc=document.getElementById('vmotion');
      if(mc&&mc.dataset)delete mc.dataset.reopened;
      if(mc){mc.classList.remove('done','hidden');mc.classList.add('pending');}
      let ma=document.getElementById('vamotion'); if(ma)ma.textContent='';
      let mcb=document.getElementById('vmotion-confirmbar'); if(mcb)mcb.remove();
      document.querySelectorAll('#vmotion .chip').forEach(c=>c.classList.remove('sel'));
      if(typeof _vbMotionDrawChips==='function')_vbMotionDrawChips();
      let mi=document.getElementById('vmotion-custom'); if(mi)mi.value='';
      let mcnt=document.getElementById('vmotion-counter'); if(mcnt){mcnt.textContent='0 / 80';mcnt.className='inp-counter';}
    })();
    // Reset kartu Pergerakan Kamera (khusus Raw Asset). VB.camMove ikut kosong lewat reset VB.
    (function(){
      let cc=document.getElementById('vcam');
      if(cc&&cc.dataset)delete cc.dataset.reopened;
      if(cc){cc.classList.remove('done','hidden');cc.classList.add('pending');}
      let ca=document.getElementById('vacam'); if(ca)ca.textContent='';
      let ccb=document.getElementById('vcam-confirmbar'); if(ccb)ccb.remove();
      document.querySelectorAll('#vcam .chip').forEach(c=>c.classList.remove('sel'));
      _vbCamPendMove='';_vbCamPendHook='';
      try{_vbRenderCamChips();}catch(e){}
    })();
    vbPickRefMode('satu');
    let m3lc=document.getElementById('vb-mode3-lokasi-custom'); if(m3lc)m3lc.value='';
    let m3ligc=document.getElementById('vb-mode3-lighting-custom'); if(m3ligc)m3ligc.value='';
    let m3mp=document.getElementById('vb-manual-mode3-produk'); if(m3mp)m3mp.value='';
    document.querySelectorAll('#vb-mode3-lokasi-chips .chip,#vb-mode3-lighting-chips .chip').forEach(c=>c.classList.remove('sel'));
    vbMode3ResetSteps();
    document.getElementById('v3-custom').value='';
    document.getElementById('v4-custom').value='';
    let v3cnt=document.getElementById('v3-counter'); if(v3cnt){v3cnt.textContent='0 / 80';v3cnt.className='inp-counter';}
    let v4cnt=document.getElementById('v4-counter'); if(v4cnt){v4cnt.textContent='0 / 120';v4cnt.className='inp-counter';}
    VB_SINGLE_OVERLAY=null;
    VB_MODE4_OVERLAY_TEXT='';
    let vbM4OvInp=document.getElementById('vb-mode4-overlay-input'); if(vbM4OvInp)vbM4OvInp.value='';
    let vbM4OvBox=document.getElementById('vb-mode4-overlay-box'); if(vbM4OvBox)vbM4OvBox.classList.add('hidden');
    let vbM4OvToggle=document.getElementById('vb-mode4-overlay-toggle'); if(vbM4OvToggle)vbM4OvToggle.textContent='+ Atur Detail (opsional)';
    let vbM4Pre=document.getElementById('vb-mode4-prompt-text'); if(vbM4Pre)vbM4Pre.textContent=VB_MODE4_PROMPT_TEXT;
    document.querySelectorAll('#vb-hook-chips .chip').forEach(c=>c.classList.remove('sel'));
    let vbHookCustomBox=document.getElementById('vb-hook-custom-box'); if(vbHookCustomBox)vbHookCustomBox.classList.add('hidden');
    let vbHookCustomInp=document.getElementById('vb-hook-custom-input'); if(vbHookCustomInp)vbHookCustomInp.value='';
    if(typeof vbRemoveProdukFoto==='function')vbRemoveProdukFoto(); // reset state + preview foto referensi mode single
    // FIX (Sept 2026): vb-script-hook/story/cta & vb-wc-hook/story/cta sudah
    // DIHAPUS dari HTML (jalur manual sekarang langsung ke kartu hasil, lihat
    // vbManualLiveInit) — getElementById tanpa cek null di sini dulu bikin
    // vbReset() error/berhenti di tengah jalan. Baris lama dibuang, cukup
    // kosongkan #vb-manual-mode3-produk (masih ada) di bawah.
    let manualMode3Produk=document.getElementById('vb-manual-mode3-produk'); if(manualMode3Produk)manualMode3Produk.value='';
    // FITUR BARU (permintaan user): reset juga cache & jumlah produk manual
    // ("Mau bikin berapa produk?"), biar sesi baru mulai dari 1 produk lagi.
    VB_MANUAL_ROW_CACHE=[];
    VB_MANUAL_COUNT=1;
    let manualCountInp=document.getElementById('vb-manual-count'); if(manualCountInp)manualCountInp.value='1';
    let manualCountWrap2=document.getElementById('vb-manual-count-wrap'); if(manualCountWrap2)manualCountWrap2.classList.add('hidden');
    let mo=document.getElementById('vb-multi-output'); if(mo){mo.style.display='none';mo.innerHTML='';}
    let eb=document.getElementById('vb-ai-error'); if(eb){eb.classList.add('hidden');eb.textContent='';}
    let manualArea=document.getElementById('vb-manual-script-area'); if(manualArea)manualArea.classList.add('hidden');
    let aiArea=document.getElementById('vb-mode-ai-area'); if(aiArea)aiArea.classList.add('hidden');
    // Mirror Selfie sekarang bagian dari Step 1 (Mode Referensi Foto) —
    // area-nya (#vb-mode-selfie-area) & chip-nya sudah otomatis ikut
    // direset lewat vbPickRefMode('satu') di atas. Di sini cuma bersihkan
    // isian field-nya sendiri biar tidak nyangkut ke sesi berikutnya.
    let mirrorOvInp=document.getElementById('vb-mirrorselfie-overlay-input'); if(mirrorOvInp)mirrorOvInp.value='';
    let mirrorOvBox=document.getElementById('vb-mirrorselfie-overlay-box'); if(mirrorOvBox)mirrorOvBox.classList.add('hidden');
    let mirrorOvToggle=document.getElementById('vb-mirrorselfie-overlay-toggle'); if(mirrorOvToggle)mirrorOvToggle.textContent='+ Atur Detail (opsional)';
    _vbMirrorRefresh();
    // Mode tess juga ikut direset ke step 1 ("Lanjut →") biar sesi baru
    // tidak kebawa nama produk / hasil prompt dari sesi sebelumnya.
    vbTessResetFlow();
    vbFeResetFlow();
    vbUiResetFlow();
    document.querySelectorAll('#vb-mode-ai,#vb-mode-manual').forEach(c=>c.classList.remove('sel'));
    let bulkRows=document.getElementById('vb-bulk-rows'); if(bulkRows)bulkRows.innerHTML='';
    VB_BULK_ROW_CACHE=[]; // FIX BUG#15: cache baris bulk juga wajib ikut bersih saat reset, biar tidak bocor ke sesi generate berikutnya
    VB_BULK_REVISI_BACKUP={}; // FITUR BARU: backup+jatah revisi per-produk juga wajib ikut bersih saat reset
    VB_REVISI_FOTO_OVERRIDE={}; // override foto panel Revisi juga wajib ikut bersih, biar tidak bocor ke sesi berikutnya
    let bulkCount=document.getElementById('vb-bulk-count'); if(bulkCount)bulkCount.value='1';
    let bulkTarget=document.getElementById('vb-bulk-target'); if(bulkTarget)bulkTarget.value='';
    VB_TA_PRESET={};
    vbResetSapaan();
    try{vbInfoReset();}catch(_e){}
    document.querySelectorAll('#vb-bulk-area .chip.sel').forEach(function(c){if(c.getAttribute('onclick')&&c.getAttribute('onclick').indexOf('vbPickTargetAudiencePreset')===0)c.classList.remove('sel');});
    let bulkArea=document.getElementById('vb-bulk-area'); if(bulkArea)bulkArea.classList.remove('hidden');
    let bulkErr=document.getElementById('vb-bulk-error'); if(bulkErr){bulkErr.classList.add('hidden');bulkErr.textContent='';}
    PB_AUTO_VIDEO_SID='';PB_AUTO_VIDEO_SIG=''; VB_BULK_LAST_CONTEXT=null; // reset builder — buang juga sisa sesi "Lanjutkan" kalau ada, biar tidak nyangkut ke sesi produk berikutnya
    _vbSyncBulkMainButton();
    VB_BULK_ITEMS=[];
    VB_CARD_TAMPIL={};
    VB_CARD_LOKASI={};
    VB_PRODUCT_FOTOCOUNT={};
    VB_HOOK_OVERLAY={};
    VB_CHAR_OVR={};
    vbUpdateProgress(1,'Prompt Video AI');
    // FIX BUG#1: sama seperti saat init — vbUpdateProgress(1,...) hitung 20%,
    // override balik ke 0% karena user baru saja reset (belum isi apa-apa).
    (function(){
      let vfill=document.getElementById('vb-progress-fill');
      if(vfill)vfill.style.width='0%';
    })();
    // FIX BUG "TAMPILAN KOSONG" SETELAH RESET (sama seperti fReset() di tab
    // Foto): v1.scrollIntoView(...) tidak pernah ngefek karena method itu
    // sudah dioverride global jadi no-op. Ganti scroll manual ke .app-shell
    // supaya user beneran kelempar balik ke Step 1 setelah reset video,
    // bukan tetap diam di posisi scroll bawah (area output yang baru saja
    // dikosongkan).
    let _appShellVReset=document.querySelector('.app-shell');
    if(_appShellVReset) _appShellVReset.scrollTo({top:0,behavior:'smooth'});
    if(typeof pbResetProgress==='function') pbResetProgress();
  })();
}


// FIX #7: Peringatkan user jika menutup/refresh tab saat generate Mode AI sedang berjalan
// Browser modern tidak menampilkan pesan custom, tapi dialog konfirmasi standar tetap muncul
// ============================================================




