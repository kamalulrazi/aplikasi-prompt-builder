// fitur/foto-tunggu-generate.js — (dulu js/29-pb-genwait.js) dipindah dari <script id="pb-genwait-js"> di index.html lama (baris 40088). Isi tidak diubah.
(function(){
  function stepOpen(){
    var cards=document.querySelectorAll('#foto .wcard');
    for(var i=0;i<cards.length;i++){
      var c=cards[i],cl=c.classList;
      if(cl.contains('done')||cl.contains('hidden')||cl.contains('pending'))continue;
      return true;
    }
    return false;
  }
  function sync(){
    var ga=document.getElementById('f-gen-area');if(!ga)return;
    var tour=document.body.classList.contains('pb-tour-active');
    var imp=(typeof FS!=='undefined'&&FS&&FS.importActive);
    var wait=!tour&&!imp&&stepOpen();
    if(wait!==ga.classList.contains('pb-gen-wait'))ga.classList.toggle('pb-gen-wait',wait);
  }
  /* THROTTLE (bukan debounce): debounce bisa tertunda terus kalau ada animasi yang terus mengubah elemen. */
  var t=null;function later(){if(t)return;t=setTimeout(function(){t=null;sync();},60);}
  function init(){
    var f=document.getElementById('foto');if(!f)return;
    new MutationObserver(later).observe(f,{attributes:true,attributeFilter:['class'],subtree:true});
    setInterval(sync,700); /* jaring pengaman */
    sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
