export default [
  {
    name: 'root',
    path: '/',
    secure: true,
    component: () => import('@/Classes/Home/HomeComponent.vue'),
  },
  {
    name: 'loginLink',
    path: '/app/login',
    secure: false,
    component: () => import('@/Classes/Auth/LoginRegisterComponent.vue'),
  },
  {
    name: 'homeLink',
    path: '/app/home',
    secure: true,
    component: () => import('@/Classes/Home/HomeComponent.vue'),
  },
  {
    name: 'authorPolicyLink',
    path: '/app/author-policy',
    secure: false,
    component: () => import('@/Classes/Home/HomeComponent.vue'),
  },
  {
    name: '*',
    path: '/:catchAll(.*)*',
    secure: true,
    component: () => import('@/Classes/Routing/NotFoundRoute.vue')
  }
]