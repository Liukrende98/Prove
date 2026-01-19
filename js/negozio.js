// ========================================
// LOGICA IL TUO NEGOZIO - CON AUTENTICAZIONE E FOTO MULTIPLE
// NODO Italia - v2.0 Modulare
// ========================================

let currentPage = 1;
const itemsPerPage = 10;
let allArticles = [];
let filteredArticles = [];
let currentChart = null;
let currentChartColor = 'yellow';
let stream = null;
let viewMode = 'grid'; // 'grid' o 'list'

// ========== TOGGLE VISTA GRID/LIST ==========
function toggleViewMode() {
  viewMode = viewMode === 'grid' ? 'list' : 'grid';
  
  const toggleBtn = document.getElementById('viewToggleBtn');
  if (toggleBtn) {
    toggleBtn.innerHTML = viewMode === 'grid' 
      ? '<i class="fas fa-list"></i>' 
      : '<i class="fas fa-th-large"></i>';
  }
  
  renderArticles();
}

// ========== GESTIONE CARTE GRADATE ==========
function gestisciCarteGradate(categoriaValue, prefix) {
  const casaGroup = document.getElementById(`casaGradazioneGroup${prefix}`);
  const votoGroup = document.getElementById(`votoGradazioneGroup${prefix}`);
  const casaSelect = document.getElementById(`casaGradazione${prefix}`);
  const votoInput = document.getElementById(`votoGradazione${prefix}`);
  const altraCasaGroup = document.getElementById(`altraCasaGradazioneGroup${prefix}`);
  
  if (!casaGroup || !votoGroup) return;
  
  if (categoriaValue === 'Carte gradate') {
    casaGroup.style.display = 'block';
    votoGroup.style.display = 'block';
    if (casaSelect) casaSelect.required = true;
    if (votoInput) votoInput.required = true;
  } else {
    casaGroup.style.display = 'none';
    votoGroup.style.display = 'none';
    if (altraCasaGroup) altraCasaGroup.style.display = 'none';
    if (casaSelect) {
      casaSelect.required = false;
      casaSelect.value = '';
    }
    if (votoInput) {
      votoInput.required = false;
      votoInput.value = '';
    }
    const altraCasaInput = document.getElementById(`altraCasaGradazione${prefix}`);
    if (altraCasaInput) altraCasaInput.value = '';
  }
}

function gestisciAltraCasa(casaValue, prefix) {
  const altraCasaGroup = document.getElementById(`altraCasaGradazioneGroup${prefix}`);
  const altraCasaInput = document.getElementById(`altraCasaGradazione${prefix}`);
  
  if (!altraCasaGroup) return;
  
  if (casaValue === 'Altra casa') {
    altraCasaGroup.style.display = 'block';
    if (altraCasaInput) altraCasaInput.required = true;
  } else {
    altraCasaGroup.style.display = 'none';
    if (altraCasaInput) {
      altraCasaInput.required = false;
      altraCasaInput.value = '';
    }
  }
}

// ========== CARICAMENTO ARTICOLI (SOLO DELL'UTENTE LOGGATO) ==========
async function caricaArticoli() {
  try {
    // 🔥 FIX: Controlla se l'utente è loggato PRIMA di usare user.id
    const user = getCurrentUser();
    
    if (!user || !user.id) {
      console.warn('⚠️ Utente non loggato, impossibile caricare articoli');
      return; // Esce senza errore - requireAuth() gestirà il redirect
    }
    
    const { data, error } = await supabaseClient
      .from("Articoli")
      .select("*")
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    allArticles = data || [];
    filteredArticles = [...allArticles];
    
    console.log('📦 Articoli caricati:', allArticles.length);
    
    renderDashboard();
    renderArticles();
    updatePagination();
  } catch (error) {
    console.error('❌ Errore caricamento:', error);
  }
}

function renderDashboard() {
  const dashboard = document.getElementById('dashboard');
  if (!dashboard) return;
  
  const totale = allArticles.length;
  const valoreAttuale = allArticles.reduce((sum, r) => sum + (Number(r.ValoreAttuale) || 0), 0);
  const prezzoPagato = allArticles.reduce((sum, r) => sum + (Number(r.PrezzoPagato) || 0), 0);
  const delta = valoreAttuale - prezzoPagato;
  const deltaPercent = prezzoPagato > 0 ? ((delta / prezzoPagato) * 100) : 0;
  
  dashboard.innerHTML = `
    <div class="stat-card" onclick="toggleDashboardCard(this, 'totale')">
      <div class="stat-icon"><i class="fas fa-layer-group"></i></div>
      <div class="stat-label">Totale Articoli</div>
      <div class="stat-value">${totale}</div>
      <div class="stat-subtext">nel negozio</div>
    </div>
    
    <div class="stat-card" onclick="toggleDashboardCard(this, 'valore')">
      <div class="stat-icon"><i class="fas fa-gem"></i></div>
      <div class="stat-label">Valore Totale</div>
      <div class="stat-value">${valoreAttuale.toFixed(2)} €</div>
      <div class="stat-subtext">valore di mercato</div>
    </div>
    
    <div class="stat-card" onclick="toggleDashboardCard(this, 'spesa')">
      <div class="stat-icon"><i class="fas fa-wallet"></i></div>
      <div class="stat-label">Spesa Totale</div>
      <div class="stat-value">${prezzoPagato.toFixed(2)} €</div>
      <div class="stat-subtext">investimento iniziale</div>
    </div>
    
    <div class="stat-card" onclick="toggleDashboardCard(this, 'performance')">
      <div class="stat-icon"><i class="fas fa-rocket"></i></div>
      <div class="stat-label">Performance</div>
      <div class="stat-value">${delta >= 0 ? '+' : ''}${delta.toFixed(2)} €</div>
      <div class="stat-subtext">${delta >= 0 ? '+' : ''}${deltaPercent.toFixed(1)}%</div>
    </div>
  `;
}

function toggleDashboardCard(element, type) {
  // Rimuovi expanded da tutti gli altri
  document.querySelectorAll('.stat-card').forEach(card => {
    if (card !== element) {
      card.classList.remove('expanded');
    }
  });
  
  // Toggle su questo
  element.classList.toggle('expanded');
  
  // Se expanded, apri grafico
  if (element.classList.contains('expanded')) {
    const colorMap = {
      'totale': 'yellow',
      'valore': 'yellow',
      'spesa': 'yellow',
      'performance': 'yellow'
    };
    apriGrafico(type, colorMap[type]);
  }
}

function renderArticles() {
  const grid = document.getElementById('articlesGrid');
  if (!grid) return;
  
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageArticles = filteredArticles.slice(start, end);
  
  if (pageArticles.length === 0) {
    grid.innerHTML = `
      <div class="wip-container">
        <div class="wip-icon"><i class="fas fa-inbox"></i></div>
        <div class="wip-text">Nessun Articolo</div>
        <div class="wip-subtext">Aggiungi il tuo primo articolo o modifica i filtri</div>
      </div>
    `;
    return;
  }
  
  // Render in base alla modalità
  if (viewMode === 'list') {
    grid.className = 'articles-list';
    grid.innerHTML = pageArticles.map(article => createArticleListItem(article)).join('');
  } else {
    grid.className = 'articles-grid';
    grid.innerHTML = pageArticles.map(article => createArticleCard(article)).join('');
  }
}

// ========== VISTA LISTA - iPhone Optimized ==========
function createArticleListItem(article) {
  const delta = (Number(article.ValoreAttuale) || 0) - (Number(article.PrezzoPagato) || 0);
  const deltaClass = delta >= 0 ? 'profit' : 'loss';
  const foto = article.foto_principale || article.image_url || '';
  
  // Info gradazione
  let gradedInfo = '';
  if (article.Categoria === 'Carte gradate' && article.casa_gradazione && article.voto_gradazione) {
    gradedInfo = `<span class="list-graded">${article.casa_gradazione} ${article.voto_gradazione}</span>`;
  }
  
  return `
    <div class="list-item" onclick="apriModifica(${article.id})">
      <div class="list-image">
        <img src="${foto || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a1a%22 width=%22100%22 height=%22100%22/><text x=%2250%%22 y=%2250%%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23fbbf24%22 font-size=%2230%22>📷</text></svg>'}" alt="">
        ${article.Presente 
          ? '<span class="list-status presente"><i class="fas fa-check"></i></span>' 
          : '<span class="list-status assente"><i class="fas fa-times"></i></span>'}
      </div>
      
      <div class="list-info">
        <div class="list-name">${article.Nome || 'Senza nome'}</div>
        <div class="list-meta">
          <span class="list-category">${article.Categoria || 'N/D'}</span>
          ${gradedInfo}
          ${article.in_vetrina ? '<span class="list-vetrina"><i class="fas fa-store"></i></span>' : ''}
        </div>
      </div>
      
      <div class="list-values">
        <div class="list-price">${Number(article.ValoreAttuale || 0).toFixed(0)}€</div>
        <div class="list-delta ${deltaClass}">${delta >= 0 ? '+' : ''}${delta.toFixed(0)}€</div>
      </div>
      
      <div class="list-arrow">
        <i class="fas fa-chevron-right"></i>
      </div>
    </div>
  `;
}

// ========== VISTA GRIGLIA ==========

function createArticleCard(article) {
  const delta = (Number(article.ValoreAttuale) || 0) - (Number(article.PrezzoPagato) || 0);
  const deltaClass = delta >= 0 ? 'profit' : 'loss';
  const deltaIcon = delta >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
  const deltaPercent = article.PrezzoPagato > 0 ? ((delta / article.PrezzoPagato) * 100) : 0;
  const rating = article.ValutazioneStato || 0;
  const ratingPercent = (rating / 10) * 100;
  
  const foto = article.foto_principale || article.image_url || '';
  const foto2 = article.foto_2 || '';
  const foto3 = article.foto_3 || '';
  const foto4 = article.foto_4 || '';
  
  const hasGallery = foto2 || foto3 || foto4;
  
  // Calcolo ROI e margine potenziale
  const roi = article.PrezzoPagato > 0 ? ((delta / article.PrezzoPagato) * 100).toFixed(1) : '0.0';
  const marginePotenziale = article.prezzo_vendita ? (Number(article.prezzo_vendita) - Number(article.PrezzoPagato || 0)) : null;
  const marginePercent = (article.prezzo_vendita && article.PrezzoPagato > 0) 
    ? (((article.prezzo_vendita - article.PrezzoPagato) / article.PrezzoPagato) * 100).toFixed(1) 
    : null;
  
  return `
    <div class="article-card" id="card-${article.id}">
      <!-- IMMAGINE CHE SI INGRANDISCE -->
      <div class="article-image-wrapper" onclick="toggleArticleCard(${article.id})">
        <img src="${foto || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 400%22><rect fill=%22%231a1a1a%22 width=%22400%22 height=%22400%22/><text x=%2250%%22 y=%2250%%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23fbbf24%22 font-size=%2240%22>📷</text></svg>'}" alt="${article.Nome}" class="article-main-image">
        
        <!-- Badge Presenza -->
        ${article.Presente 
          ? '<div class="article-badge badge-presente"><i class="fas fa-check"></i> PRESENTE</div>' 
          : '<div class="article-badge badge-assente"><i class="fas fa-times"></i> ASSENTE</div>'}
        
        <!-- Badge Gradazione -->
        ${article.Categoria === 'Carte gradate' && article.casa_gradazione && article.voto_gradazione
          ? `<div class="article-badge badge-graded" style="top: 45px;"><i class="fas fa-award"></i> ${article.casa_gradazione} ${article.voto_gradazione}</div>`
          : ''}
        
        <!-- Badge Vetrina -->
        ${article.in_vetrina 
          ? `<div class="article-badge badge-vetrina" style="top: ${article.Categoria === 'Carte gradate' && article.casa_gradazione ? '85px' : '45px'};"><i class="fas fa-store"></i> IN VETRINA</div>` 
          : ''}
      </div>
      
      <!-- INFO COMPATTA -->
      <div class="article-compact-info">
        <div class="article-name" onclick="toggleArticleCard(${article.id})">${article.Nome || 'Senza nome'}</div>
        <div class="article-category"><i class="fas fa-layer-group"></i> ${article.Categoria || 'Nessuna categoria'}</div>
        
        <!-- Valutazione Moderna -->
        <div class="article-rating-modern">
          <div class="rating-number-display">
            <span class="rating-num">${rating}</span>
            <span class="rating-sep">/</span>
            <span class="rating-max">10</span>
          </div>
          <div class="rating-bar-wrap">
            <div class="rating-bar-fill" style="width: ${ratingPercent}%;"></div>
          </div>
        </div>
        
        <!-- Valori Finanziari -->
        <div class="article-values-grid">
          <div class="value-box">
            <div class="value-box-label">VALORE</div>
            <div class="value-box-amount">${Number(article.ValoreAttuale || 0).toFixed(2)} €</div>
          </div>
          <div class="value-box">
            <div class="value-box-label">DELTA</div>
            <div class="value-box-amount ${deltaClass}">${delta >= 0 ? '+' : ''}${delta.toFixed(2)} €</div>
          </div>
        </div>
        
        <!-- Tasto Modifica Rapido -->
        <button class="quick-edit-btn" onclick="event.stopPropagation(); apriModifica(${article.id})">
          <i class="fas fa-pen"></i> Modifica
        </button>
      </div>
      
      <!-- DETTAGLI ESPANSI -->
      <div class="article-expanded-section">
        
        <!-- 🔥 SEZIONE FINTECH - PANORAMICA INVESTIMENTO -->
        <div class="fintech-portfolio">
          
          <!-- Header con Valore Totale -->
          <div class="portfolio-header">
            <div class="portfolio-main-value">
              <span class="portfolio-label">VALORE DI MERCATO</span>
              <span class="portfolio-amount">${Number(article.ValoreAttuale || 0).toFixed(2)} <small>EUR</small></span>
            </div>
            <div class="portfolio-change ${deltaClass}">
              <i class="fas ${deltaIcon}"></i>
              <span>${delta >= 0 ? '+' : ''}${delta.toFixed(2)} €</span>
              <span class="change-percent">(${delta >= 0 ? '+' : ''}${roi}%)</span>
            </div>
          </div>
          
          <!-- Grafico Mini Simulato -->
          <div class="portfolio-mini-chart">
            <div class="mini-chart-line ${deltaClass}"></div>
            <div class="mini-chart-dot ${deltaClass}"></div>
          </div>
          
          <!-- Metriche Finanziarie -->
          <div class="fintech-metrics">
            
            <!-- Prezzo Acquisto -->
            <div class="metric-card">
              <div class="metric-icon cost">
                <i class="fas fa-shopping-cart"></i>
              </div>
              <div class="metric-info">
                <span class="metric-label">Prezzo Acquisto</span>
                <span class="metric-value">${Number(article.PrezzoPagato || 0).toFixed(2)} €</span>
              </div>
            </div>
            
            <!-- Guadagno/Perdita -->
            <div class="metric-card">
              <div class="metric-icon ${deltaClass}">
                ${delta >= 0 ? '<i class="fas fa-chart-line"></i>' : ''}
              </div>
              <div class="metric-info">
                <span class="metric-label">${delta >= 0 ? 'Guadagno Potenziale' : 'Perdita Potenziale'}</span>
                <span class="metric-value ${deltaClass}">${delta >= 0 ? '+' : ''}${delta.toFixed(2)} €</span>
              </div>
              <div class="metric-badge ${deltaClass}">
                <i class="fas ${deltaIcon}"></i> ${delta >= 0 ? '+' : ''}${roi}%
              </div>
            </div>
            
            <!-- Rendimento -->
            <div class="metric-card">
              <div class="metric-icon roi">
                <i class="fas fa-percentage"></i>
              </div>
              <div class="metric-info">
                <span class="metric-label">Rendimento</span>
                <span class="metric-value ${deltaClass}">${delta >= 0 ? '+' : ''}${roi}%</span>
              </div>
            </div>
            
            ${article.prezzo_vendita ? `
            <!-- Prezzo Vendita -->
            <div class="metric-card highlight">
              <div class="metric-icon target">
                <i class="fas fa-bullseye"></i>
              </div>
              <div class="metric-info">
                <span class="metric-label">Prezzo Vendita</span>
                <span class="metric-value">${Number(article.prezzo_vendita).toFixed(2)} €</span>
              </div>
              <div class="metric-badge ${marginePotenziale >= 0 ? 'profit' : 'loss'}">
                <i class="fas fa-coins"></i> +${marginePercent}%
              </div>
            </div>
            
            <!-- Margine Netto -->
            <div class="metric-card">
              <div class="metric-icon margin">
                <i class="fas fa-hand-holding-usd"></i>
              </div>
              <div class="metric-info">
                <span class="metric-label">Margine Netto</span>
                <span class="metric-value profit">+${marginePotenziale.toFixed(2)} €</span>
              </div>
            </div>
            ` : ''}
            
          </div>
          
          <!-- Timestamp -->
          <div class="portfolio-timestamp">
            <i class="fas fa-clock"></i> 
            Aggiornato: ${new Date(article.updated_at || article.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
          
        </div>
        
        ${article.casa_gradazione ? `
        <!-- Sezione Gradazione -->
        <div class="expanded-box">
          <div class="expanded-box-title"><i class="fas fa-certificate"></i> CERTIFICAZIONE</div>
          <div class="grading-display">
            <div class="grading-house">
              <div class="grading-icon"><i class="fas fa-award"></i></div>
              <span class="grading-name">${article.casa_gradazione === 'Altra casa' ? article.altra_casa_gradazione : article.casa_gradazione}</span>
            </div>
            <div class="grading-score">
              <span class="score-value">${article.voto_gradazione || '-'}</span>
              <span class="score-label">VOTO</span>
            </div>
          </div>
        </div>
        ` : ''}
        
        ${article.Descrizione ? `
        <!-- Sezione Descrizione -->
        <div class="expanded-box">
          <div class="expanded-box-title"><i class="fas fa-align-left"></i> NOTE</div>
          <div class="expanded-box-content">${article.Descrizione}</div>
        </div>
        ` : ''}
        
        ${hasGallery ? `
        <!-- Galleria Foto -->
        <div class="expanded-box">
          <div class="expanded-box-title"><i class="fas fa-images"></i> GALLERIA</div>
          <div class="gallery-grid">
            <img src="${foto}" onclick="openArticleGallery(${article.id}, 0)" class="gallery-thumb">
            ${foto2 ? `<img src="${foto2}" onclick="openArticleGallery(${article.id}, 1)" class="gallery-thumb">` : ''}
            ${foto3 ? `<img src="${foto3}" onclick="openArticleGallery(${article.id}, 2)" class="gallery-thumb">` : ''}
            ${foto4 ? `<img src="${foto4}" onclick="openArticleGallery(${article.id}, 3)" class="gallery-thumb">` : ''}
          </div>
        </div>
        ` : ''}
        
        <!-- Azioni -->
        <div class="expanded-actions">
          <button class="action-btn btn-edit" onclick="apriModifica(${article.id})">
            <i class="fas fa-edit"></i> MODIFICA
          </button>
        </div>
      </div>
    </div>
  `;
}

function toggleArticleCard(articleId) {
  const card = document.getElementById(`card-${articleId}`);
  if (!card) return;
  
  const wasExpanded = card.classList.contains('expanded');
  
  // Chiudi tutte le altre card
  document.querySelectorAll('.article-card.expanded').forEach(c => {
    c.classList.remove('expanded');
  });
  
  // Toggle questa card
  if (!wasExpanded) {
    card.classList.add('expanded');
    // Scroll to card
    setTimeout(() => {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}

// ========== GALLERIA IMMAGINI CON NAVIGAZIONE ==========
function openArticleGallery(articleId, startIndex = 0) {
  const article = allArticles.find(a => a.id === articleId);
  if (!article) return;
  
  // Raccogli tutte le foto
  const images = [
    article.foto_principale || article.image_url,
    article.foto_2,
    article.foto_3,
    article.foto_4,
    article.foto_5,
    article.foto_6
  ].filter(img => img && img.trim());
  
  if (images.length === 0) return;
  
  // Usa NodoGalleria se disponibile, altrimenti fallback
  if (window.NodoGalleria) {
    NodoGalleria.open(images, startIndex);
  } else {
    openFullscreen(images[startIndex]);
  }
}

function openFullscreen(imageUrl) {
  // Fallback se NodoGalleria non è disponibile
  if (window.NodoGalleria) {
    NodoGalleria.open([imageUrl], 0);
    return;
  }
  
  const overlay = document.createElement('div');
  overlay.className = 'fullscreen-overlay';
  overlay.innerHTML = `
    <img src="${imageUrl}" class="fullscreen-image">
    <button class="fullscreen-close" onclick="this.parentElement.remove()">✕</button>
  `;
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  document.body.appendChild(overlay);
}

// ========== PAGINAZIONE ==========
function updatePagination() {
  const pagination = document.getElementById('pagination');
  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
  
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, filteredArticles.length);
  
  // Aggiorna ENTRAMBE le paginazioni (top e bottom)
  ['', 'Bottom'].forEach(suffix => {
    const pageStartEl = document.getElementById('pageStart' + suffix);
    const pageEndEl = document.getElementById('pageEnd' + suffix);
    const totalItemsEl = document.getElementById('totalItems' + suffix);
    const prevBtn = document.getElementById('prevBtn' + suffix);
    const nextBtn = document.getElementById('nextBtn' + suffix);
    
    if (pageStartEl) pageStartEl.textContent = filteredArticles.length > 0 ? start : 0;
    if (pageEndEl) pageEndEl.textContent = end;
    if (totalItemsEl) totalItemsEl.textContent = filteredArticles.length;
    
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
  });
  
  // Mostra/nascondi paginazione bottom solo se più di una pagina
  const paginationBottom = document.getElementById('paginationBottom');
  if (paginationBottom) {
    paginationBottom.style.display = totalPages > 1 ? 'flex' : 'none';
  }
  
  // Aggiorna contatore vista
  const viewCount = document.getElementById('viewCount');
  if (viewCount) {
    viewCount.textContent = filteredArticles.length;
  }
  
  // Pagination classica (se esiste)
  if (!pagination) return;
  
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  
  let html = '';
  
  // Prev
  html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
    <i class="fas fa-chevron-left"></i>
  </button>`;
  
  // Pages
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<span class="page-dots">...</span>`;
    }
  }
  
  // Next
  html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
    <i class="fas fa-chevron-right"></i>
  </button>`;
  
  pagination.innerHTML = html;
}

function goToPage(page) {
  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
  if (page < 1 || page > totalPages) return;
  
  currentPage = page;
  renderArticles();
  updatePagination();
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 🔥 Funzioni paginazione
function nextPage() {
  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
  if (currentPage < totalPages) {
    goToPage(currentPage + 1);
  }
}

function previousPage() {
  if (currentPage > 1) {
    goToPage(currentPage - 1);
  }
}

// ========== FILTRI ==========

// Toggle apertura/chiusura filtri
function toggleFilters() {
  const body = document.getElementById('filterBody');
  const btn = document.querySelector('.filter-expand-btn');
  
  if (body) body.classList.toggle('open');
  if (btn) btn.classList.toggle('active');
}

// Conta filtri attivi e mostra badge
function updateFilterBadge() {
  let count = 0;
  
  if (document.getElementById('fCategoria')?.value) count++;
  if (document.getElementById('fCasaGradazione')?.value) count++;
  if (document.getElementById('fVotoGradazione')?.value) count++;
  if (parseInt(document.getElementById('fValoreMin')?.value) > 0) count++;
  if (parseInt(document.getElementById('fValoreMax')?.value) < 10000) count++;
  if (document.getElementById('fStato')?.value) count++;
  if (document.getElementById('fCondizione')?.value) count++;
  if (document.getElementById('fEspansione')?.value) count++;
  if (document.getElementById('fLingua')?.value) count++;
  if (!document.getElementById('btnPresenti')?.classList.contains('active')) count++;
  if (!document.getElementById('btnAssenti')?.classList.contains('active')) count++;
  if (document.getElementById('btnVetrina')?.classList.contains('active')) count++;
  if (!document.getElementById('btnProfit')?.classList.contains('active')) count++;
  if (!document.getElementById('btnLoss')?.classList.contains('active')) count++;
  
  const badge = document.getElementById('filterBadge');
  if (badge) {
    badge.textContent = count > 0 ? count : '';
  }
}

// Slider doppio valore
function updateRangeSlider() {
  const minInput = document.getElementById('fValoreMin');
  const maxInput = document.getElementById('fValoreMax');
  const valueDisplay = document.getElementById('rangeValue');
  const progress = document.getElementById('rangeProgress');
  
  if (!minInput || !maxInput) return;
  
  let minVal = parseInt(minInput.value);
  let maxVal = parseInt(maxInput.value);
  
  // Non permettere che si incrocino
  if (minVal > maxVal - 100) {
    if (this === minInput) {
      minInput.value = maxVal - 100;
      minVal = maxVal - 100;
    } else {
      maxInput.value = minVal + 100;
      maxVal = minVal + 100;
    }
  }
  
  // Aggiorna display
  if (valueDisplay) {
    valueDisplay.textContent = `${minVal}€ - ${maxVal}€`;
  }
  
  // Aggiorna barra progresso
  if (progress) {
    const percent1 = (minVal / 10000) * 100;
    const percent2 = (maxVal / 10000) * 100;
    progress.style.left = percent1 + '%';
    progress.style.width = (percent2 - percent1) + '%';
  }
  
  applicaFiltri();
}

// Gestisce mostra/nascondi filtri carte gradate
function gestisciFiltroCategoria() {
  const categoria = document.getElementById('fCategoria')?.value || '';
  const gradedSection = document.getElementById('filterGradedSection');
  
  if (gradedSection) {
    gradedSection.style.display = categoria === 'Carte gradate' ? 'block' : 'none';
  }
  
  applicaFiltri();
}

// Toggle pulsante filtro
function toggleFilterBtn(btnId) {
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.classList.toggle('active');
    applicaFiltri();
  }
}

// Applica tutti i filtri
function applicaFiltri() {
  const nome = document.getElementById('fNome')?.value?.toLowerCase() || '';
  const categoria = document.getElementById('fCategoria')?.value || '';
  const casaGradazione = document.getElementById('fCasaGradazione')?.value || '';
  const votoGradazione = parseFloat(document.getElementById('fVotoGradazione')?.value) || 0;
  const valoreMin = parseFloat(document.getElementById('fValoreMin')?.value) || 0;
  const valoreMax = parseFloat(document.getElementById('fValoreMax')?.value) || 10000;
  const statoMin = parseInt(document.getElementById('fStato')?.value) || 0;
  const condizione = document.getElementById('fCondizione')?.value || '';
  const espansione = document.getElementById('fEspansione')?.value?.toLowerCase() || '';
  const lingua = document.getElementById('fLingua')?.value || '';
  
  const mostraPresenti = document.getElementById('btnPresenti')?.classList.contains('active') ?? true;
  const mostraAssenti = document.getElementById('btnAssenti')?.classList.contains('active') ?? true;
  const soloVetrina = document.getElementById('btnVetrina')?.classList.contains('active') ?? false;
  const mostraGuadagno = document.getElementById('btnProfit')?.classList.contains('active') ?? true;
  const mostraPerdita = document.getElementById('btnLoss')?.classList.contains('active') ?? true;
  
  filteredArticles = allArticles.filter(article => {
    // Filtro nome
    const matchNome = !nome || 
      (article.Nome && article.Nome.toLowerCase().includes(nome)) ||
      (article.Descrizione && article.Descrizione.toLowerCase().includes(nome));
    
    // Filtro categoria
    const matchCategoria = !categoria || article.Categoria === categoria;
    
    // Filtro carte gradate
    let matchGraded = true;
    if (categoria === 'Carte gradate') {
      if (casaGradazione) {
        matchGraded = article.casa_gradazione === casaGradazione;
      }
      if (matchGraded && votoGradazione > 0) {
        matchGraded = (article.voto_gradazione || 0) >= votoGradazione;
      }
    }
    
    // Filtro valore
    const valore = Number(article.ValoreAttuale) || 0;
    const matchValore = valore >= valoreMin && valore <= valoreMax;
    
    // Filtro stato/valutazione
    const stato = Number(article.ValutazioneStato) || 0;
    const matchStato = !statoMin || stato >= statoMin;
    
    // Filtro condizione
    const matchCondizione = !condizione || article.condizione === condizione;
    
    // Filtro espansione
    const matchEspansione = !espansione || 
      (article.espansione && article.espansione.toLowerCase().includes(espansione));
    
    // Filtro lingua
    const matchLingua = !lingua || article.lingua === lingua;
    
    // Filtro presenza
    const isPresente = article.Presente === true;
    const matchPresenza = (mostraPresenti && isPresente) || (mostraAssenti && !isPresente);
    
    // Filtro vetrina
    const matchVetrina = !soloVetrina || article.in_vetrina === true;
    
    // Filtro guadagno/perdita
    const delta = (Number(article.ValoreAttuale) || 0) - (Number(article.PrezzoPagato) || 0);
    const isGuadagno = delta >= 0;
    const matchDelta = (mostraGuadagno && isGuadagno) || (mostraPerdita && !isGuadagno);
    
    return matchNome && matchCategoria && matchGraded && matchValore && matchStato && matchCondizione && matchEspansione && matchLingua && matchPresenza && matchVetrina && matchDelta;
  });
  
  currentPage = 1;
  renderArticles();
  updatePagination();
  updateFilterBadge();
}

// Reset tutti i filtri
function resetFiltri() {
  // Reset campi
  const fNome = document.getElementById('fNome');
  const fCategoria = document.getElementById('fCategoria');
  const fCasaGradazione = document.getElementById('fCasaGradazione');
  const fVotoGradazione = document.getElementById('fVotoGradazione');
  const fValoreMin = document.getElementById('fValoreMin');
  const fValoreMax = document.getElementById('fValoreMax');
  const fStato = document.getElementById('fStato');
  const fCondizione = document.getElementById('fCondizione');
  const fEspansione = document.getElementById('fEspansione');
  const fLingua = document.getElementById('fLingua');
  const filterGradedSection = document.getElementById('filterGradedSection');
  
  if (fNome) fNome.value = '';
  if (fCategoria) fCategoria.value = '';
  if (fCasaGradazione) fCasaGradazione.value = '';
  if (fVotoGradazione) fVotoGradazione.value = '';
  if (fValoreMin) fValoreMin.value = 0;
  if (fValoreMax) fValoreMax.value = 10000;
  if (fStato) fStato.value = '';
  if (fCondizione) fCondizione.value = '';
  if (fEspansione) fEspansione.value = '';
  if (fLingua) fLingua.value = '';
  if (filterGradedSection) filterGradedSection.style.display = 'none';
  
  // Reset slider display
  const valueDisplay = document.getElementById('rangeValue');
  const progress = document.getElementById('rangeProgress');
  if (valueDisplay) valueDisplay.textContent = '0€ - 10000€';
  if (progress) {
    progress.style.left = '0%';
    progress.style.width = '100%';
  }
  
  // Reset toggle buttons
  ['btnPresenti', 'btnAssenti', 'btnProfit', 'btnLoss'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  });
  
  const btnVetrina = document.getElementById('btnVetrina');
  if (btnVetrina) btnVetrina.classList.remove('active');
  
  // Reset articoli
  filteredArticles = [...allArticles];
  currentPage = 1;
  renderArticles();
  updatePagination();
  updateFilterBadge();
}

// Funzione legacy
function cercaArticoli() {
  applicaFiltri();
}

// ========== MODAL AGGIUNGI ==========
function openAddModal() {
  const modal = document.getElementById('modalAdd');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeAddModal() {
  const modal = document.getElementById('modalAdd');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Reset form
    const form = document.getElementById('formAdd');
    if (form) form.reset();
    
    // 🔥 Reset nuovo sistema immagini
    resetAddImages();
    
    // Reset campi gradazione
    gestisciCarteGradate('', 'Add');
  }
}

// ========== SISTEMA UPLOAD IMMAGINI ==========
let addImages = [];
let editImages = [];
let editExistingUrls = [];
const MAX_IMAGES = 6;

// Funzione chiamata quando si selezionano file - FORM AGGIUNGI
function onAddImageSelect(input) {
  const files = Array.from(input.files);
  console.log('📸 ADD - File selezionati:', files.length);
  
  if (addImages.length + files.length > MAX_IMAGES) {
    alert(`Massimo ${MAX_IMAGES} foto! Ne hai già ${addImages.length}`);
    input.value = '';
    return;
  }
  
  files.forEach(file => {
    if (file.type.startsWith('image/')) {
      addImages.push(file);
      console.log('✅ Aggiunta:', file.name, 'Totale:', addImages.length);
    }
  });
  
  input.value = '';
  renderAddImages();
}

// Funzione chiamata quando si selezionano file - FORM MODIFICA
function onEditImageSelect(input) {
  const files = Array.from(input.files);
  const existingCount = editExistingUrls.filter(u => u).length;
  console.log('📸 EDIT - File selezionati:', files.length, 'Esistenti:', existingCount);
  
  if (existingCount + editImages.length + files.length > MAX_IMAGES) {
    alert(`Massimo ${MAX_IMAGES} foto!`);
    input.value = '';
    return;
  }
  
  files.forEach(file => {
    if (file.type.startsWith('image/')) {
      editImages.push(file);
    }
  });
  
  input.value = '';
  renderEditImages();
}

// Render griglia ADD
function renderAddImages() {
  const container = document.getElementById('addImagesContainer');
  if (!container) return;
  
  let html = '<div class="img-grid">';
  
  addImages.forEach((file, i) => {
    html += `
      <div class="img-item">
        <img src="${URL.createObjectURL(file)}">
        <button type="button" class="img-remove" onclick="removeAddImage(${i})">×</button>
        <span class="img-num">${i + 1}</span>
      </div>
    `;
  });
  
  if (addImages.length < MAX_IMAGES) {
    html += `
      <label class="img-add" for="addImageInput">
        <i class="fas fa-plus"></i>
        <span>${addImages.length}/${MAX_IMAGES}</span>
      </label>
    `;
  }
  
  html += '</div>';
  if (addImages.length === 0) {
    html += '<p class="img-hint">📷 La prima foto sarà quella principale</p>';
  }
  
  container.innerHTML = html;
}

// Render griglia EDIT
function renderEditImages() {
  const container = document.getElementById('editImagesContainer');
  if (!container) return;
  
  const existingCount = editExistingUrls.filter(u => u).length;
  const totalCount = existingCount + editImages.length;
  
  let html = '<div class="img-grid">';
  let num = 1;
  
  // URL esistenti
  editExistingUrls.forEach((url, i) => {
    if (url) {
      html += `
        <div class="img-item">
          <img src="${url}">
          <button type="button" class="img-remove" onclick="removeExistingImage(${i})">×</button>
          <span class="img-num">${num++}</span>
        </div>
      `;
    }
  });
  
  // Nuovi file
  editImages.forEach((file, i) => {
    html += `
      <div class="img-item">
        <img src="${URL.createObjectURL(file)}">
        <button type="button" class="img-remove" onclick="removeEditImage(${i})">×</button>
        <span class="img-num">${num++}</span>
      </div>
    `;
  });
  
  if (totalCount < MAX_IMAGES) {
    html += `
      <label class="img-add" for="editImageInput">
        <i class="fas fa-plus"></i>
        <span>${totalCount}/${MAX_IMAGES}</span>
      </label>
    `;
  }
  
  html += '</div>';
  container.innerHTML = html;
}

// Rimuovi immagini
function removeAddImage(index) {
  addImages.splice(index, 1);
  renderAddImages();
}

function removeEditImage(index) {
  editImages.splice(index, 1);
  renderEditImages();
}

function removeExistingImage(index) {
  editExistingUrls[index] = null;
  renderEditImages();
}

// Reset
function resetAddImages() {
  addImages = [];
  renderAddImages();
}

function resetEditImages() {
  editImages = [];
  editExistingUrls = [];
  renderEditImages();
}

// Carica immagini esistenti per modifica
function loadExistingImages(article) {
  editImages = [];
  editExistingUrls = [
    article.foto_principale || article.image_url || null,
    article.foto_2 || null,
    article.foto_3 || null,
    article.foto_4 || null,
    article.foto_5 || null,
    article.foto_6 || null
  ];
  renderEditImages();
}

async function uploadImage(file) {
  if (!file) return null;
  
  const user = getCurrentUser();
  if (!user) return null;
  
  const fileName = `${user.id}/${Date.now()}_${file.name}`;
  
  const { data, error } = await supabaseClient.storage
    .from('product-images')
    .upload(fileName, file);
  
  if (error) {
    console.error('❌ Errore upload:', error);
    return null;
  }
  
  const { data: urlData } = supabaseClient.storage
    .from('product-images')
    .getPublicUrl(fileName);
  
  return urlData?.publicUrl || null;
}

async function aggiungiArticolo(event) {
  event.preventDefault();
  
  const user = getCurrentUser();
  if (!user || !user.id) {
    alert('❌ Devi essere loggato per aggiungere articoli');
    return;
  }
  
  // 🔥 Mostra loader operazione
  if (window.NodoLoader) {
    NodoLoader.showOperation('Salvataggio articolo...');
  }
  
  const form = event.target;
  const formData = new FormData(form);
  
  const msg = document.getElementById('addMsg');
  msg.className = 'msg';
  msg.textContent = '⏳ Caricamento...';
  msg.style.display = 'block';
  
  // 🔥 DEBUG: Verifica array immagini
  console.log('🖼️ addImages al momento del salvataggio:', addImages.length, addImages);
  
  // 🔥 NUOVO SISTEMA: Upload immagini dall'array addImages
  const uploadedUrls = [];
  
  if (addImages.length === 0) {
    console.log('⚠️ Nessuna immagine da caricare');
  }
  
  for (let i = 0; i < addImages.length; i++) {
    msg.textContent = `⏳ Caricamento foto ${i + 1}/${addImages.length}...`;
    console.log(`📤 Upload foto ${i + 1}:`, addImages[i].name);
    const url = await uploadImage(addImages[i]);
    console.log(`📥 URL ottenuto:`, url);
    if (url) {
      uploadedUrls.push(url);
    }
  }
  
  console.log('✅ URL caricati:', uploadedUrls);
  
  const valore = parseFloat(formData.get('ValoreAttuale')) || 0;
  const prezzo = parseFloat(formData.get('PrezzoPagato')) || 0;
  
  const inVetrina = document.getElementById('inVetrinaAdd')?.checked || false;
  const prezzoVendita = inVetrina ? parseFloat(document.getElementById('prezzoVenditaAdd')?.value) || null : null;
  
  const categoria = formData.get('Categoria');
  
  // Campi gradazione
  let casaGradazione = null;
  let altraCasaGradazione = null;
  let votoGradazione = null;
  
  if (categoria === 'Carte gradate') {
    const casaEl = document.getElementById('casaGradazioneAdd');
    const altraCasaEl = document.getElementById('altraCasaGradazioneAdd');
    const votoEl = document.getElementById('votoGradazioneAdd');
    
    if (casaEl) casaGradazione = casaEl.value || null;
    if (casaGradazione === 'Altra casa' && altraCasaEl) altraCasaGradazione = altraCasaEl.value || null;
    if (votoEl) votoGradazione = parseFloat(votoEl.value) || null;
  }
  
  const articolo = {
    user_id: user.id,
    Nome: formData.get('Nome'),
    Descrizione: formData.get('Descrizione') || null,
    Categoria: categoria || null,
    espansione: document.getElementById('espansioneAdd')?.value || null,
    lingua: document.getElementById('linguaAdd')?.value || null,
    condizione: document.getElementById('condizioneAdd')?.value || null,
    ValoreAttuale: valore,
    PrezzoPagato: prezzo,
    Delta: valore - prezzo,
    ValutazioneStato: formData.get('ValutazioneStato') ? parseInt(formData.get('ValutazioneStato')) : null,
    Presente: formData.get('Presente') === 'on',
    image_url: uploadedUrls[0] || null,
    foto_principale: uploadedUrls[0] || null,
    foto_2: uploadedUrls[1] || null,
    foto_3: uploadedUrls[2] || null,
    foto_4: uploadedUrls[3] || null,
    foto_5: uploadedUrls[4] || null,
    foto_6: uploadedUrls[5] || null,
    in_vetrina: inVetrina,
    prezzo_vendita: prezzoVendita,
    casa_gradazione: casaGradazione,
    altra_casa_gradazione: altraCasaGradazione,
    voto_gradazione: votoGradazione
  };
  
  console.log('📝 Articolo da salvare:', articolo);
  
  const { error } = await supabaseClient.from('Articoli').insert([articolo]);
  
  if (error) {
    msg.className = 'msg error';
    msg.textContent = '❌ ERRORE: ' + error.message;
    console.error('❌ Errore salvataggio:', error);
    
    // 🔥 Nascondi loader su errore
    if (window.NodoLoader) NodoLoader.hideOperation();
  } else {
    msg.className = 'msg success';
    msg.textContent = '✅ ARTICOLO AGGIUNTO!';
    
    // Reset array immagini
    addImages = [];
    
    setTimeout(() => {
      closeAddModal();
      // 🔥 Nascondi loader DOPO chiusura modal
      if (window.NodoLoader) NodoLoader.hideOperation();
      caricaArticoli();
    }, 1500);
  }
}

// ========== MODAL MODIFICA ==========
async function apriModifica(articleId) {
  console.log('🔧 apriModifica chiamata con ID:', articleId, 'tipo:', typeof articleId);
  console.log('🔧 allArticles contiene', allArticles.length, 'articoli');
  
  const article = allArticles.find(a => a.id == articleId); // == invece di === per confronto flessibile
  if (!article) {
    console.error('❌ Articolo non trovato in allArticles per ID:', articleId);
    return;
  }
  
  console.log('📝 Apertura modifica articolo:', article);
  
  const modal = document.getElementById('modalEdit');
  if (!modal) return;
  
  // Popola i campi
  document.getElementById('editId').value = article.id;
  document.getElementById('editNome').value = article.Nome || '';
  document.getElementById('editDescrizione').value = article.Descrizione || '';
  document.getElementById('editCategoria').value = article.Categoria || '';
  document.getElementById('editEspansione').value = article.espansione || '';
  document.getElementById('editLingua').value = article.lingua || '';
  document.getElementById('editCondizione').value = article.condizione || '';
  document.getElementById('editValoreAttuale').value = article.ValoreAttuale || 0;
  document.getElementById('editPrezzoPagato').value = article.PrezzoPagato || 0;
  document.getElementById('editDelta').value = ((article.ValoreAttuale || 0) - (article.PrezzoPagato || 0)).toFixed(2) + ' €';
  document.getElementById('editStato').value = article.ValutazioneStato || '';
  document.getElementById('editPresente').checked = article.Presente || false;
  document.getElementById('editInVetrina').checked = article.in_vetrina || false;
  document.getElementById('editPrezzoVendita').value = article.prezzo_vendita || '';
  
  console.log('💰 Prezzi caricati - Valore:', article.ValoreAttuale, 'Pagato:', article.PrezzoPagato, 'Vendita:', article.prezzo_vendita);
  
  // Mostra/nascondi prezzo vendita
  const prezzoGroup = document.getElementById('prezzoVenditaGroupEdit');
  if (prezzoGroup) {
    prezzoGroup.style.display = article.in_vetrina ? 'block' : 'none';
  }
  
  // Gestisci carte gradate
  gestisciCarteGradate(article.Categoria || '', 'Edit');
  
  if (article.Categoria === 'Carte gradate') {
    console.log('🏆 Carte gradate - Casa:', article.casa_gradazione, 'Voto:', article.voto_gradazione);
    
    // Aspetta un attimo che i campi siano visibili
    setTimeout(() => {
      const casaSelect = document.getElementById('casaGradazioneEdit');
      const altraCasaInput = document.getElementById('altraCasaGradazioneEdit');
      const votoInput = document.getElementById('votoGradazioneEdit');
      
      if (casaSelect) casaSelect.value = article.casa_gradazione || '';
      gestisciAltraCasa(article.casa_gradazione || '', 'Edit');
      if (altraCasaInput) altraCasaInput.value = article.altra_casa_gradazione || '';
      if (votoInput) votoInput.value = article.voto_gradazione || '';
    }, 50);
  }
  
  // 🔥 NUOVO SISTEMA: Carica immagini esistenti
  loadExistingImages(article);
  
  // Reset msg
  const msg = document.getElementById('editMsg');
  if (msg) {
    msg.style.display = 'none';
    msg.textContent = '';
  }
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeEditModal() {
  const modal = document.getElementById('modalEdit');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // 🔥 Reset immagini
    resetEditImages();
  }
}

function calcolaDeltaEdit() {
  const valore = parseFloat(document.getElementById('editValoreAttuale')?.value) || 0;
  const prezzo = parseFloat(document.getElementById('editPrezzoPagato')?.value) || 0;
  const delta = valore - prezzo;
  
  const deltaInput = document.getElementById('editDelta');
  if (deltaInput) {
    deltaInput.value = delta.toFixed(2) + ' €';
  }
}

async function salvaModifica(event) {
  event.preventDefault();
  
  // 🔥 Mostra loader operazione
  if (window.NodoLoader) {
    NodoLoader.showOperation('Salvataggio modifiche...');
  }
  
  const id = document.getElementById('editId').value;
  const formData = new FormData(event.target);
  
  const msg = document.getElementById('editMsg');
  msg.className = 'msg';
  msg.textContent = '⏳ Salvataggio...';
  msg.style.display = 'block';
  
  // 🔥 NUOVO SISTEMA: Combina URL esistenti + nuove immagini
  const finalUrls = [];
  
  // Prima aggiungi gli URL esistenti (non null)
  for (const url of editExistingUrls) {
    if (url) finalUrls.push(url);
  }
  
  // Poi carica e aggiungi le nuove immagini
  for (let i = 0; i < editImages.length; i++) {
    msg.textContent = `⏳ Caricamento foto ${i + 1}/${editImages.length}...`;
    const url = await uploadImage(editImages[i]);
    if (url) finalUrls.push(url);
  }
  
  const valore = parseFloat(document.getElementById('editValoreAttuale').value) || 0;
  const prezzo = parseFloat(document.getElementById('editPrezzoPagato').value) || 0;
  
  const inVetrina = document.getElementById('editInVetrina')?.checked || false;
  const prezzoVendita = inVetrina ? parseFloat(document.getElementById('editPrezzoVendita')?.value) || null : null;
  
  const categoria = document.getElementById('editCategoria').value;
  
  // Campi gradazione
  let casaGradazione = null;
  let altraCasaGradazione = null;
  let votoGradazione = null;
  
  if (categoria === 'Carte gradate') {
    const casaEl = document.getElementById('casaGradazioneEdit');
    const altraCasaEl = document.getElementById('altraCasaGradazioneEdit');
    const votoEl = document.getElementById('votoGradazioneEdit');
    
    if (casaEl) casaGradazione = casaEl.value || null;
    if (casaGradazione === 'Altra casa' && altraCasaEl) altraCasaGradazione = altraCasaEl.value || null;
    if (votoEl) votoGradazione = parseFloat(votoEl.value) || null;
  }

  const articolo = {
    Nome: formData.get('Nome'),
    Descrizione: formData.get('Descrizione') || null,
    Categoria: categoria || null,
    espansione: document.getElementById('editEspansione')?.value || null,
    lingua: document.getElementById('editLingua')?.value || null,
    condizione: document.getElementById('editCondizione')?.value || null,
    ValoreAttuale: valore,
    PrezzoPagato: prezzo,
    Delta: valore - prezzo,
    ValutazioneStato: formData.get('ValutazioneStato') ? parseInt(formData.get('ValutazioneStato')) : null,
    Presente: formData.get('Presente') === 'on',
    image_url: finalUrls[0] || null,
    foto_principale: finalUrls[0] || null,
    foto_2: finalUrls[1] || null,
    foto_3: finalUrls[2] || null,
    foto_4: finalUrls[3] || null,
    foto_5: finalUrls[4] || null,
    foto_6: finalUrls[5] || null,
    in_vetrina: inVetrina,
    prezzo_vendita: prezzoVendita,
    casa_gradazione: casaGradazione,
    altra_casa_gradazione: altraCasaGradazione,
    voto_gradazione: votoGradazione
  };

  const { error } = await supabaseClient.from('Articoli').update(articolo).eq('id', id);

  if (error) {
    msg.className = 'msg error';
    msg.textContent = '❌ ERRORE: ' + error.message;
    msg.style.display = 'block';
    
    // 🔥 Nascondi loader su errore
    if (window.NodoLoader) NodoLoader.hideOperation();
  } else {
    msg.className = 'msg success';
    msg.textContent = '✅ SALVATO!';
    msg.style.display = 'block';
    
    setTimeout(() => {
      closeEditModal();
      // 🔥 Nascondi loader DOPO chiusura modal
      if (window.NodoLoader) NodoLoader.hideOperation();
      caricaArticoli();
    }, 1500);
  }
}

async function eliminaArticolo() {
  const id = document.getElementById('editId').value;
  const nome = document.getElementById('editNome').value;
  if (!confirm(`⚠️ ELIMINARE "${nome}"?`)) return;

  // 🔥 Mostra loader
  if (window.NodoLoader) NodoLoader.showOperation('Eliminazione...');

  const { error } = await supabaseClient.from('Articoli').delete().eq('id', id);
  const msg = document.getElementById('editMsg');

  if (error) {
    msg.className = 'msg error';
    msg.textContent = '❌ ERRORE: ' + error.message;
    msg.style.display = 'block';
    // 🔥 Nascondi loader su errore
    if (window.NodoLoader) NodoLoader.hideOperation();
  } else {
    msg.className = 'msg success';
    msg.textContent = '✅ ELIMINATO!';
    msg.style.display = 'block';
    setTimeout(() => {
      closeEditModal();
      // 🔥 Nascondi loader DOPO chiusura modal
      if (window.NodoLoader) NodoLoader.hideOperation();
      caricaArticoli();
    }, 1500);
  }
}

// ========== GRAFICI ==========
async function apriGrafico(tipo, colorTheme) {
  const user = getCurrentUser();
  
  if (!user || !user.id) {
    alert('⚠️ Devi essere loggato per vedere i grafici');
    return;
  }
  
  const { data, error } = await supabaseClient
    .from("Articoli")
    .select("*")
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });
  
  if (error || !data || data.length === 0) {
    alert('⚠️ Nessun dato disponibile');
    return;
  }

  window.scrollTo({ top: 0, behavior: 'instant' });
  document.body.style.overflow = 'hidden';

  currentChartColor = colorTheme;
  
  const modal = document.getElementById('modalGraph');
  modal.scrollTop = 0;
  modal.classList.remove('closing');
  modal.classList.add('active');

  const modalContent = modal.querySelector('.modal-graph-content');
  const modalTitle = document.getElementById('graphTitle');
  
  const colors = {
    yellow: { border: '#fbbf24', gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' },
    green: { border: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
    orange: { border: '#f97316', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' },
    blue: { border: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }
  };
  
  modalContent.style.borderColor = colors[colorTheme].border;
  modalTitle.style.background = colors[colorTheme].gradient;
  modalTitle.style.webkitBackgroundClip = 'text';
  modalTitle.style.webkitTextFillColor = 'transparent';
  modalTitle.style.backgroundClip = 'text';

  if (currentChart) {
    currentChart.destroy();
  }

  const ctx = document.getElementById('chartCanvas').getContext('2d');
  let chartConfig;

  const chartColors = {
    yellow: { main: '#fbbf24', light: 'rgba(251, 191, 36, 0.2)' },
    green: { main: '#10b981', light: 'rgba(16, 185, 129, 0.2)' },
    orange: { main: '#f97316', light: 'rgba(249, 115, 22, 0.2)' },
    blue: { main: '#3b82f6', light: 'rgba(59, 130, 246, 0.2)' }
  };

  switch(tipo) {
    case 'totale':
      chartConfig = {
        type: 'line',
        data: {
          labels: data.map(r => new Date(r.created_at).toLocaleDateString('it-IT')),
          datasets: [{
            label: '📦 Numero Articoli',
            data: data.map((r, i) => i + 1),
            borderColor: chartColors[colorTheme].main,
            backgroundColor: chartColors[colorTheme].light,
            fill: true,
            tension: 0.4,
            borderWidth: 3
          }]
        }
      };
      modalTitle.innerHTML = '<i class="fas fa-layer-group"></i> CRESCITA COLLEZIONE';
      break;

    case 'valore':
      let cumVal = 0;
      chartConfig = {
        type: 'line',
        data: {
          labels: data.map(r => new Date(r.created_at).toLocaleDateString('it-IT')),
          datasets: [{
            label: '💎 Valore Totale (€)',
            data: data.map(r => cumVal += Number(r.ValoreAttuale || 0)),
            borderColor: chartColors[colorTheme].main,
            backgroundColor: chartColors[colorTheme].light,
            fill: true,
            tension: 0.4,
            borderWidth: 3
          }]
        }
      };
      modalTitle.innerHTML = '<i class="fas fa-gem"></i> VALORE NEL TEMPO';
      break;

    case 'spesa':
      let cumSpe = 0;
      chartConfig = {
        type: 'line',
        data: {
          labels: data.map(r => new Date(r.created_at).toLocaleDateString('it-IT')),
          datasets: [{
            label: '💳 Spesa Totale (€)',
            data: data.map(r => cumSpe += Number(r.PrezzoPagato || 0)),
            borderColor: chartColors[colorTheme].main,
            backgroundColor: chartColors[colorTheme].light,
            fill: true,
            tension: 0.4,
            borderWidth: 3
          }]
        }
      };
      modalTitle.innerHTML = '<i class="fas fa-wallet"></i> INVESTIMENTO';
      break;

    case 'performance':
      const values = data.map(r => Number(r.ValoreAttuale || 0) - Number(r.PrezzoPagato || 0));
      chartConfig = {
        type: 'bar',
        data: {
          labels: data.map(r => r.Nome),
          datasets: [{
            label: '📊 Guadagno/Perdita (€)',
            data: values,
            backgroundColor: values.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'),
            borderColor: values.map(v => v >= 0 ? '#10b981' : '#ef4444'),
            borderWidth: 2
          }]
        }
      };
      modalTitle.innerHTML = '<i class="fas fa-rocket"></i> PERFORMANCE';
      break;
  }

  currentChart = new Chart(ctx, {
    type: chartConfig.type,
    data: chartConfig.data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#e5e7eb',
            font: { size: 14, weight: 'bold' }
          }
        }
      },
      scales: chartConfig.type !== 'doughnut' ? {
        x: {
          ticks: { color: '#9ca3af' },
          grid: { color: '#2a2a2a' }
        },
        y: {
          ticks: { color: '#9ca3af' },
          grid: { color: '#2a2a2a' }
        }
      } : {}
    }
  });
}

function closeGraphModal() {
  const modal = document.getElementById('modalGraph');
  if (modal) {
    modal.classList.add('closing');
    setTimeout(() => {
      modal.classList.remove('active', 'closing');
      document.body.style.overflow = '';
    }, 300);
  }
  
  // 🔥 FIX: Rimuovi expanded da tutti i cruscotti
  document.querySelectorAll('.stat-card').forEach(card => {
    card.classList.remove('expanded');
  });
}

// Chiusura modals al click esterno
document.addEventListener('click', (e) => {
  if (e.target.id === 'modalAdd') closeAddModal();
  if (e.target.id === 'modalEdit') closeEditModal();
  if (e.target.id === 'modalGraph') closeGraphModal();
});
