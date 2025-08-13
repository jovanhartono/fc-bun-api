<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { beforeNavigate, goto } from '$app/navigation';

	let { children } = $props();

	const client = new QueryClient({
		defaultOptions: {
			queries: {
				enabled: browser
			}
		}
	});

  beforeNavigate(({ to, cancel}) => {
    // initial load
    if (!to) return;

    const hasToken = localStorage.getItem("jwt")
    if (to.url.pathname.startsWith("/admin") && !hasToken) {
      cancel();
      goto('/auth/login')
    }
  })
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{page.data.title ? page.data.title + '- Freslean POS' : 'Freslean POS'}</title>
</svelte:head>

<QueryClientProvider {client}>
	<main>
		{@render children?.()}
	</main>
</QueryClientProvider>
