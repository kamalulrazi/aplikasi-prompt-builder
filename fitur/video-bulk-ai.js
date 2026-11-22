// fitur/video-bulk-ai.js — Video — mode Bulk AI: generate banyak produk sekaligus.
// Bagian dari js/10-main-app.js lama (baris 20474–21654). Isi tidak diubah.
async function _vbCallBulkBatch(batch,targetAudience,extraNote,onWait,onPartial,usedHooks,cacheSystem,totalProdukInSesi,fixShort){
  if(cacheSystem===undefined)cacheSystem=true;
  // FIX BUG BIAYA (laporan user, Sept 2026 — "generate 3 produk sekaligus
  // kok gak kena cache diskon 90%"): parameter baru totalProdukInSesi —
  // jumlah produk ASLI di seluruh AKSI generate ini (satu sesi bisa terdiri
  // dari BEBERAPA panggilan _vbCallBulkBatch/batch), bukan cuma jumlah
  // produk di batch/panggilan API INI saja. AKAR MASALAHNYA: "mode hemat"
  // (system prompt pendek 7-poin & TANPA cache) dulu ditentukan MURNI dari
  // batch.length===1 — padahal _vbBuildPhotoAwareBatches (lihat definisinya)
  // MEMAKSA tiap produk yang punya foto referensi jadi batch sendiri isi 1
  // (supaya tidak 413). Akibatnya generate Bulk 3 produk yang KETIGANYA
  // pakai foto referensi diam-diam terpecah jadi 3 panggilan API terpisah
  // yang MASING-MASING salah dikira "single produk" walau totalnya tetap 3
  // — makanya cache_control tidak pernah dipasang (diskon 90% hilang) DAN
  // system prompt yang kepakai jadi versi pendek, bukan versi Bulk 17-poin
  // yang sudah sengaja diperpanjang supaya tembus syarat minimum cache.
  // Sekarang "mode hemat" ditentukan dari totalProdukInSesi (dikirim apa
  // adanya oleh pemanggil loop — _vbRunBulkGenerate & vbRegenerateAllBulk —
  // dan diteruskan tanpa berubah lewat pemecahan otomatis 413 di bawah),
  // BUKAN batch.length lagi. Kalau pemanggil tidak mengirim parameter ini
  // (jalur revisi 1 produk yang genuinely single: vbRevisiProdukAI,
  // vbRevisiSingleAI, dkk — lihat pemanggil masing-masing), default-nya
  // balik ke batch.length supaya perilaku jalur-jalur itu SAMA SEKALI tidak
  // berubah (tetap system prompt pendek & tanpa cache, memang sudah benar).
  if(totalProdukInSesi===undefined)totalProdukInSesi=batch.length;
  let _vbSingleProdukInThisCall=(totalProdukInSesi===1);
  // Prompt caching (system prompt digemukkan ~6.766 token biar lolos
  // syarat minimum cache Haiku 4.5) sudah dihapus — sejak 1 sesi = 1
  // panggilan API, caching tidak pernah kepakai lagi. cacheSystem
  // dipaksa false karena system prompt yang dipakai sekarang (versi
  // ringkas _vbBuildSingleModeSystemPrompt) memang tidak di-cache.
  cacheSystem=false;
  // FIX HEMAT TOKEN (Opsi 2, lanjutan — permintaan user "cek statistik
  // biaya & cache"): label mode di riwayat statistik ("Single" vs "Bulk")
  // sekarang ikut mengikuti totalProdukInSesi di atas (BUKAN batch.length
  // panggilan ini) — jadi generate Bulk 3 produk-bersama-foto yang tiap
  // panggilannya kebetulan cuma 1 produk tetap tercatat jujur sebagai
  // "Bulk", bukan "Single" yang menyesatkan. Ini MURNI soal label/pencatatan
  // (dibaca _vbLogUsageEvent buat kolom "Mode" di riwayat/CSV).
  _vbCurrentCallMode=_vbSingleProdukInThisCall?'single':'bulk';
  // LOG RIWAYAT (permintaan user, Sept 2026, "biaya foto per-generate"):
  // catat jumlah produk & jumlah foto di PANGGILAN INI saja (bisa beda dari
  // total 1 sesi kalau sesi itu dipecah jadi beberapa batch) — dibaca
  // _vbTrackUsage lewat _vbCurrentCallProdukCount/_vbCurrentCallFotoCount.
  _vbCurrentCallProdukCount=batch.length;
  _vbCurrentCallFotoCount=batch.filter(function(p){return!!(p&&p.fotoBase64);}).length;
  let range=vbGetWordRange();
  // Tandai produk yang punya foto referensi dengan nomor urut gambar
  // (Gambar 1, Gambar 2, dst — cuma dihitung dari produk yang benar-benar
  // punya foto, urut sesuai posisinya di batch ini) supaya AI tahu foto
  // mana punya produk yang mana waktu beberapa gambar dikirim sekaligus.
  let _imgCounter=0;
  const _maxImgThisCall=_pbMaxImages(); // FIX: label [Image N] & lampiran foto dibatasi sesuai batas model (Groq 3 / Gemini 16)
  
  const _vbIsRev=typeof extraNote==='string'&&extraNote.trim()!==''&&extraNote.indexOf('OFF-TOPIC RETRY')!==0; // revisi (catatan REVISION, dengan/tanpa skrip lama): contoh yang sama dipakai lagi per produk; retry skrip nyasar tetap pakai contoh baru (audit 13 Nov 2026)
  const _vbRefPlan=batch.length>1?_vbPlanReferences(batch.length):[_vbPickReferenceIdx()];
  batch.forEach(function(p,i){var mk=_vbRefMemoKey(p.nama),m=_vbRefMemo[mk];if(_vbIsRev&&m!=null&&_vbRefOpts()[m])_vbRefPlan[i]=m;else _vbRefMemo[mk]=_vbRefPlan[i];}); // contoh referensi diacak per produk (dalam 1 panggilan); 25 Okt 2026: dipasang lagi dengan label 'TONE SAMPLE' + kalimat 'contoh nada saja, bukan topik'
  let produkListText=batch.map((p,i)=>{
    let line=(i+1)+'. '+_vbCleanField(p.nama,160)+(p.keunggulan?' — advantages: '+_vbCleanField(p.keunggulan,400):'')+(p.topik?' — STORY focus: '+_vbCleanField(p.topik,400):'');
    // FITUR BARU (permintaan user): gaya HOOK per produk dari "Atur Detail" di
    // form Bulk. HANYA gaya Hook yang dikirim ke AI — kolom "Isi" (teks
    // overlay) sengaja TIDAK disertakan di sini, itu cuma ditempel di akhir
    // prompt video (lihat _vbOverlaySentence).
    let _hookDir=_vbHookDirectiveInline(p.hookType,p.hookCustom);
    if(_hookDir)line+=' — HOOK style: '+_hookDir;
    if(p.pitch)line+=' — Tone: '+(p.pitch==='bercanda'?'joking':p.pitch);
    if(p.accent)line+=' — Accent: '+_vbAccentScriptText(p.accent);
    if(_vbRefPlan&&batch.length>1&&_vbRefOpts()[_vbRefPlan[i]])line+=' — SAMPLE: '+_vbRefOpts()[_vbRefPlan[i]].nama+' (structure and style only, never its topic or claims)';
    if(p.fotoBase64&&_imgCounter<_maxImgThisCall){
      _imgCounter++;
      line+=' [Image '+_imgCounter+']';
    }
    return line;
  }).join('\n');
  // FIX (permintaan user, Sept 2026): dulu di sini ada instruksi contoh gaya
  // bahasa panjang per pilihan nada bicara ("Misterius"/"Bercanda"/"Heboh")
  // dan per pilihan aksen ("Formal"/"Santai"/"Gaul-Kekinian"). Sekarang
  // pilihan nada bicara & aksen di UI disederhanakan jadi cuma 1 opsi
  // masing-masing (nada: "Bercanda", aksen: "Hangat & Ekspresif" / "warm
  // and expressive") — instruksi contoh per-opsi itu sudah tidak relevan lagi,
  // jadi dihapus semua. Label nada & aksen yang dipilih user (atau diisi
  // manual lewat "tulis sendiri") tetap dikirim apa adanya ke AI di bawah.
  //
  // Bagian yang beda-beda tiap generate (produk/karakter/target audience/
  // catatan revisi/hook yang sudah dipakai) — dikirim sebagai pesan user.
  let _sapaanVal=(typeof VB_SAPAAN==='string'?VB_SAPAAN.replace(/[\r\n"]+/g,' ').trim():'');
  // Motion karakter (VB.motion) TIDAK dikirim ke AI penulis skrip (permintaan user, 3 Okt 2026) - hanya dipakai di prompt video (_vbBuildFlowText).
  let _toneVal=String(VB.pitch||VB.pitchLabel||'').trim();
  if(_toneVal==='bercanda')_toneVal='joking'; // preset chip -> English (custom text tetap apa adanya)
  // DIPADATKAN (30 Sep 2026): label ditulis Inggris (lebih hemat token); isi data user tetap apa adanya.
  let prompt='Character: '+(VB.gender||VB.genderLabel)+', age '+(VB.age||VB.ageLabel)+'\n'
    +(_vbIsDua()?'Off-screen voice (heard only, never visible; teenage, about 15): '+_vbOffOpposite(VB.gender==='male'?'male':'female')+'\n':'')
    +(_sapaanVal?'Greeting: '+_sapaanVal+'\n':'')
    +'Tone: '+_toneVal+'\n'
    +'Accent: '+_vbAccentScriptText(VB.accent||VB.accentLabel)+'\n'
    +(targetAudience?'Audience: '+_vbCleanField(targetAudience,300)+'\n':'')+'\n'
    +'Products ('+batch.length+'):\n'+produkListText+'\n'
    +(extraNote?'\nREVISION (top priority): '+String(extraNote).slice(0,2500)+'\n':'')
    +(usedHooks&&usedHooks.length?'\nAlready-used HOOKs (do not repeat; write a different angle that still fits and does not feel forced):\n'+usedHooks.map(function(h){return'- '+String(h).split(/\s+/).slice(0,10).join(' ');}).join('\n')+'\n':'');

  // Bagian gambar dikirim terpisah dari teks (format multimodal Gemini),
  // urutannya SAMA seperti "Gambar N" yang disebut di produkListText di atas.
  let _hasPV=batch.some(function(p){return p.pitch||p.accent;});
  let _promptParts=[{text:'DATA\n'+prompt+(_hasPV?'\nNOTE: a product line with its own Tone or Accent uses that for its script instead of the global Tone/Accent above.':'')+'\nREMINDER: each script is ONLY about its own product in the list above, and the product name must be said in HOOK or STORY. The sample is about a different product: follow its structure and style only.\nWrite '+batch.length+' script'+(batch.length>1?'s':'')+' now. Output the JSON array only.'}]; // audit Okt 2026: DATA user pindah dari system prompt ke pesan user
  let _imgAttached=0;
  batch.forEach(function(p){
    if(p.fotoBase64&&_imgAttached<_maxImgThisCall){
      _imgAttached++;
      _promptParts.push({inline_data:{mime_type:p.fotoMime||'image/jpeg',data:p.fotoBase64}});
    }
  });

  // REAL-TIME: pakai streamGenerateContent supaya hook/story/cta tiap
  // produk di batch ini bisa muncul kata-per-kata ke UI lewat onPartial
  // (kalau disediakan pemanggil) — sama seperti mode single, hasil
  // streaming ini cuma PREVIEW. Retry/fallback thinkingConfig tetap sama
  // persis seperti sebelumnya, dibungkus di _vbStreamClaudeJSONWithRetry.
  let _vbEffectiveSystemPrompt=_vbIsDua()?_vbBuildDuaSystemPrompt(range,batch.length,VB.accent||VB.accentLabel,VB.pitch||VB.pitchLabel,VB.gender||VB.genderLabel,_vbOffOpposite(VB.gender==='male'?'male':'female'),VB.age||VB.ageLabel,_vbRefPlan):_vbBuildSingleModeSystemPrompt(range,batch.length,VB.accent||VB.accentLabel,VB.pitch||VB.pitchLabel,VB.gender||VB.genderLabel,VB.age||VB.ageLabel,_vbRefPlan);
  // BUG FIX KRITIS (audit Sept 2026, lihat catatan lengkap di deklarasi
  // cfg.maxOutputTokens di _vbStreamClaudeJSONWithRetryModel): batch
  // sekarang bisa berisi sampai 30 produk dalam 1 panggilan API — jatah
  // token keluaran WAJIB ikut membesar, bukan tetap 6144. Estimasi per
  // produk: 3 bagian (HOOK/STORY/CTA) x maksimal range.max kata, dikali
  // ~2 token/kata (jaga-jaga tokenisasi Bahasa Indonesia + gaya bahasa
  // gaul) ditambah overhead struktur JSON (~40 token/object) — dibulatkan
  // ke atas & dikasih dasar 1000 token buat pembuka/penutup JSON array.
  // Tetap tidak boleh di bawah 6144 (perilaku lama utk batch kecil tidak
  // berubah) dan dibatasi 8192 (batas keluaran default Claude tanpa
  // header beta output panjang) sebagai jaring pengaman.
  let _vbDynamicMaxTokens=Math.min(16000,Math.max(6144,batch.length*(range.max*3*3+60)+1500)); // audit Okt 2026: 3 token/kata (Indonesia) + batas 16000 (model mendukung jauh lebih besar)
  let{resp,rawText,netDown}=await _vbGenerateWithFallback(_promptParts,onPartial,onWait,_vbEffectiveSystemPrompt,cacheSystem,_vbDynamicMaxTokens); // v11.2: Gemini -> Haiku -> Groq kalau gagal
  console.log('[vbGenerateBulkAI batch] status:',resp.status,'panjang respons:',rawText.length); // audit Okt 2026 (v11.85): isi respons tidak lagi dicetak ke console
  if(!resp.ok){
    let errJson={};try{errJson=JSON.parse(rawText);}catch(e){}
    // FIX RETRY TANPA BATAS: pesan di bawah ini sekarang cuma muncul kalau
    // sudah dicoba ulang TERUS-MENERUS selama ~3 menit (jaring pengaman
    // MAX_TOTAL_WAIT_MS di _vbFetchWithRetry) dan tetap gagal — bukan lagi
    // setelah 3x percobaan singkat seperti dulu, jadi pesannya diubah biar
    // jujur soal kemungkinan penyebabnya.
    // FIX (audit 413 — "Request Entity Too Large"): status ini artinya
    // SATU request ke Groq melebihi limit token/menit organisasi (bukan
    // error yang bisa hilang sendiri dengan nunggu/retry biasa seperti
    // 429/503 — request ini memang KEBESARAN, jadi mengulang persis sama
    // pasti gagal lagi). Kalau batch ini isinya lebih dari 1 produk,
    // otomatis dipecah jadi 2 batch lebih kecil dan masing-masing dicoba
    // ulang sendiri-sendiri (rekursif, sampai akhirnya batch isi 1 kalau
    // memang masih kebesaran) — hasilnya digabung lagi supaya pemanggil
    // tidak perlu tahu ada pemecahan otomatis ini sama sekali.
    if(resp.status===413){
      if(batch.length>1){
        let mid=Math.ceil(batch.length/2);
        let firstHalf=batch.slice(0,mid),secondHalf=batch.slice(mid);
        console.warn('[_vbCallBulkBatch] status 413 (request kebesaran) dengan '+batch.length+' produk sekaligus — otomatis dipecah jadi 2 batch lebih kecil ('+firstHalf.length+' + '+secondHalf.length+' produk) dan dicoba ulang.');
        let r1=await _vbCallBulkBatch(firstHalf,targetAudience,extraNote,onWait,onPartial,usedHooks,cacheSystem,totalProdukInSesi);
        // FIX (audit — kehilangan hasil + biaya dobel saat auto-split 413):
        // r1 di titik ini SUDAH berhasil & sudah kena biaya nyata di
        // Anthropic. Sebelumnya kalau r2 gagal/melempar error (mis. kena
        // 429/503 sampai habis retry, atau 413 lagi), r1 ikut hilang total
        // karena fungsi ini keburu throw sebelum sempat return apa pun —
        // padahal pemanggil (_vbRunBulkGenerate/vbRegenerateAllBulk) punya
        // pola "selamatkan progress sebisa mungkin" (lihat catch block
        // masing-masing) yang seharusnya bisa memakai r1 ini kalau saja
        // sempat diteruskan. Sekarang error dari r2 ditangkap di sini, r1
        // (digabung dengan err.partialResults milik r2 sendiri kalau r2
        // tadi sempat kepecah lagi jadi 413 berlapis & punya hasil
        // sebagian) dilampirkan ke error itu lewat properti
        // partialResults, lalu error yang SAMA tetap dilempar ulang —
        // pemanggil tetap tahu ada kegagalan (pesan error tidak berubah),
        // tapi sekarang bisa menyelamatkan r1 lewat err.partialResults
        // alih-alih diam-diam kehilangannya.
        let r2;
        try{
          r2=await _vbCallBulkBatch(secondHalf,targetAudience,extraNote,onWait,onPartial,usedHooks,cacheSystem,totalProdukInSesi);
        }catch(errSplit){
          // v11.85: hasil sebagian milik paruh kedua punya _bi relatif ke secondHalf — geser sebesar firstHalf.length (sama seperti jalur sukses
          // di bawah), kalau tidak _vbAssignIdx di pemanggil menempelkan nomor produk yang SALAH.
          let _p2=Array.isArray(errSplit.partialResults)?errSplit.partialResults:[];
          _p2.forEach(function(o){if(o&&o._bi!=null)o._bi+=firstHalf.length;});
          let salvaged=r1.concat(_p2);
          errSplit.partialResults=salvaged;
          throw errSplit;
        }
        r2.forEach(function(o){if(o&&o._bi!=null)o._bi+=firstHalf.length;});
        let mergedSplit=r1.concat(r2);
        // audit Okt 2026 (v11.85): panggilan rekursif menimpa penghitung statistik global (jumlah produk/foto) dengan milik paruh
        // terakhir — kembalikan ke nilai batch ASLI sebelum perbaikan kata gabungan dicatat ke statistik.
        _vbCurrentCallMode=_vbSingleProdukInThisCall?'single':'bulk';
        _vbCurrentCallProdukCount=batch.length;
        _vbCurrentCallFotoCount=batch.filter(function(p){return!!(p&&p.fotoBase64);}).length;
        if(fixShort)await _vbApplyShortFix(mergedSplit,(mergedSplit.length&&mergedSplit.every(function(o){return o&&o._bi!=null;}))?mergedSplit.map(function(o){return batch[o._bi];}):batch,range,onWait,{system:_vbEffectiveSystemPrompt,text:(_promptParts&&_promptParts[0]&&_promptParts[0].text)||''});
        return mergedSplit;
      }
      throw new Error('Data yang dikirim kebesaran (413) walau cuma 1 produk — penyebabnya bisa foto referensi produk ini terlalu berat, atau teks "keunggulan"/"arah pembahasan" produk ini kepanjangan. Coba upload ulang fotonya (atau hapus dulu fotonya), persingkat teks keunggulan/arah pembahasan, lalu generate lagi.');
    }
    if(resp.status===503||resp.status===529)throw new Error('Server sedang padat (kode '+resp.status+'). Aplikasi sudah mencoba ulang otomatis'+(_pbFallbackActive()?' (termasuk ke server cadangan)':'')+' tapi belum berhasil. Coba lagi beberapa saat lagi.');
    if(resp.status===429)throw new Error('Server menolak karena terlalu banyak permintaan (kode 429). Aplikasi sudah mencoba ulang otomatis'+(_pbFallbackActive()?' (termasuk ke server cadangan)':'')+' tapi masih ditolak. Aplikasi tidak bisa memastikan apakah ini batas sesaat atau batas harian. Coba lagi nanti.');
    if(resp.status===0)throw new Error(await _pbExplainStatus0(rawText,netDown));
    if(_vbIsRegionBlock403(resp.status,rawText)){var _e403=new Error(_vbRegionBlockMsg());_e403.toastMsg='Koneksi ke server ditolak (403). Ganti jaringan (WiFi ↔ data seluler), lalu tekan Lanjutkan.';throw _e403;}
    var _authQuotaMsg=_pbWorkerAuthQuotaMsg(resp.status,errJson);
    if(_authQuotaMsg)throw new Error(_authQuotaMsg);
    console.warn('[_vbCallBulkBatch] error dari server (status '+resp.status+'): '+(errJson?.error?.message||rawText.substring(0,150)||'(kosong)'));throw new Error('Terjadi kendala di server kami (kode '+resp.status+'). Coba lagi sebentar lagi.');
  }
  // FIX KONSISTENSI PENANGANAN ERROR: sebelumnya JSON.parse(rawText) di sini
  // TIDAK dibungkus try/catch lokal — beda dengan hampir semua JSON.parse
  // lain di file ini yang selalu punya fallback/pesan spesifik. Kalau Google
  // pernah membalas status 200 (resp.ok true) tapi body-nya BUKAN JSON valid
  // (jarang, tapi bisa terjadi kalau ada proxy/jaringan yang memotong
  // respons), sebelumnya error mentah JS ("Unexpected token...") yang
  // muncul ke user lewat catch di pemanggil — bukan pesan ramah bahasa
  // Indonesia seperti kasus error lain di fungsi ini. Sekarang dikasih
  // pesan yang konsisten dengan gaya error lain di bawah.
  let data;
  try{data=JSON.parse(rawText);}catch(eParse){
    throw new Error('Respons dari server tidak bisa dibaca (bukan format yang diharapkan). Coba tap ulang.');
  }
  if(data.error){console.warn('[_vbCallBulkBatch] data.error dari server: '+(data.error.message||'(tanpa pesan)'));throw new Error('Server kami sedang bermasalah. Coba tap ulang.');}
  let text=(data.candidates?.[0]?.content?.parts?.[0]?.text||'').trim();
  let finishReason=data.candidates?.[0]?.finishReason||'';
  // v11.67 (9 Okt 2026): Claude menutup stream dengan stop_reason 'refusal' (Groq/Gemini: 'content_filter') kalau AI menolak
  // menjawab. Itu BUKAN error server dan mengulang dengan teks yang sama hampir pasti ditolak lagi, tapi dulu jatuh ke pesan
  // generik "Respons kosong" / "belum bisa dibaca" (token tetap terpakai) sehingga user mengira server bermasalah.
  if(finishReason==='refusal'||finishReason==='content_filter'){console.warn('[_vbCallBulkBatch] AI menolak/menyaring jawaban (finishReason: '+finishReason+')');throw new Error('AI menolak membuat skrip untuk isi ini. Biasanya karena kata-kata di nama produk, keunggulan, atau arah pembahasan. Ubah atau persingkat teksnya dulu, lalu generate lagi — mengulang tanpa mengubah teks hampir pasti ditolak lagi.');}
  if(!text){console.warn('[_vbCallBulkBatch] respons kosong (finishReason: '+(finishReason||'unknown')+')');throw new Error('Respons dari server kosong. Coba lagi.');}
  text=text.replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
  // BUG FIX (Sept 2026 — "Gagal baca hasil AI" padahal kredit sudah kepakai):
  // Claude kadang membalas JSON yang isi string-nya mengandung karakter
  // kontrol MENTAH (newline/tab sungguhan, bukan \n/\t ter-escape) — paling
  // sering muncul kalau dialognya panjang/ada jeda kalimat. JSON.parse()
  // menolak TOTAL karakter kontrol mentah di dalam string literal ("Bad
  // control character in string literal"), dan fallback potong-substring di
  // bawah pun ikut gagal karena sumber masalahnya sama. Padahal isi teksnya
  // sendiri valid & lengkap (bukan soal token habis). _vbSanitizeJsonText
  // meng-escape karakter kontrol itu HANYA kalau posisinya di dalam tanda
  // kutip string JSON (bukan di luar, supaya newline/spasi pemisah antar
  // token JSON yang memang valid tidak ikut diutak-atik).
  text=_vbSanitizeJsonText(text);
  let arr;
  try{arr=JSON.parse(text);}catch(e1){
    let s=text.indexOf('['),en=text.lastIndexOf(']');
    if(s!==-1&&en!==-1&&en>s){try{arr=JSON.parse(text.substring(s,en+1));}catch(e2){arr=null;}}
    if(!arr){
      // FIX MIGRASI GROQ: finishReason 'MAX_TOKENS' itu penamaan Gemini — Groq (OpenAI-compatible)
      // membalas 'length' untuk kasus kehabisan token, jadi cek lama TIDAK PERNAH match sejak
      // pindah provider dan pesan spesifik ini gak pernah muncul (jatuh ke pesan generik di bawah).
      if(finishReason==='length'||finishReason==='MAX_TOKENS'){
        // audit Okt 2026: selamatkan produk yang sudah lengkap (mode strict: objek terakhir ikut selamat kalau memang utuh)
        let _salv=_vbTryParsePartialJsonArray(text,true);
        _salv=Array.isArray(_salv)?_salv.filter(function(o){return o&&o.hook&&(_vb16()||o.story)&&o.cta;}):[];
        if(_salv.length){arr=_salv;console.warn('[_vbCallBulkBatch] terpotong — diselamatkan '+_salv.length+' produk lengkap.');}
      }
      if(!arr&&(finishReason==='length'||finishReason==='MAX_TOKENS'))throw new Error('Respons terpotong sebelum selesai — coba tap ulang.');
      if(!arr){console.warn('[_vbCallBulkBatch] gagal baca hasil: '+text.substring(0,150));throw new Error('Hasil dari server belum bisa dibaca — coba tap ulang.');}
    }
  }
  if(!Array.isArray(arr)||arr.length===0)throw new Error('Hasil belum berhasil dibuat, coba lagi.');
  if(_vb16())arr.forEach(function(o){if(o&&typeof o==='object')o.story='';}); // 16 detik: slot Story selalu kosong (Hook+Story ada di 'hook')
  if(_vbIsDua())arr.forEach(function(o){if(o&&typeof o==='object'){o.hook=_vbDuaNorm(o.hook);o.cta=_vbDuaNorm(o.cta);}}); // Percakapan 2 Suara: 4 baris dialog per prompt

  // FIX BUG (ditemukan saat audit mendalam khusus builder video — akar
  // masalah BUG#16/BUG#8 yang lama): backfill nama produk yang hilang dari
  // hasil AI SEBELUMNYA dilakukan di pemanggil (vbGenerateBulkAI /
  // vbRegenerateAllBulk), SETELAH fungsi ini selesai — artinya (1) prompt
  // perbaikan jumlah kata di bawah ini kehilangan konteks nama produk kalau
  // field "produk" kosong (dikirim string kosong '', jadi instruksi "untuk
  // produk X" tidak pernah disertakan), dan (2) backfill itu murni
  // berdasarkan POSISI index tanpa pengaman: kalau AI men-drop SATU produk
  // di TENGAH batch (bukan di akhir — sudah diantisipasi oleh komentar
  // BUG#8 lama tapi belum pernah benar-benar ditambal), hasil yang selamat
  // bisa ketiban nama produk LAIN yang salah karena index-nya ikut geser.
  // Sekarang backfill dipindah ke SINI (sebelum perbaikan kata) dan HANYA
  // dijalankan kalau jumlah hasil PERSIS SAMA dengan jumlah yang diminta di
  // batch ini — kondisi itu satu-satunya keadaan di mana asumsi "index hasil
  // = index diminta" benar-benar aman. Kalau jumlahnya beda (ada yang
  // di-drop), field "produk" yang kosong dibiarkan kosong (pemanggil sudah
  // punya fallback aman "Produk N") daripada diam-diam menempelkan nama
  // yang salah ke produk yang salah.
  //
  // FIX BUG FOTO KETUKAR ANTAR PRODUK MIRIP (laporan user, mis. 3 produk
  // "Tas" / "Abaya" / "Abaya Warna Pink" — hasil produk ke-3 malah kepasang
  // foto "Abaya" biasa): sebelumnya baris di bawah cuma mengisi field
  // "produk" kalau AI membalikkannya KOSONG (!arr[bi].produk) — padahal
  // prompt di atas MEMANG SENGAJA menyuruh AI menulis ulang nama produk
  // pakai bahasa natural sendiri, BUKAN menyalin apa adanya. Akibatnya nama
  // yang ditulis ulang AI itu (mis. "Abaya Warna Pink" disingkat AI jadi
  // cuma "Abaya") tetap terpakai persis sebagai field "produk" — dan kalau
  // hasil tulis-ulang itu KEBETULAN sama persis dengan nama produk LAIN di
  // batch/sesi yang sama (mis. memang ada produk lain bernama "Abaya"),
  // pencocokan foto per produk di _vbRenderBulkOutput (lewat
  // _vbBuildProductMetaLookup, yang mencocokkan berdasarkan NAMA) jadi
  // salah comot foto milik produk lain itu — bukan hasil AI ngasal, tapi
  // tabrakan nama yang tidak sengaja. Sekarang field "produk" SELALU
  // dipaksa balik ke nama ASLI dari input user (batch[bi].nama) setiap kali
  // posisi hasil sudah dijamin aman (arr.length===batch.length, sama
  // seperti syarat backfill lama) — bukan cuma saat kosong — supaya nama
  // tulis-ulang AI tidak pernah bisa bertabrakan/salah comot foto produk
  // lain lagi. Ini juga sekaligus bikin header tiap kartu hasil di layar
  // menampilkan nama PERSIS seperti yang kamu ketik, bukan versi tulis
  // ulang AI.
  let _byNo=false;
  arr.forEach(function(o){if(o&&typeof o.no==='string'&&/^\d+$/.test(o.no))o.no=parseInt(o.no,10);});
  if(batch.length>1&&arr.every(function(o){return o&&Number.isInteger(o.no)&&o.no>=1&&o.no<=batch.length;})&&new Set(arr.map(function(o){return o.no;})).size===arr.length){
    arr.sort(function(a,b){return a.no-b.no;});
    arr.forEach(function(o){o._bi=o.no-1;o.produk=batch[o._bi].nama;});
    _byNo=true;
  }
  arr.forEach(function(o){if(o&&'no' in o)delete o.no;});
  if(_byNo){
    // sudah dicocokkan lewat nomor produk — aman walau ada yang di-drop / urutan tertukar
  }else if(arr.length===batch.length){
    for(let bi=0;bi<arr.length;bi++){
      if(batch[bi])arr[bi].produk=batch[bi].nama;
    }
  }else{
    console.warn('[_vbCallBulkBatch] jumlah hasil ('+arr.length+') beda dari jumlah diminta ('+batch.length+') — backfill nama produk by-index dilewati demi mencegah nama salah tempel ke produk lain.');
  }

  // PERBAIKAN SKRIP KEPENDEKAN (permintaan user, 29 Sep 2026): HANYA kalau pemanggil
  // meminta (fixShort=true: generate bulk, plus revisi/regenerate satu produk sejak 12 Okt 2026 supaya kelebihan kata diperpendek AI, bukan dipotong kode).
  // 25 Okt 2026 (audit): pengaman skrip nyasar (lihat _vbOffTopicWords). Dibuat ulang SEKALI, hanya untuk produk yang nyasar.
  try{
    if(!(typeof extraNote==='string'&&extraNote.indexOf('OFF-TOPIC RETRY')===0)){
      let _offIdx=[],_offProd=[];
      for(let oi=0;oi<arr.length;oi++){
        let _bp=_byNo?batch[arr[oi]&&arr[oi]._bi]:(arr.length===batch.length?batch[oi]:null);
        if(_bp&&arr[oi]&&_vbOffTopicWords(arr[oi],_bp,extraNote).length){_offIdx.push(oi);_offProd.push(_bp);}
      }
      if(_offIdx.length){
        console.warn('[_vbCallBulkBatch] '+_offIdx.length+' skrip menyebut produk contoh referensi — dibuat ulang sekali.');
        let _saveMode=_vbCurrentCallMode,_savePC=_vbCurrentCallProdukCount,_saveFC=_vbCurrentCallFotoCount;
        try{
          let _rr=await _vbCallBulkBatch(_offProd,targetAudience,'OFF-TOPIC RETRY: the previous draft talked about another product. Write ONLY about the product on each line of the list, using its own name and its own daily problem.'+(extraNote?' '+String(extraNote):''),onWait,undefined,usedHooks,cacheSystem,totalProdukInSesi);
          (_rr||[]).forEach(function(o,j){
            if(!o||!o.hook||(!_vb16()&&!o.story)||!o.cta)return;
            let k=(o._bi!=null?o._bi:j),t=arr[_offIdx[k]];
            if(!t||!_offProd[k])return;
            if(_vbOffTopicWords(o,_offProd[k],extraNote).length)return; // masih nyasar: pakai hasil lama apa adanya
            t.hook=o.hook;t.story=o.story;t.cta=o.cta;
          });
        }catch(eOff){console.warn('[_vbCallBulkBatch] regenerasi skrip nyasar dilewati:',eOff);}
        _vbCurrentCallMode=_saveMode;_vbCurrentCallProdukCount=_savePC;_vbCurrentCallFotoCount=_saveFC;
      }
    }
  }catch(eGuard){console.warn('[_vbCallBulkBatch] pengaman skrip nyasar dilewati:',eGuard);}
  try{_vbDraftPush(arr,_byNo);}catch(_eDp){} // skrip AI sudah masuk -> kotak skrip muncul & langsung tampil (cepat), perbaikan kata menyusul real-time
  if(fixShort)await _vbApplyShortFix(arr,_byNo?arr.map(function(o){return batch[o._bi];}):batch,range,onWait,{system:_vbEffectiveSystemPrompt,text:(_promptParts&&_promptParts[0]&&_promptParts[0].text)||''});

  for(let pi=0;pi<arr.length;pi++){
    let prod=arr[pi];
    // Sanitizer jalan DULU (jaring pengaman kode), baru perbaikan jumlah
    // kata — biar 25 kata dihitung dari teks yang sudah bersih.
    if(prod.hook)prod.hook=_vbSanitizeAI(prod.hook);
    if(prod.story)prod.story=_vbSanitizeAI(prod.story);
    if(prod.cta)prod.cta=_vbSanitizeAI(prod.cta);
    // FIX HEMAT BIAYA (permintaan user, Sept 2026 — "generate banyak produk
    // sekaligus juga jangan ada perbaikan kata lagi"): panggilan API
    // terpisah "Perbaikan Kata" (_vbFixWordCountBatchIfNeeded) SEKARANG
    // DIMATIKAN TOTAL untuk SEMUA jalur — baik batch 1 produk (mode hemat
    // lama) MAUPUN batch/sesi berisi 2+ produk (mode Bulk penuh, dulu masih
    // lewat _vbFixWordCountBatchIfNeeded). Sebelumnya cuma mode 1-produk
    // yang dimatikan (lihat histori git kalau perlu balikin), karena
    // _vbBuildSingleModeSystemPrompt maupun _vbBulkSystemPrompt DUA-DUANYA
    // sudah menyuruh AI menghitung & merevisi jumlah katanya sendiri sebelum
    // menjawab (poin "WAJIB HITUNG KATA SENDIRI" di masing-masing system
    // prompt) — jadi panggilan fix tambahan ini sekarang dianggap tidak
    // perlu lagi buat SEMUA mode, bukan cuma mode hemat 1-produk. Jaring
    // pengaman yang tersisa MURNI lokal/JS (_vbHardEnforceMaxWords, potong
    // ke titik kalimat alami kalau kelebihan kata) — TANPA panggilan API
    // apapun, berlaku sama rata untuk 1 produk maupun banyak produk.
    // Fungsi _vbFixWordCountBatchIfNeeded SENGAJA tidak dihapus (lihat
    // definisinya) — dibiarkan sebagai referensi kalau suatu saat perlu
    // diaktifkan lagi, sama seperti pola *_FULL_DISABLED lain di file ini.
    // (12 Okt 2026, permintaan user) potong lokal DIMATIKAN: kelebihan kata diperbaiki AI (_vbApplyShortFix), bukan dipotong kode.
  }
  return arr;
}

// (v11.85) _vbBuildPhotoAwareBatches dihapus — tidak dipakai sejak semua produk digabung per panggilan (lihat VB_MAX_PRODUK_PER_CALL).

// ===== PERBAIKAN AUDIT (Okt 2026) — helper baru =====
var VB_MAX_PRODUK_PER_CALL=15; // 1 panggilan untuk <=15 produk (contoh referensi diacak per produk di dalam panggilan itu); >15 dipecah supaya 1 kegagalan tidak menghanguskan semuanya
function _vbCleanField(s,max){
  s=String(s==null?'':s).replace(/[\r\n\t]+/g,' ').replace(/["`]+/g,"'").replace(/\s{2,}/g,' ').trim();
  return s.length>max?s.slice(0,max):s;
}
function _vbNoteWithOldScript(note,scripts){
  // audit Okt 2026 (v11.85): catatan kosong (user cuma ubah nama/keunggulan) → JANGAN tempel skrip lama dengan instruksi
  // "change only what the note asks" (tidak ada yang diminta diubah, AI bisa mengembalikan skrip yang sama persis).
  // Kembalikan note apa adanya supaya produk digenerate ulang segar memakai nama/keunggulan terbaru.
  if(!String(note||'').trim())return '';
  if(!Array.isArray(scripts))return note;
  const L=['HOOK','STORY','CTA'];
  const old=L.map(function(l,i){const t=_vbCleanField(_vbIsDua()?String(scripts[i]||'').replace(/\s*\r?\n+\s*/g,' || '):(scripts[i]||''),600);return t?l+': '+t:'';}).filter(Boolean).join('\n');
  if(!old)return note;
  return note+'\n\nCURRENT SCRIPT (change only what the note asks):\n'+old;
}
function _vbOtherHooks(idx){
  const out=[];
  for(let k=0;k<60;k++){
    const el=document.getElementById('vb-bulk-script-'+(k*3));
    if(!el)break;
    if(k!==idx){const t=(el.value||'').trim();if(t)out.push(t);}
  }
  return out.slice(-8);
}
function _vbHardEnforceCta(text,max,min){
  text=(text||'').trim();
  if(!text)return text;
  const W=function(t){return t.split(/\s+/).filter(Boolean);};
  const cap=function(t){return t?t.charAt(0).toUpperCase()+t.slice(1):t;};
  if(_vbWcNoParen(text)<=max)return text;
  const m=text.match(/([^.!?]*keranjang[^.!?]*[.!?]?)\s*$/i);
  if(!m)return _vbHardEnforceMaxWords(text,max,min);
  let head=text.slice(0,text.length-m[0].length).trim(),tail=m[1].trim();
  // AUDIT Okt 2026: kalau CTA satu kalimat panjang (ekor = hampir seluruh teks), dulu 'keranjang bawah'
  // ikut terpotong. Sekarang ekor dipersempit: anak kalimat terakhir yang memuat 'keranjang', lalu (kalau
  // tanpa koma) jendela ±4 kata di sekitar kata 'keranjang' — ekor ini SELALU dipertahankan.
  if(W(tail).length>max-4){
    const parts=tail.split(/,\s*/);let k=parts.length-1;
    while(k>0&&!/keranjang/i.test(parts[k]))k--;
    if(k>0){head=(head+' '+parts.slice(0,k).join(', ')).trim();tail=cap(parts.slice(k).join(', '));}
  }
  if(W(tail).length>max-4){
    const w=W(tail);let ix=w.length-1;while(ix>0&&!/keranjang/i.test(w[ix]))ix--;
    let a=Math.max(0,ix-4);const b=Math.min(w.length,ix+7);
    // audit Okt 2026 (v11.85): jendela dulu bisa mulai di tengah frasa ("Penuh jadi buruan klik keranjang bawah..."). Kalau ada kata pembuka
    // ajakan (jadi/buruan/yuk/langsung/klik/cek...) dalam 6 kata sebelum 'keranjang', mulai dari situ — asal ekor tetap muat di jatah kata.
    for(let q=Math.max(0,ix-6);q<=ix;q++){
      if(/^(jadi|buruan|yuk|ayo|langsung|segera|klik|cek|tap|jangan|makanya|pokoknya)$/i.test(w[q].replace(/[^A-Za-z]/g,''))){
        if(b-q<=max-4)a=q;
        break;
      }
    }
    head=(head+' '+w.slice(0,a).join(' ')).trim();
    tail=cap(w.slice(a,b).join(' ').replace(/[,;:\s]+$/,''));
    if(!/[.!?]$/.test(tail))tail+='.';
  }
  tail=cap(tail);
  if(!/[.!?]$/.test(tail))tail=tail.replace(/[,;:\s]+$/,'')+'.'; // audit Okt 2026 (v11.85): ekor CTA selalu berakhir tanda baca
  const tw=W(tail).length;
  if(!head)return tail;
  let h=_vbHardEnforceMaxWords(head,max-tw,min?Math.max(1,min-tw):undefined);
  if(!/[.!?]$/.test(h))h=h.replace(/[,;:\s]+$/,'')+'.';
  return (h+' '+tail).trim();
}
// Setelah batch dikelompokkan per target audience, urutan hasil bisa beda dari urutan produk di form.
// Kembalikan ke urutan asli (lewat _idx) — hanya kalau SEMUA hasil punya _idx, supaya aman.
function _vbSortByIdx(arr){
  if(!arr||!arr.length||!arr.every(function(o){return o&&o._idx!=null;}))return arr;
  return arr.map(function(o,k){return{o:o,k:k};}).sort(function(a,b){return (a.o._idx-b.o._idx)||(a.k-b.k);}).map(function(x){return x.o;});
}
function _vbAssignIdx(arr,items){
  if(arr.length&&arr.every(function(o){return o&&o._bi!=null&&items[o._bi];})){
    arr.forEach(function(o){o._idx=items[o._bi].idx;});
  }else if(arr.length===items.length){
    arr.forEach(function(o,j){o._idx=items[j].idx;});
  }
  arr.forEach(function(o){if(o)delete o._bi;});
}

async function vbGenerateBulkAI(){
  if(_vbGuardGenerating()){showToast('Tunggu proses sebelumnya selesai dulu.','error');return;} // audit Okt 2026: cek SEBELUM VB_BULK_PRODUCTS ditimpa
  let errBox=document.getElementById('vb-bulk-error');
  errBox.classList.add('hidden');errBox.innerHTML='';

  if(!VB.gender||!VB.age||!VB.pitch||!VB.accent){
    showToast('Lengkapi dulu step Jenis Kelamin, Usia, Gaya Bicara, dan Aksen ya','error');
    return;
  }
  let countInput=document.getElementById('vb-bulk-count');
  let count=parseInt(countInput.value,10)||document.getElementById('vb-bulk-rows').children.length||0;
  if(count<1||count>30){showToast('Tentukan dulu jumlah produknya (1-30)','error');return;}

  let produkList=[];
  for(let i=0;i<count;i++){
    if(window.pbPmSkip&&window.pbPmSkip(i))continue;
    let namaEl=document.getElementById('vb-bulk-nama-'+i);
    let keunggulanEl=document.getElementById('vb-bulk-keunggulan-'+i);
    let topikEl=document.getElementById('vb-bulk-topik-'+i);
    let nama=namaEl?namaEl.value.trim():'';
    if(!nama){
      showToast('Nama Produk '+(i+1)+' belum diisi','error');
      if(namaEl){try{vbInfoTab('produk');}catch(_e){}namaEl.focus();}
      return;
    }
    let cachedFoto=VB_BULK_ROW_CACHE[i]||{};
    let hookCustomEl=document.getElementById('vb-bulk-hook-custom-'+i);
    let overlayEl=document.getElementById('vb-bulk-overlay-'+i);
    let taRowEl=document.getElementById('vb-bulk-ta-'+i);
    produkList.push({ta:(taRowEl?taRowEl.value:'').replace(/[\r\n"]+/g,' ').trim(),nama:nama,keunggulan:keunggulanEl?keunggulanEl.value.trim():'',topik:topikEl?topikEl.value.trim():'',
      hookType:cachedFoto.hookType||'',hookCustom:hookCustomEl?hookCustomEl.value.trim():(cachedFoto.hookCustom||''),
      overlay:overlayEl?overlayEl.value.trim():(cachedFoto.overlay||''),
      pitch:((window.pbPmVoice&&window.pbPmVoice(i))||{}).pitch||'',accent:((window.pbPmVoice&&window.pbPmVoice(i))||{}).accent||'',
      fotoBase64:cachedFoto.fotoBase64||'',fotoMime:cachedFoto.fotoMime||''});
  }
  let targetAudience=document.getElementById('vb-bulk-target').value.trim();
  // Kolom kosong tapi chip preset lagi aktif (VB_TA_PRESET, lihat
  // vbPickTargetAudiencePreset) → pakai nilai presetnya. Kalau user sudah
  // ketik manual, itu yang menang (kolom tidak pernah kosong+preset aktif
  // barengan, sudah dibatalkan otomatis lewat vbBulkTargetInput).
  if(!targetAudience && VB_TA_PRESET['vb-bulk-target']){
    targetAudience=VB_TARGET_AUDIENCE_PRESETS[VB_TA_PRESET['vb-bulk-target']]||'';
  }
  if(!targetAudience){
    // Kolom default kosong: boleh, asalkan SETIAP produk punya target audience sendiri.
    if(produkList.length>0&&produkList.every(function(p){return !!p.ta;})){
      targetAudience=produkList[0].ta; // cadangan saja, tidak dipakai karena semua produk punya sendiri
    }else{
      showToast('Target Audience wajib diisi dulu (di tab Penonton, atau isi khusus di tiap produk)','error');try{vbInfoTab('penonton');}catch(_e){}document.getElementById('vb-bulk-target').focus();return;
    }
  }
  VB.bulkTargetAudience=targetAudience;
  // v11.26: peringatan (tidak memblokir) kalau karakter di bawah 20 tahun tapi target audiens ibu/mama. Skrip jadi ngaco
  // (karakter remaja bicara soal "anak"-nya sendiri). Saran: naikkan umur karakter atau ganti target audiens.
  try{
    var _wAge=+((String(_vbCharVal(0,'age')||'').match(/\d+/)||[0])[0]);
    var _wTeenWord=/teen|remaja|child|anak/i.test(String(_vbCharVal(0,'age')||''));
    if(((_wAge>0&&_wAge<20)||_wTeenWord)&&/\b(ibu|mama|bunda|moms?|mother|istri|emak)\b/i.test(targetAudience)){
      showToast('Umur karakter di bawah 20 tapi target audiens ibu-ibu. Skrip bisa terasa janggal; pertimbangkan umur 25+ atau ganti target.','error');
    }
  }catch(eWarn){}
  VB_BULK_PRODUCTS=produkList.map(function(p){return{ta:p.ta||'',nama:p.nama,keunggulan:p.keunggulan,topik:p.topik,hookType:p.hookType||'',hookCustom:p.hookCustom||'',overlay:p.overlay||'',pitch:p.pitch||'',accent:p.accent||'',fotoBase64:p.fotoBase64,fotoMime:p.fotoMime};});

  // FIX (audit — sisa jalur API-key lama): dua blok "if(!VAI.apiKey)" yang
  // sebelumnya ada di sini (coba baca API key Gemini lama dari localStorage,
  // lalu buka modal API key kalau tetap kosong) dihapus. VAI.apiKey sekarang
  // SELALU diisi placeholder tetap 'via-proxy' sejak deklarasi (lihat
  // `var VAI={apiKey:'via-proxy',...}` di atas) dan tidak pernah dikosongkan
  // di mana pun di file ini — jadi `!VAI.apiKey` TIDAK PERNAH true, blok ini
  // memang tidak pernah jalan (bukan cuma jarang). Autentikasi request yang
  // sesungguhnya sekarang lewat X-Device-Id/X-Firebase-Token ke server
  // proxy, bukan API key di browser lagi.

  // FITUR BARU (permintaan user): generate BARU dari awal selalu buang
  // dulu sisa sesi "Lanjutkan" lama kalau ada (mis. user ganti-ganti isi
  // form lagi) — supaya vbBulkResumeAI() tidak pernah jalan dengan data
  // basi dari sesi produk yang berbeda.
  VB_BULK_LAST_CONTEXT=null;
  _vbSyncBulkMainButton();
  _pbAutoVideoSessionStart(produkList); // v18.2: generate baru dengan produk sama = sesi sama; produk beda = sesi baru
  let toProcess=produkList.map(function(p,idx){return{p:p,idx:idx};});
  await _vbRunBulkGenerate(produkList,targetAudience,toProcess,[]);
}

// FITUR BARU (permintaan user): kalau bulk generate berhenti di tengah
// jalan (macet/limit/error apa pun) dan sebagian produk sudah berhasil,
// fungsi ini melanjutkan HANYA untuk produk yang namanya BELUM ada di
// hasil sejauh ini (VB_BULK_LAST_CONTEXT.allResults) — script yang sudah
// jadi tidak diminta ulang ke AI dan tidak ditimpa.
async function vbBulkResumeAI(){
  let ctx=VB_BULK_LAST_CONTEXT;
  if(!ctx){showToast('Tidak ada proses yang bisa dilanjutkan — generate dari awal ya.','error');return;}
  if(_vbGuardGenerating()){showToast('Tunggu proses sebelumnya selesai dulu.','error');return;}
  // FIX (lihat komentar lengkap di _vbRunBulkGenerate, dekat pemberian
  // _idx): dulu produk "sudah selesai" dicek CUMA lewat teks field "produk"
  // (nama yang AI tulis ulang sendiri, gampang beda dari p.nama asli) — jadi
  // produk yang sebenarnya sudah beres bisa ikut dikirim ULANG ke AI di
  // sini. Sekarang diutamakan idx GLOBAL yang pasti benar (doneIdx); nama
  // (doneNames) cuma fallback utk hasil langka yang tidak kebagian _idx.
  let doneIdx={},doneNames={};
  ctx.allResults.forEach(function(r){
    if(r._idx!=null)doneIdx[r._idx]=true;
    else doneNames[(r.produk||'').trim().toLowerCase()]=true;
  });
  let toProcess=ctx.produkList
    .map(function(p,idx){return{p:p,idx:idx};})
    .filter(function(x){return !doneIdx[x.idx]&&!doneNames[(x.p.nama||'').trim().toLowerCase()];});
  if(toProcess.length===0){
    showToast('Semua produk sudah berhasil dibuat, tidak ada yang perlu dilanjutkan.','success');
    VB_BULK_LAST_CONTEXT=null;
    _vbSyncBulkMainButton();
    return;
  }
  _pbAutoVideoAdopt(ctx.produkList); // v18.4: sesi yang sama tetap satu entri walau halaman sempat dimuat ulang
  await _vbRunBulkGenerate(ctx.produkList,ctx.targetAudience,toProcess,ctx.allResults.slice());
}

// Inti proses batch bulk generate — dipakai baik oleh generate PERTAMA
// (vbGenerateBulkAI, toProcess = SEMUA produk, priorResults = []) maupun
// oleh "Lanjutkan" (vbBulkResumeAI, toProcess = SISA produk yang belum,
// priorResults = script yang sudah berhasil dari sesi sebelumnya).
// `produkList` = daftar LENGKAP semua produk yang diminta di sesi ini
// (dipakai buat total/label/render final) — TIDAK berubah walau yang
// diproses cuma sebagian; `toProcess` = array {p,idx} yang BENERAN
// dikirim ke AI kali ini, idx = posisi produk itu di `produkList` (dipakai
// supaya update kartu live selalu nempel ke produk yang benar walau lagi
// mode lanjutan).
async function _vbRunBulkGenerate(produkList,targetAudience,toProcess,priorResults){
  let errBox=document.getElementById('vb-bulk-error');
  let isResume=priorResults.length>0;
  if(!isResume){VB_CHAR_OVR={}; // generate bulk baru = pengaturan pensil lama tidak relevan lagi
    // 20 Nov 2026: gaya bicara & aksen per produk dari sheet Atur Mode Produk -> masuk ke override per produk (sama seperti ikon pensil)
    produkList.forEach(function(pp,k){if(pp&&(pp.pitch||pp.accent)){var o={};if(pp.pitch)o.pitch=pp.pitch;if(pp.accent)o.accent=pp.accent;VB_CHAR_OVR[k]=o;}});
  }
  // FIX HEMAT BIAYA (permintaan user, Sept 2026): selama tur panduan pemula
  // (pbTourVideoScriptActive true), generate script cuma terjadi TEPAT 1x
  // dalam alur tur itu sendiri (bukan seperti pemakaian normal yang bisa
  // generate berkali-kali) — jadi cache yang ditulis di panggilan ini TIDAK
  // PERNAH sempat dibaca ulang (cache_read) SELAMA tur masih berjalan,
  // cuma kena cache_creation (markup +25%) tanpa manfaat apa pun buat sesi
  // tur ini. Sama seperti alasan cacheSystem=false di panggilan revisi
  // satu-kali lainnya (lihat vbRevisiSingleAI dkk), di sini juga dimatikan
  // KHUSUS selama tur — di luar tur (pemakaian normal berulang-ulang)
  // tetap cacheSystem=true seperti biasa (undefined → default true).
  let _tourOneOffCall=(typeof pbTourVideoScriptActive!=='undefined' && pbTourVideoScriptActive);
  // FIX (audit ulang): dulu kalau dipanggil dari vbBulkResumeAI, kotak
  // error + tombol "Lanjutkan" lama TETAP kelihatan selama proses lanjutan
  // berjalan (tombolnya juga tidak ikut dikunci seperti tombol utama) —
  // bisa bikin user kira masih error padahal lagi diproses. Disembunyikan
  // dulu di sini (berlaku utk KEDUA jalur, generate awal maupun lanjutan)
  // supaya konsisten, nanti ditampilkan lagi di akhir kalau memang masih
  // ada sisa/gagal.
  errBox.classList.add('hidden');errBox.innerHTML='';
  // SESI BARU (permintaan user, Sept 2026, "statistik dipisah per generate"):
  // 1x klik "Generate Semua"/"Lanjutkan" di bulk = 1 baris ringkasan di
  // panel statistik, walau di baliknya dipecah jadi beberapa panggilan
  // batch kecil (lihat _vbCallBulkBatch di bawah) — semua batch itu ikut
  // sesi yang sama supaya bisa diringkas jadi 1 baris "Bulk — N produk".
  _vbStartUsageSession((isResume?'Lanjutan Bulk':'Bulk')+' — '+produkList.length+' produk',produkList.length);

  // FIX: sebelumnya 1 panggilan AI buat SEMUA produk sekaligus — kalau
  // banyak produk, model sering "kelupaan"/nge-drop sebagian dan cuma
  // balikin sebagian kecil (misal 10 diminta, cuma 1 yang keluar).
  // Sekarang dipecah jadi batch kecil (3 produk/panggilan) yang sudah
  // terbukti reliable, dikirim berurutan.
  // PERMINTAAN USER (Sept 2026 — "mau langsung 1 panggilan aja" biar hemat):
  // SEMUA produk di sesi ini (berfoto maupun tidak, berapa pun jumlahnya)
  // sekarang digabung jadi SATU batch/panggilan API saja — BATCH_SIZE=3 &
  // pemaksaan foto jadi batch isi 1 (_vbBuildPhotoAwareBatches, fungsinya
  // TETAP ADA tapi TIDAK DIPAKAI lagi di sini) TIDAK dipakai lagi di jalur
  // ini. Auto-split 413 yang sudah ada di _vbCallBulkBatch (lihat
  // definisinya — otomatis belah dua & retry rekursif kalau 1 request
  // kebesaran) tetap jadi jaring pengaman kalau ternyata kegedean.
  // RISIKO YANG SUDAH DIKETAHUI (alasan BATCH_SIZE=3 dibuat dulu, lihat FIX
  // di atas fungsi ini): makin banyak produk dijejalkan ke 1 panggilan,
  // makin besar juga risiko model "kelupaan"/nge-drop sebagian produk
  // (minta 15, balik cuma sebagian) — beda dari 413 (bukan error HTTP, jadi
  // TIDAK ke-auto-split). Kalau ini terjadi, produk yang hilang tetap bisa
  // di-generate lagi lewat tombol "Lanjutkan" seperti biasa (lihat
  // batchArr.length<batchItems.length di bawah).
  // TARGET AUDIENCE PER PRODUK (permintaan user, Nov 2026): produk dikelompokkan menurut
  // target audience-nya (p.ta; kosong = pakai default dari tab Penonton). Tiap kelompok
  // jadi batch/panggilan sendiri dengan audience-nya sendiri (batchAud[b] sejajar dgn batches[b]).
  // Kalau semua produk audience-nya sama, hasilnya tetap 1 batch seperti sebelumnya.
  let batches=[],batchAud=[];
  (function(){
    let order=[],groups={};
    toProcess.forEach(function(x){
      let a=((x.p&&x.p.ta)||'').trim()||targetAudience;
      let k=a.toLowerCase();
      if(!groups[k]){groups[k]={aud:a,items:[]};order.push(k);}
      groups[k].items.push(x);
    });
    order.forEach(function(k){
      let g=groups[k];
      for(let _ci=0;_ci<g.items.length;_ci+=VB_MAX_PRODUK_PER_CALL){
        batches.push(g.items.slice(_ci,_ci+VB_MAX_PRODUK_PER_CALL));
        batchAud.push(g.aud);
      }
    });
  })();
  if(!batches.length){batches=[toProcess];batchAud=[targetAudience];}

  // audit Okt 2026 (v11.85): wake lock & animasi tombol dulu dinyalakan SEBELUM blok try — kalau ada error di antaranya, finally tidak
  // pernah jalan sehingga wake lock tidak terlepas & tombol macet. Sekarang dinyalakan di DALAM try (lihat bawah).
  let btn=document.getElementById('vb-bulk-btn');
  let genLogoState=null;
  let genFailed=false; // true kalau masuk catch → dipakai memilih adegan penutup loader (centang / gagal)

  // ── REAL-TIME: tampilkan SEMUA grup produk sekaligus — produk yang
  // SUDAH punya hasil dari priorResults (sesi sebelumnya, kalau ini mode
  // Lanjutkan) langsung tampil PENUH tanpa diketik ulang; produk yang
  // BELUM diproses tampil kosong dulu (skipHistory=true — belum ada apa2
  // buat dicatat ke Riwayat), baru diisi kata-per-kata per batch begitu
  // potongan jawaban AI datang. Di akhir (setelah SEMUA batch di sesi ini
  // selesai), _vbRenderBulkOutput dipanggil lagi untuk merender versi
  // FINAL yang sudah bersih — otomatis menimpa kartu live ini.
  // FIX (lihat komentar lengkap di atas, dekat pemberian _idx): utamakan
  // pencocokan lewat idx GLOBAL yang sudah pasti benar (tidak bergantung
  // sama apa pun yang AI tulis di field "produk"). priorByName cuma dipakai
  // sebagai fallback untuk hasil langka yang tidak kebagian _idx (batch-nya
  // kena drop AI, jumlah hasil tidak sama dengan yang diminta).
  let priorByIdx={},priorByName={};
  priorResults.forEach(function(r){
    if(r._idx!=null)priorByIdx[r._idx]=r;
    else priorByName[(r.produk||'').trim().toLowerCase()]=r;
  });
  let initialDisplay=produkList.map(function(p,idx){
    let found=priorByIdx[idx]||priorByName[(p.nama||'').trim().toLowerCase()];
    return found||{produk:p.nama,hook:'',story:'',cta:''};
  });
  try{
    _vbTypewriterReset(); // sesi baru — buang target lama biar ga nyangkut ke kartu baru
    _vbRenderBulkOutput(initialDisplay,produkList,true);
  }catch(_eInit){console.warn('[_vbRunBulkGenerate] render awal gagal (non-fatal):',_eInit);}

  let allResults=priorResults.slice();
  // (26 Okt 2026, permintaan user) kotak kolom skrip disembunyikan selama loading; muncul begitu skrip pertama berhasil diterima (_vbRevealScriptBox)
  document.documentElement.classList.add('vb-gen-wait');
  // FIX (label progress): dulu label "(X/total)" dihitung dari b*BATCH_SIZE
  // yang cuma benar kalau semua batch ukurannya sama persis — sejak batch
  // berisi foto dipaksa jadi ukuran 1 (lihat _vbBuildPhotoAwareBatches),
  // batch-batch bisa punya ukuran campuran, jadi dihitung kumulatif beneran.
  let doneCount=0;
  // AUDIT Okt 2026: flag dikunci tepat sebelum try utama (bukan lebih awal) supaya
  // error di persiapan UI tidak membuat tombol terkunci sampai guard 8 menit.
  VAI._isGenerating=true;VAI._lastGenTime=Date.now();
  let _curBatchItems=null; // audit Okt 2026 (v11.85): batch yang sedang diproses — dipakai catch utk memberi _idx pada hasil yang diselamatkan
  try{
    _vbAcquireWakeLock();
    genLogoState=startGenLogoBtn(btn,isResume?'Melanjutkan Sisa Produk...':'Membuat Prompt...');
    _vbRevealMs=null;
    if(genLogoState)genLogoState.revealBox=true; // kotak skrip baru dibuka setelah adegan penutup loader selesai (lihat _glRestore)
    for(let b=0;b<batches.length;b++){
      VAI._lastGenTime=Date.now(); // progres per batch: guard 'macet' mengukur waktu tanpa progres
      // BUG FIX KRITIS (lihat catatan lengkap di deklarasi dlCheckBeforeCall/
      // dlIncrement): sejak batches selalu isi SATU elemen berapa pun jumlah
      // produknya (lihat "let batches=[toProcess]" di atas), unit jatah yang
      // dipakai WAJIB dihitung dari jumlah produk di batch ini (bukan lagi
      // otomatis 1 per panggilan seperti asumsi lama waktu BATCH_SIZE=3 masih
      // dipakai). UPDATE (audit biaya API, Sept 2026): TIDAK dibagi 3 lagi —
      // 1 unit jatah = 1 produk secara langsung, karena biaya API riil per
      // produk linear (Rp45/produk, tidak ada efek hemat batching).
      let dlUnits=Math.max(1,batches[b].length);
      let dlCheck=dlCheckBeforeCall(dlUnits);
      if(!dlCheck.ok){
        throw new Error(dlCheck.message+(allResults.length?' ('+allResults.length+' produk sudah berhasil dibuat.)':''));
      }
      let batchLabelBase=(isResume?'Lanjutan — ':'')+'Batch '+(b+1)+'/'+batches.length+' ('+doneCount+'/'+toProcess.length+')...';
      updateGenLogoLabel(genLogoState,batchLabelBase);
      // batches[b] = array {p,idx} — idx-nya sudah GLOBAL (posisi asli di
      // produkList), jadi aman dipakai langsung buat update kartu live,
      // baik ini generate pertama (idx = urutan biasa) maupun Lanjutkan
      // (idx = posisi asli produk itu, BUKAN posisi di antara sisa saja).
      let batchItems=batches[b];
      _curBatchItems=batchItems;
      let batchProducts=batchItems.map(function(x){return x.p;});
      // CATATAN: dulu di sini ada onPartialThisBatch yang mengisi kartu
      // kata-per-kata mengikuti potongan mentah streaming (real-time
      // per-chunk) — tapi karena tiap potongan bisa menyentuh Hook/Story/CTA
      // BARENGAN & lintas produk sekaligus, urutannya tidak bisa dijamin
      // Hook→Story→CTA per produk seperti yang diinginkan. Sekarang kartu
      // dibiarkan kosong selama batch masih diproses, dan animasi ketiknya
      // baru jalan SETELAH semua batch selesai & hasilnya sudah disaring
      // (lihat _vbRenderBulkOutput(...,true) di akhir try block).
      let onPartialThisBatch=undefined;
      // FIX: sebelumnya kalau kena limit Google (429/503), user cuma diam
      // lihat tombol "Membuat Prompt..." tanpa tahu apa yang terjadi sampai
      // akhirnya (dulu) muncul pesan gagal. Sekarang label tombol diganti
      // sementara jadi status "⏳ nunggu" yang jujur selama proses retry
      // otomatis berlangsung, lalu balik lagi ke label batch begitu request
      // berikutnya dikirim.
      // FIX (variasi hook lintas batch): kumpulkan semua HOOK yang sudah
      // berhasil dibuat di batch-batch sebelumnya (termasuk dari sesi
      // Lanjutkan lewat priorResults) dan kirim sebagai daftar larangan ke
      // batch berikutnya, supaya AI tidak mengulang pola pembuka yang sama.
      // FIX (audit 413 — request makin berat di batch belakangan): dulu
      // SEMUA hook dari sesi bulk ini dikirim ulang tiap batch, jadi makin
      // banyak produk yang sudah digenerate, makin panjang daftar "hook
      // yang sudah dipakai" ini disisipkan ke prompt — menambah beban token
      // per request tanpa batas. Sekarang cuma 5 hook TERAKHIR yang dikirim
      // (cukup untuk menjaga variasi hook terasa segar lintas batch,
      // tanpa bikin prompt terus membengkak di batch-batch belakangan).
      let usedHooksSoFar=allResults.map(function(r){return(r&&r.hook||'').trim();}).filter(Boolean).slice(-5);
      // FIX HEMAT BIAYA (permintaan user): kalau user cuma isi 1 produk di
      // wizard bulk ini, sesi generate-nya cuma 1x panggilan (tidak ada
      // panggilan lanjutan yang bisa memanfaatkan cache_read), jadi
      // cache_control cuma bakal kena cache_creation (markup +25%) tanpa
      // manfaat — sama seperti alasan _tourOneOffCall di atas. Jadi
      // cacheSystem dimatikan (false) juga untuk kasus 1 produk ini; di
      // luar itu (2+ produk / bukan tur) tetap default true seperti biasa.
      let _singleProdukCall=(produkList.length===1);
      _vbLiveItems=batchItems;_vbLiveArr=null;_vbLiveIdx=null;_vbBatchT0=Date.now();_vbLiveDraftSeen=false; // petakan draft AI ke kartu (lihat _vbDraftPush)
      let batchArr=await _vbCallBulkBatch(batchProducts,batchAud[b],undefined,function(waitMs,attempt,status){
        let alasan=_vbWaitReasonLabel(status);
        if(status==='thinking'){updateGenLogoLabel(genLogoState,'🤔 '+alasan+'... '+batchLabelBase);return;}
        let detik=Math.ceil(waitMs/1000);
        updateGenLogoLabel(genLogoState,'⏳ '+alasan+' (~'+detik+'dtk)... '+batchLabelBase);
      },onPartialThisBatch,usedHooksSoFar,(_tourOneOffCall||_singleProdukCall)?false:undefined,produkList.length,!_tourOneOffCall); // param terakhir = fixShort: MATI selama tur panduan (permintaan user, 29 Sep 2026)
      dlIncrement(Math.max(1,batchArr.length)); // audit Okt 2026: kuota dipotong sesuai produk yang BENAR-BENAR jadi
      doneCount+=batchItems.length;
      if(batchArr.length<batchItems.length){
        console.warn('[_vbRunBulkGenerate] batch '+b+' cuma balikin '+batchArr.length+' dari '+batchItems.length+' produk diminta');
      }
      // FIX BUG#16 (backfill nama produk) dipindah ke DALAM _vbCallBulkBatch
      // (lihat komentar lengkap di sana) — sekarang sudah aman dari
      // masalah salah-tempel nama saat ada produk yang di-drop di tengah
      // batch, dan sudah jalan SEBELUM perbaikan jumlah kata dijalankan.
      //
      // FIX BUG (deteksi "produk sudah selesai" salah gara-gara nama tidak
      // cocok persis): dulu priorByName (di bawah) & doneNames (di
      // vbBulkResumeAI) mencocokkan produk yang SUDAH beres cuma lewat teks
      // field "produk" — yaitu nama yang AI TULIS ULANG sendiri di JSON
      // balasannya, bukan disalin otomatis dari input. Prompt di atas malah
      // MELARANG AI menyalin nama produk apa adanya ("bukan teks yang wajib
      // disalin persis apa adanya... tulis ulang dengan bahasa natural
      // sendiri") — jadi field "produk" ini SERING beda kapital/spasi/kata
      // dari p.nama asli yang diketik user. Begitu satu saja tidak match
      // persis: (1) initialDisplay di bawah salah anggap produk itu "belum
      // ada hasilnya" dan merender kartunya KOSONG walau sebenarnya sudah
      // jadi, dan (2) vbBulkResumeAI ikut mengirim ulang produk itu ke AI
      // padahal sudah pernah berhasil. Sekarang tiap hasil batch ditandai
      // dengan idx GLOBAL aslinya (batchItems[j].idx — posisi produk itu di
      // produkList, BUKAN apa pun yang ditulis AI) begitu batch ini balik
      // dengan jumlah PERSIS SAMA seperti yang diminta (satu-satunya kondisi
      // idx hasil dijamin lurus dengan idx yang dikirim — persis logika yang
      // sudah dipakai di PENGAMAN WAJIB update kartu live di bawah). Kalau
      // batch ini kena drop (jumlah tidak sama), idx tidak bisa dipastikan
      // aman utk SEMUA item sisa batch itu (posisi ikut geser), jadi
      // dibiarkan tanpa _idx — priorByName/doneNames di bawah otomatis balik
      // pakai fallback nama (fuzzy) SEKEDAR untuk baris-baris langka ini,
      // sama seperti perilaku lama.
      _vbAssignIdx(batchArr,batchItems);
      // audit Okt 2026: produk yang di-drop AI diulang OTOMATIS 1x (hanya yang hilang) sebelum sisanya diserahkan ke "Lanjutkan"
      if(batchArr.length&&batchArr.length<batchItems.length&&batchArr.every(function(o){return o._idx!=null;})){
        let _miss=[];
        try{
          let _got={};batchArr.forEach(function(o){_got[o._idx]=1;});
          _miss=batchItems.filter(function(x){return !_got[x.idx];});
          if(_miss.length&&dlCheckBeforeCall(_miss.length).ok){
            updateGenLogoLabel(genLogoState,'Mengulang '+_miss.length+' produk yang terlewat...');
            let _hooksNow=allResults.concat(batchArr).map(function(r){return(r&&r.hook||'').trim();}).filter(Boolean).slice(-5);
            let _retryArr=await _vbCallBulkBatch(_miss.map(function(x){return x.p;}),batchAud[b],undefined,function(){},undefined,_hooksNow,undefined,produkList.length,!_tourOneOffCall);
            _vbAssignIdx(_retryArr,_miss);
            dlIncrement(Math.max(1,_retryArr.length));
            batchArr=batchArr.concat(_retryArr);
          }
        }catch(_eRetry){
          console.warn('[_vbRunBulkGenerate] retry produk terlewat gagal — sisanya lewat Lanjutkan:',_eRetry);
          // audit Okt 2026 (v11.85): hasil yang sempat jadi di retry (auto-split 413) jangan dibuang & tetap kena kuota (biaya API sudah terjadi)
          try{
            if(Array.isArray(_eRetry.partialResults)&&_eRetry.partialResults.length){
              _vbAssignIdx(_eRetry.partialResults,_miss);
              dlIncrement(_eRetry.partialResults.length);
              batchArr=batchArr.concat(_eRetry.partialResults);
            }
          }catch(_eSalv){console.warn('[_vbRunBulkGenerate] salvage retry gagal:',_eSalv);}
        }
      }
      allResults=_vbSortByIdx(allResults.concat(batchArr));
      // FIX (permintaan user): dulu VB_BULK_LAST_CONTEXT cuma di-set SETELAH
      // seluruh proses bulk berhenti (baik selesai penuh, gagal, maupun kena
      // limit) — lihat blok "if(allResults.length<produkList.length)" di
      // akhir try/catch di bawah. Artinya kalau user menekan Simpan Halaman
      // DI TENGAH proses (mis. baru 3 dari 10 produk beres, batch ke-4 masih
      // jalan), VB_BULK_LAST_CONTEXT masih null — hasil Simpan itu cuma jadi
      // snapshot BEKU (baca-saja), tombol "Lanjutkan" tidak akan muncul lagi
      // saat entri itu dibuka dari Riwayat nanti. Sekarang di-update SETIAP
      // batch selesai, supaya progres "sejauh ini" selalu siap dipakai kapan
      // pun Simpan ditekan — termasuk pas AI masih aktif generate.
      if(allResults.length<produkList.length){
        VB_BULK_LAST_CONTEXT={produkList:produkList,targetAudience:targetAudience,allResults:allResults.slice()};
        _vbSyncBulkMainButton();
      }
      // FITUR BARU (permintaan user, Sept 2026): paksa draft otomatis
      // (localStorage, lihat DRAFT_KEY di IIFE undo/redo dekat akhir file)
      // tersimpan SEKARANG juga, bukan nunggu debounce dari ketikan/klik
      // biasa — proses bulk ini jalan sendiri TANPA user menyentuh apa pun,
      // jadi tanpa panggilan eksplisit ini draft bisa saja masih yang LAMA
      // (sebelum batch ini) kalau user refresh tepat setelah satu batch
      // beres. Dengan ini, tiap kali satu batch produk selesai, progresnya
      // (kolom skrip yang sudah jadi) langsung aman tersimpan di draft.
      // CATATAN (audit Sept 2026, Ringan #9): komentar versi sebelumnya di
      // sini menyebut tombol "Lanjutkan Generate" bakal muncul lagi setelah
      // refresh lewat _vbRestoreLiveBulkOutput() — itu TIDAK PERNAH BENERAN
      // TERJADI karena fungsi itu tidak pernah dipanggil dari window.load,
      // dan reload menghapus draft wizard duluan (lihat isReloadNavigation
      // di IIFE undo/redo). Sesuai perilaku yang sudah direvisi jadi
      // "hilang" (permintaan user): kalau user refresh di tengah proses
      // bulk, progres yang sudah selesai memang TIDAK BISA dilanjutkan lagi
      // otomatis — panggilan draft-save di sini cuma memastikan datanya
      // tersimpan (jaga-jaga fitur lanjut-generate ditambahkan lagi nanti),
      // bukan aktif memulihkan tombol "Lanjutkan" saat ini.
      if(typeof window.pbForceSaveDraftNow==='function')window.pbForceSaveDraftNow();
      // FIX SCRIPT YANG SUDAH JADI TAPI KOLOMNYA MASIH KOSONG: sebelumnya di
      // sini TIDAK ADA update UI sama sekali begitu satu batch selesai —
      // kartu Hook/Story/CTA punya produk di batch ini DIBIARKAN kosong
      // sampai SEMUA batch (bisa 4x panggilan buat 10 produk) kelar, baru
      // ditampilkan bareng-bareng lewat _vbRenderBulkOutput(...,true) di
      // akhir try block. Kalau prosesnya masih di Batch 2/4, produk dari
      // Batch 1 yang sebenarnya SUDAH selesai dari Gemini tetap kelihatan
      // kosong (0/25 kata) di layar — persis laporan user. Sekarang begitu
      // batch ini beres, langsung isi kartu produk-produk di batch ini juga
      // (tidak perlu nunggu batch berikutnya) lewat _vbUpdateProductCardsLive,
      // yang pakai typewriter versi PARALEL (_vbTypewriterSetTarget) — beda
      // dari versi sequential yang dipakai mode single, versi ini AMAN
      // dipanggil berkali-kali tanpa saling membatalkan animasi ketik batch
      // lain yang mungkin masih jalan (tidak ada reset sesi global). Render
      // ulang PENUH di akhir (lihat bawah) tetap dipertahankan supaya badge
      // "dipotong otomatis" & state akhir tetap konsisten, tapi animate-nya
      // dimatikan (langsung tampil, tanpa ngetik ulang) karena isinya sudah
      // kepakai duluan di sini.
      //
      // PENGAMAN WAJIB: update live ini pakai idx GLOBAL dari batchItems[j]
      // (bukan lagi hitung batchStartIdx+j) buat tahu kartu produk mana
      // yang harus diisi — itu CUMA aman kalau jumlah hasil PERSIS SAMA
      // dengan jumlah yang diminta di batch ini. Kalau Gemini men-drop SATU
      // produk di TENGAH batch (bukan di ujung), posisi hasil yang tersisa
      // ikut geser — produk sesudah yang di-drop bakal ketiban script
      // produk LAIN yang salah kalau tetap dipetakan by-index (persis
      // masalah yang sudah pernah ditemukan & ditambal untuk backfill nama
      // produk di _vbCallBulkBatch, lihat komentar di sana). Jadi kalau
      // batch ini kena drop, live update-nya DILEWATI dulu (kartu-kartu di
      // batch ini tetap kosong sampai render final di akhir, sama seperti
      // perilaku SEBELUM fix ini) — render final tetap aman karena dia
      // mencocokkan produk lewat NAMA (metaLookup), bukan posisi.
      if(!_vbLiveDraftSeen)_vbTypeBoost=_vbTypeBoostFor(Date.now()-_vbBatchT0);
      if(batchArr&&batchArr.length)_vbRevealScriptBox(Date.now()-_vbBatchT0); // kotak skrip muncul (kalau belum) — prompt berhasil
      batchArr.forEach(function(o){if(o&&o._idx!=null)_vbUpdateProductCardsLive(o._idx,o);});
      // Jeda antar batch — supaya tiap batch (yang isinya beberapa request:
      // 1 utama + sampai 3 perbaikan-kata) tidak numpuk jadi satu ledakan
      // request di ujung batch sebelumnya. (Gate global 6,5 detik per
      // request sudah dihapus.)
      if(b<batches.length-1)await new Promise(r=>setTimeout(r,3000));
    }

    if(allResults.length===0)throw new Error('Hasil belum berhasil dibuat, coba lagi.');

    // FITUR BARU: sama seperti mode single AI — script yang baru dikasih AI
    // diketik pelan-pelan berurutan (Hook→Story→CTA, produk demi produk),
    // bukan langsung muncul sekaligus. di-await dulu supaya toast/riwayat/
    // progress muncul PAS animasi ketik semua produk benar-benar kelar.
    setTimeout(()=>document.getElementById('vb-multi-output').scrollIntoView({behavior:'smooth',block:'nearest'}),100);
    // FIX SCRIPT SUDAH JADI TAPI KOLOM MASIH KOSONG (lanjutan dari fix di
    // loop batch atas): render final ini TETAP dijalankan supaya badge
    // "dipotong otomatis dari N kata" & state akhir (nama produk, urutan,
    // dst) konsisten — tapi animate DIMATIKAN (parameter terakhir jadi
    // false, sebelumnya true) karena isi tiap kartu SUDAH tampil duluan
    // lewat _vbUpdateProductCardsLive per-batch. Kalau animate tetap true
    // di sini, teks yang sudah kepakai bakal DIKOSONGKAN dulu lalu diketik
    // ulang pelan-pelan dari awal untuk SEMUA produk (bukan cuma yang baru)
    // — user akan lihat semua script yang sudah selesai dari tadi tiba-tiba
    // hilang lalu muncul lagi satu-satu.
    await _vbTypewriterFlush(4000); // biarkan ketikan live selesai dulu, baru render final
    await _vbRenderBulkOutput(allResults,produkList,true,false);
    _vbBuildCombinedHistoryEntry('Bulk '+allResults.length+' produk ('+(allResults.length*_vbPer())+' script)'+(VB.bulkTargetAudience?' — '+VB.bulkTargetAudience:''));
    // audit Okt 2026 (v11.85): dulu "Selesai!" + kartu step ditandai beres SEBELUM dicek lengkap atau tidak, lalu toast "Hanya N dari M"
    // muncul belakangan (kontradiktif). Sekarang status "Selesai!" hanya untuk hasil lengkap; kalau baru sebagian, step tetap terbuka
    // dan progress menunjukkan jumlah yang jadi (produk yang sudah jadi tetap tersimpan ke Riwayat per produk).
    if(allResults.length>=produkList.length){
      doneCard('v5','va5',(allResults.length*_vbPer())+' script bulk');
      vbUpdateProgress((typeof pbStepTotal==='function')?pbStepTotal():(_vbHasCamStep()?7:6),'<svg class="icon"><use href="#ic-check"></use></svg> Selesai!');
    }else{
      vbUpdateProgress((typeof pbStepTotal==='function')?pbStepTotal():(_vbHasCamStep()?7:6),'Sebagian selesai ('+allResults.length+' dari '+produkList.length+' produk)');
    }
    if(allResults.length<produkList.length){
      // FITUR BARU (permintaan user): dulu di sini cuma toast "sisanya bisa
      // dicoba generate ulang" — maksudnya generate ULANG SEMUA dari nol,
      // padahal sebagian sudah berhasil. Sekarang simpan konteksnya supaya
      // tombol "Lanjutkan" di errBox cuma minta AI ngerjain SISA yang belum.
      VB_BULK_LAST_CONTEXT={produkList:produkList,targetAudience:targetAudience,allResults:allResults.slice()};
      _vbSyncBulkMainButton();
      _vbShowBulkResumeUI(errBox,(produkList.length-allResults.length));
      showToast('Hanya '+allResults.length+' dari '+produkList.length+' produk berhasil dibuat.','error');
    }else{
      VB_BULK_LAST_CONTEXT=null; // sudah lengkap semua — tidak ada lagi yang perlu dilanjutkan
      _vbSyncBulkMainButton();
      showToast((allResults.length*_vbPer())+' script + JSON berhasil dibuat!','success');
      // BUGFIX (dilaporkan user): notifikasi "Prompt Video Siap" + tombol
      // "Mengerti" cuma dipasang di mode SATU produk (vbGenerate3AI, lihat
      // blok pbTourVideoScriptActive di bawahnya) — jalur BULK (fungsi ini)
      // tidak pernah memanggilnya sama sekali, jadi kalau user sedang di
      // dalam tur panduan pemula lalu generate lewat mode bulk, setelah
      // script selesai tidak muncul apa-apa (bukan cuma telat, memang belum
      // pernah dipicu). Disamakan di sini: hanya jalan kalau memang sedang
      // dalam sesi tur (pbTourVideoScriptActive true), dan hanya untuk hasil
      // yang BENAR-BENAR lengkap semua produk (bukan sebagian/gagal), sama
      // seperti syarat di mode single.
      if(typeof pbTourVideoScriptActive!=='undefined' && pbTourVideoScriptActive){
        pbTourVideoScriptActive=false;
        pbTourWaitingVideoGuideEnd=true;
        let bulkLabel=document.getElementById('vb-bulk-toggle-label');
        if(bulkLabel) bulkLabel.classList.remove('hidden');
        setTimeout(function(){ vbShowScriptReadyNotif(); },300);
      }
    }
    // Simpan draft SEKARANG (lihat catatan panjang di dalam loop batch di
    // atas) — berlaku baik untuk kasus masih ada sisa (VB_BULK_LAST_CONTEXT
    // terisi) maupun sudah lengkap semua (VB_BULK_LAST_CONTEXT jadi null,
    // supaya draft juga ikut tahu proses ini sudah tuntas kalau nanti
    // di-refresh — tidak nyangkut nampilin tombol "Lanjutkan" yang basi).
    if(typeof window.pbForceSaveDraftNow==='function')window.pbForceSaveDraftNow();
  }catch(err){
    genFailed=true;
    console.error('_vbRunBulkGenerate error:',err);
    // FIX (audit — kehilangan hasil saat auto-split 413): _vbCallBulkBatch
    // sekarang melampirkan hasil batch yang SUDAH berhasil (walau baru
    // separuh, gara-gara auto-split 413 yang paruh keduanya gagal)
    // lewat err.partialResults — gabungkan ke allResults SEBELUM dipakai
    // di bawah, supaya produk yang sudah jadi & sudah kena biaya nyata di
    // Anthropic tidak pernah hilang percuma.
    if(Array.isArray(err.partialResults)&&err.partialResults.length){
      // audit Okt 2026 (v11.85): hasil yang diselamatkan ini SUDAH kena biaya API, tapi dlIncrement di loop hanya jalan di jalur
      // sukses — jadi dulu produknya gratis buat user. Sekarang kuota dipotong sesuai jumlah yang diselamatkan, dan hasilnya diberi
      // _idx (kalau urutannya bisa dipastikan) supaya "Lanjutkan" tidak mengirim ulang produk yang sudah jadi (biaya dobel).
      try{
        if(_curBatchItems)_vbAssignIdx(err.partialResults,_curBatchItems);
        err.partialResults.forEach(function(o){if(o)delete o._bi;});
        dlIncrement(err.partialResults.length);
      }catch(_eSalv){console.warn('[_vbRunBulkGenerate] salvage hasil parsial gagal:',_eSalv);}
      allResults=_vbSortByIdx(allResults.concat(err.partialResults));
    }
    if(allResults.length>0){
      _vbRenderBulkOutput(allResults,produkList);
      setTimeout(()=>document.getElementById('vb-multi-output').scrollIntoView({behavior:'smooth',block:'nearest'}),100);
    }
    if(allResults.length<produkList.length){
      VB_BULK_LAST_CONTEXT={produkList:produkList,targetAudience:targetAudience,allResults:allResults.slice()};
      _vbSyncBulkMainButton();
      _vbShowBulkResumeUI(errBox,(produkList.length-allResults.length),err.message);
    }else{
      VB_BULK_LAST_CONTEXT=null;
      _vbSyncBulkMainButton();
      errBox.textContent=''+err.message;
      errBox.classList.remove('hidden');
    }
    if(typeof window.pbForceSaveDraftNow==='function')window.pbForceSaveDraftNow();
    showToast('Gagal generate: '+(err.toastMsg||err.message),'error');
  }finally{
    // adegan penutup loader: semua produk jadi → centang; sebagian → gagal ringan; error → gagal
    try{
      _vbLiveItems=null;_vbLiveArr=null;_vbLiveIdx=null;_vbTypeBoost=1;
      // gagal total & belum ada teks sama sekali -> jangan tampilkan kartu kosong
      let _mwx=document.getElementById('vb-multi-output');
      if(_mwx&&allResults.length===0&&!Array.prototype.some.call(_mwx.querySelectorAll('textarea'),function(t){return (t.value||'').trim();}))_mwx.style.display='none';
      _vbRevealScriptBox(null);
    }catch(_eRv){document.documentElement.classList.remove('vb-gen-wait');}
    stopGenLogoBtn(btn,genLogoState,genFailed?(allResults.length>0&&allResults.length<produkList.length?'partial':'err'):(allResults.length>=produkList.length?'ok':'partial'));
    // pengaman: tanpa loader (atau loader sudah tertutup) kotak langsung dibuka; kalau adegan penutup macet, kotak tetap dibuka paling lambat 9 detik
    try{if(!genLogoState||genLogoState.closed)_vbRevealScriptBox(null,true);}catch(_eRv3){document.documentElement.classList.remove('vb-gen-wait');}
    setTimeout(function(){if(document.documentElement.classList.contains('vb-gen-wait'))_vbRevealScriptBox(null,true);},16000);
    // FIX (laporan user: setelah error 403 tombol utama tetap "Generate Prompt", padahal ada sesi yang bisa dilanjutkan): _vbSyncBulkMainButton() yang dipanggil di dalam catch selalu kena early-return karena tombol MASIH berstatus btn-loading saat itu, lalu stopGenLogoBtn() mengembalikan label lama. Dipanggil ULANG di sini, setelah loading benar-benar dilepas, supaya tombol jadi "Lanjutkan N Produk yang Belum".
    _vbSyncBulkMainButton();
    VAI._isGenerating=false;
    _vbReleaseWakeLock();
  }
}

// Render pesan error/peringatan + tombol "Lanjutkan N Produk yang Belum"
// di errBox. remainingCount HARUS >0 tiap kali ini dipanggil (dicek oleh
// pemanggil) — tombol manggil vbBulkResumeAI() yang cuma proses produk
// yang namanya belum ada di VB_BULK_LAST_CONTEXT.allResults, jadi script
// yang sudah jadi TIDAK diulang/ditimpa. Pesan diberi esc() sebelum
// disisipkan sebagai HTML (beda dari dulu yang pakai .textContent) karena
// sekarang errBox butuh markup buat tombolnya.
function _vbShowBulkResumeUI(errBox,remainingCount,errMessage){
  errBox.innerHTML=(errMessage?'<div>'+esc(errMessage)+'</div>':'')
    +'<div style="margin-top:'+(errMessage?'6px':'0')+';">'+remainingCount+' produk belum kebagian script.</div>'
    +'<button class="btn sm" style="width:100%;margin-top:8px;" onclick="vbBulkResumeAI()">'
    +'<svg class="icon"><use href="#ic-sparkle"></use></svg> Lanjutkan '+remainingCount+' Produk yang Belum</button>';
  errBox.classList.remove('hidden');
}

// FITUR BARU (permintaan user): dulu satu-satunya cara melanjutkan sisa
// produk yang belum kebagian script adalah tombol kecil di dalam kotak
// error (_vbShowBulkResumeUI di atas) — kalau kotak itu gagal tampil/ke-
// render dengan benar (mis. jalur error tertentu di _vbRunBulkGenerate yang
// cuma nulis errBox.textContent tanpa HTML tombol), user jadi tidak py
// jalan untuk melanjutkan tanpa mengulang generate SEMUA produk dari nol.
// Sekarang tombol UTAMA "Generate Prompt" (vb-bulk-btn) sendiri yang
// otomatis berubah label & fungsi jadi "Lanjutkan N Produk yang Belum"
// setiap kali ada sesi bulk yang masih menggantung (VB_BULK_LAST_CONTEXT
// terisi) — tidak bergantung lagi pada kotak error kecil itu tampil benar
// atau tidak. Dipanggil di SETIAP titik yang mengubah VB_BULK_LAST_CONTEXT
// (diisi maupun dikosongkan) — lihat pemanggilnya di vbGenerateBulkAI,
// vbBulkResumeAI, _vbRunBulkGenerate, dan _vbRestoreLiveBulkOutput.
function _vbSyncBulkMainButton(){
  let btn=document.getElementById('vb-bulk-btn');
  // Kalau tombol lagi dalam status loading (proses AI masih jalan),
  // JANGAN diutak-atik di sini — stopGenLogoBtn yang akan mengembalikan
  // innerHTML ke label terakhir yang di-set SEBELUM loading dimulai.
  if(!btn||btn.classList.contains('btn-loading'))return;
  let remaining=0;
  if(VB_BULK_LAST_CONTEXT && VB_BULK_LAST_CONTEXT.produkList && VB_BULK_LAST_CONTEXT.allResults){
    remaining=VB_BULK_LAST_CONTEXT.produkList.length-VB_BULK_LAST_CONTEXT.allResults.length;
  }
  if(remaining>0){
    btn.innerHTML='<svg class="icon"><use href="#ic-sparkle"></use></svg> Lanjutkan '+remaining+' Produk yang Belum';
    btn.dataset.vbMode='resume';
    btn.classList.add('cs-pulse-btn'); // denyutan halus (reuse animasi csAttnPulse) biar user sadar ada sisa yang bisa dilanjutkan
  }else{
    btn.innerHTML='Generate Prompt';
    btn.dataset.vbMode='generate';
    btn.classList.remove('cs-pulse-btn');
  }
  try{if(typeof vbInfoSyncBtns==='function')vbInfoSyncBtns();}catch(_e){}
}
// Handler tombol utama bulk — otomatis pilih antara generate dari awal
// (kalau tidak ada sesi menggantung) atau lanjutkan sisa produk saja
// (kalau _vbSyncBulkMainButton baru saja menandai mode 'resume').
function vbBulkMainAction(){
  let btn=document.getElementById('vb-bulk-btn');
  if(btn)btn.classList.remove('cs-pulse-btn'); // matikan denyutan begitu ditekan, biar tidak bentrok sama animasi loading
  if(btn && btn.dataset.vbMode==='resume'){vbBulkResumeAI();}
  else{vbGenerateBulkAI();}
}

// FIX BUG #8 (ditemukan saat audit mendalam): sebelumnya VB_BULK_PRODUCTS
// diisi 1:1 berdasarkan POSISI dari produkListMeta (daftar yang DIMINTA
// user). Tapi kalau satu batch AI cuma balikin sebagian dari yang diminta
// (sudah diantisipasi kode lain lewat console.warn "batch cuma balikin X
// dari Y produk diminta"), `products` (hasil yang BENERAN tampil di layar)
// jadi lebih PENDEK dari produkListMeta — index-nya geser mulai dari titik
// produk yang hilang. Akibatnya VB_BULK_PRODUCTS[prodIdx] bisa berisi
// nama/keunggulan produk LAIN, bukan produk yang sedang ditampilkan di
// kartu itu. Begitu user buka panel "Revisi" untuk kartu itu, form kepre-isi
// data produk yang salah — dan kalau di-generate ulang tanpa sadar, kartu
// yang tampil diam-diam ketiban isi produk lain. Sekarang dicocokkan per
// NAMA produk (bukan posisi), jadi tetap benar walau ada produk yang drop.
function _vbBuildProductMetaLookup(produkListMeta){
  let map={};
  (produkListMeta||[]).forEach(function(x){
    let key=(x.nama||'').trim().toLowerCase();
    // FIX BUG KRITIS FOTO (ditemukan saat audit mendalam): lookup ini dulu
    // cuma menyimpan {nama,keunggulan} — fotoBase64/fotoMime yang sudah
    // diupload user ikut HILANG begitu saja tiap kali _vbRenderBulkOutput
    // membangun ulang VB_BULK_PRODUCTS lewat lookup ini (lihat fix di bawah).
    // Akibatnya foto yang diupload di step input cuma "hidup" sampai hasil
    // generate PERTAMA tampil di layar — begitu itu terjadi, foto sudah
    // tidak pernah lagi ikut terkirim ke AI walau tombol Revisi/Generate
    // Ulang Semua diklik, padahal secara visual foto masih kelihatan
    // terupload di baris inputnya. Sekarang foto ikut disimpan di lookup.
    // FIX BUG (ditemukan saat audit mendalam khusus builder video, lanjutan
    // dari fix foto di atas): "topik" (Arah Pembahasan per produk) dulu TIDAK
    // ikut disimpan di lookup ini — sama persis akar masalahnya dengan bug
    // foto yang sudah ditambal di atas, tapi khusus field ini terlewat.
    // Akibatnya arahan topik yang user isi di form Bulk cuma kepakai di
    // generate PERTAMA, lalu hilang permanen dari VB_BULK_PRODUCTS begitu
    // _vbRenderBulkOutput() jalan — Revisi 1 Produk & Generate Ulang Semua
    // jadi tidak pernah tahu topik itu lagi. Disamakan dengan foto: ikut dibawa.
    if(key)map[key]={ta:x.ta||'',nama:x.nama||'',keunggulan:x.keunggulan||'',topik:x.topik||'',hookType:x.hookType||'',hookCustom:x.hookCustom||'',overlay:x.overlay||'',pitch:x.pitch||'',accent:x.accent||'',fotoBase64:x.fotoBase64||'',fotoMime:x.fotoMime||''};
  });
  return map;
}

// ── Render kartu kompak untuk hasil bulk — tiap script bisa diedit,
// JSON di bawahnya update REALTIME tiap ketikan (bukan cuma pas generate) ──
// animate=true: semua kartu (lintas produk) dibangun KOSONG dulu, lalu
// diketik berurutan Hook→Story→CTA per produk, produk demi produk dari atas
// ke bawah — mengikuti pola yang sama seperti _vbRenderMultiOutput di mode
// single AI. Kalau animate true, entri Riwayat SENGAJA tidak dibuat di sini
// (skipHistory diabaikan) — pemanggil yang meng-await Promise return-nya lalu
// mencatat Riwayat sendiri SETELAH animasi kelar, supaya urutannya konsisten
// dengan mode single (lihat vbGenerateBulkAI/vbRegenerateAllBulk).
// FIX (audit mode Bulk — foto/keunggulan di kolom skrip tidak sesuai produknya):
// _vbBuildProductMetaLookup di atas mencocokkan hasil AI ke produk yang
// diminta lewat NAMA saja (huruf kecil, tanpa spasi pinggir). Kalau dua
// produk namanya sama — atau cuma beda kapital/spasi, mis. "Gamis Syari"
// dan "gamis syari " — keduanya jatuh di key yang sama dan yang belakangan
// MENIMPA yang duluan: SEMUA kartu kembar tampil dengan foto + keunggulan
// produk TERAKHIR, dan data yang salah itu ikut terbawa ke Revisi & Generate
// Ulang Semua (jadi skripnya pun ikut menyimpang dari fotonya). Fungsi ini
// dipakai sebagai gantinya: (1) utamakan _idx (posisi asli produk di daftar
// yang diminta, dicap saat batch balik lengkap — tidak bergantung nama
// apa pun), (2) sisanya dicocokkan lewat nama tapi tiap entri daftar cuma
// boleh dipakai SEKALI, berurutan, jadi nama kembar tetap dapat foto
// masing-masing. Return: array sejajar dengan `products` (isi: meta / null).
function _vbResolveProductMetas(products,produkListMeta){
  let metas=produkListMeta||[];
  let res=new Array(products.length).fill(null);
  let used={};
  products.forEach(function(p,k){
    if(p&&p._idx!=null&&metas[p._idx]&&!used[p._idx]){res[k]=metas[p._idx];used[p._idx]=true;}
  });
  let queues={};
  metas.forEach(function(m,i){
    let key=((m&&m.nama)||'').trim().toLowerCase();
    if(!key)return;
    (queues[key]=queues[key]||[]).push(i);
  });
  products.forEach(function(p,k){
    if(res[k])return;
    let key=((p&&p.produk)||'').trim().toLowerCase();
    let q=key?queues[key]:null;
    if(!q)return;
    for(let n=0;n<q.length;n++){
      if(!used[q[n]]){res[k]=metas[q[n]];used[q[n]]=true;break;}
    }
  });
  return res;
}

