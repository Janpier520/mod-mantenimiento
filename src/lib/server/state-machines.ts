// ─── State machine domain (shared client/server) ─────────────────────────────
// Pure constants and functions live in `$lib/domain/state-machines.ts` so client
// components can import them without leaking server code. This file re-exports
// them for the server layer (services, routes) that already imported from here.
export * from '$lib/domain/state-machines';
