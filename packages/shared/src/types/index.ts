export enum UserRole {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER'
}

export enum BusinessVertical {
  BEAUTY_SALON = 'BEAUTY_SALON',
  AESTHETICS = 'AESTHETICS',
  NAIL_STUDIO = 'NAIL_STUDIO',
  HAIR_SALON = 'HAIR_SALON',
  DEPILATION = 'DEPILATION',
  SPA_WELLNESS = 'SPA_WELLNESS',
  INDEPENDENT_PRO = 'INDEPENDENT_PRO',
  OTHER = 'OTHER'
}

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  INTERESTED = 'INTERESTED',
  PENDING = 'PENDING',
  BOOKED = 'BOOKED',
  LOST = 'LOST'
}

export enum LeadIntent {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFORMATIONAL = 'INFORMATIONAL',
  URGENT = 'URGENT',
  REQUIRES_HUMAN = 'REQUIRES_HUMAN'
}

export enum LeadPriority {
  HOT = 'HOT',
  WARM = 'WARM',
  COLD = 'COLD'
}

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW'
}

export enum ConversationStatus {
  AI_HANDLED = 'AI_HANDLED',
  WAITING_USER = 'WAITING_USER',
  HUMAN_TAKEOVER = 'HUMAN_TAKEOVER',
  RESOLVED = 'RESOLVED'
}

export enum MessageSender {
  USER = 'USER',
  AI = 'AI',
  HUMAN_AGENT = 'HUMAN_AGENT',
  SYSTEM = 'SYSTEM'
}

export enum AIProviderType {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GEMINI = 'gemini',
  MOCK = 'mock'
}

export enum AgentRoleType {
  RECEPTIONIST = 'RECEPTIONIST',
  LEAD_INTELLIGENCE = 'LEAD_INTELLIGENCE',
  FOLLOW_UP = 'FOLLOW_UP',
  BOOKING = 'BOOKING',
  SUPERVISOR = 'SUPERVISOR'
}

export enum IntegrationType {
  WHATSAPP = 'WHATSAPP',
  GOOGLE_CALENDAR = 'GOOGLE_CALENDAR',
  GOOGLE_SHEETS = 'GOOGLE_SHEETS',
  N8N = 'N8N'
}

export enum IntegrationStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  CONFIGURING = 'CONFIGURING'
}

export interface BusinessHoursDay {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  open: string;  // e.g. "09:00"
  close: string; // e.g. "19:00"
  isOpen: boolean;
}

export interface ServiceItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  currency: string;
  durationMinutes: number;
  isActive: boolean;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface BusinessConfig {
  id: string;
  organizationId: string;
  businessName: string;
  description: string;
  vertical: BusinessVertical;
  location: string;
  timezone: string;
  contactPhone: string;
  contactEmail: string;
  currency: string;
  cancellationPolicy: string;
  services: ServiceItem[];
  businessHours: BusinessHoursDay[];
  faqs: FAQItem[];
  specialInstructions?: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  email?: string;
  requestedService?: string;
  status: LeadStatus;
  intent: LeadIntent;
  priority: LeadPriority;
  source: string;
  lastInteractionAt: string;
  nextFollowUpAt?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  organizationId: string;
  leadId?: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  status: AppointmentStatus;
  externalCalendarEventId?: string;
  cancellationReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: MessageSender;
  content: string;
  toolCalls?: ToolExecutionRecord[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  organizationId: string;
  leadId?: string;
  channel: string;
  channelConversationId: string;
  status: ConversationStatus;
  assignedAgent?: AgentRoleType;
  lastMessagePreview?: string;
  messagesCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface ToolExecutionRecord {
  toolName: string;
  arguments: Record<string, unknown>;
  result: unknown;
  success: boolean;
  timestamp: string;
}

export interface AgentConfig {
  id: string;
  organizationId: string;
  role: AgentRoleType;
  name: string;
  isActive: boolean;
  provider: AIProviderType;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  allowedTools: string[];
  handoffKeywords: string[];
}

export interface TimeSlot {
  startTime: string; // ISO string
  endTime: string;   // ISO string
  isAvailable: boolean;
}

export interface DashboardMetrics {
  totalInquiries: number;
  capturedLeads: number;
  activeConversations: number;
  confirmedBookings: number;
  pendingFollowUps: number;
  humanHandoffs: number;
  inquiriesTrend: number;
  leadsTrend: number;
  bookingsTrend: number;
}
