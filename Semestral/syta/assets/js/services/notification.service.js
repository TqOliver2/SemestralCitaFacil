/* =========================================================
   Syta · Servicio de notificaciones (simuladas)
   No envía correos: solo registra avisos visibles en la UI.
   userKey = id del paciente (PAC-xxx) o 'admin'.
   ========================================================= */
'use strict';

const NotificationService = {
  async list(userKey, limit) {
    const items = Database.table('notifications')
      .filter((n) => n.userKey === userKey)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return limit ? items.slice(0, limit) : items;
  },

  async unreadCount(userKey) {
    return Database.table('notifications').filter((n) => n.userKey === userKey && !n.read).length;
  },

  /** Registro interno usado por otros servicios (no persiste por sí mismo). */
  push(userKey, { title, message, type = 'info' }) {
    const n = {
      id: Database.nextId('notifications', 'NOT'),
      userKey, title, message, type, read: false, createdAt: new Date().toISOString()
    };
    Database.table('notifications').push(n);
    return n;
  },

  async markAllRead(userKey) {
    Database.table('notifications').forEach((n) => { if (n.userKey === userKey) n.read = true; });
    Database.persist();
  },

  async clear(userKey) {
    const list = Database.table('notifications');
    for (let i = list.length - 1; i >= 0; i--) if (list[i].userKey === userKey) list.splice(i, 1);
    Database.persist();
  }
};
