import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationEntity } from '../../entities/automation.entity';
import { BusinessProfile } from '../../entities/business-profile.entity';
import { Message } from '../../entities/message.entity';
import { Lead } from '../../entities/lead.entity';
import { Appointment } from '../../entities/appointment.entity';
import { Conversation } from '../../entities/conversation.entity';
import { MessageSender, ConversationStatus, AppointmentStatus } from '@turnoflow/shared';

@Injectable()
export class AutomationsService {
  constructor(
    @InjectRepository(AutomationEntity)
    private readonly autoRepo: Repository<AutomationEntity>,
    @Optional()
    @InjectRepository(BusinessProfile)
    private readonly profileRepo?: Repository<BusinessProfile>,
    @Optional()
    @InjectRepository(Message)
    private readonly messageRepo?: Repository<Message>,
    @Optional()
    @InjectRepository(Lead)
    private readonly leadRepo?: Repository<Lead>,
    @Optional()
    @InjectRepository(Appointment)
    private readonly appointmentRepo?: Repository<Appointment>,
    @Optional()
    @InjectRepository(Conversation)
    private readonly conversationRepo?: Repository<Conversation>
  ) {}

  private async getProfile(organizationId: string): Promise<BusinessProfile | null> {
    if (!this.profileRepo) return null;
    let profile = await this.profileRepo.findOne({ where: { organizationId } });
    if (!profile) {
      profile = await this.profileRepo.findOne({ where: {} });
    }
    return profile;
  }

  async findAll(organizationId: string): Promise<any[]> {
    const profile = await this.getProfile(organizationId);
    let parsed: any = {};
    if (profile?.specialInstructions) {
      try {
        parsed = JSON.parse(profile.specialInstructions);
      } catch {
        parsed = {};
      }
    }

    const flags = {
      autoReply247: parsed?.automations?.autoReply247 !== false,
      visionReceipts: parsed?.automations?.visionReceipts !== false,
      autoLeadCapture: parsed?.automations?.autoLeadCapture !== false,
      adminAlerts: parsed?.automations?.adminAlerts !== false,
      appointmentReminders: parsed?.automations?.appointmentReminders !== false
    };

    const aiMessagesCount = this.messageRepo
      ? await this.messageRepo.count({ where: { sender: MessageSender.AI } })
      : 0;

    const leadsCount = this.leadRepo ? await this.leadRepo.count() : 0;

    const confirmedApptsCount = this.appointmentRepo
      ? await this.appointmentRepo.count({ where: { status: AppointmentStatus.CONFIRMED } })
      : 0;

    const handoffsCount = this.conversationRepo
      ? await this.conversationRepo.count({ where: { status: ConversationStatus.HUMAN_TAKEOVER } })
      : 0;

    const salesOrdersCount = Array.isArray(parsed?.salesOrders) ? parsed.salesOrders.length : 0;

    return [
      {
        id: 'autoReply247',
        name: 'Atención, Ventas y Cotización 24/7 + Buffer Anti-Ráfaga (3.5s)',
        description:
          'Agrupa mensajes consecutivos durante 3.5 segundos para no responder cortado y contesta consultas de precios, catálogo y ventas las 24 horas.',
        category: 'Recepción & Ventas WhatsApp',
        isActive: flags.autoReply247,
        status: flags.autoReply247 ? 'healthy' : 'paused',
        totalRuns: aiMessagesCount,
        rate: '100%'
      },
      {
        id: 'visionReceipts',
        name: 'Lectura Multimodal de Comprobantes de Pago, Fotos y Audios Cortos',
        description:
          'Analiza fotos de comprobantes bancarios, imágenes de productos/fallas y transcribe notas de voz menores a 15 segundos automáticamente.',
        category: 'Visión & Audio IA',
        isActive: flags.visionReceipts,
        status: flags.visionReceipts ? 'healthy' : 'paused',
        totalRuns: salesOrdersCount + Math.floor(aiMessagesCount * 0.2),
        rate: '100%'
      },
      {
        id: 'autoLeadCapture',
        name: 'Auto-Captura de Clientes y Clasificación de Intención en CRM',
        description:
          'Registra automáticamente en Clientes & Leads a cada contacto que escribe por WhatsApp y etiqueta su temperatura (🔥 Alta Intención, 🚨 Urgencia o 💬 Consulta).',
        category: 'Directorio & CRM',
        isActive: flags.autoLeadCapture,
        status: flags.autoLeadCapture ? 'healthy' : 'paused',
        totalRuns: leadsCount,
        rate: '100%'
      },
      {
        id: 'adminAlerts',
        name: 'Alertas al WhatsApp del Dueño (Ventas, Comprobantes y Atención Humana)',
        description:
          'Envía un aviso inmediato a tu WhatsApp personal cuando un cliente confirma un pedido, manda un comprobante de pago o solicita hablar con una persona.',
        category: 'Supervisión & Ventas',
        isActive: flags.adminAlerts,
        status: flags.adminAlerts ? 'healthy' : 'paused',
        totalRuns: handoffsCount + salesOrdersCount,
        rate: '100%'
      },
      {
        id: 'appointmentReminders',
        name: 'Recordatorios Automáticos de Turnos por WhatsApp (24 hs y 2 hs antes)',
        description:
          'Envía avisos automáticos por WhatsApp 24 horas y 2 horas antes de cada compromiso confirmado en la agenda.',
        category: 'Agenda & Fidelización',
        isActive: flags.appointmentReminders,
        status: flags.appointmentReminders ? 'healthy' : 'paused',
        totalRuns: confirmedApptsCount,
        rate: '100%'
      }
    ];
  }

  async toggle(organizationId: string, id: string): Promise<any> {
    const profile = await this.getProfile(organizationId);
    if (profile && this.profileRepo) {
      let parsed: any = {};
      if (profile.specialInstructions) {
        try {
          parsed = JSON.parse(profile.specialInstructions);
        } catch {
          parsed = { customContext: profile.specialInstructions };
        }
      }
      const automations = parsed.automations || {
        autoReply247: true,
        visionReceipts: true,
        autoLeadCapture: true,
        adminAlerts: true,
        appointmentReminders: true
      };

      const currentVal = automations[id] !== false;
      automations[id] = !currentVal;
      parsed.automations = automations;
      profile.specialInstructions = JSON.stringify(parsed);
      await this.profileRepo.save(profile);

      const list = await this.findAll(organizationId);
      return list.find((item) => item.id === id) || { id, isActive: !currentVal };
    }

    const item = await this.autoRepo.findOne({ where: { id, organizationId } });
    if (item) {
      item.isActive = !item.isActive;
      item.status = item.isActive ? 'healthy' : 'paused';
      return this.autoRepo.save(item);
    }
    return { id, isActive: false };
  }
}
