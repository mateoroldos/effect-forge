<script lang="ts">
	import LoaderIcon from '@lucide/svelte/icons/loader';
	import { cn } from '@effect-forge/ui/cn.js';
	import type { ComponentProps } from 'svelte';

	let { class: className, ...restProps }: ComponentProps<typeof LoaderIcon> = $props();
</script>

<LoaderIcon role="status" aria-label="Loading" class={cn('size-4 animate-spin', className)} {...restProps} />
