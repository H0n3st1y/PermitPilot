# PermitPilot design system

PermitPilot is civic infrastructure. It should read like a well-run public service built with modern
productivity-software discipline: calm, specific, and quick to scan. Every screen answers, in order:
**what do I do next → what is blocking me → what is missing → what will it cost → how long → why → which source says so.**

This file is the source of truth for UI work. Tokens live in `apps/web/app/globals.css`; component
classes live in the same file, grouped by the sections below.

---

## 1. Color tokens

Warm neutrals carry the page; one blue carries action; status colors appear only where they encode status.

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#f6f5f1` | Page background |
| `--surface` | `#fffefb` | Raised containers: roadmap board, tables, forms, popovers |
| `--surface-sunken` | `#efede7` | Tracks, inactive fills, code/trace blocks |
| `--line` | `#dfdbd1` | Hairline dividers and container borders |
| `--line-strong` | `#c5bfb2` | Input borders, emphasized dividers |
| `--ink` | `#1c1d1f` | Primary text |
| `--ink-2` | `#3f4145` | Secondary text in dense areas |
| `--muted` | `#645f56` | Meta text, captions (≥ 5.5:1 on `--bg`) |
| `--primary` | `#1d4b73` | Primary buttons, links, current step, focus of attention |
| `--primary-hover` | `#153a5a` | Primary hover/pressed |
| `--primary-soft` | `#e6eef5` | Selected rows, current-step tint |
| `--ok` / `--ok-soft` | `#2d6a4a` / `#e5f0e8` | Completed / approved |
| `--attention` / `--attention-soft` | `#8a5700` / `#fbf0d9` | Needs attention: overdue, missing docs, estimated values |
| `--blocked` / `--blocked-soft` | `#a0302e` / `#f8e6e3` | Blocked, changes requested, destructive |
| `--focus` | `#0b57d0` | Focus ring only |

Legacy aliases (`--paper`, `--card`, `--navy`, `--warn`, `--danger`, `--info`) map onto these tokens so older utility
classes keep working. Do not use aliases in new code.

**Surface texture.** `--grain` is a tiled SVG noise image painted on `body` under `--bg`. It gives the warm
neutrals the tooth of printed stock: legible as texture up close, invisible as noise at reading distance. It is
the only non-flat fill in the system, and it is a property of the page, never of a component. High contrast and
print set `--grain: none`.

**High contrast mode** (`html.high-contrast`) swaps every token to black/white/yellow and adds visible borders on
all indicators. Never hard-code a color outside tokens except in the high-contrast overrides.

## 2. Typography

Source Sans 3 for everything; Source Serif 4 only for page titles (one per page) and the landing headline.

| Role | Size / line-height | Weight | Class |
| --- | --- | --- | --- |
| Landing headline | 30px → 40px (≥ 768px) / 1.15 | Serif 600 | `.display` |
| Page title (h1) | 26px → 30px / 1.2 | Serif 600 | `.page-title` |
| Section heading (h2) | 20px / 1.3 | Sans 600 | `.h2` |
| Sub-heading (h3) | 16px / 1.4 | Sans 600 | `.h3` |
| Body | 16px / 1.55 | 400 | default |
| Small / meta | 14px / 1.45 | 400 | `.meta` |
| Caption / label | 12.5px / 1.3, +0.02em | 600 | `.label` |

Rules: at most three sizes in one component. No uppercase text except `.label` on table headers and fact labels.
Numbers that users compare (fees, dates, counts) use `font-variant-numeric: tabular-nums`.

## 3. Spacing scale

4px base: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`. Use Tailwind steps `1 2 3 4 6 8 12 16` only.

- Inside a control: 8–12px. Between related rows: 0 (use a divider) or 8px.
- Between sections on a page: 32px (24px under 640px).
- Page top padding: 24px; bottom padding: 64px.
- Never add whitespace to fill space. Dense is fine when it is aligned.

## 4. Layout and grid

- Max content width 1120px (`.container`), 16px gutters (24px ≥ 640px).
- Forms and reading pages: max 680px.
- Project pages: one column for the roadmap, timeline, documents, fees, and inspections. Permit detail uses
  main (minmax(0, 1fr)) + aside (320px) at ≥ 1024px, and one column below that.
- Align to a shared left edge. Metadata columns right-align numbers.

## 5. Shape and elevation

- Radii: `--r-sm 4px` (tags, markers), `--r-md 6px` (buttons, inputs), `--r-lg 8px` (containers).
  Circles only for status markers and avatars. No pill-shaped buttons or tabs.
- Borders, not shadows, define containers. Shadows (`--shadow-float`) are reserved for things that float: popovers,
  menus, and toasts.

## 6. Components

**Containers.** `.surface` is a bordered block for a coherent interactive unit (the roadmap board, a table, a form).
Sections of a page are **not** wrapped in containers. They are a heading plus content, separated by
32px or a `.rule`. Never nest a surface in a surface.

**Buttons.** `.btn` + `.btn-primary | .btn-secondary | .btn-quiet | .btn-danger`, sizes default (40px) and `.btn-sm`
(34px). On coarse pointers every button is at least 44px tall. One primary button per view region. Buttons keep
their width in loading states (spinner replaces the icon, label stays).

**Status.** One status per step, shown as `StatusText` (colored dot + text), never as a filled uppercase pill.
Step state (completed/current/upcoming/blocked/attention) is shown by the roadmap marker; the permit status
(Not Started … Approved) is shown as text. Do not show both as badges side by side.

| State | Marker | Color |
| --- | --- | --- |
| Completed | filled check | `--ok` |
| Current | filled ring | `--primary` |
| Needs attention | filled triangle | `--attention` |
| Blocked | lock | `--blocked` |
| Upcoming | hollow ring | `--line-strong` |

**Tags.** `.tag` (4px radius, 12.5px) only for facts a user filters or decides on: Required/Optional, fee basis,
citation verification. Never decorative.

**Tabs.** Underline tabs with counts (`Documents 6/8`). Active tab: ink text + 2px primary underline.

**Callouts.** `.callout` with a 3px left border in the state color and a soft tint. For attention, blocked, and
info notes only. One callout per region.

**Inputs.** 44px tall, 6px radius, `--line-strong` border, label above, hint below, error below the hint.
Choice lists (radio/checkbox) are rows in a divided list, not separate cards.

**Tables.** Hairline row dividers, `.label` headers, numbers right-aligned and tabular. Under 640px, rows stack.

**Popover.** Citation details: anchored popover on desktop, bottom sheet under 640px. Escape closes and returns focus.

## 7. Interaction patterns

- The next action is always visible on the roadmap and at the top of permit detail, with the primary button that
  performs it (for example "Mark as submitted") instead of sending users to a generic form.
- Every mutation gives immediate feedback: the changed element updates in place, and a toast confirms the save
  or reports the failure. Failures keep the previous state and the user's input.
- Views inside a project are URL state (`?view=`, `?step=`) updated with `history.pushState`: instant, and Back
  and Forward work. Focus moves to the view heading after navigation.
- Destructive actions confirm (native confirm is acceptable) and name the object.
- Validation runs on Continue/submit, then live-clears as the field is fixed. Never on first keystroke.

## 8. Motion

- 120ms (`--t-fast`) for hover/press, 180ms (`--t-med`) for disclosure/popover/tab content, 240ms (`--t-slow`)
  max for anything else.
- Two curves. `--ease` for state that snaps into place. `--ease-out` for anything the eye tracks to a stop:
  reveals, the tab underline, the link rule, the disclosure, the progress fill, the button press.
- Animate `opacity` and `transform` only; progress uses `transform: scaleX`. The one exception is
  `::details-content`, where `block-size` is the thing being animated and there is no transform equivalent.
- Animate only what changed: a status marker pulses once when its status changes; the rest of the roadmap
  stays still.
- `prefers-reduced-motion: reduce` disables all transitions and animations. State must never depend on motion.

### Scroll-linked motion

Section 15 of `globals.css` holds animations driven by scroll position rather than by a clock, so nothing plays
on its own and nothing is mid-flight when the user stops scrolling.

| Class / target | Behaviour |
| --- | --- |
| `.reveal` | Settles a section in (14px rise + fade) across its own entry into the viewport. For sections, never for controls or anything above the fold that a user acts on immediately. |
| `.stagger` | 50ms cascade across a list's direct children, capped at 200ms. One list per page at most: a page of staggered entrances reads as slow, not smooth. |
| `.site-header::after` | Shadow fades in over the first 4rem of scroll, because a sticky header that has left the top of the page is genuinely floating (see section 5). ≥ 768px only, where the header is sticky. |

Rules for anything added here:

- Wrap it in `@supports` plus `@media (prefers-reduced-motion: no-preference)`. Engines without
  `animation-timeline` get the static layout, which must be correct on its own.
- Never hide content that has no way to be revealed. `@media print` forces every enhanced element to its resting
  state, because scroll-driven animations never run on paper and the page would otherwise print blank.

## 9. Responsive rules

Test at 375, 390, 768, 1024, and 1280px.

- No horizontal page scroll. Only the tab bar and wide tables may scroll inside their own container.
- Under 768px the header collapses to brand + Menu button; display options live in the menu.
- The roadmap stages stack vertically under 1024px; nodes are full width.
- Timeline bars keep their shared axis on mobile; the names sit above the bars.
- Permit detail's status panel follows the next action on mobile instead of sitting in a sidebar.
- Touch targets ≥ 44×44px on coarse pointers.

## 10. Accessibility rules

- WCAG 2.2 AA contrast for all text (4.5:1) and UI boundaries (3:1).
- Visible `:focus-visible` ring (3px `--focus`, 2px offset) on every interactive element. Never remove it.
- Semantic structure: one h1 per page, headings in order, lists for lists, tables for tabular data.
- Status is conveyed by text as well as color and marker shape.
- Live regions: toasts are `role="status"` (errors `assertive`). Loading regions set `aria-busy`.
- High-contrast and Plain English modes must keep working on every component.

## 11. Anti-patterns (do not ship)

- Wrapping every section in a rounded card, or cards inside cards.
- Pill-shaped buttons/tabs, stacks of badges on one item, uppercase status pills.
- Orange uppercase eyebrows above every heading.
- Gradients, glassmorphism, glows, gradient orbs, drop shadows on static content.
- Decorative icons on every heading or feature. Icons must carry meaning (status, action, direction).
- Giant hero type, oversized empty whitespace, "feature grid of six cards".
- Charts without a real axis or meaning.
- Purple/violet "AI" palettes, sparkle icons, "✨ Generated" language.
- Showing the same information twice on one screen (for example state chip + status pill + colored border).
- Full-screen spinners for local actions; content that jumps when data arrives.
