<script setup lang="ts">
import { Toaster } from '../src/shared/components/ui/sonner'
import { VueQueryDevtools } from '@tanstack/vue-query-devtools'
import 'vue-sonner/style.css'
</script>

<template>
  <Toaster richColors position="top-right" class="pointer-events-auto" />
  <VueQueryDevtools />
  <main class="flex flex-col min-h-dvh h-full">
    <RouterView />
  </main>
</template>
