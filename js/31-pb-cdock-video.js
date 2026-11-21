// js/31-pb-cdock-video.js — dipindah dari <script id="pb-cdock-video-js"> di index.html lama (baris 40221). Isi tidak diubah.
(function(){
  var raf=0;
  function run(){
    raf=0;
    try{
      document.querySelectorAll('#video .wcard [data-role="mt12-confirm"]').forEach(function(btn){
        var card=btn.closest('.wcard'),b=card&&card.querySelector('.wbody'),dock=b&&b.querySelector(':scope>.pbw-dock');
        var px=btn._pbPx;
        var show=!!dock&&btn.style.display==='flex'&&!!card.offsetParent&&btn.getClientRects().length>0;
        if(show&&!px){
          px=document.createElement('button');px.type='button';px.className='btn sm pb-cd-px';
          px.textContent=btn.textContent.trim();
          px.onclick=function(e){e.preventDefault();btn.click();};
          dock.appendChild(px);btn._pbPx=px;btn.classList.add('pb-cd-orig');
        }else if(show&&px&&px.parentNode!==dock){dock.appendChild(px);}
        else if(!show&&px){px.remove();btn._pbPx=null;btn.classList.remove('pb-cd-orig');}
      });
      /* dock yang tadinya kosong (disembunyikan) tampil lagi saat tombol pendamping ada */
      document.querySelectorAll('#video .pbw-dock').forEach(function(d){
        if(d.querySelector(':scope>.pb-cd-px')&&d.style.display!=='')d.style.display='';
      });
    }catch(e){console.warn('pb-cdock-video',e);}
  }
  function sch(){if(!raf)raf=requestAnimationFrame(run);}
  document.addEventListener('input',sch,true);
  document.addEventListener('click',function(){setTimeout(sch,0);},true);
  var v=document.getElementById('video');
  if(v&&window.MutationObserver)new MutationObserver(sch).observe(v,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']});
  document.addEventListener('DOMContentLoaded',sch);
  sch();
})();
