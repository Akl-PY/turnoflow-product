import { Injectable } from '@nestjs/common';
import { FollowUpEvaluationSchema } from '@turnoflow/shared';
import { z } from 'zod';

export type FollowUpEvaluation = z.infer<typeof FollowUpEvaluationSchema>;

@Injectable()
export class FollowUpAgent {
  readonly role = 'FOLLOW_UP';

  getSystemPrompt(): string {
    return `Eres el Agente de Seguimiento de TurnoFlow AI.
Evalúa el estado de este contacto. Si es apropiado recontactar para cerrar el turno, sugiere un mensaje cortés, personalizado y sin inventar ofertas ni descuentos falsos.
Devuelve un JSON estrictamente con este formato:
{
  "shouldFollowUp": boolean,
  "reason": string,
  "suggestedMessage": string | null,
  "delayHours": number,
  "confidenceScore": number
}`;
  }

  parseResult(rawContent: string): FollowUpEvaluation {
    const cleaned = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      return FollowUpEvaluationSchema.parse(parsed);
    } catch {
      return {
        shouldFollowUp: false,
        reason: 'Error parseando sugerencia de seguimiento',
        suggestedMessage: null,
        delayHours: 24,
        confidenceScore: 0.5
      };
    }
  }
}
