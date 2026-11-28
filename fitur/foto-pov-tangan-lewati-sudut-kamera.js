// fitur/foto-pov-tangan-lewati-sudut-kamera.js — (dulu js/42-povhand-skip.js) dipindah dari <script id="povhand-skip-js"> di index.html lama.
/* v15.7 — PERBAIKAN BENTROK: Cara Tampil "Dipegang tangan (POV)" (mode Produk + Lokasi) vs Sudut Kamera.
   Dulu user masih bisa pilih Low/High/Eye Level (teksnya untuk orang) dan tergabung dengan "POV style (first-person perspective)" di prompt.
   Sekarang sama seperti mode "Produk saja · POV": sudut kamera otomatis POV dan step Sudut Kamera dilewati.
   Cara Tampil lain (hanger / isi sendiri) -> step Sudut Kamera muncul lagi seperti biasa. Dipasang paling akhir = pembungkus terluar.

   v15.8 (Nov 2026, permintaan user) — FOTO POSE: kalau user menambah foto "Pose Referensi" di Foto Referensi, step Sudut Kamera
   DISEMBUNYIKAN dan sudut kamera WAJIB mengikuti foto pose itu (label "Ikut foto pose (otomatis)").
   Teks sudut kamera final dibuat di foto-susun-prompt.js (_fPoseAngleDesc) supaya nomor foto selalu benar.
   Foto pose dihapus -> step Sudut Kamera muncul lagi seperti biasa. */
/* v18.41 (Nov 2026, permintaan user) — MODE FACELESS: kalau Foto Referensi cuma Outfit atau Outfit + Lokasi (fIsOutfitOnly()),
   step Sudut Kamera DISEMBUNYIKAN dan sudut kamera dikunci ke framing faceless potongan rapat (sejak 28 Nov 2026; label "Faceless · Potongan rapat (otomatis)",
   teks di foto-susun-prompt.js: _F_FACELESS_ANGLE_DESC). Prioritas mode kunci: pov > pose > faceless. Alur lompat/kembali sama dengan mode foto pose. */
(function(){
'use strict';
var LBL='POV (otomatis)';
var DESC='POV style (first-person perspective), as if the viewer is holding the product';
var LBL_POSE=(typeof _F_POSE_ANGLE_LBL!=='undefined')?_F_POSE_ANGLE_LBL:'Ikut foto pose (otomatis)';
var LBL_FACELESS=(typeof _F_FACELESS_ANGLE_LBL!=='undefined')?_F_FACELESS_ANGLE_LBL:'Faceless \u00b7 Potongan rapat (otomatis)';
/* label lama (sebelum 28 Nov 2026) masih dikenali sebagai label otomatis, supaya state tersimpan lama tetap bisa dilepas kuncinya */
var LBL_FACELESS_OLD='Faceless \u00b7 Full-length (otomatis)';
function facelessOn(){
  try{
    if(povOn()||poseOn())return false;
    return !!(typeof fIsOutfitOnly==='function'&&fIsOutfitOnly());
  }catch(e){return false;}
}
function lblOf(m){return m==='pose'?LBL_POSE:(m==='faceless'?LBL_FACELESS:LBL);}
function povOn(){try{return !!(typeof _fIsPovHandNoChar==='function'&&_fIsPovHandNoChar());}catch(e){return false;}}
function poseOn(){
  try{
    if(povOn())return false;
    if(typeof fHasPoseRef!=='function'||!fHasPoseRef())return false;
    if(typeof fIsNoChar==='function'&&fIsNoChar())return false;
    return true;
  }catch(e){return false;}
}
/* mode kunci aktif: 'pov' | 'pose' | 'faceless' | '' */
function mode(){return povOn()?'pov':(poseOn()?'pose':(facelessOn()?'faceless':''));}
function on(){return mode()!=='';}
function isAuto(){try{return FS.angleLabel===LBL||FS.angleLabel===LBL_POSE||FS.angleLabel===LBL_FACELESS||FS.angleLabel===LBL_FACELESS_OLD;}catch(e){return false;}}
function sync(){try{fSyncStepNums();}catch(e){}}
function poseDesc(){
  var n=1;try{n=_scPoseNo();}catch(e){}
  try{return _fPoseAngleDesc(n);}catch(e){}
  return 'follow the exact camera angle of pose reference photo '+n+' \u2014 same camera height, shooting direction, tilt, distance, lens perspective, and framing as in that photo';
}
function facelessDesc(){
  try{if(typeof _F_FACELESS_ANGLE_DESC!=='undefined')return _F_FACELESS_ANGLE_DESC;}catch(e){}
  return 'tight crop at chest height, about 1 meter from the subject; the top edge of the image sits at the collarbone, just below the chin, and the bottom edge cuts at the lower hem of the outfit, around the ankles; the subject fills almost the whole frame; casual TikTok outfit check, not a mirror selfie, no phone visible';
}
function lock(m){
  m=m||mode();
  var lbl=lblOf(m);
  var desc=(m==='pose')?poseDesc():(m==='faceless'?facelessDesc():DESC);
  FS.angle=lbl;FS.angleLabel=lbl;FS.angleDesc=desc;
  try{_fAngle={val:desc,label:lbl};}catch(e){}
  document.querySelectorAll('#f8 .chip').forEach(function(x){x.classList.remove('sel');});
  var cu=document.getElementById('f8-custom');if(cu)cu.value='';
  try{doneCard('f8','fa8',lbl);}catch(e){}
  var c=document.getElementById('f8');
  if(c){c.classList.add('done','hidden');c.classList.remove('pending');}
  sync();
}
function unlock(){
  FS.angle='';FS.angleLabel='';FS.angleDesc='';
  try{_fAngle=null;}catch(e){}
  var c=document.getElementById('f8');
  if(c){c.classList.remove('done','hidden');c.classList.add('pending');}
  var a=document.getElementById('fa8');if(a)a.textContent='';
  sync();
}
/* samakan state kunci dengan kondisi foto referensi saat ini (dipanggil sebelum Ringkasan / Generate / Konfirmasi Foto Ref) */
function applyLock(allowUnlock){
  var m=mode();
  if(m){
    var want=lblOf(m);
    if(!FS||FS.angleLabel!==want||!FS.angle)lock(m);
  }else if(allowUnlock&&isAuto()){unlock();}
}
/* nomor step & menu langkah: Sudut Kamera tidak dihitung saat dikunci */
var _fas=window.fActiveSteps;
if(typeof _fas==='function')window.fActiveSteps=function(){
  var b=_fas.apply(this,arguments);
  return on()?b.filter(function(id){return id!=='f8';}):b;
};
/* alur maju: kunci / buka kunci Sudut Kamera */
var _sc=window.showCard;
if(typeof _sc==='function')window.showCard=function(id){
  if(id==='f5'||id==='f7'||id==='f8'){
    var m=mode();
    if(m){
      lock(m);
      if(id==='f8'){
        if(m==='pov')return window.showCard('f5');
        /* mode foto pose: lompat langsung ke Mood & Tone (Lokasi/Cahaya sudah terisi di titik ini) */
        try{fUpdateProgress(9,'Mood & Tone');}catch(e){}
        return window.showCard('f9');
      }
    }
    else if(isAuto())unlock();
  }
  return _sc.apply(this,arguments);
};
/* jaring pengaman: Sudut Kamera tidak boleh dibuka lewat Ringkasan / Lompat ke step saat dikunci */
var _se=window.fSummaryEdit;
if(typeof _se==='function')window.fSummaryEdit=function(n){
  if(Number(n)===8&&on()){
    try{var _m=mode();showToast(_m==='pose'?'Sudut kamera otomatis mengikuti foto pose. Hapus foto pose kalau mau pilih sudut lain.':(_m==='faceless'?'Sudut kamera otomatis faceless (kepala di luar frame). Tambah foto Karakter Sheet kalau mau pilih sudut lain.':'Sudut kamera otomatis POV. Ganti Cara Tampil kalau mau pilih sudut lain.'),'info');}catch(e){}
    return;
  }
  return _se.apply(this,arguments);
};
/* tombol Kembali di Mood & Tone */
var _b9=window.fBack9;
if(typeof _b9==='function')window.fBack9=function(){
  var m=mode();
  if(!m)return _b9.apply(this,arguments);
  if(m==='pov'){
    /* langsung ke Cara Tampil */
    fBack5();
    try{_fAngle=null;}catch(e){}
    FS.angle='';FS.angleLabel='';FS.angleDesc='';
  }else{
    /* foto pose: lewati Sudut Kamera. Ada foto Lokasi -> mundur ke sebelum Lokasi; tidak ada -> ke Pencahayaan */
    if(typeof fHasLokasiRef==='function'&&fHasLokasiRef()){fBack5();}
    else{fBackTo(9,7);try{fUpdateProgress(7,'Pencahayaan');}catch(e){}}
  }
  FS.mood='';FS.moodLabel='';
  document.querySelectorAll('#f9 .chip').forEach(function(c){c.classList.remove('sel');});
  var m9=document.getElementById('f9-custom');if(m9)m9.value='';
  var n=document.getElementById('f9-counter');if(n){n.textContent='0 / 300';n.className='inp-counter';}
  var a=document.getElementById('fa9');if(a)a.textContent='';
  var g=document.getElementById('f-gen-area');if(g)g.classList.add('hidden');
};
/* user menambah / menghapus foto pose lewat Foto Referensi: sinkronkan kunci SEBELUM alur lanjut.
   Tambah foto pose -> Sudut Kamera terkunci. Hapus foto pose -> kunci lepas, Sudut Kamera dipilih lagi seperti biasa. */
var _kr=window.fKonfirmRef;
if(typeof _kr==='function')window.fKonfirmRef=function(){
  try{applyLock(true);}catch(e){}
  return _kr.apply(this,arguments);
};
/* Ringkasan & tombol Generate: pastikan label sudut kamera sesuai (termasuk prompt hasil impor yang punya foto pose) */
var _rs=window.fRenderSummary;
if(typeof _rs==='function')window.fRenderSummary=function(){
  try{applyLock(false);}catch(e){}
  return _rs.apply(this,arguments);
};
var _gen=window.fGenerate;
if(typeof _gen==='function')window.fGenerate=function(){
  try{applyLock(false);}catch(e){}
  return _gen.apply(this,arguments);
};
})();
