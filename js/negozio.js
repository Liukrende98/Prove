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
    const user = getCurrentUser();
    
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
          <div class="expanded-box-title">
            <i class="fas fa-chart-bar"></i> STATISTICHE
          </div>
          <div class="expanded-box-content">
            <div class="stat-row">
              <span class="stat-row-label"><i class="fas fa-gem"></i> Valore Attuale</span>
              <span class="stat-row-value">${Number(article.ValoreAttuale || 0).toFixed(2)} €</span>
            </div>
            <div class="stat-row">
              <span class="stat-row-label"><i class="fas fa-receipt"></i> Prezzo Pagato</span>
              <span class="stat-row-value">${Number(article.PrezzoPagato || 0).toFixed(2)} €</span>
            </div>
            <div class="stat-row">
              <span class="stat-row-label"><i class="fas fa-chart-line"></i> Guadagno/Perdita</span>
              <span class="stat-row-value ${deltaClass}">${delta >= 0 ? '+' : ''}${delta.toFixed(2)} €</span>
            </div>
            ${article.in_vetrina ? `
            <div class="stat-row">
              <span class="stat-row-label"><i class="fas fa-tag"></i> Prezzo Vendita</span>
              <span class="stat-row-value" style="color: #10b981;">${Number(article.prezzo_vendita || 0).toFixed(2)} €</span>
            </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Sezione Descrizione -->
        ${article.Descrizione ? `
        <div class="expanded-box">
          <div class="expanded-box-title">
            <i class="fas fa-info-circle"></i> DESCRIZIONE
          </div>
          <div class="expanded-box-content">
            <p class="article-description">${article.Descrizione}</p>
          </div>
        </div>
        ` : ''}
        
        <!-- Galleria Foto -->
        ${hasGallery ? `
        <div class="expanded-box">
          <div class="expanded-box-title">
            <i class="fas fa-images"></i> GALLERIA
          </div>
          <div class="expanded-box-content">
            <div class="article-gallery">
              ${foto2 ? `<div class="gallery-item"><img src="${foto2}" alt="Foto 2"></div>` : ''}
              ${foto3 ? `<div class="gallery-item"><img src="${foto3}" alt="Foto 3"></div>` : ''}
              ${foto4 ? `<div class="gallery-item"><img src="${foto4}" alt="Foto 4"></div>` : ''}
            </div>
          </div>
        </div>
        ` : ''}
        
        <!-- Azioni -->
        <div class="article-actions-expanded">
          <button class="action-btn action-btn-primary" onclick="apriModifica(${article.id})">
            <i class="fas fa-edit"></i> MODIFICA
          </button>
          <button class="action-btn action-btn-secondary" onclick="alert('Condividi - da implementare')">
            <i class="fas fa-share-alt"></i> CONDIVIDI
          </button>
        </div>
      </div>
    </div>
  `;
}

function toggleArticleCard(id) {
  const card = document.getElementById(`card-${id}`);
  if (card) {
    // Chiudi tutti gli altri
    document.querySelectorAll('.article-card').forEach(c => {
      if (c !== card) {
        c.classList.remove('expanded');
      }
    });
    
    // Toggle questo
    card.classList.toggle('expanded');
  }
}

// ========== FILTRI ==========
function toggleFilters() {
  const content = document.getElementById('filterContent');
  const toggle = document.getElementById('filterToggle');
  const isExpanded = content.classList.contains('active');
  
  if (isExpanded) {
    content.classList.remove('active');
    toggle.classList.remove('expanded');
    toggle.querySelector('i').className = 'fas fa-chevron-down';
  } else {
    content.classList.add('active');
    toggle.classList.add('expanded');
    toggle.querySelector('i').className = 'fas fa-chevron-up';
  }
}

function updateRangeSlider() {
  const minInput = document.getElementById('fValoreMin');
  const maxInput = document.getElementById('fValoreMax');
  const display = document.getElementById('rangeValoreDisplay');
  const progress = document.getElementById('rangeProgress');
  
  if (!minInput || !maxInput) return;
  
  let min = parseInt(minInput.value);
  let max = parseInt(maxInput.value);
  
  if (min > max - 10) {
    min = max - 10;
    minInput.value = min;
  }
  if (max < min + 10) {
    max = min + 10;
    maxInput.value = max;
  }
  
  display.textContent = `${min}€ - ${max}€`;
  
  const minPercent = (min / 1000) * 100;
  const maxPercent = (max / 1000) * 100;
  
  progress.style.left = minPercent + '%';
  progress.style.width = (maxPercent - minPercent) + '%';
}

function updateStatoDisplay() {
  const stato = document.getElementById('fStato').value;
  const display = document.getElementById('rangeStatoDisplay');
  if (stato) {
    display.textContent = stato + '⭐+';
  } else {
    display.textContent = 'Tutte';
  }
}

function applicaFiltri() {
  currentPage = 1;
  filteredArticles = filterArticles();
  renderArticles();
  updatePagination();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetFiltri() {
  document.getElementById('fNome').value = '';
  document.getElementById('fCategoria').value = '';
  document.getElementById('fValoreMin').value = '0';
  document.getElementById('fValoreMax').value = '1000';
  document.getElementById('fStato').value = '';
  document.getElementById('fPresenti').checked = true;
  document.getElementById('fAssenti').checked = true;
  document.getElementById('fProfit').checked = true;
  document.getElementById('fLoss').checked = true;
  
  updateRangeSlider();
  updateStatoDisplay();
  applicaFiltri();
}

function filterArticles() {
  const nome = document.getElementById('fNome').value.toLowerCase();
  const categoria = document.getElementById('fCategoria').value;
  const valoreMin = parseFloat(document.getElementById('fValoreMin').value) || 0;
  const valoreMax = parseFloat(document.getElementById('fValoreMax').value) || 999999;
  const statoMin = parseInt(document.getElementById('fStato').value) || 0;
  const presenti = document.getElementById('fPresenti').checked;
  const assenti = document.getElementById('fAssenti').checked;
  const profit = document.getElementById('fProfit').checked;
  const loss = document.getElementById('fLoss').checked;
  
  return allArticles.filter(article => {
    if (nome && !article.Nome.toLowerCase().includes(nome)) return false;
    if (categoria && article.Categoria !== categoria) return false;
    
    const valore = Number(article.ValoreAttuale) || 0;
    if (valore < valoreMin || valore > valoreMax) return false;
    
    const stato = Number(article.ValutazioneStato) || 0;
    if (statoMin > 0 && stato < statoMin) return false;
    
    if (!presenti && article.Presente) return false;
    if (!assenti && !article.Presente) return false;
    
    const delta = valore - (Number(article.PrezzoPagato) || 0);
    if (!profit && !loss) return true;
    if (profit && !loss && delta <= 0) return false;
    if (!profit && loss && delta >= 0) return false;
    
    return true;
  });
}

// ========== PAGINAZIONE ==========
function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    renderArticles();
    updatePagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function nextPage() {
  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderArticles();
    updatePagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function updatePagination() {
  const totalItems = filteredArticles.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);
  
  document.getElementById('pageStart').textContent = totalItems > 0 ? start : 0;
  document.getElementById('pageEnd').textContent = end;
  document.getElementById('totalItems').textContent = totalItems;
  
  document.getElementById('prevBtn').disabled = currentPage === 1;
  document.getElementById('nextBtn').disabled = currentPage >= totalPages;
}

// ========== MODALS ==========
function openAddModal() {
  const modal = document.getElementById('modalAdd');
  const modalContent = modal.querySelector('.modal-add-content');
  
  window.scrollTo({ top: 0, behavior: 'instant' });
  modal.scrollTop = 0;
  if (modalContent) modalContent.scrollTop = 0;
  
  document.body.style.overflow = 'hidden';
  
  modal.style.display = 'none';
  modal.offsetHeight;
  
  modal.classList.remove('closing');
  modal.classList.add('active');
  modal.style.display = '';
}

function closeAddModal() {
  const modal = document.getElementById('modalAdd');
  modal.classList.add('closing');
  
  document.body.style.overflow = '';
  
  setTimeout(() => {
    modal.classList.remove('active', 'closing');
  }, 400);
  
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    document.getElementById('cameraContainer').classList.remove('active');
  }
}

function closeEditModal() {
  const modal = document.getElementById('modalEdit');
  modal.classList.add('closing');
  
  document.body.style.overflow = '';
  
  setTimeout(() => {
    modal.classList.remove('active', 'closing');
  }, 400);
}

function closeGraphModal() {
  const modal = document.getElementById('modalGraph');
  modal.classList.add('closing');
  
  document.body.style.overflow = '';
  
  // RIMUOVI EXPANDED DAI CRUSCOTTI
  document.querySelectorAll('.stat-card.expanded').forEach(card => {
    card.classList.remove('expanded');
  });
  
  setTimeout(() => {
    modal.classList.remove('active', 'closing');
    if (currentChart) {
      currentChart.destroy();
      currentChart = null;
    }
  }, 400);
}

function apriModifica(id) {
  const article = allArticles.find(a => a.id === id);
  if (!article) return;
  
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.body.style.overflow = 'hidden';
  
  document.getElementById('editId').value = article.id;
  document.getElementById('editNome').value = article.Nome || '';
  document.getElementById('editCategoria').value = article.Categoria || '';
  document.getElementById('editDescrizione').value = article.Descrizione || '';
  document.getElementById('editValoreAttuale').value = article.ValoreAttuale || '';
  document.getElementById('editPrezzoPagato').value = article.PrezzoPagato || '';
  document.getElementById('editStato').value = article.ValutazioneStato || '';
  document.getElementById('editPresente').checked = article.Presente || false;
  
  // Foto principale
  document.getElementById('editCurrentImageUrl').value = article.foto_principale || article.image_url || '';
  const editPreview = document.getElementById('imagePreviewEdit');
  if (article.foto_principale || article.image_url) {
    editPreview.src = article.foto_principale || article.image_url;
    editPreview.style.display = 'block';
  } else {
    editPreview.style.display = 'none';
  }
  
  // Foto 2
  document.getElementById('editCurrentImageUrl2').value = article.foto_2 || '';
  if (article.foto_2) {
    document.getElementById('imagePreviewEdit2').src = article.foto_2;
    document.getElementById('imagePreviewEdit2').style.display = 'block';
  } else {
    document.getElementById('imagePreviewEdit2').style.display = 'none';
  }
  
  // Foto 3
  document.getElementById('editCurrentImageUrl3').value = article.foto_3 || '';
  if (article.foto_3) {
    document.getElementById('imagePreviewEdit3').src = article.foto_3;
    document.getElementById('imagePreviewEdit3').style.display = 'block';
  } else {
    document.getElementById('imagePreviewEdit3').style.display = 'none';
  }
  
  // Foto 4
  document.getElementById('editCurrentImageUrl4').value = article.foto_4 || '';
  if (article.foto_4) {
    document.getElementById('imagePreviewEdit4').src = article.foto_4;
    document.getElementById('imagePreviewEdit4').style.display = 'block';
  } else {
    document.getElementById('imagePreviewEdit4').style.display = 'none';
  }
  
  // Foto 5
  document.getElementById('editCurrentImageUrl5').value = article.foto_5 || '';
  if (article.foto_5) {
    document.getElementById('imagePreviewEdit5').src = article.foto_5;
    document.getElementById('imagePreviewEdit5').style.display = 'block';
  } else {
    document.getElementById('imagePreviewEdit5').style.display = 'none';
  }
  
  // Foto 6
  document.getElementById('editCurrentImageUrl6').value = article.foto_6 || '';
  if (article.foto_6) {
    document.getElementById('imagePreviewEdit6').src = article.foto_6;
    document.getElementById('imagePreviewEdit6').style.display = 'block';
  } else {
    document.getElementById('imagePreviewEdit6').style.display = 'none';
  }
  
  // Vetrina
  document.getElementById('editInVetrina').checked = article.in_vetrina || false;
  document.getElementById('editPrezzoVendita').value = article.prezzo_vendita || '';
  document.getElementById('prezzoVenditaGroupEdit').style.display = article.in_vetrina ? 'block' : 'none';
  
  // Carte gradate
  const casaGroupEdit = document.getElementById('casaGradazioneGroupEdit');
  const votoGroupEdit = document.getElementById('votoGradazioneGroupEdit');
  const altraCasaGroupEdit = document.getElementById('altraCasaGradazioneGroupEdit');
  if (article.Categoria === 'Carte gradate' && casaGroupEdit && votoGroupEdit) {
    casaGroupEdit.style.display = 'block';
    votoGroupEdit.style.display = 'block';
    const casaEdit = document.getElementById('casaGradazioneEdit');
    const votoEdit = document.getElementById('votoGradazioneEdit');
    const altraCasaEdit = document.getElementById('altraCasaGradazioneEdit');
    if (casaEdit) casaEdit.value = article.casa_gradazione || '';
    if (votoEdit) votoEdit.value = article.voto_gradazione || '';
    if (article.casa_gradazione === 'Altra casa' && altraCasaGroupEdit && altraCasaEdit) {
      altraCasaGroupEdit.style.display = 'block';
      altraCasaEdit.value = article.altra_casa_gradazione || '';
    } else if (altraCasaGroupEdit) {
      altraCasaGroupEdit.style.display = 'none';
    }
  } else {
    if (casaGroupEdit) casaGroupEdit.style.display = 'none';
    if (votoGroupEdit) votoGroupEdit.style.display = 'none';
    if (altraCasaGroupEdit) altraCasaGroupEdit.style.display = 'none';
  }
  
  calcolaDeltaEdit();
  
  const modal = document.getElementById('modalEdit');
  modal.scrollTop = 0;
  modal.classList.add('active');
}

// ========== FORM FUNCTIONS ==========
function calcolaDeltaAdd() {
  const valore = parseFloat(document.getElementById('valoreAttualeAdd').value) || 0;
  const prezzo = parseFloat(document.getElementById('prezzoPagatoAdd').value) || 0;
  document.getElementById('deltaAdd').value = (valore - prezzo).toFixed(2);
}

function calcolaDeltaEdit() {
  const valore = parseFloat(document.getElementById('editValoreAttuale').value) || 0;
  const prezzo = parseFloat(document.getElementById('editPrezzoPagato').value) || 0;
  document.getElementById('editDelta').value = (valore - prezzo).toFixed(2);
}

function previewImage(input, previewId) {
  const preview = document.getElementById(previewId);
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      preview.src = e.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        let width = img.width;
        let height = img.height;
        const maxSize = 1920;
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.8);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadImage(file) {
  try {
    const compressed = await compressImage(file);
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    
    const { data, error } = await supabaseClient.storage
      .from('product-images')
      .upload(fileName, compressed);
    
    if (error) {
      console.error('Errore upload:', error);
      return null;
    }
    
    const { data: { publicUrl } } = supabaseClient.storage
      .from('product-images')
      .getPublicUrl(fileName);
    
    return publicUrl;
  } catch (err) {
    console.error('Errore compressione/upload:', err);
    return null;
  }
}

async function aggiungiArticolo(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const valore = parseFloat(formData.get('ValoreAttuale'));
  const prezzo = parseFloat(formData.get('PrezzoPagato'));
  const user = getCurrentUser();

  // Upload foto principale
  let fotoPrincipale = null;
  const imageFile = document.getElementById('imageInput').files[0];
  if (imageFile) {
    fotoPrincipale = await uploadImage(imageFile);
  }

  // Upload foto aggiuntive
  let foto2 = null, foto3 = null, foto4 = null, foto5 = null, foto6 = null;
  
  const imageFile2 = document.getElementById('imageInput2').files[0];
  if (imageFile2) foto2 = await uploadImage(imageFile2);
  
  const imageFile3 = document.getElementById('imageInput3').files[0];
  if (imageFile3) foto3 = await uploadImage(imageFile3);
  
  const imageFile4 = document.getElementById('imageInput4').files[0];
  if (imageFile4) foto4 = await uploadImage(imageFile4);
  
  const imageFile5 = document.getElementById('imageInput5').files[0];
  if (imageFile5) foto5 = await uploadImage(imageFile5);
  
  const imageFile6 = document.getElementById('imageInput6').files[0];
  if (imageFile6) foto6 = await uploadImage(imageFile6);

  // Dati vetrina
  const inVetrina = document.getElementById('inVetrinaAdd').checked;
  const prezzoVendita = inVetrina ? parseFloat(document.getElementById('prezzoVenditaAdd').value) : null;

  // Dati carte gradate
  const categoria = formData.get('Categoria');
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
    foto_2: foto2,
    foto_3: foto3,
    foto_4: foto4,
    foto_5: foto5,
    foto_6: foto6,
    in_vetrina: inVetrina,
    prezzo_vendita: prezzoVendita,
    casa_gradazione: casaGradazione,
    altra_casa_gradazione: altraCasaGradazione,
    voto_gradazione: votoGradazione
  };

  const { error } = await supabaseClient.from('Articoli').insert([articolo]);
  const msg = document.getElementById('addMsg');

  if (error) {
    msg.className = 'msg error';
    msg.textContent = '❌ ERRORE: ' + error.message;
    msg.style.display = 'block';
  } else {
    msg.className = 'msg success';
    msg.textContent = '✅ AGGIUNTO!';
    msg.style.display = 'block';
    form.reset();
    document.getElementById('deltaAdd').value = '';
    document.getElementById('imagePreviewAdd').style.display = 'none';
    document.getElementById('imagePreviewAdd2').style.display = 'none';
    document.getElementById('imagePreviewAdd3').style.display = 'none';
    document.getElementById('imagePreviewAdd4').style.display = 'none';
    document.getElementById('imagePreviewAdd5').style.display = 'none';
    document.getElementById('imagePreviewAdd6').style.display = 'none';
    setTimeout(() => {
      closeAddModal();
      caricaArticoli();
    }, 1500);
  }
}

async function salvaModifica(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const valore = parseFloat(formData.get('ValoreAttuale'));
  const prezzo = parseFloat(formData.get('PrezzoPagato'));
  const id = document.getElementById('editId').value;
  
  // Foto principale
  let fotoPrincipale = document.getElementById('editCurrentImageUrl').value;
  const imageFile = document.getElementById('editImageInput').files[0];
  if (imageFile) {
    const newUrl = await uploadImage(imageFile);
    if (newUrl) fotoPrincipale = newUrl;
  }
  
  // Foto 2
  let foto2 = document.getElementById('editCurrentImageUrl2').value;
  const imageFile2 = document.getElementById('editImageInput2').files[0];
  if (imageFile2) {
    const newUrl = await uploadImage(imageFile2);
    if (newUrl) foto2 = newUrl;
  }
  
  // Foto 3
  let foto3 = document.getElementById('editCurrentImageUrl3').value;
  const imageFile3 = document.getElementById('editImageInput3').files[0];
  if (imageFile3) {
    const newUrl = await uploadImage(imageFile3);
    if (newUrl) foto3 = newUrl;
  }
  
  // Foto 4
  let foto4 = document.getElementById('editCurrentImageUrl4').value;
  const imageFile4 = document.getElementById('editImageInput4').files[0];
  if (imageFile4) {
    const newUrl = await uploadImage(imageFile4);
    if (newUrl) foto4 = newUrl;
  }
  
  // Foto 5
  let foto5 = document.getElementById('editCurrentImageUrl5').value;
  const imageFile5 = document.getElementById('editImageInput5').files[0];
  if (imageFile5) {
    const newUrl = await uploadImage(imageFile5);
    if (newUrl) foto5 = newUrl;
  }
  
  // Foto 6
  let foto6 = document.getElementById('editCurrentImageUrl6').value;
  const imageFile6 = document.getElementById('editImageInput6').files[0];
  if (imageFile6) {
    const newUrl = await uploadImage(imageFile6);
    if (newUrl) foto6 = newUrl;
  }
  
  // Vetrina
  const inVetrina = document.getElementById('editInVetrina').checked;
  const prezzoVendita = inVetrina ? parseFloat(document.getElementById('editPrezzoVendita').value) : null;

  // Dati carte gradate
  const categoria = formData.get('Categoria');
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
  const msg = document.getElementById('editMsg');

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

// Chiusura modals al click esterno
document.addEventListener('click', (e) => {
  if (e.target.id === 'modalAdd') closeAddModal();
  if (e.target.id === 'modalEdit') closeEditModal();
  if (e.target.id === 'modalGraph') closeGraphModal();
});
