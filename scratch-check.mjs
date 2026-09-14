import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await page.goto('http://localhost:5174/examples/ai-chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('[class*=newsletter], [class*=drip], [class*=popup]'))
      el.style.display = 'none';
  });
  const sel = '.ac-thread .virtual-scroller';
  const r = await page.evaluate((s) => document.querySelector(s).getBoundingClientRect().toJSON(), sel);
  const look = () => page.evaluate((s) => {
    const frame = document.querySelector(s);
    const box = frame.getBoundingClientRect();
    const rows = [...frame.querySelectorAll('.virtual-scroller__item')].map((el) => {
      const q = el.getBoundingClientRect();
      return { i: Number(el.getAttribute('aria-rowindex')) - 1,
        top: Math.round(q.top - box.top), h: Math.round(q.height) };
    }).sort((a, b) => a.i - b.i);
    const last = rows[rows.length - 1];
    return { rows: rows.map((x) => `${x.i}@${x.top}h${x.h}`).join(' '),
      blank: Math.max(0, Math.round(box.height - (last.top + last.h))), frameH: Math.round(box.height) };
  }, sel);
  // sweep the whole neighbourhood, stopping at rest at each step
  await page.evaluate((s) => {
    document.querySelector(s).__vueParentComponent.setupState.virtualScroller
      .scrollToIndex(10330, undefined, false, 0);
  }, sel);
  await page.waitForTimeout(1500);
  let worst = 0;
  for (let step = 0; step < 16; step++) {
    for (let i = 0; i < 2; i++) {
      await page.mouse.move(r.x + r.width * 0.25, r.y + r.height * 0.4);
      await page.mouse.wheel(0, -200);
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(1600);              // come fully to rest
    const v = await look();
    worst = Math.max(worst, v.blank);
    if (v.blank > 2) console.log(`step ${step} BLANK ${v.blank}px  ${v.rows}`);
  }
  console.log('worst blank at rest across the sweep:', worst + 'px  (frame ' + (await look()).frameH + 'px)');
  await browser.close();
})();
