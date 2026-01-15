// ========================================
// GESTIONE AUTENTICAZIONE - MOBILE READY
// ========================================

// 🔥 STORAGE ROBUSTO - Funziona anche su iOS Safari
const StorageManager = {
  // Prova a salvare in TUTTI i posti possibili
  set(key, value) {
    try {
      // 1. localStorage (desktop)
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage non disponibile:', e);
    }
    
    try {
      // 2. sessionStorage (fallback mobile)
      sessionStorage.setItem(key, value);
    } catch (e) {
      console.warn('sessionStorage non disponibile:', e);
    }
    
    try {
      // 3. Cookie (funziona sempre)
      document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=2592000; SameSite=Lax`;
    } catch (e) {
      console.warn('Cookie non disponibili:', e);
    }
  },
  
  // Prova a leggere da TUTTI i posti possibili
  get(key) {
    // 1. Prova localStorage
    try {
      const val = localStorage.getItem(key);
      if (val) return val;
    } catch (e) {}
    
    // 2. Prova sessionStorage
    try {
      const val = sessionStorage.getItem(key);
      if (val) return val;
    } catch (e) {}
    
    // 3. Prova cookie
    try {
      const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
      if (match) return decodeURIComponent(match[2]);
    } catch (e) {}
    
    return null;
  },
  
  // Cancella da TUTTI i posti
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
    
    try {
      sessionStorage.removeItem(key);
    } catch (e) {}
    
    try {
      document.cookie = `${key}=; path=/; max-age=0`;
    } catch (e) {}
  }
};

// Funzione per hashare la password (semplice, per produzione usa bcrypt)
async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Verifica se utente è loggato
function isLoggedIn() {
  const userId = StorageManager.get('nodo_user_id');
  console.log('🔍 isLoggedIn check:', userId ? 'SI' : 'NO');
  return userId !== null;
}

// Ottieni dati utente corrente
function getCurrentUser() {
  const user = {
    id: StorageManager.get('nodo_user_id'),
    username: StorageManager.get('nodo_username'),
    email: StorageManager.get('nodo_email')
  };
  
  // 🔥 IMPORTANTE: Se uno dei valori manca, l'utente non è loggato
  if (!user.id || !user.username) {
    console.warn('⚠️ Dati utente incompleti, forzando logout');
    clearSession();
    return null;
  }
  
  console.log('👤 Utente corrente:', user.username);
  return user;
}

// Salva sessione utente
function saveSession(user) {
  console.log('💾 Salvataggio sessione:', user.username);
  
  // Salva con StorageManager robusto
  StorageManager.set('nodo_user_id', user.id);
  StorageManager.set('nodo_username', user.username);
  StorageManager.set('nodo_email', user.email);
  
  // 🔥 COMPATIBILITÀ con community/vetrina (userData formato JSON)
  const userData = JSON.stringify({
    id: user.id,
    username: user.username,
    email: user.email
  });
  
  StorageManager.set('userData', userData);
  
  // 🔥 VERIFICA immediata che il salvataggio sia riuscito
  setTimeout(() => {
    const savedId = StorageManager.get('nodo_user_id');
    if (savedId !== user.id) {
      console.error('❌ ERRORE: Sessione non salvata correttamente!');
      alert('Errore salvataggio dati. Riprova il login.');
    } else {
      console.log('✅ Sessione salvata e verificata:', savedId);
    }
  }, 100);
}

// Cancella sessione utente
function clearSession() {
  console.log('🗑️ Pulizia sessione');
  
  StorageManager.remove('nodo_user_id');
  StorageManager.remove('nodo_username');
  StorageManager.remove('nodo_email');
  StorageManager.remove('userData');
}

// LOGIN
async function login(usernameOrEmail, password) {
  console.log('🔐 Tentativo login:', usernameOrEmail);
  
  try {
    const passwordHash = await hashPassword(password);
    
    // Cerca utente per username O email
    const { data, error } = await supabaseClient
      .from('Utenti')
      .select('*')
      .or(`username.eq.${usernameOrEmail},email.eq.${usernameOrEmail}`)
      .eq('password_hash', passwordHash)
      .single();
    
    if (error || !data) {
      console.error('❌ Login fallito:', error?.message || 'Credenziali errate');
      return { success: false, message: 'Username/Email o Password errati' };
    }
    
    console.log('✅ Login riuscito:', data.username);
    saveSession(data);
    
    // 🔥 VERIFICA IMMEDIATA
    await new Promise(resolve => setTimeout(resolve, 200));
    const check = getCurrentUser();
    
    if (!check) {
      console.error('❌ Sessione non salvata correttamente!');
      return { success: false, message: 'Errore salvataggio sessione. Browser in modalità privata?' };
    }
    
    return { success: true, user: data };
  } catch (err) {
    console.error('❌ Errore login:', err);
    return { success: false, message: 'Errore durante il login' };
  }
}

// REGISTRAZIONE
async function register(username, email, password) {
  console.log('📝 Tentativo registrazione:', username);
  
  try {
    const passwordHash = await hashPassword(password);
    
    const { data, error } = await supabaseClient
      .from('Utenti')
      .insert([{
        username: username,
        email: email,
        password_hash: passwordHash
      }])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Registrazione fallita:', error);
      if (error.code === '23505') { // Unique violation
        return { success: false, message: 'Username o Email già esistenti' };
      }
      return { success: false, message: error.message };
    }
    
    console.log('✅ Registrazione riuscita:', data.username);
    saveSession(data);
    
    // 🔥 VERIFICA IMMEDIATA
    await new Promise(resolve => setTimeout(resolve, 200));
    const check = getCurrentUser();
    
    if (!check) {
      console.error('❌ Sessione non salvata dopo registrazione!');
      return { success: false, message: 'Errore salvataggio sessione. Browser in modalità privata?' };
    }
    
    return { success: true, user: data };
  } catch (err) {
    console.error('❌ Errore registrazione:', err);
    return { success: false, message: 'Errore durante la registrazione' };
  }
}

// LOGOUT
function logout() {
  console.log('👋 Logout');
  clearSession();
  
  // 🔥 Forza reload per pulire tutto
  window.location.href = 'login.html';
}

// AGGIORNA PROFILO
async function updateProfile(userId, updates) {
  console.log('📝 Aggiornamento profilo:', userId);
  
  try {
    // Se c'è una nuova password, hashala
    if (updates.password) {
      updates.password_hash = await hashPassword(updates.password);
      delete updates.password;
    }
    
    const { data, error } = await supabaseClient
      .from('Utenti')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Aggiornamento fallito:', error);
      if (error.code === '23505') {
        return { success: false, message: 'Username o Email già in uso' };
      }
      return { success: false, message: error.message };
    }
    
    console.log('✅ Profilo aggiornato:', data.username);
    
    // Aggiorna sessione
    if (data.username) StorageManager.set('nodo_username', data.username);
    if (data.email) StorageManager.set('nodo_email', data.email);
    
    return { success: true, user: data };
  } catch (err) {
    console.error('❌ Errore aggiornamento profilo:', err);
    return { success: false, message: 'Errore durante l\'aggiornamento' };
  }
}

// PROTEGGI PAGINA (reindirizza a login se non loggato)
function requireAuth() {
  console.log('🔒 Verifica autenticazione...');
  
  const user = getCurrentUser();
  
  if (!user) {
    console.warn('⚠️ Utente non loggato, redirect a login');
    window.location.href = 'login.html';
    return;
  }
  
  console.log('✅ Autenticazione OK:', user.username);
}

// 🔥 AUTO-CHECK SESSIONE ogni volta che la pagina diventa visibile
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    console.log('👀 Pagina visibile, verifica sessione...');
    const user = getCurrentUser();
    if (!user && window.location.pathname !== '/login.html') {
      console.warn('⚠️ Sessione persa, redirect a login');
      window.location.href = 'login.html';
    }
  }
});

// 🔥 AUTO-CHECK SESSIONE quando la pagina carica
window.addEventListener('load', () => {
  console.log('🚀 Pagina caricata, verifica sessione...');
  const user = getCurrentUser();
  
  if (user) {
    console.log('✅ Sessione attiva:', user.username);
  } else {
    console.log('⚠️ Nessuna sessione attiva');
  }
});

// 🔥 MOBILE: Salva sessione prima di chiudere/cambiare pagina
window.addEventListener('beforeunload', () => {
  const user = getCurrentUser();
  if (user) {
    // Ri-salva per sicurezza
    saveSession(user);
  }
});

// 🔥 MOBILE: Verifica sessione quando app torna in foreground
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    // Pagina ripristinata da cache (iOS Safari)
    console.log('📱 Pagina ripristinata da cache, verifica sessione...');
    const user = getCurrentUser();
    if (!user && window.location.pathname !== '/login.html') {
      console.warn('⚠️ Sessione persa dopo cache, redirect a login');
      window.location.href = 'login.html';
    }
  }
});

console.log('🔐 Auth.js caricato - Mobile ready!');
