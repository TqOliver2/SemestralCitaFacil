/* =========================================================
   Syta · Arranque de la aplicación, sesión y notificaciones
   ========================================================= */
'use strict';

/* ---------- Panel de notificaciones (topbar) ---------- */
const NotificationsUI = {
  ICONS: { success: 'calendar-check', danger: 'calendar-x', info: 'bell-ring', warning: 'alert-triangle' },

  init() {
    const dd = document.getElementById('notif-dropdown');
    document.getElementById('notif-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      dd.classList.toggle('is-open');
    });
    document.addEventListener('click', (e) => { if (!dd.contains(e.target)) dd.classList.remove('is-open'); });
    document.getElementById('notif-panel').addEventListener('click', async (e) => {
      const key = App.userKey();
      if (e.target.closest('[data-notif-read]')) {
        await NotificationService.markAllRead(key);
        this.refresh();
      } else if (e.target.closest('[data-notif-clear]')) {
        const ok = await Confirm({ title: '¿Vaciar notificaciones?', message: 'Se eliminarán todas tus notificaciones.', confirmText: 'Vaciar', icon: 'trash-2' });
        if (ok) { await NotificationService.clear(key); this.refresh(); Toast.info('Notificaciones eliminadas.'); }
      }
    });
  },

  itemHTML(n) {
    return `
      <div class="notif-item ${n.read ? '' : 'is-unread'}">
        <div class="notif-item__icon notif-item__icon--${n.type}"><i data-lucide="${this.ICONS[n.type] || 'bell'}"></i></div>
        <div style="flex:1;min-width:0">
          <strong>${Utils.escapeHTML(n.title)}</strong>
          <p>${Utils.escapeHTML(n.message)}</p>
          <time>${Utils.timeAgo(n.createdAt)}</time>
        </div>
        ${n.read ? '' : '<span class="unread-dot"></span>'}
      </div>`;
  },

  async refresh() {
    const key = App.userKey();
    const [items, unread] = await Promise.all([NotificationService.list(key, 20), NotificationService.unreadCount(key)]);
    const badge = document.getElementById('notif-count');
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.classList.toggle('hidden', unread === 0);
    document.getElementById('notif-panel').innerHTML = `
      <div class="notif-head">
        <h4>Notificaciones</h4>
        <div class="row">
          ${unread ? '<button type="button" class="link-btn text-sm" data-notif-read>Marcar leídas</button>' : ''}
          ${items.length ? '<button type="button" class="icon-btn icon-btn--sm icon-btn--danger" data-notif-clear title="Vaciar" aria-label="Vaciar notificaciones"><i data-lucide="trash-2"></i></button>' : ''}
        </div>
      </div>
      <div class="notif-list">
        ${items.length ? items.map((n) => this.itemHTML(n)).join('') : '<div class="notif-empty">No tienes notificaciones.</div>'}
      </div>`;
    Utils.icons();
  }
};

/* ---------- Aplicación ---------- */
const App = {
  session: null,

  init() {
    Database.load();
    Navigation.init();
    NotificationsUI.init();
    Auth.init();
    document.getElementById('topbar-date').textContent = Utils.formatDate(Utils.todayISO());

    const session = AuthService.current();
    if (session) this.enter(session);
    else this.showLogin();
  },

  userKey() {
    return this.session.role === 'admin' ? 'admin' : this.session.refId;
  },

  showLogin() {
    this.session = null;
    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('login-view').classList.remove('hidden');
    document.title = 'Iniciar sesión · Syta';
    Utils.icons();
  },

  enter(session) {
    this.session = session;
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
    const isAdmin = session.role === 'admin';
    document.getElementById('sidebar-tag').textContent = isAdmin ? 'Administración' : 'Portal del paciente';
    document.getElementById('sidebar-role').innerHTML = `
      <div class="avatar avatar--sm">${Utils.initials(session.name)}</div>
      <div><strong>${Utils.escapeHTML(session.name)}</strong><small>${isAdmin ? 'Administrador' : 'Paciente'}</small></div>`;
    this.renderUserChip();
    Navigation.setup(session.role);
    NotificationsUI.refresh();
    Navigation.go(isAdmin ? 'dashboard' : 'inicio');
  },

  renderUserChip() {
    const s = this.session;
    const isAdmin = s.role === 'admin';
    const inner = `
      <div class="avatar avatar--sm">${Utils.initials(s.name)}</div>
      <div class="user-chip__info"><strong>${Utils.escapeHTML(s.name)}</strong><small>${Utils.escapeHTML(s.position)}</small></div>`;
    document.getElementById('user-chip-slot').innerHTML = isAdmin
      ? `<div class="user-chip">${inner}</div>`
      : `<button type="button" class="user-chip" id="user-chip" title="Ir a mi perfil">${inner}</button>`;
    const chip = document.getElementById('user-chip');
    if (chip) chip.addEventListener('click', () => Navigation.go('perfil'));
    document.querySelector('#sidebar-role strong') && (document.querySelector('#sidebar-role strong').textContent = s.name);
  },

  async logout() {
    const ok = await Confirm({
      title: '¿Cerrar sesión?', message: 'Tendrás que volver a ingresar tus credenciales para acceder.',
      confirmText: 'Cerrar sesión', icon: 'log-out', variant: 'primary'
    });
    if (!ok) return;
    AuthService.logout();
    this.showLogin();
    Toast.info('Sesión cerrada correctamente.');
  },

  /** Actualiza indicadores globales tras cambios en los datos. */
  afterChange() {
    NotificationsUI.refresh();
    return Navigation.refresh();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
