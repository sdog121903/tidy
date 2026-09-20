"use client";

import { useState } from "react";
import { deleteChore, moveChore, resetThisWeek, setActive, updateChore } from "@/app/actions";
import { messages, type Lang } from "@/lib/i18n";
import { ChoreTranslations } from "./chore-translations";
import { Icon } from "./icons";
import { SubmitButton } from "./submit-button";

type Chore = {
  id: number;
  title: string;
  titles: { main: string; en: string; fr: string; es: string };
  notes: string;
  active: boolean;
};

/** Chore list as an accordion: one chore open at a time. */
export function ManageChores({ chores, lang }: { chores: Chore[]; lang: Lang }) {
  const t = messages(lang);
  const [open, setOpen] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);

  if (chores.length === 0) return <p className="t-confirm">{t.noneYet}</p>;

  return (
    <ul className="t-chores">
      {chores.map((c, i) => {
        const isOpen = open === c.id;
        const hidden = <input type="hidden" name="choreId" value={c.id} />;
        return (
          <li key={c.id} className="t-chore" data-inactive={!c.active}>
            <button
              type="button"
              className="t-chore-toggle"
              aria-expanded={isOpen}
              aria-controls={`chore-${c.id}`}
              onClick={() => {
                setOpen(isOpen ? null : c.id);
                setConfirming(null);
              }}
            >
              <span>
                {c.title}
                {!c.active && <small>{t.deactivated}</small>}
              </span>
              <span className="t-edit">
                {t.edit}
                <Icon name="sliders" />
              </span>
            </button>

            {isOpen && (
              <div id={`chore-${c.id}`} className="t-chore-body">
                <form action={updateChore}>
                  {hidden}
                  <label htmlFor={`chore-name-${c.id}`} className="t-sr">
                    {t.choreName}
                  </label>
                  <input id={`chore-name-${c.id}`} name="title" required maxLength={200} defaultValue={c.titles.main} className="t-input" />
                  <label htmlFor={`chore-notes-${c.id}`} className="t-sr">
                    {t.notes}
                  </label>
                  <input
                    id={`chore-notes-${c.id}`}
                    name="notes"
                    maxLength={1000}
                    defaultValue={c.notes}
                    placeholder={t.notesPlaceholder}
                    className="t-input"
                  />
                  <ChoreTranslations idPrefix={`chore-title-${c.id}`} lang={lang} values={c.titles} />
                  <div className="t-row">
                    <SubmitButton className="t-pill">{t.saveChanges}</SubmitButton>
                  </div>
                </form>

                <div className="t-row">
                  <form action={moveChore}>
                    {hidden}
                    <input type="hidden" name="dir" value="up" />
                    <SubmitButton className="t-pill" disabled={i === 0}>
                      <Icon name="arrowUp" />
                      {t.up}
                    </SubmitButton>
                  </form>
                  <form action={moveChore}>
                    {hidden}
                    <input type="hidden" name="dir" value="down" />
                    <SubmitButton className="t-pill" disabled={i === chores.length - 1}>
                      <Icon name="arrowDown" />
                      {t.down}
                    </SubmitButton>
                  </form>
                  <form action={setActive}>
                    {hidden}
                    <input type="hidden" name="active" value={String(!c.active)} />
                    <SubmitButton className="t-pill">
                      <Icon name={c.active ? "pause" : "play"} />
                      {c.active ? t.deactivate : t.activate}
                    </SubmitButton>
                  </form>
                </div>

                <div className="t-row">
                  <button
                    type="button"
                    className="t-pill t-pill--dashed"
                    aria-expanded={confirming === c.id}
                    onClick={() => setConfirming(confirming === c.id ? null : c.id)}
                  >
                    <Icon name="trash" />
                    {t.deleteChore}
                  </button>
                </div>
                {confirming === c.id && (
                  <form action={deleteChore} className="t-row">
                    {hidden}
                    <p className="t-confirm">{t.deleteChoreConfirm}</p>
                    <SubmitButton className="t-pill t-pill--ink">{t.yesDelete}</SubmitButton>
                  </form>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Dashed danger card with a confirmation step. */
export function WipeWeek({ lang }: { lang: Lang }) {
  const t = messages(lang);
  const [open, setOpen] = useState(false);
  return (
    <div className="t-danger">
      <button type="button" className="t-danger-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="refresh" />
        {t.wipeWeek}
      </button>
      {open && (
        <form action={resetThisWeek} className="t-danger-body">
          <p className="t-confirm">{t.wipeWeekConfirm}</p>
          <SubmitButton className="t-pill t-pill--ink">{t.yesWipe}</SubmitButton>
        </form>
      )}
    </div>
  );
}
