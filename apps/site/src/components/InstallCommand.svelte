<script lang="ts">
	import { Button } from '@effect-forge/ui/ui/button';

	let { command }: { command: string } = $props();

	/** How long "copied" stays on the button before it offers to copy again. */
	const acknowledgement = 1600;

	let copied = $state(false);
	let clearing: ReturnType<typeof setTimeout>;

	const copy = async () => {
		await navigator.clipboard.writeText(command);
		copied = true;
		clearTimeout(clearing);
		clearing = setTimeout(() => (copied = false), acknowledgement);
	};
</script>

<div
	class="flex w-full max-w-lg items-center gap-2 rounded-md border bg-muted/25 py-1 pr-1 pl-3 font-mono text-sm"
>
	<span class="select-none text-muted-foreground">$</span>
	<code class="truncate">{command}</code>
	<Button
		aria-label="Copy install command"
		class="ml-auto font-mono text-xs active:scale-[0.97]"
		onclick={copy}
		size="sm"
		variant="ghost"
	>
		{copied ? 'copied' : 'copy'}
	</Button>
</div>
