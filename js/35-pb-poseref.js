// js/35-pb-poseref.js — dipindah dari <script id="pb-poseref-js"> di index.html lama (baris 40398). Isi tidak diubah.
/* FOTO REFERENSI "POSE" (permintaan user): kalau user menambah foto Pose, step Pose (f4) otomatis dilewati
   dan isinya diambil dari foto itu. Dibungkus di showCard() supaya semua jalur masuk ke f4 ikut terlewati. */
(function(){
  if(typeof showCard!=='function'||typeof fHasPoseRef!=='function')return;
  var _prevP=showCard;
  try{setTimeout(function(){if(typeof fUpdateCounters==='function')fUpdateCounters();},0);}catch(e){}
  function poseNo(){
    var l=fSortRefsForOrder(FS.refs.filter(function(r){return r.type!=='outfit_random';}));
    for(var i=0;i<l.length;i++){if(l[i].type==='pose')return i+1;}
    return 1;
  }
  showCard=function(id){
    if(id==='f4'&&fHasPoseRef()&&!fIsNoChar()){
      var n=poseNo(),lbl='Dari foto pose';
      FS.pose=lbl;FS.poseLabel=lbl;
      FS.poseDesc='the exact body pose shown in reference photo '+n+' — same head tilt, gaze direction, hand and finger positions, arm and leg positions, posture, body lean, and facing direction, applied to the character';
      var c4=document.getElementById('f4');
      if(c4){c4.classList.add('done','hidden');c4.classList.remove('pending');}
      var a4=document.getElementById('fa4');if(a4)a4.textContent=lbl;
      if(typeof fSyncStepNums==='function')fSyncStepNums();
      if(typeof fUpdateProgress==='function')fUpdateProgress(5,'Lokasi');
      return showCard('f5');
    }
    return _prevP(id);
  };
})();
