<script setup lang="ts">
import DemoBox from './DemoBox.vue';
import { InheritanceExample } from '@examples/inheritance/InheritanceExample';

const example = new InheritanceExample.Class();

// the state destructure
const {
  // forwarded cells — the plain-getter chain
  price,
} = example;
</script>

<template>
  <DemoBox
    title="Three files, three levels, one instance"
    note="total is a plain-getter chain — each level refines super.total, zero computeds allocated. Every receipt() line is written by a different class in the chain. Write to any level's ref and everything re-derives."
  >
    <div class="receipt d-mono">
      <div v-for="(line, index) in example.receiptLines" :key="index">
        {{ line }}
      </div>
    </div>
    <div class="d-vals d-vals-2col">
      <div>
        <div class="d-k">price &middot; Product</div>
        <div class="d-n">${{ price }}</div>
      </div>
      <div>
        <div class="d-k">discount &middot; SaleProduct</div>
        <div class="d-n">{{ example.discountPercent }}%</div>
      </div>
      <div>
        <div class="d-k">tax &middot; TaxedProduct</div>
        <div class="d-n">{{ example.taxRatePercent }}%</div>
      </div>
      <div>
        <div class="d-k">total &middot; plain getter</div>
        <div class="d-n grad">${{ example.totalLabel }}</div>
      </div>
    </div>
    <div class="d-row">
      <button class="d-btn primary" type="button" @click="example.bumpPrice()">
        price +$6
      </button>
      <button class="d-btn" type="button" @click="example.bumpDiscount()">
        deeper sale
      </button>
      <button class="d-btn" type="button" @click="example.toggleTax()">
        toggle tax
      </button>
    </div>
  </DemoBox>
</template>

<style scoped>
.dbx .d-vals.d-vals-2col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.d-vals .d-k {
  white-space: nowrap;
}
.receipt {
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 10px;
  background: color-mix(in srgb, currentColor 4%, transparent);
  border: 1px solid rgba(148, 163, 184, 0.16);
  font-size: 13px !important;
  color: #7dd3fc !important;
  line-height: 1.7;
}
.receipt div:last-child {
  color: #34d399;
  font-weight: 700;
}
</style>
