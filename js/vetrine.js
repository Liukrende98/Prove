// ========================================
// LOGICA VETRINE - ARTICOLI REALI - OTTIMIZZATO MOBILE
// ========================================

// Variabili globali
let allArticoli = [];
let currentFilters = {
  nome: '',
  venditore: '',
  set: 'all',
  categoria: 'all',
  prezzoMin: '',
  prezzoMax: '',
  disponibili: false,
  ratingMin: 0
};
let currentPage = 1;
const itemsPerPage = 10;
let scrollIndicatorTimers = new Map();

// 🔥 NUOVA FUNZIONE: Apri chat con venditore
function openChatWithVendor(userId, username) {
  console.log(`💬 Apertura chat con ${username} (${userId})`);
  
  // Prima apri il centro messaggi
  if (typeof openMessagesCenter === 'function') {
    openMessagesCenter();
    
    // Aspetta che il centro messaggi sia pronto, poi apri la chat specifica
    setTimeout(() => {
      if (typeof openChat === 'function') {
        openChat(userId, username);
      } else {
        console.error('❌ Funzione openChat non disponibile');
      }
    }, 500);
  } else {
    console.error('❌ Funzione openMessagesCenter non disponibile');
    alert('⚠️ Sistema messaggi non disponibile. Ricarica la pagina.');
  }
}

// Crea HTML paginazione
function createPaginationHtml(currentPage, totalPages, position = 'bottom') {
  if (totalPages <= 1) return '';
  
  const prevDisabled = currentPage === 1 ? 'disabled' : '';
  const nextDisabled = currentPage === totalPages ? 'disabled' : '';
  
  return `
    <div class="vetrine-pagination pagination-${position}">
      <button class="pagination-btn" onclick="changePage(-1)" ${prevDisabled}>
        <i class="fas fa-chevron-left"></i> Indietro
      </button>
      <div class="pagination-info">
        Pagina <span>${currentPage}</span> di <span>${totalPages}</span>
      </div>
      <button class="pagination-btn" onclick="changePage(1)" ${nextDisabled}>
        Avanti <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  `;
}

async function loadVetrineContent() {
  const container = document.getElementById('vetrineContainer');
  
  try {
    // Carica TUTTI gli articoli in vetrina (da tutti gli utenti) con JOIN su Utenti
    const { data: articoli, error } = await supabaseClient
      .from('Articoli')
      .select(`
        *,
        Utenti (
          id,
          username,
          citta,
          email
        )
      `)
      .eq('in_vetrina', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Errore query:', error);
      throw error;
    }
    
    console.log('📦 Articoli in vetrina caricati:', articoli?.length || 0);
    
    if (!articoli || articoli.length === 0) {
      container.innerHTML = `
        <div class="wip-container">
          <div class="wip-icon"><i class="fas fa-store-slash"></i></div>
          <div class="wip-text">NESSUN ARTICOLO IN VETRINA</div>
          <div class="wip-subtext">Gli utenti non hanno ancora messo articoli in vendita</div>
        </div>
      `;
      return;
    }
    
    // Salva articoli globalmente
    allArticoli = articoli;
    
    // Crea filtro
    const filterHtml = createFilterHtml();
    
    // Mostra filtro + vetrine
    container.innerHTML = filterHtml;
    renderVetrine(articoli);
    
  } catch (error) {
    console.error('❌ Errore caricamento vetrine:', error);
    container.innerHTML = `
      <div class="msg error" style="margin: 20px;">
        ❌ Errore nel caricamento delle vetrine: ${error.message}
      </div>
    `;
  }
}

function createFilterHtml() {
  const categorie = getCategorie();
  const sets = getSets();
  const activeFiltersCount = getActiveFiltersCount();
  
  return `
    <div class="vetrine-filter" id="vetrineFilter">
      <div class="filter-header" onclick="toggleFilter()">
        <div class="filter-title">
          <i class="fas fa-filter"></i> FILTRI E RICERCA
          ${activeFiltersCount > 0 ? `<span class="filter-active-badge"><i class="fas fa-check"></i> ${activeFiltersCount}</span>` : ''}
        </div>
        <i class="fas fa-chevron-down filter-toggle-icon"></i>
      </div>
      <div class="filter-content">
        <div class="filter-body">
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-search"></i> Cerca Carta/Articolo</div>
            <input type="text" class="filter-input" id="filterNome" placeholder="es. Charizard, Pikachu, UPC...">
          </div>
          
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-layer-group"></i> Set/Espansione</div>
            <select class="filter-select" id="filterSet">
              <option value="all">Tutti i set</option>
              ${sets.map(set => `<option value="${set}">${set}</option>`).join('')}
            </select>
          </div>
          
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-tags"></i> Categoria</div>
            <select class="filter-select" id="filterCategoria">
              <option value="all">Tutte le categorie</option>
              ${categorie.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
            </select>
          </div>
          
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-euro-sign"></i> Prezzo</div>
            <div class="filter-price-inputs">
              <input type="number" class="filter-input" id="filterPrezzoMin" placeholder="Min €" min="0" step="0.01">
              <input type="number" class="filter-input" id="filterPrezzoMax" placeholder="Max €" min="0" step="0.01">
            </div>
          </div>
          
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-star"></i> Valutazione Minima</div>
            <select class="filter-select" id="filterRating">
              <option value="0">Tutte</option>
              <option value="5">5+ ⭐</option>
              <option value="6">6+ ⭐</option>
              <option value="7">7+ ⭐</option>
              <option value="8">8+ ⭐</option>
              <option value="9">9+ ⭐</option>
              <option value="10">10 ⭐ (Perfetto)</option>
            </select>
          </div>
          
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-box"></i> Disponibilità</div>
            <div class="filter-checkboxes">
              <label class="filter-checkbox-item">
                <input type="checkbox" class="filter-checkbox" id="filterDisponibili">
                <span class="filter-checkbox-label">Solo disponibili in magazzino</span>
              </label>
            </div>
          </div>
          
          <div class="filter-actions">
            <button class="filter-btn filter-btn-reset" onclick="resetFilters()">
              <i class="fas fa-redo"></i> Reset
            </button>
            <button class="filter-btn filter-btn-apply" onclick="applyFilters()">
              <i class="fas fa-check"></i> Applica
            </button>
          </div>
        </div>
      </div>
    </div>
    <div id="vetrineList"></div>
  `;
}

function getCategorie() {
  const categorie = new Set();
  allArticoli.forEach(art => {
    if (art.Categoria) categorie.add(art.Categoria);
  });
  return Array.from(categorie).sort();
}

function getSets() {
  const sets = new Set();
  allArticoli.forEach(art => {
    if (art.Set) sets.add(art.Set);
    if (art.Espansione) sets.add(art.Espansione);
  });
  return Array.from(sets).sort();
}

function getActiveFiltersCount() {
  let count = 0;
  if (currentFilters.nome !== '') count++;
  if (currentFilters.venditore !== '') count++;
  if (currentFilters.set !== 'all') count++;
  if (currentFilters.categoria !== 'all') count++;
  if (currentFilters.prezzoMin !== '' && currentFilters.prezzoMin > 0) count++;
  if (currentFilters.prezzoMax !== '' && currentFilters.prezzoMax < 10000) count++;
  if (currentFilters.disponibili) count++;
  if (currentFilters.ratingMin > 0) count++;
  return count;
}

function toggleFilter() {
  const filter = document.getElementById('vetrineFilter');
  if (filter) {
    filter.classList.toggle('expanded');
  }
}

function applyFilters(closeFilter = true) {
  // Leggi valori filtri
  currentFilters.nome = document.getElementById('filterNome').value.toLowerCase().trim();
  currentFilters.set = document.getElementById('filterSet').value;
  currentFilters.categoria = document.getElementById('filterCategoria').value;
  currentFilters.prezzoMin = document.getElementById('filterPrezzoMin').value;
  currentFilters.prezzoMax = document.getElementById('filterPrezzoMax').value;
  currentFilters.disponibili = document.getElementById('filterDisponibili').checked;
  currentFilters.ratingMin = parseInt(document.getElementById('filterRating').value) || 0;
  
  // Reset pagina quando si applicano filtri
  currentPage = 1;
  
  // Filtra articoli
  let articoliFiltrati = allArticoli.filter(art => {
    // Filtro nome (ricerca in Nome, Descrizione, Set, Espansione)
    if (currentFilters.nome !== '') {
      const nomeArticolo = (art.Nome || '').toLowerCase();
      const descrizione = (art.Descrizione || '').toLowerCase();
      const set = (art.Set || '').toLowerCase();
      const espansione = (art.Espansione || '').toLowerCase();
      
      if (!nomeArticolo.includes(currentFilters.nome) && 
          !descrizione.includes(currentFilters.nome) &&
          !set.includes(currentFilters.nome) &&
          !espansione.includes(currentFilters.nome)) {
        return false;
      }
    }
    
    // Filtro set/espansione
    if (currentFilters.set !== 'all') {
      if (art.Set !== currentFilters.set && art.Espansione !== currentFilters.set) {
        return false;
      }
    }
    
    // Filtro categoria
    if (currentFilters.categoria !== 'all' && art.Categoria !== currentFilters.categoria) {
      return false;
    }
    
    // Filtro prezzo minimo
    if (currentFilters.prezzoMin !== '' && parseFloat(art.prezzo_vendita) < parseFloat(currentFilters.prezzoMin)) {
      return false;
    }
    
    // Filtro prezzo massimo
    if (currentFilters.prezzoMax !== '' && parseFloat(art.prezzo_vendita) > parseFloat(currentFilters.prezzoMax)) {
      return false;
    }
    
    // Filtro disponibilità
    if (currentFilters.disponibili && !art.Presente) {
      return false;
    }
    
    // Filtro rating
    if (currentFilters.ratingMin > 0 && (art.ValutazioneStato || 0) < currentFilters.ratingMin) {
      return false;
    }
    
    return true;
  });
  
  console.log(`🔍 Filtrati: ${articoliFiltrati.length}/${allArticoli.length} articoli`);
  
  // Renderizza vetrine filtrate
  renderVetrine(articoliFiltrati);
  
  // Chiudi filtro solo se richiesto
  if (closeFilter) {
    toggleFilter();
  }
  
  // Aggiorna badge
  const filterHeader = document.querySelector('.filter-header');
  if (filterHeader) {
    filterHeader.innerHTML = `
      <div class="filter-title">
        <i class="fas fa-filter"></i> FILTRI E RICERCA
        ${getActiveFiltersCount() > 0 ? `<span class="filter-active-badge"><i class="fas fa-check"></i> ${getActiveFiltersCount()}</span>` : ''}
      </div>
      <i class="fas fa-chevron-down filter-toggle-icon"></i>
    `;
  }
}

function resetFilters() {
  // Reset valori
  currentFilters = {
    nome: '',
    set: 'all',
    categoria: 'all',
    prezzoMin: '',
    prezzoMax: '',
    disponibili: false,
    ratingMin: 0
  };
  
  // Reset pagina
  currentPage = 1;
  
  // Reset inputs
  document.getElementById('filterNome').value = '';
  document.getElementById('filterSet').value = 'all';
  document.getElementById('filterCategoria').value = 'all';
  document.getElementById('filterPrezzoMin').value = '';
  document.getElementById('filterPrezzoMax').value = '';
  document.getElementById('filterDisponibili').checked = false;
  document.getElementById('filterRating').value = '0';
  
  // Mostra tutti gli articoli
  renderVetrine(allArticoli);
  
  // Aggiorna badge
  const filterHeader = document.querySelector('.filter-header');
  if (filterHeader) {
    filterHeader.innerHTML = `
      <div class="filter-title">
        <i class="fas fa-filter"></i> FILTRI E RICERCA
      </div>
      <i class="fas fa-chevron-down filter-toggle-icon"></i>
    `;
  }
}

function renderVetrine(articoli) {
  const container = document.getElementById('vetrineList');
  
  if (!articoli || articoli.length === 0) {
    let messaggioFiltri = '';
    if (currentFilters.nome !== '') {
      messaggioFiltri = `Nessuna carta trovata per "${currentFilters.nome}"`;
    } else if (getActiveFiltersCount() > 0) {
      messaggioFiltri = 'Nessun articolo corrisponde ai filtri';
    } else {
      messaggioFiltri = 'Nessun articolo disponibile';
    }
    
    container.innerHTML = `
      <div class="wip-container" style="margin-top: 20px;">
        <div class="wip-icon"><i class="fas fa-search"></i></div>
        <div class="wip-text">${messaggioFiltri}</div>
        <div class="wip-subtext">Prova a modificare i filtri o la ricerca</div>
      </div>
    `;
    return;
  }
  
  // Raggruppa articoli per utente
  const articoliPerUtente = {};
  articoli.forEach(art => {
    const userId = art.user_id;
    if (!articoliPerUtente[userId]) {
      articoliPerUtente[userId] = {
        username: art.Utenti?.username || 'Utente',
        citta: art.Utenti?.citta || 'Italia',
        email: art.Utenti?.email || '',
        articoli: []
      };
    }
    articoliPerUtente[userId].articoli.push(art);
  });
  
  // Crea array di vetrine
  const vetrine = [];
  Object.entries(articoliPerUtente).forEach(([userId, userData]) => {
    const disponibili = userData.articoli.filter(a => a.Presente).length;
    
    // Calcola media recensioni
    const articoliConRecensione = userData.articoli.filter(a => a.ValutazioneStato && a.ValutazioneStato > 0);
    const mediaRecensioni = articoliConRecensione.length > 0
      ? (articoliConRecensione.reduce((sum, a) => sum + a.ValutazioneStato, 0) / articoliConRecensione.length).toFixed(1)
      : 0;
    
    // Calcola percentuale recensioni
    const percentualeRecensioni = userData.articoli.length > 0 
      ? Math.round((articoliConRecensione.length / userData.articoli.length) * 100)
      : 0;
    
    // Acquisti - per ora usiamo valore fittizio
    const acquisti = 0;
    
    vetrine.push({
      userId,
      username: userData.username,
      citta: userData.citta,
      disponibili,
      acquisti,
      mediaRecensioni,
      percentualeRecensioni,
      articoli: userData.articoli
    });
  });
  
  // PAGINAZIONE
  const totalPages = Math.ceil(vetrine.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const vetrinePaginate = vetrine.slice(startIndex, endIndex);
  
  // Paginazione TOP (sotto filtro)
  const paginationTop = createPaginationHtml(currentPage, totalPages, 'top');
  
  // Crea HTML vetrine
  let htmlVetrine = '';
  vetrinePaginate.forEach(v => {
    htmlVetrine += createVetrinaCard(
      v.userId,
      v.username,
      v.citta,
      v.disponibili,
      v.acquisti,
      v.mediaRecensioni,
      v.percentualeRecensioni,
      v.articoli
    );
  });
  
  // Paginazione BOTTOM (in fondo)
  const paginationBottom = createPaginationHtml(currentPage, totalPages, 'bottom');
  
  // Combina tutto
  const html = paginationTop + htmlVetrine + paginationBottom;
  
  container.innerHTML = html;
  
  // Setup scroll indicator con timer
  setupScrollIndicators();
}

function changePage(direction) {
  currentPage += direction;
  
  // Re-applica filtri con nuova pagina
  applyFilters(false); // false = non chiudere filtro
  
  // Scroll smooth in alto
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupScrollIndicators() {
  setTimeout(() => {
    const scrollContainers = document.querySelectorAll('.vetrina-products-scroll');
    scrollContainers.forEach((scrollContainer, index) => {
      const indicator = scrollContainer.querySelector('.scroll-indicator');
      if (indicator) {
        let hideTimer = null;
        
        scrollContainer.addEventListener('scroll', () => {
          // Nascondi quando scrolla
          if (scrollContainer.scrollLeft > 10) {
            indicator.style.opacity = '0';
            indicator.style.pointerEvents = 'none';
            
            // Clear timer esistente
            if (hideTimer) clearTimeout(hideTimer);
            
            // Riapparirà dopo 3 secondi di inattività
            hideTimer = setTimeout(() => {
              if (scrollContainer.scrollLeft > 10) {
                indicator.style.opacity = '0';
              } else {
                indicator.style.opacity = '1';
              }
            }, 3000);
          } else {
            indicator.style.opacity = '1';
          }
        });
      }
    });
  }, 100);
}

function createVetrinaCard(userId, username, citta, disponibili, acquisti, mediaRecensioni, percentualeRecensioni, articoli) {
  // Crea dots per gli articoli
  const dotsHtml = articoli.length > 1 ? articoli.map((_, idx) => 
    `<div class="vetrina-product-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></div>`
  ).join('') : '';
  
  return `
    <div class="vetrina-card-big" id="vetrina-${userId}" data-user-id="${userId}">
      <div class="vetrina-header" onclick="toggleVetrina('${userId}')">
        <div class="vetrina-top">
          <div class="vetrina-avatar">
            <i class="fas fa-store"></i>
          </div>
          <div class="vetrina-info">
            <h3>
              <a href="vetrina-venditore.html?id=${userId}" 
                 class="vetrina-username-link" 
                 onclick="event.stopPropagation()">
                <span class="vetrina-username">${username}</span>
              </a>
              <span class="vetrina-expand-icon">▼</span>
            </h3>
            <p><i class="fas fa-map-marker-alt"></i> ${citta}</p>
            <div class="vetrina-rating">
              <i class="fas fa-box-open"></i> ${articoli.length} articol${articoli.length === 1 ? 'o' : 'i'}
            </div>
          </div>
          
          <button class="vetrina-action-btn-messages" 
                  onclick="event.stopPropagation(); openChatWithVendor('${userId}', '${username}')" 
                  title="Invia messaggio">
            <i class="fas fa-comment-dots"></i>
          </button>
        </div>
      </div>
      
      <div class="vetrina-stats-inline">
        <div class="vetrina-stat-inline">
          <i class="fas fa-check-circle"></i>
          <span class="vetrina-stat-inline-value">${disponibili}</span> disponibili
        </div>
        <div class="vetrina-stat-inline">
          <i class="fas fa-shopping-bag"></i>
          <span class="vetrina-stat-inline-value">${acquisti}</span> acquisti
        </div>
        <div class="vetrina-stat-inline">
          <i class="fas fa-star"></i>
          <span class="vetrina-stat-inline-value">${mediaRecensioni}/10</span> (${percentualeRecensioni}%)
        </div>
      </div>
      
      <div class="vetrina-products-scroll" style="position: relative;" data-user-id="${userId}">
        ${articoli.length > 1 ? '<div class="vetrina-products-counter"><i class="fas fa-images"></i> <span id="counter-${userId}">1</span>/${articoli.length}</div>' : ''}
        <div class="vetrina-products-container" id="products-${userId}">
          ${articoli.map(art => createArticoloCard(art)).join('')}
        </div>
        ${articoli.length > 2 ? '<div class="scroll-indicator">SCORRI <i class="fas fa-chevron-right"></i></div>' : ''}
      </div>
      
      ${articoli.length > 1 ? `<div class="vetrina-products-dots" id="dots-${userId}">${dotsHtml}</div>` : ''}
      
      <div class="vetrina-products-expanded">
        <div class="vetrina-products-grid-expanded">
          ${articoli.map(art => createArticoloExpanded(art)).join('')}
        </div>
      </div>
    </div>
  `;
}

function createArticoloCard(articolo) {
  // Raccogli tutte le foto disponibili
  const allPhotos = [];
  if (articolo.Foto1) allPhotos.push(articolo.Foto1);
  if (articolo.Foto2) allPhotos.push(articolo.Foto2);
  if (articolo.Foto3) allPhotos.push(articolo.Foto3);
  if (articolo.Foto4) allPhotos.push(articolo.Foto4);
  if (articolo.Foto5) allPhotos.push(articolo.Foto5);
  
  const hasMultiplePhotos = allPhotos.length > 1;
  const mainPhoto = allPhotos[0] || articolo.foto_principale || articolo.image_url || '';
  
  const imageHtml = mainPhoto 
    ? `<img src="${mainPhoto}" alt="${articolo.Nome}" id="article-img-${articolo.id}">` 
    : '<div class="vetrina-product-placeholder"><i class="fas fa-image"></i></div>';
  
  // Badge disponibilità
  const disponibile = articolo.Presente === true;
  const badgeHtml = disponibile
    ? '<div class="product-availability-badge badge-disponibile"><i class="fas fa-check"></i> DISPONIBILE</div>'
    : '<div class="product-availability-badge badge-non-disponibile"><i class="fas fa-times"></i> NON DISPONIBILE</div>';
  
  // Rating
  const rating = articolo.ValutazioneStato || 0;
  const ratingHtml = rating > 0 ? `
    <div class="vetrina-product-rating">
      <i class="fas fa-star"></i> ${rating}/10
    </div>
  ` : '';
  
  // Navigation buttons (solo se più foto)
  const navHtml = hasMultiplePhotos ? `
    <button class="article-photo-nav article-photo-prev" onclick="event.stopPropagation(); changeArticlePhoto('${articolo.id}', -1)">
      <i class="fas fa-chevron-left"></i>
    </button>
    <button class="article-photo-nav article-photo-next" onclick="event.stopPropagation(); changeArticlePhoto('${articolo.id}', 1)">
      <i class="fas fa-chevron-right"></i>
    </button>
    <div class="article-photo-dots" id="dots-${articolo.id}">
      ${allPhotos.map((_, idx) => `<div class="article-photo-dot ${idx === 0 ? 'active' : ''}"></div>`).join('')}
    </div>
  ` : '';
  
  // Fullscreen button
  const fullscreenHtml = mainPhoto ? `
    <button class="article-fullscreen-btn" onclick="event.stopPropagation(); openFullscreen('${mainPhoto.replace(/'/g, "\\'")}')">
      <i class="fas fa-expand"></i>
    </button>
  ` : '';
  
  return `
    <div class="vetrina-product-card" onclick="mostraDettaglioArticolo('${articolo.id}')" data-article-id="${articolo.id}" data-current-photo="0" data-photos='${JSON.stringify(allPhotos)}'>
      <div class="vetrina-product-image">
        ${imageHtml}
        ${navHtml}
        ${fullscreenHtml}
        ${badgeHtml}
        ${ratingHtml}
      </div>
      <div class="vetrina-product-info">
        <div class="vetrina-product-price">${parseFloat(articolo.prezzo_vendita || 0).toFixed(2)}€</div>
        <div class="vetrina-product-name">${articolo.Nome}</div>
        <div class="vetrina-product-category">${articolo.Categoria || 'Varie'}</div>
      </div>
    </div>
  `;
}

function createArticoloPreview(articolo) {
  return createArticoloCard(articolo);
}

function createArticoloCompleto(articolo) {
  return createArticoloCard(articolo);
}

async function mostraDettaglioArticolo(articoloId) {
  // Apri nuova pagina di dettaglio ottimizzata per mobile
  window.location.href = `dettaglio-articolo.html?id=${articoloId}`;
}

function chiudiModalDettaglio(event) {
  // Funzione non più utilizzata - si usa pagina dettaglio-articolo.html
}

function contattaVenditore(username, email, nomeArticolo) {
  const messaggio = `Ciao ${username}! Sono interessato all'articolo "${nomeArticolo}". Possiamo parlarne?`;
  const subject = `Interesse per: ${nomeArticolo}`;
  const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messaggio)}`;
  
  // Prova ad aprire l'app email
  window.location.href = mailtoLink;
  
  // Fallback: mostra alert con email
  setTimeout(() => {
    alert(`📧 Contatta ${username} via email:\n${email}\n\nOppure chiama/scrivi su WhatsApp se disponibile.`);
  }, 500);
}

// FLOATING FILTER BUTTON
window.addEventListener('DOMContentLoaded', () => {
  // Crea bottone floating
  const floatingBtn = document.createElement('button');
  floatingBtn.className = 'filter-floating-btn';
  floatingBtn.innerHTML = '<i class="fas fa-filter"></i>';
  floatingBtn.onclick = scrollToFilter;
  document.body.appendChild(floatingBtn);
  
  // Scroll listener per mostrare/nascondere bottone
  let lastScrollTop = 0;
  window.addEventListener('scroll', () => {
    const filterElement = document.getElementById('vetrineFilter');
    if (!filterElement) return;
    
    const filterRect = filterElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Mostra bottone se il filtro è fuori schermo verso l'alto
    if (filterRect.bottom < 0 && scrollTop > lastScrollTop) {
      floatingBtn.classList.add('active');
    } else {
      floatingBtn.classList.remove('active');
    }
    
    lastScrollTop = scrollTop;
  });
});

function scrollToFilter() {
  const filterElement = document.getElementById('vetrineFilter');
  if (filterElement) {
    filterElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Apri il filtro se è chiuso
    setTimeout(() => {
      if (!filterElement.classList.contains('expanded')) {
        toggleFilter();
      }
    }, 500);
  }
}

// TOGGLE ESPANSIONE VETRINA
function toggleVetrina(userId) {
  const vetrina = document.getElementById(`vetrina-${userId}`);
  if (vetrina) {
    const isExpanding = !vetrina.classList.contains('expanded');
    vetrina.classList.toggle('expanded');
    
    // Se sta espandendo, aggiungi listener scroll
    if (isExpanding) {
      setTimeout(() => {
        setupVetrinaScrollListener(userId);
      }, 400); // Dopo l'animazione
    }
  }
}

// Setup listener scroll per vetrina espansa
function setupVetrinaScrollListener(userId) {
  const scrollContainer = document.querySelector(`[data-user-id="${userId}"].vetrina-products-scroll`);
  const dotsContainer = document.getElementById(`dots-${userId}`);
  const counter = document.getElementById(`counter-${userId}`);
  
  if (!scrollContainer) return;
  
  // Rimuovi listener precedente se esiste
  const existingListener = scrollContainer._scrollListener;
  if (existingListener) {
    scrollContainer.removeEventListener('scroll', existingListener);
  }
  
  // Crea nuovo listener
  const scrollListener = () => {
    const scrollLeft = scrollContainer.scrollLeft;
    const containerWidth = scrollContainer.offsetWidth;
    const currentIndex = Math.round(scrollLeft / containerWidth);
    
    // Aggiorna dots
    if (dotsContainer) {
      const dots = dotsContainer.querySelectorAll('.vetrina-product-dot');
      dots.forEach((dot, index) => {
        if (index === currentIndex) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }
    
    // Aggiorna counter
    if (counter) {
      counter.textContent = currentIndex + 1;
    }
  };
  
  // Salva riferimento al listener
  scrollContainer._scrollListener = scrollListener;
  
  // Aggiungi listener
  scrollContainer.addEventListener('scroll', scrollListener);
  
  // Click sui dots per navigare
  if (dotsContainer) {
    const dots = dotsContainer.querySelectorAll('.vetrina-product-dot');
    dots.forEach((dot, index) => {
      dot.onclick = () => {
        const containerWidth = scrollContainer.offsetWidth;
        scrollContainer.scrollTo({
          left: index * containerWidth,
          behavior: 'smooth'
        });
      };
    });
  }
}

// CREA ARTICOLO ESPANSO (GRANDE)
function createArticoloExpanded(articolo) {
  const disponibile = articolo.Presente === true;
  const badgeClass = disponibile ? 'badge-disponibile' : 'badge-non-disponibile';
  const badgeText = disponibile ? 'DISPONIBILE' : 'NON DISPONIBILE';
  const badgeIcon = disponibile ? 'fa-check' : 'fa-times';
  
  const immagine = articolo.Foto1 || articolo.Foto2 || articolo.Foto3 || articolo.Foto4 || articolo.Foto5;
  
  return `
    <div class="vetrina-product-expanded" onclick='openModalDettaglio(${JSON.stringify(articolo).replace(/'/g, "&apos;")})'>
      <div class="vetrina-product-expanded-image">
        ${immagine ? `<img src="${immagine}" alt="${articolo.Nome || 'Prodotto'}">` : 
        `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;">
          <i class="fas fa-image" style="font-size:40px;"></i>
        </div>`}
        <div class="product-availability-badge ${badgeClass}">
          <i class="fas ${badgeIcon}"></i> ${badgeText}
        </div>
        ${articolo.ValutazioneStato ? `
          <div class="vetrina-product-rating">
            <i class="fas fa-star"></i> ${articolo.ValutazioneStato}/10
          </div>
        ` : ''}
      </div>
      <div class="vetrina-product-expanded-info">
        <div class="vetrina-product-expanded-name">${articolo.Nome || 'Prodotto'}</div>
        <div class="vetrina-product-expanded-category">${articolo.Categoria || 'N/D'}</div>
        <div class="vetrina-product-expanded-price">${parseFloat(articolo.prezzo_vendita || 0).toFixed(2)}€</div>
      </div>
    </div>
  `;
}

// MODAL DETTAGLIO SUPER FIGO
let currentGalleryIndex = 0;
let currentModalArticolo = null;

function openModalDettaglio(articolo) {
  // Apri nuova pagina di dettaglio ottimizzata per mobile
  window.location.href = `dettaglio-articolo.html?id=${articolo.id}`;
}

function closeModalDettaglio(event) {
  if (event && event.target.id !== 'modalDettaglio') return;
  
  const modal = document.getElementById('modalDettaglio');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
  }
}

// GALLERIA SWIPE
function nextImage() {
  const immagini = [];
  if (currentModalArticolo.Foto1) immagini.push(currentModalArticolo.Foto1);
  if (currentModalArticolo.Foto2) immagini.push(currentModalArticolo.Foto2);
  if (currentModalArticolo.Foto3) immagini.push(currentModalArticolo.Foto3);
  if (currentModalArticolo.Foto4) immagini.push(currentModalArticolo.Foto4);
  if (currentModalArticolo.Foto5) immagini.push(currentModalArticolo.Foto5);
  
  if (currentGalleryIndex < immagini.length - 1) {
    currentGalleryIndex++;
    updateGallery();
  }
}

function prevImage() {
  if (currentGalleryIndex > 0) {
    currentGalleryIndex--;
    updateGallery();
  }
}

function updateGallery() {
  const container = document.getElementById('galleryContainer');
  const dots = document.querySelectorAll('.gallery-dot');
  
  if (container) {
    const translateX = -currentGalleryIndex * 100;
    container.style.transform = `translateX(${translateX}%)`;
  }
  
  dots.forEach((dot, index) => {
    if (index === currentGalleryIndex) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

// TOUCH SWIPE GESTURES
function setupGallerySwipe() {
  const gallery = document.getElementById('gallerySwipe');
  if (!gallery) return;
  
  let touchStartX = 0;
  let touchEndX = 0;
  
  gallery.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });
  
  gallery.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });
  
  function handleSwipe() {
    const swipeThreshold = 50;
    
    if (touchEndX < touchStartX - swipeThreshold) {
      // Swipe left = next
      nextImage();
    }
    
    if (touchEndX > touchStartX + swipeThreshold) {
      // Swipe right = prev
      prevImage();
    }
  }
}
// ============================================
// VETRINE NODO - AGGIUNTE E OTTIMIZZAZIONI
// ============================================

// Variabili globali per carousel
window.carouselIndices = {}; // userId -> currentIndex

// MODIFICA createVetrinaCard per aggiungere recensioni e carousel
// ============================================
// createVetrinaCardNew - RIMOSSA
// ============================================
// Questa funzione è stata rimossa e sostituita con createVetrinaCard
// che include il nome cliccabile e il pulsante messaggi

// TOGGLE ESPANSIONE - INGRANDISCE ARTICOLI NELLA SCROLL
function toggleVetrinaExpand(userId) {
  const vetrina = document.getElementById(`vetrina-${userId}`);
  if (vetrina) {
    vetrina.classList.toggle('expanded');
  }
}

// SCROLL INDICATOR - SCOMPARE PERMANENTEMENTE
function setupScrollIndicatorsOptimized() {
  setTimeout(() => {
    const scrollContainers = document.querySelectorAll('.vetrina-products-scroll');
    scrollContainers.forEach((scrollContainer) => {
      const userId = scrollContainer.getAttribute('data-user-id');
      const indicator = document.getElementById(`scroll-indicator-${userId}`);
      
      if (indicator) {
        let hasScrolled = false;
        
        scrollContainer.addEventListener('scroll', () => {
          if (!hasScrolled && scrollContainer.scrollLeft > 20) {
            hasScrolled = true;
            indicator.classList.add('hidden');
            
            // Rimuovi dopo animazione
            setTimeout(() => {
              if (indicator && indicator.parentNode) {
                indicator.remove();
              }
            }, 300);
          }
        });
      }
    });
  }, 100);
}

// PRICE RANGE SLIDER
let priceMin = 0;
let priceMax = 1000;

function initPriceRangeSlider() {
  const minInput = document.getElementById('priceRangeMin');
  const maxInput = document.getElementById('priceRangeMax');
  const minValue = document.getElementById('priceMinValue');
  const maxValue = document.getElementById('priceMaxValue');
  const fill = document.getElementById('priceRangeFill');
  
  if (!minInput || !maxInput) return;
  
  // Trova max prezzo
  const maxPrice = Math.max(...allArticoli.map(a => parseFloat(a.prezzo_vendita) || 0));
  priceMax = Math.ceil(maxPrice / 100) * 100 || 1000;
  
  minInput.max = priceMax;
  maxInput.max = priceMax;
  maxInput.value = priceMax;
  
  function updateSlider() {
    const min = parseInt(minInput.value);
    const max = parseInt(maxInput.value);
    
    // Evita sovrapposizione
    if (min >= max - 10) {
      if (this === minInput) {
        minInput.value = max - 10;
      } else {
        maxInput.value = min + 10;
      }
    }
    
    priceMin = parseInt(minInput.value);
    priceMax = parseInt(maxInput.value);
    
    minValue.textContent = `${priceMin}€`;
    maxValue.textContent = `${priceMax}€`;
    
    // Aggiorna fill
    const percentMin = (priceMin / maxInput.max) * 100;
    const percentMax = (priceMax / maxInput.max) * 100;
    fill.style.left = `${percentMin}%`;
    fill.style.right = `${100 - percentMax}%`;
  }
  
  minInput.addEventListener('input', updateSlider);
  maxInput.addEventListener('input', updateSlider);
  
  // Init
  updateSlider();
}

// FLOATING FILTER BUTTON SEMPLICE - NO BUGS
function handleFilterClick() {
  toggleFilter();
}

// Setup floating button su scroll
window.addEventListener('DOMContentLoaded', () => {
  const floatingBtn = document.createElement('button');
  floatingBtn.className = 'filter-floating-btn';
  floatingBtn.innerHTML = '<i class="fas fa-filter"></i>';
  floatingBtn.onclick = scrollToFilterSimple;
  document.body.appendChild(floatingBtn);
  
  let lastScrollTop = 0;
  window.addEventListener('scroll', () => {
    const filterElement = document.getElementById('vetrineFilter');
    if (!filterElement) return;
    
    const filterRect = filterElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Mostra bottone SOLO se filtro fuori schermo
    if (filterRect.bottom < 0 && scrollTop > lastScrollTop) {
      floatingBtn.classList.add('active');
    } else {
      floatingBtn.classList.remove('active');
    }
    
    lastScrollTop = scrollTop;
  }, { passive: true });
});

function scrollToFilterSimple() {
  const filterElement = document.getElementById('vetrineFilter');
  if (filterElement) {
    filterElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      if (!filterElement.classList.contains('expanded')) {
        toggleFilter();
      }
    }, 500);
  }
}

// AGGIORNA createFilterHtml per includere cerca venditore e price slider
function createFilterHtmlNew() {
  const categorie = getCategorie();
  const sets = getSets();
  const activeFiltersCount = getActiveFiltersCount();
  
  return `
    <div class="vetrine-filter" id="vetrineFilter">
      <div class="filter-header" onclick="handleFilterClick()">
        <div class="filter-title">
          <i class="fas fa-filter"></i> FILTRI E RICERCA
          ${activeFiltersCount > 0 ? `<span class="filter-active-badge"><i class="fas fa-check"></i> ${activeFiltersCount}</span>` : ''}
        </div>
        <i class="fas fa-chevron-down filter-toggle-icon"></i>
      </div>
      <div class="filter-content">
        <div class="filter-body">
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-search"></i> Cerca Carta/Articolo</div>
            <input type="text" class="filter-input" id="filterNome" placeholder="es. Charizard, Pikachu, UPC...">
          </div>
          
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-user"></i> Cerca Venditore</div>
            <input type="text" class="filter-input" id="filterVenditore" placeholder="Nome venditore...">
          </div>
          
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-layer-group"></i> Set/Espansione</div>
            <select class="filter-select" id="filterSet">
              <option value="all">Tutti i set</option>
              ${sets.map(set => `<option value="${set}">${set}</option>`).join('')}
            </select>
          </div>
          
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-tags"></i> Categoria</div>
            <select class="filter-select" id="filterCategoria">
              <option value="all">Tutte le categorie</option>
              ${categorie.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
            </select>
          </div>
          
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-euro-sign"></i> Fascia di Prezzo</div>
            <div class="price-range-slider">
              <div class="price-range-values">
                <div class="price-value" id="priceMinValue">0€</div>
                <div class="price-value" id="priceMaxValue">1000€</div>
              </div>
              <div class="price-range-track">
                <div class="price-range-fill" id="priceRangeFill"></div>
              </div>
              <div class="price-range-inputs">
                <input type="range" class="price-range-input" id="priceRangeMin" min="0" max="1000" value="0" step="5">
                <input type="range" class="price-range-input" id="priceRangeMax" min="0" max="1000" value="1000" step="5">
              </div>
            </div>
          </div>
          
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-star"></i> Valutazione Minima</div>
            <select class="filter-select" id="filterRating">
              <option value="0">Tutte</option>
              <option value="5">5+ ⭐</option>
              <option value="6">6+ ⭐</option>
              <option value="7">7+ ⭐</option>
              <option value="8">8+ ⭐</option>
              <option value="9">9+ ⭐</option>
              <option value="10">10 ⭐ (Perfetto)</option>
            </select>
          </div>
          
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-box"></i> Disponibilità</div>
            <div class="filter-checkboxes">
              <label class="filter-checkbox-item">
                <input type="checkbox" class="filter-checkbox" id="filterDisponibili">
                <span class="filter-checkbox-label">Solo disponibili in magazzino</span>
              </label>
            </div>
          </div>
          
          <div class="filter-actions">
            <button class="filter-btn filter-btn-reset" onclick="resetFiltersNew()">
              <i class="fas fa-redo"></i> Reset
            </button>
            <button class="filter-btn filter-btn-apply" onclick="applyFiltersNew()">
              <i class="fas fa-check"></i> Applica
            </button>
          </div>
        </div>
      </div>
    </div>
    <div id="vetrineList"></div>
  `;
}

// SOSTITUISCE renderVetrine per usare nuovo design
const renderVetrineOriginal = renderVetrine;
renderVetrine = function(articoli) {
  const container = document.getElementById('vetrineList');
  
  if (!articoli || articoli.length === 0) {
    let messaggioFiltri = '';
    if (currentFilters.nome !== '') {
      messaggioFiltri = `Nessuna carta trovata per "${currentFilters.nome}"`;
    } else if (getActiveFiltersCount() > 0) {
      messaggioFiltri = 'Nessun articolo corrisponde ai filtri';
    } else {
      messaggioFiltri = 'Nessun articolo disponibile';
    }
    
    container.innerHTML = `
      <div class="wip-container" style="margin-top: 20px;">
        <div class="wip-icon"><i class="fas fa-search"></i></div>
        <div class="wip-text">${messaggioFiltri}</div>
        <div class="wip-subtext">Prova a modificare i filtri o la ricerca</div>
      </div>
    `;
    return;
  }
  
  // Raggruppa articoli per utente
  const articoliPerUtente = {};
  articoli.forEach(art => {
    const userId = art.user_id;
    if (!articoliPerUtente[userId]) {
      articoliPerUtente[userId] = {
        username: art.Utenti?.username || 'Utente',
        citta: art.Utenti?.citta || 'Italia',
        email: art.Utenti?.email || '',
        articoli: []
      };
    }
    articoliPerUtente[userId].articoli.push(art);
  });
  
  // Filtra per venditore se specificato
  const venditoreFiltro = currentFilters.venditore || '';
  if (venditoreFiltro) {
    Object.keys(articoliPerUtente).forEach(userId => {
      const userData = articoliPerUtente[userId];
      if (!userData.username.toLowerCase().includes(venditoreFiltro.toLowerCase())) {
        delete articoliPerUtente[userId];
      }
    });
  }
  
  // Crea array di vetrine
  const vetrine = [];
  Object.entries(articoliPerUtente).forEach(([userId, userData]) => {
    const disponibili = userData.articoli.filter(a => a.Presente).length;
    const articoliConRecensione = userData.articoli.filter(a => a.ValutazioneStato && a.ValutazioneStato > 0);
    const mediaRecensioni = articoliConRecensione.length > 0
      ? (articoliConRecensione.reduce((sum, a) => sum + a.ValutazioneStato, 0) / articoliConRecensione.length).toFixed(1)
      : 0;
    const percentualeRecensioni = userData.articoli.length > 0 
      ? Math.round((articoliConRecensione.length / userData.articoli.length) * 100)
      : 0;
    const acquisti = 0;
    
    vetrine.push({
      userId,
      username: userData.username,
      citta: userData.citta,
      disponibili,
      acquisti,
      mediaRecensioni,
      percentualeRecensioni,
      articoli: userData.articoli
    });
  });
  
  // PAGINAZIONE
  const totalPages = Math.ceil(vetrine.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const vetrinePaginate = vetrine.slice(startIndex, endIndex);
  
  // Crea HTML vetrine
  let html = '';
  vetrinePaginate.forEach(v => {
    html += createVetrinaCard(
      v.userId,
      v.username,
      v.citta,
      v.disponibili,
      v.acquisti,
      v.mediaRecensioni,
      v.percentualeRecensioni,
      v.articoli
    );
  });
  
  // Aggiungi paginazione
  if (totalPages > 1) {
    html += `
      <div class="vetrine-pagination">
        <button class="pagination-btn" onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>
          <i class="fas fa-chevron-left"></i> Indietro
        </button>
        <div class="pagination-info">
          Pagina <span>${currentPage}</span> di <span>${totalPages}</span>
        </div>
        <button class="pagination-btn" onclick="changePage(1)" ${currentPage === totalPages ? 'disabled' : ''}>
          Avanti <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    `;
  }
  
  container.innerHTML = html;
  
  // Setup scroll indicators ottimizzati
  setupScrollIndicatorsOptimized();
};

// SOSTITUISCE createFilterHtml
const createFilterHtmlOriginal = createFilterHtml;
createFilterHtml = createFilterHtmlNew;

// SOSTITUISCE applyFilters per usare price slider e venditore
const applyFiltersOriginal = applyFilters;
applyFilters = function(closeFilter = true) {
  currentFilters.nome = document.getElementById('filterNome').value.toLowerCase().trim();
  currentFilters.venditore = document.getElementById('filterVenditore')?.value.toLowerCase().trim() || '';
  currentFilters.set = document.getElementById('filterSet').value;
  currentFilters.categoria = document.getElementById('filterCategoria').value;
  currentFilters.prezzoMin = priceMin;
  currentFilters.prezzoMax = priceMax;
  currentFilters.disponibili = document.getElementById('filterDisponibili').checked;
  currentFilters.ratingMin = parseInt(document.getElementById('filterRating').value) || 0;
  currentPage = 1;
  
  let articoliFiltrati = allArticoli.filter(art => {
    if (currentFilters.nome !== '') {
      const nomeArticolo = (art.Nome || '').toLowerCase();
      const descrizione = (art.Descrizione || '').toLowerCase();
      const set = (art.Set || '').toLowerCase();
      const espansione = (art.Espansione || '').toLowerCase();
      
      if (!nomeArticolo.includes(currentFilters.nome) && 
          !descrizione.includes(currentFilters.nome) &&
          !set.includes(currentFilters.nome) &&
          !espansione.includes(currentFilters.nome)) {
        return false;
      }
    }
    
    if (currentFilters.set !== 'all') {
      if (art.Set !== currentFilters.set && art.Espansione !== currentFilters.set) {
        return false;
      }
    }
    
    if (currentFilters.categoria !== 'all' && art.Categoria !== currentFilters.categoria) {
      return false;
    }
    
    const prezzo = parseFloat(art.prezzo_vendita) || 0;
    if (prezzo < currentFilters.prezzoMin || prezzo > currentFilters.prezzoMax) {
      return false;
    }
    
    if (currentFilters.disponibili && !art.Presente) {
      return false;
    }
    
    if (currentFilters.ratingMin > 0 && (art.ValutazioneStato || 0) < currentFilters.ratingMin) {
      return false;
    }
    
    return true;
  });
  
  console.log(`🔍 Filtrati: ${articoliFiltrati.length}/${allArticoli.length} articoli`);
  
  renderVetrine(articoliFiltrati);
  
  if (closeFilter) {
    const filterElement = document.getElementById('vetrineFilter');
    if (filterElement && filterElement.classList.contains('expanded')) {
      filterElement.classList.remove('expanded');
    }
  }
  
  const filterHeader = document.querySelector('.filter-header');
  if (filterHeader) {
    filterHeader.innerHTML = `
      <div class="filter-title">
        <i class="fas fa-filter"></i> FILTRI E RICERCA
        ${getActiveFiltersCount() > 0 ? `<span class="filter-active-badge"><i class="fas fa-check"></i> ${getActiveFiltersCount()}</span>` : ''}
      </div>
      <i class="fas fa-chevron-down filter-toggle-icon"></i>
    `;
  }
};

function resetFiltersNew() {
  currentFilters = {
    nome: '',
    venditore: '',
    set: 'all',
    categoria: 'all',
    prezzoMin: 0,
    prezzoMax: 1000,
    disponibili: false,
    ratingMin: 0
  };
  currentPage = 1;
  
  document.getElementById('filterNome').value = '';
  if (document.getElementById('filterVenditore')) {
    document.getElementById('filterVenditore').value = '';
  }
  document.getElementById('filterSet').value = 'all';
  document.getElementById('filterCategoria').value = 'all';
  document.getElementById('filterDisponibili').checked = false;
  document.getElementById('filterRating').value = '0';
  
  // Reset slider
  priceMin = 0;
  priceMax = Math.ceil(Math.max(...allArticoli.map(a => parseFloat(a.prezzo_vendita) || 0)) / 100) * 100 || 1000;
  if (document.getElementById('priceRangeMin')) {
    document.getElementById('priceRangeMin').value = 0;
    document.getElementById('priceRangeMax').value = priceMax;
    initPriceRangeSlider();
  }
  
  renderVetrine(allArticoli);
  
  const filterHeader = document.querySelector('.filter-header');
  if (filterHeader) {
    filterHeader.innerHTML = `
      <div class="filter-title">
        <i class="fas fa-filter"></i> FILTRI E RICERCA
      </div>
      <i class="fas fa-chevron-down filter-toggle-icon"></i>
    `;
  }
}

function applyFiltersNew() {
  applyFilters(true);
}

// Init price slider dopo caricamento filtro
const loadVetrineContentOriginal = loadVetrineContent;
loadVetrineContent = async function() {
  await loadVetrineContentOriginal();
  setTimeout(() => {
    initPriceRangeSlider();
  }, 500);
};

// MODAL DETTAGLIO OTTIMIZZATO
function openModalDettaglioOptimized(articolo) {
  currentModalArticolo = articolo;
  currentGalleryIndex = 0;
  
  const immagini = [];
  if (articolo.Foto1) immagini.push(articolo.Foto1);
  if (articolo.Foto2) immagini.push(articolo.Foto2);
  if (articolo.Foto3) immagini.push(articolo.Foto3);
  if (articolo.Foto4) immagini.push(articolo.Foto4);
  if (articolo.Foto5) immagini.push(articolo.Foto5);
  
  const disponibile = articolo.Presente === true;
  const badgeClass = disponibile ? 'disponibile' : 'non-disponibile';
  const badgeText = disponibile ? '<i class="fas fa-check"></i> DISPONIBILE IN MAGAZZINO' : '<i class="fas fa-times"></i> NON DISPONIBILE';
  
  const modalHtml = `
    <div class="modal-dettaglio-backdrop" id="modalDettaglio" onclick="closeModalDettaglio(event)">
      <div class="modal-dettaglio-content" onclick="event.stopPropagation()">
        <div class="modal-header-sticky">
          <h3 class="modal-title-big">${articolo.Nome || 'Dettaglio Prodotto'}</h3>
          <button class="modal-close-btn" onclick="closeModalDettaglio()">✕</button>
        </div>
        
        <div class="modal-body-scroll">
          <div class="modal-gallery-swipe" id="gallerySwipe">
            ${immagini.length > 0 ? `
              <div class="gallery-container" id="galleryContainer">
                ${immagini.map((img, index) => `
                  <div class="gallery-slide">
                    <img src="${img}" alt="Foto ${index + 1}">
                  </div>
                `).join('')}
              </div>
              
              ${immagini.length > 1 ? `
                <button class="gallery-nav-btn gallery-nav-prev" onclick="prevImage()">
                  <i class="fas fa-chevron-left"></i>
                </button>
                <button class="gallery-nav-btn gallery-nav-next" onclick="nextImage()">
                  <i class="fas fa-chevron-right"></i>
                </button>
                
                <div class="gallery-dots">
                  ${immagini.map((_, index) => `
                    <div class="gallery-dot ${index === 0 ? 'active' : ''}" onclick="goToImage(${index})"></div>
                  `).join('')}
                </div>
              ` : ''}
            ` : `
              <div class="gallery-placeholder">
                <i class="fas fa-image"></i>
                <p>Nessuna immagine</p>
              </div>
            `}
          </div>
          
          <div class="modal-content-section">
            <div class="modal-badge-disponibilita ${badgeClass}">
              ${badgeText}
            </div>
            
            <div class="modal-price-mega">
              <div class="modal-price-label">
                <i class="fas fa-tag"></i> PREZZO
              </div>
              <div class="modal-price-value">${parseFloat(articolo.prezzo_vendita || 0).toFixed(2)}€</div>
            </div>
            
            ${createModalInfoBox(articolo)}
            
            ${articolo.Descrizione ? `
              <div class="modal-description-box">
                <h4><i class="fas fa-align-left"></i> DESCRIZIONE</h4>
                <p>${articolo.Descrizione}</p>
              </div>
            ` : ''}
            
            <button class="modal-contact-mega-btn" onclick="contattaVenditore('${articolo.Utenti?.username || 'Venditore'}', '${articolo.Utenti?.email || ''}', '${articolo.Nome || 'Prodotto'}')">
              <i class="fas fa-envelope"></i> CONTATTA VENDITORE
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  document.body.style.overflow = 'hidden';
  
  if (immagini.length > 1) {
    setupGallerySwipe();
  }
}

function createModalInfoBox(articolo) {
  const fields = [];
  
  if (articolo.Categoria) fields.push({icon: 'fa-tag', label: 'Categoria', value: articolo.Categoria});
  if (articolo.Set) fields.push({icon: 'fa-layer-group', label: 'Set', value: articolo.Set});
  if (articolo.Espansione) fields.push({icon: 'fa-boxes', label: 'Espansione', value: articolo.Espansione});
  if (articolo.Numero) fields.push({icon: 'fa-hashtag', label: 'Numero', value: articolo.Numero});
  if (articolo.Rarita) fields.push({icon: 'fa-gem', label: 'Rarità', value: articolo.Rarita});
  if (articolo.ValutazioneStato) fields.push({icon: 'fa-star', label: 'Valutazione', value: `${articolo.ValutazioneStato}/10`});
  if (articolo.Lingua) fields.push({icon: 'fa-language', label: 'Lingua', value: articolo.Lingua});
  
  if (fields.length === 0) return '';
  
  return `
    <div class="modal-info-box">
      <div class="modal-info-title">
        <i class="fas fa-info-circle"></i> INFORMAZIONI
      </div>
      <div class="modal-info-grid">
        ${fields.map(f => `
          <div class="modal-info-row">
            <div class="modal-info-label"><i class="fas ${f.icon}"></i> ${f.label}</div>
            <div class="modal-info-value">${f.value}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function goToImage(index) {
  currentGalleryIndex = index;
  updateGallery();
}
// ============================================
// OVERRIDE FUNZIONI - VERSIONE PULITA

// ============================================

// ============================================
// NAVIGAZIONE FOTO ARTICOLI
// ============================================

function changeArticlePhoto(articleId, direction) {
  const card = document.querySelector(`[data-article-id="${articleId}"]`);
  if (!card) return;
  
  const photos = JSON.parse(card.getAttribute('data-photos') || '[]');
  if (photos.length === 0) return;
  
  let currentIndex = parseInt(card.getAttribute('data-current-photo') || '0');
  currentIndex += direction;
  
  // Loop circolare
  if (currentIndex < 0) currentIndex = photos.length - 1;
  if (currentIndex >= photos.length) currentIndex = 0;
  
  // Aggiorna immagine
  const img = card.querySelector(`#article-img-${articleId}`);
  if (img) {
    img.src = photos[currentIndex];
    
    // Aggiorna anche bottone fullscreen
    const fullscreenBtn = card.querySelector('.article-fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.setAttribute('onclick', `event.stopPropagation(); openFullscreen('${photos[currentIndex].replace(/'/g, "\\'")}')` );
    }
  }
  
  // Aggiorna dots
  const dotsContainer = card.querySelector(`#dots-${articleId}`);
  if (dotsContainer) {
    const dots = dotsContainer.querySelectorAll('.article-photo-dot');
    dots.forEach((dot, idx) => {
      if (idx === currentIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }
  
  // Salva nuovo indice
  card.setAttribute('data-current-photo', currentIndex);
}

function openFullscreen(imageUrl) {
  // Apri immagine in nuova tab/finestra
  const fullscreenWindow = window.open('', '_blank');
  
  if (fullscreenWindow) {
    fullscreenWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Immagine Full Screen</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            background: #000;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            overflow: hidden;
          }
          img {
            max-width: 100%;
            max-height: 100vh;
            object-fit: contain;
          }
          .close-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: rgba(251, 191, 36, 0.95);
            color: #000;
            border: none;
            font-size: 24px;
            font-weight: 900;
            cursor: pointer;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(251, 191, 36, 0.6);
            transition: all 0.2s;
          }
          .close-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 25px rgba(251, 191, 36, 0.8);
          }
        </style>
      </head>
      <body>
        <button class="close-btn" onclick="window.close()">✕</button>
        <img src="${imageUrl}" alt="Full Screen">
      </body>
      </html>
    `);
    fullscreenWindow.document.close();
  }
}

// ============================================
// PROFILO VENDITORE - RIMOSSO
// ============================================
// La vecchia funzione openVendorProfile è stata rimossa
// Ora il nome è cliccabile direttamente (link HTML)
// Il pulsante usa openChatWithVendor per aprire i messaggi
