/* Jembatan Album Panah (Outfit Studio) -> Firebase Firestore akun Gmail yang login. Pasang di index.html (halaman induk) SETELAH login Firebase dimuat. Butuh Firebase versi "compat" (window.firebase).
   Aturan Firestore yang dibutuhkan: match /users/{uid}/{document=**} { allow read, write: if request.auth != null && request.auth.uid == uid; } */
(function(){
const COL='panahAlbum',CH=300000,fb=()=>window.firebase,us=()=>{try{return fb().auth().currentUser}catch(e){return null}};
const ref=id=>{const c=fb().firestore().collection('users').doc(us().uid).collection(COL);return id?c.doc(id):c};
const toB64=b=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]);r.onerror=()=>no(r.error);r.readAsDataURL(b)});
const fromB64=(s,t)=>{const a=atob(s),v=new Uint8Array(a.length);for(let i=0;i<a.length;i++)v[i]=a.charCodeAt(i);return new Blob([v],{type:t||'image/jpeg'})};
window.osCloud={
 async ready(){return !!(fb()&&fb().firestore&&us())},
 async list(){const s=await ref().get();return s.docs.map(d=>({id:d.id,at:d.data().at||0,name:d.data().name||''}))},
 async put(id,m,b){const s=await toB64(b),n=Math.ceil(s.length/CH),r=ref(id),bt=fb().firestore().batch();
  for(let i=0;i<n;i++)bt.set(r.collection('c').doc(String(i).padStart(3,'0')),{d:s.slice(i*CH,(i+1)*CH)});
  await bt.commit();await r.set({at:m.at,name:m.name,n,t:b.type||'image/jpeg'})},
 async get(id){const r=ref(id),m=await r.get();if(!m.exists)throw new Error('hilang');const c=await r.collection('c').get(),p=c.docs.sort((a,b)=>a.id<b.id?-1:1).map(d=>d.data().d).join('');return fromB64(p,m.data().t)},
 async del(id){const r=ref(id),c=await r.collection('c').get(),bt=fb().firestore().batch();c.docs.forEach(d=>bt.delete(d.ref));bt.delete(r);await bt.commit()}
};
})();
