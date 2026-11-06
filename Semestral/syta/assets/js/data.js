/* =========================================================
   Syta · Datos de prueba (completamente ficticios)
   Genera la "base de datos" inicial de demostración.
   Las fechas de las citas se calculan relativas al día actual
   para que siempre existan citas próximas, pasadas y del día.
   ========================================================= */
'use strict';

const SeedData = (() => {
  const specialties = [
    { id: 'ESP-01', name: 'Medicina General', icon: 'stethoscope', color: '#0d9488', description: 'Atención primaria, chequeos y control preventivo.' },
    { id: 'ESP-02', name: 'Pediatría', icon: 'baby', color: '#f59e0b', description: 'Atención integral para niños y adolescentes.' },
    { id: 'ESP-03', name: 'Cardiología', icon: 'heart-pulse', color: '#ef4444', description: 'Prevención y control de enfermedades del corazón.' },
    { id: 'ESP-04', name: 'Dermatología', icon: 'scan-face', color: '#8b5cf6', description: 'Cuidado de la piel, cabello y uñas.' },
    { id: 'ESP-05', name: 'Odontología', icon: 'smile', color: '#3b82f6', description: 'Salud bucal, limpiezas y tratamientos dentales.' }
  ];

  // schedule.days usa el formato de Date.getDay(): 0 = domingo ... 6 = sábado
  const professionals = [
    {
      id: 'PRO-001', name: 'Dra. Elena Ramírez Castillo', specialtyId: 'ESP-01', license: 'MG-10234',
      email: 'elena.ramirez@syta.demo', phone: '+507 6100-1001', status: 'activo',
      description: 'Médica general con 12 años de experiencia en atención primaria, medicina preventiva y control de enfermedades crónicas.',
      schedule: { days: [1, 2, 3, 4, 5], start: '08:00', end: '12:00', interval: 30 }
    },
    {
      id: 'PRO-002', name: 'Dr. Andrés Molina Pérez', specialtyId: 'ESP-02', license: 'PD-20871',
      email: 'andres.molina@syta.demo', phone: '+507 6100-1002', status: 'activo',
      description: 'Pediatra enfocado en control de crecimiento y desarrollo, esquemas de vacunación y orientación a padres.',
      schedule: { days: [1, 3, 4, 5], start: '13:00', end: '17:00', interval: 30 }
    },
    {
      id: 'PRO-003', name: 'Dra. Sofía Herrera Vega', specialtyId: 'ESP-03', license: 'CA-30412',
      email: 'sofia.herrera@syta.demo', phone: '+507 6100-1003', status: 'activo',
      description: 'Cardióloga clínica especializada en hipertensión arterial, evaluación de riesgo cardiovascular y rehabilitación.',
      schedule: { days: [2, 4, 6], start: '09:00', end: '13:00', interval: 45 }
    },
    {
      id: 'PRO-004', name: 'Dr. Martín Quintero Ruiz', specialtyId: 'ESP-04', license: 'DE-40156',
      email: 'martin.quintero@syta.demo', phone: '+507 6100-1004', status: 'activo',
      description: 'Dermatólogo con experiencia en acné, dermatitis, revisión de lunares y cuidado de la piel sensible.',
      schedule: { days: [1, 3, 4, 5], start: '08:00', end: '11:00', interval: 20 }
    },
    {
      id: 'PRO-005', name: 'Dra. Valeria Castro Núñez', specialtyId: 'ESP-05', license: 'OD-50923',
      email: 'valeria.castro@syta.demo', phone: '+507 6100-1005', status: 'activo',
      description: 'Odontóloga general: limpiezas, restauraciones, evaluación ortodóntica y educación en higiene bucal.',
      schedule: { days: [1, 2, 3, 4, 5], start: '14:00', end: '18:00', interval: 60 }
    },
    {
      id: 'PRO-006', name: 'Dr. Julián Ortega Ríos', specialtyId: 'ESP-01', license: 'MG-10877',
      email: 'julian.ortega@syta.demo', phone: '+507 6100-1006', status: 'inactivo',
      description: 'Médico general de turno sabatino. Actualmente fuera de servicio por periodo de vacaciones.',
      schedule: { days: [6], start: '08:00', end: '12:00', interval: 30 }
    }
  ];

  const patients = [
    { id: 'PAC-001', name: 'María Fernanda González', email: 'maria.gonzalez@syta.demo', phone: '+507 6200-3001', documentId: '8-845-1203', birthdate: '1992-04-18', address: 'Calle 50, Ciudad de Panamá', createdAt: '2025-01-10T09:00:00' },
    { id: 'PAC-002', name: 'Carlos Eduardo Medina', email: 'carlos.medina@syta.demo', phone: '+507 6200-3002', documentId: '8-712-0456', birthdate: '1985-09-02', address: 'San Francisco, Ciudad de Panamá', createdAt: '2025-03-22T10:30:00' },
    { id: 'PAC-003', name: 'Lucía Andrea Pinto', email: 'lucia.pinto@syta.demo', phone: '+507 6200-3003', documentId: '4-298-7781', birthdate: '1998-12-11', address: 'El Dorado, Ciudad de Panamá', createdAt: '2025-06-05T15:10:00' },
    { id: 'PAC-004', name: 'Roberto Salas Jiménez', email: 'roberto.salas@syta.demo', phone: '+507 6200-3004', documentId: '8-601-3349', birthdate: '1970-07-25', address: 'Bella Vista, Ciudad de Panamá', createdAt: '2025-08-14T08:45:00' }
  ];

  // Cuentas de demostración (autenticación simulada)
  const users = [
    { email: 'admin@syta.demo', password: 'admin123', role: 'admin', refId: 'ADM-001', name: 'Laura Méndez', position: 'Recepción y administración' },
    { email: 'maria.gonzalez@syta.demo', password: 'paciente123', role: 'patient', refId: 'PAC-001' },
    { email: 'carlos.medina@syta.demo', password: 'paciente123', role: 'patient', refId: 'PAC-002' },
    { email: 'lucia.pinto@syta.demo', password: 'paciente123', role: 'patient', refId: 'PAC-003' },
    { email: 'roberto.salas@syta.demo', password: 'paciente123', role: 'patient', refId: 'PAC-004' }
  ];

  function build() {
    const today = Utils.todayISO();
    const pros = JSON.parse(JSON.stringify(professionals));
    const appointments = [];
    const notifications = [];
    const used = new Set();
    let seq = 0;
    let nseq = 0;

    const findDay = (pro, offset) => {
      const dir = offset < 0 ? -1 : 1;
      let d = Utils.addDays(today, offset);
      for (let i = 0; i < 14; i++) {
        if (pro.schedule.days.includes(Utils.weekday(d))) return d;
        d = Utils.addDays(d, dir);
      }
      return d;
    };

    const add = (patientId, proId, date, slotIdx, status, reason) => {
      const pro = pros.find((p) => p.id === proId);
      const slots = ScheduleService.generateSlots(pro.schedule);
      let i = slotIdx % slots.length;
      let tries = 0;
      while (used.has(`${proId}|${date}|${slots[i]}`) && tries < slots.length) { i = (i + 1) % slots.length; tries++; }
      const time = slots[i];
      used.add(`${proId}|${date}|${time}`);
      const finalStatus = status === 'auto' ? (Utils.isPast(date, time) ? 'atendida' : 'confirmada') : status;
      seq++;
      const created = new Date(Utils.parseISO(date).getTime() - 5 * 86400000);
      const appt = {
        id: `CIT-${String(seq).padStart(4, '0')}`,
        patientId, professionalId: proId, date, time, status: finalStatus, reason,
        createdAt: created.toISOString()
      };
      if (finalStatus === 'cancelada') { appt.cancelledAt = created.toISOString(); appt.cancelledBy = 'patient'; }
      appointments.push(appt);
      return appt;
    };
    const addRel = (patientId, proId, offset, slotIdx, status, reason) =>
      add(patientId, proId, findDay(pros.find((p) => p.id === proId), offset), slotIdx, status, reason);

    // ---- María (PAC-001)
    const m1 = addRel('PAC-001', 'PRO-001', 2, 1, 'auto', 'Control general anual');
    const m2 = addRel('PAC-001', 'PRO-003', 5, 2, 'auto', 'Evaluación cardiológica preventiva');
    addRel('PAC-001', 'PRO-005', 9, 0, 'auto', 'Limpieza dental semestral');
    addRel('PAC-001', 'PRO-004', -10, 1, 'atendida', 'Revisión de lunar en el brazo');
    addRel('PAC-001', 'PRO-001', -21, 3, 'atendida', 'Chequeo por gripe persistente');
    const m6 = addRel('PAC-001', 'PRO-005', -5, 2, 'cancelada', 'Dolor en muela inferior');
    addRel('PAC-001', 'PRO-004', 4, 4, 'cancelada', 'Consulta por alergia en la piel');
    // ---- Carlos (PAC-002)
    addRel('PAC-002', 'PRO-001', 2, 3, 'auto', 'Dolor de cabeza recurrente');
    addRel('PAC-002', 'PRO-003', 5, 0, 'auto', 'Control de presión arterial');
    addRel('PAC-002', 'PRO-004', -3, 2, 'atendida', 'Tratamiento de acné');
    const c4 = addRel('PAC-002', 'PRO-005', 1, 2, 'auto', 'Revisión de sensibilidad dental');
    // ---- Lucía (PAC-003)
    addRel('PAC-003', 'PRO-002', 1, 0, 'auto', 'Control pediátrico de su hijo');
    addRel('PAC-003', 'PRO-002', 3, 4, 'auto', 'Vacunación (refuerzo)');
    addRel('PAC-003', 'PRO-001', -7, 2, 'cancelada', 'Certificado médico');
    // ---- Roberto (PAC-004)
    addRel('PAC-004', 'PRO-003', 8, 1, 'auto', 'Seguimiento de arritmia');
    addRel('PAC-004', 'PRO-001', 2, 5, 'auto', 'Resultados de laboratorio');
    addRel('PAC-004', 'PRO-004', 6, 2, 'auto', 'Manchas en la piel');
    addRel('PAC-004', 'PRO-001', -14, 0, 'atendida', 'Control de glucosa');

    // ---- Agenda del día: dos citas por profesional activo que atienda hoy
    const patientIds = patients.map((p) => p.id);
    const reasons = ['Consulta de control', 'Revisión general', 'Seguimiento de tratamiento', 'Primera consulta'];
    let r = 0;
    pros.filter((p) => p.status === 'activo' && p.schedule.days.includes(Utils.weekday(today))).forEach((p) => {
      [0, 3].forEach((idx) => {
        add(patientIds[(r + 1) % patientIds.length], p.id, today, idx, 'auto', reasons[r % reasons.length]);
        r++;
      });
    });

    // ---- Notificaciones (simuladas, sin envío real)
    const findPro = (id) => pros.find((p) => p.id === id);
    const pushN = (userKey, title, message, type, minutesAgo, read = false) => {
      nseq++;
      notifications.push({
        id: `NOT-${String(nseq).padStart(4, '0')}`, userKey, title, message, type, read,
        createdAt: new Date(Date.now() - minutesAgo * 60000).toISOString()
      });
    };
    pushN('PAC-001', 'Cita confirmada', `Tu cita ${m1.id} con ${findPro(m1.professionalId).name} fue confirmada para el ${Utils.formatDate(m1.date)} a las ${Utils.formatTime(m1.time)}.`, 'success', 90);
    pushN('PAC-001', 'Recordatorio de cita', `Recuerda tu cita de Cardiología del ${Utils.formatDate(m2.date)}. Llega 15 minutos antes.`, 'info', 300);
    pushN('PAC-001', 'Cita cancelada', `La cita ${m6.id} fue cancelada correctamente. El horario quedó disponible.`, 'danger', 60 * 24 * 5, true);
    pushN('admin', 'Nueva reserva', `Carlos Eduardo Medina reservó la cita ${c4.id} en Odontología.`, 'success', 45);
    pushN('admin', 'Cancelación registrada', `María Fernanda González canceló la cita ${m6.id}.`, 'danger', 60 * 24 * 5, true);
    pushN('admin', 'Profesional inactivo', 'Dr. Julián Ortega Ríos fue marcado como inactivo.', 'warning', 60 * 24 * 2, true);

    return {
      version: 1,
      specialties: JSON.parse(JSON.stringify(specialties)),
      professionals: pros,
      patients: JSON.parse(JSON.stringify(patients)),
      users: JSON.parse(JSON.stringify(users)),
      appointments,
      notifications,
      sequences: { appointments: seq, professionals: pros.length, patients: patients.length, notifications: nseq }
    };
  }

  return { build };
})();
