// Notifications déclenchées par l'opérateur : email au client, webhook Entreprise, email d'accueil.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { b64, itemMail, sendMail, welcomeMail } from "./email.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const ORIGINS = ["https://releve-courrier.com", "https://www.releve-courrier.com", "https://releve-courrier.netlify.app"];
const enc = new TextEncoder();
const MAX_ATTACH = 8 * 1024 * 1024;

function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  return { "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0], "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" };
}
const reply = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

async function hmacHex(secret: string, data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return reply(req, { error: "method" }, 405);

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer /i, "");
  const { data: u } = await admin.auth.getUser(token);
  const email = u?.user?.email?.toLowerCase();
  if (!email) return reply(req, { error: "auth" }, 401);
  const { data: isAdmin } = await admin.from("admins").select("email").ilike("email", email).maybeSingle();
  if (!isAdmin) return reply(req, { error: "forbidden" }, 403);

  let body: Record<string, string>;
  try { body = await req.json(); } catch { return reply(req, { error: "json" }, 400); }

  // Email d'accueil (renvoi manuel)
  if (body.event === "welcome" && body.customer_id) {
    const { data: c } = await admin.from("customers").select("id,reference,email,name,company,plan,billing_cycle").eq("id", body.customer_id).maybeSingle();
    if (!c) return reply(req, { error: "client introuvable" }, 404);
    const ok = await sendMail({ to: c.email, ...welcomeMail(c) });
    if (ok) await admin.from("customers").update({ welcome_sent_at: new Date().toISOString() }).eq("id", c.id);
    return reply(req, { email: ok });
  }

  if (!body.item_id) return reply(req, { error: "item_id requis" }, 400);
  const { data: it } = await admin.from("mail_items").select("*, customers(*)").eq("id", body.item_id).maybeSingle();
  if (!it || !it.customers) return reply(req, { error: "pli introuvable" }, 404);
  if (it.status === "recu") return reply(req, { email: "skipped", webhook: "skipped" });
  const c = it.customers;
  const result: Record<string, unknown> = {};

  // Email
  if (it.treatment !== "api") {
    let attachments: { filename: string; content: string }[] | undefined;
    if (it.pdf_path && (it.treatment === "email" || it.treatment === "emailespace")) {
      const { data: blob } = await admin.storage.from("plis").download(it.pdf_path);
      if (blob && blob.size <= MAX_ATTACH) attachments = [{ filename: "courrier.pdf", content: b64(new Uint8Array(await blob.arrayBuffer())) }];
    }
    const m = itemMail({ sender: it.sender, received_at: it.received_at, status: it.status, certificate_ref: it.certificate_ref, pdfAttached: !!attachments });
    result.email = await sendMail({ to: c.scan_email || c.email, ...m, attachments });
    if (result.email) await admin.from("mail_items").update({ notified_at: new Date().toISOString() }).eq("id", it.id);
  } else result.email = "skipped";

  // Webhook (formule Entreprise)
  if (c.plan === "entreprise" && c.status === "active" && c.webhook_url && c.webhook_secret) {
    let pdfUrl: string | null = null;
    if (it.pdf_path) pdfUrl = (await admin.storage.from("plis").createSignedUrl(it.pdf_path, 3600)).data?.signedUrl ?? null;
    const payload = JSON.stringify({
      event: "mail.updated", sent_at: new Date().toISOString(),
      data: { id: it.id, customer_reference: c.reference, status: it.status, received_at: it.received_at, scanned_at: it.scanned_at, sender: it.sender, doc_type: it.doc_type,
        amount_ttc: it.amount_ttc, due_date: it.due_date, reference: it.reference, iban: it.iban, pages: it.pages, certificate: it.certificate_ref, pdf_url: pdfUrl, pdf_url_expires_in: 3600 },
    });
    const t = Math.floor(Date.now() / 1000);
    const sig = await hmacHex(c.webhook_secret, `${t}.${payload}`);
    try {
      const r = await fetch(c.webhook_url, { method: "POST", headers: { "Content-Type": "application/json", "Releve-Signature": `t=${t},v1=${sig}` }, body: payload, signal: AbortSignal.timeout(8000), redirect: "manual" });
      result.webhook = r.status;
    } catch (e) { result.webhook = "erreur : " + ((e as Error).message ?? "inconnue"); }
  } else result.webhook = "none";

  return reply(req, result);
});
