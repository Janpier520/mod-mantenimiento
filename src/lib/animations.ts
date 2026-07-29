import { browser } from '$app/environment';
import gsap from 'gsap';

/**
 * Staggered fade-up entrance for a list of elements.
 */
export function staggerIn(elements: (HTMLElement | null | undefined)[], delay = 0) {
	if (!browser) return;
	gsap.fromTo(
		elements.filter(Boolean),
		{ opacity: 0, y: 12 },
		{ opacity: 1, y: 0, duration: 0.4, stagger: 0.08, delay, ease: 'power2.out' }
	);
}

/**
 * Count-up animation from 0 to a target number.
 */
export function countUp(el: HTMLElement | null, target: number, suffix = '') {
	if (!browser || !el) return;
	const start = { val: 0 };
	gsap.to(start, {
		val: target,
		duration: 1.2,
		ease: 'power2.out',
		onUpdate: () => {
			el.textContent = Math.round(start.val).toString() + suffix;
		}
	});
}
