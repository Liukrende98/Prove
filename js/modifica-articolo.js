// ========================================
// MODIFICA-ARTICOLO.JS v2.0
// Modulo autonomo per la modifica articoli
// Include HTML + CSS + JS completo
// ========================================

var editImages = [];
var editExistingUrls = [];
var MAX_IMAGES = 6;
var currentEditArticle = null;

// ========================================
// INIZIALIZZAZIONE - Inietta modal e CSS nel DOM
// ========================================
function initModificaArticolo() {
  if (document.getElementById('modalEditStandalone')) {
    console.log('📝 Modal modifica già presente');
    return;
  }
  
  // CSS IDENTICO all'originale
  if (!document.getElementById('modifica-articolo-styles')) {
    var styles = document.createElement('style');
    styles.id = 'modifica-articolo-styles';
    styles.textContent = `
      /* ========== MODAL MODIFICA ========== */
      .modal-edit-standalone {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 10000;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: modalFadeIn 0.4s ease;
      }
      
      .modal-edit-standalone.active {
        display: flex;
      }
      
      .modal-edit-standalone.closing {
        animation: modalFadeOut 0.4s ease;
      }
      
      @keyframes modalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes modalFadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      .modal-edit-standalone .modal-content {
        background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
        border-radius: 28px;
        padding: 28px;
        max-width: 95vw;
        width: 100%;
        max-height: 95vh;
        overflow-y: auto;
        box-shadow: 0 20px 80px rgba(251, 191, 36, 0.4);
        animation: modalScaleIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        border: 3px solid #fbbf24;
        position: relative;
        margin: auto;
      }
      
      .modal-edit-standalone.closing .modal-content {
        animation: modalScaleOut 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }
      
      @keyframes modalScaleIn {
        from { transform: scale(0.8) rotate(-5deg); opacity: 0; }
        to { transform: scale(1) rotate(0); opacity: 1; }
      }
      
      @keyframes modalScaleOut {
        from { transform: scale(1) rotate(0); opacity: 1; }
        to { transform: scale(0.8) rotate(5deg); opacity: 0; }
      }
      
      .modal-edit-standalone .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      
      .modal-edit-standalone .modal-title {
        font-size: 24px;
        font-weight: 900;
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .modal-edit-standalone .modal-close {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: none;
        background: #2a2a2a;
        cursor: pointer;
        font-size: 24px;
        color: #e5e7eb;
        transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .modal-edit-standalone .modal-close:hover,
      .modal-edit-standalone .modal-close:active {
        background: #ef4444;
        color: #fff;
        transform: rotate(90deg);
      }
      
      /* ========== FORM ========== */
      .modal-edit-standalone .form-grid {
        display: grid;
        gap: 20px;
      }
      
      .modal-edit-standalone .form-group {
        display: flex;
        flex-direction: column;
      }
      
      .modal-edit-standalone .form-group label {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 10px;
        font-weight: 700;
        color: #fbbf24;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .modal-edit-standalone .form-group input,
      .modal-edit-standalone .form-group textarea {
        width: 100%;
        padding: 16px;
        border-radius: 16px;
        border: 2px solid #2a2a2a;
        font-size: 16px;
        transition: all 0.3s ease;
        background: #0a0a0a;
        color: #e5e7eb;
        font-weight: 500;
        box-sizing: border-box;
      }
      
      .modal-edit-standalone .form-group input::placeholder,
      .modal-edit-standalone .form-group textarea::placeholder {
        color: #6b7280;
      }
      
      .modal-edit-standalone .form-group input:focus,
      .modal-edit-standalone .form-group textarea:focus {
        outline: none;
        border-color: #3b82f6;
        background: #1a1a1a;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
      }
      
      .modal-edit-standalone .form-group textarea {
        min-height: 100px;
        resize: vertical;
        font-family: inherit;
      }
      
      .modal-edit-standalone .form-group select {
        width: 100%;
        padding: 16px;
        padding-right: 40px;
        border-radius: 16px;
        border: 2px solid #2a2a2a;
        font-size: 16px;
        transition: all 0.3s ease;
        background: #0a0a0a;
        color: #e5e7eb;
        font-weight: 500;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23fbbf24' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 16px center;
        box-sizing: border-box;
      }
      
      .modal-edit-standalone .form-group select:focus {
        outline: none;
        border-color: #3b82f6;
        background-color: #1a1a1a;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23fbbf24' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
      }
      
      .modal-edit-standalone .form-group select option {
        background: #1a1a1a;
        color: #e5e7eb;
        padding: 12px;
      }
      
      .modal-edit-standalone .checkbox-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: #0a0a0a;
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 2px solid #2a2a2a;
      }
      
      .modal-edit-standalone .checkbox-wrapper:active {
        background: #1a1a1a;
        border-color: #3a3a3a;
      }
      
      .modal-edit-standalone .checkbox-wrapper input[type="checkbox"] {
        width: 24px;
        height: 24px;
        margin-right: 14px;
        cursor: pointer;
        accent-color: #3b82f6;
      }
      
      .modal-edit-standalone .checkbox-wrapper span {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #e5e7eb;
        font-weight: 600;
      }
      
      .modal-edit-standalone .btn-submit {
        width: 100%;
        padding: 20px;
        border-radius: 16px;
        border: none;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        font-size: 18px;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        margin-top: 24px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .modal-edit-standalone .btn-submit:active {
        transform: scale(0.95);
        box-shadow: 0 12px 35px rgba(59, 130, 246, 0.6);
      }
      
      .modal-edit-standalone .btn-delete {
        width: 100%;
        padding: 16px;
        border-radius: 16px;
        border: none;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        font-size: 15px;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 1px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
        margin-top: 24px;
      }
      
      .modal-edit-standalone .btn-delete:active {
        transform: scale(0.95);
        box-shadow: 0 10px 30px rgba(239, 68, 68, 0.6);
      }
      
      /* ========== MESSAGGI ========== */
      .modal-edit-standalone .msg {
        padding: 18px 24px;
        border-radius: 16px;
        margin-bottom: 20px;
        display: none;
        font-weight: 700;
        animation: msgSlideIn 0.4s ease;
        border: 3px solid;
        font-size: 15px;
      }
      
      @keyframes msgSlideIn {
        from { opacity: 0; transform: translateX(-30px); }
        to { opacity: 1; transform: translateX(0); }
      }
      
      .modal-edit-standalone .msg.success {
        background: rgba(59, 130, 246, 0.15);
        color: #3b82f6;
        border-color: #3b82f6;
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
      }
      
      .modal-edit-standalone .msg.error {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
        border-color: #ef4444;
        box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
      }
      
      /* ========== GRIGLIA IMMAGINI ========== */
      .modal-edit-standalone .img-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-bottom: 10px;
      }
      
      .modal-edit-standalone .img-item {
        position: relative;
        aspect-ratio: 1;
        border-radius: 10px;
        overflow: hidden;
        border: 2px solid rgba(251, 191, 36, 0.3);
      }
      
      .modal-edit-standalone .img-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .modal-edit-standalone .img-remove {
        position: absolute;
        top: 5px;
        right: 5px;
        width: 24px;
        height: 24px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 50%;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .modal-edit-standalone .img-num {
        position: absolute;
        bottom: 5px;
        left: 5px;
        background: rgba(0,0,0,0.7);
        color: #fbbf24;
        font-size: 11px;
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 4px;
      }
      
      .modal-edit-standalone .img-add {
        aspect-ratio: 1;
        border: 2px dashed rgba(251, 191, 36, 0.4);
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #fbbf24;
        gap: 5px;
        background: rgba(251, 191, 36, 0.05);
      }
      
      .modal-edit-standalone .img-add i {
        font-size: 24px;
      }
      
      .modal-edit-standalone .img-add span {
        font-size: 11px;
      }
      
      .modal-edit-standalone .img-hint {
        font-size: 12px;
        color: #888;
        text-align: center;
        margin: 0;
      }
      
      .modal-edit-standalone .hidden-file-input {
        display: none;
      }
      
      .modal-edit-standalone .section-divider {
        border-top: 2px solid #2a2a2a;
        padding-top: 20px;
        margin-top: 20px;
      }
      
      .modal-edit-standalone .section-title {
        font-size: 16px;
        color: #fbbf24;
        font-weight: 700;
      }
      
      /* ========== MOBILE OPTIMIZATION ========== */
      @media (max-width: 768px) {
        .modal-edit-standalone .modal-content {
          padding: 20px;
          border-radius: 20px;
        }
        
        .modal-edit-standalone .form-group input,
        .modal-edit-standalone .form-group select,
        .modal-edit-standalone .form-group textarea {
          font-size: 16px !important;
        }
      }
    `;
    document.head.appendChild(styles);
  }
  
  // HTML del modal
  var modalHtml = '<div class="modal-edit-standalone" id="modalEditStandalone">' +
    '<div class="modal-content">' +
      '<div class="modal-header">' +
        '<h2 class="modal-title"><i class="fas fa-edit"></i> MODIFICA ARTICOLO</h2>' +
        '<button class="modal-close" onclick="closeEditModal()">✕</button>' +
      '</div>' +
      '<div id="editMsgStandalone" class="msg"></div>' +
      '<form id="formEditStandalone" onsubmit="salvaModifica(event)">' +
        '<input type="hidden" id="editIdStandalone">' +
        '<div class="form-grid">' +
          '<div class="form-group">' +
            '<label><i class="fas fa-tag"></i> NOME</label>' +
            '<input type="text" id="editNomeStandalone" name="Nome" required>' +
          '</div>' +
          '<div class="form-group">' +
            '<label><i class="fas fa-layer-group"></i> CATEGORIA</label>' +
            '<select id="editCategoriaStandalone" name="Categoria" onchange="gestisciCarteGradate(this.value, \'Standalone\')">' +
              '<option value="">Seleziona...</option>' +
              '<option value="ETB">ETB</option>' +
              '<option value="Carte Singole">Carte Singole</option>' +
              '<option value="Carte gradate">Carte gradate</option>' +
              '<option value="Booster Box">Booster Box</option>' +
              '<option value="Collection Box">Collection Box</option>' +
              '<option value="Box mini tin">Box mini tin</option>' +
              '<option value="Bustine">Bustine</option>' +
              '<option value="Accessori">Accessori</option>' +
              '<option value="Altro">Altro</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group" id="casaGradazioneGroupStandalone" style="display:none;">' +
            '<label><i class="fas fa-certificate"></i> CASA DI GRADAZIONE *</label>' +
            '<select id="casaGradazioneStandalone" name="CasaGradazione" onchange="gestisciAltraCasa(this.value, \'Standalone\')">' +
              '<option value="">Seleziona casa...</option>' +
              '<option value="PSA">PSA</option>' +
              '<option value="GRAAD">GRAAD</option>' +
              '<option value="Altra casa">Altra casa</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group" id="altraCasaGradazioneGroupStandalone" style="display:none;">' +
            '<label><i class="fas fa-edit"></i> SPECIFICA CASA DI GRADAZIONE *</label>' +
            '<input type="text" id="altraCasaGradazioneStandalone" name="AltraCasaGradazione" placeholder="es. BGS, CGC, etc.">' +
          '</div>' +
          '<div class="form-group" id="votoGradazioneGroupStandalone" style="display:none;">' +
            '<label><i class="fas fa-star"></i> VOTO GRADAZIONE *</label>' +
            '<input type="number" id="votoGradazioneStandalone" name="VotoGradazione" min="1" max="10" step="0.5" placeholder="es. 9.5">' +
          '</div>' +
          '<div class="form-group">' +
            '<label><i class="fas fa-align-left"></i> DESCRIZIONE</label>' +
            '<textarea id="editDescrizioneStandalone" name="Descrizione"></textarea>' +
          '</div>' +
          '<div class="form-group">' +
            '<label><i class="fas fa-box-open"></i> ESPANSIONE / SET</label>' +
            '<input type="text" name="Espansione" id="editEspansioneStandalone" placeholder="es. Scarlet & Violet, 151, Prismatic...">' +
          '</div>' +
          '<div class="form-group">' +
            '<label><i class="fas fa-globe"></i> LINGUA</label>' +
            '<select name="Lingua" id="editLinguaStandalone">' +
              '<option value="">Seleziona...</option>' +
              '<option value="ITA">Italiano</option>' +
              '<option value="ENG">Inglese</option>' +
              '<option value="JAP">Giapponese</option>' +
              '<option value="KOR">Coreano</option>' +
              '<option value="CHN">Cinese</option>' +
              '<option value="FRA">Francese</option>' +
              '<option value="GER">Tedesco</option>' +
              '<option value="SPA">Spagnolo</option>' +
              '<option value="POR">Portoghese</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label><i class="fas fa-certificate"></i> CONDIZIONE</label>' +
            '<select name="Condizione" id="editCondizioneStandalone">' +
              '<option value="">Seleziona...</option>' +
              '<option value="Mint">Mint (M) - Perfetta</option>' +
              '<option value="Near Mint">Near Mint (NM) - Quasi perfetta</option>' +
              '<option value="Excellent">Excellent (EX) - Eccellente</option>' +
              '<option value="Good">Good (GD) - Buona</option>' +
              '<option value="Light Played">Light Played (LP) - Leggermente giocata</option>' +
              '<option value="Played">Played (PL) - Giocata</option>' +
              '<option value="Poor">Poor (P) - Scarsa</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label><i class="fas fa-gem"></i> VALORE ATTUALE (€)</label>' +
            '<input type="number" id="editValoreAttualeStandalone" name="ValoreAttuale" step="0.01" required oninput="calcolaDeltaEdit()">' +
          '</div>' +
          '<div class="form-group">' +
            '<label><i class="fas fa-receipt"></i> PREZZO PAGATO (€)</label>' +
            '<input type="number" id="editPrezzoPagatoStandalone" name="PrezzoPagato" step="0.01" required oninput="calcolaDeltaEdit()">' +
          '</div>' +
          '<div class="form-group">' +
            '<label><i class="fas fa-chart-line"></i> DELTA (€)</label>' +
            '<input type="text" id="editDeltaStandalone" readonly style="background:#2a2a2a; cursor:not-allowed;">' +
          '</div>' +
          '<div class="form-group">' +
            '<label><i class="fas fa-star"></i> VALUTAZIONE STATO (1-10)</label>' +
            '<input type="number" id="editStatoStandalone" name="ValutazioneStato" min="1" max="10">' +
          '</div>' +
          '<div class="form-group">' +
            '<label><i class="fas fa-camera"></i> FOTO ARTICOLO</label>' +
            '<input type="file" id="editImageInputStandalone" accept="image/*" multiple class="hidden-file-input" onchange="onEditImageSelectStandalone(this)">' +
            '<div id="editImagesContainerStandalone"></div>' +
          '</div>' +
          '<div class="form-group section-divider">' +
            '<label class="section-title"><i class="fas fa-store"></i> VETRINA</label>' +
          '</div>' +
          '<div class="checkbox-wrapper" onclick="document.getElementById(\'editInVetrinaStandalone\').click()">' +
            '<input type="checkbox" id="editInVetrinaStandalone" name="InVetrina" onchange="togglePrezzoVenditaStandalone()">' +
            '<span><i class="fas fa-store-alt"></i> Metti in vetrina (visibile a tutti)</span>' +
          '</div>' +
          '<div class="form-group" id="prezzoVenditaGroupStandalone" style="display:none;">' +
            '<label><i class="fas fa-tag"></i> PREZZO DI VENDITA (€)</label>' +
            '<input type="number" id="editPrezzoVenditaStandalone" name="PrezzoVendita" step="0.01" min="0">' +
          '</div>' +
          '<div class="checkbox-wrapper" onclick="document.getElementById(\'editPresenteStandalone\').click()">' +
            '<input type="checkbox" id="editPresenteStandalone" name="Presente">' +
            '<span><i class="fas fa-box"></i> Articolo presente fisicamente</span>' +
          '</div>' +
        '</div>' +
        '<button type="submit" class="btn-submit">' +
          '<i class="fas fa-save"></i> SALVA MODIFICHE' +
        '</button>' +
        '<button type="button" class="btn-delete" onclick="eliminaArticolo()">' +
          '<i class="fas fa-trash"></i> ELIMINA ARTICOLO' +
        '</button>' +
      '</form>' +
    '</div>' +
  '</div>';
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  console.log('📝 Modal modifica standalone inizializzato');
}

// ========================================
// APRI MODIFICA
// ========================================
async function apriModifica(articleId) {
  console.log('🔧 apriModifica chiamata con ID:', articleId);
  
  initModificaArticolo();
  
  var article = null;
  
  if (typeof allArticles !== 'undefined' && allArticles.length > 0) {
    article = allArticles.find(function(a) { return a.id == articleId; });
  }
  
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
  
  var modal = document.getElementById('modalEditStandalone');
  if (!modal) return;
  
  document.getElementById('editIdStandalone').value = article.id;
  document.getElementById('editNomeStandalone').value = article.Nome || '';
  document.getElementById('editDescrizioneStandalone').value = article.Descrizione || '';
  document.getElementById('editCategoriaStandalone').value = article.Categoria || '';
  document.getElementById('editEspansioneStandalone').value = article.espansione || '';
  document.getElementById('editLinguaStandalone').value = article.lingua || '';
  document.getElementById('editCondizioneStandalone').value = article.condizione || '';
  document.getElementById('editValoreAttualeStandalone').value = article.ValoreAttuale || 0;
  document.getElementById('editPrezzoPagatoStandalone').value = article.PrezzoPagato || 0;
  document.getElementById('editDeltaStandalone').value = ((article.ValoreAttuale || 0) - (article.PrezzoPagato || 0)).toFixed(2) + ' €';
  document.getElementById('editStatoStandalone').value = article.ValutazioneStato || '';
  document.getElementById('editPresenteStandalone').checked = article.Presente || false;
  document.getElementById('editInVetrinaStandalone').checked = article.in_vetrina || false;
  document.getElementById('editPrezzoVenditaStandalone').value = article.prezzo_vendita || '';
  
  var prezzoGroup = document.getElementById('prezzoVenditaGroupStandalone');
  if (prezzoGroup) {
    prezzoGroup.style.display = article.in_vetrina ? 'block' : 'none';
  }
  
  gestisciCarteGradate(article.Categoria || '', 'Standalone');
  
  if (article.Categoria === 'Carte gradate') {
    setTimeout(function() {
      var casaSelect = document.getElementById('casaGradazioneStandalone');
      var altraCasaInput = document.getElementById('altraCasaGradazioneStandalone');
      var votoInput = document.getElementById('votoGradazioneStandalone');
      
      if (casaSelect) casaSelect.value = article.casa_gradazione || '';
      gestisciAltraCasa(article.casa_gradazione || '', 'Standalone');
      if (altraCasaInput) altraCasaInput.value = article.altra_casa_gradazione || '';
      if (votoInput) votoInput.value = article.voto_gradazione || '';
    }, 50);
  }
  
  loadExistingImagesStandalone(article);
  
  var msg = document.getElementById('editMsgStandalone');
  if (msg) {
    msg.style.display = 'none';
    msg.textContent = '';
  }
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeEditModal() {
  var modal = document.getElementById('modalEditStandalone');
  if (modal) {
    modal.classList.add('closing');
    setTimeout(function() {
      modal.classList.remove('active', 'closing');
      document.body.style.overflow = '';
      resetEditImagesStandalone();
    }, 400);
  }
}

function calcolaDeltaEdit() {
  var valore = parseFloat(document.getElementById('editValoreAttualeStandalone').value) || 0;
  var prezzo = parseFloat(document.getElementById('editPrezzoPagatoStandalone').value) || 0;
  var delta = valore - prezzo;
  var deltaInput = document.getElementById('editDeltaStandalone');
  if (deltaInput) {
    deltaInput.value = delta.toFixed(2) + ' €';
  }
}

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
    if (casaSelect) { casaSelect.required = false; casaSelect.value = ''; }
    if (votoInput) { votoInput.required = false; votoInput.value = ''; }
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
    if (altraCasaInput) { altraCasaInput.required = false; altraCasaInput.value = ''; }
  }
}

function togglePrezzoVenditaStandalone() {
  var checkbox = document.getElementById('editInVetrinaStandalone');
  var prezzoGroup = document.getElementById('prezzoVenditaGroupStandalone');
  if (prezzoGroup) {
    prezzoGroup.style.display = checkbox.checked ? 'block' : 'none';
  }
}

function onEditImageSelectStandalone(input) {
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
  renderEditImagesStandalone();
}

function renderEditImagesStandalone() {
  var container = document.getElementById('editImagesContainerStandalone');
  if (!container) return;
  var existingCount = editExistingUrls.filter(function(u) { return u; }).length;
  var totalCount = existingCount + editImages.length;
  var html = '<div class="img-grid">';
  var num = 1;
  editExistingUrls.forEach(function(url, i) {
    if (url) {
      html += '<div class="img-item"><img src="' + url + '"><button type="button" class="img-remove" onclick="removeExistingImageStandalone(' + i + ')">×</button><span class="img-num">' + (num++) + '</span></div>';
    }
  });
  editImages.forEach(function(file, i) {
    html += '<div class="img-item"><img src="' + URL.createObjectURL(file) + '"><button type="button" class="img-remove" onclick="removeEditImageStandalone(' + i + ')">×</button><span class="img-num">' + (num++) + '</span></div>';
  });
  if (totalCount < MAX_IMAGES) {
    html += '<label class="img-add" for="editImageInputStandalone"><i class="fas fa-plus"></i><span>' + totalCount + '/' + MAX_IMAGES + '</span></label>';
  }
  html += '</div>';
  container.innerHTML = html;
}

function removeEditImageStandalone(index) {
  editImages.splice(index, 1);
  renderEditImagesStandalone();
}

function removeExistingImageStandalone(index) {
  editExistingUrls[index] = null;
  renderEditImagesStandalone();
}

function resetEditImagesStandalone() {
  editImages = [];
  editExistingUrls = [];
  var container = document.getElementById('editImagesContainerStandalone');
  if (container) container.innerHTML = '';
}

function loadExistingImagesStandalone(article) {
  editImages = [];
  editExistingUrls = [
    article.foto_principale || article.image_url || null,
    article.foto_2 || null,
    article.foto_3 || null,
    article.foto_4 || null,
    article.foto_5 || null,
    article.foto_6 || null
  ];
  renderEditImagesStandalone();
}

async function uploadImageForEdit(file) {
  if (!file) return null;
  var userId = localStorage.getItem('nodo_user_id');
  if (!userId) return null;
  var fileName = userId + '/' + Date.now() + '_' + file.name;
  var result = await supabaseClient.storage.from('product-images').upload(fileName, file);
  if (result.error) { console.error('❌ Errore upload:', result.error); return null; }
  var urlResult = supabaseClient.storage.from('product-images').getPublicUrl(fileName);
  return urlResult.data.publicUrl;
}

async function salvaModifica(event) {
  event.preventDefault();
  if (window.NodoLoader) NodoLoader.showOperation('Salvataggio modifiche...');
  var id = document.getElementById('editIdStandalone').value;
  var msg = document.getElementById('editMsgStandalone');
  msg.className = 'msg';
  msg.textContent = '⏳ Salvataggio...';
  msg.style.display = 'block';
  var finalUrls = [];
  editExistingUrls.forEach(function(url) { if (url) finalUrls.push(url); });
  for (var i = 0; i < editImages.length; i++) {
    msg.textContent = '⏳ Caricamento foto ' + (i + 1) + '/' + editImages.length + '...';
    var url = await uploadImageForEdit(editImages[i]);
    if (url) finalUrls.push(url);
  }
  var valore = parseFloat(document.getElementById('editValoreAttualeStandalone').value) || 0;
  var prezzo = parseFloat(document.getElementById('editPrezzoPagatoStandalone').value) || 0;
  var inVetrina = document.getElementById('editInVetrinaStandalone').checked || false;
  var prezzoVendita = inVetrina ? parseFloat(document.getElementById('editPrezzoVenditaStandalone').value) || null : null;
  var categoria = document.getElementById('editCategoriaStandalone').value;
  var casaGradazione = null, altraCasaGradazione = null, votoGradazione = null;
  if (categoria === 'Carte gradate') {
    var casaEl = document.getElementById('casaGradazioneStandalone');
    var altraCasaEl = document.getElementById('altraCasaGradazioneStandalone');
    var votoEl = document.getElementById('votoGradazioneStandalone');
    if (casaEl) casaGradazione = casaEl.value || null;
    if (casaGradazione === 'Altra casa' && altraCasaEl) altraCasaGradazione = altraCasaEl.value || null;
    if (votoEl) votoGradazione = parseFloat(votoEl.value) || null;
  }
  var articolo = {
    Nome: document.getElementById('editNomeStandalone').value,
    Descrizione: document.getElementById('editDescrizioneStandalone').value || null,
    Categoria: categoria || null,
    espansione: document.getElementById('editEspansioneStandalone').value || null,
    lingua: document.getElementById('editLinguaStandalone').value || null,
    condizione: document.getElementById('editCondizioneStandalone').value || null,
    ValoreAttuale: valore,
    PrezzoPagato: prezzo,
    Delta: valore - prezzo,
    ValutazioneStato: document.getElementById('editStatoStandalone').value ? parseInt(document.getElementById('editStatoStandalone').value) : null,
    Presente: document.getElementById('editPresenteStandalone').checked,
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
      if (typeof caricaArticoli === 'function') { caricaArticoli(); } else { window.location.reload(); }
    }, 1500);
  }
}

async function eliminaArticolo() {
  var id = document.getElementById('editIdStandalone').value;
  var nome = document.getElementById('editNomeStandalone').value;
  if (!confirm('⚠️ ELIMINARE "' + nome + '"?')) return;
  if (window.NodoLoader) NodoLoader.showOperation('Eliminazione...');
  var result = await supabaseClient.from('Articoli').delete().eq('id', id);
  var msg = document.getElementById('editMsgStandalone');
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
      if (typeof caricaArticoli === 'function') { caricaArticoli(); } else { window.location.href = 'il-tuo-negozio.html'; }
    }, 1500);
  }
}

window.apriModifica = apriModifica;
window.closeEditModal = closeEditModal;
window.salvaModifica = salvaModifica;
window.eliminaArticolo = eliminaArticolo;
window.calcolaDeltaEdit = calcolaDeltaEdit;
window.gestisciCarteGradate = gestisciCarteGradate;
window.gestisciAltraCasa = gestisciAltraCasa;
window.onEditImageSelectStandalone = onEditImageSelectStandalone;
window.removeEditImageStandalone = removeEditImageStandalone;
window.removeExistingImageStandalone = removeExistingImageStandalone;
window.togglePrezzoVenditaStandalone = togglePrezzoVenditaStandalone;

console.log('📝 Modifica-Articolo.js v2.0 caricato');
