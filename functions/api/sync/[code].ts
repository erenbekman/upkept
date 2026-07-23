// Cloudflare Pages Function — login-less sync store, one row per sync code.
// ponytail: whole-document last-write-wins; fine for one user across devices.
// The unguessable code is the only secret — no auth by design.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

export function onRequestOptions(): Response {
  return new Response(null, { headers: CORS })
}

export async function onRequestGet(ctx: any): Promise<Response> {
  const code = String(ctx.params.code)
  const row = await ctx.env.DB
    .prepare('SELECT data, mutated_at, rev FROM sync_docs WHERE code = ?')
    .bind(code)
    .first()
  if (!row) return json({ exists: false })
  return json({ exists: true, data: row.data, mutatedAt: row.mutated_at, rev: row.rev })
}

export async function onRequestPut(ctx: any): Promise<Response> {
  const code = String(ctx.params.code)
  if (!/^[a-z0-9-]{6,64}$/.test(code)) return json({ error: 'bad code' }, 400)

  const body = await ctx.request.json().catch(() => ({}))
  if (typeof body.data !== 'string' || body.data.length > 2_000_000) {
    return json({ error: 'bad data' }, 400)
  }
  const mutatedAt = Number(body.mutatedAt) || Date.now()

  await ctx.env.DB.prepare(
    `INSERT INTO sync_docs (code, data, mutated_at, rev) VALUES (?1, ?2, ?3, 1)
     ON CONFLICT(code) DO UPDATE SET data = ?2, mutated_at = ?3, rev = rev + 1`,
  ).bind(code, body.data, mutatedAt).run()

  const row = await ctx.env.DB.prepare('SELECT rev FROM sync_docs WHERE code = ?').bind(code).first()
  return json({ ok: true, rev: row?.rev ?? 1 })
}
