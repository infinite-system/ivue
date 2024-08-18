<script setup lang="ts">
</script>

# API

## Core Functions

### ivue()

---

```ts
export function ivue<T extends AnyClass>(
  className: T,
  ...args: InferredArgs<T>
): IVue<T>;
```

Core `ivue(className, ...args)` initializer is able to infer and validate the constrcutor argument types of AnyClass and passes those arguments to the constructor of `AnyClass` internally.

`ivue(className, arg1, arg2, arg3...)` allows you to pass any number of arguments into the class `constructor(arg1, arg2, arg3...)`

`ivue()` initializer function returns an extended Vue 3 `reactive()` object in which getters and setters are internally converted to computeds and adds `.toRefs()` method to the created object. Computeds auto-unwrap themselves when they are accessed as a reactive object property, so the `.value` properties and computeds get flattened in the resulting object and do not require `.value` to be accessed.

`ivue()` replicates native JavaScript / TypeScript class implementation by extending descriptors (getters and setters) up the whole prototype chain thus supporting classical inheritance.

**Returns:** `<IVue<T>>` or `ivue` `reactive()` object of an `AnyClass` class with flattened (de-Refed) `Refs` and `ComputedRefs` as properties.

### iref()

Create a regular `vue` Ref but cast the type to the internal unreactive type, because properties auto-unwrap in `reactive()` object that is being created by `ivue` upon initialization.

### iuse()

This function unwraps the type of any composable return to the bare values without `.value`, because properties auto-unwrap in `reactive()` object that is being created by `ivue` upon initialization.

### .init()

---

`.init()` method is auto-run on `ivue()` initialization after `constructor()` is run.
`init()` has access to the reactive state of the object via `this`.

:::warning NOTICE
`.init()` method has no arguments and you should never need to run this method manually.
:::

:::tip NEED ASYNC/AWAIT?
Use `async init()` if you need `await` functionality.
:::

**Returns:** `void | Promise<void>`

### .toRefs()

---

```ts
function toRefs(props?: (keyof InstanceType<T>)[]): IVueRefs<InstanceType<T>>;
```

Converts an `ivue` object to a Vue 3 Composable with nested refs.

:::tip You can pass the name of the properties to `toRefs(properties)`
```ts
const { width, height } = ivue(Box).toRefs(['width', 'height']);
```
This improves performance if `box` has many other properties that we do not need.
:::

**Returns:** `IVueRefs<InstanceType<T>>`

## Utility Functions

### propsWithDefaults()

---

```ts
export function propsWithDefaults<T extends VuePropsObject>(
  defaults: Record<string, any>,
  typedProps: T
): VuePropsWithDefaults<T>;
```

Combines statically written defaults object with the runtime type definition of Vue 3 props.

**Returns:** `VuePropsWithDefaults<T>`

## Utility Types

### ExtractPropDefaultTypes

Extracts types of the default types definition. This type can be used to validate against the actual defaults definition to make sure both definitions are in sync.

---

### ExtractEmitTypes

---

Extracts types of a runtime emits declaration.

### ExtendSlots

---

Allows you to extend slots of a given slot interface.

### UseComposable

---

Extracts and unwraps (de-Refs) the real types of Vue 3 composable definition to make it compatible with `ivue`.
