// js/02-tier-tema-awal.js — dipindah dari <script> di index.html lama (baris 116). Isi tidak diubah.
(function(){
  var GLASS_TIERS={standar:1,premium:1};
  function apply(){
    var t='free',e=0;
    try{t=localStorage.getItem('pb_tier_v1')||'free';e=Number(localStorage.getItem('pb_tier_expiry_v1'))||0;}catch(x){}
    if(t!=='free'&&e&&Date.now()>e)t='free';
    var on=Object.prototype.hasOwnProperty.call(GLASS_TIERS,t);
    document.documentElement.classList.toggle('pb-glass',on);
    // TEMA ONYX PLATINUM: hanya paket premium (Standar tetap Obsidian Glass).
    var pm=(t==='premium');
    document.documentElement.classList.toggle('pb-premium',pm);
    var m=document.querySelector('meta[name="theme-color"]');
    if(m)m.setAttribute('content',pm?'#090B10':(on?'#0A0912':'#08080A'));
  }
  window.pbApplyTheme=apply;
  // ── CACHE TIER PER AKUN (fix Sept 2026: premium langsung tampil saat login) ──
  // Logout SENGAJA membuang pb_tier_v1 supaya paket akun lama tidak kebawa ke
  // akun berikutnya. Akibatnya tiap login ulang mulai dari "gratis" dan
  // premium baru muncul setelah jaringan (login Firebase + baca Firestore)
  // selesai. Solusinya: tiap kali cloud mengonfirmasi tier sebuah akun, hasilnya
  // disimpan di sini per-akun (kunci = hash email, bukan email polos, supaya
  // tidak menyisakan daftar email setelah logout). Saat akun itu login lagi
  // di perangkat yang sama, pbTierCacheRestore() memasang tier-nya seketika;
  // hasil cloud tetap jadi penentu akhir (dan mengoreksi kalau ternyata berubah).
  var CK='pb_tier_cache_v1';
  function hk(s){
    s=String(s||'').trim().toLowerCase();
    var a=5381,b=0;
    for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);a=((a<<5)+a+c)|0;b=(c+(b<<6)+(b<<16)-b)|0;}
    return (a>>>0).toString(36)+(b>>>0).toString(36);
  }
  function rc(){try{var o=JSON.parse(localStorage.getItem(CK)||'{}');return(o&&typeof o==='object')?o:{};}catch(x){return {};}}
  window.pbTierCacheSave=function(email,t,e){
    if(!email)return;
    try{var c=rc();c[hk(email)]={t:t||'free',e:Number(e)||0};localStorage.setItem(CK,JSON.stringify(c));}catch(x){}
  };
  window.pbTierCacheRestore=function(email){
    var changed=false;
    try{
      var cur=localStorage.getItem('pb_tier_v1')||'free';
      if(cur==='free'&&email){
        var c=rc()[hk(email)];
        if(c&&c.t&&c.t!=='free'&&!(c.e&&Date.now()>c.e)){
          localStorage.setItem('pb_tier_v1',c.t);
          if(c.e)localStorage.setItem('pb_tier_expiry_v1',String(c.e));else localStorage.removeItem('pb_tier_expiry_v1');
          changed=true;
        }
      }
    }catch(x){}
    apply();
    return changed;
  };
  // v11.70: restart otomatis setelah upgrade membuka app dengan penanda ?_pbup=... di alamat
  // (supaya dianggap "buka baru" -> splash tampil, bukan "reload" -> splash dilewati). Dibersihkan di sini.
  try{
    if(location.search.indexOf('_pbup=')>-1){
      var _u=new URL(location.href); _u.searchParams.delete('_pbup');
      history.replaceState(history.state,'',_u.pathname+_u.search+_u.hash);
    }
  }catch(x){}
  apply();
  document.addEventListener('visibilitychange',function(){if(!document.hidden)apply();});
})();
