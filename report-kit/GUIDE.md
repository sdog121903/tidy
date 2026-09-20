# tidy — weekly report: email + PDF template guide

Everything the app needs to (1) send the weekly report as a designed email and (2) print the same report as an A4 PDF, in the tidy look (yellow `#FCF535`, ink `#0B0B08`, Bricolage Grotesque, rings instead of boxes, no emoji in the chrome).

Design source of truth: the **Design canvas**, row "tidy — weekly report (email + PDF)" (Email desktop, Email mobile, PDF A4). The boards on the canvas are generated from these same templates, so they match what the app will produce.

## 1. What is in the kit

| File | Purpose |
|---|---|
| `templates/weekly-report.email.hbs` | HTML email (Handlebars). Table-based, inline styles, 600 px, mobile media query, Outlook fallback. |
| `templates/weekly-report.txt.hbs` | Plain-text alternative (multipart/alternative). Required for spam scores and accessibility. |
| `templates/weekly-report.pdf.hbs` | A4 print template (Handlebars + normal modern CSS). Rendered to PDF by headless Chromium. |
| `src/build-view.js` | Turns the app's raw weekly data into a *view model* (labels, percentages, translated strings, week label, font CSS). All logic lives here; templates only have `{{holes}}`, `{{#each}}`, `{{#if}}`. |
| `src/render-report.js` | `renderEmail(raw)` → `{subject, html, text}`; `renderPdf(raw, browser)` → `Buffer`. |
| `sample-data.json`, `samples/` | Sample input and the rendered outputs (PDF, 7-person 3-page PDF, email HTML/TXT, screenshots). |

Install: `npm i handlebars @fontsource-variable/bricolage-grotesque playwright` (the demo uses `npm run demo`).

## 2. Data contract (what the app must provide)

```jsonc
{
  "locale": "en",                       // "en" | "es"  (strings live in build-view.js → STRINGS)
  "weekStart": "2026-09-14",            // Monday, ISO date
  "weekEnd": "2026-09-20",              // Sunday, ISO date
  "generatedAt": "2026-09-20T21:00:00+02:00",
  "wipeAt": "2026-09-20T23:59:00+02:00",// when checkmarks reset (shown in the footer)
  "appUrl": "https://your-tidy-url",    // target of the "Open tidy" button
  "pdfAttached": true,                  // adds "The PDF version is attached." to the email footer
  "people": [
    { "name": "Laura 🧡🥾",             // emoji are stripped from names in both outputs (see §6)
      "done":   ["Hacer la cama"],      // chore titles ticked this week
      "missed": ["Abrir las ventanas"]  // chore titles NOT ticked
    }
  ]
}
```

The app already knows all of this from the Reports screen. Map its data to this shape in one function, e.g. `getWeeklyReportData(weekStart)`. Do not compute percentages or labels there; `buildView` does that.

## 3. Rendering

```js
const { chromium } = require('playwright');
const { renderEmail, renderPdf } = require('./src/render-report');

const raw = await getWeeklyReportData(weekStart);
const email = renderEmail(raw);                 // { subject, html, text }
const browser = await chromium.launch();        // reuse ONE browser for the process; don't launch per request
const pdf = await renderPdf(raw, browser);      // Buffer (A4, background colours on)
```

### PDF specifics (already handled in the template; do not undo)

- `page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })`. Without `printBackground` the yellow and black disappear.
- `@page { margin: 0 }`: Chromium paints page margins **white**. The template keeps the sheet yellow and creates its own top and bottom breathing room with the repeating `<thead>/<tfoot>` spacer rows of `table.pg`. Don't switch to `@page` margins or Playwright's `margin` option.
- Cards use `break-inside: avoid`, so a person's card never splits across pages. 3 people fit on one page; 7 people × 12 chores gives 3 pages (see `samples/`).
- The font is embedded as base64 `@font-face` (from `@fontsource-variable/bricolage-grotesque`) so the server never depends on Google Fonts. Body text is ≥16 px, small captions ≥12 px, text is readable in grayscale.
- The "moon" in the header is a CSS `radial-gradient`. It is fine in Chromium PDF; it is **not** used in the email (see §5).

### Serving the PDF from the app (print button)

Next.js route handler (Node runtime, not edge):

```ts
// app/api/reports/weekly/pdf/route.ts
export const runtime = 'nodejs';
import { chromium } from 'playwright';
import { renderPdf } from '@/report-kit/src/render-report';

export async function GET(req: Request) {
  const week = new URL(req.url).searchParams.get('week') ?? undefined;
  const raw = await getWeeklyReportData(week);          // admin-only: check the session first
  const browser = await getBrowser();                   // module-level singleton
  const pdf = await renderPdf(raw, browser);
  return new Response(pdf, { headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="tidy-weekly-report-${raw.weekStart}.pdf"`,
  }});
}
```

Then the "Print PDF" button on the Reports screen is simply `<a href="/api/reports/weekly/pdf?week=2026-09-14">`. In `next.config` add `serverExternalPackages: ['playwright', 'handlebars']` so Next does not try to bundle them.

## 4. Sending the email

`renderEmail` returns everything for a `multipart/alternative` message; attach the PDF if you want it in the inbox too. Use whichever transport the app already uses; with nodemailer:

```js
await transporter.sendMail({
  from: '"tidy" <no-reply@your-domain>',
  to: recipients,                       // one message per person, or all in "to": your call
  subject: email.subject,               // "tidy — Weekly report · 14 – 20 Sep 2026"
  html: email.html,
  text: email.text,
  attachments: [{ filename: `tidy-weekly-report-${raw.weekStart}.pdf`, content: pdf, contentType: 'application/pdf' }],
});
```

If you attach the PDF, set `pdfAttached: true`; if you don't, set it to `false` (the footer note disappears).

## 5. Email-client rules baked into the template

- **Layout is tables**, `role="presentation"`, inline styles, 600 px max with `width:100%`. Do not "modernise" to flex/grid: Outlook desktop and old Gmail ignore them.
- **Rounded corners** use `border-radius`; Outlook desktop shows square corners. That is accepted graceful degradation. The **Open tidy** button has a VML round-rect for Outlook.
- **No gradients, no background images, no SVG** in the email (Gmail strips SVG, Outlook ignores gradients). The moon is a solid yellow circle; ticks and rings are the text glyphs ✓ and ○ (not emoji).
- **Progress bar** = a two-cell table whose widths are `pct%` / `restPct%` from the view model. When a percentage is 0 or 100 the empty cell is omitted (`{{#if pct}}`), otherwise clients render a 1 px sliver.
- **Font**: Bricolage Grotesque is loaded through a `<link>` (works in Apple Mail / iOS Mail); Gmail and Outlook fall back to Helvetica/Arial. The layout is designed so the fallback still looks good.
- **Preheader**: hidden first line shown next to the subject in the inbox (`{{preheader}}` → "9 of 24 chores done · week of 14 – 20 Sep 2026").
- **Dark mode**: the template declares `color-scheme: light`. The design is already yellow/black, so Apple Mail keeps it. Gmail/Outlook apps may partially invert colours; check a dark-mode screenshot in your test pass (§10).
- **Mobile**: under 620 px the side padding shrinks and the week title, moon and name get smaller (see the "Email · Móvil" board).
- **Size**: 21 KB for 3 people, ~51 KB for 7 people × 12 chores. Gmail clips at 102 KB, so keep it under about 14 people or send one email per person.

## 6. Emoji in names

Names such as "Laura 🧡🥾" are stripped of emoji (`cleanName`) in both outputs: many mail clients drop them and Chromium on a server has no emoji font unless you install one (Debian/Ubuntu: `apt-get install fonts-noto-color-emoji`). If you want them back in the PDF, install that font and remove the `cleanName` call.

## 7. Server requirements for the PDF

- Node 18+, Playwright with Chromium (`npx playwright install --with-deps chromium`). On serverless (Vercel/Netlify) use `@sparticuz/chromium` with `playwright-core`, or render on a small Node container instead; the bundle limit makes plain Playwright a poor fit there.
- Local development (`localhost:3100`) works out of the box once Chromium is installed.

## 8. Changing copy or language

All words are in `STRINGS` in `src/build-view.js` (`en`, `es`). Add a language by adding a block with the same keys and one entry in `MONTHS`. Templates never contain visible copy except the app name (`{{appName}}`).

## 9. Design tokens (if you touch the CSS)

| Token | Value |
|---|---|
| Yellow | `#FCF535` |
| Ink | `#0B0B08` |
| Muted on yellow | `#55530F` (≥6:1 on yellow) |
| Muted on ink | `#D8D22C` (small caps labels) |
| Progress track on yellow | `#D9D42E` |
| Radii | 28 (hero card), 24 (person cards), 18 (to-do panel), 999 (pills, bar) |
| Border | 2 px ink |
| Type | Bricolage Grotesque, headings 800 with `letter-spacing: -0.05em`, body 500 |

## 10. Test checklist

1. `npm run demo`, open `out/weekly-report.email.html`, compare with `samples/`.
2. Edge cases: a person with 0 done (no bar fill, "Nothing checked off yet."), a person with everything done ("Everything is tidy.", no to-do panel), 1 person, 7 people (PDF paginates, cards intact).
3. Send a real test to Gmail (web + iOS app), Apple Mail and Outlook; check the preview line, the button, the bar widths and the attachment name.
4. Open the PDF: yellow on every page (including page 2+), no card cut across pages, text selectable.
5. Run the email through a linter (Litmus/Email on Acid, or `mail-tester.com` for the spam score): the plain-text part must be present.
6. Try `locale: "es"` and a name with an emoji.
