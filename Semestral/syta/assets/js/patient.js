/* =========================================================
   Syta · Panel del paciente: inicio, historial y perfil
   (Las vistas siempre enlazan eventos a un nodo raíz propio,
   nunca al contenedor #content, para no acumular listeners.)
   ========================================================= */
'use strict';

const PatientViews = {
  statCard(icon, color, value, label) {
    return `<div class="card stat"><div class="stat__icon stat__icon--${color}"><i data-lucide="${icon}"></i></div>
      <div><div class="stat__value">${value}</div><div class="stat__label">${label}</div></div></div>`;
  },

  /* ---------- Inicio ---------- */
  async home(c) {
    const s = App.session;
    const [all, notifs] = await Promise.all([
      AppointmentService.list({ patientId: s.refId }),
      NotificationService.list(s.refId, 5)
    ]);
    const upcoming = all.filter((a) => a.isUpcoming);
    const history = all.filter((a) => !a.isUpcoming).reverse();
    const next = upcoming[0];
    const count = (st) => all.filter((a) => a.status === st).length;

    c.innerHTML = `
      <div class="stack" id="view">
        <section class="hero">
          <div>
            <h2>${Utils.greeting()}, ${Utils.escapeHTML(s.name.split(' ')[0])} 👋</h2>
            <p>${upcoming.length ? `Tienes ${Utils.plural(upcoming.length, 'cita próxima', 'citas próximas')}. Aquí puedes revisar tu agenda y reservar nuevas consultas.` : 'No tienes citas próximas. Reserva una consulta con nuestros especialistas en pocos pasos.'}</p>
            <div class="hero__actions">
              <button type="button" class="btn btn--white" data-go="reservar"><i data-lucide="calendar-plus"></i>Reservar cita</button>
              <button type="button" class="btn btn--ghost-light" data-go="mis-citas"><i data-lucide="calendar-check"></i>Ver mis citas</button>
            </div>
          </div>
          ${next ? `
          <div class="hero__next">
            <small>Próxima cita · ${Utils.relativeDay(next.date)}</small>
            <strong>${Utils.escapeHTML(next.professionalName)}</strong>
            <span><i data-lucide="${next.specialtyIcon}"></i>${next.specialtyName}</span>
            <span><i data-lucide="calendar"></i>${Utils.formatDateLong(next.date)}</span>
            <span><i data-lucide="clock"></i>${Utils.formatTime(next.time)}</span>
          </div>` : ''}
        </section>

        <div class="grid grid-4">
          ${this.statCard('calendar-clock', 'teal', upcoming.length, 'Próximas citas')}
          ${this.statCard('check-circle-2', 'green', count('confirmada'), 'Citas confirmadas')}
          ${this.statCard('x-circle', 'red', count('cancelada'), 'Citas canceladas')}
          ${this.statCard('clipboard-check', 'indigo', count('atendida'), 'Citas atendidas')}
        </div>

        <div class="grid grid-main">
          <section class="card">
            <div class="card__head">
              <div><h3 class="card__title"><i data-lucide="calendar-clock"></i>Próximas citas</h3><p class="card__subtitle">Tus citas confirmadas más cercanas</p></div>
              <button type="button" class="btn btn--ghost btn--sm" data-go="mis-citas">Ver todas<i data-lucide="arrow-right"></i></button>
            </div>
            <div class="list">
              ${upcoming.length ? upcoming.slice(0, 4).map((a) => AppointmentUI.listItem(a)).join('')
                : Utils.emptyState('calendar-plus', 'Sin citas próximas', 'Reserva tu próxima consulta.', '<button type="button" class="btn btn--primary btn--sm" data-go="reservar">Reservar cita</button>')}
            </div>
          </section>

          <section class="card">
            <div class="card__head">
              <div><h3 class="card__title"><i data-lucide="bell"></i>Notificaciones</h3><p class="card__subtitle">Avisos recientes (simulados)</p></div>
            </div>
            <div class="activity">
              ${notifs.length ? notifs.map((n) => `
                <div class="activity-item">
                  <div class="notif-item__icon notif-item__icon--${n.type}"><i data-lucide="${NotificationsUI.ICONS[n.type] || 'bell'}"></i></div>
                  <div><strong>${Utils.escapeHTML(n.title)}</strong><p>${Utils.escapeHTML(n.message)}</p><time>${Utils.timeAgo(n.createdAt)}</time></div>
                </div>`).join('') : Utils.emptyState('bell-off', 'Sin notificaciones', 'Aquí verás confirmaciones y recordatorios.')}
            </div>
          </section>
        </div>

        <section class="card">
          <div class="card__head">
            <div><h3 class="card__title"><i data-lucide="history"></i>Historial reciente</h3><p class="card__subtitle">Últimas citas atendidas o canceladas</p></div>
            <button type="button" class="btn btn--ghost btn--sm" data-go="historial">Ver historial<i data-lucide="arrow-right"></i></button>
          </div>
          ${history.length ? this.historyTable(history.slice(0, 5)) : Utils.emptyState('history', 'Sin historial', 'Aún no tienes citas pasadas.')}
        </section>
      </div>`;

    this.bindCommon(c.querySelector('#view'));
  },

  historyTable(items) {
    return `
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Código</th><th>Profesional</th><th>Especialidad</th><th>Fecha</th><th>Hora</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            ${items.map((a) => `
              <tr>
                <td><span class="code">${a.id}</span></td>
                <td><div class="cell-main"><div class="avatar avatar--sm" style="background:${a.specialtyColor}">${Utils.initials(a.professionalName)}</div><strong>${Utils.escapeHTML(a.professionalName)}</strong></div></td>
                <td>${a.specialtyName}</td>
                <td>${Utils.formatDate(a.date)}</td>
                <td>${Utils.formatTime(a.time)}</td>
                <td>${Utils.statusBadge(a.status)}</td>
                <td><div class="table-actions"><button type="button" class="icon-btn icon-btn--sm" data-detail="${a.id}" title="Ver detalles" aria-label="Ver detalles"><i data-lucide="eye"></i></button></div></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  bindCommon(root) {
    root.addEventListener('click', (e) => {
      const g = e.target.closest('[data-go]');
      if (g) Navigation.go(g.dataset.go);
    });
    AppointmentUI.bindActions(root);
  },

  /* ---------- Historial ---------- */
  async history(c) {
    const all = await AppointmentService.list({ patientId: App.session.refId, order: 'desc' });
    const past = all.filter((a) => !a.isUpcoming);
    const specs = await ProfessionalService.specialties();

    c.innerHTML = `
      <div class="stack" id="view">
        <div class="grid grid-3">
          ${this.statCard('history', 'teal', past.length, 'Citas en el historial')}
          ${this.statCard('clipboard-check', 'indigo', past.filter((a) => a.status === 'atendida').length, 'Consultas atendidas')}
          ${this.statCard('x-circle', 'red', past.filter((a) => a.status === 'cancelada').length, 'Citas canceladas')}
        </div>
        <section class="card">
          <div class="toolbar">
            <div class="field field--search"><label for="h-search">Buscar</label>
              <div class="input-icon"><i data-lucide="search"></i><input id="h-search" type="search" class="input" placeholder="Código o profesional"></div></div>
            <div class="field"><label for="h-status">Estado</label>
              <select id="h-status" class="input"><option value="">Todos</option><option value="atendida">Atendida</option><option value="cancelada">Cancelada</option><option value="confirmada">Confirmada (no asistida)</option></select></div>
            <div class="field"><label for="h-spec">Especialidad</label>
              <select id="h-spec" class="input"><option value="">Todas</option>${specs.map((s) => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
          </div>
          <p class="result-count" id="h-count"></p>
          <div id="h-table" class="mt-8"></div>
        </section>
      </div>`;

    const root = c.querySelector('#view');
    const draw = () => {
      const q = root.querySelector('#h-search').value.trim().toLowerCase();
      const st = root.querySelector('#h-status').value;
      const sp = root.querySelector('#h-spec').value;
      const items = past.filter((a) => (!st || a.status === st) && (!sp || a.specialtyId === sp) &&
        (!q || a.id.toLowerCase().includes(q) || a.professionalName.toLowerCase().includes(q)));
      root.querySelector('#h-count').textContent = `${Utils.plural(items.length, 'cita encontrada', 'citas encontradas')}`;
      root.querySelector('#h-table').innerHTML = items.length ? this.historyTable(items)
        : Utils.emptyState('search-x', 'Sin resultados', 'No hay citas que coincidan con los filtros.');
      Utils.icons();
    };
    root.querySelector('#h-search').addEventListener('input', Utils.debounce(draw, 200));
    root.querySelector('#h-status').addEventListener('change', draw);
    root.querySelector('#h-spec').addEventListener('change', draw);
    this.bindCommon(root);
    draw();
  },

  /* ---------- Perfil ---------- */
  async profile(c) {
    const p = await PatientService.getById(App.session.refId);
    c.innerHTML = `
      <div class="grid grid-profile" id="view">
        <section class="card profile-card">
          <div class="avatar avatar--lg">${Utils.initials(p.name)}</div>
          <h3>${Utils.escapeHTML(p.name)}</h3>
          <p class="muted text-sm">Paciente · ${p.id}</p>
          <div class="profile-stats">
            <div><strong>${p.stats.total}</strong><small>Total</small></div>
            <div><strong>${p.stats.upcoming}</strong><small>Próximas</small></div>
            <div><strong>${p.stats.attended}</strong><small>Atendidas</small></div>
          </div>
          <ul class="info-list">
            <li><i data-lucide="mail"></i>${Utils.escapeHTML(p.email)}</li>
            <li><i data-lucide="phone"></i>${Utils.escapeHTML(p.phone)}</li>
            <li><i data-lucide="calendar-heart"></i>Paciente desde ${Utils.formatDate(p.createdAt.slice(0, 10))}</li>
            <li><i data-lucide="clock"></i>Última visita: ${p.stats.lastVisit ? Utils.formatDate(p.stats.lastVisit) : 'Sin visitas'}</li>
          </ul>
        </section>

        <section class="card">
          <div class="card__head"><div><h3 class="card__title"><i data-lucide="user-cog"></i>Datos personales</h3><p class="card__subtitle">Mantén tu información de contacto actualizada</p></div></div>
          <form id="profile-form" novalidate>
            <div class="form-grid">
              <div class="field span-2" data-field="name"><label for="pf-name">Nombre completo <span class="req">*</span></label><input id="pf-name" class="input" value="${Utils.escapeHTML(p.name)}"><p class="field-error"></p></div>
              <div class="field"><label for="pf-email">Correo electrónico</label><input id="pf-email" class="input" value="${Utils.escapeHTML(p.email)}" readonly><span class="field-hint">El correo es tu usuario y no puede modificarse.</span></div>
              <div class="field"><label for="pf-doc">Documento de identidad</label><input id="pf-doc" class="input" value="${Utils.escapeHTML(p.documentId)}" readonly></div>
              <div class="field" data-field="phone"><label for="pf-phone">Teléfono <span class="req">*</span></label><input id="pf-phone" class="input" value="${Utils.escapeHTML(p.phone)}"><p class="field-error"></p></div>
              <div class="field" data-field="birthdate"><label for="pf-birth">Fecha de nacimiento</label><input id="pf-birth" type="date" class="input" value="${p.birthdate || ''}" max="${Utils.todayISO()}"><p class="field-error"></p></div>
              <div class="field span-2"><label for="pf-address">Dirección</label><input id="pf-address" class="input" value="${Utils.escapeHTML(p.address || '')}"></div>
            </div>
            <div class="form-actions">
              <button type="reset" class="btn btn--ghost"><i data-lucide="rotate-ccw"></i>Descartar cambios</button>
              <button type="submit" class="btn btn--primary"><i data-lucide="save"></i>Guardar cambios</button>
            </div>
          </form>
        </section>
      </div>`;

    const form = c.querySelector('#profile-form');
    form.addEventListener('reset', () => {
      form.querySelectorAll('.field').forEach((f) => { f.classList.remove('has-error'); const e = f.querySelector('.field-error'); if (e) e.textContent = ''; });
      Toast.info('Se descartaron los cambios no guardados.');
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      form.querySelectorAll('.field').forEach((f) => { f.classList.remove('has-error'); const er = f.querySelector('.field-error'); if (er) er.textContent = ''; });
      try {
        const updated = await PatientService.update(p.id, {
          name: form.querySelector('#pf-name').value,
          phone: form.querySelector('#pf-phone').value,
          birthdate: form.querySelector('#pf-birth').value,
          address: form.querySelector('#pf-address').value
        });
        App.session.name = updated.name;
        localStorage.setItem(AuthService.SESSION_KEY, JSON.stringify(App.session));
        App.renderUserChip();
        Toast.success('Tus datos fueron actualizados.');
        Navigation.refresh();
      } catch (err) {
        FormUtils.showErrors(form, err.fields);
        Toast.error(err.message);
      }
    });
  }
};

/* ---------- Ayudas para formularios ---------- */
const FormUtils = {
  showErrors(form, fields = {}) {
    Object.entries(fields || {}).forEach(([key, msg]) => {
      const f = form.querySelector(`[data-field="${key}"]`);
      if (!f) return;
      f.classList.add('has-error');
      const e = f.querySelector('.field-error');
      if (e) e.textContent = msg;
    });
  },
  clearErrors(form) {
    form.querySelectorAll('.field').forEach((f) => {
      f.classList.remove('has-error');
      const e = f.querySelector('.field-error');
      if (e) e.textContent = '';
    });
  }
};
