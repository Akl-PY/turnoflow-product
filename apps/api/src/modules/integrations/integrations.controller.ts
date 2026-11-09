import { Controller, Get, Post, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

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
}
