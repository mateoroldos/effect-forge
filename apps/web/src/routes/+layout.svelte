<script lang="ts">
	import { Toaster } from '@effect-forge/ui/svelte/sonner';
	import { searchIndexable } from '#lib/environment.ts';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Effect Forge</title>
	<meta
		name="description"
		content="Effect Forge turns typed Effect applications into production systems."
	/>
	{#if !searchIndexable}
		<meta name="robots" content="noindex, nofollow" />
	{/if}
</svelte:head>

{@render children()}

<Toaster />
