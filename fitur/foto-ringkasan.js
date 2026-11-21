// fitur/foto-ringkasan.js — Foto — Ringkasan Visual sebelum Generate.
// Bagian dari js/10-main-app.js lama (baris 24812–25348). Isi tidak diubah.
// ============================================================
// SUMMARY CARD — Ringkasan Visual Sebelum Generate (Fitur #5)
// ============================================================
function fRenderSummary() {
  let rows = document.getElementById('summary-rows');
  let warningEl = document.getElementById('summary-warning');
  let warningText = document.getElementById('summary-warning-text');
  let okBadge = document.getElementById('summary-ok-badge');
  if (!rows) return;

  let isProdukSaja = (FS.subjek === 'produk');
  let warnings = [];

  // ── Bangun baris ringkasan ─────────────────────────────────────
  let items = [];

  // Subjek
  const SUBJEK_LABEL = {hijab:'Perempuan', pria:'Laki-laki'};
  items.push({
    key: 'Subjek',
    val: SUBJEK_LABEL[FS.subjek] || '—',
    editCard: null // tidak bisa di-edit langsung, hanya info
  });

  // Foto referensi
  // FIX IMPORT: kalau mode import aktif, foto referensi ada di FS.importRefPhotos
  // (teks hasil parse JSON), BUKAN di FS.refs (yang khusus foto asli hasil upload).
  let refCount, hasOutfitRandom, totalRefCount;
  if (FS.importActive) {
    // FIX RINGKASAN FOTO REF BASI PASCA-EDIT IMPOR: sebelumnya angka di sini
    // SELALU diambil dari FS.importRefPhotos.length — snapshot BEKU dari JSON
    // yang pertama kali ditempel — padahal tombol "Edit" di baris ini membuka
    // Card 1 yang isinya FS.refs yang LIVE (bisa berubah kalau user tambah/
    // hapus foto di sana setelah impor). Akibatnya kalau user edit foto
    // referensi pasca-impor, baris "Foto Ref" di Ringkasan tidak ikut update,
    // padahal reference_photos di JSON hasil generate (lihat _fBuildImportedPromptJSON)
    // sudah benar pakai FS.refs live. Sekarang dihitung dengan cara yang
    // SAMA seperti JSON aktual: FS.refs live (tipe dikenal, bisa diedit) +
    // entri "tipe tidak dikenal" yang masih nyangkut apa adanya di
    // FS.importRefPhotos (tidak pernah tersinkron ke FS.refs sejak awal).
    let liveRealCount = FS.refs ? FS.refs.filter(function(r){return r.type!=='outfit_random';}).length : 0;
    let unknownCount = (FS.importRefPhotos || []).filter(function(p){return p && !_fREF_LABEL_TO_KEY[p.type];}).length;
    totalRefCount = liveRealCount + unknownCount;
    refCount = totalRefCount;
    // FIX IMPORT OUTFIT AI: cek FS.refs dulu (sumber kebenaran setelah sinkron/edit),
    // fallback ke array import mentah untuk jaga-jaga.
    hasOutfitRandom = (FS.refs && FS.refs.some(function(r){return r.type==='outfit_random';})) || (FS.importGeneratedOutfit && FS.importGeneratedOutfit.length > 0);
  } else {
    refCount = FS.refs ? FS.refs.filter(r => r.type !== 'outfit_random').length : 0;
    hasOutfitRandom = FS.refs ? FS.refs.some(r => r.type === 'outfit_random') : false;
    totalRefCount = FS.refs ? FS.refs.length : 0;
  }
  let refLabel = (refCount > 0 || hasOutfitRandom) ? (refCount > 0 ? refCount + ' foto' : '') + (hasOutfitRandom ? (refCount > 0 ? ' + ' : '') + 'outfit random' : '') : (FS.importActive ? 'Diimpor <svg class="icon"><use href="#ic-check"></use></svg>' : '—');
  // FIX #4: untuk produk saja, warning foto hanya jika benar-benar 0 foto total
  if (refCount === 0 && !hasOutfitRandom && !isProdukSaja && !FS.importActive) warnings.push('Belum ada foto referensi — upload minimal 1 foto.');
  if (isProdukSaja && totalRefCount === 0 && !FS.importActive) warnings.push('Upload minimal 1 foto produk.');
  // JARING PENGAMAN — KASUS SERUPA #2: sekarang seharusnya SUDAH auto-switch
  // lewat _fSyncImportSubjekState() (dipanggil dari fAddRef/fRemoveRef) tiap
  // kali FS.refs berubah, jadi FS.importIsProdukSaja mestinya sudah ikut
  // ke-flip ke false begitu ada foto karakter. Baris di bawah ini cuma
  // fallback kalau untuk suatu alasan sync itu tidak sempat jalan (mis. ada
  // jalur lain di masa depan yang mengubah FS.refs tanpa lewat fAddRef/
  // fRemoveRef) — supaya user tetap dikasih tahu, bukan diam-diam dapat JSON
  // yang kontradiksi.
  if (FS.importActive && FS.importIsProdukSaja && FS.refs && FS.refs.some(function(r){return r.type==='wajah'||r.type==='outfit'||r.type==='atasan'||r.type==='bawahan'||r.type==='aksesori'||r.type==='outfit_random';})) {
    warnings.push('Ada foto karakter tapi prompt ini masih tercatat "Produk Saja" — buka lagi Foto Referensi (hapus lalu tambah ulang salah satu foto) supaya mode-nya ikut disinkronkan.');
  }
  items.push({ key: 'Foto Ref', val: refLabel, editCard: 1, isHtml: true });

  // Produk
  if (!isProdukSaja) {
    const PRODUK_LABEL = {tidak:'Tidak ada', dipakai:'Dipakai di badan', pegang:'Dipegang ke kamera', foto:'Dari foto produk'};
    let produkVal = PRODUK_LABEL[FS.produkMode] || '—';
    if (FS.produkNama) produkVal += ' · ' + FS.produkNama;
    // FIX: mode 'foto' (nama produk auto-detect dari foto produk yang
    // di-upload) TIDAK punya UI di Card 2 — input namanya ada di Card 1
    // (kartu foto referensi). Sebelumnya selalu diarahkan ke Card 2 tanpa
    // syarat, jadi tombol Edit malah nampilin layar "belum pilih foto
    // produk" yang salah & bikin bingung padahal fotonya sudah dipilih.
    // STEP 2 DIHAPUS DARI FLOW: baris "Produk" di Ringkasan sekarang cuma
    // ditampilkan kalau memang ada info produk nyata (mis. 'foto' — auto
    // terdeteksi dari foto produk yang di-upload, atau 'dipakai'/'pegang'
    // dari data lama hasil impor/autosave). Kalau produkMode masih default
    // 'tidak'/kosong (kondisi normal sekarang: user tidak upload foto
    // produk), baris ini disembunyikan total — tidak ada lagi tombol Edit
    // yang bisa membuka lagi Card 2 (pilihan ada/tidak produk) yang sudah
    // dihapus dari flow aktif.
    // Baris "Produk" DIHAPUS dari Ringkasan (permintaan user): fungsinya sama
    // dengan Foto Ref — nama produk diubah lewat Edit di baris Foto Ref.

    // JARING PENGAMAN TAMBAHAN pasca-impor: kalau ada foto bertipe 'produk'
    // di Step 1 tapi namanya belum diisi (mis. baru saja ditambah), kasih
    // tahu di sini juga — bukan cuma nunggu diblok pas tombol Generate
    // ditekan — supaya user langsung tahu ke mana harus melengkapi.
    // FIX BUG TC5 — WARNING TIDAK PERNAH MUNCUL: sebelumnya syarat ini
    // digantung ke "FS.produkMode === 'foto'". Padahal pasca-import,
    // FS.produkMode SELALU 'pegang' (lihat fImportPrompt) kalau JSON yang
    // diimpor sudah bawa product block sendiri — dan _fSyncImportProdukState()
    // cuma memindahkan produkMode ke 'foto' KALAU sebelumnya kosong/'tidak'.
    // Jadi begitu user tambah foto produk BARU yang namanya kosong padahal
    // sebelumnya sudah ada produk hasil import (produkMode='pegang'),
    // kondisi "===foto" ini tidak pernah kena, warning-nya diam-diam tidak
    // pernah tampil. Sekarang dicek langsung dari kartu foto produk yang
    // benar-benar ada di FS.refs — tidak peduli produkMode-nya apa.
    if (FS.importActive && FS.refs && FS.refs.some(function(r){return r.type==='produk' && (!r.focus || !r.focus.trim());})) {
      warnings.push('Ada foto produk yang namanya belum diisi — buka kartu fotonya di Foto Referensi.');
    }

    // Cara hold — hanya jika dipegang
    // Cara Tampil selalu tampil di Ringkasan kalau ada produk (foto/pegang) atau
    // cara tampil sudah terisi (mis. hasil impor) — bukan cuma mode 'pegang'.
    if (FS.produkMode === 'pegang' || FS.produkMode === 'foto' || FS.holdKey) {
      const HOLD_LABEL = {dipakai:'Dipakai langsung', hanger:'Pakai hanger', tangan:(fIsNoChar()?'Dipegang tangan (POV)':'Dipegang ke kamera')};
      let holdDisplay = HOLD_LABEL[FS.holdKey] || (FS.hold ? FS.hold.substring(0,40) + '…' : '—');
      items.push({ key: 'Cara Tampil', val: holdDisplay, editCard: 3 });
    }

    // Pose — BUG FIX #6: pakai label friendly jika ada
    if (!fIsNoChar()) {
    let poseDisplay = FS.poseLabel || (FS.pose ? (FS.pose.length > 55 ? FS.pose.substring(0, 55) + '…' : FS.pose) : '—');
    if (!FS.pose) warnings.push('Pose belum dipilih.');
    items.push({ key: 'Pose', val: poseDisplay, editCard: (typeof fHasPoseRef==='function'&&fHasPoseRef()) ? 0 : 4 });
    }
  }

  // Lokasi — BUG FIX #6: pakai label friendly jika ada, fallback ke raw string
  let _hl = fHasLokasiRef();
  let lokasiDisplay = _hl ? 'Dari foto lokasi' : FS.lokasiLabel || (FS.lokasi ? (FS.lokasi.length > 55 ? FS.lokasi.substring(0, 55) + '…' : FS.lokasi) : '—');
  if (!FS.lokasi && !_hl) warnings.push('Lokasi belum dipilih.');
  if (FS.importActive && !_hl && /reference photo \d+/i.test(String(FS.lokasiDesc||FS.lokasi||'')+' '+String(FS.cahayaDesc||FS.cahaya||''))) warnings.push('Lokasi/Cahaya masih merujuk foto lokasi yang sudah dihapus — ganti lewat Edit di Ringkasan.');
  items.push({ key: 'Lokasi', val: lokasiDisplay, editCard: _hl ? 0 : 5 });

  // Pencahayaan — BUG FIX #6: pakai label friendly jika ada
  let cahayaDisplay = _hl ? 'Dari foto lokasi' : FS.cahayaLabel || (FS.cahaya ? (FS.cahaya.length > 55 ? FS.cahaya.substring(0, 55) + '…' : FS.cahaya) : '—');
  if (!FS.cahaya && !_hl) warnings.push('Pencahayaan belum dipilih.');
  items.push({ key: 'Cahaya', val: cahayaDisplay, editCard: _hl ? 0 : 7 });

  // Sudut kamera — BUG FIX #6: pakai label friendly jika ada
  let angleDisplay = FS.angleLabel || (FS.angle ? (FS.angle.length > 55 ? FS.angle.substring(0, 55) + '…' : FS.angle) : '—');
  if (!FS.angle) warnings.push('Sudut kamera belum dipilih.');
  items.push({ key: 'Angle', val: angleDisplay, editCard: (typeof _fIsPovHandNoChar==='function' && _fIsPovHandNoChar()) ? 0 : 8 });

  // Mood & Tone
  let moodDisplay = FS.moodLabel || (FS.mood ? (FS.mood.length > 55 ? FS.mood.substring(0, 55) + '…' : FS.mood) : '—');
  if (!FS.mood) warnings.push('Mood & tone belum dipilih.');
  items.push({ key: 'Mood', val: moodDisplay, editCard: 9 });

  // ── Render rows ───────────────────────────────────────────────
  rows.innerHTML = items.map(item => {
    let editBtn = item.editCard ? `<button class="summary-edit" onclick="fSummaryEdit(${item.editCard})"><svg class="icon"><use href="#ic-edit"></use></svg> Edit</button>` : '';
    let valClass = (item.val === '—') ? 'summary-row-val empty' : 'summary-row-val';
    let safeVal = item.isHtml ? item.val : esc(item.val);
    return `<div class="summary-row">
      <div class="summary-row-key">${item.key}</div>
      <div class="${valClass}">${safeVal}</div>
      ${editBtn}
    </div>`;
  }).join('');

  // ── Warning / OK badge ────────────────────────────────────────
  if (warnings.length > 0) {
    if (warningEl) warningEl.style.display = 'flex';
    if (warningText) warningText.textContent = warnings.join(' ');
    if (okBadge) { okBadge.textContent = 'Cek'; okBadge.style.background = 'var(--surface3)'; okBadge.style.color = 'var(--text)'; okBadge.style.borderColor = 'var(--border-hi)'; }
  } else {
    if (warningEl) warningEl.style.display = 'none';
    if (okBadge) { okBadge.innerHTML = '<svg class="icon"><use href="#ic-check"></use></svg> Siap'; okBadge.style.background = 'rgba(76,175,125,0.12)'; okBadge.style.color = 'var(--green)'; okBadge.style.borderColor = 'rgba(76,175,125,0.2)'; }
  }
}

// ── RESTORE STATE VISUAL PER CARD ────────────────────────────────────────
// Dipakai baik dari summary "✏ Edit" maupun dari tap "ubah" di tiap step
// card, supaya value yang sudah ada (manual ATAU hasil import prompt lama)
// TIDAK pernah hilang/ke-reset jadi kosong hanya karena card dibuka lagi.
// Kalau value itu cocok dengan salah satu chip preset, chip-nya di-highlight;
// kalau tidak (custom/dari prompt lama yang teksnya beda), kotak "tulis
// sendiri" diisi otomatis dengan teks yang sudah ada.
function fRestoreStepUI(cardNum) {
  // FIX LANJUTAN (audit dari kasus Foto Referensi/f1 di bawah — user
  // bertanya apakah kelas bug ini ada juga di tempat lain selama tur):
  // step 0 (Subjek Foto) TERNYATA punya masalah PERSIS SAMA. Versi
  // sederhananya (class pb-tour-f0-simple, teks f0Desc yang disederhanakan,
  // badge "sedang membuat prompt") dipasang di pbGoStep5(), tapi begitu
  // subjek dikonfirmasi step ini otomatis "selesai" dan versi sederhana itu
  // TIDAK otomatis dipasang ulang kalau step ini dibuka lagi lewat whead
  // click ATAU sheet "Lompat ke step" (keduanya berujung ke sini). Beda
  // dengan alur "← Kembali" dari f1 ke f0 (_fSubjekAdvance, sudah lebih
  // dulu di-fix — lihat pbTourStep56Active di sana), jalur reopen dari
  // "Lompat ke step"/whead click ini belum ke-cover. Panggil ulang
  // pbTourResetF0Ui()+pbGoStep5() di sini kalau sesi tur Langkah 5+6 masih
  // berjalan (pbTourStep56Active — flag yang sama, tetap true sepanjang
  // step 3-9 juga, lihat komentar di deklarasinya), supaya konsisten
  // dengan perbaikan di cardNum===1 di bawah.
  if (cardNum === 0) {
    if (typeof pbTourStep56Active !== 'undefined' && pbTourStep56Active
        && typeof pbTourResetF0Ui === 'function' && typeof pbGoStep5 === 'function') {
      pbTourResetF0Ui();
      pbGoStep5();
    }
  }
  if (cardNum === 1) {
    // FIX IMPORT: card Foto Referensi sebelumnya tidak punya restore logic —
    // saat dibuka ulang dalam mode import (foto asli tidak tersimpan, hanya
    // teks di FS.importRefPhotos), chip-nya keliatan kosong/"butuh foto" padahal
    // datanya sudah ada. Tampilkan info banner supaya jelas foto sudah diimpor.
    let notice = document.getElementById('f1-import-notice');
    let noticeText = document.getElementById('f1-import-notice-text');
    if (notice && noticeText) {
      // FIX IMPORT OUTFIT AI: FS.refs sekarang juga diisi entry outfit_random
      // hasil sinkron dari generated_outfit (lihat fImportPrompt), jadi cek
      // "belum ada foto asli" harus exclude tipe itu — supaya banner foto
      // real (Wajah/Produk/dst.) tetap muncul meski Outfit AI sudah keisi.
      let realRefsCount = FS.refs ? FS.refs.filter(function(r){return r.type!=='outfit_random';}).length : 0;
      if (FS.importActive && realRefsCount === 0 && FS.importRefPhotos && FS.importRefPhotos.length > 0) {
        let list = FS.importRefPhotos.map((r, i) => (i + 1) + '. ' + String((r && r.type) || 'Foto')).join(', ');
        noticeText.innerHTML = '<strong>' + FS.importRefPhotos.length + ' foto referensi tercatat dari prompt lama:</strong> ' + esc(list) + '. Ini cuma keterangan jenis fotonya (tools ini tidak menyimpan/mengunggah file foto) — saat kamu pakai hasil prompt-nya nanti di generator gambar, lampirkan foto asli sesuai urutan di atas secara manual di sana.';
        notice.style.display = 'flex';
      } else {
        notice.style.display = 'none';
      }
    }
    // FIX BUG RESIKO KEHILANGAN DATA: panel produk-saja step 1 defaultnya
    // menyembunyikan list foto (#f1-produk-saja-slots) & tombol "Selesai →"
    // (#f1-produk-saja-lanjut) sampai user klik "Konfirmasi →" — tapi tombol
    // itu (fProdukSajaKonfirmJumlah) me-RESET TOTAL FS.refs lalu bikin slot
    // kosong baru, didesain untuk alur manual dari nol. Kalau step ini dibuka
    // ulang untuk prompt HASIL IMPOR (FS.refs sudah terisi dari sinkronisasi),
    // tanpa fix ini satu-satunya kontrol yang kelihatan cuma tombol itu — kalau
    // diklik, semua foto referensi hasil impor langsung terhapus padahal
    // list-nya sebenarnya sudah ada (dirender fRenderList ke container yang
    // sama, cuma disembunyikan oleh fToggleF1Panel). Sekarang: langsung
    // tampilkan list & tombol "Selesai →" yang sudah terisi, skip UI stepper
    // "Jumlah foto", tanpa menyentuh FS.refs sama sekali.
    // FIX (dilaporkan user): kalau step 1 (Foto Referensi) dibuka ulang
    // untuk diedit SELAMA sesi tur diperpanjang masih berjalan (step 3-9,
    // lihat pbTourExtActive) — baik lewat klik header step (done -> edit,
    // whead click handler di doneCard()) MAUPUN lewat sheet "Lompat ke
    // step" (fSummaryEdit(1), yang juga memanggil fRestoreStepUI ini) —
    // tampilannya sebelumnya balik ke versi NORMAL (chip "Wajah", chip
    // "Objek" muncul lagi, banner "Cek HP dulu" muncul lagi). Ini terjadi
    // karena versi sederhana tur (class pb-tour-f1-simple, dkk) sudah
    // dilepas begitu step ini PERTAMA KALI selesai — lihat pbTourResetF1Ui,
    // dipanggil dari dalam pbGoStep6(). Padahal selama masih dalam sesi tur
    // yang sama (belum sampai step 9/Mood & Tone selesai), versi sederhana
    // INI yang seharusnya tetap dipakai tiap kali step 1 dibuka lagi.
    // Panggil ulang pbGoStep6() di sini supaya versi sederhana (label
    // "Karakter Sheet", chip Objek disembunyikan, banner tur, chip Outfit
    // terkunci) terpasang lagi, dan supaya penyelesaian ulang step ini
    // tetap terdeteksi dengan benar (di-arm ulang lewat pbArmDoneWait di
    // dalam pbGoStep6() itu sendiri).
    if (typeof pbTourExtActive !== 'undefined' && pbTourExtActive && typeof pbGoStep6 === 'function') {
      pbGoStep6();
    }
  }

  if (cardNum === 2) {
    // Restore pilihan produkMode — highlight chip yang sudah dipilih
    document.querySelectorAll('.produk-choice').forEach(c => c.classList.remove('sel'));
    if (FS.produkMode) {
      let pc = document.getElementById('pc-' + FS.produkMode);
      if (pc) pc.classList.add('sel');
    }
    // Restore nama produk di input jika ada
    if (FS.produkMode === 'pegang' || FS.produkMode === 'dipakai') {
      let box = document.getElementById('f2-produk-box');
      let inp = document.getElementById('f2-produk-input');
      if (box) box.classList.remove('hidden');
      if (inp && FS.produkNama) inp.value = FS.produkNama;
    }
    // SATU TOMBOL KONFIRMASI SAJA: sinkronkan tombol "Selesai Edit" generik
    // begitu card ini dibuka — kalau box nama produk (dengan tombol
    // "Konfirmasi →"-nya sendiri) kelihatan, sembunyikan tombol generik itu.
    if (typeof fSyncCardEditDoneBtn === 'function') {
      let boxVisible = (FS.produkMode === 'pegang' || FS.produkMode === 'dipakai');
      fSyncCardEditDoneBtn('f2', boxVisible);
    }
  }

  if (cardNum === 3) {
    // Restore pilihan holdKey di f3 chips
    document.querySelectorAll('#f3 .chip').forEach(c => c.classList.remove('sel'));
    if (FS.holdKey && FS.holdKey !== 'custom') {
      // Cari chip berdasarkan onclick yang mengandung holdKey
      let chips = document.querySelectorAll('#f3 .chip');
      chips.forEach(c => {
        let oc = c.getAttribute('onclick') || '';
        if (oc.includes("'" + FS.holdKey + "'")) c.classList.add('sel');
      });
    } else if (FS.holdKey === 'custom') {
      let inp = document.getElementById('f3-custom');
      if (inp) inp.value = FS.hold;
    }
  }

  if (cardNum === 4) {
    // Kalau chip pose belum pernah dirender di container ini (mis. langsung
    // buka step ini setelah import prompt lama), bangun dulu chip-nya
    let f4c = document.getElementById('f4-chips');
    if (f4c && !f4c.querySelector('.chip') && typeof fBuildPoseChips === 'function') fBuildPoseChips();
    // Restore pose — highlight chip atau isi custom input
    document.querySelectorAll('#f4-chips .chip').forEach(c => c.classList.remove('sel'));
    if (FS.poseLabel && FS.poseLabel !== 'Custom') {
      let chips = document.querySelectorAll('#f4-chips .chip');
      chips.forEach(c => { if (c.textContent.trim() === FS.poseLabel) c.classList.add('sel'); });
    } else if (FS.poseLabel === 'Custom') {
      let inp = document.getElementById('f4-custom');
      if (inp) inp.value = FS.pose;
    }
  }

  if (cardNum === 5) {
    // Restore lokasi — highlight chip di panel yang sesuai dengan subjek
    document.querySelectorAll('#f5 .chip').forEach(c => c.classList.remove('sel'));
    if (FS.lokasiLabel && FS.lokasiLabel !== 'Custom') {
      // Pilih selector panel berdasarkan subjek
      let panelId = '#f5-normal-panel';
      let chips = document.querySelectorAll(panelId + ' .chip');
      chips.forEach(c => {
        let oc = c.getAttribute('onclick') || '';
        if (oc.includes("'" + FS.lokasiLabel + "'")) c.classList.add('sel');
      });
    } else if (FS.lokasiLabel === 'Custom') {
      // Isi input di panel yang sesuai
      let customId = 'f5-custom-karakter';
      let inp = document.getElementById(customId);
      if (inp) inp.value = FS.lokasi;
    }
  }

  if (cardNum === 7) {
    // Apply context berdasarkan lokasi saat ini
    setTimeout(fApplyCahayaContext, 100);
    // Restore cahaya — highlight chip di panel yang sesuai subjek
    document.querySelectorAll('#f7-cahaya-chips .chip, #f7-cahaya-chips-karakter .chip').forEach(c => c.classList.remove('sel'));
    if (FS.cahayaLabel && FS.cahayaLabel !== 'Custom') {
      let cahayaPanelId = '#f7-normal-panel';
      let chips = document.querySelectorAll(cahayaPanelId + ' .chip');
      // Fallback ke semua chip jika panel tidak ditemukan
      if (!chips.length) chips = document.querySelectorAll('#f7-cahaya-chips .chip, #f7-cahaya-chips-karakter .chip');
      chips.forEach(c => { if (c.textContent.trim() === FS.cahayaLabel) c.classList.add('sel'); });
    } else if (FS.cahayaLabel === 'Custom') {
      let inp = document.getElementById('f7-custom');
      if (inp) inp.value = FS.cahaya;
    }
  }

  if (cardNum === 8) {
    // Restore angle — highlight chip atau isi custom
    document.querySelectorAll('#f8 .chip').forEach(c => c.classList.remove('sel'));
    if (FS.angleLabel && FS.angleLabel !== 'Custom') {
      let chips = document.querySelectorAll('#f8 .chip');
      chips.forEach(c => { if (c.textContent.trim() === FS.angleLabel) c.classList.add('sel'); });
    } else if (FS.angleLabel === 'Custom') {
      let inp = document.getElementById('f8-custom');
      if (inp) inp.value = FS.angle;
    }
  }

  if (cardNum === 9) {
    // Restore mood — highlight chip atau isi custom
    document.querySelectorAll('#f9 .chip').forEach(c => c.classList.remove('sel'));
    if (FS.moodLabel && FS.moodLabel !== 'Custom') {
      let chips = document.querySelectorAll('#f9 .chip');
      chips.forEach(c => { if (c.textContent.trim() === FS.moodLabel) c.classList.add('sel'); });
    } else if (FS.moodLabel === 'Custom') {
      let inp = document.getElementById('f9-custom');
      if (inp) inp.value = FS.mood;
    }
  }

  // Dilebur dari js/34 (pb-nochar): setelah step 3 dipulihkan, sinkronkan chip "Cara Tampil" (mode tanpa karakter).
  if (Number(cardNum) === 3) { try { pbHoldChipSync(); } catch (e) {} }
}

function fSummaryEdit(cardNum) {
  // Step Produk (f2) sudah dihapus dari alur: ganti nama produk lewat Foto Referensi (Step 1).
  if (cardNum === 2) cardNum = 1;
  let targetId = 'f' + cardNum;

  // Tutup dulu step aktif lain (yang masih kebuka/belum selesai) di tab
  // foto, sebelum step ini dibuka buat diedit dari Ringkasan/Lompat ke step.
  fPauseActiveStepForEdit(targetId);

  // Sembunyikan gen-area dan conflict container sementara
  let ga = document.getElementById('f-gen-area');
  if (ga) ga.classList.add('hidden');
  let cc = document.getElementById('ai-conflict-container');
  if (cc) cc.style.display = 'none';

  // FITUR BARU (permintaan user): begitu user mulai edit dari Ringkasan,
  // hasil prompt yang sudah pernah di-generate (kalau ada) langsung
  // disembunyikan SAAT ITU JUGA — bukan menunggu sampai "Selesai Edit"
  // ditekan — supaya user tidak salah kira hasil lama itu masih berlaku
  // untuk pilihan barunya. Placeholder preview (khusus desktop) dimunculkan
  // lagi menggantikan hasil yang disembunyikan.
  let _seJo = document.getElementById('f-json-output');
  if (_seJo) _seJo.style.display = 'none';
  let _seMo = document.getElementById('f-multi-output');
  if (_seMo) { _seMo.style.display = 'none'; _seMo.innerHTML = ''; }
  let _sePh = document.getElementById('f-preview-placeholder');
  if (_sePh) _sePh.style.removeProperty('display');

  // Undone HANYA card target — card lain tetap done
  let target = document.getElementById(targetId);
  if (target) {
    // FIX RINGKASAN HILANG SAAT EDIT PRODUK: card f2 (Produk) beda dari
    // card lain — dia TIDAK PERNAH ditandai 'done' waktu proses import
    // (lihat fImportPrompt: FS.produkMode di-set langsung tanpa lewat
    // doneCard('f2',...)), jadi class 'pending' bawaan HTML-nya tetap
    // nempel selamanya. Masalahnya, CSS ".wcard.pending .wbody{display:none}"
    // dan ".wcard.pending .whead{opacity:.3;pointer-events:none}" bikin ISI
    // card tetap tersembunyi & headernya tidak bisa diklik walau class
    // 'done'/'hidden' sudah dihapus dan style inline sudah dicabut di bawah.
    // Akibatnya layar jadi kelihatan kosong/blank persis saat Ringkasan
    // baru saja disembunyikan — makanya kelihatan seperti Ringkasan
    // "hilang" tanpa gantinya. Hapus juga 'pending' di sini supaya isi
    // card Produk beneran muncul & bisa diklik. Aman untuk card lain (1,3,
    // 4,5,7,8,9) karena mereka sudah tidak punya class 'pending' lagi
    // begitu pernah ditandai 'done'.
    target.classList.remove('done', 'hidden', 'pending');
    // FIX EDIT PRODUK DARI RINGKASAN: card f2 (Produk) sengaja dikunci
    // display:none!important secara inline supaya tidak nongol di alur
    // wizard normal (nilainya auto-detect). Tapi itu bikin classList.remove
    // di atas nggak ngefek sama sekali saat dibuka lewat "✏ Edit" dari
    // Ringkasan — layar jadi keliatan diam/nggak berubah. Buka paksa di
    // sini, nanti dikunci lagi pas user klik "Selesai Edit".
    if (cardNum === 2) target.style.removeProperty('display');
  }

  // ── Restore state visual per card ────────────────────────────────
  fRestoreStepUI(cardNum);

  // FIX EDIT PRODUK DARI RINGKASAN — PERSINGKAT TAMPILAN: kalau produk
  // sebelumnya sudah dipilih modenya (dipakai/pegang) dan sudah ada nama,
  // user cuma mau ganti NAMA produknya doang — tidak perlu dipaksa lihat
  // ulang judul "2 Produk yang Dipromosikan" + pertanyaan + 3 pilihan kartu.
  // Jadi khusus kondisi ini, sembunyikan whead + section pilihan, sisakan
  // cuma kotak nama produk. Untuk mode 'tidak'/kosong (belum pernah pilih),
  // tampilkan lagi seperti biasa karena user memang perlu memilih dulu.
  if (cardNum === 2) {
    let whead = document.getElementById('f2-whead');
    let choiceSection = document.getElementById('f2-choice-section');
    let simplify = (FS.produkMode === 'dipakai' || FS.produkMode === 'pegang');
    if (whead) whead.style.display = simplify ? 'none' : '';
    if (choiceSection) choiceSection.style.display = simplify ? 'none' : '';
  }

  // Scroll ke card setelah restore state
  setTimeout(() => {
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);

  // FIX RINGKASAN HILANG: tombol "Selesai Edit" ini dulu cuma dipasang untuk
  // cardNum===1 (Foto Referensi), padahal Ringkasan (#f-gen-area) di-hide
  // untuk step MANAPUN yang diedit lewat sini. Akibatnya, edit di step lain
  // (mis. "Produk") kalau kebetulan tidak ada chip yang cocok dengan value
  // yang sedang aktif (mis. produkMode='foto', hasil auto-detect dari foto
  // produk — bukan dari klik chip manual) bikin user macet: tidak ada jalan
  // balik ke Ringkasan selain memaksa pilih chip lain, yang malah menimpa
  // pilihan yang sudah benar. Sekarang tombol ini selalu dipasang di SEMUA
  // step yang diedit dari Ringkasan, jadi selalu ada jalan keluar eksplisit
  // apa pun yang user lakukan (atau tidak lakukan) di dalam card tersebut.
  if (!document.getElementById('summary-edit-done-btn')) {
    let doneBtn = document.createElement('button');
    doneBtn.id = 'summary-edit-done-btn';
    doneBtn.className = 'btn';
    doneBtn.style.cssText = 'margin-top:12px;font-size:var(--fs-base);padding:11px;width:100%;';
    doneBtn.innerHTML = '<svg class="icon"><use href="#ic-check"></use></svg> Selesai Edit — Kembali ke Generate';
    doneBtn.onclick = function() {
      doneBtn.remove();
      let cardEl = document.getElementById(targetId);
      if (cardEl) {
        cardEl.classList.add('done');
        if (FS.importActive) cardEl.classList.add('hidden');
        // FIX EDIT PRODUK DARI RINGKASAN: kunci lagi f2 ke display:none!important
        // seperti kondisi awalnya, supaya tidak nongol di alur wizard normal.
        if (cardNum === 2) cardEl.style.setProperty('display', 'none', 'important');
      }
      if (cardNum === 1 && FS.refs && FS.refs.length > 0) {
        let types = [...new Set(fSortRefsForOrder(FS.refs).map(r => FTYPE[r.type] ? FTYPE[r.type].label : r.type))];
        let fa1 = document.getElementById('fa1');
        if (fa1) fa1.textContent = FS.refs.length + ' foto (' + types.join(', ') + ')';
      }
      let genArea = document.getElementById('f-gen-area');
      if (genArea) { genArea.classList.remove('hidden');  fRunAIConflictCheck(true); }
      // Step lain yang tadi ketutup sementara (kalau ada) dimunculkan lagi
      fResumePausedStep('foto');
      setTimeout(() => genArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150);
    };
    if (target) target.appendChild(doneBtn);
  }

  // FIX BUG "2 TOMBOL LANGSUNG MUNCUL BEGITU KLIK EDIT": sebelumnya
  // sinkronisasi tombol "Selesai Edit" ini CUMA dipanggil untuk cardNum===1
  // (Foto Referensi), tepat di dalam blok pembuatan tombol di atas. Step
  // lain yang punya tombol konfirmasi bawaan sendiri (mis. tombol
  // "Konfirmasi →" di kolom "isi sendiri" pada f3/f4/f5/f7/f8/f9 — tombol
  // itu SELALU kelihatan sejak awal, tidak disembunyikan kecuali user
  // pernah pilih chip) TIDAK PERNAH disinkronkan sama sekali. Akibatnya,
  // begitu user klik "Edit" pada step yang jawabannya diisi manual (bukan
  // pilih chip), tombol "Konfirmasi →" bawaan step itu dan tombol "Selesai
  // Edit — Kembali ke Generate" ini langsung tampil BERSAMAAN tanpa perlu
  // interaksi apa pun. Sekarang panggilan ini dipindah ke LUAR blok
  // pembuatan tombol (jadi tetap jalan juga kalau tombolnya sudah ada dari
  // sebelumnya) dan berlaku untuk SEMUA step, bukan cuma step 1 — F1 & F2
  // pakai deteksi khusus mereka sendiri (tombol bawaannya bukan pola
  // mt12-confirm standar), step lainnya pakai auto-detect generik.
  if (cardNum === 1 && typeof fSyncF1EditDoneBtn === 'function') {
    fSyncF1EditDoneBtn();
  } else if (cardNum === 2) {
    let boxVisible = (FS.produkMode === 'pegang' || FS.produkMode === 'dipakai');
    fSyncCardEditDoneBtn('f2', boxVisible);
  } else {
    fSyncCardEditDoneBtn(targetId);
  }
}
// ── END SUMMARY CARD JS ────────────────────────────────────────────

// ── AUTO-LOAD API KEY saat page pertama dibuka ─────────────────
// Sebelumnya key hanya di-load saat user klik tombol di Tab Video.
// Fix: load otomatis saat DOMContentLoaded agar fitur generate JSON
// prompt via AI bisa langsung pakai key.
document.addEventListener('DOMContentLoaded', function(){
  if(typeof vaiShowSavedKey === 'function') vaiShowSavedKey(true);
});

window.addEventListener('beforeunload', function(e){
  // FIX REFRESH: reload yang SUDAH dikonfirmasi user (pull-to-refresh / logout)
  // menandai _pbSkipUnloadWarn — jangan tanya lagi lewat dialog bawaan browser.
  if(window._pbSkipUnloadWarn) return;
  // Guard: cegah close tab saat generate sedang berjalan
  if((VAI&&VAI._isGenerating)){
    e.preventDefault();
    e.returnValue='Generate prompt sedang berjalan — yakin mau keluar?';
  }
});
