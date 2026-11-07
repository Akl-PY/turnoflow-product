import { Injectable } from '@nestjs/common';
import { LeadClassifierOutputSchema } from '@turnoflow/shared';
import { z } from 'zod';

export type LeadClassifierOutput = z.infer<typeof LeadClassifierOutputSchema>;

@Injectable()
export class LeadClassifierAgent {
  readonly role = 'LEAD_INTELLIGENCE';

  getSystemPrompt(): string {
    return `Eres el Agente Clasificador de Leads (Lead Intelligence Agent) de TurnoFlow AI.
Analiza la conversación entrante y devuelve EXCLUSIVAMENTE un objeto JSON que coincida con el siguiente esquema sin texto introductorio ni bloques markdown:
{
  "intent": "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL" | "URGENT" | "REQUIRES_HUMAN",
  "priority": "HOT" | "WARM" | "COLD",
  "identifiedService": string | null,
  "estimatedUrgency": "low" | "medium" | "high" | "immediate",
  "summary": string,
  "suggestedAction": string,
  "requiresHumanHandoff": boolean,
  "reasonForHandoff": string | null
}`;
  }

  parseResult(rawContent: string): LeadClassifierOutput {
    // Limpiar posibles backticks ```json ... ```
    const cleaned = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      return LeadClassifierOutputSchema.parse(parsed);
    } catch (err: any) {
      // Fallback seguro si el modelo devolviera formato imperfecto
      return {
        intent: rawContent.toLowerCase().includes('humano') ? ('REQUIRES_HUMAN' as any) : ('INFORMATIONAL' as any),
        priority: 'WARM' as any,
        identifiedService: null,
        estimatedUrgency: 'medium',
        summary: rawContent.substring(0, 150),
        suggestedAction: 'Revisar manualmente en panel de control',
        requiresHumanHandoff: rawContent.toLowerCase().includes('humano'),
        reasonForHandoff: rawContent.toLowerCase().includes('humano') ? 'Detectado en texto' : null
      };
    }
  }
}
