// ========================================
// GESTIONE AUTENTICAZIONE
// ========================================

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
  return localStorage.getItem('nodo_user_id') !== null;
}

// Ottieni dati utente corrente
function getCurrentUser() {
  return {
    id: localStorage.getItem('nodo_user_id'),
    username: localStorage.getItem('nodo_username'),
    email: localStorage.getItem('nodo_email')
  };
}

// Salva sessione utente
function saveSession(user) {
  localStorage.setItem('nodo_user_id', user.id);
  localStorage.setItem('nodo_username', user.username);
  localStorage.setItem('nodo_email', user.email);
  
  // ⭐ AGGIUNGI QUESTO per compatibilità con community/vetrina
  localStorage.setItem('userData', JSON.stringify({
    id: user.id,
    username: user.username,
    email: user.email
  }));
  sessionStorage.setItem('userData', JSON.stringify({
    id: user.id,
    username: user.username,
    email: user.email
  }));
  
  console.log('✅ Sessione salvata per utente:', user.id);
}

// Cancella sessione utente
function clearSession() {
  localStorage.removeItem('nodo_user_id');
  localStorage.removeItem('nodo_username');
  localStorage.removeItem('nodo_email');
}

// LOGIN
async function login(usernameOrEmail, password) {
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
      return { success: false, message: 'Username/Email o Password errati' };
    }
    
    saveSession(data);
    return { success: true, user: data };
  } catch (err) {
    console.error('Errore login:', err);
    return { success: false, message: 'Errore durante il login' };
  }
}

// REGISTRAZIONE
async function register(username, email, password) {
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
      if (error.code === '23505') { // Unique violation
        return { success: false, message: 'Username o Email già esistenti' };
      }
      return { success: false, message: error.message };
    }
    
    saveSession(data);
    return { success: true, user: data };
  } catch (err) {
    console.error('Errore registrazione:', err);
    return { success: false, message: 'Errore durante la registrazione' };
  }
}

// LOGOUT
function logout() {
  clearSession();
  window.location.href = 'login.html';
}

// AGGIORNA PROFILO
async function updateProfile(userId, updates) {
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
      if (error.code === '23505') {
        return { success: false, message: 'Username o Email già in uso' };
      }
      return { success: false, message: error.message };
    }
    
    // Aggiorna sessione
    if (data.username) localStorage.setItem('nodo_username', data.username);
    if (data.email) localStorage.setItem('nodo_email', data.email);
    
    return { success: true, user: data };
  } catch (err) {
    console.error('Errore aggiornamento profilo:', err);
    return { success: false, message: 'Errore durante l\'aggiornamento' };
  }
}

// PROTEGGI PAGINA (reindirizza a login se non loggato)
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
  }
}
