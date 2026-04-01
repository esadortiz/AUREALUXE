const SUPABASE_URL = 'https://webwxpumtvihppkhakox.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dLrp6AspzhqaGe58WGBd6Q_kveesjx0';
const SIGNUP_COOLDOWN_KEY = 'aurealuxe_signup_cooldown_until';
const SIGNUP_COOLDOWN_MS = 90 * 1000;

// ── FORMULARIO: validación + registro real en Supabase Auth ──
const btnCrear = document.getElementById('btnCrear');
const registroMsg = document.getElementById('registroMsg');

const campos = {
  nombre: document.getElementById('nombre'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  confirmar: document.getElementById('confirmar')
};

let supabaseClient = null;

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

supabaseClient = getSupabaseClient();

function getSignupCooldownRemainingMs() {
  const cooldownUntil = parseInt(localStorage.getItem(SIGNUP_COOLDOWN_KEY) || '0', 10) || 0;
  return Math.max(0, cooldownUntil - Date.now());
}

function setSignupCooldown() {
  const cooldownUntil = Date.now() + SIGNUP_COOLDOWN_MS;
  localStorage.setItem(SIGNUP_COOLDOWN_KEY, String(cooldownUntil));
}

function isRateLimitedError(error) {
  const raw = (error?.message || '').toLowerCase();
  const status = Number(error?.status || 0);
  return (
    status === 429 ||
    raw.includes('too many requests') ||
    raw.includes('rate limit') ||
    raw.includes('email rate limit exceeded')
  );
}

function mostrarError(msg) {
  registroMsg.style.color = '#c0392b';
  registroMsg.textContent = msg;
}

function mostrarExito(msg) {
  registroMsg.style.color = '#c69b7b';
  registroMsg.textContent = msg;
}

function limpiarMsg() {
  registroMsg.textContent = '';
}

function validarFormulario({ nombre, email, password, confirmar }) {
  if (!nombre || !email || !password || !confirmar) {
    mostrarError('Por favor completa todos los campos.');
    return false;
  }

  if (nombre.length < 2) {
    mostrarError('Ingresa tu nombre completo.');
    campos.nombre.focus();
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    mostrarError('Ingresa un correo electrónico válido.');
    campos.email.focus();
    return false;
  }

  if (password.length < 6) {
    mostrarError('La contraseña debe tener mínimo 6 caracteres.');
    campos.password.focus();
    return false;
  }

  if (password !== confirmar) {
    mostrarError('Las contraseñas no coinciden.');
    campos.confirmar.focus();
    return false;
  }

  return true;
}

function mensajeErrorRegistro(error) {
  const raw = (error?.message || '').toLowerCase();

  if (isRateLimitedError(error)) {
    return 'Demasiados intentos de registro en poco tiempo. Espera un momento y vuelve a intentarlo.';
  }

  if (raw.includes('already registered') || raw.includes('already exists') || raw.includes('duplicate')) {
    return 'Este correo ya está registrado. Inicia sesión.';
  }

  if (raw.includes('invalid email')) {
    return 'El correo no es válido.';
  }

  if (raw.includes('password')) {
    return 'La contraseña no cumple los requisitos de seguridad.';
  }

  return 'No se pudo crear la cuenta en este momento. Inténtalo de nuevo.';
}

async function crearCuenta() {
  limpiarMsg();

  const cooldownRemaining = getSignupCooldownRemainingMs();
  if (cooldownRemaining > 0) {
    const waitSeconds = Math.ceil(cooldownRemaining / 1000);
    mostrarError('Espera ' + waitSeconds + ' segundos antes de intentar registrarte otra vez.');
    return;
  }

  const nombre = campos.nombre.value.trim();
  const email = campos.email.value.trim();
  const password = campos.password.value.trim();
  const confirmar = campos.confirmar.value.trim();

  const esValido = validarFormulario({ nombre, email, password, confirmar });
  if (!esValido) return;

  if (!supabaseClient) {
    mostrarError('No se pudo conectar con el servidor de registro. Recarga la página.');
    return;
  }

  const textoOriginal = btnCrear.textContent;
  btnCrear.disabled = true;
  btnCrear.textContent = 'Creando cuenta...';

  try {
    supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
      throw new Error('No se pudo conectar con el servidor de registro. Recarga la página.');
    }

    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre
        }
      }
    });

    if (error) {
      throw error;
    }

    mostrarExito('¡Cuenta creada correctamente! Ya puedes iniciar sesión.');
    Object.values(campos).forEach(input => {
      input.value = '';
    });

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
  } catch (error) {
    if (isRateLimitedError(error)) {
      setSignupCooldown();
    }
    mostrarError(mensajeErrorRegistro(error));
  } finally {
    btnCrear.disabled = false;
    btnCrear.textContent = textoOriginal;
  }
}

btnCrear.addEventListener('click', crearCuenta);

// Limpiar msg al escribir
Object.values(campos).forEach(input => {
  input.addEventListener('input', limpiarMsg);
});

// Enter para enviar desde cualquier campo
Object.values(campos).forEach(input => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnCrear.click();
  });
});