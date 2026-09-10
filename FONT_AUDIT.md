# Font Audit — WedThread

Read-only audit. No files were modified. Scanned all `.tsx`, `.ts`, and `.css` files under `src/` (121 files total; 75 contain some font-family or font-size signal).

## Before the tables: two corrections to the request's premises

- **No `tailwind.config.ts` exists in this project.** It's Tailwind v4, configured entirely in CSS via an `@theme` block in [`src/styles.css`](src/styles.css#L7-L46) — that's what size/font tokens were cross-referenced against instead. There's no `--text-*` overrides in that block, so every `text-sm`/`text-lg`/etc. class below resolves to **Tailwind's built-in default scale**, unmodified by this project.
- **The two "reference" fonts named in the request — Newsreader and Playfair Display — aren't both actually in use.** The app only ever loads **Newsreader** and **Instrument Sans** (see the Google Fonts `<link>` in [`src/routes/__root.tsx`](src/routes/__root.tsx#L81-L83)). Playfair Display doesn't appear anywhere in the codebase. The font that *does* "sneak in" is **Fraunces** — see Finding 1 below.

## Table 1 — Font families

| Font family | Where it's referenced | Actually loaded? | Usage count | Example files |
|---|---|---|---|---|
| **Newsreader** | `--font-serif` token (`@theme` in styles.css), applied via the `.font-serif` utility class and globally to `h1,h2,h3,h4` | ✅ Yes (Google Fonts link) | 122 usages of `font-serif` | `styles.css`, `app-shell.tsx`, `confirm-dialog.tsx`, `dashboard-widgets.tsx`, `login-dialog.tsx` |
| **Instrument Sans** | `--font-sans` token, applied via `.font-sans` and as the global `html` default | ✅ Yes (Google Fonts link) | 19 usages of `font-sans` + implicit default on every unstyled element | `styles.css`, `app-shell.tsx`, `routes/index.tsx`, `events.tsx`, `registry.tsx` |
| **Fraunces** | Hardcoded per-template `fonts.display` value in [`src/lib/website-templates.ts`](src/lib/website-templates.ts), injected via inline `fontFamily` style at render time in `template-preview.tsx`, `w.$slug.tsx`, `website_.edit.tsx` | ❌ **No** — never loaded anywhere (no `<link>`, no `@font-face`) | 18 of 20 website templates set `display: "Fraunces"` | `lib/website-templates.ts`, `routes/w.$slug.tsx`, `routes/_authenticated/website_.edit.tsx`, `components/template-preview.tsx` |
| **Instrument Sans** *(as template display font)* | Remaining 2 of 20 templates set `display: "Instrument Sans"` instead of Fraunces | ✅ Yes | 2 templates | `lib/website-templates.ts` (`nelson-green`, `janelle-ethan`) |
| *(template body font)* | All 20 templates set `fonts.body: "Instrument Sans"` | ✅ Yes | 20 templates | `lib/website-templates.ts` |

## Table 2 — Font sizes

### Tailwind standard scale (resolved against Tailwind v4's default theme — not customized here)

| Class | Resolved size | Line-height | Count | Example files |
|---|---|---|---|---|
| `text-sm` | 0.875rem / 14px | 1.25rem | 355 | `confirm-dialog.tsx`, `dashboard-widgets.tsx`, `share-rsvp-dialog.tsx`, `photo-empty-state.tsx` |
| `text-xs` | 0.75rem / 12px | 1rem | 280 | `dashboard-widgets.tsx`, `share-rsvp-dialog.tsx`, `lead-dialog.tsx`, `rsvp-form.tsx` |
| `text-2xl` | 1.5rem / 24px | 2rem | 59 | widely used for card/section headings |
| `text-3xl` | 1.875rem / 30px | 2.25rem | 27 | page-level headings |
| `text-4xl` | 2.25rem / 36px | 2.5rem | 25 | hero/large headings |
| `text-lg` | 1.125rem / 18px | 1.75rem | 20 | |
| `text-xl` | 1.25rem / 20px | 1.75rem | 19 | |
| `text-5xl` | 3rem / 48px | 1 | 9 | |
| `text-base` | 1rem / 16px | 1.5rem | 7 | |
| `text-6xl` | 3.75rem / 60px | 1 | 6 | |
| `text-8xl` | 6rem / 96px | 1 | 1 | landing page |
| `text-7xl` | 4.5rem / 72px | 1 | 1 | landing page |

### Arbitrary values (hardcoded, bypass the Tailwind scale entirely)

| Value | Resolved size | Count | Example files |
|---|---|---|---|
| `text-[10px]` | 10px | 75 | `dashboard-widgets.tsx`, `share-rsvp-dialog.tsx`, `photo-empty-state.tsx` |
| `text-[11px]` | 11px | 61 | `lead-dialog.tsx`, `rsvp-form.tsx`, `app-shell.tsx` |
| `text-[9px]` | 9px | 11 | |
| `text-[7px]` | 7px | 9 | |
| `text-[8px]` | 8px | 8 | |
| `text-[0.8rem]` | 12.8px | 4 | |
| `text-[13px]` | 13px | 3 | |
| `text-[6px]` | 6px | 1 | |

### Inline `fontSize` (React style props / JS libraries — not Tailwind at all)

| Location | Values found |
|---|---|
| `components/template-preview.tsx` | Raw numbers: `14, 16, 20, 22, 26` (px, unitless in the style object) |
| `routes/w.$slug.tsx` | `clamp(3rem, 8vw, 6rem)` |
| `routes/w.$slug.registry.tsx` | `clamp(2.5rem, 6vw, 4.5rem)` |
| `routes/_authenticated/website_.edit.tsx` | `clamp(2.5rem, 6vw, 5rem)` |
| `routes/_authenticated/seating.tsx` | `ChairTier` sizing table: `10, 11, 13, 14, 16` (px, computed/scaled at runtime) |
| `lib/seating-export.ts`, `lib/budget-export.ts` | `8, 9` (px — jsPDF export styling, a different rendering context than the DOM) |

## Flagged inconsistencies

1. **Fraunces is referenced but never loaded — the biggest finding.** 18 of the 20 public wedding-site templates set their display font to `"Fraunces"` in `website-templates.ts`, and that value is injected directly into inline `fontFamily` styles across `template-preview.tsx`, `w.$slug.tsx`, and `website_.edit.tsx`. There's no font-loading mechanism for it anywhere (only Newsreader + Instrument Sans are linked in `__root.tsx`). Every one of those 18 templates is silently falling back to the browser's default `serif` font instead of the intended display face. This is separate from the main app UI's `--font-serif` token (which correctly resolves to Newsreader) — it's a self-contained gap specific to the website-template feature.
2. **Heavy use of hardcoded arbitrary text sizes instead of the Tailwind scale.** 172 total arbitrary `text-[Npx]`/`text-[rem]` usages (75× `10px`, 61× `11px`, plus smaller counts down to `6px`), concentrated in badge/tag/label-style UI (dietary tags, event pills, table headers, small metadata text). These bypass the design system's token scale entirely — there's no single source of truth for "the small-badge size" the way `text-xs`/`text-sm` are for everything else, so any future resize of that visual tier requires a find-and-replace across dozens of files rather than one token change.
3. **Inline `fontSize` with raw numbers, in three different unit conventions.** `template-preview.tsx` uses unitless numbers (implicitly px) for a dozen preview-mode font sizes; `w.$slug.tsx`/`w.$slug.registry.tsx`/`website_.edit.tsx` use `clamp()` CSS strings with three *different* clamp ranges for what all appear to be page-hero headings; `seating.tsx`'s `ChairTier` table and the PDF export libraries use raw numeric px scaled/consumed in JS. None of these route through `--font-serif`/`--font-sans` or the Tailwind scale — they can't be, since two of them (seating chip sizing, PDF export) are legitimately computed/non-DOM contexts, but the three `clamp()` hero-heading values look like they should probably be one shared token or constant rather than three independently hand-tuned strings.
4. **No other stray font-family values found** beyond the Fraunces case above — everything else resolves cleanly to Newsreader or Instrument Sans via the two theme tokens.

## Summary

75 of 121 scanned files reference a font family or size in some form. Family-wise, the app is clean apart from one real gap: **Fraunces**, hardcoded into 18 of 20 website templates, is never actually loaded, so those templates silently render in a fallback serif instead of their intended display face. Size-wise, the big-ticket headings/body text consistently use Tailwind's default scale, but small badge/label text (172 instances) is almost entirely hardcoded via arbitrary `text-[Npx]` values rather than a token, and a handful of hero headings use three separately-authored `clamp()` strings instead of a shared constant.
