// fitur/video-info-produk-dan-penonton.js — (dulu js/23-info-produk-audiens.js) dipindah dari <script> di index.html lama (baris 38437). Isi tidak diubah.
/* INFO PRODUK & AUDIENS — tab Produk | Penonton (opsi C, 11 Okt 2026). Sapaan tidak jadi tab: tetap tersembunyi di tab Penonton. */
function vbInfoTab(k){
  var box=document.getElementById('vb-info-tabs');if(!box)return;
  box.setAttribute('data-sel',k);
  [].forEach.call(box.querySelectorAll('.vt'),function(b){var on=b.getAttribute('data-p')===k;b.classList.toggle('on',on);b.setAttribute('aria-selected',on?'true':'false');b.setAttribute('tabindex',on?'0':'-1');});
  [].forEach.call(box.querySelectorAll('.vt-pane'),function(p){p.classList.toggle('on',p.id==='vb-pane-'+k);});
  vbInfoSum();
  try{vbInfoSyncBtns();}catch(e){}
  try{fFitWbody(box);}catch(e){}
}
// Tombol bawah form: tab Produk -> "Lanjut" (pindah ke tab Penonton), tab Penonton -> "Generate Prompt".
// Pengecualian: kalau ada sesi generate yang menggantung ("Lanjutkan N Produk yang Belum", mode resume)
// atau proses AI sedang jalan, tombol utama tetap tampil di kedua tab supaya tidak tersembunyi.
function vbInfoSyncBtns(){
  var box=document.getElementById('vb-info-tabs');
  var gen=document.getElementById('vb-bulk-btn'),nx=document.getElementById('vb-bulk-next-btn');
  if(!box||!gen||!nx)return;
  var sel=box.getAttribute('data-sel');
  var special=gen.dataset.vbMode==='resume'||gen.classList.contains('btn-loading');
  var showNext=(sel==='produk')&&!special;
  nx.classList.toggle('hidden',!showNext);
  gen.classList.toggle('hidden',showNext);
}
function vbInfoNext(){
  // PERMINTAAN USER (Okt 2026): nama produk wajib diisi dulu. Kalau ada yang kosong, kasih tahu user
  // dan TETAP di tab Produk (tidak pindah ke Penonton). Pesannya sama dengan validasi Generate.
  var cnt=parseInt((document.getElementById('vb-bulk-count')||{}).value,10)||1;
  for(var i=0;i<cnt;i++){
    if(window.pbPmIsFashion&&window.pbPmIsFashion(i))continue; // Fashion Editorial: nama tidak wajib
    var ne=document.getElementById('vb-bulk-nama-'+i);
    if(!ne||!ne.value.trim()){
      try{showToast('Nama Produk '+(i+1)+' belum diisi','error');}catch(_e){}
      try{vbInfoTab('produk');}catch(_e){}
      if(ne){try{ne.focus();}catch(_e){}}
      return;
    }
  }
  try{vbInfoTab('penonton');}catch(e){}
  var box=document.getElementById('vb-info-tabs');
  try{if(box&&box.scrollIntoView)box.scrollIntoView({block:'nearest',behavior:'smooth'});}catch(e){}
}
// Balik ke tab Produk dan tutup akordeon Sapaan (dipanggil saat reset / Kembali).
function vbInfoReset(){
  var b=document.getElementById('vb-sapaan-body');
  if(b&&!b.classList.contains('hidden')&&typeof vbToggleSapaan==='function')vbToggleSapaan();
  vbInfoTab('produk');
}
// Ringkasan isi di bawah tab. Sapaan hanya muncul kalau memang diisi.
function vbInfoSum(){
  try{vbInfoSyncBtns();}catch(_e){}
  try{
    var out=document.getElementById('vb-info-sum');if(!out)return;
    var n=parseInt((document.getElementById('vb-bulk-count')||{}).value,10)||1;
    var e0=document.getElementById('vb-bulk-nama-0'),nm=e0?e0.value.trim():'';
    var gap=-1;// indeks produk pertama yang masih kosong (sama seperti validasi Generate)
    for(var i=0;i<n;i++){if(window.pbPmIsFashion&&window.pbPmIsFashion(i))continue;var ei=document.getElementById('vb-bulk-nama-'+i);if(!ei||!ei.value.trim()){gap=i;break;}}
    var tg=((document.getElementById('vb-bulk-target')||{}).value||'').trim();
    var pk=VB_TA_PRESET&&VB_TA_PRESET['vb-bulk-target'];
    if(!tg&&pk)tg=VB_TARGET_AUDIENCE_LABELS[pk]||VB_TARGET_AUDIENCE_PRESETS[pk]||'';
    var sp=(typeof VB_SAPAAN==='string')?VB_SAPAAN:'';
    var t=function(x,e){return '<span class="vt-tg'+(e?' e':'')+'">'+esc(x)+'</span>';};
    var taOwn=0;for(var _k=0;_k<n;_k++){var _e=document.getElementById('vb-bulk-ta-'+_k);if(_e&&_e.value.trim())taOwn++;}
    var html=(gap<0?t((nm||'Produk 1')+(n>1?' +'+(n-1)+' lainnya':'')):'')+(tg?t(tg):'')+(taOwn?t(taOwn+' produk audience sendiri'):'')+(sp?t('Sapaan: '+sp):'');
    // Chip "belum diisi" dihapus; kalau semua kosong, seluruh kotak ringkasan disembunyikan.
    out.classList.toggle('hidden',!html);
    if(out._h!==html){out._h=html;out.innerHTML=html;try{fFitWbody(out);}catch(_e){}}
    var box=document.getElementById('vb-info-tabs');
    box.querySelector('.vt[data-p="produk"]').classList.toggle('dn',gap<0);
    box.querySelector('.vt[data-p="penonton"]').classList.toggle('dn',!!tg||(taOwn>0&&taOwn>=n));
  }catch(e){}
}
(function(){
  var box=document.getElementById('vb-info-tabs');if(!box)return;
  // Pola ARIA Tabs: aria-controls/aria-labelledby, roving tabindex, panah kiri/kanan + Home/End.
  var tabs=[].slice.call(box.querySelectorAll('.vt'));
  tabs.forEach(function(b){var k=b.getAttribute('data-p');b.id=b.id||'vb-tab-'+k;b.setAttribute('aria-controls','vb-pane-'+k);b.setAttribute('tabindex',b.classList.contains('on')?'0':'-1');});
  [].forEach.call(box.querySelectorAll('.vt-pane'),function(pn){pn.setAttribute('aria-labelledby','vb-tab-'+pn.id.replace('vb-pane-',''));});
  var bar=box.querySelector('.vt-bar');
  if(bar)bar.addEventListener('keydown',function(e){
    var k=e.key;if(k!=='ArrowLeft'&&k!=='ArrowRight'&&k!=='Home'&&k!=='End')return;
    var i=tabs.indexOf(document.activeElement);if(i<0)return;
    var j=k==='Home'?0:(k==='End'?tabs.length-1:(i+(k==='ArrowRight'?1:-1)+tabs.length)%tabs.length);
    e.preventDefault();vbInfoTab(tabs[j].getAttribute('data-p'));tabs[j].focus();
  });
  ['input','change','click','focusout'].forEach(function(ev){box.addEventListener(ev,function(){setTimeout(vbInfoSum,0);});});
  if(window.MutationObserver){
    var rows=document.getElementById('vb-bulk-rows');if(rows)new MutationObserver(function(){vbInfoSum();}).observe(rows,{childList:true});
    var v5=document.getElementById('v5');if(v5)new MutationObserver(function(){vbInfoSum();}).observe(v5,{attributes:true,attributeFilter:['class']});
  }
  vbInfoSum();
})();
