// Envoi d'emails par SMTP via la boîte Hostinger. Secrets : SMTP_PASSWORD (obligatoire),
// SMTP_USER (défaut contact@releve-courrier.com), SMTP_HOST (défaut smtp.hostinger.com), SMTP_PORT (défaut 465).
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const USER = Deno.env.get("SMTP_USER") ?? "contact@releve-courrier.com";
const PASS = Deno.env.get("SMTP_PASSWORD") ?? "";
const HOST = Deno.env.get("SMTP_HOST") ?? "smtp.hostinger.com";
const PORT = Number(Deno.env.get("SMTP_PORT") ?? "465");
export const SITE = "https://releve-courrier.com";
export const ADDRESS = ["2 bis rue Hardy", "78000 Versailles"];

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export type Mail = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: string }[];
};

export async function sendMail(m: Mail): Promise<boolean> {
  if (!PASS) { console.error("SMTP_PASSWORD manquant : email non envoyé"); return false; }
  const client = new SMTPClient({ connection: { hostname: HOST, port: PORT, tls: true, auth: { username: USER, password: PASS } } });
  try {
    await client.send({
      from: `Relève <${USER}>`,
      to: m.to,
      replyTo: USER,
      subject: m.subject,
      content: m.text,
      html: m.html,
      attachments: m.attachments?.map((a) => ({ filename: a.filename, content: a.content, encoding: "base64", contentType: "application/pdf" })),
    });
    return true;
  } catch (e) {
    console.error("smtp", (e as Error)?.message ?? e);
    return false;
  } finally {
    try { await client.close(); } catch { /* ignore */ }
  }
}

function shell(title: string, inner: string): string {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#1c1b19">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:10px;overflow:hidden">
<tr><td style="background:#1c1b19;color:#fff;padding:18px 24px;font-size:20px;font-weight:bold">Relève</td></tr>
<tr><td style="padding:28px 24px;font-size:15px;line-height:1.55"><h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>${inner}</td></tr>
<tr><td style="padding:16px 24px;background:#f4f1ea;font-size:12px;color:#6b675f">Relève Courrier · ${ADDRESS.join(", ")}<br>Une question ? Répondez à cet email ou écrivez à contact@releve-courrier.com</td></tr>
</table></td></tr></table></body></html>`;
}

const PLAN: Record<string, string> = { essentiel: "Essentiel", pro: "Pro", entreprise: "Entreprise" };

export function welcomeMail(c: { reference: string; name?: string | null; company?: string | null; plan: string; billing_cycle?: string | null }) {
  const who = c.company || c.name || "";
  const label = `${who ? who + "\n" : ""}c/o Relève · Réf. ${c.reference}\n${ADDRESS.join("\n")}`;
  const subject = "Bienvenue chez Relève : votre adresse de réception";
  const html = shell("Bienvenue chez Relève", `
<p>Bonjour${c.name ? " " + esc(c.name) : ""},</p>
<p>Votre abonnement <strong>${esc(PLAN[c.plan] ?? c.plan)}</strong> est actif. Voici comment faire arriver votre courrier chez nous.</p>
<p style="margin:20px 0 6px;font-size:13px;color:#6b675f">Votre adresse de réception</p>
<div style="background:#f4f1ea;border-left:4px solid #1c1b19;padding:14px 16px;font-family:monospace;font-size:14px;line-height:1.6">${esc(label).replace(/\n/g, "<br>")}</div>
<p style="margin:20px 0 6px"><strong>Et ensuite ?</strong></p>
<ol style="padding-left:20px;margin:0 0 16px">
<li>Communiquez cette adresse à vos expéditeurs, ou faites une réexpédition La Poste vers elle.</li>
<li>Nous ouvrons et numérisons chaque pli sous 24 heures ouvrées.</li>
<li>Il est ensuite traité selon votre consigne (envoi par email, espace client, réexpédition ou destruction) et l'original papier est détruit, avec attestation.</li>
</ol>
<p>Votre espace client vous permet de retrouver vos plis, vos attestations et de régler vos préférences. La connexion se fait par un lien envoyé à cette adresse email, sans mot de passe.</p>
<p style="margin:22px 0"><a href="${SITE}/espace/" style="background:#1c1b19;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block">Accéder à mon espace</a></p>
<p style="font-size:13px;color:#6b675f">Votre référence client : <strong>${esc(c.reference)}</strong>. Gardez-la : elle identifie votre courrier.</p>`);
  const text = `Bonjour${c.name ? " " + c.name : ""},\n\nVotre abonnement ${PLAN[c.plan] ?? c.plan} est actif.\n\nVotre adresse de réception :\n${label}\n\nCommuniquez-la à vos expéditeurs. Nous numérisons chaque pli sous 24 h ouvrées, puis le traitons selon votre consigne.\n\nVotre espace client : ${SITE}/espace/ (connexion par lien envoyé par email).\n\nRelève · contact@releve-courrier.com`;
  return { subject, html, text };
}

const STATUS_TITLE: Record<string, string> = {
  numerise: "Votre pli est numérisé",
  envoye: "Votre pli a été envoyé",
  detruit: "Votre pli est détruit",
  reexpedie: "Votre pli a été réexpédié",
};

export function itemMail(it: { sender?: string | null; received_at?: string | null; status: string; certificate_ref?: string | null; pdfAttached: boolean }) {
  const title = STATUS_TITLE[it.status] ?? "Mise à jour de votre pli";
  const from = it.sender ? ` de ${it.sender}` : "";
  const date = it.received_at ? ` reçu le ${String(it.received_at).slice(0, 10).split("-").reverse().join("/")}` : "";
  const extra = it.status === "detruit" && it.certificate_ref
    ? `<p>Une attestation de destruction (<strong>${esc(it.certificate_ref)}</strong>) est disponible dans votre espace client.</p>` : "";
  const att = it.pdfAttached ? "<p>Le PDF est joint à cet email. Il est aussi disponible dans votre espace client.</p>" : "<p>Retrouvez le détail et le PDF dans votre espace client.</p>";
  const html = shell(title, `<p>Le pli${esc(from)}${esc(date)} a été traité.</p>${att}${extra}<p style="margin:22px 0"><a href="${SITE}/espace/" style="background:#1c1b19;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block">Ouvrir mon espace</a></p>`);
  const text = `${title}.\nLe pli${from}${date} a été traité.\n${it.pdfAttached ? "Le PDF est joint.\n" : ""}Espace client : ${SITE}/espace/`;
  return { subject: title + (it.sender ? " : " + it.sender : ""), html, text };
}

export function b64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
