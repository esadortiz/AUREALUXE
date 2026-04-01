const SUPABASE_URL = 'https://webwxpumtvihppkhakox.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dLrp6AspzhqaGe58WGBd6Q_kveesjx0';
const CART_STORAGE_KEY = 'aurealuxe_cart';

const PRODUCT_IMAGE_BY_NAME = {
  'macbook m3': 'assets/img/Productos/MacBook%20M3.jpg',
  'samsung galaxy s24': 'assets/img/Productos/Galaxy%20S24.avif',
  'iphone 14 pro max': 'assets/img/Productos/IPhone%2014%20pro%20max.jpg',
  'asus vivobook 15': 'assets/img/Productos/Asus%20vivobook%2015.webp',
  'sony wh-1000xm5': 'assets/img/Productos/SONY%20WH.1000XM5.webp',
  'xiaomi 15t pro': 'assets/img/Productos/xiaomi%2015t%20Pro.webp',
  'mouse gamer rgb': 'assets/img/Productos/Maus%20Gamer.webp',
  'airpods pro 2': 'assets/img/Productos/AiPods%20Pro.webp',
  'asus tuf gaming f15': 'assets/img/Productos/Asus%20TUF%20Gaming%20F15.webp',
  'lenovo ideapad slim 3 15': 'assets/img/Productos/Lenovo%20Ideapad%20Slim%203%2015.webp',
  'portatil hp 15-fd0100ns': 'assets/img/Productos/Portatil%20HP%2015-FD0100NS.jpg',
  'logitech pro x superlight 2 dex': 'assets/img/Productos/PRO%20X%20SUPERLIGHT%202%20DEX%20MAUS%20LOGITECH.webp',
  'smart tv lg 55 pulgadas': 'assets/img/Productos/SMART%20TV%20%20LG%2055%20PULGADAS.jpg',
  'teclado mecanico 60%': 'assets/img/Productos/Teclado%20mecanico%2060.jpg'
};

let supabaseClient = null;
let currentUserEmail = '';
let itemsByPedidoCache = {};
let pedidosByIdCache = {};

const PROGRESS_STEPS = [
  { key: 'pendiente', label: 'Confirmado' },
  { key: 'procesado', label: 'Preparando' },
  { key: 'enviado', label: 'En camino' },
  { key: 'entregado', label: 'Entregado' }
];

const emptyEl = document.getElementById('estadoEmpty');
const listEl = document.getElementById('estadoList');
const errorEl = document.getElementById('estadoError');
const btnRefresh = document.getElementById('btnRefreshEstado');
const cancelModalBackdrop = document.getElementById('cancelModalBackdrop');
const cancelModalClose = document.getElementById('cancelModalClose');
const cancelModalBack = document.getElementById('cancelModalBack');
const cancelModalConfirm = document.getElementById('cancelModalConfirm');
const cancelModalText = document.getElementById('cancelModalText');

let cancelModalResolver = null;

function formatCop(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(value || 0);
}

function formatDate(value) {
  return new Date(value).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function pedidoShortId(id) {
  return (id || '').split('-')[0]?.toUpperCase() || 'N/A';
}

function normalizeEstado(value) {
  return String(value || 'pendiente').trim().toLowerCase();
}

function estadoLabel(value) {
  const estado = normalizeEstado(value);

  if (estado === 'pendiente') return 'Pendiente';
  if (estado === 'procesado') return 'Procesado';
  if (estado === 'enviado') return 'Enviado';
  if (estado === 'entregado') return 'Entregado';
  if (estado === 'cancelado') return 'Cancelado';
  return 'Pendiente';
}

function estadoStepIndex(value) {
  const estado = normalizeEstado(value);

  if (estado === 'pendiente') return 0;
  if (estado === 'procesado') return 1;
  if (estado === 'enviado') return 2;
  if (estado === 'entregado') return 3;
  return 0;
}

function canCancelPedido(estadoRaw) {
  const estado = normalizeEstado(estadoRaw);
  return estado === 'pendiente' || estado === 'procesado';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderProgress(estadoRaw) {
  const estado = normalizeEstado(estadoRaw);

  if (estado === 'cancelado') {
    return [
      '<div class="estado-progress cancelado">',
      '<div class="estado-progress-cancelled">Pedido cancelado</div>',
      '</div>'
    ].join('');
  }

  const current = estadoStepIndex(estado);

  const steps = PROGRESS_STEPS.map((step, index) => {
    const className = index < current
      ? 'done'
      : index === current
        ? 'current'
        : 'todo';

    return [
      '<li class="progress-step ' + className + '">',
      '<span class="progress-dot"></span>',
      '<span class="progress-label">' + step.label + '</span>',
      '</li>'
    ].join('');
  }).join('');

  return [
    '<div class="estado-progress">',
    '<p class="estado-progress-title">Progreso del pedido</p>',
    '<ol class="progress-track">',
    steps,
    '</ol>',
    '</div>'
  ].join('');
}

function buildDireccionText(pedido) {
  const direccion = String(pedido?.cliente_direccion || '').trim();
  const ciudad = String(pedido?.cliente_ciudad || '').trim();
  const referencia = String(pedido?.cliente_referencia || '').trim();

  const parts = [direccion, ciudad, referencia].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' - ');
  }

  return 'Direccion no registrada';
}

function parseMoney(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildPedidosByIdMap(pedidos) {
  const map = {};
  (pedidos || []).forEach((pedido) => {
    if (pedido && pedido.id) {
      map[pedido.id] = pedido;
    }
  });
  return map;
}

function renderDatosPedido(pedido) {
  const clienteNombre = escapeHtml(pedido?.cliente_nombre || 'No disponible');
  const clienteEmail = escapeHtml(pedido?.cliente_email || 'No disponible');
  const clienteTelefono = escapeHtml(pedido?.cliente_telefono || 'No disponible');
  const direccion = escapeHtml(buildDireccionText(pedido));

  return [
    '<div class="estado-datos">',
    '<div class="dato-item"><span>Cliente</span><strong>' + clienteNombre + '</strong></div>',
    '<div class="dato-item"><span>Email</span><strong>' + clienteEmail + '</strong></div>',
    '<div class="dato-item"><span>Telefono</span><strong>' + clienteTelefono + '</strong></div>',
    '<div class="dato-item dato-item-wide"><span>Direccion de envio</span><strong>' + direccion + '</strong></div>',
    '</div>'
  ].join('');
}

function renderProductosPedido(items) {
  if (!items || items.length === 0) {
    return '<p class="estado-productos-empty">Productos no disponibles para este pedido.</p>';
  }

  const rows = items.map((item) => {
    const nombre = escapeHtml(item.nombre);
    const categoria = escapeHtml(item.categoria || 'General');
    const cantidad = parseInt(item.cantidad || 1, 10) || 1;
    const subtotal = formatCop(parseFloat(item.subtotal || 0));

    return [
      '<li class="estado-producto-row">',
      '<div class="producto-main">',
      '<strong>' + nombre + '</strong>',
      '<small>' + categoria + '</small>',
      '</div>',
      '<span class="producto-cantidad">x' + cantidad + '</span>',
      '<span class="producto-subtotal">' + subtotal + '</span>',
      '</li>'
    ].join('');
  }).join('');

  return [
    '<div class="estado-productos">',
    '<p class="estado-productos-title">Productos comprados</p>',
    '<div class="estado-productos-head">',
    '<span>Producto</span>',
    '<span>Cant.</span>',
    '<span>Subtotal</span>',
    '</div>',
    '<ul class="estado-productos-list">',
    rows,
    '</ul>',
    '</div>'
  ].join('');
}

function renderPedidos(rows, itemsByPedido) {
  listEl.innerHTML = '';

  if (!rows || rows.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';

  rows.forEach((pedido) => {
    const estado = normalizeEstado(pedido.estado);
    const items = itemsByPedido[pedido.id] || [];
    const invoiceButton = '<button type="button" class="estado-btn-invoice" data-pedido-id="' + escapeHtml(pedido.id) + '">Descargar comprobante</button>';
    const reorderButton = items.length > 0
      ? '<button type="button" class="estado-btn-reorder" data-pedido-id="' + escapeHtml(pedido.id) + '">Reordenar compra</button>'
      : '';
    const cancelButton = canCancelPedido(estado)
      ? '<button type="button" class="estado-btn-cancel" data-pedido-id="' + escapeHtml(pedido.id) + '">Cancelar pedido</button>'
      : '';

    const html = [
      '<article class="estado-card">',
      '<div class="estado-top">',
      '<span class="pedido-id">Pedido ' + pedidoShortId(pedido.id) + '</span>',
      '<div class="estado-actions">',
      invoiceButton,
      reorderButton,
      cancelButton,
      '<span class="estado-pill ' + estado + '">' + estadoLabel(estado) + '</span>',
      '</div>',
      '</div>',
      '<div class="estado-meta">',
      '<span>Fecha: ' + formatDate(pedido.created_at || pedido.fecha) + '</span>',
      '<span>Total: ' + formatCop(parseFloat(pedido.total || 0)) + '</span>',
      '</div>',
      renderProgress(estado),
      renderDatosPedido(pedido),
      renderProductosPedido(items),
      '</article>'
    ].join('');

    listEl.insertAdjacentHTML('beforeend', html);
  });
}

async function loadEstadoEnvios() {
  errorEl.textContent = '';

  try {
    if (typeof supabase === 'undefined') {
      throw new Error('SDK de Supabase no cargado.');
    }

    if (!supabaseClient) {
      supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    const { data: sessionData } = await supabaseClient.auth.getSession();
    const session = sessionData ? sessionData.session : null;

    if (!session || !session.user || !session.user.email) {
      window.location.href = 'login.html';
      return;
    }

    const userEmail = session.user.email;
    currentUserEmail = userEmail;

    const { data, error } = await supabaseClient
      .from('pedidos')
      .select('id, created_at, fecha, subtotal, envio, descuento, total, estado, cliente_nombre, cliente_email, cliente_telefono, cliente_direccion, cliente_ciudad, cliente_referencia')
      .eq('cliente_email', userEmail)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const pedidos = data || [];
    const pedidoIds = pedidos.map((pedido) => pedido.id).filter(Boolean);
    const itemsByPedido = {};

    if (pedidoIds.length > 0) {
      const { data: itemsData, error: itemsError } = await supabaseClient
        .from('pedido_items')
        .select('pedido_id, nombre, cantidad, subtotal, categoria, precio')
        .in('pedido_id', pedidoIds);

      if (!itemsError && Array.isArray(itemsData)) {
        itemsData.forEach((item) => {
          const pedidoId = item.pedido_id;
          if (!itemsByPedido[pedidoId]) {
            itemsByPedido[pedidoId] = [];
          }
          itemsByPedido[pedidoId].push(item);
        });
      }
    }

    itemsByPedidoCache = itemsByPedido;
    pedidosByIdCache = buildPedidosByIdMap(pedidos);
    renderPedidos(pedidos, itemsByPedido);
  } catch (error) {
    errorEl.textContent = 'No fue posible consultar el estado de tus envios. Intenta nuevamente.';
  }
}

function getPdfApi() {
  const jsPdfRoot = window.jspdf;
  if (!jsPdfRoot || typeof jsPdfRoot.jsPDF !== 'function') {
    return null;
  }
  return jsPdfRoot.jsPDF;
}

function writePdfLine(doc, text, x, yRef, maxWidth, lineHeight, pageBottom, topY) {
  const lines = doc.splitTextToSize(String(text || ''), maxWidth);

  lines.forEach((line) => {
    if (yRef.value > pageBottom) {
      doc.addPage();
      yRef.value = topY;
    }
    doc.text(line, x, yRef.value);
    yRef.value += lineHeight;
  });
}

function downloadPedidoComprobante(pedidoId, btnEl) {
  if (!pedidoId) {
    return;
  }

  const pedido = pedidosByIdCache[pedidoId];
  if (!pedido) {
    errorEl.textContent = 'No se encontro la informacion del pedido para generar el comprobante.';
    return;
  }

  const jsPDF = getPdfApi();
  if (!jsPDF) {
    errorEl.textContent = 'No se pudo cargar la libreria de PDF. Recarga la pagina e intenta de nuevo.';
    return;
  }

  const originalText = btnEl.textContent;
  btnEl.disabled = true;
  btnEl.textContent = 'Generando...';

  try {
    const items = itemsByPedidoCache[pedidoId] || [];
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const left = 50;
    const right = pageWidth - 50;
    const colorPrimary = [138, 100, 73];
    const colorSecond = [210, 198, 186];
    const colorText = [60, 60, 60];
    const colorLight = [248, 244, 239];
    let y = 50;

    // Header decorativo
    doc.setFillColor(...colorPrimary);
    doc.rect(0, 0, pageWidth, 80, 'F');

    // Logo/Nombre
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('AUREALUXE', left, 35);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Comprobante de Compra', left, 55);

    // Número de pedido en header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('#' + pedidoShortId(pedido.id), right - 80, 35, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(formatDate(pedido.created_at || pedido.fecha), right - 80, 55, { align: 'right' });

    y = 100;
    doc.setTextColor(...colorText);

    // Sección: Información del pedido
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...colorPrimary);
    doc.text('INFORMACIÓN DEL PEDIDO', left, y);
    y += 16;

    doc.setFillColor(...colorLight);
    doc.rect(left, y - 10, right - left, 55, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...colorText);

    doc.text('Número de pedido:', left + 10, y);
    doc.setFont('helvetica', 'bold');
    doc.text(pedidoShortId(pedido.id), left + 100, y);

    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.text('Fecha de compra:', left + 10, y);
    doc.setFont('helvetica', 'bold');
    doc.text(formatDate(pedido.created_at || pedido.fecha), left + 100, y);

    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.text('Estado:', left + 10, y);
    doc.setFont('helvetica', 'bold');
    const estadoText = estadoLabel(pedido.estado);
    doc.setTextColor(estadoText === 'Cancelado' ? [220, 20, 60] : colorPrimary);
    doc.text(estadoText, left + 100, y);

    y += 22;
    doc.setTextColor(...colorText);

    // Sección: Datos del cliente
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...colorPrimary);
    doc.text('DATOS DEL CLIENTE', left, y);
    y += 16;

    doc.setFillColor(...colorLight);
    doc.rect(left, y - 10, right - left, 60, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...colorText);

    doc.text('Nombre:', left + 10, y);
    doc.setFont('helvetica', 'bold');
    doc.text(pedido.cliente_nombre || 'No disponible', left + 100, y);

    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.text('Email:', left + 10, y);
    doc.setFont('helvetica', 'bold');
    doc.text(pedido.cliente_email || 'No disponible', left + 100, y);

    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.text('Teléfono:', left + 10, y);
    doc.setFont('helvetica', 'bold');
    doc.text(pedido.cliente_telefono || 'No disponible', left + 100, y);

    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.text('Dirección:', left + 10, y);
    doc.setFont('helvetica', 'bold');
    const directionLines = doc.splitTextToSize(buildDireccionText(pedido), right - left - 110);
    doc.text(directionLines, left + 100, y);

    y += 22;

    // Sección: Productos
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...colorPrimary);
    doc.text('DETALLE DE PRODUCTOS', left, y);
    y += 16;

    // Header tabla
    doc.setFillColor(...colorPrimary);
    doc.rect(left, y - 10, right - left, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);

    doc.text('Producto', left + 10, y + 2);
    doc.text('Cantidad', right - 110, y + 2, { align: 'center' });
    doc.text('Precio Unit.', right - 75, y + 2, { align: 'right' });
    doc.text('Subtotal', right - 10, y + 2, { align: 'right' });

    y += 18;
    doc.setTextColor(...colorText);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    if (items.length === 0) {
      doc.text('No hay productos disponibles para este pedido.', left + 10, y);
      y += 14;
    } else {
      items.forEach((item, idx) => {
        if (y > pageHeight - 80) {
          doc.addPage();
          y = 50;
        }

        const nombre = String(item?.nombre || 'Producto');
        const categoria = String(item?.categoria || 'General');
        const cantidad = parsePositiveInt(item?.cantidad, 1);
        const precio = parsePrice(item?.precio, 0);
        const subtotal = parseMoney(item?.subtotal);

        // Fondo alternado
        if (idx % 2 === 0) {
          doc.setFillColor(248, 248, 248);
          doc.rect(left, y - 8, right - left, 14, 'F');
        }

        doc.setTextColor(...colorText);
        const nameLines = doc.splitTextToSize(nombre + ' - ' + categoria, right - left - 220);
        doc.text(nameLines, left + 10, y);

        doc.text(String(cantidad), right - 110, y, { align: 'center' });
        doc.text(formatCop(precio), right - 75, y, { align: 'right' });
        doc.text(formatCop(subtotal), right - 10, y, { align: 'right' });

        y += 14;
      });
    }

    y += 10;

    // Línea separadora
    doc.setDrawColor(...colorSecond);
    doc.setLineWidth(1);
    doc.line(left, y, right, y);

    y += 14;

    // Totales
    const subtotalPedido = parseMoney(pedido.subtotal) || items.reduce((acc, item) => acc + parseMoney(item?.subtotal), 0);
    const envioPedido = parseMoney(pedido.envio);
    const descuentoPedido = parseMoney(pedido.descuento);
    const totalPedido = parseMoney(pedido.total);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...colorText);

    doc.text('Subtotal:', right - 150, y);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCop(subtotalPedido), right - 10, y, { align: 'right' });

    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.text('Envío:', right - 150, y);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCop(envioPedido), right - 10, y, { align: 'right' });

    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.text('Descuento:', right - 150, y);
    doc.setFont('helvetica', 'bold');
    doc.text('-' + formatCop(descuentoPedido), right - 10, y, { align: 'right' });

    y += 16;

    // Total destacado
    doc.setFillColor(...colorLight);
    doc.rect(right - 160, y - 8, 150, 18, 'F');
    doc.setDrawColor(...colorPrimary);
    doc.setLineWidth(2);
    doc.rect(right - 160, y - 8, 150, 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...colorPrimary);
    doc.text('TOTAL', right - 155, y + 2);
    doc.setFontSize(14);
    doc.text(formatCop(totalPedido), right - 10, y + 3, { align: 'right' });

    // Footer
    y = pageHeight - 35;
    doc.setDrawColor(...colorSecond);
    doc.line(left, y, right, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Este comprobante es informativo y valida tu compra en AUREALUXE.', pageWidth / 2, y + 10, { align: 'center' });
    doc.text('Generado y archivado digitalmente - ' + formatDate(new Date().toISOString()), pageWidth / 2, y + 18, { align: 'center' });

    const safeId = String(pedido.id || 'pedido').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 30) || 'pedido';
    doc.save('comprobante-' + safeId + '.pdf');
    errorEl.textContent = '';
    showEstadoToast('✓ Comprobante PDF generado correctamente.');
  } catch (_error) {
    errorEl.textContent = 'No se pudo generar el comprobante PDF. Intenta nuevamente.';
  } finally {
    btnEl.disabled = false;
    btnEl.textContent = originalText;
  }
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function buildCartItemKey(item) {
  const nombre = normalizeName(item?.nombre);
  const categoria = String(item?.categoria || '').trim().toLowerCase();
  return nombre + '|' + categoria;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function getProductImage(nombre) {
  const key = normalizeName(nombre);
  return PRODUCT_IMAGE_BY_NAME[key] || 'assets/img/logo/aurea-logo.png';
}

function parsePositiveInt(value, fallback) {
  const parsed = parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

function parsePrice(value, fallback) {
  const parsed = parseFloat(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.round(parsed);
  }
  return fallback;
}

function loadCartData() {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function saveCartData(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  if (typeof window.updateCartBadgeGlobal === 'function') {
    window.updateCartBadgeGlobal();
  }
}

function showEstadoToast(message) {
  const toast = document.createElement('div');
  toast.className = 'estado-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('visible');
  }, 15);

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => {
      toast.remove();
    }, 220);
  }, 2500);
}

function reordenarPedido(pedidoId, btnEl) {
  if (!pedidoId) {
    return;
  }

  const items = itemsByPedidoCache[pedidoId] || [];
  if (items.length === 0) {
    errorEl.textContent = 'No hay productos para reordenar en este pedido.';
    return;
  }

  const originalText = btnEl.textContent;
  btnEl.disabled = true;
  btnEl.textContent = 'Agregando...';

  try {
    const cart = loadCartData();
    let totalUnidades = 0;

    items.forEach((item) => {
      const nombre = String(item?.nombre || '').trim();
      if (!nombre) {
        return;
      }

      const categoria = String(item?.categoria || 'General').trim() || 'General';
      const cantidad = parsePositiveInt(item?.cantidad, 1);
      const subtotal = parsePrice(item?.subtotal, 0);
      const precioFallback = subtotal > 0 ? Math.round(subtotal / cantidad) : 0;
      const precio = parsePrice(item?.precio, precioFallback);

      const product = {
        id: slugify(nombre),
        nombre,
        categoria,
        precio,
        cantidad,
        imagen: getProductImage(nombre)
      };

      const key = buildCartItemKey(product);
      const existingIndex = cart.findIndex((cartItem) => buildCartItemKey(cartItem) === key);

      if (existingIndex >= 0) {
        const currentQty = parsePositiveInt(cart[existingIndex]?.cantidad, 1);
        cart[existingIndex].cantidad = currentQty + cantidad;

        if (!cart[existingIndex].imagen) {
          cart[existingIndex].imagen = product.imagen;
        }
      } else {
        cart.push(product);
      }

      totalUnidades += cantidad;
    });

    saveCartData(cart);
    errorEl.textContent = '';
    showEstadoToast('Se agregaron ' + totalUnidades + ' productos al carrito.');
  } catch (_error) {
    errorEl.textContent = 'No se pudo reordenar el pedido. Intenta nuevamente.';
  } finally {
    btnEl.disabled = false;
    btnEl.textContent = originalText;
  }
}

async function cancelarPedido(pedidoId, btnEl) {
  if (!supabaseClient || !pedidoId || !currentUserEmail) {
    return;
  }

  const confirmar = await openCancelModal(pedidoId);
  if (!confirmar) {
    return;
  }

  const originalText = btnEl.textContent;
  btnEl.disabled = true;
  btnEl.textContent = 'Cancelando...';

  try {
    const { data, error } = await supabaseClient
      .from('pedidos')
      .update({ estado: 'cancelado' })
      .eq('id', pedidoId)
      .eq('cliente_email', currentUserEmail)
      .in('estado', ['pendiente', 'procesado'])
      .select('id')
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Este pedido ya no se puede cancelar.');
    }

    await loadEstadoEnvios();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cancelar el pedido.';
    errorEl.textContent = message;
    btnEl.disabled = false;
    btnEl.textContent = originalText;
  }
}

function openCancelModal(pedidoId) {
  if (!cancelModalBackdrop || !cancelModalText || !cancelModalConfirm) {
    return Promise.resolve(window.confirm('Quieres cancelar este pedido?'));
  }

  const shortId = pedidoShortId(pedidoId);
  cancelModalText.textContent = 'Vas a cancelar el pedido ' + shortId + '. Esta accion no se puede deshacer.';

  cancelModalBackdrop.classList.add('open');
  cancelModalBackdrop.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');

  setTimeout(() => {
    cancelModalConfirm.focus();
  }, 0);

  return new Promise((resolve) => {
    cancelModalResolver = resolve;
  });
}

function closeCancelModal(confirmed) {
  if (!cancelModalBackdrop) {
    return;
  }

  cancelModalBackdrop.classList.remove('open');
  cancelModalBackdrop.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');

  if (cancelModalResolver) {
    const resolver = cancelModalResolver;
    cancelModalResolver = null;
    resolver(confirmed);
  }
}

function setupCancelModalEvents() {
  if (!cancelModalBackdrop || !cancelModalClose || !cancelModalBack || !cancelModalConfirm) {
    return;
  }

  cancelModalClose.addEventListener('click', () => closeCancelModal(false));
  cancelModalBack.addEventListener('click', () => closeCancelModal(false));
  cancelModalConfirm.addEventListener('click', () => closeCancelModal(true));

  cancelModalBackdrop.addEventListener('click', (event) => {
    if (event.target === cancelModalBackdrop) {
      closeCancelModal(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && cancelModalBackdrop.classList.contains('open')) {
      closeCancelModal(false);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupCancelModalEvents();
  loadEstadoEnvios();

  btnRefresh.addEventListener('click', () => {
    loadEstadoEnvios();
  });

  listEl.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const invoiceBtn = target.closest('.estado-btn-invoice');
    if (invoiceBtn) {
      const invoicePedidoId = invoiceBtn.getAttribute('data-pedido-id') || '';
      downloadPedidoComprobante(invoicePedidoId, invoiceBtn);
      return;
    }

    const reorderBtn = target.closest('.estado-btn-reorder');
    if (reorderBtn) {
      const reorderPedidoId = reorderBtn.getAttribute('data-pedido-id') || '';
      reordenarPedido(reorderPedidoId, reorderBtn);
      return;
    }

    const btn = target.closest('.estado-btn-cancel');
    if (!btn) {
      return;
    }

    const pedidoId = btn.getAttribute('data-pedido-id') || '';
    cancelarPedido(pedidoId, btn);
  });
});
