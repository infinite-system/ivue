import { createRouter, createWebHistory } from 'vue-router';
import IvueBenchmark from '../components/IvueBenchmark.vue';
import ClassComposableBenchmark from '../components/ClassComposableBenchmark.vue';
import ComposableBenchmark from '../components/ComposableBenchmark.vue';

const routes = [
  {
    // Default route
    path: '/',
    redirect: '/ivue-benchmark'
  },
  {
    path: '/ivue-benchmark',
    name: 'IvueBenchmark',
    component: IvueBenchmark
  },
  {
    path: '/class-composable-benchmark',
    name: 'ClassComposableBenchmark',
    component: ClassComposableBenchmark
  },
  {
    path: '/composable-benchmark',
    name: 'ComposableBenchmark',
    component: ComposableBenchmark
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
