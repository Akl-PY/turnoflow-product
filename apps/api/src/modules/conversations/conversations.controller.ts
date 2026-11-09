import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationsService } from './conversations.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { BusinessProfile } from '../../entities/business-profile.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Conversations & Webhooks')
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly integrationsService: IntegrationsService,
    @InjectRepository(BusinessProfile)
    private readonly profileRepo: Repository<BusinessProfile>
  ) {}

  private async resolveWhatsAppCredentials(organizationId?: string): Promise<{ phoneNumberId?: string; accessToken?: string }> {
    let accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    let phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (organizationId) {
      try {
        const profile = await this.profileRepo.findOne({ where: { organizationId } });
        if (profile?.specialInstructions) {
          const parsed = JSON.parse(profile.specialInstructions);
          if (parsed?.whatsapp?.accessToken) {
            accessToken = parsed.whatsapp.accessToken;
          }
          if (parsed?.whatsapp?.phoneNumberId) {
            phoneNumberId = parsed.whatsapp.phoneNumberId;
          }
        }
      } catch {
        // Fallback a variables de entorno
      }
    }
    return { phoneNumberId, accessToken };
  }

  @Post('incoming-message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recibir mensaje entrante desde n8n o canal de chat' })
  async handleIncomingMessage(
    @Body()
    body: {
      channel: string;
      senderPhone: string;
      senderName: string;
      messageText: string;
      externalMessageId?: string;
      organizationId?: string;
    }
  ) {
    return this.conversationsService.handleIncomingMessage(body);
  }

  // ==========================================
  // RECEPCIÓN DE MENSAJES DESDE QR (EVOLUTION API / BAILEYS)
  // ==========================================
  @Post('whatsapp-qr-webhook/:organizationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recepción de mensajes desde pasarela WhatsApp Web QR (Evolution API / Baileys)' })
  async handleQRWhatsAppWebhook(
    @Param('organizationId') organizationId: string,
    @Body() body: any
  ) {
    const data = body.data || body;
    const key = data.key || {};
    const message = data.message || {};

    // 0. Si es un evento de actualización de conexión (escaneo de QR completado):
    if (body.event === 'connection.update' || data.state === 'open') {
      const phone = data.phone || data.user?.id || data.sender;
      this.integrationsService.markQRConnected(organizationId, phone);
      return { status: 'connection_recorded', phone };
    }

    // 1. Si el mensaje lo envió el propio dueño desde su celular (fromMe === true):
    if (key.fromMe) {
      const senderPhone = (key.remoteJid || '').replace('@s.whatsapp.net', '').replace('@c.us', '');
      if (senderPhone) {
        const conv = await this.conversationsService.findByPhone(organizationId, senderPhone);
        if (conv) {
          await this.conversationsService.pauseAi(conv.id, 'Intervención manual del dueño desde WhatsApp');
        }
      }
      return { status: 'human_message_acknowledged', handoffToHuman: true };
    }

    // 2. Extraer texto del cliente
    const rawText =
      message.conversation ||
      message.extendedTextMessage?.text ||
      message.imageMessage?.caption ||
      data.body ||
      body.text ||
      '';

    if (!rawText || !key.remoteJid) {
      return { status: 'ignored_non_text_or_empty' };
    }

    const senderPhone = key.remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
    const senderName = data.pushName || body.pushName || 'Cliente';
    const externalMessageId = key.id || data.id;

    return this.conversationsService.handleIncomingMessage({
      channel: 'whatsapp_qr',
      senderPhone,
      senderName,
      messageText: rawText,
      externalMessageId,
      organizationId
    });
  }

  @Post('whatsapp-qr-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recepción global de mensajes desde pasarela WhatsApp Web QR' })
  async handleGlobalQRWhatsAppWebhook(@Body() body: any) {
    return this.handleQRWhatsAppWebhook('default-org-id', body);
  }

  // Verificación de Webhook Multi-Tenant específico por Organización
  @Get('whatsapp-webhook/:organizationId')
  @ApiOperation({ summary: 'Verificación de Webhook Multi-Tenant para Meta Developers (hub.challenge)' })
  verifyTenantWebhook(
    @Param('organizationId') organizationId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string
  ) {
    const expectedToken = this.conversationsService.getTenantVerifyToken(organizationId);
    const configuredToken = process.env.WHATSAPP_VERIFY_TOKEN || 'turnoflow_verify_token';
    if (
      mode === 'subscribe' &&
      (token === expectedToken || token === configuredToken || token === 'turnoflow_verify_token')
    ) {
      return challenge;
    }
    return 'Token verification failed';
  }

  // Recepción de mensajes Multi-Tenant con enrutamiento directo a la Organización
  @Post('whatsapp-webhook/:organizationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recepción oficial de mensajes de WhatsApp Cloud API por Organización' })
  async handleTenantWhatsAppWebhook(
    @Param('organizationId') organizationId: string,
    @Body() body: any,
    @Headers('x-hub-signature-256') signature?: string
  ) {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];
    const contact = changes?.value?.contacts?.[0];

    if (!message) {
      return { status: 'acknowledged_status_update' };
    }

    const senderPhone = message.from;
    const senderName = contact?.profile?.name || 'Cliente';
    const messageText = message.type === 'text' ? message.text.body : '[Mensaje multimedia]';

    const metadata = changes?.value?.metadata;
    const incomingPhoneNumberId = metadata?.phone_number_id;

    const result = await this.conversationsService.handleIncomingMessage({
      channel: 'whatsapp',
      senderPhone,
      senderName,
      messageText,
      externalMessageId: message.id,
      organizationId
    });

    if (result.replyMessage && !result.handoffToHuman) {
      const creds = await this.resolveWhatsAppCredentials(organizationId);
      const targetPhoneId = incomingPhoneNumberId || creds.phoneNumberId;
      await this.integrationsService.sendWhatsAppMessage(senderPhone, result.replyMessage, {
        phoneNumberId: targetPhoneId,
        accessToken: creds.accessToken
      });
    }

    return result;
  }

  // Verificación de Webhook oficial de WhatsApp Cloud API (Ruta global / fallback)
  @Get('whatsapp-webhook')
  @ApiOperation({ summary: 'Verificación de Webhook para Meta Developers (hub.challenge)' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string
  ) {
    const configuredToken = process.env.WHATSAPP_VERIFY_TOKEN || 'turnoflow_verify_token';
    if (
      mode === 'subscribe' &&
      (token === configuredToken || token === 'turnoflow_verify_token' || token?.startsWith('tf_sec_'))
    ) {
      return challenge;
    }
    return 'Token verification failed';
  }

  // Recepción de eventos directos de WhatsApp Cloud API (Ruta global / fallback)
  @Post('whatsapp-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recepción oficial de mensajes de WhatsApp Cloud API' })
  async handleWhatsAppWebhook(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature?: string
  ) {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];
    const contact = changes?.value?.contacts?.[0];

    if (!message) {
      return { status: 'acknowledged_status_update' };
    }

    const senderPhone = message.from;
    const senderName = contact?.profile?.name || 'Cliente';
    const messageText = message.type === 'text' ? message.text.body : '[Mensaje multimedia]';
    const metadata = changes?.value?.metadata;
    const incomingPhoneNumberId = metadata?.phone_number_id;

    const result = await this.conversationsService.handleIncomingMessage({
      channel: 'whatsapp',
      senderPhone,
      senderName,
      messageText,
      externalMessageId: message.id
    });

    if (result.replyMessage && !result.handoffToHuman) {
      const creds = await this.resolveWhatsAppCredentials();
      const targetPhoneId = incomingPhoneNumberId || creds.phoneNumberId;
      await this.integrationsService.sendWhatsAppMessage(senderPhone, result.replyMessage, {
        phoneNumberId: targetPhoneId,
        accessToken: creds.accessToken
      });
    }

    return result;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar conversaciones activas' })
  async findAll(@Request() req: any) {
    const orgId = req.user.organizationId;
    return this.conversationsService.findAll(orgId);
  }

  @Get(':id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener historial de mensajes de una conversación' })
  async getMessages(@Param('id') id: string) {
    return this.conversationsService.getMessages(id);
  }

  @Patch(':id/pause-ai')
  @ApiOperation({ summary: 'Pausar IA y transferir a operador humano' })
  async pauseAi(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.conversationsService.pauseAi(id, reason);
  }
}
