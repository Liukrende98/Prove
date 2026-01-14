// ========================================
// MENU NAVIGAZIONE BLU CON NOTIFICHE
// ========================================

let menuOpen = false;
let notificationCount = 0;

// Struttura menu items
const menuItems = [
  { icon: 'fa-home', label: 'Home', action: () => window.location.href = 'index.html' },
  { icon: 'fa-store', label: 'Vetrine', action: () => window.location.href = 'vetrine.html' },
  { icon: 'fa-comments', label: 'Messaggi', action: () => openMessagesCenter(), badge: true }, // NUOVO!
  { icon: 'fa-user', label: 'Profilo', action: () => window.location.href = 'il-tuo-profilo.html' },
  { icon: 'fa-sign-out-alt', label: 'Esci', action: logout }
];

// ========================================
// INIT MENU
// ========================================
function initMenu() {
  const menuItemsContainer = document.getElementById('menuItems');
  if (!menuItemsContainer) return;

  menuItemsContainer.innerHTML = '';

  menuItems.forEach((item, index) => {
    const menuItem = document.createElement('div');
    menuItem.className = 'menu-item';
    menuItem.innerHTML = `
      <i class="fas ${item.icon}"></i>
      <div class="menu-label">${item.label}</div>
      ${item.badge ? '<div class="menu-item-badge" id="messagesBadge" style="display: none;">0</div>' : ''}
    `;

    menuItem.addEventListener('click', (e) => {
      e.stopPropagation();
      item.action();
      closeMenu();
    });

    menuItemsContainer.appendChild(menuItem);

    // Posizionamento radiale
    if (menuOpen) {
      const angle = (index * 50) - 90;
      const radius = 90;
      const x = Math.cos((angle * Math.PI) / 180) * radius;
      const y = Math.sin((angle * Math.PI) / 180) * radius;
      
      menuItem.style.transform = `translate(${x}px, ${y}px) scale(1)`;
    }
  });

  // Carica notifiche
  loadNotifications();
}

// ========================================
// TOGGLE MENU
// ========================================
function toggleMenu() {
  menuOpen = !menuOpen;
  const menuBtn = document.getElementById('menuBtn');
  const menuItemsContainer = document.getElementById('menuItems');
  
  if (!menuBtn || !menuItemsContainer) return;

  if (menuOpen) {
    menuBtn.classList.add('active');
    const items = menuItemsContainer.querySelectorAll('.menu-item');
    
    items.forEach((item, index) => {
      setTimeout(() => {
        const angle = (index * 50) - 90;
        const radius = 90;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;
        
        item.classList.add('active');
        item.style.transform = `translate(${x}px, ${y}px) scale(1)`;
      }, index * 50);
    });
  } else {
    closeMenu();
  }
}

function closeMenu() {
  menuOpen = false;
  const menuBtn = document.getElementById('menuBtn');
  const menuItemsContainer = document.getElementById('menuItems');
  
  if (!menuBtn || !menuItemsContainer) return;

  menuBtn.classList.remove('active');
  const items = menuItemsContainer.querySelectorAll('.menu-item');
  
  items.forEach((item, index) => {
    setTimeout(() => {
      item.classList.remove('active');
      item.style.transform = 'translate(0, 0) scale(0)';
    }, index * 30);
  });
}

// ========================================
// NOTIFICHE
// ========================================
async function loadNotifications() {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return;

  try {
    // Conta messaggi non letti
    const { count: unreadMessages } = await supabaseClient
      .from('Messaggi')
      .select('*', { count: 'exact', head: true })
      .eq('destinatario_id', currentUserId)
      .eq('letto', false);

    // Conta notifiche varie (likes, commenti, follow)
    const { count: unreadNotifications } = await supabaseClient
      .from('Notifiche')
      .select('*', { count: 'exact', head: true })
      .eq('utente_id', currentUserId)
      .eq('letta', false);

    const totalUnread = (unreadMessages || 0) + (unreadNotifications || 0);
    
    updateNotificationBadge(totalUnread, unreadMessages || 0);
  } catch (error) {
    console.error('❌ Errore caricamento notifiche:', error);
  }
}

function updateNotificationBadge(total, messages) {
  // Badge sul bottone principale del menu
  const menuBtn = document.getElementById('menuBtn');
  if (!menuBtn) return;

  let mainBadge = menuBtn.querySelector('.menu-notification-badge');
  
  if (total > 0) {
    if (!mainBadge) {
      mainBadge = document.createElement('div');
      mainBadge.className = 'menu-notification-badge';
      menuBtn.appendChild(mainBadge);
    }
    mainBadge.textContent = total > 99 ? '99+' : total;
    mainBadge.style.display = 'flex';
  } else {
    if (mainBadge) {
      mainBadge.style.display = 'none';
    }
  }

  // Badge sui messaggi specifici
  const messagesBadge = document.getElementById('messagesBadge');
  if (messagesBadge) {
    if (messages > 0) {
      messagesBadge.textContent = messages > 99 ? '99+' : messages;
      messagesBadge.style.display = 'flex';
    } else {
      messagesBadge.style.display = 'none';
    }
  }

  notificationCount = total;
}

// Aggiorna notifiche ogni 30 secondi
setInterval(() => {
  if (getCurrentUserId()) {
    loadNotifications();
  }
}, 30000);

// ========================================
// LOGOUT
// ========================================
function logout() {
  if (confirm('🚪 Sei sicuro di voler uscire?')) {
    localStorage.removeItem('nodo_user_id');
    localStorage.removeItem('nodo_username');
    window.location.href = 'login.html';
  }
}

// Init al caricamento
document.addEventListener('DOMContentLoaded', () => {
  initMenu();
  
  // Chiudi menu cliccando fuori
  document.addEventListener('click', (e) => {
    const menuBtn = document.getElementById('menuBtn');
    const menuItems = document.getElementById('menuItems');
    
    if (menuOpen && menuBtn && menuItems) {
      if (!menuBtn.contains(e.target) && !menuItems.contains(e.target)) {
        closeMenu();
      }
    }
  });
});

window.toggleMenu = toggleMenu;
window.closeMenu = closeMenu;
window.loadNotifications = loadNotifications;
