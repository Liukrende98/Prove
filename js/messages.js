// ========================================
// 🟡 NODO MESSAGGISTICA - VERSIONE GIALLA
// ========================================

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
  
  const mainContent = document.getElementById('messagesMainContent');
  const inputContainer = document.getElementById('messagesInputContainer');
  
  if (inputContainer) inputContainer.style.display = 'none';
  
  try {
    // 1. Carica TUTTI gli utenti seguiti
    console.log('🔍 Cerco utenti seguiti per user:', currentUserId);
    console.log('📊 Query FOLLOWERS (follower_id = currentUserId)...');
    
    const { data: follows, error: followError } = await supabaseClient
      .from('Followers')
      .select(`
        utente_seguito_id,
        seguito:Utenti!Followers_utente_seguito_id_fkey(id, username)
      `)
      .eq('follower_id', currentUserId);
    
    if (followError) {
      console.error('❌ Errore caricamento seguiti:', followError);
      console.error('❌ Dettagli errore:', JSON.stringify(followError, null, 2));
      throw followError;
    }
    
    console.log('✅ Query seguiti completata!');
    console.log('📊 Numero seguiti:', follows?.length || 0);
    console.log('📊 Dati seguiti RAW:', JSON.stringify(follows, null, 2));
    
    if (!follows || follows.length === 0) {
      console.warn('⚠️ ATTENZIONE: Nessun seguito trovato!');
      console.warn('⚠️ Verifica su Supabase Dashboard:');
      console.warn('   1. Tabella "Followers" ha righe?');
      console.warn('   2. Campo "follower_id" = ' + currentUserId + '?');
      console.warn('   3. Foreign key "Followers_utente_seguito_id_fkey" esiste?');
      
      // Query semplice per debug
      console.log('🔍 Provo query semplice senza foreign key...');
      const { data: segutiSemplice, error: errSemplice } = await supabaseClient
        .from('Followers')
        .select('*')
        .eq('follower_id', currentUserId);
      
      console.log('📊 Risultato query semplice:', segutiSemplice);
      
      if (segutiSemplice && segutiSemplice.length > 0) {
        console.error('🔥 PROBLEMA: Seguiti esistono ma foreign key NON funziona!');
        console.error('🔥 Colonne nella tabella Followers:', Object.keys(segutiSemplice[0]));
      }
    }
    
    // 2. Carica messaggi
    const { data: messaggi, error: msgError } = await supabaseClient
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
    
    if (msgError) throw msgError;
    
    console.log('✅ Messaggi:', messaggi?.length || 0);
    
    // 3. Crea mappa conversazioni
    const conversazioni = new Map();
    
    console.log('🔧 Creo mappa conversazioni...');
    
    // Aggiungi TUTTI gli utenti seguiti (anche senza messaggi)
    if (follows && follows.length > 0) {
      follows.forEach(follow => {
        console.log('👤 Processo seguito:', follow);
        if (follow.seguito) {
          conversazioni.set(follow.utente_seguito_id, {
            userId: follow.utente_seguito_id,
            username: follow.seguito.username || 'Utente',
            lastMessage: null,
            lastMessageTime: null,
            unreadCount: 0,
            isFollowed: true,
            hasMessages: false
          });
          console.log('✅ Aggiunto alla mappa:', follow.seguito.username);
        } else {
          console.warn('⚠️ Seguito senza dati utente:', follow);
        }
      });
    } else {
      console.warn('⚠️ Nessun seguito da processare, provo metodo alternativo...');
      
      // FALLBACK: Carica seguiti manualmente
      const { data: segutiManuale } = await supabaseClient
        .from('Followers')
        .select('utente_seguito_id')
        .eq('follower_id', currentUserId);
      
      if (segutiManuale && segutiManuale.length > 0) {
        console.log('🔄 Carico utenti seguiti uno per uno...');
        
        for (const seg of segutiManuale) {
          const { data: utente } = await supabaseClient
            .from('Utenti')
            .select('id, username')
            .eq('id', seg.utente_seguito_id)
            .single();
          
          if (utente) {
            conversazioni.set(utente.id, {
              userId: utente.id,
              username: utente.username || 'Utente',
              lastMessage: null,
              lastMessageTime: null,
              unreadCount: 0,
              isFollowed: true,
              hasMessages: false
            });
            console.log('✅ Aggiunto manualmente:', utente.username);
          }
        }
      }
    }
    
    console.log('📊 Conversazioni dopo seguiti:', conversazioni.size);
    
    // Aggiungi/aggiorna con info messaggi
    messaggi?.forEach(msg => {
      const otherUserId = msg.mittente_id === currentUserId 
        ? msg.destinatario_id 
        : msg.mittente_id;
      
      const otherUser = msg.mittente_id === currentUserId 
        ? msg.destinatario 
        : msg.mittente;
      
      if (!conversazioni.has(otherUserId)) {
        // Utente con messaggi ma non seguito
        conversazioni.set(otherUserId, {
          userId: otherUserId,
          username: otherUser?.username || 'Utente',
          lastMessage: msg.messaggio,
          lastMessageTime: msg.created_at,
          unreadCount: 0,
          isFollowed: false,
          hasMessages: true
        });
      } else {
        // Aggiorna utente seguito con info messaggio
        const conv = conversazioni.get(otherUserId);
        if (!conv.lastMessage) {  // Solo se non ha già messaggio più recente
          conv.lastMessage = msg.messaggio;
          conv.lastMessageTime = msg.created_at;
          conv.hasMessages = true;
        }
      }
      
      // Conta messaggi non letti
      if (msg.destinatario_id === currentUserId && !msg.letto) {
        const conv = conversazioni.get(otherUserId);
        if (conv) conv.unreadCount++;
      }
    });
    
    // 4. Ordina: prima con messaggi (per data), poi seguiti senza messaggi (per nome)
    const conversazioniArray = Array.from(conversazioni.values())
      .sort((a, b) => {
        // Entrambi hanno messaggi → ordina per data
        if (a.hasMessages && b.hasMessages) {
          return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
        }
        // Solo a ha messaggi → a prima
        if (a.hasMessages) return -1;
        // Solo b ha messaggi → b prima
        if (b.hasMessages) return 1;
        // Nessuno ha messaggi → ordina alfabetico
        return a.username.localeCompare(b.username);
      });
    
    console.log('🎯 ARRAY FINALE conversazioni:', conversazioniArray.length);
    console.log('🎯 DATI FINALI:', JSON.stringify(conversazioniArray, null, 2));
    
    if (conversazioniArray.length === 0) {
      mainContent.innerHTML = `
        <div class="messages-empty">
          <i class="fas fa-inbox"></i>
          <h3>Nessun contatto</h3>
          <p>Inizia a seguire qualcuno per chattare</p>
        </div>
      `;
    } else {
      mainContent.innerHTML = `
        <div class="conversations-search-container">
          <div class="conversations-search-wrapper">
            <i class="fas fa-search"></i>
            <input 
              type="text" 
              class="conversations-search-input" 
              id="conversationsSearchInput"
              placeholder="Cerca contatto..."
              autocomplete="off"
            >
            <button class="conversations-search-clear" id="searchClearBtn" style="display: none;">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        <div class="conversations-list" id="conversationsList">
          ${conversazioniArray.map((conv, idx) => {
            console.log(`🔨 Rendering item ${idx + 1}/${conversazioniArray.length}:`, conv.username, 'seguito:', conv.isFollowed);
            return `
            <div class="conversation-item" 
                 data-user-id="${conv.userId}" 
                 data-username="${escapeHtml(conv.username).toLowerCase()}"
                 data-is-followed="${conv.isFollowed}">
              <div class="conversation-avatar">
                <i class="fas fa-user"></i>
              </div>
              ${conv.isFollowed ? '<div class="conversation-followed-badge"><i class="fas fa-star"></i></div>' : ''}
              <div class="conversation-info" onclick="openChat('${conv.userId}', '${escapeHtml(conv.username)}')">
                <div class="conversation-name">
                  ${escapeHtml(conv.username)}
                </div>
                <div class="conversation-last-message">
                  ${conv.lastMessage ? truncateMessage(conv.lastMessage) : '<span style="color: #6b7280; font-style: italic;">👋 Inizia a chattare</span>'}
                </div>
              </div>
              ${conv.lastMessageTime ? `<div class="conversation-time">${formatMessageTime(conv.lastMessageTime)}</div>` : ''}
              ${conv.unreadCount > 0 ? `<div class="conversation-unread-badge">${conv.unreadCount}</div>` : ''}
              <button class="conversation-delete-btn" onclick="event.stopPropagation(); deleteConversation('${conv.userId}', '${escapeHtml(conv.username)}', ${conv.isFollowed})" title="Elimina chat">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          `;
          }).join('')}
        </div>
      `;
      
      // Setup search
      setupConversationsSearch();
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

function setupConversationsSearch() {
  const searchInput = document.getElementById('conversationsSearchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const conversationsList = document.getElementById('conversationsList');
  
  if (!searchInput || !conversationsList) return;
  
  searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase().trim();
    const items = conversationsList.querySelectorAll('.conversation-item');
    
    // Show/hide clear button
    if (searchClearBtn) {
      searchClearBtn.style.display = searchTerm ? 'flex' : 'none';
    }
    
    let visibleCount = 0;
    
    items.forEach(item => {
      const username = item.getAttribute('data-username') || '';
      
      if (username.includes(searchTerm)) {
        item.style.display = 'flex';
        visibleCount++;
      } else {
        item.style.display = 'none';
      }
    });
    
    // Show empty state if no results
    let emptyState = conversationsList.querySelector('.search-no-results');
    
    if (visibleCount === 0 && searchTerm) {
      if (!emptyState) {
        emptyState = document.createElement('div');
        emptyState.className = 'search-no-results';
        emptyState.innerHTML = `
          <i class="fas fa-search"></i>
          <h3>Nessun risultato</h3>
          <p>Nessun contatto trovato per "${escapeHtml(searchTerm)}"</p>
        `;
        conversationsList.appendChild(emptyState);
      }
    } else if (emptyState) {
      emptyState.remove();
    }
  });
  
  // Clear search
  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', function() {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
      searchInput.focus();
    });
  }
}

// 🗑️ NUOVA FUNZIONE: Elimina conversazione con bottone
async function deleteConversation(userId, username, isFollowed) {
  let confirmMessage = `Vuoi eliminare la chat con ${username}?`;
  
  if (isFollowed) {
    confirmMessage += `\n\n⚠️ Stai seguendo questo utente. Vuoi anche smettere di seguirlo?`;
  }
  
  if (!confirm(confirmMessage)) return;
  
  try {
    const currentUserId = getUserId();
    
    // Elimina messaggi
    await supabaseClient
      .from('Messaggi')
      .delete()
      .or(`and(mittente_id.eq.${currentUserId},destinatario_id.eq.${userId}),and(mittente_id.eq.${userId},destinatario_id.eq.${currentUserId})`);
    
    // Se seguito, rimuovi da Followers
    if (isFollowed) {
      await supabaseClient
        .from('Followers')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('utente_seguito_id', userId);
      
      console.log('✅ Smesso di seguire:', username);
    }
    
    console.log('✅ Conversazione eliminata');
    
    // Ricarica lista
    await showConversationsList();
    
  } catch (error) {
    console.error('❌ Errore eliminazione:', error);
    alert('Errore durante l\'eliminazione');
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
  
  // Carica info utente per stato online
  let userStatus = '';
  try {
    const { data: userData } = await supabaseClient
      .from('Utenti')
      .select('online, last_seen')
      .eq('id', userId)
      .single();
    
    if (userData) {
      if (userData.online) {
        userStatus = '<span class="user-status-online"><i class="fas fa-circle"></i> Online</span>';
      } else if (userData.last_seen) {
        const lastSeen = formatLastSeen(userData.last_seen);
        userStatus = `<span class="user-status-offline">${lastSeen}</span>`;
      }
    }
  } catch (error) {
    // Colonne non esistono o errore - continua senza stato
    console.log('⚠️ Stato utente non disponibile');
  }
  
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
        ${userStatus ? `<div class="messages-user-status">${userStatus}</div>` : ''}
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

function formatLastSeen(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Attivo ora';
  if (minutes < 60) return `Attivo ${minutes}m fa`;
  if (hours < 24) return `Attivo ${hours}h fa`;
  if (days === 1) return 'Attivo ieri';
  if (days < 7) return `Attivo ${days}g fa`;
  
  return `Attivo il ${date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`;
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

// 🔥 FIX iOS - Previeni scroll body quando messaggi aperti
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('messagesOverlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeMessages();
      }
    });
  }
});
