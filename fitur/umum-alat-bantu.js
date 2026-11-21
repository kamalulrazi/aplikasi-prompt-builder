// fitur/umum-alat-bantu.js — Alat bantu dipakai semua fitur: pintasan keyboard, urungkan pilihan chip, klik cepat pada chip, simpan teks "isi sendiri".
// Bagian dari js/10-main-app.js lama (baris 1–480). Isi tidak diubah.
// js/10-main-app.js — dipindah dari <script> di index.html lama (baris 8094). Isi tidak diubah.
// ============================================================
// SHARED UTILS
// ============================================================
function pbRenderAkunCard(){
  try{
    var u=JSON.parse(localStorage.getItem('pb_auth_user')||'null');
    var e=document.getElementById('pb-akun-email'); if(e) e.textContent=(u&&u.email)||'-';
    var t=(typeof pbGetTier==='function')?pbGetTier():'free';
    var C=window.PB_TIER_CONFIG, p=document.getElementById('pb-akun-paket');
    if(p) p.textContent=(C&&C[t])?(C[t].label+' ('+C[t].limit+' produk/hari)'):'Gratis';
  }catch(x){}
}
function switchPage(id,btn){
  if(id==='panduan'){ try{ pbRenderAkunCard(); }catch(x){} }
  document.querySelectorAll('.page').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.ntab').forEach(e=>e.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
  let shell=document.getElementById('app-shell');
  if(shell) shell.scrollTop=0; else window.scrollTo(0,0);
  // FITUR BARU (permintaan user, Sept 2026): catat tab/page yang sedang
  // aktif ('foto'/'video'/'riwayat'/'panduan') ke key TERPISAH dari draft
  // wizard (pb_wizard_draft_v1). SENGAJA terpisah — key ini TETAP hidup
  // walau user refresh (draft wizard tetap dihapus & isian tetap mulai
  // dari 0 seperti yang sudah disepakati), supaya begitu app kebuka lagi
  // setelah refresh, tab yang ditampilkan balik ke tab TERAKHIR yang
  // dibuka (mis. tab Video), bukan selalu balik ke tab Foto (default
  // bawaan HTML). Lihat pemulihannya di window.load paling bawah file
  // (cari string "pb_last_active_page_v1").
  try{ localStorage.setItem('pb_last_active_page_v1', id); }catch(e){}
  // FITUR BARU (permintaan user): begitu tab "Foto" dibuka, sinkronkan
  // lagi thumbnail foto Karakter Sheet di kartu Subjek Foto (f0) — lihat
  // pbF0KsThumbSync() untuk logikanya.
  if(id==='foto' && typeof pbF0KsThumbSync==='function') pbF0KsThumbSync();
}

// Dipakai menu step desktop (#f-step-nav). scrollIntoView() sudah di-override
// jadi no-op (lihat <script> paling atas) dan step yang sudah selesai
// disembunyikan total oleh doneCard(), jadi dulu klik menu ini tidak
// melakukan apa-apa. Sekarang: step yang sudah selesai dibuka lewat
// fSummaryEdit() (jalur yang sama dengan sheet \"Lompat ke step\"), step yang
// sedang aktif cukup di-scroll, step yang belum sampai dikasih tahu lewat toast.
function fJumpStep(id){
  let el=document.getElementById(id);
  if(!el)return;
  if(el.classList.contains('done')){
    let m=/^f(\d+)$/.exec(id);
    if(m && typeof fSummaryEdit==='function'){
      fSummaryEdit(parseInt(m[1],10));
      setTimeout(function(){fScrollToCard(el);},80);
      return;
    }
  }
  if(el.classList.contains('pending')){
    showToast('Selesaikan step sebelumnya dulu ya','info');
    return;
  }
  fScrollToCard(el);
}

function openApiKeyModal(){
  let m=document.getElementById('apikey-modal-overlay');
  if(m)m.style.display='flex';
  let errBox=document.getElementById('vai-key-error');
  if(errBox){errBox.classList.add('hidden');errBox.textContent='';}
  // FIX: tombol "Simpan & Mulai" di dalam modal ini di-disable sesaat
  // selagi proses simpan key berjalan (lihat vaiSaveKey). Kalau proses itu
  // kebetulan terhenti di tengah jalan (mis. tab di-refresh/pindah pas lagi
  // proses), tombolnya bisa nyangkut permanen dalam keadaan disabled untuk
  // sesi berikutnya. Supaya tombol "AI" ini SELALU bisa dipakai lagi tiap
  // dibuka, statusnya dipaksa reset ke kondisi normal di sini.
  let saveBtn=document.querySelector('#vai-key .btn');
  if(saveBtn&&saveBtn.disabled){
    saveBtn.disabled=false;
    saveBtn.innerHTML='<svg class="icon"><use href="#ic-check"></use></svg> Simpan & Mulai';
  }
}
function closeApiKeyModal(){
  let m=document.getElementById('apikey-modal-overlay');
  if(m)m.style.display='none';
}

// ============================================================
// KEYBOARD SHORTCUTS (desktop) — Esc tutup modal, Ctrl/Cmd+Enter
// generate, C salin hasil. Tidak aktif saat user sedang mengetik
// di input/textarea supaya tidak mengganggu.
// ============================================================
// ============================================================
// UNDO PILIHAN CHIP (Ctrl+Z) — kalau salah pencet chip (pose,
// lokasi, angle, dll), Ctrl+Z balikin ke pilihan sebelumnya di
// grup yang sama. Generik: dipantau lewat capture-phase listener,
// tidak perlu ubah tiap fungsi fPickX/vbPickX satu-satu.
// ============================================================
let CHIP_UNDO_STACK=[];
document.addEventListener('click',function(e){
  let chip=e.target.closest?e.target.closest('.chip,#vcam-chips .pb-fk,#vcam-hook-chips .pb-fk'):null;
  if(!chip||!chip.parentElement)return;
  // Cari chip lain yang sedang 'sel' dalam grup yang sama (sibling langsung)
  let siblings=chip.parentElement.querySelectorAll(':scope > .chip.sel,:scope > .pb-fk.sel');
  let prevSel=null;
  siblings.forEach(function(s){if(s!==chip)prevSel=s;});
  // Hanya catat undo kalau memang ada pilihan sebelumnya di grup ini,
  // dan yang diklik sekarang bukan chip yang sudah 'sel' juga (klik ulang)
  if(prevSel&&!chip.classList.contains('sel')){
    CHIP_UNDO_STACK.push(prevSel);
    if(CHIP_UNDO_STACK.length>30)CHIP_UNDO_STACK.shift();
  }
},true); // capture phase — jalan SEBELUM onclick milik chip itu sendiri

// ============================================================
// FITUR (diminta user): double-click / double-tap CEPAT pada chip atau
// kartu pilihan langsung menjalankan tombol "Konfirmasi & Lanjut →" yang
// dibuat fShowConfirm() — user tidak perlu klik chip dulu lalu klik lagi ke
// tombol konfirmasi terpisah di bawahnya; 2x klik cepat di chip yang sama
// sudah cukup untuk loncat ke step berikutnya.
//
// FIX: awalnya dipakai event 'dblclick' bawaan browser, tapi user lapor
// kerasa delay. Penyebabnya: browser/OS (terutama di HP) sengaja MENUNDA
// event 'dblclick' sekitar ~300ms setelah tap pertama, buat mastiin itu
// beneran mau di-tap 2x dan bukan tap tunggal biasa — jadi walau jari user
// sudah selesai ngetuk 2x secepat mungkin, event yang ditunggu tetap baru
// nembak belakangan. Sekarang diganti: deteksi double-click dibikin manual
// lewat event 'click' biasa (yang SELALU instan, tidak pernah ditunda) —
// catat elemen + waktu klik terakhir, kalau klik berikutnya jatuh di elemen
// YANG SAMA dalam jeda cepat (di bawah FAST_PICK_THRESHOLD_MS), langsung
// anggap itu "klik cepat ke-2" dan tekan tombol konfirmasinya saat itu juga
// — tanpa nunggu event dblclick sama sekali.
//
// CARA KERJA: didesain generik di level fShowConfirm (bukan menambal tiap
// fPick*/vbPick* satu per satu). Listener ini didaftarkan di document pada
// FASE BUBBLE (bukan capture), jadi dia otomatis jalan SETELAH onclick
// bawaan si chip (mis. fPickSubjek) selesai — begitu klik cepat ke-2
// terdeteksi, kartu (.wcard) tempat elemen itu berada dicek: kalau bar
// konfirmasi sudah ada di situ (artinya requirement step ini sudah lengkap
// setelah handler onclick bawaan barusan jalan), langsung "tekan" tombolnya.
// Kalau belum ada (mis. step butuh beberapa field dan belum semua keisi),
// tidak terjadi apa-apa — jadi tidak mungkin melompati field wajib yang
// belum diisi.
//
// CAKUPAN: otomatis berlaku di SEMUA step yang pakai fShowConfirm() — saat
// ditulis ini mencakup f0, f2, f3, f4, f5, f7, f8, f9 (Foto) dan v2, v3, v4
// (Video). TIDAK berlaku di f1 (Foto Referensi — multi-pilih) dan v1 (Mode
// Referensi Foto + sub-langkah Lokasi/Lighting Mode 3), karena step-step itu
// pakai tombol "Lanjut →" yang statis (selalu ada), bukan bar dinamis dari
// fShowConfirm() — perlu penanganan terpisah kalau suatu saat mau diperluas
// ke situ juga.
// ============================================================
let _fastPickLastEl=null,_fastPickLastTime=0;
const FAST_PICK_THRESHOLD_MS=400;
document.addEventListener('click',function(e){
  let el=e.target&&e.target.closest?e.target.closest('.chip,.subjek-card,.ftype-btn,.catcard,.vstyle-card,.produk-choice,.suara-card,#vmotion-chips .pb-fk,#v4-box .pb-fk'):null;
  if(!el)return;
  let now=Date.now();
  let isFastRepeat=(el===_fastPickLastEl)&&(now-_fastPickLastTime<FAST_PICK_THRESHOLD_MS);
  _fastPickLastEl=el;_fastPickLastTime=now;
  if(!isFastRepeat)return;
  // Klik cepat ke-2 di elemen yang sama terdeteksi — reset dulu supaya
  // klik ke-3 dst (kalau ada) tidak ikut ke-trigger tanpa klik baru.
  _fastPickLastEl=null;_fastPickLastTime=0;
  let card=el.closest('.wcard');
  if(!card||!card.id)return;
  let bar=document.getElementById(card.id+'-confirmbar');
  if(!bar)return;
  let btn=bar.querySelector('button');
  if(btn)btn.click();
});

document.addEventListener('keydown', function(e){
  let ae=document.activeElement;
  let tag=(ae&&ae.tagName)||'';
  let isTyping = tag==='INPUT'||tag==='TEXTAREA'||(ae&&ae.isContentEditable);

  if(e.key==='Escape'){
    let om=document.getElementById('outfit-random-modal');
    if(om&&om.style.display==='flex'){fCloseOutfitRandom();return;}
    let am=document.getElementById('apikey-modal-overlay');
    if(am&&am.style.display==='flex'){closeApiKeyModal();return;}
    return;
  }

  // ENTER di dalam input teks (bukan textarea) → klik tombol Konfirmasi/Lanjut
  // terdekat, supaya user bisa isi step lalu langsung tekan Enter tanpa raih mouse.
  if(e.key==='Enter'&&!e.ctrlKey&&!e.metaKey&&isTyping){
    if(tag==='INPUT'&&ae.type!=='checkbox'&&ae.type!=='radio'){
      // FIX BUG (ditemukan saat audit mendalam khusus builder video): sebelumnya
      // Enter di field MANAPUN pada step "Script/Dialog" yang formnya PUNYA
      // BEBERAPA field wajib (Mode AI: Nama Produk + Target Audience; Mode
      // Bulk: Nama Produk 1..N + Keunggulan + Target Audience) langsung
      // memicu klik tombol Generate — walau field-field lain di form yang
      // sama belum tentu selesai diisi/dicek user. Reproducible paling parah
      // di Mode Bulk: user mengoreksi salah SATU baris produk di tengah
      // (misal baris ke-3 dari 5), baris lain kebetulan sudah terisi dari
      // cache (lihat FIX BUG#15), lalu refleks pencet Enter setelah selesai
      // ngetik satu field → memicu panggilan API Gemini SUNGGUHAN sebelum
      // user sempat review semua baris. Sekarang Enter di field yang BUKAN
      // field terakhir cuma memindahkan fokus ke field berikutnya (seperti
      // tombol "next" di keyboard HP) — Generate cuma ke-trigger dari Enter
      // di field paling akhir (Target Audience), sama seperti niat awal
      // shortcut ini (submit setelah SEMUA field selesai).
      // FIX: lompat hanya ke kolom yang TERLIHAT. Target Audience ada di tab Penonton
      // (pindah tab dulu), keunggulan bisa tersembunyi di kotak "Atur detail" yang tertutup.
      let vbGo=function(el){
        if(!el)return false;
        if(el.id==='vb-bulk-target'){try{vbInfoTab('penonton');}catch(_e){}}
        if(el.offsetParent===null)return false;
        e.preventDefault();el.focus();el.select&&el.select();return true;
      };
      // FIX: Enter di kolom jumlah produk dulu jatuh ke handler generik dan mengklik Generate
      // (tombolnya cuma beberapa level di atas). Sekarang cuma mengesahkan jumlah lalu pindah ke Nama Produk 1.
      if(ae.id==='vb-bulk-count'){
        try{vbBulkSetCount();}catch(_e){}
        if(!vbGo(document.getElementById('vb-bulk-nama-0')))e.preventDefault();
        return;
      }
      if(ae.id&&ae.id.indexOf('vb-bulk-nama-')===0){
        let rowIdx=parseInt(ae.id.slice('vb-bulk-nama-'.length),10);
        if(vbGo(document.getElementById('vb-bulk-keunggulan-'+rowIdx)))return;
        if(vbGo(document.getElementById('vb-bulk-ta-'+rowIdx)))return;
        if(vbGo(document.getElementById('vb-bulk-nama-'+(rowIdx+1))))return;
        vbGo(document.getElementById('vb-bulk-target'));
        return;
      }
      if(ae.id&&ae.id.indexOf('vb-bulk-keunggulan-')===0){
        let rowIdx=parseInt(ae.id.slice('vb-bulk-keunggulan-'.length),10);
        if(vbGo(document.getElementById('vb-bulk-ta-'+rowIdx)))return;
        if(vbGo(document.getElementById('vb-bulk-nama-'+(rowIdx+1))))return;
        vbGo(document.getElementById('vb-bulk-target'));
        return;
      }
      // Target audience per produk: Enter hanya pindah ke produk berikutnya (atau ke Target Audience umum), tidak pernah memicu Generate.
      if(ae.id&&ae.id.indexOf('vb-bulk-ta-')===0){
        let rowIdx=parseInt(ae.id.slice('vb-bulk-ta-'.length),10);
        if(vbGo(document.getElementById('vb-bulk-nama-'+(rowIdx+1))))return;
        if(!vbGo(document.getElementById('vb-bulk-target')))e.preventDefault();
        return;
      }
      if(ae.id==='vb-bulk-target'||ae.id==='vb-sapaan-input'){
        let bulkBtn=document.getElementById('vb-bulk-btn');
        if(bulkBtn){e.preventDefault();bulkBtn.click();}
        return;
      }
      let el=ae.parentElement,hops=0,btn=null;
      while(el&&hops<6&&!btn){
        btn=el.querySelector('button.btn');
        el=el.parentElement;hops++;
      }
      if(btn){e.preventDefault();btn.click();}
    }
    return;
  }

  if(isTyping)return;

  // Ctrl/Cmd+Z → undo pilihan chip terakhir (bukan di dalam kotak teks,
  // supaya tidak bentrok dengan undo teks bawaan browser)
  if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&(e.key==='z'||e.key==='Z')){
    let prevChip=CHIP_UNDO_STACK.pop();
    if(prevChip){
      e.preventDefault();
      prevChip.click();
      showToast('Kembali ke pilihan sebelumnya','info');
    }
    return;
  }

  // Ctrl/Cmd+Enter → klik tombol Generate Prompt Foto kalau lagi kelihatan
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){
    let btn=document.getElementById('f-gen-btn');
    if(btn&&btn.offsetParent!==null){e.preventDefault();btn.click();}
    return;
  }

  // C → salin hasil JSON kalau output sedang tampil
  if(e.key==='c'||e.key==='C'){
    let wrap=document.getElementById('f-output-wrap');
    if(wrap&&wrap.style.display==='block'){
      let copyBtn=document.getElementById('f-copy-btn');
      if(copyBtn){e.preventDefault();copyBtn.click();}
    }
  }
});

// FIX A14: esc() dipindah ke scope global agar tidak dibuat ulang tiap render
function esc(str){return (str||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
// GANTI PROVIDER KE CLAUDE: API key Claude (Anthropic) selalu diawali
// "sk-ant-" (beda dari key Groq yang dulu diawali "gsk_" atau key Gemini yang
// diawali "AIza.../AQ...."). Nama fungsi TIDAK diubah biar tidak perlu
// ganti semua call-site (_isValidGeminiKey dipanggil di beberapa tempat
// lain di file ini).
function _isValidGeminiKey(k){
  return !!(k && k.startsWith('sk-ant-'));
}

// ============================================================
// SIMPAN TEKS "ISI SENDIRI" — berlaku di semua kotak custom input
// (Foto: cara tampil, pose, lokasi x2, cahaya, angle, mood — Video:
// usia, nada bicara, aksen). Tersimpan di localStorage per field,
// bisa dipakai lagi (1 tap langsung isi + konfirmasi) atau dihapus.
// ============================================================
const CS_KEY='pb_custom_saves';
const CS_FIELDS={
  f3:{input:'f3-custom',confirm:'fPickHoldCustom'},
  f4:{input:'f4-custom',confirm:'fPickPoseCustom'},
  f5:{input:'f5-custom',confirm:'fPickLokasiCustom'},
  f5k:{input:'f5-custom-karakter',confirm:'fPickLokasiCustomKarakter'},
  f7:{input:'f7-custom',confirm:'fPickCahayaCustom'},
  f8:{input:'f8-custom',confirm:'fPickAngleCustom'},
  f9:{input:'f9-custom',confirm:'fPickMoodCustom'},
  v3:{input:'v3-custom',confirm:'vbPickPitchCustom'},
  v4:{input:'v4-custom',confirm:'vbPickAccentCustom'},
  vm3lok:{input:'vb-mode3-lokasi-custom',confirm:'vbPickMode3LokasiCustom'},
  vm3light:{input:'vb-mode3-lighting-custom',confirm:'vbPickMode3LightingCustom'}
};
function csGetAll(){try{return JSON.parse(localStorage.getItem(CS_KEY)||'{}');}catch(e){return{};}}
function csSaveAll(all){try{localStorage.setItem(CS_KEY,JSON.stringify(all));if(typeof pbCloudQueue==='function')pbCloudQueue(CS_KEY);}catch(e){}}
function csGetList(fk){let all=csGetAll();return all[fk]||[];}
function csSave(fk){
  let cfg=CS_FIELDS[fk];if(!cfg)return;
  let inp=document.getElementById(cfg.input);
  if(!inp)return;
  let text=inp.value.trim();
  if(!text){showToast('Isi dulu teksnya sebelum disimpan','error');return;}
  let all=csGetAll();
  let list=all[fk]||[];
  if(list.includes(text)){showToast('Sudah tersimpan sebelumnya','info');return;}
  list.unshift(text);
  if(list.length>15)list=list.slice(0,15);
  all[fk]=list;
  csSaveAll(all);
  showToast('Tersimpan — bisa dipakai lagi nanti','success');
  csRenderList(fk);
}
function csDelete(fk,text){
  let all=csGetAll();
  all[fk]=(all[fk]||[]).filter(t=>t!==text);
  csSaveAll(all);
  csRenderList(fk);
}
function csUse(fk,text){
  let cfg=CS_FIELDS[fk];if(!cfg)return;
  let inp=document.getElementById(cfg.input);
  if(inp){
    inp.value=text;
    inp.dispatchEvent(new Event('input'));
    if(cfg.confirm&&typeof window[cfg.confirm]==='function')window[cfg.confirm]();
  }
}
function csRenderList(fk){
  let container=document.getElementById('cs-list-'+fk);
  if(!container)return;
  let list=csGetList(fk);
  if(list.length===0){container.style.display='none';container.innerHTML='';return;}
  container.style.display='flex';
  container.innerHTML=list.map(function(t){
    let short=t.length>26?t.substring(0,26)+'…':t;
    return '<span data-full="'+esc(t)+'" style="display:inline-flex;align-items:center;gap:4px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-pill);padding:3px 4px 3px 9px;font-size:var(--fs-xs);color:var(--muted);">'
      +'<span onclick="csUse(\''+fk+'\',this.parentElement.dataset.full)" style="cursor:pointer;">'+esc(short)+'</span>'
      +'<span class="tap-target" onclick="event.stopPropagation();csDelete(\''+fk+'\',this.parentElement.dataset.full)" style="cursor:pointer;color:var(--red);padding:0 3px;font-weight:600;"><svg class="icon"><use href="#ic-close"></use></svg></span>'
      +'</span>';
  }).join('');
}
function csRenderAll(){
  Object.keys(CS_FIELDS).forEach(csRenderList);
}

// FIX A9: helper char counter untuk semua input custom
function fCountInp(el,counterId){
  let max=parseInt(el.getAttribute('maxlength')||'300',10);
  let len=el.value.length;
  let counter=document.getElementById(counterId);
  if(!counter)return;
  counter.textContent=len+' / '+max;
  counter.className='inp-counter'+(len>=max?' over':len>=max*0.8?' warn':'');
  // Kalau user mulai ngetik di kolom "isi sendiri" setelah sebelumnya
  // sempat pilih chip (bar "Konfirmasi & Lanjut →" lagi tampil) — batalkan
  // pilihan chip itu dan kembalikan tombol "Konfirmasi →" kolom ini,
  // supaya tetap cuma ada 1 tombol konfirmasi yang aktif/relevan.
  let card=el.closest('.wcard');
  if(card){
    let bar=card.querySelector('[id$="-confirmbar"]');
    if(bar)bar.remove();
    fRestoreCustomBlock(card);
    if(len>0)card.querySelectorAll('.chips .chip.sel, .chips .sel').forEach(c=>c.classList.remove('sel'));
  }
  fSyncMt12ConfirmBtn(el,len);
}
// FIX (dilaporkan user): dulu chip preset yang sudah dipilih (mis. "Low
// Angle") baru kehilangan warna sorotnya begitu user MULAI MENGETIK di
// kolom "Atau isi sendiri" (lihat fCountInp di atas, len>0). Kalau user
// cuma tap/klik ke kolom itu dulu (belum ketik apa-apa) karena berubah
// pikiran mau isi sendiri, chip lama masih kelihatan seperti masih dipilih
// — padahal user sudah pindah niat. Sekarang begitu kolom "isi sendiri"
// difokus, chip yang sedang dipilih langsung dilepas warnanya, sama kayak
// pola yang sudah dipakai di Negara/Penampilan (csNegaraCustomFocus dkk).
// Dipasang lewat onfocus="fCustomFocus(this)" di tiap kolom isi sendiri
// yang punya chip preset (f3, f4, f5, f5k, f7, f8, f9).
function fCustomFocus(el){
  let card=el.closest('.wcard');
  if(card) card.querySelectorAll('.chips .chip.sel, .chips .sel').forEach(c=>c.classList.remove('sel'));
}
// FITUR BARU (permintaan user): tombol "Konfirmasi →" kolom "isi sendiri"
// baru muncul begitu user sudah mengetik sesuatu (len>0) — sebelum itu
// tetap disembunyikan (default disembunyikan lewat CSS, lihat
// [data-role="mt12-confirm"]). Dipakai bareng oleh fCountInp & vbCountInpV2
// supaya perilakunya konsisten di semua step yang punya kolom "isi sendiri".
function fSyncMt12ConfirmBtn(el,len){
  let mt12=el.closest('.mt12');
  let mtBtn=mt12?mt12.querySelector('[data-role="mt12-confirm"]'):null;
  if(mtBtn && !mtBtn.dataset.hiddenByConfirm){
    mtBtn.style.display = len>0 ? 'flex' : 'none';
  }
  let card=el.closest('.wcard');
  if(card && typeof fSyncCardEditDoneBtn==='function') fSyncCardEditDoneBtn(card.id);
}

// FIX BUG #6 (V2): sama seperti fCountInp, dipakai khusus untuk kolom
// "isi usia sendiri" di V2. Bedanya: V2 punya DUA grup chip sekaligus
// dalam satu card (#vb-gender-chips untuk Jenis Kelamin + #vb-age-chips
// untuk Usia). fCountInp generik akan menghapus class 'sel' dari SEMUA
// chip di dalam card — kalau dipakai di sini, chip Gender yang sudah
// dipilih user (Laki-laki/Perempuan) ikut kebatalkan padahal user cuma
// lagi ngetik usia sendiri. Fungsi ini membatasi penghapusan 'sel' HANYA
// ke chip di dalam #vb-age-chips, chip Gender tidak disentuh.
function vbCountInpV2(el,counterId){
  // Kolom usia custom: HANYA angka, maksimal 120 (tahun). Huruf/simbol
  // dibuang otomatis, angka di atas 120 dipaksa jadi 120.
  let _isAge=(el.id==='v2-custom');
  if(_isAge){
    let d=el.value.replace(/\D/g,'').slice(0,3).replace(/^0+(?=\d)/,'');
    if(d!==''&&parseInt(d,10)>120)d='120';
    if(el.value!==d)el.value=d;
  }
  let max=parseInt(el.getAttribute('maxlength')||'120',10);
  let len=el.value.length;
  let counter=document.getElementById(counterId);
  if(counter){
    if(_isAge){
      counter.textContent='Maks. 120 tahun';
      counter.className='inp-counter';
    }else{
      counter.textContent=len+' / '+max;
      counter.className='inp-counter'+(len>=max?' over':len>=max*0.8?' warn':'');
    }
  }
  let card=el.closest('.wcard');
  if(card){
    let bar=card.querySelector('[id$="-confirmbar"]');
    if(bar)bar.remove();
    fRestoreCustomBlock(card);
    if(len>0){
      let ageChips=card.querySelector('#vb-age-chips');
      if(ageChips)ageChips.querySelectorAll('.chip.sel').forEach(c=>c.classList.remove('sel'));
    }
  }
  fSyncMt12ConfirmBtn(el,len);
}

function showToast(msg,type){
  let t=document.getElementById('toast');
  // FIX: sebelumnya kondisinya type==='success' (jadi SELAIN 'success'
  // dianggap error/merah) — akibatnya showToast(...,'info') (dipakai di
  // csDelete & csRenderList untuk pesan netral seperti "Sudah tersimpan
  // sebelumnya"/"Kembali ke pilihan sebelumnya") ikut tampil merah dengan
  // ikon ✕ seolah ada yang gagal, padahal tidak ada masalah apapun.
  // Sekarang HANYA type==='error' yang dapat styling merah/ikon ✕ — semua
  // tipe lain (termasuk 'info') dianggap netral/baik, sama seperti 'success'.
  let isError=type==='error';
  t.style.borderColor=isError?'var(--red)':'var(--green)';
  t.style.color=isError?'var(--red)':'var(--green)';
  t.innerHTML=(isError?'<svg class="icon"><use href="#ic-close"></use></svg> ':'<svg class="icon"><use href="#ic-check"></use></svg> ')+esc(msg);
  t.style.transform='translateX(-50%) translateY(0)';
  t.style.opacity='1';
  clearTimeout(t._t);
  // FIX TOAST: error tampil 4000ms agar user mobile sempat baca pesan error API
  // success/info tetap 2500ms karena tidak perlu dibaca lama
  let dur=isError?4000:2500;
  t._t=setTimeout(()=>{t.style.transform='translateX(-50%) translateY(80px)';t.style.opacity='0';},dur);
}

