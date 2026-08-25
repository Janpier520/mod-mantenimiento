# Manual de Usuario — Primeros Pasos

Sistema de Gestión de Mantenimiento de Equipos

Bienvenido/a. Este manual está pensado para quien ingresa al sistema por primera vez. Explica cómo acceder, cómo recuperar tu contraseña si la olvidás y cómo orientarte en la interfaz. Para las funciones específicas de tu rol, consultá el manual correspondiente (`MANUAL_ADMIN.md`, `MANUAL_TECNICO.md` o `MANUAL_CONSULTOR.md`).

---

## 1. ¿Qué es este sistema?

Es una aplicación que gestiona el ciclo de vida de los equipos informáticos de la organización:

- **Inventario de equipos**: altas, estados, ubicación, proveedor e historial de cambios.
- **Tickets de soporte**: reporte y seguimiento de fallas e incidencias, con prioridad, SLA (fecha límite) e historial de actividad.
- **Mantenimiento preventivo**: planes con tareas periódicas, ejecuciones programadas y registro de resultados.
- **Reportes**: indicadores y gráficos para la toma de decisiones.

## 2. Antes de empezar

Necesitás:

- Un navegador web moderno (Chrome, Edge, Firefox).
- Un **usuario y contraseña** provistos por el administrador del sistema.
- Tu cuenta tiene un **rol** asignado que define qué módulos ves y qué acciones podés realizar.

> Si no tenés credenciales, solicitálas al administrador. Las contraseñas se guardan cifradas: nadie puede verla ni reenviártela.

## 3. Iniciar sesión

1. Abrí la dirección del sistema en tu navegador.
2. Si no estás autenticado, serás redirigido automáticamente a la pantalla **Iniciar Sesión**.
3. Ingresá tu **nombre de usuario** y **contraseña**.
4. Presioná **Ingresar**.

Si te equivocás, verás un mensaje de error. Por seguridad, los intentos repetidos están limitados (protección contra fuerza bruta).

## 4. Recuperar la contraseña

Si olvidaste tu contraseña, podés restablecerla con tus **preguntas de seguridad** (fueron registradas cuando se creó tu usuario):

1. En la pantalla de login, presioná **¿Olvidaste tu contraseña?**
2. **Paso 1**: ingresá tu nombre de usuario.
3. **Paso 2**: respondé las preguntas de seguridad tal como las registraste.
4. Si las respuestas son correctas, definí una **contraseña nueva** y confirmala.

> Consejos para una buena contraseña: mínimo 8 caracteres, combiná letras mayúsculas, minúsculas, números y símbolos. No reutilices contraseñas de otros servicios.

## 5. Conocer la interfaz

Una vez dentro, la pantalla se divide en tres zonas:

| Zona                          | Descripción                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| **Barra lateral (izquierda)** | Menú de navegación. Solo ves los módulos habilitados para tu rol.                     |
| **Barra superior (derecha)**  | Tu nombre y rol, alternador de **tema claro/oscuro** y botón de **cierre de sesión**. |
| **Contenido central**         | El módulo activo: listados con búsqueda, filtros y paginación.                        |

### Tema claro / oscuro

Presioná el ícono de luna/sol en la barra superior. El sistema recuerda tu preferencia para próximas visitas.

### Cerrar sesión

Presioná **Salir** en la barra superior al terminar tu turno, especialmente en computadoras compartidas.

## 6. ¿Qué ve cada rol?

| Módulo          | Administrador | Técnico |          Consultor           |
| --------------- | :-----------: | :-----: | :--------------------------: |
| Dashboard       |       ✔       |    ✔    |              ✔               |
| Equipos         |       ✔       |    ✔    |         Solo lectura         |
| Tickets         |       ✔       |    ✔    | Lectura + cierre/cancelación |
| Mantenimiento   |       ✔       |    ✔    |         Solo lectura         |
| Inventario      |       ✔       |    ✔    |         Solo lectura         |
| Proveedores     |       ✔       |    —    |         Solo lectura         |
| Reportes        |       ✔       |    —    |              ✔               |
| Usuarios        |       ✔       |    —    |              —               |
| Configuración   |       ✔       |    —    |              —               |
| Tipos de Equipo |       ✔       |    —    |              —               |
| Mis Sesiones    |       ✔       |    ✔    |              ✔               |

## 7. Mis sesiones

En el menú **Mis Sesiones** podés ver todos los dispositivos/navegadores con tu sesión abierta, cuándo se inició y cuándo expira. Si detectás una sesión que no reconocés, cerrala con el botón correspondiente y cambiá tu contraseña de inmediato.

Las sesiones expiran solas tras un período de inactividad y se renuevan automáticamente mientras usás el sistema.

## 8. Glosario rápido

| Término                   | Significado                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Equipo**                | Bien inventariado (PC, notebook, impresora, etc.) con número de serie único.                               |
| **Ticket**                | Reporte de una falla o pedido de soporte sobre un equipo.                                                  |
| **Prioridad**             | Urgencia del ticket: baja, media, alta o crítica. Define la fecha límite de resolución (SLA).              |
| **SLA / Fecha límite**    | Plazo máximo para resolver un ticket según su prioridad (crítica = 1 día, alta = 3, media = 7, baja = 14). |
| **Plan de mantenimiento** | Conjunto de tareas periódicas asociadas a un equipo.                                                       |
| **Ejecución**             | Una corrida concreta de un plan, con fecha programada y resultado.                                         |

## 9. Problemas frecuentes

| Problema                       | Qué hacer                                                                |
| ------------------------------ | ------------------------------------------------------------------------ |
| "Credenciales inválidas"       | Verificá usuario y contraseña (sin mayúsculas accidentales).             |
| Olvidé mi contraseña           | Usá **¿Olvidaste tu contraseña?** y respondé tus preguntas de seguridad. |
| No veo un módulo del menú      | Tu rol no lo incluye. Consultá al administrador.                         |
| La página quedó desactualizada | Refrescá el navegador (F5).                                              |
| Creo que alguien usó mi cuenta | Cerrá todas las sesiones desde **Mis Sesiones** y cambiá tu contraseña.  |
