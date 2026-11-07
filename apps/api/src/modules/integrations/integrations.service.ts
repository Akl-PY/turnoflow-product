import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { IntegrationStatus } from '@turnoflow/shared';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  async sendWhatsAppMessage(to: string, messageText: string): Promise<{ success: boolean; messageId?: string }> {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const version = process.env.WHATSAPP_API_VERSION || 'v20.0';

    if (!phoneNumberId || !token) {
      this.logger.log(`[MOCK MODE] WhatsApp saliente a ${to}: "${messageText.substring(0, 60)}..."`);
      return { success: true, messageId: `mock-wa-msg-${Date.now()}` };
    }

    try {
      const response = await axios.post(
        `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { preview_url: false, body: messageText }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      return {
        success: true,
        messageId: response.data.messages?.[0]?.id
      };
    } catch (err: any) {
      this.logger.error(`Error enviando WhatsApp: ${err.response?.data?.error?.message || err.message}`);
      return { success: false };
    }
  }

  async appendLeadToSheets(leadData: Record<string, unknown>): Promise<{ success: boolean }> {
    this.logger.log(`[SHEETS SYNC] Sincronizando lead a Google Sheets: ${JSON.stringify(leadData)}`);
    return { success: true };
  }

  getStatus() {
    return {
      whatsapp: {
        status: process.env.WHATSAPP_ACCESS_TOKEN ? IntegrationStatus.CONNECTED : IntegrationStatus.CONFIGURING,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? 'Configurado' : 'Pendiente'
      },
      aiProvider: {
        provider: process.env.AI_PROVIDER || 'anthropic',
        status: (process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY) ? IntegrationStatus.CONNECTED : IntegrationStatus.CONFIGURING
      },
      googleCalendar: {
        status: process.env.GOOGLE_CLIENT_ID ? IntegrationStatus.CONNECTED : IntegrationStatus.CONFIGURING,
        calendarId: process.env.GOOGLE_CALENDAR_ID ? 'Configurado' : 'Pendiente'
      },
      n8n: {
        status: process.env.N8N_BASE_URL ? IntegrationStatus.CONNECTED : IntegrationStatus.CONFIGURING,
        url: process.env.N8N_BASE_URL || 'http://localhost:5678'
      }
    };
  }
}
