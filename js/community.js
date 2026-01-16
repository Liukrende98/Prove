// COMMUNITY.JS - VERSIONE SICURA

let allPosts = [];
let selectedFile = null;

// ========================================
// GET CURRENT USER
// ========================================
function getCurrentUserId() {
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
  
  // Mostra loader
  if (window.NodoLoader) NodoLoader.show('Caricamento community...');
  
  const userId = getCurrentUserId();
  if (!userId) {
    console.error('❌ Errore: userId null');
    if (window.NodoLoader) NodoLoader.hide();
    return;
  }
  
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
    if (window.NodoLoader) NodoLoader.hide();
    return;
  }

  // Svuota container (il loader è già visibile)
  container.innerHTML = '';

  try {
    const currentUserId = getCurrentUserId();
    
    // ESCLUDI i post dell'utente corrente
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
      .neq('utente_id', currentUserId)  // ← FILTRO: solo post degli altri
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('❌ Errore query:', error);
      container.innerHTML = `<div class="empty-state"><h3>Errore caricamento</h3><p>${error.message}</p></div>`;
      if (window.NodoLoader) NodoLoader.hide();
      return;
    }

    if (!posts || posts.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><h3>Nessun post della community</h3><p>Aspetta che qualcuno pubblichi qualcosa!</p></div>`;
      if (window.NodoLoader) NodoLoader.hide();
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
    
    // Nascondi loader
    if (window.NodoLoader) NodoLoader.hide();

  } catch (error) {
    console.error('❌ Errore catturato:', error);
    container.innerHTML = `<div class="empty-state"><h3>Errore imprevisto</h3><p>${error.message}</p></div>`;
    if (window.NodoLoader) NodoLoader.hide();
  }
}

// ========================================
// RENDER FEED
// ========================================
function renderCommunityFeed() {
  const container = document.getElementById('communityContainer');
  if (!container) return;

  if (allPosts.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><h3>Nessun post</h3></div>`;
    return;
  }

  container.innerHTML = allPosts.map(post => createPostCard(post)).join('');
}

// ========================================
// CREA CARD POST
// ========================================
function createPostCard(post) {
  const currentUserId = getCurrentUserId();
  
  // Determina se è video
  const mediaUrl = post.immagine_url;
  const isVideo = mediaUrl && (
    mediaUrl.endsWith('.mp4') || 
    mediaUrl.endsWith('.webm') || 
    mediaUrl.endsWith('.ogg') ||
    mediaUrl.startsWith('data:video/')
  );
  
  return `
    <div class="post-card" id="post-${post.id}">
      <div class="post-header">
        <div class="post-avatar">${post.avatar}</div>
        <div class="post-user">
          <h4>
            <a href="vetrina-venditore.html?id=${post.utente_id}" class="username-link">
              ${post.username}
            </a>
          </h4>
          <span>${post.time}</span>
        </div>
      </div>
      <div class="post-content">${post.contenuto}</div>
      ${mediaUrl ? (isVideo ? `
        <div class="post-video">
          <video controls>
            <source src="${mediaUrl}" type="video/mp4">
          </video>
        </div>
      ` : `
        <div class="post-image">
          <img src="${mediaUrl}" alt="Post" onerror="this.style.display='none'">
        </div>
      `) : ''}
      <div class="post-actions">
        <button class="post-action-btn ${post.liked ? 'liked' : ''}" 
                onclick="togglePostLike(event, '${post.id}', '${post.utente_id}')">
          <i class="fas fa-heart"></i>
          <span id="likes-${post.id}">${post.likes}</span>
        </button>
        <button class="post-action-btn" onclick="showCommentsModal('${post.id}')">
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
async function togglePostLike(event, postId, postOwnerId) {
  console.log('💖 Toggle like:', postId);
  
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    alert('❌ Non sei loggato!');
    return;
  }

  const post = allPosts.find(p => p.id === postId);
  if (!post) return;

  try {
    if (post.liked) {
      const { error } = await supabaseClient
        .from('PostLikes')
        .delete()
        .eq('post_id', postId)
        .eq('utente_id', currentUserId);
      
      if (error) {
        alert('❌ Errore unlike: ' + error.message);
        return;
      }
      
      post.liked = false;
      post.likes--;
    } else {
      const { error } = await supabaseClient
        .from('PostLikes')
        .insert([{ post_id: postId, utente_id: currentUserId }]);
      
      if (error) {
        alert('❌ Errore like: ' + error.message);
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
      const likeButton = postCard.querySelector('.post-action-btn');
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
// MODAL COMMENTI
// ========================================
async function showCommentsModal(postId) {
  const modal = document.getElementById('commentsModal');
  const modalPostId = document.getElementById('modalPostId');
  
  modalPostId.value = postId;
  modal.style.display = 'flex';
  
  await loadComments(postId);
}

function closeCommentsModal() {
  document.getElementById('commentsModal').style.display = 'none';
  document.getElementById('commentInput').value = '';
}

async function loadComments(postId) {
  const container = document.getElementById('modalCommentsList');
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
      container.innerHTML = '<div class="empty-state-small">❌ Errore caricamento</div>';
      return;
    }

    if (comments.length === 0) {
      container.innerHTML = '<div class="empty-state-small"><i class="fas fa-comment-slash"></i><p>Nessun commento.<br>Sii il primo!</p></div>';
      return;
    }

    const currentUserId = getCurrentUserId();
    
    container.innerHTML = comments.map(c => {
      const isMyComment = c.utente_id === currentUserId;
      return `
        <div class="comment-item">
          <div class="comment-avatar">${c.utente.username.substring(0, 2).toUpperCase()}</div>
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

  } catch (error) {
    container.innerHTML = '<div class="empty-state-small">❌ Errore</div>';
  }
}

async function addComment() {
  const postId = document.getElementById('modalPostId').value;
  const input = document.getElementById('commentInput');
  const contenuto = input.value.trim();
  
  if (!contenuto) {
    alert('❌ Scrivi un commento!');
    return;
  }
  
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    alert('❌ Devi essere loggato!');
    return;
  }
  
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
      alert('❌ Errore: ' + error.message);
      if (window.NodoLoader) NodoLoader.hideOperation();
      return;
    }
    
    input.value = '';
    
    // Aggiorna contatore
    const post = allPosts.find(p => p.id === postId);
    if (post) {
      post.comments++;
      const commentsSpan = document.getElementById(`comments-${postId}`);
      if (commentsSpan) commentsSpan.textContent = post.comments;
    }
    
    // Nascondi loader
    if (window.NodoLoader) NodoLoader.hideOperation();
    
    await loadComments(postId);
    
  } catch (error) {
    alert('❌ Errore: ' + error.message);
    if (window.NodoLoader) NodoLoader.hideOperation();
  }
}

// ========================================
// BOX CREA POST
// ========================================
function expandCreatePost() {
  const form = document.getElementById('createPostForm');
  form.classList.add('active');
  document.getElementById('newPostContent').focus();
}

function collapseCreatePost() {
  const form = document.getElementById('createPostForm');
  form.classList.remove('active');
  document.getElementById('newPostContent').value = '';
  removeFile();
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    alert('❌ File troppo grande! Max 5MB');
    return;
  }
  
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    alert('❌ Solo immagini o video!');
    return;
  }
  
  selectedFile = file;
  console.log('📎 File:', file.name, (file.size / 1024 / 1024).toFixed(2) + ' MB');
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById('filePreviewBox');
    preview.classList.add('active');
    
    if (file.type.startsWith('image/')) {
      preview.innerHTML = `
        <img src="${e.target.result}" alt="Preview">
        <button class="file-remove-btn" onclick="removeFile()">
          <i class="fas fa-times"></i>
        </button>
      `;
    } else {
      preview.innerHTML = `
        <video controls>
          <source src="${e.target.result}" type="${file.type}">
        </video>
        <button class="file-remove-btn" onclick="removeFile()">
          <i class="fas fa-times"></i>
        </button>
      `;
    }
  };
  reader.readAsDataURL(file);
}

function removeFile() {
  selectedFile = null;
  document.getElementById('fileInput').value = '';
  const preview = document.getElementById('filePreviewBox');
  preview.classList.remove('active');
  preview.innerHTML = '';
}

async function createNewPost() {
  const contenuto = document.getElementById('newPostContent').value.trim();
  
  if (!contenuto) {
    alert('❌ Scrivi qualcosa!');
    return;
  }
  
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    alert('❌ Devi essere loggato!');
    return;
  }
  
  // Mostra loader operazione
  if (window.NodoLoader) NodoLoader.showOperation('Pubblicazione post...');
  
  try {
    let immagine_url = null;
    
    // Converti file in base64
    if (selectedFile) {
      console.log('📎 Conversione file...');
      const reader = new FileReader();
      immagine_url = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });
      console.log('✅ File convertito');
    }
    
    console.log('💾 Salvataggio post...');
    const { data, error } = await supabaseClient
      .from('PostSocial')
      .insert([{
        utente_id: currentUserId,
        contenuto: contenuto,
        immagine_url: immagine_url
      }])
      .select(`
        *,
        utente:Utenti!PostSocial_utente_id_fkey (id, username, nome_completo)
      `)
      .single();
    
    if (error) {
      console.error('❌ Errore:', error);
      alert('❌ Errore: ' + error.message);
      if (window.NodoLoader) NodoLoader.hideOperation();
      return;
    }
    
    console.log('✅ Post pubblicato');
    
    // IMPORTANTE: Reset completo del form PRIMA di ricaricare
    document.getElementById('newPostContent').value = '';
    removeFile();
    
    // Chiudi il form
    const form = document.getElementById('createPostForm');
    form.classList.remove('active');
    
    // Nascondi loader operazione
    if (window.NodoLoader) NodoLoader.hideOperation();
    
    // Ricarica feed (mostrerà il loader pagina)
    if (window.NodoLoader) NodoLoader.show('Aggiornamento feed...');
    await loadCommunityContentFromDB();
    
    // Scroll al top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
  } catch (error) {
    console.error('❌ Errore:', error);
    alert('❌ Errore: ' + error.message);
    if (window.NodoLoader) NodoLoader.hideOperation();
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

// ========================================
// EXPORTS
// ========================================
window.initCommunityPage = initCommunityPage;
window.togglePostLike = togglePostLike;
window.showCommentsModal = showCommentsModal;
window.closeCommentsModal = closeCommentsModal;
window.addComment = addComment;
window.expandCreatePost = expandCreatePost;
window.collapseCreatePost = collapseCreatePost;
window.createNewPost = createNewPost;
window.handleFileSelect = handleFileSelect;
window.removeFile = removeFile;
window.getCurrentUserId = getCurrentUserId;
