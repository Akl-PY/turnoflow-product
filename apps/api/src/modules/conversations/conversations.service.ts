import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Conversation } from '../../entities/conversation.entity';
import { Message } from '../../entities/message.entity';
import { AiService } from '../ai/ai.service';
import { ConversationStatus, MessageSender } from '@turnoflow/shared';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly aiService: AiService
  ) {}

  getTenantVerifyToken(organizationId: string): string {
    const clean = (organizationId || '').replace(/-/g, '');
    return `tf_sec_${clean.substring(0, 16)}`;
  }

  verifyMetaSignature(rawPayload: string, signatureHeader?: string): boolean {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret || !signatureHeader) {
      // Si no hay app secret configurado en desarrollo, se omite con aviso
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
  }): Promise<{ replyMessage: string; handoffToHuman: boolean }> {
    const orgId = params.organizationId || 'default-org-id';

    // 1. Verificación de Idempotencia
    if (params.externalMessageId) {
      const alreadyProcessed = await this.messageRepo.findOne({
        where: { externalMessageId: params.externalMessageId }
      });
      if (alreadyProcessed) {
        this.logger.warn(`Mensaje duplicado descartado: ${params.externalMessageId}`);
        return { replyMessage: 'Mensaje ya procesado.', handoffToHuman: false };
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
    }

    // Guardar mensaje entrante del usuario
    const userMsg = this.messageRepo.create({
      conversationId: conversation.id,
      sender: MessageSender.USER,
      content: params.messageText,
      externalMessageId: params.externalMessageId
    });
    await this.messageRepo.save(userMsg);

    // Si la conversación está pausada para atención humana, no responder automáticamente
    if (conversation.status === ConversationStatus.HUMAN_TAKEOVER) {
      return {
        replyMessage: 'Tu consulta está siendo atendida por nuestro equipo humano. En breve te responderemos.',
        handoffToHuman: true
      };
    }

    // 3. Procesar con motor de IA
    const aiResult = await this.aiService.processIncomingMessage({
      organizationId: orgId,
      conversationId: conversation.id,
      userText: params.messageText
    });

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
    }
    await this.conversationRepo.save(conversation);

    return {
      replyMessage: aiResult.replyText,
      handoffToHuman: aiResult.handoffToHuman
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

  async pauseAi(conversationId: string, reason?: string): Promise<Conversation> {
    const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conv) {
      throw new BadRequestException('Conversación no encontrada.');
    }
    conv.status = ConversationStatus.HUMAN_TAKEOVER;
    return this.conversationRepo.save(conv);
  }
}
