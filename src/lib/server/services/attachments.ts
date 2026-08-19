import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/svg+xml',
	'application/pdf',
	'text/plain',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export const UPLOADS_DIR = join(process.cwd(), 'uploads');

export interface AttachmentFileLike {
	name: string;
	size: number;
	type: string;
}

export type AttachmentValidation = { ok: true } | { ok: false; error: string };

export function sanitizeFileName(name: string): string {
	const clean = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
	return clean || 'file';
}

export function validateAttachmentUpload(file: AttachmentFileLike): AttachmentValidation {
	if (!file.name) return { ok: false, error: 'Selecciona un archivo para subir' };
	if (file.size <= 0) return { ok: false, error: 'El archivo está vacío' };
	if (file.size > MAX_ATTACHMENT_SIZE) {
		return { ok: false, error: 'El archivo supera el tamaño máximo de 5 MB' };
	}
	if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type)) {
		return { ok: false, error: 'Tipo de archivo no permitido' };
	}
	return { ok: true };
}

export async function saveAttachmentFile(file: File): Promise<string> {
	await mkdir(UPLOADS_DIR, { recursive: true });
	const storageName = `${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
	await writeFile(join(UPLOADS_DIR, storageName), Buffer.from(await file.arrayBuffer()));
	return `uploads/${storageName}`;
}

export async function deleteAttachmentFile(relativePath: string): Promise<void> {
	if (!relativePath || !relativePath.startsWith('uploads/')) return;
	try {
		await rm(join(process.cwd(), relativePath), { force: true });
	} catch {
		// best-effort: a missing file should not break the deletion flow
	}
}
