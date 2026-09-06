import { ref } from 'vue';
import { Reactive } from '../../ivue';
import type { MemberSeed } from './types';

class $Member {

  constructor(seed: MemberSeed) {
    this.id = seed.id;
    this.name = seed.name;
    this.initials = seed.initials;
    this.role = seed.role;
    this.color = seed.color;
    this.capacity.value = seed.capacity;
    this.online.value = seed.online;
  }

  readonly id: string;

  readonly name: string;

  readonly initials: string;

  readonly role: string;

  readonly color: string;

  get capacity() {
    return ref(0);
  }

  get online() {
    return ref(false);
  }
}

export namespace Member {
  export const $Class = $Member;
  export let Class = Reactive($Class);
  export type Model = InstanceType<typeof Class>;
  export type Instance = typeof Class.Instance;
}
