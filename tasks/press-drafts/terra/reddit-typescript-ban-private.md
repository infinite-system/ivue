---
venue: r/typescript
purpose: post
lang: en
source: ban-private
status: draft-for-review
---

# Let subclasses change code without copying the class

If a subclass needs one line different inside a base method, TypeScript `private` leaves it one escape hatch: copy the file.

ivue, a **1.1 kB class layer over Vue's reactivity**, uses a rule that is useful without the library: internal extension seams are `protected`; every override is marked `override`; `noImplicitOverride` is on.

```ts
class $ChooseField {
  protected get fetchPath() {
    return '/options'
  }
}

class $ContactField extends $ChooseField {
  protected override get fetchPath() {
    return super.fetchPath || '/contact'
  }
}
```

`protected` means consumers and templates cannot reach `fetchPath`, while subclasses can.

The failure mode is real: rename a protected member and a subclass could accidentally stop overriding it. `noImplicitOverride` turns that into a compile error at the subclass declaration instead of a behavior change at runtime.

```json
{ "compilerOptions": { "noImplicitOverride": true } }
```

That gives each keyword one job:

- `public`: the consumer surface.
- `protected`: the subclass surface.
- `override`: proof that a subclass touchpoint still has a base member.

`private` in TypeScript is compile-time only. It does not hide the emitted property at runtime. Native `#private` fields do hide it, but also deny it to subclasses, which is the same extension problem with a harder wall.

This is not a universal rule. A codebase that does not offer inheritance may prefer `private`. The rule is for a class architecture that treats variants as subclasses: preserve the extension seam, then make seam drift loud.

We used it in Invar, a **108,000-line terminal IDE built by AI agents**. The practical win was simple: a variant changed the member it needed instead of carrying a copied base class forward.

The longer reasoning and the exact three-tier table are here: [ivue.dev/blog/ban-private](https://ivue.dev/blog/ban-private).
