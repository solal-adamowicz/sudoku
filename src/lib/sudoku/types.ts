export type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';

/** Target filled cells after generation (more givens = easier). */
export const DIFFICULTY_TARGET_GIVENS: Record<Difficulty, number> = {
	beginner: 42,
	easy: 38,
	medium: 32,
	hard: 28,
	expert: 24
};

export const DIFFICULTY_ORDER: Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'expert'];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
	beginner: 'Je me réveille',
	easy: 'Moyen',
	medium: 'Difficile',
	hard: 'Ouf!',
	expert: 'Aïe Aïe Aïe'
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
