/* =========================================================
   Syta · Servicio de horarios
   ========================================================= */
'use strict';

const ScheduleService = {
  INTERVALS: [15, 20, 30, 45, 60],

  /** Función pura: genera los horarios de inicio de cada cita en un día. */
  generateSlots(schedule) {
    if (!schedule || !schedule.start || !schedule.end) return [];
    const start = Utils.timeToMin(schedule.start);
    const end = Utils.timeToMin(schedule.end);
    const step = Number(schedule.interval);
    if (!step || step <= 0) return [];
    const slots = [];
    for (let t = start; t + step <= end; t += step) slots.push(Utils.minToTime(t));
    return slots;
  },

  worksOn(professional, date) {
    return !!professional && professional.schedule.days.includes(Utils.weekday(date));
  },

  validate(schedule) {
    const errors = {};
    if (!schedule.days || !schedule.days.length) errors.days = 'Selecciona al menos un día de atención.';
    if (!schedule.start) errors.start = 'Indica la hora de inicio.';
    if (!schedule.end) errors.end = 'Indica la hora de finalización.';
    if (schedule.start && schedule.end && Utils.timeToMin(schedule.end) <= Utils.timeToMin(schedule.start)) {
      errors.end = 'La hora de finalización debe ser posterior a la de inicio.';
    }
    if (!this.INTERVALS.includes(Number(schedule.interval))) errors.interval = 'Selecciona un intervalo válido.';
    if (!Object.keys(errors).length && !this.generateSlots(schedule).length) {
      errors.interval = 'El intervalo es mayor que la jornada configurada.';
    }
    return errors;
  },

  async get(professionalId) {
    const pro = Database.table('professionals').find((p) => p.id === professionalId);
    return pro ? { ...pro.schedule, days: [...pro.schedule.days] } : null;
  },

  /** Citas confirmadas futuras que quedarían fuera del nuevo horario. */
  async conflictsWith(professionalId, schedule) {
    const slots = this.generateSlots(schedule);
    return Database.table('appointments').filter((a) =>
      a.professionalId === professionalId && a.status === 'confirmada' && !Utils.isPast(a.date, a.time) &&
      (!schedule.days.includes(Utils.weekday(a.date)) || !slots.includes(a.time))
    ).length;
  },

  async update(professionalId, schedule) {
    const errors = this.validate(schedule);
    if (Object.keys(errors).length) {
      const err = new Error(Object.values(errors)[0]);
      err.fields = errors;
      throw err;
    }
    const pro = Database.table('professionals').find((p) => p.id === professionalId);
    if (!pro) throw new Error('Profesional no encontrado.');
    pro.schedule = {
      days: [...schedule.days].map(Number).sort(),
      start: schedule.start,
      end: schedule.end,
      interval: Number(schedule.interval)
    };
    NotificationService.push('admin', { title: 'Horario actualizado', message: `Se modificó el horario de ${pro.name}.`, type: 'info' });
    Database.persist();
    return pro.schedule;
  }
};
