import { DIFFICULTY_TARGET_GIVENS, type Difficulty } from './types';
import { countSolutions, generateCompleteGrid } from './solver';

function shuffleIndices(): number[] {
	const idx = Array.from({ length: 81 }, (_, i) => i);
	for (let i = idx.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[idx[i], idx[j]] = [idx[j], idx[i]];
	}
	return idx;
}

function countGivens(puzzle: number[]): number {
	let n = 0;
	for (const v of puzzle) if (v !== 0) n++;
	return n;
}

/**
 * Unique-solution puzzle: dig holes from a complete grid, then add clues back for easier modes.
 */
export function generatePuzzle(difficulty: Difficulty): { solution: number[]; givens: boolean[]; values: number[] } {
	const solution = generateCompleteGrid();
	const puzzle = solution.slice();
	const order = shuffleIndices();

	for (const i of order) {
		const saved = puzzle[i];
		puzzle[i] = 0;
		const ways = countSolutions(puzzle.slice(), 2);
		if (ways !== 1) puzzle[i] = saved;
	}

	const target = DIFFICULTY_TARGET_GIVENS[difficulty];
	while (countGivens(puzzle) < target) {
		const empties = puzzle
			.map((v, i) => (v === 0 ? i : -1))
			.filter((i) => i >= 0);
		if (empties.length === 0) break;
		const pick = empties[Math.floor(Math.random() * empties.length)];
		puzzle[pick] = solution[pick];
	}

	const givens = puzzle.map((v) => v !== 0);
	return { solution, givens, values: puzzle.slice() };
}
