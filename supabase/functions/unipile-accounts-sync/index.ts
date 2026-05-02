export {}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

const UNIPILE_API_URL = Deno.env.get('UNIPILE_API_URL') || 'https://api34.unipile.com:16410'
const UNIPILE_API_KEY = Deno.env.get('UNIPILE_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const reqBodyData = await req.json() as { accountId?: string; userId?: string }
    const { accountId, userId } = reqBodyData

    if (!accountId) {
      return new Response(JSON.stringify({ error: 'Missing accountId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const url = `${UNIPILE_API_URL}/api/v1/accounts/${accountId}/sync`

    const headers = {
      'X-API-KEY': UNIPILE_API_KEY,
      'Content-Type': 'application/json',
      'accept': 'application/json',
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
    })

    const data = await response.json()

    if (userId) {
      const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/accounts?id=eq.${encodeURIComponent(accountId)}`, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        }
      })
      const existing = await checkRes.json() as Array<unknown>

      if (!existing || existing.length === 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/accounts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            id: accountId,
            unipile_account_id: accountId,
            user_id: userId,
            name: 'LinkedIn',
            status: 'CREATION_SUCCESS',
            initials: 'LI', // Será atualizado via fetchAccounts quando buscar dados do Unipile
          }),
        })
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/accounts?id=eq.${encodeURIComponent(accountId)}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'CREATION_SUCCESS' }),
        })
      }
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})