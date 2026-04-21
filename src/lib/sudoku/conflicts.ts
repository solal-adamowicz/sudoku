import { INDEX } from './types';

function markDuplicatesInUnit(values: readonly number[], indices: readonly number[], conflict: boolean[]): void {
	const byValue = new Map<number, number[]>();
	for (const i of indices) {
		const v = values[i];
		if (v === 0) continue;
		let list = byValue.get(v);
		if (!list) {
			list = [];
			byValue.set(v, list);
		}
		list.push(i);
	}
	for (const list of byValue.values()) {
		if (list.length <= 1) continue;
		for (const i of list) conflict[i] = true;
	}
}

/** Marks cells that participate in a row/column/box value clash (filled digits only). */
export function computeConflictCells(values: readonly number[]): boolean[] {
	const conflict = new Array<boolean>(81).fill(false);

	for (let r = 0; r < 9; r++) {
		markDuplicatesInUnit(
			values,
			Array.from({ length: 9 }, (_, c) => INDEX.fromRC(r, c)),
			conflict
		);
	}
	for (let c = 0; c < 9; c++) {
		markDuplicatesInUnit(
			values,
			Array.from({ length: 9 }, (_, r) => INDEX.fromRC(r, c)),
			conflict
		);
	}
	for (let br = 0; br < 3; br++) {
		for (let bc = 0; bc < 3; bc++) {
			const idx: number[] = [];
			for (let dr = 0; dr < 3; dr++) {
				for (let dc = 0; dc < 3; dc++) {
					idx.push(INDEX.fromRC(br * 3 + dr, bc * 3 + dc));
				}
			}
			markDuplicatesInUnit(values, idx, conflict);
		}
	}

	return conflict;
}
