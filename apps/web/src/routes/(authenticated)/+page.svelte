<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '@effect-forge/ui/ui/button';
	import { Spinner } from '@effect-forge/ui/ui/spinner';
	import { Input } from '@effect-forge/ui/ui/input';
	import * as Field from '@effect-forge/ui/ui/field';
	import { authClient } from '#lib/features/auth/client.ts';
	import { listOrganizations } from '#lib/features/organizations/organizations.remote.ts';

	let name = $state('');
	let slug = $state('');
	let creating = $state(false);
	let message = $state<string | null>(null);

	const create = async (event: SubmitEvent) => {
		event.preventDefault();
		if (creating) return;
		creating = true;
		message = null;
		try {
			const result = await authClient.organization.create({ name: name.trim(), slug: slug.trim() });
			if (result.error !== null) {
				message = result.error.code === 'ORGANIZATION_ALREADY_EXISTS'
					? 'That organization address is already taken. Choose another.'
					: 'We couldn’t create your organization. Please try again.';
				return;
			}
			try {
				await goto(`/org/${encodeURIComponent(result.data.slug)}/todos`, { refreshAll: true });
			} catch (failure) {
				// oxlint-disable-next-line effecttsgo/global-console -- This navigation failure is recovered locally.
				console.error(failure);
				message = 'Your organization was created, but we couldn’t open it. Refresh this page and open it from the list.';
			}
		} catch (failure) {
			// oxlint-disable-next-line effecttsgo/global-console -- Locally recovered failures do not reach Kit's error hook.
			console.error(failure);
			message = 'We couldn’t confirm whether your organization was created. Refresh the list before trying again.';
		} finally {
			creating = false;
		}
	};

</script>

<svelte:head><title>Organizations · Effect Forge</title></svelte:head>

<main class="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
	<header class="border-b pb-8">
		<p class="font-mono text-xs tracking-[0.14em] text-primary uppercase">Work together</p>
		<h1 class="mt-3 font-serif text-5xl tracking-[-0.045em]">Organizations</h1>
		<p class="mt-3 text-sm leading-6 text-muted-foreground">Choose a shared space, or create one for your team.</p>
	</header>
	<div class="grid gap-12 pt-10 lg:grid-cols-[1fr_22rem]">
		<section aria-label="Your organizations">
			<svelte:boundary pending={loadingOrganizations}>
				{@const organizations = await listOrganizations()}
				{#if organizations.length === 0}
					<h2 class="font-serif text-3xl">No organizations yet.</h2>
					<p class="mt-3 text-sm text-muted-foreground">Create your first organization to start a shared todo list.</p>
				{:else}
					<ul class="grid gap-4 sm:grid-cols-2">
						{#each organizations as organization (organization.id)}
							<li class="rounded-xl border bg-card p-5 shadow-sm">
								<h2 class="break-words text-lg font-medium">{organization.name}</h2>
								<p class="mt-1 break-all text-sm text-muted-foreground">{organization.slug}</p>
								<Button class="mt-5" variant="outline" href={`/org/${encodeURIComponent(organization.slug)}/todos`} aria-label={`Open ${organization.name}`}>
									Open todos
								</Button>
							</li>
						{/each}
					</ul>
				{/if}
			</svelte:boundary>
		</section>
		<section class="self-start rounded-xl border bg-card p-6" aria-labelledby="create-organization-title">
			<h2 id="create-organization-title" class="text-lg font-medium">Create an organization</h2>
			<form class="mt-5 space-y-5" onsubmit={create}>
				<Field.Group>
					<Field.Field>
						<Field.Label for="organization-name">Organization name</Field.Label>
						<Input id="organization-name" bind:value={name} autocomplete="organization" required maxlength={100} />
					</Field.Field>
					<Field.Field>
						<Field.Label for="organization-slug">Organization handle</Field.Label>
						<Input id="organization-slug" bind:value={slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength={48} aria-describedby="slug-hint" />
						<Field.Description id="slug-hint">Used in your organization’s URL. Use up to 48 lowercase letters, numbers, and hyphens.</Field.Description>
					</Field.Field>
				</Field.Group>
				{#if message !== null}<Field.Error>{message}</Field.Error>{/if}
				<Button type="submit" class="w-full" disabled={creating}>
					{#if creating}<Spinner data-icon="inline-start" />{/if}
					{creating ? 'Creating…' : 'Create organization'}
				</Button>
			</form>
		</section>
	</div>
</main>

{#snippet loadingOrganizations()}
	<div role="status">
		<span class="sr-only">Loading organizations…</span>
		<div class="grid gap-4 sm:grid-cols-2" aria-hidden="true">
			{#each [1, 2] as card (card)}
				<div class="rounded-xl border bg-card p-5 shadow-sm">
					<div class="h-7 w-2/3 rounded bg-muted"></div>
					<div class="mt-1 h-5 w-1/2 rounded bg-muted"></div>
					<div class="mt-5 h-9 w-28 rounded-md bg-muted"></div>
				</div>
			{/each}
		</div>
	</div>
{/snippet}
