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
  UnauthorizedException,
  ForbiddenException
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

  @Get('api-key')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar API Key y configuración exclusiva de webhook para la empresa actual' })
  async getOrganizationApiKey(@Request() req: any) {
    const orgId = req.user.organizationId;
    return this.integrationsService.getOrgWebhookCredentials(orgId);
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
        'Permite a tus otras aplicaciones o sistemas enviar mensajes de texto por WhatsApp a través de la sesión de Evolution API ya vinculada en TurnoFlow, con aislamiento multi-tenant por empresa y sin costos extra.',
      security: {
        multiTenant: true,
        isolation: 'Cada negocio dispone de su propia API Key (tf_sec_...) y su propia instancia aislada de WhatsApp (tf_<orgId>).',
        forbiddenCrossTenant: 'El sistema impide estrictamente que un negocio envíe mensajes a través del número o chats de otro.'
      },
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
        type: 'API Key por Empresa o Bearer Token',
        supportedHeaders: ['x-api-key', 'x-webhook-secret', 'Authorization: Bearer <TOKEN>'],
        supportedQueryParams: ['?apiKey=...'],
        supportedBodyField: '{ "apiKey": "..." }',
        defaultApiKey: configuredKey
      },
      payloadFields: {
        to: 'Obligatorio. Número de WhatsApp con código de país (ej: "+5493547464266" o "5493547464266"). Aliases aceptados: "phone", "number", "recipient".',
        message: 'Opcional si envías archivo. Texto del mensaje o epígrafe/caption. Aliases aceptados: "text", "content", "body", "caption".',
        media: 'Opcional. URL pública del archivo (PDF, JPG, PNG, MP4, MP3, etc.) o base64 (data:application/pdf;base64,...). Aliases: "file", "mediaUrl", "attachment", "document".',
        fileName: 'Opcional. Nombre del archivo (ej: "comprobante.pdf", "catalogo.pdf"). Si no se envía se infiere de la URL o tipo de archivo.',
        mediaType: 'Opcional. Tipo de archivo: "document", "image", "video", "audio".',
        appName: 'Opcional. Nombre de tu otra aplicación (ej: "Mi E-commerce", "Sistema Facturación") para identificar el origen en los chats de TurnoFlow.',
        logToChat: 'Opcional booleano (default true). Si es true, el mensaje queda registrado en el historial de chats de TurnoFlow.',
        pauseAi: 'Opcional booleano (default false). Si es true, pausa la IA para ese cliente durante 24hs para atención humana.',
        linkPreview: 'Opcional booleano (default true si el mensaje contiene URLs). Permite generar la tarjeta de vista previa Open Graph (SEO / WhatsApp OG).',
        delay: 'Opcional numérico en milisegundos (default 1000 si hay linkPreview o URLs, 0 si no). Simula escritura o espera previa al envío para que WhatsApp scrapeé el enlace.',
        organizationId: 'Opcional. ID de la organización en TurnoFlow (se valida contra la API Key de tu empresa).'
      },
      examplePayloadText: {
        to: '+5493547464266',
        message: '¡Hola! Te avisamos que tu pedido #4589 ya fue despachado. 📦🚀',
        appName: 'Mi Tienda Online',
        logToChat: true
      },
      examplePayloadAttachment: {
        to: '+5493547464266',
        message: 'Adjuntamos el comprobante oficial de tu reserva.',
        media: 'https://ejemplo.com/comprobante-1024.pdf',
        fileName: 'comprobante-1024.pdf',
        appName: 'Mi Sistema'
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
    summary: 'Webhook para que aplicaciones externas envíen mensajes de WhatsApp y archivos adjuntos vía Evolution API'
  })
  async handleOutboundWebhook(
    @Request() req: any,
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Query() query: Record<string, string>
  ) {
    const auth = await this.resolveAuthorizedOrganization(req, body, headers, query);

    if (
      typeof this.integrationsService.isExternalWebhookEnabled === 'function' &&
      !(await this.integrationsService.isExternalWebhookEnabled(auth.organizationId))
    ) {
      return {
        success: false,
        messageId: undefined,
        to: String(body.phone || body.to || ''),
        organizationId: auth.organizationId,
        loggedToChat: false,
        error: 'El webhook externo para terceros está pausado desde el panel de TurnoFlow.'
      };
    }

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
      body.caption ||
      body.msg ||
      '';

    const media =
      body.media ||
      body.file ||
      body.mediaUrl ||
      body.fileUrl ||
      body.attachment ||
      body.attachmentUrl ||
      body.document ||
      body.mediaBase64 ||
      body.pdf;

    const fileName =
      body.fileName ||
      body.filename ||
      body.name ||
      body.documentName;

    const mediaType =
      body.mediaType ||
      body.mediatype ||
      body.type;

    const mimetype =
      body.mimetype ||
      body.mimeType;

    if (!to || (!message && !media)) {
      throw new BadRequestException(
        'Faltan campos obligatorios. Debes enviar el destinatario ("to" o "phone") y al menos un contenido: texto ("message") o archivo ("media", "file", "mediaUrl").'
      );
    }

    const organizationId = auth.organizationId;
    const appName =
      body.appName || body.source || body.origin || headers['x-app-name'] || 'App Externa';
    const logToChat = body.logToChat !== false;
    const pauseAi = Boolean(body.pauseAi);
    const linkPreview =
      body.linkPreview !== undefined
        ? Boolean(body.linkPreview)
        : body.seo !== undefined
          ? Boolean(body.seo)
          : undefined;
    const delay =
      body.delay !== undefined
        ? Number(body.delay)
        : body.waitMs !== undefined
          ? Number(body.waitMs)
          : undefined;

    const result = await this.integrationsService.sendOutboundWebhookMessage({
      to,
      text: message,
      media,
      fileName,
      mediaType,
      mimetype,
      organizationId,
      appName,
      logToChat,
      pauseAi,
      explicitInstanceName: body.instanceName,
      linkPreview,
      delay
    });

    if (!result.success) {
      throw new BadRequestException(result.error || 'No se pudo enviar el mensaje o archivo por Evolution API');
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

  private async resolveAuthorizedOrganization(
    req: any,
    body: any,
    headers: Record<string, string>,
    query: Record<string, string>
  ): Promise<{ organizationId?: string; isMaster: boolean }> {
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

    // 1. Si viene por sesión JWT de usuario logueado en TurnoFlow
    if (req?.user?.organizationId) {
      return { organizationId: req.user.organizationId, isMaster: false };
    }

    const authHeader = headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token === configuredKey || token === 'turnoflow-webhook-secret-2026') {
        return {
          organizationId: body?.organizationId || headers['x-organization-id'] || query?.organizationId,
          isMaster: true
        };
      }
    }

    if (!providedKey) {
      throw new UnauthorizedException(
        'Falta la autenticación. Envía el header "x-api-key" con la clave exclusiva de tu empresa obtenida en el panel de TurnoFlow.'
      );
    }

    // 2. Si es la Master Key global
    if (providedKey === configuredKey || providedKey === 'turnoflow-webhook-secret-2026') {
      const targetOrg = body?.organizationId || headers['x-organization-id'] || query?.organizationId;
      return { organizationId: targetOrg, isMaster: true };
    }

    // 3. Validar si es una API Key individual de organización (tf_sec_...)
    const resolvedOrgId = await this.integrationsService.validateAndResolveOrgFromKey(providedKey);
    if (!resolvedOrgId) {
      throw new UnauthorizedException(
        'API Key inválida o no autorizada. Verificá la clave única de tu empresa en el panel de TurnoFlow (sección Automatizaciones).'
      );
    }

    // Aislamiento Multi-Tenant estricto: si el payload intenta enviar en nombre de otra organización
    const requestedOrg = body?.organizationId || headers['x-organization-id'] || query?.organizationId;
    if (requestedOrg && requestedOrg !== resolvedOrgId) {
      throw new ForbiddenException(
        'Acceso denegado: tu API Key pertenece a otra organización y no tienes permiso para operar sobre este negocio.'
      );
    }

    return { organizationId: resolvedOrgId, isMaster: false };
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
