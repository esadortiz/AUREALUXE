(function () {
  const SUPABASE_URL = 'https://webwxpumtvihppkhakox.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_dLrp6AspzhqaGe58WGBd6Q_kveesjx0';

  function getSupabaseClient() {
    if (window.__aureaSupabaseClient) {
      return window.__aureaSupabaseClient;
    }

    if (typeof window.supabase === 'undefined') {
      return null;
    }

    window.__aureaSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return window.__aureaSupabaseClient;
  }

  function loadSupabaseSdk() {
    return new Promise((resolve, reject) => {
      if (typeof window.supabase !== 'undefined') {
        resolve();
        return;
      }

      const existing = document.querySelector('script[data-supabase-sdk="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('No se pudo cargar Supabase SDK')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      script.async = true;
      script.dataset.supabaseSdk = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se pudo cargar Supabase SDK'));
      document.head.appendChild(script);
    });
  }

  function createUserMenu(user, supabaseClient) {
    const wrapper = document.createElement('div');
    wrapper.className = 'user-menu';

    const btn = document.createElement('button');
    btn.className = 'user-trigger';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Abrir menu de usuario');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = [
      '<svg class="user-trigger-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">',
      '<circle cx="12" cy="8" r="4"></circle>',
      '<path d="M4 20c1.8-3.4 4.6-5 8-5s6.2 1.6 8 5"></path>',
      '</svg>'
    ].join('');

    const dropdown = document.createElement('div');
    dropdown.className = 'user-dropdown';
    dropdown.innerHTML = [
      '<div class="user-dropdown-email">' + (user.email || '') + '</div>',
      '<a href="estado-envio.html">Estado de envio</a>',
      '<button type="button" class="logout-btn" id="logoutBtn">Cerrar sesion</button>'
    ].join('');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.toggle('open');
      wrapper.classList.toggle('open', isOpen);
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('open');
      wrapper.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });

    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    const logoutBtn = dropdown.querySelector('#logoutBtn');
    logoutBtn.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      window.location.href = 'index.html';
    });

    wrapper.appendChild(btn);
    wrapper.appendChild(dropdown);
    return wrapper;
  }

  function setAuthUiState(state) {
    if (!document.body) return;

    document.body.classList.toggle('auth-guest-ready', state === 'guest');
    document.body.classList.toggle('auth-user-ready', state === 'user');
  }

  function setGuestState(actionsEl) {
    const ingresar = actionsEl.querySelector('.btn-ingresar');
    const registro = actionsEl.querySelector('.btn-registro');
    const userMenu = actionsEl.querySelector('.user-menu');

    if (ingresar) ingresar.classList.remove('auth-hidden');
    if (registro) registro.classList.remove('auth-hidden');
    if (userMenu) userMenu.remove();
    setAuthUiState('guest');
  }

  function setLoggedState(actionsEl, user, supabaseClient) {
    const ingresar = actionsEl.querySelector('.btn-ingresar');
    const registro = actionsEl.querySelector('.btn-registro');
    const existing = actionsEl.querySelector('.user-menu');

    if (ingresar) ingresar.classList.add('auth-hidden');
    if (registro) registro.classList.add('auth-hidden');
    if (existing) existing.remove();

    const cart = actionsEl.querySelector('.cart-link');
    const menu = createUserMenu(user, supabaseClient);

    if (cart) {
      actionsEl.insertBefore(menu, cart);
    } else {
      actionsEl.appendChild(menu);
    }

    setAuthUiState('user');
  }

  async function initAuthHeader() {
    const actionsEl = document.querySelector('.header-actions');
    if (!actionsEl) return;

    setAuthUiState('pending');

    try {
      await loadSupabaseSdk();

      if (typeof window.supabase === 'undefined') {
        return;
      }

      const supabaseClient = getSupabaseClient();
      if (!supabaseClient) {
        setGuestState(actionsEl);
        return;
      }
      const { data } = await supabaseClient.auth.getSession();
      const user = data && data.session ? data.session.user : null;

      if (user) {
        setLoggedState(actionsEl, user, supabaseClient);
      } else {
        setGuestState(actionsEl);
      }

      supabaseClient.auth.onAuthStateChange((_event, session) => {
        const currentUser = session ? session.user : null;
        if (currentUser) {
          setLoggedState(actionsEl, currentUser, supabaseClient);
        } else {
          setGuestState(actionsEl);
        }
      });
    } catch (_err) {
      // Si auth no carga, se muestra estado invitado para no bloquear acceso.
      setGuestState(actionsEl);
    }
  }

  document.addEventListener('DOMContentLoaded', initAuthHeader);
})();
