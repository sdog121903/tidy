"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { DEFAULT_LANG, messages, type Lang } from "@/lib/i18n";
import { Icon } from "./icons";
import "./tidy-checklist.css";

const INK = [0x0b, 0x0b, 0x08];
const ACCENT = [0xfc, 0xf5, 0x35];
const CHECK_AT = 0.52;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (t: number) => `rgb(${ACCENT.map((a, i) => Math.round(a + (INK[i] - a) * t)).join(",")})`;

export type TidyItem = {
  id: number;
  label: string;
  checked: boolean;
  /** Small muted status line under the circle ("Not cleaned yet", "Last cleaned by …"). */
  caption?: React.ReactNode;
  /** Comment thread, shown when the row's comment button is opened. */
  comments?: React.ReactNode;
  commentCount?: number;
  /** Accessible name for the comment button, e.g. "Comment to Laura". */
  commentLabel?: string;
};

type Props = {
  items: TidyItem[];
  /** Persists a tap. Called only when the new state differs from `item.checked`. */
  onToggle?: (id: number, checked: boolean) => Promise<unknown>;
  /** Rows check themselves as they scroll past 52% of the screen (visual only; taps override). */
  autoCheckOnScroll?: boolean;
  /** Rendered at the right of the fixed top bar, before the counter (e.g. the menu button). */
  menu?: React.ReactNode;
  lang?: Lang;
};

/**
 * The "tidy" checklist screen: a yellow circle grows to fill the screen, then the chores
 * rise in one by one as big round buttons.
 */
export function TidyChecklist({ items, onToggle, autoCheckOnScroll = true, menu, lang = DEFAULT_LANG }: Props) {
  const t = messages(lang);
  const [manual, setManual] = useState<Record<number, boolean>>({});
  const [thread, setThread] = useState<number | null>(null);
  const [auto, setAuto] = useState<boolean[]>([]);
  const [prevItems, setPrevItems] = useState(items);
  const [, startTransition] = useTransition();

  // When saved state changes underneath us (another device, the admin), let it win over stale taps.
  if (prevItems !== items) {
    const was = new Map(prevItems.map((it) => [it.id, it.checked]));
    const next = { ...manual };
    for (const it of items) {
      if (it.id in next && was.get(it.id) !== it.checked && next[it.id] !== it.checked) delete next[it.id];
    }
    setPrevItems(items);
    setManual(next);
  }

  const rows = items.map((it, i) => ({
    ...it,
    num: String(i + 1).padStart(2, "0"),
    on: manual[it.id] ?? (it.checked || (autoCheckOnScroll && !!auto[i])),
  }));
  const count = rows.filter((r) => r.on).length;
  const total = rows.length;

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current!;
    const stage = stageRef.current!;
    const circle = circleRef.current!;
    const content = contentRef.current!;
    const bar = barRef.current!;
    const cssDriven = CSS.supports("animation-timeline: view()");
    const reduceQuery = matchMedia("(prefers-reduced-motion: reduce)");

    let H = 0;
    let D0 = 0;
    let halfDiagonal = 0;
    let smax = 1;
    let rowCenters: number[] = [];
    let lastAuto = "";
    let raf = 0;

    const measure = () => {
      H = stage.clientHeight;
      const W = root.clientWidth;
      D0 = circle.offsetWidth;
      halfDiagonal = Math.hypot(W, H) / 2;
      // Big enough that the solid 74% core reaches every corner.
      smax = (Math.hypot(W, H) / (0.74 * D0)) * 1.06;
      circle.style.setProperty("--tidy-smax", smax.toFixed(4));
      rowCenters = rowRefs.current.map((li) => (li ? li.offsetTop + li.offsetHeight / 2 : 0));
    };

    const frame = () => {
      raf = 0;
      const reduced = reduceQuery.matches;
      const rootRect = root.getBoundingClientRect();
      const s = Math.max(0, -rootRect.top);

      // Phase A: circle grows over the first 0.8 screens of scroll.
      const e = (1 - Math.cos(Math.PI * clamp01(s / (0.8 * H)))) / 2;
      const scale = 1 + (smax - 1) * e;
      const coverage = (D0 * 0.5 * 0.74 * scale) / halfDiagonal;
      if (!cssDriven && !reduced) circle.style.transform = `scale(${scale.toFixed(4)})`;
      stage.dataset.covered = String(reduced || coverage >= 1.02);
      bar.style.color = reduced ? mix(1) : mix(smooth(clamp01((coverage - 0.75) / 0.15)));
      bar.dataset.hidden = String(rootRect.bottom < bar.offsetHeight);

      // Phase B: rows rise in as their centre enters the bottom third.
      const contentTop = content.getBoundingClientRect().top;
      const autoNow: boolean[] = [];
      const last = rowRefs.current.length - 1;
      rowRefs.current.forEach((li, i) => {
        if (!li) return;
        const yc = contentTop + rowCenters[i];
        autoNow.push(yc < CHECK_AT * H);
        if (cssDriven || reduced) return;
        // The page stops right under the last row, so it has less scroll to rise in.
        const r = smooth(clamp01((H - yc) / ((i === last ? 0.16 : 0.34) * H)));
        li.style.opacity = r.toFixed(3);
        li.style.transform = `translate3d(0, ${((1 - r) * H * 0.1).toFixed(1)}px, 0) scale(${(0.82 + 0.18 * r).toFixed(3)})`;
      });
      const key = autoNow.join();
      if (key !== lastAuto) {
        lastAuto = key;
        setAuto(autoNow);
      }
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const remeasure = () => {
      measure();
      schedule();
    };

    remeasure();
    const ro = new ResizeObserver(remeasure);
    ro.observe(root);
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", remeasure);
    reduceQuery.addEventListener("change", remeasure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      removeEventListener("scroll", schedule);
      removeEventListener("resize", remeasure);
      reduceQuery.removeEventListener("change", remeasure);
    };
  }, [total]);

  const toggle = (id: number, saved: boolean, next: boolean) => {
    setManual((m) => ({ ...m, [id]: next }));
    if (onToggle && next !== saved) {
      startTransition(async () => {
        try {
          await onToggle(id, next);
        } catch {
          setManual((m) => {
            const rest = { ...m };
            delete rest[id];
            return rest;
          });
        }
      });
    }
  };

  const moveCursor = (e: React.PointerEvent) => {
    const c = cursorRef.current;
    if (!c || e.pointerType !== "mouse") return;
    c.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    c.dataset.in = "true";
  };
  const setHover = (on: boolean) => {
    if (cursorRef.current) cursorRef.current.dataset.hover = String(on);
  };

  return (
    <div
      ref={rootRef}
      lang={lang}
      className="tidy"
      onPointerMove={moveCursor}
      onPointerLeave={() => cursorRef.current && (cursorRef.current.dataset.in = "false")}
    >
      <div ref={stageRef} className="tidy-stage" aria-hidden="true">
        <div ref={circleRef} className="tidy-circle" />
      </div>

      <div ref={contentRef} className="tidy-content">
        <section className="tidy-hero">
          <h1 className="tidy-title">tidy</h1>
          <p className="tidy-subtitle">{t.heroSubtitle}</p>
        </section>

        <ol className="tidy-list">
          {rows.map((r, i) => (
            <li
              key={r.id}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              className="tidy-row"
            >
              <button
                type="button"
                className="tidy-btn"
                aria-pressed={r.on}
                aria-label={r.label}
                onClick={() => toggle(r.id, r.checked, !r.on)}
                onPointerEnter={() => setHover(true)}
                onPointerLeave={() => setHover(false)}
              >
                <span className="tidy-fill" />
                <span className="tidy-inner">
                  <span className="tidy-mark-box">
                    <span className="tidy-num">{r.num}</span>
                    <svg className="tidy-check" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12.5 L10 17.5 L19 7" />
                    </svg>
                  </span>
                  <span className="tidy-label">{r.label}</span>
                </span>
              </button>
              {(r.caption || r.comments) && (
                <div className="tidy-meta">
                  {r.caption && <p className="tidy-caption">{r.caption}</p>}
                  {r.comments && (
                    <button
                      type="button"
                      className="tidy-comment-btn"
                      aria-label={`${r.commentLabel ?? t.comments}${r.commentCount ? ` (${r.commentCount})` : ""}`}
                      aria-expanded={thread === r.id}
                      aria-controls={`thread-${r.id}`}
                      onClick={() => setThread(thread === r.id ? null : r.id)}
                      onPointerEnter={() => setHover(true)}
                      onPointerLeave={() => setHover(false)}
                    >
                      <Icon name="chat" />
                      {!!r.commentCount && <span className="tidy-comment-count">{r.commentCount}</span>}
                    </button>
                  )}
                </div>
              )}
              {r.comments && thread === r.id && (
                <div id={`thread-${r.id}`} className="tidy-thread">
                  {r.comments}
                </div>
              )}
            </li>
          ))}
        </ol>

        <div className="tidy-done" data-show={total > 0 && count === total}>
          <p>{t.allDone}</p>
        </div>
      </div>

      <div ref={barRef} className="tidy-bar">
        <span className="tidy-wordmark">tidy</span>
        <div className="tidy-bar-right">
          {menu}
          <div className="tidy-counter" role="status" aria-label={t.counterLabel(count, total)}>
            {count}/{total}
          </div>
        </div>
      </div>

      <div ref={cursorRef} className="tidy-cursor" aria-hidden="true" />
    </div>
  );
}
