---
title: "One kilobyte is a feature"
description: 1.1 kB is not a compression achievement — it is what remains when a design stops needing machinery. Small enough to read, small enough to trust.
date: 2026-07
---

# One kilobyte is a feature

<BlogPostDate />

![One kilobyte is a feature](/blog/one-kilobyte-feature.png)

The whole ivue engine — lazy state, method binding, reactive inheritance
with `super`, teardown, and `$watch` — ships as **1,120 bytes gzipped**.
Zero dependencies. 100% test coverage, every metric, every file.

That number is not a compression trophy. It's a *diagnosis*. Size is what
a design weighs after you stop paying for machinery it never needed:

- No proxy per instance — instances are plain objects, so there is no
  proxy code.
- No eager anything — state materializes on first access, so there is no
  scheduler for work that never happens.
- No compiler — the transform is a one-time prototype rewrite at runtime,
  so there is no build-step apparatus riding along.
- No second development engine — local work exercises the same class identity,
  native construction, and direct method binding as production.

## The kilobyte, feature by feature

Every capability in that opening sentence is code you can point to. Here
is one small telemetry domain exercising all of them — lazy state,
derived values, method binding, inheritance with `super`, an outliving
singleton with `$watch` and teardown, and the component wiring:

::: code-group

```ts [src/telemetry/Sensor.ts]
import { Reactive } from 'ivue';
import { ref } from 'vue';

class $Sensor {
  // MUTABLE STATE — a ref-getter. Nothing allocates at `new`; the Ref
  // materializes on FIRST ACCESS and is cached per instance from then on.
  get reading() {
    return ref(0);
  }

  // DERIVED — a plain getter. Zero bytes per instance, fully reactive
  // through leaf tracking. No computed() unless the work is expensive.
  get isCritical() {
    return this.reading.value > this.threshold;
  }

  // CONSTANT — plain field. Never mutable state.
  threshold = 100;

  // METHOD — engine-bound once, on the prototype. Stable identity: safe
  // to pass as an event handler, compare, or unbind.
  record(value: number) {
    this.reading.value = value;
  }
}

export namespace Sensor {
  export const $Class = $Sensor; // raw — children `extends` this
  export const Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
```

```ts [src/telemetry/PressureSensor.ts]
import { Reactive } from 'ivue';
import { Sensor } from './Sensor';

// Native inheritance — extend the RAW class, keep `super`, stay reactive.
// The engine transforms each prototype level exactly once.
class $PressureSensor extends Sensor.$Class {
  record(value: number) {
    // clamp physically impossible spikes, then delegate up
    super.record(Math.min(value, this.threshold * 2));
  }
}

export namespace PressureSensor {
  export const $Class = $PressureSensor;
  export const Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
```

```ts [src/telemetry/telemetry.ts]
import { Reactive } from 'ivue';
import { PressureSensor } from './PressureSensor';

// A module singleton OUTLIVES every component — so its watcher lives in
// the instance's own lazy effect scope, not in any component's.
class $Telemetry {
  sensor = new PressureSensor.Class();

  constructor() {
    this.$watch(
      () => this.sensor.isCritical,
      (isCritical: boolean) => this.onCriticalChange(isCritical),
    );
  }

  // $stopEffects() calls this hook first — non-Vue cleanup goes here.
  stopEffects() {
    this.disconnect();
  }

  onCriticalChange(isCritical: boolean) {
    /* page the operator */
  }

  disconnect() {
    /* close the feed */
  }
}

export namespace Telemetry {
  export const $Class = $Telemetry;
  export const Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}

export const telemetry = new Telemetry.Class();
// whoever owns the lifetime disposes it: telemetry.$stopEffects()
```

```vue [src/components/SensorPanel.vue]
<script setup lang="ts">
import { PressureSensor } from '../telemetry/PressureSensor';

// ONE raw instance — no reactive() wrapper, no unwrap view.
const sensor = new PressureSensor.Class();

// Each destructured binding IS the cached Ref — stable identity,
// compiler-unwrapped in every template position.
const { reading } = sensor;
</script>

<template>
  <p :class="{ critical: sensor.isCritical }">{{ reading }} kPa</p>
  <button @click="sensor.record(reading + 5)">pulse</button>
</template>
```

:::

Four files, the whole feature list, and nothing imported but `Reactive`
and `ref`. The engine behind every line of it — the prototype transform,
the per-instance cell cache, the binding, the scopes — is the 1,120
bytes.

What a kilobyte buys you in practice is **auditability**. You can read
the entire engine before lunch and know — not trust, *know* — what
happens on every property access of every instance you create. When
something surprises you, the surface area of possible causes fits in one
file.

Zero dependencies extends the same property down the supply chain: there
is no transitive tree to audit, no lockfile churn, no upgrade that breaks
you from three levels below. The engine you read today is the engine that
runs next year. And the runtime consequences fall out of the same
subtraction:

<CreationBench />

That's a real three-level class hierarchy hosting a composable —
instantiated 100,000 times in a few milliseconds, because creating an
ivue instance is a plain `new` that allocates one object and nothing
else.

> Perfection is achieved, not when there is nothing more to add, but when
> there is nothing left to take away.

The subtraction is the product. [Fundamental Principles](/guide/principles) lists
what survived it.
