<script lang="ts">
	import { listTodos } from './todos.remote.ts';
	import TodoCreateForm from './TodoCreateForm.svelte';
	import TodoItem from './TodoItem.svelte';

	let { organizationId }: { organizationId: string } = $props();
	const todos = $derived(await listTodos(organizationId));
</script>

<TodoCreateForm {organizationId} />

{#if todos.length === 0}
	<p class="py-16 text-center text-sm text-muted-foreground">No todos yet. Add the first one above.</p>
{:else}
	<ul class="mt-8 divide-y rounded-xl border bg-card" aria-label="Todos">
		{#each todos as todo (todo.id)}
			<TodoItem {todo} />
		{/each}
	</ul>
{/if}
