import { describe, expect, it } from 'vitest';
import { Static } from './Static';

describe('Static', () => {
  it('binds a method on first read and materializes a stable data property', () => {
    class $Orders {
      static orderCount = 0;

      static submit() {
        return ++this.orderCount;
      }
    }

    const Orders = Static($Orders);
    const lazyDescriptor = Object.getOwnPropertyDescriptor(Orders, 'submit');
    expect(lazyDescriptor?.get).toBeTypeOf('function');

    const submit = Orders.submit;
    expect(submit()).toBe(1);
    expect(submit).toBe(Orders.submit);

    const materializedDescriptor = Object.getOwnPropertyDescriptor(
      Orders,
      'submit',
    );
    expect(materializedDescriptor?.get).toBeUndefined();
    expect(materializedDescriptor?.value).toBe(submit);
  });

  it('leaves the raw class untouched as the inheritance foundation', () => {
    class $Orders {
      static submit() {
        return 'submitted';
      }
    }

    const originalMethod = $Orders.submit;
    const Orders = Static($Orders);

    expect(Orders).not.toBe($Orders);
    expect(Object.getPrototypeOf(Orders)).toBe($Orders);
    expect(Object.getOwnPropertyDescriptor($Orders, 'submit')?.value).toBe(
      originalMethod,
    );
  });

  it('preserves static inheritance, override, super, and derived this', () => {
    class $BaseOrders {
      static channel = 'base';

      static describe() {
        return this.channel;
      }
    }

    class $PriorityOrders extends $BaseOrders {
      static override channel = 'priority';

      static override describe() {
        return `${super.describe()}:orders`;
      }
    }

    const BaseOrders = Static($BaseOrders);
    const baseDescribe = BaseOrders.describe;
    const PriorityOrders = Static($PriorityOrders);
    const priorityDescribe = PriorityOrders.describe;

    expect(baseDescribe()).toBe('base');
    expect(priorityDescribe()).toBe('priority:orders');
    expect(PriorityOrders.describe()).toBe('priority:orders');
  });

  it('keeps dependency getters late inside a retained method', () => {
    class $ProductionUsers {
      static find(userId: string) {
        return `production:${userId}`;
      }
    }

    class $TestUsers {
      static find(userId: string) {
        return `test:${userId}`;
      }
    }

    const Users = { Class: $ProductionUsers };

    class $Orders {
      static get Users() {
        return Users.Class;
      }

      static submit(userId: string) {
        return this.Users.find(userId);
      }
    }

    const Orders = Static($Orders);
    const submit = Orders.submit;

    Users.Class = $TestUsers;
    expect(submit('42')).toBe('test:42');
  });

  it('allows a child accessor to suppress an inherited static method', () => {
    class $BaseStatus {
      static status() {
        return 'base';
      }
    }

    class $ReadyStatus extends $BaseStatus {}
    Object.defineProperty($ReadyStatus, 'status', {
      configurable: true,
      get() {
        return 'ready';
      },
    });

    const ReadyStatus = Static($ReadyStatus);
    expect(
      (ReadyStatus as unknown as { readonly status: string }).status,
    ).toBe('ready');
  });

  it('keeps retained callbacks on one class generation across slot changes', () => {
    class $ProductionOrders {
      static submit() {
        return 'production';
      }
    }

    class $TestOrders {
      static submit() {
        return 'test';
      }
    }

    const Orders = { Class: Static($ProductionOrders) };
    const retainedSubmit = Orders.Class.submit;

    Orders.Class = Static($TestOrders);
    expect(retainedSubmit()).toBe('production');
    expect(Orders.Class.submit()).toBe('test');
  });
});
