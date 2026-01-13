// ========================================
// VETRINA VENDITORE - VERSIONE CON SUPABASE
// ========================================

// NOTA: Assicurati che config.js sia caricato prima di questo file
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// <script src="js/config.js"></script>

// ========================================
// VARIABILI GLOBALI
// ========================================
let currentVendorId = null;
let currentUserId = null;
let currentProducts = [];
let currentPosts = [];
let activeTab = 'vetrina';

// ========================================
// INIZIALIZZAZIONE
// ========================================
async function initVendorPage() {
  // Ottieni l'ID del venditore dalla URL
  const urlParams = new URLSearchParams(window.location.search);
  const vendorUsername = urlParams.get('vendor'); // ES: ?vendor=CardsMaster
  
  if (!vendorUsername) {
    alert('Venditore non specificato!');
    window.location.href = 'vetrine.html';
    return;
  }

  // Ottieni l'utente corrente loggato
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    currentUserId = user.id;
  }

  // Carica il profilo del venditore
  await loadVendorProfileFromDB(vendorUsername);
}

// ========================================
// CARICAMENTO PROFILO VENDITORE DA DB
// ========================================
async function loadVendorProfileFromDB(username) {
  // 1. Trova l'utente
  const { data: utente, error: utenteError } = await supabase
    .from('Utenti')
    .select('*')
    .eq('username', username)
    .single();

  if (utenteError || !utente) {
    console.error('Errore caricamento utente:', utenteError);
    alert('Venditore non trovato!');
    window.location.href = 'vetrine.html';
    return;
  }

  // 2. Trova il profilo venditore
  const { data: profilo, error: profiloError } = await supabase
    .from('ProfiloVenditore')
    .select('*')
    .eq('utente_id', utente.id)
    .single();

  if (profiloError || !profilo) {
    console.error('Errore caricamento profilo venditore:', profiloError);
    alert('Questo utente non è un venditore!');
    window.location.href = 'vetrine.html';
    return;
  }

  currentVendorId = profilo.id;

  // 3. Conta followers
  const { count: followersCount } = await supabase
    .from('Followers')
    .select('*', { count: 'exact', head: true })
    .eq('utente_seguito_id', utente.id);

  // 4. Verifica se l'utente corrente segue questo venditore
  let isFollowing = false;
  if (currentUserId) {
    const { data: followData } = await supabase
      .from('Followers')
      .select('id')
      .eq('utente_seguito_id', utente.id)
      .eq('follower_id', currentUserId)
      .single();
    
    isFollowing = !!followData;
  }

  // 5. Renderizza il profilo
  renderVendorProfile({
    id: profilo.id,
    utente_id: utente.id,
    username: utente.username,
    nome_completo: utente.nome_completo,
    citta: utente.citta,
    avatar_initials: utente.username.substring(0, 2).toUpperCase(),
    verified: profilo.verificato,
    rating: profilo.rating,
    totalReviews: profilo.totale_recensioni,
    totalSales: profilo.totale_vendite,
    totalProducts: profilo.totale_prodotti,
    responseRate: profilo.tasso_risposta,
    description: profilo.descrizione_negozio || utente.bio,
    memberSince: new Date(utente.created_at).toLocaleDateString('it-IT', { year: 'numeric', month: 'long' }),
    followersCount: followersCount || 0,
    isFollowing: isFollowing
  });

  // 6. Carica prodotti e post
  await loadVendorProductsFromDB(utente.id);
  await loadVendorPostsFromDB(utente.id);
}

// ========================================
// RENDER PROFILO VENDITORE
// ========================================
function renderVendorProfile(vendor) {
  const container = document.getElementById('vendorProfile');
  if (!container) return;

  container.innerHTML = `
    <div class="vendor-header-card">
      <div class="vendor-header-top">
        <div class="vendor-header-avatar">${vendor.avatar_initials}</div>
        <div class="vendor-header-info">
          <div class="vendor-header-name">
            <span class="vendor-name-text">${vendor.username}</span>
            ${vendor.verified ? `
              <div class="vendor-verified-badge">
                <i class="fas fa-check-circle"></i>
                Verificato
              </div>
            ` : ''}
          </div>
          <div class="vendor-header-meta">
            <div class="vendor-rating-large">
              <span class="vendor-rating-stars">★ ${vendor.rating.toFixed(1)}</span>
              <span class="vendor-rating-count">(${vendor.totalReviews} recensioni)</span>
            </div>
            ${vendor.citta ? `
              <div class="vendor-meta-item">
                <i class="fas fa-map-marker-alt"></i>
                <span>${vendor.citta}</span>
              </div>
            ` : ''}
            <div class="vendor-meta-item">
              <i class="fas fa-calendar-alt"></i>
              <span>Membro da ${vendor.memberSince}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="vendor-stats-grid">
        <div class="vendor-stat-box">
          <div class="vendor-stat-value">${vendor.totalSales}</div>
          <div class="vendor-stat-label">Vendite</div>
        </div>
        <div class="vendor-stat-box">
          <div class="vendor-stat-value">${vendor.totalProducts}</div>
          <div class="vendor-stat-label">Prodotti</div>
        </div>
        <div class="vendor-stat-box">
          <div class="vendor-stat-value">${vendor.followersCount}</div>
          <div class="vendor-stat-label">Follower</div>
        </div>
      </div>

      <div class="vendor-actions">
        <button class="vendor-action-btn vendor-action-primary" onclick="contactVendor('${vendor.utente_id}')">
          <i class="fas fa-comment"></i>
          <span>Contatta</span>
        </button>
        <button class="vendor-action-btn vendor-action-secondary ${vendor.isFollowing ? 'following' : ''}" 
                id="followBtn" 
                onclick="toggleFollowVendor('${vendor.utente_id}')">
          <i class="fas ${vendor.isFollowing ? 'fa-user-check' : 'fa-user-plus'}"></i>
          <span>${vendor.isFollowing ? 'Seguito' : 'Segui'}</span>
        </button>
      </div>
    </div>
  `;
}

// ========================================
// CARICAMENTO PRODOTTI DA DB
// ========================================
async function loadVendorProductsFromDB(utenteId) {
  // Carica dalla tabella Articoli (assumendo che esista e abbia utente_id)
  const { data, error } = await supabase
    .from('Articoli')
    .select('*')
    .eq('utente_id', utenteId) // O venditore_id se hai questo campo
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Errore caricamento prodotti:', error);
    currentProducts = [];
  } else {
    // Mappa i campi della tua tabella Articoli
    currentProducts = data.map(art => ({
      id: art.id,
      name: art.nome || art.name, // Adatta ai tuoi campi
      category: art.categoria || 'Carte Singole',
      price: parseFloat(art.prezzo || 0),
      rating: parseFloat(art.rating || 0),
      image: art.immagine_url || art.image,
      available: art.disponibile !== false,
      dateAdded: new Date(art.created_at)
    }));
  }

  renderProducts(currentProducts);
}

// ========================================
// CARICAMENTO POST DA DB
// ========================================
async function loadVendorPostsFromDB(utenteId) {
  const { data, error } = await supabase
    .from('PostSocial')
    .select(`
      *,
      utente:Utenti!PostSocial_utente_id_fkey (
        username,
        nome_completo
      )
    `)
    .eq('utente_id', utenteId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Errore caricamento post:', error);
    currentPosts = [];
  } else {
    // Verifica quali post l'utente corrente ha già likato
    let likedPosts = [];
    if (currentUserId) {
      const { data: likes } = await supabase
        .from('PostLikes')
        .select('post_id')
        .eq('utente_id', currentUserId);
      
      likedPosts = likes ? likes.map(l => l.post_id) : [];
    }

    currentPosts = data.map(post => ({
      id: post.id,
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
// RENDER PRODOTTI
// ========================================
function renderProducts(products) {
  const container = document.getElementById('productsGrid');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-box-open"></i>
        <h3>Nessun prodotto disponibile</h3>
        <p>Il venditore non ha ancora pubblicato prodotti</p>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(product => `
    <div class="vendor-product-card" onclick="openProduct('${product.id}')">
      <div class="vendor-product-image">
        <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x420/1a1a1a/fbbf24?text=No+Image'">
        ${product.rating > 0 ? `
          <div class="product-rating-badge">
            <i class="fas fa-star"></i>
            ${product.rating.toFixed(1)}
          </div>
        ` : ''}
        <div class="product-price-badge">€${product.price.toFixed(2)}</div>
      </div>
      <div class="vendor-product-info">
        <div class="vendor-product-name">${product.name}</div>
        <div class="vendor-product-category">${product.category}</div>
      </div>
    </div>
  `).join('');
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
        <h3>Nessun post disponibile</h3>
        <p>Il venditore non ha ancora pubblicato nulla</p>
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
          <img src="${post.image}" alt="Post image" onerror="this.style.display='none'">
        </div>
      ` : ''}
      <div class="vendor-post-actions">
        <button class="vendor-post-action-btn ${post.liked ? 'liked' : ''}" onclick="togglePostLikeDB('${post.id}')">
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
// GESTIONE TAB
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
// FILTRI PRODOTTI
// ========================================
function applyFilters() {
  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const categoryFilter = document.getElementById('categoryFilter')?.value || '';
  const sortFilter = document.getElementById('sortFilter')?.value || 'newest';

  let filtered = currentProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm);
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  filtered.sort((a, b) => {
    switch(sortFilter) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      case 'newest':
      default:
        return b.dateAdded - a.dateAdded;
    }
  });

  renderProducts(filtered);
}

// ========================================
// AZIONI INTERATTIVE CON DB
// ========================================
async function togglePostLikeDB(postId) {
  if (!currentUserId) {
    alert('Devi essere loggato per mettere like!');
    return;
  }

  // Trova il post nei dati locali
  const post = currentPosts.find(p => p.id === postId);
  if (!post) return;

  try {
    if (post.liked) {
      // Rimuovi like
      const { error } = await supabase
        .from('PostLikes')
        .delete()
        .eq('post_id', postId)
        .eq('utente_id', currentUserId);

      if (!error) {
        post.liked = false;
        post.likes--;
      }
    } else {
      // Aggiungi like
      const { error } = await supabase
        .from('PostLikes')
        .insert([
          {
            post_id: postId,
            utente_id: currentUserId
          }
        ]);

      if (!error) {
        post.liked = true;
        post.likes++;
      }
    }

    // Aggiorna UI
    const likesSpan = document.getElementById(`likes-${postId}`);
    if (likesSpan) {
      likesSpan.textContent = post.likes;
    }

    const btn = event.currentTarget;
    if (post.liked) {
      btn.classList.add('liked');
    } else {
      btn.classList.remove('liked');
    }

  } catch (error) {
    console.error('Errore toggle like:', error);
    alert('Errore durante l\'operazione. Riprova!');
  }
}

async function toggleFollowVendor(utenteVenditoreId) {
  if (!currentUserId) {
    alert('Devi essere loggato per seguire un venditore!');
    return;
  }

  const btn = document.getElementById('followBtn');
  const isFollowing = btn.classList.contains('following');

  try {
    if (isFollowing) {
      // Unfollow
      const { error } = await supabase
        .from('Followers')
        .delete()
        .eq('utente_seguito_id', utenteVenditoreId)
        .eq('follower_id', currentUserId);

      if (!error) {
        btn.classList.remove('following');
        btn.innerHTML = '<i class="fas fa-user-plus"></i><span>Segui</span>';
      }
    } else {
      // Follow
      const { error } = await supabase
        .from('Followers')
        .insert([
          {
            utente_seguito_id: utenteVenditoreId,
            follower_id: currentUserId
          }
        ]);

      if (!error) {
        btn.classList.add('following');
        btn.innerHTML = '<i class="fas fa-user-check"></i><span>Seguito</span>';
      }
    }
  } catch (error) {
    console.error('Errore toggle follow:', error);
    alert('Errore durante l\'operazione. Riprova!');
  }
}

async function contactVendor(utenteVenditoreId) {
  if (!currentUserId) {
    alert('Devi essere loggato per contattare un venditore!');
    return;
  }

  // Redirect alla pagina messaggi con parametro destinatario
  window.location.href = `messaggi.html?to=${utenteVenditoreId}`;
}

function openProduct(productId) {
  // Redirect alla pagina dettaglio prodotto
  window.location.href = `dettaglio-articolo.html?id=${productId}`;
}

function viewComments(postId) {
  alert(`💬 Commenti per post ${postId}\n\nFunzione in arrivo! Qui potrai vedere e aggiungere commenti.`);
  // TODO: Implementare modal commenti o redirect a pagina dettaglio post
}

// ========================================
// UTILITY
// ========================================
function formatDate(date) {
  const now = new Date();
  const diff = now - date;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (hours < 1) return 'Pochi minuti fa';
  if (hours < 24) return `${hours} ${hours === 1 ? 'ora' : 'ore'} fa`;
  if (days === 1) return '1 giorno fa';
  if (days < 7) return `${days} giorni fa`;
  return date.toLocaleDateString('it-IT');
}

// ========================================
// ESPORTA FUNZIONI GLOBALI
// ========================================
window.initVendorPage = initVendorPage;
window.switchTab = switchTab;
window.applyFilters = applyFilters;
window.togglePostLikeDB = togglePostLikeDB;
window.toggleFollowVendor = toggleFollowVendor;
window.contactVendor = contactVendor;
window.openProduct = openProduct;
window.viewComments = viewComments;
