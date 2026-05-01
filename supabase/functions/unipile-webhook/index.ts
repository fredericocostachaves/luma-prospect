export {}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!

// Prefer SUPABASE_SECRET_KEYS (JSON dictionary) and fallback to the legacy service role key
function getSupabaseKey(): string {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys)
      if (typeof parsed === 'string') return parsed
      const vals = Object.values(parsed).filter(v => typeof v === 'string')
      if (vals.length > 0) return vals[0]
    } catch (_e) {
      // ignore parse errors and fallback
    }
  }
  const fallback = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (fallback) return fallback
  throw new Error('No Supabase service key found in environment')
}

const supabaseKey = getSupabaseKey()

function getAnonKey(): string | null {
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY')
  if (anon) return anon
  const publishable = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')
  if (publishable) {
    try {
      const parsed = JSON.parse(publishable)
      if (typeof parsed === 'string') return parsed
      const vals = Object.values(parsed).filter(v => typeof v === 'string')
      if (vals.length > 0) return vals[0]
    } catch (_e) {
      // ignore
    }
  }
  return null
}

const supabaseAnonKey = getAnonKey()

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  try {
    Deno.env.get('UNIPILE_WEBHOOK_SECRET');
    const webhookSecret = Deno.env.get('UNIPILE_WEBHOOK_SECRET')

    // Webhook secret validation
    if (webhookSecret) {
      const headerSecret = req.headers.get('x-unipile-webhook-secret')
      const url = new URL(req.url, 'http://localhost')
      const querySecret = url.searchParams.get('secret')
      if (headerSecret !== webhookSecret && querySecret !== webhookSecret) {
        return new Response(
          JSON.stringify({ error: 'Invalid or missing webhook secret' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Log incoming headers (mask secret)
    const incomingHeaders: Record<string, string | null> = {}
    for (const [k, v] of req.headers) {
      incomingHeaders[k] = (k === 'x-unipile-webhook-secret' && v) ? '<masked>' : v
    }

    // Read raw body
    const rawBody = await req.text().catch(() => null)

    // Validate content-type (accept JSON body even if header missing)
    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('application/json') && !(rawBody && rawBody.trim().startsWith('{'))) {
      return new Response(
        JSON.stringify({ error: 'Invalid content type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse the payload
    let payload: any = null
    try {
      payload = rawBody ? JSON.parse(rawBody) : null
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    const accountId = payload?.account_id
    const userId = payload?.name
    const evtStatus = (payload?.status || '').toString()

    // Validar campos obrigatórios
    if (!accountId || !userId) {
      return new Response(
        JSON.stringify({ error: 'account_id e name são obrigatórios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Only handle creation/reconnect events
    if (evtStatus !== 'CREATION_SUCCESS' && evtStatus !== 'RECONNECTED') {
      return new Response(JSON.stringify({ success: true, ignored: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    // Build headers for PostgREST call (use publishable/anon if available, otherwise service key)
    const commonHeaders: Record<string, string> = {}
    commonHeaders['apikey'] = supabaseKey

    // Check existing by unipile_account_id or proxy_settings->>external_id
    const encoded = encodeURIComponent(accountId)
    const checkUrl = `${supabaseUrl}/rest/v1/accounts?or=(unipile_account_id.eq.${encoded},proxy_settings->>external_id.eq.${encoded})`

    const checkResponse = await fetch(checkUrl, { headers: commonHeaders })
    const checkText = await checkResponse.text().catch(() => '')
    let existing: any[] = []
    try { existing = checkText ? JSON.parse(checkText) : [] } catch (_e) { existing = [] }

    // Prepare containers for debug
    let createStatus: number | null = null
    let createTextStr: string | null = null
    let updateStatus: number | null = null
    let updateTextStr: string | null = null

    if (!existing || existing.length === 0) {
      // Criar nova conta
      const createHeaders = { ...commonHeaders, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
      const createBody: any = {
        user_id: userId,
        status: evtStatus,
        unipile_account_id: accountId,
      }

      const createResponse = await fetch(`${supabaseUrl}/rest/v1/accounts`, {
        method: 'POST',
        headers: createHeaders,
        body: JSON.stringify(createBody),
      })
      createStatus = createResponse.status
      createTextStr = await createResponse.text().catch(() => '')

    } else {
      // Atualizar conta existente (use primary match)
      const existingId = existing[0]?.id
      const updateHeaders = { ...commonHeaders, 'Content-Type': 'application/json' }
      const updateUrl = `${supabaseUrl}/rest/v1/accounts?id=eq.${encodeURIComponent(existingId)}`
      const updateBody: any = { status: 'Ativo', unipile_account_id: accountId }
      const updateResponse = await fetch(updateUrl, {
        method: 'PATCH',
        headers: updateHeaders,
        body: JSON.stringify(updateBody),
      })
      updateStatus = updateResponse.status
      updateTextStr = await updateResponse.text().catch(() => '')

    }

    const debug = {
      success: true,
      accountId,
      userId,
      rawBodyLength: rawBody ? rawBody.length : 0,
      checkResponse: { status: checkResponse.status, body: checkText },
      createResponse: { status: createStatus, body: createTextStr },
      updateResponse: { status: updateStatus, body: updateTextStr },
    }

    return new Response(JSON.stringify(debug), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
