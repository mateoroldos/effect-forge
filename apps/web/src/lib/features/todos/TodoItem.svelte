<script lang="ts">
	import { isHttpError } from '@sveltejs/kit';
	import { Button } from '@effect-forge/ui/ui/button';
	import { toast } from 'svelte-sonner';
	import { listTodos, setTodoCompleted } from './todos.remote.ts';
	import type { TodoListItem } from './todo-list-item.ts';

	let { todo }: { todo: TodoListItem } = $props();
</script>

{#snippet content()}
	<div class="min-w-0">
		<span class={todo.id !== null && todo.completed ? 'break-words text-muted-foreground line-through' : 'break-words'}>{todo.title}</span>
		{#if todo.description}<p class="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{todo.description}</p>{/if}
	</div>
{/snippet}

<li class="p-4">
	{#if todo.id === null}
		<div class="flex items-center justify-between gap-4">
			{@render content()}
			<Button type="button" variant="outline" disabled aria-label={`Complete ${todo.title}`}>Complete</Button>
		</div>
	{:else}
		{@const confirmed = todo}
		{@const update = setTodoCompleted.for(confirmed.id)}
		<form {...update.enhance(async (submission) => {
			const { id, organizationId } = confirmed;
			const completed = !confirmed.completed;
			try {
				await submission.submit().updates(
					listTodos(organizationId).withOverride((todos) =>
						todos.map((current) => current.id === id ? { ...current, completed } : current)
					)
				);
			} catch (failure) {
				if (isHttpError(failure)) {
					if (failure.status === 403) throw failure;
					toast.error(failure.body.message);
					if (failure.status === 404) await listTodos(organizationId).refresh();
				} else {
					// oxlint-disable-next-line effecttsgo/global-console -- Locally recovered failures do not reach Kit's error hook.
					console.error(failure);
					toast.error('We couldn’t confirm the result. Refresh before trying again.');
				}
			}
		})} class="flex items-center justify-between gap-4" aria-label={`Update ${todo.title}`}>
			<input {...update.fields.organizationId.as('hidden', confirmed.organizationId)} />
			<input {...update.fields.id.as('hidden', confirmed.id)} />
			<input {...update.fields.completed.as('hidden', confirmed.completed ? 'false' : 'true')} />
			{@render content()}
			<Button type="submit" variant="outline" disabled={update.pending > 0} aria-label={`${confirmed.completed ? 'Reopen' : 'Complete'} ${todo.title}`}>
				{confirmed.completed ? 'Reopen' : 'Complete'}
			</Button>
		</form>
		{#if update.fields.allIssues()?.length}<p class="mt-2 text-sm text-destructive" role="alert">We couldn’t apply this change. Refresh and try again.</p>{/if}
	{/if}
</li>
