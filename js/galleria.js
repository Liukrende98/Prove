// ========================================
// GALLERIA.JS - Lightbox con Swipe FUNZIONANTE
// NODO Italia - v3.0
// ========================================

(function() {
  
  // Stato
  var currentImages = [];
  var currentIndex = 0;
  var startX = 0;
  var startY = 0;
  var distX = 0;
  var distY = 0;
  var isDown = false;
  
  // Inietta CSS
  var css = [
    '.nodo-lightbox {',
    '  position: fixed;',
    '  top: 0;',
    '  left: 0;',
    '  width: 100%;',
    '  height: 100%;',
    '  background: rgba(0, 0, 0, 0.97);',
    '  z-index: 99999;',
    '  display: none;',
    '  align-items: center;',
    '  justify-content: center;',
    '  overflow: hidden;',
    '}',
    '.nodo-lightbox.active {',
    '  display: flex;',
    '}',
    '.nodo-lb-close {',
    '  position: absolute;',
    '  top: 15px;',
    '  right: 15px;',
    '  width: 44px;',
    '  height: 44px;',
    '  background: rgba(255,255,255,0.1);',
    '  border: none;',
    '  border-radius: 50%;',
    '  color: #fff;',
    '  font-size: 22px;',
    '  cursor: pointer;',
    '  z-index: 100;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '}',
    '.nodo-lb-swipe-area {',
    '  position: absolute;',
    '  top: 0;',
    '  left: 0;',
    '  width: 100%;',
    '  height: 100%;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  cursor: grab;',
    '  touch-action: pan-y;',
    '}',
    '.nodo-lb-image {',
    '  max-width: 92vw;',
    '  max-height: 80vh;',
    '  object-fit: contain;',
    '  border-radius: 8px;',
    '  user-select: none;',
    '  -webkit-user-select: none;',
    '  pointer-events: none;',
    '  transition: transform 0.15s ease-out;',
    '}',
    '.nodo-lb-nav {',
    '  position: absolute;',
    '  top: 50%;',
    '  transform: translateY(-50%);',
    '  width: 50px;',
    '  height: 50px;',
    '  background: rgba(251, 191, 36, 0.9);',
    '  border: none;',
    '  border-radius: 50%;',
    '  color: #0a0a0a;',
    '  font-size: 18px;',
    '  cursor: pointer;',
    '  z-index: 100;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '}',
    '.nodo-lb-nav:active { transform: translateY(-50%) scale(0.9); }',
    '.nodo-lb-nav.prev { left: 10px; }',
    '.nodo-lb-nav.next { right: 10px; }',
    '.nodo-lb-nav:disabled { opacity: 0.3; pointer-events: none; }',
    '.nodo-lb-counter {',
    '  position: absolute;',
    '  top: 20px;',
    '  left: 50%;',
    '  transform: translateX(-50%);',
    '  background: rgba(0,0,0,0.6);',
    '  color: #fff;',
    '  font-size: 14px;',
    '  font-weight: 600;',
    '  padding: 8px 16px;',
    '  border-radius: 20px;',
    '  z-index: 100;',
    '}',
    '.nodo-lb-counter .current { color: #fbbf24; }',
    '.nodo-lb-dots {',
    '  position: absolute;',
    '  bottom: 30px;',
    '  left: 50%;',
    '  transform: translateX(-50%);',
    '  display: flex;',
    '  gap: 10px;',
    '  z-index: 100;',
    '}',
    '.nodo-lb-dot {',
    '  width: 12px;',
    '  height: 12px;',
    '  border-radius: 50%;',
    '  background: rgba(255,255,255,0.3);',
    '  cursor: pointer;',
    '  border: none;',
    '}',
    '.nodo-lb-dot.active { background: #fbbf24; transform: scale(1.3); }',
    '.nodo-lb-hint {',
    '  position: absolute;',
    '  bottom: 80px;',
    '  left: 50%;',
    '  transform: translateX(-50%);',
    '  color: rgba(255,255,255,0.5);',
    '  font-size: 12px;',
    '  z-index: 100;',
    '}',
    '.nodo-lightbox.single .nodo-lb-nav,',
    '.nodo-lightbox.single .nodo-lb-dots,',
    '.nodo-lightbox.single .nodo-lb-hint { display: none; }'
  ].join('\n');
  
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  
  function createLightbox() {
    if (document.getElementById('nodoLightbox')) return;
    
    var html = [
      '<div class="nodo-lightbox" id="nodoLightbox">',
      '  <button class="nodo-lb-close" id="nodoLbClose">✕</button>',
      '  <div class="nodo-lb-counter"><span class="current" id="nodoLbCurrent">1</span> / <span id="nodoLbTotal">1</span></div>',
      '  <button class="nodo-lb-nav prev" id="nodoLbPrev"><i class="fas fa-chevron-left"></i></button>',
      '  <div class="nodo-lb-swipe-area" id="nodoLbSwipe"><img class="nodo-lb-image" id="nodoLbImg" src="" alt="" draggable="false"></div>',
      '  <button class="nodo-lb-nav next" id="nodoLbNext"><i class="fas fa-chevron-right"></i></button>',
      '  <div class="nodo-lb-dots" id="nodoLbDots"></div>',
      '  <div class="nodo-lb-hint" id="nodoLbHint"><i class="fas fa-arrows-left-right"></i> Scorri per navigare</div>',
      '</div>'
    ].join('');
    
    document.body.insertAdjacentHTML('beforeend', html);
    bindEvents();
  }
  
  function bindEvents() {
    var lightbox = document.getElementById('nodoLightbox');
    var swipeArea = document.getElementById('nodoLbSwipe');
    var closeBtn = document.getElementById('nodoLbClose');
    var prevBtn = document.getElementById('nodoLbPrev');
    var nextBtn = document.getElementById('nodoLbNext');
    
    closeBtn.onclick = function() { NodoGalleria.close(); };
    prevBtn.onclick = function(e) { e.stopPropagation(); NodoGalleria.prev(); };
    nextBtn.onclick = function(e) { e.stopPropagation(); NodoGalleria.next(); };
    
    lightbox.onclick = function(e) {
      if (e.target === lightbox || e.target === swipeArea) {
        NodoGalleria.close();
      }
    };
    
    document.addEventListener('keydown', function(e) {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') NodoGalleria.close();
      if (e.key === 'ArrowLeft') NodoGalleria.prev();
      if (e.key === 'ArrowRight') NodoGalleria.next();
    });
    
    // TOUCH EVENTS
    swipeArea.addEventListener('touchstart', function(e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      distX = 0;
      distY = 0;
      isDown = true;
    }, { passive: true });
    
    swipeArea.addEventListener('touchmove', function(e) {
      if (!isDown) return;
      distX = e.touches[0].clientX - startX;
      distY = e.touches[0].clientY - startY;
      
      var img = document.getElementById('nodoLbImg');
      if (img && Math.abs(distX) > Math.abs(distY)) {
        img.style.transform = 'translateX(' + (distX * 0.3) + 'px)';
      }
    }, { passive: true });
    
    swipeArea.addEventListener('touchend', function() {
      if (!isDown) return;
      isDown = false;
      
      var img = document.getElementById('nodoLbImg');
      if (img) img.style.transform = '';
      
      if (Math.abs(distX) > 50 && Math.abs(distX) > Math.abs(distY)) {
        if (distX < 0) {
          NodoGalleria.next();
        } else {
          NodoGalleria.prev();
        }
      }
      
      distX = 0;
      distY = 0;
    }, { passive: true });
    
    // MOUSE EVENTS (desktop)
    swipeArea.addEventListener('mousedown', function(e) {
      startX = e.clientX;
      distX = 0;
      isDown = true;
      e.preventDefault();
    });
    
    swipeArea.addEventListener('mousemove', function(e) {
      if (!isDown) return;
      distX = e.clientX - startX;
      var img = document.getElementById('nodoLbImg');
      if (img) img.style.transform = 'translateX(' + (distX * 0.3) + 'px)';
    });
    
    swipeArea.addEventListener('mouseup', handleMouseUp);
    swipeArea.addEventListener('mouseleave', handleMouseUp);
    
    function handleMouseUp() {
      if (!isDown) return;
      isDown = false;
      
      var img = document.getElementById('nodoLbImg');
      if (img) img.style.transform = '';
      
      if (Math.abs(distX) > 50) {
        if (distX < 0) {
          NodoGalleria.next();
        } else {
          NodoGalleria.prev();
        }
      }
      distX = 0;
    }
  }
  
  function updateUI() {
    var img = document.getElementById('nodoLbImg');
    var current = document.getElementById('nodoLbCurrent');
    var total = document.getElementById('nodoLbTotal');
    var prevBtn = document.getElementById('nodoLbPrev');
    var nextBtn = document.getElementById('nodoLbNext');
    var dotsContainer = document.getElementById('nodoLbDots');
    var lightbox = document.getElementById('nodoLightbox');
    var hint = document.getElementById('nodoLbHint');
    
    if (!img || !currentImages[currentIndex]) return;
    
    img.src = currentImages[currentIndex];
    
    if (current) current.textContent = currentIndex + 1;
    if (total) total.textContent = currentImages.length;
    
    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex === currentImages.length - 1;
    
    if (dotsContainer) {
      var dotsHtml = '';
      for (var i = 0; i < currentImages.length; i++) {
        dotsHtml += '<button class="nodo-lb-dot ' + (i === currentIndex ? 'active' : '') + '" onclick="NodoGalleria.goTo(' + i + ')"></button>';
      }
      dotsContainer.innerHTML = dotsHtml;
    }
    
    if (lightbox) {
      if (currentImages.length <= 1) {
        lightbox.classList.add('single');
      } else {
        lightbox.classList.remove('single');
      }
    }
    
    if (hint && currentIndex > 0) {
      hint.style.display = 'none';
    }
  }
  
  // API Globale
  window.NodoGalleria = {
    open: function(images, startIndex) {
      createLightbox();
      
      startIndex = startIndex || 0;
      currentImages = [];
      
      if (Array.isArray(images)) {
        for (var i = 0; i < images.length; i++) {
          if (images[i] && typeof images[i] === 'string' && images[i].trim()) {
            currentImages.push(images[i]);
          }
        }
      }
      
      currentIndex = Math.max(0, Math.min(startIndex, currentImages.length - 1));
      
      if (currentImages.length === 0) {
        console.warn('NodoGalleria: nessuna immagine valida');
        return;
      }
      
      var lightbox = document.getElementById('nodoLightbox');
      if (lightbox) {
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        var hint = document.getElementById('nodoLbHint');
        if (hint) hint.style.display = currentImages.length > 1 ? 'block' : 'none';
        
        updateUI();
      }
    },
    
    close: function() {
      var lightbox = document.getElementById('nodoLightbox');
      if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
      }
    },
    
    next: function() {
      if (currentIndex < currentImages.length - 1) {
        currentIndex++;
        updateUI();
      }
    },
    
    prev: function() {
      if (currentIndex > 0) {
        currentIndex--;
        updateUI();
      }
    },
    
    goTo: function(index) {
      if (index >= 0 && index < currentImages.length) {
        currentIndex = index;
        updateUI();
      }
    }
  };
  
  console.log('🖼️ Galleria.js v3 - Swipe attivo!');
})();
