import { Injectable, Logger } from '@nestjs/common';
import { AgentRoleType } from '@turnoflow/shared';

@Injectable()
export class SupervisorAgent {
  private readonly logger = new Logger(SupervisorAgent.name);

  // Patrones sospechosos de prompt injection o desvío de rol
  private readonly injectionPatterns = [
    /ignore (all )?previous instructions/i,
    /olvida (todas )?(las )?instrucciones (anteriores|previas)/i,
    /reveal (your )?system prompt/i,
    /muestra (tu )?prompt del sistema/i,
    /you are now in developer mode/i,
    /jailbreak/i,
    /dan mode/i,
    /act as an unrestricted/i
  ];

  sanitizeInput(userText: string): { isSafe: boolean; flaggedPattern?: string } {
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(userText)) {
        this.logger.warn(`Intento de Prompt Injection interceptado: "${pattern}"`);
        return { isSafe: false, flaggedPattern: pattern.toString() };
      }
    }
    return { isSafe: true };
  }

  determineActiveRole(userText: string, currentRole?: AgentRoleType): AgentRoleType {
    const text = userText.toLowerCase();

    // 1. Si pide explícitamente reservar o agendar un turno
    if (
      text.includes('agendar') ||
      text.includes('reservar') ||
      text.includes('confirmar turno') ||
      text.includes('apartar cita')
    ) {
      return AgentRoleType.BOOKING;
    }

    // Por defecto, atiende el recepcionista
    return currentRole || AgentRoleType.RECEPTIONIST;
  }

  validateToolCallPermissions(agentRole: AgentRoleType, toolName: string, allowedTools: string[]): boolean {
    if (allowedTools.length === 0) {
      return true; // Si no hay lista restrictiva personalizada, se permiten las del agente
    }
    return allowedTools.includes(toolName);
  }

  verifyGrounding(responseText: string, knownPrices: number[]): { isGrounded: boolean; violation?: string } {
    // Escanear si la respuesta menciona un precio en dólares que no existe en el catálogo
    const priceMatches = responseText.match(/\$\s*(\d+(\.\d+)?)/g);
    if (!priceMatches) {
      return { isGrounded: true };
    }

    for (const match of priceMatches) {
      const num = parseFloat(match.replace(/[^0-9.]/g, ''));
      if (num > 0 && !knownPrices.includes(num)) {
        // Podría ser un precio inventado (alucinación)
        this.logger.warn(`Posible precio no verificado detectado en respuesta: $${num}`);
        return {
          isGrounded: false,
          violation: `El precio $${num} no coincide con ningún servicio oficial de la base de conocimiento.`
        };
      }
    }

    return { isGrounded: true };
  }
}
