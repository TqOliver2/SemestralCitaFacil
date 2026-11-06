/* =========================================================
   Syta · Navegación entre módulos según el rol
   ========================================================= */
'use strict';

const Navigation = {
  current: null,
  params: null,
  role: null,

  menus: {
    patient: [
      { id: 'inicio', label: 'Inicio', icon: 'layout-dashboard', subtitle: 'Resumen de tu actividad médica', render: (c, p) => PatientViews.home(c, p) },
      { id: 'reservar', label: 'Reservar cita', icon: 'calendar-plus', subtitle: 'Agenda una nueva cita en pocos pasos', render: (c, p) => BookingView.render(c, p) },
      { id: 'mis-citas', label: 'Mis citas', icon: 'calendar-check', subtitle: 'Consulta y gestiona tus citas', render: (c, p) => MyAppointmentsView.render(c, p) },
      { id: 'historial', label: 'Historial', icon: 'history', subtitle: 'Citas pasadas, atendidas y canceladas', render: (c, p) => PatientViews.history(c, p) },
      { id: 'perfil', label: 'Mi perfil', icon: 'user-round', subtitle: 'Tus datos personales y de contacto', render: (c, p) => PatientViews.profile(c, p) }
    ],
    admin: [
      { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', subtitle: 'Visión general de la clínica', render: (c, p) => AdminViews.dashboard(c, p) },
      { id: 'agenda', label: 'Agenda de citas', icon: 'calendar-days', subtitle: 'Consulta, filtra y gestiona las citas', render: (c, p) => AdminViews.agenda(c, p) },
      { id: 'horarios', label: 'Gestión de horarios', icon: 'clock', subtitle: 'Configura la disponibilidad de cada profesional', render: (c, p) => SchedulesView.render(c, p) },
      { id: 'profesionales', label: 'Profesionales', icon: 'stethoscope', subtitle: 'Equipo médico de la clínica', render: (c, p) => ProfessionalsView.render(c, p) },
      { id: 'pacientes', label: 'Pacientes', icon: 'users', subtitle: 'Pacientes registrados y su actividad', render: (c, p) => AdminViews.patients(c, p) },
      { id: 'reportes', label: 'Reportes', icon: 'bar-chart-3', subtitle: 'Indicadores y exportación de datos', render: (c, p) => AdminViews.reports(c, p) }
    ]
  },

  init() {
    const app = document.getElementById('app-view');
    document.getElementById('menu-toggle').addEventListener('click', () => app.classList.toggle('sidebar-open'));
    document.getElementById('sidebar-backdrop').addEventListener('click', () => app.classList.remove('sidebar-open'));
    document.getElementById('sidebar-nav').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-route]');
      if (btn) this.go(btn.dataset.route);
    });
    document.getElementById('logout-btn').addEventListener('click', () => App.logout());
  },

  setup(role) {
    this.role = role;
    this.current = null;
    document.getElementById('sidebar-nav').innerHTML = this.menus[role].map((m) => `
      <button type="button" class="nav-item" data-route="${m.id}"><i data-lucide="${m.icon}"></i>${m.label}</button>`).join('');
    Utils.icons();
  },

  async go(id, params = null) {
    const item = this.menus[this.role].find((m) => m.id === id) || this.menus[this.role][0];
    this.current = item.id;
    this.params = params;
    document.querySelectorAll('#sidebar-nav .nav-item').forEach((b) => b.classList.toggle('is-active', b.dataset.route === item.id));
    document.getElementById('page-title').textContent = item.label;
    document.getElementById('page-subtitle').textContent = item.subtitle;
    document.getElementById('app-view').classList.remove('sidebar-open');
    document.title = `${item.label} · Syta`;

    const content = document.getElementById('content');
    content.style.animation = 'none';
    void content.offsetWidth; // reinicia la animación de entrada
    content.style.animation = '';
    content.innerHTML = '';
    window.scrollTo({ top: 0 });
    await item.render(content, params || {});
    Utils.icons();
  },

  /** Vuelve a renderizar la vista actual (tras crear/cancelar/editar). */
  refresh() {
    if (this.current) return this.go(this.current, this.params);
  }
};
