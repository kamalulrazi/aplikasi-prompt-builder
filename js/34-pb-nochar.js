// js/34-pb-nochar.js — dipindah dari <script id="pb-nochar-js"> di index.html lama (baris 40341). Isi tidak diubah.
/* MODE PRODUK + LOKASI SAJA (permintaan user): kalau Foto Referensi cuma berisi Produk dan Lokasi,
   step Pose dilewati (tidak ada karakter) dan chip \"Dipakai ke karakter\" di Cara Tampil disembunyikan.
   Dibungkus di showCard() supaya semua jalur masuk ke f3/f4 ikut tertangani. */
(function(){
  if(typeof showCard!=='function'||typeof fIsNoChar!=='function')return;
  var _prev=showCard;
  /* Produk + Lokasi: chip "Dipegang & diarahkan ke kamera" jadi "Dipegang tangan (POV)" (tangan memegang produk, sudut pandang orang pertama).
     Dipanggil dari showCard('f3') DAN saat kartu dibuka ulang lewat Edit di Ringkasan / "Lompat ke step" (jalur itu tidak lewat showCard). */
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
  var _rs=window.fRestoreStepUI;
  if(typeof _rs==='function'){
    window.fRestoreStepUI=function(n){
      var r=_rs.apply(this,arguments);
      if(Number(n)===3){try{pbHoldChipSync();}catch(e){}}
      return r;
    };
  }
  showCard=function(id){
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
    return _prev(id);
  };
})();
