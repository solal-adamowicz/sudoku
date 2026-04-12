import { isValidPlacement } from './solver';

export function hasNote(mask: number, digit: number): boolean {
	return ((mask >> (digit - 1)) & 1) === 1;
}

export function toggleNote(mask: number, digit: number): number {
	return mask ^ (1 << (digit - 1));
}

/** Drop pencil marks incompatible with current filled cells. */
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
