import { Reactive } from '../../../../../../lib/Reactive';
import { Code } from './Code';

// The configuration layer. `Code` reads its own props and nothing else;
// this subclass opens three of them to the kit, each as one getter that
// reads the entry's value and falls back to `super`. A setting is a
// getter. Another layer above this one — a user preference, an org
// policy — is another subclass with the same shape, and precedence is
// inheritance order.
class $ConfiguredCode extends Code.$Class {
  override get theme(): Code.Theme {
    return (this.props.kit?.props?.theme as Code.Theme | undefined) ?? super.theme;
  }

  override get lineNumbers(): boolean {
    return (this.props.kit?.props?.lineNumbers as boolean | undefined) ?? super.lineNumbers;
  }

  override get maxLines(): number | null {
    return (this.props.kit?.props?.maxLines as number | null | undefined) ?? super.maxLines;
  }
}

export namespace ConfiguredCode {
  export const $Class = $ConfiguredCode; // no statics of its own — the layer inherits Code's
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
