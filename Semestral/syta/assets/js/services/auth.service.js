/* =========================================================
   Syta · Autenticación SIMULADA
   Solo valida contra las cuentas de demostración. No es segura
   ni pretende serlo: en la fase 2 se sustituirá por el servicio
   de autenticación real.
   ========================================================= */
'use strict';

const AuthService = {
  SESSION_KEY: 'syta_session',
  DEMO: {
    patient: { email: 'maria.gonzalez@syta.demo', password: 'paciente123' },
    admin: { email: 'admin@syta.demo', password: 'admin123' }
  },

  async login(email, password) {
    const user = Database.table('users').find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || user.password !== password) throw new Error('Correo o contraseña incorrectos.');
    let name = user.name;
    if (user.role === 'patient') {
      const p = Database.table('patients').find((x) => x.id === user.refId);
      if (!p) throw new Error('La cuenta no tiene un paciente asociado.');
      name = p.name;
    }
    const session = { email: user.email, role: user.role, refId: user.refId, name, position: user.position || 'Paciente', loginAt: new Date().toISOString() };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    return session;
  },

  current() {
    try {
      const s = JSON.parse(localStorage.getItem(this.SESSION_KEY));
      if (!s) return null;
      if (s.role === 'patient') {
        const p = Database.table('patients').find((x) => x.id === s.refId);
        if (!p) return null;
        s.name = p.name;
      }
      return s;
    } catch (e) {
      return null;
    }
  },

  logout() {
    localStorage.removeItem(this.SESSION_KEY);
  }
};
