// fitur/outfit-studio-pembuka.js — (dulu js/11-outfit-studio.js) dipindah dari <script> di index.html lama (baris 33507). OS_HTML dipisah ke outfit-studio.html; osOpen() diubah memuatnya lewat fetch().
// OS_HTML (±870 ribu karakter) dipindah ke outfit-studio.html — dimuat lewat fetch() di osOpen() di bawah.
function osOpen(){
  var f=document.getElementById('os-frame'),o=document.getElementById('os-overlay');
  if(!f||!o)return;
  var st=f.getAttribute('data-ready');
  if(!st){
    // Pertama kali dibuka: muat outfit-studio.html, lalu pasang lewat srcdoc (sama seperti dulu: iframe dibiarkan hidup setelahnya).
    f.setAttribute('data-ready','loading');
    fetch('outfit-studio.html').then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.text();})
      .then(function(html){f.srcdoc=html;f.setAttribute('data-ready','1');})
      .catch(function(){f.removeAttribute('data-ready');if(typeof showToast==='function')showToast('Outfit Studio gagal dimuat. Cek koneksi lalu coba lagi.','error');});
  }
  else if(st==='1'){try{f.contentWindow.osEnter&&f.contentWindow.osEnter();}catch(e){}}
  o.classList.add('show');
}
function osClose(){var o=document.getElementById('os-overlay');if(o)o.classList.remove('show');}

/* v18.20: pembaca foto untuk Outfit Studio (dipakai fitur Link Koleksi di Kolase). Memakai Worker + Gemini yang sama dengan fitur baca-foto lain; ikut menghitung kuota AI. Mengembalikan teks jawaban. */
async function osAiVision(parts,systemText,maxTokens){
  var model=PB_AI_MODELS.gemini.id,tok=await _pbGetFirebaseIdToken();
  var ctl=new AbortController(),tm=setTimeout(function(){ctl.abort();},90000);
  try{
    var resp=await fetch(ANTHROPIC_ENDPOINT,{method:'POST',signal:ctl.signal,
      headers:{'Content-Type':'application/json','X-Device-Id':_pbGetDeviceId(),'X-Firebase-Token':tok,'X-AI-Provider':'gemini'},
      body:JSON.stringify(_pbBuildGroqBody(model,parts,systemText,maxTokens||600,true))});
    if(!resp.ok){var et='';try{et=(await resp.text()).slice(0,160);}catch(e){}throw new Error('AI '+resp.status+(et?': '+et:''));}
    var rd=resp.body.getReader(),dc=new TextDecoder(),buf='',out='';
    for(;;){var q=await rd.read();if(q.done)break;buf+=dc.decode(q.value,{stream:true});
      var ls=buf.split('\n');buf=ls.pop();
      ls.forEach(function(l){l=l.trim();if(l.indexOf('data:')!==0)return;l=l.slice(5).trim();if(!l||l==='[DONE]')return;
        try{var ev=JSON.parse(l),c0=ev.choices&&ev.choices[0];if(c0&&c0.delta&&c0.delta.content)out+=c0.delta.content;}catch(e){}});}
    return out;
  }finally{clearTimeout(tm);}
}

document.addEventListener('keydown',function(e){if(e.key==='Escape'){var o=document.getElementById('os-overlay');if(o&&o.classList.contains('show'))osClose();}});
