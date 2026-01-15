// ========================================
// 🟡 NODO MESSAGGISTICA - VERSIONE GIALLA
// ========================================

console.log('%c🟡 NODO MESSAGGI GIALLI CARICATO! v4.0', 'background: #fbbf24; color: #000; font-size: 20px; padding: 10px; font-weight: bold;');

// 🔥 VERIFICA VISIVA
setTimeout(() => {
  const testDiv = document.createElement('div');
  testDiv.id = 'nodo-version-check';
  testDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    color: #000;
    padding: 15px 30px;
    border-radius: 15px;
    font-weight: 900;
    font-size: 16px;
    z-index: 99999;
    box-shadow: 0 4px 20px rgba(251, 191, 36, 0.6);
  `;
  testDiv.innerHTML = '✅ MESSAGGI GIALLI v4.0 CARICATO!';
  document.body.appendChild(testDiv);
  
  setTimeout(() => {
    testDiv.style.opacity = '0';
    testDiv.style.transition = 'opacity 1s';
    setTimeout(() => testDiv.remove(), 1000);
  }, 3000);
}, 1000);

let currentChatUserId = null;
let currentChatUsername = null;
let messagesPollingInterval = null;
let lastMessageId = null;
let isInConversationsList = true;

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
  
  if (messagesPollingInterval) {
    clearInterval(messagesPollingInterval);
    messagesPollingInterval = null;
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
      <button class="messages-send-btn" id="messagesSendBtn" onclick="sendMessage()">
        <i class="fas fa-arrow-up"></i>
      </button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  document.body.appendChild(box);
  
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
  const currentUserId = getUserId();
  if (!currentUserId) {
    alert('❌ Devi essere loggato!');
    return;
  }
  
  console.log('📋 Caricamento lista...');
  
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
  
  const mainContent = document.getElementById('messagesMainContent');
  const inputContainer = document.getElementById('messagesInputContainer');
  
  if (inputContainer) inputContainer.style.display = 'none';
  
  try {
    const { data: messaggi, error } = await supabaseClient
      .from('Messaggi')
      .select(`
        id,
        mittente_id,
        destinatario_id,
        messaggio,
        created_at,
        letto,
        mittente:Utenti!Messaggi_mittente_id_fkey(id, username),
        destinatario:Utenti!Messaggi_destinatario_id_fkey(id, username)
      `)
      .or(`mittente_id.eq.${currentUserId},destinatario_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log('✅ Messaggi:', messaggi?.length || 0);
    
    const conversazioni = new Map();
    
    messaggi?.forEach(msg => {
      const otherUserId = msg.mittente_id === currentUserId 
        ? msg.destinatario_id 
        : msg.mittente_id;
      
      const otherUser = msg.mittente_id === currentUserId 
        ? msg.destinatario 
        : msg.mittente;
      
      if (!conversazioni.has(otherUserId)) {
        conversazioni.set(otherUserId, {
          userId: otherUserId,
          username: otherUser?.username || 'Utente',
          lastMessage: msg.messaggio,
          lastMessageTime: msg.created_at,
          unreadCount: 0
        });
      }
      
      const conv = conversazioni.get(otherUserId);
      
      if (msg.destinatario_id === currentUserId && !msg.letto) {
        conv.unreadCount++;
      }
    });
    
    const conversazioniArray = Array.from(conversazioni.values())
      .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
    
    if (conversazioniArray.length === 0) {
      mainContent.innerHTML = `
        <div class="messages-empty">
          <i class="fas fa-inbox"></i>
          <h3>Nessun messaggio</h3>
          <p>Le tue conversazioni appariranno qui</p>
        </div>
      `;
    } else {
      mainContent.innerHTML = `
        <div class="conversations-list">
          ${conversazioniArray.map(conv => `
            <div class="conversation-item" onclick="openChat('${conv.userId}', '${escapeHtml(conv.username)}')">
              <div class="conversation-avatar">
                <i class="fas fa-user"></i>
              </div>
              <div class="conversation-info">
                <div class="conversation-name">${escapeHtml(conv.username)}</div>
                <div class="conversation-last-message">${truncateMessage(conv.lastMessage)}</div>
              </div>
              <div class="conversation-time">${formatMessageTime(conv.lastMessageTime)}</div>
              ${conv.unreadCount > 0 ? `
                <div class="conversation-unread-badge">${conv.unreadCount}</div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }
    
    console.log('🗑️ Cancello notifiche...');
    await deleteAllMessageNotifications();
    
    setTimeout(async () => {
      await updateNotificationsBadge();
      console.log('✅ Badge aggiornato!');
    }, 1000);
    
  } catch (error) {
    console.error('❌ Errore:', error);
    mainContent.innerHTML = `
      <div class="messages-empty">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Errore</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

async function openChat(userId, username) {
  console.log('💬 Apertura chat:', username);
  
  if (messagesPollingInterval) {
    clearInterval(messagesPollingInterval);
    messagesPollingInterval = null;
  }
  
  currentChatUserId = userId;
  currentChatUsername = username;
  isInConversationsList = false;
  lastMessageId = null;
  
  const headerLeft = document.getElementById('messagesHeaderLeft');
  if (headerLeft) {
    headerLeft.innerHTML = `
      <button class="messages-back-btn" onclick="backToConversationsList()">
        <i class="fas fa-arrow-left"></i>
      </button>
      <div class="messages-avatar">
        <i class="fas fa-user"></i>
      </div>
      <div class="messages-user-info">
        <div class="messages-username">${escapeHtml(username)}</div>
      </div>
    `;
  }
  
  const inputContainer = document.getElementById('messagesInputContainer');
  if (inputContainer) inputContainer.style.display = 'flex';
  
  await markMessagesAsRead(userId);
  await deleteMessageNotifications(userId);
  
  setTimeout(async () => {
    await updateNotificationsBadge();
    console.log('✅ Badge aggiornato dopo apertura chat');
  }, 1000);
  
  await loadChatMessages();
  
  messagesPollingInterval = setInterval(async () => {
    if (currentChatUserId === userId && !isInConversationsList) {
      await loadChatMessages(true);
    }
  }, 3000);
}

async function backToConversationsList() {
  console.log('⬅️ Indietro');
  
  if (messagesPollingInterval) {
    clearInterval(messagesPollingInterval);
    messagesPollingInterval = null;
  }
  
  currentChatUserId = null;
  currentChatUsername = null;
  lastMessageId = null;
  isInConversationsList = true;
  
  await showConversationsList();
}

async function loadChatMessages(silent = false) {
  const currentUserId = getUserId();
  if (!currentUserId || !currentChatUserId || isInConversationsList) return;
  
  const mainContent = document.getElementById('messagesMainContent');
  
  try {
    if (!silent) {
      mainContent.innerHTML = `
        <div class="messages-content-scroll">
          <div class="messages-empty">
            <i class="fas fa-spinner fa-spin"></i>
            <h3>Caricamento...</h3>
          </div>
        </div>
      `;
    }
    
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
  const currentUserId = getUserId();
  if (!currentUserId || !currentChatUserId) return;
  
  const input = document.getElementById('messagesInput');
  const sendBtn = document.getElementById('messagesSendBtn');
  
  if (!input || !sendBtn) return;
  
  const messaggio = input.value.trim();
  if (!messaggio) return;
  
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
    
    input.value = '';
    input.style.height = 'auto';
    
    await loadChatMessages();
    await createNotification(currentChatUserId, 'new_message', 'Nuovo messaggio');
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

async function markMessagesAsRead(senderId) {
  const currentUserId = getUserId();
  if (!currentUserId) return;
  
  try {
    await supabaseClient
      .from('Messaggi')
      .update({ letto: true })
      .eq('destinatario_id', currentUserId)
      .eq('mittente_id', senderId)
      .eq('letto', false);
    
    console.log('✅ Messaggi letti');
  } catch (error) {
    console.error('❌ Errore:', error);
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
window.openDirectChat = openDirectChat;
window.forceUpdateNotificationBadge = forceUpdateNotificationBadge;

console.log('%c✅ MESSAGGI GIALLI PRONTI!', 'background: #10b981; color: #fff; font-size: 16px; padding: 5px;');
