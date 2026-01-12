// ========================================
// LOGICA MANCOLISTE
// ========================================

let albumCurrentExpansion = 0;
let albumCurrentPage = 1;
const cardsPerPage = 9;

const albumExpansions = [
  { 
    code: 'SVI', 
    name: 'Scarlatto e Violetto', 
    totalCards: 198,
    generateCards: function() {
      const cards = [];
      for (let i = 1; i <= this.totalCards; i++) {
        cards.push(`${String(i).padStart(3, '0')}/${this.totalCards}`);
      }
      return cards;
    }
  },
  { 
    code: 'PAL', 
    name: 'Paldea Evolved', 
    totalCards: 279,
    generateCards: function() {
      const cards = [];
      for (let i = 1; i <= this.totalCards; i++) {
        cards.push(`${String(i).padStart(3, '0')}/${this.totalCards}`);
      }
      return cards;
    }
  },
  { 
    code: 'OBF', 
    name: 'Obsidian Flames', 
    totalCards: 230,
    generateCards: function() {
      const cards = [];
      for (let i = 1; i <= this.totalCards; i++) {
        cards.push(`${String(i).padStart(3, '0')}/${this.totalCards}`);
      }
      return cards;
    }
  },
  { 
    code: 'PAR', 
    name: 'Paradox Rift', 
    totalCards: 266,
    generateCards: function() {
      const cards = [];
      for (let i = 1; i <= this.totalCards; i++) {
        cards.push(`${String(i).padStart(3, '0')}/${this.totalCards}`);
      }
      return cards;
    }
  },
  { 
    code: 'TEF', 
    name: 'Temporal Forces', 
    totalCards: 218,
    generateCards: function() {
      const cards = [];
      for (let i = 1; i <= this.totalCards; i++) {
        cards.push(`${String(i).padStart(3, '0')}/${this.totalCards}`);
      }
      return cards;
    }
  },
  { 
    code: 'TWM', 
    name: 'Twilight Masquerade', 
    totalCards: 226,
    generateCards: function() {
      const cards = [];
      for (let i = 1; i <= this.totalCards; i++) {
        cards.push(`${String(i).padStart(3, '0')}/${this.totalCards}`);
      }
      return cards;
    }
  },
  { 
    code: 'SHR', 
    name: 'Shrouded Fable', 
    totalCards: 99,
    generateCards: function() {
      const cards = [];
      for (let i = 1; i <= this.totalCards; i++) {
        cards.push(`${String(i).padStart(3, '0')}/${this.totalCards}`);
      }
      return cards;
    }
  },
  { 
    code: 'SCR', 
    name: 'Stellar Crown', 
    totalCards: 175,
    generateCards: function() {
      const cards = [];
      for (let i = 1; i <= this.totalCards; i++) {
        cards.push(`${String(i).padStart(3, '0')}/${this.totalCards}`);
      }
      return cards;
    }
  },
  { 
    code: 'SSP', 
    name: 'Surging Sparks', 
    totalCards: 252,
    generateCards: function() {
      const cards = [];
      for (let i = 1; i <= this.totalCards; i++) {
        cards.push(`${String(i).padStart(3, '0')}/${this.totalCards}`);
      }
      return cards;
    }
  }
];

function toggleMancolisteFilters() {
  const content = document.getElementById('mancolisteFilterContent');
  if (content.style.display === 'none') {
    content.style.display = 'block';
  } else {
    content.style.display = 'none';
  }
}

function changeExpansion(index) {
  albumCurrentExpansion = index;
  updateExpansionDisplay();
}

function prevExpansion() {
  if (albumCurrentExpansion > 0) {
    albumCurrentExpansion--;
    updateExpansionDisplay();
  }
}

function nextExpansion() {
  if (albumCurrentExpansion < albumExpansions.length - 1) {
    albumCurrentExpansion++;
    updateExpansionDisplay();
  }
}

function updateExpansionDisplay() {
  const exp = albumExpansions[albumCurrentExpansion];
  
  // Aggiorna titolo navigazione
  const titleDiv = document.querySelector('.expansion-nav-title');
  if (titleDiv) {
    titleDiv.innerHTML = `
      <span class="expansion-nav-code">${exp.code}</span>
      <span class="expansion-nav-name">${exp.name}</span>
    `;
  }
  
  // Aggiorna chip attivi
  const chips = document.querySelectorAll('.expansion-chip');
  chips.forEach((chip, i) => {
    if (i === albumCurrentExpansion) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
  
  updateExpansionNav();
  
  // Se l'album è aperto, aggiorna le carte
  if (document.getElementById('albumPages').classList.contains('active')) {
    albumCurrentPage = 1;
    renderAlbumPage();
  }
}

function updateExpansionNav() {
  const prevBtn = document.getElementById('prevExpansion');
  const nextBtn = document.getElementById('nextExpansion');
  
  if (prevBtn) prevBtn.disabled = albumCurrentExpansion === 0;
  if (nextBtn) nextBtn.disabled = albumCurrentExpansion === albumExpansions.length - 1;
}

function openAlbum() {
  document.querySelector('.album-cover').style.display = 'none';
  document.getElementById('albumPages').classList.add('active');
  albumCurrentPage = 1;
  renderAlbumPage();
}

function renderAlbumPage() {
  const grid = document.getElementById('cardsGrid');
  const exp = albumExpansions[albumCurrentExpansion];
  const allCards = exp.generateCards();
  const totalPages = Math.ceil(allCards.length / cardsPerPage);
  
  const start = (albumCurrentPage - 1) * cardsPerPage;
  const end = start + cardsPerPage;
  const pageCards = allCards.slice(start, end);
  
  grid.innerHTML = pageCards.map(card => `
    <div class="card-slot" onclick="alert('Carta ${card} - ${exp.code}')">
      ${exp.code}<br>${card}
    </div>
  `).join('');
  
  document.getElementById('pageIndicator').textContent = `Pagina ${albumCurrentPage} di ${totalPages}`;
  document.getElementById('prevPage').disabled = albumCurrentPage === 1;
  document.getElementById('nextPage').disabled = albumCurrentPage === totalPages;
}

function prevAlbumPage() {
  if (albumCurrentPage > 1) {
    albumCurrentPage--;
    renderAlbumPage();
  }
}

function nextAlbumPage() {
  const exp = albumExpansions[albumCurrentExpansion];
  const allCards = exp.generateCards();
  const totalPages = Math.ceil(allCards.length / cardsPerPage);
  if (albumCurrentPage < totalPages) {
    albumCurrentPage++;
    renderAlbumPage();
  }
}
