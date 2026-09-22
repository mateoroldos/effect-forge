<script lang="ts">
	import type { Todo } from '@effect-forge/domain/todo';
	import { isHttpError } from '@sveltejs/kit';
	import { Button } from '@effect-forge/ui/ui/button';
	import { toast } from 'svelte-sonner';
	import { listTodos, setTodoCompleted } from './todos.remote.ts';

	let { todo }: { todo: Todo } = $props();
	const update = $derived(setTodoCompleted.for(todo.id));
</script>

<li class="p-4">
	<form {...update.enhance(async (submission) => {
		const { id, organizationId } = todo;
		const completed = !todo.completed;
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
		<input {...update.fields.organizationId.as('hidden', todo.organizationId)} />
		<input {...update.fields.id.as('hidden', todo.id)} />
		<input {...update.fields.completed.as('hidden', todo.completed ? 'false' : 'true')} />
		<div class="min-w-0">
			<span class={todo.completed ? 'break-words text-muted-foreground line-through' : 'break-words'}>{todo.title}</span>
			{#if todo.description}<p class="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{todo.description}</p>{/if}
		</div>
		<Button type="submit" variant="outline" disabled={update.pending > 0} aria-label={`${todo.completed ? 'Reopen' : 'Complete'} ${todo.title}`}>
			{todo.completed ? 'Reopen' : 'Complete'}
		</Button>
	</form>
	{#if update.fields.allIssues()?.length}<p class="mt-2 text-sm text-destructive" role="alert">We couldn’t apply this change. Refresh and try again.</p>{/if}
</li>
