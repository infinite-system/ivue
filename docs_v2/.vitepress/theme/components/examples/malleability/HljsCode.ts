import { Reactive } from '../../../../../../lib/Reactive';
import { Static } from '../../../../../../lib/Static';
import type { Code } from './Code';
import { ConfiguredCode } from './ConfiguredCode';
import { Hljs } from './Hljs';

// The same block, a different colour engine: one static overridden.
// It stacks on the configuration layer, so its knobs stay open; the
// fold and the copy are inherited from Code.
class $HljsCode extends ConfiguredCode.$Class {
  static override get engine(): Code.Engine {
    return Hljs.Class;
  }
}

export namespace HljsCode {
  export const $Class = Static($HljsCode);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
