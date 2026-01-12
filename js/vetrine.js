// ========================================
// LOGICA VETRINE - ARTICOLI REALI - OTTIMIZZATO MOBILE
// ========================================

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
      const totaleArticoli = userData.articoli.length;
      const valoreComplessivo = userData.articoli.reduce((sum, a) => sum + (parseFloat(a.prezzo_vendita) || 0), 0);
      
      html += createVetrinaCard(
        userId,
        userData.username,
        userData.citta,
        totaleArticoli,
        valoreComplessivo.toFixed(2),
        userData.articoli
      );
    });
    
    container.innerHTML = html;
    
  } catch (error) {
    console.error('❌ Errore caricamento vetrine:', error);
    container.innerHTML = `
      <div class="msg error" style="margin: 20px;">
        ❌ Errore nel caricamento delle vetrine: ${error.message}
      </div>
    `;
  }
}

function createVetrinaCard(userId, username, citta, totaleArticoli, valoreComplessivo, articoli) {
  // Prendi primi 6 articoli per preview
  const preview = articoli.slice(0, 6);
  
  return `
    <div class="vetrina-card-big" id="vetrina-${userId}">
      <div class="vetrina-header" onclick="toggleVetrina('${userId}')">
        <div class="vetrina-top">
          <div class="vetrina-avatar"></div>
          <div class="vetrina-info">
            <h3>
              <span class="vetrina-username">${username}</span>
              <span class="vetrina-expand-icon">▼</span>
            </h3>
            <p><i class="fas fa-map-marker-alt"></i> ${citta}</p>
            <div class="vetrina-rating">
              <i class="fas fa-store"></i> ${totaleArticoli} articol${totaleArticoli === 1 ? 'o' : 'i'}
            </div>
          </div>
        </div>
      </div>
      
      <div class="vetrina-stats">
        <div class="vetrina-stat">
          <div class="vetrina-stat-value">${totaleArticoli}</div>
          <div class="vetrina-stat-label">Articoli</div>
        </div>
        <div class="vetrina-stat">
          <div class="vetrina-stat-value">${valoreComplessivo}€</div>
          <div class="vetrina-stat-label">Valore</div>
        </div>
        <div class="vetrina-stat">
          <div class="vetrina-stat-value">100%</div>
          <div class="vetrina-stat-label">Disponibili</div>
        </div>
      </div>
      
      <div class="vetrina-items-preview">
        ${preview.map(art => createArticoloPreview(art)).join('')}
      </div>
      
      <div class="vetrina-details">
        <div class="vetrina-full-catalog">
          <h4><i class="fas fa-boxes"></i> CATALOGO (${totaleArticoli})</h4>
          <div class="vetrina-catalog-grid">
            ${articoli.map(art => createArticoloCompleto(art)).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function createArticoloPreview(articolo) {
  const foto = articolo.foto_principale || articolo.image_url || '';
  const imageHtml = foto 
    ? `<img src="${foto}" alt="${articolo.Nome}">` 
    : '<div class="vetrina-item-placeholder"><i class="fas fa-image"></i></div>';
  
  return `
    <div class="vetrina-item" onclick="mostraDettaglioArticolo('${articolo.id}')">
      ${imageHtml}
      <div class="vetrina-item-name">${articolo.Nome}</div>
      <div class="vetrina-item-price">${parseFloat(articolo.prezzo_vendita || 0).toFixed(2)}€</div>
    </div>
  `;
}

function createArticoloCompleto(articolo) {
  const foto = articolo.foto_principale || articolo.image_url || '';
  const imageHtml = foto 
    ? `<img src="${foto}" alt="${articolo.Nome}">` 
    : '<div class="vetrina-item-placeholder"><i class="fas fa-image"></i></div>';
  
  // Mostra numero + stella invece di tante stelle
  const stelle = articolo.ValutazioneStato ? `${articolo.ValutazioneStato}/10 ⭐` : '—';
  
  return `
    <div class="vetrina-catalog-item" onclick="mostraDettaglioArticolo('${articolo.id}')">
      ${imageHtml}
      <div class="vetrina-catalog-item-name">${articolo.Nome}</div>
      <div class="vetrina-catalog-item-categoria">${articolo.Categoria || 'Varie'}</div>
      <div class="vetrina-catalog-item-rating">${stelle}</div>
      <div class="vetrina-catalog-item-price">${parseFloat(articolo.prezzo_vendita || 0).toFixed(2)}€</div>
    </div>
  `;
}

function toggleVetrina(userId) {
  const card = document.getElementById(`vetrina-${userId}`);
  if (card) {
    card.classList.toggle('expanded');
  }
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
    
    const modalHtml = `
      <div class="modal-dettaglio-backdrop" onclick="chiudiModalDettaglio(event)">
        <div class="modal-dettaglio-content" onclick="event.stopPropagation()">
          <div class="modal-dettaglio-header">
            <h2 class="modal-dettaglio-title">${articolo.Nome}</h2>
            <button class="modal-dettaglio-close" onclick="chiudiModalDettaglio()">✕</button>
          </div>
          
          <div class="modal-dettaglio-gallery">
            <h3><i class="fas fa-images"></i> FOTO</h3>
            <div class="modal-gallery-grid">
              ${galleriaHtml}
            </div>
          </div>
          
          <div class="modal-dettaglio-info">
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
