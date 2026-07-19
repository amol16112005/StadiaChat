export type UserRole = "Volunteer" | "Operations_Lead";
export type AccountStatus = "pending" | "approved" | "rejected";
export type MessageCategory = "A" | "B" | "C" | "D";
export type IncidentSeverity = "normal" | "serious";
export type IncidentStatus = "open" | "resolved" | "safety_override";

export interface SessionMeta {
  stadium_id: string;
  stadium_pin: string;
  user_role: UserRole;
}

export interface Stadium {
  id: string;
  name: string;
  pin: string;
  ops_credential: string;
  city: string;
}

export interface User {
  id: string;
  name: string;
  preferred_language: string;
  stadium_id: string;
  role: UserRole;
  status: AccountStatus;
  password?: string;
  created_at: string;
}

export interface Protocol {
  id: string;
  stadium_id: string;
  category: "faq" | "emergency";
  keywords: string[];
  title: string;
  /** Map language code -> body text */
  body: Record<string, string>;
}

export type OpsPlanPriority = "low" | "medium" | "high" | "critical";
export type OpsPlanStatus =
  | "planned"
  | "assigned"
  | "active"
  | "completed"
  | "cancelled";

/** Operations planning post — place of assistance + staffing */
export interface OpsPlan {
  id: string;
  stadium_id: string;
  title: string;
  description: string;
  /** Primary place of assistance (gate / section / facility) */
  location_tag: string;
  location_detail?: string;
  priority: OpsPlanPriority;
  status: OpsPlanStatus;
  assigned_volunteer_ids: string[];
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  /** Optional match window label e.g. T-60 to kickoff */
  time_window?: string;
}

export interface MessageAttachment {
  id: string;
  url: string;
  name: string;
  mime: string;
  size: number;
}

export interface ChatMessage {
  id: string;
  stadium_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: UserRole | "System";
  recipient_id: string | "broadcast_ops" | "broadcast_volunteer";
  text: string;
  original_text?: string;
  language: string;
  category?: MessageCategory;
  ui_component?:
    | "text"
    | "alert_card"
    | "actionable_task_card"
    | "serious_alert"
    | "fan_voice_reply"
    | "volunteer_coaching";
  task_title?: string;
  location_tag?: string;
  location_detail?: string;
  priority?: OpsPlanPriority;
  plan_id?: string;
  accept_action?: boolean;
  remediation_options?: string[];
  /** Numbered steps for volunteer hands-on help (coaching cards) */
  coaching_steps?: string[];
  /** Optional photo evidence from volunteer (when they feel necessary) */
  attachments?: MessageAttachment[];
  incident_id?: string;
  audio_alert?: boolean;
  created_at: string;
  accepted?: boolean;
}

export interface Incident {
  id: string;
  stadium_id: string;
  reporter_id: string;
  reporter_name: string;
  text: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category: "C" | "D";
  remediation_options: string[];
  selected_option?: string;
  custom_instruction?: string;
  timer_deadline?: string;
  timer_duration?: number;
  safety_directive?: string;
  created_at: string;
  resolved_at?: string;
}

export interface Database {
  stadiums: Stadium[];
  users: User[];
  protocols: Protocol[];
  messages: ChatMessage[];
  incidents: Incident[];
  ops_plans: OpsPlan[];
}

export interface AuthSession {
  user_id: string;
  stadium_id: string;
  user_role: UserRole;
  name: string;
  preferred_language: string;
  status: AccountStatus;
}
