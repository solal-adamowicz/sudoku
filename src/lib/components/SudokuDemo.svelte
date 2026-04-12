<script lang="ts">
	import { onMount } from 'svelte';
	import { generatePuzzle } from '$lib/sudoku/generator';
	import { computeConflictCells } from '$lib/sudoku/conflicts';
	import { hasNote, toggleNote, pruneNotes } from '$lib/sudoku/notes';
	import type { Difficulty } from '$lib/sudoku/types';

	const MONTH_KEY = 'sudoku-month-score';

	let difficulty = $state<Difficulty>('medium');
	let gameId = $state(0);
	let givens = $state<boolean[]>(new Array(81).fill(false));
	let values = $state<number[]>(new Array(81).fill(0));
	let notes = $state<number[]>(new Array(81).fill(0));
	let notesMode = $state(false);
	let selected = $state<number | null>(null);
	let ready = $state(false);

	let seconds = $state(0);
	let paused = $state(false);
	let monthPoints = $state(0);
	let pointsAwardedForGame = $state<number | null>(null);

	type Snap = { values: number[]; notes: number[] };
	let undoStack = $state<Snap[]>([]);
	const UNDO_MAX = 80;

	const conflicts = $derived(computeConflictCells(values));
	const solved = $derived(
		values.length === 81 && values.every((v) => v > 0) && !conflicts.some(Boolean)
	);
	const timerRunning = $derived(ready && !paused && !solved);

	const dateLabel = $derived.by(() => {
		const d = new Date();
		return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }).toUpperCase();
	});

	const timeLabel = $derived(
		`${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
	);

	function currentYearMonth(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
	}

	function loadMonthPoints(): number {
		if (typeof localStorage === 'undefined') return 0;
		const ym = currentYearMonth();
		try {
			const raw = localStorage.getItem(MONTH_KEY);
			if (!raw) return 0;
			const o = JSON.parse(raw) as { ym?: string; points?: number };
			if (o.ym !== ym) return 0;
			return o.points ?? 0;
		} catch {
			return 0;
		}
	}

	function saveMonthPoints(points: number): void {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(MONTH_KEY, JSON.stringify({ ym: currentYearMonth(), points }));
		monthPoints = points;
	}

	function addMonthPoints(delta: number): void {
		const next = Math.max(0, monthPoints + delta);
		saveMonthPoints(next);
	}

	function pushUndo(): void {
		const snap: Snap = { values: values.slice(), notes: notes.slice() };
		const next = [...undoStack, snap];
		if (next.length > UNDO_MAX) next.shift();
		undoStack = next;
	}

	function undo(): void {
		if (undoStack.length === 0 || paused) return;
		const snap = undoStack[undoStack.length - 1];
		undoStack = undoStack.slice(0, -1);
		values = snap.values;
		notes = snap.notes;
	}

	function startGame(): void {
		gameId += 1;
		const p = generatePuzzle(difficulty);
		givens = p.givens;
		values = p.values;
		notes = new Array(81).fill(0);
		selected = null;
		undoStack = [];
		seconds = 0;
		paused = false;
		pointsAwardedForGame = null;
	}

	onMount(() => {
		monthPoints = loadMonthPoints();
		startGame();
		ready = true;
	});

	$effect(() => {
		if (!timerRunning) return;
		const id = setInterval(() => {
			seconds += 1;
		}, 1000);
		return () => clearInterval(id);
	});

	$effect(() => {
		if (solved && ready && pointsAwardedForGame !== gameId) {
			pointsAwardedForGame = gameId;
			const bonus = Math.max(500, 8000 - seconds * 3);
			addMonthPoints(bonus);
		}
	});

	function onCellTap(i: number): void {
		if (paused) return;
		selected = i;
	}

	function applyDigit(d: number): void {
		if (paused || selected === null || givens[selected]) return;
		const i = selected;
		pushUndo();
		if (notesMode) {
			if (values[i] !== 0) {
				undoStack = undoStack.slice(0, -1);
				return;
			}
			const nextNotes = notes.slice();
			nextNotes[i] = toggleNote(nextNotes[i], d);
			notes = pruneNotes(values, nextNotes);
			return;
		}
		const v = values.slice();
		const n = notes.slice();
		v[i] = d;
		n[i] = 0;
		values = v;
		notes = pruneNotes(values, n);
	}

	function eraseSelection(): void {
		if (paused || selected === null || givens[selected]) return;
		const i = selected;
		pushUndo();
		if (notesMode) {
			const nextNotes = notes.slice();
			nextNotes[i] = 0;
			notes = nextNotes;
			return;
		}
		if (values[i] === 0 && notes[i] === 0) {
			undoStack = undoStack.slice(0, -1);
			return;
		}
		const v = values.slice();
		v[i] = 0;
		values = v;
		notes = pruneNotes(values, notes);
	}

	function sameUnit(a: number, b: number): boolean {
		if (a === b) return false;
		const ra = Math.floor(a / 9);
		const ca = a % 9;
		const rb = Math.floor(b / 9);
		const cb = b % 9;
		if (ra === rb || ca === cb) return true;
		const boxA = Math.floor(ra / 3) * 3 + Math.floor(ca / 3);
		const boxB = Math.floor(rb / 3) * 3 + Math.floor(cb / 3);
		return boxA === boxB;
	}

	function cellClass(index: number): string {
		const row = Math.floor(index / 9);
		const col = index % 9;
		const isSel = selected === index;
		const peer = selected !== null && !isSel && sameUnit(selected, index);
		let bg = 'bg-white';
		if (conflicts[index]) bg = 'bg-rose-100';
		else if (isSel) bg = 'bg-[#b9d4f1]';
		else if (peer) bg = 'bg-[#e8f1fb]';

		const parts = [
			'relative flex min-h-0 min-w-0 items-center justify-center border-[#c5ced9] select-none border-r border-b [border-width:0.5px]',
			col % 3 === 2 ? 'border-r-[2.5px] border-r-[#5a6573]' : '',
			row % 3 === 2 ? 'border-b-[2.5px] border-b-[#5a6573]' : '',
			bg
		];
		return parts.filter(Boolean).join(' ');
	}

	function formatPoints(n: number): string {
		return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
	}
</script>

<div
	class="mx-auto flex min-h-dvh max-w-md flex-col gap-5 bg-[#fafbfc] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] text-[#2c3d4f] {!ready
		? 'pointer-events-none opacity-50'
		: ''}"
	aria-busy={!ready}
>
	<!-- Top bar -->
	<header class="grid grid-cols-3 items-start gap-2 text-[0.7rem] font-medium leading-tight text-[#6b7788]">
		<div class="flex flex-col gap-0.5">
			<span>Date</span>
			<span class="text-[0.95rem] font-semibold tracking-wide text-[#1e3a5f]">{dateLabel}</span>
		</div>
		<div class="flex flex-col items-center gap-0.5 text-center">
			<div class="flex items-center justify-center gap-1">
				<svg class="h-4 w-4 text-[#c9a227]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 9H4.5A2.5 2.5 0 0 1 4 4.5M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M6 9v4a6 6 0 0 0 12 0V9M10 22V9m4 0v13" />
				</svg>
				<span>This month</span>
			</div>
			<span class="text-[0.95rem] font-semibold tabular-nums text-[#1e3a5f]"
				>{formatPoints(monthPoints)}</span
			>
		</div>
		<div class="flex flex-col items-end gap-1.5">
			<div class="flex flex-col items-end gap-0.5">
				<span>Time</span>
				<span class="text-[0.95rem] font-semibold tabular-nums text-[#1e3a5f]">{timeLabel}</span>
			</div>
			<button
				type="button"
				class="flex h-9 w-9 items-center justify-center rounded-full border border-[#d0d7e0] bg-white shadow-sm active:scale-95"
				aria-label={paused ? 'Resume' : 'Pause'}
				onclick={() => (paused = !paused)}
			>
				{#if paused}
					<svg class="h-4 w-4 text-[#1e3a5f]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path d="M8 5v14l11-7z" />
					</svg>
				{:else}
					<svg class="h-4 w-4 text-[#1e3a5f]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
					</svg>
				{/if}
			</button>
		</div>
	</header>

	{#if solved}
		<p
			class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-900"
			role="status"
		>
			Solved — nice work.
		</p>
	{/if}

	<!-- Grid -->
	<div class="mx-auto w-full max-w-[min(100%,400px)]">
		<div class="aspect-square w-full overflow-hidden rounded-md border-2 border-[#5a6573] bg-white shadow-sm">
			<div class="grid h-full w-full grid-cols-9 grid-rows-9">
				{#each values as _, index (index)}
					<button type="button" class={cellClass(index)} onclick={() => onCellTap(index)}>
						{#if values[index] !== 0}
							<span
								class="text-[clamp(1.05rem,5.8vw,1.45rem)] font-semibold tabular-nums {givens[index]
									? 'text-[#1e3a5f]'
									: 'text-[#2f6fde]'}"
							>
								{values[index]}
							</span>
						{:else}
							<span class="grid h-[82%] w-[82%] grid-cols-3 grid-rows-3 gap-px p-0.5">
								{#each Array.from({ length: 9 }, (_, k) => k + 1) as digit (digit)}
									<span
										class="flex items-center justify-center text-[clamp(7px,2.3vw,9px)] font-semibold leading-none text-[#5a6b82] {hasNote(
											notes[index],
											digit
										)
											? 'opacity-100'
											: 'opacity-0'}"
									>
										{digit}
									</span>
								{/each}
							</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Icon toolbar -->
	<div class="grid grid-cols-3 gap-2 px-1">
		<button
			type="button"
			class="flex flex-col items-center gap-1.5 rounded-lg py-2 text-[#6b7788] active:bg-white/80 disabled:opacity-35"
			disabled={undoStack.length === 0 || paused}
			onclick={() => undo()}
		>
			<svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
				/>
			</svg>
			<span class="text-[0.68rem] font-medium">Undo</span>
		</button>
		<button
			type="button"
			class="flex flex-col items-center gap-1.5 rounded-lg py-2 text-[#6b7788] active:bg-white/80 disabled:opacity-35"
			disabled={paused || selected === null || givens[selected]}
			onclick={() => eraseSelection()}
		>
			<svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"
				/>
				<path stroke-linecap="round" stroke-linejoin="round" d="m19.5 7.125-3 3M6 18l3-3" />
			</svg>
			<span class="text-[0.68rem] font-medium">Erase</span>
		</button>
		<button
			type="button"
			class="flex flex-col items-center gap-1.5 rounded-lg py-2 text-[#6b7788] active:bg-white/80"
			aria-pressed={notesMode}
			aria-label={notesMode ? 'Notes on' : 'Notes off'}
			onclick={() => (notesMode = !notesMode)}
		>
			<div class="relative flex h-7 w-7 items-center justify-center">
				<svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M15.5 3.5l-9 9-2 6.5 6.5-2 9-9-4.5-4.5z"
					/>
				</svg>
				<span
					class="absolute -right-1 -top-1 rounded-full bg-[#8b95a5] px-1 py-px text-[0.55rem] font-bold leading-none text-white {notesMode
						? 'bg-[#2f6fde]'
						: ''}"
				>
					{notesMode ? 'ON' : 'OFF'}
				</span>
			</div>
			<span class="text-[0.68rem] font-medium">Notes</span>
		</button>
	</div>

	<!-- Number row -->
	<div class="flex flex-nowrap items-end justify-between gap-1 px-0.5 pt-1">
		{#each Array.from({ length: 9 }, (_, k) => k + 1) as digit (digit)}
			<button
				type="button"
				class="min-w-0 flex-1 pb-1 text-center text-[clamp(1.35rem,6.5vw,1.85rem)] font-bold leading-none text-[#2f6fde] active:opacity-70 disabled:opacity-30"
				disabled={paused}
				onclick={() => applyDigit(digit)}
			>
				{digit}
			</button>
		{/each}
	</div>

	<!-- Compact settings -->
	<div class="mt-auto flex flex-wrap items-center justify-center gap-3 border-t border-[#e8ecf1] pt-4 text-xs text-[#6b7788]">
		<div class="inline-flex rounded-full border border-[#d0d7e0] bg-white p-0.5" role="group" aria-label="Difficulty">
			{#each ['easy', 'medium', 'hard'] as d (d)}
				<button
					type="button"
					class="rounded-full px-2.5 py-1 capitalize {difficulty === d
						? 'bg-[#e8f1fb] font-semibold text-[#1e3a5f]'
						: ''}"
					onclick={() => {
						difficulty = d as Difficulty;
						startGame();
					}}
				>
					{d}
				</button>
			{/each}
		</div>
		<button
			type="button"
			class="font-semibold text-[#2f6fde] underline-offset-2 hover:underline"
			onclick={() => startGame()}
		>
			New game
		</button>
	</div>
</div>
