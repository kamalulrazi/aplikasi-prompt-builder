// js/39-pemulihan-tampilan.js — dipindah dari <script> di index.html lama (baris 40707). Isi tidak diubah.
/* ════════════════════════════════════════════════════════════════════
   PEMULIHAN TAMPILAN TERAKHIR (8 Nov 2026, permintaan user)
   Tujuan: user keluar ke app lain lama (mis. 1 jam), Android mematikan
   WebView di belakang layar, lalu app dibuka lagi → tampilan harus balik
   seperti terakhir dipakai. Yang SUDAH ditangani script lain: tab terakhir
   (pb_last_active_page_v1) & isian/step wizard (draft pb_wizard_draft_v1).
   Modul ini menambah yang BELUM:
     - posisi scroll (#app-shell, dan #foto saat layar penuh Foto terbuka)
     - layar penuh "Pro Foto" (pfa) yang sedang terbuka + segmen Pilih/Prompt
     - Outfit Studio yang sedang terbuka + isi layarnya (home / album tertentu)
   Disimpan di key TERPISAH 'pb_resume_ui_v1' (tidak ikut sinkron cloud).
   TIDAK memulihkan kalau: refresh sengaja (pull-to-refresh/reload — sesuai
   kesepakatan lama: refresh = mulai bersih), tur sedang jalan, atau data
   sudah lebih tua dari 24 jam.
   ════════════════════════════════════════════════════════════════════ */
(function(){
  var KEY='pb_resume_ui_v1', MAX_AGE=24*3600*1000;
  var lastSig='', lastAt=0; // hemat tulis: simpan hanya kalau ada perubahan (atau tiap 30 dtk sebagai penanda waktu)
  var ready=false; // jangan simpan sebelum restore() selesai, supaya state lama tidak tertimpa tampilan awal yang masih kosong
  function $(id){return document.getElementById(id);}
  function osWin(){try{var f=$('os-frame');return f&&f.getAttribute('data-ready')?f.contentWindow:null;}catch(e){return null;}}
  function osState(){
    try{
      var o=$('os-overlay');
      if(!o||!o.classList.contains('show')) return null;
      try{ var w=osWin(); return {v:w.eval('S.v'), aid:w.eval('S.aid')}; }
      catch(e2){ return {v:'home', aid:null}; }   // layar terbuka tapi isinya belum siap dibaca
    }catch(e){return null;}
  }
  function snap(){
    try{
      if(!ready) return;
      if(document.body.classList.contains('pb-tour-active')) return;
      var sh=$('app-shell'), fo=$('foto');
      var pg=document.querySelector('.page.active');
      var o={
        page:pg?pg.id:'foto',
        shell:sh?Math.round(sh.scrollTop):0,
        pfa:!!(fo&&fo.classList.contains('pfa-open')),
        pfaV:(fo&&fo.classList.contains('pfa-v-prompt'))?'prompt':'pilih',
        foto:fo?Math.round(fo.scrollTop):0,
        os:osState()
      };
      var sig=JSON.stringify(o), now=Date.now();
      if(sig===lastSig && now-lastAt<30000) return;
      lastSig=sig; lastAt=now; o.t=now;
      localStorage.setItem(KEY,JSON.stringify(o));
    }catch(e){}
  }
  var tmr=0;
  function later(){ if(tmr) return; tmr=setTimeout(function(){tmr=0;snap();},350); }
  document.addEventListener('scroll',later,true);   // capture: scroll tidak bubble
  document.addEventListener('click',later,true);
  function saveAll(){ snap(); try{ if(window.pbSaveNow) window.pbSaveNow(); }catch(e){} }
  document.addEventListener('visibilitychange',function(){ if(document.hidden) saveAll(); });
  window.addEventListener('pagehide',saveAll);
  document.addEventListener('freeze',saveAll);
  // R4: Capacitor (jika @capacitor/app terpasang): app ke background -> simpan
  try{ var _CA=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App; if(_CA&&_CA.addListener) _CA.addListener('appStateChange',function(st){ if(st&&!st.isActive) saveAll(); }); }catch(e){}
  setInterval(function(){ if(!document.hidden) snap(); },3000); // jaring pengaman, murah

  function restore(){
    try{
      if(window.PB_FRESH_START===true) return;   // R1: mulai bersih hanya atas permintaan eksplisit (refresh "Ya"/logout/restart tur); selain itu SELALU pulihkan
      if(document.body.classList.contains('pb-tour-active')) return;
      try{ if(typeof pbTourIsPending==='function' && pbTourIsPending()) return; }catch(e){}   // tur akun belum selesai = tur yang mengatur layar
      var raw=localStorage.getItem(KEY); if(!raw) return;
      var o=JSON.parse(raw);
      if(!o||typeof o!=='object'||!o.t||Date.now()-o.t>MAX_AGE) return;
      var sh=$('app-shell'), fo=$('foto');

      // 1) layar penuh Pro Foto
      if(o.pfa && o.page==='foto' && fo && typeof window.pfaOpen==='function' && !fo.classList.contains('pfa-open')) window.pfaOpen();
      if(o.pfa && o.page==='foto' && typeof window.pfaView==='function'){ try{ window.pfaView(o.pfaV||'pilih'); }catch(e){} }

      // 2) posisi scroll — diulang karena tinggi halaman masih berubah
      //    setelah draft wizard dipulihkan
      function applyScroll(){
        try{ if(sh) sh.scrollTop=o.shell||0; if(o.pfa&&o.page==='foto'&&fo) fo.scrollTop=o.foto||0; }catch(e){}
      }
      var userMoved=false;
      ['touchmove','wheel','keydown'].forEach(function(ev){
        document.addEventListener(ev,function(){ userMoved=true; },{capture:true,once:true,passive:true});
      });
      function applyScrollSafe(){ if(!userMoved) applyScroll(); }  // user mulai scroll sendiri → jangan ditarik balik
      applyScroll();
      [250,700,1400,2500].forEach(function(ms){ setTimeout(applyScrollSafe,ms); });

      // 3) Outfit Studio
      if(o.os && typeof window.osOpen==='function'){
        window.osOpen();
        var tries=0, iv=setInterval(function(){
          tries++;
          try{
            var w=osWin();
            if(w && w.document && w.document.readyState==='complete' && w.eval('typeof go')==='function'){
              clearInterval(iv);
              if(o.os.v==='album' && o.os.aid){
                w.eval('S.aid='+JSON.stringify(o.os.aid));
                Promise.resolve(w.eval("loadAlb().then(function(){return S.albums.some(function(a){return a.id===S.aid})})"))
                  .then(function(ok){ if(ok) w.eval("go('album')"); else w.eval('S.aid=null'); }).catch(function(){});
              }
            }
          }catch(e){}
          if(tries>40) clearInterval(iv);
        },250);
      }
    }catch(e){}
  }
  // jalan SETELAH restore draft wizard (itu di window.load + 500ms)
  function run(){ try{ restore(); }finally{ ready=true; } }
  window.addEventListener('load',function(){ setTimeout(run,900); });
  // pengaman: kalau event load tak kunjung datang (jaringan sangat lambat), tetap aktifkan penyimpanan setelah 20 dtk
  setTimeout(function(){ if(!ready) ready=true; },20000);
})();
