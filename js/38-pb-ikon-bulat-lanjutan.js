// js/38-pb-ikon-bulat-lanjutan.js — dipindah dari <script id="pb-ikon-bulat-lanjutan-js"> di index.html lama (baris 40668). Isi tidak diubah.
(function(){
  var NM=function(t){return String(t||'').replace(/\s+/g,' ').trim().toLowerCase()};
  var RULES={
    '#f4-chips':[[/mirror/,'pmirror'],[/selfie/,'pselfie'],[/duduk.*condong|condong.*duduk/,'plsit'],[/condong/,'plstand'],[/duduk.*jelas/,'psitx'],[/berdiri.*jelas|jelas/,'pstandx'],[/duduk/,'psit'],[/./,'pstand']],
    '#f8-normal-panel':[[/low/,'alow'],[/high/,'ahigh'],[/eye/,'aeye'],[/overhead|flat ?lay|top/,'atop'],[/45/,'a45'],[/front/,'afront'],[/3\/4|three/,'a34'],[/tangan|hand/,'ahand'],[/./,'aeye']],
    '#f9-chips':[[/clean/,'mclean'],[/pastel/,'mpastel'],[/vibrant/,'mvibrant'],[/editorial/,'meditorial'],[/candid/,'mcandid'],[/cozy/,'mcozy'],[/burik|hp/,'mphone'],[/moody/,'mmoody'],[/lux/,'mlux'],[/./,'mclean']]
  };
  function labelOf(c){
    var m=(c.getAttribute('onclick')||'').match(/,\s*this\s*,\s*'((?:[^'\\]|\\.)*)'/);
    if(m)return NM(m[1].replace(/\\'/g,"'"));
    var t=c.cloneNode(true);t.querySelectorAll('.pfa-ic,.text-hint').forEach(function(x){x.remove()});
    return NM(t.textContent);
  }
  function apply(){
    Object.keys(RULES).forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(box){
        box.querySelectorAll('.chip').forEach(function(c){
          if(c.querySelector(':scope>.pfa-loc'))return;
          var lb=labelOf(c),id=null,r=RULES[sel];
          for(var i=0;i<r.length;i++){if(r[i][0].test(lb)){id=r[i][1];break}}
          if(!id)return;
          c.querySelectorAll('.pfa-ic').forEach(function(x){x.remove()});
          var ic=document.createElement('span');ic.className='pfa-ic pfa-loc';ic.setAttribute('aria-hidden','true');
          ic.innerHTML='<svg class="lk-ico" viewBox="0 0 32 32"><use href="#lk-'+id+'"/></svg>';
          c.insertBefore(ic,c.firstChild);
          c.classList.add('pfa-lic');c.classList.remove('pfa-t','pfa-lt','pfa-thc');
        });
      });
    });
  }
  var raf=0,sched=function(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;try{apply()}catch(e){}})};
  var f=document.getElementById('foto');
  if(f&&window.MutationObserver)new MutationObserver(sched).observe(f,{childList:true,subtree:true});
  apply();
})();
