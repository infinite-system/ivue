# ivue@2.2.2

Skill release — the engine is byte-identical to 2.2.1; this ships the
current Standard Operating Manual to `npx ivue skill`, which installs the
copy bundled with the package.

## The Standard, extended in production

The manual grew 779 → 845 lines with conventions earned in the field
(building [Invar](https://ivue.dev/examples/invar), the 94k-line terminal
IDE on ivue):

- **Reading your own statics — the ladder.** A getter that reaches statics
  through a namespace's `Class` slot hard-binds to the base class and
  silently ignores subclass overrides (measured: a subclass setting `0.1`
  still read `0.4`). The three-rung ladder: delete the static if nothing
  outside reads it → read live off the receiver with
  `(this.constructor as typeof $X).MEMBER` → or name the class directly
  when overriding must not happen.
- **Constants get roles.** The old "plain fields for constants" guidance is
  replaced by a role table: tunable class constants are
  `static get SCREAMING_SNAKE_CASE()` (overridable, receiver-followed),
  hot-path byte constants are `static readonly`, identity data is an
  instance `readonly` field, constructed dependencies come from `createX()`
  factory methods — anything else is a defect.
- **Member ordering.** One order everywhere: static members → constructor →
  state getters → prop getters → derived getters → methods.
- **Construction-order note.** Getter and prototype-method overrides
  dispatch while a parent constructor runs; subclass field initializers do
  not — which is what makes getters safe tunables and `createX()` safe
  construction seams.
- The class template now shows the `Static($X)` anchor form and a
  receiver-following static read in place.

## Also in the box

- Additional `Static()` test coverage (anchor shape, composition,
  binding-order cases). Engine coverage stays 100%.
- Build tooling: `vite-plugin-dts` loads only for library builds, never
  under vitest (fixes fresh-install CI where current api-extractor releases
  break under the pinned plugin).

**Upgrade:** `npm i ivue@2.2.2`, then re-run `npx ivue skill` (or
`npx ivue skill --all`) to refresh the installed manual.
