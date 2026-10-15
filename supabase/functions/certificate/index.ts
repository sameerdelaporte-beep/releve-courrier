// Certificat de destruction au format PDF. Réservé au client propriétaire du pli (et à l'opérateur) via RLS.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const ORIGINS = ["https://releve-courrier.com", "https://www.releve-courrier.com", "https://releve-courrier.netlify.app"];
function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  return { "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0], "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "GET, OPTIONS", Vary: "Origin" };
}
const fr = (d?: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : "—");
const frTime = (d?: string | null) => (d ? new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "—");
const DOC: Record<string, string> = { facture: "Facture", administratif: "Administratif", banque: "Banque", assurance: "Assurance", contrat: "Contrat", recommande: "Recommandé", autre: "Autre" };

async function sha256(s: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  const id = new globalThis.URL(req.url).searchParams.get("item") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Paramètre item invalide", { status: 400, headers: cors(req) });
  const auth = req.headers.get("authorization") ?? "";
  if (!auth) return new Response("Non authentifié", { status: 401, headers: cors(req) });

  const sb = createClient(URL_, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: it } = await sb.from("mail_items").select("id,received_at,sender,doc_type,pages,status,certificate_ref,destroyed_at,customers(reference,company,name)").eq("id", id).maybeSingle();
  if (!it || it.status !== "detruit" || !it.certificate_ref) return new Response("Certificat indisponible", { status: 404, headers: cors(req) });
  // deno-lint-ignore no-explicit-any
  const c: any = Array.isArray(it.customers) ? it.customers[0] : it.customers;

  const empreinte = (await sha256([it.certificate_ref, c?.reference, it.id, it.received_at, it.destroyed_at].join("|"))).slice(0, 32);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.11, 0.106, 0.098), grey = rgb(0.42, 0.40, 0.37);
  const text = (t: string, x: number, y: number, size = 11, f = font, color = ink) => page.drawText(t, { x, y, size, font: f, color });

  page.drawRectangle({ x: 0, y: 770, width: 595, height: 72, color: ink });
  text("Relève", 48, 797, 24, bold, rgb(1, 1, 1));
  text("CERTIFICAT DE DESTRUCTION", 48, 722, 22, bold);
  text(`N° ${it.certificate_ref}`, 48, 698, 14, bold, grey);

  const rows: [string, string][] = [
    ["Client", `${c?.company || c?.name || "—"} (réf. ${c?.reference ?? "—"})`],
    ["Pli reçu le", fr(it.received_at)],
    ["Expéditeur", it.sender || "—"],
    ["Type de document", DOC[it.doc_type] ?? it.doc_type ?? "—"],
    ["Nombre de pages", it.pages != null ? String(it.pages) : "—"],
    ["Détruit le", frTime(it.destroyed_at)],
  ];
  let y = 640;
  for (const [k, v] of rows) { text(k, 48, y, 10, font, grey); text(v.slice(0, 70), 190, y, 11, bold); y -= 28; }

  const lines = [
    "Relève Courrier atteste que l'original papier du pli désigné ci-dessus a été",
    "numérisé, puis détruit par broyage (niveau de sécurité P-4, norme DIN 66399)",
    "à la date indiquée. Une copie numérique est conservée dans l'espace client",
    "pendant la durée prévue par la formule d'abonnement du client.",
  ];
  y -= 14;
  for (const l of lines) { text(l, 48, y, 11); y -= 18; }
  y -= 24;
  text("Établi par Relève Courrier, 2 bis rue Hardy, 78000 Versailles.", 48, y, 10, font, grey);
  text(`Empreinte du certificat : ${empreinte}`, 48, 60, 9, font, grey);
  text("Contact : contact@releve-courrier.com", 48, 46, 9, font, grey);

  const bytes = await pdf.save();
  return new Response(bytes, { headers: { ...cors(req), "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${it.certificate_ref}.pdf"`, "Cache-Control": "no-store" } });
});
