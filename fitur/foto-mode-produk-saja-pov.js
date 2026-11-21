// fitur/foto-mode-produk-saja-pov.js — (dulu js/26-pov-mode.js) dipindah dari <script id="pov-js"> di index.html lama (baris 38977). Isi tidak diubah.
/* ═══ MODE "PRODUK SAJA · POV" — Prompt Foto AI (v14.17) ═══
   Permintaan user: di step Foto Referensi, kalau user cuma memilih "Produk" (tanpa Karakter Sheet) tetap boleh lanjut
   setelah mengisi nama produk. Step berikutnya mengikuti struktur prompt:
   Lokasi → Cara Tampil Produk (opsi tunggal: POV) → Mood & Tone → Pencahayaan, dan di tiap step user bisa isi sendiri.
   Prompt hasilnya ditulis dalam bahasa Inggris dengan struktur JSON:
   prompt, mood_and_tone, reference_photos, product, scene{location,camera,mood_and_tone}, output_quality{camera,lighting}.
   Mode ini ditandai FS.povProduk. Mode lama (Karakter Sheet + produk) tidak berubah sama sekali: semua fungsi di bawah
   langsung meneruskan ke fungsi aslinya kalau FS.povProduk = false. */
(function(){
'use strict';
var $=function(id){return document.getElementById(id);};
var ORDER=['f5','f3','f9','f7'];                       /* urutan step mode POV */
var TITLES={f5:'Lokasi',f3:'Cara Tampil',f9:'Mood & Tone',f7:'Pencahayaan'};
var HOLD={
  tangan:{label:'Dipegang tangan (POV)',text:'held in one hand only, from a first-person POV as if the viewer is holding it',placement:'held in one hand only \u2014 a single hand visible holding the product from a first-person POV, as if the viewer is holding it themselves; no face, no second hand and no rest of the body in the frame, product sharp, fully visible and facing the camera'},
  hanger:{label:'Di hanger',text:'hanging on a hanger',placement:'hanging on a hanger, fully visible and facing the camera'}
};
var POV_CAMERA='POV style (first-person perspective)';

/* Teks Inggris untuk chip preset (chip aslinya berisi teks Indonesia) */
var LOK_EN={
  'Kamar Mewah':'luxurious bedroom',
  'Kamar Aesthetic':'aesthetic bedroom',
  'Kamar Spanyol':'Spanish-style bedroom',
  'Ruang Tamu Mewah':'luxurious living room',
  'Teras Rumah Mewah':'luxurious house terrace',
  'Di Dalam Mobil Mewah':'inside a luxury car'
};
var LIGHT_EN={
  'Siang Cerah':'bright natural daylight — crisp, clean light with vivid natural colors, no filter',
  'Hujan':'soft rainy-day light — cool, diffused overcast daylight with gentle muted tones, no filter',
  'Window Light Samping':'soft natural window light from the side — gentle indoor daylight, airy and bright, no filter'
};
var MOOD_SHORT={
  'Natural Candid':'lifestyle candid natural, authentic, relaxed, no studio feel',
  'Dark Moody':'dark moody cinematic, deep shadows, dramatic and mysterious',
  'Luxury Premium':'luxury premium editorial, polished, refined, elegant'
};
/* Placeholder kolom "isi sendiri" versi Inggris (dipakai selama mode POV aktif) */
var PH_ID={f5:'f5-custom-karakter',f7:'f7-custom',f9:'f9-custom'};
var PH={
  f5:'Example: cozy rooftop at golden hour, minimalist cafe corner...',
  f7:'Example: warm lamp light, soft morning sunlight through sheer curtains...',
  f9:'Example: soft Korean aesthetic, warm and cozy, retro 90s...'
};

function wrap(name,fn){
  var o=window[name];
  if(typeof o!=='function')return;
  window[name]=function(){return fn.call(this,o,arguments);};
}
function isOnlyProduk(){
  return !!(FS.refs&&FS.refs.length>0&&FS.refs.every(function(r){return r.type==='produk';}));
}
function filled(id){
  return id==='f5'?!!FS.lokasi:id==='f3'?!!FS.hold:id==='f9'?!!FS.mood:!!FS.cahaya;
}
function trunc(s,n){s=String(s||'');return s.length>n?s.substring(0,n-1)+'…':s;}
function cap(t){t=String(t||'').trim().replace(/[.\s]+$/,'');return t?t.charAt(0).toUpperCase()+t.slice(1):t;}
function hideCard(id){var c=$(id);if(c){c.classList.add('done','hidden');c.classList.remove('pending');}}
function resetCounter(cid){var c=$(cid);if(c){c.textContent='0 / 300';c.className='inp-counter';}}

/* ── sinkron tampilan: class body, placeholder Inggris, label subjek, hint di Foto Referensi ── */
function povSync(){
  if(typeof FS==='undefined')return;
  var on=!!FS.povProduk;
  if(on&&FS.holdKey==='pov'){   /* sisa Riwayat lama (opsi "POV") → disamakan dengan "Dipegang" */
    FS.holdKey='tangan';FS.hold=HOLD.tangan.text;FS.holdLabel=HOLD.tangan.label;FS.povPlacement=HOLD.tangan.placement;FS.povCamera=POV_CAMERA;
    var fa3=$('fa3');if(fa3&&fa3.textContent==='POV')fa3.textContent=HOLD.tangan.label;
  }
  document.body.classList.toggle('pov-on',on);
  Object.keys(PH_ID).forEach(function(k){
    var inp=$(PH_ID[k]);if(!inp)return;
    if(inp.dataset.phOrig===undefined)inp.dataset.phOrig=inp.getAttribute('placeholder')||'';
    var want=on?PH[k]:inp.dataset.phOrig;
    if(inp.getAttribute('placeholder')!==want)inp.setAttribute('placeholder',want);
  });
  var fa0=$('fa0'),f0=$('f0');
  if(fa0&&f0&&f0.classList.contains('done')){
    var lab=on?'Produk saja (POV)':((typeof SUBJEK_LABELS!=='undefined'&&SUBJEK_LABELS[FS.subjek])||'');
    if(lab&&fa0.textContent!==lab)fa0.textContent=lab;
  }
  var h=$('f1-pov-hint');
  if(h)h.classList.toggle('show',isOnlyProduk());
}

/* ── pindah ke step berikutnya yang belum terisi; kalau semua sudah terisi → area Generate ── */
function showGen(){
  var ga=$('f-gen-area');
  if(ga)ga.classList.remove('hidden');
  fUpdateProgress(7,'<svg class="icon"><use href="#ic-check"></use></svg> Selesai!');
  if(typeof fRunAIConflictCheck==='function')fRunAIConflictCheck(true);
  setTimeout(function(){var g=$('f-gen-area');if(g)g.scrollIntoView({behavior:'smooth',block:'nearest'});},200);
}
function povAdvance(){
  var nxt=null;
  for(var i=0;i<ORDER.length;i++){if(!filled(ORDER[i])){nxt=ORDER[i];break;}}
  if(nxt){
    var ga=$('f-gen-area');if(ga)ga.classList.add('hidden');
    fUpdateProgress(parseInt(nxt.slice(1),10),TITLES[nxt]);
    showCard(nxt);
  }else{
    showGen();
  }
}

/* ── kosongkan 1 step (dipakai tombol "← Kembali") ── */
function povClear(id){
  if(id==='f5'){
    FS.lokasi='';FS.lokasiLabel='';FS.lokasiDesc='';
    document.querySelectorAll('#f5 .chip').forEach(function(c){c.classList.remove('sel');});
    var a=$('f5-custom-karakter');if(a)a.value='';resetCounter('f5-counter-karakter');
  }else if(id==='f3'){
    FS.hold='';FS.holdKey='';FS.holdLabel='';FS.povPlacement='';FS.povCamera='';
    document.querySelectorAll('#f3 .chip').forEach(function(c){c.classList.remove('sel');});
    var b=$('f3-pov-custom');if(b)b.value='';resetCounter('f3-pov-counter');
  }else if(id==='f9'){
    FS.mood='';FS.moodLabel='';
    document.querySelectorAll('#f9 .chip').forEach(function(c){c.classList.remove('sel');});
    var c9=$('f9-custom');if(c9)c9.value='';resetCounter('f9-counter');
  }else if(id==='f7'){
    FS.cahaya='';FS.cahayaLabel='';FS.cahayaDesc='';
    try{_fCahaya=null;}catch(e){}
    document.querySelectorAll('#f7 .chip').forEach(function(c){c.classList.remove('sel');});
    var c7=$('f7-custom');if(c7)c7.value='';resetCounter('f7-counter');
  }
}
function povBack(id){
  var i=ORDER.indexOf(id),card=$(id);
  povClear(id);
  if(card){
    card.classList.remove('done','hidden');card.classList.add('pending');
    var fa=$('fa'+id.slice(1));if(fa)fa.textContent='';
    var cb=$(id+'-confirmbar');if(cb)cb.remove();
    if(typeof fRestoreCustomBlock==='function')fRestoreCustomBlock(card);
  }
  var ga=$('f-gen-area');if(ga)ga.classList.add('hidden');
  var jo=$('f-json-output');if(jo)jo.style.display='none';
  if(i<=0){
    var c1=$('f1');
    if(c1){c1.classList.remove('done','hidden','pending');}
    var a1=$('fa1');if(a1)a1.textContent='';
    fUpdateProgress(1,'Foto Referensi');
  }else{
    var pid=ORDER[i-1],pc=$(pid);
    if(pc){pc.classList.remove('done','hidden','pending');}
    fUpdateProgress(parseInt(pid.slice(1),10),TITLES[pid]);
  }
}

/* ── setter per step ── */
function setLokasi(desc,label,raw){
  FS.lokasi=raw||label;FS.lokasiLabel=label;FS.lokasiDesc=desc;
  doneCard('f5','fa5',label==='Custom'?trunc(raw,35):label);
  povAdvance();
}
function setHold(kind){
  var h=HOLD[kind]||HOLD.tangan;
  FS.holdKey=HOLD[kind]?kind:'tangan';
  FS.hold=h.text;FS.holdLabel=h.label;FS.povPlacement=h.placement;FS.povCamera=POV_CAMERA;
  doneCard('f3','fa3',h.label);
  povAdvance();
}
function setMood(val,label){
  FS.mood=val;FS.moodLabel=label;
  doneCard('f9','fa9',label==='Custom'?trunc(val,35):label);
  povAdvance();
}
function setCahaya(desc,label,raw){
  FS.cahaya=raw||label;FS.cahayaLabel=label;FS.cahayaDesc=desc;
  try{_fCahaya={val:desc,label:label};}catch(e){}
  doneCard('f7','fa7',label==='Custom'?trunc(raw,35):label);
  povAdvance();
}

/* ── step 3: Cara Tampil Produk — 2 opsi: Dipegang (satu tangan) / Di hanger. Sudut kamera selalu POV ── */
window.fPovPickHold=function(el,kind){
  document.querySelectorAll('#f3 .chip').forEach(function(c){c.classList.remove('sel');});
  el.classList.add('sel');
  fShowConfirm('f3',el,function(){setHold(kind);});
};

/* ── wrapper: lokasi, mood, pencahayaan (chip + isi sendiri) ── */
wrap('fPickLokasi',function(o,a){
  if(!FS.povProduk)return o.apply(this,a);
  var val=a[0],el=a[1],label=a[2];
  document.querySelectorAll('#f5 .chip').forEach(function(c){c.classList.remove('sel');});
  el.classList.add('sel');
  if(window.pstPreview)pstPreview('f5','lokasi',label);
  fShowConfirm('f5',el,function(){setLokasi(LOK_EN[label]||val,label);});
});
var lokLock=false;
wrap('fPickLokasiCustomKarakter',function(o,a){
  if(!FS.povProduk)return o.apply(this,a);
  if(lokLock)return;
  var inp=$('f5-custom-karakter'),val=inp?inp.value.trim():'';
  if(!val){showToast('Isi lokasi dulu!','error');return;}
  lokLock=true;setTimeout(function(){lokLock=false;},600);
  document.querySelectorAll('#f5 .chip').forEach(function(c){c.classList.remove('sel');});
  setLokasi(val,'Custom',val);
});
wrap('fPickMood',function(o,a){
  if(!FS.povProduk)return o.apply(this,a);
  var val=a[0],el=a[1],label=a[2];
  document.querySelectorAll('#f9 .chip').forEach(function(c){c.classList.remove('sel');});
  el.classList.add('sel');
  if(window.pstPreview)pstPreview('f9','mood',label);
  fShowConfirm('f9',el,function(){setMood(val,label);});
});
var moodLock=false;
wrap('fPickMoodCustom',function(o,a){
  if(!FS.povProduk)return o.apply(this,a);
  if(moodLock)return;
  var inp=$('f9-custom'),val=inp?inp.value.trim():'';
  if(!val){showToast('Isi mood/tone dulu!','error');return;}
  moodLock=true;setTimeout(function(){moodLock=false;},600);
  document.querySelectorAll('#f9 .chip').forEach(function(c){c.classList.remove('sel');});
  setMood(val,'Custom');
});
wrap('fPickCahaya',function(o,a){
  if(!FS.povProduk)return o.apply(this,a);
  var val=a[0],el=a[1],label=a[2];
  document.querySelectorAll('#f7 .chip').forEach(function(c){c.classList.remove('sel');});
  el.classList.add('sel');
  if(window.pstPreview)pstPreview('f7','cahaya',label);
  fShowConfirm('f7',el,function(){setCahaya(LIGHT_EN[label]||val,label);});
});
var lightLock=false;
wrap('fPickCahayaCustom',function(o,a){
  if(!FS.povProduk)return o.apply(this,a);
  if(lightLock)return;
  var inp=$('f7-custom'),val=inp?inp.value.trim():'';
  if(!val){showToast('Isi kondisi cahaya dulu!','error');return;}
  lightLock=true;setTimeout(function(){lightLock=false;},600);
  document.querySelectorAll('#f7 .chip').forEach(function(c){c.classList.remove('sel');});
  setCahaya(val,'Custom',val);
});

/* ── tombol "← Kembali" tiap step ── */
[['fBack3','f3'],['fBack5','f5'],['fBack7','f7'],['fBack9','f9']].forEach(function(p){
  wrap(p[0],function(o,a){
    if(!FS.povProduk)return o.apply(this,a);
    return povBack(p[1]);
  });
});

/* ── step 1: Foto Referensi — "Produk saja" boleh lanjut setelah nama produk diisi ── */
function flagEmptyNames(list){
  var first=null;
  list.forEach(function(ref){
    var card=$('pc-'+ref.id),inp=card&&card.querySelector('input.inp');
    if(!inp)return;
    inp.style.borderColor='var(--red)';inp.style.boxShadow='0 0 0 2px rgba(224,92,92,0.2)';
    var eid='pc-err-'+ref.id;
    if(!$(eid)){
      var e=document.createElement('div');e.id=eid;
      e.style.cssText='font-size:var(--fs-xs2);color:var(--red);margin-top:5px;font-weight:500;';
      e.textContent='Nama produk wajib diisi';
      inp.insertAdjacentElement('afterend',e);
    }
    inp.addEventListener('input',function(){
      inp.style.borderColor='';inp.style.boxShadow='';
      var x=$(eid);if(x)x.remove();
    },{once:true});
    if(!first)first=inp;
  });
  if(first){first.focus();}
}
wrap('fKonfirmRef',function(o,a){
  var tour=(typeof pbTourF1Active!=='undefined'&&pbTourF1Active);
  if(tour||FS.importActive||!isOnlyProduk()){
    /* bukan mode "Produk saja" → alur lama. Kalau sebelumnya mode POV, bersihkan sisa step POV dulu. */
    if(FS.povProduk&&!tour&&!FS.importActive&&FS.refs&&FS.refs.length>0){
      FS.povProduk=false;
      fResetFrom(2);
      povSync();
      if(!FS.subjek){var _c0=$('f0');if(_c0)_c0.classList.remove('done','hidden');}   /* subjek tidak pernah dipilih → buka lagi step Subjek untuk alur lama */
    }
    return o.apply(this,a);
  }
  var sedb=$('summary-edit-done-btn');if(sedb)sedb.remove();
  var prod=FS.refs.filter(function(r){return r.type==='produk';});
  var empty=prod.filter(function(r){return !r.focus||!r.focus.trim();});
  if(empty.length){
    flagEmptyNames(empty);
    showToast('Isi nama produknya dulu ya!','error');
    return;
  }
  if(!FS.povProduk)fResetFrom(2);            /* masuk mode POV: bersihkan step lanjutan sisa alur lama */
  FS.povProduk=true;
  FS.produkMode='foto';
  FS.produkNama=prod.map(function(r){return r.focus.trim();}).join(', ');
  FS.pose='';FS.poseLabel='';FS.poseDesc='';
  FS.angle='';FS.angleLabel='';FS.angleDesc='';FS.kamera='';
  if(!FS.subjek)doneCard('f0','fa0','Produk saja (POV)');   /* subjek tidak dipakai di mode ini, jadi tidak wajib dipilih */
  doneCard('f1','fa1',FS.refs.length+' foto (Produk)');
  hideCard('f2');hideCard('f4');hideCard('f8');   /* Pose & Sudut Kamera tidak dipakai di mode ini */
  povSync();
  fSyncStepNums();
  povAdvance();
});

/* ── urutan & daftar step aktif ── */
wrap('fActiveSteps',function(o,a){
  return FS.povProduk?['f0','f1','f5','f3','f9','f7']:o.apply(this,a);
});
window.fStepOrder=function(){
  return FS.povProduk?['f0','f1','f5','f3','f9','f7','f4','f8']:['f0','f1','f3','f4','f5','f7','f8','f9'];
};

/* ── reset & sinkronisasi ── */
wrap('fResetFrom',function(o,a){
  var n=Number(a[0]);
  var r=o.apply(this,a);
  if(n<=1)FS.povProduk=false;
  if(n<=3){
    FS.holdLabel='';FS.povPlacement='';FS.povCamera='';
    var i3=$('f3-pov-custom');if(i3)i3.value='';
    resetCounter('f3-pov-counter');
  }
  povSync();
  return r;
});
wrap('fSyncStepNums',function(o,a){var r=o.apply(this,a);povSync();return r;});
wrap('fRenderList',function(o,a){var r=o.apply(this,a);povSync();return r;});
wrap('fRestoreStepUI',function(o,a){
  var r=o.apply(this,a);
  if(FS.povProduk&&Number(a[0])===3){
    var k=FS.holdKey==='hanger'?'hanger':'tangan';
    document.querySelectorAll('#f3-pov-panel .chip').forEach(function(c){c.classList.toggle('sel',!!FS.hold&&c.dataset.hold===k);});
  }
  return r;
});

/* ── Ringkasan (cek sebelum generate) ── */
function povRenderSummary(){
  var rows=$('summary-rows'),warnEl=$('summary-warning'),warnText=$('summary-warning-text'),ok=$('summary-ok-badge');
  if(!rows)return;
  var warnings=[],items=[];
  var prod=(FS.refs||[]).filter(function(r){return r.type==='produk';});
  items.push({key:'Mode',val:'Produk saja · POV',editCard:null});
  items.push({key:'Foto Ref',val:prod.length+' foto (Produk)'+(FS.produkNama?' · '+FS.produkNama:''),editCard:1});
  if((FS.refs||[]).some(function(r){return r.type!=='produk';}))warnings.push('Foto referensi bukan produk saja — buka Foto Ref lalu tekan Lanjut agar mode-nya ikut menyesuaikan.');
  if(prod.some(function(r){return !r.focus||!r.focus.trim();}))warnings.push('Nama produk belum diisi — buka Foto Ref.');
  var lok=FS.lokasiLabel==='Custom'?trunc(FS.lokasi,55):(FS.lokasiLabel||'—');
  if(!FS.lokasi)warnings.push('Lokasi belum dipilih.');
  items.push({key:'Lokasi',val:lok,editCard:5});
  var hold=FS.hold?(FS.holdLabel==='Custom'?trunc(FS.hold,55):(FS.holdLabel||'Dipegang')):'—';
  if(!FS.hold)warnings.push('Cara tampil produk belum dipilih.');
  items.push({key:'Cara Tampil',val:hold,editCard:3});
  items.push({key:'Sudut Kamera',val:'POV',editCard:null});
  var mood=FS.moodLabel==='Custom'?trunc(FS.mood,55):(FS.moodLabel||'—');
  if(!FS.mood)warnings.push('Mood & tone belum dipilih.');
  items.push({key:'Mood',val:mood,editCard:9});
  var cah=FS.cahayaLabel==='Custom'?trunc(FS.cahaya,55):(FS.cahayaLabel||'—');
  if(!FS.cahaya)warnings.push('Pencahayaan belum dipilih.');
  items.push({key:'Cahaya',val:cah,editCard:7});
  rows.innerHTML=items.map(function(it){
    var eb=it.editCard?'<button class="summary-edit" onclick="fSummaryEdit('+it.editCard+')"><svg class="icon"><use href="#ic-edit"></use></svg> Edit</button>':'';
    var vc=(it.val==='—')?'summary-row-val empty':'summary-row-val';
    return '<div class="summary-row"><div class="summary-row-key">'+it.key+'</div><div class="'+vc+'">'+esc(it.val)+'</div>'+eb+'</div>';
  }).join('');
  if(warnings.length>0){
    if(warnEl)warnEl.style.display='flex';
    if(warnText)warnText.textContent=warnings.join(' ');
    if(ok){ok.textContent='Cek';ok.style.background='var(--surface3)';ok.style.color='var(--text)';ok.style.borderColor='var(--border-hi)';}
  }else{
    if(warnEl)warnEl.style.display='none';
    if(ok){ok.innerHTML='<svg class="icon"><use href="#ic-check"></use></svg> Siap';ok.style.background='rgba(76,175,125,0.12)';ok.style.color='var(--green)';ok.style.borderColor='rgba(76,175,125,0.2)';}
  }
}
wrap('fRenderSummary',function(o,a){
  if(!FS.povProduk)return o.apply(this,a);
  return povRenderSummary();
});

/* ── pembuat JSON prompt (bahasa Inggris) ── */
function povBuild(){
  var realRefs=fSortRefsForOrder(FS.refs.filter(function(r){return r.type==='produk';}));
  var name=(FS.produkNama||'').trim()||'product from reference photo';
  var loc=(FS.lokasiDesc||FS.lokasi||'').trim();
  var moodFull=(FS.mood||'').trim();
  var light=(FS.cahayaDesc||FS.cahaya||'').trim();
  var camera=POV_CAMERA;   /* sudut kamera selalu POV */
  var H=HOLD[FS.holdKey]||(FS.holdKey==='custom'?null:HOLD.tangan);
  var placement=H?H.placement:(FS.povPlacement||HOLD.tangan.placement);   /* 'custom' = sisa riwayat lama */
  var holdTxt=H?H.text:placement;
  var moodShort=MOOD_SHORT[FS.moodLabel]||moodFull;

  var prompt='Photorealistic product photo. Product: '+name+', '+holdTxt+'. Camera: '+camera+'. Location: '+loc+'. Mood: '+moodShort+'.';

  var refPhotos=realRefs.map(function(r,i){
    var def=FTYPE.produk;
    var custom=(r.extractCustom!==undefined&&r.extractCustom!==def.extract)?String(r.extractCustom).trim():'';
    var nm=(r.focus||name).trim();
    var ex=custom||('the '+nm+' in complete detail');
    if(r.ukuran)ex+='. Product physical size: '+r.ukuran+' — render the product accurately to this size ratio relative to the scene.';
    return {photo_number:i+1,type:'Product',extract_only:ex};
  });

  /* output_quality: default = gaya foto HP candid; kalau lighting/mood terkontrol (studio, luxury, dark moody, dst) = foto bersih */
  var controlled=/studio|softbox|e-commerce|dark moody|low key|dramatic|directional/.test(light.toLowerCase())
    ||/clean, bright|luxury premium|editorial|dark moody|soft pastel|high-key|cinematic/.test(moodFull.toLowerCase());
  var quality;
  if(controlled){
    quality={
      camera:'High-quality, sharp, well-exposed POV photo with accurate colors and clean detail, matching the selected lighting and mood; realistic and natural-looking, not over-processed or artificially smoothed. The product stays sharp and in focus.',
      lighting:cap(light)+'. Keep the lighting controlled and consistent across the frame; accurate product colors without overexposure, and shadows never cover product details.'
    };
  }else{
    quality={
      camera:'Shot with a smartphone camera (not a DSLR), with a natural handheld POV feel. Subtle noise and grain typical of a phone camera, realistic dynamic range without heavy HDR. The product stays sharp and in focus. Looks like an authentic phone photo, not a polished studio image.',
      lighting:cap(light)+'. Accurate product colors without overexposure, and shadows never cover product details. Feels organic and spontaneous.'
    };
  }

  var fullJson={
    prompt:prompt,
    mood_and_tone:moodFull,
    reference_photos:refPhotos,
    product:{name:name,placement:placement},
    scene:{location:loc,camera:camera,mood_and_tone:moodFull},
    output_quality:quality
  };
  return {fullJson:fullJson,realRefs:realRefs,randomRefs:[],subjekLabel:'Produk'};
}
wrap('_fBuildPromptJSON',function(o,a){
  if(!FS.povProduk)return o.apply(this,a);
  return povBuild();
});

window.povSync=povSync;   /* dipakai kode Riwayat di luar blok ini */
/* ── init: sisipkan hint bahasa Inggris di step Lokasi/Pencahayaan/Mood ── */
function init(){
  ['f5','f7','f9'].forEach(function(id){
    var wb=$(id)&&$(id).querySelector('.wbody');
    if(!wb||wb.querySelector('.pov-hint'))return;
    var h=document.createElement('p');
    h.className='pov-hint';
    h.textContent='Prompt dibuat dalam bahasa Inggris. Kalau isi sendiri, tulis dalam bahasa Inggris supaya hasilnya rapi.';
    wb.insertBefore(h,wb.firstChild);
  });
  povSync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
