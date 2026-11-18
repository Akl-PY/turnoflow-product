import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProspectingFlowEntity } from '../../entities/prospecting-flow.entity';
import { Lead } from '../../entities/lead.entity';
import {
  FlowTriggerType,
  FlowStepAction,
  FlowMatchResult,
  ProspectingFlow,
  ProspectingStep,
  LeadStatus
} from '@turnoflow/shared';

function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

@Injectable()
export class ProspectingService {
  private readonly logger = new Logger(ProspectingService.name);

  constructor(
    @InjectRepository(ProspectingFlowEntity)
    private readonly flowRepo: Repository<ProspectingFlowEntity>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>
  ) {}

  async findAll(organizationId: string): Promise<ProspectingFlowEntity[]> {
    return this.flowRepo.find({
      where: { organizationId },
      order: { createdAt: 'ASC' }
    });
  }

  async findById(organizationId: string, id: string): Promise<ProspectingFlowEntity> {
    const flow = await this.flowRepo.findOne({
      where: { id, organizationId }
    });
    if (!flow) {
      throw new NotFoundException(`Embudo con ID ${id} no encontrado`);
    }
    return flow;
  }

  async create(organizationId: string, data: Partial<ProspectingFlow>): Promise<ProspectingFlowEntity> {
    const flow = this.flowRepo.create({
      ...data,
      organizationId,
      isActive: data.isActive !== undefined ? data.isActive : true,
      triggerType: data.triggerType || FlowTriggerType.KEYWORD,
      triggerKeywords: data.triggerKeywords || [],
      steps: data.steps || []
    });
    return this.flowRepo.save(flow);
  }

  async update(
    organizationId: string,
    id: string,
    data: Partial<ProspectingFlow>
  ): Promise<ProspectingFlowEntity> {
    const flow = await this.findById(organizationId, id);
    Object.assign(flow, data);
    return this.flowRepo.save(flow);
  }

  async delete(organizationId: string, id: string): Promise<boolean> {
    const flow = await this.findById(organizationId, id);
    await this.flowRepo.remove(flow);
    return true;
  }

  async toggleActive(organizationId: string, id: string): Promise<ProspectingFlowEntity> {
    const flow = await this.findById(organizationId, id);
    flow.isActive = !flow.isActive;
    return this.flowRepo.save(flow);
  }

  /**
   * Evalúa el mensaje entrante contra los embudos configurados:
   * 1. Si la conversación ya tiene un paso activo -> comprueba las ramas de la seguidilla.
   * 2. Si no tiene paso activo -> evalúa si es contacto nuevo o coincide con palabras clave iniciales.
   */
  async evaluateMessage(params: {
    organizationId: string;
    userText: string;
    conversationMetadata?: Record<string, any>;
    isNewContact?: boolean;
    leadPhone?: string;
  }): Promise<FlowMatchResult> {
    const { organizationId, userText, conversationMetadata, isNewContact, leadPhone } = params;
    const cleanUserText = normalizeText(userText);

    // 1. Revisar si la conversación ya está dentro de un embudo en curso
    const activeFlowId = conversationMetadata?.activeFlowId;
    const currentStepId = conversationMetadata?.currentStepId;

    if (activeFlowId && currentStepId) {
      const activeFlow = await this.flowRepo.findOne({
        where: { id: activeFlowId, organizationId, isActive: true }
      });

      if (activeFlow && activeFlow.steps && activeFlow.steps.length > 0) {
        const currentStep = activeFlow.steps.find((s) => s.id === currentStepId);

        if (currentStep && currentStep.branches && currentStep.branches.length > 0) {
          // Evaluar si el usuario eligió alguna de las ramas de la seguidilla
          // 1. Prioridad absoluta: Coincidencia EXACTA (ej. "4", "1", "opcion 4", "si", "ok")
          let matchedBranch = currentStep.branches.find((branch) => {
            return (branch.keywords || []).some((kw) => {
              const cleanKw = normalizeText(kw);
              return cleanUserText === cleanKw;
            });
          });

          // 2. Si no hubo coincidencia exacta, verificar si el usuario mencionó una edad numérica (ej. "40", "tengo 40", "tiene 6 años", "15", "8")
          if (!matchedBranch) {
            const ageNumberMatch = cleanUserText.match(/\b(\d{1,2})\b/);
            if (ageNumberMatch) {
              const ageVal = parseInt(ageNumberMatch[1], 10);
              let targetCategory: string | null = null;
              if (ageVal >= 4 && ageVal <= 6) targetCategory = 'kids';
              else if (ageVal >= 7 && ageVal <= 10) targetCategory = 'infantiles';
              else if (ageVal >= 11 && ageVal <= 17) targetCategory = 'juveniles';
              else if (ageVal >= 18 && ageVal <= 100) targetCategory = 'adultos';

              if (targetCategory) {
                matchedBranch = currentStep.branches.find(
                  (b) =>
                    b.nextStepId.toLowerCase().includes(targetCategory!) ||
                    (b.keywords || []).some((kw) => kw.toLowerCase().includes(targetCategory!))
                );
              }
            }
          }

          // 3. Buscar la coincidencia más específica por palabra o frase
          if (!matchedBranch) {
            let maxBranchKwLen = 0;
            for (const branch of currentStep.branches) {
              for (const kw of branch.keywords || []) {
                const cleanKw = normalizeText(kw);
                if (!cleanKw) continue;
                // Si la keyword es de un solo carácter (ej. dígito "1", "4"), solo debe coincidir como palabra aislada
                if (cleanKw.length === 1) {
                  const singleWordRegex = new RegExp(`(^|\\s|\\b)${cleanKw}(\\b|\\s|$)`);
                  if (singleWordRegex.test(cleanUserText)) {
                    if (cleanKw.length > maxBranchKwLen) {
                      maxBranchKwLen = cleanKw.length;
                      matchedBranch = branch;
                    }
                  }
                } else if (cleanUserText.includes(cleanKw)) {
                  if (cleanKw.length > maxBranchKwLen) {
                    maxBranchKwLen = cleanKw.length;
                    matchedBranch = branch;
                  }
                }
              }
            }
          }

          if (matchedBranch) {
            const nextStep = activeFlow.steps.find((s) => s.id === matchedBranch!.nextStepId);
            if (nextStep) {
              const isFinal = !!nextStep.isFinalStep || !nextStep.branches || nextStep.branches.length === 0;

              // Ejecutar acciones de paso si corresponden
              await this.applyStepAction(organizationId, leadPhone, nextStep);

              return {
                matched: true,
                flowId: activeFlow.id,
                stepId: nextStep.id,
                replyMessage: nextStep.botResponse,
                action: nextStep.action,
                actionPayload: nextStep.actionPayload,
                isFinalStep: isFinal,
                handoffToHuman: nextStep.action === FlowStepAction.HANDOFF
              };
            }
          }

          // Si no coincidió con ninguna rama:
          // Si el paso tiene un fallbackResponse explícito, devolverlo. Si no tiene, dejar que la IA responda con inteligencia contextual.
          if (currentStep.fallbackResponse && currentStep.fallbackResponse.trim()) {
            return {
              matched: true,
              flowId: activeFlow.id,
              stepId: currentStep.id,
              replyMessage: currentStep.fallbackResponse,
              action: FlowStepAction.NONE,
              isFinalStep: false,
              handoffToHuman: false
            };
          }

          return { matched: false };
        }
      }
    }

    // 2. Si no estaba en un flujo o el flujo anterior terminó, evaluar disparadores de inicio
    const activeFlows = await this.flowRepo.find({
      where: { organizationId, isActive: true },
      order: { createdAt: 'ASC' }
    });

    if (!activeFlows || activeFlows.length === 0) {
      return { matched: false };
    }

    // 2.1 Disparador por CONTACTO NUEVO (primer mensaje)
    if (isNewContact) {
      const newLeadFlow = activeFlows.find((f) => f.triggerType === FlowTriggerType.NEW_LEAD);
      if (newLeadFlow && newLeadFlow.steps && newLeadFlow.steps.length > 0) {
        const firstStep = newLeadFlow.steps[0];
        const isFinal = !!firstStep.isFinalStep || !firstStep.branches || firstStep.branches.length === 0;

        await this.applyStepAction(organizationId, leadPhone, firstStep);

        return {
          matched: true,
          flowId: newLeadFlow.id,
          stepId: firstStep.id,
          replyMessage: firstStep.botResponse,
          action: firstStep.action,
          actionPayload: firstStep.actionPayload,
          isFinalStep: isFinal,
          handoffToHuman: firstStep.action === FlowStepAction.HANDOFF
        };
      }
    }

    // 2.2 Disparador por PALABRAS CLAVE (con prioridad al emparejamiento más específico / frase más larga)
    let bestMatchFlow: ProspectingFlowEntity | null = null;
    let maxKeywordLength = 0;

    for (const flow of activeFlows) {
      if (flow.triggerType === FlowTriggerType.KEYWORD && flow.triggerKeywords && flow.triggerKeywords.length > 0) {
        for (const kw of flow.triggerKeywords) {
          const cleanKw = normalizeText(kw);
          if (cleanKw && cleanUserText.includes(cleanKw)) {
            if (cleanKw.length > maxKeywordLength) {
              maxKeywordLength = cleanKw.length;
              bestMatchFlow = flow;
            }
          }
        }
      }
    }

    if (bestMatchFlow && bestMatchFlow.steps && bestMatchFlow.steps.length > 0) {
      const firstStep = bestMatchFlow.steps[0];
      const isFinal = !!firstStep.isFinalStep || !firstStep.branches || firstStep.branches.length === 0;

      await this.applyStepAction(organizationId, leadPhone, firstStep);

      return {
        matched: true,
        flowId: bestMatchFlow.id,
        stepId: firstStep.id,
        replyMessage: firstStep.botResponse,
        action: firstStep.action,
        actionPayload: firstStep.actionPayload,
        isFinalStep: isFinal,
        handoffToHuman: firstStep.action === FlowStepAction.HANDOFF
      };
    }

    return { matched: false };
  }

  /**
   * Aplica acciones configuradas en el paso al lead del contacto
   */
  private async applyStepAction(
    organizationId: string,
    leadPhone?: string,
    step?: ProspectingStep
  ): Promise<void> {
    if (!step || !leadPhone) return;

    try {
      const cleanPhone = leadPhone.replace(/\D/g, '');
      const lead = await this.leadRepo.findOne({
        where: { organizationId, phone: cleanPhone }
      });

      if (!lead) return;

      let changed = false;

      if (step.action === FlowStepAction.SET_LEAD_INTEREST && step.actionPayload?.serviceName) {
        lead.requestedService = step.actionPayload.serviceName;
        changed = true;
      }

      if (step.action === FlowStepAction.SET_LEAD_STATUS && step.actionPayload?.leadStatus) {
        lead.status = step.actionPayload.leadStatus as LeadStatus;
        changed = true;
      }

      if (step.actionPayload?.notes) {
        const currentNotes = lead.notes ? `${lead.notes} | ` : '';
        lead.notes = `${currentNotes}[Embudo]: ${step.actionPayload.notes}`.substring(0, 500);
        changed = true;
      }

      if (changed) {
        await this.leadRepo.save(lead);
        this.logger.log(`[PROSPECTING ACTION] Lead ${cleanPhone} actualizado tras paso "${step.name}".`);
      }
    } catch (err: any) {
      this.logger.warn(`No se pudo aplicar acción de paso al lead: ${err.message}`);
    }
  }
}
