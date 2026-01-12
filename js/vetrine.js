// ========================================
// LOGICA VETRINE - ARTICOLI REALI
// ========================================

async function loadVetrineContent() {
  const container = document.getElementById('vetrineContainer');
  
  try {
    // Carica TUTTI gli articoli in vetrina (da tutti gli utenti) con JOIN su Utenti
    const { data: articoli, error } = await supabaseClient
      .from('Articoli')
      .select(`
        *,
        Utenti!inner (
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
              ${username}
              <span class="vetrina-expand-icon">▼</span>
            </h3>
            <p><i class="fas fa-map-marker-alt"></i> ${citta}</p>
            <div class="vetrina-rating">
              <i class="fas fa-store"></i> ${totaleArticoli} articol${totaleArticoli === 1 ? 'o' : 'i'} in vendita
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
          <div class="vetrina-stat-label">Valore Totale</div>
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
          <h4><i class="fas fa-boxes"></i> CATALOGO COMPLETO (${totaleArticoli} articol${totaleArticoli === 1 ? 'o' : 'i'})</h4>
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
    ? `<img src="${foto}" style="width:100%; height:80px; object-fit:cover; border-radius:8px; margin-bottom:8px;">` 
    : '<div style="width:100%; height:80px; background:#2a2a2a; border-radius:8px; margin-bottom:8px; display:flex; align-items:center; justify-content:center; color:#6b7280;"><i class="fas fa-image"></i></div>';
  
  return `
    <div class="vetrina-item" onclick="mostraDettaglioArticolo('${articolo.id}')">
      ${imageHtml}
      <div style="font-weight:700; margin-bottom:4px; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${articolo.Nome}</div>
      <div style="color:#10b981; font-weight:800; font-size:16px;">${parseFloat(articolo.prezzo_vendita || 0).toFixed(2)}€</div>
    </div>
  `;
}

function createArticoloCompleto(articolo) {
  const foto = articolo.foto_principale || articolo.image_url || '';
  const imageHtml = foto 
    ? `<img src="${foto}" style="width:100%; height:120px; object-fit:cover; border-radius:8px; margin-bottom:8px;">` 
    : '<div style="width:100%; height:120px; background:#2a2a2a; border-radius:8px; margin-bottom:8px; display:flex; align-items:center; justify-content:center; color:#6b7280;"><i class="fas fa-image"></i></div>';
  
  const stelle = articolo.ValutazioneStato ? '⭐'.repeat(Math.min(articolo.ValutazioneStato, 5)) : '—';
  
  return `
    <div class="vetrina-item" onclick="mostraDettaglioArticolo('${articolo.id}')">
      ${imageHtml}
      <div style="font-weight:700; margin-bottom:4px; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${articolo.Nome}</div>
      <div style="color:#9ca3af; font-size:12px; margin-bottom:4px;">${articolo.Categoria || 'Varie'}</div>
      <div style="color:#fbbf24; font-size:12px; margin-bottom:6px;">${stelle}</div>
      <div style="color:#10b981; font-weight:800; font-size:18px;">${parseFloat(articolo.prezzo_vendita || 0).toFixed(2)}€</div>
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
            style="width:100%; max-width:200px; height:200px; object-fit:cover; border-radius:12px; border:2px solid #10b981; cursor:pointer;"
            onclick="window.open('${f}', '_blank')"
          >
        `).join('')
      : '<div style="width:100%; height:300px; background:#2a2a2a; border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#6b7280;"><i class="fas fa-image" style="font-size:48px; margin-bottom:16px;"></i><div>Nessuna foto disponibile</div></div>';
    
    const stelle = articolo.ValutazioneStato ? '⭐'.repeat(Math.min(articolo.ValutazioneStato, 10)) : '—';
    
    const dettaglioHtml = `
      <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px; overflow-y:auto;" onclick="this.remove()">
        <div style="background:linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%); border-radius:28px; padding:40px; max-width:900px; width:100%; max-height:90vh; overflow-y:auto; border:3px solid #10b981; box-shadow:0 20px 80px rgba(16, 185, 129, 0.5);" onclick="event.stopPropagation()">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
            <h2 style="font-size:28px; font-weight:900; background:linear-gradient(135deg, #10b981 0%, #059669 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin:0;">${articolo.Nome}</h2>
            <button onclick="this.closest('div').parentElement.remove()" style="width:48px; height:48px; border-radius:50%; border:none; background:#2a2a2a; cursor:pointer; font-size:24px; color:#e5e7eb; transition:all 0.3s;">✕</button>
          </div>
          
          <div style="margin-bottom:24px;">
            <h3 style="color:#10b981; font-size:18px; font-weight:800; margin-bottom:16px;"><i class="fas fa-images"></i> GALLERIA FOTO</h3>
            <div style="display:flex; gap:16px; flex-wrap:wrap; justify-content:center;">
              ${galleriaHtml}
            </div>
          </div>
          
          <div style="background:#0a0a0a; padding:20px; border-radius:16px; margin-bottom:20px;">
            <div style="display:grid; gap:16px;">
              <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid #2a2a2a;">
                <span style="color:#9ca3af; font-weight:700;"><i class="fas fa-layer-group"></i> CATEGORIA</span>
                <span style="color:#e5e7eb; font-weight:600;">${articolo.Categoria || '—'}</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid #2a2a2a;">
                <span style="color:#9ca3af; font-weight:700;"><i class="fas fa-star"></i> VALUTAZIONE</span>
                <span style="color:#fbbf24; font-weight:600;">${stelle}</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid #2a2a2a;">
                <span style="color:#9ca3af; font-weight:700;"><i class="fas fa-user"></i> VENDITORE</span>
                <span style="color:#e5e7eb; font-weight:600;">${articolo.Utenti?.username || 'Anonimo'}</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid #2a2a2a;">
                <span style="color:#9ca3af; font-weight:700;"><i class="fas fa-map-marker-alt"></i> CITTÀ</span>
                <span style="color:#e5e7eb; font-weight:600;">${articolo.Utenti?.citta || '—'}</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding:20px 0; padding-top:20px;">
                <span style="color:#9ca3af; font-weight:700; font-size:20px;"><i class="fas fa-tag"></i> PREZZO</span>
                <span style="color:#10b981; font-weight:900; font-size:32px;">${parseFloat(articolo.prezzo_vendita || 0).toFixed(2)}€</span>
              </div>
            </div>
          </div>
          
          ${articolo.Descrizione ? `
            <div style="background:#0a0a0a; padding:20px; border-radius:16px; margin-bottom:20px;">
              <h3 style="color:#10b981; font-size:18px; font-weight:800; margin-bottom:12px;"><i class="fas fa-align-left"></i> DESCRIZIONE</h3>
              <p style="color:#e5e7eb; line-height:1.6; white-space:pre-wrap;">${articolo.Descrizione}</p>
            </div>
          ` : ''}
          
          <button onclick="alert('📧 Contatta ${articolo.Utenti?.username} via email: ${articolo.Utenti?.email}')" style="width:100%; padding:20px; border-radius:16px; border:none; background:linear-gradient(135deg, #10b981 0%, #059669 100%); color:#fff; font-size:18px; font-weight:800; cursor:pointer; box-shadow:0 6px 20px rgba(16, 185, 129, 0.4); text-transform:uppercase; transition:all 0.3s;">
            <i class="fas fa-envelope"></i> CONTATTA VENDITORE
          </button>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', dettaglioHtml);
    
  } catch (error) {
    console.error('❌ Errore caricamento dettaglio:', error);
    alert('❌ Errore nel caricamento del dettaglio: ' + error.message);
  }
}
