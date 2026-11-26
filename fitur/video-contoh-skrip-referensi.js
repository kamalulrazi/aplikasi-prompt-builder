// fitur/video-contoh-skrip-referensi.js — Video — daftar contoh skrip referensi dan cara memilihnya ke dalam prompt.
// (Nov 2026, permintaan user) SEMUA contoh bawaan lama (VB_REF_OPSI1..25 + VB_REFERENCE_OPTIONS_16 opsi 1-37) DIHAPUS.
// 21 Nov 2026: VB_REFERENCE_OPTIONS_16 diisi 12 skrip utama user (hook + cta). 26 Nov 2026: ditambah 21 skrip (Opsi 13-33), sebagian berkurung. Daftar 24 detik masih kosong. Kalau daftar kosong, blok REFERENCE tidak ditulis ke prompt (tidak error).
// Skrip utama boleh memuat isian dalam tanda kurung, mis. (kamera mendekat memperlihatkan ...); aturannya ada di baris CAMERA CUE system prompt
// (mode 1 produk + Bulk: video-prompt-sistem-dan-perbaikan-skrip.js; mode 2 suara: _vbBuildDuaSystemPrompt). AI menyalin bentuk kurung dari contoh persis (hanya produk/detailnya diganti).
// Cara menulis contoh berkurung: taruh kurung apa adanya di dalam teks hook/cta (juga di VB_REFERENCE_OPTIONS_DUA, di dalam salah satu dari 4 baris). Kurung tidak dihitung sebagai kata.
// Format satu opsi: {nama:'Opsi 1', def:'hook: ...\ncta: ...', combo:{}}  (combo opsional, kunci 'nadaKey|aksen' seperti sebelumnya).
// Skrip user sendiri ("Skrip Saya") tetap didahulukan lewat pbUserRefOpts() di _vbRefOpts().
// 23 Nov 2026 (permintaan user): mode "Campur dengan contoh bawaan". _vbRefOpts() kini memberi pbUserRefOpts() cara mengambil daftar bawaan (_vbRefBuiltin);
// saat mode campur, daftar yang dikembalikan = skrip user + contoh bawaan (satu array yang di-cache di pbUserRefOpts). Opsi milik user bertanda own:1.
// Tiap kali skrip diminta ke AI, SATU opsi dipilih acak tanpa pengulangan berurutan.
var VB_REFERENCE_HEAD='REFERENCE (MAIN SCRIPT): the sample below is a finished script for a DIFFERENT product. Use it as your base and rewrite it yourself for the product in DATA: keep its structure (what hook and cta each do, in the same order), sentence rhythm, casual voice, slang level and the way it talks to the viewer, but change the situation, wording and details so everything truly fits DATA. Never keep its product, its scenario or its exact sentences, and never mention its product. Product, use, daily problem and benefits come ONLY from DATA (benefits only from its advantages), and the script must say the product name from DATA. Pronouns and address follow Greeting/REGISTER, not the sample. If the sample tone or accent differs from DATA, use it for structure only. If a rule below conflicts with the sample, the rule wins. If a REVISION note includes a CURRENT SCRIPT, keep its wording and change only what the note asks.\n';

var VB_REFERENCE_OPTIONS=[];     // durasi 24 detik (3 bagian: hook, story, cta) — kosong
var VB_REFERENCE_OPTIONS_16=[
  {nama:'Opsi 1',
   def:'hook: '+"gak usah pusing lagi bun kalo kolong dapur bunda berantakan banget, tinggal pasang gorden ini aja langsung kelihatan rapi seketika, gimana bun? praktis kan??"+'\n'+'cta: '+"aku tuh suka banget ya sama motifnya, tuh liat aja, masih banget bun tampilannya. yok cek harganya di bawah siapa tau bunda beruntung dapat harga murah",
   combo:{}},
  {nama:'Opsi 2',
   def:'hook: '+"buat kalian nih ya yang suka penampilan ala cowok-cowok cool, nah pakek nih kemeja gini, aura kalian tuh bikin cewek-cewek ngelirik."+'\n'+'cta: '+"jahitannya mana rapi banget lagi tuh, terus bagian kerahnya juga oke banget sih ini, cek dulu harganya siapa tau lu hoki dapat harga murah",
   combo:{}},
  {nama:'Opsi 3',
   def:'hook: '+"kalo susah bobo malam nah coba peluk guling ini aja pas bobo, dijamin lo bakalan nyaman banget deh soalnya empuk banget terus lucu parah"+'\n'+'cta: '+"untuk harga segini sih udah lumayan banget ya apalagi ini gulingnya gede loh, liat tuh, yok besti cek dulu harganya di bawah siapa tau lu hoki",
   combo:{}},
  {nama:'Opsi 4',
   def:'hook: '+"piknik tapi bawa bekal di kresek? duh malu-maluin banget sih. mending pakek tas piknik ini aja, estetik muat banyak lagi. lo pasti bakalan puas"+'\n'+'cta: '+"bayangin ya lu sama keluarga piknik terus bawa tas ini pasti deh yang lain bakalan kepo banget minta spill harganya, cek di bawah ya",
   combo:{}},
  {nama:'Opsi 5',
   def:'hook: '+"ini buat tante-tante yang mau kelihatan simpel. tuh tinggal selempangin tas ini aja gaya lu bakalan naik drastis. para cowok pun bakalan klepek-klepek sih ini"+'\n'+'cta: '+"gak usah panik besti, harganya murah gila loh ini, aku sih gak tau ya apa si seller ini lagi khilaf atau gimana pokoknya harganya gila sih",
   combo:{}},
  {nama:'Opsi 6',
   def:'hook: '+"mau keliatan elegan tapi dompet tipis? nah ini nih solusinya, pakek clutch ini aja loh besti, murah banget bahkan harganya gak nyampe seporsi seblak loh"+'\n'+'cta: '+"lumayan banget kan? tuh mana cakep lagi clutchnya, buruan deh mumpung si seller lagi khilaf kasih harga, harga normalnya mah gak segini, cek di bawah ya",
   combo:{}},
  {nama:'Opsi 7',
   def:'hook: '+"kalo lagi nyari kemeja yang cocok buat musim hujan, nah aku rekomendasikan kemeja ini nih. cakep parah sih ini, bisa bikin gaya cool naik drastis"+'\n'+'cta: '+"aku gak paham sih ya bahannya dari apa tapi coba deh lo bayangin lo pakek ini pas ketemu pacar lo itu, duh pasti klepek-klepek deh",
   combo:{}},
  {nama:'Opsi 8',
   def:'hook: '+"buat yang sering pegel-pegel kalo duduk lama, bisa nih cobain bantal alas ini, gini-gini empuk banget loh, lo bakalan betah duduk seharian deh"+'\n'+'cta: '+"coba deketin(kamera mendekat memperlihatkan bantal alas) nah jadi dia itu bisa di ikat di kursi, jadi nanti gak bakalan mudah ke geser deh, coba cek harganya di bawah",
   combo:{}},
  {nama:'Opsi 9',
   def:'hook: '+"nah ini tuh cocok banget buat para insomnia ya, dijamin deh kalo lo bobo sama guling gemes ini bawaannya gak pengen bangun lagi deh"+'\n'+'cta: '+"(kamera mendekat memperlihatkan guling) liat tuh, se empuk ini loh, yakin gak mau? kemarin sih harganya mahal ya gak tau deh sekarang harganya berapa, coba cek",
   combo:{}},
  {nama:'Opsi 10',
   def:'hook: '+"pengen pakek jas hujan tapi gak cocok sama lu soalnya lu pakek rok terus jas hujannya malah modelan celana, pengen pakek jas hujan gini aja dong"+'\n'+'cta: '+"bro, sini lu deketin kameranya(kamera mendekat memperlihatkan jas hujan yang dipakai) jadi jas hujan ini agak beda ya, dia itu modelan gamis jadi aman banget kalo lu biasanya bepergian pakek rok, gimana?",
   combo:{}},
  {nama:'Opsi 11',
   def:'hook: '+"duh lucu banget lagi, sini deketin kameranya(kamera mendekat memperlihatkan bantal) liat deh besti, bayangin aja lu bobo sama bantal ini, dijamin banget deh lo gak mau bangun lagi"+'\n'+'cta: '+"(kamera mendekat memperlihatkan bantal guling) liat nih besti, empuk banget, yang gilanya itu harganya murah banget, aku gak tau ya apakah si seller lagi khilaf atau apa, cek dulu lu dapat harga berapa",
   combo:{}},
  {nama:'Opsi 12',
   def:'hook: '+"kalo lo pengen kaos murah tapi bahannya adem, nah ini rekomendasi dari gua, harganya gak sampai 60 ribu dan lu bisa dapat dua loh"+'\n'+'cta: '+"sini deketin kameranya(kamera mendekat ke arah kaos) tuh liat cakep abis kan, mau lu pakek buat nongkrong kek. kerja kek. ini tuh udah nyaman banget. cek dulu harganya di bawah",
   combo:{}},
  {nama:'Opsi 13',
   def:'hook: '+"gak akan ada yang peduli sama kamar lo kalo bukan lu yang rapihin, serius pernahkan kan barang-barang dimana-mana, makanya masukin kesini aja."+'\n'+'cta: '+"gua tau banget lemari lu udah penuh banget sampe-sampe selimut aja binging mau ditaruh dimana, makanya beli storage box ini, murah loh, cek harga dibawah",
   combo:{}},
  {nama:'Opsi 14',
   def:'hook: '+"lo jangan pernah harap kamar lo rapi kalo bad cover aja masih bertebaran dimana-mana, mending lo simpan aja dalam storage box ini, praktis banget"+'\n'+'cta: '+"udah cantik,cakep,estetik pula, teruss!! murah lagi harganya, bad cover lu tinggal masukin aja dalam storage box ini. cepetan lah guys cek harganya di bawah",
   combo:{}},
  {nama:'Opsi 15',
   def:'hook: '+"piknik tapi bawa kresek? kampungan kali kau. mending pakek tas pinkin ini lah, masa bawa kresek? diketawain kau entar ama orang-orang"+'\n'+'cta: '+"sini liat(kamera mendekat ke arah tas piknik) secakep apa tas nya, ayolah guys, jangan lah kau malu maluin kali, udah muak aku liat kau, gak mahal ini harganya, cek dibawah",
   combo:{}},
  {nama:'Opsi 16',
   def:'hook: '+"lu kalo mau kelihatan cool ngapain pakek bawa tas mahal-mahal, itu malah bikin gaya lu makin norak, mending bawa clutch simpel ini aja, tuh capek lagi"+'\n'+'cta: '+"dan harganya gak mahal lagi, cocok banget kalo lu mau kelihatan lebih simpel dan elegan, dan kemarin sih harganya gak segini (nunjuk kebawah)coba deh cek dibawah",
   combo:{}},
  {nama:'Opsi 17',
   def:'hook: '+"satu clutch ini bisa bikin tampilan lo makin elegan walaupun oufit lo biasa aja, ukurannya kecil tapi disitulah tampilan kelihatan makin cool karna simpel"+'\n'+'cta: '+"jadi kalo mau ke cafe atau ke mall tinggal taruh aja hp atau lipstik ke clucth ini, simpel banget kan? cek dulu harganya dibawah",
   combo:{}},
  {nama:'Opsi 18',
   def:'hook: '+"ransel anak baru sebulan dipakek malah pada koyak, makanya kalo beli ransel itu jangan cuma harganya yang murah lah, kualitasnya juga penting kayak ransel ini"+'\n'+'cta: '+"coba liat baik-baik sebagus apa ransel ini, di toko mana ada modelan kayak secakep ini ya, liat tuh bun baik baik dan cek harganya dibawah",
   combo:{}},
  {nama:'Opsi 19',
   def:'hook: '+"jangan pernah pakek gorden kolong dapur ini kalo kamu mau dapur kamu jadi estetik seketika, coba deh liat ya secakep apa nih gorden. tuhhh"+'\n'+'cta: '+"dari motifnya aja udah keliatan kalo ini tuh bukan gorden kaleng-kaleng ya, ditempat lain mana ada kayak gini, kalo adapun harganya jutaan, mending cek harga dibawah",
   combo:{}},
  {nama:'Opsi 20',
   def:'hook: '+"percuma.... kolong dapur berantakan itu akan selalu keliatan berantakan kalo gak ditutup sama gorden ini, liat tuuh motifnya, cakep abis kan bun?"+'\n'+'cta: '+"percuma.... kolong dapur berantakan itu akan selalu keliatan berantakan kalo gak ditutup sama gorden ini, liat tuuh motifnya, cakep abis kan bun?",
   combo:{}},
  {nama:'Opsi 21',
   def:'hook: '+"kalo kolong dapur keliatan berantakan coba pakek gorden ini deh bun. dijamin tamu yang datang gak ada yang tau kalo dibalik gorden dapur ini berantakan banget"+'\n'+'cta: '+"sini(kamera mendekat ke arah produk). cantik kan bun? manis banget sih ini, aku aja sampe geleng-geleng kepala loh, mana murah banget lagi harganya, cek aja dibawah",
   combo:{}},
  {nama:'Opsi 22',
   def:'hook: '+"jangan heran kenapa orang-orang pada suka pakek tas selempan harajuku, ya karna kece abis loh, tuh liat.. kece parah kan? lu pasti bakalan suka deh"+'\n'+'cta: '+"terus kalo lu mau kekampus kan tinggal selempangin aja, praktis banget sih. harganya juga gak mahalan banget, pokoknya sesuai lah, mending cek sendiri deh dibawah",
   combo:{}},
  {nama:'Opsi 23',
   def:'hook: '+"mau glowing tapi gak mau pakek ini? mending lu jauh-jauh aja deh sana jangan temenan sama gua. ayo lah ini demi kecantikan lu loh"+'\n'+'cta: '+"lu tinggal pakek rutin aja dijamin cowok lu bakalan ngajak ketemuan deh setiap hari, buruan deh gak usah peduliin harga kalo masalah kecantikan, cek dibawah",
   combo:{}},
  {nama:'Opsi 24',
   def:'hook: '+"kalo lo mau anak lo rajin sekolah beli aja ransel cantik ini bun, dijamin sikecil bakalan semangat terus setiap hari sekolah dan bunda makin senang deh"+'\n'+'cta: '+"liat nih( kamera bergerak mendekat ke produk), cantik kan bun, duh ini sih manis banget ya, cepat deh bun panggil sikecil biat dia liat, dan belinya dibawah ya",
   combo:{}},
  {nama:'Opsi 25',
   def:'hook: '+"cara nyaman bobo dimalam hari tuh pakek piyama lah besti, masa sih lu nyaman pakek kaos doang, mana bolong lagi, pake ini lah cantik banget"+'\n'+'cta: '+"liat tuh cantik banget sih ini, mana murah lagi harganya, ini satu set harganya murah banget loh, kalo gak percara cek sendiri deh di bawah",
   combo:{}},
  {nama:'Opsi 26',
   def:'hook: '+"satu-satunya cara jadi cewek elegan buat bikin mantan lo nyesel adalah pakek jam tangan ini besti, tuh liat deh, cakep parah sih ini, iya gak?"+'\n'+'cta: '+"aku gak tau ya bahannya dari apa, tapi liat deh tuh cool parah desainnya, mana murah lagi harganya, cek aja sekarang di bawah",
   combo:{}},
  {nama:'Opsi 27',
   def:'hook: '+"jangan pernah berani-berani bilang kolong dapur ini norak kalo lu belum punya ya, ini tuh bisa nutupin barang berantakan lu didapur, tuh liat deh"+'\n'+'cta: '+"kemarin sih harganya mahal banget ya tapi sekarang sih gak tau ya harganya berapa, semoga aja siseller gatau ya harganya lagi murah, yuk cek dibawah",
   combo:{}},
  {nama:'Opsi 28',
   def:'hook: '+"jangan ngaku anak kece kalo lu belum punya clutch kayak gini, duh ini sih manis banget ya apalagi dia tuh punya kesan kesan cool gitu"+'\n'+'cta: '+"kalo cuma bawa hp doang atau lipstik atau apapun itu ya cukup lah buat masukin ke sini, simpel kali ini. cek deh harganya dibawah",
   combo:{}},
  {nama:'Opsi 29',
   def:'hook: '+"nyesel banget baru nemu sekarang. kenapa gak dari dulu sih, liat dih, tuh estetik banget mana murah lagi harganya, wajib punya sih kalo mau tampil elegan"+'\n'+'cta: '+"jadi kalo di ajak nongki nih ya sama besti ya lu tinggal simpan aja hp atau lipstik ke dalam sini. praktis banget kan, ayok cek harganya dibawah",
   combo:{}},
  {nama:'Opsi 30',
   def:'hook: '+"yang tau gorden kalong dapur ini pasti udah pada paham, hmmmm sini liat, cantik kali kan motifnya, nah kalo kolong berantakan kan jadi ketutup nih"+'\n'+'cta: '+"bayangin pas ada keluarga suami datang, duhh lu pasti bakalan pd(percaya diri) banget sama dapur lu yang estetik, harganya murah loh, kalo harga normal ya, ck deh",
   combo:{}},
  {nama:'Opsi 31',
   def:'hook: '+"ini nih yang namanya defenisi murah tapi gak murahan. barang sepraktis ini loh, jadi kalo lemari lu udah penuh, nah tinggal taruh dalam sini aja"+'\n'+'cta: '+"apalagi bad cover dirumah sering pusing kan naruhnya dimana? nah bisa nih bunda coba apalagi harganya itu loh yang bikin gila, cek deh dikeranjang bawah",
   combo:{}},
  {nama:'Opsi 32',
   def:'hook: '+"gak heran sih glow ini bisa viral, karna emang sebagus ini loh, sini liat.. tuh besti lu wajib coba sih ini, gila sih"+'\n'+'cta: '+"gua ngiranya ini harganya nyampe lima ratusan loh, pas cek keranjang, ehhhh. kok murah banget, ini siseller gak salah input harga kan? cek dulu deh",
   combo:{}},
  {nama:'Opsi 33',
   def:'hook: '+"baju kotor masih aja ditaruh di ember? loh itu mah gaya jaman dulu banget loh, mana baunya nyebar kemana-mana lagi, mending kan pakek rotan ini aja"+'\n'+'cta: '+"jadi ya tinggal ditutup aja bun, baunya gak bakal nyebar kemana dan tampilannya pun estetik parah, aku sih gak tau harganya berapa, mending cek dibawah",
   combo:{}}
];  // durasi 16 detik (hook + cta). 12 skrip utama dari user (21 Nov 2026) + 21 skrip tambahan (Opsi 13-33, 26 Nov 2026), teks apa adanya
function _vbRefBuiltin(){return _vbIsDua()?VB_REFERENCE_OPTIONS_DUA:(_vb16()?VB_REFERENCE_OPTIONS_16:VB_REFERENCE_OPTIONS);}
function _vbRefOpts(){var _u=(typeof pbUserRefOpts==='function')?pbUserRefOpts(_vbRefBuiltin):null;if(_u)return _u;return _vbRefBuiltin();}
// 25 Okt 2026: contoh referensi diacak TANPA ulangan: semua opsi dikocok dulu, dipakai satu per satu (tiap panggilan AI = 1 opsi baru),
// baru dikocok lagi kalau habis; opsi pertama putaran baru dijamin beda dari opsi terakhir putaran sebelumnya.
var _vbRefBag=[],_vbRefLast=-1;
var _vbRefBagList=null;
// 13 Nov 2026 (audit): opsi contoh yang dipakai per produk disimpan (kunci = durasi|nama); saat REVISI (ada CURRENT SCRIPT) opsi yang sama dipakai lagi.
var _vbRefMemo={};
function _vbRefMemoKey(nama){return (typeof pbUserRefTag==='function'?pbUserRefTag():(typeof pbUserRefActive==='function'&&pbUserRefActive()?'own|':''))+(_vbIsDua()?'dua|':(_vb16()?'16|':'24|'))+String(nama||'').replace(/\s+/g,' ').trim().toLowerCase();}
function _vbPickReferenceIdx(){_vbPickReferenceOption();return _vbRefLast;}
function _vbPickReferenceOption(){
  var L=_vbRefOpts();
  if(!L||!L.length){_vbRefLast=-1;return null;} // daftar kosong: tidak ada contoh
  if(_vbRefBagList!==L){_vbRefBagList=L;_vbRefBag=[];_vbRefLast=-1;} // ganti durasi = daftar contoh beda, kocok ulang
  if(!_vbRefBag.length){
    var idx=[];for(var i=0;i<L.length;i++)idx.push(i);
    for(var a=idx.length-1;a>0;a--){var b=Math.floor(Math.random()*(a+1));var t=idx[a];idx[a]=idx[b];idx[b]=t;}
    if(idx.length>1&&idx[idx.length-1]===_vbRefLast){var t2=idx[idx.length-1];idx[idx.length-1]=idx[0];idx[0]=t2;}
    _vbRefBag=idx;
  }
  _vbRefLast=_vbRefBag.pop();
  return L[_vbRefLast]||L[0];
}
// v13.4 (16 Okt 2026, permintaan user): generate banyak produk sekaligus -> contoh referensi DIACAK PER PRODUK (semua opsi dibagi rata,
// tidak berulang berurutan lewat _vbDeal). Opsi yang terpakai ditulis SEKALI di system prompt (hemat token), tiap baris produk
// di DATA diberi tanda 'REF: Opsi N'. Produk tunggal tetap memakai satu opsi acak seperti sebelumnya.
function _vbRefKey(pitch,accent){
  var p=String(pitch==null?'':pitch).trim(),a=String(accent==null?'':accent).trim();
  var pk=(p==='toxic'||p==='snarky')?'toxic':(p==='bercanda'||p==='joking')?'joking':(p==='gaul'||p==='casual slang')?'gaul':p;
  return pk+'|'+a;
}
function _vbRefText(opt,k){
  if(!opt)return '';
  // Mode campur: opsi milik user (own:1) dan opsi bawaan masing-masing memakai opsi PERTAMA dari kelompoknya sebagai dasar combo,
  // jadi skrip user tidak pernah tertimpa combo bawaan (dan sebaliknya). Tanpa campuran, perilakunya sama dengan sebelumnya.
  var L0=_vbRefOpts()||[],base=L0[0]||{},bc;
  for(var bi=0;bi<L0.length;bi++){if(!!L0[bi].own===!!opt.own){base=L0[bi];break;}}
  bc=base.combo||{};
  var hit=(opt.combo&&opt.combo[k])||bc[k];
  if(!hit&&_vb16()){var pk0=String(k).split('|')[0];hit=(opt.combo&&opt.combo[pk0+'|neutral standard accent'])||bc[pk0+'|neutral standard accent'];} // 16 detik: aksen tanpa contoh -> pakai contoh nada yang sama versi netral
  return hit||opt.def||base.def||'';
}
function _vbPlanReferences(n){
  if(!_vbRefOpts().length)return []; // daftar kosong: _vbDeal tidak boleh dipanggil (loop tak berujung)
  var idx=[];for(var i=0;i<_vbRefOpts().length;i++)idx.push(i);
  return _vbDeal(idx,n);
}
function _vbReferenceBlockMulti(pitch,accent,plan){
  var k=_vbRefKey(pitch,accent),used=[];
  plan.forEach(function(i){if(used.indexOf(i)<0)used.push(i);});
  used.sort();
  used=used.filter(function(i){return _vbRefOpts()[i];});
  if(!used.length)return '';
  return VB_REFERENCE_HEAD.replace(/\n$/,' Each product in DATA is tagged with one sample (SAMPLE: Opsi N); use only that sample for that product and never mix samples.\n')
    +used.map(function(i){var o=_vbRefOpts()[i];return '['+o.nama+']\n'+_vbRefText(o,k);}).join('\n\n');
}
function _vbReferenceBlock(pitch,accent,forceIdx){
  var p=String(pitch==null?'':pitch).trim(),a=String(accent==null?'':accent).trim();
  var pk=(p==='toxic'||p==='snarky')?'toxic':(p==='bercanda'||p==='joking')?'joking':(p==='gaul'||p==='casual slang')?'gaul':p;
  var opt=(forceIdx!=null&&_vbRefOpts()[forceIdx])||_vbPickReferenceOption(),k=pk+'|'+a;
  if(!opt)return '';
  return VB_REFERENCE_HEAD+_vbRefText(opt,k);
}
