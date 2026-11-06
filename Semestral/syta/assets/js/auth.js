/* =========================================================
   Syta · Pantalla de inicio de sesión (UI)
   ========================================================= */
'use strict';

const Auth = {
  init() {
    const form = document.getElementById('login-form');
    const email = document.getElementById('login-email');
    const password = document.getElementById('login-password');
    const toggle = document.getElementById('toggle-password');

    toggle.addEventListener('click', () => {
      const show = password.type === 'password';
      password.type = show ? 'text' : 'password';
      toggle.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
      toggle.innerHTML = `<i data-lucide="${show ? 'eye-off' : 'eye'}"></i>`;
      Utils.icons();
    });

    [email, password].forEach((input) => input.addEventListener('input', () => this.setError(input.closest('.field'), '')));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ok = this.validate(email, password);
      if (!ok) return;
      try {
        const session = await AuthService.login(email.value, password.value);
        form.reset();
        password.type = 'password';
        App.enter(session);
        Toast.success(`Sesión iniciada como ${session.role === 'admin' ? 'administrador' : 'paciente'}.`, `¡Hola, ${session.name.split(' ')[0]}!`);
      } catch (err) {
        this.setError(password.closest('.field'), err.message);
        Toast.error(err.message);
      }
    });

    document.querySelectorAll('[data-demo]').forEach((btn) => btn.addEventListener('click', () => {
      const creds = AuthService.DEMO[btn.dataset.demo];
      email.value = creds.email;
      password.value = creds.password;
      form.requestSubmit();
    }));

    document.getElementById('reset-demo').addEventListener('click', async () => {
      const ok = await Confirm({
        title: '¿Restablecer datos?',
        message: 'Se eliminarán las citas, profesionales y cambios realizados, y se cargarán nuevamente los datos de demostración.',
        confirmText: 'Restablecer', icon: 'rotate-ccw'
      });
      if (!ok) return;
      Database.reset();
      Toast.success('Los datos de demostración fueron restablecidos.');
    });
  },

  validate(email, password) {
    let ok = true;
    if (!email.value.trim()) { this.setError(email.closest('.field'), 'Ingresa tu correo electrónico.'); ok = false; }
    else if (!Utils.isEmail(email.value.trim())) { this.setError(email.closest('.field'), 'El formato del correo no es válido.'); ok = false; }
    if (!password.value) { this.setError(password.closest('.field'), 'Ingresa tu contraseña.'); ok = false; }
    else if (password.value.length < 6) { this.setError(password.closest('.field'), 'La contraseña debe tener al menos 6 caracteres.'); ok = false; }
    return ok;
  },

  setError(field, msg) {
    field.classList.toggle('has-error', !!msg);
    field.querySelector('.field-error').textContent = msg;
  }
};
