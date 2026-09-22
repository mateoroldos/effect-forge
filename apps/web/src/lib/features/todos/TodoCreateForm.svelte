<script lang="ts">
	import { isHttpError } from '@sveltejs/kit';
	import { Button } from '@effect-forge/ui/ui/button';
	import { Input } from '@effect-forge/ui/ui/input';
	import { Textarea } from '@effect-forge/ui/ui/textarea';
	import * as Field from '@effect-forge/ui/ui/field';
	import { toast } from 'svelte-sonner';
	import { createTodo, listTodos, type TodoListItem } from './todos.remote.ts';

	let { organizationId }: { organizationId: string } = $props();
	const create = $derived(createTodo.for(organizationId));

	function recover(input: { title: string; description: string }, message: string) {
		const restore = () => {
			create.fields.title.set(input.title);
			create.fields.description.set(input.description);
		};
		if (!create.fields.title.value() && !create.fields.description.value()) {
			restore();
			toast.error(message);
		} else {
			toast.error(message, {
				description: input.title,
				duration: 15_000,
				closeButton: true,
				action: { label: 'Restore text', onClick: restore }
			});
		}
	}
</script>

<form {...create.enhance(async (submission) => {
	const input = {
		title: submission.fields.title.value() ?? '',
		description: submission.fields.description.value() ?? ''
	};
	const optimistic: TodoListItem = { id: null, ...input };
	try {
		const pending = submission.submit().updates(
			listTodos(organizationId).withOverride((todos) => [...todos, optimistic])
		);
		submission.element.reset();
		if (!await pending) {
			recover(input, submission.fields.title.issues()?.length
				? 'Enter 1–200 characters without surrounding spaces.'
				: submission.fields.description.issues()?.length
					? 'Use at most 2,000 characters for the description.'
				: 'We couldn’t apply this request. Refresh and try again.');
		}
	} catch (failure) {
		if (isHttpError(failure)) {
			if (failure.status === 403) throw failure;
			recover(input, failure.body.message);
		} else {
			// oxlint-disable-next-line effecttsgo/global-console -- Locally recovered failures do not reach Kit's error hook.
			console.error(failure);
			recover(input, 'We couldn’t confirm the result. Refresh before trying again.');
		}
	}
})} class="mt-8 space-y-3" aria-label="Add a todo">
	<input {...create.fields.organizationId.as('hidden', organizationId)} />
	<Field.Field data-invalid={Boolean(create.fields.title.issues()?.length)}>
		<Field.Label for="todo-title">New todo</Field.Label>
		<Input id="todo-title" {...create.fields.title.as('text')} required maxlength={200} placeholder="What needs doing?" aria-describedby="todo-title-issues" />
		<div id="todo-title-issues">
			{#if create.fields.title.issues()?.length}<Field.Error>Enter 1–200 characters without surrounding spaces.</Field.Error>{/if}
		</div>
	</Field.Field>
	<Field.Field data-invalid={Boolean(create.fields.description.issues()?.length)}>
		<Field.Label for="todo-description">Description <span class="font-normal text-muted-foreground">(optional)</span></Field.Label>
		<Textarea id="todo-description" {...create.fields.description.as('text')} rows={3} maxlength={2000} placeholder="Add a little more detail…" aria-describedby="todo-description-issues" />
		<div id="todo-description-issues">
			{#if create.fields.description.issues()?.length}<Field.Error>Use at most 2,000 characters for the description.</Field.Error>{/if}
		</div>
	</Field.Field>
	<Button type="submit">Add todo</Button>
	{#if create.fields.allIssues()?.some((issue) => issue.path?.[0] !== 'title' && issue.path?.[0] !== 'description')}
		<Field.Error>We couldn’t apply this request. Refresh and try again.</Field.Error>
	{/if}
</form>
