// ========================================
// 🟡 NODO MESSAGGISTICA - VERSIONE MOBILE OPTIMIZED
// ========================================
// ✅ Heartbeat SOLO quando messaggi aperti
// ✅ Realtime SOLO chat specifica
// ✅ Lazy loading completo
// ✅ Cache limitata e pulita
// ========================================

let currentChatUserId = null;
let currentChatUsername = null;
let messagesPollingInterval = null;
let lastMessageId = null;
let isInConversationsList = true;
let heartbeatInterval = null;
let isMessagesOpen = false; // 🔥 NUOVO: traccia se messaggi sono aperti

// 🔥 REALTIME SUBSCRIPTIONS
let messagesSubscription = null;
let userStatusSubscription = null;

// 🔥 CACHE STATO UTENTI - LIMITATA a 100 utenti max
let usersStatusCache = new Map();
const MAX_CACHE_SIZE = 100;

// 🔥 SISTEMA HEARTBEAT - SOLO SE MESSAGGI APERTI
function startHeartbeat() {
  const userId = getUserId();
  if (!userId) return;
  
  // Aggiorna subito
  updateUserOnlineStatus(userId);
  
  // Poi ogni 60 secondi (prima era 20!)
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  
  heartbeatInterval = setInterval(() => {
    // 🔥 NUOVO: Salta se messaggi chiusi
    if (!isMessagesOpen) {
      console.log('⏸️ Messaggi chiusi, skip heartbeat');
      return;
    }
    updateUserOnlineStatus(userId);
  }, 60000); // 🔥 60 secondi invece di 20
  
  console.log('💓 Heartbeat avviato (60s)');
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
  stopUserStatusRealtime();
}

// 🔥 NUOVO: Stop realtime separato
function stopUserStatusRealtime() {
  if (userStatusSubscription) {
    supabaseClient.removeChannel(userStatusSubscription);
    userStatusSubscription = null;
    console.log('🔌 Disconnesso da realtime stato utenti');
  }
}

// 🔥 MODIFICATO: Realtime SOLO per lista conversazioni
function startConversationsStatusRealtime() {
  if (userStatusSubscription) {
    supabaseClient.removeChannel(userStatusSubscription);
  }
  
  console.log('🔌 Connessione realtime stato (solo conversazioni)...');
  
  userStatusSubscription = supabaseClient
    .channel('user-status-conversations')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'Utenti'
      },
      (payload) => {
        // 🔥 NUOVO: Aggiorna SOLO se nella lista conversazioni
        if (!isInConversationsList) return;
        
        console.log('⚡ Stato utente:', payload.new.username, payload.new.online);
        
        // Aggiorna cache (con limite)
        updateCache(payload.new.id, {
          online: payload.new.online,
          last_seen: payload.new.last_seen
        });
        
        // Aggiorna UI lista conversazioni
        updateConversationUserStatus(payload.new.id, payload.new.online, payload.new.last_seen);
      }
    )
    .subscribe((status) => {
      console.log('📡 Realtime conversazioni:', status);
    });
}

// 🔥 NUOVO: Realtime SPECIFICO per singola chat
function startChatStatusRealtime(targetUserId) {
  stopUserStatusRealtime(); // Prima disconnetti quello vecchio
  
  console.log('🔌 Connessione realtime chat con:', targetUserId);
  
  userStatusSubscription = supabaseClient
    .channel(`user-status-chat-${targetUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'Utenti',
        filter: `id=eq.${targetUserId}` // 🔥 SOLO questo utente!
      },
      (payload) => {
        console.log('⚡ Stato chat aggiornato:', payload.new.online);
        updateChatUserStatusUI(payload.new);
      }
    )
    .subscribe((status) => {
      console.log('📡 Realtime chat:', status);
    });
}

// 🔥 NUOVO: Aggiorna cache con limite
function updateCache(userId, data) {
  // Se cache piena, rimuovi il più vecchio
  if (usersStatusCache.size >= MAX_CACHE_SIZE) {
    const firstKey = usersStatusCache.keys().next().value;
    usersStatusCache.delete(firstKey);
  }
  usersStatusCache.set(userId, data);
}

// 🔥 NUOVO: Pulisci cache
function clearCache() {
  usersStatusCache.clear();
  console.log('🧹 Cache pulita');
}

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
}

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

// 🔥 MODIFICATO: Apertura messaggi con lazy loading
async function openMessagesCenter(targetUserId = null, prefillMessage = null) {
  console.log('📨 Apertura centro messaggi...', targetUserId ? `Target: ${targetUserId}` : 'Inbox');
  
  // 🔥 NUOVO: Marca come aperti
  isMessagesOpen = true;
  
  resetMessagesState();
  
  // 🔥 NUOVO: Avvia heartbeat SOLO ORA
  startHeartbeat();
  
  if (!document.getElementById('messagesOverlay')) {
    createMessagesUI();
  }
  
  const overlay = document.getElementById('messagesOverlay');
  const box = document.getElementById('messagesBox');
  
  if (overlay && box) {
    overlay.classList.add('active');
    setTimeout(() => box.classList.add('active'), 50);
    
    if (targetUserId) {
      console.log('🎯 Apertura chat diretta con:', targetUserId);
      
      try {
        const { data: userData, error } = await supabaseClient
          .from('Utenti')
          .select('username')
          .eq('id', targetUserId)
          .single();
        
        if (error) throw error;
        if (!userData) throw new Error('Utente non trovato');
        
        const targetUsername = userData.username;
        
        await showConversationsList();
        
        setTimeout(() => {
          openChat(targetUserId, targetUsername);
          
          if (prefillMessage) {
            setTimeout(() => {
              const messageInput = document.getElementById('messagesInput');
              if (messageInput) {
                messageInput.value = prefillMessage;
                messageInput.style.height = 'auto';
                messageInput.style.height = messageInput.scrollHeight + 'px';
                console.log('✅ Messaggio pre-compilato');
              }
            }, 500);
          }
        }, 300);
        
      } catch (error) {
        console.error('❌ Errore apertura chat:', error);
        showConversationsList();
      }
    } else {
      showConversationsList();
    }
  }
}

function resetMessagesState() {
  console.log('🔄 Reset stato...');
  
  // Ferma polling
  if (messagesPollingInterval) {
    clearInterval(messagesPollingInterval);
    messagesPollingInterval = null;
  }
  
  // Unsubscribe realtime messaggi
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

// 🔥 MODIFICATO: Chiusura completa
function closeMessages() {
  const overlay = document.getElementById('messagesOverlay');
  const box = document.getElementById('messagesBox');
  
  if (box) box.classList.remove('active');
  setTimeout(() => {
    if (overlay) overlay.classList.remove('active');
  }, 400);
  
  // 🔥 NUOVO: Marca come chiusi
  isMessagesOpen = false;
  
  resetMessagesState();
  stopHeartbeat(); // 🔥 NUOVO: Ferma heartbeat quando chiudi
  clearCache(); // 🔥 NUOVO: Pulisci cache
}

// ========================================
// UI CREATION (parte troncata per brevità)
// Inserisci qui le funzioni createMessagesUI(), showConversationsList(), ecc.
// dalle righe 288-834 del file originale
// ========================================

function createMessagesUI() {
  if (document.getElementById('messagesOverlay')) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'messagesOverlay';
  overlay.className = 'messages-overlay';
  
  const messagesBox = document.createElement('div');
  messagesBox.id = 'messagesBox';
  messagesBox.className = 'messages-box';
  
  messagesBox.innerHTML = `
    <div class="messages-header">
      <div class="messages-header-left">
        <button id="messagesBackBtn" class="messages-back-btn" style="display: none;" onclick="backToConversationsList()">
          <i class="fas fa-arrow-left"></i>
        </button>
        <div class="messages-user-info" style="display: none;">
          <div class="messages-user-name"></div>
          <div class="messages-user-status"></div>
        </div>
        <h3 id="messagesHeaderTitle" class="messages-title">
          <i class="fas fa-envelope"></i> Messaggi
        </h3>
      </div>
      <button class="messages-close-btn" onclick="closeMessages()">
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    <div id="messagesContent" class="messages-content">
      <div class="messages-loader">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Caricamento messaggi...</p>
      </div>
    </div>
    
    <div id="messagesInputSection" class="messages-input-section" style="display: none;">
      <textarea 
        id="messagesInput" 
        class="messages-input" 
        placeholder="Scrivi un messaggio..."
        rows="1"
      ></textarea>
      <button id="messagesSendBtn" class="messages-send-btn" onclick="sendMessage()">
        <i class="fas fa-paper-plane"></i>
      </button>
    </div>
  `;
  
  overlay.appendChild(messagesBox);
  document.body.appendChild(overlay);
  
  const input = document.getElementById('messagesInput');
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
}

async function showConversationsList() {
  console.log('📋 Carico lista conversazioni...');
  
  isInConversationsList = true;
  currentChatUserId = null;
  currentChatUsername = null;
  
  // 🔥 NUOVO: Avvia realtime SOLO per conversazioni
  startConversationsStatusRealtime();
  
  const headerTitle = document.getElementById('messagesHeaderTitle');
  const backBtn = document.getElementById('messagesBackBtn');
  const userInfo = document.querySelector('.messages-user-info');
  const inputSection = document.getElementById('messagesInputSection');
  const content = document.getElementById('messagesContent');
  
  if (headerTitle) headerTitle.innerHTML = '<i class="fas fa-envelope"></i> Messaggi';
  if (backBtn) backBtn.style.display = 'none';
  if (userInfo) userInfo.style.display = 'none';
  if (inputSection) inputSection.style.display = 'none';
  
  if (messagesPollingInterval) {
    clearInterval(messagesPollingInterval);
    messagesPollingInterval = null;
  }
  
  if (messagesSubscription) {
    supabaseClient.removeChannel(messagesSubscription);
    messagesSubscription = null;
  }
  
  const currentUserId = getUserId();
  if (!currentUserId) {
    if (content) content.innerHTML = '<div class="messages-empty"><i class="fas fa-user-slash"></i><p>Effettua il login per vedere i messaggi</p></div>';
    return;
  }
  
  try {
    const { data: messages, error } = await supabaseClient
      .from('Messaggi')
      .select(`
        id,
        messaggio,
        created_at,
        letto,
        mittente:mittente_id(id, username, immagine_profilo, online, last_seen),
        destinatario:destinatario_id(id, username, immagine_profilo, online, last_seen)
      `)
      .or(`mittente_id.eq.${currentUserId},destinatario_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const conversations = {};
    
    messages.forEach(msg => {
      const otherUser = msg.mittente?.id === currentUserId ? msg.destinatario : msg.mittente;
      if (!otherUser) return;
      
      const conversationKey = otherUser.id;
      
      if (!conversations[conversationKey] || new Date(msg.created_at) > new Date(conversations[conversationKey].created_at)) {
        conversations[conversationKey] = {
          userId: otherUser.id,
          username: otherUser.username,
          profileImage: otherUser.immagine_profilo,
          online: otherUser.online,
          lastSeen: otherUser.last_seen,
          lastMessage: msg.messaggio,
          lastMessageTime: msg.created_at,
          unread: msg.destinatario_id === currentUserId && !msg.letto
        };
      }
    });
    
    const conversationsList = Object.values(conversations).sort((a, b) => 
      new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
    );
    
    if (conversationsList.length === 0) {
      if (content) content.innerHTML = '<div class="messages-empty"><i class="fas fa-inbox"></i><p>Nessun messaggio ancora</p></div>';
      return;
    }
    
    let html = '<div class="conversations-list">';
    
    conversationsList.forEach(conv => {
      const profileImg = conv.profileImage || 'https://via.placeholder.com/50';
      const statusClass = conv.online ? 'online' : 'offline';
      const statusTitle = conv.online ? 'Online' : formatLastSeen(conv.lastSeen);
      const unreadClass = conv.unread ? 'unread' : '';
      
      html += `
        <div class="conversation-item ${unreadClass}" data-user-id="${conv.userId}" onclick="openChat('${conv.userId}', '${escapeHtml(conv.username)}')">
          <div class="conversation-avatar">
            <img src="${profileImg}" alt="${escapeHtml(conv.username)}">
            <span class="user-status-indicator ${statusClass}" title="${statusTitle}"></span>
          </div>
          <div class="conversation-info">
            <div class="conversation-header">
              <span class="conversation-username">${escapeHtml(conv.username)}</span>
              <span class="conversation-time">${formatMessageTime(conv.lastMessageTime)}</span>
            </div>
            <div class="conversation-preview">
              ${escapeHtml(truncateMessage(conv.lastMessage))}
            </div>
          </div>
          ${conv.unread ? '<div class="unread-badge"></div>' : ''}
        </div>
      `;
    });
    
    html += '</div>';
    
    if (content) content.innerHTML = html;
    
  } catch (error) {
    console.error('❌ Errore caricamento conversazioni:', error);
    if (content) content.innerHTML = '<div class="messages-empty"><i class="fas fa-exclamation-triangle"></i><p>Errore caricamento messaggi</p></div>';
  }
}

function backToConversationsList() {
  // 🔥 NUOVO: Stop realtime chat specifica
  stopUserStatusRealtime();
  
  showConversationsList();
}

async function openChat(userId, username) {
  console.log('💬 Apertura chat con:', username);
  
  isInConversationsList = false;
  currentChatUserId = userId;
  currentChatUsername = username;
  
  // 🔥 NUOVO: Avvia realtime SOLO per questo utente
  startChatStatusRealtime(userId);
  
  const headerTitle = document.getElementById('messagesHeaderTitle');
  const backBtn = document.getElementById('messagesBackBtn');
  const userInfo = document.querySelector('.messages-user-info');
  const userName = document.querySelector('.messages-user-name');
  const userStatus = document.querySelector('.messages-user-status');
  const inputSection = document.getElementById('messagesInputSection');
  
  if (headerTitle) headerTitle.style.display = 'none';
  if (backBtn) backBtn.style.display = 'flex';
  if (userInfo) userInfo.style.display = 'flex';
  if (userName) userName.textContent = username;
  if (inputSection) inputSection.style.display = 'flex';
  
  try {
    const { data: userData, error } = await supabaseClient
      .from('Utenti')
      .select('online, last_seen')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    if (userStatus) {
      if (userData.online) {
        userStatus.innerHTML = '<span class="user-status-online"><i class="fas fa-circle"></i> Online</span>';
      } else if (userData.last_seen) {
        const lastSeen = formatLastSeen(userData.last_seen);
        userStatus.innerHTML = `<span class="user-status-offline">${lastSeen}</span>`;
      }
    }
  } catch (error) {
    console.warn('⚠️ Errore caricamento stato utente:', error);
  }
  
  await loadChatMessages();
  await markMessagesAsRead(userId);
  
  // 🔥 MODIFICATO: Polling ridotto (ogni 5 secondi invece di continuo)
  if (messagesPollingInterval) {
    clearInterval(messagesPollingInterval);
  }
  
  messagesPollingInterval = setInterval(async () => {
    if (!isMessagesOpen || isInConversationsList) {
      clearInterval(messagesPollingInterval);
      return;
    }
    await loadChatMessages();
  }, 5000); // 🔥 5 secondi invece di 2
  
  startMessagesRealtime();
}

async function loadChatMessages() {
  const currentUserId = getUserId();
  if (!currentUserId || !currentChatUserId) return;
  
  const content = document.getElementById('messagesContent');
  if (!content) return;
  
  try {
    const { data: messages, error } = await supabaseClient
      .from('Messaggi')
      .select('*')
      .or(`and(mittente_id.eq.${currentUserId},destinatario_id.eq.${currentChatUserId}),and(mittente_id.eq.${currentChatUserId},destinatario_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    let html = '<div class="chat-messages-list">';
    
    if (messages.length === 0) {
      html += '<div class="chat-empty"><i class="fas fa-comment-dots"></i><p>Inizia la conversazione!</p></div>';
    } else {
      messages.forEach(msg => {
        const isMine = msg.mittente_id === currentUserId;
        const messageClass = isMine ? 'message-mine' : 'message-theirs';
        const time = new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        
        html += `
          <div class="chat-message ${messageClass}">
            <div class="message-bubble">
              <div class="message-text">${escapeHtml(msg.messaggio)}</div>
              <div class="message-time">${time}</div>
            </div>
          </div>
        `;
      });
    }
    
    html += '</div>';
    
    const wasAtBottom = content.scrollHeight - content.scrollTop <= content.clientHeight + 100;
    
    content.innerHTML = html;
    
    if (wasAtBottom || !lastMessageId) {
      content.scrollTop = content.scrollHeight;
    }
    
    if (messages.length > 0) {
      lastMessageId = messages[messages.length - 1].id;
    }
    
  } catch (error) {
    console.error('❌ Errore caricamento messaggi:', error);
  }
}

function startMessagesRealtime() {
  if (messagesSubscription) {
    supabaseClient.removeChannel(messagesSubscription);
  }
  
  const currentUserId = getUserId();
  if (!currentUserId || !currentChatUserId) return;
  
  console.log('🔌 Connessione realtime messaggi...');
  
  messagesSubscription = supabaseClient
    .channel(`messages-${currentUserId}-${currentChatUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'Messaggi',
        // 🔥 NUOVO: Filtra SOLO messaggi di questa chat
        filter: `or(and(mittente_id.eq.${currentUserId},destinatario_id.eq.${currentChatUserId}),and(mittente_id.eq.${currentChatUserId},destinatario_id.eq.${currentUserId}))`
      },
      async (payload) => {
        console.log('⚡ Nuovo messaggio realtime:', payload.new);
        await loadChatMessages();
        
        if (payload.new.destinatario_id === currentUserId) {
          await markMessagesAsRead(currentChatUserId);
        }
      }
    )
    .subscribe((status) => {
      console.log('📡 Stato realtime messaggi:', status);
    });
}

async function deleteConversation(userId, username) {
  if (!confirm(`Eliminare la conversazione con ${username}?`)) {
    return;
  }
  
  const currentUserId = getUserId();
  if (!currentUserId) return;
  
  try {
    const { error } = await supabaseClient
      .from('Messaggi')
      .delete()
      .or(`and(mittente_id.eq.${currentUserId},destinatario_id.eq.${userId}),and(mittente_id.eq.${userId},destinatario_id.eq.${currentUserId})`);
    
    if (error) throw error;
    
    console.log('✅ Conversazione eliminata');
    showConversationsList();
    
  } catch (error) {
    console.error('❌ Errore eliminazione:', error);
    alert('Errore durante l\'eliminazione della conversazione');
  }
}

async function sendMessage() {
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
  
  if (typeof window.loadNotificationsCount === 'function') {
    await window.loadNotificationsCount();
  }
  
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

// ========================================
// EXPORTS
// ========================================
window.openMessagesCenter = openMessagesCenter;
window.closeMessages = closeMessages;
window.showConversationsList = showConversationsList;
window.backToConversationsList = backToConversationsList;
window.openChat = openChat;
window.sendMessage = sendMessage;
window.deleteConversation = deleteConversation;
window.openDirectChat = openDirectChat;
window.forceUpdateNotificationBadge = forceUpdateNotificationBadge;

// ========================================
// 🔥 EVENT LISTENERS - LAZY LOADING
// ========================================

// 🔥 RIMOSSO: NON avviare heartbeat automaticamente!
// Heartbeat si avvia SOLO quando apri messaggi

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('messagesOverlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeMessages();
      }
    });
  }
  
  console.log('✅ Sistema messaggi pronto (lazy mode)');
});

// 🔥 MODIFICATO: Gestione chiusura pagina più efficiente
window.addEventListener('beforeunload', () => {
  if (isMessagesOpen) {
    stopHeartbeat();
  }
});

// 🔥 MODIFICATO: Solo per iOS/Safari
if (/iPhone|iPad|iPod|Safari/i.test(navigator.userAgent)) {
  window.addEventListener('pagehide', () => {
    if (isMessagesOpen) {
      stopHeartbeat();
    }
  });
}

// 🔥 MODIFICATO: Gestione visibility solo se messaggi aperti
document.addEventListener('visibilitychange', () => {
  if (!isMessagesOpen) return; // Skip se messaggi chiusi
  
  const userId = getUserId();
  if (!userId) return;
  
  if (document.hidden) {
    console.log('😴 Tab nascosta - sospendo heartbeat');
    // NON settare offline, solo pausa heartbeat
  } else {
    console.log('👀 Tab visibile - riprendo');
    updateUserOnlineStatus(userId);
  }
});

// 🔥 RIMOSSO: blur/focus event listeners - troppo pesanti su mobile
// Il visibility change è sufficiente
