// Turns the raw weekly data from the app into the "view model" both templates use.
// Everything the templates need (labels, widths, translated strings, font CSS) is computed HERE,
// so the templates stay dumb: {{holes}}, {{#each}} and {{#if}} only.
const fs = require('fs');
const path = require('path');

const STRINGS = {
  en: {
    weeklyReport: 'Weekly report',
    doneWord: 'done',
    doneTitle: 'Done',
    todoTitle: 'Still to do',
    nothingDone: 'Nothing checked off yet.',
    allDone: 'Everything is tidy.',
    allDonePill: 'All done',
    ofTotal: (d, t) => `${d} of ${t} chores done this week`,
    open: 'Open tidy',
    wipe: (w) => `Checkmarks wipe ${w}.`,
    pdfNote: 'The PDF version is attached.',
    generated: (g) => `Generated ${g}`,
    sentBy: 'Sent by tidy',
    preheader: (d, t, w) => `${d} of ${t} chores done · week of ${w}`,
  },
  fr: {
    weeklyReport: 'Bilan de la semaine',
    doneWord: 'faites',
    doneTitle: 'Faites',
    todoTitle: 'À faire',
    nothingDone: 'Rien de coché pour l\u2019instant.',
    allDone: 'Tout est en ordre.',
    allDonePill: 'Tout est fait',
    ofTotal: (d, t) => `${d} tâches faites sur ${t} cette semaine`,
    open: 'Ouvrir tidy',
    wipe: (w) => `Les coches s\u2019effacent ${w}.`,
    pdfNote: 'La version PDF est en pièce jointe.',
    generated: (g) => `Généré ${g}`,
    sentBy: 'Envoyé par tidy',
    preheader: (d, t, w) => `${d} tâches faites sur ${t} · semaine du ${w}`,
  },
  es: {
    weeklyReport: 'Reporte semanal',
    doneWord: 'hechos',
    doneTitle: 'Hechos',
    todoTitle: 'Pendientes',
    nothingDone: 'Aún no hay nada marcado.',
    allDone: 'Todo está ordenado.',
    allDonePill: 'Todo hecho',
    ofTotal: (d, t) => `${d} de ${t} quehaceres hechos esta semana`,
    open: 'Abrir tidy',
    wipe: (w) => `Las marcas se borran ${w}.`,
    pdfNote: 'Adjuntamos la versión en PDF.',
    generated: (g) => `Generado ${g}`,
    sentBy: 'Enviado por tidy',
    preheader: (d, t, w) => `${d} de ${t} quehaceres hechos · semana del ${w}`,
  },
};

const emojiRe = /[\p{Extended_Pictographic}‍️]/gu;
// Emoji in names ("Laura 🧡🥾") need an emoji font on the server and get stripped by many mail clients.
const cleanName = (n) => (n.replace(emojiRe, '').replace(/\s+/g, ' ').trim() || n);

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
};

// Fixed month abbreviations (Intl gives "Sept" in en-GB and "sept." in es-ES; we want the same short form everywhere).
function weekLabel(startISO, endISO, locale) {
  const s = new Date(startISO + 'T12:00:00'), e = new Date(endISO + 'T12:00:00');
  const m = MONTHS[locale];
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  return sameMonth
    ? `${s.getDate()} – ${e.getDate()} ${m[e.getMonth()]} ${e.getFullYear()}`
    : `${s.getDate()} ${m[s.getMonth()]} – ${e.getDate()} ${m[e.getMonth()]} ${e.getFullYear()}`;
}

function dayTime(iso, locale, timeZone) {
  const l = { es: 'es-ES', fr: 'fr-FR' }[locale] ?? 'en-GB';
  const dt = new Date(iso);
  const opts = timeZone ? { timeZone } : {};
  const day = new Intl.DateTimeFormat(l, { ...opts, weekday: 'long' }).format(dt);
  const time = new Intl.DateTimeFormat(l, { ...opts, hour: '2-digit', minute: '2-digit', hour12: false }).format(dt);
  return `${day} ${time}`;
}

// Self-hosted font as base64 @font-face (the PDF is rendered on your server: no Google Fonts round-trip, no FOUT).
function fontFaceCss() {
  const dir = path.dirname(require.resolve('@fontsource-variable/bricolage-grotesque/package.json'));
  const css = fs.readFileSync(path.join(dir, 'wght.css'), 'utf8');
  const blocks = css.match(/@font-face\s*{[^}]*}/g) || [];
  return blocks
    .filter((b) => /latin(-ext)?-wght-normal/.test(b))
    .map((b) =>
      b.replace(/url\(\.\/files\/([^)]+)\)/, (_, f) =>
        `url(data:font/woff2;base64,${fs.readFileSync(path.join(dir, 'files', f)).toString('base64')})`)
       .replace("'Bricolage Grotesque Variable'", "'Bricolage Grotesque'"))
    .join('\n');
}

function buildView(raw, opts = {}) {
  const locale = STRINGS[raw.locale] ? raw.locale : 'en';
  const t = STRINGS[locale];
  const people = raw.people.map((p) => {
    const done = p.done.length, total = p.done.length + p.missed.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return {
      name: cleanName(p.name),
      done, total, pct, restPct: 100 - pct,
      allDone: total > 0 && done === total,
      noneDone: done === 0,
      doneChores: p.done,
      missedChores: p.missed,
    };
  });
  const totalDone = people.reduce((a, p) => a + p.done, 0);
  const totalAll = people.reduce((a, p) => a + p.total, 0);
  const wk = weekLabel(raw.weekStart, raw.weekEnd, locale);
  const when = (iso) => dayTime(iso, locale, raw.timeZone);
  return {
    lang: locale,
    appName: 'tidy',
    weekLabel: wk,
    generatedLabel: when(raw.generatedAt),
    wipeLabel: when(raw.wipeAt),
    appUrl: raw.appUrl,
    pdfAttached: !!raw.pdfAttached,
    totals: { done: totalDone, total: totalAll, summary: t.ofTotal(totalDone, totalAll) },
    preheader: t.preheader(totalDone, totalAll, wk),
    people,
    t: {
      weeklyReport: t.weeklyReport, doneWord: t.doneWord, doneTitle: t.doneTitle, todoTitle: t.todoTitle,
      nothingDone: t.nothingDone, allDone: t.allDone, allDonePill: t.allDonePill, open: t.open,
      wipe: t.wipe(when(raw.wipeAt)), pdfNote: t.pdfNote,
      generated: t.generated(when(raw.generatedAt)), sentBy: t.sentBy,
    },
    fontFace: opts.withFont ? fontFaceCss() : '',
  };
}

module.exports = { buildView, cleanName };
