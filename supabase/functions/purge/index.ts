// Suppression des plis arrivés au terme de leur durée de conservation (12 mois / 5 ans / 10 ans).
// Appelée chaque nuit par pg_cron. Sans effet de bord exploitable : ne supprime que ce qui est expiré.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

Deno.serve(async () => {
  const { data: items, error } = await admin.from("mail_items").select("id,pdf_path").lt("expires_at", new Date().toISOString()).limit(200);
  if (error) { console.error("purge", error.message); return new Response("error", { status: 500 }); }
  const paths = (items ?? []).map((i) => i.pdf_path).filter(Boolean) as string[];
  if (paths.length) {
    const { error: e1 } = await admin.storage.from("plis").remove(paths);
    if (e1) { console.error("purge storage", e1.message); return new Response("error", { status: 500 }); }
  }
  const ids = (items ?? []).map((i) => i.id);
  if (ids.length) await admin.from("mail_items").delete().in("id", ids);
  return new Response(JSON.stringify({ purged: ids.length }), { headers: { "Content-Type": "application/json" } });
});
