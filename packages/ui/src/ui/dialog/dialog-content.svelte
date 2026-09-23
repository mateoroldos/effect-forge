<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import XIcon from '@lucide/svelte/icons/x';
	import { Button } from '@effect-forge/ui/ui/button';
	import { cn } from '@effect-forge/ui/cn';
	import type { Snippet } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: Omit<DialogPrimitive.ContentProps, 'children' | 'child'> & { children: Snippet } = $props();
</script>

<DialogPrimitive.Portal>
	<DialogPrimitive.Overlay class="fixed inset-0 z-50 bg-black/50" />
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
		class={cn('fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 text-foreground shadow-lg outline-none sm:max-w-lg', className)}
		{...restProps}
	>
		{@render children()}
		<DialogPrimitive.Close>
			{#snippet child({ props })}
				<Button variant="ghost" class="absolute top-2 right-2" size="icon-sm" {...props}>
					<XIcon />
					<span class="sr-only">Close</span>
				</Button>
			{/snippet}
		</DialogPrimitive.Close>
	</DialogPrimitive.Content>
</DialogPrimitive.Portal>
