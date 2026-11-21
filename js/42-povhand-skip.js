// js/42-povhand-skip.js — dipindah dari <script id="povhand-skip-js"> di index.html lama (baris 41472). Isi tidak diubah.
/* v15.7 — PERBAIKAN BENTROK: Cara Tampil "Dipegang tangan (POV)" (mode Produk + Lokasi) vs Sudut Kamera.
   Dulu user masih bisa pilih Low/High/Eye Level (teksnya untuk orang) dan tergabung dengan "POV style (first-person perspective)" di prompt.
   Sekarang sama seperti mode "Produk saja · POV": sudut kamera otomatis POV dan step Sudut Kamera dilewati.
   Cara Tampil lain (hanger / isi sendiri) -> step Sudut Kamera muncul lagi seperti biasa. Dipasang paling akhir = pembungkus terluar. */
(function(){
'use strict';
var LBL='POV (otomatis)';
var DESC='POV style (first-person perspective), as if the viewer is holding the product';
function on(){try{return !!(typeof _fIsPovHandNoChar==='function'&&_fIsPovHandNoChar());}catch(e){return false;}}
function isAuto(){try{return FS.angleLabel===LBL;}catch(e){return false;}}
function sync(){try{fSyncStepNums();}catch(e){}}
function lock(){
  FS.angle=LBL;FS.angleLabel=LBL;FS.angleDesc=DESC;
  try{_fAngle={val:DESC,label:LBL};}catch(e){}
  document.querySelectorAll('#f8 .chip').forEach(function(x){x.classList.remove('sel');});
  var cu=document.getElementById('f8-custom');if(cu)cu.value='';
  try{doneCard('f8','fa8',LBL);}catch(e){}
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
    if(on()){lock();if(id==='f8')return window.showCard('f5');}
    else if(isAuto())unlock();
  }
  return _sc.apply(this,arguments);
};
/* jaring pengaman: Sudut Kamera tidak boleh dibuka lewat Ringkasan / Lompat ke step saat dikunci POV */
var _se=window.fSummaryEdit;
if(typeof _se==='function')window.fSummaryEdit=function(n){
  if(Number(n)===8&&on()){try{showToast('Sudut kamera otomatis POV. Ganti Cara Tampil kalau mau pilih sudut lain.','info');}catch(e){}return;}
  return _se.apply(this,arguments);
};
/* tombol Kembali di Mood & Tone: langsung ke Cara Tampil */
var _b9=window.fBack9;
if(typeof _b9==='function')window.fBack9=function(){
  if(!on())return _b9.apply(this,arguments);
  fBack5();
  try{_fAngle=null;}catch(e){}
  FS.angle='';FS.angleLabel='';FS.angleDesc='';
  FS.mood='';FS.moodLabel='';
  document.querySelectorAll('#f9 .chip').forEach(function(c){c.classList.remove('sel');});
  var m=document.getElementById('f9-custom');if(m)m.value='';
  var n=document.getElementById('f9-counter');if(n){n.textContent='0 / 300';n.className='inp-counter';}
  var a=document.getElementById('fa9');if(a)a.textContent='';
  var g=document.getElementById('f-gen-area');if(g)g.classList.add('hidden');
};
})();
