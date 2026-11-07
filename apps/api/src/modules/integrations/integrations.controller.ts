import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';

@ApiTags('Integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('status')
  @ApiOperation({ summary: 'Consultar estado en vivo de integraciones externas' })
  getStatus() {
    return this.integrationsService.getStatus();
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
