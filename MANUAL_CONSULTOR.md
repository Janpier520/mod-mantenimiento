# Manual de Usuario — Rol Consultor

Sistema de Gestión de Mantenimiento de Equipos

Este manual describe el rol **consultor**: un perfil de **supervisión y análisis** con acceso de lectura a la operación y acceso pleno a reportes y proveedores. Para el ingreso inicial y uso general, consultá `MANUAL_USUARIO.md`.

---

## 1. Tu rol en el sistema

Como consultor observás el estado del parque de equipos, los tickets y el mantenimiento para informar decisiones, sin intervenir en la operación diaria. Podés además cerrar o cancelar tickets ya resueltos y gestionar la validación final.

**Podés:** ver todo el sistema, acceder a reportes, consultar proveedores, consultar inventario de repuestos, abrir/cerrar/cancelar tickets según corresponda.
**No podés:** crear ni editar equipos, tickets o planes; subir adjuntos; operar mantenimiento; crear o editar ítems de inventario; administrar usuarios ni configuración.

## 2. Dashboard

La pantalla inicial te da la foto del momento: equipos por estado, tickets abiertos/vencidos y mantenimientos pendientes. Es tu punto de partida antes de entrar al detalle.

## 3. Consulta de equipos

En **Equipos** podés buscar por modelo, marca o número de serie y filtrar por estado y tipo. Al abrir un equipo ves su ficha completa y el **historial de cambios de estado** (quién, cuándo, desde qué estado a cuál): útil para auditar la trazabilidad de un bien.

> La interfaz oculta los botones de creación/edición porque tu rol es de solo lectura aquí; el servidor también lo valida.

## 4. Tickets: supervisión y cierre

### Consultar

En **Tickets** tenés búsqueda, filtros por estado/prioridad y las etiquetas **Vencido** para lo que superó su SLA. El **Historial de Actividad** de cada ticket registra todo lo ocurrido con autor y fecha: es tu fuente de auditoría.

### Acciones disponibles

A diferencia de un técnico, vos no tomás ni resolvés tickets, pero sí manejás la **validación y el cierre del ciclo**:

| Acción       | Desde → Hacia                  | Cuándo usarla                                    |
| ------------ | ------------------------------ | ------------------------------------------------ |
| **Cerrar**   | Resuelto → Cerrado             | El ticket quedó resuelto y se valida el cierre.  |
| **Reabrir**  | Cerrado → Abierto              | El problema reapareció después del cierre.       |
| **Cancelar** | Abierto/En Proceso → Cancelado | El pedido perdió vigencia (duplicado, inviable). |

No podés crear tickets, editar sus datos ni pasarlos a En Proceso o Resuelto: eso corresponde a técnicos y administradores.

## 5. Mantenimiento preventivo (solo lectura)

En **Mantenimiento** podés revisar planes, tareas y ejecuciones, incluyendo el aviso de **ejecuciones vencidas**. No podés programar, completar, cancelar ni reprogramar ejecuciones: usá esta vista para seguimiento y control.

## 6. Inventario (solo lectura)

En **Inventario** podés consultar el catálogo de repuestos, su stock actual, ubicación y categoría. Los ítems con stock por debajo del mínimo se marcan con la etiqueta **Bajo**. El historial de **Movimientos** muestra cada entrada, salida y ajuste con autor y fecha.

> Tu rol es de solo lectura: no podés crear ítems, registrar movimientos ni modificar stock.

## 7. Proveedores

Acceso de lectura al catálogo completo de proveedores (razón social, contacto, datos fiscales) y su relación con los equipos. Las altas, ediciones y bajas las realiza el administrador.

## 8. Reportes

Tu herramienta principal. En **Reportes** encontrás:

- **Equipos por estado / por tipo**: composición y salud del inventario.
- **Tickets por estado / prioridad / mes**: demanda de soporte y su evolución.
- **Mantenimiento**: planes activos, ejecuciones vencidas y próximas de la semana.
- **Equipos con más tickets**: candidatos a reemplazo o revisión.
- **Usuarios por rol**: composición del equipo.

Usá estos indicadores para elaborar informes de gestión, justificar inversiones y detectar tendencias (por ejemplo, un tipo de equipo con fallas recurrentes).

## 9. Mis sesiones

Gestioná tus sesiones activas como cualquier usuario: revisalas periódicamente y cerrá las que no reconozcas.

## 10. Resumen de permisos

| Acción                                          | ¿Podés? |
| ----------------------------------------------- | :-----: |
| Ver dashboard, equipos, tickets y mantenimiento |    ✔    |
| Ver inventario de repuestos                     |    ✔    |
| Ver reportes                                    |    ✔    |
| Ver proveedores                                 |    ✔    |
| Cerrar / reabrir / cancelar tickets             |    ✔    |
| Crear o editar equipos                          |    —    |
| Crear o editar tickets                          |    —    |
| Pasar tickets a En Proceso / Resuelto           |    —    |
| Subir o eliminar adjuntos                       |    —    |
| Operar mantenimiento preventivo                 |    —    |
| Crear o editar ítems de inventario              |    —    |
| Registrar movimientos de stock                  |    —    |
| Gestionar usuarios, tipos, configuración        |    —    |
