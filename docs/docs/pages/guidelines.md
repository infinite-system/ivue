<script setup lang="ts">
import { ref } from 'vue';
import { QBtn } from 'quasar';
import CounterExternalRefsDetailed from '@/components/guidelines/CounterExternalRefsDetailed.vue';
import BlMediaField from '@/components/field/BlMediaField.vue';
import BlChooseField from '@/components/field/BlChooseField.vue';
import BlChooseContactField from '@/components/field/BlChooseContactField.vue';

const media = ref(null);
const choose = ref(null);
const chooseContact = ref({
  first_name: 'Gabe',
  last_name: 'Choi',
  email: 'gabecreates@gmail.com',
  project_contact_type: 'Project Lead'
});
</script>

# Guidelines

## Dos and Don'ts

```ts twoslash
<!--@include: ./test.ts-->
// ttest
```

### Use ref() for properties

`ivue` recommends all class properties to be defined as `ref()` to be able to interoperate with `defineExpose()`, if you simply pass reactive props which are not Refs through `defineExpose()`, they will lose reactivity. `ref()` refs just like computed refs get flattened into the `reactive()` object, so there is no need to worry about using `.value`. The `ref()` refs are necessary just internally for Vue 3 to know which refs to keep reactive.

### Unwrap (de-Ref) the types

Next, we convert the types back to their normal types as if they have no reactivity at all, so `Ref<number>` is `number` in `ivue`, so rather than going in the direction of complexifying the types, we are going in the opposite direction towards simplification.

### Use standard declaration syntax for functions

`ivue` recommends all class functions to be defined in plain full function style (not arrow functions), this allows all `ivue` classes to be extensible at any point. By using plain standard functions, it allows the developer to be able to override them at any time by simply extending the class.

### Do not use arrow functions in class declarations

:::warning
Arrow functions break full extensibility of classes because they carry their own context at the point of declaration, so avoid using them inside of `ivue` classes.
:::

## `constructor()` vs `.init()`

 Use `constructor()` to assign properties of the class and cast Refs to Unwrapped bare types. <br />

Use `.init()` to declare reactive state functions like `watch`, `watchEffect`, and lifecycle hooks like `onMounted`, `onBeforeMount` etc, do assignments of reactive properties, since `.init()` already has access to `reactive()` state through `this`.<br />

<hr />

Inside the `constructor()` method you still have access to non-reactive state, because when `constructor()` is initialized, it does NOT yet have access to the reactive properties of the class, since it was not yet converted to `reactive()` by `ivue`, so if you use the properties like Refs or ComputedRefs inside `constructor()` you would have to use them with the `.value`.

As a general rule, there is no need to manipulate the values in the `constructor()`, use constructor only for assigning the properties and casting the types of those assigned properties to the unwrapped (de-Refed) final state of the resulting `reactive()` object.

**Let's look at a `constructor()` vs `.init()` example:**

::: code-group
<<< @/components/guidelines/CounterExternalRefsDetailed.vue{vue:line-numbers}
:::
:::details For this example we initialize the component like this:

```vue
<template>
  <CounterExternalRefsDetailed />
</template>
```

:::

<div style="font-size: 18px; font-weight: 500;">Result</div>

<CounterExternalRefsDetailed />

## Unwrapping Refs

The key to working with `ivue` is understanding correctly the way Vue 3 does automatic Unwrapping of Refs when they are passed into the `reactive()` object. In that regard we are not relying on some magic `ivue` behavior but rather the default behavior of `reactive()` Vue 3 function.

To match that unwrapping behavior, our class needs to Unwrap (or de-Ref) the types of Composables, Refs, ComputedRefs, if they are being passed into the constructor, to get their raw basic types those Refs are pointing to, so that you can start operating in the `ivue` environment, where there is no need to worry about `.value`. This unwrapping should be mainly done inside the `constructor()` method.

## Naming Conventions

To benefit from the full power of `ivue`, it is recommended to extract the classes into separate files. What has been an effective pattern is to name the classes and put them right beside components in the same folder that these classes are being used with. So if you have `CounterComponent.vue` component, it can have a class inside `CounterComponentClass.ts`, and you can store props, emits, and other runtime definitions inside `CounterComponentProps.ts`.

<q-btn>Test</q-btn>

<br />
<br />

<BlChooseField 
  v-model="choose"
  filled 
  color="black" 
  outlined 
  label="Select Option" 
  :options="['Option 1', 'Option 2', 'Option 3']" />

<br />

<BlChooseContactField 
  v-model="chooseContact"
  filled 
  color="black" 
  create-entity 
  :hide-dropdown-icon="false" 
  outlined label="Select Contact" 
  :options="[{
  first_name: 'Evgeny',
  last_name: 'Kalashnikov',
  email: 'ekalashnikov@gmail.com',
  project_contact_type: 'Lead Developer'
}, {
  first_name: 'Gabe',
  last_name: 'Choi',
  email: 'gabecreates@gmail.com',
  project_contact_type: 'Project Lead'
}]" />

<br />
<BlMediaField filled color="black" outlined label="File Uploader" multiple v-model="media" />
