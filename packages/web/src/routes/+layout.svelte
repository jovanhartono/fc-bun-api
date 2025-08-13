<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{page.data.title ? page.data.title + '- Freslean POS' : 'Freslean POS'}</title>
</svelte:head>

<main>
	{@render children?.()}
</main>
