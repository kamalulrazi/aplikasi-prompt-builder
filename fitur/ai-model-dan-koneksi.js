// fitur/ai-model-dan-koneksi.js — Pilihan model AI dan koneksi ke server AI (token, admin).
// Bagian dari js/10-main-app.js lama (baris 5726–6110). Isi tidak diubah.
// ============================================================
// BUG FIX: konstanta ini dipakai di vbGenerate3AI() & _vbCallBulkBatch() tapi
// sebelumnya tidak pernah dideklarasikan di mana pun → setiap generate AI di
// Video Builder langsung error "GEMINI_ENDPOINT is not defined" dan gagal total.
// GANTI model di bawah kalau kamu memang mau pakai versi model lain.
// ── PINDAH KE CLAUDE (permintaan user, Sep 2026) ─────────────────────────
// Sebelumnya provider-nya Groq (sebelum itu Gemini). Sekarang diganti ke
// Claude (Anthropic) — endpoint Messages API resminya, BUKAN format
// request/response Gemini/OpenAI. Supaya semua kode pemanggil di bawah
// (_vbFetchWithClaudeFallback, _vbStreamClaudeJSONWithRetryModel, dst —
// namanya sengaja TIDAK diganti biar tidak perlu ubah puluhan call-site
// lain) tidak perlu diubah satu-satu, kedua fungsi itu yang menerjemahkan:
// request dibungkus ulang jadi format Claude (content blocks {type:'text'}/
// {type:'image',source:{...}}) sebelum dikirim, lalu response Claude
// dibungkus BALIK jadi bentuk {candidates:[{content:{parts:[{text}]}}]}
// persis seperti balikan Gemini — jadi seluruh kode yang membaca
// data.candidates[0].content.parts[0].text tetap jalan apa adanya.
// CATATAN CORS: Claude API baru bisa dipanggil langsung dari browser kalau
// header 'anthropic-dangerous-direct-browser-access':'true' disertakan di
// tiap request (lihat _vbStreamClaudeJSONWithRetryModel &
// _vbFetchWithClaudeFallback) — tanpa header ini browser akan diblokir CORS.
// ── PROXY (permintaan user, Sep 2026) ───────────────────────────────────
// App TIDAK LAGI memanggil api.anthropic.com langsung dari browser dan
// TIDAK LAGI minta API Key dari user. Semua request AI sekarang lewat
// Cloudflare Worker proxy milik pemilik app (API key Claude disimpan aman
// di server sebagai secret, tidak pernah terkirim ke browser user).
// GANTI URL ini kalau nanti pindah/redeploy Worker-nya.
const ANTHROPIC_ENDPOINT='https://promptbuilder.vid1hihu.workers.dev';
// (v11.67: konstanta ANTHROPIC_VERSION dihapus — tidak pernah dipakai; aplikasi ini tidak mengirim header anthropic-version.)
// Identitas anonim per-perangkat (bukan data pribadi) — dipakai Worker
// buat menghitung kuota generate per user/device, bukan per-key lagi
// (karena key sekarang shared/milik pemilik app, bukan per-user).
function _pbGetDeviceId(){
  try{
    var k='pb_device_id_v1';
    var id=localStorage.getItem(k);
    if(id)return id;
    id='dev-'+Array.from(crypto.getRandomValues(new Uint8Array(12))).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
    localStorage.setItem(k,id);
    return id;
  }catch(e){return 'dev-unknown';}
}
// FIX KEAMANAN #2 lanjutan (nutup celah kuota Gratis anonim, Sept 2026):
// Worker proxy sekarang verifikasi tier lewat Firestore ID token, bukan
// dari localStorage lagi (lihat komentar besar dekat PB_FIREBASE_CONFIG).
// Fungsi ini ambil ID token user yang sedang login lalu dikirim ke Worker
// tiap generate lewat header X-Firebase-Token — TANPA ini, Worker anggap
// semua orang anonim dan user Standar/Premium ikut kena limit Gratis.
// getIdToken() Firebase SDK otomatis refresh sendiri kalau token sudah
// lama (>1 jam), jadi aman dipanggil tiap request tanpa cache manual di
// sini. Kosong ('') kalau belum login / Firebase belum siap — app tetap
// jalan normal sebagai anonim (kena limit Gratis + pagar IP di Worker).
// FIX (audit auth #2, Sept 2026): kalau user sudah login tapi sesi Firebase belum siap
// (signInWithCredential masih jalan / sesi dipulihkan), TUNGGU dulu (maks 8 dtk). Kalau tetap
// kosong padahal paket berbayar, JANGAN kirim anonim (Worker akan pakai limit Gratis) —
// lempar error jelas (err.pbAuthSession). User Gratis tetap jalan seperti biasa.
function _pbWaitFirebaseUser(ms){
  return new Promise(function(resolve){
    var done=false,unsub=null,t=null;
    function fin(){
      if(done)return; done=true; clearTimeout(t);
      try{unsub&&unsub();}catch(e){}
      var u=null; try{u=firebase.auth().currentUser;}catch(e){}
      resolve(u);
    }
    t=setTimeout(fin,ms);
    try{unsub=firebase.auth().onAuthStateChanged(function(u){if(u)fin();});}catch(e){fin();return;}
    try{if(window.pbCloudReady&&window.pbCloudReady.then)window.pbCloudReady.then(fin,fin);}catch(e){}
  });
}
async function _pbGetFirebaseIdToken(){
  var loggedIn=false,paid=false;
  try{loggedIn=!!localStorage.getItem('pb_auth_user');paid=(typeof pbGetTier==='function'&&pbGetTier()!=='free');}catch(e){}
  try{
    if(typeof firebase!=='undefined'&&firebase.auth){
      var u=firebase.auth().currentUser;
      if(!u&&loggedIn)u=await _pbWaitFirebaseUser(8000);
      if(u){var t=(await u.getIdToken())||'';if(t)return t;}
    }
  }catch(e){}
  if(loggedIn&&paid&&navigator.onLine!==false){
    var err=new Error('Sesi akunmu belum tersambung ke server, jadi paket berbayarmu belum bisa dipakai. Tutup lalu buka lagi aplikasinya; kalau masih sama, keluar lalu login ulang.');
    err.pbAuthSession=true;
    throw err;
  }
  return '';
}
// FIX (permintaan user, Sept 2026): Sonnet-5 SEBAGAI CADANGAN DIMATIKAN
// TOTAL — sebelumnya kalau Haiku gagal total setelah retry habis, app
// otomatis pindah ke Sonnet-5. Sekarang HANYA Haiku 4.5 yang dipakai,
// tidak ada lagi model lain. CLAUDE_MODEL_FALLBACK SENGAJA disamakan
// nilainya dengan CLAUDE_MODEL_PRIMARY (bukan dihapus) — kalau nanti mau
// aktifkan model fallback yang BEDA lagi, cukup ganti nilai konstanta
// ini kembali.
// FIX BUG KRITIS (audit lanjutan, Sept 2026 — "stale-guard reset
// isGenerating padahal proses masih hidup"): comment versi lama di sini
// menganggap "percobaan ke-2 pakai fallback otomatis jadi retry biasa"
// itu netral/aman. TERNYATA TIDAK — _vbStreamClaudeJSONWithRetry dan
// _vbFetchWithClaudeFallback tetap menjalankan SIKLUS PERCOBAAN PENUH
// ke-2 dari nol (jaring pengaman ~3 menit lagi di
// _vbStreamClaudeJSONWithRetryModel) walau modelnya persis sama —
// membuat total tunggu sebelum benar-benar gagal bisa sampai ~6+ menit,
// MELEWATI _VB_GEN_STALE_MS (5 menit) di bawah. Kalau itu kejadian saat
// primary kena error transient (429/503/529) berturut-turut,
// _vbGuardGenerating() auto-reset VAI._isGenerating=false padahal
// fetch/stream aslinya masih jalan di background — user bisa pencet
// Generate lagi, 2 request jalan bersamaan, biaya token dobel, kartu
// bisa ketiban. Sekarang KEDUA fungsi itu sudah diubah supaya hanya
// menjalankan 1 siklus percobaan (PRIMARY) selama CLAUDE_MODEL_FALLBACK
// masih sama dengan CLAUDE_MODEL_PRIMARY — total tunggu balik ke ~3
// menit sesuai janji komentar MAX_TOTAL_WAIT_MS, aman di bawah
// _VB_GEN_STALE_MS. Kalau nanti CLAUDE_MODEL_FALLBACK diisi model BEDA
// lagi, siklus percobaan ke-2 perlu ditambahkan balik secara sadar di
// kedua fungsi itu (bukan otomatis aktif lagi).
// GANTI MODEL (permintaan user, 30 Sep 2026): Haiku 4.5 -> Claude Sonnet 5.5
// ('claude-sonnet-5-5', tarif $2/juta input & $10/juta output — tier Sonnet
// termurah saat ini, sama dengan Sonnet 5). System prompt & pesan user TIDAK
// diubah sama sekali, cuma ID model + parameter thinking di bawah.
// PENTING: Worker proxy (ANTHROPIC_ENDPOINT) harus mengizinkan ID model ini
// kalau di sisi Worker ada whitelist model.
// PILIHAN MODEL (permintaan user, 30 Sep 2026): tombol Sonnet / Haiku di tab
// Panduan (#pb-model-picker). Pilihan disimpan di localStorage dan dibaca
// SETIAP panggilan AI lewat _pbModelId() — system prompt & pesan user
// SAMA PERSIS untuk kedua model, yang beda cuma ID model. 'thinking' dan
// tarif harga ikut model karena aturan API-nya memang berbeda: Sonnet 5.5
// wajib {type:'between_tools'} (menolak 'disabled'), sedangkan Haiku 4.5
// tidak menyalakan thinking kalau field itu tidak dikirim (undefined otomatis
// dibuang JSON.stringify). Tarif Haiku 4.5 = $1/juta input & $5/juta output.
// PENTING: Worker proxy harus mengizinkan kedua ID model ini kalau ada whitelist.
var PB_AI_MODELS={
  sonnet:{id:'claude-sonnet-5-5',label:'Sonnet',thinking:{type:'between_tools'},priceIn:2.0,priceOut:10.0},
  haiku:{id:'claude-haiku-4-5-20251001',label:'Haiku',thinking:undefined,priceIn:1.0,priceOut:5.0},
  // GROQ (permintaan user, Sep-Okt 2026): Qwen 3.8 27B — model vision Groq yang
  // aktif (Llama 4 Scout sudah dipensiunkan Groq). Bisa baca foto (maks 3 foto
  // per request), tarif $0.80/juta input & $4.00/juta output, maks output 16384.
  // Lewat Worker proxy yang sama (format OpenAI-compatible, lihat _pbBuildGroqBody).
  // Mode 'instruct' (reasoning_effort:none) dipakai supaya cepat & hemat token.
  groq:{id:'qwen/qwen3.8-27b',label:'Groq',provider:'groq',thinking:undefined,priceIn:0.80,priceOut:4.00},
  // GROQ GPT-OSS (permintaan user, 1 Okt 2026): OpenAI gpt-oss-120b lewat Groq.
  // Jalur, system prompt, & format pesan SAMA PERSIS dengan 'groq' di atas
  // (provider:'groq' -> _pbBuildGroqBody). Beda kecil yang wajib:
  //  - reasoning:'low'  -> model ini TIDAK menerima reasoning_effort 'none'
  //    (hanya low/medium/high). 'low' = paling cepat & hemat token.
  //  - maxImages:0      -> model ini teks saja (tidak bisa baca foto), jadi foto
  //    tidak dikirim & label [Image N] tidak dipasang.
  // Tarif Groq: $0.15/juta input & $0.60/juta output.
  // PENTING: id ini juga harus ada di GROQ_MODELS pada Worker proxy.
  gptoss:{id:'openai/gpt-oss-120b',label:'GPT-OSS',provider:'groq',thinking:undefined,priceIn:0.15,priceOut:0.60,reasoning:'low',maxImages:0},
  // GEMINI (permintaan user, 1 Okt 2026): model Gemini TERMURAH yang masih bisa
  // baca foto = Gemini 2.5 Flash-Lite, lewat endpoint OpenAI-compatible Google
  // (Worker yang sama, key di secret GEMINI_API_KEY). Tarif paid tier
  // $0.10/juta input & $0.40/juta output. reasoning_effort:'none' mematikan
  // thinking (hanya valid untuk seri 2.5). CATATAN: model 2.5 adalah generasi
  // lama; kalau nanti diberi 404/pensiun, ganti ke 'gemini-3.5-flash-lite'
  // (sekitar $0.15/$1.25) DAN ubah reasoning gemini di PB_OAI_PROVIDERS jadi
  // 'minimal' (seri 3.x tidak menerima 'none').
  // FIX 404 (1 Okt 2026, v9.8): gemini-2.5-flash-lite 'no longer available to new users' (Google, 18 Sep 2026).
  // Diganti gemini-3.5-flash-lite (GA, tarif $0.30 input / $2.50 output per juta token, cache baca $0.03).
  // Alternatif lebih murah kalau suatu saat perlu: 'gemini-3.1-flash-lite' ($0.25/$1.50).
  gemini:{id:'gemini-3.5-flash-lite',label:'Gemini',provider:'gemini',thinking:undefined,priceIn:0.30,priceOut:2.50}
};
// Groq & Gemini sama-sama format OpenAI-compatible: satu set fungsi dipakai
// untuk keduanya, yang beda cuma batas output, batas foto, & reasoning_effort.
var PB_OAI_PROVIDERS={
  groq:{maxOut:16384,maxImages:3,reasoning:'none'},
  gemini:{maxOut:16384,maxImages:16,reasoning:''} // '' = reasoning_effort TIDAK dikirim (seri 3.x menolak 'none'; default 3.5 Flash-Lite sudah thinking 'minimal')
};
function _pbProviderOf(id){
  for(var k in PB_AI_MODELS){if(PB_AI_MODELS[k].id===id)return PB_AI_MODELS[k].provider||'';}
  return '';
}
// Nama provider untuk pesan error ke user (Claude/Groq/Gemini) sesuai model terpilih.
function _pbProviderLabel(){
  var pv=_pbProviderOf(_pbModelId());
  return pv==='groq'?'Groq':(pv==='gemini'?'Gemini':'Claude');
}
// Nama lama dipertahankan: true untuk SEMUA model non-Claude (Groq & Gemini).
function _pbIsGroqModel(id){return !!PB_OAI_PROVIDERS[_pbProviderOf(id)];}
// Batas foto per request untuk model yang sedang dipilih (Groq 3, Gemini 16).
// Claude tidak dibatasi di sini (API-nya menerima sampai 100 gambar).
function _pbMaxImages(){
  var mid=_pbModelId();
  if(!PB_OAI_PROVIDERS[_pbProviderOf(mid)])return 100;
  return _pbOaiCfg(mid).maxImages;
}
// Konfigurasi OpenAI-compatible untuk 1 model: default dari provider-nya,
// bisa ditimpa per-model lewat field reasoning / maxImages di PB_AI_MODELS.
function _pbOaiCfg(model){
  var pv=PB_OAI_PROVIDERS[_pbProviderOf(model)]||PB_OAI_PROVIDERS.groq;
  var cfg={maxOut:pv.maxOut,maxImages:pv.maxImages,reasoning:pv.reasoning};
  for(var k in PB_AI_MODELS){
    var m=PB_AI_MODELS[k];
    if(m.id===model){
      if(m.reasoning!==undefined)cfg.reasoning=m.reasoning;
      if(m.maxImages!==undefined)cfg.maxImages=m.maxImages;
      break;
    }
  }
  return cfg;
}
// Ubah 'parts' gaya Gemini (text / inline_data) jadi messages format OpenAI/Groq.
function _pbGroqMessages(parts,systemText,maxImages){
  var msgs=[];
  if(systemText)msgs.push({role:'system',content:systemText});
  var content=[],hasImg=false;
  var imgCount=0;
  (parts||[]).forEach(function(p){
    var d=p&&(p.inline_data||p.inlineData);
    if(d){
      if(imgCount>=(maxImages==null?3:maxImages))return;
      imgCount++;
      hasImg=true;
      var mime=d.mime_type||d.mimeType||'image/jpeg';
      content.push({type:'image_url',image_url:{url:'data:'+mime+';base64,'+d.data}});
    }else{
      content.push({type:'text',text:(p&&p.text)||''});
    }
  });
  if(!hasImg)content=content.map(function(c){return c.text;}).join('\n\n');
  msgs.push({role:'user',content:content});
  return msgs;
}
function _pbBuildGroqBody(model,parts,systemText,maxTokens,stream,chatMsgs){
  var pv=_pbOaiCfg(model);
  var b={model:model,max_completion_tokens:Math.min(pv.maxOut,maxTokens||2048),messages:_pbGroqMessages(parts,systemText,pv.maxImages)};
  if(pv.reasoning)b.reasoning_effort=pv.reasoning;
  // Mode percakapan (semua model OpenAI-compatible: Gemini, Groq, GPT-OSS): daftar pesan bergantian user/assistant menggantikan satu pesan user.
  if(chatMsgs&&chatMsgs.length){
    var _cm=[];if(systemText)_cm.push({role:'system',content:systemText});
    chatMsgs.forEach(function(m){_cm.push({role:m.role,content:m.text});});
    b.messages=_cm;
  }
  if(stream){b.stream=true;b.stream_options={include_usage:true};}
  return b;
}
// FIX BIAYA (audit, 1 Okt 2026): ubah blok 'usage' format OpenAI-compatible
// (Groq & Gemini) jadi bentuk usageInfo yang dipakai pencatat biaya. Untuk
// GEMINI, token yang kena cache implisit (prompt_tokens_details.cached_tokens)
// dipisah dari input biasa dan dicatat sebagai cache_read — tarif resmi Google
// untuk Gemini 2.5 Flash-Lite: input $0.10/juta, cache $0.01/juta (= 10%, sama
// dengan pengali cache_read di _vbCalcUsd). Kalau API tidak mengirim rincian
// ini, nilainya 0 dan hitungan sama persis seperti sebelumnya. Groq sengaja
// TIDAK dipisah (diskon cache Groq beda dari 10%, jadi dihitung input biasa).
function _vbOaiUsageToInfo(gu,model){
  gu=gu||{};
  var pt=gu.prompt_tokens||0,ct=gu.completion_tokens||0,cached=0;
  if(_pbProviderOf(model)==='gemini'){
    var d=gu.prompt_tokens_details;
    cached=Math.min(pt,Math.max(0,(d&&d.cached_tokens)||0));
  }
  return{input_tokens:pt-cached,output_tokens:ct,cache_creation_input_tokens:0,cache_read_input_tokens:cached};
}
// FIX BIAYA TERPUTUS (audit, 1 Okt 2026): Claude melaporkan token input di
// event awal stream, jadi percobaan yang putus tetap punya angka input. Groq/
// Gemini baru melaporkan usage di chunk TERAKHIR — kalau stream putus, semua
// angka masih 0 dan percobaan itu dulu TIDAK tercatat sama sekali. Untuk
// provider OpenAI-compatible, percobaan terputus dianggap tertagih kalau
// sudah ada teks yang mengalir; outputnya dicatat sebagai PERKIRAAN terpisah
// (outEstTok, dari panjang teks). Input percobaan ini tidak diketahui, jadi
// tidak ikut dihitung (batas-bawah).
function _vbHasInterruptedUsage(u,isOai,textChars){
  if(u.input_tokens>0||u.cache_creation_input_tokens>0||u.cache_read_input_tokens>0)return true;
  return !!isOai&&(u.output_tokens>0||textChars>0);
}
var PB_AI_MODEL_KEY='pb_ai_model_v1';
var _pbAiModelKey='sonnet';
try{var _pbSavedModel=localStorage.getItem(PB_AI_MODEL_KEY);if(_pbSavedModel&&PB_AI_MODELS[_pbSavedModel])_pbAiModelKey=_pbSavedModel;}catch(e){}
// ── MODEL AI KHUSUS ADMIN (permintaan user, 1 Okt 2026) ─────────────────
// Picker model HANYA tampil untuk admin. SEMUA user lain dikunci ke Haiku
// (v11.1, 8 Okt 2026, permintaan user; sempat Gemini sejak 2 Okt 2026, sebelum itu
// juga Haiku) dan tidak bisa menggantinya. Daftar email admin harus sama dengan
// OWNER_EMAILS di admin.html. Ini penyaring sisi tampilan/klien; penegakan
// sungguhan (anti-utak-atik devtools) harus ada di Worker proxy.
var PB_ADMIN_EMAILS=['vid1hihu@gmail.com'];
// 9 Okt 2026 (permintaan user): model utama user biasa = Gemini (sebelumnya Haiku). Cadangan otomatis: Haiku, lalu Groq (VB_GEN_FALLBACK_MODELS_BY_MAIN.gemini).
var PB_DEFAULT_USER_MODEL='gemini';
function pbIsAdmin(){
  var em='';
  try{em=(firebase.auth().currentUser&&firebase.auth().currentUser.email)||'';}catch(e){}
  if(!em){try{var au=JSON.parse(localStorage.getItem('pb_auth_user')||'null');em=(au&&au.email)||'';}catch(e){}}
  em=String(em).toLowerCase();
  return PB_ADMIN_EMAILS.some(function(x){return String(x).toLowerCase()===em;});
}
// Model yang BENAR-BENAR dipakai: admin = pilihannya, user lain = PB_DEFAULT_USER_MODEL (sekarang Gemini).
function pbGetAiModelKey(){return pbIsAdmin()?_pbAiModelKey:PB_DEFAULT_USER_MODEL;}
function _pbModelId(){return PB_AI_MODELS[pbGetAiModelKey()].id;}
// THINKING HAIKU DIHAPUS (permintaan user, 30 Sep 2026): Haiku tidak lagi
// mengirim parameter 'thinking' sama sekali (field-nya undefined sehingga
// dibuang JSON.stringify). Sonnet TIDAK berubah (tetap between_tools).
function _pbThinkingParam(answerMaxTokens,modelId){
  // FIX #5 (audit Okt 2026): cari parameter thinking berdasarkan ID model yang SEDANG dipanggil, bukan model yang
  // dipilih di UI — supaya model cadangan (mis. Sonnet/Haiku saat Gemini jadi utama) tidak salah memakai thinking model lain.
  if(modelId){
    for(var k in PB_AI_MODELS){if(PB_AI_MODELS[k].id===modelId)return PB_AI_MODELS[k].thinking;}
    return undefined;
  }
  return PB_AI_MODELS[pbGetAiModelKey()].thinking;
}
// ── MODE PERBAIKAN KATA GEMINI BERBASIS PERCAKAPAN (permintaan user, 8 Okt 2026) ──
// '' = mati (perilaku lama), 'mini' = hanya prompt perbaikan + balasan AI + koreksi, 'full' = ditambah
// aturan & data generate awal + hasil generate. Default 'full' untuk semua user (hanya admin yang bisa mengganti); berlaku untuk SEMUA langkah model di rantai perbaikan (Gemini, Groq, GPT-OSS, Haiku).
var PB_GFIX_KEY='pb_gemini_fix_chat_v1';
// DEFAULT 'full' UNTUK SEMUA USER (permintaan user, 9 Okt 2026): user biasa SELALU Chat penuh (tidak bisa diubah, tidak ada UI-nya).
// Admin juga default Chat penuh, tapi tetap boleh ganti lewat panduan; pilihan 'biasa' (mati) disimpan sebagai 'off' supaya tidak balik ke default.
var _pbGeminiFixChat='full';
try{var _pbSvG=localStorage.getItem(PB_GFIX_KEY);if(_pbSvG==='mini'||_pbSvG==='full')_pbGeminiFixChat=_pbSvG;else if(_pbSvG==='off')_pbGeminiFixChat='';}catch(e){}
function pbGeminiFixChatMode(){return pbIsAdmin()?_pbGeminiFixChat:'full';} // nama lama dipertahankan; berlaku untuk SEMUA model di rantai perbaikan
function pbSetGeminiFixChat(m){
  if(!pbIsAdmin())return;
  _pbGeminiFixChat=(m===_pbGeminiFixChat||(m!=='mini'&&m!=='full'))?'':m;
  try{localStorage.setItem(PB_GFIX_KEY,_pbGeminiFixChat||'off');}catch(e){}
  pbRenderAiModelPicker();
  try{if(typeof showToast==='function')showToast('Perbaikan kata (semua model): '+(_pbGeminiFixChat==='mini'?'Mini chat':(_pbGeminiFixChat==='full'?'Chat penuh':'biasa')));}catch(e){}
}
function pbRenderAiModelPicker(){
  try{
    var admin=pbIsAdmin();
    var box=document.getElementById('pb-model-picker');
    if(box)box.style.display=admin?'':'none';
    var cur=pbGetAiModelKey();
    document.querySelectorAll('#pb-model-picker .pb-model-btn').forEach(function(b){
      b.classList.toggle('sel',b.getAttribute('data-model')===cur);
    });
    var gbox=document.getElementById('pb-gemini-chat-box');
    if(gbox)gbox.style.display=admin?'':'none';
    document.querySelectorAll('#pb-gemini-chat-box .pb-gfix-btn').forEach(function(b){
      b.classList.toggle('sel',b.getAttribute('data-mode')===_pbGeminiFixChat);
    });
    var ghint=document.getElementById('pb-gfix-hint');
    if(ghint)ghint.textContent=_pbGeminiFixChat==='mini'?'Mini chat: murah, hanya konteks perbaikan.':(_pbGeminiFixChat==='full'?'Chat penuh: membawa aturan & hasil generate awal (lebih mahal).':'Mati: perbaikan kata seperti biasa.');
  }catch(e){}
}
function pbSetAiModel(k){
  if(!pbIsAdmin())return; // user biasa tidak boleh ganti model
  if(!PB_AI_MODELS[k])return;
  _pbAiModelKey=k;
  try{localStorage.setItem(PB_AI_MODEL_KEY,k);}catch(e){}
  pbRenderAiModelPicker();
  try{if(typeof _vbRenderUsageBadge==='function'&&typeof _vbLoadUsageStats==='function')_vbRenderUsageBadge(_vbLoadUsageStats());}catch(e){}
  try{if(typeof showToast==='function')showToast('Model AI: '+PB_AI_MODELS[k].label);}catch(e){}
}
// DEFAULT MODEL = SONNET (permintaan user, 1 Okt 2026): pilihan model disimpan
// per-perangkat (localStorage), jadi akun BARU di perangkat yang pernah dipakai
// akun lain bisa ikut kebawa Haiku/Groq/Gemini. Fungsi ini mengembalikan ke Sonnet.
function pbResetAiModelToDefault(){
  _pbAiModelKey='sonnet';
  try{localStorage.removeItem(PB_AI_MODEL_KEY);}catch(e){}
  pbRenderAiModelPicker();
  try{if(typeof _vbRenderUsageBadge==='function'&&typeof _vbLoadUsageStats==='function')_vbRenderUsageBadge(_vbLoadUsageStats());}catch(e){}
}
document.addEventListener('DOMContentLoaded',pbRenderAiModelPicker);
try{pbRenderAiModelPicker();}catch(e){}
// Sonnet 5.5 menyalakan adaptive thinking secara DEFAULT (effort 'high', token
// thinking ditagih sebagai output) kalau field 'thinking' tidak dikirim, dan
// MENOLAK thinking:{type:'disabled'} (400). Cara resmi mematikan thinking di
// awal di Sonnet 5.5 adalah {type:'between_tools'} — tanpa tools, balasan
// cuma teks biasa seperti 'disabled'. Tanpa ini tagihan & latency naik.
// apiKey diisi placeholder tetap ('via-proxy') — bukan API key asli lagi.
// Cukup supaya semua pengecekan "if(!VAI.apiKey)" di bawah otomatis lolos,
// karena kunci Claude yang sesungguhnya sekarang disimpan aman di server
// Worker (proxy), bukan di browser/perangkat user.
var VAI={apiKey:'via-proxy',imageBase64:'',imageMime:'',adaProduk:'tidak',produkNama:'',produkUnggulan:'',produkTarget:'',tipeKonten:'',suaraKarakter:'',angleInterval:2,angleSlots:[],remajaTone:'',_scriptHistory:[],_isGenerating:false,_lastGenTime:0,_hasImage:false,_prevScript:'',_prevTipe:'',_imageBackup:'',_imageMimeBackup:''};
// FIX BUG "Tunggu proses AI sebelumnya selesai dulu" NYANGKUT SELAMANYA
// (audit Sept 2026): VAI._isGenerating cuma dijamin balik ke false lewat
// blok finally di masing-masing fungsi generate. Kalau proses ke-suspend
// total oleh OS/browser saat app di-background lama (WebView Android sering
// membekukan/mematikan JS & koneksi network tanpa sempat memanggil
// callback error apa pun), maka finally itu TIDAK PERNAH jalan — flag-nya
// nyangkut true untuk SISA UMUR tab/WebView ini. Karena flag ini cuma
// variabel JS di memori (bukan localStorage), harusnya reset sendiri kalau
// app benar-benar di-kill & dibuka ulang dari nol — tapi kalau yang
// terjadi cuma di-minimize (WebView Android TIDAK mereset JS saat itu,
// lihat listener visibilitychange di atas yang memang sengaja
// mempertahankan proses saat di-background), flag basi ini ikut terbawa
// dan user kelihatan "macet permanen" walau sudah tutup-buka app.
// _lastGenTime sendiri sebenarnya SUDAH ada dari awal di objek VAI di atas
// tapi tidak pernah benar-benar dipakai di mana pun (field mati) — jadi
// tidak ada mekanisme apa pun sebelumnya untuk mendeteksi/reset kondisi ini.
// Sekarang: tiap kali VAI._isGenerating diset true, VAI._lastGenTime ikut
// dicatat. Fungsi ini dipanggil di SETIAP gerbang "Tunggu proses AI..." —
// kalau sudah lewat _VB_GEN_STALE_MS sejak proses terakhir mulai TAPI
// masih ditandai "generating", anggap proses itu sudah mati beneran &
// auto-reset supaya user bisa lanjut generate lagi tanpa perlu clear
// cache/reinstall app.
var _VB_GEN_STALE_MS=8*60*1000; // 8 menit (audit Okt 2026: total retry kini dibatasi ±4 mnt + 1 request terakhir; _lastGenTime di-refresh tiap batch DAN tiap chunk stream lewat _vbHeartbeat (v11.67) → ini mengukur waktu TANPA PROGRES) — lebih lama dari retry otomatis normal manapun
