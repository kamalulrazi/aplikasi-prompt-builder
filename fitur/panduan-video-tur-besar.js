// fitur/panduan-video-tur-besar.js — (dulu js/37-video-tur-besar.js) dipindah dari <script> di index.html lama (baris 40501). Isi tidak diubah.
// Buka video tur dalam jendela lebih besar. Video asal dijeda; posisi putar
// ikut dipindah ke jendela dan dikembalikan saat ditutup.
var pbVzSrcVideo=null, pbVzWasPlaying=false;
function pbVzOpen(btn){
  try{
    var v=(btn.tagName==='VIDEO')?btn:((btn.querySelector&&btn.querySelector('video'))||(btn.parentElement&&btn.parentElement.querySelector('video')));
    if(!v) return;
    var box=document.getElementById('pb-vz'), z=document.getElementById('pb-vz-video');
    pbVzSrcVideo=v; pbVzWasPlaying=!v.paused&&!v.ended;
    var t=v.currentTime||0, src=v.getAttribute('src')||v.currentSrc||'';
    try{ v.pause(); }catch(e){}
    z.muted=false; z.loop=!!v.loop;
    z.src=src.split('#')[0];
    z.onloadedmetadata=function(){ try{ if(t) z.currentTime=t; }catch(e){} var p=z.play(); if(p&&p.catch)p.catch(function(){}); };
    z.load();
    box.classList.add('show');
  }catch(e){}
}
function pbVzClose(){
  var box=document.getElementById('pb-vz'), z=document.getElementById('pb-vz-video');
  if(!box||!box.classList.contains('show')) return;
  var t=0; try{ t=z.currentTime||0; z.pause(); }catch(e){}
  z.removeAttribute('src'); try{ z.load(); }catch(e){}
  box.classList.remove('show');
  var v=pbVzSrcVideo; pbVzSrcVideo=null;
  if(v&&v.isConnected){
    try{ if(t&&isFinite(t)) v.currentTime=t; }catch(e){}
    if(pbVzWasPlaying){ var p=v.play(); if(p&&p.catch)p.catch(function(){}); }
  }
}
document.addEventListener('keydown',function(e){ if(e.key==='Escape') pbVzClose(); });

// GESTUR di pemutar perbesar: 2x ketuk kiri/kanan = -5/+5 dtk, ketuk tengah = jeda/putar.
// Ketukan beruntun di sisi yang sama (<=350 ms) terus menambah lompatan.
(function(){
  var SEEK=5, WIN=350, last={z:'',t:0}, fxTimer={};
  var ICO_PAUSE='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  var ICO_PLAY='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  function fx(id,html){
    var el=document.getElementById(id); if(!el) return;
    if(html!=null) el.innerHTML=html;
    el.classList.add('on'); clearTimeout(fxTimer[id]);
    fxTimer[id]=setTimeout(function(){ el.classList.remove('on'); },600);
  }
  function seekBy(z,delta){
    var v=document.getElementById('pb-vz-video'); if(!v) return;
    var d=v.duration, t=(v.currentTime||0)+delta;
    if(t<0) t=0;
    if(isFinite(d)&&d>0&&t>d) t=Math.max(0,d-0.05);
    try{ v.currentTime=t; }catch(e){}
  }
  function onTap(z){
    var v=document.getElementById('pb-vz-video'); if(!v) return;
    var now=Date.now();
    if(z==='M'){
      last.z=''; 
      if(v.paused||v.ended){ var p=v.play(); if(p&&p.catch)p.catch(function(){}); fx('pb-vz-fx-M',ICO_PLAY); }
      else { v.pause(); fx('pb-vz-fx-M',ICO_PAUSE); }
      return;
    }
    if(last.z===z && now-last.t<=WIN){
      seekBy(z, z==='L'?-SEEK:SEEK);
      fx('pb-vz-fx-'+z);
      last.t=now;
    } else { last.z=z; last.t=now; }
  }
  document.addEventListener('DOMContentLoaded',function(){
    var g=document.getElementById('pb-vz-gest'); if(!g) return;
    g.addEventListener('click',function(e){
      var zn=e.target.closest&&e.target.closest('.pb-vz-zone'); if(!zn) return;
      e.preventDefault(); e.stopPropagation();
      onTap(zn.getAttribute('data-z'));
    });
    g.addEventListener('dblclick',function(e){ e.preventDefault(); e.stopPropagation(); });
  });
  var _close=window.pbVzClose;
  window.pbVzClose=function(){ last.z=''; return _close.apply(this,arguments); };
})();
