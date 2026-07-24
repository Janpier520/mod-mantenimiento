// ─── State machine transitions for PR 2 ───────────────────────────────────────
// This file is a stub. Valid transitions will be implemented in PR 2.
// Format: { from: string[], to: string[] }

export const EQUIPMENT_TRANSITIONS: Record<string, string[]> = {
	operativo: ['en_reparacion', 'prestado', 'dado_de_baja'],
	en_reparacion: ['operativo', 'dado_de_baja'],
	dado_de_baja: [],
	prestado: ['operativo', 'en_reparacion']
} as const;

export const TICKET_TRANSITIONS: Record<string, string[]> = {
	abierto: ['en_proceso', 'cerrado'],
	en_proceso: ['resuelto', 'cerrado'],
	resuelto: ['cerrado'],
	cerrado: ['abierto']
} as const;
