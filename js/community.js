// ========================================
// COMMUNITY.JS - COMPATIBILE CON AUTH PERSONALIZZATO
// ========================================

let allPosts = [];
let filteredPosts = [];

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
// INIZIALIZZAZIONE
// ========================================
async function initCommunityPage() {
  console.log('🚀 INIT Community Page');
  
  // requireAuth() è già chiamato nell'HTML, quindi se arrivi qui sei loggato
  const userId = getCurrentUserId();
  if (!userId) {
    console.error('❌ Errore: userId null ma requireAuth non ha reindirizzato!');
    return;
  }
  
  console.log('✅ Utente verificato:', userId);
  
  await loadCommunityContentFromDB();
}

// ========================================
// CARICAMENTO POST
// ========================================
async function loadCommunityContentFromDB() {
  console.log('📰 Caricamento post...');
  const container = document.getElementById('communityContainer');
  if (!container) {
    console.error('❌ Container non trovato!');
    return;
  }

  container.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-spinner fa-spin"></i>
      <h3>Caricamento...</h3>
    </div>
  `;

  try {
    const { data: posts, error } = await supabaseClient
      .from('PostSocial')
      .select(`
        *,
        utente:Utenti!PostSocial_utente_id_fkey (
          id,
          username,
          nome_completo
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    console.log('📦 Query result:', { postsCount: posts?.length, error });

    if (error) {
      console.error('❌ Errore query:', error);
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Errore caricamento</h3>
          <p>${error.message}</p>
        </div>
      `;
      return;
    }

    if (!posts || posts.length === 0) {
      console.warn('⚠️ Nessun post trovato');
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <h3>Nessun post</h3>
          <p>Sii il primo a pubblicare!</p>
        </div>
      `;
      return;
    }

    console.log('✅ Post caricati:', posts.length);

    const currentUserId = getCurrentUserId();
    
    let likedPosts = [];
    if (currentUserId) {
      const { data: likes } = await supabaseClient
        .from('PostLikes')
        .select('post_id')
        .eq('utente_id', currentUserId);
      likedPosts = likes ? likes.map(l => l.post_id) : [];
      console.log('💖 Post liked:', likedPosts.length);
    }

    allPosts = posts.map(post => ({
      id: post.id,
      utente_id: post.utente_id,
      username: post.utente?.username || 'Utente',
      avatar: post.utente?.username?.substring(0, 2).toUpperCase() || 'U',
      contenuto: post.contenuto,
      immagine_url: post.immagine_url,
      likes: post.likes_count || 0,
      comments: post.comments_count || 0,
      time: formatDate(new Date(post.created_at)),
      liked: likedPosts.includes(post.id)
    }));

    filteredPosts = [...allPosts];
    console.log('🎨 Rendering', filteredPosts.length, 'post');
    renderCommunityFeed();

  } catch (error) {
    console.error('❌ Errore catturato:', error);
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Errore imprevisto</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// ========================================
// RENDER FEED
// ========================================
function renderCommunityFeed() {
  const container = document.getElementById('communityContainer');
  if (!container) return;

  if (filteredPosts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search"></i>
        <h3>Nessun risultato</h3>
        <p>Prova con un'altra ricerca</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredPosts.map(post => createPostCard(post)).join('');
  console.log('✅ Render completato:', filteredPosts.length);
}

// ========================================
// CREA CARD POST
// ========================================
function createPostCard(post) {
  return `
    <div class="post-card" id="post-${post.id}">
      <div class="post-header">
        <div class="post-avatar">${post.avatar}</div>
        <div class="post-user">
          <h4>${post.username}</h4>
          <span>${post.time}</span>
        </div>
      </div>
      <div class="post-content">${post.contenuto}</div>
      ${post.immagine_url ? `
        <div class="post-image">
          <img src="${post.immagine_url}" alt="Post" onerror="this.parentElement.style.display='none'">
        </div>
      ` : ''}
      <div class="post-actions">
        <button class="post-action-btn ${post.liked ? 'liked' : ''}" 
                onclick="togglePostLike('${post.id}', '${post.utente_id}')">
          <i class="fas fa-heart"></i>
          <span id="likes-${post.id}">${post.likes}</span>
        </button>
        <button class="post-action-btn" onclick="viewPostComments('${post.id}')">
          <i class="fas fa-comment"></i>
          <span id="comments-${post.id}">${post.comments}</span>
        </button>
      </div>
    </div>
  `;
}

// ========================================
// FILTRO
// ========================================
function filterPosts() {
  const search = document.getElementById('filterSearch')?.value.toLowerCase() || '';
  console.log('🔍 Filtrando:', search);

  if (search === '') {
    filteredPosts = [...allPosts];
  } else {
    filteredPosts = allPosts.filter(post =>
      post.contenuto.toLowerCase().includes(search) ||
      post.username.toLowerCase().includes(search)
    );
  }

  console.log('✅ Filtrati:', filteredPosts.length);
  renderCommunityFeed();
}

// ========================================
// TOGGLE LIKE
// ========================================
async function togglePostLike(postId, postOwnerId) {
  console.log('💖 Toggle like post:', postId);
  
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    alert('❌ Errore: Non sei loggato!\n\nFai logout e login di nuovo.');
    return;
  }
  
  console.log('✅ User ID:', currentUserId);
  console.log('📝 Post owner:', postOwnerId);

  if (postOwnerId === currentUserId) {
    alert('❌ Non puoi mettere like ai tuoi post!');
    return;
  }

  const post = allPosts.find(p => p.id === postId);
  if (!post) {
    console.error('❌ Post non trovato');
    return;
  }

  console.log('🔄 Toggle:', post.liked ? 'UNLIKE' : 'LIKE');

  try {
    if (post.liked) {
      console.log('🔴 Rimuovendo like...');
      const { error } = await supabaseClient
        .from('PostLikes')
        .delete()
        .eq('post_id', postId)
        .eq('utente_id', currentUserId);
      
      if (error) {
        console.error('❌ Errore unlike:', error);
        alert('Errore. Riprova!');
        return;
      }
      
      post.liked = false;
      post.likes--;
      console.log('✅ Unlike effettuato');
    } else {
      console.log('💚 Aggiungendo like...');
      const { error } = await supabaseClient
        .from('PostLikes')
        .insert([{ post_id: postId, utente_id: currentUserId }]);
      
      if (error) {
        console.error('❌ Errore like:', error);
        alert('Errore. Riprova!');
        return;
      }
      
      post.liked = true;
      post.likes++;
      console.log('✅ Like effettuato');
    }

    // Aggiorna UI
    const likesSpan = document.getElementById(`likes-${postId}`);
    if (likesSpan) likesSpan.textContent = post.likes;

    const btn = event.currentTarget;
    if (post.liked) {
      btn.classList.add('liked');
    } else {
      btn.classList.remove('liked');
    }

    const filteredPost = filteredPosts.find(p => p.id === postId);
    if (filteredPost) {
      filteredPost.liked = post.liked;
      filteredPost.likes = post.likes;
    }

  } catch (error) {
    console.error('❌ Errore:', error);
    alert('Errore. Riprova!');
  }
}

// ========================================
// COMMENTI
// ========================================
async function viewPostComments(postId) {
  console.log('💬 Commenti:', postId);
  
  const { data: comments, error } = await supabaseClient
    .from('PostCommenti')
    .select(`
      *,
      utente:Utenti!PostCommenti_utente_id_fkey (username)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Errore:', error);
    alert('Errore caricamento commenti');
    return;
  }

  if (comments.length === 0) {
    alert('💬 Nessun commento.\n\nSii il primo!');
  } else {
    const text = comments.map(c => `👤 ${c.utente.username}: ${c.contenuto}`).join('\n\n');
    alert(`💬 Commenti (${comments.length}):\n\n${text}`);
  }
}

// ========================================
// UTILITY
// ========================================
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

window.initCommunityPage = initCommunityPage;
window.togglePostLike = togglePostLike;
window.viewPostComments = viewPostComments;
window.filterPosts = filterPosts;
window.getCurrentUserId = getCurrentUserId;
