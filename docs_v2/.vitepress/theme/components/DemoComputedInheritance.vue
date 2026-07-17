<script setup lang="ts">
import { ComputedTaxedProduct } from '@examples/inheritance/ComputedTaxedProduct';
import DemoBox from './DemoBox.vue';

const product = new ComputedTaxedProduct.Class();
const { price, discount, taxRate, total } = product;
</script>

<template>
  <DemoBox
    title="Three levels, three cached cells, one instance"
    note="Every class declares a computed named total. The child reads super.total.value, so the base, discounted and taxed cells coexist without colliding."
  >
    <div class="d-vals d-vals-3col">
      <div>
        <div class="d-k">Product.total</div>
        <div class="d-n">${{ product.baseTotal.toFixed(2) }}</div>
      </div>
      <div>
        <div class="d-k">SaleProduct.total</div>
        <div class="d-n">${{ product.discountedTotal.toFixed(2) }}</div>
      </div>
      <div>
        <div class="d-k">TaxedProduct.total</div>
        <div class="d-n grad">${{ total.toFixed(2) }}</div>
      </div>
    </div>
    <div class="d-row">
      <button class="d-btn primary" type="button" @click="price += 6">
        price +$6
      </button>
      <button
        class="d-btn"
        type="button"
        @click="discount = Math.min(discount + 0.05, 0.9)"
      >
        deeper sale
      </button>
      <button class="d-btn" type="button" @click="taxRate = taxRate ? 0 : 0.1">
        toggle tax
      </button>
    </div>
  </DemoBox>
</template>

<style scoped>
.dbx .d-vals.d-vals-3col {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.d-vals .d-k {
  white-space: nowrap;
}
@media (max-width: 640px) {
  .dbx .d-vals.d-vals-3col {
    grid-template-columns: 1fr;
  }
}
</style>
