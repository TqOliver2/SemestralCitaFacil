/* =========================================================
   Syta · Utilidades generales y componentes de UI
   (fechas, formato, Toast, Modal, Confirm)
   ========================================================= */
'use strict';

const Utils = (() => {
  const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  const STATUS = {
    confirmada: { label: 'Confirmada', cls: 'badge--success', icon: 'check-circle-2', color: '#16a34a' },
    cancelada: { label: 'Cancelada', cls: 'badge--danger', icon: 'x-circle', color: '#dc2626' },
    atendida: { label: 'Atendida', cls: 'badge--info', icon: 'clipboard-check', color: '#4f46e5' }
  };

  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  const todayISO = () => toISO(new Date());
  const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
  const weekday = (iso) => parseISO(iso).getDay();
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const formatDate = (iso) => {
    const d = parseISO(iso);
    return `${pad(d.getDate())} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  };
  const formatDateLong = (iso) => capitalize(parseISO(iso).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }));
  const formatDateTime = (isoString) => {
    const d = new Date(isoString);
    return `${formatDate(toISO(d))}, ${formatTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`)}`;
  };
  const timeToMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const minToTime = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const formatTime = (t) => {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'p. m.' : 'a. m.';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${pad(m)} ${suffix}`;
  };
  const isPast = (date, time = '23:59') => {
    const d = parseISO(date);
    const [h, m] = time.split(':').map(Number);
    d.setHours(h, m, 0, 0);
    return d.getTime() < Date.now();
  };
  const relativeDay = (iso) => {
    const diff = Math.round((parseISO(iso) - parseISO(todayISO())) / 86400000);
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Mañana';
    if (diff === -1) return 'Ayer';
    return diff > 0 ? `En ${diff} días` : `Hace ${Math.abs(diff)} días`;
  };
  const timeAgo = (isoString) => {
    const mins = Math.round((Date.now() - new Date(isoString).getTime()) / 60000);
    if (mins < 1) return 'Justo ahora';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.round(hours / 24);
    return days === 1 ? 'Ayer' : `Hace ${days} días`;
  };
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const escapeHTML = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const initials = (name = '') => name.replace(/^(Dr\.|Dra\.)\s*/i, '').split(/\s+/).filter(Boolean)
    .slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const plural = (n, s, p) => `${n} ${n === 1 ? s : (p || s + 's')}`;

  const statusBadge = (status) => {
    const s = STATUS[status] || { label: status, cls: 'badge--neutral', icon: 'circle' };
    return `<span class="badge ${s.cls}"><i data-lucide="${s.icon}"></i>${s.label}</span>`;
  };
  const daysSummary = (days = []) => {
    const sorted = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    return sorted.map((d) => DAYS_SHORT[d]).join(', ') || 'Sin días';
  };
  const weekDaysHTML = (days = []) => [1, 2, 3, 4, 5, 6, 0]
    .map((d) => `<span class="${days.includes(d) ? 'on' : ''}" title="${DAYS[d]}">${DAYS_SHORT[d][0]}</span>`).join('');

  const icons = () => { if (window.lucide) window.lucide.createIcons(); };

  const download = (filename, content, mime = 'text/csv;charset=utf-8') => {
    const blob = new Blob(['\ufeff' + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const emptyState = (icon, title, text, actionHTML = '') => `
    <div class="empty">
      <div class="empty__icon"><i data-lucide="${icon}"></i></div>
      <h4>${title}</h4><p class="text-sm">${text}</p>${actionHTML}
    </div>`;

  return {
    DAYS, DAYS_SHORT, MONTHS_SHORT, STATUS, pad, toISO, parseISO, todayISO, addDays, weekday,
    formatDate, formatDateLong, formatDateTime, formatTime, timeToMin, minToTime, isPast, relativeDay,
    timeAgo, greeting, escapeHTML, initials, isEmail, debounce, plural, statusBadge, daysSummary,
    weekDaysHTML, icons, download, emptyState, capitalize
  };
})();

/* ---------------- Toast ---------------- */
const Toast = {
  show(message, type = 'success', title) {
    const root = document.getElementById('toast-root');
    const icons = { success: 'check-circle-2', error: 'alert-circle', warning: 'alert-triangle', info: 'info' };
    const titles = { success: 'Listo', error: 'No se pudo completar', warning: 'Atención', info: 'Información' };
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `
      <div class="toast__icon"><i data-lucide="${icons[type]}"></i></div>
      <div class="toast__body"><strong>${Utils.escapeHTML(title || titles[type])}</strong><p>${Utils.escapeHTML(message)}</p></div>
      <button type="button" class="toast__close" aria-label="Cerrar notificación"><i data-lucide="x"></i></button>`;
    root.appendChild(el);
    Utils.icons();
    const remove = () => { el.classList.add('toast--leave'); setTimeout(() => el.remove(), 250); };
    el.querySelector('.toast__close').addEventListener('click', remove);
    setTimeout(remove, 4500);
  },
  success(m, t) { this.show(m, 'success', t); },
  error(m, t) { this.show(m, 'error', t); },
  warning(m, t) { this.show(m, 'warning', t); },
  info(m, t) { this.show(m, 'info', t); }
};

/* ---------------- Modal ---------------- */
const Modal = {
  _el: null,
  _onClose: null,
  _keyHandler: null,

  /**
   * @param {Object} o
   * @param {string} o.title
   * @param {string} [o.subtitle]
   * @param {string} [o.icon]
   * @param {string} o.body       HTML del cuerpo
   * @param {'sm'|'md'|'lg'} [o.size]
   * @param {Array<{label:string, className?:string, icon?:string, onClick?:Function}>} [o.actions]
   *        onClick puede ser async; si retorna false el modal permanece abierto.
   * @param {Function} [o.onOpen]  recibe el elemento del modal
   * @param {Function} [o.onClose]
   */
  open({ title, subtitle = '', icon = '', body = '', size = 'md', actions = [], onOpen, onClose }) {
    this.close(true);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal modal--${size}" role="dialog" aria-modal="true" aria-label="${Utils.escapeHTML(title)}">
        ${title ? `
        <div class="modal__head">
          ${icon ? `<div class="modal__icon"><i data-lucide="${icon}"></i></div>` : ''}
          <div class="modal__titles">
            <h3 class="modal__title">${title}</h3>
            ${subtitle ? `<p class="modal__subtitle">${subtitle}</p>` : ''}
          </div>
          <button type="button" class="modal__close" data-close aria-label="Cerrar"><i data-lucide="x"></i></button>
        </div>` : ''}
        <div class="modal__body">${body}</div>
        ${actions.length ? `<div class="modal__foot">${actions.map((a, i) => `
          <button type="button" class="btn ${a.className || 'btn--secondary'}" data-action="${i}">
            ${a.icon ? `<i data-lucide="${a.icon}"></i>` : ''}${a.label}
          </button>`).join('')}</div>` : ''}
      </div>`;

    document.getElementById('modal-root').appendChild(overlay);
    this._el = overlay;
    this._onClose = onClose || null;

    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) this.close(); });
    overlay.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => this.close()));
    overlay.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const action = actions[Number(btn.dataset.action)];
        btn.disabled = true;
        let result;
        try { result = action.onClick ? await action.onClick(overlay) : undefined; }
        finally { btn.disabled = false; }
        if (result !== false && this._el === overlay) this.close();
      });
    });
    this._keyHandler = (e) => { if (e.key === 'Escape') this.close(); };
    document.addEventListener('keydown', this._keyHandler);
    document.body.style.overflow = 'hidden';

    Utils.icons();
    if (onOpen) onOpen(overlay);
    const first = overlay.querySelector('.modal__body input:not([type=hidden]):not([readonly]), .modal__body select, .modal__body textarea');
    if (first) setTimeout(() => first.focus(), 50);
    return overlay;
  },

  close(silent = false) {
    if (!this._el) return;
    this._el.remove();
    this._el = null;
    document.removeEventListener('keydown', this._keyHandler);
    document.body.style.overflow = '';
    const cb = this._onClose;
    this._onClose = null;
    if (!silent && cb) cb();
  }
};

/* ---------------- Confirmación ---------------- */
function Confirm({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', variant = 'danger', icon = 'alert-triangle' }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    Modal.open({
      size: 'sm',
      body: `
        <div class="confirm">
          <div class="confirm__icon confirm__icon--${variant}"><i data-lucide="${icon}"></i></div>
          <h3>${title}</h3>
          <p>${message}</p>
        </div>`,
      actions: [
        { label: cancelText, className: 'btn--ghost', onClick: () => finish(false) },
        { label: confirmText, className: variant === 'danger' ? 'btn--danger' : 'btn--primary', onClick: () => finish(true) }
      ],
      onClose: () => finish(false)
    });
  });
}
