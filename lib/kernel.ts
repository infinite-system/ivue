export class Kernel {
  #map = new Map<string, any>();

  set<T>(key: string, value: T) {
    this.#map.set(key, value);
  }

  get<T = any>(key: string, fallback: T): T {
    const value = this.#map.get(key) as T | undefined;
    return value ?? fallback;
  }

  clear() {
    this.#map.clear();
  }
}

export const kernel = new Kernel();
