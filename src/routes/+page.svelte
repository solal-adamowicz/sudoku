<script lang="ts">
	import Sudoku from '$lib/components/Sudoku.svelte';
</script>

<svelte:head>
	<title>RosaGrid</title>
	<meta
		name="description"
		content="RosaGrid — Le Sudoku pour Rosalie :)"
	/>
	<meta name="theme-color" content="#0c0a09" media="(prefers-color-scheme: dark)" />
	<meta name="theme-color" content="#faf8f6" media="(prefers-color-scheme: light)" />
</svelte:head>

<Sudoku />
