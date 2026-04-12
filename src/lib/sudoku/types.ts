export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_TARGET_GIVENS: Record<Difficulty, number> = {
	easy: 40,
	medium: 32,
	hard: 26
};

export const INDEX = {
	fromRC(row: number, col: number): number {
		return row * 9 + col;
	},
	row(i: number): number {
		return Math.floor(i / 9);
	},
	col(i: number): number {
		return i % 9;
	}
};
