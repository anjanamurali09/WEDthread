Update the homepage hero/features section and global hover behavior.

## 1. Copy change
In `src/routes/index.tsx`, replace the features section heading:
- From: "Every tool a modern wedding needs."
- To: "We handle the details. You bring the love."

## 2. Wide ellipse image container
In `src/routes/index.tsx`, restyle the cocktail image (under the new heading) as a wide ellipse:
- Wrap the `<img>` in a container sized roughly `650px × 400px` (16:9-ish), with `border-radius: 50%` and `overflow: hidden`.
- Set the inner `<img>` to `width: 100%; height: 100%; object-fit: cover`.
- Use a landscape-oriented photo so it fills the oval naturally without stretching. If the current asset is portrait, swap to a landscape wedding asset or crop via `object-position` to a horizontal focal area.

## 3. Contextual hover tints
In `src/styles.css`, add lighter hover variants of the existing soft background colors (`cream`, `blush-soft`, `sage-soft`, `wine-soft`) and a reusable utility that tints on hover.

Then apply the contextual hover to:
- **Feature cards** (`src/routes/index.tsx`): each card already has a colored background (`bg-cream`, `bg-blush-soft`, `bg-sage-soft`, `bg-wine-soft`). On hover, shift to the matching lighter tint instead of the current generic shadow-only morph.
- **Culture strip pills** (`src/routes/index.tsx`): currently `hover:bg-cherry hover:text-pearl`. Change to a light tint of the pill's base color (light cream/blush/sage/wine depending on category) so the highlight reflects the element's own color.

## Files changed
- `src/routes/index.tsx`
- `src/styles.css`

No backend or auth changes.