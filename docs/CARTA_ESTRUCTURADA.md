# Carta Estructurada — Módulo Mantenimiento de Equipos

## 1. Identificación del Proyecto

| Campo | Valor |
|-------|-------|
| **Nombre** | Módulo Mantenimiento de Equipos |
| **Tipo** | Sistema ERP de Mantenimiento |
| **Versión actual** | 0.0.1 (desarrollo activo) |
| **Repositorio** | `mod-mantenimiento` |
| **Fecha de creación** | Agosto 2025 |

---

## 2. Objetivo

Desarrollar un sistema integral de gestión de equipos informáticos que permita:

- Controlar el inventario completo de hardware (equipos, repuestos, proveedores)
- Gestionar tickets de soporte técnico con seguimiento de SLA
- Ejecutar planes de mantenimiento preventivo con trazabilidad
- Administrar usuarios y permisos por rol
- Generar reportes para la toma de decisiones

---

## 3. Alcance

### 3.1 Módulos Funcionales

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| **Equipos** | CRUD completo con tipos, estados, historial de cambios | ✅ Implementado |
| **Tickets** | Soporte con SLA, prioridades, adjuntos, actividad | ✅ Implementado |
| **Mantenimiento Preventivo** | Planes, tareas, ejecuciones, programación | ✅ Implementado |
| **Inventario** | Repuestos, stock, movimientos, vinculación con PM | ✅ Implementado |
| **Proveedores** | Gestión de proveedores de hardware | ✅ Implementado |
| **Reportes** | Dashboard y reportes ejecutivos | ✅ Implementado |
| **Usuarios** | CRUD con roles y control de acceso | ✅ Implementado |
| **Configuración** | Parámetros del sistema | ✅ Implementado |

### 3.2 Roles del Sistema

| Rol | Permisos |
|-----|----------|
| **admin** | Acceso total: usuarios, config, CRUD completo |
| **tecnico** | Ejecuta mantenimiento, trabaja tickets, consulta inventario |
| **consultor** | Solo lectura en toda la aplicación |

### 3.3 Rutas Principales

```
/                    → Dashboard (todos autenticados)
/login               → Autenticación (público)
/equipos             → Gestión de equipos (todos)
/tickets             → Sistema de soporte (todos)
/mantenimiento       → Mantenimiento preventivo (todos)
/inventario          → Control de repuestos (todos)
/proveedores         → Gestión de proveedores (admin, consultor)
/reportes            → Reportes ejecutivos (admin, consultor)
/usuarios            → Administración de usuarios (admin)
/config              → Configuración del sistema (admin)
/sessions            → Sesiones activas (todos)
/auth/*              → Recuperación de contraseña (público)
```

---

## 4. Stack Tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| **Framework** | SvelteKit | 5.x (runes mode) |
| **Lenguaje** | TypeScript | 6.x |
| **Base de datos** | SQLite | via `@libsql/client` |
| **ORM** | Drizzle ORM | 0.45.x |
| **CSS** | Tailwind CSS | 4.x |
| **UI** | shadcn-svelte | 1.4.x |
| **Gráficos** | Chart.js | 4.5.x |
| **Drag & Drop** | SortableJS | 1.15.x |
| **Auth** | bcryptjs | 3.x |
| **Adapter** | @sveltejs/adapter-node | 5.5.x |
| **Testing** | Vitest | 4.1.x |
| **Linting** | ESLint + Prettier | 10.x / 3.8.x |

---

## 5. Arquitectura

### 5.1 Patrón Arquitectónico

- **Sin capa API REST/tRPC**: Server Load Functions + Form Actions
- **Capa de servicios**: Lógica de dominio concentrada en `src/lib/server/services/`
- **Adaptadores de ruta**: Delgados, validan entrada y delegan en servicios

### 5.2 Estructura de Directorios

```
src/
├── hooks.server.ts          # Auth: sesión + role guard
├── routes/                  # Páginas: load functions + form actions
│   ├── +layout.svelte       # Layout único (sidebar + topbar)
│   ├── login/ auth/         # Rutas públicas
│   ├── equipos/ tickets/ mantenimiento/ inventario/
│   ├── proveedores/ reportes/ sessions/ usuarios/ config/
│   └── +page.server.ts      # Adaptadores → capa de servicios
└── lib/
    ├── server/
    │   ├── db/              # schema.ts, index.ts, seed.ts
    │   ├── services/        # Capa de servicios (dominio)
    │   └── auth.ts          # Hash passwords + sesiones
    ├── domain/              # State machines (client-importable)
    └── test/mocks/$app      # Mocks para vitest
```

### 5.3 Base de Datos

**Esquema**: `src/lib/server/db/schema.ts` (682 líneas, todas las tablas en un archivo)

**Tablas principales**:
- `users` — Usuarios del sistema
- `sessions` — Sesiones activas
- `equipment_types` — Catálogo de tipos de equipo
- `equipment` — Inventario de equipos
- `equipment_status_history` — Historial de cambios de estado
- `tickets` — Tickets de soporte
- `ticket_comments` — Comentarios en tickets
- `activity_log` — Log de actividad general
- `attachments` — Archivos adjuntos
- `maintenance_plans` — Planes de mantenimiento preventivo
- `maintenance_tasks` — Tareas de mantenimiento
- `maintenance_executions` — Ejecuciones programadas
- `execution_parts` — Repuestos utilizados en ejecuciones
- `inventory_items` — Repuestos en inventario
- `inventory_movements` — Movimientos de stock
- `suppliers` — Proveedores
- `config` — Configuración del sistema

**Configuración DB**:
- PRAGMA WAL activado
- Busy timeout: 5000ms
- Foreign keys: activas
- IDs: `crypto.randomUUID()`

---

## 6. Funcionalidades Clave

### 6.1 Sistema de Tickets con SLA

- `fecha_limite` auto-calculada por prioridad:
  - Crítica: 1 día
  - Alta: 3 días
  - Media: 7 días
  - Baja: 14 días
- Badge "Vencido" en listas y detalle
- Historial de actividad por ticket
- Adjuntos con filtro MIME y límite de 5 MB

### 6.2 Mantenimiento Preventivo

- Planes con frecuencia en días
- Tareas secuenciadas por plan
- Programación de ejecuciones
- Completar con resultado (completado/fallido/omitido)
- Auto-programación de siguiente ejecución
- Alerta de ejecuciones vencidas

### 6.3 Inventario de Repuestos

- CRUD de ítems con stock actual/mínimo
- Movimientos: entrada/salida/ajuste
- Vinculación con PM: ejecuciones registran piezas utilizadas
- Deducción atómica de stock
- Detección de bajo stock
- Historial de movimientos

### 6.4 Seguridad

- Hashes bcrypt (passwords + respuestas de seguridad)
- Rate limit de login por usuario
- Renovación deslizante de sesión (sliding window)
- Cookies httpOnly + SameSite
- Foreign keys activas
- Número de serie único por equipo

---

## 7. Comandos Disponibles

### Desarrollo

```bash
npm run dev           # Servidor de desarrollo (http://localhost:5173)
npm run build         # Build de producción → build/
npm run preview       # Preview del build
```

### Code Quality

```bash
npm run check         # Typecheck (svelte-check)
npm run lint          # Prettier + ESLint
npm run format        # Formatear todo
npm run format:check  # Verificar formato
```

### Base de Datos

```bash
npm run db:push       # Push esquema a DB
npm run db:generate   # Generar migraciones
npm run db:migrate    # Aplicar migraciones
npm run db:studio     # UI de inspección
npm run db:seed       # Siembra datos demo
npm run db:reset      # Recrear DB desde cero
```

### Testing

```bash
npm run test          # Suite de tests
npm run test:coverage # Tests + cobertura (≥70% statements)
```

---

## 8. CI/CD

**Pipeline**: `.github/workflows/ci.yml`

**Trigger**: Push y PR a `main`

**Quality Gate** (en orden):
1. `npm run check` — Typecheck
2. `npm run format:check` — Formato Prettier
3. `npm run lint` — ESLint (gate obligatorio)
4. `npm run test` — Suite de tests
5. `npm run test:coverage` — Cobertura ≥70% statements

**Entorno**: Ubuntu latest, Node 24, npm ci con cache

---

## 9. Datos Demo

El seed crea:

- **Admin**: `admin` / `admin123`
- **Técnico**: `tecnico1` / `tecnico123`
- **Consultor**: `consultor1` / `consultor123`
- **Tipos de equipo**: 10 (PC, Notebook, Impresora, Monitor, Router, Switch, Servidor, UPS, Escáner, Teléfono)
- **Proveedores**: 2 (Deltron SA, Bytec SA)
- **Configuración**: 4 claves por defecto
- **Datos demo**: 6 equipos, 4 tickets, planes de mantenimiento

---

## 10. Convenciones de Código

| Aspecto | Convención |
|---------|------------|
| **UI** | Español neutro |
| **Identificadores** | Inglés |
| **Formato** | Prettier: tabs, single quotes, trailingComma none, printWidth 100 |
| **Estado de listados** | search + filter params en URL, paginación PAGE_SIZE = 10 |
| **Comentarios** | `ponytail:` marca simplificaciones deliberadas |
| **IDs** | `crypto.randomUUID()` en default de columna |
| **CRUD** | Acción única `crud` que switchea por campo `_action` |

---

## 11. Métricas de Calidad

| Métrica | Valor actual | Umbral CI |
|---------|--------------|-----------|
| **Tests** | 292 (15 archivos) | — |
| **Cobertura statements** | 83.16% | ≥70% |
| **Lint** | 0 errores, 0 warnings | 0 |
| **Typecheck** | Pasa | Pasa |

---

## 12. Dependencias Principales

### Producción

- `bcryptjs` — Hashing de passwords
- `bits-ui` — Componentes UI primitivos
- `chart.js` — Gráficos
- `gsap` — Animaciones
- `lucide-svelte` — Iconos
- `shadcn-svelte` — Componentes UI
- `sortablejs` — Drag & drop
- `tailwind-merge` — Utilidad de clases
- `tailwind-variants` — Variantes de estilos

### Desarrollo

- `drizzle-kit` — Migraciones y push de esquema
- `eslint` + plugins — Linting
- `prettier` + plugins — Formato
- `svelte-check` — Typecheck
- `vitest` + coverage — Testing
- `typescript` — Type safety

---

## 13. Próximos Pasos

- [ ] Completar documentación de API interna
- [ ] Agregar tests de integración end-to-end
- [ ] Implementar notificaciones en tiempo real
- [ ] Agregar exportación de reportes a PDF/Excel
- [ ] Optimizar rendimiento de listados grandes
- [ ] Implementar backup automático de BD

---

## 14. Contacto y Recursos

| Recurso | Ubicación |
|---------|-----------|
| **Documentación principal** | `AGENTS.md` |
| **Sistema de diseño** | `DESIGN.md` |
| **Manuales de usuario** | `MANUAL_ADMIN.md`, `MANUAL_TECNICO.md`, `MANUAL_CONSULTOR.md`, `MANUAL_USUARIO.md` |
| **Artefactos SDD** | `openspec/` |
| **CI/CD** | `.github/workflows/ci.yml` |

---

*Documento generado el 08 de septiembre de 2026*
*Última actualización: v0.0.1*
