// fitur/foto-ringkasan-dan-panel-live.js — (dulu js/25-pfa.js) dipindah dari <script id="pfa-js"> di index.html lama (baris 38699). Isi tidak diubah.
(function(){
var M={"#f4-chips": {"Berdiri": "p-stand", "Duduk": "p-sit", "Berdiri menjelaskan": "p-stand", "Duduk menjelaskan": "p-sit", "Berdiri condong ke kamera": "p-lean-stand", "Duduk condong ke kamera": "p-lean-sit", "Selfie — pegang kamera": "p-selfie", "Mirror Selfie Berdiri": "p-mirror"}, "#f7-cahaya-chips-karakter": {"Siang Cerah": "l-sun", "Hujan": "l-rain", "Mendung": "l-cloud", "Pagi Hari": "l-sunrise", "Window Light Samping": "l-window-side", "Window Light Depan": "l-window-front", "Window Light Lembut": "l-window-soft", "Golden Hour": "l-golden", "Mendung Merata": "l-overcast", "Softbox Studio": "l-softbox", "Side Light Dramatis": "l-sidelight", "Rim Light Premium": "l-rim", "Studio Rata E-Commerce": "l-flat", "Dark Moody": "l-moody", "Candlelight Hangat": "l-candle"}, "#f7-cahaya-chips": {"Siang Cerah": "l-sun", "Hujan": "l-rain", "Mendung": "l-cloud", "Pagi Hari": "l-sunrise", "Window Light Samping": "l-window-side", "Window Light Depan": "l-window-front", "Window Light Lembut": "l-window-soft", "Golden Hour": "l-golden", "Mendung Merata": "l-overcast", "Softbox Studio": "l-softbox", "Side Light Dramatis": "l-sidelight", "Rim Light Premium": "l-rim", "Studio Rata E-Commerce": "l-flat", "Dark Moody": "l-moody", "Candlelight Hangat": "l-candle"}, "#f8-normal-panel": {"Low Angle — Dramatis": "a-low", "High Angle — Soft Editorial": "a-high", "Eye Level": "a-eye", "Overhead Flat Lay": "a-top", "45° Angle": "a-45", "Front Facing": "a-front", "3/4 View — Editorial": "a-34", "Dipegang Tangan": "a-hand"}, "#f9-chips": {"Clean Minimal": "m-clean", "Soft Pastel": "m-pastel", "Vibrant Energetic": "m-vibrant", "Editorial Fashion": "m-editorial", "Natural Candid": "m-candid", "Warm Cozy": "m-cozy", "Foto HP Burik": "m-phone", "Dark Moody": "m-moody", "Luxury Premium": "m-lux"}, "#f5": {"Kamar Mewah": "loc-bed-lux", "Kamar Aesthetic": "loc-lights", "Kamar Spanyol": "loc-arch", "Ruang Tamu Mewah": "loc-sofa", "Teras Rumah Mewah": "loc-portico", "Di Dalam Mobil Mewah": "loc-wheel", "Cafe Mewah": "loc-cafe", "Backdrop Putih Bersih": "loc-bd-white", "Backdrop Abu Netral": "loc-bd-gray", "Backdrop Hitam Matte": "loc-bd-black", "Permukaan Marmer": "loc-marble", "Kain Linen Natural": "loc-linen", "Kayu Terang": "loc-wood-l", "Kayu Gelap Mewah": "loc-wood-d", "Permukaan Beton": "loc-concrete", "Flat Lay Bunga Kering": "loc-dried", "Nampan Kayu Lifestyle": "loc-tray", "Flat Lay Morning Vibes": "loc-morning", "Bedsheet Aesthetic": "loc-sheet", "Gift Box Elegan": "loc-gift", "Studio Gradient": "loc-gradient", "Pantulan Kaca": "loc-reflect"}},VB={"a-34": "0 0 64 40", "a-45": "0 0 64 40", "a-eye": "0 0 64 40", "a-front": "0 0 64 40", "a-hand": "0 0 64 40", "a-high": "0 0 64 40", "a-low": "0 0 64 40", "a-top": "0 0 64 40", "l-candle": "0 0 24 24", "l-cloud": "0 0 24 24", "l-flat": "0 0 24 24", "l-golden": "0 0 24 24", "l-moody": "0 0 24 24", "l-overcast": "0 0 24 24", "l-rain": "0 0 24 24", "l-rim": "0 0 24 24", "l-sidelight": "0 0 24 24", "l-softbox": "0 0 24 24", "l-sun": "0 0 24 24", "l-sunrise": "0 0 24 24", "l-window-front": "0 0 24 24", "l-window-side": "0 0 24 24", "l-window-soft": "0 0 24 24", "m-candid": "0 0 24 24", "m-clean": "0 0 24 24", "m-cozy": "0 0 24 24", "m-editorial": "0 0 24 24", "m-lux": "0 0 24 24", "m-moody": "0 0 24 24", "m-pastel": "0 0 24 24", "m-phone": "0 0 24 24", "m-vibrant": "0 0 24 24", "p-lean-sit": "0 0 48 48", "p-lean-stand": "0 0 48 48", "p-mirror": "0 0 48 48", "p-selfie": "0 0 48 48", "p-sit": "0 0 48 48", "p-stand": "0 0 48 48", "loc-bed-lux": "0 0 24 24", "loc-lights": "0 0 24 24", "loc-arch": "0 0 24 24", "loc-sofa": "0 0 24 24", "loc-portico": "0 0 24 24", "loc-wheel": "0 0 24 24", "loc-cafe": "0 0 24 24", "loc-bd-white": "0 0 24 24", "loc-bd-gray": "0 0 24 24", "loc-bd-black": "0 0 24 24", "loc-marble": "0 0 24 24", "loc-linen": "0 0 24 24", "loc-wood-l": "0 0 24 24", "loc-wood-d": "0 0 24 24", "loc-concrete": "0 0 24 24", "loc-dried": "0 0 24 24", "loc-tray": "0 0 24 24", "loc-morning": "0 0 24 24", "loc-sheet": "0 0 24 24", "loc-gift": "0 0 24 24", "loc-gradient": "0 0 24 24", "loc-reflect": "0 0 24 24"};
var IDS=['f0','f1','f3','f4','f5','f7','f8','f9'];
var CHECK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
function esc(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
var $=function(id){return document.getElementById(id);};

/* ── ikon pada ubin pilihan ── */
function deco(){
  Object.keys(M).forEach(function(sel){
    document.querySelectorAll(sel).forEach(function(box){
      box.querySelectorAll('.chip').forEach(function(c){
        if(c.dataset.pfa)return;c.dataset.pfa='1';
        if(c.classList.contains('pfa-lic'))return;
        var m=(c.getAttribute('onclick')||'').match(/,\s*this\s*,\s*'((?:[^'\\]|\\.)*)'/);
        var lb=(m?m[1].replace(/\\'/g,"'"):c.textContent).trim(),id=M[sel][lb];
        if(!id)return;
        var v=VB[id]||'0 0 48 48',p=v.split(' '),h=c.querySelector('.text-hint');
        if(h&&!c.title)c.title=h.textContent.trim();
        c.insertAdjacentHTML('afterbegin','<span class="pfa-ic'+(+p[2]>+p[3]?' wd':'')+'" aria-hidden="true"><svg viewBox="'+v+'"><use href="#pfa-'+id+'"/></svg></span>');
        var lc=sel==='#f5';c.classList.add(lc?'pfa-lt':'pfa-t');c.parentNode.classList.add(lc?'pfa-lg':'pfa-grid');
      });
    });
  });
}

/* ── strip langkah: dibaca dari status kartu wizard yang sudah ada ── */
function stateOf(c){
  var t=c.dataset.tl;
  if(t)return t==='cur'?'act':(t==='done'?'done':(t==='todo'?'pend':'off'));
  if(c.classList.contains('hidden')||getComputedStyle(c).display==='none')return 'off';
  return c.classList.contains('done')?'done':(c.classList.contains('pending')?'pend':'act');
}
function cards(){
  return (typeof fStepOrder==='function'?fStepOrder():IDS).map($).filter(function(c){return c&&stateOf(c)!=='off';});
}
var lastCur='',lastSum='',lastStepKey='';
function fin0(cs,doneN,total){return doneN>=total;}
function steps(){
  var cs=cards(),cur=0,curId='',doneN=0;
  cs.forEach(function(c,i){
    var st=stateOf(c);
    if(st==='act'&&!cur){cur=i+1;curId=c.id;}
    if(st==='done')doneN++;
  });
  var total=cs.length;
  if(!cur)cur=Math.min(doneN+1,total);
  var stepKey=curId+(fin0(cs,doneN,total)?'|fin':'');
  if(stepKey!==lastStepKey){lastStepKey=stepKey;recenterSoon();}
  if(curId&&curId!==lastCur){
    var fo=$('foto');
    if(lastCur&&fo&&fo.classList.contains('pfa-open')){try{fo.scrollTo({top:0,behavior:'smooth'});}catch(e){fo.scrollTop=0;}}
    lastCur=curId;
  }
  var fin=doneN>=total,ct=$('pfa-ctr');
  var h=fin?'<b>Siap</b> dibuat':'Langkah <b>'+cur+'</b> dari '+total;
  if(ct&&ct.dataset.k!==h){ct.dataset.k=h;ct.innerHTML=h;}
  sum(cs,fin&&total>0);
}
/* v11.99: ringkasan menggantikan strip langkah — tampil di posisi panel live setelah semua langkah selesai; tiap baris bisa diubah */
function sum(cs,all){
  var f=$('foto'),box=$('pfa-sum-body');
  if(f&&f.classList.contains('pfa-done')!==all){
    f.classList.toggle('pfa-done',all);
    if(all)setSumOpen(false); /* tiap kali ringkasan muncul, mulai dalam keadaan tertutup */
  }
  if(!all||!box)return;
  var rows=cs.map(function(c){
    return{id:c.id,t:((c.querySelector('.wtitle')||{}).textContent||'').trim(),a:((c.querySelector('.wanswer')||{}).textContent||'').replace(/\s+/g,' ').trim()};
  });
  /* Cara Tampil Produk selalu ikut tampil di ringkasan bila sudah terisi, walau kartunya sedang tersembunyi */
  if(typeof FS!=='undefined'&&FS.subjek!=='produk'&&(FS.hold||FS.holdKey)&&!rows.some(function(r){return r.id==='f3';})){
    var HL={dipakai:'Dipakai langsung',hanger:'Pakai hanger',tangan:((typeof fIsNoChar==='function'&&fIsNoChar())?'Dipegang tangan (POV)':'Dipegang ke kamera')};
    var hv=HL[FS.holdKey]||FS.hold||'';
    var pos=IDS.indexOf('f3'),at=rows.length;
    for(var i=0;i<rows.length;i++){if(IDS.indexOf(rows[i].id)>pos){at=i;break;}}
    rows.splice(at,0,{id:'f3',t:'Cara Tampil Produk',a:String(hv)});
  }
  var html='';
  rows.forEach(function(r){
    html+='<button type="button" class="sr" data-id="'+r.id+'"><span class="sm"><span class="st">'+esc(r.t)+'</span><span class="sa">'+esc(r.a||'—')+'</span></span><span class="sb">Ubah</span></button>';
  });
  if(html===lastSum)return;lastSum=html;box.innerHTML=html;
}
/* v12.4: di HP tinggi isi halaman dipusatkan vertikal. Supaya isi yang bertambah di tengah langkah
   (bar konfirmasi, banner, panel live/ringkasan) tumbuh ke BAWAH dan tidak mengangkat kartu, posisi
   tengahnya dihitung sekali tiap pindah langkah lalu dikunci sebagai jarak dari atas. */
var CENTER_MQ='(max-width:899px) and (min-height:700px)';
function recenter(){
  var f=$('foto'),w=f&&f.querySelector('.wrap');
  if(!w||!f.classList.contains('pfa-open'))return;
  w.style.paddingTop='';f.classList.remove('pfa-keep');
  if(!(window.matchMedia&&window.matchMedia(CENTER_MQ).matches))return;
  var kid=null;
  for(var i=0;i<w.children.length;i++){var r=w.children[i].getBoundingClientRect();if(r.height>0){kid=w.children[i];break;}}
  if(!kid)return;
  var gap=kid.getBoundingClientRect().top-w.getBoundingClientRect().top
    -(parseFloat(getComputedStyle(w).borderTopWidth)||0)-(parseFloat(getComputedStyle(kid).marginTop)||0);
  f.classList.add('pfa-keep');
  w.style.paddingTop=Math.max(0,Math.round(gap))+'px';
}
var rcT=0;
function recenterSoon(){
  if(rcT)cancelAnimationFrame(rcT);
  rcT=requestAnimationFrame(function(){rcT=requestAnimationFrame(function(){rcT=0;recenter();});});
}
window.pfaRecenter=recenter;
function anchorToggle(btn,fn){fn();}
function setSumOpen(on){
  var sm=$('pfa-sum');if(!sm)return;
  sm.classList.toggle('open',!!on);
  var t=$('pfa-sum-toggle');if(t){t.setAttribute('aria-expanded',on?'true':'false');var em=t.querySelector('em');if(em)em.textContent=on?'Ketuk baris untuk mengubah':'Ketuk untuk melihat';}
}

/* ── panel Prompt live: ringkasan pilihan dari state FS (tidak mengubah logika generate) ── */
var prev={};
function live(){
  var box=$('pfa-live-body');if(!box||typeof FS==='undefined')return;
  var sj={hijab:'perempuan',pria:'laki-laki',produk:'produk saja'};
  var rows=(FS.povProduk?[['produk',FS.produkNama||''],['lokasi',FS.lokasiLabel||''],['cara_tampil',FS.holdLabel||''],['mood',FS.moodLabel||''],['cahaya',FS.cahayaLabel||'']]:[
    ['subjek',sj[FS.subjek]||''],
    ['produk',FS.produkNama||''],
    ['cara_tampil',FS.hold||''],
    ['pose',FS.poseLabel||''],
    ['lokasi',FS.lokasiLabel||''],
    ['cahaya',FS.cahayaLabel||''],
    ['sudut_kamera',FS.angleLabel||''],
    ['mood',FS.moodLabel||'']
  ]).filter(function(r){
    if(FS.subjek==='produk'&&(r[0]==='pose'||r[0]==='cara_tampil'))return false;
    if(typeof fIsNoChar==='function'&&fIsNoChar()&&r[0]==='pose')return false;
    return r[0]!=='produk'||r[1]||FS.subjek==='produk';
  });
  var sig=JSON.stringify(rows);
  if(sig===box.dataset.sig)return;box.dataset.sig=sig;
  var out='<span class="ln nl">{</span>',cnt=0;
  rows.forEach(function(r,i){
    var v=String(r[1]);if(v)cnt++;
    var changed=prev[r[0]]!==undefined&&prev[r[0]]!==v&&v;
    prev[r[0]]=v;
    var val=v?'<span class="s">"'+esc(v.length>70?v.slice(0,69)+'…':v)+'"</span>':'<span class="nl">null</span>';
    out+='<span class="ln'+(changed?' fl':'')+'">  <span class="k">"'+r[0]+'"</span>: '+val+(i<rows.length-1?',':'')+'</span>';
  });
  out+='<span class="ln nl">}</span>';
  box.innerHTML=out;
  var n=$('pfa-live-n');if(n)n.textContent=cnt+' / '+rows.length+' terisi';
}

/* ── tampilan HP: segmen Pilih / Prompt ── */
window.pfaView=function(v){
  var f=$('foto');if(!f)return;
  if(window.matchMedia&&window.matchMedia('(max-width:899px) and (min-height:700px)').matches){
    /* v11.95: HP tinggi — kartu & panel Prompt satu layar; 'prompt' = gulir ke panel hasil */
    f.classList.remove('pfa-v-prompt');
    var rc=$('f-right-col'),bar=$('pfa-bar');
    f.scrollTop=(v==='prompt'&&rc)?Math.max(0,rc.offsetTop-(bar?bar.offsetHeight:0)-8):0;
    return;
  }
  f.classList.toggle('pfa-v-prompt',v==='prompt');
  var seg=$('pfa-seg');if(seg)seg.querySelectorAll('button').forEach(function(b){b.classList.toggle('on',b.dataset.v===v);});
  f.scrollTop=0;
};
var outShown=false;
function watchOutput(){
  var w=$('f-output-wrap'),m=$('f-multi-output');
  var on=!!((w&&w.style.display==='block')||(m&&m.style.display==='flex'&&m.children.length));
  if(on&&!outShown){
    var f=$('foto');
    if(f&&f.classList.contains('pfa-open')&&window.innerWidth<900)window.pfaView('prompt');
  }
  outShown=on;
}

/* v12.5: Bingkai hidup — bingkai kamera di langkah Subjek Foto; mengikuti kartu terpilih (sebelum & sesudah konfirmasi), label Lokasi/Cahaya/Mood ikut terisi dari FS */
var FRK={'sk-hijab':'Perempuan','sk-pria':'Laki-laki'},FRS={hijab:'sk-hijab',pria:'sk-pria'};
function frame(){
  var fr=$('f0-frame');if(!fr)return;
  var id='',hasFS=typeof FS!=='undefined';
  Object.keys(FRK).forEach(function(k){var e=$(k);if(!id&&e&&e.classList.contains('sel'))id=k;});
  if(!id&&hasFS&&FRS[FS.subjek])id=FRS[FS.subjek];
  var lo=hasFS?(FS.lokasiLabel||''):'',ca=hasFS?(FS.cahayaLabel||''):'',mo=hasFS?(FS.moodLabel||''):'';
  var sig=[id,lo,ca,mo].join('|');
  if(fr.dataset.sig===sig)return;fr.dataset.sig=sig;
  fr.classList.toggle('has',!!id);
  var src=$(id||'sk-hijab'),ic=src&&src.querySelector('.f0-ic'),sil=$('f0-sil');
  if(sil&&ic)sil.innerHTML=ic.innerHTML;
  var cap=$('f0-cap');if(cap)cap.textContent=id?FRK[id]:'Pilih subjek untuk mulai';
  var pl=$('f0-pl');
  if(pl)pl.innerHTML=[['Lokasi',lo],['Cahaya',ca],['Mood',mo]].map(function(r){
    return r[1]?'<span class="on" title="'+esc(r[1])+'">'+esc(r[1])+'</span>':'<span>'+r[0]+' \u2014</span>';
  }).join('');
}

function refresh(){steps();live();frame();watchOutput();if(window.pstSync)window.pstSync();}
var q=0;
function sched(muts){
  if(muts&&muts.length&&muts.every(function(m){var t=m.target.nodeType===1?m.target:m.target.parentNode;return t&&t.closest&&t.closest('#pfa-bar,#pfa-live,#pfa-sum,#f0-frame,#pst-w');}))return;
  if(q)return;q=requestAnimationFrame(function(){q=0;deco();refresh();});
}
window.pfaNavSync=function(){var n=document.querySelector('nav.nav');if(!n)return;var h=Math.round(n.getBoundingClientRect().height);if(h>20)document.documentElement.style.setProperty('--pfa-nav',h+'px');};
window.addEventListener('resize',function(){if(document.body.classList.contains('pfa-on'))window.pfaNavSync();});
window.pfaOpen=function(){
  var f=$('foto');if(!f)return;
  f.classList.add('pfa-open');document.body.classList.add('pfa-on');window.pfaNavSync();requestAnimationFrame(window.pfaNavSync);
  window.pfaView('pilih');f.scrollTop=0;deco();lastStepKey='';refresh();recenterSoon();
};
window.pfaClose=function(){var f=$('foto');if(f){f.classList.remove('pfa-open','pfa-v-prompt','pfa-keep');var w0=f.querySelector('.wrap');if(w0)w0.style.paddingTop='';}document.body.classList.remove('pfa-on');};

var f=$('foto');
if(f){
  if(!$('pfa-bar')){
    var b=document.createElement('div');b.id='pfa-bar';
    b.innerHTML='<div class="pfa-row"><button type="button" class="pfa-back" aria-label="Kembali" onclick="pfaClose()"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button><div class="pfa-title">Prompt Foto AI</div><div class="pfa-ctr" id="pfa-ctr"></div></div>'+
      '<div id="pfa-seg" role="tablist"><button type="button" class="on" data-v="pilih" onclick="pfaView(\'pilih\')">Pilih</button><button type="button" data-v="prompt" onclick="pfaView(\'prompt\')">Prompt</button></div>';
    f.insertBefore(b,f.firstChild);
  }
  var rc=$('f-right-col');
  /* PERMINTAAN USER (5 Nov 2026): panel "Prompt · live" dinonaktifkan — tidak dibuat lagi. */
  if(false&&rc&&!$('pfa-live')){
    var l=document.createElement('div');l.id='pfa-live';
    l.innerHTML='<button type="button" class="lh" id="pfa-live-toggle" aria-expanded="false" aria-controls="pfa-live-body"><i></i>Prompt · live<em id="pfa-live-n"></em><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><pre id="pfa-live-body"></pre>';
    l.addEventListener('click',function(e){
      var tg=e.target.closest&&e.target.closest('#pfa-live-toggle');
      if(!tg)return;
      anchorToggle(tg,function(){
        var on=!l.classList.contains('open');
        l.classList.toggle('open',on);
        tg.setAttribute('aria-expanded',on?'true':'false');
      });
    });
    rc.insertBefore(l,rc.firstChild);
  }
  if(rc&&!$('pfa-sum')){
    var sm=document.createElement('div');sm.id='pfa-sum';
    sm.innerHTML='<button type="button" class="sh" id="pfa-sum-toggle" aria-expanded="false" aria-controls="pfa-sum-body">Ringkasan<em>Ketuk untuk melihat</em><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><div id="pfa-sum-body"></div>';
    rc.insertBefore(sm,rc.firstChild);
    sm.addEventListener('click',function(e){
      var tg=e.target.closest&&e.target.closest('#pfa-sum-toggle');
      if(tg){anchorToggle(tg,function(){setSumOpen(!sm.classList.contains('open'));});return;}
      var r=e.target.closest&&e.target.closest('.sr');if(!r)return;
      var c=$(r.dataset.id),h=c&&c.querySelector('.whead');
      if(c&&c.classList.contains('hidden')&&r.dataset.id==='f3'&&typeof window.fSummaryEdit==='function'){window.fSummaryEdit(3);window.pfaView('pilih');f.scrollTop=0;return;}
      if(h){h.click();window.pfaView('pilih');f.scrollTop=0;}
    });
  }
  new MutationObserver(sched).observe(f,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
}
window.addEventListener('orientationchange',function(){setTimeout(recenterSoon,300);});
var rn=window.fResetNow;
if(typeof rn==='function'){window.fResetNow=function(){var r=rn.apply(this,arguments);try{lastCur='';lastStepKey='';window.pfaView('pilih');recenterSoon();}catch(e){}return r;};}
/* FIX (laptop/layar sempit, tab Pilih | Prompt): setelah Generate — termasuk Generate ULANG sesudah edit dari Ringkasan —
   langsung pindah ke tab Prompt. Sebelumnya pindah tab hanya terjadi saat hasil muncul PERTAMA kali (watchOutput: on && !outShown),
   jadi pada Generate ulang (hasil lama masih tampil) user harus klik tab "Prompt" manual. */
var dg=window._fDoGenerate;
if(typeof dg==='function'){window._fDoGenerate=function(){
  var r=dg.apply(this,arguments);
  try{if(f&&f.classList.contains('pfa-open')&&window.innerWidth<900)window.pfaView('prompt');}catch(e){}
  return r;
};}
var sp=window.switchPage;
if(typeof sp==='function'){window.switchPage=function(){window.pfaClose();return sp.apply(this,arguments);};}
deco();refresh();
})();
