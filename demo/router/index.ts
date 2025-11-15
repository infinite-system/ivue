import { createRouter, createWebHistory } from 'vue-router';
import IvueBenchmark from '../components/IvueBenchmark.vue';
import ComposableBenchmark from '../components/ComposableBenchmark.vue';
import ReactiveComposableBenchmark from '../components/ReactiveComposableBenchmark.vue';

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
    path: '/composable-benchmark',
    name: 'ComposableBenchmark',
    component: ComposableBenchmark
  },
  {
    path: '/reactive-composable-benchmark',
    name: 'ReactiveComposableBenchmark',
    component: ReactiveComposableBenchmark
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
