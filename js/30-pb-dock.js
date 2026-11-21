// js/30-pb-dock.js — dipindah dari <script id="pb-dock-js"> di index.html lama (baris 40117). Isi tidak diubah.
(function(){
  function sync(){
    var n=document.querySelector('nav.nav'),h=0;
    try{
      if(n){
        var cs=getComputedStyle(n),r=n.getBoundingClientRect();
        if(cs.display!=='none'&&cs.position==='fixed'&&r.height>20&&r.bottom>=window.innerHeight-2)h=Math.round(r.height);
      }
    }catch(e){}
    document.documentElement.style.setProperty('--pb-dock-b',h+'px');
  }
  window.addEventListener('resize',sync);
  window.addEventListener('orientationchange',sync);
  if(window.visualViewport)window.visualViewport.addEventListener('resize',sync);
  if(window.MutationObserver){
    var mo=new MutationObserver(sync);
    mo.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    mo.observe(document.body,{attributes:true,attributeFilter:['class']});
  }
  var n0=document.querySelector('nav.nav');
  if(n0&&window.ResizeObserver)new ResizeObserver(sync).observe(n0);
  sync();
  document.addEventListener('DOMContentLoaded',sync);
  window.addEventListener('load',function(){sync();setTimeout(sync,400);setTimeout(sync,1500);});
})();
