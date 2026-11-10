import { Injectable, Logger, BadRequestException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Conversation } from '../../entities/conversation.entity';
import { Message } from '../../entities/message.entity';
import { BusinessProfile } from '../../entities/business-profile.entity';
import { AiService } from '../ai/ai.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { ConversationStatus, MessageSender } from '@turnoflow/shared';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);
  private readonly processingExternalIds = new Set<string>();

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
    private readonly integrationsService?: IntegrationsService
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
    let conversation = await this.conversationRepo.findOne({
      where: {
        organizationId: orgId,
        channelConversationId: params.senderPhone
      }
    });

    if (!conversation) {
      conversation = this.conversationRepo.create({
        organizationId: orgId,
        channel: params.channel,
        channelConversationId: params.senderPhone,
        status: ConversationStatus.AI_HANDLED,
        messagesCount: 0
      });
      conversation = await this.conversationRepo.save(conversation);
    } else if (conversation.status === ConversationStatus.HUMAN_TAKEOVER) {
      // Reactivar atención de IA para nuevas consultas del cliente
      conversation.status = ConversationStatus.AI_HANDLED;
    }

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
            userText: params.messageText
          })
        : {
            replyText: 'Gracias por comunicarte con nosotros.',
            toolExecutions: [],
            handoffToHuman: false,
            handoffReason: undefined
          };
    } catch (err: any) {
      this.logger.error(`Error procesando mensaje con IA: ${err.message}`);
      aiResult = {
        replyText: '¡Hola! Recibimos tu consulta. En este momento una recepcionista del equipo te responderá a la brevedad.',
        toolExecutions: [],
        handoffToHuman: true,
        handoffReason: `Fallo de proveedor IA: ${err.message}`
      };
    }

    // Guardar respuesta del asistente
    const aiMsg = this.messageRepo.create({
      conversationId: conversation.id,
      sender: MessageSender.AI,
      content: aiResult.replyText,
      toolCalls: aiResult.toolExecutions
    });
    await this.messageRepo.save(aiMsg);

    // Actualizar metadata de la conversación
    conversation.lastMessagePreview = aiResult.replyText.substring(0, 100);
    conversation.messagesCount += 2;
    if (aiResult.handoffToHuman) {
      conversation.status = ConversationStatus.HUMAN_TAKEOVER;

      // Alerta urgente al administrador por WhatsApp
      if (this.profileRepo && this.integrationsService) {
        try {
          const profile = await this.profileRepo.findOne({ where: { organizationId: orgId } });
          const adminPhone = profile?.contactPhone || process.env.ADMIN_PHONE_NUMBER;
          if (adminPhone && adminPhone.replace(/\D/g, '') !== params.senderPhone.replace(/\D/g, '')) {
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

    return {
      replyMessage: aiResult.replyText,
      handoffToHuman: aiResult.handoffToHuman,
      duplicate: false
    };
  }

  async findAll(organizationId: string): Promise<Conversation[]> {
    return this.conversationRepo.find({
      where: { organizationId },
      order: { updatedAt: 'DESC' }
    });
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' }
    });
  }

  async findByPhone(organizationId: string, phone: string): Promise<Conversation | null> {
    return this.conversationRepo.findOne({
      where: { organizationId, channelConversationId: phone }
    });
  }

  async pauseAi(conversationId: string, reason?: string): Promise<Conversation> {
    const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conv) {
      throw new BadRequestException('Conversación no encontrada.');
    }
    conv.status = ConversationStatus.HUMAN_TAKEOVER;
    return this.conversationRepo.save(conv);
  }
}
