/* ═══════════════════════════════════════════
   AUREALUXE — image-optimizer.js
   Lazy Loading automático + Optimización de imágenes
   ═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function() {
  initLazyLoading();
  preloadCriticalImages();
});

/**
 * Inicializa Lazy Loading nativo del navegador
 */
function initLazyLoading() {
  // Todas las imágenes con loading="lazy" se cargan automáticamente
  // cuando están a punto de entrarse en viewport (125px antes)
  
  // Para navegadores que no soportan Intersection Observer:
  if ('IntersectionObserver' in window) {
    handleIntersectionObserver();
  }
}

/**
 * Usa Intersection Observer para máximo rendimiento
 * Precarga imágenes 200px antes de que entren en viewport
 */
function handleIntersectionObserver() {
  const imageElements = document.querySelectorAll('img[loading="lazy"]');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        
        // Si tiene data-src, cargala
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        
        // Marcar como cargada
        img.classList.add('loaded');
        
        // Dejar de observar esta imagen
        observer.unobserve(img);
      }
    });
  }, {
    // Crear buffer de 200px para pre-cargar antes de verse
    rootMargin: '200px',
    threshold: 0
  });
  
  // Observar todas las imágenes lazy
  imageElements.forEach(img => {
    imageObserver.observe(img);
  });
}

/**
 * Precargar imágenes críticas (hero, logo, etc)
 * Se cargan inmediatamente sin esperar scroll
 */
function preloadCriticalImages() {
  const criticalImages = document.querySelectorAll('img[data-preload]');
  
  criticalImages.forEach(img => {
    if (img.dataset.src) {
      // Crear imagen offscreen para precarga
      const preloadImg = new Image();
      preloadImg.src = img.dataset.src;
      
      // Una vez cargada, asignarla al img visible
      preloadImg.onload = function() {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.classList.add('loaded');
      };
    }
  });
}

/**
 * Cargar imagen cuando está en viewport
 * (Fallback para navegadores sin soporte nativo)
 */
function loadImageOnScroll(img) {
  if (!img.dataset.src) return;
  
  const rect = img.getBoundingClientRect();
  const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
  
  if (isVisible) {
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
    img.classList.add('loaded');
    return true;
  }
  
  return false;
}

/**
 * Manejo de fallback para navegadores sin Intersection Observer
 */
if (!('IntersectionObserver' in window)) {
  window.addEventListener('scroll', function() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => {
      if (loadImageOnScroll(img)) {
        img.removeEventListener('scroll', loadImageOnScroll);
      }
    });
  }, { passive: true });
}

/**
 * CSS para transición suave de carga
 */
const style = document.createElement('style');
style.textContent = `
  img[loading="lazy"] {
    opacity: 0.7;
    transition: opacity 0.3s ease-in-out;
  }
  
  img[loading="lazy"].loaded,
  img.loaded {
    opacity: 1;
  }
  
  /* Placeholder animado mientras carga */
  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }
  
  img[loading="lazy"][src*="placeholder"],
  img[data-src] {
    background: linear-gradient(
      90deg,
      #f0f0f0 25%,
      #e0e0e0 50%,
      #f0f0f0 75%
    );
    background-size: 1000px 100%;
    animation: shimmer 2s infinite;
  }
`;
document.head.appendChild(style);

console.log('✅ Image Optimizer iniciado — Lazy Loading activado');
