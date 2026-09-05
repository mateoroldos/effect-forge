<script lang="ts">
	import { listWorkspaces } from '#lib/features/workspaces/workspaces.remote.ts';
</script>

<svelte:head>
	<title>Workspaces · Effect Forge</title>
</svelte:head>

<main class="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
	<div class="flex items-end justify-between gap-6 border-b pb-8">
		<div>
			<p class="font-mono text-xs tracking-[0.14em] text-primary uppercase">Application</p>
			<h1 class="mt-3 font-serif text-5xl tracking-[-0.045em]">Workspaces</h1>
			<p class="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
				The systems you can access through your current membership.
			</p>
		</div>
	</div>

	<svelte:boundary>
		{@const workspaces = await listWorkspaces()}
		{#if workspaces.length === 0}
			<section class="py-20 text-center" aria-labelledby="empty-workspaces-title">
				<p class="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">No workspaces</p>
				<h2 id="empty-workspaces-title" class="mt-4 font-serif text-3xl tracking-[-0.03em]">
					No workspaces yet.
				</h2>
				<p class="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
					When a workspace is created or shared with you, it will appear here.
				</p>
			</section>
		{:else}
			<ul class="grid gap-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
				{#each workspaces as workspace (workspace.id)}
					<li class="rounded-xl border bg-card p-5 shadow-sm">
						<p class="font-mono text-[0.7rem] tracking-[0.1em] text-muted-foreground uppercase">
							Workspace
						</p>
						<h2 class="mt-3 text-lg font-medium tracking-[-0.02em]">{workspace.name}</h2>
						<p class="mt-4 truncate font-mono text-xs text-muted-foreground">{workspace.id}</p>
					</li>
				{/each}
			</ul>
		{/if}

		{#snippet failed()}
			<section class="py-20 text-center" aria-labelledby="workspace-error-title">
				<p class="font-mono text-xs tracking-[0.14em] text-destructive uppercase">Unavailable</p>
				<h2 id="workspace-error-title" class="mt-4 font-serif text-3xl tracking-[-0.03em]">
					We couldn’t load your workspaces.
				</h2>
				<p class="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
					Refresh the page to try again.
				</p>
			</section>
		{/snippet}
	</svelte:boundary>
</main>
