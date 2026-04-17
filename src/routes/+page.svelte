<script lang="ts">
	import Sudoku from '$lib/components/Sudoku.svelte';
</script>

<svelte:head>
	<title>Sudoku</title>
	<meta name="description" content="Mobile-friendly Sudoku with notes and in-browser puzzles" />
	<meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)" />
	<meta name="theme-color" content="#f8fafc" media="(prefers-color-scheme: light)" />
</svelte:head>

<Sudoku />
