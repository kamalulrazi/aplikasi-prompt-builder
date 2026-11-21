// fitur/umum-aksesibilitas-keyboard.js — Chip dan kartu bisa difokus dan ditekan lewat keyboard.
// Bagian dari js/10-main-app.js lama (baris 7445–7478). Isi tidak diubah.
// ============================================================
// KEYBOARD ACCESSIBILITY
// Semua elemen div/span yang bersifat interaktif (chip, subjek-card,
// ftype-btn, catcard, vstyle-card, produk-choice) perlu:
//   - tabindex="0" agar bisa difokus keyboard
//   - keydown Enter/Space agar bisa "diklik" keyboard
// Dilakukan sekali setelah DOM siap via MutationObserver+init
// ============================================================
(function(){
  // FIX #6: Tambah .suara-card ke selector — kartu suara laki-laki di-inject JS
  // dan tidak punya tabindex sampai sekarang. Ditambahkan di sini sebagai safety net
  // (kartu pria sudah punya tabindex dari vaiRenderMaleCard, tapi ini jaga-jaga).
  // Kartu perempuan di HTML statis juga mendapat tabindex dari sini.
  const SELECTORS='.chip,.subjek-card,.ftype-btn,.catcard,.vstyle-card,.produk-choice,.suara-card';
  function patchEl(el){
    if(el.getAttribute('tabindex'))return; // sudah di-patch
    el.setAttribute('tabindex','0');
    el.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}
    });
  }
  function patchAll(){document.querySelectorAll(SELECTORS).forEach(patchEl);}
  patchAll();
  // Observer untuk chip yang dibuat dinamis (chip pose, kamera, dll)
  let obs=new MutationObserver(function(muts){
    muts.forEach(function(m){m.addedNodes.forEach(function(n){
      if(n.nodeType!==1)return;
      if(n.matches&&n.matches(SELECTORS))patchEl(n);
      n.querySelectorAll&&n.querySelectorAll(SELECTORS).forEach(patchEl);
    });});
  });
  obs.observe(document.body,{childList:true,subtree:true});
})();

