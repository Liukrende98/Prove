// ========================================
// GALLERIA.JS - Lightbox con Navigazione
// NODO Italia - v2.0
// ========================================

(function() {
  
  // Stato
  let currentImages = [];
  let currentIndex = 0;
  let touchStartX = 0;
  let touchEndX = 0;
  
  // Inietta CSS
  const css = `
    /* ========================================
       LIGHTBOX - Navigabile
       ======================================== */
    
    .nodo-lightbox {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      z-index: 99999;
      display: none;
      align-items: center;
      justify-content: center;
      animation: nodoFadeIn 0.3s ease;
    }
    
    .nodo-lightbox.active {
      display: flex;
    }
    
    @keyframes nodoFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .nodo-lightbox-close {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 44px;
      height: 44px;
      background: rgba(255,255,255,0.1);
      border: none;
      border-radius: 50%;
      color: #fff;
      font-size: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }
    
    .nodo-lightbox-image-wrap {
      position: relative;
      max-width: 90vw;
      max-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .nodo-lightbox-image {
      max-width: 100%;
      max-height: 80vh;
      object-fit: contain;
      border-radius: 8px;
      animation: nodoZoomIn 0.3s ease;
    }
    
    @keyframes nodoZoomIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    
    /* Navigazione */
    .nodo-lightbox-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 50px;
      height: 50px;
      background: rgba(251, 191, 36, 0.9);
      border: none;
      border-radius: 50%;
      color: #0a0a0a;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: all 0.2s;
    }
    
    .nodo-lightbox-nav:active {
      transform: translateY(-50%) scale(0.9);
    }
    
    .nodo-lightbox-nav.prev {
      left: 15px;
    }
    
    .nodo-lightbox-nav.next {
      right: 15px;
    }
    
    .nodo-lightbox-nav:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    
    /* Counter */
    .nodo-lightbox-counter {
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.7);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 20px;
    }
    
    .nodo-lightbox-counter span {
      color: #fbbf24;
    }
    
    /* Dots indicator */
    .nodo-lightbox-dots {
      position: absolute;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
    }
    
    .nodo-lightbox-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: rgba(255,255,255,0.3);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .nodo-lightbox-dot.active {
      background: #fbbf24;
      transform: scale(1.2);
    }
    
    /* Hide nav quando singola immagine */
    .nodo-lightbox.single .nodo-lightbox-nav,
    .nodo-lightbox.single .nodo-lightbox-dots,
    .nodo-lightbox.single .nodo-lightbox-counter {
      display: none;
    }
  `;
  
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  
  // Crea HTML lightbox
  function createLightbox() {
    if (document.getElementById('nodoLightbox')) return;
    
    const html = `
      <div class="nodo-lightbox" id="nodoLightbox">
        <button class="nodo-lightbox-close" onclick="NodoGalleria.close()">✕</button>
        
        <button class="nodo-lightbox-nav prev" id="nodoLightboxPrev" onclick="NodoGalleria.prev()">
          <i class="fas fa-chevron-left"></i>
        </button>
        
        <div class="nodo-lightbox-image-wrap">
          <img class="nodo-lightbox-image" id="nodoLightboxImg" src="" alt="">
        </div>
        
        <button class="nodo-lightbox-nav next" id="nodoLightboxNext" onclick="NodoGalleria.next()">
          <i class="fas fa-chevron-right"></i>
        </button>
        
        <div class="nodo-lightbox-dots" id="nodoLightboxDots"></div>
        
        <div class="nodo-lightbox-counter">
          <span id="nodoLightboxCurrent">1</span> / <span id="nodoLightboxTotal">1</span>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    // Bind eventi
    const lightbox = document.getElementById('nodoLightbox');
    
    // Click su sfondo chiude
    lightbox.addEventListener('click', function(e) {
      if (e.target === lightbox || e.target.classList.contains('nodo-lightbox-image-wrap')) {
        NodoGalleria.close();
      }
    });
    
    // Keyboard
    document.addEventListener('keydown', function(e) {
      if (!lightbox.classList.contains('active')) return;
      
      if (e.key === 'Escape') NodoGalleria.close();
      if (e.key === 'ArrowLeft') NodoGalleria.prev();
      if (e.key === 'ArrowRight') NodoGalleria.next();
    });
    
    // Swipe su mobile
    const imgWrap = lightbox.querySelector('.nodo-lightbox-image-wrap');
    
    imgWrap.addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    imgWrap.addEventListener('touchend', function(e) {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });
  }
  
  function handleSwipe() {
    const diff = touchStartX - touchEndX;
    const threshold = 50;
    
    if (diff > threshold) {
      NodoGalleria.next();
    } else if (diff < -threshold) {
      NodoGalleria.prev();
    }
  }
  
  function updateLightbox() {
    const img = document.getElementById('nodoLightboxImg');
    const current = document.getElementById('nodoLightboxCurrent');
    const total = document.getElementById('nodoLightboxTotal');
    const prevBtn = document.getElementById('nodoLightboxPrev');
    const nextBtn = document.getElementById('nodoLightboxNext');
    const dotsContainer = document.getElementById('nodoLightboxDots');
    const lightbox = document.getElementById('nodoLightbox');
    
    if (!img) return;
    
    // Immagine
    img.src = currentImages[currentIndex];
    img.style.animation = 'none';
    img.offsetHeight; // trigger reflow
    img.style.animation = 'nodoZoomIn 0.3s ease';
    
    // Counter
    if (current) current.textContent = currentIndex + 1;
    if (total) total.textContent = currentImages.length;
    
    // Nav buttons
    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex === currentImages.length - 1;
    
    // Dots
    if (dotsContainer) {
      let dotsHtml = '';
      currentImages.forEach((_, i) => {
        dotsHtml += `<div class="nodo-lightbox-dot ${i === currentIndex ? 'active' : ''}" onclick="NodoGalleria.goTo(${i})"></div>`;
      });
      dotsContainer.innerHTML = dotsHtml;
    }
    
    // Single mode
    if (lightbox) {
      lightbox.classList.toggle('single', currentImages.length === 1);
    }
  }
  
  // Oggetto globale
  window.NodoGalleria = {
    open: function(images, startIndex = 0) {
      createLightbox();
      
      // Filtra immagini valide
      currentImages = images.filter(img => img && img.trim());
      currentIndex = Math.min(startIndex, currentImages.length - 1);
      
      if (currentImages.length === 0) return;
      
      const lightbox = document.getElementById('nodoLightbox');
      if (lightbox) {
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        updateLightbox();
      }
    },
    
    close: function() {
      const lightbox = document.getElementById('nodoLightbox');
      if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
      }
    },
    
    next: function() {
      if (currentIndex < currentImages.length - 1) {
        currentIndex++;
        updateLightbox();
      }
    },
    
    prev: function() {
      if (currentIndex > 0) {
        currentIndex--;
        updateLightbox();
      }
    },
    
    goTo: function(index) {
      if (index >= 0 && index < currentImages.length) {
        currentIndex = index;
        updateLightbox();
      }
    }
  };
  
  console.log('🖼️ Galleria.js caricato');
})();
