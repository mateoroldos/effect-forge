<script lang="ts">
	import { page } from '$app/state';

	const heading = $derived(
		page.status === 403
			? 'Access denied'
			: page.status === 404
				? 'Page not found'
				: 'Something went wrong'
	);
</script>

<main class="mx-auto grid min-h-screen max-w-5xl place-items-center px-6 py-16">
	<div>
		<h1 class="text-4xl font-semibold tracking-tight">{heading}</h1>
		<p class="mt-3 text-muted-foreground">{page.error?.message ?? 'Please try again.'}</p>
		<div class="mt-6 flex gap-4">
			{#if page.status >= 500}
				<a class="underline underline-offset-4" href={page.url.pathname + page.url.search} data-sveltekit-reload>Refresh page</a>
			{/if}
			<a class="underline underline-offset-4" href="/">Back to your organizations</a>
		</div>
	</div>
</main>
