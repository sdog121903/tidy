"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { leave } from "@/app/actions";
import { messages, type Lang } from "@/lib/i18n";
import { Icon } from "./icons";
import { SubmitButton } from "./submit-button";

const subscribe = () => () => {};

export type NavItem = { href: string; label: string; current: boolean };

/** Menu button that opens a full-screen black panel sliding in from the left. */
export function NavMenu({ items, lang, className = "" }: { items: NavItem[]; lang: Lang; className?: string }) {
  const t = messages(lang);
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key !== "Tab" || !panelRef.current) return;
      // Keep focus inside the panel.
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>("a, button")];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`t-menu-btn ${className}`}
        aria-label={t.menu}
        aria-expanded={open}
        aria-controls="t-nav-panel"
        onClick={() => setOpen(true)}
      >
        <Icon name="menu" />
      </button>
      {mounted &&
        createPortal(
          <div
            ref={panelRef}
            id="t-nav-panel"
            className="t-nav-panel t-on-ink"
            role="dialog"
            aria-modal="true"
            aria-label={t.menu}
            data-open={open}
            inert={!open}
            style={{ "--t-nav-count": items.length } as CSSProperties}
          >
            <div className="t-nav-top">
              <span className="t-wordmark">tidy</span>
              <button type="button" className="t-menu-btn" aria-label={t.closeMenu} onClick={close}>
                <Icon name="close" />
              </button>
            </div>
            <nav aria-label={t.sections}>
              <ul className="t-nav-links">
                {items.map((it) => (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      aria-current={it.current ? "page" : undefined}
                      onClick={() => setOpen(false)}
                    >
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <form action={leave} className="t-nav-foot">
              <SubmitButton className="t-pill t-pill--on-ink">{t.switchUser}</SubmitButton>
            </form>
          </div>,
          document.body,
        )}
    </>
  );
}
