/* =========================================================
   Syta · Servicio de citas (núcleo del futuro microservicio)
   ---------------------------------------------------------
   Todas las operaciones sobre citas están centralizadas aquí y
   son asíncronas. En la fase 2 cada método se reemplazará por
   una solicitud HTTP manteniendo la misma firma, por lo que la
   capa de presentación no necesitará cambios.
   Estados: 'confirmada' | 'cancelada' | 'atendida'
   ========================================================= */
'use strict';

const AppointmentService = {
  STATUSES: ['confirmada', 'atendida', 'cancelada'],

  _enrich(a) {
    const pro = Database.table('professionals').find((p) => p.id === a.professionalId);
    const spec = pro ? Database.table('specialties').find((s) => s.id === pro.specialtyId) : null;
    const pat = Database.table('patients').find((p) => p.id === a.patientId);
    return {
      ...a,
      professionalName: pro ? pro.name : 'Profesional no disponible',
      specialtyId: spec ? spec.id : '',
      specialtyName: spec ? spec.name : '—',
      specialtyIcon: spec ? spec.icon : 'stethoscope',
      specialtyColor: spec ? spec.color : '#0d9488',
      patientName: pat ? pat.name : 'Paciente no disponible',
      patientEmail: pat ? pat.email : '',
      patientPhone: pat ? pat.phone : '',
      isUpcoming: a.status === 'confirmada' && !Utils.isPast(a.date, a.time),
      canCancel: a.status === 'confirmada' && !Utils.isPast(a.date, a.time)
    };
  },

  _isTaken(professionalId, date, time, excludeId) {
    return Database.table('appointments').some((a) =>
      a.id !== excludeId && a.professionalId === professionalId && a.date === date &&
      a.time === time && a.status !== 'cancelada');
  },

  /**
   * @param {Object} f  patientId, professionalId, specialtyId, status, date, dateFrom, dateTo, search, order ('asc'|'desc')
   */
  async list(f = {}) {
    const q = (f.search || '').trim().toLowerCase();
    const list = Database.table('appointments')
      .filter((a) => !f.patientId || a.patientId === f.patientId)
      .filter((a) => !f.professionalId || a.professionalId === f.professionalId)
      .filter((a) => !f.status || a.status === f.status)
      .filter((a) => !f.date || a.date === f.date)
      .filter((a) => !f.dateFrom || a.date >= f.dateFrom)
      .filter((a) => !f.dateTo || a.date <= f.dateTo)
      .map((a) => this._enrich(a))
      .filter((a) => !f.specialtyId || a.specialtyId === f.specialtyId)
      .filter((a) => !q || [a.id, a.patientName, a.professionalName, a.specialtyName].some((v) => v.toLowerCase().includes(q)));
    const dir = f.order === 'desc' ? -1 : 1;
    return list.sort((a, b) => dir * (a.date + a.time).localeCompare(b.date + b.time));
  },

  async getById(id) {
    const a = Database.table('appointments').find((x) => x.id === id);
    return a ? this._enrich(a) : null;
  },

  /**
   * Horarios del profesional para una fecha con su estado:
   * 'disponible' | 'ocupado' | 'pasado'
   */
  async getAvailability(professionalId, date) {
    const pro = Database.table('professionals').find((p) => p.id === professionalId);
    if (!pro || pro.status !== 'activo' || !date || !ScheduleService.worksOn(pro, date)) {
      return { works: false, slots: [] };
    }
    const slots = ScheduleService.generateSlots(pro.schedule).map((time) => {
      let status = 'disponible';
      if (this._isTaken(professionalId, date, time)) status = 'ocupado';
      else if (Utils.isPast(date, time)) status = 'pasado';
      return { time, status };
    });
    return { works: true, slots, available: slots.filter((s) => s.status === 'disponible').length };
  },

  async create({ patientId, professionalId, date, time, reason = '' }) {
    if (!patientId || !professionalId || !date || !time) throw new Error('Completa todos los datos de la reserva.');
    const pro = Database.table('professionals').find((p) => p.id === professionalId);
    if (!pro || pro.status !== 'activo') throw new Error('El profesional seleccionado no está disponible.');
    if (!ScheduleService.worksOn(pro, date)) throw new Error('El profesional no atiende en la fecha seleccionada.');
    if (!ScheduleService.generateSlots(pro.schedule).includes(time)) throw new Error('El horario seleccionado no pertenece a la agenda del profesional.');
    if (Utils.isPast(date, time)) throw new Error('No es posible reservar en una fecha u hora pasada.');
    if (this._isTaken(professionalId, date, time)) {
      throw new Error('Este horario acaba de ser reservado. Selecciona otro horario disponible.');
    }
    const clash = Database.table('appointments').find((a) =>
      a.patientId === patientId && a.date === date && a.time === time && a.status === 'confirmada');
    if (clash) throw new Error(`Ya tienes la cita ${clash.id} a la misma fecha y hora.`);

    const appt = {
      id: Database.nextId('appointments', 'CIT'),
      patientId, professionalId, date, time,
      status: 'confirmada',
      reason: reason.trim(),
      createdAt: new Date().toISOString()
    };
    Database.table('appointments').push(appt);

    const full = this._enrich(appt);
    NotificationService.push(patientId, {
      title: 'Cita confirmada',
      message: `Tu cita ${appt.id} con ${full.professionalName} quedó confirmada para el ${Utils.formatDate(date)} a las ${Utils.formatTime(time)}.`,
      type: 'success'
    });
    NotificationService.push('admin', {
      title: 'Nueva reserva',
      message: `${full.patientName} reservó la cita ${appt.id} en ${full.specialtyName}.`,
      type: 'success'
    });
    Database.persist();
    return full;
  },

  async cancel(id, { by = 'patient' } = {}) {
    const a = Database.table('appointments').find((x) => x.id === id);
    if (!a) throw new Error('Cita no encontrada.');
    if (a.status !== 'confirmada') throw new Error('Solo se pueden cancelar citas confirmadas.');
    if (by === 'patient' && Utils.isPast(a.date, a.time)) throw new Error('No es posible cancelar una cita que ya pasó.');
    a.status = 'cancelada';
    a.cancelledAt = new Date().toISOString();
    a.cancelledBy = by;
    const full = this._enrich(a);
    NotificationService.push(a.patientId, {
      title: 'Cita cancelada',
      message: `La cita ${a.id} del ${Utils.formatDate(a.date)} fue cancelada${by === 'admin' ? ' por la clínica' : ''}. El horario quedó disponible.`,
      type: 'danger'
    });
    NotificationService.push('admin', {
      title: 'Cancelación registrada',
      message: `${by === 'admin' ? 'Recepción' : full.patientName} canceló la cita ${a.id} (${full.specialtyName}).`,
      type: 'danger'
    });
    Database.persist();
    return full;
  },

  async updateStatus(id, status) {
    if (!this.STATUSES.includes(status)) throw new Error('Estado no válido.');
    const a = Database.table('appointments').find((x) => x.id === id);
    if (!a) throw new Error('Cita no encontrada.');
    if (a.status === status) return this._enrich(a);
    if (status === 'cancelada') return this.cancel(id, { by: 'admin' });
    if (status === 'confirmada' && this._isTaken(a.professionalId, a.date, a.time, a.id)) {
      throw new Error('No se puede reactivar: el horario ya fue reservado por otro paciente.');
    }
    a.status = status;
    delete a.cancelledAt;
    delete a.cancelledBy;
    if (status === 'atendida') a.attendedAt = new Date().toISOString();
    NotificationService.push(a.patientId, {
      title: status === 'atendida' ? 'Cita atendida' : 'Cita reactivada',
      message: status === 'atendida'
        ? `Tu cita ${a.id} fue marcada como atendida. ¡Gracias por tu visita!`
        : `Tu cita ${a.id} fue confirmada nuevamente por la clínica.`,
      type: status === 'atendida' ? 'info' : 'success'
    });
    Database.persist();
    return this._enrich(a);
  },

  async stats(filters = {}) {
    const list = await this.list(filters);
    return {
      total: list.length,
      confirmada: list.filter((a) => a.status === 'confirmada').length,
      cancelada: list.filter((a) => a.status === 'cancelada').length,
      atendida: list.filter((a) => a.status === 'atendida').length,
      upcoming: list.filter((a) => a.isUpcoming).length
    };
  }
};
