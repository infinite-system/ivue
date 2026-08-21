import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NewsletterSettingsModel } from './NewsletterSettingsModel';

beforeEach(() => {
  vi.stubGlobal('sessionStorage', {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            cadenceHours: 40,
            tweetTemplate: 't',
            tweetContentTemplate: 'ct',
            xConfigured: false,
            sender: { senderEmail: 'newsletter@ivue.dev' },
          }),
        ),
    ),
  );
});

describe('NewsletterSettingsModel derivations', () => {
  it('cadenceDirty and saveDisabled track the draft against the loaded value', async () => {
    const model = new NewsletterSettingsModel.Class();
    await vi.waitFor(() => {
      expect(model.loading.value).toBe(false);
    });
    expect(model.cadenceDraft.value).toBe('40');
    expect(model.cadenceDirty).toBe(false);
    expect(model.saveDisabled).toBe(true);
    model.cadenceDraft.value = '48';
    expect(model.cadenceDirty).toBe(true);
    expect(model.saveDisabled).toBe(false);
    model.saving.value = true;
    expect(model.saveDisabled).toBe(true);
  });
});
