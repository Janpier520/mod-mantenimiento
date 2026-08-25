import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	resolve: {
		alias: {
			// Match SvelteKit's alias resolution so server modules and route handlers
			// importable from tests without the SvelteKit plugin.
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
			// Defensive: no module under test imports $app at runtime today, but the
			// spec (TC-1) mandates the alias. Mocked under src/lib/test/mocks/$app.
			$app: fileURLToPath(new URL('./src/lib/test/mocks/$app', import.meta.url))
		}
	},
	test: {
		include: ['src/**/*.test.ts'],
		// Runs in the worker BEFORE any test-file module import, so db/index.ts
		// (which reads DATABASE_URL eagerly) always binds to an in-memory DB.
		setupFiles: ['src/lib/server/db/test-setup.ts'],
		coverage: {
			provider: 'v8',
			include: [
				'src/lib/server/**',
				'src/lib/utils.ts',
				'src/routes/equipos/+page.server.ts',
				'src/routes/usuarios/+page.server.ts',
				'src/routes/tickets/+page.server.ts'
			],
			// Bootstrap/demo code, never imported by tests — would drag the aggregate
			// below the threshold otherwise.
			exclude: [
				'src/lib/server/db/seed.ts',
				'src/lib/server/db/seed-inventory-flow.ts',
				'src/lib/server/db/test-helpers.ts'
			],
			thresholds: {
				statements: 70
			},
			reporter: ['text', 'html']
		}
	}
});
