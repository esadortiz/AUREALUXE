const SUPABASE_URL = 'https://webwxpumtvihppkhakox.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dLrp6AspzhqaGe58WGBd6Q_kveesjx0';

const btnResetPassword = document.getElementById('btnResetPassword');
const resetMsg = document.getElementById('resetMsg');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

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
  if (resetMsg) {
    resetMsg.style.color = '#c0392b';
    resetMsg.textContent = message;
  }
  showScreenAlert(message, 'error');
}

function showSuccess(message) {
  if (resetMsg) {
    resetMsg.style.color = '#c69b7b';
    resetMsg.textContent = message;
  }
  showScreenAlert(message, 'success');
}

function clearMessage() {
  if (resetMsg) {
    resetMsg.textContent = '';
  }
  hideScreenAlert();
}

function parseHashTokens() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;

  const params = new URLSearchParams(hash);
  return {
    accessToken: params.get('access_token') || '',
    refreshToken: params.get('refresh_token') || '',
    type: params.get('type') || ''
  };
}

async function ensureRecoverySession() {
  if (!supabaseClient) return false;

  const tokens = parseHashTokens();

  if (tokens.accessToken && tokens.refreshToken) {
    const { error } = await supabaseClient.auth.setSession({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken
    });

    window.history.replaceState({}, '', window.location.pathname + window.location.search);

    if (error) {
      return false;
    }

    return true;
  }

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) return false;

  return !!data?.session;
}

async function updatePassword() {
  clearMessage();

  const newPassword = String(newPasswordInput?.value || '').trim();
  const confirmPassword = String(confirmPasswordInput?.value || '').trim();

  if (!newPassword || !confirmPassword) {
    showError('Completa ambos campos de contraseña.');
    return;
  }

  if (newPassword.length < 6) {
    showError('La nueva contraseña debe tener al menos 6 caracteres.');
    return;
  }

  if (newPassword !== confirmPassword) {
    showError('Las contraseñas no coinciden.');
    return;
  }

  if (!supabaseClient) {
    showError('No se pudo conectar con el servidor de autenticación.');
    return;
  }

  const hasSession = await ensureRecoverySession();
  if (!hasSession) {
    showError('El enlace de recuperación es inválido o expiró. Solicita uno nuevo desde la pantalla de recuperación.');
    return;
  }

  const originalText = btnResetPassword.textContent;
  btnResetPassword.disabled = true;
  btnResetPassword.textContent = 'Guardando...';

  try {
    const { error } = await supabaseClient.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw error;
    }

    showSuccess('Contraseña actualizada correctamente. Redirigiendo a login...');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1400);
  } catch (_error) {
    showError('No se pudo actualizar la contraseña. Solicita un nuevo enlace e inténtalo nuevamente.');
  } finally {
    btnResetPassword.disabled = false;
    btnResetPassword.textContent = originalText;
  }
}

if (btnResetPassword) {
  btnResetPassword.addEventListener('click', updatePassword);
}

[newPasswordInput, confirmPasswordInput].forEach((input) => {
  if (!input) return;

  input.addEventListener('input', clearMessage);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      updatePassword();
    }
  });
});
