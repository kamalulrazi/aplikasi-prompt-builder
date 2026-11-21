// fitur/video-sapaan-dan-perapian-teks.js — Video — hitung biaya model, sapaan, pembersih teks, batas jumlah kata.
// Bagian dari js/10-main-app.js lama (baris 16805–17266). Isi tidak diubah.
function _pbModelKeyOfId(id){
  for(var k in PB_AI_MODELS){if(PB_AI_MODELS[k].id===id)return k;}
  return '';
}
function _vbPriceModelKey(modelKey){
  return(modelKey&&PB_AI_MODELS[modelKey])?modelKey:VB_LEGACY_MODEL_KEY;
}
function _vbModelLabel(modelKey){
  if(modelKey&&PB_AI_MODELS[modelKey])return PB_AI_MODELS[modelKey].label;
  return 'Model tidak diketahui (dihitung tarif '+PB_AI_MODELS[VB_LEGACY_MODEL_KEY].label+')';
}
function _vbCalcUsd(noCacheTok,cacheWriteTok,cacheReadTok,outTok,modelKey){
  var _m=PB_AI_MODELS[_vbPriceModelKey(modelKey)]||{};
  var pin=_m.priceIn||HAIKU_PRICE_IN_PER_MTOK, pout=_m.priceOut||HAIKU_PRICE_OUT_PER_MTOK;
  return((noCacheTok||0)/1e6*pin)
    +((cacheWriteTok||0)/1e6*pin*HAIKU_PRICE_CACHE_WRITE_MULT)
    +((cacheReadTok||0)/1e6*pin*HAIKU_PRICE_CACHE_READ_MULT)
    +((outTok||0)/1e6*pout);
}
// PERKIRAAN OUTPUT PERCOBAAN TERPUTUS (audit biaya, 1 Okt 2026): kalau stream
// putus/timeout/error di tengah jalan, event akhir yang membawa output_tokens
// tidak pernah datang (output_tokens tercatat 0) padahal output adalah bagian
// termahal. Sebagai perkiraan KASAR dipakai panjang teks (+ teks thinking)
// yang sudah sempat mengalir ÷ VB_EST_CHARS_PER_TOKEN, dibatasi max_tokens.
// Ini batas-bawah (token yang sedang dibuat server tapi belum terkirim tidak
// terlihat) dan HANYA perkiraan — dicatat di field TERPISAH (outEstTok),
// tidak pernah dicampur ke angka asli. Cara Anthropic menagih stream yang
// terputus belum diverifikasi; cek tagihan resmi untuk angka pastinya.
var VB_EST_CHARS_PER_TOKEN=3.5;
function _vbEstInterruptedOutTok(usageInfo,textChars,thinkChars,maxTok){
  if(usageInfo&&usageInfo.output_tokens>0)return 0; // angka asli sudah ada, tidak perlu perkiraan
  var chars=(textChars||0)+(thinkChars||0);
  if(chars<=0)return 0;
  var est=Math.ceil(chars/VB_EST_CHARS_PER_TOKEN);
  if(maxTok>0)est=Math.min(est,maxTok);
  return est;
}
var USD_TO_IDR=16400; // kurs perkiraan, cuma buat tampilan kasar di badge
function _vbLoadFixStats(){
  try{
    var s=JSON.parse(localStorage.getItem(PB_FIXSTATS_KEY)||'null');
    if(s&&typeof s.calls==='number'){
      if(!s.byModel||typeof s.byModel!=='object')s.byModel={};
      return s;
    }
  }catch(e){}
  // calls = total panggilan AI perbaikan (semua attempt, semua produk/script)
  // attemptHist = distribusi berapa kali attempt dipakai sampai berhenti/pasrah
  // stillShort = berapa KALI berhenti masih di bawah rentang minimum walau
  //              sudah habis semua attempt (batas atas selalu 100% dijamin
  //              di luar ini oleh _vbHardEnforceMaxWords, jadi tidak dicatat)
  return{calls:0,inTok:0,outTok:0,noCacheInTok:0,cacheWriteInTok:0,cacheReadInTok:0,attemptHist:{1:0,2:0,3:0},stillShort:0,byModel:{}};
}
function _vbSaveFixStats(s){
  try{localStorage.setItem(PB_FIXSTATS_KEY,JSON.stringify(s));}catch(e){}
  // FIX BUG SINKRON (audit lanjutan, Sept 2026): sama seperti _vbSaveUsageStats
  // — pakai increment per-field (pbCloudQueueCounter), bukan timpa penuh.
  if(typeof pbCloudQueueCounter==='function')pbCloudQueueCounter(PB_FIXSTATS_KEY);
}
// Dipanggil sekali per PANGGILAN AI (bukan per attempt-loop selesai) dari
// dalam _vbFixWordCountIfNeeded/_vbFixWordCountBatchIfNeeded.
function _vbTrackFixCall(usage,meta){
  meta=meta||{};
  var mKey=_vbValidModelKey(meta.modelKey);
  var estOut=(meta.outEstTok>0)?meta.outEstTok:0;
  var s=_vbLoadFixStats();
  s.calls++;
  var tok={noCacheInTok:0,cacheWriteInTok:0,cacheReadInTok:0};
  var outTok=0;
  if(usage){
    tok.noCacheInTok=usage.input_tokens||0;
    tok.cacheWriteInTok=usage.cache_creation_input_tokens||0;
    tok.cacheReadInTok=usage.cache_read_input_tokens||0;
    outTok=usage.output_tokens||0;
    s.inTok+=tok.noCacheInTok+tok.cacheWriteInTok+tok.cacheReadInTok;
  }
  // Token datar (total semua model) + rincian per model + perkiraan output terputus.
  _vbBucketAddTokens(s,{noCacheInTok:tok.noCacheInTok,cacheWriteInTok:tok.cacheWriteInTok,cacheReadInTok:tok.cacheReadInTok,outTok:outTok,outEstTok:estOut,model:mKey});
  _vbSaveFixStats(s);
  // RIWAYAT (permintaan user, Sept 2026, "statistik sangat lengkap"): dulu
  // panggilan perbaikan kata TIDAK tercatat di riwayat per-panggilan (cuma
  // di total lifetime di atas) — sekarang ikut tercatat, jadi breakdown
  // per-tanggal/grafik/CSV juga mencakup biaya perbaikan kata, bukan cuma
  // biaya generate utama.
  _vbLogUsageEvent('fix',_vbCurrentCallMode,tok,outTok,{model:mKey,outEstTok:estOut,interrupted:!!meta.interrupted,chatMode:_vbUsageChatModeOverride});
  _vbRenderFixBadgeIfExpanded();
}
// Dipanggil sekali per SCRIPT/PRODUK setelah loop attempt berhenti (baik
// karena sudah pas, baik karena attempt habis) — buat catat di attempt
// keberapa berhentinya, dan apakah masih kurang kata pas berhenti.
function _vbTrackFixOutcome(attemptsUsed,stillShort){
  var s=_vbLoadFixStats();
  if(attemptsUsed>=1&&attemptsUsed<=4)s.attemptHist[attemptsUsed]=(s.attemptHist[attemptsUsed]||0)+1;
  if(stillShort)s.stillShort++;
  _vbSaveFixStats(s);
  _vbRenderFixBadgeIfExpanded();
}
function _vbRenderFixBadgeIfExpanded(){
  _vbRenderUsageBadge(_vbLoadUsageStats()); // no-op sendiri kalau panel lagi ditutup
}

// ── SANITIZER CTA — jaring pengaman KODE untuk frasa yang dilarang di
// prompt ("keranjang kuning", "checkout", klaim urgensi/kelangkaan dsb).
// Sebelumnya app 100% mengandalkan kepatuhan model AI ke instruksi teks di
// prompt saja — tidak ada validasi/perbaikan otomatis sesudahnya kalau
// modelnya "lupa" (lebih mungkin kejadian di model ringan seperti
// Flash-Lite). Fungsi ini jalan SETELAH AI membalas dan SEBELUM perbaikan
// jumlah kata — biar hitungan 25 kata di tahap berikutnya dihitung dari
// teks yang sudah bersih, bukan dihitung dulu baru disensor belakangan
// (yang bisa bikin jumlah katanya meleset lagi). Instruksi larangan di
// prompt TETAP dipertahankan apa adanya — ini cuma lapisan kedua, bukan
// pengganti. ──────────────────────────────────────────────────────────
const _VB_FORBIDDEN_PATTERNS=[
  // FIX: pola lama /keranjang\s+kuning/gi cuma kena kalau dua kata itu
  // BERDAMPINGAN LANGSUNG — AI kadang menyisipkan kata lain di antaranya
  // (mis. "keranjang berwarna kuning", "keranjang warna kuning", "keranjang
  // yang kuning") dan lolos begitu saja dari filter lama. Sekarang toleransi
  // sampai 3 kata sisipan (\w+\W+){0,3} di antara "keranjang" dan "kuning",
  // dan \W+ (bukan cuma \s+) supaya tanda baca di antaranya (koma dll) juga
  // tertangkap. Jangkauannya dibatasi 3 kata biar tidak kebablasan menyambung
  // ke "kuning" yang jauh/tidak berkaitan di kalimat lain.
  // FIX (Sept 2026): dulu boleh disisipi APA SAJA sampai 3 kata, jadi kalimat
  // sah seperti "keranjang di bawah, warna kuning cakep" ikut ditelan jadi
  // "keranjang bawah cakep". Sekarang sisipan dibatasi ke kata penghubung
  // warna saja (yang/berwarna/warna/warnanya/itu), sisanya dibiarkan.
  {re:/\bkeranjang\W+(?:(?:yang|berwarna|warna|warnanya|itu)\W+){0,2}kuning\b/gi, to:'keranjang bawah'},
  // FIX: pola lama /\bcheck[\s-]?out\b/gi TIDAK kena kalau "checkout" dapat
  // imbuhan Bahasa Indonesia yang nempel langsung tanpa spasi (mis.
  // "checkoutnya") — \b di akhir pola gagal karena 't' dan 'n' sama-sama
  // karakter kata jadi tidak dianggap "batas kata". Sekarang imbuhan umum
  // (-nya/-lah/-kan/-in) ditangkap sebagai grup terpisah & disambung lagi
  // ke hasil ganti, biar "checkoutnya" jadi "cek keranjang bawahnya", bukan
  // lolos apa adanya.
  {re:/\bcheck[\s-]?out(nya|lah|kan|in)?\b/gi, to:function(m,suf){return 'cek keranjang bawah'+(suf||'');}},
  {re:/\bstok\s+terbatas\b/gi, to:''},
  {re:/\bburuan\s+sebelum\s+kehabisan\b/gi, to:''},
  {re:/\bkehabisan\s+stok\b/gi, to:''},
  {re:/\bsegera\s+habis\b/gi, to:''},
  {re:/\bdiskon\s+(?:segera\s+)?berakhir\b/gi, to:''},
  {re:/\bpromo\s+(?:segera\s+)?berakhir\b/gi, to:''},
  // FIX (permintaan user): larangan diperluas — sebelumnya cuma menyensor
  // FRASA spesifik ("promo berakhir", "diskon berakhir" dkk), jadi kata
  // "promo"/"diskon"/"terbatas" yang berdiri sendiri (mis. "promo spesial
  // hari ini", "stok sangat terbatas", "edisi terbatas") masih lolos. Sekarang
  // kata-kata inti ini disensor SENDIRI tanpa perlu nempel ke frasa tertentu.
  {re:/\bpromo\w*\b/gi, to:''},
  {re:/\bdiskon\w*\b/gi, to:''},
  {re:/\bterbatas\b/gi, to:''},
  {re:/\blimited(\s+edition)?\b/gi, to:''}
];
// AUDIT Okt 2026: idiom urgensi dihapus UTUH (termasuk kata pengantarnya) supaya tidak menyisakan
// "Jangan sampai abaya ..." yang maknanya berubah; kata penguat di sekitar 'terbatas' ikut dibuang.
var _VB_FORBIDDEN_IDIOMS=[
  /\b(?:jangan\s+sampai|biar(?:\s+(?:ga|gak|nggak|tidak))?|sebelum)\s+(?:(?:kamu|kalian|kak)\s+)?kehabisan\s+stok\b/gi,
  /\bstok\s+(?:(?:sangat|banget|sekali|amat|super)\s+)?terbatas\b/gi,
  /\b(?:(?:sangat|amat|super|cuma|hanya)\s+)?terbatas(?:\s+(?:banget|sekali))?\b/gi
];
// v11.27 (5 Okt 2026): kata soal DEAL (voucher, kupon, cashback, gratis ongkir, flash sale) dulu lolos karena sanitizer
// cuma membuang promo*/diskon*. Membuang satu kata saja merusak kalimat ("buat ambil yang melimpah"), jadi yang dibuang
// adalah KLAUSA-nya: dari penghubung/koma terakhir sebelum kata deal sampai akhir kalimat. Kalau tidak ada klausa yang
// bisa dipotong rapi (sisa < 3 kata), seluruh kalimat dibuang. Kalau yang terbuang memuat ajakan "keranjang" dan sisanya
// tidak lagi memilikinya, ajakan pendek disambung lagi supaya CTA tidak kehilangan arahnya.
var _VB_DEAL_RE=/\b(?:voucher|kupon|coupon|cashback|(?:gratis|free|bebas)\s+ongkir|flash\s*sale)\w*/i;
function _vbStripDealTerms(text){
  if(!text||!_VB_DEAL_RE.test(text))return text;
  var parts=String(text).match(/[^.!?]+[.!?]*\s*/g)||[String(text)];
  var out=[],lostBasket=false;
  parts.forEach(function(sen){
    var m=_VB_DEAL_RE.exec(sen);
    if(!m){out.push(sen.trim());return;}
    if(/keranjang/i.test(sen.slice(m.index)))lostBasket=true;
    var head=sen.slice(0,m.index),re=/(,|\s(?:buat|untuk|biar|supaya|dan|plus|sambil|sama|ada)\s)/gi,last=-1,mm;
    while((mm=re.exec(head)))last=mm.index;
    var kept=last>=0?head.slice(0,last):'';
    kept=kept.replace(/[\s,;:]+$/,'');
    var tail=sen.slice(m.index).match(/[.!?]+\s*$/);
    if(kept.split(/\s+/).filter(Boolean).length>=3)out.push(kept+((tail&&tail[0].trim())||'.'));
  });
  var res=out.join(' ').replace(/\s{2,}/g,' ').trim();
  if(lostBasket&&!/keranjang/i.test(res))res=(res?res+' ':'')+'Cek keranjang bawah, ya.';
  return res;
}
function _vbSanitizeForbiddenPhrases(text){
  // v11.37: penyaring lokal dimatikan (sengaja). audit Okt 2026 (v11.85): sisa kode mati di bawah baris ini dihapus;
  // fungsi dipertahankan sebagai no-op karena masih dipanggil dari _vbSanitizeAI dan kolom manual. Ketikan manual TIDAK disaring.
  return text;
}

// v12.x: penyaring lokal keluaran AI (kata daerah lain, klaim absolut, kata tekanan, kata pengisi di akhir kalimat, tolak padding slang)
// sudah dimatikan sejak v11.37 dan sekarang DIHAPUS. Kata seperti gercep/cepetan tidak lagi disaring atau dilarang.
// Yang tetap berlaku: prompt perbaikan kata mengikuti logat terpilih (_vbFixSystemFor) dan aturan sisip frasa konkret (_padRule).
// Dipakai di SEMUA titik keluaran AI (generate, perbaikan kata). Ketikan manual user tidak disaring sama sekali (lihat catatan di _vbSanitizeForbiddenPhrases).
// v11.40 (5 Okt 2026): AI kadang menulis tanda kurung siku/biasa di dialog (mis. [bermotif bunga di atas meja]) atau menjiplak label [Image N].
// Label [Image N] dibuang total; tanda kurungnya saja dibuang, isinya dipertahankan supaya kalimat tetap utuh.
function _vbStripBrackets(text){
  return text; // pembersihan kurung & petunjuk panggung dimatikan (permintaan user, 12 Okt 2026)
}
function _vbSanitizeAI(text){
  return _vbStripBrackets(_vbSanitizeForbiddenPhrases(text));
}
var VB_FIX_WORDS_BY_LOGAT={
  'casual Jakarta accent':'Jakarta slang words (banget, sih, nih, dong, deh) and NEVER Javanese, Sundanese or Medan words (no atuh, pisan, euy, wis, tenan, bah)',
  'light Javanese accent':'light Javanese words (wis, ora, tenan) and NEVER Sundanese, Medan or Jakarta particles (no atuh, pisan, euy, bah, sih, nih, dong)',
  'light Sundanese accent':'light Sundanese words (teh, atuh, mah, pisan, teu, aya, naon, kumaha, nu) and NEVER Javanese, Medan or Jakarta particles (no wis, tenan, bah, sih, nih, dong)',
  'light Medan accent':'light Medan words (kali, lah, pulak, tengok, cemana, kek, dah, kau, kalen) and NEVER the word bah and NEVER Javanese, Sundanese, Malay (awak) or Jakarta particles (no wis, tenan, atuh, pisan, sih, nih, dong, deh, banget); no regional-language words (no lae, amang, inang, ito)',
  'light Malaysian accent':'light Malay words (tak, dah, je, lah, nak, jom, awak) and NEVER Javanese, Sundanese, Medan or Jakarta particles (no wis, tenan, atuh, pisan, bah, sih, nih, dong); avoid Malay false friends (butuh, percuma, bisa, kereta, budak)',
  'neutral standard accent':'plain casual Indonesian (udah, jadi, tapi) and NO regional words'
};
// Prompt perbaikan kata (dipakai oleh perbaikan terarah & perbaikan kependekan) dikunci ke logat terpilih.
// 20 Nov 2026: true = batch ini berisi produk dengan aksen BERBEDA dari wizard (Atur Mode Produk) -> kata khas jangan dikunci ke aksen wizard, ikut baris "Words:" tiap item.
var _vbFixMixed=false;
function _vbFixIsMixed(items){
  var g=(typeof VB!=='undefined'&&VB)?String(VB.accent||VB.accentLabel||'').trim():'';
  return (items||[]).some(function(it){return it&&it.acc&&it.acc!==g;});
}
function _vbFixWordsLine(it,mixed){
  if(!(mixed===undefined?_vbFixMixed:mixed))return '';
  var g=(typeof VB!=='undefined'&&VB)?String(VB.accent||VB.accentLabel||'').trim():'';
  var w=VB_FIX_WORDS_BY_LOGAT[(it&&it.acc)||g];
  return w?('\nWords: '+w):'';
}
function _vbFixSystemFor(base){
  var acc=(typeof VB!=='undefined'&&VB)?String(VB.accent||VB.accentLabel||'').trim():'';
  var W=VB_FIX_WORDS_BY_LOGAT[acc],out=String(base);
  if(_vbFixMixed)out=out.replace(/regional words \([^)]*\)/,"regional words exactly as in each item's Words line, never words from another region");
  else if(W)out=out.replace(/regional words \([^)]*\)/,W);
  // v11.25: kalimat lama "Inserted words must match the text's character: <slang>..." DIGANTI: tambahan = frasa konkret di tengah kalimat.
  var _padRule='To add words, INSERT ONE concrete phrase inside a sentence (a place, person, action or small scene detail that fits the context, in the same voice), never at the very end of the text. Never add fake stock urgency (stok terbatas). Do not invent or add product features, materials, textures, sizes, colors or claims that the text does not already state. Do not repeat a word already in the text. Stay in the text\'s accent'+(W&&/NEVER[\s\S]*$/.test(W)?'; '+W.match(/NEVER[\s\S]*$/)[0]:'')+'.';
  out=out.replace(/Inserted words must match the text's character:[\s\S]*?Keep it smooth and spoken\./,_padRule+' Keep it smooth and spoken.');
  out=out.replace(/Added words must carry the text's flavor:[\s\S]*?Write in Indonesian\./,_padRule+' Write in Indonesian.');
  return out;
}

// ── Auto-perbaikan jumlah kata: AI kadang tidak akurat pas diminta "TEPAT
// 25 kata" (wajar buat LLM). Kalau hasilnya meleset, panggil AI lagi khusus
// buat merapikan script itu jadi persis 25 kata, sampai maksimal 2x
// percobaan. Kalau tetap gagal, script asli/terakhir dikembalikan apa
// adanya (masih bisa diedit manual + label kata di UI kasih tanda). ──────
// Jaring pengaman DETERMINISTIK, TANPA panggilan API — jaminan bahwa jumlah
// kata TIDAK PERNAH melewati batas atas, apapun hasil AI-nya. Dipanggil di
// SETIAP jalur keluar dari _vbFixWordCountIfNeeded di bawah (termasuk saat
// gagal/limit/exception) supaya batas atas benar-benar pasti, bukan cuma
// "biasanya". Cari titik potong di akhir kalimat (. ! ?) dalam 6 kata
// terakhir sebelum batas max; kalau tidak ada, potong polos di kata ke-max
// lalu tutup dengan titik.
// FIX KUALITAS POTONGAN (permintaan user, Sept 2026): fungsi ini diperkuat
// dengan 3 lapis logika baru, SEMUA masih murni JavaScript lokal (TIDAK ADA
// panggilan API tambahan, tetap gratis & instan):
//   A) Radius pencarian titik/tanya/seru diperluas dari 6 jadi 10 kata ke
//      belakang dari batas `max` — makin besar peluang ketemu titik alami
//      sebelum jatuh ke "potong paksa".
//   B) Kalau dalam radius itu sama sekali tidak ada titik/tanya/seru, coba
//      dulu cari KOMA terdekat sebagai cadangan kedua (sebelum potong
//      paksa) — berhenti di koma jauh lebih enak dibaca daripada dipotong
//      di tengah frasa. Komanya diganti jadi titik.
//   C) Kalau tetap harus "potong paksa" (tidak ada titik MAUPUN koma dalam
//      radius), hindari berhenti tepat sesudah kata sambung/depan (mis.
//      "...yang.", "...untuk.") yang bikin kalimat kerasa menggantung —
//      mundur beberapa kata sampai ketemu kata yang bukan kata sambung.
// 22 Nov 2026 (permintaan user): isian dalam tanda kurung, mis. (kamera mendekat memperlihatkan bantal), TIDAK dihitung dalam rentang kata,
// tapi tetap ikut tertulis apa adanya di prompt. Pembantu di bawah dipakai semua penghitung kata skrip.
function _vbWcNoParen(t){return String(t||'').replace(/\([^()]*\)/g,' ').trim().split(/\s+/).filter(Boolean).length;}
function _vbMaskCues(t){
  var cues=[],txt=String(t||'').replace(/\([^()]*\)/g,function(m){cues.push(m);return '\u0001'+(cues.length-1)+'\u0001';});
  var only=txt.split(/\s+/).filter(function(w){return w&&w.replace(/\u0001\d+\u0001/g,'')==='';}).length;
  return {text:txt,cues:cues,cueOnly:only};
}
function _vbUnmaskCues(t,cues){return String(t||'').replace(/\u0001(\d+)\u0001/g,function(m,i){return cues[+i]!=null?cues[+i]:'';});}
// potong sampai maksimal `max` kata ucapan (isian kurung ikut tetap, tidak dihitung)
function _vbTruncSpoken(t,max){
  var m=_vbMaskCues(t),w=m.text.split(/\s+/).filter(Boolean),out=[],n=0;
  for(var i=0;i<w.length;i++){
    var spoken=w[i].replace(/\u0001\d+\u0001/g,'')!=='';
    if(spoken&&n>=max)break;
    if(spoken)n++;
    out.push(w[i]);
  }
  return _vbUnmaskCues(out.join(' '),m.cues);
}
function _vbHardEnforceMaxWords(text,max,min){
  text=(text||'').trim();
  if(!text)return text;
  if(/\([^()]*\)/.test(text)){
    var _m=_vbMaskCues(text);
    return _vbUnmaskCues(_vbHardEnforceMaxWordsCore(_m.text,max+_m.cueOnly,min?min+_m.cueOnly:min),_m.cues);
  }
  return _vbHardEnforceMaxWordsCore(text,max,min);
}
function _vbHardEnforceMaxWordsCore(text,max,min){
  text=(text||'').trim();
  if(!text)return text;
  let words=text.split(/\s+/).filter(Boolean);
  if(words.length<=max)return text;
  // FIX (Sept 2026): hasil potongan dulu bisa menyisakan tanda kutip ganda
  // yang tidak berpasangan (mis. `... "e.`) dan koma/titik dua di ujung yang
  // jadi ",." setelah ditutup titik. Rapikan keduanya.
  function _tidy(t){
    if(((t.match(/"/g)||[]).length)%2===1)t=t.replace(/"/g,'');
    return t;
  }
  const RADIUS=10;
  // AUDIT Okt 2026: titik potong tidak boleh jatuh di bawah min (range.min) kalau diberikan
  const LO=(min&&min>0&&min<max)?min:Math.max(1,max-RADIUS);
  // (A) Cari titik/tanya/seru alami dalam radius.
  for(let i=max;i>=LO;i--){
    if(/[.!?]$/.test(words[i-1]))return _tidy(words.slice(0,i).join(' '));
  }
  // (B) Tidak ketemu titik/tanya/seru — coba cari KOMA terdekat, ganti jadi titik.
  for(let i=max;i>=LO;i--){
    if(/,$/.test(words[i-1]))return _tidy(words.slice(0,i).join(' ').replace(/,$/,''))+'.';
  }
  // (C) Tetap tidak ketemu — potong paksa di kata ke-`max`, tapi hindari
  // berhenti tepat sesudah kata sambung/depan (mundur sampai 6 kata).
  const CONNECTOR_WORDS=['yang','dan','atau','untuk','dengan','karena','biar','supaya','tapi','tetapi','namun','saat','ketika','ke','di','dari','pada','oleh','agar','sambil','sebab','kalau','kalo','kayak','seperti','sama','buat','sebagai','tanpa','walau','walaupun','meski','meskipun','jadi','lalu','terus','trus','juga','biar','makin'];
  function _isConnector(w){
    let clean=(w||'').toLowerCase().replace(/["'.,!?;:…]+$/,'');
    return CONNECTOR_WORDS.indexOf(clean)!==-1;
  }
  let cutAt=max;
  for(let i=max;i>=Math.max(LO,max-6);i--){
    if(!_isConnector(words[i-1])){cutAt=i;break;}
  }
  return _tidy(words.slice(0,cutAt).join(' ').replace(/[,;:\-–—\s]+$/,''))+'.';
}
// PRESET TARGET AUDIENCE — opsi cepat berupa chip di atas field Target
// Audience (id 'vb-bulk-target'). PERMINTAAN USER (Sept 2026): klik chip
// TIDAK LAGI mengisi teks ke kolom (kolom tetap kosong secara visual) —
// chip cuma jadi status "terpilih" (VB_TA_PRESET, per inputId), dan nilai
// presetnya baru dipakai SAAT GENERATE, hanya kalau kolom memang kosong
// (lihat pemakaiannya di vbBulkMainAction). Kalau user ketik manual di
// kolom, itu yang menang (dikirim apa adanya) — lihat oninput di HTML
// (vbBulkTargetInput) yang otomatis membatalkan pilihan chip begitu user
// mulai mengetik, supaya status "terpilih"-nya tidak nyangkut kelihatan
// aktif padahal isi kolom sudah beda.
var VB_TARGET_AUDIENCE_PRESETS={
  'genz-perempuan':'Gen Z women',
  'bunda-bunda':'bunda' // permintaan user (11 Okt 2026): kirim apa adanya "bunda", tanpa tambahan apa pun
};
// Label yang tampil ke user (toast & ringkasan). HANYA tampilan, tidak dikirim ke AI.
var VB_TARGET_AUDIENCE_LABELS={'genz-perempuan':'Gen Z Perempuan','bunda-bunda':'Bunda-bunda'};
var VB_TA_PRESET={};
// FITUR BARU: sapaan ke penonton (opsional). Disimpan global supaya SEMUA
// jalur generate/regenerate/revisi/lanjutkan yang lewat _vbCallBulkBatch
// otomatis ikut memakainya. Kosong = Claude bebas memilih sapaan sendiri.
var VB_SAPAAN='';
var VB_SAPAAN_FROM_CHIP=false; // true = sapaan dipilih dari chip (boleh di-reset otomatis kalau aksen diganti); false = ketikan sendiri (dibiarkan)
// SAPAAN PER AKSEN (permintaan user, 5 Okt 2026): chip sapaan mengikuti aksen yang dipilih di step Aksen.
// pr = pasangan kata ganti yang diminta ke AI: 'gl' = gue/lo, 'ak' = aku/kamu, 'au' = aku/kau (Medan), 'aw' = saya/awak (Malaysia).
var VB_SAPAAN_BY_LOGAT={
  'neutral standard accent':[['kak','ak'],['kalian','ak'],['teman-teman','ak'],['semuanya','ak']],
  'casual Jakarta accent':[['guys','gl'],['gaes','gl'],['bestie','gl'],['bro','gl'],['sis','gl']],
  'light Javanese accent':[['kak','ak'],['mbak','ak'],['mas','ak'],['sedulur','ak'],['lur','ak']],
  'light Sundanese accent':[['kak','ak'],['teteh','ak'],['akang','ak'],['sobat','ak'],['dulur','ak']],
  'light Medan accent':[['bang','au'],['kak','ak'],['dek','au'],['kelen','au'],['kawan','au'],['bro','au'],['bos','au']],
  'light Malaysian accent':[['korang','aw'],['geng','aw'],['kawan-kawan','aw'],['abang','aw'],['adik','aw'],['semua','aw']]
};
function _vbSapaanList(){
  var acc=(typeof VB!=='undefined'&&VB)?String(VB.accent||VB.accentLabel||'').trim():'';
  return VB_SAPAAN_BY_LOGAT[acc]||VB_SAPAAN_BY_LOGAT['neutral standard accent']; // logat tulis-sendiri/kosong -> daftar netral
}
// Pasangan kata ganti untuk sapaan terpilih ('' = tidak ditentukan, mis. sapaan tulis-sendiri).
function _vbSapaanPronoun(val){
  var v=String(val||'').trim().toLowerCase();
  if(!v)return '';
  if(/\bkak(?:ak)?\b/.test(v))return 'ak';
  var hit='';
  var cur=(typeof VB!=='undefined'&&VB)?String(VB.accent||VB.accentLabel||'').trim():'';
  var keys=Object.keys(VB_SAPAAN_BY_LOGAT);
  if(VB_SAPAAN_BY_LOGAT[cur])keys=[cur].concat(keys.filter(function(k){return k!==cur;})); // aksen yang sedang dipilih dicek dulu
  keys.forEach(function(k){
    VB_SAPAAN_BY_LOGAT[k].forEach(function(it){if(!hit&&it[0]===v&&!(it[1]==='aw'&&cur!=='light Malaysian accent'))hit=it[1];}); // sapaan Malaysia (korang, adik, ...) hanya memicu saya/awak kalau aksennya Malaysia
  });
  return hit;
}
function vbToggleSapaan(){
  let b=document.getElementById('vb-sapaan-body'),t=document.getElementById('vb-sapaan-toggle'),c=document.getElementById('vb-sapaan-chev');
  if(!b)return;
  let open=b.classList.toggle('hidden')===false;
  if(t)t.setAttribute('aria-expanded',open?'true':'false');
  if(c)c.textContent=open?'▴':'▾';
  try{fFitWbody(b);}catch(_e){}
}
// Ringkasan pilihan sapaan di sebelah judul, supaya tetap kelihatan walau bagian ini ditutup.
function _vbSapaanSumSync(){
  let e=document.getElementById('vb-sapaan-sum');
  if(e)e.textContent=VB_SAPAAN?('· '+VB_SAPAAN):'';
}
function vbRenderSapaanChips(){
  try{
    var wrap=document.getElementById('vb-sapaan-chips');
    if(!wrap)return;
    var list=_vbSapaanList(),keep=false;
    // sapaan hasil chip yang tidak ada di daftar aksen baru -> reset; ketikan sendiri tidak disentuh
    if(VB_SAPAAN&&VB_SAPAAN_FROM_CHIP){
      list.forEach(function(it){if(it[0]===VB_SAPAAN)keep=true;});
      if(!keep){VB_SAPAAN='';VB_SAPAAN_FROM_CHIP=false;}
    }
    _vbSapaanSumSync();
    wrap.innerHTML='';
    list.forEach(function(it){
      var d=document.createElement('div');
      d.className='chip'+((VB_SAPAAN&&VB_SAPAAN_FROM_CHIP&&VB_SAPAAN===it[0])?' sel':'');
      d.textContent=it[0];
      d.onclick=function(){vbPickSapaan(it[0],d);};
      wrap.appendChild(d);
    });
  }catch(e){console.warn('[vbRenderSapaanChips]',e);}
}
function vbPickSapaan(val,el){
  let wrap=document.getElementById('vb-sapaan-chips');
  let inp=document.getElementById('vb-sapaan-input');
  let already=(VB_SAPAAN===val&&el&&el.classList.contains('sel'));
  if(wrap)wrap.querySelectorAll('.chip').forEach(function(c){c.classList.remove('sel');});
  if(already){VB_SAPAAN='';VB_SAPAAN_FROM_CHIP=false;_vbSapaanSumSync();return;}
  VB_SAPAAN=val;VB_SAPAAN_FROM_CHIP=true;
  if(el)el.classList.add('sel');
  if(inp)inp.value='';
  _vbSapaanSumSync();
}
function vbSapaanInput(el){
  VB_SAPAAN=String(el.value||'').replace(/[\r\n"]+/g,' ').trim();VB_SAPAAN_FROM_CHIP=false;
  _vbSapaanSumSync();
  let wrap=document.getElementById('vb-sapaan-chips');
  if(wrap&&el.value.length>0)wrap.querySelectorAll('.chip').forEach(function(c){c.classList.remove('sel');});
}
function vbResetSapaan(){
  VB_SAPAAN='';VB_SAPAAN_FROM_CHIP=false;
  let inp=document.getElementById('vb-sapaan-input'); if(inp)inp.value='';
  let wrap=document.getElementById('vb-sapaan-chips');
  if(wrap)wrap.querySelectorAll('.chip').forEach(function(c){c.classList.remove('sel');});
  vbRenderSapaanChips(); // VB sudah direset (aksen kosong) -> chip kembali ke daftar netral
}
function vbPickTargetAudiencePreset(inputId,presetKey,el){
  if(!VB_TARGET_AUDIENCE_PRESETS[presetKey]) return;
  let field=document.getElementById(inputId);
  let already=VB_TA_PRESET[inputId]===presetKey;
  if(el)el.parentElement.querySelectorAll('.chip').forEach(c=>c.classList.remove('sel'));
  if(already){
    delete VB_TA_PRESET[inputId];
    if(typeof showToast==='function') showToast('Preset '+(VB_TARGET_AUDIENCE_LABELS[presetKey]||presetKey)+' dibatalkan','success');
    return;
  }
  VB_TA_PRESET[inputId]=presetKey;
  if(el)el.classList.add('sel');
  if(field)field.value='';
  if(typeof showToast==='function') showToast('Target audience: '+(VB_TARGET_AUDIENCE_LABELS[presetKey]||presetKey)+' dipakai (kolom tetap kosong)','success');
}
// Dipanggil dari oninput kolom Target Audience — begitu user mulai
// ngetik manual, preset chip yang mungkin lagi aktif dibatalkan otomatis
// supaya tidak dobel/ambigu dengan teks yang baru diketik.
function vbBulkTargetInput(inputId,el){
  if(VB_TA_PRESET[inputId]){
    delete VB_TA_PRESET[inputId];
    let wrap=el.parentElement&&el.parentElement.previousElementSibling;
    if(wrap)wrap.querySelectorAll('.chip').forEach(c=>c.classList.remove('sel'));
  }
}

// FIX HEMAT BIAYA (permintaan user, Sept 2026): parameter cacheSystem baru
// (default true) — dikirim ke _vbStreamClaudeJSONWithRetry supaya bisa
// dimatikan KHUSUS untuk panggilan REVISI (vbRevisiProdukAI &
// vbRevisiSingleAI, yang mengirim cacheSystem=false). Revisi biasanya
// cuma dipanggil SEKALI per produk (dibatasi juga di sisi UI, lihat
// vbRevisiProdukAI), jadi cache_control di sana cuma akan kena
// cache_creation (+25%) tanpa PERNAH sempat kena cache_read (diskon 90%)
// — percuma dan malah nambah biaya, makanya dicabut khusus di jalur ini.
// Generate bulk pertama & "Generate Ulang Semua" TIDAK disentuh (tetap
// cacheSystem=true default) karena di situ ada banyak panggilan
// berurutan dalam <5 menit yang beneran saling kena cache HIT.
// FIX HEMAT TOKEN (permintaan user, Sept 2026, "gabungkan optimasi 1-produk
// penuh ke jalur Bulk"): system prompt RINGKAS ini dulu cuma dibangun inline
// di dalam vbGenerate3AI() (jalur "single" lama yang sekarang jadi kode
// mati, sudah tidak ada pintu masuknya di UI). Sekarang diekstrak jadi
// fungsi murni (cuma butuh `range`, tidak ada dependensi lain) supaya bisa
// dipakai lagi oleh _vbCallBulkBatch() setiap kali batch cuma berisi 1
// produk — menggantikan _vbBulkSystemPrompt yang jauh lebih panjang (17
// poin aturan vs 7 poin di sini) yang sebelumnya SELALU terpakai apa pun
// jumlah produknya. Isi teksnya TIDAK diubah sama sekali dari versi asli
// vbGenerate3AI, cuma dipindah ke sini.
// ATURAN SAPAAN (5 Okt 2026): cara memakai baris Greeting di DATA + pasangan kata ganti sesuai sapaan/aksen terpilih.
function _vbSapaanRule(){
  var g=(typeof VB_SAPAAN==='string')?VB_SAPAAN.replace(/[\r\n"]+/g,' ').trim():'';
  if(!g)return '';
  var pr=_vbSapaanPronoun(g);
  var r=' GREETING: if DATA has a Greeting, use it exactly as written as a mid-sentence address (never the first word of the HOOK), at most once per part and in at most two parts.';
  if(pr==='gl')r+=' Speak with gue/lo, never aku/kamu.';
  else if(pr==='au')r+=' Speak with aku/kau, never gue/lo/gw.';
  else if(pr==='ak')r+=' Speak with aku/kamu, never gue/lo/gw.';
  else if(pr==='aw')r+=' Speak with saya/awak, never gue/lo/gw or aku/kamu.';
  return r;
}
