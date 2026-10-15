// Réception des événements Stripe (abonnements Relève) : enregistrement des clients et email d'accueil.
// Authentification : signature Stripe (en-tête Stripe-Signature), pas de JWT Supabase.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendMail, welcomeMail } from "./email.ts";

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const TOLERANCE_SECONDS = 300;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function verifySignature(payload: string, header: string | null): Promise<boolean> {
  if (!WEBHOOK_SECRET || !header) return false;
  const parts = header.split(",").map((p) => p.split("="));
  const t = parts.find((p) => p[0] === "t")?.[1];
  const sigs = parts.filter((p) => p[0] === "v1").map((p) => p[1]);
  if (!t || sigs.length === 0) return false;
  const age = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = toHex(await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${payload}`)));
  return sigs.some((s) => safeEqual(s, expected));
}

const PLANS = ["essentiel", "pro", "entreprise"];
const CYCLES = ["mensuel", "annuel"];
const PROCESSING = ["emailespace", "espace", "email", "api", "reexpedition"];

// deno-lint-ignore no-explicit-any
type Obj = Record<string, any>;

function statusFrom(stripeStatus: string): "active" | "past_due" | "canceled" {
  if (stripeStatus === "active" || stripeStatus === "trialing") return "active";
  if (stripeStatus === "past_due" || stripeStatus === "unpaid") return "past_due";
  return "canceled";
}

async function onCheckoutCompleted(session: Obj) {
  if (session.mode !== "subscription") return;
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return;

  const plan = session.metadata?.plan;
  const cycle = session.metadata?.cycle;
  if (!PLANS.includes(plan) || !CYCLES.includes(cycle)) {
    throw new Error("metadata plan/cycle manquantes ou invalides");
  }
  const fields: Obj = {};
  for (const f of session.custom_fields ?? []) {
    fields[f.key] = f.dropdown?.value ?? f.text?.value ?? null;
  }
  const details: Obj = session.customer_details ?? {};
  const processing = PROCESSING.includes(fields.traitement) ? fields.traitement : null;
  const scanEmail = typeof fields.emailscans === "string" && fields.emailscans.includes("@") ? fields.emailscans.trim() : null;

  const { data: customer, error } = await supabase.from("customers").upsert({
    stripe_customer_id: session.customer ?? null,
    stripe_subscription_id: session.subscription ?? null,
    email: details.email ?? session.customer_email,
    name: details.individual_name ?? details.name ?? null,
    company: details.business_name ?? null,
    phone: details.phone ?? null,
    plan,
    billing_cycle: cycle,
    status: "active",
    default_processing: processing,
    scan_email: scanEmail,
    billing_address: details.address ?? null,
  }, { onConflict: "stripe_subscription_id", ignoreDuplicates: false })
    .select("id,reference,email,name,company,plan,billing_cycle,welcome_sent_at")
    .single();
  if (error) throw error;

  // Email d'accueil : un échec d'envoi ne doit pas faire échouer l'enregistrement du client.
  if (customer && !customer.welcome_sent_at && customer.email) {
    try {
      const m = welcomeMail(customer);
      if (await sendMail({ to: customer.email, ...m })) {
        await supabase.from("customers").update({ welcome_sent_at: new Date().toISOString() }).eq("id", customer.id);
      }
    } catch (e) {
      console.error("welcome mail", (e as Error)?.message ?? e);
    }
  }
}

async function onSubscriptionChanged(sub: Obj, forced?: "canceled") {
  const { error } = await supabase
    .from("customers")
    .update({ status: forced ?? statusFrom(sub.status) })
    .eq("stripe_subscription_id", sub.id);
  if (error) throw error;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const payload = await req.text();
  if (!(await verifySignature(payload, req.headers.get("stripe-signature")))) {
    return new Response("Invalid signature", { status: 400 });
  }

  let event: Obj;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response("Bad payload", { status: 400 });
  }

  try {
    const { data: seen } = await supabase.from("stripe_events").select("id").eq("id", event.id).maybeSingle();
    if (seen) return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });

    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.updated":
        await onSubscriptionChanged(event.data.object);
        break;
      case "customer.subscription.deleted":
        await onSubscriptionChanged(event.data.object, "canceled");
        break;
      default:
        break;
    }

    await supabase.from("stripe_events").upsert({ id: event.id, type: event.type });
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("stripe-webhook error", event?.type, (e as Error)?.message ?? e);
    return new Response("Processing error", { status: 500 });
  }
});
