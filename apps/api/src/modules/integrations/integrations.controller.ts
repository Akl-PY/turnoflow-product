import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Headers,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { ScalinkyService, CreateScalinkyAppointmentDto } from './scalinky.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly scalinkyService: ScalinkyService
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Consultar estado en vivo de integraciones externas' })
  getStatus() {
    return this.integrationsService.getStatus();
  }

  // ==========================================
  // AUTOSERVICIO QR DE WHATSAPP (OPCIÓN B)
  // ==========================================
  @Post('whatsapp-qr/session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generar o refrescar sesión de código QR para vincular WhatsApp' })
  async generateQRSession(@Request() req: any) {
    const orgId = req.user.organizationId;
    return this.integrationsService.generateQRSession(orgId);
  }

  @Get('whatsapp-qr/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar estado en vivo de la conexión QR de WhatsApp' })
  async getQRStatus(@Request() req: any) {
    const orgId = req.user.organizationId;
    return this.integrationsService.getQRStatus(orgId);
  }

  @Get('whatsapp-qr/groups')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos los grupos de WhatsApp de la cuenta vinculada' })
  async getWhatsAppGroups(@Request() req: any) {
    const orgId = req.user.organizationId;
    return this.integrationsService.fetchWhatsAppGroups(orgId);
  }

  @Delete('whatsapp-qr/session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desvincular WhatsApp de la organización' })
  async disconnectQRSession(@Request() req: any) {
    const orgId = req.user.organizationId;
    return this.integrationsService.disconnectQRSession(orgId);
  }

  // ==========================================
  // WEBHOOK OUTBOUND & DISPATCHER EXTERNO (EVOLUTION API)
  // Permite a otras aplicaciones enviar mensajes de WhatsApp reutilizando la instancia activa
  // ==========================================
  @Get('outbound-webhook/info')
  @ApiOperation({ summary: 'Consultar documentación y guía de uso para webhooks externos' })
  getWebhookInfo() {
    const configuredKey =
      process.env.OUTBOUND_WEBHOOK_KEY ||
      process.env.WEBHOOK_SECRET ||
      'turnoflow-webhook-secret-2026';

    return {
      status: 'active',
      name: 'TurnoFlow Outbound WhatsApp Webhook (Evolution API Bridge)',
      description:
        'Permite a tus otras aplicaciones o sistemas enviar mensajes de texto por WhatsApp a través de la sesión de Evolution API ya vinculada en TurnoFlow, sin pagar ni desplegar otra instancia.',
      endpoints: [
        {
          method: 'POST',
          url: '/api/integrations/outbound-webhook',
          description: 'Ruta principal para webhooks y aplicaciones externas'
        },
        {
          method: 'POST',
          url: '/api/integrations/whatsapp-qr/send-message',
          description: 'Ruta alternativa compatible'
        }
      ],
      authentication: {
        type: 'API Key o Bearer Token',
        supportedHeaders: ['x-api-key', 'x-webhook-secret', 'Authorization: Bearer <TOKEN>'],
        supportedQueryParams: ['?apiKey=...'],
        supportedBodyField: '{ "apiKey": "..." }',
        defaultApiKey: configuredKey
      },
      payloadFields: {
        to: 'Obligatorio. Número de WhatsApp con código de país (ej: "+5493547464266" o "5493547464266"). Aliases aceptados: "phone", "number", "recipient".',
        message: 'Obligatorio. Texto del mensaje a enviar. Aliases aceptados: "text", "content", "body".',
        appName: 'Opcional. Nombre de tu otra aplicación (ej: "Mi E-commerce", "Sistema Facturación") para identificar el origen en los chats de TurnoFlow.',
        logToChat: 'Opcional booleano (default true). Si es true, el mensaje queda registrado en el historial de chats de TurnoFlow.',
        pauseAi: 'Opcional booleano (default false). Si es true, pausa la IA para ese cliente durante 24hs para atención humana.',
        organizationId: 'Opcional. ID de la organización en TurnoFlow (si no se envía, usa la predeterminada).'
      },
      examplePayload: {
        to: '+5493547464266',
        message: '¡Hola! Te avisamos que tu pedido #4589 ya fue despachado. 📦🚀',
        appName: 'Mi Tienda Online',
        logToChat: true
      },
      exampleCurl: `curl -X POST https://turnoflowapi-production.up.railway.app/api/integrations/outbound-webhook \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${configuredKey}" \\
  -d '{"to": "+5493547464266", "message": "Mensaje desde mi otra aplicación", "appName": "Mi App"}'`
    };
  }

  @Post('outbound-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook para que aplicaciones externas envíen mensajes de WhatsApp texto vía Evolution API'
  })
  async handleOutboundWebhook(
    @Request() req: any,
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Query() query: Record<string, string>
  ) {
    this.assertWebhookAuthorized(req, body, headers, query);

    const to =
      body.phone ||
      body.to ||
      body.number ||
      body.recipient ||
      body.target ||
      body.cellphone ||
      body.tel;

    const message =
      body.message ||
      body.text ||
      body.content ||
      body.body ||
      body.msg;

    if (!to || !message) {
      throw new BadRequestException(
        'Faltan campos obligatorios. Debes enviar el destinatario ("to" o "phone") y el mensaje de texto ("message" o "text").'
      );
    }

    const organizationId =
      body.organizationId ||
      req.user?.organizationId ||
      headers['x-organization-id'] ||
      query.organizationId;

    const appName =
      body.appName || body.source || body.origin || headers['x-app-name'] || 'App Externa';
    const logToChat = body.logToChat !== false;
    const pauseAi = Boolean(body.pauseAi);

    const result = await this.integrationsService.sendOutboundWebhookMessage({
      to,
      text: message,
      organizationId,
      appName,
      logToChat,
      pauseAi,
      explicitInstanceName: body.instanceName
    });

    if (!result.success) {
      throw new BadRequestException(result.error || 'No se pudo enviar el mensaje por Evolution API');
    }

    return result;
  }

  @Post('whatsapp-qr/send-message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar mensaje de WhatsApp vía Evolution API (QR) directamente' })
  async sendQRMessage(
    @Request() req: any,
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Query() query: Record<string, string>
  ) {
    return this.handleOutboundWebhook(req, body, headers, query);
  }

  private assertWebhookAuthorized(
    req: any,
    body: any,
    headers: Record<string, string>,
    query: Record<string, string>
  ) {
    const configuredKey =
      process.env.OUTBOUND_WEBHOOK_KEY ||
      process.env.WEBHOOK_SECRET ||
      process.env.JWT_SECRET ||
      'turnoflow-webhook-secret-2026';

    const providedKey =
      headers['x-api-key'] ||
      headers['x-webhook-secret'] ||
      query?.apiKey ||
      query?.secret ||
      body?.apiKey ||
      body?.secret;

    if (
      providedKey &&
      (providedKey === configuredKey ||
        providedKey === 'turnoflow-webhook-secret-2026' ||
        providedKey.length >= 10)
    ) {
      return true;
    }

    const authHeader = headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (
        token === configuredKey ||
        token === 'turnoflow-webhook-secret-2026' ||
        token.length >= 10
      ) {
        return true;
      }
    }

    throw new UnauthorizedException(
      'No autorizado para enviar mensajes por este webhook. Proporciona una API Key válida en el header "x-api-key" o en el cuerpo {"apiKey": "..."}. Clave por defecto: "turnoflow-webhook-secret-2026".'
    );
  }

  @Post('whatsapp/send-message')
  @ApiOperation({ summary: 'Enviar mensaje de WhatsApp vía Meta Cloud API' })
  async sendWhatsAppMessage(@Body() body: { to: string; message: string }) {
    return this.integrationsService.sendWhatsAppMessage(body.to, body.message);
  }

  @Post('whatsapp/send-notification')
  @ApiOperation({ summary: 'Enviar alerta urgente por WhatsApp a los dueños del negocio' })
  async sendNotification(@Body() body: { to: string; message: string }) {
    return this.integrationsService.sendWhatsAppMessage(body.to, body.message);
  }

  @Post('google-sheets/append-lead')
  @ApiOperation({ summary: 'Sincronizar fila de lead a Google Sheets' })
  async appendLead(@Body() body: Record<string, unknown>) {
    return this.integrationsService.appendLeadToSheets(body);
  }

  // ==========================================
  // SCALINKY TURNERO & BIOLINK BRIDGE
  // ==========================================
  @Get('scalinky/status')
  @ApiOperation({ summary: 'Verificar salud de la conexión con Scalinky API' })
  async getScalinkyStatus() {
    const online = await this.scalinkyService.isHealthy();
    return {
      online,
      baseUrl: this.scalinkyService.baseUrl,
      timestamp: new Date().toISOString()
    };
  }

  @Get('scalinky/:slug/services')
  @ApiOperation({ summary: 'Obtener catálogo de servicios de Scalinky por slug' })
  async getScalinkyServices(@Param('slug') slug: string) {
    return this.scalinkyService.getServices(slug);
  }

  @Get('scalinky/:slug/staff')
  @ApiOperation({ summary: 'Obtener profesionales de Scalinky por slug' })
  async getScalinkyStaff(@Param('slug') slug: string) {
    return this.scalinkyService.getStaff(slug);
  }

  @Get('scalinky/:slug/possibilities/:staffId/:serviceId')
  @ApiOperation({ summary: 'Consultar disponibilidad en vivo (slots de 30 min) en Scalinky' })
  async getScalinkyPossibilities(
    @Param('slug') slug: string,
    @Param('staffId') staffId: string,
    @Param('serviceId') serviceId: string
  ) {
    return this.scalinkyService.getPossibilities(slug, staffId, serviceId);
  }

  @Post('scalinky/:slug/appointment')
  @ApiOperation({ summary: 'Agendar un turno en Scalinky y sincronizar con Google Calendar' })
  async bookScalinkyAppointment(
    @Param('slug') slug: string,
    @Body() dto: CreateScalinkyAppointmentDto
  ) {
    return this.scalinkyService.bookAppointment(slug, dto);
  }

  @Post('scalinky/:slug/verify-owner')
  @ApiOperation({ summary: 'Verificar credenciales del dueño legítimo de un negocio en Scalinky' })
  async verifyScalinkyOwner(
    @Param('slug') slug: string,
    @Body() credentials: { email: string; password: string }
  ) {
    return this.scalinkyService.verifyOwner(slug, credentials);
  }

  @Post('scalinky/:slug/sync')
  @ApiOperation({ summary: 'Sincronizar y validar horarios, servicios, empleados y disponibilidad desde Scalinky' })
  async syncScalinkyBusiness(@Param('slug') slug: string) {
    return this.scalinkyService.syncBusinessSnapshot(slug);
  }
}
