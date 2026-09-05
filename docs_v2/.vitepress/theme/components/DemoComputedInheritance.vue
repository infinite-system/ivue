<script setup lang="ts">
import { InheritanceExample } from '@examples/inheritance/InheritanceExample';
import DemoBox from './DemoBox.vue';

const example = new InheritanceExample.Class();
</script>

<template>
  <DemoBox
    title="Three levels, three cached cells, one instance"
    note="Every class declares a computed named total. The child reads super.total.value, so the base, discounted and taxed cells coexist without colliding."
  >
    <div class="d-vals d-vals-3col">
      <div>
        <div class="d-k">Product.total</div>
        <div class="d-n">${{ example.computedBaseTotalLabel }}</div>
      </div>
      <div>
        <div class="d-k">SaleProduct.total</div>
        <div class="d-n">${{ example.computedDiscountedTotalLabel }}</div>
      </div>
      <div>
        <div class="d-k">TaxedProduct.total</div>
        <div class="d-n grad">${{ example.computedTotalLabel }}</div>
      </div>
    </div>
    <div class="d-row">
      <button class="d-btn primary" type="button" @click="example.bumpComputedPrice()">
        price +$6
      </button>
      <button class="d-btn" type="button" @click="example.bumpComputedDiscount()">
        deeper sale
      </button>
      <button class="d-btn" type="button" @click="example.toggleComputedTax()">
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
