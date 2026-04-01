/* ═══════════════════════════════════════════
   AUREALUXE — carrito.js
   Lógica completa del carrito de compras y Supabase
   ═══════════════════════════════════════════ */

const SUPABASE_URL = 'https://webwxpumtvihppkhakox.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dLrp6AspzhqaGe58WGBd6Q_kveesjx0';

const CART_STORAGE_KEY = 'aurealuxe_cart';
const USD_TO_COP = 4000;
const CUPONES = {
  'AUREA20': 0.20    // 20% de descuento
};
const ENVIO_GRATIS_MIN = 500000;
const COSTO_ENVIO = 15990;
const ADDRESS_LABEL_OTHER = 'Otra';
const PAYMENT_METHOD_CHECKOUT = 'checkout_directo';

let supabaseClient = null;
let cartData = [];
let cuponAplicado = null;
let currentCheckoutUser = null;
let userAddressesCache = [];
let hasTrackedCheckoutStarted = false;

function getSupabaseClient() {
  if (window.__aureaSupabaseClient) {
    return window.__aureaSupabaseClient;
  }

  if (typeof supabase === 'undefined') {
    return null;
  }

  window.__aureaSupabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return window.__aureaSupabaseClient;
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
    // No bloquear flujo del carrito por analitica.
  }
}

function buildCheckoutMetrics() {
  const subtotal = cartData.reduce((sum, item) => {
    return sum + (parseFloat(item.precio || 0) * item.cantidad);
  }, 0);

  const envio = subtotal >= ENVIO_GRATIS_MIN ? 0 : COSTO_ENVIO;
  const descuento = subtotal * (CUPONES[cuponAplicado] || 0);
  const total = subtotal + envio - descuento;

  return {
    subtotal,
    envio,
    descuento,
    total
  };
}

function normalizeCartItem(item) {
  const precioRaw = parseFloat(item?.precio || 0);
  const precioCop = precioRaw > 0 && precioRaw < 10000
    ? Math.round(precioRaw * USD_TO_COP)
    : Math.round(precioRaw);

  return {
    ...item,
    precio: Number.isNaN(precioCop) ? 0 : precioCop,
    cantidad: Math.max(1, parseInt(item?.cantidad || 1, 10) || 1)
  };
}

/* ══════════════════════════════
   INICIALIZACIÓN
══════════════════════════════ */
document.addEventListener('DOMContentLoaded', async function () {
  // Inicializar Supabase
  supabaseClient = getSupabaseClient();

  // Cargar carrito desde localStorage
  loadCart();

  // Renderizar carrito
  renderCart();

  // Event listeners
  setupEventListeners();

  // Autocompletar datos del cliente si hay sesión iniciada
  await prefillClienteData();

  // Calcular totales
  updateTotals();
});

/* ══════════════════════════════
   FUNCIONES DE CARRITO
══════════════════════════════ */

function loadCart() {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    cartData = stored ? JSON.parse(stored) : [];
    cartData = Array.isArray(cartData) ? cartData.map(normalizeCartItem) : [];
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData));
  } catch (error) {
    console.error('[CARRITO ERROR] Error en loadCart:', error);
    cartData = [];
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData));
  updateCartBadge();
}

function renderCart() {
  const carritoItems = document.getElementById('carritoItems');
  const carritoEmpty = document.getElementById('carritoEmpty');
  const btnContinue = document.getElementById('btnContinueShopping');

  if (cartData.length === 0) {
    return;
  }

  // Mostrar items
  carritoEmpty.style.display = 'none';
  carritoItems.style.display = 'flex';
  btnContinue.style.display = 'block';
  carritoItems.innerHTML = '';

  cartData.forEach((item, index) => {
    const itemHTML = `
      <div class="carrito-item" data-item-index="${index}">
        <img src="${item.imagen || 'assets/img/placeholder.jpg'}" alt="${item.nombre}" class="item-image">
        <div class="item-details">
          <h3 class="item-name">${highlightTextSafe(item.nombre)}</h3>
          <span class="item-category">${highlightTextSafe(item.categoria)}</span>
          <span class="item-precio-unit">${formatCop(parseFloat(item.precio || 0))}</span>
        </div>
        <div class="item-controls">
          <div class="cantidad-control">
            <button class="btn-cantidad btn-minus" data-index="${index}">−</button>
            <span class="cantidad-value">${item.cantidad}</span>
            <button class="btn-cantidad btn-plus" data-index="${index}">+</button>
          </div>
          <span class="item-precio-total">${formatCop(parseFloat(item.precio || 0) * item.cantidad)}</span>
          <button class="btn-eliminar" data-index="${index}">×</button>
        </div>
      </div>
    `;
    carritoItems.insertAdjacentHTML('beforeend', itemHTML);
  });

  // Agregar event listeners a los botones
  document.querySelectorAll('.btn-minus').forEach(btn => {
    btn.addEventListener('click', function () {
      const index = parseInt(this.dataset.index);
      updateQuantity(index, -1);
    });
  });

  document.querySelectorAll('.btn-plus').forEach(btn => {
    btn.addEventListener('click', function () {
      const index = parseInt(this.dataset.index);
      updateQuantity(index, 1);
    });
  });

  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', function () {
      const index = parseInt(this.dataset.index);
      removeItem(index);
    });
  });
}

function updateQuantity(index, delta) {
  if (index < 0 || index >= cartData.length) return;

  const newQty = (cartData[index].cantidad || 1) + delta;
  
  if (newQty < 1) {
    removeItem(index);
    return;
  }

  cartData[index].cantidad = newQty;
  saveCart();
  renderCart();
  updateTotals();
}

function removeItem(index) {
  if (index < 0 || index >= cartData.length) return;

  cartData.splice(index, 1);
  saveCart();
  renderCart();
  updateTotals();
}

function updateTotals() {
  // Calcular subtotal
  const subtotal = cartData.reduce((sum, item) => {
    return sum + (parseFloat(item.precio || 0) * item.cantidad);
  }, 0);

  // Calcular envío
  const envio = subtotal >= ENVIO_GRATIS_MIN ? 0 : COSTO_ENVIO;

  // Calcular descuento
  let descuento = 0;
  if (cuponAplicado) {
    const porcentaje = CUPONES[cuponAplicado] || 0;
    descuento = subtotal * porcentaje;
  }

  // Total
  const total = subtotal + envio - descuento;

  // Actualizar DOM
  document.getElementById('subtotalValue').textContent = formatCop(subtotal);
  
  const envioValue = document.getElementById('envioValue');
  const envioNote = document.getElementById('envioNote');
  envioValue.textContent = formatCop(envio);
  
  if (subtotal >= ENVIO_GRATIS_MIN && subtotal > 0) {
    envioNote.textContent = '(Gratis)';
  } else {
    envioNote.textContent = '';
  }

  const descuentoRow = document.getElementById('descuentoRow');
  const descuentoValue = document.getElementById('descuentoValue');
  
  if (descuento > 0) {
    descuentoRow.style.display = 'flex';
    descuentoValue.textContent = `-${formatCop(descuento)}`;
  } else {
    descuentoRow.style.display = 'none';
  }

  document.getElementById('totalValue').textContent = formatCop(total);
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  const totalItems = cartData.reduce((sum, item) => sum + item.cantidad, 0);
  badge.textContent = totalItems > 99 ? '99+' : String(totalItems);
  badge.classList.toggle('hidden', totalItems === 0);
}

function setAddressProfileVisibility(isLogged) {
  const addressProfileBox = document.getElementById('addressProfileBox');
  const addressSaveBox = document.getElementById('addressSaveBox');

  if (addressProfileBox) {
    addressProfileBox.classList.toggle('auth-hidden', !isLogged);
  }

  if (addressSaveBox) {
    addressSaveBox.classList.toggle('auth-hidden', !isLogged);
  }
}

function updateAddressSaveControlsState() {
  const guardarCheck = document.getElementById('guardarDireccionCheck');
  const addressSaveRow = document.getElementById('addressSaveRow');
  const defaultCheck = document.getElementById('direccionPredeterminadaCheck');
  const direccionLabel = document.getElementById('direccionLabel');
  const customLabel = document.getElementById('direccionCustomLabel');

  const enabled = !!guardarCheck?.checked;

  if (addressSaveRow) {
    addressSaveRow.style.opacity = enabled ? '1' : '0.5';
  }

  if (defaultCheck) {
    defaultCheck.disabled = !enabled;
  }

  if (direccionLabel) {
    direccionLabel.disabled = !enabled;
  }

  if (customLabel) {
    customLabel.disabled = !enabled;
  }

  toggleCustomAddressLabelField();
}

function toggleCustomAddressLabelField() {
  const guardarCheck = document.getElementById('guardarDireccionCheck');
  const direccionLabel = document.getElementById('direccionLabel');
  const customGroup = document.getElementById('direccionCustomLabelGroup');
  const customInput = document.getElementById('direccionCustomLabel');

  if (!direccionLabel || !customGroup || !customInput) return;

  const shouldShow = !!guardarCheck?.checked && direccionLabel.value === ADDRESS_LABEL_OTHER;
  customGroup.style.display = shouldShow ? '' : 'none';

  if (!shouldShow) {
    customInput.value = '';
  }
}

function getAddressLabelForSave() {
  const direccionLabel = document.getElementById('direccionLabel');
  const customInput = document.getElementById('direccionCustomLabel');

  if (!direccionLabel) return 'Casa';

  if (direccionLabel.value === ADDRESS_LABEL_OTHER) {
    const custom = customInput?.value?.trim() || '';
    return custom || ADDRESS_LABEL_OTHER;
  }

  return direccionLabel.value || 'Casa';
}

function clearInputError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) input.classList.remove('error');
  if (error) error.textContent = '';
}

function applySavedAddressToForm(address) {
  if (!address) return;

  const nombreInput = document.getElementById('clienteNombre');
  const telefonoInput = document.getElementById('clienteTelefono');
  const direccionInput = document.getElementById('clienteDireccion');
  const ciudadInput = document.getElementById('clienteCiudad');
  const referenciaInput = document.getElementById('clienteReferencia');

  if (nombreInput && !nombreInput.value.trim() && address.destinatario_nombre) {
    nombreInput.value = address.destinatario_nombre;
  }

  if (telefonoInput) telefonoInput.value = address.telefono || '';
  if (direccionInput) direccionInput.value = address.direccion || '';
  if (ciudadInput) ciudadInput.value = address.ciudad || '';
  if (referenciaInput) referenciaInput.value = address.referencia || '';

  clearInputError('clienteTelefono', 'errorTelefono');
  clearInputError('clienteDireccion', 'errorDireccion');
  clearInputError('clienteCiudad', 'errorCiudad');

  const direccionLabel = document.getElementById('direccionLabel');
  const customLabel = document.getElementById('direccionCustomLabel');

  if (direccionLabel) {
    const label = String(address.label || '').trim();
    const knownLabel = ['Casa', 'Oficina', ADDRESS_LABEL_OTHER].includes(label);

    if (knownLabel) {
      direccionLabel.value = label;
      if (customLabel) customLabel.value = '';
    } else {
      direccionLabel.value = ADDRESS_LABEL_OTHER;
      if (customLabel) customLabel.value = label;
    }
  }

  toggleCustomAddressLabelField();
}

function renderSavedAddresses(addresses) {
  const select = document.getElementById('savedAddressSelect');
  const hint = document.getElementById('savedAddressHint');
  const useBtn = document.getElementById('btnUsarDireccion');

  if (!select) return;

  select.innerHTML = '<option value="">Selecciona una dirección guardada</option>';

  if (!Array.isArray(addresses) || addresses.length === 0) {
    select.innerHTML += '<option value="__new__">Nueva dirección</option>';
    if (useBtn) useBtn.disabled = true;
    if (hint) hint.textContent = 'No tienes direcciones guardadas todavía.';
    return;
  }

  addresses.forEach((address) => {
    const option = document.createElement('option');
    option.value = address.id;
    const location = [address.direccion, address.ciudad].filter(Boolean).join(' - ');
    option.textContent = `${address.label}: ${location}`;
    select.appendChild(option);
  });

  select.innerHTML += '<option value="__new__">Nueva dirección</option>';
  if (useBtn) useBtn.disabled = false;
  if (hint) hint.textContent = `Tienes ${addresses.length} direccion(es) guardada(s).`;

  const defaultAddress = addresses.find((address) => address.is_default) || addresses[0];
  if (defaultAddress) {
    select.value = defaultAddress.id;
    const direccionInput = document.getElementById('clienteDireccion');
    if (direccionInput && !direccionInput.value.trim()) {
      applySavedAddressToForm(defaultAddress);
    }
  }
}

async function loadUserAddresses(user) {
  if (!supabaseClient || !user?.id) {
    userAddressesCache = [];
    renderSavedAddresses(userAddressesCache);
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('user_addresses')
      .select('id, label, destinatario_nombre, telefono, direccion, ciudad, referencia, is_default, updated_at')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    userAddressesCache = Array.isArray(data) ? data : [];
    renderSavedAddresses(userAddressesCache);
  } catch (error) {
    console.warn('[CARRITO] No se pudieron cargar direcciones guardadas:', error);
    userAddressesCache = [];
    renderSavedAddresses(userAddressesCache);
  }
}

function applySelectedSavedAddress() {
  const select = document.getElementById('savedAddressSelect');
  if (!select) return;

  const value = select.value;
  if (!value || value === '__new__') {
    return;
  }

  const address = userAddressesCache.find((item) => item.id === value);
  if (address) {
    applySavedAddressToForm(address);
  }
}

async function saveAddressForProfile(user) {
  const guardarCheck = document.getElementById('guardarDireccionCheck');
  if (!guardarCheck?.checked) return;
  if (!supabaseClient || !user?.id) return;

  const label = getAddressLabelForSave();
  if (!label) return;

  const markAsDefault = !!document.getElementById('direccionPredeterminadaCheck')?.checked;

  const payload = {
    user_id: user.id,
    label,
    destinatario_nombre: document.getElementById('clienteNombre')?.value?.trim() || null,
    telefono: document.getElementById('clienteTelefono')?.value?.trim() || null,
    direccion: document.getElementById('clienteDireccion')?.value?.trim() || null,
    ciudad: document.getElementById('clienteCiudad')?.value?.trim() || null,
    referencia: document.getElementById('clienteReferencia')?.value?.trim() || null,
    is_default: markAsDefault
  };

  if (!payload.direccion || !payload.ciudad) return;

  const { error } = await supabaseClient
    .from('user_addresses')
    .upsert([payload], { onConflict: 'user_id,label' });

  if (error) {
    throw error;
  }

  if (markAsDefault) {
    await supabaseClient
      .from('user_addresses')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .neq('label', label);
  }

  await loadUserAddresses(user);

  const hint = document.getElementById('savedAddressHint');
  if (hint) {
    hint.textContent = `Dirección guardada como ${label}.`;
  }
}

async function prefillClienteData() {
  if (!supabaseClient) {
    setAddressProfileVisibility(false);
    return;
  }

  const nombreInput = document.getElementById('clienteNombre');
  const emailInput = document.getElementById('clienteEmail');

  if (!nombreInput && !emailInput) return;

  try {
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) throw sessionError;

    const user = sessionData?.session?.user;
    if (!user) {
      currentCheckoutUser = null;
      setAddressProfileVisibility(false);
      if (emailInput) {
        emailInput.readOnly = false;
        emailInput.classList.remove('is-locked');
        emailInput.removeAttribute('title');
      }
      return;
    }

    currentCheckoutUser = user;
    setAddressProfileVisibility(true);

    if (emailInput && !emailInput.value.trim() && user.email) {
      emailInput.value = user.email;
    }

    if (emailInput) {
      emailInput.readOnly = true;
      emailInput.classList.add('is-locked');
      emailInput.title = 'Email vinculado a tu sesion';
    }

    let nombre = (user.user_metadata?.nombre || '').trim();

    if (!nombre && user.id) {
      const { data: profileData, error: profileError } = await supabaseClient
        .from('user_profiles')
        .select('nombre')
        .eq('id', user.id)
        .maybeSingle();

      if (!profileError) {
        nombre = (profileData?.nombre || '').trim();
      }
    }

    if (nombreInput && !nombreInput.value.trim() && nombre) {
      nombreInput.value = nombre;
    }

    await loadUserAddresses(user);
  } catch (error) {
    console.warn('[CARRITO] No se pudo autocompletar datos del usuario:', error);
  }
}

/* ══════════════════════════════
   CUPONES
══════════════════════════════ */

function applyCupon() {
  const input = document.getElementById('cuponInput');
  const hint = document.getElementById('cuponHint');
  const code = input.value.trim().toUpperCase();

  if (!code) {
    hint.textContent = 'Ingresa un código';
    hint.className = 'cupon-hint';
    return;
  }

  if (!(code in CUPONES)) {
    hint.textContent = 'Cupón inválido';
    hint.className = 'cupon-hint error';
    return;
  }

  // Aplicar cupón
  cuponAplicado = code;
  const porcentaje = CUPONES[code] * 100;
  hint.textContent = `✓ Cupón aplicado: ${porcentaje}% de descuento`;
  hint.className = 'cupon-hint success';
  
  input.disabled = true;
  document.getElementById('btnAplicarCupon').disabled = true;

  updateTotals();
}

/* ══════════════════════════════
   VALIDACIÓN DE FORMULARIO
══════════════════════════════ */

function validateClientForm() {
  const nombre = document.getElementById('clienteNombre');
  const email = document.getElementById('clienteEmail');
  const telefono = document.getElementById('clienteTelefono');
  const direccion = document.getElementById('clienteDireccion');
  const ciudad = document.getElementById('clienteCiudad');

  let isValid = true;

  // Validar nombre
  if (!nombre.value.trim()) {
    mostrarError('errorNombre', 'El nombre es requerido');
    nombre.classList.add('error');
    isValid = false;
  } else {
    limpiarError('errorNombre', nombre);
  }

  // Validar email
  if (!email.value.trim() || !isEmailValid(email.value.trim())) {
    mostrarError('errorEmail', 'Email inválido');
    email.classList.add('error');
    isValid = false;
  } else {
    limpiarError('errorEmail', email);
  }

  // Validar teléfono
  if (!telefono.value.trim()) {
    mostrarError('errorTelefono', 'El teléfono es requerido');
    telefono.classList.add('error');
    isValid = false;
  } else {
    limpiarError('errorTelefono', telefono);
  }

  // Validar direccion
  if (!direccion.value.trim()) {
    mostrarError('errorDireccion', 'La dirección es requerida');
    direccion.classList.add('error');
    isValid = false;
  } else {
    limpiarError('errorDireccion', direccion);
  }

  // Validar ciudad
  if (!ciudad.value.trim()) {
    mostrarError('errorCiudad', 'La ciudad es requerida');
    ciudad.classList.add('error');
    isValid = false;
  } else {
    limpiarError('errorCiudad', ciudad);
  }

  return isValid;
}

function isEmailValid(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function mostrarError(elementId, mensaje) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = mensaje;
}

function limpiarError(elementId, inputEl) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = '';
  inputEl.classList.remove('error');
}

/* ══════════════════════════════
   CONFIRMAR PEDIDO
══════════════════════════════ */

async function confirmarPedido() {
  await procesarCheckout();
}

function mostrarErrorPedido(mensaje) {
  const el = document.getElementById('pedidoError');
  if (el) {
    el.textContent = mensaje;
  }
}

async function procesarCheckout() {
  const user = await ensureLoggedUserForCheckout();
  if (!user) {
    return;
  }

  if (cartData.length === 0) {
    mostrarErrorPedido('El carrito esta vacio');
    return;
  }

  if (!validateClientForm()) {
    return;
  }

  if (!supabaseClient) {
    mostrarErrorPedido('No se pudo inicializar Supabase. Recarga la pagina e intenta de nuevo.');
    return;
  }

  const btn = document.getElementById('btnConfirmarPedido');
  if (!btn) return;

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Finalizando compra...';
  let createdPedidoId = null;

  try {
    const metrics = buildCheckoutMetrics();
    const subtotal = metrics.subtotal;
    const envio = metrics.envio;
    const descuento = metrics.descuento;
    const total = metrics.total;

    const pedidoData = {
      cliente_nombre: document.getElementById('clienteNombre').value.trim(),
      cliente_email: document.getElementById('clienteEmail').value.trim(),
      cliente_telefono: document.getElementById('clienteTelefono').value.trim(),
      cliente_direccion: document.getElementById('clienteDireccion').value.trim(),
      cliente_ciudad: document.getElementById('clienteCiudad').value.trim(),
      cliente_referencia: document.getElementById('clienteReferencia').value.trim() || null,
      subtotal: subtotal,
      envio: envio,
      descuento: descuento,
      total: total,
      estado: 'procesado',
      cupon_usado: cuponAplicado || null
    };

    const { data: pedido, error: errorPedido } = await supabaseClient
      .from('pedidos')
      .insert([pedidoData])
      .select()
      .single();

    if (errorPedido) {
      throw new Error('Error al crear pedido: ' + errorPedido.message);
    }

    const pedidoId = pedido.id;
    createdPedidoId = pedidoId;

    const itemsData = cartData.map(item => ({
      pedido_id: pedidoId,
      nombre: item.nombre,
      categoria: item.categoria,
      precio: parseFloat(item.precio || 0),
      cantidad: item.cantidad,
      subtotal: parseFloat(item.precio || 0) * item.cantidad
    }));

    const { error: errorItems } = await supabaseClient
      .from('pedido_items')
      .insert(itemsData);

    if (errorItems) {
      throw new Error('Error al crear items: ' + errorItems.message);
    }

    try {
      await saveAddressForProfile(user);
    } catch (saveAddressError) {
      console.warn('[CARRITO] No se pudo guardar direccion en perfil:', saveAddressError);
    }

    trackConversion('purchase_completed', {
      orderId: pedidoId,
      userEmail: pedidoData.cliente_email,
      quantity: cartData.reduce((sum, item) => sum + (parseInt(item.cantidad, 10) || 0), 0),
      value: total,
      metadata: {
        subtotal,
        envio,
        descuento,
        items_count: cartData.length,
        payment_method: PAYMENT_METHOD_CHECKOUT
      }
    });

    cartData = [];
    saveCart();
    renderCart();
    updateTotals();
    mostrarErrorPedido('');
    mostrarModalExito(pedidoId);
  } catch (error) {
    if (createdPedidoId && supabaseClient) {
      try {
        await supabaseClient
          .from('pedidos')
          .delete()
          .eq('id', createdPedidoId);
      } catch (cleanupError) {
        console.warn('[CARRITO] No se pudo limpiar pedido simulado fallido:', cleanupError);
      }
    }

    mostrarErrorPedido(error.message || 'No se pudo completar la compra en este momento.');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function ensureLoggedUserForCheckout() {
  if (!supabaseClient) {
    mostrarErrorPedido('Debes iniciar sesión para completar tu compra.');
    setTimeout(() => {
      window.location.href = 'login.html?next=carrito.html';
    }, 700);
    return null;
  }

  try {
    const { data: sessionData, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    const user = sessionData?.session?.user || null;
    if (!user) {
      mostrarErrorPedido('Debes iniciar sesión para completar tu compra.');
      setTimeout(() => {
        window.location.href = 'login.html?next=carrito.html';
      }, 700);
      return null;
    }

    return user;
  } catch (error) {
    console.warn('[CARRITO] No se pudo validar sesión antes del checkout:', error);
    mostrarErrorPedido('No se pudo validar tu sesión. Inicia sesión nuevamente.');
    setTimeout(() => {
      window.location.href = 'login.html?next=carrito.html';
    }, 900);
    return null;
  }
}

function mostrarModalExito(pedidoId) {
  const overlay = document.getElementById('modalOverlay');
  const modal = document.getElementById('modalSuccess');
  const orderIdEl = document.getElementById('modalOrderId');

  const shortId = pedidoId.substring(0, 8).toUpperCase();
  orderIdEl.textContent = `Pedido: ${shortId}`;

  overlay.classList.add('active');
  modal.classList.add('active');

  // Auto-redirigir después de 3 segundos
  setTimeout(() => {
    window.location.href = 'estado-envio.html';
  }, 3000);
}

/* ══════════════════════════════
   EVENT LISTENERS
══════════════════════════════ */

function setupEventListeners() {
  // Cupón
  const btnAplicarCupon = document.getElementById('btnAplicarCupon');
  const cuponInput = document.getElementById('cuponInput');
  
  if (btnAplicarCupon) {
    btnAplicarCupon.addEventListener('click', applyCupon);
  } else {
    console.warn('[CARRITO] ⚠️ btnAplicarCupon NO ENCONTRADO');
  }
  
  if (cuponInput) {
    cuponInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        applyCupon();
      }
    });
  }

  // Confirmar pedido
  const btnConfirmarPedido = document.getElementById('btnConfirmarPedido');
  if (btnConfirmarPedido) {
    btnConfirmarPedido.addEventListener('click', function () {
      if (!hasTrackedCheckoutStarted && cartData.length > 0) {
        const metrics = buildCheckoutMetrics();
        hasTrackedCheckoutStarted = true;

        trackConversion('checkout_started', {
          userEmail: document.getElementById('clienteEmail')?.value?.trim() || null,
          quantity: cartData.reduce((sum, item) => sum + (parseInt(item.cantidad, 10) || 0), 0),
          value: metrics.total,
          metadata: {
            subtotal: metrics.subtotal,
            envio: metrics.envio,
            descuento: metrics.descuento,
            items_count: cartData.length,
            cupon: cuponAplicado || null,
            payment_method: PAYMENT_METHOD_CHECKOUT
          }
        });
      }

      confirmarPedido();
    });
  } else {
    console.warn('[CARRITO] ⚠️ btnConfirmarPedido NO ENCONTRADO');
  }

  // Validación en tiempo real del formulario
  ['clienteNombre', 'clienteEmail', 'clienteTelefono', 'clienteDireccion', 'clienteCiudad'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('blur', function () {
        if (this.value.trim()) {
          this.classList.remove('error');
          const errorId = 'error' + id.charAt(7).toUpperCase() + id.slice(8);
          const errorEl = document.getElementById(errorId);
          if (errorEl) errorEl.textContent = '';
        }
      });
    }
  });

  const savedAddressSelect = document.getElementById('savedAddressSelect');
  const btnUsarDireccion = document.getElementById('btnUsarDireccion');
  const guardarDireccionCheck = document.getElementById('guardarDireccionCheck');
  const direccionLabel = document.getElementById('direccionLabel');

  if (savedAddressSelect) {
    savedAddressSelect.addEventListener('change', function () {
      const canUse = !!this.value && this.value !== '__new__';
      if (btnUsarDireccion) {
        btnUsarDireccion.disabled = !canUse;
      }

      if (this.value === '__new__') {
        const hint = document.getElementById('savedAddressHint');
        if (hint) hint.textContent = 'Completa una nueva dirección y confirma tu pedido para guardarla.';
      }
    });
  }

  if (btnUsarDireccion) {
    btnUsarDireccion.addEventListener('click', function () {
      applySelectedSavedAddress();
    });
  }

  if (guardarDireccionCheck) {
    guardarDireccionCheck.addEventListener('change', function () {
      updateAddressSaveControlsState();
    });
  }

  if (direccionLabel) {
    direccionLabel.addEventListener('change', function () {
      toggleCustomAddressLabelField();
    });
  }

  updateAddressSaveControlsState();

  // Click en botón volver en modal
  const btnContinueShopping = document.getElementById('btnContinueShopping');
  if (btnContinueShopping) {
    btnContinueShopping.addEventListener('click', function (e) {
      e.preventDefault();
    });
  }
}

/* ══════════════════════════════
   UTILIDADES
══════════════════════════════ */

function highlightTextSafe(text) {
  // Escapar caracteres especiales en HTML
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
