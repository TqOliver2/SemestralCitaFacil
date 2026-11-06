/* =========================================================
   Syta · Panel administrativo: dashboard, agenda, pacientes,
   reportes y cambio de estado de citas
   ========================================================= */
'use strict';

const AdminViews = {
  agendaFilters: { date: '', professionalId: '', specialtyId: '', status: '', search: '' },

  /* ---------- Dashboard ---------- */
  async dashboard(c) {
    const today = Utils.todayISO();
    const [stats, pros, todayList, upcoming, notifs] = await Promise.all([
      AppointmentService.stats(),
      ProfessionalService.list(),
      AppointmentService.list({ date: today }),
      AppointmentService.list({ dateFrom: Utils.addDays(today, 1), status: 'confirmada' }),
      NotificationService.list('admin', 6)
    ]);
    const active = pros.filter((p) => p.status === 'activo').length;
    const todayActive = todayList.filter((a) => a.status !== 'cancelada');

    c.innerHTML = `
      <div class="stack" id="view">
        <section class="hero">
          <div>
            <h2>${Utils.greeting()}, ${Utils.escapeHTML(App.session.name.split(' ')[0])}</h2>
            <p>Hoy es ${Utils.formatDateLong(today).toLowerCase()}. Hay ${Utils.plural(todayActive.length, 'cita programada', 'citas programadas')} para hoy y ${Utils.plural(stats.upcoming, 'cita próxima', 'citas próximas')} en total.</p>
            <div class="hero__actions">
              <button type="button" class="btn btn--white" data-go="agenda" data-today="1"><i data-lucide="calendar-days"></i>Agenda de hoy</button>
              <button type="button" class="btn btn--ghost-light" data-go="reportes"><i data-lucide="bar-chart-3"></i>Ver reportes</button>
            </div>
          </div>
        </section>

        <div class="grid grid-4">
          ${PatientViews.statCard('calendar-range', 'teal', stats.total, 'Total de citas')}
          ${PatientViews.statCard('check-circle-2', 'green', stats.confirmada, 'Citas confirmadas')}
          ${PatientViews.statCard('x-circle', 'red', stats.cancelada, 'Citas canceladas')}
          ${PatientViews.statCard('stethoscope', 'violet', `${pros.length}<span class="text-sm muted" style="font-weight:600"> · ${active} activos</span>`, 'Total de profesionales')}
        </div>

        <div class="grid grid-main">
          <section class="card">
            <div class="card__head">
              <div><h3 class="card__title"><i data-lucide="calendar-check-2"></i>Agenda del día</h3><p class="card__subtitle">${Utils.formatDateLong(today)}</p></div>
              <button type="button" class="btn btn--ghost btn--sm" data-go="agenda" data-today="1">Abrir agenda<i data-lucide="arrow-right"></i></button>
            </div>
            ${todayList.length ? `
            <div class="table-wrap"><table class="table">
              <thead><tr><th>Hora</th><th>Paciente</th><th>Profesional</th><th>Estado</th><th></th></tr></thead>
              <tbody>${todayList.map((a) => `
                <tr>
                  <td><strong>${Utils.formatTime(a.time)}</strong></td>
                  <td><div class="cell-main"><div class="avatar avatar--sm">${Utils.initials(a.patientName)}</div><div><strong>${Utils.escapeHTML(a.patientName)}</strong><small>${a.id}</small></div></div></td>
                  <td><div class="cell-main"><div><strong>${Utils.escapeHTML(a.professionalName)}</strong><small>${a.specialtyName}</small></div></div></td>
                  <td>${Utils.statusBadge(a.status)}</td>
                  <td><div class="table-actions">
                    <button type="button" class="icon-btn icon-btn--sm" data-detail="${a.id}" title="Ver detalles" aria-label="Ver detalles"><i data-lucide="eye"></i></button>
                    <button type="button" class="icon-btn icon-btn--sm" data-status="${a.id}" title="Cambiar estado" aria-label="Cambiar estado"><i data-lucide="refresh-cw"></i></button>
                  </div></td>
                </tr>`).join('')}</tbody>
            </table></div>` : Utils.emptyState('calendar-off', 'Sin citas para hoy', 'No hay citas registradas en la fecha actual.')}
          </section>

          <section class="card">
            <div class="card__head"><div><h3 class="card__title"><i data-lucide="activity"></i>Resumen de actividad</h3><p class="card__subtitle">Últimos movimientos del sistema</p></div></div>
            <div class="activity">
              ${notifs.length ? notifs.map((n) => `
                <div class="activity-item">
                  <div class="notif-item__icon notif-item__icon--${n.type}"><i data-lucide="${NotificationsUI.ICONS[n.type] || 'bell'}"></i></div>
                  <div><strong>${Utils.escapeHTML(n.title)}</strong><p>${Utils.escapeHTML(n.message)}</p><time>${Utils.timeAgo(n.createdAt)}</time></div>
                </div>`).join('') : Utils.emptyState('activity', 'Sin actividad', 'Aquí aparecerán reservas y cancelaciones.')}
            </div>
          </section>
        </div>

        <div class="grid grid-main">
          <section class="card">
            <div class="card__head">
              <div><h3 class="card__title"><i data-lucide="calendar-clock"></i>Próximas citas</h3><p class="card__subtitle">Citas confirmadas a partir de mañana</p></div>
              <button type="button" class="btn btn--ghost btn--sm" data-go="agenda">Ver todas<i data-lucide="arrow-right"></i></button>
            </div>
            <div class="list">${upcoming.length ? upcoming.slice(0, 6).map((a) => AppointmentUI.listItem(a, { showPatient: true })).join('')
              : Utils.emptyState('calendar-clock', 'Sin próximas citas', 'No hay citas confirmadas próximamente.')}</div>
          </section>
          <section class="card">
            <div class="card__head"><div><h3 class="card__title"><i data-lucide="pie-chart"></i>Estado de las citas</h3><p class="card__subtitle">Distribución general</p></div></div>
            ${this.statusBreakdown(stats)}
            <div class="bar-list mt-24">${this.specialtyBars(await AppointmentService.list({}), 'Citas por especialidad')}</div>
          </section>
        </div>
      </div>`;

    const root = c.querySelector('#view');
    root.addEventListener('click', (e) => {
      const g = e.target.closest('[data-go]');
      if (!g) return;
      if (g.dataset.today) this.agendaFilters = { date: Utils.todayISO(), professionalId: '', specialtyId: '', status: '', search: '' };
      Navigation.go(g.dataset.go);
    });
    AppointmentUI.bindActions(root);
  },

  statusBreakdown(stats) {
    const total = stats.total || 1;
    const parts = ['confirmada', 'atendida', 'cancelada'];
    return `
      <div class="stack-bar">${parts.map((p) => `<span style="width:${(stats[p] / total) * 100}%;background:${Utils.STATUS[p].color}" title="${Utils.STATUS[p].label}: ${stats[p]}"></span>`).join('')}</div>
      <div class="legend-row">${parts.map((p) => `<div><i style="background:${Utils.STATUS[p].color}"></i>${Utils.STATUS[p].label}: <strong>${stats[p]}</strong> (${Math.round((stats[p] / total) * 100)}%)</div>`).join('')}</div>`;
  },

  specialtyBars(list, title) {
    const specs = Database.table('specialties');
    const counts = specs.map((s) => ({ s, n: list.filter((a) => a.specialtyId === s.id).length }));
    const max = Math.max(1, ...counts.map((x) => x.n));
    return `${title ? `<p class="label">${title}</p>` : ''}${counts.map(({ s, n }) => `
      <div class="bar-row">
        <div class="bar-row__top"><span>${s.name}</span><small>${n}</small></div>
        <div class="bar-track"><div class="bar-fill" style="width:${(n / max) * 100}%;background:${s.color}"></div></div>
      </div>`).join('')}`;
  },

  /* ---------- Agenda de citas ---------- */
  async agenda(c) {
    const [pros, specs] = await Promise.all([ProfessionalService.list(), ProfessionalService.specialties()]);
    const f = this.agendaFilters;

    c.innerHTML = `
      <div class="stack" id="view">
        <section class="card">
          <div class="toolbar" style="margin-bottom:12px">
            <div class="field field--search"><label for="ag-search">Buscar</label>
              <div class="input-icon"><i data-lucide="search"></i><input id="ag-search" type="search" class="input" placeholder="Código, paciente o profesional" value="${Utils.escapeHTML(f.search)}"></div></div>
            <div class="field"><label for="ag-date">Fecha</label><input id="ag-date" type="date" class="input" value="${f.date}"></div>
            <div class="field"><label for="ag-pro">Profesional</label>
              <select id="ag-pro" class="input"><option value="">Todos</option>${pros.map((p) => `<option value="${p.id}" ${f.professionalId === p.id ? 'selected' : ''}>${Utils.escapeHTML(p.name)}</option>`).join('')}</select></div>
            <div class="field"><label for="ag-spec">Especialidad</label>
              <select id="ag-spec" class="input"><option value="">Todas</option>${specs.map((s) => `<option value="${s.id}" ${f.specialtyId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}</select></div>
            <div class="field"><label for="ag-status">Estado</label>
              <select id="ag-status" class="input"><option value="">Todos</option>${AppointmentService.STATUSES.map((s) => `<option value="${s}" ${f.status === s ? 'selected' : ''}>${Utils.STATUS[s].label}</option>`).join('')}</select></div>
          </div>
          <div class="between wrap">
            <div class="row wrap">
              <button type="button" class="btn btn--soft btn--sm" data-quick="today"><i data-lucide="calendar-check"></i>Hoy</button>
              <button type="button" class="btn btn--soft btn--sm" data-quick="tomorrow"><i data-lucide="calendar-plus"></i>Mañana</button>
              <button type="button" class="btn btn--ghost btn--sm" data-quick="clear"><i data-lucide="filter-x"></i>Limpiar filtros</button>
            </div>
            <p class="result-count" id="ag-count"></p>
          </div>
        </section>
        <section class="card" id="ag-result"></section>
      </div>`;

    const root = c.querySelector('#view');
    const read = () => {
      this.agendaFilters = {
        search: root.querySelector('#ag-search').value,
        date: root.querySelector('#ag-date').value,
        professionalId: root.querySelector('#ag-pro').value,
        specialtyId: root.querySelector('#ag-spec').value,
        status: root.querySelector('#ag-status').value
      };
    };
    const draw = async () => {
      read();
      const list = await AppointmentService.list(this.agendaFilters);
      root.querySelector('#ag-count').textContent = Utils.plural(list.length, 'cita encontrada', 'citas encontradas');
      root.querySelector('#ag-result').innerHTML = list.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Código</th><th>Paciente</th><th>Profesional</th><th>Especialidad</th><th>Fecha</th><th>Hora</th><th>Estado</th><th style="text-align:right">Acciones</th></tr></thead>
          <tbody>${list.map((a) => `
            <tr>
              <td><span class="code">${a.id}</span></td>
              <td><div class="cell-main"><div class="avatar avatar--sm">${Utils.initials(a.patientName)}</div><div><strong>${Utils.escapeHTML(a.patientName)}</strong><small>${Utils.escapeHTML(a.patientPhone)}</small></div></div></td>
              <td>${Utils.escapeHTML(a.professionalName)}</td>
              <td><span class="badge badge--neutral" style="color:${a.specialtyColor}"><i data-lucide="${a.specialtyIcon}"></i>${a.specialtyName}</span></td>
              <td>${Utils.formatDate(a.date)}<br><small class="muted">${Utils.relativeDay(a.date)}</small></td>
              <td><strong>${Utils.formatTime(a.time)}</strong></td>
              <td>${Utils.statusBadge(a.status)}</td>
              <td><div class="table-actions">
                <button type="button" class="btn btn--secondary btn--sm" data-detail="${a.id}"><i data-lucide="eye"></i>Detalles</button>
                <button type="button" class="btn btn--soft btn--sm" data-status="${a.id}"><i data-lucide="refresh-cw"></i>Estado</button>
              </div></td>
            </tr>`).join('')}</tbody>
        </table></div>` : Utils.emptyState('calendar-search', 'No hay citas', 'No se encontraron citas con los filtros aplicados.');
      Utils.icons();
    };

    root.querySelector('#ag-search').addEventListener('input', Utils.debounce(draw, 200));
    ['#ag-date', '#ag-pro', '#ag-spec', '#ag-status'].forEach((s) => root.querySelector(s).addEventListener('change', draw));
    root.addEventListener('click', (e) => {
      const q = e.target.closest('[data-quick]');
      if (!q) return;
      const dateInput = root.querySelector('#ag-date');
      if (q.dataset.quick === 'today') dateInput.value = Utils.todayISO();
      if (q.dataset.quick === 'tomorrow') dateInput.value = Utils.addDays(Utils.todayISO(), 1);
      if (q.dataset.quick === 'clear') {
        root.querySelectorAll('#ag-search, #ag-date').forEach((i) => { i.value = ''; });
        root.querySelectorAll('select').forEach((s) => { s.value = ''; });
      }
      draw();
    });
    AppointmentUI.bindActions(root.querySelector('#ag-result'));
    await draw();
  },

  /* ---------- Cambio de estado ---------- */
  async changeStatus(id) {
    const a = await AppointmentService.getById(id);
    if (!a) return Toast.error('La cita no existe.');
    const desc = {
      confirmada: 'La cita está programada y el horario permanece reservado.',
      atendida: 'El paciente asistió y fue atendido por el profesional.',
      cancelada: 'La cita se anula y el horario queda libre para otros pacientes.'
    };
    Modal.open({
      title: 'Actualizar estado', subtitle: `${a.id} · ${Utils.escapeHTML(a.patientName)} · ${Utils.formatDate(a.date)} ${Utils.formatTime(a.time)}`,
      icon: 'refresh-cw', size: 'sm',
      body: `
        <div class="option-list">
          ${AppointmentService.STATUSES.map((s) => `
            <label class="option">
              <input type="radio" name="new-status" value="${s}" ${a.status === s ? 'checked' : ''}>
              <div><strong>${Utils.STATUS[s].label}</strong><small>${desc[s]}</small></div>
            </label>`).join('')}
        </div>`,
      actions: [
        { label: 'Cancelar', className: 'btn--ghost' },
        {
          label: 'Guardar estado', className: 'btn--primary', icon: 'save',
          onClick: async (m) => {
            const value = m.querySelector('input[name="new-status"]:checked').value;
            if (value === a.status) { Toast.info('La cita ya tiene ese estado.'); return; }
            try {
              await AppointmentService.updateStatus(a.id, value);
              Toast.success(`La cita ${a.id} ahora está ${Utils.STATUS[value].label.toLowerCase()}.`, 'Estado actualizado');
              App.afterChange();
            } catch (err) {
              Toast.error(err.message);
              return false;
            }
          }
        }
      ]
    });
  },

  /* ---------- Pacientes ---------- */
  async patients(c) {
    c.innerHTML = `
      <div class="stack" id="view">
        <section class="card">
          <div class="toolbar">
            <div class="field field--search"><label for="pt-search">Buscar paciente</label>
              <div class="input-icon"><i data-lucide="search"></i><input id="pt-search" type="search" class="input" placeholder="Nombre, correo, documento o código"></div></div>
            <div class="toolbar__spacer"></div>
            <p class="result-count" id="pt-count"></p>
          </div>
          <div id="pt-table"></div>
        </section>
      </div>`;
    const root = c.querySelector('#view');
    const draw = async () => {
      const list = await PatientService.list({ search: root.querySelector('#pt-search').value });
      root.querySelector('#pt-count').textContent = Utils.plural(list.length, 'paciente', 'pacientes');
      root.querySelector('#pt-table').innerHTML = list.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Paciente</th><th>Documento</th><th>Contacto</th><th>Citas</th><th>Próximas</th><th>Última visita</th><th></th></tr></thead>
          <tbody>${list.map((p) => `
            <tr>
              <td><div class="cell-main"><div class="avatar avatar--sm">${Utils.initials(p.name)}</div><div><strong>${Utils.escapeHTML(p.name)}</strong><small>${p.id}</small></div></div></td>
              <td>${Utils.escapeHTML(p.documentId)}</td>
              <td><div class="cell-main"><div><strong style="font-weight:500">${Utils.escapeHTML(p.email)}</strong><small>${Utils.escapeHTML(p.phone)}</small></div></div></td>
              <td><strong>${p.stats.total}</strong></td>
              <td>${p.stats.upcoming ? `<span class="badge badge--primary">${p.stats.upcoming}</span>` : '<span class="muted">0</span>'}</td>
              <td>${p.stats.lastVisit ? Utils.formatDate(p.stats.lastVisit) : '<span class="muted">—</span>'}</td>
              <td><div class="table-actions"><button type="button" class="btn btn--secondary btn--sm" data-patient="${p.id}"><i data-lucide="eye"></i>Ver</button></div></td>
            </tr>`).join('')}</tbody>
        </table></div>` : Utils.emptyState('user-search', 'Sin resultados', 'No se encontraron pacientes.');
      Utils.icons();
    };
    root.querySelector('#pt-search').addEventListener('input', Utils.debounce(draw, 200));
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-patient]');
      if (b) this.patientDetail(b.dataset.patient);
    });
    await draw();
  },

  async patientDetail(id) {
    const [p, appts] = await Promise.all([PatientService.getById(id), AppointmentService.list({ patientId: id, order: 'desc' })]);
    Modal.open({
      title: Utils.escapeHTML(p.name), subtitle: `${p.id} · Paciente desde ${Utils.formatDate(p.createdAt.slice(0, 10))}`, icon: 'user-round', size: 'lg',
      body: `
        <div class="detail-grid">
          <div class="detail-item"><span>Correo</span><strong>${Utils.escapeHTML(p.email)}</strong></div>
          <div class="detail-item"><span>Teléfono</span><strong>${Utils.escapeHTML(p.phone)}</strong></div>
          <div class="detail-item"><span>Documento</span><strong>${Utils.escapeHTML(p.documentId)}</strong></div>
          <div class="detail-item"><span>Fecha de nacimiento</span><strong>${p.birthdate ? Utils.formatDate(p.birthdate) : '—'}</strong></div>
          <div class="detail-item span-2"><span>Dirección</span><strong>${Utils.escapeHTML(p.address || '—')}</strong></div>
        </div>
        <div class="grid grid-4 mt-24" style="gap:10px">
          ${[['Total', p.stats.total], ['Próximas', p.stats.upcoming], ['Atendidas', p.stats.attended], ['Canceladas', p.stats.cancelled]]
            .map(([l, v]) => `<div class="preview-box" style="text-align:center;padding:12px"><strong style="font-size:1.3rem">${v}</strong><div class="text-xs muted">${l}</div></div>`).join('')}
        </div>
        <p class="label mt-24" style="margin-bottom:10px">Citas del paciente</p>
        <div class="list">${appts.length ? appts.map((a) => AppointmentUI.listItem(a)).join('') : '<p class="muted text-sm">Sin citas registradas.</p>'}</div>`,
      actions: [{ label: 'Cerrar', className: 'btn--primary' }],
      onOpen: (m) => AppointmentUI.bindActions(m.querySelector('.list'))
    });
  },

  /* ---------- Reportes ---------- */
  reportRange: null,

  async reports(c) {
    const today = Utils.todayISO();
    if (!this.reportRange) this.reportRange = { from: Utils.addDays(today, -30), to: Utils.addDays(today, 30) };
    const r = this.reportRange;

    c.innerHTML = `
      <div class="stack" id="view">
        <section class="card">
          <div class="toolbar" style="margin-bottom:0">
            <div class="field"><label for="rp-from">Desde</label><input id="rp-from" type="date" class="input" value="${r.from}"></div>
            <div class="field"><label for="rp-to">Hasta</label><input id="rp-to" type="date" class="input" value="${r.to}"></div>
            <div class="toolbar__spacer"></div>
            <button type="button" class="btn btn--secondary" id="rp-print"><i data-lucide="printer"></i>Imprimir</button>
            <button type="button" class="btn btn--primary" id="rp-csv"><i data-lucide="download"></i>Exportar CSV</button>
          </div>
          <p class="field-error mt-8" id="rp-error"></p>
        </section>
        <div id="rp-body" class="stack"></div>
      </div>`;

    const root = c.querySelector('#view');
    let current = [];
    const draw = async () => {
      const from = root.querySelector('#rp-from').value;
      const to = root.querySelector('#rp-to').value;
      const err = root.querySelector('#rp-error');
      if (from && to && from > to) { err.textContent = 'La fecha inicial no puede ser mayor que la final.'; return; }
      err.textContent = '';
      this.reportRange = { from, to };
      current = await AppointmentService.list({ dateFrom: from, dateTo: to });
      const stats = {
        total: current.length,
        confirmada: current.filter((a) => a.status === 'confirmada').length,
        atendida: current.filter((a) => a.status === 'atendida').length,
        cancelada: current.filter((a) => a.status === 'cancelada').length
      };
      const cancelRate = stats.total ? Math.round((stats.cancelada / stats.total) * 100) : 0;
      const pros = await ProfessionalService.list();
      const proCounts = pros.map((p) => ({ p, n: current.filter((a) => a.professionalId === p.id && a.status !== 'cancelada').length }))
        .sort((a, b) => b.n - a.n);
      const maxPro = Math.max(1, ...proCounts.map((x) => x.n));
      const hours = {};
      current.filter((a) => a.status !== 'cancelada').forEach((a) => { const h = a.time.slice(0, 2); hours[h] = (hours[h] || 0) + 1; });
      const hourKeys = Object.keys(hours).sort();
      const maxH = Math.max(1, ...Object.values(hours));

      root.querySelector('#rp-body').innerHTML = `
        <div class="grid grid-4">
          ${PatientViews.statCard('calendar-range', 'teal', stats.total, 'Citas en el periodo')}
          ${PatientViews.statCard('clipboard-check', 'indigo', stats.atendida, 'Citas atendidas')}
          ${PatientViews.statCard('check-circle-2', 'green', stats.confirmada, 'Pendientes (confirmadas)')}
          ${PatientViews.statCard('percent', 'red', `${cancelRate}%`, 'Tasa de cancelación')}
        </div>
        <div class="grid grid-2">
          <section class="card">
            <div class="card__head"><div><h3 class="card__title"><i data-lucide="pie-chart"></i>Citas por estado</h3><p class="card__subtitle">Distribución en el periodo seleccionado</p></div></div>
            ${this.statusBreakdown(stats)}
            <div class="bar-list mt-24">${this.specialtyBars(current, 'Citas por especialidad')}</div>
          </section>
          <section class="card">
            <div class="card__head"><div><h3 class="card__title"><i data-lucide="users-round"></i>Carga por profesional</h3><p class="card__subtitle">Citas activas (sin canceladas)</p></div></div>
            <div class="bar-list">${proCounts.map(({ p, n }) => `
              <div class="bar-row">
                <div class="bar-row__top"><span>${Utils.escapeHTML(p.name)} ${p.status === 'inactivo' ? '<span class="badge badge--neutral">Inactivo</span>' : ''}</span><small>${n}</small></div>
                <div class="bar-track"><div class="bar-fill" style="width:${(n / maxPro) * 100}%"></div></div>
              </div>`).join('')}</div>
          </section>
        </div>
        <section class="card">
          <div class="card__head"><div><h3 class="card__title"><i data-lucide="clock"></i>Horas con mayor demanda</h3><p class="card__subtitle">Número de citas por franja horaria</p></div></div>
          ${hourKeys.length ? `<div class="bar-list">${hourKeys.map((h) => `
            <div class="bar-row"><div class="bar-row__top"><span>${Utils.formatTime(h + ':00')} – ${Utils.formatTime(Utils.pad((+h + 1) % 24) + ':00')}</span><small>${hours[h]}</small></div>
            <div class="bar-track"><div class="bar-fill" style="width:${(hours[h] / maxH) * 100}%"></div></div></div>`).join('')}</div>`
            : Utils.emptyState('clock', 'Sin datos', 'No hay citas en el periodo seleccionado.')}
        </section>`;
      Utils.icons();
    };

    root.querySelector('#rp-from').addEventListener('change', draw);
    root.querySelector('#rp-to').addEventListener('change', draw);
    root.querySelector('#rp-print').addEventListener('click', () => window.print());
    root.querySelector('#rp-csv').addEventListener('click', () => {
      if (!current.length) return Toast.warning('No hay citas para exportar en este periodo.');
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const rows = [['Código', 'Paciente', 'Profesional', 'Especialidad', 'Fecha', 'Hora', 'Estado', 'Motivo']]
        .concat(current.map((a) => [a.id, a.patientName, a.professionalName, a.specialtyName, a.date, a.time, Utils.STATUS[a.status].label, a.reason]));
      Utils.download(`syta-citas_${this.reportRange.from || 'inicio'}_${this.reportRange.to || 'fin'}.csv`, rows.map((r) => r.map(esc).join(';')).join('\n'));
      Toast.success(`Se exportaron ${current.length} citas en formato CSV.`);
    });
    await draw();
  }
};
