// ChooseFieldExample.ts — the Advanced Select Field showcase route state.
// Installs the in-browser mock backend for this route chunk; swap
// ServerApi.use(httpTransport('http://localhost:4300')) to run the same
// components against server-node/server.ts.
import { ref } from 'vue';
import { Reactive } from '../../../ivue';
import { ServerApi } from '../server/ServerApi';
import { mockServerTransport, resetMockServer } from '../server/MockServer';

ServerApi.use(mockServerTransport);

class $ChooseFieldExample {
  // MUTABLE STATE — one model per showcased variation.
  get basicPick() {
    return ref<any>(null);
  }
  get iconPick() {
    return ref<any>(null);
  }
  get serverContact() {
    return ref<any>(null);
  }
  get clientContact() {
    return ref<any>(null);
  }
  get compactContact() {
    return ref<any>(null);
  }
  get teamPicks() {
    return ref<any[]>([]);
  }
  get tagPicks() {
    return ref<any[]>([]);
  }
  get variantPick() {
    return ref<any>(null);
  }
  get resetting() {
    return ref(false);
  }

  // CONSTANTS — static options for the client-only variations.
  planOptions = [
    { name: 'Hobby', description: 'For side projects', icon: 'rocket_launch' },
    { name: 'Pro', description: 'For production apps', icon: 'workspace_premium' },
    { name: 'Team', description: 'Shared workspaces', icon: 'groups' },
    { name: 'Enterprise', description: 'SSO, audit, SLAs', icon: 'apartment' },
  ];

  variants = [
    {
      label: 'People',
      icon: 'person',
      default: true as const,
      fetchFilters: "kind = 'person'",
      fetchSort: 'name:asc',
    },
    {
      label: 'Companies',
      icon: 'apartment',
      fetchFilters: "kind = 'company'",
      fetchSort: 'name:asc',
    },
  ];

  async resetSandbox() {
    this.resetting.value = true;
    await resetMockServer();
    this.resetting.value = false;
  }
}

export namespace ChooseFieldExample {
  export const $Class = $ChooseFieldExample; // raw — children `extends` this
  export const Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
