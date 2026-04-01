/* ═══════════════════════════════════════════
   AUREQLUXE — script.js
   ═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

    /* ── Prevenir recarga en links vacíos ── */
    document.querySelectorAll('a[href="#"]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
        });
    });

    /* ── Animación suave de aparición en features ── */
    var features = document.querySelectorAll('.feature-list article');

    if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry, index) {
                if (entry.isIntersecting) {
                    setTimeout(function () {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, index * 120);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        features.forEach(function (el) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(24px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            observer.observe(el);
        });
    }

});