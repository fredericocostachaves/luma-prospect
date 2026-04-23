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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseServiceKey,
      }
    })

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const user = await userResponse.json()
    if (!user.id) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const url = new URL(req.url)
    const path = url.pathname.replace('/unipile', '')
    const method = req.method

    let upstreamUrl = `${UNIPILE_API_URL}/api/v1${path}`
    const urlParams = url.searchParams.toString()
    if (urlParams) {
      upstreamUrl += `?${urlParams}`
    }

    const headers = {
      'X-API-KEY': UNIPILE_API_KEY,
      'Content-Type': 'application/json',
    }

    let body = undefined
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        const requestBody = await req.json()
        if (Object.keys(requestBody).length > 0) {
          body = JSON.stringify(requestBody)
        }
      } catch {
        body = undefined
      }
    }

    const upstreamResponse = await fetch(upstreamUrl, {
      method,
      headers,
      body,
    })

    const responseData = await upstreamResponse.json()

    return new Response(JSON.stringify(responseData), {
      status: upstreamResponse.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})