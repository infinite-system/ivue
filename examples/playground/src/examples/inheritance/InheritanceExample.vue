<script setup lang="ts">
import { InheritanceExample } from './InheritanceExample';

// ONE model owns the route; it hosts both chains and forwards their cells.
const example = new InheritanceExample.Class();
const product = example.product;
const computedProduct = example.computedProduct;

// the state destructure — both chains' refs, forwarded through the example
const {
  // state refs
  price,
  discount,
  taxRate,
  computedPrice,
  computedDiscount,
  computedTaxRate,
} = example;
</script>

<template>
  <div class="inheritance-stack">
    <div class="pane">
      <p class="note">
        total is a plain-getter chain — each level refines super.total, zero
        computeds allocated. Every receipt() line is written by a different
        class in the chain. Write to any level's ref and everything re-derives.
      </p>
      <div class="receipt">
        <div v-for="(line, index) in product.receipt()" :key="index">
          {{ line }}
        </div>
      </div>
      <div class="vals">
        <div>
          <div class="k">price · Product</div>
          <div class="n">${{ price }}</div>
        </div>
        <div>
          <div class="k">discount · SaleProduct</div>
          <div class="n">{{ example.discountPercent }}%</div>
        </div>
        <div>
          <div class="k">tax · TaxedProduct</div>
          <div class="n">{{ example.taxRatePercent }}%</div>
        </div>
        <div>
          <div class="k">total · plain getter</div>
          <div class="n grad">${{ example.totalLabel }}</div>
        </div>
      </div>
      <div class="row">
        <button class="btn primary" type="button" @click="example.bumpPrice()">
          price +$6
        </button>
        <button
          class="btn"
          type="button"
          @click="example.bumpDiscount()"
        >
          deeper sale
        </button>
        <button class="btn" type="button" @click="example.toggleTax()">
          toggle tax
        </button>
      </div>
    </div>

    <div class="pane">
      <p class="note">
        Every level now declares a computed named total. The child reads
        super.total.value, so all three cached cells coexist on the same
        instance instead of overwriting one another.
      </p>
      <div class="vals computed-vals">
        <div>
          <div class="k">Product.total</div>
          <div class="n">${{ example.computedBaseTotalLabel }}</div>
        </div>
        <div>
          <div class="k">SaleProduct.total</div>
          <div class="n">${{ example.computedDiscountedTotalLabel }}</div>
        </div>
        <div>
          <div class="k">TaxedProduct.total</div>
          <div class="n grad">${{ example.computedTotalLabel }}</div>
        </div>
      </div>
      <div class="row">
        <button class="btn primary" type="button" @click="example.bumpComputedPrice()">
          price +$6
        </button>
        <button
          class="btn"
          type="button"
          @click="example.bumpComputedDiscount()"
        >
          deeper sale
        </button>
        <button
          class="btn"
          type="button"
          @click="example.toggleComputedTax()"
        >
          toggle tax
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped src="../example-pane.css"></style>

<style scoped>
.inheritance-stack {
  display: grid;
  gap: 22px;
}
.computed-vals {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
@media (max-width: 620px) {
  .computed-vals {
    grid-template-columns: 1fr;
  }
}
</style>
