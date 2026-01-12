// ========================================
// FUNZIONI COMUNI
// ========================================

// Crea particelle animate
function creaParticelle() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 15 + 's';
    particle.style.animationDuration = (15 + Math.random() * 10) + 's';
    container.appendChild(particle);
  }
}

// Inizializzazione pagina
window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Pagina caricata!');
  creaParticelle();
});
