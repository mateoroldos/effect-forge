<script lang="ts">
	import { Button, buttonVariants } from '@effect-forge/ui/ui/button';
	import * as Dialog from '@effect-forge/ui/ui/dialog';

	let { id, prompt, repository }: { id: string; prompt: string; repository: string } = $props();
	let copyState = $state<'idle' | 'copying' | 'copied' | 'failed'>('idle');
	const titleId = $derived(`${id}-title`);
	const promptId = $derived(`${id}-prompt`);

	const copy = async () => {
		copyState = 'copying';
		try {
			await navigator.clipboard.writeText(prompt);
			copyState = 'copied';
		} catch {
			copyState = 'failed';
		}
	};
</script>

<Dialog.Root>
	<div class="flex w-full flex-col gap-5">
		<div class="flex flex-wrap items-center justify-center gap-4">
			<Dialog.Trigger
				id={id}
				class={buttonVariants({ size: 'lg', class: 'shrink-0 active:scale-[0.97]' })}
			>
				Start with an agent
			</Dialog.Trigger>
			<a class="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring sm:text-sm" href={repository} target="_blank" rel="noopener">
				Open in GitHub ↗
			</a>
		</div>
	</div>
	<Dialog.Content
		class="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl"
		onOpenAutoFocus={(event) => {
			event.preventDefault();
			document.getElementById(titleId)?.focus();
		}}
	>
		<Dialog.Header class="pr-6">
			<Dialog.Title id={titleId} tabindex={-1} class="font-serif text-2xl font-normal outline-none">
				Start with an agent
			</Dialog.Title>
			<Dialog.Description>
				Your agent interviews you one question at a time. Agree on what to keep, adapt, or omit;
				then it writes your vision, scaffolds the project, runs checks, and documents setup.
			</Dialog.Description>
		</Dialog.Header>
		<label for={promptId} class="text-sm font-medium">Copy this prompt into your coding agent</label>
		<textarea
			id={promptId}
			readonly
			value={prompt}
			rows={10}
			class="max-h-[40dvh] w-full resize-y rounded-md border bg-background p-3 font-mono text-sm leading-6 focus-visible:outline-2 focus-visible:outline-ring"
		></textarea>
		<div class="flex flex-wrap items-center gap-3">
			<Button onclick={copy} disabled={copyState === 'copying'} class="active:scale-[0.97]">
				{copyState === 'copying' ? 'Copying…' : 'Copy prompt'}
			</Button>
			<p role="status" class="text-sm text-muted-foreground">
				{#if copyState === 'copied'}
					Copied. Paste it into your agent to begin.
				{:else if copyState === 'failed'}
					Couldn't copy. Select the text above and copy it manually.
				{/if}
			</p>
		</div>
	</Dialog.Content>
</Dialog.Root>
