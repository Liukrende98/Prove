// ========================================
// MODIFICA-ARTICOLO.JS v4.0
// SOLO LOGICA - Il modal HTML deve essere nella pagina
// ========================================

var editImages = [];
var editExistingUrls = [];
var MAX_IMAGES = 6;
var currentEditArticle = null;

// ========================================
// APRI MODIFICA
// ========================================
async function apriModifica(articleId) {
  console.log('🔧 apriModifica chiamata con ID:', articleId);
  
  var modal = document.getElementById('modalEdit');
  if (!modal) {
    console.error('❌ Modal #modalEdit non trovato nella pagina!');
    alert('Errore: modal modifica non presente');
    return;
  }
  
  var article = null;
  
  // Cerca in cache se disponibile
  if (typeof allArticles !== 'undefined' && allArticles && allArticles.length > 0) {
    article = allArticles.find(function(a) { return a.id == articleId; });
    if (article) console.log('📦 Articolo trovato in cache');
  }
  
  // Se non trovato, carica da DB
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
  
  // Popola i campi
  document.getElementById('editId').value = article.id;
  document.getElementById('editNome').value = article.Nome || '';
  document.getElementById('editDescrizione').value = article.Descrizione || '';
  
  // Gestisci categoria - se non è predefinita, usa "Altro" + campo testo
  var categoriePredefinite = ['ETB', 'Carte Singole', 'Carte gradate', 'Master Set', 'Booster Box', 'Collection Box', 'Box mini tin', 'Bustine', 'Poké Ball', 'Accessori', 'Altro', ''];
  var categoriaArticolo = article.Categoria || '';
  
  if (categoriePredefinite.includes(categoriaArticolo)) {
    document.getElementById('editCategoria').value = categoriaArticolo;
  } else {
    // Categoria personalizzata - seleziona "Altro" e popola il campo
    document.getElementById('editCategoria').value = 'Altro';
    gestisciCarteGradate('Altro', 'Edit'); // Mostra il campo specifica categoria
    setTimeout(function() {
      var altraCatInput = document.getElementById('altraCategoriaEdit');
      if (altraCatInput) altraCatInput.value = categoriaArticolo;
    }, 50);
  }
  
  document.getElementById('editEspansione').value = article.espansione || '';
  
  // Seleziona bandierina lingua
  document.getElementById('editLingua').value = article.lingua || '';
  var linguaGrid = document.getElementById('linguaEditGrid');
  if (linguaGrid) {
    linguaGrid.querySelectorAll('.form-flag-btn').forEach(function(btn) {
      btn.classList.remove('active');
      if (btn.getAttribute('data-lang') === (article.lingua || '')) {
        btn.classList.add('active');
      }
    });
  }
  
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
  var prezzoGroup = document.getElementById('prezzoVenditaGroupEdit');
  if (prezzoGroup) {
    prezzoGroup.style.display = article.in_vetrina ? 'block' : 'none';
  }
  
  // Gestisci carte gradate - solo se categoria è predefinita
  if (categoriePredefinite.includes(categoriaArticolo)) {
    gestisciCarteGradate(categoriaArticolo, 'Edit');
  }
  
  if (article.Categoria === 'Carte gradate') {
    console.log('🏆 Carte gradate - Casa:', article.casa_gradazione, 'Voto:', article.voto_gradazione);
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
    modal.classList.add('closing');
    setTimeout(function() {
      modal.classList.remove('active', 'closing');
      document.body.style.overflow = '';
      resetEditImages();
    }, 400);
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
  var altraCategoriaGroup = document.getElementById('altraCategoriaGroup' + prefix);
  var altraCategoriaInput = document.getElementById('altraCategoria' + prefix);
  
  // Gestione Carte Gradate
  if (casaGroup && votoGroup) {
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
  
  // Gestione Altro
  if (altraCategoriaGroup) {
    if (categoriaValue === 'Altro') {
      altraCategoriaGroup.style.display = 'block';
      if (altraCategoriaInput) altraCategoriaInput.required = true;
    } else {
      altraCategoriaGroup.style.display = 'none';
      if (altraCategoriaInput) {
        altraCategoriaInput.required = false;
        altraCategoriaInput.value = '';
      }
    }
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

// ========================================
// TOGGLE PREZZO VENDITA
// ========================================
function togglePrezzoVenditaEdit() {
  var checkbox = document.getElementById('editInVetrina');
  var prezzoGroup = document.getElementById('prezzoVenditaGroupEdit');
  if (prezzoGroup && checkbox) {
    prezzoGroup.style.display = checkbox.checked ? 'block' : 'none';
  }
}

// ========================================
// GESTIONE IMMAGINI
// ========================================
function onEditImageSelect(input) {
  var files = Array.from(input.files);
  var existingCount = editExistingUrls.filter(function(u) { return u; }).length;
  console.log('📸 EDIT - File selezionati:', files.length, 'Esistenti:', existingCount);
  
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
  
  editExistingUrls.forEach(function(url, i) {
    if (url) {
      html += '<div class="img-item"><img src="' + url + '"><button type="button" class="img-remove" onclick="removeExistingImage(' + i + ')">×</button><span class="img-num">' + (num++) + '</span></div>';
    }
  });
  
  editImages.forEach(function(file, i) {
    html += '<div class="img-item"><img src="' + URL.createObjectURL(file) + '"><button type="button" class="img-remove" onclick="removeEditImage(' + i + ')">×</button><span class="img-num">' + (num++) + '</span></div>';
  });
  
  if (totalCount < MAX_IMAGES) {
    html += '<label class="img-add" for="editImageInput"><i class="fas fa-plus"></i><span>' + totalCount + '/' + MAX_IMAGES + '</span></label>';
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
async function uploadImage(file) {
  if (!file) return null;
  
  var user = null;
  if (typeof getCurrentUser === 'function') {
    user = getCurrentUser();
  }
  var userId = user ? user.id : localStorage.getItem('nodo_user_id');
  
  if (!userId) return null;
  
  var fileName = userId + '/' + Date.now() + '_' + file.name;
  
  var result = await supabaseClient.storage.from('product-images').upload(fileName, file);
  
  if (result.error) {
    console.error('❌ Errore upload:', result.error);
    return null;
  }
  
  var urlResult = supabaseClient.storage.from('product-images').getPublicUrl(fileName);
  return urlResult.data.publicUrl;
}

// ========================================
// SALVA MODIFICA
// ========================================
async function salvaModifica(event) {
  event.preventDefault();
  
  if (window.NodoLoader) NodoLoader.showOperation('Salvataggio modifiche...');
  
  var id = document.getElementById('editId').value;
  var formData = new FormData(event.target);
  var msg = document.getElementById('editMsg');
  
  msg.className = 'msg';
  msg.textContent = '⏳ Salvataggio...';
  msg.style.display = 'block';
  
  // Combina URL esistenti + nuove immagini
  var finalUrls = [];
  
  editExistingUrls.forEach(function(url) {
    if (url) finalUrls.push(url);
  });
  
  for (var i = 0; i < editImages.length; i++) {
    msg.textContent = '⏳ Caricamento foto ' + (i + 1) + '/' + editImages.length + '...';
    var url = await uploadImage(editImages[i]);
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
  
  // Se categoria è "Altro", usa il valore scritto dall'utente
  var categoriaFinale = categoria;
  if (categoria === 'Altro') {
    var altraCatEl = document.getElementById('altraCategoriaEdit');
    if (altraCatEl && altraCatEl.value.trim()) {
      categoriaFinale = altraCatEl.value.trim();
    }
  }

  var articolo = {
    Nome: formData.get('Nome'),
    Descrizione: formData.get('Descrizione') || null,
    Categoria: categoriaFinale || null,
    espansione: document.getElementById('editEspansione').value || null,
    lingua: document.getElementById('editLingua').value || null,
    condizione: document.getElementById('editCondizione').value || null,
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
      
      if (typeof caricaArticoli === 'function') {
        caricaArticoli();
      } else {
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
window.togglePrezzoVenditaEdit = togglePrezzoVenditaEdit;
window.renderEditImages = renderEditImages;
window.loadExistingImages = loadExistingImages;
window.resetEditImages = resetEditImages;
window.uploadImage = uploadImage;

// Seleziona lingua con bandierine nei FORM (per dettaglio-articolo)
function selectFormLanguageDetail(btn) {
  // Rimuovi active da tutti i bottoni nella stessa griglia
  var grid = document.getElementById('linguaEditGrid');
  if (grid) {
    grid.querySelectorAll('.form-flag-btn').forEach(function(b) {
      b.classList.remove('active');
    });
  }
  
  // Aggiungi active al selezionato
  btn.classList.add('active');
  
  // Aggiorna valore nascosto
  var lang = btn.getAttribute('data-lang');
  var hiddenInput = document.getElementById('editLingua');
  if (hiddenInput) {
    hiddenInput.value = lang;
  }
}

window.selectFormLanguageDetail = selectFormLanguageDetail;

console.log('📝 Modifica-Articolo.js v4.0 caricato (solo logica)');
