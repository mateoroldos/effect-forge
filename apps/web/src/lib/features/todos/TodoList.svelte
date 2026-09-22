<script lang="ts">
	import { Button } from '@effect-forge/ui/ui/button';
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
		{#each todos as todo (todo.id ?? todo)}
			{#if todo.id === null}
				<li class="flex items-center justify-between gap-4 p-4">
					<span class="break-words">{todo.title}</span>
					<Button type="button" variant="outline" disabled aria-label={`Complete ${todo.title}`}>Complete</Button>
				</li>
			{:else}
				<TodoItem {todo} />
			{/if}
		{/each}
	</ul>
{/if}
