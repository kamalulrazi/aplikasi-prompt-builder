// fitur/video-efek-ketik.js — Video — efek mengetik pada kotak skrip (typewriter).
// Bagian dari js/10-main-app.js lama (baris 21977–22473). Isi tidak diubah.
// ══════════════════════════════════════════════════════════════════
// TYPEWRITER ENGINE — masalah yang ditemukan user: Gemini kadang balas
// dalam 1-2 potongan BESAR (bukan kata demi kata dari servernya), jadi
// kalau textarea langsung di-set ke isi potongan itu, kelihatannya
// "loncat muncul sekaligus" alih-alih ngetik pelan. Fix-nya: PISAHKAN
// kecepatan JARINGAN (kapan data sampai — tidak bisa dikontrol) dari
// kecepatan TAMPILAN (berapa cepat huruf muncul di layar — INI yang
// dikontrol di sini). Tiap kali ada teks baru masuk, cuma "target"-nya
// yang di-update; satu interval loop terpisah yang pelan-pelan
// menggeser teks yang TAMPIL menuju target itu dengan kecepatan tetap
// (jadi tetap terasa "real-time", bukan nunggu sampai benar-benar
// selesai baru muncul, tapi juga tidak loncat sekaligus).
// ──────────────────────────────────────────────────────────────────
// ── STATUS "MASIH KOSONG/BELUM SELESAI" PER KARTU (blur teks + logo P
// kecil mini di pojok kartu, lihat CSS .vb-ta-wrap/.vb-ta-loading-badge) ──
// idx diambil dari suffix taId ("vb-bulk-script-3" -> "3") supaya TIDAK
// perlu ubah signature semua fungsi typewriter yang sudah ada.
function _vbCardIdxFromTaId(taId){
  if(!taId)return null;
  let m=/^vb-bulk-script-(\d+)$/.exec(taId);
  return m?m[1]:null;
}
function _vbCardSetLoading(idx,isLoading){
  if(idx===null||idx===undefined)return;
  let wrap=document.getElementById('vb-ta-wrap-'+idx);
  if(!wrap)return; // kartu sudah diganti/dihapus, aman diabaikan
  wrap.classList.toggle('vb-ta-loading',!!isLoading);
  if(typeof _vbAccRefresh==='function')_vbAccRefresh(Math.floor(idx/3));
}
// Matikan blur+logo P di SEMUA kartu yang sedang tampil — dipanggil kalau
// generate gagal/batal (lihat catch di vbGenerate3AI) supaya kartu kosong
// bekas percobaan yang gagal tidak nyangkut blur selamanya.
function _vbClearAllCardLoading(){
  let wrap=document.getElementById('vb-multi-output');
  if(!wrap)return;
  wrap.querySelectorAll('.vb-ta-wrap.vb-ta-loading').forEach(function(el){el.classList.remove('vb-ta-loading');});
}
// ── (26 Okt 2026, permintaan user) KOTAK SKRIP MUNCUL SETELAH PROMPT BERHASIL + TAMPILAN MENGIKUTI KECEPATAN AI ──
// _vbLiveItems = batch yang sedang diproses (diisi _vbRunBulkGenerate) supaya draft AI bisa dipetakan ke kartu yang benar.
var _vbLiveItems=null,_vbLiveArr=null,_vbLiveIdx=null,_vbBatchT0=0,_vbLiveDraftSeen=false,_vbTypeBoost=1;
// makin cepat AI membalas, makin cepat teks muncul di kartu (4x / 2,5x / 1,5x / normal)
function _vbTypeBoostFor(ms){return ms<5000?4:(ms<12000?2.5:(ms<25000?1.5:1));}
// munculkan kotak skrip (dicopot dari mode sembunyi) — fade-in cepat kalau AI cepat
// (31 Okt 2026, permintaan user) Kotak skrip TIDAK lagi dibuka begitu draft AI masuk: selama loader stick man bulk masih jalan
// (termasuk adegan penutup centang), pembukaan DITUNDA. Kotak baru muncul saat adegan penutup benar-benar selesai
// (_glRestore memanggil ulang dengan force=true). ms pertama (waktu AI membalas) disimpan supaya fade-in tetap mengikuti kecepatan AI.
var _vbRevealMs=null;
function _vbRevealScriptBox(ms,force){
  var h=document.documentElement;
  if(!h.classList.contains('vb-gen-wait'))return;
  if(!force){
    var _stR=(typeof _glActive!=='undefined')?_glActive:null;
    if(_stR&&_stR.revealBox&&!_stR.closed){
      if(_vbRevealMs===null&&ms!=null)_vbRevealMs=ms;
      return;
    }
  }
  if(ms==null&&_vbRevealMs!==null)ms=_vbRevealMs;
  _vbRevealMs=null;
  h.classList.remove('vb-gen-wait');
  var mw=document.getElementById('vb-multi-output');
  if(!mw)return;
  var fast=(ms!=null&&ms<6000);
  mw.classList.remove('vb-out-reveal','vb-out-fast');void mw.offsetWidth;
  mw.classList.add('vb-out-reveal');if(fast)mw.classList.add('vb-out-fast');
  setTimeout(function(){mw.classList.remove('vb-out-reveal','vb-out-fast');},fast?260:520);
  setTimeout(function(){try{mw.scrollIntoView({behavior:'smooth',block:'nearest'});}catch(e){}},80);
}
// kedip halus pada kartu yang teksnya baru berubah (perbaikan kata / minta ulang ke AI)
function _vbCardFlash(idx){
  if(idx===null||idx===undefined)return;
  var w=document.getElementById('vb-ta-wrap-'+idx);
  if(!w)return;
  w.classList.remove('vb-ta-fixflash');void w.offsetWidth;w.classList.add('vb-ta-fixflash');
  setTimeout(function(){w.classList.remove('vb-ta-fixflash');},1000);
}
// Tampilkan draft AI (dan hasil perbaikannya) ke kartu produk batch yang sedang berjalan. Aman: kalau pemetaan tidak pasti, dilewati.
function _vbDraftPush(arr,byNo){
  if(!_vbLiveItems||!Array.isArray(arr)||!arr.length)return;
  if(_vbLiveArr!==arr){
    if(byNo===undefined)byNo=arr.every(function(o){return o&&o._bi!=null;});
    var okMap=byNo
      ?arr.every(function(o){return o&&o._bi!=null&&_vbLiveItems[o._bi]&&_vbLiveItems[o._bi].p&&_vbLiveItems[o._bi].p.nama===o.produk;})
      :(arr.length===_vbLiveItems.length&&arr.every(function(o,j){return o&&_vbLiveItems[j]&&_vbLiveItems[j].p&&_vbLiveItems[j].p.nama===o.produk;}));
    if(!okMap){_vbLiveArr=null;_vbLiveIdx=null;return;}
    _vbLiveArr=arr;
    _vbLiveIdx=arr.map(function(o,j){return byNo?_vbLiveItems[o._bi].idx:_vbLiveItems[j].idx;});
  }
  var el=Date.now()-(_vbBatchT0||Date.now());
  if(!_vbLiveDraftSeen){
    _vbLiveDraftSeen=true;
    _vbTypeBoost=_vbTypeBoostFor(el);
    try{genLogoEvent('draft');}catch(e){}
  }
  _vbRevealScriptBox(el);
  arr.forEach(function(o,j){if(o&&_vbLiveIdx[j]!=null)_vbUpdateProductCardsLive(_vbLiveIdx[j],o);});
}
// tunggu animasi ketik live selesai (maks maxMs) sebelum render final, supaya tidak terpotong mendadak
function _vbTypewriterFlush(maxMs){
  _vbTypeBoost=Math.max(_vbTypeBoost,4);
  return new Promise(function(res){
    var t0=Date.now();
    (function w(){if(!_vbTypewriter.timer||Date.now()-t0>=maxMs)return res();setTimeout(w,40);})();
  });
}
const _vbTypewriter={targets:{},timer:null};
function _vbTypewriterReset(){
  _vbTypeBoost=1;
  _vbTypewriter.targets={};
  if(_vbTypewriter.timer){clearInterval(_vbTypewriter.timer);_vbTypewriter.timer=null;}
}
function _vbTypewriterSetTarget(taId,fullText,onTick){
  let _prevT=_vbTypewriter.targets[taId];
  _vbTypewriter.targets[taId]={text:fullText||'',onTick:onTick||null};
  if(_prevT&&_prevT.text&&_prevT.text!==(fullText||''))_vbCardFlash(_vbCardIdxFromTaId(taId)); // teks berubah (perbaikan kata) -> kedip
  if(!_vbTypewriter.timer){
    _vbTypewriter.timer=setInterval(function(){
      let anyPending=false;
      for(let taId2 in _vbTypewriter.targets){
        let t=_vbTypewriter.targets[taId2];
        let ta=document.getElementById(taId2);
        if(!ta)continue; // kartu sudah diganti/dihapus (mis. generate baru), lewati aman
        let shown=ta.value||'';
        let target=t.text||'';
        let cardIdx=_vbCardIdxFromTaId(taId2);
        if(shown.length<target.length){
          // tanpa animasi ketik: teks langsung tampil utuh (anyPending tidak dipakai lagi)
          ta.value=target; // (8 Nov 2026, permintaan user) TANPA efek ketik: teks langsung tampil utuh
          _vbCardSetLoading(cardIdx,false); // teks sudah penuh -> blur & logo P kecil dimatikan
          if(typeof t.onTick==='function')t.onTick();
        }else if(shown.length>target.length){
          // Kasus jarang: target (hasil terbaru) lebih pendek dari yang
          // sudah tampil — samakan langsung, tidak perlu animasi mundur.
          ta.value=target;
          _vbCardSetLoading(cardIdx,target.length===0);
          if(typeof t.onTick==='function')t.onTick();
        }else if(target.length>0){
          if(ta.value!==target){ta.value=target;if(typeof t.onTick==='function')t.onTick();} // panjang sama tapi isi beda (perbaikan kata) -> samakan
          // Sudah pas sama panjang & tidak kosong -> kartu ini SELESAI,
          // matikan blur + logo P-nya (kartu lain yang masih nunggu tidak
          // ikut kena karena ini dicek per-taId, bukan global).
          _vbCardSetLoading(cardIdx,false);
        }
      }
      if(!anyPending){clearInterval(_vbTypewriter.timer);_vbTypewriter.timer=null;}
    },28);
  }
}

// ── TYPEWRITER SEQUENTIAL — khusus mode AI single (Hook/Story/CTA) ──
// Beda dengan _vbTypewriterSetTarget di atas (yang mengetik SEMUA target
// bareng-bareng/paralel, cocok buat mode bulk yang banyak kartu sekaligus),
// yang ini SENGAJA satu-per-satu berurutan: Hook diketik penuh dulu sampai
// selesai, baru Story mulai, baru CTA — sesuai permintaan user supaya tidak
// kelihatan "muncul sekaligus" dan urutannya jelas dari atas ke bawah.
// Kata demi kata (bukan huruf demi huruf) supaya terasa seperti orang
// ngetik natural, bukan animasi teks generik.
const _vbSeqTyper={timer:null,gen:0};
function _vbTypewriterSequentialReset(){
  _vbSeqTyper.gen++; // sesi lama otomatis batal (dicek tiap tick lewat myGen)
  if(_vbSeqTyper.timer){clearInterval(_vbSeqTyper.timer);_vbSeqTyper.timer=null;}
}
// items: [{taId, text, onTick}] — mengetik items[0] full dulu, baru items[1], dst.
// Return Promise yang resolve setelah item TERAKHIR selesai diketik (atau
// langsung resolve kalau dibatalkan oleh sesi baru).
function _vbTypewriterSequentialRun(items){
  _vbTypewriterSequentialReset();
  let myGen=_vbSeqTyper.gen;
  return new Promise(function(resolve){
    let idx=0;
    function nextItem(){
      if(myGen!==_vbSeqTyper.gen){resolve();return;} // dibatalkan sesi baru
      if(idx>=items.length){resolve();return;}
      let item=items[idx];
      let ta=document.getElementById(item.taId);
      let cardIdx=_vbCardIdxFromTaId(item.taId);
      let words=item.text?[item.text]:[]; // (8 Nov 2026, permintaan user) TANPA efek ketik: seluruh teks sekaligus
      if(!ta||words.length===0){_vbCardSetLoading(cardIdx,false);idx++;nextItem();return;}
      ta.value='';
      // Giliran kartu INI mulai diketik -> pastikan blur & logo P kecil
      // masih aktif (kartu yang belum kebagian giliran juga tetap loading
      // dari kondisi awal saat dibangun, lihat _vbBuildEditableCard).
      _vbCardSetLoading(cardIdx,true);
      if(typeof item.onTick==='function')item.onTick();
      let wi=0;
      _vbSeqTyper.timer=setInterval(function(){
        if(myGen!==_vbSeqTyper.gen){clearInterval(_vbSeqTyper.timer);_vbSeqTyper.timer=null;resolve();return;}
        ta.value+=words[wi];
        wi++;
        if(typeof item.onTick==='function')item.onTick();
        if(wi>=words.length){
          clearInterval(_vbSeqTyper.timer);_vbSeqTyper.timer=null;
          // Kartu ini SUDAH LENGKAP diketik -> blur & logo P kecil dimatikan.
          _vbCardSetLoading(cardIdx,false);
          idx++;
          nextItem();
        }
      },1); // ~55ms/kata — cukup pelan buat kebaca, cukup cepat biar ga lama nunggu 3 script
    }
    nextItem();
  });
}

// FITUR BARU: sinkronkan thumbnail foto di header grup skrip (groupHead)
// dengan data VB_BULK_PRODUCTS[prodIdx] TERBARU. Perlu dipanggil manual di
// tempat manapun VB_BULK_PRODUCTS[prodIdx] diubah TANPA lewat render ulang
// penuh (_vbRenderBulkOutput) — saat ini cuma satu tempat: vbRevisiProdukAI,
// yang bisa mengganti/menghapus foto produk lewat panel revisi. Tanpa ini,
// thumbnail di header akan basi: tetap nampilin foto lama walau user sudah
// ganti/hapus fotonya lewat revisi.
// Aman dipanggil kapan saja — kalau groupHead produk ini memang tidak
// sedang tampil di layar (mis. prodIdx dari sesi lain), fungsi ini no-op.
function _vbUpdateGroupFotoThumb(prodIdx){
  let nameSpan=document.getElementById('vb-prodname-'+prodIdx);
  if(!nameSpan||!nameSpan.parentElement)return;
  let groupHead=nameSpan.parentElement;
  let existingImg=document.getElementById('vb-group-foto-'+prodIdx);
  let meta=VB_BULK_PRODUCTS[prodIdx];
  if(meta&&meta.fotoBase64){
    let src='data:'+(meta.fotoMime||'image/jpeg')+';base64,'+meta.fotoBase64;
    if(existingImg){
      existingImg.src=src;
    }else{
      let img=document.createElement('img');
      img.id='vb-group-foto-'+prodIdx;
      img.alt='Foto referensi produk';
      img.title='Foto referensi produk';
      img.style.cssText='width:24px;height:24px;border-radius:var(--radius-2xs);object-fit:cover;border:1px solid var(--border-hi);flex-shrink:0;';
      img.src=src;
      groupHead.insertBefore(img,nameSpan);
    }
  }else if(existingImg){
    existingImg.remove();
  }
}
// Update 3 kartu (hook/story/cta) satu produk setelah revisi AI berhasil —
// dipakai khusus setelah revisi 1 produk (vbRevisiProdukAI) supaya hasil
// revisi juga diketik pelan-pelan berurutan (Hook→Story→CTA), konsisten
// dengan generate awal, bukan langsung muncul sekaligus. Nama produk di
// header tetap update instan (bukan bagian dari isi script yang perlu
// "diketik"). Return Promise yang resolve setelah CTA-nya selesai diketik.
// audit Okt 2026 (v11.85): cadangan kalau animasi ketik gagal di tengah jalan — tulis hasil revisi langsung ke 3 kartu.
function _vbApplyProductCardsInstant(prodIdx,p){
  ['hook','story','cta'].forEach(function(roleKey,offset){
    let idx=prodIdx*3+offset;
    let t=_vbTruncate25Words(p[roleKey]||'');
    let ta=document.getElementById('vb-bulk-script-'+idx);
    if(ta)ta.value=t;
    if(VB_BULK_ITEMS[idx]){VB_BULK_ITEMS[idx].script=t;VB_BULK_ITEMS[idx].produk=p.produk||VB_BULK_ITEMS[idx].produk;}
    try{vbBulkUpdateJson(idx);}catch(_e){}
  });
  let nameLabel=document.getElementById('vb-prodname-'+prodIdx);
  if(nameLabel)nameLabel.textContent=p.produk||('Produk '+(prodIdx+1));
}
function _vbAnimateProductCards(prodIdx,p){
  let base=prodIdx*3;
  let items=['hook','story','cta'].map(function(roleKey,offset){
    let idx=base+offset;
    let scriptText=_vbTruncate25Words(p[roleKey]||'');
    if(VB_BULK_ITEMS[idx]){VB_BULK_ITEMS[idx].script=scriptText;VB_BULK_ITEMS[idx].produk=p.produk||VB_BULK_ITEMS[idx].produk;}
    return{taId:'vb-bulk-script-'+idx,text:scriptText,onTick:function(){vbBulkUpdateJson(idx);}};
  });
  let nameLabel=document.getElementById('vb-prodname-'+prodIdx);
  if(nameLabel)nameLabel.textContent=p.produk||('Produk '+(prodIdx+1));
  return _vbTypewriterSequentialRun(items);
}

// Versi LIVE dari update kartu produk — dipakai KHUSUS pas streaming bulk
// sedang berjalan. Bedanya: bukan langsung set ta.value (yang bikin efek
// "loncat"), tapi cuma mendaftarkan TARGET teks ke _vbTypewriterSetTarget()
// supaya tampil pelan-pelan mengalir.
function _vbUpdateProductCardsLive(prodIdx,p){
  let base=prodIdx*3;
  ['hook','story','cta'].forEach(function(roleKey,offset){
    let idx=base+offset;
    let scriptText=_vbTruncate25Words(p[roleKey]||'');
    if(_vbIsDua())scriptText=_vbDuaNorm(String(scriptText).replace(/\s*\|+\s*$/,'')); // Percakapan 2 Suara: pemisah ' || ' dari AI (saat streaming) ditampilkan sebagai baris baru
    _vbTypewriterSetTarget('vb-bulk-script-'+idx,scriptText,function(){vbBulkUpdateJson(idx);});
  });
  if(p.produk){
    let nameLabel=document.getElementById('vb-prodname-'+prodIdx);
    if(nameLabel)nameLabel.textContent=p.produk;
  }
}

// Ganti/hapus foto khusus di panel Revisi 1 produk — cuma disimpan sebagai
// OVERRIDE sementara (VB_REVISI_FOTO_OVERRIDE), belum mengubah foto "resmi"
// di VB_BULK_PRODUCTS sampai user benar-benar klik "Generate Ulang Produk
// Ini" (baru dipermanenkan di situ, lihat vbRevisiProdukAI). Kalau user
// batal/tidak upload apa-apa, foto lama tetap dipakai seperti biasa.
async function vbHandleRevisiFotoUpload(input,prodIdx){
  let file=input.files&&input.files[0];
  if(!file)return;
  try{
    let res=await _vbCompressImageFile(file);
    VB_REVISI_FOTO_OVERRIDE[prodIdx]={fotoBase64:res.base64,fotoMime:res.mime};
    let img=document.getElementById('vb-revisi-foto-img-'+prodIdx);
    if(img)img.src='data:'+res.mime+';base64,'+res.base64;
    let empty=document.getElementById('vb-revisi-foto-empty-'+prodIdx);
    let preview=document.getElementById('vb-revisi-foto-preview-'+prodIdx);
    if(empty)empty.style.display='none';
    if(preview)preview.style.display='inline-block';
  }catch(e){
    console.warn('[vbHandleRevisiFotoUpload]',e);
    showToast('Gagal memproses foto: '+e.message,'error');
  }finally{
    input.value='';
  }
}
function vbRemoveRevisiFoto(prodIdx){
  VB_REVISI_FOTO_OVERRIDE[prodIdx]={fotoBase64:'',fotoMime:''};
  let img=document.getElementById('vb-revisi-foto-img-'+prodIdx); if(img)img.src='';
  let empty=document.getElementById('vb-revisi-foto-empty-'+prodIdx); if(empty)empty.style.display='';
  let preview=document.getElementById('vb-revisi-foto-preview-'+prodIdx); if(preview)preview.style.display='none';
}

// Revisi 1 produk lewat AI (dipanggil dari panel revisi per-produk)
async function vbRevisiProdukAI(prodIdx){
  if(_vbGuardGenerating()){showToast('Tunggu proses sebelumnya selesai dulu.','error');return;}
  // FITUR BARU (permintaan user, Sept 2026): revisi dibatasi MAKSIMAL 1x per
  // produk — kalau sudah ada backup tersimpan buat prodIdx ini artinya jatah
  // revisi sudah kepakai & belum di-undo, jadi diblok di sini (jaga-jaga
  // kalau tombolnya somehow masih bisa diklik, defense in depth di samping
  // tombol yang sudah di-disable/relabel di bagian akhir fungsi ini).
  if(VB_BULK_REVISI_BACKUP.hasOwnProperty(prodIdx)){
    showToast('Produk ini sudah dipakai jatah revisinya (maks 1x). Klik "Kembalikan ke Versi Awal" dulu kalau mau revisi ulang.','error');
    return;
  }
  let namaEl=document.getElementById('vb-revisi-nama-'+prodIdx);
  let keunggulanEl=document.getElementById('vb-revisi-keunggulan-'+prodIdx);
  let noteEl=document.getElementById('vb-revisi-note-'+prodIdx);
  let nama=namaEl?namaEl.value.trim():'';
  if(!nama){showToast('Nama produk wajib diisi','error');if(namaEl)namaEl.focus();return;}
  let keunggulan=keunggulanEl?keunggulanEl.value.trim():'';
  let note=noteEl?noteEl.value.trim():'';
  if(!VB.bulkTargetAudience&&!(VB_BULK_PRODUCTS[prodIdx]&&VB_BULK_PRODUCTS[prodIdx].ta)){showToast('Target Audience tidak ditemukan — generate bulk dari awal dulu ya.','error');return;}
  let dlCheck=dlCheckBeforeCall();
  if(!dlCheck.ok){showToast(dlCheck.message,'error');return;}

  let btn=document.getElementById('vb-revisi-btn-'+prodIdx);
  let submitBtn=document.querySelector('#vb-revisi-panel-'+prodIdx+' .btn.sm');
  let undoBtn=document.getElementById('vb-revisi-undo-btn-'+prodIdx);
  let originalText=submitBtn?submitBtn.textContent:'';
  let revisiSucceeded=false; // dipakai finally di bawah buat memutuskan tombol direset atau dikunci
  VAI._isGenerating=true;VAI._lastGenTime=Date.now();
  _vbAcquireWakeLock();
  if(submitBtn){submitBtn.disabled=true;submitBtn.innerHTML='<svg class="icon"><use href="#ic-clock"></use></svg> Memproses...';}
  try{
    // FIX (audit lanjutan): jalur revisi 1 produk ini juga belum kasih tau
    // status nunggu waktu retry 429/503 — tombolnya cuma diam di "Memproses..."
    // Disambungkan ke submitBtn supaya konsisten dengan jalur generate lain.
    // Foto referensi: kalau user upload/hapus foto BARU di panel ini
    // (tersimpan di VB_REVISI_FOTO_OVERRIDE), itu yang dipakai. Kalau
    // panel ini sama sekali tidak disentuh soal foto, pakai foto lama dari
    // VB_BULK_PRODUCTS seperti biasa (revisi tetap "melihat" foto yang sama).
    let existingFoto=VB_BULK_PRODUCTS[prodIdx]||{};
    let effectiveFoto=VB_REVISI_FOTO_OVERRIDE.hasOwnProperty(prodIdx)?VB_REVISI_FOTO_OVERRIDE[prodIdx]:existingFoto;
    // FIX BUG (ditemukan saat audit mendalam khusus builder video): "topik"
    // (Arah Pembahasan) produk ini dulu TIDAK ikut dikirim ulang ke AI saat
    // revisi 1 produk — panel revisi ini memang tidak punya kotak topik
    // sendiri, jadi satu-satunya sumbernya adalah topik lama yang tersimpan
    // di VB_BULK_PRODUCTS[prodIdx] (lihat fix di _vbBuildProductMetaLookup/
    // _vbRenderBulkOutput). Dipertahankan di sini supaya arahan topik yang
    // user isi di awal tidak hilang begitu saja tiap kali revisi 1 produk.
    let existingTopik=existingFoto.topik||'';
    // Gaya Hook & isi overlay produk ini ikut dipertahankan saat revisi
    // (overlay = nilai TERKINI di kartu, bisa sudah diedit user setelah generate).
    let existingHookType=existingFoto.hookType||'';
    let existingHookCustom=existingFoto.hookCustom||'';
    let existingOverlay=(VB_HOOK_OVERLAY[prodIdx]||existingFoto.overlay||'');
    // FITUR BARU (permintaan user, Sept 2026): simpan backup KONDISI SEBELUM
    // revisi ini diterapkan (nama/keunggulan/topik/foto LAMA + ketiga script
    // yang SEDANG tampil di kartu) — dipakai vbUndoRevisiProduk() kalau hasil
    // revisi ternyata kurang memuaskan. Diambil di sini (SEBELUM overwrite
    // di bawah), bukan setelah animasi selesai, supaya benar-benar kondisi
    // asli sebelum revisi, bukan hasil revisi yang keburu ketimpa.
    let _backupScripts=[0,1,2].map(function(k){
      let ta=document.getElementById('vb-bulk-script-'+(prodIdx*3+k));
      return ta?ta.value:'';
    });
    let _backupSnapshot={
      nama:existingFoto.nama||'',keunggulan:existingFoto.keunggulan||'',topik:existingTopik,
      hookType:existingHookType,hookCustom:existingHookCustom,overlay:existingOverlay,
      pitch:existingFoto.pitch||'',accent:existingFoto.accent||'',
      fotoBase64:existingFoto.fotoBase64||'',fotoMime:existingFoto.fotoMime||'',
      scripts:_backupScripts
    };
    // FIX HEMAT BIAYA (permintaan user, Sept 2026): cacheSystem=false —
    // revisi cuma boleh 1x per produk (lihat pengecekan VB_BULK_REVISI_BACKUP
    // di atas), jadi cache_control di sini cuma bakal kena cache_creation
    // (+25%) tanpa pernah sempat kena cache_read (diskon 90%). Percuma &
    // malah nambah biaya, jadi dicabut khusus di jalur revisi ini.
    _vbStartUsageSession('Revisi Produk (Bulk) — '+nama,1); // SESI BARU (permintaan user): tiap revisi 1 produk jadi baris tersendiri di panel statistik.
    let arr=await _vbCallBulkBatch([{nama:nama,keunggulan:keunggulan,topik:existingTopik,hookType:existingHookType,hookCustom:existingHookCustom,pitch:existingFoto.pitch||'',accent:existingFoto.accent||'',fotoBase64:effectiveFoto.fotoBase64||'',fotoMime:effectiveFoto.fotoMime||''}],((VB_BULK_PRODUCTS[prodIdx]&&VB_BULK_PRODUCTS[prodIdx].ta)||VB.bulkTargetAudience),_vbNoteWithOldScript(note,_backupScripts),function(waitMs,attempt,status){
      if(!submitBtn)return;
      let alasan=_vbWaitReasonLabel(status);
      if(status==='thinking'){submitBtn.innerHTML='<svg class="icon"><use href="#ic-clock"></use></svg> 🤔 '+alasan+'...';return;}
      let detik=Math.ceil(waitMs/1000);
      submitBtn.innerHTML='<svg class="icon"><use href="#ic-clock"></use></svg> ⏳ '+alasan+' (~'+detik+'dtk)...';
    },undefined,undefined,false,undefined,true); // param terakhir = fixShort: AI memperpendek bagian yang kelebihan kata (bukan dipotong kode); potong lokal hanya cadangan terakhir (permintaan user, 12 Okt 2026)
    dlIncrement();
    if(!arr||!arr[0])throw new Error('Hasil belum berhasil dibuat, coba lagi.');
    let p=arr[0];
    if(!p.produk)p.produk=nama;
    // audit Okt 2026 (v11.85): backup + penanda "jatah revisi terpakai" dipasang SEKARANG, sebelum ada satu pun data yang ditimpa.
    // Dulu backup baru diisi setelah animasi kartu selesai — kalau animasi error, skrip lama sudah tertimpa tapi tombol
    // "Kembalikan ke Versi Awal" tidak ada, padahal kuota sudah terpotong.
    VB_BULK_REVISI_BACKUP[prodIdx]=_backupSnapshot;
    if(undoBtn)undoBtn.classList.remove('hidden');
    revisiSucceeded=true;
    // Foto yang barusan dipakai (lama ATAU hasil ganti di panel ini)
    // dipermanenkan di sini, supaya revisi/generate-ulang BERIKUTNYA ikut
    // memakai foto terbaru ini juga.
    VB_BULK_PRODUCTS[prodIdx]={ta:(VB_BULK_PRODUCTS[prodIdx]&&VB_BULK_PRODUCTS[prodIdx].ta)||'',nama:nama,keunggulan:keunggulan,topik:existingTopik,hookType:existingHookType,hookCustom:existingHookCustom,overlay:existingOverlay,pitch:existingFoto.pitch||'',accent:existingFoto.accent||'',fotoBase64:effectiveFoto.fotoBase64||'',fotoMime:effectiveFoto.fotoMime||''};
    try{
      // thumbnail foto di header grup ikut disinkronkan ke foto TERBARU
      _vbUpdateGroupFotoThumb(prodIdx);
      // hasil revisi diketik pelan-pelan berurutan (Hook→Story→CTA), konsisten dengan generate awal
      await _vbAnimateProductCards(prodIdx,p);
    }catch(eAnim){
      console.warn('[vbRevisiProdukAI] animasi kartu gagal, hasil ditulis langsung:',eAnim);
      try{_vbApplyProductCardsInstant(prodIdx,p);}catch(_e){}
    }
    try{
      vbToggleRevisiPanel(prodIdx,true);
      // Riwayat dicatat ulang supaya mencerminkan hasil revisi terbaru (lihat FIX BUG#20 di versi sebelumnya)
      _vbBuildCombinedHistoryEntry('Bulk '+VB_BULK_PRODUCTS.length+' produk (revisi: '+nama+')'+(VB.bulkTargetAudience?' — '+VB.bulkTargetAudience:''));
    }catch(ePost){console.warn('[vbRevisiProdukAI] langkah penutup gagal (non-fatal):',ePost);}
    showToast('Produk berhasil direvisi! (jatah revisi produk ini sudah kepakai — klik "Kembalikan ke Versi Awal" kalau mau ulang)','success');
  }catch(err){
    console.error('vbRevisiProdukAI error:',err);
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

// Kembalikan 1 produk (mode Bulk) ke kondisi SEBELUM revisi AI TERAKHIR —
// pasangan vbUndoSingleRevisi() tapi khusus per-produk mode Bulk, dipakai
// karena revisi mode Bulk sekarang dibatasi maksimal 1x per produk (lihat
// guard di vbRevisiProdukAI) supaya user tetap bisa kembali ke versi awal
// kalau hasil revisi ternyata kurang memuaskan.
function vbUndoRevisiProduk(prodIdx){
  let backup=VB_BULK_REVISI_BACKUP[prodIdx];
  if(!backup){showToast('Tidak ada revisi untuk dibatalkan di produk ini.','error');return;}
  VB_BULK_PRODUCTS[prodIdx]={ta:(VB_BULK_PRODUCTS[prodIdx]&&VB_BULK_PRODUCTS[prodIdx].ta)||'',nama:backup.nama,keunggulan:backup.keunggulan,topik:backup.topik,hookType:backup.hookType||'',hookCustom:backup.hookCustom||'',overlay:(VB_HOOK_OVERLAY[prodIdx]||''),pitch:backup.pitch||'',accent:backup.accent||'',fotoBase64:backup.fotoBase64,fotoMime:backup.fotoMime};
  // CATATAN: overlay SENGAJA diambil dari nilai TERKINI di kartu (VB_HOOK_OVERLAY), bukan
  // dari backup — revisi AI tidak mengubah kolom Isi, jadi edit user sesudah revisi
  // tidak boleh kembali ke versi lama waktu Undo / Generate Ulang Semua.
  // Foto override panel (kalau sempat diganti user di panel revisi) juga
  // dibuang, supaya revisi BERIKUTNYA (setelah undo ini) tidak keliru masih
  // memakai foto pengganti yang barusan dibatalkan.
  delete VB_REVISI_FOTO_OVERRIDE[prodIdx];
  backup.scripts.forEach(function(scriptText,k){
    let idx=prodIdx*3+k;
    let ta=document.getElementById('vb-bulk-script-'+idx);
    if(ta)ta.value=scriptText;
    if(VB_BULK_ITEMS[idx]){VB_BULK_ITEMS[idx].script=scriptText;VB_BULK_ITEMS[idx].produk=backup.nama||VB_BULK_ITEMS[idx].produk;}
    vbBulkUpdateJson(idx);
  });
  // Sinkronkan balik field di panel revisi (nama/keunggulan) & nama header
  // grup, supaya kalau panel dibuka lagi tidak menampilkan nilai hasil
  // revisi yang barusan dibatalkan.
  let namaEl=document.getElementById('vb-revisi-nama-'+prodIdx); if(namaEl)namaEl.value=backup.nama||'';
  let keunggulanEl=document.getElementById('vb-revisi-keunggulan-'+prodIdx); if(keunggulanEl)keunggulanEl.value=backup.keunggulan||'';
  let prodNameEl=document.getElementById('vb-prodname-'+prodIdx); if(prodNameEl)prodNameEl.textContent=backup.nama||('Produk '+(prodIdx+1));
  // Foto preview di panel revisi disamakan lagi ke foto LAMA (backup) —
  // logic sama persis seperti vbHandleRevisiFotoUpload/vbRemoveRevisiFoto.
  let hasFoto=!!backup.fotoBase64;
  let img=document.getElementById('vb-revisi-foto-img-'+prodIdx);
  if(img)img.src=hasFoto?('data:'+(backup.fotoMime||'image/jpeg')+';base64,'+backup.fotoBase64):'';
  let empty=document.getElementById('vb-revisi-foto-empty-'+prodIdx); if(empty)empty.style.display=hasFoto?'none':'';
  let preview=document.getElementById('vb-revisi-foto-preview-'+prodIdx); if(preview)preview.style.display=hasFoto?'inline-block':'none';
  _vbUpdateGroupFotoThumb(prodIdx);
  delete VB_BULK_REVISI_BACKUP[prodIdx];
  // Tombol "Generate Ulang Produk Ini" dibuka kuncinya lagi & tombol Undo
  // disembunyikan lagi — jatah revisi produk ini kembali tersedia 1x.
  let submitBtn=document.querySelector('#vb-revisi-panel-'+prodIdx+' .btn.sm');
  if(submitBtn){submitBtn.disabled=false;submitBtn.textContent='Generate Ulang Produk Ini';}
  let undoBtn=document.getElementById('vb-revisi-undo-btn-'+prodIdx);
  if(undoBtn)undoBtn.classList.add('hidden');
  _vbBuildCombinedHistoryEntry('Bulk '+VB_BULK_PRODUCTS.length+' produk (undo revisi: '+(backup.nama||'')+')'+(VB.bulkTargetAudience?' — '+VB.bulkTargetAudience:''));
  showToast('Produk dikembalikan ke versi sebelum revisi.','success');
}

