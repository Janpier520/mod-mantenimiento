/// <reference types="chart.js" />
/// <reference types="sortablejs" />

declare global {
	namespace App {
		interface Locals {
			user: {
				id: string;
				username: string;
				nombre: string;
				apellido: string;
				email: string;
				rol: 'admin' | 'tecnico' | 'consultor';
			} | null;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
