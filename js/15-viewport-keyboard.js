// js/15-viewport-keyboard.js — dipindah dari <script> di index.html lama (baris 37673). Isi tidak diubah.
(function(){
  var root=document.documentElement, vv=window.visualViewport, baseH=Math.max(window.innerHeight,vv?vv.height:0), t=null;
  function isTextField(el){
    if(!el||!el.tagName) return false;
    var tag=el.tagName.toLowerCase();
    if(tag==='textarea') return !el.readOnly;
    if(el.isContentEditable) return true;
    if(tag!=='input') return false;
    if(el.readOnly) return false;
    var ty=(el.getAttribute('type')||'text').toLowerCase();
    return ['button','checkbox','radio','range','file','submit','reset','color','image','hidden'].indexOf(ty)===-1;
  }
  function navIsBottomBar(){
    var n=document.querySelector('.nav');
    return !!n && getComputedStyle(n).position==='fixed'; // layar lebar: nav jadi bar atas (sticky) -> jangan disembunyikan
  }
  function setOpen(v){ root.classList.toggle('pb-kb-open',!!v && navIsBottomBar()); }
  document.addEventListener('focusin',function(e){
    clearTimeout(t);
    setOpen(isTextField(e.target)); // fokus ke non-teks (checkbox/tombol) = keyboard tidak dipakai -> nav muncul lagi
  });
  document.addEventListener('focusout',function(){
    clearTimeout(t);
    // jeda singkat: pindah antar input tidak boleh bikin nav berkedip
    t=setTimeout(function(){
      if(!isTextField(document.activeElement)){ setOpen(false); baseH=Math.max(window.innerHeight,vv?vv.height:0); }
    },150);
  });
  document.addEventListener('pointerdown',function(){
    if(!root.classList.contains('pb-kb-open')) return;
    setTimeout(function(){ if(!isTextField(document.activeElement)) setOpen(false); },200);
  },true);
  // Cadangan: keyboard ditutup lewat tombol back/turun tanpa blur pada input
  if(vv){
    vv.addEventListener('resize',function(){
      if(root.classList.contains('pb-kb-open') && vv.height>=baseH-80 && window.innerHeight>=baseH-80) setOpen(false);
    });
  }
  window.addEventListener('orientationchange',function(){
    setTimeout(function(){ if(!isTextField(document.activeElement)) baseH=Math.max(window.innerHeight,vv?vv.height:0); },400);
  });
})();
