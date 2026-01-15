// ========================================
// 🟡 NODO MESSAGGISTICA - VERSIONE GIALLA FIXED
// ========================================

let currentChatUserId = null;
let currentChatUsername = null;
let messagesPollingInterval = null;
let lastMessageId = null;
let isInConversationsList = true;
let heartbeatInterval = null;

// 🔥 REALTIME SUBSCRIPTIONS
let messagesSubscription = null;
let userStatusSubscription = null;

// 🔥 CACHE STATO UTENTI - per aggiornamenti istantanei
let usersStatusCache = new Map();

// 🔥 SISTEMA HEARTBEAT - Aggiorna stato online
function startHeartbeat() {
  const userId = getUserId();
  if (!userId) return;
  
  // Aggiorna subito
  updateUserOnlineStatus(userId);
  
  // Poi ogni 30 secondi
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  
  heartbeatInterval = setInterval(() => {
    updateUserOnlineStatus(userId);
  }, 30000); // 30 secondi
  
  console.log('💓 Heartbeat avviato');
  
  // 🔥 REALTIME: Subscribe a cambiamenti stato TUTTI gli utenti
  startUserStatusRealtime();
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  
  // Setta offline
  const userId = getUserId();
  if (userId) {
    supabaseClient
      .from('Utenti')
      .update({ online: false, last_seen: new Date().toISOString() })
      .eq('id', userId)
      .then(() => console.log('👋 Utente offline'));
  }
  
  // 🔥 Disconnetti realtime
  if (userStatusSubscription) {
    supabaseClient.removeChannel(userStatusSubscription);
    userStatusSubscription = null;
    console.log('🔌 Disconnesso da realtime stato utenti');
  }
}

// 🔥 REALTIME: Ascolta cambiamenti stato utenti in tempo reale
function startUserStatusRealtime() {
  if (userStatusSubscription) {
    supabaseClient.removeChannel(userStatusSubscription);
  }
  
  console.log('🔌 Connessione realtime stato utenti...');
  
  userStatusSubscription = supabaseClient
    .channel('user-status-global')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'Utenti'
      },
      (payload) => {
        console.log('⚡ Stato utente cambiato:', payload.new.username, payload.new.online);
        
        // 🔥 NUOVO: Aggiorna cache
        usersStatusCache.set(payload.new.id, {
          online: payload.new.online,
          last_seen: payload.new.last_seen
        });
        
        // 🔥 NUOVO: Aggiorna lista conversazioni se visibile
        if (isInConversationsList) {
          updateConversationUserStatus(payload.new.id, payload.new.online, payload.new.last_seen);
        }
        
        // Aggiorna UI se siamo in chat con questo utente
        if (currentChatUserId === payload.new.id && !isInConversationsList) {
          updateChatUserStatusUI(payload.new);
        }
      }
    )
    .subscribe((status) => {
      console.log('📡 Stato realtime utenti:', status);
    });
}

// 🔥 NUOVO: Aggiorna stato utente nella lista conversazioni
function updateConversationUserStatus(userId, online, lastSeen) {
  const userCard = document.querySelector(`[data-user-id="${userId}"]`);
  if (!userCard) return;
  
  const statusEl = userCard.querySelector('.user-status-indicator');
  if (!statusEl) return;
  
  if (online) {
    statusEl.className = 'user-status-indicator online';
    statusEl.title = 'Online';
  } else {
    statusEl.className = 'user-status-indicator offline';
    const lastSeenText = formatLastSeen(lastSeen);
    statusEl.title = lastSeenText;
  }
  
  console.log(`🔄 Aggiornato stato ${userId}: ${online ? 'ONLINE' : 'OFFLINE'}`);
}

// 🔥 Aggiorna UI stato utente istantaneamente (nella chat singola)
function updateChatUserStatusUI(userData) {
  const statusEl = document.querySelector('.messages-user-status');
  if (!statusEl) return;
  
  if (userData.online) {
    statusEl.innerHTML = '<span class="user-status-online"><i class="fas fa-circle"></i> Online</span>';
  } else if (userData.last_seen) {
    const lastSeen = formatLastSeen(userData.last_seen);
    statusEl.innerHTML = `<span class="user-status-offline">${lastSeen}</span>`;
  }
}

// 🔥 NUOVO: Formatta "ultimo accesso"
function formatLastSeen(timestamp) {
  if (!timestamp) return 'Offline';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (minutes < 1) return 'Ora';
  if (minutes < 60) return `${minutes} min fa`;
  if (hours < 24) return `${hours} ore fa`;
  if (days === 1) return 'Ieri';
  if (days < 7) return `${days} giorni fa`;
  
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

async function updateUserOnlineStatus(userId) {
  try {
    await supabaseClient
      .from('Utenti')
      .update({ 
        online: true, 
        last_seen: new Date().toISOString() 
      })
      .eq('id', userId);
    
    console.log('💚 Stato online aggiornato');
  } catch (error) {
    console.warn('⚠️ Errore update online:', error);
  }
}

function getUserId() {
  if (typeof getCurrentUser === 'function') {
    const user = getCurrentUser();
    return user?.id || null;
  }
  return localStorage.getItem('nodo_user_id') || null;
}

function openMessagesCenter() {
  console.log('📨 Apertura centro messaggi GIALLI...');
  resetMessagesState();
  
  // 🔥 Avvia heartbeat
  startHeartbeat();
  
  if (!document.getElementById('messagesOverlay')) {
    createMessagesUI();
  }
  
  const overlay = document.getElementById('messagesOverlay');
  const box = document.getElementById('messagesBox');
  
  if (overlay && box) {
    overlay.classList.add('active');
    setTimeout(() => box.classList.add('active'), 50);
    showConversationsList();
  }
}

function resetMessagesState() {
  console.log('🔄 Reset stato...');
  
  // Ferma polling
  if (messagesPollingInterval) {
    clearInterval(messagesPollingInterval);
    messagesPollingInterval = null;
  }
  
  // 🔥 Unsubscribe realtime
  if (messagesSubscription) {
    supabaseClient.removeChannel(messagesSubscription);
    messagesSubscription = null;
    console.log('🔌 Disconnesso da realtime messaggi');
  }
  
  currentChatUserId = null;
  currentChatUsername = null;
  lastMessageId = null;
  isInConversationsList = true;
}

function closeMessages() {
  const overlay = document.getElementById('messagesOverlay');
  const box = document.getElementById('messagesBox');
  
  if (box) box.classList.remove('active');
  setTimeout(() => {
    if (overlay) overlay.classList.remove('active');
  }, 400);
  
  resetMessagesState();
  
  // 🔥 NON fermare heartbeat qui - continua in background
  // L'utente è ancora sul sito anche se chiude i messaggi
}

function createMessagesUI() {
  const overlay = document.createElement('div');
  overlay.id = 'messagesOverlay';
  overlay.className = 'messages-overlay';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeMessages();
  });
  
  const box = document.createElement('div');
  box.id = 'messagesBox';
  box.className = 'messages-box';
  box.innerHTML = `
    <div class="messages-header">
      <div class="messages-header-left" id="messagesHeaderLeft">
        <div class="messages-avatar">
          <i class="fas fa-envelope"></i>
        </div>
        <div class="messages-user-info">
          <div class="messages-username">Messaggi</div>
        </div>
      </div>
      <button class="messages-close-btn" onclick="closeMessages()">
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    <div id="messagesMainContent" class="messages-main-content"></div>
    
    <div class="messages-input-container" id="messagesInputContainer" style="display: none;">
      <textarea 
        class="messages-input" 
        id="messagesInput" 
        placeholder="Scrivi un messaggio..."
        rows="1"
      ></textarea>
      <button class="messages-send-btn" id="messagesSendBtn">
        <i class="fas fa-arrow-up"></i>
      </button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  document.body.appendChild(box);
  
  const input = document.getElementById('messagesInput');
  const sendBtn = document.getElementById('messagesSendBtn');
  
  if (input) {
    input.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
  
  // 🔥 FIX SEND: listener diretto + preventDefault
  if (sendBtn) {
    sendBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔥 Bottone send cliccato!');
      sendMessage();
    });
    
    // Backup con touch per mobile
    sendBtn.addEventListener('touchend', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔥 Bottone send toccato!');
      sendMessage();
    });
  }
}

async function showConversationsList() {
  const currentUserId = getUserId();
  if (!currentUserId) {
    alert('❌ Devi essere loggato!');
    return;
  }
  
  console.log('📋 Caricamento rubrica completa...');
  
  if (messagesPollingInterval) {
    clearInterval(messagesPollingInterval);
    messagesPollingInterval = null;
  }
  
  currentChatUserId = null;
  currentChatUsername = null;
  lastMessageId = null;
  isInConversationsList = true;
  
  const headerLeft = document.getElementById('messagesHeaderLeft');
  if (headerLeft) {
    headerLeft.innerHTML = `
      <div class="messages-avatar">
        <i class="fas fa-envelope"></i>
      </div>
      <div class="messages-user-info">
        <div class="messages-username">Messaggi</div>
      </div>
    `;
  }
  
  const inputContainer = document.getElementById('messagesInputContainer');
  if (inputContainer) inputContainer.style.display = 'none';
  
  const mainContent = document.getElementById('messagesMainContent');
  if (!mainContent) return;
  
  try {
    // 🔥 STEP 1: Ottieni tutti i messaggi
    const { data: messages, error: messagesError } = await supabaseClient
      .from('Messaggi')
      .select('*')
      .or(`mittente_id.eq.${currentUserId},destinatario_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false });
    
    if (messagesError) throw messagesError;
    
    console.log('📨 Messaggi totali:', messages?.length || 0);
    
    // 🔥 STEP 2: Estrai ID utenti con cui hai messaggi
    const userIdsWithMessages = new Set();
    if (messages) {
      messages.forEach(msg => {
        const otherUserId = msg.mittente_id === currentUserId ? msg.destinatario_id : msg.mittente_id;
        if (otherUserId !== currentUserId) {
          userIdsWithMessages.add(otherUserId);
        }
      });
    }
    
    console.log('👥 Utenti con messaggi:', userIdsWithMessages.size);
    
    // 🔥 STEP 3: Ottieni utenti seguiti (con gestione errori)
    const userIdsFollowed = new Set();
    try {
      const { data: seguiti, error: seguitiError } = await supabaseClient
        .from('Followers')
        .select('utente_seguito_id')
        .eq('follower_id', currentUserId);
      
      if (!seguitiError && seguiti) {
        seguiti.forEach(s => {
          if (s.utente_seguito_id !== currentUserId) {
            userIdsFollowed.add(s.utente_seguito_id);
          }
        });
        console.log('⭐ Utenti seguiti:', userIdsFollowed.size);
      }
    } catch (err) {
      console.log('⚠️ Tabella Followers non disponibile:', err.message);
    }
    
    // 🔥 STEP 4: Unisci i due Set
    const relevantUserIds = new Set([...userIdsWithMessages, ...userIdsFollowed]);
    
    console.log('✅ TOTALE utenti rilevanti:', relevantUserIds.size);
    console.log('📋 ID utenti:', Array.from(relevantUserIds));
    
    // 🔥 STEP 5: Se nessun utente rilevante, mostra messaggio vuoto
    if (relevantUserIds.size === 0) {
      mainContent.innerHTML = `
        <div class="messages-empty">
          <i class="fas fa-user-friends"></i>
          <h3>Nessuna conversazione</h3>
          <p>Inizia a seguire qualcuno o manda un messaggio!</p>
        </div>
      `;
      return;
    }
    
    // 🔥 STEP 6: Carica SOLO utenti rilevanti
    const userIdsArray = Array.from(relevantUserIds);
    
    console.log('🔍 Carico utenti con IDs:', userIdsArray);
    
    const { data: users, error: usersError } = await supabaseClient
      .from('Utenti')
      .select('id, username, online, last_seen')
      .in('id', userIdsArray);
    
    if (usersError) {
      console.error('❌ Errore caricamento utenti:', usersError);
      throw usersError;
    }
    
    console.log('👥 Utenti caricati dal DB:', users?.length || 0);
    
    if (!users || users.length === 0) {
      mainContent.innerHTML = `
        <div class="messages-empty">
          <i class="fas fa-user-friends"></i>
          <h3>Nessun utente trovato</h3>
          <p>Gli utenti potrebbero essere stati eliminati</p>
        </div>
      `;
      return;
    }
    
    // 🔥 Popola cache stato utenti
    users.forEach(user => {
      usersStatusCache.set(user.id, {
        online: user.online,
        last_seen: user.last_seen
      });
    });
    
    // Raggruppa messaggi per utente
    const userMessages = new Map();
    messages.forEach(msg => {
      const otherUserId = msg.mittente_id === currentUserId ? msg.destinatario_id : msg.mittente_id;
      if (!userMessages.has(otherUserId)) {
        userMessages.set(otherUserId, []);
      }
      userMessages.get(otherUserId).push(msg);
    });
    
    // Conta messaggi non letti
    const unreadCounts = new Map();
    messages.forEach(msg => {
      if (msg.destinatario_id === currentUserId && !msg.letto) {
        const count = unreadCounts.get(msg.mittente_id) || 0;
        unreadCounts.set(msg.mittente_id, count + 1);
      }
    });
    
    // 🔥 Genera HTML con stato online/offline
    let conversationsHTML = users.map(user => {
      const userMsg = userMessages.get(user.id);
      const lastMsg = userMsg ? userMsg[0] : null;
      const unreadCount = unreadCounts.get(user.id) || 0;
      
      // 🔥 NUOVO: Indicatore online/offline
      const statusIndicator = user.online 
        ? '<div class="user-status-indicator online" title="Online"></div>'
        : `<div class="user-status-indicator offline" title="${formatLastSeen(user.last_seen)}"></div>`;
      
      const lastMsgText = lastMsg 
        ? truncateMessage(lastMsg.messaggio)
        : 'Nessun messaggio';
      
      const lastMsgTime = lastMsg 
        ? formatMessageTime(lastMsg.created_at)
        : '';
      
      return `
        <div class="conversation-item" data-user-id="${user.id}" onclick="openChat('${user.id}', '${escapeHtml(user.username)}')">
          <div class="conversation-avatar">
            ${user.username.charAt(0).toUpperCase()}
            ${statusIndicator}
          </div>
          <div class="conversation-info">
            <div class="conversation-name">${escapeHtml(user.username)}</div>
            <div class="conversation-last-message">${lastMsgText}</div>
          </div>
          ${lastMsgTime ? `<div class="conversation-time">${lastMsgTime}</div>` : ''}
          ${unreadCount > 0 ? `<div class="conversation-unread-badge">${unreadCount}</div>` : ''}
          <button class="conversation-delete-btn" onclick="event.stopPropagation(); deleteConversation('${user.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
    }).join('');
    
    if (users.length === 0) {
      conversationsHTML = `
        <div class="messages-empty">
          <i class="fas fa-user-friends"></i>
          <h3>Nessun utente disponibile</h3>
        </div>
      `;
    }
    
    mainContent.innerHTML = `
      <div class="conversations-search-container">
        <div class="conversations-search-wrapper">
          <i class="fas fa-search"></i>
          <input 
            type="text" 
            class="conversations-search-input" 
            placeholder="Cerca utente..."
            id="conversationsSearchInput"
            oninput="filterConversations()"
          >
          <button class="conversations-search-clear" id="conversationsSearchClear" onclick="clearConversationsSearch()" style="display: none;">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      <div class="conversations-list">
        ${conversationsHTML}
      </div>
    `;
    
  } catch (error) {
    console.error('❌ Errore caricamento:', error);
    mainContent.innerHTML = `
      <div class="messages-empty">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Errore di caricamento</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

function filterConversations() {
  const input = document.getElementById('conversationsSearchInput');
  const clearBtn = document.getElementById('conversationsSearchClear');
  const filter = input.value.toLowerCase().trim();
  const items = document.querySelectorAll('.conversation-item');
  
  clearBtn.style.display = filter ? 'flex' : 'none';
  
  let visibleCount = 0;
  items.forEach(item => {
    const username = item.querySelector('.conversation-name').textContent.toLowerCase();
    if (username.includes(filter)) {
      item.style.display = 'flex';
      visibleCount++;
    } else {
      item.style.display = 'none';
    }
  });
  
  const list = document.querySelector('.conversations-list');
  const existingNoResults = list.querySelector('.search-no-results');
  
  if (visibleCount === 0 && filter) {
    if (!existingNoResults) {
      const noResults = document.createElement('div');
      noResults.className = 'search-no-results';
      noResults.innerHTML = `
        <i class="fas fa-search"></i>
        <h3>Nessun risultato</h3>
        <p>Nessun utente trovato per "${escapeHtml(filter)}"</p>
      `;
      list.appendChild(noResults);
    }
  } else if (existingNoResults) {
    existingNoResults.remove();
  }
}

function clearConversationsSearch() {
  const input = document.getElementById('conversationsSearchInput');
  const clearBtn = document.getElementById('conversationsSearchClear');
  
  input.value = '';
  clearBtn.style.display = 'none';
  
  const items = document.querySelectorAll('.conversation-item');
  items.forEach(item => item.style.display = 'flex');
  
  const noResults = document.querySelector('.search-no-results');
  if (noResults) noResults.remove();
  
  input.focus();
}

window.filterConversations = filterConversations;
window.clearConversationsSearch = clearConversationsSearch;

async function deleteConversation(userId) {
  if (!confirm('Eliminare questa conversazione?')) return;
  
  const currentUserId = getUserId();
  if (!currentUserId) return;
  
  try {
    const { error } = await supabaseClient
      .from('Messaggi')
      .delete()
      .or(`and(mittente_id.eq.${currentUserId},destinatario_id.eq.${userId}),and(mittente_id.eq.${userId},destinatario_id.eq.${currentUserId})`);
    
    if (error) throw error;
    
    console.log('🗑️ Conversazione eliminata');
    showConversationsList();
  } catch (error) {
    console.error('❌ Errore:', error);
    alert('Errore durante l\'eliminazione');
  }
}

function backToConversationsList() {
  showConversationsList();
}

async function openChat(userId, username) {
  console.log(`💬 Apertura chat con ${username} (${userId})`);
  
  currentChatUserId = userId;
  currentChatUsername = username;
  isInConversationsList = false;
  
  if (messagesPollingInterval) {
    clearInterval(messagesPollingInterval);
    messagesPollingInterval = null;
  }
  
  // 🔥 Ottieni stato utente dalla cache o DB
  let userStatus = usersStatusCache.get(userId);
  if (!userStatus) {
    const { data } = await supabaseClient
      .from('Utenti')
      .select('online, last_seen')
      .eq('id', userId)
      .single();
    
    if (data) {
      userStatus = { online: data.online, last_seen: data.last_seen };
      usersStatusCache.set(userId, userStatus);
    }
  }
  
  // 🔥 Mostra stato nella UI
  const statusHTML = userStatus && userStatus.online
    ? '<span class="user-status-online"><i class="fas fa-circle"></i> Online</span>'
    : `<span class="user-status-offline">${formatLastSeen(userStatus?.last_seen)}</span>`;
  
  const headerLeft = document.getElementById('messagesHeaderLeft');
  if (headerLeft) {
    headerLeft.innerHTML = `
      <button class="messages-back-btn" onclick="backToConversationsList()">
        <i class="fas fa-arrow-left"></i>
      </button>
      <div class="messages-avatar">
        ${username.charAt(0).toUpperCase()}
      </div>
      <div class="messages-user-info">
        <div class="messages-username">${escapeHtml(username)}</div>
        <div class="messages-user-status">${statusHTML}</div>
      </div>
    `;
  }
  
  const inputContainer = document.getElementById('messagesInputContainer');
  if (inputContainer) inputContainer.style.display = 'flex';
  
  await loadChatMessages();
  await markMessagesAsRead(userId);
  
  // 🔥 REALTIME MESSAGGI
  startMessagesRealtime();
}

// 🔥 REALTIME: Ascolta nuovi messaggi
function startMessagesRealtime() {
  if (messagesSubscription) {
    supabaseClient.removeChannel(messagesSubscription);
  }
  
  console.log('🔥 Connessione realtime messaggi...');
  
  messagesSubscription = supabaseClient
    .channel(`chat-${currentChatUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'Messaggi',
        filter: `destinatario_id=eq.${getUserId()}`
      },
      (payload) => {
        if (payload.new.mittente_id === currentChatUserId) {
          console.log('⚡ Nuovo messaggio ricevuto ISTANTANEO!');
          loadChatMessages(true);
          markMessagesAsRead(currentChatUserId);
        }
      }
    )
    .subscribe((status) => {
      console.log('📡 Stato realtime messaggi:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime messaggi CONNESSO!');
      }
    });
}

async function loadChatMessages(silent = false) {
  const currentUserId = getUserId();
  if (!currentUserId || !currentChatUserId) return;
  
  const mainContent = document.getElementById('messagesMainContent');
  if (!mainContent) return;
  
  try {
    const { data: messaggi, error } = await supabaseClient
      .from('Messaggi')
      .select('*')
      .or(`and(mittente_id.eq.${currentUserId},destinatario_id.eq.${currentChatUserId}),and(mittente_id.eq.${currentChatUserId},destinatario_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    if (silent && messaggi && messaggi.length > 0) {
      const latestId = messaggi[messaggi.length - 1].id;
      if (latestId === lastMessageId) return;
      lastMessageId = latestId;
    }
    
    const messagesHTML = messaggi && messaggi.length > 0 ? 
      messaggi.map(msg => {
        const isSent = msg.mittente_id === currentUserId;
        return `
          <div class="message-bubble ${isSent ? 'sent' : 'received'}">
            <div>${escapeHtml(msg.messaggio)}</div>
            <div class="message-time">${formatMessageTime(msg.created_at)}</div>
          </div>
        `;
      }).join('') :
      `<div class="messages-empty">
        <i class="fas fa-comment-dots"></i>
        <h3>Inizia la conversazione</h3>
      </div>`;
    
    mainContent.innerHTML = `
      <div class="messages-content-scroll" id="messagesContentScroll">
        ${messagesHTML}
      </div>
    `;
    
    const scrollContainer = document.getElementById('messagesContentScroll');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

async function sendMessage() {
  console.log('📤 sendMessage() chiamata');
  
  const currentUserId = getUserId();
  if (!currentUserId || !currentChatUserId) {
    console.error('❌ Mancano userId o chatUserId');
    return;
  }
  
  const input = document.getElementById('messagesInput');
  const sendBtn = document.getElementById('messagesSendBtn');
  
  if (!input || !sendBtn) {
    console.error('❌ Input o sendBtn non trovati');
    return;
  }
  
  const messaggio = input.value.trim();
  if (!messaggio) {
    console.log('⚠️ Messaggio vuoto');
    return;
  }
  
  console.log('📨 Invio messaggio:', messaggio);
  
  try {
    sendBtn.disabled = true;
    
    const { error } = await supabaseClient
      .from('Messaggi')
      .insert([{
        mittente_id: currentUserId,
        destinatario_id: currentChatUserId,
        messaggio: messaggio,
        letto: false
      }]);
    
    if (error) throw error;
    
    console.log('✅ Messaggio inviato!');
    
    input.value = '';
    input.style.height = 'auto';
    
    await loadChatMessages();
    await createNotification(currentChatUserId, 'new_message', 'Nuovo messaggio');
    
  } catch (error) {
    console.error('❌ Errore invio:', error);
    alert('Errore durante l\'invio del messaggio');
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

async function markMessagesAsRead(senderId) {
  const currentUserId = getUserId();
  if (!currentUserId) return;
  
  try {
    const { error } = await supabaseClient
      .from('Messaggi')
      .update({ letto: true })
      .match({ 
        destinatario_id: currentUserId,
        mittente_id: senderId,
        letto: false
      });
    
    if (error) {
      console.warn('⚠️ Update messaggi:', error.message);
      return;
    }
    
    console.log('✅ Messaggi segnati come letti');
  } catch (error) {
    console.warn('⚠️ Errore markMessagesAsRead:', error.message);
  }
}

async function deleteMessageNotifications() {
  const currentUserId = getUserId();
  if (!currentUserId) return;
  
  console.log('🗑️ Cancello notifiche messaggi...');
  
  try {
    await supabaseClient
      .from('Notifiche')
      .delete()
      .eq('utente_id', currentUserId)
      .eq('tipo', 'new_message');
    
    console.log('✅ Notifiche cancellate!');
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

async function deleteAllMessageNotifications() {
  await deleteMessageNotifications();
}

// 🔥 FUNZIONE AGGIORNAMENTO BADGE FORZATO
async function forceUpdateNotificationBadge() {
  console.log('🔄 Forzo aggiornamento badge...');
  
  try {
    const currentUserId = getUserId();
    if (!currentUserId) return;
    
    const { count, error } = await supabaseClient
      .from('Notifiche')
      .select('*', { count: 'exact', head: true })
      .eq('utente_id', currentUserId)
      .eq('letta', false);
    
    if (error) throw error;
    
    console.log('✅ Notifiche non lette:', count);
    
    // Cerca badge in tutti i modi possibili
    const badge = document.querySelector('.notification-badge') || 
                  document.querySelector('[id*="notification"][id*="badge" i]') ||
                  document.querySelector('[class*="notification"][class*="badge" i]') ||
                  document.getElementById('notificationBadge') ||
                  document.getElementById('notifBadge');
    
    if (badge) {
      console.log('✅ Badge trovato!', badge);
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    } else {
      console.warn('⚠️ Badge non trovato nel DOM');
    }
  } catch (error) {
    console.error('❌ Errore badge:', error);
  }
}

async function updateNotificationsBadge() {
  console.log('🔄 Aggiorno badge...');
  
  // Prova funzione originale
  if (typeof window.loadNotificationsCount === 'function') {
    await window.loadNotificationsCount();
  }
  
  // Forza aggiornamento manuale
  await forceUpdateNotificationBadge();
}

async function createNotification(userId, tipo, messaggio) {
  try {
    await supabaseClient
      .from('Notifiche')
      .insert([{
        utente_id: userId,
        tipo: tipo,
        messaggio: messaggio,
        letta: false
      }]);
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

async function openDirectChat(userId, username) {
  openMessagesCenter();
  setTimeout(() => openChat(userId, username), 500);
}

function formatMessageTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) {
    const mins = Math.floor(diff / (1000 * 60));
    return mins < 1 ? 'Ora' : `${mins}m`;
  }
  if (hours < 24) return `${hours}h`;
  
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ieri';
  if (days < 7) return `${days}g`;
  
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

function truncateMessage(text, maxLength = 40) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.openMessagesCenter = openMessagesCenter;
window.closeMessages = closeMessages;
window.showConversationsList = showConversationsList;
window.backToConversationsList = backToConversationsList;
window.openChat = openChat;
window.sendMessage = sendMessage;
window.deleteConversation = deleteConversation;
window.openDirectChat = openDirectChat;
window.forceUpdateNotificationBadge = forceUpdateNotificationBadge;

// 🔥 Avvia heartbeat automaticamente quando la pagina carica
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('messagesOverlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeMessages();
      }
    });
  }
  
  // Avvia heartbeat per tutti gli utenti loggati
  const userId = getUserId();
  if (userId) {
    console.log('🚀 Avvio heartbeat automatico...');
    startHeartbeat();
  }
});

// 🔥 Ferma heartbeat quando chiudi la pagina/tab
window.addEventListener('beforeunload', () => {
  stopHeartbeat();
});

// 🔥 Gestisci visibilità pagina (tab nascosta/visibile)
document.addEventListener('visibilitychange', () => {
  const userId = getUserId();
  if (!userId) return;
  
  if (document.hidden) {
    // Tab nascosta - continua heartbeat ma meno frequente
    console.log('😴 Tab nascosta');
  } else {
    // Tab visibile - aggiorna subito
    console.log('👀 Tab visibile');
    updateUserOnlineStatus(userId);
  }
});
