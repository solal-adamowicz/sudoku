<script lang="ts">
	import { onMount } from 'svelte';
	import { generatePuzzle } from '$lib/sudoku/generator';
	import { computeConflictCells } from '$lib/sudoku/conflicts';
	import { hasNote, toggleNote, pruneNotes } from '$lib/sudoku/notes';
	import type { Difficulty } from '$lib/sudoku/types';

	let difficulty = $state<Difficulty>('medium');
	let givens = $state<boolean[]>(new Array(81).fill(false));
	let values = $state<number[]>(new Array(81).fill(0));
	let notes = $state<number[]>(new Array(81).fill(0));
	let notesMode = $state(false);
	let selected = $state<number | null>(null);
	let ready = $state(false);
	let solvedModalDismissed = $state(false);

	type Snap = { values: number[]; notes: number[] };
	let undoStack = $state<Snap[]>([]);
	const UNDO_MAX = 80;

	const conflicts = $derived(computeConflictCells(values));
	const solved = $derived(
		values.length === 81 && values.every((v) => v > 0) && !conflicts.some(Boolean)
	);

	const digitCounts = $derived.by(() => {
		const c = new Array<number>(10).fill(0);
		for (const v of values) {
			if (v >= 1 && v <= 9) c[v]++;
		}
		return c;
	});

	const showSolvedModal = $derived(solved && !solvedModalDismissed);

	function digitSaturated(d: number): boolean {
		return digitCounts[d] >= 9;
	}

	$effect(() => {
		if (!solved) solvedModalDismissed = false;
	});

	function pushUndo(): void {
		const snap: Snap = { values: values.slice(), notes: notes.slice() };
		const next = [...undoStack, snap];
		if (next.length > UNDO_MAX) next.shift();
		undoStack = next;
	}

	function undo(): void {
		if (undoStack.length === 0) return;
		const snap = undoStack[undoStack.length - 1];
		undoStack = undoStack.slice(0, -1);
		values = snap.values;
		notes = snap.notes;
	}

	function startGame(): void {
		const p = generatePuzzle(difficulty);
		givens = p.givens;
		values = p.values;
		notes = new Array(81).fill(0);
		selected = null;
		undoStack = [];
		solvedModalDismissed = false;
	}

	onMount(() => {
		startGame();
		ready = true;
	});

	function onCellTap(i: number): void {
		selected = i;
	}

	function applyDigit(d: number): void {
		if (selected === null || givens[selected] || digitSaturated(d)) return;
		const i = selected;
		pushUndo();
		if (notesMode) {
			if (values[i] !== 0) {
				undoStack = undoStack.slice(0, -1);
				return;
			}
			const nextNotes = notes.slice();
			nextNotes[i] = toggleNote(nextNotes[i], d);
			notes = nextNotes;
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
		if (selected === null || givens[selected]) return;
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
		const anchorValue =
			selected !== null && values[selected] !== 0 ? values[selected] : null;
		const sameValueElsewhere =
			anchorValue !== null &&
			!isSel &&
			values[index] !== 0 &&
			values[index] === anchorValue;
		const peer =
			selected !== null && !isSel && !sameValueElsewhere && sameUnit(selected, index);
		let bg = 'bg-white';
		if (conflicts[index]) bg = 'bg-rose-100';
		else if (isSel) bg = 'bg-[#b9d4f1]';
		else if (sameValueElsewhere) bg = 'bg-[#cfe8f5]';
		else if (peer) bg = 'bg-[#e8f1fb]';

		const parts = [
			'relative flex min-h-0 min-w-0 items-center justify-center border-[#c5ced9] select-none border-r border-b [border-width:0.5px]',
			col % 3 === 2 ? 'border-r-[2.5px] border-r-[#5a6573]' : '',
			row % 3 === 2 ? 'border-b-[2.5px] border-b-[#5a6573]' : '',
			bg
		];
		return parts.filter(Boolean).join(' ');
	}

	function onWindowKeydown(e: KeyboardEvent): void {
		if (e.key !== 'Escape') return;
		if (solved && !solvedModalDismissed) solvedModalDismissed = true;
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

<div
	class="mx-auto flex min-h-dvh max-w-md flex-col gap-4 bg-[#fafbfc] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] text-[#2c3d4f] {!ready
		? 'pointer-events-none opacity-50'
		: ''}"
	aria-busy={!ready}
>
	<header class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-lg font-semibold tracking-tight text-[#1e3a5f]">Sudoku</h1>
		<div class="inline-flex rounded-full border border-[#d0d7e0] bg-white p-0.5 text-xs" role="group" aria-label="Difficulty">
			{#each ['easy', 'medium', 'hard'] as d (d)}
				<button
					type="button"
					class="rounded-full px-2.5 py-1 capitalize {difficulty === d
						? 'bg-[#e8f1fb] font-semibold text-[#1e3a5f]'
						: 'text-[#6b7788]'}"
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
			class="text-sm font-semibold text-[#2f6fde] underline-offset-2 hover:underline"
			onclick={() => startGame()}
		>
			New game
		</button>
	</header>

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

	<div class="grid grid-cols-3 gap-2 px-1">
		<button
			type="button"
			class="flex flex-col items-center gap-1.5 rounded-lg py-2 text-[#6b7788] active:bg-white/80 disabled:opacity-35"
			disabled={undoStack.length === 0}
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
			disabled={selected === null || givens[selected]}
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

	<div class="flex flex-nowrap items-end justify-between gap-1 px-0.5 pt-1" role="group" aria-label="Enter digit">
		{#each Array.from({ length: 9 }, (_, k) => k + 1) as digit (digit)}
			{@const saturated = digitSaturated(digit)}
			<button
				type="button"
				disabled={saturated}
				class="min-w-0 flex-1 pb-1 text-center text-[clamp(1.35rem,6.5vw,1.85rem)] font-bold leading-none {saturated
					? 'cursor-default text-[#b8c0cc]'
					: 'text-[#2f6fde] active:opacity-70'}"
				aria-label={saturated ? `${digit}, all placed` : `Enter ${digit}`}
				onclick={() => applyDigit(digit)}
			>
				{digit}
			</button>
		{/each}
	</div>

	{#if showSolvedModal}
		<div
			class="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
			role="presentation"
			onclick={(e) => {
				if (e.target === e.currentTarget) solvedModalDismissed = true;
			}}
		>
			<div
				class="w-full max-w-sm rounded-2xl border border-[#d0d7e0] bg-white p-6 shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="solved-title"
				tabindex="-1"
			>
				<h2 id="solved-title" class="text-center text-xl font-semibold text-[#1e3a5f]">Puzzle solved</h2>
				<p class="mt-2 text-center text-sm text-[#6b7788]">Start a new game?</p>
				<div class="mt-6 flex flex-col gap-2">
					<button
						type="button"
						class="w-full rounded-xl bg-[#2f6fde] py-3 text-sm font-semibold text-white active:opacity-90"
						onclick={() => startGame()}
					>
						New game
					</button>
					<button
						type="button"
						class="w-full rounded-xl border border-[#d0d7e0] bg-[#fafbfc] py-3 text-sm font-medium text-[#2c3d4f] active:bg-[#eef1f4]"
						onclick={() => (solvedModalDismissed = true)}
					>
						Not now
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
