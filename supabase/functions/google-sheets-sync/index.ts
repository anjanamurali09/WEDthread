// Two-way sync between WEDthread data (guests, budget) and a Google Sheet.
//
//   POST {action:"create", wedding_id, kind}              create + link a sheet, then run a first sync
//   POST {action:"sync",   wedding_id, only_auto?}        sync every linked sheet (or just the auto-sync ones)
//   POST {action:"unlink", link_id}                       stop syncing one sheet (the sheet itself stays in Drive)
//   POST {action:"disconnect", wedding_id}                remove the Google connection and all links
//
// How a sync decides who wins, per row (matched by the hidden WEDthread ID in column A):
//   - changed only in the sheet        -> the change is saved in WEDthread
//   - changed only in WEDthread        -> the sheet row is updated
//   - changed in both                  -> WEDthread wins (it's the source of truth)
//   - new row typed into the sheet     -> becomes a new guest/expense, and gets its ID
//   - record deleted in WEDthread      -> its row is removed from the sheet
//   - row deleted in the sheet         -> ignored; the row comes back (delete in WEDthread instead)
// A snapshot of each row at the last sync (integration_row_state) is what tells "changed in
// the sheet" apart from "changed in WEDthread".
//
// Edge Function secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (SUPABASE_* are automatic).

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const ID_HEADER = "WEDthread ID (don't edit)";

type Rec = Record<string, any>;
type Adapter = {
  table: string;
  sheetTitle: string;
  fileTitle: string;
  headers: string[];
  numericCols: number[]; // indexes (within headers) written as real numbers
  orderBy: string;
  toRow: (r: Rec) => string[];
  fromRow: (cells: string[]) => Rec | null; // null = blank / unusable row
  insertExtras: (weddingId: string, existingCount: number, k: number) => Rec;
};

const list = (v: unknown): string[] => (Array.isArray(v) ? v : []).map(String);
const splitList = (s: string) => Array.from(new Set(s.split(/[;,]/).map((x) => x.trim()).filter(Boolean)));
const orNull = (s: string) => (s.trim() ? s.trim() : null);

const ADAPTERS: Record<string, Adapter> = {
  guests: {
    table: "guests",
    sheetTitle: "Guests",
    fileTitle: "WEDthread – Guest list",
    headers: ["First name", "Last name", "Email", "Phone", "Family / Group", "Dietary tags", "Food allergies", "Tags", "Dietary notes", "Accessibility notes"],
    numericCols: [],
    orderBy: "created_at",
    toRow: (g) => [
      g.first_name ?? String(g.full_name ?? "").split(" ")[0] ?? "",
      g.last_name ?? String(g.full_name ?? "").split(" ").slice(1).join(" "),
      g.email ?? "", g.phone ?? "", g.household_group ?? "",
      list(g.dietary_tags).join("; "), list(g.food_allergies).join("; "), list(g.tags).join("; "),
      g.dietary_notes ?? "", g.accessibility_notes ?? "",
    ],
    fromRow: (c) => {
      const first = c[0].trim(), last = c[1].trim();
      if (!first && !last) return null;
      return {
        first_name: first || null, last_name: last || null, full_name: `${first} ${last}`.trim(),
        email: orNull(c[2]), phone: orNull(c[3].replace(/\s/g, "")), household_group: orNull(c[4]),
        dietary_tags: splitList(c[5]), food_allergies: splitList(c[6]), tags: splitList(c[7]),
        dietary_notes: orNull(c[8]), accessibility_notes: orNull(c[9]),
      };
    },
    insertExtras: (weddingId) => ({ wedding_id: weddingId }),
  },
  budget: {
    table: "expenses",
    sheetTitle: "Budget",
    fileTitle: "WEDthread – Budget",
    headers: ["Expense", "Category", "Amount", "Paid by", "Payment method", "Status", "Paid date", "Description"],
    numericCols: [2],
    orderBy: "sort_order",
    toRow: (e) => [
      e.name ?? "", e.category ?? "", String(Number(e.amount ?? 0)),
      e.paid_by ? String(e.paid_by).charAt(0).toUpperCase() + String(e.paid_by).slice(1) : "",
      e.payment_method ?? "", e.status === "paid" ? "Paid" : "Pending", e.paid_date ?? "", e.description ?? "",
    ],
    fromRow: (c) => {
      const name = c[0].trim();
      if (!name) return null;
      const amount = parseFloat(c[2].replace(/[^0-9.\-]/g, ""));
      const date = c[6].trim();
      const parsed = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : date && !isNaN(Date.parse(date)) ? new Date(date).toISOString().slice(0, 10) : null;
      return {
        name, category: orNull(c[1]), amount: Number.isFinite(amount) ? amount : 0,
        paid_by: orNull(c[3])?.toLowerCase() ?? null, payment_method: orNull(c[4]),
        status: c[5].trim().toLowerCase() === "paid" ? "paid" : "pending", paid_date: parsed, description: orNull(c[7]),
      };
    },
    insertExtras: (weddingId, existing, k) => ({ wedding_id: weddingId, sort_order: existing + k }),
  },
};

const colLetter = (n: number) => String.fromCharCode(64 + n); // sheets here never exceed column Z
const rowKey = (row: string[]) => row.join("\u0001");
async function sha(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function googleToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!, client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: refreshToken, grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) throw new Error("Google access was revoked — reconnect Google in Settings.");
  return json.access_token;
}

async function sheets(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? `Google Sheets error ${res.status}`);
  return json;
}

async function createSpreadsheet(token: string, ad: Adapter) {
  const created = await sheets(token, "", {
    method: "POST",
    body: JSON.stringify({ properties: { title: ad.fileTitle }, sheets: [{ properties: { title: ad.sheetTitle, gridProperties: { frozenRowCount: 1 } } }] }),
  });
  const sheetId = created.sheets[0].properties.sheetId;
  const width = ad.headers.length + 1;
  await sheets(token, `/${created.spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [
        { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 1, green: 0.94, blue: 0.7 } } }, fields: "userEnteredFormat(textFormat,backgroundColor)" } },
        { repeatCell: { range: { sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 }, cell: { userEnteredFormat: { textFormat: { foregroundColor: { red: 0.6, green: 0.6, blue: 0.6 } } } }, fields: "userEnteredFormat.textFormat.foregroundColor" } },
        { addProtectedRange: { protectedRange: { range: { sheetId, startColumnIndex: 0, endColumnIndex: 1 }, description: "Managed by WEDthread", warningOnly: true } } },
        { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 1, endIndex: width }, properties: { pixelSize: 150 }, fields: "pixelSize" } },
      ],
    }),
  });
  return { spreadsheetId: created.spreadsheetId as string, url: created.spreadsheetUrl as string };
}

async function syncLink(service: any, token: string, link: Rec) {
  const ad = ADAPTERS[link.kind];
  const width = ad.headers.length + 1;
  const sheetRef = encodeURIComponent(link.sheet_title);
  const counts = { fromSheet: 0, toSheet: 0, created: 0, conflicts: 0, removed: 0 };

  const read = await sheets(token, `/${link.spreadsheet_id}/values/${sheetRef}!A1:${colLetter(width)}`);
  const sheetRows: string[][] = ((read.values ?? []) as any[][]).slice(1).map((r) => Array.from({ length: width }, (_, i) => String(r[i] ?? "")));
  const oldRowCount = sheetRows.length;

  const { data: records, error: recErr } = await service.from(ad.table).select("*").eq("wedding_id", link.wedding_id).order(ad.orderBy);
  if (recErr) throw new Error(recErr.message);
  const byId = new Map<string, Rec>((records ?? []).map((r: Rec) => [r.id, r]));
  const { data: snaps } = await service.from("integration_row_state").select("record_id, hash").eq("link_id", link.id);
  const snap = new Map<string, string>((snaps ?? []).map((s: Rec) => [s.record_id, s.hash]));

  const out: { id: string; row: string[] | null; patch?: Rec }[] = [];
  const updates: { id: string; patch: Rec }[] = [];
  const seen = new Set<string>();

  for (const raw of sheetRows) {
    const id = raw[0].trim();
    const cells = raw.slice(1);
    if (!id && cells.every((c) => !c.trim())) continue; // blank row
    const patch = ad.fromRow(cells);
    const rec = id && !seen.has(id) ? byId.get(id) : undefined;

    if (!rec) {
      if (id && snap.has(id) && !seen.has(id)) { counts.removed++; continue; } // deleted in WEDthread
      if (!patch) continue;
      out.push({ id: "", row: null, patch }); // new row typed into the sheet
      continue;
    }
    seen.add(id);
    const dbRow = ad.toRow(rec);
    const sheetRow = patch ? ad.toRow({ ...rec, ...patch }) : dbRow;
    const dbKey = rowKey(dbRow), sheetKey = rowKey(sheetRow);
    if (dbKey === sheetKey) { out.push({ id, row: dbRow }); continue; }
    const snapHash = snap.get(id);
    if (snapHash && snapHash === (await sha(dbKey))) {
      updates.push({ id, patch: patch! }); counts.fromSheet++;
      out.push({ id, row: sheetRow });
    } else {
      if (snapHash && snapHash !== (await sha(sheetKey))) counts.conflicts++;
      counts.toSheet++;
      out.push({ id, row: dbRow }); // changed in WEDthread (or both): WEDthread wins
    }
  }

  // Records the sheet doesn't have yet (new in WEDthread, or a row deleted from the sheet).
  for (const rec of records ?? []) {
    if (!seen.has(rec.id) && !out.some((o) => o.id === rec.id)) out.push({ id: rec.id, row: ad.toRow(rec) });
  }

  // Save the sheet's changes into WEDthread.
  for (let i = 0; i < updates.length; i += 20) {
    await Promise.all(updates.slice(i, i + 20).map(async (u) => {
      const { error } = await service.from(ad.table).update(u.patch).eq("id", u.id);
      if (error) throw new Error(error.message);
    }));
  }
  let k = 0;
  for (const o of out) {
    if (o.id || !o.patch) continue;
    const { data, error } = await service.from(ad.table).insert({ ...o.patch, ...ad.insertExtras(link.wedding_id, (records ?? []).length, k++) }).select("*").single();
    if (error) throw new Error(error.message);
    o.id = data.id; o.row = ad.toRow(data); counts.created++;
  }

  // Write the merged result back, header included (restores it if someone edited it).
  const matrix = out.map((o) => [o.id, ...o.row!.map((v, i) => (ad.numericCols.includes(i) && v !== "" && Number.isFinite(Number(v)) ? Number(v) : v))]);
  const header = [ID_HEADER, ...ad.headers];
  await sheets(token, `/${link.spreadsheet_id}/values/${sheetRef}!A1:${colLetter(width)}${matrix.length + 1}?valueInputOption=RAW`, {
    method: "PUT", body: JSON.stringify({ values: [header, ...matrix] }),
  });
  if (oldRowCount > matrix.length) {
    await sheets(token, `/${link.spreadsheet_id}/values/${sheetRef}!A${matrix.length + 2}:${colLetter(width)}${oldRowCount + 1}:clear`, { method: "POST", body: "{}" });
  }

  // Snapshot what both sides now agree on.
  const rows = await Promise.all(out.map(async (o) => ({ link_id: link.id, record_id: o.id, hash: await sha(rowKey(o.row!)) })));
  if (rows.length) await service.from("integration_row_state").upsert(rows);
  const keep = new Set(out.map((o) => o.id));
  const stale = [...snap.keys()].filter((id) => !keep.has(id));
  if (stale.length) await service.from("integration_row_state").delete().eq("link_id", link.id).in("record_id", stale);

  await service.from("integration_links").update({ last_synced_at: new Date().toISOString(), last_error: null }).eq("id", link.id);
  return counts;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  const respond = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "content-type": "application/json" } });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authed = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: user } = await authed.auth.getUser();
    if (!user.user) return respond(401, { error: "Not signed in" });

    const body = await req.json();
    const { action } = body;

    // Every action is scoped to a wedding the signed-in user owns (RLS on the authed client).
    let weddingId: string | undefined = body.wedding_id;
    if (action === "unlink") {
      const { data: l } = await authed.from("integration_links").select("id, wedding_id").eq("id", body.link_id).maybeSingle();
      if (!l) return respond(403, { error: "No access" });
      weddingId = l.wedding_id;
    }
    const { data: wedding } = await authed.from("weddings").select("id").eq("id", weddingId).maybeSingle();
    if (!wedding) return respond(403, { error: "No access to this wedding" });

    if (action === "unlink") {
      await service.from("integration_links").delete().eq("id", body.link_id);
      return respond(200, { ok: true });
    }

    const { data: integ } = await service.from("integrations").select("id").eq("wedding_id", weddingId).eq("provider", "google").maybeSingle();
    if (!integ) return respond(400, { error: "Connect Google first." });

    if (action === "disconnect") {
      const { data: secret } = await service.from("integration_secrets").select("refresh_token").eq("integration_id", integ.id).maybeSingle();
      if (secret) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(secret.refresh_token)}`, { method: "POST" }).catch(() => {});
      await service.from("integrations").delete().eq("id", integ.id); // cascades to secrets, links and row state
      return respond(200, { ok: true });
    }

    const { data: secret } = await service.from("integration_secrets").select("refresh_token").eq("integration_id", integ.id).maybeSingle();
    if (!secret) return respond(400, { error: "Reconnect Google in Settings." });
    const token = await googleToken(secret.refresh_token);

    if (action === "create") {
      const ad = ADAPTERS[body.kind];
      if (!ad) return respond(400, { error: "Unknown data type" });
      const existing = await service.from("integration_links").select("id").eq("wedding_id", weddingId).eq("kind", body.kind).maybeSingle();
      if (existing.data) return respond(400, { error: "Already linked" });
      const sheet = await createSpreadsheet(token, ad);
      const { data: link, error } = await service.from("integration_links").insert({
        wedding_id: weddingId, integration_id: integ.id, kind: body.kind,
        spreadsheet_id: sheet.spreadsheetId, spreadsheet_url: sheet.url, sheet_title: ad.sheetTitle,
      }).select("*").single();
      if (error) return respond(500, { error: error.message });
      const counts = await syncLink(service, token, link);
      return respond(200, { ok: true, url: sheet.url, counts });
    }

    if (action === "sync") {
      let q = service.from("integration_links").select("*").eq("wedding_id", weddingId);
      if (body.only_auto) q = q.eq("auto_sync", true);
      if (body.kind) q = q.eq("kind", body.kind);
      const { data: links } = await q;
      const results: Record<string, unknown> = {};
      for (const link of links ?? []) {
        try {
          results[link.kind] = await syncLink(service, token, link);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await service.from("integration_links").update({ last_error: msg }).eq("id", link.id);
          results[link.kind] = { error: msg };
        }
      }
      return respond(200, { ok: true, results });
    }

    return respond(400, { error: "Unknown action" });
  } catch (e) {
    return respond(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
