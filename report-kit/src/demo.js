// npm run demo  ->  writes out/weekly-report.email.html, .email.txt and .pdf from sample-data.json
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { renderEmail, renderPdf } = require('./render-report');

(async () => {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'sample-data.json'), 'utf8'));
  const out = path.join(__dirname, '..', 'out');
  fs.mkdirSync(out, { recursive: true });
  const email = renderEmail(raw);
  fs.writeFileSync(path.join(out, 'weekly-report.email.html'), email.html);
  fs.writeFileSync(path.join(out, 'weekly-report.email.txt'), email.text);
  const browser = await chromium.launch();
  fs.writeFileSync(path.join(out, 'weekly-report.pdf'), await renderPdf(raw, browser));
  await browser.close();
  console.log('Subject:', email.subject, '\nWrote', out);
})();
