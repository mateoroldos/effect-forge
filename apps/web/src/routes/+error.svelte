<script lang="ts">
	import { page } from '$app/state';
</script>

<main class="mx-auto grid min-h-screen max-w-5xl place-items-center px-6 py-16">
	<div>
		<h1 class="text-4xl font-semibold tracking-tight">
			{page.status === 404 ? 'Page not found' : 'Something went wrong'}
		</h1>
		<p class="mt-3 text-muted-foreground">{page.error?.message ?? 'Please try again.'}</p>
		<a class="mt-6 inline-block underline underline-offset-4" href="/">Back home</a>
	</div>
</main>
