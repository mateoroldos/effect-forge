<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Input } from '@effect-forge/ui/ui/input';
	import { authClient } from './client.ts';
	import { fromURL } from './return-path.ts';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let submitting = $state(false);
	let message = $state<string | null>(null);

	const returnPath = $derived(fromURL(page.url));
	const signInHref = $derived(`/sign-in?returnTo=${encodeURIComponent(returnPath)}`);

	const submit = async (event: SubmitEvent) => {
		event.preventDefault();
		if (submitting) return;

		submitting = true;
		message = null;
		try {
			const result = await authClient.signUp.email({ name, email, password });
			if (result.error !== null) {
				message = 'We couldn’t create your account. Please try again.';
				return;
			}
		} catch {
			message = 'We couldn’t create your account. Please try again.';
			return;
		} finally {
			submitting = false;
		}

		await goto(returnPath, { refreshAll: true });
	};
</script>

<main class="grid min-h-screen min-w-80 place-items-center px-6 py-16">
	<section class="w-full max-w-sm" aria-labelledby="sign-up-title">
		<a href="/" class="font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">
			Effect Forge
		</a>

		<div class="mt-10 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
			<p class="text-xs font-medium tracking-[0.14em] text-primary uppercase">Start building</p>
			<h1 id="sign-up-title" class="mt-3 font-serif text-4xl leading-none tracking-[-0.035em]">
				Create your account
			</h1>
			<p class="mt-3 text-sm leading-6 text-muted-foreground">
				Create an account to access workspaces shared with you.
			</p>

			<form class="mt-8 space-y-5" onsubmit={submit}>
				<label class="block space-y-2 text-sm font-medium">
					<span>Name</span>
					<Input bind:value={name} autocomplete="name" required />
				</label>

				<label class="block space-y-2 text-sm font-medium">
					<span>Email</span>
					<Input bind:value={email} type="email" autocomplete="email" required />
				</label>

				<label class="block space-y-2 text-sm font-medium">
					<span>Password</span>
					<Input
						bind:value={password}
						type="password"
						autocomplete="new-password"
						maxlength={128}
						minlength={8}
						required
					/>
				</label>

				{#if message !== null}
					<p class="text-sm leading-5 text-destructive" role="alert">{message}</p>
				{/if}

				<button
					class="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground outline-none transition-[background-color,transform] duration-150 hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50"
					type="submit"
					disabled={submitting}
				>
					{submitting ? 'Creating account…' : 'Create account'}
				</button>
			</form>

			<p class="mt-6 text-center text-sm text-muted-foreground">
				Already have an account?
				<a class="ml-1 font-medium text-foreground underline underline-offset-4" href={signInHref}>
					Sign in
				</a>
			</p>
		</div>
	</section>
</main>
