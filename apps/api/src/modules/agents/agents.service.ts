import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentConfigEntity } from '../../entities/agent-config.entity';
import { AgentRoleType, AIProviderType } from '@turnoflow/shared';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(AgentConfigEntity)
    private readonly agentRepo: Repository<AgentConfigEntity>
  ) {}

  async findAll(organizationId: string): Promise<AgentConfigEntity[]> {
    let agents = await this.agentRepo.find({ where: { organizationId } });
    if (agents.length === 0) {
      agents = await this.seedDefaultAgents(organizationId);
    }
    return agents;
  }

  async findOne(organizationId: string, id: string): Promise<AgentConfigEntity | null> {
    return this.agentRepo.findOne({ where: { id, organizationId } });
  }

  async update(organizationId: string, id: string, data: Partial<AgentConfigEntity>): Promise<AgentConfigEntity> {
    const agent = await this.agentRepo.findOne({ where: { id, organizationId } });
    if (!agent) {
      throw new Error('Agente no encontrado');
    }
    Object.assign(agent, data);
    return this.agentRepo.save(agent);
  }

  private async seedDefaultAgents(organizationId: string): Promise<AgentConfigEntity[]> {
    const defaults = [
      {
        role: AgentRoleType.RECEPTIONIST,
        name: 'Reception Agent (Atención 24/7)',
        isActive: true,
        provider: AIProviderType.ANTHROPIC,
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.2,
        maxTokens: 1000,
        systemPrompt: 'Recepcionista cálido y profesional enfocado en responder dudas de servicios, precios y guiar a turnos.',
        allowedTools: ['search_knowledge_base', 'get_services', 'get_service_price', 'get_business_hours', 'get_business_location', 'create_lead', 'check_availability', 'handoff_to_human'],
        handoffKeywords: ['humano', 'operador', 'persona', 'queja', 'reclamo']
      },
      {
        role: AgentRoleType.LEAD_INTELLIGENCE,
        name: 'Lead Intelligence Agent',
        isActive: true,
        provider: AIProviderType.ANTHROPIC,
        model: 'claude-3-5-haiku-20241022',
        temperature: 0.1,
        maxTokens: 500,
        systemPrompt: 'Clasificador de intención, urgencia y prioridad de compra con salida estructurada JSON.',
        allowedTools: [],
        handoffKeywords: []
      },
      {
        role: AgentRoleType.BOOKING,
        name: 'Booking Agent (Agenda & Citas)',
        isActive: true,
        provider: AIProviderType.ANTHROPIC,
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.1,
        maxTokens: 800,
        systemPrompt: 'Especialista en verificar disponibilidad exacta y confirmar reservas en Google Calendar sin alucinaciones.',
        allowedTools: ['check_available_slots', 'confirm_appointment', 'cancel_appointment'],
        handoffKeywords: []
      },
      {
        role: AgentRoleType.FOLLOW_UP,
        name: 'Follow-Up Agent (Recontacto)',
        isActive: true,
        provider: AIProviderType.ANTHROPIC,
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.2,
        maxTokens: 600,
        systemPrompt: 'Generador de mensajes de reactivación personalizados respetando horario y sin promociones falsas.',
        allowedTools: [],
        handoffKeywords: []
      },
      {
        role: AgentRoleType.SUPERVISOR,
        name: 'Supervisor / Orchestrator',
        isActive: true,
        provider: AIProviderType.ANTHROPIC,
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.1,
        maxTokens: 1000,
        systemPrompt: 'Orquestador central, control de acceso de herramientas y guardrails de seguridad.',
        allowedTools: [],
        handoffKeywords: []
      }
    ];

    const entities = defaults.map((d) =>
      this.agentRepo.create({
        ...d,
        organizationId
      })
    );
    return this.agentRepo.save(entities);
  }
}
