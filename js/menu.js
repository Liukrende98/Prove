// ========================================
// MENU NAVIGAZIONE
// ========================================

let menuOpen = false;

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
    url: 'profilo.html',
    submenu: {
      'il-tuo-negozio': {
        icon: 'fas fa-store',
        label: 'Il Tuo Negozio',
        url: 'il-tuo-negozio.html'
      }
    }
  }
};

function toggleMenu() {
  menuOpen = !menuOpen;
  const menuBtn = document.getElementById('menuBtn');
  const menuItems = document.getElementById('menuItems');
  
  menuBtn.classList.toggle('active');
  
  if (menuOpen) {
    loadMenu();
  } else {
    menuItems.innerHTML = '';
  }
}

function loadMenu() {
  const menuItems = document.getElementById('menuItems');
  menuItems.innerHTML = '';
  
  const items = Object.entries(menuStructure);
  
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
      if (item.submenu) {
        loadSubmenu(key, item.submenu);
      } else {
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
      window.location.href = item.url;
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
