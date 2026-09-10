import { Reactive } from '../../../../../../lib/Reactive';
import { Static } from '../../../../../../lib/Static';
import { Code } from './Code';
import { Hljs } from './Hljs';

// The same block, a different colour engine: one static overridden.
// Everything else — the knobs, the fold, the copy — is inherited.
class $HljsCode extends Code.$Class {
  static override get engine(): Code.Engine {
    return Hljs.Class;
  }
}

export namespace HljsCode {
  export const $Class = Static($HljsCode);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
