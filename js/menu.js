// ========================================
// MENU NAVIGAZIONE
// ========================================

let menuOpen = false;
let notificationsCount = 0;

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
// CONTA NOTIFICHE
// ========================================
async function loadNotificationsCount() {
  const userId = getCurrentUserId();
  if (!userId || !window.supabaseClient) {
    notificationsCount = 0;
    return;
  }

  try {
    let totalNotifications = 0;

    // 1. Conta nuovi like sui miei post (nelle ultime 24h)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: myPosts } = await window.supabaseClient
      .from('PostSocial')
      .select('id')
      .eq('utente_id', userId);

    if (myPosts && myPosts.length > 0) {
      const postIds = myPosts.map(p => p.id);
      
      // Like
      const { count: likesCount } = await window.supabaseClient
        .from('PostLikes')
        .select('*', { count: 'exact', head: true })
        .in('post_id', postIds)
        .gte('created_at', yesterday.toISOString());
      
      totalNotifications += likesCount || 0;

      // Commenti
      const { count: commentsCount } = await window.supabaseClient
        .from('PostCommenti')
        .select('*', { count: 'exact', head: true })
        .in('post_id', postIds)
        .neq('utente_id', userId) // Escludi i tuoi commenti
        .gte('created_at', yesterday.toISOString());
      
      totalNotifications += commentsCount || 0;
    }

    // 2. Conta nuovi follower (nelle ultime 24h)
    const { count: followersCount } = await window.supabaseClient
      .from('Followers')
      .select('*', { count: 'exact', head: true })
      .eq('utente_seguito_id', userId)
      .gte('created_at', yesterday.toISOString());
    
    totalNotifications += followersCount || 0;

    notificationsCount = totalNotifications;
    updateNotificationsBadge();

  } catch (error) {
    console.error('❌ Errore caricamento notifiche:', error);
    notificationsCount = 0;
  }
}

function updateNotificationsBadge() {
  const badge = document.getElementById('profileNotificationBadge');
  if (!badge) return;
  
  if (notificationsCount > 0) {
    badge.textContent = notificationsCount > 99 ? '99+' : notificationsCount;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
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
        url: null // Dinamico
      },
      'il-mio-negozio': {
        icon: 'fas fa-store',
        label: 'Il Mio Negozio',
        url: 'il-tuo-negozio.html'
      },
      'logout': {
        icon: 'fas fa-sign-out-alt',
        label: 'Logout',
        url: null, // Funzione speciale
        isLogout: true
      }
    }
  }
};

// Crea overlay blur una volta sola
function createMenuOverlay() {
  if (document.getElementById('menuOverlay')) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'menuOverlay';
  overlay.className = 'menu-overlay';
  overlay.onclick = () => toggleMenu(); // Chiudi menu se clicchi sull'overlay
  
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
    // Apri menu
    document.body.classList.add('menu-active');
    if (overlay) overlay.classList.add('active');
    if (mainContent) mainContent.classList.add('blur-content');
    if (header) header.classList.add('blur-content');
    if (addBtnContainer) addBtnContainer.classList.add('blur-content');
    
    loadMenu();
  } else {
    // Chiudi menu
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
    
    // Badge notifiche per Profilo
    const notificationBadge = (key === 'profilo' && item.hasNotifications && notificationsCount > 0) 
      ? `<span class="notification-badge" id="profileNotificationBadge">${notificationsCount > 99 ? '99+' : notificationsCount}</span>` 
      : '';
    
    menuItem.innerHTML = `
      <i class="${item.icon}"></i>
      <div class="menu-label">${item.label}</div>
      ${notificationBadge}
    `;
    
    menuItem.onclick = () => {
      if (key === 'profilo') {
        // Profilo → Apri la TUA vetrina
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
      // Logout
      if (item.isLogout) {
        if (confirm('🚪 Sei sicuro di voler uscire?')) {
          localStorage.removeItem('nodo_user_id');
          localStorage.removeItem('nodo_username');
          localStorage.removeItem('nodo_email');
          window.location.href = 'login.html';
        }
        return;
      }
      
      // Il Mio Profilo
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
  
  // Aggiungi pulsante "Indietro"
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

// Inizializza overlay al caricamento della pagina
window.addEventListener('DOMContentLoaded', () => {
  createMenuOverlay();
  
  // Carica notifiche se l'utente è loggato
  const userId = getCurrentUserId();
  if (userId) {
    // Aspetta che supabase sia disponibile
    const checkSupabase = setInterval(() => {
      if (window.supabaseClient) {
        clearInterval(checkSupabase);
        loadNotificationsCount();
        
        // Aggiorna notifiche ogni 2 minuti
        setInterval(loadNotificationsCount, 120000);
      }
    }, 100);
  }
});
