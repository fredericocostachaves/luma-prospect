export {}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const providedApiKey = url.searchParams.get('apikey')
    if (!providedApiKey || providedApiKey !== supabaseKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('application/json') || req.method === 'GET') {
      return new Response(JSON.stringify({ error: 'Invalid or missing request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { account_id, name, account_type } = await req.json() as { account_id: string; name: string; account_type?: string }

    if (!account_id || !name) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const checkRes = await fetch(`${supabaseUrl}/rest/v1/accounts?id=eq.${encodeURIComponent(account_id)}`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
      }
    })
    const existing = await checkRes.json() as Array<unknown> | null

    let initials = 'LI'
    if (account_type) {
      initials = account_type.substring(0, 2).toUpperCase()
    }

    if (!existing || existing.length === 0) {
      await fetch(`${supabaseUrl}/rest/v1/accounts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          id: account_id,
          user_id: name,
          name: 'LinkedIn',
          status: 'Ativo',
          initials: initials,
        }),
      })
    } else {
      await fetch(`${supabaseUrl}/rest/v1/accounts?id=eq.${encodeURIComponent(account_id)}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'Ativo' }),
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})