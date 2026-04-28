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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
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

    const reqBodyData = await req.json() as { success_redirect_url?: string; userId?: string }
    const successRedirectUrl = reqBodyData.success_redirect_url || 'http://localhost:3000'
    const userId = reqBodyData.userId

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (userId !== authenticatedUserId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const fullUrl = `${UNIPILE_API_URL}/api/v1/hosted/accounts/link`
    const webhookUrl = `${supabaseUrl}/functions/v1/unipile-webhook?apikey=${supabaseAnonKey}`

    const expiresOn = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const reqBody = {
      type: 'create',
      providers: ['LINKEDIN'],
      expiresOn: expiresOn,
      success_redirect_url: successRedirectUrl,
      api_url: UNIPILE_API_URL,
      name: userId,
      notify_url: webhookUrl,
    }

    const headers = {
      'X-API-KEY': UNIPILE_API_KEY,
      'Content-Type': 'application/json',
      'accept': 'application/json',
    }

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(reqBody),
    })

    const data = await response.json() as Record<string, unknown>

    if (data.url && typeof data.url === 'string') {
      data.url = data.url.replace('account.unipile.com', 'auth.fredcosta.tech')
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