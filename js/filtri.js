// ========================================
// FILTRI.JS - Sistema Filtri Riutilizzabile
// NODO Italia - v2.0
// ========================================

(function() {
  
  // Inietta CSS
  const css = `
    /* ========================================
       FILTRI - Mobile First
       ======================================== */
    
    .nodo-filter-box {
      background: #141414;
      border-radius: 12px;
      margin-bottom: 15px;
      border: 1px solid rgba(251, 191, 36, 0.2);
      overflow: hidden;
    }
    
    .nodo-filter-search {
      display: flex;
      align-items: center;
      padding: 12px;
      gap: 10px;
      background: #1a1a1a;
    }
    
    .nodo-filter-search > i {
      color: #666;
      font-size: 14px;
    }
    
    .nodo-filter-search input {
      flex: 1;
      background: transparent;
      border: none;
      color: #fff;
      font-size: 14px;
      outline: none;
    }
    
    .nodo-filter-search input::placeholder {
      color: #666;
    }
    
    .nodo-filter-expand-btn {
      position: relative;
      width: 42px;
      height: 42px;
      background: rgba(251, 191, 36, 0.15);
      border: 1px solid rgba(251, 191, 36, 0.3);
      border-radius: 10px;
      color: #fbbf24;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .nodo-filter-expand-btn.active {
      background: #fbbf24;
      color: #0a0a0a;
    }
    
    .nodo-filter-badge {
      position: absolute;
      top: -6px;
      right: -6px;
      min-width: 18px;
      height: 18px;
      background: #ef4444;
      color: white;
      font-size: 10px;
      font-weight: 700;
      border-radius: 9px;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 0 5px;
    }
    
    .nodo-filter-badge:not(:empty) {
      display: flex;
    }
    
    .nodo-filter-body {
      display: none;
      padding: 16px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    
    .nodo-filter-body.open {
      display: block;
      animation: nodoSlideDown 0.3s ease;
    }
    
    @keyframes nodoSlideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .nodo-filter-group {
      margin-bottom: 14px;
    }
    
    .nodo-filter-group label {
      display: block;
      font-size: 11px;
      color: #888;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    
    .nodo-filter-group select {
      width: 100%;
      padding: 12px;
      background: #1a1a1a;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
    }
    
    .nodo-filter-group select:focus {
      outline: none;
      border-color: #fbbf24;
    }
    
    .nodo-filter-graded {
      display: none;
      background: rgba(251, 191, 36, 0.05);
      border: 1px dashed rgba(251, 191, 36, 0.3);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 14px;
    }
    
    .nodo-filter-graded .nodo-filter-group:last-child {
      margin-bottom: 0;
    }
    
    /* Range Slider */
    .nodo-filter-range {
      margin-bottom: 14px;
    }
    
    .nodo-filter-range-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .nodo-filter-range-header label {
      font-size: 11px;
      color: #888;
      text-transform: uppercase;
    }
    
    .nodo-filter-range-header span {
      font-size: 13px;
      font-weight: 700;
      color: #fbbf24;
    }
    
    .nodo-filter-range-track {
      position: relative;
      height: 44px;
    }
    
    .nodo-filter-range-bg {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 100%;
      height: 6px;
      background: #2a2a2a;
      border-radius: 3px;
    }
    
    .nodo-filter-range-progress {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      height: 6px;
      background: linear-gradient(90deg, #fbbf24, #f59e0b);
      border-radius: 3px;
    }
    
    .nodo-filter-range-input {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 100%;
      height: 6px;
      background: transparent;
      pointer-events: none;
      -webkit-appearance: none;
    }
    
    .nodo-filter-range-input::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 24px;
      height: 24px;
      background: #fbbf24;
      border-radius: 50%;
      cursor: pointer;
      pointer-events: auto;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    
    /* Toggle buttons */
    .nodo-filter-toggles {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
    }
    
    .nodo-toggle {
      flex: 1;
      padding: 12px;
      background: #1a1a1a;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: #666;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
    }
    
    .nodo-toggle.active {
      background: rgba(251, 191, 36, 0.15);
      border-color: #fbbf24;
      color: #fbbf24;
    }
    
    .nodo-toggle.profit.active {
      background: rgba(34, 197, 94, 0.15);
      border-color: #22c55e;
      color: #22c55e;
    }
    
    .nodo-toggle.loss.active {
      background: rgba(239, 68, 68, 0.15);
      border-color: #ef4444;
      color: #ef4444;
    }
    
    .nodo-filter-reset {
      width: 100%;
      padding: 12px;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px;
      color: #888;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 10px;
    }
  `;
  
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  
  // Oggetto globale filtri
  window.NodoFiltri = {
    isOpen: false,
    onFilter: null,
    onReset: null,
    
    init: function(containerId, options = {}) {
      this.onFilter = options.onFilter || null;
      this.onReset = options.onReset || null;
      this.render(containerId);
      this.bindEvents();
      console.log('🔍 NodoFiltri inizializzato');
    },
    
    render: function(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;
      
      container.innerHTML = `
        <div class="nodo-filter-box">
          <div class="nodo-filter-search">
            <i class="fas fa-search"></i>
            <input type="text" id="nodoFNome" placeholder="Cerca articolo...">
            <button class="nodo-filter-expand-btn" id="nodoFExpandBtn">
              <i class="fas fa-sliders-h"></i>
              <span class="nodo-filter-badge" id="nodoFBadge"></span>
            </button>
          </div>
          
          <div class="nodo-filter-body" id="nodoFBody">
            <div class="nodo-filter-group">
              <label>Categoria</label>
              <select id="nodoFCategoria">
                <option value="">Tutte</option>
                <option value="ETB">ETB</option>
                <option value="Carte Singole">Carte Singole</option>
                <option value="Carte gradate">Carte gradate</option>
                <option value="Booster Box">Booster Box</option>
                <option value="Collection Box">Collection Box</option>
                <option value="Box mini tin">Box mini tin</option>
                <option value="Bustine">Bustine</option>
                <option value="Accessori">Accessori</option>
                <option value="Altro">Altro</option>
              </select>
            </div>
            
            <div class="nodo-filter-graded" id="nodoFGraded">
              <div class="nodo-filter-group">
                <label>Casa Gradazione</label>
                <select id="nodoFCasa">
                  <option value="">Tutte</option>
                  <option value="PSA">PSA</option>
                  <option value="GRAAD">GRAAD</option>
                  <option value="Altra casa">Altra</option>
                </select>
              </div>
              <div class="nodo-filter-group">
                <label>Voto Minimo</label>
                <select id="nodoFVoto">
                  <option value="">Tutti</option>
                  <option value="6">6+</option>
                  <option value="7">7+</option>
                  <option value="8">8+</option>
                  <option value="9">9+</option>
                  <option value="10">10</option>
                </select>
              </div>
            </div>
            
            <div class="nodo-filter-range">
              <div class="nodo-filter-range-header">
                <label>Valore €</label>
                <span id="nodoFRangeVal">0€ - 10000€</span>
              </div>
              <div class="nodo-filter-range-track">
                <div class="nodo-filter-range-bg"></div>
                <div class="nodo-filter-range-progress" id="nodoFProgress" style="left:0%;width:100%"></div>
                <input type="range" class="nodo-filter-range-input" id="nodoFMin" min="0" max="10000" value="0" step="100">
                <input type="range" class="nodo-filter-range-input" id="nodoFMax" min="0" max="10000" value="10000" step="100">
              </div>
            </div>
            
            <div class="nodo-filter-group">
              <label>Valutazione Minima</label>
              <select id="nodoFStato">
                <option value="">Tutte</option>
                <option value="5">5+</option>
                <option value="6">6+</option>
                <option value="7">7+</option>
                <option value="8">8+</option>
                <option value="9">9+</option>
              </select>
            </div>
            
            <div class="nodo-filter-toggles">
              <button class="nodo-toggle active" id="nodoTPresenti"><i class="fas fa-box"></i> Presenti</button>
              <button class="nodo-toggle active" id="nodoTAssenti"><i class="fas fa-box-open"></i> Assenti</button>
            </div>
            
            <div class="nodo-filter-toggles">
              <button class="nodo-toggle profit active" id="nodoTProfit"><i class="fas fa-arrow-up"></i> Guadagno</button>
              <button class="nodo-toggle loss active" id="nodoTLoss"><i class="fas fa-arrow-down"></i> Perdita</button>
            </div>
            
            <div class="nodo-filter-toggles">
              <button class="nodo-toggle" id="nodoTVetrina"><i class="fas fa-store"></i> Solo Vetrina</button>
            </div>
            
            <button class="nodo-filter-reset" id="nodoFReset"><i class="fas fa-undo"></i> Reset Filtri</button>
          </div>
        </div>
      `;
    },
    
    bindEvents: function() {
      const self = this;
      
      // Espandi
      document.getElementById('nodoFExpandBtn')?.addEventListener('click', () => self.toggle());
      
      // Input ricerca
      document.getElementById('nodoFNome')?.addEventListener('input', () => self.apply());
      
      // Categoria
      document.getElementById('nodoFCategoria')?.addEventListener('change', function() {
        const graded = document.getElementById('nodoFGraded');
        if (graded) graded.style.display = this.value === 'Carte gradate' ? 'block' : 'none';
        self.apply();
      });
      
      // Select
      ['nodoFCasa', 'nodoFVoto', 'nodoFStato'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => self.apply());
      });
      
      // Range
      ['nodoFMin', 'nodoFMax'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
          self.updateSlider();
          self.apply();
        });
      });
      
      // Toggles
      ['nodoTPresenti', 'nodoTAssenti', 'nodoTProfit', 'nodoTLoss', 'nodoTVetrina'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', function() {
          this.classList.toggle('active');
          self.apply();
        });
      });
      
      // Reset
      document.getElementById('nodoFReset')?.addEventListener('click', () => self.reset());
    },
    
    toggle: function() {
      this.isOpen = !this.isOpen;
      document.getElementById('nodoFBody')?.classList.toggle('open', this.isOpen);
      document.getElementById('nodoFExpandBtn')?.classList.toggle('active', this.isOpen);
    },
    
    updateSlider: function() {
      const min = document.getElementById('nodoFMin');
      const max = document.getElementById('nodoFMax');
      const display = document.getElementById('nodoFRangeVal');
      const progress = document.getElementById('nodoFProgress');
      
      if (!min || !max) return;
      
      let minV = parseInt(min.value);
      let maxV = parseInt(max.value);
      
      if (minV > maxV - 100) { min.value = maxV - 100; minV = maxV - 100; }
      
      if (display) display.textContent = `${minV}€ - ${maxV}€`;
      if (progress) {
        progress.style.left = (minV / 10000 * 100) + '%';
        progress.style.width = ((maxV - minV) / 10000 * 100) + '%';
      }
    },
    
    getValues: function() {
      return {
        nome: document.getElementById('nodoFNome')?.value?.toLowerCase() || '',
        categoria: document.getElementById('nodoFCategoria')?.value || '',
        casaGradazione: document.getElementById('nodoFCasa')?.value || '',
        votoGradazione: parseFloat(document.getElementById('nodoFVoto')?.value) || 0,
        valoreMin: parseFloat(document.getElementById('nodoFMin')?.value) || 0,
        valoreMax: parseFloat(document.getElementById('nodoFMax')?.value) || 10000,
        statoMin: parseInt(document.getElementById('nodoFStato')?.value) || 0,
        presenti: document.getElementById('nodoTPresenti')?.classList.contains('active') ?? true,
        assenti: document.getElementById('nodoTAssenti')?.classList.contains('active') ?? true,
        profit: document.getElementById('nodoTProfit')?.classList.contains('active') ?? true,
        loss: document.getElementById('nodoTLoss')?.classList.contains('active') ?? true,
        vetrina: document.getElementById('nodoTVetrina')?.classList.contains('active') ?? false
      };
    },
    
    apply: function() {
      this.updateBadge();
      if (this.onFilter) this.onFilter(this.getValues());
    },
    
    updateBadge: function() {
      const v = this.getValues();
      let count = 0;
      if (v.categoria) count++;
      if (v.casaGradazione) count++;
      if (v.votoGradazione) count++;
      if (v.valoreMin > 0) count++;
      if (v.valoreMax < 10000) count++;
      if (v.statoMin) count++;
      if (!v.presenti) count++;
      if (!v.assenti) count++;
      if (!v.profit) count++;
      if (!v.loss) count++;
      if (v.vetrina) count++;
      
      const badge = document.getElementById('nodoFBadge');
      if (badge) badge.textContent = count > 0 ? count : '';
    },
    
    reset: function() {
      document.getElementById('nodoFNome').value = '';
      document.getElementById('nodoFCategoria').value = '';
      document.getElementById('nodoFCasa').value = '';
      document.getElementById('nodoFVoto').value = '';
      document.getElementById('nodoFMin').value = 0;
      document.getElementById('nodoFMax').value = 10000;
      document.getElementById('nodoFStato').value = '';
      document.getElementById('nodoFGraded').style.display = 'none';
      
      ['nodoTPresenti', 'nodoTAssenti', 'nodoTProfit', 'nodoTLoss'].forEach(id => {
        document.getElementById(id)?.classList.add('active');
      });
      document.getElementById('nodoTVetrina')?.classList.remove('active');
      
      this.updateSlider();
      this.updateBadge();
      if (this.onReset) this.onReset();
    }
  };
  
  console.log('🔍 Filtri.js caricato');
})();
