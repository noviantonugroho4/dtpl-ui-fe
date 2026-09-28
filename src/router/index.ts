import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    titleKey?: string
  }
}

/** Landing paths after sign-in; no `redirect` query is needed to get back to them. */
const DEFAULT_PATHS = new Set(['/', '/dashboard'])

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guestOnly: true, titleKey: 'login.title' },
    },
    {
      path: '/',
      component: () => import('@/layouts/AdminLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: { name: 'dashboard' } },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { titleKey: 'nav.dashboard' },
        },
        {
          path: 'objek-wisata',
          name: 'attractions',
          component: () => import('@/views/ComingSoonView.vue'),
          meta: { titleKey: 'nav.attractions' },
        },
        {
          path: 'penginapan',
          name: 'lodging',
          component: () => import('@/views/ComingSoonView.vue'),
          meta: { titleKey: 'nav.lodging' },
        },
        {
          path: 'rumah-makan',
          name: 'restaurants',
          component: () => import('@/views/ComingSoonView.vue'),
          meta: { titleKey: 'nav.restaurants' },
        },
        {
          path: 'pemesanan-tiket',
          name: 'ticketBookings',
          component: () => import('@/views/ComingSoonView.vue'),
          meta: { titleKey: 'nav.ticketBookings' },
        },
        {
          path: 'penilaian',
          name: 'reviews',
          component: () => import('@/views/ComingSoonView.vue'),
          meta: { titleKey: 'nav.reviews' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
})

router.beforeEach(async (to): Promise<RouteLocationRaw | undefined> => {
  const auth = useAuthStore()
  if (!auth.initialized) await auth.initialize()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: DEFAULT_PATHS.has(to.fullPath) ? {} : { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
  return undefined
})

export default router
