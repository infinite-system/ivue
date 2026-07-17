import { chromium } from 'playwright';

const playgroundUrl =
  'https://stackblitz.com/github/infinite-system/ivue/tree/main/examples/playground?file=src%2Fexamples%2Findex.ts&initialpath=%2F&view=both&hidedevtools=1&hideNavigation=1&showSidebar=1';

let browser;

try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(playgroundUrl, { waitUntil: 'domcontentloaded' });

  await page.waitForTimeout(20_000);
  const previewStarted = page
    .frames()
    .some((frame) => frame.url().includes('webcontainer.io/'));

  console.log(
    previewStarted
      ? 'StackBlitz playground is warm (preview started).'
      : 'StackBlitz playground warm-up timed out.',
  );
} catch (error) {
  console.warn('StackBlitz playground warm-up failed:', error.message);
} finally {
  await browser?.close();
}
