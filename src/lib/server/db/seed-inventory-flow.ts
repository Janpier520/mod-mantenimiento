/**
 * Seed: Complete Inventory Flow
 *
 * Generates a realistic scenario demonstrating the full inventory lifecycle:
 *   1. Inventory items (catalog of spare parts)
 *   2. Stock movements (entrada, salida, ajuste)
 *   3. PM plans with tasks linked to inventory items
 *   4. PM executions completed with parts (atomic stock deduction)
 *   5. Verification of stock after each operation
 *
 * Run: npx tsx src/lib/server/db/seed-inventory-flow.ts
 *
 * IMPORTANT: Run `npm run db:seed` first to create base data (users, equipment, etc.)
 */
import { db } from './index';
import {
	users,
	equipment_types,
	equipment,
	inventory_items,
	inventory_movements,
	preventive_maintenance_plans,
	pm_tasks,
	pm_executions,
	pm_execution_parts
} from './schema';
import { eq, sql } from 'drizzle-orm';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(emoji: string, msg: string) {
	console.log(`  ${emoji} ${msg}`);
}

async function getOrCreate<T extends { id: string }>(
	table: typeof inventory_items,
	condition: (row: T) => boolean,
	finder: () => Promise<T | undefined>,
	creator: () => Promise<T>
): Promise<T> {
	const existing = await finder();
	if (existing) return existing;
	return creator();
}

// ─── Main ────────────────────────────────────────────────────────────────────

export async function seedInventoryFlow() {
	console.log('\n🔄 Seeding complete inventory flow...\n');

	// ── Resolve prerequisites ──────────────────────────────────────────────
	const admin = await db.query.users.findFirst({
		where: (u, { eq }) => eq(u.username, 'admin')
	});
	if (!admin) {
		console.error('❌ Admin user not found. Run `npm run db:seed` first.');
		process.exit(1);
	}

	const tecnico = await db.query.users.findFirst({
		where: (u, { eq }) => eq(u.username, 'tecnico1')
	});
	if (!tecnico) {
		console.error('❌ Tecnico1 user not found. Run `npm run db:seed` first.');
		process.exit(1);
	}

	const tipoPC = await db.query.equipment_types.findFirst({
		where: (et, { eq }) => eq(et.nombre, 'PC')
	});
	const tipoServidor = await db.query.equipment_types.findFirst({
		where: (et, { eq }) => eq(et.nombre, 'Servidor')
	});
	const tipoImpresora = await db.query.equipment_types.findFirst({
		where: (et, { eq }) => eq(et.nombre, 'Impresora')
	});

	if (!tipoPC || !tipoServidor || !tipoImpresora) {
		console.error('❌ Equipment types not found. Run `npm run db:seed` first.');
		process.exit(1);
	}

	// ═══════════════════════════════════════════════════════════════════════
	// PHASE 1: Create inventory items with realistic data
	// ═══════════════════════════════════════════════════════════════════════

	console.log('📦 Phase 1: Creating inventory items...');

	const itemsData = [
		{
			nombre: 'Pastas Térmica MX-4',
			descripcion: 'Pasta térmica Arctic MX-4 4g — conductividad 8.5 W/mK',
			codigo_parte: 'PASTA-MX4-4G',
			categoria: 'Refrigeración',
			tipo_equipo_id: null,
			stock_actual: 10,
			stock_minimo: 3,
			ubicacion: 'Almacén Principal'
		},
		{
			nombre: 'Ventilador 120mm PWM',
			descripcion: 'Ventilador Noctua NF-S12A PWM 120mm para gabinetes y heatsinks',
			codigo_parte: 'FAN-120PWM',
			categoria: 'Refrigeración',
			tipo_equipo_id: tipoPC.id,
			stock_actual: 8,
			stock_minimo: 4,
			ubicacion: 'Almacén Principal'
		},
		{
			nombre: 'Fuente 650W 80+ Gold',
			descripcion: 'Fuente de poder Corsair RM650x 80 Plus Gold modular',
			codigo_parte: 'FUENTE-650G',
			categoria: 'Energía',
			tipo_equipo_id: tipoPC.id,
			stock_actual: 4,
			stock_minimo: 2,
			ubicacion: 'Almacén Principal'
		},
		{
			nombre: 'RAM DDR5 32GB',
			descripcion: 'Módulo Kingston Fury Beast DDR5 5200MHz 32GB',
			codigo_parte: 'RAM-DDR5-32G',
			categoria: 'Memoria',
			tipo_equipo_id: tipoServidor.id,
			stock_actual: 6,
			stock_minimo: 4,
			ubicacion: 'Almacén Servidores'
		},
		{
			nombre: 'SSD NVMe 1TB',
			descripcion: 'Disco Samsung 980 PRO NVMe M.2 1TB',
			codigo_parte: 'SSD-NVMe-1T',
			categoria: 'Almacenamiento',
			tipo_equipo_id: tipoServidor.id,
			stock_actual: 3,
			stock_minimo: 2,
			ubicacion: 'Almacén Servidores'
		},
		{
			nombre: 'Filtro HEPA UPS',
			descripcion: 'Filtro HEPA reemplazable para cabinas de rack UPS',
			codigo_parte: 'FILTER-HEPA',
			categoria: 'Refrigeración',
			tipo_equipo_id: null,
			stock_actual: 12,
			stock_minimo: 6,
			ubicacion: 'Almacén Principal'
		},
		{
			nombre: 'Tóner HP 305A Negro',
			clave: 'TONER-HP305A',
			codigo_parte: 'TONER-HP305A',
			descripcion: 'Cartucho tóner negro HP 305A CE410A',
			categoria: 'Tintas',
			tipo_equipo_id: tipoImpresora.id,
			stock_actual: 5,
			stock_minimo: 3,
			ubicacion: 'Almacén Secundario'
		},
		{
			nombre: 'Cable Red Cat6 3m',
			descripcion: 'Cable Ethernet Cat6 UTP 3 metrosAzul',
			codigo_parte: 'CABLE-CAT6-3M',
			categoria: 'Cables',
			tipo_equipo_id: null,
			stock_actual: 50,
			stock_minimo: 20,
			ubicacion: 'Almacén Redes'
		},
		{
			nombre: ' UPS 2000VA Batería',
			descripcion: 'Kit de baterías de reemplazo para UPS 2000VA',
			codigo_parte: 'BAT-UPS-2000',
			categoria: 'Energía',
			tipo_equipo_id: null,
			stock_actual: 2,
			stock_minimo: 2,
			ubicacion: 'Almacén Principal'
		}
	];

	const createdItems: { id: string; nombre: string; stock_actual: number; stock_minimo: number }[] =
		[];

	for (const item of itemsData) {
		const existing = await db.query.inventory_items.findFirst({
			where: (ii, { eq }) => eq(ii.codigo_parte, item.codigo_parte)
		});
		if (existing) {
			log('⏭️', `Item "${item.nombre}" already exists`);
			createdItems.push(existing);
		} else {
			const [row] = await db
				.insert(inventory_items)
				.values(item)
				.returning({
					id: inventory_items.id,
					nombre: inventory_items.nombre,
					stock_actual: inventory_items.stock_actual,
					stock_minimo: inventory_items.stock_minimo
				});
			createdItems.push(row);
			log('✅', `Item "${row.nombre}" created (stock: ${row.stock_actual})`);
		}
	}

	// ═══════════════════════════════════════════════════════════════════════
	// PHASE 2: Create stock movements (entrada, salida, ajuste)
	// ═══════════════════════════════════════════════════════════════════════

	console.log('\n📦 Phase 2: Creating stock movements...');

	const pastasTermica = createdItems.find((i) => i.nombre.includes('Pastas Térmica'))!;
	const ventilador = createdItems.find((i) => i.nombre.includes('Ventilador'))!;
	const fuente = createdItems.find((i) => i.nombre.includes('Fuente 650'))!;
	const ramDDR5 = createdItems.find((i) => i.nombre.includes('RAM DDR5'))!;
	const ssdNVMe = createdItems.find((i) => i.nombre.includes('SSD NVMe'))!;
	const filtroHEPA = createdItems.find((i) => i.nombre.includes('Filtro HEPA'))!;
	const toHP = createdItems.find((i) => i.nombre.includes('Tóner HP 305'))!;
	const cableCat6 = createdItems.find((i) => i.nombre.includes('Cable Red Cat6'))!;
	const batUPS = createdItems.find((i) => i.nombre.includes('UPS 2000VA'))!;

	// Check if movements already exist for these items
	const existingMovements = await db.query.inventory_movements.findFirst();
	if (existingMovements) {
		log('⏭️', 'Movements already exist — skipping Phase 2');
	} else {
		const movements = [
			// ── Entradas (compras de stock) ──
			{
				inventory_item_id: pastasTermica.id,
				tipo: 'entrada' as const,
				cantidad: 5,
				motivo: 'Compra de reposición — proveedor Deltron SA',
				usuario_id: admin.id,
				referencia_tipo: 'compra',
				referencia_id: null
			},
			{
				inventory_item_id: ventilador.id,
				tipo: 'entrada' as const,
				cantidad: 4,
				motivo: 'Compra de stock mínimo — proveedor Bytec SA',
				usuario_id: admin.id,
				referencia_tipo: 'compra',
				referencia_id: null
			},
			{
				inventory_item_id: cableCat6.id,
				tipo: 'entrada' as const,
				cantidad: 30,
				motivo: 'Compra mayorista — lote de 30 cables Cat6',
				usuario_id: admin.id,
				referencia_tipo: 'compra',
				referencia_id: null
			},
			// ── Salidas (uso en mantenimiento) ──
			{
				inventory_item_id: pastasTermica.id,
				tipo: 'salida' as const,
				cantidad: 2,
				motivo: 'Reaplicación pasta térmica en servidor Dell PowerEdge R740',
				usuario_id: tecnico.id,
				referencia_tipo: 'ticket',
				referencia_id: null
			},
			{
				inventory_item_id: ventilador.id,
				tipo: 'salida' as const,
				cantidad: 1,
				motivo: 'Reemplazo ventilador defectuoso en PC OptiPlex 3080',
				usuario_id: tecnico.id,
				referencia_tipo: 'ticket',
				referencia_id: null
			},
			// ── Ajustes (inventario físico) ──
			{
				inventory_item_id: batUPS.id,
				tipo: 'ajuste' as const,
				cantidad: 1,
				motivo: 'Ajuste por batería dañada encontrada en inspección física',
				usuario_id: admin.id,
				referencia_tipo: null,
				referencia_id: null
			},
			{
				inventory_item_id: cableCat6.id,
				tipo: 'salida' as const,
				cantidad: 5,
				motivo: 'Instalación cableado rack sala de servidores',
				usuario_id: tecnico.id,
				referencia_tipo: 'ticket',
				referencia_id: null
			}
		];

		const createdMovements = await db
			.insert(inventory_movements)
			.values(movements)
			.returning({ id: inventory_movements.id });

		log('✅', `${createdMovements.length} movements created (entradas, salidas, ajustes)`);

		// Update stock based on movements (the CRUD service does this, but we seed directly)
		// pastasTermica: 10 + 5 - 2 = 13
		await db
			.update(inventory_items)
			.set({ stock_actual: 13 })
			.where(eq(inventory_items.id, pastasTermica.id));
		// ventilador: 8 + 4 - 1 = 11
		await db
			.update(inventory_items)
			.set({ stock_actual: 11 })
			.where(eq(inventory_items.id, ventilador.id));
		// cableCat6: 50 + 30 - 5 = 75
		await db
			.update(inventory_items)
			.set({ stock_actual: 75 })
			.where(eq(inventory_items.id, cableCat6.id));
		// batUPS: ajúste a 1
		await db
			.update(inventory_items)
			.set({ stock_actual: 1 })
			.where(eq(inventory_items.id, batUPS.id));

		log('📊', 'Stock updated after movements');
	}

	// ═══════════════════════════════════════════════════════════════════════
	// PHASE 3: Create PM plans with tasks linked to inventory items
	// ═══════════════════════════════════════════════════════════════════════

	console.log('\n🔧 Phase 3: Creating PM plans with inventory-linked tasks...');

	const existingPlans = await db.query.preventive_maintenance_plans.findMany();
	const hasFlowPlans = existingPlans.some((p) => p.nombre.includes('Mantenimiento PCs'));
	if (hasFlowPlans) {
		log('⏭️', 'Flow PM plans already exist — skipping Phase 3');
	} else {
		// Plan 1: PC Preventive Maintenance (monthly, uses paste + fan)
		const [planPC] = await db
			.insert(preventive_maintenance_plans)
			.values({
				nombre: 'Mantenimiento Preventivo PCs',
				descripcion: 'Limpieza, repaste y verificación de componentes críticos',
				tipo_equipo_id: tipoPC.id,
				frecuencia_dias: 30
			})
			.returning({ id: preventive_maintenance_plans.id });

		const tasksPC = await db
			.insert(pm_tasks)
			.values([
				{
					plan_id: planPC.id,
					nombre: 'Reaplicar pasta térmica',
					descripcion: 'Retirar disipador, limpiar pasta vieja, aplicar MX-4 nueva',
					orden: 1,
					inventory_item_id: pastasTermica.id
				},
				{
					plan_id: planPC.id,
					nombre: 'Verificar y reemplazar ventiladores',
					descripcion: 'Chequear RPM, ruido y temperatura. Reemplazar si falla.',
					orden: 2,
					inventory_item_id: ventilador.id
				},
				{
					plan_id: planPC.id,
					nombre: 'Limpiar filtros y polvo interior',
					descripcion: 'Aspirar polvo de gabinete, limpiar filtros con aire comprimido',
					orden: 3,
					inventory_item_id: null
				},
			{
				plan_id: planPC.id,
				nombre: 'Verificar fuente de poder',
				descripcion: 'Medir voltajes con multimetro, verificar estabilidad',
				orden: 4,
				inventory_item_id: fuente.id
			}
			])
			.returning({ id: pm_tasks.id, nombre: pm_tasks.nombre });

		log('✅', `Plan "Mantenimiento Preventivo PCs" created with ${tasksPC.length} tasks`);

		// Plan 2: Server Maintenance (quarterly, uses SSD + RAM)
		const [planServer] = await db
			.insert(preventive_maintenance_plans)
			.values({
				nombre: 'Mantenimiento Servidores críticos',
				descripcion: 'Revisión profunda de hardware, storage y memoria del servidor principal',
				equipo_id: (
					await db.query.equipment.findFirst({
						where: (eq2, { eq }) => eq(eq2.marca, 'Dell')
					})
				)?.id,
				frecuencia_dias: 90
			})
			.returning({ id: preventive_maintenance_plans.id });

		const tasksServer = await db
			.insert(pm_tasks)
			.values([
				{
					plan_id: planServer.id,
					nombre: 'Verificar salud de SSDs (S.M.A.R.T.)',
					descripcion: 'Leer atributos SMART, verificar percentage_used y bad_blocks',
					orden: 1,
					inventory_item_id: ssdNVMe.id
				},
				{
					plan_id: planServer.id,
					nombre: 'Test de memoria RAM',
					descripcion: 'Ejecutar memtest86+ durante 4 horas, verificar errores',
					orden: 2,
					inventory_item_id: ramDDR5.id
				},
				{
					plan_id: planServer.id,
					nombre: 'Limpiar y reemplazar filtros HEPA',
					descripcion: 'Retirar filtros sucios del rack, instalar filtros HEPA nuevos',
					orden: 3,
					inventory_item_id: filtroHEPA.id
				}
			])
			.returning({ id: pm_tasks.id, nombre: pm_tasks.nombre });

		log('✅', `Plan "Mantenimiento Servidores críticos" created with ${tasksServer.length} tasks`);

		// Plan 3: Printer Maintenance (uses toner)
		const [planPrinter] = await db
			.insert(preventive_maintenance_plans)
			.values({
				nombre: 'Mantenimiento Impresoras',
				descripcion: 'Calibración, limpieza y reposición de consumibles',
				tipo_equipo_id: tipoImpresora.id,
				frecuencia_dias: 60
			})
			.returning({ id: preventive_maintenance_plans.id });

		const tasksPrinter = await db
			.insert(pm_tasks)
			.values([
				{
					plan_id: planPrinter.id,
					nombre: 'Reemplazar tóner',
					descripcion: 'Instalar cartucho nuevo HP 305A, desechar el vacío',
					orden: 1,
					inventory_item_id: toHP.id
				},
				{
					plan_id: planPrinter.id,
					nombre: 'Limpiar rodillos de alimentación',
					descripcion: 'Limpiar rodillos con alcohol isopropílico, verificar tracción',
					orden: 2,
					inventory_item_id: null
				}
			])
			.returning({ id: pm_tasks.id, nombre: pm_tasks.nombre });

		log('✅', `Plan "Mantenimiento Impresoras" created with ${tasksPrinter.length} tasks`);
	}

	// ═══════════════════════════════════════════════════════════════════════
	// PHASE 4: Schedule and complete PM executions with parts
	// ═══════════════════════════════════════════════════════════════════════

	console.log('\n🔧 Phase 4: Creating PM executions with parts (stock deduction)...');

	// Check if flow executions already exist
	const flowPlans = await db.query.preventive_maintenance_plans.findMany({
		where: (p, { or, eq }) =>
			or(
				eq(p.nombre, 'Mantenimiento Preventivo PCs'),
				eq(p.nombre, 'Mantenimiento Servidores críticos'),
				eq(p.nombre, 'Mantenimiento Impresoras')
			)
	});

	if (flowPlans.length === 0) {
		log('⏭️', 'No flow PM plans found — skipping Phase 4');
	} else {
		// Check if executions already exist for these plans
		const planIds = flowPlans.map((p) => p.id);
		const [existingExecCount] = await db
			.select({ cnt: sql<number>`count(*)` })
			.from(pm_executions)
			.where(
				sql`${pm_executions.plan_id} IN (${sql.join(
					planIds.map((id) => sql`${id}`),
					sql`, `
				)})`
			);

		if (existingExecCount.cnt > 0) {
			log('⏭️', 'Flow executions already exist — skipping Phase 4');
		} else {
			// ── PC Maintenance: Complete 1 execution with parts ──
			const planPC = flowPlans.find((p) => p.nombre.includes('PCs'));
			if (planPC) {
				const pcTasks = await db.query.pm_tasks.findMany({
					where: (t, { eq }) => eq(t.plan_id, planPC.id)
				});

				// Schedule executions for all tasks
				const pcExecs = await db
					.insert(pm_executions)
					.values(
						pcTasks.map((t) => ({
							plan_id: planPC.id,
							tarea_id: t.id,
							ejecutado_por: tecnico.id,
							fecha_programada: '2026-08-20',
							resultado: 'pendiente' as const
						}))
					)
					.returning({ id: pm_executions.id, tarea_id: pm_executions.tarea_id });

				log('✅', `${pcExecs.length} PC maintenance executions scheduled`);

				// Complete the "Reaplicar pasta térmica" execution with parts
				const repasteExec = pcExecs.find(
					(e) => e.tarea_id === pcTasks.find((t) => t.nombre.includes('pasta'))?.id
				);
				if (repasteExec) {
					const partsBefore = await db.query.inventory_items.findFirst({
						where: (i, { eq }) => eq(i.id, pastasTermica.id)
					});
					const stockBefore = partsBefore?.stock_actual ?? 0;

					// Simulate completeExecution with parts (inline, since service may not be importable from seed)
					await db.transaction(async (tx) => {
						await tx
							.update(pm_executions)
							.set({
								fecha_ejecucion: '2026-08-20T10:30:00.000Z',
								resultado: 'completado',
								observaciones:
									'Se reaplicó pasta térmica MX-4 en CPU. TemperaturaIdle: 38°C → 32°C.'
							})
							.where(eq(pm_executions.id, repasteExec.id));

						await tx.insert(pm_execution_parts).values({
							pm_execution_id: repasteExec.id,
							inventory_item_id: pastasTermica.id,
							accion: 'instalado',
							cantidad: 1,
							observaciones: 'Aplicación de pasta MX-4 en CPU del equipo'
						});

						// Deduct stock: 13 - 1 = 12
						await tx
							.update(inventory_items)
							.set({ stock_actual: stockBefore - 1 })
							.where(eq(inventory_items.id, pastasTermica.id));

						await tx.insert(inventory_movements).values({
							inventory_item_id: pastasTermica.id,
							tipo: 'salida',
							cantidad: 1,
							motivo: 'PM ejecución: instalado — reaplicación pasta térmica',
							usuario_id: tecnico.id,
							referencia_tipo: 'pm_execution',
							referencia_id: repasteExec.id
						});
					});

					log(
						'✅',
						`Pasta térmica execution completed (stock: ${stockBefore} → ${stockBefore - 1})`
					);
				}

				// Complete the "Verificar y reemplazar ventiladores" — mark as fallido (no replacement needed)
				const fanExec = pcExecs.find(
					(e) => e.tarea_id === pcTasks.find((t) => t.nombre.includes('ventilador'))?.id
				);
				if (fanExec) {
					await db
						.update(pm_executions)
						.set({
							fecha_ejecucion: '2026-08-20T11:00:00.000Z',
							resultado: 'completado',
							observaciones:
								'Ventiladores funcionando a 1200 RPM. Sin ruido anormal. No se requiere reemplazo.'
						})
						.where(eq(pm_executions.id, fanExec.id));

					// No parts used — execution completed without stock impact
					log('✅', 'Fan verification completed (no stock impact — no replacement needed)');
				}

				// Cancel the "Limpiar filtros" execution
				const cleanExec = pcExecs.find(
					(e) => e.tarea_id === pcTasks.find((t) => t.nombre.includes('Limpiar filtros'))?.id
				);
				if (cleanExec) {
					await db
						.update(pm_executions)
						.set({ resultado: 'cancelada' })
						.where(eq(pm_executions.id, cleanExec.id));
					log('✅', 'Filter cleaning execution cancelled (rescheduled for next week)');
				}

				// Complete the "Verificar fuente de poder" with part
				const psuExec = pcExecs.find(
					(e) => e.tarea_id === pcTasks.find((t) => t.nombre.includes('fuente'))?.id
				);
				if (psuExec) {
					const psuBefore = await db.query.inventory_items.findFirst({
						where: (i, { eq }) => eq(i.id, fuente.id)
					});
					const stockBeforePSU = psuBefore?.stock_actual ?? 0;

					await db.transaction(async (tx) => {
						await tx
							.update(pm_executions)
							.set({
								fecha_ejecucion: '2026-08-20T11:30:00.000Z',
								resultado: 'completado',
								observaciones:
									'Fuente mostrando voltajes inestables (+12V fluctúa entre 11.4V-11.8V). Se reemplazó preventivamente.'
							})
							.where(eq(pm_executions.id, psuExec.id));

						await tx.insert(pm_execution_parts).values({
							pm_execution_id: psuExec.id,
							inventory_item_id: fuente.id,
							accion: 'reemplazado',
							cantidad: 1,
							observaciones: 'Reemplazo preventivo de fuente 650W'
						});

						// Deduct stock: 4 - 1 = 3
						await tx
							.update(inventory_items)
							.set({ stock_actual: stockBeforePSU - 1 })
							.where(eq(inventory_items.id, fuente.id));

						await tx.insert(inventory_movements).values({
							inventory_item_id: fuente.id,
							tipo: 'salida',
							cantidad: 1,
							motivo: 'PM ejecución: reemplazado — fuente preventiva',
							usuario_id: tecnico.id,
							referencia_tipo: 'pm_execution',
							referencia_id: psuExec.id
						});
					});

					log(
						'✅',
						`PSU replacement completed (stock: ${stockBeforePSU} → ${stockBeforePSU - 1})`
					);
				}
			}

			// ── Server Maintenance: Complete 1 execution with parts ──
			const planServer = flowPlans.find((p) => p.nombre.includes('Servidores'));
			if (planServer) {
				const serverTasks = await db.query.pm_tasks.findMany({
					where: (t, { eq }) => eq(t.plan_id, planServer.id)
				});

				const serverExecs = await db
					.insert(pm_executions)
					.values(
						serverTasks.map((t) => ({
							plan_id: planServer.id,
							tarea_id: t.id,
							ejecutado_por: tecnico.id,
							fecha_programada: '2026-08-22',
							resultado: 'pendiente' as const
						}))
					)
					.returning({ id: pm_executions.id, tarea_id: pm_executions.tarea_id });

				log('✅', `${serverExecs.length} server maintenance executions scheduled`);

				// Complete SSD verification with part
				const ssdExec = serverExecs.find(
					(e) =>
						e.tarea_id === serverTasks.find((t) => t.nombre.includes('SSD'))?.id
				);
				if (ssdExec) {
					const ssdBefore = await db.query.inventory_items.findFirst({
						where: (i, { eq }) => eq(i.id, ssdNVMe.id)
					});
					const stockBeforeSSD = ssdBefore?.stock_actual ?? 0;

					await db.transaction(async (tx) => {
						await tx
							.update(pm_executions)
							.set({
								fecha_ejecucion: '2026-08-22T09:00:00.000Z',
								resultado: 'completado',
								observaciones:
									'SSD 980 PRO: percentage_used 12%, 0 bad blocks. Salud óptima. Se reemplazó preventivamente por modelo nuevo.'
							})
							.where(eq(pm_executions.id, ssdExec.id));

						await tx.insert(pm_execution_parts).values({
							pm_execution_id: ssdExec.id,
							inventory_item_id: ssdNVMe.id,
							accion: 'reemplazado',
							cantidad: 1,
							observaciones: 'Reemplazo preventivo SSD NVMe por alto uso (12%)'
						});

						// Deduct stock: 3 - 1 = 2
						await tx
							.update(inventory_items)
							.set({ stock_actual: stockBeforeSSD - 1 })
							.where(eq(inventory_items.id, ssdNVMe.id));

						await tx.insert(inventory_movements).values({
							inventory_item_id: ssdNVMe.id,
							tipo: 'salida',
							cantidad: 1,
							motivo: 'PM ejecución: reemplazado — SSD preventivo',
							usuario_id: tecnico.id,
							referencia_tipo: 'pm_execution',
							referencia_id: ssdExec.id
						});
					});

					log(
						'✅',
						`SSD replacement completed (stock: ${stockBeforeSSD} → ${stockBeforeSSD - 1})`
					);
				}

				// Complete RAM test — no parts needed
				const ramExec = serverExecs.find(
					(e) => e.tarea_id === serverTasks.find((t) => t.nombre.includes('RAM'))?.id
				);
				if (ramExec) {
					await db
						.update(pm_executions)
						.set({
							fecha_ejecucion: '2026-08-22T13:00:00.000Z',
							resultado: 'completado',
							observaciones: 'memtest86+ completado: 0 errores en 4 horas. 128GB ECC OK.'
						})
						.where(eq(pm_executions.id, ramExec.id));
					log('✅', 'RAM test completed (no stock impact)');
				}

				// Complete HEPA filter replacement
				const hepaExec = serverExecs.find(
					(e) => e.tarea_id === serverTasks.find((t) => t.nombre.includes('HEPA'))?.id
				);
				if (hepaExec) {
					const hepaBefore = await db.query.inventory_items.findFirst({
						where: (i, { eq }) => eq(i.id, filtroHEPA.id)
					});
					const stockBeforeHEPA = hepaBefore?.stock_actual ?? 0;

					await db.transaction(async (tx) => {
						await tx
							.update(pm_executions)
							.set({
								fecha_ejecucion: '2026-08-22T14:00:00.000Z',
								resultado: 'completado',
								observaciones:
									'Filtros HEPA viejos retirados (muy sucios). Se instalaron 2 filtros nuevos.'
							})
							.where(eq(pm_executions.id, hepaExec.id));

						await tx.insert(pm_execution_parts).values({
							pm_execution_id: hepaExec.id,
							inventory_item_id: filtroHEPA.id,
							accion: 'instalado',
							cantidad: 2,
							observaciones: 'Instalación de 2 filtros HEPA en rack de servidores'
						});

						// Deduct stock: 12 - 2 = 10
						await tx
							.update(inventory_items)
							.set({ stock_actual: stockBeforeHEPA - 2 })
							.where(eq(inventory_items.id, filtroHEPA.id));

						await tx.insert(inventory_movements).values({
							inventory_item_id: filtroHEPA.id,
							tipo: 'salida',
							cantidad: 2,
							motivo: 'PM ejecución: instalado — filtros HEPA rack',
							usuario_id: tecnico.id,
							referencia_tipo: 'pm_execution',
							referencia_id: hepaExec.id
						});
					});

					log(
						'✅',
						`HEPA filter replacement completed (stock: ${stockBeforeHEPA} → ${stockBeforeHEPA - 2})`
					);
				}
			}

			// ── Printer Maintenance: Complete execution with toner ──
			const planPrinter = flowPlans.find((p) => p.nombre.includes('Impresoras'));
			if (planPrinter) {
				const printerTasks = await db.query.pm_tasks.findMany({
					where: (t, { eq }) => eq(t.plan_id, planPrinter.id)
				});

				const printerExecs = await db
					.insert(pm_executions)
					.values(
						printerTasks.map((t) => ({
							plan_id: planPrinter.id,
							tarea_id: t.id,
							ejecutado_por: tecnico.id,
							fecha_programada: '2026-08-18',
							resultado: 'pendiente' as const
						}))
					)
					.returning({ id: pm_executions.id, tarea_id: pm_executions.tarea_id });

				log('✅', `${printerExecs.length} printer maintenance executions scheduled`);

				// Complete toner replacement
				const tonerExec = printerExecs.find(
					(e) =>
						e.tarea_id === printerTasks.find((t) => t.nombre.includes('tóner'))?.id
				);
				if (tonerExec) {
					const tonerBefore = await db.query.inventory_items.findFirst({
						where: (i, { eq }) => eq(i.id, toHP.id)
					});
					const stockBeforeToner = tonerBefore?.stock_actual ?? 0;

					await db.transaction(async (tx) => {
						await tx
							.update(pm_executions)
							.set({
								fecha_ejecucion: '2026-08-18T10:00:00.000Z',
								resultado: 'completado',
								observaciones:
									'Tóner vacío reemplazado. Cartucho nuevo instalado y calibrado.'
							})
							.where(eq(pm_executions.id, tonerExec.id));

						await tx.insert(pm_execution_parts).values({
							pm_execution_id: tonerExec.id,
							inventory_item_id: toHP.id,
							accion: 'instalado',
							cantidad: 1,
							observaciones: 'Reemplazo de tóner HP 305A negro'
						});

						// Deduct stock: 5 - 1 = 4
						await tx
							.update(inventory_items)
							.set({ stock_actual: stockBeforeToner - 1 })
							.where(eq(inventory_items.id, toHP.id));

						await tx.insert(inventory_movements).values({
							inventory_item_id: toHP.id,
							tipo: 'salida',
							cantidad: 1,
							motivo: 'PM ejecución: instalado — tóner HP 305A',
							usuario_id: tecnico.id,
							referencia_tipo: 'pm_execution',
							referencia_id: tonerExec.id
						});
					});

					log(
						'✅',
						`Toner replacement completed (stock: ${stockBeforeToner} → ${stockBeforeToner - 1})`
					);
				}

				// Complete rodillo cleaning — no parts needed
				const rodilloExec = printerExecs.find(
					(e) =>
						e.tarea_id === printerTasks.find((t) => t.nombre.includes('rodillos'))?.id
				);
				if (rodilloExec) {
					await db
						.update(pm_executions)
						.set({
							fecha_ejecucion: '2026-08-18T10:30:00.000Z',
							resultado: 'completado',
							observaciones:
								'Rodillos limpiados con alcohol isopropílico. Tracción verificada. Impresora opera correctamente.'
						})
						.where(eq(pm_executions.id, rodilloExec.id));
					log('✅', 'Rodillo cleaning completed (no stock impact)');
				}
			}
		}
	}

	// ═══════════════════════════════════════════════════════════════════════
	// PHASE 5: Verification summary
	// ═══════════════════════════════════════════════════════════════════════

	console.log('\n📊 Phase 5: Verification summary...\n');

	const totalItems = await db.select({ cnt: sql<number>`count(*)` }).from(inventory_items);
	const totalMovements = await db.select({ cnt: sql<number>`count(*)` }).from(inventory_movements);
	const totalExecutions = await db
		.select({ cnt: sql<number>`count(*)` })
		.from(pm_executions);
	const totalParts = await db.select({ cnt: sql<number>`count(*)` }).from(pm_execution_parts);

	const lowStockItems = await db
		.select({
			nombre: inventory_items.nombre,
			stock: inventory_items.stock_actual,
			min: inventory_items.stock_minimo
		})
		.from(inventory_items)
		.where(sql`${inventory_items.stock_actual} < ${inventory_items.stock_minimo}`);

	const completedExecs = await db
		.select({ cnt: sql<number>`count(*)` })
		.from(pm_executions)
		.where(sql`${pm_executions.resultado} = 'completado'`);

	const execsWithParts = await db
		.select({ cnt: sql<number>`count(*)` })
		.from(pm_execution_parts);

	console.log('  ┌─────────────────────────────────────────┐');
	console.log('  │       INVENTORY FLOW SUMMARY            │');
	console.log('  ├─────────────────────────────────────────┤');
	console.log(`  │  Items in catalog:     ${String(totalItems[0].cnt).padStart(4)}            │`);
	console.log(`  │  Stock movements:      ${String(totalMovements[0].cnt).padStart(4)}            │`);
	console.log(`  │  PM executions:        ${String(totalExecutions[0].cnt).padStart(4)}            │`);
	console.log(`  │  Parts used (records): ${String(execsWithParts[0].cnt).padStart(4)}            │`);
	console.log(`  │  Completed executions: ${String(completedExecs[0].cnt).padStart(4)}            │`);
	console.log('  └─────────────────────────────────────────┘');

	if (lowStockItems.length > 0) {
		console.log('\n  ⚠️  Low stock items:');
		for (const item of lowStockItems) {
			console.log(`    - ${item.nombre}: ${item.stock}/${item.min}`);
		}
	}

	console.log('\n✅ Inventory flow seed complete!\n');
}

// Allow running directly
const isMain = process.argv[1]?.includes('seed-inventory');
if (isMain) {
	seedInventoryFlow().catch(console.error);
}
