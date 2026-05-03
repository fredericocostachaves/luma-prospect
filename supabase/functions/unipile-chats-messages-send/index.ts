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
    const reqBodyData = await req.json() as {
      chatId?: string
      text?: string
      senderId?: string
      accountId?: string
    }
    const { chatId, text, senderId, accountId } = reqBodyData

    if (!chatId || !text || !senderId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const params = new URLSearchParams()
    if (accountId) params.set('account_id', accountId)

    const apiUrl = `${UNIPILE_API_URL}/api/v1/chats/${encodeURIComponent(chatId)}/messages${params.toString() ? `?${params}` : ''}`

    const headers = {
      'X-API-KEY': UNIPILE_API_KEY,
      'Content-Type': 'application/json',
      'accept': 'application/json',
    }

    const body = { text, sender_id: senderId }
    if (accountId) (body as any).account_id = accountId

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const data = await response.json()
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