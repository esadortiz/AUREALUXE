(function () {
  var STYLE_ID = 'aurea-scroll-reveal-style';
  var TARGET_SELECTOR = 'main > section, main > div, footer';

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.aurea-reveal {',
      '  opacity: 0;',
      '  transform: translate3d(0, 26px, 0);',
      '  filter: blur(2px);',
      '  transition:',
      '    opacity 0.62s cubic-bezier(0.2, 0.7, 0.2, 1),',
      '    transform 0.62s cubic-bezier(0.2, 0.7, 0.2, 1),',
      '    filter 0.62s cubic-bezier(0.2, 0.7, 0.2, 1);',
      '  transition-delay: var(--aurea-reveal-delay, 0ms);',
      '  will-change: opacity, transform, filter;',
      '}',
      '.aurea-reveal.is-visible {',
      '  opacity: 1;',
      '  transform: translate3d(0, 0, 0);',
      '  filter: blur(0);',
      '}',
      '@media (prefers-reduced-motion: reduce) {',
      '  .aurea-reveal {',
      '    opacity: 1 !important;',
      '    transform: none !important;',
      '    filter: none !important;',
      '    transition: none !important;',
      '  }',
      '}'
    ].join('\n');

    document.head.appendChild(style);
  }

  function getTargets() {
    var nodes = Array.from(document.querySelectorAll(TARGET_SELECTOR));
    return nodes.filter(function (el) {
      if (!(el instanceof HTMLElement)) {
        return false;
      }

      if (el.hasAttribute('data-no-reveal')) {
        return false;
      }

      var computed = window.getComputedStyle(el);
      return computed.display !== 'none' && computed.visibility !== 'hidden';
    });
  }

  function showAll(targets) {
    targets.forEach(function (el) {
      el.classList.add('aurea-reveal', 'is-visible');
    });
  }

  function initReveal() {
    var targets = getTargets();
    if (targets.length === 0) {
      return;
    }

    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      showAll(targets);
      return;
    }

    targets.forEach(function (el, index) {
      el.classList.add('aurea-reveal');
      el.style.setProperty('--aurea-reveal-delay', Math.min(index * 85, 420) + 'ms');
    });

    var observer = new IntersectionObserver(function (entries, io) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, {
      threshold: 0.14,
      rootMargin: '0px 0px -8% 0px'
    });

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    ensureStyles();
    initReveal();
  });
})();
