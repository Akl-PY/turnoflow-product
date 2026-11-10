import axios from 'axios';

function resolveApiUrl(): string {
  const envUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  // Ignorar variables de entorno obsoletas o que apunten al host anterior
  if (
    envUrl &&
    !envUrl.includes('backend-production-c7cf') &&
    !envUrl.includes('turnoflow-api.vercel.app')
  ) {
    if (
      typeof window !== 'undefined' &&
      window.location?.hostname &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        return 'https://turnoflowapi-production.up.railway.app/api';
      }
    }
    return envUrl.replace(/\/+$/, '');
  }
  if (
    typeof window !== 'undefined' &&
    window.location?.hostname &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return 'https://turnoflowapi-production.up.railway.app/api';
  }
  return 'http://localhost:3000/api';
}

export const API_URL = resolveApiUrl();

const TOKEN_STORAGE_KEY = 'turnoflow_auth_token';
const USER_STORAGE_KEY = 'turnoflow_auth_user';

let memoryToken: string | null = null;
let memoryUser: AuthUser | null = null;

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  organizationId: string;
  organizationName: string;
}

export function getStoredToken(): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
  return memoryToken;
}

export function setStoredToken(token: string | null): void {
  memoryToken = token;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
  } catch {
    // ignore storage errors
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(USER_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as AuthUser;
      }
    }
  } catch {
    // ignore storage errors
  }
  return memoryUser;
}

export function setStoredUser(user: AuthUser | null): void {
  memoryUser = user;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (user) {
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  } catch {
    // ignore storage errors
  }
}

export function clearStoredAuth(): void {
  setStoredToken(null);
  setStoredUser(null);
}

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  if (config.baseURL?.includes('backend-production-c7cf')) {
    config.baseURL = 'https://turnoflowapi-production.up.railway.app/api';
  }
  if (
    typeof window !== 'undefined' &&
    window.location?.hostname &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1' &&
    config.baseURL?.includes('localhost')
  ) {
    config.baseURL = 'https://turnoflowapi-production.up.railway.app/api';
  }
  const token = getStoredToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helpers Multi-Tenant para Webhooks y Tokens exclusivos
export function getTenantVerifyToken(organizationId?: string): string {
  if (!organizationId) return 'turnoflow_verify_token';
  const clean = organizationId.replace(/-/g, '');
  return `tf_sec_${clean.substring(0, 16)}`;
}

export function getTenantWebhookUrl(organizationId?: string): string {
  const base = 'https://turnoflowapi-production.up.railway.app/api/conversations/whatsapp-webhook';
  if (!organizationId) return base;
  return `${base}/${organizationId}`;
}

export function getTenantQRWebhookUrl(organizationId?: string): string {
  const base = 'https://turnoflowapi-production.up.railway.app/api/conversations/whatsapp-qr-webhook';
  if (!organizationId) return base;
  return `${base}/${organizationId}`;
}

export interface ConversationItem {
  id: string;
  organizationId: string;
  leadId?: string;
  channel: string;
  channelConversationId: string;
  status: 'AI_HANDLED' | 'HUMAN_TAKEOVER' | 'ESCALATED' | 'CLOSED';
  assignedAgent: string;
  messagesCount: number;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageItem {
  id: string;
  conversationId: string;
  sender: 'user' | 'ai' | 'human_agent' | 'system';
  content: string;
  toolCalls?: any;
  createdAt: string;
}

export async function fetchConversations(): Promise<ConversationItem[]> {
  const res = await apiClient.get('/conversations');
  return res.data;
}

export async function fetchConversationMessages(conversationId: string): Promise<ChatMessageItem[]> {
  const res = await apiClient.get(`/conversations/${conversationId}/messages`);
  return res.data;
}

export async function resumeConversationAi(conversationId: string): Promise<ConversationItem> {
  const res = await apiClient.patch(`/conversations/${conversationId}/resume-ai`);
  return res.data;
}

export async function pauseConversationAi(conversationId: string, reason?: string): Promise<ConversationItem> {
  const res = await apiClient.patch(`/conversations/${conversationId}/pause-ai`, { reason });
  return res.data;
}

// Métricas iniciales limpias (datos reales del tenant)
export const INITIAL_METRICS = {
  totalInquiries: 0,
  capturedLeads: 0,
  activeConversations: 0,
  confirmedBookings: 0,
  pendingFollowUps: 0,
  humanHandoffs: 0,
  inquiriesTrend: 0,
  leadsTrend: 0,
  bookingsTrend: 0
};
export const DEMO_METRICS = INITIAL_METRICS;
export const DEMO_ACTIVITY: any[] = [];

export const DEMO_AGENTS = [
  {
    id: 'agent-1',
    role: 'RECEPTIONIST',
    name: 'Reception Agent (Atención 24/7)',
    isActive: true,
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.2,
    systemPrompt: 'Recepcionista cálido y profesional enfocado en responder dudas de servicios y guiar a reservas.',
    allowedTools: ['search_knowledge_base', 'get_services', 'get_service_price', 'get_business_hours', 'check_availability', 'handoff_to_human']
  },
  {
    id: 'agent-2',
    role: 'LEAD_INTELLIGENCE',
    name: 'Lead Intelligence Agent',
    isActive: true,
    provider: 'anthropic',
    model: 'claude-3-5-haiku-20241022',
    temperature: 0.1,
    systemPrompt: 'Clasificador de intención, urgencia y prioridad de compra con salida estructurada JSON.',
    allowedTools: []
  },
  {
    id: 'agent-3',
    role: 'BOOKING',
    name: 'Booking Agent (Agenda & Citas)',
    isActive: true,
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.1,
    systemPrompt: 'Especialista en verificar disponibilidad exacta y confirmar reservas en Google Calendar sin alucinaciones.',
    allowedTools: ['check_available_slots', 'confirm_appointment', 'cancel_appointment']
  },
  {
    id: 'agent-4',
    role: 'FOLLOW_UP',
    name: 'Follow-Up Agent (Recontacto)',
    isActive: true,
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.2,
    systemPrompt: 'Generador de mensajes de reactivación personalizados respetando horario y sin promociones falsas.',
    allowedTools: []
  },
  {
    id: 'agent-5',
    role: 'SUPERVISOR',
    name: 'Supervisor / Orchestrator',
    isActive: true,
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.1,
    systemPrompt: 'Orquestador central, control de acceso de herramientas y guardrails de seguridad.',
    allowedTools: []
  }
];

export const DEMO_LEADS: any[] = [];

export const DEMO_SERVICES = [
  {
    id: 'srv-001',
    name: 'Limpieza Facial Profunda',
    category: 'Facial',
    description: 'Higiene con punta de diamante extracción e hidratación profunda',
    price: 45,
    currency: 'USD',
    durationMinutes: 60,
    isActive: true
  },
  {
    id: 'srv-002',
    name: 'Lifting de Pestañas + Tinte',
    category: 'Mirada',
    description: 'Curvatura natural de pestañas con keratina y tinte negro',
    price: 35,
    currency: 'USD',
    durationMinutes: 50,
    isActive: true
  },
  {
    id: 'srv-003',
    name: 'Perfilado y Laminado de Cejas',
    category: 'Mirada',
    description: 'Diseño según morfología facial fijación y nutrición botox',
    price: 30,
    currency: 'USD',
    durationMinutes: 45,
    isActive: true
  },
  {
    id: 'srv-004',
    name: 'Manicura Rusa con Semipermanente',
    category: 'Uñas',
    description: 'Tratamiento de cutículas torno y esmaltado premium larga duración',
    price: 28,
    currency: 'USD',
    durationMinutes: 60,
    isActive: true
  },
  {
    id: 'srv-005',
    name: 'Depilación Láser Diodo - Zona Completa',
    category: 'Depilación',
    description: 'Sesión piernas completas axilas y cavado sistema indoloro',
    price: 85,
    currency: 'USD',
    durationMinutes: 45,
    isActive: true
  }
];

export const DEMO_AUTOMATIONS = [
  {
    id: 'wf-1',
    name: 'Recepción y Respuesta WhatsApp',
    type: 'incoming-messages',
    isActive: true,
    status: 'healthy',
    totalRuns: 0,
    successRuns: 0,
    failedRuns: 0,
    lastRunAt: 'Sin ejecuciones aún'
  },
  {
    id: 'wf-2',
    name: 'Captura y Clasificación de Leads',
    type: 'lead-management',
    isActive: true,
    status: 'healthy',
    totalRuns: 0,
    successRuns: 0,
    failedRuns: 0,
    lastRunAt: 'Sin ejecuciones aún'
  },
  {
    id: 'wf-3',
    name: 'Seguimiento Automático de Interesados',
    type: 'follow-up',
    isActive: true,
    status: 'healthy',
    totalRuns: 0,
    successRuns: 0,
    failedRuns: 0,
    lastRunAt: 'Sin ejecuciones aún'
  },
  {
    id: 'wf-4',
    name: 'Gestión y Confirmación de Reservas',
    type: 'booking',
    isActive: true,
    status: 'healthy',
    totalRuns: 0,
    successRuns: 0,
    failedRuns: 0,
    lastRunAt: 'Sin ejecuciones aún'
  },
  {
    id: 'wf-5',
    name: 'Transferencia a Atención Humana',
    type: 'handoff',
    isActive: true,
    status: 'healthy',
    totalRuns: 0,
    successRuns: 0,
    failedRuns: 0,
    lastRunAt: 'Sin ejecuciones aún'
  }
];
