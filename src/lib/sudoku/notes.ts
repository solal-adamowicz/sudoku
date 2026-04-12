import { isValidPlacement } from './solver';

/** Bitmask: bit `digit - 1` set means pencil mark for `digit` (1–9). Multiple bits may be set. */
export function hasNote(mask: number, digit: number): boolean {
	return ((mask >> (digit - 1)) & 1) === 1;
}

export function toggleNote(mask: number, digit: number): number {
	return mask ^ (1 << (digit - 1));
}

export function noteCount(mask: number): number {
	let n = 0;
	for (let b = mask; b !== 0; b &= b - 1) n++;
	return n;
}

/**
 * Removes pencil marks that contradict placed digits (same row/column/box already contains that value).
 * Does not run when the player toggles notes — only when values change — so users can keep any combination of marks while reasoning.
 */
export function pruneNotes(values: readonly number[], masks: readonly number[]): number[] {
	const next = masks.slice();
	for (let i = 0; i < 81; i++) {
		if (values[i] !== 0) {
			next[i] = 0;
			continue;
		}
		let m = next[i];
		for (let d = 1; d <= 9; d++) {
			if (!hasNote(m, d)) continue;
			if (!isValidPlacement(values, i, d)) m = toggleNote(m, d);
		}
		next[i] = m;
	}
	return next;
}
