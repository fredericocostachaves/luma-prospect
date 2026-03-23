export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string
          status: 'Ativo' | 'Desconectado' | 'Restrito'
          initials: string | null
          proxy_settings: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email: string
          status?: 'Ativo' | 'Desconectado' | 'Restrito'
          initials?: string | null
          proxy_settings?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string
          status?: 'Ativo' | 'Desconectado' | 'Restrito'
          initials?: string | null
          proxy_settings?: Json | null
          created_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          user_id: string
          account_id: string
          name: string
          status: 'Ativa' | 'Pausada' | 'Rascunho' | 'Finalizada'
          nodes: Json | null
          edges: Json | null
          settings: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          name: string
          status?: 'Ativa' | 'Pausada' | 'Rascunho' | 'Finalizada'
          nodes?: Json | null
          edges?: Json | null
          settings?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          name?: string
          status?: 'Ativa' | 'Pausada' | 'Rascunho' | 'Finalizada'
          nodes?: Json | null
          edges?: Json | null
          settings?: Json | null
          created_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          user_id: string
          account_id: string
          name: string
          title: string | null
          company: string | null
          location: string | null
          linkedin_url: string | null
          status: string | null
          avatar: string | null
          tags: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          name: string
          title?: string | null
          company?: string | null
          location?: string | null
          linkedin_url?: string | null
          status?: string | null
          avatar?: string | null
          tags?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          name?: string
          title?: string | null
          company?: string | null
          location?: string | null
          linkedin_url?: string | null
          status?: string | null
          avatar?: string | null
          tags?: string[] | null
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          user_id: string
          account_id: string
          lead_id: string
          content: string
          direction: 'inbound' | 'outbound'
          is_read: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          lead_id: string
          content: string
          direction?: 'inbound' | 'outbound'
          is_read?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          lead_id?: string
          content?: string
          direction?: 'inbound' | 'outbound'
          is_read?: boolean | null
          created_at?: string
        }
      }
      pipeline_deals: {
        Row: {
          id: string
          user_id: string
          account_id: string
          lead_id: string
          stage: 'qualified' | 'negotiation' | 'closed'
          value: string | null
          content: string | null
          priority: 'low' | 'medium' | 'high'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          lead_id: string
          stage?: 'qualified' | 'negotiation' | 'closed'
          value?: string | null
          content?: string | null
          priority?: 'low' | 'medium' | 'high'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          lead_id?: string
          stage?: 'qualified' | 'negotiation' | 'closed'
          value?: string | null
          content?: string | null
          priority?: 'low' | 'medium' | 'high'
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          company_name: string | null
          updated_at: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          company_name?: string | null
          updated_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          company_name?: string | null
          updated_at?: string | null
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
