<script lang="ts">
	import { tick } from 'svelte';
	import { isHttpError } from '@sveltejs/kit';
	import { Button } from '@effect-forge/ui/ui/button';
	import { Input } from '@effect-forge/ui/ui/input';
	import * as Field from '@effect-forge/ui/ui/field';
	import { toast } from 'svelte-sonner';
	import { createTodo } from './todos.remote.ts';

	let { organizationId }: { organizationId: string } = $props();
	const create = $derived(createTodo.for(organizationId));
	let draft = $state<{ readonly title: string } | null>(null);
</script>

<form {...create.enhance(async (submission) => {
	draft = { title: submission.fields.title.value() ?? '' };
	try {
		if (await submission.submit()) {
			await tick();
			if (submission.element.isConnected) submission.element.reset();
		}
	} catch (failure) {
		if (isHttpError(failure)) {
			if (failure.status === 403) throw failure;
			toast.error(failure.body.message);
		} else {
			// oxlint-disable-next-line effecttsgo/global-console -- Locally recovered failures do not reach Kit's error hook.
			console.error(failure);
			toast.error('We couldn’t confirm the result. Refresh before trying again.');
		}
	} finally {
		draft = null;
	}
})} class="mt-8 space-y-3" aria-label="Add a todo">
	<input {...create.fields.organizationId.as('hidden', organizationId)} />
	<Field.Field data-invalid={Boolean(create.fields.title.issues()?.length)}>
		<Field.Label for="todo-title">New todo</Field.Label>
		<div class="flex gap-3">
			<Input id="todo-title" {...create.fields.title.as('text')} required maxlength={200} readonly={create.pending > 0} placeholder="What needs doing?" aria-describedby="todo-title-issues" />
			<Button type="submit" disabled={create.pending > 0}>{create.pending ? 'Adding…' : 'Add todo'}</Button>
		</div>
		<div id="todo-title-issues">
			{#if create.fields.title.issues()?.length}<Field.Error>Enter 1–200 characters without surrounding spaces.</Field.Error>{/if}
		</div>
	</Field.Field>
	{#if create.fields.allIssues()?.some((issue) => issue.path?.[0] !== 'title')}
		<Field.Error>We couldn’t apply this request. Refresh and try again.</Field.Error>
	{/if}
</form>

{#if draft}
	<p class="mt-8 rounded-xl border border-dashed p-4 text-muted-foreground" role="status"><span class="break-words">{draft.title}</span> <span class="text-sm">Adding…</span></p>
{/if}
