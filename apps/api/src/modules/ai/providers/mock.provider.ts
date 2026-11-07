import { Injectable } from '@nestjs/common';
import {
  AiProviderInterface,
  ChatMessage,
  CompletionOptions,
  CompletionResponse
} from '../interfaces/ai-provider.interface';

@Injectable()
export class MockAiProvider implements AiProviderInterface {
  readonly providerName = 'mock';

  async chatCompletion(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse> {
    // 0. Modo Clasificador de Leads (JSON)
    const isClassifierPrompt = messages.some((m) =>
      m.role === 'system' && m.content.includes('Lead Intelligence Agent')
    );
    if (isClassifierPrompt) {
      return {
        content: JSON.stringify({
          intent: 'HIGH',
          priority: 'HOT',
          identifiedService: 'Lifting de Pestañas',
          estimatedUrgency: 'medium',
          summary: 'Cliente consultando disponibilidad y precios para agendar esta semana.',
          suggestedAction: 'Ofrecer horarios de jueves o viernes',
          requiresHumanHandoff: false,
          reasonForHandoff: null
        }),
        usage: { inputTokens: 60, outputTokens: 40 }
      };
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content.toLowerCase() || '';

    // Si hay un tool result reciente en los mensajes, formular la respuesta final
    const lastToolResult = [...messages].reverse().find((m) => m.role === 'tool');
    if (lastToolResult) {
      try {
        const parsed = JSON.parse(lastToolResult.content);
        if (parsed.handoffTriggered) {
          return {
            content: 'He transferido la conversación a un operador de nuestro equipo humano para que te asista a la brevedad. 🙏',
            usage: { inputTokens: 40, outputTokens: 25 }
          };
        }
        if (parsed.price !== undefined) {
          return {
            content: `El tratamiento ${parsed.name} tiene un valor de $${parsed.price} USD y su duración estimada es de ${parsed.durationMinutes} minutos. ✨ ¿Te gustaría revisar los turnos disponibles para esta semana?`,
            usage: { inputTokens: 50, outputTokens: 35 }
          };
        }
        if (parsed.availableSlots) {
          return {
            content: `Tenemos disponibilidad para esa fecha en los siguientes horarios: ${parsed.availableSlots.slice(0, 3).join(', ')}. ¿Cuál de ellos te queda más cómodo para agendar? 😊`,
            usage: { inputTokens: 40, outputTokens: 30 }
          };
        }
      } catch {
        // Continue with default mock logic
      }
    }

    // 1. Detección de Handoff Humano o Consulta Médica
    if (
      lastUserMessage.includes('humano') ||
      lastUserMessage.includes('persona') ||
      lastUserMessage.includes('hongo') ||
      lastUserMessage.includes('herida') ||
      lastUserMessage.includes('pus') ||
      lastUserMessage.includes('infeccion')
    ) {
      return {
        content: 'Entiendo tu consulta. He transferido la conversación a un operador de nuestro equipo humano para que te brinde asesoramiento adecuado.',
        toolCalls: [
          {
            id: 'mock-call-handoff-1',
            name: 'handoff_to_human',
            arguments: {
              reason: lastUserMessage.includes('humano')
                ? 'Solicitud explícita de operador'
                : 'Consulta con sintomatología médica o dermatológica'
            }
          }
        ],
        usage: { inputTokens: 30, outputTokens: 25 }
      };
    }

    // 2. Consulta de Precios y Servicios (Tool call get_service_price o Regateo)
    if (
      lastUserMessage.includes('precio') ||
      lastUserMessage.includes('cuanto sale') ||
      lastUserMessage.includes('lifting') ||
      lastUserMessage.includes('manicura') ||
      lastUserMessage.includes('costo') ||
      lastUserMessage.includes('cobran') ||
      lastUserMessage.includes('$')
    ) {
      // Si intentan forzar un descuento inexistente
      if (
        lastUserMessage.includes('10') ||
        lastUserMessage.includes('regateo') ||
        lastUserMessage.includes('descuento') ||
        lastUserMessage.includes('dejámelo') ||
        lastUserMessage.includes('dejamelo')
      ) {
        return {
          content: 'Nuestras tarifas son fijas y se basan en productos certificados de primera calidad y especialistas matriculadas. No contamos con promociones de ese valor en este momento, pero con gusto te agendo con nuestra tarifa oficial.',
          usage: { inputTokens: 40, outputTokens: 30 }
        };
      }

      return {
        content: '',
        toolCalls: [
          {
            id: 'mock-call-price-1',
            name: 'get_service_price',
            arguments: {
              serviceName: lastUserMessage.includes('lifting')
                ? 'Lifting de Pestañas + Tinte'
                : 'Manicura Rusa'
            }
          }
        ],
        usage: { inputTokens: 45, outputTokens: 20 }
      };
    }

    // 3. Intento de Agendamiento
    if (
      lastUserMessage.includes('turno') ||
      lastUserMessage.includes('agendar') ||
      lastUserMessage.includes('reservar') ||
      lastUserMessage.includes('horario')
    ) {
      return {
        content: '',
        toolCalls: [
          {
            id: 'mock-call-avail-1',
            name: 'check_availability',
            arguments: {
              date: new Date().toISOString().split('T')[0],
              serviceName: 'General'
            }
          }
        ],
        usage: { inputTokens: 35, outputTokens: 20 }
      };
    }


    // Saludo o respuesta general por defecto
    return {
      content: '¡Hola! ✨ Bienvenida a TurnoFlow Studio. ¿En qué servicio o tratamiento te gustaría que te asesore hoy?',
      usage: { inputTokens: 20, outputTokens: 25 }
    };
  }
}
