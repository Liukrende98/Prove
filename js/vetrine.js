// ========================================
// LOGICA VETRINE - ARTICOLI REALI - OTTIMIZZATO MOBILE
// ========================================

// Variabili globali
let allArticoli = [];
let currentFilters = {
  nome: '',
  set: 'all',
  categoria: 'all',
  prezzoMin: '',
  prezzoMax: '',
  disponibili: false,
  ratingMin: 0
};

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
  if (currentFilters.set !== 'all') count++;
  if (currentFilters.categoria !== 'all') count++;
  if (currentFilters.prezzoMin !== '') count++;
  if (currentFilters.prezzoMax !== '') count++;
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

function applyFilters() {
  // Leggi valori filtri
  currentFilters.nome = document.getElementById('filterNome').value.toLowerCase().trim();
  currentFilters.set = document.getElementById('filterSet').value;
  currentFilters.categoria = document.getElementById('filterCategoria').value;
  currentFilters.prezzoMin = document.getElementById('filterPrezzoMin').value;
  currentFilters.prezzoMax = document.getElementById('filterPrezzoMax').value;
  currentFilters.disponibili = document.getElementById('filterDisponibili').checked;
  currentFilters.ratingMin = parseInt(document.getElementById('filterRating').value) || 0;
  
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
  
  // Chiudi filtro
  toggleFilter();
  
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
  
  // Crea vetrine
  let html = '';
  Object.entries(articoliPerUtente).forEach(([userId, userData]) => {
    const vendite = userData.articoli.length;
    
    // Calcola media recensioni
    const articoliConRecensione = userData.articoli.filter(a => a.ValutazioneStato && a.ValutazioneStato > 0);
    const mediaRecensioni = articoliConRecensione.length > 0
      ? (articoliConRecensione.reduce((sum, a) => sum + a.ValutazioneStato, 0) / articoliConRecensione.length).toFixed(1)
      : 0;
    
    // Calcola percentuale recensioni
    const percentualeRecensioni = vendite > 0 
      ? Math.round((articoliConRecensione.length / vendite) * 100)
      : 0;
    
    // Acquisti - per ora usiamo valore fittizio (in futuro andrà preso dal database Utenti)
    const acquisti = 0;
    
    html += createVetrinaCard(
      userId,
      userData.username,
      userData.citta,
      vendite,
      acquisti,
      mediaRecensioni,
      percentualeRecensioni,
      userData.articoli
    );
  });
  
  container.innerHTML = html;
  
  // Aggiungi listener per nascondere freccia scroll quando si scrolla
  setTimeout(() => {
    const scrollContainers = document.querySelectorAll('.vetrina-products-scroll');
    scrollContainers.forEach(scrollContainer => {
      const indicator = scrollContainer.querySelector('.scroll-indicator');
      if (indicator) {
        scrollContainer.addEventListener('scroll', () => {
          if (scrollContainer.scrollLeft > 10) {
            indicator.style.opacity = '0';
            indicator.style.pointerEvents = 'none';
          } else {
            indicator.style.opacity = '1';
          }
        });
      }
    });
  }, 100);
}

function createVetrinaCard(userId, username, citta, vendite, acquisti, mediaRecensioni, percentualeRecensioni, articoli) {
  return `
    <div class="vetrina-card-big" id="vetrina-${userId}">
      <div class="vetrina-header">
        <div class="vetrina-top">
          <div class="vetrina-avatar">
            <i class="fas fa-store"></i>
          </div>
          <div class="vetrina-info">
            <h3>
              <span class="vetrina-username">${username}</span>
            </h3>
            <p><i class="fas fa-map-marker-alt"></i> ${citta}</p>
            <div class="vetrina-rating">
              <i class="fas fa-store"></i> ${vendite} in vendita
            </div>
          </div>
        </div>
      </div>
      
      <div class="vetrina-stats-inline">
        <div class="vetrina-stat-inline">
          <i class="fas fa-shopping-cart"></i>
          <span class="vetrina-stat-inline-value">${vendite}</span> vendite
        </div>
        <div class="vetrina-stat-inline">
          <i class="fas fa-box"></i>
          <span class="vetrina-stat-inline-value">${acquisti}</span> acquisti
        </div>
        <div class="vetrina-stat-inline">
          <i class="fas fa-star"></i>
          <span class="vetrina-stat-inline-value">${mediaRecensioni}/10</span> (${percentualeRecensioni}%)
        </div>
      </div>
      
      <div class="vetrina-products-scroll" style="position: relative;">
        <div class="vetrina-products-container">
          ${articoli.map(art => createArticoloCard(art)).join('')}
        </div>
        ${articoli.length > 2 ? '<div class="scroll-indicator">SCORRI <i class="fas fa-chevron-right"></i></div>' : ''}
      </div>
    </div>
  `;
}

function createArticoloCard(articolo) {
  const foto = articolo.foto_principale || articolo.image_url || '';
  const imageHtml = foto 
    ? `<img src="${foto}" alt="${articolo.Nome}">` 
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
  
  return `
    <div class="vetrina-product-card" onclick="mostraDettaglioArticolo('${articolo.id}')">
      <div class="vetrina-product-image">
        ${imageHtml}
        ${badgeHtml}
        ${ratingHtml}
      </div>
      <div class="vetrina-product-info">
        <div class="vetrina-product-name">${articolo.Nome}</div>
        <div class="vetrina-product-category">${articolo.Categoria || 'Varie'}</div>
        <div class="vetrina-product-price">${parseFloat(articolo.prezzo_vendita || 0).toFixed(2)}€</div>
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
  try {
    // Carica articolo con dati utente
    const { data: articolo, error } = await supabaseClient
      .from('Articoli')
      .select(`
        *,
        Utenti (
          username,
          email,
          citta
        )
      `)
      .eq('id', articoloId)
      .single();
    
    if (error) throw error;
    
    console.log('📄 Articolo caricato:', articolo);
    
    // Raccogli tutte le foto disponibili
    const foto = [
      articolo.foto_principale || articolo.image_url,
      articolo.foto_2,
      articolo.foto_3,
      articolo.foto_4,
      articolo.foto_5,
      articolo.foto_6
    ].filter(f => f !== null && f !== '' && f !== undefined);
    
    console.log('📸 Foto trovate:', foto.length);
    
    const galleriaHtml = foto.length > 0 
      ? foto.map((f, index) => `
          <img 
            src="${f}" 
            alt="Foto ${index + 1}"
            class="modal-gallery-img"
            onclick="window.open('${f}', '_blank')"
          >
        `).join('')
      : '<div class="modal-gallery-placeholder"><i class="fas fa-image" style="font-size:48px; margin-bottom:12px;"></i><div style="font-size:14px;">Nessuna foto</div></div>';
    
    // Mostra numero + stella invece di tante stelle
    const stelle = articolo.ValutazioneStato ? `${articolo.ValutazioneStato}/10 ⭐` : '—';
    
    // Badge disponibilità
    const disponibile = articolo.Presente === true;
    const badgeDisponibilitaHtml = disponibile
      ? '<div style="display:inline-block; padding:8px 16px; background:rgba(34,197,94,0.9); color:white; border-radius:20px; font-size:12px; font-weight:800; margin-bottom:15px;"><i class="fas fa-check"></i> DISPONIBILE IN MAGAZZINO</div>'
      : '<div style="display:inline-block; padding:8px 16px; background:rgba(239,68,68,0.9); color:white; border-radius:20px; font-size:12px; font-weight:800; margin-bottom:15px;"><i class="fas fa-times"></i> NON DISPONIBILE</div>';
    
    const modalHtml = `
      <div class="modal-dettaglio-backdrop" onclick="chiudiModalDettaglio(event)">
        <div class="modal-dettaglio-content" onclick="event.stopPropagation()">
          <div class="modal-dettaglio-header">
            <h2 class="modal-dettaglio-title">${articolo.Nome}</h2>
            <button class="modal-dettaglio-close" onclick="chiudiModalDettaglio()">✕</button>
          </div>
          
          ${badgeDisponibilitaHtml}
          
          <div class="modal-dettaglio-gallery">
            <h3><i class="fas fa-images"></i> FOTO</h3>
            <div class="modal-gallery-grid">
              ${galleriaHtml}
            </div>
          </div>
          
          <div class="modal-dettaglio-info">
            <div class="modal-info-row">
              <span class="modal-info-label"><i class="fas fa-box"></i> Disponibilità</span>
              <span class="modal-info-value" style="color: ${disponibile ? '#22c55e' : '#ef4444'};">
                ${disponibile ? 'IN MAGAZZINO' : 'NON DISPONIBILE'}
              </span>
            </div>
            <div class="modal-info-row">
              <span class="modal-info-label"><i class="fas fa-layer-group"></i> Categoria</span>
              <span class="modal-info-value">${articolo.Categoria || '—'}</span>
            </div>
            <div class="modal-info-row">
              <span class="modal-info-label"><i class="fas fa-star"></i> Valutazione</span>
              <span class="modal-info-value" style="color:#fbbf24;">${stelle}</span>
            </div>
            <div class="modal-info-row">
              <span class="modal-info-label"><i class="fas fa-user"></i> Venditore</span>
              <span class="modal-info-value">${articolo.Utenti?.username || 'Anonimo'}</span>
            </div>
            <div class="modal-info-row">
              <span class="modal-info-label"><i class="fas fa-map-marker-alt"></i> Città</span>
              <span class="modal-info-value">${articolo.Utenti?.citta || '—'}</span>
            </div>
            <div class="modal-info-price">
              <span class="modal-info-price-label"><i class="fas fa-tag"></i> Prezzo</span>
              <span class="modal-info-price-value">${parseFloat(articolo.prezzo_vendita || 0).toFixed(2)}€</span>
            </div>
          </div>
          
          ${articolo.Descrizione ? `
            <div class="modal-dettaglio-desc">
              <h3><i class="fas fa-align-left"></i> DESCRIZIONE</h3>
              <p>${articolo.Descrizione}</p>
            </div>
          ` : ''}
          
          <button class="modal-dettaglio-contact" onclick="contattaVenditore('${articolo.Utenti?.username}', '${articolo.Utenti?.email}', '${articolo.Nome}')">
            <i class="fas fa-envelope"></i> CONTATTA VENDITORE
          </button>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Blocca scroll del body
    document.body.style.overflow = 'hidden';
    
  } catch (error) {
    console.error('❌ Errore caricamento dettaglio:', error);
    alert('❌ Errore: ' + error.message);
  }
}

function chiudiModalDettaglio(event) {
  // Se event è undefined, chiudi sempre
  // Se event esiste, chiudi solo se click sul backdrop
  if (!event || event.currentTarget === event.target) {
    const modal = document.querySelector('.modal-dettaglio-backdrop');
    if (modal) {
      modal.remove();
      // Riabilita scroll del body
      document.body.style.overflow = '';
    }
  }
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
