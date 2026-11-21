// js/22-tl-fold.js — dipindah dari <script id="tl-fold-script"> di index.html lama (baris 38409). Isi tidak diubah.
/* Lipat alur step jadi ringkasan setelah klik Generate Prompt Foto. Lepas otomatis begitu ada step yang dibuka lagi (ubah). */
(function(){
  var P=document.getElementById('foto'),box=document.getElementById('f-tl-fold'),sub=document.getElementById('f-tl-fold-sub'),t=0;
  if(!P||!box)return;
  function info(){var n=0,ok=true;P.querySelectorAll('.wcard[data-tl]').forEach(function(c){var s=c.dataset.tl;if(s==='off')return;n++;if(s!=='done')ok=false;});return{n:n,ok:n>0&&ok};}
  function set(v){if((P.dataset.tlFold||'')===v)return;if(v)P.dataset.tlFold=v;else delete P.dataset.tlFold;}
  function sync(){
    t=0;var i=info(),s=P.dataset.tlFold||'';
    if(!i.ok&&s){s='';set('');}
    if(box.hidden!==!s)box.hidden=!s;
    var ex=s==='open'?'true':'false';
    if(box.getAttribute('aria-expanded')!==ex)box.setAttribute('aria-expanded',ex);
    var tx=i.n+' step terisi — ketuk untuk '+(s==='open'?'menutup':'lihat atau ubah');
    if(sub&&sub.textContent!==tx)sub.textContent=tx;
  }
  function sched(){if(!t)t=requestAnimationFrame(function(){requestAnimationFrame(sync);});}
  window.pbToggleTlFold=function(){var s=P.dataset.tlFold||'';if(s==='closed')set('open');else if(s==='open')set('closed');sync();};
  var og=window.fGenerate;
  if(typeof og==='function')window.fGenerate=function(){
    var r=og.apply(this,arguments);
    try{var b=document.getElementById('f-gen-btn');if(b&&b.classList.contains('btn-loading')&&info().ok){set('closed');sync();}}catch(e){}
    return r;
  };
  if(window.MutationObserver)new MutationObserver(sched).observe(P,{subtree:true,attributes:true,attributeFilter:['class','style','data-tl']});
  sched();
})();
