<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	const id = $props.id();
</script>

<Card.Root class="mx-auto w-full max-w-sm">
	<Card.Header>
		<Card.Title class="text-2xl">Login</Card.Title>
	</Card.Header>
	<Card.Content>
		<div class="grid gap-4">
			<div class="grid gap-2">
				<Label for="email-{id}">Username</Label>
				<Input id="email-{id}" type="text" placeholder="Username" required />
			</div>
			<div class="grid gap-2">
				<Label for="password-{id}">Password</Label>
				<Input id="password-{id}" type="password" required />
			</div>
			<Button type="submit" class="w-full">Login</Button>
		</div>
	</Card.Content>
</Card.Root>
