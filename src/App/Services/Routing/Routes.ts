export default [
  {
    name: 'root',
    path: '/',
    secure: true,
    component: () => import('@/App/Home/Home.vue'),
  },
  {
    name: 'loginLink',
    path: '/app/login',
    secure: false,
    component: () => import('@/App/Auth/Auth.vue'),
  },
  {
    name: 'homeLink',
    path: '/app/home',
    secure: true,
    component: () => import('@/App/Home/Home.vue'),
  },
  {
    name: 'authorPolicyLink',
    path: '/app/author-policy',
    secure: false,
    component: () => import('@/App/Home/Home.vue'),
  },
  {
    name: '*',
    path: '/:catchAll(.*)*',
    secure: true,
    component: () => import('@/App/Services/Routing/NotFoundRoute.vue')
  }
]