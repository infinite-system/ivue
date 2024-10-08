<script setup lang="ts">
import { ref } from 'vue';

import CounterBasic from '../components/usage/CounterBasic.vue'
import CounterWithProps from '../components/usage/CounterWithProps.vue'
import CounterWithPropsAndEmits from '../components/usage/CounterWithPropsAndEmits.vue'
import CounterDefineExpose from '../components/usage/CounterDefineExpose.vue'
import CounterDefineExposeClass from '../components/usage/CounterDefineExposeClass'
import CounterExternalRefs from '../components/usage/CounterExternalRefs.vue'
import CounterInternalRefs from '../components/usage/CounterInternalRefs.vue'
import CounterComposables from '../components/usage/CounterComposables.vue'
import CounterComposablesDestructuring from '../components/usage/CounterComposablesDestructuring.vue'
import CounterComposablesIvueDestructuring from '../components/usage/CounterComposablesIvueDestructuring.vue'
import CounterComposablesIvue from '../components/usage/CounterComposablesIvue.vue'
import CounterInsideComposables from '../components/usage/CounterInsideComposables.vue'
import CounterComputeds from '../components/usage/CounterComputeds.vue'
import CounterComputedsDisabled from '../components/usage/CounterComputedsDisabled.vue'
import CounterWatch from '../components/usage/CounterWatch.vue'
import CounterLifecycleHooks from '../components/usage/CounterLifecycleHooks.vue'

// <For CounterWithPropsAndEmits example start>
function onIncrement(value: number) {
  alert('Count is now: ' + value);
}
// </For CounterWithPropsAndEmits example end>

// <For CounterDefineExpose example start>
const defineExposeRef = ref<CounterDefineExposeClass | null>(null);

function increment() {
  defineExposeRef.value.increment();
}

function decrement() {
  defineExposeRef.value.decrement();
}
// </For CounterDefineExpose example end>

</script>

# Example Usage

Using ivue is very simple, but you need to understand a few principles. See the examples below expanding on each principle.

## Basic Usage

Classic Counter example built with `ivue`
::: code-group
<<< @/components/usage/CounterBasic.vue{vue:line-numbers}
:::

:::details For this example we initialize the component like this:

```vue
<template>
  <CounterBasic />
</template>
```

:::

<div style="font-size: 18px; font-weight: 500;">Result</div>

<CounterBasic />
::: warning NOTICE: JavaScript Class Caveat
 See `() => counter.increment()`. You cannot simply use `counter.increment` to refer to the method when it was defined as an object of a class, because that method would not know that it has to be bound to `counter`. You have to either use `() => counter.increment()` or `counter.increment.bind(counter)`, but the latter example is too verbose, so the preferred more readable way is to use an arrow function.
:::

## Using Props

See the highlighted sections related to props.
::: code-group
<<< @/components/usage/CounterWithProps.vue{vue:line-numbers}
:::

:::details For this example we initialize the component like this:

```vue
<template>
  <CounterWithProps :initial-count="5" />
</template>
```

:::

<div style="font-size: 18px; font-weight: 500;">Result</div>

<CounterWithProps :initial-count="5" />

## Using Emits

See the highlighted sections related to using emits.

::: code-group
<<< @/components/usage/CounterWithPropsAndEmits.vue{vue:line-numbers}
:::

:::details For this example we initialize the component like this:

```vue
<script setup lang="ts">
function onIncrement(value: number) {
  alert('Count is now: ' + value);
}
</script>
<template>
  <CounterWithPropsAndEmits :initial-count="5" @increment="onIncrement" />
</template>
```

:::

<div style="font-size: 18px; font-weight: 500;">Result</div>

<CounterWithPropsAndEmits :initial-count="5" @increment="onIncrement" />

## Using Refs

### Refs defined externally in the component outside of the class.

```ts twoslash
<!--@include: @/components/usage/CounterExternalRefs.vue{2,19}-->
```

::: code-group
<<< @/components/usage/CounterExternalRefs.vue{vue:line-numbers}
:::
:::details For this example we initialize the component like this:

```vue
<template>
  <CounterExternalRefs />
</template>
```

:::

<div style="font-size: 18px; font-weight: 500;">Result</div>

<CounterExternalRefs />

### Refs defined internally inside of the class.

::: code-group
<<< @/components/usage/CounterInternalRefs.vue{vue:line-numbers}
:::

:::details For this example we initialize the component like this:

```vue
<template>
  <CounterInternalRefs />
</template>
```

:::

<div style="font-size: 18px; font-weight: 500;">Result</div>

<CounterInternalRefs />

## Using Define Expose

### Use class as interface for `defineExpose()`
See the highlighted sections related to `defineExpose`.

::: code-group
<<< @/components/usage/CounterDefineExpose.vue{vue:line-numbers}
<<< @/components/usage/CounterDefineExposeClass.ts{ts:line-numbers}
:::

:::details For this example we initialize the component like this:

```vue
<script setup lang="ts">
const defineExposeRef = ref<CounterDefineExposeClass | null>(null);

function increment() {
  defineExposeRef.value.increment();
}

function decrement() {
  defineExposeRef.value.decrement();
}
</script>
<template>
  <button @click="increment">
    Increment via Component Ref from Parent Component</button
  ><br />
  <button @click="decrement">
    Decrement via Component Ref from Parent Component
  </button>
  <CounterDefineExpose />
</template>
```

:::

<div style="font-size: 18px; font-weight: 500;">Result</div>

<button class="button" @click="increment">Increment via Component Ref from Parent Component</button><br />
<button class="button" @click="decrement">Decrement via Component Ref from Parent Component</button>
<CounterDefineExpose ref="defineExposeRef" />

### Pick allowed interface properties for `defineExpose()`

::: code-group
<<< @/components/usage/CounterDefineExposeAdvanced.vue{vue:line-numbers}
:::

## Using Composables

### Assign Vue 3 Composable to a class property

See the highlighted sections related to composable usage.
::: code-group
<<< @/components/usage/CounterComposables.vue{vue:line-numbers}
:::

:::details For this example we initialize the component like this:

```vue
<template>
  <CounterComposables />
</template>
```

:::

<div style="font-size: 18px; font-weight: 500;">Result</div>

<CounterComposables />

### Destructure Vue 3 Composable into the class

See the highlighted sections related to destructuring composable usage.

::: code-group
<<< @/components/usage/CounterComposablesDestructuring.vue{vue:line-numbers}
<<< @/components/usage/functions/useCustomMouse.ts{ts:line-numbers} [functions/useCustomMouse.ts]
:::

:::details For this example we initialize the component like this:

```vue
<template>
  <CounterComposablesDestructuring />
</template>
```

:::

<div style="font-size: 18px; font-weight: 500;">Result</div>

<CounterComposablesDestructuring />


### Assign `ivue` Composables to a class property

Using `ivue` based composables assigned to a class property:

::: code-group
<<< @/components/usage/CounterComposablesIvue.vue{vue:line-numbers}
<<< @/components/usage/classes/CustomMouse.ts{ts:line-numbers} [classes/CustomMouse.ts]
:::

:::details For this example we initialize the component like this:

```vue
<template>
  <CounterComposablesIvue />
</template>
```

:::

<div style="font-size: 18px; font-weight: 500;">Result</div>

<CounterComposablesIvue />

### Destructure `ivue` Composables Into Class Scope

See the sections related to using `ivue` based composables initialized through class destructuring assignment.

::: code-group
<<< @/components/usage/CounterComposablesIvueDestructuring.vue{vue:line-numbers}
<<< @/components/usage/classes/CustomMouse.ts{ts:line-numbers} [classes/CustomMouse.ts]
:::

:::details For this example we initialize the component like this:

```vue
<template>
  <CounterComposablesIvueDestructuring />
</template>
```

:::

<div style="font-size: 18px; font-weight: 500;">Result</div>

<CounterComposablesIvueDestructuring />


## Using Inside Composables

See the highlighted sections related to using `ivue` inside a composable.

::: code-group
<<< @/components/usage/CounterInsideComposables.vue{vue:line-numbers}
:::

:::details For this example we initialize the component like this:

```vue
<template>
  <CounterInsideComposables />
</template>
```

:::

<div style="font-size: 18px; font-weight: 500;">Result</div>

<CounterInsideComposables />

## Using Computeds

### Getters are computeds in `ivue` unless disabled.<br />
See the highlighted sections related to getters.

::: code-group
<<< @/components/usage/CounterComputeds.vue{vue:line-numbers}
:::

:::details For this example we initialize the component like this:
```vue
<template>
  <CounterComputeds />
</template>
```
:::

<div style="font-size: 18px; font-weight: 500;">Result</div>
<CounterComputeds />

### Disable computed behavior for certain getters in `ivue`.<br />
You can disable computed getters via `static ivue = { getter: false }`, see below:

::: code-group
<<< @/components/usage/CounterComputedsDisabled.vue{vue:line-numbers}
:::

The result of this example is identical to the above.



## Using Watch

To use `watch`, `watchEffect`, and other reactive functions, declare `.init()` method in the class.
See the highlighted sections related to using `init()` below:

::: code-group
<<< @/components/usage/CounterWatch.vue{vue:line-numbers}
:::

:::details For this example we initialize the component like this:

```vue
<template>
  <CounterWatch />
</template>
```

:::

<div style="font-size: 18px; font-weight: 500;">Result</div>

<CounterWatch />



## Using Lifecycle Hooks

To use `onMounted`, `onBeforeMount` and other lifecycle hooks, declare `.init()` method in the class.
See the highlighted sections related to using `init()` below:

::: tip NOTICE:
`init()` method can be declared as `async` if needed.
:::

::: code-group
<<< @/components/usage/CounterLifecycleHooks.vue{vue:line-numbers}
:::

:::details For this example we initialize the component like this:

```vue
<template>
  <CounterLifecycleHooks />
</template>
```
:::

<div style="font-size: 18px; font-weight: 500;">Result</div>
<CounterLifecycleHooks />