// ========================================
// VETRINA VENDITORE - COMPATIBILE CON AUTH PERSONALIZZATO
// ========================================

let currentVendorId = null;
let currentVendorUsername = null;
let allProducts = [];
let currentProducts = [];
let currentPosts = [];
let activeTab = 'vetrina';

let currentFilters = {
  search: '',
  categoria: 'all',
  set: 'all',
  prezzoMin: 0,
  prezzoMax: Infinity,
  ratingMin: 0,
  disponibili: false
};

// ========================================
// GET CURRENT USER - USA IL TUO SISTEMA AUTH
// ========================================
function getCurrentUserId() {
  // USA IL TUO SISTEMA DI AUTH!
  const userId = localStorage.getItem('nodo_user_id');
  
  if (userId) {
    console.log('✅ Utente loggato:', userId);
    return userId;
  }
  
  console.error('❌ Utente NON loggato!');
  return null;
}

// ========================================
// INIT
// ========================================
async function initVendorPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const vendorUsername = urlParams.get('vendor');
  
  if (!vendorUsername) {
    alert('Venditore non specificato!');
    window.location.href = 'vetrine.html';
    return;
  }

  currentVendorUsername = vendorUsername;
  
  // requireAuth() è già chiamato nell'HTML
  await loadVendorProfile(vendorUsername);
}

// ========================================
// CARICAMENTO
// ========================================
async function loadVendorProfile(username) {
  console.log('🔍 Caricamento:', username);
  
  const { data: utente, error } = await supabaseClient
    .from('Utenti')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !utente) {
    console.error('❌ Errore:', error);
    alert('Venditore non trovato!');
    window.location.href = 'vetrine.html';
    return;
  }

  console.log('✅ Utente trovato');
  currentVendorId = utente.id;

  const { data: tuttiArticoli } = await supabaseClient
    .from('Articoli')
    .select('*, Utenti(id, username)')
    .eq('in_vetrina', true);

  const articoliVenditore = tuttiArticoli?.filter(art => 
    art.Utenti?.id === utente.id
  ) || [];

  console.log('✅ Articoli:', articoliVenditore.length);
  
  allProducts = articoliVenditore;
  currentProducts = [...allProducts];

  const { count: followersCount } = await supabaseClient
    .from('Followers')
    .select('*', { count: 'exact', head: true })
    .eq('utente_seguito_id', utente.id);

  const currentUserId = getCurrentUserId();
  let isFollowing = false;
  if (currentUserId) {
    const { data } = await supabaseClient
      .from('Followers')
      .select('id')
      .eq('utente_seguito_id', utente.id)
      .eq('follower_id', currentUserId)
      .single();
    isFollowing = !!data;
  }

  renderVendorProfile({
    id: utente.id,
    username: utente.username,
    nome_completo: utente.nome_completo,
    citta: utente.citta,
    bio: utente.bio,
    avatar_icon: '<i class="fas fa-user"></i>',
    member_since: new Date(utente.created_at).toLocaleDateString('it-IT', { year: 'numeric', month: 'long' }),
    totale_articoli: allProducts.length,
    followersCount: followersCount || 0,
    isFollowing: isFollowing
  });

  renderFilters();
  renderProducts(currentProducts);
  await loadVendorPosts(utente.id);
}

// ========================================
// RENDER PROFILO
// ========================================
function renderVendorProfile(vendor) {
  const container = document.getElementById('vendorProfile');
  if (!container) return;

  container.innerHTML = `
    <div class="vendor-header-card">
      <div class="vendor-header-top">
        <div class="vendor-header-avatar">${vendor.avatar_icon}</div>
        <div class="vendor-header-info">
          <div class="vendor-header-name">
            <span class="vendor-name-text">${vendor.username}</span>
          </div>
          <div class="vendor-header-meta">
            ${vendor.citta ? `
              <div class="vendor-meta-item">
                <i class="fas fa-map-marker-alt"></i>
                <span>${vendor.citta}</span>
              </div>
            ` : ''}
            <div class="vendor-meta-item">
              <i class="fas fa-calendar-alt"></i>
              <span>Membro da ${vendor.member_since}</span>
            </div>
          </div>
          ${vendor.bio ? `
            <div style="margin-top: 12px; color: #9ca3af; font-size: 14px; font-weight: 600;">
              ${vendor.bio}
            </div>
          ` : ''}
        </div>
      </div>

      <div class="vendor-stats-grid">
        <div class="vendor-stat-box">
          <div class="vendor-stat-value">${vendor.totale_articoli}</div>
          <div class="vendor-stat-label">Articoli</div>
        </div>
        <div class="vendor-stat-box">
          <div class="vendor-stat-value">${vendor.followersCount}</div>
          <div class="vendor-stat-label">Follower</div>
        </div>
      </div>

      <div class="vendor-actions">
        <button class="vendor-action-btn vendor-action-primary" onclick="contactVendor('${vendor.id}')">
          <i class="fas fa-comment"></i>
          <span>Contatta</span>
        </button>
        <button class="vendor-action-btn vendor-action-secondary ${vendor.isFollowing ? 'following' : ''}" 
                id="followBtn" 
                onclick="toggleFollowVendor('${vendor.id}')">
          <i class="fas ${vendor.isFollowing ? 'fa-user-check' : 'fa-user-plus'}"></i>
          <span>${vendor.isFollowing ? 'Seguito' : 'Segui'}</span>
        </button>
      </div>
    </div>
  `;
}

// ========================================
// RENDER FILTRI
// ========================================
function renderFilters() {
  const container = document.getElementById('filtersContainer');
  if (!container) return;

  const categorie = [...new Set(allProducts.map(p => p.Categoria).filter(Boolean))].sort();
  const sets = [...new Set(allProducts.map(p => p.Set || p.Espansione).filter(Boolean))].sort();

  container.innerHTML = `
    <div class="vendor-filter" id="vendorFilter">
      <div class="filter-header" onclick="toggleFilter()">
        <div class="filter-title">
          <i class="fas fa-filter"></i> FILTRI E RICERCA
        </div>
        <i class="fas fa-chevron-down filter-toggle-icon"></i>
      </div>
      <div class="filter-content">
        <div class="filter-body">
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-search"></i> Cerca</div>
            <input type="text" class="filter-input" id="filterSearch" placeholder="es. Charizard..." oninput="applyFilters()">
          </div>
          
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-tags"></i> Categoria</div>
            <select class="filter-select" id="filterCategoria" onchange="applyFilters()">
              <option value="all">Tutte</option>
              ${categorie.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
            </select>
          </div>
          
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-layer-group"></i> Set</div>
            <select class="filter-select" id="filterSet" onchange="applyFilters()">
              <option value="all">Tutti</option>
              ${sets.map(set => `<option value="${set}">${set}</option>`).join('')}
            </select>
          </div>
          
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-euro-sign"></i> Prezzo</div>
            <div class="filter-price-inputs">
              <input type="number" class="filter-input" id="filterPrezzoMin" placeholder="Min €" oninput="applyFilters()">
              <input type="number" class="filter-input" id="filterPrezzoMax" placeholder="Max €" oninput="applyFilters()">
            </div>
          </div>
          
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-star"></i> Rating</div>
            <select class="filter-select" id="filterRating" onchange="applyFilters()">
              <option value="0">Tutti</option>
              <option value="5">5+ ⭐</option>
              <option value="6">6+ ⭐</option>
              <option value="7">7+ ⭐</option>
              <option value="8">8+ ⭐</option>
              <option value="9">9+ ⭐</option>
              <option value="10">10 ⭐</option>
            </select>
          </div>
          
          <div class="filter-group">
            <div class="filter-label"><i class="fas fa-box"></i> Disponibilità</div>
            <div class="filter-checkboxes">
              <label class="filter-checkbox-item">
                <input type="checkbox" class="filter-checkbox" id="filterDisponibili" onchange="applyFilters()">
                <span class="filter-checkbox-label">Solo disponibili</span>
              </label>
            </div>
          </div>
          
          <div class="filter-actions">
            <button class="filter-btn filter-btn-reset" onclick="resetFilters()">
              <i class="fas fa-redo"></i> Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function toggleFilter() {
  document.getElementById('vendorFilter')?.classList.toggle('expanded');
}

function applyFilters() {
  currentFilters.search = document.getElementById('filterSearch')?.value.toLowerCase() || '';
  currentFilters.categoria = document.getElementById('filterCategoria')?.value || 'all';
  currentFilters.set = document.getElementById('filterSet')?.value || 'all';
  currentFilters.prezzoMin = parseFloat(document.getElementById('filterPrezzoMin')?.value) || 0;
  currentFilters.prezzoMax = parseFloat(document.getElementById('filterPrezzoMax')?.value) || Infinity;
  currentFilters.ratingMin = parseInt(document.getElementById('filterRating')?.value) || 0;
  currentFilters.disponibili = document.getElementById('filterDisponibili')?.checked || false;

  currentProducts = allProducts.filter(p => {
    const matchesSearch = p.Nome.toLowerCase().includes(currentFilters.search);
    const matchesCategoria = currentFilters.categoria === 'all' || p.Categoria === currentFilters.categoria;
    const matchesSet = currentFilters.set === 'all' || p.Set === currentFilters.set || p.Espansione === currentFilters.set;
    const prezzo = parseFloat(p.prezzo_vendita) || 0;
    const matchesPrezzo = prezzo >= currentFilters.prezzoMin && prezzo <= currentFilters.prezzoMax;
    const rating = p.ValutazioneStato || 0;
    const matchesRating = rating >= currentFilters.ratingMin;
    const matchesDisp = !currentFilters.disponibili || p.Presente === true;
    
    return matchesSearch && matchesCategoria && matchesSet && matchesPrezzo && matchesRating && matchesDisp;
  });

  console.log('✅ Filtrati:', currentProducts.length, '/', allProducts.length);
  renderProducts(currentProducts);
}

function resetFilters() {
  document.getElementById('filterSearch').value = '';
  document.getElementById('filterCategoria').value = 'all';
  document.getElementById('filterSet').value = 'all';
  document.getElementById('filterPrezzoMin').value = '';
  document.getElementById('filterPrezzoMax').value = '';
  document.getElementById('filterRating').value = '0';
  document.getElementById('filterDisponibili').checked = false;
  applyFilters();
}

// ========================================
// RENDER PRODOTTI - IMMAGINI SVG + RATING SOPRA PREZZO + DEBUG
// ========================================
function renderProducts(products) {
  const container = document.getElementById('productsGrid');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-box-open"></i>
        <h3>Nessun articolo</h3>
      </div>
    `;
    return;
  }

  console.log('🎨 DEBUG - Primo prodotto:', products[0]);
  console.log('🖼️ DEBUG - Foto1:', products[0].Foto1);
  console.log('🖼️ DEBUG - foto_principale:', products[0].foto_principale);
  console.log('🖼️ DEBUG - image_url:', products[0].image_url);

  container.innerHTML = products.map(p => {
    // ✅ PROVA TUTTI I CAMPI POSSIBILI
    const mainPhoto = p.Foto1 || p.foto_principale || p.image_url || p.Foto2 || p.Foto3 || '';
    
    console.log(`📦 Prodotto ${p.id} - Nome: ${p.Nome}, Foto1: ${p.Foto1}, mainPhoto: ${mainPhoto}`);
    
    // Se NON c'è foto, usa placeholder SVG
    const photoUrl = mainPhoto || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="420"%3E%3Crect fill="%231a1a1a" width="300" height="420"/%3E%3Ctext fill="%23fbbf24" font-family="Arial" font-size="24" font-weight="bold" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
    
    const disponibile = p.Presente === true;
    const rating = p.ValutazioneStato || 0;

    return `
      <div class="vendor-product-card" onclick="openProduct('${p.id}')">
        <div class="vendor-product-image">
          <img src="${photoUrl}" alt="${p.Nome}" onerror="console.error('❌ Errore caricamento immagine:', '${photoUrl}'); this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'300\\' height=\\'420\\'%3E%3Crect fill=\\'%231a1a1a\\' width=\\'300\\' height=\\'420\\'/%3E%3Ctext fill=\\'%23fbbf24\\' font-family=\\'Arial\\' font-size=\\'24\\' font-weight=\\'bold\\' x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\'%3ENo Image%3C/text%3E%3C/svg%3E'">
          ${disponibile 
            ? '<div class="product-availability-badge badge-disponibile"><i class="fas fa-check"></i> DISPONIBILE</div>'
            : '<div class="product-availability-badge badge-non-disponibile"><i class="fas fa-times"></i> ESAURITO</div>'
          }
          ${rating > 0 ? `
            <div class="vetrina-product-rating">
              <i class="fas fa-star"></i> ${rating}/10
            </div>
          ` : ''}
          <div class="product-price-badge">€${parseFloat(p.prezzo_vendita || 0).toFixed(2)}</div>
        </div>
        <div class="vendor-product-info">
          <div class="vendor-product-name">${p.Nome || 'Prodotto'}</div>
          <div class="vendor-product-category">${p.Categoria || 'Carte'}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ========================================
// POST
// ========================================
async function loadVendorPosts(utenteId) {
  const { data, error } = await supabaseClient
    .from('PostSocial')
    .select('*, utente:Utenti!PostSocial_utente_id_fkey(username)')
    .eq('utente_id', utenteId)
    .order('created_at', { ascending: false });

  if (error) {
    currentPosts = [];
  } else {
    const currentUserId = getCurrentUserId();
    
    let likedPosts = [];
    if (currentUserId) {
      const { data: likes } = await supabaseClient
        .from('PostLikes')
        .select('post_id')
        .eq('utente_id', currentUserId);
      likedPosts = likes ? likes.map(l => l.post_id) : [];
    }

    currentPosts = data.map(post => ({
      id: post.id,
      utente_id: post.utente_id,
      content: post.contenuto,
      time: formatDate(new Date(post.created_at)),
      likes: post.likes_count || 0,
      comments: post.comments_count || 0,
      liked: likedPosts.includes(post.id),
      image: post.immagine_url,
      username: post.utente?.username || 'Utente'
    }));
  }

  renderPosts(currentPosts);
}

function renderPosts(posts) {
  const container = document.getElementById('postsFeed');
  if (!container) return;

  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-newspaper"></i>
        <h3>Nessun post</h3>
      </div>
    `;
    return;
  }

  const avatarInitials = posts[0]?.username?.substring(0, 2).toUpperCase() || 'VE';
  const currentUserId = getCurrentUserId();

  container.innerHTML = posts.map(post => {
    const isMyPost = currentUserId && post.utente_id === currentUserId;
    
    return `
    <div class="vendor-post-card" id="post-${post.id}">
      <div class="vendor-post-header">
        <div class="vendor-post-avatar">${avatarInitials}</div>
        <div class="vendor-post-user">
          <h4>${post.username} ${isMyPost ? '<span class="badge-owner-small">TU</span>' : ''}</h4>
          <span>${post.time}</span>
        </div>
        ${isMyPost ? `
          <button class="vendor-post-delete-btn" onclick="deleteVendorPost('${post.id}')" title="Elimina post">
            <i class="fas fa-trash"></i>
          </button>
        ` : ''}
      </div>
      <div class="vendor-post-content">${post.content}</div>
      ${post.image ? `
        <div class="vendor-post-image">
          <img src="${post.image}" alt="Post" onerror="this.style.display='none'">
        </div>
      ` : ''}
      <div class="vendor-post-actions">
        <button class="vendor-post-action-btn ${post.liked ? 'liked' : ''} ${isMyPost ? 'disabled' : ''}" 
                onclick="togglePostLike(event, '${post.id}', '${post.utente_id}')">
          <i class="fas fa-heart"></i>
          <span id="likes-${post.id}">${post.likes}</span>
        </button>
        <button class="vendor-post-action-btn" onclick="viewComments('${post.id}')">
          <i class="fas fa-comment"></i>
          <span>${post.comments}</span>
        </button>
      </div>
    </div>
  `;
  }).join('');
}

// ========================================
// TAB
// ========================================
function switchTab(tabName) {
  activeTab = tabName;
  
  document.querySelectorAll('.vendor-tab').forEach(tab => {
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  if (tabName === 'vetrina') {
    document.getElementById('vetrinaTab').classList.add('active');
  } else if (tabName === 'posts') {
    document.getElementById('postsTab').classList.add('active');
  }
}

// ========================================
// AZIONI
// ========================================
async function togglePostLike(postId, postOwnerId) {
  console.log('💖 Toggle like:', postId);
  
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    alert('❌ Errore: Non sei loggato!');
    return;
  }

  if (postOwnerId === currentUserId) {
    alert('❌ Non puoi mettere like ai tuoi post!');
    return;
  }

  const post = currentPosts.find(p => p.id === postId);
  if (!post) return;

  try {
    if (post.liked) {
      const { error } = await supabaseClient
        .from('PostLikes')
        .delete()
        .eq('post_id', postId)
        .eq('utente_id', currentUserId);
      
      if (error) {
        console.error('❌ Errore unlike:', error);
        alert('❌ Errore: ' + error.message);
        return;
      }
      
      post.liked = false;
      post.likes--;
    } else {
      const { error } = await supabaseClient
        .from('PostLikes')
        .insert([{ post_id: postId, utente_id: currentUserId }]);
      
      if (error) {
        console.error('❌ Errore like:', error);
        alert('❌ Errore: ' + error.message);
        return;
      }
      
      post.liked = true;
      post.likes++;
    }

    // Aggiorna UI con animazione
    const likesSpan = document.getElementById(`likes-${postId}`);
    if (likesSpan) {
      likesSpan.style.transform = 'scale(1.3)';
      likesSpan.style.color = '#fbbf24';
      setTimeout(() => {
        likesSpan.textContent = post.likes;
        setTimeout(() => {
          likesSpan.style.transform = 'scale(1)';
          likesSpan.style.color = '';
        }, 150);
      }, 100);
    }

    const btn = event.currentTarget;
    if (post.liked) {
      btn.classList.add('liked');
    } else {
      btn.classList.remove('liked');
    }
  } catch (error) {
    console.error('❌ Errore:', error);
    alert('❌ Errore: ' + error.message);
  }
}

// ========================================
// ELIMINA POST (SOLO PROPRI)
// ========================================
async function deleteVendorPost(postId) {
  if (!confirm('🗑️ Sei sicuro di voler eliminare questo post?')) {
    return;
  }
  
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    alert('❌ Devi essere loggato!');
    return;
  }
  
  try {
    console.log('🗑️ Eliminazione post:', postId);
    
    // Verifica che sia il proprietario
    const post = currentPosts.find(p => p.id === postId);
    if (!post || post.utente_id !== currentUserId) {
      alert('❌ Non puoi eliminare questo post!');
      return;
    }
    
    // Elimina dal DB
    const { error } = await supabaseClient
      .from('PostSocial')
      .delete()
      .eq('id', postId)
      .eq('utente_id', currentUserId);  // Sicurezza extra
    
    if (error) {
      console.error('❌ Errore:', error);
      alert('❌ Errore eliminazione: ' + error.message);
      return;
    }
    
    console.log('✅ Post eliminato');
    
    // Rimuovi dalla UI con animazione
    const postCard = document.getElementById(`post-${postId}`);
    if (postCard) {
      postCard.style.transition = 'all 0.3s ease';
      postCard.style.opacity = '0';
      postCard.style.transform = 'scale(0.9)';
      setTimeout(() => {
        postCard.remove();
        // Rimuovi anche dall'array
        currentPosts = currentPosts.filter(p => p.id !== postId);
        
        // Se non ci sono più post, mostra empty state
        if (currentPosts.length === 0) {
          renderPosts(currentPosts);
        }
      }, 300);
    }
    
  } catch (error) {
    console.error('❌ Errore:', error);
    alert('❌ Errore: ' + error.message);
  }
}

async function toggleFollowVendor(vendorUserId) {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    alert('❌ Errore: Non sei loggato!');
    return;
  }

  if (vendorUserId === currentUserId) {
    alert('❌ Non puoi seguire te stesso!');
    return;
  }

  const btn = document.getElementById('followBtn');
  const isFollowing = btn.classList.contains('following');

  try {
    if (isFollowing) {
      // UNFOLLOW
      console.log('👥 Unfollow in corso...');
      const { error } = await supabaseClient
        .from('Followers')
        .delete()
        .eq('utente_seguito_id', vendorUserId)
        .eq('follower_id', currentUserId);
      
      if (error) {
        console.error('❌ Errore unfollow:', error);
        alert('❌ Errore: ' + error.message);
        return;
      }
      
      btn.classList.remove('following');
      btn.innerHTML = '<i class="fas fa-user-plus"></i><span>Segui</span>';
      
      // ✅ DECREMENTA COUNTER FOLLOWER con animazione
      const statBoxes = document.querySelectorAll('.vendor-stat-box .vendor-stat-value');
      if (statBoxes.length >= 2) {
        const followerCounter = statBoxes[1]; // Secondo = Follower
        const currentCount = parseInt(followerCounter.textContent) || 0;
        const newCount = Math.max(0, currentCount - 1);
        
        // Animazione
        followerCounter.style.transform = 'scale(1.4)';
        followerCounter.style.color = '#ef4444';
        setTimeout(() => {
          followerCounter.textContent = newCount;
          setTimeout(() => {
            followerCounter.style.transform = 'scale(1)';
            followerCounter.style.color = '#fbbf24';
          }, 200);
        }, 150);
        
        console.log('✅ Follower decrementati:', newCount);
      }
    } else {
      // FOLLOW
      console.log('👥 Follow in corso...');
      const { error } = await supabaseClient
        .from('Followers')
        .insert([{ utente_seguito_id: vendorUserId, follower_id: currentUserId }]);
      
      if (error) {
        console.error('❌ Errore follow:', error);
        alert('❌ Errore: ' + error.message);
        return;
      }
      
      btn.classList.add('following');
      btn.innerHTML = '<i class="fas fa-user-check"></i><span>Seguito</span>';
      
      // ✅ INCREMENTA COUNTER FOLLOWER con animazione
      const statBoxes = document.querySelectorAll('.vendor-stat-box .vendor-stat-value');
      if (statBoxes.length >= 2) {
        const followerCounter = statBoxes[1]; // Secondo = Follower
        const currentCount = parseInt(followerCounter.textContent) || 0;
        const newCount = currentCount + 1;
        
        // Animazione
        followerCounter.style.transform = 'scale(1.4)';
        followerCounter.style.color = '#10b981';
        setTimeout(() => {
          followerCounter.textContent = newCount;
          setTimeout(() => {
            followerCounter.style.transform = 'scale(1)';
            followerCounter.style.color = '#fbbf24';
          }, 200);
        }, 150);
        
        console.log('✅ Follower incrementati:', newCount);
      }
    }
  } catch (error) {
    console.error('❌ Errore catturato:', error);
    alert('❌ Errore imprevisto: ' + error.message);
  }
}

async function contactVendor(vendorUserId) {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    alert('❌ Errore: Non sei loggato!');
    return;
  }

  if (vendorUserId === currentUserId) {
    alert('❌ Non puoi messaggiare te stesso!');
    return;
  }

  window.location.href = `messaggi.html?to=${vendorUserId}`;
}

function openProduct(productId) {
  window.location.href = `dettaglio-articolo.html?id=${productId}`;
}

function viewComments(postId) {
  alert('💬 Commenti in arrivo!');
}

function formatDate(date) {
  const now = new Date();
  const diff = now - date;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (hours < 1) return 'Pochi minuti fa';
  if (hours < 24) return `${hours} ore fa`;
  if (days === 1) return '1 giorno fa';
  if (days < 7) return `${days} giorni fa`;
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

window.initVendorPage = initVendorPage;
window.switchTab = switchTab;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.toggleFilter = toggleFilter;
window.togglePostLike = togglePostLike;
window.deleteVendorPost = deleteVendorPost;
window.toggleFollowVendor = toggleFollowVendor;
window.contactVendor = contactVendor;
window.openProduct = openProduct;
window.viewComments = viewComments;
window.getCurrentUserId = getCurrentUserId;
