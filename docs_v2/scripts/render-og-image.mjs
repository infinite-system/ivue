import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url));
const source = resolve(scriptDirectory, 'og-image.html');
const output = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(scriptDirectory, '../public/og-image.png');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});

await page.goto(pathToFileURL(source).href, { waitUntil: 'networkidle' });
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all(
    [...document.images].map((image) =>
      image.complete
        ? image.decode()
        : new Promise((resolve) => image.addEventListener('load', resolve)),
    ),
  );
});
await page.screenshot({ path: output, type: 'png' });
await browser.close();

console.log(`Rendered ${output}`);
