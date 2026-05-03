import supabase from '../utils/supabase'

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_EDGE_FUNCTIONS_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || ''

const getEdgeFunctionUrl = (path: string) => {
  if (!EDGE_FUNCTION_URL) return path;
  
  // Garante que baseUrl não termine com / e path comece com /
  const baseUrl = EDGE_FUNCTION_URL.endsWith('/') ? EDGE_FUNCTION_URL.slice(0, -1) : EDGE_FUNCTION_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${cleanPath}`;
}

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token || SUPABASE_ANON_KEY
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

const parseJsonResponse = async (response: Response): Promise<any> => {
  const text = await response.text()
  const contentType = response.headers.get('content-type')

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Sessão expirada. Faça login novamente.')
    }
    throw new Error(`Erro na requisição: ${response.status} - ${text}`)
  }

  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('O servidor retornou HTML em vez de JSON.')
  }

  return JSON.parse(text)
}

export interface HostedAuthRequest {
  type: 'create' | 'reconnect'
  providers: string[] | '*'
  api_url: string
  expiresOn: string
  notify_url?: string
  name?: string
  success_redirect_url?: string
  failure_redirect_url?: string
  reconnect_account?: string
}

export interface HostedAuthResponse {
  object: 'HostedAuthURL' | 'HostedAuthUrl'
  url: string
}

export const getHostedAuthLink = async (userId?: string, successRedirectUrl?: string): Promise<HostedAuthResponse> => {
  try {
    const url = getEdgeFunctionUrl('/unipile-accounts-link')
    const headers = await getAuthHeaders()
    const body: Record<string, string> = { success_redirect_url: successRedirectUrl || window.location.origin }
    if (userId) {
      body.userId = userId
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })

    return await parseJsonResponse(response)
  } catch (error) {
    throw error
  }
}

export const listAccounts = async (): Promise<any> => {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(getEdgeFunctionUrl('/unipile-accounts'), {
      method: 'GET',
      headers
    })

    return await parseJsonResponse(response)
  } catch (error) {
    throw error
  }
}

export const syncLinkedInAccount = async (payload: { accountId: string; userId: string }): Promise<any> => {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(getEdgeFunctionUrl('/unipile-accounts-sync'), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })

    return await parseJsonResponse(response)
  } catch (error) {
    throw error
  }
}

export interface UnipileAccount {
  object: string
  id: string
  name: string
  type: string
  sources: Array<{
    type: string
    status: string
    id: string
  }>
  created_at: string
  updated_at: string
  profile_picture_url?: string
}

export const getAccountById = async (accountId: string): Promise<UnipileAccount | null> => {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(getEdgeFunctionUrl(`/unipile-accounts/${accountId}`), {
      method: 'GET',
      headers
    })
    
    if (!response.ok) {
      return null
    }
    
    return await response.json()
  } catch (error) {
    return null
  }
}

export interface UnipileAccountOwner {
  id: string
  name: string
  profile_picture_url?: string
  headline?: string
  location?: string
  public_url?: string
}

export const getAccountOwner = async (accountId: string): Promise<UnipileAccountOwner | null> => {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(getEdgeFunctionUrl(`/unipile-account-owner?account_id=${encodeURIComponent(accountId)}`), {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    return null
  }
}

export const redirectToHostedAuth = (url: string) => {
  window.location.assign(url)
}

export interface HostedReconnectRequest {
  accountId: string
  type: 'reconnect'
  providers: string[]
  notifyUrl?: string
  successRedirectUrl?: string
  failureRedirectUrl?: string
}

export interface HostedReconnectResponse {
  object: string
  url: string
}

export const getReconnectLink = async (payload: HostedReconnectRequest): Promise<HostedReconnectResponse> => {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(getEdgeFunctionUrl('/unipile-accounts-reconnect'), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })

    return await parseJsonResponse(response)
  } catch (error) {
    throw error
  }
}

export const deleteAccount = async (accountId: string): Promise<void> => {
  const headers = await getAuthHeaders()
  await fetch(getEdgeFunctionUrl(`/unipile-accounts-delete?accountId=${encodeURIComponent(accountId)}`), {
    method: 'DELETE',
    headers
  })
}

export interface AttachmentSize {
  width?: number
  height?: number
}

export interface Attachment {
  id?: string
  file_size?: number
  unavailable?: boolean
  mimetype?: string
  url?: string
  url_expires_at?: number
  type?: string
  size?: AttachmentSize
  sticker?: boolean
  gif?: boolean
  duration?: number
  voice_note?: boolean
  file_name?: string
  starts_at?: number
  expires_at?: number
  time_range?: number
}

export interface Quoted {
  message_id?: string
  provider_id?: string
  sender_id?: string
  text?: string
  attachments?: Attachment[]
}

export interface Reaction {
  value?: string
  sender_id?: string
  is_sender?: boolean
}

export interface LastMessage {
  message_id?: string
  provider_id?: string
  sender_id?: string
  text?: string
  attachments?: Attachment[]
  id?: string
  chat_id?: string
  chat_provider_id?: string
  timestamp?: string
  is_sender?: number
  quoted?: Quoted
  reactions?: Reaction[]
  seen?: number
  seen_by?: Record<string, any>
  hidden?: number
  deleted?: number
  edited?: number
  is_event?: number
  delivered?: number
  behavior?: number
  event_type?: string
}

export interface UnipileChat {
  attendees?: UnipileChatAttendee[];
  attendee_id?: string;
  object?: string
  id: string
  account_id?: string
  account_type?: string
  provider_id?: string
  attendee_provider_id?: string
  name?: string
  type?: number
  timestamp?: string
  unread_count?: number
  archived?: number
  muted_until?: any
  read_only?: number
  disabledFeatures?: string[]
  subject?: string
  organization_id?: string
  mailbox_id?: string
  content_type?: string
  folder?: string[]
  pinned?: number
  lastMessage?: LastMessage
}

export interface UnipileChatsResponse {
  object?: string
  items?: UnipileChat[]
  cursor?: string
}

export interface ListChatsParams {
  unread?: boolean
  cursor?: string
  before?: string
  after?: string
  limit?: number
  account_type?: string
  account_id?: string
}

export const listChats = async (params?: ListChatsParams): Promise<UnipileChatsResponse> => {
  try {
    const url = getEdgeFunctionUrl('/unipile-chats')
    const headers = await getAuthHeaders()
    const body = params ? {
      ...(params.unread !== undefined && { unread: params.unread }),
      ...(params.cursor && { cursor: params.cursor }),
      ...(params.before && { before: params.before }),
      ...(params.after && { after: params.after }),
      ...(params.limit && { limit: params.limit }),
      ...(params.account_type && { account_type: params.account_type }),
      ...(params.account_id && { account_id: params.account_id }),
    } : {}

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })

    const data = await parseJsonResponse(response)
    return data
  } catch (error) {
    throw error
  }
}

export const getChatMessages = async (chatId: string, accountId?: string): Promise<ListChatMessagesResponse> => {
  try {
    const queryParams = new URLSearchParams()
    if (accountId) queryParams.set('account_id', accountId)
    queryParams.set('limit', '50')

    const url = getEdgeFunctionUrl(`/unipile-chats-messages-get?chatId=${encodeURIComponent(chatId)}&${queryParams}`)
    const headers = await getAuthHeaders()
    const response = await fetch(url, {
      method: 'GET',
      headers
    })

    const data = await parseJsonResponse(response)
    return data
  } catch (error) {
    throw error
  }
}

export const getChat = async (chatId: string, accountId?: string): Promise<UnipileChat | null> => {
  try {
    const queryParams = new URLSearchParams()
    if (accountId) queryParams.set('account_id', accountId)
    
    const url = getEdgeFunctionUrl(`/unipile-chat-get?chatId=${encodeURIComponent(chatId)}${queryParams.toString() ? `&${queryParams}` : ''}`)
    const headers = await getAuthHeaders()
    const response = await fetch(url, {
      method: 'GET',
      headers
    })

    const data = await parseJsonResponse(response)
    // Remove _debug before returning
    if (data?._debug) delete data._debug
    return data as UnipileChat | null
  } catch (error) {
    return null
  }
}

export interface UnipileChatAttendee {
  display_name: string | undefined;
  title: string;
  object?: string
  id: string
  account_id?: string
  provider_id?: string
  name?: string
  is_self?: number
  hidden?: number
  picture_url?: string
  profile_picture_url?: string
  avatar_url?: string
  profile_url?: string
  specifics?: Record<string, any>
}

export const getChatAttendee = async (attendeeId?: string, accountId?: string, chatId?: string): Promise<UnipileChatAttendee | null> => {
  try {
    const headers = await getAuthHeaders()
    const body: Record<string, string> = {
      ...(attendeeId && { attendeeId }),
      ...(accountId && { accountId }),
      ...(chatId && { chatId }),
    }

    const response = await fetch(getEdgeFunctionUrl('/unipile-chat-attendees'), {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })

    const data = await parseJsonResponse(response)
    // Find the specific attendee in the attendees list
    if (data?.items && Array.isArray(data.items)) {
      if (attendeeId) {
        return data.items.find((a: any) => a.id === attendeeId) || null
      }
      // Se não passou ID, pega o primeiro que não seja o próprio usuário
      return data.items.find((a: any) => !a.is_self) || data.items[0] || null
    }
    return null
  } catch (error) {
    return null
  }
}

export interface UnipileMessage {
  id: string
  chat_id: string
  sender_id: string
  text: string
  timestamp?: string
  is_sender?: boolean
}

export interface ListChatMessagesParams {
  chat_id: string
  limit?: number
  before?: string
  after?: string
  account_id?: string
}

export interface ListChatMessagesResponse {
  object?: string
  items?: UnipileMessage[]
  cursor?: string
}

export const listChatMessages = async (params: ListChatMessagesParams): Promise<ListChatMessagesResponse> => {
  try {
    const queryParams = new URLSearchParams()
    if (params.limit) queryParams.set('limit', String(params.limit))
    if (params.before) queryParams.set('before', params.before)
    if (params.after) queryParams.set('after', params.after)
    if (params.account_id) queryParams.set('account_id', params.account_id)

    const url = getEdgeFunctionUrl(`/unipile-chats-messages-get?chatId=${encodeURIComponent(params.chat_id)}${queryParams.toString() ? `&${queryParams}` : ''}`)
    const headers = await getAuthHeaders()
    const response = await fetch(url, {
      method: 'GET',
      headers
    })
    return await parseJsonResponse(response)
  } catch (error) {
    throw error
  }
}

export interface SendMessageRequest {
  chat_id: string
  text: string
  sender_id: string
  account_id?: string
}

export interface SendMessageResponse {
  object?: string
  id?: string
  status?: string
}

export const sendMessageInChat = async (payload: SendMessageRequest): Promise<SendMessageResponse> => {
  try {
    const headers = await getAuthHeaders()
    const url = getEdgeFunctionUrl('/unipile-chats-messages-send')
    const body = {
      chatId: payload.chat_id,
      text: payload.text,
      senderId: payload.sender_id,
      accountId: payload.account_id
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
    return await parseJsonResponse(response)
  } catch (error) {
    throw error
  }
}

export interface StartChatRequest {
  account_id: string
  attendee_id: string
  initial_message?: string
}

export interface StartChatResponse {
  object?: string
  chat_id?: string
}

export const startChat = async (payload: StartChatRequest): Promise<StartChatResponse> => {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(getEdgeFunctionUrl('/unipile-chats-start'), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        accountId: payload.account_id,
        attendeeId: payload.attendee_id,
        initialMessage: payload.initial_message
      })
    })
    return await parseJsonResponse(response)
  } catch (error) {
    throw error
  }
}

export interface SendConnectRequest {
  account_id: string
  attendee_id: string
  message?: string
}

export interface SendConnectResponse {
  object?: string
  status?: string
}

export interface UnipileInvitation {
  id: string
  account_id: string
  provider_id: string
  sender_id: string
  recipient_id: string
  status: string
  message?: string
  timestamp?: string
  sent_date?: string
  date?: string
  invited_user?: string
  invited_user_description?: string
  invited_user_id?: string
  attendee?: UnipileChatAttendee
  recipient?: UnipileChatAttendee
  sender?: UnipileChatAttendee
}

export interface ListInvitationsResponse {
  object: string
  items: UnipileInvitation[]
  cursor?: string
}

export interface SendInvitationRequest {
  account_id: string
  provider_id: string
  message?: string
}

export const listSentInvitations = async (accountId: string): Promise<ListInvitationsResponse> => {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(getEdgeFunctionUrl(`/unipile-invitations-sent?account_id=${encodeURIComponent(accountId)}`), {
      method: 'GET',
      headers
    })
    return await parseJsonResponse(response)
  } catch (error) {
    throw error
  }
}

export const listReceivedInvitations = async (accountId: string): Promise<ListInvitationsResponse> => {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(getEdgeFunctionUrl(`/unipile-invitations-received?account_id=${encodeURIComponent(accountId)}`), {
      method: 'GET',
      headers
    })
    return await parseJsonResponse(response)
  } catch (error) {
    throw error
  }
}

export const sendInvitation = async (payload: SendInvitationRequest): Promise<any> => {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(getEdgeFunctionUrl('/unipile-invitations-send'), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })
    return await parseJsonResponse(response)
  } catch (error) {
    throw error
  }
}

export const handleInvitation = async (invitationId: string, action: 'ACCEPT' | 'DECLINE'): Promise<any> => {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(getEdgeFunctionUrl(`/unipile-invitations-handle?invitationId=${encodeURIComponent(invitationId)}`), {
      method: 'POST',
      headers,
      body: JSON.stringify({ action })
    })
    return await parseJsonResponse(response)
  } catch (error) {
    throw error
  }
}

export const cancelInvitation = async (invitationId: string): Promise<any> => {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(getEdgeFunctionUrl(`/unipile-invitations-cancel?invitationId=${encodeURIComponent(invitationId)}`), {
      method: 'DELETE',
      headers
    })
    return await parseJsonResponse(response)
  } catch (error) {
    throw error
  }
}

export interface UnipileUserProfile {
  object: string
  provider: string
  provider_id: string
  public_identifier?: string
  member_urn?: string
  first_name?: string
  last_name?: string
  display_name?: string
  headline?: string
  location?: string
  profile_picture_url?: string
  picture_url?: string
  avatar_url?: string
  profile_picture_url_large?: string
  background_picture_url?: string
  connections_count?: number
  follower_count?: number
  title?: string // Para compatibilidade com busca
}

export interface LinkedInSearchParameter {
  object: 'LinkedinSearchParameter'
  title: string
  id: string
  picture_url?: string
}

export interface LinkedInSearchParametersResponse {
  object: 'LinkedinSearchParametersList'
  items: LinkedInSearchParameter[]
  paging: {
    page_count: number
  }
}

export interface LinkedInSearchRequest {
  account_id: string
  api?: 'classic' | 'sales_navigator' | 'recruiter'
  category?: 'people' | 'companies' | 'jobs' | 'posts'
  keywords?: string
  location?: string[]
  industry?: string[]
  network_distance?: (1 | 2 | 3)[]
  company?: string[]
  [key: string]: any
}

export interface LinkedInSearchResponse {
  object: 'LinkedinSearchList'
  items: UnipileUserProfile[]
  cursor?: string
}

export const getProfile = async (identifier: string, accountId: string): Promise<UnipileUserProfile | null> => {
  try {
    const headers = await getAuthHeaders()
    const url = getEdgeFunctionUrl(`/unipile-profile-get?identifier=${encodeURIComponent(identifier)}&account_id=${encodeURIComponent(accountId)}`)
    const response = await fetch(url, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    if (data?._debug) delete data._debug
    return data as UnipileUserProfile
  } catch (error) {
    return null
  }
}

export const getLinkedInSearchParameters = async (accountId: string, type: string, keywords?: string): Promise<LinkedInSearchParametersResponse> => {
  try {
    const headers = await getAuthHeaders()
    const queryParams = new URLSearchParams({ account_id: accountId, type })
    if (keywords) queryParams.append('keywords', keywords)
    
    const url = getEdgeFunctionUrl(`/unipile-linkedin-search-parameters?${queryParams.toString()}`)
    const response = await fetch(url, {
      method: 'GET',
      headers
    })

    return await parseJsonResponse(response)
  } catch (error) {
    throw error
  }
}

export const performLinkedInSearch = async (payload: LinkedInSearchRequest): Promise<LinkedInSearchResponse> => {
  try {
    const headers = await getAuthHeaders()
    const url = getEdgeFunctionUrl('/unipile-linkedin-search')
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })

    return await parseJsonResponse(response)
  } catch (error) {
    throw error
  }
}

export const sendConnectRequest = async (payload: SendConnectRequest): Promise<SendConnectResponse> => {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(getEdgeFunctionUrl('/unipile-connect'), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        accountId: payload.account_id,
        attendeeId: payload.attendee_id,
        message: payload.message
      })
    })
    return await parseJsonResponse(response)
  } catch (error) {
    throw error
  }
}