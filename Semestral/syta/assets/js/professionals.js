/* =========================================================
   Syta · Gestión de profesionales (vista administrativa)
   Registrar, editar, cambiar estado y consultar información.
   ========================================================= */
'use strict';

const FormUI = {
  /** Muestra errores de validación por campo ([data-field="x"] .field-error). */
  showErrors(root, fields = {}) {
    root.querySelectorAll('.field[data-field]').forEach((f) => {
      const msg = fields[f.dataset.field] || '';
      f.classList.toggle('has-error', !!msg);
      const p = f.querySelector('.field-error');
      if (p) p.textContent = msg;
    });
    const first = root.querySelector('.field.has-error .input, .field.has-error input');
    if (first) first.focus();
  },
  clearErrors(root) { this.showErrors(root, {}); }
};

const ProfessionalsView = {
  filters: { search: '', specialtyId: '', status: '' },

  async render(c) {
    const specs = await ProfessionalService.specialties();
    const f = this.filters;

    c.innerHTML = `
      <div class="stack" id="view">
        <section class="card">
          <div class="toolbar">
            <div class="field field--search"><label for="pr-search">Buscar</label>
              <div class="input-icon"><i data-lucide="search"></i><input id="pr-search" type="search" class="input" placeholder="Nombre o licencia" value="${Utils.escapeHTML(f.search)}"></div></div>
            <div class="field"><label for="pr-spec">Especialidad</label>
              <select id="pr-spec" class="input"><option value="">Todas</option>${specs.map((s) => `<option value="${s.id}" ${f.specialtyId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}</select></div>
            <div class="field"><label for="pr-status">Estado</label>
              <select id="pr-status" class="input">
                <option value="">Todos</option>
                <option value="activo" ${f.status === 'activo' ? 'selected' : ''}>Activo</option>
                <option value="inactivo" ${f.status === 'inactivo' ? 'selected' : ''}>Inactivo</option>
              </select></div>
            <div class="toolbar__spacer"></div>
            <button type="button" class="btn btn--primary" id="pr-new"><i data-lucide="user-plus"></i>Registrar profesional</button>
          </div>
          <p class="result-count mt-16" id="pr-count"></p>
        </section>
        <div id="pr-grid"></div>
      </div>`;

    const root = c.querySelector('#view');
    const draw = async () => {
      this.filters = {
        search: root.querySelector('#pr-search').value,
        specialtyId: root.querySelector('#pr-spec').value,
        status: root.querySelector('#pr-status').value
      };
      const list = await ProfessionalService.list(this.filters);
      const counts = await Promise.all(list.map((p) => ProfessionalService.upcomingCount(p.id)));
      root.querySelector('#pr-count').textContent = Utils.plural(list.length, 'profesional encontrado', 'profesionales encontrados');
      root.querySelector('#pr-grid').innerHTML = list.length
        ? `<div class="pro-grid">${list.map((p, i) => this.cardHTML(p, counts[i])).join('')}</div>`
        : `<section class="card">${Utils.emptyState('user-search', 'Sin resultados', 'No hay profesionales que coincidan con los filtros.')}</section>`;
      Utils.icons();
    };

    root.querySelector('#pr-search').addEventListener('input', Utils.debounce(draw, 200));
    ['#pr-spec', '#pr-status'].forEach((s) => root.querySelector(s).addEventListener('change', draw));
    root.querySelector('#pr-new').addEventListener('click', () => this.openForm());
    root.querySelector('#pr-grid').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-pro-action]');
      if (!b) return;
      const id = b.dataset.id;
      if (b.dataset.proAction === 'view') this.openDetail(id);
      if (b.dataset.proAction === 'edit') this.openForm(id);
      if (b.dataset.proAction === 'toggle') this.toggle(id);
      if (b.dataset.proAction === 'schedule') { SchedulesView.selectedId = id; Navigation.go('horarios'); }
    });
    await draw();
  },

  cardHTML(p, upcoming) {
    const active = p.status === 'activo';
    return `
      <article class="card pro-card ${active ? '' : 'is-inactive'}">
        <div class="pro-card__head">
          <div class="avatar" style="background:${p.specialty?.color || 'var(--primary)'}">${Utils.initials(p.name)}</div>
          <div>
            <strong>${Utils.escapeHTML(p.name)}</strong>
            <span class="pro-card__spec" style="color:${p.specialty?.color}"><i data-lucide="${p.specialty?.icon || 'stethoscope'}"></i>${p.specialty?.name || '—'}</span>
          </div>
          <span class="badge ${active ? 'badge--success' : 'badge--neutral'}">${active ? 'Activo' : 'Inactivo'}</span>
        </div>
        <p class="pro-card__desc">${Utils.escapeHTML(p.description)}</p>
        <div class="pro-card__meta">
          <div><i data-lucide="calendar-days"></i><div class="week-days">${Utils.weekDaysHTML(p.schedule.days)}</div></div>
          <div><i data-lucide="clock"></i>${Utils.formatTime(p.schedule.start)} – ${Utils.formatTime(p.schedule.end)} · cada ${p.schedule.interval} min</div>
          <div><i data-lucide="calendar-check"></i>${Utils.plural(upcoming, 'cita próxima', 'citas próximas')}</div>
        </div>
        <div class="pro-card__foot">
          <button type="button" class="btn btn--secondary btn--sm" data-pro-action="view" data-id="${p.id}"><i data-lucide="eye"></i>Ver</button>
          <button type="button" class="btn btn--soft btn--sm" data-pro-action="edit" data-id="${p.id}"><i data-lucide="pencil"></i>Editar</button>
          <button type="button" class="btn btn--ghost btn--sm" data-pro-action="toggle" data-id="${p.id}"><i data-lucide="${active ? 'user-x' : 'user-check'}"></i>${active ? 'Desactivar' : 'Activar'}</button>
        </div>
      </article>`;
  },

  async openDetail(id) {
    const p = await ProfessionalService.getById(id);
    if (!p) return Toast.error('Profesional no encontrado.');
    const upcoming = await ProfessionalService.upcomingCount(id);
    const slots = ScheduleService.generateSlots(p.schedule);
    Modal.open({
      title: Utils.escapeHTML(p.name), subtitle: `${p.id} · ${p.specialty?.name || ''}`, icon: 'stethoscope', size: 'md',
      body: `
        <div class="detail-head">
          <span class="badge ${p.status === 'activo' ? 'badge--success' : 'badge--neutral'}">${p.status === 'activo' ? 'Activo' : 'Inactivo'}</span>
          <span class="text-sm muted">${Utils.plural(upcoming, 'cita próxima', 'citas próximas')}</span>
        </div>
        <div class="detail-grid">
          <div class="detail-item"><span>Licencia</span><strong>${Utils.escapeHTML(p.license || '—')}</strong></div>
          <div class="detail-item"><span>Especialidad</span><strong>${p.specialty?.name || '—'}</strong></div>
          <div class="detail-item"><span>Correo</span><strong>${Utils.escapeHTML(p.email || '—')}</strong></div>
          <div class="detail-item"><span>Teléfono</span><strong>${Utils.escapeHTML(p.phone || '—')}</strong></div>
          <div class="detail-item span-2"><span>Descripción</span><strong>${Utils.escapeHTML(p.description)}</strong></div>
          <div class="detail-item"><span>Días de atención</span><strong>${Utils.daysSummary(p.schedule.days)}</strong></div>
          <div class="detail-item"><span>Horario</span><strong>${Utils.formatTime(p.schedule.start)} – ${Utils.formatTime(p.schedule.end)} (${p.schedule.interval} min)</strong></div>
          <div class="detail-item span-2"><span>Turnos por día (${slots.length})</span>
            <div class="chip-list mt-8">${slots.map((s) => `<span class="chip">${Utils.formatTime(s)}</span>`).join('')}</div></div>
        </div>`,
      actions: [
        { label: 'Cerrar', className: 'btn--ghost' },
        { label: 'Editar horario', className: 'btn--soft', icon: 'clock', onClick: () => { SchedulesView.selectedId = id; Navigation.go('horarios'); } },
        { label: 'Editar', className: 'btn--primary', icon: 'pencil', onClick: () => { setTimeout(() => this.openForm(id), 0); } }
      ]
    });
  },

  async openForm(id = null) {
    const [specs, p] = await Promise.all([ProfessionalService.specialties(), id ? ProfessionalService.getById(id) : null]);
    const v = p || { name: '', specialtyId: '', license: '', email: '', phone: '', description: '', status: 'activo' };
    const field = (name, label, input, cls = '', req = false) => `
      <div class="field ${cls}" data-field="${name}">
        <label for="pf-${name}">${label}${req ? ' <span class="req">*</span>' : ''}</label>${input}<p class="field-error"></p>
      </div>`;

    Modal.open({
      title: p ? 'Editar profesional' : 'Registrar profesional',
      subtitle: p ? `${p.id} · ${Utils.escapeHTML(p.name)}` : 'Completa la información del nuevo profesional',
      icon: p ? 'user-cog' : 'user-plus', size: 'lg',
      body: `
        <form id="pro-form" class="form-grid" novalidate>
          ${field('name', 'Nombre completo', `<input id="pf-name" class="input" value="${Utils.escapeHTML(v.name)}" placeholder="Dra. Ana Pérez López">`, 'span-2', true)}
          ${field('specialtyId', 'Especialidad', `<select id="pf-specialtyId" class="input"><option value="">Seleccionar…</option>${specs.map((s) => `<option value="${s.id}" ${v.specialtyId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}</select>`, '', true)}
          ${field('license', 'Licencia', `<input id="pf-license" class="input" value="${Utils.escapeHTML(v.license)}" placeholder="MG-12345">`)}
          ${field('email', 'Correo electrónico', `<input id="pf-email" type="email" class="input" value="${Utils.escapeHTML(v.email)}" placeholder="nombre@syta.demo">`)}
          ${field('phone', 'Teléfono', `<input id="pf-phone" class="input" value="${Utils.escapeHTML(v.phone)}" placeholder="+507 6000-0000">`)}
          ${field('description', 'Descripción', `<textarea id="pf-description" class="input" rows="3" placeholder="Experiencia y áreas de atención…">${Utils.escapeHTML(v.description)}</textarea>`, 'span-2', true)}
          ${field('status', 'Estado', `<select id="pf-status" class="input"><option value="activo" ${v.status === 'activo' ? 'selected' : ''}>Activo</option><option value="inactivo" ${v.status === 'inactivo' ? 'selected' : ''}>Inactivo</option></select>`)}
          ${p ? '' : '<p class="field-hint" style="align-self:end">Se asigna un horario inicial (Lun–Vie, 8:00–12:00). Puedes ajustarlo en Gestión de horarios.</p>'}
        </form>`,
      actions: [
        { label: 'Cancelar', className: 'btn--ghost' },
        {
          label: p ? 'Guardar cambios' : 'Registrar', className: 'btn--primary', icon: 'save',
          onClick: async (m) => {
            const get = (k) => m.querySelector(`#pf-${k}`).value;
            const data = { name: get('name'), specialtyId: get('specialtyId'), license: get('license'), email: get('email'), phone: get('phone'), description: get('description'), status: get('status') };
            try {
              const saved = p ? await ProfessionalService.update(p.id, data) : await ProfessionalService.create(data);
              Toast.success(p ? `Se actualizó la información de ${saved.name}.` : `${saved.name} fue registrado con el código ${saved.id}.`, p ? 'Profesional actualizado' : 'Profesional registrado');
              App.afterChange();
            } catch (err) {
              if (err.fields) FormUI.showErrors(m, err.fields);
              Toast.error(err.message);
              return false;
            }
          }
        }
      ]
    });
  },

  async toggle(id) {
    const p = await ProfessionalService.getById(id);
    if (!p) return;
    const deactivating = p.status === 'activo';
    const upcoming = await ProfessionalService.upcomingCount(id);
    const ok = await Confirm({
      title: deactivating ? '¿Desactivar profesional?' : '¿Activar profesional?',
      message: deactivating
        ? `${Utils.escapeHTML(p.name)} dejará de aparecer para nuevas reservas.${upcoming ? ` Tiene ${Utils.plural(upcoming, 'cita próxima', 'citas próximas')} que se mantendrán.` : ''}`
        : `${Utils.escapeHTML(p.name)} volverá a estar disponible para reservas.`,
      confirmText: deactivating ? 'Desactivar' : 'Activar',
      variant: deactivating ? 'danger' : 'primary',
      icon: deactivating ? 'user-x' : 'user-check'
    });
    if (!ok) return;
    try {
      const r = await ProfessionalService.toggleStatus(id);
      Toast.success(`${r.name} ahora está ${r.status}.`, 'Estado actualizado');
      App.afterChange();
    } catch (err) { Toast.error(err.message); }
  }
};
