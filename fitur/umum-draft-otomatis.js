// fitur/umum-draft-otomatis.js — (dulu js/13-draft-otomatis.js) dipindah dari <script> di index.html lama (baris 36564). Isi tidak diubah.
(function(){
  'use strict';
  var MAX_HISTORY = 60;
  var DEBOUNCE_MS = 450;
  // ── DRAFT OTOMATIS (permintaan user, Sept 2026) ─────────────────────
  // Snapshot TERAKHIR (bukan seluruh riwayat undo) juga disimpan ke
  // localStorage di HP yang sama (BUKAN ikut sync Firebase — sengaja,
  // sesuai permintaan). Tujuannya: kalau user tutup app total di
  // tengah wizard (mis. sampai Step 5) lalu buka lagi, app lanjut dari
  // situ, bukan balik ke Step 1 kosong. Dipakai ulang mekanisme
  // snapshot yang sama dengan undo/redo di bawah — snapshot itu sudah
  // lengkap (posisi step + semua isian field + kartu yang "done"),
  // jadi tidak perlu sistem simpan-state terpisah.
  var DRAFT_KEY = 'pb_wizard_draft_v1';
  var stack = [];        // array of snapshot object
  var pointer = -1;      // index snapshot aktif di stack
  var timer = null;
  var restoring = false; // true selagi proses undo/redo jalan (biar tidak nyatet snapshot dari aksi restore itu sendiri)
  var restoredDraft = false; // true kalau stack saat ini berasal dari draft yang dipulihkan (lihat tryRestoreDraft & pbHasUnsavedProgress)
  // BUG FIX (Sept 2026): sebelumnya cuma nyimpen SATU stepFn terakhir.
  // Kalau dalam satu jeda debounce ada beberapa aksi top-level TERPISAH
  // (bukan nested) — misal klik cepat berturut-turut — yang tersimpan
  // cuma aksi paling akhir, aksi sebelumnya "ketiban" dan gak ikut
  // di-replay pas undo. Sekarang dikumpulkan jadi ARRAY, semua dipanggil
  // ulang berurutan pas restore.
  var pendingStepCalls = [];
  // FIX BUG "posisi step tidak ikut tersimpan di draft": snapshotNow() cuma
  // membawa stepCalls SEJAK snapshot sebelumnya (dibuang tiap kali dipanggil,
  // lihat di bawah) — kalau snapshot TERAKHIR sebelum app ditutup dipicu oleh
  // ketikan field (bukan pindah step), stepCalls-nya kosong dan draft yang
  // dipulihkan cuma ngisi field tapi layar balik ke Step 1. lastNavCall
  // menyimpan panggilan navigasi step TERAKHIR (bukan render pasif) dan tidak
  // pernah dikosongkan oleh snapshotNow — jadi selalu ada di setiap snapshot,
  // dipakai ulang khusus saat restore draft (lihat tryRestoreDraft).
  var lastNavCall = null;
  var PB_NAV_FN_REGEX = /Step/; // fungsi pindah step (pbGoStepN, fGoStepN, vbGoStepN, dst) — BUKAN yang berakhiran Render

  // BUG FIX (Sept 2026) — PENTING, soal memori: foto (base64) yang
  // nyempil di dalam VAI/VB/VB_BULK_PRODUCTS dkk bisa berukuran ratusan
  // KB sampai beberapa MB. Kalau ikut di-clone mentah-mentah di SETIAP
  // snapshot (sampai 60 snapshot riwayat), app bisa makan memori
  // ratusan MB dan lag/crash di HP — app ini berat ke fitur upload
  // foto. String yang lebih panjang dari SKIP_STR_LEN dianggap "data
  // besar" (foto/base64) dan TIDAK disalin ke riwayat; sesuai catatan
  // keterbatasan dari awal ("foto tidak ikut di-undo"), pas restore
  // field ini dibiarkan apa adanya di state yang lagi berjalan (tidak
  // ditimpa, tidak dihapus).
  var SKIP_STR_LEN = 3000;
  var SKIP_MARK = '\u0000__PB_UNDO_KEEP_CURRENT__\u0000';

  // ── Daftar variabel state utama yang dilacak. Kalau nanti nambah
  // fitur/step besar baru dengan variabel state baru, tambahkan namanya
  // di sini juga supaya ikut ke-undo. ──────────────────────────────────
  var PB_UNDO_STATE_VARS = [
    'FS','csState','VAI','VB','VB_MODE4_OVERLAY_TEXT','VB_MANUAL_ROW_CACHE',
    'VB_MANUAL_COUNT','VB_BULK_ITEMS','VB_CARD_TAMPIL','VB_CARD_LOKASI',
    'VB_PRODUCT_FOTOCOUNT','VB_HOOK_OVERLAY','VB_CHAR_OVR','VB_BULK_PRODUCTS',
    'VB_REVISI_FOTO_OVERRIDE','VB_BULK_ROW_CACHE','VB_BULK_LAST_CONTEXT',
    'VB_SINGLE_REVISI_BACKUP','VB_BULK_REVISI_BACKUP','VB_SINGLE_OVERLAY','PB_ACTIVE_SAVED_ID',
    'pbProdukFotoUploaded','pbProdukFotoDataUrl','pbKsFotoUploaded',
    'pbKsFotoDataUrl','pbFotoAiUploaded','pbFotoAiDataUrl',
    'pbStep3Revealed','pbVideoGuideIndex'
  ];

  // Clone manual (bukan lewat JSON.stringify) sambil "memangkas" string
  // panjang jadi SKIP_MARK — lebih hemat memori & CPU karena string besar
  // tidak pernah ikut disalin sama sekali (JSON.stringify tetap harus
  // membangun teks penuhnya dulu sebelum bisa dipangkas, jadi percuma).
  function cloneStrip(v){
    var t = typeof v;
    if(v===null || t==='undefined' || t==='number' || t==='boolean') return v;
    if(t==='string') return v.length>SKIP_STR_LEN ? SKIP_MARK : v;
    if(Array.isArray(v)){ var arr=[]; for(var i=0;i<v.length;i++) arr.push(cloneStrip(v[i])); return arr; }
    if(t==='object'){
      var out={};
      for(var k in v){ if(Object.prototype.hasOwnProperty.call(v,k)) out[k]=cloneStrip(v[k]); }
      return out;
    }
    return null; // function dll, tidak perlu ikut tersimpan
  }

  // FIX BUG "foto hitam tapi centang hijau tetap ada" (audit lanjutan):
  // dipisah jadi fungsi sendiri supaya bisa dipanggil BUKAN cuma sekali
  // pas app baru dibuka (tryRestoreDraft), tapi juga tiap kali applySnapshot
  // jalan (Undo/Redo dalam satu sesi) — sebelumnya guard ini cuma ada di
  // tryRestoreDraft, jadi kalau user upload foto produk lalu Undo (balik
  // ke sebelum upload, dataUrl jadi null) lalu Redo lagi (flag boolean
  // balik true dari snapshot, tapi dataUrl tetap null karena snapshot
  // aslinya sudah dipangkas SKIP_MARK dan mergeSkip cuma mempertahankan
  // "current" yang saat itu kebetulan null), thumbnail Foto Produk/Karakter
  // Sheet/Foto AI jadi kotak hitam padahal berstatus "sudah disiapkan".
  function _pbFixPhotoFlagDesync(){
    var _photoFlagPairs = [
      ['pbProdukFotoUploaded','pbProdukFotoDataUrl'],
      ['pbKsFotoUploaded','pbKsFotoDataUrl'],
      ['pbFotoAiUploaded','pbFotoAiDataUrl']
    ];
    for(var _pfi=0; _pfi<_photoFlagPairs.length; _pfi++){
      try{
        var _flagName = _photoFlagPairs[_pfi][0], _dataName = _photoFlagPairs[_pfi][1];
        if(eval(_flagName)===true && !eval(_dataName)){ eval(_flagName+' = false;'); }
      }catch(e){}
    }
  }

  // Kebalikan dari cloneStrip pas restore: kalau ketemu SKIP_MARK,
  // pertahankan nilai yang SEDANG berjalan di state (jangan ditimpa).
  function mergeSkip(current, snap){
    if(snap===SKIP_MARK) return current;
    if(Array.isArray(snap)){
      var curArr = Array.isArray(current)?current:[];
      var out=[]; for(var i=0;i<snap.length;i++) out.push(mergeSkip(curArr[i], snap[i]));
      return out;
    }
    if(snap && typeof snap==='object'){
      var curObj = (current && typeof current==='object') ? current : {};
      var out2={}; for(var k in snap){ if(Object.prototype.hasOwnProperty.call(snap,k)) out2[k]=mergeSkip(curObj[k], snap[k]); }
      return out2;
    }
    return snap;
  }

  function captureVars(){
    var out = {};
    for(var i=0;i<PB_UNDO_STATE_VARS.length;i++){
      var name = PB_UNDO_STATE_VARS[i];
      try{ out[name] = cloneStrip(eval(name)); }catch(e){ out[name] = undefined; }
    }
    return out;
  }
  function restoreVars(vars){
    for(var i=0;i<PB_UNDO_STATE_VARS.length;i++){
      var name = PB_UNDO_STATE_VARS[i];
      if(!(name in vars)) continue;
      try{ var merged = mergeSkip(eval(name), vars[name]); eval(name+' = merged;'); }catch(e){}
    }
  }

  function captureDom(){
    var out = {};
    var nodes = document.querySelectorAll('#app-shell [id]');
    for(var i=0;i<nodes.length;i++){
      var el = nodes[i];
      var tag = el.tagName;
      if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'){
        if(el.type==='checkbox'||el.type==='radio'){ out[el.id] = {checked: el.checked}; }
        else if(el.type!=='file'){
          // sama seperti state var: field teks yang KEBETULAN berisi
          // data besar (mis. hidden input nyimpen base64) juga dilewati
          // biar tidak ikut membengkakkan riwayat.
          out[el.id] = {value: el.value.length>SKIP_STR_LEN ? SKIP_MARK : el.value};
        }
      }
    }
    return out;
  }
  function restoreDom(dom){
    Object.keys(dom).forEach(function(id){
      var el = document.getElementById(id);
      if(!el) return;
      var data = dom[id];
      if('checked' in data){ if(el.checked!==data.checked){ el.checked=data.checked; fire(el,'change'); } }
      else if('value' in data){
        if(data.value===SKIP_MARK) return; // biarkan nilai sekarang, jangan ditimpa
        if(el.value!==data.value){ el.value=data.value; fire(el,'input'); fire(el,'change'); }
      }
    });
  }
  function fire(el,type){ try{ el.dispatchEvent(new Event(type,{bubbles:true})); }catch(e){} }

  // R2/R4 (audit "Tampilan Terakhir"): layar dipulihkan dari DATA tampilan (kartu wizard + progres +
  // hasil), bukan dengan memutar ulang nama fungsi step. Hasil (kartu skrip, prompt foto) disimpan HTML-nya.
  // Kartu skrip/multi dibangun JS dengan handler .onclick/.oninput (tidak ikut HTML) -> digambar ulang lewat fungsi render-nya, bukan innerHTML.
  var PB_RES_HTML=['f-prompt-full'], PB_RES_STATE=['vb-multi-output','f-output-wrap','f-json-output','f-preview-placeholder'];
  function _cls(el){ return (el.className||'').toString().replace(/\banim-in\b/g,'').replace(/\s+/g,' ').trim(); }
  // FIX AKAR "tidak ada step yang kelihatan": step yang lagi ditutup sementara karena user mengedit step lain
  // dicatat di STEP_PAUSE_STACK (bukan di DOM). Draft cuma menyimpan DOM-nya (kartu 'hidden'), jadi setelah dipulihkan
  // kartu itu tetap tersembunyi dan fResumePausedStep() tidak tahu apa-apa -> layar kosong. Sekarang stack-nya ikut disimpan.
  function clonePause(){
    try{ if(typeof STEP_PAUSE_STACK==='undefined') return null; return {foto:(STEP_PAUSE_STACK.foto||[]).slice(), video:(STEP_PAUSE_STACK.video||[]).slice()}; }catch(e){ return null; }
  }
  function restorePause(p){
    try{
      if(!p||typeof STEP_PAUSE_STACK==='undefined') return;
      ['foto','video'].forEach(function(k){
        STEP_PAUSE_STACK[k]=(p[k]||[]).filter(function(id){ var el=document.getElementById(id); return el&&el.classList.contains('hidden')&&!el.classList.contains('done'); });
      });
    }catch(e){}
  }
  function captureCards(){
    var o={c:[],p:{}};
    try{
      document.querySelectorAll('#foto .wcard[id], #video .wcard[id]').forEach(function(c){
        var r={id:c.id,cl:_cls(c),st:c.getAttribute('style')||'',d:[]};
        var w=c.querySelector('.wanswer'); if(w) r.a=w.innerHTML;
        // FIX "step hilang / tombol Lanjut mati setelah dipulihkan": penanda di data-* kartu (mis. data-dua-hid, data-reopened)
        // dan status disabled/terpilih tombol & chip ikut disimpan. Sebelumnya hilang, jadi kartu yang disembunyikan mode
        // tertentu tidak pernah dibuka lagi & tombol Lanjut tetap disabled walau pilihannya sudah terpulihkan.
        var ds={}; for(var dk in c.dataset){ ds[dk]=c.dataset[dk]; } r.ds=ds;
        var kk=[]; var _gen=false; try{ _gen=!!((typeof VAI!=='undefined'&&VAI&&VAI._isGenerating)||(window.PB_PM&&window.PB_PM.busy)); }catch(x){}
        // selagi proses generate berjalan, tombol sengaja tidak dicatat: prosesnya mati bersama app, jangan sampai tombol terpulihkan dalam keadaan mati
        c.querySelectorAll('button,.chip').forEach(function(e){ var kc=_cls(e); kk.push((_gen||/btn-loading/.test(kc))?null:[kc,(e.tagName==='BUTTON'&&e.disabled)?1:0]); }); r.k=kk;
        c.querySelectorAll('[id]').forEach(function(e){ var t=e.tagName; if(t!=='INPUT'&&t!=='TEXTAREA'&&t!=='SELECT'){ var k=_cls(e); if(k) r.d.push([e.id,k]); } });
        o.c.push(r);
      });
      ['f-progress','vb-progress'].forEach(function(p){
        var l=document.getElementById(p+'-label'),t=document.getElementById(p+'-title'),f=document.getElementById(p+'-fill');
        o.p[p]={l:l?l.innerHTML:null,t:t?t.innerHTML:null,w:f?f.style.width:null};
      });
    }catch(e){}
    return o;
  }
  function restoreCards(o){
    try{
      if(!o||!o.c) return;
      o.c.forEach(function(r){
        var c=document.getElementById(r.id); if(!c) return;
        c.className=r.cl; if(r.st) c.setAttribute('style',r.st); else c.removeAttribute('style');
        var w=c.querySelector('.wanswer'); if(w&&r.a!=null) w.innerHTML=r.a;
        if(r.ds){ try{ Object.keys(c.dataset).forEach(function(k){ if(!(k in r.ds)) delete c.dataset[k]; }); Object.keys(r.ds).forEach(function(k){ c.dataset[k]=r.ds[k]; }); }catch(x){} }
        if(r.k){ try{ var ctl=c.querySelectorAll('button,.chip'); if(ctl.length===r.k.length){ ctl.forEach(function(e,i){ var q=r.k[i]; if(!q) return; if(e.classList.contains('chip') && _cls(e)!==q[0]) e.className=q[0]; if(e.tagName==='BUTTON') e.disabled=!!q[1]; }); } }catch(x){} }
        (r.d||[]).forEach(function(x){ var e=document.getElementById(x[0]); if(e&&_cls(e)!==x[1]) e.className=x[1]; });
      });
      var P=o.p||{};
      Object.keys(P).forEach(function(p){
        var l=document.getElementById(p+'-label'),t=document.getElementById(p+'-title'),f=document.getElementById(p+'-fill');
        if(l&&P[p].l!=null) l.innerHTML=P[p].l; if(t&&P[p].t!=null) t.innerHTML=P[p].t; if(f&&P[p].w!=null) f.style.width=P[p].w;
      });
    }catch(e){}
  }
  var _resHCache={};
  function captureResults(){
    var o={};
    try{
      PB_RES_HTML.concat(PB_RES_STATE).forEach(function(id){
        var e=document.getElementById(id); if(!e) return;
        var r={st:e.getAttribute('style')||'',cl:_cls(e)};
        if(PB_RES_HTML.indexOf(id)>=0){ var h=e.innerHTML; if(h.length>300000) return; if(_resHCache[id]===h) h=_resHCache[id]; else _resHCache[id]=h; r.h=h; } // string yang sama dipakai bersama di 60 snapshot (hemat memori)
        o[id]=r;
      });
      var tas=[],i=0,ta;
      while((ta=document.getElementById('vb-bulk-script-'+i))){ tas.push(ta.value); i++; }
      var mw=document.getElementById('vb-multi-output');
      // FIX (20 Nov 2026): dulu kartu skrip DILEWATI kalau kotaknya disembunyikan Atur Mode Produk (multi-mode) -> hasil tidak ikut draft -> layar kosong setelah app dibuka ulang.
      if(tas.length && mw) o.__multi={scripts:tas,nama:(VB_BULK_ITEMS[0]&&VB_BULK_ITEMS[0].produk)||'',manual:tas.some(function(t){return !t;})};
      // FIX: "Hasil per Mode Produk" cuma hidup di memori (PB_PM.res) -> simpan teksnya (skrip + JSON) ke draft.
      try{
        var _pm=window.PB_PM;
        if(_pm && ((_pm.res&&_pm.res.length)||(_pm.fash&&_pm.fash.length))){
          o.__pm={fash:(_pm.fash||[]).slice(), res:(_pm.res||[]).map(function(r){
            return {mode:r.mode, nama:r.nama, cards:(r.cards||[]).map(function(c,ci){
              var t=c.script, e=r.gp?document.getElementById('vb-bulk-script-'+(r.gp*3+(c.k!=null?c.k:ci))):null;
              if(e&&e.isConnected) t=e.value;
              return {label:c.label, script:t, json:String(c.json||'').slice(0,20000), k:c.k};
            })};
          })};
        } else if(window.__pbPmRestored && document.getElementById('pb-pm-restored-mark')){ o.__pm=window.__pbPmRestored; }
      }catch(x){}
    }catch(e){}
    return o;
  }
  // FIX (20 Nov 2026): gambar ulang "Hasil per Mode Produk" dari teks yang tersimpan (versi sederhana: skrip + tombol Salin).
  function _pbRestorePmBox(pm){
    try{
      var box=document.getElementById('pb-pm-results');
      if(!box||!pm||!((pm.res&&pm.res.length)||(pm.fash&&pm.fash.length))) return false;
      var LB={satu:'Start Frame',kp:'Raw Asset',aset:'POV Produk (Pakai Skrip)',dua:'Percakapan 2 Suara',fashion:'Fashion Editorial'};
      function copy(t){ try{ navigator.clipboard.writeText(t).then(function(){ try{showToast('Tersalin');}catch(e){} }); }catch(e){} }
      box.innerHTML='';
      var h=document.createElement('div'); h.id='pb-pm-restored-mark'; h.style.cssText='margin-top:14px;font-weight:600;'; h.textContent='Hasil per Mode Produk (dipulihkan)'; box.appendChild(h);
      (pm.res||[]).forEach(function(r){
        var c=document.createElement('div'); c.className='out-card'; c.style.cssText='margin-top:8px;padding:10px 12px;';
        var t=document.createElement('div'); t.style.cssText='font-size:var(--fs-xs2);margin-bottom:6px;'; t.textContent=(r.nama||'Produk')+' · '+(LB[r.mode]||r.mode||''); c.appendChild(t);
        (r.cards||[]).forEach(function(cd){
          var l=document.createElement('div'); l.style.cssText='font-size:var(--fs-2xs);color:var(--muted);margin-top:6px;'; l.textContent=cd.label||''; c.appendChild(l);
          var ta=document.createElement('textarea'); ta.className='inp'; ta.readOnly=true; ta.rows=4; ta.style.cssText='width:100%;'; ta.value=cd.script||''; c.appendChild(ta);
          var b=document.createElement('button'); b.type='button'; b.className='chip'; b.textContent='Salin Skrip'; b.onclick=function(){copy(ta.value);}; c.appendChild(b);
          if(cd.json){ var j=document.createElement('button'); j.type='button'; j.className='chip'; j.textContent='Salin JSON'; j.onclick=function(){copy(cd.json);}; c.appendChild(j); }
        });
        box.appendChild(c);
      });
      if(pm.fash&&pm.fash.length){ var f=document.createElement('div'); f.className='out-card'; f.style.cssText='margin-top:8px;padding:10px 12px;font-size:var(--fs-xs2);'; f.textContent='Fashion Editorial (tanpa skrip): '+pm.fash.join(', '); box.appendChild(f); }
      window.__pbPmRestored=pm;
      return true;
    }catch(e){ return false; }
  }
  function restoreResults(o){
    try{
      if(!o) return;
      if(o.__multi && typeof _vbRenderMultiOutput==='function'){ try{ _vbRenderMultiOutput(o.__multi.scripts,o.__multi.nama,false,o.__multi.manual); }catch(x){} }
      Object.keys(o).forEach(function(id){
        if(id==='__multi') return;
        var e=document.getElementById(id), r=o[id]; if(!e||!r) return;
        if(r.h!=null && e.innerHTML!==r.h) e.innerHTML=r.h;
        if(r.st) e.setAttribute('style',r.st); else e.removeAttribute('style');
        e.className=r.cl;
      });
      // FIX: hasil multi-mode dipulihkan di kotak "Hasil per Mode Produk"; kalau tidak ada, kartu skrip yang tersembunyi dimunculkan lagi.
      if(!(o.__pm && _pbRestorePmBox(o.__pm)) && o.__multi){
        var _lv=document.getElementById('vb-multi-output');
        if(_lv && _lv.children.length && _lv.style.display==='none') _lv.style.display='flex';
      }
    }catch(e){}
  }
  var _bootDone=false; // simpan tanpa syarat baru boleh setelah restore awal selesai (jangan menimpa draft lama dengan layar kosong)
  // R4: simpan SEKARANG tanpa syarat timer (dipanggil saat app ke background/pagehide/freeze/appStateChange).
  window.pbSaveNow=function(){
    try{
      if(restoring||!_bootDone||window._pbLoggingOut) return;
      if(document.body.classList.contains('pb-tour-active')) return;
      if(timer){ clearTimeout(timer); timer=null; }
      if(Date.now()-_lastSaveAt<700) return; // baru saja disimpan (mis. oleh handler visibilitychange lain) — jangan serialisasi dua kali
      saveDraft({stepCalls:[],draftCall:lastNavCall,vars:captureVars(),dom:captureDom(),cards:captureCards(),results:captureResults(),pause:clonePause(),t:Date.now()});
    }catch(e){}
  };
  function snapshotNow(){
    var calls = pendingStepCalls.slice();
    pendingStepCalls = [];
    return { stepCalls:calls, draftCall:lastNavCall, vars:captureVars(), dom:captureDom(), cards:captureCards(), results:captureResults(), pause:clonePause(), t:Date.now() };
  }

  function pushSnapshot(){
    if(restoring) return;
    var snap = snapshotNow();
    // buang cabang "masa depan" kalau user sempat undo lalu bikin aksi baru
    if(pointer < stack.length-1) stack = stack.slice(0,pointer+1);
    stack.push(snap);
    if(stack.length>MAX_HISTORY){ stack.shift(); }
    pointer = stack.length-1;
    saveDraft(snap);
    updateFab();
  }

  // Simpan/hapus draft di localStorage (lihat catatan DRAFT_KEY di atas).
  // FIX LAG: isi draft yang sama persis (selain cap waktu) tidak ditulis ulang ke localStorage (tulis sinkron = main thread macet).
  var _lastDraftBody = '', _lastSaveAt = 0;
  function saveDraft(snap){
    _lastSaveAt = Date.now();
    try{
      var str = JSON.stringify(snap);
      var body = str.replace(/,"t":\d+\}$/, '}');
      if(body === _lastDraftBody) return;
      _lastDraftBody = body;
      localStorage.setItem(DRAFT_KEY, str);
    }catch(e){}
  }
  function clearDraft(){
    _lastDraftBody = '';
    try{ localStorage.removeItem(DRAFT_KEY); }catch(e){}
  }
  // Dipanggil sekali saat app pertama dibuka (lihat window.load di bawah).
  // Return true kalau berhasil menemukan & memuat draft lama.
  function tryRestoreDraft(){
    try{
      var raw = localStorage.getItem(DRAFT_KEY);
      if(!raw) return false;
      var snap = JSON.parse(raw);
      if(!snap || typeof snap!=='object') return false;
      stack = [snap];
      pointer = 0;
      // FIX REFRESH: draft baseline (Step 1 kosong) SELALU tersimpan, jadi
      // dulu tiap app dibuka ulang restoredDraft langsung true → pull-to-
      // refresh selalu tanya "kamu masih mengisi..." padahal kosong. Sekarang
      // bandingkan dulu isi draft dengan kondisi app-baru (sebelum dipulihkan):
      // kalau sama persis, itu bukan progres.
      restoredDraft = true;
      try{
        var _freshSig = JSON.stringify({v:captureVars(), d:captureDom()});
        var _draftSig = JSON.stringify({v:snap.vars, d:snap.dom});
        restoredDraft = (_freshSig !== _draftSig);
      }catch(e){ restoredDraft = true; }
      if(snap.draftCall) lastNavCall = snap.draftCall;
      // FIX "nge-lag/loncat": fungsi step yang diputar ulang memanggil scrollIntoView({behavior:'smooth'}) tertunda, yang
      // bertabrakan dengan pemulihan posisi scroll. Selama pemulihan awal, scrollIntoView dimatikan sebentar.
      try{
        if(!Element.prototype.__pbScrollPatched){
          var _siv = Element.prototype.scrollIntoView;
          Element.prototype.scrollIntoView = function(){ if(window.__pbNoScroll) return; return _siv.apply(this, arguments); };
          Element.prototype.__pbScrollPatched = true;
        }
        window.__pbNoScroll = true; setTimeout(function(){ window.__pbNoScroll = false; }, 1800);
      }catch(e){}
      applySnapshot(snap, true);
      // FIX AKAR MASALAH "Tunggu proses AI sebelumnya selesai dulu" NYANGKUT
      // PERMANEN + toast "Selamat datang kembali" muncul padahal tidak ada
      // proses apa pun yang jalan (audit Sept 2026): VAI ikut masuk daftar
      // PB_UNDO_STATE_VARS supaya field produk/target audience dkk ikut
      // tersimpan di draft — tapi itu artinya field RUNTIME SEMENTARA seperti
      // _isGenerating & _lastGenTime IKUT tersimpan & DIPULIHKAN juga. Kalau
      // draft terakhir kebetulan tersimpan pas status itu true (mis. app
      // ditutup/di-kill PAS di tengah proses generate, sebelum sempat sampai
      // finally), status "sedang generate" itu terbawa lagi ke SETIAP sesi
      // berikutnya walau app sudah di-force-stop total — proses aslinya
      // sendiri sudah pasti mati (network request putus begitu app di-kill),
      // jadi tidak ada gunanya dipulihkan. Reset paksa di sini, SETELAH field
      // lain selesai dipulihkan, supaya isian form tetap aman tapi status
      // "generating" selalu mulai bersih tiap app dibuka.
      if(typeof VAI!=='undefined' && VAI){ VAI._isGenerating=false; VAI._lastGenTime=0; }
      // FIX BUG "draft lintas sesi memulihkan flag tanpa data": foto
      // (base64) di atas SKIP_STR_LEN dipangkas jadi SKIP_MARK saat
      // disimpan (lihat cloneStrip/SKIP_STR_LEN) — mergeSkip lalu
      // mempertahankan nilai "current" di tempatnya. Untuk undo/redo DALAM
      // sesi yang sama itu benar (data foto asli masih ada di state yang
      // sedang berjalan). Tapi di sini app BARU dibuka (state fresh, tidak
      // ada apa-apa buat dipertahankan) — data foto beneran hilang, padahal
      // flag boolean pasangannya ('...Uploaded', bukan string panjang jadi
      // TIDAK ikut dipangkas) tetap ke-restore true. Akibatnya <img
      // src="null"> dengan centang hijau "sudah disiapkan" dan step foto
      // referensi ikut dilewati padahal fotonya kosong. Samakan lagi di sini
      // (sekarang pakai _pbFixPhotoFlagDesync() yang sama dengan applySnapshot,
      // lihat definisinya di atas — sebelumnya blok ini cuma jalan di sini,
      // tidak di Undo/Redo biasa, jadi bug yang sama masih bisa muncul pas
      // Undo lalu Redo dalam satu sesi).
      _pbFixPhotoFlagDesync();
      // FIX BUG #7 (cakupan tambahan — sebelumnya cuma nutup 3 pasangan flag
      // top-level di atas): VB_BULK_PRODUCTS (mode bulk) adalah ARRAY produk,
      // masing-masing entri punya pasangan {fotoBase64, fotoMime} SENDIRI,
      // bukan flag boolean terpisah kayak foto tunggal di atas. fotoBase64
      // yang panjang (>SKIP_STR_LEN) ikut kena SKIP_MARK saat disimpan (lihat
      // cloneStrip) — sama seperti kasus di atas, draft lintas sesi = state
      // runtime-nya fresh/kosong, jadi mergeSkip tidak punya apa-apa buat
      // dipertahankan → fotoBase64 tiap entri berakhir `undefined`, sementara
      // fotoMime (string pendek, TIDAK ikut dipangkas) tetap utuh nyangkut
      // sendirian. Walau sebagian besar kode lain sudah aman lewat
      // pengecekan `!!fotoBase64` sebelum dipakai, entri yang fotoMime-nya
      // masih terisi padahal fotoBase64 sudah pasti hilang tetap metadata
      // "yatim" yang menyesatkan. Samakan polanya dengan _photoFlagPairs di
      // atas: kalau fotoBase64 kosong, ikut kosongkan fotoMime & pastikan
      // fotoBase64 jadi string kosong (bukan literal undefined) biar
      // konsisten sama representasi "belum ada foto" di seluruh app ini.
      try{
        if(typeof VB_BULK_PRODUCTS!=='undefined' && Array.isArray(VB_BULK_PRODUCTS)){
          for(var _bi=0; _bi<VB_BULK_PRODUCTS.length; _bi++){
            var _bp=VB_BULK_PRODUCTS[_bi];
            if(_bp && typeof _bp==='object' && !_bp.fotoBase64){ _bp.fotoBase64=''; _bp.fotoMime=''; }
          }
        }
      }catch(e){}
      // VB_BULK_ROW_CACHE (cache isian form bulk sebelum di-generate) punya
      // bentuk pasangan foto yang sama persis — kena masalah yang sama.
      try{
        if(typeof VB_BULK_ROW_CACHE!=='undefined' && Array.isArray(VB_BULK_ROW_CACHE)){
          for(var _ri=0; _ri<VB_BULK_ROW_CACHE.length; _ri++){
            var _rc=VB_BULK_ROW_CACHE[_ri];
            if(_rc && typeof _rc==='object' && !_rc.fotoBase64){ _rc.fotoBase64=''; _rc.fotoMime=''; }
          }
        }
      }catch(e){}
      return true;
    }catch(e){ return false; }
  }
  // Bedakan "refresh/reload" vs "buka app baru" (buka lagi setelah
  // ditutup total / dari home screen). Browser modern menandai jenis
  // navigasi lewat Performance API — kalau type-nya "reload", berarti
  // user sengaja refresh (pull-to-refresh atau tombol reload), maka
  // draft wizard di-reset ke Step 1. Kalau bukan reload (app baru
  // dibuka lagi), draft TETAP dipakai (lihat tryRestoreDraft di atas).
  // CATATAN: ini HANYA menghapus draft wizard (DRAFT_KEY di atas).
  // Riwayat generate (pb_history_v1), halaman tersimpan, preset
  // karakter dll sama sekali TIDAK disentuh oleh ini — key-nya
  // memang terpisah total dari draft.
  function isReloadNavigation(){
    // Prioritas: penanda sessionStorage PB_IS_TRUE_RELOAD (lihat IIFE
    // paling awal di <head>, lebih reliable di HP/PWA dibanding
    // Performance API) — fallback ke cara lama cuma kalau sessionStorage
    // diblokir (null/undefined, bukan true/false).
    try{
      if(window.PB_IS_TRUE_RELOAD===true || window.PB_IS_TRUE_RELOAD===false) return window.PB_IS_TRUE_RELOAD;
    }catch(e){}
    try{
      var entries = performance.getEntriesByType && performance.getEntriesByType('navigation');
      if(entries && entries.length && entries[0].type) return entries[0].type === 'reload';
      if(performance.navigation) return performance.navigation.type === 1; // fallback API lama, TYPE_RELOAD
    }catch(e){}
    return false;
  }

  function scheduleSnapshot(){
    if(restoring) return;
    clearTimeout(timer);
    // FIX: timer di-null begitu jalan, supaya `if(timer)` di pbUndo/flush
    // benar-benar berarti "ada perubahan yang masih menggantung".
    timer = setTimeout(function(){ timer = null; pushSnapshot(); }, DEBOUNCE_MS);
  }

  function applySnapshot(snap, replayNav){
    restoring = true;
    try{
      restoreVars(snap.vars);
      _pbFixPhotoFlagDesync(); // cegah flag "sudah diupload" nyala sendiri tanpa datanya (lihat komentar di definisinya)
      var calls = snap.stepCalls || [];
      var hasNavCall = false;
      for(var i=0;i<calls.length;i++){
        var call = calls[i];
        if(call && call.fn && typeof window[call.fn]==='function'){
          if(PB_NAV_FN_REGEX.test(call.fn)) hasNavCall = true;
          try{ window[call.fn].apply(null, call.args||[]); }catch(e){}
        }
      }
      // FIX BUG "posisi step tidak ikut tersimpan di draft": kalau snapshot
      // ini tidak bawa panggilan navigasi apa pun (mis. hanya dipicu ketikan
      // field), pakai draftCall (nav terakhir yang tercatat, lihat lastNavCall)
      // supaya layar kembali ke step yang benar, bukan Step 1.
      if(replayNav && !hasNavCall && !snap.cards && snap.draftCall && snap.draftCall.fn && typeof window[snap.draftCall.fn]==='function'){
        try{ window[snap.draftCall.fn].apply(null, snap.draftCall.args||[]); }catch(e){}
      }
      if(replayNav) restoreResults(snap.results);   // R2: hasil digambar ulang SEBELUM isian (textarea hasil baru ada setelah ini)
      restoreDom(snap.dom);
      if(replayNav) restoreCards(snap.cards);        // R2: posisi step/kartu/progres dari data, SETELAH isian (event input tidak menimpa)
      if(replayNav) restorePause(snap.pause);        // step yang ditutup sementara karena edit step lain harus bisa muncul lagi
      if(typeof _vbCharResyncAll==='function') _vbCharResyncAll(); // segarkan prompt & tombol pensil sesuai state pulihan
    } finally {
      setTimeout(function(){ restoring = false; }, 60);
    }
  }

  window.pbUndo = function(){
    // BUG FIX (Sept 2026): urutan cek ini SENGAJA dibalik dari draft
    // pertama. Kalau user baru ngetik lalu LANGSUNG Ctrl+Z sebelum jeda
    // 450ms lewat (jadi belum sempat ke-snapshot), draft pertama malah
    // langsung `return` di sini duluan (karena pointer masih nunjuk ke
    // snapshot lama) sehingga ketikan barusan gagal ke-undo. Sekarang
    // "flush" dulu perubahan yang masih menggantung, BARU cek apakah
    // masih ada yang bisa diundo.
    if(timer){ clearTimeout(timer); timer=null; if(!restoring) pushSnapshot(); }
    if(pointer<=0) return; // pointer 0 = state paling awal, tidak ada lagi yang bisa diundo
    pointer--;
    applySnapshot(stack[pointer]);
    updateFab();
  };
  window.pbRedo = function(){
    if(pointer>=stack.length-1) return;
    pointer++;
    applySnapshot(stack[pointer]);
    updateFab();
  };
  // FITUR BARU (permintaan user, Sept 2026): ekspos cara untuk memaksa
  // draft otomatis (localStorage DRAFT_KEY) tersimpan SEKARANG JUGA,
  // dipakai oleh proses yang jalan sendiri tanpa input user (mis. generate
  // bulk video) supaya progresnya (produk yang sudah selesai) tidak
  // hilang kalau user refresh SAAT proses masih berjalan — normalnya draft
  // cuma tersimpan lewat scheduleSnapshot yang didebounce dari ketikan/klik
  // step, yang tidak pernah terpicu selama proses bulk berjalan sendiri di
  // latar belakang.
  window.pbForceSaveDraftNow = function(){
    if(restoring) return;
    clearTimeout(timer); timer=null;
    pushSnapshot();
  };
  // FITUR BARU (permintaan user, Sept 2026): dipakai gesture pull-to-refresh
  // (lihat IIFE PULL-TO-REFRESH CUSTOM di bawah) buat tahu apakah user
  // "sedang mengisi sesuatu" sebelum tampil peringatan konfirmasi refresh.
  // stack.length>1 artinya sudah ada snapshot di atas baseline Step 1 kosong
  // (persis logika yang sama dipakai updateFab() buat nampilin FAB undo/redo).
  window.pbHasUnsavedProgress = function(){
    try{ return stack.length>1 || restoredDraft; }catch(e){ return false; }
  };
  // FIX BUG "peringatan refresh salah di dua arah": dipanggil dari
  // fReset()/vbReset() (setelah user KONFIRMASI mulai dari awal) supaya
  // stack & flag restoredDraft benar-benar bersih — kalau tidak, PTR/F5
  // berikutnya masih mengira ada progres yang belum tersimpan padahal
  // wizard baru saja sengaja dikosongkan.
  window.pbResetProgress = function(){
    try{
      stack = [];
      pointer = -1;
      restoredDraft = false;
      clearDraft();
    }catch(e){}
  };
  // FITUR BARU (permintaan user, Sept 2026): peringatan versi DESKTOP/LAPTOP.
  // Gesture pull-to-refresh custom (lihat IIFE PULL-TO-REFRESH di bawah)
  // cuma jalan lewat event TOUCH, jadi tidak pernah terpicu kalau refresh
  // dilakukan lewat tombol reload browser / F5 / Ctrl+R di laptop — jalur
  // itu langsung manggil location.reload() bawaan browser TANPA pernah
  // lewat kode kita. Satu-satunya cara "menyela" jalur bawaan browser itu
  // adalah event beforeunload: browser SENDIRI yang akan menampilkan
  // dialog konfirmasi (teksnya generik/bawaan, tidak bisa dikustomisasi —
  // ini batasan keamanan standar semua browser, BUKAN bug), dan browser
  // sendiri yang akan membatalkan reload kalau user pilih "Batal/Cancel".
  // Hanya ditampilkan kalau ada progres yang belum tersimpan (sama seperti
  // logika di HP) — kalau masih Step 1 kosong, tidak ada apa-apa yang bisa
  // hilang jadi tidak perlu mengganggu dengan dialog apapun. window.
  // _pbSkipUnloadWarn dicek supaya reload yang SUDAH dikonfirmasi lewat
  // gesture PTR di HP tidak sampai ditanya dua kali (custom confirm lalu
  // dialog bawaan browser lagi).
  window.addEventListener('beforeunload', function(e){
    if(window._pbSkipUnloadWarn) return;
    // FITUR BARU (permintaan user): tur panduan yang lagi berjalan juga
    // dianggap "progres belum tersimpan" — supaya F5/Ctrl+R di tengah tur
    // (langkah 1-4 misalnya, yang belum menyentuh field wizard sama
    // sekali) tetap dapat kesempatan dialog konfirmasi bawaan browser
    // sebelum benar-benar reload, bukan langsung ke-refresh diam-diam.
    let tourAktif=false;
    try{
      tourAktif = pbTourIsRunning();
    }catch(err){}
    if(!window.pbHasUnsavedProgress() && !tourAktif) return;
    e.preventDefault();
    e.returnValue = ''; // wajib diisi (walau string kosong) biar dialog browser tampil
    return '';
  });
  // ── Bungkus semua fungsi global berpola render/step supaya setiap kali
  // dipanggil (dari tombol manapun, atau dari kode internal manapun),
  // sistem tahu step mana yang aktif & langsung menjadwalkan snapshot. ──
  //
  // BUG FIX (Sept 2026): banyak fungsi pbGoStepX saling memanggil satu
  // sama lain di dalamnya (mis. pbGoStep2Next() di ujungnya manggil
  // pbGoStep3()). Draft pertama nyatet `lastStepFn` di SETIAP pemanggilan
  // termasuk yang nested — karena wrapper luar (pbGoStep2Next) baru
  // nulis lastStepFn SETELAH pemanggilan dalamnya (pbGoStep3) selesai,
  // hasil akhirnya lastStepFn ke-timpa jadi fungsi LUAR/pemanggil, bukan
  // fungsi yang beneran terakhir merender layar. Efeknya: undo/redo bisa
  // salah manggil ulang fungsi transisi (bukan fungsi render finalnya),
  // yang belum tentu aman dipanggil ulang sendirian.
  // Fix: pakai counter `wrapDepth` — cuma pemanggilan PALING LUAR (depth
  // 0 sebelum masuk) yang boleh nyatet lastStepFn/jadwal snapshot.
  // Pemanggilan nested di dalamnya dianggap "bagian dari" aksi luar itu.
  var PB_UNDO_STEP_FN_REGEX = /^(pb|f|cs|vb)[A-Za-z0-9_]*(Step|Render)/;
  // FIX BUG (Ringan #10): regex di atas kepancing juga oleh fungsi render
  // GLOBAL yang tidak ada hubungannya dengan step wizard manapun —
  // csRenderAll/pbSavedRender/historyRender/dlRenderBar dipanggil oleh
  // _pullAll() (lihat script sinkron cloud) tiap kali data cloud turun,
  // BUKAN aksi user di wizard. Sebelumnya itu ikut tercatat sebagai
  // "aksi terakhir" & memicu snapshot — bikin stack.length>1 padahal user
  // tidak menyentuh apa pun ("snapshot hantu", lihat catatan di
  // pbHasUnsavedProgress). Daftar ini sengaja dikecualikan dari pelacakan.
  var PB_UNDO_EXCLUDE_FN = {csRenderAll:1, pbSavedRender:1, historyRender:1, dlRenderBar:1, pbSyncRenderStatus:1};
  var wrapDepth = 0;
  function wrapStepFns(){
    var names = Object.getOwnPropertyNames(window);
    for(var i=0;i<names.length;i++){
      var name = names[i];
      if(name.indexOf('pbUndo')===0 || name.indexOf('pbRedo')===0) continue;
      if(PB_UNDO_EXCLUDE_FN[name]) continue;
      if(!PB_UNDO_STEP_FN_REGEX.test(name)) continue;
      if(typeof window[name] !== 'function') continue;
      if(window[name].__pbUndoWrapped) continue;
      (function(name,orig){
        var wrapped = function(){
          var isOutermost = (wrapDepth===0);
          wrapDepth++;
          var ret;
          try{
            ret = orig.apply(this, arguments);
          } finally {
            wrapDepth--;
          }
          if(!restoring && isOutermost){
            pendingStepCalls.push({fn:name, args:Array.prototype.slice.call(arguments)});
            if(pendingStepCalls.length>20) pendingStepCalls.shift(); // jaga-jaga, jangan sampai unbounded
            if(PB_NAV_FN_REGEX.test(name)) lastNavCall = {fn:name, args:Array.prototype.slice.call(arguments)};
            scheduleSnapshot();
          }
          return ret;
        };
        wrapped.__pbUndoWrapped = true;
        window[name] = wrapped;
      })(name, window[name]);
    }
  }

  function updateFab(){
    var u = document.getElementById('pb-undo-fab-undo');
    var r = document.getElementById('pb-undo-fab-redo');
    if(!u||!r) return;
    var hasHistory = stack.length>1;
    u.classList.toggle('show', hasHistory);
    r.classList.toggle('show', hasHistory);
    u.disabled = pointer<=0;
    r.disabled = pointer>=stack.length-1;
  }

  // ── Ketik/centang langsung di field (yang tidak selalu memicu fungsi
  // render tertentu) tetap ikut kejadwal jadi snapshot lewat listener
  // delegasi generik ini. ──────────────────────────────────────────────
  document.addEventListener('input', function(e){
    if(restoring) return;
    var t = e.target;
    if(t && t.closest && t.closest('#app-shell')) scheduleSnapshot();
  }, true);
  document.addEventListener('change', function(e){
    if(restoring) return;
    var t = e.target;
    if(t && t.closest && t.closest('#app-shell')) scheduleSnapshot();
  }, true);

  // ── Shortcut keyboard: Ctrl+Z / Cmd+Z = undo, Ctrl+Shift+Z (atau
  // Ctrl+Y) / Cmd+Shift+Z = redo. Berlaku global di seluruh app. ───────
  //
  // BUG FIX (Sept 2026) — PENTING, bentrok fitur lama: app ini SUDAH
  // punya listener keydown sendiri (cari string CHIP_UNDO_STACK, sekitar
  // baris 4168) yang juga menangkap Ctrl+Z untuk "undo pilihan chip
  // terakhir" — tapi listener itu didaftarkan di FASE BUBBLE, sedangkan
  // listener baru ini di FASE CAPTURE (parameter `true` di akhir), jadi
  // punya kita SELALU jalan lebih dulu. Kalau dibiarkan begitu saja,
  // setiap Ctrl+Z di luar kotak teks bakal memicu DUA sistem undo
  // sekaligus (punya kita + punya lama), saling tabrakan dan bikin hasil
  // undo jadi tidak konsisten/salah. Makanya di sini WAJIB panggil
  // e.stopPropagation() supaya listener lama tidak ikut jalan untuk
  // tombol Z — sistem undo lama otomatis "dimatikan" tanpa perlu hapus
  // kodenya (state CHIP_UNDO_STACK sudah otomatis ke-cover lewat
  // snapshot form/step yang lebih menyeluruh di sistem baru ini).
  document.addEventListener('keydown', function(e){
    var mod = e.ctrlKey || e.metaKey;
    if(!mod) return;
    var k = e.key ? e.key.toLowerCase() : '';
    if(k==='z' && !e.shiftKey){ e.preventDefault(); e.stopPropagation(); window.pbUndo(); }
    else if((k==='z' && e.shiftKey) || k==='y'){ e.preventDefault(); e.stopPropagation(); window.pbRedo(); }
  }, true);

  // FIX REFRESH/CLOSE: ketikan terakhir (<450ms sebelum app ditutup atau
  // pindah ke background) dulu tidak sempat masuk draft.
  document.addEventListener('visibilitychange', function(){
    if(document.hidden && timer && !restoring){ clearTimeout(timer); timer = null; pushSnapshot(); }
  });
  window.addEventListener('pagehide', function(){
    if(timer && !restoring){ clearTimeout(timer); timer = null; pushSnapshot(); }
  });
  window.addEventListener('load', function(){
    setTimeout(function(){
      wrapStepFns();
      // BUG FIX (Sept 2026): snapshot baseline diambil SEBELUM pengguna
      // memicu fungsi step manapun, jadi `lastStepFn` masih kosong
      // (null). Kalau dibiarkan null, nanti pas user undo balik sampai
      // ke titik paling awal ini, sistem cuma restore data field tapi
      // TIDAK memanggil ulang fungsi apapun — akibatnya tampilan step
      // yang lagi kebuka di layar tidak ikut kembali ke Step 1 (cuma
      // isi field-nya yang balik, tampilannya nyangkut di step
      // terakhir). Default-kan ke 'pbGoStep1' — step awal app ini —
      // supaya undo sampai titik ini benar-benar menampilkan ulang Step 1.
      // Kalau ini refresh/reload sengaja dari user (termasuk gesture
      // pull-to-refresh), hapus draft wizard supaya app benar-benar
      // "bersih seperti baru" (balik ke Step 1 kosong) — TIDAK ada
      // pengecualian lagi buat proses bulk video yang masih menggantung
      // (permintaan user, direvisi dari versi sebelumnya): progress bulk
      // yang belum selesai IKUT hilang kalau user refresh di tengah
      // proses, sama seperti field lain. Riwayat/halaman tersimpan/preset
      // karakter/API key/sesi login TIDAK ikut terhapus — beda key sama
      // sekali, itu data permanen bukan draft sesi. Kalau bukan reload
      // (app baru dibuka lagi setelah ditutup total, bukan refresh),
      // draft tetap dicoba dipulihkan seperti biasa.
      // R1: bersih HANYA bila user memintanya eksplisit (penanda diproses di <head>); tidak lagi menebak dari sinyal reload.
      var _isReload = (window.PB_FRESH_START === true);
      // v6.44: kalau tur akun ini belum selesai, draft juga dibuang — kalau
      // tidak, restore draft bisa memutar ulang fungsi step TUR (pbGoStepN)
      // dan menampilkan step tengah-tengah, padahal tur harus mulai dari
      // Langkah 1.
      var _tourBelumSelesai = false;
      try{ _tourBelumSelesai = (typeof pbTourIsPending==='function') && pbTourIsPending(); }catch(e){}
      if(_isReload || _tourBelumSelesai) clearDraft();
      var restoredDraft = tryRestoreDraft();
      setTimeout(function(){ _bootDone=true; },1500);
      if(!restoredDraft){
        pendingStepCalls = [{fn:'pbGoStep1', args:[]}];
        pushSnapshot(); // baseline state paling awal
      }
      // FITUR BARU (permintaan user): habis draft/state (termasuk
      // pbKsFotoUploaded/pbKsFotoDataUrl) selesai dipulihkan, sinkronkan
      // thumbnail foto Karakter Sheet di kartu Subjek Foto (f0) — lihat
      // pbF0KsThumbSync() untuk logikanya.
      try{ if(typeof pbF0KsThumbSync==='function') pbF0KsThumbSync(); }catch(e){}
      // re-scan berkala (murah) buat nangkep fungsi step yang mungkin
      // baru "muncul" ke window belakangan (jarang terjadi, tapi aman)
      setInterval(function(){ if(!document.hidden) wrapStepFns(); }, 8000); // dulu 4 dtk & tetap jalan di background: scan ribuan properti window
    }, 500);
  });
  // FITUR BARU (permintaan user, Sept 2026): begitu user refresh saat
  // sedang di tab Video (atau Foto), setelah reload app HARUS balik
  // ke tab yang SAMA — bukan selalu ke tab Foto (default di markup
  // HTML: <div id="foto" class="page active">). Ini SENGAJA dipisah
  // total dari draft wizard di atas: isian/step tetap mulai dari 0
  // seperti yang sudah disepakati (fungsinya sama), yang dipulihkan
  // di sini CUMA tab mana yang kelihatan di layar — supaya user tidak
  // merasa "kayak buka aplikasi dari awal" padahal cuma refresh biasa.
  // Key 'pb_last_active_page_v1' ditulis di switchPage() (cari
  // stringnya di sana) dan TIDAK ikut PB_SYNC_KEYS/terhapus oleh
  // clearDraft() — murni penanda tab terakhir per perangkat ini.
  // FIX BUG "kedip tab salah setelah refresh": sebelumnya ini jalan di
  // window.load + 500ms, padahal splash sudah dibuang jauh lebih awal
  // (lihat baris ±2719) — tab Foto sempat kelihatan dulu (khususnya di
  // file besar) baru loncat ke Video. Dipindah ke DOMContentLoaded:
  // switchPage() dan elemen nav sudah tersedia di titik itu, dan ini
  // jalan SEBELUM splash dibuang jadi user tidak pernah lihat tab yang salah.
  document.addEventListener('DOMContentLoaded', function(){
    try{
      var _lastPage = localStorage.getItem('pb_last_active_page_v1');
      if(_lastPage && _lastPage!=='foto'){
        var _pageEl = document.getElementById(_lastPage);
        var _btnEl = document.querySelector('.ntab[onclick*="switchPage(\''+_lastPage+'\'"]');
        if(_pageEl && _btnEl) switchPage(_lastPage, _btnEl);
      }
    }catch(e){}
  });
})();
