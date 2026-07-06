import { createRouter, createWebHistory } from 'vue-router';
import Home from '../components/Home.vue';
import WatchDemo from '../components/WatchDemo.vue';
import IvueBenchmark from '../components/IvueBenchmark.vue';
import ClassComposableBenchmark from '../components/ClassComposableBenchmark.vue';
import ComposableBenchmark from '../components/ComposableBenchmark.vue';
import GridComposable from '../grid/GridComposable.vue';
import GridIvue from '../grid/GridIvue.vue';
import GridPojo from '../grid/GridPojo.vue';

const routes = [
  {
    // Landing page — links only, no benchmark auto-loads
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/watch',
    name: 'WatchDemo',
    component: WatchDemo,
  },
  {
    path: '/ivue-benchmark',
    name: 'IvueBenchmark',
    component: IvueBenchmark,
  },
  {
    path: '/class-composable-benchmark',
    name: 'ClassComposableBenchmark',
    component: ClassComposableBenchmark,
  },
  {
    path: '/composable-benchmark',
    name: 'ComposableBenchmark',
    component: ComposableBenchmark,
  },
  {
    path: '/grid-composable',
    name: 'GridComposable',
    component: GridComposable,
  },
  {
    path: '/grid-ivue',
    name: 'GridIvue',
    component: GridIvue,
  },
  {
    path: '/grid-pojo',
    name: 'GridPojo',
    component: GridPojo,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
