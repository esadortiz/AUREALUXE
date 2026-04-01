(function () {
  var SUPABASE_URL = 'https://webwxpumtvihppkhakox.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_dLrp6AspzhqaGe58WGBd6Q_kveesjx0';
  var TRACK_ENDPOINT = SUPABASE_URL + '/functions/v1/conversion-track-event';
  var VISITOR_KEY = 'aurealuxe_analytics_visitor_id';
  var SESSION_KEY = 'aurealuxe_analytics_session_id';
  var EVENT_TYPES = ['page_view', 'add_to_cart', 'checkout_started', 'purchase_completed'];

  function safeStorageGet(storage, key) {
    try {
      return storage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function safeStorageSet(storage, key, value) {
    try {
      storage.setItem(key, value);
    } catch (_error) {
      // Ignorar si el navegador restringe almacenamiento.
    }
  }

  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function getVisitorId() {
    var existing = safeStorageGet(localStorage, VISITOR_KEY);
    if (existing) {
      return existing;
    }

    var next = generateId();
    safeStorageSet(localStorage, VISITOR_KEY, next);
    return next;
  }

  function getSessionId() {
    var existing = safeStorageGet(sessionStorage, SESSION_KEY);
    if (existing) {
      return existing;
    }

    var next = generateId();
    safeStorageSet(sessionStorage, SESSION_KEY, next);
    return next;
  }

  function cleanText(value, maxLength) {
    var normalized = String(value || '').trim();
    if (!normalized) {
      return '';
    }

    if (normalized.length > maxLength) {
      return normalized.slice(0, maxLength);
    }

    return normalized;
  }

  function cleanNumber(value) {
    var parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizePayload(eventType, payload) {
    var data = payload && typeof payload === 'object' ? payload : {};

    var metadata = data.metadata && typeof data.metadata === 'object'
      ? data.metadata
      : {};

    return {
      eventType: eventType,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      userEmail: cleanText(data.userEmail, 190) || null,
      pagePath: cleanText(data.pagePath, 260) || cleanText(window.location.pathname + window.location.search, 260) || null,
      pageTitle: cleanText(data.pageTitle, 220) || cleanText(document.title, 220) || null,
      referrer: cleanText(data.referrer, 260) || cleanText(document.referrer, 260) || null,
      productId: cleanText(data.productId, 120) || null,
      productName: cleanText(data.productName, 220) || null,
      category: cleanText(data.category, 120) || null,
      brand: cleanText(data.brand, 120) || null,
      quantity: Number.isFinite(parseInt(data.quantity, 10)) ? parseInt(data.quantity, 10) : null,
      value: cleanNumber(data.value),
      currency: cleanText(data.currency, 12) || 'COP',
      orderId: cleanText(data.orderId, 120) || null,
      metadata: metadata,
      occurredAt: new Date().toISOString()
    };
  }

  function sendEvent(eventType, payload) {
    if (EVENT_TYPES.indexOf(eventType) === -1) {
      return Promise.resolve();
    }

    var body = normalizePayload(eventType, payload);

    return fetch(TRACK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: 'Bearer ' + SUPABASE_KEY
      },
      body: JSON.stringify(body),
      keepalive: true
    }).catch(function () {
      // No bloquear UX por fallos de red en analitica.
    });
  }

  window.aureaTrackEvent = function (eventType, payload) {
    return sendEvent(eventType, payload);
  };

  document.addEventListener('DOMContentLoaded', function () {
    window.aureaTrackEvent('page_view', {
      metadata: {
        page_url: window.location.href,
        user_agent: navigator.userAgent
      }
    });
  });
})();
