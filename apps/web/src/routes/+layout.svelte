<script lang="ts">
	import { SEARCH_INDEXABLE } from '$app/env/public';
	import { Toaster } from '@effect-forge/ui/ui/sonner';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Effect Forge</title>
	<meta
		name="description"
		content="Effect Forge turns typed Effect applications into production systems."
	/>
	{#if !SEARCH_INDEXABLE}
		<meta name="robots" content="noindex, nofollow" />
	{/if}
</svelte:head>

{@render children()}

<Toaster />
