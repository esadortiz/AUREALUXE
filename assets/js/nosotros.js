// ── ANIMACIÓN: elementos aparecen al hacer scroll ──
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

// Aplicar animación a secciones y elementos clave
const animados = document.querySelectorAll(
  '.historia-texto, .historia-img, .valor-item, .stat-item'
);

animados.forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s`;
  observer.observe(el);
});

// Clase visible que activa la animación
document.head.insertAdjacentHTML('beforeend', `
  <style>
    .visible {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
  </style>
`);

// ── CONTADOR ANIMADO para las estadísticas ──
function animarContador(el, inicio, fin, sufijo, duracion) {
  let startTime = null;

  const step = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const progreso = Math.min((timestamp - startTime) / duracion, 1);
    const valor = Math.floor(progreso * (fin - inicio) + inicio);
    el.textContent = valor + sufijo;
    if (progreso < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

// Observar cuando los stats entran en pantalla
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const nums = document.querySelectorAll('.stat-num');
      const datos = [
        { fin: 10, sufijo: 'k+' },
        { fin: 500, sufijo: '+' },
        { fin: 50, sufijo: '+' },
      ];
      nums.forEach((num, i) => {
        animarContador(num, 0, datos[i].fin, datos[i].sufijo, 1500);
      });
      statsObserver.disconnect();
    }
  });
}, { threshold: 0.4 });

const statsSection = document.querySelector('.stats');
if (statsSection) statsObserver.observe(statsSection);