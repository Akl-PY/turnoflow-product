import { Injectable, Logger, BadRequestException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Conversation } from '../../entities/conversation.entity';
import { Message } from '../../entities/message.entity';
import { BusinessProfile } from '../../entities/business-profile.entity';
import { Lead } from '../../entities/lead.entity';
import { AiService } from '../ai/ai.service';
import { IntegrationsService } from '../integrations/integrations.service';
import {
  ConversationStatus,
  MessageSender,
  LeadStatus,
  LeadIntent,
  LeadPriority,
  AgentRoleType
} from '@turnoflow/shared';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);
  private readonly processingExternalIds = new Set<string>();
  private readonly recentAdminAlerts = new Map<string, number>();

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @Optional()
    @InjectRepository(BusinessProfile)
    private readonly profileRepo?: Repository<BusinessProfile>,
    @Optional()
    private readonly aiService?: AiService,
    @Optional()
    private readonly integrationsService?: IntegrationsService,
    @Optional()
    @InjectRepository(Lead)
    private readonly leadRepo?: Repository<Lead>
  ) {}

  getTenantVerifyToken(organizationId: string): string {
    const clean = (organizationId || '').replace(/-/g, '');
    return `tf_sec_${clean.substring(0, 16)}`;
  }

  verifyMetaSignature(rawPayload: string, signatureHeader?: string): boolean {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret || !signatureHeader) {
      return true;
    }

    const [algorithm, signature] = signatureHeader.split('=');
    if (algorithm !== 'sha256' || !signature) {
      return false;
    }

    const hmac = crypto.createHmac('sha256', appSecret);
    const expectedSignature = hmac.update(rawPayload).digest('hex');
    const sigBuf = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    if (sigBuf.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  }

  async handleIncomingMessage(params: {
    channel: string;
    senderPhone: string;
    senderName: string;
    messageText: string;
    externalMessageId?: string;
    organizationId?: string;
  }): Promise<{ replyMessage: string; handoffToHuman: boolean; duplicate?: boolean }> {
    const orgId = params.organizationId || 'default-org-id';

    // Blindaje estricto: rechazar cualquier mensaje proveniente de grupos de WhatsApp, canales o difusiones
    const cleanDigits = (params.senderPhone || '').replace(/\D/g, '');
    if (
      params.channel === 'whatsapp_group' ||
      params.senderPhone.includes('@g.us') ||
      params.senderPhone.includes('@broadcast') ||
      params.senderPhone.includes('@newsletter') ||
      cleanDigits.startsWith('120363') ||
      cleanDigits.length > 15 ||
      cleanDigits.length < 8
    ) {
      this.logger.warn(`[BLINDAJE GRUPO] Mensaje de grupo o número inválido descartado: ${params.senderPhone}`);
      return { replyMessage: '', handoffToHuman: false, duplicate: false };
    }

    // 1. Verificación atómica en memoria + base de datos (Idempotencia contra doble evento @lid / global webhook)
    if (params.externalMessageId) {
      if (this.processingExternalIds.has(params.externalMessageId)) {
        this.logger.warn(`Mensaje concurrente descartado en memoria: ${params.externalMessageId}`);
        return { replyMessage: 'Mensaje ya procesado.', handoffToHuman: false, duplicate: true };
      }
      this.processingExternalIds.add(params.externalMessageId);
      // Limpiar de memoria tras 2 minutos para no acumular RAM
      setTimeout(() => this.processingExternalIds.delete(params.externalMessageId!), 120000).unref?.();

      const alreadyProcessed = await this.messageRepo.findOne({
        where: { externalMessageId: params.externalMessageId }
      });
      if (alreadyProcessed) {
        this.logger.warn(`Mensaje duplicado descartado en BD: ${params.externalMessageId}`);
        return { replyMessage: 'Mensaje ya procesado.', handoffToHuman: false, duplicate: true };
      }
    }

    // 2. Buscar o crear conversación
    let conversation = await this.findByPhone(orgId, params.senderPhone);

    const isExcludedPhone = await this.isPhoneExcluded(orgId, params.senderPhone);

    if (!conversation) {
      conversation = this.conversationRepo.create({
        organizationId: orgId,
        channel: params.channel,
        channelConversationId: params.senderPhone.startsWith('+') ? params.senderPhone : `+${params.senderPhone}`,
        status: isExcludedPhone ? ConversationStatus.HUMAN_TAKEOVER : ConversationStatus.AI_HANDLED,
        assignedAgent: isExcludedPhone ? ('EXCLUDED_PERMANENT' as any) : AgentRoleType.RECEPTIONIST,
        messagesCount: 0
      });
      conversation = await this.conversationRepo.save(conversation);
    }

    // 2.0 Si el contacto está en la Lista de Excluidos Permanentes (Proveedores, Familiares, Personal),
    // guardar el mensaje en el historial pero JAMÁS responder ni reactivar a las 24 horas
    if (isExcludedPhone || (conversation.assignedAgent as any) === 'EXCLUDED_PERMANENT') {
      this.logger.log(
        `[EXCLUIDO PERMANENTE] Mensaje de ${params.senderPhone} guardado sin responder (Contacto Excluido).`
      );
      const userMsg = this.messageRepo.create({
        conversationId: conversation.id,
        sender: MessageSender.USER,
        content: params.messageText,
        externalMessageId: params.externalMessageId
      });
      await this.messageRepo.save(userMsg);

      await this.conversationRepo.update(conversation.id, {
        status: ConversationStatus.HUMAN_TAKEOVER,
        assignedAgent: 'EXCLUDED_PERMANENT' as any,
        lastMessagePreview: params.messageText.substring(0, 100),
        messagesCount: (conversation.messagesCount || 0) + 1
      });

      return {
        replyMessage: '',
        handoffToHuman: true,
        duplicate: false
      };
    }

    // Revisar switches de automatizaciones activas del negocio
    const autoSettings = await this.getAutomationFlags(orgId);
    if (!autoSettings.autoReply247) {
      const userMsg = this.messageRepo.create({
        conversationId: conversation.id,
        sender: MessageSender.USER,
        content: params.messageText,
        externalMessageId: params.externalMessageId
      });
      await this.messageRepo.save(userMsg);
      await this.conversationRepo.update(conversation.id, {
        lastMessagePreview: params.messageText.substring(0, 100),
        messagesCount: (conversation.messagesCount || 0) + 1
      });
      return {
        replyMessage: '',
        handoffToHuman: true,
        duplicate: false
      };
    }

    if (conversation.status === ConversationStatus.HUMAN_TAKEOVER) {
      // Buscar la última intervención humana (desde WhatsApp o desde el Panel)
      const lastHumanMsg = await this.messageRepo.findOne({
        where: {
          conversationId: conversation.id,
          sender: MessageSender.HUMAN_AGENT
        },
        order: { createdAt: 'DESC' }
      });

      // Si existe mensaje humano medimos desde ahí; si no, desde que se pausó la conversación
      const lastInterventionTime = lastHumanMsg
        ? new Date(lastHumanMsg.createdAt).getTime()
        : (conversation.updatedAt ? new Date(conversation.updatedAt).getTime() : Date.now());

      const hoursSinceHandoff = (Date.now() - lastInterventionTime) / (1000 * 60 * 60);

      // Si pasaron menos de 24 horas desde la intervención, el bot permanece en SILENCIO ABSOLUTO
      if (hoursSinceHandoff < 24) {
        this.logger.log(
          `[SILENCIO 24HS] Chat en atención humana (${hoursSinceHandoff.toFixed(1)}hs transcurridas < 24hs). Guardando mensaje de ${params.senderPhone} sin responder con IA.`
        );

        // Guardar mensaje del usuario en BD para que el operador lo lea
        const userMsg = this.messageRepo.create({
          conversationId: conversation.id,
          sender: MessageSender.USER,
          content: params.messageText,
          externalMessageId: params.externalMessageId
        });
        await this.messageRepo.save(userMsg);

        // Actualizar preview sin alterar updatedAt para no estirar artificialmente las 24hs
        await this.conversationRepo.update(conversation.id, {
          lastMessagePreview: params.messageText.substring(0, 100),
          messagesCount: (conversation.messagesCount || 0) + 1
        });

        return {
          replyMessage: '',
          handoffToHuman: true,
          duplicate: false
        };
      } else {
        // Pasaron 24 horas o más: reactivación automática de la IA para nuevas consultas
        this.logger.log(
          `[AUTO-REACTIVACIÓN 24HS] Han pasado ${hoursSinceHandoff.toFixed(1)}hs (>= 24hs). Reactivando IA automáticamente para ${params.senderPhone}.`
        );
        conversation.status = ConversationStatus.AI_HANDLED;
        await this.conversationRepo.save(conversation);
      }
    }

    // 2.1 Detectar ANTES de guardar/responder si es Gente Nueva, Ya se Comunicó o Cliente/Estudiante Actual
    const hadPriorUserMessages = (conversation.messagesCount || 0) > 0;
    const contactSegment = this.aiService
      ? await this.aiService.resolveContactSegment({
          organizationId: orgId,
          senderPhone: params.senderPhone,
          conversationId: conversation.id,
          hadPriorUserMessages
        })
      : hadPriorUserMessages
      ? 'RETURNING_CONTACT'
      : 'NEW_CONTACT';

    // Guardar mensaje entrante del usuario
    const userMsg = this.messageRepo.create({
      conversationId: conversation.id,
      sender: MessageSender.USER,
      content: params.messageText,
      externalMessageId: params.externalMessageId
    });
    await this.messageRepo.save(userMsg);

    // 3. Procesar con motor de IA de forma segura
    let aiResult;
    try {
      aiResult = this.aiService
        ? await this.aiService.processIncomingMessage({
            organizationId: orgId,
            conversationId: conversation.id,
            userText: params.messageText,
            senderPhone: params.senderPhone,
            contactSegment,
            hadPriorUserMessages
          })
        : {
            replyText: 'Gracias por comunicarte con nosotros.',
            toolExecutions: [],
            handoffToHuman: false,
            handoffReason: undefined,
            contactSegment
          };
    } catch (err: any) {
      this.logger.error(`Error procesando mensaje con IA: ${err.message}`);

      // Comprobar si el último mensaje ya fue una disculpa o aviso de demora
      const lastMsg = await this.messageRepo.findOne({
        where: { conversationId: conversation.id },
        order: { createdAt: 'DESC' }
      });

      const isRepeatedFailure =
        lastMsg &&
        lastMsg.sender === MessageSender.AI &&
        (lastMsg.content.includes('demora técnica') ||
          lastMsg.content.includes('Disculpa la demora') ||
          lastMsg.content.includes('equipo'));

      if (isRepeatedFailure) {
        // Si ya le avisamos hace un instante, NO spamear al cliente en cada mensaje que mande
        this.logger.warn(
          `[AI ERROR SILENCE] Error recurrente de IA en conversación ${conversation.id}. Silenciando bot para no cansar al cliente.`
        );
        conversation.status = ConversationStatus.HUMAN_TAKEOVER;
        await this.conversationRepo.save(conversation);

        return {
          replyMessage: '',
          handoffToHuman: true,
          duplicate: false
        };
      }

      // Primera falla: avisar educadamente y pausar el bot de inmediato
      aiResult = {
        replyText:
          'En este momento estoy teniendo una pequeña demora técnica. Ya le avisé a nuestro equipo para que te responda en breve.',
        toolExecutions: [],
        handoffToHuman: true,
        handoffReason: 'Falla técnica del proveedor de IA'
      };
    }

    // Guardar respuesta del asistente solo si hay texto para enviar
    if (aiResult.replyText && aiResult.replyText.trim()) {
      const aiMsg = this.messageRepo.create({
        conversationId: conversation.id,
        sender: MessageSender.AI,
        content: aiResult.replyText,
        toolCalls: aiResult.toolExecutions
      });
      await this.messageRepo.save(aiMsg);
      conversation.lastMessagePreview = aiResult.replyText.substring(0, 100);
      conversation.messagesCount += 1;
    }

    // Ejecutar reenvíos a grupos o contactos si la IA disparó 'forward_to_group_or_contact'
    const forwardTools = (aiResult.toolExecutions || []).filter(
      (t) => t.toolName === 'forward_to_group_or_contact' && t.success && (t.result as any)?.targetGroupOrPhone
    );
    if (forwardTools.length > 0 && this.integrationsService) {
      for (const ft of forwardTools) {
        const resData = ft.result as any;
        const target = resData.targetGroupOrPhone;
        const textMsg = `📲 *[Aviso Reenviado por Regla Personalizada]*\n👤 *Contacto:* ${
          params.senderName || 'Cliente'
        }\n📱 *Número:* ${
          params.senderPhone.startsWith('+') ? params.senderPhone : `+${params.senderPhone}`
        }\n\n*Detalle:*\n${resData.summaryText || params.messageText}`;
        await this.integrationsService
          .sendWhatsAppToGroupOrContact(orgId, target, textMsg)
          .catch(() => null);
      }
    }

    // Notificar al dueño si la IA acaba de registrar un nuevo Pedido / Venta (create_order)
    const createdOrderTool = (aiResult.toolExecutions || []).find(
      (t) => t.toolName === 'create_order' && t.success && (t.result as any)?.order
    );
    if (createdOrderTool && autoSettings.adminAlerts && this.profileRepo && this.integrationsService) {
      try {
        const ord = (createdOrderTool.result as any).order;
        const profile = await this.profileRepo.findOne({ where: { organizationId: orgId } });
        const adminPhone = profile?.contactPhone || process.env.ADMIN_PHONE_NUMBER;
        if (adminPhone && adminPhone.replace(/\D/g, '') !== params.senderPhone.replace(/\D/g, '')) {
          const orderAlert = `🛍️ *[Nueva Venta / Pedido Confirmado]*\nEl cliente *${
            ord.customerName || params.senderName || 'Cliente'
          }* (${params.senderPhone}) confirmó un pedido por WhatsApp.\n\n*Detalle:* ${
            ord.itemsSummary
          }\n*Total:* $${ord.totalAmount} ${ord.currency || 'USD'}\n*Entrega:* ${
            ord.deliveryMethod
          }\n*Pago:* ${ord.paymentMethod}`;
          await this.integrationsService.sendQRWhatsAppMessage(orgId, adminPhone, orderAlert).catch(() => null);
        }
      } catch (err: any) {
        this.logger.warn(`No se pudo enviar alerta de pedido al admin: ${err.message}`);
      }
    }

    if (aiResult.handoffToHuman) {
      conversation.status = ConversationStatus.HUMAN_TAKEOVER;
      conversation.updatedAt = new Date();

      // Alerta urgente al administrador por WhatsApp (limitada a 1 cada 6 horas por cliente para no saturar al admin)
      const now = Date.now();
      const lastAlertTs = this.recentAdminAlerts.get(params.senderPhone) || 0;
      const hoursSinceLastAlert = (now - lastAlertTs) / (1000 * 60 * 60);

      if (autoSettings.adminAlerts && hoursSinceLastAlert >= 6 && this.profileRepo && this.integrationsService) {
        try {
          const profile = await this.profileRepo.findOne({ where: { organizationId: orgId } });
          const adminPhone = profile?.contactPhone || process.env.ADMIN_PHONE_NUMBER;
          if (adminPhone && adminPhone.replace(/\D/g, '') !== params.senderPhone.replace(/\D/g, '')) {
            this.recentAdminAlerts.set(params.senderPhone, now);
            const alertText = `🚨 *[TurnoFlow Alerta de Atención]*
El cliente *${params.senderName || 'Desconocido'}* (${params.senderPhone}) necesita asistencia humana.

*Motivo:* ${aiResult.handoffReason || 'Consulta no resuelta / Pedido de operador'}
*Mensaje del cliente:* "${params.messageText}"

👉 Podés responderle directamente a su WhatsApp o gestionar el chat desde el panel de TurnoFlow.`;
            await this.integrationsService.sendQRWhatsAppMessage(orgId, adminPhone, alertText).catch(() => null);
          }
        } catch (err: any) {
          this.logger.warn(`No se pudo enviar alerta al admin: ${err.message}`);
        }
      }
    }
    await this.conversationRepo.save(conversation);

    // 4. Auto-captura y clasificación de Lead en CRM a partir de la interacción
    if (autoSettings.autoLeadCapture) {
      await this.autoCaptureLeadFromMessage(
        orgId,
        params.senderPhone,
        params.senderName,
        params.messageText,
        Boolean(aiResult.handoffToHuman),
        aiResult.toolExecutions || []
      );
    }

    return {
      replyMessage: aiResult.replyText,
      handoffToHuman: aiResult.handoffToHuman,
      duplicate: false,
      contactSegment
    } as any;
  }

  async getAutomationFlags(organizationId: string): Promise<{
    autoReply247: boolean;
    visionReceipts: boolean;
    autoLeadCapture: boolean;
    adminAlerts: boolean;
    appointmentReminders: boolean;
  }> {
    const defaults = {
      autoReply247: true,
      visionReceipts: true,
      autoLeadCapture: true,
      adminAlerts: true,
      appointmentReminders: true
    };
    if (!this.profileRepo) return defaults;
    try {
      let profile = await this.profileRepo.findOne({ where: { organizationId } });
      if (!profile) {
        profile = await this.profileRepo.findOne({ where: {} });
      }
      if (profile?.specialInstructions) {
        const parsed = JSON.parse(profile.specialInstructions);
        if (parsed?.automations) {
          return {
            autoReply247: parsed.automations.autoReply247 !== false,
            visionReceipts: parsed.automations.visionReceipts !== false,
            autoLeadCapture: parsed.automations.autoLeadCapture !== false,
            adminAlerts: parsed.automations.adminAlerts !== false,
            appointmentReminders: parsed.automations.appointmentReminders !== false
          };
        }
      }
    } catch {
      // Ignorar
    }
    return defaults;
  }

  private async autoCaptureLeadFromMessage(
    organizationId: string,
    rawPhone: string,
    senderName: string,
    messageText: string,
    handoffToHuman: boolean,
    toolExecutions: any[]
  ): Promise<void> {
    if (!this.leadRepo) return;
    try {
      const cleanDigits = rawPhone.replace(/\D/g, '');
      if (!cleanDigits || cleanDigits.length < 7) return;
      const formattedPhone = `+${cleanDigits}`;
      const textLower = (messageText || '').toLowerCase();

      // Clasificar intención y temperatura automáticamente
      let intent = LeadIntent.INFORMATIONAL;
      let priority = LeadPriority.WARM;
      let status = LeadStatus.NEW;

      const isUrgentOrHuman =
        handoffToHuman ||
        textLower.includes('urgente') ||
        textLower.includes('rompi') ||
        textLower.includes('roto') ||
        textLower.includes('reclamo') ||
        textLower.includes('problema') ||
        textLower.includes('humano') ||
        textLower.includes('persona');

      const isBuyingOrBooking =
        textLower.includes('comprar') ||
        textLower.includes('precio') ||
        textLower.includes('cuanto') ||
        textLower.includes('cuánto') ||
        textLower.includes('presupuesto') ||
        textLower.includes('turno') ||
        textLower.includes('reservar') ||
        textLower.includes('agendar') ||
        textLower.includes('comprobante_detectado') ||
        textLower.includes('transferencia') ||
        textLower.includes('quiero');

      const bookedAppointment = toolExecutions.some(
        (t) => t.toolName === 'confirm_appointment' && t.success
      );

      if (bookedAppointment || textLower.includes('comprobante_detectado')) {
        intent = LeadIntent.HIGH;
        priority = LeadPriority.HOT;
        status = LeadStatus.BOOKED;
      } else if (isUrgentOrHuman) {
        intent = LeadIntent.URGENT;
        priority = LeadPriority.HOT;
        status = LeadStatus.PENDING;
      } else if (isBuyingOrBooking) {
        intent = LeadIntent.HIGH;
        priority = LeadPriority.HOT;
        status = LeadStatus.INTERESTED;
      }

      // Detectar si mencionó algún servicio o producto del catálogo
      let detectedItem: string | undefined;
      if (this.profileRepo) {
        const profile = await this.profileRepo.findOne({ where: { organizationId } });
        if (profile && Array.isArray(profile.services)) {
          const matched = profile.services.find((s) =>
            textLower.includes(s.name.toLowerCase())
          );
          if (matched) {
            detectedItem = matched.name;
          }
        }
      }

      const existing = await this.leadRepo.findOne({
        where: [
          { organizationId, phone: formattedPhone },
          { organizationId, phone: cleanDigits },
          { organizationId, phone: rawPhone }
        ]
      });

      if (!existing) {
        const newLead = this.leadRepo.create({
          organizationId,
          name: senderName && senderName !== 'Cliente' ? senderName : `Contacto ${formattedPhone}`,
          phone: formattedPhone,
          requestedService: detectedItem || 'Consulta General / WhatsApp',
          intent,
          priority,
          status,
          source: 'whatsapp',
          notes: messageText.substring(0, 200),
          lastInteractionAt: new Date()
        });
        await this.leadRepo.save(newLead);
      } else {
        if (senderName && senderName !== 'Cliente' && existing.name.startsWith('Contacto ')) {
          existing.name = senderName;
        }
        if (detectedItem) {
          existing.requestedService = detectedItem;
        }
        if (priority === LeadPriority.HOT) {
          existing.priority = LeadPriority.HOT;
        }
        if (intent === LeadIntent.URGENT || intent === LeadIntent.HIGH) {
          existing.intent = intent;
        }
        if (status === LeadStatus.BOOKED) {
          existing.status = LeadStatus.BOOKED;
        }
        existing.notes = messageText.substring(0, 200);
        existing.lastInteractionAt = new Date();
        await this.leadRepo.save(existing);
      }
    } catch (err: any) {
      this.logger.warn(`Auto-captura de lead omitida: ${err.message}`);
    }
  }

  async findAll(organizationId: string): Promise<Conversation[]> {
    let list = await this.conversationRepo.find({
      where: [
        { organizationId },
        { organizationId: 'default-org-id' }
      ],
      order: { updatedAt: 'DESC' }
    });

    // Fallback: si hubo cambio de UUID de organización en redeploy pero hay conversaciones en la base
    if (list.length === 0) {
      list = await this.conversationRepo.find({
        order: { updatedAt: 'DESC' }
      });
    }

    // Si aún está vacío (ej. tras redeploy de contenedor efímero), sincronizar historial reciente desde Evolution API
    if (list.length === 0 && this.integrationsService) {
      await this.syncRecentChatsFromEvolution(organizationId);
      list = await this.conversationRepo.find({
        order: { updatedAt: 'DESC' }
      });
    }

    const seen = new Set<string>();
    const deduplicated: any[] = [];
    for (const c of list) {
      const cleanPhone = (c.channelConversationId || '').replace(/\D/g, '');
      const key = cleanPhone || c.id;
      if (!seen.has(key)) {
        seen.add(key);
        let segment: 'NEW_CONTACT' | 'RETURNING_CONTACT' | 'EXISTING_CUSTOMER' =
          (c.messagesCount || 0) > 1 ? 'RETURNING_CONTACT' : 'NEW_CONTACT';
        if (this.aiService) {
          try {
            segment = await this.aiService.resolveContactSegment({
              organizationId: c.organizationId || organizationId,
              senderPhone: c.channelConversationId,
              conversationId: c.id,
              hadPriorUserMessages: (c.messagesCount || 0) > 1
            });
          } catch {
            // Fallback por conteo de mensajes
          }
        }
        deduplicated.push({
          ...c,
          contactSegment: segment
        });
      }
    }
    return deduplicated;
  }

  async setCustomerPhoneFlag(
    organizationId: string,
    phone: string,
    isCustomer: boolean
  ): Promise<{ success: boolean; existingCustomerPhones: string[] }> {
    if (!this.profileRepo) return { success: false, existingCustomerPhones: [] };
    let profile = await this.profileRepo.findOne({ where: { organizationId } });
    if (!profile) {
      profile = await this.profileRepo.findOne({ where: {} });
    }
    if (!profile) return { success: false, existingCustomerPhones: [] };

    let parsed: Record<string, any> = {};
    if (profile.specialInstructions) {
      try {
        parsed = JSON.parse(profile.specialInstructions);
      } catch {
        parsed = { customContext: profile.specialInstructions };
      }
    }

    const cleanDigits = (phone || '').replace(/\D/g, '');
    const list: string[] = Array.isArray(parsed.existingCustomerPhones)
      ? parsed.existingCustomerPhones.map((p: any) => String(p).trim()).filter(Boolean)
      : [];

    const filtered = list.filter((p) => {
      const pDigits = p.replace(/\D/g, '');
      if (!pDigits || !cleanDigits) return true;
      return !(
        pDigits === cleanDigits ||
        (pDigits.length >= 8 && cleanDigits.length >= 8 && pDigits.slice(-8) === cleanDigits.slice(-8))
      );
    });

    if (isCustomer && cleanDigits) {
      const formatted = phone.startsWith('+') ? phone.trim() : `+${cleanDigits}`;
      filtered.push(formatted);
    }

    parsed.existingCustomerPhones = filtered;
    profile.specialInstructions = JSON.stringify(parsed);
    await this.profileRepo.save(profile);

    return { success: true, existingCustomerPhones: filtered };
  }

  private async syncRecentChatsFromEvolution(organizationId: string): Promise<void> {
    if (!this.integrationsService) return;
    try {
      const records = await this.integrationsService.fetchEvolutionRecentMessages(organizationId);
      if (!records || records.length === 0) return;

      const convByPhone = new Map<string, Conversation>();
      for (const rec of records) {
        let conv = convByPhone.get(rec.remotePhone);
        if (!conv) {
          const existing = await this.findByPhone(organizationId, rec.remotePhone);
          if (existing) {
            conv = existing;
          } else {
            conv = this.conversationRepo.create({
              organizationId,
              channel: 'whatsapp_qr',
              channelConversationId: rec.remotePhone,
              status: ConversationStatus.AI_HANDLED,
              messagesCount: 0,
              lastMessagePreview: rec.text.substring(0, 100)
            });
            conv = await this.conversationRepo.save(conv);
          }
          convByPhone.set(rec.remotePhone, conv);
        }

        const existingMsg = await this.messageRepo.findOne({
          where: { externalMessageId: rec.messageId }
        });
        if (!existingMsg) {
          const msg = this.messageRepo.create({
            conversationId: conv.id,
            sender: rec.fromMe ? MessageSender.AI : MessageSender.USER,
            content: rec.text,
            externalMessageId: rec.messageId
          });
          await this.messageRepo.save(msg);
          conv.lastMessagePreview = rec.text.substring(0, 100);
          conv.messagesCount = (conv.messagesCount || 0) + 1;
          await this.conversationRepo.save(conv);
        }
      }
      this.logger.log(`[EVOLUTION SYNC] Recuperadas ${convByPhone.size} conversaciones desde Evolution API.`);
    } catch (err: any) {
      this.logger.warn(`Error recuperando chats desde Evolution API: ${err.message}`);
    }
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    let msgs = await this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' }
    });

    // Si no se encuentran mensajes por el UUID exacto, buscar por el número de teléfono del contacto
    if (msgs.length === 0) {
      const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
      if (conv?.channelConversationId) {
        const cleanDigits = conv.channelConversationId.replace(/\D/g, '');
        const matchingConvs = await this.conversationRepo.find({
          where: [
            { channelConversationId: conv.channelConversationId },
            { channelConversationId: `+${cleanDigits}` },
            { channelConversationId: cleanDigits }
          ]
        });
        const convIds = matchingConvs.map((c) => c.id);
        if (convIds.length > 0) {
          msgs = await this.messageRepo.createQueryBuilder('m')
            .where('m.conversationId IN (:...convIds)', { convIds })
            .orderBy('m.createdAt', 'ASC')
            .getMany();
        }
      }
    }

    return msgs;
  }

  async findByConversationId(conversationId: string): Promise<Conversation | null> {
    return this.conversationRepo.findOne({ where: { id: conversationId } });
  }

  async findByPhone(organizationId: string, phone: string): Promise<Conversation | null> {
    const cleanDigits = phone.replace(/\D/g, '');
    return this.conversationRepo.findOne({
      where: [
        { organizationId, channelConversationId: phone },
        { organizationId, channelConversationId: `+${cleanDigits}` },
        { organizationId, channelConversationId: cleanDigits }
      ]
    });
  }

  async pauseAi(conversationId: string, reason?: string): Promise<Conversation> {
    const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conv) {
      throw new BadRequestException('Conversación no encontrada.');
    }
    conv.status = ConversationStatus.HUMAN_TAKEOVER;
    conv.updatedAt = new Date();
    return this.conversationRepo.save(conv);
  }

  async resumeAi(conversationId: string): Promise<Conversation> {
    const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conv) {
      throw new BadRequestException('Conversación no encontrada.');
    }
    conv.status = ConversationStatus.AI_HANDLED;
    if ((conv.assignedAgent as any) === 'EXCLUDED_PERMANENT') {
      conv.assignedAgent = AgentRoleType.RECEPTIONIST;
      await this.removeExcludedPhone(conv.organizationId, conv.channelConversationId);
    }
    conv.updatedAt = new Date();
    const saved = await this.conversationRepo.save(conv);
    this.logger.log(
      `[IA REACTIVADA] Operador reactivó la atención automática para ${conv.channelConversationId}`
    );
    return saved;
  }

  async excludeConversationPermanently(conversationId: string, label?: string): Promise<Conversation> {
    const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conv) {
      throw new BadRequestException('Conversación no encontrada.');
    }
    conv.status = ConversationStatus.HUMAN_TAKEOVER;
    conv.assignedAgent = 'EXCLUDED_PERMANENT' as any;
    conv.updatedAt = new Date();
    const saved = await this.conversationRepo.save(conv);
    await this.addExcludedPhone(conv.organizationId, conv.channelConversationId, label || 'Contacto Excluido');
    this.logger.log(
      `[EXCLUIDO PERMANENTE] El contacto ${conv.channelConversationId} fue marcado como No Responder Nunca.`
    );
    return saved;
  }

  async unexcludeConversation(conversationId: string): Promise<Conversation> {
    return this.resumeAi(conversationId);
  }

  async isPhoneExcluded(organizationId: string, phone: string): Promise<boolean> {
    const cleanDigits = (phone || '').replace(/\D/g, '');
    if (!cleanDigits) return false;
    const list = await this.getExcludedPhones(organizationId);
    return list.some((item) => (item.phone || '').replace(/\D/g, '') === cleanDigits);
  }

  async getExcludedPhones(
    organizationId: string
  ): Promise<Array<{ phone: string; label: string; addedAt: string }>> {
    if (!this.profileRepo) return [];
    try {
      let profile = await this.profileRepo.findOne({ where: { organizationId } });
      if (!profile) {
        profile = await this.profileRepo.findOne({ where: {} });
      }
      if (profile?.specialInstructions) {
        const parsed = JSON.parse(profile.specialInstructions);
        if (Array.isArray(parsed.excludedPhones)) {
          return parsed.excludedPhones;
        }
      }
    } catch {
      // Ignorar
    }
    return [];
  }

  async addExcludedPhone(
    organizationId: string,
    phone: string,
    label = 'Proveedor / Personal'
  ): Promise<Array<{ phone: string; label: string; addedAt: string }>> {
    if (!this.profileRepo) return [];
    const cleanDigits = (phone || '').replace(/\D/g, '');
    if (!cleanDigits) return [];
    const formattedPhone = `+${cleanDigits}`;

    let profile = await this.profileRepo.findOne({ where: { organizationId } });
    if (!profile) {
      profile = await this.profileRepo.findOne({ where: {} });
    }
    if (!profile) return [];

    let parsed: any = {};
    if (profile.specialInstructions) {
      try {
        parsed = JSON.parse(profile.specialInstructions);
      } catch {
        parsed = { customContext: profile.specialInstructions };
      }
    }

    const list: Array<{ phone: string; label: string; addedAt: string }> = Array.isArray(parsed.excludedPhones)
      ? parsed.excludedPhones
      : [];

    if (!list.some((item) => (item.phone || '').replace(/\D/g, '') === cleanDigits)) {
      list.unshift({
        phone: formattedPhone,
        label,
        addedAt: new Date().toISOString()
      });
    }

    parsed.excludedPhones = list;
    profile.specialInstructions = JSON.stringify(parsed);
    await this.profileRepo.save(profile);

    // También marcar conversación existente si la hubiera
    const existingConv = await this.findByPhone(organizationId, formattedPhone);
    if (existingConv) {
      existingConv.status = ConversationStatus.HUMAN_TAKEOVER;
      existingConv.assignedAgent = 'EXCLUDED_PERMANENT' as any;
      await this.conversationRepo.save(existingConv);
    }

    return list;
  }

  async removeExcludedPhone(
    organizationId: string,
    phone: string
  ): Promise<Array<{ phone: string; label: string; addedAt: string }>> {
    if (!this.profileRepo) return [];
    const cleanDigits = (phone || '').replace(/\D/g, '');

    let profile = await this.profileRepo.findOne({ where: { organizationId } });
    if (!profile) {
      profile = await this.profileRepo.findOne({ where: {} });
    }
    if (!profile) return [];

    let parsed: any = {};
    if (profile.specialInstructions) {
      try {
        parsed = JSON.parse(profile.specialInstructions);
      } catch {
        parsed = {};
      }
    }

    const list: Array<{ phone: string; label: string; addedAt: string }> = Array.isArray(parsed.excludedPhones)
      ? parsed.excludedPhones
      : [];

    parsed.excludedPhones = list.filter((item) => (item.phone || '').replace(/\D/g, '') !== cleanDigits);
    profile.specialInstructions = JSON.stringify(parsed);
    await this.profileRepo.save(profile);

    const existingConv = await this.findByPhone(organizationId, `+${cleanDigits}`);
    if (existingConv && (existingConv.assignedAgent as any) === 'EXCLUDED_PERMANENT') {
      existingConv.assignedAgent = AgentRoleType.RECEPTIONIST;
      existingConv.status = ConversationStatus.AI_HANDLED;
      await this.conversationRepo.save(existingConv);
    }

    return parsed.excludedPhones;
  }

  async sendOwnerExecutiveSummary(
    organizationId: string,
    overrideTargetPhone?: string,
    instanceName?: string
  ): Promise<{ sent: boolean; summaryText: string; targetPhone?: string }> {
    let businessName = 'Mi Negocio';
    let targetPhone = overrideTargetPhone || process.env.ADMIN_PHONE_NUMBER || '';
    let salesOrders: any[] = [];

    if (this.profileRepo) {
      let profile = await this.profileRepo.findOne({ where: { organizationId } });
      if (!profile) {
        profile = await this.profileRepo.findOne({ where: {} });
      }
      if (profile) {
        businessName = profile.businessName || businessName;
        if (!targetPhone && profile.contactPhone) {
          targetPhone = profile.contactPhone;
        }
        if (profile.specialInstructions) {
          try {
            const parsed = JSON.parse(profile.specialInstructions);
            if (Array.isArray(parsed.salesOrders)) {
              salesOrders = parsed.salesOrders;
            }
          } catch {
            // Ignorar
          }
        }
      }
    }

    const allConvs = await this.findAll(organizationId);
    const aiActiveCount = allConvs.filter((c) => c.status === ConversationStatus.AI_HANDLED).length;
    const pausedCount = allConvs.filter(
      (c) => c.status === ConversationStatus.HUMAN_TAKEOVER && (c.assignedAgent as any) !== 'EXCLUDED_PERMANENT'
    ).length;
    const excludedCount = allConvs.filter((c) => (c.assignedAgent as any) === 'EXCLUDED_PERMANENT').length;

    let totalLeads = 0;
    let hotLeads = 0;
    if (this.leadRepo) {
      const leads = await this.leadRepo.find();
      totalLeads = leads.length;
      hotLeads = leads.filter((l) => l.priority === LeadPriority.HOT || l.intent === LeadIntent.HIGH).length;
    }

    const totalOrders = salesOrders.length;
    const pendingOrders = salesOrders.filter((o) => o.status === 'PENDIENTE').length;
    const totalSalesRevenue = salesOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);

    const dateStr = new Date().toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });

    const summaryText = `📊 *[Resumen Ejecutivo — ${businessName}]*
📅 *Fecha:* ${dateStr}

💬 *Chats Activos:* ${allConvs.length} totales
  • 🟢 Respondidos por IA: ${aiActiveCount}
  • 🟡 En Pausa Humana: ${pausedCount}
  • 🚫 Excluidos Permanentes: ${excludedCount}

👥 *Clientes / Leads en CRM:* ${totalLeads} (${hotLeads} 🔥 Alta Intención)
🛍️ *Pedidos / Ventas:* ${totalOrders} registrados ($${totalSalesRevenue} acumulado | ${pendingOrders} pendientes de despacho)

💡 *Tip:* Podés pedir este reporte en cualquier momento enviando */resumen* por WhatsApp o desde el Panel Ejecutivo.`;

    if (targetPhone && this.integrationsService) {
      const res = await this.integrationsService.sendQRWhatsAppMessage(
        organizationId,
        targetPhone,
        summaryText,
        instanceName
      );
      return { sent: res.success, summaryText, targetPhone };
    }

    return { sent: false, summaryText, targetPhone };
  }

  async resetAllToAi(organizationId?: string): Promise<{ affected: number }> {
    const qb = this.conversationRepo
      .createQueryBuilder()
      .update(Conversation)
      .set({ status: ConversationStatus.AI_HANDLED, updatedAt: new Date() })
      .where('status = :status', { status: ConversationStatus.HUMAN_TAKEOVER })
      .andWhere("(assignedAgent IS NULL OR assignedAgent != 'EXCLUDED_PERMANENT')");

    if (organizationId && organizationId !== 'default-org-id') {
      qb.andWhere('(organizationId = :orgId OR organizationId = :defaultOrg)', {
        orgId: organizationId,
        defaultOrg: 'default-org-id'
      });
    }

    const result = await qb.execute();
    const count = result.affected || 0;
    this.logger.log(`[RESET ALL IA] Se reactivaron ${count} conversaciones a Modo IA (respetando excluidos permanentes).`);
    return { affected: count };
  }

  async recordHumanIntervention(
    organizationId: string,
    clientPhone: string,
    messageText?: string
  ): Promise<Conversation> {
    let conversation = await this.findByPhone(organizationId, clientPhone);
    const cleanPhone = clientPhone.startsWith('+') ? clientPhone : `+${clientPhone.replace(/\D/g, '')}`;

    if (!conversation) {
      conversation = this.conversationRepo.create({
        organizationId,
        channel: 'whatsapp_qr',
        channelConversationId: cleanPhone,
        status: ConversationStatus.HUMAN_TAKEOVER,
        messagesCount: 1,
        lastMessagePreview: messageText ? messageText.substring(0, 100) : 'Atención manual'
      });
      conversation = await this.conversationRepo.save(conversation);
    } else {
      conversation.status = ConversationStatus.HUMAN_TAKEOVER;
      conversation.updatedAt = new Date();
      if (messageText) {
        conversation.lastMessagePreview = messageText.substring(0, 100);
        conversation.messagesCount += 1;
      }
      await this.conversationRepo.save(conversation);
    }

    if (messageText) {
      const msg = this.messageRepo.create({
        conversationId: conversation.id,
        sender: MessageSender.HUMAN_AGENT,
        content: messageText
      });
      await this.messageRepo.save(msg);
    }

    this.logger.log(
      `[PAUSA HUMANA] Operador intervino manualmente para ${cleanPhone}. Bot silenciado durante 24 horas.`
    );
    return conversation;
  }

  async saveManualMessage(conversationId: string, organizationId: string, content: string): Promise<Message> {
    const msg = this.messageRepo.create({
      conversationId,
      sender: MessageSender.HUMAN_AGENT,
      content
    });
    const saved = await this.messageRepo.save(msg);

    const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (conv) {
      conv.lastMessagePreview = content.substring(0, 100);
      conv.messagesCount = (conv.messagesCount || 0) + 1;
      conv.status = ConversationStatus.HUMAN_TAKEOVER;
      conv.updatedAt = new Date();
      await this.conversationRepo.save(conv);
    }
    return saved;
  }

  async findRecentAiMessage(organizationId: string, phone: string): Promise<Message | null> {
    const conv = await this.findByPhone(organizationId, phone);
    if (!conv) return null;

    return this.messageRepo.findOne({
      where: {
        conversationId: conv.id,
        sender: MessageSender.AI
      },
      order: { createdAt: 'DESC' }
    });
  }
}
