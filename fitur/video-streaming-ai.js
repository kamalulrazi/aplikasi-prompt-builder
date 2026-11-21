// fitur/video-streaming-ai.js — Video — pengiriman ke AI dengan streaming real-time, ulang otomatis, cadangan model.
// Bagian dari js/10-main-app.js lama (baris 16171–16804). Isi tidak diubah.
async function _vbStreamClaudeJSONWithRetryModel(model,promptParts,onPartial,onWait,systemText,cacheSystem,maxOutputTokensOverride,maxTotalWaitMs,failFast,chatMsgs){
  if(cacheSystem===undefined)cacheSystem=true;
  const MAX_TOTAL_WAIT_MS=maxTotalWaitMs||3*60*1000; // opsional: panggilan tambahan (perbaikan skrip) pakai batas lebih pendek
  let totalWaited=0;
  let blocked403Retries=0;
  let serverErrRetries=0;
  const _loopStart=Date.now(); // audit Okt 2026: durasi REQUEST ikut dihitung, bukan cuma jeda tidur
  const MAX_TOTAL_ELAPSED_MS=maxTotalWaitMs?maxTotalWaitMs*2:4*60*1000;
  for(let attempt=0;;attempt++){
    let isFirstAttempt=(attempt===0);
    const _isGroq=_pbIsGroqModel(model);
    // CATATAN MIGRASI CLAUDE: dulu di sini ada logic paksa "reasoning_effort:
    // none" karena model Groq (qwen3) diam-diam mikir panjang (extended
    // reasoning) sebelum jawab, ikut makan jatah max_tokens sampai jawaban
    // JSON kepotong. Claude standar (tanpa parameter 'thinking' eksplisit)
    // TIDAK melakukan reasoning tersembunyi seperti itu — seluruh isi
    // max_tokens memang dipakai buat jawaban, jadi parameter itu dibuang.
    // max_tokens tetap 6144 sebagai jaring pengaman token yang cukup lega
    // untuk jawaban JSON hook/story/cta.
    // BUG FIX KRITIS (audit Sept 2026, "1 panggilan aja untuk banyak
    // produk"): 6144 dihitung waktu 1 panggilan API maksimal cuma isi
    // BATCH_SIZE=3 produk (atau 1 produk kalau ada foto). Sekarang
    // _vbRunBulkGenerate menggabung SEMUA produk sesi (sampai 30, lihat
    // validasi count>30 di vbGenerateBulkAI) jadi SATU panggilan — 6144
    // token jelas tidak cukup untuk puluhan produk x 3 bagian x ~30 kata,
    // hasilnya JSON kepotong (finishReason 'length') sebelum semua produk
    // selesai. maxOutputTokensOverride (dikirim _vbCallBulkBatch berdasar
    // jumlah produk di batch ini) dipakai kalau ada; 6144 tetap jadi
    // fallback/minimum untuk pemanggil lain yang tidak mengirim parameter
    // ini (vbGenerate3AI, perbaikan kata, dll — tidak berubah).
    let cfg={maxOutputTokens:maxOutputTokensOverride||6144};
    // PARAMETER THINKING RESMI (permintaan user, Sept 2026 — pengganti trik
    // "hitung dengan menomori" di system prompt yang instruksinya bentrok
    // sama "Balas HANYA dengan JSON... tanpa teks lain"): proses hitung kata
    // Claude sekarang ditaruh di kanal "thinking" resmi Anthropic, blok
    // content TERPISAH dari teks jawaban (delta.type-nya 'thinking_delta',
    // bukan 'text_delta') — textBuf di bawah cuma nampung 'text_delta', jadi
    // otomatis TIDAK kecampur teks berpikir ini tanpa perlu ubah parsing SSE.
    // Token thinking TETAP ditagih sebagai token output biasa (bukan gratis,
    // bukan kanal terpisah dari sisi biaya) — budget-nya dibikin proporsional
    // ke cfg.maxOutputTokens (yang sudah ikut skala jumlah produk di batch,
    // lihat _vbDynamicMaxTokens) supaya batch kecil tidak ikut bayar jatah
    // besar yang tidak kepakai. Minimum resmi Anthropic 1.024 token.
    // max_tokens WAJIB lebih besar dari budget_tokens (thinking ikut masuk
    // hitungan max_tokens total) — makanya ditambahkan DI ATAS
    // cfg.maxOutputTokens, bukan mengambil dari situ, supaya jatah jawaban
    // JSON final tidak berkurang sama sekali.
    // FIX BIAYA (audit lanjutan, Sept 2026 — "thinking bikin biaya per
    // panggilan naik sampai 50%"): rasio semula 1/2 dari cfg.maxOutputTokens
    // kebesaran untuk tugas ini — tugas AI di sini cuma menghitung kata di
    // 3 bagian pendek (22-26 kata/bagian), bukan reasoning kompleks yang
    // butuh ribuan token mikir. Diturunkan ke 1/4 (tetap dijamin minimum
    // 1.024 sesuai syarat Anthropic) supaya worst-case token yang ditagih
    // (dan worst-case durasi, lihat timeoutMs di bawah) tidak naik sebesar
    // sebelumnya, sambil tetap kasih jatah mikir yang jauh lebih dari cukup
    // buat sekadar menomori & menjumlah kata per bagian.
    // THINKING DIMATIKAN (permintaan user, Sept 2026): parameter 'thinking'
    // resmi Anthropic dinonaktifkan lagi. maxTokensWithThinking dipertahankan
    // sebagai nama variabel (dipakai di banyak tempat di bawah: timeoutMs,
    // body request) tapi sekarang cuma sama dengan cfg.maxOutputTokens biasa
    // (tanpa tambahan budget thinking), dan field thinking TIDAK dikirim lagi
    // di body fetch (lihat di bawah).
    let maxTokensWithThinking=cfg.maxOutputTokens;
    const url=ANTHROPIC_ENDPOINT;
    let controller=new AbortController();
    let timedOut=false,hardCapHit=false;
    // TIMEOUT (v11.5, 2 Okt 2026): timer ini IDLE-timeout — direset tiap chunk SSE masuk (lihat _armTimer),
    // jadi stream sehat yang lambat/besar TIDAK terpotong dan besar max_tokens tidak mempengaruhinya.
    // Angka di bawah hanya jatah menunggu chunk PERTAMA (termasuk waktu upload foto base64 di jaringan HP lambat)
    // dan jeda diam antar-chunk: 45 dtk percobaan pertama, 60 dtk percobaan ulang. Jangan dikaitkan ke max_tokens.
    // Batas mutlak per percobaan = _HARD_CAP_MS = _vbHardCapMs(max_tokens): minimal 180 dtk, naik untuk output besar
    // (v11.67, 9 Okt 2026 — lihat _vbHardCapMs). Anggaran waktu TIDAK lagi dijaga lewat angka ini: _VB_GEN_STALE_MS (8 menit)
    // sekarang mengukur waktu TANPA PROGRES karena stream ini menyegarkan VAI._lastGenTime lewat _vbHeartbeat() di awal
    // tiap percobaan dan tiap chunk, jadi total rantai fallback tidak bisa lagi memicu reset 'macet' palsu.
    let timeoutMs=isFirstAttempt?45000:60000;
    let timer=null; // audit Okt 2026: dimulai SETELAH token Firebase didapat
    // AUDIT Okt 2026: timer = IDLE-timeout, direset tiap chunk SSE masuk. Stream yang sehat tapi lambat
    // (Sonnet, batch banyak produk) tidak lagi di-abort sendiri; timeoutMs awal hanya jatah menunggu chunk
    // pertama. Batas mutlak per percobaan (_HARD_CAP_MS) tetap ada sebagai jaring pengaman.
    const _IDLE_MS=isFirstAttempt?45000:60000,_HARD_CAP_MS=_vbHardCapMs(maxTokensWithThinking);
    const _armTimer=function(ms){timeoutMs=ms;clearTimeout(timer);timer=setTimeout(function(){timedOut=true;controller.abort();},ms);};
    let streamOk=false,textBuf='',finishReason='',resp=null,rawText='';
    let streamErrType='',streamErrMsg='';
    // v11.67 (9 Okt 2026): preview live dibatasi ±10x/detik. Dulu _vbTryParsePartialJsonArray (memindai SELURUH teks dari
    // awal) + onPartial (render DOM) dipanggil di SETIAP potongan teks, jadi kerjanya membengkak kuadratik untuk output
    // besar dan bisa terasa berat di HP lama. Panggilan terakhir dipaksa (force) begitu stream sukses supaya preview
    // akhir tetap lengkap; hasil FINAL tetap diparse ulang oleh pemanggil seperti sebelumnya.
    let _partialAt=0;
    const _emitPartial=function(force){
      if(typeof onPartial!=='function')return;
      let _now=Date.now();
      if(!force&&_now-_partialAt<100)return;
      _partialAt=_now;
      let _arr=_vbTryParsePartialJsonArray(textBuf);
      if(_arr)try{onPartial(_arr);}catch(e){}
    };
    // FIX (audit — retry-after header Anthropic tidak pernah dibaca): diisi
    // di bawah begitu ada respons HTTP non-stream (429/503/dst) yang benar-
    // benar sampai, lalu diteruskan ke _vbParseRetryDelayMs supaya jeda
    // retry pakai angka asli dari Anthropic, bukan cuma tebakan sendiri.
    let retryAfterHeader=null;
    // LOGGING TOKEN (permintaan user, Sept 2026): tampung angka token ASLI
    // dari API (bukan estimasi) — diisi dari event 'message_start' (input +
    // cache_creation/cache_read) dan 'message_delta' (output_tokens,
    // dikirim kumulatif tiap event). Dilog ke console setelah stream
    // selesai supaya bisa dicek biaya real per generate, lihat di bawah.
    let usageInfo={input_tokens:0,cache_creation_input_tokens:0,cache_read_input_tokens:0,output_tokens:0};
    let thinkChars=0; // panjang teks 'thinking' yang sudah mengalir (ikut ditagih sbg output) — dipakai utk PERKIRAAN output percobaan terputus
    // FIX "Status 0: API error" TANPA KETERANGAN: sebelumnya kalau fetch()
    // sendiri gagal (bukan server yang balas error, tapi koneksi browser
    // gagal total — offline, diblokir firewall/DNS, ekstensi/ad-blocker,
    // dsb), pesan error asli dari browser (mis. "Failed to fetch",
    // "NetworkError when attempting to fetch resource") DIBUANG begitu saja
    // di catch di bawah (rawText cuma diisi ''). Akibatnya user cuma lihat
    // "Status 0: API error" tanpa petunjuk apa-apa. Sekarang pesan asli
    // disimpan ke netErrMsg supaya bisa ditampilkan ke user di pesan error
    // final (lihat pemanggil _vbStreamClaudeJSONWithRetry).
    let netErrMsg='';
    let netDown=false; // FIX #2: true hanya kalau fetch() ke Worker gagal total (belum ada respons HTTP sama sekali & bukan timeout)
    // FIX UX (audit lanjutan, Sept 2026 — "delay diam sebelum teks muncul"):
    // sejak parameter thinking aktif, ada jeda nyata di awal tiap percobaan
    // sebelum event text_delta pertama keluar (server 'mikir' dulu sebelum
    // mulai jawab) — jeda ini TIDAK ADA di versi sebelum thinking dipasang,
    // jadi UI (yang sebelumnya cuma diam menampilkan 'Memproses...' statis)
    // sekarang butuh sinyal eksplisit supaya user tidak mengira app macet.
    // waitMs dikirim 0 (bukan hitung mundur beneran) — pemanggil di UI cek
    // status==='thinking' buat nampilkan pesan tanpa embel countdown detik.
    _vbHeartbeat(); // v11.67: tanda hidup di awal tiap percobaan (lihat _vbHeartbeat)
    if(typeof onWait==='function'){try{onWait(0,attempt,'thinking');}catch(e){}}
    try{
      var _fbTok=await _pbGetFirebaseIdToken();
      var _attemptStart=Date.now();_armTimer(timeoutMs);
      resp=await fetch(url,{
        method:'POST',
        headers:Object.assign({'Content-Type':'application/json','X-Device-Id':_pbGetDeviceId(),'X-Firebase-Token':_fbTok},_isGroq?{'X-AI-Provider':(_pbProviderOf(model)||'groq')}:{}),
        body:_isGroq?JSON.stringify(_pbBuildGroqBody(model,promptParts,systemText,maxTokensWithThinking,true,chatMsgs)):JSON.stringify(Object.assign(
          {model:model,stream:true,max_tokens:maxTokensWithThinking,thinking:_pbThinkingParam(cfg.maxOutputTokens,model),messages:(chatMsgs&&chatMsgs.length)?chatMsgs.map(function(m){return{role:m.role,content:m.text};}):[{role:'user',content:_vbGeminiPartsToClaudeContent(promptParts)}]},
          // FIX HEMAT BIAYA (permintaan user, Sept 2026): cache_control cuma
          // ditempel kalau cacheSystem true. System prompt generate pertama
          // mode single (_vbScript3SystemPrompt) TIDAK PERNAH tembus syarat
          // minimum cache Haiku 4.5 (jauh di bawah ~4.096 token) — jadi
          // menandainya dengan cache_control percuma (tidak pernah kena HIT
          // ataupun MISS/nulis, Anthropic otomatis proses tanpa cache), maka
          // dicabut saja di pemanggil itu (lihat vbGenerate3AI). Bulk juga
          // sudah tidak pernah kirim cacheSystem=true lagi (lihat
          // _vbCallBulkBatch — dipaksa false sejak prompt caching dihapus).
          systemText?{system:[{type:'text',text:systemText,...(cacheSystem?{cache_control:{type:'ephemeral'}}:{})}]}:{}
        )),
        signal:controller.signal
      });
      if(resp.ok&&resp.body&&typeof resp.body.getReader==='function'){
        streamOk=true;
        let reader=resp.body.getReader();
        let decoder=new TextDecoder();
        let sseBuf='';
        while(true){
          let{done,value}=await reader.read();
          if(done)break;
          _armTimer(_IDLE_MS); // ada data masuk -> reset batas diam
          _vbHeartbeat(); // v11.67: data masih mengalir = proses hidup (guard 'macet' mengukur waktu tanpa progres)
          if(Date.now()-_attemptStart>_HARD_CAP_MS){timeoutMs=_HARD_CAP_MS;timedOut=true;hardCapHit=true;controller.abort();}
          sseBuf+=decoder.decode(value,{stream:true});
          let lines=sseBuf.split('\n');
          sseBuf=lines.pop();
          for(let line of lines){
            line=line.trim();
            if(!line.startsWith('data:'))continue;
            let js=line.slice(5).trim();
            if(!js)continue;
            try{
              let evt=JSON.parse(js);
              if(_isGroq){
                // Bentuk SSE Groq (OpenAI-compatible): choices[0].delta.content,
                // finish_reason, dan usage di chunk terakhir.
                if(evt.error){streamErrType=(evt.error.code==='rate_limit_exceeded')?'rate_limit_error':(evt.error.type||'error');streamErrMsg=evt.error.message||'';continue;}
                let ch0=evt.choices&&evt.choices[0];
                if(ch0){
                  let gd=(ch0.delta&&ch0.delta.content)||'';
                  if(gd){
                    textBuf+=gd;
                    _emitPartial(false);
                  }
                  if(ch0.finish_reason)finishReason=ch0.finish_reason==='stop'?'end_turn':ch0.finish_reason;
                }
                let gu=evt.usage||(evt.x_groq&&evt.x_groq.usage);
                if(gu){let _ui=_vbOaiUsageToInfo(gu,model);usageInfo.input_tokens=_ui.input_tokens;usageInfo.output_tokens=_ui.output_tokens;usageInfo.cache_read_input_tokens=_ui.cache_read_input_tokens;}
                continue;
              }
              // Bentuk SSE Claude (Anthropic Messages API) beda dari
              // Gemini/Groq: bukan satu event "delta" datar, tapi rangkaian
              // event bertipe (message_start/content_block_start/
              // content_block_delta/content_block_stop/message_delta/
              // message_stop/ping/error). Potongan teksnya ada di
              // delta.text saat type==='content_block_delta' &&
              // delta.type==='text_delta'. Alasan berhenti ada di
              // message_delta.delta.stop_reason ('end_turn' normal,
              // 'max_tokens' kalau kehabisan token — disamakan jadi
              // 'length' supaya cek finishReason yang sudah ada di kode
              // pemanggil tetap match tanpa perlu diubah).
              if(evt.type==='content_block_delta'&&evt.delta&&evt.delta.type==='text_delta'){
                let delta=evt.delta.text||'';
                if(delta){
                  textBuf+=delta;
                  _emitPartial(false);
                }
              }else if(evt.type==='content_block_delta'&&evt.delta&&evt.delta.type==='thinking_delta'){
                thinkChars+=(evt.delta.thinking||'').length;
              }else if(evt.type==='message_start'&&evt.message&&evt.message.usage){
                // usage awal: input_tokens (bagian yang TIDAK di-cache),
                // cache_creation_input_tokens (baru ditulis ke cache kali
                // ini, kena +25%), cache_read_input_tokens (kena diskon
                // ~90%, berarti cache HIT). output_tokens di sini masih 0,
                // diupdate lewat message_delta di bawah.
                let u=evt.message.usage;
                usageInfo.input_tokens=u.input_tokens||0;
                usageInfo.cache_creation_input_tokens=u.cache_creation_input_tokens||0;
                usageInfo.cache_read_input_tokens=u.cache_read_input_tokens||0;
              }else if(evt.type==='message_delta'&&evt.delta&&evt.delta.stop_reason){
                finishReason=evt.delta.stop_reason==='max_tokens'?'length':evt.delta.stop_reason;
                // message_delta juga bawa usage.output_tokens (kumulatif
                // sampai titik ini) — ambil yang terakhir/terbesar.
                if(evt.usage&&typeof evt.usage.output_tokens==='number'){
                  usageInfo.output_tokens=evt.usage.output_tokens;
                }
              }else if(evt.type==='error'&&evt.error){
                streamErrType=evt.error.type||'';
                streamErrMsg=evt.error.message||'';
              }
            }catch(e){/* baris SSE tidak lengkap/aneh, lewati aman */}
          }
        }
      }else{
        try{rawText=await resp.text();}catch(e){rawText='';}
        // FIX (audit — retry-after header): resp di sini masih Response asli
        // dari fetch() (belum ditimpa jadi objek sintetis apa pun di bawah),
        // jadi headernya masih bisa dibaca sekarang, sebelum hilang.
        try{retryAfterHeader=resp.headers&&typeof resp.headers.get==='function'?resp.headers.get('retry-after'):null;}catch(e){}
      }
    }catch(e){
      if(e&&e.pbAuthSession)throw e; // FIX (audit auth #2): jangan di-retry sebagai error jaringan
      rawText='';
      // FIX BUG BIAYA & KEANDALAN (audit mendalam, laporan user Sept 2026 —
      // "jangan sampai ada bug biaya sekecil apapun"): kalau timeout/abort
      // (controller.abort() dari setTimeout 30/45 detik di atas, atau koneksi
      // putus) terjadi SETELAH streamOk sempat ditandai true (artinya header
      // response sudah OK & sudah mulai baca body-nya, TAPI stream-nya belum
      // sempat selesai/"done" waktu exception ini muncul), SEBELUMNYA
      // streamOk TIDAK PERNAH direset balik ke false di sini — akibatnya blok
      // "if(streamOk){...}" di bawah (setelah try/catch/finally) tetap
      // dianggap SUKSES walau textBuf isinya cuma JSON TERPOTONG separuh,
      // DAN resp (masih {ok:true,status:200} dari fetch() yang tadi sempat
      // berhasil) ikut terbawa apa adanya. Dua akibatnya: (1) jaring pengaman
      // retry otomatis ~3 menit (MAX_TOTAL_WAIT_MS) SAMA SEKALI tidak sempat
      // jalan untuk kasus timeout paling umum ini (fungsi langsung "return"
      // di jalur sukses, bukan lanjut ke logika retry), padahal timeout
      // seharusnya masuk kategori transient yang WAJIB dicoba ulang otomatis
      // sama seperti 429/503/529 (lihat komentar "isTransient" di bawah);
      // (2) pemanggil (_vbCallBulkBatch/vbGenerate3AI) menerima resp.ok=true
      // dengan JSON rusak, gagal parse, lalu MENYERAH & user harus pencet
      // tombol Generate lagi SECARA MANUAL dari awal — padahal token attempt
      // yang gagal tadi (kalau sempat lewat message_start, usageInfo sudah
      // keisi & tetap dicatat lewat _vbTrackUsage di jalur "sukses palsu" ini)
      // KEMUNGKINAN BESAR sudah ditagih beneran oleh Anthropic. Hasilnya:
      // biaya dobel nyata (attempt gagal yang ditagih + generate ulang manual
      // dari nol yang juga ditagih) untuk 1x niat generate, murni gara-gara
      // klasifikasi sukses/gagal yang salah — BUKAN gara-gara 429/503 yang
      // memang sudah ditangani rapi. Sekarang streamOk & resp direset di sini
      // supaya exception APAPUN yang terjadi setelah fetch() (baik gagal
      // total maupun putus di tengah streaming) SELALU jatuh ke jalur retry
      // transient yang sama (status jadi 0, identik dengan fetch() gagal
      // total) — konsisten dengan penanganan status 0 yang sudah ada di
      // bawah, dan retry otomatis ~3 menit ikut berlaku untuk kasus ini juga.
      //
      // CATATAN BIAYA (supaya fix keandalan di atas TIDAK bikin statistik
      // biaya jadi under-count): kalau streamOk sempat true, usageInfo
      // BISA SAJA sudah keisi dari event message_start sebelum abort ini
      // terjadi — token itu kemungkinan besar SUDAH ditagih beneran oleh
      // Anthropic walau attempt-nya dibuang & di-retry dari nol. Sama
      // persis seperti pola di cabang "streamOk&&streamErrType" di bawah
      // (error di tengah stream dari Anthropic sendiri), dicatat DULU ke
      // _vbTrackUsage SEBELUM streamOk direset, supaya baik kasus timeout
      // MAUPUN error di tengah stream, dua-duanya konsisten tidak pernah
      // kehilangan catatan biaya yang sudah benar-benar tertagih.
      // UPDATE (audit biaya, 1 Okt 2026): yang tercatat di sini hanya token INPUT
      // (angka asli). Output attempt yang terputus tidak diketahui pasti, jadi
      // dicatat sebagai PERKIRAAN terpisah (outEstTok) — bukan angka resmi.
      if(streamOk&&_vbHasInterruptedUsage(usageInfo,_isGroq,textBuf.length)){
        // UPDATE (audit biaya, 1 Okt 2026): output_tokens baru terbaca di event akhir
        // yang tidak pernah datang di sini, jadi output dicatat sebagai PERKIRAAN
        // terpisah (outEstTok) dari panjang teks yang sempat mengalir. Model yang dipakai ikut dicatat.
        try{_vbTrackUsage(usageInfo,{model:model,interrupted:true,outEstTok:_vbEstInterruptedOutTok(usageInfo,textBuf.length,thinkChars,maxTokensWithThinking)});}catch(e2){}
      }
      netDown=!resp&&!timedOut&&!!e&&e.name==='TypeError';
      streamOk=false;
      resp=null;
      // Simpan pesan error asli (nama + pesan) sebelum hilang. Kalau abort
      // karena timeout, pakai pesan timeout yang sudah jelas; selain itu
      // pakai pesan asli dari browser apa adanya.
      // FIX (ikut bug timeout dinamis di atas): pesan ini dulu selalu
      // nyebut 30/45 detik hardcode padahal timeout sebenarnya sekarang
      // ikut membesar sesuai cfg.maxOutputTokens (timeoutMs) — kalau tetap
      // pakai angka lama di sini, user salah paham timeout-nya lebih
      // pendek dari yang sebenarnya terjadi.
      netErrMsg=hardCapHit?'timeout — hasil belum selesai setelah '+(_HARD_CAP_MS/1000)+' detik; data mengalir tapi terlalu lambat'
        :timedOut?'timeout — server tidak merespons dalam '+(timeoutMs/1000)+' detik'
        :((e&&e.name)?e.name+': ':'')+((e&&e.message)?e.message:String(e));
    }finally{
      clearTimeout(timer);
    }
    // Event type 'error' bisa muncul DI TENGAH stream (HTTP status-nya
    // sudah kadung 200) — mis. server overload pas lagi jalan. Kalau itu
    // terjadi, jangan dianggap sukses walau streamOk true; jatuhkan ke
    // jalur retry yang sama seperti error HTTP biasa, dengan status
    // sintetis dipetakan dari tipe error Anthropic-nya.
    if(streamOk&&streamErrType){
      streamOk=false;
      // FIX AKURASI BIAYA (audit lanjutan, statistik biaya & cache): stream ini
      // SEMPAT mulai (server sudah balas event message_start, usageInfo sudah
      // keisi input_tokens/cache_*) tapi error DI TENGAH jalan (mis. server
      // overload) — Anthropic kemungkinan besar SUDAH menagih token input
      // (dan kadang output sebagian) attempt ini walau hasilnya dibuang &
      // bakal di-retry dari nol. Sebelumnya usageInfo di sini dibuang total
      // tanpa pernah masuk _vbTrackUsage sama sekali, jadi biaya attempt
      // gagal ini TIDAK PERNAH tercatat di panel statistik — angka yang
      // tampil bisa lebih RENDAH dari biaya real yang benar-benar tertagih.
      // Sekarang dicatat sebagai baris riwayat tersendiri SEBELUM jatuh ke
      // retry (kalau retry berikutnya sukses, itu tetap tercatat lagi
      // sebagai baris terpisah — memang dua-duanya kena biaya beneran kalau
      // attempt pertama sempat mulai diproses server).
      if(_vbHasInterruptedUsage(usageInfo,_isGroq,textBuf.length)){
        try{_vbTrackUsage(usageInfo,{model:model,interrupted:true,outEstTok:_vbEstInterruptedOutTok(usageInfo,textBuf.length,thinkChars,maxTokensWithThinking)});}catch(e){}
      }
      resp={ok:false,status:streamErrType==='overloaded_error'?529:(streamErrType==='rate_limit_error'?429:(/^(invalid_request|authentication|permission|not_found|request_too_large)/.test(streamErrType)?400:500))};
      rawText=JSON.stringify({error:{type:streamErrType,message:streamErrMsg}});
    }
    // audit Okt 2026: stream ditutup diam-diam tanpa stop_reason DAN teks tidak berujung ] / } = terputus, bukan sukses
    if(streamOk&&!finishReason&&!/[\]\}]\s*(```)?\s*$/.test(textBuf)){
      streamOk=false;
      try{if(_vbHasInterruptedUsage(usageInfo,_isGroq,textBuf.length))_vbTrackUsage(usageInfo,{model:model,interrupted:true,outEstTok:_vbEstInterruptedOutTok(usageInfo,textBuf.length,thinkChars,maxTokensWithThinking)});}catch(e){}
      resp={ok:false,status:0};
      netErrMsg='koneksi terputus sebelum hasil selesai diterima';
      rawText=netErrMsg;
    }
    if(streamOk){
      _emitPartial(true); // v11.67: preview akhir selalu lengkap walau potongan terakhir tertahan throttle
      // LOGGING TOKEN: cetak angka usage ASLI dari API (bukan estimasi)
      // ke console, supaya bisa dicek langsung berapa token beneran
      // dipakai + apakah cache kena HIT (cache_read>0) atau MISS/nulis
      // baru (cache_creation>0) atau malah gak ke-cache sama sekali
      // (keduanya 0 — misal karena model-nya belum tembus syarat minimum
      // token, lihat catatan di atas fungsi ini).
      let cacheStatus=usageInfo.cache_read_input_tokens>0?'HIT (diskon ~90%)'
        :usageInfo.cache_creation_input_tokens>0?'MISS/nulis baru (kena +25%)'
        :'tidak ke-cache';
      console.log('[vbUsage] model='+model
        +' | input='+usageInfo.input_tokens
        +' cache_write='+usageInfo.cache_creation_input_tokens
        +' cache_read='+usageInfo.cache_read_input_tokens
        +' output='+usageInfo.output_tokens
        +' | cache: '+cacheStatus);
      // Kalau stream berakhir tanpa event usage akhir (output_tokens masih 0 padahal
      // teks sudah mengalir), output dicatat sebagai perkiraan terpisah.
      try{_vbTrackUsage(usageInfo,{model:model,outEstTok:_vbEstInterruptedOutTok(usageInfo,textBuf.length,thinkChars,maxTokensWithThinking)});}catch(e){}
      return{resp:{ok:true,status:200},rawText:JSON.stringify({candidates:[{content:{parts:[{text:textBuf}]},finishReason:finishReason}]}),usage:usageInfo};
    }
    // Stream gagal start (error jaringan/HTTP) — jatuh ke logika retry
    // yang sama persis seperti jalur non-streaming lama.
    let status=resp?resp.status:0;
    // BUG FIX (audit lanjutan, Sept 2026): sebelumnya timeout/koneksi
    // putus total (fetch() gagal SEBELUM sempat dapat respon HTTP apa pun
    // — status jadi 0 di sini) TIDAK dianggap transient, jadi langsung
    // nyerah di percobaan pertama TANPA retry sama sekali — beda dengan
    // 429/503 yang sabar dicoba ulang sampai jaring pengaman ~3 menit.
    // Padahal di 4G yang kadang lag/putus sebentar, timeout justru paling
    // sering SEMENTARA dan paling masuk akal buat dicoba ulang — bukan
    // alasan buat langsung menyerah. Sekarang status 0 (timeout/network
    // error) ikut dianggap transient sama seperti 429/503/529, tetap
    // dibatasi jaring pengaman MAX_TOTAL_WAIT_MS yang sama (~3 menit)
    // supaya kalau internetnya memang benar-benar mati, tidak dicoba
    // selamanya. Status 529 = kode resmi Anthropic untuk server overload.
    let isBlocked403=_vbIsRegionBlock403(status,rawText)&&blocked403Retries<_VB_403_MAX_RETRY;
    if(isBlocked403)blocked403Retries++;
    let isServerErr=(status===500||status===502||status===504)&&serverErrRetries<2; // audit Okt 2026: 5xx Worker/Cloudflare ikut di-retry (maks 2x)
    if(isServerErr)serverErrRetries++;
    let isTransient=status===503||status===429||status===529||status===0||isBlocked403||isServerErr;
    if(!isTransient||failFast||totalWaited>=MAX_TOTAL_WAIT_MS||(Date.now()-_loopStart)>=MAX_TOTAL_ELAPSED_MS){
      // Kalau fetch gagal total (status 0, resp null) dan belum ada rawText,
      // selipkan pesan error jaringan asli (netErrMsg) supaya pemanggil bisa
      // menampilkannya, bukan cuma "Status 0: API error" yang tidak jelas.
      if(!resp&&netErrMsg&&!rawText)rawText=netErrMsg;
      return{resp:resp||{ok:false,status:0},rawText,netDown:netDown};
    }
    let waitMs;
    if(isBlocked403){
      waitMs=1500*blocked403Retries;
    }else if(status===429){
      let suggested=_vbParseRetryDelayMs(rawText,retryAfterHeader);
      waitMs=suggested?Math.min(suggested,45000):Math.min(9000*(attempt+1),45000);
    }else{
      // FIX (audit — retry-after header): sebelumnya status selain 429
      // (503/529/dst) juga tidak pernah cek header ini walau Anthropic bisa
      // saja mengirimkannya untuk status-status itu juga — sekarang dicek
      // dulu di sini juga, baru jatuh ke hitungan mundur tebakan kalau
      // headernya memang tidak ada.
      let suggested=_vbParseRetryDelayMs('',retryAfterHeader);
      waitMs=suggested?Math.min(suggested,45000):Math.min(1500*(attempt+1),15000);
    }
    if(typeof onWait==='function'){try{onWait(waitMs,attempt,status);}catch(e){}}
    await new Promise(r=>setTimeout(r,waitMs));
    totalWaited+=waitMs;
  }
}

// BUG FIX (Sept 2026): escape karakter kontrol mentah (newline/tab/CR/dll)
// yang muncul DI DALAM string literal JSON hasil AI, supaya JSON.parse tidak
// gagal total dengan "Bad control character in string literal" — lihat
// catatan lengkap di titik pemanggilannya (_vbCallBulkBatch & vbGenerate3AI).
// Cuma karakter kontrol yang posisinya DI DALAM tanda kutip (inStr true)
// yang di-escape; whitespace/newline DI LUAR string (pemisah antar token
// JSON, tetap valid) dibiarkan apa adanya.
function _vbSanitizeJsonText(s){
  s=String(s||'');
  let out='',inStr=false,esc=false;
  for(let i=0;i<s.length;i++){
    let ch=s[i];
    if(inStr){
      out+=ch;
      if(esc){ esc=false; continue; }
      if(ch==='\\'){ esc=true; continue; }
      if(ch==='"'){ inStr=false; continue; }
      let code=ch.charCodeAt(0);
      if(code<0x20){
        out=out.slice(0,-1); // buang karakter mentah yang barusan ditambahkan
        if(ch==='\n')out+='\\n';
        else if(ch==='\r')out+='\\r';
        else if(ch==='\t')out+='\\t';
        else out+='\\u'+code.toString(16).padStart(4,'0');
      }
    }else{
      if(ch==='"')inStr=true;
      out+=ch;
    }
  }
  return out;
}

// Coba CLAUDE_MODEL_PRIMARY (lewat _vbStreamClaudeJSONWithRetryModel,
// termasuk retry internalnya sampai jaring pengaman ~3 menit).
// FIX BUG KRITIS (audit lanjutan, Sept 2026 — lihat catatan panjang di
// atas CLAUDE_MODEL_PRIMARY/FALLBACK): DULU di sini ada siklus percobaan
// ke-2 penuh ke CLAUDE_MODEL_FALLBACK kalau PRIMARY gagal total — sudah
// DIHAPUS karena FALLBACK sekarang identik dengan PRIMARY, jadi siklus
// ke-2 itu cuma mengulang model yang PERSIS SAMA dari nol (bukan lagi
// "pindah AI" beneran) sambil dobel total waktu tunggu sebelum gagal
// (~3 menit jadi ~6+ menit) — sampai bentrok dengan _VB_GEN_STALE_MS (5
// menit) dan memicu _vbGuardGenerating() salah reset _isGenerating.
// Kalau nanti CLAUDE_MODEL_FALLBACK diisi model lain yang beneran beda,
// siklus percobaan ke-2 boleh ditambahkan balik di sini secara sadar.
// FIX HEMAT BIAYA (permintaan user, Sept 2026): parameter cacheSystem baru
// (default true) — dilempar apa adanya ke _vbStreamClaudeJSONWithRetryModel
// supaya bisa dimatikan KHUSUS untuk pemanggil yang system prompt-nya
// memang belum tembus syarat minimum cache (lihat vbGenerate3AI, satu-
// satunya pemanggil yang mengirim false). Semua pemanggil lain tidak
// perlu diubah — otomatis tetap true seperti sebelumnya.
async function _vbStreamClaudeJSONWithRetry(promptParts,onPartial,onWait,systemText,cacheSystem,maxOutputTokensOverride,maxTotalWaitMs){
  if(cacheSystem===undefined)cacheSystem=true;
  return await _vbStreamClaudeJSONWithRetryModel(_pbModelId(),promptParts,onPartial,onWait,systemText,cacheSystem,maxOutputTokensOverride,maxTotalWaitMs);
}

// ── FALLBACK GENERATE UTAMA (v11.2, 2 Okt 2026, permintaan user) ─────────────
// Kalau model utama generate-nya GAGAL (error API / limit / timeout setelah retry di dalam
// _vbStreamClaudeJSONWithRetryModel), tugas generate dialihkan otomatis ke model cadangan berikutnya di rantainya.
// Perbaikan jumlah kata untuk hasil yang datang dari model cadangan memakai rantai sendiri:
// Groq 2x lalu GPT-OSS 1x (VB_GEN_FALLBACK_FIX_CHAIN, dibaca _vbFixPlan lewat _vbFixChainOverride).
// TIDAK dialihkan untuk: 413 (kebesaran, ditangani pemecahan batch di pemanggil), 401, dan 403 kuota/login/model_not_allowed
// (bukan salah model; model lain pasti ikut ditolak). Batas tunggu retry per model 45 detik (bukan 3 menit) supaya total
// 3 model tetap wajar (idle-timeout 45/60 dtk; sejak v11.67 _VB_GEN_STALE_MS (8 menit) mengukur waktu TANPA progres lewat _vbHeartbeat, jadi total rantai tidak lagi memicu reset 'macet' palsu). Error sesi login (pbAuthSession) tetap dilempar ke pemanggil.
const VB_GEN_FALLBACK_ENABLED=true;
// Rantai cadangan per model utama (v11.6, 8 Okt 2026, permintaan user: default user biasa balik ke Haiku —
// lihat PB_DEFAULT_USER_MODEL). Kunci = model utama yang aktif; model utama yang TIDAK ada di sini = fallback mati
// (dulu cuma 'gemini' yang didaftar, jadi waktu model utama Haiku generate-nya gagal tidak pernah dialihkan ke mana pun).
// Urutan haiku disamakan dengan pola rantai perbaikan kata yang sudah ada untuk Haiku (VB_FIX_CHAINS_BY_MAIN.haiku: Gemini dulu, baru Groq).
const VB_GEN_FALLBACK_MODELS_BY_MAIN={
  gemini:['haiku','groq'],
  haiku:['gemini','groq']
};
const VB_GEN_FALLBACK_STEP_WAIT_MS=45000;                // batas tunggu retry per model
const VB_GEN_FALLBACK_FIX_CHAIN=[{key:'groq',tries:3,extraTok:0},{key:'gptoss',tries:2,extraTok:1500}];
var _vbFixChainOverride=null; // diisi _vbGenerateWithFallback kalau hasil generate datang dari model cadangan
// Catat percobaan generate yang GAGAL (tanpa token/biaya) supaya admin bisa lihat "Gemini gagal -> dialihkan ke Haiku".
function _vbLogFailedAttempt(mKey,out,toKey){
  var st=out&&out.resp?out.resp.status:0;
  _vbLogUsageEvent('generate',_vbCurrentCallMode,null,0,{model:mKey,failed:true,status:st,to:toKey||''});
}
function _vbGenNoFallback(out){
  var st=out&&out.resp?out.resp.status:0;
  if(out&&out.netDown)return true; // FIX #2: Worker tidak terjangkau -> Haiku/Groq (URL Worker sama) pasti ikut gagal; timeout/stream putus tetap boleh fallback
  if(st===413||st===401)return true;
  if(st===403){
    var t='';try{var j=JSON.parse((out&&out.rawText)||'{}');t=(j&&j.error&&j.error.type)||'';}catch(e){}
    if(t==='quota_exceeded'||t==='login_required'||t==='model_not_allowed')return true;
  }
  return false;
}
// FIX #1 (audit Okt 2026): sesuaikan foto & label [Image N] dengan batas model yang SEDANG dipanggil.
// Prompt dilabeli sesuai batas model utama (Gemini 16); saat jatuh ke Groq (3 foto) / GPT-OSS (0 foto), foto di atas batas
// dibuang diam-diam tapi labelnya tetap ada -> AI bisa salah mencocokkan / mengarang isi foto. Di sini foto di atas batas
// dibuang DAN label [Image k] (k > batas) dihapus dari teks. Claude tidak dibatasi (100), jadi parts dikembalikan apa adanya.
function _pbFitPartsToModel(parts,modelId){
  var cap=_pbIsGroqModel(modelId)?_pbOaiCfg(modelId).maxImages:100;
  var total=0;
  (parts||[]).forEach(function(p){if(p&&(p.inline_data||p.inlineData))total++;});
  if(total<=cap)return parts;
  var seen=0;
  return (parts||[]).filter(function(p){
    if(p&&(p.inline_data||p.inlineData)){seen++;return seen<=cap;}
    return true;
  }).map(function(p){
    if(p&&typeof p.text==='string'&&p.text.indexOf('[Image ')>=0){
      return Object.assign({},p,{text:p.text.replace(/\s?\[Image (\d+)\]/g,function(m,n){return parseInt(n,10)>cap?'':m;})});
    }
    return p;
  });
}
async function _vbGenerateWithFallback(promptParts,onPartial,onWait,systemText,cacheSystem,maxOutputTokens){
  _vbFixChainOverride=null;
  const mainKey=pbGetAiModelKey();
  const fallbackModels=VB_GEN_FALLBACK_MODELS_BY_MAIN[mainKey];
  if(!VB_GEN_FALLBACK_ENABLED||!fallbackModels){
    return await _vbStreamClaudeJSONWithRetry(promptParts,onPartial,onWait,systemText,cacheSystem,maxOutputTokens);
  }
  const keys=[mainKey].concat(fallbackModels);
  let out=null;
  for(let i=0;i<keys.length;i++){
    const m=PB_AI_MODELS[keys[i]];
    if(!m)continue;
    out=await _vbStreamClaudeJSONWithRetryModel(m.id,_pbFitPartsToModel(promptParts,m.id),onPartial,onWait,systemText,cacheSystem,maxOutputTokens,VB_GEN_FALLBACK_STEP_WAIT_MS);
    if(out&&out.resp&&out.resp.ok){
      if(i>0)_vbFixChainOverride=VB_GEN_FALLBACK_FIX_CHAIN;
      return out;
    }
    try{_vbLogFailedAttempt(keys[i],out,(i<keys.length-1&&!_vbGenNoFallback(out))?keys[i+1]:'');}catch(eLog){}
    if(i===keys.length-1||_vbGenNoFallback(out))return out;
    var nextM=PB_AI_MODELS[keys[i+1]];
    console.warn('[_vbGenerateWithFallback] '+m.label+' gagal (status '+(out&&out.resp?out.resp.status:'?')+'), dialihkan ke '+(nextM?nextM.label:'?'));
    try{genLogoEvent('retry',{from:(m&&m.label)||'',to:(nextM&&nextM.label)||''});}catch(eGl){} // loader skrip: adegan "ganti model" (no-op kalau tidak ada loader)
    try{if(typeof showToast==='function'&&nextM)showToast(i===0?'Server utama gagal merespons, mengalihkan ke server lain...':'Server cadangan juga gagal merespons, mencoba server lain...');}catch(e){}
  }
  return out;
}

// (v11.67, 9 Okt 2026: _vbFetchWithTimeout dihapus — hanya dipakai jalur non-stream lama yang sudah tidak punya pemanggil.)

// ── PENANGANAN APP DI-BACKGROUND / LAYAR DIKUNCI SAAT GENERATE ──────────
// Kalau HP di-lock atau tab/app dipindah ke background selagi proses
// generate (termasuk saat lagi nunggu retry 429/503), banyak browser/WebView
// mobile menunda ATAU (kalau layar sampai kekunci) mem-freeze total timer JS
// & koneksi network — bikin proses kerasa macet lebih lama dari seharusnya
// waktu user balik lagi ke app. Dua penanganan dipasang:
// (1) Screen Wake Lock — cegah PENYEBAB PALING UMUM (layar auto-lock sendiri
//     karena user diam megang HP nunggu) dengan minta layar tetap menyala
//     selama proses generate berlangsung. Wake Lock otomatis lepas sendiri
//     kalau user pindah tab/app manual (browser yang mewajibkan ini demi
//     baterai) — itu di luar kendali kode, makanya ada penanganan (2).
// (2) Deteksi visibilitychange — kalau user tetap pindah app/tab manual di
//     tengah proses, begitu mereka balik lagi kasih toast yang jujur ("app
//     sempat di-background, makanya kerasa lama") daripada user bingung
//     kirain macet/rusak.
let _vbWakeLock=null;
async function _vbAcquireWakeLock(){
  try{
    if('wakeLock' in navigator){
      _vbWakeLock=await navigator.wakeLock.request('screen');
      // audit Okt 2026 (v11.85): request ini async — kalau proses sudah selesai/gagal sebelum izin turun, lepaskan langsung (jangan bocor).
      if(!(typeof VAI!=='undefined'&&VAI&&VAI._isGenerating)){try{_vbWakeLock.release();}catch(_e){}_vbWakeLock=null;}
    }
  }catch(e){
    // Gagal (mis. browser tidak dukung, atau baterai rendah/hemat daya
    // aktif) — dibiarkan, proses generate tetap jalan seperti biasa,
    // cuma tanpa proteksi ini.
    _vbWakeLock=null;
  }
}
function _vbReleaseWakeLock(){
  try{if(_vbWakeLock){_vbWakeLock.release();_vbWakeLock=null;}}catch(e){}
}
let _vbHiddenSinceTs=0;
document.addEventListener('visibilitychange',function(){
  if(document.hidden){
    if(VAI&&VAI._isGenerating)_vbHiddenSinceTs=Date.now();
  }else{
    if(VAI&&VAI._isGenerating&&_vbHiddenSinceTs>0){
      let hiddenSec=Math.round((Date.now()-_vbHiddenSinceTs)/1000);
      // Cuma kasih tau kalau sempat cukup lama (>3 detik) di-background —
      // dibawah itu biasanya cuma notifikasi sekilas/switch app sebentar,
      // tidak perlu ganggu user dengan toast tiap kali.
      if(hiddenSec>3){
        showToast('Selamat datang kembali — proses masih lanjut (sempat '+hiddenSec+' detik di background).','success');
      }
    }
    _vbHiddenSinceTs=0;
  }
});


// (v11.67, 9 Okt 2026: _vbFetchWithRetry & _vbFetchWithClaudeFallback — jalur non-stream lama — dihapus karena tidak punya
// pemanggil sama sekali. Satu-satunya jalur AI yang aktif = _vbStreamClaudeJSONWithRetryModel (+ _vbGenerateWithFallback).)

// ── STAT REAL PEMAKAIAN "PERBAIKAN JUMLAH KATA" (permintaan user, Sept 2026)
// Sebelumnya estimasi biaya loop 3x percobaan ini cuma perkiraan kasar
// (lihat obrolan) — sekarang dicatat dari angka token ASLI yang dikembalikan
// API tiap kali _vbFixWordCountIfNeeded/_vbFixWordCountBatchIfNeeded benar-
// benar memanggil AI (bukan estimasi). Harga per-token pakai tarif resmi
// Claude Sonnet 5.5 saat ini ($2/juta token input, $10/juta token output) —
// (nama variabel HAIKU_PRICE_* sengaja tidak diganti supaya tidak ubah banyak
// tempat; isinya sekarang tarif Sonnet 5.5).
var PB_FIXSTATS_KEY='pb_wordfix_stats_v1';
var HAIKU_PRICE_IN_PER_MTOK=2.0;   // USD per 1,000,000 token input (Sonnet 5.5)
var HAIKU_PRICE_OUT_PER_MTOK=10.0; // USD per 1,000,000 token output (Sonnet 5.5)
// FIX AKURASI BIAYA (permintaan user, Sept 2026): tarif resmi Anthropic untuk
// prompt caching — token yang BARU ditulis ke cache (cache_creation) kena
// markup +25% dari tarif input biasa, token yang DIBACA dari cache
// (cache_read) didiskon jadi cuma 10% dari tarif input biasa (~90% lebih
// murah). Dulu kedua jenis ini disamakan dengan token biasa (tarif flat),
// sekarang dihitung terpisah lewat _vbCalcUsd di bawah.
var HAIKU_PRICE_CACHE_WRITE_MULT=1.25;
var HAIKU_PRICE_CACHE_READ_MULT=0.1;
// TARIF PER MODEL (audit biaya, 1 Okt 2026): _vbCalcUsd sekarang menerima
// KUNCI MODEL (sonnet/haiku/groq/gemini) sebagai argumen ke-5 dan memakai
// tarif model itu — TIDAK lagi memakai model yang sedang dipilih. Kalau kunci
// kosong/tidak dikenal (catatan lama sebelum nama model dicatat), dipakai
// tarif asumsi VB_LEGACY_MODEL_KEY. Ubah konstanta ini kalau riwayat lamamu
// sebenarnya dari model lain (mis. 'haiku').
var VB_LEGACY_MODEL_KEY='sonnet';
