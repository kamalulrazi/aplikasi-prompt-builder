// js/20-pb-v2-range.js — dipindah dari <script id="pb-v2-range-js"> di index.html lama (baris 38348). Isi tidak diubah.
/* OPSI B usia: geser trek -> isi angka (lewat event input supaya semua logika lama jalan: counter, lepas chip, tombol Konfirmasi, skala titik); ketik angka -> trek ikut. */
function v2RangePaint(v){var r=document.getElementById('v2-range');if(r)r.style.setProperty('--pct',((v-1)/119*100)+'%');}
function v2RangeFromRange(){
  var r=document.getElementById('v2-range'),i=document.getElementById('v2-custom');
  if(!r||!i)return;
  v2RangePaint(r.value);
  i.value=r.value;
  i.dispatchEvent(new Event('input',{bubbles:true}));
}
function v2RangeFromInput(){
  var r=document.getElementById('v2-range'),i=document.getElementById('v2-custom');
  if(!r||!i)return;
  var v=parseInt(i.value.replace(/\D/g,''),10);
  if(isNaN(v)){r.value=15;v2RangePaint(15);return;}
  v=Math.min(120,Math.max(1,v));
  r.value=v;v2RangePaint(v);
}
function v2RangeReset(){var r=document.getElementById('v2-range');if(r){r.value=15;v2RangePaint(15);}}
v2RangePaint(15);
