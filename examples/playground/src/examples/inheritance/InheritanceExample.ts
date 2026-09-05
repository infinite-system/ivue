// InheritanceExample.ts — the route's ONE model. It hosts both product
// chains and forwards the refs the template binds, so one instance drives
// both panes and every label and action is named.
import { Reactive } from '../../ivue';
import type { Ref } from 'vue';
import { ComputedTaxedProduct } from './ComputedTaxedProduct';
import { TaxedProduct } from './TaxedProduct';

class $InheritanceExample {
  // HOSTED models — created on first touch, held for the life of the route
  protected get $product() {
    return new TaxedProduct.Class();
  }
  protected get $computedProduct() {
    return new ComputedTaxedProduct.Class();
  }

  /** The chains, exposed for the template's dotted reads. */
  get product() {
    return this.$product;
  }
  get computedProduct() {
    return this.$computedProduct;
  }

  // FORWARDED cells — the plain-getter chain's refs
  get price(): Ref<number> {
    return this.$product.price;
  }
  get discount(): Ref<number> {
    return this.$product.discount;
  }
  get taxRate(): Ref<number> {
    return this.$product.taxRate;
  }

  // FORWARDED cells — the computed chain's refs
  get computedPrice(): Ref<number> {
    return this.$computedProduct.price;
  }
  get computedDiscount(): Ref<number> {
    return this.$computedProduct.discount;
  }
  get computedTaxRate(): Ref<number> {
    return this.$computedProduct.taxRate;
  }

  // DERIVED — the labels, named
  get discountPercent() {
    return Math.round(this.discount.value * 100);
  }
  get taxRatePercent() {
    return Math.round(this.taxRate.value * 100);
  }
  get totalLabel() {
    return this.$product.total.toFixed(2);
  }
  get computedBaseTotalLabel() {
    return this.$computedProduct.baseTotal.toFixed(2);
  }
  get computedDiscountedTotalLabel() {
    return this.$computedProduct.discountedTotal.toFixed(2);
  }
  get computedTotalLabel() {
    return this.$computedProduct.total.value.toFixed(2);
  }

  // ACTIONS — one per button, on the chain they touch
  bumpPrice() {
    this.price.value += 6;
  }
  bumpDiscount() {
    this.discount.value = Math.min(this.discount.value + 0.05, 0.9);
  }
  toggleTax() {
    this.taxRate.value = this.taxRate.value ? 0 : 0.1;
  }
  bumpComputedPrice() {
    this.computedPrice.value += 6;
  }
  bumpComputedDiscount() {
    this.computedDiscount.value = Math.min(this.computedDiscount.value + 0.05, 0.9);
  }
  toggleComputedTax() {
    this.computedTaxRate.value = this.computedTaxRate.value ? 0 : 0.1;
  }
}

export namespace InheritanceExample {
  export const $Class = $InheritanceExample; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
