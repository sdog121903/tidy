// Renders the weekly report: HTML email, plain-text alternative and the A4 PDF.
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const { buildView } = require('./build-view');

const TPL = path.join(__dirname, '..', 'templates');
const compile = (f) => Handlebars.compile(fs.readFileSync(path.join(TPL, f), 'utf8'), { noEscape: false });

const emailTpl = compile('weekly-report.email.hbs');
const textTpl = compile('weekly-report.txt.hbs');
const pdfTpl = compile('weekly-report.pdf.hbs');

function renderEmail(raw) {
  const v = buildView(raw);                 // no font embedding: the email links to Google Fonts
  return { html: emailTpl(v), text: textTpl(v), subject: `tidy — ${v.t.weeklyReport} · ${v.weekLabel}`, view: v };
}

function renderPdfHtml(raw) {
  return pdfTpl(buildView(raw, { withFont: true }));
}

// Playwright is only needed for the PDF. Reuse ONE browser between calls in a real app.
async function renderPdf(raw, browser) {
  const html = renderPdfHtml(raw);
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  await page.close();
  return pdf;                                // Buffer
}

module.exports = { renderEmail, renderPdfHtml, renderPdf };
