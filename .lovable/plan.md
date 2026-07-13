## Plan

### Goal
Replace the current homepage hero image with the uploaded wedding photo and ensure the bride and groom are clearly visible and centered.

### Steps

1. **Create a Lovable asset pointer** for `user-uploads://Gemini_Generated_Image_kmkukgkmkukgkmku.png` under `src/assets/`.
2. **Update `src/routes/index.tsx`**:
   - Import the new asset pointer.
   - Replace the existing `heroImg` source with the new image URL.
   - Adjust `object-position` and cropping so the couple is centered in the frame (the current image is tall/portrait; the hero container is landscape, so we’ll position the focal point on the bride and groom).
3. **Verify visually** in the preview that the couple is prominent and not cropped out.

### Out of scope
- No other copy, color, or layout changes unless the new crop requires minor spacing tweaks.
- No image generation; we’re using the uploaded photo directly.