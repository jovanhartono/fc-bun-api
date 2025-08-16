import { useAuth } from '@/core/stores/auth-store'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/auth/login',
      name: 'login',
      meta: {
        guest: true,
        title: 'Login',
      },
      component: () => import('@/modules/auth/LoginPage.vue'),
    },
    {
      path: '/',
      component: () => import('@/modules/layout/Shell.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/modules/dashboard/HomePage.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to, from) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - Fresclean POS`
  }

  const { token, user } = useAuth()

  console.log(user)

  // checking is not needed if the page is guest page.
  if (to.meta.guest) {
    // prevent navigation when user try to load login page, but already has the valid access_token
    if (to.name === 'login' && token) {
      return from
    }

    return true
  }

  // page need auth, redirect to login page if access-token is undefined
  if (!token) {
    return {
      name: 'login',
    }
  }

  return true
})

export default router
