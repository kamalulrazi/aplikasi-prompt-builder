// fitur/foto-thumbnail-ilustrasi.js — (dulu js/28-thumb.js) dipindah dari <script id="thumb-js"> di index.html lama (baris 39830). Isi tidak diubah.
(function(){
const bottle=`<ellipse class="d" cx="0" cy="31" rx="19" ry="4" fill="none" stroke="rgba(217,184,118,.5)"/><path d="M-5-21H5V-16C13-14 15-9 15-2V24C15 28 12 30 8 30H-8C-12 30-15 28-15 24V-2C-15-9-13-14-5-16Z" fill="#17150F" stroke="url(#gP)" stroke-width="1.3" stroke-linejoin="round"/><rect x="-6" y="-31" width="12" height="10" rx="2.5" fill="#D9B876" stroke="url(#gP)" stroke-width="1.1"/><rect class="d" x="-9" y="3" width="18" height="15" rx="2" fill="none" stroke="#E9D298" stroke-width=".7" opacity=".7"/><path class="d" d="M-5 8H5M-5 12H2" stroke="#E9D298" stroke-width=".7" stroke-linecap="round" opacity=".7"/>`;
const GS='stroke="#C9A867"',K=(d,o=.6)=>`<path d="${d}" fill="none" ${GS} stroke-width="1" opacity="${o}"/>`,F=(d,f,o=1,so=.7)=>`<path d="${d}" fill="${f}" ${GS} stroke-opacity="${so}" stroke-width="1" opacity="${o}"/>`,GL=(x,y,rx,ry=rx)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#gL)"/>`;
const pf=(h,c,o)=>{let d=`M0 ${h}H340`;const q=(h-150)/148;for(let i=-8;i<=8;i++){const x=170+i*48;d+=`M${x} 298L${(170+(x-170)*q).toFixed(0)} ${h}`}for(const y of[h+14,h+36])d+=`M0 ${y}H340`;return `<path d="${d}" fill="none" stroke="${c}" opacity="${o}"/>`};
const vig='<rect width="340" height="298" fill="url(#vg)"/>';
const room=(w,f,dr,c='#C9A867')=>`<rect width="340" height="226" fill="url(#q${w})"/><rect y="226" width="340" height="72" fill="url(#q${f})"/>${pf(226,c,.3)}${K('M0 226H340',.5)}${dr}${vig}`;
const prod=(bg,pl,dr='')=>`<rect width="340" height="298" fill="url(#q${bg})"/>${pl?`<path d="M30 200H310L340 298H0Z" fill="url(#q${pl})"/>${K('M30 200H310',.5)}`:''}${dr}<ellipse cx="170" cy="222" rx="50" ry="7" fill="rgba(0,0,0,.35)"/>${vig}`;
const grain=(c,o)=>`<path clip-path="url(#qcp)" d="${Array.from({length:14},(_,i)=>`M0 ${206+i*7}H340`).join('')}" fill="none" stroke="${c}" opacity="${o}"/>`;
const ch=K('M170 34V46M146 62Q170 44 194 62M154 72Q170 60 186 72',.8)+'<circle cx="170" cy="47" r="2.4" fill="#F0D9A0"/><circle cx="152" cy="76" r="1.6" fill="#F0D9A0"/><circle cx="170" cy="80" r="1.6" fill="#F0D9A0"/><circle cx="188" cy="76" r="1.6" fill="#F0D9A0"/>';
const LK={
km:{n:'Kamar mewah',d:'Kepala ranjang beludru, lampu kristal, lantai marmer',sv:room('wk','fk',GL(170,58,100,48)+ch+F('M0 24C34 56 38 150 26 226H0Z','url(#qem)',.9)+F('M340 24C306 56 302 150 314 226H340Z','url(#qem)',.9)+F('M98 226V102Q98 88 112 88H228Q242 88 242 102V226Z','url(#qd)')+F('M80 226V206Q80 198 90 198H250Q260 198 260 206V226Z','#1E1710')+'<ellipse cx="134" cy="190" rx="27" ry="9" fill="#EDE3CB" opacity=".35"/><ellipse cx="206" cy="190" rx="27" ry="9" fill="#EDE3CB" opacity=".35"/>')},
ka:{n:'Kamar aesthetic',d:'Jendela besar, cahaya alami masuk ke kamar',sv:room('wc','fc',GL(250,130,84,76)+F('M196 48H306V206H196Z','rgba(240,217,160,.12)')+K('M251 48V206M196 126H306M196 48C190 100 192 160 184 214',.5)+F('M196 206L110 298H236Z','rgba(240,217,160,.07)',1,0)+F('M44 74H112V150H44Z','none')+K('M58 136Q78 84 98 136M300 226C296 204 298 184 302 164M300 204C288 198 282 188 280 176M300 196C312 190 318 180 318 168',.6)+F('M290 226H312L308 244H294Z','#17150F'))},
ks:{n:'Kamar ala Spanyol',d:'Dinding terakota, pintu lengkung, lantai ubin',sv:room('wt','ft',F('M110 226V120Q110 58 170 58Q230 58 230 120V226Z','#1D0E08')+GL(170,150,56,84)+K('M122 226V122Q122 72 170 72Q218 72 218 122V226M54 26V64M250 200H310M280 190V226',.5)+F('M44 64H64L60 94H48Z','rgba(240,217,160,.3)')+GL(54,80,26,30)+F('M250 226V190H310V226Z','#2A170E'),'#E0A070')},
rt:{n:'Ruang tamu mewah',d:'Pilar tinggi, sofa beludru, lampu gantung',sv:room('wg','fk',GL(170,52,100,44)+ch+[86,150,214].map(x=>F(`M${x} 196V70Q${x} 54 ${x+20} 54Q${x+40} 54 ${x+40} 70V196Z`,'rgba(240,217,160,.09)',1,.45)).join('')+[30,290].map(x=>F(`M${x} 226V84H${x+20}V226Z`,'#1A1713')+K(`M${x-6} 84H${x+26}M${x-4} 76H${x+24}M${x-6} 226H${x+26}`,.7)).join('')+F('M64 226V198Q64 188 76 188H264Q276 188 276 198V226Z','url(#qem)')+K('M64 206H276',.4))},
tr:{n:'Teras rumah mewah',d:'Lantai marmer, pagar ornamen, taman saat golden hour',sv:room('wy','fm','<circle cx="262" cy="150" r="46" fill="url(#gL)"/><circle cx="262" cy="150" r="12" fill="#F0D9A0" opacity=".7"/>'+[[24,150,30],[78,160,24],[236,158,26],[306,146,34],[160,172,20]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#123227" opacity=".9"/>`).join('')+K('M0 180H340M0 226H340'+Array.from({length:17},(_,i)=>`M${i*20+8} 180V226`).join(''),.55)+F('M8 226V210H34V226ZM306 226V210H332V226Z','#17150F')+'<circle cx="21" cy="200" r="14" fill="#123227"/><circle cx="319" cy="200" r="14" fill="#123227"/>')},
mb:{n:'Di dalam mobil mewah',d:'Jok belakang kulit quilted, plafon starlight, lampu ambient',sv:'<rect width="340" height="298" fill="#0C0B0E"/><g clip-path="url(#qws)"><rect y="30" width="340" height="52" fill="url(#qwy)"/><rect y="80" width="340" height="34" fill="#101014"/><path d="M0 80V68H20V60H36V72H54V56H70V70H94V62H108V74H134V66H150V76H190V64H206V72H230V58H246V70H272V62H288V74H316V66H340V80Z" fill="#14121A"/>'+[[44,76,4],[98,78,3],[236,76,4],[300,72,5],[146,79,2.5],[198,78,2.5]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#FFF1C8" opacity=".55"/>`).join('')+'<path d="M156 80H184L240 114H100Z" fill="#17161B"/><path d="M170 82V86M170 90V96M170 101V108" stroke="#F0D9A0" stroke-width="1.4" opacity=".6"/>'+K('M156 80L100 114M184 80L240 114',.35)+'</g><path d="M64 30L40 112M276 30L300 112" stroke="#08070A" stroke-width="14" fill="none"/>'+K('M70 32L46 112M270 32L294 112',.35)+F('M0 38L34 42L30 112H0Z','#14121A',1,.4)+F('M340 38L306 42L310 112H340Z','#14121A',1,.4)+K('M0 62H32M0 78H31M0 94H30M340 62H308M340 78H309M340 94H310',.35)+'<path d="M0 0H340V22Q170 32 0 22Z" fill="#0A090C"/>'+Array.from({length:18},(_,i)=>`<circle cx="${(i*53+17)%330+5}" cy="${(i*7)%14+3}" r="${i%3?.7:1.1}" fill="#F0D9A0" opacity=".7"/>`).join('')+GL(170,26,150,9)+'<path d="M0 22Q170 32 340 22" fill="none" stroke="#F0D9A0" stroke-width="1.4" opacity=".6"/><rect x="150" y="8" width="40" height="7" rx="3.5" fill="#F0D9A0" opacity=".45"/>'+GL(170,12,34,12)+F('M30 112Q30 104 40 104H300Q310 104 310 112V298H30Z','url(#qd)')+F('M148 74Q148 66 158 66H182Q192 66 192 74V104H148Z','url(#qd)')+F('M58 74Q58 66 68 66H98Q108 66 108 74V104H58Z','url(#qd)')+F('M232 74Q232 66 242 66H272Q282 66 282 74V104H232Z','url(#qd)')+K('M170 68V100M83 68V100M257 68V100',.35)+F('M30 200Q170 188 310 200V238H30Z','#1B1510')+K('M30 202Q170 190 310 202',.6)+'<path d="M0 238H340V298H0Z" fill="#0A090C"/>'+K('M0 238H340',.4)+F('M0 112H30V298H0ZM310 112H340V298H310Z','#12100D')+'<rect x="0" y="176" width="30" height="16" rx="5" fill="#1B1510" stroke="#C9A867" stroke-opacity=".5"/><rect x="310" y="176" width="30" height="16" rx="5" fill="#1B1510" stroke="#C9A867" stroke-opacity=".5"/>'+K('M14 120V170M14 196V232M326 120V170M326 196V232',.55)+GL(14,176,14,60)+GL(326,176,14,60)+vig},
cf:{n:'Cafe mewah',d:'Meja marmer, kursi beludru, cahaya hangat',sv:room('wk','fk',F('M214 200V104Q214 62 258 62Q302 62 302 104V200Z','rgba(240,217,160,.12)',1,.6)+K('M258 62V200M214 130H302',.4)+GL(258,130,62,72)+[[62,70],[130,52]].map(([x,y])=>K(`M${x} 24V${y}`,.7)+F(`M${x-14} ${y+14}Q${x} ${y-4} ${x+14} ${y+14}Z`,'#D9B876',.9)+GL(x,y+22,24,22)).join('')+'<ellipse cx="62" cy="206" rx="40" ry="9" fill="#EDE3CB" opacity=".22" stroke="#C9A867" stroke-opacity=".6"/>'+K('M62 215V240M44 240H80',.6)+F('M280 226V196Q280 184 292 184H316Q326 184 326 196V226Z','url(#qem)'))}};
const LP={
pw:{n:'Backdrop putih bersih',d:'Latar putih polos, bersih dan terang',sv:prod('pw')},
pg:{n:'Backdrop abu netral',d:'Latar abu polos, permukaan netral',sv:prod('pa')},
pb:{n:'Backdrop hitam matte',d:'Latar hitam doff, nuansa mewah dan dramatis',sv:prod('pn')},
pm:{n:'Permukaan marmer',d:'Marmer putih, bersih dan mewah',sv:prod('wg','mb','<path clip-path="url(#qcp)" d="M60 206C110 214 150 240 220 232S300 250 330 280M20 270C60 250 100 262 140 286" fill="none" stroke="#7A7A86" opacity=".3"/>')},
pl:{n:'Kain linen natural',d:'Alas kain linen, kesan natural dan hangat',sv:prod('wg','ln',grain('#8A7B62',.22))},
pk:{n:'Meja kayu terang',d:'Serat kayu terang, gaya Skandinavia',sv:prod('wg','wl',grain('#8A6A3E',.3))},
pd:{n:'Meja kayu gelap',d:'Kayu walnut gelap, hangat dan premium',sv:prod('wg','wd',grain('#150B05',.45))},
pc:{n:'Permukaan beton',d:'Tekstur beton, kesan urban modern',sv:prod('wg','cn','<ellipse cx="90" cy="250" rx="60" ry="14" fill="#fff" opacity=".07"/><ellipse cx="260" cy="270" rx="70" ry="16" fill="#000" opacity=".12"/>')},
fl:{n:'Flat lay bunga kering',d:'Bunga dan daun kering di sekeliling produk',sv:prod('bn','','<g fill="none" stroke="#8A7457" stroke-width="1.2"><path d="M40 298C44 258 52 226 62 200M62 298C64 264 76 240 94 226M300 298C294 262 284 236 272 214M280 298C284 270 298 248 314 240M62 230C48 224 42 214 44 206M274 244C288 238 296 228 296 220"/></g><circle cx="62" cy="196" r="7" fill="#EADFCB" stroke="#B49C7A"/><circle cx="94" cy="222" r="6" fill="#D9C2A3" stroke="#B49C7A"/><circle cx="272" cy="210" r="7" fill="#EADFCB" stroke="#B49C7A"/><circle cx="314" cy="237" r="6" fill="#D9C2A3" stroke="#B49C7A"/>')},
tn:{n:'Nampan kayu lifestyle',d:'Produk di nampan kayu dengan dekor kecil',sv:prod('bn','','<ellipse cx="170" cy="238" rx="120" ry="36" fill="#8C6A44" stroke="#C9A867"/><ellipse cx="170" cy="236" rx="108" ry="29" fill="#7A5A38"/><rect x="236" y="206" width="24" height="26" rx="4" fill="#F1E8D8" stroke="#B49C7A"/><path d="M80 238C84 222 96 218 106 220C102 232 94 238 80 238Z" fill="#6E8A62" stroke="#4E6A44"/>')},
mv:{n:'Flat lay morning vibes',d:'Produk di samping kopi pagi dan buku catatan',sv:prod('bn','','<g transform="rotate(-7 92 236)"><rect x="46" y="206" width="92" height="60" rx="4" fill="#CBB79A" stroke="#A89270"/><path d="M58 224H124M58 236H116M58 248H108" stroke="#A89270" opacity=".7"/></g><path d="M228 200H274L270 232H232Z" fill="#F6F1E8" stroke="#B49C7A"/><path d="M274 208Q290 210 288 222T272 228M244 192Q238 182 244 172M258 192Q252 182 258 172" fill="none" stroke="#B49C7A"/>')},
bs:{n:'Di atas bedsheet',d:'Di atas sprei putih, lembut dan bersih',sv:prod('bs','','<path d="M0 232C60 216 112 250 172 236S290 218 340 238V298H0Z" fill="rgba(0,0,0,.05)"/><path d="M0 262C70 248 130 276 200 262S300 250 340 264M0 120C80 104 150 136 240 118S320 104 340 112" fill="none" stroke="rgba(0,0,0,.1)"/>')},
gb:{n:'Gift box elegan',d:'Produk di atas gift box dengan pita emas',sv:prod('wg','','<path d="M96 214H244L262 236H78Z" fill="#4A3441" stroke="#C9A867"/><path d="M78 236H262V284H78Z" fill="#3A2A33" stroke="#C9A867"/><path d="M162 214H178L184 236H156Z" fill="#D9B876"/><path d="M156 236H184V284H156Z" fill="#C9A867"/>')},
sg:{n:'Studio gradient',d:'Studio minimalis, gradasi lembut',sv:prod('st','',GL(170,120,130,100)+'<ellipse cx="170" cy="224" rx="110" ry="14" fill="rgba(255,255,255,.09)"/>')},
kc:{n:'Pantulan kaca',d:'Permukaan kaca dengan pantulan halus',sv:prod('pn','','<path d="M30 200H310L340 298H0Z" fill="rgba(255,255,255,.06)"/>'+K('M30 200H310',.6)+`<g transform="translate(170 272) scale(1.77 -1.77)" opacity=".16">${bottle}</g>`)}};
const CU={n:'Lokasi sendiri',d:'',sv:room('wg','fc',K('M262 70c-14 0-24 10-24 24 0 18 24 42 24 42s24-24 24-42c0-14-10-24-24-24z',.7)+'<circle cx="262" cy="94" r="7" fill="none" stroke="#C9A867" opacity=".7"/>')};
const th=(M,k,pr)=>`<svg class="tbn" viewBox="0 0 340 298" preserveAspectRatio="xMidYMin slice" aria-hidden="true">${M[k].sv}${pr?`<g transform="translate(170 166) scale(1.77)">${bottle}</g>`:''}</svg>`;
const CL=['Pencahayaan sendiri','','#F0D9A0',50,10,.24,.2,.6,.4,''];
const LC6={
sc:['Siang Cerah','Cahaya siang terang, warna cerah dan tajam','#FFF1CF',50,0,.3,.12,1,.15,'sun'],
hj:['Hujan','Cahaya lembut, nada dingin, suasana hujan','#9DB8D6',50,0,.22,.38,.35,.45,'rain'],
md:['Mendung','Cahaya awan yang merata, tanpa bayangan keras','#C9CED6',50,10,.2,.22,.3,.8,''],
pg:['Pagi Hari','Cahaya pagi yang sejuk dengan kabut tipis','#BFE0F0',24,12,.26,.2,.6,.35,'haze sun'],
js:['Cahaya Jendela — Samping','Cahaya jendela dari samping, lembut dan terang','#FFE9C2',2,38,.34,.28,.6,.2,'win'],
jd:['Cahaya Jendela — Depan','Cahaya jendela dari depan, rata di wajah','#FFF0D4',50,45,.3,.18,.5,.7,'wf']};
const LP6={
wl:['Window light lembut','Cahaya jendela lembut dari samping, merata','#FFE9C2',4,40,.3,.24,.6,.4,'win'],
sc:['Siang cerah','Cahaya siang terang, warna produk hidup dan tajam','#FFF4D8',50,0,.32,.1,1,.15,'sun'],
gh:['Golden hour','Cahaya emas hangat dengan bayangan lembut','#F2B25A',92,55,.38,.3,.8,.1,'sun'],
mm:['Mendung merata','Cahaya merata tanpa bayangan, warna produk netral','#D3D6DB',50,15,.22,.14,.3,.85,''],
sb:['Softbox studio','Cahaya depan yang lembut, produk bersih dan tajam','#FFFFFF',50,18,.3,.1,.5,.55,'box'],
sd:['Side light dramatis','Cahaya kuat dari satu sisi, sisi lain gelap','#FFE3B0',2,45,.4,.5,.7,0,''],
rm:['Rim light premium','Cahaya dari belakang, garis tepi menyala','#FFF0C8',50,8,.2,.5,.9,0,'rim'],
sr:['Studio rata (e-commerce)','Cahaya rata tanpa bayangan, warna produk akurat','#FFFFFF',50,50,.24,.05,.3,.9,''],
dm:['Dark moody','Bayangan dalam, produk muncul dari kegelapan','#E8C98A',50,0,.2,.62,.8,0,'spot'],
cl:['Candlelight hangat','Cahaya lilin oranye hangat, suasana intim','#FF9A3C',22,66,.4,.45,.4,.05,'flame']};
const clp=(v,a,b)=>Math.min(b,Math.max(a,v));
function lth(k,pr){
const [,,c,x,y,a,,,fl,f]=(pr?LP6:LC6)[k],fs=f.split(' '),has=z=>fs.includes(z),u=(pr?'p':'c')+k,o=n=>n.toFixed(2),
fx=o(clp(.5+(x-50)/90,.1,.9)),fy=o(clp(.5+(y-38)/80,.08,.92)),ga=o(Math.min(.85,a*2.6)),
sx=(75-(x-50)*.35).toFixed(0),lx=(x*1.5).toFixed(0),ly=(y*.5+2).toFixed(0),rim=has('rim'),
sub=pr?'<g transform="translate(75 27) scale(.62)"><path d="M-5-21H5V-16C13-14 15-9 15-2V24C15 28 12 30 8 30H-8C-12 30-15 28-15 24V-2C-15-9-13-14-5-16Z"/><rect x="-6" y="-31" width="12" height="10" rx="2.5"/></g>':'<ellipse cx="75" cy="21" rx="8" ry="9.5"/><path d="M54 54C54 41 63 35 75 35S96 41 96 54Z"/>';
return `<svg class="tbn" viewBox="0 0 150 54" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>`
+`<linearGradient id="${u}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D1C22"/><stop offset="1" stop-color="#0E0E11"/></linearGradient>`
+`<radialGradient id="${u}a" cx="${x/100}" cy="${y/100}" r=".95"><stop offset="0" stop-color="${c}" stop-opacity="${ga}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`
+`<radialGradient id="${u}o" cx=".5" cy=".5" r=".78" fx="${fx}" fy="${fy}"><stop offset="0" stop-color="${c}"/><stop offset=".55" stop-color="${c}" stop-opacity="${o(.4+fl*.3)}"/><stop offset="1" stop-color="${c}" stop-opacity="${o(fl*.55)}"/></radialGradient><g id="${u}s">${sub}</g></defs>`
+`<rect width="150" height="54" fill="url(#${u}k)"/>`+(has('spot')?`<path d="M62 0H88L108 46H42Z" fill="${c}" opacity=".16"/>`:`<rect width="150" height="54" fill="url(#${u}a)"/>`)
+(has('haze')?'<rect y="24" width="150" height="30" fill="#CFE3EE" opacity=".13"/>':'')
+(has('rain')?`<path d="${Array.from({length:10},(_,i)=>`M${6+i*15} ${i*5%9}l-3 9`).join('')}" fill="none" stroke="#BCD3EA" stroke-width=".9" opacity=".5"/>`:'')
+(has('sun')?`<circle cx="${lx}" cy="${ly}" r="9" fill="${c}" opacity=".18"/><circle cx="${lx}" cy="${ly}" r="4.5" fill="${c}" opacity=".9"/>`:'')
+(has('box')?`<rect x="46" y="2" width="58" height="7" rx="2.5" fill="${c}" opacity=".85"/>`:'')
+(has('win')?`<rect x="3" y="7" width="14" height="30" rx="1.5" fill="${c}" opacity=".9"/><path d="M10 7V37M3 22H17" stroke="#141318" stroke-width="1.2"/>`:'')
+(has('wf')?`<g opacity=".55"><rect x="122" y="4" width="22" height="14" rx="1.5" fill="${c}"/><path d="M133 4V18M122 11H144" stroke="#141318"/></g>`:'')
+`<rect y="45" width="150" height="9" fill="#000" opacity=".28"/><ellipse cx="${sx}" cy="46" rx="17" ry="2.6" fill="#000" opacity="${o(.7-fl*.55)}"/>`
+`<use href="#${u}s" fill="#15130F" stroke="#C9A867" stroke-opacity=".3" stroke-width=".6"/><use href="#${u}s" fill="url(#${u}o)"${rim?' opacity=".3"':''}/>`
+(rim?`<use href="#${u}s" fill="none" stroke="${c}" stroke-width="3" opacity=".25"/><use href="#${u}s" fill="none" stroke="${c}" stroke-width="1.1"/>`:'')
+(has('flame')?'<rect x="31" y="38" width="3.4" height="9" rx=".8" fill="#E8D8BC"/><path d="M32.7 37C30 34 32 31 32.7 28C35 31 35.6 34.5 32.7 37Z" fill="#FFC15A"/>':'')
+'</svg>'}
var NM=function(t){return String(t||'').replace(/\s+/g,' ').trim().toLowerCase()};
var LOC={},LIT_K={},LIT_P={};
Object.keys(LK).forEach(function(k){LOC[NM(LK[k].n)]=[LK,k,false]});
Object.keys(LP).forEach(function(k){LOC[NM(LP[k].n)]=[LP,k,true]});
Object.keys(LC6).forEach(function(k){LIT_K[NM(LC6[k][0])]=k});
Object.keys(LP6).forEach(function(k){LIT_P[NM(LP6[k][0])]=k});
function setTh(chip,html){
  var ic=chip.querySelector('.pfa-ic');
  if(!ic){ic=document.createElement('span');ic.className='pfa-ic';ic.setAttribute('aria-hidden','true');chip.insertBefore(ic,chip.firstChild)}
  ic.classList.remove('wd');ic.classList.add('pfa-th');ic.innerHTML=html;
  chip.classList.add('pfa-thc');
  if(!chip.classList.contains('pfa-lt')&&!chip.classList.contains('pfa-t'))chip.classList.add('pfa-lt');
}
var LOCICO={km:'kmw',ka:'kas',ks:'ksp',rt:'rtm',tr:'trs',mb:'mbl'};
function setLocIco(chip,k){
  chip.querySelectorAll('.pfa-ic').forEach(function(x){x.remove()});
  var ic=document.createElement('span');ic.className='pfa-ic pfa-loc';ic.setAttribute('aria-hidden','true');
  ic.innerHTML='<svg class="lk-ico" viewBox="0 0 32 32"><use href="#lk-'+LOCICO[k]+'"/></svg>';
  chip.insertBefore(ic,chip.firstChild);chip.classList.add('pfa-lic');chip.classList.remove('pfa-thc');
}
/* PERMINTAAN USER (5 Nov 2026): Cara Tampil (#f3) & Pencahayaan (#f7) ikut memakai lencana ikon emas seperti Lokasi. */
var HLDICO={dipakai:'hwear',hanger:'hhang',tangan:'hhand'};
var LITICO={sc:'lsun',hj:'lrain',md:'lcloud',pg:'lmorn',js:'lwins',jd:'lwinf'};
function setIco(chip,id){
  chip.querySelectorAll('.pfa-ic').forEach(function(x){x.remove()});
  var ic=document.createElement('span');ic.className='pfa-ic pfa-loc';ic.setAttribute('aria-hidden','true');
  ic.innerHTML='<svg class="lk-ico" viewBox="0 0 32 32"><use href="#lk-'+id+'"/></svg>';
  chip.insertBefore(ic,chip.firstChild);chip.classList.add('pfa-lic');chip.classList.remove('pfa-thc');
}
function label(c){var t=c.cloneNode(true);var i=t.querySelector('.pfa-ic');if(i)i.remove();return NM(t.textContent)}
function thumbs(){
  document.querySelectorAll('#f5 .chip').forEach(function(c){
    if(c.dataset.thb)return;var e=LOC[label(c)];if(!e)return;c.dataset.thb='1';
    /* PERMINTAAN USER (5 Nov 2026): pilihan Lokasi = ikon lencana emas (Opsi D), BUKAN gambar. Berlaku di semua mode (bukan cuma tur). */
    if(!e[2]&&LOCICO[e[1]]){try{setLocIco(c,e[1])}catch(x){}return}
    try{setTh(c,th(e[0],e[1],e[2]))}catch(x){}
  });
  document.querySelectorAll('#f7 .chip').forEach(function(c){
    if(c.dataset.thb)return;var pr=!!c.closest('#f7-cahaya-chips'),k=(pr?LIT_P:LIT_K)[label(c)];if(!k)return;c.dataset.thb='1';
    if(!pr&&LITICO[k]){try{setIco(c,LITICO[k])}catch(x){}return}
    try{setTh(c,lth(k,pr))}catch(x){}
  });
  document.querySelectorAll('#f3 .chip').forEach(function(c){
    if(c.dataset.thb)return;
    var m=(c.getAttribute('onclick')||'').match(/fPickHold\('(\w+)'/),k=m?m[1]:(c.getAttribute('data-hold')||'');
    if(!HLDICO[k])return;c.dataset.thb='1';
    try{setIco(c,HLDICO[k])}catch(x){}
  });
}
/* lencana pose di panggung (seperti file preview) */
var PK=[[/mirror/,'mirror','Mirror'],[/selfie/,'selfie','Selfie'],[/duduk.*condong|condong.*duduk/,'lean-sit','Duduk condong'],[/condong/,'lean-stand','Condong'],[/duduk/,'sit','Duduk'],[/berdiri/,'stand','Berdiri']];
function poseBadge(){
  var st=document.getElementById('pst');if(!st||typeof FS==='undefined')return;
  var z=document.getElementById('pst-pz');
  if(!z){z=document.createElement('div');z.className='pz';z.id='pst-pz';z.setAttribute('aria-hidden','true');z.innerHTML='<svg viewBox="0 0 48 48"><use href="#pfa-p-stand"/></svg><span></span>';st.appendChild(z)}
  var _pp=window.pstPv?window.pstPv('pose'):undefined,t=String(_pp!==undefined?_pp:(FS.poseLabel||FS.pose||'')).toLowerCase(),hit=null;
  if(t&&FS.subjek&&FS.subjek!=='produk')for(var i=0;i<PK.length;i++)if(PK[i][0].test(t)){hit=PK[i];break}
  z.classList.toggle('on',!!hit);
  if(hit){z.querySelector('use').setAttribute('href','#pfa-p-'+hit[1]);z.querySelector('span').textContent=hit[2]}
}
var _ps=window.pstSync;
if(typeof _ps==='function')window.pstSync=function(){var r=_ps.apply(this,arguments);try{poseBadge()}catch(x){}return r};
var raf=0,sched=function(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;thumbs()})};
var f=document.getElementById('foto');
if(f&&window.MutationObserver)new MutationObserver(sched).observe(f,{childList:true,subtree:true});
var _po=window.pfaOpen;if(typeof _po==='function')window.pfaOpen=function(){var r=_po.apply(this,arguments);thumbs();return r};
thumbs();try{poseBadge()}catch(x){}
})();
