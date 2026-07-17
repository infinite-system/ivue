import { describe, expect, it } from 'vitest';
import { ComputedTaxedProduct } from '../ComputedTaxedProduct';

describe('computed inheritance example', () => {
  it('keeps one stable computed cell per prototype level', () => {
    const product = new ComputedTaxedProduct.Class();
    const baseTotal = product.baseTotalCell();
    const discountedTotal = product.discountedTotalCell();
    const taxedTotal = product.total;

    expect(new Set([baseTotal, discountedTotal, taxedTotal]).size).toBe(3);
    expect(product.baseTotalCell()).toBe(baseTotal);
    expect(product.discountedTotalCell()).toBe(discountedTotal);
    expect(product.total).toBe(taxedTotal);
    expect(baseTotal.value).toBe(48);
    expect(discountedTotal.value).toBeCloseTo(38.4);
    expect(taxedTotal.value).toBeCloseTo(42.24);

    product.price.value = 60;
    expect(baseTotal.value).toBe(60);
    expect(discountedTotal.value).toBeCloseTo(48);
    expect(taxedTotal.value).toBeCloseTo(52.8);

    product.discount.value = 0.5;
    expect(baseTotal.value).toBe(60);
    expect(discountedTotal.value).toBeCloseTo(30);
    expect(taxedTotal.value).toBeCloseTo(33);
  });
});
