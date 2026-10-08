// Shrinks oversized listing photos already in Supabase storage (bucket "business-media").
// Same file names, so every link keeps working; only the file's size changes.
//
//   npm i --no-save sharp
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/optimise-photos.mjs          (preview only)
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/optimise-photos.mjs --apply  (does it)
//
// Originals are saved to ./photo-backup/ before anything is overwritten. The service key stays in your
// own terminal; never paste it into chat or commit it.
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first."); process.exit(1); }
const apply = process.argv.includes("--apply");
const BUCKET = "business-media", MIN_BYTES = 400 * 1024, MAX_EDGE = 1800;
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function* walk(prefix = "") {
  const { data, error } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw error;
  for (const item of data) {
    const full = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) yield* walk(full);
    else yield { path: full, size: item.metadata?.size ?? 0 };
  }
}

let before = 0, after = 0, changed = 0;
for await (const f of walk()) {
  if (!/\.(jpe?g|png|webp)$/i.test(f.path) || f.size < MIN_BYTES) continue;
  const { data: blob, error } = await sb.storage.from(BUCKET).download(f.path);
  if (error) { console.warn("skip", f.path, error.message); continue; }
  const input = Buffer.from(await blob.arrayBuffer());
  const img = sharp(input).rotate().resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
  const ext = path.extname(f.path).toLowerCase();
  const out = await (ext === ".png" ? img.png({ compressionLevel: 9 }) : ext === ".webp" ? img.webp({ quality: 80 }) : img.jpeg({ quality: 80, mozjpeg: true })).toBuffer();
  if (out.length >= input.length * 0.9) continue;
  before += input.length; after += out.length; changed++;
  console.log(`${apply ? "shrinking" : "would shrink"} ${f.path}: ${(input.length / 1048576).toFixed(1)} MB -> ${(out.length / 1048576).toFixed(2)} MB`);
  if (!apply) continue;
  const backup = path.join("photo-backup", f.path);
  await mkdir(path.dirname(backup), { recursive: true });
  await writeFile(backup, input);
  const { error: upErr } = await sb.storage.from(BUCKET).upload(f.path, out, { upsert: true, cacheControl: "31536000", contentType: blob.type });
  if (upErr) console.warn("  upload failed:", upErr.message);
}
console.log(`\n${changed} photos, ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB${apply ? "" : " (preview only, nothing changed; add --apply to do it)"}`);
