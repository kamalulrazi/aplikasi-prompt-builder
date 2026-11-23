// fitur/riwayat-tab.js — Tab Riwayat: tampilan, riwayat otomatis Foto & Video, Lihat Ringkasan, perbaikan riwayat Video.
// Bagian dari js/10-main-app.js lama (baris 8077–10106). Isi tidak diubah.
// ============================================================
// v18.0 — REDESAIN TAB RIWAYAT, FASE 2 (panduan-pengerjaan-riwayat.md, bagian 3.1 dan 3.6)
// pbRwCard = SATU pabrik kartu untuk Disimpan, Foto otomatis, Video otomatis dan
// #f-history-mini. Warna/ukuran hanya lewat token CSS aplikasi. Data, key
// localStorage, historyAdd/historyRender/pb_history_v1 TIDAK diubah.
// Belum dikerjakan (fase berikutnya): overlay Buka untuk entri otomatis, tombol
// Salin bersama, pensil di overlay, 1 record per sesi video.
// ============================================================
function _pbRwIcon(id){return '<svg class="icon" aria-hidden="true"><use href="#'+id+'"></use></svg>';}
function pbRwTime(ts){
  var d=new Date(ts||0);
  return d.toLocaleDateString('id-ID',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
}
// o = {type:'foto'|'video', title, meta, time, chips:[nama produk], extra:Element, actions:[{label,icon?,onClick}]}
// Aksi tanpa icon = tombol utama selebar penuh; aksi dengan icon = tombol ikon.
function pbRwCard(o){
  var card=document.createElement('div');card.className='rw-card';
  var top=document.createElement('div');top.className='rw-top';
  var tile=document.createElement('span');tile.className='rw-tile '+(o.type==='video'?'video':'foto');
  tile.innerHTML=_pbRwIcon(o.type==='video'?'ic-rw-video':'ic-rw-foto');
  var tt=document.createElement('div');tt.className='rw-tt';
  var t=document.createElement('div');t.className='rw-title';t.textContent=o.title||'';tt.appendChild(t);
  if(o.meta){var m=document.createElement('div');m.className='rw-meta';m.textContent=o.meta;tt.appendChild(m);}
  var tm=document.createElement('span');tm.className='rw-time';tm.textContent=o.time||'';
  top.appendChild(tile);top.appendChild(tt);top.appendChild(tm);card.appendChild(top);
  if(o.chips&&o.chips.length>1){
    var cw=document.createElement('div');cw.className='rw-chips';
    o.chips.slice(0,3).forEach(function(n){var c=document.createElement('span');c.className='rw-auto-chip';c.textContent=n;cw.appendChild(c);});
    if(o.chips.length>3){var mo=document.createElement('span');mo.className='rw-auto-chip';mo.textContent='+'+(o.chips.length-3);cw.appendChild(mo);}
    card.appendChild(cw);
  }
  if(o.extra)card.appendChild(o.extra);
  var act=document.createElement('div');act.className='rw-act';
  (o.actions||[]).forEach(function(a){
    var b=document.createElement('button');b.type='button';
    if(a.icon){b.className='rw-ib';b.innerHTML=_pbRwIcon(a.icon);b.setAttribute('aria-label',a.label);b.title=a.label;}
    else{b.className='rw-open';b.textContent=a.label;}
    b.onclick=a.onClick;act.appendChild(b);
  });
  card.appendChild(act);
  return card;
}
function _pbSavedRenderInto(wrap){
  if(!wrap)return;
  let arr=pbSavedGet();
  if(wrap.id==='history-list'){let c=document.getElementById('rw-cnt-saved');if(c)c.textContent=arr.length?String(arr.length):'';}
  if(!arr.length){wrap.innerHTML='<p style="font-size:var(--fs-sm);color:var(--muted);padding:16px 0;text-align:center;">Belum ada halaman tersimpan. Generate prompt foto/video, lalu simpan halamannya lewat ikon di bawah garis step.</p>';return;}
  wrap.innerHTML='';
  arr.forEach(function(item){
    // Draft = belum ada hasil generate; "Sedang dibuka" = entri yang akan ditimpa Simpan berikutnya.
    let meta=item.type==='foto'?'Prompt foto':'Prompt video';
    if(!item.text)meta+=' · Draft';
    if(item.id===PB_ACTIVE_SAVED_ID)meta+=' · Sedang dibuka';
    wrap.appendChild(pbRwCard({type:item.type==='foto'?'foto':'video',title:item.label||'Tanpa judul',meta:meta,time:pbRwTime(item.ts),actions:[
      {label:'Buka',onClick:function(){pbOpenSavedPage(item.id);}},
      {label:'Ganti nama',icon:'ic-edit',onClick:function(){pbSavedRename(item.id);}},
      {label:'Hapus',icon:'ic-rw-trash',onClick:function(){showConfirm('Hapus halaman "'+(item.label||'tanpa judul')+'" dari Riwayat?',function(){pbSavedDelete(item.id);},null,'Ya, Hapus');}}
    ]}));
  });
}
function pbSavedRender(){
  _pbSavedRenderInto(document.getElementById('history-list'));
  _pbSavedRenderInto(document.getElementById('f-history-mini'));
  pbSyncContinueChips();
  pbSyncRenderStatus();
  try{pbAutoRender();}catch(_e){}
}

// ============================================================
// RIWAYAT OTOMATIS (Foto & Video) — terpisah dari "Halaman Tersimpan"
// ------------------------------------------------------------
// Dua key baru (teks saja, tanpa HTML/foto): pb_auto_foto_v1 dan
// pb_auto_video_v1 (sejak v18.2 record video juga memuat "items" dan "vs" = state builder TANPA foto, maks 60 KB).
// Keduanya masuk PB_SYNC_KEYS (sinkron cloud + otomatis
// dibersihkan saat ganti akun). pb_history_v1 (dibaca admin.html) TIDAK
// disentuh sama sekali. Semua fungsi di sini dibungkus try/catch supaya
// kalau ada masalah, generate & Riwayat lama tetap jalan normal.
// ============================================================
var PB_AUTO_FOTO_KEY='pb_auto_foto_v1', PB_AUTO_VIDEO_KEY='pb_auto_video_v1';
var PB_AUTO_FOTO_MAX=40, PB_AUTO_VIDEO_MAX=30, PB_AUTO_VIDEO_SID="", PB_AUTO_VIDEO_SIG=""; // v18.2: MAX video = jumlah SESI (1 entri per sesi generate)
var _pbRwTab='saved';

function _pbAutoHash(s){
  s=String(s||'');var h=5381;
  for(var i=0;i<s.length;i++){h=((h<<5)+h+s.charCodeAt(i))|0;}
  return (h>>>0).toString(36)+'.'+s.length.toString(36);
}
function _pbAutoNewId(){return 'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function _pbAutoGet(key){
  try{
    var a=JSON.parse(localStorage.getItem(key)||'[]');
    return Array.isArray(a)?a.filter(function(x){return x&&typeof x==='object';}):[];
  }catch(e){return [];}
}
// Tulis dengan aman. Kalau penyimpanan browser penuh, buang entri OTOMATIS
// terlama (bukan halaman tersimpan manual) lalu coba lagi; kalau tetap gagal
// dilewati diam-diam — generate tidak boleh ikut gagal.
function _pbAutoWrite(key,arr,max){
  arr=arr.slice(0,max);
  for(var t=0;t<8;t++){
    try{
      localStorage.setItem(key,JSON.stringify(arr));
      try{if(typeof pbCloudQueue==='function')pbCloudQueue(key);}catch(e2){}
      return true;
    }catch(e){
      if(arr.length<=1)return false;
      arr=arr.slice(0,arr.length-Math.max(1,Math.ceil(arr.length*0.25)));
    }
  }
  return false;
}
// recs diproses berurutan, tiap rec naik ke paling atas. Isi yang sama
// (hash sama) tidak menambah entri baru — cuma naik ke atas.
function _pbAutoUpsertMany(key,max,recs){
  var arr=_pbAutoGet(key);
  recs.forEach(function(rec){
    for(var i=0;i<arr.length;i++){
      if(arr[i].h===rec.h||(rec.sid&&arr[i].sid===rec.sid)){rec.id=arr[i].id||rec.id;arr.splice(i,1);break;}
    }
    arr.unshift(rec);
  });
  return _pbAutoWrite(key,arr,max);
}

// ---------- FOTO ----------
function _pbAutoFotoName(){
  var n='';
  try{
    var pr=(FS.refs||[]).filter(function(r){return r&&r.type==='produk'&&r.focus&&String(r.focus).trim();})
      .map(function(r){return String(r.focus).trim();});
    if(pr.length)n=pr.join(', ');
  }catch(e){}
  // Mode impor (Prompt Lama): nama produk datang dari blok "product" JSON lama, bukan dari kartu foto.
  try{if(!n&&FS.importActive&&FS.importProductBlock&&FS.importProductBlock.name)n=String(FS.importProductBlock.name).trim();}catch(e){}
  try{if(!n&&(FS.produkMode==='foto'||FS.produkMode==='pegang'))n=String(FS.produkNama||'').trim();}catch(e){}
  if(!n)n='Tanpa nama produk';
  return n.slice(0,80);
}
function _pbAutoFotoSummary(){
  var out=[];
  try{if(typeof fRenderSummary==='function')fRenderSummary();}catch(e){}
  try{
    var rows=document.querySelectorAll('#summary-rows .summary-row');
    for(var i=0;i<rows.length&&out.length<10;i++){
      var k=rows[i].querySelector('.summary-row-key'),v=rows[i].querySelector('.summary-row-val');
      if(!k||!v||v.classList.contains('empty'))continue;
      var kt=String(k.textContent||'').trim(),vt=String(v.textContent||'').replace(/\s+/g,' ').trim();
      if(kt&&vt&&vt!=='—')out.push({k:kt.slice(0,20),v:vt.slice(0,40)});
    }
  }catch(e){}
  if(!out.length){
    try{
      [['Pose','poseLabel'],['Lokasi','lokasiLabel'],['Cahaya','cahayaLabel'],['Angle','angleLabel'],['Mood','moodLabel']].forEach(function(p){
        var v=FS[p[1]];if(v)out.push({k:p[0],v:String(v).slice(0,40)});
      });
    }catch(e){}
  }
  return out;
}
// Teks "Cara tampil" (maks 40 karakter) untuk record Foto otomatis.
function _pbAutoFotoCara(sum){
  try{
    if(FS.importActive)return 'Dari prompt lama';
    for(var i=0;i<(sum||[]).length;i++){if(sum[i]&&/cara tampil/i.test(sum[i].k||'')&&sum[i].v)return String(sum[i].v).slice(0,40);}
    var L={foto:'Dari foto produk',dipakai:'Dipakai di badan',pegang:'Dipegang / ditunjukkan',tidak:'Foto outfit / karakter saja'};
    if(FS.produkMode&&L[FS.produkMode])return L[FS.produkMode];
  }catch(e){}
  return '';
}
function pbAutoFotoRecord(text){
  try{
    text=String(text||'').trim();if(!text)return;
    var sum=_pbAutoFotoSummary();var rec={id:_pbAutoNewId(),h:_pbAutoHash(text),name:_pbAutoFotoName(),ts:Date.now(),sum:sum,cara:_pbAutoFotoCara(sum),text:text};
    _pbAutoUpsertMany(PB_AUTO_FOTO_KEY,PB_AUTO_FOTO_MAX,[rec]);
    try{pbAutoRender();}catch(e){}
  }catch(e){}
}

// ---------- VIDEO ----------
function _pbAutoVideoModeLabel(){
  try{
    var m=VB.refMode;
    if(m==='kp')return 'Raw Asset';
    if(m==='aset')return 'POV Produk · Pakai Skrip';
    if(m==='percobaan')return 'Percobaan';
    if(m==='dua')return 'Percakapan 2 Suara';
  }catch(e){}
  return 'Start Frame';
}
// v18.2 — Riwayat video otomatis: 1 entri per SESI generate (bukan per produk).
// Record: {id,sid,h,ts,name,meta,n,items:[{nama,cards:[{k,t}]}],text,vs}. "text" tetap diisi (format lama)
// untuk kompatibilitas; "vs" = snapshot state builder TANPA foto, disiapkan untuk pensil (fase berikutnya).
function _pbAutoVideoSessionStart(produkList){
  try{
    var sig=(produkList||[]).map(function(p){return String((p&&p.nama)||'').trim().toLowerCase();}).join('|');
    if(!PB_AUTO_VIDEO_SID||sig!==PB_AUTO_VIDEO_SIG){PB_AUTO_VIDEO_SID=_pbAutoNewId();PB_AUTO_VIDEO_SIG=sig;}
  }catch(e){}
}
// Lanjutkan Generate setelah halaman dimuat ulang: sid di memori sudah hilang, jadi pakai kembali sesi
// yang daftar produknya sama (supaya satu sesi tidak jadi dua entri).
function _pbAutoVideoAdopt(produkList){
  try{
    if(PB_AUTO_VIDEO_SID)return;
    var sig=(produkList||[]).map(function(p){return String((p&&p.nama)||'').trim().toLowerCase();}).join('|');
    if(!sig)return;
    var arr=_pbAutoGet(PB_AUTO_VIDEO_KEY);
    for(var i=0;i<arr.length;i++){if(arr[i].sid&&arr[i].sig===sig){PB_AUTO_VIDEO_SID=arr[i].sid;PB_AUTO_VIDEO_SIG=sig;return;}}
  }catch(e){}
}
function _pbAutoVideoText(items){
  return items.map(function(it){
    var b=it.cards.map(function(c){return c.k+': '+c.t;}).join('\n\n');
    return items.length>1?'# '+it.nama+'\n'+b:b;
  }).join('\n\n');
}
function _pbAutoVideoVs(){
  try{
    var s=_vbPackState(true); // tanpa foto base64: tidak ikut diserialisasi, jadi murah dipanggil di tiap generate/revisi
    return (s&&s.length<=60000)?s:''; // terlalu besar: jangan bebani localStorage yang dipakai bersama Halaman Tersimpan
  }catch(e){return '';}
}
function pbAutoVideoRecord(sessionLabel){
  try{
    if(!VB_BULK_ITEMS||VB_BULK_ITEMS.length===0)return;
    // Jalur 'isi manual' (user mengetik skrip sendiri, bukan hasil AI) tidak dicatat.
    if(/^isi manual/i.test(String(sessionLabel||'')))return;
    var byP={},order=[];
    VB_BULK_ITEMS.forEach(function(it,i){
      if(_vb16()&&i%3===1)return;
      var p=Math.floor(i/3),el=document.getElementById('vb-bulk-script-'+i);
      var t=String((el&&typeof el.value==='string'?el.value:it.script)||'').trim();
      var k=String(it.role||'').toUpperCase();
      if(k!=='HOOK'&&k!=='STORY'&&k!=='CTA')k=['HOOK','STORY','CTA'][i%3];
      if(!byP[p]){byP[p]={nama:'',cards:[]};order.push(p);}
      if(it.produk)byP[p].nama=it.produk;
      if(t)byP[p].cards.push({k:k,t:t});
    });
    var items=[];
    order.forEach(function(p){var o=byP[p];if(o.cards.length)items.push({nama:String(o.nama||'Produk '+(items.length+1)).slice(0,80),cards:o.cards});});
    if(!items.length)return;
    if(!PB_AUTO_VIDEO_SID){PB_AUTO_VIDEO_SID=_pbAutoNewId();PB_AUTO_VIDEO_SIG='';}
    var meta=[_pbAutoVideoModeLabel(),items.length+' produk'];
    try{if(_vbHasDur()&&VB.durasi)meta.push(VB.durasi+' dtk');}catch(e){}
    var name=items.length===1?items[0].nama:items.length+' produk';
    var rec={id:_pbAutoNewId(),sid:PB_AUTO_VIDEO_SID,sig:PB_AUTO_VIDEO_SIG,h:_pbAutoHash('sid\u0001'+PB_AUTO_VIDEO_SID),name:name,ts:Date.now(),meta:meta.join(' · '),n:items.length,items:items,text:_pbAutoVideoText(items),vs:_pbAutoVideoVs()};
    _pbAutoUpsertMany(PB_AUTO_VIDEO_KEY,PB_AUTO_VIDEO_MAX,[rec]);
    try{pbAutoRender();}catch(e){}
  }catch(e){}
}

// ---------- TAMPILAN ----------
function pbRiwayatTab(name){
  if(name!=='saved'&&name!=='foto'&&name!=='video')name='saved';
  _pbRwTab=name;
  ['saved','foto','video'].forEach(function(n){
    var p=document.getElementById('rw-pane-'+n),b=document.getElementById('rw-btn-'+n);
    if(p)p.style.display=(n===name)?'':'none';
    if(b)b.classList.toggle('on',n===name);
  });
}
// ============================================================
// v18.1 — REDESAIN TAB RIWAYAT, FASE 3-4 (panduan 3.3 dan 3.7)
// pbRwMakeCopyBtn: SATU tombol Salin untuk Riwayat, tampilan dan animasi sama dengan
// kartu skrip di halaman utama (class copy-btn, label "Salin", centang + "sudah").
// Tanpa validasi "Nama Produk wajib" milik jalur Tulis Manual.
// pbOpenAutoPage: overlay Buka untuk Foto/Video otomatis, memakai kerangka
// #pb-saved-overlay yang sama (BUKAN overlay kedua). Tidak menyentuh PB_ACTIVE_SAVED_ID
// dan tidak menimpa state builder (record belum punya "vs", jadi mode teks saja).
// Video: edit teks per kartu, auto-tersimpan ke record yang sama (debounce 600 ms,
// di-flush saat ditutup lewat _pbSavedOverlayPendingFlushes). Foto: hanya baca.
// ============================================================
function pbRwMakeCopyBtn(getText,opts){
  opts=opts||{};
  var label=opts.label||'Salin';
  var wrap=document.createElement('div');
  wrap.style.cssText='display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:5px;min-width:0;max-width:100%;margin-left:auto;';
  var b=document.createElement('button');b.type='button';b.className='copy-btn';
  b.style.cssText='font-size:var(--fs-2xs);padding:3px 8px;flex-shrink:0;';
  b.textContent=label;
  var dl=document.createElement('span');dl.className='hidden vb-done-lbl';
  dl.style.cssText='font-size:var(--fs-2xs);color:var(--green);font-weight:500;margin-left:5px;';
  dl.innerHTML='<svg class="icon"><use href="#ic-check"></use></svg> sudah';
  wrap._btn=b;
  wrap._flash=function(){
    b.innerHTML='<svg class="icon"><use href="#ic-check"></use></svg>';
    clearTimeout(b._pbT);b._pbT=setTimeout(function(){b.textContent=label;},1200);
    dl.classList.remove('hidden');
  };
  if(typeof getText==='function'){
    b.onclick=function(){
      _copyTextRobust(String(getText()||''),function(){wrap._flash();if(opts.onCopied)opts.onCopied();},function(){showToast('Gagal salin — coba tap & tahan teksnya lalu Copy','error');});
    };
  }
  wrap.appendChild(b);wrap.appendChild(dl);
  return wrap;
}
function _pbRwSetOverlaySub(txt){
  var sub=document.getElementById('pb-saved-overlay-sub');
  if(!sub||!sub.firstChild||sub.firstChild.nodeType!==3)return;
  if(sub._pbOrig===undefined)sub._pbOrig=sub.firstChild.nodeValue;
  sub.firstChild.nodeValue=(txt===null)?sub._pbOrig:txt+' ';
}
function _pbRwWc(s){return String(s||'').trim().split(/\s+/).filter(Boolean).length;}
// Pecah "HOOK: ...\n\nSTORY: ...\n\nCTA: ..." jadi kartu. Tanpa penanda: satu kartu "SKRIP" (disimpan apa adanya).
function _pbRwSplitCards(text){
  var s=String(text||''),re=/(?:^|\n)[ \t]*(HOOK|STORY|CTA):[ \t]*/g,m,mk=[],out=[];
  while((m=re.exec(s))!==null)mk.push({k:m[1],i:m.index,e:re.lastIndex});
  if(!mk.length)return [{k:'SKRIP',t:s.trim()}];
  mk.forEach(function(x,n){out.push({k:x.k,t:s.slice(x.e,n+1<mk.length?mk[n+1].i:s.length).trim()});});
  return out;
}
function _pbRwScCard(label,bodyEl,getText,wcEl){
  var sc=document.createElement('div');sc.className='rw-sc';
  var sh=document.createElement('div');sh.className='rw-sh';
  var b=document.createElement('b');b.textContent=label;sh.appendChild(b);
  if(!wcEl){wcEl=document.createElement('span');wcEl.className='rw-wc';}
  sh.appendChild(wcEl);sh.appendChild(pbRwMakeCopyBtn(getText));
  sc.appendChild(sh);sc.appendChild(bodyEl);
  return sc;
}
function pbOpenAutoPage(kind,id){
  try{
    var isFoto=kind==='foto',key=isFoto?PB_AUTO_FOTO_KEY:PB_AUTO_VIDEO_KEY;
    var rec=_pbAutoGet(key).filter(function(x){return x.id===id;})[0];
    var overlay=document.getElementById('pb-saved-overlay'),body=document.getElementById('pb-saved-overlay-body'),titleEl=document.getElementById('pb-saved-overlay-title');
    if(!rec||!overlay||!body||!titleEl){showToast('Entri riwayat tidak ditemukan','error');return;}
    var nama=rec.name||(isFoto?'Prompt foto':'Skrip video');
    titleEl.textContent=nama;
    _pbRwSetOverlaySub(isFoto?'Dicatat otomatis · hanya baca':'Dicatat otomatis · edit auto-tersimpan');
    body.innerHTML='';
    _pbSavedOverlayPendingFlushes=[]; // sama seperti pbShowSavedOverlay: buang sisa entri sebelumnya
    // Kerangka produk akordeon: produk pertama terbuka, sisanya tertutup.
    var mkProd=function(title,tagText,open){
      var prod=document.createElement('section');prod.className='rw-prod'+(open?'':' shut');
      var ph=document.createElement('div');ph.className='rw-ph';
      var nm=document.createElement('strong');nm.textContent=title;ph.appendChild(nm);
      if(tagText){var tg=document.createElement('span');tg.className='rw-tag';tg.textContent=tagText;ph.appendChild(tg);}
      var cardsEl=document.createElement('div');cardsEl.className='rw-cards';
      var tgl=document.createElement('button');tgl.type='button';tgl.className='rw-ib';
      tgl.setAttribute('aria-label','Buka atau tutup');tgl.setAttribute('aria-expanded',open?'true':'false');
      tgl.innerHTML='<svg class="icon rw-chev" aria-hidden="true"><use href="#ic-chevron-down"></use></svg>';
      tgl.onclick=function(){var s=prod.classList.toggle('shut');tgl.setAttribute('aria-expanded',s?'false':'true');};
      ph.appendChild(tgl);prod.appendChild(ph);prod.appendChild(cardsEl);body.appendChild(prod);
      return cardsEl;
    };
    if(isFoto){
      var pre=document.createElement('pre');pre.className='rw-pre';pre.textContent=String(rec.text||'');
      mkProd(nama,_pbAutoCara(rec),true).appendChild(_pbRwScCard('Prompt foto',pre,function(){return String(rec.text||'');}));
    }else{
      var LB={HOOK:'Hook',STORY:'Story',CTA:'CTA',SKRIP:'Skrip'},groups=[],dirty=false,t=null;
      var hasItems=Array.isArray(rec.items)&&rec.items.length>0;
      // Record lama (per produk, tanpa items): satu produk, dipecah dari "text".
      var src=hasItems?rec.items:[{nama:nama,cards:_pbRwSplitCards(rec.text)}];
      var doSave=function(){
        dirty=false;
        try{
          var arr=_pbAutoGet(key),i;
          for(i=0;i<arr.length;i++){if(arr[i].id===id)break;}
          if(i>=arr.length)return;
          if(hasItems){
            var its=groups.map(function(g){return {nama:g.nama,cards:g.cards.map(function(c){return {k:c.k,t:c.ta.value.trim()};})};});
            arr[i].items=its;arr[i].text=_pbAutoVideoText(its);
          }else{
            arr[i].text=groups[0].cards.map(function(c){return c.k==='SKRIP'?c.ta.value:c.k+': '+c.ta.value.trim();}).join('\n\n');
          }
          if(!_pbAutoWrite(key,arr,PB_AUTO_VIDEO_MAX)){showToast('Penyimpanan penuh — edit terakhir belum tersimpan','error');return;}
          var f=document.getElementById('pb-saved-overlay-autosaved');
          if(f){f.classList.add('show');clearTimeout(f._pbT);f._pbT=setTimeout(function(){f.classList.remove('show');},1200);}
        }catch(e){}
      };
      src.forEach(function(it,gi){
        var cardsEl=mkProd(it.nama||nama,'',gi===0),g={nama:it.nama||nama,cards:[]};
        (it.cards||[]).forEach(function(c){
          var ta=document.createElement('textarea');ta.rows=4;ta.value=c.t||'';
          var wc=document.createElement('span');wc.className='rw-wc';wc.textContent=_pbRwWc(ta.value)+' kata';
          ta.addEventListener('input',function(){wc.textContent=_pbRwWc(ta.value)+' kata';dirty=true;clearTimeout(t);t=setTimeout(doSave,600);});
          g.cards.push({k:c.k,ta:ta});
          cardsEl.appendChild(_pbRwScCard(LB[c.k]||c.k,ta,function(){return ta.value;},wc));
        });
        groups.push(g);
      });
      _pbSavedOverlayPendingFlushes.push(function(){if(!dirty)return;clearTimeout(t);doSave();});
    }
    body.scrollTop=0;
    overlay.classList.add('show');overlay.setAttribute('aria-hidden','false');
  }catch(e){showToast('Gagal membuka entri riwayat','error');}
}
// Cara tampil produk untuk kartu Foto otomatis: field baru "cara", cadangan dari "sum".
function _pbAutoCara(item){
  if(item.cara)return String(item.cara);
  if(Array.isArray(item.sum)){
    for(var i=0;i<item.sum.length;i++){var s=item.sum[i];if(s&&/cara tampil/i.test(s.k||'')&&s.v)return String(s.v);}
  }
  return '';
}
function _pbAutoRenderList(kind){
  var isFoto=kind==='foto';
  var wrap=document.getElementById(isFoto?'auto-foto-list':'auto-video-list');
  if(!wrap)return;
  var arr=_pbAutoGet(isFoto?PB_AUTO_FOTO_KEY:PB_AUTO_VIDEO_KEY);
  var clr=document.getElementById(isFoto?'auto-foto-clear':'auto-video-clear');
  if(clr)clr.style.display=arr.length?'':'none';
  var cnt=document.getElementById(isFoto?'rw-cnt-foto':'rw-cnt-video');
  if(cnt)cnt.textContent=arr.length?String(arr.length):'';
  wrap.textContent='';
  if(!arr.length){
    var em=document.createElement('p');
    em.style.cssText='font-size:var(--fs-sm);color:var(--muted);padding:16px 0;text-align:center;';
    em.textContent=isFoto?'Belum ada prompt foto. Setiap prompt foto yang kamu generate akan tercatat di sini otomatis.':'Belum ada skrip video. Setiap skrip hasil AI akan tercatat di sini otomatis.';
    wrap.appendChild(em);return;
  }
  arr.forEach(function(item){
    var cara=isFoto?_pbAutoCara(item):'';
    wrap.appendChild(pbRwCard({
      type:isFoto?'foto':'video',
      title:item.name||(isFoto?'Prompt foto':'Skrip video'),
      meta:isFoto?(cara?'Cara tampil: '+cara:''):(item.meta||''),
      time:pbRwTime(item.ts),
      chips:(!isFoto&&item.items&&item.items.length>1)?item.items.map(function(x){return x.nama;}):null,
      actions:[
        {label:'Buka',onClick:function(){pbOpenAutoPage(kind,item.id);}},
        {label:'Hapus',icon:'ic-rw-trash',onClick:function(){showConfirm('Hapus "'+(item.name||'entri ini')+'" dari riwayat otomatis?',function(){pbAutoDelete(kind,item.id);},null,'Ya, Hapus');}}
      ]
    }));
  });
}
function pbAutoRender(){
  try{_pbAutoRenderList('foto');}catch(e){}
  try{_pbAutoRenderList('video');}catch(e){}
}
function pbAutoDelete(kind,id){
  try{
    var key=kind==='foto'?PB_AUTO_FOTO_KEY:PB_AUTO_VIDEO_KEY;
    var arr=_pbAutoGet(key).filter(function(x){return x.id!==id;});
    _pbAutoWrite(key,arr,kind==='foto'?PB_AUTO_FOTO_MAX:PB_AUTO_VIDEO_MAX);
    pbAutoRender();
  }catch(e){}
}
function pbAutoClearAll(kind){
  showConfirm('Hapus semua riwayat '+(kind==='foto'?'foto':'video')+' otomatis?',function(){
    try{
      var key=kind==='foto'?PB_AUTO_FOTO_KEY:PB_AUTO_VIDEO_KEY;
      localStorage.setItem(key,'[]');
      try{if(typeof pbCloudQueue==='function')pbCloudQueue(key);}catch(e2){}
      pbAutoRender();
    }catch(e){}
  },null,'Ya, Hapus Semua');
}

// ---------- DIALOG BERI NAMA (simpan manual & ganti nama) ----------
function pbAskName(opt,onOk,onCancel){
  opt=opt||{};
  var overlay=document.createElement('div');overlay.className='confirm-overlay';
  var box=document.createElement('div');box.className='confirm-box';
  var h4=document.createElement('h4');h4.textContent=opt.title||'Beri nama';
  var p=document.createElement('p');p.textContent=opt.desc||'';
  p.style.marginBottom='var(--space-4)';
  var inp=document.createElement('input');inp.type='text';inp.className='rw-name-input';
  inp.maxLength=60;inp.placeholder=opt.placeholder||'Contoh: Gamis batch 1';inp.value=opt.initial||'';
  inp.setAttribute('autocomplete','off');inp.setAttribute('aria-label','Nama');
  var btns=document.createElement('div');btns.className='confirm-btns';
  var cancelBtn=document.createElement('button');cancelBtn.className='confirm-cancel';cancelBtn.textContent='Batal';
  var okBtn=document.createElement('button');okBtn.className='confirm-ok';okBtn.textContent=opt.okLabel||'Simpan';
  okBtn.style.cssText='background:var(--accent-dim-bg);color:var(--accent-2);border:1px solid var(--accent-dim)!important;';
  btns.appendChild(cancelBtn);btns.appendChild(okBtn);
  box.appendChild(h4);if(opt.desc)box.appendChild(p);box.appendChild(inp);box.appendChild(btns);
  overlay.appendChild(box);document.body.appendChild(overlay);
  function sync(){var ok=inp.value.trim().length>0;okBtn.disabled=!ok;okBtn.style.opacity=ok?'1':'0.45';}
  function close(){overlay.remove();document.removeEventListener('keydown',onKey);}
  function submit(){var v=inp.value.trim().slice(0,60);if(!v)return;close();if(onOk)onOk(v);}
  function cancel(){close();if(onCancel)onCancel();}
  function onKey(e){if(e.key==='Escape')cancel();}
  inp.addEventListener('input',sync);
  inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();submit();}});
  okBtn.onclick=submit;cancelBtn.onclick=cancel;
  document.addEventListener('keydown',onKey);
  sync();
  setTimeout(function(){try{inp.focus();inp.select();}catch(e){}},60);
}
function pbSavedRename(id){
  var arr=pbSavedGet();var item=null;
  for(var i=0;i<arr.length;i++){if(arr[i].id===id){item=arr[i];break;}}
  if(!item)return;
  pbAskName({title:'Ganti nama',initial:item.label||'',okLabel:'Simpan'},function(nm){
    var cur=pbSavedGet();
    for(var j=0;j<cur.length;j++){if(cur[j].id===id){cur[j].label=nm;break;}}
    try{pbSavedSetAll(cur);}catch(e){showToast('Gagal mengganti nama — penyimpanan browser penuh.','error');return;}
    pbSavedRender();
  });
}

// Indikator status sinkron cloud di tab Riwayat (data: window.pbSyncStatus,
// diisi oleh blok sinkron di dekat awal file).
function pbSyncRenderStatus(){
  let el=document.getElementById('pb-sync-status');
  if(!el)return;
  let st=window.pbSyncStatus||{state:'unknown'};
  if(st.state==='unknown'){el.style.display='none';return;}
  let map={
    connecting:['var(--muted)','Menyambungkan sinkron…'],
    syncing:['var(--warning)','Mengirim ke cloud…'],
    ok:['var(--green)','Tersinkron'],
    offline:['var(--warning)','Offline — dikirim saat online lagi'],
    error:['var(--red)','Gagal sinkron: '+(st.msg||'coba lagi nanti')],
    off:['var(--warning)','Sinkron belum aktif — riwayat hanya tersimpan di HP ini']
  };
  let m=map[st.state]||map.off;
  let text=m[1];
  if(st.state==='ok'&&st.ts){
    text+=' · '+new Date(st.ts).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  }
  el.style.display='flex';
  el.innerHTML='';
  let dot=document.createElement('span');
  dot.style.cssText='width:8px;height:8px;border-radius:50%;flex:none;background:'+m[0]+';';
  let t=document.createElement('span');
  t.textContent=text;t.style.cssText='flex:1;min-width:0;color:'+(st.state==='error'?'var(--red)':'var(--muted)')+';';
  el.appendChild(dot);el.appendChild(t);
  if(st.state==='error'){
    let b=document.createElement('button');
    b.textContent='Coba lagi';
    b.style.cssText='background:none;border:1px solid var(--border);color:var(--text);font-size:var(--fs-xs2);padding:8px 14px;min-height:36px;border-radius:var(--radius-2xs);cursor:pointer;font-family:"Hanken Grotesk",sans-serif;';
    b.onclick=function(){if(typeof pbCloudRetry==='function')pbCloudRetry();};
    el.appendChild(b);
  }
}

// Tampilkan/sembunyikan chip persisten "Lanjut Riwayat" (lihat komentar di
// f-continue-chip/vb-continue-chip di HTML) sesuai PB_ACTIVE_SAVED_ID saat
// ini. Dipanggil dari pbSavedRender() supaya SATU titik ini otomatis
// nyambung ke semua aksi yang bisa mengubah status kunci (buka, tutup,
// hapus entri aktif, hapus semua, update-save) — tidak perlu manggil ini
// manual di banyak tempat & rawan kelewat.
function pbSyncContinueChips(){
  let activeItem=PB_ACTIVE_SAVED_ID?pbSavedGet().find(function(x){return x.id===PB_ACTIVE_SAVED_ID;}):null;
  let fChip=document.getElementById('f-continue-chip');
  let vbChip=document.getElementById('vb-continue-chip');
  if(fChip)fChip.classList.toggle('hidden',!(activeItem&&activeItem.type==='foto'));
  if(vbChip)vbChip.classList.toggle('hidden',!(activeItem&&activeItem.type==='video'));
}

// Buka kembali halaman tersimpan: pindah ke tab Foto/Video, kembalikan
// state FS/VB sebisanya, lalu tampilkan ulang HTML skrip/prompt yang sudah
// jadi persis seperti saat disimpan. Catatan: field input di wizard (step
// 1-7/1-4) TIDAK ditata ulang otomatis satu-per-satu — fokus fitur ini
// memastikan SKRIP/PROMPT hasil generate tetap utuh & bisa disalin lagi,
// sesuai permintaan awal fitur ini.
// Hapus SEMUA banner "halaman tersimpan" yang mungkin masih nongol di
// f-multi-output MAUPUN vb-multi-output. Perlu ini karena tab Foto/Video
// tidak pernah dihapus dari DOM (switchPage cuma toggle class .active),
// jadi kalau user buka entri Foto dari Riwayat lalu (tanpa Tutup) buka
// entri Video juga, dua elemen id="pb-saved-banner" bisa nangkring
// BARENGAN di DOM — melanggar aturan id unik & bikin getElementById()
// salah ambil elemen (bisa ke banner yang lama, bukan yang baru dibuka).
// Dipanggil sebelum bikin banner baru, dan saat entri aktif ditutup/
// dihapus, supaya cuma ada MAKSIMAL 1 banner nongol kapan pun.
function pbRemoveSavedBanners(){
  document.querySelectorAll('#pb-saved-banner').forEach(function(el){el.remove();});
}

// FIX (permintaan user): "Buka" dari Riwayat dulu langsung pindah tab &
// menyisipkan hasilnya sebagai banner INLINE di dalam tab Foto/Video (dan
// skripnya dibekukan jadi teks, tidak bisa diedit lagi). Sekarang "Buka"
// menampilkan OVERLAY penuh layar (lihat pb-saved-overlay di <body>) yang
// bisa ditutup lagi tanpa mengubah apa pun di halaman di baliknya, dan
// skrip di dalamnya tetap berupa field yang BISA DIEDIT (auto-tersimpan).
// Restorasi state FS/VB tetap dilakukan seperti sebelumnya (supaya data
// wizard-nya utuh kalau nanti mau dilanjutkan generate-nya) — lihat
// pbContinueInBuilder() untuk jalur lanjut-generate-hidup yang lama,
// sekarang jadi tombol opsional di dalam overlay.
function pbOpenSavedPage(id){
  let item=pbSavedGet().find(function(x){return x.id===id;});
  if(!item){showToast('Halaman tersimpan tidak ditemukan','error');return;}
  // Kunci mode "melanjutkan" ke entri ini — selama belum ditutup lewat
  // tombol "Tutup Riwayat" di banner builder (lihat pbCloseActiveSavedPage),
  // tiap klik Simpan berikutnya akan MENIMPA entri id ini, bukan bikin
  // entri baru. Lihat PB_ACTIVE_SAVED_ID & pbSaveCurrentPage().
  PB_ACTIVE_SAVED_ID=item.id;
  // FIX BUG (lihat catatan panjang di deklarasi _pbPreOpenSnapshot dekat
  // PB_ACTIVE_SAVED_ID): rekam kondisi FS/VB PERSIS sebelum entri Riwayat
  // manapun ditimpakan ke state live, supaya bisa dikembalikan lagi saat
  // Riwayat ditutup. Sengaja HANYA diambil kalau belum ada snapshot yang
  // "mengantre" (_pbPreOpenSnapshot masih null) — kalau user pindah-pindah
  // buka entri lain tanpa menutup dulu, snapshot yang dipakai tetap kondisi
  // ASLI sebelum entri pertama dibuka, bukan kondisi entri sebelumnya yang
  // sudah "kotor" juga.
  if(_pbPreOpenSnapshot===null){
    try{ _pbPreOpenSnapshot={fs:JSON.stringify(FS),vb:_vbPackState(),sid:PB_AUTO_VIDEO_SID,sig:PB_AUTO_VIDEO_SIG}; }
    catch(e){ _pbPreOpenSnapshot={fs:'{}',vb:'{}'}; }
    PB_AUTO_VIDEO_SID='';PB_AUTO_VIDEO_SIG=''; // isi halaman yang dibuka bukan sesi aktif; dipulihkan saat snapshot dikembalikan
  }
  // FIX: restore KEDUA builder, bukan cuma yang type-nya cocok dengan
  // halaman yang mau ditampilkan. Entri LAMA (dibuat sebelum fix ini) tidak
  // punya fotoState/videoState — fallback ke item.state (skema lama, cuma
  // punya salah satu) supaya tetap kompatibel.
  try{
    let fotoState=(item.fotoState!=null)?item.fotoState:(item.type==='foto'?item.state:null);
    if(fotoState!=null && typeof FS!=='undefined'){FS.povProduk=false;Object.assign(FS,JSON.parse(fotoState||'{}'));if(FS.subjek==='produk')FS.subjek='';FS.importIsProdukSaja=false;if(typeof povSync==='function')povSync();}
  }catch(e){/* state foto korup — lanjut tanpa restore, HTML hasil tetap ditampilkan */}
  try{
    let videoState=(item.videoState!=null)?item.videoState:(item.type==='video'?item.state:null);
    if(videoState!=null)_vbUnpackState(videoState);
  }catch(e){/* state video korup — lanjut tanpa restore */}

  pbShowSavedOverlay(item);
  pbSavedRender();
}

// Bangun & tampilkan overlay full-screen untuk SATU entri Riwayat. Kedua
// builder (foto & video) yang punya isi ditampilkan sebagai section
// terpisah, field-nya editable, tiap ketikan auto-tersimpan (debounce
// ±600ms) lewat pbSavedAutosaveField().
function pbShowSavedOverlay(item){
  let overlay=document.getElementById('pb-saved-overlay');
  let body=document.getElementById('pb-saved-overlay-body');
  let titleEl=document.getElementById('pb-saved-overlay-title');
  if(!overlay||!body)return;
  titleEl.textContent=item.label||'Halaman tersimpan';
  try{_pbRwSetOverlaySub(null);}catch(e){} // v18.1: pulihkan sub-judul asli (overlay entri otomatis mengubahnya)
  body.innerHTML='';
  // BUG FIX (laporan user): tombol × / backdrop / Esc dulu langsung
  // menyembunyikan overlay TANPA peduli ada autosave yang masih "mengantre"
  // (debounce ±600ms di bawah, lihat pbSavedAutosaveField). Kalau user
  // mengetik lalu buru-buru menutup dalam <600ms, edit terakhir belum
  // sempat ditulis ke localStorage saat overlay ditutup/dibuka lagi —
  // begitu Riwayat dibuka ulang (apalagi cepat), yang tampil masih versi
  // SEBELUM edit terakhir, kelihatan seperti "gak kesimpan". Direset di
  // sini (bukan cuma dideklarasikan sekali) supaya tidak ada sisa dari
  // entri Riwayat sebelumnya yang ketinggalan.
  _pbSavedOverlayPendingFlushes=[];
  let sections=[
    {type:'foto',html:item.fotoHtml,text:item.fotoText,htmlField:'fotoHtml',textField:'fotoText'},
    {type:'video',html:item.videoHtml,text:item.videoText,htmlField:'videoHtml',textField:'videoText'}
  ];
  // Entri lama (sebelum fix dual-builder) cuma punya item.html/item.text
  // lewat item.type-nya sendiri — fotoHtml/videoHtml-nya null.
  sections.forEach(function(s){
    if(s.html==null && item.type===s.type){s.html=item.html;s.text=item.text;}
  });
  let anyRendered=false;
  sections.forEach(function(s){
    // Entri LAMA Mode 4 (disimpan sebelum perbaikan) tidak
    // punya HTML hasil sama sekali — prompt-nya deterministik dari state, jadi
    // dibangun ulang di sini supaya tidak lagi tampil kosong.
    if(!s.html && s.type==='video' && _pbCanRebuildVideo(item) && typeof VB!=='undefined'
       && VB.refMode==='ikuti'){
      try{
        let o=JSON.parse(_pbVideoStateOf(item)||'{}');
        if(!('M4_OVERLAY' in o) && typeof VB_MODE4_OVERLAY_TEXT!=='undefined')VB_MODE4_OVERLAY_TEXT='';
      }catch(e){}
      let sp=_pbCollectSpecialVideo();
      if(sp){s.html=sp.html;s.text=sp.text;}
    }
    if(!s.html)return; // tidak ada apa pun buat tipe ini saat disimpan
    anyRendered=true;
    let sec=document.createElement('div');
    sec.className='pb-saved-overlay-section';
    let head=document.createElement('div');head.className='pb-saved-overlay-section-head';
    let badge=document.createElement('span');badge.className='pb-saved-overlay-section-label';badge.textContent=s.type==='foto'?'FOTO':'VIDEO';
    head.appendChild(badge);
    if(s.type===item.type){
      let cur=document.createElement('span');cur.style.cssText='font-size:var(--fs-xs2);color:var(--accent-2);';cur.textContent='Halaman aktif saat disimpan';
      head.appendChild(cur);
    }
    if(s.text){
      // Teks TERBARU tiap klik (bukan snapshot): user mungkin sudah mengedit field di overlay.
      head.appendChild(pbRwMakeCopyBtn(function(){return _pbExtractLiveText(content);},{label:'Salin Semua Teks',onCopied:function(){showToast('Semua teks tersalin!','success');}}));
    }
    sec.appendChild(head);
    let content=document.createElement('div');content.className='pb-saved-overlay-content';
    content.innerHTML=s.html;
    // FITUR BARU (permintaan user): dulu di Riwayat cuma ada "Salin Semua
    // Teks" (satu tombol buat seluruh section) — padahal di halaman utama
    // (Foto/Video builder asli) tiap kartu Hook/Story/CTA/shot punya tombol
    // "Salin" sendiri-sendiri. Bedanya kelihatan wajar karena _pbCollectResult
    // MEMBUANG semua <button>/.copy-btn (termasuk tombol Salin per-kartu
    // aslinya) sebelum disimpan ke Riwayat — supaya tidak ada onclick basi
    // yang nyangkut ke elemen/state builder asli yang sudah tidak ada di
    // overlay ini. Sekarang tombol Salin per-kartu itu DIBANGUN ULANG di
    // sini, bukan dipulihkan dari yang lama, jadi onclick-nya otomatis
    // aman/independen dari builder asli.
    _pbInjectPerCardCopyButtons(content);
    // FITUR BARU (permintaan user): "Lihat Ringkasan" (pilihan wizard yang
    // dipakai bikin entri Foto ini) + "Atur Variasi & Generate Ulang" (pilih
    // ulang shot mana yang mau ada, generate ulang tanpa keluar dari
    // Riwayat) — lihat _pbEnhanceFotoSummary/_pbEnhanceFotoVariations.
    if(s.type==='foto')_pbEnhanceFotoSummary(head,sec,content);
    if(s.type==='video' && _pbCanRebuildVideo(item)){
      content._pbRebuild=true;
      if(!_pbEnhanceSpecialVideo(content))_pbEnhanceVideoContent(content);
    }
    sec.appendChild(content);
    // Tombol "Lanjutkan Generate" — PERMINTAAN USER: mesin generate-nya
    // TETAP jalan di halaman Video asli (vb-multi-output) seperti biasa,
    // TIDAK ditampilkan ke user di sana (overlay ini menutupi seluruh
    // layar, jadi halaman asli memang tidak kelihatan) — begitu hasilnya
    // siap, baru diambil & dimasukkan ke overlay ini. Lihat
    // pbContinueInOverlay() untuk alurnya.
    if(s.type==='video' && typeof VB_BULK_LAST_CONTEXT!=='undefined' && VB_BULK_LAST_CONTEXT
       && VB_BULK_LAST_CONTEXT.produkList && VB_BULK_LAST_CONTEXT.allResults
       && VB_BULK_LAST_CONTEXT.allResults.length<VB_BULK_LAST_CONTEXT.produkList.length){
      let remaining=VB_BULK_LAST_CONTEXT.produkList.length-VB_BULK_LAST_CONTEXT.allResults.length;
      let contBtn=document.createElement('button');contBtn.className='copy-btn';contBtn.style.cssText='margin-left:8px;';
      contBtn.textContent='Lanjutkan Generate ('+remaining+' produk lagi)';
      contBtn.onclick=function(){pbContinueInOverlay(item,content,contBtn);};
      head.appendChild(contBtn);
    }
    body.appendChild(sec);
    // Autosave: tiap ketikan di dalam section ini, debounce, tulis balik
    // ke entri Riwayat yang sama. Fungsi simpan-nya didaftarkan ke
    // _pbSavedOverlayPendingFlushes supaya pbCloseSavedOverlay bisa
    // memanggilnya SEGERA (bypass debounce) sebelum overlay ditutup — lihat
    // catatan bug fix di pbCloseSavedOverlay(). Flag "dirty" supaya flush
    // ini cuma benar-benar nulis kalau memang ada ketikan yang belum
    // sempat disimpan (bukan nulis ulang tiap kali overlay ditutup).
    let debounceT=null,dirty=false;
    function doSave(){
      dirty=false;
      pbSavedAutosaveField(item.id,s.htmlField,s.textField,content);
    }
    content.addEventListener('input',function(){
      dirty=true;
      clearTimeout(debounceT);
      debounceT=setTimeout(doSave,600);
    });
    _pbSavedOverlayPendingFlushes.push(function(){
      if(!dirty)return;
      clearTimeout(debounceT);
      doSave();
    });
  });
  if(!anyRendered){
    body.innerHTML='<p style="font-size:var(--fs-sm);color:var(--muted);padding:16px 0;text-align:center;">Halaman ini belum punya skrip/prompt yang di-generate — cuma stelan/foto yang sempat diisi.</p>';
  }
  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden','false');
}

// FITUR BARU (permintaan user, lihat catatan di pbShowSavedOverlay): pasang
// tombol "Salin" di TIAP kartu Hook/Story/CTA (Video) atau tiap kartu shot
// (Foto) di dalam overlay Riwayat — bukan cuma satu tombol "Salin Semua
// Teks" buat seluruh section. Tidak bisa pakai id (semua id sudah dilepas
// saat disimpan lewat _pbCollectResult), jadi dicari lewat STRUKTUR kartu
// yang selalu sama persis di kedua builder: setiap kartu = <div> berisi
// [head, body], dan body selalu memuat satu <pre> berisi teks JSON siap
// salin (lihat _vbBuildEditableCard & fGenerate multi-output). Kalau
// strukturnya ternyata beda (versi lama/format tak dikenal), kartu itu
// dilewati saja — tidak memaksa & tidak bikin error.
function _pbInjectPerCardCopyButtons(root){
  root.querySelectorAll('pre').forEach(function(pre){
    let body=pre.parentElement;
    let card=body?body.parentElement:null;
    let head=card?card.firstElementChild:null;
    if(!head||head===body)return;
    if(head.querySelector('.pb-percard-copy'))return; // jangan dobel
    let txt=pre.textContent||'';
    if(!txt.trim())return;
    // FIX: header kartu tersimpan (snapshot lama) tidak punya flex-wrap -> tombol bisa terpotong. Paksa wrap.
    head.style.flexWrap='wrap';
    let _pcw=pbRwMakeCopyBtn(null); // v18.1: tampilan & animasi sama dengan halaman utama
    let btn=_pcw._btn;
    // Kelas penanda di PEMBUNGKUS (bukan tombol): mode Raw Asset memindahkan elemen ber-kelas ini ke grup kanan
    // header (salin.style.marginLeft='0'; right.appendChild(salin)) — tombol + label "sudah" harus ikut pindah.
    _pcw.classList.add('pb-percard-copy');
    btn.onclick=function(){
      // BUG FIX (laporan user): dulu tombol ini SELALU menyalin isi <pre>
      // apa adanya — padahal <pre> itu statis (dibangun sekali saat overlay
      // dibuka/di-refresh) dan TIDAK ikut ter-update kalau user mengedit
      // kotak skrip (textarea) di kartu Video ini. Di builder utama, tiap
      // ketikan di textarea otomatis menulis ulang <pre>-nya (vbBulkUpdateJson
      // via oninput) — tapi listener oninput itu SENGAJA dilepas saat halaman
      // disimpan ke Riwayat (lihat _pbCollectResult) supaya tidak nyangkut ke
      // state builder asli yang sudah tidak ada. Akibatnya: user edit skrip
      // di overlay, klik Salin, yang tersalin skrip yang LAMA (sebelum
      // diedit) — kelihatan kayak "gak kesalin". Sekarang, kalau kartu ini
      // punya textarea skrip (khusus kartu Video — kartu Foto tidak
      // editable/tidak punya textarea), ambil nilai TERKINI dari textarea
      // itu dan sisipkan ke teks JSON persis di bagian script:"..." SAAT
      // tombol diklik — bukan dari <pre> yang beku.
      let liveTxt=txt;
      let ta=card.querySelector('textarea');
      if(pre.dataset && pre.dataset.pbLive==='1'){
        // Kartu hidup (lihat _pbEnhanceVideoContent): <pre> selalu dibangun
        // ulang dari state terkini (skrip + Tampilan + Lokasi + dst).
        liveTxt=pre.textContent||txt;
      } else if(ta){
        // CATATAN (audit tambahan): pakai fungsi sebagai argumen ke-2
        // replace(), BUKAN string langsung — kalau skrip user kebetulan
        // mengandung karakter "$" (mis. "$1", "$&", harga dalam dolar),
        // String.replace() dengan argumen STRING akan menganggap itu pola
        // spesial ($&, $$, $1, dst) dan bisa merusak hasil salinnya. Dengan
        // fungsi, nilainya selalu disisipkan APA ADANYA.
        // FIX (Sept 2026): ikut aturan builder — kutip ganda di dalam script
        // jadi kutip tunggal. Pola penutup dibatasi ke kutip yang diikuti akhir
        // teks / kalimat tambahan (overlay Hook / larangan icon CTA), supaya
        // teks lama yang sempat tersimpan dengan kutip di dalam script tidak
        // terpotong di kutip pertama & terduplikasi.
        let _safeTa=String(ta.value).replace(/"/g,"'");
        let _scriptRe=/(script:\s*")[\s\S]*?"(?=$| visual_hook:| camera_movement:| ambient:|\. (?:A very small text overlay|Make sure no icon|Several aesthetic text overlays|Muncul beberapa tulisan estetik|Muncul tulisan|Pastikan tidak ada icon))/;
        if(!_scriptRe.test(txt))_scriptRe=/(script:\s*")[\s\S]*?"/;
        liveTxt=txt.replace(_scriptRe,function(m,pre){return pre+_safeTa+'"';});
      }
      _copyTextRobust(liveTxt,function(){
        _pcw._flash();
        // FIX (audit susulan #3): di halaman Foto asli, Salin per-kartu juga
        // memunculkan notice "Urutan Foto Tidak Boleh Terbalik" berisi daftar
        // foto yang perlu diupload (fShowUploadNotice) — sebelumnya di
        // Riwayat notice ini tidak pernah muncul sama sekali karena
        // referensi foto ASLI (File-nya) sudah tidak ada lagi begitu entri
        // dibuka lagi besoknya. Sekarang dipakai daftar TEKS yang sudah
        // dihitung & dititip di kartu saat prompt di-generate (lihat
        // data-upload-notice di fRenderMultiOutput/_fComputeUploadNoticeStr)
        // — kartu Video tidak punya atribut ini jadi otomatis dilewati.
        let notice=head.getAttribute('data-upload-notice');
        if(notice && typeof fShowUploadNotice==='function'){
          _fUploadNoticeList=notice;
          fShowUploadNotice();
        }
      },function(){showToast('Gagal salin — coba tap & tahan teksnya lalu Copy','error');});
    };
    head.appendChild(_pcw);
  });
}

// ════════════════════════════════════════════════════════════════════
// FITUR BARU (permintaan user): "Lihat Ringkasan" — jawaban atas pertanyaan
// "kalau buka Foto dari Riwayat, bisa edit ringkasan atau atur variasi?"
// (jawabannya dulu TIDAK BISA sama sekali, ini bagian pertama yang dibangun
// buat mengatasinya). Bagian ini murni BACA SAJA: menampilkan pilihan wizard
// (Subjek/Foto Ref/Produk/Pose/Lokasi/Cahaya/Angle/Mood) yang dipakai saat
// entri Foto ini pertama kali dibuat. Mengedit pilihan itu SENDIRI tetap
// harus lewat wizard Foto yang aktif — bukan lingkup fitur ini (lihat
// _pbEnhanceFotoVariations di bawah untuk bagian yang BISA mengubah hasil
// tanpa keluar dari Riwayat).
//
// Dibangun dengan MEMAKAI ULANG fRenderSummary() yang sudah ada & teruji di
// halaman Foto asli (elemen #summary-rows dkk selalu ada di DOM meski
// sedang tersembunyi di balik overlay Riwayat) — bukan menulis ulang logika
// label dari nol. FS (state wizard) sudah dipulihkan ke pilihan ENTRI INI
// sejak pbOpenSavedPage (lihat Object.assign(FS,...)), jadi hasil render
// summary-nya otomatis mencerminkan entri yang sedang dibuka. Tombol "Edit"
// bawaan fRenderSummary dibuang di klonnya karena target Edit itu (kartu
// step 1-9) hidup di halaman builder asli yang tertutup overlay ini.
function _pbBuildFotoSummarySnapshot(){
  if(typeof fRenderSummary!=='function')return null;
  try{ fRenderSummary(); }catch(e){return null;}
  let rows=document.getElementById('summary-rows');
  if(!rows||!rows.innerHTML.trim())return null;
  let clone=rows.cloneNode(true);
  clone.querySelectorAll('button,.summary-edit').forEach(function(n){n.remove();});
  clone.querySelectorAll('[onclick]').forEach(function(n){n.removeAttribute('onclick');});
  return clone.innerHTML;
}
function _pbEnhanceFotoSummary(head,sec,content){
  let sumBtn=document.createElement('button');
  sumBtn.type='button';sumBtn.className='copy-btn';sumBtn.style.cssText='margin-left:8px;';
  sumBtn.textContent='Lihat Ringkasan';
  let panel=document.createElement('div');
  panel.className='hidden';
  panel.style.cssText='margin:0 0 10px;padding:10px 12px;background:var(--surface2);border:1px solid var(--border-hi);border-radius:var(--radius-xs);font-size:var(--fs-xs2);';
  sumBtn.onclick=function(){
    if(panel.classList.contains('hidden')){
      let html=_pbBuildFotoSummarySnapshot();
      if(!html){showToast('Ringkasan tidak tersedia untuk entri ini (mungkin tersimpan sebelum fitur ini ada).','error');return;}
      panel.innerHTML=html;
      panel.classList.remove('hidden');
      sumBtn.textContent='Sembunyikan Ringkasan';
    } else {
      panel.classList.add('hidden');
      sumBtn.textContent='Lihat Ringkasan';
    }
  };
  head.appendChild(sumBtn);
  sec.appendChild(panel);
}

// Daftar fungsi "flush" autosave (satu per section foto/video yang sedang
// terbuka di overlay Riwayat) — diisi ulang tiap pbShowSavedOverlay
// dipanggil, dipakai pbCloseSavedOverlay() untuk memaksa simpan edit
// terakhir yang masih "mengantre" di debounce sebelum overlay ditutup.
let _pbSavedOverlayPendingFlushes=[];

// FIX (audit refresh): autosave 600ms di overlay Riwayat sebelumnya CUMA
// di-flush saat overlay ditutup lewat pbCloseSavedOverlay — kalau user
// refresh, pindah app, atau app masuk background dalam <600ms setelah
// mengetik (overlay masih terbuka), ketikan terakhir itu hilang karena
// debounce belum sempat jalan. Sekarang ikut di-flush di pagehide &
// visibilitychange juga (pola sama seperti flush draft wizard), TANPA
// menutup/mengosongkan overlay-nya di sini — beda dari pbCloseSavedOverlay,
// supaya kalau app cuma pindah background sebentar lalu balik lagi,
// autosave berikutnya masih tetap jalan normal seperti biasa.
document.addEventListener('visibilitychange', function(){
  if(document.hidden) _pbSavedOverlayPendingFlushes.forEach(function(fn){fn();});
});
window.addEventListener('pagehide', function(){
  _pbSavedOverlayPendingFlushes.forEach(function(fn){fn();});
});

function pbCloseSavedOverlay(){
  // BUG FIX (laporan user): edit terakhir di kotak skrip/teks bisa hilang
  // kalau user mengetik lalu langsung klik × (atau tap backdrop / Esc)
  // dalam waktu <600ms — autosave-nya di-debounce, jadi belum sempat
  // ditulis ke localStorage saat overlay ini disembunyikan. Flush semua
  // yang masih pending DULU sebelum overlay ditutup, supaya kalau entri
  // ini dibuka lagi, isinya sudah pasti versi terakhir yang diketik.
  _pbSavedOverlayPendingFlushes.forEach(function(fn){fn();});
  _pbSavedOverlayPendingFlushes=[];
  let overlay=document.getElementById('pb-saved-overlay');
  if(overlay){overlay.classList.remove('show');overlay.setAttribute('aria-hidden','true');}
  // FIX BUG (laporan user): dulu menutup overlay lewat × / backdrop / Esc
  // HANYA menyembunyikan jendelanya secara visual — PB_ACTIVE_SAVED_ID (kunci
  // "sedang melanjutkan entri ini") tetap menyala, jadi chip "Lanjut Riwayat ×"
  // di halaman Foto/Video tetap nongol terus walau user merasa sudah "menutup"
  // Riwayat-nya. Satu-satunya cara melepas kunci itu sebelumnya adalah tap ×
  // di chip itu sendiri, atau hapus entrinya — user tidak menyangka overlay
  // dan kunci ini adalah dua hal yang berbeda. Sekarang menutup overlay lewat
  // jalur apapun (× / backdrop / Esc) SEKALIGUS melepas kuncinya, supaya
  // "tutup" berarti benar-benar tutup dari sudut pandang user.
  if(PB_ACTIVE_SAVED_ID!==null){
    PB_ACTIVE_SAVED_ID=null;
    // FIX BUG: kembalikan FS/VB ke sebelum Riwayat dibuka (lihat
    // _pbMaybeRestoreOnClose & _pbPreOpenSnapshot) — supaya prompt baru
    // yang dibuat sesudah ini tidak kecampur data entri Riwayat yang tadi
    // sempat dibuka.
    _pbMaybeRestoreOnClose();
    pbRemoveSavedBanners();
    pbSavedRender();
  }
}

// ════════════════════════════════════════════════════════════════════
// FIX BESAR (laporan user, Sept 2026): Riwayat entri Video mode RAW ASSET —
// (1) tombol "Tampilan" & "Lokasi" per kartu HILANG, (2) mengedit tidak ada
// efeknya. Akar masalahnya sama: _pbCollectResult membuang SEMUA <button> +
// atribut onclick/oninput supaya HTML beku aman disimpan. Akibatnya tombol
// Tampilan/Lokasi (dan "Atur Detail" Teks Overlay Hook, chip Jumlah Foto
// Produk) lenyap atau jadi chip mati, panelnya tetap tersembunyi, dan <pre>
// JSON di tiap kartu tidak pernah ikut berubah saat skrip diedit (listener
// oninput-nya sudah dilepas) — jadi kelihatan "gak ngefek".
//
// Solusi: HTML beku cuma dipakai untuk kerangka kartu + isi textarea. Semua
// kontrolnya DIBANGUN ULANG di sini dari STATE yang sudah tersimpan
// (VB_CARD_TAMPIL / VB_CARD_LOKASI / VB_PRODUCT_FOTOCOUNT / VB_HOOK_OVERLAY,
// yang sudah dipulihkan pbOpenSavedPage lewat _vbUnpackState). Sengaja TIDAK
// memakai vbPickTampilProduk/vbPickLokasiCard/vbBulkUpdateJson asli, karena
// fungsi-fungsi itu mencari elemen lewat id — dan id yang sama mungkin masih
// dipakai builder Video asli di balik overlay. Versi di bawah bekerja
// langsung pada elemen kartu di overlay (tanpa id sama sekali).
// ════════════════════════════════════════════════════════════════════
function _pbVideoStateOf(item){
  return (item.videoState!=null)?item.videoState:(item.type==='video'?item.state:null);
}
// Hanya aktif kalau entri punya state video versi paket (ada key VB) —
// entri sangat lama tanpa itu tetap pakai jalur lama (tanpa kontrol hidup)
// supaya teks yang sudah tersimpan tidak berubah sendiri.
function _pbCanRebuildVideo(item){
  try{
    let st=_pbVideoStateOf(item);
    if(st==null)return false;
    let o=JSON.parse(st||'{}');
    return !!(o&&o.VB&&typeof VB!=='undefined');
  }catch(e){return false;}
}
// Bangun ulang <pre> (teks siap salin) + penghitung kata sebuah kartu dari
// state terkini. fromScript=true kalau dipicu ketikan di textarea skrip.
function _pbRefreshVideoCard(c,fromScript){
  let idx=c.idx;
  let it=(typeof VB_BULK_ITEMS!=='undefined')?VB_BULK_ITEMS[idx]:null;
  if(it)it.script=c.ta.value;
  let produk=it?(it.produk||''):'';
  c.pre.textContent=_vbBuildFlowText(c.ta.value,produk,_vbTampilText(idx),_vbLokasiText(idx),_vbFotoCountVal(idx),idx);
  if(fromScript){
    let wc=c.pre.previousElementSibling;
    if(wc && !wc.querySelector('textarea')){
      let range=vbGetWordRange();
      let n=c.ta.value.split(/\s+/).filter(Boolean).length;
      wc.textContent=n+'/'+range.min+'-'+range.max+' kata';
      wc.style.color=(n>=range.min&&n<=range.max)?'var(--green)':'var(--muted2)';
    }
  }
}
function _pbMkHeadBtn(html){
  let b=document.createElement('button');
  b.type='button';b.className='copy-btn';
  b.style.cssText='font-size:var(--fs-2xs);padding:3px 8px;flex-shrink:1;max-width:100%;text-align:left;';
  b.innerHTML=html;
  return b;
}
function _pbMkChip(text,selected,muted){
  let chip=document.createElement('div');
  chip.className='chip'+(selected?' sel':'');
  chip.style.cssText='font-size:var(--fs-2xs);padding:6px 10px;'+(muted?'color:var(--muted);':'');
  chip.textContent=text;
  return chip;
}
const _PB_PANEL_CSS='display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;padding:8px;background:var(--surface);border:1px solid var(--border-hi);border-radius:var(--radius-xs);';
const _PB_CAM_ICON='<svg class="icon" style="width:12px;height:12px;"><use href="#ic-camera"></use></svg> ';

function _pbEnhanceVideoContent(content){
  if(typeof VB==='undefined')return;
  // Beritahu handler autosave (listener 'input' di content) ada perubahan.
  function notify(){content.dispatchEvent(new Event('input',{bubbles:true}));}

  // 1) Kenali kartu skrip: <pre> di dalam body kartu yang punya <textarea>.
  //    idx = urutan kemunculan (Hook/Story/CTA per produk, berurutan —
  //    sama dengan idx aslinya di VB_BULK_ITEMS).
  let cards=[];
  content.querySelectorAll('pre').forEach(function(pre){
    let body=pre.parentElement, card=body?body.parentElement:null;
    if(!body||!card)return;
    let ta=body.querySelector('textarea');
    let head=card.firstElementChild;
    if(!ta||!head||head===body)return;
    cards.push({idx:cards.length,card:card,body:body,ta:ta,pre:pre,head:head});
  });
  if(!cards.length)return;

  // 2) Buang sisa kontrol BEKU (panel Tampilan/Lokasi tersembunyi, baris
  //    Jumlah Foto & Teks Overlay yang chip/tombolnya sudah mati).
  cards.forEach(function(c){
    Array.from(c.body.children).forEach(function(ch){
      if(ch.querySelector && ch.querySelector('.chip'))ch.remove();
    });
  });
  let parents=[];
  cards.forEach(function(c){if(parents.indexOf(c.card.parentElement)<0)parents.push(c.card.parentElement);});
  parents.forEach(function(par){
    Array.from(par.children).forEach(function(el){
      if(el.querySelector('textarea'))return; // jangan sentuh kartu skrip / pembungkus
      let t=el.textContent||'';
      if((t.indexOf('Jumlah Foto Produk')>=0 && el.querySelector('.chip')) ||
         (t.indexOf('tulisan kecil di Hook')>=0 && el.querySelector('label'))){
        el.remove();
      }
    });
  });

  let isKp=(VB.refMode==='kp');

  // 3) Kartu: <pre> hidup + editor skrip yang memperbarui <pre>.
  cards.forEach(function(c){
    c.pre.dataset.pbLive='1';
    c.ta.addEventListener('input',function(){_pbRefreshVideoCard(c,true);});
  });

  // 4) Tombol Tampilan & Lokasi per kartu (khusus Raw Asset / Mode 3).
  if(isKp){
    cards.forEach(function(c){
      let idx=c.idx;
      let right=document.createElement('div');
      right.setAttribute('data-pb-ui','1');
      right.style.cssText='display:flex;align-items:center;gap:5px;margin-left:auto;flex-wrap:wrap;justify-content:flex-end;min-width:0;max-width:100%;';
      c.head.style.flexWrap='wrap'; // FIX: header snapshot lama tidak wrap -> Salin bisa terpotong
      let salin=c.head.querySelector('.pb-percard-copy');

      let tampilBtn=_pbMkHeadBtn(_PB_CAM_ICON+(VB_CARD_TAMPIL[idx]?VB_CARD_TAMPIL[idx].label:'Tampilan'));
      let lokasiBtn=_pbMkHeadBtn(VB_CARD_LOKASI[idx]?VB_CARD_LOKASI[idx].label:'Lokasi');
      right.appendChild(tampilBtn);
      right.appendChild(lokasiBtn);
      if(salin){salin.style.marginLeft='0';right.appendChild(salin);}
      c.head.appendChild(right);

      let tampilPanel=document.createElement('div');
      tampilPanel.setAttribute('data-pb-ui','1');
      tampilPanel.className='hidden';
      tampilPanel.style.cssText=_PB_PANEL_CSS;
      let lokasiPanel=document.createElement('div');
      lokasiPanel.setAttribute('data-pb-ui','1');
      lokasiPanel.className='hidden';
      lokasiPanel.style.cssText=_PB_PANEL_CSS;
      c.body.insertBefore(lokasiPanel,c.body.firstChild);
      c.body.insertBefore(tampilPanel,c.body.firstChild);

      function fillTampil(){
        tampilPanel.innerHTML='';
        let cur=VB_CARD_TAMPIL[idx];
        VB_TAMPIL_PRODUK_OPTS.forEach(function(opt){
          let chip=_pbMkChip(opt[1],cur&&cur.key===opt[0],false);
          chip.onclick=function(){pickTampil(opt[0],opt[1],opt[2]);};
          tampilPanel.appendChild(chip);
        });
        let clr=_pbMkChip('Tidak ditentukan',!cur,true);
        clr.onclick=function(){pickTampil('','','');};
        tampilPanel.appendChild(clr);
      }
      function pickTampil(key,label,text){
        if(key)VB_CARD_TAMPIL[idx]={key:key,label:label,text:text};
        else delete VB_CARD_TAMPIL[idx];
        tampilBtn.innerHTML=_PB_CAM_ICON+(key?label:'Tampilan');
        fillTampil();
        tampilPanel.classList.add('hidden');
        _pbRefreshVideoCard(c,false);
        notify();
      }
      function fillLokasi(){
        lokasiPanel.innerHTML='';
        let cur=VB_CARD_LOKASI[idx];
        VB_LOKASI_OPTS.forEach(function(opt){
          let chip=_pbMkChip(opt[1],cur&&cur.key===opt[0],false);
          chip.onclick=function(){pickLokasi(opt[0],opt[1]);};
          lokasiPanel.appendChild(chip);
        });
        let clr=_pbMkChip('Tidak ditentukan',!cur,true);
        clr.onclick=function(){pickLokasi('','');};
        lokasiPanel.appendChild(clr);
        let row=document.createElement('div');
        row.style.cssText='display:flex;gap:6px;width:100%;margin-top:6px;';
        let inp=document.createElement('input');
        inp.className='inp';
        inp.maxLength=120;
        inp.placeholder='Isi sendiri, contoh: rooftop malam hari';
        inp.style.cssText='flex:1;font-size:var(--fs-2xs);padding:6px 8px;';
        if(cur&&cur.key==='custom')inp.value=cur.label;
        inp.addEventListener('input',function(){
          let v=inp.value.trim();
          if(v)VB_CARD_LOKASI[idx]={key:'custom',label:v,text:v};
          else delete VB_CARD_LOKASI[idx];
          lokasiBtn.textContent=v?v:'Lokasi';
          lokasiPanel.querySelectorAll('.chip').forEach(function(ch){
            ch.classList.toggle('sel',!v&&ch.textContent==='Tidak ditentukan');
          });
          _pbRefreshVideoCard(c,false);
          // event 'input' asli sudah menggelembung ke content → autosave jalan
        });
        inp.addEventListener('keydown',function(e){
          if(e.key==='Enter'){e.preventDefault();lokasiPanel.classList.add('hidden');}
        });
        row.appendChild(inp);
        lokasiPanel.appendChild(row);
      }
      function pickLokasi(key,label){
        if(key)VB_CARD_LOKASI[idx]={key:key,label:label,text:label};
        else delete VB_CARD_LOKASI[idx];
        lokasiBtn.textContent=key?label:'Lokasi';
        fillLokasi();
        lokasiPanel.classList.add('hidden');
        _pbRefreshVideoCard(c,false);
        notify();
      }
      fillTampil();
      fillLokasi();
      tampilBtn.onclick=function(){
        let willOpen=tampilPanel.classList.contains('hidden');
        if(willOpen){lokasiPanel.classList.add('hidden');fillTampil();}
        tampilPanel.classList.toggle('hidden');
      };
      lokasiBtn.onclick=function(){
        let willOpen=lokasiPanel.classList.contains('hidden');
        if(willOpen){tampilPanel.classList.add('hidden');fillLokasi();}
        lokasiPanel.classList.toggle('hidden');
      };
    });
  }

  // 5) Per PRODUK (di atas kartu Hook): Teks Overlay Hook + Jumlah Foto.
  cards.forEach(function(c){
    if(c.idx%3!==0)return;
    let prodIdx=c.idx/3;
    function refreshProduct(){
      cards.forEach(function(x){
        if(Math.floor(x.idx/3)===prodIdx)_pbRefreshVideoCard(x,false);
      });
    }
    // Teks Overlay Hook (semua mode)
    let ovWrap=document.createElement('div');
    ovWrap.setAttribute('data-pb-ui','1');
    ovWrap.style.cssText='margin-bottom:8px;';
    let ovBtn=document.createElement('button');
    ovBtn.type='button';
    ovBtn.style.cssText='background:none;border:none;color:var(--accent);font-size:var(--fs-xs2);cursor:pointer;padding:0;font-weight:500;';
    let prefilled=!!(VB_HOOK_OVERLAY[prodIdx]||'').trim();
    ovBtn.textContent=prefilled?'– Sembunyikan detail':'+ Atur Detail (opsional)';
    let ovBox=document.createElement('div');
    ovBox.className=prefilled?'':'hidden';
    ovBox.style.cssText='margin-top:8px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;';
    let ovLabel=document.createElement('label');
    ovLabel.className='inplabel';
    ovLabel.style.cssText='font-size:var(--fs-2xs);';
    ovLabel.textContent='Isi (tulisan kecil di Hook)';
    let ovInp=document.createElement('input');
    ovInp.className='inp';
    ovInp.maxLength=60;
    ovInp.placeholder='Contoh: polkadot';
    ovInp.value=VB_HOOK_OVERLAY[prodIdx]||'';
    ovInp.addEventListener('input',function(){
      let v=ovInp.value.trim();
      if(v)VB_HOOK_OVERLAY[prodIdx]=v;else delete VB_HOOK_OVERLAY[prodIdx];
      if(typeof VB_BULK_PRODUCTS!=='undefined'&&VB_BULK_PRODUCTS[prodIdx])VB_BULK_PRODUCTS[prodIdx].overlay=v;
      _pbRefreshVideoCard(c,false);
    });
    ovBtn.onclick=function(){
      let opening=ovBox.classList.contains('hidden');
      ovBox.classList.toggle('hidden');
      ovBtn.textContent=opening?'– Sembunyikan detail':'+ Atur Detail (opsional)';
      if(opening)ovInp.focus();
    };
    let ovHint=document.createElement('p');
    ovHint.style.cssText='font-size:var(--fs-2xs);color:var(--muted2);margin:6px 0 0;';
    ovHint.textContent='Kalau diisi, teks ini otomatis ditambahkan ke akhir prompt Hook: muncul tulisan kecil banget di pojok kanan paling bawah layar pada detik awal (0–2 detik) lalu menghilang. Kosongkan kalau tidak perlu teks overlay.';
    ovBox.appendChild(ovLabel);ovBox.appendChild(ovInp);ovBox.appendChild(ovHint);
    ovWrap.appendChild(ovBtn);ovWrap.appendChild(ovBox);
    c.card.parentElement.insertBefore(ovWrap,c.card);

    // Jumlah Foto Produk (khusus Raw Asset)
    if(isKp){
      function buildFotoRow(){
        let wrap=document.createElement('div');
        wrap.setAttribute('data-pb-ui','1');
        wrap.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 9px;margin-bottom:6px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-xs);';
        let label=document.createElement('div');
        label.style.cssText='font-size:var(--fs-2xs);color:var(--muted);width:100%;display:flex;align-items:center;gap:5px;margin-bottom:2px;';
        label.innerHTML='<svg class="icon" style="width:13px;height:13px;color:var(--accent);flex-shrink:0;"><use href="#ic-camera"></use></svg> Jumlah Foto Produk (foto referensi 2 dst.)';
        wrap.appendChild(label);
        let cur=VB_PRODUCT_FOTOCOUNT[prodIdx]||0;
        function pick(n){
          if(n)VB_PRODUCT_FOTOCOUNT[prodIdx]=n;else delete VB_PRODUCT_FOTOCOUNT[prodIdx];
          wrap.replaceWith(buildFotoRow());
          refreshProduct();
          notify();
        }
        [1,2,3,4,5].forEach(function(n){
          let chip=_pbMkChip(String(n),cur===n,false);
          chip.style.minWidth='28px';chip.style.textAlign='center';
          chip.onclick=function(){pick(n);};
          wrap.appendChild(chip);
        });
        let clr=_pbMkChip('Ikuti foto asli',!cur,true);
        clr.onclick=function(){pick(0);};
        wrap.appendChild(clr);
        return wrap;
      }
      c.card.parentElement.insertBefore(buildFotoRow(),c.card);
    }
  });
  _pbEnhanceBulkGroups(content,cards,notify);
  _pbEnhanceSingleRevisi(content,cards,notify);
}

// ════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════
// AUDIT SUSULAN #1 — Mode 4 (Ikuti Gerakan) di Riwayat.
// Prompt mode ini hidup di elemen sendiri (#vb-mode4-prompt-text), di luar
// #vb-multi-output, jadi tidak pernah tertangkap Simpan. Di sini dibuat HTML
// sederhana (kartu + <pre>) langsung dari state.
// ════════════════════════════════════════════════════════════════════
function _pbCollectSpecialVideo(){
  if(typeof VB==='undefined')return null;
  let mode=VB.refMode;
  if(mode!=='ikuti')return null;
  let defs=[{label:'Prompt — Ikuti Gerakan Video',text:_vbMode4BuildText(),hidden:false}];
  let root=document.createElement('div');
  root.setAttribute('data-pb-special',mode);
  let texts=[];
  defs.forEach(function(d,i){
    let card=document.createElement('div');
    card.className='out-card'+(d.hidden?' hidden':'');
    if(i>0)card.style.marginTop='10px';
    let head=document.createElement('div');head.className='out-head';
    let lb=document.createElement('div');lb.className='out-label';lb.textContent=d.label;
    head.appendChild(lb);
    let body=document.createElement('div');body.className='out-body';
    let pre=document.createElement('pre');pre.style.whiteSpace='pre-wrap';pre.textContent=d.text;
    body.appendChild(pre);
    card.appendChild(head);card.appendChild(body);
    root.appendChild(card);
    if(!d.hidden)texts.push(d.text);
  });
  let tmp=document.createElement('div');
  tmp.appendChild(root);
  return {html:tmp.innerHTML,text:texts.join('\n\n---\n\n')};
}
function _pbEnhanceSpecialVideo(content){
  let root=content.querySelector('[data-pb-special]');
  if(!root)return false;
  let mode=root.getAttribute('data-pb-special');
  let cards=Array.from(root.querySelectorAll('.out-card'));
  let pres=cards.map(function(c){return c.querySelector('pre');});
  let labels=cards.map(function(c){return c.querySelector('.out-label');});
  pres.forEach(function(pr){if(pr)pr.dataset.pbLive='1';});
  return true;
}

// ════════════════════════════════════════════════════════════════════
// AUDIT SUSULAN #2 & #4 — grup produk mode Bulk di Riwayat: tombol Revisi
// dibangun ulang (versi overlay, tanpa id) + thumbnail foto dari state.
// Revisi versi overlay: 1x per produk seperti aslinya, ada "Kembalikan ke
// Versi Awal" (backup hanya selama overlay terbuka). Ganti foto referensi
// tidak disediakan di sini — foto lama dipakai apa adanya.
// ════════════════════════════════════════════════════════════════════
function _pbEnhanceBulkGroups(content,cards,notify){
  if(typeof VB_BULK_PRODUCTS==='undefined')return;
  cards.forEach(function(c){
    if(c.idx%3!==0)return;
    let prodIdx=c.idx/3;
    let bodyEl=c.card.parentElement;
    let group=bodyEl?bodyEl.parentElement:null;
    if(!bodyEl||bodyEl===content||!group||group.parentElement!==content)return;
    let meta=VB_BULK_PRODUCTS[prodIdx];
    if(!meta)return;
    let gHead=group.firstElementChild;
    if(!gHead||gHead===bodyEl)return;
    // panel Revisi beku (mati) → buang
    let nx=gHead.nextElementSibling;
    if(nx&&nx!==bodyEl&&(nx.textContent||'').indexOf('Betulkan nama/keunggulan produk')>=0)nx.remove();
    let spans=Array.from(gHead.children).filter(function(e){return e.tagName==='SPAN';});
    let nameSpan=spans.length>=2?spans[spans.length-1]:null;
    // thumbnail foto dari state (satu salinan), ganti yang beku
    if(meta.fotoBase64){
      gHead.querySelectorAll('img').forEach(function(im){
        if((im.getAttribute('src')||'').indexOf('data:')===0)im.remove();
      });
      let img=document.createElement('img');
      img.setAttribute('data-pb-ui','1');
      img.className='vbfoto-img';
      img.alt='Foto referensi produk';img.title='Foto referensi produk — tap untuk perbesar';
      img.style.cssText='width:24px;height:24px;border-radius:var(--radius-2xs);object-fit:cover;border:1px solid var(--border-hi);flex-shrink:0;';
      img.src='data:'+(meta.fotoMime||'image/jpeg')+';base64,'+meta.fotoBase64;
      gHead.insertBefore(img,nameSpan);
    }
    // tombol + panel Revisi
    let revBtn=_pbMkHeadBtn('Revisi');
    revBtn.setAttribute('data-pb-ui','1');
    gHead.appendChild(revBtn);
    let panel=document.createElement('div');
    panel.setAttribute('data-pb-ui','1');
    panel.className='hidden';
    panel.style.cssText='padding:9px;background:var(--surface2);border-bottom:1px solid var(--border-hi);display:flex;flex-direction:column;gap:6px;';
    let hint=document.createElement('div');
    hint.style.cssText='font-size:var(--fs-2xs);color:var(--muted);';
    hint.textContent='Betulkan nama/keunggulan produk dan/atau tulis apa yang mau diubah, lalu generate ulang khusus produk ini.';
    let namaInp=document.createElement('input');
    namaInp.className='inp';namaInp.maxLength=80;namaInp.placeholder='Nama produk';
    namaInp.style.cssText='font-size:var(--fs-xs2);padding:6px 8px;';
    namaInp.value=meta.nama||(nameSpan?nameSpan.textContent:'')||'';
    let keuInp=document.createElement('input');
    keuInp.className='inp';keuInp.maxLength=150;keuInp.placeholder='Keunggulan (opsional)';
    keuInp.style.cssText='font-size:var(--fs-xs2);padding:6px 8px;';
    keuInp.value=meta.keunggulan||'';
    let noteTa=document.createElement('textarea');
    noteTa.className='inp';noteTa.rows=2;
    noteTa.placeholder="Opsional: instruksi revisi, misal 'buat CTA lebih santai' atau 'ganti sudut cerita'";
    noteTa.style.cssText='font-size:var(--fs-xs2);padding:6px 8px;resize:vertical;';
    let row=document.createElement('div');
    row.style.cssText='display:flex;gap:6px;';
    let submit=document.createElement('button');
    submit.type='button';submit.className='btn sm';submit.style.flex='1';
    submit.textContent='Generate Ulang Produk Ini';
    let cancel=document.createElement('button');
    cancel.type='button';cancel.className='reset-btn';cancel.style.cssText='flex:0;padding:8px 12px;';
    cancel.textContent='Batal';
    row.appendChild(submit);row.appendChild(cancel);
    let undo=document.createElement('button');
    undo.type='button';undo.className='reset-btn hidden';undo.style.width='100%';
    undo.textContent='Kembalikan ke Versi Awal';
    panel.appendChild(hint);panel.appendChild(namaInp);panel.appendChild(keuInp);
    panel.appendChild(noteTa);panel.appendChild(row);panel.appendChild(undo);
    group.insertBefore(panel,gHead.nextSibling);
    revBtn.onclick=function(){panel.classList.toggle('hidden');};
    cancel.onclick=function(){panel.classList.add('hidden');};

    let groupCards=cards.filter(function(x){return Math.floor(x.idx/3)===prodIdx;});
    let backup=null;
    submit.onclick=async function(){
      if(backup){showToast('Produk ini sudah dipakai jatah revisinya (maks 1x). Klik "Kembalikan ke Versi Awal" dulu kalau mau revisi ulang.','error');return;}
      if(_vbGuardGenerating()){showToast('Tunggu proses sebelumnya selesai dulu.','error');return;}
      let nama=namaInp.value.trim();
      if(!nama){showToast('Nama produk wajib diisi','error');namaInp.focus();return;}
      if(!VB.bulkTargetAudience&&!(VB_BULK_PRODUCTS[prodIdx]&&VB_BULK_PRODUCTS[prodIdx].ta)){showToast('Target Audience tidak ditemukan — generate bulk dari awal dulu ya.','error');return;}
      let dl=dlCheckBeforeCall();
      if(!dl.ok){showToast(dl.message,'error');return;}
      let cur=VB_BULK_PRODUCTS[prodIdx]||{};
      let snap={
        meta:Object.assign({},cur),
        scripts:groupCards.map(function(x){return x.ta.value;}),
        produk:groupCards.map(function(x){return VB_BULK_ITEMS[x.idx]?VB_BULK_ITEMS[x.idx].produk:'';}),
        nameText:nameSpan?nameSpan.textContent:''
      };
      let keu=keuInp.value.trim();
      let originalText=submit.textContent;
      let ok=false;
      VAI._isGenerating=true;VAI._lastGenTime=Date.now();
      _vbAcquireWakeLock();
      submit.disabled=true;
      submit.textContent='Memproses...';
      try{
        _vbStartUsageSession('Revisi Produk (Bulk) — '+nama,1); // SESI BARU (permintaan user): tiap revisi 1 produk jadi baris tersendiri di panel statistik.
        let arr=await _vbCallBulkBatch([{nama:nama,keunggulan:keu,topik:cur.topik||'',hookType:cur.hookType||'',hookCustom:cur.hookCustom||'',pitch:cur.pitch||'',accent:cur.accent||'',fotoBase64:cur.fotoBase64||'',fotoMime:cur.fotoMime||''}],((VB_BULK_PRODUCTS[prodIdx]&&VB_BULK_PRODUCTS[prodIdx].ta)||VB.bulkTargetAudience),noteTa.value.trim(),function(waitMs,attempt,status){
          submit.textContent=status==='thinking'?'🤔 '+_vbWaitReasonLabel(status)+'...':'⏳ '+_vbWaitReasonLabel(status)+' (~'+Math.ceil(waitMs/1000)+'dtk)...';
        },undefined,_vbOtherHooks(prodIdx),false,undefined,true); // param terakhir = fixShort: AI memperpendek bagian yang kelebihan kata (bukan dipotong kode); potong lokal hanya cadangan terakhir (permintaan user, 12 Okt 2026)
        dlIncrement();
        if(!arr||!arr[0])throw new Error('Hasil belum berhasil dibuat, coba lagi.');
        let r=arr[0];
        if(!r.produk)r.produk=nama;
        ['hook','story','cta'].forEach(function(role,k){
          let cc=groupCards.find(function(x){return x.idx===prodIdx*3+k;});
          if(!cc)return;
          let txt=_vbTruncate25Words(r[role]||'');
          cc.ta.value=txt;
          if(VB_BULK_ITEMS[cc.idx]){VB_BULK_ITEMS[cc.idx].script=txt;VB_BULK_ITEMS[cc.idx].produk=r.produk;}
          _pbRefreshVideoCard(cc,true);
        });
        VB_BULK_PRODUCTS[prodIdx]=Object.assign({},cur,{nama:nama,keunggulan:keu,overlay:(VB_HOOK_OVERLAY[prodIdx]||cur.overlay||'')});
        if(nameSpan)nameSpan.textContent=r.produk;
        backup=snap;
        undo.classList.remove('hidden');
        panel.classList.add('hidden');
        ok=true;
        notify();
        showToast('Produk berhasil direvisi! (jatah revisi produk ini sudah kepakai — klik "Kembalikan ke Versi Awal" kalau mau ulang)','success');
      }catch(err){
        console.error('revisi (Riwayat) error:',err);
        showToast('Gagal revisi: '+(err&&err.message?err.message:'error tidak diketahui'),'error');
      }finally{
        VAI._isGenerating=false;
        _vbReleaseWakeLock();
        if(ok){submit.disabled=true;submit.textContent='Sudah direvisi 1x — undo dulu utk revisi lagi';}
        else{submit.disabled=false;submit.textContent=originalText;}
      }
    };
    undo.onclick=function(){
      if(!backup)return;
      groupCards.forEach(function(cc,k){
        cc.ta.value=backup.scripts[k]||'';
        if(VB_BULK_ITEMS[cc.idx]){VB_BULK_ITEMS[cc.idx].script=cc.ta.value;VB_BULK_ITEMS[cc.idx].produk=backup.produk[k]||VB_BULK_ITEMS[cc.idx].produk;}
        _pbRefreshVideoCard(cc,true);
      });
      // overlay Hook tetap nilai TERKINI (sama seperti versi asli)
      VB_BULK_PRODUCTS[prodIdx]=Object.assign({},backup.meta,{overlay:(VB_HOOK_OVERLAY[prodIdx]||'')});
      namaInp.value=backup.meta.nama||'';
      keuInp.value=backup.meta.keunggulan||'';
      if(nameSpan)nameSpan.textContent=backup.nameText;
      backup=null;
      submit.disabled=false;submit.textContent='Generate Ulang Produk Ini';
      undo.classList.add('hidden');
      notify();
      showToast('Produk dikembalikan ke versi sebelum revisi.','success');
    };
  });
}

// ════════════════════════════════════════════════════════════════════
// AUDIT SUSULAN #2b — mode SINGLE (1 produk, AI maupun Manual) di Riwayat:
// sama seperti Bulk, fitur "Revisi Script dengan AI" (vbRevisiSingleAI) +
// thumbnail foto acuan ikut lenyap/beku saat entri dibuka dari Riwayat —
// akar masalahnya identik (_pbCollectResult membuang semua <button> +
// atribut onclick, dan foto base64-nya dibuang biar tidak dobel tersimpan).
// Dibangun ulang di sini dari state (VB.produkFotoBase64, VB_BULK_ITEMS —
// mode single juga memakai VB_BULK_ITEMS[0..2] persis seperti Bulk, lihat
// _vbRenderMultiOutput/_vbAnimateProductCards). Beda dari versi Bulk: Target
// Audience TIDAK pernah tersimpan ke state sama sekali (mode single membaca
// langsung dari field builder #vb-target-audience yang hidup, bukan dari
// VB) — jadi di sini user harus isi ulang sendiri saat mau revisi lewat
// Riwayat. Ganti foto referensi juga sengaja tidak disediakan di sini, sama
// seperti keputusan di versi Bulk (_pbEnhanceBulkGroups) — foto lama dipakai
// apa adanya.
//
// Penanda "ini mode single, bukan Bulk/Manual banyak-produk": kartu skrip
// nempel LANGSUNG ke `content` (tanpa wrapper "grup" seperti Bulk/Manual
// banyak-produk) — lihat _vbRenderMultiOutput vs _vbRenderBulkOutput/
// vbManualRenderGroups. _pbEnhanceBulkGroups sendiri sudah no-op otomatis
// untuk kasus ini (bodyEl===content), jadi aman dipanggil berdampingan.
// ════════════════════════════════════════════════════════════════════
function _pbEnhanceSingleRevisi(content,cards,notify){
  if(cards.length!==3||cards[0].card.parentElement!==content)return;
  // Buang sisa elemen BEKU bawaan clone (baris foto acuan tanpa gambar,
  // panel Revisi mati) — dibangun ulang lengkap di bawah. Kartu skrip (ada
  // <pre>) sengaja dilewati supaya tidak ikut kebuang.
  Array.from(content.children).forEach(function(el){
    if(el.querySelector && el.querySelector('pre'))return;
    let t=el.textContent||'';
    if(t.indexOf('Foto referensi produk')>=0 || t.indexOf('Kasih tau AI apa yang mau diubah dari ketiga script')>=0 || t.indexOf('Tulis apa yang mau diubah dari ketiga script')>=0)el.remove();
  });
  // Thumbnail foto acuan dari state — taruh paling atas, samakan posisi
  // dengan versi asli (_vbRenderMultiOutput menaruhnya sebelum baris
  // lain-lain & kartu).
  if(typeof VB!=='undefined' && VB.produkFotoBase64){
    let fotoRow=document.createElement('div');
    fotoRow.setAttribute('data-pb-ui','1');
    fotoRow.style.cssText='display:flex;align-items:center;gap:7px;padding:2px 2px 2px 4px;';
    let img=document.createElement('img');
    img.className='vbfoto-img';img.alt='Foto referensi produk';img.title='Foto referensi produk';
    img.style.cssText='width:28px;height:28px;border-radius:var(--radius-2xs);object-fit:cover;border:1px solid var(--border-hi);flex-shrink:0;';
    img.src='data:'+(VB.produkFotoMime||'image/jpeg')+';base64,'+VB.produkFotoBase64;
    let lb=document.createElement('span');lb.style.cssText='font-size:var(--fs-2xs);color:var(--muted);';lb.textContent='Foto referensi produk';
    fotoRow.appendChild(img);fotoRow.appendChild(lb);
    content.insertBefore(fotoRow,content.firstElementChild);
  }
  // Tombol + panel "Revisi Script dengan AI" (versi overlay: tanpa id, 1x
  // jatah revisi seperti aslinya, ada "Kembali ke Versi Sebelumnya").
  let row=document.createElement('div');
  row.setAttribute('data-pb-ui','1');
  row.style.cssText='display:flex;gap:6px;';
  let revBtn=document.createElement('button');
  revBtn.type='button';revBtn.className='copy-btn';
  revBtn.style.cssText='font-size:var(--fs-xs2);padding:8px 10px;flex:1;text-align:center;';
  revBtn.textContent='Revisi Script';
  let undoBtn=document.createElement('button');
  undoBtn.type='button';undoBtn.className='reset-btn hidden';
  undoBtn.style.cssText='font-size:var(--fs-xs2);padding:8px 10px;flex:1;text-align:center;';
  undoBtn.textContent='Kembali ke Versi Sebelumnya';
  row.appendChild(revBtn);row.appendChild(undoBtn);
  content.appendChild(row);

  let panel=document.createElement('div');
  panel.setAttribute('data-pb-ui','1');
  panel.className='hidden';
  panel.style.cssText='padding:9px;background:var(--surface2);border:1px solid var(--border-hi);border-radius:var(--radius-xs);display:flex;flex-direction:column;gap:6px;';
  let hint=document.createElement('div');
  hint.style.cssText='font-size:var(--fs-2xs);color:var(--muted);';
  hint.textContent='Tulis apa yang mau diubah dari ketiga script di atas (Hook/Story/CTA sekaligus direvisi bareng). Foto lama dipakai apa adanya.';
  let noteTa=document.createElement('textarea');
  noteTa.className='inp';noteTa.rows=2;
  noteTa.placeholder="Contoh: variasikan lagi, atau buat lebih santai kayak lagi ngobrol ke teman, atau lebih heboh";
  noteTa.style.cssText='font-size:var(--fs-xs2);padding:6px 8px;resize:vertical;';
  let keuInp=document.createElement('input');
  keuInp.className='inp';keuInp.maxLength=150;keuInp.placeholder='Keunggulan produk (opsional)';
  keuInp.style.cssText='font-size:var(--fs-xs2);padding:6px 8px;';
  let targetInp=document.createElement('input');
  targetInp.className='inp';targetInp.maxLength=120;targetInp.placeholder='Target audience *wajib';
  targetInp.style.cssText='font-size:var(--fs-xs2);padding:6px 8px;';
  let btnRow=document.createElement('div');
  btnRow.style.cssText='display:flex;gap:8px;';
  let submit=document.createElement('button');
  submit.type='button';submit.className='btn sm';submit.style.flex='1';
  submit.textContent='Revisi Sekarang';
  let cancel=document.createElement('button');
  cancel.type='button';cancel.className='reset-btn sm';cancel.style.flex='1';
  cancel.textContent='Batal';
  btnRow.appendChild(submit);btnRow.appendChild(cancel);
  panel.appendChild(hint);panel.appendChild(noteTa);panel.appendChild(keuInp);panel.appendChild(targetInp);panel.appendChild(btnRow);
  content.appendChild(panel);
  revBtn.onclick=function(){panel.classList.toggle('hidden');};
  cancel.onclick=function(){panel.classList.add('hidden');};

  let backup=null;
  submit.onclick=async function(){
    if(backup){showToast('Sudah dipakai jatah revisinya (maks 1x). Klik "Kembali ke Versi Sebelumnya" dulu kalau mau revisi ulang.','error');return;}
    if(_vbGuardGenerating()){showToast('Tunggu proses sebelumnya selesai dulu.','error');return;}
    let note=noteTa.value.trim();
    if(!note){showToast('Tulis dulu masukan revisinya, misal "lebih santai kayak ngomong ke teman" atau "lebih heboh"','error');noteTa.focus();return;}
    let produkNama=(VB_BULK_ITEMS[0]&&VB_BULK_ITEMS[0].produk)||'';
    if(!produkNama){showToast('Nama produk tidak ditemukan — generate script dari awal dulu ya.','error');return;}
    let target=targetInp.value.trim();
    if(!target){showToast('Isi dulu Target Audience di panel revisi ini ya','error');targetInp.focus();return;}
    let dl=dlCheckBeforeCall();
    if(!dl.ok){showToast(dl.message,'error');return;}
    let snap={scripts:cards.map(function(c){return c.ta.value;}),produk:produkNama};
    let originalText=submit.textContent;
    let ok=false;
    VAI._isGenerating=true;VAI._lastGenTime=Date.now();
    _vbAcquireWakeLock();
    submit.disabled=true;submit.textContent='Memproses...';
    try{
      _vbStartUsageSession('Revisi Script (Single) — '+produkNama,1); // SESI BARU (permintaan user): tiap revisi jadi baris tersendiri di panel statistik.
      let arr=await _vbCallBulkBatch([{nama:produkNama,keunggulan:keuInp.value.trim(),fotoBase64:(VB&&VB.produkFotoBase64)||'',fotoMime:(VB&&VB.produkFotoMime)||''}],target,note,function(waitMs,attempt,status){
        submit.textContent=status==='thinking'?'🤔 '+_vbWaitReasonLabel(status)+'...':'⏳ '+_vbWaitReasonLabel(status)+' (~'+Math.ceil(waitMs/1000)+'dtk)...';
      },undefined,undefined,false,undefined,true); // param terakhir = fixShort: AI memperpendek bagian yang kelebihan kata (bukan dipotong kode); potong lokal hanya cadangan terakhir (permintaan user, 12 Okt 2026)
      dlIncrement();
      if(!arr||!arr[0])throw new Error('Hasil belum berhasil dibuat, coba lagi.');
      let p=arr[0];
      if(!p.produk)p.produk=produkNama;
      ['hook','story','cta'].forEach(function(role,k){
        let cc=cards[k];
        if(!cc)return;
        let txt=_vbTruncate25Words(p[role]||'');
        cc.ta.value=txt;
        if(VB_BULK_ITEMS[cc.idx]){VB_BULK_ITEMS[cc.idx].script=txt;VB_BULK_ITEMS[cc.idx].produk=p.produk;}
        _pbRefreshVideoCard(cc,true);
      });
      backup=snap;
      undoBtn.classList.remove('hidden');
      panel.classList.add('hidden');
      ok=true;
      notify();
      showToast('Script berhasil direvisi! (jatah revisi sudah kepakai — klik "Kembali ke Versi Sebelumnya" kalau mau ulang)','success');
    }catch(err){
      console.error('revisi single (Riwayat) error:',err);
      showToast('Gagal revisi: '+(err&&err.message?err.message:'error tidak diketahui'),'error');
    }finally{
      VAI._isGenerating=false;
      _vbReleaseWakeLock();
      if(ok){submit.disabled=true;submit.textContent='Sudah direvisi 1x — undo dulu utk revisi lagi';}
      else{submit.disabled=false;submit.textContent=originalText;}
    }
  };
  undoBtn.onclick=function(){
    if(!backup)return;
    cards.forEach(function(cc,k){
      cc.ta.value=backup.scripts[k]||'';
      if(VB_BULK_ITEMS[cc.idx]){VB_BULK_ITEMS[cc.idx].script=cc.ta.value;VB_BULK_ITEMS[cc.idx].produk=backup.produk||VB_BULK_ITEMS[cc.idx].produk;}
      _pbRefreshVideoCard(cc,true);
    });
    backup=null;
    submit.disabled=false;submit.textContent='Revisi Sekarang';
    undoBtn.classList.add('hidden');
    notify();
    showToast('Dikembalikan ke versi sebelum revisi.','success');
  };
}

// Ambil teks POLOS TERKINI dari sebuah wadah hasil yang field-fieldnya
// masih hidup/editable (dipakai overlay Riwayat) — beda dari ekstraksi di
// _pbCollectResult yang membaca dari halaman builder asli, ini membaca
// dari kloningan overlay yang sudah lepas dari builder aslinya. Tombol
// "Salin" per-kartu yang KITA suntikkan sendiri (lihat
// _pbInjectPerCardCopyButtons) dibuang dulu dari klonnya — kalau tidak,
// label "Salin"/"Tersalin!" ikut nyampur ke teks hasil ekstraksi (dipakai
// juga oleh tombol "Salin Semua Teks").
function _pbExtractLiveText(el){
  let clone=el.cloneNode(true);
  let orig=el.querySelectorAll('textarea,input');
  let cl=clone.querySelectorAll('textarea,input');
  orig.forEach(function(f,i){
    let cf=cl[i];if(!cf)return;
    let val=(f.type==='checkbox'||f.type==='radio')?(f.checked?'✓':''):f.value;
    let span=document.createElement('span');
    span.textContent=val;
    cf.replaceWith(span);
  });
  clone.querySelectorAll('button').forEach(function(b){b.remove();});
  // Kontrol hidup buatan overlay (Tampilan/Lokasi/Jumlah Foto/Teks Overlay —
  // lihat _pbEnhanceVideoContent) bukan bagian dari teks hasil.
  clone.querySelectorAll('[data-pb-ui]').forEach(function(n){n.remove();});
  // Kartu/label yang sedang tersembunyi (mis. Prompt 2 Mirror Selfie saat
  // Teks Overlay kosong) tidak ikut tersalin.
  clone.querySelectorAll('.hidden').forEach(function(n){n.remove();});
  return (clone.innerText||clone.textContent||'').trim();
}

// BUG FIX (ditemukan lewat pengujian, laporan user "edit gak kesimpen"):
// <textarea>.innerHTML TIDAK PERNAH ikut berubah walau .value-nya diketik
// ulang oleh user/JS — ini keterbatasan bawaan HTML/DOM (innerHTML textarea
// cuma mencerminkan isi ASLI/default, bukan value yang sedang aktif).
// pbSavedAutosaveField() dulu langsung menyimpan contentEl.innerHTML apa
// adanya ke htmlField (fotoHtml/videoHtml) — field INI YANG DIPAKAI untuk
// merender ulang textarea saat entri dibuka lagi (lihat pbShowSavedOverlay,
// content.innerHTML=s.html). Akibatnya walau autosave "jalan" (flash
// "tersimpan" tetap muncul, textField/videoText malah SUDAH benar karena
// lewat _pbExtractLiveText yang membaca .value), begitu overlay dibuka
// ulang yang dirender selalu skrip versi LAMA — kelihatan kayak "gak
// kesimpen" padahal sebenarnya cuma field yang salah yang tidak ter-freeze.
// Fungsi ini membekukan value textarea/input TERKINI ke dalam klon-nya
// (pola sama persis dengan _pbCollectResult saat pertama kali menyimpan ke
// Riwayat) sebelum diserialisasi jadi innerHTML — dan sekalian membuang
// tombol Salin per-kartu suntikan kita sendiri (lihat catatan
// _pbExtractLiveText di atas), supaya htmlField yang tersimpan tetap
// mengikuti invarian lama: tidak pernah berisi <button>, murni markup+isi.
function _pbFreezeLiveHtml(el){
  let clone=el.cloneNode(true);
  let orig=el.querySelectorAll('textarea,input');
  let cl=clone.querySelectorAll('textarea,input');
  orig.forEach(function(f,i){
    let cf=cl[i];if(!cf)return;
    if(f.type==='checkbox'||f.type==='radio'){
      if(f.checked)cf.setAttribute('checked','checked');
      else cf.removeAttribute('checked');
      return;
    }
    if(cf.tagName==='TEXTAREA'){cf.textContent=f.value;}
    else{cf.setAttribute('value',f.value);}
  });
  clone.querySelectorAll('button').forEach(function(b){b.remove();});
  // Kontrol hidup overlay dibangun ulang dari STATE tiap Riwayat dibuka,
  // jadi tidak perlu (dan tidak boleh) ikut tersimpan sebagai HTML beku.
  clone.querySelectorAll('[data-pb-ui]').forEach(function(n){n.remove();});
  return clone.innerHTML;
}

// PERINGATAN PENYIMPANAN PENUH (audit 12 Okt 2026): autosave/penyimpanan Riwayat dulu GAGAL DIAM-DIAM kalau localStorage penuh,
// jadi user mengira editnya tersimpan. Sekarang selalu ada toast; dibatasi 1x per 8 detik karena autosave dipicu tiap ketikan (debounced).
var _pbSavedFullWarnAt=0;
function _pbSavedFullWarn(){
  var now=Date.now();
  if(now-_pbSavedFullWarnAt<8000)return;
  _pbSavedFullWarnAt=now;
  try{showToast('Perubahan TIDAK tersimpan — penyimpanan browser penuh. Hapus beberapa halaman tersimpan dulu.','error');}catch(e){}
}
// Tulis balik hasil edit user di overlay ke entri Riwayat yang sama di
// localStorage — dipanggil (debounced) tiap ada input di salah satu
// section overlay. htmlField/textField: 'fotoHtml'/'fotoText' atau
// 'videoHtml'/'videoText'.
function pbSavedAutosaveField(id,htmlField,textField,contentEl){
  let arr=pbSavedGet();
  let idx=arr.findIndex(function(x){return x.id===id;});
  if(idx<0)return;
  arr[idx][htmlField]=_pbFreezeLiveHtml(contentEl);
  arr[idx][textField]=_pbExtractLiveText(contentEl);
  // Field lama (html/text, dipakai kode lain yang belum tahu skema dual-
  // builder) disinkronkan juga kalau section ini yang jadi halaman aktif
  // entri tsb saat disimpan.
  if(arr[idx].type==='foto' && htmlField==='fotoHtml'){arr[idx].html=arr[idx].fotoHtml;arr[idx].text=arr[idx].fotoText;}
  if(arr[idx].type==='video' && htmlField==='videoHtml'){arr[idx].html=arr[idx].videoHtml;arr[idx].text=arr[idx].videoText;}
  // FIX (laporan user: Riwayat Raw Asset "edit gak ngefek"): pilihan
  // Tampilan/Lokasi, Jumlah Foto, Teks Overlay & skrip yang diedit di overlay
  // hidup di state (VB_CARD_TAMPIL dkk), bukan di HTML — jadi state-nya juga
  // harus ditulis balik, kalau tidak begitu dibuka lagi balik ke nilai lama.
  if(contentEl && contentEl._pbRebuild && htmlField==='videoHtml'){
    try{
      arr[idx].videoState=_vbPackState();
      if(arr[idx].type==='video')arr[idx].state=''; // videoState sudah jadi sumber tunggal
    }catch(e){}
  }
  try{pbSavedSetAll(arr);}catch(e){_pbSavedFullWarn();return;}
  let flash=document.getElementById('pb-saved-overlay-autosaved');
  if(flash){
    flash.classList.add('show');
    clearTimeout(flash._pbT);
    flash._pbT=setTimeout(function(){flash.classList.remove('show');},1200);
  }
}

// Jalur LAMA: pindah ke tab Foto/Video sungguhan & pulihkan builder secara
// HIDUP (bukan cuma lihat/edit teks di overlay) — dipertahankan sebagai
// utilitas cadangan, tidak lagi dipanggil dari tombol overlay (lihat
// pbContinueInOverlay di bawah, yang sekarang jadi jalur utama).
function pbContinueInBuilder(item){
  pbCloseSavedOverlay();
  pbRemoveSavedBanners();
  let navBtn=document.querySelector('.ntab[onclick*="switchPage(\''+item.type+'\'"]');
  if(navBtn)switchPage(item.type,navBtn);
  let primaryTargetId=item.type==='foto'?'f-multi-output':'vb-multi-output';
  let primaryTarget=document.getElementById(primaryTargetId);
  _pbRenderBuilderInto(item.type,primaryTarget,item.html,item.text,true);
  let otherType=item.type==='foto'?'video':'foto';
  let otherHtml=item.type==='foto'?item.videoHtml:item.fotoHtml;
  let otherText=item.type==='foto'?item.videoText:item.fotoText;
  if(otherHtml!=null){
    let otherTargetId=otherType==='foto'?'f-multi-output':'vb-multi-output';
    let otherTarget=document.getElementById(otherTargetId);
    _pbRenderBuilderInto(otherType,otherTarget,otherHtml,otherText,false);
  }
  setTimeout(function(){
    if(primaryTarget)primaryTarget.scrollIntoView({behavior:'smooth',block:'start'});
  },80);
  pbSavedRender();
  showToast('Halaman berhasil dibuka','success');
}

// FIX (permintaan user): lanjut generate TANPA keluar dari overlay. Mesin
// generate-nya (vbBulkResumeAI → _vbRunBulkGenerate) TETAP jalan seperti
// biasa di halaman Video ASLI (vb-multi-output, vb-bulk-error, dst) —
// elemen itu TIDAK dipindah/digandakan sama sekali, cuma kebetulan tidak
// kelihatan karena overlay ini menutupi seluruh layar di atasnya. Begitu
// prosesnya selesai (promise-nya resolve), hasil TERBARU diambil ulang
// lewat _pbCollectResult('video') — fungsi yang SAMA dipakai tombol Simpan
// — lalu disuntikkan ke section overlay ini & langsung disimpan permanen
// ke entri Riwayat (supaya tidak hilang walau overlay ditutup tanpa tap
// Simpan manual).
async function pbContinueInOverlay(item,content,btnEl){
  if(typeof _vbGuardGenerating==='function'?_vbGuardGenerating():(typeof VAI!=='undefined' && VAI._isGenerating)){
    showToast('Tunggu proses sebelumnya selesai dulu.','error');
    return;
  }
  let originalLabel=btnEl?btnEl.textContent:'';
  if(btnEl){btnEl.disabled=true;btnEl.textContent='Memproses di latar belakang...';}
  let statusEl=document.createElement('div');
  statusEl.style.cssText='font-size:var(--fs-xs2);color:var(--muted);padding:6px 0 2px;';
  statusEl.textContent='Sedang melanjutkan generate produk yang tersisa — halaman ini tidak perlu ditutup, tunggu sebentar...';
  content.parentNode.insertBefore(statusEl,content);
  try{
    await vbBulkResumeAI();
  }catch(e){
    showToast('Gagal melanjutkan generate: '+(e&&e.message?e.message:'error tidak diketahui'),'error');
  }
  statusEl.remove();
  // Ambil hasil TERBARU dari builder asli yang barusan diupdate mesin
  // generate di latar belakang, lalu ganti isi overlay ini + simpan
  // permanen ke entri Riwayat.
  let fresh=_pbCollectResult('video')||{html:content.innerHTML,text:''};
  content.innerHTML=fresh.html;
  _pbInjectPerCardCopyButtons(content); // pasang lagi tombol Salin per-kartu — innerHTML diganti total di atas
  if(content._pbRebuild)_pbEnhanceVideoContent(content); // dan kontrol Tampilan/Lokasi/dst
  let arr=pbSavedGet();
  let idx=arr.findIndex(function(x){return x.id===item.id;});
  if(idx>=0){
    arr[idx].videoHtml=fresh.html;
    arr[idx].videoText=fresh.text;
    arr[idx].videoState=_vbPackState();
    if(arr[idx].type==='video'){arr[idx].html=fresh.html;arr[idx].text=fresh.text;}
    try{pbSavedSetAll(arr);}catch(e){_pbSavedFullWarn();/* kuota penuh — overlay tetap tampil hasil terbaru, tapi user diberi tahu */}
  }
  let stillIncomplete=(typeof VB_BULK_LAST_CONTEXT!=='undefined' && VB_BULK_LAST_CONTEXT
     && VB_BULK_LAST_CONTEXT.produkList && VB_BULK_LAST_CONTEXT.allResults
     && VB_BULK_LAST_CONTEXT.allResults.length<VB_BULK_LAST_CONTEXT.produkList.length);
  if(btnEl){
    if(stillIncomplete){
      let remaining=VB_BULK_LAST_CONTEXT.produkList.length-VB_BULK_LAST_CONTEXT.allResults.length;
      btnEl.disabled=false;
      btnEl.textContent='Lanjutkan Generate ('+remaining+' produk lagi)';
    } else {
      btnEl.remove();
      showToast('Semua produk selesai digenerate!','success');
    }
  }
  pbSavedRender();
}

// Ikat tombol tutup/backdrop/Esc overlay Riwayat sekali saat DOM siap.
document.addEventListener('DOMContentLoaded',function(){
  let closeBtn=document.getElementById('pb-saved-overlay-close');
  let backdrop=document.getElementById('pb-saved-overlay-backdrop');
  if(closeBtn)closeBtn.onclick=pbCloseSavedOverlay;
  if(backdrop)backdrop.onclick=pbCloseSavedOverlay;
  try{ dlRenderBar(); }catch(e){} // tampilkan widget limit dari data lokal (localStorage) segera; nanti disegarkan lagi kalau ada data cloud (lihat _pullAll)
});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    let overlay=document.getElementById('pb-saved-overlay');
    if(overlay && overlay.classList.contains('show'))pbCloseSavedOverlay();
  }
});

// Render ulang SATU builder (Foto atau Video) ke dalam elemen output-nya
// setelah dibuka dari Riwayat. isPrimary=true → builder yang sedang
// ditampilkan (dapat banner lengkap dgn tombol "Tutup Riwayat"); false →
// builder yang lagi tidak dilihat (dapat banner ringkas "ikut dipulihkan").
// Untuk Video dengan bulk yang masih ada sisa (VB_BULK_LAST_CONTEXT),
// dibangun HIDUP/interaktif via _vbRenderBulkOutput (bukan HTML beku) —
// berlaku SAMA baik primer maupun sekunder, supaya tombol "Lanjutkan"
// selalu tersedia begitu user pindah ke tab itu, tidak peduli halaman mana
// yang aktif saat Simpan terakhir ditekan. Return true kalau berhasil
// dipulihkan hidup (dipakai pemanggil kalau perlu tahu).
// Gambar ulang kartu-kartu skrip bulk yang SUDAH SELESAI (dari
// VB_BULK_LAST_CONTEXT.allResults) + tombol "Lanjutkan Generate" untuk
// sisanya, tanpa mengganggu apa pun yang sudah jadi. Dipakai HANYA di 1
// tempat: _pbRenderBuilderInto di bawah, saat membuka entri Riwayat yang
// masih ada proses bulk menggantung. CATATAN (audit Sept 2026, Ringan #9):
// versi komentar sebelumnya di sini juga menyebut window.load (IIFE
// undo/redo) memanggil fungsi ini saat reload mendapati draft bulk belum
// tuntas — itu TIDAK PERNAH DIIMPLEMENTASIKAN, dan sesuai perilaku yang
// sudah direvisi jadi "hilang" (permintaan user), refresh di tengah proses
// bulk memang sengaja TIDAK memunculkan tombol "Lanjutkan" lagi. Return
// true kalau berhasil dipulihkan hidup.
function _vbRestoreLiveBulkOutput(){
  if(!(typeof VB_BULK_LAST_CONTEXT!=='undefined' && VB_BULK_LAST_CONTEXT
     && VB_BULK_LAST_CONTEXT.produkList && VB_BULK_LAST_CONTEXT.allResults
     && VB_BULK_LAST_CONTEXT.allResults.length<VB_BULK_LAST_CONTEXT.produkList.length)) return false;
  // BUG FIX: _vbRenderBulkOutput me-RESET VB_CARD_TAMPIL/VB_CARD_LOKASI/
  // VB_PRODUCT_FOTOCOUNT/VB_HOOK_OVERLAY ke objek {} BARU di awal
  // fungsinya. Kalau dibiarkan, override per-kartu yang baru saja
  // dipulihkan (lokasi custom, teks overlay Hook, dst) langsung hilang lagi
  // begitu render ini jalan. Simpan dulu REFERENSI objek lama di sini
  // (reassignment global TIDAK mengubah objek yang sudah direferensikan
  // variabel lokal ini — semantik reference JS biasa), lalu pasang balik
  // setelah render selesai.
  let keepTampil=VB_CARD_TAMPIL,keepLokasi=VB_CARD_LOKASI,keepFotoCount=VB_PRODUCT_FOTOCOUNT,keepOverlay=VB_HOOK_OVERLAY;
  try{
    _vbRenderBulkOutput(VB_BULK_LAST_CONTEXT.allResults,VB_BULK_LAST_CONTEXT.produkList,true,false);
    VB_CARD_TAMPIL=keepTampil;VB_CARD_LOKASI=keepLokasi;VB_PRODUCT_FOTOCOUNT=keepFotoCount;VB_HOOK_OVERLAY=keepOverlay;
    let errBox=document.getElementById('vb-bulk-error');
    if(errBox)_vbShowBulkResumeUI(errBox,VB_BULK_LAST_CONTEXT.produkList.length-VB_BULK_LAST_CONTEXT.allResults.length);
    _vbSyncBulkMainButton();
    return true;
  }catch(e){
    // AUDIT Okt 2026: render gagal di tengah -> kembalikan override yang sudah di-reset ke {} oleh _vbRenderBulkOutput
    VB_CARD_TAMPIL=keepTampil;VB_CARD_LOKASI=keepLokasi;VB_PRODUCT_FOTOCOUNT=keepFotoCount;VB_HOOK_OVERLAY=keepOverlay;
    return false;
  }
}
function _pbRenderBuilderInto(type,target,frozenHtml,frozenText,isPrimary){
  if(!target)return false;
  let live=(type==='video') && _vbRestoreLiveBulkOutput();
  if(!live){
    target.innerHTML='';
    if(frozenHtml){
      let contentWrap=document.createElement('div');
      contentWrap.innerHTML=frozenHtml;
      target.appendChild(contentWrap);
    }
  }
  // Banner: primer dapat versi lengkap (Salin Semua Teks + Tutup Riwayat),
  // sekunder dapat versi ringkas — dipasang di DEPAN konten (baik yang
  // baru di-render hidup maupun yang beku), jadi tidak pernah menimpanya.
  if(isPrimary){
    let banner=document.createElement('div');
    banner.id='pb-saved-banner';
    banner.style.cssText='background:var(--accent-dim-bg);border:1px solid var(--accent-dim);border-radius:var(--radius-md);padding:10px 12px;margin-bottom:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
    let span=document.createElement('span');
    span.style.cssText='font-size:var(--fs-xs2);color:var(--accent-2);flex:1;';
    span.textContent='Halaman tersimpan — dibuka dari Riwayat. Simpan berikutnya akan dibuat sebagai entri baru, halaman ini tidak ditimpa.';
    banner.appendChild(span);
    if(frozenText){
      let copyBtn=document.createElement('button');
      copyBtn.className='copy-btn';
      copyBtn.textContent='Salin Semua Teks';
      copyBtn.onclick=function(){_copyTextRobust(frozenText,function(){showToast('Semua teks tersalin!','success');},function(){showToast('Gagal salin — coba tap & tahan teksnya lalu Copy','error');});};
      banner.appendChild(copyBtn);
    }
    let closeBtn=document.createElement('button');
    closeBtn.style.cssText='background:none;border:1px solid var(--accent-dim);color:var(--accent-2);font-size:var(--fs-xs2);font-weight:500;padding:5px 12px;border-radius:var(--radius-2xs);cursor:pointer;font-family:\'Hanken Grotesk\',sans-serif;';
    closeBtn.textContent='Tutup Riwayat';
    closeBtn.onclick=function(){pbCloseActiveSavedPage();};
    banner.appendChild(closeBtn);
    target.insertBefore(banner,target.firstChild);
  } else if(live || frozenHtml){
    // Sekunder cuma dikasih banner kalau memang ada sesuatu buat dipulihkan
    // (live=true, atau frozenHtml berisi — builder yang MASIH KOSONG saat
    // disimpan, frozenHtml='', tidak perlu banner apa-apa).
    let banner=document.createElement('div');
    banner.style.cssText='background:var(--accent-dim-bg);border:1px solid var(--accent-dim);border-radius:var(--radius-md);padding:10px 12px;margin-bottom:10px;font-size:var(--fs-xs2);color:var(--accent-2);display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
    let span=document.createElement('span');
    span.style.flex='1';
    span.textContent='Ikut dipulihkan dari halaman tersimpan yang sama — progres builder ini saat itu.';
    banner.appendChild(span);
    if(frozenText){
      let copyBtn=document.createElement('button');
      copyBtn.className='copy-btn';
      copyBtn.textContent='Salin Semua Teks';
      copyBtn.onclick=function(){_copyTextRobust(frozenText,function(){showToast('Semua teks tersalin!','success');},function(){showToast('Gagal salin — coba tap & tahan teksnya lalu Copy','error');});};
      banner.appendChild(copyBtn);
    }
    target.insertBefore(banner,target.firstChild);
  }
  target.style.display='flex';
  if(type==='foto'){
    let wrap=document.getElementById('f-output-wrap');
    let jsonBlock=document.getElementById('f-json-output');
    if(wrap)wrap.style.display='block';
    if(jsonBlock)jsonBlock.style.display='none'; // isinya sudah ikut ke dalam target.innerHTML kalau ada
  }
  return live;
}


// Lepas "kunci" mode melanjutkan entri Riwayat (lihat pbOpenSavedPage).
// Setelah ini, Simpan berikutnya balik jadi bikin entri BARU seperti
// biasa. Hanya melepas kuncinya & banner-nya — isi FS/VB/tampilan yang
// sudah kepulihkan/tampil tetap dibiarkan apa adanya, biar user tidak
// kehilangan apa yang sedang dia kerjakan.
function pbCloseActiveSavedPage(){
  PB_ACTIVE_SAVED_ID=null;
  // FIX BUG (laporan user, Sept 2026): dulu di sini FS/VB SENGAJA dibiarkan
  // berisi data entri Riwayat yang tadi dibuka ("biar user tidak kehilangan
  // apa yang sedang dikerjakan") — tapi ini yang bikin prompt BARU yang
  // digenerate sesudahnya ikut kecampur data lama (mis. buka Riwayat mode
  // "Frame Asset", tutup, lalu bikin video baru mode "Raw Asset" tapi hasil
  // generate-nya ikut bawa data Frame Asset tadi). Sekarang dikembalikan ke
  // kondisi sebelum Riwayat dibuka lewat _pbMaybeRestoreOnClose() — KECUALI
  // masih ada proses "Lanjutkan Generate" bulk yang menggantung, supaya
  // fitur itu tidak ikut rusak (lihat komentar di _pbMaybeRestoreOnClose).
  _pbMaybeRestoreOnClose();
  pbRemoveSavedBanners();
  showToast('Riwayat ditutup — Simpan berikutnya akan jadi halaman baru','success');
  // Sinkronkan badge "SEDANG DIBUKA" di daftar Riwayat/mini-history —
  // tanpa ini, badge itu nempel sampai ada aksi lain (save/hapus) yang
  // kebetulan memicu render ulang.
  pbSavedRender();
}

// Render histori saat halaman Riwayat dibuka (via switchPage)
(function(){
  let origSwitch=window.switchPage;
  window.switchPage=function(id,btn){
    origSwitch(id,btn);
    if(id==='riwayat')setTimeout(pbSavedRender,50);
  };
})();

