// fitur/akun-login-firebase.js — (dulu js/04-firebase-login.js) dipindah dari <script> di index.html lama (baris 244). Isi tidak diubah.
(function(){
  // ── GANTI INI dengan config Firebase project kamu sendiri (gratis). ─────
  // Cara dapatnya (±5 menit):
  // 1) Buka console.firebase.google.com → "Add project" (boleh pakai
  //    project Google Cloud yang sama dengan punya GOOGLE_CLIENT_ID di
  //    bawah nanti, atau project baru — bebas, tidak wajib sama).
  // 2) Di dashboard project: klik ikon "</>" (Add app → Web) → kasih nama
  //    bebas → Firebase akan menampilkan object firebaseConfig.
  // 3) Copy semua isi object itu, paste ganti PB_FIREBASE_CONFIG di bawah.
  // 4) Sidebar kiri → Build → Firestore Database → Create database →
  //    pilih lokasi terdekat (mis. asia-southeast2) → mode "Production".
  // 5) Firestore Database → tab "Rules" → ganti isinya jadi PERSIS ini,
  //    lalu klik "Publish" (ini yang bikin data tiap user cuma bisa
  //    dibaca/ditulis oleh akun Google pemiliknya sendiri):
  //      rules_version = '2';
  //      service cloud.firestore {
  //        match /databases/{database}/documents {
  //          match /users/{uid} {
  //            allow read: if request.auth != null && request.auth.uid == uid;
  //
  //            // FIX KEAMANAN (audit upgrade member, Sept 2026): pb_tier &
  //            // pb_tier_expiry SENGAJA DIKUNCI dari tulisan client di sini.
  //            // Rules versi lama ("allow read, write" polos) cuma mengecek
  //            // SIAPA yang nulis (uid pemilik dokumen), bukan FIELD APA yang
  //            // ditulis — jadi user mana pun tinggal buka DevTools/console
  //            // browser dan jalankan firebase.firestore()...doc(uid).set(
  //            // {pb_tier:'premium', pb_tier_expiry: Date.now()+999999999})
  //            // buat dapat akun Premium GRATIS tanpa transfer sepeser pun.
  //            // Dua rule di bawah memblokir itu: field pb_tier/pb_tier_expiry
  //            // cuma boleh sama dengan nilai yang SUDAH ada di Firestore —
  //            // artinya cuma admin (lewat Firebase Console, yang pakai akses
  //            // project/IAM dan TIDAK kena rules ini) yang bisa mengubahnya.
  //            // Field lain (pb_upgrade_request, pb_email, riwayat, dst)
  //            // tetap bebas ditulis client seperti biasa.
  //            //
  //            // FIX KEAMANAN #2 (audit upgrade member, Sept 2026): pb_quota
  //            // BOLEH ditulis client (memang harus, tiap kali generate lewat
  //            // pbCloudPushQuota) TAPI angka count-nya TIDAK BOLEH TURUN
  //            // untuk tanggal yang sama. Sebelumnya user tinggal buka
  //            // DevTools/console dan jalankan firebase.firestore()...doc(uid)
  //            // .set({pb_quota:{date:'<hari-ini>', count:0}}, {merge:true})
  //            // buat reset jatah harian jadi 0 lagi kapan saja. Fungsi
  //            // quotaTidakBolehTurun() di bawah menolak update kalau
  //            // tanggalnya SAMA tapi count baru < count lama — reset yang
  //            // sah (hari berganti) tetap lolos karena tanggalnya beda.
  //            // CATATAN PENTING (batas dari fix ini): rule ini cuma
  //            // melindungi user yang SUDAH LOGIN — begitu device ini sinkron
  //            // lagi (reload/login ulang), angka yang di-reset paksa di
  //            // localStorage bakal ketimpa balik ke angka asli dari cloud.
  //            // Ini TIDAK menutup celah kuota utk user yang BELUM login:
  //            // tier Gratis anonim (belum pernah masuk akun Google) tidak
  //            // punya dokumen Firestore sama sekali, jadi hitungannya masih
  //            // 100% di localStorage perangkat itu — clear cache/incognito
  //            // masih bikin jatah gratis balik ke 0. Nutup celah itu perlu
  //            // penghitungan di sisi server (mis. rate-limit per-IP di
  //            // Cloudflare Worker-nya, bukan di file app ini).
  //            function quotaTidakBolehTurun(newData, oldData) {
  //              let newQ = newData.get('pb_quota', null);
  //              let oldQ = oldData.get('pb_quota', null);
  //              return newQ == null || oldQ == null
  //                || newQ.date != oldQ.date
  //                || newQ.count >= oldQ.count;
  //            }
  //            allow create: if request.auth != null && request.auth.uid == uid
  //              && !request.resource.data.keys().hasAny(['pb_tier','pb_tier_expiry']);
  //            allow update: if request.auth != null && request.auth.uid == uid
  //              && request.resource.data.get('pb_tier', null) == resource.data.get('pb_tier', null)
  //              && request.resource.data.get('pb_tier_expiry', null) == resource.data.get('pb_tier_expiry', null)
  //              && quotaTidakBolehTurun(request.resource.data, resource.data);
  //
  //            match /blobs/{doc} {
  //              allow read, write: if request.auth != null && request.auth.uid == uid;
  //            }
  //          }
  //        }
  //      }
  //    PENTING kalau kamu SUDAH pernah setup rules ini sebelumnya (baik versi
  //    lama tanpa /blobs, versi lama "allow read, write" polos, ATAU versi
  //    yang cuma mengunci pb_tier tanpa quotaTidakBolehTurun): buka lagi tab
  //    Rules di Firebase Console, TIMPA SELURUHNYA dengan blok di atas (bukan
  //    cuma tambah sebagian), lalu Publish ulang — supaya celah reset kuota
  //    di atas ikut tertutup. Cara kerja admin manual (langkah 1-4 sebelum
  //    blok ini) TIDAK berubah sama sekali: Firebase Console pakai akses
  //    admin/IAM, bukan Firestore client SDK, jadi tetap bisa edit pb_tier
  //    di sana seperti biasa meski rules di atas "mengunci" client. Tanpa
  //    rules baru ini pun sinkron tetap gagal dengan pesan "akses ditolak"
  //    kalau sub-koleksi /blobs belum ada di rules-nya — itu yang dipakai
  //    fitur pecah-data (chunking) di bawah.
  // 6) Sidebar kiri → Build → Authentication → Get started → tab
  //    "Sign-in method" → aktifkan provider "Google" (pilih project
  //    support email-nya, lalu Save).
  // Selama PB_FIREBASE_CONFIG di bawah masih placeholder, app TETAP JALAN
  // NORMAL seperti sebelumnya — cuma datanya tetap lokal per perangkat
  // (tidak error, tidak ke-block, fitur sinkron aja yang belum aktif).
  var PB_FIREBASE_CONFIG = {
    apiKey: "AIzaSyCUnigD8-J8FG1HmWJrKjXWex4ZJFoJYGM",
    authDomain: "maiiil-55365.firebaseapp.com",
    projectId: "maiiil-55365",
    storageBucket: "maiiil-55365.firebasestorage.app",
    messagingSenderId: "73740157914",
    appId: "1:73740157914:web:8dd222e5d750a421e776e3"
  };

  // ── KONFIGURASI TIER & PEMBAYARAN (Sept 2026) ───────────────────────────
  // 3 tier: Gratis (6/hari), Standar (25/hari, Rp29rb/bulan), Premium
  // (50/hari, Rp79rb/bulan). Angka limit ini SEKARANG literal jumlah produk
  // per hari (lihat catatan "unit = produk langsung" di dekat dlCheckBeforeCall/
  // dlIncrement) — bukan lagi "unit" yang senilai 3 produk seperti versi lama,
  // supaya biaya API riil (±Rp45/produk, linear, tanpa efek hemat batching)
  // benar-benar sesuai dengan angka yang diiklankan ke user. Alur bayar SENGAJA dibuat manual dulu (paling
  // gampang buat mulai, tanpa integrasi payment gateway): user transfer →
  // klik "Sudah Transfer" → kebuka WhatsApp ke nomor admin dengan pesan
  // otomatis (email + tier yang dipilih) → ADMIN CEK MUTASI SENDIRI, lalu
  // naikkan tier user manual di Firebase Console:
  //   1. Buka console.firebase.google.com → project ini → Firestore Database
  //   2. Koleksi "users" → cari dokumen dengan field pb_email sesuai yang
  //      WA masuk (atau cari pb_upgrade_request.status == "pending")
  //   3. Edit field di dokumen itu: pb_tier = "standar" atau "premium",
  //      pb_tier_expiry = MAX(waktu sekarang, pb_tier_expiry LAMA) + jumlah hari di field days pada pb_upgrade_request (30/90/365),
  //      dalam MILIDETIK unix (angka, bukan detik/teks). MAX dipakai supaya perpanjang sebelum habis tidak memotong sisa hari.
  //      Contoh 30 hari di console browser: Math.max(Date.now(), expiryLama||0)+30*86400000 (ganti 30 sesuai isi days)
  //   4. (opsional) hapus/ubah pb_upgrade_request.status jadi "done"
  // Kalau nanti mau otomatis pakai Midtrans/Xendit dll, tinggal ganti isi
  // fungsi pbConfirmUpgradeWA() di bawah supaya redirect ke payment gateway
  // dan tier di-set otomatis lewat webhook, bukan manual lewat WA lagi.
  var PB_TIER_CONFIG = {
    free:    {label:'Gratis',  limit:6,   price:0,     periodDays:0},
    standar: {label:'Standar', limit:25,  price:29000, periodDays:30},
    premium: {label:'Premium', limit:50,  price:79000, periodDays:30}
  };
  var PB_PAYMENT_CONFIG = {
    // DAFTAR METODE BAYAR (bank & e-wallet). Tiap baris: nama, noRek (nomor rekening / nomor e-wallet), atasNama.
    // Tambah / hapus baris sesuai kebutuhan (mis. OVO, GoPay, BCA, Jago, Mandiri...).
    // PENGAMAN: baris yang noRek-nya masih diawali "ISI" TIDAK ditampilkan ke user. Ganti "ISI_..." dengan data asli.
    methods: [
      { nama:'blu by BCA Digital', noRek:'001392644121', atasNama:'Kamalul Razi' }
    ],
    qrisImageUrl: '' // (opsional) URL gambar QRIS kalau punya
  };
  window.PB_TIER_CONFIG = PB_TIER_CONFIG;
  window.PB_PAYMENT_CONFIG = PB_PAYMENT_CONFIG;
  // Pilihan periode di sheet upgrade. Harga = harga bulanan x months x (1 - disc), dibulatkan ke ribuan.
  // days = lama aktif; ikut tercatat di pb_upgrade_request supaya admin tinggal set pb_tier_expiry.
  window.PB_PERIOD_CONFIG = [
    {label:'Bulanan', months:1,  days:30,  disc:0},
    {label:'3 bulan', months:3,  days:90,  disc:0.10},
    {label:'Tahunan', months:12, days:365, disc:0.25}
  ];

  // Kunci-kunci localStorage yang disinkron ke Firestore. SENGAJA TIDAK
  // termasuk: pb_auth_user (sesi login lokal, dibentuk ulang tiap login),
  // pb_enc_salt_v1 (salt enkripsi, MEMANG harus unik per perangkat).
  // pb_usage_stats_v1/pb_usage_log_v1/pb_wordfix_stats_v1/pb_usage_archive_v1
  // IKUT disinkron (permintaan user, Sept 2026): supaya panel "Statistik
  // Biaya & Cache" di tab Panduan menampilkan angka yang SAMA persis di
  // semua perangkat yang login dengan Gmail yang sama — sebelumnya key-key
  // ini murni lokal per perangkat jadi tiap HP/laptop punya hitungan
  // sendiri-sendiri.
  // pb_usage_log_v1 TETAP di daftar "timpa" (PB_SYNC_KEYS) di bawah supaya
  // pengiriman chunk-nya tetap lewat _pushBlob seperti biasa, TAPI proses
  // TARIK-nya (_pullAll) sekarang di-merge, bukan ditimpa mentah — lihat
  // PB_LOG_MERGE_KEYS & _mergeLogArrays di bawah, dan catatan panjang di
  // dekat PB_COUNTER_SYNC_KEYS kenapa ini perlu.
  var PB_SYNC_KEYS = ['pb_custom_saves','pb_history_v1','pb_saved_pages_v1','pb_tour_done','pb_usage_log_v1','pb_fixchat_log_v1','pb_auto_foto_v1','pb_auto_video_v1','pb_user_scripts_v1','pb_ref_source_v1'];
  // FIX BUG SINKRON (audit lanjutan, Sept 2026): pb_usage_stats_v1 dan
  // pb_wordfix_stats_v1 DICABUT dari PB_SYNC_KEYS di atas (yang sinkronnya
  // "timpa seluruh nilai") karena keduanya cuma kumpulan ANGKA AKUMULASI
  // (hit/miss/token/dst). Kalau 2 perangkat generate hampir bersamaan, atau
  // user generate dulu SEBELUM login baru login belakangan, mekanisme timpa
  // itu bikin hitungan salah satu perangkat/sesi HILANG DIAM-DIAM (yang
  // upload/pull terakhir menang, bukan dijumlah). Key-key ini sekarang
  // disinkron lewat jalur KHUSUS di bawah (pbCloudQueueCounter/
  // _pullCounterMerge) yang pakai Firestore FieldValue.increment PER FIELD,
  // supaya kontribusi dari tiap perangkat DITAMBAHKAN, bukan ditimpa.
  // FIX BUG LANJUTAN (audit statistik biaya & cache, ditemukan setelah fix di
  // atas): pb_usage_archive_v1 (arsip harian, isinya JUGA murni angka
  // akumulasi per-tanggal — persis kategori yang sama seperti 2 key di atas)
  // KELEWATAN waktu itu, masih ikut ditimpa mentah lewat PB_SYNC_KEYS biasa.
  // Akibatnya "TOTAL SEMUA BIAYA (selamanya)" (dari pb_usage_stats_v1, SUDAH
  // aman) bisa beda dari jumlah breakdown per-periode/grafik/CSV (dari
  // pb_usage_log_v1+pb_usage_archive_v1) kalau 2 perangkat generate
  // berdekatan waktu — arsip salah satu perangkat bisa hilang tertimpa.
  // Sekarang pb_usage_archive_v1 IKUT dipindah ke sini, pakai mekanisme
  // delta-merge yang sama (flatten-nya sekarang rekursif — lihat
  // _flattenCounterObj — supaya bentuk 2-level nested arsip, tanggal→jenis→
  // field, ikut ke-cover, bukan cuma 1-level seperti attemptHist).
  // CATATAN UKURAN: arsip cuma nambah 1 KEY TANGGAL BARU per hari (bukan per
  // panggilan AI), jadi ukurannya tumbuh sangat lambat — aman disimpan
  // langsung sebagai field di dokumen utama users/{uid} tanpa perlu chunking
  // seperti pb_usage_log_v1 (yang bisa tumbuh cepat, 1 baris per panggilan).
  var PB_COUNTER_SYNC_KEYS = ['pb_usage_stats_v1','pb_wordfix_stats_v1','pb_usage_archive_v1'];
  // ── SINKRON MERGE UNTUK RIWAYAT MENTAH PER-PANGGILAN ────────────────────
  // pb_usage_log_v1 BUKAN kumpulan angka akumulasi (beda dari 3 key counter
  // di atas) — ini daftar EVENT diskrit, 1 baris per panggilan AI. Jadi tidak
  // pas dipaksa ke mekanisme delta-per-field. Strateginya: union-by-id — tiap
  // baris riwayat punya id unik (lihat _vbLogUsageEvent), waktu _pullAll
  // gabungkan array cloud+lokal berdasarkan id (dedup otomatis, idempotent —
  // aman dipanggil berkali-kali), simpan hasil gabungan, LALU push balik
  // hasil gabungan itu kalau ternyata ada baris lokal yang belum cloud tahu
  // — supaya cloud ikut lengkap juga buat perangkat lain, bukan cuma
  // perangkat ini yang jadi lengkap. Baris yang sudah lebih tua dari
  // PB_USAGE_LOG_RAW_DAYS SENGAJA tidak ikut digabung (lihat _mergeLogArrays)
  // supaya baris yang sudah pernah diringkas ke arsip oleh perangkat mana pun
  // tidak "hidup lagi" lalu diringkas dobel ke arsip.
  var PB_LOG_MERGE_KEYS = ['pb_usage_log_v1'];

  var _fbReady = false;
  window.pbCloudUid = null;
  var _timers = {};

  // FITUR BARU (permintaan user): tanda "proses tarik data cloud (kalau
  // ada) sudah kelar" — dipakai auto-start tur onboarding (lihat script
  // tur, cari 'pbCloudReady') supaya tidak buru-buru mengecek status
  // "tur sudah selesai?" SEBELUM status itu sendiri (pb_tour_done) sempat
  // ketarik dari Firestore pas login. Resolve dipanggil di SEMUA jalur
  // keluar pbCloudInit() di bawah (berhasil, gagal, ataupun memang tidak
  // ada sinkron aktif) — lihat _pbCloudReadyDone(). Kalau pbCloudInit()
  // sama sekali TIDAK PERNAH dipanggil di sesi ini (jalur login yang
  // tidak lewat fungsi ini), promise ini sengaja dibiarkan menggantung —
  // pemanggil WAJIB pasang batas waktu sendiri (lihat pbWaitCloudThenAutoStartTour).
  var _pbCloudReadyResolve = null;
  window.pbCloudReady = new Promise(function(resolve){ _pbCloudReadyResolve = resolve; });
  function _pbCloudReadyDone(){
    if(_pbCloudReadyResolve){ _pbCloudReadyResolve(); _pbCloudReadyResolve = null; }
  }

  // ── STATUS SINKRON RIWAYAT (ditampilkan di tab Riwayat) ────────────────
  // state: unknown (belum ada info, disembunyikan) | connecting | syncing |
  // ok | offline | error | off (sinkron tidak aktif di sesi ini).
  var PB_SAVED_SYNC_KEY = 'pb_saved_pages_v1';
  var _syncStatus = {state:'unknown', ts:0, msg:'', src:''};
  window.pbSyncStatus = _syncStatus;
  function _setSyncStatus(state, msg, src){
    _syncStatus.state = state; _syncStatus.msg = msg || ''; _syncStatus.src = src || '';
    if(state === 'ok') _syncStatus.ts = Date.now();
    try{ if(typeof pbSyncRenderStatus === 'function') pbSyncRenderStatus(); }catch(e){}
  }
  function _syncErrMsg(e, size){
    var m = String((e && (e.code || e.message)) || e || '');
    if(/exceed|size|too large|invalid-argument|resource-exhausted/i.test(m)) return 'data terlalu besar' + (size ? ' (±' + Math.round(size/1024) + ' KB)' : '') + ' — hapus beberapa halaman tersimpan';
    if(/unavailable|network|offline|deadline/i.test(m)) return 'tidak ada koneksi';
    if(/permission|unauthenticated/i.test(m)) return 'akses ditolak — coba login ulang';
    return 'coba lagi nanti';
  }

  function _configured(){
    return PB_FIREBASE_CONFIG.apiKey.indexOf('GANTI_') !== 0;
  }
  if(_configured()){
    try{ firebase.initializeApp(PB_FIREBASE_CONFIG); _fbReady = true; }
    catch(e){ console.warn('Firebase gagal diinisialisasi:', e); }
  }

  function _docRef(){
    if(!_fbReady || !window.pbCloudUid) return null;
    return firebase.firestore().collection('users').doc(window.pbCloudUid);
  }

  // TERAKHIR AKTIF (permintaan user, Okt 2026): dicatat tiap app dibuka (setelah login/sesi dipulihkan
  // dan _pullAll selesai) dan tiap kembali ke app dari background, maks 1x per 5 menit supaya tulisan
  // Firestore tidak boros. Field pb_last_active dibaca admin.html. Tidak menyentuh pb_tier/quota, jadi
  // lolos Firestore Rules yang ada. _lastActiveReady mencegah menulis sebelum _pullAll selesai (hindari
  // dokumen setengah jadi tanpa pb_tier).
  var _lastActiveAt = 0, _lastActiveReady = false;
  function _touchLastActive(force){
    try{
      if(!_lastActiveReady) return;
      if(!force && Date.now() - _lastActiveAt < 90000) return; // jeda minimal 90 dtk antar tulisan
      var ref = _docRef(); if(!ref) return;
      _lastActiveAt = Date.now();
      ref.set({pb_last_active: _lastActiveAt}, {merge:true}).catch(function(){ _lastActiveAt = 0; });
    }catch(e){}
  }
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) _touchLastActive(false); });
  // DETAK AKTIF (Okt 2026): selama tab/app terlihat, perbarui pb_last_active tiap 2 menit supaya admin.html
  // tetap menampilkan user "Online" selama dia masih memakai app (batas online di admin = 5 menit).
  // Tidak menulis saat app di background/tab tersembunyi, dan berhenti sendiri kalau belum login.
  setInterval(function(){ if(!document.hidden) _touchLastActive(false); }, 120000);

  // ── PEMECAH DATA BESAR (CHUNKING) ───────────────────────────────────────
  // FIX (audit sinkron, Sept 2026): dulu SEMUA key di PB_SYNC_KEYS ditulis
  // sebagai field di SATU dokumen Firestore yang sama (users/{uid}). Batas
  // ukuran 1 dokumen Firestore itu ±1 MiB TOTAL — jadi kalau riwayat +
  // halaman tersimpan + preset dst digabung lewat 1 MiB, SEMUA sinkron
  // gagal sekaligus ("Gagal sinkron: data terlalu besar..."), padahal yang
  // membengkak cuma satu key saja (biasanya pb_saved_pages_v1 yang isinya
  // HTML hasil generate + state lengkap per halaman).
  //
  // Sekarang tiap key di PB_SYNC_KEYS punya dokumen "manifest" SENDIRI di
  // sub-koleksi users/{uid}/blobs/{key} (jadi tidak lagi berebut kuota
  // 1 MiB dengan key lain), DAN kalau isi key itu sendiri masih lewat batas
  // aman, otomatis dipecah jadi beberapa dokumen "potongan"
  // (users/{uid}/blobs/{key}__0, __1, dst) lalu disambung lagi saat ditarik
  // (_pullBlobKey). Praktis tidak ada lagi batas ukuran yang bisa membuat
  // simpan/sinkron gagal — jumlah potongan menyesuaikan otomatis sebesar
  // apa pun datanya (dibatasi localStorage HP sendiri, bukan Firestore).
  var PB_CHUNK_MAX_CHARS = 220000; // ±selama ini aman jauh di bawah 1 MiB/dok Firestore walau isinya emoji/karakter multi-byte semua
  function _blobColl(){
    if(!_fbReady || !window.pbCloudUid) return null;
    return firebase.firestore().collection('users').doc(window.pbCloudUid).collection('blobs');
  }
  function _chunkString(str, maxChars){
    if(str.length <= maxChars) return [str];
    var out = [];
    for(var i = 0; i < str.length; i += maxChars) out.push(str.slice(i, i + maxChars));
    return out;
  }
  // Tulis 1 key (bisa berupa banyak dokumen potongan) pakai batch supaya
  // manifest + semua potongan + penghapusan sisa potongan lama (kalau data
  // sekarang lebih pendek dari sebelumnya) sukses/gagal BARENG — tidak
  // pernah ada kondisi "sebagian potongan baru, sebagian masih lama".
  // Firestore batasi 1 batch maksimum 500 operasi — dipecah otomatis kalau
  // sampai sebanyak itu (praktis nyaris tidak pernah kejadian utk data 1 app
  // pribadi, tapi tetap dijaga supaya tidak diam-diam gagal kalau suatu
  // hari kejadian).
  async function _commitInBatches(ops){
    for(var i = 0; i < ops.length; i += 450){
      var batch = firebase.firestore().batch();
      ops.slice(i, i + 450).forEach(function(op){
        if(op.type === 'set') batch.set(op.ref, op.data);
        else batch.delete(op.ref);
      });
      await batch.commit();
    }
  }
  async function _pushBlob(key, isSaved){
    var coll = _blobColl();
    if(!coll){ if(isSaved) _setSyncStatus('off'); return; }
    var val = null;
    try{ val = localStorage.getItem(key); }catch(e){}
    if(val == null){
      if(isSaved) _setSyncStatus('ok');
      try{ localStorage.removeItem('__dirty_'+key); }catch(e){}
      return;
    }
    try{
      var chunks = _chunkString(val, PB_CHUNK_MAX_CHARS);
      var ts = Date.now();
      var ops = [{type:'set', ref: coll.doc(key), data:{n: chunks.length, len: val.length, _updatedAt: ts}}];
      chunks.forEach(function(c, i){ ops.push({type:'set', ref: coll.doc(key+'__'+i), data:{d: c, _updatedAt: ts}}); });
      var prevN = 0;
      try{ prevN = Number(localStorage.getItem('__chunkN_'+key)) || 0; }catch(e){}
      for(var i = chunks.length; i < prevN; i++) ops.push({type:'delete', ref: coll.doc(key+'__'+i)});
      await _commitInBatches(ops);
      try{ localStorage.setItem('__chunkN_'+key, String(chunks.length)); }catch(e){}
      if(isSaved) _setSyncStatus('ok');
      try{ localStorage.removeItem('__dirty_'+key); }catch(e){}
    }catch(e){
      console.warn('Sync gagal ('+key+'):', e);
      if(isSaved) _setSyncStatus('error', _syncErrMsg(e, val.length), 'push');
    }
  }
  // Tarik 1 key dari struktur potongan baru. Balikin undefined kalau belum
  // pernah ada manifest utk key ini di akun ini (dipakai pemanggil buat
  // fallback ke field lama di dokumen users/{uid} — lihat _pullAll — supaya
  // data yang sempat tersinkron SEBELUM fitur pecah-data ini ada tidak
  // hilang/ketiban kosong).
  async function _pullBlobKey(key){
    var coll = _blobColl(); if(!coll) return undefined;
    var manifestSnap = await coll.doc(key).get();
    if(!manifestSnap.exists) return undefined;
    var manifest = manifestSnap.data() || {};
    var n = Number(manifest.n) || 0;
    if(n <= 0) return '';
    var reads = [];
    for(var i = 0; i < n; i++) reads.push(coll.doc(key+'__'+i).get());
    var snaps = await Promise.all(reads);
    return snaps.map(function(s){
      var d = s.exists ? s.data() : null;
      return (d && typeof d.d === 'string') ? d.d : '';
    }).join('');
  }

  // Dipanggil tiap kali salah satu data yang disinkron berubah (dari
  // csSaveAll/historyAdd/pbSavedSetAll/tour-done, dst). Debounce
  // 800ms per key biar tidak nembak Firestore tiap ketikan/klik beruntun.
  window.pbCloudQueue = function(key){
    var isSaved = (key === PB_SAVED_SYNC_KEY);
    if(!_fbReady || !window.pbCloudUid){
      // FIX (audit refresh, cloud sync): sebelumnya di sini langsung return
      // TANPA menandai __dirty_<key> — kalau user sempat menyimpan sesuatu
      // (halaman/riwayat/preset Karakter Sheet) tepat di detik-detik awal
      // SEBELUM pbCloudUid siap (pbCloudInit masih menunggu
      // onAuthStateChanged secara async, sementara app sudah langsung
      // kebuka lewat sesi tersimpan — lihat pbInitLogin), begitu pbCloudUid
      // siap dan _pullAll() jalan, perubahan lokal itu dianggap "bersih"
      // dan DITIMPA diam-diam oleh data cloud yang lebih lama. Sekarang:
      // kalau user SUDAH login (ada sesi tersimpan di localStorage kunci
      // 'pb_auth_user' — dicek pakai string literal-nya langsung karena
      // variabel STORAGE_KEY ada di <script> lain), __dirty_<key> tetap
      // ditandai supaya _pullAll tidak berani menimpanya begitu sinkron
      // akhirnya siap (_pullAll akan panggil ulang pbCloudQueue(k) untuk
      // key yang dirty, dan push ke cloud jalan normal dari situ).
      var _sudahLogin = false;
      try{ _sudahLogin = !!localStorage.getItem('pb_auth_user'); }catch(e){}
      if(_sudahLogin){ try{ localStorage.setItem('__dirty_'+key, '1'); }catch(e){} }
      if(isSaved) _setSyncStatus('off');
      return;
    }
    if(isSaved) _setSyncStatus(navigator.onLine === false ? 'offline' : 'syncing');
    try{ localStorage.setItem('__dirty_'+key, '1'); }catch(e){}
    clearTimeout(_timers[key]);
    _timers[key] = setTimeout(function(){ _pushBlob(key, isSaved); }, 800);
  };
  // Tombol "Coba lagi" di tab Riwayat. Kalau yang gagal tadi AMBIL data dari
  // cloud, ambil ulang (JANGAN push — data lokal bisa lebih lama dari cloud
  // dan malah menimpanya). Kalau yang gagal KIRIM, kirim ulang.
  window.pbCloudRetry = function(){
    if(_syncStatus.src === 'pull') _pullAll();
    else window.pbCloudQueue(PB_SAVED_SYNC_KEY);
  };
  window.addEventListener('online', function(){
    if(_fbReady && window.pbCloudUid && _syncStatus.state === 'offline') window.pbCloudQueue(PB_SAVED_SYNC_KEY);
  });

  // ── SINKRON KHUSUS UNTUK KEY COUNTER (PB_COUNTER_SYNC_KEYS) ─────────────
  // Lihat catatan panjang di dekat definisi PB_COUNTER_SYNC_KEYS. Intinya:
  // simpan snapshot terakhir yang SUDAH sukses dikirim ke cloud (kunci
  // localStorage <key>__base). Tiap kali mau sync, hitung SELISIH (delta)
  // antara nilai lokal sekarang vs snapshot itu per-field (termasuk field
  // nested, DALAM SEBERAPA LEVEL PUN — mis. attemptHist.1/2/3 [1 level] atau
  // arsip harian "2026-09-25.generate.calls" [2 level]), lalu kirim delta itu
  // lewat FieldValue.increment — BUKAN nilai absolutnya. Firestore yang
  // jumlahkan di server, jadi aman dipakai bersamaan dari beberapa perangkat
  // tanpa saling menimpa. Field angka datar (flat) disimpan apa adanya; field
  // object diratakan rekursif jadi "a.b.c" dst supaya bisa jadi field path
  // Firestore.
  // FIX BUG (audit lanjutan, statistik biaya & cache): dulu cuma menangani 1
  // level nesting (ditulis manual k+'.'+k2, khusus buat bentuk attemptHist).
  // Sekarang rekursif — sengaja diperluas supaya PB_USAGE_ARCHIVE_KEY (arsip
  // harian, bentuknya {tanggal:{generate:{...},fix:{...}}}, 2 level nested)
  // bisa ikut dipakaikan mekanisme delta-merge yang sama seperti
  // pb_usage_stats_v1/pb_wordfix_stats_v1 — lihat catatan di PB_SYNC_KEYS/
  // PB_COUNTER_SYNC_KEYS kenapa ini perlu.
  function _flattenCounterObj(obj,prefix){
    var out={};
    Object.keys(obj||{}).forEach(function(k){
      var v=obj[k];
      var path=prefix?prefix+'.'+k:k;
      if(v&&typeof v==='object'&&!Array.isArray(v)){
        Object.assign(out,_flattenCounterObj(v,path));
      }else{
        out[path]=Number(v)||0;
      }
    });
    return out;
  }
  function _unflattenCounterObj(flat){
    var out={};
    Object.keys(flat||{}).forEach(function(fk){
      var val=Number(flat[fk])||0;
      var parts=fk.split('.');
      var cur=out;
      for(var i=0;i<parts.length-1;i++){
        if(!cur[parts[i]])cur[parts[i]]={};
        cur=cur[parts[i]];
      }
      cur[parts[parts.length-1]]=val;
    });
    return out;
  }
  // Versi unflatten TANPA koersi Number() — dipakai KHUSUS buat membangun
  // object nested berisi sentinel FieldValue.increment(...) di leaf-nya
  // (Number(sentinelObject) akan jadi NaN kalau lewat _unflattenCounterObj
  // biasa, makanya perlu versi terpisah ini).
  function _unflattenRaw(flat){
    var out={};
    Object.keys(flat||{}).forEach(function(fk){
      var val=flat[fk];
      var parts=fk.split('.');
      var cur=out;
      for(var i=0;i<parts.length-1;i++){
        if(!cur[parts[i]])cur[parts[i]]={};
        cur=cur[parts[i]];
      }
      cur[parts[parts.length-1]]=val;
    });
    return out;
  }
  function _counterBaseGet(key){
    try{ var b=JSON.parse(localStorage.getItem(key+'__base')||'null'); if(b&&typeof b==='object')return b; }catch(e){}
    return {};
  }
  function _counterBaseSet(key,obj){
    try{ localStorage.setItem(key+'__base', JSON.stringify(obj)); }catch(e){}
  }
  // FIX (audit lanjutan): dipisah dari timer debounce supaya bisa dipanggil langsung (pbCloudFlush saat logout).
  function _pushCounter(key){
      var ref=_docRef(); if(!ref) return;
      var localRaw=null; try{ localRaw=localStorage.getItem(key); }catch(e){}
      if(localRaw==null) return;
      var local; try{ local=JSON.parse(localRaw); }catch(e){ return; }
      var base=_counterBaseGet(key);
      var localFlat=_flattenCounterObj(local);
      var baseFlat=_flattenCounterObj(base);
      var incFlat={}; var hasDelta=false;
      Object.keys(localFlat).forEach(function(fk){
        var delta=(localFlat[fk]||0)-(baseFlat[fk]||0);
        if(delta!==0){ hasDelta=true; incFlat[fk]=firebase.firestore.FieldValue.increment(delta); }
      });
      if(!hasDelta) return; // tidak ada perubahan sejak sync terakhir, tidak perlu request
      // FIX (audit lanjutan): dulu pakai KEY BERTITIK ('pb_x.hit') sebagai
      // top-level property di object yang dilempar ke set(...,{merge:true}).
      // Itu ambigu — di beberapa versi SDK Firestore, key bertitik di set()
      // BISA dibaca sebagai satu nama field literal (bukan path nested),
      // beda dari update() yang memang menjamin dot-notation sebagai path.
      // Sekarang dibangun jadi OBJECT NESTED ASLI (bukan string bertitik)
      // dengan sentinel increment() di leaf-nya — cara ini pasti didukung
      // deep-merge dari set(...,{merge:true}), tidak bergantung interpretasi
      // dot-notation sama sekali.
      var patch={}; patch[key]=_unflattenRaw(incFlat); patch._updatedAt=Date.now();
      return ref.set(patch,{merge:true}).then(function(){
        _counterBaseSet(key, local); // baseline baru = nilai lokal yang barusan ke-push
      }).catch(function(e){ console.warn('Sync counter gagal ('+key+'):', e); });
  }
  window.pbCloudQueueCounter = function(key){
    if(!_fbReady || !window.pbCloudUid) return;
    clearTimeout(_timers['__ctr_'+key]);
    _timers['__ctr_'+key] = setTimeout(function(){ _pushCounter(key); }, 800);
  };
  // Dipakai oleh "Reset Hitungan": kosongkan field counter di cloud supaya
  // reset benar-benar nol lagi di semua perangkat, bukan cuma dikurangi
  // sebesar kontribusi 1 perangkat.
  // FIX BUG (audit lanjutan, statistik biaya & cache): dulu di-set ke
  // "bentuk nol" yang DIHARDCODE per key (cuma tau field pb_usage_stats_v1
  // dan pb_wordfix_stats_v1) — field yang tidak ada di daftar hardcode itu
  // (atau field baru yang ditambahkan nanti) tidak ikut ter-nol-kan di
  // cloud. Sekarang pakai FieldValue.delete() buat menghapus field itu
  // TOTAL dari dokumen, apa pun isi/bentuknya — tidak perlu tahu shape-nya
  // sama sekali, jadi otomatis benar untuk key counter APA PUN, termasuk
  // PB_USAGE_ARCHIVE_KEY (arsip harian, kumpulan key tanggal yang dinamis,
  // tidak mungkin di-hardcode shape-nya di sini).
  window.pbCloudResetCounter = function(key){
    if(!_fbReady || !window.pbCloudUid) return;
    var ref=_docRef(); if(!ref) return;
    var patch={}; patch[key]=firebase.firestore.FieldValue.delete(); patch._updatedAt=Date.now();
    ref.set(patch,{merge:true}).catch(function(e){ console.warn('Reset counter cloud gagal ('+key+'):', e); });
    _counterBaseSet(key, {}); // baseline lokal ikut di-nol-kan (field cloud sudah dihapus total)
  };
  // Gabungkan data counter dari cloud dengan delta lokal yang BELUM sempat
  // ke-push (supaya tidak hilang kalau pull kejadian pas ada perubahan lokal
  // yang masih ngantre di debounce 800ms), lalu simpan hasil gabungannya.
  function _pullCounterMerge(data,key){
    var cloudRaw=(data&&data[key]&&typeof data[key]==='object')?data[key]:null;
    if(!cloudRaw)return; // belum pernah ada data cloud utk counter ini
    var localRaw=null; try{ localRaw=localStorage.getItem(key); }catch(e){}
    var local={}; try{ local=localRaw?JSON.parse(localRaw):{}; }catch(e){}
    var base=_counterBaseGet(key);
    // BUG FIX (audit lanjutan): cloudRaw dari Firestore masih NESTED (mis.
    // attemptHist:{1,2,3} sebagai object), sedangkan localFlat/baseFlat di
    // bawah sudah "diratakan" (attemptHist.1/.2/.3). Kalau cloudRaw dipakai
    // apa adanya tanpa diratakan dulu, key-nya tidak akan pernah ketemu saat
    // digabung dengan localFlat — akibatnya kontribusi dari cloud utk field
    // nested seperti attemptHist SELALU dianggap 0 (hitungan attempt 1x/2x/3x
    // dari perangkat lain bisa hilang). Jadi cloudRaw WAJIB diratakan dulu
    // pakai fungsi yang SAMA (_flattenCounterObj) sebelum digabung.
    var cloudFlat=_flattenCounterObj(cloudRaw);
    var localFlat=_flattenCounterObj(local);
    var baseFlat=_flattenCounterObj(base);
    var mergedFlat={};
    Object.keys(Object.assign({},cloudFlat,localFlat)).forEach(function(fk){
      var pendingDelta=(localFlat[fk]||0)-(baseFlat[fk]||0); // kontribusi device ini yg belum ke-push
      mergedFlat[fk]=(Number(cloudFlat[fk])||0)+pendingDelta;
    });
    try{ localStorage.setItem(key, JSON.stringify(_unflattenCounterObj(mergedFlat))); }catch(e){}
    _counterBaseSet(key, _unflattenCounterObj(cloudFlat)); // baseline baru = state cloud yg baru ditarik (sudah rata→nested lagi, konsisten)
  }
  // Gabungkan riwayat mentah cloud+lokal (pb_usage_log_v1) berdasarkan id unik
  // tiap baris — union, dedup otomatis, jadi aman dipanggil berkali-kali dari
  // kedua arah (pull maupun sebelum push balik). Baris LAMA (dibuat sebelum
  // fix ini ada, belum punya field id) dikasih kunci gabungan dari beberapa
  // field yang match persis biar tetap ke-dedup wajar, bukan malah dobel.
  // Baris yang sudah lebih tua dari batas retensi mentah (PB_USAGE_LOG_RAW_DAYS)
  // SENGAJA DIBUANG dari hasil gabungan — baris setua itu harusnya sudah
  // diringkas ke arsip harian (oleh perangkat mana pun, arsipnya sendiri
  // sekarang sudah aman lewat PB_COUNTER_SYNC_KEYS) sebelum ini; kalau tetap
  // ikut digabung balik ke riwayat mentah, baris itu bisa diringkas KE ARSIP
  // LAGI di kompaksi berikutnya (_vbCompactUsageLog) → dobel-hitung di arsip.
  function _mergeLogArrays(cloudArr,localArr){
    var rawDays=(typeof PB_USAGE_LOG_RAW_DAYS!=='undefined')?PB_USAGE_LOG_RAW_DAYS:60;
    var cutoff=Date.now()-rawDays*24*60*60*1000;
    function keyOf(e){
      return e.id||('legacy-'+e.ts+'-'+e.kind+'-'+e.mode+'-'+e.noCacheInTok+'-'+e.cacheWriteInTok+'-'+e.cacheReadInTok+'-'+e.outTok);
    }
    var byKey={};
    (cloudArr||[]).forEach(function(e){ if(e&&typeof e.ts==='number'&&e.ts>=cutoff)byKey[keyOf(e)]=e; });
    (localArr||[]).forEach(function(e){ if(e&&typeof e.ts==='number'&&e.ts>=cutoff)byKey[keyOf(e)]=e; });
    var merged=Object.keys(byKey).map(function(k){return byKey[k];});
    merged.sort(function(a,b){return a.ts-b.ts;});
    return merged;
  }

  // Khusus API key Claude: yang disinkron PLAINTEXT-nya, bukan ciphertext
  // lokal (ciphertext dienkripsi pakai salt unik per perangkat — tidak
  // bisa dibaca ulang di perangkat lain). Firestore-nya sendiri sudah
  // dibatasi per-uid lewat security rules di langkah 5 atas.
  window.pbCloudPushApiKeyPlain = function(plainKey){
    if(!_fbReady || !window.pbCloudUid) return;
    var ref = _docRef(); if(!ref) return;
    ref.set({pb_api_key_plain: plainKey, _updatedAt: Date.now()}, {merge:true})
      .catch(function(e){ console.warn('Sync API key gagal:', e); });
  };

  // FIX (Sept 2026, "premium lambat / balik gratis setelah ganti akun"):
  // tier SEKARANG dipasang segera setelah dokumen user terbaca — sebelum
  // riwayat/halaman tersimpan/dll ditarik. Dulu tier baru dipasang di
  // PALING AKHIR _pullAll, jadi tampilan premium telat selama semua tarikan
  // data itu belum kelar, dan ikut batal total kalau salah satu tarikan di
  // atasnya error. Cloud = sumber kebenaran (field pb_tier tidak ada = gratis).
  // Hasil baca dari cache offline Firestore (fromCache) diabaikan supaya data
  // basi tidak menaikkan/menurunkan paket. Hasilnya juga disimpan per-akun
  // lewat pbTierCacheSave (lihat <head>) supaya login berikutnya instan.
  // LOG PENYEBAB TIER (Sept 2026): kejadian penting soal paket dicatat permanen
  // (14 terakhir) supaya kalau tampilan balik ke Gratis, alasannya kelihatan lewat
  // link "Info paket" di modal upgrade. Tidak ikut disinkron ke cloud.
  function _tlog(ev, info){
    try{
      var a = JSON.parse(localStorage.getItem('pb_tier_log_v1') || '[]'); if(!Array.isArray(a)) a = [];
      a.push({t: new Date().toISOString().slice(5,19).replace('T',' '), e: ev, i: info || ''});
      if(a.length > 14) a = a.slice(-14);
      localStorage.setItem('pb_tier_log_v1', JSON.stringify(a));
    }catch(x){}
  }
  window.pbTierLog = _tlog;
  var _lastDocInfo = null; // hasil baca server terakhir: {hasTier:boolean}
  window.pbTierLogText = function(){
    var a = []; try{ a = JSON.parse(localStorage.getItem('pb_tier_log_v1') || '[]') || []; }catch(x){}
    var lines = a.map(function(r){ return r.t + '  ' + r.e + (r.i ? '  ' + r.i : ''); });
    var uid = window.pbCloudUid || '', em = '', head = [];
    try{ em = (firebase.auth().currentUser && firebase.auth().currentUser.email) || ''; }catch(x){}
    if(uid){
      head.push('ID dokumen: users/' + uid);
      if(em) head.push('Email: ' + em);
      // Disalin otomatis (dipanggil dari klik tombol) supaya tinggal ditempel di pencarian Firebase Console.
      try{ if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(uid).then(function(){}, function(){}); }catch(x){}
      if(_lastDocInfo && !_lastDocInfo.hasTier){
        head.push('>> Dokumen ini BELUM punya field pb_tier di Firestore. Buka Firebase Console > users > dokumen dengan ID di atas (ID sudah disalin), lalu isi pb_tier = premium dan pb_tier_expiry = angka milidetik. Kalau kamu sudah mengisinya di dokumen lain, itu dokumen yang salah.');
      }
    }else{
      head.push('Belum tersambung ke server (uid kosong).');
    }
    return head.concat(['-----'], lines.length ? lines : ['(belum ada catatan)']).join('\n');
  };
  function _uidTail(){ return String(window.pbCloudUid || '-').slice(-6); }

  function _applyCloudTier(data, fromCache){
    try{
      var _before = localStorage.getItem('pb_tier_v1') || 'free';
      _tlog(fromCache ? 'baca-cache(diabaikan)' : 'baca-server',
            'uid…' + _uidTail() + ' pb_tier=' + ((data && data.pb_tier != null) ? data.pb_tier : '(kosong)') +
            ' lokal=' + _before +
            ' field=' + Object.keys(data || {}).filter(function(k){ return /^pb_(tier|email|quota|upgrade)/.test(k); }).join(','));
      if(!fromCache) _lastDocInfo = {hasTier: !!(data && data.pb_tier != null), email: (data && data.pb_email) || ''};
    }catch(x){}
    if(fromCache){ if(_tierState !== 'ok'){ _setTierState('loading'); _scheduleTierRetry(); } return; }
    try{
      var t = (typeof data.pb_tier === 'string') ? data.pb_tier.trim().toLowerCase() : '';
      if(!t || !window.PB_TIER_CONFIG || !window.PB_TIER_CONFIG[t]) t = 'free';
      var e = _pbNormExpiry(data.pb_tier_expiry);
      if(e < 0){ console.warn('pb_tier_expiry tidak terbaca, paket dianggap Gratis:', data.pb_tier_expiry); t = 'free'; e = 0; }
      if(t === 'free'){
        e = 0;
        try{ if((localStorage.getItem('pb_tier_v1') || 'free') !== 'free') _tlog('TURUN-KE-GRATIS', 'uid…' + _uidTail() + ' doc.pb_tier=' + ((data && data.pb_tier != null) ? data.pb_tier : '(kosong)')); }catch(x){}
        localStorage.removeItem('pb_tier_v1'); localStorage.removeItem('pb_tier_expiry_v1');
      }else{
        localStorage.setItem('pb_tier_v1', t);
        if(e) localStorage.setItem('pb_tier_expiry_v1', String(e)); else localStorage.removeItem('pb_tier_expiry_v1');
      }
      var em = '';
      try{ em = (firebase.auth().currentUser && firebase.auth().currentUser.email) || ''; }catch(x){}
      if(!em){ try{ var au = JSON.parse(localStorage.getItem('pb_auth_user') || 'null'); em = (au && au.email) || ''; }catch(x){} }
      if(typeof window.pbTierCacheSave === 'function') window.pbTierCacheSave(em, t, e);
      _tierAt = Date.now(); _tierRetryN = 0; _setTierState('ok');
      if(typeof window.pbApplyTheme === 'function') window.pbApplyTheme();
      try{ if(typeof dlRenderBar === 'function') dlRenderBar(); }catch(x){}
      try{ _pbTierUpgradeCheck(t); }catch(x){}
    }catch(x){}
  }

  // ══ RESTART OTOMATIS SETELAH UPGRADE (v11.70, 9 Okt 2026, permintaan user) ══════════════════════
  // Begitu admin menyetujui upgrade (pb_tier di Firestore naik: Gratis->Standar/Premium atau
  // Standar->Premium) dan app sedang terbuka, app otomatis dimuat ulang dan splash logo P tampil
  // dengan tema paket baru (tema diambil dari pb_tier_v1 di localStorage lewat pbApplyTheme di <head>).
  // Cara kerja:
  //  1) PINTU BEL: _tierWatchStart() memasang pendengar realtime (onSnapshot) ke dokumen user.
  //     Pendengar ini TIDAK memutuskan apa-apa sendiri; kalau tier di server lebih tinggi dari yang
  //     tersimpan lokal, ia cuma memanggil pbRefreshTier() (jalur baca server yang sudah teruji,
  //     lengkap dengan perlindungan dokumen setengah jadi).
  //  2) _applyCloudTier -> _pbTierUpgradeCheck membandingkan dengan tier pembacaan server SEBELUMNYA
  //     di sesi ini. Pembacaan server PERTAMA hanya jadi patokan (buka app biasa tidak memicu restart).
  //  3) Kalau naik: tunggu proses generate selesai (kalau ada), kirim data yang belum tersinkron,
  //     lalu buka ulang app lewat alamat yang sama + ?_pbup=... Ini sengaja BUKAN location.reload():
  //     reload dianggap "refresh" -> splash DILEWATI dan draft wizard DIHAPUS. Buka-baru -> splash
  //     tampil dan draft wizard tetap dipulihkan.
  //  Pengaman: restart maks 1x per 2 menit (anti-loop), dan tidak dipicu dalam 20 dtk pertama sesi.
  var _PB_TIER_RANK = {free:0, standar:1, premium:2};
  var _lastServerTier = null, _tierBaselineAt = 0, _upgRestarting = false;
  var _tierWatchUnsub = null, _tierWatchUid = null;
  function _tierWatchStop(){
    if(_tierWatchUnsub){ try{ _tierWatchUnsub(); }catch(x){} }
    _tierWatchUnsub = null; _tierWatchUid = null;
  }
  function _localTierNow(){
    var t = 'free', e = 0;
    try{ t = localStorage.getItem('pb_tier_v1') || 'free'; e = Number(localStorage.getItem('pb_tier_expiry_v1')) || 0; }catch(x){}
    if(t !== 'free' && e && Date.now() > e) t = 'free';
    return _PB_TIER_RANK.hasOwnProperty(t) ? t : 'free';
  }
  function _tierWatchStart(){
    try{
      if(!_fbReady || !window.pbCloudUid) return;
      if(_tierWatchUnsub && _tierWatchUid === window.pbCloudUid) return;
      _tierWatchStop();
      var ref = _docRef(); if(!ref) return;
      _tierWatchUid = window.pbCloudUid;
      _tierWatchUnsub = ref.onSnapshot(function(snap){
        try{
          if(!snap || !snap.exists || snap.metadata.fromCache || snap.metadata.hasPendingWrites) return;
          var d = snap.data() || {};
          var t = (typeof d.pb_tier === 'string') ? d.pb_tier.trim().toLowerCase() : '';
          if(!t || !window.PB_TIER_CONFIG || !window.PB_TIER_CONFIG[t]) return;
          var ex = _pbNormExpiry(d.pb_tier_expiry);
          if(ex < 0 || (ex > 0 && Date.now() > ex)) return; // kedaluwarsa/tak terbaca: bukan upgrade
          if((_PB_TIER_RANK[t] || 0) > (_PB_TIER_RANK[_localTierNow()] || 0)) window.pbRefreshTier();
        }catch(x){}
      }, function(err){ console.warn('Pantau paket berhenti:', err); _tierWatchStop(); });
    }catch(x){}
  }
  function _pbTierUpgradeCheck(t){
    var prev = _lastServerTier;
    _lastServerTier = t;
    if(prev === null){ _tierBaselineAt = Date.now(); }      // pembacaan server pertama = patokan
    else if((_PB_TIER_RANK[t] || 0) > (_PB_TIER_RANK[prev] || 0)
            && Date.now() - _tierBaselineAt > 20000){        // naik paket -> restart
      _pbRestartAfterUpgrade(t);
    }
    if(t === 'premium') _tierWatchStop(); else _tierWatchStart(); // premium tidak ada tingkat di atasnya
  }
  function _pbUpgBusy(){
    try{ return (typeof _vbGuardGenerating === 'function') && !!_vbGuardGenerating(); }catch(x){ return false; }
  }
  function _pbRestartAfterUpgrade(t){
    if(_upgRestarting) return;
    try{
      var last = Number(localStorage.getItem('pb_upg_restart_v1')) || 0;
      if(Date.now() - last < 120000) return; // anti-loop
    }catch(x){}
    _upgRestarting = true;
    var C = window.PB_TIER_CONFIG || {};
    var label = (C[t] && C[t].label) || t;
    var told = false;
    function step(){
      if(_pbUpgBusy()){ // jangan putus proses generate yang sedang jalan
        if(!told){ told = true; try{ showToast('Upgrade ' + label + ' berhasil! Aplikasi dimuat ulang setelah proses generate selesai.', 'success'); }catch(x){} }
        setTimeout(step, 1500); return;
      }
      if(!told){ try{ showToast('Upgrade ' + label + ' berhasil! Memuat ulang aplikasi…', 'success'); }catch(x){} }
      setTimeout(function(){ if(_pbUpgBusy()) step(); else _pbDoUpgradeRestart(); }, 1400);
    }
    step();
  }
  function _pbDoUpgradeRestart(){
    try{ localStorage.setItem('pb_upg_restart_v1', String(Date.now())); }catch(x){}
    window._pbSkipUnloadWarn = true; // jangan munculkan dialog "yakin keluar?" bawaan
    var done = false;
    function nav(){
      if(done) return; done = true;
      // FIX (regresi dari deteksi reload versi sessionStorage, lihat
      // PB_IS_TRUE_RELOAD di <head>): location.replace() di bawah TETAP
      // berada di tab/sesi yang sama, jadi penanda sessionStorage ikut
      // KEBAWA ke load berikutnya kalau tidak dihapus dulu — akibatnya
      // restart otomatis ini salah kedeteksi sebagai "reload sengaja"
      // (splash dilewati, draft wizard ikut terhapus), padahal baris
      // komentar di atas (RESTART OTOMATIS SETELAH UPGRADE) sudah jelas:
      // restart ini HARUS dianggap "buka app baru" supaya splash tampil
      // & draft tetap dipulihkan. Hapus penanda SEBELUM replace() supaya
      // load berikutnya memang terbaca sebagai sesi baru.
      try{ sessionStorage.removeItem('pb_sess_alive_v1'); }catch(x){}
      try{
        var u = new URL(location.href); u.searchParams.set('_pbup', String(Date.now()));
        location.replace(u.toString());
      }catch(x){ try{ location.reload(); }catch(y){} }
      // Jaring pengaman: kalau navigasi macet diam-diam, pakai reload biasa (splash dilewati, tapi tema tetap baru).
      setTimeout(function(){ try{ location.reload(); }catch(x){} }, 5000);
    }
    try{
      Promise.race([
        Promise.resolve(typeof window.pbCloudFlush === 'function' ? window.pbCloudFlush() : null),
        new Promise(function(r){ setTimeout(r, 2000); })
      ]).then(nav, nav); // kirim data yang belum tersinkron dulu (maks 2 dtk)
    }catch(x){ nav(); }
    setTimeout(nav, 2500);
  }

  // FIX (audit auth #3/#5, Sept 2026): status muat paket + retry + normalisasi expiry.
  var _tierState = 'unknown', _tierAt = 0, _tierBusy = null, _tierRetryT = null, _tierRetryN = 0;
  window.pbTierState = function(){ return _tierState; };
  function _setTierState(s){
    if(_tierState === s) return;
    _tierState = s;
    try{ if(typeof dlRenderBar === 'function') dlRenderBar(); }catch(x){}
  }
  // Hasil: ms (>0) | 0 = tanpa kedaluwarsa | -1 = ada isinya tapi tidak terbaca.
  // Terima number, string (angka/ISO), Firestore Timestamp, Date; nilai DETIK otomatis jadi ms.
  function _pbNormExpiry(v){
    if(v == null || v === '' || v === 0) return 0;
    var n = NaN;
    if(typeof v === 'number') n = v;
    else if(typeof v === 'string'){ var s = v.trim(); n = /^\d+(\.\d+)?$/.test(s) ? Number(s) : Date.parse(s); }
    else if(v instanceof Date) n = v.getTime();
    else if(typeof v.toMillis === 'function') n = v.toMillis();
    else if(typeof v.seconds === 'number') n = v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6);
    if(!isFinite(n) || n <= 0) return -1;
    return n < 1e11 ? n * 1000 : n;
  }
  function _scheduleTierRetry(){
    clearTimeout(_tierRetryT);
    var d = [3000, 8000, 20000, 60000, 60000, 60000, 60000, 60000][_tierRetryN++];
    if(d == null){ _setTierState('failed'); return; }
    _tierRetryT = setTimeout(function(){ if(window.pbCloudUid) window.pbRefreshTier(); }, d);
  }
  // FIX AKAR MASALAH "balik Gratis padahal Premium" (Sept 2026): SDK Firestore bisa mengembalikan
  // dokumen SETENGAH JADI (cuma berisi hasil tulisan lokal seperti pb_email) yang lolos sebagai
  // hasil server. Bukti dari log: baca-server pb_tier=(kosong), 2 detik kemudian baca-server
  // pb_tier=premium untuk dokumen yang SAMA. Jadi pb_tier kosong TIDAK boleh langsung dianggap
  // Gratis: tunggu tulisan tertunda selesai, lalu baca ulang dari server (maks 2x). Hasil null =
  // verifikasi gagal (jaringan), pemanggil TIDAK boleh menurunkan paket.
  async function _verifyNoTier(ref, snap){
    for(var i = 0; i < 2; i++){
      var d = (snap && snap.exists) ? (snap.data() || {}) : {};
      if(d.pb_tier != null) return snap;
      try{ await Promise.race([firebase.firestore().waitForPendingWrites(), new Promise(function(r){ setTimeout(r, 4000); })]); }catch(x){}
      await new Promise(function(r){ setTimeout(r, i === 0 ? 300 : 1200); });
      try{ snap = await ref.get({source: 'server'}); }catch(x){ return null; }
      var d2 = snap.exists ? (snap.data() || {}) : {};
      _tlog('cek-ulang-server', 'uid…' + _uidTail() + ' ke-' + (i + 1) + ' pb_tier=' + (d2.pb_tier != null ? d2.pb_tier : '(kosong)'));
    }
    return snap;
  }
  // Baca ulang paket LANGSUNG dari server (bukan cache). Balikin Promise<boolean>.
  window.pbRefreshTier = function(){
    if(_tierBusy) return _tierBusy;
    var ref = _docRef();
    if(!ref) return Promise.resolve(false);
    if(_tierState !== 'ok') _setTierState('loading');
    _tierBusy = ref.get({source: 'server'}).then(function(snap){ return _verifyNoTier(ref, snap); }).then(function(snap){
      if(!snap) throw new Error('verifikasi paket gagal');
      _applyCloudTier(snap.exists ? (snap.data() || {}) : {}, false);
      _tierRetryN = 0; clearTimeout(_tierRetryT);
      return true;
    }).catch(function(e){
      console.warn('Muat paket gagal:', e);
      if(_tierState !== 'ok') _scheduleTierRetry();
      return false;
    }).then(function(ok){ _tierBusy = null; return ok; });
    return _tierBusy;
  };
  function _tierMaybeRefresh(){
    if(!_fbReady || !window.pbCloudUid) return;
    if(_tierState !== 'ok'){ _tierRetryN = 0; window.pbRefreshTier(); }
    else if(Date.now() - _tierAt > 120000) window.pbRefreshTier();
  }
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) _tierMaybeRefresh(); });
  window.addEventListener('online', _tierMaybeRefresh);
  // Tombol "Muat ulang paket" di modal upgrade.
  window.pbReloadTier = function(btn){
    var old = btn ? btn.textContent : '';
    if(btn){ btn.disabled = true; btn.textContent = 'Memuat…'; }
    _tierRetryN = 0;
    var p = (_fbReady && window.pbCloudUid) ? window.pbRefreshTier() : Promise.resolve(false);
    return p.then(function(ok){
      if(btn){ btn.disabled = false; btn.textContent = old; }
      try{
        if(ok){
          var C = window.PB_TIER_CONFIG, t = pbGetTier(), cur = document.getElementById('upg-cur'), h = document.getElementById('upg-h');
          if(cur && C && C[t]) cur.textContent = 'Paket kamu: ' + C[t].label + ', ' + C[t].limit + ' produk/hari';
          if(h) h.textContent = (t === 'premium') ? 'Perpanjang paket Premium-mu' : 'Naik paket, produk harianmu makin banyak';
          showToast('Paket diperbarui: ' + C[t].label, 'success');
        }else{
          showToast(window.pbCloudUid ? 'Paket belum bisa dimuat. Cek koneksi lalu coba lagi.' : 'Akunmu belum tersambung ke server. Buka ulang aplikasi atau login ulang.', 'error');
        }
      }catch(x){}
      return ok;
    });
  };

  async function _pullAll(){
    var ref = _docRef(); if(!ref) return;
    try{
      // FIX (Sept 2026, "balik gratis setelah refresh beberapa kali"): dulu di sini
      // ref.get() biasa, yang boleh mengembalikan salinan cache/setengah jadi (mis. dokumen
      // yang isinya baru pb_email dari tulisan tertunda di pbCloudInit) — sedangkan tombol
      // "Muat ulang paket" memakai source:'server' dan selalu benar. Sekarang startup pakai
      // jalur yang sama. Kalau server tidak terjangkau, jatuh ke ref.get() biasa TAPI tier-nya
      // tidak dipakai (dianggap cache) dan retry terjadwal yang menentukan.
      var snap, _viaServer = true;
      try{
        snap = await ref.get({source: 'server'});
        snap = await _verifyNoTier(ref, snap);
        if(!snap) throw new Error('verifikasi paket gagal');
      }
      catch(_se){
        _viaServer = false;
        _tlog('startup-server-gagal', 'uid…' + _uidTail() + ' ' + String((_se && (_se.code || _se.message)) || _se).slice(0, 60));
        snap = await ref.get();
      }
      var data = snap.exists ? (snap.data() || {}) : {};
      _applyCloudTier(data, !_viaServer || !!(snap.metadata && snap.metadata.fromCache)); // tier dulu, baru data berat di bawah
      // FIX (chunking, Sept 2026): tarik tiap key dari struktur potongan baru
      // (users/{uid}/blobs/{key}__N) secara paralel. Kalau belum ada manifest
      // utk key itu (akun lama / belum pernah ke-push pakai kode baru ini),
      // _pullBlobKey balikin undefined — fallback ke field lama di dokumen
      // users/{uid} (data[k]) supaya data yang sudah kadung tersinkron
      // sebelum fitur pecah-data ini ada TIDAK hilang. Sekali key itu
      // ke-push ulang (Simpan/edit apa saja), otomatis pindah ke struktur
      // baru dari situ.
      await Promise.all(PB_SYNC_KEYS.map(async function(k){
        var isDirty = false;
        try{ isDirty = !!localStorage.getItem('__dirty_'+k); }catch(e){}
        var isMergeKey = PB_LOG_MERGE_KEYS.indexOf(k) > -1;
        // FIX BUG SINKRON (audit lanjutan, statistik biaya & cache): dulu key
        // dirty langsung short-circuit ke push tanpa sempat menarik/menggabung
        // cloud dulu — utk pb_usage_log_v1 ini bisa membuang baris riwayat dari
        // perangkat LAIN yang sudah lebih dulu ada di cloud. Sekarang khusus
        // isMergeKey TETAP lanjut menarik+menggabung cloud dulu walau dirty
        // (lihat cabang isMergeKey di bawah); key lain tetap short-circuit
        // seperti semula (perilaku tidak berubah untuk key non-riwayat).
        if(isDirty && !isMergeKey){ window.pbCloudQueue(k); return; } // ada perubahan lokal yg belum ke-push, jangan ditimpa — push dulu
        var val;
        try{ val = await _pullBlobKey(k); }catch(e){ val = undefined; }
        if(val === undefined && typeof data[k] === 'string') val = data[k]; // fallback data lama (pra-chunking)
        if(typeof val !== 'string'){ if(isDirty) window.pbCloudQueue(k); return; } // belum ada data cloud sama sekali — kalau lokal dirty, tetap push
        // FIX BUG SINKRON (audit lanjutan, statistik biaya & cache): pb_usage_log_v1
        // (riwayat per-panggilan) BUKAN ditimpa mentah seperti key lain di atas —
        // digabung (union by id, lihat _mergeLogArrays) dengan riwayat lokal,
        // supaya baris dari perangkat lain yang sempat generate berdekatan
        // waktu TIDAK hilang tertimpa. Kalau hasil gabungan ternyata punya baris
        // yang cloud belum tahu (kontribusi lokal, termasuk yang sempat dirty),
        // push balik hasil gabungannya supaya cloud ikut lengkap juga — bukan
        // cuma perangkat ini yang jadi lengkap.
        if(isMergeKey){
          var cloudArr=[]; try{ cloudArr=JSON.parse(val)||[]; }catch(e){ cloudArr=[]; }
          if(!Array.isArray(cloudArr))cloudArr=[];
          var localArr=[]; try{ localArr=JSON.parse(localStorage.getItem(k)||'[]')||[]; }catch(e){ localArr=[]; }
          if(!Array.isArray(localArr))localArr=[];
          var merged=_mergeLogArrays(cloudArr,localArr);
          try{ localStorage.setItem(k, JSON.stringify(merged)); }catch(e){}
          if(isDirty || merged.length !== cloudArr.length){ try{ localStorage.setItem('__dirty_'+k,'1'); }catch(e){} window.pbCloudQueue(k); }
          return;
        }
        try{ localStorage.setItem(k, val); }catch(e){}
      }));
      // FIX BUG SINKRON: pb_usage_stats_v1/pb_wordfix_stats_v1 TIDAK ditimpa
      // mentah-mentah seperti PB_SYNC_KEYS di atas — digabung (merge) dengan
      // delta lokal yang belum sempat ke-push, lihat _pullCounterMerge.
      PB_COUNTER_SYNC_KEYS.forEach(function(k){ _pullCounterMerge(data,k); });
      // ── TARIK STATUS TIER & QUOTA HARIAN (fitur tier berbayar, Sept 2026) ──
      // pb_tier/pb_tier_expiry di-SET MANUAL oleh admin di Firebase Console
      // setelah cek transfer (lihat instruksi di dekat PB_TIER_CONFIG di atas)
      // — di sini app cuma MEMBACA-nya. pb_quota ditulis oleh device manapun
      // tiap kali generate (lihat dlIncrement/pbCloudPushQuota); kalau dua
      // device generate di hari yang sama, ambil angka TERBESAR biar tidak
      // ada quota yang "hilang" gara-gara device lain menimpa duluan.
      try{
        // (tier sudah dipasang di awal _pullAll lewat _applyCloudTier — tidak diulang di sini)
        if(data.pb_quota && typeof data.pb_quota === 'object' && data.pb_quota.date){
          var _cq = data.pb_quota, _today = (typeof pbTodayStr==='function') ? pbTodayStr() : null;
          if(_today && _cq.date === _today){
            var _lq = null; try{ var _r=localStorage.getItem('pb_quota_v1'); _lq = _r?JSON.parse(_r):null; }catch(e){}
            var _merged = (_lq && _lq.date===_today) ? Math.max(_cq.count||0, _lq.count||0) : (_cq.count||0);
            localStorage.setItem('pb_quota_v1', JSON.stringify({date:_today, count:_merged}));
          }
        }
      }catch(e){}
      if(typeof data.pb_api_key_plain === 'string' && data.pb_api_key_plain && typeof _vaiEncKey === 'function'){
        try{
          var enc = await _vaiEncKey(data.pb_api_key_plain);
          if(enc) localStorage.setItem('pb_vai_k', enc);
          if(typeof VAI !== 'undefined') VAI.apiKey = data.pb_api_key_plain;
        }catch(e){}
      }
      _setSyncStatus('ok');
    }catch(e){ console.warn('Ambil data cloud gagal:', e); _setSyncStatus('error', _syncErrMsg(e), 'pull'); if(_tierState !== 'ok') _scheduleTierRetry(); }
    // Segarkan tampilan yang mungkin sudah kadung dirender sebelum data
    // cloud ini turun (mis. riwayat/halaman tersimpan render kosong dulu
    // sebelum login selesai).
    try{ if(typeof historyRender === 'function') historyRender(); }catch(e){}
    try{ if(typeof pbSavedRender === 'function') pbSavedRender(); }catch(e){}
    try{ if(typeof csRenderAll === 'function') csRenderAll(); }catch(e){}
    try{ if(typeof dlRenderBar === 'function') dlRenderBar(); }catch(e){}
    // Segarkan panel "Statistik Biaya & Cache" juga (no-op sendiri kalau
    // panel lagi ditutup) — biar begitu data cloud turun, angkanya
    // langsung sama dengan perangkat lain yang login Gmail sama.
    try{ if(typeof _vbRenderUsageBadge === 'function' && typeof _vbLoadUsageStats === 'function') _vbRenderUsageBadge(_vbLoadUsageStats()); }catch(e){}
  }

  // Dipanggil setelah login sukses (GIS, native dengan idToken, atau sesi
  // tersimpan yang login-nya sudah dilakukan sebelumnya). idToken boleh
  // null — kalau null, dicoba pakai sesi Firebase Auth yang sudah persist
  // sebelumnya (Firebase menyimpan sesinya sendiri di IndexedDB, terpisah
  // dari localStorage STORAGE_KEY punya app ini).
  window.pbCloudInit = async function(user, idToken){
    if(!_fbReady){ _setSyncStatus('off'); _pbCloudReadyDone(); return; } // belum disetel di langkah 1-6 atas → tetap lokal
    _setSyncStatus('connecting');
    if(_tierState !== 'ok') _setTierState('loading');
    try{
      if(idToken){
        var cred = firebase.auth.GoogleAuthProvider.credential(idToken);
        var res = await firebase.auth().signInWithCredential(cred);
        window.pbCloudUid = res.user.uid;
      } else {
        await new Promise(function(resolve){
          var unsub = firebase.auth().onAuthStateChanged(function(fbUser){
            unsub();
            if(fbUser && (!user || !user.email || fbUser.email === user.email)){
              window.pbCloudUid = fbUser.uid;
            }
            resolve();
          });
        });
      }
      if(!window.pbCloudUid){
        // Tidak ada idToken & tidak ada sesi Firebase yang cocok — ini
        // bisa kejadian di app native SELAMA plugin Kotlin GoogleAuthNative
        // belum ikut mengirim idToken ke pbNativeLoginSuccess (lihat
        // komentar di dekat window.pbNativeLoginSuccess). App tetap jalan
        // normal, cuma sinkron antar-perangkat belum aktif utk sesi ini.
        console.info('Sinkron cloud belum aktif untuk sesi ini (tidak ada idToken/sesi Firebase yang cocok).');
        _setTierState('unknown');
        _setSyncStatus('off');
        return;
      }
      // PENTING: kalau uid yang login SEKARANG beda dari uid terakhir yang
      // datanya nyangkut di localStorage perangkat ini (mis. ganti akun
      // Google di browser/HP yang sama), bersihkan dulu PB_SYNC_KEYS supaya
      // data akun LAMA tidak "kebawa"/kelihatan seolah milik akun BARU
      // selama _pullAll() di bawah belum/tidak menemukan data cloud utk
      // akun baru itu (mis. akun baru belum pernah nyimpan apa-apa).
      var _lastUid = null;
      try{ _lastUid = localStorage.getItem('pb_last_cloud_uid'); }catch(e){}
      if(_lastUid && _lastUid !== window.pbCloudUid){
        // FIX (audit auth #1 & #4): kuota harian + flag dirty/chunk akun LAMA ikut dibersihkan.
        PB_SYNC_KEYS.forEach(function(k){ try{ localStorage.removeItem(k); localStorage.removeItem('__dirty_'+k); localStorage.removeItem('__chunkN_'+k); }catch(e){} });
        try{ localStorage.removeItem('pb_quota_v1'); localStorage.removeItem('pb_tier_v1'); localStorage.removeItem('pb_tier_expiry_v1'); }catch(e){}
        // FIX BUG (audit lanjutan, Sept 2026): PB_COUNTER_SYNC_KEYS (pb_usage_stats_v1/
        // pb_wordfix_stats_v1) DAN file baseline "__base" pendampingnya HARUS
        // ikut dibersihkan di sini juga — sejak dipisah dari PB_SYNC_KEYS (lihat
        // catatan di dekat definisinya), forEach di atas TIDAK menyentuhnya lagi,
        // jadi kalau tidak ditambahkan manual di sini, angka statistik akun LAMA
        // bakal "kebawa" kelihatan seolah milik akun BARU setelah ganti akun.
        PB_COUNTER_SYNC_KEYS.forEach(function(k){
          try{ localStorage.removeItem(k); }catch(e){}
          try{ localStorage.removeItem(k+'__base'); }catch(e){}
        });
        try{ localStorage.removeItem('pb_vai_k'); }catch(e){}
        try{ localStorage.removeItem('pb_ai_model_v1'); if(typeof pbResetAiModelToDefault==='function') pbResetAiModelToDefault(); }catch(e){}
        _tlog('uid-berubah', '…' + String(_lastUid).slice(-6) + ' → …' + _uidTail() + ' (tier lokal dibersihkan)');
        try{
          var _emR = (firebase.auth().currentUser && firebase.auth().currentUser.email) || (user && user.email) || '';
          if(_emR && typeof window.pbTierCacheRestore === 'function') window.pbTierCacheRestore(_emR);
        }catch(e){}
      }
      try{ localStorage.setItem('pb_last_cloud_uid', window.pbCloudUid); }catch(e){}
      // Simpan email di dokumen user (BUKAN sebagai id dokumen, cuma field
      // biasa) supaya admin gampang cari user di Firestore Console pas mau
      // naikkan tier manual setelah cek transfer — id dokumennya sendiri
      // tetap uid (bukan email), jadi ini murni buat pencarian manual.
      // FIX (Sept 2026): pb_email ditulis SETELAH _pullAll() selesai (dulu sebelum, dan tulisan
      // tertunda itulah yang memicu dokumen setengah jadi tanpa pb_tier) — urutan ini tetap
      // dipertahankan di bawah.
      // FIX BUG (8 Okt 2026, laporan user "ada user lolos, Gmail-nya tidak terdata di admin"):
      // SEBELUMNYA baris _docRef().set({pb_email:...}) di bawah ada di DALAM try yang sama dengan
      // `await _pullAll()` — kalau _pullAll() melempar error (network/izin Firestore/dsb, BUKAN hal
      // langka), eksekusi langsung lompat ke catch paling luar dan baris simpan email ITU SENDIRI
      // TIDAK PERNAH DIJALANKAN sama sekali untuk sesi itu. Sementara itu pbCloudPushQuota() (tiap
      // generate) dan sinkron blob (riwayat/halaman tersimpan, lewat pbCloudQueue) SAMA SEKALI TIDAK
      // bergantung pada _pullAll berhasil — jadi dokumen users/{uid} user itu tetap kebuat LENGKAP
      // dengan pb_quota/riwayat (makanya tampak aktif & "lolos" di admin), tapi pb_email-nya kosong
      // selamanya kalau _pullAll kebetulan gagal PERSIS di sesi login pertama mereka (dan tidak ada
      // percobaan ulang — ini satu-satunya tempat pb_email ditulis). Sekarang _pullAll() dibungkus
      // try/catch SENDIRI: errornya ditangkap dulu (supaya baris simpan email di bawah tetap jalan),
      // lalu dilempar ULANG di akhir blok ini — supaya penanganan error yang sudah ada (status sinkron
      // & jadwal retry tier di catch paling luar) tetap persis seperti sebelumnya.
      var _pullErr = null;
      try{ await _pullAll(); }catch(ePull){ _pullErr = ePull; }
      _lastActiveReady = true; _touchLastActive(true); // catat "terakhir aktif" tiap app dibuka
      try{
        var _emForDoc = (firebase.auth().currentUser && firebase.auth().currentUser.email) || (user && user.email) || '';
        if(_emForDoc && (!_lastDocInfo || _lastDocInfo.email !== _emForDoc)){ _docRef().set({pb_email:_emForDoc, _updatedAt:Date.now()}, {merge:true}).catch(function(eSet){ console.warn('Simpan pb_email gagal:', eSet); }); }
      }catch(e){}
      if(_pullErr) throw _pullErr;
    }catch(e){ console.warn('pbCloudInit gagal:', e); _setSyncStatus('error', _syncErrMsg(e), 'pull'); if(window.pbCloudUid && _tierState !== 'ok') _scheduleTierRetry(); else if(_tierState === 'loading') _setTierState('unknown'); }
    finally{
      // FITUR BARU (permintaan user): apapun hasilnya (berhasil, gagal,
      // atau memang tidak ada sinkron aktif utk sesi ini), tandai proses
      // tarik-cloud dianggap "selesai" di sini — supaya tur onboarding
      // yang menunggu status ini tidak nyangkut selamanya.
      _pbCloudReadyDone();
    }
  };

  // Dipanggil dlIncrement() tiap sukses generate — nyimpan hitungan quota
  // harian ke Firestore (merge, bukan timpa field lain).
  window.pbCloudPushQuota = function(quotaObj){
    if(!_fbReady || !window.pbCloudUid) return;
    var ref = _docRef(); if(!ref) return;
    ref.set({pb_quota: quotaObj, _updatedAt: Date.now()}, {merge:true})
      .catch(function(e){ console.warn('Sync quota gagal:', e); });
  };
  // FIX KEAMANAN #2 (audit upgrade member, Sept 2026): tarik ULANG pb_quota
  // dari Firestore secara diam-diam tiap kali dlCheckBeforeCall() jalan
  // (dipanggil dari situ, lihat bawah file). Kenapa perlu: rules Firestore
  // sekarang menolak update yang MENURUNKAN count di hari yang sama (lihat
  // komentar quotaTidakBolehTurun() di dekat PB_FIREBASE_CONFIG) — tapi
  // kalau user sempat "reset" localStorage-nya sendiri (bukan Firestore),
  // device itu tidak otomatis tahu angka aslinya masih tinggi sampai ada
  // _pullAll() penuh (reload/login ulang). Fungsi ini menutup jeda itu:
  // baca ulang pb_quota dari cloud tiap mau generate, gabung pakai Math.max
  // (logika sama seperti _pullAll()) supaya angka lokal balik akurat dalam
  // hitungan detik, TANPA perlu reload. Sengaja tidak di-await/blocking di
  // pemanggilnya (cukup 1 GET Firestore ringan, hasilnya dipakai buat
  // PERCOBAAN GENERATE BERIKUTNYA, bukan yang sedang jalan sekarang) supaya
  // tidak bikin tiap klik generate jadi lambat nunggu network.
  window.pbCloudRefreshQuota = function(){
    if(!_fbReady || !window.pbCloudUid) return;
    var ref = _docRef(); if(!ref) return;
    ref.get().then(function(snap){
      if(!snap.exists) return;
      var data = snap.data() || {};
      if(!(data.pb_quota && typeof data.pb_quota === 'object' && data.pb_quota.date)) return;
      var _cq = data.pb_quota, _today = pbTodayStr();
      if(_cq.date !== _today) return;
      var _lq = null; try{ var _r=localStorage.getItem('pb_quota_v1'); _lq = _r?JSON.parse(_r):null; }catch(e){}
      var _merged = (_lq && _lq.date===_today) ? Math.max(_cq.count||0, _lq.count||0) : (_cq.count||0);
      try{ localStorage.setItem('pb_quota_v1', JSON.stringify({date:_today, count:_merged})); }catch(e){}
      try{ dlRenderBar(); }catch(e){}
    }).catch(function(){});
  };
  // Dipanggil pas user klik "Sudah Transfer" di modal upgrade — nyimpan
  // permintaan upgrade supaya kelihatan di Firestore Console (field
  // pb_upgrade_request), memudahkan admin cross-check sebelum naikkan tier.
  window.pbCloudPushUpgradeRequest = function(reqObj){
    if(!_fbReady || !window.pbCloudUid) return;
    var ref = _docRef(); if(!ref) return;
    ref.set({pb_upgrade_request: reqObj, _updatedAt: Date.now()}, {merge:true})
      .catch(function(e){ console.warn('Sync upgrade request gagal:', e); });
  };
  // FIX (audit auth #4): kirim semua key yang masih dirty (dipanggil sebelum logout).
  window.pbCloudFlush = function(){
    if(!_fbReady || !window.pbCloudUid) return Promise.resolve();
    var jobs = [];
    PB_SYNC_KEYS.forEach(function(k){
      var dirty = false;
      try{ dirty = !!localStorage.getItem('__dirty_'+k); }catch(e){}
      if(!dirty) return;
      clearTimeout(_timers[k]);
      jobs.push(_pushBlob(k, k === PB_SAVED_SYNC_KEY).catch(function(){}));
    });
    PB_COUNTER_SYNC_KEYS.forEach(function(k){
      clearTimeout(_timers['__ctr_'+k]);
      try{ jobs.push(Promise.resolve(_pushCounter(k)).catch(function(){})); }catch(e){}
    });
    return Promise.all(jobs);
  };
  window.pbCloudSignOut = function(){
    clearTimeout(_tierRetryT); _tierState = 'unknown';
    _tierWatchStop(); _lastServerTier = null; _tierBaselineAt = 0; // v11.70: hentikan pantau upgrade
    window.pbCloudUid = null;
    _setSyncStatus('off');
    // FIX (Sept 2026): kembalikan promise-nya supaya logout bisa MENUNGGU
    // signOut() selesai sebelum reload (lihat _pbDoLogout).
    if(_fbReady){ try{ return firebase.auth().signOut(); }catch(e){} }
    return Promise.resolve();
  };
})();
