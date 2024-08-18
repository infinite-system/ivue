
# How it's made

## Original Inspiration

The original inspiration for `ivue` comes from `MobX` React state management library, where something similar is attempted to create a class based reactive observable architecture.

##  Epiphany

After building several ports from `MobX` state management library to `VueJS` to reactivity system I realized that Vue itself is far superior in its design and perfomance and can solve the same problem without relying on second hand-library, but for that my evolution of understanding of how JavaScript getters and setters work needed to happen. 

And one lucky and sunny day driving back from work in an eureka moment of light it occured to me how to use Vue 3 computeds in place of getters in classes (Yes, apparently my brain does coding while driving a car).

`ivue` relies on this very simple discovery of how to elegantly convert getters into Vue 3 computeds.

## Simplicity

After many iterations where I created a whole inversion of control library for `ivue`, using lots of different decorators and event Traits, I realized that simplicity is paramount to good architecture.

In that sweep of clarity, I got rid of 95% of the code that was just extra stuff and not the essence and left only `3` core functions: `ivue()`, `.init()`, `.toRefs()` only which are necessary to do everything `ivue` is set out to do.

Use Composition API composables inside `init()` function.

## Minimalism

Thus `ivue` has minimal surface area of the API making it very robust and easy to test.
By default `ivue` does not rely on decorators, though you can use decorators if you wish to.

## The Rest is Up To You
`ivue` is like a small mustard seed core for the big tree trunk of Class Based Reactive applications to be built around it, that's why the path of utter simplicity was chosen.
Everything else like an Inversion of Control (IOC) system, Traits, Mixins, Decorators can be built around the core `ivue` architecture and is upto the community of enthusiatic open source contributors, please share with us your vision of how you and all of can use `ivue` better.

