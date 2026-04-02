const SUPABASE_URL = 'https://webwxpumtvihppkhakox.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dLrp6AspzhqaGe58WGBd6Q_kveesjx0';

// ── FORMULARIO: validación + login real en Supabase Auth ──
const btnLogin = document.getElementById('btnLogin');
const btnForgotPassword = document.getElementById('btnForgotPassword');
const loginMsg = document.getElementById('loginMsg');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

let supabaseClient = null;
let screenAlertEl = null;
let screenAlertTimer = null;

if (typeof supabase !== 'undefined') {
  if (window.__aureaSupabaseClient) {
    supabaseClient = window.__aureaSupabaseClient;
  } else {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.__aureaSupabaseClient = supabaseClient;
  }
}

function ensureScreenAlert() {
  if (screenAlertEl) {
    return screenAlertEl;
  }

  screenAlertEl = document.createElement('div');
  screenAlertEl.className = 'screen-alert';
  screenAlertEl.setAttribute('role', 'alert');
  document.body.appendChild(screenAlertEl);
  return screenAlertEl;
}

function hideScreenAlert() {
  if (!screenAlertEl) return;
  screenAlertEl.classList.remove('is-visible', 'screen-alert-error', 'screen-alert-success');
}

function showScreenAlert(message, type) {
  const alertEl = ensureScreenAlert();

  alertEl.textContent = message;
  alertEl.classList.remove('screen-alert-error', 'screen-alert-success');
  alertEl.classList.add(type === 'success' ? 'screen-alert-success' : 'screen-alert-error');
  alertEl.classList.add('is-visible');

  if (screenAlertTimer) {
    clearTimeout(screenAlertTimer);
  }

  screenAlertTimer = setTimeout(() => {
    hideScreenAlert();
  }, 5200);
}

function mostrarError(msg) {
  if (loginMsg) {
    loginMsg.style.color = '#c0392b';
    loginMsg.textContent = msg;
  }
  showScreenAlert(msg, 'error');
}

function mostrarExito(msg) {
  if (loginMsg) {
    loginMsg.style.color = '#c69b7b';
    loginMsg.textContent = msg;
  }
  showScreenAlert(msg, 'success');
}

function limpiarMsg() {
  if (loginMsg) {
    loginMsg.textContent = '';
  }
  hideScreenAlert();
}

function validarCampos(email, password) {
  if (!email || !password) {
    mostrarError('Por favor completa todos los campos.');
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    mostrarError('Ingresa un correo electrónico válido.');
    emailInput.focus();
    return false;
  }

  if (password.length < 6) {
    mostrarError('La contraseña debe tener al menos 6 caracteres.');
    passwordInput.focus();
    return false;
  }

  return true;
}

function mensajeErrorLogin(error) {
  const raw = (error?.message || '').toLowerCase();

  if (raw.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }

  if (raw.includes('email not confirmed')) {
    return 'Debes confirmar tu correo antes de iniciar sesión.';
  }

  if (raw.includes('too many requests')) {
    return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
  }

  return 'No se pudo iniciar sesión. Inténtalo nuevamente.';
}

async function iniciarSesion() {
  limpiarMsg();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!validarCampos(email, password)) {
    return;
  }

  if (!supabaseClient) {
    mostrarError('No se pudo conectar con el servidor de autenticación. Recarga la página.');
    return;
  }

  const textoOriginal = btnLogin.textContent;
  btnLogin.disabled = true;
  btnLogin.textContent = 'Ingresando...';

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      throw error;
    }

    mostrarExito('¡Sesión iniciada correctamente! Redirigiendo...');

    const next = new URLSearchParams(window.location.search).get('next');
    const destino = next && !next.startsWith('http') ? next : 'index.html';

    setTimeout(() => {
      window.location.href = destino;
    }, 900);
  } catch (error) {
    mostrarError(mensajeErrorLogin(error));
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = textoOriginal;
  }
}

function irARecuperacion() {
  const email = emailInput.value.trim();
  const destino = new URL('forgot-password.html', window.location.href);

  if (email) {
    destino.searchParams.set('email', email);
  }

  window.location.href = destino.pathname + destino.search;
}

btnLogin.addEventListener('click', iniciarSesion);
if (btnForgotPassword) {
  btnForgotPassword.addEventListener('click', irARecuperacion);
}

// Limpiar msg al escribir
[emailInput, passwordInput].forEach(input => {
  input.addEventListener('input', limpiarMsg);
});

// Enter para enviar
[emailInput, passwordInput].forEach(input => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnLogin.click();
  });
});
