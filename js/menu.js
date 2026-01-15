// ========================================
// MENU NAVIGAZIONE
// ========================================

let menuOpen = false;
let notificationsCount = 0;
let unreadMessagesCount = 0;

// ========================================
// HELPER FUNCTIONS
// ========================================
function getCurrentUserId() {
  return localStorage.getItem('nodo_user_id');
}

function getCurrentUsername() {
  return localStorage.getItem('nodo_username');
}

// ========================================
// CONTA NOTIFICHE - SOLO MESSAGGI NON LETTI
// ========================================
async function loadNotificationsCount() {
  const userId = getCurrentUserId();
  if (!userId || !window.supabaseClient) {
    notificationsCount = 0;
    unreadMessagesCount = 0;
    return;
  }

  try {
    // Conta SOLO messaggi non letti
    const { count: messagesCount, error } = await window.supabaseClient
      .from('Messaggi')
      .select('*', { count: 'exact', head: true })
      .eq('destinatario_id', userId)
      .eq('letto', false);
    
    if (error) {
      console.error('❌ Errore conteggio:', error);
      unreadMessagesCount = 0;
    } else {
      unreadMessagesCount = messagesCount || 0;
    }
    
    notificationsCount = unreadMessagesCount;
    
    console.log('📊 Messaggi non letti:', unreadMessagesCount);
    
    updateNotificationsBadge();

  } catch (error) {
    console.error('❌ Errore caricamento notifiche:', error);
    notificationsCount = 0;
    unreadMessagesCount = 0;
  }
}

function updateNotificationsBadge() {
  // Badge sul profilo (nel menu aperto)
  const badge = document.getElementById('profileNotificationBadge');
  if (badge) {
    if (notificationsCount > 0) {
      badge.textContent = notificationsCount > 99 ? '99+' : notificationsCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
  
  // Badge sui messaggi (nel menu aperto)
  const messagesBadge = document.getElementById('messagesNotificationBadge');
  if (messagesBadge) {
    if (unreadMessagesCount > 0) {
      messagesBadge.textContent = unreadMessagesCount > 99 ? '99+' : unreadMessagesCount;
      messagesBadge.style.display = 'flex';
    } else {
      messagesBadge.style.display = 'none';
    }
  }
  
  // Badge sul bottone principale del menu
  const menuBtn = document.getElementById('menuBtn');
  if (menuBtn) {
    let mainBadge = menuBtn.querySelector('.menu-main-badge');
    
    if (notificationsCount > 0) {
      if (!mainBadge) {
        mainBadge = document.createElement('div');
        mainBadge.className = 'menu-main-badge';
        menuBtn.appendChild(mainBadge);
      }
      mainBadge.textContent = notificationsCount > 99 ? '99+' : notificationsCount;
      mainBadge.style.display = 'flex';
    } else {
      if (mainBadge) {
        mainBadge.style.display = 'none';
      }
    }
  }
}

const menuStructure = {
  'mancoliste': {
    icon: 'fas fa-list-check',
    label: 'Mancoliste',
    url: 'mancoliste.html'
  },
  'vetrine': {
    icon: 'fas fa-shop',
    label: 'Vetrine',
    url: 'vetrine.html'
  },
  'messaggi': {
    icon: 'fas fa-comments',
    label: 'Messaggi',
    url: null,
    hasNotifications: true,
    isMessages: true
  },
  'community': {
    icon: 'fas fa-users',
    label: 'Community',
    url: 'community.html'
  },
  'profilo': {
    icon: 'fas fa-user',
    label: 'Profilo',
    url: null,
    hasNotifications: true,
    submenu: {
      'mio-profilo': {
        icon: 'fas fa-user-circle',
        label: 'Il Mio Profilo',
        url: null
      },
      'il-mio-negozio': {
        icon: 'fas fa-store',
        label: 'Il Mio Negozio',
        url: 'il-tuo-negozio.html'
      },
      'logout': {
        icon: 'fas fa-sign-out-alt',
        label: 'Logout',
        url: null,
        isLogout: true
      }
    }
  }
};

function createMenuOverlay() {
  if (document.getElementById('menuOverlay')) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'menuOverlay';
  overlay.className = 'menu-overlay';
  overlay.onclick = () => toggleMenu();
  
  document.body.appendChild(overlay);
}

function toggleMenu() {
  menuOpen = !menuOpen;
  const menuBtn = document.getElementById('menuBtn');
  const menuItems = document.getElementById('menuItems');
  const mainContent = document.querySelector('.main-content');
  const header = document.querySelector('.header');
  const addBtnContainer = document.querySelector('.add-btn-container');
  const overlay = document.getElementById('menuOverlay');
  
  menuBtn.classList.toggle('active');
  
  if (menuOpen) {
    document.body.classList.add('menu-active');
    if (overlay) overlay.classList.add('active');
    if (mainContent) mainContent.classList.add('blur-content');
    if (header) header.classList.add('blur-content');
    if (addBtnContainer) addBtnContainer.classList.add('blur-content');
    
    loadMenu();
  } else {
    document.body.classList.remove('menu-active');
    if (overlay) overlay.classList.remove('active');
    if (mainContent) mainContent.classList.remove('blur-content');
    if (header) header.classList.remove('blur-content');
    if (addBtnContainer) addBtnContainer.classList.remove('blur-content');
    
    menuItems.innerHTML = '';
  }
}

function loadMenu() {
  const menuItems = document.getElementById('menuItems');
  menuItems.innerHTML = '';
  
  const items = Object.entries(menuStructure);
  const currentUserId = getCurrentUserId();
  const currentUsername = getCurrentUsername();
  
  items.forEach(([key, item], index) => {
    const menuItem = document.createElement('div');
    menuItem.className = 'menu-item';
    
    const yOffset = 80 * (index + 1);
    
    setTimeout(() => {
      menuItem.classList.add('active');
      menuItem.style.transform = `translateY(-${yOffset}px)`;
    }, index * 50);
    
    let notificationBadge = '';
    if (key === 'profilo' && item.hasNotifications && notificationsCount > 0) {
      notificationBadge = `<span class="notification-badge" id="profileNotificationBadge">${notificationsCount > 99 ? '99+' : notificationsCount}</span>`;
    } else if (key === 'messaggi' && item.hasNotifications && unreadMessagesCount > 0) {
      notificationBadge = `<span class="notification-badge" id="messagesNotificationBadge">${unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}</span>`;
    }
    
    menuItem.innerHTML = `
      <i class="${item.icon}"></i>
      <div class="menu-label">${item.label}</div>
      ${notificationBadge}
    `;
    
    menuItem.onclick = () => {
      if (key === 'messaggi' && item.isMessages) {
        console.log('💬 Click su Messaggi dal menu');
        toggleMenu();
        
        setTimeout(() => {
          try {
            if (window.openMessagesCenter) {
              console.log('✅ Apertura messaggi...');
              window.openMessagesCenter();
            } else {
              throw new Error('openMessagesCenter non definita');
            }
          } catch (error) {
            console.error('❌ Errore:', error);
            alert('❌ Errore apertura messaggi.\n\nVerifica che messages.js sia incluso nell\'HTML dopo menu.js');
          }
        }, 150);
      } else if (key === 'profilo') {
        if (item.submenu) {
          loadSubmenu(key, item.submenu);
        } else if (currentUsername) {
          window.location.href = `vetrina-venditore.html?vendor=${currentUsername}`;
        } else {
          alert('❌ Username non trovato!');
        }
      } else if (item.submenu) {
        loadSubmenu(key, item.submenu);
      } else if (item.url) {
        window.location.href = item.url;
      }
    };
    
    menuItems.appendChild(menuItem);
  });
}

function loadSubmenu(parentKey, submenu) {
  const menuItems = document.getElementById('menuItems');
  menuItems.innerHTML = '';
  
  const items = Object.entries(submenu);
  const currentUsername = getCurrentUsername();
  
  items.forEach(([key, item], index) => {
    const menuItem = document.createElement('div');
    menuItem.className = 'menu-item';
    
    const yOffset = 80 * (index + 1);
    
    setTimeout(() => {
      menuItem.classList.add('active');
      menuItem.style.transform = `translateY(-${yOffset}px)`;
    }, index * 50);
    
    menuItem.innerHTML = `
      <i class="${item.icon}"></i>
      <div class="menu-label">${item.label}</div>
    `;
    
    menuItem.onclick = () => {
      console.log('🔍 Click su:', key, item);
      
      if (item.isLogout) {
        console.log('🚪 Tentativo logout...');
        
        // CHIUDI IL MENU PRIMA DEL CONFIRM
        toggleMenu();
        
        // Aspetta che il menu si chiuda
        setTimeout(() => {
          if (confirm('🚪 Sei sicuro di voler uscire?')) {
            console.log('✅ Logout confermato');
            localStorage.removeItem('nodo_user_id');
            localStorage.removeItem('nodo_username');
            localStorage.removeItem('nodo_email');
            window.location.href = 'login.html';
          } else {
            console.log('❌ Logout annullato');
            // Se annulla, riapri il menu
            toggleMenu();
          }
        }, 300);
        
        return;
      }
      
      if (key === 'mio-profilo' && currentUsername) {
        window.location.href = `vetrina-venditore.html?vendor=${currentUsername}`;
      } else if (item.url) {
        window.location.href = item.url;
      } else {
        alert('❌ Username non trovato!');
      }
    };
    
    menuItems.appendChild(menuItem);
  });
  
  const backItem = document.createElement('div');
  backItem.className = 'menu-item';
  
  setTimeout(() => {
    backItem.classList.add('active');
    backItem.style.transform = `translateY(-${80 * (items.length + 1)}px)`;
  }, items.length * 50);
  
  backItem.innerHTML = `
    <i class="fas fa-arrow-left"></i>
    <div class="menu-label">Indietro</div>
  `;
  
  backItem.onclick = () => {
    loadMenu();
  };
  
  menuItems.appendChild(backItem);
}

// Inizializza
window.addEventListener('DOMContentLoaded', () => {
  createMenuOverlay();
  
  const userId = getCurrentUserId();
  if (userId) {
    const checkSupabase = setInterval(() => {
      if (window.supabaseClient) {
        clearInterval(checkSupabase);
        loadNotificationsCount();
        
        // Aggiorna ogni 10 secondi
        setInterval(loadNotificationsCount, 10000);
      }
    }, 100);
  }
});

// Esporta per essere chiamata da messages.js
window.loadNotificationsCount = loadNotificationsCount;
