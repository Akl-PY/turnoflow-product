import { z } from 'zod';
import {
  BusinessVertical,
  LeadStatus,
  LeadIntent,
  LeadPriority,
  AppointmentStatus,
  ConversationStatus,
  AIProviderType,
  AgentRoleType
} from '../types';

export const DayScheduleSchema = z.object({
  day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:MM requerido'),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:MM requerido'),
  isOpen: z.boolean()
});

export const ServiceItemSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  category: z.string().default('General'),
  description: z.string().default(''),
  price: z.number().nonnegative('El precio no puede ser negativo'),
  currency: z.string().default('USD'),
  durationMinutes: z.number().int().positive('La duración debe ser mayor a 0 minutos'),
  isActive: z.boolean().default(true)
});

export const FAQItemSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  question: z.string().min(3, 'La pregunta debe tener al menos 3 caracteres'),
  answer: z.string().min(3, 'La respuesta debe tener al menos 3 caracteres'),
  category: z.string().optional()
});

export const BusinessConfigUpdateSchema = z.object({
  businessName: z.string().min(2, 'Nombre de negocio requerido'),
  description: z.string().optional().default(''),
  vertical: z.nativeEnum(BusinessVertical).default(BusinessVertical.BEAUTY_SALON),
  location: z.string().min(3, 'Ubicación física o ciudad requerida'),
  timezone: z.string().default('America/Argentina/Buenos_Aires'),
  contactPhone: z.string().min(6, 'Teléfono de contacto requerido'),
  contactEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  currency: z.string().default('USD'),
  cancellationPolicy: z.string().default('Cancelaciones con al menos 24 horas de anticipación.'),
  services: z.array(ServiceItemSchema).default([]),
  businessHours: z.array(DayScheduleSchema).default([]),
  faqs: z.array(FAQItemSchema).default([]),
  specialInstructions: z.string().optional()
});

export const CreateLeadSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  phone: z.string().min(7, 'Número de teléfono con código de área'),
  email: z.string().email().optional().or(z.literal('')),
  requestedService: z.string().optional(),
  intent: z.nativeEnum(LeadIntent).default(LeadIntent.INFORMATIONAL),
  priority: z.nativeEnum(LeadPriority).default(LeadPriority.WARM),
  status: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
  source: z.string().default('whatsapp'),
  notes: z.string().optional()
});

export const UpdateLeadSchema = CreateLeadSchema.partial().extend({
  status: z.nativeEnum(LeadStatus).optional(),
  nextFollowUpAt: z.string().datetime().optional().nullable()
});

export const CreateAppointmentSchema = z.object({
  leadId: z.string().optional(),
  customerName: z.string().min(2, 'Nombre de cliente requerido'),
  customerPhone: z.string().min(7, 'Teléfono requerido'),
  serviceId: z.string().min(1, 'ID de servicio requerido'),
  startTime: z.string().datetime('Formato ISO 8601 requerido'),
  notes: z.string().optional()
});

export const CheckAvailabilityQuerySchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido')
});

export const AgentConfigUpdateSchema = z.object({
  name: z.string().min(2),
  isActive: z.boolean(),
  provider: z.nativeEnum(AIProviderType),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.2),
  maxTokens: z.number().int().min(100).max(8000).default(1000),
  systemPrompt: z.string().min(10),
  allowedTools: z.array(z.string()).default([]),
  handoffKeywords: z.array(z.string()).default([])
});

// Structured outputs from specialized agents
export const LeadClassifierOutputSchema = z.object({
  intent: z.nativeEnum(LeadIntent),
  priority: z.nativeEnum(LeadPriority),
  identifiedService: z.string().nullable(),
  estimatedUrgency: z.enum(['low', 'medium', 'high', 'immediate']),
  summary: z.string().max(200),
  suggestedAction: z.string(),
  requiresHumanHandoff: z.boolean(),
  reasonForHandoff: z.string().nullable().optional()
});

export const FollowUpEvaluationSchema = z.object({
  shouldFollowUp: z.boolean(),
  reason: z.string(),
  suggestedMessage: z.string().nullable(),
  delayHours: z.number().min(0).max(168),
  confidenceScore: z.number().min(0).max(1)
});

export const BookingConfirmationSchema = z.object({
  isAvailable: z.boolean(),
  proposedSlot: z.object({
    startTime: z.string(),
    endTime: z.string(),
    serviceName: z.string(),
    price: z.number()
  }).nullable(),
  rejectionReason: z.string().nullable().optional(),
  alternativeSlots: z.array(z.string()).default([])
});

export const PlaygroundMessageSchema = z.object({
  agentRole: z.nativeEnum(AgentRoleType),
  userMessage: z.string().min(1),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })).default([]),
  overrideProvider: z.nativeEnum(AIProviderType).optional(),
  overrideModel: z.string().optional()
});
