/* Teacher pages share the derived AES key. Previous plaintext storage is migrated on use. */
(function (root) {
  'use strict';
  const session = 'oge-teacher-session-v1';
  const device = 'oge-teacher-device-v1';
  const bytes = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
  const b64 = value => btoa(String.fromCharCode(...new Uint8Array(value)));

  async function derive(password, salt, iterations) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(salt),iterations,hash:'SHA-256'},base,{name:'AES-GCM',length:256},true,['decrypt']);
  }

  async function read(salt) {
    for (const [storage,key] of [[sessionStorage,session],[localStorage,device]]) {
      try {
        const saved = JSON.parse(storage.getItem(key));
        if (saved?.salt === salt && typeof saved.key === 'string') {
          return await crypto.subtle.importKey('raw',bytes(saved.key),'AES-GCM',true,['decrypt']);
        }
      } catch {}
    }
    return null;
  }

  async function save(key, salt, remember) {
    try {
      const saved=JSON.stringify({salt,key:b64(await crypto.subtle.exportKey('raw',key))});
      sessionStorage.setItem(session,saved);
      if (remember === true) localStorage.setItem(device,saved);
      else if (remember === false) localStorage.removeItem(device);
    } catch {}
    try { localStorage.removeItem('jr_pw'); } catch {}
  }

  function clear() {
    try { sessionStorage.removeItem(session); } catch {}
    try { localStorage.removeItem(device); localStorage.removeItem('jr_pw'); } catch {}
  }

  root.OgeTeacherSession = { session,device,bytes,b64,derive,read,save,clear };
})(window);
