// Edge Function: upload-url  (sahibi: 5 Backend + kaptan)
// Sözleşme: docs/TEKNIK_DOKUMAN.md → "Supabase" → Edge Function'lar
Deno.serve(async (_req: Request) => {
  return new Response(JSON.stringify({ error: "not implemented" }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  });
});
