/* =========================================================
   Syta · Servicio de pacientes
   ========================================================= */
'use strict';

const PatientService = {
  _stats(patientId) {
    const appts = Database.table('appointments').filter((a) => a.patientId === patientId);
    const upcoming = appts.filter((a) => a.status === 'confirmada' && !Utils.isPast(a.date, a.time));
    const attended = appts.filter((a) => a.status === 'atendida').sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    return {
      total: appts.length,
      upcoming: upcoming.length,
      cancelled: appts.filter((a) => a.status === 'cancelada').length,
      attended: attended.length,
      lastVisit: attended[0] ? attended[0].date : null
    };
  },

  async list({ search = '' } = {}) {
    const q = search.trim().toLowerCase();
    return Database.table('patients')
      .filter((p) => !q || [p.name, p.email, p.documentId, p.id].some((v) => (v || '').toLowerCase().includes(q)))
      .map((p) => ({ ...p, stats: this._stats(p.id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async getById(id) {
    const p = Database.table('patients').find((x) => x.id === id);
    return p ? { ...p, stats: this._stats(p.id) } : null;
  },

  async update(id, data) {
    const errors = {};
    if (!data.name || data.name.trim().length < 5) errors.name = 'Ingresa tu nombre completo.';
    if (!data.phone || !/^[+\d][\d\s-]{6,}$/.test(data.phone.trim())) errors.phone = 'Ingresa un teléfono válido.';
    if (data.birthdate && data.birthdate > Utils.todayISO()) errors.birthdate = 'La fecha no puede ser futura.';
    if (Object.keys(errors).length) {
      const err = new Error('Revisa los campos marcados.');
      err.fields = errors;
      throw err;
    }
    const p = Database.table('patients').find((x) => x.id === id);
    if (!p) throw new Error('Paciente no encontrado.');
    Object.assign(p, {
      name: data.name.trim(),
      phone: data.phone.trim(),
      birthdate: data.birthdate || '',
      address: (data.address || '').trim()
    });
    Database.persist();
    return { ...p };
  }
};
