import { defineStore } from 'pinia'
import { computed } from 'vue'
import { jwtDecode } from 'jwt-decode'
import { useLocalStorage } from '@vueuse/core'

export const useAuth = defineStore('auth', () => {
  const token = useLocalStorage<string | null>('jwt', null)

  // decode JWT
  const user = computed(() => {
    if (!token.value) {
      return
    }

    return jwtDecode(token.value)
  })

  function setToken(tokenArgument: string) {
    token.value = tokenArgument
  }

  function logout() {
    token.value = undefined
  }

  return { token: token.value, setToken, logout, user }
})
