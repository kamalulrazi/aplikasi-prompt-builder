// fitur/foto-susun-prompt.js — Prompt Foto AI — menyusun hasil prompt (JSON), impor prompt lama, penyesuaian kualitas output.
// Bagian dari js/10-main-app.js lama (baris 3879–5060). Isi tidak diubah.
// ============================================================
// IMPORT PROMPT LAMA — bangun JSON pakai blok yang diimpor (referensi
// foto, produk, subjek) tetap apa adanya, tapi scene (lokasi/cahaya/
// angle/pose/mood/framing) tetap ambil dari FS terkini — jadi kalau
// user reopen salah satu step itu buat diubah, hasilnya ikut berubah.
// ============================================================
// ============================================================
// Fungsi bersama: hitung teks "placement" (cara produk ditampilkan/
// dipegang) berdasarkan pilihan FS.holdKey / FS.hold TERKINI. Dipakai
// oleh _fBuildPromptJSON (mode normal) DAN _fBuildImportedPromptJSON
// (mode import) — supaya kalau user reopen step "Cara Tampil Produk"
// dan ganti pilihan, perubahannya konsisten kepakai di kedua mode,
// bukan cuma di salah satu.
// ============================================================
// Menyesuaikan teks output_quality dengan cahaya/mood/mode produk-saja (dipakai jalur normal
// DAN jalur impor, supaya keduanya tidak bisa saling melenceng).
// Kalimat pembuka "shot in a candid and natural style" hanya dipakai kalau mood kosong atau
// mengandung "candid". Untuk mood lain (Dark Moody, Luxury Premium, dll) frasa itu dibuang
// supaya tidak bentrok dengan mood yang dipilih.
function _fIntroStyle(effMood){
  let m=String(effMood||'').toLowerCase().trim();
  return (!m || /candid/.test(m)) ? ', shot in a candid and natural style' : '';
}
function _fAdaptQuality(quality, effCahaya, effMood, isProdukSaja){
  let _c=String(effCahaya||'').toLowerCase(), _m=String(effMood||'').toLowerCase();
  let _phone=/phone camera|candid/.test(_m);
  let _ctrl=/studio|softbox|e-commerce|dark moody|low key|dramatic|directional/.test(_c)||/clean, bright|luxury premium|editorial fashion|dark moody|soft pastel|high-key/.test(_m);
  if(_ctrl){
    quality.lighting='Follow the selected lighting setup exactly and keep it controlled and consistent across the frame; do not add random uneven light or phone-style exposure flaws that contradict it.';
    if(!_phone) quality.camera='High-quality, sharp, well-exposed photo with accurate colors and clean detail, matching the selected lighting and mood; realistic and natural-looking, not over-processed or artificially smoothed.';
  } else if(/natural candid/.test(_m)){
    // Mood Natural Candid: output_quality dibuat natural & lembut seperti foto HP biasa.
    // Teks lighting TIDAK memaksa "lembut/teduh" supaya tetap cocok dengan cahaya apa pun
    // yang dipilih (Siang Cerah, Hujan, Jendela, dst) dan tidak bentrok dengan scene.lighting.
    let _s=isProdukSaja?'product':"subject's face";
    quality.lighting='Light looks natural and realistic for the selected lighting, as in an ordinary phone photo: the '+_s+' stays clearly and evenly lit without harsh contrast or blown-out highlights, and shadows fall gently rather than as deep dark patches. Avoid studio-controlled lighting and artificial glow. Overall light should feel calm, organic, and real.';
    quality.camera='Shot on a modern smartphone camera with a natural handheld feel. Sharp enough on the main subject with a deep depth of field, so the background stays mostly in focus (no strong bokeh). Fine, subtle phone-camera grain in darker areas, with mild automatic smoothing typical of phone processing. Colors are natural and clean, not heavily filtered or over-saturated. Realistic dynamic range, highlights not blown out. Framing is casual and slightly imperfect, like an authentic social media photo. Not DSLR, not studio, not over-polished.';
  } else if(isProdukSaja){
    quality.lighting=quality.lighting.replace('on one side of the face and slightly brighter highlights on the other','on one side of the product and slightly brighter highlights on the other');
  }
  return quality;
}
// MODE PRODUK + LOKASI · TANGAN POV (permintaan user): di mode tanpa karakter (Foto Referensi cuma Produk + Lokasi),
// opsi Cara Tampil "Dipegang tangan (POV)" = ada satu tangan memegang produk dari sudut pandang orang pertama.
function _fIsPovHandNoChar(){
  try{return !!(FS && !FS.importActive && FS.holdKey==='tangan' && typeof fIsNoChar==='function' && fIsNoChar());}catch(e){return false;}
}

/* ════════════════════════════════════════════════════════════════════════
   v15.8 (Nov 2026) — ATURAN WAJAH & SUDUT KAMERA (permintaan user)
   1) WAJAH: wajah/identitas karakter HANYA boleh dari foto Karakter Sheet (tipe "wajah").
      Wajah orang di foto Outfit / Lokasi / Produk / Pose / dll WAJIB diabaikan. Aturan ini
      disuntik OTOMATIS saat prompt dibuat (key face_rule per foto + identity_rule di level atas
      + kalimat di prompt), jadi tetap berlaku walau user mengedit / menghapus teks Ambil-Abaikan.
   2) SUDUT KAMERA: foto Lokasi hanya dipakai untuk tempat & cahayanya — sudut kamera foto lokasi
      diabaikan. Kalau ada foto Pose, sudut kamera WAJIB mengikuti foto pose itu (step Sudut
      Kamera disembunyikan lewat foto-pov-tangan-lewati-sudut-kamera.js).
   ════════════════════════════════════════════════════════════════════════ */
var _F_POSE_ANGLE_LBL = 'Ikut foto pose (otomatis)';
var _F_POSE_DETAIL = 'Use this photo ONLY as a guide for the body pose AND the camera angle of the character from the character reference photo. Copy the pose (head tilt, gaze direction, hand and finger positions, arm and leg positions, posture, body lean, facing direction) AND the camera angle of this photo (camera height, shooting direction, tilt, distance, lens perspective, and framing). Do NOT carry over the face, hair, skin tone, body shape, clothing, accessories, background, lighting, or any objects from this photo \u2014 the face must come ONLY from the character reference photo.';
var _F_LOK_DETAIL_ANGLE = 'Use this photo ONLY for the place itself and its lighting. IGNORE its camera angle, camera height, viewpoint, lens perspective, and framing completely \u2014 the camera angle is defined separately in the scene settings.';
var _F_LOK_DESC_SUFFIX = ' (the place only \u2014 ignore the camera angle, viewpoint, and framing of that photo, and ignore any person in it)';
function _fRefNoOf(list, type){
  try{ for(var i=0;i<list.length;i++){ if(list[i] && list[i].type===type) return i+1; } }catch(e){}
  return 0;
}
function _fPoseAngleDesc(n){
  return 'follow the exact camera angle of pose reference photo ' + n + ' \u2014 same camera height, shooting direction (front, side, or three-quarter), tilt (high, low, or eye level), distance, lens perspective, and framing of the character as in that photo; do not choose a different camera angle';
}
/* v18.41 (Nov 2026, permintaan user) — MODE FACELESS (Foto Referensi cuma Outfit / Outfit + Lokasi).
   Kepala keluar dari tepi atas frame (bukan dihapus/diblur): orang berdiri dekat kamera, tepi atas gambar memotong leher,
   badan full-length sampai sepatu. Sudut kamera dikunci otomatis (lihat foto-pov-tangan-lewati-sudut-kamera.js). */
var _F_FACELESS_ANGLE_LBL = 'Faceless \u00b7 Full-length (otomatis)';
var _F_FACELESS_ANGLE_DESC = 'faceless full-length outfit-check framing: the person stands CLOSE to the camera and fills about 90% of the frame height; the very top edge of the image cuts straight through the middle of the neck, so the shoulders and neck run off the top edge and there is NO empty wall or empty space above the shoulders; the head is outside the frame, exactly like a phone held at chest height with the person standing close; the shoes are fully visible with only a small strip of floor (about 5% of the frame height) below them; camera handheld at chest-to-waist height, about 1.5 meters from the subject, pointing straight ahead with a very slight upward tilt, smartphone main lens about 24mm equivalent, torso slightly larger and legs slightly foreshortened; casual TikTok outfit check, not a mirror selfie, no phone visible';
function _fFacelessRuleText(){
  var t = 'FACELESS BY FRAME EDGE: no head, face, eyes, nose, lips, chin, or hair anywhere in the image, because the top edge of the frame cuts through the neck. Do NOT erase, blur, cover, or hide the head, and do NOT leave blank space where the head would be. No floating collar, no empty neckline, no mannequin or headless-body effect. No part of the pose may bring the head into the frame.';
  try{ if(FS && FS.subjek==='hijab') t += ' If the outfit reference includes a hijab, keep it exactly as in the reference (same color, wrapping style, and fabric); only the part from the neck down is visible, cut off by the top edge of the image.'; }catch(e){}
  t += ' Avoid: visible lips, nose, chin, or skin of the face, empty wall above the shoulders, small distant subject, wide shot, mirror selfie, phone in frame, cropped shoes, cut-off feet, close-up, medium shot cropped at the thigh.';
  return t;
}
/* v18.42 (Nov 2026, permintaan user) — FACELESS HARUS SEPERTI "OUTFIT CHECK" TIKTOK (leher terpotong tepi atas, orang dekat kamera, full-length ke sepatu).
   Masalah sebelumnya: komposisi cuma terselip di satu kalimat camera_angle, sehingga AI meniru framing FOTO OUTFIT (orang jauh, ada tembok kosong di atas bahu).
   Sekarang (khusus mode faceless): (1) kalimat pembuka prompt = komposisi, (2) blok `composition` + `important` tersendiri di JSON,
   (3) foto Outfit & Lokasi diberi perintah "abaikan framing/jarak/komposisi", (4) `negative_prompt` faceless, (5) teks kualitas kamera tidak lagi bilang "framing tidak rapi/wide". */
var _F_FACELESS_INTRO = 'A photorealistic faceless \"outfit check\" fashion photo for TikTok, shot as a casual handheld phone photo, full-length from neck to shoes.';
var _F_FACELESS_IMPORTANT = 'Do NOT copy the framing, distance, or composition of any reference photo. The reference photos are used only for the outfit and the location. The final composition is always the one described in the composition section.';
var _F_FACELESS_REF_FRAMING = ' Also IGNORE this photo\u2019s framing, distance, camera height, and composition completely \u2014 the final framing is defined only in the composition section (person very close to the camera, top edge of the image cutting through the neck).';
var _F_FACELESS_NEGATIVE = 'face, eyes, nose, lips, chin, head, facial features, empty wall above the shoulders, blank space above the neck, small distant subject, wide shot, full-body shot with the head visible, catalog pose, floating collar, empty neckline, headless mannequin, erased head, blurred or censored face, mirror selfie, phone in frame, different shoes from the outfit reference, cropped shoes, cut-off feet, close-up, medium shot, cartoon, illustration, 3D render, plastic skin, extra fingers, deformed hands, distorted body, wrong outfit color, changed outfit design, different location from the location reference, text, watermark, logo, low quality, oversharpened, harsh flash, studio backdrop';
function _fFacelessComposition(){
  var hij = false; try{ hij = !!(FS && FS.subjek==='hijab'); }catch(e){}
  return {
    frame: 'vertical 9:16 full-length photo. The person stands CLOSE to the camera and fills about 90% of the frame height.',
    top_edge: 'The very top edge of the image cuts straight through the middle of the neck' + (hij ? ' or the hijab at the shoulders' : '') + '. The shoulders and neck touch or run off the top edge of the image. There is NO empty wall or empty space above the shoulders. The head is never in the picture because the frame itself ends there, exactly like a phone held at chest height with the person standing close.',
    bottom_edge: 'The shoes are fully visible, with only a small strip of floor (about 5% of the frame height) below them.',
    camera_position: 'handheld at chest-to-waist height, about 1.5 meters from the subject, straight ahead with a very slight upward tilt, smartphone main lens about 24mm equivalent, torso slightly larger and legs slightly foreshortened',
    style: 'casual TikTok \"outfit check\", not a mirror selfie, no phone visible'
  };
}
function _fFacelessCompositionText(){
  var c=_fFacelessComposition();
  return 'Composition: ' + c.frame + ' ' + c.top_edge + ' ' + c.bottom_edge + ' Camera: ' + c.camera_position + '; ' + c.style + '.';
}
function _fIdentityRuleText(charNo){
  return 'FACE & IDENTITY LOCK: The face, facial features, skin tone, and hair of the person in the final image come ONLY from reference photo ' + charNo + ' (character sheet). Any human face visible in any other reference photo (outfit, location, product, pose, accessories) must be completely ignored \u2014 never copy, blend, average, or let it influence the character\u2019s face in any way. If there is any conflict, photo ' + charNo + ' always wins for the face.';
}
function _fIdentityIntro(charNo){
  return 'The character\u2019s face comes ONLY from reference photo ' + charNo + '; ignore every face in all other reference photos. ';
}
// Tambah face_rule (foto non-wajah) / identity_priority (foto wajah) ke satu entri reference_photos.
function _fApplyFaceRule(obj, r, list){
  try{
    var charNo = _fRefNoOf(list, 'wajah');
    if(r.type === 'wajah'){
      if(list.length > 1) obj.identity_priority = 'This photo is the ONLY source of the character\u2019s face and identity (facial features, skin tone, hair). No other reference photo may influence the face. Any face that appears in other reference photos must NOT appear in the result.';
      return;
    }
    obj.face_rule = charNo
      ? 'This photo may contain a real person. Completely ignore that person\u2019s face, hair, skin tone, and identity \u2014 never copy or blend them into the result. The face in the final image comes ONLY from reference photo ' + charNo + ' (character sheet).'
      : 'This photo may contain a real person. Completely ignore that person\u2019s face, hair, skin tone, and identity \u2014 never copy them into the result.';
  }catch(e){}
}

function _fComputePlacement(ov){
  ov = ov || {};
  let placement = '';
  if(ov.placementOverride){
    placement = ov.placementOverride;
  } else if(ov.forceProdukSaja){
    placement = 'displayed clearly and prominently as the sole focus of the frame, no hands or person present, centered composition showing full product detail';
  } else if(typeof fIsNoChar==='function' && fIsNoChar() && FS.holdKey==='custom' && FS.hold){
    // Produk + Lokasi saja (tanpa karakter): teks Cara Tampil dari user dipakai apa adanya
    placement = FS.hold + (/tangan|hand|pegang|hold|dipakai|worn/i.test(FS.hold) ? '' : ', no hands or person present');
  } else if(_fIsPovHandNoChar()){
    placement = 'held in one hand only \u2014 a single hand visible holding the product from a first-person POV, as if the viewer is holding it themselves; no face, no second hand and no rest of the body in the frame, product sharp, fully visible and facing the camera';
  } else if(FS.holdKey === 'dipakai'){
    placement = 'dipakai langsung oleh karakter';
  } else if(FS.holdKey === 'hanger'){
    placement = 'sudah terpasang pada hanger';
  } else if(FS.holdKey === 'tangan'){
    // FIX BUG: kalau pose yang dipilih adalah selfie (satu tangan pegang HP,
    // satu tangan pegang produk), placement default "both hands" di atas jadi
    // kontradiksi dengan instruksi pose. Deteksi via poseLabel dan pakai
    // placement khusus 1 tangan untuk kasus ini.
    // FIX: teks pose selfie sudah disederhanakan jadi "close-up selfie
    // angle, phone out of frame" (permintaan user). Deteksi cek DUA kata
    // kunci sekaligus — teks baru ('phone out of frame') DAN teks lama
    // ('POV selfie') — supaya prompt LAMA yang diimpor (masih berisi teks
    // panjang lama) tetap terdeteksi benar sebagai pose selfie, tidak
    // cuma prompt baru. Kalau cuma cek satu kata kunci baru saja, prompt
    // lama impor+pegang-tangan akan balik ke placement "dua tangan" —
    // kontradiksi dgn pose-nya sendiri yang bilang "tangan lain pegang HP".
    let _poseTextChk = (ov.poseOverride || FS.poseDesc || FS.pose || '');
    let _isSelfiePose = _poseTextChk.indexOf('ponsel tidak terlihat') !== -1 || _poseTextChk.indexOf('phone out of frame') !== -1 || _poseTextChk.indexOf('POV selfie') !== -1;
    placement = _isSelfiePose
      ? 'held in one hand and directed toward the camera lens — the other hand is holding the phone for the selfie shot, product still faces the lens clearly, sharp and fully visible'
      : 'memperlihatkan produk ke kamera';
  } else if(FS.produkMode === 'dipakai'){
    placement = 'worn as part of the outfit by the character';
  } else if(FS.hold){
    placement = 'held or displayed by the character — ' + FS.hold;
  } else if(FS.produkMode === 'pegang'){
    placement = 'held or presented by the character toward the camera';
  }
  return placement;
}

function _fBuildImportedPromptJSON(ov){
  // FIX BUG MULTI-SHOT DIABAIKAN: sebelumnya fungsi ini cuma baca
  // ov.poseOverride dan ov.kameraNote, TIDAK PERNAH baca ov.lokasiOverride /
  // ov.cahayaOverride / ov.angleOverride / ov.moodOverride — padahal fitur
  // "override khusus variasi ini" di panel multi-shot (Lokasi/Cahaya/Angle/
  // Mood per shot) sudah dikirim lewat field-field itu (lihat F_SHOT_TYPES
  // di bawah). Akibatnya kalau prompt hasil IMPOR dipakai multi-shot dan user
  // setel override lokasi/cahaya/angle/mood khusus untuk salah satu variasi,
  // override itu senyap diabaikan dan semua variasi tetap pakai lokasi/
  // cahaya/angle/mood utama yang sama. Sekarang disamakan dengan jalur
  // normal (_fBuildPromptJSON) yang sudah benar baca override ini.
  let effPose = ov.poseOverride || FS.poseDesc || FS.pose;
  let effKamera = ov.kameraNote || FS.kamera;
  let effLokasi = ov.lokasiOverride || FS.lokasiDesc || FS.lokasi;
  let effCahaya = ov.cahayaOverride || FS.cahayaDesc || FS.cahaya;
  let effAngle = ov.angleOverride || FS.angleDesc || FS.angle;
  let effMood = ov.moodOverride || FS.mood;
  // FIX BUG KONTRADIKSI DETAIL PRODUK: sebelumnya isProdukSaja di jalur
  // import HANYA baca FS.importIsProdukSaja (produk-saja-nya prompt ASLI
  // yang diimpor), tidak pernah baca ov.forceProdukSaja (dipaksa true oleh
  // shot multi-shot "Detail Produk / Detail Produk tanpa karakter"). Kalau
  // prompt yang diimpor PUNYA orang (bukan produk-saja) lalu user centang
  // variasi multi-shot "Detail Produk", placement sudah benar bilang "no
  // person" (lewat placementOv di bawah), TAPI intro/subject/"Character
  // pose" di sini tetap nulis subjek manusia — jadi satu JSON hasil generate
  // isinya kontradiksi sendiri (bilang ada orang & bilang tidak ada orang
  // sekaligus). Disamakan dengan pola jalur normal (_fBuildPromptJSON, baris
  // "ov.forceProdukSaja || FS.subjek==='produk'") supaya konsisten.
  let _impNoCharOnly = !ov.forceProdukSaja && !FS.importIsProdukSaja && (typeof fIsNoChar==='function') && fIsNoChar();
  let isProdukSaja = !!ov.forceProdukSaja || !!FS.importIsProdukSaja || _impNoCharOnly;
  // v15.8: sudut kamera ikut foto pose; wajah hanya dari karakter sheet
  let _impReal = FS.refs ? fSortRefsForOrder(FS.refs.filter(function(r){return r.type!=='outfit_random';})) : [];
  let _poseNoA = !isProdukSaja ? _fRefNoOf(_impReal,'pose') : 0;
  if(_poseNoA) effAngle = _fPoseAngleDesc(_poseNoA);
  else if(FS.angleLabel===_F_POSE_ANGLE_LBL && !ov.angleOverride) effAngle = 'natural eye-level camera angle';
  let _charNoA = _fRefNoOf(_impReal,'wajah');
  let _idIntro = (_charNoA && !isProdukSaja && _impReal.length>1) ? _fIdentityIntro(_charNoA) : '';
  let _impIdRule = (_charNoA && !isProdukSaja && _impReal.length>1) ? _fIdentityRuleText(_charNoA) : '';

  // FIX BUG KONTRADIKSI TANGAN: sebelumnya mode produk-saja di jalur import
  // SELALU menganggap "tidak ada tangan/orang" (intro hardcode "no person or
  // human visible", placement dipaksa "no hands or person present") — padahal
  // ada pilihan angle khusus produk-saja "Dipegang Tangan" (scene screen
  // menyebutkan "hand entering the frame") yang tetap bisa dipilih user untuk
  // prompt hasil impor. Kalau dipilih, hasil JSON jadi kontradiksi sendiri:
  // camera_angle bilang ada tangan, tapi prompt/placement bilang tidak ada
  // orang sama sekali. Disamakan dengan jalur normal (_fBuildPromptJSON,
  // variabel angleHasHand) supaya konsisten.
  let _impPovHand = isProdukSaja && !ov.placementOverride && !ov.forceProdukSaja && FS.holdKey==='custom' && /first-person POV, as if the viewer is holding it themselves/.test(String(FS.hold||''));
  let angleHasHand = (isProdukSaja && !ov.placementOverride && /\bhand\b/i.test(effAngle)) || _impPovHand;

  // FIX BUG: sebelumnya placement produk di mode import selalu pakai teks
  // beku dari JSON yang diimpor (FS.importProductBlock.placement), jadi
  // kalau user reopen step "Cara Tampil Produk" dan ganti pilihan, itu
  // TIDAK PERNAH kepakai di hasil akhir. Sekarang: placement dihitung ulang
  // dari FS.hold/FS.holdKey terkini via _fComputePlacement (fungsi yang sama
  // dipakai mode normal), sementara name & instruction asli dari produk yang
  // diimpor tetap dipertahankan apa adanya.
  // FIX BUG PRODUK-SAJA: generate satu-shot biasa manggil _fBuildPromptJSON()
  // TANPA argumen (ov={}), jadi ov.forceProdukSaja tidak pernah ke-set dari
  // pemanggilnya. Kalau tidak dipaksa di sini, _fComputePlacement() gak akan
  // tahu ini prompt produk-saja dan malah jatuh ke pengecekan FS.holdKey/
  // FS.hold biasa (yang bisa saja masih berisi nilai basi). Paksa
  // forceProdukSaja:true di sini kalau memang produk-saja, tanpa menimpa ov
  // asli (supaya alur multi-shot yang sudah eksplisit set placementOverride
  // sendiri tetap jalan seperti biasa — placementOverride selalu dicek lebih
  // dulu di _fComputePlacement).
  // FIX BUG KONTRADIKSI TANGAN (lanjutan): kalau angleHasHand true, JANGAN
  // paksa forceProdukSaja ke _fComputePlacement — kalau dipaksa, cabang
  // "no hands or person present" di _fComputePlacement selalu menang duluan
  // dan hasilnya tidak akan pernah bisa jadi teks "ada tangan" di bawah.
  let placementOv = (isProdukSaja && !angleHasHand && !_impNoCharOnly) ? Object.assign({}, ov, {forceProdukSaja:true}) : ov;
  // FIX BUG NAMA PRODUK TIDAK KE-UPDATE: sebelumnya "name" di sini selalu
  // pakai FS.importProductBlock.name (beku dari JSON awal), padahal user BISA
  // mengedit nama produk lewat tombol "ubah" di Ringkasan (lihat
  // fKonfirmProdukManual, yang nulis ke FS.produkNama — dipakai juga di
  // aturan konflik/placement lain). Kalau user ganti nama produk setelah
  // impor, nama lama tetap yang muncul di JSON hasil generate. Sekarang
  // pakai FS.produkNama (live) dengan fallback ke nama beku kalau belum
  // pernah diedit sama sekali.
  let effPlacementImp = _fComputePlacement(placementOv);
  // v11.58: placement custom/tidak dikenal dari JSON impor dipakai apa adanya selama belum diedit.
  // Tanpa ini _fComputePlacement() menambah prefix "held or displayed by the character — " lagi.
  if(!isProdukSaja && !ov.placementOverride && FS.holdKey==='custom' && FS.hold && FS.importProductBlock && FS.hold===FS.importProductBlock.placement){
    effPlacementImp = FS.hold;
  }
  // FIX BUG KONTRADIKSI TANGAN (lanjutan): kalau angle jelas-jelas "Dipegang
  // Tangan" tapi placement masih kosong (holdKey/hold memang tidak diisi
  // untuk mode produk-saja), isi teks default yang konsisten dengan angle-nya
  // — sama seperti fallback di _fBuildPromptJSON (angleHasHand).
  if(!effPlacementImp && isProdukSaja && !angleHasHand){
    effPlacementImp = 'displayed clearly and prominently as the sole focus of the frame, no hands or person present, centered composition showing full product detail';
  }
  if(angleHasHand){
    // v11.58: produk-saja + angle "Dipegang Tangan" SELALU pakai teks tangan, bukan sisa FS.hold impor
    // (dulu jadi "held or displayed by the character — held by a hand…" yang kontradiktif).
    effPlacementImp = _impPovHand ? FS.hold : 'held by a hand entering the frame — only the hand is visible, product sharp, fully visible and prominently framed toward camera';
  }
  // FIX BUG TERSEMBUNYI (audit lanjutan skenario import — belum pernah
  // dites di Test Case manapun sebelumnya): effProductBlock di bawah tadinya
  // gate pada `FS.importProductBlock` truthy/falsy — snapshot BEKU yang cuma
  // diisi SEKALI saat fImportPrompt() jalan (line ~5992: `FS.importProductBlock
  // = parsed.product || null`) dan cuma di-NULL-kan oleh _fSyncImportProdukState()
  // saat SEMUA foto produk dihapus (line ~3541). Masalahnya: _fSyncImportProdukState()
  // TIDAK PERNAH mengisi FS.importProductBlock lagi di cabang "ada foto produk"
  // (line ~3559-3567) — cabang itu cuma set FS.produkMode='foto' & FS.produkNama,
  // tanpa pernah menyentuh FS.importProductBlock. Akibatnya: begitu foto produk
  // pernah dihapus SATU KALI (→ FS.importProductBlock jadi null permanen), lalu
  // user tambah foto produk BARU dari kosong — Ringkasan sudah benar tampil
  // "Dari foto produk · <nama>" (baca dari FS.produkMode/FS.produkNama, bukan
  // FS.importProductBlock), TAPI JSON hasil generate SAMA SEKALI TIDAK PERNAH
  // dapat key "product" atau kalimat "Hero product: ..." lagi selama-lamanya di
  // sesi itu — karena effProductBlock permanen null. User tidak akan tahu ini
  // terjadi karena Ringkasan terlihat benar (sama persis pola bug produk/outfit
  // yang sudah diperbaiki sebelumnya, cuma arahnya kebalik: dulu "nyangkut usai
  // dihapus", sekarang "hilang permanen usai ditambah lagi").
  // Fix: pakai kondisi LIVE yang sama seperti jalur normal (_fBuildPromptJSON,
  // variabel `hasProdukRef` + `FS.produkMode!=='tidak'`) — bukan snapshot beku.
  // FS.importProductBlock tetap dipakai sebagai fallback nama/instruksi ASLI
  // dari JSON yang diimpor (supaya instruksi custom dari prompt lama tidak
  // hilang selama belum pernah di-null-kan), dengan instruksi default yang
  // sama seperti jalur normal kalau memang sudah tidak ada snapshot lagi.
  let hasProdukRefImp = FS.refs ? FS.refs.some(function(r){return r.type==='produk';}) : false;
  let _impBlockNoPhoto = !!(FS.importProdukNoPhoto && FS.importProductBlock && FS.importProductBlock.name);
  let effProductBlock = (FS.produkMode !== 'tidak' && (hasProdukRefImp || _impBlockNoPhoto)) ? {
    name: FS.produkNama || (FS.importProductBlock && FS.importProductBlock.name) || '[product from reference photo]',
    placement: effPlacementImp,
    instruction: (FS.importProductBlock && FS.importProductBlock.instruction) || 'This product MUST be clearly visible, sharp, and prominently displayed. Preserve its exact shape, color, size, logo, and all visual details. Do NOT alter, resize, or obscure the product at any point.'
  } : null;

  // v18.41: prompt faceless yang diimpor ulang (camera_angle = framing faceless) tetap membawa aturan faceless-nya.
  let _impFaceless = !isProdukSaja && typeof effAngle==='string' && effAngle.indexOf('faceless full-length outfit-check framing')===0;
  let introProdukSajaTextImp = angleHasHand
    ? 'A photorealistic product image, clean and detailed, product held by a hand entering the frame — only the hand is visible, no face or rest of the body. '
    : 'A photorealistic product-only image, clean and detailed, no person or human visible. ';

  let _impRandomDescs = (!isProdukSaja && FS.refs) ? FS.refs.filter(function(r){return r.type==='outfit_random';}).map(function(r){return r.focus;}).filter(Boolean) : [];
  let outfitRandomIntroImp = _impRandomDescs.length ? 'Outfit (AI-generated, no reference photo): ' + _impRandomDescs.join(' | ') + '. ' : '';
  let intro = (isProdukSaja
      ? introProdukSajaTextImp
      : (effProductBlock ? 'A photorealistic product image' : 'A photorealistic lifestyle fashion image') + _fIntroStyle(effMood) + '. Subject: ' + (FS.importSubject || 'a person') + '. ')
    + outfitRandomIntroImp
    + (effProductBlock ? 'Hero product: ' + effProductBlock.name + (effProductBlock.placement ? ', ' + effProductBlock.placement + '. ' : '. ') + (effProductBlock.instruction || '') + ' ' : '')
    + _idIntro
    + 'Scene: ' + effLokasi + '. '
    + 'Lighting: ' + effCahaya + '. '
    + (isProdukSaja ? '' : (effPose ? 'Character pose: ' + effPose + '. ' : ''))
    + (effKamera ? 'Camera framing: ' + effKamera + '. ' : '')
    + 'Camera angle: ' + effAngle + '. '
    + (_impFaceless ? _fFacelessRuleText() + ' ' : '')
    + 'Mood & tone: ' + effMood + '.';

  // v11.58: output_quality asli dari JSON hanya dipakai kalau cahaya/mood/mode belum berubah sejak impor.
  // Kalau JSON tidak membawa output_quality, atau user mengedit cahaya/mood, disesuaikan seperti jalur normal.
  let effQualityImp;
  if(FS.importOutputQuality && (!FS.importSceneSig || FS.importSceneSig === (String(effCahaya||'')+'||'+String(effMood||'')+'||'+(isProdukSaja?'1':'0')))){
    // (tanpa tanda tangan = halaman tersimpan dari versi lama → pakai output_quality aslinya, seperti dulu)
    effQualityImp = FS.importOutputQuality;
  } else {
    effQualityImp = _fAdaptQuality({
      camera: 'Shot using a smartphone camera (not DSLR), with natural handheld feel. The image includes subtle digital noise and grain typical of a phone camera, especially in shadows and low-light areas. Slight imperfections such as minor motion blur, soft focus inconsistencies, and natural exposure shifts are present. The dynamic range is realistic (not overly HDR), with slightly clipped highlights and soft shadow details. The framing is slightly imperfect, not perfectly centered, with a subtle wide lens feel and natural perspective distortion. Overall look resembles an authentic phone photo, not a polished or studio-quality image.',
      lighting: 'Lighting is natural and imperfect, coming from a window or ambient indoor source rather than studio lights. The light falls unevenly across the subject, creating soft shadows on one side of the face and slightly brighter highlights on the other. There may be mild overexposure in small highlight areas and gentle shadow gradients across the scene. The lighting is not perfectly balanced, with slight warmth and natural color variation. Some areas of the scene may be dimmer or less illuminated, creating a cozy, lived-in atmosphere. Avoid flat lighting or perfectly even illumination. Overall lighting should feel organic, spontaneous, and human, not staged or studio-controlled.'
    }, effCahaya, effMood, isProdukSaja);
  }

  let fullJson = {
    prompt: intro,
    subject: FS.importSubject || (isProdukSaja ? 'product only, no person' : 'a person'),
    mood_and_tone: effMood,
    ...(function(){
      // FIX BUG: critical_rule sebelumnya cuma baca FS.importCriticalRule
      // (beku dari JSON impor awal). Kalau JSON yang diimpor tidak (atau
      // belum) punya critical_rule sendiri, reference_photos yang direkonstruksi
      // dari FS.refs (lihat fix reference_photos di bawah) tidak dapat instruksi
      // "baca tiap foto secara selektif" sama sekali — padahal jalur normal
      // SELALU menyertakan default ini kapanpun ada reference_photos.
      let hasRealRefsImp = (FS.refs && FS.refs.some(function(r){return r.type!=='outfit_random';})) || (FS.importRefPhotos||[]).some(function(p){return p && !_fREF_LABEL_TO_KEY[p.type];});
      if(FS.importCriticalRule && hasRealRefsImp) return {critical_rule: FS.importCriticalRule};
      return hasRealRefsImp ? {critical_rule: 'Read each reference photo SELECTIVELY. Extract ONLY the specified elements from each photo and ignore everything else. Every extract_only and ignore_completely directive is ABSOLUTE — do NOT blend elements across photos unless explicitly stated.'} : {};
    })(),
    ...(function(){
      // FIX BUG: conflict_priority sebelumnya cuma baca FS.importConflictRule
      // (beku dari JSON awal) — tidak pernah baca FS.conflictLevel yang
      // dihitung ULANG secara live tiap kali user reopen step "Cara Tampil
      // Produk" (fPickHold/fPickHoldCustom mendeteksi konflik nama produk vs
      // foto outfit). Akibatnya kalau konflik BARU terdeteksi setelah impor
      // (mis. user ganti nama produk jadi item yang overlap dengan foto
      // outfit), instruksi prioritas top-level ini tidak ikut muncul —
      // padahal instruksi ignore_completely per-foto outfit sudah ikut
      // ter-update (lihat fix reference_photos di bawah). Disamakan dengan
      // conflictRule di _fBuildPromptJSON.
      if(FS.conflictLevel === 1){
        return {conflict_priority: 'PRIORITY OVERRIDE: The product photo is the SINGLE authoritative source for ' + FS.produkNama + '. Any appearance of a similar item in other reference photos (especially the outfit photo) must be completely IGNORED and replaced by the product from the product reference photo. The product photo takes absolute priority over all other photos for this specific item.'};
      }
      return (FS.importConflictRule && FS.refs && FS.refs.some(function(r){return r.type==='produk';})) ? {conflict_priority: FS.importConflictRule} : {};
    })(),
    ...(_impIdRule ? {identity_rule: _impIdRule} : {}),
    ...(_impFaceless ? {faceless_rule: _fFacelessRuleText()} : {}),
    // FIX BUG KRITIS — REFERENCE_PHOTOS TIDAK PERNAH KE-UPDATE: sebelumnya
    // baris ini ({reference_photos: FS.importRefPhotos}) selalu pakai array
    // MENTAH hasil parse JSON saat pertama kali ditempel — TIDAK PERNAH
    // disinkronkan ulang ke FS.refs yang sudah diedit user (fokus/extract/
    // ignore/ukuran produk di Step 1). Akibatnya: SEMUA edit yang dilakukan
    // user di Step 1 pada foto referensi (wajah/outfit/produk/dll) setelah
    // impor SAMA SEKALI TIDAK NGEFEK ke hasil generate — user kira sudah
    // keedit, padahal yang dipakai tetap teks lama dari JSON impor.
    // Sekarang dibangun ulang dari FS.refs terkini, persis pola yang sama
    // dipakai jalur normal (_fBuildPromptJSON) dan yang sudah dipakai untuk
    // generated_outfit di bawah — photo_number di-renumber ulang.
    ...(function(){
      // FITUR BARU (permintaan user): jalur import (tempel JSON prompt lama)
      // WAJIB pakai urutan yang SAMA dengan jalur normal — 1) Wajah/Karakter,
      // 2) Outfit, 3) Produk/Objek — bukan urutan mentah FS.refs. Sebelumnya
      // fungsi ini TIDAK memanggil fSortRefsForOrder() sama sekali, jadi
      // hasil generate lewat "Import Prompt Lama" bisa punya urutan foto
      // berbeda dari yang tampil di Step 1 (F1/F2/F3) maupun dari jalur
      // generate normal (_fBuildPromptJSON) — padahal urutan ini menentukan
      // urutan upload foto ke Google Flow, jadi kalau salah, hasil fotonya
      // ikut salah juga.
      let realRefsImp = FS.refs ? fSortRefsForOrder(FS.refs.filter(function(r){return r.type!=='outfit_random';})) : [];
      let photoCounterImp = 0;
      let refPhotosImp = realRefsImp.map(function(r){
        let def = FTYPE[r.type];
        if(!def) return null;
        photoCounterImp++;
        let extractText = (r.extractCustom !== undefined ? r.extractCustom : def.extract).trim();
        let ignoreText = (r.ignoreCustom !== undefined ? r.ignoreCustom : def.ignore).trim();
        let obj = { photo_number: photoCounterImp, type: def.label };
        if(extractText) obj.extract_only = extractText + (r.ukuran && r.type==='produk' ? '. Product physical size: '+r.ukuran+' — render the product accurately to this size ratio relative to the scene.' : '');
        if(ignoreText) obj.ignore_completely = ignoreText;
        _fApplyFaceRule(obj, r, realRefsImp);
        if(r.type==='pose') obj.detail = _F_POSE_DETAIL + (r.focus ? ' Pose notes: ' + r.focus : '');
        else if(r.type==='lokasi') obj.detail = _F_LOK_DETAIL_ANGLE + (r.focus ? ' Location notes: ' + r.focus : '');
        else if(r.focus) obj.detail = r.focus;
        return obj;
      }).filter(Boolean);
      // Jaga-jaga: kalau JSON yang diimpor punya entri reference_photos dengan
      // "type" yang TIDAK dikenali aplikasi (jadi tidak pernah disinkronkan ke
      // FS.refs sejak awal impor), tetap sertakan apa adanya di sini supaya
      // datanya tidak hilang begitu saja dari hasil generate.
      let unknownOriginal = (FS.importRefPhotos || []).filter(function(p){
        return p && !_fREF_LABEL_TO_KEY[p.type];
      });
      unknownOriginal.forEach(function(p){
        photoCounterImp++;
        refPhotosImp.push(Object.assign({}, p, {photo_number: photoCounterImp}));
      });
      return refPhotosImp.length ? {reference_photos: refPhotosImp} : {};
    })(),
    // FIX IMPORT OUTFIT AI: bangun ulang generated_outfit dari FS.refs yang
    // sekarang (sumber kebenaran setelah user edit), bukan array statis hasil
    // parse awal — supaya perubahan teks di Step 1 ikut kepakai saat generate ulang.
    ...(function(){
      // FIX BUG KONTRADIKSI PRODUK-SAJA: sebelumnya generated_outfit tidak
      // pernah dicek terhadap isProdukSaja — padahal exclude filter shot
      // "Detail Produk (tanpa karakter)" (F_SHOT_TYPES.detail.excludeRefTypes)
      // TIDAK memasukkan 'outfit_random', jadi kalau prompt impor punya
      // generated_outfit atau ref outfit_random, shot yang seharusnya "no
      // person" tetap bisa membawa instruksi "generate outfit lengkap untuk
      // karakter" — kontradiksi diri sendiri. Disamakan dengan jalur normal
      // (_fBuildPromptJSON, syarat "!ov.forceProdukSaja").
      if(isProdukSaja) return {};
      // FIX BUG TC2 — GENERATED_OUTFIT NYANGKUT: sebelumnya kalau FS.refs
      // sudah tidak punya outfit_random lagi (user hapus foto AI Outfit),
      // kode ini fallback ke FS.importGeneratedOutfit — array MENTAH beku
      // dari JSON impor awal yang tidak pernah dibersihkan waktu ref-nya
      // dihapus. Akibatnya generated_outfit tetap muncul di hasil generate
      // dengan data outfit yang sudah dihapus user. FS.refs adalah sumber
      // kebenaran (sama seperti reference_photos di atas) — kalau kosong,
      // artinya memang tidak ada outfit AI lagi, jangan fallback ke apa pun.
      let outfitRefsGO = FS.refs ? FS.refs.filter(function(r){return r.type==='outfit_random';}) : [];
      let goList = outfitRefsGO.map(function(r,i){
        return {
          outfit_number: i+1,
          instruction: 'DO NOT look for a reference photo for this outfit. Instead, GENERATE the complete outfit entirely from this text description.',
          description: r.focus || '',
          generate: 'Create a complete, cohesive outfit — all garments, colors, textures, accessories, and styling details — based solely on the description above. Make it look naturally worn on the character, realistic, and consistent with the overall scene.'
        };
      });
      return goList.length ? {generated_outfit: goList} : {};
    })(),
    ...(effProductBlock ? {product: effProductBlock} : {}),
    scene: {
      location: effLokasi,
      ...(isProdukSaja || !effPose ? {} : {pose: effPose}),
      ...(effKamera ? {camera_framing: effKamera} : {}),
      camera_angle: effAngle,
      lighting: effCahaya,
      mood_and_tone: effMood
    },
    output_quality: effQualityImp
  };
  if(FS.importStyleReference) fullJson.style_reference = FS.importStyleReference;

  // FIX NOMOR FOTO LOKASI BASI PASCA-EDIT IMPOR: teks Lokasi/Cahaya dari JSON lama menyebut nomor foto ("reference photo 2").
  // Kalau user menghapus/menambah foto lain di Foto Referensi, nomor foto lokasi bergeser, tapi teks lama tetap menyebut nomor lama
  // -> JSON merujuk foto yang salah. Sekarang nomor itu dihitung ulang dari urutan foto yang aktif (hanya untuk teks lokasi & cahaya).
  try{
    let _ordL = FS.refs ? fSortRefsForOrder(FS.refs.filter(function(r){return r.type!=='outfit_random';})) : [], _nL = 0;
    for(let _i=0;_i<_ordL.length;_i++){ if(_ordL[_i].type==='lokasi'){ _nL=_i+1; break; } }
    if(_nL){
      let _fix = function(t){ return (typeof t==='string') ? t.replace(/reference photo \d+/g,'reference photo '+_nL) : t; };
      if(fullJson.scene){ fullJson.scene.location=_fix(fullJson.scene.location); fullJson.scene.lighting=_fix(fullJson.scene.lighting); }
      if(fullJson.output_quality && typeof fullJson.output_quality==='object') fullJson.output_quality.lighting=_fix(fullJson.output_quality.lighting);
      if(typeof fullJson.prompt==='string') fullJson.prompt=fullJson.prompt.replace(/((?:location shown in|taken entirely from|lighting of) reference photo )\d+/g,'$1'+_nL);
    }
  }catch(_e){}

  let subjekLabel = ov.label || 'Prompt Diimpor';
  // FIX BUG NOTICE URUTAN FOTO TIDAK SINKRON PASCA-EDIT IMPOR: sebelumnya
  // realRefs/randomRefs di sini SELALU dikembalikan kosong (hardcode []),
  // padahal reference_photos di fullJson di atas sudah benar dibangun ulang
  // dari FS.refs yang LIVE (bisa beda dari saat pertama impor, kalau user
  // tambah/hapus/edit foto di Step 1 setelah impor). Akibatnya fBuildUploadNotice()
  // selalu jatuh ke fallback-nya yang pakai FS.importRefPhotos — snapshot BEKU
  // dari JSON yang pertama kali ditempel — jadi notifikasi urutan upload bisa
  // menampilkan daftar lama yang sudah tidak sesuai dengan reference_photos
  // yang sebenarnya dikirim di JSON hasil generate. Sekarang dihitung dari
  // FS.refs yang sama seperti dipakai untuk membangun reference_photos di atas,
  // supaya notice selalu match dengan JSON aktual. Ini juga otomatis
  // memperbaiki notice multi-shot untuk prompt hasil impor: FS.refs sudah
  // difilter sesuai excludeRefTypes shot yang bersangkutan oleh pemanggil
  // (_fDoGenerateMultiShot) sebelum fungsi ini dipanggil.
  let realRefsImp = FS.refs ? fSortRefsForOrder(FS.refs.filter(function(r){return r.type!=='outfit_random';})) : [];
  let randomRefsImp = FS.refs ? FS.refs.filter(function(r){return r.type==='outfit_random';}) : [];
  return {fullJson, realRefs: realRefsImp, randomRefs: randomRefsImp, subjekLabel};
}

function fToggleImportArea(){
  let area = document.getElementById('f-import-area');
  if(area) area.classList.toggle('hidden');
}

// ── REVERSE-LOOKUP LABEL — dipakai saat import prompt lama ──────────────
// Prompt lama cuma berisi teks deskripsi panjang (val), bukan label pendek
// yang tampil di UI (mis. "Ruang Tamu Mewah"). Fungsi-fungsi ini mencari
// label pendek yang cocok dengan cara mencocokkan teks val ke chip yang
// sudah ada di halaman (untuk lokasi/cahaya/angle/mood) atau ke data
// pose/HOLD_MAP (untuk pose & cara tampil produk). Kalau tidak ketemu,
// caller akan fallback ke teks asli yang dipotong.
function _fReverseLookupChip(text, funcName){
  if(!text) return null;
  let t = String(text).trim();
  let els = document.querySelectorAll('[onclick^="'+funcName+'("]');
  let re = new RegExp(funcName+"\\('((?:[^'\\\\]|\\\\.)*)'\\s*,\\s*this\\s*,\\s*'((?:[^'\\\\]|\\\\.)*)'\\)");
  for(let i=0;i<els.length;i++){
    let oc = els[i].getAttribute('onclick')||'';
    let m = oc.match(re);
    if(m && m[1].trim()===t) return m[2];
  }
  return null;
}
function _fFindPoseLabel(text){
  if(!text) return null;
  let t = String(text).trim();
  for(let subj in POSES_NO_PRODUK){
    let arr = POSES_NO_PRODUK[subj];
    for(let i=0;i<arr.length;i++) if(arr[i][0].trim()===t) return arr[i][1];
  }
  for(let subj in POSES_WITH_PRODUK){
    let byHold = POSES_WITH_PRODUK[subj];
    for(let hk in byHold){
      let arr = byHold[hk];
      for(let i=0;i<arr.length;i++) if(arr[i][0].trim()===t) return arr[i][1];
    }
  }
  return null;
}
function _fFindHoldLabel(text){
  if(!text) return null;
  let t = String(text).trim();
  if(t.indexOf('worn directly on the character as an accessory or garment')===0) return 'Dipakai langsung';
  if(t.indexOf('dipakai langsung oleh karakter')===0) return 'Dipakai langsung';
  if(t.indexOf('memperlihatkan produk ke kamera')===0) return 'Dipegang — diarahkan ke kamera';
  if(t.indexOf('sudah terpasang pada hanger')===0) return 'Pakai hanger — ke kamera';
  if(t.indexOf('held in both hands directed straight toward the camera lens')===0) return 'Dipegang — diarahkan ke kamera';
  if(t.indexOf('held in one hand and directed toward the camera lens')===0) return 'Dipegang — diarahkan ke kamera';
  if(t.indexOf('displayed on a hanger presented by the character to the camera')===0) return 'Pakai hanger — ke kamera';
  return null;
}
const _fSUBJECT_TEXT_MAP = {
  'a woman': {subjek:'hijab', label:'Perempuan'},
  'a man': {subjek:'pria', label:'Laki-laki'},
  'a person': {subjek:'hijab', label:'Karakter (dari prompt lama)'}
};
function _fTrunc(text, n){
  if(!text) return '';
  let t = String(text).trim();
  return t.length>n ? t.substring(0,n)+'…' : t;
}

// Cari nilai teks di antara kunci "key": "..." di JSON mentah — dipakai
// sebagai fallback kalau JSON.parse gagal karena user paste teks yang
// sedikit rusak/terpotong.
function _fImportExtractField(rawText, key){
  let re = new RegExp('"' + key + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"');
  let m = rawText.match(re);
  if(!m) return '';
  try{ return JSON.parse('"' + m[1] + '"'); }catch(e){ return m[1]; }
}

// Peta label tipe foto (yang tersimpan di JSON hasil generate, field "type")
// balik ke key internal FTYPE — dipakai import buat mencocokkan reference_photos
// ke tipe chip yang benar (Wajah/Outfit/Produk/dst).
const _fREF_LABEL_TO_KEY={
  'Wajah Karakter':'wajah',
  'Outfit Lengkap':'outfit',
  'Baju Atasan':'atasan',
  'Baju Bawahan':'bawahan',
  'Aksesori':'aksesori',
  'Produk':'produk',
  'Hewan / Objek':'objek',
  'Lokasi':'lokasi',
  'Pose Referensi':'pose'
};

// Pembaca JSON longgar untuk impor prompt lama (v11.58): terima JSON biasa, JSON yang
// ter-escape dua kali (string), array [ {...} ] (ambil objek prompt pertama), dan teks
// yang kutip lurusnya berubah jadi kutip pintar (“ ”) karena lewat WhatsApp/Notes/Word.
function _fImportParseLoose(txt){
  function tryP(s){ try{ return JSON.parse(s); }catch(e){ return undefined; } }
  function pick(p, depth){
    if(depth>2) return null;
    if(typeof p==='string'){ let q=tryP(p.trim()); return q===undefined ? null : pick(q, depth+1); }
    if(Array.isArray(p)){
      for(let i=0;i<p.length;i++){ let x=pick(p[i], depth+1); if(x && (x.scene||x.product||x.prompt)) return x; }
      return null;
    }
    return (p && typeof p==='object') ? p : null;
  }
  function sanitize(s){
    return s.replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g,'"').replace(/[\u2018\u2019\u201A\u201B]/g,"'").replace(/[\u00A0\u200B\uFEFF]/g,' ');
  }
  // v14.11: koma berlebih sebelum } atau ] (sering muncul kalau JSON disalin dari chat/editor) dibuang.
  function noTrail(s){ return s.replace(/,\s*([}\]])/g,'$1'); }
  let cands=[txt];
  let s=txt.indexOf('{'), en=txt.lastIndexOf('}');
  if(s!==-1 && en>s) cands.push(txt.substring(s,en+1));
  let t2=sanitize(txt);
  if(t2!==txt){
    cands.push(t2);
    let s2=t2.indexOf('{'), e2=t2.lastIndexOf('}');
    if(s2!==-1 && e2>s2) cands.push(t2.substring(s2,e2+1));
  }
  let extra=[];
  cands.forEach(function(c){ let n=noTrail(c); if(n!==c) extra.push(n); });
  cands=cands.concat(extra);
  for(let i=0;i<cands.length;i++){
    let p=tryP(cands[i]);
    if(p===undefined) continue;
    let r=pick(p,0);
    if(r) return r;
  }
  // v14.11: JSON terpotong / rusak (mis. kurang kurung penutup karena salin tidak lengkap) —
  // dulu langsung ditolak. Sekarang ambil isian scene per-kunci pakai regex; foto referensi tidak ikut.
  let flat=t2;
  let sc={}, got=0;
  ['location','lighting','camera_angle','camera_framing','pose','mood_and_tone'].forEach(function(k){
    let v=_fImportExtractField(flat,k);
    if(v){ sc[k]=v; got++; }
  });
  if(!got) return null;
  return {prompt:_fImportExtractField(flat,'prompt'), subject:_fImportExtractField(flat,'subject'), scene:sc, __loose:true};
}

function fImportPrompt(){
  // v11.58: validasi teks (kosong / bukan JSON / tanpa isian) dilakukan DULU, baru dialog konfirmasi
  // "timpa isian" — dulu dialog muncul lebih awal sehingga user disuruh konfirmasi dulu baru
  // dikasih tahu textarea-nya kosong. State lama (strip status impor) juga baru dibersihkan setelah lolos.
  let errBox = document.getElementById('f-import-error');
  let statusBox = document.getElementById('f-import-status');
  if(errBox){errBox.classList.add('hidden');errBox.textContent='';}

  let raw = document.getElementById('f-import-textarea').value.trim();
  if(!raw){showToast('Paste dulu JSON prompt-nya ya','error');return;}

  // Bersihkan markdown fence kalau ada, lalu coba parse langsung
  let cleaned = raw.replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
  let parsed = _fImportParseLoose(cleaned);

  let scene = parsed && parsed.scene;
  if(!parsed || (!scene && !parsed.product && !parsed.prompt)){
    if(errBox){
      errBox.textContent = 'Teks ini kelihatannya bukan JSON prompt dari tools kita, atau formatnya rusak. Pastikan kamu paste JSON lengkapnya (dari tanda { paling awal sampai } paling akhir).';
      errBox.classList.remove('hidden');
    }
    showToast('Gagal baca prompt — cek lagi teksnya','error');
    return;
  }
  scene = scene || {};
  // VALIDASI ISI (hasil audit): JSON yang valid tapi tidak membawa satu pun isian (mis. cuma {"prompt":"..."})
  // dulu tetap dianggap "berhasil" — wizard dikosongkan lalu diisi mode Produk Saja yang kosong. Sekarang
  // ditolak SEBELUM state wizard disentuh, jadi isian yang sedang berjalan tidak hilang percuma.
  if(!(scene.location||scene.lighting||scene.camera_angle||scene.pose||scene.mood_and_tone||parsed.mood_and_tone||(parsed.product&&parsed.product.name))){
    if(errBox){
      errBox.textContent = 'JSON-nya terbaca, tapi tidak ada isian yang bisa diambil (lokasi, cahaya, sudut kamera, pose, mood, atau produk). Pastikan yang ditempel JSON lengkap dari tools ini.';
      errBox.classList.remove('hidden');
    }
    showToast('Tidak ada isian yang bisa diambil dari prompt ini','error');
    return;
  }

  // PENGAMAN (permintaan user: fitur ini tidak boleh mengganggu proses pembuatan prompt foto):
  // impor MENULIS ULANG semua step foto. Kalau wizard sudah ada isinya, minta konfirmasi dulu supaya
  // isian yang sedang berjalan tidak hilang karena salah tap.
  if(!window._fImportConfirmed && (FS.subjek||FS.lokasi||FS.pose||FS.cahaya||FS.angle||FS.mood||FS.produkNama)){
    showConfirm('Impor akan menimpa isian wizard foto yang sedang berjalan. Lanjutkan?',function(){
      window._fImportConfirmed=true;
      try{ fImportPrompt(); }finally{ window._fImportConfirmed=false; }
    },null,'Ya, Timpa');
    return;
  }
  // Buang sisa "step yang ketutup sementara karena lagi diedit" dari sesi sebelumnya.
  STEP_PAUSE_STACK.foto=[];
  if(statusBox){statusBox.classList.add('hidden');statusBox.textContent='';}
  let _impArea0 = document.getElementById('f-import-area'); if(_impArea0) _impArea0.classList.remove('ft-imported');

  // FIX BUG HANGER/RIWAYAT NYANGKUT: sebelum ini, field FS (lokasi, cahaya,
  // angle, pose, kamera, mood, hold, holdKey, produkMode, dst) cuma diisi
  // KALAU field yang bersangkutan ADA di JSON yang ditempel (pola
  // "if(scene.X){FS.X=...}"), TANPA ada else yang membersihkan nilai lama.
  // Akibatnya kalau JSON yang diimpor tidak membawa suatu field (mis. tidak
  // ada "product", atau scene tidak ada "camera_angle"), FS.X tetap berisi
  // nilai dari sesi SEBELUMNYA (manual atau impor lain) — itu sebabnya foto
  // bisa muncul pakai hanger padahal tidak disetel di prompt yang baru
  // ditempel. Reset dulu semua field wizard ke kosong di sini, supaya
  // hasil impor selalu murni dari JSON yang baru, tidak ada riwayat nyangkut.
  FS.subjek=''; FS.produkMode=''; FS.produkNama='';
  FS.holdKey=''; FS.hold='';
  FS.pose=''; FS.poseLabel=''; FS.poseDesc='';
  FS.lokasi=''; FS.lokasiLabel=''; FS.lokasiDesc='';
  FS.kamera='';
  FS.cahaya=''; FS.cahayaLabel=''; FS.cahayaDesc='';
  FS.angle=''; FS.angleLabel=''; FS.angleDesc='';
  FS.mood=''; FS.moodLabel='';
  FS.conflictLevel=0; FS.shotOverrides={};
  FS.povProduk=false; FS.holdLabel=''; FS.povPlacement=''; FS.povCamera='';   // keluar dari mode Produk saja · POV
  if(typeof povSync==='function')povSync();

  // isProdukSaja: prompt lama tanpa pose di scene = mode produk-saja
  // FIX (audit): dulu produk-saja = "tidak ada pose" saja, jadi prompt karakter (subject "a woman"/"a man")
  // yang kebetulan tanpa pose salah diimpor sebagai Produk Saja — hasil generate-nya jadi kontradiktif
  // ("no person visible" tapi subject: a woman). Sekarang teks subject ikut menentukan; tebakan lama
  // (tanpa pose) hanya dipakai kalau subject tidak mengenali karakter.
  let _impSubjTxt = String(parsed.subject || (parsed.prompt ? _fImportExtractField(cleaned,'subject') : '') || '').trim().toLowerCase();
  FS.importIsProdukSaja = false; // mode "Produk Saja" sudah dihapus
  let _impSubjProdukOnly = (_impSubjTxt === 'product only, no person');
  FS.importActive = true;
  FS.importSubject = parsed.subject || (parsed.prompt ? _fImportExtractField(cleaned,'subject') : '') || '';
  FS.importRefPhotos = Array.isArray(parsed.reference_photos) ? parsed.reference_photos : [];
  FS.importCriticalRule = parsed.critical_rule || '';
  FS.importConflictRule = parsed.conflict_priority || '';
  FS.importGeneratedOutfit = Array.isArray(parsed.generated_outfit) ? parsed.generated_outfit : [];
  // FIX IMPORT FOTO REF: sebelumnya reference_photos (Wajah/Produk/dst) dan
  // generated_outfit (Outfit AI) cuma disimpan sebagai teks mentah di
  // FS.importRefPhotos/FS.importGeneratedOutfit dan TIDAK PERNAH
  // disinkronkan ke FS.refs — padahal chip badge, kotak edit teks, dan list
  // foto di Step 1 semuanya baca dari FS.refs. Akibatnya waktu dibuka lagi,
  // semuanya kelihatan kosong/"butuh foto" padahal datanya ada di JSON.
  // Sekarang: setiap item disinkronkan jadi FS.refs beneran, supaya muncul
  // & bisa diedit langsung di list foto, sama seperti alur manual.
  FS.refs = []; FS.refCounter = 0; FS.hasProdukFoto = false;
  FS.importRefPhotos.forEach(function(p){
    if(!p) return;
    let keyRP = _fREF_LABEL_TO_KEY[p.type];
    if(!keyRP || !FTYPE[keyRP]) return; // tipe tidak dikenal — tetap tercatat di notice teks, dilewati di sini
    FS.refCounter++;
    let idRP='fr'+FS.refCounter;
    let defRP=FTYPE[keyRP];
    FS.refs.push({
      id:idRP, type:keyRP,
      focus:p.detail?String(p.detail):((keyRP==='produk'&&parsed.product&&parsed.product.name)?String(parsed.product.name):''),
      extractCustom:(p.extract_only!==undefined&&p.extract_only!==null&&p.extract_only!=='')?String(p.extract_only):defRP.extract,
      ignoreCustom:(p.ignore_completely!==undefined&&p.ignore_completely!==null&&p.ignore_completely!=='')?String(p.ignore_completely):defRP.ignore,
      autoSyncOutfit:false // FIX: teks Ambil/Abaikan hasil impor jangan ditimpa fSyncWajahOutfitDefault()
    });
    if(keyRP==='produk') FS.hasProdukFoto=true;
  });
  FS.importGeneratedOutfit.forEach(function(g){
    FS.refCounter++;
    let idGO='fr'+FS.refCounter;
    let defGO=FTYPE['outfit_random'];
    FS.refs.push({id:idGO,type:'outfit_random',focus:(g&&g.description)?String(g.description):'',extractCustom:defGO.extract,ignoreCustom:defGO.ignore});
  });
  FS.importProductBlock = parsed.product || null;
  FS.importOutputQuality = parsed.output_quality || null;
  FS.importStyleReference = parsed.style_reference || null;

  // Isi FS scene fields — teks lengkap dari prompt lama TETAP disimpan apa
  // adanya di FS.xDesc/FS.x (dipakai untuk generate ulang & untuk isi ulang
  // kotak "tulis sendiri" kalau user tap "ubah"). FS.xLabel dicoba dicocokkan
  // ke label pendek chip bawaan supaya tampilannya rapi seperti waktu diisi
  // manual — kalau tidak ketemu, fallback ke label 'Custom' + teks dipotong.
  let filled = [];

  if(scene.location){
    FS.lokasi = scene.location; FS.lokasiDesc = scene.location;
    let m = _fReverseLookupChip(scene.location,'fPickLokasi');
    FS.lokasiLabel = m || 'Custom';
    doneCard('f5','fa5', m || _fTrunc(scene.location,40));
    filled.push('Lokasi');
  }
  if(scene.lighting){
    FS.cahaya = scene.lighting; FS.cahayaDesc = scene.lighting;
    let m = _fReverseLookupChip(scene.lighting,'fPickCahaya');
    FS.cahayaLabel = m || 'Custom';
    doneCard('f7','fa7', m || _fTrunc(scene.lighting,40));
    filled.push('Cahaya');
  }
  if(scene.camera_angle){
    FS.angle = scene.camera_angle; FS.angleDesc = scene.camera_angle;
    let m = _fReverseLookupChip(scene.camera_angle,'fPickAngle');
    FS.angleLabel = m || 'Custom';
    doneCard('f8','fa8', m || _fTrunc(scene.camera_angle,40));
    filled.push('Sudut Kamera');
  }
  if(scene.pose){
    FS.pose = scene.pose; FS.poseDesc = scene.pose;
    let m = _fFindPoseLabel(scene.pose);
    FS.poseLabel = m || 'Custom';
    doneCard('f4','fa4', m || _fTrunc(scene.pose,40));
    filled.push('Pose');
  }
  if(scene.camera_framing) FS.kamera = scene.camera_framing;
  FS.mood = scene.mood_and_tone || parsed.mood_and_tone || '';
  if(FS.mood){
    let m = _fReverseLookupChip(FS.mood,'fPickMood');
    FS.moodLabel = m || 'Custom';
    doneCard('f9','fa9', m || _fTrunc(FS.mood,40));
    filled.push('Mood & Tone');
  }
  if(FS.importProductBlock && FS.importProductBlock.name) FS.produkNama = FS.importProductBlock.name;
  // v11.58: JSON lama bisa membawa blok "product" TANPA foto bertipe Produk di reference_photos.
  // Dulu blok itu hilang diam-diam saat generate ulang. Tandai supaya tetap dipakai.
  FS.importProdukNoPhoto = !!(FS.importProductBlock && FS.importProductBlock.name && !FS.hasProdukFoto);
  // Tanda tangan cahaya+mood+mode saat impor — dipakai builder untuk tahu apakah output_quality
  // asli dari JSON masih cocok, atau harus disesuaikan ulang karena user mengedit cahaya/mood.
  FS.importSceneSig = String(FS.cahayaDesc||FS.cahaya||'')+'||'+String(FS.mood||'')+'||'+((FS.importIsProdukSaja||(typeof fIsNoChar==='function'&&fIsNoChar()))?'1':'0');
  if(_impSubjProdukOnly && !(typeof fIsNoChar==='function'&&fIsNoChar())) showToast('Mode "Produk Saja" sudah dihapus — prompt ini diimpor sebagai karakter, silakan pilih pose-nya.','error');

  // Subjek — cocokkan teks "subject" dari prompt lama ke jenis subjek yang dikenal
  let subjMatch = _fSUBJECT_TEXT_MAP[String(FS.importSubject||'').trim().toLowerCase()];
  if(subjMatch){
    FS.subjek = subjMatch.subjek;
    doneCard('f0','fa0', subjMatch.label);
  } else {
    FS.subjek = FS.subjek || 'hijab';
    doneCard('f0','fa0', FS.importSubject ? _fTrunc(FS.importSubject,40) : 'Dari prompt lama');
  }

  // FIX BUG PANEL PRODUK-SAJA TIDAK PERNAH DITOGGLE: sebelumnya fToggleF1Panel
  // (yang switch antara panel "karakter" dan panel "produk-saja" untuk step
  // Foto Referensi/f1, Lokasi/f5, Cahaya/f7, Angle/f8 — termasuk chip khusus
  // "Dipegang Tangan" di panel produk-saja f8) HANYA dipanggil dari fPickSubjek
  // (pilih subjek manual). fImportPrompt men-set FS.subjek='produk' langsung
  // tanpa pernah memanggil fToggleF1Panel — padahal semua panel produk-saja
  // default-nya display:none di HTML. Akibatnya kalau user reopen (tap "Edit"
  // di Ringkasan) step Lokasi/Cahaya/Angle untuk prompt produk-saja hasil
  // impor, yang muncul adalah panel KARAKTER (salah), bukan panel produk —
  // chip "Dipegang Tangan" jadi sama sekali tidak reachable dari UI. Sekarang
  // dipanggil di sini juga, supaya panel yang tampil selalu sinkron dengan
  // FS.subjek hasil impor.
  fToggleF1Panel();

  // Cara Tampil Produk — cocokkan teks placement ke HOLD_MAP
  if(FS.importProductBlock){
    let holdLabel = _fFindHoldLabel(FS.importProductBlock.placement);
    // v11.58: untuk hanger, simpan HANYA bagian setelah prefix (sama seperti HOLD_MAP.hanger.val).
    // _fComputePlacement() menambahkan prefix sendiri; kalau FS.hold sudah berisi placement penuh,
    // prefix-nya menumpuk lagi di setiap impor→generate.
    let _impPl = String(FS.importProductBlock.placement || '');
    if(holdLabel === 'Pakai hanger — ke kamera'){
      let _hp = 'displayed on a hanger presented by the character to the camera';
      let _rest = _impPl.indexOf(_hp)===0 ? _impPl.substring(_hp.length).replace(/^\s*[—–-]+\s*/,'').trim() : '';
      FS.hold = _rest || HOLD_MAP.hanger.val;
    } else {
      FS.hold = _impPl;
    }
    FS.holdKey = holdLabel ? {'Dipakai langsung':'dipakai','Pakai hanger — ke kamera':'hanger','Dipegang — diarahkan ke kamera':'tangan'}[holdLabel] : 'custom';
    // FIX RINGKASAN IMPORT: FS.produkMode sebelumnya tidak pernah di-set di
    // sini, padahal fRenderSummary() baris "Cara Tampil" hanya muncul kalau
    // FS.produkMode === 'pegang'. Akibatnya row "Cara Tampil" hilang dari
    // Ringkasan meski FS.hold/FS.holdKey sudah terisi & step 3 sudah bisa
    // diedit dengan benar. Import selalu memakai jalur "pegang" (bukan
    // 'foto', karena import tidak pernah membawa foto produk asli).
    FS.produkMode = 'pegang';
    doneCard('f3','fa3', holdLabel || ('Diimpor: '+(FS.importProductBlock.name||'')));
  }

  // FIX IMPORT — SEMBUNYIKAN STEP CARDS: pastikan SEMUA card step 1-8
  // tersembunyi setelah import, jadi yang kelihatan cuma Ringkasan. doneCard()
  // di atas sudah otomatis nge-hide tiap kartu yang field-nya ada di JSON;
  // loop ini jaring pengaman untuk kartu yang datanya kebetulan tidak ada
  // (mis. JSON hasil edit manual yang field-nya dihapus), supaya tidak
  // nyangkut kebuka. Edit tetap bisa lewat tombol "Edit" di Ringkasan.
  ['f0','f1','f3','f4','f5','f7','f8','f9'].forEach(function(id){
    let c = document.getElementById(id);
    if(c){ c.classList.add('done'); c.classList.remove('pending'); c.classList.add('hidden'); }
  });
  let refTypes = FS.importRefPhotos.map(function(p){return p && p.type;}).filter(Boolean);
  refTypes = refTypes.filter(function(v,i){return refTypes.indexOf(v)===i;});
  doneCard('f1','fa1', refTypes.length ? (FS.importRefPhotos.length+' foto ('+refTypes.join(', ')+')') : 'Referensi diimpor');

  // Refresh chip badge & list foto Step 1 supaya Outfit AI (dan foto lain
  // yang barusan disinkronkan ke FS.refs) langsung kelihatan terisi, bukan
  // nunggu re-render manual.
  if(typeof fUpdateCounters === 'function') fUpdateCounters();
  if(typeof fRenderList === 'function') fRenderList();

  let genArea = document.getElementById('f-gen-area');
  if(genArea) genArea.classList.remove('hidden');
  if(typeof fRenderSummary === 'function') fRenderSummary();

  let _impMissing = [];
  if(!FS.lokasi && !(typeof fHasLokasiRef==='function' && fHasLokasiRef())) _impMissing.push('Lokasi');
  if(!FS.cahaya && !(typeof fHasLokasiRef==='function' && fHasLokasiRef())) _impMissing.push('Cahaya');
  if(!FS.angle) _impMissing.push('Sudut Kamera');
  if(!FS.mood) _impMissing.push('Mood & Tone');
  if(!FS.importIsProdukSaja && !(typeof fIsNoChar==='function'&&fIsNoChar()) && !FS.pose && !(FS.refs||[]).some(function(r){return r.type==='outfit_random'&&r.focus;})) _impMissing.push('Pose');
  if((FS.refs||[]).some(function(r){return r.type==='produk'&&!(r.focus&&String(r.focus).trim());})) _impMissing.push('Nama produk (di Foto Referensi)');
  if(statusBox){
    statusBox.innerHTML = 'Berhasil diimpor: <strong>' + esc(filled.join(', ')) + '</strong>. Tap "Edit" di Ringkasan buat ganti isian sebelum generate ulang.' + (_impMissing.length ? '<br><span style="color:var(--red);">Belum terisi: <strong>' + esc(_impMissing.join(', ')) + '</strong> — tap "Edit" di Ringkasan dan isi dulu, kalau tidak prompt-nya bolong.</span>' : '') + '<br><button onclick="fCancelImportAsk()" style="background:none;border:none;color:var(--red);font-size:var(--fs-xs);text-decoration:underline;cursor:pointer;padding:4px 0 0;"><svg class="icon"><use href="#ic-close"></use></svg> Batal, mulai dari awal</button>';
    if(parsed.__loose) statusBox.innerHTML += '<br><span style="color:var(--muted);">JSON-nya terpotong/rusak, jadi hanya isian yang terbaca yang diambil. Foto referensi &amp; nama produk tidak ikut — tambahkan lagi di Step Foto Referensi.</span>';
    statusBox.classList.remove('hidden');
  }
  // Setelah impor, area tempel diciutkan jadi strip status saja (lihat CSS .ft-imported) supaya
  // textarea besar tidak menumpuk di atas Ringkasan; tombol "Batal, mulai dari awal" tetap terlihat.
  let _impArea = document.getElementById('f-import-area');
  if(_impArea){ _impArea.classList.remove('hidden'); _impArea.classList.add('ft-imported'); }
  showToast('Prompt lama berhasil diimpor!','success');
  // v14.11 FIX IMPOR PROMPT LAMA: sejak layar "Prompt Foto AI" (Live Console) dipakai, semua kartu wizard, Ringkasan
  // dan tombol Generate HANYA tampil kalau layar itu terbuka (#foto.pfa-open). Impor tidak pernah membukanya,
  // jadi setelah "Import & Isi Otomatis" user cuma melihat strip status dan tidak bisa lanjut ke Generate.
  // Sekarang layar langsung dibuka dan digeser ke Ringkasan + Generate (kecuali sedang tur panduan).
  try{
    if(typeof window.pfaOpen==='function' && !document.body.classList.contains('pb-tour-active')){
      window.pfaOpen();
      setTimeout(function(){ try{ if(typeof window.pfaView==='function') window.pfaView('prompt'); }catch(e){} },150);
    }
  }catch(e){}
  setTimeout(()=>genArea && genArea.scrollIntoView({behavior:'smooth',block:'nearest'}),200);
}

// Batalkan import dan kembali ke wizard normal dari awal
// v14.11: dipanggil dari tombol "Mulai dari awal" di strip status impor (dulu fungsi ini tidak punya tombol sama sekali).
function fCancelImportAsk(){
  showConfirm('Impor dibatalkan dan semua isian wizard foto dikosongkan. Lanjutkan?',fCancelImport,null,'Ya, Kosongkan');
}
function fCancelImport(){
  // v14.11: pakai reset penuh yang sama dengan tombol Reset (bersihkan state impor, hasil generate, progress),
  // lalu tutup layar Prompt Foto AI supaya user kembali ke pilihan awal.
  try{
    if(typeof fResetNow==='function'){
      fResetNow();
      try{ if(typeof window.pfaClose==='function') window.pfaClose(); }catch(e){}
      return;
    }
  }catch(e){}
  FS.importActive = false;
  FS.importRefPhotos = null;
  FS.importCriticalRule = '';
  FS.importConflictRule = '';
  FS.importGeneratedOutfit = null;
  FS.importProductBlock = null;
  FS.importOutputQuality = null;
  FS.importStyleReference = null;
  FS.importSubject = '';
  FS.importIsProdukSaja = false; FS.importProdukNoPhoto = false; FS.importSceneSig = '';
  fResetFrom(0);
  let ta = document.getElementById('f-import-textarea'); if(ta) ta.value='';
  let statusBox = document.getElementById('f-import-status'); if(statusBox) statusBox.classList.add('hidden');
  let _impAreaC = document.getElementById('f-import-area'); if(_impAreaC) _impAreaC.classList.remove('ft-imported');
}


// ── Membangun 1 objek JSON prompt. `ov` (opsional) berisi override
// untuk fitur multi-shot: {label, poseOverride, placementOverride,
// kameraNote, forceProdukSaja, introExtra} — dipanggil tanpa argumen
// untuk generate normal (hasilnya identik seperti sebelumnya). ──────
function _fBuildPromptJSON(ov){
  ov = ov || {};
  if(FS.importActive) return _fBuildImportedPromptJSON(ov);

  // ── Pisahkan outfit_random dari foto nyata ──────────────────────
  // outfit_random = instruksi GENERATIF (tidak ada foto fisik untuk di-upload)
  // foto nyata    = semua tipe selain outfit_random (ada foto fisik yang di-upload)
  let realRefs   = FS.refs.filter(r => r.type !== 'outfit_random');
  let randomRefs = FS.refs.filter(r => r.type === 'outfit_random');
  // FITUR BARU (permintaan user): urutan foto referensi di JSON WAJIB tetap
  // 1) Wajah/Karakter, 2) Outfit, 3) Produk/Objek — apapun urutan chip yang
  // ditap user di Step 1 (mis. tap "Produk" duluan, baru "Karakter Sheet"
  // belakangan). Pakai fRefOrderPriority/fSortRefsForOrder yang sama dengan
  // fRenderList() (nomor F1/F2/F3 yang tampil di layar), supaya urutan yang
  // dilihat user di Step 1 selalu konsisten dengan urutan di JSON hasil
  // generate — tidak ada lagi kartu tampil F1=Produk padahal di JSON fotonya
  // jadi nomor 2. Notifikasi "Urutan Foto" (fBuildUploadNotice) otomatis
  // ikut benar karena dipanggil dengan realRefs yang sudah diurutkan ulang
  // ini (lihat _fDoGenerate).
  realRefs = fSortRefsForOrder(realRefs);

  // Build reference_photos — HANYA dari foto nyata, renumber 1..N
  let _noCharPS = !!(ov.forceProdukSaja || FS.subjek==='produk' || fIsNoChar());
  let photoCounter = 0;
  let refPhotos = realRefs.map(r => {
    photoCounter++;
    let def = FTYPE[r.type];
    // FIX: sebelumnya `r.extractCustom || def.extract` — kalau user menghapus
    // teksnya jadi string kosong, itu dianggap falsy dan diam-diam BALIK ke
    // teks default (perubahan user tidak ngefek). Sekarang: cek eksplisit
    // apakah field pernah diisi (bukan undefined), lalu trim. Kalau memang
    // sengaja dikosongkan, key-nya di-OMIT total dari JSON — beneran hilang.
    let extractText = (r.extractCustom !== undefined ? r.extractCustom : def.extract).trim();
    let ignoreText = (r.ignoreCustom !== undefined ? r.ignoreCustom : def.ignore).trim();
    let obj = {
      photo_number: photoCounter,
      type: def.label
    };
    if(extractText) obj.extract_only = extractText + (r.ukuran && r.type==='produk' ? '. Product physical size: '+r.ukuran+' — render the product accurately to this size ratio relative to the scene.' : '');
    // MODE OUTFIT SAJA: tidak ada foto Karakter Sheet, jadi kalimat yang merujuk ke sana dibuang agar AI tidak bingung.
    if(ignoreText && typeof fIsOutfitOnly==='function' && fIsOutfitOnly()){
      ignoreText = ignoreText.replace('wajah karakter HANYA dari foto Karakter Sheet','tidak ada wajah yang boleh muncul di hasil');
    }
    if(ignoreText && typeof fIsOutfitOnly==='function' && fIsOutfitOnly() && (r.type==='outfit' || r.type==='lokasi')) ignoreText += _F_FACELESS_REF_FRAMING;
    if(ignoreText) obj.ignore_completely = ignoreText;
    _fApplyFaceRule(obj, r, realRefs);
    if(r.type==='lokasi'){
      obj.detail = _F_LOK_DETAIL_ANGLE + ' ' + (_noCharPS
        ? 'Light the product exactly the same way the location is lit, so the shadows, highlights, and color cast on the product match the environment. Add realistic contact shadows on the surface it rests on.'
        : 'Light the character and outfit exactly the same way the location is lit, so the shadows, highlights, and color cast on skin and clothes match the environment. Add realistic contact shadows on the ground.') + (r.focus ? ' Location notes: ' + r.focus : '');
    } else if(r.type==='pose'){
      obj.detail = _F_POSE_DETAIL + (r.focus ? ' Pose notes: ' + r.focus : '');
    } else if(r.focus) obj.detail = r.focus;
    return obj;
  });

  // Build generated_outfit block — dari outfit_random (teks deskripsi, bukan foto)
  // Setiap item adalah satu instruksi generatif terpisah
  let generatedOutfits = randomRefs.map((r, i) => ({
    outfit_number: i + 1,
    instruction: 'DO NOT look for a reference photo for this outfit. Instead, GENERATE the complete outfit entirely from this text description.',
    description: r.focus || '',
    generate: 'Create a complete, cohesive outfit — all garments, colors, textures, accessories, and styling details — based solely on the description above. Make it look naturally worn on the character, realistic, and consistent with the overall scene.'
  }));

  // Inject conflict priority rule jika level 1
  let conflictRule = '';
  if(FS.conflictLevel === 1){
    conflictRule = 'PRIORITY OVERRIDE: The product photo is the SINGLE authoritative source for ' + FS.produkNama + '. Any appearance of a similar item in other reference photos (especially the outfit photo) must be completely IGNORED and replaced by the product from the product reference photo. The product photo takes absolute priority over all other photos for this specific item.';
  }

  // ── isProdukSaja: dipaksa true untuk shot "Detail Produk" (tanpa karakter) ──
  let isProdukSaja = ov.forceProdukSaja || FS.subjek==='produk' || fIsNoChar();
  let subjekDesc=isProdukSaja?'product only, no person':({'hijab':'a woman','pria':'a man'}[FS.subjek]||'a person');

  // Dipindah lebih awal (sebelumnya dihitung di bawah, setelah Product block) —
  // dibutuhkan di sini supaya fallback placement produk-saja (di bawah) bisa
  // konsisten dengan info "ada tangan di frame atau tidak", tidak kontradiksi.
  let effAngle = ov.angleOverride || FS.angleDesc || FS.angle;
  // v15.8: sudut kamera WAJIB ikut foto pose kalau ada; wajah hanya dari karakter sheet
  let _poseNoA = !isProdukSaja ? _fRefNoOf(realRefs,'pose') : 0;
  if(_poseNoA) effAngle = _fPoseAngleDesc(_poseNoA);
  else if(FS.angleLabel===_F_POSE_ANGLE_LBL && !ov.angleOverride) effAngle = 'natural eye-level camera angle';
  let _charNoA = _fRefNoOf(realRefs,'wajah');
  let _idIntro = (_charNoA && !isProdukSaja && realRefs.length>1) ? _fIdentityIntro(_charNoA) : '';
  // v18.41: MODE FACELESS (Outfit saja / Outfit + Lokasi): framing full-length + kepala di luar frame dikunci,
  // jadi sudut kamera pilihan user / foto lokasi tidak boleh menimpa.
  let _ooF = !isProdukSaja && typeof fIsOutfitOnly==='function' && fIsOutfitOnly();
  if(_ooF && !ov.angleOverride) effAngle = _F_FACELESS_ANGLE_DESC;
  // FIX: kalau mode produk-saja TAPI angle yang dipilih adalah "dipegang tangan"
  // (ada tangan di frame), jangan bilang "no person or human visible" — itu
  // kontradiksi langsung sama instruksi tangannya sendiri, bikin AI bingung
  // dan akhirnya render tanpa tangan sama sekali.
  // FIX #2: HANYA berlaku kalau shot ini TIDAK punya placementOverride sendiri
  // (jalur generate biasa) — kalau ov sudah bawa placementOverride sendiri
  // (misal multi-shot "Detail Produk tanpa karakter" yang eksplisit MELARANG
  // tangan), jangan sampai auto-detect ini malah nabrak/kontradiksi instruksi
  // shot itu sendiri hanya karena angle dasar user kebetulan "Dipegang Tangan".
  let _povHandNC = isProdukSaja && !ov.placementOverride && !ov.forceProdukSaja && _fIsPovHandNoChar();
  let angleHasHand = (isProdukSaja && !ov.placementOverride && /\bhand\b/i.test(effAngle)) || _povHandNC;
  if(_povHandNC) subjekDesc = 'product only, no person visible except a single hand holding the product (first-person POV)';
  if(_povHandNC && !ov.angleOverride) effAngle = 'POV style (first-person perspective), as if the viewer is holding the product' + (effAngle && !/^POV style/.test(effAngle) ? ' \u2014 ' + effAngle : '');
  let produkSajaIntroText = angleHasHand
    ? 'A photorealistic product image, clean and detailed, product held by a hand entering the frame — only the hand is visible, no face or rest of the body. '
    : 'A photorealistic product-only image, clean and detailed, no person or human visible. ';

  // Product block
  let produkBlock = null;
  let hasProdukRef = FS.refs.some(r=>r.type==='produk');
  if(FS.produkMode !== 'tidak' && hasProdukRef){
    let placement = _fComputePlacement(ov);
    // FIX BUG: kalau subjek = "Produk Saja" dipakai lewat jalur generate utama
    // (bukan lewat checkbox multi-shot "Detail Produk"), holdKey/hold memang
    // sengaja tidak pernah diisi (step "Cara Tampil Produk" di-skip untuk mode
    // ini) — akibatnya _fComputePlacement() di atas selalu balik string kosong,
    // dan field "placement" di JSON produk jadi kosong walau field lain
    // (camera_framing, dst) sudah terisi. Sekarang: kalau masih kosong DAN
    // memang mode produk-saja, isi teks default yang konsisten dengan
    // angleHasHand di atas — supaya tidak kontradiksi ("no hands" vs angle
    // yang justru minta tangan masuk frame).
    if(!placement && isProdukSaja){
      placement = angleHasHand
        ? 'held by a hand entering the frame — only the hand is visible, product sharp, fully visible and prominently framed toward camera'
        : 'displayed clearly and prominently as the sole focus of the frame, no hands or person present, centered composition showing full product detail';
    }
    produkBlock = {
      name: FS.produkNama || '[product from reference photo]',
      placement: placement,
      instruction: 'This product MUST be clearly visible, sharp, and prominently displayed. Preserve its exact shape, color, size, logo, and all visual details. Do NOT alter, resize, or obscure the product at any point.'
    };
  }

  // Output quality
  let quality = {
    camera: 'Shot using a smartphone camera (not DSLR), with natural handheld feel. The image includes subtle digital noise and grain typical of a phone camera, especially in shadows and low-light areas. Slight imperfections such as minor motion blur, soft focus inconsistencies, and natural exposure shifts are present. The dynamic range is realistic (not overly HDR), with slightly clipped highlights and soft shadow details. The framing is slightly imperfect, not perfectly centered, with a subtle wide lens feel and natural perspective distortion. Overall look resembles an authentic phone photo, not a polished or studio-quality image.',
    lighting: 'Lighting is natural and imperfect, coming from a window or ambient indoor source rather than studio lights. The light falls unevenly across the subject, creating soft shadows on one side of the face and slightly brighter highlights on the other. There may be mild overexposure in small highlight areas and gentle shadow gradients across the scene. The lighting is not perfectly balanced, with slight warmth and natural color variation. Some areas of the scene may be dimmer or less illuminated, creating a cozy, lived-in atmosphere. Avoid flat lighting or perfectly even illumination. Overall lighting should feel organic, spontaneous, and human, not staged or studio-controlled.'
  };

  // ── Build natural language intro ────────────────────────────────
  // FIX: sebelumnya pakai FS.pose/FS.lokasi/FS.cahaya/FS.angle yang untuk
  // pilihan chip cuma berisi LABEL singkat (misal "Eye Level", "Dipegang
  // Tangan") — deskripsi lengkapnya (bahasa Inggris, detail) tidak pernah
  // sampai ke AI sama sekali. Sekarang pakai field *Desc yang menyimpan
  // teks lengkapnya, dengan fallback ke field lama untuk jaga-jaga.
  let effPose = ov.poseOverride || FS.poseDesc || FS.pose;
  let effKamera = ov.kameraNote || FS.kamera;
  if(_ooF && !ov.kameraNote) effKamera = '';
  let effLokasi = ov.lokasiOverride || FS.lokasiDesc || FS.lokasi;
  let effCahaya = ov.cahayaOverride || FS.cahayaDesc || FS.cahaya;
  let effMood = ov.moodOverride || FS.mood;
  // Foto referensi LOKASI: lokasi & pencahayaan diambil dari foto itu (step Lokasi/Pencahayaan dilewati).
  let _lokRef = realRefs.find(r => r.type === 'lokasi');
  let _lokNo = _lokRef ? realRefs.indexOf(_lokRef) + 1 : 0;
  if(_lokRef){
    effLokasi = 'the exact location shown in reference photo ' + _lokNo + ' — same architecture, props, background elements, colors, and atmosphere' + _F_LOK_DESC_SUFFIX + (isProdukSaja ? '' : '; the character looks naturally present in the space with correct scale and perspective');
    effCahaya = 'taken entirely from reference photo ' + _lokNo + ', with the same light direction, color temperature, softness, contrast, and shadow behavior, copied onto ' + (isProdukSaja ? 'the product' : 'the character and outfit');
  }
  // FIX: output_quality dulu SELALU menulis "foto HP, bukan studio", "hindari cahaya rata" dan menyebut "wajah" —
  // bentrok dengan Softbox/Studio rata/Dark Moody, mood Clean/Luxury/Editorial, dan mode Produk Saja (tanpa wajah).
  _fAdaptQuality(quality, effCahaya, effMood, isProdukSaja);
  // MODE OUTFIT SAJA (tanpa wajah): teks kualitas tidak boleh menyebut "face", supaya AI tidak memunculkan wajah.
  if(!isProdukSaja && typeof fIsOutfitOnly==='function' && fIsOutfitOnly()){
    ['camera','lighting'].forEach(function(k){
      quality[k]=String(quality[k]||'').replace(/the subject(?:'|\u2019)s face/g,'the outfit').replace(/of the face/g,'of the outfit');
    });
    // v18.42: framing faceless ditentukan blok composition, bukan "tidak rapi / subtle wide lens".
    quality.camera=String(quality.camera||'').replace(/The framing is slightly imperfect, not perfectly centered, with a subtle wide lens feel and natural perspective distortion\./,'The framing follows the composition section exactly.');
  }
  if(_lokRef){
    quality.lighting = 'Follow the lighting of reference photo ' + _lokNo + ' exactly and keep it consistent across the whole frame, on the character, the outfit, and the background; do not add studio lighting or any light that contradicts the location.';
    quality.camera = String(quality.camera || '') + (isProdukSaja ? ' The product must not look cut-out or pasted into the scene.' : ' The character must not look cut-out or pasted into the scene.');
    if(isProdukSaja) quality.lighting = quality.lighting.replace('on the character, the outfit, and the background','on the product and the background');
  }

  // Tambahkan keterangan outfit random ke intro jika ada
  let outfitRandomIntro = '';
  if(generatedOutfits.length > 0 && !ov.forceProdukSaja){
    let descs = randomRefs.map(r => r.focus).filter(Boolean);
    outfitRandomIntro = 'Outfit (AI-generated, no reference photo): ' + descs.join(' | ') + '. ';
  }

  let intro = (isProdukSaja
    ? produkSajaIntroText
    : (hasProdukRef
        ? 'A photorealistic product image'+_fIntroStyle(effMood)+'. Subject: '+subjekDesc+'. '
        : (_ooF
            ? _F_FACELESS_INTRO + ' ' + _fFacelessCompositionText() + ' ' + _F_FACELESS_IMPORTANT + ' Subject: '+subjekDesc+'. '
            : 'A photorealistic lifestyle fashion image'+_fIntroStyle(effMood)+'. Subject: '+subjekDesc+'. ')))
    + outfitRandomIntro
    + (produkBlock ? 'Hero product: ' + produkBlock.name + (produkBlock.placement ? ', ' + produkBlock.placement + '. ' : '. ') + produkBlock.instruction + ' ' : '')
    + _idIntro
    + 'Scene: ' + effLokasi + '. '
    + 'Lighting: ' + effCahaya + '. '
    // FIX BUG KONSISTENSI JALUR NORMAL vs IMPORT: sebelumnya baris ini tidak
    // cek apakah effPose kosong (beda dengan _fBuildImportedPromptJSON yang
    // sudah pakai guard "effPose ?" di kondisi yang sama). Kalau effPose
    // kosong tapi isProdukSaja false, hasilnya kalimat rusak
    // "...Character pose: . Camera angle: ..." nyangkut di tengah prompt.
    // Disamakan dengan jalur import supaya tidak pernah menulis pose kosong.
    + (isProdukSaja || !effPose ? '' : 'Character pose: ' + effPose + '. ')
    + (effKamera ? 'Camera framing: ' + effKamera + '. ' : '')
    + 'Camera angle: ' + effAngle + '. '
    + (_ooF ? _fFacelessRuleText() + ' ' : '')
    + 'Mood & tone: ' + effMood + '.';

  // ── FULL JSON ───────────────────────────────────────────────────
  let fullJson = {
    prompt: intro,
    subject: subjekDesc,
    mood_and_tone: effMood,
    ...(refPhotos.length > 0 && realRefs.length > 0 ? {
      critical_rule: 'Read each reference photo SELECTIVELY. Extract ONLY the specified elements from each photo and ignore everything else. Every extract_only and ignore_completely directive is ABSOLUTE — do NOT blend elements across photos unless explicitly stated.'
    } : {}),
    ...(conflictRule ? {conflict_priority: conflictRule} : {}),
    ...((_charNoA && !isProdukSaja && realRefs.length>1) ? {identity_rule: _fIdentityRuleText(_charNoA)} : {}),
    ...(_ooF ? {important: _F_FACELESS_IMPORTANT, composition: _fFacelessComposition(), faceless_rule: _fFacelessRuleText()} : {}),
    ...(refPhotos.length > 0 ? {reference_photos: refPhotos} : {}),
    ...(generatedOutfits.length > 0 && !ov.forceProdukSaja ? {generated_outfit: generatedOutfits} : {}),
    ...(produkBlock ? {product: produkBlock} : {}),
    scene: {
      location: effLokasi,
      // FIX BUG KONSISTENSI JALUR NORMAL vs IMPORT: sama seperti fix intro
      // di atas — tanpa "!effPose" di sini, field "pose":"" bisa ikut
      // terkirim kosong ke JSON kalau effPose kosong padahal bukan mode
      // produk-saja. Disamakan dengan _fBuildImportedPromptJSON yang sudah
      // benar (baris scene.pose di sana pakai "isProdukSaja || !effPose").
      ...(isProdukSaja || !effPose ? {} : {pose: effPose}),
      ...(effKamera ? {camera_framing: effKamera} : {}),
      camera_angle: effAngle,
      lighting: effCahaya,
      mood_and_tone: effMood
    },
    output_quality: quality,
    ...(_ooF ? {negative_prompt: _F_FACELESS_NEGATIVE} : {})
  };

  let subjekLabel = ov.label || (FS.subjek==='hijab'?'Hijab':FS.subjek==='pria'?'Pria':'Produk');
  return {fullJson, realRefs, randomRefs, subjekLabel};
} // end _fBuildPromptJSON

// ── Notifikasi Upload — bangun & tampilkan ───────────────────────
let _fUploadNoticeList = '';

// FITUR BARU (permintaan user): tampilan "urutan foto" di sebelah tombol
// Salin JSON diganti dari teks polos jadi kotak-kotak kecil bergaya preview
// lampiran (seperti kotak thumbnail foto yang mau diupload ke Google Flow),
// tapi isinya ICON per jenis foto (bukan foto asli) + label di bawahnya,
// diikuti 1 pill kecil berisi ikon kamera + jumlah foto (×N) tanpa teks
// "Gambar" — cukup ikon dan angkanya saja.
const FTYPE_ICON_MAP={
  lokasi:'ic-pin', wajah:'ic-face', outfit:'ic-outfit', atasan:'ic-outfit', bawahan:'ic-outfit',
  aksesori:'ic-outfit', produk:'ic-box', objek:'ic-box', outfit_random:'ic-outfit'
};
// Caption singkat per jenis foto (bukan label panjang FTYPE) — biar kotaknya
// tetap ringkas & mirip gaya preview lampiran, tapi jenis fotonya masih
// jelas dibaca sekilas.
const FTYPE_SHORT_LABEL={
  lokasi:'Foto Lokasi', wajah:'Foto Karakter Sheet', outfit:'Foto Outfit', atasan:'Foto Atasan', bawahan:'Foto Bawahan',
  aksesori:'Foto Aksesori', produk:'Foto Produk', objek:'Foto Objek', outfit_random:'Foto Outfit'
};
// Tampilan "urutan foto": alur horizontal bertahap (nomor, ikon, label per foto)
// dengan garis penghubung; menyesuaikan jumlah foto, bisa digeser jika sempit.
function _fBuildOutLabelBoxesHTML(realRefs){
  if(!realRefs || !realRefs.length) return '';
  let steps = realRefs.map(function(r, i){
    let iconId = FTYPE_ICON_MAP[r.type] || 'ic-camera';
    let label = FTYPE_SHORT_LABEL[r.type] || 'Foto';
    let dot = (i < realRefs.length - 1) ? '<span class="fo-dot" style="animation-delay:'+(i*0.4)+'s"></span>' : '';
    return '<div class="fo-step">'
      + '<span class="fo-num">'+(i+1)+'</span>'
      + '<svg class="icon fo-ic"><use href="#'+iconId+'"></use></svg>'
      + '<span class="fo-lbl">'+esc(label)+'</span>'
      + dot
      + '</div>';
  }).join('');
  return '<div class="fo-title">Upload ke Google Flow sesuai urutan ini</div>'
    + '<div class="fo-sub">Jika terbalik, hasil foto akan salah.</div>'
    + '<div class="fo-flow">' + steps + '</div>';
}

function _fComputeUploadNoticeStr(realRefs, randomRefs){
  if(realRefs && realRefs.length > 0){
    return realRefs.map((r, i) => (i+1) + '. foto ' + FTYPE[r.type].label.toLowerCase()).join('  ·  ');
  }
  // FIX IMPORT: prompt yang diimpor tidak punya FS.refs/realRefs (tidak ada file
  // foto asli), tapi urutan fotonya tetap ada di FS.importRefPhotos (dari field
  // "reference_photos" JSON yang diimpor). Field .type di situ sudah berupa
  // label siap pakai (mis. "Wajah Karakter"), bukan key FTYPE — pakai apa adanya.
  if(FS.importActive && FS.importRefPhotos && FS.importRefPhotos.length > 0){
    return FS.importRefPhotos.map((r, i) => (i+1) + '. foto ' + esc(String((r && r.type) || 'referensi').toLowerCase())).join('  ·  ');
  }
  return '';
}
function fBuildUploadNotice(realRefs, randomRefs){
  _fUploadNoticeList = _fComputeUploadNoticeStr(realRefs, randomRefs);
}

function fShowUploadNotice(){
  if(!_fUploadNoticeList) return;

  // Hapus notif lama jika ada
  let old = document.getElementById('f-urutan-notif');
  if(old) old.remove();

  let el = document.createElement('div');
  el.id = 'f-urutan-notif';
  el.style.cssText = 'position:fixed;top:calc(16px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:9999;'
    + 'background:linear-gradient(180deg,var(--surface3),var(--surface));color:var(--text);border-radius:var(--radius-lg);'
    + 'border:1px solid rgba(var(--pulse-rgb),0.28);'
    + 'padding:16px 18px;width:calc(100% - 32px);max-width:480px;'
    + 'box-shadow:var(--shadow-lg),0 0 0 1px rgba(var(--pulse-rgb),0.08);animation:notifSlideDown 0.25s ease;';

  el.innerHTML = '<div style="display:flex;align-items:center;gap:9px;margin-bottom:8px;">'
    + '<span style="width:26px;height:26px;flex-shrink:0;border-radius:var(--radius-md);background:var(--accent-dim-bg);display:flex;align-items:center;justify-content:center;">'
    + '<svg class="icon" style="font-size:var(--fs-md);color:var(--accent-2);"><use href="#ic-warning"></use></svg>'
    + '</span>'
    + '<span style="font-size:var(--fs-sm);font-weight:600;letter-spacing:0.2px;color:var(--text);">Urutan Foto Tidak Boleh Terbalik</span>'
    + '</div>'
    + '<div style="font-size:var(--fs-xs2);margin-bottom:12px;color:var(--muted);line-height:1.65;">Upload ke Google Flow sesuai urutan ini — jika terbalik, hasil foto akan salah.</div>'
    + '<div style="font-size:var(--fs-sm);font-weight:500;margin-bottom:14px;color:var(--accent-2);font-family:\'Hanken Grotesk\',system-ui,sans-serif;letter-spacing:0.1px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;">' + _fUploadNoticeList + '</div>'
    + '<button onclick="var n=document.getElementById(\'f-urutan-notif\');if(n)n.remove();" '
    + 'style="width:100%;background:linear-gradient(135deg,var(--accent),var(--accent-dim));color:#171310;border:none;padding:10px;border-radius:var(--radius);'
    + 'font-size:var(--fs-sm);font-weight:600;cursor:pointer;font-family:Hanken Grotesk,sans-serif;box-shadow:0 4px 12px rgba(184,150,95,0.18);">Saya Mengerti</button>';

  document.body.appendChild(el);

  // Auto-dismiss setelah 12 detik jika tidak ditutup
  setTimeout(() => { let n=document.getElementById('f-urutan-notif'); if(n) n.remove(); }, 12000);
}

// ── Helper salin teks yang robust — coba Clipboard API, kalau gagal/tidak
// tersedia fallback ke execCommand (penting untuk beberapa browser/WebView HP) ──
function _copyTextRobust(text,onOk,onFail){
  function viaExec(){
    let ta=document.createElement('textarea');ta.value=text;
    ta.style.cssText='position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(ta);ta.focus();ta.select();
    try{
      let ok=document.execCommand('copy');
      document.body.removeChild(ta);
      if(ok){if(onOk)onOk();}else{if(onFail)onFail();}
    }catch(e){
      document.body.removeChild(ta);
      if(onFail)onFail();
    }
  }
  if(navigator.clipboard&&navigator.clipboard.writeText){
    // FIX (bug kecil di _copyTextRobust): sebelumnya pakai
    // .then(onOk).catch(viaExec) — kalau ada exception DI DALAM onOk
    // sendiri, .catch itu ikut menangkapnya juga, jadi viaExec ikut jalan
    // (menyalin kedua kali) dan onOk bisa terpanggil dua kali tanpa ada
    // pesan error yang jelas. .then(onOk, viaExec) memastikan viaExec
    // cuma jadi fallback untuk writeText() yang gagal, bukan untuk error
    // di dalam onOk.
    navigator.clipboard.writeText(text).then(function(){if(onOk)onOk();},viaExec);
  }else{
    viaExec();
  }
}

