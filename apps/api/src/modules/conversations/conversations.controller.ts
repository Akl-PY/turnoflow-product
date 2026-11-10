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
  HttpStatus,
  Logger
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
  private readonly logger = new Logger(ConversationsController.name);

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

  private async resolveOrganizationFromInstance(organizationId: string, instanceName?: string): Promise<string> {
    if (organizationId && organizationId !== 'default-org-id') {
      return organizationId;
    }
    try {
      const profiles = await this.profileRepo.find();
      if (instanceName && instanceName.startsWith('tf_')) {
        const prefix = instanceName.replace(/^tf_/, '').toLowerCase();
        const matched = profiles.find((p) =>
          p.organizationId.replace(/-/g, '').toLowerCase().startsWith(prefix)
        );
        if (matched) {
          return matched.organizationId;
        }
      }
      if (profiles.length > 0) {
        return profiles[0].organizationId;
      }
    } catch {
      // Ignorar si falla consulta
    }
    return organizationId || 'default-org-id';
  }

  @Post('incoming-message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recibir mensaje entrante desde canal de chat' })
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
    const instanceFromWebhook = typeof body?.instance === 'string' ? body.instance : undefined;
    const resolvedOrgId = await this.resolveOrganizationFromInstance(organizationId, instanceFromWebhook);

    const data = body.data || body;
    const key = data.key || {};
    const message = data.message || {};

    // 0. Si es un evento de actualización de conexión (escaneo de QR completado):
    if (body.event === 'connection.update' || body.event === 'CONNECTION_UPDATE' || data.state === 'open') {
      const rawPhone = data.phone || data.user?.id || data.owner || data.sender || body.sender;
      let cleanPhone: string | undefined;
      if (rawPhone && typeof rawPhone === 'string') {
        const digits = rawPhone.split(':')[0].replace(/\D/g, '');
        if (digits.length >= 8) {
          cleanPhone = `+${digits}`;
        }
      }
      this.integrationsService.markQRConnected(resolvedOrgId, cleanPhone);
      return { status: 'connection_recorded', phone: cleanPhone };
    }

    // 0.1 Ignorar eventos que no sean recepción de mensajes
    if (body.event && !['messages.upsert', 'MESSAGES_UPSERT'].includes(body.event)) {
      return { status: 'ignored_event', event: body.event };
    }

    // 1. Resolver el JID real del contacto (soportando @lid + remoteJidAlt en Evolution API v2.3.7)
    const primaryJid = typeof key.remoteJid === 'string' ? key.remoteJid : '';
    const altJid = typeof key.remoteJidAlt === 'string' ? key.remoteJidAlt : '';

    // Ignorar grupos y estados de difusión (Blindaje estricto contra grupos de WhatsApp)
    const isGroupOrBroadcast =
      body.isGroup === true ||
      data.isGroup === true ||
      body.group === true ||
      data.group === true ||
      !!key.participant ||
      !!data.participant ||
      primaryJid.endsWith('@g.us') ||
      primaryJid.includes('@g.us') ||
      primaryJid.includes('@broadcast') ||
      primaryJid.includes('@newsletter') ||
      primaryJid.includes('@temp') ||
      altJid.endsWith('@g.us') ||
      altJid.includes('@g.us') ||
      altJid.includes('@broadcast') ||
      altJid.includes('@newsletter');

    if (isGroupOrBroadcast) {
      return { status: 'ignored_group_or_broadcast' };
    }

    const bestJid =
      (primaryJid.includes('@s.whatsapp.net') ? primaryJid : '') ||
      (altJid.includes('@s.whatsapp.net') ? altJid : '') ||
      primaryJid ||
      altJid;

    // Si solo vino un @lid sin número @s.whatsapp.net alternativo, ignorar este evento preliminar
    // porque Baileys emite inmediatamente el segundo evento con @s.whatsapp.net
    if (!bestJid || bestJid.endsWith('@lid')) {
      return { status: 'ignored_unresolved_lid' };
    }

    // 2. Extraer texto del mensaje
    const rawText =
      message.conversation ||
      message.extendedTextMessage?.text ||
      message.imageMessage?.caption ||
      message.videoMessage?.caption ||
      data.body ||
      body.text ||
      '';

    const senderPhone = bestJid
      .replace('@s.whatsapp.net', '')
      .replace('@c.us', '')
      .split(':')[0]
      .replace(/\D/g, '');

    const digitsOnly = senderPhone.replace(/\D/g, '');
    if (!senderPhone || digitsOnly.startsWith('120363') || digitsOnly.length > 15 || digitsOnly.length < 8) {
      return { status: 'ignored_group_or_invalid_phone', senderPhone };
    }

    // 3. Manejo de mensajes salientes (fromMe === true)
    if (key.fromMe) {
      const isFromBot = this.integrationsService.isBotSentMessage(
        key.id || data.id,
        typeof rawText === 'string' ? rawText : undefined
      );

      // Si el mensaje lo envió el propio bot de TurnoFlow, ignorarlo para no generar bucles
      if (isFromBot) {
        return { status: 'ignored_bot_outgoing' };
      }

      // Si no lo envió el bot, fue un operador/dueño humano desde el celular o WhatsApp Web
      // Pausar inmediatamente la IA para este cliente por 24hs
      this.logger.log(
        `[INTERVENCIÓN MANUAL] Operador humano respondió a ${senderPhone} desde WhatsApp. Bot pausado por 24 horas.`
      );
      await this.conversationsService.recordHumanIntervention(
        resolvedOrgId,
        senderPhone,
        typeof rawText === 'string' ? rawText.trim() : undefined
      );
      return { status: 'human_takeover_recorded', phone: senderPhone };
    }

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return { status: 'ignored_non_text_or_empty' };
    }

    const senderName = data.pushName || body.pushName || 'Cliente';
    const externalMessageId = key.id || data.id;

    const result = await this.conversationsService.handleIncomingMessage({
      channel: 'whatsapp_qr',
      senderPhone,
      senderName,
      messageText: rawText.trim(),
      externalMessageId,
      organizationId: resolvedOrgId
    });

    // Si es un duplicado descartado por idempotencia, NO enviar "Mensaje ya procesado." por WhatsApp
    if (result.duplicate || result.replyMessage === 'Mensaje ya procesado.') {
      return { status: 'duplicate_ignored' };
    }

    // Enviar la respuesta generada por la IA al WhatsApp del cliente si hay texto para responder
    if (result.replyMessage && result.replyMessage.trim()) {
      await this.integrationsService.sendQRWhatsAppMessage(
        resolvedOrgId,
        senderPhone,
        result.replyMessage,
        instanceFromWebhook
      );
    }

    return result;
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
    const cleanPhoneDigits = (senderPhone || '').replace(/\D/g, '');
    if (
      !senderPhone ||
      senderPhone.includes('@g.us') ||
      cleanPhoneDigits.startsWith('120363') ||
      cleanPhoneDigits.length > 15 ||
      cleanPhoneDigits.length < 8 ||
      message.group_id
    ) {
      return { status: 'ignored_group_message' };
    }

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

    if (
      result.replyMessage &&
      !result.duplicate &&
      result.replyMessage !== 'Mensaje ya procesado.' &&
      !result.handoffToHuman
    ) {
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
    const cleanPhoneDigits = (senderPhone || '').replace(/\D/g, '');
    if (
      !senderPhone ||
      senderPhone.includes('@g.us') ||
      cleanPhoneDigits.startsWith('120363') ||
      cleanPhoneDigits.length > 15 ||
      cleanPhoneDigits.length < 8 ||
      message.group_id
    ) {
      return { status: 'ignored_group_message' };
    }

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

    if (
      result.replyMessage &&
      !result.duplicate &&
      result.replyMessage !== 'Mensaje ya procesado.' &&
      !result.handoffToHuman
    ) {
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pausar IA y activar Handoff Humano para una conversación' })
  async pauseAi(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.conversationsService.pauseAi(id, reason);
  }
}
