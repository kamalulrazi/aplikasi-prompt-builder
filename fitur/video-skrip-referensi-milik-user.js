// fitur/video-skrip-referensi-milik-user.js — (dulu js/43-pb-refscript.js) dipindah dari <script id="pb-refscript-js"> di index.html lama (baris 41551). Isi tidak diubah.
// CONTOH SKRIP REFERENSI MILIK USER (permintaan user, Nov 2026).
// - Skrip disimpan lewat tombol "Simpan skrip" di kartu CTA (jalur Kami Bantu Isi maupun Tulis Manual) -> localStorage pb_user_scripts_v1 (sinkron cloud).
// - Tab Akun: pilih sumber contoh (pb_ref_source_v1 = 'builtin' | 'own'). Bawaan & milik user TERPISAH.
// - Sumber 'own': _vbRefOpts() (lihat definisinya) mengembalikan skrip user untuk durasi aktif; pengacakan memakai mesin lama (_vbPickReferenceOption / _vbDeal).
// - Aksen/nada: skrip user dipakai apa adanya (combo kosong), belum dibedakan per aksen.
(function(){
  var K='pb_user_scripts_v1',S='pb_ref_source_v1',MAX=30,_c=null,_ck='';
  var LBL={'24':'24 detik','16':'16 detik','dua':'2 suara'};
  function load(){try{var a=JSON.parse(localStorage.getItem(K)||'[]');return Array.isArray(a)?a.filter(function(x){return x&&typeof x.text==='string'&&x.text&&x.id;}):[];}catch(e){return [];}}
  function put(a){localStorage.setItem(K,JSON.stringify(a));if(typeof pbCloudQueue==='function')pbCloudQueue(K);}
  function src(){try{return localStorage.getItem(S)==='own'?'own':'builtin';}catch(e){return 'builtin';}}
  function mode(){try{return _vbIsDua()?'dua':(_vb16()?'16':'24');}catch(e){return '24';}}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function flat(t,dua){t=String(t||'').replace(/\r/g,'').trim();return dua?t.split('\n').map(function(l){return l.trim();}).filter(Boolean).join(' || '):t.replace(/\s+/g,' ');}

  // Dipakai _vbRefOpts(): contoh milik user untuk durasi aktif (null = pakai bawaan). Array di-cache supaya identitasnya stabil (bag pengacak tidak ke-reset).
  window.pbUserRefOpts=function(){
    if(src()!=='own')return null;
    var m=mode(),a=load().filter(function(x){return x.mode===m;});
    if(!a.length)return null;
    var k=m+'|'+a.map(function(x){return x.id;}).join(',');
    if(!_c||_ck!==k){_ck=k;_c=a.map(function(x,i){return {nama:'Skrip Saya '+(i+1),def:x.text,combo:{}};});}
    return _c;
  };
  window.pbUserRefActive=function(){return !!window.pbUserRefOpts();};

  window.pbSaveScriptFromCard=function(idx){
    try{
      var base=Math.floor(idx/3)*3,m=mode(),N=['hook','story','cta'],P=[];
      // Pakai durasi saat kartu dibuat (bukan durasi sekarang). Kalau durasi sudah diganti, jangan simpan label yang salah.
      var _w0=document.getElementById('vb-ta-wrap-'+(base+2)),_cm=_w0&&_w0.dataset?_w0.dataset.refMode:'';
      if(_cm&&_cm!==m){showToast('Durasi sudah diganti, kartu ini belum cocok. Buat ulang kartunya dulu (generate ulang atau pilih Isi Manual lagi)','error');return;}
      var dua=m==='dua';
      for(var j=0;j<3;j++){
        if(N[j]==='story'&&m!=='24')continue; // 16 detik & 2 suara: slot Story kosong
        var w=document.getElementById('vb-ta-wrap-'+(base+j)),ta=document.getElementById('vb-bulk-script-'+(base+j));
        if(w&&w.classList.contains('vb-ta-loading')){showToast('Tunggu skrip selesai ditulis dulu ya','info');return;}
        var v=ta?flat(ta.value,dua):'';
        if(!v){showToast(m==='24'?'Isi dulu Hook, Story, dan CTA sebelum menyimpan':'Isi dulu Hook dan CTA sebelum menyimpan','error');return;}
        P.push(N[j]+': '+v);
      }
      var text=P.join('\n'),a=load(),btn=document.getElementById('vb-save-script-'+idx);
      if(a.some(function(x){return x.mode===m&&x.text===text;})){showToast('Skrip ini sudah tersimpan','info');return;}
      if(a.filter(function(x){return x.mode===m;}).length>=MAX){showToast('Maksimal '+MAX+' skrip tersimpan untuk durasi ini. Hapus yang lama di tab Akun dulu','error');return;}
      var it=(typeof VB_BULK_ITEMS!=='undefined'&&VB_BULK_ITEMS[base])||{},nm=String(it.produk||'').trim();
      if(!nm){var mi=document.getElementById('vb-manual-nama-'+Math.floor(base/3));nm=mi?String(mi.value||'').trim():'';}
      a.push({id:'u'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),mode:m,produk:nm.slice(0,80),text:text,ts:Date.now()});
      put(a);
      if(btn){btn.textContent='Tersimpan';setTimeout(function(){btn.textContent='Simpan skrip';},1500);}
      showToast(src()==='own'?'Skrip disimpan sebagai contoh referensi':'Skrip disimpan. Pilih "Skrip Saya" di tab Akun untuk memakainya','success');
      pbRefRender();
    }catch(e){try{showToast('Skrip belum bisa disimpan, coba lagi','error');}catch(x){}}
  };

  window.pbRefSetSource=function(v){try{localStorage.setItem(S,v==='own'?'own':'builtin');if(typeof pbCloudQueue==='function')pbCloudQueue(S);}catch(e){}pbRefRender();};
  window.pbRefDel=function(id,b){
    if(b&&b.dataset.arm!=='1'){b.dataset.arm='1';b.textContent='Yakin hapus?';setTimeout(function(){b.dataset.arm='';b.textContent='Hapus';},3000);return;}
    try{put(load().filter(function(x){return x.id!==id;}));}catch(e){}
    pbRefRender();
  };
  window.pbRefRender=function(){
    var box=document.getElementById('pb-refscript-body');if(!box)return;
    var a=load().sort(function(x,y){return (y.ts||0)-(x.ts||0);}),own=src()==='own';
    var h='<div class="pb-rs-seg" role="radiogroup" aria-label="Sumber contoh skrip">'
      +'<button type="button" role="radio" aria-checked="'+(!own)+'" class="chip'+(own?'':' sel')+'" onclick="pbRefSetSource(\'builtin\')">Bawaan Aplikasi</button>'
      +'<button type="button" role="radio" aria-checked="'+own+'" class="chip'+(own?' sel':'')+'" onclick="pbRefSetSource(\'own\')">Skrip Saya ('+a.length+')</button></div>';
    h+='<div class="pb-rs-hint">'+(!own?'AI memakai contoh bawaan aplikasi, diacak tiap skrip dibuat.':(a.length?'Tiap skrip dari "Kami Bantu Isi" memakai contoh yang diacak dari skrip simpananmu, sesuai durasi yang dipilih. Durasi tanpa simpanan memakai contoh bawaan.':'Belum ada skrip tersimpan, jadi sementara dipakai contoh bawaan.'))+'</div>';
    if(!a.length)h+='<div class="pb-rs-hint" style="margin-top:8px;">Tekan "Simpan skrip" di kartu CTA pada hasil skrip untuk menyimpannya di sini.</div>';
    a.forEach(function(x){
      var plain=x.text.replace(/^(hook|story|cta):\s*/gim,'').replace(/\s*\n\s*/g,' ');
      h+='<div class="pb-rs-item"><div class="pb-rs-top"><div class="pb-rs-name">'+esc(x.produk||'Tanpa nama produk')+'</div><span class="pb-rs-tag">'+esc(LBL[x.mode]||x.mode)+'</span>'
        +'<button type="button" class="copy-btn pb-rs-del" onclick="pbRefDel(\''+esc(x.id)+'\',this)">Hapus</button></div>'
        +'<details><summary class="pb-rs-prev">'+esc(plain.length>90?plain.slice(0,90)+'…':plain)+'</summary><div class="pb-rs-full">'+esc(x.text)+'</div></details></div>';
    });
    box.innerHTML=h;
  };
  function init(){
    try{pbRefRender();}catch(e){}
    var sp=window.switchPage;
    if(typeof sp==='function'&&!sp.__pbRef){var w=function(id){var r=sp.apply(this,arguments);if(id==='panduan'){try{pbRefRender();}catch(e){}}return r;};w.__pbRef=1;window.switchPage=w;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
