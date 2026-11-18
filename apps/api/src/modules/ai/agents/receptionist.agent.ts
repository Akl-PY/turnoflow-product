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
              description: 'Categoría opcional del servicio o producto'
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
            service: { type: 'string', description: 'Servicio o producto por el que mostró interés' },
            notes: { type: 'string', description: 'Comentarios adicionales o preferencias' }
          },
          required: ['name', 'phone']
        }
      },
      {
        name: 'create_order',
        description: 'Registra un pedido o compra confirmada de productos o servicios por parte del cliente y avisa al dueño para despachar o preparar.',
        parameters: {
          type: 'object',
          properties: {
            customerName: { type: 'string', description: 'Nombre del cliente' },
            customerPhone: { type: 'string', description: 'Teléfono del cliente' },
            itemsSummary: { type: 'string', description: 'Detalle de los productos o servicios comprados y cantidades (ej. "2x Cloro Granulado + 1x Bomba 1HP")' },
            totalAmount: { type: 'number', description: 'Monto total estimado de la compra' },
            deliveryMethod: { type: 'string', description: 'Dirección de envío a domicilio o retiro en sucursal' },
            paymentMethod: { type: 'string', description: 'Medio de pago elegido (transferencia, efectivo, tarjeta, etc.)' },
            notes: { type: 'string', description: 'Notas adicionales del pedido' }
          },
          required: ['customerName', 'itemsSummary']
        }
      },
      {
        name: 'forward_to_group_or_contact',
        description: 'Reenvía información, comprobantes, pedidos o avisos específicos a un grupo de WhatsApp o número de teléfono siguiendo las instrucciones personalizadas del dueño.',
        parameters: {
          type: 'object',
          properties: {
            targetGroupOrPhone: {
              type: 'string',
              description: 'Nombre exacto del grupo de WhatsApp (ej. "Comprobantes", "Ventas"), JID (@g.us) o número de teléfono de destino'
            },
            summaryText: {
              type: 'string',
              description: 'Mensaje completo a reenviar incluyendo qué solicita o envía el cliente, monto y producto'
            }
          },
          required: ['targetGroupOrPhone', 'summaryText']
        }
      },
      {
        name: 'check_availability',
        description: 'Verifica turnos y horarios libres en vivo para una fecha, servicio y empleado.',
        parameters: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
            serviceName: { type: 'string', description: 'Nombre o ID del servicio solicitado' },
            staffName: { type: 'string', description: 'Nombre o ID del empleado/profesional (opcional)' }
          },
          required: ['date']
        }
      },
      {
        name: 'confirm_appointment',
        description: 'Crea y confirma el turno definitivamente en el sistema y agenda.',
        parameters: {
          type: 'object',
          properties: {
            customerName: { type: 'string', description: 'Nombre completo del cliente' },
            customerPhone: { type: 'string', description: 'Teléfono celular del cliente (opcional; se usa automáticamente el número del chat si no se provee)' },
            serviceId: { type: 'string', description: 'ID o nombre del servicio' },
            startTime: { type: 'string', description: 'Fecha y hora de inicio en formato ISO 8601 (ej. 2026-11-12T15:00:00)' },
            staffName: { type: 'string', description: 'Nombre o ID del empleado/profesional asignado (opcional)' },
            notes: { type: 'string', description: 'Notas opcionales' }
          },
          required: ['customerName', 'serviceId', 'startTime']
        }
      },
      {
        name: 'cancel_appointment',
        description: 'Cancela un turno existente previa verificación de políticas de cancelación.',
        parameters: {
          type: 'object',
          properties: {
            appointmentId: { type: 'string', description: 'ID del turno' },
            reason: { type: 'string', description: 'Motivo de la cancelación' }
          },
          required: ['appointmentId']
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
