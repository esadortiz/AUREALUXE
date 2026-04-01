const CART_STORAGE_KEY = 'aurealuxe_cart';
const WISHLIST_STORAGE_KEY = 'aurealuxe_wishlist';
const OFFER_META_KEY = 'aurealuxe_offer_meta';
const NEWSLETTER_LAST_SENT_KEY = 'aurealuxe_newsletter_last_sent_at';
const SUPABASE_PROJECT_URL = 'https://webwxpumtvihppkhakox.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_dLrp6AspzhqaGe58WGBd6Q_kveesjx0';

const CATEGORY_LABELS = {
  COMPUTADORAS: 'Computadoras',
  SMARTPHONES: 'Smartphones',
  AUDIO: 'Audio',
  ACCESORIOS: 'Accesorios',
  TELEVISORES: 'Televisores'
};

const CATEGORY_PROMOS = {
  COMPUTADORAS: {
    title: 'Semana de laptops premium',
    description: 'Bono de hasta 12% en portatiles seleccionados y accesorios con precio preferencial.'
  },
  SMARTPHONES: {
    title: 'Upgrade inteligente en smartphones',
    description: 'Promociones exclusivas en equipos flagship con beneficios por renovacion.'
  },
  AUDIO: {
    title: 'Audio inmersivo con precio especial',
    description: 'Descuentos temporales en audifonos y dispositivos de sonido premium.'
  },
  ACCESORIOS: {
    title: 'Combo de accesorios esenciales',
    description: 'Arma tu setup con accesorios top y aplica precio por volumen.'
  },
  TELEVISORES: {
    title: 'Pantallas 4K con beneficio extendido',
    description: 'Aprovecha promociones en televisores y garantia extendida incluida.'
  }
};

function readStorageJson(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      return fallback;
    }
    const parsed = JSON.parse(stored);
    return parsed == null ? fallback : parsed;
  } catch (_error) {
    return fallback;
  }
}

function saveStorageJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_error) {
    // Ignorar error de almacenamiento en navegadores restringidos.
  }
}

function normalizeCategory(value) {
  return String(value || '').trim().toUpperCase();
}

function formatCop(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(value || 0);
}

function getTodayMonthDay() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return mm + '-' + dd;
}

function isDateWindowActive(startMonthDay, endMonthDay) {
  const today = getTodayMonthDay();
  return today >= startMonthDay && today <= endMonthDay;
}

function computeUserContext(meta) {
  const cart = readStorageJson(CART_STORAGE_KEY, []);
  const wishlist = readStorageJson(WISHLIST_STORAGE_KEY, []);
  const safeCart = Array.isArray(cart) ? cart : [];
  const safeWishlist = Array.isArray(wishlist) ? wishlist : [];

  const categoryCounter = {};
  let cartItemsCount = 0;
  let cartValue = 0;

  safeCart.forEach((item) => {
    const qty = Math.max(1, parseInt(item?.cantidad || 1, 10) || 1);
    const price = parseFloat(item?.precio || 0) || 0;
    const category = normalizeCategory(item?.categoria);

    cartItemsCount += qty;
    cartValue += price * qty;

    if (category) {
      categoryCounter[category] = (categoryCounter[category] || 0) + qty;
    }
  });

  const topCategory = Object.keys(categoryCounter)
    .sort((a, b) => (categoryCounter[b] || 0) - (categoryCounter[a] || 0))[0] || '';

  return {
    cartItemsCount,
    cartValue,
    wishlistCount: safeWishlist.length,
    visits: Math.max(1, parseInt(meta?.visits || 1, 10) || 1),
    topCategory
  };
}

function createDateCampaigns() {
  const campaigns = [];

  if (isDateWindowActive('25-01', '31-12')) {
    campaigns.push({
      id: 'fecha-fin-de-mes',
      type: 'fecha',
      badge: 'Fecha',
      title: 'Cierre de mes Aurea',
      description: 'Ahorra hasta 18% en productos seleccionados antes de que termine el mes.',
      validity: 'Vigente hasta fin de mes',
      ctaText: 'Aprovechar ahora',
      href: 'productos.html?campana=fin-de-mes',
      priority: 98
    });
  }

  if (isDateWindowActive('10-01', '15-12')) {
    campaigns.push({
      id: 'fecha-quincena',
      type: 'fecha',
      badge: 'Fecha',
      title: 'Quincena Smart Deals',
      description: 'Beneficios especiales de quincena con precios limitados en categorias clave.',
      validity: 'Vigente del 10 al 15 de cada mes',
      ctaText: 'Ver ofertas de quincena',
      href: 'productos.html?campana=quincena',
      priority: 92
    });
  }

  if (campaigns.length === 0) {
    campaigns.push({
      id: 'fecha-semana',
      type: 'fecha',
      badge: 'Fecha',
      title: 'Ofertas de la semana',
      description: 'Promociones rotativas semanales en tecnologia premium para compra inteligente.',
      validity: 'Actualizacion semanal',
      ctaText: 'Ver ofertas semanales',
      href: 'productos.html?campana=semanal',
      priority: 78
    });
  }

  return campaigns;
}

function createCategoryCampaigns(userContext) {
  const topCategory = userContext.topCategory;
  const campaigns = [];

  if (topCategory && CATEGORY_PROMOS[topCategory]) {
    const promo = CATEGORY_PROMOS[topCategory];
    campaigns.push({
      id: 'categoria-top-' + topCategory.toLowerCase(),
      type: 'categoria',
      badge: 'Categoria',
      title: promo.title,
      description: promo.description,
      validity: 'Segun tu categoria mas consultada: ' + (CATEGORY_LABELS[topCategory] || topCategory),
      ctaText: 'Explorar categoria',
      href: 'productos.html?categoria=' + encodeURIComponent(topCategory),
      priority: 88
    });
  }

  campaigns.push({
    id: 'categoria-mix-tech',
    type: 'categoria',
    badge: 'Categoria',
    title: 'Mix Tech: 3 categorias con descuento',
    description: 'Combina productos de diferentes categorias y desbloquea mejores precios.',
    validity: 'Valido para compras multiproducto',
    ctaText: 'Ver catalogo',
    href: 'productos.html?campana=mix-tech',
    priority: 74
  });

  return campaigns;
}

function createBehaviorCampaigns(userContext) {
  const campaigns = [];

  if (userContext.cartItemsCount > 0) {
    campaigns.push({
      id: 'comportamiento-carrito-activo',
      type: 'comportamiento',
      badge: 'Comportamiento',
      title: 'Tu carrito tiene oferta activa',
      description: 'Tienes ' + userContext.cartItemsCount + ' producto(s) en carrito. Finaliza hoy y asegura el precio actual.',
      validity: 'Condicionada a tu carrito actual',
      ctaText: 'Finalizar compra',
      href: 'carrito.html',
      priority: 100
    });
  }

  if (userContext.wishlistCount > 0) {
    campaigns.push({
      id: 'comportamiento-favoritos',
      type: 'comportamiento',
      badge: 'Comportamiento',
      title: 'Descuento por favoritos guardados',
      description: 'Tus ' + userContext.wishlistCount + ' favoritos pueden entrar en promocion relampago este fin de semana.',
      validity: 'Sujeto a disponibilidad',
      ctaText: 'Ver mis favoritos',
      href: 'productos.html?favoritos=1',
      priority: 90
    });
  }

  if (userContext.visits >= 3) {
    campaigns.push({
      id: 'comportamiento-recurrente',
      type: 'comportamiento',
      badge: 'Comportamiento',
      title: 'Beneficio por cliente recurrente',
      description: 'Por visitar esta seccion con frecuencia, activamos un beneficio especial en compras seleccionadas.',
      validity: 'Personalizada por historial reciente',
      ctaText: 'Descubrir beneficio',
      href: 'productos.html?campana=cliente-recurrente',
      priority: 82
    });
  }

  if (campaigns.length === 0) {
    campaigns.push({
      id: 'comportamiento-bienvenida',
      type: 'comportamiento',
      badge: 'Comportamiento',
      title: 'Oferta de bienvenida inteligente',
      description: 'A medida que explores productos, ajustaremos promociones segun tus intereses.',
      validity: 'Se personaliza con tu actividad',
      ctaText: 'Explorar productos',
      href: 'productos.html',
      priority: 70
    });
  }

  return campaigns;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderBanner(campaign) {
  const heroText = document.getElementById('heroCampaignText');
  const tagEl = document.getElementById('campaignBannerTag');
  const titleEl = document.getElementById('campaignBannerTitle');
  const descEl = document.getElementById('campaignBannerDescription');
  const ctaEl = document.getElementById('campaignBannerCta');

  if (!campaign || !tagEl || !titleEl || !descEl || !ctaEl) {
    return;
  }

  tagEl.textContent = campaign.badge + ' activa';
  titleEl.textContent = campaign.title;
  descEl.textContent = campaign.description;
  ctaEl.textContent = campaign.ctaText;
  ctaEl.href = campaign.href;
  ctaEl.dataset.campaignId = campaign.id;

  if (heroText) {
    heroText.textContent = 'Ofertas definidas por fecha, categoria y tu actividad para mostrarte lo que mas te conviene hoy.';
  }
}

function renderCards(campaigns, filterType) {
  const cardsRoot = document.getElementById('campaignCards');
  const emptyState = document.getElementById('campaignEmpty');
  if (!cardsRoot || !emptyState) {
    return;
  }

  const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];
  const filtered = filterType === 'all'
    ? safeCampaigns
    : safeCampaigns.filter((campaign) => campaign.type === filterType);

  if (filtered.length === 0) {
    cardsRoot.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  const html = filtered.map((campaign) => {
    return [
      '<article class="offer-card">',
      '<span class="badge campaign-' + escapeHtml(campaign.type) + '">' + escapeHtml(campaign.badge) + '</span>',
      '<h2>' + escapeHtml(campaign.title) + '</h2>',
      '<p>' + escapeHtml(campaign.description) + '</p>',
      '<div class="offer-card-meta">',
      '<span class="offer-validity">' + escapeHtml(campaign.validity) + '</span>',
      '<a href="' + escapeHtml(campaign.href) + '" class="offer-card-cta" data-campaign-id="' + escapeHtml(campaign.id) + '">' + escapeHtml(campaign.ctaText) + '</a>',
      '</div>',
      '</article>'
    ].join('');
  }).join('');

  cardsRoot.innerHTML = html;
}

function setupFilterButtons(campaigns) {
  const filterButtons = Array.from(document.querySelectorAll('.campaign-filter'));
  if (filterButtons.length === 0) {
    return;
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = String(button.dataset.filter || 'all');

      filterButtons.forEach((btn) => {
        btn.classList.toggle('active', btn === button);
      });

      renderCards(campaigns, filter);
    });
  });
}

function updateOfferMeta(mutator) {
  const meta = readStorageJson(OFFER_META_KEY, {
    visits: 0,
    lastVisitAt: '',
    clicksByCampaign: {}
  });

  const next = typeof mutator === 'function' ? mutator(meta) || meta : meta;
  saveStorageJson(OFFER_META_KEY, next);
  return next;
}

function setupCampaignClickTracking() {
  document.body.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const actionLink = target.closest('[data-campaign-id]');
    if (!actionLink) {
      return;
    }

    const campaignId = String(actionLink.getAttribute('data-campaign-id') || '').trim();
    if (!campaignId) {
      return;
    }

    updateOfferMeta((meta) => {
      const safeClicks = meta.clicksByCampaign && typeof meta.clicksByCampaign === 'object'
        ? meta.clicksByCampaign
        : {};

      safeClicks[campaignId] = (safeClicks[campaignId] || 0) + 1;

      return {
        ...meta,
        clicksByCampaign: safeClicks
      };
    });
  });
}

function initDynamicCampaigns() {
  const meta = updateOfferMeta((current) => {
    return {
      ...current,
      visits: (parseInt(current?.visits || 0, 10) || 0) + 1,
      lastVisitAt: new Date().toISOString()
    };
  });

  const userContext = computeUserContext(meta);

  const dateCampaigns = createDateCampaigns();
  const categoryCampaigns = createCategoryCampaigns(userContext);
  const behaviorCampaigns = createBehaviorCampaigns(userContext);

  const allCampaigns = []
    .concat(behaviorCampaigns.slice(0, 2))
    .concat(dateCampaigns.slice(0, 2))
    .concat(categoryCampaigns.slice(0, 2))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  renderBanner(allCampaigns[0]);
  renderCards(allCampaigns, 'all');
  setupFilterButtons(allCampaigns);
  setupCampaignClickTracking();

  const campaignBannerDescription = document.getElementById('campaignBannerDescription');
  if (campaignBannerDescription && userContext.cartValue > 0) {
    campaignBannerDescription.textContent += ' Valor estimado de tu carrito actual: ' + formatCop(userContext.cartValue) + '.';
  }
}

function setupNewsletter() {
  const btnSuscribirse = document.getElementById('btnSuscribirse');
  const emailInput = document.getElementById('emailInput');
  const newsletterMsg = document.getElementById('newsletterMsg');

  if (!btnSuscribirse || !emailInput || !newsletterMsg) {
    return;
  }

  async function sendNewsletterOfferEmail(email) {
    const titleNode = document.getElementById('campaignBannerTitle');
    const descriptionNode = document.getElementById('campaignBannerDescription');
    const campaignTitle = String(titleNode?.textContent || 'Oferta de bienvenida AureaLuxe').trim();
    const campaignDescription = String(descriptionNode?.textContent || '').trim();

    const response = await fetch(SUPABASE_PROJECT_URL + '/functions/v1/newsletter-oferta-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: 'Bearer ' + SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify({
        email,
        campaignTitle,
        campaignDescription
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.success === false) {
      throw new Error(String(result?.error || 'No se pudo enviar el correo de oferta.'));
    }

    return result;
  }

  btnSuscribirse.addEventListener('click', async () => {
    const email = emailInput.value.trim();

    if (!email) {
      newsletterMsg.style.color = '#c0392b';
      newsletterMsg.textContent = 'Por favor ingresa tu correo electronico.';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      newsletterMsg.style.color = '#c0392b';
      newsletterMsg.textContent = 'Ingresa un correo electronico valido.';
      return;
    }

    const now = Date.now();
    const lastSentAt = parseInt(localStorage.getItem(NEWSLETTER_LAST_SENT_KEY) || '0', 10) || 0;
    if (now - lastSentAt < 30000) {
      newsletterMsg.style.color = '#8a6449';
      newsletterMsg.textContent = 'Espera unos segundos antes de solicitar otro correo.';
      return;
    }

    const originalText = btnSuscribirse.textContent;
    btnSuscribirse.disabled = true;
    btnSuscribirse.textContent = 'Enviando...';

    try {
      const sendResult = await sendNewsletterOfferEmail(email);

      localStorage.setItem(NEWSLETTER_LAST_SENT_KEY, String(now));
      newsletterMsg.style.color = '#c69b7b';

      if (sendResult?.delivered === false && sendResult?.warning) {
        newsletterMsg.textContent = 'Suscripcion registrada. ' + String(sendResult.warning);
      } else {
        newsletterMsg.textContent = 'Listo. Revisa tu correo, ya te enviamos una oferta especial.';
      }

      emailInput.value = '';
    } catch (_error) {
      newsletterMsg.style.color = '#c0392b';
      newsletterMsg.textContent = 'No fue posible enviar el correo ahora. Intenta nuevamente.';
    } finally {
      btnSuscribirse.disabled = false;
      btnSuscribirse.textContent = originalText;
    }

    setTimeout(() => {
      newsletterMsg.textContent = '';
    }, 4000);
  });

  emailInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      btnSuscribirse.click();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDynamicCampaigns();
  setupNewsletter();
});