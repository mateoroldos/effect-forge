<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '#lib/features/auth/client.ts';

	let { data, children } = $props();
	let signingOut = $state(false);
	let signOutFailed = $state(false);

	const signOut = async () => {
		if (signingOut) return;
		signingOut = true;
		signOutFailed = false;
		try {
			const result = await authClient.signOut();
			if (result.error !== null) {
				signOutFailed = true;
				return;
			}
		} catch (failure) {
			// oxlint-disable-next-line effecttsgo/global-console -- Locally recovered failures do not reach Kit's error hook.
			console.error(failure);
			signOutFailed = true;
			return;
		} finally {
			signingOut = false;
		}

		await goto('/sign-in', { refreshAll: true });
	};
</script>

	<div class="min-h-screen bg-background">
		<header class="border-b bg-card/80">
			<div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                <a href="/organizations" class="font-mono text-xs font-medium tracking-[0.14em] uppercase">
					Effect Forge
				</a>
				<div class="flex items-center gap-4">
					<div class="hidden text-right sm:block">
						<p class="text-sm font-medium">{data.viewer.name}</p>
						<p class="text-xs text-muted-foreground">{data.viewer.email}</p>
					</div>
					<button
						class="inline-flex h-8 items-center justify-center rounded-lg border bg-background px-3 text-sm font-medium outline-none transition-[background-color,transform] duration-150 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50"
						onclick={signOut}
						disabled={signingOut}
					>
						{signingOut ? 'Signing out…' : 'Sign out'}
					</button>
				</div>
			</div>
			{#if signOutFailed}
				<p class="border-t px-6 py-2 text-center text-sm text-destructive" role="alert">
					We couldn’t confirm that you’re signed out. Refresh before trying again.
				</p>
			{/if}
		</header>
		{@render children()}
	</div>
