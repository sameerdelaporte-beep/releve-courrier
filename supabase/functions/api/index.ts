// API Relève (formule Entreprise). Authentification : Authorization: Bearer rlv_live_...
//   GET /functions/v1/api/v1/items?limit=50&status=numerise&before=2026-10-01T00:00:00Z
//   GET /functions/v1/api/v1/items?q=facture+edf&folder=Énergie   (recherche plein texte, dossier)
//   GET /functions/v1/api/v1/items/{id}
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const err = (s: number, code: string, message: string) => json({ error: { code, message } }, s);

async function sha256(s: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const COLS = "id,received_at,folder,applied_rule,scanned_at,sender,doc_type,amount_ttc,due_date,reference,iban,pages,treatment,status,certificate_ref,destroyed_at,expires_at,created_at,pdf_path";

// deno-lint-ignore no-explicit-any
async function present(it: any) {
  let pdf_url: string | null = null;
  if (it.pdf_path) pdf_url = (await admin.storage.from("plis").createSignedUrl(it.pdf_path, 600)).data?.signedUrl ?? null;
  const { pdf_path: _p, ...rest } = it;
  return { ...rest, pdf_url, pdf_url_expires_in: pdf_url ? 600 : null };
}

Deno.serve(async (req) => {
  if (req.method !== "GET") return err(405, "method_not_allowed", "Seules les requêtes GET sont acceptées.");
  const key = (req.headers.get("authorization") ?? "").replace(/^Bearer /i, "").trim();
  if (!/^rlv_live_[0-9a-f]{48}$/.test(key)) return err(401, "invalid_key", "Clé d'API manquante ou invalide.");

  const { data: k } = await admin.from("api_keys").select("id,customer_id,customers(plan,status)").eq("key_hash", await sha256(key)).maybeSingle();
  // deno-lint-ignore no-explicit-any
  const c: any = Array.isArray(k?.customers) ? k?.customers[0] : k?.customers;
  if (!k || !c) return err(401, "invalid_key", "Clé d'API manquante ou invalide.");
  if (c.plan !== "entreprise" || c.status !== "active") return err(403, "plan_required", "La formule Entreprise active est requise.");
  admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", k.id).then(() => {});

  const url = new globalThis.URL(req.url);
  const path = url.pathname.replace(/^.*\/api/, "").replace(/\/+$/, "");
  const m = path.match(/^\/v1\/items(?:\/([0-9a-f-]{36}))?$/i);
  if (!m) return err(404, "not_found", "Route inconnue. Routes : /v1/items et /v1/items/{id}.");

  if (m[1]) {
    const { data: it } = await admin.from("mail_items").select(COLS).eq("id", m[1]).eq("customer_id", k.customer_id).maybeSingle();
    if (!it) return err(404, "not_found", "Pli introuvable.");
    return json(await present(it));
  }
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1), 100);
  let q = admin.from("mail_items").select(COLS).eq("customer_id", k.customer_id).order("created_at", { ascending: false }).limit(limit + 1);
  const status = url.searchParams.get("status");
  if (status) q = q.eq("status", status);
  const folder = url.searchParams.get("folder");
  if (folder) q = q.eq("folder", folder);
  const search = (url.searchParams.get("q") ?? "").replace(/[(),]/g, " ").trim().slice(0, 100);
  if (search) q = q.textSearch("search", search, { type: "websearch", config: "french" });
  const before = url.searchParams.get("before");
  if (before && !isNaN(Date.parse(before))) q = q.lt("created_at", before);
  const { data, error } = await q;
  if (error) return err(500, "server_error", "Erreur interne.");
  const rows = data ?? [];
  const page = rows.slice(0, limit);
  return json({ data: await Promise.all(page.map(present)), has_more: rows.length > limit, next_before: rows.length > limit ? page[page.length - 1].created_at : null });
});
