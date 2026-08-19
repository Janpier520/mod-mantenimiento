import { db } from './index';
import {
	users,
	equipment_types,
	proveedores,
	config,
	equipment,
	tickets,
	ticket_comments,
	preventive_maintenance_plans,
	pm_tasks,
	pm_executions
} from './schema';
import { hashPassword } from '../auth';

const DEFAULT_EQUIPMENT_TYPES = [
	{ nombre: 'PC', descripcion: 'Computadora de escritorio', icono: '🖥️' },
	{ nombre: 'Notebook', descripcion: 'Computadora portátil', icono: '💻' },
	{ nombre: 'Impresora', descripcion: 'Impresora láser/tinta', icono: '🖨️' },
	{ nombre: 'Monitor', descripcion: 'Monitor de escritorio', icono: '🖥️' },
	{ nombre: 'Router', descripcion: 'Router de red', icono: '🌐' },
	{ nombre: 'Switch', descripcion: 'Switch de red', icono: '🔀' },
	{ nombre: 'Servidor', descripcion: 'Servidor físico o virtual', icono: '🗄️' },
	{ nombre: 'UPS', descripcion: 'Fuente de alimentación ininterrumpida', icono: '🔋' },
	{ nombre: 'Escáner', descripcion: 'Escáner de documentos', icono: '📄' },
	{ nombre: 'Teléfono', descripcion: 'Teléfono IP o analógico', icono: '📞' }
];

const DEFAULT_PROVEEDORES = [
	{
		nombre: 'Deltron SA',
		contacto: 'Carlos Gómez',
		telefono: '011-5555-0101',
		email: 'ventas@deltron.com',
		direccion: 'Av. Corrientes 1234, CABA'
	},
	{
		nombre: 'Bytec SA',
		contacto: 'María Fernández',
		telefono: '011-5555-0202',
		email: 'info@bytec.com',
		direccion: 'Lavalle 567, CABA'
	}
];

async function seedUser(
	username: string,
	email: string,
	password: string,
	nombre: string,
	apellido: string,
	rol: 'admin' | 'tecnico' | 'consultor',
	security?: { question1: string; answer1: string; question2: string; answer2: string }
) {
	const existing = await db.query.users.findFirst({
		where: (users, { eq }) => eq(users.username, username)
	});
	if (!existing) {
		const hash = await hashPassword(password);
		await db.insert(users).values({
			username,
			email,
			password_hash: hash,
			nombre,
			apellido,
			rol,
			activo: true,
			security_question_1: security?.question1 ?? '',
			security_answer_hash_1: security?.answer1 ? await hashPassword(security.answer1) : '',
			security_question_2: security?.question2 ?? '',
			security_answer_hash_2: security?.answer2 ? await hashPassword(security.answer2) : ''
		});
		console.log(`  ✅ User "${username}" created (${username} / ${password})`);
	} else {
		console.log(`  ⏭️  User "${username}" already exists`);
	}
}

export async function seed() {
	console.log('🌱 Seeding database...');

	// Admin user
	const adminPasswordHash = await hashPassword('admin123');
	const existingAdmin = await db.query.users.findFirst({
		where: (users, { eq }) => eq(users.username, 'admin')
	});

	if (!existingAdmin) {
		await db.insert(users).values({
			username: 'admin',
			email: 'admin@equiplab.com',
			password_hash: adminPasswordHash,
			nombre: 'Admin',
			apellido: 'Sistema',
			rol: 'admin',
			activo: true,
			security_question_1: '¿Cuál es tu color favorito?',
			security_answer_hash_1: await hashPassword('azul'),
			security_question_2: '¿Cómo se llamaba tu primera mascota?',
			security_answer_hash_2: await hashPassword('firulais')
		});
		console.log('  ✅ Admin user created (admin / admin123)');
	} else {
		console.log('  ⏭️  Admin user already exists');
	}

	// Default equipment types
	for (const et of DEFAULT_EQUIPMENT_TYPES) {
		const existing = await db.query.equipment_types.findFirst({
			where: (equipment_types, { eq }) => eq(equipment_types.nombre, et.nombre)
		});
		if (!existing) {
			await db.insert(equipment_types).values(et);
		}
	}
	console.log(`  ✅ ${DEFAULT_EQUIPMENT_TYPES.length} equipment types created`);

	// Proveedores
	for (const p of DEFAULT_PROVEEDORES) {
		const existing = await db.query.proveedores.findFirst({
			where: (proveedores, { eq }) => eq(proveedores.nombre, p.nombre)
		});
		if (!existing) {
			await db.insert(proveedores).values(p);
		}
	}
	console.log(`  ✅ ${DEFAULT_PROVEEDORES.length} proveedores created`);

	// Config defaults
	const DEFAULT_CONFIG = [
		{
			key: 'email_contacto',
			value: 'soporte@equiplab.com',
			descripcion: 'Email de contacto',
			tipo: 'email' as const
		},
		{
			key: 'telefono_contacto',
			value: '011-5555-0000',
			descripcion: 'Teléfono de contacto',
			tipo: 'tel' as const
		},
		{
			key: 'direccion_sede',
			value: 'Av. Siempre Viva 742, CABA',
			descripcion: 'Dirección de la sede',
			tipo: 'text' as const
		},
		{
			key: 'alerta_dias_mantenimiento',
			value: '7',
			descripcion: 'Días de anticipación para alerta de mantenimiento',
			tipo: 'number' as const
		}
	];
	for (const c of DEFAULT_CONFIG) {
		const existing = await db.query.config.findFirst({
			where: (config, { eq }) => eq(config.key, c.key)
		});
		if (!existing) {
			await db.insert(config).values(c);
		}
	}
	console.log(`  ✅ ${DEFAULT_CONFIG.length} config settings created`);

	// ─── Demo Data ──────────────────────────────────────────────────────────
	const existingEquipment = await db.query.equipment.findFirst();
	if (!existingEquipment) {
		console.log('📦 Creating demo data...');

		// ── Additional users ──
		await seedUser('tecnico1', 'carlos@equiplab.com', 'tecnico123', 'Carlos', 'Méndez', 'tecnico', {
			question1: '¿Cuál es tu color favorito?',
			answer1: 'tecnico',
			question2: '¿En qué ciudad naciste?',
			answer2: 'tecnico'
		});
		await seedUser(
			'consultor1',
			'laura@equiplab.com',
			'consultor123',
			'Laura',
			'Rivas',
			'consultor',
			{
				question1: '¿Cuál es tu comida favorita?',
				answer1: 'consultor',
				question2: '¿Cuál es tu apellido materno?',
				answer2: 'consultor'
			}
		);

		// ── Resolve IDs ──
		const [tecId, adminId] = await Promise.all([
			db.query.users
				.findFirst({ where: (u, { eq }) => eq(u.username, 'tecnico1') })
				.then((r) => r!.id),
			db.query.users.findFirst({ where: (u, { eq }) => eq(u.username, 'admin') }).then((r) => r!.id)
		]);

		const typeByName = new Map<string, string>();
		for (const name of ['PC', 'Notebook', 'Impresora', 'Servidor', 'Monitor', 'Router']) {
			const t = await db.query.equipment_types.findFirst({
				where: (et, { eq }) => eq(et.nombre, name)
			});
			if (t) typeByName.set(name, t.id);
		}

		const provByName = new Map<string, string>();
		for (const name of ['Deltron SA', 'Bytec SA']) {
			const p = await db.query.proveedores.findFirst({
				where: (pr, { eq }) => eq(pr.nombre, name)
			});
			if (p) provByName.set(name, p.id);
		}

		// ── Equipment ──
		const equipos = await db
			.insert(equipment)
			.values([
				{
					tipo_id: typeByName.get('PC')!,
					numero_serie: 'SN-DELL-001',
					modelo: 'OptiPlex 3080',
					marca: 'Dell',
					estado: 'operativo',
					ubicacion: 'Oficina 101',
					fecha_adquisicion: '2024-03-15',
					proveedor_id: provByName.get('Deltron SA'),
					notas: 'Equipo principal recepción'
				},
				{
					tipo_id: typeByName.get('Notebook')!,
					numero_serie: 'SN-LEN-002',
					modelo: 'ThinkPad T14',
					marca: 'Lenovo',
					estado: 'en_reparacion',
					ubicacion: 'Taller',
					fecha_adquisicion: '2023-11-20',
					proveedor_id: provByName.get('Bytec SA'),
					notas: 'Pantalla dañada — pendiente de repuesto'
				},
				{
					tipo_id: typeByName.get('Impresora')!,
					numero_serie: 'SN-HP-003',
					modelo: 'LaserJet Pro M404',
					marca: 'HP',
					estado: 'operativo',
					ubicacion: 'Oficina 102',
					fecha_adquisicion: '2024-01-10',
					proveedor_id: provByName.get('Deltron SA')
				},
				{
					tipo_id: typeByName.get('Servidor')!,
					numero_serie: 'SN-DELL-SRV-004',
					modelo: 'PowerEdge R740',
					marca: 'Dell',
					estado: 'operativo',
					ubicacion: 'Sala de servidores',
					fecha_adquisicion: '2023-06-01',
					proveedor_id: provByName.get('Deltron SA'),
					notas: 'Servidor principal — backup diario'
				},
				{
					tipo_id: typeByName.get('Monitor')!,
					numero_serie: 'SN-SAM-005',
					modelo: '24" LED S24F350',
					marca: 'Samsung',
					estado: 'prestado',
					ubicacion: 'Oficina 103 (préstamo temporal)',
					fecha_adquisicion: '2024-05-20',
					notas: 'Prestado al área de diseño'
				},
				{
					tipo_id: typeByName.get('Router')!,
					numero_serie: 'SN-CIS-006',
					modelo: 'Cisco ISR 1100',
					marca: 'Cisco',
					estado: 'dado_de_baja',
					ubicacion: 'Depósito',
					fecha_adquisicion: '2020-02-10',
					notas: 'Reemplazado por modelo nuevo — fuera de servicio'
				}
			])
			.returning({ id: equipment.id });

		console.log(`  ✅ ${equipos.length} equipos created`);

		const equipoPc = equipos[0].id;
		const equipoNotebook = equipos[1].id;
		const equipoImpresora = equipos[2].id;
		const equipoServidor = equipos[3].id;

		// ── Tickets ──
		// Numero de ticket con el mismo formato que genera la app (TKT-YYYYMMDD-NNN)
		const ticketsCreated = await db
			.insert(tickets)
			.values([
				{
					numero_ticket: 'TKT-20260728-001',
					titulo: 'PC no enciende',
					descripcion:
						'Al presionar el botón de encendido no hay respuesta. No se encienden luces ni ventiladores.',
					estado: 'abierto',
					prioridad: 'alta',
					usuario_reporta: adminId,
					equipo_id: equipoPc,
					created_at: '2026-07-28T10:15:00.000Z'
				},
				{
					numero_ticket: 'TKT-20260729-001',
					titulo: 'Notebook con pantalla rota',
					descripcion:
						'La pantalla muestra líneas verticales y zonas oscuras. Probablemente golpe en la tapa.',
					estado: 'en_proceso',
					prioridad: 'media',
					usuario_reporta: adminId,
					tecnico_asignado: tecId,
					equipo_id: equipoNotebook,
					created_at: '2026-07-29T09:00:00.000Z'
				},
				{
					numero_ticket: 'TKT-20260729-002',
					titulo: 'Impresora no jala papel',
					descripcion:
						'La impresora hace ruido pero no toma el papel de la bandeja. Ya se revisaron los rodillos.',
					estado: 'resuelto',
					prioridad: 'baja',
					usuario_reporta: tecId,
					tecnico_asignado: tecId,
					equipo_id: equipoImpresora,
					created_at: '2026-07-29T14:30:00.000Z'
				},
				{
					numero_ticket: 'TKT-20260730-001',
					titulo: 'Servidor sobrecalentado',
					descripcion:
						'La temperatura del servidor principal llegó a 85°C. Se apagó automáticamente por seguridad.',
					estado: 'cerrado',
					prioridad: 'critica',
					usuario_reporta: adminId,
					tecnico_asignado: tecId,
					equipo_id: equipoServidor,
					created_at: '2026-07-30T08:45:00.000Z'
				}
			])
			.returning({ id: tickets.id, numero_ticket: tickets.numero_ticket });

		console.log(`  ✅ ${ticketsCreated.length} tickets created`);

		const tkNotebook = ticketsCreated.find((t) => t.numero_ticket === 'TKT-20260729-001')!.id;
		const tkImpresora = ticketsCreated.find((t) => t.numero_ticket === 'TKT-20260729-002')!.id;
		const tkServidor = ticketsCreated.find((t) => t.numero_ticket === 'TKT-20260730-001')!.id;

		// ── Comments ──
		await db.insert(ticket_comments).values([
			{
				ticket_id: tkNotebook,
				usuario_id: tecId,
				contenido: 'Ya pedí el repuesto al proveedor. Estimado 3 días hábiles para la entrega.',
				created_at: '2026-07-29T15:20:00.000Z'
			},
			{
				ticket_id: tkImpresora,
				usuario_id: tecId,
				contenido:
					'Se reemplazaron los rodillos y se calibró la bandeja. Impresora funcionando correctamente.',
				created_at: '2026-07-30T11:10:00.000Z'
			},
			{
				ticket_id: tkServidor,
				usuario_id: tecId,
				contenido:
					'Se limpiaron los filtros y se reaplicó pasta térmica. Temperatura estable en 55°C. Se recomienda revisar el sistema de refrigeración del rack.',
				created_at: '2026-07-30T12:00:00.000Z'
			}
		]);

		console.log('  ✅ 3 comentarios created');

		// ── PM Plans ──
		const planes = await db
			.insert(preventive_maintenance_plans)
			.values([
				{
					nombre: 'Mantenimiento trimestral Servidor',
					descripcion: 'Revisión completa del servidor principal cada 3 meses',
					equipo_id: equipoServidor,
					frecuencia_dias: 90
				},
				{
					nombre: 'Revisión mensual PCs',
					descripcion: 'Limpieza y actualización de PCs de escritorio',
					tipo_equipo_id: typeByName.get('PC')!,
					frecuencia_dias: 30
				}
			])
			.returning({
				id: preventive_maintenance_plans.id,
				nombre: preventive_maintenance_plans.nombre
			});

		console.log(`  ✅ ${planes.length} planes de mantenimiento created`);

		const planServidor = planes.find((p) => p.nombre.includes('Servidor'))!.id;
		const planPcs = planes.find((p) => p.nombre.includes('PCs'))!.id;

		// ── PM Tasks ──
		const tareas = await db
			.insert(pm_tasks)
			.values([
				{ plan_id: planServidor, nombre: 'Limpiar ventiladores y filtros', orden: 1 },
				{
					plan_id: planServidor,
					nombre: 'Verificar estado de discos duros (S.M.A.R.T.)',
					orden: 2
				},
				{ plan_id: planServidor, nombre: 'Actualizar firmware y parches de seguridad', orden: 3 },
				{ plan_id: planPcs, nombre: 'Limpiar interior de polvo', orden: 1 },
				{ plan_id: planPcs, nombre: 'Actualizar software y sistema operativo', orden: 2 }
			])
			.returning({ id: pm_tasks.id, nombre: pm_tasks.nombre });

		console.log(`  ✅ ${tareas.length} tareas de mantenimiento created`);

		const tareaLimpiar = tareas.find((t) => t.nombre.includes('Limpiar ventiladores'))!.id;
		const tareaDiscos = tareas.find((t) => t.nombre.includes('discos'))!.id;

		// ── PM Executions ──
		await db.insert(pm_executions).values([
			{
				plan_id: planServidor,
				tarea_id: tareaLimpiar,
				ejecutado_por: tecId,
				fecha_programada: '2026-04-01',
				fecha_ejecucion: '2026-04-02',
				resultado: 'completado',
				observaciones: 'Filtros lavados y ventiladores sin obstrucciones.'
			},
			{
				plan_id: planServidor,
				tarea_id: tareaDiscos,
				ejecutado_por: tecId,
				fecha_programada: '2026-04-01',
				fecha_ejecucion: '2026-04-02',
				resultado: 'completado',
				observaciones: 'Todos los discos en estado óptimo. RAID 5 consistente.'
			},
			{
				plan_id: planPcs,
				tarea_id: tareas.find((t) => t.nombre.includes('Limpiar interior'))!.id,
				ejecutado_por: tecId,
				fecha_programada: '2026-07-15',
				resultado: 'pendiente',
				observaciones: ''
			}
		]);

		console.log('  ✅ 3 ejecuciones de mantenimiento created');
	} else {
		console.log('  ⏭️  Demo data already exists — skipping');
	}

	console.log('✅ Seed complete!');
}

// Allow running directly via: npx tsx src/lib/server/db/seed.ts
const isMain = process.argv[1]?.includes('seed');
if (isMain) {
	seed().catch(console.error);
}
