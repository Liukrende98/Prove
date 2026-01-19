// ========================================
// DETTAGLIO ARTICOLO - OTTIMIZZATO MOBILE
// ========================================

var currentArticolo = null;
var currentPhotoIndex = 0;
var allPhotos = [];

// Ottieni ID utente corrente
function getCurrentUserId() {
  return localStorage.getItem('nodo_user_id') || null;
}

// Apri modal modifica articolo
function goToModifica() {
  if (!currentArticolo) return;
  
  // Apri direttamente il modal di modifica
  if (typeof apriModifica === 'function') {
    apriModifica(currentArticolo.id);
  } else {
    console.error('❌ apriModifica non disponibile');
    alert('Errore: modulo modifica non caricato');
  }
}

// Carica articolo
async function loadArticoloDettaglio() {
  const urlParams = new URLSearchParams(window.location.search);
  const articoloId = urlParams.get('id');
  
  if (!articoloId) {
    showError('ID articolo mancante');
    return;
  }
  
  // Mostra loader
  if (window.NodoLoader) NodoLoader.show('Caricamento articolo...');
  
  try {
    // Carica articolo con dati utente
    const { data: articolo, error } = await supabaseClient
      .from('Articoli')
      .select(`
        *,
        Utenti (
          id,
          username,
          email,
          citta
        )
      `)
      .eq('id', articoloId)
      .single();
    
    if (error) throw error;
    
    if (!articolo) {
      if (window.NodoLoader) NodoLoader.hide();
      showError('Articolo non trovato');
      return;
    }
    
    currentArticolo = articolo;
    console.log('📦 Articolo caricato:', articolo);
    
    // Renderizza articolo
    renderArticolo(articolo);
    
    // Nascondi loading, mostra contenuto
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('detailContent').style.display = 'block';
    document.getElementById('detailFooter').style.display = 'block';
    
    // Nascondi loader
    if (window.NodoLoader) NodoLoader.hide();
    
  } catch (error) {
    console.error('❌ Errore caricamento articolo:', error);
    if (window.NodoLoader) NodoLoader.hide();
    showError(error.message);
  }
}

// Renderizza articolo
function renderArticolo(articolo) {
  // GALLERIA FOTO - usa i nomi colonne corretti, rimuovi duplicati
  var fotoArray = [
    articolo.foto_principale,
    articolo.image_url,
    articolo.foto_2,
    articolo.foto_3,
    articolo.foto_4,
    articolo.foto_5,
    articolo.foto_6
  ].filter(function(f) { return f !== null && f !== '' && f !== undefined; });
  
  // Rimuovi duplicati
  allPhotos = [];
  fotoArray.forEach(function(foto) {
    if (allPhotos.indexOf(foto) === -1) {
      allPhotos.push(foto);
    }
  });
  
  renderPhotoGallery();
  
  // DISPONIBILITÀ - NASCONDI IL BANNER
  const availabilityBanner = document.getElementById('availabilityBanner');
  if (availabilityBanner) {
    availabilityBanner.style.display = 'none';
  }
  
  // INFO PRINCIPALE
  document.getElementById('articleName').textContent = articolo.Nome || 'Articolo';
  
  const categoryEl = document.getElementById('articleCategory');
  if (articolo.Categoria) {
    categoryEl.textContent = articolo.Categoria;
    categoryEl.style.display = 'inline-block';
  } else {
    categoryEl.style.display = 'none';
  }
  
  document.getElementById('articlePrice').textContent = `${parseFloat(articolo.prezzo_vendita || 0).toFixed(2)}€`;
  
  // RATING
  const ratingEl = document.getElementById('articleRating');
  const rating = articolo.ValutazioneStato || 0;
  if (rating > 0) {
    ratingEl.innerHTML = `
      <i class="fas fa-star"></i>
      <div>
        <div class="rating-value">${rating}/10</div>
        <div class="rating-label">Valutazione</div>
      </div>
    `;
    ratingEl.style.display = 'flex';
  } else {
    ratingEl.style.display = 'none';
  }
  
  // DESCRIZIONE
  const descriptionCard = document.getElementById('descriptionCard');
  if (articolo.Descrizione && articolo.Descrizione.trim() !== '') {
    descriptionCard.innerHTML = `
      <h3 class="card-title">
        <i class="fas fa-align-left"></i> Descrizione
      </h3>
      <div class="description-content">${articolo.Descrizione}</div>
    `;
    descriptionCard.style.display = 'block';
  } else {
    descriptionCard.style.display = 'none';
  }
  
  // VENDITORE
  document.getElementById('sellerName').textContent = articolo.Utenti?.username || 'Utente';
  const locationEl = document.getElementById('sellerLocation');
  if (articolo.Utenti?.citta) {
    locationEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${articolo.Utenti.citta}`;
    locationEl.style.display = 'flex';
  } else {
    locationEl.style.display = 'none';
  }
  
  // DETTAGLI
  const detailsGrid = document.getElementById('detailsGrid');
  const details = [];
  const disponibile = articolo.Presente === true;
  
  // Categoria
  if (articolo.Categoria) {
    details.push({ icon: 'fa-tag', label: 'Categoria', value: articolo.Categoria });
  }
  
  // Gradazione (se carta gradata)
  if (articolo.Categoria === 'Carte gradate' && articolo.casa_gradazione && articolo.voto_gradazione) {
    details.push({ 
      icon: 'fa-award', 
      label: 'Gradazione', 
      value: articolo.casa_gradazione + ' ' + articolo.voto_gradazione,
      highlight: true
    });
  }
  
  // Set
  if (articolo.Set) {
    details.push({ icon: 'fa-layer-group', label: 'Set', value: articolo.Set });
  }
  
  // Espansione
  if (articolo.espansione) {
    details.push({ icon: 'fa-boxes-stacked', label: 'Espansione', value: articolo.espansione });
  }
  
  // Lingua con bandierina
  var linguaValue = articolo.lingua || articolo.Lingua;
  if (linguaValue) {
    var flagMap = {
      'ITA': 'it', 'ENG': 'gb', 'JAP': 'jp', 'KOR': 'kr', 'CHN': 'cn',
      'FRA': 'fr', 'GER': 'de', 'SPA': 'es', 'POR': 'pt'
    };
    var flagCode = flagMap[linguaValue] || '';
    var flagHtml = flagCode ? '<span class="fi fi-' + flagCode + '" style="font-size:16px;margin-right:6px;border-radius:2px;"></span>' : '';
    details.push({ icon: 'fa-language', label: 'Lingua', value: flagHtml + linguaValue, isHtml: true });
  }
  
  // Condizione
  if (articolo.condizione) {
    details.push({ icon: 'fa-star-half-alt', label: 'Condizione', value: articolo.condizione });
  }
  
  // Rarità
  if (articolo.Rarita) {
    details.push({ icon: 'fa-gem', label: 'Rarità', value: articolo.Rarita });
  }
  
  // Disponibilità
  details.push({ 
    icon: 'fa-box', 
    label: 'Disponibilità', 
    value: disponibile ? 'In Magazzino' : 'Non Disponibile' 
  });
  
  if (details.length > 0) {
    detailsGrid.innerHTML = details.map(function(d) {
      var highlightClass = d.highlight ? ' detail-highlight' : '';
      var valueContent = d.isHtml ? d.value : d.value;
      return '<div class="detail-row' + highlightClass + '">' +
        '<div class="detail-label">' +
          '<i class="fas ' + d.icon + '"></i> ' + d.label +
        '</div>' +
        '<div class="detail-value">' + valueContent + '</div>' +
      '</div>';
    }).join('');
  }
  
  // FOOTER - Verifica se è un tuo articolo
  var currentUserId = getCurrentUserId();
  var isMyArticle = currentUserId && articolo.user_id === currentUserId;
  var footerActions = document.getElementById('footerActions');
  
  console.log('🔍 Verifica proprietà articolo:');
  console.log('   - currentUserId:', currentUserId);
  console.log('   - articolo.user_id:', articolo.user_id);
  console.log('   - isMyArticle:', isMyArticle);
  
  // STATISTICHE PROPRIETARIO - Solo se è tuo articolo
  var statsContainer = document.getElementById('ownerStatsSection');
  if (statsContainer) {
    if (isMyArticle) {
      statsContainer.style.display = 'block';
      renderOwnerStats(articolo);
    } else {
      statsContainer.style.display = 'none';
    }
  }
  
  if (isMyArticle) {
    // È un tuo articolo - mostra bottone Modifica
    footerActions.innerHTML = 
      '<button class="edit-btn" onclick="goToModifica()">' +
        '<i class="fas fa-edit"></i> Modifica Articolo' +
      '</button>';
  } else {
    // Non è tuo - mostra bottone Contatta
    footerActions.innerHTML = 
      '<button class="contact-btn" onclick="contattaVenditore()">' +
        '<i class="fas fa-envelope"></i> Contatta Venditore' +
      '</button>';
  }
}

// Renderizza statistiche proprietario
function renderOwnerStats(articolo) {
  var container = document.getElementById('ownerStatsContent');
  if (!container) return;
  
  var prezzo = parseFloat(articolo.PrezzoPagato || 0);
  var valore = parseFloat(articolo.ValoreAttuale || 0);
  var vendita = parseFloat(articolo.prezzo_vendita || 0);
  
  var delta = valore - prezzo;
  var deltaPercent = prezzo > 0 ? ((delta / prezzo) * 100) : 0;
  var deltaClass = delta >= 0 ? 'profit' : 'loss';
  var deltaIcon = delta >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
  
  var marginePotenziale = vendita > 0 ? (vendita - prezzo) : 0;
  var marginePercent = prezzo > 0 && vendita > 0 ? ((marginePotenziale / prezzo) * 100) : 0;
  var margineClass = marginePotenziale >= 0 ? 'profit' : 'loss';
  
  var roi = prezzo > 0 ? ((delta / prezzo) * 100).toFixed(1) : '0.0';
  
  container.innerHTML = `
    <!-- Header Portfolio -->
    <div class="owner-stats-header">
      <div class="stats-main-value">
        <span class="stats-label">VALORE DI MERCATO</span>
        <span class="stats-amount">${valore.toFixed(2)} <small>EUR</small></span>
      </div>
      <div class="stats-change ${deltaClass}">
        <i class="fas ${deltaIcon}"></i>
        <span>${delta >= 0 ? '+' : ''}${delta.toFixed(2)} €</span>
        <span class="change-percent">(${delta >= 0 ? '+' : ''}${roi}%)</span>
      </div>
    </div>
    
    <!-- Mini Chart -->
    <div class="stats-mini-chart">
      <div class="mini-chart-line ${deltaClass}"></div>
      <div class="mini-chart-dot ${deltaClass}"></div>
    </div>
    
    <!-- Metriche -->
    <div class="stats-metrics">
      <div class="stat-metric">
        <div class="metric-icon cost"><i class="fas fa-shopping-cart"></i></div>
        <div class="metric-info">
          <span class="metric-label">Prezzo Acquisto</span>
          <span class="metric-value">${prezzo.toFixed(2)} €</span>
        </div>
      </div>
      
      <div class="stat-metric">
        <div class="metric-icon ${deltaClass}"><i class="fas fa-chart-line"></i></div>
        <div class="metric-info">
          <span class="metric-label">${delta >= 0 ? 'Guadagno' : 'Perdita'} Potenziale</span>
          <span class="metric-value ${deltaClass}">${delta >= 0 ? '+' : ''}${delta.toFixed(2)} €</span>
        </div>
      </div>
      
      <div class="stat-metric">
        <div class="metric-icon roi"><i class="fas fa-percentage"></i></div>
        <div class="metric-info">
          <span class="metric-label">ROI</span>
          <span class="metric-value ${deltaClass}">${delta >= 0 ? '+' : ''}${roi}%</span>
        </div>
      </div>
      
      ${vendita > 0 ? `
      <div class="stat-metric">
        <div class="metric-icon ${margineClass}"><i class="fas fa-tag"></i></div>
        <div class="metric-info">
          <span class="metric-label">Margine Vendita</span>
          <span class="metric-value ${margineClass}">${marginePotenziale >= 0 ? '+' : ''}${marginePotenziale.toFixed(2)} € (${marginePercent.toFixed(1)}%)</span>
        </div>
      </div>
      ` : ''}
    </div>
    
    <!-- ROI Gauge -->
    <div class="roi-gauge-container">
      <div class="roi-gauge-label">Performance Investimento</div>
      <div class="roi-gauge">
        <div class="roi-gauge-fill ${deltaClass}" style="width: ${Math.min(Math.abs(deltaPercent), 100)}%"></div>
      </div>
      <div class="roi-gauge-value ${deltaClass}">${delta >= 0 ? '+' : ''}${roi}%</div>
    </div>
  `;
}

// Renderizza galleria foto
function renderPhotoGallery() {
  const slider = document.getElementById('photoSlider');
  const dots = document.getElementById('photoDots');
  
  if (allPhotos.length === 0) {
    slider.innerHTML = `
      <div class="photo-slide">
        <div class="photo-placeholder">
          <i class="fas fa-image"></i>
          <div>Nessuna foto disponibile</div>
        </div>
      </div>
    `;
    dots.style.display = 'none';
    return;
  }
  
  // Crea slide
  slider.innerHTML = allPhotos.map((foto, index) => `
    <div class="photo-slide">
      <img src="${foto}" alt="Foto ${index + 1}" onclick="openLightbox(${index})">
    </div>
  `).join('');
  
  // Counter foto
  if (allPhotos.length > 1) {
    const counter = document.createElement('div');
    counter.className = 'photo-counter';
    counter.innerHTML = `<i class="fas fa-images"></i> ${allPhotos.length} foto`;
    document.querySelector('.photo-gallery').appendChild(counter);
    
    // Hint zoom
    const hint = document.createElement('div');
    hint.className = 'photo-zoom-hint';
    hint.innerHTML = '<i class="fas fa-search-plus"></i> Tocca per ingrandire';
    document.querySelector('.photo-gallery').appendChild(hint);
    
    // Nascondi hint dopo 3 secondi
    setTimeout(() => {
      hint.style.opacity = '0';
      setTimeout(() => hint.remove(), 300);
    }, 3000);
  }
  
  // Crea dots
  if (allPhotos.length > 1) {
    dots.innerHTML = allPhotos.map((_, index) => 
      `<div class="photo-dot ${index === 0 ? 'active' : ''}"></div>`
    ).join('');
    dots.style.display = 'flex';
    
    // Gestisci scroll per aggiornare dots
    slider.addEventListener('scroll', updateActiveDot);
  } else {
    dots.style.display = 'none';
  }
}

// Aggiorna dot attivo durante scroll
function updateActiveDot() {
  const slider = document.getElementById('photoSlider');
  const scrollLeft = slider.scrollLeft;
  const slideWidth = slider.offsetWidth;
  const currentIndex = Math.round(scrollLeft / slideWidth);
  
  const dotElements = document.querySelectorAll('.photo-dot');
  dotElements.forEach((dot, index) => {
    if (index === currentIndex) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
  
  currentPhotoIndex = currentIndex;
}

// Apri lightbox
function openLightbox(index) {
  // Usa NodoGalleria
  if (window.NodoGalleria && allPhotos.length > 0) {
    NodoGalleria.open(allPhotos, index);
  }
}

// Chiudi lightbox - non più usata, gestita da NodoGalleria
function closeLightbox() {
  // Manteniamo per compatibilità
}

// Contatta venditore - CON MESSAGGIO PRE-COMPILATO
function contattaVenditore() {
  if (!currentArticolo) return;
  
  const vendorId = currentArticolo.Utenti?.id;
  const vendorUsername = currentArticolo.Utenti?.username;
  const nomeArticolo = currentArticolo.Nome || 'Articolo';
  const prezzoArticolo = parseFloat(currentArticolo.prezzo_vendita || 0).toFixed(2);
  const articoloId = currentArticolo.id;
  
  if (!vendorId) {
    alert('❌ Errore: dati venditore non disponibili');
    return;
  }
  
  // Messaggio pre-compilato con riferimenti articolo
  const messaggioPrefillato = `Ciao! Sono interessato a questo articolo:

📦 ${nomeArticolo}
💰 Prezzo: ${prezzoArticolo}€
🔗 ID: ${articoloId}

Vorrei avere più informazioni. È ancora disponibile?`;
  
  console.log('💬 Apertura chat con venditore:', vendorUsername, vendorId);
  
  // Passa anche il messaggio pre-compilato
  if (window.openMessagesCenter && typeof window.openMessagesCenter === 'function') {
    window.openMessagesCenter(vendorId, messaggioPrefillato);
  } else {
    console.error('❌ openMessagesCenter non disponibile');
    alert('❌ Errore: sistema messaggi non disponibile.\n\nVerifica che messages.js sia caricato correttamente.');
  }
}

// Condividi articolo
function shareArticolo() {
  if (!currentArticolo) return;
  
  const shareData = {
    title: currentArticolo.Nome || 'Articolo NODO',
    text: `Guarda questo articolo su NODO: ${currentArticolo.Nome}`,
    url: window.location.href
  };
  
  if (navigator.share) {
    navigator.share(shareData).catch(err => {
      console.log('Condivisione annullata', err);
    });
  } else {
    // Fallback: copia link
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert('✅ Link copiato negli appunti!');
    }).catch(() => {
      alert('❌ Impossibile copiare il link');
    });
  }
}

// Torna indietro
function goBack() {
  // Se c'è history, torna indietro
  if (window.history.length > 1) {
    window.history.back();
  } else {
    // Altrimenti vai alla home
    window.location.href = 'vetrine.html';
  }
}

// Mostra errore
function showError(message) {
  const loadingState = document.getElementById('loadingState');
  loadingState.innerHTML = `
    <div style="text-align: center;">
      <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ef4444; margin-bottom: 20px;"></i>
      <div class="loading-text" style="color: #ef4444;">${message}</div>
      <button 
        onclick="goBack()" 
        style="margin-top: 20px; padding: 12px 24px; background: #fbbf24; color: #0a0a0a; border: none; border-radius: 12px; font-weight: 800; cursor: pointer;"
      >
        <i class="fas fa-arrow-left"></i> Torna Indietro
      </button>
    </div>
  `;
}

// Particles animation
function createParticles() {
  const particlesContainer = document.getElementById('particles');
  if (!particlesContainer) return;
  
  const particleCount = 30;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.width = Math.random() * 3 + 1 + 'px';
    particle.style.height = particle.style.width;
    particle.style.background = 'rgba(251, 191, 36, 0.6)';
    particle.style.borderRadius = '50%';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.animation = `float ${Math.random() * 10 + 10}s linear infinite`;
    particle.style.animationDelay = Math.random() * 5 + 's';
    
    particlesContainer.appendChild(particle);
  }
}

// Init particles
window.addEventListener('DOMContentLoaded', () => {
  createParticles();
});

// Stile per animazione particles
const style = document.createElement('style');
style.textContent = `
  @keyframes float {
    0% {
      transform: translateY(0) translateX(0);
      opacity: 0;
    }
    10% {
      opacity: 0.8;
    }
    90% {
      opacity: 0.8;
    }
    100% {
      transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// ========================================
// EXPORTS GLOBALI
// ========================================
window.loadArticoloDettaglio = loadArticoloDettaglio;
window.goBack = goBack;
window.shareArticolo = shareArticolo;
window.openLightbox = openLightbox;
window.contattaVenditore = contattaVenditore;
window.goToModifica = goToModifica;

console.log('📝 dettaglio-articolo.js caricato');
