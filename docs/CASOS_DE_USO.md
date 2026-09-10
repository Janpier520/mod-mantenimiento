# Casos de Uso — Módulo Mantenimiento de Equipos

> Sistema ERP de gestión de mantenimiento de equipos.
> Versión: 1.0 | Última actualización: 2026-09-08

---

## Índice

1. [Actores del Sistema](#1-actores-del-sistema)
2. [Autenticación y Autorización](#2-autenticación-y-autorización)
3. [Gestión de Usuarios](#3-gestión-de-usuarios)
4. [Gestión de Equipos](#4-gestión-de-equipos)
5. [Gestión de Tickets/Incidencias](#5-gestión-de-ticketsincidencias)
6. [Mantenimiento Preventivo](#6-mantenimiento-preventivo)
7. [Inventario y Repuestos](#7-inventario-y-repuestos)
8. [Gestión de Proveedores](#8-gestión-de-proveedores)
9. [Reportes y Estadísticas](#9-reportes-y-estadísticas)
10. [Configuración del Sistema](#10-configuración-del-sistema)
11. [Dashboard](#11-dashboard)
12. [Gestión de Sesiones](#12-gestión-de-sesiones)
13. [Matriz de Permisos por Rol](#13-matriz-de-permisos-por-rol)
14. [Diagramas de Estado](#14-diagramas-de-estado)

---

## 1. Actores del Sistema

| Actor | Descripción | Permisos principales |
|-------|-------------|---------------------|
| **admin** | Administrador del sistema | Acceso total: CRUD de usuarios, configuración, todos los dominios |
| **tecnico** | Técnico de mantenimiento | CRUD de equipos, tickets, mantenimiento, inventario; solo lectura de usuarios/reportes |
| **consultor** | Consultor externo | Solo lectura de equipos, tickets, mantenimiento, inventario; CRUD de proveedores no; acceso a reportes |

---

## 2. Autenticación y Autorización

### UC-AUTH-001: Iniciar Sesión

| Campo | Valor |
|-------|-------|
| **ID** | UC-AUTH-001 |
| **Nombre** | Iniciar Sesión |
| **Actor** | Cualquier usuario |
| **Precondiciones** | El usuario no tiene una sesión activa |
| **Postcondiciones** | Sesión creada, cookie httponly establecida, redirect a `/` |

**Flujo principal:**
1. El usuario navega a `/login`.
2. Ingresa `username` y `password`.
3. El sistema valida credenciales con bcrypt.
4. El sistema genera un token UUID y lo almacena en la tabla `sessions` con TTL de 24h.
5. El sistema establece cookie httponly (`overhaul-session`).
6. El sistema redirige a `/`.

**Flujos alternativos:**
- **EA-1: Credenciales incorrectas** → El sistema muestra "Credenciales inválidas". Se incrementa el contador de intentos fallidos.
- **EA-2: Rate limiting (5 intentos/15min)** → El sistema retorna HTTP 429 con mensaje "Demasiados intentos fallidos. Intentá de nuevo en X minutos."
- **EA-3: Cuenta desactivada** → El sistema muestra "Esta cuenta está desactivada."
- **EA-4: Ya tiene sesión activa** → Redirect automático a `/`.

---

### UC-AUTH-002: Cerrar Sesión

| Campo | Valor |
|-------|-------|
| **ID** | UC-AUTH-002 |
| **Nombre** | Cerrar Sesión |
| **Actor** | Cualquier usuario autenticado |
| **Precondiciones** | Sesión activa |
| **Postcondiciones** | Sesión eliminada de DB, cookie borrada |

**Flujo principal:**
1. El usuario presiona "Cerrar sesión" en el topbar.
2. El sistema elimina la sesión de la DB.
3. El sistema borra la cookie.
4. Redirect a `/login`.

---

### UC-AUTH-003: Solicitar Recuperación de Contraseña

| Campo | Valor |
|-------|-------|
| **ID** | UC-AUTH-003 |
| **Nombre** | Solicitar Recuperación de Contraseña |
| **Actor** | Cualquier usuario |
| **Precondiciones** | Ninguna |
| **Postcondiciones** | Redirect a formulario de reset con username en URL |

**Flujo principal:**
1. El usuario navega a `/auth/forgot-password`.
2. Ingresa su `username`.
3. El sistema verifica si el usuario existe.
4. Redirige a `/auth/reset-password?username=X`.

**Flujos alternativos:**
- **EA-1: Usuario no encontrado** → El sistema muestra "Usuario no encontrado."
- **EA-2: Rate limiting (3 intentos/15min)** → El sistema muestra error de límite excedido.

---

### UC-AUTH-004: Restablecer Contraseña

| Campo | Valor |
|-------|-------|
| **ID** | UC-AUTH-004 |
| **Nombre** | Restablecer Contraseña |
| **Actor** | Cualquier usuario |
| **Precondiciones** | El usuario completó UC-AUTH-003 |
| **Postcondiciones** | Contraseña actualizada, todas las sesiones del usuario invalidadas |

**Flujo principal:**
1. El usuario está en `/auth/reset-password?username=X`.
2. Ingresa respuesta 1, respuesta 2, nueva contraseña y confirmación.
3. El sistema valida ambas respuestas de seguridad (bcrypt).
4. El sistema valida la fortaleza de la contraseña (6-128 chars).
5. El sistema hashea la contraseña y actualiza el usuario.
6. El sistema invalida TODAS las sesiones existentes del usuario.
7. Redirect a `/login`.

**Flujos alternativos:**
- **EA-1: Respuestas incorrectas** → El sistema muestra error de validación.
- **EA-2: Contraseñas no coinciden** → El sistema muestra "Las contraseñas no coinciden."
- **EA-3: Contraseña débil** → El sistema muestra requisitos de longitud.

---

### UC-AUTH-005: Guard de Autenticación (hooks.server.ts)

| Campo | Valor |
|-------|-------|
| **ID** | UC-AUTH-005 |
| **Nombre** | Guard de Autenticación por Ruta |
| **Actor** | Sistema (automático) |
| **Precondiciones** | Request HTTP entrante |
| **Postcondiciones** | Request permitido o redirigido |

**Flujo principal:**
1. El sistema intercepta cada request.
2. Valida la cookie de sesión contra la DB.
3. Si el usuario está desactivado → redirect a `/login`.
4. Si >50% del TTL ha pasado → extiende la sesión (sliding window).
5. Verifica permisos de rol según prefijo de ruta.
6. Si no tiene permiso → redirect a `/`.

**Rutas públicas:** `/login`, `/auth/forgot-password`, `/auth/reset-password`
**Rutas admin-only:** `/usuarios`, `/config`
**Rutas admin+consultor:** `/proveedores`, `/reportes`

---

## 3. Gestión de Usuarios

### UC-USER-001: Listar Usuarios

| Campo | Valor |
|-------|-------|
| **ID** | UC-USER-001 |
| **Nombre** | Listar Usuarios |
| **Actor** | admin |
| **Precondiciones** | Sesión activa con rol admin |
| **Postcondiciones** | Lista paginada de usuarios mostrada |

**Flujo principal:**
1. El admin navega a `/usuarios`.
2. El sistema carga la lista de usuarios con filtros (nombre, apellido, email, username, rol, activo).
3. Se aplica paginación (10 por página).
4. Se muestra la tabla con campos: id, username, email, nombre, apellido, rol, activo, created_at, updated_at.

---

### UC-USER-002: Crear Usuario

| Campo | Valor |
|-------|-------|
| **ID** | UC-USER-002 |
| **Nombre** | Crear Usuario |
| **Actor** | admin |
| **Precondiciones** | Sesión activa con rol admin |
| **Postcondiciones** | Usuario creado en la DB |

**Flujo principal:**
1. El admin completa el formulario con: username, email, nombre, apellido, password, 2 preguntas de seguridad + respuestas, rol.
2. El sistema valida:
   - Username único (3-50 chars, alfanumérico + `_.-`)
   - Email único y formato válido
   - Password: 6-128 chars
   - Rol válido (`admin`, `tecnico`, `consultor`)
   - Campos requeridos no vacíos
3. El sistema hashea la contraseña (bcrypt, 10 rounds).
4. El sistema hashea las respuestas de seguridad.
5. El sistema inserta el usuario.

**Flujos alternativos:**
- **EA-1: Username duplicado** → Error "El nombre de usuario ya está en uso."
- **EA-2: Email duplicado** → Error "El email ya está registrado."
- **EA-3: Campos requeridos faltantes** → Errores de validación por campo.

---

### UC-USER-003: Actualizar Usuario

| Campo | Valor |
|-------|-------|
| **ID** | UC-USER-003 |
| **Nombre** | Actualizar Usuario |
| **Actor** | admin |
| **Precondiciones** | Sesión activa con rol admin, usuario existe |
| **Postcondiciones** | Usuario actualizado en la DB |

**Flujo principal:**
1. El admin edita los campos del usuario.
2. El sistema valida mismas reglas que creación (excepto username inmutable).
3. Si se ingresa nueva contraseña → se hashea y reemplaza.
4. Si se dejan respuestas de seguridad vacías → se mantienen las actuales.
5. El sistema actualiza el registro.

**Flujos alternativos:**
- **EA-1: Desactivar último admin activo** → Error "No se puede desactivar el último administrador activo."
- **EA-2: Cambiar rol del último admin activo** → Error "No se puede cambiar el rol del último administrador activo."
- **EA-3: Email duplicado (excluyendo actual)** → Error de duplicación.

---

### UC-USER-004: Eliminar Usuario

| Campo | Valor |
|-------|-------|
| **ID** | UC-USER-004 |
| **Nombre** | Eliminar Usuario |
| **Actor** | admin |
| **Precondiciones** | Sesión activa con rol admin, usuario existe |
| **Postcondiciones** | Usuario eliminado de la DB (hard delete) |

**Flujo principal:**
1. El admin selecciona eliminar un usuario.
2. El sistema verifica que no sea el usuario actual (`actor.id !== id`).
3. El sistema verifica que no sea el último admin activo.
4. El sistema verifica que no tenga referencias en: tickets, ejecuciones de PM, comentarios, adjuntos, historial de estados, activity log.
5. El sistema elimina el usuario.

**Flujos alternativos:**
- **EA-1: Intento de auto-eliminación** → Error "No podés eliminarte a vos mismo."
- **EA-2: Último admin activo** → Error "No se puede eliminar el último administrador activo."
- **EA-3: Tiene referencias** → Error "No se puede eliminar: tiene X referencias en el sistema."

---

## 4. Gestión de Equipos

### UC-EQ-001: Listar Equipos

| Campo | Valor |
|-------|-------|
| **ID** | UC-EQ-001 |
| **Nombre** | Listar Equipos |
| **Actor** | admin, tecnico, consultor |
| **Precondiciones** | Sesión activa |
| **Postcondiciones** | Lista paginada de equipos mostrada |

**Flujo principal:**
1. El usuario navega a `/equipos`.
2. El sistema carga equipos con filtros (modelo, marca, numero_serie, estado, tipo_id).
3. Se aplica paginación (10 por página).
4. Se cargan tipos de equipo y proveedores para dropdowns.
5. Se muestra la tabla con relaciones: tipo, proveedor, historial de estados.

---

### UC-EQ-002: Crear Equipo

| Campo | Valor |
|-------|-------|
| **ID** | UC-EQ-002 |
| **Nombre** | Crear Equipo |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa con rol admin o tecnico |
| **Postcondiciones** | Equipo creado en la DB |

**Flujo principal:**
1. El usuario completa: modelo (req), marca (req), tipo_id (req), estado, numero_serie, proveedor_id, ubicacion, notas.
2. El sistema valida campos requeridos.
3. Si se proporciona numero_serie → verifica unicidad (null/empty permitido).
4. El sistema inserta el equipo.

**Flujos alternativos:**
- **EA-1: Número de serie duplicado** → Error "El número de serie ya está registrado."

---

### UC-EQ-003: Actualizar Equipo

| Campo | Valor |
|-------|-------|
| **ID** | UC-EQ-003 |
| **Nombre** | Actualizar Equipo |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa con rol admin o tecnico, equipo existe |
| **Postcondiciones** | Equipo actualizado, historial de cambios de estado registrado |

**Flujo principal:**
1. El usuario edita los campos del equipo.
2. El sistema valida campos y unicidad de numero_serie.
3. Si cambia el estado → valida transición con state machine.
4. Si la transición es a `dado_de_baja` → solo admin puede realizarla.
5. Si el estado cambió → registra en `equipment_status_history` (estado_anterior, estado_nuevo, cambiado_por).
6. El sistema actualiza el registro.

**Flujos alternativos:**
- **EA-1: Transición inválida** → Error "Transición de estado no permitida."
- **EA-2: Tecnico intenta dado_de_baja** → Error "Solo administradores pueden dar de baja equipos."
- **EA-3: Número de serie duplicado** → Error de unicidad.

---

### UC-EQ-004: Eliminar Equipo

| Campo | Valor |
|-------|-------|
| **ID** | UC-EQ-004 |
| **Nombre** | Eliminar Equipo |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa, equipo existe |
| **Postcondiciones** | Equipo eliminado de la DB |

**Flujo principal:**
1. El usuario solicita eliminar un equipo.
2. El sistema verifica que no tenga tickets asociados.
3. El sistema verifica que no tenga planes de mantenimiento preventivo asociados.
4. El sistema elimina el equipo.

**Flujos alternativos:**
- **EA-1: Tiene tickets** → Error "No se puede eliminar: tiene X tickets asociados."
- **EA-2: Tiene planes de MP** → Error "No se puede eliminar: tiene X planes de mantenimiento preventivo."

---

### UC-EQ-005: Gestionar Tipos de Equipo

| Campo | Valor |
|-------|-------|
| **ID** | UC-EQ-005 |
| **Nombre** | CRUD de Tipos de Equipo |
| **Actor** | admin |
| **Precondiciones** | Sesión activa con rol admin |
| **Postcondiciones** | Tipo de equipo creado/actualizado/eliminado |

**Sub-flujos:**
- **Crear**: nombre (req, único), descripción, icono.
- **Actualizar**: mismo validation, nombre único excluyendo actual.
- **Eliminar**: bloqueado si algún equipo usa este tipo.

---

## 5. Gestión de Tickets/Incidencias

### UC-TKT-001: Listar Tickets

| Campo | Valor |
|-------|-------|
| **ID** | UC-TKT-001 |
| **Nombre** | Listar Tickets |
| **Actor** | admin, tecnico, consultor |
| **Precondiciones** | Sesión activa |
| **Postcondiciones** | Lista paginada de tickets mostrada |

**Flujo principal:**
1. El usuario navega a `/tickets`.
2. El sistema carga tickets con filtros (titulo, descripcion, numero_ticket, estado, prioridad).
3. Se aplica paginación (10 por página).
4. Se cargan relaciones: reporta, asignado, equipo, comentarios, adjuntos, activity log.
5. Se cargan técnicos (admin+tecnico) y equipos para dropdowns.

---

### UC-TKT-002: Crear Ticket

| Campo | Valor |
|-------|-------|
| **ID** | UC-TKT-002 |
| **Nombre** | Crear Ticket |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa con rol admin o tecnico |
| **Postcondiciones** | Ticket creado con número automático y SLA calculado |

**Flujo principal:**
1. El usuario completa: titulo (req), descripcion, prioridad (req), equipo_id (opc), notas, fecha_limite (opc).
2. El sistema genera número de ticket: `TKT-YYYYMMDD-NNN` (secuencial por día).
3. Si equipo_id proporcionado → verifica que exista y NO esté en `dado_de_baja`.
4. Si no se proporciona fecha_limite → calcula SLA según prioridad:
   - `critica` = 1 día
   - `alta` = 3 días
   - `media` = 7 días
   - `baja` = 14 días
5. El sistema crea el ticket y registra activity `crear`.

**Flujos alternativos:**
- **EA-1: Equipo dado de baja** → Error "No se puede crear un ticket para un equipo dado de baja."

---

### UC-TKT-003: Actualizar Ticket

| Campo | Valor |
|-------|-------|
| **ID** | UC-TKT-003 |
| **Nombre** | Actualizar Ticket |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa, ticket existe |
| **Postcondiciones** | Ticket actualizado, transición de estado registrada en activity log |

**Flujo principal:**
1. El usuario edita campos del ticket.
2. Si cambia estado → valida transición con state machine + role guard.
3. Si cambia prioridad y no hay fecha_limite explícita → recalcula SLA desde hoy.
4. Si cambia equipo → verifica que exista y no esté dado de baja.
5. El sistema actualiza y registra `transicion` en activity log.

**Restricciones de transición por rol:**

| Estado destino | Roles permitidos |
|----------------|-------------------|
| `abierto` | admin, consultor |
| `en_proceso` | admin, tecnico |
| `resuelto` | admin, tecnico |
| `cerrado` | admin, consultor |
| `cancelado` | admin, consultor |

---

### UC-TKT-004: Eliminar Ticket

| Campo | Valor |
|-------|-------|
| **ID** | UC-TKT-004 |
| **Nombre** | Eliminar Ticket |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa, ticket existe |
| **Postcondiciones** | Ticket eliminado, archivos adjuntos eliminados del disco |

**Flujo principal:**
1. El usuario solicita eliminar un ticket.
2. El sistema verifica que quien elimina sea el reportador o un admin.
3. El sistema elimina archivos adjuntos del disco (best-effort).
4. El sistema elimina el ticket.
5. El sistema registra `eliminar` en activity log.

**Flujos alternativos:**
- **EA-1: No es reportador ni admin** → Error "No tenés permiso para eliminar este ticket."

---

### UC-TKT-005: Agregar Comentario

| Campo | Valor |
|-------|-------|
| **ID** | UC-TKT-005 |
| **Nombre** | Agregar Comentario a Ticket |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa, ticket existe |
| **Postcondiciones** | Comentario guardado en DB |

**Flujo principal:**
1. El usuario escribe un comentario en el ticket.
2. El sistema valida que `contenido` no esté vacío.
3. El sistema guarda el comentario con referencia al usuario y timestamp.
4. El sistema registra `comentario` en activity log.

---

### UC-TKT-006: Subir Adjunto

| Campo | Valor |
|-------|-------|
| **ID** | UC-TKT-006 |
| **Nombre** | Subir Archivo Adjunto |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa, ticket existe |
| **Postcondiciones** | Archivo guardado en `uploads/`, registro en DB |

**Flujo principal:**
1. El usuario selecciona un archivo (máx 5MB).
2. El sistema valida tipo MIME permitido: JPEG, PNG, GIF, WebP, SVG, PDF, TXT, DOC, DOCX, XLS, XLSX.
3. El sistema genera nombre: `{UUID}-{filename_saneado}`.
4. El sistema guarda el archivo en `uploads/`.
5. El sistema registra en DB y `adjunto` en activity log.

**Flujos alternativos:**
- **EA-1: Archivo > 5MB** → Error "El archivo excede el límite de 5MB."
- **EA-2: Tipo MIME no permitido** → Error "Tipo de archivo no permitido."

---

### UC-TKT-007: Eliminar Adjunto

| Campo | Valor |
|-------|-------|
| **ID** | UC-TKT-007 |
| **Nombre** | Eliminar Archivo Adjunto |
| **Actor** | admin, tecnico (solo el que subió o admin) |
| **Precondiciones** | Sesión activa, adjunto existe |
| **Postcondiciones** | Archivo eliminado de disco y DB |

**Flujo principal:**
1. El usuario solicita eliminar un adjunto.
2. El sistema verifica que sea el uploader o un admin.
3. El sistema elimina el archivo del disco (best-effort).
4. El sistema elimina el registro de DB.
5. El sistema registra `adjunto_eliminado` en activity log.

---

## 6. Mantenimiento Preventivo

### UC-PM-001: Listar Planes de Mantenimiento

| Campo | Valor |
|-------|-------|
| **ID** | UC-PM-001 |
| **Nombre** | Listar Planes de Mantenimiento Preventivo |
| **Actor** | admin, tecnico, consultor |
| **Precondiciones** | Sesión activa |
| **Postcondiciones** | Lista de planes con tareas, ejecuciones y conteo de atrasados mostrada |

**Flujo principal:**
1. El usuario navega a `/mantenimiento`.
2. El sistema carga todos los planes con:
   - Tareas ordenadas por `orden`
   - Equipo y tipo de equipo asociados
   - Ejecuciones ordenadas por fecha_programada descendente (con partes)
3. El sistema cuenta ejecuciones atrasadas (pendientes con fecha < hoy).
4. Se cargan dropdowns: equipos, tipos, técnicos, ítems de inventario.

---

### UC-PM-002: Crear Plan de Mantenimiento

| Campo | Valor |
|-------|-------|
| **ID** | UC-PM-002 |
| **Nombre** | Crear Plan de Mantenimiento Preventivo |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa con rol admin o tecnico |
| **Postcondiciones** | Plan creado en la DB |

**Flujo principal:**
1. El usuario completa: nombre (req), descripcion, frecuencia_dias (req, >0), equipo_id (opc), tipo_equipo_id (opc).
2. El sistema valida campos requeridos y que frecuencia_dias > 0.
3. Si se proporciona equipo_id → verifica que exista.
4. Si se proporciona tipo_equipo_id → verifica que exista.
5. El sistema inserta el plan.

---

### UC-PM-003: Actualizar Plan de Mantenimiento

| Campo | Valor |
|-------|-------|
| **ID** | UC-PM-003 |
| **Nombre** | Actualizar Plan de Mantenimiento |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa, plan existe |
| **Postcondiciones** | Plan actualizado |

**Flujo principal:**
1. El usuario edita los campos del plan.
2. El sistema valida mismas reglas que creación.
3. El sistema actualiza el registro.

---

### UC-PM-004: Eliminar Plan de Mantenimiento

| Campo | Valor |
|-------|-------|
| **ID** | UC-PM-004 |
| **Nombre** | Eliminar Plan de Mantenimiento |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa, plan existe |
| **Postcondiciones** | Plan eliminado (solo si no tiene ejecuciones) |

**Flujo principal:**
1. El usuario solicita eliminar un plan.
2. El sistema verifica que no tenga ejecuciones registradas.
3. El sistema elimina el plan.

**Flujos alternativos:**
- **EA-1: Tiene ejecuciones** → Error "No se puede eliminar: tiene ejecuciones registradas. Eliminá o reprogramá las ejecuciones primero."

---

### UC-PM-005: Gestionar Tareas del Plan

| Campo | Valor |
|-------|-------|
| **ID** | UC-PM-005 |
| **Nombre** | Agregar/Actualizar/Eliminar Tareas |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa, plan existe |
| **Postcondiciones** | Tarea modificada |

**Sub-flujos:**
- **Agregar tarea**: nombre (req), orden auto-calculado (MAX+1), inventory_item_id (opc, repuesto vinculado).
- **Actualizar tarea**: nombre (req), mismo plan.
- **Eliminar tarea**: bloqueado si tiene ejecuciones registradas.

---

### UC-PM-006: Programar Ejecución

| Campo | Valor |
|-------|-------|
| **ID** | UC-PM-006 |
| **Nombre** | Programar Ejecución de Mantenimiento |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa, plan existe, plan tiene al menos 1 tarea |
| **Postcondiciones** | Una ejecución por tarea creada, todas en estado `pendiente` |

**Flujo principal:**
1. El usuario selecciona: plan_id (req), ejecutado_por (req, técnico/admin), fecha_programada (req, >= hoy).
2. El sistema verifica que el plan tenga al menos una tarea.
3. El sistema crea UNA ejecución por cada tarea del plan, todas con `resultado: 'pendiente'`.

**Flujos alternativos:**
- **EA-1: Plan sin tareas** → Error "El plan debe tener al menos una tarea antes de programar una ejecución."
- **EA-2: Fecha en el pasado** → Error "La fecha debe ser hoy o en el futuro."

---

### UC-PM-007: Completar Ejecución

| Campo | Valor |
|-------|-------|
| **ID** | UC-PM-007 |
| **Nombre** | Completar Ejecución de Mantenimiento |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa, ejecución en estado `pendiente` |
| **Postcondiciones** | Ejecución completada, repuestos ajustados, próxima ejecución auto-programada |

**Flujo principal:**
1. El usuario selecciona resultado: `completado`, `fallido` u `omitido`.
2. El usuario registra observaciones (opc).
3. Si usa repuestos (opc): para cada parte → inventory_item_id, accion (`instalado`/`removido`/`reemplazado`), cantidad (>0).
4. El sistema valida stock para `instalado`/`reemplazado` (stock >= cantidad).
5. **Transacción atómica:**
   a. Actualiza ejecución (resultado, fecha_ejecucion, observaciones).
   b. Para cada parte: inserta `pm_execution_parts`, ajusta `stock_actual`, crea `inventory_movements`.
6. El sistema auto-programa la próxima ejecución: `fecha_programada = fecha_actual + plan.frecuencia_dias`.
7. Si ya existe una ejecución para esa fecha → no duplica.

**Flujos alternativos:**
- **EA-1: Stock insuficiente** → Error "Stock insuficiente para [item]. Disponible: X, requerido: Y."
- **EA-2: Repuesto no existe** → Error de validación de inventory_item_id.

---

### UC-PM-008: Cancelar Ejecución

| Campo | Valor |
|-------|-------|
| **ID** | UC-PM-008 |
| **Nombre** | Cancelar Ejecución |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa, ejecución en estado `pendiente` |
| **Postcondiciones** | Ejecución en estado `cancelada` (terminal) |

**Flujo principal:**
1. El usuario solicita cancelar una ejecución pendiente.
2. El sistema cambia resultado a `cancelada`.

---

### UC-PM-009: Reprogramar Ejecución

| Campo | Valor |
|-------|-------|
| **ID** | UC-PM-009 |
| **Nombre** | Reprogramar Ejecución |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa, ejecución en estado `pendiente` |
| **Postcondiciones** | Fecha de ejecución actualizada |

**Flujo principal:**
1. El usuario selecciona nueva fecha (YYYY-MM-DD, >= hoy).
2. El sistema actualiza `fecha_programada`.

---

## 7. Inventario y Repuestos

### UC-INV-001: Listar Ítems de Inventario

| Campo | Valor |
|-------|-------|
| **ID** | UC-INV-001 |
| **Nombre** | Listar Ítems de Inventario |
| **Actor** | admin, tecnico, consultor |
| **Precondiciones** | Sesión activa |
| **Postcondiciones** | Lista paginada de ítems mostrada |

**Flujo principal:**
1. El usuario navega a `/inventario`.
2. El sistema carga ítems con filtros (nombre, codigo_parte, descripcion, categoria, tipo_equipo_id, stock_bajo).
3. Se aplica paginación (10 por página).
4. Se cargan categorías (distintas), tipos de equipo, conteo de stock bajo.

---

### UC-INV-002: Crear Ítem de Inventario

| Campo | Valor |
|-------|-------|
| **ID** | UC-INV-002 |
| **Nombre** | Crear Ítem de Inventario |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa con rol admin o tecnico |
| **Postcondiciones** | Ítem creado en la DB |

**Flujo principal:**
1. El usuario completa: nombre (req), categoria (req), stock_actual (>=0), stock_minimo (>=0), codigo_parte (opc, único), tipo_equipo_id (opc), ubicacion (default "Almacen Principal"), descripcion (opc).
2. El sistema valida campos requeridos y unicidad de codigo_parte.
3. El sistema inserta el ítem.

---

### UC-INV-003: Actualizar Ítem de Inventario

| Campo | Valor |
|-------|-------|
| **ID** | UC-INV-003 |
| **Nombre** | Actualizar Ítem de Inventario |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa, ítem existe |
| **Postcondiciones** | Ítem actualizado |

**Flujo principal:**
1. El usuario edita campos del ítem.
2. El sistema valida mismas reglas que creación.
3. El sistema actualiza el registro.

---

### UC-INV-004: Eliminar Ítem de Inventario

| Campo | Valor |
|-------|-------|
| **ID** | UC-INV-004 |
| **Nombre** | Eliminar Ítem de Inventario |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa, ítem existe |
| **Postcondiciones** | Ítem eliminado (solo si no tiene movimientos) |

**Flujo principal:**
1. El usuario solicita eliminar un ítem.
2. El sistema verifica que no tenga registros de movimientos (audit trail completo).
3. El sistema elimina el ítem.

**Flujos alternativos:**
- **EA-1: Tiene movimientos** → Error "No se puede eliminar: tiene X movimientos registrados."

---

### UC-INV-005: Registrar Movimiento de Inventario

| Campo | Valor |
|-------|-------|
| **ID** | UC-INV-005 |
| **Nombre** | Registrar Movimiento de Inventario |
| **Actor** | admin, tecnico |
| **Precondiciones** | Sesión activa, ítem existe |
| **Postcondiciones** | Movimiento registrado, stock actualizado atómicamente |

**Flujo principal:**
1. El usuario selecciona: inventory_item_id (req), tipo (`entrada`/`salida`/`ajuste`), cantidad (>0), motivo (req).
2. El sistema procesa según tipo:
   - `entrada`: stock += cantidad
   - `salida`: stock -= cantidad (falla si stock < 0)
   - `ajuste`: stock = cantidad (asignación directa)
3. **Transacción atómica**: crea movimiento + actualiza stock.

**Flujos alternativos:**
- **EA-1: Stock insuficiente en salida** → Error "Stock insuficiente. Disponible: X, solicitado: Y."
- **EA-2: Cantidad <= 0** → Error "La cantidad debe ser mayor a 0."

---

### UC-INV-006: Ver Movimientos de Inventario

| Campo | Valor |
|-------|-------|
| **ID** | UC-INV-006 |
| **Nombre** | Ver Historial de Movimientos |
| **Actor** | admin, tecnico, consultor |
| **Precondiciones** | Sesión activa |
| **Postcondiciones** | Lista paginada de movimientos mostrada |

**Flujo principal:**
1. El usuario navega a `/inventario/movimientos`.
2. El sistema carga movimientos con filtros (inventory_item_id, tipo).
3. Se aplica paginación (10 por página), ordenados del más reciente al más antiguo.

---

## 8. Gestión de Proveedores

### UC-SUP-001: Listar Proveedores

| Campo | Valor |
|-------|-------|
| **ID** | UC-SUP-001 |
| **Nombre** | Listar Proveedores |
| **Actor** | admin, consultor |
| **Precondiciones** | Sesión activa |
| **Postcondiciones** | Lista paginada de proveedores mostrada |

**Flujo principal:**
1. El usuario navega a `/proveedores`.
2. El sistema carga proveedores con filtros (nombre, contacto).
3. Se aplica paginación (10 por página).

---

### UC-SUP-002: Crear Proveedor

| Campo | Valor |
|-------|-------|
| **ID** | UC-SUP-002 |
| **Nombre** | Crear Proveedor |
| **Actor** | admin |
| **Precondiciones** | Sesión activa con rol admin |
| **Postcondiciones** | Proveedor creado en la DB |

**Flujo principal:**
1. El admin completa: nombre (req), email (opc, formato válido), contacto, telefono, direccion, notas.
2. El sistema valida campos y formato de email.
3. El sistema inserta el proveedor.

---

### UC-SUP-003: Actualizar Proveedor

| Campo | Valor |
|-------|-------|
| **ID** | UC-SUP-003 |
| **Nombre** | Actualizar Proveedor |
| **Actor** | admin |
| **Precondiciones** | Sesión activa con rol admin, proveedor existe |
| **Postcondiciones** | Proveedor actualizado |

**Flujo principal:**
1. El admin edita campos del proveedor.
2. El sistema valida mismas reglas que creación.
3. El sistema actualiza el registro.

---

### UC-SUP-004: Eliminar Proveedor

| Campo | Valor |
|-------|-------|
| **ID** | UC-SUP-004 |
| **Nombre** | Eliminar Proveedor |
| **Actor** | admin |
| **Precondiciones** | Sesión activa con rol admin, proveedor existe |
| **Postcondiciones** | Proveedor eliminado (solo si no tiene equipos asociados) |

**Flujo principal:**
1. El admin solicita eliminar un proveedor.
2. El sistema verifica que no tenga equipos referenciándolo.
3. El sistema elimina el proveedor.

**Flujos alternativos:**
- **EA-1: Tiene equipos** → Error "No se puede eliminar: tiene X equipos asociados."

---

## 9. Reportes y Estadísticas

### UC-RPT-001: Ver Dashboard de Reportes

| Campo | Valor |
|-------|-------|
| **ID** | UC-RPT-001 |
| **Nombre** | Ver Reportes y Estadísticas |
| **Actor** | admin, consultor |
| **Precondiciones** | Sesión activa |
| **Postcondiciones** | Dashboard de reportes mostrado |

**Flujo principal:**
1. El usuario navega a `/reportes`.
2. El sistema carga en paralelo:
   - Equipos por estado (conteo)
   - Equipos por tipo (conteo)
   - Tickets por estado (conteo)
   - Tickets por prioridad (conteo)
   - Tickets por mes (últimos 6 meses)
   - Estadísticas de mantenimiento (planes, atrasados, próximos)
   - Top 5 equipos con más tickets (más problemáticos)
   - Usuarios por rol (conteo)

---

## 10. Configuración del Sistema

### UC-CFG-001: Ver Configuración

| Campo | Valor |
|-------|-------|
| **ID** | UC-CFG-001 |
| **Nombre** | Ver Configuración del Sistema |
| **Actor** | admin |
| **Precondiciones** | Sesión activa con rol admin |
| **Postcondiciones** | Configuración mostrada |

**Flujo principal:**
1. El admin navega a `/config`.
2. El sistema carga todos los pares clave-valor de la tabla `config`.

---

### UC-CFG-002: Actualizar Configuración

| Campo | Valor |
|-------|-------|
| **ID** | UC-CFG-002 |
| **Nombre** | Actualizar Configuración |
| **Actor** | admin |
| **Precondiciones** | Sesión activa con rol admin |
| **Postcondiciones** | Configuración actualizada |

**Flujo principal:**
1. El admin modifica valores.
2. El sistema recibe `_keys` como lista separada por comas.
3. Para cada clave, valida tipo:
   - `number`: valor debe parsear como número.
   - `email`: valor debe matchear regex de email.
4. El sistema actualiza cada clave con su `updated_at`.

---

## 11. Dashboard

### UC-DB-001: Ver Dashboard Principal

| Campo | Valor |
|-------|-------|
| **ID** | UC-DB-001 |
| **Nombre** | Ver Dashboard Principal |
| **Actor** | Cualquier usuario autenticado |
| **Precondiciones** | Sesión activa |
| **Postcondiciones** | Dashboard mostrado |

**Flujo principal:**
1. El usuario navega a `/`.
2. El sistema carga:
   - Conteo de equipos total
   - Conteo de tickets total
   - Total de planes de MP
   - Ejecuciones de MP pendientes
   - Conteo de ítems con stock bajo
   - Mantenimientos atrasados
   - Próximas 5 ejecuciones (con plan, tarea, técnico)
   - Últimos 5 tickets no cerrados (con equipo y reportador)
   - Gráficos de actividad:
     - Diario (últimos 7 días)
     - Semanal (semana actual, 4 buckets)
     - Mensual (últimos 12 meses)
     - Delta mes a mes (tickets y mantenimiento)

---

## 12. Gestión de Sesiones

### UC-SES-001: Ver Mis Sesiones

| Campo | Valor |
|-------|-------|
| **ID** | UC-SES-001 |
| **Nombre** | Ver Sesiones Activas |
| **Actor** | Cualquier usuario autenticado |
| **Precondiciones** | Sesión activa |
| **Postcondiciones** | Lista de sesiones del usuario mostrada |

**Flujo principal:**
1. El usuario navega a `/sessions`.
2. El sistema carga todas las sesiones del usuario actual.

---

### UC-SES-002: Revocar Sesión

| Campo | Valor |
|-------|-------|
| **ID** | UC-SES-002 |
| **Nombre** | Revocar Sesión |
| **Actor** | Cualquier usuario autenticado |
| **Precondiciones** | Sesión activa, al menos 1 otra sesión existe |
| **Postcondiciones** | Sesión eliminada de la DB |

**Flujo principal:**
1. El usuario selecciona revocar una sesión.
2. El sistema verifica que la sesión pertenezca al usuario actual.
3. El sistema elimina la sesión.

---

## 13. Matriz de Permisos por Rol

| Dominio / Operación | admin | tecnico | consultor |
|---------------------|-------|---------|-----------|
| Login / Logout | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ |
| Sesiones (ver/recocar propias) | ✅ | ✅ | ✅ |
| Usuarios (CRUD) | ✅ | ❌ | ❌ |
| Tipos de Equipo (CRUD) | ✅ | ❌ | ❌ |
| Equipos (CRUD) | ✅ | ✅ | Solo lectura |
| Tickets (CRUD + comentarios + adjuntos) | ✅ | ✅ | Solo lectura |
| Planes de MP (CRUD) | ✅ | ✅ | Solo lectura |
| Tareas de MP (CRUD) | ✅ | ✅ | Solo lectura |
| Ejecuciones MP (programar/completar/cancelar/reprogramar) | ✅ | ✅ | Solo lectura |
| Inventario (CRUD + movimientos) | ✅ | ✅ | Solo lectura |
| Movimientos de Inventario (ver) | ✅ | ✅ | ✅ |
| Proveedores (listar) | ✅ | ❌ | ✅ |
| Proveedores (CRUD) | ✅ | ❌ | ❌ |
| Reportes | ✅ | ❌ | ✅ |
| Configuración | ✅ | ❌ | ❌ |
| Equipo → dado_de_baja | ✅ | ❌ | ❌ |
| Transiciones de ticket | Todas | en_proceso, resuelto | Solo lectura |

---

## 14. Diagramas de Estado

### 14.1 Estados de Equipo

```
                  ┌──────────────┐
                  │  operativo   │
                  └──────┬───────┘
                         │
            ┌────────────┼────────────────┐
            ▼            ▼                ▼
   ┌────────────────┐ ┌──────────┐  ┌──────────────┐
   │ en_reparacion  │ │ prestado │  │ dado_de_baja │
   └───────┬────────┘ └────┬─────┘  └──────────────┘
           │               │              ▲
           │    ┌──────────┘              │
           ▼    ▼                         │
   ┌──────────────┐                       │
   │  operativo   │                       │
   └──────────────┘                       │
           │                              │
           └──────────────────────────────┘
```

**Transiciones válidas:**
| Desde | Hacia | Rol requerido |
|-------|-------|---------------|
| operativo | en_reparacion | admin, tecnico |
| operativo | prestado | admin, tecnico |
| operativo | dado_de_baja | **solo admin** |
| en_reparacion | operativo | admin, tecnico |
| en_reparacion | dado_de_baja | **solo admin** |
| prestado | operativo | admin, tecnico |
| prestado | en_reparacion | admin, tecnico |

### 14.2 Estados de Ticket

```
                  ┌──────────┐
                  │  abierto  │
                  └─────┬────┘
                        │
           ┌────────────┼────────────┐
           ▼            ▼            ▼
   ┌──────────────┐ ┌──────────┐ ┌──────────┐
   │ en_proceso   │ │ cerrado  │ │cancelado │
   └──────┬───────┘ └──────────┘ └──────────┘
          │                ▲
          ▼                │
   ┌──────────┐            │
   │ resuelto ├────────────┘
   └──────────┘
        │
        ▼
   ┌──────────┐
   │ abierto  │ (reapertura)
   └──────────┘
```

**Transiciones válidas:**
| Desde | Hacia | Roles permitidos |
|-------|-------|-------------------|
| abierto | en_proceso | admin, tecnico |
| abierto | cerrado | admin, consultor |
| abierto | cancelado | admin, consultor |
| en_proceso | resuelto | admin, tecnico |
| en_proceso | cerrado | admin, consultor |
| en_proceso | cancelado | admin, consultor |
| resuelto | cerrado | admin, consultor |
| resuelto | en_proceso | admin, tecnico |
| resuelto | abierto | admin, consultor |
| cerrado | abierto | admin, consultor |

### 14.3 Estados de Ejecución de MP

```
   ┌──────────┐
   │ pendiente │
   └─────┬────┘
         │
    ┌────┼────┬──────────┐
    ▼    ▼    ▼          ▼
┌───────┐ ┌───────┐ ┌────────┐ ┌──────────┐
│completado│ │fallido│ │ omitido│ │cancelada │
└───────┘ └───────┘ └────────┘ └──────────┘
```

**Transiciones válidas:**
| Desde | Hacia |
|-------|-------|
| pendiente | completado |
| pendiente | fallido |
| pendiente | omitido |
| pendiente | cancelada |

Todos los estados destino son terminales (no se puede volver atrás).

---

*Documento generado a partir del análisis completo del código fuente del proyecto.*
