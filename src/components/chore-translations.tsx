import { LANGS, LANG_NAMES, messages, type Lang } from "@/lib/i18n";

/** Collapsible optional chore names per language, for the add/edit chore forms. */
export function ChoreTranslations({
  idPrefix,
  lang,
  values,
  dark = false,
}: {
  idPrefix: string;
  lang: Lang;
  values?: Partial<Record<Lang, string>>;
  dark?: boolean;
}) {
  const t = messages(lang);
  const filled = LANGS.some((l) => values?.[l]);
  return (
    <details className="t-translations" open={filled || undefined}>
      <summary className={`t-pill ${dark ? "t-pill--on-ink" : ""}`}>{t.translations}</summary>
      <div className="t-translations-body">
        <p className="t-translations-hint">{t.translationsHint}</p>
        {LANGS.map((l) => (
          <div key={l}>
            <label htmlFor={`${idPrefix}-${l}`} className="t-sr">
              {t.nameIn(LANG_NAMES[l])}
            </label>
            <input
              id={`${idPrefix}-${l}`}
              name={`title_${l}`}
              lang={l}
              maxLength={200}
              defaultValue={values?.[l] ?? ""}
              placeholder={t.nameIn(LANG_NAMES[l])}
              className={`t-input ${dark ? "t-input--dark" : ""}`}
            />
          </div>
        ))}
      </div>
    </details>
  );
}
