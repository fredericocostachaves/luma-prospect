import supabase from '../utils/supabase'

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_EDGE_FUNCTIONS_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || ''

const getEdgeFunctionUrl = (path: string) => {
  if (EDGE_FUNCTION_URL) {
    return `${EDGE_FUNCTION_URL}${path}`
  }
  return path
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
    console.error('Resposta inesperada (não-JSON):', text.substring(0, 100))
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
    console.error('Erro ao chamar o backend para Hosted Auth:', error)
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
    console.error('Erro ao listar contas do Unipile:', error)
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
    console.error('Erro ao sincronizar conta LinkedIn:', error)
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
}

export const getAccountById = async (accountId: string): Promise<UnipileAccount | null> => {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(getEdgeFunctionUrl(`/unipile-accounts/${accountId}`), {
      method: 'GET',
      headers
    })
    
    if (!response.ok) {
      console.error('Erro ao buscar conta no Unipile:', response.status)
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error('Erro ao buscar conta por ID:', error)
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
    console.error('Erro ao gerar link de reconexão:', error)
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
    const queryParams = new URLSearchParams()
    if (params) {
      if (params.unread !== undefined) queryParams.set('unread', String(params.unread))
      if (params.cursor) queryParams.set('cursor', params.cursor)
      if (params.before) queryParams.set('before', params.before)
      if (params.after) queryParams.set('after', params.after)
      if (params.limit) queryParams.set('limit', String(params.limit))
      if (params.account_type) queryParams.set('account_type', params.account_type)
      if (params.account_id) queryParams.set('account_id', params.account_id)
    }

    const url = getEdgeFunctionUrl(`/unipile-chats${queryParams.toString() ? `?${queryParams}` : ''}`)
    const headers = await getAuthHeaders()
    const response = await fetch(url, {
      method: 'GET',
      headers
    })

    return await parseJsonResponse(response)
  } catch (error) {
    console.error('Erro ao listar chats do Unipile:', error)
    throw error
  }
}

export const getChat = async (chatId: string): Promise<UnipileChat | null> => {
  try {
    const headers = await getAuthHeaders()
    const url = getEdgeFunctionUrl(`/unipile-chats-messages?chatId=${encodeURIComponent(chatId)}`)
    const response = await fetch(url, {
      method: 'GET',
      headers
    })

    return await parseJsonResponse(response)
  } catch (error) {
    console.error(`Erro ao buscar chat ${chatId}:`, error)
    return null
  }
}

export interface UnipileChatAttendee {
  object?: string
  id: string
  account_id?: string
  provider_id?: string
  name?: string
  is_self?: number
  hidden?: number
  picture_url?: string
  profile_url?: string
  specifics?: Record<string, any>
}

export const getChatAttendee = async (attendeeId: string): Promise<UnipileChatAttendee | null> => {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(getEdgeFunctionUrl(`/unipile-chat-attendees?attendeeId=${encodeURIComponent(attendeeId)}`), {
      method: 'GET',
      headers
    })

    return await parseJsonResponse(response)
  } catch (error) {
    console.error(`Erro ao buscar attendee ${attendeeId}:`, error)
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
    console.error('Erro ao listar mensagens do chat:', error)
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
    console.error('Erro ao enviar mensagem:', error)
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
    console.error('Erro ao iniciar chat:', error)
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
    console.error('Erro ao enviar solicitação de conexão:', error)
    throw error
  }
}