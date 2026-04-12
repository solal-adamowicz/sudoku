import { INDEX } from './types';

/** Marks cells that participate in a row/column/box value clash (filled digits only). */
export function computeConflictCells(values: readonly number[]): boolean[] {
	const conflict = new Array<boolean>(81).fill(false);

	for (let i = 0; i < 81; i++) {
		const v = values[i];
		if (v === 0) continue;
		const r = INDEX.row(i);
		const c = INDEX.col(i);
		const br = Math.floor(r / 3) * 3;
		const bc = Math.floor(c / 3) * 3;

		for (let k = 0; k < 9; k++) {
			const jRow = INDEX.fromRC(r, k);
			if (jRow !== i && values[jRow] === v) {
				conflict[i] = true;
				conflict[jRow] = true;
			}
			const jCol = INDEX.fromRC(k, c);
			if (jCol !== i && values[jCol] === v) {
				conflict[i] = true;
				conflict[jCol] = true;
			}
		}
		for (let dr = 0; dr < 3; dr++) {
			for (let dc = 0; dc < 3; dc++) {
				const j = INDEX.fromRC(br + dr, bc + dc);
				if (j !== i && values[j] === v) {
					conflict[i] = true;
					conflict[j] = true;
				}
			}
		}
	}

	return conflict;
}
