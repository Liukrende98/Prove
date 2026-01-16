// ========================================
// LOGICA IL TUO NEGOZIO - CON AUTENTICAZIONE E FOTO MULTIPLE
// ========================================

let currentPage = 1;
const itemsPerPage = 10;
let allArticles = [];
let filteredArticles = [];
let currentChart = null;
let currentChartColor = 'yellow';
let stream = null;

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
  
  grid.innerHTML = pageArticles.map(article => createArticleCard(article)).join('');
}

function createArticleCard(article) {
  const delta = (Number(article.ValoreAttuale) || 0) - (Number(article.PrezzoPagato) || 0);
  const deltaClass = delta >= 0 ? 'profit' : 'loss';
  const rating = article.ValutazioneStato || 0;
  const ratingPercent = (rating / 10) * 100;
  
  const foto = article.foto_principale || article.image_url || '';
  const foto2 = article.foto_2 || '';
  const foto3 = article.foto_3 || '';
  const foto4 = article.foto_4 || '';
  
  const hasGallery = foto2 || foto3 || foto4;
  
  return `
    <div class="article-card" id="card-${article.id}">
      <!-- IMMAGINE CHE SI INGRANDISCE -->
      <div class="article-image-wrapper" onclick="toggleArticleCard(${article.id})">
        <img src="${foto || 'https://via.placeholder.com/400'}" alt="${article.Nome}" class="article-main-image">
        
        <!-- Badge -->
        ${article.Presente 
          ? '<div class="article-badge badge-presente"><i class="fas fa-check"></i> PRESENTE NEL MAGAZZINO</div>' 
          : '<div class="article-badge badge-assente"><i class="fas fa-times"></i> ASSENTE</div>'}
        
        ${article.in_vetrina 
          ? '<div class="article-badge badge-vetrina" style="top: 45px;"><i class="fas fa-store"></i> IN VETRINA</div>' 
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
      </div>
      
      <!-- DETTAGLI ESPANSI -->
      <div class="article-expanded-section">
        <!-- Sezione Statistiche -->
        <div class="expanded-box">
          <div class="expanded-box-title"><i class="fas fa-chart-bar"></i> STATISTICHE</div>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-item-label">Prezzo Pagato</div>
              <div class="stat-item-value">${Number(article.PrezzoPagato || 0).toFixed(2)} €</div>
            </div>
            <div class="stat-item">
              <div class="stat-item-label">Valore Attuale</div>
              <div class="stat-item-value">${Number(article.ValoreAttuale || 0).toFixed(2)} €</div>
            </div>
            <div class="stat-item">
              <div class="stat-item-label">Variazione</div>
              <div class="stat-item-value ${deltaClass}">${delta >= 0 ? '+' : ''}${delta.toFixed(2)} €</div>
            </div>
            ${article.prezzo_vendita ? `
            <div class="stat-item">
              <div class="stat-item-label">Prezzo Vendita</div>
              <div class="stat-item-value">${Number(article.prezzo_vendita).toFixed(2)} €</div>
            </div>
            ` : ''}
          </div>
        </div>
        
        ${article.casa_gradazione ? `
        <!-- Sezione Gradazione -->
        <div class="expanded-box">
          <div class="expanded-box-title"><i class="fas fa-certificate"></i> GRADAZIONE</div>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-item-label">Casa</div>
              <div class="stat-item-value">${article.casa_gradazione === 'Altra casa' ? article.altra_casa_gradazione : article.casa_gradazione}</div>
            </div>
            <div class="stat-item">
              <div class="stat-item-label">Voto</div>
              <div class="stat-item-value">${article.voto_gradazione || '-'}</div>
            </div>
          </div>
        </div>
        ` : ''}
        
        ${article.Descrizione ? `
        <!-- Sezione Descrizione -->
        <div class="expanded-box">
          <div class="expanded-box-title"><i class="fas fa-align-left"></i> DESCRIZIONE</div>
          <div class="expanded-box-content">${article.Descrizione}</div>
        </div>
        ` : ''}
        
        ${hasGallery ? `
        <!-- Galleria Foto -->
        <div class="expanded-box">
          <div class="expanded-box-title"><i class="fas fa-images"></i> GALLERIA</div>
          <div class="gallery-grid">
            ${foto2 ? `<img src="${foto2}" onclick="openFullscreen('${foto2}')" class="gallery-thumb">` : ''}
            ${foto3 ? `<img src="${foto3}" onclick="openFullscreen('${foto3}')" class="gallery-thumb">` : ''}
            ${foto4 ? `<img src="${foto4}" onclick="openFullscreen('${foto4}')" class="gallery-thumb">` : ''}
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

function openFullscreen(imageUrl) {
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
  if (!pagination) return;
  
  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
  
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

// ========== FILTRI E RICERCA ==========
function cercaArticoli() {
  const searchText = document.getElementById('searchInput')?.value?.toLowerCase() || '';
  const categoria = document.getElementById('filterCategoria')?.value || '';
  
  filteredArticles = allArticles.filter(article => {
    const matchSearch = !searchText || 
      (article.Nome && article.Nome.toLowerCase().includes(searchText)) ||
      (article.Descrizione && article.Descrizione.toLowerCase().includes(searchText));
    
    const matchCategoria = !categoria || article.Categoria === categoria;
    
    return matchSearch && matchCategoria;
  });
  
  currentPage = 1;
  renderArticles();
  updatePagination();
}

function resetFiltri() {
  const searchInput = document.getElementById('searchInput');
  const filterCategoria = document.getElementById('filterCategoria');
  
  if (searchInput) searchInput.value = '';
  if (filterCategoria) filterCategoria.value = '';
  
  filteredArticles = [...allArticles];
  currentPage = 1;
  renderArticles();
  updatePagination();
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
    
    // Reset previews e wrapper
    document.querySelectorAll('#formAdd .image-preview').forEach(img => {
      img.style.display = 'none';
      img.src = '';
      
      // Nascondi wrapper e rimuovi pulsante
      const wrapper = img.parentElement;
      if (wrapper && wrapper.classList.contains('image-preview-wrapper')) {
        wrapper.style.display = 'none';
        const btn = wrapper.querySelector('.remove-image-btn');
        if (btn) btn.remove();
      }
    });
    
    // Reset campi gradazione
    gestisciCarteGradate('', 'Add');
  }
}

function updateRangeSlider() {
  const slider = document.getElementById('valutazioneSlider');
  const value = document.getElementById('valutazioneValue');
  
  if (slider && value) {
    value.textContent = slider.value;
    slider.addEventListener('input', () => {
      value.textContent = slider.value;
    });
  }
}

function previewImage(input, previewId) {
  const preview = document.getElementById(previewId);
  if (!preview) return;
  
  // Trova o crea il wrapper
  let wrapper = preview.parentElement;
  if (!wrapper.classList.contains('image-preview-wrapper')) {
    wrapper = document.createElement('div');
    wrapper.className = 'image-preview-wrapper';
    preview.parentElement.insertBefore(wrapper, preview);
    wrapper.appendChild(preview);
  }
  
  // Rimuovi pulsante esistente se c'è
  const existingBtn = wrapper.querySelector('.remove-image-btn');
  if (existingBtn) existingBtn.remove();
  
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.style.display = 'block';
      wrapper.style.display = 'block';
      
      // Aggiungi pulsante rimozione
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-image-btn';
      removeBtn.innerHTML = '<i class="fas fa-times"></i>';
      removeBtn.onclick = () => removeImage(input.id, previewId);
      wrapper.appendChild(removeBtn);
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function removeImage(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  
  if (input) {
    input.value = ''; // Reset input file
  }
  
  if (preview) {
    preview.src = '';
    preview.style.display = 'none';
    
    // Nascondi wrapper e rimuovi pulsante
    const wrapper = preview.parentElement;
    if (wrapper && wrapper.classList.contains('image-preview-wrapper')) {
      wrapper.style.display = 'none';
      const btn = wrapper.querySelector('.remove-image-btn');
      if (btn) btn.remove();
    }
  }
}

// 🔥 Versione per modal Edit (con gestione URL esistenti)
function removeImageEdit(inputId, previewId, hiddenUrlId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const hiddenUrl = document.getElementById(hiddenUrlId);
  
  if (input) {
    input.value = ''; // Reset input file
  }
  
  if (hiddenUrl) {
    hiddenUrl.value = ''; // Rimuovi URL esistente
  }
  
  if (preview) {
    preview.src = '';
    preview.style.display = 'none';
    
    // Nascondi wrapper e rimuovi pulsante
    const wrapper = preview.parentElement;
    if (wrapper && wrapper.classList.contains('image-preview-wrapper')) {
      wrapper.style.display = 'none';
      const btn = wrapper.querySelector('.remove-image-btn');
      if (btn) btn.remove();
    }
  }
}

// 🔥 Setup preview per modal Edit con pulsante rimozione
function setupEditPreview(previewId, imageUrl, inputId, hiddenUrlId) {
  const preview = document.getElementById(previewId);
  if (!preview) return;
  
  // Trova o crea il wrapper
  let wrapper = preview.parentElement;
  if (!wrapper.classList.contains('image-preview-wrapper')) {
    wrapper = document.createElement('div');
    wrapper.className = 'image-preview-wrapper';
    preview.parentElement.insertBefore(wrapper, preview);
    wrapper.appendChild(preview);
  }
  
  // Rimuovi pulsante esistente se c'è
  const existingBtn = wrapper.querySelector('.remove-image-btn');
  if (existingBtn) existingBtn.remove();
  
  if (imageUrl) {
    preview.src = imageUrl;
    preview.style.display = 'block';
    wrapper.style.display = 'block';
    
    // Aggiungi pulsante rimozione
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-image-btn';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.onclick = () => removeImageEdit(inputId, previewId, hiddenUrlId);
    wrapper.appendChild(removeBtn);
  } else {
    preview.src = '';
    preview.style.display = 'none';
    wrapper.style.display = 'none';
  }
}

async function uploadImage(file) {
  if (!file) return null;
  
  const user = getCurrentUser();
  if (!user) return null;
  
  const fileName = `${user.id}/${Date.now()}_${file.name}`;
  
  const { data, error } = await supabaseClient.storage
    .from('articoli-images')
    .upload(fileName, file);
  
  if (error) {
    console.error('Errore upload:', error);
    return null;
  }
  
  const { data: urlData } = supabaseClient.storage
    .from('articoli-images')
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
  
  const form = event.target;
  const formData = new FormData(form);
  
  const msg = document.getElementById('addMsg');
  msg.className = 'msg';
  msg.textContent = '⏳ Caricamento...';
  msg.style.display = 'block';
  
  // Upload immagini
  const imageInput = document.getElementById('imageInput');
  const imageInput2 = document.getElementById('imageInput2');
  const imageInput3 = document.getElementById('imageInput3');
  const imageInput4 = document.getElementById('imageInput4');
  const imageInput5 = document.getElementById('imageInput5');
  const imageInput6 = document.getElementById('imageInput6');
  
  let fotoPrincipale = await uploadImage(imageInput?.files[0]);
  let foto2 = await uploadImage(imageInput2?.files[0]);
  let foto3 = await uploadImage(imageInput3?.files[0]);
  let foto4 = await uploadImage(imageInput4?.files[0]);
  let foto5 = await uploadImage(imageInput5?.files[0]);
  let foto6 = await uploadImage(imageInput6?.files[0]);
  
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
    ValoreAttuale: valore,
    PrezzoPagato: prezzo,
    Delta: valore - prezzo,
    ValutazioneStato: formData.get('ValutazioneStato') ? parseInt(formData.get('ValutazioneStato')) : null,
    Presente: formData.get('Presente') === 'on',
    image_url: fotoPrincipale,
    foto_principale: fotoPrincipale,
    foto_2: foto2 || null,
    foto_3: foto3 || null,
    foto_4: foto4 || null,
    foto_5: foto5 || null,
    foto_6: foto6 || null,
    in_vetrina: inVetrina,
    prezzo_vendita: prezzoVendita,
    casa_gradazione: casaGradazione,
    altra_casa_gradazione: altraCasaGradazione,
    voto_gradazione: votoGradazione
  };
  
  const { error } = await supabaseClient.from('Articoli').insert([articolo]);
  
  if (error) {
    msg.className = 'msg error';
    msg.textContent = '❌ ERRORE: ' + error.message;
  } else {
    msg.className = 'msg success';
    msg.textContent = '✅ ARTICOLO AGGIUNTO!';
    setTimeout(() => {
      closeAddModal();
      caricaArticoli();
    }, 1500);
  }
}

// ========== MODAL MODIFICA ==========
async function apriModifica(articleId) {
  const article = allArticles.find(a => a.id === articleId);
  if (!article) return;
  
  const modal = document.getElementById('modalEdit');
  if (!modal) return;
  
  // Popola i campi
  document.getElementById('editId').value = article.id;
  document.getElementById('editNome').value = article.Nome || '';
  document.getElementById('editDescrizione').value = article.Descrizione || '';
  document.getElementById('editCategoria').value = article.Categoria || '';
  document.getElementById('editValoreAttuale').value = article.ValoreAttuale || '';
  document.getElementById('editPrezzoPagato').value = article.PrezzoPagato || '';
  document.getElementById('editDelta').value = ((article.ValoreAttuale || 0) - (article.PrezzoPagato || 0)).toFixed(2) + ' €';
  document.getElementById('editStato').value = article.ValutazioneStato || '';
  document.getElementById('editPresente').checked = article.Presente || false;
  document.getElementById('editInVetrina').checked = article.in_vetrina || false;
  document.getElementById('editPrezzoVendita').value = article.prezzo_vendita || '';
  
  // Mostra/nascondi prezzo vendita
  const prezzoGroup = document.getElementById('prezzoVenditaGroupEdit');
  if (prezzoGroup) {
    prezzoGroup.style.display = article.in_vetrina ? 'block' : 'none';
  }
  
  // Gestisci carte gradate
  gestisciCarteGradate(article.Categoria || '', 'Edit');
  
  if (article.Categoria === 'Carte gradate') {
    const casaSelect = document.getElementById('casaGradazioneEdit');
    const altraCasaInput = document.getElementById('altraCasaGradazioneEdit');
    const votoInput = document.getElementById('votoGradazioneEdit');
    
    if (casaSelect) casaSelect.value = article.casa_gradazione || '';
    gestisciAltraCasa(article.casa_gradazione || '', 'Edit');
    if (altraCasaInput) altraCasaInput.value = article.altra_casa_gradazione || '';
    if (votoInput) votoInput.value = article.voto_gradazione || '';
  }
  
  // Immagini
  document.getElementById('editCurrentImageUrl').value = article.foto_principale || article.image_url || '';
  document.getElementById('editCurrentImageUrl2').value = article.foto_2 || '';
  document.getElementById('editCurrentImageUrl3').value = article.foto_3 || '';
  document.getElementById('editCurrentImageUrl4').value = article.foto_4 || '';
  document.getElementById('editCurrentImageUrl5').value = article.foto_5 || '';
  document.getElementById('editCurrentImageUrl6').value = article.foto_6 || '';
  
  // Preview immagini esistenti con pulsante rimozione
  setupEditPreview('imagePreviewEdit', article.foto_principale || article.image_url, 'editImageInput', 'editCurrentImageUrl');
  setupEditPreview('imagePreviewEdit2', article.foto_2, 'editImageInput2', 'editCurrentImageUrl2');
  setupEditPreview('imagePreviewEdit3', article.foto_3, 'editImageInput3', 'editCurrentImageUrl3');
  setupEditPreview('imagePreviewEdit4', article.foto_4, 'editImageInput4', 'editCurrentImageUrl4');
  setupEditPreview('imagePreviewEdit5', article.foto_5, 'editImageInput5', 'editCurrentImageUrl5');
  setupEditPreview('imagePreviewEdit6', article.foto_6, 'editImageInput6', 'editCurrentImageUrl6');
  
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
  
  const id = document.getElementById('editId').value;
  const formData = new FormData(event.target);
  
  const msg = document.getElementById('editMsg');
  msg.className = 'msg';
  msg.textContent = '⏳ Salvataggio...';
  msg.style.display = 'block';
  
  // Upload nuove immagini se presenti
  const editImageInput = document.getElementById('editImageInput');
  const editImageInput2 = document.getElementById('editImageInput2');
  const editImageInput3 = document.getElementById('editImageInput3');
  const editImageInput4 = document.getElementById('editImageInput4');
  const editImageInput5 = document.getElementById('editImageInput5');
  const editImageInput6 = document.getElementById('editImageInput6');
  
  let fotoPrincipale = await uploadImage(editImageInput?.files[0]) || document.getElementById('editCurrentImageUrl').value;
  let foto2 = await uploadImage(editImageInput2?.files[0]) || document.getElementById('editCurrentImageUrl2').value;
  let foto3 = await uploadImage(editImageInput3?.files[0]) || document.getElementById('editCurrentImageUrl3').value;
  let foto4 = await uploadImage(editImageInput4?.files[0]) || document.getElementById('editCurrentImageUrl4').value;
  let foto5 = await uploadImage(editImageInput5?.files[0]) || document.getElementById('editCurrentImageUrl5').value;
  let foto6 = await uploadImage(editImageInput6?.files[0]) || document.getElementById('editCurrentImageUrl6').value;
  
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
    ValoreAttuale: valore,
    PrezzoPagato: prezzo,
    Delta: valore - prezzo,
    ValutazioneStato: formData.get('ValutazioneStato') ? parseInt(formData.get('ValutazioneStato')) : null,
    Presente: formData.get('Presente') === 'on',
    image_url: fotoPrincipale,
    foto_principale: fotoPrincipale,
    foto_2: foto2 || null,
    foto_3: foto3 || null,
    foto_4: foto4 || null,
    foto_5: foto5 || null,
    foto_6: foto6 || null,
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
  } else {
    msg.className = 'msg success';
    msg.textContent = '✅ SALVATO!';
    msg.style.display = 'block';
    setTimeout(() => {
      closeEditModal();
      caricaArticoli();
    }, 1500);
  }
}

async function eliminaArticolo() {
  const id = document.getElementById('editId').value;
  const nome = document.getElementById('editNome').value;
  if (!confirm(`⚠️ ELIMINARE "${nome}"?`)) return;

  const { error } = await supabaseClient.from('Articoli').delete().eq('id', id);
  const msg = document.getElementById('editMsg');

  if (error) {
    msg.className = 'msg error';
    msg.textContent = '❌ ERRORE: ' + error.message;
    msg.style.display = 'block';
  } else {
    msg.className = 'msg success';
    msg.textContent = '✅ ELIMINATO!';
    msg.style.display = 'block';
    setTimeout(() => {
      closeEditModal();
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
}

// Chiusura modals al click esterno
document.addEventListener('click', (e) => {
  if (e.target.id === 'modalAdd') closeAddModal();
  if (e.target.id === 'modalEdit') closeEditModal();
  if (e.target.id === 'modalGraph') closeGraphModal();
});
