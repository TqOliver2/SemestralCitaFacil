/* =========================================================
   Syta · Citas (UI): detalle, cancelación, reserva y "Mis citas"
   ========================================================= */
'use strict';

/* ---------- Componentes compartidos de citas ---------- */
const AppointmentUI = {
  dateBox(date, muted = false) {
    const d = Utils.parseISO(date);
    return `<div class="date-box ${muted ? 'date-box--muted' : ''}"><strong>${Utils.pad(d.getDate())}</strong><small>${Utils.MONTHS_SHORT[d.getMonth()]}</small></div>`;
  },

  /** Fila compacta para listas de dashboard. */
  listItem(a, { showPatient = false } = {}) {
    return `
      <div class="list-item">
        ${this.dateBox(a.date, !a.isUpcoming)}
        <div class="list-item__body">
          <strong>${Utils.escapeHTML(showPatient ? a.patientName : a.professionalName)}</strong>
          <div class="list-item__meta">
            <span><i data-lucide="${a.specialtyIcon}"></i>${a.specialtyName}</span>
            <span><i data-lucide="clock"></i>${Utils.formatTime(a.time)}</span>
            ${showPatient ? `<span><i data-lucide="user-round"></i>${Utils.escapeHTML(a.professionalName)}</span>` : `<span><i data-lucide="calendar"></i>${Utils.relativeDay(a.date)}</span>`}
          </div>
        </div>
        ${Utils.statusBadge(a.status)}
        <button type="button" class="icon-btn icon-btn--sm" data-detail="${a.id}" title="Ver detalles" aria-label="Ver detalles"><i data-lucide="eye"></i></button>
      </div>`;
  },

  /** Tarjeta completa para "Mis citas". */
  card(a) {
    return `
      <article class="appt-card ${a.status === 'cancelada' ? 'is-cancelled' : ''}">
        <div class="between">
          <span class="code">${a.id}</span>
          ${Utils.statusBadge(a.status)}
        </div>
        <div class="appt-card__pro">
          <div class="avatar" style="background:${a.specialtyColor}">${Utils.initials(a.professionalName)}</div>
          <div><strong>${Utils.escapeHTML(a.professionalName)}</strong><small>${a.specialtyName}</small></div>
        </div>
        <div class="appt-card__meta">
          <div><i data-lucide="calendar"></i>${Utils.formatDate(a.date)}</div>
          <div><i data-lucide="clock"></i>${Utils.formatTime(a.time)}</div>
        </div>
        <div class="appt-card__foot">
          <button type="button" class="btn btn--secondary btn--sm" data-detail="${a.id}"><i data-lucide="eye"></i>Ver detalles</button>
          ${a.canCancel ? `<button type="button" class="btn btn--soft-danger btn--sm" data-cancel="${a.id}"><i data-lucide="calendar-x"></i>Cancelar</button>` : ''}
        </div>
      </article>`;
  },

  /** Delegación de eventos comunes (ver detalle / cancelar) en un contenedor. */
  bindActions(container) {
    container.addEventListener('click', (e) => {
      const detail = e.target.closest('[data-detail]');
      const cancel = e.target.closest('[data-cancel]');
      const status = e.target.closest('[data-status]');
      if (detail) this.showDetail(detail.dataset.detail);
      else if (cancel) this.cancelFlow(cancel.dataset.cancel);
      else if (status) AdminViews.changeStatus(status.dataset.status);
    });
  },

  async showDetail(id) {
    const a = await AppointmentService.getById(id);
    if (!a) return Toast.error('La cita no existe.');
    const isAdmin = App.session.role === 'admin';
    const actions = [{ label: 'Cerrar', className: 'btn--ghost' }];
    if (isAdmin) {
      actions.push({ label: 'Cambiar estado', className: 'btn--primary', icon: 'refresh-cw', onClick: () => { AdminViews.changeStatus(a.id); return false; } });
    } else if (a.canCancel) {
      actions.push({ label: 'Cancelar cita', className: 'btn--soft-danger', icon: 'calendar-x', onClick: () => { this.cancelFlow(a.id); return false; } });
    }
    Modal.open({
      title: 'Detalle de la cita', subtitle: `Registrada el ${Utils.formatDateTime(a.createdAt)}`, icon: 'calendar-search', size: 'md',
      body: `
        <div class="detail-head"><span class="code">${a.id}</span>${Utils.statusBadge(a.status)}</div>
        <div class="detail-grid">
          <div class="detail-item"><span>Paciente</span><strong>${Utils.escapeHTML(a.patientName)}</strong></div>
          <div class="detail-item"><span>Contacto</span><strong>${Utils.escapeHTML(a.patientPhone || '—')}</strong></div>
          <div class="detail-item"><span>Profesional</span><strong>${Utils.escapeHTML(a.professionalName)}</strong></div>
          <div class="detail-item"><span>Especialidad</span><strong>${a.specialtyName}</strong></div>
          <div class="detail-item"><span>Fecha</span><strong>${Utils.formatDateLong(a.date)}</strong></div>
          <div class="detail-item"><span>Hora</span><strong>${Utils.formatTime(a.time)}</strong></div>
          <div class="detail-item span-2"><span>Motivo de la consulta</span><strong>${Utils.escapeHTML(a.reason || 'No especificado')}</strong></div>
          ${a.status === 'cancelada' && a.cancelledAt ? `<div class="detail-item span-2"><span>Cancelación</span><strong>${Utils.formatDateTime(a.cancelledAt)} · por ${a.cancelledBy === 'admin' ? 'la clínica' : 'el paciente'}</strong></div>` : ''}
        </div>
        ${a.status === 'confirmada' ? `<div class="alert alert--primary mt-16"><i data-lucide="mail-check"></i><span>Se generó una notificación de confirmación para el paciente (simulada, sin envío de correo).</span></div>` : ''}`,
      actions
    });
  },

  async cancelFlow(id) {
    const a = await AppointmentService.getById(id);
    if (!a) return;
    const ok = await Confirm({
      title: '¿Cancelar esta cita?',
      message: `Se cancelará la cita <strong>${a.id}</strong> con ${Utils.escapeHTML(a.professionalName)} del ${Utils.formatDate(a.date)} a las ${Utils.formatTime(a.time)}. El horario quedará disponible para otros pacientes.`,
      confirmText: 'Sí, cancelar cita', cancelText: 'Mantener cita', icon: 'calendar-x'
    });
    if (!ok) return;
    try {
      await AppointmentService.cancel(id, { by: App.session.role === 'admin' ? 'admin' : 'patient' });
      Toast.success(`La cita ${id} fue cancelada y el horario fue liberado.`, 'Cita cancelada');
      App.afterChange();
    } catch (err) {
      Toast.error(err.message);
    }
  }
};

/* ---------- Reserva de citas ---------- */
const BookingView = {
  state: null,
  pros: [],
  specialties: [],
  c: null,

  async render(c, params = {}) {
    this.c = c;
    this.state = { specialtyId: null, professionalId: null, date: null, time: null };
    [this.specialties, this.pros] = await Promise.all([ProfessionalService.specialties(), ProfessionalService.list({ status: 'activo' })]);

    c.innerHTML = `
      <div class="booking">
        <div class="booking__main">
          <section class="card step" id="step-1">
            <header class="step__head"><span class="step__num">1</span><div><h3>Especialidad médica</h3><p>Selecciona el área en la que necesitas atención</p></div></header>
            <div class="spec-grid">
              ${this.specialties.map((s) => {
                const n = this.pros.filter((p) => p.specialtyId === s.id).length;
                return `<button type="button" class="spec-card" data-spec="${s.id}" style="--c:${s.color}" ${n ? '' : 'disabled'}>
                  <span class="spec-card__icon"><i data-lucide="${s.icon}"></i></span>
                  <strong>${s.name}</strong><small>${n ? Utils.plural(n, 'profesional', 'profesionales') : 'Sin disponibilidad'}</small>
                </button>`;
              }).join('')}
            </div>
            <p class="field-error mt-8" data-error="specialty"></p>
          </section>

          <section class="card step is-locked" id="step-2">
            <header class="step__head"><span class="step__num">2</span><div><h3>Profesional</h3><p>Elige al médico que te atenderá</p></div></header>
            <div class="pro-select" id="pro-list"><p class="muted text-sm">Primero selecciona una especialidad.</p></div>
            <p class="field-error mt-8" data-error="professional"></p>
          </section>

          <section class="card step is-locked" id="step-3">
            <header class="step__head"><span class="step__num">3</span><div><h3>Fecha</h3><p>Próximos días de atención del profesional</p></div></header>
            <div class="date-strip" id="date-strip"></div>
            <div class="field" style="max-width:280px">
              <label for="date-input">O elige otra fecha</label>
              <input type="date" id="date-input" class="input" min="${Utils.todayISO()}" max="${Utils.addDays(Utils.todayISO(), 90)}">
            </div>
            <p class="field-error mt-8" data-error="date"></p>
          </section>

          <section class="card step is-locked" id="step-4">
            <header class="step__head"><span class="step__num">4</span><div><h3>Horario</h3><p>Los horarios ocupados no se pueden seleccionar</p></div></header>
            <div class="slot-legend">
              <span class="legend-item"><i class="legend-free"></i>Disponible</span>
              <span class="legend-item"><i class="legend-selected"></i>Seleccionado</span>
              <span class="legend-item"><i class="legend-busy"></i>Ocupado</span>
              <span class="legend-item"><i class="legend-past"></i>No disponible</span>
            </div>
            <div class="slot-grid" id="slot-grid"><p class="muted text-sm">Selecciona una fecha para ver los horarios.</p></div>
            <p class="field-error mt-8" data-error="time"></p>
          </section>

          <section class="card step is-locked" id="step-5">
            <header class="step__head"><span class="step__num">5</span><div><h3>Motivo de la consulta <span class="muted text-sm">(opcional)</span></h3><p>Ayuda al profesional a preparar tu atención</p></div></header>
            <div class="field">
              <textarea id="reason" class="input" maxlength="200" placeholder="Ej.: Control general, dolor de cabeza frecuente…"></textarea>
              <span class="field-hint" id="reason-count">0 / 200</span>
            </div>
          </section>
        </div>

        <aside class="booking__aside"><div class="card summary" id="summary"></div></aside>
      </div>`;

    this.bind();
    this.renderSummary();

    if (params.professionalId) {
      const pro = this.pros.find((p) => p.id === params.professionalId);
      if (pro) { this.selectSpecialty(pro.specialtyId); this.selectProfessional(pro.id); }
    }
    Utils.icons();
  },

  bind() {
    const c = this.c;
    c.querySelector('.spec-grid').addEventListener('click', (e) => {
      const b = e.target.closest('[data-spec]');
      if (b) this.selectSpecialty(b.dataset.spec);
    });
    c.querySelector('#pro-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pro]');
      if (b) this.selectProfessional(b.dataset.pro);
    });
    c.querySelector('#date-strip').addEventListener('click', (e) => {
      const b = e.target.closest('[data-date]');
      if (b) this.selectDate(b.dataset.date);
    });
    c.querySelector('#date-input').addEventListener('change', (e) => { if (e.target.value) this.selectDate(e.target.value); });
    c.querySelector('#slot-grid').addEventListener('click', (e) => {
      const b = e.target.closest('[data-time]');
      if (b && !b.disabled) this.selectTime(b.dataset.time);
    });
    const reason = c.querySelector('#reason');
    reason.addEventListener('input', () => { c.querySelector('#reason-count').textContent = `${reason.value.length} / 200`; });
    c.querySelector('#summary').addEventListener('click', (e) => {
      if (e.target.closest('#confirm-booking')) this.confirm();
      if (e.target.closest('#reset-booking')) this.render(this.c);
    });
  },

  setError(key, msg) {
    const el = this.c.querySelector(`[data-error="${key}"]`);
    if (el) el.innerHTML = msg ? `<i data-lucide="alert-circle"></i>${msg}` : '';
    Utils.icons();
  },

  setStep(n, { locked, done }) {
    const el = this.c.querySelector(`#step-${n}`);
    if (locked !== undefined) el.classList.toggle('is-locked', locked);
    if (done !== undefined) el.classList.toggle('is-done', done);
  },

  selectSpecialty(id) {
    Object.assign(this.state, { specialtyId: id, professionalId: null, date: null, time: null });
    this.c.querySelectorAll('[data-spec]').forEach((b) => b.classList.toggle('is-selected', b.dataset.spec === id));
    this.setError('specialty', '');
    this.setStep(1, { done: true });
    this.setStep(2, { locked: false, done: false });
    [3, 4, 5].forEach((n) => this.setStep(n, { locked: true, done: false }));
    const list = this.pros.filter((p) => p.specialtyId === id);
    this.c.querySelector('#pro-list').innerHTML = list.map((p) => `
      <button type="button" class="pro-option" data-pro="${p.id}">
        <div class="avatar" style="background:${p.specialty.color}">${Utils.initials(p.name)}</div>
        <div>
          <strong>${Utils.escapeHTML(p.name)}</strong>
          <small><i data-lucide="calendar-days"></i>${Utils.daysSummary(p.schedule.days)}</small>
          <small><i data-lucide="clock"></i>${Utils.formatTime(p.schedule.start)} – ${Utils.formatTime(p.schedule.end)} · ${p.schedule.interval} min</small>
        </div>
      </button>`).join('');
    this.c.querySelector('#date-strip').innerHTML = '';
    this.c.querySelector('#date-input').value = '';
    this.c.querySelector('#slot-grid').innerHTML = '<p class="muted text-sm">Selecciona una fecha para ver los horarios.</p>';
    this.renderSummary();
    Utils.icons();
  },

  async selectProfessional(id) {
    Object.assign(this.state, { professionalId: id, date: null, time: null });
    this.c.querySelectorAll('[data-pro]').forEach((b) => b.classList.toggle('is-selected', b.dataset.pro === id));
    this.setError('professional', '');
    this.setStep(2, { done: true });
    this.setStep(3, { locked: false, done: false });
    [4, 5].forEach((n) => this.setStep(n, { locked: true, done: false }));
    this.c.querySelector('#date-input').value = '';
    this.c.querySelector('#slot-grid').innerHTML = '<p class="muted text-sm">Selecciona una fecha para ver los horarios.</p>';
    this.renderSummary();
    await this.renderDates();
  },

  async renderDates() {
    const pro = this.pros.find((p) => p.id === this.state.professionalId);
    const dates = [];
    let d = Utils.todayISO();
    for (let i = 0; i < 45 && dates.length < 10; i++, d = Utils.addDays(d, 1)) {
      if (ScheduleService.worksOn(pro, d)) dates.push(d);
    }
    const avail = await Promise.all(dates.map((date) => AppointmentService.getAvailability(pro.id, date)));
    this.c.querySelector('#date-strip').innerHTML = dates.map((date, i) => {
      const dt = Utils.parseISO(date);
      const free = avail[i].available;
      return `<button type="button" class="date-chip ${this.state.date === date ? 'is-selected' : ''}" data-date="${date}" ${free ? '' : 'disabled'}>
        <span>${Utils.DAYS_SHORT[dt.getDay()]}</span><strong>${dt.getDate()}</strong>
        <small>${free ? `${free} libre${free === 1 ? '' : 's'}` : 'Completo'}</small>
      </button>`;
    }).join('') || '<p class="muted text-sm">No hay fechas disponibles próximamente.</p>';
  },

  async selectDate(date) {
    const pro = this.pros.find((p) => p.id === this.state.professionalId);
    const input = this.c.querySelector('#date-input');
    this.state.time = null;
    if (date < Utils.todayISO()) {
      this.setError('date', 'No puedes seleccionar una fecha pasada.');
      return;
    }
    if (!ScheduleService.worksOn(pro, date)) {
      this.state.date = null;
      this.setError('date', `${pro.name} no atiende los ${Utils.DAYS[Utils.weekday(date)].toLowerCase()}. Días de atención: ${Utils.daysSummary(pro.schedule.days)}.`);
      this.setStep(3, { done: false });
      this.setStep(4, { locked: true });
      this.c.querySelectorAll('[data-date]').forEach((b) => b.classList.remove('is-selected'));
      this.c.querySelector('#slot-grid').innerHTML = '<p class="muted text-sm">Selecciona una fecha válida para ver los horarios.</p>';
      this.renderSummary();
      return;
    }
    this.state.date = date;
    input.value = date;
    this.setError('date', '');
    this.c.querySelectorAll('[data-date]').forEach((b) => b.classList.toggle('is-selected', b.dataset.date === date));
    this.setStep(3, { done: true });
    this.setStep(4, { locked: false, done: false });
    this.setStep(5, { locked: true });
    this.renderSummary();
    await this.renderSlots();
  },

  async renderSlots() {
    const { professionalId, date } = this.state;
    const { slots } = await AppointmentService.getAvailability(professionalId, date);
    const grid = this.c.querySelector('#slot-grid');
    const free = slots.filter((s) => s.status === 'disponible').length;
    grid.innerHTML = slots.map((s) => {
      const cls = s.status === 'ocupado' ? 'slot--busy' : s.status === 'pasado' ? 'slot--past' : '';
      const label = s.status === 'ocupado' ? 'Ocupado' : s.status === 'pasado' ? 'No disp.' : 'Libre';
      return `<button type="button" class="slot ${cls} ${this.state.time === s.time ? 'is-selected' : ''}" data-time="${s.time}" ${s.status !== 'disponible' ? 'disabled' : ''}
        aria-label="${Utils.formatTime(s.time)} ${label}">${Utils.formatTime(s.time)}<small>${label}</small></button>`;
    }).join('');
    this.setError('time', free ? '' : 'No hay horarios disponibles para esta fecha. Elige otro día.');
  },

  selectTime(time) {
    this.state.time = time;
    this.c.querySelectorAll('[data-time]').forEach((b) => b.classList.toggle('is-selected', b.dataset.time === time));
    this.setError('time', '');
    this.setStep(4, { done: true });
    this.setStep(5, { locked: false, done: true });
    this.renderSummary();
  },

  renderSummary() {
    const s = this.state;
    const spec = this.specialties.find((x) => x.id === s.specialtyId);
    const pro = this.pros.find((x) => x.id === s.professionalId);
    const row = (icon, label, value) => `
      <div class="summary__row"><i data-lucide="${icon}"></i>
        <div><div class="summary__label">${label}</div><div class="summary__value ${value ? '' : 'is-empty'}">${value || 'Sin seleccionar'}</div></div>
      </div>`;
    const complete = s.specialtyId && s.professionalId && s.date && s.time;
    this.c.querySelector('#summary').innerHTML = `
      <h3 class="summary__title"><i data-lucide="clipboard-list"></i>Resumen de la reserva</h3>
      ${row('stethoscope', 'Especialidad', spec && spec.name)}
      ${row('user-round', 'Profesional', pro && Utils.escapeHTML(pro.name))}
      ${row('calendar', 'Fecha', s.date && Utils.formatDateLong(s.date))}
      ${row('clock', 'Hora', s.time && `${Utils.formatTime(s.time)} · ${pro.schedule.interval} min`)}
      <button type="button" class="btn btn--primary btn--lg btn--block" id="confirm-booking"><i data-lucide="calendar-check"></i>Confirmar cita</button>
      <button type="button" class="btn btn--ghost btn--block btn--sm" id="reset-booking" style="margin-top:8px"><i data-lucide="rotate-ccw"></i>Reiniciar selección</button>
      ${complete ? '' : '<p class="field-hint mt-8" style="text-align:center">Completa los pasos para confirmar tu cita.</p>'}`;
    Utils.icons();
  },

  async confirm() {
    const s = this.state;
    let valid = true;
    if (!s.specialtyId) { this.setError('specialty', 'Selecciona una especialidad.'); valid = false; }
    else if (!s.professionalId) { this.setError('professional', 'Selecciona un profesional.'); valid = false; }
    else if (!s.date) { this.setError('date', 'Selecciona una fecha de atención.'); valid = false; }
    else if (!s.time) { this.setError('time', 'Selecciona un horario disponible.'); valid = false; }
    if (!valid) {
      Toast.warning('Completa todos los pasos antes de confirmar.');
      const firstErr = this.c.querySelector('.field-error:not(:empty)');
      if (firstErr) firstErr.closest('.step').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const pro = this.pros.find((p) => p.id === s.professionalId);
    const ok = await Confirm({
      title: '¿Confirmar la reserva?',
      message: `${Utils.escapeHTML(pro.name)} · ${pro.specialty.name}<br><strong>${Utils.formatDateLong(s.date)} a las ${Utils.formatTime(s.time)}</strong>`,
      confirmText: 'Confirmar cita', variant: 'primary', icon: 'calendar-check'
    });
    if (!ok) return;
    try {
      const appt = await AppointmentService.create({
        patientId: App.session.refId, professionalId: s.professionalId, date: s.date, time: s.time,
        reason: this.c.querySelector('#reason').value
      });
      NotificationsUI.refresh();
      Toast.success(`Tu cita ${appt.id} fue registrada correctamente.`, '¡Cita confirmada!');
      this.showSuccess(appt);
      await this.render(this.c);
    } catch (err) {
      Toast.error(err.message);
      this.state.time = null;
      await this.renderSlots();
      this.renderSummary();
    }
  },

  showSuccess(a) {
    Modal.open({
      size: 'sm',
      body: `
        <div class="confirm">
          <div class="confirm__icon confirm__icon--success"><i data-lucide="check"></i></div>
          <h3>¡Cita confirmada!</h3>
          <p>Código de cita <span class="code">${a.id}</span></p>
          <div class="detail-grid mt-16" style="text-align:left">
            <div class="detail-item span-2"><span>Profesional</span><strong>${Utils.escapeHTML(a.professionalName)} · ${a.specialtyName}</strong></div>
            <div class="detail-item"><span>Fecha</span><strong>${Utils.formatDate(a.date)}</strong></div>
            <div class="detail-item"><span>Hora</span><strong>${Utils.formatTime(a.time)}</strong></div>
          </div>
          <p class="text-sm mt-16">Te recomendamos llegar 15 minutos antes de tu cita.</p>
        </div>`,
      actions: [
        { label: 'Reservar otra', className: 'btn--ghost' },
        { label: 'Ver mis citas', className: 'btn--primary', icon: 'calendar-check', onClick: () => Navigation.go('mis-citas') }
      ]
    });
  }
};

/* ---------- Mis citas ---------- */
const MyAppointmentsView = {
  filter: 'proximas',

  async render(c, params = {}) {
    if (params.filter) this.filter = params.filter;
    const all = await AppointmentService.list({ patientId: App.session.refId });
    const groups = {
      proximas: all.filter((a) => a.isUpcoming),
      todas: [...all].reverse(),
      confirmada: all.filter((a) => a.status === 'confirmada'),
      cancelada: all.filter((a) => a.status === 'cancelada').reverse(),
      atendida: all.filter((a) => a.status === 'atendida').reverse()
    };
    const tabs = [['proximas', 'Próximas'], ['todas', 'Todas'], ['confirmada', 'Confirmadas'], ['cancelada', 'Canceladas'], ['atendida', 'Atendidas']];

    c.innerHTML = `
      <div class="toolbar">
        <div class="tabs" role="tablist">
          ${tabs.map(([k, l]) => `<button type="button" class="tab ${this.filter === k ? 'is-active' : ''}" data-tab="${k}" role="tab">${l}<span class="tab__count">${groups[k].length}</span></button>`).join('')}
        </div>
        <div class="toolbar__spacer"></div>
        <div class="field field--search" style="max-width:320px">
          <div class="input-icon"><i data-lucide="search"></i><input type="search" class="input" id="my-search" placeholder="Buscar por código, médico o especialidad"></div>
        </div>
        <button type="button" class="btn btn--primary" data-go="reservar"><i data-lucide="calendar-plus"></i>Nueva cita</button>
      </div>
      <div id="my-list"></div>`;

    const listEl = c.querySelector('#my-list');
    const draw = () => {
      const q = c.querySelector('#my-search').value.trim().toLowerCase();
      const items = groups[this.filter].filter((a) => !q || [a.id, a.professionalName, a.specialtyName].some((v) => v.toLowerCase().includes(q)));
      listEl.innerHTML = items.length
        ? `<div class="appt-grid">${items.map((a) => AppointmentUI.card(a)).join('')}</div>`
        : `<div class="card">${Utils.emptyState('calendar-search', q ? 'Sin resultados' : 'No hay citas en esta sección',
            q ? 'Prueba con otro término de búsqueda.' : 'Cuando reserves una cita aparecerá aquí.',
            q ? '' : '<button type="button" class="btn btn--primary" data-go="reservar"><i data-lucide="calendar-plus"></i>Reservar cita</button>')}</div>`;
      Utils.icons();
    };

    c.querySelector('.tabs').addEventListener('click', (e) => {
      const t = e.target.closest('[data-tab]');
      if (!t) return;
      this.filter = t.dataset.tab;
      c.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b === t));
      draw();
    });
    c.querySelector('#my-search').addEventListener('input', Utils.debounce(draw, 200));
    [c.querySelector('.toolbar'), listEl].forEach((el) => el.addEventListener('click', (e) => {
      const g = e.target.closest('[data-go]');
      if (g) Navigation.go(g.dataset.go);
    }));
    AppointmentUI.bindActions(listEl);
    draw();
  }
};
