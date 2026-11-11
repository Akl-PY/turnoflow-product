import { Injectable } from '@nestjs/common';
import { ToolDefinition } from '../interfaces/ai-provider.interface';

@Injectable()
export class BookingAgent {
  readonly role = 'BOOKING';

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'check_available_slots',
        description: 'Consulta los horarios disponibles en vivo para un servicio, fecha y opcionalmente un empleado/profesional específico.',
        parameters: {
          type: 'object',
          properties: {
            serviceId: { type: 'string', description: 'ID o nombre del servicio' },
            date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
            staffName: { type: 'string', description: 'Nombre o ID del empleado/profesional (opcional; si no se especifica se buscan todos)' }
          },
          required: ['serviceId', 'date']
        }
      },
      {
        name: 'confirm_appointment',
        description: 'Crea y confirma el turno definitivamente en el sistema y agenda.',
        parameters: {
          type: 'object',
          properties: {
            customerName: { type: 'string', description: 'Nombre completo del cliente' },
            customerPhone: { type: 'string', description: 'Teléfono celular del cliente' },
            serviceId: { type: 'string', description: 'ID o nombre del servicio' },
            startTime: { type: 'string', description: 'Fecha y hora de inicio en formato ISO 8601 (ej. 2026-11-12T15:00:00)' },
            staffName: { type: 'string', description: 'Nombre o ID del empleado/profesional asignado (opcional)' },
            notes: { type: 'string', description: 'Notas opcionales' }
          },
          required: ['customerName', 'customerPhone', 'serviceId', 'startTime']
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
      }
    ];
  }
}
