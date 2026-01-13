// ========================================
// COMMUNITY - VERSIONE CON SUPABASE
// ========================================

let expandedEvents = [];
let currentUserId = null;
let allPosts = [];

// ========================================
// INIZIALIZZAZIONE
// ========================================
async function initCommunityPage() {
  // Ottieni l'utente corrente loggato
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    currentUserId = user.id;
  }

  // Carica i contenuti
  await loadCommunityContentFromDB();
}

// ========================================
// CARICAMENTO FEED COMMUNITY DA DB
// ========================================
async function loadCommunityContentFromDB() {
  const container = document.getElementById('communityContainer');
  if (!container) return;

  // 1. Carica tutti i post social
  const { data: posts, error: postsError } = await supabase
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

  if (postsError) {
    console.error('Errore caricamento post:', postsError);
    container.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 40px;">Errore caricamento feed community</p>';
    return;
  }

  // 2. Verifica quali post l'utente corrente ha già likato
  let likedPosts = [];
  if (currentUserId) {
    const { data: likes } = await supabase
      .from('PostLikes')
      .select('post_id')
      .eq('utente_id', currentUserId);
    
    likedPosts = likes ? likes.map(l => l.post_id) : [];
  }

  // 3. Mappa i post per il rendering
  allPosts = posts.map(post => ({
    id: post.id,
    utente_id: post.utente_id,
    username: post.utente?.username || 'Utente',
    nome_completo: post.utente?.nome_completo,
    avatar: post.utente?.username?.substring(0, 2).toUpperCase() || 'U',
    contenuto: post.contenuto,
    immagine_url: post.immagine_url,
    likes: post.likes_count || 0,
    comments: post.comments_count || 0,
    time: formatDate(new Date(post.created_at)),
    liked: likedPosts.includes(post.id)
  }));

  // 4. Renderizza il feed
  renderCommunityFeed();
}

// ========================================
// RENDER FEED COMMUNITY
// ========================================
function renderCommunityFeed() {
  const container = document.getElementById('communityContainer');
  if (!container) return;

  if (allPosts.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: #6b7280;">
        <i class="fas fa-users" style="font-size: 64px; color: #374151; margin-bottom: 20px; opacity: 0.5;"></i>
        <h3 style="font-size: 20px; font-weight: 800; color: #9ca3af; margin-bottom: 10px;">Nessun post disponibile</h3>
        <p style="font-size: 14px; font-weight: 600;">Sii il primo a pubblicare qualcosa!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = allPosts.map(post => createPostCard(
    post.avatar,
    post.username,
    post.time,
    post.contenuto,
    post.likes,
    post.comments,
    post.liked,
    post.id,
    post.immagine_url
  )).join('');
}

// ========================================
// CREA CARD POST
// ========================================
function createPostCard(avatar, username, time, content, likes, comments, isLiked, postId, imageUrl = null) {
  return `
    <div class="post-card" id="post-${postId}">
      <div class="post-header">
        <div class="post-avatar">${avatar}</div>
        <div class="post-user">
          <h4>${username}</h4>
          <span>${time}</span>
        </div>
      </div>
      <div class="post-content">${content}</div>
      ${imageUrl ? `
        <div class="post-image" style="width: 100%; height: 250px; border-radius: 16px; overflow: hidden; margin-bottom: 16px; background: #0a0a0a;">
          <img src="${imageUrl}" alt="Post image" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.style.display='none'">
        </div>
      ` : ''}
      <div class="post-actions">
        <button class="post-action-btn ${isLiked ? 'liked' : ''}" onclick="togglePostLike('${postId}')">
          <i class="fas fa-heart"></i>
          <span id="likes-${postId}">${likes}</span>
        </button>
        <button class="post-action-btn" onclick="viewPostComments('${postId}')">
          <i class="fas fa-comment"></i>
          <span id="comments-${postId}">${comments}</span>
        </button>
      </div>
    </div>
  `;
}

// ========================================
// TOGGLE LIKE POST
// ========================================
async function togglePostLike(postId) {
  if (!currentUserId) {
    alert('Devi essere loggato per mettere like!');
    return;
  }

  // Trova il post nei dati locali
  const post = allPosts.find(p => p.id === postId);
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

// ========================================
// VISUALIZZA COMMENTI
// ========================================
async function viewPostComments(postId) {
  // Carica i commenti dal DB
  const { data: comments, error } = await supabase
    .from('PostCommenti')
    .select(`
      *,
      utente:Utenti!PostCommenti_utente_id_fkey (
        username,
        nome_completo
      )
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Errore caricamento commenti:', error);
    alert('Errore caricamento commenti');
    return;
  }

  if (comments.length === 0) {
    alert('💬 Nessun commento per questo post.\n\nSii il primo a commentare!');
  } else {
    const commentsText = comments.map(c => 
      `👤 ${c.utente.username}: ${c.contenuto}`
    ).join('\n\n');
    alert(`💬 Commenti (${comments.length}):\n\n${commentsText}\n\n🔜 Funzione completa in arrivo!`);
  }
}

// ========================================
// CREA NUOVO POST
// ========================================
async function createNewPost(contenuto, immagineUrl = null) {
  if (!currentUserId) {
    alert('Devi essere loggato per pubblicare!');
    return null;
  }

  if (!contenuto || contenuto.trim() === '') {
    alert('Il contenuto del post non può essere vuoto!');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('PostSocial')
      .insert([
        {
          utente_id: currentUserId,
          contenuto: contenuto.trim(),
          immagine_url: immagineUrl
        }
      ])
      .select(`
        *,
        utente:Utenti!PostSocial_utente_id_fkey (
          username,
          nome_completo
        )
      `)
      .single();

    if (error) {
      console.error('Errore creazione post:', error);
      alert('Errore durante la pubblicazione. Riprova!');
      return null;
    }

    // Aggiungi il nuovo post all'inizio della lista
    const newPost = {
      id: data.id,
      utente_id: data.utente_id,
      username: data.utente?.username || 'Tu',
      avatar: data.utente?.username?.substring(0, 2).toUpperCase() || 'TU',
      contenuto: data.contenuto,
      immagine_url: data.immagine_url,
      likes: 0,
      comments: 0,
      time: 'Pochi secondi fa',
      liked: false
    };

    allPosts.unshift(newPost);
    renderCommunityFeed();

    return newPost;

  } catch (error) {
    console.error('Errore creazione post:', error);
    alert('Errore durante la pubblicazione. Riprova!');
    return null;
  }
}

// ========================================
// ELIMINA POST (Solo se sei il proprietario)
// ========================================
async function deletePost(postId) {
  if (!currentUserId) {
    alert('Devi essere loggato!');
    return false;
  }

  const post = allPosts.find(p => p.id === postId);
  if (!post) return false;

  if (post.utente_id !== currentUserId) {
    alert('Puoi eliminare solo i tuoi post!');
    return false;
  }

  if (!confirm('Sei sicuro di voler eliminare questo post?')) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('PostSocial')
      .delete()
      .eq('id', postId)
      .eq('utente_id', currentUserId); // Doppio check sicurezza

    if (error) {
      console.error('Errore eliminazione post:', error);
      alert('Errore durante l\'eliminazione. Riprova!');
      return false;
    }

    // Rimuovi dalla lista locale e aggiorna UI
    allPosts = allPosts.filter(p => p.id !== postId);
    renderCommunityFeed();

    return true;

  } catch (error) {
    console.error('Errore eliminazione post:', error);
    alert('Errore durante l\'eliminazione. Riprova!');
    return false;
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
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minuto' : 'minuti'} fa`;
  if (hours < 24) return `${hours} ${hours === 1 ? 'ora' : 'ore'} fa`;
  if (days === 1) return '1 giorno fa';
  if (days < 7) return `${days} giorni fa`;
  return date.toLocaleDateString('it-IT');
}

// ========================================
// ESPORTA FUNZIONI GLOBALI
// ========================================
window.initCommunityPage = initCommunityPage;
window.loadCommunityContentFromDB = loadCommunityContentFromDB;
window.togglePostLike = togglePostLike;
window.viewPostComments = viewPostComments;
window.createNewPost = createNewPost;
window.deletePost = deletePost;

// Backward compatibility con vecchio nome funzione
window.loadCommunityContent = loadCommunityContentFromDB;
