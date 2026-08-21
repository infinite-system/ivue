import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SocialsSettingsModel } from './SocialsSettingsModel';

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
            tweetTemplate: 'New — {title} {url}',
            tweetContentTemplate: '{title} {description} {url}',
            xConfigured: true,
            sender: {},
          }),
        ),
    ),
  );
});

describe('SocialsSettingsModel derivations', () => {
  it('templateDirty and xConfigured derive from the loaded settings', async () => {
    const model = new SocialsSettingsModel.Class();
    await vi.waitFor(() => {
      expect(model.loading.value).toBe(false);
    });
    expect(model.xConfigured).toBe(true);
    expect(model.templateDirty).toBe(false);
    expect(model.saveDisabled).toBe(true);
    model.templateDraft.value = 'Changed {title}';
    expect(model.templateDirty).toBe(true);
    expect(model.saveDisabled).toBe(false);
  });
});
