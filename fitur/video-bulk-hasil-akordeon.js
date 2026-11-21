// fitur/video-bulk-hasil-akordeon.js — Video — tampilan hasil Bulk (akordeon per produk).
// Bagian dari js/10-main-app.js lama (baris 21655–21976). Isi tidak diubah.
// ══════════════════════════════════════════════════════════════════
// AKORDEON PRODUK (Step 6) — dipakai mode Bulk AI (_vbRenderBulkOutput) dan
// mode Tulis Manual banyak produk (vbManualRenderGroups). Satu produk
// terbuka sekaligus; sisanya jadi baris ringkas. Struktur elemen grup TIDAK
// diubah (cuma ditambah kelas CSS + 2 elemen di header), jadi semua fungsi
// lain yang mencari elemen lewat id tetap jalan. Hanya jalan kalau produk >= 2.
// ══════════════════════════════════════════════════════════════════
var VB_ACC_OPEN=0; // index produk yang sedang terbuka, -1 = semua tertutup
var VB_ACC_ROLE_COLORS=['var(--accent)','var(--blue)','var(--green)']; // Hook, Cerita, CTA
function _vbAccWordState(idx){
  let ta=document.getElementById('vb-bulk-script-'+idx);
  if(!ta)return '';
  let wrap=document.getElementById('vb-ta-wrap-'+idx);
  if(wrap&&wrap.classList.contains('vb-ta-loading'))return ''; // masih diketik/menunggu AI
  let n=ta.value.split(/\s+/).filter(Boolean).length;
  if(!n)return '';
  let r=vbGetWordRange();
  return(n>=r.min&&n<=r.max)?'ok':'bad';
}
function _vbAccRefresh(prodIdx){
  let dots=document.getElementById('vb-acc-dots-'+prodIdx);
  if(!dots)return;
  let ok=0,it=dots.children;
  let _n16=_vb16();
  for(let r=0;r<3;r++){
    if(_n16&&r===1){if(it[r])it[r].style.display='none';continue;} // 16 detik: slot Story tidak dipakai
    let st=_vbAccWordState(prodIdx*3+r);
    if(st==='ok')ok++;
    if(it[r]){it[r].style.display='';it[r].className=st;}
  }
  let msg=_n16?('Hook + Story, CTA: '+ok+' dari 2 sudah pas jumlah katanya'):('Hook, Cerita, CTA: '+ok+' dari 3 sudah pas jumlah katanya');
  dots.title=msg;dots.setAttribute('aria-label',msg);
}
function _vbAccScrollParent(el){
  let p=el.parentElement;
  while(p&&p!==document.body&&p!==document.documentElement){
    let oy=getComputedStyle(p).overflowY;
    if((oy==='auto'||oy==='scroll')&&p.scrollHeight>p.clientHeight+1)return p;
    p=p.parentElement;
  }
  return document.scrollingElement||document.documentElement;
}
// open = index produk yang mau dibuka (-1 = tutup semua). anchorIdx = header
// yang posisinya di layar dijaga supaya halaman tidak loncat saat ada grup
// lain yang ikut menutup di atasnya.
function _vbAccSet(open,anchorIdx){
  let ag=document.querySelector('#vb-multi-output>.vb-acc[data-acc="'+anchorIdx+'"]');
  let head=ag?ag.querySelector('.vb-acc-head'):null;
  let before=head?head.getBoundingClientRect().top:0;
  VB_ACC_OPEN=open;
  document.querySelectorAll('#vb-multi-output>.vb-acc').forEach(function(g){
    let on=parseInt(g.getAttribute('data-acc'),10)===open;
    g.classList.toggle('open',on);
    let b=g.querySelector('.vb-acc-chev');
    if(b)b.setAttribute('aria-expanded',on?'true':'false');
  });
  if(head){
    let delta=head.getBoundingClientRect().top-before;
    if(Math.abs(delta)>1){let sp=_vbAccScrollParent(head);sp.scrollTop+=delta;}
  }
}
function vbAccToggle(prodIdx){_vbAccSet(VB_ACC_OPEN===prodIdx?-1:prodIdx,prodIdx);}
// Dipakai fitur lain yang butuh kartu produk tertentu kelihatan (mis. panduan/tur).
function vbAccEnsureOpen(prodIdx){
  if(VB_ACC_OPEN===prodIdx)return;
  if(document.querySelector('#vb-multi-output>.vb-acc[data-acc="'+prodIdx+'"]'))_vbAccSet(prodIdx,prodIdx);
}
// ══ KARTU BERANTAI (opsi C) — kolom skrip siap salin. Hanya menambah kelas/penanda;
// id & fungsi lama (vb-card-N, vb-bulk-script-N, vb-bulk-copy-N, vb-bulk-wc-N, vb-bulk-json-N) tidak diubah.
function _vbRscCard(card){
  if(!card||card.classList.contains('rsC-card'))return;
  var idx=parseInt(card.id.slice(8),10),r=idx%3,head=card.children[0],body=card.children[1];
  if(!head||!body)return;
  card.classList.add('rsC-card');head.classList.add('rsC-top');body.classList.add('rsC-in');
  if(card.parentNode&&card.parentNode.id==='vb-multi-output')card.parentNode.classList.add('rsC-flat');
  var sub=head.firstElementChild?head.firstElementChild.querySelector('span:not(.step-num-inline)'):null;
  if(sub)sub.textContent=sub.textContent.replace(/^[\s\u00b7]+/,'');
  var mk=document.createElement('span');mk.className='rsC-mk';
  mk.innerHTML='<b>'+((_vb16()&&r===2)?2:(r+1))+'</b><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5L6.5 11.5L12.5 4.5"/></svg>';
  head.insertBefore(mk,head.firstChild);
  var wc=body.querySelector('[id^="vb-bulk-wc-"]'),pre=body.querySelector('[id^="vb-bulk-json-"]');
  if(!wc||!pre||card.querySelector('.vb-pre-toggle'))return;
  var meta=document.createElement('div');meta.className='rsC-meta';
  body.insertBefore(meta,wc);meta.appendChild(wc);
  pre.classList.add('vb-pre-collapsed');
  var t=document.createElement('button');t.type='button';t.className='vb-pre-toggle rsC-pt';t.setAttribute('aria-expanded','false');
  t.innerHTML='<span>Lihat prompt</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6L8 10L12 6"/></svg>';
  t.onclick=function(){var c=pre.classList.toggle('vb-pre-collapsed');t.firstChild.textContent=c?'Lihat prompt':'Sembunyikan prompt';t.setAttribute('aria-expanded',c?'false':'true');};
  meta.appendChild(t);
}
function _vbRscEnhance(group,groupHead,prodIdx,total){
  group.classList.add('rsC');group.classList.toggle('rsC-multi',total>1);
  if(group.parentNode)group.parentNode.classList.remove('rsC-flat');
  groupHead.classList.add('rsC-head');
  if(group.lastElementChild)group.lastElementChild.classList.add('rsC-cards');
  for(var r=0;r<3;r++)_vbRscCard(document.getElementById('vb-card-'+(prodIdx*3+r)));
}
// jaring pengaman: kartu yang dibuat ulang (mis. Generate Ulang Produk) tetap dapat tampilan yang sama
(function(){var mo=new MutationObserver(function(){
  document.querySelectorAll('#vb-multi-output [id^="vb-card-"]').forEach(function(c){
    try{if(c.classList.contains('rsC-card')||!/^vb-card-\d+$/.test(c.id))return;var pn=c.parentNode,g=pn&&pn.parentNode;
      if(pn&&(pn.id==='vb-multi-output'||(g&&g.classList.contains('rsC'))))_vbRscCard(c);}catch(e){}});});
  function go(){var w=document.getElementById('vb-multi-output');if(w)mo.observe(w,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();})();
// Panggil SETELAH group sudah dimasukkan ke #vb-multi-output.
function _vbAccSetup(group,groupHead,prodIdx,total){
  try{_vbRscEnhance(group,groupHead,prodIdx,total);}catch(eRsc){}
  if(total<2)return;
  group.classList.add('vb-acc');
  group.setAttribute('data-acc',String(prodIdx));
  groupHead.classList.add('vb-acc-head');
  Array.from(groupHead.children).forEach(function(el){
    if(el.tagName==='BUTTON')el.classList.add('vb-acc-tool'); // pensil & Revisi: cuma tampil saat produk terbuka
  });
  let dots=document.createElement('div'); // sengaja DIV (bukan SPAN): _pbEnhanceBulkGroups mengambil SPAN terakhir sebagai nama produk
  dots.className='vb-acc-dots';dots.id='vb-acc-dots-'+prodIdx;dots.setAttribute('role','img');
  dots.innerHTML='<i></i><i></i><i></i>';
  if(_vb16()&&dots.children[1])dots.children[1].style.display='none';
  groupHead.appendChild(dots);
  let chev=document.createElement('button');
  chev.type='button';chev.className='vb-acc-chev';
  chev.setAttribute('aria-label','Buka atau tutup produk '+(prodIdx+1));
  chev.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';
  chev.onclick=function(e){e.stopPropagation();vbAccToggle(prodIdx);};
  groupHead.appendChild(chev);
  groupHead.addEventListener('click',function(e){
    if(e.target.closest('button,input,textarea,select,a,img,label'))return;
    vbAccToggle(prodIdx);
  });
  // Kartu Hook/Cerita/CTA: garis warna di kiri + prompt panjang disembunyikan
  // (tombol "Lihat prompt"). Tombol Salin tetap menyalin prompt LENGKAP karena
  // isinya dibaca dari elemen vb-bulk-json-N yang tetap ada.
  for(let r=0;r<3;r++){
    let card=document.getElementById('vb-card-'+(prodIdx*3+r));
    if(!card)continue;
    card.style.setProperty('--vb-role',VB_ACC_ROLE_COLORS[r]);
    let pre=card.querySelector('[id^="vb-bulk-json-"]');
    if(pre&&pre.parentNode&&!card.querySelector('.vb-pre-toggle')){
      pre.classList.add('vb-pre-collapsed');
      let t=document.createElement('button');
      t.type='button';t.className='vb-pre-toggle';t.textContent='Lihat prompt';
      t.onclick=function(){
        let c=pre.classList.toggle('vb-pre-collapsed');
        t.textContent=c?'Lihat prompt':'Sembunyikan prompt';
      };
      pre.parentNode.insertBefore(t,pre);
    }
  }
  let on=(VB_ACC_OPEN===prodIdx);
  group.classList.toggle('open',on);
  chev.setAttribute('aria-expanded',on?'true':'false');
  _vbAccRefresh(prodIdx);
}

function _vbRenderBulkOutput(products,produkListMeta,skipHistory,animate){
  VB_ACC_OPEN=0; // hasil baru: produk pertama terbuka
  VB_SINGLE_OVERLAY=null;
  VB_BULK_ITEMS=[];
  VB_CARD_TAMPIL={};
  VB_CARD_LOKASI={};
  VB_PRODUCT_FOTOCOUNT={};
  VB_HOOK_OVERLAY={};
  _vbTypewriterSequentialReset(); // buang animasi sequential sesi lama kalau masih jalan
  // Panel revisi dibangun ULANG dari nol di bawah (prodIdx bisa menunjuk ke
  // produk yang berbeda dari sebelumnya kalau ada yang di-drop AI) — buang
  // override foto lama biar tidak nyangkut ke prodIdx yang salah.
  VB_REVISI_FOTO_OVERRIDE={};
  // FITUR BARU (permintaan user, Sept 2026): backup+jatah revisi per-produk
  // ikut dibuang di sini juga — sama alasannya seperti baris di atas.
  VB_BULK_REVISI_BACKUP={};
  let _resolvedMetas=_vbResolveProductMetas(products,produkListMeta);
  VB_BULK_PRODUCTS=products.map(function(p,_k){
    let meta=_resolvedMetas[_k];
    // FIX BUG KRITIS FOTO (pasangan fix di _vbBuildProductMetaLookup di atas):
    // baris return di sini juga dulu cuma mengambil {nama,keunggulan} dari meta,
    // menjatuhkan fotoBase64/fotoMime walau lookup-nya sendiri sudah punya
    // data itu. Sekarang foto ikut dibawa supaya VB_BULK_PRODUCTS[prodIdx]
    // yang dipakai vbRevisiProdukAI & vbRegenerateAllBulk tetap punya foto
    // yang sama seperti yang diupload user di awal.
    // FIX BUG (pasangan fix di _vbBuildProductMetaLookup di atas): topik
    // ikut dibawa di sini juga, sama seperti foto — supaya VB_BULK_PRODUCTS
    // yang dipakai vbRevisiProdukAI & vbRegenerateAllBulk tetap punya arahan
    // topik yang sama seperti yang diisi user di form Bulk.
    return meta?{ta:meta.ta||'',nama:meta.nama,keunggulan:meta.keunggulan,topik:meta.topik||'',hookType:meta.hookType||'',hookCustom:meta.hookCustom||'',overlay:meta.overlay||'',pitch:meta.pitch||'',accent:meta.accent||'',fotoBase64:meta.fotoBase64||'',fotoMime:meta.fotoMime||''}:{nama:p.produk||'',keunggulan:'',topik:'',hookType:'',hookCustom:'',overlay:'',fotoBase64:'',fotoMime:''};
  });
  // FITUR BARU: isi kolom "Isi" (teks overlay) dari form Bulk dibawa ke state
  // overlay per-produk (VB_HOOK_OVERLAY) — dipakai _vbBuildFlowText untuk
  // menempelkan kalimat overlay di akhir prompt HOOK. Index = posisi produk di
  // hasil (prodIdx), sama seperti panel "Atur Detail" di atas kartu Hook.
  VB_BULK_PRODUCTS.forEach(function(bp,k){
    if(bp&&bp.overlay)VB_HOOK_OVERLAY[k]=bp.overlay;
  });
  let multiWrap=document.getElementById('vb-multi-output');
  multiWrap.innerHTML='';
  multiWrap.style.display='flex';


  let i=0;
  let _vbBulkTypeItems=[];
  products.forEach(function(p,prodIdx){
    // ── Grup per produk: nomor + nama jelas, dipisah dari produk lain ──
    let group=document.createElement('div');
    group.style.cssText='border:1px solid var(--border-hi);border-radius:var(--radius-sm);overflow:hidden;background:var(--bg);';

    let groupHead=document.createElement('div');
    groupHead.style.cssText='background:var(--surface3);padding:9px 12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border-hi);';
    // FITUR BARU: kalau produk ini punya foto referensi yang diupload user
    // (VB_BULK_PRODUCTS[prodIdx] sudah diisi lengkap dgn fotoBase64/fotoMime
    // di .map() atas), tampilkan thumbnail KECIL di header grup skrip supaya
    // foto tetap kelihatan sebagai konteks tanpa makan tempat — tidak tampil
    // sama sekali kalau produk itu memang tidak ada foto (mis. refMode tanpa
    // foto produk atau mode 3 tanpa upload).
    let _groupFotoMeta=VB_BULK_PRODUCTS[prodIdx];
    let _groupFotoHtml=(_groupFotoMeta&&_groupFotoMeta.fotoBase64)
      ?'<img id="vb-group-foto-'+prodIdx+'" class="vbfoto-img" src="data:'+(_groupFotoMeta.fotoMime||'image/jpeg')+';base64,'+_groupFotoMeta.fotoBase64+'" alt="Foto referensi produk" title="Foto referensi produk — tap untuk perbesar" style="width:24px;height:24px;border-radius:var(--radius-2xs);object-fit:cover;border:1px solid var(--border-hi);flex-shrink:0;" />'
      :'';
    groupHead.innerHTML='<span style="background:var(--text);color:var(--bg);width:20px;height:20px;border-radius:50%;font-size:var(--fs-xs);font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:\'Hanken Grotesk\',system-ui,sans-serif;">'+(prodIdx+1)+'</span>'
      +_groupFotoHtml
      +'<span id="vb-prodname-'+prodIdx+'" style="font-size:var(--fs-sm);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">'+esc(p.produk||'Produk '+(prodIdx+1))+'</span>';
    let revisiBtn=document.createElement('button');
    revisiBtn.id='vb-revisi-btn-'+prodIdx;
    revisiBtn.className='copy-btn';
    revisiBtn.style.cssText='font-size:var(--fs-2xs);padding:3px 8px;flex-shrink:0;';
    revisiBtn.textContent='Revisi';
    revisiBtn.onclick=(function(idx){return function(){vbToggleRevisiPanel(idx);};})(prodIdx);
    groupHead.appendChild(_vbCharMakeBtn(prodIdx,false));
    groupHead.appendChild(revisiBtn);
    group.appendChild(groupHead);
    group.appendChild(_vbCharMakePanel(prodIdx,VB_CHAR_PANEL_STYLE_GROUP));

    // ── Panel revisi per-produk (tersembunyi default) ──
    let revisiPanel=document.createElement('div');
    revisiPanel.id='vb-revisi-panel-'+prodIdx;
    revisiPanel.className='hidden';
    revisiPanel.style.cssText='padding:9px;background:var(--surface2);border-bottom:1px solid var(--border-hi);display:flex;flex-direction:column;gap:6px;';
    let _revFoto=VB_BULK_PRODUCTS[prodIdx]||{};
    let hasRevFoto=!!_revFoto.fotoBase64;
    revisiPanel.innerHTML='<div style="font-size:var(--fs-2xs);color:var(--muted);">Betulkan nama/keunggulan produk dan/atau tulis apa yang mau diubah, lalu generate ulang khusus produk ini.</div>'
      +'<input class="inp" id="vb-revisi-nama-'+prodIdx+'" maxlength="80" placeholder="Nama produk" style="font-size:var(--fs-xs2);padding:6px 8px;" value="'+esc((VB_BULK_PRODUCTS[prodIdx]&&VB_BULK_PRODUCTS[prodIdx].nama)||p.produk||'')+'" />'
      +'<input class="inp" id="vb-revisi-keunggulan-'+prodIdx+'" maxlength="150" placeholder="Keunggulan (opsional)" style="font-size:var(--fs-xs2);padding:6px 8px;" value="'+esc((VB_BULK_PRODUCTS[prodIdx]&&VB_BULK_PRODUCTS[prodIdx].keunggulan)||'')+'" />'
      +'<div>'
      +'<label class="inplabel" style="font-size:var(--fs-2xs);">Foto Referensi <span style="font-weight:400;color:var(--muted);">(kosongkan = pakai foto lama, atau upload buat ganti)</span></label>'
      +'<input type="file" accept="image/*" id="vb-revisi-foto-input-'+prodIdx+'" style="position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none;" onchange="vbHandleRevisiFotoUpload(this,'+prodIdx+')" />'
      +'<div id="vb-revisi-foto-empty-'+prodIdx+'" onclick="document.getElementById(\'vb-revisi-foto-input-'+prodIdx+'\').click()" style="'+(hasRevFoto?'display:none;':'')+'border:1.5px dashed var(--border-hi);border-radius:var(--radius-xs);padding:8px;text-align:center;color:var(--muted);font-size:var(--fs-2xs);cursor:pointer;">'
      +'<svg class="icon" style="width:14px;height:14px;"><use href="#ic-camera"></use></svg> Tap buat upload/ganti foto</div>'
      +'<div id="vb-revisi-foto-preview-'+prodIdx+'" style="'+(hasRevFoto?'':'display:none;')+'position:relative;display:inline-block;">'
      +'<img id="vb-revisi-foto-img-'+prodIdx+'" class="vbfoto-img" src="'+(hasRevFoto?'data:'+(_revFoto.fotoMime||'image/jpeg')+';base64,'+_revFoto.fotoBase64:'')+'" style="max-width:70px;max-height:70px;border-radius:var(--radius-xs);display:block;object-fit:cover;border:1px solid var(--border-hi);" />'
      +'<button type="button" onclick="vbRemoveRevisiFoto('+prodIdx+')" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:var(--red);color:#fff;border:none;font-size:12px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;"><svg class="icon"><use href="#ic-close"></use></svg></button>'
      +'</div>'
      +'</div>'
      +'<textarea class="inp" id="vb-revisi-note-'+prodIdx+'" rows="2" placeholder="Opsional: instruksi revisi, misal \'buat CTA lebih santai\' atau \'ganti sudut cerita\'" style="font-size:var(--fs-xs2);padding:6px 8px;resize:vertical;"></textarea>'
      +'<div style="display:flex;gap:6px;">'
      +'<button class="btn sm" style="flex:1;" onclick="vbRevisiProdukAI('+prodIdx+')">Generate Ulang Produk Ini</button>'
      +'<button class="reset-btn" style="flex:0;padding:8px 12px;" onclick="vbToggleRevisiPanel('+prodIdx+',true)">Batal</button>'
      +'</div>'
      // FITUR BARU (permintaan user, Sept 2026): tombol "Kembalikan ke Versi
      // Awal" — tersembunyi default, cuma muncul setelah revisi PERTAMA
      // untuk produk ini berhasil (lihat vbRevisiProdukAI/vbUndoRevisiProduk).
      // Ini yang bikin batas 1x revisi di atas aman dipakai user — kalau
      // hasilnya kurang memuaskan, tinggal klik ini buat balik ke versi awal
      // (jatah revisi ikut kebuka lagi 1x).
      +'<button class="reset-btn hidden" id="vb-revisi-undo-btn-'+prodIdx+'" style="width:100%;" onclick="vbUndoRevisiProduk('+prodIdx+')"><svg class="icon"><use href="#ic-refresh"></use></svg> Kembalikan ke Versi Awal</button>';
    group.appendChild(revisiPanel);

    let groupBody=document.createElement('div');
    groupBody.style.cssText='padding:8px;display:flex;flex-direction:column;gap:6px;';

    // FITUR BARU: "Atur Detail" → Teks Overlay Hook (permintaan user) —
    // tampil di SEMUA mode referensi foto (1/2/3), per produk (grup) di mode
    // Bulk, diletakkan di atas kartu Hook produk ini.

    // FITUR BARU: "Jumlah Foto Produk" per PRODUK (prodIdx grup ini), khusus
    // Mode 3 — lihat _vbBuildProductFotoCountRow. Diletakkan di atas kartu
    // Hook (kartu pertama di groupBody di bawah), bukan lagi per kartu.
    if(VB.refMode==='kp'){
      groupBody.appendChild(_vbBuildProductFotoCountRow(prodIdx));
    }

    ['hook','story','cta'].forEach(function(roleKey){
      let roleInfo=VB_3SCRIPT_ROLES.find(r=>r.key===roleKey);
      let card=_vbBuildEditableCard(i,roleInfo?roleInfo.label:roleKey,p[roleKey]||'',p.produk,!!animate);
      groupBody.appendChild(card);
      if(animate){
        let finalScript=VB_BULK_ITEMS[i]?VB_BULK_ITEMS[i].script:(p[roleKey]||'');
        _vbBulkTypeItems.push({taId:'vb-bulk-script-'+i,text:finalScript,onTick:(function(ii){return function(){vbBulkUpdateJson(ii);};})(i)});
      }
      i++;
    });

    group.appendChild(groupBody);
    multiWrap.appendChild(group);
    _vbAccSetup(group,groupHead,prodIdx,products.length);
  });

  let resetBtn=document.createElement('button');
  resetBtn.className='reset-btn';
  resetBtn.innerHTML='<svg class="icon"><use href="#ic-refresh"></use></svg> Buat Prompt Video Baru';
  resetBtn.onclick=vbReset;
  multiWrap.appendChild(resetBtn);

  // FIX BUG#10 (akhirnya tuntas — lihat catatan lengkap di _vbBuildEditableCard
  // & _vbBuildCombinedHistoryEntry): SATU entri Riwayat gabungan untuk SELURUH
  // sesi bulk ini (dipakai baik untuk generate awal maupun "Generate Ulang
  // Semua" dari panel setting, karena keduanya sama-sama lewat fungsi ini),
  // bukan 1 entri per kartu seperti sebelumnya yang bikin Riwayat lama
  // ketiban habis.
  if(!skipHistory&&!animate){
    _vbBuildCombinedHistoryEntry('Bulk '+products.length+' produk ('+(products.length*_vbPer())+' script)'+(VB.bulkTargetAudience?' — '+VB.bulkTargetAudience:''));
  }

  if(animate&&_vbBulkTypeItems.length>0)return _vbTypewriterSequentialRun(_vbBulkTypeItems);
  return Promise.resolve();
}

// Buka/tutup panel revisi 1 produk tertentu (forceClose=true buat selalu menutup)
function vbToggleRevisiPanel(prodIdx,forceClose){
  let panel=document.getElementById('vb-revisi-panel-'+prodIdx);
  if(!panel)return;
  if(forceClose){panel.classList.add('hidden');return;}
  panel.classList.toggle('hidden');
}

