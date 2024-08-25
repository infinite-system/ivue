<script setup lang="ts">
import Button from '../components/Button.vue'
</script>
# What is <span style="font-family: 'Public Sans'; ">ivue ∞ Infinite Vue</span>?

## The Problem

With the development of React hooks and Vue following in its footsteps with introduction of Vue 3 Composition API, the ecosystem has moved away from Options API. 

While providing greater flexibility and composability the Composition API has its own downsides, one of them is having to use `.value` to refer to the reactive variables which makes the development process more clunky when the App reaches a certain size. 

As you may know, `reactvity-transform` macros were an attempt to mitigate those issues, which turned out to create even more issues, and was discontinued. 

See: [VueJs.org &ndash; Reactivity Transform](https://vuejs.org/guide/extras/reactivity-transform.html)

## `ivue` is
<div style="padding-left:20px; font-size: 1.2rem; line-height: 2rem;">
&ndash;&nbsp; Simple like Options API<br />
&ndash;&nbsp; Flexible like Composition API<br />
&ndash;&nbsp; Extensible like TypeScript Class API<br />
&ndash;&nbsp; Robust, Minimal, Opaque & Unobtrusive<br />
&ndash;&nbsp; 100% Vue 3 Compatible<br />
&ndash;&nbsp; 100% Test Covered<br />
&ndash;&nbsp; 100% Type Safe<br />
&ndash;&nbsp; Production Ready<br />
&ndash;&nbsp; Just <code>1.1kb</code> gzipped!<br />
&ndash;&nbsp; 100% VSCode / Intellij IDE Auto-complete Intellisence<br />
</div>

`ivue` is a powerful tool because it fully aligns itself with JavaScript / TypeScript Class API.

`ivue` gives you a class based Composable capabilities with Inheritance and all the power of TypeScript Classes.

`ivue` mitigates the downsides of both Composition API and Options API, uses only their strengths and brings back Object Oriented Programming to allow the development of complex and scalable apps.

`ivue` is fully interoperable with Composition API and does not work against, but rather with it, so you can use all of ecosystems composables seamlessly.

`ivue` also offers a set of functions and utility types to make extensible & exportable props defaults, extensible emits, extensible slots, etc. and much more possible.

`ivue` aims to be opaque, by giving the developer the Class API reactivity system.

`ivue` omits custom implementations of IOC Container, Decorators, Mixins, etc. by design.

`ivue` enforces a sane default standard of operation to contain the ever flexible Class API.

`ivue` uses Powerful Cutting Edge TypeScript to transform Vue 3 Refs to their base types, infer Class constructor arguments, infer Composable return types and function arguments and much more, making Object Oriented DX Experience with Vue 3 a breeze.

## OOP and TypeScript Class API in the Ecosystem

With failed implementations of classes in React and also failed implementations using class components in Vue 2 / 3, the ecosystem decided that classes are bad and moved to pure procedural designs. 

While procedural programming has its strength, it also comes with its own weaknesses, like lack of inheritance, lack of `this` context, and thus lack of true composition.

## `ivue` is different

&mdash; &nbsp;`ivue` does NOT inherit from a base Class.<br />
&mdash; &nbsp;`ivue` does NOT use Decorators to achieve its objectives.<br />
&mdash; &nbsp;`ivue` does NOT alter Vue 3 underlying behavior, but rather relies on it.<br />
&mdash; &nbsp;`ivue` is NOT Class Components (though you can build components with it).<br />


::: tip IVUE IMPLEMENTS MINIMAL API ARCHITECTURE
Things like IOC Container, Decorators, Traits, Mixins, etc. were omitted by design to slim down the surface area and scope of `ivue` core purpose, which was JavaScript / TypeScript Class API based reactivity. Any Traits, Decorators & IOC Container can be built around it using third-party libraries or roll your own systems. You are more than welcome to contribute in this area!
:::



## Infinite Vue Class Architecture

`ivue` replicates native JavaScript / TypeScript class implementation by extending descriptors (getters and setters) up the whole prototype ancestors chain thus supporting classical inheritance.

By using TypeScript we are able to infer the arguments of the main `ivue()` initializer function and pass the arguments to the constructor.

`ivue()` initializer function returns a reactive object with getters converted to computeds and adds `.toRefs()` method to the object, `.toRefs()` allows the object to be converted to native composable structure, so it can interoperate as a composable if needed.

`ivue` aims to be opaque and minimal, just doing the minimum to convert a class to a reactive object, leaving the rest to be implemented using Vue 3 Composition API inside an initializer function called `.init()` 

You can read more about `ivue` internal architecture in <Button href="/pages/how-it-works" label="How it works?" /> page.

## When to use Infinite Vue?

When the complexity of your app or components becomes very high using `ivue` can become a natural choice to deal with that complexity. Because `.value` is abstracted away in `ivue`, everything is simply a reactive object of Refs.

