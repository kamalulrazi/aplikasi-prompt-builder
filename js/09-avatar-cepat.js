// js/09-avatar-cepat.js — dipindah dari <script> di index.html lama (baris 7923). Isi tidak diubah.
      // Isi nama/avatar SEKETIKA setelah elemennya ada di halaman (sebelum
      // layar pertama digambar) kalau sesi login tersimpan.
      (function(){
        try{
          var u = JSON.parse(localStorage.getItem('pb_auth_user') || 'null');
          if(!u || !u.email) return;
          document.getElementById('pb-user-name').textContent = (u.name || u.email || '').split(' ')[0];
          var a = document.getElementById('pb-user-avatar');
          if(u.picture){ a.src = u.picture; a.style.display = 'block'; }
          document.getElementById('pb-user-pill').style.display = 'flex';
        }catch(e){}
      })();
    