export {}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

const UNIPILE_API_URL = Deno.env.get('UNIPILE_API_URL') || 'https://api34.unipile.com:16410'
const UNIPILE_API_KEY = Deno.env.get('UNIPILE_API_KEY') || ''

Deno.serve(async (req) => {
  // Tratamento de CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const chatId = url.searchParams.get('chatId')
    const accountId = url.searchParams.get('account_id')

    if (!chatId) {
      return new Response(JSON.stringify({ error: 'Missing chatId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const params = new URLSearchParams()
    if (accountId) params.set('account_id', accountId)

    const apiUrl = `${UNIPILE_API_URL}/api/v1/chats/${encodeURIComponent(chatId)}${params.toString() ? `?${params}` : ''}`

    const headers = {
      'X-API-KEY': UNIPILE_API_KEY,
      'accept': 'application/json',
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
    })

    const jsonData = await response.json().catch(() => ({}))
    const responseData = (typeof jsonData === 'object' && jsonData !== null ? jsonData : {}) as Record<string, any>
    
    const debug = {
      requestParams: { chatId, accountId },
      unipileApiUrl: apiUrl,
      unipileApiStatus: response.status,
    }

    return new Response(JSON.stringify({ ...responseData, _debug: debug }), {
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
