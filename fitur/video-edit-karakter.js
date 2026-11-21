// fitur/video-edit-karakter.js — Prompt Video AI — edit karakter langsung di prompt (ikon pensil).
// Bagian dari js/10-main-app.js lama (baris 14191–15191). Isi tidak diubah.
// ═══════════════════════════════════════════════════════════════════
// FITUR BARU (permintaan user): EDIT KARAKTER LANGSUNG DI PROMPT (ikon pensil
// di samping tombol Revisi). Motion Karakter, Jenis Kelamin, Usia, Nada Bicara
// & Aksen bisa diganti KAPAN SAJA setelah skrip muncul, per produk. Perubahan
// langsung menulis ulang prompt Hook/Cerita Produk/CTA produk itu — TIDAK
// dikirim ke AI, TIDAK memakai jatah revisi, dan teks skrip tidak berubah.
// Nilai override disimpan di VB_CHAR_OVR[prodIdx]; kalau key-nya tidak ada,
// dipakai nilai default dari wizard (VB). idx kartu → produk = floor(idx/3).
// ═══════════════════════════════════════════════════════════════════
function _vbCharProdIdx(idx){return (typeof idx==='number'&&idx>=0)?Math.floor(idx/3):-1;}
function _vbCharVal(idx,key){
  var pi=_vbCharProdIdx(idx);
  var o=(pi>=0&&typeof VB_CHAR_OVR!=='undefined')?VB_CHAR_OVR[pi]:null;
  var v=(o&&Object.prototype.hasOwnProperty.call(o,key))?o[key]:(VB[key]||'');
  // Jaring pengaman: preset motion yang tidak cocok dengan gender efektif produk ini
  // (mis. sisa dari Undo/Riwayat) tidak boleh sampai ke prompt.
  if(key==='motion'&&v&&typeof vbMotionValid==='function'&&!vbMotionValid(v,_vbCharVal(idx,'gender')))return '';
  // Jaring pengaman: gerakan kamera / visual hook yang bukan milik mode aktif (sisa Undo/Riwayat) tidak boleh sampai ke prompt.
  if((key==='camMove'||key==='camHook')&&v){
    var _cs=(key==='camHook'?VB_CAM_HOOK_OPTS:VB_CAM_OPTS)[VB.refMode]||[];
    if(!_vbCamIsCustom(v)&&!_cs.some(function(o){return o[0]===v;}))return '';
  }
  return v;
}
function _vbCharFields(){
  var fl=[
    {key:'motion',title:'Pembawaan',none:'Tidak dipakai',ph:'Atau isi sendiri, contoh: anggun dan kalem',max:80,chips:VB_MOTION_OPTS.filter(function(o){return !o.legacy&&!o.nadaOnly;}).map(function(o){return [o.k,o.label];})},
    {key:'gender',title:'Jenis Kelamin',chips:[['male','Laki-laki'],['female','Perempuan']]},
    {key:'age',title:'Usia',ph:'Atau isi sendiri, contoh: elderly woman, around 65 years old',max:120,chips:[['child, approximately 5-10 years old','Anak-anak'],['teenager, approximately 15-20 years old','Remaja'],['young adult, approximately 20-30 years old','Dewasa Muda'],['adult, approximately 30-45 years old','Dewasa'],['middle-aged adult, approximately 45-60 years old','Paruh Baya']]},
    {key:'pitch',title:'Gaya Bicara',ph:'Atau tulis sendiri, contoh: lelah tapi tetap ramah',max:80,chips:[['bercanda','Suka bercanda'],['gaul','Gaul'],['toxic','Toxic']]},
    {key:'accent',title:'Aksen',ph:'Atau tulis sendiri, contoh: logat Bali yang ramah',max:120,chips:[['neutral standard accent','Netral'],['casual Jakarta accent','Jakarta'],['light Sundanese accent','Sunda'],['light Medan accent','Medan'],['light Malaysian accent','Malaysia']]}
  ];
  // Gerakan Kamera & Visual Hook (hanya mode Start Frame / Frame Asset / Raw Asset) — bisa diganti per produk setelah skrip muncul.
  if(typeof _vbHasCam==='function'&&_vbHasCam()){
    var _m=VB.refMode;
    fl.push({key:'camMove',title:'Gerakan Kamera',none:'Tanpa gerakan kamera',ph:(VB.refMode==='aset'?'Atau isi sendiri, contoh: slow zoom out from the product to the full scene':'Atau isi sendiri, contoh: slow zoom out from the product to the character'),max:200,chips:(VB_CAM_OPTS[_m]||[]).map(function(o){return [o[0],o[1]];})});
    fl.push({key:'camHook',title:'Visual Hook · kartu Hook',none:'Tidak dipakai',ph:(VB.refMode==='aset'?'Atau isi sendiri, contoh: a hand quickly slides the product into the frame':'Atau isi sendiri, contoh: the character gasps and points at the product'),max:200,chips:(VB_CAM_HOOK_OPTS[_m]||[]).map(function(o){return [o[0],o[1]];})});
  }
  // TULISAN ESTETIK (19 Nov 2026, permintaan user): tombol nyala/mati satu klik di grup Visual. Nyala = kalimat VB_AESTHETIC_TEXT masuk ke prompt Hook/Cerita/CTA produk ini.
  fl.push({key:'aesthetic',title:'Tulisan Estetik',none:'Tidak dipakai',chips:[['1','Aktif']]});
  if(VB.refMode==='aset')fl=fl.filter(function(f){return f.key!=='motion';}); // Frame Asset tanpa karakter
  if(VB.refMode==='dua')fl=fl.filter(function(f){return f.key==='gender'||f.key==='age';}); // Percakapan 2 Suara: prompt video JSON hanya memakai jenis kelamin & usia (suara off-screen otomatis kebalikan)
  return fl;
}
function _vbCharHasOvr(prodIdx){
  // Emas hanya kalau ada field yang nilainya BEDA dari default wizard — memilih chip yang sama
  // dengan default tidak dihitung sebagai pengaturan sendiri.
  var o=VB_CHAR_OVR[prodIdx];
  if(!o)return false;
  return Object.keys(o).some(function(k){return String(o[k])!==String(VB[k]||'');});
}
function _vbCharBtnState(b,prodIdx){
  var on=_vbCharHasOvr(prodIdx);
  b.style.color=on?'var(--accent)':'';
  b.style.borderColor=on?'var(--accent)':'';
}
function _vbCharMakeBtn(prodIdx,big){
  var b=document.createElement('button');
  b.id='vb-char-btn-'+prodIdx;b.type='button';b.className='copy-btn';
  b.title='Edit motion, jenis kelamin, usia, nada, aksen, kamera & visual hook';
  b.setAttribute('aria-label','Edit karakter dan suara');
  b.style.cssText=(big?'font-size:var(--fs-xs2);padding:8px 12px;':'font-size:var(--fs-2xs);padding:3px 8px;')+'flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;';
  b.innerHTML='<svg class="icon"><use href="#ic-edit"></use></svg>';
  b.onclick=function(){vbToggleCharPanel(prodIdx);};
  _vbCharBtnState(b,prodIdx);
  return b;
}
function _vbCharMakePanel(prodIdx,style){
  var _old=document.getElementById('vb-char-panel-'+prodIdx);
  if(_old&&_old.parentNode===document.body){_old.remove();var _sc=document.getElementById('vbc-scrim');if(_sc)_sc.classList.remove('on');document.documentElement.style.overflow='';}
  var d=document.createElement('div');
  d.id='vb-char-panel-'+prodIdx;d.className='vbc-sheet hidden';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-label','Edit karakter dan suara'); // gaya lama (style) tidak dipakai lagi
  return d;
}
var VB_CHAR_PANEL_STYLE_GROUP='padding:9px;background:var(--surface2);border-bottom:1px solid var(--border-hi);display:flex;flex-direction:column;gap:4px;';
var VB_CHAR_PANEL_STYLE_SINGLE='padding:9px;background:var(--surface2);border:1px solid var(--border-hi);border-radius:var(--radius-xs);display:flex;flex-direction:column;gap:4px;';
var VB_CHAR_TAB_NAMES={motion:'Pembawaan',gender:'Gender',age:'Usia',pitch:'Nada',accent:'Aksen',camMove:'Kamera',camHook:'Visual Hook',ov:'Teks Hook'};
// Label yang ditampilkan untuk nilai field: nama chip kalau cocok preset, teks sendiri kalau custom.
function _vbCharLabel(f,v){
  v=String(v||'');
  if(_vbCamIsCustom(v))return _vbCamCustomText(v);
  if(!v)return f.none||(f.key==='ov'?'Kosong':'Default');
  var all=(f.none?[['',f.none]]:[]).concat(f.chips||[]);
  for(var i=0;i<all.length;i++)if(String(all[i][0])===v)return all[i][1];
  return v;
}
// ── PANEL PENSIL: tampilan "Kartu + Picker" (opsi C dari preview-edit-skrip-v2, Nov 2026) ──
// Lembar bawah: ringkasan di atas, kartu per pengaturan (2 kolom); ketuk kartu → daftar pilihan + kolom isi sendiri.
// HANYA tampilan — logika pilih / isi sendiri / sinkron / reset tetap sama (vbCharPick, vbCharCustom, _vbCharSync).
var VBC_IC={x:'M6 6l12 12M18 6L6 18',back:'M15 6l-6 6 6 6',
smile:'M12 3a9 9 0 100 18 9 9 0 000-18zM8.5 14c.9 1.4 2.1 2 3.5 2s2.6-.6 3.5-2M9 9.6h.01M15 9.6h.01',
user:'M12 4a4 4 0 100 8 4 4 0 000-8zM4 21c.8-4 4-6 8-6s7.2 2 8 6',
cal:'M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM4 10h16M9 3v4M15 3v4',
mic:'M12 3a3 3 0 013 3v5a3 3 0 01-6 0V6a3 3 0 013-3zM5 11a7 7 0 0014 0M12 18v3',
globe:'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
cam:'M4 8h3l2-3h6l2 3h3v11H4zM12 10a3.5 3.5 0 100 7 3.5 3.5 0 000-7z',
bolt:'M13 3L5 14h6l-1 7 8-11h-6z',type:'M5 6V4h14v2M12 4v16M9 20h6',
sparkle:'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16v4M17 18h4'};
var VBC_META={motion:['smile',0],gender:['user',0],age:['cal',0],pitch:['mic',1],accent:['globe',1],camMove:['cam',2],camHook:['bolt',2],ov:['type',2],aesthetic:['sparkle',2]}; // [ikon, grup]
var VBC_GROUPS=['Karakter','Suara','Visual'];
var VBC_NAMES={motion:'Pembawaan',gender:'Jenis Kelamin',age:'Usia',pitch:'Gaya Bicara',accent:'Aksen',camMove:'Gerakan Kamera',camHook:'Visual Hook',ov:'Teks Hook',aesthetic:'Tulisan Estetik'};
function _vbcIc(n){return '<svg class="vbc-i" viewBox="0 0 24 24" aria-hidden="true"><path d="'+VBC_IC[n]+'"/></svg>';}
// Isi satu opsi kamera/visual hook: nama + penjelasan singkat (VB_CAM_UI, sama dengan yang tampil di wizard) kalau ada.
function _vbcOpt(o){var u=(typeof VB_CAM_UI!=='undefined')&&VB_CAM_UI[String(o[0]).replace(/^[a-z]+_/,'')];return u?'<span><b>'+esc(o[1])+'</b><small>'+esc(u[0])+'</small></span>':esc(o[1]);}
// i >= 0: buka daftar pilihan pengaturan ke-i; i = -1: kembali ke semua kartu.
function vbCharTab(prodIdx,i){
  var panel=document.getElementById('vb-char-panel-'+prodIdx);
  if(!panel)return;
  panel.querySelector('[data-cview="grid"]').classList.toggle('hidden',i>=0);
  panel.querySelector('[data-cview="pick"]').classList.toggle('hidden',i<0);
  panel.querySelectorAll('[data-cp]').forEach(function(p){p.classList.toggle('hidden',p.dataset.cp!==String(i));});
  var bd=panel.querySelector('[data-cbody]');if(bd)bd.scrollTop=0;
}
function _vbCharBuildPanel(prodIdx,panel){
  var fs=_vbCharFields(); // 20 Nov 2026 (permintaan user): opsi "Teks Hook" (ov) dihapus dari panel pensil
  var nn=fs.filter(function(f){return f.key!=='camHook'&&f.key!=='ov'&&f.key!=='aesthetic';}).length; // kartu biasa; kalau ganjil, yang terakhir dilebarkan supaya tidak ada lubang
  var tiles='',panes='';
  fs.forEach(function(f,i){
    var m=VBC_META[f.key]||['smile',0],nm=VBC_NAMES[f.key]||f.title,wide=f.key==='camHook'||f.key==='ov'||f.key==='aesthetic'||(nn%2===1&&i===nn-1);
    tiles+='<button type="button" class="vbc-tile'+(wide?' w':'')+'" onclick="'+(f.key==='aesthetic'?'vbCharToggleAesthetic('+prodIdx+')':'vbCharTab('+prodIdx+','+i+')')+'"'+(f.key==='aesthetic'?' aria-pressed="false"':'')+'><span class="vbc-ic">'+_vbcIc(m[0])+'</span><span><small>'+esc(nm)+'</small><strong data-cvs="'+f.key+'"></strong></span><i data-cvd="'+f.key+'"></i></button>';
    if(f.key==='aesthetic')return; // satu klik langsung nyala/mati — tidak punya pane pilihan
    var p='<div class="vbc-pane hidden" data-cp="'+i+'"><div class="vbc-ttl">'+esc(nm)+'</div>';
    if(f.key==='ov'){
      p+='<div data-ovhost></div>';
    }else{
      var _isCam=(f.key==='camMove'||f.key==='camHook'),c='';
      if(f.key==='motion'){c=_vbCharMotionChipsHtml(prodIdx);}
      else if(_isCam){c=_vbCharCamChipsHtml(prodIdx,f.key);}
      else{
        if(f.none)c+='<div class="chip" data-k="'+f.key+'" data-v="" onclick="vbCharPick('+prodIdx+',this)">'+esc(f.none)+'</div>';
        (f.chips||[]).forEach(function(ch){c+='<div class="chip" data-k="'+f.key+'" data-v="'+esc(ch[0])+'" onclick="vbCharPick('+prodIdx+',this)">'+esc(ch[1])+'</div>';});
      }
      p+='<div class="chips"'+(f.key==='motion'?' data-mchips="1"':'')+(_isCam?' data-cchips="'+f.key+'"':'')+'>'+c+'</div>';
      if(f.ph)p+='<input class="inp" data-k="'+f.key+'" maxlength="'+f.max+'" placeholder="Atau isi sendiri…" oninput="vbCharCustom('+prodIdx+',this)" /><small class="vbc-ex">Contoh: '+esc(f.ph.replace(/^.*contoh: /,''))+'</small>';
    }
    panes+=p+'</div>';
  });
  panel.innerHTML='<div class="vbc-grab"></div>'
    +'<div class="vbc-sh"><div><b>Edit Karakter &amp; Suara</b><small>Produk '+(prodIdx+1)+' · mengubah Hook, Cerita &amp; CTA</small></div><span class="vbc-bdg hidden" data-cvbadge></span><button type="button" class="vbc-x" aria-label="Tutup" onclick="_vbCharClose(this.closest(\'.vbc-sheet\'))">'+_vbcIc('x')+'</button></div>'
    +'<div class="vbc-bd" data-cbody>'
    +'<div data-cview="grid"><div class="vbc-pv" data-cvline></div><div class="vbc-grid">'+tiles+'</div><p class="vbc-note">Langsung mengubah prompt Hook, Cerita Produk &amp; CTA produk ini. Tidak dikirim ke server dan tidak memakai jatah revisi.</p></div>'
    +'<div data-cview="pick" class="hidden"><button type="button" class="vbc-back" onclick="vbCharTab('+prodIdx+',-1)">'+_vbcIc('back')+'Semua pengaturan</button>'+panes+'</div>'
    +'</div>'
    +'<div class="vbc-ft"><button type="button" class="reset-btn" onclick="vbCharReset('+prodIdx+')">Kembalikan Default</button><button type="button" class="btn sm" onclick="_vbCharClose(this.closest(\'.vbc-sheet\'))">Selesai</button></div>';
}
// Chip Motion di panel pensil mengikuti gender EFEKTIF produk itu (override pensil, kalau tidak ya default wizard).
function _vbCharMotionChipsHtml(prodIdx){
  var g=_vbCharVal(prodIdx*3,'gender');
  var h='<div class="chip" data-k="motion" data-v="" onclick="vbCharPick('+prodIdx+',this)">Tidak dipakai</div>';
  vbMotionOptsFor(g,_vbCharVal(prodIdx*3,'pitch')).forEach(function(o){h+='<div class="chip" data-k="motion" data-v="'+esc(o.k)+'" onclick="vbCharPick('+prodIdx+',this)">'+esc(o.label)+'</div>';});
  return h;
}
// Pilihan Gerakan Kamera / Visual Hook di panel pensil: sama dengan wizard (per mode), disaring mengikuti
// nada & aksen EFEKTIF produk itu (jalur "Kami Bantu Isi" saja), supaya gerak kamera tetap nyambung dengan cara bicaranya.
function _vbCharCamList(prodIdx,key){
  var src=(key==='camHook'?VB_CAM_HOOK_OPTS:VB_CAM_OPTS)[VB.refMode]||[];
  try{
    if((VB.pbDone||VB.pbPath)!=='ai')return src;
    var t=String(_vbCharVal(prodIdx*3,'pitch')||'').trim().toLowerCase();
    var tone=VB_CAM_TONE[t]?t:'',ac=VB_CAM_ACC_CLASS[_vbCharVal(prodIdx*3,'accent')]||'';
    if(!tone&&!ac)return src;
    var tl=tone?src.filter(function(o){return VB_CAM_TONE[tone].indexOf(o[0])>-1;}):src;
    var both=ac?tl.filter(function(o){return VB_CAM_ACC_EXCL[ac].indexOf(o[0])<0;}):tl;
    if(both.length>=3)return both;
    return tl.length>=3?tl:src;
  }catch(e){return src;}
}
function _vbCharCamChipsHtml(prodIdx,key){
  var h='<div class="chip" data-k="'+key+'" data-v="" onclick="vbCharPick('+prodIdx+',this)">'+(key==='camHook'?'Tidak dipakai':'Tanpa gerakan kamera')+'</div>';
  _vbCharCamList(prodIdx,key).forEach(function(o){h+='<div class="chip" data-k="'+key+'" data-v="'+esc(o[0])+'" onclick="vbCharPick('+prodIdx+',this)">'+_vbcOpt(o)+'</div>';});
  return h;
}
function _vbCharRenderCamChips(prodIdx,panel){
  panel.querySelectorAll('[data-cchips]').forEach(function(box){
    var key=box.dataset.cchips;
    var sig=_vbCharCamList(prodIdx,key).map(function(o){return o[0];}).join('|');
    if(box.dataset.sig===sig)return;
    box.dataset.sig=sig;
    box.innerHTML=_vbCharCamChipsHtml(prodIdx,key);
  });
}
function _vbCharRenderMotionChips(prodIdx,panel){
  var box=panel.querySelector('[data-mchips]');
  if(!box)return;
  var sig=vbMotionOptsFor(_vbCharVal(prodIdx*3,'gender'),_vbCharVal(prodIdx*3,'pitch')).map(function(o){return o.k;}).join('|');
  if(box.dataset.sig===sig)return;
  box.dataset.sig=sig;
  box.innerHTML=_vbCharMotionChipsHtml(prodIdx);
}
function _vbCharSync(prodIdx){
  var idx0=prodIdx*3;
  var panel=document.getElementById('vb-char-panel-'+prodIdx);
  if(panel){
    _vbCharRenderMotionChips(prodIdx,panel);
    _vbCharRenderCamChips(prodIdx,panel);
    var _cn=panel.querySelector('[data-camnote]');
    if(_cn)_cn.classList.toggle('hidden',!(VB.refMode==='aset'&&_vbCharVal(idx0,'camHook')));
    panel.querySelectorAll('.chip[data-k]').forEach(function(c){
      c.classList.toggle('sel',String(_vbCharVal(idx0,c.dataset.k)||'')===String(c.dataset.v));
    });
    panel.querySelectorAll('input[data-k]').forEach(function(inp){
      if(document.activeElement===inp)return; // jangan ganggu yang lagi diketik
      var cur=String(_vbCharVal(idx0,inp.dataset.k)||'');
      if(_vbCamIsCustom(cur))cur=_vbCamCustomText(cur);
      var isPreset=Array.prototype.some.call(panel.querySelectorAll('.chip[data-k="'+inp.dataset.k+'"]'),function(c){return c.dataset.v===cur;});
      inp.value=isPreset?'':cur;
    });
  }
  var ovInp=document.getElementById('vb-hookoverlay-input-'+prodIdx);
  if(ovInp&&document.activeElement!==ovInp)ovInp.value=(VB_HOOK_OVERLAY[prodIdx]||'');
  if(panel){
    var gl=[null,null,null],nch=0; // ringkasan per grup (null = grup tidak ada di mode ini)
    _vbCharFields().forEach(function(f){
      var v=_vbCharVal(idx0,f.key),chg=String(v)!==String(VB[f.key]||''),lab=_vbCharLabel(f,v),g=(VBC_META[f.key]||[0,0])[1];
      var sp=panel.querySelector('[data-cvs="'+f.key+'"]');
      if(sp){sp.textContent=lab;sp.style.color=chg?'var(--accent-text-on-dark)':'';}
      if(f.key==='aesthetic'&&sp&&sp.closest('button'))sp.closest('button').setAttribute('aria-pressed',v?'true':'false');
      var d=panel.querySelector('[data-cvd="'+f.key+'"]');
      if(d){d.style.display=chg?'block':'none';d.parentNode.classList.toggle('d',chg);}
      if(chg)nch++;
      (gl[g]=gl[g]||[]);if(v)gl[g].push(f.key==='aesthetic'?'Tulisan Estetik':lab);
    });
    var bg=panel.querySelector('[data-cvbadge]');
    if(bg){bg.textContent=nch+' diubah';bg.classList.toggle('hidden',!nch);}
    var sl=panel.querySelector('[data-cvline]');
    if(sl)sl.innerHTML=gl.map(function(a,i){return a?'<div><b>'+VBC_GROUPS[i]+'</b>'+(a.length?esc(a.join(' · ')):'—')+'</div>':'';}).join('');
  }
  var btn=document.getElementById('vb-char-btn-'+prodIdx);
  if(btn)_vbCharBtnState(btn,prodIdx);
}
function _vbCharRefresh(prodIdx){
  for(var k=0;k<3;k++){
    var idx=prodIdx*3+k;
    if(document.getElementById('vb-bulk-script-'+idx)&&document.getElementById('vb-bulk-json-'+idx))vbBulkUpdateJson(idx);
  }
  _vbCharSync(prodIdx);
}
function vbCharSet(prodIdx,key,val){
  var o=VB_CHAR_OVR[prodIdx]||(VB_CHAR_OVR[prodIdx]={});
  if(val===null)delete o[key];else o[key]=val;
  if(key==='gender'&&!vbMotionValid(_vbCharVal(prodIdx*3,'motion'),_vbCharVal(prodIdx*3,'gender')))o.motion='';
  // Ganti Nada di pensil: pembawaan produk ini yang tidak cocok dengan nada baru dikosongkan.
  if(key==='pitch'){
    var _rawM=Object.prototype.hasOwnProperty.call(o,'motion')?o.motion:(VB.motion||'');
    if(_rawM&&!vbMotionFitsNada(_rawM,_vbCharVal(prodIdx*3,'pitch'))){
      o.motion='';
      try{showToast('Pembawaan disesuaikan dengan gaya bicara','info');}catch(e){}
    }
  }
  // Ganti Nada / Aksen di pensil: gerakan kamera & visual hook produk ini yang tidak cocok lagi dikosongkan.
  if(key==='pitch'||key==='accent'){
    var _camCleared=false;
    ['camMove','camHook'].forEach(function(ck){
      var cur=_vbCharVal(prodIdx*3,ck);
      if(!cur||_vbCamIsCustom(cur))return;
      if(!_vbCharCamList(prodIdx,ck).some(function(x){return x[0]===cur;})){o[ck]='';_camCleared=true;}
    });
    if(_camCleared){try{showToast('Gerakan kamera disesuaikan dengan nada & aksen — pilih lagi ya','info');}catch(e){}}
  }
  if(!Object.keys(o).length)delete VB_CHAR_OVR[prodIdx];
  _vbCharRefresh(prodIdx);
}
// Klik chip tidak memicu 'input'/'change' (satu-satunya pemicu snapshot undo untuk elemen biasa),
// jadi titik undo-nya dicatat manual di sini. Ketikan di kolom isi sudah tercatat lewat listener 'input'.
function _vbCharSnap(){try{if(typeof pbForceSaveDraftNow==='function')pbForceSaveDraftNow();}catch(e){}}
// 20 Nov 2026 (permintaan user): setelah user memilih chip, panel otomatis kembali ke "Semua pengaturan" (tidak perlu klik tombol kembali). Mengetik di kolom "Atau isi sendiri" TIDAK memicu ini (lewat vbCharCustom).
function vbCharPick(prodIdx,el){vbCharSet(prodIdx,el.dataset.k,el.dataset.v);_vbCharSnap();vbCharTab(prodIdx,-1);}
// TULISAN ESTETIK (19 Nov 2026, permintaan user): klik tile di panel pensil = nyala/mati. Nyala -> kalimat di bawah (bahasa Indonesia sejak 20 Nov 2026, permintaan user; awalnya harus "Muncul beberapa tulisan estetik" karena dikenali regex _scriptRe; teks persis dari user, ejaan "vidio"; diganti lagi 20 Nov 2026 jadi versi hook detik pertama, tetap diawali "Muncul beberapa tulisan estetik") otomatis masuk ke prompt (lihat _vbBuildFlowText).
const VB_AESTHETIC_TEXT="Muncul beberapa tulisan estetik yang bikin visual vidio jadi lebih menarik dan tulisan pas vidio dimulai berupa tulisan hook yang menarik yang sesuai dengan produk dan isi skrip, supaya audiens bisa langsung fokus di detik pertama dimulai.";
function vbCharToggleAesthetic(prodIdx){
  vbCharSet(prodIdx,'aesthetic',_vbCharVal(prodIdx*3,'aesthetic')?null:'1');
  _vbCharSnap();
}
function vbCharCustom(prodIdx,inp){
  var v=inp.value.trim();
  if(v&&(inp.dataset.k==='camMove'||inp.dataset.k==='camHook'))v='custom:'+v; // kamera / visual hook tulis sendiri
  vbCharSet(prodIdx,inp.dataset.k,v?v:null); // kosong = balik ke default wizard
}
function vbCharReset(prodIdx){
  delete VB_CHAR_OVR[prodIdx];
  _vbCharRefresh(prodIdx);
  _vbCharSnap();
  showToast('Karakter dikembalikan ke pengaturan awal.','success');
}
function vbToggleCharPanel(prodIdx,forceClose){
  var panel=document.getElementById('vb-char-panel-'+prodIdx);
  if(!panel)return;
  if(forceClose||panel.classList.contains('on')){_vbCharClose(panel);return;}
  if(!panel.dataset.built){_vbCharBuildPanel(prodIdx,panel);panel.dataset.built='1';}
  vbCharTab(prodIdx,-1);
  // Selama terbuka, panel dipindah ke <body>: kartu hasil bisa punya efek (transform/blur) yang membuat position:fixed ikut terpotong.
  if(panel.parentNode!==document.body){panel._home=panel.parentNode;panel._next=panel.nextSibling;} // jangan timpa tempat asal kalau dibuka lagi saat animasi tutup
  var sc=document.getElementById('vbc-scrim');
  if(!sc){sc=document.createElement('div');sc.id='vbc-scrim';sc.className='vbc-scrim';document.body.appendChild(sc);}
  sc.onclick=function(){_vbCharClose(panel);};
  document.body.appendChild(panel);
  panel.classList.remove('hidden');
  _vbCharSync(prodIdx);
  void panel.offsetWidth;
  panel.classList.add('on');sc.classList.add('on');
  document.documentElement.style.overflow='hidden';
  if(!window._vbcEsc){window._vbcEsc=1;document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;var o=document.querySelector('.vbc-sheet.on');if(o)_vbCharClose(o);});}
}
function _vbCharClose(panel){
  panel.classList.remove('on');
  var sc=document.getElementById('vbc-scrim');if(sc)sc.classList.remove('on');
  document.documentElement.style.overflow='';
  setTimeout(function(){
    if(panel.classList.contains('on'))return; // dibuka lagi sebelum animasi tutup selesai
    panel.classList.add('hidden');
    var h=panel._home;
    if(h&&h.isConnected)h.insertBefore(panel,(panel._next&&panel._next.parentNode===h)?panel._next:null);
    else panel.remove(); // kartu asalnya sudah digambar ulang
  },400);
}
// Dipanggil setelah Undo/Redo/pemulihan draft: state VB_CHAR_OVR sudah dipulihkan, tapi teks prompt
// di kartu & warna tombol pensil masih versi lama (pengaturan pensil tidak punya input ber-id yang
// ikut dipulihkan). Bangun ulang teks prompt semua kartu produk yang tampil & segarkan tombol/panelnya.
function _vbCharResyncAll(){
  try{if(typeof _vbMotionDrawChips==='function')_vbMotionDrawChips();}catch(e){}
  try{
    document.querySelectorAll('[id^="vb-char-btn-"]').forEach(function(b){
      var n=parseInt(b.id.replace('vb-char-btn-',''),10);
      if(!isNaN(n))_vbCharRefresh(n);
    });
  }catch(e){}
}
// Bangun baris UI "Jumlah Foto Produk" untuk produk ke-prodIdx — chip angka
// 1-5 + "Ikuti foto asli", dengan ikon kamera KUNING (var(--accent)) di
// labelnya. Dipakai di 2 tempat: atas kartu Hook mode single-produk
// (_vbRenderMultiOutput) & atas kartu Hook tiap grup produk mode Bulk
// (_vbRenderBulkOutput) — keduanya cuma tampil kalau VB.refMode==='kp'
// (Mode 3), karena tanpa foto produk terpisah fitur ini tidak relevan.
function _vbBuildProductFotoCountRow(prodIdx){
  let wrap=document.createElement('div');
  wrap.id='vb-fotocount-row-'+prodIdx;
  wrap.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 9px;margin-bottom:6px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-xs);';
  let label=document.createElement('div');
  label.style.cssText='font-size:var(--fs-2xs);color:var(--muted);width:100%;display:flex;align-items:center;gap:5px;margin-bottom:2px;';
  label.innerHTML='<svg class="icon" style="width:13px;height:13px;color:var(--accent);flex-shrink:0;"><use href="#ic-camera"></use></svg> Jumlah Foto Produk (foto referensi 2 dst.)';
  wrap.appendChild(label);
  let currentFc=VB_PRODUCT_FOTOCOUNT[prodIdx]||0;
  [1,2,3,4,5].forEach(function(n){
    let chip=document.createElement('div');
    chip.className='chip'+(currentFc===n?' sel':'');
    chip.style.cssText='font-size:var(--fs-2xs);padding:6px 10px;min-width:28px;text-align:center;';
    chip.textContent=String(n);
    chip.onclick=(function(pi,nn){return function(){vbPickFotoCountProduct(pi,nn);};})(prodIdx,n);
    wrap.appendChild(chip);
  });
  let clearChip=document.createElement('div');
  clearChip.className='chip'+(currentFc?'':' sel');
  clearChip.style.cssText='font-size:var(--fs-2xs);padding:6px 10px;color:var(--muted);';
  clearChip.textContent='Ikuti foto asli';
  clearChip.onclick=(function(pi){return function(){vbPickFotoCountProduct(pi,0);};})(prodIdx);
  wrap.appendChild(clearChip);
  return wrap;
}
// User pilih (atau hapus, kalau count=0) angka jumlah foto produk untuk
// PRODUK ke-prodIdx — langsung refresh baris UI-nya sendiri (highlight chip)
// DAN rebuild JSON ketiga kartu Hook/Story/CTA produk ini sekaligus (idx =
// prodIdx*3, prodIdx*3+1, prodIdx*3+2), beda dari versi lama yang per-kartu.
function vbPickFotoCountProduct(prodIdx,count){
  if(count){VB_PRODUCT_FOTOCOUNT[prodIdx]=count;}
  else{delete VB_PRODUCT_FOTOCOUNT[prodIdx];}
  let row=document.getElementById('vb-fotocount-row-'+prodIdx);
  if(row){let fresh=_vbBuildProductFotoCountRow(prodIdx);row.replaceWith(fresh);}
  let base=prodIdx*3;
  [0,1,2].forEach(function(off){
    let idx=base+off;
    if(document.getElementById('vb-bulk-script-'+idx))vbBulkUpdateJson(idx);
  });
}

// FITUR BARU (permintaan user): toggle "+ Atur Detail" + panel teks overlay,
// ditampilkan di ATAS kartu Hook untuk produk ke-prodIdx — di SEMUA mode
// referensi foto (1/2/3), baik mode single-produk (_vbRenderMultiOutput,
// selalu prodIdx 0) maupun tiap grup produk di mode Bulk (_vbRenderBulkOutput,
// prodIdx 0,1,2,...). Tersembunyi & kosong secara default — teks overlay
// HANYA ditambahkan ke prompt Hook (lihat _vbBuildFlowText) kalau user
// benar-benar mengisi kotak ini.
function _vbBuildHookOverlayInPanel(prodIdx){
  // Sekarang bagian dari panel ikon pensil (bukan lagi baris "+ Atur Detail"
  // terpisah di atas kartu Hook). id input & logika vbHookOverlayInput SAMA
  // seperti sebelumnya, jadi semua sinkronisasi state tetap jalan.
  let box=document.createElement('div');
  box.id='vb-hookoverlay-box-'+prodIdx;
  box.style.cssText='margin-top:8px;';

  let inp=document.createElement('input');
  inp.className='inp';
  inp.id='vb-hookoverlay-input-'+prodIdx;
  inp.maxLength=60;
  inp.placeholder='Contoh: polkadot';
  inp.style.cssText='font-size:var(--fs-xs2);padding:6px 8px;width:100%;box-sizing:border-box;';
  inp.value=VB_HOOK_OVERLAY[prodIdx]||'';
  inp.oninput=(function(pi){return function(){vbHookOverlayInput(pi);};})(prodIdx);
  box.appendChild(inp);

  let hint=document.createElement('p');
  hint.style.cssText='font-size:var(--fs-2xs);color:var(--muted2);margin:6px 0 0;';
  hint.textContent='Kalau diisi, teks ini otomatis ditambahkan ke akhir prompt Hook: muncul tulisan kecil banget di pojok kanan paling bawah layar pada detik awal (0–2 detik) lalu menghilang. Kosongkan kalau tidak perlu teks overlay.';
  box.appendChild(hint);
  return box;
}
// Dipanggil tiap user ngetik di kotak Teks Overlay — simpan ke state &
// rebuild JSON kartu Hook produk ini SAJA (idx=prodIdx*3), realtime, sama
// pola-nya seperti vbPickTampilProduk/vbPickLokasiCard.
function vbHookOverlayInput(prodIdx){
  let inp=document.getElementById('vb-hookoverlay-input-'+prodIdx);
  let val=inp?inp.value.trim():'';
  if(val)VB_HOOK_OVERLAY[prodIdx]=val;
  else delete VB_HOOK_OVERLAY[prodIdx];
  // Sinkron ke data produk bulk (kalau ada) supaya Generate Ulang Semua /
  // Revisi 1 Produk tidak mengembalikan isi lama dari form input.
  if(typeof VB_BULK_PRODUCTS!=='undefined'&&VB_BULK_PRODUCTS[prodIdx])VB_BULK_PRODUCTS[prodIdx].overlay=val;
  // Mode single AI: sinkronkan balik ke kolom Isi di form (dan state-nya).
  if(prodIdx===0&&VB_SINGLE_OVERLAY!==null){
    VB_SINGLE_OVERLAY=val;
    let formInp=document.getElementById('vb-overlay-input');
    if(formInp&&formInp.value.trim()!==val)formInp.value=val;
  }
  let hookIdx=prodIdx*3;
  if(document.getElementById('vb-bulk-script-'+hookIdx))vbBulkUpdateJson(hookIdx);
  _vbCharSync(prodIdx);
}

let VB_BULK_PRODUCTS=[]; // {nama, keunggulan, fotoBase64, fotoMime} — 1 entri per produk, dipakai buat revisi ulang (per-produk & semua sekaligus)

// Override foto SEMENTARA khusus panel Revisi 1 produk, keyed by prodIdx —
// hanya terisi kalau user benar-benar upload/hapus foto baru di panel itu.
// TIDAK langsung mengubah VB_BULK_PRODUCTS (foto "resmi") — baru
// dipermanenkan ke sana setelah user klik "Generate Ulang Produk Ini"
// (lihat vbRevisiProdukAI). Direset tiap kali hasil bulk baru dirender
// (_vbRenderBulkOutput) & di vbReset(), supaya tidak nyangkut ke prodIdx
// yang salah di sesi/generate berikutnya.
let VB_REVISI_FOTO_OVERRIDE={};

// Cache PERSISTEN nama/keunggulan/foto tiap baris bulk, bertahan sepanjang sesi
// (lihat FIX BUG#15 di bawah) — direset di vbReset().
let VB_BULK_ROW_CACHE=[];

// FITUR BARU (permintaan user): backup 1 langkah PER PRODUK untuk revisi
// mode Bulk (vbRevisiProdukAI) — object dengan key prodIdx, value
// {nama,keunggulan,topik,fotoBase64,fotoMime,scripts:[hook,story,cta]}.
// Kehadiran entri prodIdx di sini juga dipakai sebagai penanda "produk ini
// sudah dipakai jatah revisinya" (maksimal 1x revisi per produk sebelum
// di-undo) — lihat vbRevisiProdukAI/vbUndoRevisiProduk. Direset tiap kali
// _vbRenderBulkOutput dipanggil ulang (generate awal/regenerate semua),
// sama seperti VB_REVISI_FOTO_OVERRIDE di atas.
let VB_BULK_REVISI_BACKUP={};

// FITUR BARU (permintaan user): kalau bulk generate berhenti di tengah
// jalan (macet, limit Google habis, dst) dan sebagian produk SUDAH
// berhasil dapat script, simpan konteksnya di sini supaya user bisa
// pilih "Lanjutkan" — generate ULANG HANYA untuk produk yang BELUM
// kebagian script, bukan mengulang semuanya dari nol (yang bakal
// menimpa/mengulang script yang sudah bagus). null kalau tidak ada
// sesi yang bisa dilanjutkan (belum pernah generate, atau sudah
// lengkap semua). Diisi di catch/partial-success vbGenerateBulkAI &
// vbBulkResumeAI, dibuang (null) begitu semua produk sudah lengkap
// atau begitu user mulai generate BARU dari awal.
let VB_BULK_LAST_CONTEXT=null; // {produkList, targetAudience, allResults}

// FIX TOMBOL GENERATE HILANG/KETUTUP DI "BANYAK PRODUK SEKALIGUS": lihat
// komentar panjang di CSS .wbody. Fungsi ini mengukur tinggi konten
// SEBENARNYA dari card (.wbody) yang membungkus elemen `fromEl`, lalu
// menaikkan custom property --wbody-max-h supaya batas overflow:hidden
// selalu pas dengan isinya — baik saat cuma 3 produk maupun 10 produk.
// Dipanggil tiap kali baris produk bulk ditambah/dikurangi atau foto
// produk di-upload/dihapus (dua-duanya bisa mengubah tinggi card).
function fFitWbody(fromEl){
  let body=fromEl&&fromEl.closest?fromEl.closest('.wbody'):null;
  if(!body)return;
  // Ditunda 1 frame: pastikan perubahan DOM (baris ditambah/dihapus,
  // preview foto muncul/hilang) sudah kepakai di layout sebelum diukur,
  // supaya scrollHeight yang didapat akurat.
  requestAnimationFrame(function(){
    let h=body.scrollHeight;
    if(h>0)body.style.setProperty('--wbody-max-h',(h+60)+'px');
  });
}

// Toggle kolom "Arah pembahasan (opsional)" per baris produk di mode Bulk.
function vbBulkToggleTopik(i){
  let box=document.getElementById('vb-bulk-topik-box-'+i);
  let btn=document.getElementById('vb-bulk-topik-toggle-'+i);
  if(!box)return;
  let opening=box.classList.contains('hidden');
  if(opening){
    // Akordeon: buka detail produk ini -> detail produk lain yang masih terbuka ditutup.
    // Isiannya aman karena input cuma disembunyikan (tidak dihapus), dan chip ringkasannya diperbarui.
    document.querySelectorAll('[id^="vb-bulk-topik-box-"]').forEach(function(ob){
      if(ob===box||ob.classList.contains('hidden'))return;
      let j=ob.id.replace('vb-bulk-topik-box-','');
      ob.classList.add('hidden');
      let ob2=document.getElementById('vb-bulk-topik-toggle-'+j);
      if(ob2){ob2.setAttribute('aria-expanded','false');ob2.classList.remove('open');}
      try{vbBulkUpdateSummary(+j);}catch(e){}
    });
  }
  box.classList.toggle('hidden');
  if(btn){btn.setAttribute('aria-expanded',opening?'true':'false');btn.classList.toggle('open',opening);}
  if(opening){
    vbBulkTab(i,'konten');
  }else{
    vbBulkUpdateSummary(i);
  }
  fFitWbody(box);
}
// Pindah tab di panel "Atur detail" per produk (Konten / Hook / Teks Video).
// Cuma satu pane yang tampil sekaligus, jadi panel tidak panjang.
function vbBulkTab(i,name){
  ['konten','hook','teks'].forEach(function(k){
    let pane=document.getElementById('vb-bulk-pane-'+i+'-'+k);
    let tab=document.getElementById('vb-bulk-tab-'+i+'-'+k);
    let on=(k===name);
    if(pane)pane.classList.toggle('hidden',!on);
    if(tab){
      tab.style.background=on?'var(--surface3)':'none';
      tab.style.color=on?'var(--accent)':'var(--muted)';
    }
  });
  let first=document.getElementById(name==='konten'?'vb-bulk-keunggulan-'+i:(name==='teks'?'vb-bulk-overlay-'+i:''));
  if(first&&name==='teks')first.focus();
  let box=document.getElementById('vb-bulk-topik-box-'+i);
  if(box)fFitWbody(box);
}
// Ringkasan chip di bawah nama produk (tampil saat panel detail tertutup).
// Baca langsung dari input supaya selalu sinkron dengan yang diketik.
function vbBulkUpdateSummary(i){
  let wrap=document.getElementById('vb-bulk-sum-'+i);
  if(!wrap)return;
  let labels={psikologis:'Hook Psikologis',murah:'Hook Harga Murah',heboh:'Hook Super Heboh',custom:'Hook Sendiri'};
  let cache=VB_BULK_ROW_CACHE[i]||{};
  let val=function(id){let e=document.getElementById(id);return e?e.value.trim():'';};
  let cut=function(t){return t.length>26?t.slice(0,25)+'…':t;};
  let items=[];
  if(cache.hookType&&labels[cache.hookType])items.push(labels[cache.hookType]);
  let k=val('vb-bulk-keunggulan-'+i); if(k)items.push('Keunggulan: '+cut(k));
  let t=val('vb-bulk-topik-'+i); if(t)items.push('Arah: '+cut(t));
  let o=val('vb-bulk-overlay-'+i); if(o)items.push('Teks video: '+cut(o));
  let chipCss='font-size:var(--fs-2xs);border:1px solid var(--border-hi);border-radius:20px;padding:3px 9px;color:var(--accent);background:var(--surface3);';
  wrap.style.display=items.length?'flex':'none';
  if(!items.length){
    wrap.innerHTML='';
  }else{
    wrap.innerHTML=items.map(function(x){return '<span style="'+chipCss+'">'+esc(x)+'</span>';}).join('');
  }
}

// FITUR BARU (permintaan user, Sept 2026): "Atur detail" per produk di mode Bulk
// sekarang SAMA seperti "Atur detail" di mode single — isinya: Arah Pembahasan,
// Atur Hook (4 chip + Isi Sendiri), dan kolom "Isi" (teks kecil di video).
// - Arah Pembahasan & gaya Hook dikirim ke AI (lihat _vbCallBulkBatch).
// - Kolom "Isi" TIDAK dikirim ke AI: cuma ditempel di akhir prompt Hook video
//   (lihat _vbOverlaySentence & _vbBuildFlowText), berlaku di semua mode.
// State hook (jenis chip) disimpan di VB_BULK_ROW_CACHE[i].hookType supaya
// tidak hilang waktu jumlah produk diubah (vbBulkSetCount membangun ulang baris).
function _vbBulkDetailInnerHtml(i,cached){
  let hookOpts=[['psikologis','Hook Psikologis'],['murah','Hook Harga Murah'],['heboh','Hook Super Heboh'],['custom','Isi Sendiri']];
  let chips=hookOpts.map(function(o){
    return '<div class="chip'+(cached.hookType===o[0]?' sel':'')+'" onclick="vbBulkPickHook('+i+',\''+o[0]+'\',this)" style="min-height:40px;padding:8px 10px;font-size:var(--fs-xs2);display:flex;align-items:center;justify-content:center;text-align:center;">'+o[1]+'</div>';
  }).join('');
  let showCustom=(cached.hookType==='custom');
  let inpStyle='font-size:var(--fs-xs2);padding:8px 10px;';
  let lblStyle='font-size:var(--fs-2xs);margin-top:8px;';
  let tabCss='flex:1;border:none;border-radius:8px;padding:8px 4px;font-size:var(--fs-xs2);cursor:pointer;font-family:inherit;';
  function tab(k,label){return '<button type="button" id="vb-bulk-tab-'+i+'-'+k+'" onclick="vbBulkTab('+i+',\''+k+'\')" style="'+tabCss+'background:none;color:var(--muted);">'+label+'</button>';}
  return '<div style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px;">'
    +'<div style="display:flex;gap:2px;background:var(--surface);border-radius:10px;padding:3px;">'+tab('konten','Konten')+tab('hook','Hook')+tab('teks','Teks Video')+'</div>'
    // Pane 1: Konten — tampilan "Lipat": Keunggulan dan Arah Pembahasan jadi dua baris ringkasan yang bisa dibuka.
    // Nilai tetap disimpan di dua input tersembunyi ber-id lama, jadi kode lain (cache, generate, revisi) tidak berubah.
    +'<div id="vb-bulk-pane-'+i+'-konten">'
    +'<input type="hidden" id="vb-bulk-keunggulan-'+i+'" value="'+esc(cached.keunggulan||'')+'" />'
    +'<input type="hidden" id="vb-bulk-topik-'+i+'" value="'+esc(cached.topik||'')+'" />'
    +'<div class="kl" id="kl-'+i+'">'
    +_klAcc(i,0,'Keunggulan','Apa yang bikin produk ini layak dibeli? Satu keunggulan per label.')
    +_klAcc(i,1,'Arah Pembahasan','Sudut pembahasan yang mau ditonjolkan di skrip. Pilih salah satu atau tulis sendiri.')
    +'</div>'
    +'</div>'
    // Pane 2: Hook
    +'<div id="vb-bulk-pane-'+i+'-hook" class="hidden">'
    +'<label class="inplabel" style="'+lblStyle+'">Pilih gaya hook</label>'
    +'<div id="vb-bulk-hook-chips-'+i+'" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">'+chips+'</div>'
    +'<div id="vb-bulk-hook-custom-box-'+i+'" class="'+(showCustom?'':'hidden')+'" style="margin-top:6px;">'
    +'<input class="inp" id="vb-bulk-hook-custom-'+i+'" aria-label="Hook sendiri produk '+(i+1)+'" maxlength="150" placeholder="Contoh: hook yang bikin penasaran soal isi paketnya" style="'+inpStyle+'" value="'+esc(cached.hookCustom||'')+'" />'
    +'</div>'
    +'</div>'
    // Pane 3: Teks kecil di video (dulu label "Isi")
    +'<div id="vb-bulk-pane-'+i+'-teks" class="hidden">'
    +'<label class="inplabel" style="'+lblStyle+'">Teks kecil di video</label>'
    +'<input class="inp" id="vb-bulk-overlay-'+i+'" aria-label="Teks overlay produk '+(i+1)+'" maxlength="60" placeholder="Contoh: sepatu futsal" style="'+inpStyle+'" value="'+esc(cached.overlay||'')+'" />'
    +'<p style="font-size:var(--fs-2xs);color:var(--muted2);margin:6px 0 0;line-height:1.55;">Kalau diisi, otomatis ditambahkan di akhir prompt Hook: muncul tulisan kecil banget pada detik awal selama 2 detik di pojok kanan paling bawah. Tidak dikirim ke server. Kosongkan kalau tidak perlu.</p>'
    +'</div>'
    +'<button type="button" onclick="vbBulkToggleTopik('+i+')" style="width:100%;margin-top:10px;background:var(--accent-dim-bg);border:1px solid var(--accent);color:var(--accent);border-radius:10px;padding:9px;font-size:var(--fs-xs2);cursor:pointer;font-family:inherit;">Selesai</button>'
    +'</div>';
}
// ── TAMPILAN "LIPAT" untuk Keunggulan & Arah Pembahasan (pilihan 3 di preview) ──
// Dua baris ringkasan yang bisa dibuka (akordeon, satu terbuka sekali). Nilainya TETAP disimpan di dua
// <input type="hidden"> ber-id lama (vb-bulk-keunggulan-i & vb-bulk-topik-i), jadi cache baris, generate,
// revisi, dan chip ringkasan tetap membaca .value seperti biasa. Batas 150 huruf per isian tidak berubah.
// Keunggulan disimpan sebagai teks "a, b, c" (label digabung koma). Isi saran ada di KL_SUG_KEU / KL_SUG_ARAH.
var KL_MAX=150;
var KL_SUG_KEU=['Tahan air','Ringan dipakai seharian','Bahan adem','Tidak mudah kusut','Muat banyak barang','Jahitan rapi'];
var KL_SUG_ARAH=['Dipakai kalangan atas','Hemat tapi tetap berkelas','Cocok untuk kerja dan kuliah','Praktis dibawa seharian','Cocok jadi hadiah'];
function _klAcc(i,k,judul,bantu){
  // Sengaja TANPA id: draf/Undo merekam class elemen ber-id lalu memulihkannya, sehingga status buka/tutup bisa tidak sinkron dengan inert/aria-expanded.
  return '<div class="kl-acc" data-k="'+k+'">'
    +'<button type="button" class="kl-ah" id="kl-ah-'+i+'-'+k+'" aria-expanded="false" aria-controls="kl-ab-'+i+'-'+k+'" onclick="klToggle('+i+','+k+')">'
    +'<span class="kl-ck" aria-hidden="true"></span><span class="kl-t"><b>'+judul+'</b><span class="kl-sm kosong">Belum diisi</span></span><span class="kl-cv" aria-hidden="true"></span></button>'
    +'<div class="kl-ab" id="kl-ab-'+i+'-'+k+'" inert><div><div class="kl-in"><p class="kl-hp">'+bantu+'</p><div class="kl-ed" id="kl-ed-'+i+'-'+k+'"></div></div></div></div>'
    +'</div>';
}
function _klSame(a,b){return String(a).trim().toLowerCase()===String(b).trim().toLowerCase();}
// Tinggi card dihitung ulang: sekali langsung, sekali lagi setelah animasi buka/tutup selesai.
function klFit(el){
  try{fFitWbody(el);}catch(e){}
  setTimeout(function(){try{fFitWbody(el);}catch(e){}},300);
}
function klToggle(i,k,force){
  for(let j=0;j<2;j++){
    let a=document.querySelector('#kl-'+i+' > .kl-acc[data-k="'+j+'"]');
    if(!a)continue;
    let o=(j===k)&&(force!==undefined?!!force:!a.classList.contains('kl-open'));
    a.classList.toggle('kl-open',o);
    let h=document.getElementById('kl-ah-'+i+'-'+j);
    if(h)h.setAttribute('aria-expanded',o?'true':'false');
    let b=document.getElementById('kl-ab-'+i+'-'+j);
    if(b){if(o)b.removeAttribute('inert');else b.setAttribute('inert','');}
  }
  klFit(document.getElementById('kl-'+i));
}
// Baris ringkasan: centang emas + isi singkat (atau "Belum diisi").
function klRow(i,k,t){
  let h=document.getElementById('kl-ah-'+i+'-'+k);
  if(!h)return;
  let on=!!t,sm=h.querySelector('.kl-sm');
  h.querySelector('.kl-ck').classList.toggle('on',on);
  sm.textContent=on?t:'Belum diisi';
  sm.classList.toggle('kosong',!on);
}
// Garis kemajuan + penghitung huruf (n/150).
function klBar(host,n){
  let c=host.querySelector('.kl-cnt');if(c)c.textContent=n+'/'+KL_MAX;
  let l=host.querySelector('.kl-line');
  if(l){l.firstElementChild.style.width=Math.min(100,n/KL_MAX*100)+'%';l.classList.toggle('full',n>KL_MAX-10);}
}
// Isian Keunggulan: label yang bisa ditambah dan dihapus.
function klEdKeu(i){
  let host=document.getElementById('kl-ed-'+i+'-0'),hid=document.getElementById('vb-bulk-keunggulan-'+i);
  if(!host||!hid)return;
  host.innerHTML='<div class="kl-box"><span class="kl-chips"></span><input type="text" class="kl-ci" maxlength="60" autocomplete="off" enterkeyhint="done" placeholder="Ketik satu keunggulan" aria-label="Tulis satu keunggulan produk '+(i+1)+'"><button type="button" class="kl-add" disabled>Tambah</button></div><div class="kl-line"><i></i></div><div class="kl-sub"><span class="kl-msg" aria-live="polite"></span><span class="kl-cnt"></span></div><div class="kl-sug plus"></div>';
  let chips=host.querySelector('.kl-chips'),ci=host.querySelector('.kl-ci'),add=host.querySelector('.kl-add'),msg=host.querySelector('.kl-msg'),sug=host.querySelector('.kl-sug');
  let items=[];
  function muat(v){
    items=[];
    String(v||'').split(',').forEach(function(t){
      t=t.trim();
      if(t&&!items.some(function(x){return _klSame(x,t);}))items.push(t);
    });
  }
  muat(hid.value);
  // Tulis ke input tersembunyi + kabari app (event input) supaya Undo/draf ikut merekam perubahan yang datang dari klik.
  function tulisHid(v){
    hid.value=v;
    try{hid.dispatchEvent(new Event('input',{bubbles:true}));}catch(e){}
  }
  // Teks yang sedang diketik tapi belum ditambah (belum Enter/Tambah) ikut dihitung, supaya tidak hilang
  // kalau user langsung menekan Generate atau jumlah produk diubah.
  function komposit(){
    let p=ci.value.trim(),j=items.join(', ');
    return (p?(j?j+', '+p:p):j).slice(0,KL_MAX);
  }
  function gambar(tulis){
    chips.textContent='';
    items.forEach(function(t,n){
      let c=document.createElement('span');c.className='kl-chip';c.appendChild(document.createTextNode(t));
      let b=document.createElement('button');b.type='button';b.textContent='\u00d7';b.setAttribute('aria-label','Hapus '+t);
      b.onclick=function(){items.splice(n,1);msg.textContent='';gambar(true);};
      c.appendChild(b);chips.appendChild(c);
    });
    Array.prototype.forEach.call(sug.querySelectorAll('button'),function(b){
      b.setAttribute('aria-pressed',items.some(function(x){return _klSame(x,b.dataset.t);})?'true':'false');
    });
    let joined=komposit();
    if(tulis&&hid.value!==joined)tulisHid(joined);
    klBar(host,joined.length);
    klRow(i,0,joined);
    try{fFitWbody(host);}catch(e){}
  }
  function tambah(raw){
    let beres=false;msg.textContent='';
    String(raw).split(',').map(function(t){return t.trim();}).filter(Boolean).forEach(function(t){
      if(items.some(function(x){return _klSame(x,t);})){msg.textContent='\u201c'+t+'\u201d sudah ada.';beres=true;}
      else if(items.concat(t).join(', ').length>KL_MAX)msg.textContent='Sudah penuh (maksimal '+KL_MAX+' huruf). Hapus satu atau persingkat.';
      else{items.push(t);beres=true;}
    });
    return beres;
  }
  function kirim(){
    let beres=tambah(ci.value);
    if(beres||!ci.value.replace(/[,\s]/g,''))ci.value='';
    add.disabled=!ci.value.trim();
    gambar(true);
  }
  ci.oninput=function(){
    if(ci.value.indexOf(',')>-1){kirim();return;}
    add.disabled=!ci.value.trim();
    let v=komposit();hid.value=v;klBar(host,v.length);klRow(i,0,v);
  };
  // Enter menambah label saja. stopPropagation: supaya pintasan Enter global (klik tombol terdekat) tidak ikut jalan.
  ci.onkeydown=function(e){
    if(e.key==='Enter'&&!e.isComposing){e.preventDefault();e.stopPropagation();kirim();}
  };
  add.onclick=function(){kirim();ci.focus();};
  // Nilai diubah dari luar (Undo/Redo atau pemulihan draf lewat restoreDom): gambar ulang label dari nilai itu.
  hid.addEventListener('input',function(){
    if(hid.value===komposit())return;
    muat(hid.value);ci.value='';add.disabled=true;msg.textContent='';gambar(false);
  });
  KL_SUG_KEU.forEach(function(t){
    let b=document.createElement('button');b.type='button';b.dataset.t=t;b.textContent=t;
    b.onclick=function(){
      let n=-1;
      items.forEach(function(x,j){if(n<0&&_klSame(x,t))n=j;});
      msg.textContent='';
      if(n>-1)items.splice(n,1);else tambah(t);
      gambar(true);
    };
    sug.appendChild(b);
  });
  gambar(false);
}
// Isian Arah Pembahasan: satu kalimat + pilihan cepat.
function klEdArah(i){
  let host=document.getElementById('kl-ed-'+i+'-1'),hid=document.getElementById('vb-bulk-topik-'+i);
  if(!host||!hid)return;
  host.innerHTML='<div class="kl-box kl-ta"><textarea rows="2" maxlength="150" placeholder="Contoh: tas yang dipakai kalangan atas" aria-label="Arah pembahasan produk '+(i+1)+'"></textarea></div><div class="kl-line"><i></i></div><div class="kl-sub"><button type="button" class="kl-link">Hapus</button><span class="kl-cnt"></span></div><div class="kl-sug"></div>';
  let ta=host.querySelector('textarea'),clr=host.querySelector('.kl-link'),sug=host.querySelector('.kl-sug');
  ta.value=hid.value||'';
  function baru(tulis){
    let v=ta.value;
    klBar(host,v.length);
    clr.style.visibility=v?'visible':'hidden';
    Array.prototype.forEach.call(sug.querySelectorAll('button'),function(b){
      b.setAttribute('aria-pressed',_klSame(v,b.dataset.t)?'true':'false');
    });
    if(tulis&&hid.value!==v.trim()){
      hid.value=v.trim();
      try{hid.dispatchEvent(new Event('input',{bubbles:true}));}catch(e){}
    }
    klRow(i,1,v.trim());
  }
  ta.oninput=function(){ta.value=ta.value.replace(/\n/g,' ');baru(true);};
  ta.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();e.stopPropagation();}};
  clr.onclick=function(){ta.value='';baru(true);ta.focus();};
  // Nilai diubah dari luar (Undo/Redo atau pemulihan draf): samakan kotak tulis.
  hid.addEventListener('input',function(){
    if(hid.value===ta.value.trim())return;
    ta.value=hid.value;baru(false);
  });
  KL_SUG_ARAH.forEach(function(t){
    let b=document.createElement('button');b.type='button';b.dataset.t=t;b.textContent=t;
    b.onclick=function(){ta.value=_klSame(ta.value,t)?'':t;baru(true);};
    sug.appendChild(b);
  });
  baru(false);
}
// Dipanggil sekali per baris produk setelah baris masuk ke halaman (lihat vbBulkSetCount).
function klInit(i){
  klEdKeu(i);klEdArah(i);
  klToggle(i,0,true);
}
// Pilih gaya Hook untuk produk ke-i di form Bulk. Klik ulang chip yang sama =
// batalkan (AI bebas menentukan sendiri), sama seperti vbPickHook di mode single.
function vbBulkPickHook(i,val,el){
  let cache=VB_BULK_ROW_CACHE[i];
  if(!cache){cache={nama:'',keunggulan:'',topik:'',hookType:'',hookCustom:'',overlay:'',fotoBase64:'',fotoMime:''};VB_BULK_ROW_CACHE[i]=cache;}
  let already=el.classList.contains('sel');
  let wrap=document.getElementById('vb-bulk-hook-chips-'+i);
  if(wrap)wrap.querySelectorAll('.chip').forEach(function(c){c.classList.remove('sel');});
  let customBox=document.getElementById('vb-bulk-hook-custom-box-'+i);
  if(already){
    cache.hookType='';
    if(customBox)customBox.classList.add('hidden');
    vbBulkUpdateSummary(i);
    fFitWbody(el);
    return;
  }
  el.classList.add('sel');
  cache.hookType=val;
  if(customBox){
    if(val==='custom'){
      customBox.classList.remove('hidden');
      let ci=document.getElementById('vb-bulk-hook-custom-'+i);
      if(ci)ci.focus();
    }else{
      customBox.classList.add('hidden');
    }
  }
  vbBulkUpdateSummary(i);
  fFitWbody(el);
}
// Bangun N baris input (Nama Produk *wajib + Keunggulan opsional + Foto opsional) sesuai jumlah yang dipilih user
// Dipanggil tiap user mengetik di kolom jumlah → baris produk langsung
// muncul real-time (tanpa tombol "Tentukan Jumlah"). Kolom yang dikosongkan
// sementara (lagi ngetik ulang) dibiarkan dulu, dirapikan saat blur.
function vbBulkCountInput(){
  let el=document.getElementById('vb-bulk-count');
  if(!el)return;
  let n=parseInt(el.value,10);
  if(!n||n<1)return;
  vbBulkSetCount();
}
function vbBulkSetCount(){
  let countInput=document.getElementById('vb-bulk-count');
  let count=parseInt(countInput.value,10);
  if(!count||count<1)count=1;
  if(count>30){count=30;showToast('Maksimal 30 produk sekaligus','error');}
  countInput.value=count;

  let rows=document.getElementById('vb-bulk-rows');
  if(rows.children.length===count)return; // jumlah sama → tidak perlu bangun ulang baris
  // FIX BUG#15 (ditemukan saat audit mendalam): sebelumnya nilai lama dibaca
  // ke array LOKAL yang dibuat ulang tiap kali fungsi ini jalan, cuma
  // menampung sebanyak baris yang KEBETULAN sedang tampil saat itu juga.
  // Reproducible: isi 5 baris produk → kurangi jumlah jadi 2 (baris 3-5
  // dihancurkan oleh rows.innerHTML='' di bawah) → naikkan lagi jumlahnya
  // jadi 5 → baris 3-5 muncul KOSONG, padahal user sudah sempat mengetik
  // nama produknya di sana. Data itu tidak pernah tersimpan di mana pun
  // begitu baris-nya dihancurkan. Sekarang dipakai VB_BULK_ROW_CACHE — cache
  // di luar fungsi yang terus disinkronkan (bukan dibuat ulang) tiap kali
  // fungsi ini dipanggil, jadi naik-turunkan jumlah produk berkali-kali
  // tidak lagi menghilangkan apa yang sudah diketik di baris manapun.
  for(let i=0;i<rows.children.length;i++){
    let n=document.getElementById('vb-bulk-nama-'+i);
    let k=document.getElementById('vb-bulk-keunggulan-'+i);
    let t=document.getElementById('vb-bulk-topik-'+i);
    let hc=document.getElementById('vb-bulk-hook-custom-'+i);
    let ov=document.getElementById('vb-bulk-overlay-'+i);
    // FIX: baris ini dulu MENIMPA seluruh entri cache ({nama,keunggulan}
    // baru dibuat dari nol), jadi kalau ada foto yang sudah diupload &
    // tersimpan di VB_BULK_ROW_CACHE[i].fotoBase64 sebelumnya, foto itu ikut
    // KEHAPUS begitu saja setiap kali jumlah produk diubah — padahal foto
    // tidak dibaca dari <input> (bukan text field) jadi tidak pernah
    // disertakan ulang di sini. Sekarang nama/keunggulan di-update TANPA
    // menimpa field foto yang sudah ada di cache.
    let taEl=document.getElementById('vb-bulk-ta-'+i);
    if(n){
      let existing=VB_BULK_ROW_CACHE[i]||{};
      VB_BULK_ROW_CACHE[i]={ta:taEl?taEl.value:(existing.ta||''),nama:n.value,keunggulan:k?k.value:'',topik:t?t.value:(existing.topik||''),hookType:existing.hookType||'',hookCustom:hc?hc.value:(existing.hookCustom||''),overlay:ov?ov.value:(existing.overlay||''),fotoBase64:existing.fotoBase64||'',fotoMime:existing.fotoMime||''};
    }
  }

  rows.innerHTML='';
  for(let i=0;i<count;i++){
    let cached=VB_BULK_ROW_CACHE[i]||{nama:'',keunggulan:'',topik:'',hookType:'',hookCustom:'',overlay:'',fotoBase64:'',fotoMime:''};
    let row=document.createElement('div');
    row.style.cssText='background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-xs);padding:7px 9px;margin-bottom:6px;';
    let hasFoto=!!cached.fotoBase64;
    let hasTopik=!!(cached.keunggulan||cached.topik||cached.hookType||cached.overlay); // "detail" terbuka kalau salah satu isian Atur Detail sudah terisi
    row.innerHTML='<div style="font-size:var(--fs-2xs);font-weight:600;color:var(--muted2);margin-bottom:4px;">PRODUK '+(i+1)+'</div>'
      +'<div style="display:flex;gap:6px;margin-bottom:0;align-items:flex-start;">'
      +'<div style="flex:1;display:flex;flex-direction:column;gap:6px;">'
      +'<input class="inp" id="vb-bulk-nama-'+i+'" aria-label="Nama produk '+(i+1)+'" maxlength="80" placeholder="Nama produk *wajib" style="font-size:var(--fs-xs2);padding:6px 8px;" value="'+esc(cached.nama||'')+'" />'
      +(count>1?'<input class="inp" id="vb-bulk-ta-'+i+'" list="vb-bulk-ta-list" aria-label="Target audience produk '+(i+1)+'" maxlength="200" placeholder="Target audience produk ini (kosong = ikut tab Penonton)" style="font-size:var(--fs-xs2);padding:6px 8px;" value="'+esc(cached.ta||'')+'" oninput="vbInfoSum()" />':'')
      +'<div id="vb-bulk-sum-'+i+'" style="display:flex;flex-wrap:wrap;gap:5px;"></div>'
      +'<button type="button" class="vb-chev-btn'+(hasTopik?' open':'')+'" onclick="vbBulkToggleTopik('+i+')" id="vb-bulk-topik-toggle-'+i+'" aria-label="Atur detail" aria-expanded="'+(hasTopik?'true':'false')+'"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 15 12 9 18 15"/></svg></button>'
      +'</div>'
      +'<input type="file" accept="image/*" id="vb-bulk-foto-input-'+i+'" style="position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none;" onchange="vbHandleBulkFotoUpload(this,'+i+')" />'
      +'<div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:3px;">'
      +'<div style="font-size:11px;line-height:1.25;color:var(--muted);text-align:center;max-width:52px;">Foto produk (boleh dilewati)</div>'
      +'<div id="vb-bulk-foto-empty-'+i+'" onclick="document.getElementById(\'vb-bulk-foto-input-'+i+'\').click()" style="width:44px;height:44px;border:1.5px dashed var(--border-hi);border-radius:var(--radius-xs);display:flex;align-items:center;justify-content:center;color:var(--muted);cursor:pointer;'+(hasFoto?'display:none;':'')+'">'
      +'<svg class="icon" style="width:16px;height:16px;"><use href="#ic-camera"></use></svg></div>'
      +'<div id="vb-bulk-foto-preview-'+i+'" style="'+(hasFoto?'':'display:none;')+'position:relative;width:44px;height:44px;">'
      +'<img id="vb-bulk-foto-img-'+i+'" class="vbfoto-img" src="'+(hasFoto?'data:'+(cached.fotoMime||'image/jpeg')+';base64,'+cached.fotoBase64:'')+'" style="width:44px;height:44px;border-radius:var(--radius-xs);display:block;object-fit:cover;border:1px solid var(--border-hi);" />'
      +'<button type="button" onclick="vbRemoveBulkFoto('+i+')" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:var(--red);color:#fff;border:none;font-size:12px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;"><svg class="icon"><use href="#ic-close"></use></svg></button>'
      +'</div>'
      +'</div>'
      +'</div>'
      +'<div id="vb-bulk-topik-box-'+i+'" class="'+(hasTopik?'':'hidden')+'">'
      +_vbBulkDetailInnerHtml(i,cached)
      +'</div>';
    rows.appendChild(row);
    try{klInit(i);}catch(e){console.warn('[klInit]',e);}
    vbBulkUpdateSummary(i);
    if(hasTopik)vbBulkTab(i,'konten');
  }
  // Pastikan card cukup tinggi menampung semua baris + tombol Generate di
  // bawahnya, berapa pun jumlah produk yang baru saja diset (lihat fFitWbody).
  fFitWbody(rows);
}

// Upload foto produk — mode BULK (per baris, index i), disimpan di VB_BULK_ROW_CACHE[i]
async function vbHandleBulkFotoUpload(input,i){
  let file=input.files&&input.files[0];
  if(!file)return;
  try{
    let res=await _vbCompressImageFile(file);
    let existing=VB_BULK_ROW_CACHE[i]||{nama:'',keunggulan:''};
    existing.fotoBase64=res.base64;existing.fotoMime=res.mime;
    VB_BULK_ROW_CACHE[i]=existing;
    let img=document.getElementById('vb-bulk-foto-img-'+i);
    if(img)img.src='data:'+res.mime+';base64,'+res.base64;
    let empty=document.getElementById('vb-bulk-foto-empty-'+i);
    let preview=document.getElementById('vb-bulk-foto-preview-'+i);
    if(empty)empty.style.display='none';
    if(preview)preview.style.display='inline-block';
    // Preview foto nambah tinggi baris ini — sesuaikan lagi batas tinggi card
    // (lihat fFitWbody), penting kalau ini terjadi di beberapa baris sekaligus
    // pada mode "Banyak Produk Sekaligus".
    fFitWbody(preview||input);
  }catch(e){
    console.warn('[vbHandleBulkFotoUpload]',e);
    showToast('Gagal memproses foto: '+e.message,'error');
  }finally{
    input.value='';
  }
}
function vbRemoveBulkFoto(i){
  if(VB_BULK_ROW_CACHE[i]){VB_BULK_ROW_CACHE[i].fotoBase64='';VB_BULK_ROW_CACHE[i].fotoMime='';}
  let img=document.getElementById('vb-bulk-foto-img-'+i); if(img)img.src='';
  let empty=document.getElementById('vb-bulk-foto-empty-'+i); if(empty)empty.style.display='flex';
  let preview=document.getElementById('vb-bulk-foto-preview-'+i); if(preview)preview.style.display='none';
  fFitWbody(empty||img);
}


// ── TIMEOUT PROTEKSI PANGGILAN GEMINI (FIX BUG KRITIS — ditemukan saat
// audit mendalam) ───────────────────────────────────────────────────────
// fetch() browser TIDAK punya timeout bawaan. Kalau koneksi ke Gemini
// macet/nggantung (jaringan lambat, server diam tanpa pernah kirim respon
// ATAU error), promise fetch() bisa nggantung TANPA BATAS WAKTU. Karena
// flag _isGenerating/VAI._isGenerating baru direset di blok finally
// (setelah await selesai), efeknya user TERKUNCI dari tombol Generate
// manapun sampai reload halaman penuh — tidak ada cara lain untuk batalin.
// Versi sebelumnya sempat punya AbortController buat ini (45 detik untuk
// percobaan pertama, 30 detik untuk percobaan retry/fallback) tapi hilang
// di suatu titik saat refactor. Dipasang ulang di sini secara terpusat
// supaya SEMUA pemanggilan fetch ke Gemini (single script, bulk, revisi,
// perbaikan jumlah kata) otomatis terlindungi tanpa perlu diulang manual
// di tiap tempat.
// ── Baca saran "tunggu sekian detik" — dari header HTTP 'retry-after'
// (paling akurat, ini yang benar-benar dikirim Anthropic) atau dari body
// error 429 (format lama Gemini/Groq, jaga-jaga kalau providernya beda).
// FIX (audit): sebelumnya fungsi ini CUMA mem-parsing body — parameter
// retryAfterHeader di bawah sekarang diisi pemanggil dari
// resp.headers.get('retry-after') SEBELUM header itu ikut hilang (resp
// kadang ditimpa jadi objek sintetis di jalur lain). Anthropic mengirim
// retry-after ini sebagai jumlah DETIK (RFC 7231), bukan lewat
// google.rpc.RetryInfo di body seperti Gemini — jadi ini yang dipakai
// duluan kalau ada; body JSON tetap dicek sesudahnya sebagai fallback.
function _vbParseRetryDelayMs(rawText,retryAfterHeader){
  if(retryAfterHeader){
    let sec=parseFloat(retryAfterHeader);
    if(!isNaN(sec)&&sec>=0)return Math.ceil(sec*1000)+500;
  }
  try{
    let j=JSON.parse(rawText);
    // Format lama (Gemini): google.rpc.RetryInfo di error.details[]
    let details=j&&j.error&&j.error.details||[];
    for(let d of details){
      if(d&&typeof d['@type']==='string'&&d['@type'].indexOf('RetryInfo')!==-1&&d.retryDelay){
        let m=/([\d.]+)s/.exec(d.retryDelay);
        if(m)return Math.ceil(parseFloat(m[1])*1000)+500;
      }
    }
    // Format lama (Groq): error.message berisi teks "...try again in 1.234s..."
    let msg=(j&&j.error&&j.error.message)||'';
    let mg=/try again in ([\d.]+)s/i.exec(msg);
    if(mg)return Math.ceil(parseFloat(mg[1])*1000)+500;
  }catch(e){}
  return 0;
}

// ── Label alasan "⏳ nunggu..." yang ditampilkan ke user selama retry
// otomatis berlangsung. Dipusatkan di satu fungsi supaya konsisten di
// semua tempat (single, bulk, background retry, dst) — sebelumnya tiap
// tempat nulis ternary sendiri-sendiri yang cuma tahu 429 vs selain-429,
// jadi status 0 (timeout/koneksi putus, sekarang ikut di-retry juga)
// salah dilabeli "server Google lagi sibuk" padahal bukan itu masalahnya.
// Status 529 ditambahkan khusus buat Claude: itu kode resmi Anthropic
// untuk "server sedang overload" (beda dari 503 generik).
function _vbWaitReasonLabel(status){
  // FIX UX (audit lanjutan, Sept 2026 — "delay diam sebelum teks muncul
  // gara-gara thinking"): status string 'thinking' (bukan kode HTTP angka)
  // dikirim SEKALI di awal tiap percobaan oleh _vbStreamClaudeJSONWithRetryModel,
  // supaya pemanggil (lihat semua onWait di bawah) bisa nampilkan pesan yang
  // BENAR ("kami sedang menyusun hasilnya") — bukan salah kasih kesan ada
  // masalah server ("server kami lagi sibuk") padahal cuma nunggu fase
  // mikir Claude yang memang sengaja terjadi sebelum teks jawaban mulai
  // di-stream.
  if(status==='thinking')return'kami sedang menyusun hasilnya';
  if(status===429)return'server membatasi permintaan sementara, menunggu lalu mencoba lagi';
  if(status===529||status===503)return'server kami lagi padat';
  if(status===0)return'koneksi sempat putus, mencoba lagi';
  if(status===403)return'koneksi ke server ditolak sesaat, mencoba lagi';
  return'server kami belum merespons dengan benar';
}

