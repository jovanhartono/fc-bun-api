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
  ],
})

router.beforeEach((to, from) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - Fresclean POS`
  }

  const access_token = localStorage.getItem('jwt')

  // checking is not needed if the page is guest page.
  if (to.meta.guest) {
    // prevent navigation when user try to load login page, but already has the valid access_token
    if (to.name === 'login' && access_token) {
      return from
    }

    return true
  }

  // page need auth, redirect to login page if access-token is undefined
  if (!access_token) {
    return {
      name: 'login',
    }
  }

  return true
})

export default router
