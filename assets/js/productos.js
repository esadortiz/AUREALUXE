/* ═══════════════════════════════════════════
   AUREQLUXE — productos.js
   ═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

    var WISHLIST_STORAGE_KEY = 'aurealuxe_wishlist';
    var SUPABASE_URL = 'https://webwxpumtvihppkhakox.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_dLrp6AspzhqaGe58WGBd6Q_kveesjx0';
    var REVIEWS_TABLE = 'product_reviews';
    var VARIANTS_BY_PRODUCT = {
        'macbook-m3': [
            { key: 'color', label: 'Color', options: ['Gris espacial', 'Plata'] },
            { key: 'capacidad', label: 'Capacidad', options: ['256GB', '512GB'] }
        ],
        'galaxy-s24': [
            { key: 'color', label: 'Color', options: ['Negro', 'Dorado', 'Violeta'] },
            { key: 'capacidad', label: 'Capacidad', options: ['256GB', '512GB'] }
        ],
        'iphone-14-pro-max': [
            { key: 'color', label: 'Color', options: ['Negro', 'Azul', 'Plata'] },
            { key: 'capacidad', label: 'Capacidad', options: ['256GB', '512GB'] }
        ],
        'asus-vivobook-15': [
            { key: 'version', label: 'Version', options: ['Core i5 / 8GB', 'Core i7 / 16GB'] }
        ],
        'sony-wh-1000xm5': [
            { key: 'color', label: 'Color', options: ['Negro', 'Plata'] }
        ],
        'xiaomi-15t-pro': [
            { key: 'color', label: 'Color', options: ['Negro', 'Azul'] },
            { key: 'capacidad', label: 'Capacidad', options: ['256GB', '512GB'] }
        ],
        'maus-gamer-rgb': [
            { key: 'version', label: 'Version', options: ['Cableado', 'Inalambrico'] }
        ],
        'airpods-pro-2': [
            { key: 'version', label: 'Version', options: ['USB-C', 'MagSafe'] }
        ],
        'asus-tuf-gaming-f15': [
            { key: 'version', label: 'Version', options: ['RTX 4050', 'RTX 4060'] }
        ],
        'lenovo-ideapad-slim-3': [
            { key: 'version', label: 'Version', options: ['8GB RAM', '16GB RAM'] }
        ],
        'hp-15-fd0100ns': [
            { key: 'version', label: 'Version', options: ['8GB RAM', '16GB RAM'] }
        ],
        'logitech-pro-x-superlight-2-dex': [
            { key: 'color', label: 'Color', options: ['Negro', 'Blanco'] }
        ],
        'smart-tv-lg-55': [
            { key: 'version', label: 'Version', options: ['4K UHD', '4K UHD + Magic Remote'] }
        ],
        'teclado-mecanico-60': [
            { key: 'switch', label: 'Switch', options: ['Red', 'Brown', 'Blue'] }
        ]
    };
    var STOCK_BY_PRODUCT = {
        'macbook-m3': 18,
        'galaxy-s24': 3,
        'iphone-14-pro-max': 2,
        'asus-vivobook-15': 11,
        'sony-wh-1000xm5': 7,
        'xiaomi-15t-pro': 5,
        'maus-gamer-rgb': 24,
        'airpods-pro-2': 0,
        'asus-tuf-gaming-f15': 4,
        'lenovo-ideapad-slim-3': 8,
        'hp-15-fd0100ns': 6,
        'logitech-pro-x-superlight-2-dex': 9,
        'smart-tv-lg-55': 1,
        'teclado-mecanico-60': 15
    };

    function toCop(value) {
        return Math.round(parseFloat(value) || 0);
    }

    function formatCop(value) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(value || 0);
    }

    function trackConversion(eventType, payload) {
        if (typeof window.aureaTrackEvent !== 'function') {
            return;
        }

        try {
            window.aureaTrackEvent(eventType, payload || {});
        } catch (_error) {
            // Ignorar fallos de tracking para no afectar compra.
        }
    }

    /* ── Referencias DOM ── */
    var searchInput    = document.getElementById('searchInput');
    var categoryFilter = document.getElementById('categoryFilter');
    var priceFilter    = document.getElementById('priceFilter');
    var productsGrid   = document.getElementById('productsGrid');
    var resultsCount   = document.getElementById('resultsCount');
    var noResults      = document.getElementById('noResults');
    var noResultsText  = noResults ? noResults.querySelector('p') : null;
    var noResultsDefaultText = noResultsText ? noResultsText.textContent : 'No se encontraron productos con esos filtros.';
    var btnToggleWishlist = document.getElementById('btnToggleWishlist');
    var wishlistCount = document.getElementById('wishlistCount');
    var searchSuggestions = document.getElementById('searchSuggestions');
    var searchSuggestionsList = document.getElementById('searchSuggestionsList');
    var searchCategoryOptions = (categoryFilter ? Array.from(categoryFilter.options) : [])
        .filter(function (option) {
            return String(option.value || '').trim() !== '';
        })
        .map(function (option) {
            return {
                value: String(option.value || '').trim(),
                label: String(option.textContent || option.value || '').trim()
            };
        });
    var cards          = Array.from(document.querySelectorAll('.product-card'));
    var total          = cards.length;
    var wishlistOnly   = false;
    var wishlistSet    = loadWishlist();
    var searchProductsIndex = [];
    var searchAutocompleteEntries = [];
    var activeSuggestionIndex = -1;
    var reviewsClient = null;
    var reviewsSummaryByProduct = {};
    var currentReviewProductId = '';
    var currentReviewProductName = '';
    var selectedReviewRating = 0;

    var reviewsModalBackdrop = null;
    var reviewsModalCloseBtn = null;
    var reviewsModalTitle = null;
    var reviewsModalSummary = null;
    var reviewsList = null;
    var reviewForm = null;
    var reviewComment = null;
    var reviewFormMsg = null;
    var reviewStarsButtons = [];

    // Mostrar todos los precios en pesos colombianos
    cards.forEach(function (card) {
        var priceNode = card.querySelector('.card-price');
        var copPrice = parseFloat(card.getAttribute('data-price'));
        if (priceNode && !Number.isNaN(copPrice)) {
            priceNode.textContent = formatCop(toCop(copPrice));
        }
    });

    try {
        createWishlistButtons();
        updateWishlistCount();
        updateWishlistToggleButton();
    } catch (error) {
        console.warn('[PRODUCTOS] Error inicializando wishlist:', error);
    }

    try {
        initializeReviewsFeature();
    } catch (error) {
        console.warn('[PRODUCTOS] Error inicializando reseñas:', error);
    }

    try {
        createVariantSelectors();
    } catch (error) {
        console.warn('[PRODUCTOS] Error inicializando variantes:', error);
    }

    try {
        renderStockIndicators();
    } catch (error) {
        console.warn('[PRODUCTOS] Error inicializando stock:', error);
    }

    function getProductId(card) {
        var cardId = card.getAttribute('id') || '';
        if (cardId) return cardId;

        var titleNode = card.querySelector('.card-title');
        if (!titleNode) return '';

        return titleNode.textContent.trim().toLowerCase().replace(/\s+/g, '-');
    }

    function normalizeText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function categoryLabelFromValue(value) {
        var normalizedValue = String(value || '').trim().toUpperCase();
        var match = searchCategoryOptions.find(function (option) {
            return String(option.value || '').trim().toUpperCase() === normalizedValue;
        });

        return match ? match.label : String(value || '');
    }

    function getProductBrand(card) {
        var brand = String(card.getAttribute('data-brand') || '').trim();
        return brand || 'AureaLuxe';
    }

    function buildSearchIndex() {
        searchProductsIndex = cards.map(function (card) {
            var productId = getProductId(card);
            var titleNode = card.querySelector('.card-title');
            var descNode = card.querySelector('.card-desc');
            var category = String(card.getAttribute('data-category') || '').trim();
            var categoryLabel = categoryLabelFromValue(category);
            var brand = getProductBrand(card);
            var title = titleNode ? titleNode.textContent.trim() : '';
            var description = descNode ? descNode.textContent.trim() : '';

            return {
                id: productId,
                title: title,
                description: description,
                category: category,
                categoryLabel: categoryLabel,
                brand: brand,
                searchable: normalizeText([
                    title,
                    description,
                    category,
                    categoryLabel,
                    brand
                ].join(' '))
            };
        });
    }

    buildSearchIndex();

    function loadWishlist() {
        try {
            var stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
            var parsed = stored ? JSON.parse(stored) : [];
            if (!Array.isArray(parsed)) {
                return new Set();
            }
            return new Set(parsed.map(function (item) { return String(item); }));
        } catch (_error) {
            return new Set();
        }
    }

    function createVariantSelectors() {
        cards.forEach(function (card) {
            var productId = getProductId(card);
            var config = VARIANTS_BY_PRODUCT[productId] || [];
            var body = card.querySelector('.card-body');
            var footer = card.querySelector('.card-footer');

            if (!body || !footer || config.length === 0 || body.querySelector('.card-variant-row')) {
                return;
            }

            var ratingRow = body.querySelector('.card-rating-row');
            var variantRow = document.createElement('div');
            variantRow.className = 'card-variant-row';

            var inner = config.map(function (variantConfig) {
                var optionsHtml = (variantConfig.options || []).map(function (optionValue) {
                    var safeValue = escapeHtml(optionValue);
                    return '<option value="' + safeValue + '">' + safeValue + '</option>';
                }).join('');

                return [
                    '<label class="variant-group">',
                    '<span>' + escapeHtml(variantConfig.label || 'Version') + '</span>',
                    '<select class="variant-select" data-variant-key="' + escapeHtml(variantConfig.key || 'version') + '">',
                    optionsHtml,
                    '</select>',
                    '</label>'
                ].join('');
            }).join('');

            variantRow.innerHTML = inner;

            if (ratingRow) {
                body.insertBefore(variantRow, ratingRow);
            } else {
                body.insertBefore(variantRow, footer);
            }
        });
    }

    function getSelectedVariantMeta(card) {
        var selects = Array.from(card.querySelectorAll('.variant-select'));
        if (selects.length === 0) {
            return {
                key: '',
                label: '',
                details: {}
            };
        }

        var parts = [];
        var keyParts = [];
        var details = {};

        selects.forEach(function (selectEl) {
            var key = String(selectEl.dataset.variantKey || 'version').trim();
            var value = String(selectEl.value || '').trim();
            if (!value) {
                return;
            }

            details[key] = value;
            parts.push(value);
            keyParts.push(slugify(value));
        });

        return {
            key: keyParts.join('-'),
            label: parts.join(' / '),
            details: details
        };
    }

    function getBaseStock(productId) {
        var stock = STOCK_BY_PRODUCT[productId];
        return Number.isFinite(stock) ? stock : 12;
    }

    function getCartData() {
        try {
            var stored = localStorage.getItem('aurealuxe_cart');
            var parsed = stored ? JSON.parse(stored) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (_error) {
            return [];
        }
    }

    function getCartQuantityByProduct(productId, productName) {
        var cart = getCartData();
        var totalQty = 0;
        var productIdNorm = String(productId || '').trim().toLowerCase();
        var productNameNorm = String(productName || '').trim().toLowerCase();

        cart.forEach(function (item) {
            var itemIdNorm = String(item.id || '').trim().toLowerCase();
            var itemNameNorm = String(item.nombre || '').trim().toLowerCase();
            var itemBaseIdNorm = String(item.base_product_id || '').trim().toLowerCase();
            var sameProduct =
                itemBaseIdNorm === productIdNorm ||
                itemIdNorm === productIdNorm ||
                itemIdNorm.indexOf(productIdNorm + '::') === 0 ||
                itemNameNorm === productNameNorm ||
                itemNameNorm.indexOf(productNameNorm + ' - ') === 0;

            if (sameProduct) {
                totalQty += parseInt(item.cantidad || 1, 10) || 1;
            }
        });

        return totalQty;
    }

    function getRemainingStock(productId, productName) {
        var base = getBaseStock(productId);
        var inCart = getCartQuantityByProduct(productId, productName);
        return Math.max(0, base - inCart);
    }

    function getStockPresentation(remaining) {
        if (remaining <= 0) {
            return { text: 'Agotado', className: 'stock-agotado' };
        }

        if (remaining <= 4) {
            return { text: 'Ultimas ' + remaining + ' unidades', className: 'stock-ultimas' };
        }

        return { text: 'Disponibles: ' + remaining, className: 'stock-disponibles' };
    }

    function renderStockIndicators() {
        cards.forEach(function (card) {
            var body = card.querySelector('.card-body');
            var footer = card.querySelector('.card-footer');
            var addBtn = card.querySelector('.btn-agregar');
            var titleNode = card.querySelector('.card-title');

            if (!body || !footer || !addBtn) {
                return;
            }

            var indicator = body.querySelector('.stock-indicator');
            if (!indicator) {
                indicator = document.createElement('p');
                indicator.className = 'stock-indicator';
                body.insertBefore(indicator, footer);
            }

            var productId = getProductId(card);
            var productName = titleNode ? titleNode.textContent.trim() : '';
            var remaining = getRemainingStock(productId, productName);
            var stockMeta = getStockPresentation(remaining);

            indicator.className = 'stock-indicator ' + stockMeta.className;
            indicator.textContent = stockMeta.text;

            if (remaining <= 0) {
                addBtn.disabled = true;
                addBtn.classList.add('btn-agotado');
                addBtn.textContent = 'AGOTADO';
            } else {
                if (addBtn.classList.contains('btn-agotado')) {
                    addBtn.classList.remove('btn-agotado');
                    addBtn.textContent = 'AGREGAR';
                }
                addBtn.disabled = false;
            }
        });
    }

    function saveWishlist() {
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(Array.from(wishlistSet)));
    }

    function updateWishlistCount() {
        if (!wishlistCount) return;
        var totalFav = wishlistSet.size;
        wishlistCount.textContent = totalFav + (totalFav === 1 ? ' favorito guardado' : ' favoritos guardados');
    }

    function updateWishlistToggleButton() {
        if (!btnToggleWishlist) return;
        btnToggleWishlist.classList.toggle('active', wishlistOnly);
        btnToggleWishlist.textContent = wishlistOnly ? 'Ver todos los productos' : 'Ver solo favoritos';
    }

    function updateWishlistState(card) {
        var productId = getProductId(card);
        var isFavorite = wishlistSet.has(productId);
        var heartBtn = card.querySelector('.wishlist-btn');

        card.classList.toggle('is-favorite', isFavorite);

        if (heartBtn) {
            heartBtn.classList.toggle('active', isFavorite);
            heartBtn.setAttribute('aria-pressed', isFavorite ? 'true' : 'false');
            heartBtn.setAttribute('title', isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos');
            heartBtn.setAttribute('aria-label', isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos');
        }
    }

    function createWishlistButtons() {
        cards.forEach(function (card) {
            var imageWrap = card.querySelector('.card-image');
            if (!imageWrap || imageWrap.querySelector('.wishlist-btn')) {
                return;
            }

            var heartBtn = document.createElement('button');
            heartBtn.type = 'button';
            heartBtn.className = 'wishlist-btn';
            heartBtn.innerHTML = [
                '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
                '<path d="M12 21s-6.7-4.3-9.3-8C.4 9.8 1 6.4 3.8 4.8 6 3.6 8.6 4.2 10.4 6c.6.6 1.1 1.3 1.6 2 .5-.7 1-1.4 1.6-2 1.8-1.8 4.4-2.4 6.6-1.2 2.8 1.6 3.4 5 1.1 8.2C18.7 16.7 12 21 12 21z"/>',
                '</svg>'
            ].join('');

            imageWrap.appendChild(heartBtn);

            heartBtn.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();

                var productId = getProductId(card);
                var productNameNode = card.querySelector('.card-title');
                var productName = productNameNode ? productNameNode.textContent.trim() : 'Producto';

                if (wishlistSet.has(productId)) {
                    wishlistSet.delete(productId);
                    showNotification('♡ ' + productName + ' eliminado de favoritos');
                } else {
                    wishlistSet.add(productId);
                    showNotification('♥ ' + productName + ' guardado en favoritos');
                }

                saveWishlist();
                updateWishlistState(card);
                updateWishlistCount();
                filterProducts();
            });

            updateWishlistState(card);
        });
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function slugify(value) {
        return String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }

    function formatReviewDate(value) {
        if (!value) return '';
        try {
            return new Date(value).toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'short',
                day: '2-digit'
            });
        } catch (_error) {
            return '';
        }
    }

    function renderStarsText(rating) {
        var safeRating = Math.max(0, Math.min(5, Math.round(rating || 0)));
        return '★'.repeat(safeRating) + '☆'.repeat(5 - safeRating);
    }

    function loadSupabaseSdk() {
        return new Promise(function (resolve, reject) {
            if (typeof window.supabase !== 'undefined') {
                resolve();
                return;
            }

            var existing = document.querySelector('script[data-supabase-sdk="true"]');
            if (existing) {
                existing.addEventListener('load', function () { resolve(); }, { once: true });
                existing.addEventListener('error', function () { reject(new Error('No se pudo cargar Supabase SDK')); }, { once: true });
                return;
            }

            var script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
            script.async = true;
            script.dataset.supabaseSdk = 'true';
            script.onload = function () { resolve(); };
            script.onerror = function () { reject(new Error('No se pudo cargar Supabase SDK')); };
            document.head.appendChild(script);
        });
    }

    async function getReviewsClient() {
        if (reviewsClient) {
            return reviewsClient;
        }

        try {
            await loadSupabaseSdk();
            if (typeof window.supabase === 'undefined') {
                return null;
            }
            reviewsClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            return reviewsClient;
        } catch (_error) {
            return null;
        }
    }

    function initializeReviewsFeature() {
        createReviewsModal();
        attachReviewButtonsToCards();
        loadReviewSummaries();
    }

    function attachReviewButtonsToCards() {
        cards.forEach(function (card) {
            var body = card.querySelector('.card-body');
            var footer = card.querySelector('.card-footer');

            if (!body || !footer || body.querySelector('.card-rating-row')) {
                return;
            }

            var row = document.createElement('div');
            row.className = 'card-rating-row';
            row.innerHTML = [
                '<span class="card-rating-stars" data-rating-stars>☆☆☆☆☆</span>',
                '<span class="card-rating-count" data-rating-count>Sin reseñas</span>',
                '<button type="button" class="btn-open-reviews">Reseñar</button>'
            ].join('');

            body.insertBefore(row, footer);

            var openBtn = row.querySelector('.btn-open-reviews');
            openBtn.addEventListener('click', function (event) {
                event.preventDefault();
                openReviewModal(card);
            });
        });

        updateReviewSummaryUI();
    }

    async function loadReviewSummaries() {
        var client = await getReviewsClient();
        if (!client) {
            return;
        }

        try {
            var response = await client
                .from(REVIEWS_TABLE)
                .select('product_id, rating')
                .eq('estado', 'aprobada');

            if (response.error) {
                return;
            }

            var rows = Array.isArray(response.data) ? response.data : [];
            var map = {};

            rows.forEach(function (review) {
                var productId = String(review.product_id || '');
                if (!productId) return;

                if (!map[productId]) {
                    map[productId] = { total: 0, sum: 0 };
                }

                map[productId].total += 1;
                map[productId].sum += parseInt(review.rating || 0, 10) || 0;
            });

            reviewsSummaryByProduct = map;
            updateReviewSummaryUI();
        } catch (_error) {
            // noop
        }
    }

    function updateReviewSummaryUI() {
        cards.forEach(function (card) {
            var productId = getProductId(card);
            var starsEl = card.querySelector('[data-rating-stars]');
            var countEl = card.querySelector('[data-rating-count]');

            if (!starsEl || !countEl) {
                return;
            }

            var summary = reviewsSummaryByProduct[productId];

            if (!summary || summary.total === 0) {
                starsEl.textContent = '☆☆☆☆☆';
                countEl.textContent = 'Sin reseñas';
                return;
            }

            var avg = summary.sum / summary.total;
            starsEl.textContent = renderStarsText(avg);
            countEl.textContent = avg.toFixed(1) + ' (' + summary.total + ')';
        });
    }

    function createReviewsModal() {
        if (document.getElementById('reviewsModalBackdrop')) {
            return;
        }

        var backdrop = document.createElement('div');
        backdrop.id = 'reviewsModalBackdrop';
        backdrop.className = 'reviews-modal-backdrop';
        backdrop.setAttribute('aria-hidden', 'true');

        backdrop.innerHTML = [
            '<div class="reviews-modal" role="dialog" aria-modal="true" aria-labelledby="reviewsModalTitle">',
            '<button type="button" class="reviews-modal-close" id="reviewsModalClose" aria-label="Cerrar">×</button>',
            '<h3 id="reviewsModalTitle">Reseñas del producto</h3>',
            '<div class="reviews-modal-summary" id="reviewsModalSummary"></div>',
            '<div class="reviews-list" id="reviewsList"></div>',
            '<form class="review-form" id="reviewForm">',
            '<p class="review-form-title">Califica este producto</p>',
            '<div class="review-stars-picker" id="reviewStarsPicker">',
            '<button type="button" data-rate="1">★</button>',
            '<button type="button" data-rate="2">★</button>',
            '<button type="button" data-rate="3">★</button>',
            '<button type="button" data-rate="4">★</button>',
            '<button type="button" data-rate="5">★</button>',
            '</div>',
            '<textarea id="reviewComment" rows="3" maxlength="380" placeholder="Comparte tu experiencia (opcional)"></textarea>',
            '<button type="submit" class="btn-submit-review">Publicar reseña</button>',
            '<p class="review-form-msg" id="reviewFormMsg"></p>',
            '</form>',
            '</div>'
        ].join('');

        document.body.appendChild(backdrop);

        reviewsModalBackdrop = backdrop;
        reviewsModalCloseBtn = document.getElementById('reviewsModalClose');
        reviewsModalTitle = document.getElementById('reviewsModalTitle');
        reviewsModalSummary = document.getElementById('reviewsModalSummary');
        reviewsList = document.getElementById('reviewsList');
        reviewForm = document.getElementById('reviewForm');
        reviewComment = document.getElementById('reviewComment');
        reviewFormMsg = document.getElementById('reviewFormMsg');
        reviewStarsButtons = Array.from(document.querySelectorAll('#reviewStarsPicker button'));

        reviewsModalCloseBtn.addEventListener('click', closeReviewModal);

        reviewsModalBackdrop.addEventListener('click', function (event) {
            if (event.target === reviewsModalBackdrop) {
                closeReviewModal();
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && reviewsModalBackdrop.classList.contains('open')) {
                closeReviewModal();
            }
        });

        reviewStarsButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var value = parseInt(btn.getAttribute('data-rate') || '0', 10) || 0;
                selectedReviewRating = value;
                updateReviewStarsPicker();
            });
        });

        reviewForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            await submitReview();
        });

        updateReviewStarsPicker();
    }

    function updateReviewStarsPicker() {
        reviewStarsButtons.forEach(function (btn) {
            var value = parseInt(btn.getAttribute('data-rate') || '0', 10) || 0;
            btn.classList.toggle('active', value <= selectedReviewRating);
        });
    }

    function clearReviewFormMessage() {
        if (!reviewFormMsg) return;
        reviewFormMsg.textContent = '';
        reviewFormMsg.classList.remove('error');
    }

    function setReviewFormMessage(message, isError) {
        if (!reviewFormMsg) return;
        reviewFormMsg.textContent = message;
        reviewFormMsg.classList.toggle('error', !!isError);
    }

    async function openReviewModal(card) {
        if (!reviewsModalBackdrop) {
            return;
        }

        currentReviewProductId = getProductId(card);
        var titleNode = card.querySelector('.card-title');
        currentReviewProductName = titleNode ? titleNode.textContent.trim() : 'Producto';

        reviewsModalTitle.textContent = 'Reseñas de ' + currentReviewProductName;
        reviewsModalBackdrop.classList.add('open');
        reviewsModalBackdrop.setAttribute('aria-hidden', 'false');
        document.body.classList.add('reviews-modal-open');

        clearReviewFormMessage();
        selectedReviewRating = 0;
        updateReviewStarsPicker();
        if (reviewComment) reviewComment.value = '';

        await loadReviewsForCurrentProduct();
    }

    function closeReviewModal() {
        if (!reviewsModalBackdrop) {
            return;
        }

        reviewsModalBackdrop.classList.remove('open');
        reviewsModalBackdrop.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('reviews-modal-open');
    }

    async function loadReviewsForCurrentProduct() {
        if (!currentReviewProductId || !reviewsList || !reviewsModalSummary) {
            return;
        }

        var client = await getReviewsClient();
        if (!client) {
            reviewsModalSummary.textContent = 'No fue posible cargar reseñas.';
            reviewsList.innerHTML = '<p class="reviews-empty">Reseñas no disponibles por el momento.</p>';
            return;
        }

        var response = await client
            .from(REVIEWS_TABLE)
            .select('rating, comment, reviewer_name, is_verified_purchase, created_at')
            .eq('product_id', currentReviewProductId)
            .eq('estado', 'aprobada')
            .order('created_at', { ascending: false })
            .limit(25);

        if (response.error) {
            reviewsModalSummary.textContent = 'No fue posible cargar reseñas.';
            reviewsList.innerHTML = '<p class="reviews-empty">Reseñas no disponibles por el momento.</p>';
            return;
        }

        var rows = Array.isArray(response.data) ? response.data : [];

        if (rows.length === 0) {
            reviewsModalSummary.textContent = 'Aún no hay reseñas. Sé el primero en calificar.';
            reviewsList.innerHTML = '<p class="reviews-empty">Todavia no hay comentarios para este producto.</p>';
            return;
        }

        var totalRating = 0;
        rows.forEach(function (row) {
            totalRating += parseInt(row.rating || 0, 10) || 0;
        });
        var average = totalRating / rows.length;

        reviewsModalSummary.textContent = renderStarsText(average) + ' ' + average.toFixed(1) + ' de 5 (' + rows.length + ' reseñas)';

        var reviewsHtml = rows.map(function (review) {
            var name = escapeHtml(review.reviewer_name || 'Cliente');
            var comment = escapeHtml(review.comment || 'Sin comentario.');
            var stars = renderStarsText(review.rating || 0);
            var dateLabel = formatReviewDate(review.created_at);
            var verified = review.is_verified_purchase
                ? '<span class="review-verified">Compra verificada</span>'
                : '';

            return [
                '<article class="review-item">',
                '<div class="review-item-top">',
                '<strong>' + name + '</strong>',
                '<span class="review-item-stars">' + stars + '</span>',
                '</div>',
                '<div class="review-item-meta">',
                '<span>' + dateLabel + '</span>',
                verified,
                '</div>',
                '<p>' + comment + '</p>',
                '</article>'
            ].join('');
        }).join('');

        reviewsList.innerHTML = reviewsHtml;
    }

    async function submitReview() {
        if (!currentReviewProductId) {
            return;
        }

        if (selectedReviewRating < 1 || selectedReviewRating > 5) {
            setReviewFormMessage('Selecciona una calificación de 1 a 5 estrellas.', true);
            return;
        }

        var client = await getReviewsClient();
        if (!client) {
            setReviewFormMessage('No fue posible conectar con el servidor de reseñas.', true);
            return;
        }

        var sessionResponse = await client.auth.getSession();
        var user = sessionResponse && sessionResponse.data && sessionResponse.data.session
            ? sessionResponse.data.session.user
            : null;

        if (!user || !user.email) {
            setReviewFormMessage('Debes iniciar sesión para publicar una reseña.', true);
            setTimeout(function () {
                window.location.href = 'login.html?next=productos.html';
            }, 900);
            return;
        }

        var reviewerName = '';
        if (user.user_metadata && typeof user.user_metadata.nombre === 'string') {
            reviewerName = user.user_metadata.nombre.trim();
        }
        if (!reviewerName && user.user_metadata && typeof user.user_metadata.full_name === 'string') {
            reviewerName = user.user_metadata.full_name.trim();
        }
        if (!reviewerName) {
            reviewerName = String(user.email).split('@')[0];
        }

        var verifiedPurchase = await checkVerifiedPurchase(client, user.email, currentReviewProductName);

        var payload = {
            product_id: currentReviewProductId,
            product_nombre: currentReviewProductName,
            rating: selectedReviewRating,
            comment: reviewComment && reviewComment.value.trim() ? reviewComment.value.trim() : null,
            reviewer_name: reviewerName,
            reviewer_email: user.email,
            is_verified_purchase: verifiedPurchase,
            estado: 'aprobada'
        };

        var upsertResponse = await client
            .from(REVIEWS_TABLE)
            .upsert(payload, { onConflict: 'product_id,reviewer_email' });

        if (upsertResponse.error) {
            setReviewFormMessage('No se pudo guardar la reseña. Intenta nuevamente.', true);
            return;
        }

        setReviewFormMessage('Tu reseña fue publicada correctamente.', false);
        if (reviewComment) reviewComment.value = '';
        selectedReviewRating = 0;
        updateReviewStarsPicker();

        await loadReviewSummaries();
        await loadReviewsForCurrentProduct();
        showNotification('✓ Gracias por calificar ' + currentReviewProductName);
    }

    async function checkVerifiedPurchase(client, userEmail, productName) {
        if (!userEmail || !productName) {
            return false;
        }

        try {
            var pedidosResponse = await client
                .from('pedidos')
                .select('id')
                .eq('cliente_email', userEmail)
                .neq('estado', 'cancelado')
                .limit(50);

            if (pedidosResponse.error) {
                return false;
            }

            var pedidos = Array.isArray(pedidosResponse.data) ? pedidosResponse.data : [];
            var pedidoIds = pedidos.map(function (pedido) { return pedido.id; }).filter(Boolean);
            if (pedidoIds.length === 0) {
                return false;
            }

            var itemsResponse = await client
                .from('pedido_items')
                .select('id')
                .in('pedido_id', pedidoIds)
                .eq('nombre', productName)
                .limit(1);

            if (itemsResponse.error) {
                return false;
            }

            return Array.isArray(itemsResponse.data) && itemsResponse.data.length > 0;
        } catch (_error) {
            return false;
        }
    }

    /* ── Destacar producto cuando llega desde index por hash ── */
    var targetId = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : '';
    if (targetId) {
        var targetCard = document.getElementById(targetId);
        if (targetCard) {
            setTimeout(function () {
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                targetCard.classList.add('product-card-target');
                setTimeout(function () {
                    targetCard.classList.remove('product-card-target');
                }, 2200);
            }, 120);
        }
    }

    /* ── Prevenir recarga en links vacíos ── */
    document.querySelectorAll('a[href="#"]').forEach(function (link) {
        link.addEventListener('click', function (e) { e.preventDefault(); });
    });

    /* ══════════════════════════════
       FILTRADO
    ══════════════════════════════ */
    function filterProducts() {
        var query    = normalizeText(searchInput.value);
        var category = categoryFilter.value;
        var price    = priceFilter.value;
        var visible  = 0;

        cards.forEach(function (card) {
            var cardCategory = card.getAttribute('data-category');
            var cardPriceCop = toCop(card.getAttribute('data-price'));
            var cardTitle    = card.querySelector('.card-title').textContent;
            var cardDesc     = card.querySelector('.card-desc').textContent;
            var cardBrand    = getProductBrand(card);
            var cardCategoryLabel = categoryLabelFromValue(cardCategory);
            var cardSearchable = normalizeText([
                cardTitle,
                cardDesc,
                cardCategory,
                cardCategoryLabel,
                cardBrand
            ].join(' '));
            var productId    = getProductId(card);

            /* Búsqueda por texto */
            var matchesSearch = !query ||
                cardSearchable.includes(query);

            /* Filtro de categoría */
            var matchesCategory = !category || cardCategory === category;

            /* Filtro de precio */
            var matchesPrice = true;
            if (price === 'low')             matchesPrice = cardPriceCop <= 1000000;
            else if (price === 'high')       matchesPrice = cardPriceCop >= 5000000;
            else if (price === 'under2m')    matchesPrice = cardPriceCop < 2000000;
            else if (price === 'over2m')     matchesPrice = cardPriceCop >= 2000000;

            var matchesWishlist = !wishlistOnly || wishlistSet.has(productId);

            var show = matchesSearch && matchesCategory && matchesPrice && matchesWishlist;

            card.style.display = show ? '' : 'none';

            /* Animación de entrada */
            if (show) {
                visible++;
                card.style.opacity   = '0';
                card.style.transform = 'translateY(12px)';
                (function (el, delay) {
                    setTimeout(function () {
                        el.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
                        el.style.opacity    = '1';
                        el.style.transform  = 'translateY(0)';
                    }, delay);
                })(card, (visible - 1) * 50);
            }
        });

        /* Actualizar contador */
        resultsCount.textContent = 'Mostrando ' + visible + ' de ' + total + ' productos';

        if (noResultsText) {
            noResultsText.textContent = (wishlistOnly && visible === 0)
                ? 'No tienes favoritos que coincidan con los filtros actuales.'
                : noResultsDefaultText;
        }

        /* Mostrar/ocultar empty state */
        noResults.style.display  = visible === 0 ? 'block' : 'none';
        productsGrid.style.display = visible === 0 ? 'none' : '';
    }

    function getSuggestionTag(type) {
        if (type === 'categoria') return 'Categoria';
        if (type === 'marca') return 'Marca';
        return 'Producto';
    }

    function getSuggestionMeta(item) {
        if (!item || !item.meta) {
            return '';
        }

        if (item.type === 'producto') {
            return item.meta.brand + ' - ' + item.meta.categoryLabel;
        }

        if (item.type === 'categoria') {
            return 'Filtrar por categoria';
        }

        if (item.type === 'marca') {
            return 'Buscar por marca';
        }

        return '';
    }

    function scoreMatch(text, query) {
        var normalizedText = normalizeText(text);
        if (!normalizedText || !query) return 0;
        if (normalizedText === query) return 140;
        if (normalizedText.indexOf(query) === 0) return 105;
        if (normalizedText.indexOf(' ' + query) >= 0) return 92;
        if (normalizedText.includes(query)) return 80;
        return 0;
    }

    function buildSearchSuggestions() {
        var query = normalizeText(searchInput.value);
        var mapByKey = {};

        function addSuggestion(item) {
            var itemKey = item.type + '|' + normalizeText(item.value);
            var current = mapByKey[itemKey];
            if (!current || item.score > current.score) {
                mapByKey[itemKey] = item;
            }
        }

        if (!query) {
            searchProductsIndex.slice(0, 4).forEach(function (product) {
                addSuggestion({
                    type: 'producto',
                    label: product.title,
                    value: product.title,
                    meta: product,
                    score: 60
                });
            });

            searchCategoryOptions.slice(0, 3).forEach(function (categoryOption) {
                addSuggestion({
                    type: 'categoria',
                    label: categoryOption.label,
                    value: categoryOption.label,
                    meta: { value: categoryOption.value },
                    score: 50
                });
            });
        } else {
            searchProductsIndex.forEach(function (product) {
                var score = scoreMatch(product.title, query);
                if (!score && product.searchable.includes(query)) {
                    score = 74;
                }

                if (score > 0) {
                    addSuggestion({
                        type: 'producto',
                        label: product.title,
                        value: product.title,
                        meta: product,
                        score: score
                    });
                }
            });

            searchCategoryOptions.forEach(function (categoryOption) {
                var categoryScore = Math.max(
                    scoreMatch(categoryOption.label, query),
                    scoreMatch(categoryOption.value, query)
                );

                if (categoryScore > 0) {
                    addSuggestion({
                        type: 'categoria',
                        label: categoryOption.label,
                        value: categoryOption.label,
                        meta: { value: categoryOption.value },
                        score: categoryScore
                    });
                }
            });

            var brands = Array.from(new Set(searchProductsIndex.map(function (product) {
                return product.brand;
            }).filter(Boolean)));

            brands.forEach(function (brand) {
                var brandScore = scoreMatch(brand, query);
                if (brandScore > 0) {
                    addSuggestion({
                        type: 'marca',
                        label: brand,
                        value: brand,
                        meta: {},
                        score: brandScore
                    });
                }
            });
        }

        return Object.keys(mapByKey)
            .map(function (key) { return mapByKey[key]; })
            .sort(function (a, b) {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                return a.label.localeCompare(b.label, 'es');
            })
            .slice(0, 8);
    }

    function hideSearchSuggestions() {
        if (searchSuggestions) {
            searchSuggestions.classList.remove('open');
        }
        if (searchInput) {
            searchInput.setAttribute('aria-expanded', 'false');
        }
        activeSuggestionIndex = -1;
    }

    function setActiveSuggestion(index) {
        var buttons = searchSuggestionsList
            ? Array.from(searchSuggestionsList.querySelectorAll('.search-suggestion'))
            : [];

        buttons.forEach(function (buttonEl, buttonIndex) {
            var isActive = buttonIndex === index;
            buttonEl.classList.toggle('is-active', isActive);
            buttonEl.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        activeSuggestionIndex = index;
    }

    function renderSearchSuggestions(items) {
        if (!searchSuggestions || !searchSuggestionsList) {
            return;
        }

        searchAutocompleteEntries = Array.isArray(items) ? items : [];

        if (searchAutocompleteEntries.length === 0) {
            searchSuggestionsList.innerHTML = '';
            hideSearchSuggestions();
            return;
        }

        searchSuggestionsList.innerHTML = searchAutocompleteEntries.map(function (item, index) {
            var metaText = getSuggestionMeta(item);
            return [
                '<li>',
                '<button type="button" class="search-suggestion" data-suggestion-index="' + index + '" role="option" aria-selected="false">',
                '<span>',
                '<span class="search-suggestion-main">' + escapeHtml(item.label) + '</span>',
                metaText ? '<span class="search-suggestion-meta">' + escapeHtml(metaText) + '</span>' : '',
                '</span>',
                '<span class="search-suggestion-tag">' + escapeHtml(getSuggestionTag(item.type)) + '</span>',
                '</button>',
                '</li>'
            ].join('');
        }).join('');

        searchSuggestions.classList.add('open');
        searchInput.setAttribute('aria-expanded', 'true');
        setActiveSuggestion(-1);
    }

    function applySearchSuggestion(item) {
        if (!item) {
            return;
        }

        searchInput.value = item.value;

        if (item.type === 'categoria' && item.meta && item.meta.value) {
            categoryFilter.value = item.meta.value;
        }

        hideSearchSuggestions();
        filterProducts();

        if (item.type === 'producto' && item.meta && item.meta.id) {
            var targetCard = document.getElementById(item.meta.id);
            if (targetCard) {
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }

    function refreshSearchSuggestions() {
        renderSearchSuggestions(buildSearchSuggestions());
    }

    function setupSearchAutocomplete() {
        if (!searchInput || !searchSuggestionsList) {
            return;
        }

        searchInput.addEventListener('focus', function () {
            refreshSearchSuggestions();
        });

        searchInput.addEventListener('input', function () {
            refreshSearchSuggestions();
            filterProducts();
        });

        searchInput.addEventListener('keydown', function (event) {
            var totalSuggestions = searchAutocompleteEntries.length;

            if (event.key === 'Escape') {
                hideSearchSuggestions();
                return;
            }

            if (!totalSuggestions) {
                return;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveSuggestion((activeSuggestionIndex + 1) % totalSuggestions);
                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveSuggestion(activeSuggestionIndex <= 0 ? totalSuggestions - 1 : activeSuggestionIndex - 1);
                return;
            }

            if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
                event.preventDefault();
                applySearchSuggestion(searchAutocompleteEntries[activeSuggestionIndex]);
            }
        });

        searchSuggestionsList.addEventListener('mousedown', function (event) {
            event.preventDefault();
            var target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            var button = target.closest('.search-suggestion');
            if (!button) {
                return;
            }

            var suggestionIndex = parseInt(button.getAttribute('data-suggestion-index') || '-1', 10);
            if (suggestionIndex >= 0 && suggestionIndex < searchAutocompleteEntries.length) {
                applySearchSuggestion(searchAutocompleteEntries[suggestionIndex]);
            }
        });

        document.addEventListener('click', function (event) {
            var target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            var searchWrap = searchInput.closest('.search-wrap');
            if (searchWrap && !searchWrap.contains(target)) {
                hideSearchSuggestions();
            }
        });
    }

    /* ── Event listeners ── */
    setupSearchAutocomplete();
    categoryFilter.addEventListener('change', filterProducts);
    priceFilter.addEventListener('change', filterProducts);

    if (btnToggleWishlist) {
        btnToggleWishlist.addEventListener('click', function () {
            wishlistOnly = !wishlistOnly;
            updateWishlistToggleButton();
            filterProducts();
        });
    }

    function applyInitialCampaignFilters() {
        try {
            var params = new URLSearchParams(window.location.search || '');
            var initialCategory = String(params.get('categoria') || '').trim().toUpperCase();
            var initialWishlist = String(params.get('favoritos') || '').trim();

            if (initialCategory && categoryFilter) {
                var categoryExists = Array.from(categoryFilter.options).some(function (option) {
                    return String(option.value || '').trim().toUpperCase() === initialCategory;
                });

                if (categoryExists) {
                    categoryFilter.value = initialCategory;
                }
            }

            if (initialWishlist === '1' && btnToggleWishlist && !wishlistOnly) {
                wishlistOnly = true;
                updateWishlistToggleButton();
            }
        } catch (_error) {
            // Ignorar errores de parseo de URL para no afectar el catalogo.
        }

        filterProducts();
    }

    applyInitialCampaignFilters();

    /* ══════════════════════════════
       FUNCIÓN PARA MOSTRAR NOTIFICACIONES
    ══════════════════════════════ */
    function showNotification(message) {
        var notification = document.createElement('div');
        notification.className = 'toast-notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animar entrada
        setTimeout(function () {
            notification.style.opacity = '1';
        }, 10);
        
        // Remover después de 3 segundos
        setTimeout(function () {
            notification.classList.add('removing');
            setTimeout(function () {
                notification.remove();
            }, 400);
        }, 3000);
    }

    /* ══════════════════════════════
       BOTÓN AGREGAR — agregar al carrito
    ══════════════════════════════ */
    cards.forEach(function (card) {
        var btn = card.querySelector('.btn-agregar');
        btn.addEventListener('click', function (e) {
            e.preventDefault();

            try {
                // Obtener datos del producto
                var productId = getProductId(card);
                var productName = card.querySelector('.card-title').textContent.trim();
                var productCategory = card.getAttribute('data-category');
                var productPriceCop = toCop(card.getAttribute('data-price'));
                var imageEl = card.querySelector('.card-image img');
                var productImage = imageEl ? imageEl.src : '';
                var variantMeta = getSelectedVariantMeta(card);
                var variantSuffix = variantMeta.label ? ' - ' + variantMeta.label : '';
                var baseProductId = productId || productName;
                var cartProductId = baseProductId;

                if (variantMeta.key) {
                    cartProductId += '::' + variantMeta.key;
                }

                var remainingBeforeAdd = getRemainingStock(baseProductId, productName);
                if (remainingBeforeAdd <= 0) {
                    showNotification(productName + ' esta agotado por ahora.');
                    renderStockIndicators();
                    return;
                }

                // Agregar al carrito
                var addResult = addToCart({
                    id: cartProductId,
                    base_product_id: baseProductId,
                    nombre: productName + variantSuffix,
                    nombre_base: productName,
                    categoria: productCategory,
                    precio: productPriceCop,
                    cantidad: 1,
                    imagen: productImage,
                    variante: variantMeta.details,
                    variante_label: variantMeta.label
                });

                if (!addResult.ok) {
                    showNotification(addResult.message || 'No fue posible agregar este producto al carrito.');
                    renderStockIndicators();
                    return;
                }

                trackConversion('add_to_cart', {
                    productId: baseProductId,
                    productName: productName,
                    category: productCategory,
                    brand: getProductBrand(card),
                    quantity: 1,
                    value: productPriceCop,
                    metadata: {
                        variant: variantMeta.label || null,
                        remaining_stock: addResult.remaining
                    }
                });

                // Mostrar notificación
                var successMsg = '✓ ' + productName + ' agregado al carrito';
                if (addResult.remaining > 0 && addResult.remaining <= 4) {
                    successMsg += ' - Ultimas ' + addResult.remaining + ' unidades';
                }
                showNotification(successMsg);

                // Feedback visual en el botón
                var original = btn.textContent;
                btn.textContent  = '✓ AGREGADO';
                btn.style.background = '#4a8a5e';
                btn.style.color = 'white';
                setTimeout(function () {
                    btn.textContent  = original;
                    btn.style.background = '';
                    btn.style.color = '';
                }, 1500);

                renderStockIndicators();
            } catch (error) {
                console.error('[PRODUCTOS] Error en click Agregar:', error);
                showNotification('No fue posible agregar el producto. Recarga la pagina e intenta de nuevo.');
            }
        });
    });

    /* ══════════════════════════════
       CARRITO — funciones de gestión
    ══════════════════════════════ */
    function addToCart(product) {
        try {
            var cart = [];
            try {
                var stored = localStorage.getItem('aurealuxe_cart');
                cart = stored ? JSON.parse(stored) : [];
                if (!Array.isArray(cart)) {
                    cart = [];
                }
            } catch (e) {
                cart = [];
            }

            var baseProductId = String(product.base_product_id || product.id || '').split('::')[0];
            var baseProductName = String(product.nombre_base || product.nombre || '').split(' - ')[0].trim();

            var baseStock = getBaseStock(baseProductId);
            var currentQtyInCart = getCartQuantityByProduct(baseProductId, baseProductName);

            if (baseStock <= 0) {
                return {
                    ok: false,
                    message: 'Producto agotado.'
                };
            }

            if (currentQtyInCart >= baseStock) {
                return {
                    ok: false,
                    message: 'Ya tienes el maximo disponible de ' + product.nombre + '.'
                };
            }

            console.log('[PRODUCTOS] addToCart ejecutado con:', product);
            console.log('[PRODUCTOS] Carrito actual tiene:', cart.length, 'items');

            // Buscar si el producto ya existe
            var existingItem = null;
            var existingIndex = -1;
            for (var i = 0; i < cart.length; i++) {
                if (cart[i].id === product.id) {
                    existingItem = cart[i];
                    existingIndex = i;
                    break;
                }
            }

            var safeCantidad = Math.max(1, parseInt(product.cantidad || 1, 10) || 1);
            var qtyToAdd = Math.min(safeCantidad, baseStock - currentQtyInCart);

            if (qtyToAdd <= 0) {
            console.log('[PRODUCTOS] addToCart ejecutado con:', product);
            console.log('[PRODUCTOS] Carrito actual tiene:', cart.length, 'items');

                return {
                    ok: false,
                    message: 'No hay mas unidades disponibles en este momento.'
                };
            }

            if (existingItem) {
                // Incrementar cantidad
                var existingQty = Math.max(1, parseInt(cart[existingIndex].cantidad || 1, 10) || 1);
                cart[existingIndex].cantidad = existingQty + qtyToAdd;

                if (!cart[existingIndex].base_product_id) {
                    cart[existingIndex].base_product_id = baseProductId;
                }
                    cart[existingIndex].nombre_base = baseProductName;
                }
                console.log('[PRODUCTOS] Producto existente. Nueva cantidad:', cart[existingIndex].cantidad);
            } else {
                // Agregar producto nuevo
                cart.push({
                    id: product.id,
                    base_product_id: baseProductId,
                    nombre: product.nombre,
                    nombre_base: baseProductName,
                    categoria: product.categoria,
                    precio: product.precio,
                    cantidad: qtyToAdd,
                    imagen: product.imagen,
                    variante: product.variante || {},
                    variante_label: product.variante_label || ''
                });
                console.log('[PRODUCTOS] Producto nuevo agregado');
            
            // Guardar en localStorage
            localStorage.setItem('aurealuxe_cart', JSON.stringify(cart));
            console.log('[PRODUCTOS] ✓ Guardado en localStorage:', JSON.stringify(cart));


            // Actualizar badge del carrito
            updateCartBadge(
                ok: true,
                added: qtyToAdd,
                remaining: Math.max(0, baseStock - (currentQtyInCart + qtyToAdd))
            };
        } catch (error) {
            console.error('[PRODUCTOS] Error inesperado en addToCart:', error);
            return {
                ok: false,
                message: 'Error interno al agregar al carrito.'
            };
        }
    }

    function updateCartBadge() {
        // Usar la función global de sincronización si está disponible
        if (typeof updateCartBadgeGlobal === 'function') {
            updateCartBadgeGlobal();
        } else {
            // Fallback: actualizar localmente si no está disponible
            var cart = [];
            try {
                var stored = localStorage.getItem('aurealuxe_cart');
                cart = stored ? JSON.parse(stored) : [];
            } catch (e) {
                cart = [];
            }

            var totalItems = 0;
            cart.forEach(function (item) {
                totalItems += item.cantidad;
            });

            var badges = document.querySelectorAll('.cart-badge');
            var badgeText = totalItems > 99 ? '99+' : String(totalItems);
            badges.forEach(function (badge) {
                badge.textContent = badgeText;
                // Mostrar/ocultar badge basado en cantidad
                if (totalItems === 0) {
                    badge.classList.add('hidden');
                } else {
                    badge.classList.remove('hidden');
                }
            });
        }
    }

    // Inicializar badge en carga
    updateCartBadge();

    /* ══════════════════════════════
       ANIMACIÓN INICIAL de cards
    ══════════════════════════════ */
    if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.style.opacity   = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });

        cards.forEach(function (card, i) {
            card.style.opacity    = '0';
            card.style.transform  = 'translateY(20px)';
            card.style.transition = 'opacity 0.45s ease ' + (i * 60) + 'ms, transform 0.45s ease ' + (i * 60) + 'ms';
            observer.observe(card);
        });
    }

});