// fitur/video-isian-kurung.js — Isian dalam tanda kurung di kolom skrip (permintaan user, 22 Nov 2026).
// Aturan: saat user menutup tanda kurung ")" di kolom skrip, tulisan dalam kurung beserta tandanya TERSEMBUNYI dari tampilan kolom,
// tapi di balik layar tetap tersimpan apa adanya: ta.value (dibaca prompt video, hitungan kata, Simpan skrip, draf) selalu mengembalikan teks LENGKAP.
// Kata dalam kurung tidak dihitung dalam rentang kata (lihat _vbWcNoParen di video-sapaan-dan-perapian-teks.js).
// Cara kerja: bagian kurung di dalam kolom diganti penanda tak terlihat (karakter lebar-nol), isinya disimpan di el.__cues.
// Berlaku untuk kolom skrip kartu hasil: textarea dengan id vb-bulk-script-N (jalur Kami Bantu Isi, Tulis Manual, Bulk).
(function(){
  var TOK=/\u2063([\u200B\u200C]+)\u2063/g;
  var desc=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
  function enc(i){return '\u2063'+(i+1).toString(2).split('').map(function(b){return b==='1'?'\u200C':'\u200B';}).join('')+'\u2063';}
  function dec(s){var n=0;for(var k=0;k<s.length;k++)n=n*2+(s.charAt(k)==='\u200C'?1:0);return n-1;}
  function strip(s){return s.replace(/[\u2063\u200B\u200C]/g,'');}
  // buang sisa penanda yang rusak (mis. sebagian terhapus), cue-nya ikut hilang
  function sanitize(n){
    var out='',last=0,m;TOK.lastIndex=0;
    while((m=TOK.exec(n))){out+=strip(n.slice(last,m.index))+m[0];last=m.index+m[0].length;}
    return out+strip(n.slice(last));
  }
  function expand(el,n){
    var cues=el.__cues||[];
    return n.replace(TOK,function(m,b){var c=cues[dec(b)];return c==null?'':c;});
  }
  function tokenize(el,full){
    var cues=[];el.__cues=cues;
    return String(full).replace(/\([^()]*\)/g,function(m){cues.push(m);return enc(cues.length-1);});
  }
  function isTarget(el){return !!el&&el.tagName==='TEXTAREA'&&/^vb-bulk-script-\d+$/.test(el.id||'');}
  function install(el){
    if(!isTarget(el)||el.__kr)return;
    el.__kr=1;
    var cur=desc.get.call(el);
    Object.defineProperty(el,'value',{
      configurable:true,
      get:function(){return expand(this,desc.get.call(this));},
      set:function(v){desc.set.call(this,tokenize(this,v==null?'':v));}
    });
    if(cur)desc.set.call(el,tokenize(el,cur));
  }
  // user mengetik: begitu ada kurung yang sudah ditutup, ganti dengan penanda tak terlihat
  function onInput(e){
    var el=e.target;
    if(!isTarget(el))return;
    if(!el.__kr)install(el);
    var n=desc.get.call(el),c0=el.selectionStart;
    var s=sanitize(n),c1=sanitize(n.slice(0,c0)).length;
    var cues=el.__cues||(el.__cues=[]),re=/\([^()]*\)/g,m,out='',last=0,delta=0,cc=c1;
    while((m=re.exec(s))){
      var t=enc(cues.length);cues.push(m[0]);
      out+=s.slice(last,m.index)+t;
      var end=m.index+m[0].length;
      if(c1>=end)delta+=t.length-m[0].length;
      else if(c1>m.index){cc=m.index+delta+t.length;delta=null;}
      last=end;
      if(delta===null)break;
    }
    out+=s.slice(last);
    if(delta!==null)cc=c1+delta;
    if(out!==n){desc.set.call(el,out);try{el.setSelectionRange(cc,cc);}catch(x){}}
  }
  document.addEventListener('input',onInput,true);
  function scan(root){
    if(!root||root.nodeType!==1)return;
    if(isTarget(root))install(root);
    if(root.querySelectorAll)[].forEach.call(root.querySelectorAll('textarea[id^="vb-bulk-script-"]'),install);
  }
  function start(){
    scan(document.body);
    new MutationObserver(function(ms){ms.forEach(function(m){[].forEach.call(m.addedNodes,scan);});}).observe(document.body,{childList:true,subtree:true});
  }
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})();
