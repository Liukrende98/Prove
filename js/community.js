// ========================================
// COMMUNITY.JS - DEFINITIVO CON CONTROLLI
// ========================================

let allPosts = [];
let currentUserId = null;

// ========================================
// INIZIALIZZAZIONE
// ========================================
async function initCommunityPage() {
  // OTTIENI UTENTE LOGGATO (prova diversi metodi)
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user && user.id) {
      currentUserId = user.id;
      console.log('✅ Utente loggato via auth.getUser():', currentUserId);
    } else {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session && session.user) {
        currentUserId = session.user.id;
        console.log('✅ Utente loggato via getSession():', currentUserId);
      } else {
        const userData = localStorage.getItem('userData');
        if (userData) {
          const parsed = JSON.parse(userData);
          currentUserId = parsed.id;
          console.log('✅ Utente loggato via localStorage:', currentUserId);
        }
      }
    }
  } catch (error) {
    console.error('⚠️ Errore ottenendo utente:', error);
  }

  if (!currentUserId) {
    console.warn('⚠️ Nessun utente loggato trovato');
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
    utente_id: post.utente_id, // Serve per controllo anti-auto-like
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
  // Mostra se il post è TUO
  const isMyPost = post.utente_id === currentUserId;
  const badgeOwner = isMyPost ? '<span style="background: #fbbf24; color: #000; padding: 2px 8px; border-radius: 8px; font-size: 10px; font-weight: 900; margin-left: 8px;">TUO POST</span>' : '';

  return `
    <div class="post-card" id="post-${post.id}">
      <div class="post-header">
        <div class="post-avatar">${post.avatar}</div>
        <div class="post-user">
          <h4>${post.username} ${badgeOwner}</h4>
          <span>${post.time}</span>
        </div>
      </div>
      <div class="post-content">${post.contenuto}</div>
      ${post.immagine_url ? `
        <div class="post-image" style="width: 100%; height: 250px; border-radius: 16px; overflow: hidden; margin-bottom: 16px; background: #0a0a0a;">
          <img src="${post.immagine_url}" alt="Post" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.style.display='none'">
        </div>
      ` : ''}
      <div class="post-actions">
        <button class="post-action-btn ${post.liked ? 'liked' : ''} ${isMyPost ? 'disabled' : ''}" onclick="togglePostLike('${post.id}')" ${isMyPost ? 'style="opacity: 0.5; cursor: not-allowed;"' : ''}>
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
    alert('⚠️ Devi essere loggato per mettere like!\n\nSe sei già loggato, ricarica la pagina.');
    console.error('❌ currentUserId è null. Ricarica la pagina!');
    return;
  }

  const post = allPosts.find(p => p.id === postId);
  if (!post) return;

  // CONTROLLO: Non puoi mettere like ai TUOI post
  if (post.utente_id === currentUserId) {
    alert('❌ Non puoi mettere like ai tuoi stessi post!');
    return;
  }

  console.log('💖 Toggle like post:', postId, 'utente:', currentUserId);

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

// ========================================
// VISUALIZZA COMMENTI
// ========================================
async function viewPostComments(postId) {
  const { data: comments, error } = await supabaseClient
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
    alert('💬 Nessun commento.\n\nSii il primo a commentare!\n\n✅ NOTA: Puoi commentare anche i tuoi post!');
  } else {
    const text = comments.map(c => `👤 ${c.utente.username}: ${c.contenuto}`).join('\n\n');
    alert(`💬 Commenti (${comments.length}):\n\n${text}\n\n✅ NOTA: Puoi commentare anche i tuoi post!`);
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
