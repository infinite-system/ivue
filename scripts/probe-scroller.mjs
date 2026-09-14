// probe-scroller.mjs — the scroller's phone-feel tripwires, driven against a running docs dev
// server. Unit specs bind the mechanisms; this binds the numbers they were fixed for, on a
// Pixel profile under 4× CPU throttling, so a regression in feel fails a command instead of
// waiting for a hand on a phone. Run: `npm run probe:scroller` (dev server on 5174, or --port).
//
// Each probe prints its measurements and its thresholds; any breach exits 1. Thresholds carry
// margin over the values measured on 2026-09-13 (see LESSONS "A phone flick's tail, traced").
import { chromium, devices } from 'playwright';
import { homedir } from 'node:os';

const port = process.argv.find((a) => a.startsWith('--port='))?.slice(7) ?? '5174';
const url = `http://localhost:${port}/examples/ai-chat`;
const executablePath = `${homedir()}/.cache/ms-playwright/chromium-1228/chrome-linux/chrome`;

const failures = [];
const check = (name, value, ok, threshold) => {
  const pass = ok(value);
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}: ${value} (${threshold})`);
  if (!pass) failures.push(name);
};

const open = async (browser) => {
  const ctx = await browser.newContext({ ...devices['Pixel 5'] });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('.ac-msg', { timeout: 150000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    document.querySelector('.ac-stats').scrollIntoView();
    document.querySelectorAll('.newsletter--toast').forEach((n) => n.remove());
  });
  await page.waitForTimeout(400);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  return { ctx, page, cdp };
};

const flickOn = async (page, cdp, selector, direction, px = 40) => {
  const r = await page.evaluate(
    (s) => document.querySelector(s).getBoundingClientRect().toJSON(),
    selector
  );
  const x = r.x + r.width / 2;
  const y0 = r.y + r.height * (direction > 0 ? 0.8 : 0.2);
  const touch = (type, y, t) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
      timestamp: t
    });
  let t = Date.now() / 1000;
  await touch('touchStart', y0, t);
  for (let i = 1; i <= 6; i++) {
    t += 0.016;
    await touch('touchMove', y0 - direction * i * px, t);
  }
  await touch('touchEnd', 0, t + 0.01);
};

const startLog = (page, selector) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    const model = el.__vueParentComponent.setupState.virtualScroller;
    window.__probe = { log: [], long: [] };
    let last = performance.now();
    const step = (now) => {
      const L = model.lenis;
      window.__probe.log.push([
        now,
        now - last,
        el.querySelectorAll('.virtual-scroller__item').length,
        L.velocity,
        L.isScrolling
      ]);
      last = now;
      window.__probe.raf = requestAnimationFrame(step);
    };
    window.__probe.raf = requestAnimationFrame(step);
    new PerformanceObserver((list) =>
      list.getEntries().forEach((e) => window.__probe.long.push(e.duration))
    ).observe({ entryTypes: ['longtask'] });
  }, selector);

const stopLog = (page) =>
  page.evaluate(() => {
    cancelAnimationFrame(window.__probe.raf);
    return { log: window.__probe.log, long: window.__probe.long };
  });

const browser = await chromium.launch({ executablePath });
try {
  // 1. the files list: a flick's tail holds its rows and no frame chokes
  {
    const { ctx, page, cdp } = await open(browser);
    await page.tap('.ac-more-btn');
    await page.waitForTimeout(300);
    await page.tap('.ac-more-item:nth-child(2)');
    await page.waitForTimeout(1000);
    const list = '.ac-file-list .virtual-scroller';
    await startLog(page, list);
    await flickOn(page, cdp, list, 1);
    await page.waitForTimeout(2600);
    const { log, long } = await stopLog(page);
    const dts = log.map((f) => f[1]).slice(2);
    const rowsWhileGliding = log
      .filter((f) => f[4] === 'smooth' && Math.abs(f[3]) < 30)
      .map((f) => f[2]);
    const drops = rowsWhileGliding.filter((n, i) => i > 0 && n < rowsWhileGliding[i - 1]).length;
    check(
      'files flick: max frame ms',
      Math.round(Math.max(...dts)),
      (v) => v <= 84,
      '≤ 84, measured 50'
    );
    check(
      'files flick: long tasks ms',
      Math.round(long.reduce((a, b) => a + b, 0)),
      (v) => v <= 200,
      '≤ 200, measured 50–105'
    );
    check(
      'files flick: row unmounts during the tail',
      drops,
      (v) => v === 0,
      '= 0: held rows release at rest'
    );
    await ctx.close();
  }
  // 2. the chat: the first flick from the end glides, and a flick back reverses within a few frames
  {
    const { ctx, page, cdp } = await open(browser);
    const thread = '.ac-thread .virtual-scroller';
    await startLog(page, thread);
    await flickOn(page, cdp, thread, -1);
    await page.waitForTimeout(2500);
    let { log } = await stopLog(page);
    const peak = Math.max(...log.map((f) => Math.abs(f[3])));
    const gliding = log.filter((f) => f[4] === 'smooth').length;
    // The threshold moved with a deliberate retune, not with a regression:
    // the flick's knobs are now a throw and a LAUNCH RATIO, and the launch
    // went from 2.28x the finger's own speed to 1x — a hand-over rather than
    // a fling. Peak px/frame falls by exactly that ratio by construction
    // (80 -> 38 measured), so the old floor would fail every clean run. What
    // still has to hold is that a flick carries at all.
    check(
      'chat first flick from the end: peak px per frame',
      Math.round(peak),
      (v) => v >= 18,
      '≥ 18, measured 29 at carry 15, launch 1'
    );
    check(
      'chat first flick from the end: gliding frames',
      gliding,
      (v) => v >= 40,
      '≥ 40, measured ~110'
    );
    // A glide forward, then a flick back 300 ms in: the velocity reverses
    // within a few frames of the touch. THREE attempts, median reported: one
    // sample of a latency on a throttled VM is not a measurement — this check
    // ran 62–127 ms across ten samples of the same code, breaching its own
    // threshold twice. A gate that cries wolf one run in five teaches you to
    // ignore it, so the noise is measured out rather than tolerated.
    const latencies = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      await startLog(page, thread);
      await flickOn(page, cdp, thread, 1);
      await page.waitForTimeout(300);
      const tTouch = await page.evaluate(() => performance.now());
      await flickOn(page, cdp, thread, -1);
      await page.waitForTimeout(1200);
      ({ log } = await stopLog(page));
      const reversal = log.find((f) => f[0] > tTouch && f[3] < -1);
      latencies.push(reversal ? reversal[0] - tTouch : Infinity);
    }
    latencies.sort((a, b) => a - b);
    check(
      'chat reversal: ms from touch to reversed velocity (median of 3)',
      Math.round(latencies[1]),
      (v) => v <= 120,
      '≤ 120, measured 60–110 per sample'
    );
    await ctx.close();
  }
  // 3. the chat: a send keeps the pin, the reply lands at the end
  {
    const { ctx, page } = await open(browser);
    await page.fill('.ac-composer textarea', 'probe');
    await page.evaluate(() => document.querySelector('.ac-send').click());
    // Wait for the reply to finish streaming, not for a stopwatch. A fixed
    // 4 s measured the gap mid-stream whenever the VM was loaded and read as
    // a broken pin — the same flakiness the reversal check had. The composer
    // shows a stop button for exactly as long as the reply is streaming, so
    // that is the signal; the settle after it is for the last rows to
    // measure and the pin to apply.
    await page
      .waitForSelector('.ac-stop', { state: 'detached', timeout: 15000 })
      .catch(() => undefined);
    await page.waitForTimeout(900);
    const gap = await page.evaluate(() => {
      const m = document.querySelector('.ac-thread .virtual-scroller').__vueParentComponent
        .setupState.virtualScroller;
      return Math.round(
        m.scrollExtent.value - m.containerOuterSize.value - Number(m.scrollPosition.value)
      );
    });
    const chip = await page.evaluate(() => !!document.querySelector('.ac-jump'));
    check('send: px between the end and the frame after the reply', gap, (v) => v <= 4, '≤ 4');
    check('send: jump chip shown', chip, (v) => v === false, '= false');
    await ctx.close();
  }
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(`\n${failures.length} probe(s) breached: ${failures.join('; ')}`);
  process.exit(1);
}
console.log('\nall scroller probes within their thresholds');
