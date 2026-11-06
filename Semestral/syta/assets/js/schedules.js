/* =========================================================
   Syta · Gestión de horarios (vista administrativa)
   Días de atención, hora de inicio/fin, intervalo de citas,
   vista previa de turnos y ocupación por fecha.
   ========================================================= */
'use strict';

const SchedulesView = {
  selectedId: null,
  previewDate: null,

  async render(c) {
    const pros = await ProfessionalService.list();
    if (!pros.length) {
      c.innerHTML = `<section class="card">${Utils.emptyState('stethoscope', 'Sin profesionales', 'Registra un profesional para configurar su horario.')}</section>`;
      return;
    }
    if (!pros.some((p) => p.id === this.selectedId)) this.selectedId = pros[0].id;
    if (!this.previewDate) this.previewDate = Utils.todayISO();
    const pro = pros.find((p) => p.id === this.selectedId);
    const s = pro.schedule;

    c.innerHTML = `
      <div class="stack" id="view">
        <div class="grid grid-schedule">
          <section class="card">
            <div class="card__head"><div><h3 class="card__title"><i data-lucide="settings-2"></i>Configurar horario</h3><p class="card__subtitle">Los cambios aplican a las nuevas reservas</p></div></div>
            <form id="sch-form" class="stack" novalidate>
              <div class="field"><label for="sch-pro">Profesional</label>
                <select id="sch-pro" class="input">${pros.map((p) => `<option value="${p.id}" ${p.id === pro.id ? 'selected' : ''}>${Utils.escapeHTML(p.name)} · ${p.specialty?.name || ''}${p.status === 'inactivo' ? ' (inactivo)' : ''}</option>`).join('')}</select>
              </div>
              <div class="field" data-field="days"><span class="label">Días de atención</span>
                <div class="day-toggles">${[1, 2, 3, 4, 5, 6, 0].map((d) => `
                  <label class="day-toggle"><input type="checkbox" name="days" value="${d}" ${s.days.includes(d) ? 'checked' : ''}><span title="${Utils.DAYS[d]}">${Utils.DAYS_SHORT[d]}</span></label>`).join('')}</div>
                <p class="field-error"></p>
              </div>
              <div class="form-grid">
                <div class="field" data-field="start"><label for="sch-start">Hora de inicio</label><input id="sch-start" type="time" class="input" value="${s.start}" step="300"><p class="field-error"></p></div>
                <div class="field" data-field="end"><label for="sch-end">Hora de finalización</label><input id="sch-end" type="time" class="input" value="${s.end}" step="300"><p class="field-error"></p></div>
                <div class="field span-2" data-field="interval"><label for="sch-interval">Intervalo entre citas</label>
                  <select id="sch-interval" class="input">${ScheduleService.INTERVALS.map((i) => `<option value="${i}" ${Number(s.interval) === i ? 'selected' : ''}>${i} minutos</option>`).join('')}</select>
                  <p class="field-error"></p></div>
              </div>
              <div>
                <p class="label">Vista previa de turnos <span class="muted" id="sch-count"></span></p>
                <div class="chip-list mt-8" id="sch-preview"></div>
              </div>
              <div class="form-actions" style="margin-top:4px">
                <button type="button" class="btn btn--ghost" id="sch-reset"><i data-lucide="rotate-ccw"></i>Descartar cambios</button>
                <button type="submit" class="btn btn--primary"><i data-lucide="save"></i>Guardar horario</button>
              </div>
            </form>
          </section>

          <section class="card">
            <div class="card__head">
              <div><h3 class="card__title"><i data-lucide="calendar-search"></i>Ocupación por fecha</h3><p class="card__subtitle">${Utils.escapeHTML(pro.name)}</p></div>
            </div>
            <div class="field"><label for="sch-date">Fecha</label><input id="sch-date" type="date" class="input" value="${this.previewDate}"></div>
            <div class="slot-legend mt-16">
              <span class="row"><span class="slot" style="padding:2px 10px;pointer-events:none">&nbsp;</span>Disponible</span>
              <span class="row"><span class="slot slot--busy" style="padding:2px 10px">&nbsp;</span>Ocupado</span>
              <span class="row"><span class="slot slot--past" style="padding:2px 10px">&nbsp;</span>Pasado</span>
            </div>
            <div id="sch-occupancy"></div>
          </section>
        </div>

        <section class="card">
          <div class="card__head"><div><h3 class="card__title"><i data-lucide="table-2"></i>Horarios configurados</h3><p class="card__subtitle">Resumen de disponibilidad del equipo médico</p></div></div>
          <div class="table-wrap"><table class="table">
            <thead><tr><th>Profesional</th><th>Días</th><th>Jornada</th><th>Intervalo</th><th>Turnos/día</th><th>Estado</th><th style="text-align:right">Acción</th></tr></thead>
            <tbody>${pros.map((p) => `
              <tr ${p.id === pro.id ? 'style="background:var(--primary-50)"' : ''}>
                <td><div class="cell-main"><div class="avatar avatar--sm" style="background:${p.specialty?.color}">${Utils.initials(p.name)}</div><div><strong>${Utils.escapeHTML(p.name)}</strong><small>${p.specialty?.name || ''}</small></div></div></td>
                <td><div class="week-days">${Utils.weekDaysHTML(p.schedule.days)}</div></td>
                <td>${Utils.formatTime(p.schedule.start)} – ${Utils.formatTime(p.schedule.end)}</td>
                <td>${p.schedule.interval} min</td>
                <td><strong>${ScheduleService.generateSlots(p.schedule).length}</strong></td>
                <td><span class="badge ${p.status === 'activo' ? 'badge--success' : 'badge--neutral'}">${p.status === 'activo' ? 'Activo' : 'Inactivo'}</span></td>
                <td><div class="table-actions"><button type="button" class="btn btn--soft btn--sm" data-edit-sch="${p.id}"><i data-lucide="pencil"></i>Editar</button></div></td>
              </tr>`).join('')}</tbody>
          </table></div>
        </section>
      </div>`;

    const root = c.querySelector('#view');
    const form = root.querySelector('#sch-form');

    const readForm = () => ({
      days: [...form.querySelectorAll('input[name="days"]:checked')].map((i) => Number(i.value)),
      start: form.querySelector('#sch-start').value,
      end: form.querySelector('#sch-end').value,
      interval: Number(form.querySelector('#sch-interval').value)
    });

    const drawPreview = () => {
      const data = readForm();
      const errors = ScheduleService.validate(data);
      FormUI.showErrors(form, errors);
      const slots = Object.keys(errors).length ? [] : ScheduleService.generateSlots(data);
      root.querySelector('#sch-count').textContent = slots.length ? `· ${Utils.plural(slots.length, 'turno', 'turnos')} por día` : '';
      root.querySelector('#sch-preview').innerHTML = slots.length
        ? slots.map((t) => `<span class="chip">${Utils.formatTime(t)}</span>`).join('')
        : '<span class="text-sm muted">Corrige la configuración para ver los turnos.</span>';
    };

    const drawOccupancy = async () => {
      this.previewDate = root.querySelector('#sch-date').value;
      const box = root.querySelector('#sch-occupancy');
      if (!this.previewDate) { box.innerHTML = Utils.emptyState('calendar', 'Selecciona una fecha', 'Elige un día para ver la ocupación.'); Utils.icons(); return; }
      const av = await AppointmentService.getAvailability(pro.id, this.previewDate);
      if (pro.status !== 'activo') {
        box.innerHTML = Utils.emptyState('user-x', 'Profesional inactivo', 'No recibe reservas mientras esté inactivo.');
      } else if (!av.works) {
        box.innerHTML = Utils.emptyState('calendar-off', 'No atiende este día', `${Utils.formatDateLong(this.previewDate)} no es un día de atención.`);
      } else {
        const busy = av.slots.filter((x) => x.status === 'ocupado').length;
        box.innerHTML = `
          <p class="text-sm muted" style="margin-bottom:10px">${Utils.formatDateLong(this.previewDate)} · <strong>${av.available}</strong> disponibles · <strong>${busy}</strong> ocupados</p>
          <div class="slot-grid">${av.slots.map((x) => `
            <div class="slot ${x.status === 'ocupado' ? 'slot--busy' : x.status === 'pasado' ? 'slot--past' : ''}" style="cursor:default">
              ${Utils.formatTime(x.time)}<small>${x.status}</small></div>`).join('')}</div>`;
      }
      Utils.icons();
    };

    root.querySelector('#sch-pro').addEventListener('change', (e) => { this.selectedId = e.target.value; Navigation.refresh(); });
    form.addEventListener('input', drawPreview);
    form.addEventListener('change', drawPreview);
    root.querySelector('#sch-date').addEventListener('change', drawOccupancy);
    root.querySelector('#sch-reset').addEventListener('click', () => { Navigation.refresh(); Toast.info('Se restauró el horario guardado.'); });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-edit-sch]');
      if (!b) return;
      this.selectedId = b.dataset.editSch;
      Navigation.refresh();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = readForm();
      const errors = ScheduleService.validate(data);
      if (Object.keys(errors).length) { FormUI.showErrors(form, errors); Toast.error('Revisa la configuración del horario.'); return; }
      const conflicts = await ScheduleService.conflictsWith(pro.id, data);
      const ok = await Confirm({
        title: '¿Guardar nuevo horario?',
        message: conflicts
          ? `Hay ${Utils.plural(conflicts, 'cita confirmada', 'citas confirmadas')} fuera del nuevo horario. Se conservarán, pero conviene contactar a los pacientes.`
          : `Se actualizará la disponibilidad de ${Utils.escapeHTML(pro.name)} para nuevas reservas.`,
        confirmText: 'Guardar', variant: conflicts ? 'danger' : 'primary', icon: conflicts ? 'alert-triangle' : 'clock'
      });
      if (!ok) return;
      try {
        await ScheduleService.update(pro.id, data);
        Toast.success(`Horario de ${pro.name} guardado.`, 'Horario actualizado');
        App.afterChange();
      } catch (err) {
        if (err.fields) FormUI.showErrors(form, err.fields);
        Toast.error(err.message);
      }
    });

    drawPreview();
    await drawOccupancy();
  }
};
