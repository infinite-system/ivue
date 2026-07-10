<script setup lang="ts">
import { computed, ref } from 'vue';
import { Reactive } from '../../../../lib/Reactive';
import DemoBox from './DemoBox.vue';

class $Base {
  get base() {
    return ref(10);
  }
  get tag() {
    return computed(() => `Base:${this.base.value}`);
  }
  // plain-getter chain: super works here too
  get name() {
    return 'Base';
  }
}
class $Mid extends $Base {
  get tag() {
    return computed(() => `Mid(${(super.tag as any).value})`);
  }
  get name() {
    return super.name + ' > Mid';
  }
}
class $Leaf extends $Mid {
  get extra() {
    return ref(5);
  }
  get tag() {
    return computed(() => `Leaf{${(super.tag as any).value}}`);
  }
  get name() {
    return super.name + ' > Leaf';
  }
  // plain getter across levels: reads a grandparent ref and an own ref
  get sum() {
    return this.base.value + this.extra.value;
  }
}
const Leaf = Reactive($Leaf);
const leaf: any = new Leaf();
// the state destructure
const { tag, base, extra } = leaf;
</script>

<template>
  <DemoBox
    title="Three levels, one instance"
    note="tag is a computed chain calling super.tag.value through every level. sum is a plain getter reading a grandparent ref. Mutate an ancestor and both stay correct."
  >
    <div class="d-mono chain">{{ tag }}</div>
    <div class="d-vals">
      <div>
        <div class="d-k">base &middot; grandparent ref</div>
        <div class="d-n">{{ base }}</div>
      </div>
      <div>
        <div class="d-k">extra &middot; own ref</div>
        <div class="d-n">{{ extra }}</div>
      </div>
      <div>
        <div class="d-k">sum &middot; plain getter</div>
        <div class="d-n grad">{{ leaf.sum }}</div>
      </div>
    </div>
    <div class="d-row">
      <button class="d-btn primary" type="button" @click="base += 10">base +10</button>
      <button class="d-btn" type="button" @click="extra += 5">extra +5</button>
      <span class="d-mono">{{ leaf.name }}</span>
    </div>
  </DemoBox>
</template>

<style scoped>
.chain {
  margin-bottom: 16px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.16);
  font-size: 13px !important;
  color: #7dd3fc !important;
}
</style>
