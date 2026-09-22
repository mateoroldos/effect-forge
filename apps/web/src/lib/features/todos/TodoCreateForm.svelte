<script lang="ts">
	import { isHttpError } from '@sveltejs/kit';
	import { Button } from '@effect-forge/ui/ui/button';
	import { Input } from '@effect-forge/ui/ui/input';
	import * as Field from '@effect-forge/ui/ui/field';
	import { toast } from 'svelte-sonner';
	import { createTodo, listTodos, type TodoListItem } from './todos.remote.ts';

	let { organizationId }: { organizationId: string } = $props();
	const create = $derived(createTodo.for(organizationId));

	function recover(title: string, message: string) {
		if (!create.fields.title.value()) {
			create.fields.title.set(title);
			toast.error(message);
		} else {
			toast.error(message, {
				description: title,
				duration: 15_000,
				closeButton: true,
				action: { label: 'Restore text', onClick: () => create.fields.title.set(title) }
			});
		}
	}
</script>

<form {...create.enhance(async (submission) => {
	const title = submission.fields.title.value() ?? '';
	const optimistic: TodoListItem = { id: null, title };
	try {
		const pending = submission.submit().updates(
			listTodos(organizationId).withOverride((todos) => [...todos, optimistic])
		);
		submission.element.reset();
		if (!await pending) {
			recover(title, submission.fields.title.issues()?.length
				? 'Enter 1–200 characters without surrounding spaces.'
				: 'We couldn’t apply this request. Refresh and try again.');
		}
	} catch (failure) {
		if (isHttpError(failure)) {
			if (failure.status === 403) throw failure;
			recover(title, failure.body.message);
		} else {
			// oxlint-disable-next-line effecttsgo/global-console -- Locally recovered failures do not reach Kit's error hook.
			console.error(failure);
			recover(title, 'We couldn’t confirm the result. Refresh before trying again.');
		}
	}
})} class="mt-8 space-y-3" aria-label="Add a todo">
	<input {...create.fields.organizationId.as('hidden', organizationId)} />
	<Field.Field data-invalid={Boolean(create.fields.title.issues()?.length)}>
		<Field.Label for="todo-title">New todo</Field.Label>
		<div class="flex gap-3">
			<Input id="todo-title" {...create.fields.title.as('text')} required maxlength={200} placeholder="What needs doing?" aria-describedby="todo-title-issues" />
			<Button type="submit">Add todo</Button>
		</div>
		<div id="todo-title-issues">
			{#if create.fields.title.issues()?.length}<Field.Error>Enter 1–200 characters without surrounding spaces.</Field.Error>{/if}
		</div>
	</Field.Field>
	{#if create.fields.allIssues()?.some((issue) => issue.path?.[0] !== 'title')}
		<Field.Error>We couldn’t apply this request. Refresh and try again.</Field.Error>
	{/if}
</form>
