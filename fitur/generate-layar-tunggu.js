// fitur/generate-layar-tunggu.js — Layar tunggu saat tombol Generate ditekan: animasi, kotak skrip real-time, pengaman generate.
// Bagian dari js/10-main-app.js lama (baris 6111–6951). Isi tidak diubah.
function _vbGuardGenerating(){
  if(!VAI._isGenerating)return false;
  if(VAI._lastGenTime && (Date.now()-VAI._lastGenTime)>_VB_GEN_STALE_MS){
    console.warn('[_vbGuardGenerating] proses generate sebelumnya macet >'+(_VB_GEN_STALE_MS/1000)+'dtk tanpa selesai — auto-reset flag _isGenerating.');
    VAI._isGenerating=false;
    try{_vbReleaseWakeLock();}catch(e){}
    return false;
  }
  return true;
}
// DETAK PROGRES (v11.67, 9 Okt 2026): _vbGuardGenerating() menganggap proses 'macet' kalau sudah lewat
// _VB_GEN_STALE_MS sejak VAI._lastGenTime. Dulu _lastGenTime hanya disegarkan per batch (lihat _vbRunBulkGenerate), jadi
// SATU panggilan panjang — mis. rantai fallback 3 model yang masing-masing mendekati batas mutlak per percobaan — bisa
// melewati 8 menit padahal prosesnya masih hidup dan datanya masih mengalir. Guard lalu me-reset _isGenerating, user bisa
// menekan Generate lagi, dan dua request jalan bersamaan (biaya token dobel). Fungsi ini dipanggil
// _vbStreamClaudeJSONWithRetryModel di awal tiap percobaan dan tiap chunk masuk, jadi guard benar-benar mengukur waktu
// TANPA PROGRES (proses mati/beku di background), bukan total lamanya generate.
function _vbHeartbeat(){try{if(VAI&&VAI._isGenerating)VAI._lastGenTime=Date.now();}catch(e){}}
// BATAS MUTLAK PER PERCOBAAN STREAM (v11.67, 9 Okt 2026): dulu tetap 180 dtk, jadi stream yang sehat tapi lambat (Sonnet +
// batch banyak produk, jaringan HP lemah) ikut diputus walau datanya terus mengalir — tokennya tetap ditagih, lalu generate
// diulang dari nol atau pindah model. Sekarang minimal 180 dtk dan naik untuk output besar: 25 ms per token max_tokens
// (~40 token/dtk, laju yang masih wajar), maksimal 6 menit. Stream yang MACET (tanpa data) tetap dipotong idle-timeout
// 45/60 dtk, jadi batas ini hanya jaring pengaman untuk aliran yang terus jalan tapi tak pernah selesai (mis. cuma ping).
function _vbHardCapMs(maxTok){var t=Number(maxTok)||0;return Math.min(360000,Math.max(180000,t*25));}
// FIX (Sept 2026 — laporan user "Status 403: Request not allowed"): pesan ini
// dibalas API Claude (diteruskan apa adanya oleh Worker proxy) dan sifatnya
// sementara/acak — bukan kuota (kuota pakai type quota_exceeded/login_required
// dari Worker sendiri) dan bukan token login (401). Dicoba ulang otomatis
// maks _VB_403_MAX_RETRY kali sebelum dianggap gagal beneran.
var _VB_403_MAX_RETRY=3;
function _vbIsRegionBlock403(status,rawText){
  if(status!==403)return false;
  var t=String(rawText||'');
  if(/quota_exceeded|login_required|invalid_token/i.test(t))return false;
  return /request not allowed/i.test(t);
}
// FIX (1 Okt 2026 — akar masalah 403 "Request not allowed" yang terus berulang):
// pesan ini BUKAN acak murni, melainkan blokir WILAYAH dari Anthropic. Worker
// proxy jalan di data center Cloudflare terdekat dari user; kalau jalur
// internet user (mis. data seluler di Indonesia) kebetulan diarahkan ke data
// center Hong Kong (HKG), request keluar Worker ke api.anthropic.com terlihat
// berasal dari Hong Kong -> ditolak 403 dalam hitungan milidetik. Koneksi yang
// sama biasanya terus kena data center yang sama, jadi retry otomatis di sisi
// app sering SIA-SIA (ini sebabnya 3x retry singkat tetap gagal).
// PERBAIKAN PERMANEN ADA DI WORKER (bukan di file ini): di wrangler.toml
// Worker "promptbuilder" tambahkan
//   [placement]
//   region = "aws:us-east-1"
// lalu deploy ulang, supaya Worker selalu jalan dekat server Anthropic (AS)
// dan tidak pernah di HKG. Fungsi ini cuma memberi pesan yang akurat & bisa
// ditindaklanjuti user (pesan lama "tunggu beberapa detik" menyesatkan).
function _vbRegionBlockMsg(){
  return 'Koneksi ke server kami ditolak (403) — bukan karena kuota atau tools kamu. Kemungkinan jalur internet HP kamu sedang melewati jaringan di wilayah yang tidak didukung server, jadi menunggu saja belum tentu membantu. Coba ganti jaringan (WiFi ↔ data seluler) atau nyalakan-matikan mode pesawat, lalu tekan Lanjutkan (produk yang sudah jadi tidak hilang).';
}
function vaiDoneCard(id,ansId,text){var c=document.getElementById(id);if(c)c.classList.add('done');var a=document.getElementById(ansId);if(a)a.innerHTML='<svg class="icon"><use href="#ic-check"></use></svg> '+esc(text);}

// ── ENGINE LOADER STICK FIGURE (canvas) — v7: badan ikut gerak tangan, cek kata & revisi memakai DATA NYATA (lihat genLogoEvent)
// Mengekspor window.PBScene. Adegan: loop (menulis), chk (cek kata), rev (revisi), retry (ganti model: robek kertas), ok (perlihatkan kertas), err.
/* Loader skrip — versi smooth. Karakter menghadap depan + meja tetap sama dengan aplikasi.
   Perbedaan utama: semua gerakan memakai pegas teredam kritis (rumus tertutup, stabil di 60/120 Hz),
   perpindahan pose memakai bobot yang dihaluskan (tidak ada lompat state), tulisan memakai kurva halus. */
(function(){
var R=Math.PI/180,TAU=Math.PI*2;
function cl(v,a,b){return v<a?a:v>b?b:v}
function mx(a,b,t){return a+(b-a)*t}
function es(t){t=cl(t,0,1);return t*t*t*(t*(6*t-15)+10)}
function Sp(x,k){this.x=x;this.v=0;this.k=k}
Sp.prototype.s=function(g,dt){var w=this.k,d=this.x-g,e=Math.exp(-w*dt),c=(this.v+w*d)*dt;this.x=g+(d+c)*e;this.v=(this.v-w*c)*e;return this.x};
function pc(s){var m,h;s=(s||'').trim();if(m=s.match(/^#([0-9a-f]{3,6})$/i)){h=m[1];if(h.length<6)h=h.replace(/./g,'$&$&');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}m=s.match(/[\d.]+/g);return m&&m.length>2?[+m[0],+m[1],+m[2]]:[255,255,255]}
function C(c,a){return'rgba('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+','+(a==null?1:cl(a,0,1))+')'}
function mc(a,b,t){return[mx(a[0],b[0],t),mx(a[1],b[1],t),mx(a[2],b[2],t)]}
function ikS(ax,ay,tx,ty,l1,l2,sg){var dx=tx-ax,dy=ty-ay,d=Math.hypot(dx,dy)||1,f=cl(d/(.7*(l1+l2)),.7,1),a=l1*f,b=l2*f,an=Math.atan2(dy,dx),c,e1,e2,e;d=cl(d,Math.abs(a-b)+.1,a+b-.4);c=Math.acos(cl((a*a+d*d-b*b)/(2*a*d),-1,1));e1=[ax+Math.cos(an+c)*a,ay+Math.sin(an+c)*a];e2=[ax+Math.cos(an-c)*a,ay+Math.sin(an-c)*a];e=(sg<0?e1[0]>e2[0]:e1[0]<e2[0])?e1:e2;return[e[0],e[1],ax+Math.cos(an)*d,ay+Math.sin(an)*d]}

/* naskah: [v, u awal, u akhir, jenis h/s] = tulis satu baris · ['t',detik] = berpikir · ['p',detik] = ganti kertas */
var LN=[[.12,.08,.32,'h'],[.26,.08,.9,'s'],[.39,.08,.68,'s'],['t',1.9],[.55,.08,.86,'s'],[.68,.08,.74,'s'],[.81,.08,.46,'s'],['p',2.6]];
function wp(l,u,i){var a=l[1],b=l[2],ph=i*1.7;return[mx(a,b,u+.03*Math.sin(u*TAU*3)),l[0]+.012*Math.sin(u*(b-a)*70+ph)+.006*Math.sin(u*(b-a)*160+ph*2)]}
var SG=[],TOT=0,cur=wp(LN[6],1,6);
LN.forEach(function(l,i){
 if(l[0]==='t'||l[0]==='p'){SG.push({k:l[0],t0:TOT,d:l[1],at:cur});TOT+=l[1];return}
 var g={k:'g',t0:TOT,d:(i===0||i===4)?.8:.5,a:cur,b:wp(l,0,i)};SG.push(g);TOT+=g.d;
 var d=(l[2]-l[1])*3.4;SG.push({k:'w',t0:TOT,d:d,l:l,i:i});TOT+=d;cur=wp(l,1,i)});
function pen(lt){var i=0;while(i<SG.length-1&&lt>=SG[i+1].t0)i++;var g=SG[i],p=(lt-g.t0)/g.d,k,e;
 if(g.k==='w'){k=p*.25+es(p)*.75;var q=wp(g.l,k,g.i);return{u:q[0],v:q[1],dn:1,lf:0,g:g,i:i}}
 if(g.k==='g'){k=es(p);return{u:mx(g.a[0],g.b[0],k),v:mx(g.a[1],g.b[1],k),dn:p>.82?1:0,lf:Math.sin(k*Math.PI)*2.4,g:g,i:i}}
 e=es(Math.min(p*4,(1-p)*4,1));return{u:g.at[0]+.03*Math.sin(lt*1.7)*e,v:g.at[1]+.02*Math.cos(lt*1.3)*e,dn:0,lf:3.2*e,g:g,i:i}}
var DQ=[[88.8,74.3],[111.2,74.3],[115.4,84.8],[84.6,84.8]];
function pp(Pt,k){var j=cl(k,0,1)*(Pt.length-1),n=Math.min(j|0,Pt.length-2),f=j-n;return[mx(Pt[n][0],Pt[n+1][0],f),mx(Pt[n][1],Pt[n+1][1],f)]}
function zz(a,b,v0,v1,n){var p=[],k;for(k=0;k<=n;k++)p.push([mx(a,b,k/n),k%2?v1:v0]);return p}
var STR=zz(.3,.66,.35,.43,8),FIX=[.55,.08,.88,'a'],TICK=[[.62,.8],[.72,.93],[.92,.6]],ERR=zz(.04,.96,.1,.92,10),S1=STR[STR.length-1],F0=wp(FIX,0,9),F1=wp(FIX,1,9);

function Scene(cv){
var X=cv.getContext('2d'),cols,raf=0,last=0,fr=0,t=0,clock=0,me=this,st='loop',sT=0,hold=0,ts=1,rn=0,pa0=[.46,.81],torn=0,pcs=[],bt='',Qm=DQ,bl=0,nb=2.5,blk=0,cs=null,ink=[],Q=DQ,Qb=DQ,Sh=[100,58],HC=[100,47],hq=0,rol=0,tipS=[100,80],NH=[108,80],FH=[90,80],pg={x:0,y:0,a:1},
red=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches,
S={wr:new Sp(0,5),th:new Sp(0,4.5),gr:new Sp(0,6),pd:new Sp(0,16),pu:new Sp(wp(LN[6],1,6)[0],16),pv:new Sp(wp(LN[6],1,6)[1],16),lf:new Sp(0,14),
 nx:new Sp(108,9),ny:new Sp(80,9),fx:new Sp(90,9),fy:new Sp(80,9),hd:new Sp(0,6),hh:new Sp(0,7),sw:new Sp(0,5),rl:new Sp(0,5),
 gx:new Sp(0,10),gy:new Sp(0,10),ms:new Sp(.55,6),mo:new Sp(0,8),br:new Sp(0,7),hg:new Sp(0,6),hl:new Sp(0,5),sl:new Sp(0,5),ho:new Sp(0,7),pl:new Sp(0,10),bs:new Sp(0,12),ec:new Sp(0,10),hf:new Sp(0,9),cw:new Sp(0,5),pus:new Sp(.46,5),eu:new Sp(.46,9),ev:new Sp(.8,9),tx:new Sp(0,4),ty:new Sp(0,4),snx:new Sp(0,7),sny:new Sp(0,7),sfx:new Sp(0,7),sfy:new Sp(0,7),lk:new Sp(0,4),sh:new Sp(0,3.4),ef:new Sp(0,6)};

var tr=null,ck=null,pls=0,fk=1,hfT=0,cwT=0,ckv=.12,ckS=.12,dtS=.016,kp=16,kpT=16,kdT=16,klT=14,rv=null,rln=-1,rzF=null,JF=[91.5,61],JN=[108.5,61],hlO={x:0,v:0},okn=0,penR=null,SQ=DQ.map(function(p){return[p[0]-30,p[1]]});
function rc(){var s=getComputedStyle(cv),g=function(n,d){return pc(s.getPropertyValue(n)||d)};
 cols={fg:g('--text','#F2F0EC'),ac:g('--accent','#D9B876'),a2:g('--accent-2','#F0D9A0'),bg:g('--bg','#08080A'),s3:g('--surface3','#202024'),red:g('--red','#F0716A')};
 cols.font=s.fontFamily||'sans-serif';cols.pap=mc(cols.fg,cols.ac,.1);cols.sh=mc(cols.ac,cols.bg,.5)}
function uv(u,v,q){q=q||Q;var a=q[0],b=q[1],c=q[2],d=q[3];return[mx(mx(a[0],b[0],u),mx(d[0],c[0],u),v),mx(mx(a[1],b[1],u),mx(d[1],c[1],u),v)]}

function tv(a,b,p){var k=es(p);return{u:mx(a[0],b[0],k),v:mx(a[1],b[1],k),dn:p>.82?1:0,lf:Math.sin(k*Math.PI)*2.4}}
function hv(a,u){var e=es(Math.min(u*3,1));return{u:a[0]+.02*Math.sin(t*1.7)*e,v:a[1]+.015*Math.cos(t*1.3)*e,dn:0,lf:3*e}}
function to(s,o){o=o||{};var ps=st;st=s;sT=0;hold=o.hold?1:0;rn++;pa0=[S.pu.x,S.pv.x];torn=0;cs=null;tr=null;okn=0;
 if(s==='loop'){if(o.swap)sT=TOT-2.599;else ink=[]}
 else if(s==='rev'||s==='chk'){if(s==='chk')ck=mkCk(o);var kp2=s==='rev'&&(ps==='chk'||ps==='rev')&&ink.length>2&&!o.fresh;if(!kp2)ink=[];for(var i=0;i<(kp2?0:3);i++){var l=LN[i],p=[];for(var j=0;j<=60;j++)p.push(wp(l,j/60,i));ink.push({key:'f'+i,c:l[3],p:p})}if(s==='rev')mkRv(o,kp2)}
 else if(s==='ok'){ink=ink.filter(function(z){return z.c!=='t'})}}
function inkDraw(q,L,a){L.forEach(function(o){var n=o.p.length;if(n<2)return;var m=uv(o.p[0][0],o.p[0][1],q),p,b,z,c=o.c;X.beginPath();X.moveTo(m[0],m[1]);
 for(var j=1;j<n-1;j++){p=uv(o.p[j][0],o.p[j][1],q);b=uv(o.p[j+1][0],o.p[j+1][1],q);X.quadraticCurveTo(p[0],p[1],(p[0]+b[0])/2,(p[1]+b[1])/2)}
 z=uv(o.p[n-1][0],o.p[n-1][1],q);X.lineTo(z[0],z[1]);
 X.strokeStyle=C(c==='r'?cols.red:c==='s'?cols.bg:c==='t'?cols.ac:mc(cols.ac,[0,0,0],.5),(c==='s'?.6:c==='t'?.75:.95)*a);X.lineWidth=(c==='s'?.85:c==='h'?1.15:c==='t'?.8:1.05)*.8;X.stroke()})}
function bp(b,p){var c=Math.cos(b.r),s=Math.sin(b.r),x=p[0]-b.c0[0],y=p[1]-b.c0[1];return[b.cx+x*c-y*s,b.cy+x*s+y*c]}
/* sobekan: jalur bergerigi acak (tiap kali beda), dua bagian kertas = kertas yang sama lengkap dengan tulisannya */
/* jadwal cek kata: posisi tiap kata proporsional panjang kata, durasi kata panjang sedikit lebih lama */
/* revisi: tiap skrip pendek = satu baris yang ditunjuk, ditunggu, lalu ditulisi kata tambahan (tanda merah dari cek kata dipakai ulang) */
function mkRv(o,keep){var t=.6,r={it:[],pd:0,f:0,H:0};(o.items||[]).forEach(function(m){var l=LN[m.j],L=Math.min(.2,Math.max(.04,m.k*.03)),Wd=Math.min(1.8,Math.max(.8,m.k*.22)),lg=m.dir<0,e=lg?l[2]-L:l[2]+.03,xs=keep?ink.filter(function(z){return z.ln===m.j&&z.key.charAt(0)==='v'&&z.c==='r'})[0]:null;
 if(!xs){xs={key:'x'+m.j,c:'r',ln:m.j,p:[[e,l[0]+.03],[e+L,l[0]+.03]]};ink.push(xs)}
 r.it.push({j:m.j,L:L,e:e,v:l[0]+.03,dir:lg?-1:1,Wd:Wd,dur:.4+Wd+.55,xs:xs,rm:0});t+=.95});
 r.H=t+.15;if(!keep)(o.all||[]).forEach(function(a,j){if(a&&a.ok)ink.push({key:'k'+j,c:'a',ln:j,p:[[LN[j][2]+.03,LN[j][0]],[LN[j][2]+.05,LN[j][0]+.045],[LN[j][2]+.08,LN[j][0]-.04]]})});rv=r}
function mkCk(o){var wd=o.wd||.1;return{j:-1,w:0,G:o.G||.45,V:o.V||.75,done:0,it:o.items.map(function(m){var L=[],n=Math.max(1,m.n),i,sum=0,cum=0,t=0,c=[],d=[],s=[],ta=[],tot,avg;
 for(i=0;i<n;i++){L[i]=(m.lens&&m.lens[i])||5;sum+=L[i]}avg=sum/n;tot=sum+n-1;
 for(i=0;i<n;i++){c.push((cum+L[i]/2)/tot);cum+=L[i]+1;d.push(wd*(.6+.4*L[i]/avg));s.push(t);ta.push(t+d[i]/2);t+=d[i]}
 return{n:n,k:m.k||0,dir:m.dir<0?-1:1,ok:!!m.ok,c:c,d:d,s:s,ta:ta,T:t}})}}
function mkTear(){var n=26,u=.36+Math.random()*.28,q=Q.map(function(p){return p.slice()}),A=[],B=[],i,v,PL,PR;
 for(i=0;i<=n;i++){u=cl(u+(Math.random()-.5)*.06,.28,.72);v=i/n;A.push(uv(u+.009+Math.random()*.012,v,q));B.push(uv(u-.009-Math.random()*.012,v,q))}
 PL=[uv(0,0,q)].concat(A,[uv(0,1,q)]);PR=B.concat([uv(1,1,q),uv(1,0,q)]);
 tr={q:q,k:ink,n:n,P:[PL,PR],W:[A,B],g:[uv(0,.5,q),uv(1,.5,q)],f:0,k0:0,hl:null,B:[-1,1].map(function(s){var P=s<0?PL:PR,cx=0,cy=0;P.forEach(function(p){cx+=p[0]/P.length;cy+=p[1]/P.length});return{s:s,c0:[cx,cy],cx:cx,cy:cy,r:0,vx:0,vy:0,vr:0,l:0}})};ink=[];cs=null}

function step(dt){
 t+=dt;sT+=dt*ts;
 fk=1;hfT=0;cwT=0;kpT=16;kdT=16;klT=14;rln=-1;pls*=Math.exp(-dt*9);
 if(tr&&tr.f)tr.B.forEach(function(b){b.l+=dt;b.vy+=(40-b.vy*1.8)*dt;b.vx*=1-1.2*dt;b.cx+=(b.vx+Math.sin(b.l*6+b.s)*9)*dt;b.cy+=b.vy*dt;b.vr+=(Math.sin(b.l*5+b.s*2)*3-b.vr*1.5)*dt;b.r+=b.vr*dt});
 if(hold&&st==='rev'&&rv&&sT>rv.H)sT=rv.H;
 if(st==='ok'&&sT>4.6)sT=4.6;if(st==='err'&&sT>3.6)sT=3.6;
 var u=sT,P,wt=0,tt=0,ox=0,oy=0,pa=1,k,p,q,rk=null,rcl='s',bz=0,bT='',hgT=0,hlT=0,slT=0,hoT=0,plT=0,msT=.55,ecT=0,shk=0,shT=0,lkT=0,efT=0,end=0;
 if(st==='loop'){var lt=u%TOT,cy=u/TOT|0,g,w2;P=pen(lt);g=P.g;wt=(g.k==='w'||g.k==='g')?1:0;tt=g.k==='t'?1:0;
  if(g.k==='p'){w2=lt-g.t0; /* kertas selesai: terangkat, meluncur pendek & memudar; kertas baru masuk dari kiri */
   if(w2<1.1){k=es((w2-.3)/.8);ox=12*k;oy=-1.5*Math.sin(k*Math.PI);pa=1-es((w2-.6)/.5)}
   else if(w2<1.6){ox=-16;pa=0;if(ink.length){ink=[];cs=null}}
   else{fk=es((w2-1.6)/.9);pa=es((w2-1.6)/.3);hfT=fk<1?1:0;oy=-1.9*Math.sin(fk*Math.PI)}}
  if(g.k==='w'){rk='l'+cy+'_'+P.i;rcl=g.l[3]}}
 else if(st==='chk'){ /* cek kata (data nyata): pena menunjuk lalu mengetuk tiap kata; hitungan, anggukan, mulut, dan tangan penuntun baris ikut tiap ketukan */
  var it=ck.it,j=0,x=u,m,y,i2,ph,A,B,pf,e,v0,s2,s0,st0,h,lj,pj,Ln,a1,a2;cwT=1;wt=1;kpT=26;kdT=24;klT=24;
  for(;j<it.length;j++){if(x<ck.G+it[j].T+ck.V)break;x-=ck.G+it[j].T+ck.V}
  if(j>=it.length){lj=(it.length-1)%3;P=hv([LN[lj][2]+.08,LN[lj][0]-.03],1);if(!ck.done){ck.done=1;if(me.onEnd)me.onEnd('chk')}}
  else{m=it[j];lj=j%3;pj=(j+2)%3;ckv=LN[lj][0];rln=lj;
   if(j!==ck.j){ck.j=j;ck.w=0;if(j>=3){ink=ink.filter(function(z){return z.ln!==lj});cs=null}if(me.onRow)me.onRow(j)}
   if(x<ck.G){A=wp(LN[lj],m.c[0],lj);pf=j?[LN[pj][2]+.06,LN[pj][0]]:pa0;k=es(x/ck.G);P={u:mx(pf[0],A[0],k),v:mx(pf[1],A[1],k),dn:0,lf:Math.sin(k*Math.PI)*2.2}}
   else if(x<ck.G+m.T){y=x-ck.G;for(i2=0;i2<m.n-1&&y>=m.s[i2]+m.d[i2];i2++);
    var ia=y<m.ta[i2]?Math.max(0,i2-1):i2,ib=y<m.ta[i2]?i2:Math.min(m.n-1,i2+1),f=ia===ib?0:cl((y-m.ta[ia])/(m.ta[ib]-m.ta[ia]),0,1);
    ph=(y-m.ta[i2])/m.d[i2];A=wp(LN[lj],m.c[ia],lj);B=wp(LN[lj],m.c[ib],lj);
    P={u:mx(A[0],B[0],f),v:mx(A[1],B[1],f),dn:Math.abs(ph)<.16?1:0,lf:1.5*(.5-.5*Math.cos(ph*Math.PI*2))};
    if(ph>=0&&i2+1>ck.w){ck.w=i2+1;pls=i2%3?.2:.7;A=wp(LN[lj],m.c[i2],lj);ink.push({key:'t'+j+'_'+i2,c:'t',ln:lj,p:[[A[0],A[1]+.05],[A[0]+.004,A[1]+.056]]});if(me.onCount)me.onCount(j,i2+1,m.n)}}
   else{y=x-ck.G-m.T;if(!m.v){m.v=1;pls=1.1;if(ck.w<m.n&&me.onCount)me.onCount(j,m.n,m.n);if(me.onVerdict)me.onVerdict(j,m.ok)}
    e=LN[lj][2];v0=LN[lj][0];s0=wp(LN[lj],m.c[m.n-1],lj);Ln=Math.min(.2,Math.max(.04,m.k*.03));
    st0=m.ok?[e+.03,v0]:(m.dir<0?[e-Ln,v0+.03]:[e+.03,v0+.03]);a1=ck.V*.16;a2=ck.V*.6;h=es(cl(y/a1,0,1));s2=cl((y-a1)/a2,0,1);
    if(y<a1)P={u:mx(s0[0],st0[0],h),v:mx(s0[1],st0[1],h),dn:y>a1*.4?1:0,lf:Math.sin(h*Math.PI)*1.5};
    else{P=m.ok?(s2<.4?{u:st0[0]+.02*s2/.4,v:st0[1]+.045*s2/.4}:{u:st0[0]+.02+.03*(s2-.4)/.6,v:st0[1]+.045-.085*(s2-.4)/.6}):{u:st0[0]+Ln*s2,v:st0[1]};P.dn=s2<1?1:0;P.lf=0;if(s2<1){rk='v'+j;rcl=m.ok?'a':'r'}}
    bz=1;bT=m.ok?'ok':'?';msT=m.ok?.95:-.6;if(!m.ok&&y<ck.V*.8)shk=Math.sin(y*26)*4*(1-y/(ck.V*.8))}}}
 else if(st==='rev'){ /* revisi (data nyata): tunjuk bagian yang meleset → menunggu AI → tulis/coret → centang */
  var rr=rv,it=rr.it,m,y,i2,A,pf,s2,s0,sw,c0,l2,qq,h;
  if(!it.length){P=hv(pa0,u);if(!hold&&u>.8)end=1}
  else if(u<.6){P=hv(pa0,u);tt=1;bz=1;bT='?'}
  else if(u<rr.H){y=u-.6;i2=Math.min(it.length-1,y/.95|0);m=it[i2];y-=i2*.95;A=[m.e+m.L/2,m.v];pf=i2?[it[i2-1].e+it[i2-1].L/2,it[i2-1].v]:pa0;cwT=1;ckv=LN[m.j][0];bz=1;bT='?';msT=-.5;kpT=26;kdT=24;klT=24;
   if(y<.4){k=es(y/.4);P={u:mx(pf[0],A[0],k),v:mx(pf[1],A[1],k),dn:0,lf:Math.sin(k*Math.PI)*2}}
   else{y-=.4;k=Math.abs(Math.sin(y*Math.PI/.3));p=y>.2&&k<.3?1:0;if(p&&!rr.pd)pls=1;rr.pd=p;P={u:A[0],v:A[1],dn:p,lf:k*1.1}}}
  else if(hold){m=it[it.length-1];P=hv([m.e+m.L/2,m.v],1);tt=1;cwT=1;ckv=LN[m.j][0]}
  else{y=u-rr.H;for(i2=0;i2<it.length&&y>=it[i2].dur;i2++)y-=it[i2].dur;
   if(i2>=it.length){m=it[it.length-1];P=hv([m.e+m.L+.08,m.v-.03],1);msT=1;bz=1;bT='ok';if(!rr.f){rr.f=1;pls=1.1}if(y>.9)end=1}
   else{m=it[i2];cwT=1;ckv=LN[m.j][0];wt=1;rln=m.j;l2=[LN[m.j][0],m.e,m.e+m.L,'a'];pf=i2?[it[i2-1].e+it[i2-1].L+.08,it[i2-1].v]:[it[it.length-1].e+it[it.length-1].L/2,it[it.length-1].v];
    if(y<.4){k=es(y/.4);P={u:mx(pf[0],m.e,k),v:mx(pf[1],m.v-.03,k),dn:y>.28?1:0,lf:Math.sin(k*Math.PI)*2}}
    else if(y<.4+m.Wd){p=(y-.4)/m.Wd;k=p*.25+es(p)*.75;qq=wp(l2,k,9+m.j);P={u:qq[0],v:qq[1],dn:1,lf:0};rk='f'+rn+'_'+m.j;rcl=m.dir<0?'r':'a';while(m.xs.p.length>2&&m.xs.p[1][0]<qq[0])m.xs.p.shift();m.xs.p[0][0]=cl(qq[0],m.e,m.e+m.L);if(me.onFix)me.onFix(m.j,k)}
    else{y-=.4+m.Wd;if(!m.rm){m.rm=1;h=ink.indexOf(m.xs);if(h>=0)ink.splice(h,1);if(me.onFix)me.onFix(m.j,1)}
     sw=wp(l2,1,9+m.j);c0=[(m.dir<0?LN[m.j][2]:m.e+m.L)+.03,LN[m.j][0]];s2=cl((y-.12)/.45,0,1);h=es(cl(y/.12,0,1));msT=.9;
     if(y<.12)P={u:mx(sw[0],c0[0],h),v:mx(sw[1],c0[1],h),dn:y>.05?1:0,lf:Math.sin(h*Math.PI)*1.5};
     else{P=s2<.4?{u:c0[0]+.02*s2/.4,v:c0[1]+.045*s2/.4}:{u:c0[0]+.02+.03*(s2-.4)/.6,v:c0[1]+.045-.085*(s2-.4)/.6};P.dn=s2<1?1:0;P.lf=0;if(s2<1){rk='c'+rn+'_'+m.j;rcl='a'}}}}}}
 else if(st==='retry'){ /* ganti model AI: kaget → pegang dua sisi → sobek bertahap dari atas → ditarik terpisah → dilepas, melayang jatuh → lembar baru ditarik dari tumpukan */
  P=hv(pa0,u);tt=u<.5?1:0;if(u<1.2){bz=1;bT='!'}if(u>.5)msT=-.6;
  if(u<1.2){hgT=u>.5?1:0;oy=-2.2*es((u-.5)/.7)}
  else if(u<2.5){hgT=1;oy=-2.2;pa=0;if(!tr)mkTear();
   var x1=(u-1.2)/1,t0=cl(es(x1)+.03*Math.sin(x1*38)*(1-x1),0,1),pu2=es(cl((u-2)/.5,0,1)),tw=tr.W[0][Math.round(t0*tr.n)];tr.k0=t0;
   tr.B.forEach(function(b){var a=b.s*(.11*t0*t0+.34*pu2),dx2=b.c0[0]-tw[0],dy2=b.c0[1]-tw[1],cc=Math.cos(a),ss=Math.sin(a);b.r=a;b.cx=tw[0]+dx2*cc-dy2*ss+b.s*6.5*pu2;b.cy=tw[1]+dx2*ss+dy2*cc-1.1*pu2;b.vx=b.s*8;b.vy=-2;b.vr=b.s*.9;b.l=0});
   shk=Math.sin(u*34)*5*t0*(1-pu2);efT=t0*(1-pu2)}
  else{if(tr)tr.f=1;hgT=0;pa=es((u-2.5)/.3);
   if(u<2.9)fk=0;else if(u<4.1){fk=es((u-2.9)/1.2);oy=-1.9*Math.sin(fk*Math.PI)}
   hfT=u>2.6&&u<4.4?1:0;if(u>4.7)end=1}}
 else if(st==='ok'){ /* selesai: centang emas → dua tangan meraih sisi kertas (badan condong) → kertas diangkat & diperlihatkan (badan tegak, bahu naik) → menoleh ke penonton, mengangguk, senyum */
  if(u<.6){P=tv(pa0,TICK[0],u/.6);wt=1}
  else if(u<1.5){p=(u-.6)/.9;k=p*.4+es(p)*.6;q=pp(TICK,k);P={u:q[0],v:q[1],dn:1,lf:0};rk='o'+rn;rcl='a';wt=1}
  else P=hv(TICK[2],u-1.5);
  if(u>1.5)msT=1;hgT=u>1.8?1:0;hlT=u>2.5?1:0;shT=u>2.5?1:0;lkT=u>3.2?1:0;
  if(u>3.3&&!okn){okn=1;pls=.9}if(u>3.6){bz=1;bT='ok'}}
 else{ /* gagal: coret merah → lemas di meja, tangan memegang kepala */
  if(u<.6){P=tv(pa0,ERR[0],u/.6);wt=1}
  else if(u<1.9){p=(u-.6)/1.3;k=p*.5+es(p)*.5;q=pp(ERR,k);P={u:q[0],v:q[1],dn:1,lf:0};rk='e'+rn;rcl='r';wt=1;msT=-.5}
  else{P=hv(ERR[ERR.length-1],u-1.9);msT=-.8}
  slT=u>1.9?1:0;hoT=u>2.1?1:0;ecT=u>2.2?1:0;if(u>2.8){bz=1;bT='x'}}
 if(rk&&(!cs||cs.key!==rk)){cs={key:rk,c:rcl,p:[],ln:rln};ink.push(cs)}
 pg.a=pa;
 kp+=(kpT-kp)*Math.min(1,dt*6);S.pu.k=S.pv.k=kp;S.pd.k+=(kdT-S.pd.k)*Math.min(1,dt*6);S.lf.k+=(klT-S.lf.k)*Math.min(1,dt*6);S.pu.s(P.u,dt);S.pv.s(P.v,dt);S.pus.s(P.u,dt);S.eu.s(P.u,dt);S.ev.s(P.v,dt);S.pd.s(P.dn,dt);S.lf.s(P.lf*.75,dt);S.wr.s(wt,dt);S.th.s(tt,dt);S.hg.s(hgT,dt);S.hl.s(hlT,dt);S.sh.s(shT,dt);S.lk.s(lkT,dt);S.ef.s(efT,dt);S.sl.s(slT,dt);S.ho.s(hoT,dt);S.pl.s(plT,dt);S.hf.s(hfT,dt);S.cw.s(cwT,dt);S.ec.s(ecT,dt);S.bs.s(bz,dt);if(bz)bt=bT;
 var wr=S.wr.x,th=S.th.x,hg=S.hg.x,hl=S.hl.x,sl=S.sl.x,ho=S.ho.x,pl=S.pl.x,pu=S.pu.x,pv=S.pv.x,pus=S.pus.x;
 if(rk&&cs&&S.pd.x>.8){var L=cs.p[cs.p.length-1];if(!L||Math.hypot(L[0]-pu,L[1]-pv)>.004)cs.p.push([pu,pv])}
 S.sw.s(wr*(pus-.5)*1.6,dt);S.rl.s(wr*(pus-.5)*.05,dt);rol=S.rl.x+Math.sin(t*.7)*.012;
 Sh=[100+S.sw.x+S.tx.x+Math.sin(t*.5)*.5,56.5+2*wr-.8*th-1.2*hl+12*sl+S.ty.x-1*S.sh.x-1.1*S.ef.x+Math.sin(t*1.8)*.2];
 S.hd.s(th*-6+wr*(pv-.4)*2-3*hl+16*sl+pls*3+S.cw.x*(pus-.5)*7,dt);hq=S.hh.s(S.hd.x*R*.8,dt)+wr*(pus-.5)*.06+Math.sin(t*.9)*.01+shk*R;
 HC=[Sh[0]+Math.sin(hq)*3+S.sw.x*.3,Sh[1]-10.5+wr*.5+5*sl+1.6*S.cw.x-1.2*S.sh.x+1.7*S.ef.x];
 /* kertas ikut bergeser pelan mengikuti pena; saat selesai kertas naik ke dada (morph) */
 var dx=-(pus-.5)*10,a6=(-6+1.4*Math.sin(t*1.3)*hl)*R,ca=Math.cos(a6),sa=Math.sin(a6),cx=Sh[0],cy2=Sh[1]+11.5,HQ=[[-7.4,-9.2],[7.4,-9.2],[7.4,9.2],[-7.4,9.2]];for(var i3=0;i3<2;i3++){hlO.v+=(38*(hlT-hlO.x)-9.2*hlO.v)*dt/2;hlO.x+=hlO.v*dt/2}
 Qb=DQ.map(function(p,i){return[mx(SQ[i][0],p[0]+dx,fk),mx(SQ[i][1],p[1],fk)]});
 Qm=Qb.map(function(p,i){var h=HQ[i];return[mx(p[0],cx+h[0]*ca-h[1]*sa,hlO.x),mx(p[1],cy2+h[0]*sa+h[1]*ca,hlO.x)-4.2*Math.sin(Math.PI*cl(hlO.x,0,1))]});
 Q=Qm.map(function(p){return[p[0]+ox,p[1]+oy]});
 tipS=uv(pu,pv,Qm);
 /* tangan: menulis ↔ memegang kertas ↔ memegang kepala (bobot halus), lalu diikuti pegas tangan */
 var gN=[mx(Q[1][0],Q[2][0],.5)-1,mx(Q[1][1],Q[2][1],.5)-1],gF=[mx(Q[0][0],Q[3][0],.5)+1,mx(Q[0][1],Q[3][1],.5)-1],
 hN=[HC[0]+7.5,HC[1]-3+Math.sin(t*2.2)*.5],hF=[HC[0]-7.5,HC[1]-3+Math.sin(t*2.2+1)*.5],
 wN=[tipS[0]-1.2,tipS[1]-2.6-S.lf.x],wF=[mx(Qm[0][0],Qm[3][0],.35)+1.8+Math.sin(t*.8)*.3,mx(Qm[0][1],Qm[3][1],.35)+pv*2.5];
 var hh2=Math.max(hg,S.hf.x,S.cw.x*.85),e1,e2;
 if(tr&&!tr.f){e1=bp(tr.B[0],tr.g[0]);e2=bp(tr.B[1],tr.g[1]);gF=[e1[0]+.8,e1[1]];gN=[e2[0]-.8,e2[1]];tr.hl=[gF,gN]}else if(tr&&hg>.03){gF=tr.hl[0];gN=tr.hl[1]}
 if(S.hf.x>.02&&!(tr&&!tr.f))gF=[mx(Q[1][0],Q[2][0],.5)-1.2,mx(Q[1][1],Q[2][1],.5)-1];
 if(S.cw.x>.02&&!tr){ckS+=(ckv-ckS)*Math.min(1,dt*7);var gg=uv(-.03,ckS+.08,Q);gF=[gg[0],gg[1]]}
 S.nx.s(mx(mx(wN[0],gN[0]+pl*6,hg),hN[0],ho),dt);S.ny.s(mx(mx(wN[1],gN[1],hg),hN[1],ho),dt);
 S.fx.s(mx(mx(wF[0],gF[0]-pl*6,hh2),hF[0],ho),dt);S.fy.s(mx(mx(wF[1],gF[1],hh2),hF[1],ho),dt);NH=[S.nx.x,S.ny.x];FH=[S.fx.x,S.fy.x];
 var gz=uv(S.eu.x,S.ev.x,Qm),vx=gz[0]-HC[0],vy=gz[1]-HC[1],c=Math.cos(hq),sn=Math.sin(hq),lx=vx*c+vy*sn,ly=-vx*sn+vy*c,m=Math.hypot(lx,ly)||1;
 S.gx.s(mx(mx(lx/m,.5,th)*(1+1.8*S.cw.x),0,S.lk.x),dt);S.gy.s(mx(mx(ly/m,-.8,th),.15,S.lk.x),dt);S.br.s(tt,dt);S.ms.s(tt?.1:msT,dt);S.mo.s(Math.max(tt,pls*.55),dt);
 /* badan mengikuti tangan: bahu menjangkau/naik ke arah tangan, torso condong ke rata-rata posisi tangan */
 var rF=[Sh[0]-8.5,Sh[1]+2.5-rol*9],rN=[Sh[0]+8.5,Sh[1]+2.5+rol*9],aF=shr(rF,FH,-1),aN=shr(rN,NH,1);S.tx.s(cl((NH[0]+FH[0]-200)*.08,-3.5,3.5),dt);S.ty.s(cl(((NH[1]+FH[1])/2-76)*.07,-1.2,1.6),dt);S.sfx.s(aF[0],dt);S.sfy.s(aF[1],dt);S.snx.s(aN[0],dt);S.sny.s(aN[1],dt);JF=[rF[0]+S.sfx.x,rF[1]+S.sfy.x];JN=[rN[0]+S.snx.x,rN[1]+S.sny.x];
 nb-=dt;if(nb<0){bl=.16;nb=2.4+Math.random()*3}if(bl>0)bl-=dt;blk=bl>0?Math.sin(Math.PI*(1-bl/.16)):0;
 if(end){var was=st;to('loop',{swap:was==='rev'});if(me.onEnd)me.onEnd(was)}
}

function shr(r,h,sg){var dx=h[0]-r[0],dy=h[1]-r[1],d=Math.hypot(dx,dy)||1,e=cl((d-15)/11,0,1),up=cl((r[1]+9-h[1])/14,0,1);return[dx/d*3.4*e+sg*.9*up,dy/d*2.6*e-2.4*up]}
function limb(P,w,a,col){X.beginPath();X.moveTo(P[0],P[1]);for(var i=2;i<P.length;i+=2)X.lineTo(P[i],P[i+1]);X.strokeStyle=C(cols.bg,.85*a);X.lineWidth=w+1.9;X.stroke();X.strokeStyle=C(col||cols.fg,a);X.lineWidth=w;X.stroke()}
function arm(sx,sy,h,a,sg){var e=ikS(sx,sy,h[0],h[1],15,14,sg);limb([sx,sy,e[0],e[1]],4.3,a,cols.sh);X.beginPath();X.arc(e[0],e[1],2.1,0,TAU);X.fillStyle=C(cols.sh,a);X.fill();limb([e[0],e[1],e[2],e[3]],2.5,a);X.beginPath();X.arc(e[2],e[3],2,0,TAU);X.fillStyle=C(cols.fg,a);X.fill();return[e[2],e[3]]}

function draw(){
 var w=cv.width,k=w/156,ac=cols.ac,a2=cols.a2,fg=cols.fg,bg=cols.bg,lp=.88+.12*Math.sin(t*.8),g,sx=Sh[0],sy=Sh[1],i;
 X.setTransform(1,0,0,1,0,0);X.clearRect(0,0,w,cv.height);X.setTransform(k,0,0,k,-16*k,6*k);X.lineCap=X.lineJoin='round';
 g=X.createRadialGradient(112,40,2,112,52,80);g.addColorStop(0,C(ac,.09*lp));g.addColorStop(1,C(ac,0));X.fillStyle=g;X.fillRect(16,-6,156,156);
 g=X.createLinearGradient(18,0,172,0);g.addColorStop(0,C(fg,0));g.addColorStop(.25,C(fg,.13));g.addColorStop(.85,C(fg,.13));g.addColorStop(1,C(fg,0));X.strokeStyle=g;X.lineWidth=.6;X.beginPath();X.moveTo(18,106.8);X.lineTo(172,106.8);X.stroke();
 /* badan */
 var fx0=JF[0]-(sx-8.5),fy0=JF[1]-(sy+2.5-rol*9),nx0=JN[0]-(sx+8.5),ny0=JN[1]-(sy+2.5+rol*9);X.beginPath();X.moveTo(sx-9.5+fx0,sy+3-rol*9+fy0);X.quadraticCurveTo(sx-9.5+fx0,sy-1.5-rol*9+fy0,sx-5,sy-1.5-rol*5+fy0*.4);X.lineTo(sx+5,sy-1.5+rol*5+ny0*.4);X.quadraticCurveTo(sx+9.5+nx0,sy-1.5+rol*9+ny0,sx+9.5+nx0,sy+3+rol*9+ny0);X.lineTo(sx+8,92);X.lineTo(sx-8,92);X.closePath();
 g=X.createLinearGradient(sx-9.5,0,sx+9.5,0);g.addColorStop(0,C(mc(cols.sh,bg,.3)));g.addColorStop(.6,C(cols.sh));g.addColorStop(1,C(mc(cols.sh,a2,.05+.25*lp)));X.fillStyle=g;X.fill();X.strokeStyle=C(fg,.35);X.lineWidth=.7;X.stroke();
 limb([sx,sy-1,HC[0],HC[1]+4],2.1,1);
 /* kepala tampak depan */
 X.save();X.translate(HC[0],HC[1]);X.rotate(hq+rol*.6);
 g=X.createRadialGradient(-2,-2,1,0,0,7.5);g.addColorStop(0,C(mc(bg,fg,.16),.98));g.addColorStop(1,C(bg,.98));
 X.beginPath();X.arc(0,0,6.8,0,TAU);X.fillStyle=g;X.fill();X.strokeStyle=C(fg);X.lineWidth=1.9;X.stroke();
 X.beginPath();X.arc(0,0,5.6,-1.1,.6);X.strokeStyle=C(a2,.4*lp);X.lineWidth=.9;X.stroke();
 X.fillStyle=C(fg);X.strokeStyle=C(fg);X.lineWidth=.9;
 [-2.7,2.7].forEach(function(ox){var ex=ox+S.gx.x*.9,ey=-.3+S.gy.x*.9,m=S.br.x*.7,dr=ox<0?1:-1;
  X.beginPath();X.ellipse(ex,ey,.95,Math.max(.1,.95*(1-Math.max(blk,S.ec.x))),0,0,TAU);X.fill();
  X.beginPath();X.moveTo(ex-1.6,ey-2.5+m*dr);X.lineTo(ex+1.6,ey-2.5-m*dr);X.stroke()});
 var mo=S.mo.x;X.globalAlpha=cl(1-mo,0,1);X.beginPath();X.moveTo(-1.8,3.3);X.quadraticCurveTo(0,3.3+2.6*S.ms.x,1.8,3.3);X.stroke();
 X.globalAlpha=cl(mo,0,1);X.beginPath();X.ellipse(0,3.5,.9,1.1,0,0,TAU);X.stroke();X.globalAlpha=1;X.restore();
 /* meja (tampak depan, sedikit dari atas) — kilau tepi bergeser pelan */
 X.beginPath();X.moveTo(44,70);X.lineTo(156,70);X.lineTo(162,85);X.lineTo(38,85);X.closePath();g=X.createLinearGradient(0,70,0,85);g.addColorStop(0,C(mc(mc(cols.s3,ac,.14),fg,.12)));g.addColorStop(1,C(mc(cols.s3,bg,.2)));X.fillStyle=g;X.fill();X.strokeStyle=C(fg,.2);X.lineWidth=.6;X.stroke();
 g=X.createLinearGradient(0,85,0,106);g.addColorStop(0,C(cols.s3,.95));g.addColorStop(.5,C(cols.s3,.7));g.addColorStop(1,C(cols.s3,0));X.fillStyle=g;X.fillRect(38,85,124,21);
 var ex0=100+26*Math.sin(t*.45);g=X.createLinearGradient(ex0-42,0,ex0+42,0);g.addColorStop(0,C(a2,0));g.addColorStop(.5,C(a2,.55*lp));g.addColorStop(1,C(a2,0));X.strokeStyle=g;X.lineWidth=.8;X.beginPath();X.moveTo(40,85.1);X.lineTo(160,85.1);X.stroke();
 /* tumpukan kertas kosong di kiri meja: lembar baru selalu diambil dari sini */
 for(i=3;i>=0;i--){X.beginPath();SQ.forEach(function(p,n){n?X.lineTo(p[0],p[1]+i*.7):X.moveTo(p[0],p[1]+i*.7)});X.closePath();X.fillStyle=C(cols.pap,i?.42:.55);X.fill();X.strokeStyle=C(bg,.4);X.lineWidth=.4;X.stroke()}
 /* kertas + tulisan */
 var pa=pg.a;if(pa>.01){
  X.save();X.translate(.8,1);X.beginPath();Q.forEach(function(p,n){n?X.lineTo(p[0],p[1]):X.moveTo(p[0],p[1])});X.closePath();X.fillStyle=C([0,0,0],.3*pa);X.fill();X.restore();
  X.beginPath();Q.forEach(function(p,n){n?X.lineTo(p[0],p[1]):X.moveTo(p[0],p[1])});X.closePath();X.fillStyle=C(cols.pap,.94*pa);X.fill();X.strokeStyle=C(bg,.35*pa);X.lineWidth=.5;X.stroke();
  inkDraw(Q,ink,pa)}
 /* kertas sobek: dua bagian berputar di ujung sobekan, tepi putih bergerigi memanjang ke bawah */
 if(tr){if(!tr.f){var W0=tr.W[0],e0=Math.round(tr.k0*tr.n);X.beginPath();for(i=e0;i<=tr.n;i++)i>e0?X.lineTo(W0[i][0],W0[i][1]):X.moveTo(W0[i][0],W0[i][1]);X.strokeStyle=C(cols.pap,.95);X.lineWidth=1.8;X.stroke()}
  tr.B.forEach(function(b){var P2=tr.P[b.s<0?0:1],W=tr.W[b.s<0?0:1],a=tr.f?cl(1.35-b.l*.65,0,1):1,e=tr.f?tr.n:Math.round(tr.k0*tr.n),n;if(a<.01)return;
   X.save();X.globalAlpha=a;X.translate(b.cx,b.cy);X.rotate(b.r);X.translate(-b.c0[0],-b.c0[1]);
   X.beginPath();P2.forEach(function(p,n){n?X.lineTo(p[0],p[1]):X.moveTo(p[0],p[1])});X.closePath();X.fillStyle=C(cols.pap,.95);X.fill();
   X.save();X.clip();inkDraw(tr.q,tr.k,1);X.restore();
   X.beginPath();for(n=0;n<=e;n++)n?X.lineTo(W[n][0],W[n][1]):X.moveTo(W[n][0],W[n][1]);X.strokeStyle='rgba(255,255,255,.85)';X.lineWidth=.6;X.stroke();X.restore()})}
 /* lengan + pena */
 arm(JF[0],JF[1],FH,.9,1);
 var hp=arm(JN[0],JN[1],NH,1,-1),pw=1,pt=[mx(hp[0]+1.2,tipS[0],pw),mx(hp[1]+2.6,tipS[1]-S.lf.x,pw)],pdx=hp[0]-pt[0],pdy=hp[1]-1-pt[1],pm=Math.hypot(pdx,pdy)||1;
 X.beginPath();X.moveTo(pt[0]+pdx/pm*6.6,pt[1]+pdy/pm*6.6);X.lineTo(pt[0],pt[1]);var hgp=S.hg.x,pA=(1-hgp)*(1-S.ho.x);if(st==='ok'&&hgp>.04){if(!penR)penR=[pt[0],pt[1],pdx/pm,pdy/pm];pA=0;var fl=es(cl(hgp*1.6,0,1)),qx=mx(penR[2],.96,fl),qy=mx(penR[3],.28,fl),qm=Math.hypot(qx,qy)||1;X.beginPath();X.moveTo(penR[0]+qx/qm*6.6,penR[1]+qy/qm*6.6);X.lineTo(penR[0],penR[1]);X.strokeStyle=C(ac,1);X.lineWidth=1.1;X.stroke()}else if(hgp<.01)penR=null;X.strokeStyle=C(ac,pA);X.lineWidth=1.1;X.stroke();
 X.beginPath();X.arc(pt[0],pt[1],.7,0,TAU);X.fillStyle=C(a2,pA);X.fill();
 /* cahaya aditif */
 X.globalCompositeOperation='lighter';
 g=X.createRadialGradient(100,80,0,100,80,36);g.addColorStop(0,C(a2,.2*lp));g.addColorStop(1,C(a2,0));X.fillStyle=g;X.beginPath();X.ellipse(100,80,38,12,0,0,TAU);X.fill();
 var gw=S.wr.x*S.pd.x;if(gw>.02){g=X.createRadialGradient(pt[0],pt[1],0,pt[0],pt[1],3.4);g.addColorStop(0,C(a2,.5*gw*lp));g.addColorStop(1,C(a2,0));X.fillStyle=g;X.beginPath();X.arc(pt[0],pt[1],3.4,0,TAU);X.fill()}
 X.globalCompositeOperation='source-over';
 
 var bs=S.bs.x;if(bs>.02){var A=(bt==='?'||bt==='!')?[HC[0]+11,HC[1]-8]:[HC[0]+15,HC[1]-12+(bt==='x'?Math.sin(t*2.4)*.8:0)];X.save();X.translate(A[0],A[1]);X.scale(bs,bs);
  if(bt==='?'||bt==='!'){X.fillStyle=C(bt==='!'?cols.red:a2);X.font='700 10px '+cols.font;X.textAlign='center';X.textBaseline='middle';X.fillText(bt,0,0)}
  else{X.beginPath();X.arc(0,0,6.2,0,TAU);X.fillStyle=C(bg,.95);X.fill();X.strokeStyle=C(bt==='x'?cols.red:ac);X.lineWidth=1.1;X.stroke();X.beginPath();
   if(bt==='x'){X.moveTo(-2.4,-2.4);X.lineTo(2.4,2.4);X.moveTo(2.4,-2.4);X.lineTo(-2.4,2.4)}else{X.moveTo(-2.6,.2);X.lineTo(-.7,2.3);X.lineTo(3,-2.2)}X.stroke()}
  X.restore()}
 /* titik "berpikir": muncul/hilang halus mengikuti bobot pose */
 if(S.th.x>.02)for(i=0;i<3;i++){X.beginPath();X.arc(HC[0]+10+i*3.6,HC[1]-9-i*2.3,.9+i*.2,0,TAU);X.fillStyle=C(fg,S.th.x*(.3+.5*Math.max(0,Math.sin(t*3.2-i*.9))));X.fill()}
}

function size(){var d=Math.min(window.devicePixelRatio||1,2),w=Math.round(cv.clientWidth*d),h=Math.round(cv.clientHeight*d);if(w&&(cv.width!==w||cv.height!==h)){cv.width=w;cv.height=h}}
function frame(now){if(!cv.isConnected)return;raf=requestAnimationFrame(frame);var dt0=Math.min(.05,last?(now-last)/1000:.016);dtS+=(dt0-dtS)*.4;var dt=dtS;last=now;if(document.hidden)return;if(!(fr++%60)||!cols){rc();size()}step(dt);draw()}
this.stop=function(){cancelAnimationFrame(raf);if(rzF)window.removeEventListener('resize',rzF);rzF=null};this.onEnd=this.onRow=this.onCount=this.onVerdict=this.onFix=null;this.speed=function(v){ts=v>0?v:1};this.go=function(){hold=0};this.hold=function(v){hold=v?1:0};this.revGo=function(){hold=0};this.time=function(){return sT};this.state=function(){return st};
function rvTot(){var w=rv.H;rv.it.forEach(function(m){w+=m.dur});return w+.9}
this.revLeft=function(){return(st==='rev'&&rv&&!hold)?Math.max(0,(rvTot()-sT)/ts):0};
this.busy=function(){if(st==='chk')return ck&&!ck.done?1:0;if(st==='rev'&&rv&&!hold)return sT<rvTot()?1:0;return 0};
this.set=function(s,o){to(s,o);if(o&&o.ts>0)ts=o.ts;if(red){for(var i=0;i<120;i++)step(1/30);draw()}};
rc();size();step(.016);draw();
if(red){for(var n=0;n<150;n++)step(1/30);draw()}else{raf=requestAnimationFrame(frame)}
rzF=function(){size();if(red)draw()};window.addEventListener('resize',rzF)
}
window.PBScene=Scene;
})();


// ── GEN LOGO LOADING (VIDEO) — pakai animasi brand yang sama persis dengan
// loading generate prompt foto (logo "P" dua layer gold yang menyatu), biar
// jeda generate prompt video terasa konsisten sebagai bagian dari aplikasi,
// bukan cuma spinner ikon generik. id gradient dibuat unik per pemanggilan
// (_genLogoSeq) supaya aman kalau ada lebih dari satu tombol loading sekaligus. ──
var _genLogoSeq=0;
// FIX (permintaan user): label DIRENDER LAGI — tapi kecil & di BAWAH logo
// P, bukan di samping seperti versi lama. Sebelumnya span label ini
// sengaja dihilangkan supaya loading cuma nampilin logo P, tapi itu bikin
// status "⏳ nunggu limit Google reset / server sibuk / koneksi sempat
// putus, mencoba lagi..." (dari updateGenLogoLabel, lihat _vbWaitReasonLabel)
// jadi TIDAK KELIHATAN sama sekali di UI walau nilainya sudah kehitung
// benar di JS — user cuma lihat logo diam berputar tanpa keterangan kenapa
// lama. Teks di-escape via esc() karena disisipkan sebagai HTML string.
function _buildGenLogoHTML(label){
  _genLogoSeq++;
  var wid='gen-logo-wrap-'+_genLogoSeq;
  var gid='genPGradV'+_genLogoSeq;
  var html='<div class="gen-logo-wrap" id="'+wid+'">'
    +'<div class="gen-logo-box">'
      +'<svg class="gen-logo-svg" viewBox="0 0 642 635" xmlns="http://www.w3.org/2000/svg">'
        +'<defs>'
          +'<linearGradient id="'+gid+'" x1="0" y1="0" x2="1" y2="1">'
            +'<stop offset="0%" stop-color="#F0D9A0"/>'
            +'<stop offset="100%" stop-color="#B8965F"/>'
          +'</linearGradient>'
        +'</defs>'
        +'<path class="p-layer p-layer-back" pathLength="1" fill="url(#'+gid+')" d="M146,92 L162,109 L179,119 L194,124 L206,126 L346,127 L373,134 L395,146 L386,133 L365,114 L343,102 L318,94 L306,92 Z M349,92 L361,96 L383,109 L401,126 L407,134 L417,154 L420,168 L431,184 L439,201 L444,219 L445,231 L481,231 L479,213 L470,183 L460,163 L443,140 L426,124 L402,108 L381,99 Z M253,195 L267,188 L293,183 L335,183 L345,185 L362,193 L375,205 L382,216 L387,229 L396,208 L399,184 L398,177 L379,162 L355,152 L331,149 L312,153 L285,166 L271,176 Z M291,150 L271,154 L251,161 L237,168 L216,182 L192,207 L182,223 L174,243 L169,271 L169,553 L203,534 L203,268 L208,239 L217,216 L233,192 L261,166 L277,156 Z M481,253 L445,253 L441,277 L435,293 L419,317 L403,333 L387,344 L370,352 L345,358 L279,359 L279,394 L325,394 L364,390 L391,381 L419,365 L447,339 L465,312 L477,281 Z"/>'
        +'<path class="p-layer p-layer-front" pathLength="1" fill="url(#'+gid+')" d="M415,201 L407,228 L397,245 L386,256 L383,267 L377,277 L360,293 L339,301 L259,302 L258,210 L243,224 L236,234 L227,254 L224,271 L224,519 L233,513 L249,497 L258,485 L258,337 L345,335 L364,330 L378,323 L393,312 L402,303 L413,287 L418,276 L423,257 L423,227 Z"/>'
      +'</svg>'
    +'</div>'
    +'<span class="gen-logo-label">'+esc(label||'')+'</span>'
  +'</div>';
  return{id:wid,html:html};
}
// Ganti isi tombol jadi animasi logo loading — LOOP TERUS-MENERUS via CSS
// @keyframes murni (class "looping", lihat definisi pLoopBack/pLoopFront di
// CSS): pecah(A) -> nyatu -> pecah(B, arah kebalikan) -> nyatu -> ulang,
// jalan terus sampai stopGenLogoBtn() dipanggil (skrip selesai/gagal).
// TIDAK pakai setInterval JS lagi (versi sebelumnya) — timer JS gampang kena
// jitter dari main-thread yang lagi sibuk, bikin animasinya kerasa "patah"
// pas transisi kepotong sebelum tuntas. Animasi CSS native jauh lebih presisi
// & mulus karena dijalankan browser sendiri, bukan diatur manual dari JS.
// ── LOADER SKRIP (stick figure) — menggantikan logo P KHUSUS di tombol Generate bulk ──
// Ceritanya mengikuti proses nyata di _vbRunBulkGenerate:
//   • loop   : menulis Hook → Story → CTA, selesai lalu pindah ke tumpukan  (selama batch berjalan)
//   • retry  : kaget, menyobek kertas, ambil kertas baru   (dipicu genLogoEvent('retry') di _vbGenerateWithFallback = ganti model)
//   • rev    : mencoret & mengganti kata                   (dipicu genLogoEvent('rev-start'/'rev-end') di _vbApplyShortFix = revisi jumlah kata)
//   • ok/err : tanda centang + "Prompt berhasil!" / coretan merah + wajah sedih (dipicu stopGenLogoBtn(btn,state,outcome))
// Kalau canvas / PBScene tidak tersedia, otomatis jatuh ke logo P lama.
var _GL_RT_MS=4800; // lama adegan "ganti model" (sama dengan file preview)
var _glActive=null; // loader yang sedang tampil (dipakai genLogoEvent)
function _glReduce(){try{return !!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);}catch(e){return false;}}
function _glSceneOK(){try{return typeof window.PBScene==='function'&&!!document.createElement('canvas').getContext;}catch(e){return false;}}
// tinggi tombol berubah halus saat isi berganti (tombol jadi lebih tinggi karena ada kanvas)
function _glMorph(btn,change){
  var h0=btn.getBoundingClientRect().height;
  btn.style.transition='none';btn.style.height=h0+'px';
  change();
  btn.style.height='auto';var h1=btn.getBoundingClientRect().height;
  btn.style.height=h0+'px';void btn.offsetHeight;
  btn.style.transition='height .55s cubic-bezier(.16,1,.3,1)';btn.style.height=h1+'px';
  setTimeout(function(){btn.style.height='';btn.style.transition='';},600);
}
function _buildGenSceneHTML(label){
  _genLogoSeq++;
  var wid='gen-logo-wrap-'+_genLogoSeq;
  return{id:wid,html:'<div class="gen-logo-wrap is-scene" id="'+wid+'">'
    +'<div class="gen-scene"><canvas class="gen-canvas" aria-hidden="true"></canvas></div>'
    +'<span class="gen-logo-label">'+esc(label||'')+'</span></div>'};
}
// ganti teks label (dengan fade halus di mode stick figure); aman kalau elemennya sudah dibuang
function _glSetLabel(st,t){
  var el=document.getElementById(st.wrapId),l=el&&el.querySelector('.gen-logo-label');
  if(!l)return;
  if(st.mode!=='scene'){l.textContent=t;return;}
  var k=st.lt=(st.lt||0)+1;
  l.style.opacity='0';
  setTimeout(function(){if(st.lt!==k||!l.isConnected)return;l.textContent=t;l.style.opacity='1';},180);
}
// kembali ke adegan menulis + label batch terakhir (setelah adegan ganti model / revisi selesai)
// ═════ TAMPILAN PENUH ANIMASI + KOTAK SKRIP REAL-TIME ═════
// (Nov 2026, permintaan user) Saat user klik Generate: stage menutup SELURUH layar (tampilan lain disembunyikan + dikunci dari fokus keyboard)
// dan baru dibuka lagi setelah adegan penutup (centang / gagal) benar-benar selesai. Isi kotak kiri-atas = data NYATA dari alur generate:
//   'check'      : semua skrip draf AI + jumlah katanya (dihitung dari teks aslinya) → yang kurang/lebih ditandai
//   'rev-call'   : daftar teks yang SEDANG dikirim ke AI untuk diperbaiki (teks + jumlah kata saat itu)
//   'rev-result' : balasan AI: teks baru, jumlah kata baru, dan kata yang disisipkan (muncul saat karakter menulis)
var _GS_ID='pb-gen-stage';
function _glBuildStage(label){
  var old=document.getElementById(_GS_ID);if(old&&old.parentNode)old.parentNode.removeChild(old);
  _genLogoSeq++;
  var el=document.createElement('div');el.id=_GS_ID;el.className='pb-gs';el.setAttribute('role','status');
  el.innerHTML='<div class="pb-gs-in"><div class="pbh" aria-hidden="true"></div><div class="gen-scene"><canvas class="gen-canvas" aria-hidden="true"></canvas></div><span class="gen-logo-label">'+esc(label||'')+'</span></div>';
  document.body.appendChild(el);
  var lock=[];
  Array.prototype.forEach.call(document.body.children,function(c){
    if(c===el||c.id==='toast'||/^(SCRIPT|STYLE|LINK)$/.test(c.tagName)||c.inert)return;
    // dialog/overlay fixed (mis. modal peringatan yang bisa muncul saat generate) jangan dikunci supaya tetap bisa diklik; nav tetap dikunci
    var isNav=c.tagName==='NAV'||/(^|\s)nav(\s|$)/.test(c.className||'');
    try{if(!isNav&&getComputedStyle(c).position==='fixed')return;}catch(e){}
    c.inert=true;lock.push(c);
  });
  el._lock=lock;
  document.documentElement.classList.add('pb-gen-focus');
  void el.offsetWidth;el.classList.add('on');
  return el;
}
function _glCloseStage(immediate){
  var el=document.getElementById(_GS_ID);
  document.documentElement.classList.remove('pb-gen-focus');
  if(!el)return;
  (el._lock||[]).forEach(function(c){try{c.inert=false;}catch(e){}});el._lock=[];
  el.removeAttribute('id');
  if(immediate){if(el.parentNode)el.parentNode.removeChild(el);return;}
  el.classList.remove('on');
  setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},560);
}
// ── kotak skrip (HUD) ──
var _GH_L={hook:'Hook',story:'Story',cta:'CTA'};
function _ghW(t){return String(t==null?'':t).trim().split(/\s+/).filter(Boolean);}
function _ghBl(k){var h='',i;k=Math.min(Math.max(k|0,0),8);for(i=0;i<k;i++)h+='<u></u>';return h;}
function _ghTw(s){return '<span class="tw">'+esc(s)+'</span>';}
function _ghDiff(o,n){var ins=[],i=0,j;for(j=0;j<n.length;j++){if(i<o.length&&n[j]===o[i])i++;else ins.push(n[j]);}return ins;}
function _ghDir(h,n){return n<h.rg.min?1:((h.incLong&&n>h.rg.max)?-1:0);}
function _ghTally(h){if(h&&h.tEl)h.tEl.textContent=h.checked+'/'+h.rows.length;}
function _ghStart(st,info){
  var h=st.hud=st.hud||{},el=st.stage&&st.stage.querySelector('.pbh');
  if(!el||!info||!Array.isArray(info.arr))return false;
  var rg=info.range||{min:24,max:27},tg=rg.target||Math.round((rg.min+rg.max)/2);
  h.el=el;h.rg=rg;h.tg=tg;h.incLong=!!info.incLong;h.rows=[];h.by={};h.checked=0;h.live=true;
  h.multi=info.arr.filter(Boolean).length>1;
  info.arr.forEach(function(prod,pi){
    if(!prod)return;
    ['hook','story','cta'].forEach(function(k){
      var t=prod[k];if(!t)return;
      var w=_ghW(t),n=w.length,dir=_ghDir(h,n),r={id:pi+'-'+k,j:h.rows.length,k:k,w:w,n:n,dir:dir,ok:dir===0,lbl:_GH_L[k]||k,st:'idle',act:0,
        pi:pi,name:(info.batch&&info.batch[pi]&&info.batch[pi].nama)||prod.produk||('Produk '+(pi+1))};
      r.miss=Math.abs(tg-n);h.rows.push(r);h.by[r.id]=r;
    });
  });
  if(!h.rows.length)return false;
  el.innerHTML='<div class="pbh-h"><b>Cek jumlah kata</b><span class="pbh-t"></span></div><div class="pbh-rows"></div><div class="pbh-more"></div>';
  h.rowsEl=el.querySelector('.pbh-rows');h.tEl=el.querySelector('.pbh-t');h.mEl=el.querySelector('.pbh-more');
  _ghTally(h);_ghLay(h);return true;
}
function _ghEl(h,r){
  if(r.e)return r.e;
  var e=document.createElement('div');e.className='pbh-r';e.dataset.s='check';
  e.innerHTML='<div class="t"><b></b><span class="bd"></span><span class="c"></span></div><p></p><span class="bar"><s></s></span>';
  r.e=e;r.eb=e.querySelector('b');r.bd=e.querySelector('.bd');r.c=e.querySelector('.c');r.p=e.querySelector('p');r.bs=e.querySelector('s');
  r.eb.textContent=(h.multi?'P'+(r.pi+1)+' · ':'')+r.lbl;r.eb.title=r.name+' · '+r.lbl;
  h.rowsEl.appendChild(e);return e;
}
function _ghSet(h,r,s,bd,n,html){
  if(!r.e)return;
  r.e.dataset.s=s;r.bd.textContent=bd||'';r.c.textContent=n+'/'+h.tg;r.bs.style.width=Math.min(100,n/h.tg*100)+'%';
  if(html!=null)r.p.innerHTML=html;
}
function _ghSnip(h,r){return r.dir>=0?_ghTw('…'+r.w.slice(-3).join(' '))+'<span class="bk">'+_ghBl(r.miss)+'</span>':_ghTw('…'+r.w.slice(-4).join(' '));}
function _ghShow(h,r){r.st=r.dir>0?'short':'long';_ghSet(h,r,r.st,(r.dir>0?'kurang ':'lebih ')+r.miss,r.n,_ghSnip(h,r));}
function _ghLay(h){
  // kotak tidak boleh melebar sampai menutupi karakter: maksimal 3 baris tampil (prioritas: sedang dicek > menunggu/menulis > kurang/lebih > pas); sisanya diringkas
  if(!h||!h.rowsEl)return;
  var live=h.rows.filter(function(r){return r.e&&!r.gone;});
  var pr=function(r){return r.act?4:((r.st==='write'||r.st==='wait')?3:((r.st==='short'||r.st==='long')?2:1));};
  var keep=live.slice().sort(function(a,b){return pr(b)-pr(a)||b.j-a.j;}).slice(0,3),hidFl=0;
  live.forEach(function(r){
    var hide=keep.indexOf(r)<0;
    r.e.classList.toggle('hid',hide);
    if(hide&&pr(r)>=2)hidFl++;
  });
  h.mEl.textContent=hidFl?('+'+hidFl+' skrip lain'):'';
  h.el.classList.toggle('on',!!(h.live||live.length));
}
function _ghGone(h,r){
  if(!r.e||r.gone)return;
  r.e.classList.add('out');r.gone=1;
  setTimeout(function(){if(r.e&&r.e.parentNode)r.e.parentNode.removeChild(r.e);_ghLay(h);},560);
}
function _ghHide(st){var h=st.hud;if(h&&h.el){h.live=false;h.el.classList.remove('on');}}
// dipanggil oleh adegan cek kata (tiap skrip/tiap kata/hasil)
function _ghRow(st,j){var h=st.hud,r=h&&h.rows&&h.rows[j];if(!r)return;r.act=1;_ghEl(h,r);r.st='check';_ghSet(h,r,'check','',0,_ghTw(''));_ghLay(h);}
function _ghCount(st,j,w){var h=st.hud,r=h&&h.rows&&h.rows[j];if(!r||!r.e)return;_ghSet(h,r,'check','',w,_ghTw(r.w.slice(Math.max(0,w-5),w).join(' ')));}
function _ghVerdict(st,j){
  var h=st.hud,r=h&&h.rows&&h.rows[j];if(!r)return;
  r.act=0;h.checked++;_ghEl(h,r);
  if(r.ok){r.st='ok';_ghSet(h,r,'ok','✓ pas',r.n,_ghTw('…'+r.w.slice(-5).join(' ')));setTimeout(function(){_ghGone(h,r);},900);}
  else _ghShow(h,r);
  _ghTally(h);_ghLay(h);
}
// data nyata dari _vbRepairOutOfRange
function _ghRevCall(st,info){
  var h=st.hud;if(!h||!h.rows)return;
  (info.items||[]).forEach(function(it){
    var r=h.by[it.id];if(!r)return;
    r.w=_ghW(it.text);r.n=r.w.length;r.old=r.w.slice();r.dir=_ghDir(h,r.n)||1;r.ok=false;r.miss=Math.max(1,Math.abs(h.tg-r.n));r.pend=1;r.res=0;r.anim=0;
    _ghEl(h,r);_ghShow(h,r);
  });
  _ghLay(h);
}
function _ghWait(st){
  var h=st.hud;if(!h||!h.rows)return;
  h.rows.forEach(function(r){if(r.pend&&!r.res&&r.e){r.st='wait';_ghSet(h,r,'wait','menunggu',r.n,null);}});
  _ghLay(h);
}
function _ghFinal(h,r){
  r.pend=0;r.res=0;r.anim=0;
  if(r.w2){r.w=r.w2;r.n=r.n2;}
  r.dir=_ghDir(h,r.n);r.ok=r.dir===0;r.miss=Math.abs(h.tg-r.n);
  _ghEl(h,r);
  if(r.ok){r.st='fix';_ghSet(h,r,'fix','✓ pas',r.n,_ghTw('…'+r.w.slice(-5).join(' ')));setTimeout(function(){_ghGone(h,r);},1400);}
  else{if(!r.dir)r.dir=1;_ghShow(h,r);}
  _ghLay(h);
}
function _ghRevResult(st,info,instant){
  var h=st.hud;if(!h||!h.rows)return;
  (info.res||[]).forEach(function(x){
    var r=h.by[x.id];if(!r)return;
    r.w2=_ghW(x.text);r.n2=r.w2.length;r.ins=_ghDiff(r.old||r.w,r.w2);r.res=1;
  });
  h.rows.forEach(function(r){if(r.res&&(!r.anim||instant))_ghFinal(h,r);});
}
function _ghFix(st,line,f){
  var h=st.hud;if(!h||!h.rows)return;
  h.rows.forEach(function(r){
    if(!r.anim||r.line!==line||!r.res)return;
    if(f>=1){_ghFinal(h,r);return;}
    var m=r.ins.length,k=Math.min(m,Math.floor(f*m+1e-6)),v=Math.round(r.n+(r.n2-r.n)*f),o=r.old||r.w;
    r.st='write';
    _ghSet(h,r,'write',r.dir>0?'menulis…':'merapikan…',v,
      r.dir>0?'<span class="tw">'+esc('…'+o.slice(-3).join(' ')+' ')+'<i>'+esc(r.ins.slice(0,k).join(' '))+'</i></span><span class="bk">'+_ghBl(Math.max(0,r.miss-k))+'</span>'
             :_ghTw('…'+o.slice(-4).join(' ')));
  });
}
function _ghRevEnd(st){
  var h=st.hud;if(!h||!h.rows)return;
  h.rows.forEach(function(r){if(r.pend&&!r.res){r.pend=0;r.anim=0;if(r.e)_ghShow(h,r);}});
  _ghLay(h);
}
// ── alur adegan ──
function _glCheck(st,info){
  if(st.mode!=='scene'||!st.scene)return;
  if(st.phase==='retrying'){st.pchk=info;return;}
  if(!_ghStart(st,info))return;
  var h=st.hud,R=h.rows.length;
  if(_glReduce()){h.rows.forEach(function(r,i){_ghRow(st,i);_ghCount(st,i,r.n);_ghVerdict(st,i);});h.live=false;_ghLay(h);return;}
  st.phase='checking';st.chkDone=false;clearTimeout(st.chkT);
  var Tc=Math.min(8,Math.max(3.5,R*2.2)),per=Tc/R,G=Math.min(.45,per*.18),V=Math.min(.75,per*.3),W=0;
  h.rows.forEach(function(r){W+=r.n;});
  var wd=Math.max(.004,(Tc-R*(G+V))/Math.max(1,W));
  _glSetLabel(st,'Mengecek jumlah kata ('+R+' skrip)...');
  try{
    st.scene.set('chk',{ts:st.ts||1,wd:wd,G:G,V:V,items:h.rows.map(function(r){return{n:r.n,k:r.miss,dir:r.dir||1,ok:r.ok,lens:r.w.map(function(x){return x.length;})};})});
  }catch(eChk){
    // adegan cek kata gagal dimulai → jangan macet di status 'checking' (event revisi tertahan di antrean & penutup menunggu): lanjut seperti biasa
    console.warn('[genLogo] adegan cek kata gagal dimulai:',eChk);
    st.chkDone=true;h.live=false;_ghLay(h);
    if(st.phase==='checking')_glResume(st);
    return;
  }
  // pengawas: kalau adegan tidak pernah melapor selesai (mis. tab lama disembunyikan / error di tengah jalan), alur tetap dilanjutkan
  clearTimeout(st.chkW);
  st.chkW=setTimeout(function(){if(!st.closed&&st.phase==='checking'&&!st.chkDone)_glChkEnd(st);},Math.ceil(Tc*2000/Math.max(1,st.ts||1))+4000);
}
function _glChkEnd(st){
  if(st.closed||st.phase!=='checking')return;
  st.chkDone=true;clearTimeout(st.chkW);var h=st.hud;if(h){h.live=false;_ghLay(h);}
  if(st.evq&&st.evq.length){_glReplay(st);return;}
  var flagged=h&&h.rows&&h.rows.some(function(r){return !r.ok;});
  // ada yang perlu diperbaiki: tunggu permintaan perbaikan ke AI (rev-call); kalau tidak datang, kembali menulis
  st.chkT=setTimeout(function(){if(st.phase==='checking')_glResume(st);},flagged?2500:900);
}
// event perbaikan yang datang saat adegan cek kata / ganti model masih tampil ditahan, lalu diputar ulang BERURUTAN (data tidak pernah tertimpa)
function _glReplay(st){var q=st.evq||[];st.evq=[];q.forEach(function(x){if(st.closed||st.phase==='done')return;try{genLogoEvent(x[0],x[1]);}catch(eRp){console.warn('[genLogo] putar ulang event gagal:',eRp);}});}
function _glStartRev(st,info){
  if(st.closed||st.phase==='done'||!st.scene)return;
  clearTimeout(st.chkT);clearTimeout(st.waitT);
  var h=st.hud,anim=[],R=(h&&h.rows)?h.rows.length:0,first=Math.max(0,R-3),fresh=false;
  if(R){
    h.rows.forEach(function(r){r.anim=0;if(r.pend&&r.j>=first&&anim.length<3)anim.push(r);});
    if(!anim.length){fresh=true;h.rows.filter(function(r){return r.pend;}).slice(0,3).forEach(function(r){anim.push(r);});}
    anim.forEach(function(r,i){r.anim=1;r.line=fresh?i:(r.j%3);});
  }
  _ghRevCall(st,info); // simpan teks & jumlah kata yang SEDANG dikirim ke AI (data nyata)
  var qs=st.revRes||[];st.revRes=null;
  st.phase='revising';
  var got=qs.length>0;st.revGot=got;
  var mn=_glModelName(info.model);
  _glSetLabel(st,'Merevisi '+(info.n||'')+' teks'+(info.total>1?' (percobaan '+info.step+'/'+info.total+(mn?', '+mn:'')+')':(mn?' ('+mn+')':''))+'. Menunggu AI...');
  var items=anim.length?anim.map(function(r){return{j:r.line,k:Math.max(1,r.miss),dir:r.dir||1};}):(info.items||[]).slice(0,3).map(function(it,i){return{j:i,k:3,dir:1};});
  try{st.scene.set('rev',{ts:st.ts||1,hold:got?0:1,fresh:fresh,all:[],items:items});}
  catch(eRv){console.warn('[genLogo] adegan revisi gagal dimulai:',eRv);st.phase='loading';st.revGot=false;_glResume(st);return;}
  if(got){
    qs.forEach(function(ri){_ghRevResult(st,ri,_glReduce());});
    if(st.rev===0){var left=0;try{left=st.scene.revLeft();}catch(e){}st.revT=setTimeout(function(){if(st.phase==='revising'&&st.rev===0)_glResume(st);},Math.min(6000,left*1000+400));}
  }else if(R){
    st.waitT=setTimeout(function(){if(st.phase==='revising'&&!st.revGot)_ghWait(st);},((.6+.95*Math.max(1,items.length)+.15)*1000)/(st.ts||1));
  }
}
// kembali ke adegan menulis + label batch terakhir (setelah adegan ganti model / cek kata / revisi selesai)
function _glResume(st){
  if(st.closed||st.phase==='done')return;
  clearTimeout(st.chkT);
  if(st.pchk){var c=st.pchk;st.pchk=null;_glCheck(st,c);return;}
  st.phase='loading';st.revGot=false;
  if(st.revQ){var q=st.revQ;st.revQ=null;_glStartRev(st,q);_glReplay(st);return;}
  if(st.scene){try{if(st.scene.state()!=='loop')st.scene.set('loop',{ts:st.ts||1});}catch(e){}}
  var t=st.pending||st.last;st.pending=null;
  if(t)_glSetLabel(st,t);
  var h=st.hud;if(h&&h.el){h.live=false;_ghLay(h);}
  _glReplay(st);
}
function startGenLogoBtn(btn,label){
  if(!btn)return null;
  // adegan penutup (centang/gagal) run sebelumnya masih tampil → rapikan dulu, supaya origHTML yang disimpan bukan HTML loader
  if(btn._glState)_glRestore(btn._glState,true,false);
  var useScene=_glSceneOK(),stage=null;
  if(useScene){try{stage=_glBuildStage(label);}catch(eStage){console.warn('[startGenLogoBtn] stage gagal:',eStage);stage=null;useScene=false;}}
  var built=useScene?{id:_GS_ID}:_buildGenLogoHTML(label);
  var st={origHTML:btn.innerHTML,wrapId:built.id,btn:btn,mode:useScene?'scene':'logo',stage:stage,scene:null,
          phase:'loading',last:label||'',pending:null,rev:0,revT:0,rt:0,fin:0,closed:false,lt:0,
          t0:Date.now(),beats:[],ts:1,spT:0,revGot:false,hud:{},revQ:null,revRes:null,evq:[],pchk:null,chkDone:false,chkT:0,waitT:0,safe:0};
  btn.disabled=true;btn.classList.add('btn-loading');btn.setAttribute('aria-busy','true');
  if(!useScene)btn.innerHTML=built.html;
  void btn.offsetWidth;
  var w=document.getElementById(built.id);
  if(useScene){
    try{
      st.scene=new window.PBScene(stage.querySelector('canvas.gen-canvas'));
      st.scene.onRow=function(j){_ghRow(st,j);};
      st.scene.onCount=function(j,n){_ghCount(st,j,n);};
      st.scene.onVerdict=function(j){_ghVerdict(st,j);};
      st.scene.onFix=function(l,f){_ghFix(st,l,f);};
      st.scene.onEnd=function(nm){if(nm==='chk')_glChkEnd(st);};
      st.scene.set('loop');
    }catch(eScene){
      // gagal membuat kanvas → pakai logo P lama (seperti sebelumnya)
      console.warn('[startGenLogoBtn] loader stick figure gagal, pakai logo P:',eScene);
      _glCloseStage(true);st.stage=null;
      var b2=_buildGenLogoHTML(label);
      btn.innerHTML=b2.html;
      st.mode='logo';st.scene=null;st.wrapId=b2.id;
      var w2=document.getElementById(b2.id);if(w2)w2.classList.add('looping');
    }
  }else if(w){
    w.classList.add('looping');
  }
  // pengaman terakhir: stage tidak boleh menutup layar selamanya
  st.safe=setTimeout(function(){if(st.closed)return;_glRestore(st,true,true);try{_vbRevealScriptBox(null,true);}catch(_eSv){document.documentElement.classList.remove('vb-gen-wait');}},15*60*1000);
  btn._glState=st;_glActive=st;
  return st;
}
// Update teks label kecil di bawah animasi saat proses masih berjalan (mis. progress "Batch 2/4..."
// atau status "⏳ ..."). Selama adegan ganti-model / revisi sedang tampil, label-nya DITAHAN
// supaya tulisan adegan itu tidak langsung tertimpa; label terbaru dipasang begitu adegan selesai.
function updateGenLogoLabel(state,label){
  if(!state||state.closed)return;
  if(state.phase==='done')return;
  if(state.phase==='retrying'||state.phase==='revising'||state.phase==='checking'){state.pending=label;return;}
  state.last=label;
  _glSetLabel(state,label);
}
// Dipanggil dari alur generate: 'retry' = ganti model, 'draft' = skrip pertama dari AI sudah masuk,
// 'rev-start'/'rev-end' = pembungkus perbaikan kata, 'rev-call' = SATU permintaan perbaikan ke AI baru dikirim,
// 'rev-result' = balasan perbaikan sudah diproses (info: {n,step,total,model} / {left,total}).
// Tidak melakukan apa pun bila tidak ada loader yang sedang tampil (mis. generate 1 produk).
// (26 Okt 2026, permintaan user) Perbaikan kata & permintaan ulang ke AI sekarang tampil REAL-TIME: adegan "revisi"
// langsung muncul begitu permintaan dikirim (tanpa jeda 600ms), karakter menunggu balasan AI, lalu langsung menulis
// perbaikan begitu balasan datang. Kecepatan adegan menyesuaikan irama kejadian (_glBeat) supaya stick man tetap
// mengimbangi kalau semuanya berlangsung sangat cepat.
function _glModelName(k){try{return (k&&typeof PB_AI_MODELS!=='undefined'&&PB_AI_MODELS[k]&&PB_AI_MODELS[k].label)||'';}catch(e){return '';}}
// irama kejadian: makin rapat kejadiannya dalam 5 detik terakhir, makin cepat adegannya (kembali normal 2,6 dtk setelah sepi)
function _glBeat(st){
  if(!st||st.closed||!st.scene)return;
  var now=Date.now();
  st.beats=(st.beats||[]).filter(function(x){return now-x<5000;});st.beats.push(now);
  var n=st.beats.length,sp=n>=5?2.4:(n>=4?2:(n>=3?1.6:(n>=2?1.25:1)));
  st.ts=sp;
  try{st.scene.speed(sp);}catch(e){}
  clearTimeout(st.spT);
  st.spT=setTimeout(function(){if(st.closed||st.phase==='done')return;st.ts=1;try{st.scene.speed(1);}catch(e){}},2600);
}
// (31 Okt 2026, permintaan user) AI membalas cepat -> stick man juga cepat (adegan menulis langsung dipercepat saat draft pertama masuk,
// penutupnya ikut cepat lewat st.fastTs di stopGenLogoBtn). AI lambat -> kecepatan normal.
function _glFastAI(st){
  if(!st||st.closed||!st.scene||st.fastAI)return;
  st.fastAI=true;
  var el=Date.now()-(st.t0||Date.now());
  var f=el<4000?2.4:(el<8000?1.9:(el<14000?1.4:1));
  if(f<=1)return;
  st.fastTs=f;st.ts=Math.max(st.ts||1,f);
  try{st.scene.speed(st.ts);}catch(e){}
  clearTimeout(st.spT);
  st.spT=setTimeout(function(){if(st.closed||st.phase==='done')return;st.ts=1;try{st.scene.speed(1);}catch(e){}},4000);
}
function genLogoEvent(kind,info){
  var st=_glActive;
  if(!st||st.closed||st.phase==='done')return;
  info=info||{};
  if(kind==='retry'){
    if(st.phase!=='loading'&&st.phase!=='revising'&&st.phase!=='checking')return;
    clearTimeout(st.rt);clearTimeout(st.revT);clearTimeout(st.chkT);clearTimeout(st.waitT);
    _glBeat(st);
    st.phase='retrying';
    _glSetLabel(st,info.to?('Model error. Pindah ke '+info.to+'...'):'Model error. Pindah ke model lain...');
    st.rt=setTimeout(function(){if(st.phase==='retrying')_glResume(st);},st.scene?(_glReduce()?350:Math.max(1500,_GL_RT_MS/(st.ts||1))):1800);
    try{if(st.scene)st.scene.set('retry',{ts:st.ts||1});}catch(eRt){console.warn('[genLogo] adegan ganti model gagal dimulai:',eRt);}
  }else if(kind==='draft'){
    _glBeat(st);
    _glFastAI(st);
    updateGenLogoLabel(st,'Skrip dari AI sudah masuk. Mengecek jumlah kata...');
  }else if(kind==='check'){
    // data nyata: seluruh skrip draf AI + rentang kata → adegan cek kata + kotak skrip
    // putaran cek lain / revisi / ganti model masih tampil → tahan, putar ulang berurutan (HUD tidak tertimpa)
    if((st.evq&&st.evq.length)||st.phase==='retrying'||st.phase==='revising'||(st.phase==='checking'&&!st.chkDone)){if(kind==='check'){st.evq=st.evq.filter(function(x){return x[0]!=='check';});} /* satu putaran cek menunggu cukup: yang terbaru saja */
      st.evq.push([kind,info]);return;}
    _glBeat(st);
    _glCheck(st,info);
  }else if(kind==='rev-start'){
    st.rev++; // adegan revisi hanya dimulai kalau benar-benar ada permintaan ke AI (rev-call)
  }else if(kind==='rev-call'||kind==='rev-result'||kind==='rev-end'){
    // adegan lain (cek kata / ganti model) masih tampil → tahan event ini, putar ulang berurutan setelah adegannya selesai
    if((st.evq&&st.evq.length)||st.phase==='retrying'||(st.phase==='checking'&&!st.chkDone)){st.evq.push([kind,info]);return;}
    if(kind==='rev-call'){
      clearTimeout(st.revT);
      _glBeat(st);
      var left=0;
      try{left=(st.scene&&st.phase==='revising')?st.scene.revLeft():0;}catch(e){left=0;}
      if(left>0.05){ // tulisan perbaikan sebelumnya belum selesai → tunggu dulu (maks 8 dtk) supaya tidak terpotong
        st.revQ=info;
        st.revT=setTimeout(function(){var q=st.revQ;st.revQ=null;if(q&&st.phase==='revising')_glStartRev(st,q);},Math.min(8000,left*1000+120));
        return;
      }
      _glStartRev(st,info);
    }else if(kind==='rev-result'){
      _glBeat(st);
      var msg=info.left>0?('Revisi diterima. Masih '+info.left+' teks di luar rentang, mencoba lagi...'):'Revisi diterima. Semua teks sudah pas.';
      if(st.phase==='revising'&&!st.revQ){
        st.revGot=true;clearTimeout(st.waitT);
        _glSetLabel(st,msg);
        _ghRevResult(st,info,_glReduce()); // teks baru + jumlah kata baru dari balasan AI
        if(st.scene)st.scene.revGo();
      }else{
        (st.revRes=st.revRes||[]).push(info); // adegan revisi berikutnya belum mulai → hasil ditahan sampai siap
      }
    }else{
      st.rev=Math.max(0,st.rev-1);
      if(st.rev===0){
        if(!st.revQ)clearTimeout(st.revT); // timer itu = jadwal mulai putaran revisi berikutnya, jangan dibatalkan
        clearTimeout(st.waitT);
        _ghRevEnd(st);
        if(st.phase==='checking'&&st.chkDone){_glResume(st);}
        else if(st.phase==='revising'&&!st.revQ){
          var wait=0;
          if(st.scene){try{wait=st.revGot?st.scene.revLeft():0;}catch(e){wait=0;}}
          // biarkan tulisan perbaikan selesai dulu (maks 6 dtk) supaya adegannya tidak terpotong; kalau tidak ada balasan, langsung lanjut
          if(wait>0.05)st.revT=setTimeout(function(){if(st.phase==='revising'&&st.rev===0)_glResume(st);},Math.min(6000,wait*1000+400));
          else _glResume(st);
        }
      }
    }
  }
}
// Lepas loader & kembalikan tombol. Stage ditutup (fade) dan semua tampilan lain dibuka lagi.
function _glRestore(st,immediate,sync){
  if(!st||st.closed)return;
  st.closed=true;
  clearTimeout(st.rt);clearTimeout(st.revT);clearTimeout(st.fin);clearTimeout(st.spT);clearTimeout(st.chkT);clearTimeout(st.chkW);clearTimeout(st.waitT);clearTimeout(st.safe);
  try{if(st.scene)st.scene.stop();}catch(e){}
  var btn=st.btn;
  var apply=function(){
    btn.disabled=false;
    btn.removeAttribute('aria-busy');
    btn.classList.remove('btn-loading');
    if(!st.stage){btn.classList.remove('gen-has-scene');btn.innerHTML=st.origHTML;}
  };
  if(st.stage){_glCloseStage(immediate);apply();try{if(!immediate&&btn.isConnected)setTimeout(function(){if(document.activeElement===document.body||!document.activeElement)try{btn.focus({preventScroll:true});}catch(e){}},60);}catch(e){}}
  else if(immediate||st.mode!=='scene')apply();else _glMorph(btn,apply);
  if(btn._glState===st)btn._glState=null;
  if(_glActive===st)_glActive=null;
  // (31 Okt 2026) adegan penutup sudah selesai → baru sekarang kotak skrip dibuka (kecuali loader ini cuma diganti loader baru: immediate)
  if(st.revealBox&&!immediate){var _doRv=function(){try{_vbRevealScriptBox(null,true);}catch(_eRv2){document.documentElement.classList.remove('vb-gen-wait');}};try{requestAnimationFrame(function(){requestAnimationFrame(_doRv);});}catch(_eRaf){_doRv();}}
  // _vbSyncBulkMainButton() di akhir _vbRunBulkGenerate sempat tertolak karena tombol masih loading → jalankan lagi sekarang
  if(sync){try{if(typeof _vbSyncBulkMainButton==='function')_vbSyncBulkMainButton();}catch(e){}}
}
// Kembalikan tombol ke tampilan asli setelah proses selesai/gagal.
// outcome (opsional): 'ok' | 'partial' | 'err' → adegan penutup (centang / gagal) diputar dulu ±3 detik
// selagi tombol tetap terkunci, baru tombol dikembalikan. Tanpa outcome = langsung dikembalikan seperti dulu.
function stopGenLogoBtn(btn,state,outcome){
  if(!btn)return;
  var st=state||btn._glState;
  if(!st){btn.disabled=false;btn.classList.remove('btn-loading');return;}
  if(st.closed)return;
  if(outcome&&st.scene&&st.phase!=='done'){
    // (8 Nov 2026, permintaan user) loader tampil MINIMAL 5 detik sejak mulai (hanya untuk hasil berhasil/sebagian; gagal langsung ditutup)
    var _minWait=(outcome==='err'||st.minWaited)?0:Math.max(0,5000-(Date.now()-(st.t0||Date.now())));
    if(_minWait>0){st.minWaited=true;clearTimeout(st.fin);st.fin=setTimeout(function(){stopGenLogoBtn(btn,st,outcome);},_minWait);return;}
    if(outcome!=='err'&&st.scene&&!st.busyDone){var _bzy=false;
      /* pemulihan: status 'checking'/'revising' tanpa adegan yang benar-benar berjalan (mis. adegan gagal dimulai) tidak boleh membuat penutup menunggu */
      try{var _sst=st.scene.state();if(st.phase==='checking'&&_sst!=='chk'){st.chkDone=true;st.phase='loading';}if(st.phase==='revising'&&_sst!=='rev'&&!st.revQ){st.phase='loading';}if(st.phase==='loading'&&st.evq&&st.evq.length)_glReplay(st);}catch(_eR){}
      try{_bzy=!!st.scene.busy();}catch(_eB){}if(st.revQ||(st.evq&&st.evq.length))_bzy=true;if(_bzy){if(!st.busyT0){st.busyT0=Date.now();try{st.scene.speed(3);}catch(_eS){} /* percepat sisa animasi cek/revisi saja; adegan penutup tetap normal */}if(Date.now()-st.busyT0<25000){clearTimeout(st.fin);st.fin=setTimeout(function(){stopGenLogoBtn(btn,st,outcome);},120);return;}}st.busyDone=true;}
    clearTimeout(st.rt);clearTimeout(st.revT);clearTimeout(st.chkT);clearTimeout(st.chkW);clearTimeout(st.waitT);
    st.phase='done';
    try{_ghHide(st);}catch(_eH){}
    btn.setAttribute('aria-busy','false');
    var ok=(outcome==='ok');
    // (26 Okt 2026) adegan penutup ikut dipercepat kalau seluruh proses memang cepat / kejadian beruntun rapat — stick man mengimbangi
    var _el=Date.now()-(st.t0||Date.now());
    var _ets=ok?1:1.15; /* adegan penutup (kertas diperlihatkan) jalan normal agar gerakannya halus */
    clearTimeout(st.spT);
    st.scene.set(ok?'ok':'err',{ts:_ets});
    _glSetLabel(st,ok?'Selesai. Skrip siap dipakai.':(outcome==='partial'?'Sebagian skrip belum selesai.':'Gagal membuat prompt. Coba lagi ya.'));
    // FIX (laporan user: animasi belum selesai tapi layar sudah kosong lalu skrip baru muncul):
    // dulu penutupnya pakai timer jam-dinding (±1,3 dtk saat AI cepat), padahal waktu adegan dibatasi per-frame (dt maks 33ms) —
    // saat halaman berat (render kartu skrip) FPS turun, adegan baru jalan separuh lalu dipotong. Sekarang tombol baru dilepas
    // setelah WAKTU ADEGAN benar-benar sampai ujung (centang/ekspresi gagal tampil penuh) DAN ketikan skrip di kartu sudah tuntas,
    // lalu ditahan sebentar. Batas aman 6,5 dtk supaya tidak pernah macet.
    if(_glReduce()){st.fin=setTimeout(function(){_glRestore(st,false,true);},1400);return;}
    var _need=ok?4.2:3.3,_t0=Date.now();
    var _poll=function(){
      if(st.closed)return;
      var sc=_need;try{sc=st.scene.time();}catch(_e){}
      var typing=false;try{typing=!!(typeof _vbTypewriter!=='undefined'&&_vbTypewriter.timer);}catch(_e2){}
      var real=Date.now()-_t0;
      if(real>6500||(sc>=_need&&!typing)){st.fin=setTimeout(function(){_glRestore(st,false,true);},450);return;}
      st.fin=setTimeout(_poll,60);
    };
    _poll();
    return;
  }
  _glRestore(st,false,false);
}
