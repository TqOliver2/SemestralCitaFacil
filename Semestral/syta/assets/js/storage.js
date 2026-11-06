/* =========================================================
   Syta · Persistencia local (localStorage)
   ---------------------------------------------------------
   Único punto de acceso al almacenamiento. En la fase 2 este
   módulo dejará de usarse: los servicios realizarán peticiones
   HTTP al microservicio de citas en lugar de leer/escribir aquí.
   ========================================================= */
'use strict';

const Database = (() => {
  const KEY = 'syta_db_v1';
  let db = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      db = raw ? JSON.parse(raw) : null;
    } catch (e) {
      db = null;
    }
    if (!db || db.version !== 1) {
      db = SeedData.build();
      persist();
    }
    return db;
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (e) {
      console.warn('[Syta] No se pudo guardar en localStorage:', e);
    }
  }

  function reset() {
    db = SeedData.build();
    persist();
  }

  function table(name) {
    if (!db) load();
    return db[name];
  }

  /** Genera identificadores únicos y legibles, p. ej. CIT-0021 */
  function nextId(sequence, prefix, length = 4) {
    if (!db) load();
    db.sequences[sequence] = (db.sequences[sequence] || 0) + 1;
    return `${prefix}-${String(db.sequences[sequence]).padStart(length, '0')}`;
  }

  return { load, persist, reset, table, nextId };
})();
