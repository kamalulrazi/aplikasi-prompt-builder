/* Jembatan Album (Outfit Studio) -> Google Drive akun Gmail yang login (folder tersembunyi appDataFolder, scope drive.appdata).
   Antarmuka: osCloud.uid/ready/list/put/get/del/connect (+why/needsAuth/status), jadi outfit-studio.html TIDAK diubah.
   Foto dihitung ke kuota Google Drive 15 GB milik user sendiri (bukan kuota kamu), tidak tampil di Drive biasa.

   ===== SETUP SEKALI (wajib, kalau tidak muncul "OS_DRIVE_CLIENT_ID belum diisi") =====
   1) Isi CLIENT_ID_MANUAL di bawah dengan OAuth Client ID tipe "Web application" (…apps.googleusercontent.com).
      Pakai SAJA Client ID yang sama dengan Login Google aplikasi (GOOGLE_CLIENT_ID di akun-login-google.js).
      File ini juga mencoba mendeteksinya sendiri (window.OS_DRIVE_CLIENT_ID, window.GOOGLE_CLIENT_ID, #g_id_onload), tapi isi manual paling pasti.
   2) console.cloud.google.com, pilih project yang sama dengan Client ID itu:
      - APIs & Services > Library > cari "Google Drive API" > Enable
      - APIs & Services > OAuth consent screen (Data Access / Scopes) > Add scope: .../auth/drive.appdata
        (scope ini TIDAK sensitif, jadi tidak perlu verifikasi Google)
      - APIs & Services > Credentials > klik Client ID tadi > "Authorized JavaScript origins" harus memuat alamat aplikasimu
        persis (mis. https://namakamu.com, dan alamat lain yang dipakai buka app, tanpa garis miring di akhir)
   Setelah itu, di tiap perangkat user menekan "Hubungkan Gmail / Drive" sekali (WAJIB pilih Gmail yang sama dengan akun login).
   Izin Google berlaku ±1 jam; selama Outfit Studio terbuka diperbarui pada ketukan berikutnya. Popup Google tidak pernah muncul di fitur lain.
   Di aplikasi Android (plugin DriveAuth) diperbarui diam-diam tanpa ketukan.
   JANGAN mengganti Client ID setelah dipakai: data tersembunyi (appDataFolder) terikat ke Client ID, brankas lama jadi tak terlihat
   dan sinkron akan menolak dengan pesan "Akun Google yang dipilih berbeda". */
(function(){
const CLIENT_ID_MANUAL='';   /* <<< ISI DI SINI: 'xxxxxxxx.apps.googleusercontent.com' */

/* dibaca LAZY (saat dipakai), karena script login memuat variabelnya setelah file ini */
const cid=()=>{
  const c=[CLIENT_ID_MANUAL,window.OS_DRIVE_CLIENT_ID,window.GOOGLE_CLIENT_ID,window.PB_GOOGLE_CLIENT_ID];
  try{const g=document.getElementById('g_id_onload');if(g&&g.dataset)c.push(g.dataset.client_id)}catch(e){}
  return String(c.find(x=>typeof x==='string'&&/\.apps\.googleusercontent\.com$/.test(x.trim()))||'').trim()};
const SCOPE='https://www.googleapis.com/auth/drive.appdata',
  API='https://www.googleapis.com/drive/v3/files',UP='https://www.googleapis.com/upload/drive/v3/files',
  MARK='__migrated_v1',TK='os_drive_tok_v1',MAXB=5e6;
const fb=()=>window.firebase,us=()=>{try{return fb().auth().currentUser}catch(e){return null}};
const uidv=()=>String(window.pbCloudUid||(us()&&us().uid)||'');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let tok='',exp=0,tokU='',pend=null,idMap=null,dupMap=null,why='',lastFail=0,lastWait=0;
const emsg=e=>String(e&&e.message||e||'').slice(0,100);

/* ---------- token Google (GIS) ---------- */
/* token disimpan BERSAMA uid pemiliknya: kalau akun login diganti di sesi yang sama, token akun lama dibuang (jangan menulis ke Drive orang lain) */
try{const j=JSON.parse(sessionStorage.getItem(TK)||'null');if(j&&j.exp>Date.now()+60000&&j.u){tok=j.t;exp=j.exp;tokU=j.u}   /* uid belum tentu sudah ada saat file ini dimuat: dicocokkan nanti di hasTok */}catch(e){}
const newTok=t=>{if(t!==tok){marked=false;idMap=null;dupMap=null}tok=t};   /* token baru bisa berasal dari akun Google lain: validasi ulang brankas Drive */
const dropTok=()=>{tok='';exp=0;tokU='';idMap=null;marked=false;try{sessionStorage.removeItem(TK)}catch(e){}};
const hasTok=()=>{const u=uidv();if(tok&&tokU&&u&&tokU!==u)dropTok();return !!tok&&Date.now()<exp-60000};
function loadGis(){return new Promise((ok,no)=>{
  if(window.google&&google.accounts&&google.accounts.oauth2)return ok();
  const poll=()=>{let n=0;const t=setInterval(()=>{if(window.google&&google.accounts&&google.accounts.oauth2){clearInterval(t);ok()}else if(++n>100){clearInterval(t);no(new Error('GIS gagal dimuat'))}},100)};
  if(document.querySelector('script[src*="accounts.google.com/gsi/client"]'))return poll();   /* index.html sudah memuatnya */
  const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;
  s.onload=poll;s.onerror=()=>no(new Error('GIS gagal dimuat'));document.head.appendChild(s)})}
/* Aplikasi Android (Capacitor): token diminta ke plugin native DriveAuth (diam-diam, tanpa popup). */
const NP=()=>{try{const C=window.Capacitor;return C&&C.isNativePlatform&&C.isNativePlatform()?(C.registerPlugin?C.registerPlugin('DriveAuth'):C.Plugins.DriveAuth):null}catch(e){return null}};
/* interactive=true HARUS dipanggil dari ketukan/klik pengguna (kalau tidak, popup diblokir browser) */
function getToken(interactive,force){
  if(hasTok()&&!force)return Promise.resolve(tok);
  const np=NP();
  if(np){if(pend)return pend;
    pend=np.getToken().then(r=>{if(!r||!r.accessToken)throw new Error('token kosong');newTok(r.accessToken);exp=Date.now()+3000*1000;tokU=uidv();return tok}).finally(()=>{pend=null});
    return pend}
  if(!interactive)return Promise.reject(new Error('butuh izin Drive'));
  if(pend)return pend;
  const CID=cid();if(!CID)return Promise.reject(new Error('OS_DRIVE_CLIENT_ID belum diisi'));
  pend=loadGis().then(()=>new Promise((ok,no)=>{
    const u=us(),c=google.accounts.oauth2.initTokenClient({client_id:CID,scope:SCOPE,login_hint:(u&&u.email)||'',
      callback:r=>{if(r.error)return no(new Error(r.error_description||r.error));
        if(!google.accounts.oauth2.hasGrantedAllScopes(r,SCOPE))return no(new Error('izin Drive tidak dicentang, ulangi dan centang'));
        newTok(r.access_token);exp=Date.now()+(+r.expires_in||3600)*1000;tokU=uidv();
        try{sessionStorage.setItem(TK,JSON.stringify({t:tok,exp,u:tokU}))}catch(e){}ok(tok)},
      error_callback:e=>no(new Error((e&&e.type)==='popup_failed_to_open'?'popup diblokir browser, izinkan popup':((e&&e.type)||'popup')))});
    c.requestAccessToken({prompt:''})})).finally(()=>{pend=null});
  return pend}

/* ---------- panggilan API (retry 401, 429/5xx/403) ---------- */
async function api(url,opt,n){n=n||0;
  const r=await fetch(url,{...opt,headers:{...(opt&&opt.headers),Authorization:'Bearer '+await getToken(false)}});
  if(r.status===401&&n<1){dropTok();return api(url,opt,n+1)}
  let r403='';if(r.status===403){try{const j=await r.clone().json();r403=String(j&&j.error&&j.error.errors&&j.error.errors[0]&&j.error.errors[0].reason||'')}catch(e){}}
  /* 403 hanya diulang kalau memang kena batas laju; 403 izin/API mati tidak ada gunanya diulang */
  if((r.status===429||r.status>=500||(r.status===403&&/rateLimit|backendError/i.test(r403)))&&n<3){await wait(800*(n+1));return api(url,opt,n+1)}
  if(!r.ok&&r.status!==404){let rs='';try{const j=await r.clone().json();rs=String(j&&j.error&&((j.error.errors&&j.error.errors[0]&&j.error.errors[0].reason)||j.error.status)||'')}catch(e){}
    if(/accessNotConfigured|SERVICE_DISABLED/i.test(rs))throw new Error('Google Drive API belum di-Enable di Google Cloud (Drive '+r.status+')');
    if(r.status===403&&/insufficient|PERMISSION_DENIED/i.test(rs)){dropTok();throw new Error('izin Drive tidak cukup, ketuk Hubungkan lagi')}
    if(r.status===403&&/storageQuotaExceeded/i.test(rs))throw new Error('penyimpanan Google Drive penuh');
    throw new Error('Drive '+r.status+(rs?' '+rs:''))}
  return r}
const q=s=>encodeURIComponent(s);
const parse=d=>{try{return JSON.parse(d||'{}')}catch(e){return{}}};

async function listAll(){const out=[];let pt='';
  do{const r=await api(API+'?spaces=appDataFolder&pageSize=1000&q='+q('trashed=false')+'&fields='+q('nextPageToken,files(id,name,description)')+(pt?'&pageToken='+q(pt):''));
    const j=await r.json();out.push(...(j.files||[]));pt=j.nextPageToken||''}while(pt);
  /* kalau ada nama ganda (sisa upload bersamaan), pakai satu saja supaya tidak membingungkan */
  idMap=new Map();dupMap=new Map();const seen=new Set(),uniq=[];
  out.forEach(f=>{if(!idMap.has(f.name))idMap.set(f.name,f.id);if(!dupMap.has(f.name))dupMap.set(f.name,[]);dupMap.get(f.name).push(f.id);if(!seen.has(f.name)){seen.add(f.name);uniq.push(f)}});return uniq}
async function fileId(id){if(!idMap)await listAll();return idMap.get(id)||''}

async function upload(id,meta,blob,retry){
  if(blob&&blob.size>MAXB)throw new Error('foto terlalu besar ('+Math.round(blob.size/1e6)+' MB)');
  const fid=await fileId(id),bd='osb'+Math.random().toString(36).slice(2),
    md=fid?{description:JSON.stringify(meta)}:{name:id,parents:['appDataFolder'],description:JSON.stringify(meta)},
    body=new Blob(['--'+bd+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(md)+'\r\n--'+bd+'\r\nContent-Type: '+((blob&&blob.type)||'application/octet-stream')+'\r\n\r\n',blob,'\r\n--'+bd+'--']);
  const r=await api((fid?UP+'/'+fid:UP)+'?uploadType=multipart&fields=id',{method:fid?'PATCH':'POST',headers:{'Content-Type':'multipart/related; boundary='+bd},body});
  if(r.status===404){/* id lama sudah tidak ada di Drive: buang dari cache lalu buat baru */
    if(idMap)idMap.delete(id);if(retry)throw new Error('Drive 404');return upload(id,meta,blob,1)}
  const j=await r.json();if(!j.id)throw new Error('Drive tidak mengembalikan id');idMap&&idMap.set(id,j.id)}

/* tanda "sudah siap" di Drive (outfit-studio.html tidak menampilkannya karena list() menyaringnya) */
let marked=false,markJob=null,mismatch=false;
const MSG_MISMATCH='Akun Google yang dipilih berbeda dari yang dipakai sebelumnya. Ketuk Hubungkan lalu pilih Gmail yang sama.';
const VK='os_drive_vault_v1';
const vget=()=>{try{return JSON.parse(localStorage.getItem(VK)||'{}')[uidv()]||''}catch(e){return''}};
const vset=v=>{try{const o=JSON.parse(localStorage.getItem(VK)||'{}');o[uidv()]=v;localStorage.setItem(VK,JSON.stringify(o))}catch(e){}};
/* "Brankas" Drive ini punya ID acak yang ditulis di file penanda. Perangkat mengingat ID brankas yang pernah dipakainya.
   Kalau yang tersambung sekarang brankas LAIN (akun Gmail lain di popup, Client ID diganti, data tersembunyi app dihapus), sinkron DITOLAK.
   Tanpa ini, outfit-studio.html menganggap album lokal "sudah dihapus dari awan" lalu menghapusnya di perangkat. */
const ensureMark=()=>marked?Promise.resolve():(markJob||(markJob=(async()=>{const L=await listAll(),mk=L.find(f=>f.name===MARK),local=vget();
  if(mk){const v=parse(mk.description).v||'';
    if(v&&local&&v!==local){mismatch=true;dropTok();throw new Error(MSG_MISMATCH)}
    if(v)vset(v)}
  else{if(local){mismatch=true;dropTok();throw new Error(MSG_MISMATCH)}
    const v=Date.now().toString(36)+Math.random().toString(36).slice(2,10);
    await upload(MARK,{at:Date.now(),name:'',v},new Blob(['ok'],{type:'text/plain'}));vset(v)}
  mismatch=false;marked=true})().finally(()=>{markJob=null})));

/* ---------- antarmuka osCloud ---------- */
window.osCloud={
 uid(){return uidv()},
 get why(){return why},
 async ready(){why='';
   if(!uidv()&&window.pbCloudReady&&Date.now()-lastWait>20000){lastWait=Date.now();try{await Promise.race([window.pbCloudReady,wait(6000)])}catch(e){}}
   if(!uidv()){why='belum login';return false}
   try{await getToken(false)}catch(e){why=(!cid()&&!NP())?'OS_DRIVE_CLIENT_ID belum diisi':(mismatch?MSG_MISMATCH:'izin Drive belum diberikan');return false}
   try{await ensureMark();return true}catch(e){why=mismatch?MSG_MISMATCH:'gagal membuka Drive: '+emsg(e);return false}},
 async list(){await ensureMark();const L=await listAll();
   return L.filter(f=>f.name!==MARK).map(f=>{const m=parse(f.description);return{id:f.name,at:m.at||0,name:m.name||''}})},
 async put(id,m,b){await ensureMark();await upload(id,{at:m.at,name:m.name},b)},
 async get(id){const fid=await fileId(id);if(!fid)throw new Error('hilang');
   const r=await api(API+'/'+fid+'?alt=media');if(r.status===404)throw new Error('hilang');return r.blob()},
 async del(id){const fid=await fileId(id);if(!fid)return;const all=(dupMap&&dupMap.get(id))||[fid];
   for(const x of all)await api(API+'/'+x,{method:'DELETE'});idMap&&idMap.delete(id);dupMap&&dupMap.delete(id)},
 /* dipanggil dari tombol/ketukan pengguna */
 async connect(){try{await getToken(true);await ensureMark();setLinked();poke();return true}catch(e){lastFail=Date.now();throw e}},
 needsAuth(){return !!uidv()&&!NP()&&!!cid()&&!hasTok()&&Date.now()-lastFail>30000},
 status(){return (hasTok()||NP())?'Google Drive tersambung.':'Ketuk layar sekali untuk menyambungkan Google Drive.'}
};

/* ---------- sambung ulang otomatis pada ketukan (token Google berlaku ±1 jam) ---------- */
function poke(){document.querySelectorAll('iframe').forEach(f=>{try{f.contentWindow.dispatchEvent(new Event('online'))}catch(e){}})}
/* token sisa <10 menit dianggap hampir habis: diperbarui lebih awal supaya sinkron tidak putus selama app dipakai */
const soon=()=>!tok||exp-Date.now()<600000;
/* Popup Google TIDAK boleh muncul sembarangan di fitur lain: hanya kalau (1) user pernah menekan Hubungkan di perangkat ini dan (2) Outfit Studio sedang terlihat. */
const LK='os_drive_linked_v1';
const linked=()=>{try{return localStorage.getItem(LK)===uidv()}catch(e){return false}};
const setLinked=()=>{try{localStorage.setItem(LK,uidv())}catch(e){}};
const osVisible=()=>{try{const f=document.getElementById('os-frame');return !!f&&f.getClientRects().length>0&&getComputedStyle(f).visibility!=='hidden'}catch(e){return false}};
/* popup tanpa ketukan pengguna pasti diblokir browser (dan memunculkan ikon "popup diblokir"), jadi pembaruan otomatis hanya jalan kalau ada aktivasi pengguna */
const act=()=>{try{return !!(navigator.userActivation&&navigator.userActivation.isActive)}catch(e){return false}};
function refresh(auto){if(NP()||!cid()||!uidv()||!soon()||pend||!linked()||!osVisible()||(auto&&(!tok||!act()))||Date.now()-lastFail<(auto?300000:30000))return;
  getToken(true,true).then(()=>ensureMark()).then(poke).catch(()=>{lastFail=Date.now()})}
const onTap=()=>refresh(false);
setInterval(()=>{if(!document.hidden)refresh(true)},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>refresh(true),300)});
function hook(d){try{d.addEventListener('pointerup',onTap,{passive:true})}catch(e){}}
hook(document);
function hookFrames(){document.querySelectorAll('iframe').forEach(f=>{if(f.__osd)return;f.__osd=1;
  const go=()=>{try{hook(f.contentDocument)}catch(e){}};go();f.addEventListener('load',go)})}
let hfT=0;hookFrames();new MutationObserver(()=>{clearTimeout(hfT);hfT=setTimeout(hookFrames,400)}).observe(document.documentElement,{childList:true,subtree:true});
})();
