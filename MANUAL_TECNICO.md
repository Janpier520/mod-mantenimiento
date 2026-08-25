# Manual de Usuario — Rol Técnico

Sistema de Gestión de Mantenimiento de Equipos

Este manual describe el trabajo diario del rol **técnico**: gestión de equipos, atención de tickets y ejecución del mantenimiento preventivo. Para el ingreso inicial, recuperación de contraseña y uso general de la interfaz, consultá `MANUAL_USUARIO.md`.

---

## 1. Tu rol en el sistema

Como técnico sos la persona que **ejecuta**: cargás los equipos que reparás/instalás, tomás los tickets de soporte, los resolvés dentro del plazo (SLA) y completás las ejecuciones del mantenimiento preventivo.

**Podés:** crear/editar equipos, crear tickets, tomarlos y resolverlos, subir adjuntos y operar todo el módulo de mantenimiento.
**No podés:** gestionar usuarios, proveedores, tipos de equipo, configuración ni ver reportes; cerrar o cancelar tickets (eso es de administrador/consultor).

## 2. Dashboard

La pantalla inicial resume el estado operativo: equipos por estado, tickets abiertos y vencidos, y mantenimientos pendientes. Usala al empezar tu turno para priorizar.

## 3. Equipos

### Ver y buscar

1. Entrá a **Equipos** en el menú lateral.
2. Usá el buscador (modelo, marca o número de serie) y los filtros por **estado** y **tipo**.
3. Presioná sobre un equipo para ver su detalle e **historial de cambios de estado** (quién cambió qué y cuándo).

### Crear un equipo

1. Presioná el botón flotante **+** (esquina inferior derecha).
2. Completá los campos obligatorios: **Tipo**, **Modelo** y **Marca**.
3. El **N° de serie** es opcional pero, si lo ingresás, debe ser único en el sistema.
4. Guardá con **Crear Equipo**.

### Cambiar el estado de un equipo

Los estados posibles son: `Operativo`, `En Reparación`, `Prestado` y `Dado de Baja`.

1. Editá el equipo y cambiá el campo **Estado**, o usá la acción de cambio de estado del detalle.
2. Cada cambio queda registrado en el historial con tu nombre y la fecha.

> `Dado de Baja` es un estado final: un equipo dado de baja no vuelve a estados anteriores.

### Eliminar un equipo

Solo se puede eliminar si **no tiene tickets ni planes de mantenimiento asociados**. Si los tiene, el sistema te lo indicará: primero deberás resolver o desvincular esas referencias.

## 4. Tickets

### Crear un ticket

1. Entrá a **Tickets** y presioná **Nuevo Ticket**.
2. Seleccioná el **equipo** afectado, describí el problema y asigná la **prioridad**.
3. Al guardar, el sistema calcula automáticamente la **fecha límite (SLA)** según la prioridad:

| Prioridad | Plazo de resolución |
| --------- | ------------------- |
| Crítica   | 1 día               |
| Alta      | 3 días              |
| Media     | 7 días              |
| Baja      | 14 días             |

### Ciclo de vida de un ticket

```
abierto → en_proceso → resuelto → cerrado
                ↑            │
                └────────────┘ (reapertura)
```

Como técnico podés:

| Acción              | Desde → Hacia                   |
| ------------------- | ------------------------------- |
| **Tomar el ticket** | Abierto → En Proceso            |
| **Resolverlo**      | En Proceso → Resuelto           |
| **Reabrirlo**       | Resuelto → En Proceso / Abierto |

El cierre definitivo y la cancelación los realizan administrador o consultor.

### Trabajar un ticket

1. Abrí el ticket desde el listado.
2. Cambiá el estado con el selector de transiciones.
3. **Adjuntá evidencia** (fotos, logs): archivos de hasta 5 MB. Podés descargarlos y eliminarlos si sos quien los subió.
4. Consultá el **Historial de Actividad** del ticket: cada creación, cambio de estado, comentario y adjunto queda registrado con autor y fecha.

### Tickets vencidos

Si un ticket supera su fecha límite sin resolverse, se marca con la etiqueta **Vencido** en el listado y el detalle. Priorizalos.

## 5. Mantenimiento preventivo

Aquí se planifican las tareas periódicas sobre cada equipo.

### Conceptos

- **Plan**: agrupa tareas para un equipo, con una **frecuencia en días**.
- **Tareas**: pasos secuenciados del plan.
- **Ejecución**: una corrida concreta con fecha programada y resultado (`pendiente`, `completado`, `fallido`, `omitido`, `cancelada`).

### Programar una ejecución

1. Entrá a **Mantenimiento** y seleccioná el plan.
2. Presioná **Programar Ejecución**, elegí el técnico responsable y la **fecha programada** (no puede ser anterior a hoy).
3. El sistema crea una ejecución `pendiente` con todas las tareas del plan.

### Completar una ejecución

1. Abrí la ejecución pendiente y marcá cada tarea como realizada.
2. Registrá el **resultado**:
   - **Completado**: todo salió bien.
   - **Fallido**: hubo un problema que requiere atención (genera también un seguimiento).
   - **Omitido**: no pudo realizarse en esta fecha.
3. Al guardar, el sistema **programa automáticamente la próxima ejecución** sumando la frecuencia del plan a la fecha actual. No tenés que reprogramar nada a mano.

### Cancelar o reprogramar

- **Cancelar ejecución**: para ejecuciones `pendientes`; queda registrada como `cancelada`.
- **Reprogramar**: cambiá la fecha programada de una ejecución pendiente (tampoco admite fechas pasadas).

### Ejecuciones vencidas

La página muestra un aviso con la cantidad de ejecuciones vencidas y cada una se marca con la etiqueta **Vencida**. Son tu lista de trabajo prioritaria.

### Registrar piezas utilizadas

Al completar una ejecución de mantenimiento, podés registrar las piezas/repuestos que utilizaste:

1. En el formulario de completar ejecución, expandí la sección **Piezas utilizadas**.
2. Presioná **+ Agregar pieza** y seleccioná el ítem del inventario.
3. Elegí la acción: `Instalado` (nueva pieza) o `Reemplazado` (pieza vieja por nueva).
4. Indicá la cantidad utilizada y opcionalmente una observación.
5. Al guardar, el sistema **descuenta automáticamente** el stock del inventario y registra el movimiento.

> Si no usaste piezas, simplemente completá la ejecución sin agregar nada en esta sección.

## 6. Inventario

Gestioná los repuestos y consumibles del almacén.

### Ver y buscar

1. Entrá a **Inventario** en el menú lateral.
2. Usá el buscador por nombre o código de parte y los filtros por **categoría** y **ubicación**.
3. Los ítems con stock por debajo del mínimo se marcan con la etiqueta **Bajo** en rojo.

### Crear un ítem

1. Presioná **Nuevo Ítem**.
2. Completá los campos obligatorios: **Nombre**, **Código de parte**, **Categoría** y **Stock mínimo**.
3. Opcionalmente asigná un **Tipo de equipo** asociado y una **Ubicación**.
4. Guardá con **Crear Ítem**.

### Registrar movimientos

Los movimientos registran cada entrada, salida o ajuste de stock:

1. Entrá a **Movimientos** desde el menú de inventario.
2. Presioná **Nuevo Movimiento** y elegí:
   - **Entrada**: compra o recepción de stock (aumenta).
   - **Salida**: uso en mantenimiento o descarte (disminuye).
   - **Ajuste**: corrección por inventario físico (puede subir o bajar).
3. Indicá la **cantidad** y el **motivo**.

> Los movimientos generados por completar ejecuciones de PM se crean automáticamente con referencia al PM.

## 7. Mis sesiones

Revisá periódicamente **Mis Sesiones** y cerrá cualquier sesión que no reconozcas.

## 8. Resumen de permisos

| Acción                                                | ¿Podés? |
| ----------------------------------------------------- | :-----: |
| Crear / editar / eliminar equipos                     |    ✔    |
| Cambiar estado de equipos                             |    ✔    |
| Crear tickets                                         |    ✔    |
| Tomar (→ En Proceso) y resolver tickets               |    ✔    |
| Reabrir tickets resueltos                             |    ✔    |
| Cerrar o cancelar tickets                             |    —    |
| Subir / descargar adjuntos                            |    ✔    |
| Eliminar adjuntos propios                             |    ✔    |
| Operar mantenimiento preventivo completo              |    ✔    |
| Registrar piezas utilizadas en ejecuciones PM         |    ✔    |
| Ver y buscar inventario de repuestos                  |    ✔    |
| Crear ítems de inventario                             |    ✔    |
| Registrar movimientos de stock                        |    ✔    |
| Ver reportes                                          |    —    |
| Gestionar usuarios, proveedores, tipos, configuración |    —    |
