// ========================================
// COMMUNITY.JS - COMPLETO CON SUPABASE
// ========================================

let allPosts = [];
let currentUserId = null;

// ========================================
// INIZIALIZZAZIONE
// ========================================
async function initCommunityPage() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (user) {
    currentUserId = user.id;
  }
  await loadCommunityContentFromDB();
}

// ========================================
// CARICAMENTO POST DAL DATABASE
// ========================================
async function loadCommunityContentFromDB() {
  const container = document.getElementById('communityContainer');
  if (!container) return;

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
    .limit(50);

  if (error) {
    console.error('Errore:', error);
    container.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 40px;">Errore caricamento feed</p>';
    return;
  }

  let likedPosts = [];
  if (currentUserId) {
    const { data: likes } = await supabaseClient
      .from('PostLikes')
      .select('post_id')
      .eq('utente_id', currentUserId);
    likedPosts = likes ? likes.map(l => l.post_id) : [];
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

  renderCommunityFeed();
}

// ========================================
// RENDER FEED
// ========================================
function renderCommunityFeed() {
  const container = document.getElementById('communityContainer');
  if (!container) return;

  if (allPosts.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: #6b7280;">
        <i class="fas fa-users" style="font-size: 64px; color: #374151; margin-bottom: 20px; opacity: 0.5;"></i>
        <h3 style="font-size: 20px; font-weight: 800; color: #9ca3af; margin-bottom: 10px;">Nessun post</h3>
        <p style="font-size: 14px; font-weight: 600;">Sii il primo a pubblicare!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = allPosts.map(post => createPostCard(post)).join('');
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
        <button class="post-action-btn ${post.liked ? 'liked' : ''}" onclick="togglePostLike('${post.id}')">
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
// TOGGLE LIKE
// ========================================
async function togglePostLike(postId) {
  if (!currentUserId) {
    alert('Devi essere loggato per mettere like!');
    return;
  }

  const post = allPosts.find(p => p.id === postId);
  if (!post) return;

  try {
    if (post.liked) {
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
      const { error } = await supabase
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

// ========================================
// VISUALIZZA COMMENTI
// ========================================
async function viewPostComments(postId) {
  const { data: comments, error } = await supabase
    .from('PostCommenti')
    .select(`
      *,
      utente:Utenti!PostCommenti_utente_id_fkey (username, nome_completo)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Errore:', error);
    alert('Errore caricamento commenti');
    return;
  }

  if (comments.length === 0) {
    alert('💬 Nessun commento.\n\nSii il primo a commentare!');
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
  if (minutes < 60) return `${minutes} minuti fa`;
  if (hours < 24) return `${hours} ore fa`;
  if (days === 1) return '1 giorno fa';
  if (days < 7) return `${days} giorni fa`;
  return date.toLocaleDateString('it-IT');
}

window.initCommunityPage = initCommunityPage;
window.togglePostLike = togglePostLike;
window.viewPostComments = viewPostComments;
