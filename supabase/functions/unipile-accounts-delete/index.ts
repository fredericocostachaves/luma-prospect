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
    const url = new URL(req.url)
    const accountId = url.searchParams.get('accountId')

    if (!accountId) {
      return new Response(JSON.stringify({ error: 'Missing accountId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Busca o unipile_account_id no banco para apagar também do Unipile
    const lookupRes = await fetch(`${SUPABASE_URL}/rest/v1/accounts?id=eq.${encodeURIComponent(accountId)}&select=unipile_account_id`, {
      headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
    })
    const accounts = await lookupRes.json() as Array<{ unipile_account_id?: string | null }>

    if (accounts && accounts.length > 0 && accounts[0].unipile_account_id) {
      try {
        await fetch(`${UNIPILE_API_URL}/api/v1/accounts/${accounts[0].unipile_account_id}`, {
          method: 'DELETE',
          headers: { 'X-API-KEY': UNIPILE_API_KEY }
        })
      } catch (_) {
        // Não crítico
      }
    }

    await fetch(`${SUPABASE_URL}/rest/v1/accounts?id=eq.${encodeURIComponent(accountId)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      }
    })

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