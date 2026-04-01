// ── FORMULARIO: validación y envío ──
const btnEnviar = document.getElementById('btnEnviar');
const formMsg   = document.getElementById('formMsg');

const SUPABASE_URL = window.SUPABASE_URL || 'https://webwxpumtvihppkhakox.supabase.co';
const SUPABASE_KEY = window.SUPABASE_KEY || 'sb_publishable_dLrp6AspzhqaGe58WGBd6Q_kveesjx0';
const CONTACTO_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/contacto-email`;

const campos = {
  nombre:  document.getElementById('nombre'),
  email:   document.getElementById('email'),
  asunto:  document.getElementById('asunto'),
  mensaje: document.getElementById('mensaje'),
};

function mostrarError(msg) {
  formMsg.style.color = '#c0392b';
  formMsg.textContent = msg;
}

function mostrarExito(msg) {
  formMsg.style.color = '#c69b7b';
  formMsg.textContent = msg;
}

function limpiarMsg() {
  formMsg.textContent = '';
}

function setEstadoBoton(enviando) {
  btnEnviar.disabled = enviando;
  btnEnviar.textContent = enviando ? 'Enviando...' : 'Enviar Mensaje';
}

async function enviarContacto(data) {
  const response = await fetch(CONTACTO_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify(data)
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || `Error HTTP ${response.status}`);
  }

  if (result.success !== true) {
    throw new Error(result.error || 'Supabase no confirmó el envío.');
  }

  return result;
}

btnEnviar.addEventListener('click', async () => {
  limpiarMsg();

  // Validar campos vacíos
  for (const [clave, input] of Object.entries(campos)) {
    if (!input.value.trim()) {
      mostrarError('Por favor completa todos los campos.');
      input.focus();
      return;
    }
  }

  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(campos.email.value.trim())) {
    mostrarError('Ingresa un correo electrónico válido.');
    campos.email.focus();
    return;
  }

  const data = {
    nombre: campos.nombre.value.trim(),
    email: campos.email.value.trim(),
    asunto: campos.asunto.value.trim(),
    mensaje: campos.mensaje.value.trim()
  };

  try {
    setEstadoBoton(true);
    const result = await enviarContacto(data);
    const mensaje = result.delivered === false
      ? `¡Mensaje recibido! ${result.warning || 'Te responderemos pronto.'}`
      : '¡Mensaje enviado! Te responderemos pronto.';

    mostrarExito(mensaje);

    // Limpiar formulario
    Object.values(campos).forEach(input => { input.value = ''; });
  } catch (error) {
    const detalle = error instanceof Error
      ? error.message
      : 'No se pudo enviar el mensaje. Intenta nuevamente en unos segundos.';
    console.error('Error al enviar formulario:', detalle);
    mostrarError(detalle);
  } finally {
    setEstadoBoton(false);
  }

  // Ocultar mensaje tras 5 segundos
  setTimeout(limpiarMsg, 5000);
});

// Limpiar error al escribir
Object.values(campos).forEach(input => {
  input.addEventListener('input', limpiarMsg);
});