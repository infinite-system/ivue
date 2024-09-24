<script setup lang="ts">
import { QIcon } from 'quasar';
import Infin from './components/Infin.vue';
import Button from './components/Button.vue'
</script>

<div style="padding:0px 0 30px 0;"><img src="/ivue-logo.png" width="135" /></div>

# <span style="font-family: 'Public Sans'; "><strong>Infinite Vue — Documentation</strong></span>

## About

**<span style="font-family: 'Public Sans'; font-size: 125%;">Infinite Vue ∞ ivue</span>** is a class based reactivity architecture for Vue 3. It unlocks infinite scalability for Vue 3 apps, by allowing us to use Vue 3 reactivity system with native classes. 

**ivue** abstracts away *.value* for a succinct reactive class API, identical to the native JavaScript / TypeScript Class API. ivue allows observable reactive programming using classes supporting full inheritance, encapsulation and polymorphism, while converting the class object to a reactive object.

Under the hood all the class properties are converted to *reactive Refs* and all the getters of the class are converted to *computeds*, making declaration of computeds very simple in ivue.

This allows for creation of very advanced reactive systems because now you can operate in pure JavaScript / TypeScript, decreasing the mental load by not needing to use *.value* and focus on the business logic instead.

## Features
<div style="padding-left: 5px; font-size: 17px; line-height: 28px; " class="q-gutter-y-sm">
  <div class="row">
    <Infin class="" /><div class="col">Extensible Classes using JavaScript / TypeScript native Class API</div>
  </div>
  <div class="row">
    <Infin /><div class="col">Can be used as a Global Store and a ViewModel for Components</div>
  </div>
  <div class="row">
    <Infin /><div class="col">Improves DX by elegantly dealing with <i>.value</i></div>
  </div>
  <div class="row">
    <Infin /><div class="col">Extends Vue 3 TypeScript Capability</div>
  </div>
  <div class="row">
    <Infin /><div class="col">Enhances Extensibility of Props Defaults, Props, Slots</div>
  </div>
  <div class="row">
    <Infin /><div class="col">Allows for Fully Extensible Component Architecture</div>
  </div>
</div>

## Philosophy
<div style="text-align:center; line-height: 30px;">
  Perfection is achieved, not when there is nothing more to add, <br />
  but when there is nothing left to take away.  
  <div style="padding-top: 5px; color:#888; font-size: 90%;">― Antoine de Saint-Exupéry</div>
</div>

## Next Step

<Button href="/pages/getting-started.html" label="Geting Started" />  &nbsp; or &nbsp; <Button href="/pages/introduction.html" label="Read Introduction" />

