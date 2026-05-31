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
    const body = await req.json()
    const { account_id, post_id, reaction_type } = body

    if (!account_id || !post_id) {
      return new Response(JSON.stringify({ error: 'Missing account_id or post_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const apiUrl = `${UNIPILE_API_URL}/api/v1/posts/reaction`

    const requestBody = JSON.stringify({
      account_id,
      post_id,
      reaction_type: reaction_type || 'like',
    })

    console.log('Request URL:', apiUrl)
    console.log('Request body:', requestBody)

    const headers = {
      'X-API-KEY': UNIPILE_API_KEY,
      'accept': 'application/json',
      'Content-Type': 'application/json',
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: requestBody,
    })

    const responseText = await response.text()
    console.log('Response status:', response.status)
    console.log('Response body:', responseText)

    let responseData: any = {}
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { raw: responseText }
    }

    return new Response(JSON.stringify(responseData), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
