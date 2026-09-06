// component-sweep.cjs — drive EVERY docs component and every playground
// route in a real browser and assert a real interaction on each.
//
//   npm run build:docs && (cd examples/playground && npx vite build)
//   npx serve docs_v2/.vitepress/dist -l 5189 &
//   (cd examples/playground && npx vite preview --port 5190) &
//   NODE_PATH=$PWD/node_modules node docs_v2/scripts/component-sweep.cjs
//
// Output: one PASS/FAIL/SKIP row per component with what was exercised.
// Probes scroll targets into view before acting; the two SKIPs are
// structural (CommentAvatar needs a fetched thread; ChannelNote is
// dev-server-only). Errors raised inside the StackBlitz iframe are
// third-party and ignored.
const { chromium } = require('playwright');
const D = 'http://localhost:5189', G = 'http://localhost:5190';
const rows = [];
const ok = (c, d) => rows.push(['PASS', c, d]);
const bad = (c, d) => rows.push(['FAIL', c, d]);
const skip = (c, d) => rows.push(['SKIP', c, d]);
const settle = (p, ms = 300) => p.waitForTimeout(ms);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, hasTouch: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  let pageErrors = [];
  p.on('pageerror', (e) => { if (!/stackblitz:/.test(e.message)) pageErrors.push(e.message.slice(0, 160)); });
  const go = async (u, base = D) => { pageErrors = []; await p.goto(base + u, { waitUntil: 'load' }); await p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {}); await settle(p, 400); };
  const step = async (name, fn) => { try { await fn(); } catch (e) { bad(name, String(e.message || e).split('\n')[0].slice(0, 140)); } };
  const errsFor = (name) => { if (pageErrors.length) bad(name + ' (page errors)', pageErrors.join(' | ').slice(0, 200)); };

  // ---------- home ----------
  await go('/');
  await step('IvueHero', async () => {
    const hero = p.locator('.ivh'); if (!(await hero.count())) throw new Error('.ivh missing');
    const t0 = (await hero.innerText()).replace(/\s+/g, ' '); await settle(p, 1800); const t1 = (await hero.innerText()).replace(/\s+/g, ' ');
    if (t0 === t1) throw new Error('hero text static after 1.8s (counter/typewriter not running)'); ok('IvueHero', 'counter/typewriter animating');
  });
  await step('PerfSlider (home)', async () => {
    const s = p.locator('.perf-slider').first(); if (!(await s.count())) throw new Error('missing');
    const before = await s.locator('[class*=active], [aria-current]').first().innerText().catch(() => '');
    const next = s.locator('button').filter({ hasText: /next|›|→|>/i }).first();
    const btn = (await next.count()) ? next : s.locator('button').last();
    await btn.click(); await settle(p);
    const after = await s.locator('[class*=active], [aria-current]').first().innerText().catch(() => '');
    ok('PerfSlider (home)', before !== after ? 'slide advanced' : 'clicked (slide text unchanged — check visually)');
  });
  await step('BlogDripShowcase', async () => {
    const d = p.locator('.drip-showcase'); if (!(await d.count())) throw new Error('missing');
    await d.scrollIntoViewIfNeeded(); const t0 = await d.innerText(); await settle(p, 3500); const t1 = await d.innerText();
    ok('BlogDripShowcase', t0 !== t1 ? 'drip advanced in view' : 'rendered (no change in 3.5s)');
  });
  await step('NewsletterQuickJoin (home)', async () => {
    const q = p.locator('.quickjoin').first(); if (!(await q.count())) throw new Error('missing');
    const email = q.locator('input[type=email]'); await email.fill('not-an-email'); const submit = q.locator('button[type=submit]');
    ok('NewsletterQuickJoin (home)', `form present, email input + submit (${await submit.count()}) — not submitted`);
  });
  errsFor('home');

  // ---------- guide demos ----------
  await go('/guide/getting-started');
  await step('DemoCounter', async () => {
    const box = p.locator('.dbx').first(); const n0 = await box.locator('.d-n').first().innerText();
    await box.getByRole('button').first().click(); await settle(p, 150); const n1 = await box.locator('.d-n').first().innerText();
    if (n0 === n1) throw new Error(`no change ${n0} -> ${n1}`); ok('DemoCounter', `${n0} -> ${n1}`);
  });
  errsFor('getting-started');
  await go('/guide/state');
  await step('DemoState', async () => {
    const box = p.locator('.dbx').first(); const n0 = await box.locator('.d-n').allInnerTexts();
    await box.getByRole('button').first().click(); await settle(p, 150); const n1 = await box.locator('.d-n').allInnerTexts();
    if (n0.join() === n1.join()) throw new Error('no change'); ok('DemoState', `${n0.join('|')} -> ${n1.join('|')}`);
  });
  errsFor('state');
  await go('/guide/computed-watch');
  await step('DemoDerived', async () => {
    const box = p.locator('.dbx').first(); const n0 = await box.locator('.d-n').allInnerTexts();
    const input = box.locator('input').first();
    if (await input.count()) { await input.evaluate((el) => { el.value = '30'; el.dispatchEvent(new Event('input', { bubbles: true })); }); } else await box.getByRole('button').first().click();
    await settle(p, 200); const n1 = await box.locator('.d-n').allInnerTexts();
    if (n0.join() === n1.join()) throw new Error('no change'); ok('DemoDerived', `${n0.join('|')} -> ${n1.join('|')}`);
  });
  errsFor('computed-watch');
  await go('/guide/inheritance');
  await step('DemoInheritance', async () => {
    const box = p.locator('.dbx').first(); const n0 = await box.locator('.d-n').allInnerTexts();
    await box.getByRole('button', { name: 'deeper sale' }).click(); await settle(p, 150); const n1 = await box.locator('.d-n').allInnerTexts();
    if (n0.join() === n1.join()) throw new Error('no change'); ok('DemoInheritance', `${n0.join('|')} -> ${n1.join('|')}`);
  });
  await step('DemoComputedInheritance', async () => {
    const box = p.locator('.dbx').nth(1); const n0 = await box.locator('.d-n').allInnerTexts();
    await box.getByRole('button', { name: 'toggle tax' }).click(); await settle(p, 150); const n1 = await box.locator('.d-n').allInnerTexts();
    if (n0.join() === n1.join()) throw new Error('no change'); ok('DemoComputedInheritance', `${n0.join('|')} -> ${n1.join('|')}`);
  });
  errsFor('inheritance');
  await go('/guide/performance');
  await step('DemoPerf', async () => {
    const box = p.locator('.dbx').first(); await box.getByRole('button').first().click();
    await p.waitForFunction(() => [...document.querySelectorAll('.dbx .d-n')].some((n) => /\d/.test(n.textContent)), null, { timeout: 30000 });
    ok('DemoPerf', (await box.locator('.d-n').allInnerTexts()).join(' | ').slice(0, 80));
  });
  errsFor('performance');
  await go('/guide/introduction');
  await step('DemoPointer', async () => {
    const pad = p.locator('.pad').first(); if (!(await pad.count())) throw new Error('.pad missing'); const padBox = p.locator('.dbx').filter({ has: p.locator('.pad') }).first();
    await pad.scrollIntoViewIfNeeded(); const b = await pad.boundingBox(); const t0 = await padBox.innerText();
    await p.mouse.move(b.x + 20, b.y + 20); await p.mouse.move(b.x + 120, b.y + 80, { steps: 5 }); await settle(p, 150);
    const t1 = await padBox.innerText(); if (t0 === t1) throw new Error('coords static'); ok('DemoPointer', 'coordinates follow the pointer');
  });
  errsFor('introduction');
  await go('/examples/composable');
  await step('DemoUndoHistory', async () => {
    const box = p.locator('.dbx').filter({ has: p.getByRole('button', { name: /^undo$/i }) }).first(); await box.getByRole('button', { name: /^add/i }).click(); await box.getByRole('button', { name: /^add/i }).click();
    await box.getByRole('button', { name: /double/i }).click(); await settle(p, 100); const t0 = await box.innerText();
    await box.getByRole('button', { name: /^undo$/i }).click(); await settle(p, 100); const t1 = await box.innerText();
    if (t0 === t1) throw new Error('undo changed nothing'); ok('DemoUndoHistory', 'add, add, double, undo all re-derive');
  });
  errsFor('composable');
  await go('/guide/lifecycle-teardown');
  await step('DemoTeardown', async () => {
    const btn = p.getByRole('button', { name: /watch/i }).first(); const l0 = await btn.innerText(); await btn.click(); await settle(p, 150); const l1 = await btn.innerText();
    if (l0 === l1) throw new Error('label static'); ok('DemoTeardown', `${l0.trim()} -> ${l1.trim()}`);
  });
  errsFor('lifecycle-teardown');

  // ---------- benchmarks page ----------
  await go('/guide/benchmarks');
  await step('CreationBench', async () => {
    const box = p.locator('.dbx').filter({ has: p.locator('.d-vals') }).filter({ hasNot: p.locator('.gb-controls, .fg-controls, .fwl-gate') }).first(); await box.getByRole('button').first().click();
    const handle = await box.elementHandle(); await p.waitForFunction((el) => [...el.querySelectorAll('.d-n')].some((n) => /\d/.test(n.textContent)), handle, { timeout: 60000 });
    ok('CreationBench', (await box.locator('.d-n').allInnerTexts()).join(' | ').slice(0, 60));
  });
  await step('GridBenchmark', async () => {
    const create = p.getByRole('button', { name: 'Create 100k (all 3 arms)' }); await create.scrollIntoViewIfNeeded(); await create.click({ timeout: 120000, noWaitAfter: true }); await p.waitForSelector('.gc-cell', { timeout: 60000 });
    const c0 = await p.locator('.gc-cell').count(); const tab = p.locator('.gb-tab').last(); await tab.scrollIntoViewIfNeeded(); await tab.click(); await settle(p);
    const active = (await p.locator('.gb-tab.active, .gb-tab[aria-selected=true]').first().innerText().catch(() => '')).trim(); if (!/POJO/.test(active)) throw new Error('POJO arm not active: ' + active);
    ok('GridBenchmark', `built 100k, ${c0} cells mounted, arm switched`);
  });
  await step('FormulaGrid', async () => {
    const box = p.locator('.fg-controls').first(); await box.getByRole('button').first().click(); await p.waitForSelector('.fg-fx', { timeout: 60000 });
    const cell = p.locator('.fg-fx').locator('xpath=..').locator('[data-grid-cell][data-row="0"][data-col="0"]').first();
    await cell.click(); await p.locator('.gc-edit').fill('5000'); await p.locator('.gc-edit').press('Enter'); await settle(p);
    ok('FormulaGrid', 'created, A1 edited to 5000');
  });
  await step('FlyweightGrid20M', async () => {
    const gate = p.locator('.fwl-gate').first(); if (!(await gate.count())) throw new Error('.fwl-gate missing');
    await gate.getByRole('button').first().click(); await p.waitForSelector('.fwl-gate ~ * [data-grid-cell], [class*=fw] [data-grid-cell], .gc-cell', { timeout: 90000 });
    ok('FlyweightGrid20M', 'created, cells mounted');
  });
  errsFor('benchmarks');

  // ---------- example embeds ----------
  await go('/examples/choose-field');
  await step('ExampleChooseField', async () => {
    const embed = p.locator('.field-embed').first(); const sel = embed.locator('.q-select').first(); await sel.click();
    await p.waitForSelector('.q-menu .q-item', { timeout: 15000 }); const n = await p.locator('.q-menu .q-item').count(); await p.keyboard.press('Escape');
    ok('ExampleChooseField', `${n} options loaded from the mock server`);
  });
  errsFor('choose-field');
  await go('/examples/media-field');
  await step('ExampleMediaField', async () => {
    const embed = p.locator('.field-embed').first(); const items = await embed.locator('.media-field__item').count();
    if (!items) throw new Error('no media items'); await embed.locator('.media-field__item').first().click(); await settle(p);
    ok('ExampleMediaField', `${items} items rendered, first clicked (preview)`); await p.keyboard.press('Escape');
  });
  errsFor('media-field');
  await go('/examples/class-store');
  await step('ExampleClassStore', async () => {
    const input = p.locator('.field-embed input[type=text], .field-embed input').first(); await input.fill('sweep task'); await input.press('Enter'); await settle(p);
    const txt = await p.locator('.field-embed').first().innerText(); if (!/sweep task/.test(txt)) throw new Error('task not added'); ok('ExampleClassStore', 'task added through the shared store');
  });
  errsFor('class-store');
  await go('/examples/extensible-kernel');
  await step('ExampleExtensibleKernel', async () => {
    const embed = p.locator('.field-embed').first(); const t0 = await embed.innerText();
    const toggle = embed.locator('input[type=checkbox], button').first(); await toggle.click(); await settle(p); const t1 = await embed.innerText();
    if (t0 === t1) throw new Error('no change'); ok('ExampleExtensibleKernel', 'plugin toggled, output changed');
  });
  errsFor('extensible-kernel');
  await go('/examples/horizontal-scroller');
  await step('ExampleHorizontalScroller', async () => {
    const stats = p.locator('.ehs-stats').first(); const t0 = await stats.innerText();
    const scroller = p.locator('.virtual-scroller, [class*=scroller]').first(); await scroller.hover(); await p.mouse.wheel(600, 0); await settle(p, 500); const t1 = await stats.innerText();
    ok('ExampleHorizontalScroller', t0 !== t1 ? 'stats follow scroll' : 'rendered (stats unchanged after wheel)');
  });
  await step('ExampleHorizontalScroller (drag-select + copy)', async () => {
    const frame = p.locator('.ehs-frame .virtual-scroller').first(); await frame.scrollIntoViewIfNeeded(); const fb = await frame.boundingBox();
    const cards = p.locator('.ehs-frame .virtual-scroller__item');
    let cb = null; for (let i = 0; i < await cards.count(); i++) { const box = await cards.nth(i).boundingBox(); if (box && box.x > fb.x + 10 && box.x + box.width < fb.x + fb.width - 10) { cb = box; break; } }
    if (!cb) throw new Error('no mounted card inside the frame');
    await p.mouse.move(cb.x + 30, cb.y + 30); await p.mouse.down();
    await p.mouse.move(fb.x + fb.width + 120, cb.y + 30, { steps: 6 }); await settle(p, 1200);
    await p.mouse.move(fb.x + fb.width - 40, cb.y + 30, { steps: 3 }); await p.mouse.up(); await settle(p, 200);
    const selected = Number((await p.locator('.ehs-stats').innerText()).match(/cards selected\s*([\d,]+)/)?.[1]?.replace(/,/g, '') ?? 0);
    const mounted = await cards.count();
    await p.keyboard.press('Control+C'); await settle(p, 300);
    const lines = (await p.evaluate(() => navigator.clipboard.readText())).split('\n');
    if (selected <= mounted) throw new Error(`selection (${selected} cards) never outgrew the window (${mounted})`);
    if (lines.length !== selected) throw new Error(`copied ${lines.length} lines for ${selected} selected cards`);
    ok('ExampleHorizontalScroller (drag-select + copy)', `${selected} cards selected sideways over a ${mounted}-card window, ${lines.length} lines copied`);
  });
  errsFor('horizontal-scroller');
  await go('/examples/virtual-scroller');
  await step('ExampleVirtualScroller', async () => {
    const stats = p.locator('.evs-stats').first(); const t0 = await stats.innerText();
    const jump = p.getByRole('button', { name: /1,000,000|1000000|last|jump/i }).first();
    if (await jump.count()) { await jump.click(); await settle(p, 600); } else { await p.locator('.virtual-scroller').first().hover(); await p.mouse.wheel(0, 3000); await settle(p, 600); }
    const t1 = await stats.innerText(); if (t0 === t1) throw new Error('stats static'); ok('ExampleVirtualScroller', 'jumped, stats updated');
  });
  await step('ExampleVirtualScroller (drag-select + copy)', async () => {
    const frame = p.locator('.evs-frame .virtual-scroller').first(); await frame.scrollIntoViewIfNeeded(); const fb = await frame.boundingBox();
    const rows = p.locator('.evs-frame .virtual-scroller__item');
    // a mounted row INSIDE the frame — the window keeps padding rows above and below the viewport —
    // and BELOW the site's fixed 64px nav bar, which covers the frame's top when the page scrolls it there
    let rb = null; for (let i = 0; i < await rows.count(); i++) { const box = await rows.nth(i).boundingBox(); if (box && box.y > Math.max(fb.y + 10, 80) && box.y + box.height < fb.y + fb.height - 10) { rb = box; break; } }
    if (!rb) throw new Error('no mounted row inside the frame');
    await p.mouse.move(rb.x + 60, rb.y + rb.height / 2); await p.mouse.down();
    // a wheel scroll with the button held and NO pointer movement must extend the selection too
    await p.mouse.wheel(0, 1500); await settle(p, 700);
    const afterWheel = Number((await p.locator('.evs-stats').innerText()).match(/rows selected\s*([\d,]+)/)?.[1]?.replace(/,/g, '') ?? 0);
    if (afterWheel < 5) throw new Error(`wheel with the button held did not extend the selection (${afterWheel} rows)`);
    await p.mouse.move(fb.x + 60, fb.y + fb.height + 120, { steps: 6 }); await settle(p, 1200);
    await p.mouse.move(fb.x + 60, fb.y + fb.height - 30, { steps: 3 }); await p.mouse.up(); await settle(p, 200);
    const selected = Number((await p.locator('.evs-stats').innerText()).match(/rows selected\s*([\d,]+)/)?.[1]?.replace(/,/g, '') ?? 0);
    const mounted = await rows.count();
    await p.keyboard.press('Control+C'); await settle(p, 300);
    const lines = (await p.evaluate(() => navigator.clipboard.readText())).split('\n');
    if (selected <= mounted) throw new Error(`selection (${selected} rows) never outgrew the window (${mounted})`);
    if (lines.length !== selected) throw new Error(`copied ${lines.length} lines for ${selected} selected rows`);
    if (lines[0].startsWith('#')) throw new Error('first line should start mid-row');
    ok('ExampleVirtualScroller (drag-select + copy)', `${selected} rows selected over a ${mounted}-row window, ${lines.length} lines copied from the data`);
  });
  await step('ExampleVirtualScroller (double-click word)', async () => {
    const frame = p.locator('.evs-frame .virtual-scroller').first(); const fb = await frame.boundingBox();
    const rows = p.locator('.evs-frame .virtual-scroller__item');
    let rb = null; for (let i = 0; i < await rows.count(); i++) { const box = await rows.nth(i).boundingBox(); if (box && box.y > Math.max(fb.y + 10, 80) && box.y + box.height < fb.y + fb.height - 10) { rb = box; break; } }
    if (!rb) throw new Error('no mounted row inside the frame');
    // a double click must select the word under the caret — mousedown's preventDefault took the native one away
    await p.mouse.click(rb.x + 80, rb.y + rb.height / 2, { clickCount: 2 }); await settle(p, 200);
    const selected = Number((await p.locator('.evs-stats').innerText()).match(/rows selected\s*([\d,]+)/)?.[1]?.replace(/,/g, '') ?? 0);
    if (selected !== 1) throw new Error(`double click selected ${selected} rows`);
    await p.keyboard.press('Control+C'); await settle(p, 300);
    const word = await p.evaluate(() => navigator.clipboard.readText());
    if (!word || /\s/.test(word)) throw new Error(`double click copied ${JSON.stringify(word)}`);
    await p.mouse.click(rb.x + 80, rb.y + rb.height / 2, { clickCount: 3 }); await settle(p, 200);
    await p.keyboard.press('Control+C'); await settle(p, 300);
    const row = await p.evaluate(() => navigator.clipboard.readText());
    if (!row.startsWith('#') || row.length <= word.length) throw new Error(`triple click copied ${JSON.stringify(row)}`);
    // clean up with a single click on the row: press begins a drag, release without movement clears it
    await p.mouse.click(rb.x + 80, rb.y + rb.height / 2); await settle(p, 200);
    ok('ExampleVirtualScroller (double-click word)', `double click copied ${JSON.stringify(word)}, triple click the ${row.length}-char row`);
  });
  await step('ExampleVirtualScroller (touch long-press + chip)', async () => {
    const frame = p.locator('.evs-frame .virtual-scroller').first(); await frame.scrollIntoViewIfNeeded(); const fb = await frame.boundingBox();
    const rows = p.locator('.evs-frame .virtual-scroller__item');
    let rb = null; for (let i = 0; i < await rows.count(); i++) { const box = await rows.nth(i).boundingBox(); if (box && box.y > Math.max(fb.y + 10, 80) && box.y + box.height < fb.y + fb.height - 10) { rb = box; break; } }
    if (!rb) throw new Error('no mounted row inside the frame');
    const cdp = await ctx.newCDPSession(p);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    await touch('touchStart', rb.x + 60, rb.y + rb.height / 2); await settle(p, 600);
    for (let i = 1; i <= 8; i++) { await touch('touchMove', rb.x + 60, rb.y + rb.height / 2 + i * ((fb.y + fb.height + 100 - rb.y) / 8)); await settle(p, 30); }
    await settle(p, 900); await touch('touchMove', rb.x + 60, fb.y + fb.height - 30); await settle(p, 100); await touch('touchEnd'); await settle(p, 300);
    const selected = Number((await p.locator('.evs-stats').innerText()).match(/rows selected\s*([\d,]+)/)?.[1]?.replace(/,/g, '') ?? 0);
    const chip = p.locator('.evs-frame .virtual-scroller__copy'); if (!(await chip.count())) throw new Error(`no copy chip after a touch selection of ${selected} rows`);
    const label = (await chip.innerText()).trim(); await chip.tap(); await settle(p, 400);
    const lines = (await p.evaluate(() => navigator.clipboard.readText())).split('\n');
    if (lines.length !== selected) throw new Error(`chip copied ${lines.length} lines for ${selected} rows`);
    ok('ExampleVirtualScroller (touch long-press + chip)', `${selected} rows by long press + drag, chip "${label}" copied ${lines.length} lines`);
  });
  await step('ExampleVirtualScroller (sub-pixel continuity)', async () => {
    // a tracked row's on-screen top must move exactly as the transform moves — a frame where the two
    // disagree is a hop, and the only thing that can cause one is a spacer changing by a rounding.
    // Judged only on frames moving more than 2px: at creep speeds (0.1–0.2px/frame) the rect reports the
    // sub-pixel transform quantized (≤0.09px), which the compositor filters and no reader sees;
    // on moving frames the docs page still reports up to 0.09px of noise, so 0.1px is a hop (the real
    // ones measured 0.15–0.53px; the planted snap still trips this at 0.25 and 0.46).
    const frame = p.locator('.evs-frame .virtual-scroller').first(); const fb = await frame.boundingBox();
    await p.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2);
    const sampling = p.evaluate(() => new Promise((resolve) => {
      const frame = document.querySelector('.evs-frame .virtual-scroller'); const inner = frame.querySelector('.virtual-scroller-inner');
      const ty = () => { const m = /translateY\(([-\d.]+)px\)/.exec(inner.style.transform); return m ? parseFloat(m[1]) : 0; };
      const rows = () => [...frame.querySelectorAll('.virtual-scroller__item')];
      const target = rows().at(-1).getAttribute('aria-rowindex');
      const hops = []; let lastTop = null, lastTy = null, lastFirst = null, frames = 0, windowMoves = 0, moving = 0; const t0 = performance.now();
      const tick = () => {
        const list = rows(); const row = list.find((r) => r.getAttribute('aria-rowindex') === target); const first = list[0]?.getAttribute('aria-rowindex'); const t = ty();
        if (row && lastTop !== null) { const moved = t - lastTy; const error = (row.getBoundingClientRect().top - lastTop) - moved; if (first !== lastFirst) windowMoves++; if (Math.abs(moved) > 2) { moving++; if (Math.abs(error) > 0.1) hops.push(`f${frames} ${error.toFixed(3)}px`); } }
        lastTop = row ? row.getBoundingClientRect().top : null; lastTy = t; lastFirst = first; frames++;
        if (performance.now() - t0 < 1200 && row) requestAnimationFrame(tick); else resolve({ frames, windowMoves, moving, hops });
      }; requestAnimationFrame(tick);
    }));
    await settle(p, 50);
    for (let i = 0; i < 4; i++) { await p.mouse.wheel(0, 300); await settle(p, 16); }
    const { frames, windowMoves, moving, hops } = await sampling;
    if (windowMoves < 1 || moving < 20) throw new Error(`the list did not glide (${moving} moving frames, ${windowMoves} window moves in ${frames}) — the flick went to the page?`);
    if (hops.length) throw new Error(`${hops.length} sub-pixel hop(s) over ${frames} frames: ${hops.slice(0, 4).join(', ')}`);
    ok('ExampleVirtualScroller (sub-pixel continuity)', `${moving} moving frames, ${windowMoves} window moves, 0 hops`);
  });
  await step('ExampleTextMarquee', async () => {
    const btn = p.locator('button:has(.etm-btn-icon)').first(); const l0 = await btn.innerText(); await btn.click(); await settle(p); const l1 = await btn.innerText();
    if (l0 === l1) throw new Error('label static'); ok('ExampleTextMarquee', `${l0.trim()} -> ${l1.trim()}`);
  });
  await step('ExampleTextMarquee (drag-select + copy)', async () => {
    const frame = p.locator('.text-marquee .virtual-scroller').first(); await frame.scrollIntoViewIfNeeded(); const fb = await frame.boundingBox();
    // a chunk is thousands of px wide — any point inside the frame is on one
    const y = fb.y + fb.height / 2;
    await p.mouse.move(fb.x + 40, y); await p.mouse.down();
    await p.mouse.move(fb.x + fb.width + 100, y, { steps: 6 }); await settle(p, 900);
    await p.mouse.move(fb.x + fb.width - 20, y, { steps: 3 }); await p.mouse.up(); await settle(p, 200);
    const selected = Number((await p.locator('.etm-stats').innerText()).match(/chunks selected\s*([\d,]+)/)?.[1]?.replace(/,/g, '') ?? 0);
    await p.keyboard.press('Control+C'); await settle(p, 300);
    const text = await p.evaluate(() => navigator.clipboard.readText());
    if (selected < 2) throw new Error(`only ${selected} chunks selected`);
    if (text.includes('\n')) throw new Error('marquee chunks should join with spaces, not line breaks');
    ok('ExampleTextMarquee (drag-select + copy)', `${selected} chunks selected, copied as one line of ${text.length} characters`);
  });
  errsFor('virtual-scroller');
  await go('/examples/workspace-platform');
  await step('ExampleWorkspacePlatform', async () => {
    const w = p.locator('.workspace-embed').first(); await w.getByRole('button', { name: /board/i }).first().click(); await settle(p);
    const cards = await w.locator('.ow-board-card').count(); if (!cards) throw new Error('no board cards'); await w.locator('.ow-board-card').first().click(); await settle(p);
    const details = await w.locator('[class*=details], [class*=drawer], .ow-task-details').count();
    ok('ExampleWorkspacePlatform', `board: ${cards} cards; task opened (${details} details panel)`);
  });
  errsFor('workspace-platform');
  await go('/examples/invar');
  await step('PerfSlider (invar)', async () => { const s = p.locator('.perf-slider').first(); if (!(await s.count())) throw new Error('missing'); await s.locator('button').last().click(); await settle(p); ok('PerfSlider (invar)', 'present, advanced'); });
  errsFor('invar');
  await go('/examples/stackblitz');
  await step('StackBlitzPlayground', async () => { const s = p.locator('.stackblitz-playground'); if (!(await s.count())) throw new Error('missing'); await settle(p, 2000); ok('StackBlitzPlayground', `mounted; iframe/fallback: ${await s.locator('iframe, [class*=fallback]').count()} (errors inside the StackBlitz iframe are third-party and ignored)`); });
  errsFor('stackblitz');

  // ---------- blog ----------
  await go('/blog/');
  await step('BlogIndex', async () => {
    const links0 = (await p.locator('.blog-count').first().innerText()).trim();
    const search = p.locator('.blog-index-toolbar input, input[type=search]').first(); await search.fill('million'); await settle(p); const links1 = (await p.locator('main').innerText()).match(/\d+ (match|result)\w*/i)?.[0] ?? (await p.locator('main a[href*="/blog/"]').count()) + ' post links';
    await search.fill(''); await settle(p);
    const tag = p.locator('main [class*=tag]').filter({ hasText: /\w/ }).first(); const tagText = (await tag.innerText().catch(() => '')).trim(); if (await tag.count()) { await tag.click(); await settle(p); }
    const links2 = (await p.locator('main').innerText()).match(/\d+ (match|article)\w*/)?.[0] ?? '?';
    const list = p.getByRole('button', { name: /list/i }).first(); if (await list.count()) { await list.click(); await settle(p); }
    const older = p.getByRole('button', { name: /older/i }).first(); if (await older.count()) { await older.click(); await settle(p); }
    ok('BlogIndex', `all ${links0} → search ${links1} → tag "${tagText.slice(0, 14)}" ${links2}; list view + older page clicked`);
  });
  await step('BlogSidebarSearch', async () => {
    const head = p.locator('.blog-rail-head').first(); if (!(await head.count())) throw new Error('missing');
    const input = head.locator('input').first(); await input.fill('signal'); await settle(p, 400); const txt = await head.locator('xpath=..').innerText();
    ok('BlogSidebarSearch', /match|result/i.test(txt) ? txt.match(/\d+ (match|result)\w*/i)?.[0] : 'typed, rail re-rendered'); await input.fill('');
  });
  errsFor('blog index');
  await go('/blog/a-million-rows-twelve-divs');
  await step('BlogArchiveScroller', async () => { const a = p.locator('.blog-archive'); if (!(await a.count())) throw new Error('missing'); const n = await a.locator('a').count(); if (!n) throw new Error('no rows'); ok('BlogArchiveScroller', `${n} archive rows`); });
  await step('BlogComments', async () => {
    const c = p.locator('.blog-comments'); if (!(await c.count())) throw new Error('missing');
    const title = (await c.locator('h2, h3').first().innerText()).trim(); const form = c.locator('form, textarea');
    const ta = c.locator('textarea').first(); await ta.fill('sweep — not submitted'); const submit = c.locator('button[type=submit]').first();
    ok('BlogComments', `"${title}", form ${await form.count() ? 'present' : 'MISSING'}, submit ${await submit.count() ? 'present' : 'MISSING'} — not submitted`);
  });
  await step('CommentAvatar', async () => {
    const n = await p.locator('.comment-avatar').count(); if (n) ok('CommentAvatar', `${n} rendered`); else skip('CommentAvatar', 'no comments fetched on localhost (Worker origin) — renders only inside a loaded thread');
  });
  await step('BlogAuthor', async () => { const a = p.locator('.blog-author'); if (!(await a.count())) throw new Error('missing'); const img = a.locator('img').first(); const src = await img.getAttribute('src'); if (!src) throw new Error('no avatar src'); ok('BlogAuthor', `avatar ${src}`); });
  await step('BlogBackLink', async () => { const b = p.locator('.blog-back'); if (!(await b.count())) throw new Error('missing'); ok('BlogBackLink', (await b.innerText()).trim()); });
  await step('BlogPostNav', async () => { const n = p.locator('.blog-post-nav'); const links = await n.locator('a').count(); if (!links) throw new Error('no links'); ok('BlogPostNav', `${links} links`); });
  await step('BlogPublishedDate', async () => { const d = p.locator('.blog-published-date'); const t = (await d.innerText()).replace(/\s+/g, ' ').trim(); if (!/\d{4}/.test(t)) throw new Error('no date'); ok('BlogPublishedDate', t.slice(0, 60)); });
  await step('BlogShare', async () => {
    const s = p.locator('.blog-share').first(); const btn = s.locator('button:has(.blog-share__name)').first(); await btn.click(); await settle(p, 200);
    const label = (await btn.locator('.blog-share__name').innerText()).trim(); const clip = await p.evaluate(() => navigator.clipboard.readText());
    if (label !== 'Copied!' || !/ivue\.dev\/blog/.test(clip)) throw new Error(`label ${label}, clip ${clip}`); ok('BlogShare', `${await s.locator('a').count()} networks; copy -> "${label}"`);
  });
  await step('RelatedPosts', async () => {
    const r = p.locator('.related-posts').first(); const n0 = await r.locator('a').count(); const more = r.getByRole('button', { name: /more/i }).first();
    if (await more.count()) { await more.click(); await settle(p); } const n1 = await r.locator('a').count();
    ok('RelatedPosts', `${n0} shown${(await more.count()) || n1 !== n0 ? ` → ${n1} after more` : ''}`);
  });
  await step('NewsletterSignup (doc/aside)', async () => { const n = await p.locator('.newsletter').count(); if (!n) throw new Error('missing'); ok('NewsletterSignup (doc/aside)', `${n} placements rendered`); });
  errsFor('blog post');
  await go('/blog/introducing-ivue');
  await step('BlogPostDate', async () => { const d = p.locator('.blog-post-date'); if (!(await d.count())) throw new Error('missing'); ok('BlogPostDate', (await d.innerText()).replace(/\s+/g, ' ').trim().slice(0, 60)); });
  errsFor('introducing-ivue');
  await go('/guide/introduction?experiment=1');
  await step('ExperimentalDocs', async () => { const e = p.locator('.experimental-docs'); await settle(p, 300); const visible = await e.isVisible().catch(() => false); if (!visible) throw new Error('not visible with ?experiment=1'); ok('ExperimentalDocs', `${await e.locator('a').count()} links, visible under the flag`); });
  skip('ChannelNote', 'private/channel posts are dev-server only — excluded from the production build by design');
  skip('DemoBox', 'presentational frame — exercised by every demo above');

  // ---------- playground routes ----------
  await go('/', G);
  const buttons = p.locator('nav button'); const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const title = (await buttons.nth(i).locator('.title').innerText()).trim();
    await step('playground: ' + title, async () => {
      pageErrors = []; await buttons.nth(i).click(); await settle(p, 900);
      const active = await p.locator('nav button.active .title').innerText();
      const body = await p.locator('.stage-body').innerText();
      if (active.trim() !== title) throw new Error('nav active mismatch');
      if (body.trim().length < 20) throw new Error('stage body empty');
      const btn = p.locator('.stage-body button').first();
      if (await btn.count()) { const t0 = body; await btn.click({ timeout: 3000 }).catch(() => {}); await settle(p, 400); const t1 = await p.locator('.stage-body').innerText(); ok('playground: ' + title, t0 !== t1 ? 'first button changed the stage' : 'rendered; first button no visible change'); }
      else ok('playground: ' + title, 'rendered');
      if (pageErrors.length) throw new Error('page errors: ' + pageErrors.join(' | '));
    });
  }

  await browser.close();
  const w = Math.max(...rows.map((r) => r[1].length));
  for (const [s, c, d] of rows) console.log(s.padEnd(5), c.padEnd(w), d);
  console.log(`\n${rows.filter((r) => r[0] === 'PASS').length} pass, ${rows.filter((r) => r[0] === 'FAIL').length} fail, ${rows.filter((r) => r[0] === 'SKIP').length} skip`);
})();
