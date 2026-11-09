import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
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

  @Delete('whatsapp-qr/session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desvincular WhatsApp de la organización' })
  async disconnectQRSession(@Request() req: any) {
    const orgId = req.user.organizationId;
    return this.integrationsService.disconnectQRSession(orgId);
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
}
