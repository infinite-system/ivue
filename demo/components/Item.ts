import { defaultEntityFields } from './bigObject';

class Parent {
  value = 42;
  get area() {
    return 320;
  }
}

export class Item extends Parent {
  id: number;
  width = Math.random() * 100;
  height = Math.random() * 100;
  width2 = Math.random() * 100;
  height2 = Math.random() * 100;
  width3 = Math.random() * 100;
  height3 = Math.random() * 100;

  bigObject = defaultEntityFields;

  // A computed property
  get area() {
    return super.area + this.width * this.height;
  }

  get area2() {
    return this.width2 * this.height2;
  }
  
  get area3() {
    return this.width3 * this.height3;
  }

  constructor(props: { id: number }) {
    super();
    this.id = props.id;
  }
  
  // A method
  update() {
    this.width = Math.random() * 100;
  }

  update2() {
    this.width2 = Math.random() * 100;
  }

  update3() {
    this.width3 = Math.random() * 100;
  }

  update4() {
    this.width = Math.random() * 100;
  }

  update5() {
    this.width2 = Math.random() * 100;
  }

  update6() {
    this.width3 = Math.random() * 100;
  }
  update7() {
    this.width = Math.random() * 100;
  }

  update8() {
    this.width2 = Math.random() * 100;
  }

  update9() {
    this.width3 = Math.random() * 100;
  }
}