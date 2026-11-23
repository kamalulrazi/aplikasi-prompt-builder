// fitur/video-skrip-referensi-milik-user.js — (dulu js/43-pb-refscript.js) dipindah dari <script id="pb-refscript-js"> di index.html lama (baris 41551). Diubah 23 Nov 2026 (lihat catatan di bawah).
// CONTOH SKRIP REFERENSI MILIK USER (permintaan user, Nov 2026).
// - Skrip disimpan lewat tombol "Simpan skrip" di kartu CTA (jalur Kami Bantu Isi maupun Tulis Manual) -> localStorage pb_user_scripts_v1 (sinkron cloud).
// - Tab Akun: pilih sumber contoh (pb_ref_source_v1 = 'builtin' | 'own'). Bawaan & milik user TERPISAH.
// - Sumber 'own': _vbRefOpts() (lihat definisinya) mengembalikan skrip user untuk durasi aktif; pengacakan memakai mesin lama (_vbPickReferenceOption / _vbDeal).
// - Aksen/nada: skrip user dipakai apa adanya (combo kosong), belum dibedakan per aksen.
// (23 Nov 2026, permintaan user) Dua tambahan:
//   1) Tiap skrip tersimpan di tab Akun bisa disalin per bagian (Hook / Story / CTA) + "Salin semua" -> pbRefCopy().
//   2) Saklar "Campur dengan contoh bawaan" (pb_ref_mix_v1 = '1' | '0'), hanya tampil & berlaku saat sumber = 'own'.
//      Mode efektif: 'builtin' | 'own' | 'mix'. Saat 'mix', pbUserRefOpts(ambilBawaan) mengembalikan skrip user + contoh bawaan
//      dalam SATU array (di-cache, identitasnya stabil) dan tiap opsi user diberi tanda own:1 (dipakai _vbRefText supaya
//      opsi user tidak meminjam combo opsi bawaan). Kunci pb_ref_source_v1 tidak diubah (tetap 'builtin' | 'own').
(function(){
  var K='pb_user_scripts_v1',S='pb_ref_source_v1',X='pb_ref_mix_v1',MAX=30,_c=null,_ck='',_m=null,_mk='',_mb=null;
  var PN={hook:'Hook',story:'Story',cta:'CTA'};
  var LBL={'24':'24 detik','16':'16 detik','dua':'2 suara'};
  function load(){try{var a=JSON.parse(localStorage.getItem(K)||'[]');return Array.isArray(a)?a.filter(function(x){return x&&typeof x.text==='string'&&x.text&&x.id;}):[];}catch(e){return [];}}
  function put(a){localStorage.setItem(K,JSON.stringify(a));if(typeof pbCloudQueue==='function')pbCloudQueue(K);}
  function src(){try{return localStorage.getItem(S)==='own'?'own':'builtin';}catch(e){return 'builtin';}}
  function mix(){try{return localStorage.getItem(X)==='1';}catch(e){return false;}}
  function eff(){return src()!=='own'?'builtin':(mix()?'mix':'own');} // mode efektif
  function mode(){try{return _vbIsDua()?'dua':(_vb16()?'16':'24');}catch(e){return '24';}}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function flat(t,dua){t=String(t||'').replace(/\r/g,'').trim();return dua?t.split('\n').map(function(l){return l.trim();}).filter(Boolean).join(' || '):t.replace(/\s+/g,' ');}

  // Dipakai _vbRefOpts(): contoh milik user untuk durasi aktif (null = pakai bawaan). Array di-cache supaya identitasnya stabil (bag pengacak tidak ke-reset).
  // ambilBawaan = fungsi (atau array) yang memberi daftar bawaan untuk durasi aktif; hanya dipanggil saat mode 'mix'.
  window.pbUserRefOpts=function(ambilBawaan){
    var e=eff();
    if(e==='builtin')return null;
    var m=mode(),a=load().filter(function(x){return x.mode===m;});
    if(!a.length)return null;
    var k=m+'|'+a.map(function(x){return x.id;}).join(',');
    if(!_c||_ck!==k){_ck=k;_c=a.map(function(x,i){return {nama:'Skrip Saya '+(i+1),def:x.text,combo:{},own:1};});_m=null;}
    if(e==='own')return _c;
    var bl=[];try{bl=(typeof ambilBawaan==='function'?ambilBawaan():ambilBawaan)||[];}catch(er){bl=[];}
    if(!bl.length)return _c; // durasi ini belum punya contoh bawaan: cuma skrip user
    if(!_m||_mk!==k||_mb!==bl){_mk=k;_mb=bl;_m=_c.concat(bl);}
    return _m;
  };
  window.pbUserRefActive=function(){return !!window.pbUserRefOpts();};
  // Awalan kunci memo _vbRefMemoKey(): beda untuk 'own' dan 'mix' supaya nomor opsi yang diingat tidak tertukar.
  window.pbUserRefTag=function(){
    if(eff()==='builtin')return '';
    var m=mode();if(!load().some(function(x){return x.mode===m;}))return '';
    return eff()==='mix'?'mix|':'own|';
  };

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
  // Saklar "Campur dengan contoh bawaan" (hanya terlihat saat sumber = Skrip Saya).
  window.pbRefSetMix=function(on){try{localStorage.setItem(X,on?'1':'0');if(typeof pbCloudQueue==='function')pbCloudQueue(X);}catch(e){}pbRefRender();};

  // Pecah teks simpanan ('hook: ...\ncta: ...') jadi bagian-bagian. Mode 2 suara: ' || ' dikembalikan jadi baris baru (seperti saat diketik).
  function parts(t,dua){
    var out=[];
    String(t||'').split('\n').forEach(function(l){
      var m=/^\s*(hook|story|cta)\s*:\s*([\s\S]*)$/i.exec(l);
      if(m){out.push({k:m[1].toLowerCase(),v:m[2].trim()});}
      else if(l.trim()){if(out.length)out[out.length-1].v+=' '+l.trim();else out.push({k:'',v:l.trim()});}
    });
    out.forEach(function(p){if(dua)p.v=p.v.split(' || ').join('\n');});
    return out;
  }
  function copyText(t){
    t=String(t==null?'':t);
    function legacy(){
      try{
        var ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');
        ta.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;';
        document.body.appendChild(ta);ta.focus();ta.select();ta.setSelectionRange(0,t.length);
        var ok=document.execCommand('copy');document.body.removeChild(ta);return !!ok;
      }catch(e){return false;}
    }
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText&&window.isSecureContext!==false){
        return navigator.clipboard.writeText(t).then(function(){return true;},function(){return legacy();});
      }
    }catch(e){}
    return Promise.resolve(legacy());
  }
  // part: 'hook' | 'story' | 'cta' | 'all'. Bagian tunggal disalin tanpa label; 'all' disalin berlabel (Hook:/Story:/CTA:).
  window.pbRefCopy=function(id,part,btn){
    var it=null,a=load(),i;
    for(i=0;i<a.length;i++){if(a[i].id===id){it=a[i];break;}}
    if(!it){try{showToast('Skrip tidak ditemukan, coba buka ulang tab Akun','error');}catch(e){}return;}
    var ps=parts(it.text,it.mode==='dua'),txt='';
    if(part==='all'){txt=ps.map(function(p){return (PN[p.k]?PN[p.k]+':\n':'')+p.v;}).join('\n\n');}
    else{for(i=0;i<ps.length;i++){if(ps[i].k===part){txt=ps[i].v;break;}}}
    if(!txt){try{showToast('Bagian ini kosong','error');}catch(e){}return;}
    copyText(txt).then(function(ok){
      if(!ok){try{showToast('Belum bisa menyalin. Tahan teksnya lalu pilih Salin','error');}catch(e){}return;}
      if(btn){var o=btn.getAttribute('data-o')||btn.textContent;btn.setAttribute('data-o',o);btn.textContent='Tersalin';clearTimeout(btn._pbT);btn._pbT=setTimeout(function(){btn.textContent=o;},1500);}
      try{showToast((part==='all'?'Skrip':(PN[part]||'Bagian'))+' disalin','success');}catch(e){}
    });
  };
  window.pbRefDel=function(id,b){
    if(b&&b.dataset.arm!=='1'){b.dataset.arm='1';b.textContent='Yakin hapus?';setTimeout(function(){b.dataset.arm='';b.textContent='Hapus';},3000);return;}
    try{put(load().filter(function(x){return x.id!==id;}));}catch(e){}
    pbRefRender();
  };
  window.pbRefRender=function(){
    var box=document.getElementById('pb-refscript-body');if(!box)return;
    var a=load().sort(function(x,y){return (y.ts||0)-(x.ts||0);}),own=src()==='own',mx=own&&mix();
    // Ingat rincian skrip yang sedang terbuka supaya tidak menutup sendiri saat pilihan sumber/saklar diganti.
    var op={};try{[].forEach.call(box.querySelectorAll('details[open][data-id]'),function(d){op[d.getAttribute('data-id')]=1;});}catch(e){}
    var h='<div class="pb-rs-seg" role="radiogroup" aria-label="Sumber contoh skrip">'
      +'<button type="button" role="radio" aria-checked="'+(!own)+'" class="chip'+(own?'':' sel')+'" onclick="pbRefSetSource(\'builtin\')">Bawaan Aplikasi</button>'
      +'<button type="button" role="radio" aria-checked="'+own+'" class="chip'+(own?' sel':'')+'" onclick="pbRefSetSource(\'own\')">Skrip Saya ('+a.length+')</button></div>';
    h+='<div class="pb-rs-hint">'+(!own?'AI memakai contoh bawaan aplikasi, diacak tiap skrip dibuat.':(a.length?(mx?'Tiap skrip dari "Kami Bantu Isi" memakai contoh yang diacak dari skrip simpananmu dan contoh bawaan sekaligus, sesuai durasi yang dipilih. Makin banyak skrip yang kamu simpan, makin sering skripmu terpilih.':'Tiap skrip dari "Kami Bantu Isi" memakai contoh yang diacak dari skrip simpananmu, sesuai durasi yang dipilih. Durasi tanpa simpanan memakai contoh bawaan.'):'Belum ada skrip tersimpan, jadi sementara dipakai contoh bawaan.'))+'</div>';
    if(own&&a.length)h+='<button type="button" class="pb-rs-mix" role="switch" aria-checked="'+mx+'" onclick="pbRefSetMix('+(!mx)+')"><span class="pb-rs-mix-t"><b>Campur dengan contoh bawaan</b><small>Kalau mati, AI hanya memakai skrip simpananmu.</small></span><span class="pb-rs-sw" aria-hidden="true"></span></button>';
    if(!a.length)h+='<div class="pb-rs-hint" style="margin-top:8px;">Tekan "Simpan skrip" di kartu CTA pada hasil skrip untuk menyimpannya di sini.</div>';
    a.forEach(function(x){
      var plain=x.text.replace(/^(hook|story|cta):\s*/gim,'').replace(/\s*\n\s*/g,' ');
      var ps=parts(x.text,x.mode==='dua'),sid=esc(x.id),body;
      if(ps.length){
        body='<div class="pb-rs-parts">'+ps.map(function(p){
          var lb=PN[p.k]||'Skrip';
          return '<div class="pb-rs-part"><div class="pb-rs-part-h"><span class="pb-rs-part-l">'+lb+'</span>'
            +(p.k?'<button type="button" class="copy-btn pb-rs-copy" aria-label="Salin '+lb+'" onclick="pbRefCopy(\''+sid+'\',\''+p.k+'\',this)">Salin</button>':'')
            +'</div><div class="pb-rs-part-t">'+esc(p.v)+'</div></div>';
        }).join('')+'</div>'
          +'<button type="button" class="copy-btn pb-rs-copy pb-rs-all" onclick="pbRefCopy(\''+sid+'\',\'all\',this)">Salin semua</button>';
      }else body='<div class="pb-rs-full">'+esc(x.text)+'</div>';
      h+='<div class="pb-rs-item"><div class="pb-rs-top"><div class="pb-rs-name">'+esc(x.produk||'Tanpa nama produk')+'</div><span class="pb-rs-tag">'+esc(LBL[x.mode]||x.mode)+'</span>'
        +'<button type="button" class="copy-btn pb-rs-del" onclick="pbRefDel(\''+sid+'\',this)">Hapus</button></div>'
        +'<details data-id="'+sid+'"'+(op[x.id]?' open':'')+'><summary class="pb-rs-prev">'+esc(plain.length>90?plain.slice(0,90)+'…':plain)+'</summary>'+body+'</details></div>';
    });
    box.innerHTML=h;
  };
  // Gaya tambahan (saklar campur + bagian skrip). Ditanam dari sini supaya app.css tidak perlu diubah; semua kelas berawalan pb-rs-.
  function css(){
    if(document.getElementById('pb-rs-extra-css'))return;
    var st=document.createElement('style');st.id='pb-rs-extra-css';
    st.textContent=[
      '.pb-rs-mix{display:flex;align-items:center;gap:12px;width:100%;margin-top:10px;padding:10px 12px;background:var(--surface);border:1px solid var(--border-hi);border-radius:var(--radius-sm);color:var(--text);font:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent;}',
      '.pb-rs-mix-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}',
      '.pb-rs-mix-t b{font-size:var(--fs-sm);font-weight:600;}',
      '.pb-rs-mix-t small{font-size:var(--fs-2xs);color:var(--muted);line-height:1.5;}',
      '.pb-rs-sw{position:relative;flex:none;width:38px;height:22px;border-radius:999px;background:var(--muted2);transition:background .15s;}',
      '.pb-rs-sw::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .15s;}',
      '.pb-rs-mix[aria-checked="true"] .pb-rs-sw{background:var(--accent);}',
      '.pb-rs-mix[aria-checked="true"] .pb-rs-sw::after{transform:translateX(16px);}',
      '.pb-rs-mix:focus-visible{outline:2px solid var(--accent);outline-offset:2px;}',
      '.pb-rs-parts{display:flex;flex-direction:column;gap:8px;margin-top:8px;}',
      '.pb-rs-part{padding:8px 10px;background:var(--surface);border:1px solid var(--border-hi);border-radius:var(--radius-sm);}',
      '.pb-rs-part-h{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;}',
      '.pb-rs-part-l{font-size:var(--fs-2xs);font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);}',
      '.pb-rs-part-t{font-size:var(--fs-xs2);line-height:1.65;color:var(--text);white-space:pre-wrap;overflow-wrap:anywhere;}',
      '.pb-rs-copy{flex:none;white-space:nowrap;}',
      '.pb-rs-all{margin-top:8px;}'
    ].join('\n');
    (document.head||document.documentElement).appendChild(st);
  }
  function init(){
    try{css();}catch(e){}
    try{pbRefRender();}catch(e){}
    var sp=window.switchPage;
    if(typeof sp==='function'&&!sp.__pbRef){var w=function(id){var r=sp.apply(this,arguments);if(id==='panduan'){try{pbRefRender();}catch(e){}}return r;};w.__pbRef=1;window.switchPage=w;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
