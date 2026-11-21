// fitur/video-atur-mode-produk.js — (dulu js/41-pb-pmode.js) dipindah dari <script id="pb-pmode-js"> di index.html lama (baris 40884). Isi tidak diubah.
(function(){
var PM={modes:{},lok:"",queue:null,base:"",home:"",busy:false,dur:0,durWiz:0,locked:false,durSet:false,light:"",sw:false,pending:"",started:false,skip:null,res:[],fash:[],snap:null,lokWiz:"",lightWiz:""};
window.PB_PM=PM;
var LBL={satu:"Start Frame",kp:"Raw Asset",aset:"POV Produk (Pakai Skrip)",dua:"Percakapan 2 Suara",fashion:"Fashion Editorial"};
var ORDER=["satu","kp","aset","dua"];
function $(id){return document.getElementById(id);}
function esc(t){return String(t==null?"":t).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
function cnt(){var n=parseInt(($("vb-bulk-count")||{}).value,10);if(n>0)return n;var r=$("vb-bulk-rows");return r?r.children.length:0;}
function baseMode(){if(PM.base)return PM.base;if(PM.home)return PM.home;var m=(typeof VB!=="undefined")?VB.refMode:"";return ORDER.indexOf(m)>-1?m:"satu";}
function eff(i){return PM.modes[i]||baseMode();}
function vbv(k){return (typeof VB!=="undefined")?VB[k]:undefined;}
function durNow(){if(PM.snap)return PM.snap.fz.dur;var w=(vbv("refMode")!=="dua")?(vbv("durasi")||0):0;if(PM.durSet&&w!==PM.durWiz&&(w===16||w===24))PM.durSet=false;if(!PM.durSet&&(w===16||w===24))PM.dur=w;return PM.dur;}
function lokNow(){if(PM.snap)return PM.snap.fz.lok;var w=vbv("mode3Lokasi")||"";if(PM.lok&&w===PM.lokWiz)return PM.lok;return w||PM.lok||"";}
function lightNow(){if(PM.snap)return PM.snap.fz.lt;var w=vbv("mode3Lighting")||"";if(PM.light&&w===PM.lightWiz)return PM.light;return w||PM.light||"";}
function applyKp(lok,lt){
  VB.mode3Lokasi=VB.mode3LokasiLabel=lok;VB.mode3LokOk=!!lok;
  VB.mode3Lighting=VB.mode3LightingLabel=lt;VB.mode3LightOk=!!lt;
  try{vbSyncStep6Mode3();}catch(e){}
}
function nm(i){var e=$("vb-bulk-nama-"+i);return (e&&e.value.trim())||("Produk "+(i+1));}
// PERBAIKAN (20 Nov 2026): ambil foto produk ke-i (kalau sudah diupload) supaya sheet Atur Mode Produk bisa menampilkan thumbnail, jadi tidak bingung kalau nama produk sama.
function fotoSrc(i){
  try{
    var c=(typeof VB_BULK_ROW_CACHE!=="undefined")?VB_BULK_ROW_CACHE[i]:null;
    if(c&&c.fotoBase64)return "data:"+(c.fotoMime||"image/jpeg")+";base64,"+c.fotoBase64;
  }catch(e){}
  try{
    var im=$("vb-bulk-foto-img-"+i),pv=$("vb-bulk-foto-preview-"+i);
    if(im&&im.getAttribute("src")&&pv&&pv.style.display!=="none")return im.getAttribute("src");
  }catch(e){}
  return "";
}
// PERBAIKAN (16 Nov 2026): mode utama di luar 4 grup (mis. Percobaan) dulu dianggap Start Frame oleh baseMode(), jadi produk tanpa pilihan ikut dibuat sebagai Start Frame. Sekarang fitur ini hanya aktif kalau mode utama termasuk ORDER.
function groupable(){var m=(typeof VB!=="undefined")?VB.refMode:"";return ORDER.indexOf(m)>-1;}
function active(){var n=cnt();if(n<2&&!PM.queue)return false;if(!PM.queue&&!groupable())return false;for(var i=0;i<n;i++){if(PM.modes[i]&&PM.modes[i]!==baseMode())return true;}return false;}
function toast(t,k){try{showToast(t,k||"");}catch(e){}}
function btnLabel(){var b=$("pb-pm-btn");if(!b)return;var n=0,c=cnt();
  // Tombol cuma relevan kalau produk > 1. Tetap tampil selama antrean grup berjalan (tombol "Batalkan Sisa Antrean" ada di dalam sheet-nya).
  b.classList.toggle("hidden",!((c>1&&groupable())||!!PM.queue));
  // PERBAIKAN (16 Nov 2026): A11, jelaskan kenapa tombol tidak muncul
  try{var ht=$("pb-pm-hint");if(!ht){ht=document.createElement("div");ht.id="pb-pm-hint";ht.style.cssText="font-size:var(--fs-xs2);color:var(--muted);margin-top:6px;";ht.textContent="Atur Mode Produk (beda mode per produk) hanya tersedia di mode Start Frame, Raw Asset, atau Percakapan 2 Suara.";if(b.parentNode)b.parentNode.insertAdjacentElement("afterend",ht);}ht.classList.toggle("hidden",!(c>1&&!groupable()&&!PM.queue));}catch(e){}
  var ci=$("vb-bulk-count");
  if(ci){var lk=!!PM.queue;ci.disabled=lk;ci.style.opacity=lk?".5":"";ci.title=lk?"Dikunci sampai semua grup mode selesai":"";}for(var i=0;i<c;i++){if(PM.modes[i]||(PM.voice&&PM.voice[i]))n++;}b.textContent=PM.queue&&PM.queue.length?("Grup "+Math.max(1,(PM.total||PM.queue.length)-PM.queue.length+1)+"/"+(PM.total||PM.queue.length)+" · "+LBL[PM.queue[0]]):(n?("Atur Mode Produk ("+n+" diatur)"):"Atur Mode Produk");}
window.pbPmSkip=function(i){return PM.skip?PM.skip(i):false;};
// Produk bermode Fashion Editorial tidak pakai skrip → nama tidak wajib (dipakai vbInfoNext & vbInfoSum).
window.pbPmIsFashion=function(i){return (cnt()>1||!!PM.queue)&&(!!PM.queue||groupable())&&eff(i)==="fashion";};
// 20 Nov 2026: pilihan Gaya Bicara & Aksen per produk di sheet Atur Mode Produk. Kosong = ikut pilihan wizard.
var VOICE_PITCH=[["bercanda","Suka bercanda"],["gaul","Gaul"],["toxic","Toxic"]];
var VOICE_ACC=[["neutral standard accent","Netral"],["casual Jakarta accent","Jakarta"],["light Sundanese accent","Sunda"],["light Medan accent","Medan"],["light Malaysian accent","Malaysia"]];
function voiceHtml(i){
  if(eff(i)==="fashion")return "";
  var v=(PM.voice&&PM.voice[i])||{};
  var gp=vbv("pitchLabel")||vbv("pitch")||"-",ga=vbv("accentLabel")||vbv("accent")||"-";
  function sel(kind,lbl,list,cur,def){
    return '<select class="inp" data-pm-'+kind+'="'+i+'" aria-label="'+lbl+' produk '+(i+1)+'" style="flex:1;min-width:0;font-size:var(--fs-xs2);padding:6px 8px;"><option value="">'+esc(lbl+": "+def+" (default)")+"</option>"
      +list.map(function(o){return '<option value="'+esc(o[0])+'"'+(cur===o[0]?" selected":"")+">"+esc(o[1])+"</option>";}).join("")+"</select>";
  }
  return '<div style="display:flex;gap:6px;margin-top:6px;">'+sel("pitch","Gaya bicara",VOICE_PITCH,v.pitch||"",gp)+sel("accent","Aksen",VOICE_ACC,v.accent||"",ga)+"</div>";
}
window.pbPmVoice=function(i){if(cnt()<2&&!PM.queue)return null;return (PM.voice&&PM.voice[i])||null;};
function sheetBody(){
  var c=cnt(),h="",needLok=false,b=baseMode();
  // PERBAIKAN (16 Nov 2026): A9, aksi cepat "terapkan ke semua produk"
  if(c>1&&!PM.queue)h+='<div style="display:flex;gap:6px;margin-bottom:12px;"><select class="inp" id="pb-pm-all" style="flex:1;"><option value="">Mode utama ('+LBL[b]+')</option>'+["satu","kp","aset","dua","fashion"].map(function(k){return '<option value="'+k+'">'+LBL[k]+"</option>";}).join("")+'</select><button type="button" class="btn" id="pb-pm-all-go" style="margin:0;white-space:nowrap;">Terapkan ke semua</button></div>';
  for(var i=0;i<c;i++){
    var m=PM.modes[i]||"";if((m||b)==="kp")needLok=true;
    var fs=fotoSrc(i);
    h+='<div style="display:flex;gap:10px;align-items:center;margin-bottom:10px;">'
      +(fs?'<img alt="Foto produk '+(i+1)+'" data-pm-foto="'+i+'" style="flex:none;width:56px;height:56px;border-radius:10px;object-fit:cover;border:1px solid var(--border-hi);cursor:zoom-in;" />'
          :'<div aria-hidden="true" style="flex:none;width:56px;height:56px;border-radius:10px;border:1.5px dashed var(--border-hi);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:var(--fs-2xs);text-align:center;line-height:1.2;">Tanpa foto</div>')
      +'<div style="flex:1;min-width:0;"><div style="font-size:var(--fs-xs2);margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+(i+1)+". "+esc(nm(i))+'</div><select class="inp" data-pm="'+i+'" style="width:100%;">'
      +'<option value="">Mode utama ('+LBL[b]+")</option>"
      +["satu","kp","aset","dua","fashion"].map(function(k){return '<option value="'+k+'"'+(m===k?" selected":"")+">"+LBL[k]+"</option>";}).join("")+"</select>"+voiceHtml(i)+"</div></div>";
  }
  if(needLok&&active())h+='<div style="margin:6px 0 10px;"><div style="font-size:var(--fs-xs2);margin-bottom:4px;">Lokasi untuk produk Raw Asset</div><input class="inp" id="pb-pm-lok" maxlength="150" style="width:100%;margin-bottom:8px;" placeholder="Contoh: kamar tidur minimalis" value="'+esc(lokNow())+'"><div style="font-size:var(--fs-xs2);margin-bottom:4px;">Lighting untuk produk Raw Asset</div><input class="inp" id="pb-pm-lt" maxlength="150" style="width:100%;" placeholder="Contoh: cahaya jendela pagi yang lembut" value="'+esc(lightNow())+'"></div>';
  var needD=false;for(var k=0;k<c;k++){var e=PM.modes[k]||b;if(e!=="dua"&&e!=="fashion")needD=true;}
  if(needD&&active()){var dn=durNow();h+='<div style="margin:6px 0 10px;"><div style="font-size:var(--fs-xs2);margin-bottom:4px;">Durasi (selain Percakapan 2 Suara)</div><select class="inp" id="pb-pm-dur" style="width:100%;"><option value="">Pilih durasi</option><option value="16"'+(dn===16?" selected":"")+'>16 detik</option><option value="24"'+(dn===24?" selected":"")+'>24 detik</option></select></div>';}
  return h;
}
window.pbPmOpen=function(){
  var locked=!!PM.queue;
  if(!locked)PM.base="";
  var o=$("pb-pm-sheet");if(o)o.remove();
  o=document.createElement("div");o.id="pb-pm-sheet";
  o.style.cssText="position:fixed;inset:0;z-index:10050;background:rgba(4,4,6,.86);display:flex;align-items:flex-end;justify-content:center;";
  o.innerHTML='<div style="width:100%;max-width:520px;max-height:88vh;max-height:88dvh;overflow:auto;background:var(--surface2);border:1px solid var(--border-hi);border-radius:16px 16px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));">'
    +'<div style="font-weight:600;margin-bottom:4px;">Atur Mode Produk</div>'
    +'<div style="font-size:var(--fs-xs2);color:var(--muted);margin-bottom:12px;">Pilih mode untuk tiap produk. Fashion Editorial tidak pakai skrip.</div>'
    +(locked?'<div style="font-size:var(--fs-xs2);color:var(--muted);margin-bottom:10px;">Antrean grup masih berjalan, pengaturan mode dan jumlah produk dikunci sampai semua grup selesai.</div><button type="button" class="btn" id="pb-pm-cancel" style="margin-bottom:10px;">Batalkan Sisa Antrean</button>':'')
    +'<div id="pb-pm-list"></div><button type="button" class="btn" id="pb-pm-done" style="margin-top:6px;">Selesai</button></div>';
  document.body.appendChild(o);
  // PERBAIKAN (16 Nov 2026): A9, role dialog, scroll-lock body, focus trap
  o.setAttribute("role","dialog");o.setAttribute("aria-modal","true");
  if(window.__pbPmBodyOv==null)window.__pbPmBodyOv=document.body.style.overflow;document.body.style.overflow="hidden";
  var mo0=new MutationObserver(function(){if(!o.isConnected){if(!$("pb-pm-sheet")){document.body.style.overflow=window.__pbPmBodyOv;window.__pbPmBodyOv=null;}mo0.disconnect();}});mo0.observe(document.body,{childList:true});
  o.addEventListener("keydown",function(e){if(e.key!=="Tab")return;var f=[].filter.call(o.querySelectorAll("select,input,button"),function(x){return !x.disabled&&x.offsetParent!==null;});if(!f.length)return;var a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}});
  function paint(){var l=$("pb-pm-list");var fa=document.activeElement,fk=null;try{if(fa&&l.contains(fa))fk=(fa.dataset&&fa.dataset.pm!=null)?'select[data-pm="'+fa.dataset.pm+'"]':(fa.id?"#"+fa.id:null);}catch(e){}
    l.innerHTML=sheetBody();
    l.querySelectorAll("select[data-pm]").forEach(function(s){s.onchange=function(){PM.modes[s.dataset.pm]=s.value;paint();btnLabel();};});
    var li=$("pb-pm-lok");if(li)li.oninput=function(){PM.lok=li.value.trim();PM.lokWiz=vbv("mode3Lokasi")||"";};
    var lt=$("pb-pm-lt");if(lt)lt.oninput=function(){PM.light=lt.value.trim();PM.lightWiz=vbv("mode3Lighting")||"";};
    var du=$("pb-pm-dur");if(du)du.onchange=function(){PM.durWiz=(vbv("refMode")!=="dua")?(vbv("durasi")||0):0;var v=parseInt(du.value,10);if(v===16||v===24){PM.dur=v;PM.durSet=true;}else{PM.dur=0;PM.durSet=true;}};
    l.querySelectorAll("select[data-pm-pitch],select[data-pm-accent]").forEach(function(sv){
      var kind=sv.hasAttribute("data-pm-pitch")?"pitch":"accent",ix=sv.getAttribute("data-pm-"+kind);
      sv.onchange=function(){
        if(!PM.voice)PM.voice={};var o=PM.voice[ix]||(PM.voice[ix]={});
        var lab="";VOICE_PITCH.concat(VOICE_ACC).forEach(function(x){if(x[0]===sv.value)lab=x[1];});
        o[kind]=sv.value;o[kind+"Label"]=lab;
        if(!o.pitch&&!o.accent)delete PM.voice[ix];
        btnLabel();
      };
    });
    l.querySelectorAll("img[data-pm-foto]").forEach(function(im){im.src=fotoSrc(parseInt(im.getAttribute("data-pm-foto"),10));im.onclick=function(){var z=document.createElement("div");z.style.cssText="position:fixed;inset:0;z-index:10060;background:rgba(4,4,6,.92);display:flex;align-items:center;justify-content:center;padding:16px;cursor:zoom-out;";z.innerHTML='<img src="'+im.src+'" alt="" style="max-width:100%;max-height:100%;border-radius:12px;object-fit:contain;" />';var kh=function(ev){if(!z.isConnected){window.removeEventListener("keydown",kh,true);return;}if(ev.key==="Escape"){ev.stopImmediatePropagation();ev.preventDefault();z.remove();window.removeEventListener("keydown",kh,true);}};window.addEventListener("keydown",kh,true);z.onclick=function(ev){ev.stopPropagation();z.remove();window.removeEventListener("keydown",kh,true);};z.setAttribute("role","dialog");z.setAttribute("aria-label","Foto produk diperbesar");document.body.appendChild(z);};});
    var ag=$("pb-pm-all-go");if(ag)ag.onclick=function(){var v=$("pb-pm-all").value,n=cnt();for(var i=0;i<n;i++)PM.modes[i]=v;paint();btnLabel();};
    if(locked)l.querySelectorAll("select,input").forEach(function(x){x.disabled=true;});
    if(fk){try{var nf=l.querySelector(fk);if(nf)nf.focus();}catch(e){}}}
  paint();
  try{var d0=$("pb-pm-done");if(d0)d0.focus();}catch(e){}
  var cb=$("pb-pm-cancel");if(cb)cb.onclick=function(){if(PM.busy){toast("Tunggu proses yang sedang jalan selesai dulu","error");return;}var msg="Batalkan sisa antrean grup? Hasil grup yang sudah selesai tetap ada.";
    // PERBAIKAN (16 Nov 2026): A7, dialog konfirmasi (z-index 9998) tertutup sheet (10050) kalau sheet dibiarkan terbuka. Tutup sheet dulu, buka lagi bila user batal.
    o.remove();btnLabel();
    if(typeof showConfirm==="function")showConfirm(msg,function(){if(!PM.busy)cancelQueue();},function(){try{window.pbPmOpen();}catch(e){}},"Ya, Batalkan");
    else if(window.confirm(msg)&&!PM.busy)cancelQueue();else{try{window.pbPmOpen();}catch(e){}}};
  $("pb-pm-done").onclick=function(){o.remove();btnLabel();render();};
  o.addEventListener("click",function(e){if(e.target===o){o.remove();btnLabel();render();}});
  var escH=function(e){if(!o.isConnected){document.removeEventListener("keydown",escH);return;}if(e.key==="Escape"){document.removeEventListener("keydown",escH);o.remove();btnLabel();render();}};document.addEventListener("keydown",escH);
};
function snapshot(){
  var s={ref:vbv("refMode"),dur:vbv("durasi"),durDone:vbv("_durDone"),cm:vbv("camMove"),ch:vbv("camHook"),
    lok:vbv("mode3Lokasi"),lokL:vbv("mode3LokasiLabel"),lokOk:vbv("mode3LokOk"),
    lt:vbv("mode3Lighting"),ltL:vbv("mode3LightingLabel"),ltOk:vbv("mode3LightOk"),
    off:vbv("offGender"),skrip:window.VB_UI_SKRIP};
  try{var dc0=$("vdur"),da0=$("vadur");s.dc=dc0?{done:dc0.classList.contains("done"),txt:da0?da0.textContent:""}:null;}catch(e){s.dc=null;}
  s.fz={lok:lokNow(),lt:lightNow(),dur:durNow()};
  return s;
}
function mapCam(v,g,tbl){
  if(!v)return "";
  if(typeof _vbCamIsCustom==="function"&&_vbCamIsCustom(v))return v;
  var m=/^(?:satu|kp)_(.+)$/.exec(v);if(!m)return "";
  var id=g+"_"+m[1];
  return ((tbl&&tbl[g])||[]).some(function(o){return o[0]===id;})?id:"";
}
function remapCam(g){
  var s=PM.snap;if(!s||(g!=="satu"&&g!=="kp"))return;
  VB.camMove=mapCam(s.cm,g,typeof VB_CAM_OPTS!=="undefined"?VB_CAM_OPTS:null);
  VB.camHook=mapCam(s.ch,g,typeof VB_CAM_HOOK_OPTS!=="undefined"?VB_CAM_HOOK_OPTS:null);
  try{_vbCamSyncPend();_vbRenderCamChips();}catch(e){}
  try{var cc=$("vcam");if(cc&&cc.classList.contains("done")){var ca=$("vacam");if(ca)ca.textContent=_vbCamSummary();}}catch(e){}
}
function applyDur(g){
  var d=durNow();
  if(g!=="dua"&&d&&VB.durasi!==d){VB.durasi=d;VB._durDone=d;try{vbPickDurasi(d);}catch(e){}}
}
function restore(){
  var s=PM.snap;PM.snap=null;if(!s)return;
  PM.sw=true;
  try{
    if(vbv("refMode")!==s.ref)vbPickRefMode(s.ref);
    window.VB_UI_SKRIP=s.skrip;
    VB.mode3Lokasi=s.lok;VB.mode3LokasiLabel=s.lokL;VB.mode3LokOk=s.lokOk;
    VB.mode3Lighting=s.lt;VB.mode3LightingLabel=s.ltL;VB.mode3LightOk=s.ltOk;
    VB.camMove=s.cm;VB.camHook=s.ch;
    try{_vbCamSyncPend();_vbRenderCamChips();}catch(e){}
    try{var cc=$("vcam");if(cc&&cc.classList.contains("done")){var ca=$("vacam");if(ca)ca.textContent=_vbCamSummary();}}catch(e){}
    VB.offGender=s.off||"";if(s.ref==="dua"){try{vbSyncOffGender();}catch(e){}}
    VB.durasi=s.dur;VB._durDone=s.durDone;
    if(s.dur===16||s.dur===24){try{vbPickDurasi(s.dur);}catch(e){}}
    else{document.querySelectorAll("#vb-dur-chips .chip").forEach(function(c){c.classList.remove("sel");});}
    try{
      var dc=$("vdur");
      if(dc&&s.dc&&s.dc.done&&s.ref!=="dua"&&(s.dur===16||s.dur===24)){
        dc.classList.remove("pending","hidden");dc.classList.add("done");
        var da=$("vadur");if(da)da.textContent=s.dc.txt||(s.dur+" detik");
        if(dc.dataset)delete dc.dataset.duaHid;
      }
    }catch(e){}
    try{vbSyncStep6Mode3();}catch(e){}
  }catch(e){console.warn("pm restore",e);}
  PM.sw=false;PM.home="";PM.base="";
}
function cancelQueue(){
  if(PM.pending){
    var b0=PM.res.length;try{harvest(PM.pending);for(var q=b0;q<PM.res.length;q++)if(PM.res[q].cards.length<(((typeof _vb16==="function")&&_vb16())?2:3))PM.res[q].nama+=" (sebagian)";PM.res=PM.res.filter(function(r,ix){return ix<b0||r.cards.length;});}catch(e){}
    try{VB_BULK_LAST_CONTEXT=null;}catch(e){}
    try{_vbSyncBulkMainButton();}catch(e){}
    var eb=$("vb-bulk-error");if(eb){eb.classList.add("hidden");eb.innerHTML="";}
  }
  PM.queue=null;PM.pending="";PM.skip=null;PM.started=false;
  restore();if(PM.res.length)lockCards();render();toast("Sisa antrean dibatalkan");
}
function abortFresh(){
  PM.queue=null;PM.pending="";PM.skip=null;PM.res=[];PM.fash=[];
  restore();render();
}
function resetAll(){
  if(PM.busy)return;
  PM.modes={};PM.voice={};PM.lok="";PM.lokWiz="";PM.light="";PM.lightWiz="";PM.dur=0;PM.durSet=false;PM.durWiz=0;
  PM.res=[];PM.fash=[];PM.queue=null;PM.pending="";PM.base="";PM.home="";PM.skip=null;PM.snap=null;PM.started=false;PM.locked=false;
  RICH_OPEN=null;
  btnLabel();render();
}
function switchMode(g){
  var d=durNow(),lok=lokNow(),lt=lightNow();
  PM.sw=true;
  try{
    if(g==="aset")window.VB_UI_SKRIP="pakai";
    vbPickRefMode(g);
    if(g==="kp")applyKp(lok,lt);
    if(g!=="dua"&&d){VB.durasi=d;VB._durDone=d;try{vbPickDurasi(d);}catch(e){}}
    remapCam(g);
  }catch(e){console.warn("pm switch",e);}
  PM.sw=false;
}

// ═════ HASIL PER MODE PRODUK — TAMPILAN KARTU ASLI (sama seperti hasil 1 mode) ═════
// Tiap produk dibangun dengan _vbBuildEditableCard + ikon pensil asli. Karena tiap produk dibuat dengan mode berbeda,
// semua fungsi kartu dijalankan di "konteks" mode produk itu (VB & peta per-produk ditukar sementara, lalu dikembalikan).
var RICH_BASE=1000,RICH_N=0,RICH_OPEN=null;
var RS={items:[],ovr:{},ov:{},tp:{},lk:{},fc:{},bp:{}};
var RICH_BYGP={};
function cl(o){try{return JSON.parse(JSON.stringify(o));}catch(e){return o;}}
function richCapture(r,p,pinfo){
  try{
    var gp=RICH_BASE+(RICH_N++);r.gp=gp;
    r.vb=Object.assign({},VB);r.skrip=window.VB_UI_SKRIP;
    if(typeof VB_CHAR_OVR!=="undefined"&&VB_CHAR_OVR[p])RS.ovr[gp]=cl(VB_CHAR_OVR[p]);
    if(typeof VB_HOOK_OVERLAY!=="undefined"&&VB_HOOK_OVERLAY[p])RS.ov[gp]=VB_HOOK_OVERLAY[p];
    if(typeof VB_PRODUCT_FOTOCOUNT!=="undefined"&&VB_PRODUCT_FOTOCOUNT[p])RS.fc[gp]=VB_PRODUCT_FOTOCOUNT[p];
    for(var k=0;k<3;k++){
      if(typeof VB_CARD_TAMPIL!=="undefined"&&VB_CARD_TAMPIL[p*3+k])RS.tp[gp*3+k]=cl(VB_CARD_TAMPIL[p*3+k]);
      if(typeof VB_CARD_LOKASI!=="undefined"&&VB_CARD_LOKASI[p*3+k])RS.lk[gp*3+k]=cl(VB_CARD_LOKASI[p*3+k]);
    }
    RS.bp[gp]=Object.assign({},pinfo||{nama:r.nama});
    RICH_BYGP[gp]=r;
  }catch(e){console.warn("pm capture",e);}
  return r;
}
var rDepth=0,rSaved=null;
function rEnter(gp){
  if(rDepth++>0)return;
  var r=RICH_BYGP[gp];
  rSaved={vb:Object.assign({},VB),skrip:window.VB_UI_SKRIP,items:VB_BULK_ITEMS,ovr:VB_CHAR_OVR,ov:VB_HOOK_OVERLAY,tp:VB_CARD_TAMPIL,lk:VB_CARD_LOKASI,fc:VB_PRODUCT_FOTOCOUNT,bp:VB_BULK_PRODUCTS};
  Object.keys(VB).forEach(function(k){delete VB[k];});
  Object.assign(VB,r.vb);window.VB_UI_SKRIP=r.skrip;
  VB_BULK_ITEMS=RS.items;VB_CHAR_OVR=RS.ovr;VB_HOOK_OVERLAY=RS.ov;VB_CARD_TAMPIL=RS.tp;VB_CARD_LOKASI=RS.lk;VB_PRODUCT_FOTOCOUNT=RS.fc;VB_BULK_PRODUCTS=RS.bp;
}
function rExit(){
  if(--rDepth>0)return;
  var S=rSaved;rSaved=null;if(!S)return;
  Object.keys(VB).forEach(function(k){delete VB[k];});
  Object.assign(VB,S.vb);window.VB_UI_SKRIP=S.skrip;
  VB_BULK_ITEMS=S.items;VB_CHAR_OVR=S.ovr;VB_HOOK_OVERLAY=S.ov;VB_CARD_TAMPIL=S.tp;VB_CARD_LOKASI=S.lk;VB_PRODUCT_FOTOCOUNT=S.fc;VB_BULK_PRODUCTS=S.bp;
}
// byCard=true: argumen pertama = nomor kartu (3 per produk); false: nomor produk
var RICH_FNS=[["vbBulkUpdateJson",1],["vbToggleTampilPanel",1],["vbPickTampilProduk",1],["vbLokasiCardInput",1],["vbToggleLokasiPanel",1],["vbPickLokasiCard",1],["_vbFillTampilPanel",1],["_vbFillLokasiPanel",1],["pbSaveScriptFromCard",1],["_vbAccWordState",1],
  ["_vbAccRefresh",0],["vbToggleCharPanel",0],["vbCharPick",0],["vbCharCustom",0],["vbCharReset",0],["vbCharSet",0],["_vbCharRefresh",0],["_vbCharSync",0],["_vbCharBuildPanel",0],["_vbCharMakeBtn",0],["_vbCharBtnState",0,1],
  ["vbHookOverlayInput",0],["vbPickFotoCountProduct",0],["_vbBuildProductFotoCountRow",0],["_vbBuildHookOverlayInPanel",0],["_vbBuildEditableCard",1]];
function richWrapAll(){
  var sn=window._vbCharSnap;
  if(typeof sn==="function"&&!sn.__pmRich){var sw=function(){if(rDepth>0)return;return sn.apply(this,arguments);};sw.__pmRich=true;window._vbCharSnap=sw;}
  RICH_FNS.forEach(function(d){
    var nm0=d[0],card=d[1],ai=d[2]||0,f=window[nm0];
    if(typeof f!=="function"||f.__pmRich)return;
    var w=function(){
      var a=arguments[ai],gp=(typeof a==="number")?(card?Math.floor(a/3):a):-1;
      if(card&&nm0==="_vbBuildEditableCard"){}
      if(gp>=RICH_BASE&&RICH_BYGP[gp]){
        rEnter(gp);
        try{
          var rv=f.apply(this,arguments);
          if(nm0==="_vbCharBuildPanel"&&arguments[1]){ // judul lembar: pakai nomor produk asli, bukan nomor internal
            var rr=RICH_BYGP[gp],sm=arguments[1].querySelector(".vbc-sh small"),num=(rr&&rr.idx!=null)?rr.idx+1:null;
            if(sm&&num!=null)sm.innerHTML=sm.innerHTML.replace("Produk "+(gp+1),"Produk "+num+" · "+esc(LBL[rr.mode]||rr.mode));
          }
          return rv;
        }finally{rExit();}
      }
      return f.apply(this,arguments);
    };
    w.__pmRich=true;window[nm0]=w;
  });
}
function richSync(){
  // salin hasil ketikan/pensil dari DOM ke data, supaya tidak hilang saat digambar ulang
  PM.res.forEach(function(r){
    if(!r.gp||!r.built)return;
    r.cards.forEach(function(c,i){
      var idx=r.gp*3+(c.k!=null?c.k:i),ta=document.getElementById("vb-bulk-script-"+idx),pre=document.getElementById("vb-bulk-json-"+idx);
      if(ta&&ta.isConnected){c.script=ta.value;if(pre&&pre.textContent)c.json=pre.textContent;}
    });
  });
}
function richPmToggle(gp){
  var box=$("pb-pm-results");if(!box)return;
  var head=box.querySelector('.vb-acc[data-pmacc="'+gp+'"] .vb-acc-head');
  var before=head?head.getBoundingClientRect().top:0;
  RICH_OPEN=(RICH_OPEN===gp)?-1:gp;
  box.querySelectorAll(".vb-acc[data-pmacc]").forEach(function(g){
    var on=parseInt(g.getAttribute("data-pmacc"),10)===RICH_OPEN;
    g.classList.toggle("open",on);
    var b=g.querySelector(".vb-acc-chev");if(b)b.setAttribute("aria-expanded",on?"true":"false");
  });
  if(head){var d=head.getBoundingClientRect().top-before;if(Math.abs(d)>1){try{_vbAccScrollParent(head).scrollTop+=d;}catch(e){}}}
}
function richBuild(box){
  richWrapAll();
  var order=PM.res.map(function(r,i){return i;}).sort(function(a,b){var x=PM.res[a].idx,y=PM.res[b].idx;return (x==null?1e3+a:x)-(y==null?1e3+b:y);});
  var list=order.map(function(i){return PM.res[i];}).filter(function(r){return r.gp&&r.vb;});
  var wrap=document.createElement("div");
  wrap.id="pb-pm-rich";wrap.style.cssText="display:flex;flex-direction:column;gap:12px;margin-top:10px;";
  box.insertBefore(wrap,box.children[1]||null);
  if(RICH_OPEN==null||(RICH_OPEN!==-1&&!list.some(function(r){return r.gp===RICH_OPEN;})))RICH_OPEN=list.length?list[0].gp:-1;
  var total=list.length;
  list.forEach(function(r,pos){
    var gp=r.gp,roles=VB_3SCRIPT_ROLES;
    var group=document.createElement("div");
    group.style.cssText="border:1px solid var(--border-hi);border-radius:var(--radius-sm);overflow:hidden;background:var(--bg);";
    var head=document.createElement("div");
    head.style.cssText="background:var(--surface3);padding:9px 12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border-hi);";
    var fm=RS.bp[gp]||{};
    var foto=fm.fotoBase64?'<img class="vbfoto-img" src="data:'+(fm.fotoMime||"image/jpeg")+';base64,'+fm.fotoBase64+'" alt="Foto referensi produk" style="width:24px;height:24px;border-radius:var(--radius-2xs);object-fit:cover;border:1px solid var(--border-hi);flex-shrink:0;cursor:zoom-in;">':"";
    head.innerHTML='<span style="background:var(--text);color:var(--bg);width:20px;height:20px;border-radius:50%;font-size:var(--fs-xs);font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:\'Hanken Grotesk\',system-ui,sans-serif;">'+((r.idx==null?pos:r.idx)+1)+'</span>'
      +foto
      +'<span id="vb-prodname-'+gp+'" style="font-size:var(--fs-sm);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">'+esc(r.nama||("Produk "+(pos+1)))+' <small style="font-weight:400;color:var(--muted);font-size:var(--fs-xs2);">· '+esc(LBL[r.mode]||r.mode)+'</small></span>';
    group.appendChild(head);
    var body=document.createElement("div");
    body.style.cssText="padding:8px;display:flex;flex-direction:column;gap:6px;";
    wrap.appendChild(group);
    rEnter(gp);
    try{
      head.appendChild(_vbCharMakeBtn(gp,false));
      group.appendChild(_vbCharMakePanel(gp,VB_CHAR_PANEL_STYLE_GROUP));
      group.appendChild(body);
      if(VB.refMode==="kp")body.appendChild(_vbBuildProductFotoCountRow(gp));
      [0,1,2].forEach(function(k){
        var c=null;r.cards.forEach(function(x,i){if((x.k!=null?x.k:i)===k)c=x;});
        if(!c&&!(_vb16()&&k===1))return;
        var role=roles[k]||{label:"Script "+(k+1)},scr=c?c.script:"";
        var card=_vbBuildEditableCard(gp*3+k,role.label,scr,r.nama,false,false);
        body.appendChild(card);
        // _vbBuildEditableCard memotong skrip ke batas kata; kembalikan teks asli (mungkin sudah diedit) lalu bangun ulang JSON
        var ta=document.getElementById("vb-bulk-script-"+(gp*3+k));
        if(ta&&c&&ta.value!==scr)ta.value=scr;
        if(ta)vbBulkUpdateJson(gp*3+k);
        var tw=document.getElementById("vb-ta-wrap-"+(gp*3+k));if(tw)tw.classList.remove("vb-ta-loading"); // slot kosong (Story 16 dtk) jangan dianggap "masih diketik"
      });
    }finally{rExit();}
    r.built=true;
    // accordion + gaya kartu asli (sama dengan _vbAccSetup, tapi toggle khusus area ini)
    try{_vbRscEnhance(group,head,gp,total);}catch(e){}
    group.classList.add("vb-acc");group.setAttribute("data-pmacc",String(gp));
    head.classList.add("vb-acc-head");
    Array.prototype.forEach.call(head.children,function(el){if(el.tagName==="BUTTON")el.classList.add("vb-acc-tool");});
    var dots=document.createElement("div");dots.className="vb-acc-dots";dots.id="vb-acc-dots-"+gp;dots.setAttribute("role","img");dots.innerHTML="<i></i><i></i><i></i>";
    head.appendChild(dots);
    var chev=document.createElement("button");chev.type="button";chev.className="vb-acc-chev";chev.setAttribute("aria-label","Buka atau tutup produk "+(pos+1));
    chev.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';
    chev.onclick=function(e){e.stopPropagation();richPmToggle(gp);};
    head.appendChild(chev);
    head.addEventListener("click",function(e){if(e.target.closest("button,input,textarea,select,a,img,label"))return;richPmToggle(gp);});
    for(var k2=0;k2<3;k2++){var cd=document.getElementById("vb-card-"+(gp*3+k2));if(cd)cd.style.setProperty("--vb-role",VB_ACC_ROLE_COLORS[k2]);}
    var on=(RICH_OPEN===gp);group.classList.toggle("open",on);chev.setAttribute("aria-expanded",on?"true":"false");
    rEnter(gp);try{_vbAccRefresh(gp);}finally{rExit();}
  });
}
var KL=["Hook","Story","CTA"];
function waitStable(){
  return new Promise(function(res){
    var last=-1,same=0,t0=Date.now();
    (function tick(){
      var len=0;document.querySelectorAll('[id^="vb-bulk-script-"]').forEach(function(e){var mm=/^vb-bulk-script-(\d+)$/.exec(e.id);if(mm&&+mm[1]>=RICH_BASE*3)return;len+=(e.value||e.textContent||"").length;});
      if(len>0&&len===last)same++;else same=0;
      last=len;
      var el=Date.now()-t0;
      if(same>=3||(len===0&&el>6000)||el>30000)return res();
      setTimeout(tick,300);
    })();
  });
}
function harvest(g){
  var is16=(typeof _vb16==="function")&&_vb16(); // PERBAIKAN (16 Nov 2026): A3, 16 dtk/dua suara: slot Story kosong dilewati
  var P=(typeof VB_BULK_PRODUCTS!=="undefined"&&VB_BULK_PRODUCTS)||[];
  var gi=[],used={};for(var q=0;q<cnt();q++){if(eff(q)===g)gi.push(q);}
  for(var p=0;p<P.length;p++){
    var cards=[];
    for(var k=0;k<3;k++){
      if(is16&&k===1)continue;
      var s=$("vb-bulk-script-"+(p*3+k)),j=$("vb-bulk-json-"+(p*3+k));
      if(!s)continue;
      var st=(s.value||s.textContent||"").trim(),js2=j?(j.value||j.textContent||"").trim():"";
      if(!st)continue;
      cards.push({label:(is16&&k===0)?"Hook + Story":KL[k],script:st,json:js2,k:k});
    }
    var ix=null;
    for(var z=0;z<gi.length;z++){if(!used[gi[z]]&&nm(gi[z])===P[p].nama){ix=gi[z];break;}}
    if(ix==null&&gi[p]!=null&&!used[gi[p]])ix=gi[p];
    if(ix!=null)used[ix]=1;
    PM.res.push(richCapture({mode:g,idx:ix,nama:P[p].nama,cards:cards},p,P[p]));
  }
}
function copy(t){
  try{navigator.clipboard.writeText(t).then(function(){toast("Tersalin");},function(){fb(t);});}catch(e){fb(t);}
  function fb(x){var a=document.createElement("textarea");a.value=x;document.body.appendChild(a);a.select();try{document.execCommand("copy");toast("Tersalin");}catch(e){}a.remove();}
}
// Skrip diedit -> ganti teks skrip lama di dalam JSON/prompt (null kalau teks lama tidak ketemu)
function syncJson(j,o,n){
  if(!j||!o)return j;if(o===n)return j;
  var q=function(x){return String(x).replace(/"/g,"'");},e=function(x){return JSON.stringify(String(x)).slice(1,-1);};
  var a=[[q(o),q(n)],[e(o),e(n)]];
  for(var z=0;z<a.length;z++){var k=j.indexOf(a[z][0]);if(k>-1)return j.slice(0,k)+a[z][1]+j.slice(k+a[z][0].length);}
  return null;
}
function render(){
  try{richSync();}catch(e){}
  btnLabel();
  try{if(typeof vbInfoSum==="function")vbInfoSum();}catch(e){}
  var box=$("pb-pm-results");if(!box)return;
  // Multi-mode (>1 grup mode) = hasil tiap produk ditampilkan terpisah & bisa diedit di sini; kartu hidup (cuma grup terakhir) disembunyikan setelah antrean selesai
  var multi=(function(){var m={},k=0;PM.res.forEach(function(r){if(!m[r.mode]){m[r.mode]=1;k++;}});return k>1;})();
  var live=$("vb-multi-output");
  if(live){
    if(multi&&!PM.queue){live.dataset.pmHid="1";live.style.display="none";}
    else if(live.dataset.pmHid&&!PM.queue){delete live.dataset.pmHid;live.style.display=live.children.length?"flex":"none";}
  }
  if(!PM.res.length&&!PM.fash.length&&!PM.queue){box.innerHTML="";return;}
  var h='<div style="margin-top:14px;font-weight:600;">Hasil per Mode Produk</div>';
  if(multi){
    // Tampilan kartu asli (sama seperti hasil 1 mode): dibangun setelah innerHTML di bawah
  }else PM.res.forEach(function(r,i){
    h+='<div class="out-card" style="margin-top:8px;padding:10px 12px;"><div style="font-size:var(--fs-xs2);margin-bottom:6px;">'+esc(r.nama)+' · <span style="color:var(--muted);">'+LBL[r.mode]+'</span></div>'
      +'<button type="button" class="chip" data-pmc="a'+i+'">Salin Skrip</button> '
      +r.cards.map(function(c,k){return c.json?'<button type="button" class="chip" data-pmc="j'+i+'_'+k+'">JSON '+c.label+'</button> ':"";}).join("")+"</div>";
  });
  if(PM.fash.length)h+='<div class="out-card" style="margin-top:8px;padding:10px 12px;"><div style="font-size:var(--fs-xs2);margin-bottom:6px;">Fashion Editorial (tanpa skrip): '+PM.fash.map(esc).join(", ")+'</div><button type="button" class="chip" data-pmc="f">Buka Fashion Editorial</button></div>';
  if(PM.queue&&PM.queue.length){var g=PM.queue[0],c=0,n=cnt();for(var i=0;i<n;i++){if(eff(i)===g)c++;}
    h+='<div style="margin-top:10px;font-size:var(--fs-xs2);color:var(--muted);">Berikutnya: '+LBL[g]+" ("+c+" produk). Jalan otomatis. Kalau berhenti, tekan Generate Prompt lagi.</div>";}
  if(PM.locked&&!multi)h+='<div style="margin-top:10px;font-size:var(--fs-xs2);color:var(--muted);">Hasil multi-mode: salin dari "Hasil per Mode Produk" (tiap grup sudah memakai mode yang benar). Kartu di atas dikunci.</div>';
  box.innerHTML=h;
  if(multi){try{richBuild(box);}catch(e){console.warn("pm rich",e);}}
  box.querySelectorAll("[data-pmc]").forEach(function(b){b.onclick=function(){
    var k=b.dataset.pmc;if(k==="f"){try{vbPickRefMode("fashion");}catch(e){}return;}
    var m=/^([ajs])(\d+)(?:_(\d+))?$/.exec(k);if(!m)return;
    var r=PM.res[+m[2]];if(!r)return;
    if(m[1]==="a")copy(r.cards.filter(function(c){return c.script;}).map(function(c){return c.label+": "+c.script;}).join("\n\n"));
    else if(r.cards[+m[3]]){var cd=r.cards[+m[3]];copy(m[1]==="s"?cd.script:cd.json);}};});
}
function incomplete(){var c=(typeof VB_BULK_LAST_CONTEXT!=="undefined")?VB_BULK_LAST_CONTEXT:null;return !!(c&&c.allResults&&c.produkList&&c.allResults.length<c.produkList.length);}
async function finish(g){
  if(!(PM.queue&&PM.queue.length&&PM.queue[0]===g))return;
  await waitStable();
  if(!(PM.queue&&PM.queue.length&&PM.queue[0]===g))return;
  harvest(g);PM.queue.shift();PM.pending="";
  if(!PM.queue.length){var s0=PM.snap,nl=!s0||g!==s0.ref||(g!=="dua"&&s0.fz&&s0.fz.dur&&s0.fz.dur!==s0.dur)||(g==="kp"&&s0.fz&&(s0.fz.lok!==s0.lok||s0.fz.lt!==s0.lt));PM.queue=null;restore();if(nl)lockCards();
    // PERBAIKAN (16 Nov 2026): A8, ringkasan total semua grup (bukan cuma grup terakhir)
    try{var np=PM.res.length,ns=0;PM.res.forEach(function(r){r.cards.forEach(function(c){if(c.script)ns++;});});var a5=$("va5");if(a5)a5.textContent=ns+" script bulk";toast("Semua grup selesai: "+np+" produk, "+ns+" script + JSON berhasil dibuat!","success");}catch(e){toast("Semua grup mode selesai");}}
  else toast("Grup "+LBL[g]+" selesai. Lanjut: "+LBL[PM.queue[0]]);
  render();
}
// PERBAIKAN (16 Nov 2026): setelah satu grup mode selesai, doneCard('v5') menyembunyikan SELURUH kartu form (tombol Generate Prompt + catatan "Berikutnya" ikut hilang),
// jadi grup berikutnya tidak pernah bisa ditekan dan hanya grup pertama yang keluar. Sekarang grup berikutnya dijalankan otomatis.
function waitIdle(){
  return new Promise(function(res){
    var t0=Date.now();
    (function tick(){
      var b=$("vb-bulk-btn");
      if(!b||!b.classList.contains("btn-loading")||Date.now()-t0>15000)return res();
      setTimeout(tick,250);
    })();
  });
}
async function goNext(){
  if(!(PM.queue&&PM.queue.length)||PM.pending||PM.busy)return;
  await waitIdle();
  if(!(PM.queue&&PM.queue.length)||PM.pending||PM.busy)return;
  try{var c5=$("v5");if(c5){c5.classList.remove("done","hidden");c5.classList.add("pending");}}catch(e){}
  await window.vbGenerateBulkAI();
}
// PERBAIKAN (16 Nov 2026): A4, validasi wizard SEBELUM snapshot/switchMode (cermin cek di vbGenerateBulkAI)
function preflight(){
  if(typeof _vbGuardGenerating==="function"&&_vbGuardGenerating()){toast("Tunggu proses sebelumnya selesai dulu.","error");return false;}
  if(!VB.gender||!VB.age||!VB.pitch||!VB.accent){toast("Lengkapi dulu step Jenis Kelamin, Usia, Gaya Bicara, dan Aksen ya","error");return false;}
  var ta=(($("vb-bulk-target")||{}).value||"").trim();
  var preset=(typeof VB_TA_PRESET!=="undefined")&&VB_TA_PRESET["vb-bulk-target"];
  var n=cnt();
  if(!ta&&!preset){
    // boleh kosong kalau SETIAP produk (yang tidak di-skip) punya target audience sendiri
    var allTa=n>0,_chk=0;
    for(var _t=0;_t<n;_t++){
      if(window.pbPmSkip&&window.pbPmSkip(_t))continue;
      if(window.pbPmIsFashion&&window.pbPmIsFashion(_t))continue; // Fashion Editorial tidak membuat skrip, audience tidak wajib
      var _te=$("vb-bulk-ta-"+_t);
      _chk++;
      if(!_te||!_te.value.trim()){allTa=false;break;}
    }
    if(_chk===0)allTa=false;
    if(!allTa){toast("Target Audience wajib diisi dulu (di tab Penonton, atau isi khusus di tiap produk)","error");try{vbInfoTab("penonton");}catch(e){}return false;}
  }if(n<1||n>30){toast("Tentukan dulu jumlah produknya (1-30)","error");return false;}
  return true;
}
// PERBAIKAN (16 Nov 2026): A1 opsi D, kartu hidup milik grup terakhir dikunci supaya JSON tidak dibangun ulang dengan mode yang salah
function lockCards(){
  PM.locked=true;
  try{var bx=$("vb-multi-output");if(!bx)return;
    bx.querySelectorAll('textarea[id^="vb-bulk-script-"]').forEach(function(t){t.readOnly=true;});
    bx.querySelectorAll('[id^="vb-card-"] button').forEach(function(b){if(/revisi|tampil|lokasi|foto|ulang/i.test(b.textContent||""))b.disabled=true;});
    bx.querySelectorAll("button").forEach(function(b){var t=(b.textContent||"").trim();if(t.length<=24&&/^(revisi|generate ulang|ulang|jumlah foto)/i.test(t))b.disabled=true;});
  }catch(e){}
}
function wrap(){
  var og=window.vbGenerateBulkAI,or=window._vbRunBulkGenerate,rs=window.vbBulkResumeAI,pk=window.vbPickRefMode;
  if(typeof og!=="function"||typeof or!=="function")return;
  if(typeof pk==="function")window.vbPickRefMode=function(){if(!PM.sw&&PM.queue){toast("Mode dikunci sampai antrean grup selesai","error");return;}if(!PM.sw){PM.home="";if(!PM.queue)PM.base="";}var r=pk.apply(this,arguments);try{btnLabel();}catch(e){}return r;};
  window._vbRunBulkGenerate=function(){PM.started=true;if(!PM.queue&&PM.locked){PM.locked=false;try{render();}catch(e){}}
    // Generate normal (bukan antrean multi-mode) menimpa hasil lama → kartu "Hasil per Mode Produk" sisa run sebelumnya ikut dibersihkan.
    if(!PM.queue&&(PM.res.length||PM.fash.length)){PM.res=[];PM.fash=[];render();}
    return or.apply(this,arguments);};
  if(typeof rs==="function")window.vbBulkResumeAI=async function(){
    if(PM.busy){toast("Tunggu proses yang sedang jalan selesai dulu","error");return;}
    if(PM.pending&&typeof VB!=="undefined"){if(VB.refMode!==PM.pending)switchMode(PM.pending);else{if(PM.pending==="kp")applyKp(lokNow(),lightNow());applyDur(PM.pending);remapCam(PM.pending);}}
    var r=await rs.apply(this,arguments);
    if(PM.pending&&PM.queue&&PM.queue.length&&!incomplete()){PM.busy=true;try{await finish(PM.pending);}finally{PM.busy=false;}await goNext();}
    return r;
  };
  var rn=window.vbResetNow;if(typeof rn==="function")window.vbResetNow=function(){if(!PM.busy){PM.queue=null;PM.pending="";PM.skip=null;PM.snap=null;}PM.sw=true;var r;try{r=rn.apply(this,arguments);}finally{PM.sw=false;}try{resetAll();}catch(e){}return r;};
  // PERBAIKAN (16 Nov 2026): A2 (minimal), Simpan Halaman hanya menyimpan grup terakhir
  var sv=window.pbSaveCurrentPage,svOk=false;
  if(typeof sv==="function")window.pbSaveCurrentPage=function(t,b){
    var self=this;
    if(!svOk&&(function(){var m={},k=0;PM.res.forEach(function(r){if(!m[r.mode]){m[r.mode]=1;k++;}});return k>1;})()&&typeof showConfirm==="function"){
      showConfirm("Hanya hasil grup terakhir yang ikut tersimpan. Hasil grup lain ada di \"Hasil per Mode Produk\" dan akan hilang. Salin dulu?",function(){svOk=true;try{sv.call(self,t,b);}finally{svOk=false;}},null,"Tetap Simpan");
      return;
    }
    return sv.call(self,t,b);
  };
  var po=window.pbOpenSavedPage;if(typeof po==="function")window.pbOpenSavedPage=function(){try{resetAll();}catch(e){}return po.apply(this,arguments);};
  window.vbGenerateBulkAI=async function(){
    var self=this,args=arguments,fresh=false,failed=false;
    if(PM.busy){toast("Tunggu hasil grup sebelumnya selesai ditulis","error");return;}
    if(!PM.queue&&!active())return og.apply(self,args);
    if(!PM.queue){
      PM.base=baseMode();
      var n=cnt(),seen={},fash=[];
      for(var i=0;i<n;i++){var m=eff(i);if(m==="fashion")fash.push(nm(i));else seen[m]=1;}
      var qq=ORDER.filter(function(k){return seen[k];});
      if(!qq.length){PM.base="";PM.res=[];PM.fash=fash;render();toast("Semua produk memakai Fashion Editorial, tidak ada skrip yang digenerate");return;}
      if(seen.kp&&(!lokNow()||!lightNow())){PM.base="";toast("Isi Lokasi dan Lighting untuk produk Raw Asset di Atur Mode Produk","error");return;}
      if(qq.some(function(k){return k!=="dua";})&&!durNow()){PM.base="";toast("Pilih durasi 16 atau 24 detik di Atur Mode Produk","error");return;}
      var tot=0,bad=-1;
      for(var j=0;j<n;j++){if(eff(j)!=="fashion"){tot++;var ne=$("vb-bulk-nama-"+j);if(bad<0&&!(ne&&ne.value.trim()))bad=j;}}
      if(bad>-1){PM.base="";toast("Nama Produk "+(bad+1)+" belum diisi","error");try{vbInfoTab("produk");}catch(e){}var nb=$("vb-bulk-nama-"+bad);if(nb)nb.focus();return;}
      if(typeof dlCheckBeforeCall==="function"){var qc=dlCheckBeforeCall(tot);if(!qc.ok){PM.base="";toast(qc.message,"error");return;}}
      // PERBAIKAN (16 Nov 2026): A4, preflight setelah cek khusus PM (semua-Fashion tidak butuh gender/target), sebelum snapshot
      if(!preflight()){PM.base="";return;}
      PM.snap=snapshot();fresh=true;PM.locked=false;
      PM.home=PM.base;PM.res=[];PM.fash=fash;PM.pending="";PM.queue=qq;PM.total=qq.length;btnLabel();render();
    }
    var g=PM.queue[0];
    if(typeof VB!=="undefined"&&VB.refMode!==g)switchMode(g);
    else{if(g==="kp")applyKp(lokNow(),lightNow());applyDur(g);remapCam(g);}
    PM.skip=function(i){return eff(i)!==g;};PM.started=false;
    PM.busy=true;
    try{
      try{await og.apply(self,args);}finally{PM.skip=null;}
      if(!PM.started){if(fresh)abortFresh();return;}
      if(incomplete()){PM.pending=g;toast("Grup "+LBL[g]+" belum tuntas. Tekan Lanjutkan dulu.","error");return;}
      await finish(g);
    }catch(e){
      console.error("pm generate",e);failed=true;
      // PERBAIKAN (16 Nov 2026): A6, selalu beri pesan; "Lanjutkan" hanya disebut kalau memang tersedia (konteks belum tuntas)
      if(!PM.started){if(fresh)abortFresh();toast("Grup gagal dimulai. Tekan Generate Prompt lagi.","error");}
      else if(incomplete()){PM.pending=g;toast("Grup "+LBL[g]+" bermasalah. Tekan Lanjutkan.","error");}
      else toast("Grup "+LBL[g]+" bermasalah. Tekan Generate Prompt lagi.","error");
    }finally{PM.busy=false;}
    if(failed)return;
    await goNext();
  };
}
wrap();btnLabel();
(function(){
  var ci=$("vb-bulk-count");
  if(ci)["input","change","blur"].forEach(function(ev){ci.addEventListener(ev,function(){setTimeout(btnLabel,0);});});
  var rw=$("vb-bulk-rows");
  if(rw&&window.MutationObserver)new MutationObserver(function(){btnLabel();}).observe(rw,{childList:true});
})();
})();
