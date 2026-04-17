<script lang="ts">
	import { onMount } from 'svelte';
	import { generatePuzzle } from '$lib/sudoku/generator';
	import { computeConflictCells } from '$lib/sudoku/conflicts';
	import { hasNote, toggleNote, pruneNotes } from '$lib/sudoku/notes';
	import { DIFFICULTY_LABEL, DIFFICULTY_ORDER, type Difficulty } from '$lib/sudoku/types';

	let difficulty = $state<Difficulty>('medium');
	let givens = $state<boolean[]>(new Array(81).fill(false));
	let values = $state<number[]>(new Array(81).fill(0));
	let notes = $state<number[]>(new Array(81).fill(0));
	let notesMode = $state(false);
	let selected = $state<number | null>(null);
	let ready = $state(false);
	let solvedModalDismissed = $state(false);

	let gameStartMs = $state(0);
	let solveTimeMs = $state<number | null>(null);
	let timerTick = $state(0);

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

	const elapsedSeconds = $derived.by(() => {
		timerTick;
		const end = solveTimeMs ?? Date.now();
		return Math.max(0, Math.floor((end - gameStartMs) / 1000));
	});

	function digitSaturated(d: number): boolean {
		return digitCounts[d] >= 9;
	}

	$effect(() => {
		if (!solved) solvedModalDismissed = false;
	});

	$effect(() => {
		if (solved && solveTimeMs === null) solveTimeMs = Date.now();
	});

	function formatElapsed(totalSec: number): string {
		const h = Math.floor(totalSec / 3600);
		const m = Math.floor((totalSec % 3600) / 60);
		const s = totalSec % 60;
		if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

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
		gameStartMs = Date.now();
		solveTimeMs = null;
	}

	function applyTheme(mode: 'light' | 'dark'): void {
		if (typeof document === 'undefined') return;
		document.documentElement.classList.toggle('dark', mode === 'dark');
		try {
			localStorage.setItem('theme', mode);
		} catch {
			/* ignore */
		}
	}

	function toggleTheme(): void {
		const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
		applyTheme(next);
	}

	onMount(() => {
		startGame();
		ready = true;
		const id = setInterval(() => {
			timerTick++;
		}, 1000);
		return () => clearInterval(id);
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
		let bg = 'bg-white dark:bg-stone-900';
		if (conflicts[index]) bg = 'bg-rose-100 dark:bg-rose-950/65';
		else if (isSel) bg = 'bg-rose-100 dark:bg-rose-900/50';
		else if (sameValueElsewhere) bg = 'bg-rose-50 dark:bg-rose-950/40';
		else if (peer) bg = 'bg-rose-50/95 dark:bg-stone-800/85';

		const parts = [
			'relative flex min-h-0 min-w-0 items-center justify-center border-stone-300 dark:border-stone-600 select-none border-r border-b [border-width:0.5px]',
			col % 3 === 2 ? 'border-r-[2.5px] border-r-stone-600 dark:border-r-stone-400' : '',
			row % 3 === 2 ? 'border-b-[2.5px] border-b-stone-600 dark:border-b-stone-400' : '',
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
	class="mx-auto flex min-h-dvh max-w-md flex-col gap-4 bg-[#faf8f6] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] text-stone-800 dark:bg-stone-950 dark:text-stone-100 {!ready
		? 'pointer-events-none opacity-50'
		: ''}"
	aria-busy={!ready}
>
	<header class="flex items-center justify-between gap-2">
		<div class="flex min-w-0 items-center gap-1">
			<h1 class="truncate text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-50">RosaGrid :)</h1>
			<button
				type="button"
				class="shrink-0 rounded-lg p-1.5 text-stone-500 transition hover:bg-rose-100/80 hover:text-rose-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-rose-300"
				onclick={() => toggleTheme()}
				aria-label="Basculer le thème clair ou sombre"
				title="Clair/sombre"
			>
				<span class="hidden dark:inline" aria-hidden="true">
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
						/>
					</svg>
				</span>
				<span class="inline dark:hidden" aria-hidden="true">
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
						/>
					</svg>
				</span>
			</button>
		</div>

		<div class="relative shrink-0">
			<select
				id="difficulty-select"
				aria-label="Difficulté"
				class="cursor-pointer appearance-none rounded-md bg-transparent py-1 pl-1 pr-5 text-xs font-medium text-stone-500 outline-none hover:text-stone-700 focus-visible:ring-2 focus-visible:ring-rose-400/40 dark:text-stone-400 dark:hover:text-stone-200 dark:focus-visible:ring-rose-500/30"
				bind:value={difficulty}
				onchange={() => startGame()}
			>
				{#each DIFFICULTY_ORDER as d (d)}
					<option value={d}>{DIFFICULTY_LABEL[d]}</option>
				{/each}
			</select>
			<span
				class="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500"
				aria-hidden="true"
			>
				<svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
					<path stroke-linecap="round" stroke-linejoin="round" d="m19 9-7 7-7-7" />
				</svg>
			</span>
		</div>

		<button
			type="button"
			class="shrink-0 text-sm font-semibold text-rose-600 underline-offset-2 hover:underline dark:text-rose-400"
			onclick={() => startGame()}
		>
			Nouvelle partie
		</button>
	</header>

	<p
		class="text-center text-sm font-medium tabular-nums tracking-wide text-stone-500 dark:text-stone-400"
		aria-live="polite"
		aria-label={`En seulement ${formatElapsed(elapsedSeconds)} !`}
	>
		{formatElapsed(elapsedSeconds)}
	</p>

	<div class="mx-auto w-full max-w-[min(100%,400px)]">
		<div
			class="aspect-square w-full overflow-hidden rounded-md border-2 border-stone-600 bg-white shadow-sm dark:border-stone-500 dark:bg-stone-900"
		>
			<div class="grid h-full w-full grid-cols-9 grid-rows-9">
				{#each values as _, index (index)}
					<button type="button" class={cellClass(index)} onclick={() => onCellTap(index)}>
						{#if values[index] !== 0}
							<span
								class="text-[clamp(1.05rem,5.8vw,1.45rem)] font-semibold tabular-nums {givens[index]
									? 'text-stone-800 dark:text-stone-100'
									: 'text-rose-600 dark:text-rose-400'}"
							>
								{values[index]}
							</span>
						{:else}
							<span class="grid h-[82%] w-[82%] grid-cols-3 grid-rows-3 gap-px p-0.5">
								{#each Array.from({ length: 9 }, (_, k) => k + 1) as digit (digit)}
									<span
										class="flex items-center justify-center text-[clamp(7px,2.3vw,9px)] font-semibold leading-none text-stone-500 dark:text-stone-400 {hasNote(
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
			class="flex items-center justify-center rounded-lg py-3 text-stone-500 active:bg-rose-100/60 disabled:opacity-35 dark:text-stone-400 dark:active:bg-stone-800/80"
			aria-label="Annuler"
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
		</button>
		<button
			type="button"
			class="flex items-center justify-center rounded-lg py-3 text-stone-500 active:bg-rose-100/60 disabled:opacity-35 dark:text-stone-400 dark:active:bg-stone-800/80"
			aria-label="Effacer"
			disabled={selected === null || givens[selected]}
			onclick={() => eraseSelection()}
		>
			<svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"
				/>
				<path stroke-linecap="round" stroke-linejoin="round" d="M22 21H7" />
			</svg>
		</button>
		<button
			type="button"
			class="flex items-center justify-center rounded-lg py-3 text-stone-500 active:bg-rose-100/60 dark:text-stone-400 dark:active:bg-stone-800/80"
			aria-pressed={notesMode}
			aria-label={notesMode ? 'Mode notes activé' : 'Mode notes désactivé'}
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
					class="absolute -right-1 -top-1 rounded-full bg-stone-400 px-1 py-px text-[0.55rem] font-bold leading-none text-white {notesMode
						? 'bg-rose-600 dark:bg-rose-500'
						: ''}"
					aria-hidden="true"
				>
					{notesMode ? '✓' : '·'}
				</span>
			</div>
		</button>
	</div>

	<div class="flex flex-nowrap items-end justify-between gap-1 px-0.5 pt-1" role="group" aria-label="Saisir un chiffre">
		{#each Array.from({ length: 9 }, (_, k) => k + 1) as digit (digit)}
			{@const saturated = digitSaturated(digit)}
			<button
				type="button"
				disabled={saturated}
				class="min-w-0 flex-1 pb-1 text-center text-[clamp(1.35rem,6.5vw,1.85rem)] font-bold leading-none {saturated
					? 'cursor-default text-stone-300 dark:text-stone-600'
					: 'text-rose-600 active:opacity-70 dark:text-rose-400'}"
				aria-label={saturated ? `${digit}, tous placés` : `Saisir ${digit}`}
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
				class="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-700 dark:bg-stone-900"
				role="dialog"
				aria-modal="true"
				aria-labelledby="solved-title"
				tabindex="-1"
			>
				<h2 id="solved-title" class="text-center text-xl font-semibold text-stone-900 dark:text-stone-50">
					C'est gagné !
				</h2>
				<p class="mt-1 text-center text-sm font-medium tabular-nums text-rose-600 dark:text-rose-400">
					{formatElapsed(elapsedSeconds)}
				</p>
				<p class="mt-2 text-center text-sm text-stone-500 dark:text-stone-400">Nouvelle partie ?</p>
				<div class="mt-6 flex flex-col gap-2">
					<button
						type="button"
						class="w-full rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white active:opacity-90 dark:bg-rose-500"
						onclick={() => startGame()}
					>
						Nouvelle partie
					</button>
					<button
						type="button"
						class="w-full rounded-xl border border-stone-200 bg-[#faf8f6] py-3 text-sm font-medium text-stone-800 active:bg-rose-100/80 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:active:bg-stone-700"
						onclick={() => (solvedModalDismissed = true)}
					>
						Plus tard
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
