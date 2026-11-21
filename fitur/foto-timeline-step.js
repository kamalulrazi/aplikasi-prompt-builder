// fitur/foto-timeline-step.js — (dulu js/21-tl-foto.js) dipindah dari <script id="tl-foto-script"> di index.html lama (baris 38369). Isi tidak diubah.
(function(){
  var IDS=['f0','f1','f3','f4','f5','f7','f8','f9'],OPT={f3:1,f4:1,f5:1,f7:1,f8:1,f9:1},t=0;
  var CHECK='<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.5 8.5L6.5 11.5L12.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function act(){try{return fActiveSteps();}catch(e){return ['f0','f1','f4','f5','f7','f8','f9'];}}
  function sync(){
    t=0;
    var a=act(),vis=[];
    (typeof fStepOrder==='function'?fStepOrder():IDS).forEach(function(id){
      var c=document.getElementById(id);if(!c)return;
      var i=a.indexOf(id),st='off';
      if(i>-1&&c.style.display!=='none'){
        st=c.classList.contains('done')?'done':(c.classList.contains('pending')||c.classList.contains('hidden'))?'todo':'cur';
      }
      if(c.dataset.tl!==st)c.dataset.tl=st;
      if(OPT[id]&&!c.classList.contains('tl-opts'))c.classList.add('tl-opts');
      if(st==='off')return;
      vis.push(c);
      var wh=c.querySelector('.whead');if(!wh)return;
      var d=wh.querySelector('.tl-dot');
      if(!d){d=document.createElement('span');d.className='tl-dot';d.setAttribute('aria-hidden','true');wh.insertBefore(d,wh.firstChild);}
      var v=st==='done'?'ok':String(i+1);
      if(d.dataset.v!==v){d.dataset.v=v;d.innerHTML=st==='done'?CHECK:String(i+1);}
    });
    vis.forEach(function(c,k){
      var e=(k===0?'first ':'')+(k===vis.length-1?'last':'');
      if(c.dataset.edge!==e)c.dataset.edge=e;
    });
  }
  function sched(){if(!t)t=requestAnimationFrame(sync);}
  var P=document.getElementById('foto');
  if(P&&window.MutationObserver)new MutationObserver(sched).observe(P,{subtree:true,attributes:true,attributeFilter:['class','style']});
  ['fUpdateProgress','fSyncStepNums'].forEach(function(n){
    var o=window[n];
    if(typeof o==='function')window[n]=function(){var r=o.apply(this,arguments);sched();return r;};
  });
  document.addEventListener('click',function(){setTimeout(sched,90);},true);
  sync();
})();
