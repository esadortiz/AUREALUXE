/* ═══════════════════════════════════════════
   AUREALUXE — carrito-sync.js
   Sincronización de carrito entre páginas
   ═══════════════════════════════════════════ */

const CART_KEY = 'aurealuxe_cart';

/**
 * Inicializa la sincronización del carrito en todas las páginas
 * Actualiza el badge en tiempo real cuando el carrito cambia
 */
function initCartSync() {
  // Listener para cambios en localStorage desde otras pestañas
  window.addEventListener('storage', function (e) {
    if (e.key === CART_KEY) {
      updateCartBadgeGlobal();
    }
  });

  // Actualizar badge inicial
  setTimeout(updateCartBadgeGlobal, 100);
}

/**
 * Actualiza el badge del carrito en TODAS las páginas
 */
function updateCartBadgeGlobal() {
  try {
    const stored = localStorage.getItem(CART_KEY);
    const cart = stored ? JSON.parse(stored) : [];
    
    let totalItems = 0;
    cart.forEach(function (item) {
      totalItems += (item.cantidad || 1);
    });

    // Actualizar todos los badges encontrados en la página
    const badges = document.querySelectorAll('.cart-badge');
    const badgeText = totalItems > 99 ? '99+' : String(totalItems);
    badges.forEach(function (badge) {
      badge.textContent = badgeText;
      
      // Mostrar/ocultar badge basado en cantidad
      if (totalItems === 0) {
        badge.classList.add('hidden');
      } else {
        badge.classList.remove('hidden');
      }
    });
  } catch (e) {
    // Error silencioso - fallback
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCartSync);
} else {
  initCartSync();
}

// Exportar para uso global
window.updateCartBadgeGlobal = updateCartBadgeGlobal;
