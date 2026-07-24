import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ─── Usuarios ────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	username: text('username').notNull().unique(),
	email: text('email').notNull().unique(),
	password_hash: text('password_hash').notNull(),
	nombre: text('nombre').notNull(),
	apellido: text('apellido').notNull(),
	rol: text('rol', { enum: ['admin', 'tecnico', 'consultor'] })
		.notNull()
		.default('tecnico'),
	activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
	security_question_1: text('security_question_1').notNull().default(''),
	security_answer_hash_1: text('security_answer_hash_1').notNull().default(''),
	security_question_2: text('security_question_2').notNull().default(''),
	security_answer_hash_2: text('security_answer_hash_2').notNull().default(''),
	created_at: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	updated_at: text('updated_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
		.$onUpdateFn(() => new Date().toISOString())
});

// ─── Sessions ────────────────────────────────────────────────────────────────
export const sessions = sqliteTable('sessions', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	user_id: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	token: text('token').notNull().unique(),
	expires_at: text('expires_at').notNull(),
	created_at: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
});

// ─── Tipos de Equipo ─────────────────────────────────────────────────────────
export const equipment_types = sqliteTable('equipment_types', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	nombre: text('nombre').notNull().unique(),
	descripcion: text('descripcion').notNull().default(''),
	icono: text('icono').notNull().default(''),
	created_at: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
});

// ─── Equipos ─────────────────────────────────────────────────────────────────
export const equipment = sqliteTable('equipment', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	tipo_id: text('tipo_id')
		.notNull()
		.references(() => equipment_types.id),
	numero_serie: text('numero_serie').notNull().default(''),
	modelo: text('modelo').notNull().default(''),
	marca: text('marca').notNull().default(''),
	estado: text('estado', {
		enum: ['operativo', 'en_reparacion', 'dado_de_baja', 'prestado']
	})
		.notNull()
		.default('operativo'),
	ubicacion: text('ubicacion').notNull().default(''),
	fecha_adquisicion: text('fecha_adquisicion'),
	proveedor_id: text('proveedor_id').references(() => proveedores.id),
	notas: text('notas').notNull().default(''),
	created_at: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	updated_at: text('updated_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
		.$onUpdateFn(() => new Date().toISOString())
});

// ─── Historial de Estados ────────────────────────────────────────────────────
export const equipment_status_history = sqliteTable('equipment_status_history', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	equipo_id: text('equipo_id')
		.notNull()
		.references(() => equipment.id, { onDelete: 'cascade' }),
	estado_anterior: text('estado_anterior').notNull(),
	estado_nuevo: text('estado_nuevo').notNull(),
	cambiado_por: text('cambiado_por').references(() => users.id),
	created_at: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
});

// ─── Tickets ─────────────────────────────────────────────────────────────────
export const tickets = sqliteTable('tickets', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	numero_ticket: text('numero_ticket').notNull().unique(),
	titulo: text('titulo').notNull(),
	descripcion: text('descripcion').notNull().default(''),
	estado: text('estado', {
		enum: ['abierto', 'en_proceso', 'resuelto', 'cerrado']
	})
		.notNull()
		.default('abierto'),
	prioridad: text('prioridad', {
		enum: ['baja', 'media', 'alta', 'critica']
	})
		.notNull()
		.default('media'),
	usuario_reporta: text('usuario_reporta')
		.notNull()
		.references(() => users.id),
	tecnico_asignado: text('tecnico_asignado').references(() => users.id),
	equipo_id: text('equipo_id').references(() => equipment.id),
	created_at: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	updated_at: text('updated_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
		.$onUpdateFn(() => new Date().toISOString())
});

// ─── Comentarios de Tickets ──────────────────────────────────────────────────
export const ticket_comments = sqliteTable('ticket_comments', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	ticket_id: text('ticket_id')
		.notNull()
		.references(() => tickets.id, { onDelete: 'cascade' }),
	usuario_id: text('usuario_id')
		.notNull()
		.references(() => users.id),
	contenido: text('contenido').notNull(),
	created_at: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
});

// ─── Archivos Adjuntos ───────────────────────────────────────────────────────
export const ticket_attachments = sqliteTable('ticket_attachments', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	ticket_id: text('ticket_id')
		.notNull()
		.references(() => tickets.id, { onDelete: 'cascade' }),
	filename: text('filename').notNull(),
	filepath: text('filepath').notNull(),
	mime_type: text('mime_type').notNull().default(''),
	uploaded_by: text('uploaded_by')
		.notNull()
		.references(() => users.id),
	created_at: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
});

// ─── Planes de Mantenimiento Preventivo ──────────────────────────────────────
export const preventive_maintenance_plans = sqliteTable('preventive_maintenance_plans', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	nombre: text('nombre').notNull(),
	descripcion: text('descripcion').notNull().default(''),
	equipo_id: text('equipo_id').references(() => equipment.id),
	tipo_equipo_id: text('tipo_equipo_id').references(() => equipment_types.id),
	frecuencia_dias: integer('frecuencia_dias').notNull().default(30),
	created_at: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	updated_at: text('updated_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
		.$onUpdateFn(() => new Date().toISOString())
});

// ─── Tareas de PM ────────────────────────────────────────────────────────────
export const pm_tasks = sqliteTable('pm_tasks', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	plan_id: text('plan_id')
		.notNull()
		.references(() => preventive_maintenance_plans.id, { onDelete: 'cascade' }),
	nombre: text('nombre').notNull(),
	descripcion: text('descripcion').notNull().default(''),
	orden: integer('orden').notNull().default(0)
});

// ─── Ejecuciones de PM ───────────────────────────────────────────────────────
export const pm_executions = sqliteTable('pm_executions', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	plan_id: text('plan_id')
		.notNull()
		.references(() => preventive_maintenance_plans.id),
	tarea_id: text('tarea_id')
		.notNull()
		.references(() => pm_tasks.id),
	ejecutado_por: text('ejecutado_por')
		.notNull()
		.references(() => users.id),
	fecha_programada: text('fecha_programada').notNull(),
	fecha_ejecucion: text('fecha_ejecucion'),
	resultado: text('resultado', { enum: ['pendiente', 'completado', 'fallido', 'omitido'] })
		.notNull()
		.default('pendiente'),
	observaciones: text('observaciones').notNull().default(''),
	created_at: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
});

// ─── Log de Actividad ────────────────────────────────────────────────────────
export const activity_log = sqliteTable('activity_log', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	usuario_id: text('usuario_id').references(() => users.id),
	accion: text('accion').notNull(),
	entidad_tipo: text('entidad_tipo').notNull(),
	entidad_id: text('entidad_id'),
	metadata: text('metadata', { mode: 'json' })
		.$type<Record<string, unknown>>()
		.notNull()
		.default({}),
	created_at: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
});

// ─── Proveedores ─────────────────────────────────────────────────────────────
export const proveedores = sqliteTable('proveedores', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	nombre: text('nombre').notNull(),
	contacto: text('contacto').notNull().default(''),
	telefono: text('telefono').notNull().default(''),
	email: text('email').notNull().default(''),
	direccion: text('direccion').notNull().default(''),
	created_at: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
});

// ─── Configuración del Sistema ─────────────────────────────────────────────────
export const config = sqliteTable('config', {
	key: text('key').primaryKey(),
	value: text('value').notNull().default(''),
	descripcion: text('descripcion').notNull().default(''),
	tipo: text('tipo', { enum: ['text', 'number', 'email', 'tel'] })
		.notNull()
		.default('text'),
	updated_at: text('updated_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
		.$onUpdateFn(() => new Date().toISOString())
});
// ponytail: key-value settings, no relations needed

// ─── Relations ────────────────────────────────────────────────────────────────
// Required for db.query.* findFirst/findMany with `with` clause

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	tickets_reportados: many(tickets, { relationName: 'reporta' }),
	tickets_asignados: many(tickets, { relationName: 'asignado' }),
	comentarios: many(ticket_comments),
	ejecuciones: many(pm_executions)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.user_id],
		references: [users.id]
	})
}));

export const equipmentRelations = relations(equipment, ({ one, many }) => ({
	tipo: one(equipment_types, {
		fields: [equipment.tipo_id],
		references: [equipment_types.id]
	}),
	proveedor: one(proveedores, {
		fields: [equipment.proveedor_id],
		references: [proveedores.id]
	}),
	historial: many(equipment_status_history),
	tickets: many(tickets)
}));

export const equipmentStatusHistoryRelations = relations(equipment_status_history, ({ one }) => ({
	equipo: one(equipment, {
		fields: [equipment_status_history.equipo_id],
		references: [equipment.id]
	}),
	cambiado_por_user: one(users, {
		fields: [equipment_status_history.cambiado_por],
		references: [users.id]
	})
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
	reporta: one(users, {
		fields: [tickets.usuario_reporta],
		references: [users.id],
		relationName: 'reporta'
	}),
	asignado: one(users, {
		fields: [tickets.tecnico_asignado],
		references: [users.id],
		relationName: 'asignado'
	}),
	equipo: one(equipment, {
		fields: [tickets.equipo_id],
		references: [equipment.id]
	}),
	comentarios: many(ticket_comments),
	adjuntos: many(ticket_attachments)
}));

export const ticketCommentsRelations = relations(ticket_comments, ({ one }) => ({
	ticket: one(tickets, {
		fields: [ticket_comments.ticket_id],
		references: [tickets.id]
	}),
	usuario: one(users, {
		fields: [ticket_comments.usuario_id],
		references: [users.id]
	})
}));

export const ticketAttachmentsRelations = relations(ticket_attachments, ({ one }) => ({
	ticket: one(tickets, {
		fields: [ticket_attachments.ticket_id],
		references: [tickets.id]
	}),
	subido_por: one(users, {
		fields: [ticket_attachments.uploaded_by],
		references: [users.id]
	})
}));

export const pmPlansRelations = relations(preventive_maintenance_plans, ({ one, many }) => ({
	equipo: one(equipment, {
		fields: [preventive_maintenance_plans.equipo_id],
		references: [equipment.id]
	}),
	tipo_equipo: one(equipment_types, {
		fields: [preventive_maintenance_plans.tipo_equipo_id],
		references: [equipment_types.id]
	}),
	tareas: many(pm_tasks),
	ejecuciones: many(pm_executions)
}));

export const pmTasksRelations = relations(pm_tasks, ({ one, many }) => ({
	plan: one(preventive_maintenance_plans, {
		fields: [pm_tasks.plan_id],
		references: [preventive_maintenance_plans.id]
	}),
	ejecuciones: many(pm_executions)
}));

export const pmExecutionsRelations = relations(pm_executions, ({ one }) => ({
	plan: one(preventive_maintenance_plans, {
		fields: [pm_executions.plan_id],
		references: [preventive_maintenance_plans.id]
	}),
	tarea: one(pm_tasks, {
		fields: [pm_executions.tarea_id],
		references: [pm_tasks.id]
	}),
	ejecutante: one(users, {
		fields: [pm_executions.ejecutado_por],
		references: [users.id]
	})
}));
