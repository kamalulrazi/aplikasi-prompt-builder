// js/17-pbw.js — dipindah dari <script id="pbw-js"> di index.html lama (baris 37923). Isi tidak diubah.
/* Opsi B: progres bertahap, chip ringkasan yang bisa diketuk, tombol aksi menempel di bawah.
   Hanya tampilan; logika step & state VB tidak diubah. Dipanggil dari render() layer pb-fork. */
(function(){
  var $=function(i){return document.getElementById(i);},IDS=['v1','vdur','v2','voff','vcam','vfork','v3','vmotion','v4','v5'];
  function act(c){return !!c&&!c.classList.contains('done')&&!c.classList.contains('pending')&&!c.classList.contains('hidden')&&c.style.display!=='none';}
  function vis(e){return getComputedStyle(e).display!=='none';}
  function navH(){var h=0;[].forEach.call(document.querySelectorAll('nav'),function(n){var s=getComputedStyle(n),r=n.getBoundingClientRect();if(s.position==='fixed'&&r.height>20&&r.bottom>=innerHeight-2)h=Math.round(r.height);});document.documentElement.style.setProperty('--pbw-nav',h+'px');}
  window.addEventListener('resize',navH);
  /* Bar "Konfirmasi & Lanjut" dibuat app belakangan (fShowConfirm -> appendChild di wbody): ikutkan ke dock, dock tetap paling bawah. */
  function sync(b){
    var d=b.querySelector(':scope>.pbw-dock');if(!d)return;
    [].slice.call(b.children).forEach(function(e){if(e!==d&&(/-confirmbar$/.test(e.id)||e.id==='summary-edit-done-btn'))d.appendChild(e);});
    if(b.lastElementChild!==d)b.appendChild(d);
    d.style.display=[].some.call(d.children,vis)?'':'none';
  }
  /* KEMBALI MENGHAPUS DATA STEP AKTIF (permintaan user, 8 Okt 2026): pola reset sama seperti vbResetNow, tapi per step. */
  function qa(x){return document.querySelectorAll(x);}
  function off(x){[].forEach.call(qa(x),function(c){c.classList.remove('sel');});}
  function val(i,v){var e=$(i);if(e)e.value=v;}
  function cnt(i,t){var e=$(i);if(e){e.textContent=t;e.className='inp-counter';}}
  var CLR={
    voff:function(){VB.offGender='';off('#vb-off-chips .chip');try{vbSyncOffGender();}catch(e){}},
    vdur:function(){VB.durasi=0;off('#vb-dur-chips .chip');var g=$('vb-dur-go');if(g)g.disabled=true;},
    v2:function(){VB.gender='';VB.genderLabel='';VB.age='';VB.ageLabel='';off('#vb-gender-chips .chip,#vb-age-chips .chip');val('v2-custom','');try{v2RangeReset();}catch(e){}cnt('v2-counter','Maks. 120 tahun');},
    vcam:function(){VB.camMove='';VB.camHook='';off('#vcam .chip');try{_vbCamPendMove='';_vbCamPendHook='';_vbRenderCamChips();}catch(e){}try{vbCamTab('kamera',true);}catch(e){}},
    vfork:function(){if(window.pbSelectPath)window.pbSelectPath('');},
    v3:function(){VB.pitch='';VB.pitchLabel='';off('#v3 .chip');try{vbPitchPlate('');}catch(e){}val('v3-custom','');cnt('v3-counter','0 / 80');},
    vmotion:function(){VB.motion='';off('#vmotion .chip');val('vmotion-custom','');cnt('vmotion-counter','0 / 80');try{_vbMotionDrawChips();}catch(e){}},
    v4:function(){VB.accent='';VB.accentLabel='';VB.accentStyle='';VB.accentStyleLabel='';VB.accentStyleFor='';off('#v4 .chip');try{vbAksenPlate('');}catch(e){}val('v4-custom','');cnt('v4-counter','0 / 120');try{VB_AKSEN_STYLE_PENDING='';vbRenderAksenStyleChips('');}catch(e){}},
    /* Script/Info Produk: kosongkan isian teks, audiens, sapaan. Foto produk & jumlah produk dibiarkan. */
    v5:function(){
      [].forEach.call(qa('#v5 input[type=text],#v5 input:not([type]),#v5 textarea'),function(e){e.value='';});
      [].forEach.call(qa('#v5 .chip.sel'),function(c){if((c.getAttribute('onclick')||'').indexOf('vbPickTa')>=0)c.classList.remove('sel');});
      VB.bulkTargetAudience='';
      try{VB_TA_PRESET={};}catch(e){}try{vbResetSapaan();}catch(e){}try{vbInfoReset();}catch(e){}try{VB_BULK_ROW_CACHE=[];VB_MANUAL_ROW_CACHE=[];}catch(e){}
    }
  };
  function clearStep(id){try{if(CLR[id])CLR[id]();}catch(e){console.warn('pbw clear',e);}var cb=$(id+'-confirmbar');if(cb)cb.remove();}
  window.pbWizRender=function(s,on,isDone){
    var ol=$('pb-tl');if(!ol)return;
    navH();
    var h=$('pbw-head');
    if(!h){h=document.createElement('div');h.id='pbw-head';ol.parentNode.insertBefore(h,ol);
      h.addEventListener('click',function(e){var b=e.target.closest('.pbw-rc'),c=b&&$(b.dataset.id),k=c&&c.querySelector('.whead');if(k)k.click();});}
    var n=s.length,cur=-1,f=0,seg='',rc='',more=s[n-1][0]==='vfork';
    s.forEach(function(x,i){if(cur<0&&act($(x[0])))cur=i;});
    if(cur<0)cur=on;
    s.forEach(function(x,i){
      var c=$(x[0]),d=isDone(x)&&!act(c),a=c&&c.querySelector('.wanswer'),v=a?a.textContent.trim():'';
      if(d)f++;
      seg+='<i class="'+(i===cur?'c':(d?'f':''))+'"></i>';
      if(d&&v)rc+='<button type="button" class="pbw-rc" data-id="'+x[0]+'" data-i="'+i+'"><small>'+esc(x[1])+'</small>'+esc(v)+'</button>';
    });
    h.dataset.cur=cur<0?n:cur;h.dataset.cid=cur<0?'':s[cur][0];
    h.innerHTML='<div class="pbw-meta"><span></span><span>'+f+' terisi</span></div>'
      +(cur<0?'':'<h2 class="pbw-h">'+esc(s[cur][1])+'</h2>')+(rc?'<div class="pbw-recap">'+rc+'</div>':'');
    IDS.forEach(function(id){
      var c=$(id),b=c&&c.querySelector('.wbody');if(!b)return;
      if(!b.querySelector(':scope>.pbw-dock')){
        var k=[].slice.call(b.children),t=[];
        k.forEach(function(e){if(e.matches('.wback'))t.push(e);});
        while(k.length&&k[k.length-1].matches('button.btn,.wback')){var e=k.pop();if(t.indexOf(e)<0)t.unshift(e);}
        var d=document.createElement('div');d.className='pbw-dock';
        t.forEach(function(e){d.appendChild(e);});
        if(!d.querySelector('.wback')){var g=document.createElement('button');g.type='button';g.className='btn ghost pbw-bk';g.textContent='Kembali';
          /* Kembali = hapus data step aktif, lalu buka step tepat sebelumnya (seperti mengetuk chip-nya) */
          g.onclick=function(){var cu=+$('pbw-head').dataset.cur,r=[].filter.call(document.querySelectorAll('#pbw-head .pbw-rc'),function(x){return +x.dataset.i<cu;});if(r.length){clearStep($('pbw-head').dataset.cid);r[r.length-1].click();}};
          d.insertBefore(g,d.firstChild);}
        b.appendChild(d);
        new MutationObserver(function(){sync(b);}).observe(b,{childList:true});
      }
      sync(b);
    });
    var has=!!h.querySelector('.pbw-rc[data-i]')&&[].some.call(h.querySelectorAll('.pbw-rc'),function(x){return +x.dataset.i<(+h.dataset.cur);});
    document.querySelectorAll('.pbw-bk').forEach(function(x){x.hidden=!has;});
    IDS.forEach(function(id){var c=$(id),b=c&&c.querySelector('.wbody');if(b)sync(b);});
  };
})();
