// fitur/video-builder-alur-percabangan.js — (dulu js/18-pb-fork.js) dipindah dari <script id="pb-fork-js"> di index.html lama (baris 38003). Isi tidak diubah.
/* ALUR PERCABANGAN BUILDER VIDEO (permintaan user, 7 Okt 2026, preview opsi B):
   Mode Referensi → Jenis Kelamin & Usia → Cara Bikin Script.
   "Kami Bantu Isi" → + Nada Bicara, Pembawaan, Aksen, (Kamera, disesuaikan nada & aksen), Info Produk. "Tulis Manual Sendiri" → + (Kamera), Tulis Script
   (nada = Ramah & aksen = Netral otomatis, supaya jalur manual tetap lengkap datanya). */
(function(){
  var $=function(i){return document.getElementById(i);};
  var NAME={v1:'Prompt Video AI',vdur:'Durasi Video',v2:'Jenis Kelamin & Usia',voff:'Karakter di Luar Layar',vcam:'Pergerakan Kamera',vfork:'Cara Bikin Script',v3:'Gaya Bicara',vmotion:'Pembawaan',v4:'Aksen',v5:'Script / Dialog'};
  var prev=null;
  function inferred(){
    try{
      var c=$('v5');
      if(c&&(c.classList.contains('done')||!c.classList.contains('pending'))){
        var a=$('vb-mode-ai-area'),m=$('vb-manual-script-area');
        if(a&&!a.classList.contains('hidden'))return 'ai';
        if(m&&!m.classList.contains('hidden'))return 'manual';
      }
    }catch(e){}
    return '';
  }
  function path(){try{return VB.pbPath||inferred();}catch(e){return '';}}
  function forkDone(){try{return VB.pbDone||inferred();}catch(e){return '';}}
  function steps(){
    var p=path(),s=[['v1',NAME.v1]],cam=_vbHasCamStep();
    if(_vbHasDur()&&!_vbIsDua())s.push(['vdur',NAME.vdur]);
    s.push(['v2',NAME.v2]);
    if(_vbIsDua())s.push(['voff',NAME.voff]);
    s.push(['vfork',NAME.vfork]);
    if(p==='ai'){s.push(['v3',NAME.v3,1],['v4',NAME.v4,1]);if(cam)s.push(['vcam',NAME.vcam]);s.push(['v5','Info Produk & Audiens',1]);}
    else if(p==='manual'){if(cam)s.push(['vcam',NAME.vcam]);s.push(['v5','Tulis Script']);}
    return s;
  }
  window.pbStepTotal=function(){
    /* jalur belum dipilih: pakai total jalur terpanjang (AI) supaya bar tidak penuh lalu turun saat jalur dipilih */
    if(!path())return 6+(_vbHasCamStep()?1:0)+(_vbHasDur()&&!_vbIsDua()?1:0)+(_vbIsDua()?1:0);
    return steps().length;
  };
  Object.keys(NAME).forEach(function(id){
    var old=VB_STEP_META[id];
    Object.defineProperty(VB_STEP_META,id,{enumerable:true,configurable:true,get:function(){
      var s=steps(),i=-1;
      for(var k=0;k<s.length;k++)if(s[k][0]===id){i=k;break;}
      return i<0?(old||[s.length+1,NAME[id]]):[i+1,s[i][1]];
    }});
  });
  function render(){
    var ol=$('pb-tl');if(!ol)return;
    var s=steps(),p=path(),fd=forkDone(),on=-1,h='',keys=[];
    function isDone(x){var c=$(x[0]);return x[0]==='vfork'?!!fd:!!(c&&c.classList.contains('done'));}
    s.forEach(function(x,i){if(on<0&&!isDone(x))on=i;});
    s.forEach(function(x,i){
      var c=$(x[0]),n=String(i+1),d=isDone(x),k=x[0]+'|'+x[1],isNew=prev&&prev.indexOf(k)<0;
      keys.push(k);
      if(c){var w=c.querySelector('.wnum');if(w){if(w._origText!==undefined)w._origText=n;if(!c.classList.contains('done'))w.textContent=n;}}
      h+='<li class="'+(d?'done':(i===on?'on':''))+(isNew?' pop':'')+'"><i>'+(d?'✓':n)+'</i><div>'+x[1]+(x[2]?'<span class="pb-ai">AI</span>':'')+'</div></li>';
    });
    if(!p)h+='<li class="gh"><i>…</i><div>Menyesuaikan pilihan</div></li>';
    ol.innerHTML=h;prev=keys;try{window.pbWizRender&&window.pbWizRender(s,on,isDone);}catch(e){console.warn('pbWiz',e);}
    var t=document.querySelector('#v5 .wtitle');
    if(t)t.textContent=p==='ai'?'Info Produk & Audiens':(p==='manual'?'Tulis Script':'Script / Dialog');
    var sel='';try{sel=VB.pbPath||'';}catch(e){}
    var fa=$('pb-fk-ai'),fm=$('pb-fk-manual'),go=$('pb-fk-go'),bx=$('pb-fk-box');
    [fa,fm].forEach(function(o){
      if(!o)return;
      var on=(o.getAttribute('data-v')===sel);
      o.classList.toggle('sel',on);
      o.setAttribute('aria-checked',on?'true':'false');
      o.tabIndex=(!sel||on)?0:-1;
    });
    if(bx){
      var cur=bx.getAttribute('data-sel')||'';
      if(sel!==cur){
        /* pilihan pertama: pelat muncul (fade) di baris terpilih tanpa meluncur dari atas */
        if(sel&&!cur){bx.classList.add('nt');bx.setAttribute('data-sel',sel);void bx.offsetWidth;requestAnimationFrame(function(){bx.classList.remove('nt');});}
        else if(sel)bx.setAttribute('data-sel',sel);
        else bx.removeAttribute('data-sel');
      }
    }
    if(go)go.disabled=!sel;
  }
  /* navigasi panah (radiogroup) */
  [$('pb-fk-ai'),$('pb-fk-manual')].forEach(function(o,i,a){
    if(!o)return;
    o.addEventListener('keydown',function(e){
      var k=e.key,d=(k==='ArrowDown'||k==='ArrowRight')?1:((k==='ArrowUp'||k==='ArrowLeft')?-1:0);
      if(!d)return;
      e.preventDefault();
      var n=a[(i+d+a.length)%a.length];
      if(n){window.pbSelectPath(n.getAttribute('data-v'));n.focus();}
    });
  });
  function apply(){
    var p;try{p=VB.pbDone;}catch(e){}
    if(!p)return;
    var ch=$('vb-script-choose'),a=$('vb-mode-ai-area'),m=$('vb-manual-script-area');
    if(!ch||!a||!m||ch.classList.contains('hidden'))return;
    /* jalur manual: kartu script baru dibuat SETELAH step kamera selesai, supaya pilihan kamera ikut masuk ke prompt */
    if(p==='manual'&&_vbHasCamStep()){var cv=$('vcam');if(cv&&!cv.classList.contains('done'))return;}
    if(p==='ai'?a.classList.contains('hidden'):m.classList.contains('hidden'))vbSelectScriptMode(p);
  }
  window.pbSelectPath=function(p){VB.pbPath=p;render();};
  window.pbConfirmPath=function(){
    var p=VB.pbPath;if(!p)return;
    var old=VB.pbDone||'';
    var we=doneCard('vfork','vafork',p==='ai'?'Kami Bantu Isi':'Tulis Manual Sendiri');
    VB.pbDone=p;
    if(old&&old!==p){
      we=false;
      ['v3','v4','v5'].forEach(function(id){var c=$(id);if(c&&!c.classList.contains('done'))c.classList.add('pending');});
    }
    if(p==='manual'){
      if(!VB.pitch){VB.pitch='ramah';VB.pitchLabel='Ramah';VB.pbDefP=1;}
      if(!VB.accent){VB.accent='neutral standard accent';VB.accentLabel='Netral';VB.pbDefA=1;}
    }else{
      if(VB.pbDefP){VB.pitch='';VB.pitchLabel='';VB.pbDefP=0;}
      if(VB.pbDefA){VB.accent='';VB.accentLabel='';VB.pbDefA=0;}
    }
    var nxt=(_vbHasCamStep()&&!($('vcam')&&$('vcam').classList.contains('done')))?'vcam':'v5';
    try{_vbCamAdaptSync();}catch(e){}
    if(p==='ai'&&!['v3','v4'].every(function(id){var c=$(id);return c&&c.classList.contains('done');}))nxt='v3';
    vbAdvanceStep(we,nxt,0,'');
    try{vbSyncStep6Mode3();}catch(e){}
    render();
  };
  var o6=window.vbSyncStep6Mode3;
  window.vbSyncStep6Mode3=function(){var r=o6.apply(this,arguments);try{apply();render();}catch(e){}return r;};
  var ou=window.vbUpdateProgress;
  window.vbUpdateProgress=function(){var r=ou.apply(this,arguments);try{render();}catch(e){}return r;};
  var orr=window.vbResetNow;
  window.vbResetNow=function(){
    var r=orr.apply(this,arguments);
    try{var c=$('vfork');if(c){c.classList.remove('done','hidden');c.classList.add('pending');}var a=$('vafork');if(a)a.textContent='';prev=null;render();}catch(e){}
    try{var oc=$('voff');if(oc){oc.classList.remove('done','hidden');oc.classList.add('pending');if(oc.dataset)delete oc.dataset.reopened;}var oa=$('vaoff');if(oa)oa.textContent='';VB.offGender='';[].forEach.call(document.querySelectorAll('#vb-off-chips .chip'),function(x){x.classList.remove('sel','off-locked');});var og=$('vb-off-go');if(og)og.disabled=true;var ofc=$('voff-confirmbar');if(ofc)ofc.remove();}catch(e){}
    return r;
  };
  var raf=0,mo=new MutationObserver(function(){cancelAnimationFrame(raf);raf=requestAnimationFrame(render);});
  ['v1','vdur','v2','voff','vcam','vfork','v3','vmotion','v4','v5'].forEach(function(id){var c=$(id);if(c)mo.observe(c,{attributes:true,attributeFilter:['class']});});
  render();
})();
