// fitur/outfit-studio-jembatan-foto.js — (dulu js/40-os-pfa-bridge.js) dipindah dari <script id="os-pfa-bridge-js"> di index.html lama (baris 40824). Isi tidak diubah.
/* ═══ Outfit Studio (Inspirasi/Rekomendasi) ⇄ Prompt Foto AI (v14.96) ═══
   Dari layar Inspirasi/Rekomendasi user bisa membuka Prompt Foto AI tanpa kehilangan isian di Outfit Studio:
   overlay Outfit Studio hanya DISEMBUNYIKAN (iframe tetap hidup), lalu Prompt Foto AI dibuka. Selama dibuka dari sana,
   header Prompt Foto AI menampilkan tombol "Kembali ke Inspirasi", dan tombol panah kembali bawaan juga mengarah ke sana.
   Cara lain keluar (tab bawah, dll.) tetap memakai perilaku lama dan hanya mereset penanda. */
(function(){
  var origClose=window.pfaClose;
  function $(id){return document.getElementById(id);}
  function modeLabel(){
    try{
      var f=$('os-frame'),w=f&&f.contentWindow;
      var t=w&&w.eval("S.d&&S.v==='make'?S.d.type:''");
      return t==='rek'?'Rekomendasi':(t==='insp'?'Inspirasi':'Outfit Studio');
    }catch(e){return 'Outfit Studio';}
  }
  function ensureStrip(){
    var bar=$('pfa-bar');if(!bar)return null;
    var s=$('pfa-os-strip');
    if(!s){
      s=document.createElement('div');s.id='pfa-os-strip';s.className='pfa-os-strip';
      s.innerHTML='<button type="button" class="pfa-os-ret" onclick="osReturnFromPfa()"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg><span>Kembali ke <b id="pfa-os-mode">Inspirasi</b></span><em>Draf tetap terbuka</em></button>';
      var row=bar.querySelector('.pfa-row');
      if(row&&row.nextSibling)bar.insertBefore(s,row.nextSibling);else bar.appendChild(s);
    }
    return s;
  }
  window.osOpenPfa=function(){
    if(document.body.classList.contains('pb-tour-active'))return;
    var o=$('os-overlay'),fo=$('foto');
    if(!o||!fo||typeof window.pfaOpen!=='function')return;
    ensureStrip();
    var m=$('pfa-os-mode');if(m)m.textContent=modeLabel();
    if(!fo.classList.contains('active')){try{window.switchPage('foto',document.querySelector('.ntab'));}catch(e){}}
    window.__osPfa=true;
    document.body.classList.add('os-pfa');
    o.classList.remove('show');
    window.pfaOpen();
  };
  window.osReturnFromPfa=function(){
    var was=!!window.__osPfa;
    window.pfaClose();
    if(was&&typeof window.osOpen==='function')window.osOpen();
  };
  if(typeof origClose==='function'){
    window.pfaClose=function(){
      window.__osPfa=false;
      document.body.classList.remove('os-pfa');
      return origClose.apply(this,arguments);
    };
  }
  document.addEventListener('click',function(e){
    if(!window.__osPfa)return;
    var b=e.target&&e.target.closest&&e.target.closest('.pfa-back');
    if(!b)return;
    e.preventDefault();e.stopPropagation();
    window.osReturnFromPfa();
  },true);
})();
