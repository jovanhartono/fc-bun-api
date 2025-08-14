<script setup lang="ts">
import { effect, type HTMLAttributes } from 'vue'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { rpc } from '@/core/rpc'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const loginSchema = toTypedSchema(
  z.object({
    username: z.string().min(1, { error: 'Username is required' }),
    password: z.string().min(1, { error: 'Password is required' }),
  }),
)

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: loginSchema,
  initialValues: {
    username: '',
    password: '',
  },
})

effect(() => {
  console.log(isSubmitting.value)
})

const onSubmit = handleSubmit(async (values) => {
  console.log('Form submitted!', values)
  const res = await rpc.api.auth.login.$post({
    json: values,
  })

  const response = await res.json()
  console.log(response)
})
</script>

<template>
  <form
    @submit="onSubmit"
    :class="cn('flex flex-col gap-6 border rounded-md p-4 shadow', props.class)"
  >
    <h1 class="text-2xl font-bold">Login</h1>
    <FormField v-slot="{ componentField }" name="username" class="grid gap-6">
      <FormItem>
        <FormLabel asterisk>Username</FormLabel>
        <FormControl>
          <Input placeholder="Username" v-bind="componentField" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="password" class="grid gap-6">
      <FormItem>
        <FormLabel asterisk>Password</FormLabel>
        <FormControl>
          <Input placeholder="Password" type="password" v-bind="componentField" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <Button :loading="isSubmitting" type="submit" class-name="w-full"> Login </Button>
  </form>
</template>
