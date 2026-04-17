<script lang="ts">
	import { base } from '$app/paths';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="{base}/manifest.webmanifest" />
	<link rel="apple-touch-icon" href="{base}/icon.svg" />
</svelte:head>
{@render children()}
