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
  const vendorId = urlParams.get('id');
  
  // Supporta sia ?vendor= che ?id=
  if (!vendorUsername && !vendorId) {
    alert('Venditore non specificato!');
    window.location.href = 'vetrine.html';
    return;
  }

  // Mostra loader
  if (window.NodoLoader) NodoLoader.show('Caricamento profilo...');

  if (vendorId) {
    // Carica tramite ID
    await loadVendorProfileById(vendorId);
  } else {
    // Carica tramite username
    currentVendorUsername = vendorUsername;
    await loadVendorProfile(vendorUsername);
  }
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
    if (window.NodoLoader) NodoLoader.hide();
    alert('Venditore non trovato!');
    window.location.href = 'vetrine.html';
    return;
  }

  console.log('✅ Utente trovato');
  await loadVendorData(utente);
}

// Carica profilo tramite ID
async function loadVendorProfileById(userId) {
  console.log('🔍 Caricamento tramite ID:', userId);
  
  const { data: utente, error } = await supabaseClient
    .from('Utenti')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !utente) {
    console.error('❌ Errore:', error);
    if (window.NodoLoader) NodoLoader.hide();
    alert('Venditore non trovato!');
    window.location.href = 'vetrine.html';
    return;
  }

  console.log('✅ Utente trovato:', utente.username);
  await loadVendorData(utente);
}

// Funzione condivisa per caricare dati venditore
async function loadVendorData(utente) {
  currentVendorId = utente.id;
  currentVendorUsername = utente.username;

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

  // Conta i FOLLOWER (chi segue questo utente)
  const { count: followersCount } = await supabaseClient
    .from('Followers')
    .select('*', { count: 'exact', head: true })
    .eq('utente_seguito_id', utente.id);

  // Conta i FOLLOWING (quante persone segue questo utente)
  const { count: followingCount } = await supabaseClient
    .from('Followers')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', utente.id);

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
    followingCount: followingCount || 0,
    isFollowing: isFollowing
  });

  renderFilters();
  renderProducts(currentProducts);
  await loadVendorPosts(utente.id);
  
  // Nascondi loader
  if (window.NodoLoader) NodoLoader.hide();
}

// ========================================
// RENDER PROFILO
// ========================================
function renderVendorProfile(vendor) {
  const container = document.getElementById('vendorProfile');
  if (!container) return;

  const currentUserId = getCurrentUserId();
  const isMyProfile = currentUserId === vendor.id;

  container.innerHTML = `
    <div class="vendor-header-card">
      <div class="vendor-header-top">
        <div class="vendor-header-avatar">${vendor.avatar_icon}</div>
        <div class="vendor-header-info">
          <div class="vendor-header-name">
            <span class="vendor-name-text">${vendor.username}</span>
            ${isMyProfile ? '<span class="badge-my-profile">TUO PROFILO</span>' : ''}
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
        <div class="vendor-stat-box" onclick="showArticoliList()">
          <div class="vendor-stat-value">${vendor.totale_articoli}</div>
          <div class="vendor-stat-label">Articoli</div>
        </div>
        <div class="vendor-stat-box" onclick="showFollowersList('${vendor.id}')">
          <div class="vendor-stat-value" id="followersCounter">${vendor.followersCount}</div>
          <div class="vendor-stat-label">Follower</div>
        </div>
        <div class="vendor-stat-box" onclick="showFollowingList('${vendor.id}')">
          <div class="vendor-stat-value" id="followingCounter">${vendor.followingCount}</div>
          <div class="vendor-stat-label">Seguiti</div>
        </div>
      </div>

      <div class="vendor-actions">
        ${isMyProfile ? `
          <!-- Bottone Modifica Profilo -->
          <button class="vendor-action-btn vendor-action-edit-profile" onclick="window.location.href='il-tuo-profilo.html'">
            <i class="fas fa-user-edit"></i>
            <span>Modifica Profilo</span>
          </button>
        ` : `
          <!-- Bottoni per altri profili -->
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
        `}
      </div>
    </div>
  `;
}

// ========================================
// RENDER FILTRI
// ========================================
function renderFilters() {
  // Usa il sistema NodoFiltri da filtri.js
  if (window.NodoFiltri) {
    NodoFiltri.init('filtersContainer', {
      onFilter: function(values) {
        applyNodoFilters(values);
      },
      onReset: function() {
        currentProducts = [...allProducts];
        renderProducts(currentProducts);
      }
    });
    console.log('🔍 NodoFiltri inizializzato per vetrina-venditore');
  } else {
    console.warn('⚠️ NodoFiltri non disponibile');
  }
}

// Applica filtri usando NodoFiltri
function applyNodoFilters(values) {
  currentProducts = allProducts.filter(p => {
    // Ricerca nome
    const matchSearch = !values.nome || 
      (p.Nome && p.Nome.toLowerCase().includes(values.nome)) ||
      (p.Categoria && p.Categoria.toLowerCase().includes(values.nome)) ||
      (p.espansione && p.espansione.toLowerCase().includes(values.nome));
    
    // Categoria
    const matchCategoria = !values.categoria || p.Categoria === values.categoria;
    
    // Prezzo vendita (per vetrina)
    const prezzo = parseFloat(p.prezzo_vendita || 0);
    const matchPrezzo = prezzo >= values.valoreMin && prezzo <= values.valoreMax;
    
    // Valutazione stato
    const rating = p.ValutazioneStato || 0;
    const matchRating = !values.statoMin || rating >= values.statoMin;
    
    // Disponibilità (presente fisicamente)
    const matchPresente = (values.presenti && p.Presente) || (values.assenti && !p.Presente);
    
    // Carte gradate
    let matchGraded = true;
    if (values.categoria === 'Carte gradate') {
      if (values.casaGradazione) {
        matchGraded = matchGraded && p.casa_gradazione === values.casaGradazione;
      }
      if (values.votoGradazione) {
        matchGraded = matchGraded && (p.voto_gradazione || 0) >= values.votoGradazione;
      }
    }
    
    return matchSearch && matchCategoria && matchPrezzo && matchRating && matchPresente && matchGraded;
  });

  console.log('✅ Filtrati:', currentProducts.length, '/', allProducts.length);
  renderProducts(currentProducts);
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
        <h3>Nessun articolo trovato</h3>
        <p>Prova a modificare i filtri</p>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(p => {
    // ✅ PROVA TUTTI I CAMPI POSSIBILI PER LA FOTO
    const mainPhoto = p.Foto1 || p.foto_principale || p.image_url || p.Foto2 || p.Foto3 || '';
    
    // Se NON c'è foto, usa placeholder SVG
    const photoUrl = mainPhoto || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="420"%3E%3Crect fill="%231a1a1a" width="300" height="420"/%3E%3Ctext fill="%23fbbf24" font-family="Arial" font-size="24" font-weight="bold" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
    
    const disponibile = p.Presente === true;
    const rating = p.ValutazioneStato || 0;

    return `
      <div class="vendor-product-card" onclick="openProduct('${p.id}')">
        <div class="vendor-product-image">
          <img src="${photoUrl}" alt="${p.Nome}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'300\\' height=\\'420\\'%3E%3Crect fill=\\'%231a1a1a\\' width=\\'300\\' height=\\'420\\'/%3E%3Ctext fill=\\'%23fbbf24\\' font-family=\\'Arial\\' font-size=\\'24\\' font-weight=\\'bold\\' x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\'%3ENo Image%3C/text%3E%3C/svg%3E'">
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
// LOAD POSTS
// ========================================
async function loadVendorPosts(vendorUserId) {
  console.log('📰 Caricamento post di:', vendorUserId);

  const { data, error } = await supabaseClient
    .from('PostSocial')
    .select(`
      *,
      utente:Utenti!PostSocial_utente_id_fkey (id, username)
    `)
    .eq('utente_id', vendorUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Errore caricamento post:', error);
    renderPosts([]);
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
    
    // Determina se è video
    const mediaUrl = post.image;
    const isVideo = mediaUrl && (
      mediaUrl.endsWith('.mp4') || 
      mediaUrl.endsWith('.webm') || 
      mediaUrl.endsWith('.ogg') ||
      mediaUrl.startsWith('data:video/')
    );
    
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
      ${mediaUrl ? (isVideo ? `
        <div class="vendor-post-video">
          <video controls>
            <source src="${mediaUrl}" type="video/mp4">
          </video>
        </div>
      ` : `
        <div class="vendor-post-image">
          <img src="${mediaUrl}" alt="Post" onerror="this.style.display='none'">
        </div>
      `) : ''}
      <div class="vendor-post-actions">
        <button class="vendor-post-action-btn ${post.liked ? 'liked' : ''} ${isMyPost ? 'disabled' : ''}" 
                onclick="togglePostLike(event, '${post.id}', '${post.utente_id}')">
          <i class="fas fa-heart"></i>
          <span id="likes-${post.id}">${post.likes}</span>
        </button>
        <button class="vendor-post-action-btn" onclick="showCommentsModal('${post.id}')">
          <i class="fas fa-comment"></i>
          <span id="comments-${post.id}">${post.comments}</span>
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
// AZIONI LIKE POST
// ========================================
async function togglePostLike(event, postId, postOwnerId) {
  console.log('💖 Toggle like:', postId);
  
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    alert('❌ Non sei loggato!');
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

    // Aggiorna UI
    const likesSpan = document.getElementById(`likes-${postId}`);
    if (likesSpan) likesSpan.textContent = post.likes;

    const postCard = document.getElementById(`post-${postId}`);
    if (postCard) {
      const likeButton = postCard.querySelector('.vendor-post-action-btn');
      if (likeButton) {
        if (post.liked) {
          likeButton.classList.add('liked');
        } else {
          likeButton.classList.remove('liked');
        }
      }
    }

  } catch (error) {
    console.error('❌ Errore:', error);
    alert('❌ Errore: ' + error.message);
  }
}

// ========================================
// MODAL COMMENTI - IDENTICA LOGICA COMMUNITY
// ========================================
async function showCommentsModal(postId) {
  console.log('💬 Apertura modal commenti:', postId);
  
  const modal = document.getElementById('commentsModal');
  const modalPostId = document.getElementById('modalPostId');
  
  if (!modal || !modalPostId) {
    console.error('❌ Modal elementi non trovati!');
    return;
  }
  
  modalPostId.value = postId;
  modal.style.display = 'flex';
  
  await loadComments(postId);
}

function closeCommentsModal() {
  const modal = document.getElementById('commentsModal');
  const commentInput = document.getElementById('commentInput');
  
  if (modal) modal.style.display = 'none';
  if (commentInput) commentInput.value = '';
}

async function loadComments(postId) {
  console.log('📥 Caricamento commenti per post:', postId);
  
  const container = document.getElementById('modalCommentsList');
  if (!container) {
    console.error('❌ Container commenti non trovato!');
    return;
  }
  
  container.innerHTML = '<div class="empty-state-small"><i class="fas fa-spinner fa-spin"></i><p>Caricamento...</p></div>';
  
  try {
    const { data: comments, error } = await supabaseClient
      .from('PostCommenti')
      .select(`
        *,
        utente:Utenti!PostCommenti_utente_id_fkey (id, username)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Errore caricamento commenti:', error);
      container.innerHTML = '<div class="empty-state-small">❌ Errore caricamento</div>';
      return;
    }

    if (!comments || comments.length === 0) {
      container.innerHTML = '<div class="empty-state-small"><i class="fas fa-comment-slash"></i><p>Nessun commento.<br>Sii il primo!</p></div>';
      return;
    }

    const currentUserId = getCurrentUserId();
    
    container.innerHTML = comments.map(c => {
      const isMyComment = c.utente_id === currentUserId;
      const avatarInitials = c.utente?.username?.substring(0, 2).toUpperCase() || 'U';
      
      return `
        <div class="comment-item">
          <div class="comment-avatar">${avatarInitials}</div>
          <div class="comment-content">
            <a href="vetrina-venditore.html?id=${c.utente.id}" class="comment-username">
              ${c.utente.username}
            </a>
            ${isMyComment ? '<span class="badge-small">TU</span>' : ''}
            <p>${c.contenuto}</p>
            <span class="comment-time">${formatDate(new Date(c.created_at))}</span>
          </div>
        </div>
      `;
    }).join('');

    console.log('✅ Commenti caricati:', comments.length);

  } catch (error) {
    console.error('❌ Errore catturato:', error);
    container.innerHTML = '<div class="empty-state-small">❌ Errore</div>';
  }
}

async function addComment() {
  const postId = document.getElementById('modalPostId')?.value;
  const input = document.getElementById('commentInput');
  const contenuto = input?.value.trim();
  
  if (!postId) {
    alert('❌ Errore: ID post mancante!');
    return;
  }
  
  if (!contenuto) {
    alert('❌ Scrivi un commento!');
    return;
  }
  
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    alert('❌ Devi essere loggato!');
    return;
  }
  
  console.log('💬 Aggiunta commento a post:', postId);
  
  // Mostra loader operazione
  if (window.NodoLoader) NodoLoader.showOperation('Invio commento...');
  
  try {
    const { error } = await supabaseClient
      .from('PostCommenti')
      .insert([{
        post_id: postId,
        utente_id: currentUserId,
        contenuto: contenuto
      }]);
    
    if (error) {
      console.error('❌ Errore inserimento commento:', error);
      alert('❌ Errore: ' + error.message);
      if (window.NodoLoader) NodoLoader.hideOperation();
      return;
    }
    
    console.log('✅ Commento aggiunto');
    
    // Pulisci input
    if (input) input.value = '';
    
    // Aggiorna contatore commenti
    const post = currentPosts.find(p => p.id === postId);
    if (post) {
      post.comments++;
      const commentsSpan = document.getElementById(`comments-${postId}`);
      if (commentsSpan) commentsSpan.textContent = post.comments;
    }
    
    // Nascondi loader
    if (window.NodoLoader) NodoLoader.hideOperation();
    
    // Ricarica commenti
    await loadComments(postId);
    
  } catch (error) {
    console.error('❌ Errore catturato:', error);
    alert('❌ Errore: ' + error.message);
    if (window.NodoLoader) NodoLoader.hideOperation();
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

// ========================================
// FOLLOW/UNFOLLOW
// ========================================
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
      const followerCounter = document.getElementById('followersCounter');
      if (followerCounter) {
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
      const followerCounter = document.getElementById('followersCounter');
      if (followerCounter) {
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

// ========================================
// ALTRE FUNZIONI
// ========================================
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

  // Apri chat diretta
  if (typeof openDirectChat === 'function') {
    openDirectChat(vendorUserId, currentVendorUsername);
  } else {
    console.error('❌ openDirectChat non disponibile');
  }
}

function openProduct(productId) {
  window.location.href = `dettaglio-articolo.html?id=${productId}`;
}

function formatDate(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Pochi secondi fa';
  if (minutes < 60) return `${minutes} min fa`;
  if (hours < 24) return `${hours} ore fa`;
  if (days === 1) return '1 giorno fa';
  if (days < 7) return `${days} giorni fa`;
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

// ========================================
// MODAL LISTE (ARTICOLI, FOLLOWER, FOLLOWING)
// ========================================
function showArticoliList() {
  console.log('📦 Mostra articoli - scroll alla vetrina');
  
  // Switch al tab vetrina se non è già attivo
  if (activeTab !== 'vetrina') {
    switchTab('vetrina');
  }
  
  // Scroll alla sezione vetrina con animazione
  const vetrinaTab = document.getElementById('vetrinaTab');
  if (vetrinaTab) {
    vetrinaTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function showFollowersList(userId) {
  console.log('👥 Caricamento follower di:', userId);
  followChangesInModal = false; // Reset flag
  
  const modal = document.getElementById('listModal');
  const title = document.getElementById('listModalTitle');
  const content = document.getElementById('modalListContent');
  
  if (!modal || !title || !content) {
    console.error('❌ Elementi modal non trovati!');
    return;
  }
  
  title.innerHTML = '<i class="fas fa-users"></i> Follower';
  content.innerHTML = '<div class="empty-state-small"><i class="fas fa-spinner fa-spin"></i><p>Caricamento...</p></div>';
  
  modal.style.display = 'flex';
  
  try {
    // Carica i follower con i dati degli utenti
    const { data: followers, error } = await supabaseClient
      .from('Followers')
      .select(`
        *,
        follower:Utenti!Followers_follower_id_fkey (
          id,
          username,
          nome_completo,
          citta
        )
      `)
      .eq('utente_seguito_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Errore caricamento follower:', error);
      content.innerHTML = '<div class="empty-state-small"><i class="fas fa-exclamation-circle"></i><p>Errore caricamento</p></div>';
      return;
    }
    
    if (!followers || followers.length === 0) {
      content.innerHTML = '<div class="empty-state-small"><i class="fas fa-user-slash"></i><p>Nessun follower ancora</p></div>';
      return;
    }
    
    const currentUserId = getCurrentUserId();
    
    // Controlla chi già segui
    const { data: myFollowing } = await supabaseClient
      .from('Followers')
      .select('utente_seguito_id')
      .eq('follower_id', currentUserId);
    
    const followingIds = myFollowing ? myFollowing.map(f => f.utente_seguito_id) : [];
    
    content.innerHTML = followers.map(f => {
      const user = f.follower;
      const avatarInitials = user.username.substring(0, 2).toUpperCase();
      const isMe = user.id === currentUserId;
      const isFollowing = followingIds.includes(user.id);
      
      return `
        <div class="user-list-item" onclick="window.location.href='vetrina-venditore.html?id=${user.id}'">
          <div class="user-list-avatar">${avatarInitials}</div>
          <div class="user-list-info">
            <div class="user-list-username">${user.username}</div>
            <div class="user-list-meta">
              ${user.citta ? `<i class="fas fa-map-marker-alt"></i> ${user.citta}` : 'Utente NODO'}
            </div>
          </div>
          ${!isMe ? `
            <button class="user-list-action ${isFollowing ? 'secondary' : 'primary'}" 
                    onclick="event.stopPropagation(); quickToggleFollow('${user.id}', this)">
              ${isFollowing ? 'Seguito' : 'Segui'}
            </button>
          ` : ''}
        </div>
      `;
    }).join('');
    
    console.log('✅ Follower caricati:', followers.length);
    
  } catch (error) {
    console.error('❌ Errore:', error);
    content.innerHTML = '<div class="empty-state-small"><i class="fas fa-exclamation-circle"></i><p>Errore imprevisto</p></div>';
  }
}

async function showFollowingList(userId) {
  console.log('👥 Caricamento following di:', userId);
  followChangesInModal = false; // Reset flag
  
  const modal = document.getElementById('listModal');
  const title = document.getElementById('listModalTitle');
  const content = document.getElementById('modalListContent');
  
  if (!modal || !title || !content) {
    console.error('❌ Elementi modal non trovati!');
    return;
  }
  
  title.innerHTML = '<i class="fas fa-user-friends"></i> Seguiti';
  content.innerHTML = '<div class="empty-state-small"><i class="fas fa-spinner fa-spin"></i><p>Caricamento...</p></div>';
  
  modal.style.display = 'flex';
  
  try {
    // Carica chi segue questo utente
    const { data: following, error } = await supabaseClient
      .from('Followers')
      .select(`
        *,
        seguito:Utenti!Followers_utente_seguito_id_fkey (
          id,
          username,
          nome_completo,
          citta
        )
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Errore caricamento following:', error);
      content.innerHTML = '<div class="empty-state-small"><i class="fas fa-exclamation-circle"></i><p>Errore caricamento</p></div>';
      return;
    }
    
    if (!following || following.length === 0) {
      content.innerHTML = '<div class="empty-state-small"><i class="fas fa-user-slash"></i><p>Non segue nessuno ancora</p></div>';
      return;
    }
    
    const currentUserId = getCurrentUserId();
    
    // Controlla chi già segui
    const { data: myFollowing } = await supabaseClient
      .from('Followers')
      .select('utente_seguito_id')
      .eq('follower_id', currentUserId);
    
    const followingIds = myFollowing ? myFollowing.map(f => f.utente_seguito_id) : [];
    
    content.innerHTML = following.map(f => {
      const user = f.seguito;
      const avatarInitials = user.username.substring(0, 2).toUpperCase();
      const isMe = user.id === currentUserId;
      const isFollowing = followingIds.includes(user.id);
      
      return `
        <div class="user-list-item" onclick="window.location.href='vetrina-venditore.html?id=${user.id}'">
          <div class="user-list-avatar">${avatarInitials}</div>
          <div class="user-list-info">
            <div class="user-list-username">${user.username}</div>
            <div class="user-list-meta">
              ${user.citta ? `<i class="fas fa-map-marker-alt"></i> ${user.citta}` : 'Utente NODO'}
            </div>
          </div>
          ${!isMe ? `
            <button class="user-list-action ${isFollowing ? 'secondary' : 'primary'}" 
                    onclick="event.stopPropagation(); quickToggleFollow('${user.id}', this)">
              ${isFollowing ? 'Seguito' : 'Segui'}
            </button>
          ` : ''}
        </div>
      `;
    }).join('');
    
    console.log('✅ Following caricati:', following.length);
    
  } catch (error) {
    console.error('❌ Errore:', error);
    content.innerHTML = '<div class="empty-state-small"><i class="fas fa-exclamation-circle"></i><p>Errore imprevisto</p></div>';
  }
}

// Flag per tracciare modifiche follow nel modal
var followChangesInModal = false;

async function closeListModal() {
  const modal = document.getElementById('listModal');
  if (modal) {
    modal.style.display = 'none';
  }
  
  // Se ci sono state modifiche ai follow, aggiorna i contatori
  if (followChangesInModal) {
    console.log('🔄 Aggiornamento contatori dopo modifiche follow...');
    followChangesInModal = false; // Reset flag
    
    try {
      // Recupera l'ID del venditore corrente dalla URL o usa l'utente corrente
      const urlParams = new URLSearchParams(window.location.search);
      let vendorId = urlParams.get('id');
      
      // Se non c'è id nella URL, siamo sul nostro profilo
      if (!vendorId) {
        vendorId = getCurrentUserId();
      }
      
      if (vendorId) {
        // Ricarica i contatori follower e following
        const { count: newFollowersCount } = await supabaseClient
          .from('Followers')
          .select('*', { count: 'exact', head: true })
          .eq('utente_seguito_id', vendorId);
        
        const { count: newFollowingCount } = await supabaseClient
          .from('Followers')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', vendorId);
        
        // Aggiorna i contatori nella UI
        const followersCounter = document.getElementById('followersCounter');
        const followingCounter = document.getElementById('followingCounter');
        
        if (followersCounter) {
          followersCounter.textContent = newFollowersCount || 0;
          // Animazione
          followersCounter.style.transform = 'scale(1.3)';
          followersCounter.style.color = '#10b981';
          setTimeout(() => {
            followersCounter.style.transform = 'scale(1)';
            followersCounter.style.color = '#fbbf24';
          }, 300);
        }
        
        if (followingCounter) {
          followingCounter.textContent = newFollowingCount || 0;
          // Animazione
          followingCounter.style.transform = 'scale(1.3)';
          followingCounter.style.color = '#10b981';
          setTimeout(() => {
            followingCounter.style.transform = 'scale(1)';
            followingCounter.style.color = '#fbbf24';
          }, 300);
        }
        
        console.log('✅ Contatori aggiornati - Follower:', newFollowersCount, 'Following:', newFollowingCount);
      }
    } catch (error) {
      console.error('❌ Errore aggiornamento contatori:', error);
    }
  }
}

// Toggle follow veloce dal modal (senza ricaricare tutta la pagina)
async function quickToggleFollow(targetUserId, buttonElement) {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    alert('❌ Devi essere loggato!');
    return;
  }
  
  const isFollowing = buttonElement.classList.contains('secondary');
  
  try {
    if (isFollowing) {
      // Unfollow
      const { error } = await supabaseClient
        .from('Followers')
        .delete()
        .eq('utente_seguito_id', targetUserId)
        .eq('follower_id', currentUserId);
      
      if (error) throw error;
      
      buttonElement.classList.remove('secondary');
      buttonElement.classList.add('primary');
      buttonElement.textContent = 'Segui';
      followChangesInModal = true;
      
      console.log('✅ Unfollow effettuato');
      
    } else {
      // Follow
      const { error } = await supabaseClient
        .from('Followers')
        .insert([{
          utente_seguito_id: targetUserId,
          follower_id: currentUserId
        }]);
      
      if (error) throw error;
      
      buttonElement.classList.remove('primary');
      buttonElement.classList.add('secondary');
      buttonElement.textContent = 'Seguito';
      followChangesInModal = true;
      
      console.log('✅ Follow effettuato');
    }
    
  } catch (error) {
    console.error('❌ Errore toggle follow:', error);
    alert('❌ Errore: ' + error.message);
  }
}

// ========================================
// EXPORTS
// ========================================
window.initVendorPage = initVendorPage;
window.switchTab = switchTab;
window.togglePostLike = togglePostLike;
window.showCommentsModal = showCommentsModal;
window.closeCommentsModal = closeCommentsModal;
window.loadComments = loadComments;
window.addComment = addComment;
window.deleteVendorPost = deleteVendorPost;
window.toggleFollowVendor = toggleFollowVendor;
window.contactVendor = contactVendor;
window.openProduct = openProduct;
window.getCurrentUserId = getCurrentUserId;
window.showArticoliList = showArticoliList;
window.showFollowersList = showFollowersList;
window.showFollowingList = showFollowingList;
window.closeListModal = closeListModal;
window.quickToggleFollow = quickToggleFollow;
