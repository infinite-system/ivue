<script setup lang="ts">
import { TaxedProduct } from './TaxedProduct';

const product = new TaxedProduct.Class();

// the state destructure
const {
  // state refs
  price,
  discount,
  taxRate,
} = product;
</script>

<template>
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
        <div class="n">{{ Math.round(discount * 100) }}%</div>
      </div>
      <div>
        <div class="k">tax · TaxedProduct</div>
        <div class="n">{{ Math.round(taxRate * 100) }}%</div>
      </div>
      <div>
        <div class="k">total · plain getter</div>
        <div class="n grad">${{ product.total.toFixed(2) }}</div>
      </div>
    </div>
    <div class="row">
      <button class="btn primary" type="button" @click="price += 6">
        price +$6
      </button>
      <button
        class="btn"
        type="button"
        @click="discount = Math.min(discount + 0.05, 0.9)"
      >
        deeper sale
      </button>
      <button class="btn" type="button" @click="taxRate = taxRate ? 0 : 0.1">
        toggle tax
      </button>
    </div>
  </div>
</template>

<style scoped src="../example-pane.css"></style>
