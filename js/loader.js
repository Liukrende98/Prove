// ========================================
// LOADER.JS - Sistema di caricamento animato
// NODO Italia - v2.0
// ========================================

(function() {
  // Crea elementi loader
  const loaderHTML = `
    <div id="pageLoader" class="page-loader">
      <div class="loader-content">
        <div class="loader-logo">NODO</div>
        <div class="loader-spinner">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
        </div>
        <div class="loader-text" id="loaderText">Caricamento...</div>
      </div>
    </div>
    
    <!-- Mini loader per operazioni -->
    <div id="operationLoader" class="operation-loader">
      <div class="operation-content">
        <div class="operation-spinner"></div>
        <div class="operation-text" id="operationText">Salvataggio...</div>
      </div>
    </div>
  `;
  
  // Crea stili loader
  const loaderCSS = `
    /* ========================================
       PAGE LOADER - Caricamento iniziale
       ======================================== */
    
    .page-loader {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      transition: opacity 0.5s ease, visibility 0.5s ease;
    }
    
    .page-loader.hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }
    
    .loader-content {
      text-align: center;
    }
    
    .loader-logo {
      font-size: 48px;
      font-weight: 900;
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 30px;
      animation: pulse 2s ease-in-out infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(0.98); }
    }
    
    .loader-spinner {
      position: relative;
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
    }
    
    .spinner-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 3px solid transparent;
      animation: spin 1.5s linear infinite;
    }
    
    .spinner-ring:nth-child(1) {
      border-top-color: #fbbf24;
      animation-delay: 0s;
    }
    
    .spinner-ring:nth-child(2) {
      width: 60px;
      height: 60px;
      top: 10px;
      left: 10px;
      border-right-color: #f59e0b;
      animation-delay: 0.15s;
      animation-direction: reverse;
    }
    
    .spinner-ring:nth-child(3) {
      width: 40px;
      height: 40px;
      top: 20px;
      left: 20px;
      border-bottom-color: #fbbf24;
      animation-delay: 0.3s;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .loader-text {
      color: #888;
      font-size: 14px;
      letter-spacing: 2px;
      text-transform: uppercase;
      animation: blink 1.5s ease-in-out infinite;
    }
    
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    /* ========================================
       OPERATION LOADER - Per salvataggio/modifica
       ======================================== */
    
    .operation-loader {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 999998;
      backdrop-filter: blur(4px);
    }
    
    .operation-loader.active {
      display: flex;
      animation: fadeIn 0.2s ease;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .operation-content {
      background: #1a1a1a;
      border: 1px solid rgba(251, 191, 36, 0.3);
      border-radius: 16px;
      padding: 30px 50px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    }
    
    .operation-spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(251, 191, 36, 0.2);
      border-top-color: #fbbf24;
      border-radius: 50%;
      margin: 0 auto 20px;
      animation: spin 0.8s linear infinite;
    }
    
    .operation-text {
      color: #fff;
      font-size: 16px;
      font-weight: 600;
    }
    
    /* ========================================
       SKELETON LOADER
       ======================================== */
    
    .skeleton {
      background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 8px;
    }
    
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    .skeleton-card {
      height: 300px;
      margin-bottom: 15px;
    }
    
    .skeleton-list {
      height: 80px;
      margin-bottom: 10px;
    }
  `;
  
  // Inietta CSS
  const styleEl = document.createElement('style');
  styleEl.textContent = loaderCSS;
  document.head.appendChild(styleEl);
  
  // Inietta HTML
  document.body.insertAdjacentHTML('afterbegin', loaderHTML);
  
  // Funzioni globali
  window.NodoLoader = {
    // Mostra loader pagina
    show: function(text) {
      const loader = document.getElementById('pageLoader');
      const loaderText = document.getElementById('loaderText');
      
      if (loader) {
        loader.classList.remove('hidden');
        if (loaderText && text) loaderText.textContent = text;
      }
    },
    
    // Nascondi loader pagina
    hide: function() {
      const loader = document.getElementById('pageLoader');
      if (loader) {
        loader.classList.add('hidden');
      }
    },
    
    // Mostra loader operazione (salvataggio, modifica, ecc)
    showOperation: function(text = 'Salvataggio in corso...') {
      const loader = document.getElementById('operationLoader');
      const loaderText = document.getElementById('operationText');
      
      if (loader) {
        loader.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (loaderText) loaderText.textContent = text;
      }
    },
    
    // Nascondi loader operazione
    hideOperation: function() {
      const loader = document.getElementById('operationLoader');
      if (loader) {
        loader.classList.remove('active');
        document.body.style.overflow = '';
      }
    },
    
    // Mostra skeleton cards
    showSkeletonCards: function(containerId, count = 3) {
      const container = document.getElementById(containerId);
      if (container) {
        let html = '';
        for (let i = 0; i < count; i++) {
          html += '<div class="skeleton skeleton-card"></div>';
        }
        container.innerHTML = html;
      }
    },
    
    // Mostra skeleton list
    showSkeletonList: function(containerId, count = 5) {
      const container = document.getElementById(containerId);
      if (container) {
        let html = '';
        for (let i = 0; i < count; i++) {
          html += '<div class="skeleton skeleton-list"></div>';
        }
        container.innerHTML = html;
      }
    }
  };
  
  // Alias per retrocompatibilità
  window.showLoader = NodoLoader.show;
  window.hideLoader = NodoLoader.hide;
  
  // Nascondi loader quando pagina caricata
  if (document.readyState === 'complete') {
    setTimeout(NodoLoader.hide, 500);
  } else {
    window.addEventListener('load', function() {
      setTimeout(NodoLoader.hide, 500);
    });
  }
  
  console.log('✨ Loader.js caricato');
})();
