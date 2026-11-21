// fitur/foto-refresh-penghitung-referensi.js — (dulu js/35-pb-poseref.js) dipindah dari <script id="pb-poseref-js"> di index.html lama (baris 40398). Logika showCard() dipindah ke js/10-main-app.js; tersisa satu baris ini.
// Menyegarkan penghitung foto referensi sekali setelah load (aturan Pose kini ada di showCard()).
try{setTimeout(function(){if(typeof fUpdateCounters==='function')fUpdateCounters();},0);}catch(e){}
