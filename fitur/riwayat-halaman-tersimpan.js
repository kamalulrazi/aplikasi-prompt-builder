// fitur/riwayat-halaman-tersimpan.js — Riwayat prompt terakhir (45 terbaru) dan Halaman Tersimpan.
// Bagian dari js/10-main-app.js lama (baris 7479–8076). Isi tidak diubah.
// ============================================================
// HISTORY PROMPT — simpan 45 prompt terakhir ke localStorage
// Dipanggil dari fGenerate() setelah berhasil
// ============================================================
const HISTORY_KEY='pb_history_v1'; // sudah ada prefix pb_
const HISTORY_MAX=45; // 45 produk terakhir (1 entri = 1 produk berisi Hook+Cerita+CTA) — dinaikkan dari 6 (permintaan user, Okt 2026)

function historyAdd(type,label,promptText){
  try{
    let arr=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
    arr.unshift({type:type,label:label,text:promptText,ts:Date.now()});
    if(arr.length>HISTORY_MAX)arr=arr.slice(0,HISTORY_MAX);
    localStorage.setItem(HISTORY_KEY,JSON.stringify(arr));
    if(typeof pbCloudQueue==='function')pbCloudQueue(HISTORY_KEY);
    historyRender();
  }catch(e){/* localStorage tidak tersedia (incognito) — skip saja */}
}

function historyGet(){
  try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');}
  catch(e){return[];}
}

function historyClearItem(idx){
  try{
    let arr=historyGet();arr.splice(idx,1);
    localStorage.setItem(HISTORY_KEY,JSON.stringify(arr));
    if(typeof pbCloudQueue==='function')pbCloudQueue(HISTORY_KEY);
    historyRender();
  }catch(e){}
}

function historyClearAll(){
  try{localStorage.removeItem(HISTORY_KEY);if(typeof pbCloudQueue==='function')pbCloudQueue(HISTORY_KEY);historyRender();}catch(e){}
}

function _historyRenderInto(wrap){
  if(!wrap)return;
  let arr=historyGet();
  if(!arr.filter(function(x){return !x.skrip;}).length){wrap.innerHTML='<p style="font-size:var(--fs-sm);color:var(--muted);padding:16px 0;text-align:center;">Belum ada prompt tersimpan. Generate prompt foto untuk melihat histori.</p>';return;}
  wrap.innerHTML='';
  arr.forEach(function(item,i){
    if(item.skrip)return;
    let d=new Date(item.ts);
    let tstr=d.toLocaleDateString('id-ID',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
    let row=document.createElement('div');
    row.style.cssText='background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px 14px;margin-bottom:8px;';
    row.innerHTML='';
    // Header baris
    let head=document.createElement('div');head.style.cssText='display:flex;align-items:center;gap:8px;margin-bottom:8px;';
    let badge=document.createElement('span');badge.style.cssText='font-size:var(--fs-xs);font-weight:600;font-family:"Hanken Grotesk",system-ui,sans-serif;padding:2px 8px;border-radius:var(--radius-2xs);background:'+(item.type==='foto'?'var(--surface3)':'rgba(76,175,125,0.15)')+';color:'+(item.type==='foto'?'var(--accent)':'var(--green)')+';';badge.textContent=item.type==='foto'?'FOTO':'VIDEO';
    let lbl=document.createElement('span');lbl.style.cssText='font-size:var(--fs-sm);font-weight:500;flex:1;';lbl.textContent=item.label;
    let ts=document.createElement('span');ts.style.cssText='font-size:var(--fs-xs);color:var(--muted);font-family:"Hanken Grotesk",system-ui,sans-serif;';ts.textContent=tstr;
    head.appendChild(badge);head.appendChild(lbl);head.appendChild(ts);
    // Preview teks (3 baris)
    let pre=document.createElement('pre');pre.style.cssText='font-size:var(--fs-xs2);color:var(--muted);line-height:1.7;font-family:"JetBrains Mono",monospace;white-space:pre-wrap;word-break:break-word;max-height:56px;overflow:hidden;margin-bottom:8px;';pre.textContent=item.text.substring(0,200)+(item.text.length>200?'...':'');
    // Tombol
    let btns=document.createElement('div');btns.style.cssText='display:flex;gap:8px;flex-wrap:wrap;';
    let copyBtn=document.createElement('button');copyBtn.style.cssText='background:rgba(255,255,255,0.05);border:1px solid var(--border-hi);color:var(--text);font-size:var(--fs-xs2);font-weight:500;padding:5px 12px;border-radius:var(--radius-2xs);cursor:pointer;font-family:"Hanken Grotesk",sans-serif;';copyBtn.textContent='Salin';
    copyBtn.onclick=(function(txt){return function(){_copyTextRobust(txt,function(){showToast('Tersalin dari histori!','success');},function(){showToast('Gagal salin — coba tap & tahan teksnya lalu Copy','error');});};})(item.text);
    let delBtn=document.createElement('button');delBtn.style.cssText='background:none;border:1px solid var(--border);color:var(--muted);font-size:var(--fs-xs2);padding:5px 10px;border-radius:var(--radius-2xs);cursor:pointer;font-family:"Hanken Grotesk",sans-serif;';delBtn.innerHTML='<svg class="icon"><use href="#ic-close"></use></svg> Hapus';
    delBtn.onclick=(function(idx2){return function(){historyClearItem(idx2);};})(i);
    btns.appendChild(copyBtn);btns.appendChild(delBtn);
    row.appendChild(head);row.appendChild(pre);row.appendChild(btns);
    wrap.appendChild(row);
  });
}
function historyRender(){
  _historyRenderInto(document.getElementById('history-list'));
  _historyRenderInto(document.getElementById('f-history-mini'));
}

// ============================================================
// HALAMAN TERSIMPAN — simpan SELURUH halaman (bukan cuma teks prompt),
// dipicu manual oleh user lewat ikon simpan di bawah garis step
// (.step-save-btn, lihat progress-wrap Foto & Video). Beda dari sistem
// "HISTORY PROMPT" lama di atas (yang auto-tersimpan tiap generate) —
// sistem lama sekarang TIDAK dipanggil lagi (lihat 3 titik historyAdd()
// yang sudah di-nonaktifkan di fGenerate/multi-foto/multi-video), tapi
// fungsinya dibiarkan menganggur (tidak dihapus) supaya tidak berisiko
// merusak bagian lain yang mungkin masih menyentuhnya.
//
// Yang disimpan per halaman: HTML hasil (kartu skrip/prompt yang sudah
// jadi, termasuk mode bulk banyak produk) + snapshot state FS/VB, supaya
// begitu dibuka lagi besoknya, skrip yang sudah dibuat AI masih utuh
// kelihatan & bisa disalin — bukan cuma judul/label kosong.
// ============================================================
const PB_SAVED_KEY='pb_saved_pages_v1';
const PB_SAVED_MAX=10; // dibatasi (bukan 5 seperti histori prompt lama)
                        // karena tiap entri sekarang membawa HTML hasil
                        // lengkap + state, jauh lebih besar dari teks polos.

// ID entri Riwayat yang lagi "dibuka"/dilanjutkan (null = tidak ada).
// Begitu user "Buka" salah satu halaman tersimpan lewat pbOpenSavedPage(),
// variabel ini diisi id-nya — SELAMA masih terisi, setiap klik tombol
// Simpan (pbSaveCurrentPage) akan MENIMPA entri ini (bukan bikin entri
// baru), walau user udah otak-atik apa aja di halamannya. Cuma direset
// (jadi null lagi) kalau user eksplisit klik tombol "Tutup" di banner
// halaman tersimpan — lihat pbCloseActiveSavedPage().
let PB_ACTIVE_SAVED_ID=null;
// FIX BUG (laporan user, Sept 2026): sebelumnya membuka satu entri Riwayat
// (pbOpenSavedPage) langsung menimpa FS/VB LIVE lewat Object.assign, dan
// menutup Riwayat lagi (pbCloseSavedOverlay/pbCloseActiveSavedPage) TIDAK
// pernah mengembalikannya — jadi builder foto/video yang sedang dikerjakan
// ikut "kecampur" data dari entri Riwayat yang cuma dibuka untuk dilihat.
// Reproduksi: pilih mode Video "Frame Asset", generate → buka Riwayat entri
// video lama bermode "Frame Asset" lain → tutup lagi → mulai prompt baru
// pilih mode "Raw Asset" → hasil generate ikut bawa produk/lokasi/lighting
// dari entri Frame Asset yang sempat dibuka tadi. _pbPreOpenSnapshot
// menyimpan kondisi FS/VB PERSIS sebelum entri Riwayat manapun dibuka,
// dipulihkan lewat _pbMaybeRestoreOnClose() saat Riwayat ditutup — lihat
// definisi fungsi-fungsi itu di dekat _vbUnpackState().
let _pbPreOpenSnapshot=null;

function pbSavedGet(){
  try{return JSON.parse(localStorage.getItem(PB_SAVED_KEY)||'[]');}
  catch(e){return[];}
}
function pbSavedSetAll(arr){
  localStorage.setItem(PB_SAVED_KEY,JSON.stringify(arr)); // biar caller yang try/catch (kuota penuh dsb)
  if(typeof pbCloudQueue==='function')pbCloudQueue(PB_SAVED_KEY);
}

// ── Tap 1: tampilkan tooltip singkat. Tap 2 (selagi "armed"): simpan. ──
function pbSaveIconClick(type,btnEl){
  if(!btnEl)return;
  let tip=btnEl.querySelector('.step-save-tip');
  if(!btnEl.classList.contains('armed')){
    btnEl.classList.add('armed');
    if(tip){
      tip.classList.add('show');
      // BUG FIX: dulu dicocokkan id DAN type — kalau user sedang melanjutkan
      // entri Riwayat tipe 'video' lalu pindah ke halaman Foto dan menekan
      // Simpan (type='foto'), pengecekan lama gagal cocok (type beda) jadi
      // status "continuing" dianggap TIDAK aktif walau sebenarnya masih
      // dalam mode melanjutkan entri yang sama. Karena satu entri sekarang
      // selalu membawa data KEDUA builder (lihat pbSaveCurrentPage), cukup
      // cocokkan lewat id saja — type entri cuma penanda halaman mana yang
      // otomatis tampil pas dibuka, bukan pemisah data lagi.
      let continuing=PB_ACTIVE_SAVED_ID && pbSavedGet().some(function(x){return x.id===PB_ACTIVE_SAVED_ID;});
      if(continuing){
        tip.innerHTML='<b>Simpan sebagai baru.</b> Tap sekali lagi untuk menyimpan halaman ini sebagai entri BARU di Riwayat. Entri yang sedang dibuka tidak akan ditimpa.';
      } else {
        tip.innerHTML=(type==='foto')
          ?'<b>Simpan halaman.</b> Skrip/prompt yang sudah jadi bisa disimpan ke Riwayat — tap sekali lagi ikon ini untuk menyimpan.'
          :'<b>Simpan halaman.</b> Skrip video yang sudah jadi (termasuk mode bulk) bisa disimpan ke Riwayat — tap sekali lagi ikon ini untuk menyimpan.';
      }
    }
    clearTimeout(btnEl._pbArmTimer);
    btnEl._pbArmTimer=setTimeout(function(){
      btnEl.classList.remove('armed');
      if(tip)tip.classList.remove('show');
    },4500);
    return;
  }
  // Tap ke-2 — eksekusi simpan
  clearTimeout(btnEl._pbArmTimer);
  btnEl.classList.remove('armed');
  if(tip)tip.classList.remove('show');
  pbSaveCurrentPage(type,btnEl);
}

// Ambil elemen output yang sedang terlihat untuk tipe halaman tsb. Untuk
// Foto ada 2 kemungkinan wadah (single/f-json-output vs multi-produk/
// f-multi-output); Video selalu lewat vb-multi-output. HTML-nya di-KLON
// dulu lalu dibersihkan dari atribut id & onclick sebelum disimpan — kalau
// disimpan mentah, id-nya akan BENTROK dengan elemen asli di halaman saat
// nanti ditampilkan lagi (dua elemen id sama), dan onclick-nya memanggil
// fungsi yang mengandalkan state global (mis. index kartu) yang sudah
// tidak relevan lagi begitu halaman dibuka ulang besoknya — bisa salah
// pencet/salah salin. Makanya tombol interaktif (Salin/Edit/dst) di versi
// tersimpan disembunyikan, diganti SATU tombol "Salin Semua Teks" yang
// aman (dibuat sendiri dari teks polos, lihat pbOpenSavedPage).
function _pbCollectResult(type){
  // FIX (audit susulan): Mode 4 (Ikuti Gerakan) & Mirror Selfie menaruh
  // prompt di elemen sendiri, BUKAN di vb-multi-output — dulu Simpan hanya
  // membaca vb-multi-output, jadi entrinya tersimpan sebagai DRAFT kosong.
  if(type==='video'){
    let sp=_pbCollectSpecialVideo();
    if(sp)return sp;
  }
  let sourceEls=[];
  if(type==='foto'){
    let multi=document.getElementById('f-multi-output');
    if(multi && multi.style.display!=='none' && multi.innerHTML.trim())sourceEls.push(multi);
    let jsonBlock=document.getElementById('f-json-output');
    if(jsonBlock && jsonBlock.style.display!=='none' && jsonBlock.innerHTML.trim())sourceEls.push(jsonBlock);
  } else {
    let multi=document.getElementById('vb-multi-output');
    if(multi && multi.innerHTML.trim())sourceEls.push(multi);
  }
  if(!sourceEls.length)return null;
  let htmlParts=[],textParts=[];
  sourceEls.forEach(function(el){
    let clone=el.cloneNode(true);
    // BUG FIX (ditemukan saat audit fitur Riwayat): beberapa field di dalam
    // kartu output Video diisi lewat properti .value=... (bukan lewat isi
    // HTML/textContent) — ini termasuk kotak script Hook/Story/CTA
    // (<textarea>, lihat vbBulkUpdateJson), input "Teks Overlay di Hook"
    // (vb-hookoverlay-input-N), dan input "Lokasi custom" per-kartu
    // (vb-lokasi-custom-N). cloneNode()+.innerHTML cuma menyalin isi HTML
    // ASLI elemen, TIDAK ikut membawa .value yang lagi aktif — jadi kalau
    // tidak disinkronkan manual, field-field ini akan tampil KOSONG begitu
    // halaman dibuka lagi dari Riwayat, walau saat disimpan isinya jelas
    // ada/kelihatan di layar. Tujuan fitur "Simpan halaman" adalah
    // menangkap PERSIS apa yang sedang terlihat saat tombol Simpan
    // ditekan — jadi SEMUA <textarea> dan <input> di dalam area yang
    // disimpan disinkronkan di sini secara generik (bukan cuma yang sudah
    // ketahuan), supaya field baru yang mungkin ditambah nanti otomatis
    // aman juga dari bug yang sama.
    let origFields=el.querySelectorAll('textarea,input');
    let cloneFields=clone.querySelectorAll('textarea,input');
    origFields.forEach(function(f,i){
      let cf=cloneFields[i];
      if(!cf)return;
      if(f.type==='checkbox'||f.type==='radio'){
        if(f.checked)cf.setAttribute('checked','checked');
        else cf.removeAttribute('checked');
        cf.disabled=true;
        return;
      }
      // FIX (permintaan user): dulu di sini textarea/input diganti jadi
      // <div> teks statis — akibatnya begitu halaman ini dibuka lagi dari
      // Riwayat, skripnya kelihatan tapi TIDAK BISA diedit lagi. Sekarang
      // elemen aslinya (textarea/input) DIPERTAHANKAN, cuma nilainya
      // "dibekukan" ke dalam clone (textarea via textContent, input via
      // attribute value) supaya tetap tampil persis seperti saat Simpan
      // ditekan — tapi tetap jadi kotak edit hidup begitu dirender ulang.
      // id sudah dilepas di bawah & semua atribut onXXX juga dibersihkan,
      // jadi tidak bentrok/nyangkut ke listener lama — listener BARU
      // (autosave) dipasang sendiri saat overlay dibuka, lihat
      // pbShowSavedOverlay().
      if(cf.tagName==='TEXTAREA'){
        cf.textContent=f.value;
      } else {
        cf.setAttribute('value',f.value);
      }
    });
    // FIX (audit susulan — penyimpanan penuh): foto produk base64 dulu
    // tersimpan berkali-kali di HTML (thumbnail header grup + preview di panel
    // Revisi tersembunyi) padahal satu salinan sudah ada di state
    // (VB_BULK_PRODUCTS). Buang dari HTML; thumbnail & panel Revisi dibangun
    // ulang dari state saat Riwayat dibuka (lihat _pbEnhanceBulkGroups).
    clone.querySelectorAll('[id^="vb-revisi-panel-"]').forEach(function(n){n.remove();});
    // Panel pensil (tab karakter + Teks Hook) tidak ikut disimpan: tombol pensilnya sudah
    // dibuang di bawah, jadi kalau panel sempat terbuka saat Simpan, di Riwayat jadi kotak mati.
    clone.querySelectorAll('[id^="vb-char-panel-"]').forEach(function(n){n.remove();});
    clone.querySelectorAll('img').forEach(function(im){
      if((im.getAttribute('src')||'').indexOf('data:')===0)im.remove();
    });
    // Akordeon produk: versi tersimpan harus tampil penuh & struktur grup sama seperti sebelum akordeon ada.
    clone.querySelectorAll('.vb-acc-dots,.vb-pre-toggle').forEach(function(n){n.remove();});
    clone.querySelectorAll('.vb-acc,.vb-acc-head,.vb-acc-tool,.vb-pre-collapsed').forEach(function(n){n.classList.remove('vb-acc','open','vb-acc-head','vb-acc-tool','vb-pre-collapsed');});
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(function(n){n.removeAttribute('id');});
    // Lepas SEMUA atribut event inline (onclick, oninput, onchange, dst) —
    // sebelumnya cuma onclick yang dilepas, padahal kartu Video juga pakai
    // oninput (vbBulkUpdateJson) yang percuma/berisiko nyasar kalau sampai
    // sempat "terpicu" di versi tersimpan.
    clone.querySelectorAll('*').forEach(function(n){
      Array.from(n.attributes||[]).forEach(function(a){
        if(/^on/i.test(a.name))n.removeAttribute(a.name);
      });
    });
    clone.querySelectorAll('button,.copy-btn,.reset-btn').forEach(function(n){n.remove();});
    htmlParts.push(clone.innerHTML);
    textParts.push((clone.innerText||clone.textContent||'').trim());
  });
  return {html:htmlParts.join('\n'),text:textParts.join('\n\n---\n\n')};
}

// FIX (permintaan user): "Simpan halaman" dulu cuma menangkap state builder
// yang lagi AKTIF (Foto ATAU Video, bukan dua-duanya). Kalau user lagi di
// step 5 Foto, pindah ke Video (bulk 10 produk, baru 3 dapat skrip), lalu
// tekan Simpan di halaman Video — progress Foto step 5 ikut hilang kalau
// nanti tab ditutup, karena tidak pernah disimpan. Sekarang state Video
// dipaketkan lewat _vbPackState() (termasuk VB_BULK_ITEMS/VB_BULK_PRODUCTS/
// VB_BULK_LAST_CONTEXT — sebelumnya TIDAK ikut ke-JSON.stringify(VB) sama
// sekali, jadi data 10 produk bulk-nya tidak benar-benar tersimpan).
//
// BUG FIX (audit susulan): 4 objek override PER-KARTU — VB_CARD_TAMPIL
// ("Cara Tampil Produk"), VB_CARD_LOKASI (lokasi custom per Hook/Story/CTA),
// VB_PRODUCT_FOTOCOUNT (jumlah foto override per produk), VB_HOOK_OVERLAY
// (teks overlay Hook per produk) — SEMPAT TIDAK ikut dipaketkan sama sekali.
// Akibatnya kalau user sudah atur salah satu dari ini sebelum Simpan, lalu
// entri dibuka lagi dari Riwayat: (1) pengaturannya hilang, dan (2) kalau
// bulk-nya di-render ULANG secara hidup buat lanjut generate, isinya jadi
// beda dari yang user atur — bisa salah lokasi/foto/overlay di skrip yang
// dilanjutkan. Sekarang keempatnya ikut dipaketkan & dipulihkan.
// FIX (audit susulan lanjutan — penyimpanan penuh): VB_BULK_LAST_CONTEXT
// ({produkList,targetAudience,allResults}, dipakai tombol "Lanjutkan
// Generate" buat bulk yang belum lengkap) menyimpan SALINAN KEDUA foto
// base64 tiap produk di produkList[i].fotoBase64/fotoMime — padahal foto
// yang SAMA PERSIS (index sama, sumbernya sama: VB_BULK_PRODUCTS=produkList
// .map(...) saat generate dimulai) sudah tersimpan di VB_BULK_PRODUCTS. Dulu
// dua-duanya ikut di-JSON.stringify apa adanya di _vbPackState() — begitu
// user menekan Simpan SAAT proses bulk belum lengkap (sebagian gagal/masih
// jalan), tiap foto produk kepakai storage 2x lipat. Sekarang foto dibuang
// dari SALINAN yang di-stringify di sini saja (obj live VB_BULK_LAST_CONTEXT
// sendiri TIDAK disentuh, supaya "Lanjutkan Generate" di halaman builder
// asli tetap normal) — dipasang kembali dari VB_BULK_PRODUCTS begitu
// entrinya dipulihkan (lihat _vbUnpackAttachLastContextFoto, dipanggil dari
// _vbUnpackState & _pbRestorePreOpenSnapshot).
function _vbPackLastContext(){
  if(typeof VB_BULK_LAST_CONTEXT==='undefined'||!VB_BULK_LAST_CONTEXT)return null;
  try{
    return {
      produkList:(VB_BULK_LAST_CONTEXT.produkList||[]).map(function(p){
        let c={};
        for(let k in p)if(k!=='fotoBase64'&&k!=='fotoMime')c[k]=p[k];
        return c;
      }),
      targetAudience:VB_BULK_LAST_CONTEXT.targetAudience,
      allResults:VB_BULK_LAST_CONTEXT.allResults
    };
  }catch(e){return VB_BULK_LAST_CONTEXT;}
}
// Pasangkan lagi fotoBase64/fotoMime ke VB_BULK_LAST_CONTEXT.produkList dari
// VB_BULK_PRODUCTS (index sama persis, lihat catatan _vbPackLastContext) —
// dipanggil setelah KEDUANYA (VB_BULK_LAST_CONTEXT & VB_BULK_PRODUCTS)
// selesai dipulihkan dari state tersimpan.
function _vbUnpackAttachLastContextFoto(){
  if(typeof VB_BULK_LAST_CONTEXT==='undefined'||!VB_BULK_LAST_CONTEXT||!VB_BULK_LAST_CONTEXT.produkList)return;
  if(typeof VB_BULK_PRODUCTS==='undefined')return;
  VB_BULK_LAST_CONTEXT.produkList.forEach(function(p,i){
    let src=VB_BULK_PRODUCTS[i];
    p.fotoBase64=(src&&src.fotoBase64)||'';
    p.fotoMime=(src&&src.fotoMime)||'';
  });
}
function _vbPackState(noPhoto){
  try{
    return JSON.stringify({
      VB:VB,
      VB_BULK_ITEMS:(typeof VB_BULK_ITEMS!=='undefined'?VB_BULK_ITEMS:[]),
      VB_BULK_PRODUCTS:(typeof VB_BULK_PRODUCTS!=='undefined'?VB_BULK_PRODUCTS:[]),
      VB_BULK_LAST_CONTEXT:_vbPackLastContext(),
      VB_CARD_TAMPIL:(typeof VB_CARD_TAMPIL!=='undefined'?VB_CARD_TAMPIL:{}),
      VB_CARD_LOKASI:(typeof VB_CARD_LOKASI!=='undefined'?VB_CARD_LOKASI:{}),
      VB_PRODUCT_FOTOCOUNT:(typeof VB_PRODUCT_FOTOCOUNT!=='undefined'?VB_PRODUCT_FOTOCOUNT:{}),
      VB_HOOK_OVERLAY:(typeof VB_HOOK_OVERLAY!=='undefined'?VB_HOOK_OVERLAY:{}),
      VB_CHAR_OVR:(typeof VB_CHAR_OVR!=='undefined'?VB_CHAR_OVR:{}),
      // Teks overlay Mode 4 (Ikuti Gerakan) & Mirror Selfie — sebelumnya TIDAK
      // ikut dipaketkan (lihat _pbCollectSpecialVideo).
      M4_OVERLAY:(typeof VB_MODE4_OVERLAY_TEXT!=='undefined'?VB_MODE4_OVERLAY_TEXT:''),
      MIRROR_OVERLAY:_pbMirrorOvGet()
    },noPhoto?function(k,v){return /base64|fotoMime/i.test(k)?undefined:v;}:undefined); // noPhoto: lewati foto base64 (dipakai Riwayat video otomatis)
  }catch(e){return '{}';}
}
// MIGRASI NILAI AKSEN LAMA (17 Nov 2026): entri Riwayat lama menyimpan nilai aksen versi sebelum diganti ke Medan.
// Dipetakan ke nilai baru supaya chip kembali terpilih dan label lama tidak terkirim ke AI. Hanya dipakai saat memulihkan Riwayat.
function _vbMigrateLegacyAccent(){
  var OLD='light Batak accent',NEW='light Medan accent';
  try{
    if(typeof VB!=='undefined'&&VB&&VB.accent===OLD)VB.accent=NEW;
    if(typeof VB_CHAR_OVR!=='undefined'&&VB_CHAR_OVR){
      Object.keys(VB_CHAR_OVR).forEach(function(k){var o=VB_CHAR_OVR[k];if(o&&o.accent===OLD)o.accent=NEW;});
    }
  }catch(_e){}
}
function _vbUnpackState(json){
  try{
    let obj=JSON.parse(json||'{}');
    if(obj.VB && typeof VB!=='undefined'){
      Object.assign(VB,obj.VB);
      // Entri Riwayat lama (dibuat sebelum step Pergerakan Kamera ada) tidak punya camMove —
      // jangan sampai nilai camMove dari sesi yang sedang aktif ikut menempel ke entri itu.
      if(!('camMove' in obj.VB))VB.camMove='';
      if(!('camHook' in obj.VB))VB.camHook='';
      // Pilihan kamera / visual hook yang sudah dihapus dari daftar (mis. "Ketuk Lensa" di entri lama) dikosongkan supaya tidak muncul sebagai kode mentah.
      try{if(VB.camHook&&!VB_CAM_HOOKS[VB.camHook]&&!_vbCamIsCustom(VB.camHook))VB.camHook='';if(VB.camMove&&!VB_CAM_MOVES[VB.camMove]&&!_vbCamIsCustom(VB.camMove))VB.camMove='';}catch(e){}
      try{_vbCamSyncPend();_vbRenderCamChips();}catch(e){}
      // Entri Riwayat lama (sebelum fitur "Gaya khas aksen") tidak punya accentStyle — jangan sampai gaya sesi aktif menempel ke entri itu.
      if(!('accentStyle' in obj.VB)){VB.accentStyle='';VB.accentStyleLabel='';VB.accentStyleFor='';}
      // Entri Riwayat lama (sebelum alur percabangan Kami Bantu Isi / Tulis Manual) tidak punya pbDone/pbPath/pbDefP/pbDefA — jangan sampai nilai sesi aktif menempel.
      ['pbDone','pbPath','pbDefP','pbDefA'].forEach(function(k){if(!(k in obj.VB))VB[k]=(k==='pbDone'||k==='pbPath')?'':0;});
    }
    if(typeof VB_BULK_ITEMS!=='undefined')VB_BULK_ITEMS=obj.VB_BULK_ITEMS||[];
    if(typeof VB_BULK_PRODUCTS!=='undefined')VB_BULK_PRODUCTS=obj.VB_BULK_PRODUCTS||[];
    if(typeof VB_BULK_LAST_CONTEXT!=='undefined')VB_BULK_LAST_CONTEXT=obj.VB_BULK_LAST_CONTEXT||null;
    if(typeof VB_CARD_TAMPIL!=='undefined')VB_CARD_TAMPIL=obj.VB_CARD_TAMPIL||{};
    if(typeof VB_CARD_LOKASI!=='undefined')VB_CARD_LOKASI=obj.VB_CARD_LOKASI||{};
    if(typeof VB_PRODUCT_FOTOCOUNT!=='undefined')VB_PRODUCT_FOTOCOUNT=obj.VB_PRODUCT_FOTOCOUNT||{};
    if(typeof VB_HOOK_OVERLAY!=='undefined')VB_HOOK_OVERLAY=obj.VB_HOOK_OVERLAY||{};
    if(typeof VB_CHAR_OVR!=='undefined')VB_CHAR_OVR=obj.VB_CHAR_OVR||{};
    _vbMigrateLegacyAccent();
    if('M4_OVERLAY' in obj && typeof VB_MODE4_OVERLAY_TEXT!=='undefined')VB_MODE4_OVERLAY_TEXT=obj.M4_OVERLAY||'';
    if('MIRROR_OVERLAY' in obj)_pbMirrorOvOpen=obj.MIRROR_OVERLAY||'';
    _vbUnpackAttachLastContextFoto();
  }catch(e){}
  try{if(typeof _vbMotionDrawChips==='function')_vbMotionDrawChips();}catch(e){}
  try{if(typeof vbRenderSapaanChips==='function')vbRenderSapaanChips();}catch(e){}
}

// Kembalikan FS/VB (+ variabel bulk terkait) PERSIS ke kondisi sebelum
// entri Riwayat manapun dibuka lewat pbOpenSavedPage — pasangan dari
// _pbPreOpenSnapshot (lihat catatan lengkap di deklarasinya, dekat
// PB_ACTIVE_SAVED_ID). Beda dari _vbUnpackState() (yang Object.assign tanpa
// membuang key lama), di sini key FS/VB dikosongkan dulu sebelum diisi
// ulang dari snapshot, supaya field yang SEMPAT ditambahkan Object.assign
// saat entri Riwayat dibuka (mis. VB.mode3Produk dari entri itu) tidak ikut
// nyangkut kalau ternyata tidak ada di snapshot aslinya.
function _pbRestorePreOpenSnapshot(){
  if(_pbPreOpenSnapshot===null)return;
  let snap=_pbPreOpenSnapshot;
  _pbPreOpenSnapshot=null;
  PB_AUTO_VIDEO_SID=snap.sid||'';PB_AUTO_VIDEO_SIG=snap.sig||'';
  _pbMirrorOvOpen=null; // nilai overlay Mirror Selfie kembali dibaca dari kolom asli
  try{
    let fsData=JSON.parse(snap.fs||'{}');
    Object.keys(FS).forEach(function(k){delete FS[k];});
    Object.assign(FS,fsData);
    if(FS.subjek==='produk')FS.subjek='';FS.importIsProdukSaja=false;
    if(typeof povSync==='function')povSync();
  }catch(e){/* snapshot foto korup — biarkan FS apa adanya daripada error */}
  try{
    let vbObj=JSON.parse(snap.vb||'{}');
    if(vbObj.VB){
      Object.keys(VB).forEach(function(k){delete VB[k];});
      Object.assign(VB,vbObj.VB);
    }
    if(typeof VB_BULK_ITEMS!=='undefined')VB_BULK_ITEMS=vbObj.VB_BULK_ITEMS||[];
    if(typeof VB_BULK_PRODUCTS!=='undefined')VB_BULK_PRODUCTS=vbObj.VB_BULK_PRODUCTS||[];
    if(typeof VB_BULK_LAST_CONTEXT!=='undefined')VB_BULK_LAST_CONTEXT=vbObj.VB_BULK_LAST_CONTEXT||null;
    if(typeof VB_CARD_TAMPIL!=='undefined')VB_CARD_TAMPIL=vbObj.VB_CARD_TAMPIL||{};
    if(typeof VB_CARD_LOKASI!=='undefined')VB_CARD_LOKASI=vbObj.VB_CARD_LOKASI||{};
    if(typeof VB_PRODUCT_FOTOCOUNT!=='undefined')VB_PRODUCT_FOTOCOUNT=vbObj.VB_PRODUCT_FOTOCOUNT||{};
    if(typeof VB_HOOK_OVERLAY!=='undefined')VB_HOOK_OVERLAY=vbObj.VB_HOOK_OVERLAY||{};
    if(typeof VB_CHAR_OVR!=='undefined')VB_CHAR_OVR=vbObj.VB_CHAR_OVR||{};
    _vbMigrateLegacyAccent();
    if('M4_OVERLAY' in vbObj && typeof VB_MODE4_OVERLAY_TEXT!=='undefined')VB_MODE4_OVERLAY_TEXT=vbObj.M4_OVERLAY||'';
    // AUDIT Okt 2026: snapshot membuang fotoBase64/fotoMime dari context (lihat _vbPackLastContext) -> pasang lagi
    if(typeof _vbUnpackAttachLastContextFoto==='function')_vbUnpackAttachLastContextFoto();
  }catch(e){/* snapshot video korup — biarkan VB apa adanya daripada error */}
  // Sinkronkan ulang tampilan chip Mode Referensi Foto (V1) di wizard Video
  // supaya yang KELIHATAN tersorot juga balik cocok dengan VB.refMode yang
  // baru dipulihkan — tanpa ini datanya sudah benar tapi chip di layar bisa
  // masih nyangkut dari mode entri Riwayat yang tadi dibuka.
  try{
    if(typeof vbPickRefMode==='function' && document.getElementById('vb-mode-satu')){
      vbPickRefMode(VB.refMode||'satu');
    }
  }catch(e){}
  try{if(typeof _vbMotionDrawChips==='function')_vbMotionDrawChips();}catch(e){}
}

// Dipanggil tiap kali Riwayat ditutup (lewat × / backdrop / Esc DI
// pbCloseSavedOverlay, atau tombol "Tutup Riwayat" DI pbCloseActiveSavedPage).
// Restore data cuma benar-benar dijalankan kalau TIDAK ada proses "Lanjutkan
// Generate" bulk yang masih menggantung (VB_BULK_LAST_CONTEXT belum selesai
// semua produknya) — kalau masih ada sisa, state live sengaja DIBIARKAN
// seperti sekarang (tidak direstore) supaya tombol "Lanjutkan Generate" itu
// tetap bisa jalan kalau entrinya dibuka lagi nanti. Snapshot-nya sendiri
// TIDAK dibuang di kondisi ini, jadi begitu proses itu beres dan Riwayat
// ditutup lagi, state akhirnya tetap bisa dikembalikan ke sebelum Riwayat
// pertama kali dibuka.
function _pbMaybeRestoreOnClose(){
  let bulkPending=(typeof VB_BULK_LAST_CONTEXT!=='undefined' && VB_BULK_LAST_CONTEXT
    && VB_BULK_LAST_CONTEXT.produkList && VB_BULK_LAST_CONTEXT.allResults
    && VB_BULK_LAST_CONTEXT.allResults.length<VB_BULK_LAST_CONTEXT.produkList.length);
  if(bulkPending)return;
  _pbRestorePreOpenSnapshot();
}


function pbSaveCurrentPage(type,btnEl){
  // Dulu: kalau belum ada skrip/prompt yang di-generate, save ditolak total
  // (_pbCollectResult return null → langsung berhenti). Sekarang TIDAK —
  // fitur "Simpan halaman" dimaksudkan buat menangkap SELURUH tampilan/
  // stelan aplikasi (state FS/VB: foto yang sudah diupload, pilihan yang
  // sudah dipilih, dst), bukan cuma skrip jadi. Jadi kalau belum ada hasil
  // generate, html/text-nya kosong tapi state tetap disimpan penuh.
  //
  // FIX: ambil snapshot KEDUA builder (Foto & Video) setiap kali tombol
  // Simpan ditekan, TERLEPAS dari halaman mana tombolnya ditekan. `type`
  // cuma menentukan halaman mana yang otomatis ditampilkan lagi saat entri
  // ini dibuka dari Riwayat — datanya sendiri (fotoState/videoState/
  // fotoHtml/videoHtml) selalu lengkap dua-duanya, supaya progress builder
  // yang lagi "ditinggal" (tidak sedang dilihat) tidak ikut hilang.
  let resultFoto=_pbCollectResult('foto')||{html:'',text:''};
  let resultVideo=_pbCollectResult('video')||{html:'',text:''};
  let labelFoto,labelVideo,stateFoto,stateVideo;
  try{
    labelFoto='Foto'+(FS.produkNama?' — '+FS.produkNama:(FS.subjekLabel?' — '+FS.subjekLabel:''));
    stateFoto=JSON.stringify(FS);
  }catch(e){labelFoto='Foto tersimpan';stateFoto='{}';}
  try{
    let jumlahProduk=(typeof VB_BULK_ITEMS!=='undefined' && Array.isArray(VB_BULK_ITEMS) && VB_BULK_ITEMS.length)?VB_BULK_ITEMS.length:null;
    labelVideo='Video'+(jumlahProduk?' — '+jumlahProduk+' produk (bulk)':(VB.mode3Produk?' — '+VB.mode3Produk:''));
    stateVideo=_vbPackState();
  }catch(e){labelVideo='Video tersimpan';stateVideo='{}';}
  if(type==='video'){
    if(VB.refMode==='ikuti')labelVideo='Video — Ikuti Gerakan';
    else if(VB.refMode==='mirrorselfie')labelVideo='Video — Mirror Selfie';
  }
  let label=(type==='foto')?labelFoto:labelVideo;
  let html=(type==='foto')?resultFoto.html:resultVideo.html;
  let arr=pbSavedGet();
  // BUG FIX: sebelumnya dicocokkan id+type, jadi kalau user membuka entri
  // Riwayat tipe 'video' lalu pindah ke halaman Foto dan menekan Simpan di
  // sana (type='foto'), tidak ketemu match (type beda) → dikira save biasa,
  // bikin ENTRI BARU terpisah alih-alih menimpa entri yang sedang
  // dilanjutkan. Padahal karena satu entri sekarang menyimpan data KEDUA
  // builder sekaligus, seharusnya tetap menimpa entri yang sama siapa pun
  // yang menyimpan (Foto atau Video) — cukup cocokkan lewat id.
  // (31 Okt 2026, permintaan user) RIWAYAT TIDAK BOLEH TERTIMPA: dulu, selama sebuah entri Riwayat masih "dibuka"
  // (PB_ACTIVE_SAVED_ID terisi), Simpan MENIMPA entri itu — jadi user yang membuka sesi lama lalu membuat skrip baru
  // dan menekan Simpan malah menghapus isi sesi pertama. Sekarang Simpan SELALU membuat entri baru dengan id baru;
  // entri yang sudah ada tidak pernah diubah oleh tombol Simpan.
  let activeIdx=-1;
  let isUpdate=false;
  let entry={
    id:isUpdate?PB_ACTIVE_SAVED_ID:('sp_'+Date.now()+'_'+Math.random().toString(36).slice(2,8)),
    type:type,
    label:label,
    ts:Date.now(),
    // Kompat lama: field ini tetap ada (dipakai kode lain yang mungkin
    // masih baca item.html/item.text/item.state langsung).
    html:html,
    text:(type==='foto'?resultFoto.text:resultVideo.text),
    // FIX (penyimpanan penuh): dulu di sini menyalin fotoState/videoState
    // sekali lagi (dobel — dan state Video membawa foto produk base64).
    // Semua pembaca sudah memakai fotoState/videoState lebih dulu, field ini
    // hanya fallback entri sangat lama, jadi dikosongkan.
    state:'',
    // BARU: snapshot gabungan dua builder, dipakai pbOpenSavedPage supaya
    // builder yang tidak sedang dilihat saat Simpan ditekan tetap ikut balik.
    fotoHtml:resultFoto.html,
    fotoText:resultFoto.text,
    fotoState:stateFoto,
    videoHtml:resultVideo.html,
    videoText:resultVideo.text,
    videoState:stateVideo
  };
  // Nama halaman diisi sendiri oleh user (bukan lagi dibuat otomatis).
  function _askNameThenCommit(){
    pbAskName({title:'Beri nama halaman ini',desc:'Nama ini yang tampil di daftar Riwayat.',placeholder:'Contoh: Gamis batch 1',okLabel:'Simpan'},function(nm){
      entry.label=nm;
      _commitSave();
    });
  }
  // Simpan sungguhan. Dipisah jadi fungsi sendiri supaya bisa ditunda sampai
  // user setuju kalau simpan ini akan membuang entri terlama (lihat bawah).
  function _commitSave(){
    arr=pbSavedGet();
    if(isUpdate){
      arr[activeIdx]=entry;
    } else {
      arr.unshift(entry);
      if(arr.length>PB_SAVED_MAX)arr=arr.slice(0,PB_SAVED_MAX);
    }
    try{
      pbSavedSetAll(arr);
    }catch(e){
      // FIX (audit Riwayat): dulu di sini dicoba lagi sambil MEMBUANG 2 entri
      // terlama secara diam-diam lalu toast tetap bilang "berhasil disimpan".
      // Sekarang tidak ada yang dibuang otomatis — user diminta memilih
      // sendiri entri mana yang dihapus.
      showToast('Gagal simpan — penyimpanan browser penuh. Hapus beberapa halaman tersimpan dulu, lalu coba lagi.','error');
      return;
    }
    if(btnEl){
      btnEl.classList.add('saved-flash');
      setTimeout(function(){btnEl.classList.remove('saved-flash');},1200);
    }
    showToast(PB_ACTIVE_SAVED_ID?'Disimpan sebagai entri BARU — entri lama di Riwayat tidak ditimpa.':'Halaman disimpan ke Riwayat!','success');
    pbSavedRender();
  }
  // FIX (audit Riwayat): entri ke-(PB_SAVED_MAX+1) dulu langsung membuang
  // entri terlama tanpa kabar. Sekarang minta persetujuan dulu.
  if(!isUpdate && arr.length>=PB_SAVED_MAX){
    let oldest=arr[arr.length-1]||{};
    showConfirm('Riwayat sudah penuh ('+PB_SAVED_MAX+' halaman). Menyimpan halaman baru akan MENGHAPUS yang paling lama: "'+(oldest.label||'tanpa judul')+'". Lanjut?',_askNameThenCommit,null,'Ya, Simpan');
    return;
  }
  _askNameThenCommit();
}

function pbSavedDelete(id){
  let arr=pbSavedGet().filter(function(x){return x.id!==id;});
  pbSavedSetAll(arr);
  // Kalau entri yang dihapus itu yang lagi "dikunci" (sedang dibuka/
  // dilanjutkan), lepas kuncinya & bersihkan banner-nya — kalau tidak,
  // banner "Tutup Riwayat" tetap nongol menunjuk ke entri yang udah gak ada.
  if(id===PB_ACTIVE_SAVED_ID){
    PB_ACTIVE_SAVED_ID=null;
    pbRemoveSavedBanners();
  }
  pbSavedRender();
}
function pbSavedClearAll(){
  // FIX (audit Riwayat): dulu removeItem — pbCloudQueue melewati key kosong sehingga cloud tidak pernah tahu, dan data lama bisa muncul lagi saat sinkron berikutnya. Simpan '[]' supaya ikut ter-push.
  try{localStorage.setItem(PB_SAVED_KEY,'[]');if(typeof pbCloudQueue==='function')pbCloudQueue(PB_SAVED_KEY);}catch(e){}
  PB_ACTIVE_SAVED_ID=null;
  pbRemoveSavedBanners();
  pbSavedRender();
}

