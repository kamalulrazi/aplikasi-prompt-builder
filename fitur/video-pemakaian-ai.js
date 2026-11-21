// fitur/video-pemakaian-ai.js — Catatan pemakaian dan biaya AI Video (token, harian/bulanan).
// Bagian dari js/10-main-app.js lama (baris 15192–16170). Isi tidak diubah.
// ══════════════════════════════════════════════════════════════════
// STREAMING REAL-TIME — script Hook/Story/CTA muncul kata-per-kata saat
// AI masih "mengetik", bukan nunggu jawaban penuh baru muncul semua.
// Dipakai baik oleh mode single (vbGenerate3AI) maupun bulk
// (_vbCallBulkBatch / vbGenerateBulkAI).
//
// CARA KERJA: Gemini punya endpoint streamGenerateContent yang balikin
// potongan (chunk) teks bertahap lewat format SSE ("data: {...}\n\n").
// Karena app ini minta AI balas JSON array (bukan teks bebas), tiap
// potongan yang baru masuk sering berupa JSON YANG BELUM LENGKAP (mis.
// kutip penutup belum nongol). _vbTryParsePartialJsonArray() "menambal"
// JSON yang masih setengah jalan itu (nutup kutip/kurung yang masih
// terbuka) supaya tetap bisa di-parse jadi array — hasilnya HANYA
// dipakai buat preview LIVE di textarea. Hasil FINAL tetap divalidasi &
// dibersihkan lewat jalur sanitizer + fix-jumlah-kata yang SUDAH ADA
// sebelumnya (tidak diubah), setelah stream-nya selesai — jadi kalau
// tambalan JSON-nya sempat "kelihatan aneh" sepersekian detik pas
// mengetik, tidak berpengaruh ke hasil akhir yang tersimpan.
//
// FALLBACK: kalau koneksi/stream gagal dari awal (network/HTTP error),
// fungsi ini otomatis retry persis seperti _vbFetchWithRetry lama
// (termasuk jaring pengaman ~3 menit & percobaan ulang tanpa
// thinkingConfig) — jadi generate tetap bisa berhasil walau efek
// real-time-nya kebetulan tidak muncul di kondisi jaringan tertentu.
// ══════════════════════════════════════════════════════════════════
function _vbTryParsePartialJsonArray(buf,strict){
  if(!buf)return null;
  try{let r=JSON.parse(buf);return Array.isArray(r)?r:null;}catch(e){}
  // AUDIT Okt 2026: dulu cuma "tutup string + tutup kurung" -> null kalau terpotong di tengah nama kunci,
  // setelah ':', di tengah \uXXXX, atau di tengah true/null/angka. Sekarang pindai sekali sambil mencatat
  // titik potong AMAN (setelah kurung tutup / sebelum koma). Coba perbaikan optimis dulu (teks terakhir
  // tetap tampil live); kalau gagal, mundur ke titik aman terakhir. strict=true -> hanya elemen array
  // tingkat-atas yang SUDAH LENGKAP (dipakai penyelamat output terpotong).
  const s=buf;let inStr=false,esc=false,uLeft=0,escAt=-1;const stack=[],cuts=[];
  for(let i=0;i<s.length;i++){
    const ch=s[i];
    if(inStr){
      if(uLeft>0){uLeft--;continue;}
      if(esc){esc=false;if(ch==='u')uLeft=4;continue;}
      if(ch==='\\'){esc=true;escAt=i;continue;}
      if(ch==='"')inStr=false;
    }else if(ch==='"')inStr=true;
    else if(ch==='{'||ch==='[')stack.push(ch);
    else if(ch==='}'||ch===']'){
      if(stack[stack.length-1]===(ch==='}'?'{':'['))stack.pop();
      cuts.push([i+1,stack.join('')]);
    }else if(ch===',')cuts.push([i,stack.join('')]);
  }
  const close=function(st){let o='';for(let k=st.length-1;k>=0;k--)o+=(st[k]==='{'?'}':']');return o;};
  const parse=function(t){try{const r=JSON.parse(t);return Array.isArray(r)?r:null;}catch(e){return null;}};
  if(!strict){
    let t=s;
    if(inStr&&(esc||uLeft>0))t=t.slice(0,escAt); // buang escape yang belum lengkap
    if(inStr)t+='"'; // tutup string yang masih terbuka
    t=t.replace(/,\s*$/,''); // buang koma nyangkut sebelum ditutup
    const r=parse(t+close(stack.join('')));
    if(r)return r;
  }
  for(let k=cuts.length-1,tries=0;k>=0&&tries<6;k--){
    const c=cuts[k];
    if(strict&&c[1]!=='[')continue;
    const r=parse(s.slice(0,c[0])+close(c[1]));
    if(r)return r;
    tries++;
  }
  return strict?[]:null;
}

// Panggil Claude lewat Messages API (SSE, stream:true), lapor progres tiap
// chunk ke onPartial(arraySoFar), dan balikin {resp,rawText} dalam
// BENTUK YANG SAMA seperti generateContent biasa (candidates[0].content
// .parts[0].text, finishReason, dst) — supaya kode pemanggil (parse
// JSON, sanitizer, fix kata) tidak perlu berubah sama sekali.
// Retry & fallback meniru persis _vbFetchWithRetry lama.
// Menerima parameter 'model' eksplisit — dipanggil oleh
// _vbStreamClaudeJSONWithRetry (lihat di bawah) yang mengurus pergantian
// primary→fallback antar model.
// Ubah 'parts' gaya Gemini (dipakai di banyak tempat di file ini — teks
// biasa {text:'...'} dan foto {inline_data:{mime_type,data}}) jadi
// content block gaya Claude ({type:'text',text}/{type:'image',source:
// {type:'base64',media_type,data}}), supaya seluruh prompt yang sudah
// disusun di tempat lain TIDAK perlu diubah — cuma diterjemahkan di
// titik paling akhir sebelum benar-benar dikirim ke Claude.
function _vbGeminiPartsToClaudeContent(parts){
  if(!parts||!parts.length)return[{type:'text',text:'(kosong)'}];
  var _out=parts.map(function(p){
    if(p&&p.inline_data)return{type:'image',source:{type:'base64',media_type:(p.inline_data.mime_type||'image/jpeg'),data:p.inline_data.data}};
    if(p&&p.inlineData)return{type:'image',source:{type:'base64',media_type:(p.inlineData.mimeType||'image/jpeg'),data:p.inlineData.data}};
    return{type:'text',text:(p&&p.text)||''};
  });
  // Claude API menolak blok teks kosong (400): buang yang kosong, sisakan minimal 1 blok.
  _out=_out.filter(function(c){return c.type!=='text'||(c.text&&c.text.trim());});
  return _out.length?_out:[{type:'text',text:'(kosong)'}];
}
// FIX HEMAT BIAYA (permintaan user, Sept 2026): parameter systemText baru —
// opsional, dipakai buat naruh instruksi yang SAMA PERSIS di setiap generate
// (aturan HOOK/STORY/CTA dkk) sebagai blok "system" terpisah dari pesan user
// yang isinya beda-beda tiap generate (nama produk/target audience/dst).
// Kalau isi system-nya identik antar request DAN ditandai cache_control,
// Anthropic bisa "cache hit" bagian itu — dibaca ulang dengan diskon ~90%
// dibanding diproses dari nol tiap kali (lihat pemanggil di vbGenerate3AI).
// Aman dipakai walau kebetulan jatuh ke model fallback yang syarat minimum
// token cache-nya lebih tinggi (Haiku 4.5) — kalau di bawah syarat minimum,
// Anthropic otomatis memprosesnya TANPA cache (tidak error, cuma tidak hemat).

// ── BADGE PEMAKAIAN TOKEN (permintaan user, Sept 2026) ───────────────────
// Sebelumnya angka usage/cache HIT-MISS cuma kelihatan lewat console.log
// (harus buka DevTools browser — ribet, apalagi di HP). Fungsi di bawah
// ini mengakumulasi angka yang SAMA PERSIS dari API (bukan estimasi baru)
// ke localStorage + badge kecil mengambang di pojok layar, supaya bisa
// dipantau langsung tanpa DevTools. Ini MURNI monitoring — tidak mengubah
// jumlah token yang benar-benar terpakai/tertagih sama sekali.
var PB_USAGE_KEY='pb_usage_stats_v1';
// ── RIWAYAT PEMAKAIAN PER-PANGGILAN + ARSIP HARIAN (permintaan user, Sept 2026,
// diperluas lagi atas permintaan user: "statistik sangat lengkap") ─────────
// Sebelumnya cuma ada TOTAL akumulasi (hit/miss/dst) + 50 entri riwayat
// terakhir yang HILANG PERMANEN begitu kepenuhan, dan riwayat cuma mencatat
// panggilan generate utama (bukan perbaikan jumlah kata). Sekarang:
//   - SETIAP panggilan AI (generate utama MAUPUN perbaikan jumlah kata)
//     dicatat 1 baris riwayat (jam + tanggal + jenis + mode).
//   - Riwayat mentah per-panggilan disimpan detail untuk PB_USAGE_LOG_RAW_DAYS
//     hari terakhir. Yang lebih tua dari itu TIDAK PERNAH DIHAPUS — otomatis
//     diringkas jadi 1 baris agregat per-hari di "arsip" (PB_USAGE_ARCHIVE_KEY),
//     jadi riwayat biaya tetap ada selamanya, cuma resolusinya turun dari
//     "per-panggilan" jadi "per-hari" untuk data lama. Ini yang bikin
//     breakdown Hari ini/7 hari/Bulan ini/Semua waktu di bawah tetap akurat
//     walau sudah dipakai bertahun-tahun.
// CATATAN JUJUR: riwayat per-panggilan untuk PERBAIKAN KATA baru mulai
// tercatat sejak update ini — panggilan perbaikan kata SEBELUM update ini
// cuma kehitung di TOTAL lifetime (bagian "Perbaikan jumlah kata" di bawah),
// tidak muncul di breakdown per-tanggal/grafik untuk tanggal sebelum update.
var PB_USAGE_LOG_KEY='pb_usage_log_v1';
var PB_USAGE_LOG_RAW_DAYS=60;      // simpan detail per-panggilan untuk 60 hari terakhir
var PB_USAGE_LOG_SAFETY_MAX=4000;  // jaga-jaga kalau volume sangat tinggi (mis. impor data lama)
var PB_USAGE_ARCHIVE_KEY='pb_usage_archive_v1';
var _vbCurrentCallMode='unknown';
// Penanda: kalau 'fix', pemakaian token panggilan yang sedang jalan dicatat sebagai PERBAIKAN KATA
// (statistik & riwayat kind 'fix'), bukan generate biasa. Diisi hanya oleh _vbExtendShortScriptsOnce.
var _vbUsageKindOverride='';
// Penanda mode chat perbaikan kata Gemini ('mini' / 'full' / ''), diisi hanya selama satu panggilan perbaikan berjalan,
// supaya baris riwayat biaya bisa diberi label Mini chat / Chat penuh (untuk membandingkan biayanya).
var _vbUsageChatModeOverride='';
// ── SESI GENERATE (permintaan user, Sept 2026, "statistik dipisah per
// generate"): kelompokkan semua panggilan AI yang berasal dari SATU aksi
// generate user (misal 1x klik "Generate Semua" utk 8 produk sebenarnya
// terdiri dari beberapa panggilan batch kecil di baliknya, lihat
// _vbRunBulkGenerate) supaya panel statistik bisa menampilkan RINGKASAN
// per-aksi (mis. "Bulk — 8 produk") dulu, baru detail lengkap semua
// panggilan+foto di dalamnya kalau ditap. sesiId dibuat sekali di awal tiap
// aksi user lewat _vbStartUsageSession (dipanggil dari vbGenerate3AI,
// _vbRunBulkGenerate, vbRegenerateAllBulk, dan tiap jalur revisi 1 produk),
// lalu ikut ditempel ke SEMUA baris riwayat (termasuk perbaikan jumlah
// kata) yang terjadi selama aksi itu masih berjalan.
var _vbCurrentSessionId=null;
var _vbCurrentSessionLabel='';
var _vbCurrentSessionTotal=0;
// Jumlah produk & jumlah foto yang IKUT DIKIRIM di satu panggilan API saat
// ini saja (bukan total sesi) — diisi _vbCallBulkBatch/vbGenerate3AI
// sesaat sebelum fetch, dibaca _vbTrackUsage buat dicatat ke riwayat.
var _vbCurrentCallProdukCount=1;
var _vbCurrentCallFotoCount=0;
function _vbStartUsageSession(label,total){
  _vbCurrentSessionId='s'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  _vbCurrentSessionLabel=label||'';
  _vbCurrentSessionTotal=total||1;
}
// Estimasi token per foto referensi (dikirim ke AI dalam resolusi maks
// 320px, lihat _vbCompressImageFile) — dipakai HANYA untuk pecah kasar
// "biaya foto" dari total biaya 1 panggilan di panel statistik, BUKAN
// angka yang benar-benar ditagih terpisah oleh Anthropic (mereka gabung
// jadi satu angka input_tokens/cache token, tidak dipisah per-bagian).
// 512x512 penuh ≈ (512*512)/750 ≈ 349 token; rata-rata produk foto HP asli
// (rasio bukan persegi) biasanya sedikit di bawah itu, jadi dipakai 300
// sebagai estimasi tengah yang wajar.
var VB_EST_TOKEN_PER_FOTO=120; // 320px (sebelumnya 512px ~300); 320x320/750 = 137 maks, rata-rata foto non-persegi lebih kecil
function _vbLoadUsageLog(){
  try{
    var l=JSON.parse(localStorage.getItem(PB_USAGE_LOG_KEY)||'null');
    if(Array.isArray(l))return l;
  }catch(e){}
  return[];
}
function _vbSaveUsageLog(l){
  try{localStorage.setItem(PB_USAGE_LOG_KEY,JSON.stringify(l));}catch(e){}
  if(typeof pbCloudQueue==='function')pbCloudQueue(PB_USAGE_LOG_KEY); // SINKRON ANTAR PERANGKAT
}
function _vbLoadUsageArchive(){
  try{
    var a=JSON.parse(localStorage.getItem(PB_USAGE_ARCHIVE_KEY)||'null');
    if(a&&typeof a==='object')return a;
  }catch(e){}
  return{};
}
function _vbSaveUsageArchive(a){
  try{localStorage.setItem(PB_USAGE_ARCHIVE_KEY,JSON.stringify(a));}catch(e){}
  // FIX BUG SINKRON (audit lanjutan, statistik biaya & cache): dulu pakai
  // pbCloudQueue (timpa nilai penuh, sama rawan-hilang-data seperti bug yang
  // sudah diperbaiki utk pb_usage_stats_v1/pb_wordfix_stats_v1 — lihat
  // catatan panjang di dekat PB_COUNTER_SYNC_KEYS). Arsip harian ini murni
  // angka akumulasi per-tanggal juga, jadi sekarang dipindah ke sync counter
  // yang sama (increment per-field, aman dipakai bersamaan dari 2+ perangkat).
  if(typeof pbCloudQueueCounter==='function')pbCloudQueueCounter(PB_USAGE_ARCHIVE_KEY); // SINKRON ANTAR PERANGKAT
}
// ── BIAYA PER MODEL (audit statistik biaya & cache, 1 Okt 2026) ──────────
// DULU: riwayat/arsip/total selamanya TIDAK menyimpan nama model, dan semua
// biaya dihitung ulang dengan tarif model yang SEDANG dipilih di tab Panduan.
// Akibatnya tiap ganti model, seluruh riwayat + "TOTAL SEMUA BIAYA" ikut
// berubah harga (mis. pemakaian Gemini $0,14 bisa tampil $3,00 saat Sonnet
// terpilih). SEKARANG: tiap panggilan dicatat bersama KUNCI modelnya
// (sonnet/haiku/groq/gemini — kunci PB_AI_MODELS, tanpa titik/spasi supaya
// aman jadi path field counter cloud) dan biayanya dihitung dengan tarif
// modelnya sendiri. Token dari catatan LAMA (sebelum update ini) tidak punya
// nama model: dihitung sebagai "model tidak diketahui" pakai tarif asumsi
// VB_LEGACY_MODEL_KEY (lihat _vbCalcUsd) — sisa = total datar − jumlah
// byModel, jadi perangkat yang masih memakai versi lama pun tidak merusak
// hitungan (tokennya otomatis masuk "tidak diketahui").
// outEstTok = PERKIRAAN output dari percobaan yang terputus (timeout/error
// di tengah stream, event akhir berisi output_tokens tidak pernah datang).
// Sengaja DIPISAH dari outTok (angka asli API) supaya tidak tercampur.
var VB_TOK_FIELDS=['noCacheInTok','cacheWriteInTok','cacheReadInTok','outTok','outEstTok'];
function _vbEmptyTok(){return{noCacheInTok:0,cacheWriteInTok:0,cacheReadInTok:0,outTok:0,outEstTok:0};}
function _vbEmptyKindBucket(){return{calls:0,single:0,bulk:0,noCacheInTok:0,cacheWriteInTok:0,cacheReadInTok:0,outTok:0,byModel:{}};}
function _vbValidModelKey(k){return(k&&typeof k==='string'&&Object.prototype.hasOwnProperty.call(PB_AI_MODELS,k))?k:'';}
// Tambahkan token 1 panggilan (objek e: noCacheInTok/cacheWriteInTok/
// cacheReadInTok/outTok/outEstTok/model) ke bucket b (bucket arsip, objek
// statistik selamanya, atau statistik perbaikan kata): field datar = total
// semua model (dipakai tampilan lama), byModel[kunci] = rincian per model.
function _vbBucketAddTokens(b,e){
  b.noCacheInTok=(b.noCacheInTok||0)+(e.noCacheInTok||0);
  b.cacheWriteInTok=(b.cacheWriteInTok||0)+(e.cacheWriteInTok||0);
  b.cacheReadInTok=(b.cacheReadInTok||0)+(e.cacheReadInTok||0);
  b.outTok=(b.outTok||0)+(e.outTok||0);
  var mk=_vbValidModelKey(e.model);
  if(mk){
    if(!b.byModel||typeof b.byModel!=='object')b.byModel={};
    var bm=b.byModel[mk]||(b.byModel[mk]=_vbEmptyTok());
    VB_TOK_FIELDS.forEach(function(f){bm[f]=(bm[f]||0)+(e[f]||0);});
  }
}
function _vbMergeBucket(dst,src){
  if(!src)return;
  dst.calls+=src.calls||0; dst.single+=src.single||0; dst.bulk+=src.bulk||0;
  dst.noCacheInTok+=src.noCacheInTok||0; dst.cacheWriteInTok+=src.cacheWriteInTok||0;
  dst.cacheReadInTok+=src.cacheReadInTok||0; dst.outTok+=src.outTok||0;
  if(src.byModel&&typeof src.byModel==='object'){
    if(!dst.byModel)dst.byModel={};
    Object.keys(src.byModel).forEach(function(k){
      var d=dst.byModel[k]||(dst.byModel[k]=_vbEmptyTok());
      VB_TOK_FIELDS.forEach(function(f){d[f]=(d[f]||0)+((src.byModel[k]&&src.byModel[k][f])||0);});
    });
  }
}
// Pecah sebuah bucket jadi {kunciModel: token}. Token yang tidak punya nama
// model (catatan lama) dikumpulkan di kunci 'unknown'.
function _vbSplitByModel(b){
  var res={},known=_vbEmptyTok(),bm=(b&&b.byModel)||{};
  Object.keys(bm).forEach(function(k){
    var t=_vbEmptyTok();
    VB_TOK_FIELDS.forEach(function(f){t[f]=(bm[k]&&bm[k][f])||0;known[f]+=t[f];});
    res[k]=t;
  });
  var rest=_vbEmptyTok(),any=false;
  ['noCacheInTok','cacheWriteInTok','cacheReadInTok','outTok'].forEach(function(f){
    var r=((b&&b[f])||0)-known[f];
    if(r>0){rest[f]=r;any=true;}
  });
  if(any)res.unknown=rest;
  return res;
}
// Biaya ASLI (dari token yang dilaporkan API) sebuah bucket, tiap model
// dihitung dengan tarifnya sendiri. Perkiraan output terputus TIDAK ikut.
function _vbBucketUsd(b){
  var sp=_vbSplitByModel(b),u=0;
  Object.keys(sp).forEach(function(k){var t=sp[k];u+=_vbCalcUsd(t.noCacheInTok,t.cacheWriteInTok,t.cacheReadInTok,t.outTok,k);});
  return u;
}
// Perkiraan output percobaan terputus: {tok, usd} (terpisah dari biaya asli).
function _vbBucketEstOut(b){
  var sp=_vbSplitByModel(b),tok=0,usd=0;
  Object.keys(sp).forEach(function(k){var t=sp[k];if(t.outEstTok>0){tok+=t.outEstTok;usd+=_vbCalcUsd(0,0,0,t.outEstTok,k);}});
  return{tok:tok,usd:usd};
}
// 'YYYY-MM-DD' berdasarkan tanggal LOKAL perangkat (bukan UTC), dipakai
// sebagai kunci arsip harian.
function _vbDayKey(ts){
  var d=new Date(ts);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function _vbDayKeyToTs(day){
  var p=day.split('-');
  return new Date(+p[0],+p[1]-1,+p[2]).getTime();
}
function _vbArchiveAdd(arc,e){
  if(e&&e.failed)return; // catatan percobaan gagal (tanpa biaya) tidak ikut diarsip/dihitung sebagai panggilan
  var day=_vbDayKey(e.ts);
  if(!arc[day])arc[day]={generate:_vbEmptyKindBucket(),fix:_vbEmptyKindBucket()};
  var kind=e.kind==='fix'?'fix':'generate';
  var b=arc[day][kind];
  b.calls++;
  if(e.mode==='bulk')b.bulk++; else if(e.mode==='single')b.single++;
  _vbBucketAddTokens(b,e); // token datar + rincian per model (lihat _vbBucketAddTokens)
}
// Pindahkan entri mentah yang sudah lebih tua dari PB_USAGE_LOG_RAW_DAYS ke
// arsip harian (agregat, TIDAK PERNAH dihapus) — dipanggil tiap kali ada
// entri baru masuk, jadi ukuran riwayat mentah tetap terkendali sementara
// data lama tetap ada (cuma berubah bentuk jadi ringkasan per-hari).
function _vbCompactUsageLog(log){
  var cutoff=Date.now()-PB_USAGE_LOG_RAW_DAYS*24*60*60*1000;
  var keep=[],old=[];
  for(var i=0;i<log.length;i++){(log[i].ts>=cutoff?keep:old).push(log[i]);}
  if(old.length){
    var arc=_vbLoadUsageArchive();
    old.forEach(function(e){_vbArchiveAdd(arc,e);});
    _vbSaveUsageArchive(arc);
  }
  if(keep.length>PB_USAGE_LOG_SAFETY_MAX){
    keep.sort(function(a,b){return a.ts-b.ts;});
    var extra=keep.splice(0,keep.length-PB_USAGE_LOG_SAFETY_MAX);
    var arc2=_vbLoadUsageArchive();
    extra.forEach(function(e){_vbArchiveAdd(arc2,e);});
    _vbSaveUsageArchive(arc2);
  }
  return keep;
}
// Jumlah semua panggilan (dari riwayat mentah + arsip harian) dalam rentang
// waktu [startTs,endTs), dipecah per jenis (generate/fix). Ini basis untuk
// breakdown Hari ini/7 hari/Bulan ini/Semua waktu DAN breakdown per mode.
// archiveData/logData opsional (dipakai buat hindari baca-ulang localStorage
// berkali-kali kalau fungsi ini dipanggil berulang dalam 1 render — lihat
// pemanggil di _vbRenderUsageBadge).
function _vbPeriodTotals(startTs,endTs,archiveData,logData){
  var totals={generate:_vbEmptyKindBucket(),fix:_vbEmptyKindBucket()};
  var arc=archiveData||_vbLoadUsageArchive();
  Object.keys(arc).forEach(function(day){
    var dayTs=_vbDayKeyToTs(day);
    if(dayTs>=startTs&&dayTs<endTs){
      _vbMergeBucket(totals.generate,arc[day].generate);
      _vbMergeBucket(totals.fix,arc[day].fix);
    }
  });
  var log=logData||_vbLoadUsageLog();
  log.forEach(function(e){
    if(e.failed)return;
    if(e.ts>=startTs&&e.ts<endTs){
      var k=e.kind==='fix'?'fix':'generate';
      var t=totals[k];
      t.calls++;
      if(e.mode==='bulk')t.bulk++; else if(e.mode==='single')t.single++;
      _vbBucketAddTokens(t,e);
    }
  });
  return totals;
}
// Total biaya (USD) satu hari kalender tertentu (dayKey 'YYYY-MM-DD'),
// gabungan riwayat mentah (kalau harinya masih dalam rentang mentah) +
// arsip (kalau sudah diringkas) — dipakai buat grafik batang. archiveData/
// logData opsional, sama seperti di _vbPeriodTotals di atas.
function _vbDayTotalUsd(dayKey,archiveData,logData){
  var b=_vbEmptyKindBucket();
  var arc=archiveData||_vbLoadUsageArchive();
  if(arc[dayKey]){_vbMergeBucket(b,arc[dayKey].generate);_vbMergeBucket(b,arc[dayKey].fix);}
  var log=logData||_vbLoadUsageLog();
  log.forEach(function(e){
    if(_vbDayKey(e.ts)===dayKey){
      _vbBucketAddTokens(b,e);
    }
  });
  return _vbBucketUsd(b);
}
function _vbStartOfToday(){var d=new Date();d.setHours(0,0,0,0);return d.getTime();}
function _vbStartOfMonth(){var d=new Date();d.setDate(1);d.setHours(0,0,0,0);return d.getTime();}
function _vbLogUsageEvent(kind,mode,tok,outTok,extra){ // extra: {model,outEstTok,interrupted}
  var l=_vbLoadUsageLog();
  // Jaga-jaga: kalau ada jalur yang belum sempat panggil
  // _vbStartUsageSession sebelum sampai sini, buat sesi baru otomatis di
  // tempat supaya baris riwayat ini tetap punya sesiId (jadi tidak error &
  // tetap kelihatan di panel, cuma jadi sesinya sendiri isi 1 baris).
  if(!_vbCurrentSessionId)_vbStartUsageSession(mode==='bulk'?'Bulk':'Single',_vbCurrentCallProdukCount||1);
  // FIX BUG SINKRON (audit lanjutan, statistik biaya & cache): id unik per
  // baris riwayat — dipakai _mergeLogArrays supaya gabungan riwayat cloud+
  // lokal antar-perangkat bisa dedup dengan benar (union by id) alih-alih
  // saling menimpa. Lihat PB_LOG_MERGE_KEYS.
  l.push({id:'e'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
    ts:Date.now(),kind:kind||'generate',mode:mode||'unknown',
    sesiId:_vbCurrentSessionId,sesiLabel:_vbCurrentSessionLabel,sesiTotal:_vbCurrentSessionTotal,
    produkCount:_vbCurrentCallProdukCount||1,fotoCount:_vbCurrentCallFotoCount||0,
    noCacheInTok:(tok&&tok.noCacheInTok)||0,cacheWriteInTok:(tok&&tok.cacheWriteInTok)||0,cacheReadInTok:(tok&&tok.cacheReadInTok)||0,outTok:outTok||0,
    model:_vbValidModelKey(extra&&extra.model)||undefined,
    outEstTok:(extra&&extra.outEstTok>0)?extra.outEstTok:undefined,
    interrupted:(extra&&extra.interrupted)?true:undefined,
    chatMode:(extra&&(extra.chatMode==='mini'||extra.chatMode==='full'))?extra.chatMode:undefined,
    failed:(extra&&extra.failed)?true:undefined,status:(extra&&extra.status)||undefined,to:(extra&&extra.to)||undefined});
  l=_vbCompactUsageLog(l);
  _vbSaveUsageLog(l);
}
// Format jam:menit lokal HP user (bukan UTC) + tanggal singkat, dipakai di
// tampilan riwayat supaya jelas kalau ada entri dari hari sebelumnya juga.
function _vbFormatLogTime(ts){
  var d=new Date(ts);
  var jam=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  var today=new Date();
  var isToday=d.getFullYear()===today.getFullYear()&&d.getMonth()===today.getMonth()&&d.getDate()===today.getDate();
  return isToday?jam:(d.getDate()+'/'+(d.getMonth()+1)+' '+jam);
}
function _vbLoadUsageStats(){
  try{
    var s=JSON.parse(localStorage.getItem(PB_USAGE_KEY)||'null');
    if(s&&typeof s.hit==='number'){
      if(!s.byModel||typeof s.byModel!=='object')s.byModel={};
      return s;
    }
  }catch(e){}
  // nonClaude = jumlah panggilan Groq/Gemini (tidak punya prompt caching, jadi
  // TIDAK dihitung ke hit/miss/noCache); interrupted = jumlah percobaan
  // terputus yang tetap tertagih; byModel = rincian token per model.
  return{hit:0,miss:0,noCache:0,nonClaude:0,interrupted:0,inTok:0,outTok:0,noCacheInTok:0,cacheWriteInTok:0,cacheReadInTok:0,byModel:{}};
}
function _vbSaveUsageStats(s){
  try{localStorage.setItem(PB_USAGE_KEY,JSON.stringify(s));}catch(e){}
  // FIX BUG SINKRON (audit lanjutan, Sept 2026): dulu pakai pbCloudQueue
  // (timpa nilai penuh, rawan hitungan hilang kalau 2 perangkat generate
  // bersamaan). Sekarang pakai pbCloudQueueCounter (increment per-field) —
  // lihat definisinya + catatan panjang di dekat PB_COUNTER_SYNC_KEYS.
  if(typeof pbCloudQueueCounter==='function')pbCloudQueueCounter(PB_USAGE_KEY);
}
function _vbTrackUsage(usageInfo,meta){
  meta=meta||{};
  // FIX BIAYA PER MODEL (audit, 1 Okt 2026): model yang BENAR-BENAR dipakai
  // panggilan ini dicatat bersama tokennya (bukan model yang kebetulan sedang
  // dipilih saat panel dibuka). meta.model = ID model API; pemanggil lama yang
  // tidak mengirim info model dianggap memakai model yang sedang dipilih.
  var mKey=_vbValidModelKey(meta.modelKey)||_vbValidModelKey(_pbModelKeyOfId(meta.model));
  if(!mKey&&!meta.model&&!meta.modelKey)mKey=_vbValidModelKey(pbGetAiModelKey());
  var estOut=(meta.outEstTok>0)?meta.outEstTok:0;
  var interrupted=!!meta.interrupted;
  // Panggilan perbaikan skrip kependekan: catat ke statistik 'Perbaikan jumlah kata' (kind 'fix'),
  // JANGAN campur ke statistik generate/cache utama supaya hit-rate cache tidak terganggu.
  if(_vbUsageKindOverride==='fix'){
    try{_vbTrackFixCall(usageInfo,{modelKey:mKey,outEstTok:estOut,interrupted:interrupted});}catch(eFix){console.warn('[_vbTrackUsage] catat fix gagal:',eFix);}
    return;
  }
  var s=_vbLoadUsageStats();
  // Rasio cache HIT hanya bermakna untuk Claude (Groq/Gemini tidak dikirimi
  // cache_control), jadi panggilan non-Claude dihitung terpisah (nonClaude),
  // tidak ikut menurunkan rasio HIT.
  var prov=mKey?(PB_AI_MODELS[mKey].provider||''):'';
  if(prov)s.nonClaude=(s.nonClaude||0)+1;
  else if(usageInfo.cache_read_input_tokens>0)s.hit++;
  else if(usageInfo.cache_creation_input_tokens>0)s.miss++;
  else s.noCache++;
  if(interrupted)s.interrupted=(s.interrupted||0)+1;
  // Token disimpan TERPISAH per jenis (biasa / tulis-cache +25% / baca-cache
  // diskon ~90%) DAN per model, supaya biayanya bisa dihitung dengan tarif
  // yang benar (lihat _vbCalcUsd). Field datar = total semua model.
  _vbBucketAddTokens(s,{noCacheInTok:usageInfo.input_tokens||0,cacheWriteInTok:usageInfo.cache_creation_input_tokens||0,cacheReadInTok:usageInfo.cache_read_input_tokens||0,outTok:usageInfo.output_tokens||0,outEstTok:estOut,model:mKey});
  s.inTok+=(usageInfo.input_tokens||0)+(usageInfo.cache_creation_input_tokens||0)+(usageInfo.cache_read_input_tokens||0); // tetap dijumlah kasar buat tampilan "Input total", TIDAK dipakai buat hitung biaya
  _vbSaveUsageStats(s);
  _vbLogUsageEvent('generate',_vbCurrentCallMode,{noCacheInTok:usageInfo.input_tokens||0,cacheWriteInTok:usageInfo.cache_creation_input_tokens||0,cacheReadInTok:usageInfo.cache_read_input_tokens||0},usageInfo.output_tokens||0,{model:mKey,outEstTok:estOut,interrupted:interrupted}); // RIWAYAT: catat jam + jenis + mode + model + token asli per-jenis panggilan ini
  _vbRenderUsageBadge(s);
  _vbEnsureLiveIdrRate(); // prefetch kurs di background, gratis & bukan panggilan AI
}
// Dulu ada flag _vbUsageBadgeExpanded buat toggle ringkas<->lengkap di badge
// melayang. Sekarang panelnya (#pb-usage-panel, di tab Panduan) cuma
// dirender kalau sedang ditampilkan (dicek langsung dari class "hidden"-nya
// di _vbRenderUsageBadge), jadi flag terpisah tidak diperlukan lagi.
// ── KURS USD→IDR REAL-TIME (permintaan user, Sept 2026) ──────────────────
// Sebelumnya USD_TO_IDR di bawah cuma angka tetap yang diketik manual.
// Sekarang badge coba ambil kurs asli dari API kurs publik GRATIS (tanpa
// API key, tanpa panggilan AI/Claude sama sekali — cuma HTTP request biasa
// ke penyedia kurs, jadi TIDAK menambah biaya token). Hasilnya disimpan di
// cache 24 jam supaya tidak fetch berulang tiap kali badge dibuka — cukup
// sekali sehari. Kalau fetch gagal (offline/API down), otomatis fallback
// ke cache lama (walau sudah lewat 24 jam) atau ke USD_TO_IDR statis kalau
// belum pernah berhasil fetch sama sekali — badge tetap jalan, cuma
// labelnya berubah jadi "kurs perkiraan" bukan "kurs real-time".
var PB_IDR_RATE_KEY='pb_idr_rate_cache_v1';
var _vbLiveIdrRate=null;      // angka kurs terakhir yang berhasil didapat (live atau cache lama)
var _vbLiveIdrIsFresh=false;  // true kalau umurnya masih di bawah 24 jam
var _vbIdrFetchInFlight=false;
var _vbIdrLastTry=0; // jeda >=1 jam antar percobaan fetch (dok. open.er-api.com: rate limit -> HTTP 429 selama 20 menit)
function _vbLoadIdrCache(){
  try{
    var c=JSON.parse(localStorage.getItem(PB_IDR_RATE_KEY)||'null');
    if(c&&typeof c.rate==='number'&&c.rate>0)return c;
  }catch(e){}
  return null;
}
function _vbEnsureLiveIdrRate(){
  var cache=_vbLoadIdrCache();
  var ONE_DAY=24*60*60*1000;
  if(cache){
    _vbLiveIdrRate=cache.rate;
    _vbLiveIdrIsFresh=(Date.now()-cache.ts)<ONE_DAY;
    if(_vbLiveIdrIsFresh)return; // masih segar, tidak perlu fetch lagi
  }
  if(_vbIdrFetchInFlight)return;
  if(Date.now()-_vbIdrLastTry<60*60*1000)return;
  _vbIdrLastTry=Date.now();
  _vbIdrFetchInFlight=true;
  // open.er-api.com: API kurs publik gratis, tanpa key, CORS diizinkan,
  // update kursnya sekali sehari (sesuai kebutuhan kita — tidak perlu
  // lebih sering dari itu untuk sekadar estimasi biaya).
  var ctrl=(typeof AbortController!=='undefined')?new AbortController():null;
  var timer=ctrl?setTimeout(function(){ctrl.abort();},6000):null;
  fetch('https://open.er-api.com/v6/latest/USD',ctrl?{signal:ctrl.signal}:{})
    .then(function(r){return r.json();})
    .then(function(data){
      var rate=data&&data.rates&&data.rates.IDR;
      if(typeof rate==='number'&&rate>0){
        _vbLiveIdrRate=rate;
        _vbLiveIdrIsFresh=true;
        try{localStorage.setItem(PB_IDR_RATE_KEY,JSON.stringify({rate:rate,ts:Date.now()}));}catch(e){}
        // Refresh tampilan badge kalau lagi kebuka, supaya kurs baru
        // langsung kelihatan tanpa perlu tap-tutup-buka lagi.
        _vbRenderUsageBadge(_vbLoadUsageStats()); // no-op sendiri kalau panel lagi ditutup
      }
    })
    .catch(function(e){/* offline/API down — diam saja, tetap pakai cache lama/fallback statis */})
    .finally(function(){
      _vbIdrFetchInFlight=false;
      if(timer)clearTimeout(timer);
    });
}
function _vbCurrentIdrRate(){
  return _vbLiveIdrRate||USD_TO_IDR;
}
function _vbIdrRateLabel(){
  return _vbLiveIdrRate?(_vbLiveIdrIsFresh?'kurs real-time':'kurs real-time terakhir, sedang refresh'):'kurs perkiraan';
}
// GRAFIK BATANG 14 HARI TERAKHIR (permintaan user, Sept 2026, "statistik
// sangat lengkap") — SVG inline murni (tanpa library luar, konsisten
// dengan ikon SVG lain di app ini), jadi tidak nambah beban loading.
// Tinggi tiap batang proporsional ke biaya USD hari itu (gabungan
// generate+fix), label angka tanggal di bawah tiap batang, tooltip native
// browser (title) muncul kalau batang di-hover/tap-tahan di HP.
// archiveData/logData opsional — dipakai supaya tidak baca-ulang
// localStorage 14× (lihat pemanggil di _vbRenderUsageBadge).
function _vbBuildUsageChartSvg(archiveData,logData){
  var arc=archiveData||_vbLoadUsageArchive();
  var log=logData||_vbLoadUsageLog();
  var days=[],labels=[];
  for(var i=13;i>=0;i--){
    var d=new Date();d.setDate(d.getDate()-i);d.setHours(0,0,0,0);
    days.push(_vbDayKey(d.getTime()));
    labels.push(String(d.getDate()));
  }
  var vals=days.map(function(day){return _vbDayTotalUsd(day,arc,log);});
  var max=Math.max.apply(null,vals.concat([0.000001]));
  var w=320,h=84,padB=14,gap=3;
  var barW=(w/days.length)-gap;
  var bars=vals.map(function(v,i){
    var bh=v>0?Math.max((v/max)*(h-padB),2):0;
    var x=i*(barW+gap);
    var y=(h-padB)-bh;
    return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="2" fill="currentColor" opacity="'+(v>0?0.85:0.15)+'"><title>'+days[i]+': $'+v.toFixed(4)+'</title></rect>'
      +'<text x="'+(x+barW/2).toFixed(1)+'" y="'+(h-2)+'" font-size="7" text-anchor="middle" fill="currentColor" opacity="0.5">'+labels[i]+'</text>';
  }).join('');
  return '<svg viewBox="0 0 '+w+' '+h+'" width="100%" height="90" style="color:var(--accent,#7C5CFC);">'+bars+'</svg>';
}
// EKSPOR CSV (permintaan user, Sept 2026, "statistik sangat lengkap") —
// mengunduh SELURUH riwayat mentah (per-panggilan) + SELURUH arsip harian
// (per-tanggal, sudah diringkas) jadi 1 file CSV, supaya bisa dibuka di
// Excel/Sheets buat analisis lebih lanjut di luar app atau backup manual.
// DIPERLUAS (permintaan user, Sept 2026, "pisah per generate + biaya foto"):
// tambah kolom Sesi/JumlahProdukSesi/JumlahProdukPanggilan/JumlahFoto/
// EstBiayaFotoUSD supaya 1 aksi generate (mis. bulk 8 produk) tetap bisa
// dikelompokkan di Excel/Sheets walau di sini tetap 1 baris per-panggilan.
async function _vbExportUsageCsv(){
  var rows=[['Tanggal','Jam','Sesi','LabelSesi','JumlahProdukSesi','Jenis','Mode','JumlahProdukPanggilan','JumlahFoto','EstBiayaFotoUSD','TokenInputNoCache','TokenCacheWrite','TokenCacheRead','TokenOutput','Model','TokenOutputPerkiraanTerputus','BiayaPerkiraanTerputusUSD','BiayaUSD']];
  _vbLoadUsageLog().slice().sort(function(a,b){return a.ts-b.ts;}).forEach(function(e){
    if(e.failed)return;
    var d=new Date(e.ts);
    var usd=_vbCalcUsd(e.noCacheInTok,e.cacheWriteInTok,e.cacheReadInTok,e.outTok,e.model);
    var estTokE=e.outEstTok||0,estUsdE=_vbCalcUsd(0,0,0,estTokE,e.model);
    var fotoUsd=_vbEstFotoUsd(e.fotoCount||0,e.model);
    rows.push([_vbDayKey(e.ts),String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'),e.sesiId||'-',e.sesiLabel||'-',e.sesiTotal||1,e.kind==='fix'?'Perbaikan Kata':'Generate',e.mode==='bulk'?'Bulk':(e.mode==='single'?'Single':'-'),e.produkCount||1,e.fotoCount||0,fotoUsd.toFixed(6),e.noCacheInTok,e.cacheWriteInTok,e.cacheReadInTok,e.outTok,_vbModelLabel(e.model||''),estTokE,estUsdE.toFixed(6),usd.toFixed(6)]);
  });
  var arc=_vbLoadUsageArchive();
  Object.keys(arc).sort().forEach(function(day){
    ['generate','fix'].forEach(function(kind){
      var b=arc[day][kind];
      if(!b||!b.calls)return;
      // 1 baris per model (token lama tanpa nama model → 'Model tidak diketahui').
      var sp=_vbSplitByModel(b);
      var ks=Object.keys(sp);
      if(!ks.length)ks=['unknown'];
      ks.forEach(function(k,ki){
        var tk=sp[k]||_vbEmptyTok();
        var u=_vbCalcUsd(tk.noCacheInTok,tk.cacheWriteInTok,tk.cacheReadInTok,tk.outTok,k);
        var eu=_vbCalcUsd(0,0,0,tk.outEstTok,k);
        rows.push([day,'(ringkasan harian)','-','-','-',kind==='fix'?'Perbaikan Kata':'Generate',ki===0?('Single:'+b.single+' Bulk:'+b.bulk):'(lanjutan)','-','-','-',tk.noCacheInTok,tk.cacheWriteInTok,tk.cacheReadInTok,tk.outTok,_vbModelLabel(k==='unknown'?'':k),tk.outEstTok,eu.toFixed(6),u.toFixed(6)]);
      });
    });
  });
  var csv=rows.map(function(r){return r.map(function(v){v=String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(',');}).join('\r\n');
  var fileName='statistik-biaya-'+_vbDayKey(Date.now())+'.csv';
  // FIX UNDUH DI APK CAPACITOR (permintaan user, Sept 2026): app ini
  // di-build jadi APK lewat Capacitor (kelihatan dari folder
  // capacitor-android & plugin custom GoogleAuthNativePlugin di project
  // Android Studio-nya) — BUKAN WebView polos manual. WebView bawaan
  // Capacitor SAMA SEKALI tidak mengimplementasikan Web Share API
  // (navigator.share === undefined di situ) dan tidak otomatis menangani
  // unduhan <a download>/blob — persis kenapa sebelumnya "gak ada reaksi
  // sama sekali". SOLUSI YANG BENAR untuk Capacitor: BUKAN bikin
  // JavaScript-Interface manual sendiri (itu cara buat WebView polos,
  // percuma di sini karena bridge-nya sudah dikelola Capacitor) —
  // pakai PLUGIN RESMI Capacitor yang sudah pasti kompatibel dengan
  // bridge-nya: @capacitor/filesystem (nulis file ke storage) +
  // @capacitor/share (buka sheet share/simpan native), sama seperti
  // GoogleAuthNativePlugin yang sudah jalan lewat window.Capacitor.Plugins.
  // WAJIB dijalankan dulu sebelum build ulang APK (di folder project
  // Capacitor, yang punya package.json & capacitor.config, BUKAN di
  // folder /android):
  //   npm install @capacitor/filesystem @capacitor/share
  //   npx cap sync android
  // Kalau app ini dibuka lewat browser/PWA biasa (bukan lewat APK),
  // window.Capacitor tidak ada / isNativePlatform() false, jadi otomatis
  // lanjut ke jalur Web Share/`<a download>` di bawah seperti sebelumnya.
  if(window.Capacitor&&typeof window.Capacitor.isNativePlatform==='function'&&window.Capacitor.isNativePlatform()&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Filesystem){
    try{
      var CapFS=window.Capacitor.Plugins.Filesystem;
      var CapShare=window.Capacitor.Plugins.Share;
      var writeRes=await CapFS.writeFile({path:fileName,data:'\uFEFF'+csv,directory:'CACHE',encoding:'utf8',recursive:true});
      if(CapShare&&typeof CapShare.share==='function'){
        await CapShare.share({title:fileName,url:writeRes.uri});
      }else{
        alert('CSV tersimpan sementara di app ('+fileName+'), tapi plugin @capacitor/share belum terpasang untuk membuka sheet simpan/bagikan. Jalankan: npm install @capacitor/share lalu npx cap sync android.');
      }
      return;
    }catch(capErr){console.warn('[_vbExportUsageCsv] jalur Capacitor Filesystem/Share gagal, lanjut fallback web biasa:',capErr);}
  }
  // FIX UNDUH DI HP (permintaan user, Sept 2026): trik lama <a download>+
  // klik terprogram TIDAK bisa diandalkan di banyak HP — paling parah di
  // Safari iOS ketika app dibuka sebagai PWA ter-install (standalone, dari
  // Home Screen): karena tidak ada chrome/tab browser yang bisa nampilin
  // prompt "Simpan", klik <a> itu sering diam-diam TIDAK melakukan apa-apa
  // (tidak error, tidak ada file kesimpen, user cuma bingung). Solusi:
  // PRIORITASKAN Web Share API dengan file (navigator.share) kalau
  // didukung — ini yang buka sheet native "Simpan ke Files / Bagikan" di
  // Android maupun iOS, baik lewat browser biasa MAUPUN PWA ter-install.
  // Trik <a download> lama DIPERTAHANKAN sebagai fallback (laptop/desktop
  // umumnya tidak dukung Web Share file, dan di situ trik lama ini sudah
  // teruji jalan baik).
  try{
    var blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    var canShareFile=false;
    var file=null;
    try{
      file=new File([blob],fileName,{type:'text/csv'});
      canShareFile=!!(navigator.canShare&&navigator.canShare({files:[file]}));
    }catch(fileErr){canShareFile=false;} // browser lama tanpa dukungan File/canShare — lanjut ke fallback biasa
    if(canShareFile){
      try{
        await navigator.share({files:[file],title:fileName});
        return; // berhasil lewat share sheet native, selesai di sini
      }catch(shareErr){
        // AbortError = user sendiri yang pilih "Batal" di share sheet —
        // hormati pilihannya, JANGAN lanjut ke fallback di bawah.
        if(shareErr&&shareErr.name==='AbortError')return;
        // Selain itu (jarang: share gagal karena sebab lain) → lanjut ke
        // fallback <a download> di bawah supaya user tetap dapat filenya.
      }
    }
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');a.href=url;a.download=fileName;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    // Jaring pengaman kedua khusus iOS: kalau Web Share file tidak
    // didukung sama sekali di device ini, trik <a download> di atas besar
    // kemungkinan tidak menyimpan apa-apa (terutama mode PWA) — buka juga
    // blob-nya di tab baru supaya user masih bisa tekan-lama lalu pilih
    // "Bagikan"/"Simpan ke File" secara manual dari situ.
    if(!canShareFile&&/iP(hone|ad|od)/.test(navigator.userAgent)){
      setTimeout(function(){try{window.open(url,'_blank');}catch(e2){}},300);
    }
    setTimeout(function(){URL.revokeObjectURL(url);},60000);
  }catch(e){alert('Gagal ekspor CSV: '+e.message);}
}
// Estimasi biaya (USD) dari N foto referensi di satu panggilan — lihat
// catatan lengkap di VB_EST_TOKEN_PER_FOTO. Dihitung pakai tarif input
// TANPA cache (foto ada di pesan user, bukan blok system yang di-cache),
// jadi ini estimasi kasar bagian biaya panggilan yang "disumbang" foto,
// BUKAN biaya terpisah yang benar-benar ditagih sendiri oleh Anthropic.
function _vbEstFotoUsd(fotoCount,modelKey){
  if(!fotoCount)return 0;
  return _vbCalcUsd(fotoCount*VB_EST_TOKEN_PER_FOTO,0,0,0,modelKey);
}
// ── KELOMPOKKAN RIWAYAT PER-SESI (permintaan user, Sept 2026, "statistik
// dipisah per generate") ──────────────────────────────────────────────────
// 1x aksi generate user (klik "Generate Semua" bulk N produk, generate
// single, atau revisi 1 produk) bisa terdiri dari BEBERAPA baris riwayat
// mentah (1 per panggilan batch + perbaikan kata) — lihat _vbStartUsageSession.
// Fungsi ini mengelompokkan baris-baris itu balik jadi 1 objek "sesi" per
// aksi, diurutkan TERBARU dulu, supaya panel bisa tampil ringkas (1 baris/
// sesi) dan baru pecah jadi detail per-panggilan kalau ditap.
// Baris riwayat LAMA (sebelum update ini, belum punya sesiId) tetap aman:
// masing-masing otomatis jadi "sesi" isi 1 baris sendiri (pakai ts+index
// sebagai id sementara), jadi tidak ada data yang hilang/nyasar.
function _vbGroupLogBySession(logEntries){
  var bySesi={},order=[];
  logEntries.forEach(function(e,i){
    var sid=e.sesiId||('legacy-'+e.ts+'-'+i);
    if(!bySesi[sid]){
      bySesi[sid]={sesiId:sid,label:e.sesiLabel||(e.mode==='bulk'?'Bulk':(e.mode==='single'?'Single':'Generate')),
        produkTotal:e.sesiTotal||e.produkCount||1,entries:[],firstTs:e.ts,lastTs:e.ts};
      order.push(sid);
    }
    var g=bySesi[sid];
    g.entries.push(e);
    if(e.ts<g.firstTs)g.firstTs=e.ts;
    if(e.ts>g.lastTs)g.lastTs=e.ts;
  });
  var sessions=order.map(function(sid){return bySesi[sid];});
  sessions.forEach(function(g){
    g.entries.sort(function(a,b){return a.ts-b.ts;});
    var totalUsd=0,totalFoto=0,totalCalls=0,hasFix=false,fotoUsd=0,estUsd=0,estTok=0;
    g.entries.forEach(function(e){
      totalUsd+=_vbCalcUsd(e.noCacheInTok,e.cacheWriteInTok,e.cacheReadInTok,e.outTok,e.model);
      if(e.outEstTok>0){estTok+=e.outEstTok;estUsd+=_vbCalcUsd(0,0,0,e.outEstTok,e.model);}
      totalFoto+=e.fotoCount||0;
      fotoUsd+=_vbEstFotoUsd(e.fotoCount||0,e.model);
      totalCalls++;
      if(e.kind==='fix')hasFix=true;
    });
    g.totalUsd=totalUsd;g.totalFotoCount=totalFoto;g.totalCalls=totalCalls;g.hasFix=hasFix;
    g.fotoUsd=fotoUsd;g.estUsd=estUsd;g.estTok=estTok;
  });
  sessions.sort(function(a,b){return b.lastTs-a.lastTs;});
  return sessions;
}
// State expand/collapse (di memori saja, tidak disimpan) — supaya sesi yang
// sedang ditap tetap terbuka walau panel dirender ulang (mis. ada panggilan
// baru masuk sementara panel kebuka).
var _vbUsageExpandedSet={};
function _vbToggleUsageSession(sesiId){
  if(_vbUsageExpandedSet[sesiId])delete _vbUsageExpandedSet[sesiId];
  else _vbUsageExpandedSet[sesiId]=true;
  _vbRenderUsageBadge(_vbLoadUsageStats());
}
// PINDAH DARI BADGE MELAYANG KE TAB PANDUAN (permintaan user, Sept 2026):
// dulu fungsi ini bikin & isi div #pb-usage-badge yang fixed di pojok layar
// (nutupin konten pas di-expand). Sekarang targetnya #pb-usage-panel, yang
// hidup di tab Panduan dan cuma kelihatan kalau tombol "Lihat Statistik
// Biaya & Cache" ditap (lihat _vbToggleUsagePanel). Selalu render versi
// LENGKAP (tidak ada lagi mode ringkas "Cache X%") karena panel ini memang
// baru sengaja dibuka user buat lihat detail — beda dari badge lama yang
// selalu nongol jadi perlu mode ringkas.
// DIPERLUAS (permintaan user, Sept 2026, "statistik sangat lengkap"):
// sekarang tampil juga rasio cache-hit %, breakdown biaya per periode
// waktu (Hari ini/7 hari/Bulan ini/Semua waktu), breakdown per jenis+mode
// panggilan, grafik batang 14 hari, dan tombol ekspor CSV.
function _vbRenderUsageBadge(s){
  var el=document.getElementById('pb-usage-panel');
  if(!el)return; // elemen belum ada di DOM (mis. dipanggil sebelum halaman siap)
  if(el.classList.contains('hidden'))return; // hemat: tidak usah dihitung kalau panel lagi ditutup
  // STAT REAL PERBAIKAN JUMLAH KATA (permintaan user, Sept 2026): dihitung
  // dari token ASLI tiap panggilan _vbFixWordCountIfNeeded/Batch (lihat
  // _vbTrackFixCall/_vbTrackFixOutcome) — bukan estimasi/perkiraan lagi.
  var fs=_vbLoadFixStats();
  var idr=_vbCurrentIdrRate();
  var idrLabel=_vbIdrRateLabel();
  var fixUsd=_vbBucketUsd(fs); // tarif tiap model sendiri (bukan model yang sedang dipilih)
  var fixIdr=Math.round(fixUsd*idr);
  var totalFinished=fs.attemptHist[1]+fs.attemptHist[2]+fs.attemptHist[3];
  // BIAYA GENERATE UTAMA (permintaan user, Sept 2026): s.inTok/s.outTok di
  // atas sudah mencakup SEMUA panggilan generate utama (Cerita Produk,
  // Foto Referensi, dst) — termasuk token dari foto yang diupload user,
  // karena foto ikut terhitung sebagai input_tokens oleh API Anthropic
  // persis seperti teks. UPDATE (audit biaya, 1 Okt 2026): ada 4 model
  // (Sonnet/Haiku/Groq/Gemini) dengan tarif beda, jadi biaya TIDAK lagi
  // dihitung dengan tarif satu model — tiap panggilan memakai tarif model
  // yang benar-benar dipakainya (lihat _vbBucketUsd/_vbSplitByModel).
  var mainUsd=_vbBucketUsd(s);
  var mainIdr=Math.round(mainUsd*idr);
  var grandUsd=mainUsd+fixUsd;
  var grandIdr=Math.round(grandUsd*idr);
  // PERKIRAAN output percobaan terputus (terpisah dari biaya asli di atas).
  var estS=_vbBucketEstOut(s),estF=_vbBucketEstOut(fs);
  var estTokAll=estS.tok+estF.tok,estUsdAll=estS.usd+estF.usd;
  var grandEstUsd=grandUsd+estUsdAll;
  // RINCIAN PER MODEL (generate utama + perbaikan kata digabung).
  var modelAgg={};
  [s,fs].forEach(function(src){
    var sp=_vbSplitByModel(src);
    Object.keys(sp).forEach(function(k){
      var a=modelAgg[k]||(modelAgg[k]=_vbEmptyTok());
      VB_TOK_FIELDS.forEach(function(f){a[f]+=sp[k][f]||0;});
    });
  });
  var modelOrder=Object.keys(PB_AI_MODELS).concat(['unknown']);
  var modelHtml=modelOrder.filter(function(k){return modelAgg[k];}).map(function(k){
    var m=modelAgg[k];
    var u=_vbCalcUsd(m.noCacheInTok,m.cacheWriteInTok,m.cacheReadInTok,m.outTok,k);
    var inAll=m.noCacheInTok+m.cacheWriteInTok+m.cacheReadInTok;
    var eu=_vbCalcUsd(0,0,0,m.outEstTok,k);
    return '<b>'+esc(_vbModelLabel(k==='unknown'?'':k))+'</b>: '+inAll.toLocaleString('id-ID')+' in / '+m.outTok.toLocaleString('id-ID')+' out — $'+u.toFixed(4)+' (≈Rp'+Math.round(u*idr).toLocaleString('id-ID')+')'
      +(m.outEstTok>0?'<br>&nbsp;&nbsp;<span style="opacity:0.8">+ perkiraan output terputus ~'+m.outEstTok.toLocaleString('id-ID')+' token (~$'+eu.toFixed(4)+')</span>':'');
  }).join('<br>')||'(belum ada)';
  var unknownNote=modelAgg.unknown?'<br><span style="opacity:0.65">Catatan lama (sebelum nama model dicatat) tidak diketahui modelnya, jadi dihitung dengan tarif '+esc(PB_AI_MODELS[VB_LEGACY_MODEL_KEY].label)+' sebagai asumsi.</span>':'';
  // RASIO CACHE HIT (permintaan user, Sept 2026): dulu cuma angka mentah
  // (HIT: 12, MISS: 3) tanpa persentase — sekarang dihitung langsung dari
  // total panggilan generate utama.
  // UPDATE (audit biaya, 1 Okt 2026): rasio dihitung hanya dari panggilan
  // Claude yang MEMAKAI cache (HIT / (HIT + nulis baru)). Dulu penyebutnya
  // ikut menghitung mode single yang memang sengaja tanpa cache dan panggilan
  // Groq/Gemini, sehingga bukan ukuran efektivitas cache Claude.
  var cacheTried=s.hit+s.miss;
  var hitRatePct=cacheTried>0?((s.hit/cacheTried)*100).toFixed(1):null;
  // BREAKDOWN PER PERIODE WAKTU (permintaan user, Sept 2026): gabungan
  // riwayat mentah (60 hari terakhir) + arsip harian (lebih lama, tidak
  // pernah hilang) — lihat _vbPeriodTotals. "Semua waktu" di sini HANYA
  // mencakup sejak fitur pencatatan per-tanggal ini aktif (riwayat lama
  // sebelum update dibatasi 50 entri, sisanya tidak tercatat per-tanggal);
  // untuk total biaya SELAMANYA yang selalu akurat, lihat "TOTAL SEMUA
  // BIAYA" di bawah (dihitung dari akumulator lifetime, bukan riwayat).
  var now=Date.now();
  // OPTIMASI (perbaikan bug performa): load riwayat mentah + arsip SEKALI
  // di sini, lalu dipakai ulang oleh breakdown periode, breakdown mode,
  // grafik, dan daftar riwayat di bawah — bukan baca-ulang localStorage
  // puluhan kali per render seperti sebelumnya (bisa bikin lag kalau panel
  // dibuka pas sedang generate bulk banyak produk).
  var logAll=_vbLoadUsageLog();
  var archiveData=_vbLoadUsageArchive();
  var periods=[
    {label:'Hari ini',start:_vbStartOfToday(),end:now+1},
    {label:'7 hari terakhir',start:now-7*24*60*60*1000,end:now+1},
    {label:'Bulan ini',start:_vbStartOfMonth(),end:now+1},
    {label:'Semua tercatat di riwayat',start:0,end:now+1}
  ];
  var periodHtml=periods.map(function(p){
    var t=_vbPeriodTotals(p.start,p.end,archiveData,logAll);
    var usd=_vbBucketUsd(t.generate)+_vbBucketUsd(t.fix);
    var pIdr=Math.round(usd*idr);
    var calls=t.generate.calls+t.fix.calls;
    return p.label+': $'+usd.toFixed(4)+' (≈Rp'+pIdr.toLocaleString('id-ID')+') — '+calls+' panggilan';
  }).join('<br>');
  // BREAKDOWN PER JENIS & MODE (permintaan user, Sept 2026): dari riwayat +
  // arsip juga (catatan yang sama berlaku seperti di atas).
  var allT=_vbPeriodTotals(0,now+1,archiveData,logAll);
  var modeHtml='Generate — Single: '+allT.generate.single+'x, Bulk: '+allT.generate.bulk+'x ($'+_vbBucketUsd(allT.generate).toFixed(4)+')'
    +'<br>Perbaikan Kata — Single: '+allT.fix.single+'x, Bulk: '+allT.fix.bulk+'x ($'+_vbBucketUsd(allT.fix).toFixed(4)+')';
  // PERBANDINGAN MINI CHAT vs CHAT PENUH (permintaan user, 9 Okt 2026): dihitung dari baris riwayat perbaikan kata
  // yang punya label chatMode. Panggilan sebelum update ini tidak punya label, jadi tidak ikut.
  var cmAgg={mini:{calls:0,sesi:{},nc:0,cr:0,out:0,usd:0},full:{calls:0,sesi:{},nc:0,cr:0,out:0,usd:0}};
  logAll.forEach(function(e){
    if(e.failed||e.kind!=='fix'||(e.chatMode!=='mini'&&e.chatMode!=='full'))return;
    var a=cmAgg[e.chatMode];
    a.calls++;a.sesi[e.sesiId||('x'+e.ts)]=1;
    a.nc+=e.noCacheInTok||0;a.cr+=e.cacheReadInTok||0;a.out+=e.outTok||0;
    a.usd+=_vbCalcUsd(e.noCacheInTok,e.cacheWriteInTok,e.cacheReadInTok,e.outTok,e.model);
  });
  var cmHtml=['mini','full'].map(function(k){
    var a=cmAgg[k],nSesi=Object.keys(a.sesi).length;
    var lbl=k==='mini'?'Mini chat':'Chat penuh';
    if(!a.calls)return '<b>'+lbl+'</b>: belum ada data';
    var inAll=a.nc+a.cr;
    var cachePct=inAll>0?((a.cr/inAll)*100).toFixed(0):'0';
    return '<b>'+lbl+'</b>: '+a.calls+' panggilan di '+nSesi+' sesi — $'+a.usd.toFixed(4)
      +'<br>&nbsp;&nbsp;rata-rata $'+(a.usd/a.calls).toFixed(5)+' per panggilan, $'+(a.usd/nSesi).toFixed(4)+' per sesi'
      +'<br>&nbsp;&nbsp;input '+inAll.toLocaleString('id-ID')+' token ('+cachePct+'% dari cache), output '+a.out.toLocaleString('id-ID')+' token';
  }).join('<br>');
  modeHtml+='<br><br><b>Perbandingan Mini chat vs Chat penuh (perbaikan kata, semua model):</b><br>'+cmHtml
    +'<br><span style="opacity:0.65">Hanya dari panggilan sesudah update ini. Bandingkan angka "per sesi", bukan total.</span>';
  // RIWAYAT PER-SESI GENERATE (permintaan user, Sept 2026, "statistik
  // dipisah per generate"): dulu setiap baris riwayat mentah (1 per
  // panggilan batch) tampil sendiri-sendiri, bikin bingung mana yang 1x
  // klik generate (mis. bulk 8 produk = beberapa baris batch tercampur).
  // Sekarang dikelompokkan per-sesi (_vbGroupLogBySession) — tampil RINGKAS
  // 1 baris/sesi dulu (label + total biaya + jumlah foto), baru ditap buat
  // buka rincian semua panggilan+foto di dalamnya (_vbToggleUsageSession).
  var SESSION_SHOW_MAX=20;
  var allSessions=_vbGroupLogBySession(logAll);
  var sessionsShown=allSessions.slice(0,SESSION_SHOW_MAX);
  var logHtml=sessionsShown.length
    ?sessionsShown.map(function(g){
      var gIdr=Math.round(g.totalUsd*idr);
      var isOpen=!!_vbUsageExpandedSet[g.sesiId];
      var kindNote=g.hasFix?' <span style="opacity:0.65">(termasuk perbaikan kata)</span>':'';
      var fotoNote=g.totalFotoCount>0?' · <span style="opacity:0.8">📷 '+g.totalFotoCount+' foto (~$'+g.fotoUsd.toFixed(4)+')</span>':'';
      var callsNote=g.totalCalls>1?' · '+g.totalCalls+' panggilan':'';
      var estNote=g.estTok>0?' · <span style="opacity:0.8">+perkiraan output terputus ~'+g.estTok.toLocaleString('id-ID')+' token (~$'+g.estUsd.toFixed(4)+')</span>':'';
      var head='<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;">'
        +'<span><b>'+_vbFormatLogTime(g.firstTs)+'</b> — '+esc(g.label)+'</span>'
        +'<span>'+(isOpen?'▲':'▼')+'</span>'
        +'</div>'
        +'<div style="opacity:0.85;font-size:var(--fs-2xs,12px);">$'+g.totalUsd.toFixed(4)+' (≈Rp'+gIdr.toLocaleString('id-ID')+')'+callsNote+fotoNote+estNote+kindNote+'</div>';
      var detailHtml='';
      if(isOpen){
        detailHtml='<div style="margin-top:8px;padding:8px 10px;border-radius:var(--radius-xs,8px);background:var(--bg-subtle,rgba(127,127,127,0.08));">'
          +g.entries.map(function(e){
            var modeLabel=e.mode==='bulk'?'Bulk':(e.mode==='single'?'Single':'?');
            var kindLabel=e.kind==='fix'?('Perbaikan Kata'+(e.chatMode==='mini'?' · Mini chat':(e.chatMode==='full'?' · Chat penuh':''))):'Generate';
            var cacheLabel=e.cacheReadInTok>0?'cache HIT (diskon ~90%)':(e.cacheWriteInTok>0?'nulis cache baru (+25%)':'tanpa cache');
            var evUsd=_vbCalcUsd(e.noCacheInTok,e.cacheWriteInTok,e.cacheReadInTok,e.outTok,e.model);
            var modelLbl=esc(_vbModelLabel(e.model||''));
            var estEvLine=(e.outEstTok||0)>0?'<br>&nbsp;&nbsp;<span style="opacity:0.8">Percobaan terputus: perkiraan output ~'+e.outEstTok.toLocaleString('id-ID')+' token (~$'+_vbCalcUsd(0,0,0,e.outEstTok,e.model).toFixed(4)+', belum termasuk di biaya di bawah)</span>':'';
            var evIdr=Math.round(evUsd*idr);
            var produkNote=(e.produkCount||1)>1?' · '+e.produkCount+' produk sekaligus':'';
            var fotoLine=(e.fotoCount||0)>0?'<br>&nbsp;&nbsp;📷 '+e.fotoCount+' foto terlampir (~$'+_vbEstFotoUsd(e.fotoCount,e.model).toFixed(4)+' dari total panggilan ini)':'';
            return '<div style="padding:5px 0;border-top:1px solid var(--border,rgba(127,127,127,0.15));">'
              +_vbFormatLogTime(e.ts)+' — '+kindLabel+' ('+modeLabel+') · '+modelLbl+produkNote
              +'<br>&nbsp;&nbsp;Token: '+e.noCacheInTok.toLocaleString('id-ID')+' baru / '+e.cacheWriteInTok.toLocaleString('id-ID')+' tulis-cache / '+e.cacheReadInTok.toLocaleString('id-ID')+' baca-cache / '+e.outTok.toLocaleString('id-ID')+' output ('+cacheLabel+')'
              +fotoLine
              +estEvLine
              +'<br>&nbsp;&nbsp;Biaya panggilan ini: $'+evUsd.toFixed(4)+' (≈Rp'+evIdr.toLocaleString('id-ID')+')'
              +'</div>';
          }).join('')
          +'</div>';
      }
      return '<div style="padding:8px 0;border-top:1px solid var(--border,rgba(127,127,127,0.15));cursor:pointer;" onclick="_vbToggleUsageSession(\''+g.sesiId+'\')">'+head+detailHtml+'</div>';
    }).join('')
    :'(belum ada riwayat)';
  var arcDays=Object.keys(archiveData).length;
  var logMoreNote=allSessions.length>SESSION_SHOW_MAX?'<br><span style="opacity:0.6">+'+(allSessions.length-SESSION_SHOW_MAX)+' sesi lebih lama tersimpan (60 hari terakhir, tidak semua ditampilkan)</span>':'';
  var archiveNote=arcDays>0?'<br><span style="opacity:0.6">+ ringkasan harian dari '+arcDays+' hari lebih lama tersimpan di arsip (lihat CSV untuk detail lengkap)</span>':'';
  el.innerHTML='<b>Ringkasan Cache</b>'
    +'<br>Cache HIT: '+s.hit+'<br>Nulis baru: '+s.miss+'<br>Claude tanpa cache: '+s.noCache+'<br>Groq/Gemini (tidak ada cache): '+(s.nonClaude||0)
    +'<br>Rasio cache HIT (hanya panggilan Claude yang memakai cache): '+(hitRatePct===null?'belum ada data':hitRatePct+'%')
    +'<br>Input total: '+s.inTok.toLocaleString('id-ID')
    +'<br>Output total: '+s.outTok.toLocaleString('id-ID')
    +'<br>Biaya real (generate, termasuk foto): $'+mainUsd.toFixed(4)+' (≈Rp'+mainIdr.toLocaleString('id-ID')+', '+idrLabel+')'
    +'<br><br><b>Perbaikan jumlah kata (real):</b>'
    +'<br>Panggilan AI: '+fs.calls
    +'<br>Selesai di attempt: 1x='+fs.attemptHist[1]+', 2x='+fs.attemptHist[2]+', 3x='+fs.attemptHist[3]
    +' (dari '+totalFinished+' script/produk)'
    +'<br>Masih kurang kata walau sudah 3x: '+fs.stillShort
    +'<br>Token: '+fs.inTok.toLocaleString('id-ID')+' in / '+fs.outTok.toLocaleString('id-ID')+' out'
    +'<br>Biaya real: $'+fixUsd.toFixed(4)+' (≈Rp'+fixIdr.toLocaleString('id-ID')+', '+idrLabel+')'
    +'<br><br><b>TOTAL SEMUA BIAYA (selamanya, angka asli dari API):</b> $'+grandUsd.toFixed(4)+' (≈Rp'+grandIdr.toLocaleString('id-ID')+', '+idrLabel+')'
    +(estTokAll>0?'<br>Perkiraan tambahan output percobaan terputus (BUKAN angka resmi, terpisah dari total di atas): ~'+estTokAll.toLocaleString('id-ID')+' token ≈ $'+estUsdAll.toFixed(4)+'<br>Total termasuk perkiraan: $'+grandEstUsd.toFixed(4)+' (≈Rp'+Math.round(grandEstUsd*idr).toLocaleString('id-ID')+')':'')
    +((s.interrupted||0)>0?'<br><span style="opacity:0.65">'+s.interrupted+' percobaan generate terputus di tengah stream (Claude: input tercatat; Groq/Gemini: hanya perkiraan output, karena input baru dilaporkan di akhir stream).</span>':'')
    +'<br><br><b>Biaya per model (tarif tiap model, bukan model yang sedang dipilih):</b><br>'+modelHtml+unknownNote
    +'<br><br><b>Biaya per periode (dari riwayat):</b><br>'+periodHtml
    +'<br><br><b>Breakdown per jenis &amp; mode (dari riwayat):</b><br>'+modeHtml
    +'<br><br><b>Grafik biaya 14 hari terakhir:</b><div style="margin-top:6px;">'+_vbBuildUsageChartSvg(archiveData,logAll)+'</div>'
    +'<br><b>Riwayat per generate (terbaru dulu, tap buat lihat detail):</b><div style="margin-top:4px;">'+logHtml+'</div>'+logMoreNote+archiveNote
    +'<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">'
    +'<button type="button" id="pb-usage-export-btn" onclick="_vbExportUsageCsv()">Unduh CSV</button>'
    +'<button type="button" id="pb-usage-reset-btn" onclick="_vbResetUsageStats()">Reset Hitungan</button>'
    +'</div>';
}
// Toggle buka/tutup panel statistik di tab Panduan (dipanggil dari tombol
// "Lihat Statistik Biaya & Cache"). Label tombol ikut berubah jadi "Tutup
// ..." pas panel terbuka.
function _vbToggleUsagePanel(){
  var panel=document.getElementById('pb-usage-panel');
  var btn=document.getElementById('pb-usage-toggle-btn');
  if(!panel)return;
  var willShow=panel.classList.contains('hidden');
  panel.classList.toggle('hidden');
  if(willShow){
    _vbEnsureLiveIdrRate();
    _vbRenderUsageBadge(_vbLoadUsageStats());
  }
  if(btn)btn.innerHTML='<svg class="icon"><use href="#ic-sparkle"></use></svg> '+(willShow?'Tutup Statistik Biaya & Cache':'Lihat Statistik Biaya & Cache');
}
// Reset semua hitungan (dulu lewat dobel-klik/tap-tahan di badge melayang;
// sekarang tombol biasa di dalam panel, lebih jelas buat tap di HP).
// Reset juga mengosongkan arsip harian (permintaan user: "Reset Hitungan"
// artinya benar-benar nol lagi, bukan cuma riwayat mentahnya).
function _vbResetUsageStats(){
  _vbSaveUsageStats({hit:0,miss:0,noCache:0,nonClaude:0,interrupted:0,inTok:0,outTok:0,noCacheInTok:0,cacheWriteInTok:0,cacheReadInTok:0,byModel:{}});
  _vbSaveFixStats({calls:0,inTok:0,outTok:0,noCacheInTok:0,cacheWriteInTok:0,cacheReadInTok:0,attemptHist:{1:0,2:0,3:0},stillShort:0,byModel:{}});
  _vbSaveUsageLog([]); // ikut kosongkan riwayat mentah saat reset
  _vbSaveUsageArchive({}); // ikut kosongkan arsip harian saat reset
  // FIX BUG SINKRON: hapus field counter di CLOUD langsung (bukan increment
  // negatif) — supaya "Reset Hitungan" beneran nol di semua perangkat, tidak
  // cuma dikurangi sebesar kontribusi perangkat ini saja.
  if(typeof pbCloudResetCounter==='function'){
    pbCloudResetCounter(PB_USAGE_KEY);
    pbCloudResetCounter(PB_FIXSTATS_KEY);
    // FIX BUG (audit lanjutan, statistik biaya & cache): PB_USAGE_ARCHIVE_KEY
    // ikut direset di sini sekarang juga — sejak dipindah ke PB_COUNTER_SYNC_KEYS
    // (lihat _vbSaveUsageArchive), field cloud-nya perlu di-reset lewat jalur
    // counter yang sama, bukan cuma _vbSaveUsageArchive({}) di atas (yang
    // sekarang hanya kirim DELTA, bukan hapus total field lama).
    pbCloudResetCounter(PB_USAGE_ARCHIVE_KEY);
  }
  _vbRenderUsageBadge(_vbLoadUsageStats());
}
