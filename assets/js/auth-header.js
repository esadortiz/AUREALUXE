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

  function initMobileMenu() {
    const header = document.querySelector('header');
    const nav = header ? header.querySelector('nav') : null;
    const actionsEl = header ? header.querySelector('.header-actions') : null;

    if (!header || !nav || !actionsEl) return;
    if (header.querySelector('.mobile-menu-toggle')) return;

    const navLinks = Array.from(nav.querySelectorAll('a'));
    if (!navLinks.length) return;
    const ingresarLink = actionsEl.querySelector('.btn-ingresar');
    const registroLink = actionsEl.querySelector('.btn-registro');

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'mobile-menu-toggle';
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-label', 'Abrir menu de navegacion');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.innerHTML = [
      '<span class="mobile-menu-line"></span>',
      '<span class="mobile-menu-line"></span>',
      '<span class="mobile-menu-line"></span>'
    ].join('');

    const panel = document.createElement('aside');
    panel.className = 'mobile-menu-panel';
    panel.setAttribute('aria-hidden', 'true');

    const panelTitle = document.createElement('p');
    panelTitle.className = 'mobile-menu-title';
    panelTitle.textContent = 'Categorias';

    const list = document.createElement('ul');
    list.className = 'mobile-menu-list';

    navLinks.forEach((link) => {
      const item = document.createElement('li');
      const cloned = link.cloneNode(true);
      cloned.classList.add('mobile-menu-link');
      item.appendChild(cloned);
      list.appendChild(item);
    });

    if (ingresarLink || registroLink) {
      const accountTitle = document.createElement('p');
      accountTitle.className = 'mobile-menu-title mobile-menu-title-account';
      accountTitle.textContent = 'Cuenta';
      panel.appendChild(accountTitle);

      const accountList = document.createElement('ul');
      accountList.className = 'mobile-menu-list';

      [ingresarLink, registroLink].forEach((link) => {
        if (!link) return;
        const item = document.createElement('li');
        const cloned = link.cloneNode(true);
        cloned.classList.remove('auth-hidden');
        cloned.classList.add('mobile-menu-link', 'mobile-auth-link');
        item.appendChild(cloned);
        accountList.appendChild(item);
      });

      panel.appendChild(accountList);
    }

    panel.insertBefore(panelTitle, panel.firstChild);
    panel.insertBefore(list, panel.children[1] || null);

    const backdrop = document.createElement('div');
    backdrop.className = 'mobile-menu-backdrop';

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
    actionsEl.appendChild(toggleBtn);

    function setHeaderHeightVar() {
      const headerHeight = header.offsetHeight || 58;
      document.documentElement.style.setProperty('--mobile-header-height', headerHeight + 'px');
    }

    function closeMenu() {
      document.body.classList.remove('mobile-menu-open');
      toggleBtn.classList.remove('is-open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      panel.setAttribute('aria-hidden', 'true');
    }

    function openMenu() {
      document.body.classList.add('mobile-menu-open');
      toggleBtn.classList.add('is-open');
      toggleBtn.setAttribute('aria-expanded', 'true');
      panel.setAttribute('aria-hidden', 'false');
    }

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (document.body.classList.contains('mobile-menu-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    backdrop.addEventListener('click', closeMenu);

    panel.querySelectorAll('a').forEach((menuLink) => {
      menuLink.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });

    window.addEventListener('resize', () => {
      setHeaderHeightVar();
      if (window.innerWidth > 768) {
        closeMenu();
      }
    });

    setHeaderHeightVar();
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

  document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initAuthHeader();
  });
})();
