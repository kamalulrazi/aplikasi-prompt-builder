// js/33-foto-referensi-lokasi.js — dipindah dari <script> di index.html lama (baris 40287). Isi tidak diubah.
/* v14.34/14.35 — FOTO REFERENSI "LOKASI": kalau user menambah foto lokasi, step Lokasi (f5) & Pencahayaan (f7)
   otomatis dilewati (kedua isinya diambil dari foto lokasi) dan alur langsung lanjut ke Sudut Kamera (f8).
   Dibungkus di showCard() supaya semua jalur masuk ke f5/f7 (pilih pose, produk saja, dll) ikut terlewati. */
(function(){
  if(typeof showCard!=='function')return;
  var _origShowCard=showCard;
  function lokasiNo(){
    var l=fSortRefsForOrder(FS.refs.filter(function(r){return r.type!=='outfit_random';}));
    for(var i=0;i<l.length;i++){if(l[i].type==='lokasi')return i+1;}
    return 1;
  }
  function applySkip(){
    var n=lokasiNo(),lbl='Dari foto lokasi';
    var lokDesc='the exact location shown in reference photo '+n+' — same architecture, props, background elements, colors, and atmosphere';
    var cahDesc='taken entirely from reference photo '+n+', with the same light direction, color temperature, softness, contrast, and shadow behavior';
    FS.lokasi=lbl;FS.lokasiLabel=lbl;FS.lokasiDesc=lokDesc;
    FS.cahaya=lbl;FS.cahayaLabel=lbl;FS.cahayaDesc=cahDesc;
    try{_fCahaya={val:cahDesc,label:lbl};}catch(e){}
    doneCard('f5','fa5',lbl);
    doneCard('f7','fa7',lbl);
    if(typeof fSyncStepNums==='function')fSyncStepNums();
  }
  showCard=function(id){
    if((id==='f5'||id==='f7')&&typeof fHasLokasiRef==='function'&&fHasLokasiRef()){
      applySkip();
      var f8=document.getElementById('f8');
      if(f8&&!f8.classList.contains('done')){
        fUpdateProgress(8,'Sudut Kamera');
        return _origShowCard('f8');
      }
      /* FIX LAYAR KOSONG / USER TERJEBAK (dilaporkan user): saat user mengubah "Cara Tampil Produk" (atau step lain)
         di mode Foto Lokasi / Produk + Lokasi, Lokasi & Pencahayaan otomatis dilewati. Kalau Sudut Kamera (f8) sudah
         selesai, dulu fungsi ini langsung return tanpa menampilkan apa pun -> semua kartu 'done', header "Siap dibuat",
         tapi area Generate tetap tersembunyi. Sekarang lanjut ke step berikutnya yang belum selesai (Mood & Tone),
         dan kalau semuanya sudah terisi, tampilkan area Generate. */
      var f9=document.getElementById('f9');
      if(f9&&(!f9.classList.contains('done')||!FS.mood)){
        fUpdateProgress(9,'Mood & Tone');
        return _origShowCard('f9');
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
    return _origShowCard(id);
  };
})();
