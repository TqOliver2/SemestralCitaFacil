/* =========================================================
   Syta · Servicio de profesionales y especialidades
   ========================================================= */
'use strict';

const ProfessionalService = {
  async specialties() {
    return Database.table('specialties').map((s) => ({ ...s }));
  },

  getSpecialty(id) {
    return Database.table('specialties').find((s) => s.id === id) || null;
  },

  _enrich(p) {
    return { ...p, schedule: { ...p.schedule, days: [...p.schedule.days] }, specialty: this.getSpecialty(p.specialtyId) };
  },

  async list({ search = '', specialtyId = '', status = '' } = {}) {
    const q = search.trim().toLowerCase();
    return Database.table('professionals')
      .filter((p) => !specialtyId || p.specialtyId === specialtyId)
      .filter((p) => !status || p.status === status)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.license || '').toLowerCase().includes(q))
      .map((p) => this._enrich(p))
      .sort((a, b) => a.name.replace(/^Dra?\.\s*/, '').localeCompare(b.name.replace(/^Dra?\.\s*/, '')));
  },

  async getById(id) {
    const p = Database.table('professionals').find((x) => x.id === id);
    return p ? this._enrich(p) : null;
  },

  validate(data) {
    const errors = {};
    if (!data.name || data.name.trim().length < 5) errors.name = 'Ingresa el nombre completo (mínimo 5 caracteres).';
    if (!data.specialtyId) errors.specialtyId = 'Selecciona una especialidad.';
    if (!data.description || data.description.trim().length < 15) errors.description = 'La descripción debe tener al menos 15 caracteres.';
    if (data.email && !Utils.isEmail(data.email)) errors.email = 'Correo electrónico no válido.';
    if (data.license && !/^[A-Za-z]{2}-\d{3,6}$/.test(data.license.trim())) errors.license = 'Formato esperado: AA-12345.';
    return errors;
  },

  _throwIfInvalid(errors) {
    if (Object.keys(errors).length) {
      const err = new Error('Revisa los campos marcados.');
      err.fields = errors;
      throw err;
    }
  },

  async create(data) {
    this._throwIfInvalid(this.validate(data));
    const pro = {
      id: Database.nextId('professionals', 'PRO', 3),
      name: data.name.trim(),
      specialtyId: data.specialtyId,
      license: (data.license || '').trim().toUpperCase(),
      email: (data.email || '').trim(),
      phone: (data.phone || '').trim(),
      description: data.description.trim(),
      status: data.status === 'inactivo' ? 'inactivo' : 'activo',
      schedule: { days: [1, 2, 3, 4, 5], start: '08:00', end: '12:00', interval: 30 }
    };
    Database.table('professionals').push(pro);
    NotificationService.push('admin', { title: 'Profesional registrado', message: `${pro.name} fue agregado al equipo médico.`, type: 'success' });
    Database.persist();
    return this._enrich(pro);
  },

  async update(id, data) {
    this._throwIfInvalid(this.validate(data));
    const pro = Database.table('professionals').find((p) => p.id === id);
    if (!pro) throw new Error('Profesional no encontrado.');
    Object.assign(pro, {
      name: data.name.trim(),
      specialtyId: data.specialtyId,
      license: (data.license || '').trim().toUpperCase(),
      email: (data.email || '').trim(),
      phone: (data.phone || '').trim(),
      description: data.description.trim(),
      status: data.status === 'inactivo' ? 'inactivo' : 'activo'
    });
    Database.persist();
    return this._enrich(pro);
  },

  async toggleStatus(id) {
    const pro = Database.table('professionals').find((p) => p.id === id);
    if (!pro) throw new Error('Profesional no encontrado.');
    pro.status = pro.status === 'activo' ? 'inactivo' : 'activo';
    NotificationService.push('admin', {
      title: pro.status === 'activo' ? 'Profesional activado' : 'Profesional inactivo',
      message: `${pro.name} ahora está ${pro.status}.`,
      type: pro.status === 'activo' ? 'success' : 'warning'
    });
    Database.persist();
    return this._enrich(pro);
  },

  async upcomingCount(id) {
    return Database.table('appointments').filter((a) =>
      a.professionalId === id && a.status === 'confirmada' && !Utils.isPast(a.date, a.time)).length;
  }
};
