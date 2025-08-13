<script lang="ts">
	import Button from "$lib/components/ui/button/button.svelte";

</script>

<h1>hello i am an admin page</h1>
  <Button onclick={() => {
localStorage.removeItem("jwt")
}} type="button">
  clear jwt
</Button>