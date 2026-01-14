// ========================================
// SISTEMA MESSAGGISTICA COMPLETO - VERSIONE CORRETTA
// ========================================

console.log('📨 messages.js caricato!');

let currentChatUserId = null;
let currentChatUsername = null;
let messagesPollingInterval = null;
let lastMessageId = null;
let touchStartX = 0;
let touchCurrentX = 0;
let isSwiping = false;

// ========================================
// APRI CENTRO MESSAGGI
// ========================================
function openMessagesCenter() {
  console.log('📨 Apertura centro messaggi...');
  
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
// CHIUDI MESSAGGI
// ========================================
function closeMessages() {
  const overlay = document.getElementById('messagesOverlay');
  const box = document.getElementById('messagesBox');
  
  if (box) box.classList.remove('active');
  
  setTimeout(() => {
    if (overlay) overlay.classList.remove('active');
  }, 400);
  
  // Stop polling
  if (messagesPollingInterval) {
    clearInterval(messagesPollingInterval);
    messagesPollingInterval = null;
  }
  
  currentChatUserId = null;
  currentChatUsername = null;
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
          <i class="fas fa-comments"></i>
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
      <input type="file" id="messagesFileInput" accept="image/*" style="display: none;" onchange="handleFileSelect(event)">
      <button class="messages-photo-btn" id="messagesPhotoBtn" onclick="document.getElementById('messagesFileInput').click()">
        <i class="fas fa-image"></i>
      </button>
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
// MOSTRA LISTA CONVERSAZIONI - CORRETTA
// ========================================
async function showConversationsList() {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    alert('❌ Devi essere loggato!');
    return;
  }
  
  const mainContent = document.getElementById('messagesMainContent');
  const inputContainer = document.getElementById('messagesInputContainer');
  const headerLeft = document.getElementById('messagesHeaderLeft');
  
  // 🔧 FIX 1: Reset header quando torni alla lista
  if (headerLeft) {
    headerLeft.innerHTML = `
      <div class="messages-avatar">
        <i class="fas fa-comments"></i>
      </div>
      <div class="messages-user-info">
        <div class="messages-username">Messaggi</div>
      </div>
    `;
  }
  
  if (inputContainer) inputContainer.style.display = 'none';
  
  // 🔧 FIX 2: Stop polling quando esci dalla chat
  if (messagesPollingInterval) {
    clearInterval(messagesPollingInterval);
    messagesPollingInterval = null;
  }
  
  // 🔧 FIX 3: Reset chat corrente
  currentChatUserId = null;
  currentChatUsername = null;
  lastMessageId = null;
  
  try {
    console.log('📋 Caricamento conversazioni...');
    
    // Prendi tutti i messaggi dell'utente (inviati o ricevuti)
    const { data: messaggi, error } = await supabaseClient
      .from('Messaggi')
      .select(`
        id,
        mittente_id,
        destinatario_id,
        messaggio,
        foto_url,
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
          lastMessage: msg.foto_url ? '📷 Foto' : msg.messaggio,
          lastMessageTime: msg.created_at,
          unreadCount: 0,
          messages: []
        });
      }
      
      const conv = conversazioni.get(otherUserId);
      conv.messages.push(msg);
      
      // 🔧 FIX 4: Conta SOLO messaggi ricevuti non letti
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
            <div class="conversation-item" 
                 data-user-id="${conv.userId}"
                 onclick="openChat('${conv.userId}', '${escapeHtml(conv.username)}')">
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
              <div class="conversation-swipe-delete" style="display: none;">
                <i class="fas fa-trash"></i>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      
      // 🆕 Aggiungi swipe gestures
      setupSwipeGestures();
    }
    
    // 🔧 FIX 5: Aggiorna badge notifiche CORRETTAMENTE
    setTimeout(async () => {
      if (typeof window.loadNotificationsCount === 'function') {
        await window.loadNotificationsCount();
      }
    }, 500);
    
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
// 🆕 SETUP SWIPE GESTURES
// ========================================
function setupSwipeGestures() {
  const items = document.querySelectorAll('.conversation-item');
  
  items.forEach(item => {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    
    item.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      isDragging = true;
    }, { passive: true });
    
    item.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      
      currentX = e.touches[0].clientX;
      const diffX = currentX - startX;
      
      // Swipe verso destra = elimina
      if (diffX > 0) {
        item.style.transform = `translateX(${Math.min(diffX, 100)}px)`;
        item.style.transition = 'none';
        
        const deleteBtn = item.querySelector('.conversation-swipe-delete');
        if (deleteBtn) {
          deleteBtn.style.display = 'flex';
          deleteBtn.style.opacity = Math.min(diffX / 100, 1);
        }
      }
    }, { passive: true });
    
    item.addEventListener('touchend', async (e) => {
      if (!isDragging) return;
      
      const diffX = currentX - startX;
      
      item.style.transition = 'all 0.3s ease';
      
      // Se swipe > 80px = elimina
      if (diffX > 80) {
        const userId = item.dataset.userId;
        const username = item.querySelector('.conversation-name').textContent;
        
        // 🆕 Controlla se l'utente segue questo venditore
        const isFollowing = await checkIfFollowing(userId);
        
        if (isFollowing) {
          const confirm = window.confirm(`Vuoi smettere di seguire ${username}?`);
          if (confirm) {
            await unfollowUser(userId);
            await deleteConversation(userId);
            item.style.transform = 'translateX(200px)';
            setTimeout(() => showConversationsList(), 300);
          } else {
            item.style.transform = 'translateX(0)';
          }
        } else {
          await deleteConversation(userId);
          item.style.transform = 'translateX(200px)';
          setTimeout(() => showConversationsList(), 300);
        }
      } else {
        item.style.transform = 'translateX(0)';
        const deleteBtn = item.querySelector('.conversation-swipe-delete');
        if (deleteBtn) deleteBtn.style.display = 'none';
      }
      
      isDragging = false;
      startX = 0;
      currentX = 0;
    });
  });
}

// ========================================
// 🆕 CHECK SE SEGUE L'UTENTE
// ========================================
async function checkIfFollowing(vendorId) {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return false;
  
  try {
    const { data, error } = await supabaseClient
      .from('Follow')
      .select('id')
      .eq('utente_id', currentUserId)
      .eq('venditore_id', vendorId)
      .single();
    
    return !!data;
  } catch {
    return false;
  }
}

// ========================================
// 🆕 SMETTI DI SEGUIRE
// ========================================
async function unfollowUser(vendorId) {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return;
  
  try {
    await supabaseClient
      .from('Follow')
      .delete()
      .eq('utente_id', currentUserId)
      .eq('venditore_id', vendorId);
    
    console.log('✅ Unfollow completato');
  } catch (error) {
    console.error('❌ Errore unfollow:', error);
  }
}

// ========================================
// 🆕 ELIMINA CONVERSAZIONE
// ========================================
async function deleteConversation(userId) {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return;
  
  try {
    // Elimina tutti i messaggi tra i due utenti
    await supabaseClient
      .from('Messaggi')
      .delete()
      .or(`and(mittente_id.eq.${currentUserId},destinatario_id.eq.${userId}),and(mittente_id.eq.${userId},destinatario_id.eq.${currentUserId})`);
    
    console.log('✅ Conversazione eliminata');
  } catch (error) {
    console.error('❌ Errore eliminazione conversazione:', error);
  }
}

// ========================================
// APRI CHAT CON UTENTE
// ========================================
async function openChat(userId, username) {
  currentChatUserId = userId;
  currentChatUsername = username;
  
  console.log('💬 Apertura chat con:', username, 'ID:', userId);
  
  // Aggiorna header
  const headerLeft = document.getElementById('messagesHeaderLeft');
  if (headerLeft) {
    headerLeft.innerHTML = `
      <button class="messages-close-btn" onclick="showConversationsList()" style="border: none; background: transparent; margin-right: 8px;">
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
  
  // Carica messaggi
  await loadChatMessages();
  
  // 🔧 FIX 6: Segna come letti DOPO aver caricato
  await markMessagesAsRead(userId);
  
  // Start polling per nuovi messaggi
  if (messagesPollingInterval) clearInterval(messagesPollingInterval);
  messagesPollingInterval = setInterval(() => {
    loadChatMessages(true);
  }, 3000);
}

// ========================================
// CARICA MESSAGGI - CON FIX LAYOUT
// ========================================
async function loadChatMessages(silent = false) {
  const currentUserId = getCurrentUserId();
  if (!currentUserId || !currentChatUserId) return;
  
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
        
        // 🆕 Gestione foto
        if (msg.foto_url) {
          return `
            <div class="message-bubble ${isSent ? 'sent' : 'received'}">
              <img src="${msg.foto_url}" class="message-photo" alt="Foto" onclick="window.open('${msg.foto_url}', '_blank')">
              ${msg.messaggio ? `<div>${escapeHtml(msg.messaggio)}</div>` : ''}
              <div class="message-time">${formatMessageTime(msg.created_at)}</div>
            </div>
          `;
        }
        
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
    
    // 🔧 FIX 7: Layout corretto per chat lunghe
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
// 🆕 GESTIONE FILE FOTO
// ========================================
let selectedFile = null;

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Verifica che sia un'immagine
  if (!file.type.startsWith('image/')) {
    alert('❌ Puoi caricare solo immagini!');
    return;
  }
  
  // Verifica dimensione (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('❌ L\'immagine è troppo grande! Max 5MB');
    return;
  }
  
  selectedFile = file;
  
  // Mostra preview
  const reader = new FileReader();
  reader.onload = (e) => {
    const input = document.getElementById('messagesInput');
    if (input) {
      input.placeholder = '📷 Foto selezionata - Premi invio per inviare';
      input.style.borderColor = '#10b981';
    }
  };
  reader.readAsDataURL(file);
}

// ========================================
// INVIA MESSAGGIO - CON SUPPORTO FOTO
// ========================================
async function sendMessage() {
  const currentUserId = getCurrentUserId();
  if (!currentUserId || !currentChatUserId) {
    alert('❌ Errore: chat non inizializzata!');
    return;
  }
  
  const input = document.getElementById('messagesInput');
  const sendBtn = document.getElementById('messagesSendBtn');
  const fileInput = document.getElementById('messagesFileInput');
  
  if (!input || !sendBtn) return;
  
  const messaggio = input.value.trim();
  
  // Verifica che ci sia almeno un messaggio o una foto
  if (!messaggio && !selectedFile) return;
  
  try {
    sendBtn.disabled = true;
    console.log('📤 Invio messaggio...');
    
    let fotoUrl = null;
    
    // 🆕 Upload foto se presente
    if (selectedFile) {
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('messaggi_foto')
        .upload(fileName, selectedFile);
      
      if (uploadError) {
        console.error('❌ Errore upload foto:', uploadError);
        alert('❌ Errore caricamento foto');
        return;
      }
      
      // Ottieni URL pubblico
      const { data: { publicUrl } } = supabaseClient.storage
        .from('messaggi_foto')
        .getPublicUrl(fileName);
      
      fotoUrl = publicUrl;
      console.log('✅ Foto caricata:', fotoUrl);
    }
    
    // Inserisci messaggio nel database
    const { error } = await supabaseClient
      .from('Messaggi')
      .insert([{
        mittente_id: currentUserId,
        destinatario_id: currentChatUserId,
        messaggio: messaggio || '',
        foto_url: fotoUrl,
        letto: false
      }]);
    
    if (error) throw error;
    
    console.log('✅ Messaggio inviato!');
    
    // Pulisci input
    input.value = '';
    input.style.height = 'auto';
    input.placeholder = 'Scrivi un messaggio...';
    input.style.borderColor = '#3b82f6';
    selectedFile = null;
    if (fileInput) fileInput.value = '';
    
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
// 🔧 FIX 8: SEGNA MESSAGGI COME LETTI - CORRETTO
// ========================================
async function markMessagesAsRead(senderId) {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    console.error('❌ markMessagesAsRead: utente non loggato');
    return;
  }
  
  console.log('📖 markMessagesAsRead - Mittente:', senderId, 'Destinatario:', currentUserId);
  
  try {
    // Prima conta quanti sono da segnare
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
    
    // Segna come letti
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
    
    // 🔧 Aggiorna badge notifiche DOPO un piccolo delay
    setTimeout(async () => {
      if (typeof window.loadNotificationsCount === 'function') {
        console.log('🔄 Aggiornamento notifiche...');
        await window.loadNotificationsCount();
      }
    }, 500);
    
  } catch (error) {
    console.error('❌ Errore markMessagesAsRead:', error);
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
// 🆕 MOSTRA RUBRICA FOLLOWER
// ========================================
async function showFollowersDirectory() {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    alert('❌ Devi essere loggato!');
    return;
  }
  
  const mainContent = document.getElementById('messagesMainContent');
  const inputContainer = document.getElementById('messagesInputContainer');
  const headerLeft = document.getElementById('messagesHeaderLeft');
  
  // Aggiorna header
  if (headerLeft) {
    headerLeft.innerHTML = `
      <button class="messages-close-btn" onclick="showConversationsList()" style="border: none; background: transparent; margin-right: 8px;">
        <i class="fas fa-arrow-left"></i>
      </button>
      <div class="messages-avatar">
        <i class="fas fa-address-book"></i>
      </div>
      <div class="messages-user-info">
        <div class="messages-username">Rubrica Follower</div>
      </div>
    `;
  }
  
  if (inputContainer) inputContainer.style.display = 'none';
  
  try {
    mainContent.innerHTML = `
      <div class="messages-content">
        <div class="messages-empty">
          <i class="fas fa-spinner fa-spin"></i>
          <h3>Caricamento...</h3>
        </div>
      </div>
    `;
    
    // Ottieni lista follower
    const { data: followers, error } = await supabaseClient
      .from('Follow')
      .select(`
        id,
        venditore:Utenti!Follow_venditore_id_fkey(id, username)
      `)
      .eq('utente_id', currentUserId);
    
    if (error) throw error;
    
    if (!followers || followers.length === 0) {
      mainContent.innerHTML = `
        <div class="messages-empty">
          <i class="fas fa-user-friends"></i>
          <h3>Nessun venditore seguito</h3>
          <p>Inizia a seguire venditori per poterli contattare</p>
        </div>
      `;
      return;
    }
    
    mainContent.innerHTML = `
      <div class="conversations-list">
        ${followers.map(follow => `
          <div class="conversation-item" onclick="openChat('${follow.venditore.id}', '${escapeHtml(follow.venditore.username)}')">
            <div class="conversation-avatar">
              <i class="fas fa-store"></i>
            </div>
            <div class="conversation-info">
              <div class="conversation-name">${escapeHtml(follow.venditore.username)}</div>
              <div class="conversation-last-message">Clicca per inviare un messaggio</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
  } catch (error) {
    console.error('❌ Errore caricamento rubrica:', error);
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

function getCurrentUserId() {
  const userData = localStorage.getItem('userData');
  if (userData) {
    try {
      return JSON.parse(userData).id;
    } catch {
      return localStorage.getItem('nodo_user_id');
    }
  }
  return localStorage.getItem('nodo_user_id');
}

// Export functions
window.openMessagesCenter = openMessagesCenter;
window.closeMessages = closeMessages;
window.showConversationsList = showConversationsList;
window.openChat = openChat;
window.sendMessage = sendMessage;
window.openDirectChat = openDirectChat;
window.showFollowersDirectory = showFollowersDirectory;
window.handleFileSelect = handleFileSelect;

console.log('✅ Funzioni messaggi esportate');
