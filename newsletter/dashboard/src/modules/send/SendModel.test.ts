// The payoff of "no logic in templates": every label, disabled state,
// and outcome verdict the Send view renders is a prototype member,
// testable here without mounting a component.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SendModel } from './SendModel';

// The model's constructor loads the post catalog and lists over the
// Api; the derivations under test never need real data, so both
// endpoints answer empty.
beforeEach(() => {
  vi.stubGlobal('sessionStorage', {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('[]')),
  );
});

describe('SendModel derivations', () => {
  it('parses recipients from commas, semicolons, and newlines, lowercased', () => {
    const model = new SendModel.Class();
    model.recipientsText.value = ' Ada@ivue.dev,\n bo@ivue.dev; ada@ivue.dev ';
    expect(model.recipients).toEqual(['ada@ivue.dev', 'bo@ivue.dev', 'ada@ivue.dev']);
  });

  it('canSend needs a slug AND at least one recipient', () => {
    const model = new SendModel.Class();
    expect(model.canSend).toBe(false);
    model.slug.value = 'first-post';
    expect(model.canSend).toBe(false);
    model.recipientsText.value = 'a@ivue.dev';
    expect(model.canSend).toBe(true);
  });

  it('sendDisabled combines readiness with the in-flight flag', () => {
    const model = new SendModel.Class();
    model.slug.value = 'first-post';
    model.recipientsText.value = 'a@ivue.dev';
    expect(model.sendDisabled).toBe(false);
    model.sending.value = true;
    expect(model.sendDisabled).toBe(true);
  });

  it('sendButtonLabel narrates the three states', () => {
    const model = new SendModel.Class();
    expect(model.sendButtonLabel).toBe('Send to …');
    model.recipientsText.value = 'a@ivue.dev b@ivue.dev';
    expect(model.sendButtonLabel).toBe('Send to 2');
    model.sending.value = true;
    expect(model.sendButtonLabel).toBe('Sending…');
  });

  it('arm-to-confirm labels flip with their armed flags', () => {
    const model = new SendModel.Class();
    expect(model.broadcastButtonLabel).toBe('Broadcast');
    expect(model.dripButtonLabel).toBe('Run drip pass');
    expect(model.anyActionArmed).toBe(false);
    model.broadcastArmed.value = true;
    expect(model.broadcastButtonLabel).toBe('Really broadcast — click again');
    expect(model.anyActionArmed).toBe(true);
    model.disarm();
    expect(model.anyActionArmed).toBe(false);
  });

  it('outcome verdicts: ErrorCode 0 is accepted, anything else shows the message', () => {
    const model = new SendModel.Class();
    const accepted = { email: 'a@ivue.dev', errorCode: 0, message: 'OK' };
    const rejected = {
      email: 'b@ivue.dev',
      errorCode: 406,
      message: 'inactive recipient',
    };
    expect(model.outcomeAccepted(accepted)).toBe(true);
    expect(model.outcomeLabel(accepted)).toBe('accepted');
    expect(model.outcomeAccepted(rejected)).toBe(false);
    expect(model.outcomeLabel(rejected)).toBe('inactive recipient');
  });

  it('skippedSummary joins the repeat refusals from the last result', () => {
    const model = new SendModel.Class();
    expect(model.skippedSummary).toBe('');
    model.result.value = {
      ok: true,
      slug: 'first-post',
      delivered: 0,
      outcomes: [],
      skippedAsRepeat: ['a@ivue.dev', 'b@ivue.dev'],
    };
    expect(model.skippedSummary).toBe('a@ivue.dev, b@ivue.dev');
  });
});
