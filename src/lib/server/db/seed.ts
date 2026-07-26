import { db } from './index';
import { users, equipment_types, proveedores, config } from './schema';
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
			key: 'empresa_nombre',
			value: 'EquipLab',
			descripcion: 'Nombre de la empresa',
			tipo: 'text' as const
		},
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

	console.log('✅ Seed complete!');
}

// Allow running directly via: npx tsx src/lib/server/db/seed.ts
const isMain = process.argv[1]?.includes('seed');
if (isMain) {
	seed().catch(console.error);
}
