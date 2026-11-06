# Syta · Gestión de Citas Médicas — Fase 1 (Frontend)

Aplicación web de gestión de citas médicas desarrollada con **HTML5, CSS3 y JavaScript Vanilla**.
En esta fase no existe backend: los datos son ficticios y se guardan en `localStorage`.

## Cómo ejecutar
1. Abrir la carpeta `syta/` en Visual Studio Code.
2. Clic derecho sobre `index.html` → **Open with Live Server**.

## Cuentas de demostración
| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@syta.demo | admin123 |
| Paciente | maria.gonzalez@syta.demo | paciente123 |
| Paciente | carlos.medina@syta.demo | paciente123 |
| Paciente | lucia.pinto@syta.demo | paciente123 |
| Paciente | roberto.salas@syta.demo | paciente123 |

También hay botones de acceso rápido en la pantalla de inicio de sesión y un enlace para **restablecer los datos de demostración**.

## Estructura
```
syta/
├── index.html
├── assets/
│   ├── css/  styles.css (base y layout) · components.css (componentes) · responsive.css
│   ├── img/  logo.svg
│   └── js/
│       ├── utils.js          Utilidades, Toast, Modal, Confirm
│       ├── data.js           Datos semilla ficticios (fechas relativas a hoy)
│       ├── storage.js        "Database" en memoria + persistencia localStorage
│       ├── services/         LÓGICA DE NEGOCIO (reemplazable por HTTP en fase 2)
│       │   ├── auth.service.js · appointment.service.js · professional.service.js
│       │   ├── schedule.service.js · patient.service.js · notification.service.js
│       ├── navigation.js     Menús y enrutado por rol
│       ├── auth.js           Pantalla de login
│       ├── appointments.js   Reserva de citas, Mis citas, detalle/cancelación
│       ├── patient.js        Inicio, historial y perfil del paciente
│       ├── admin.js          Dashboard, agenda, pacientes, reportes
│       ├── professionals.js  Gestión de profesionales
│       ├── schedules.js      Gestión de horarios
│       └── app.js            Arranque, sesión y notificaciones
└── README.md
```

## Funcionalidades
- **Paciente:** dashboard con indicadores, reserva paso a paso (especialidad → profesional → fecha → horario → resumen), horarios disponibles/ocupados/pasados, mis citas (detalle y cancelación con confirmación), historial, perfil editable, notificaciones simuladas.
- **Administrador:** dashboard (totales, agenda del día, próximas citas, actividad), agenda con filtros (fecha, profesional, especialidad, estado, búsqueda) y cambio de estado, gestión de profesionales (registrar, editar, activar/desactivar, consultar), gestión de horarios (días, inicio, fin, intervalo, vista previa y ocupación), pacientes y reportes con exportación CSV.
- **Reglas:** no se permiten reservas duplicadas (mismo profesional/fecha/hora), ni horarios ocupados o pasados; al cancelar, el horario se libera.

## Preparación para el microservicio (fase 2)
Las vistas solo llaman a los servicios de `assets/js/services/`, cuyos métodos son `async` y devuelven
objetos planos con identificadores únicos (`CIT-xxxx`, `PRO-xxx`, `PAC-xxx`). Para conectar la API REST
bastará con reemplazar el cuerpo de cada método por una llamada `fetch`, sin modificar la interfaz.
