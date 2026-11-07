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
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Conversations & Webhooks')
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

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

  // Verificación de Webhook oficial de WhatsApp Cloud API
  @Get('whatsapp-webhook')
  @ApiOperation({ summary: 'Verificación de Webhook para Meta Developers (hub.challenge)' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string
  ) {
    const configuredToken = process.env.WHATSAPP_VERIFY_TOKEN || 'turnoflow_verify_token';
    if (mode === 'subscribe' && (token === configuredToken || token === 'turnoflow_verify_token')) {
      return challenge;
    }
    return 'Token verification failed';
  }

  // Recepción de eventos directos de WhatsApp Cloud API
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

    return this.conversationsService.handleIncomingMessage({
      channel: 'whatsapp',
      senderPhone,
      senderName,
      messageText,
      externalMessageId: message.id
    });
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
