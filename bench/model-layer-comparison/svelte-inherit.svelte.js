export class Base {
  a = $state(1);
  total = $derived(this.a + 10);
}
export class Sub extends Base {
  b = $state(2);
  total = $derived(super.total + this.b + 100);
}
