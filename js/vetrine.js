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
  altroCategoria: '',
  condizione: '',
  lingua: '',
  prezzoMin: '',
  prezzoMax: '',
  disponibili: false
};
let currentPage = 1;
const itemsPerPage = 10;
let scrollIndicatorTimers = new Map();

// ========== HELPER BANDIERINA LINGUA ==========
function getFlagHtml(lingua, size = 16) {
  if (!lingua) return '';
  const flagMap = {
    'ITA': 'it', 'ENG': 'gb', 'JAP': 'jp', 'KOR': 'kr', 'CHN': 'cn',
    'FRA': 'fr', 'GER': 'de', 'SPA': 'es', 'POR': 'pt'
  };
  const flagCode = flagMap[lingua];
  if (!flagCode) return '';
  return `<span class="fi fi-${flagCode}" style="font-size:${size}px;border-radius:2px;"></span>`;
}

// Seleziona lingua con bandierine
function selectLanguage(btn) {
  document.querySelectorAll('.flag-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const lang = btn.getAttribute('data-lang');
  document.getElementById('filterLingua').value = lang;
}

// Gestisce visibilità campo "Altro" categoria
function gestisciFiltroAltro() {
  const categoria = document.getElementById('filterCategoria')?.value;
  const altroGroup = document.getElementById('filterAltroGroup');
  if (altroGroup) {
    altroGroup.style.display = categoria === 'Altro' ? 'block' : 'none';
  }
}

// 🔥 FUNZIONE: Ottieni ID utente corrente
function getCurrentUserId() {
  // Prova con getCurrentUser (da auth.js)
  if (typeof getCurrentUser === 'function') {
    const user = getCurrentUser();
    return user?.id || null;
  }
  
  // Fallback: leggi direttamente da localStorage
  return localStorage.getItem('nodo_user_id') || null;
}

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
  
  // Mostra loader
  if (window.NodoLoader) NodoLoader.show('Caricamento vetrine...');
  
  try {
    // 🔥 Ottieni ID utente corrente
    const currentUserId = getCurrentUserId();
    
    if (!currentUserId) {
      console.error('❌ Utente non loggato!');
      container.innerHTML = `
        <div class="wip-container">
          <div class="wip-icon"><i class="fas fa-user-slash"></i></div>
          <div class="wip-text">DEVI ESSERE LOGGATO</div>
          <div class="wip-subtext">Effettua il login per vedere le vetrine</div>
        </div>
      `;
      if (window.NodoLoader) NodoLoader.hide();
      return;
    }
    
    // Carica articoli in vetrina ESCLUDENDO i propri
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
      .neq('user_id', currentUserId)  // 🔥 ESCLUDI I TUOI ARTICOLI
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Errore query:', error);
      throw error;
    }
    
    console.log('📦 Articoli in vetrina caricati (escl. tuoi):', articoli?.length || 0);
    
    if (!articoli || articoli.length === 0) {
      container.innerHTML = `
        <div class="wip-container">
          <div class="wip-icon"><i class="fas fa-store-slash"></i></div>
          <div class="wip-text">NESSUN ARTICOLO IN VETRINA</div>
          <div class="wip-subtext">Gli altri utenti non hanno ancora messo articoli in vendita</div>
        </div>
      `;
      if (window.NodoLoader) NodoLoader.hide();
      return;
    }
    
    // Salva articoli globalmente
    allArticoli = articoli;
    
    // Crea filtro
    const filterHtml = createFilterHtml();
    
    // Mostra filtro + vetrine
    container.innerHTML = filterHtml;
    renderVetrine(articoli);
    
    // Nascondi loader
    if (window.NodoLoader) NodoLoader.hide();
    
  } catch (error) {
    console.error('❌ Errore caricamento vetrine:', error);
    container.innerHTML = `
      <div class="msg error" style="margin: 20px;">
        ❌ Errore nel caricamento delle vetrine: ${error.message}
      </div>
    `;
    if (window.NodoLoader) NodoLoader.hide();
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
            <div class="filter-label"><i class="fas fa-globe"></i> Lingua</div>
            <div class="language-flags-grid">
              <button type="button" class="flag-btn active" data-lang="" onclick="selectLanguage(this)" title="Tutte">
                <span class="flag-circle"><i class="fas fa-globe"></i></span>
                <span class="flag-label">Tutte</span>
              </button>
              <button type="button" class="flag-btn" data-lang="ITA" onclick="selectLanguage(this)" title="Italiano">
                <span class="flag-circle"><span class="fi fi-it"></span></span>
                <span class="flag-label">ITA</span>
              </button>
              <button type="button" class="flag-btn" data-lang="ENG" onclick="selectLanguage(this)" title="Inglese">
                <span class="flag-circle"><span class="fi fi-gb"></span></span>
                <span class="flag-label">ENG</span>
              </button>
              <button type="button" class="flag-btn" data-lang="JAP" onclick="selectLanguage(this)" title="Giapponese">
                <span class="flag-circle"><span class="fi fi-jp"></span></span>
                <span class="flag-label">JAP</span>
              </button>
              <button type="button" class="flag-btn" data-lang="KOR" onclick="selectLanguage(this)" title="Coreano">
                <span class="flag-circle"><span class="fi fi-kr"></span></span>
                <span class="flag-label">KOR</span>
              </button>
              <button type="button" class="flag-btn" data-lang="CHN" onclick="selectLanguage(this)" title="Cinese">
                <span class="flag-circle"><span class="fi fi-cn"></span></span>
                <span class="flag-label">CHN</span>
              </button>
              <button type="button" class="flag-btn" data-lang="FRA" onclick="selectLanguage(this)" title="Francese">
                <span class="flag-circle"><span class="fi fi-fr"></span></span>
                <span class="flag-label">FRA</span>
              </button>
              <button type="button" class="flag-btn" data-lang="GER" onclick="selectLanguage(this)" title="Tedesco">
                <span class="flag-circle"><span class="fi fi-de"></span></span>
                <span class="flag-label">GER</span>
              </button>
              <button type="button" class="flag-btn" data-lang="SPA" onclick="selectLanguage(this)" title="Spagnolo">
                <span class="flag-circle"><span class="fi fi-es"></span></span>
                <span class="flag-label">SPA</span>
              </button>
            </div>
            <input type="hidden" id="filterLingua" value="">
          </div>
          
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-euro-sign"></i> Prezzo</div>
            <div class="filter-price-inputs">
              <input type="number" class="filter-input" id="filterPrezzoMin" placeholder="Min €" min="0" step="0.01">
              <input type="number" class="filter-input" id="filterPrezzoMax" placeholder="Max €" min="0" step="0.01">
            </div>
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
  if (currentFilters.altroCategoria !== '') count++;
  if (currentFilters.condizione !== '') count++;
  if (currentFilters.lingua !== '') count++;
  if (currentFilters.prezzoMin > 0) count++;
  if (currentFilters.prezzoMax < 1000) count++;
  if (currentFilters.disponibili) count++;
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
    disponibili: false
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
        let hasScrolled = false; // 🔥 Flag per tracciare se ha scrollato
        
        scrollContainer.addEventListener('scroll', () => {
          // 🔥 Se scrolla per la prima volta, nascondi DEFINITIVAMENTE
          if (scrollContainer.scrollLeft > 10 && !hasScrolled) {
            hasScrolled = true;
            indicator.style.opacity = '0';
            indicator.style.pointerEvents = 'none';
            
            // 🔥 RIMUOVI completamente dopo animazione
            setTimeout(() => {
              if (indicator.parentNode) {
                indicator.remove();
              }
            }, 300);
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
      <div class="vetrina-header">
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
        ${articoli.length > 2 ? `<div class="scroll-indicator" id="scroll-indicator-${userId}">SCORRI <i class="fas fa-chevron-right"></i></div>` : ''}
      </div>
      
      ${articoli.length > 1 ? `<div class="vetrina-products-dots" id="dots-${userId}">${dotsHtml}</div>` : ''}
    </div>
  `;
}

function createArticoloCard(articolo) {
  // Raccogli tutte le foto disponibili
  const allPhotos = [];
  if (articolo.foto_principale) allPhotos.push(articolo.foto_principale);
  else if (articolo.image_url) allPhotos.push(articolo.image_url);
  if (articolo.foto_2) allPhotos.push(articolo.foto_2);
  if (articolo.foto_3) allPhotos.push(articolo.foto_3);
  if (articolo.foto_4) allPhotos.push(articolo.foto_4);
  if (articolo.foto_5) allPhotos.push(articolo.foto_5);
  if (articolo.foto_6) allPhotos.push(articolo.foto_6);
  
  const hasMultiplePhotos = allPhotos.length > 1;
  const mainPhoto = allPhotos[0] || '';
  
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
  
  // Fullscreen button - apre galleria con tutte le foto
  const fullscreenHtml = mainPhoto ? `
    <button class="article-fullscreen-btn" onclick="event.stopPropagation(); openArticleGalleryVetrine('${articolo.id}')">
      <i class="fas fa-expand"></i>
    </button>
  ` : '';
  
  return `
    <div class="vetrina-product-card" onclick="mostraDettaglioArticolo('${articolo.id}')" data-article-id="${articolo.id}" data-current-photo="0" data-photos="${encodeURIComponent(JSON.stringify(allPhotos))}">
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
        <div class="vetrina-product-category">
          ${articolo.Categoria || 'Varie'}
          ${articolo.lingua ? `<span style="margin-left:6px;">${getFlagHtml(articolo.lingua, 14)}</span>` : ''}
        </div>
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

// ============================================
// TOGGLE VETRINA - RIMOSSO
// ============================================
// La funzionalità di espansione è stata rimossa

// CREA ARTICOLO ESPANSO (GRANDE) - RIMOSSO
// La funzione createArticoloExpanded è stata rimossa

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
// TOGGLE ESPANSIONE - RIMOSSO
// La funzione toggleVetrinaExpand è stata rimossa

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
          // 🔥 Se scrolla per la prima volta, nascondi DEFINITIVAMENTE
          if (!hasScrolled && scrollContainer.scrollLeft > 10) {
            hasScrolled = true;
            indicator.style.opacity = '0';
            indicator.style.pointerEvents = 'none';
            
            // 🔥 RIMUOVI completamente dopo animazione
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
    <div class="filter-box">
      <!-- Ricerca SEMPRE visibile -->
      <div class="filter-search-always">
        <i class="fas fa-search"></i>
        <input type="text" id="filterNome" placeholder="Cerca articolo..." oninput="applyFiltersNew()">
        <button class="filter-expand-btn" id="filterExpandBtn" onclick="toggleFilterBody()">
          <i class="fas fa-sliders-h"></i>
          <span id="filterBadge" class="${activeFiltersCount > 0 ? 'visible' : ''}">${activeFiltersCount > 0 ? activeFiltersCount : ''}</span>
        </button>
      </div>
      
      <!-- Resto filtri espandibile -->
      <div class="filter-body" id="filterBody">
        <div class="filter-group">
          <label><i class="fas fa-user"></i> Venditore</label>
          <input type="text" class="filter-input" id="filterVenditore" placeholder="Nome venditore...">
        </div>
        
        <div class="filter-group">
          <label><i class="fas fa-layer-group"></i> Set/Espansione</label>
          <select class="filter-select" id="filterSet">
            <option value="all">Tutti i set</option>
            ${sets.map(set => `<option value="${set}">${set}</option>`).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label><i class="fas fa-tags"></i> Categoria</label>
          <select class="filter-select" id="filterCategoria" onchange="gestisciFiltroAltro()">
            <option value="all">Tutte le categorie</option>
            <option value="ETB">ETB</option>
            <option value="Carte Singole">Carte Singole</option>
            <option value="Carte gradate">Carte gradate</option>
            <option value="Master Set">Master Set</option>
            <option value="Booster Box">Booster Box</option>
            <option value="Collection Box">Collection Box</option>
            <option value="Box mini tin">Box mini tin</option>
            <option value="Bustine">Bustine</option>
            <option value="Poké Ball">Poké Ball</option>
            <option value="Accessori">Accessori</option>
            <option value="Altro">Altro</option>
          </select>
        </div>
        
        <div class="filter-group" id="filterAltroGroup" style="display:none;">
          <label><i class="fas fa-edit"></i> Specifica Categoria</label>
          <input type="text" class="filter-input" id="filterAltroCategoria" placeholder="es. Pokemon Plush, Figure...">
        </div>
        
        <div class="filter-group">
          <label><i class="fas fa-certificate"></i> Condizione</label>
          <select class="filter-select" id="filterCondizione">
            <option value="">Tutte</option>
            <option value="Mint">(M) - Perfetta</option>
            <option value="Near Mint">(NM) - Quasi perfetta</option>
            <option value="Excellent">(EX) - Eccellente</option>
            <option value="Good">(GD) - Buona</option>
            <option value="Light Played">(LP) - Leggermente giocata</option>
            <option value="Played">(PL) - Giocata</option>
            <option value="Poor">(P) - Scarsa</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label><i class="fas fa-globe"></i> Lingua</label>
          <div class="language-flags-grid">
            <button type="button" class="flag-btn active" data-lang="" onclick="selectLanguage(this)" title="Tutte">
              <span class="flag-circle"><i class="fas fa-globe"></i></span>
              <span class="flag-label">Tutte</span>
            </button>
            <button type="button" class="flag-btn" data-lang="ITA" onclick="selectLanguage(this)" title="Italiano">
              <span class="flag-circle"><span class="fi fi-it"></span></span>
              <span class="flag-label">ITA</span>
            </button>
            <button type="button" class="flag-btn" data-lang="ENG" onclick="selectLanguage(this)" title="Inglese">
              <span class="flag-circle"><span class="fi fi-gb"></span></span>
              <span class="flag-label">ENG</span>
            </button>
            <button type="button" class="flag-btn" data-lang="JAP" onclick="selectLanguage(this)" title="Giapponese">
              <span class="flag-circle"><span class="fi fi-jp"></span></span>
              <span class="flag-label">JAP</span>
            </button>
            <button type="button" class="flag-btn" data-lang="KOR" onclick="selectLanguage(this)" title="Coreano">
              <span class="flag-circle"><span class="fi fi-kr"></span></span>
              <span class="flag-label">KOR</span>
            </button>
            <button type="button" class="flag-btn" data-lang="CHN" onclick="selectLanguage(this)" title="Cinese">
              <span class="flag-circle"><span class="fi fi-cn"></span></span>
              <span class="flag-label">CHN</span>
            </button>
            <button type="button" class="flag-btn" data-lang="FRA" onclick="selectLanguage(this)" title="Francese">
              <span class="flag-circle"><span class="fi fi-fr"></span></span>
              <span class="flag-label">FRA</span>
            </button>
            <button type="button" class="flag-btn" data-lang="GER" onclick="selectLanguage(this)" title="Tedesco">
              <span class="flag-circle"><span class="fi fi-de"></span></span>
              <span class="flag-label">GER</span>
            </button>
            <button type="button" class="flag-btn" data-lang="SPA" onclick="selectLanguage(this)" title="Spagnolo">
              <span class="flag-circle"><span class="fi fi-es"></span></span>
              <span class="flag-label">SPA</span>
            </button>
          </div>
          <input type="hidden" id="filterLingua" value="">
        </div>
        
        <div class="filter-group">
          <label><i class="fas fa-euro-sign"></i> Fascia di Prezzo</label>
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
    
    <!-- PAGINAZIONE -->
    <div class="pagination-container">
      <div class="pagination-info">
        <span id="pageStart">1</span>-<span id="pageEnd">10</span> di <span id="totalItems">0</span>
      </div>
      <div class="pagination-controls">
        <button class="pagination-btn" id="prevBtn" onclick="previousPageVetrine()" disabled>
          <i class="fas fa-chevron-left"></i>
        </button>
        <button class="pagination-btn" id="nextBtn" onclick="nextPageVetrine()">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
    
    <div id="vetrineList"></div>
  `;
}

// Toggle body filtri
function toggleFilterBody() {
  const body = document.getElementById('filterBody');
  const btn = document.getElementById('filterExpandBtn');
  if (body && btn) {
    body.classList.toggle('open');
    btn.classList.toggle('active');
  }
}

// Paginazione vetrine
function updatePaginationInfo(total) {
  const pageStartEl = document.getElementById('pageStart');
  const pageEndEl = document.getElementById('pageEnd');
  const totalItemsEl = document.getElementById('totalItems');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  if (!pageStartEl || !pageEndEl || !totalItemsEl) return;
  
  const start = total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, total);
  
  pageStartEl.textContent = start;
  pageEndEl.textContent = end;
  totalItemsEl.textContent = total;
  
  if (prevBtn) prevBtn.disabled = currentPage === 1;
  if (nextBtn) nextBtn.disabled = end >= total;
}

function previousPageVetrine() {
  if (currentPage > 1) {
    currentPage--;
    applyFiltersNew();
  }
}

function nextPageVetrine() {
  currentPage++;
  applyFiltersNew();
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
    updatePaginationInfo(0);
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
  const totalVetrine = vetrine.length;
  const totalPages = Math.ceil(totalVetrine / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalVetrine);
  const vetrinePaginate = vetrine.slice(startIndex, endIndex);
  
  // Aggiorna info paginazione nel box in alto
  updatePaginationInfo(totalVetrine);
  
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
  currentFilters.altroCategoria = document.getElementById('filterAltroCategoria')?.value.toLowerCase().trim() || '';
  currentFilters.condizione = document.getElementById('filterCondizione')?.value || '';
  currentFilters.lingua = document.getElementById('filterLingua')?.value || '';
  currentFilters.prezzoMin = priceMin;
  currentFilters.prezzoMax = priceMax;
  currentFilters.disponibili = document.getElementById('filterDisponibili').checked;
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
    
    // Filtro categoria con supporto "Altro"
    if (currentFilters.categoria !== 'all') {
      if (currentFilters.categoria === 'Altro') {
        // Se è selezionato "Altro", cerca nelle categorie personalizzate
        const categoriePredefinite = ['ETB', 'Carte Singole', 'Carte gradate', 'Master Set', 'Booster Box', 'Collection Box', 'Box mini tin', 'Bustine', 'Poké Ball', 'Accessori'];
        const isCustomCategory = !categoriePredefinite.includes(art.Categoria);
        if (!isCustomCategory) return false;
        
        // Se c'è un testo specifico, filtra per quello
        if (currentFilters.altroCategoria !== '') {
          const artCategoria = (art.Categoria || '').toLowerCase();
          if (!artCategoria.includes(currentFilters.altroCategoria)) {
            return false;
          }
        }
      } else {
        if (art.Categoria !== currentFilters.categoria) {
          return false;
        }
      }
    }
    
    // Filtro condizione
    if (currentFilters.condizione !== '' && art.condizione !== currentFilters.condizione) {
      return false;
    }
    
    // Filtro lingua
    if (currentFilters.lingua !== '' && art.lingua !== currentFilters.lingua) {
      return false;
    }
    
    const prezzo = parseFloat(art.prezzo_vendita) || 0;
    if (prezzo < currentFilters.prezzoMin || prezzo > currentFilters.prezzoMax) {
      return false;
    }
    
    if (currentFilters.disponibili && !art.Presente) {
      return false;
    }
    
    return true;
  });
  
  console.log(`🔍 Filtrati: ${articoliFiltrati.length}/${allArticoli.length} articoli`);
  
  renderVetrine(articoliFiltrati);
  
  // Chiudi body filtri e aggiorna badge
  if (closeFilter) {
    const filterBody = document.getElementById('filterBody');
    const filterBtn = document.getElementById('filterExpandBtn');
    if (filterBody) filterBody.classList.remove('open');
    if (filterBtn) filterBtn.classList.remove('active');
  }
  
  // Aggiorna badge filtri attivi
  const badge = document.getElementById('filterBadge');
  const activeCount = getActiveFiltersCount();
  if (badge) {
    badge.textContent = activeCount > 0 ? activeCount : '';
    badge.classList.toggle('visible', activeCount > 0);
  }
};

function resetFiltersNew() {
  currentFilters = {
    nome: '',
    venditore: '',
    set: 'all',
    categoria: 'all',
    altroCategoria: '',
    condizione: '',
    lingua: '',
    prezzoMin: 0,
    prezzoMax: 1000,
    disponibili: false
  };
  currentPage = 1;
  
  document.getElementById('filterNome').value = '';
  if (document.getElementById('filterVenditore')) {
    document.getElementById('filterVenditore').value = '';
  }
  document.getElementById('filterSet').value = 'all';
  document.getElementById('filterCategoria').value = 'all';
  document.getElementById('filterDisponibili').checked = false;
  
  // Reset condizione
  if (document.getElementById('filterCondizione')) {
    document.getElementById('filterCondizione').value = '';
  }
  
  // Reset campo Altro e nascondilo
  if (document.getElementById('filterAltroCategoria')) {
    document.getElementById('filterAltroCategoria').value = '';
  }
  if (document.getElementById('filterAltroGroup')) {
    document.getElementById('filterAltroGroup').style.display = 'none';
  }
  
  // Reset lingua e bandierine
  if (document.getElementById('filterLingua')) {
    document.getElementById('filterLingua').value = '';
  }
  document.querySelectorAll('.flag-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-lang') === '') {
      btn.classList.add('active');
    }
  });
  
  // Reset slider
  priceMin = 0;
  priceMax = Math.ceil(Math.max(...allArticoli.map(a => parseFloat(a.prezzo_vendita) || 0)) / 100) * 100 || 1000;
  if (document.getElementById('priceRangeMin')) {
    document.getElementById('priceRangeMin').value = 0;
    document.getElementById('priceRangeMax').value = priceMax;
    initPriceRangeSlider();
  }
  
  renderVetrine(allArticoli);
  
  // Reset badge
  const badge = document.getElementById('filterBadge');
  if (badge) {
    badge.textContent = '';
    badge.classList.remove('visible');
  }
  
  // Chiudi body filtri
  const filterBody = document.getElementById('filterBody');
  const filterBtn = document.getElementById('filterExpandBtn');
  if (filterBody) filterBody.classList.remove('open');
  if (filterBtn) filterBtn.classList.remove('active');
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
  var card = document.querySelector('[data-article-id="' + articleId + '"]');
  if (!card) return;
  
  var photos = [];
  try {
    photos = JSON.parse(decodeURIComponent(card.getAttribute('data-photos') || '[]'));
  } catch(e) {
    return;
  }
  if (photos.length === 0) return;
  
  var currentIndex = parseInt(card.getAttribute('data-current-photo') || '0');
  currentIndex += direction;
  
  // Loop circolare
  if (currentIndex < 0) currentIndex = photos.length - 1;
  if (currentIndex >= photos.length) currentIndex = 0;
  
  // Aggiorna immagine
  var img = card.querySelector('#article-img-' + articleId);
  if (img) {
    img.src = photos[currentIndex];
  }
  
  // Aggiorna dots
  var dotsContainer = card.querySelector('#dots-' + articleId);
  if (dotsContainer) {
    var dots = dotsContainer.querySelectorAll('.article-photo-dot');
    dots.forEach(function(dot, idx) {
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
  // Usa NodoGalleria se disponibile
  if (window.NodoGalleria) {
    NodoGalleria.open([imageUrl], 0);
  }
}

// Apre galleria con tutte le foto dell'articolo
function openArticleGalleryVetrine(articleId) {
  console.log('🖼️ openArticleGalleryVetrine chiamata con ID:', articleId);
  
  var card = document.querySelector('[data-article-id="' + articleId + '"]');
  console.log('🖼️ Card trovata:', card);
  
  if (!card) {
    console.error('❌ Card non trovata per ID:', articleId);
    return;
  }
  
  var photosAttr = card.getAttribute('data-photos');
  console.log('🖼️ data-photos (encoded):', photosAttr);
  
  var photos = [];
  try {
    photos = JSON.parse(decodeURIComponent(photosAttr || '[]'));
  } catch(e) {
    console.error('❌ Errore parsing photos:', e);
    return;
  }
  
  var currentIndex = parseInt(card.getAttribute('data-current-photo') || '0');
  
  console.log('🖼️ Photos array:', photos);
  console.log('🖼️ Current index:', currentIndex);
  console.log('🖼️ NodoGalleria disponibile:', !!window.NodoGalleria);
  
  if (photos.length === 0) {
    console.error('❌ Nessuna foto trovata');
    return;
  }
  
  // Usa NodoGalleria
  if (window.NodoGalleria) {
    NodoGalleria.open(photos, currentIndex);
  } else {
    console.error('❌ NodoGalleria non disponibile!');
    // Fallback: apri prima immagine in nuova tab
    window.open(photos[currentIndex], '_blank');
  }
}

// ============================================
// PROFILO VENDITORE - RIMOSSO
// ============================================
// La vecchia funzione openVendorProfile è stata rimossa
// Ora il nome è cliccabile direttamente (link HTML)
// Il pulsante usa openChatWithVendor per aprire i messaggi

// ============================================
// EXPORTS GLOBALI
// ============================================
window.openFullscreen = openFullscreen;
window.openArticleGalleryVetrine = openArticleGalleryVetrine;
window.changeArticlePhoto = changeArticlePhoto;
window.loadVetrineContent = loadVetrineContent;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.toggleFilter = toggleFilter;
window.changePage = changePage;
window.mostraDettaglioArticolo = mostraDettaglioArticolo;
window.contattaVenditore = contattaVenditore;
window.openChatWithVendor = openChatWithVendor;
window.selectLanguage = selectLanguage;
window.gestisciFiltroAltro = gestisciFiltroAltro;
window.toggleFilterBody = toggleFilterBody;
window.previousPageVetrine = previousPageVetrine;
window.nextPageVetrine = nextPageVetrine;
window.applyFiltersNew = applyFiltersNew;
window.resetFiltersNew = resetFiltersNew;
