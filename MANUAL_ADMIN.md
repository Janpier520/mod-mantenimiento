# Manual de Usuario — Rol Administrador

Sistema de Gestión de Mantenimiento de Equipos

Este manual cubre las funciones exclusivas del rol **administrador**: gestión de usuarios, catálogos, configuración, proveedores y reportes, además de las acciones ampliadas sobre tickets y equipos. Para el ingreso inicial y uso general, consultá `MANUAL_USUARIO.md`; el detalle operativo de equipos, tickets y mantenimiento está en `MANUAL_TECNICO.md` (el administrador puede hacer todo eso).

---

## 1. Tu rol en el sistema

Sos responsable de que el sistema esté bien configurado y de la **supervisión general**: administrás las cuentas de usuario, los catálogos base (tipos de equipo, proveedores), la configuración institucional y tenés visión completa mediante reportes. Además podés cerrar o cancelar tickets y dar de baja equipos.

## 2. Módulos exclusivos

### 2.1 Usuarios

1. Entrá a **Usuarios** en el menú lateral.
2. **Crear usuario**: presioná el botón de creación y completá nombre, apellido, email, nombre de usuario, contraseña y **rol** (`admin`, `tecnico` o `consultor`).
3. Las **preguntas de seguridad son obligatorias** al crear: elegí dos preguntas y sus respuestas. Sin ellas, el usuario no podrá recuperar su contraseña.
4. **Editar**: cambiá datos, rol o estado activo. Las respuestas de seguridad se guardan cifradas.
5. **Eliminar**: el sistema bloquea el borrado si el usuario tiene referencias (tickets asignados, ejecuciones realizadas, historial). El mensaje te indicará qué resolver primero.

> Entregá las credenciales iniciales por un canal seguro y pedile al usuario que las cambie pronto.

### 2.2 Tipos de Equipo

Catálogo usado al dar de alta equipos (PC, Notebook, Impresora, etc.).

- Creá, editá o eliminá tipos desde **Tipos de Equipo**.
- No podrá eliminarse un tipo que tenga equipos asociados.

### 2.3 Proveedores

- Visible también para consultores (solo lectura), pero **solo el administrador crea, edita y elimina**.
- Registrá razón social, contacto y datos fiscales; los proveedores se asocian a los equipos en su ficha.

### 2.4 Configuración

Parámetros globales del sistema:

| Clave                       | Uso                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| `email_contacto`            | Email institucional mostrado al sistema.                                                     |
| `telefono_contacto`         | Teléfono de contacto.                                                                        |
| `direccion_sede`            | Dirección de la sede.                                                                        |
| `alerta_dias_mantenimiento` | Anticipación (en días) prevista para alertas de mantenimiento próximo (parámetro reservado). |

Guardá con **Guardar Cambios**; los cambios aplican de inmediato.

## 3. Reportes

En **Reportes** encontrás indicadores y gráficos para la toma de decisiones:

- **Equipos por estado** y **por tipo**: composición del inventario.
- **Tickets por estado**, **por prioridad** y **por mes**: evolución de la demanda de soporte.
- **Mantenimiento**: total de planes, ejecuciones vencidas y próximas a vencer esta semana.
- **Equipos con más tickets**: candidatos a reemplazo.
- **Usuarios por rol**: composición del equipo de trabajo.

Usalos en reuniones de gestión para justificar compras, redistribuir carga o detectar equipos problemáticos.

## 4. Acciones ampliadas sobre tickets

Además de todo lo que hace un técnico (crear, tomar, resolver, reabrir, adjuntos), como administrador podés:

| Acción       | Desde → Hacia                  | Cuándo usarla                                     |
| ------------ | ------------------------------ | ------------------------------------------------- |
| **Cerrar**   | Resuelto → Cerrado             | Validación final del ticket resuelto.             |
| **Reabrir**  | Cerrado → Abierto              | Reapareció el problema tras el cierre.            |
| **Cancelar** | Abierto/En Proceso → Cancelado | El pedido quedó sin efecto (duplicado, inviable). |

`Cancelado` es un estado final: no admite más transiciones.

## 5. Acciones ampliadas sobre equipos

- Podés cambiar cualquier equipo a **Dado de Baja** (estado final) cuando se descarta el bien.
- Recordá que un equipo con tickets o planes asociados no puede eliminarse: primero resolvé esas referencias.

## 6. Mantenimiento preventivo

Compartís con los técnicos la operación completa: crear planes y tareas, programar ejecuciones, registrar resultados (con auto-programación de la próxima corrida), cancelar y reprogramar. Vigilá el panel de **ejecuciones vencidas** y el parámetro `alerta_dias_mantenimiento` para anticiparte.

## 7. Inventario

Además de ver y buscar ítems (como cualquier rol), como administrador podés:

- **Crear, editar y eliminar** ítems de inventario.
- **Registrar movimientos** de entrada (compra), salida (uso) y ajuste (inventario físico).
- **Gestionar categorías y ubicaciones** del almacén.
- **Configurar stock mínimo** para alertas de bajo stock.

Los técnicos registran automáticamente movimientos de salida al completar ejecuciones de PM con piezas utilizadas.

## 8. Mis sesiones

Como administrador podés revisar tus propias sesiones activas y revocarlas. Cada usuario gestiona las suyas desde su mismo módulo.

## 9. Resumen de permisos

| Acción                                             | ¿Podés? |
| -------------------------------------------------- | :-----: |
| Todo lo del rol técnico                            |    ✔    |
| Gestionar usuarios (con preguntas de seguridad)    |    ✔    |
| Gestionar tipos de equipo                          |    ✔    |
| Gestionar proveedores (alta/edición/baja)          |    ✔    |
| Editar configuración del sistema                   |    ✔    |
| Ver reportes                                       |    ✔    |
| Cerrar / cancelar / reabrir tickets                |    ✔    |
| Dar de baja equipos                                |    ✔    |
| Gestionar inventario completo (CRUD + movimientos) |    ✔    |
