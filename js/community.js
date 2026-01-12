// ========================================
// LOGICA COMMUNITY
// ========================================

let expandedEvents = [];

function createEventCard(id, title, location, date, attendance, description) {
  const isExpanded = expandedEvents.includes(id);
  return `
    <div class="event-card-big ${isExpanded ? 'expanded' : ''}" id="event-${id}">
      <div class="event-header" onclick="toggleEvent(${id})">
        <div class="event-video">
          <i class="fas fa-calendar-days"></i>
        </div>
        <div class="event-info">
          <h3>
            ${title}
            <span class="event-expand-icon">▼</span>
          </h3>
          <p>${description}</p>
        </div>
      </div>
      
      <div class="event-details">
        <div style="padding: 0 20px 20px;">
          <div class="event-meta">
            <div class="event-meta-item">
              <i class="fas fa-map-marker-alt"></i>
              <span>${location}</span>
            </div>
            <div class="event-meta-item">
              <i class="fas fa-calendar"></i>
              <span>${date}</span>
            </div>
            <div class="event-meta-item">
              <i class="fas fa-users"></i>
              <span>${attendance}</span>
            </div>
            <div class="event-meta-item">
              <i class="fas fa-ticket"></i>
              <span>Ingresso gratuito</span>
            </div>
          </div>
          
          <div class="vendor-section">
            <h4><i class="fas fa-store"></i> Venditori Presenti</h4>
            <div class="vendor-grid">
              ${createVendorBooth('CardsMaster Shop', 'Carte Rare & Vintage', ['Charizard ex', 'Pikachu VMAX', 'Mewtwo GX'])}
              ${createVendorBooth('Pokemon Paradise', 'Nuove Espansioni', ['Booster TEF', 'ETB SVI', 'Tin Box'])}
              ${createVendorBooth('Collector\'s Dream', 'Grading & Slabs', ['PSA 10 Cards', 'CGC Slabs', 'BGS 9.5'])}
              ${createVendorBooth('Tokyo Cards Italia', 'Import Giapponese', ['Carte JAP', 'Promo Box', 'Sleeves'])}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function createVendorBooth(name, category, articles) {
  return `
    <div class="vendor-booth">
      <div class="vendor-booth-header">
        <div class="vendor-photo"></div>
        <div class="vendor-info">
          <h5>${name}</h5>
          <p>${category}</p>
        </div>
      </div>
      <div class="vendor-articles">
        ${articles.map(art => `<div class="vendor-article-mini">${art}</div>`).join('')}
      </div>
    </div>
  `;
}

function createPostCard(avatar, username, time, content, likes, comments, isLiked) {
  return `
    <div class="post-card">
      <div class="post-header">
        <div class="post-avatar">${avatar}</div>
        <div class="post-user">
          <h4>${username}</h4>
          <span>${time}</span>
        </div>
      </div>
      <div class="post-content">${content}</div>
      <div class="post-actions">
        <button class="post-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(this)">
          <i class="fas fa-heart"></i>
          <span>${likes}</span>
        </button>
        <button class="post-action-btn" onclick="alert('💬 Commenti: Funzione in arrivo!')">
          <i class="fas fa-comment"></i>
          <span>${comments}</span>
        </button>
      </div>
    </div>
  `;
}

function toggleEvent(id) {
  const idx = expandedEvents.indexOf(id);
  if (idx > -1) {
    expandedEvents.splice(idx, 1);
  } else {
    expandedEvents.push(id);
  }
  loadCommunityContent();
  setTimeout(() => {
    document.getElementById(`event-${id}`).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}

function toggleLike(btn) {
  btn.classList.toggle('liked');
  const span = btn.querySelector('span');
  const currentLikes = parseInt(span.textContent);
  span.textContent = btn.classList.contains('liked') ? currentLikes + 1 : currentLikes - 1;
}

function loadCommunityContent() {
  const container = document.getElementById('communityContainer');
  if (!container) return;
  
  container.innerHTML = `
    ${createEventCard(1, 'Raduno Pokemon - Milano 2025', 'Milano Fiera', '15 Gennaio 2025', '500+ partecipanti', 'Il più grande evento Pokemon d\'Italia! Scambi, tornei, incontri con giocatori professionisti e tanto altro.')}
    
    ${createEventCard(2, 'Pokemon TCG Championship', 'Roma Convention Center', '22 Febbraio 2025', '300+ giocatori', 'Torneo nazionale ufficiale con premi incredibili e carte esclusive per tutti i partecipanti!')}
    
    ${createPostCard('MC', 'MarioCollector', '2 ore fa', 'Ho appena completato la mia collezione di Scarlatto e Violetto! Che emozione! 🎉', 42, 8, false)}
    
    ${createEventCard(3, 'Fiera del Collezionismo', 'Bologna Expo', '10 Marzo 2025', '200+ stand', 'La più grande fiera di collezionismo del centro Italia. Migliaia di carte, action figures e memorabilia!')}
    
    ${createPostCard('LT', 'LucaTrainer', '5 ore fa', 'Qualcuno scambia Charizard ex? Ho doppioni di Mewtwo! 🔥', 15, 12, false)}
    
    ${createPostCard('GP', 'GiuliaPokemon', '1 giorno fa', 'Appena aperto un ETB di Surging Sparks... PIKACHU EX FULL ART! 😱⚡', 89, 23, false)}
    
    ${createPostCard('AS', 'AndreaShiny', '2 giorni fa', 'Chi viene al raduno di Milano? Organizziamo un meet! 🤝', 34, 18, false)}
    
    ${createPostCard('FC', 'FrancescaCards', '3 giorni fa', 'La mia collezione ha superato le 1000 carte! Grazie a questa community per i consigli! ❤️', 67, 15, false)}
  `;
}
