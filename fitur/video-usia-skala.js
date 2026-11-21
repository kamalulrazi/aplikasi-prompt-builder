// fitur/video-usia-skala.js — (dulu js/19-pb-c-age-scale.js) dipindah dari <script id="pb-c-age-scale"> di index.html lama (baris 38320). Isi tidak diubah.
(function(){
function build(){
  var src=document.getElementById('vb-age-chips');
  if(!src||document.getElementById('pcs-age'))return;
  var ch=[].slice.call(src.querySelectorAll('.chip'));
  if(!ch.length)return;
  var nm_=ch.map(function(c){return c.firstChild.textContent.trim()}),
      rg_=ch.map(function(c){var s=c.querySelector('span');return s?s.textContent.trim():''});
  var w=document.createElement('div');w.id='pcs-age';
  w.innerHTML='<div class="pcs-rd"><div class="pcs-nm"></div><div class="pcs-rg"></div></div><div class="pcs-sc"><u></u><s></s>'+ch.map(function(c,i){return '<button type="button" aria-label="'+nm_[i]+' '+rg_[i]+'"></button>'}).join('')+'</div><div class="pcs-n">'+rg_.map(function(r){return '<span>'+(parseInt(r,10)||'')+'</span>'}).join('')+'</div>';
  src.parentNode.insertBefore(w,src.nextSibling);
  var b=[].slice.call(w.querySelectorAll('button')),n=w.querySelector('.pcs-nm'),r=w.querySelector('.pcs-rg'),f=w.querySelector('s'),cu=document.getElementById('v2-custom');
  function sync(){
    var i=ch.findIndex(function(c){return c.classList.contains('sel')});
    b.forEach(function(x,j){x.className=i<0?'':j==i?'on':j<i?'pa':''});
    f.style.width=i<0?'0':i*100/(ch.length-1)+'%';
    if(i>=0){n.textContent=nm_[i];r.textContent=rg_[i]}
    else{var v=cu?cu.value.replace(/\D/g,''):'';n.textContent=v?v+' tahun':'Pilih usia';r.textContent=v?'usia sendiri':'ketuk salah satu titik'}
  }
  b.forEach(function(x,i){x.onclick=function(){ch[i].click()}});
  new MutationObserver(sync).observe(src,{attributes:true,attributeFilter:['class'],subtree:true});
  if(cu)cu.addEventListener('input',sync);
  sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
