// ========================================
// VETRINA VENDITORE - VERSIONE DEFINITIVA
// ========================================

let currentVendorId = null;
let currentVendorUsername = null;
let currentUserId = null;
let currentProducts = [];
let currentPosts = [];
let activeTab = 'vetrina';

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

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (user) {
    currentUserId = user.id;
  }

  await loadVendorProfile(vendorUsername);
}

// ========================================
// CARICAMENTO PROFILO VENDITORE
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

  // 2. Carica TUTTI gli articoli con JOIN, poi filtro quelli del venditore
  const { data: tuttiArticoli, error: articoliError } = await supabaseClient
    .from('Articoli')
    .select(`
      *,
      Utenti (
        id,
        username
      )
    `)
    .eq('in_vetrina', true);

  console.log('📦 Tutti articoli caricati:', tuttiArticoli?.length);

  // FILTRA SOLO GLI ARTICOLI DI QUESTO VENDITORE
  const articoliVenditore = tuttiArticoli?.filter(art => 
    art.Utenti?.id === utente.id
  ) || [];

  console.log('✅ Articoli del venditore:', articoliVenditore.length);
  const totaleArticoli = articoliVenditore.length;

  // 3. Conta followers
  const { count: followersCount } = await supabaseClient
    .from('Followers')
    .select('*', { count: 'exact', head: true })
    .eq('utente_seguito_id', utente.id);

  console.log('👥 Followers:', followersCount);

  // 4. Verifica se l'utente corrente segue questo venditore
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

  // 5. Renderizza profilo
  renderVendorProfile({
    id: utente.id,
    username: utente.username,
    nome_completo: utente.nome_completo,
    citta: utente.citta,
    bio: utente.bio,
    avatar_initials: utente.username.substring(0, 2).toUpperCase(),
    member_since: new Date(utente.created_at).toLocaleDateString('it-IT', { year: 'numeric', month: 'long' }),
    totale_articoli: totaleArticoli,
    followersCount: followersCount || 0,
    isFollowing: isFollowing
  });

  // 6. Salva articoli e caricali
  currentProducts = articoliVenditore;
  renderProducts(currentProducts);

  // 7. Carica post
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
        <div class="vendor-header-avatar">${vendor.avatar_initials}</div>
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
// RENDER PRODOTTI
// ========================================
function renderProducts(products) {
  const container = document.getElementById('productsGrid');
  if (!container) return;

  console.log('🎨 Rendering', products.length, 'prodotti');

  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-box-open"></i>
        <h3>Nessun articolo disponibile</h3>
        <p>Il venditore non ha ancora pubblicato articoli</p>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(product => {
    // Usa i campi GIUSTI come nel file originale
    const mainPhoto = product.Foto1 || product.foto_principale || 'https://via.placeholder.com/300x420/1a1a1a/fbbf24?text=No+Image';
    const disponibile = product.Presente === true;
    const rating = product.ValutazioneStato || 0;

    return `
      <div class="vendor-product-card" onclick="openProduct('${product.id}')">
        <div class="vendor-product-image">
          <img src="${mainPhoto}" alt="${product.Nome}" onerror="this.src='https://via.placeholder.com/300x420/1a1a1a/fbbf24?text=No+Image'">
          ${disponibile 
            ? '<div class="product-availability-badge badge-disponibile"><i class="fas fa-check"></i> DISPONIBILE</div>'
            : '<div class="product-availability-badge badge-non-disponibile"><i class="fas fa-times"></i> NON DISPONIBILE</div>'
          }
          ${rating > 0 ? `
            <div class="vetrina-product-rating">
              <i class="fas fa-star"></i> ${rating}/10
            </div>
          ` : ''}
          <div class="product-price-badge">€${parseFloat(product.prezzo_vendita || 0).toFixed(2)}</div>
        </div>
        <div class="vendor-product-info">
          <div class="vendor-product-name">${product.Nome || 'Prodotto'}</div>
          <div class="vendor-product-category">${product.Categoria || 'Carte'}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ========================================
// CARICAMENTO POST
// ========================================
async function loadVendorPosts(utenteId) {
  console.log('📰 Caricamento post per utente:', utenteId);

  const { data, error } = await supabaseClient
    .from('PostSocial')
    .select(`
      *,
      utente:Utenti!PostSocial_utente_id_fkey (username, nome_completo)
    `)
    .eq('utente_id', utenteId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Errore caricamento post:', error);
    currentPosts = [];
  } else {
    console.log('✅ Post caricati:', data?.length);
    
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
        <button class="vendor-post-action-btn ${post.liked ? 'liked' : ''}" onclick="togglePostLike('${post.id}')">
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
    const matchesSearch = product.Nome.toLowerCase().includes(searchTerm);
    const matchesCategory = !categoryFilter || product.Categoria === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  filtered.sort((a, b) => {
    switch(sortFilter) {
      case 'price-low':
        return (a.prezzo_vendita || 0) - (b.prezzo_vendita || 0);
      case 'price-high':
        return (b.prezzo_vendita || 0) - (a.prezzo_vendita || 0);
      case 'newest':
      default:
        return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  renderProducts(filtered);
}

// ========================================
// AZIONI INTERATTIVE
// ========================================
async function togglePostLike(postId) {
  if (!currentUserId) {
    alert('Devi essere loggato per mettere like!');
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
    alert('Errore. Riprova!');
  }
}

async function toggleFollowVendor(vendorUserId) {
  if (!currentUserId) {
    alert('Devi essere loggato per seguire!');
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
    alert('Errore. Riprova!');
  }
}

function contactVendor(vendorUserId) {
  if (!currentUserId) {
    alert('Devi essere loggato per contattare!');
    return;
  }
  window.location.href = `messaggi.html?to=${vendorUserId}`;
}

function openProduct(productId) {
  window.location.href = `dettaglio-articolo.html?id=${productId}`;
}

function viewComments(postId) {
  alert(`💬 Commenti\n\nFunzione in arrivo!`);
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
  if (hours < 24) return `${hours} ore fa`;
  if (days === 1) return '1 giorno fa';
  if (days < 7) return `${days} giorni fa`;
  return date.toLocaleDateString('it-IT');
}

window.initVendorPage = initVendorPage;
window.switchTab = switchTab;
window.applyFilters = applyFilters;
window.togglePostLike = togglePostLike;
window.toggleFollowVendor = toggleFollowVendor;
window.contactVendor = contactVendor;
window.openProduct = openProduct;
window.viewComments = viewComments;
