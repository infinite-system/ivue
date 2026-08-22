import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NewsletterSettingsModel } from './NewsletterSettingsModel';

const SETTINGS = {
  cadenceDays: 2,
  sendHourLocal: 9,
  defaultTimezone: 'America/Toronto',
  listOverrides: { vip: { sendHourLocal: 18 } },
  tweetTemplate: 't',
  tweetContentTemplate: 'ct',
  xConfigured: false,
  sender: { senderEmail: 'newsletter@ivue.dev' },
};

const LISTS = [
  { list: 'newsletter', members: 3, active: 3 },
  { list: 'vip', members: 1, active: 1 },
];

beforeEach(() => {
  vi.stubGlobal('sessionStorage', {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes('/admin/lists')
        ? new Response(JSON.stringify(LISTS))
        : new Response(JSON.stringify(SETTINGS)),
    ),
  );
});

describe('NewsletterSettingsModel derivations', () => {
  it('drafts load from settings; overrides fill, inherits stay blank', async () => {
    const model = new NewsletterSettingsModel.Class();
    await vi.waitFor(() => {
      expect(model.loading.value).toBe(false);
    });
    expect(model.cadenceDaysDraft.value).toBe('2');
    expect(model.sendHourDraft.value).toBe('9');
    expect(model.defaultTimezoneDraft.value).toBe('America/Toronto');
    expect(model.listCadenceDrafts.value).toEqual({ newsletter: '', vip: '' });
    expect(model.listSendHourDrafts.value).toEqual({
      newsletter: '',
      vip: '18',
    });
  });

  it('isDirty and saveDisabled track every draft against the loaded state', async () => {
    const model = new NewsletterSettingsModel.Class();
    await vi.waitFor(() => {
      expect(model.loading.value).toBe(false);
    });
    expect(model.isDirty).toBe(false);
    expect(model.saveDisabled).toBe(true);
    model.cadenceDaysDraft.value = '3';
    expect(model.isDirty).toBe(true);
    expect(model.saveDisabled).toBe(false);
    model.cadenceDaysDraft.value = '2';
    expect(model.isDirty).toBe(false);
    // a per-list draft change counts too
    model.listSendHourDrafts.value = { newsletter: '7', vip: '18' };
    expect(model.isDirty).toBe(true);
    model.saving.value = true;
    expect(model.saveDisabled).toBe(true);
  });

  it('schedule summary and effective per-list values narrate the drafts', async () => {
    const model = new NewsletterSettingsModel.Class();
    await vi.waitFor(() => {
      expect(model.loading.value).toBe(false);
    });
    expect(model.scheduleSummary).toBe(
      "One email every 2 days, at 9am in each subscriber's own timezone.",
    );
    expect(model.hourLabel(0)).toBe('12am');
    expect(model.hourLabel(12)).toBe('12pm');
    expect(model.hourLabel(18)).toBe('6pm');
    expect(model.effectiveCadence('newsletter')).toBe('2');
    expect(model.effectiveSendHour('newsletter')).toBe('9am');
    expect(model.effectiveSendHour('vip')).toBe('6pm');
  });
});
