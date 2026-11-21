// fitur/foto-konflik-dan-cahaya.js — Foto — pendeteksi konflik AI (dinonaktifkan) dan urutan/hint Cahaya sesuai lokasi.
// Bagian dari js/10-main-app.js lama (baris 24680–24811). Isi tidak diubah.
// ============================================================
// AI SMART CONFLICT DETECTOR — DINONAKTIFKAN
// Fitur AI (analisa kombinasi via Gemini) sudah dihapus sesuai
// permintaan. Fungsi di bawah sengaja dibiarkan sebagai no-op
// (tidak melakukan apapun) supaya semua pemanggilan yang sudah
// ada di alur wizard (fRunAIConflictCheck(...)) tidak error.
// Deteksi konflik berbasis keyword (non-AI) di Step 3 tetap aktif.
// ============================================================

let _aiConflictCache = null;
let _aiConflictState = null;
let _aiConflictRunning = false;

function fRunAIConflictCheck(force){
  let container = document.getElementById('ai-conflict-container');
  if(container){ container.style.display = 'none'; container.innerHTML = ''; }
  // Setiap kali area generate dibuka/di-refresh, ringkasan harus ikut ter-update
  if(typeof fRenderSummary === 'function') fRenderSummary();
}

// ── END AI SMART CONFLICT DETECTOR ──────────────────────────────



// ============================================================
// CONTEXT-AWARE CAHAYA — Reorder & hint berdasarkan lokasi
// ============================================================

function fDetectLokasiContext(lokasiVal){
  if(!lokasiVal) return 'neutral';
  let v = lokasiVal.toLowerCase();

  // Studio / backdrop
  if(v.includes('backdrop') || v.includes('studio') || v.includes('seamless') ||
     v.includes('marble') || v.includes('linen') || v.includes('wood') ||
     v.includes('concrete') || v.includes('flat lay') || v.includes('glass surface') ||
     v.includes('gift box') || v.includes('tray') || v.includes('bedsheet') ||
     v.includes('gradient background')) return 'studio';

  // Indoor
  if(v.includes('bedroom') || v.includes('kamar') || v.includes('cafe') ||
     v.includes('indoor') || v.includes('living room') || v.includes('ruang tamu') ||
     v.includes('library') || v.includes('perpustakaan') || v.includes('kitchen') ||
     v.includes('dapur') || v.includes('window') || v.includes('curtain') ||
     v.includes('lamp') || v.includes('chandelier') || v.includes('fairy light') ||
     v.includes('korean') || v.includes('cozy') || v.includes('warm amber') ||
     v.includes('bookshelve') || v.includes('colonial architecture') ||
     v.includes('kota tua') || v.includes('malioboro')) return 'indoor';

  // Outdoor
  if(v.includes('outdoor') || v.includes('sunrise') || v.includes('sunset') ||
     v.includes('cliff') || v.includes('ocean') || v.includes('volcano') ||
     v.includes('temple') || v.includes('taman') || v.includes('park') ||
     v.includes('street') || v.includes('sky') || v.includes('mountain') ||
     v.includes('beach') || v.includes('pantai') || v.includes('forest') ||
     v.includes('hutan') || v.includes('rice field') || v.includes('bromo') ||
     v.includes('borobudur') || v.includes('nusa penida') || v.includes('raja ampat') ||
     v.includes('tebing') || v.includes('heha') || v.includes('tanah lot') ||
     v.includes('natural setting') || v.includes('foliage')) return 'outdoor';

  return 'neutral';
}

function fApplyCahayaContext(){
  if(!FS.lokasi) return;
  let ctx = fDetectLokasiContext(FS.lokasi);
  let normalPanel = document.getElementById('f7-normal-panel');
  if(!normalPanel) return;

  // Hapus hint lama
  let oldHint = normalPanel.querySelector('.cahaya-context-hint');
  if(oldHint) oldHint.remove();

  // Reset highlight & clabel styling
  normalPanel.querySelectorAll('.chip').forEach(c => c.classList.remove('context-highlight'));
  normalPanel.querySelectorAll('.clabel').forEach(c => {
    c.classList.remove('context-top','context-bottom');
  });

  if(ctx === 'neutral') return;

  // FITUR DIHAPUS (permintaan user): pemberitahuan/banner "Lokasi indoor
  // dipilih..." / "Lokasi outdoor dipilih..." tidak lagi ditampilkan.
  // Reorder & highlight chip yang relevan tetap jalan seperti biasa di
  // bawah ini, cuma kartu pemberitahuannya saja yang dihapus.

  // Reorder chip sections: pindahkan section yang relevan ke atas
  let chips = normalPanel.querySelector('.chips');
  if(!chips) return;

  let labels = Array.from(chips.querySelectorAll('.clabel'));
  if(labels.length < 2) return;

  // Label pertama = Outdoor, Label kedua = Indoor
  let outdoorLabel = labels[0];
  let indoorLabel  = labels[1];

  // Kumpulkan chips per section
  function getSection(label){
    let items = [];
    let el = label.nextElementSibling;
    while(el && !el.classList.contains('clabel')){
      items.push(el);
      el = el.nextElementSibling;
    }
    return items;
  }

  let outdoorChips = getSection(outdoorLabel);
  let indoorChips  = getSection(indoorLabel);

  if(ctx === 'indoor' || ctx === 'studio'){
    // Indoor dulu — pindahkan indoor section ke atas
    indoorLabel.classList.add('context-top');
    outdoorLabel.classList.add('context-bottom');
    // Re-insert: indoor section dulu
    chips.innerHTML = '';
    chips.appendChild(indoorLabel);
    indoorChips.forEach(c => chips.appendChild(c));
    chips.appendChild(outdoorLabel);
    outdoorChips.forEach(c => chips.appendChild(c));
    // Highlight 2 chip indoor pertama
    indoorChips.slice(0,2).forEach(c => { if(c.classList) c.classList.add('context-highlight'); });
  } else if(ctx === 'outdoor'){
    // Outdoor dulu — urutan default, highlight 2 chip outdoor pertama
    outdoorLabel.classList.add('context-top');
    indoorLabel.classList.add('context-bottom');
    outdoorChips.slice(0,2).forEach(c => { if(c.classList) c.classList.add('context-highlight'); });
  }
}
// ── END CONTEXT-AWARE CAHAYA ───────────────────────────────────

