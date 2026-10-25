"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Compass, MousePointerClick, X } from "lucide-react";
import { useA11y } from "@/lib/a11y";
import {
  PERMIT_TOUR_STEPS,
  TOUR_START_EVENT,
  isTourComplete,
  markTourComplete,
  placeTourCard,
  registerTourStartHandler,
  tourHoleFromRect,
  type TourRect,
} from "@/lib/tour";

interface ProductTourProps {
  activeTab: "overview" | "graph" | "timeline" | "documents" | "fees" | "inspections";
  setActiveTab: (
    tab: "overview" | "graph" | "timeline" | "documents" | "fees" | "inspections",
  ) => void;
  forceStart?: boolean;
  autoStart?: boolean;
  onBeforeStart?: () => void;
}

export function ProductTour({
  activeTab,
  forceStart = false,
  autoStart = true,
  onBeforeStart,
}: ProductTourProps) {
  const { t } = useA11y();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [hole, setHole] = useState<TourRect | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const scrolledStepRef = useRef<string | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const advanceTimerRef = useRef<number | undefined>(undefined);
  const autoStartedRef = useRef(false);

  const step = PERMIT_TOUR_STEPS[index];

  const start = useCallback(() => {
    autoStartedRef.current = true;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    onBeforeStart?.();
    scrolledStepRef.current = null;
    setIndex(0);
    setOpen(true);
  }, [onBeforeStart]);

  const finish = useCallback(() => {
    markTourComplete();
    setOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("tour");
    window.history.replaceState(null, "", url);
    returnFocusRef.current?.focus({ preventScroll: true });
  }, []);

  const next = useCallback(() => {
    if (index >= PERMIT_TOUR_STEPS.length - 1) finish();
    else setIndex((current) => current + 1);
  }, [index, finish]);

  useEffect(() => {
    const unregister = registerTourStartHandler(start);
    const onCustomEvent = () => start();
    window.addEventListener(TOUR_START_EVENT, onCustomEvent);
    return () => {
      unregister();
      window.removeEventListener(TOUR_START_EVENT, onCustomEvent);
    };
  }, [start]);

  useEffect(() => {
    if (autoStartedRef.current || (!forceStart && (!autoStart || isTourComplete()))) return;
    const id = window.setTimeout(() => {
      autoStartedRef.current = true;
      start();
    }, forceStart ? 260 : 450);
    return () => window.clearTimeout(id);
  }, [forceStart, autoStart, start]);

  useEffect(() => {
    if (open) titleRef.current?.focus({ preventScroll: true });
  }, [open, index]);

  useEffect(() => {
    if (!open || !step) return;
    if (activeTab !== step.tab) {
      finish();
    }
  }, [open, step, activeTab, finish]);

  const measureAndScroll = useCallback(() => {
    if (!open || !step) return false;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    const viewport = { width: window.innerWidth, height: window.innerHeight };

    if (!el) {
      setHole(null);
      return false;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      setHole(null);
      return false;
    }

    // If this step hasn't been scrolled into the viewport yet and the target is off-screen
    // or too close to the bottom/top edge, scroll the window cleanly so both target and coach card fit.
    const margin = 84;
    const isOutOfComfortZone =
      rect.top < margin || rect.bottom > viewport.height - margin;

    if (scrolledStepRef.current !== step.id && isOutOfComfortZone) {
      scrolledStepRef.current = step.id;
      const absoluteTop = rect.top + window.scrollY;
      const targetScrollY = Math.max(
        0,
        Math.round(absoluteTop - viewport.height * 0.28),
      );
      window.scrollTo({ top: targetScrollY, behavior: "instant" as ScrollBehavior });
    } else if (scrolledStepRef.current !== step.id) {
      scrolledStepRef.current = step.id;
    }

    const freshRect = el.getBoundingClientRect();
    const nextHole = tourHoleFromRect(freshRect, viewport);
    setHole(nextHole);

    const cardRect = cardRef.current?.getBoundingClientRect();
    const cardSize = {
      width: cardRect?.width || Math.min(360, viewport.width - 32),
      height: cardRect?.height || 215,
    };
    setCardPos(placeTourCard(nextHole, cardSize, viewport));
    return true;
  }, [open, step]);

  useEffect(() => {
    if (!open || !step) return;

    measureAndScroll();

    // Poll briefly while ReactFlow / dynamic graph finishes layout and fitView
    const timers = [60, 150, 280, 450, 700, 1000].map((ms) =>
      window.setTimeout(measureAndScroll, ms),
    );

    const onViewportChange = () => {
      measureAndScroll();
    };

    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    const observer = new MutationObserver(() => {
      measureAndScroll();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
      observer.disconnect();
    };
  }, [open, step, index, measureAndScroll]);

  useEffect(() => {
    if (!open || !step) return;
    const actionKey = step.actionTarget ?? step.target;
    let boundEl: HTMLElement | null = null;

    const advance = () => {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = window.setTimeout(next, 180);
    };

    const bind = () => {
      const candidate = document.querySelector<HTMLElement>(`[data-tour="${actionKey}"]`);
      if (candidate && candidate !== boundEl) {
        boundEl?.removeEventListener("click", advance);
        boundEl = candidate;
        boundEl.addEventListener("click", advance);
      }
    };

    bind();
    const t1 = window.setTimeout(bind, 250);
    const t2 = window.setTimeout(bind, 600);
    return () => {
      window.clearTimeout(advanceTimerRef.current);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      boundEl?.removeEventListener("click", advance);
    };
  }, [open, step, index, next]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); finish(); return; }
      if (!cardRef.current?.contains(event.target as Node)) return;
      if (event.key === "ArrowRight") { event.preventDefault(); next(); }
      if (event.key === "ArrowLeft") { event.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish, next]);

  if (!open || !step) return null;

  const isLast = index === PERMIT_TOUR_STEPS.length - 1;
  const fallbackPos = cardPos ?? { top: 88, left: 24 };

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none"
      role="dialog"
      aria-modal="false"
      aria-labelledby="product-tour-title"
      aria-describedby="product-tour-body"
    >
      {hole ? (
        <div
          className="tour-spotlight pointer-events-none fixed"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
          }}
        />
      ) : (
        <div className="pointer-events-none fixed inset-0 bg-black/45" />
      )}

      <div
        ref={cardRef}
        className="tour-card-slot pointer-events-auto fixed z-10 w-[min(22.5rem,calc(100vw-2rem))]"
        style={{ top: fallbackPos.top, left: fallbackPos.left }}
      >
        <div className="tour-card max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--seal)]">
              <Compass size={14} aria-hidden />
              {index + 1} / {PERMIT_TOUR_STEPS.length}
            </span>
            <button
              type="button"
              onClick={finish}
              aria-label={t("tour.skip")}
              className="inline-flex min-h-11 items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
            >
              {t("tour.skip")}
              <X size={14} aria-hidden />
            </button>
          </div>

          <h3 id="product-tour-title" ref={titleRef} tabIndex={-1} className="mt-2 font-serif text-lg font-bold text-[var(--navy)]">
            {t(step.titleKey)}
          </h3>
          <p id="product-tour-body" className="mt-1.5 text-sm leading-relaxed text-[var(--ink)]">
            {t(step.bodyKey)}
          </p>

          {step.ctaKey ? (
            <div className="tour-tap mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1 text-xs font-semibold text-[var(--navy)]">
              <MousePointerClick size={13} aria-hidden />
              <span>{t(step.ctaKey)}</span>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
            <div className="flex items-center gap-1.5" aria-hidden>
              {PERMIT_TOUR_STEPS.map((item, idx) => (
                <span
                  key={item.id}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === index
                      ? "w-5 bg-[var(--seal)]"
                      : idx < index
                        ? "w-2 bg-[var(--navy)]"
                        : "w-1.5 bg-[var(--line)]"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {index > 0 ? (
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  className="button secondary !min-h-11 !px-2.5 text-xs"
                >
                  <ArrowLeft size={14} aria-hidden />
                  {t("tour.back")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={isLast ? finish : next}
                className="button primary !min-h-11 !px-3 text-xs"
              >
                {isLast ? t("tour.finish") : t("tour.next")}
                {!isLast ? <ArrowRight size={14} aria-hidden /> : null}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
