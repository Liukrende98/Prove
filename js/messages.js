// ========================================
// SISTEMA MESSAGGISTICA TIPO WHATSAPP
// ========================================

console.log('📨 messages.js caricato!');

let currentChatUserId = null;
let currentChatUsername = null;
let messagesPollingInterval = null;
let lastMessageId = null;
let isInConversationsList = true; // 🆕 Traccia se sei nella lista o in una chat

// ========================================
// 🆕 GET USER ID (compatibile con auth.js)
// ========================================
function getUserId() {
  // Prova prima con getCurrentUser() da auth.js
  if (typeof getCurrentUser === 'function') {
    const user = getCurrentUser();
    return user?.id || null;
  }
  // Fallback su localStorage
  return localStorage.getItem('nodo_user_id') || null;
}

// ========================================
// APRI CENTRO MESSAGGI
// ========================================
function openMessagesCenter() {
  console.log('📨 Apertura centro messaggi...');
  
  // 🆕 Reset completo stato
  resetMessagesState();
  
  // Crea overlay e box se non esistono
  if (!document.getElementById('messagesOverlay')) {
    createMessagesUI();
  }
  
  const overlay = document.getElementById('messagesOverlay');
  const box = document.getElementById('messagesBox');
  
  if (overlay && box) {
    overlay.classList.add('active');
    setTimeout(() => box.classList.add('active'), 50);
    
    // Mostra lista conversazioni
    showConversationsList();
  }
}

// ========================================
// 🆕 RESET COMPLETO STATO
// ========================================
function resetMessagesState() {
  console.log('🔄 Reset stato messaggistica...');
  
  // Ferma polling
  if (messagesPollingInterval) {
    clearInterval(messagesPollingInterval);
    messagesPollingInterval = null;
  }
  
  // Reset variabili
  currentChatUserId = null;
  currentChatUsername = null;
  lastMessageId = null;
  isInConversationsList = true;
}

// ========================================
// CHIUDI MESSAGGI
// ========================================
function closeMessages() {
  const overlay = document.getElementById('messagesOverlay');
  const box = document.getElementById('messagesBox');
  
  if (box) box.classList.remove('active');
  
  setTimeout(() => {
    if (overlay) overlay.classList.remove('active');
  }, 400);
  
  // Reset completo
  resetMessagesState();
}

// ========================================
// CREA UI MESSAGGI
// ========================================
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
    
    <div id="messagesMainContent"></div>
    
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
  
  // Auto-resize textarea
  const input = document.getElementById('messagesInput');
  if (input) {
    input.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    
    // Invio con Enter (Shift+Enter = nuova riga)
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
}

// ========================================
// MOSTRA LISTA CONVERSAZIONI
// ========================================
async function showConversationsList() {
  const currentUserId = getUserId();
  if (!currentUserId) {
    alert('❌ Devi essere loggato!');
    return;
  }
  
  console.log('📋 Caricamento lista conversazioni...');
  
  // 🆕 RESET STATO quando torni alla lista
  if (messagesPollingInterval) {
    clearInterval(messagesPollingInterval);
    messagesPollingInterval = null;
  }
  currentChatUserId = null;
  currentChatUsername = null;
  lastMessageId = null;
  isInConversationsList = true;
  
  // 🆕 RESET HEADER ALLA LISTA
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
    // Prendi tutti i messaggi dell'utente (inviati o ricevuti)
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
    
    console.log('✅ Messaggi caricati:', messaggi?.length || 0);
    
    // Raggruppa per conversazione
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
          unreadCount: 0,
          messages: []
        });
      }
      
      const conv = conversazioni.get(otherUserId);
      conv.messages.push(msg);
      
      // Conta non letti
      if (msg.destinatario_id === currentUserId && !msg.letto) {
        conv.unreadCount++;
      }
    });
    
    // Renderizza lista
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
    
    // 🆕 CANCELLA TUTTE LE NOTIFICHE MESSAGGI quando visualizzi la lista
    await deleteAllMessageNotifications();
    
  } catch (error) {
    console.error('❌ Errore caricamento conversazioni:', error);
    mainContent.innerHTML = `
      <div class="messages-empty">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Errore</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// ========================================
// APRI CHAT CON UTENTE
// ========================================
async function openChat(userId, username) {
  console.log('💬 Apertura chat con:', username, 'ID:', userId);
  
  // 🆕 Ferma polling precedente se esiste
  if (messagesPollingInterval) {
    clearInterval(messagesPollingInterval);
    messagesPollingInterval = null;
  }
  
  // Imposta stato chat
  currentChatUserId = userId;
  currentChatUsername = username;
  isInConversationsList = false;
  lastMessageId = null;
  
  // 🆕 Aggiorna header CON FRECCIA INDIETRO FUNZIONANTE
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
  
  // Mostra input
  const inputContainer = document.getElementById('messagesInputContainer');
  if (inputContainer) inputContainer.style.display = 'flex';
  
  // 🔧 SEGNA MESSAGGI COME LETTI
  await markMessagesAsRead(userId);
  
  // 🔧 CANCELLA NOTIFICHE
  await deleteMessageNotifications(userId);
  
  // Carica messaggi
  await loadChatMessages();
  
  // 🆕 Start polling SOLO se sei ancora in questa chat
  messagesPollingInterval = setInterval(async () => {
    if (currentChatUserId === userId && !isInConversationsList) {
      await loadChatMessages(true);
    }
  }, 3000);
}

// ========================================
// 🆕 TORNA ALLA LISTA (freccia indietro)
// ========================================
async function backToConversationsList() {
  console.log('⬅️ Torna alla lista conversazioni');
  
  // Ferma polling
  if (messagesPollingInterval) {
    clearInterval(messagesPollingInterval);
    messagesPollingInterval = null;
  }
  
  // Reset stato
  currentChatUserId = null;
  currentChatUsername = null;
  lastMessageId = null;
  isInConversationsList = true;
  
  // Mostra lista
  await showConversationsList();
}

// ========================================
// CARICA MESSAGGI CHAT
// ========================================
async function loadChatMessages(silent = false) {
  const currentUserId = getUserId();
  if (!currentUserId || !currentChatUserId) return;
  
  // 🆕 Se non sei più in questa chat, esci
  if (isInConversationsList) {
    console.log('⚠️ Non più in chat, skip update');
    return;
  }
  
  const mainContent = document.getElementById('messagesMainContent');
  
  try {
    if (!silent) {
      mainContent.innerHTML = `
        <div class="messages-content">
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
    
    // Check se ci sono nuovi messaggi
    if (silent && messaggi && messaggi.length > 0) {
      const latestId = messaggi[messaggi.length - 1].id;
      if (latestId === lastMessageId) return; // Nessun nuovo messaggio
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
        <p>Scrivi il primo messaggio!</p>
      </div>`;
    
    mainContent.innerHTML = `
      <div class="messages-content" id="messagesContent">
        ${messagesHTML}
      </div>
    `;
    
    // Scroll to bottom
    const messagesContent = document.getElementById('messagesContent');
    if (messagesContent) {
      messagesContent.scrollTop = messagesContent.scrollHeight;
    }
    
  } catch (error) {
    console.error('❌ Errore caricamento messaggi:', error);
    if (!silent) {
      mainContent.innerHTML = `
        <div class="messages-content">
          <div class="messages-empty">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Errore</h3>
            <p>${error.message}</p>
          </div>
        </div>
      `;
    }
  }
}

// ========================================
// INVIA MESSAGGIO
// ========================================
async function sendMessage() {
  const currentUserId = getUserId();
  if (!currentUserId || !currentChatUserId) {
    alert('❌ Errore: chat non inizializzata!');
    return;
  }
  
  const input = document.getElementById('messagesInput');
  const sendBtn = document.getElementById('messagesSendBtn');
  
  if (!input || !sendBtn) return;
  
  const messaggio = input.value.trim();
  if (!messaggio) return;
  
  try {
    sendBtn.disabled = true;
    console.log('📤 Invio messaggio...');
    
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
    
    // Pulisci input
    input.value = '';
    input.style.height = 'auto';
    
    // Ricarica messaggi
    await loadChatMessages();
    
    // Crea notifica per destinatario
    await createNotification(currentChatUserId, 'new_message', 'Nuovo messaggio');
    
  } catch (error) {
    console.error('❌ Errore invio messaggio:', error);
    alert('❌ Errore: ' + error.message);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

// ========================================
// SEGNA MESSAGGI COME LETTI
// ========================================
async function markMessagesAsRead(senderId) {
  const currentUserId = getUserId();
  if (!currentUserId) {
    console.error('❌ markMessagesAsRead: utente non loggato');
    return;
  }
  
  console.log('📖 markMessagesAsRead - Mittente:', senderId);
  
  try {
    const { count: beforeCount } = await supabaseClient
      .from('Messaggi')
      .select('*', { count: 'exact', head: true })
      .eq('destinatario_id', currentUserId)
      .eq('mittente_id', senderId)
      .eq('letto', false);
    
    console.log('📊 Messaggi da segnare come letti:', beforeCount);
    
    if (beforeCount === 0) {
      console.log('✅ Nessun messaggio da segnare');
      return;
    }
    
    const { data, error } = await supabaseClient
      .from('Messaggi')
      .update({ letto: true })
      .eq('destinatario_id', currentUserId)
      .eq('mittente_id', senderId)
      .eq('letto', false)
      .select();
    
    if (error) {
      console.error('❌ Errore update:', error);
      throw error;
    }
    
    console.log('✅ Messaggi segnati come letti:', data?.length || 0);
    
  } catch (error) {
    console.error('❌ Errore markMessagesAsRead:', error);
  }
}

// ========================================
// 🆕 CANCELLA NOTIFICHE SPECIFICHE UTENTE
// ========================================
async function deleteMessageNotifications(senderId) {
  const currentUserId = getUserId();
  if (!currentUserId) {
    console.error('❌ deleteMessageNotifications: utente non loggato');
    return;
  }
  
  console.log('🗑️ Cancello notifiche da:', senderId);
  
  try {
    const { error } = await supabaseClient
      .from('Notifiche')
      .delete()
      .eq('utente_id', currentUserId)
      .eq('tipo', 'new_message')
      .eq('letta', false);
    
    if (error) throw error;
    
    console.log('✅ Notifiche cancellate per questo utente');
    
    // Aggiorna badge
    await updateNotificationsBadge();
    
  } catch (error) {
    console.error('❌ Errore deleteMessageNotifications:', error);
  }
}

// ========================================
// 🆕 CANCELLA TUTTE LE NOTIFICHE MESSAGGI
// ========================================
async function deleteAllMessageNotifications() {
  const currentUserId = getUserId();
  if (!currentUserId) {
    console.error('❌ deleteAllMessageNotifications: utente non loggato');
    return;
  }
  
  console.log('🗑️ Cancello TUTTE le notifiche messaggi');
  
  try {
    const { error } = await supabaseClient
      .from('Notifiche')
      .delete()
      .eq('utente_id', currentUserId)
      .eq('tipo', 'new_message')
      .eq('letta', false);
    
    if (error) throw error;
    
    console.log('✅ Tutte le notifiche messaggi cancellate');
    
    // Aggiorna badge
    await updateNotificationsBadge();
    
  } catch (error) {
    console.error('❌ Errore deleteAllMessageNotifications:', error);
  }
}

// ========================================
// 🆕 AGGIORNA BADGE NOTIFICHE
// ========================================
async function updateNotificationsBadge() {
  if (typeof window.loadNotificationsCount === 'function') {
    console.log('🔄 Aggiornamento badge notifiche...');
    await window.loadNotificationsCount();
  } else {
    console.warn('⚠️ loadNotificationsCount non disponibile');
  }
}

// ========================================
// CREA NOTIFICA
// ========================================
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
    console.error('❌ Errore creazione notifica:', error);
  }
}

// ========================================
// APRI CHAT DIRETTA (DA BOTTONE CONTATTA)
// ========================================
async function openDirectChat(userId, username) {
  console.log('💬 Apertura chat diretta con:', username);
  
  // Apri il centro messaggi
  openMessagesCenter();
  
  // Attendi che l'UI sia pronta
  setTimeout(() => {
    openChat(userId, username);
  }, 500);
}

// ========================================
// UTILITY
// ========================================
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

// Export functions
window.openMessagesCenter = openMessagesCenter;
window.closeMessages = closeMessages;
window.showConversationsList = showConversationsList;
window.backToConversationsList = backToConversationsList;
window.openChat = openChat;
window.sendMessage = sendMessage;
window.openDirectChat = openDirectChat;

console.log('✅ Funzioni messaggi esportate:', {
  openMessagesCenter: typeof window.openMessagesCenter,
  closeMessages: typeof window.closeMessages,
  openDirectChat: typeof window.openDirectChat,
  backToConversationsList: typeof window.backToConversationsList
});
