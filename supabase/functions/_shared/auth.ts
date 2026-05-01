export interface AuthenticatedUser {
  id?: string;
}

export async function getAuthenticatedUser(
  req: Request,
  supabaseUrl: string,
  supabaseAnonKey: string,
  corsHeaders: Record<string, string>
): Promise<{ user: AuthenticatedUser; errorResponse?: Response }> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return {
      user: {},
      errorResponse: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    };
  }

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      'Authorization': authHeader,
      'apikey': supabaseAnonKey,
    }
  });

  const user = await userResponse.json() as AuthenticatedUser;

  if (!user?.id) {
    return {
      user: {},
      errorResponse: new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    };
  }

  return { user };
}
