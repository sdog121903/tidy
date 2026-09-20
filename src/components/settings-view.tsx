import { setLanguage } from "@/app/actions";
import { LANGS, LANG_NAMES, messages, type Lang } from "@/lib/i18n";
import { SubmitButton } from "./submit-button";

export function SettingsView({ lang }: { lang: Lang }) {
  const t = messages(lang);
  return (
    <section aria-labelledby="language" className="t-settings">
      <h2 id="language" className="t-settings-title">
        {t.language}
      </h2>
      <p className="t-settings-hint">{t.languageHint}</p>
      <form action={setLanguage} className="t-lang-options" role="group" aria-labelledby="language">
        {LANGS.map((l) => (
          <SubmitButton
            key={l}
            name="lang"
            value={l}
            lang={l}
            className="t-lang-option"
            aria-pressed={l === lang}
          >
            <span>{LANG_NAMES[l]}</span>
            <span className="t-lang-code" aria-hidden="true">
              {l.toUpperCase()}
            </span>
          </SubmitButton>
        ))}
      </form>
    </section>
  );
}
