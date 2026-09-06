// ChooseFieldExample.ts — the Advanced Select Field showcase route state.
// Installs the in-browser mock backend for this route chunk; swap
// ServerApi.Class.use(httpTransport('http://localhost:4300')) to run the same
// components against server-node/server.ts.
import { ref } from 'vue';
import { Reactive } from '../../../ivue';
import { ServerApi } from '../server/ServerApi';
import { createMockServerTransport, resetMockServer } from '../server/MockServer';

class $ChooseFieldExample {
  constructor() {
    this.installMockServer();
  }

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

  get resetLabel() {
    return this.resetting.value ? 'Resetting…' : 'Reset sandbox data';
  }

  // CONSTANTS — static options for the client-only variations.
  readonly planOptions = [
    { name: 'Hobby', description: 'For side projects', icon: 'rocket_launch' },
    { name: 'Pro', description: 'For production apps', icon: 'workspace_premium' },
    { name: 'Team', description: 'Shared workspaces', icon: 'groups' },
    { name: 'Enterprise', description: 'SSO, audit, SLAs', icon: 'apartment' },
  ];

  readonly variants = [
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

  /** This route runs against the in-browser mock backend; installing it
   *  here (not at import) keeps the class file free of side effects. Swap
   *  for `ServerApi.Class.use(httpTransport(...))` to run against server-node. */
  installMockServer() {
    ServerApi.Class.use(createMockServerTransport());
  }
}

export namespace ChooseFieldExample {
  export const $Class = $ChooseFieldExample; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
