// ========================================
// COMMUNITY.JS - COMPATIBILE CON AUTH PERSONALIZZATO
// ========================================

let allPosts = [];

// ========================================
// GET CURRENT USER - USA IL TUO SISTEMA AUTH
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

    console.log('🎨 Rendering', allPosts.length, 'post');
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

  if (allPosts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users"></i>
        <h3>Nessun post</h3>
        <p>Sii il primo a pubblicare!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = allPosts.map(post => createPostCard(post)).join('');
  console.log('✅ Render completato:', allPosts.length);
}

// ========================================
// CREA CARD POST
// ========================================
function createPostCard(post) {
  const currentUserId = getCurrentUserId();
  const isMyPost = post.utente_id === currentUserId;
  
  // Determina se è video o immagine
  const mediaUrl = post.immagine_url;
  const isVideo = mediaUrl && (
    mediaUrl.includes('youtube.com') || 
    mediaUrl.includes('youtu.be') || 
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
            ${isMyPost ? '<span class="badge-owner">TU</span>' : ''}
          </h4>
          <span>${post.time}</span>
        </div>
      </div>
      <div class="post-content">${post.contenuto}</div>
      ${mediaUrl ? (isVideo ? `
        <div class="post-video">
          <video controls>
            <source src="${mediaUrl}" type="video/mp4">
            Il tuo browser non supporta i video.
          </video>
        </div>
      ` : `
        <div class="post-image">
          <img src="${mediaUrl}" alt="Post" onerror="this.parentElement.style.display='none'">
        </div>
      `) : ''}
      <div class="post-actions">
        <button class="post-action-btn ${post.liked ? 'liked' : ''} ${isMyPost ? 'disabled' : ''}" 
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
// TOGGLE LIKE - FIX ERRORE EVENT
// ========================================
async function togglePostLike(event, postId, postOwnerId) {
  console.log('💖 Toggle like post:', postId);
  
  // Salva riferimento bottone SUBITO prima di await
  const btn = event?.currentTarget;
  
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    alert('❌ Errore: Non sei loggato!\n\nFai logout e login di nuovo.');
    return;
  }
  
  console.log('✅ User ID:', currentUserId);
  console.log('🔍 Post owner:', postOwnerId);

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
        alert('❌ Errore rimozione like: ' + error.message);
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
        alert('❌ Errore aggiunta like: ' + error.message);
        return;
      }
      
      post.liked = true;
      post.likes++;
      console.log('✅ Like effettuato');
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

    // FIX: Trova il bottone nel DOM (più robusto)
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
    console.error('❌ Errore catturato:', error);
    alert('❌ Errore imprevisto: ' + error.message);
  }
}

// ========================================
// MOSTRA MODAL COMMENTI
// ========================================
async function showCommentsModal(postId) {
  console.log('💬 Mostra commenti:', postId);
  
  const modal = document.getElementById('commentsModal');
  const commentsContainer = document.getElementById('modalCommentsList');
  const modalPostId = document.getElementById('modalPostId');
  
  modalPostId.value = postId;
  commentsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Caricamento...</div>';
  modal.style.display = 'flex';
  
  await loadComments(postId);
}

// ========================================
// CARICA COMMENTI
// ========================================
async function loadComments(postId) {
  const commentsContainer = document.getElementById('modalCommentsList');
  
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
      console.error('❌ Errore:', error);
      commentsContainer.innerHTML = '<div class="error">❌ Errore caricamento commenti</div>';
      return;
    }

    if (comments.length === 0) {
      commentsContainer.innerHTML = `
        <div class="empty-state-small">
          <i class="fas fa-comment-slash"></i>
          <p>Nessun commento ancora.<br>Sii il primo!</p>
        </div>
      `;
      return;
    }

    const currentUserId = getCurrentUserId();
    
    commentsContainer.innerHTML = comments.map(c => {
      const isMyComment = c.utente_id === currentUserId;
      return `
        <div class="comment-item ${isMyComment ? 'my-comment' : ''}">
          <div class="comment-avatar">${c.utente.username.substring(0, 2).toUpperCase()}</div>
          <div class="comment-content">
            <div class="comment-header">
              <a href="vetrina-venditore.html?id=${c.utente.id}" class="comment-username">
                ${c.utente.username}
              </a>
              ${isMyComment ? '<span class="badge-small">TU</span>' : ''}
            </div>
            <p>${c.contenuto}</p>
            <span class="comment-time">${formatDate(new Date(c.created_at))}</span>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('❌ Errore:', error);
    commentsContainer.innerHTML = '<div class="error">❌ Errore imprevisto</div>';
  }
}

// ========================================
// AGGIUNGI COMMENTO
// ========================================
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
  
  try {
    const { error } = await supabaseClient
      .from('PostCommenti')
      .insert([{
        post_id: postId,
        utente_id: currentUserId,
        contenuto: contenuto
      }]);
    
    if (error) {
      console.error('❌ Errore:', error);
      alert('❌ Errore aggiunta commento');
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
    
    await loadComments(postId);
    
  } catch (error) {
    console.error('❌ Errore:', error);
    alert('❌ Errore imprevisto');
  }
}

// ========================================
// CHIUDI MODAL COMMENTI
// ========================================
function closeCommentsModal() {
  document.getElementById('commentsModal').style.display = 'none';
  document.getElementById('commentInput').value = '';
}

// ========================================
// BOX CREA POST INLINE (STILE FACEBOOK)
// ========================================
function expandCreatePost() {
  const expanded = document.getElementById('createPostExpanded');
  expanded.style.display = 'block';
  document.getElementById('newPostContent').focus();
}

function collapseCreatePost() {
  const expanded = document.getElementById('createPostExpanded');
  expanded.style.display = 'none';
  document.getElementById('newPostContent').value = '';
  removeFile();
}

// ========================================
// GESTIONE UPLOAD FILE
// ========================================
let selectedFile = null;

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Verifica dimensione (max 5MB per evitare problemi)
  if (file.size > 5 * 1024 * 1024) {
    alert('❌ File troppo grande! Max 5MB\n\nPer file più grandi usa un servizio di hosting.');
    return;
  }
  
  // Verifica tipo
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    alert('❌ Solo immagini o video!');
    return;
  }
  
  selectedFile = file;
  console.log('📎 File selezionato:', file.name, '(' + (file.size / 1024 / 1024).toFixed(2) + ' MB)');
  
  // Preview
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById('filePreviewContainer');
    preview.style.display = 'block';
    
    if (file.type.startsWith('image/')) {
      preview.innerHTML = `
        <img src="${e.target.result}" alt="Preview">
        <button class="remove-file-btn" onclick="removeFile()">
          <i class="fas fa-times"></i>
        </button>
      `;
    } else {
      preview.innerHTML = `
        <video controls>
          <source src="${e.target.result}" type="${file.type}">
        </video>
        <button class="remove-file-btn" onclick="removeFile()">
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
  const preview = document.getElementById('filePreviewContainer');
  preview.style.display = 'none';
  preview.innerHTML = '';
}

// ========================================
// CREA NUOVO POST
// ========================================
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
  
  const btn = event.currentTarget;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Caricamento...';
  
  try {
    let immagine_url = null;
    
    // Se c'è un file selezionato, converti in base64
    if (selectedFile) {
      console.log('📎 Conversione file in base64...');
      const reader = new FileReader();
      immagine_url = await new Promise((resolve, reject) => {
        reader.onload = (e) => {
          console.log('✅ File convertito');
          resolve(e.target.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });
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
      alert('❌ Errore pubblicazione: ' + error.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Pubblica';
      return;
    }
    
    console.log('✅ Post pubblicato con successo');
    
    // Reset form
    collapseCreatePost();
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Pubblica';
    
    // Ricarica i post
    await loadCommunityContentFromDB();
    
    // Scroll al top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
  } catch (error) {
    console.error('❌ Errore catturato:', error);
    alert('❌ Errore imprevisto: ' + error.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Pubblica';
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
