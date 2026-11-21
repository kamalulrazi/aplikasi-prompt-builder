// fitur/video-contoh-skrip-referensi.js — Video — daftar contoh skrip referensi dan cara memilihnya ke dalam prompt.
// (Nov 2026, permintaan user) SEMUA contoh bawaan lama (VB_REF_OPSI1..25 + VB_REFERENCE_OPTIONS_16 opsi 1-37) DIHAPUS.
// 21 Nov 2026: VB_REFERENCE_OPTIONS_16 diisi 12 skrip utama user (hook + cta). Daftar 24 detik masih kosong. Kalau daftar kosong, blok REFERENCE tidak ditulis ke prompt (tidak error).
// Skrip utama boleh memuat isian dalam tanda kurung, mis. (kamera mendekat memperlihatkan ...); aturannya ada di baris CAMERA CUE system prompt.
// Format satu opsi: {nama:'Opsi 1', def:'hook: ...\ncta: ...', combo:{}}  (combo opsional, kunci 'nadaKey|aksen' seperti sebelumnya).
// Skrip user sendiri ("Skrip Saya") tetap didahulukan lewat pbUserRefOpts() di _vbRefOpts().
// Tiap kali skrip diminta ke AI, SATU opsi dipilih acak tanpa pengulangan berurutan.
var VB_REFERENCE_HEAD='REFERENCE (MAIN SCRIPT): the sample below is a finished script for a DIFFERENT product. Use it as your base and rewrite it yourself for the product in DATA: keep its structure (what hook and cta each do, in the same order), sentence rhythm, casual voice, slang level and the way it talks to the viewer, but change the situation, wording and details so everything truly fits DATA. Never keep its product, its scenario or its exact sentences, and never mention its product. Product, use, daily problem and benefits come ONLY from DATA (benefits only from its advantages), and the script must say the product name from DATA. Pronouns and address follow Greeting/REGISTER, not the sample. If the sample tone or accent differs from DATA, use it for structure only. If a rule below conflicts with the sample, the rule wins. If a REVISION note includes a CURRENT SCRIPT, keep its wording and change only what the note asks.\n';

var VB_REFERENCE_OPTIONS=[];     // durasi 24 detik (3 bagian: hook, story, cta) — kosong
var VB_REFERENCE_OPTIONS_16=[
  {nama:'Opsi 1',
   def:'hook: '+"gak usah pusing lagi bun kalo kolong dapur bunda berantakan banget, tinggal pasang gorden ini aja langsung kelihatan rapi seketika, gimana bun? praktis kan??"+'\n'+'cta: '+"aku tuh suka banget ya sama motifnya, tuh liat aja, masih banget bun tampilannya. yok cek harganya di bawah siapa tau bunda beruntuh dapat harga murah",
   combo:{}},
  {nama:'Opsi 2',
   def:'hook: '+"buat kalian nih ya yang suka penampilan ala cowok-cowok cool, nah pakek nih nih kemeja gini, aura kalian tuh bikin cewek-cewek ngelirik."+'\n'+'cta: '+"jahitannya mana rapi banget lagi tuh, terus bagian kerahnya juga oke banget sih ini, cek dulu harganya siapa tau lu hoki dapat harga murah",
   combo:{}},
  {nama:'Opsi 3',
   def:'hook: '+"kalo susah bobo malam nah coba peluk guling ini aja pas bobo, dijamin lo bakalan nyaman banget deh soalnya empuk banget terus lucu parah"+'\n'+'cta: '+"untuk harga segini sih udah lumayan banget ya apalagi ini gulingnya gede loh, liat tuh, yok besti cek dulu harganya di bawah siapa tau lu hoki",
   combo:{}},
  {nama:'Opsi 4',
   def:'hook: '+"piknik tapi bawa bekal di kresek? duh malu-maluin banget sih. mending pakek tas piknik ini aja, estetik muat banyak lagi. lo pasti bakalan puas"+'\n'+'cta: '+"bayangin ya lu sama keluarga piknik terus bawa tas ini pasti deh yang lain bakalan kepo banget minta spill harganya, cek di bawah ya",
   combo:{}},
  {nama:'Opsi 5',
   def:'hook: '+"ini buat tante-tante yang mau kelihatan simpel. tuh tinggal selempangin tas ini aja gaya lu bakalan naik drastis. para cowokpun bakalan klepek-klepek sih ini"+'\n'+'cta: '+"gak usah panik besti, harganya murah gila loh ini, aku si gak tau ya apa siseller ini lagi khilaf atau gimana pokoknya harganya gila sih",
   combo:{}},
  {nama:'Opsi 6',
   def:'hook: '+"mau keliatan elegan tapi dompet tipis? nah ini nih solusinya, pakek clutch ini aja loh besti, murah banget bahkan harganya gak nyampe seporsi seblak loh"+'\n'+'cta: '+"lumayan banget kan? tuh mana cakep lagi clutch nya, buruan deh mumpung siseller lagi khilaf kasih harga, harga normalnya mah gak segini, cek dibawah ya",
   combo:{}},
  {nama:'Opsi 7',
   def:'hook: '+"kalo lagi nyari kemeja yang cocok buat musim hujan, nah aku rekomendasikan kemeja ini nih. cakep parah sih ini, bisa bikin gaya cool naik drastis"+'\n'+'cta: '+"aku gak paham sih ya bahannya dari apa tapi coba deh lo bayangin lo pakek ini pas ketemu pacar lo itu, duh pasti klepek-klepek deh",
   combo:{}},
  {nama:'Opsi 8',
   def:'hook: '+"buat yang sering pegel-pegel kalo duduk lama, bisa nih cobain bantal alas ini, gini-gini empuk banget loh, lo bakalan betah duduk seharian deh"+'\n'+'cta: '+"coba deketin(kamera mendekat memperlihatkan bantal alas) nah jadi dia itu bisa di ikat di kursi, jagi nanti gak bakalan mudah ke geser deh, coba cek harganya di bawah",
   combo:{}},
  {nama:'Opsi 9',
   def:'hook: '+"nah ini tuh cocok banget buat para insomnia ya, dijamin deh kalo lo bobo sama guling gemes ini bawaannya gak pengen bangun lagi deh"+'\n'+'cta: '+"(kamera mendekat mamperlihatkan guling) liat tuh, se empuk ini loh, yakin gak mau? kemarin sih harganya mahal ya gak tau deh sekarang harganya berapa, coba cek",
   combo:{}},
  {nama:'Opsi 10',
   def:'hook: '+"pengen pakek jas hujan tapi gak cocok sama kau soalnya lu pakek rok ter jas hujannya malah modelan celana, pengen pakek jas hujan gini aja dong"+'\n'+'cta: '+"bro, sini lu deketin kameranya(kamera mendekat memperlihatkan jas hujan yang dipakai) jadi jas hujan ini agak beda ya, dia itu modelan gamis jadi aman banget kalo lu biasanya berpergian pakek rok, gimana?",
   combo:{}},
  {nama:'Opsi 11',
   def:'hook: '+"duhh lucu banget lagi, sini deketin kameranya(kamera mendekat memperlihatkan bantal) liat deh besti, bayangin aja lu bobo sama bantal ini, dijamin banget deh lo gak mau bangen lagi"+'\n'+'cta: '+"(kamera mendekat memperlihatkan bantal guling) liat nih besti, empuk banget, yang gilanya itu harganya murah banget, aku gak tau ya apakah si seller lagi khilaf atau apa, cek dulu lu dapat harga berapa",
   combo:{}},
  {nama:'Opsi 12',
   def:'hook: '+"kalo lo pengen kaos murah tapi bahannya adem, nah ini rekomendasi dari gua, harganya gak sampai 60 ribu dan lu bisa dapat dua lohh"+'\n'+'cta: '+"sini deketin kameranya(kamera mendekat ke arah kaos) tuh liat cakep abis kan, mau lu pakek buat nongkrong kek. kerja kek. ini tuh udah nyaman banget. cek dulu harganya dibawah",
   combo:{}}
];  // durasi 16 detik (hook + cta). 12 skrip utama dari user (21 Nov 2026), teks apa adanya
function _vbRefOpts(){var _u=(typeof pbUserRefOpts==='function')?pbUserRefOpts():null;if(_u)return _u;return _vbIsDua()?VB_REFERENCE_OPTIONS_DUA:(_vb16()?VB_REFERENCE_OPTIONS_16:VB_REFERENCE_OPTIONS);}
// 25 Okt 2026: contoh referensi diacak TANPA ulangan: semua opsi dikocok dulu, dipakai satu per satu (tiap panggilan AI = 1 opsi baru),
// baru dikocok lagi kalau habis; opsi pertama putaran baru dijamin beda dari opsi terakhir putaran sebelumnya.
var _vbRefBag=[],_vbRefLast=-1;
var _vbRefBagList=null;
// 13 Nov 2026 (audit): opsi contoh yang dipakai per produk disimpan (kunci = durasi|nama); saat REVISI (ada CURRENT SCRIPT) opsi yang sama dipakai lagi.
var _vbRefMemo={};
function _vbRefMemoKey(nama){return (typeof pbUserRefActive==='function'&&pbUserRefActive()?'own|':'')+(_vbIsDua()?'dua|':(_vb16()?'16|':'24|'))+String(nama||'').replace(/\s+/g,' ').trim().toLowerCase();}
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
  var base=(_vbRefOpts()||[])[0]||{},bc=base.combo||{};
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
