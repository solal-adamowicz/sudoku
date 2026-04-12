import { INDEX } from './types';

export function isValidPlacement(grid: readonly number[], index: number, digit: number): boolean {
	const r = INDEX.row(index);
	const c = INDEX.col(index);
	const br = Math.floor(r / 3) * 3;
	const bc = Math.floor(c / 3) * 3;

	for (let i = 0; i < 9; i++) {
		const ri = INDEX.fromRC(r, i);
		const ci = INDEX.fromRC(i, c);
		if (ri !== index && grid[ri] === digit) return false;
		if (ci !== index && grid[ci] === digit) return false;
	}
	for (let dr = 0; dr < 3; dr++) {
		for (let dc = 0; dc < 3; dc++) {
			const idx = INDEX.fromRC(br + dr, bc + dc);
			if (idx !== index && grid[idx] === digit) return false;
		}
	}
	return true;
}

/** Mutates `grid` but restores it before returning. */
export function countSolutions(grid: number[], limit = 2): number {
	const empty = grid.indexOf(0);
	if (empty === -1) return 1;

	let count = 0;
	for (let d = 1; d <= 9; d++) {
		if (!isValidPlacement(grid, empty, d)) continue;
		grid[empty] = d;
		count += countSolutions(grid, limit - count);
		grid[empty] = 0;
		if (count >= limit) break;
	}
	return count;
}

function shuffleInPlace<T>(arr: T[]): void {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
}

/** Fills empty cells; mutates `grid`. Returns whether a completion exists. */
export function fillGridRandom(grid: number[]): boolean {
	const empty = grid.indexOf(0);
	if (empty === -1) return true;

	const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
	shuffleInPlace(digits);

	for (const d of digits) {
		if (!isValidPlacement(grid, empty, d)) continue;
		grid[empty] = d;
		if (fillGridRandom(grid)) return true;
		grid[empty] = 0;
	}
	return false;
}

/** Produces a complete valid grid (mutates `grid`, which should be 81 zeros initially). */
export function generateCompleteGrid(): number[] {
	const grid = new Array<number>(81).fill(0);
	fillGridRandom(grid);
	return grid;
}
