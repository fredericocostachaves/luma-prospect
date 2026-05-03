export {}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

const UNIPILE_API_URL = Deno.env.get('UNIPILE_API_URL') || 'https://api34.unipile.com:16410'
const UNIPILE_API_KEY = Deno.env.get('UNIPILE_API_KEY') || ''

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const identifier = url.searchParams.get('identifier')
    const account_id = url.searchParams.get('account_id')

    if (!identifier || !account_id) {
      return new Response(JSON.stringify({ error: 'Missing identifier or account_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    const apiUrl = `${UNIPILE_API_URL}/api/v1/users/${identifier}?account_id=${account_id}`

    const headers = {
      'X-API-KEY': UNIPILE_API_KEY,
      'accept': 'application/json',
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
    })

    const responseData = await response.json().catch(() => ({}))
    const data: Record<string, any> = typeof responseData === 'object' && responseData !== null ? responseData as Record<string, any> : {}

    const debug = {
      unipileApiStatus: response.status,
      unipileApiUrl: apiUrl,
      requestParams: { identifier, account_id },
      responseData: data,
    }

    return new Response(JSON.stringify({ ...data, _debug: debug }), {
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
