<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { z } from 'zod';
	import { createForm } from '@tanstack/svelte-form';
	import { createMutation } from '@tanstack/svelte-query';
	import { rpc } from '$lib/rpc';
	import { goto } from '$app/navigation';

	const loginSchema = z.object({
		username: z.string().min(1, 'Username is required'),
		password: z.string().min(1, 'Password is required')
	});

	const mutation = createMutation({
		mutationKey: ['login'],
		mutationFn: async (body: z.infer<typeof loginSchema>) => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const res = await rpc.api.auth.login.$post({
      json: body
      })


      return (await res.json()).data
		},
    onSuccess(data) {
      if (data) {
        localStorage.setItem("jwt", data.token)
        goto("/admin", { replaceState: true})
      }
    }
	});

	const form = createForm(() => ({
		defaultValues: {
			username: '',
			password: ''
		},
		defaultState: {
			isFormValid: false,
			canSubmit: false
		},
		validators: {
			onChange: loginSchema
		},
		onSubmit: async ({ value }) => await $mutation.mutateAsync(value)
	}));
</script>

<Card.Root class="mx-auto w-sm">
	<Card.Header>
		<Card.Title class="text-2xl">Login</Card.Title>
	</Card.Header>
	<Card.Content>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			class="grid gap-4"
		>
			<form.Field name="username">
				{#snippet children(field)}
					<div class="grid gap-2">
						<Label for={field.name}>Username</Label>
						<Input
							id={field.name}
							type="text"
							placeholder="Username"
							value={field.state.value}
							onblur={field.handleBlur}
							oninput={(e) => field.handleChange((e.target as HTMLInputElement).value)}
						/>
					</div>
				{/snippet}
			</form.Field>
			<form.Field name="password">
				{#snippet children(field)}
					<div class="grid gap-2">
						<Label for={field.name}>Password</Label>
						<Input
							id={field.name}
							type="password"
							placeholder="Password"
							value={field.state.value}
							onblur={field.handleBlur}
							oninput={(e) => field.handleChange((e.target as HTMLInputElement).value)}
						/>
					</div>
				{/snippet}
			</form.Field>

			<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting, state.isPristine]}>
				{#snippet children([canSubmit, isSubmitting, isPristine])}
					<Button
						isLoading={isSubmitting}
						disabled={isPristine || !canSubmit}
						type="submit"
						class="w-full"
						>Login
					</Button>
				{/snippet}
			</form.Subscribe>
		</form>
	</Card.Content>
</Card.Root>
