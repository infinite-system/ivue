// Test infrastructure: an R2-shaped bucket in memory — put, get, head,
// delete — enough for the press asset store's tests to run the same
// calls the Worker makes against the real binding.
class $TestBucket {
  objects = new Map<string, { body: ArrayBuffer; httpMetadata: { contentType?: string; cacheControl?: string } }>();

  async put(
    key: string,
    body: ArrayBuffer,
    options: { httpMetadata?: { contentType?: string; cacheControl?: string } } = {},
  ): Promise<{ key: string }> {
    this.objects.set(key, { body, httpMetadata: options.httpMetadata ?? {} });
    return { key };
  }

  async get(key: string): Promise<{ body: ReadableStream; httpMetadata: { contentType?: string } } | null> {
    const stored = this.objects.get(key);
    if (!stored) return null;
    return {
      body: new Blob([stored.body]).stream(),
      httpMetadata: stored.httpMetadata,
    };
  }

  async head(key: string): Promise<{ key: string } | null> {
    return this.objects.has(key) ? { key } : null;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }
}

export namespace TestBucket {
  export const $Class = $TestBucket;
  export let Class = $Class;
}
