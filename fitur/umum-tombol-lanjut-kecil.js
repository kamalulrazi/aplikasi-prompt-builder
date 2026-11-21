// fitur/umum-tombol-lanjut-kecil.js — (dulu js/32-pb-slimnav.js) dipindah dari <script id="pb-slimnav-js"> di index.html lama (baris 40254). Isi tidak diubah.
(function(){
  var RE=/^(konfirmasi\s*&\s*)?lanjut\b/i,raf=0;
  function run(){
    raf=0;
    try{
      /* tandai semua tombol "Lanjut…" supaya kena gaya kecil */
      document.querySelectorAll('button.btn:not(.pb-lanjut)').forEach(function(b){
        if(RE.test((b.textContent||'').replace(/\s+/g,' ').trim()))b.classList.add('pb-lanjut');
      });
      /* wizard Foto: sisipkan ikon Kembali di dalam bar Lanjut (tombol asli disembunyikan lewat CSS selama bar tampil) */
      document.querySelectorAll('#foto [id$="-confirmbar"]').forEach(function(bar){
        if(bar.querySelector('.pb-bk-ic'))return;
        var card=bar.closest('.wcard'),wb=card&&card.querySelector('.wback');
        if(!wb)return;
        var b=document.createElement('button');
        b.type='button';b.className='pb-bk-ic';b.title='Kembali';b.setAttribute('aria-label','Kembali');
        b.onclick=function(e){e.preventDefault();e.stopPropagation();wb.click();};
        bar.insertBefore(b,bar.firstChild);
      });
      /* aksesibilitas: tombol ikon tetap punya nama */
      document.querySelectorAll('.wback,.pbw-bk').forEach(function(x){
        if(!x.getAttribute('aria-label')){x.setAttribute('aria-label','Kembali');x.setAttribute('role','button');x.title='Kembali';}
      });
    }catch(e){console.warn('pb-slimnav',e);}
  }
  function sched(){if(!raf)raf=requestAnimationFrame(run);}
  if(window.MutationObserver)new MutationObserver(sched).observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sched);else sched();
})();
