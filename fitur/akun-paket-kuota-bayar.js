// fitur/akun-paket-kuota-bayar.js — Paket (tier), kuota harian, upgrade dan pembayaran, enkripsi penyimpanan API key.
// Bagian dari js/10-main-app.js lama (baris 6952–7421). Isi tidak diubah.
// ============================================================
// SECURITY FIX v3: Perkuat seed enkripsi dengan per-user entropy
// Tambahkan random salt yang disimpan per-browser (tidak bisa sama antar user)
// sehingga meski origin + UA sama, key enkripsi tetap unik per instance browser
// ============================================================
function _vaiGetOrCreateSalt(){
  var SALT_KEY='pb_enc_salt_v1';
  try{
    var existing=localStorage.getItem(SALT_KEY);
    if(existing&&existing.length===32)return existing;
    // Buat salt baru 16 byte random → hex string 32 char
    var bytes=crypto.getRandomValues(new Uint8Array(16));
    var salt=Array.from(bytes).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
    localStorage.setItem(SALT_KEY,salt);
    return salt;
  }catch(e){
    // incognito / localStorage tidak tersedia — pakai fallback dari UA
    return (navigator.userAgent||'ua').substring(0,32);
  }
}
async function _vaiGetCryptoKey(){
  // FIX: Seed = origin + UA + per-browser salt yang unik — unik per instance browser
  var _salt=_vaiGetOrCreateSalt();
  let seed=new TextEncoder().encode((location.origin||'pb')+'|'+(navigator.userAgent||'ua').substring(0,40)+'|'+_salt);
  let raw=await crypto.subtle.digest('SHA-256',seed);
  return crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
async function _vaiEncKey(k){
  try{
    let key=await _vaiGetCryptoKey();
    let iv=crypto.getRandomValues(new Uint8Array(12));
    let enc=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(k));
    // Gabung iv + ciphertext → base64
    let combined=new Uint8Array(iv.byteLength+enc.byteLength);
    combined.set(iv,0);combined.set(new Uint8Array(enc),12);
    return btoa(String.fromCharCode(...combined));
  }catch(e){console.warn('_vaiEncKey gagal:',e);return '';}
}
async function _vaiDecKey(b64){
  try{
    let bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
    let iv=bytes.slice(0,12);
    let data=bytes.slice(12);
    let key=await _vaiGetCryptoKey();
    let dec=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,data);
    return new TextDecoder().decode(dec);
  }catch(e){console.warn('_vaiDecKey gagal:',e);return '';}
}

// ── LIMIT PAKAI AI (dl = "download/daily limit") — TIER BERBAYAR ────────
// Gratis 6/hari, Standar 25/hari, Premium 50/hari (lihat PB_TIER_CONFIG).
// Dihitung PER AKUN (uid Google), bukan per device — tersimpan di
// localStorage utk cek instan/offline, disinkron ke Firestore tiap kali
// generate (lihat pbCloudPushQuota) supaya akurat lintas HP/laptop.
function pbTodayStr(){
  var d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
// Tier efektif user SEKARANG ini. Kalau masa aktif tier berbayar sudah
// lewat (pb_tier_expiry), otomatis dianggap balik ke 'free' tanpa perlu
// admin ubah apa-apa lagi di Firestore.
function pbGetTier(){
  var tier='free', expiry=0;
  try{ tier=localStorage.getItem('pb_tier_v1')||'free'; }catch(e){}
  try{ expiry=Number(localStorage.getItem('pb_tier_expiry_v1'))||0; }catch(e){}
  if(tier!=='free' && expiry && Date.now()>expiry) tier='free';
  if(!window.PB_TIER_CONFIG || !window.PB_TIER_CONFIG[tier]) tier='free';
  return tier;
}
function pbGetQuota(){
  var today=pbTodayStr(), q={date:today,count:0};
  try{
    var raw=localStorage.getItem('pb_quota_v1');
    if(raw){ var parsed=JSON.parse(raw); if(parsed && parsed.date===today) q={date:today,count:parsed.count||0}; }
  }catch(e){}
  return q;
}
// BUG FIX KRITIS (audit Sept 2026, setelah fitur "1 panggilan aja untuk
// banyak produk"): dlCheckBeforeCall/dlIncrement SEBELUMNYA selalu
// menghitung SATU unit jatah per panggilan fungsi ini, dengan asumsi diam-
// diam "1 panggilan AI = ±1 unit jatah" — asumsi itu dulu benar KARENA bulk
// generate dipecah per BATCH_SIZE=3 produk (lihat histori _vbRunBulkGenerate/
// vbRegenerateAllBulk), jadi dlIncrement() otomatis kepanggil ceil(N/3) kali
// buat N produk (proporsional ke jumlah produk sungguhan). Sejak SEMUA
// produk bulk digabung jadi SATU panggilan API saja (berapa pun jumlahnya,
// sampai 30), dlCheckBeforeCall/dlIncrement di loop bulk cuma kepanggil TEPAT
// 1 KALI per sesi generate — tidak peduli sesi itu isinya 1 produk atau 30
// produk sekaligus. Akibatnya jatah harian bisa jebol jauh dari yang
// seharusnya dijatah per tier, tanpa jatah harian kepakai secara wajar.
// Sekarang KEDUA fungsi menerima parameter opsional `units` (jumlah unit
// jatah yang dipakai/dibutuhkan aksi ini, default 1 — SAMA PERSIS seperti
// perilaku lama untuk semua pemanggil single-produk yang tidak diubah).
// UPDATE (audit biaya API, Sept 2026): pemanggil bulk sekarang mengirim
// `units = jumlah produk sungguhan dalam panggilan ini secara LANGSUNG`
// (bukan lagi dibagi 3) — karena biaya API riil per produk itu LINEAR
// (tidak ada efek hemat dari nge-batch banyak produk sekaligus), jadi
// 1 unit jatah HARUS sama persis dengan 1 produk supaya angka limit di
// PB_TIER_CONFIG (dan teks "X produk/hari" di UI upgrade) benar-benar
// akurat, bukan cuma sepertiga dari kapasitas produk riil yang bisa dicapai
// lewat bulk seperti versi rasio /3 sebelumnya.
function dlCheckBeforeCall(units){
  units=Math.max(1,units||1);
  // FIX KEAMANAN #2 (audit upgrade member, Sept 2026): sekalian tarik ulang
  // angka asli dari cloud tiap kali mau generate (lihat pbCloudRefreshQuota
  // di dekat pbCloudPushQuota) — diam-diam, tidak ditunggu, jadi tidak
  // memperlambat pengecekan yang SEKARANG ini. Kalau ternyata local sempat
  // "direset" manual (localStorage), angkanya bakal balik akurat sebelum
  // percobaan generate BERIKUTNYA.
  try{ if(typeof window.pbCloudRefreshQuota==='function') window.pbCloudRefreshQuota(); }catch(e){}
  var tier=pbGetTier(), cfg=window.PB_TIER_CONFIG[tier], q=pbGetQuota();
  // FIX (lanjutan bug di atas): dulu cuma cek "jatah SEKARANG sudah habis
  // atau belum" (q.count>=cfg.limit) — begitu units>1 (sesi bulk banyak
  // produk), itu cukup buat LOLOS walau sisa jatah tidak cukup menampung
  // seluruh unit yang bakal dipakai sesi ini, jatah baru kelihatan jebol
  // (minus/negatif secara efektif) SETELAH dlIncrement(units) dipanggil di
  // akhir — padahal token Claude buat sesi itu sudah kepakai/dibayar duluan.
  // Sekarang dicek DI MUKA: q.count+units>cfg.limit, supaya sesi yang
  // butuh jatah lebih dari sisa yang ada ditolak SEBELUM request AI dikirim
  // sama sekali (untuk units=1, ini identik persis dengan cek lama).
  if(q.count+units>cfg.limit){
    // Buka modal upgrade otomatis pas limit kena (kecuali sudah Premium) —
    // dipasang di SATU titik ini (bukan di tiap call site generate) supaya
    // semua alur generate yang ada (single/bulk/wordfix/dst, ada belasan
    // titik pemanggil dlCheckBeforeCall di file ini) otomatis ikut tanpa
    // perlu diubah satu-satu.
    try{ if(tier!=='premium' && typeof pbOpenUpgradeModal==='function') pbOpenUpgradeModal(); }catch(e){}
    var sisa=Math.max(0,cfg.limit-q.count);
    return {
      ok:false,
      tier:tier,
      message: units>1
        ? ('Jatah generate '+cfg.label+' hari ini tersisa '+sisa+' dari '+cfg.limit+', tidak cukup untuk sesi bulk ini (butuh setara '+units+'). '+
           (tier==='premium' ? 'Coba kurangi jumlah produk sekaligus, atau lagi besok ya.' : 'Coba kurangi jumlah produk sekaligus, atau upgrade buat jatah lebih besar →'))
        : ('Jatah generate '+cfg.label+' hari ini sudah habis ('+cfg.limit+'/'+cfg.limit+'). '+
           (tier==='premium' ? 'Coba lagi besok ya.' : 'Upgrade buat lanjut generate hari ini juga →'))
    };
  }
  return {ok:true};
}
function dlIncrement(units){
  units=Math.max(1,units||1);
  var q=pbGetQuota();
  q.count=(q.count||0)+units;
  try{ localStorage.setItem('pb_quota_v1', JSON.stringify(q)); }catch(e){}
  try{ if(typeof window.pbCloudPushQuota==='function') window.pbCloudPushQuota(q); }catch(e){}
  dlRenderBar();
}
function dlRenderBar(){
  var bar=document.getElementById('daily-limit-bar');
  if(!bar) return;
  var tier=pbGetTier(), cfg=window.PB_TIER_CONFIG[tier], q=pbGetQuota();
  var sisa=Math.max(0,cfg.limit-q.count);
  var pct=Math.max(0,Math.min(100, 100-Math.round((q.count/cfg.limit)*100)));
  var dot=document.getElementById('dlb-dot'), fill=document.getElementById('dlb-fill');
  var countEl=document.getElementById('dlb-count'), resetEl=document.getElementById('dlb-reset');
  var label=document.getElementById('dlb-tier-label');
  var state = sisa<=0 ? 'empty' : (sisa<=Math.ceil(cfg.limit*0.2) ? 'warn' : 'ok');
  if(dot) dot.className='dlb-dot '+state;
  if(fill){ fill.style.width=pct+'%'; fill.style.background = state==='empty'?'var(--red)':(state==='warn'?'var(--warning)':'var(--green)'); }
  if(countEl) countEl.textContent = q.count+'/'+cfg.limit;
  if(resetEl) resetEl.textContent = sisa+' sisa hari ini • reset tengah malam';
  var _ts = (typeof window.pbTierState === 'function') ? window.pbTierState() : '';
  if(label) label.textContent = cfg.label + (_ts === 'loading' ? ' · memuat…' : (_ts === 'failed' ? ' · gagal muat' : ''));
  bar.style.display='flex';
}
function pbToggleLimitBar(){
  var bar=document.getElementById('daily-limit-bar');
  if(!bar) return;
  if(bar.classList.contains('expanded')){ bar.classList.remove('expanded'); return; }
  bar.classList.add('expanded');
  var closeOutside=function(ev){
    if(!bar.contains(ev.target)){ bar.classList.remove('expanded'); document.removeEventListener('click',closeOutside,true); }
  };
  setTimeout(function(){ document.addEventListener('click',closeOutside,true); },0);
}

// FIX KEAMANAN #2 lanjutan (Sept 2026): Worker proxy sekarang balas 401
// (token login kadaluarsa/tidak valid) atau 403 (login_required /
// quota_exceeded — lihat komentar di Worker). Tanpa penanganan khusus,
// pesan-pesan ini bakal ikut fallback generik "Status 403: ..." yang
// kelihatan seperti error teknis, padahal ini pesan yang MEMANG dibuat
// buat dibaca user apa adanya. Dipanggil dari 2 titik penanganan error
// (mode single & bulk) SEBELUM fallback generik — return string pesan
// kalau ini error Worker yang dikenali, atau null kalau bukan (biar
// pemanggil lanjut ke penanganan status lain seperti biasa).
function _pbWorkerAuthQuotaMsg(status,errJson){
  var t=errJson&&errJson.error&&errJson.error.type;
  var m=errJson&&errJson.error&&errJson.error.message;
  if(status===401&&t==='invalid_token'){
    return (m||'Sesi login kamu sudah kadaluarsa.')+' Coba logout lalu login lagi, ya.';
  }
  if(status===403&&(t==='quota_exceeded'||t==='login_required')){
    try{ if(typeof pbOpenUpgradeModal==='function') pbOpenUpgradeModal(); }catch(e){}
    return m||'Jatah generate hari ini sudah habis.';
  }
  // Model khusus admin (Worker menolak model selain Haiku untuk non-admin).
  // Tidak membuka modal upgrade — ini bukan soal kuota.
  if(status===403&&t==='model_not_allowed'){
    return m||'Opsi ini khusus admin. Muat ulang aplikasi lalu coba lagi.';
  }
  return null;
}

// ── MODAL UPGRADE TIER ───────────────────────────────────────────────────
var _pbUpgradeSelectedTier=null;

// ── Tampilan upgrade gaya "sheet": harga & limit dibaca dari PB_TIER_CONFIG ──
var _pbUpgPlan='premium', _pbUpgPer=2, _pbUpgradeSelectedPer=2;
function pbUpgPer(j){ return (window.PB_PERIOD_CONFIG||[])[j]||{label:'Bulanan',months:1,days:30,disc:0}; }
function pbUpgPrice(t,j){ var p=pbUpgPer(j); return Math.round(window.PB_TIER_CONFIG[t].price*p.months*(1-p.disc)/1000)*1000; }
function pbUpgSetPlan(k,j){
  if(k) _pbUpgPlan=k;
  if(typeof j==='number') _pbUpgPer=j;
  var C=window.PB_TIER_CONFIG, P=window.PB_PERIOD_CONFIG, d=document.getElementById('upgrade-modal-dlg');
  if(!C||!P||!d||!C[_pbUpgPlan]) return;
  var rp=function(n){return 'Rp'+n.toLocaleString('id-ID');};
  var ae=document.activeElement, fk=(ae&&d.contains(ae)&&ae.dataset)?(ae.dataset.j!==undefined?'#upg-chips [data-j="'+ae.dataset.j+'"]':(ae.dataset.k?'#upg-grid [data-k="'+ae.dataset.k+'"]':null)):null;
  var t=_pbUpgPlan, per=pbUpgPer(_pbUpgPer), m=per.months, tot=pbUpgPrice(t,_pbUpgPer), hemat=C[t].price*m-tot;
  d.classList.toggle('pt',t==='premium');
  document.getElementById('upg-grid').innerHTML=['standar','premium'].map(function(x){
    var c=C[x], on=(x===t);
    return '<button type="button" class="upg-pk'+(on?' on':'')+'" data-k="'+x+'" aria-pressed="'+on+'">'
      +(x==='premium'?'<em>Paling lengkap</em>':'')
      +'<b>'+c.label+'</b><strong>'+rp(c.price)+'<span>/bln</span></strong><small>'+c.limit+' produk/hari</small></button>';
  }).join('');
  document.getElementById('upg-chips').innerHTML=P.map(function(p,i){
    var on=(i===_pbUpgPer);
    return '<button type="button" class="upg-pill'+(on?' on':'')+'" data-j="'+i+'" aria-pressed="'+on+'">'+p.label+'<em>'+(p.disc?'-'+Math.round(p.disc*100)+'%':'')+'</em></button>';
  }).join('');
  document.getElementById('upg-sum').innerHTML='<div><small>Total ditagih</small><b>'+rp(tot)+'</b></div>'
    +'<div class="r"><small>'+(m>1?'setara '+rp(Math.round(tot/m))+'/bln':'per bulan')+'</small><b>'+(hemat>0?'Hemat '+rp(hemat):'Tanpa diskon')+'</b></div>';
  var f=[C[t].limit+' produk per hari'].concat(t==='premium'
    ?['Tema Onyx Platinum eksklusif','Prompt foto &amp; video Veo 3','Semua fitur Standar']
    :['Tema Obsidian Glass','Prompt foto &amp; video Veo 3']);
  document.getElementById('upg-list').innerHTML=f.map(function(x){return '<li>'+x+'</li>';}).join('');
  document.getElementById('upg-cta-amt').textContent=rp(tot);
  document.getElementById('upg-cta-sub').textContent=C[t].label+', '+per.label+'. Aktif otomatis setelah bayar';
  if(fk){ var nf=d.querySelector(fk); if(nf) nf.focus({preventScroll:true}); }
}
function pbUpgInit(){
  var C=window.PB_TIER_CONFIG, t=pbGetTier(), cur=document.getElementById('upg-cur'), d=document.getElementById('upgrade-modal-dlg');
  if(cur&&C&&C[t]) cur.textContent='Paket kamu: '+C[t].label+', '+C[t].limit+' produk/hari';
  var h=document.getElementById('upg-h');
  if(h) h.textContent=(t==='premium')?'Perpanjang paket Premium-mu':'Naik paket, produk harianmu makin banyak';
  if(d) d.scrollTop=0;
  pbUpgSetPlan('premium',2);
}

function pbOpenUpgradeModal(){
  var ov=document.getElementById('upgrade-modal-overlay');
  if(!ov) return;
  document.getElementById('daily-limit-bar').classList.remove('expanded');
  pbBackToUpgradePlans();
  var tag=document.getElementById('upg-current-tag');
  if(tag){
    var t=pbGetTier();
    tag.textContent = t==='free' ? 'paket kamu sekarang' : ('paket dasar — kamu sekarang di '+window.PB_TIER_CONFIG[t].label);
  }
  ov.style.display='flex';
  try{pbUpgInit();}catch(e){}
}
function pbCloseUpgradeModal(){
  var ov=document.getElementById('upgrade-modal-overlay');
  if(ov) ov.style.display='none';
}
function pbBackToUpgradePlans(){
  var p1=document.getElementById('upgrade-plans-panel'), p2=document.getElementById('upgrade-payment-panel');
  if(p1) p1.style.display='flex';
  if(p2) p2.style.display='none';
}
function pbSelectUpgradeManual(tier){
  var cfg=window.PB_TIER_CONFIG[tier];
  if(!cfg) return;
  _pbUpgradeSelectedTier=tier; _pbUpgradeSelectedPer=_pbUpgPer;
  var pay=window.PB_PAYMENT_CONFIG;
  document.getElementById('upgrade-plans-panel').style.display='none';
  document.getElementById('upgrade-payment-panel').style.display='block';
  document.getElementById('upg-pay-tier-label').textContent=cfg.label+' ('+pbUpgPer(_pbUpgradeSelectedPer).label+')';
  document.getElementById('upg-pay-amount').textContent='Rp'+pbUpgPrice(tier,_pbUpgradeSelectedPer).toLocaleString('id-ID');
  pbRenderPayMethods();
}
// ── PEMBAYARAN iPaymu (31 Okt 2026) ─────────────────────────────────────
// "Lanjut bayar" → minta link bayar ke Worker (/ipaymu/create) → buka halaman iPaymu
// (Virtual Account, QRIS, e-wallet). Harga dihitung ulang di server. Setelah bayar,
// iPaymu memanggil Worker (/ipaymu/callback) yang mengaktifkan paket otomatis, lalu
// user kembali ke app dengan ?pay=return&ref=... dan app mengecek statusnya.
// Kalau Worker belum dikonfigurasi (HTTP 501), app jatuh ke panel transfer manual.
var _pbPayBusy=false;
function _pbPayBase(){ return (typeof ANTHROPIC_ENDPOINT!=='undefined'&&ANTHROPIC_ENDPOINT)?ANTHROPIC_ENDPOINT:'https://promptbuilder.vid1hihu.workers.dev'; }
async function pbSelectUpgradeTier(tier){
  var cfg=window.PB_TIER_CONFIG[tier];
  if(!cfg||_pbPayBusy) return;
  _pbPayBusy=true;
  var btn=document.querySelector('#upgrade-plans-panel .upg-cta'), old=btn?btn.innerHTML:'';
  if(btn){ btn.disabled=true; btn.textContent='Membuka halaman pembayaran…'; }
  var redirected=false;
  try{
    var tok=''; try{ tok=await _pbGetFirebaseIdToken(); }catch(e){}
    if(!tok){ showToast('Login dulu ya, lalu coba lagi.','error'); return; }
    var per=pbUpgPer(_pbUpgPer);
    var r=await fetch(_pbPayBase()+'/ipaymu/create',{method:'POST',headers:{'Content-Type':'application/json','X-Firebase-Token':tok},body:JSON.stringify({tier:tier,months:per.months})});
    var j=null; try{ j=await r.json(); }catch(e){}
    if(r.ok&&j&&j.url){
      try{ sessionStorage.setItem('pb_pay_ref',j.ref); }catch(e){}
      redirected=true; location.href=j.url; return;
    }
    if(r.status===501){ pbSelectUpgradeManual(tier); return; }
    showToast((j&&j.error&&j.error.message)||'Gagal membuka pembayaran. Coba lagi.','error');
  }catch(e){
    showToast('Gagal terhubung ke server pembayaran. Cek koneksi lalu coba lagi.','error');
  }finally{
    _pbPayBusy=false;
    if(btn&&!redirected){ btn.disabled=false; btn.innerHTML=old; }
  }
}
// Dipanggil saat app dibuka lagi setelah user bayar / batal di halaman iPaymu.
async function pbCheckPayReturn(){
  var q; try{ q=new URLSearchParams(location.search); }catch(e){ return; }
  var st=q.get('pay'); if(!st) return;
  var ref=q.get('ref')||''; if(!ref){ try{ ref=sessionStorage.getItem('pb_pay_ref')||''; }catch(e){} }
  try{ history.replaceState(null,'',location.pathname); }catch(e){}
  if(st==='cancel'){ showToast('Pembayaran dibatalkan. Kamu bisa coba lagi kapan saja.','error'); return; }
  if(!ref) return;
  showToast('Memeriksa pembayaranmu…','success');
  for(var i=0;i<22;i++){
    try{
      var tok=await _pbGetFirebaseIdToken();
      if(tok){
        var r=await fetch(_pbPayBase()+'/ipaymu/status',{method:'POST',headers:{'Content-Type':'application/json','X-Firebase-Token':tok},body:JSON.stringify({ref:ref})});
        var j=await r.json();
        if(j&&j.status==='paid'){
          try{ if(window.pbReloadTier) await window.pbReloadTier(); }catch(e){}
          showToast('Pembayaran berhasil! Paketmu sudah aktif.','success');
          return;
        }
        if(j&&j.status==='failed'){ showToast('Pembayaran gagal atau kedaluwarsa. Silakan coba lagi.','error'); return; }
      }
    }catch(e){}
    await new Promise(function(res){ setTimeout(res,4000); });
  }
  showToast('Pembayaran belum terkonfirmasi. Kalau kamu sudah bayar, tekan "Muat ulang paket" beberapa menit lagi.','error');
}
window.addEventListener('load',function(){ setTimeout(pbCheckPayReturn,1500); });
function pbPayList(){
  var pay=window.PB_PAYMENT_CONFIG||{};
  return (pay.methods||[]).filter(function(m){ return m && m.noRek && String(m.noRek).indexOf('ISI')!==0 && String(m.atasNama||'').indexOf('ISI')!==0; });
}
function pbRenderPayMethods(){
  var box=document.getElementById('upg-pay-methods');
  if(!box) return;
  var list=pbPayList();
  if(!list.length){
    box.innerHTML='<div class="info-card" style="margin-bottom:10px;"><div style="font-size:var(--fs-sm);color:var(--muted);">Metode pembayaran belum tersedia. Silakan coba lagi nanti.</div></div>';
    return;
  }
  box.innerHTML=list.map(function(m,i){
    return '<div class="info-card" style="margin-bottom:10px;"><div style="flex:1;min-width:0;">'+
      '<div style="font-size:var(--fs-sm);color:var(--muted);margin-bottom:2px;">'+esc(m.nama)+'</div>'+
      '<div style="font-family:\'Geist Mono\',monospace;font-size:var(--fs-base);font-weight:700;word-break:break-all;">'+esc(m.noRek)+'</div>'+
      '<div style="font-size:var(--fs-sm);color:var(--muted);">a.n. '+esc(m.atasNama)+'</div></div>'+
      '<button type="button" class="btn" style="width:auto;flex:none;margin:0 0 0 10px;padding:8px 14px;min-height:36px;" onclick="pbCopyPayNo('+i+')">Salin</button></div>';
  }).join('');
}
function pbCopyPayNo(i){
  var list=pbPayList(), m=list[i];
  if(!m) return;
  var no=String(m.noRek).replace(/\s+/g,'');
  var done=function(){ showToast('Nomor '+m.nama+' disalin','success'); };
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(no).then(done,function(){ showToast('Gagal menyalin, salin manual ya','error'); }); return; }
  }catch(e){}
  showToast('Salin manual: '+no,'error');
}
// User klik "Sudah Transfer": catat permintaan upgrade ke Firestore (biar
// admin lihat di Firebase Console) lalu buka WhatsApp dengan pesan siap
// pakai berisi email + tier yang dipilih, supaya admin gampang cocokkan
// dengan mutasi transfer sebelum naikkan tier manual (lihat instruksi
// lengkap di dekat PB_TIER_CONFIG, awal file).
function pbConfirmUpgradeWA(){
  var tier=_pbUpgradeSelectedTier, per=pbUpgPer(_pbUpgradeSelectedPer), total=(tier&&window.PB_TIER_CONFIG[tier])?pbUpgPrice(tier,_pbUpgradeSelectedPer):0;
  var cfg=window.PB_TIER_CONFIG[tier];
  if(!cfg) return;
  var email='';
  try{ var u=JSON.parse(localStorage.getItem('pb_auth_user')||'null'); email=(u&&u.email)||''; }catch(e){}
  try{
    if(typeof window.pbCloudPushUpgradeRequest==='function'){
      window.pbCloudPushUpgradeRequest({tier:tier, price:total, period:per.label, months:per.months, days:per.days, email:email, requestedAt:Date.now(), status:'pending'});
    }
  }catch(e){}
  showToast('Permintaan upgrade tercatat. Paket aktif setelah pembayaranmu kami cek.','success');
  pbCloseUpgradeModal();
}

async function vaiSaveKey(){
  let key=document.getElementById('gemini-api-key').value.trim();
  let errBox=document.getElementById('vai-key-error');
  if(errBox){errBox.classList.add('hidden');errBox.textContent='';}
  if(!key){
    showToast('Paste API Key dulu ya!','error');
    if(errBox){errBox.textContent='Kotaknya masih kosong — paste dulu API Key dari Anthropic Console.';errBox.classList.remove('hidden');}
    return;
  }
  if(!_isValidGeminiKey(key)){
    showToast('Kode tidak valid — harus diawali sk-ant-...','error');
    if(errBox){
      let preview=key.length>12?key.substring(0,12)+'...':key;
      errBox.innerHTML='Kode yang kamu paste (<code style="background:rgba(255,255,255,0.1);padding:1px 4px;border-radius:var(--radius-2xs);">'+esc(preview)+'</code>) <strong>bukan API Key Claude yang benar</strong>. API Key asli diawali <code style="background:rgba(255,255,255,0.1);padding:1px 4px;border-radius:var(--radius-2xs);">sk-ant-...</code>. Kemungkinan kamu copy dari tempat yang salah — buka lagi <strong>console.anthropic.com/settings/keys</strong> dan copy kode API Key-nya.';
      errBox.classList.remove('hidden');
    }
    return;
  }
  if(key.length<30){
    showToast('Kode kelihatannya kependekan/kepotong — coba copy ulang','error');
    if(errBox){errBox.textContent='Kode ini cuma '+key.length+' karakter — kelihatannya kepotong pas di-copy. API Key Claude biasanya jauh lebih panjang. Coba copy ulang dari console.anthropic.com/settings/keys, pastikan ke-copy semua.';errBox.classList.remove('hidden');}
    return;
  }
  // FIX #10: Disable tombol segera setelah validasi lolos — cegah double-klik
  let saveBtn=document.querySelector('#vai-key .btn');
  if(saveBtn){saveBtn.disabled=true;saveBtn.innerHTML='<svg class="icon"><use href="#ic-check"></use></svg> Tersambung...';}
  VAI.apiKey=key;
  // SECURITY FIX v2: Simpan dengan AES-GCM 256-bit (async) — bukan XOR palsu
  try{
    let enc=await _vaiEncKey(key);
    if(enc) localStorage.setItem('pb_vai_k',enc);
    if(typeof pbCloudPushApiKeyPlain==='function')pbCloudPushApiKeyPlain(key);
  }catch(e){/* incognito / SubtleCrypto tidak tersedia — key hanya di memory sesi ini */}
  // Hapus key lama plain text jika masih ada
  try{localStorage.removeItem('pb_gemini_api_key');localStorage.removeItem('gemini_api_key');localStorage.removeItem('_vai_k');}catch(e){}
  // BUG X FIX: Clear input value + reset type ke password setelah save berhasil
  // Tanpa ini: key masih tampil di field (terutama jika user toggle visibility ke 'text' sebelum save)
  let keyInputEl=document.getElementById('gemini-api-key');
  if(keyInputEl){
    keyInputEl.value='';
    keyInputEl.type='password';
    keyInputEl.placeholder=key.substring(0,8)+'••••••••••••••••••••••••••••••• (tersimpan)';
  }
  // BUG X FIX: Reset toggle visibility icon jika sudah diubah ke 'show'
  // FIX TAMBAHAN: selector sebelumnya cari '.btn[onclick*=...]' padahal tombol
  // ini TIDAK punya class 'btn' sama sekali (cuma inline style) — jadi query
  // ini selalu balik null dan baris di bawahnya tidak pernah benar-benar
  // jalan. Diperbaiki jadi cari langsung dari attribute onclick-nya saja.
  // Ikonnya sendiri sekarang SVG <use> (lihat vaiToggleKeyVisibility), jadi
  // resetnya ganti href ke '#ic-eye', bukan textContent='' (yang tadinya
  // malah akan menghapus SVG-nya kalau selector ini kebetulan match).
  let visBtn=document.querySelector('[onclick*="vaiToggleKeyVisibility"]');
  if(visBtn){let use=visBtn.querySelector('use');if(use)use.setAttribute('href','#ic-eye');}
  // BUG Y FIX: Re-enable saveBtn — tanpa ini saat vaiBack ke vai-key tombol tetap disabled
  if(saveBtn){saveBtn.disabled=false;saveBtn.innerHTML='<svg class="icon"><use href="#ic-check"></use></svg> Simpan & Mulai';}
  vaiDoneCard('vai-key','vai-key-ans','Terhubung ke Claude AI');
  dlRenderBar(); // Update limit bar sesuai API key baru
  showToast('Berhasil tersambung ke AI!','success');
  setTimeout(()=>closeApiKeyModal(),700);
}
async function vaiShowSavedKey(silent){
  try{
    let _enc=localStorage.getItem('pb_vai_k');
    let _plain=localStorage.getItem('pb_gemini_api_key')||localStorage.getItem('gemini_api_key');
    let saved=_enc?(await _vaiDecKey(_enc)):(_plain||'');
        if(saved&&_isValidGeminiKey(saved)){
      VAI.apiKey=saved; // AUDIT-FIX #4: simpan di memory, tidak di DOM value
      var _ki=document.getElementById('gemini-api-key');
      if(_ki){_ki.value='';_ki.placeholder=saved.substring(0,8)+'••••••••••••••••••••••••••••••• (tersimpan)';}
      dlRenderBar(); // Update bar sesuai key yang dimuat
      if(!silent)showToast('API Key sebelumnya dimuat — klik Simpan & Mulai untuk lanjut.','success');}
    else{if(!silent)showToast('Belum ada API Key tersimpan.','error');}
  }catch(e){if(!silent)showToast('Tidak bisa baca key tersimpan di mode ini.','error');}
}
function vaiUpdateProgress(){ /* wizard foto->video dihapus; call site sengaja dibiarkan no-op agar tidak error */ }
function vaiToggleKeyVisibility(btn){var input=document.getElementById('gemini-api-key');if(!input)return;var use=btn.querySelector('use');if(input.type==='password'){input.type='text';if(use)use.setAttribute('href','#ic-eye-off');}else{input.type='password';if(use)use.setAttribute('href','#ic-eye');}}

