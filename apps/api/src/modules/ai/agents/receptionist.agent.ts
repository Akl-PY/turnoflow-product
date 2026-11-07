import { Injectable } from '@nestjs/common';
import { ToolDefinition } from '../interfaces/ai-provider.interface';

@Injectable()
export class ReceptionistAgent {
  readonly role = 'RECEPTIONIST';

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'search_knowledge_base',
        description: 'Busca respuestas sobre políticas, medios de pago, señas, preguntas frecuentes y descripción de tratamientos.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Términos de búsqueda o pregunta del usuario'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'get_services',
        description: 'Obtiene la lista de servicios activos del negocio con descripción y precios.',
        parameters: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Categoría opcional (e.g. Facial, Uñas, Mirada, Corporal, Depilación)'
            }
          }
        }
      },
      {
        name: 'get_service_price',
        description: 'Devuelve el precio exacto, moneda y duración en minutos de un servicio específico.',
        parameters: {
          type: 'object',
          properties: {
            serviceName: {
              type: 'string',
              description: 'Nombre del servicio a cotizar'
            }
          },
          required: ['serviceName']
        }
      },
      {
        name: 'get_business_hours',
        description: 'Consulta los horarios de atención y días de apertura del establecimiento.',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_business_location',
        description: 'Proporciona la dirección física, cómo llegar en transporte y link de Google Maps.',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'create_lead',
        description: 'Registra un nuevo prospecto o actualiza datos de contacto en el CRM.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nombre del cliente' },
            phone: { type: 'string', description: 'Número de WhatsApp con código de país' },
            service: { type: 'string', description: 'Servicio por el que mostró interés' },
            notes: { type: 'string', description: 'Comentarios adicionales o preferencias' }
          },
          required: ['name', 'phone']
        }
      },
      {
        name: 'check_availability',
        description: 'Verifica turnos libres en Google Calendar y base de datos para una fecha determinada.',
        parameters: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
            serviceName: { type: 'string', description: 'Nombre o ID del servicio para calcular duración' }
          },
          required: ['date']
        }
      },
      {
        name: 'handoff_to_human',
        description: 'Pausa el agente de IA y transfiere la conversación a una persona del equipo.',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: 'Motivo de la transferencia (e.g. queja, solicitud de hablar con persona, consulta médica, caso no contemplado)'
            }
          },
          required: ['reason']
        }
      }
    ];
  }
}
