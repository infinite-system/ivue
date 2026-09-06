import { ref } from 'vue';
import { Reactive } from '../../ivue';
import type { ProjectSeed } from './types';

class $Project {

  constructor(seed: ProjectSeed) {
    this.id = seed.id;
    this.icon = seed.icon;
    this.color = seed.color;
    this.name.value = seed.name;
  }

  readonly id: string;

  readonly icon: string;

  readonly color: string;

  get name() {
    return ref('');
  }
}

export namespace Project {
  export const $Class = $Project;
  export let Class = Reactive($Class);
  export type Model = InstanceType<typeof Class>;
  export type Instance = typeof Class.Instance;
}
