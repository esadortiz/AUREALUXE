const SUPABASE_URL = 'https://webwxpumtvihppkhakox.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dLrp6AspzhqaGe58WGBd6Q_kveesjx0';

const btnSendRecovery = document.getElementById('btnSendRecovery');
const recoveryEmailInput = document.getElementById('recoveryEmail');
const recoveryMsg = document.getElementById('recoveryMsg');

let supabaseClient = null;
let screenAlertEl = null;
let screenAlertTimer = null;

if (typeof supabase !== 'undefined') {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
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

function showError(message) {
  if (recoveryMsg) {
    recoveryMsg.style.color = '#c0392b';
    recoveryMsg.textContent = message;
  }
  showScreenAlert(message, 'error');
}

function showSuccess(message) {
  if (recoveryMsg) {
    recoveryMsg.style.color = '#c69b7b';
    recoveryMsg.textContent = message;
  }
  showScreenAlert(message, 'success');
}

function clearMessage() {
  if (recoveryMsg) {
    recoveryMsg.textContent = '';
  }
  hideScreenAlert();
}

function precargarEmail() {
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email');

  if (email && recoveryEmailInput) {
    recoveryEmailInput.value = email;
  }
}

async function enviarRecuperacion() {
  clearMessage();

  const email = String(recoveryEmailInput?.value || '').trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    showError('Ingresa un correo electrónico válido para recuperar tu cuenta.');
    recoveryEmailInput?.focus();
    return;
  }

  if (!supabaseClient) {
    showError('No se pudo conectar con el servidor de autenticación. Recarga la página.');
    return;
  }

  const originalText = btnSendRecovery.textContent;
  btnSendRecovery.disabled = true;
  btnSendRecovery.textContent = 'Enviando...';

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password.html'
    });

    if (error) {
      throw error;
    }

    showSuccess('Correo enviado. Revisa tu bandeja, Spam o Promociones (remitente: noreply@mail.app.supabase.io).');
  } catch (error) {
    const raw = String(error?.message || '').toLowerCase();

    if (raw.includes('rate limit') || raw.includes('too many')) {
      showError('Demasiados intentos. Espera un momento y vuelve a intentarlo.');
    } else {
      showError('No se pudo enviar el correo de recuperación. Inténtalo nuevamente.');
    }
  } finally {
    btnSendRecovery.disabled = false;
    btnSendRecovery.textContent = originalText;
  }
}

if (btnSendRecovery) {
  btnSendRecovery.addEventListener('click', enviarRecuperacion);
}

if (recoveryEmailInput) {
  recoveryEmailInput.addEventListener('input', clearMessage);
  recoveryEmailInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      enviarRecuperacion();
    }
  });
}

precargarEmail();
