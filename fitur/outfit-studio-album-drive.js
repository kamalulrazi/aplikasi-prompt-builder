/* Jembatan Album (Outfit Studio) -> Google Drive akun Gmail yang login.
   PENGGANTI outfit-studio-album-awan.js (Firestore). Antarmukanya sama persis: osCloud.uid/ready/list/put/get/del,
   jadi outfit-studio.html TIDAK perlu diubah.

   Pasang di index.html (halaman induk), SETELAH login Firebase (compat) dimuat, dan GANTI script lama:
     <script>window.OS_DRIVE_CLIENT_ID='XXXX.apps.googleusercontent.com';</script>
     <script src="outfit-studio-album-drive.js"></script>

   File disimpan di folder tersembunyi aplikasi (appDataFolder, scope drive.appdata): tidak muncul di Drive biasa,
   hanya bisa dibaca aplikasi ini. Pemakaian tetap dihitung ke kuota Google Drive 15 GB milik akun.

   Migrasi: saat pertama tersambung, semua foto di Firestore lama (koleksi 'panahAlbum') disalin dulu ke Drive.
   Selama migrasi belum selesai, ready() = false, jadi aplikasi tidak menghapus apa pun di perangkat. */
(function(){
const CID=window.OS_DRIVE_CLIENT_ID||'',SCOPE='https://www.googleapis.com/auth/drive.appdata',
  API='https://www.googleapis.com/drive/v3/files',UP='https://www.googleapis.com/upload/drive/v3/files',
  MARK='__migrated_v1',OLD='panahAlbum',OCH=300000,TK='os_drive_tok_v1';
const fb=()=>window.firebase,us=()=>{try{return fb().auth().currentUser}catch(e){return null}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let tok='',exp=0,pend=null,idMap=null,migrated=false,migJob=null,why='',lastFail=0;
const emsg=e=>String(e&&e.message||e||'').slice(0,100);

/* ---------- token Google (GIS) ---------- */
try{const j=JSON.parse(sessionStorage.getItem(TK)||'null');if(j&&j.exp>Date.now()+60000){tok=j.t;exp=j.exp}}catch(e){}
const hasTok=()=>!!tok&&Date.now()<exp-60000;
function loadGis(){return new Promise((ok,no)=>{
  if(window.google&&google.accounts&&google.accounts.oauth2)return ok();
  const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;
  s.onload=()=>ok();s.onerror=()=>no(new Error('GIS gagal dimuat'));document.head.appendChild(s)})}
/* interactive=true HARUS dipanggil dari ketukan/klik pengguna (kalau tidak, popup diblokir browser) */
/* Di aplikasi Android (Capacitor) token diminta ke plugin native DriveAuth: bisa diperbarui diam-diam, tanpa popup & tanpa ketukan. */
const NP=()=>{try{const C=window.Capacitor;return C&&C.isNativePlatform&&C.isNativePlatform()?(C.registerPlugin?C.registerPlugin('DriveAuth'):C.Plugins.DriveAuth):null}catch(e){return null}};
function getToken(interactive,force){
  if(hasTok()&&!force)return Promise.resolve(tok);
  const np=NP();
  if(np){if(pend)return pend;
    pend=np.getToken().then(r=>{if(!r||!r.accessToken)throw new Error('token kosong');tok=r.accessToken;exp=Date.now()+3000*1000;return tok}).finally(()=>{pend=null});
    return pend}
  if(!interactive)return Promise.reject(new Error('butuh izin Drive'));
  if(pend)return pend;
  if(!CID)return Promise.reject(new Error('OS_DRIVE_CLIENT_ID belum diisi'));
  pend=loadGis().then(()=>new Promise((ok,no)=>{
    const u=us(),c=google.accounts.oauth2.initTokenClient({client_id:CID,scope:SCOPE,login_hint:(u&&u.email)||'',
      callback:r=>{if(r.error)return no(new Error(r.error));tok=r.access_token;exp=Date.now()+(+r.expires_in||3600)*1000;
        try{sessionStorage.setItem(TK,JSON.stringify({t:tok,exp}))}catch(e){}ok(tok)},
      error_callback:e=>no(new Error((e&&e.type)||'popup'))});
    c.requestAccessToken({prompt:''})})).finally(()=>{pend=null});
  return pend}

/* ---------- panggilan API (retry 401 & 429/5xx) ---------- */
async function api(url,opt,n){n=n||0;
  const r=await fetch(url,{...opt,headers:{...(opt&&opt.headers),Authorization:'Bearer '+await getToken(false)}});
  if(r.status===401&&n<1){tok='';exp=0;try{sessionStorage.removeItem(TK)}catch(e){}return api(url,opt,n+1)}
  if((r.status===429||r.status>=500||(r.status===403&&n<3))&&n<3){await wait(800*(n+1));return api(url,opt,n+1)}
  if(!r.ok&&r.status!==404)throw new Error('Drive '+r.status);
  return r}
const q=s=>encodeURIComponent(s);
const parse=d=>{try{return JSON.parse(d||'{}')}catch(e){return{}}};

async function listAll(){const out=[];let pt='';
  do{const r=await api(API+'?spaces=appDataFolder&pageSize=1000&q='+q('trashed=false')+'&fields='+q('nextPageToken,files(id,name,description)')+(pt?'&pageToken='+q(pt):''));
    const j=await r.json();out.push(...(j.files||[]));pt=j.nextPageToken||''}while(pt);
  idMap=new Map(out.map(f=>[f.name,f.id]));return out}
async function fileId(id){if(!idMap)await listAll();return idMap.get(id)||''}

async function upload(id,meta,blob){
  const fid=await fileId(id),bd='osb'+Math.random().toString(36).slice(2),
    md=fid?{description:JSON.stringify(meta)}:{name:id,parents:['appDataFolder'],description:JSON.stringify(meta)},
    body=new Blob(['--'+bd+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(md)+'\r\n--'+bd+'\r\nContent-Type: '+((blob&&blob.type)||'application/octet-stream')+'\r\n\r\n',blob,'\r\n--'+bd+'--']);
  const r=await api((fid?UP+'/'+fid:UP)+'?uploadType=multipart&fields=id',{method:fid?'PATCH':'POST',headers:{'Content-Type':'multipart/related; boundary='+bd},body});
  const j=await r.json();if(j.id)idMap&&idMap.set(id,j.id)}

/* ---------- migrasi sekali jalan dari Firestore lama ---------- */
async function migrate(){
  const L=await listAll();if(L.some(f=>f.name===MARK)){migrated=true;return}
  let fsErr=false;
  if(fb()&&fb().firestore&&us()){try{
    const col=fb().firestore().collection('users').doc(us().uid).collection(OLD),s=await col.get();
    for(const d of s.docs){
      if(idMap.has(d.id))continue;
      const m=d.data(),c=await col.doc(d.id).collection('c').get(),
        p=c.docs.sort((a,b)=>a.id<b.id?-1:1).map(x=>x.data().d).join(''),a=atob(p),v=new Uint8Array(a.length);
      for(let i=0;i<a.length;i++)v[i]=a.charCodeAt(i);
      await upload(d.id,{at:m.at||0,name:m.name||''},new Blob([v],{type:m.t||'image/jpeg'}))}
    }catch(e){if(/^Drive |izin Drive/.test(emsg(e)))throw e;fsErr=true;why='migrasi Firestore lama dilewati: '+emsg(e)}}
  /* gagal baca Firestore lama: sinkron tetap jalan di sesi ini, MARK tidak ditulis supaya dicoba lagi nanti */
  if(fsErr){migrated=true;return}
  await upload(MARK,{at:Date.now(),name:''},new Blob(['ok'],{type:'text/plain'}));migrated=true}
const ensureMig=()=>migrated?Promise.resolve():(migJob||(migJob=migrate().finally(()=>{migJob=null})));

/* ---------- antarmuka osCloud (sama dengan versi Firestore) ---------- */
window.osCloud={
 uid(){const u=us();return u?u.uid:''},
 get why(){return why},
 async ready(){why='';if(!us()){why='belum login';return false}
   try{await getToken(false)}catch(e){why=(!CID&&!NP())?'OS_DRIVE_CLIENT_ID belum diisi':'izin Drive belum diberikan';return false}
   try{await ensureMig();return true}catch(e){why='migrasi gagal: '+emsg(e);return false}},
 async list(){await ensureMig();const L=await listAll();
   return L.filter(f=>f.name!==MARK).map(f=>{const m=parse(f.description);return{id:f.name,at:m.at||0,name:m.name||''}})},
 async put(id,m,b){await ensureMig();await upload(id,{at:m.at,name:m.name},b)},
 async get(id){const fid=await fileId(id);if(!fid)throw new Error('hilang');
   const r=await api(API+'/'+fid+'?alt=media');if(r.status===404)throw new Error('hilang');return r.blob()},
 async del(id){const fid=await fileId(id);if(!fid)return;await api(API+'/'+fid,{method:'DELETE'});idMap&&idMap.delete(id)},
 /* dipanggil dari tombol/ketukan pengguna */
 async connect(){try{await getToken(true);await ensureMig();poke();return true}catch(e){lastFail=Date.now();throw e}},
 /* true kalau perlu izin baru dari pengguna (web, token belum ada/hampir habis) */
 needsAuth(){return !!us()&&!NP()&&!!CID&&!hasTok()&&Date.now()-lastFail>30000},
 status(){return (hasTok()||NP())?'Google Drive tersambung.':'Ketuk layar sekali untuk menyambungkan Google Drive.'}
};

/* ---------- sambung otomatis pada ketukan pertama (token Google berlaku ±1 jam) ---------- */
function poke(){/* bangunkan sinkron di iframe aplikasi (ia mendengarkan 'online'/'visibilitychange') */
  document.querySelectorAll('iframe').forEach(f=>{try{f.contentWindow.dispatchEvent(new Event('online'))}catch(e){}})}
/* token sisa <10 menit dianggap hampir habis: diperbarui lebih awal supaya sinkron tidak putus selama app dipakai */
const soon=()=>!tok||exp-Date.now()<600000;
function refresh(auto){if(NP()||!CID||!us()||!soon()||pend||(auto&&!tok)||Date.now()-lastFail<(auto?300000:30000))return;
  getToken(true,true).then(()=>ensureMig()).then(poke).catch(()=>{lastFail=Date.now()})}
function onTap(){refresh(false)}
setInterval(()=>{if(!document.hidden)refresh(true)},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>refresh(true),300)});
function hook(d){try{d.addEventListener('pointerup',onTap,{passive:true})}catch(e){}}
try{if(!NP()&&CID)loadGis().catch(()=>{})}catch(e){}
hook(document);
function hookFrames(){document.querySelectorAll('iframe').forEach(f=>{if(f.__osd)return;f.__osd=1;
  const go=()=>{try{hook(f.contentDocument)}catch(e){}};go();f.addEventListener('load',go)})}
hookFrames();new MutationObserver(hookFrames).observe(document.documentElement,{childList:true,subtree:true});
})();
