import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    /** Judul halaman untuk tab browser dan placeholder. */
    title?: string
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
      meta: { guestOnly: true, title: 'Masuk' },
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
          meta: { title: 'Dashboard' },
        },
        {
          path: 'destinasi-wisata',
          name: 'attractions',
          component: () => import('@/views/ComingSoonView.vue'),
          meta: { title: 'Daftar Destinasi Wisata' },
        },
        {
          path: 'pemesanan-tiket',
          name: 'ticketBookings',
          component: () => import('@/views/ComingSoonView.vue'),
          meta: { title: 'Pemesanan Ticket Wisata' },
        },
        {
          path: 'penilaian',
          name: 'reviews',
          component: () => import('@/views/ComingSoonView.vue'),
          meta: { title: 'Penilaian dan Komentar' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'Halaman tidak ditemukan' },
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
