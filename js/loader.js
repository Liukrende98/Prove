// ========================================
// LOADER.JS - Sistema di caricamento animato
// NODO Italia
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
        <div class="loader-text">Caricamento...</div>
      </div>
    </div>
  `;
  
  // Crea stili loader
  const loaderCSS = `
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
      z-index: 99999;
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
    
    /* Mini Loader per operazioni */
    .mini-loader {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    
    .mini-loader-dots {
      display: flex;
      gap: 4px;
    }
    
    .mini-loader-dot {
      width: 8px;
      height: 8px;
      background: #fbbf24;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
    }
    
    .mini-loader-dot:nth-child(1) { animation-delay: -0.32s; }
    .mini-loader-dot:nth-child(2) { animation-delay: -0.16s; }
    .mini-loader-dot:nth-child(3) { animation-delay: 0s; }
    
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    
    /* Skeleton loader per card */
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
    
    .skeleton-text {
      height: 20px;
      margin-bottom: 10px;
    }
    
    .skeleton-text.short {
      width: 60%;
    }
  `;
  
  // Inietta CSS
  const styleEl = document.createElement('style');
  styleEl.textContent = loaderCSS;
  document.head.appendChild(styleEl);
  
  // Inietta HTML
  document.body.insertAdjacentHTML('afterbegin', loaderHTML);
  
  // Funzioni globali
  window.showLoader = function(text) {
    const loader = document.getElementById('pageLoader');
    const loaderText = loader?.querySelector('.loader-text');
    
    if (loader) {
      loader.classList.remove('hidden');
      if (loaderText && text) loaderText.textContent = text;
    }
  };
  
  window.hideLoader = function() {
    const loader = document.getElementById('pageLoader');
    if (loader) {
      loader.classList.add('hidden');
    }
  };
  
  window.showMiniLoader = function(container, text = 'Caricamento...') {
    if (typeof container === 'string') {
      container = document.getElementById(container);
    }
    if (container) {
      container.innerHTML = `
        <div class="mini-loader">
          <div class="mini-loader-dots">
            <div class="mini-loader-dot"></div>
            <div class="mini-loader-dot"></div>
            <div class="mini-loader-dot"></div>
          </div>
          <span>${text}</span>
        </div>
      `;
    }
  };
  
  window.showSkeletonCards = function(container, count = 3) {
    if (typeof container === 'string') {
      container = document.getElementById(container);
    }
    if (container) {
      let html = '';
      for (let i = 0; i < count; i++) {
        html += '<div class="skeleton skeleton-card"></div>';
      }
      container.innerHTML = html;
    }
  };
  
  // Nascondi loader quando pagina caricata
  if (document.readyState === 'complete') {
    setTimeout(hideLoader, 500);
  } else {
    window.addEventListener('load', function() {
      setTimeout(hideLoader, 500);
    });
  }
  
  console.log('✨ Loader.js caricato');
})();
