import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { ticket_attachments } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Auth is handled by hooks.server.ts (session cookie → event.locals.user); this
// route sits under /tickets so unauthenticated requests are redirected to /login.
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'No autenticado');

	const attachment = await db.query.ticket_attachments.findFirst({
		where: eq(ticket_attachments.id, params.id)
	});
	if (!attachment) throw error(404, 'Archivo no encontrado');

	let buffer: Buffer;
	try {
		buffer = await readFile(join(process.cwd(), attachment.filepath));
	} catch {
		throw error(404, 'Archivo no encontrado en disco');
	}

	const safeName = attachment.filename.replace(/["\r\n]/g, '');
	return new Response(new Uint8Array(buffer), {
		headers: {
			'Content-Type': attachment.mime_type || 'application/octet-stream',
			'Content-Disposition': `attachment; filename="${safeName}"`
		}
	});
};
