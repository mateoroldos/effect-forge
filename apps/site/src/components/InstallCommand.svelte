<script lang="ts">
	import { Button } from '@effect-forge/ui/ui/button';

	let { command }: { command: string } = $props();

	let copyState = $state<'idle' | 'copied' | 'failed'>('idle');

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(command);
			copyState = 'copied';
		} catch {
			copyState = 'failed';
		}
	};
</script>

<div class="w-full min-w-0 max-w-lg">
	<div class="flex min-h-10 items-center gap-2 rounded-md border bg-muted/25 py-1 pr-1 pl-3 font-mono text-xs">
		<code class="min-w-0 break-all select-all">{command}</code>
		<Button
			aria-label="Copy install command"
			class="ml-auto shrink-0 font-mono text-xs active:scale-[0.97]"
			onclick={copy}
			size="sm"
			variant="ghost"
		>
			{copyState === 'copied' ? 'copied' : 'copy'}
		</Button>
	</div>
	<p role="status" class={copyState === 'failed' ? 'mt-2 text-sm text-muted-foreground' : 'sr-only'}>
		{#if copyState === 'copied'}
			Command copied.
		{:else if copyState === 'failed'}
			Couldn't copy. Select the command and copy it manually.
		{/if}
	</p>
</div>
