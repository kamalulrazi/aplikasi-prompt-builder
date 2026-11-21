// fitur/karakter-sheet.js — Karakter Sheet — popup untuk membuat dan memakai karakter (dipakai Foto dan Video).
// Bagian dari js/10-main-app.js lama (baris 5061–5725). Isi tidak diubah.
// ════════════════════════════════════════════════════════════════
// KARAKTER SHEET — popup terpisah dari wizard biasa, generate 1
// kalimat prompt siap pakai untuk foto karakter multi-angle. Cuma
// 3 hal yang bisa diatur user (Karakter/Usia/Negara) — outfit,
// ekspresi, angle, & background FIXED sesuai template.
// ════════════════════════════════════════════════════════════════
let csState={gender:'wanita',usia:null,negara:'Indonesia',penampilan:'Cantik, Putih',outfit:"Setelan abaya syar'i"};
let csLastPromptText='';
// FITUR BARU (permintaan user): halaman aktif di wizard Karakter Sheet
// (1=Karakter, 2=Negara, 3=Penampilan, 4=Outfit). Dipakai csGoPage()/
// csGoBack() buat tahu harus render label "Langkah X dari 4" yang mana &
// kapan tombol back (‹) ditampilkan.
let csCurrentPage=1;
const CS_TOTAL_PAGES=4;
// Batas usia karakter (bilangan bulat). Samakan dengan atribut min/max pada
// input #cs-usia-input di HTML. Mau rentang lain? Ubah dua angka ini saja.
const CS_USIA_MIN=18, CS_USIA_MAX=70;
// Chip terakhir yang dipilih per kolom. Dipakai csRestoreChipValue(): begitu
// kolom "isi sendiri" dikosongkan lagi, csState balik ke nilai chip ini,
// bukan tertinggal huruf sisa dari ketikan yang dihapus ("T" dari "Turki").
let csChipMemo={negara:null,penampilan:null,outfit:null};
// true kalau modal dibuka dari tur Langkah 3 (pbOpenCharacterSheetFromTour).
// Di luar tur, salin prompt TIDAK boleh melempar user ke kartu tur.
let csFromTour=false;
// Nomor "generasi" modal: naik tiap modal dibuka/ditutup dan tiap klik Buat
// Prompt. Animasi 2 detik yang modalnya keburu ditutup jadi tahu dirinya
// sudah basi dan tidak memunculkan hasil prompt di layar utama.
let csGenToken=0;
// Penjaga ketukan ganda pada tombol "Salin prompt" (lihat csCopyPrompt()).
let csCopyBusy=false;

function csOpenModal(){
  document.getElementById('cs-modal').style.display='flex';
  // Selalu mulai dari "bukan dari tur"; pbOpenCharacterSheetFromTour()
  // baru menyalakan csFromTour SESUDAH fungsi ini selesai.
  csFromTour=false;
  csGenToken++;
  csCopyBusy=false;
  // Samakan chip & kolom isian dengan csState. csState ikut tersimpan di
  // draft/undo, tapi class 'sel' pada chip tidak, jadi tanpa ini layar bisa
  // menunjukkan Wanita/Indonesia padahal prompt-nya "laki-laki asal Mesir".
  csSyncUiFromState();
  // Setiap modal dibuka (baik dari luar tur maupun dari tur), wizard SELALU
  // mulai lagi dari halaman 1 (Karakter) — bukan nyangkut di halaman
  // terakhir yang sempat dibuka sebelumnya.
  csGoPage(1);
  // Pastikan tombol "Tutup" selalu kelihatan lagi di pemakaian normal
  // (di luar tur) — yang menyembunyikannya cuma alur tur Langkah 3
  // lewat pbOpenCharacterSheetFromTour(), lihat komentar di sana.
  let closeBtn=document.getElementById('cs-close-btn');
  if(closeBtn) closeBtn.style.display='';
}
function csCloseModal(){
  document.getElementById('cs-modal').style.display='none';
  // Batalkan animasi "Buat Prompt" yang mungkin masih berjalan.
  csGenToken++;
}
// Tampilan modal <- csState (lihat komentar di csOpenModal()). Urutannya
// penting: semua 'sel' chip dilepas dulu karena csRelabelPenampilan() &
// csRelabelOutfit() MENIMPA csState kalau menemukan chip ber-'sel', padahal
// nilai yang dipulihkan itulah yang benar.
function csSyncUiFromState(){
  let isLaki=csState.gender==='laki-laki';
  let gW=document.getElementById('cs-gender-wanita');
  let gL=document.getElementById('cs-gender-lakilaki');
  if(gW)gW.classList.toggle('sel',!isLaki);
  if(gL)gL.classList.toggle('sel',isLaki);
  csGenderUi();
  ['negara','penampilan','outfit'].forEach(function(f){
    document.querySelectorAll('#cs-'+f+'-chips .chip').forEach(function(c){c.classList.remove('sel');});
  });
  csRelabelPenampilan();
  csRelabelOutfit();
  ['negara','penampilan','outfit'].forEach(function(f){
    let inp=document.getElementById('cs-'+f+'-custom');
    let cur=csState[f];
    if(!cur){ if(inp)inp.value=''; csRestoreChipValue(f); return; }
    let hit=null;
    document.querySelectorAll('#cs-'+f+'-chips .chip').forEach(function(c){
      if(c.textContent.trim()===cur)hit=c;
    });
    if(hit){
      hit.classList.add('sel');
      csChipMemo[f]=hit;
      if(inp)inp.value='';
    } else if(inp){
      inp.value=cur;
    }
  });
  let uBox=document.getElementById('cs-usia-box');
  let uInp=document.getElementById('cs-usia-input');
  let uBtn=document.getElementById('cs-usia-toggle');
  if(uBox&&uInp&&uBtn&&csState.usia!=null&&csState.usia!==''){
    uInp.value=csState.usia;
    csUsiaUi(true);
  }
}
// Lepas 'sel' dari semua chip satu kolom, tapi ingat dulu chip mana yang
// sedang terpilih (untuk csRestoreChipValue()).
function csDeselectChips(f){
  let cur=document.querySelector('#cs-'+f+'-chips .chip.sel');
  if(cur)csChipMemo[f]=cur;
  document.querySelectorAll('#cs-'+f+'-chips .chip').forEach(function(c){c.classList.remove('sel');});
}
// Kolom "isi sendiri" dikosongkan: csState balik ke chip terakhir yang dipilih
// (atau chip pertama kalau belum pernah ada) dan chip itu menyala lagi.
function csRestoreChipValue(f){
  let chips=Array.prototype.slice.call(document.querySelectorAll('#cs-'+f+'-chips .chip'));
  if(!chips.length)return;
  let el=(csChipMemo[f]&&chips.indexOf(csChipMemo[f])>=0)?csChipMemo[f]:chips[0];
  csState[f]=el.textContent.trim();
  chips.forEach(function(c){c.classList.toggle('sel',c===el);});
}
// Usia yang boleh masuk prompt: bilangan bulat CS_USIA_MIN..CS_USIA_MAX.
// Atribut min/max di HTML TIDAK berlaku di sini (input bukan bagian <form>),
// jadi 0, -5, 999, 2.5, "1e2" dst harus dicegat manual. Kotak usia
// tersembunyi atau kosong = tanpa usia (sah).
function csReadUsia(){
  let box=document.getElementById('cs-usia-box');
  let inp=document.getElementById('cs-usia-input');
  if(!box||!inp||box.classList.contains('hidden'))return {ok:true,val:null};
  let raw=(inp.value||'').trim();
  if(!raw)return (inp.validity&&inp.validity.badInput)?{ok:false}:{ok:true,val:null};
  if(!/^\d+$/.test(raw))return {ok:false};
  let n=parseInt(raw,10);
  if(n<CS_USIA_MIN||n>CS_USIA_MAX)return {ok:false};
  return {ok:true,val:n};
}
// Usia tidak sah: balik ke halaman 1 (tempat kolom usia), fokuskan, kasih tahu.
function csUsiaInvalid(){
  csGoPage(1);
  let inp=document.getElementById('cs-usia-input');
  if(inp){inp.focus();try{inp.select();}catch(e){}}
  showToast('Usia harus antara '+CS_USIA_MIN+' dan '+CS_USIA_MAX+' tahun','error');
}
// ── FITUR BARU (permintaan user): navigasi wizard satu-halaman-per-langkah.
// Sembunyikan semua .cs-page lalu tampilkan cs-page-<n> saja, update label
// "Langkah X dari 4", tombol back (cs-back-btn) cuma kelihatan mulai
// halaman ke-2, dan begitu masuk halaman 4 (Outfit) tombol "Buat Prompt"
// otomatis dikasih denyutan (.cs-pulse-btn) supaya user sadar itu yang
// harus ditekan. Konten modal juga di-scroll balik ke atas tiap pindah
// halaman biar user selalu mulai lihat dari judul field, bukan nyangkut
// di posisi scroll halaman sebelumnya. ─────────────────────────────────
function csGoPage(n){
  document.querySelectorAll('.cs-page').forEach(function(p){p.classList.add('hidden');});
  let target=document.getElementById('cs-page-'+n);
  if(target) target.classList.remove('hidden');
  csCurrentPage=n;
  let backBtn=document.getElementById('cs-back-btn');
  if(backBtn) backBtn.style.display=(n>1)?'':'none';
  let lbl=document.getElementById('cs-page-label');
  if(lbl){ lbl.textContent='Langkah '+n+' dari '+CS_TOTAL_PAGES; lbl.style.display='none'; }
  let genBtn=document.getElementById('cs-generate-btn');
  if(genBtn && n===4) genBtn.classList.add('cs-pulse-btn');
  let scrollBox=document.getElementById('cs-modal');
  if(scrollBox) scrollBox.scrollTop=0;
}
function csGoBack(){
  if(csCurrentPage>1) csGoPage(csCurrentPage-1);
}
function csPickGender(val,el){
  csState.gender=val;
  document.querySelectorAll('#cs-gender-wanita,#cs-gender-lakilaki').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel');
  csGenderUi();
  csRelabelPenampilan();
  csRelabelOutfit();
}
// Ganti label chip Penampilan sesuai gender ("Cantik" utk wanita, "Ganteng"
// utk laki-laki). Kalau chip yang sedang aktif (sel) adalah salah satu dari
// keduanya, csState.penampilan ikut disegarkan biar isi prompt konsisten
// sama label baru yang kelihatan di layar.
function csRelabelPenampilan(){
  let isLaki=csState.gender==='laki-laki';
  document.querySelectorAll('#cs-penampilan-chips .chip').forEach(c=>{
    let label=isLaki?c.dataset.m:c.dataset.f;
    if(!label)return;
    c.textContent=label;
    if(c.classList.contains('sel'))csState.penampilan=label;
  });
}
// ── Outfit — field BARU (permintaan user), sama pola dengan Penampilan di
// atas: cuma 1 chip yang tampil sesuai gender ("Setelan abaya syar'i" utk
// wanita, "Outfit casual" utk laki-laki) + isi sendiri. ─────────────────
function csRelabelOutfit(){
  let isLaki=csState.gender==='laki-laki';
  document.querySelectorAll('#cs-outfit-chips .chip').forEach(c=>{
    let label=isLaki?c.dataset.m:c.dataset.f;
    if(!label)return;
    c.textContent=label;
    if(c.classList.contains('sel'))csState.outfit=label;
  });
  // Placeholder "Atau isi sendiri" juga ikut disesuaikan gender — contoh
  // "gamis" gak relevan buat laki-laki, jadi diganti contoh outfit cowok.
  let customInp=document.getElementById('cs-outfit-custom');
  if(customInp){
    let ph=isLaki?customInp.dataset.phM:customInp.dataset.phF;
    if(ph)customInp.placeholder=ph;
  }
}
// Tampilan panel (desain "Preview B"): geser indikator Wanita/Laki-laki &
// sinkronkan aria-pressed. Dipanggil csPickGender() & csSyncUiFromState().
function csGenderUi(){
  let isLaki=csState.gender==='laki-laki';
  let seg=document.getElementById('cs-seg');
  if(seg)seg.dataset.v=isLaki?'laki':'wanita';
  [['cs-gender-wanita',!isLaki],['cs-gender-lakilaki',isLaki]].forEach(function(p){
    let e=document.getElementById(p[0]);
    if(e)e.setAttribute('aria-pressed',p[1]?'true':'false');
  });
}
// Baris "Atur usia": saklar (mati) <-> stepper − 25 + (nyala), seperti di
// preview. Saat nyala saklar disembunyikan, jadi tombol "Hapus usia" yang
// mematikannya lagi (memanggil csToggleUsia() juga).
function csUsiaUi(on){
  let box=document.getElementById('cs-usia-box');
  let sw=document.getElementById('cs-usia-toggle');
  let off=document.getElementById('cs-usia-off');
  let hint=document.getElementById('cs-usia-hint');
  if(box)box.classList.toggle('hidden',!on);
  if(sw){sw.classList.toggle('hidden',on);sw.setAttribute('aria-checked',on?'true':'false');}
  if(off)off.classList.toggle('hidden',!on);
  if(hint)hint.textContent=on?('Rentang '+CS_USIA_MIN+' sampai '+CS_USIA_MAX+' tahun'):'Opsional, kosongkan kalau bebas';
}
function csToggleUsia(){
  let box=document.getElementById('cs-usia-box');
  let inp=document.getElementById('cs-usia-input');
  if(!box.classList.contains('hidden')){
    inp.value='';
    csState.usia=null;
    csUsiaUi(false);
  } else {
    if(!inp.value)inp.value=25;
    csUsiaUi(true);
  }
}
// Tombol − / + di stepper usia, dibatasi CS_USIA_MIN..CS_USIA_MAX.
function csStepUsia(d){
  let inp=document.getElementById('cs-usia-input');
  let cur=parseInt(inp.value,10);
  if(isNaN(cur))cur=25;
  inp.value=Math.max(CS_USIA_MIN,Math.min(CS_USIA_MAX,cur+d));
}
function csPickNegara(val,el){
  csState.negara=val;
  document.getElementById('cs-negara-custom').value='';
  document.querySelectorAll('#cs-negara-chips .chip').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel');
  csChipMemo.negara=el;
}
// Begitu user tap ke kolom "isi sendiri", langsung lepas warna kuning dari
// chip Negara — sebelum sempat ngetik apa pun — supaya gak kelihatan kayak
// dua-duanya (chip + isian sendiri) bakal dipakai bareng di prompt.
function csNegaraCustomFocus(){
  csDeselectChips('negara');
}
// Kalau user keluar dari kolom tanpa ngetik apa-apa, kembalikan warna
// kuning ke chip yang sesuai csState.negara (biar gak kelihatan kosong).
function csNegaraCustomBlur(){
  let v=(document.getElementById('cs-negara-custom').value||'').trim();
  if(v)return;
  document.querySelectorAll('#cs-negara-chips .chip').forEach(c=>{
    if(c.textContent.trim()===csState.negara)c.classList.add('sel');
  });
}
// Dipicu langsung tiap kali user mengetik (oninput) — bukan lewat tombol
// "Pakai" lagi, supaya isian custom langsung dianggap "berlaku" begitu
// diketik, dan chip Indonesia/Mesir/Arab Saudi yang lagi aktif langsung
// kehilangan warna kuningnya (menjawab keluhan: kelihatan seolah masih
// pakai Indonesia padahal user sudah mau isi sendiri). Kalau field
// dikosongkan lagi, nilai negara BALIK ke chip yang terakhir dipilih
// (csRestoreChipValue) — bukan tertinggal huruf sisa dari ketikan yang
// dihapus, dan prompt tetap tidak pernah kosong.
function csNegaraCustomInput(){
  let v=(document.getElementById('cs-negara-custom').value||'').trim();
  if(!v){csRestoreChipValue('negara');return;}
  csState.negara=v;
  csDeselectChips('negara');
}
// ── Penampilan — field baru, sama pola dengan Negara di atas: pilih chip
// ATAU isi sendiri (live lewat oninput, tanpa tombol "Pakai"). Nilainya
// dipakai gantiin kata sifat "cantik/tampan" yang dulu di-hardcode
// berdasarkan gender saja di csGeneratePrompt(). ──────────────────────
function csPickPenampilan(el){
  csState.penampilan=el.textContent.trim();
  document.getElementById('cs-penampilan-custom').value='';
  document.querySelectorAll('#cs-penampilan-chips .chip').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel');
  csChipMemo.penampilan=el;
}
// Sama seperti Negara: lepas warna kuning chip Penampilan begitu kolom
// "isi sendiri" difokus, dan kembalikan kalau ditinggal kosong.
function csPenampilanCustomFocus(){
  csDeselectChips('penampilan');
}
function csPenampilanCustomBlur(){
  let v=(document.getElementById('cs-penampilan-custom').value||'').trim();
  if(v)return;
  document.querySelectorAll('#cs-penampilan-chips .chip').forEach(c=>{
    if(c.textContent.trim()===csState.penampilan)c.classList.add('sel');
  });
}
function csPenampilanCustomInput(){
  let v=(document.getElementById('cs-penampilan-custom').value||'').trim();
  if(!v){csRestoreChipValue('penampilan');return;}
  csState.penampilan=v;
  csDeselectChips('penampilan');
}
// ── Outfit — field BARU (permintaan user): pola sama dengan Negara/
// Penampilan (pilih chip ATAU isi sendiri, live lewat oninput, tanpa
// tombol "Pakai"). Bedanya cuma ada 1 chip yang tampil sesuai gender
// (lihat csRelabelOutfit()). Nilainya dipakai gantiin outfit yang dulu
// di-hardcode berdasarkan gender saja di csGeneratePrompt(). ──────────
function csPickOutfit(el){
  csState.outfit=el.textContent.trim();
  document.getElementById('cs-outfit-custom').value='';
  document.querySelectorAll('#cs-outfit-chips .chip').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel');
  csChipMemo.outfit=el;
}
function csOutfitCustomFocus(){
  csDeselectChips('outfit');
}
function csOutfitCustomBlur(){
  let v=(document.getElementById('cs-outfit-custom').value||'').trim();
  if(v)return;
  document.querySelectorAll('#cs-outfit-chips .chip').forEach(c=>{
    if(c.textContent.trim()===csState.outfit)c.classList.add('sel');
  });
}
function csOutfitCustomInput(){
  let v=(document.getElementById('cs-outfit-custom').value||'').trim();
  if(!v){csRestoreChipValue('outfit');return;}
  csState.outfit=v;
  csDeselectChips('outfit');
}
// ── Klik "Buat Prompt" — tombol diganti sementara jadi animasi logo "P"
// (sama persis dengan loading Generate Prompt Foto di f-gen-btn: pecah
// dulu lalu nyatu di ~650ms, total 2 detik) baru hasil promptnya
// ditampilkan — supaya jeda generate di sini terasa konsisten sebagai
// bagian dari branding aplikasi, bukan cuma teks yang muncul instan.
// FITUR BARU (permintaan user): logo dibuat lebih besar supaya "terlihat
// jelas" (48px, sebelumnya 40px bawaan .gen-logo-box) dan label teks
// "Membuat Prompt..." DIHAPUS selama animasi ini berjalan — logo P sendiri
// yang jadi fokus, tanpa teks apa pun di bawahnya. Denyutan .cs-pulse-btn
// juga dilepas begitu tombol ditekan (biar tidak "berdenyut" bareng
// animasi logo), dan dipasang lagi tiap kali user balik ke halaman Outfit
// lewat csGoPage(). ─────────────────────────────────────────────────
function csGeneratePrompt(){
  // Usia dicek DULU sebelum animasi 2 detik jalan — jangan bikin user
  // menunggu dulu baru ditolak.
  if(!csReadUsia().ok){csUsiaInvalid();return;}
  let myGen=++csGenToken;
  let genBtn=document.getElementById('cs-generate-btn');
  let genBtnOrigHTML=genBtn?genBtn.innerHTML:'';
  if(genBtn){
    genBtn.classList.remove('cs-pulse-btn');
    genBtn.disabled=true;
    genBtn.classList.add('btn-loading');
    genBtn.innerHTML='<div class="gen-logo-wrap" id="cs-gen-logo-wrap" style="padding:4px 0;">'
      +'<div class="gen-logo-box" style="width:48px;height:48px;">'
        +'<svg class="gen-logo-svg" style="width:38px;height:38px;" viewBox="0 0 642 635" xmlns="http://www.w3.org/2000/svg">'
          +'<defs><linearGradient id="csGenPGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F0D9A0"/><stop offset="100%" stop-color="#B8965F"/></linearGradient></defs>'
          +'<path class="p-layer p-layer-back" pathLength="1" fill="url(#csGenPGrad)" d="M146,92 L162,109 L179,119 L194,124 L206,126 L346,127 L373,134 L395,146 L386,133 L365,114 L343,102 L318,94 L306,92 Z M349,92 L361,96 L383,109 L401,126 L407,134 L417,154 L420,168 L431,184 L439,201 L444,219 L445,231 L481,231 L479,213 L470,183 L460,163 L443,140 L426,124 L402,108 L381,99 Z M253,195 L267,188 L293,183 L335,183 L345,185 L362,193 L375,205 L382,216 L387,229 L396,208 L399,184 L398,177 L379,162 L355,152 L331,149 L312,153 L285,166 L271,176 Z M291,150 L271,154 L251,161 L237,168 L216,182 L192,207 L182,223 L174,243 L169,271 L169,553 L203,534 L203,268 L208,239 L217,216 L233,192 L261,166 L277,156 Z M481,253 L445,253 L441,277 L435,293 L419,317 L403,333 L387,344 L370,352 L345,358 L279,359 L279,394 L325,394 L364,390 L391,381 L419,365 L447,339 L465,312 L477,281 Z"/>'
          +'<path class="p-layer p-layer-front" pathLength="1" fill="url(#csGenPGrad)" d="M415,201 L407,228 L397,245 L386,256 L383,267 L377,277 L360,293 L339,301 L259,302 L258,210 L243,224 L236,234 L227,254 L224,271 L224,519 L233,513 L249,497 L258,485 L258,337 L345,335 L364,330 L378,323 L393,312 L402,303 L413,287 L418,276 L423,257 L423,227 Z"/>'
        +'</svg>'
      +'</div>'
    +'</div>';
    void genBtn.offsetWidth;
    setTimeout(function(){
      let w=document.getElementById('cs-gen-logo-wrap');
      if(w) w.classList.add('merged');
    },650);
  }
  setTimeout(function(){
    // Modal ditutup (atau dibuka ulang) selama animasi: jangan munculkan
    // hasil prompt di layar utama. Tombol tetap dipulihkan seperti biasa.
    if(myGen===csGenToken) _csDoGeneratePrompt();
    if(genBtn){genBtn.disabled=false;genBtn.classList.remove('btn-loading');genBtn.innerHTML=genBtnOrigHTML;}
  },2000);
}
function _csDoGeneratePrompt(){
  // Baca usia langsung dari input (jaga-jaga kalau user isi tanpa toggle ke
  // off dulu) dan VALIDASI: bilangan bulat CS_USIA_MIN..CS_USIA_MAX, kalau
  // tidak prompt tidak dibuat. csGeneratePrompt() sudah mencegat lebih awal;
  // ini jaring pengaman kalau fungsi ini dipanggil dari tempat lain.
  let usia=csReadUsia();
  if(!usia.ok){csUsiaInvalid();return;}
  csState.usia=usia.val;

  // Prompt karakter sheet dibuat dalam BAHASA INGGRIS. Pilihan chip (gender, negara, penampilan,
  // outfit) berlabel Indonesia, jadi diterjemahkan lewat peta di bawah. Isian "isi sendiri" yang
  // tidak ada di peta dipakai apa adanya (sesuai ketikan user).
  let _csEn=function(map,val,fallback){
    let k=String(val||'').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(map,k)?map[k]:(String(val||'').trim()||fallback);
  };
  let isLaki=csState.gender==='laki-laki';
  let genderEn=isLaki?'man':'woman';
  let negaraEn=_csEn({'indonesia':'Indonesia','mesir':'Egypt','arab saudi':'Saudi Arabia'},csState.negara,'Indonesia');
  let penampilanEn=_csEn({
    'cantik, putih':'beautiful, fair-skinned','ganteng, putih':'handsome, fair-skinned',
    'cantik, sawo matang':'beautiful, tan-skinned','ganteng, sawo matang':'handsome, tan-skinned',
    'biasa aja':'average-looking','jelek':'plain, unattractive'
  },csState.penampilan,isLaki?'handsome, fair-skinned':'beautiful, fair-skinned').toLowerCase();
  let outfitEn=_csEn({
    "setelan abaya syar'i":"a modest syar'i abaya set",'outfit casual':'a casual outfit'
  },csState.outfit||(isLaki?'outfit casual':"setelan abaya syar'i"),'a casual outfit');
  let usiaClause=csState.usia?('aged '+csState.usia+' '):'';
  let text='Create a complete multi-angle character sheet photo with various expressions and several angles: front, side, low angle, high angle, and eye level. The character is a '
    +genderEn+' '+usiaClause+'with '+(/^[aeiou]/i.test(penampilanEn)?'an ':'a ')+penampilanEn+' appearance, from '+negaraEn
    +', wearing '+outfitEn+', on a clean white background. Make sure the character is a realistic human, not an animated image.';

  csLastPromptText=text;
  csShowResultNotif(text);
}
// Notifikasi tengah layar berisi Hasil Prompt + tombol Salin, muncul di
// ATAS modal Karakter Sheet (#cs-modal tetap kebuka di belakangnya) begitu
// user klik "Buat Prompt". Ada tombol kecil "Buat ulang" — kalau user mau
// ganti-ganti pilihan dulu sebelum salin, tinggal tekan itu buat nutup
// notifikasi ini aja (modal Karakter Sheet di belakang tetap ada & masih

// bisa diedit, tinggal klik "Buat Prompt" lagi).
function csShowResultNotif(text){
  let old=document.getElementById('cs-result-notif');
  if(old)old.remove();
  csCopyBusy=false; // hasil baru = tombol Salin boleh dipakai lagi
  let overlay=document.createElement('div');
  overlay.className='confirm-overlay cs-result-page';
  overlay.id='cs-result-notif';
  overlay.style.zIndex='9999';
  let box=document.createElement('div');
  box.className='confirm-box';
  box.style.cssText='max-width:440px;text-align:left;';
  let label=document.createElement('label');
  label.className='inplabel';
  label.style.cssText='margin-top:0;';
  label.textContent='Hasil Prompt';
  let textBox=document.createElement('div');
  textBox.id='cs-result-text';
  textBox.style.cssText='background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;font-size:var(--fs-xs);color:var(--text);line-height:1.65;white-space:pre-wrap;margin-bottom:12px;max-height:55vh;overflow-y:auto;-webkit-user-select:text;user-select:text;-webkit-touch-callout:default;';
  // Teks hasil WAJIB bisa dipilih/ditahan: aturan global body *{user-select:none}
  // membuatnya tak bisa dipilih, padahal itu satu-satunya jalan salin manual
  // kalau clipboard diblokir (WebView TikTok/Instagram).
  textBox.textContent=text;
  let copyBtn=document.createElement('button');
  copyBtn.id='cs-copy-btn';
  copyBtn.className='cs-pulse-btn';
  copyBtn.textContent='Salin prompt';
  // FITUR BARU (permintaan user): tombol Salin dikasih denyutan
  // (.cs-pulse-btn, dilepas otomatis begitu ditekan — lihat csCopyPrompt())
  // dan latar kuningnya dibikin TIDAK selebar penuh lagi (beda dari
  // sebelumnya width:100%) — cukup sepanjang teksnya, ditengah, biar lebih
  // enak diliat. UPDATE (permintaan user): tombol diperkecil sedikit
  // (padding/min-width/font) dan labelnya jadi "Salin prompt".
  copyBtn.style.cssText="width:auto;min-width:118px;max-width:100%;margin:0 auto;display:block;background:var(--accent);color:var(--bg);border:none;padding:8px 18px;border-radius:var(--radius-md);font-size:var(--fs-xs2);font-weight:600;cursor:pointer;font-family:'Hanken Grotesk',sans-serif;text-align:center;";
  copyBtn.onclick=csCopyPrompt;
  let redoBtn=document.createElement('button');
  redoBtn.textContent='Buat ulang';
  redoBtn.style.cssText="display:block;width:100%;background:none;border:none;color:var(--muted);font-size:var(--fs-xs2);cursor:pointer;text-decoration:underline;padding:10px 0 0;text-align:center;font-family:'Hanken Grotesk',sans-serif;";
  // FITUR BARU (permintaan user): "Buat ulang" sekarang beneran mengulang
  // proses PEMBUATAN dari awal (halaman 1 — Karakter/jenis kelamin), bukan
  // cuma menutup notifikasi hasil prompt & diam di halaman Outfit seperti
  // sebelumnya. Modal Karakter Sheet di belakang TETAP terbuka.
  redoBtn.onclick=function(){overlay.remove();csGoPage(1);};
  box.appendChild(label);box.appendChild(textBox);box.appendChild(copyBtn);box.appendChild(redoBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}
// Notifikasi tengah layar sesudah user salin prompt Karakter Sheet — beda
// dari showConfirm() (judulnya selalu "Yakin?" + tombol Batal/Ya) karena
// ini murni info sepihak, cuma butuh 1 tombol "Mengerti". Dipakai warna
// aksen emas (bukan merah seperti .confirm-ok) karena ini bukan aksi
// destruktif. ───────────────────────────────────────────────────────
function csShowSavedNotif(onDone){
  // Jaga-jaga dobel: kalau dialog ini sudah tampil, jangan bikin yang kedua.
  if(document.getElementById('cs-saved-notif'))return;
  let overlay=document.createElement('div');
  overlay.id='cs-saved-notif';
  overlay.className='confirm-overlay pb-tour-notif';
  let box=document.createElement('div');box.className='confirm-box';
  let p=document.createElement('p');
  p.style.cssText='color:var(--text);font-size:var(--fs-sm);line-height:1.65;margin-bottom:16px;';
  p.textContent='yang kamu salin namanya "prompt". Itu adalah kunci untuk membuat foto karakter sheet.';
  let okBtn=document.createElement('button');
  okBtn.textContent='Mengerti';
  okBtn.style.cssText="width:100%;background:var(--accent);color:var(--bg);border:none;padding:11px;border-radius:var(--radius-md);font-size:var(--fs-sm);font-weight:600;cursor:pointer;font-family:'Hanken Grotesk',sans-serif;";
  box.appendChild(p);box.appendChild(okBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  okBtn.onclick=function(){overlay.remove();if(onDone)onDone();};
}
function csCopyPrompt(){
  let btn=document.getElementById('cs-copy-btn');
  let text=csLastPromptText||'';
  if(!text){showToast('Buat prompt-nya dulu ya','error');return;}
  // Ketukan kedua selagi proses salin masih jalan DIABAIKAN. Tanpa ini tiap
  // ketukan memasang timer 600ms sendiri sehingga dialog "Mengerti" muncul dobel.
  if(csCopyBusy)return;
  csCopyBusy=true;
  if(btn)btn.disabled=true;
  // Dibaca sekarang: csFromTour dinyalakan pbOpenCharacterSheetFromTour() dan
  // di-nol-kan tiap csOpenModal(). Dialog "Mengerti" tetap tampil di luar tur,
  // tapi HANYA di dalam tur user dibawa balik ke Langkah 3 (pbBackToStep3).
  // Dulu selalu dipanggil, jadi user yang memakai tombol Karakter Sheet biasa
  // tiba-tiba dilempar ke kartu tur "Install Google Flow".
  let dariTur=csFromTour;
  // Lanjutan sesudah prompt tersalin. Dipakai salin otomatis yang sukses DAN
  // tombol "Sudah kusalin manual" (jalan keluar kalau clipboard diblokir).
  // Prompt sudah tersalin — tutup notifikasi hasil prompt + modal Karakter
  // Sheet, kasih tahu lewat notifikasi tengah bahwa yang disalin itu "prompt"
  // dan bakal dipakai di langkah berikutnya, lalu begitu "Mengerti" ditekan
  // baru (kalau dari tur) tur BALIK ke Langkah 3 (buka butir no.1: install
  // Google Flow) — bukan langsung lompat ke Langkah 4.
  function lanjut(delay){
    setTimeout(function(){
      let notif=document.getElementById('cs-result-notif');
      if(notif)notif.remove();
      csCloseModal();
      csShowSavedNotif(function(){ if(dariTur) pbBackToStep3(); });
    },delay);
  }
  function onOk(){
    if(btn){
      btn.classList.remove('cs-pulse-btn');
      btn.textContent='Tersalin!';
      setTimeout(()=>{btn.textContent='Salin prompt';},2000);
    }
    lanjut(600);
  }
  // Salin otomatis gagal total: kunci dibuka lagi (boleh coba lagi) dan user
  // ditawari salin manual. Tanpa ini user di dalam tur BUNTU: tombol "Tutup"
  // modal sengaja disembunyikan di tur, dan toast error dulu tertutup hasil prompt.
  function onGagal(){
    csCopyBusy=false;
    if(btn)btn.disabled=false;
    showToast('Gagal salin otomatis','error');
    csShowManualCopy(function(){ csCopyBusy=true; lanjut(0); });
  }
  function onFail(){
    let ta=document.createElement('textarea');ta.value=text;
    ta.style.cssText='position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(ta);ta.focus();ta.select();
    let ok=false;
    try{ok=document.execCommand('copy');}catch(e){ok=false;}
    document.body.removeChild(ta);
    if(ok)onOk();else onGagal();
  }
  if(navigator.clipboard&&navigator.clipboard.writeText){
    try{navigator.clipboard.writeText(text).then(onOk,onFail);}catch(e){onFail();}
  } else {
    onFail();
  }
}
// Pilih (blok) seluruh teks hasil prompt supaya bisa langsung disalin lewat
// menu tahan-lalu-"Salin" milik HP.
function csSelectResultText(){
  let el=document.getElementById('cs-result-text');
  if(!el)return;
  try{
    let r=document.createRange();r.selectNodeContents(el);
    let sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);
  }catch(e){}
}
// Jalan keluar kalau salin otomatis gagal (mis. WebView TikTok/Instagram yang
// memblokir clipboard): teks hasil prompt dipilih otomatis, lalu tombol "Sudah
// kusalin manual" meneruskan alur yang sama seperti salin sukses (termasuk
// lanjut tur).
function csShowManualCopy(onDone){
  csSelectResultText();
  if(document.getElementById('cs-manual-copy'))return;
  let box=document.querySelector('#cs-result-notif .confirm-box');
  if(!box)return;
  let wrap=document.createElement('div');
  wrap.id='cs-manual-copy';
  wrap.style.cssText='margin-top:14px;text-align:center;';
  let hint=document.createElement('p');
  hint.style.cssText='color:var(--muted);font-size:var(--fs-xs2);line-height:1.55;margin:0 0 8px;';
  hint.textContent='Salin otomatis gagal. Tahan teks prompt di atas, pilih "Salin", lalu ketuk tombol di bawah ini.';
  let doneBtn=document.createElement('button');
  doneBtn.type='button';
  doneBtn.textContent='Sudah kusalin manual';
  doneBtn.style.cssText="width:auto;min-width:118px;max-width:100%;margin:0 auto;display:block;background:var(--surface2);color:var(--accent);border:1px solid var(--border-hi);padding:8px 18px;border-radius:var(--radius-md);font-size:var(--fs-xs2);font-weight:600;cursor:pointer;font-family:'Hanken Grotesk',sans-serif;text-align:center;";
  doneBtn.onclick=function(){doneBtn.disabled=true;onDone();};
  wrap.appendChild(hint);wrap.appendChild(doneBtn);
  box.insertBefore(wrap,box.lastChild); // sebelum link "Buat ulang"
}

function fCopy(){
  let btn=document.getElementById('f-copy-btn');
  let el=document.getElementById('f-prompt-full');
  let text=(el.textContent||el.innerText||'').trim();
  if(!text){showToast('Belum ada prompt untuk disalin!','error');return;}
  function onOk(){
    btn.innerHTML='Tersalin!';btn.classList.add('copied');
    setTimeout(()=>{btn.innerHTML='Salin Prompt';btn.classList.remove('copied');},2000);
    let doneLabel=document.getElementById('f-copy-done');
    if(doneLabel)doneLabel.classList.remove('hidden');
  }
  function onFail(){
    let ta=document.createElement('textarea');ta.value=text;
    ta.style.cssText='position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(ta);ta.focus();ta.select();
    try{let ok=document.execCommand('copy');if(ok)onOk();else showToast('Gagal salin — coba select manual','error');}catch(e){showToast('Gagal salin — coba select manual','error');}
    document.body.removeChild(ta);
  }
  if(navigator.clipboard){
    navigator.clipboard.writeText(text).then(onOk).catch(onFail);
  } else {
    onFail();
  }
}

function fReset(){
  // FIX A13: Tawarkan opsi salin prompt terakhir sebelum reset, agar user tidak kehilangan hasil
  let hasOutput=(document.getElementById('f-json-output')?.style.display!=='none')||(document.getElementById('f-multi-output')?.style.display==='flex');
  let confirmMsg='Semua data foto akan dihapus dan kamu mulai dari awal.';
  if(hasOutput){confirmMsg='Semua data foto akan dihapus dan kamu mulai dari awal.<br><span style="font-size:var(--fs-xs2);color:var(--accent);">Tip: Salin prompt dulu sebelum reset jika masih dibutuhkan.</span>';}
  showConfirm(confirmMsg,fResetNow);
}
// Inti reset wizard Foto TANPA dialog konfirmasi — dipanggil fReset() (setelah
// user konfirmasi) dan pbReplayTour() (tur ulang butuh wizard yang bersih).
function fResetNow(){
  (function(){
    fResetFrom(0);
    FS.shotOverrides={};
    let mo=document.getElementById('f-multi-output');if(mo){mo.style.display='none';mo.innerHTML='';}
    let ph=document.getElementById('f-preview-placeholder');if(ph)ph.style.display='';
    let fcd=document.getElementById('f-copy-done');if(fcd)fcd.classList.add('hidden');

    // Bersihkan state & UI import prompt lama juga
    FS.importActive=false;FS.importRefPhotos=null;FS.importCriticalRule='';FS.importConflictRule='';
    FS.importGeneratedOutfit=null;FS.importProductBlock=null;FS.importOutputQuality=null;
    FS.importStyleReference=null;FS.importSubject='';FS.importIsProdukSaja=false;FS.importProdukNoPhoto=false;FS.importSceneSig='';
    let importTa=document.getElementById('f-import-textarea');if(importTa)importTa.value='';
    let importStatus=document.getElementById('f-import-status');if(importStatus)importStatus.classList.add('hidden');
    let importErr=document.getElementById('f-import-error');if(importErr)importErr.classList.add('hidden');
    let importArea=document.getElementById('f-import-area');if(importArea){importArea.classList.add('hidden');importArea.classList.remove('ft-imported');}

    // Reset progress bar ke tampilan awal (sebelum user pilih subjek)
    let fill=document.getElementById('f-progress-fill');if(fill)fill.style.width='0%';
    let label=document.getElementById('f-progress-label');
    if(label)label.innerHTML='Step <span>1</span> dari <span>7</span>'; // total awal 7 = sama dengan HTML awal (subjek belum dipilih)
    let title=document.getElementById('f-progress-title');if(title)title.textContent='Subjek Foto';
    fSyncStepNums();

    // FIX BUG "TAMPILAN KOSONG" SETELAH RESET: baris ini sebelumnya pakai
    // f0.scrollIntoView(...) — method itu SUDAH DIOVERRIDE GLOBAL jadi no-op
    // (cuma kasih kilau .just-revealed, TIDAK BENERAN SCROLL — lihat <script>
    // paling atas). Kalau user reset saat posisi scroll masih di bawah
    // (lihat hasil JSON generate), layar tidak pernah ikut digeser balik ke
    // atas walau semua card & FS sudah berhasil direset — user cuma
    // ngeliat area output yang baru saja dikosongkan, kelihatan seperti
    // "tampilan kosong" padahal wizard-nya sudah kembali ke Step 1 di atas.
    // Pola yang benar sudah dipakai di switchPage()/fScrollToCard(): scroll
    // MANUAL ke .app-shell (container scroll asli app ini), bukan
    // scrollIntoView(), supaya tidak ikut kena override itu.
    let _appShellReset=document.querySelector('.app-shell');
    if(_appShellReset) _appShellReset.scrollTo({top:0,behavior:'smooth'});
    if(typeof pbResetProgress==='function') pbResetProgress();
  })();
}

// ============================================================
// VAI — UNCHANGED
