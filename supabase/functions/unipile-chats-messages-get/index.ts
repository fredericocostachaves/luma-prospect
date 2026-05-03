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
    const chatId = url.searchParams.get('chatId')
    const limit = url.searchParams.get('limit')
    const before = url.searchParams.get('before')
    const after = url.searchParams.get('after')
    const accountId = url.searchParams.get('account_id')

    if (!chatId) {
      return new Response(JSON.stringify({ error: 'Missing chatId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const params = new URLSearchParams()
    if (limit) params.set('limit', limit)
    if (before) params.set('before', before)
    if (after) params.set('after', after)
    if (accountId) params.set('account_id', accountId)

    const apiUrl = `${UNIPILE_API_URL}/api/v1/chats/${encodeURIComponent(chatId)}/messages${params.toString() ? `?${params}` : ''}`

    const headers = {
      'X-API-KEY': UNIPILE_API_KEY,
      'accept': 'application/json',
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
    })

    let data: Record<string, any> = {}
    try {
      const jsonData = await response.json()
      if (typeof jsonData === 'object' && jsonData !== null) {
        data = jsonData as Record<string, any>
      }
    } catch (_e) {
      data = {}
    }

    const debug = {
      requestParams: { chatId, limit, before, after, accountId },
      unipileApiUrl: apiUrl,
      unipileApiStatus: response.status,
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