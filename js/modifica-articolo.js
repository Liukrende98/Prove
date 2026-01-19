// ========================================
// MODIFICA-ARTICOLO.JS
// Modulo autonomo per la modifica articoli
// Può essere usato da qualsiasi pagina
// ========================================

var editImages = [];
var editExistingUrls = [];
var MAX_IMAGES = 6;
var currentEditArticle = null;

// ========================================
// INIZIALIZZAZIONE - Inietta modal nel DOM
// ========================================
function initModificaArticolo() {
  if (document.getElementById('modalEdit')) {
    console.log('📝 Modal modifica già presente');
    return;
  }
  
  var modalHtml = `
  <div class="modal-edit" id="modalEdit">
    <div class="modal-edit-content">
      <div class="modal-header">
        <h2 class="modal-title"><i class="fas fa-edit"></i> MODIFICA ARTICOLO</h2>
        <button class="modal-close" onclick="closeEditModal()">✕</button>
      </div>

      <div id="editMsg" class="msg"></div>

      <form id="formEdit" onsubmit="salvaModifica(event)">
        <input type="hidden" id="editId">

        <div class="form-grid">
          <div class="form-group">
            <label><i class="fas fa-tag"></i> NOME</label>
            <input type="text" id="editNome" name="Nome" required>
          </div>

          <div class="form-group">
            <label><i class="fas fa-layer-group"></i> CATEGORIA</label>
            <select id="editCategoria" name="Categoria" onchange="gestisciCarteGradate(this.value, 'Edit')">
              <option value="">Seleziona...</option>
              <option value="ETB">ETB</option>
              <option value="Carte Singole">Carte Singole</option>
              <option value="Carte gradate">Carte gradate</option>
              <option value="Booster Box">Booster Box</option>
              <option value="Collection Box">Collection Box</option>
              <option value="Box mini tin">Box mini tin</option>
              <option value="Bustine">Bustine</option>
              <option value="Accessori">Accessori</option>
              <option value="Altro">Altro</option>
            </select>
          </div>

          <!-- CAMPI CARTE GRADATE -->
          <div class="form-group" id="casaGradazioneGroupEdit" style="display:none;">
            <label><i class="fas fa-certificate"></i> CASA DI GRADAZIONE *</label>
            <select id="casaGradazioneEdit" name="CasaGradazione" onchange="gestisciAltraCasa(this.value, 'Edit')">
              <option value="">Seleziona casa...</option>
              <option value="PSA">PSA</option>
              <option value="GRAAD">GRAAD</option>
              <option value="Altra casa">Altra casa</option>
            </select>
          </div>

          <div class="form-group" id="altraCasaGradazioneGroupEdit" style="display:none;">
            <label><i class="fas fa-edit"></i> SPECIFICA CASA DI GRADAZIONE *</label>
            <input type="text" id="altraCasaGradazioneEdit" name="AltraCasaGradazione" placeholder="es. BGS, CGC, etc.">
          </div>

          <div class="form-group" id="votoGradazioneGroupEdit" style="display:none;">
            <label><i class="fas fa-star"></i> VOTO GRADAZIONE *</label>
            <input type="number" id="votoGradazioneEdit" name="VotoGradazione" min="1" max="10" step="0.5" placeholder="es. 9.5">
          </div>

          <div class="form-group">
            <label><i class="fas fa-align-left"></i> DESCRIZIONE</label>
            <textarea id="editDescrizione" name="Descrizione"></textarea>
          </div>

          <div class="form-group">
            <label><i class="fas fa-box-open"></i> ESPANSIONE / SET</label>
            <input type="text" name="Espansione" id="editEspansione" placeholder="es. Scarlet & Violet, 151, Prismatic...">
          </div>

          <div class="form-group">
            <label><i class="fas fa-globe"></i> LINGUA</label>
            <select name="Lingua" id="editLingua">
              <option value="">Seleziona...</option>
              <option value="ITA">Italiano</option>
              <option value="ENG">Inglese</option>
              <option value="JAP">Giapponese</option>
              <option value="KOR">Coreano</option>
              <option value="CHN">Cinese</option>
              <option value="FRA">Francese</option>
              <option value="GER">Tedesco</option>
              <option value="SPA">Spagnolo</option>
              <option value="POR">Portoghese</option>
            </select>
          </div>

          <div class="form-group">
            <label><i class="fas fa-certificate"></i> CONDIZIONE</label>
            <select name="Condizione" id="editCondizione">
              <option value="">Seleziona...</option>
              <option value="Mint">Mint (M) - Perfetta</option>
              <option value="Near Mint">Near Mint (NM) - Quasi perfetta</option>
              <option value="Excellent">Excellent (EX) - Eccellente</option>
              <option value="Good">Good (GD) - Buona</option>
              <option value="Light Played">Light Played (LP) - Leggermente giocata</option>
              <option value="Played">Played (PL) - Giocata</option>
              <option value="Poor">Poor (P) - Scarsa</option>
            </select>
          </div>

          <div class="form-group">
            <label><i class="fas fa-gem"></i> VALORE ATTUALE (€)</label>
            <input type="number" id="editValoreAttuale" name="ValoreAttuale" step="0.01" required oninput="calcolaDeltaEdit()">
          </div>

          <div class="form-group">
            <label><i class="fas fa-receipt"></i> PREZZO PAGATO (€)</label>
            <input type="number" id="editPrezzoPagato" name="PrezzoPagato" step="0.01" required oninput="calcolaDeltaEdit()">
          </div>

          <div class="form-group">
            <label><i class="fas fa-chart-line"></i> DELTA (€)</label>
            <input type="text" id="editDelta" readonly style="background:#2a2a2a; cursor:not-allowed;">
          </div>

          <div class="form-group">
            <label><i class="fas fa-star"></i> VALUTAZIONE STATO (1-10)</label>
            <input type="number" id="editStato" name="ValutazioneStato" min="1" max="10">
          </div>

          <!-- UPLOAD FOTO -->
          <div class="form-group">
            <label><i class="fas fa-camera"></i> FOTO ARTICOLO</label>
            <input type="file" id="editImageInput" accept="image/*" multiple class="hidden-file-input" onchange="onEditImageSelect(this)">
            <div id="editImagesContainer"></div>
          </div>

          <div class="form-group" style="border-top: 2px solid #2a2a2a; padding-top: 20px; margin-top: 20px;">
            <label style="font-size: 16px; color: #fbbf24;">
              <i class="fas fa-store"></i> VETRINA
            </label>
          </div>

          <div class="checkbox-wrapper">
            <input type="checkbox" id="editInVetrina" name="InVetrina" onchange="togglePrezzoVendita()">
            <span><i class="fas fa-store-alt"></i> Metti in vetrina (visibile a tutti)</span>
          </div>

          <div class="form-group" id="prezzoVenditaGroupEdit" style="display:none;">
            <label><i class="fas fa-tag"></i> PREZZO DI VENDITA (€)</label>
            <input type="number" id="editPrezzoVendita" name="PrezzoVendita" step="0.01" min="0">
          </div>

          <div class="checkbox-wrapper">
            <input type="checkbox" id="editPresente" name="Presente">
            <span><i class="fas fa-box"></i> Articolo presente fisicamente</span>
          </div>
        </div>

        <button type="submit" class="btn-submit">
          <i class="fas fa-save"></i> SALVA MODIFICHE
        </button>

        <button type="button" class="btn-delete" onclick="eliminaArticolo()">
          <i class="fas fa-trash"></i> ELIMINA ARTICOLO
        </button>
      </form>
    </div>
  </div>
  `;
  
  // Inietta CSS se non presente
  if (!document.getElementById('modifica-articolo-styles')) {
    var styles = document.createElement('style');
    styles.id = 'modifica-articolo-styles';
    styles.textContent = `
      .modal-edit {
        display: none;
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0,0,0,0.95);
        z-index: 10000;
        overflow-y: auto;
        padding: 20px;
      }
      .modal-edit.active { display: block; }
      .modal-edit-content {
        background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
        border-radius: 24px;
        max-width: 600px;
        margin: 0 auto;
        padding: 24px;
        border: 2px solid #fbbf24;
      }
      .modal-edit .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #2a2a2a;
      }
      .modal-edit .modal-title {
        font-size: 20px;
        font-weight: 900;
        color: #fbbf24;
        margin: 0;
      }
      .modal-edit .modal-close {
        background: none;
        border: 2px solid #ef4444;
        color: #ef4444;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        font-size: 20px;
        cursor: pointer;
      }
      .modal-edit .form-grid {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .modal-edit .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .modal-edit .form-group label {
        font-size: 13px;
        font-weight: 800;
        color: #fbbf24;
        text-transform: uppercase;
      }
      .modal-edit .form-group input,
      .modal-edit .form-group select,
      .modal-edit .form-group textarea {
        padding: 14px;
        background: #0a0a0a;
        border: 2px solid #3b82f6;
        border-radius: 12px;
        color: #fff;
        font-size: 16px;
        font-weight: 600;
      }
      .modal-edit .form-group textarea {
        min-height: 100px;
        resize: vertical;
      }
      .modal-edit .checkbox-wrapper {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: rgba(59, 130, 246, 0.1);
        border-radius: 12px;
      }
      .modal-edit .checkbox-wrapper input[type="checkbox"] {
        width: 24px;
        height: 24px;
        accent-color: #fbbf24;
      }
      .modal-edit .checkbox-wrapper span {
        color: #e5e7eb;
        font-weight: 600;
      }
      .modal-edit .btn-submit {
        width: 100%;
        padding: 16px;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border: none;
        border-radius: 14px;
        color: #fff;
        font-size: 16px;
        font-weight: 900;
        cursor: pointer;
        margin-top: 20px;
      }
      .modal-edit .btn-delete {
        width: 100%;
        padding: 16px;
        background: transparent;
        border: 2px solid #ef4444;
        border-radius: 14px;
        color: #ef4444;
        font-size: 16px;
        font-weight: 900;
        cursor: pointer;
        margin-top: 12px;
      }
      .modal-edit .msg {
        padding: 12px;
        border-radius: 10px;
        margin-bottom: 15px;
        font-weight: 700;
        text-align: center;
        display: none;
      }
      .modal-edit .msg.success {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
        border: 1px solid #22c55e;
      }
      .modal-edit .msg.error {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
        border: 1px solid #ef4444;
      }
      .modal-edit .img-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      .modal-edit .img-item {
        position: relative;
        aspect-ratio: 1;
        border-radius: 12px;
        overflow: hidden;
        border: 2px solid #3b82f6;
      }
      .modal-edit .img-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .modal-edit .img-remove {
        position: absolute;
        top: 4px; right: 4px;
        width: 24px; height: 24px;
        background: #ef4444;
        border: none;
        border-radius: 50%;
        color: #fff;
        font-size: 14px;
        cursor: pointer;
      }
      .modal-edit .img-num {
        position: absolute;
        bottom: 4px; left: 4px;
        background: #fbbf24;
        color: #000;
        width: 20px; height: 20px;
        border-radius: 50%;
        font-size: 11px;
        font-weight: 900;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .modal-edit .img-add {
        aspect-ratio: 1;
        border: 2px dashed #3b82f6;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #3b82f6;
      }
      .modal-edit .img-add i { font-size: 24px; }
      .modal-edit .img-add span { font-size: 11px; margin-top: 4px; }
      .modal-edit .hidden-file-input { display: none; }
    `;
    document.head.appendChild(styles);
  }
  
  // Inietta HTML nel body
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  console.log('📝 Modal modifica inizializzato');
}

// ========================================
// APRI MODIFICA - Carica articolo e apre modal
// ========================================
async function apriModifica(articleId) {
  console.log('🔧 apriModifica chiamata con ID:', articleId);
  
  // Inizializza modal se non esiste
  initModificaArticolo();
  
  // Cerca articolo in allArticles se esiste, altrimenti carica da DB
  var article = null;
  
  if (typeof allArticles !== 'undefined' && allArticles.length > 0) {
    article = allArticles.find(function(a) { return a.id == articleId; });
  }
  
  // Se non trovato, carica da database
  if (!article) {
    console.log('🔍 Articolo non in cache, caricamento da DB...');
    if (window.NodoLoader) NodoLoader.show('Caricamento articolo...');
    
    try {
      var result = await supabaseClient
        .from('Articoli')
        .select('*')
        .eq('id', articleId)
        .single();
      
      if (result.error) throw result.error;
      article = result.data;
      
      if (window.NodoLoader) NodoLoader.hide();
    } catch (err) {
      console.error('❌ Errore caricamento articolo:', err);
      if (window.NodoLoader) NodoLoader.hide();
      alert('Errore: articolo non trovato');
      return;
    }
  }
  
  if (!article) {
    console.error('❌ Articolo non trovato per ID:', articleId);
    return;
  }
  
  currentEditArticle = article;
  console.log('📝 Apertura modifica articolo:', article);
  
  var modal = document.getElementById('modalEdit');
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
  
  // Mostra/nascondi prezzo vendita
  var prezzoGroup = document.getElementById('prezzoVenditaGroupEdit');
  if (prezzoGroup) {
    prezzoGroup.style.display = article.in_vetrina ? 'block' : 'none';
  }
  
  // Gestisci carte gradate
  gestisciCarteGradate(article.Categoria || '', 'Edit');
  
  if (article.Categoria === 'Carte gradate') {
    setTimeout(function() {
      var casaSelect = document.getElementById('casaGradazioneEdit');
      var altraCasaInput = document.getElementById('altraCasaGradazioneEdit');
      var votoInput = document.getElementById('votoGradazioneEdit');
      
      if (casaSelect) casaSelect.value = article.casa_gradazione || '';
      gestisciAltraCasa(article.casa_gradazione || '', 'Edit');
      if (altraCasaInput) altraCasaInput.value = article.altra_casa_gradazione || '';
      if (votoInput) votoInput.value = article.voto_gradazione || '';
    }, 50);
  }
  
  // Carica immagini esistenti
  loadExistingImages(article);
  
  // Reset msg
  var msg = document.getElementById('editMsg');
  if (msg) {
    msg.style.display = 'none';
    msg.textContent = '';
  }
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// ========================================
// CHIUDI MODAL
// ========================================
function closeEditModal() {
  var modal = document.getElementById('modalEdit');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    resetEditImages();
  }
}

// ========================================
// CALCOLO DELTA
// ========================================
function calcolaDeltaEdit() {
  var valore = parseFloat(document.getElementById('editValoreAttuale').value) || 0;
  var prezzo = parseFloat(document.getElementById('editPrezzoPagato').value) || 0;
  var delta = valore - prezzo;
  
  var deltaInput = document.getElementById('editDelta');
  if (deltaInput) {
    deltaInput.value = delta.toFixed(2) + ' €';
  }
}

// ========================================
// GESTIONE CARTE GRADATE
// ========================================
function gestisciCarteGradate(categoriaValue, prefix) {
  var casaGroup = document.getElementById('casaGradazioneGroup' + prefix);
  var votoGroup = document.getElementById('votoGradazioneGroup' + prefix);
  var casaSelect = document.getElementById('casaGradazione' + prefix);
  var votoInput = document.getElementById('votoGradazione' + prefix);
  var altraCasaGroup = document.getElementById('altraCasaGradazioneGroup' + prefix);
  
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
    var altraCasaInput = document.getElementById('altraCasaGradazione' + prefix);
    if (altraCasaInput) altraCasaInput.value = '';
  }
}

function gestisciAltraCasa(casaValue, prefix) {
  var altraCasaGroup = document.getElementById('altraCasaGradazioneGroup' + prefix);
  var altraCasaInput = document.getElementById('altraCasaGradazione' + prefix);
  
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

// ========================================
// TOGGLE PREZZO VENDITA
// ========================================
function togglePrezzoVendita() {
  var checkbox = document.getElementById('editInVetrina');
  var prezzoGroup = document.getElementById('prezzoVenditaGroupEdit');
  if (prezzoGroup) {
    prezzoGroup.style.display = checkbox.checked ? 'block' : 'none';
  }
}

// ========================================
// GESTIONE IMMAGINI
// ========================================
function onEditImageSelect(input) {
  var files = Array.from(input.files);
  var existingCount = editExistingUrls.filter(function(u) { return u; }).length;
  
  if (existingCount + editImages.length + files.length > MAX_IMAGES) {
    alert('Massimo ' + MAX_IMAGES + ' foto!');
    input.value = '';
    return;
  }
  
  files.forEach(function(file) {
    if (file.type.startsWith('image/')) {
      editImages.push(file);
    }
  });
  
  input.value = '';
  renderEditImages();
}

function renderEditImages() {
  var container = document.getElementById('editImagesContainer');
  if (!container) return;
  
  var existingCount = editExistingUrls.filter(function(u) { return u; }).length;
  var totalCount = existingCount + editImages.length;
  
  var html = '<div class="img-grid">';
  var num = 1;
  
  // URL esistenti
  editExistingUrls.forEach(function(url, i) {
    if (url) {
      html += '<div class="img-item">' +
        '<img src="' + url + '">' +
        '<button type="button" class="img-remove" onclick="removeExistingImage(' + i + ')">×</button>' +
        '<span class="img-num">' + (num++) + '</span>' +
      '</div>';
    }
  });
  
  // Nuovi file
  editImages.forEach(function(file, i) {
    html += '<div class="img-item">' +
      '<img src="' + URL.createObjectURL(file) + '">' +
      '<button type="button" class="img-remove" onclick="removeEditImage(' + i + ')">×</button>' +
      '<span class="img-num">' + (num++) + '</span>' +
    '</div>';
  });
  
  if (totalCount < MAX_IMAGES) {
    html += '<label class="img-add" for="editImageInput">' +
      '<i class="fas fa-plus"></i>' +
      '<span>' + totalCount + '/' + MAX_IMAGES + '</span>' +
    '</label>';
  }
  
  html += '</div>';
  container.innerHTML = html;
}

function removeEditImage(index) {
  editImages.splice(index, 1);
  renderEditImages();
}

function removeExistingImage(index) {
  editExistingUrls[index] = null;
  renderEditImages();
}

function resetEditImages() {
  editImages = [];
  editExistingUrls = [];
  var container = document.getElementById('editImagesContainer');
  if (container) container.innerHTML = '';
}

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

// ========================================
// UPLOAD IMMAGINE
// ========================================
async function uploadImageForEdit(file) {
  if (!file) return null;
  
  var userId = localStorage.getItem('nodo_user_id');
  if (!userId) return null;
  
  var fileName = userId + '/' + Date.now() + '_' + file.name;
  
  var result = await supabaseClient.storage
    .from('product-images')
    .upload(fileName, file);
  
  if (result.error) {
    console.error('❌ Errore upload:', result.error);
    return null;
  }
  
  var urlResult = supabaseClient.storage
    .from('product-images')
    .getPublicUrl(fileName);
  
  return urlResult.data.publicUrl;
}

// ========================================
// SALVA MODIFICA
// ========================================
async function salvaModifica(event) {
  event.preventDefault();
  
  if (window.NodoLoader) {
    NodoLoader.showOperation('Salvataggio modifiche...');
  }
  
  var id = document.getElementById('editId').value;
  var msg = document.getElementById('editMsg');
  msg.className = 'msg';
  msg.textContent = '⏳ Salvataggio...';
  msg.style.display = 'block';
  
  // Combina URL esistenti + nuove immagini
  var finalUrls = [];
  
  editExistingUrls.forEach(function(url) {
    if (url) finalUrls.push(url);
  });
  
  // Carica nuove immagini
  for (var i = 0; i < editImages.length; i++) {
    msg.textContent = '⏳ Caricamento foto ' + (i + 1) + '/' + editImages.length + '...';
    var url = await uploadImageForEdit(editImages[i]);
    if (url) finalUrls.push(url);
  }
  
  var valore = parseFloat(document.getElementById('editValoreAttuale').value) || 0;
  var prezzo = parseFloat(document.getElementById('editPrezzoPagato').value) || 0;
  var inVetrina = document.getElementById('editInVetrina').checked || false;
  var prezzoVendita = inVetrina ? parseFloat(document.getElementById('editPrezzoVendita').value) || null : null;
  var categoria = document.getElementById('editCategoria').value;
  
  // Campi gradazione
  var casaGradazione = null;
  var altraCasaGradazione = null;
  var votoGradazione = null;
  
  if (categoria === 'Carte gradate') {
    var casaEl = document.getElementById('casaGradazioneEdit');
    var altraCasaEl = document.getElementById('altraCasaGradazioneEdit');
    var votoEl = document.getElementById('votoGradazioneEdit');
    
    if (casaEl) casaGradazione = casaEl.value || null;
    if (casaGradazione === 'Altra casa' && altraCasaEl) altraCasaGradazione = altraCasaEl.value || null;
    if (votoEl) votoGradazione = parseFloat(votoEl.value) || null;
  }

  var articolo = {
    Nome: document.getElementById('editNome').value,
    Descrizione: document.getElementById('editDescrizione').value || null,
    Categoria: categoria || null,
    espansione: document.getElementById('editEspansione').value || null,
    lingua: document.getElementById('editLingua').value || null,
    condizione: document.getElementById('editCondizione').value || null,
    ValoreAttuale: valore,
    PrezzoPagato: prezzo,
    Delta: valore - prezzo,
    ValutazioneStato: document.getElementById('editStato').value ? parseInt(document.getElementById('editStato').value) : null,
    Presente: document.getElementById('editPresente').checked,
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

  var result = await supabaseClient.from('Articoli').update(articolo).eq('id', id);

  if (result.error) {
    msg.className = 'msg error';
    msg.textContent = '❌ ERRORE: ' + result.error.message;
    msg.style.display = 'block';
    if (window.NodoLoader) NodoLoader.hideOperation();
  } else {
    msg.className = 'msg success';
    msg.textContent = '✅ SALVATO!';
    msg.style.display = 'block';
    
    setTimeout(function() {
      closeEditModal();
      if (window.NodoLoader) NodoLoader.hideOperation();
      
      // Ricarica articoli se la funzione esiste
      if (typeof caricaArticoli === 'function') {
        caricaArticoli();
      } else {
        // Altrimenti ricarica la pagina
        window.location.reload();
      }
    }, 1500);
  }
}

// ========================================
// ELIMINA ARTICOLO
// ========================================
async function eliminaArticolo() {
  var id = document.getElementById('editId').value;
  var nome = document.getElementById('editNome').value;
  if (!confirm('⚠️ ELIMINARE "' + nome + '"?')) return;

  if (window.NodoLoader) NodoLoader.showOperation('Eliminazione...');

  var result = await supabaseClient.from('Articoli').delete().eq('id', id);
  var msg = document.getElementById('editMsg');

  if (result.error) {
    msg.className = 'msg error';
    msg.textContent = '❌ ERRORE: ' + result.error.message;
    msg.style.display = 'block';
    if (window.NodoLoader) NodoLoader.hideOperation();
  } else {
    msg.className = 'msg success';
    msg.textContent = '✅ ELIMINATO!';
    msg.style.display = 'block';
    
    setTimeout(function() {
      closeEditModal();
      if (window.NodoLoader) NodoLoader.hideOperation();
      
      // Ricarica articoli se la funzione esiste
      if (typeof caricaArticoli === 'function') {
        caricaArticoli();
      } else {
        // Altrimenti torna alla pagina negozio
        window.location.href = 'il-tuo-negozio.html';
      }
    }, 1500);
  }
}

// ========================================
// EXPORTS GLOBALI
// ========================================
window.apriModifica = apriModifica;
window.closeEditModal = closeEditModal;
window.salvaModifica = salvaModifica;
window.eliminaArticolo = eliminaArticolo;
window.calcolaDeltaEdit = calcolaDeltaEdit;
window.gestisciCarteGradate = gestisciCarteGradate;
window.gestisciAltraCasa = gestisciAltraCasa;
window.onEditImageSelect = onEditImageSelect;
window.removeEditImage = removeEditImage;
window.removeExistingImage = removeExistingImage;
window.togglePrezzoVendita = togglePrezzoVendita;

console.log('📝 Modifica-Articolo.js caricato');
