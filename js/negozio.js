// ========================================
// LOGICA IL TUO NEGOZIO
// ========================================

let currentPage = 1;
const itemsPerPage = 10;
let allArticles = [];
let filteredArticles = [];
let currentChart = null;
let currentChartColor = 'yellow';
let stream = null;

// ========== CARICAMENTO ARTICOLI ==========
async function caricaArticoli() {
  try {
    const user = getCurrentUser(); // AGGIUNGI QUESTA RIGA
    
    const { data, error } = await supabaseClient
      .from("Articoli")
      .select("*")
      .eq('user_id', user.id) // AGGIUNGI QUESTA RIGA
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
    <div class="stat-card yellow" onclick="apriGrafico('totale', 'yellow')">
      <div class="stat-icon"><i class="fas fa-layer-group"></i></div>
      <div class="stat-label">Totale Articoli</div>
      <div class="stat-value">${totale}</div>
      <div class="stat-subtext">nel negozio</div>
    </div>
    
    <div class="stat-card green" onclick="apriGrafico('valore', 'green')">
      <div class="stat-icon"><i class="fas fa-gem"></i></div>
      <div class="stat-label">Valore Totale</div>
      <div class="stat-value">${valoreAttuale.toFixed(2)} €</div>
      <div class="stat-subtext">valore di mercato</div>
    </div>
    
    <div class="stat-card orange" onclick="apriGrafico('spesa', 'orange')">
      <div class="stat-icon"><i class="fas fa-wallet"></i></div>
      <div class="stat-label">Spesa Totale</div>
      <div class="stat-value">${prezzoPagato.toFixed(2)} €</div>
      <div class="stat-subtext">investimento iniziale</div>
    </div>
    
    <div class="stat-card blue" onclick="apriGrafico('performance', 'blue')">
      <div class="stat-icon"><i class="fas fa-rocket"></i></div>
      <div class="stat-label">Performance</div>
      <div class="stat-value">${delta >= 0 ? '+' : ''}${delta.toFixed(2)} €</div>
      <div class="stat-subtext">${delta >= 0 ? '+' : ''}${deltaPercent.toFixed(1)}%</div>
    </div>
  `;
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
        <div class="wip-subtext">Prova a modificare i filtri</div>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = pageArticles.map(article => createArticleCard(article)).join('');
}

function createArticleCard(article) {
  const delta = (Number(article.ValoreAttuale) || 0) - (Number(article.PrezzoPagato) || 0);
  const statoStelle = article.ValutazioneStato ? '⭐'.repeat(Math.min(article.ValutazioneStato, 10)) : '—';
  const presenteBadge = article.Presente 
    ? '<span class="badge presente"><i class="fas fa-check"></i> PRESENTE</span>' 
    : '<span class="badge assente"><i class="fas fa-times"></i> ASSENTE</span>';
  
  const imagePlaceholder = article.image_url 
    ? `<img src="${article.image_url}" alt="${article.Nome}">` 
    : 'NESSUNA IMMAGINE';
  
  return `
    <div class="article-card" id="card-${article.id}">
      <div class="article-header" onclick="toggleArticleCard(${article.id})">
        <div class="article-image-placeholder">
          ${imagePlaceholder}
        </div>
        <div class="article-header-info">
          <div class="article-title">
            <span class="article-title-text">${article.Nome || 'Senza nome'}</span>
            <span class="expand-icon">▼</span>
          </div>
          <div class="article-subtitle">
            <i class="fas fa-layer-group"></i> ${article.Categoria || 'Nessuna categoria'}
          </div>
        </div>
      </div>
      <div class="article-body">
        <div class="article-body-content">
          <div class="article-row">
            <span class="article-label"><i class="fas fa-gem"></i> VALORE</span>
            <span class="article-value" style="color: #10b981; font-weight: 700;">${Number(article.ValoreAttuale || 0).toFixed(2)} €</span>
          </div>
          <div class="article-row">
            <span class="article-label"><i class="fas fa-receipt"></i> PREZZO PAGATO</span>
            <span class="article-value">${Number(article.PrezzoPagato || 0).toFixed(2)} €</span>
          </div>
          <div class="article-row">
            <span class="article-label"><i class="fas fa-chart-line"></i> GUADAGNO/PERDITA</span>
            <span class="article-value" style="color: ${delta >= 0 ? '#10b981' : '#ef4444'}; font-weight: 800;">
              ${delta >= 0 ? '+' : ''}${delta.toFixed(2)} €
            </span>
          </div>
          <div class="article-row">
            <span class="article-label"><i class="fas fa-star"></i> VALUTAZIONE</span>
            <span class="article-value">${statoStelle}</span>
          </div>
          <div class="article-row">
            <span class="article-label"><i class="fas fa-warehouse"></i> STATO</span>
            <span class="article-value">${presenteBadge}</span>
          </div>
          <div class="article-actions">
            <button class="btn-edit" onclick="apriModifica(${article.id})">
              <i class="fas fa-edit"></i> MODIFICA
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function toggleArticleCard(id) {
  const card = document.getElementById(`card-${id}`);
  if (card) {
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
  document.getElementById('editCurrentImageUrl').value = article.image_url || '';
  
  const editPreview = document.getElementById('imagePreviewEdit');
  if (article.image_url) {
    editPreview.src = article.image_url;
    editPreview.style.display = 'block';
  } else {
    editPreview.style.display = 'none';
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
  const user = getCurrentUser(); // AGGIUNGI QUESTA RIGA

  let imageUrl = null;
  const imageFile = document.getElementById('imageInput').files[0];
  if (imageFile) {
    imageUrl = await uploadImage(imageFile);
  }

  const articolo = {
    user_id: user.id, // AGGIUNGI QUESTA RIGA
    Nome: formData.get('Nome'),
    Descrizione: formData.get('Descrizione') || null,
    Categoria: formData.get('Categoria') || null,
    ValoreAttuale: valore,
    PrezzoPagato: prezzo,
    Delta: valore - prezzo,
    ValutazioneStato: formData.get('ValutazioneStato') ? parseInt(formData.get('ValutazioneStato')) : null,
    Presente: formData.get('Presente') === 'on',
    image_url: imageUrl
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
  
  let imageUrl = document.getElementById('editCurrentImageUrl').value;
  const imageFile = document.getElementById('editImageInput').files[0];
  if (imageFile) {
    const newUrl = await uploadImage(imageFile);
    if (newUrl) imageUrl = newUrl;
  }

  const articolo = {
    Nome: formData.get('Nome'),
    Descrizione: formData.get('Descrizione') || null,
    Categoria: formData.get('Categoria') || null,
    ValoreAttuale: valore,
    PrezzoPagato: prezzo,
    Delta: valore - prezzo,
    ValutazioneStato: formData.get('ValutazioneStato') ? parseInt(formData.get('ValutazioneStato')) : null,
    Presente: formData.get('Presente') === 'on',
    image_url: imageUrl
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
  const user = getCurrentUser(); // AGGIUNGI QUESTA RIGA
  
  const { data, error } = await supabaseClient
    .from("Articoli")
    .select("*")
    .eq('user_id', user.id) // AGGIUNGI QUESTA RIGA
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
