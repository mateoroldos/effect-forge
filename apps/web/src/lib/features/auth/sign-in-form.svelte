<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Input } from '@effect-forge/ui/ui/input';
	import { Button } from '@effect-forge/ui/ui/button';
	import { Spinner } from '@effect-forge/ui/ui/spinner';
	import { authClient } from './client.ts';
	import { fromURL } from './return-path.ts';

	let email = $state('');
	let password = $state('');
	let submitting = $state(false);
	let message = $state<string | null>(null);

	const returnPath = $derived(fromURL(page.url));
	const signUpHref = $derived(`/sign-up?returnTo=${encodeURIComponent(returnPath)}`);

	const submit = async (event: SubmitEvent) => {
		event.preventDefault();
		if (submitting) return;

		submitting = true;
		message = null;
		try {
			const result = await authClient.signIn.email({ email, password });
			if (result.error !== null) {
				message =
					result.error.code === 'INVALID_EMAIL_OR_PASSWORD'
						? 'The email or password is incorrect.'
						: 'We couldn’t sign you in right now. Please try again.';
				return;
			}
		} catch (failure) {
			// oxlint-disable-next-line effecttsgo/global-console -- Locally recovered failures do not reach Kit's error hook.
			console.error(failure);
			message = 'We couldn’t sign you in right now. Please try again.';
			return;
		} finally {
			submitting = false;
		}

		await goto(returnPath, { refreshAll: true });
	};
</script>

<main class="grid min-h-screen min-w-80 place-items-center px-6 py-16">
	<section class="w-full max-w-sm" aria-labelledby="sign-in-title">
		<a href="/" class="font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">
			Effect Forge
		</a>

		<div class="mt-10 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
			<p class="text-xs font-medium tracking-[0.14em] text-primary uppercase">Welcome back</p>
			<h1 id="sign-in-title" class="mt-3 font-serif text-4xl leading-none tracking-[-0.035em]">
				Sign in
			</h1>
            <p class="mt-3 text-sm leading-6 text-muted-foreground">Continue to your organizations.</p>

			<form class="mt-8 space-y-5" onsubmit={submit}>
				<label class="block space-y-2 text-sm font-medium">
					<span>Email</span>
					<Input bind:value={email} type="email" autocomplete="email" required />
				</label>

				<label class="block space-y-2 text-sm font-medium">
					<span>Password</span>
					<Input bind:value={password} type="password" autocomplete="current-password" required />
				</label>

				{#if message !== null}
					<p class="text-sm leading-5 text-destructive" role="alert">{message}</p>
				{/if}

				<Button
					class="h-10 w-full px-4"
					type="submit"
					disabled={submitting}
				>
					{#if submitting}<Spinner data-icon="inline-start" />{/if}
					{submitting ? 'Signing in…' : 'Sign in'}
				</Button>
			</form>

			<p class="mt-6 text-center text-sm text-muted-foreground">
				New to Effect Forge?
				<a class="ml-1 font-medium text-foreground underline underline-offset-4" href={signUpHref}>
					Create an account
				</a>
			</p>
		</div>
	</section>
</main>
