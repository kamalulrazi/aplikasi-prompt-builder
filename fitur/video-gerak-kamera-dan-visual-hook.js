// fitur/video-gerak-kamera-dan-visual-hook.js — (dulu js/24-gerak-kamera.js) dipindah dari <script> di index.html lama (baris 38530). Isi tidak diubah.
/* PERGERAKAN KAMERA — tab Kamera | Visual Hook (11 Okt 2026). Tab kiri Kamera, tab kanan Visual Hook.
   "Lanjut" di tab Kamera -> pindah ke tab Visual Hook; "Kembali" di tab Visual Hook -> balik ke tab Kamera (tidak menghapus pilihan).
   "Lanjut" di tab Visual Hook -> simpan kedua pilihan & lanjut ke step berikutnya (vbCamConfirm). */
function vbCamTab(k,quiet){
  var box=document.getElementById('vcam-tabs');if(!box)return;
  var hook=(k==='hook'),sel=hook?'hook':'kamera';
  box.setAttribute('data-sel',sel);
  [].forEach.call(box.querySelectorAll('.vt'),function(b){var on=b.getAttribute('data-p')===sel;b.classList.toggle('on',on);b.setAttribute('aria-selected',on?'true':'false');b.setAttribute('tabindex',on?'0':'-1');});
  var pm=document.getElementById('vcam-pane-move'),ph=document.getElementById('vcam-pane-hook');
  if(pm)pm.classList.toggle('on',!hook);
  if(ph)ph.classList.toggle('on',hook);
  var nx=document.getElementById('vcam-next-btn'),cf=document.getElementById('vcam-confirm-btn');
  if(nx)nx.classList.toggle('hidden',hook);
  if(cf)cf.classList.toggle('hidden',!hook);
  var skm=document.getElementById('vcam-skip-move-btn'),skh=document.getElementById('vcam-skip-hook-btn');
  if(skm)skm.classList.toggle('hidden',hook);
  if(skh)skh.classList.toggle('hidden',!hook);
  // Pelat emas di dalam panel chip baru bisa diukur setelah panelnya tampil.
  var place=function(){['vcam-chips','vcam-hook-chips'].forEach(function(id){var c=document.getElementById(id);if(c){try{_vbCamPlate(c);}catch(e){}}});};
  place();try{requestAnimationFrame(place);}catch(e){}
  try{vbCamDots();}catch(e){}
  try{fFitWbody(box);}catch(e){}
  // Gulir hanya kalau user yang pindah tab; pindah otomatis (step dibuka / di-reset / Undo) tidak boleh menggeser halaman.
  if(!quiet){try{if(box.scrollIntoView)box.scrollIntoView({block:'nearest',behavior:'smooth'});}catch(e){}}
}
// Titik kecil di tab = ada pilihan (belum dikonfirmasi) di tab itu.
function vbCamDots(){
  var box=document.getElementById('vcam-tabs');if(!box)return;
  var a=box.querySelector('.vt[data-p="kamera"]'),b=box.querySelector('.vt[data-p="hook"]');
  if(a)a.classList.toggle('dn',!!_vbCamPendMove);
  if(b)b.classList.toggle('dn',!!_vbCamPendHook);
}
(function(){
  var box0=document.getElementById('vcam-tabs');if(!box0)return;
  var $=function(i){return document.getElementById(i);};
  // Elemen selalu dicari ulang (bukan disimpan) supaya tetap benar kalau DOM-nya pernah digambar ulang.
  var tabBox=function(){return $('vcam-tabs');};
  var curTab=function(){var b=tabBox();return b?b.getAttribute('data-sel'):'';};
  // ARIA Tabs: panah kiri/kanan + Home/End.
  var bar=box0.querySelector('.vt-bar');
  if(bar)bar.addEventListener('keydown',function(e){
    var k=e.key;if(k!=='ArrowLeft'&&k!=='ArrowRight'&&k!=='Home'&&k!=='End')return;
    var tabs=[].slice.call(tabBox().querySelectorAll('.vt'));
    var i=tabs.indexOf(document.activeElement);if(i<0)return;
    var j=k==='Home'?0:(k==='End'?tabs.length-1:(i+(k==='ArrowRight'?1:-1)+tabs.length)%tabs.length);
    e.preventDefault();vbCamTab(tabs[j].getAttribute('data-p'));tabs[j].focus();
  });
  // KEMBALI di tab Visual Hook = balik ke tab Kamera (bukan mundur ke step sebelumnya & tidak menghapus apa pun).
  // Tombol Kembali wizard dibuat pbw-js dengan handler sendiri, jadi dicegat di fase capture.
  document.addEventListener('click',function(e){
    var t=e.target&&e.target.closest?e.target.closest('.pbw-bk'):null;if(!t)return;
    var h=$('pbw-head');
    if(h&&h.dataset.cid==='vcam'&&curTab()==='hook'){
      e.stopImmediatePropagation();e.preventDefault();
      vbCamTab('kamera');
    }
  },true);
  // Klik chip yang BUKAN dari jari/mouse user (mis. Ctrl+Z mengembalikan pilihan chip sebelumnya) -> ikut pindah ke tab pemilik chip itu,
  // supaya perubahannya kelihatan dan tidak terjadi diam-diam di tab yang tersembunyi.
  document.addEventListener('click',function(e){
    if(e.isTrusted)return;
    var c=e.target&&e.target.closest?e.target.closest('#vcam-chips .pb-fk,#vcam-hook-chips .pb-fk'):null;if(!c)return;
    var want=c.closest('#vcam-hook-chips')?'hook':'kamera';
    if(curTab()!==want)vbCamTab(want,true);
  },true);
  // Setiap kali step Pergerakan Kamera dibuka (baru, atau dibuka ulang lewat chip ringkasan), mulai dari tab Kamera.
  var card=$('vcam');
  if(card&&window.MutationObserver){
    var act=function(){var c=$('vcam');return !!c&&!c.classList.contains('done')&&!c.classList.contains('pending')&&!c.classList.contains('hidden');};
    var was=act();
    new MutationObserver(function(){var n=act();if(n&&!was){try{vbCamTab('kamera',true);}catch(e){}}was=n;}).observe(card,{attributes:true,attributeFilter:['class']});
  }
  try{vbCamDots();}catch(e){}
})();
