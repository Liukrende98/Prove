// ========================================
// VETRINA VENDITORE - ULTRA-SICURO
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
  prezzoMin: '',
  prezzoMax: '',
  ratingMin: 0,
  disponibili: false
};

// ========================================
// GET CURRENT USER - PROVA TUTTI I METODI
// ========================================
async function getCurrentUserId() {
  console.log('🔍 Ottenendo utente corrente...');
  
  // METODO 1: auth.getUser()
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user && user.id) {
      console.log('✅ Utente via auth.getUser():', user.id);
      return user.id;
    }
  } catch (error) {
    console.warn('⚠️ auth.getUser() fallito');
  }
  
  // METODO 2: getSession()
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user && session.user.id) {
      console.log('✅ Utente via getSession():', session.user.id);
      return session.user.id;
    }
  } catch (error) {
    console.warn('⚠️ getSession() fallito');
  }
  
  // METODO 3: localStorage
  try {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const parsed = JSON.parse(userData);
      if (parsed.id) {
        console.log('✅ Utente via localStorage:', parsed.id);
        return parsed.id;
      }
    }
  } catch (error) {
    console.warn('⚠️ localStorage fallito');
  }
  
  // METODO 4: sessionStorage
  try {
    const userData = sessionStorage.getItem('userData');
    if (userData) {
      const parsed = JSON.parse(userData);
      if (parsed.id) {
        console.log('✅ Utente via sessionStorage:', parsed.id);
        return parsed.id;
      }
    }
  } catch (error) {
    console.warn('⚠️ sessionStorage fallito');
  }
  
  console.error('❌ Utente NON trovato!');
  return null;
}

// ========================================
// INIZIALIZZAZIONE
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
  await loadVendorProfile(vendorUsername);
}

// ========================================
// CARICAMENTO PROFILO
// ========================================
async function loadVendorProfile(username) {
  console.log('🔍 Caricamento profilo:', username);
  
  // 1. Carica utente
  const { data: utente, error: utenteError } = await supabaseClient
    .from('Utenti')
    .select('*')
    .eq('username', username)
    .single();

  if (utenteError || !utente) {
    console.error('❌ Errore:', utenteError);
    alert('Venditore non trovato!');
    window.location.href = 'vetrine.html';
    return;
  }

  console.log('✅ Utente trovato:', utente);
  currentVendorId = utente.id;

  // 2. Carica articoli
  const { data: tuttiArticoli } = await supabaseClient
    .from('Articoli')
    .select(`
      *,
      Utenti (
        id,
        username
      )
    `)
    .eq('in_vetrina', true);

  const articoliVenditore = tuttiArticoli?.filter(art => 
    art.Utenti?.id === utente.id
  ) || [];

  console.log('✅ Articoli:', articoliVenditore.length);
  
  allProducts = articoliVenditore;
  currentProducts = [...allProducts];

  // 3. Conta followers
  const { count: followersCount } = await supabaseClient
    .from('Followers')
    .select('*', { count: 'exact', head: true })
    .eq('utente_seguito_id', utente.id);

  // 4. Verifica follow
  const currentUserId = await getCurrentUserId();
  let isFollowing = false;
  if (currentUserId) {
    const { data: followData } = await supabaseClient
      .from('Followers')
      .select('id')
      .eq('utente_seguito_id', utente.id)
      .eq('follower_id', currentUserId)
      .single();
    
    isFollowing = !!followData;
  }

  // 5. Render
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

  const categorie = getCategorie();
  const sets = getSets();

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

function getCategorie() {
  const cat = new Set();
  allProducts.forEach(a => { if (a.Categoria) cat.add(a.Categoria); });
  return Array.from(cat).sort();
}

function getSets() {
  const sets = new Set();
  allProducts.forEach(a => {
    if (a.Set) sets.add(a.Set);
    if (a.Espansione) sets.add(a.Espansione);
  });
  return Array.from(sets).sort();
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

  console.log('✅ Prodotti filtrati:', currentProducts.length, '/', allProducts.length);
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
// RENDER PRODOTTI
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

  container.innerHTML = products.map(p => {
    const mainPhoto = p.Foto1 || 'https://via.placeholder.com/300x420/1a1a1a/fbbf24?text=No+Image';
    const disponibile = p.Presente === true;
    const rating = p.ValutazioneStato || 0;

    return `
      <div class="vendor-product-card" onclick="openProduct('${p.id}')">
        <div class="vendor-product-image">
          <img src="${mainPhoto}" alt="${p.Nome}" onerror="this.src='https://via.placeholder.com/300x420/1a1a1a/fbbf24?text=No+Image'">
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
// CARICAMENTO POST
// ========================================
async function loadVendorPosts(utenteId) {
  const { data, error } = await supabaseClient
    .from('PostSocial')
    .select(`
      *,
      utente:Utenti!PostSocial_utente_id_fkey (username)
    `)
    .eq('utente_id', utenteId)
    .order('created_at', { ascending: false });

  if (error) {
    currentPosts = [];
  } else {
    const currentUserId = await getCurrentUserId();
    
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

// ========================================
// RENDER POST
// ========================================
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

  container.innerHTML = posts.map(post => `
    <div class="vendor-post-card">
      <div class="vendor-post-header">
        <div class="vendor-post-avatar">${avatarInitials}</div>
        <div class="vendor-post-user">
          <h4>${post.username}</h4>
          <span>${post.time}</span>
        </div>
      </div>
      <div class="vendor-post-content">${post.content}</div>
      ${post.image ? `
        <div class="vendor-post-image">
          <img src="${post.image}" alt="Post" onerror="this.style.display='none'">
        </div>
      ` : ''}
      <div class="vendor-post-actions">
        <button class="vendor-post-action-btn ${post.liked ? 'liked' : ''}" 
                onclick="togglePostLike('${post.id}', '${post.utente_id}')">
          <i class="fas fa-heart"></i>
          <span id="likes-${post.id}">${post.likes}</span>
        </button>
        <button class="vendor-post-action-btn" onclick="viewComments('${post.id}')">
          <i class="fas fa-comment"></i>
          <span>${post.comments}</span>
        </button>
      </div>
    </div>
  `).join('');
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
// AZIONI - PRENDE UTENTE OGNI VOLTA
// ========================================
async function togglePostLike(postId, postOwnerId) {
  console.log('💖 Toggle like post:', postId);
  
  const currentUserId = await getCurrentUserId();
  
  if (!currentUserId) {
    alert('❌ NON SEI LOGGATO!\n\n🔧 Apri Console (F12) e scrivi:\nlocalStorage.getItem("userData")\n\nPoi fai logout/login!');
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
      if (!error) {
        post.liked = false;
        post.likes--;
      }
    } else {
      const { error } = await supabaseClient
        .from('PostLikes')
        .insert([{ post_id: postId, utente_id: currentUserId }]);
      if (!error) {
        post.liked = true;
        post.likes++;
      }
    }

    const likesSpan = document.getElementById(`likes-${postId}`);
    if (likesSpan) likesSpan.textContent = post.likes;

    const btn = event.currentTarget;
    if (post.liked) {
      btn.classList.add('liked');
    } else {
      btn.classList.remove('liked');
    }
  } catch (error) {
    console.error('Errore:', error);
  }
}

async function toggleFollowVendor(vendorUserId) {
  console.log('👥 Toggle follow:', vendorUserId);
  
  const currentUserId = await getCurrentUserId();
  
  if (!currentUserId) {
    alert('❌ NON SEI LOGGATO!\n\nFai logout/login!');
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
      const { error } = await supabaseClient
        .from('Followers')
        .delete()
        .eq('utente_seguito_id', vendorUserId)
        .eq('follower_id', currentUserId);
      if (!error) {
        btn.classList.remove('following');
        btn.innerHTML = '<i class="fas fa-user-plus"></i><span>Segui</span>';
      }
    } else {
      const { error } = await supabaseClient
        .from('Followers')
        .insert([{ utente_seguito_id: vendorUserId, follower_id: currentUserId }]);
      if (!error) {
        btn.classList.add('following');
        btn.innerHTML = '<i class="fas fa-user-check"></i><span>Seguito</span>';
      }
    }
  } catch (error) {
    console.error('Errore:', error);
  }
}

async function contactVendor(vendorUserId) {
  const currentUserId = await getCurrentUserId();
  
  if (!currentUserId) {
    alert('❌ NON SEI LOGGATO!');
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
window.toggleFollowVendor = toggleFollowVendor;
window.contactVendor = contactVendor;
window.openProduct = openProduct;
window.viewComments = viewComments;
window.getCurrentUserId = getCurrentUserId;
