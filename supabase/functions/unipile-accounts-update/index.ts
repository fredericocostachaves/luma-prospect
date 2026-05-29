export {}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': authHeader,
        'apikey': supabaseAnonKey,
      }
    })

    const user = await userResponse.json() as { id?: string }
    const authenticatedUserId = user?.id

    if (!authenticatedUserId) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { accountId, newAccountId } = await req.json() as { accountId: string; newAccountId: string }

    if (!accountId || !newAccountId) {
      return new Response(JSON.stringify({ error: 'Missing accountId or newAccountId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Try querying first to see if row exists
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/accounts?id=eq.${encodeURIComponent(accountId)}`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        }
      }
    )
    const checkBody = await checkRes.text().catch(() => '')
    console.error(`Check account ${accountId}: ${checkRes.status} - ${checkBody}`)

    const patchResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/accounts?id=eq.${encodeURIComponent(accountId)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unipile_account_id: newAccountId,
        }),
      }
    )

    const patchStatus = patchResponse.status
    const patchBody = await patchResponse.text().catch(() => '')

    console.error(`PATCH account ${accountId}: ${patchStatus} - ${patchBody}`)

    if (!patchResponse.ok) {
      return new Response(
        JSON.stringify({
          error: `DB update failed: ${patchStatus}`,
          details: patchBody,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
