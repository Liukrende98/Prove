// ========================================
// LOGICA VETRINE
// ========================================

let expandedShowcases = [];

function createShowcaseCard(id, shopName, description, rating, reviews, articles, satisfaction, items) {
  const isExpanded = expandedShowcases.includes(id);
  const previewItems = isExpanded ? [] : items.slice(0, 6);
  const fullItems = items.concat([
    'Articolo 7', 'Articolo 8', 'Articolo 9', 'Articolo 10',
    'Articolo 11', 'Articolo 12', 'Articolo 13', 'Articolo 14'
  ]);
  
  return `
    <div class="vetrina-card-big ${isExpanded ? 'expanded' : ''}" id="showcase-${id}">
      <div class="vetrina-header" onclick="toggleShowcase(${id})">
        <div class="vetrina-top">
          <div class="vetrina-avatar"></div>
          <div class="vetrina-info">
            <h3>
              ${shopName}
              <span class="vetrina-expand-icon">▼</span>
            </h3>
            <p>${description}</p>
            <div class="vetrina-rating">
              <span>⭐ ${rating.toFixed(1)}</span>
              <span style="color: #6b7280;">•</span>
              <span style="color: #9ca3af;">${reviews} recensioni</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="vetrina-stats">
        <div class="vetrina-stat">
          <div class="vetrina-stat-value">${articles}</div>
          <div class="vetrina-stat-label">Articoli</div>
        </div>
        <div class="vetrina-stat">
          <div class="vetrina-stat-value">${satisfaction}%</div>
          <div class="vetrina-stat-label">Soddisfazione</div>
        </div>
        <div class="vetrina-stat">
          <div class="vetrina-stat-value">${reviews}</div>
          <div class="vetrina-stat-label">Vendite</div>
        </div>
      </div>
      
      ${!isExpanded ? `
      <div class="vetrina-items-preview">
        ${previewItems.map(item => `<div class="vetrina-item">${item}</div>`).join('')}
      </div>
      ` : ''}
      
      <div class="vetrina-details">
        <div class="vetrina-full-catalog">
          <h4><i class="fas fa-box-open"></i> Catalogo Completo</h4>
          <div class="vetrina-catalog-grid">
            ${fullItems.map(item => `<div class="vetrina-item">${item}</div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function toggleShowcase(id) {
  const idx = expandedShowcases.indexOf(id);
  if (idx > -1) {
    expandedShowcases.splice(idx, 1);
  } else {
    expandedShowcases.push(id);
  }
  loadVetrineContent();
  setTimeout(() => {
    document.getElementById(`showcase-${id}`).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}

function loadVetrineContent() {
  const container = document.getElementById('vetrineContainer');
  if (!container) return;
  
  container.innerHTML = `
    ${createShowcaseCard(1, 'Pokemon Master Shop', 'Carte rare e vintage dal 1999', 4.8, 156, 1240, 89, 
      ['Charizard Base Set', 'Pikachu 1st Ed', 'Mewtwo EX', 'Lugia Legend', 'Rayquaza VMAX', 'Umbreon GX'])}
    
    ${createShowcaseCard(2, 'Collezionista Pro', 'Espansioni moderne e sealed', 4.9, 203, 890, 95,
      ['ETB Surging Sparks', 'Booster TEF', 'Tin Box Charizard', 'Elite Trainer Box', 'Premium Collection', 'Battle Deck'])}
    
    ${createShowcaseCard(3, 'Tokyo Cards Italia', 'Import esclusivo dal Giappone', 4.7, 98, 560, 78,
      ['Carte JAP Promo', 'Sleeves Limited', 'Deck Box Tokyo', 'Play Mat Exclusive', 'Binder Premium', 'Card Case'])}
    
    ${createShowcaseCard(4, 'Vintage Pokémon', 'Nostalgia anni 90 e 2000', 5.0, 67, 2100, 100,
      ['Base Set Holo', 'Fossil Rare', 'Jungle 1st', 'Neo Genesis', 'Team Rocket', 'Gym Heroes'])}
    
    ${createShowcaseCard(5, 'Competitive TCG', 'Carte competitive per tornei', 4.6, 189, 430, 82,
      ['Meta Deck Cards', 'Tournament Ready', 'Staple Trainers', 'Energy Full Art', 'ACE SPEC', 'Supporter SR'])}
  `;
}
