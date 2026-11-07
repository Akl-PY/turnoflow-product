import axios from 'axios';

function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
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
  const token = getStoredToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Demo data fallbacks for instant preview if API is not yet running
export const DEMO_METRICS = {
  totalInquiries: 148,
  capturedLeads: 42,
  activeConversations: 16,
  confirmedBookings: 28,
  pendingFollowUps: 7,
  humanHandoffs: 3,
  inquiriesTrend: 18.5,
  leadsTrend: 24.0,
  bookingsTrend: 15.2
};

export const DEMO_ACTIVITY = [
  {
    id: 'act-1',
    type: 'APPOINTMENT_CONFIRMED',
    title: 'Turno confirmado: Camila Gómez',
    subtitle: 'Limpieza Facial Profunda — Jueves 15:00 hs',
    timestamp: 'Hace 10 min'
  },
  {
    id: 'act-2',
    type: 'LEAD_CAPTURED',
    title: 'Nuevo Lead Capturado: Mariana Rossi',
    subtitle: 'Interés en Lifting de Pestañas + Tinte (Alta Prioridad)',
    timestamp: 'Hace 35 min'
  },
  {
    id: 'act-3',
    type: 'FOLLOWUP_SENT',
    title: 'Seguimiento automático enviado',
    subtitle: 'Recontacto a Sofía Martínez tras consulta de precios',
    timestamp: 'Hace 2 horas'
  },
  {
    id: 'act-4',
    type: 'HUMAN_HANDOFF',
    title: 'Transferencia a persona: Lucía Fernández',
    subtitle: 'Motivo: Consulta sobre contraindicación dermatológica',
    timestamp: 'Hace 3 horas'
  }
];

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

export const DEMO_LEADS = [
  {
    id: 'lead-1',
    name: 'Camila Gómez',
    phone: '+5491144556677',
    requestedService: 'Limpieza Facial Profunda',
    status: 'NEW',
    intent: 'HIGH',
    priority: 'HOT',
    source: 'WhatsApp',
    lastInteractionAt: 'Hoy 14:20',
    notes: 'Preguntó disponibilidad para este jueves por la tarde'
  },
  {
    id: 'lead-2',
    name: 'Mariana Rossi',
    phone: '+5491122334455',
    requestedService: 'Lifting de Pestañas + Tinte',
    status: 'CONTACTED',
    intent: 'MEDIUM',
    priority: 'WARM',
    source: 'WhatsApp',
    lastInteractionAt: 'Hoy 12:45',
    notes: 'Consulta si incluye tinte de pestañas'
  },
  {
    id: 'lead-3',
    name: 'Lucía Fernández',
    phone: '+5491188990011',
    requestedService: 'Manicura Rusa con Esmaltado',
    status: 'BOOKED',
    intent: 'HIGH',
    priority: 'HOT',
    source: 'WhatsApp',
    lastInteractionAt: 'Ayer 18:30',
    notes: 'Turno confirmado en Google Calendar para viernes 16hs'
  },
  {
    id: 'lead-4',
    name: 'Sofía Martínez',
    phone: '+5491155667788',
    requestedService: 'Depilación Láser Definitiva',
    status: 'INTERESTED',
    intent: 'MEDIUM',
    priority: 'WARM',
    source: 'WhatsApp',
    lastInteractionAt: 'Ayer 15:10',
    notes: 'Preguntó por contraindicaciones en piel sensible'
  },
  {
    id: 'lead-5',
    name: 'Valentina López',
    phone: '+5491166778899',
    requestedService: 'Dermapen con Ácido Hialurónico',
    status: 'PENDING',
    intent: 'HIGH',
    priority: 'HOT',
    source: 'WhatsApp',
    lastInteractionAt: 'Hace 2 días',
    notes: 'Esperando confirmación de seña bancaria'
  }
];

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
    totalRuns: 142,
    successRuns: 141,
    failedRuns: 1,
    lastRunAt: 'Hace 5 min'
  },
  {
    id: 'wf-2',
    name: 'Captura y Clasificación de Leads',
    type: 'lead-management',
    isActive: true,
    status: 'healthy',
    totalRuns: 89,
    successRuns: 89,
    failedRuns: 0,
    lastRunAt: 'Hace 35 min'
  },
  {
    id: 'wf-3',
    name: 'Seguimiento Automático de Interesados',
    type: 'follow-up',
    isActive: true,
    status: 'healthy',
    totalRuns: 34,
    successRuns: 33,
    failedRuns: 1,
    lastRunAt: 'Hace 2 horas'
  },
  {
    id: 'wf-4',
    name: 'Gestión y Confirmación de Reservas',
    type: 'booking',
    isActive: true,
    status: 'healthy',
    totalRuns: 56,
    successRuns: 56,
    failedRuns: 0,
    lastRunAt: 'Hace 10 min'
  },
  {
    id: 'wf-5',
    name: 'Transferencia a Atención Humana',
    type: 'handoff',
    isActive: true,
    status: 'healthy',
    totalRuns: 12,
    successRuns: 12,
    failedRuns: 0,
    lastRunAt: 'Hace 3 horas'
  }
];
