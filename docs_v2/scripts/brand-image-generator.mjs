import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url));

const modes = {
  og: {
    source: 'og-image.html',
    output: '../public/og-image.png',
    viewport: { width: 1200, height: 630 },
  },
  'form-header': {
    source: 'google-form-header.html',
    output: '../public/ivue-google-form-header.png',
    viewport: { width: 1600, height: 400 },
  },
};

const [modeName, sourceOrOutput, blogOutput] = process.argv.slice(2);

// `blog` renders any banner HTML at the blog's 1200x630:
//   node docs_v2/scripts/brand-image-generator.mjs blog <source.html> <output.png>
const mode =
  modeName === 'blog'
    ? {
        source: resolve(process.cwd(), sourceOrOutput ?? ''),
        output: blogOutput,
        viewport: { width: 1200, height: 630 },
      }
    : modes[modeName];
const outputArgument = modeName === 'blog' ? blogOutput : sourceOrOutput;

if (!mode || (modeName === 'blog' && (!sourceOrOutput || !blogOutput))) {
  console.error(
    `Usage: node docs_v2/scripts/brand-image-generator.mjs <${Object.keys(modes).join('|')}> [output]\n` +
      '       node docs_v2/scripts/brand-image-generator.mjs blog <source.html> <output.png>',
  );
  process.exit(1);
}

const source =
  modeName === 'blog' ? mode.source : resolve(scriptDirectory, mode.source);
const output = outputArgument
  ? resolve(process.cwd(), outputArgument)
  : resolve(scriptDirectory, mode.output);

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({
    viewport: mode.viewport,
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
} finally {
  await browser.close();
}

console.log(`Rendered ${modeName}: ${output}`);
