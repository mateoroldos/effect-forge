<script lang="ts">
	import { error } from '@sveltejs/kit';
	import { listOrganizations } from '#lib/features/organizations/organizations.remote.ts';
	import TodoList from '#lib/features/todos/TodoList.svelte';

	let { params } = $props();
	const organizations = $derived(await listOrganizations());
	const organization = $derived(organizations.find((organization) => organization.slug === params.organizationSlug) ?? error(404, 'Organization not found.'));
</script>

<svelte:head><title>Todos · Effect Forge</title></svelte:head>

<main class="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
	<a href="/organizations" class="text-sm text-muted-foreground underline underline-offset-4">Switch organization</a>
	<header class="mt-8 border-b pb-8">
		<p class="break-words font-mono text-xs tracking-[0.14em] text-primary uppercase">{organization.name}</p>
		<h1 class="mt-3 font-serif text-5xl tracking-[-0.045em]">Todos</h1>
		<p class="mt-3 text-sm leading-6 text-muted-foreground">A shared list for everyone in this organization.</p>
	</header>

	{#key organization.id}
		<svelte:boundary pending={loadingTodos}>
			<TodoList organizationId={organization.id} />
		</svelte:boundary>
	{/key}
</main>

{#snippet loadingTodos()}
	<div class="mt-8" role="status">
		<span class="sr-only">Loading todos…</span>
		<div aria-hidden="true">
			<div class="h-10 rounded-md bg-muted"></div>
			<div class="mt-8 divide-y rounded-xl border bg-card">
				{#each [1, 2, 3] as row (row)}
					<div class="flex items-center gap-3 px-4 py-5">
						<div class="size-5 rounded bg-muted"></div>
						<div class="h-4 w-2/3 rounded bg-muted"></div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/snippet}
