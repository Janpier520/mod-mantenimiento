import { db } from '$lib/server/db';
import { activity_log } from '$lib/server/db/schema';

export interface LogActivityInput {
	actor_id: string;
	action: string;
	entity_type: string;
	entity_id: string;
	detail?: string;
}

export async function logActivity(input: LogActivityInput): Promise<void> {
	await db.insert(activity_log).values({
		usuario_id: input.actor_id,
		accion: input.action,
		entidad_tipo: input.entity_type,
		entidad_id: input.entity_id,
		metadata: input.detail ? { detail: input.detail } : {}
	});
}
