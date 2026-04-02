/* 
  === DATA ARCHITECTURE & SCHEMA DEFINITION ===

  1. User (The SaaS Customer)
     - id: UUID
     - username: String
     - plan_tier: Enum (FREE, PRO, BUSINESS)
     - created_at: Timestamp

  2. LinkedInAccount (Connected Profiles)
     - id: UUID
     - user_id: UUID (Foreign Key)
     - linkedin_uid: String (The actual LI ID)
     - cookie_session: String (Encrypted)
     - proxy_settings: JSON
     - status: Enum (ACTIVE, DISCONNECTED, RESTRICTED)
     - daily_limit_reached: Boolean

  3. Audience (List)
     - id: UUID
     - account_id: UUID
     - name: String
     - filters: JSON (The search criteria used)
     - created_at: Timestamp

  4. Lead (The Prospect)
     - id: UUID
     - audience_id: UUID
     - linkedin_url: String
     - full_name: String
     - headline: String
     - company: String
     - connection_status: Enum (NOT_CONNECTED, PENDING, CONNECTED)
     - reply_status: Enum (NO_REPLY, REPLIED, INTERESTED, NOT_INTERESTED)
     - current_campaign_id: UUID (Nullable)
     - last_interaction_at: Timestamp

  5. Campaign (The Workflow)
     - id: UUID
     - account_id: UUID
     - name: String
     - status: Enum (DRAFT, RUNNING, PAUSED)
     - steps_config: JSON (Serialized React Flow nodes/edges)
     - metrics: JSON (sent_count, accepted_count, replied_count)

  6. ActionQueue (The Automation Engine)
     - id: UUID
     - lead_id: UUID
     - campaign_id: UUID
     - action_type: Enum (VIEW_PROFILE, LIKE_POST, SEND_CONNECT, SEND_MESSAGE, CHECK_ACCEPTANCE)
     - status: Enum (PENDING, PROCESSING, COMPLETED, FAILED)
     - scheduled_for: Timestamp
     - payload: JSON (e.g., message body content)
     - retry_count: Integer

*/

export interface Lead {
  id: string;
  name: string;
  headline: string;
  avatarUrl: string;
  status: 'new' | 'contacted' | 'replied' | 'qualified' | 'converted';
  campaignName: string;
  lastActivity: string;
  tags: string[];
}

export interface CampaignStep {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay';
  label: string;
  config?: any;
}

export enum KanbanColumnId {
  QUALIFIED = 'qualified',
  NEGOTIATION = 'negotiation',
  PROPOSAL = 'proposal',
  CLOSED = 'closed'
}

export interface KanbanItem {
  id: string;
  content: string;
  leadName: string;
  leadCompany: string;
  timeReceived: string;
  value?: string;
}

export interface FilterState {
  jobTitle: string;
  location: string;
  industry: string;
  companySize: string;
  keywords: string;
}