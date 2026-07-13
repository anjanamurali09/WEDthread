Update the homepage hero/features section with the requested copy changes and neutralize the pink card shadows.

Changes:
1. In `src/routes/index.tsx`:
   - Update the "Unlimited ceremonies" description to: "Add every event your two cultures and traditions need. No limits."
   - Change the CTA eyebrow text from "Free while we're launching" to "FOR EVERY WEDDING, ANYWHERE".
   - Change the CTA button text from "Start planning free" to "Start planning for free".

2. In `src/styles.css`:
   - Remove the pink-tinted hover shadow from `.morph-card:hover` and replace it with a soft neutral/grey shadow (e.g., `0 30px 60px -30px rgb(26 21 18 / 0.12)`).
   - Verify no other feature-card-specific shadow utilities carry a pink glow. The card background colors (green, cream, pink) will remain unchanged.

No other pages or business logic will be touched.