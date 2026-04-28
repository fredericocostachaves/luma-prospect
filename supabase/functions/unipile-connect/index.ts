export {}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

const UNIPILE_API_URL = Deno.env.get('UNIPILE_API_URL') || 'https://api34.unipile.com:16410'
const UNIPILE_API_KEY = Deno.env.get('UNIPILE_API_KEY') || ''

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const reqBodyData = await req.json() as {
      accountId?: string
      attendeeId?: string
      message?: string
    }
    const { accountId, attendeeId, message } = reqBodyData

    if (!accountId || !attendeeId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const apiUrl = `${UNIPILE_API_URL}/api/v1/connect`

    const headers = {
      'X-API-KEY': UNIPILE_API_KEY,
      'Content-Type': 'application/json',
      'accept': 'application/json',
    }

    const body: Record<string, string> = {
      account_id: accountId,
      attendee_id: attendeeId,
    }
    if (message) body.message = message

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