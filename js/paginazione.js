// ========================================
// PAGINAZIONE.JS - Sistema Paginazione Riutilizzabile
// NODO Italia - v2.0
// ========================================

(function() {
  
  // Inietta CSS
  const css = `
    /* ========================================
       PAGINAZIONE - Mobile First
       ======================================== */
    
    .nodo-pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #141414;
      border-radius: 12px;
      padding: 12px 16px;
      margin: 15px 0;
      border: 1px solid rgba(255,255,255,0.1);
    }
    
    .nodo-pagination-info {
      font-size: 13px;
      color: #888;
    }
    
    .nodo-pagination-info span {
      color: #fbbf24;
      font-weight: 600;
    }
    
    .nodo-pagination-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .nodo-pagination-btn {
      width: 44px;
      height: 44px;
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.3);
      border-radius: 10px;
      color: #fbbf24;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    
    .nodo-pagination-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    
    .nodo-pagination-btn:not(:disabled):active {
      background: #fbbf24;
      color: #0a0a0a;
      transform: scale(0.95);
    }
    
    .nodo-pagination-page {
      min-width: 44px;
      height: 44px;
      padding: 0 12px;
      background: #1a1a1a;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    /* Paginazione compatta per mobile */
    @media (max-width: 400px) {
      .nodo-pagination {
        flex-wrap: wrap;
        gap: 10px;
        justify-content: center;
      }
      
      .nodo-pagination-info {
        width: 100%;
        text-align: center;
      }
    }
  `;
  
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  
  // Oggetto globale paginazione
  window.NodoPagination = {
    currentPage: 1,
    totalItems: 0,
    itemsPerPage: 10,
    onPageChange: null,
    containers: [],
    
    init: function(options = {}) {
      this.currentPage = options.currentPage || 1;
      this.totalItems = options.totalItems || 0;
      this.itemsPerPage = options.itemsPerPage || 10;
      this.onPageChange = options.onPageChange || null;
      this.containers = options.containers || ['paginationTop', 'paginationBottom'];
      
      this.render();
      console.log('📄 NodoPagination inizializzato');
    },
    
    render: function() {
      const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
      const start = (this.currentPage - 1) * this.itemsPerPage + 1;
      const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
      
      const html = `
        <div class="nodo-pagination-info">
          <span>${this.totalItems > 0 ? start : 0}</span>-<span>${end}</span> di <span>${this.totalItems}</span>
        </div>
        <div class="nodo-pagination-controls">
          <button class="nodo-pagination-btn" id="nodoPagPrev" ${this.currentPage <= 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
          </button>
          <div class="nodo-pagination-page">${this.currentPage} / ${totalPages || 1}</div>
          <button class="nodo-pagination-btn" id="nodoPagNext" ${this.currentPage >= totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      `;
      
      // Render in tutti i container
      this.containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
          container.innerHTML = html;
          container.className = 'nodo-pagination';
          
          // Mostra/nascondi se solo 1 pagina
          container.style.display = totalPages > 1 ? 'flex' : 'none';
        }
      });
      
      this.bindEvents();
    },
    
    bindEvents: function() {
      const self = this;
      
      // Bind per ogni container
      document.querySelectorAll('.nodo-pagination-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          if (this.id.includes('Prev')) {
            self.prevPage();
          } else if (this.id.includes('Next')) {
            self.nextPage();
          }
        });
      });
    },
    
    update: function(totalItems, currentPage = null) {
      this.totalItems = totalItems;
      if (currentPage !== null) {
        this.currentPage = currentPage;
      }
      this.render();
    },
    
    setPage: function(page) {
      const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
      if (page < 1 || page > totalPages) return;
      
      this.currentPage = page;
      this.render();
      
      if (this.onPageChange) {
        this.onPageChange(this.currentPage);
      }
    },
    
    nextPage: function() {
      const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
      if (this.currentPage < totalPages) {
        this.setPage(this.currentPage + 1);
      }
    },
    
    prevPage: function() {
      if (this.currentPage > 1) {
        this.setPage(this.currentPage - 1);
      }
    },
    
    getTotalPages: function() {
      return Math.ceil(this.totalItems / this.itemsPerPage);
    },
    
    getPageItems: function(items) {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return items.slice(start, end);
    }
  };
  
  console.log('📄 Paginazione.js caricato');
})();
